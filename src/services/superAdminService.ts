import * as superAdminRepo from '@/repositories/superAdminRepository';

// Phase 2: restaurant detail functions go here

// Phase 3: customer and audit log functions go here

export interface OverviewMetrics {
  totalRestaurants: number;
  activeRestaurants: number;
  inactiveRestaurants: number;
  ordersCount: number;
  ordersCountChange: number;
  gmv: number;
  gmvChange: number;
  aov: number;
  aovChange: number;
  aovTrend: Array<{ date: string; aov: number }>;
}

export interface RestaurantListItem {
  restaurantId: string;
  restaurantName: string;
  location: string;
  active: boolean;
  periodOrdersCount: number;
  periodGmv: number;
  periodAov: number;
  setupScore: number;
  checklist: Array<{ label: string; passed: boolean }>;
  lastOrderDate: string | null;
}

export interface AnomalyItem {
  restaurantId: string;
  restaurantName: string;
  description: string;
}

/**
 * Parses and returns appropriate start/end boundaries based on custom inputs or preset ranges.
 */
export function parseDateRange(startDateStr?: string, endDateStr?: string): { start: Date; end: Date; durationMs: number } {
  const start = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDateStr ? new Date(endDateStr) : new Date();

  if (!startDateStr) {
    start.setHours(0, 0, 0, 0);
  }
  if (!endDateStr) {
    end.setHours(23, 59, 59, 999);
  }

  return {
    start,
    end,
    durationMs: end.getTime() - start.getTime()
  };
}

/**
 * Computes a percentage change between two periods. Handles division-by-zero gracefully.
 */
function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Groups daily trend data points into weekly buckets (W/C Sunday).
 */
