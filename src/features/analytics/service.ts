import * as analyticsRepo from './repository';
import * as customerRepo from '@/features/customer/repository';
import { validateRestaurantId } from './validation';
import { computeDashboardMetrics } from './calculations';
import { unstable_cache } from 'next/cache';

/**
 * Aggregates database transaction records and client logs, processing them into complex 
 * analytical metrics (traffic heatmaps, conversion rates, and friction values) for the admin dashboard.
 * 
 * @param restaurantId The restaurant identifier slug.
 * @param startDateStr Optional start date filter string.
 * @param endDateStr Optional end date filter string.
 * @returns A computed dashboard metrics report object.
 */
export async function getDashboardMetrics(restaurantId: string, startDateStr?: string, endDateStr?: string) {
  validateRestaurantId(restaurantId);

  return unstable_cache(
    async () => {
      // Parse date ranges ensuring full inclusive day coverage in local operational timezone (+05:30)
      const parseBoundary = (dateStr: string | undefined, isEnd: boolean): Date => {
        if (!dateStr) {
          const d = new Date();
          if (isEnd) {
            d.setHours(23, 59, 59, 999);
          } else {
            d.setDate(d.getDate() - 30);
            d.setHours(0, 0, 0, 0);
          }
          return d;
        }
        if (dateStr.includes('T')) {
          const d = new Date(dateStr);
          if (isEnd) d.setHours(23, 59, 59, 999);
          else d.setHours(0, 0, 0, 0);
          return d;
        }
        const suffix = isEnd ? 'T23:59:59.999+05:30' : 'T00:00:00.000+05:30';
        const parsed = new Date(`${dateStr}${suffix}`);
        if (!isNaN(parsed.getTime())) return parsed;
        const fallback = new Date(dateStr);
        if (isEnd) fallback.setHours(23, 59, 59, 999);
        else fallback.setHours(0, 0, 0, 0);
        return fallback;
      };

      const start = parseBoundary(startDateStr, false);
      const end = parseBoundary(endDateStr, true);

      // Fetch raw dataset using analyticsRepository
      const rawData = await analyticsRepo.fetchRawDashboardData(restaurantId, start, end);
      const {
        eventAggregates,
        orderAggregates,
        recentCompletedOrders,
        ordersTableRaw,
        menuItems,
        pairingRules,
        comboRules,
        discountTiers,
        pendingOrdersCount,
        totalCustomersCount
      } = rawData;

      const phoneNumbers = (orderAggregates.customerPhones || [])
        .map((c: any) => c._id)
        .filter((phone: string) => phone && phone.trim().length > 5);

      // Fetch repeating customers from Customer database
      const customers = phoneNumbers.length > 0 
        ? await customerRepo.findManyByPhones(restaurantId, phoneNumbers)
        : [];

      return computeDashboardMetrics({
        start,
        end,
        eventAggregates,
        orderAggregates,
        recentCompletedOrders,
        ordersTableRaw,
        threeDayAggregation: rawData.threeDayAggregation,
        menuItems,
        pairingRules,
        comboRules,
        discountTiers,
        pendingOrdersCount,
        totalCustomersCount,
        discountTierAchievement: rawData.discountTierAchievement,
        avgOrderValueNoTier: rawData.avgOrderValueNoTier,
        customersByPhone: customers,
      });
    },
    ['dashboard-metrics', restaurantId, startDateStr || '', endDateStr || ''],
    { revalidate: 10 }
  )();
}
