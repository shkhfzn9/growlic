import dbConnect from '@/lib/mongodb';
import * as orderRepo from './orderRepository';
import * as eventRepo from './eventRepository';
import * as menuItemRepo from './menuItemRepository';
import * as pairingRuleRepo from './pairingRuleRepository';
import * as comboRuleRepo from './comboRuleRepository';
import * as discountTierRepo from './discountTierRepository';
import * as customerRepo from './customerRepository';

/**
 * Aggregates and fetches the raw datasets required to compute dashboard analytics parameters.
 * Executes multiple database queries in parallel (using Promise.all) to achieve high performance.
 * 
 * @param restaurantId The restaurant slug ID.
 * @param start The start boundary Date object.
 * @param end The end boundary Date object.
 * @returns An object containing raw arrays of orders, client log events, menu items, rule configurations, and counts.
 */
export async function fetchRawDashboardData(restaurantId: string, start: Date, end: Date) {
  await dbConnect();

  const [
    orders,
    events,
    menuItems,
    pairingRules,
    comboRules,
    discountTiers,
    pendingOrdersCount,
    totalCustomersCount
  ] = await Promise.all([
    orderRepo.findInRange(restaurantId, start, end),
    eventRepo.findInRange(restaurantId, start, end),
    menuItemRepo.findAll(restaurantId),
    pairingRuleRepo.findAll(restaurantId),
    comboRuleRepo.findAll(restaurantId),
    discountTierRepo.findActive(restaurantId),
    orderRepo.countPending(restaurantId),
    customerRepo.count(restaurantId)
  ]);

  return {
    orders,
    events,
    menuItems,
    pairingRules,
    comboRules,
    discountTiers,
    pendingOrdersCount,
    totalCustomersCount
  };
}
