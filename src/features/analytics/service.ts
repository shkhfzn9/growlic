import * as analyticsRepo from './repository';
import * as customerRepo from '@/features/customer/repository';
import { validateRestaurantId } from './validation';
import { computeDashboardMetrics } from './calculations';

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

  // Parse date ranges
  const start = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDateStr ? new Date(endDateStr) : new Date();

  if (!startDateStr) {
    start.setHours(0, 0, 0, 0);
  }
  if (!endDateStr) {
    end.setHours(23, 59, 59, 999);
  }

  // Fetch raw dataset using analyticsRepository
  const rawData = await analyticsRepo.fetchRawDashboardData(restaurantId, start, end);
  const {
    orders,
    events,
    menuItems,
    pairingRules,
    comboRules,
    discountTiers,
    pendingOrdersCount,
    totalCustomersCount
  } = rawData;

  const ordersWithPhone = orders.filter(o => o.customerPhone && o.customerPhone.trim().length > 5);
  const uniquePhones = Array.from(new Set(ordersWithPhone.map(o => o.customerPhone.trim())));

  // Fetch repeating customers from Customer database
  const customers = uniquePhones.length > 0 
    ? await customerRepo.findManyByPhones(restaurantId, uniquePhones)
    : [];

  return computeDashboardMetrics({
    start,
    end,
    orders,
    events,
    menuItems,
    pairingRules,
    comboRules,
    discountTiers,
    pendingOrdersCount,
    totalCustomersCount,
    customersByPhone: customers,
  });
}
