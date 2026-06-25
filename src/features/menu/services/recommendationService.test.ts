import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUpsellConfig } from './recommendationService';
import * as menuItemRepo from '../repositories/menuRepository';
import * as pairingRuleRepo from '../repositories/pairingRuleRepository';
import * as discountTierRepo from '../repositories/discountTierRepository';
import * as comboRuleRepo from '../repositories/comboRuleRepository';
import * as orderRepo from '@/features/order/repository';

vi.mock('../repositories/menuRepository', () => ({
  findAll: vi.fn(),
}));
vi.mock('../repositories/pairingRuleRepository', () => ({
  findActive: vi.fn(),
}));
vi.mock('../repositories/discountTierRepository', () => ({
  findAll: vi.fn(),
}));
vi.mock('../repositories/comboRuleRepository', () => ({
  findActive: vi.fn(),
}));
vi.mock('@/features/order/repository', () => ({
  findRecentCompleted: vi.fn(),
}));

describe('recommendationService - getUpsellConfig', () => {
  const restaurantId = 'cafe-alpha';
  let testTime = 1719139200000;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    testTime += 1000 * 60 * 60; // Advance time by 1 hour to bypass caching
    vi.setSystemTime(new Date(testTime));
  });

  it('should throw ValidationError if restaurantId is missing', async () => {
    await expect(getUpsellConfig('')).rejects.toThrow('Restaurant ID is required');
  });

  it('should return raw configuration details', async () => {
    vi.mocked(menuItemRepo.findAll).mockResolvedValue([{ name: 'Burger' }] as any);
    vi.mocked(pairingRuleRepo.findActive).mockResolvedValue([{ _id: 'rule-1' }] as any);
    vi.mocked(discountTierRepo.findAll).mockResolvedValue([{ percentOff: 10 }] as any);
    vi.mocked(comboRuleRepo.findActive).mockResolvedValue([{ name: 'Combo 1' }] as any);
    vi.mocked(orderRepo.findRecentCompleted).mockResolvedValue([]);

    const result = await getUpsellConfig(restaurantId);

    expect(result.menuItems).toEqual([{ name: 'Burger' }]);
    expect(result.pairingRules).toEqual([{ _id: 'rule-1' }]);
    expect(result.discountTiers).toEqual([{ percentOff: 10 }]);
    expect(result.comboRules).toEqual([{ name: 'Combo 1' }]);
    expect(result.completedCount).toBe(0);
  });

  it('should skip affinity computation if completed orders count is less than 50', async () => {
    vi.mocked(menuItemRepo.findAll).mockResolvedValue([]);
    vi.mocked(pairingRuleRepo.findActive).mockResolvedValue([]);
    vi.mocked(discountTierRepo.findAll).mockResolvedValue([]);
    vi.mocked(comboRuleRepo.findActive).mockResolvedValue([]);
    
    // 40 orders
    const mockOrders = Array(40).fill(null).map(() => ({
      items: [{ name: 'Burger' }, { name: 'Fries' }]
    }));
    vi.mocked(orderRepo.findRecentCompleted).mockResolvedValue(mockOrders as any);

    const result = await getUpsellConfig(restaurantId);
    expect(result.completedCount).toBe(40);
    expect(result.computedAffinity).toEqual({});
  });

  it('should compute co-occurrence suggestions when completed count >= 50 and matches support thresholds', async () => {
    vi.mocked(menuItemRepo.findAll).mockResolvedValue([]);
    vi.mocked(pairingRuleRepo.findActive).mockResolvedValue([]);
    vi.mocked(discountTierRepo.findAll).mockResolvedValue([]);
    vi.mocked(comboRuleRepo.findActive).mockResolvedValue([]);

    // We generate 50 orders:
    // 30 orders have Burger + Fries (Burger count = 30, Fries count = 30, both > 20 support threshold)
    // 20 orders have Burger only (Burger count = 50 total, co-occurrence Burger + Fries = 30)
    const mockOrders: any[] = [];
    for (let i = 0; i < 30; i++) {
      mockOrders.push({ items: [{ name: 'Burger' }, { name: 'Fries' }] });
    }
    for (let i = 0; i < 20; i++) {
      mockOrders.push({ items: [{ name: 'Burger' }] });
    }

    vi.mocked(orderRepo.findRecentCompleted).mockResolvedValue(mockOrders);

    const result = await getUpsellConfig(restaurantId);
    expect(result.completedCount).toBe(50);
    expect(result.computedAffinity['Burger']).toBeDefined();
    // Burger total count = 50, paired Fries count = 30. Confidence = 30 / 50 = 0.6
    expect(result.computedAffinity['Burger'][0]).toEqual({
      name: 'Fries',
      confidence: 0.6
    });
  });

  it('should utilize local memory cache on concurrent queries', async () => {
    vi.mocked(menuItemRepo.findAll).mockResolvedValue([]);
    vi.mocked(pairingRuleRepo.findActive).mockResolvedValue([]);
    vi.mocked(discountTierRepo.findAll).mockResolvedValue([]);
    vi.mocked(comboRuleRepo.findActive).mockResolvedValue([]);
    vi.mocked(orderRepo.findRecentCompleted).mockResolvedValue([]);

    // Call 1
    await getUpsellConfig(restaurantId);
    expect(orderRepo.findRecentCompleted).toHaveBeenCalledTimes(1);

    // Call 2
    await getUpsellConfig(restaurantId);
    // Should use cache, total calls to repository should still be 1
    expect(orderRepo.findRecentCompleted).toHaveBeenCalledTimes(1);
  });
});