function groupTrendByWeek(dailyTrend: Array<{ date: string; gmv: number; ordersCount: number }>): Array<{ date: string; aov: number }> {
  const weeklyMap = new Map<string, { gmv: number; ordersCount: number }>();
  
  for (const point of dailyTrend) {
    const date = new Date(point.date);
    const day = date.getDay(); // 0 is Sunday
    const diff = date.getDate() - day;
    const sunday = new Date(date.setDate(diff));
    const weekKey = sunday.toISOString().split('T')[0];

    const existing = weeklyMap.get(weekKey) || { gmv: 0, ordersCount: 0 };
    weeklyMap.set(weekKey, {
      gmv: existing.gmv + point.gmv,
      ordersCount: existing.ordersCount + point.ordersCount
    });
  }

  const weeklyTrend: Array<{ date: string; aov: number }> = [];
  weeklyMap.forEach((val, key) => {
    weeklyTrend.push({
      date: `W/C ${key}`,
      aov: val.ordersCount > 0 ? Math.round(val.gmv / val.ordersCount) : 0
    });
  });

  return weeklyTrend.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Evaluates the setup checkpoints and returns a score from 0-100% and checklists.
 */
export function computeSetupScore(r: any): { score: number; checklist: Array<{ label: string; passed: boolean }> } {
  const checklist = [
    { label: 'Menu has at least 5 items', passed: r.menuItemsCount >= 5, weight: 15 },
    { label: 'At least 1 active discount tier', passed: r.activeDiscountTiers >= 1, weight: 20 },
    { label: 'At least 1 active pairing rule', passed: r.activePairingRules >= 1, weight: 20 },
    { label: 'At least 1 active combo/freebie rule', passed: r.activeComboRules >= 1, weight: 20 },
    { label: 'Chef\'s note filled for at least 3 items', passed: r.chefNotesCount >= 3, weight: 10 },
    { label: 'Spice level set for at least 50% of items', passed: r.menuItemsCount > 0 && (r.spiceLevelCount / r.menuItemsCount) >= 0.5, weight: 10 },
    { label: 'At least 1 completed order exists', passed: r.completedOrdersCount >= 1, weight: 5 }
  ];

  const score = checklist.reduce((sum, item) => sum + (item.passed ? item.weight : 0), 0);
  return { score, checklist };
}

/**
 * Returns plain-English anomaly descriptions if the restaurant triggers any criteria.
 */
export function getAnomaliesList(r: any, setupScore: number): string[] {
  const anomalies: string[] = [];

  // 1. No orders in last 72 hours (only for restaurants with historical order history)
  if (r.completedOrdersCount >= 1 || r.lastOrderDate) {
    if (r.lastOrderDate) {
      const hours = (Date.now() - new Date(r.lastOrderDate).getTime()) / (1000 * 60 * 60);
      if (hours > 72) {
        anomalies.push(`No orders in the last 72 hours (Last order: ${new Date(r.lastOrderDate).toLocaleDateString()})`);
      }
    } else {
      anomalies.push('No recent orders logged');
    }
  }

  // 2. Setup score below 40%
  if (setupScore < 40) {
    anomalies.push(`Setup score ${setupScore}% — onboarding incomplete`);
  }

  // 3. All discount tiers deactivated
  if (r.activeDiscountTiers === 0) {
    anomalies.push('All discount tiers deactivated (upsell engine disabled)');
  }

  // 4. All combo rules deactivated
  if (r.activeComboRules === 0) {
    anomalies.push('All combo rules deactivated (upsell engine disabled)');
  }

  return anomalies;
}

/**
 * Calculates platform overview KPIs and date trend datasets.
 */
export async function getPlatformOverview(startDateStr?: string, endDateStr?: string): Promise<OverviewMetrics> {
  const { start, end, durationMs } = parseDateRange(startDateStr, endDateStr);
  const prevStart = new Date(start.getTime() - durationMs);
  const prevEnd = new Date(end.getTime() - durationMs);

  const [
    counts,
    currentStats,
    prevStats,
    dailyTrend
  ] = await Promise.all([
    superAdminRepo.getRestaurantCounts(),
    superAdminRepo.getPlatformOrderStats(start, end),
    superAdminRepo.getPlatformOrderStats(prevStart, prevEnd),
    superAdminRepo.getDailyAovTrend(start, end)
  ]);

  // Aggregate AOV trend
  const totalDays = durationMs / (1000 * 60 * 60 * 24);
  const aovTrend = totalDays > 10
    ? groupTrendByWeek(dailyTrend)
    : dailyTrend.map(t => ({
        date: t.date,
        aov: t.ordersCount > 0 ? Math.round(t.gmv / t.ordersCount) : 0
      }));

  return {
    totalRestaurants: counts.total,
    activeRestaurants: counts.active,
    inactiveRestaurants: counts.inactive,
    ordersCount: currentStats.ordersCount,
    ordersCountChange: calculatePercentChange(currentStats.ordersCount, prevStats.ordersCount),
    gmv: currentStats.gmv,
    gmvChange: calculatePercentChange(currentStats.gmv, prevStats.gmv),
    aov: currentStats.aov,
    aovChange: calculatePercentChange(currentStats.aov, prevStats.aov),
    aovTrend
  };
}

/**
 * Scans all restaurants and returns any that require operational attention.
 */
export async function getPlatformAnomalies(): Promise<AnomalyItem[]> {
  // Use a default 30-day window for fetching active orders
  const { start, end } = parseDateRange();
  const checklists = await superAdminRepo.getRestaurantChecklists(start, end);

  const anomalies: AnomalyItem[] = [];

  for (const r of checklists) {
    const { score } = computeSetupScore(r);
    const flags = getAnomaliesList(r, score);

    for (const flag of flags) {
      anomalies.push({
        restaurantId: r.restaurantId,
        restaurantName: r.restaurantName,
        description: flag
      });
    }
  }

  return anomalies;
}

/**
 * Retrieves the full list of restaurants along with setup scores and metrics.
 */
export async function getRestaurantList(startDateStr?: string, endDateStr?: string, statusFilter?: 'all' | 'active' | 'inactive'): Promise<RestaurantListItem[]> {
  const { start, end } = parseDateRange(startDateStr, endDateStr);
  const checklists = await superAdminRepo.getRestaurantChecklists(start, end);

  let filtered = checklists;

  if (statusFilter === 'active') {
    filtered = checklists.filter(r => r.active === true);
  } else if (statusFilter === 'inactive') {
    filtered = checklists.filter(r => r.active !== true);
  }

  return filtered.map((r) => {
    const { score, checklist } = computeSetupScore(r);
    return {
      restaurantId: r.restaurantId,
      restaurantName: r.restaurantName,
      location: r.location,
      active: r.active,
      periodOrdersCount: r.periodOrdersCount,
      periodGmv: r.periodGmv,
      periodAov: r.periodOrdersCount > 0 ? Math.round(r.periodGmv / r.periodOrdersCount) : 0,
      setupScore: score,
      checklist,
      lastOrderDate: r.lastOrderDate ? new Date(r.lastOrderDate).toISOString() : null,
    };
  });
}
