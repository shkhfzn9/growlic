import * as menuItemRepo from '../repositories/menuRepository';
import * as pairingRuleRepo from '../repositories/pairingRuleRepository';
import * as discountTierRepo from '../repositories/discountTierRepository';
import * as comboRuleRepo from '../repositories/comboRuleRepository';
import * as orderRepo from '@/features/order/repository';
import { ValidationError } from '@/shared/errors';

let cachedAffinity: {
  restaurantId: string;
  computedAffinity: Record<string, Array<{ name: string; confidence: number }>>;
  completedCount: number;
  timestamp: number;
} | null = null;

/**
 * Aggregates all upsell configurations, pairing rules, discounts, and combo definitions.
 * Performs a dynamic co-occurrence association rule mining calculation if the completed orders threshold (>= 50 completed orders) is met.
 * Implements a 60-second local memory cache to optimize performance on concurrent calls.
 * 
 * @param restaurantId The restaurant identifier slug.
 * @returns An object containing raw configurations and computed item affinities.
 */
export async function getUpsellConfig(restaurantId: string) {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }

  const [menuItems, pairingRules, discountTiers, comboRules] = await Promise.all([
    menuItemRepo.findAll(restaurantId),
    pairingRuleRepo.findActive(restaurantId),
    discountTierRepo.findAll(restaurantId),
    comboRuleRepo.findActive(restaurantId),
  ]);

  let computedAffinity: Record<string, Array<{ name: string; confidence: number }>> = {};
  let completedCount = 0;

  const CACHE_TTL_MS = 60 * 1000;
  const now = Date.now();

  if (cachedAffinity && cachedAffinity.restaurantId === restaurantId && (now - cachedAffinity.timestamp) < CACHE_TTL_MS) {
    computedAffinity = cachedAffinity.computedAffinity;
    completedCount = cachedAffinity.completedCount;
  } else {
    const allOrders = await orderRepo.findAll(restaurantId);
    const completedOrders = allOrders.filter(o => o.status === 'completed');
    completedCount = completedOrders.length;

    // Association rule mining algorithm (requires at least 50 historical orders to run)
    if (completedCount >= 50) {
      const itemCountMap: Record<string, number> = {};
      const coOccurrenceMap: Record<string, Record<string, number>> = {};

      completedOrders.forEach((order) => {
        const uniqueItems = Array.from(new Set(order.items.map((i) => i.name)));
        
        uniqueItems.forEach((item) => {
          itemCountMap[item] = (itemCountMap[item] || 0) + 1;
        });

        for (let i = 0; i < uniqueItems.length; i++) {
          for (let j = 0; j < uniqueItems.length; j++) {
            if (i === j) continue;
            const itemA = uniqueItems[i];
            const itemB = uniqueItems[j];

            if (!coOccurrenceMap[itemA]) {
              coOccurrenceMap[itemA] = {};
            }
            coOccurrenceMap[itemA][itemB] = (coOccurrenceMap[itemA][itemB] || 0) + 1;
          }
        }
      });

      // Filter pairs where occurrence count >= 20 and confidence > 0.2
      Object.keys(coOccurrenceMap).forEach((itemA) => {
        const countA = itemCountMap[itemA] || 0;
        if (countA >= 20) {
          const suggestions: Array<{ name: string; confidence: number }> = [];
          Object.keys(coOccurrenceMap[itemA]).forEach((itemB) => {
            const countPair = coOccurrenceMap[itemA][itemB];
            if (countPair >= 20) {
              const confidence = countPair / countA;
              if (confidence > 0.2) {
                suggestions.push({ name: itemB, confidence });
              }
            }
          });

          if (suggestions.length > 0) {
            computedAffinity[itemA] = suggestions.sort((a, b) => b.confidence - a.confidence);
          }
        }
      });
    }

    cachedAffinity = {
      restaurantId,
      computedAffinity,
      completedCount,
      timestamp: now,
    };
  }

  return {
    menuItems,
    pairingRules,
    discountTiers,
    comboRules,
    computedAffinity,
    completedCount,
  };
}
