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

    it('should compute 3-day sales summary and payment mode split', () => {
      const customParams = {
        ...mockParams,
        orderAggregates: {
          ...mockParams.orderAggregates,
          paymentSplit: [
            { _id: 'cash', count: 3, revenue: 900 },
            { _id: 'online', count: 2, revenue: 600 },
          ],
          dailyPaymentSplit: [
            { _id: { dateStr: '2026-06-10', paymentMode: 'cash' }, count: 2, revenue: 500 },
            { _id: { dateStr: '2026-06-10', paymentMode: 'online' }, count: 1, revenue: 400 },
            { _id: { dateStr: '2026-06-09', paymentMode: 'cash' }, count: 1, revenue: 400 },
            { _id: { dateStr: '2026-06-08', paymentMode: 'online' }, count: 1, revenue: 200 },
          ],
        },
        threeDayAggregation: [
          { _id: { dateStr: '2026-06-10', paymentMode: 'cash' }, count: 2, revenue: 500 },
          { _id: { dateStr: '2026-06-10', paymentMode: 'online' }, count: 1, revenue: 400 },
          { _id: { dateStr: '2026-06-09', paymentMode: 'cash' }, count: 1, revenue: 400 },
          { _id: { dateStr: '2026-06-08', paymentMode: 'online' }, count: 1, revenue: 200 },
        ],
        ordersTableRaw: [
          {
            _id: 'order-1',
            customerName: 'Alice',
            customerPhone: '9999999999',
            subtotal: 300,
            total: 300,
            status: 'completed',
            paymentMode: 'online',
            createdAt: '2026-06-10T12:00:00Z',
            items: [],
          },
        ],
      };

      const result = computeDashboardMetrics(customParams);

      // Payment split
      expect(result.paymentSplit.totalRevenue).toBe(1500);
      expect(result.paymentSplit.cashRevenue).toBe(900);
      expect(result.paymentSplit.onlineRevenue).toBe(600);
      expect(result.paymentSplit.cashPercent).toBe(60);
      expect(result.paymentSplit.onlinePercent).toBe(40);
      expect(result.paymentSplit.dailyBreakdown.length).toBe(3);

      // 3-day summary
      expect(result.threeDaySummary.day1.totalRevenue).toBe(900); // 2026-06-10
      expect(result.threeDaySummary.day1.cashRevenue).toBe(500);
      expect(result.threeDaySummary.day1.onlineRevenue).toBe(400);
      expect(result.threeDaySummary.day2.totalRevenue).toBe(400); // 2026-06-09
      expect(result.threeDaySummary.day3.totalRevenue).toBe(200); // 2026-06-08
      expect(result.threeDaySummary.cumulative.totalRevenue).toBe(1500);

      // Orders table paymentMode
      expect(result.ordersTable[0].paymentMode).toBe('online');

      // Growth analysis
      expect(result.growthAnalysis).toBeDefined();
      expect(result.growthAnalysis.dod).toBeDefined();
      expect(result.growthAnalysis.twoDay).toBeDefined();
      expect(result.growthAnalysis.threeDay).toBeDefined();
      expect(result.growthAnalysis.wow).toBeDefined();
      expect(result.growthAnalysis.mom).toBeDefined();
      expect(result.growthAnalysis.quarter).toBeDefined();
      expect(result.growthAnalysis.diagnosis).toBeDefined();
      expect(result.growthAnalysis.wowDayBreakdown.length).toBe(7);
      expect(result.growthAnalysis.historicalDays.length).toBeGreaterThan(0);
    });
  });
});
