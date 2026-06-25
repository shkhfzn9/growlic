import { describe, it, expect } from 'vitest';
import { getItemAllergens, computeDashboardMetrics } from './calculations';

describe('analytics calculations', () => {
  describe('getItemAllergens', () => {
    it('should correctly scan ingredients for allergens', () => {
      const ingredients = ['Wheat Flour', 'Whole Milk', 'Butter', 'Peanut Butter', 'Egg yolk', 'Soy sauce'];
      const allergens = getItemAllergens(ingredients);
      expect(allergens).toContain('gluten');
      expect(allergens).toContain('dairy');
      expect(allergens).toContain('nuts');
      expect(allergens).toContain('egg');
      expect(allergens).toContain('soy');
    });

    it('should return empty list when no allergens are matched', () => {
      const ingredients = ['Tomato', 'Basil', 'Olive Oil', 'Salt'];
      const allergens = getItemAllergens(ingredients);
      expect(allergens).toEqual([]);
    });
  });

  describe('computeDashboardMetrics', () => {
    const mockStart = new Date('2026-06-01T00:00:00Z');
    const mockEnd = new Date('2026-06-30T23:59:59Z');

    const mockParams: any = {
      start: mockStart,
      end: mockEnd,
      eventAggregates: {
        cartsStarted: [{ count: 10 }],
        nudgeShownCounts: [
          { _id: 'cross_sell', count: 4 },
          { _id: 'combo_freebie', count: 2 },
        ],
        ruleStatsTriggers: [{ _id: 'rule-1', count: 5 }],
        modalOpenCounts: [{ _id: 'item-1', count: 8 }],
      },
      orderAggregates: {
        kpis: [{ ordersCount: 5, revenue: 1500, itemsCount: 15 }],
        upsellKPI: [{ revenue: 200 }],
        heatmap: [
          { _id: { dayOfWeek: 2, hour: 12 }, count: 3, revenue: 900, nonCancelledCount: 3 }, // Monday 12PM
          { _id: { dayOfWeek: 3, hour: 20 }, count: 2, revenue: 600, nonCancelledCount: 2 }, // Tuesday 8PM
        ],
        trends: [
          { _id: '2026-06-05', orders: 2, revenue: 600, itemsCount: 6 },
          { _id: '2026-06-10', orders: 3, revenue: 900, itemsCount: 9 },
        ],
        itemSales: [
          { _id: 'Burger', itemId: 'item-1', quantity: 5, revenue: 1000 },
          { _id: 'Fries', itemId: 'item-2', quantity: 10, revenue: 500 },
        ],
        ruleConversions: [
          { _id: 'rule-1', count: 2, revenue: 100 },
        ],
        customerPhones: [
          { _id: '9999999999', orderCount: 3 },
          { _id: '8888888888', orderCount: 2 },
        ],
      },
      recentCompletedOrders: [
        { items: [{ name: 'Burger' }, { name: 'Fries' }] },
        { items: [{ name: 'Burger' }, { name: 'Fries' }] },
        { items: [{ name: 'Burger' }] },
      ],
      ordersTableRaw: [
        {
          _id: 'order-1',
          customerName: 'Alice',
          customerPhone: '9999999999',
          subtotal: 300,
          total: 300,
          status: 'completed' as const,
          createdAt: '2026-06-05T12:00:00Z',
          tableId: '4',
          items: [{ name: 'Burger', quantity: 1, originatedFromNudge: false }],
        },
      ],
      menuItems: [
        { _id: 'item-1', name: 'Burger', price: 200, category: 'Main', ingredients: ['bread', 'beef'], spiceLevel: 1, active: true, restaurantId: 'cafe-alpha', description: 'tasty' },
        { _id: 'item-2', name: 'Fries', price: 50, category: 'Sides', ingredients: ['potato'], spiceLevel: 0, active: true, restaurantId: 'cafe-alpha', description: 'crispy' },
      ] as any,
      pairingRules: [
        { _id: 'rule-1', restaurantId: 'cafe-alpha', triggerCategory: 'Main', suggestCategories: ['Sides'], active: true },
      ],
      comboRules: [],
      discountTiers: [],
      pendingOrdersCount: 1,
      totalCustomersCount: 2,
      discountTierAchievement: [],
      avgOrderValueNoTier: 300,
      customersByPhone: [
        { phone: '9999999999', totalOrders: 3 },
        { phone: '8888888888', totalOrders: 2 },
      ] as any,
    };

    it('should correctly compile overall KPIs', () => {
      const result = computeDashboardMetrics(mockParams);
      expect(result.ordersCount).toBe(5);
      expect(result.revenue).toBe(1500);
      expect(result.aov).toBe(300);
      expect(result.itemsPerOrder).toBe(3);
      expect(result.upsellRevenue).toBe(200);
      expect(result.pendingOrders).toBe(1);
      expect(result.customers).toBe(2);
    });

    it('should generate the dayHourHeatmap', () => {
      const result = computeDashboardMetrics(mockParams);
      // Monday is index 1 (dayOfWeek 2 - 1)
      expect(result.dayHourHeatmap[1][12]).toBe(3);
      // Tuesday is index 2 (dayOfWeek 3 - 1)
      expect(result.dayHourHeatmap[2][20]).toBe(2);
      // Sunday is 0
      expect(result.dayHourHeatmap[0][12]).toBe(0);
    });

    it('should compute co-occurrence recommendations based on association rules math', () => {
      const result = computeDashboardMetrics(mockParams);
      const freq = result.menuIntelligence.frequentlyBoughtTogether;
      expect(freq.length).toBeGreaterThan(0);
      expect(freq[0].itemA).toBe('Fries');
      expect(freq[0].itemB).toBe('Burger');
      expect(freq[0].coOccurrenceCount).toBe(2);
      // Fries was ordered in 2 unique orders. Burger was paired in 2 of them. Confidence = 2 / 2 = 1.0
      expect(freq[0].confidence).toBeCloseTo(1.0, 2);
      expect(freq[0].matchingManualRule).toBe(false); // matching category Main -> Sides rule, but direction is Sides -> Main
    });

    it('should compute carts abandonment rates', () => {
      const result = computeDashboardMetrics(mockParams);
      const behavior = result.customerBehavior;
      expect(behavior.cartAbandonment.cartsStarted).toBe(10);
      expect(behavior.cartAbandonment.ordersCompleted).toBe(5);
      expect(behavior.cartAbandonment.abandonmentRate).toBe(50);
    });
  });
});
