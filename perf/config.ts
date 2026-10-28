/**
 * Growlic Performance & Capacity Audit Configuration
 * All assumptions, SLA thresholds, test tenant IDs, and database targets.
 */

export const PERF_CONFIG = {
  // Database targets
  testDbName: 'growlic_perf_test',
  testMongoUri: process.env.PERF_TEST_MONGODB_URI || 'mongodb://localhost:27017/growlic_perf_test',
  
  // App target (Production build running locally or staging URL)
  baseUrl: process.env.PERF_BASE_URL || 'http://localhost:3005',
  
  // Model Assumptions (Adjustable)
  dailyOrdersPerRestaurant: 150,
  peakHourFraction: 0.20, // 20% of daily orders in peak hour = 30 orders/hr = 0.5 orders/min
  serviceWindowHours: 6,
  screensPerRestaurant: {
    kitchen: 1,
    pos: 1,
    ownerDashboard: 1, // occasional
  },
  qrOrderShare: 0.60, // 60% of orders come from QR customers
  counterOrderShare: 0.40, // 40% from counter POS
  menuViewsPerQrOrder: 1.0, // Each QR customer loads the menu once
  
  // Target test restaurants for Phase 0 seeding
  tenants: [
    {
      restaurantId: 'perf_rest_001',
      restaurantName: 'Tokyo Ramen Bar (Perf Test 1)',
      businessCategory: 'restaurant',
      email: 'admin1@perftest.growlic.com',
      password: 'PerfPassword@123',
    },
    {
      restaurantId: 'perf_rest_002',
      restaurantName: 'Kyoto Sushi House (Perf Test 2)',
      businessCategory: 'restaurant',
      email: 'admin2@perftest.growlic.com',
      password: 'PerfPassword@123',
    },
    {
      restaurantId: 'perf_rest_003',
      restaurantName: 'Osaka Street Grill (Perf Test 3)',
      businessCategory: 'restaurant',
      email: 'admin3@perftest.growlic.com',
      password: 'PerfPassword@123',
    },
  ],

  // Volume per test restaurant
  seedVolume: {
    menuItems: 200,
    orders: 20000,
    customers: 3000,
  },

  // SLA Thresholds for Stop Conditions
  sla: {
    maxErrorRatePct: 1.0,
    createOrderP95Ms: 1500,
    kitchenReadP95Ms: 1000,
    atlasConnectionSaturationPct: 80, // % of tier max connection limit
  },
  
  // Atlas Tier specs (for capacity modeling)
  atlasTiers: {
    M0: { maxConnections: 500, ramGb: 0.5, storageGb: 0.5, priceMonthlyUsd: 0 },
    M2: { maxConnections: 500, ramGb: 2.0, storageGb: 2.0, priceMonthlyUsd: 9 },
    M5: { maxConnections: 500, ramGb: 4.0, storageGb: 5.0, priceMonthlyUsd: 25 },
    M10: { maxConnections: 1500, ramGb: 2.0, storageGb: 10.0, priceMonthlyUsd: 57 },
    M20: { maxConnections: 3000, ramGb: 4.0, storageGb: 20.0, priceMonthlyUsd: 140 },
    M30: { maxConnections: 3000, ramGb: 8.0, storageGb: 40.0, priceMonthlyUsd: 280 },
  },

  // Vercel limits
  vercelLimits: {
    hobby: { maxDurationSec: 10, maxConcurrency: 100, monthlyInvocations: 100000 },
    pro: { maxDurationSec: 60, maxConcurrency: 1000, monthlyInvocations: 1000000 },
  }
};
