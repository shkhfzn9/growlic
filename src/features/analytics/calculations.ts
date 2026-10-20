import { IMenuItem, IPairingRule, IComboRule, IDiscountTier } from '@/features/menu/types';
import { ICustomer } from '@/features/customer/types';

/**
 * Helper function that scans a list of ingredients against static keyword lists
 * to identify known allergens (nuts, dairy, egg, gluten, soy, shellfish, fish, sesame).
 * 
 * @param ingredients Array of menu item ingredients.
 * @returns Array of identified allergen strings.
 */
export function getItemAllergens(ingredients: string[]): string[] {
  const allergens: string[] = [];
  const lowerIngs = (ingredients || []).map(i => i.toLowerCase());

  const check = (keywords: string[]) => lowerIngs.some(ing => keywords.some(kw => ing.includes(kw)));

  if (check(['nut', 'peanut', 'cashew', 'almond', 'walnut', 'pistachio'])) allergens.push('nuts');
  if (check(['dairy', 'milk', 'cheese', 'butter', 'cream', 'paneer', 'yogurt'])) allergens.push('dairy');
  if (check(['egg'])) allergens.push('egg');
  if (check(['gluten', 'wheat', 'flour', 'maida'])) allergens.push('gluten');
  if (check(['soy', 'soya', 'tofu'])) allergens.push('soy');
  if (check(['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'clam', 'mussel'])) allergens.push('shellfish');
  if (check(['fish', 'salmon', 'tuna', 'cod'])) allergens.push('fish');
  if (check(['sesame'])) allergens.push('sesame');

  return allergens;
}

export interface DayPaymentDetail {
  date: string;
  label: string;
  totalRevenue: number;
  totalOrders: number;
  cashRevenue: number;
  cashOrders: number;
  cashPercent: number;
  onlineRevenue: number;
  onlineOrders: number;
  onlinePercent: number;
  creditRevenue?: number;
  creditOrders?: number;
  creditPercent?: number;
  aov: number;
}

export interface ThreeDaySalesSummary {
  day1: DayPaymentDetail;
  day2: DayPaymentDetail;
  day3: DayPaymentDetail;
  cumulative: {
    totalRevenue: number;
    totalOrders: number;
    cashRevenue: number;
    cashOrders: number;
    cashPercent: number;
    onlineRevenue: number;
    onlineOrders: number;
    onlinePercent: number;
    creditRevenue?: number;
    creditOrders?: number;
    creditPercent?: number;
    aov: number;
  };
  comparison: {
    revenueGrowthVsYesterday: number;
    ordersGrowthVsYesterday: number;
  };
}

export interface PaymentSplitOverview {
  totalRevenue: number;
  totalOrders: number;
  cashRevenue: number;
  cashOrders: number;
  cashPercent: number;
  onlineRevenue: number;
  onlineOrders: number;
  onlinePercent: number;
  creditRevenue?: number;
  creditOrders?: number;
  creditPercent?: number;
  dailyBreakdown: Array<{
    date: string;
    totalRevenue: number;
    totalOrders: number;
    cashRevenue: number;
    cashOrders: number;
    onlineRevenue: number;
    onlineOrders: number;
    creditRevenue?: number;
    creditOrders?: number;
    cashPercent: number;
    onlinePercent: number;
    creditPercent?: number;
  }>;
}

export interface PeriodMetrics {
  label: string;
  startDate: string;
  endDate: string;
  revenue: number;
  orders: number;
  aov: number;
}

export interface GrowthComparison {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  revenueGrowthPercent: number;
  ordersGrowthPercent: number;
  aovGrowthPercent: number;
  revenueDelta: number;
  ordersDelta: number;
  status: 'growth' | 'decline' | 'stable';
}

export interface DailyTrendComparison {
  dayName: string;
  currentDate: string;
  previousDate: string;
  currentRevenue: number;
  previousRevenue: number;
  growthPercent: number;
}

export interface GrowthDiagnosis {
  verdict: 'strong_growth' | 'moderate_growth' | 'stable' | 'moderate_decline' | 'sharp_decline';
  badgeLabel: string;
  headline: string;
  summary: string;
  volumeDriver: string;
  ticketDriver: string;
  primaryTrend: 'up' | 'down' | 'flat';
}

export interface HistoricalDayRecord {
  date: string;
  dayName: string;
  revenue: number;
  orders: number;
  aov: number;
  cashRevenue: number;
  onlineRevenue: number;
}

export interface BusinessGrowthAnalysis {
  dod: GrowthComparison;
  twoDay: GrowthComparison;
  threeDay: GrowthComparison;
  wow: GrowthComparison;
  mom: GrowthComparison;
  quarter: GrowthComparison;
  wowDayBreakdown: DailyTrendComparison[];
  historicalDays: HistoricalDayRecord[];
  diagnosis: GrowthDiagnosis;
}

export function generateGrowthDiagnosis(
  growth: GrowthComparison,
  periodName: string,
  contextNote?: string
): GrowthDiagnosis {
  const revGrowth = growth.revenueGrowthPercent;
  const ordGrowth = growth.ordersGrowthPercent;
  const aovGrowth = growth.aovGrowthPercent;
  const currentRev = growth.current.revenue;
  const prevRev = growth.previous.revenue;

  let verdict: GrowthDiagnosis['verdict'] = 'stable';
  let badgeLabel = 'Steady Pace';
  let headline = `Sales are holding steady (${periodName})`;
  let summary = `Operations are tracking consistently with the previous cycle at ₹${Math.round(currentRev).toLocaleString()}.`;
  let primaryTrend: 'up' | 'down' | 'flat' = 'flat';

  if (currentRev === 0 && prevRev === 0) {
    verdict = 'stable';
    badgeLabel = 'No Activity';
    headline = `No orders recorded during this ${periodName}`;
    summary = `Transaction register shows no customer checkouts in this period.`;
    primaryTrend = 'flat';
  } else if (prevRev === 0 && currentRev > 0) {
    verdict = 'strong_growth';
    badgeLabel = 'New Activity';
    headline = `Generated ₹${Math.round(currentRev).toLocaleString()} across ${growth.current.orders} orders`;
    summary = `Fresh revenue baseline established for this ${periodName}.`;
    primaryTrend = 'up';
  } else if (revGrowth >= 10) {
    verdict = 'strong_growth';
    badgeLabel = 'Accelerating Growth';
    headline = `Revenue expanded +${revGrowth.toFixed(1)}% (${periodName})`;
    summary = `Top-line performance surged by +₹${Math.round(growth.revenueDelta).toLocaleString()} over the prior baseline with higher volume.`;
    primaryTrend = 'up';
  } else if (revGrowth >= 2) {
    verdict = 'moderate_growth';
    badgeLabel = 'Positive Momentum';
    headline = `Revenue grew +${revGrowth.toFixed(1)}% (${periodName})`;
    summary = `Positive momentum outpacing the previous cycle by +₹${Math.round(growth.revenueDelta).toLocaleString()}.`;
    primaryTrend = 'up';
  } else if (revGrowth > -2) {
    verdict = 'stable';
    badgeLabel = 'Steady Performance';
    headline = `Sales remained stable (${revGrowth >= 0 ? '+' : ''}${revGrowth.toFixed(1)}% ${periodName})`;
    summary = `Order volume and average bill size are balanced compared to the previous period.`;
    primaryTrend = 'flat';
  } else if (revGrowth > -10) {
    verdict = 'moderate_decline';
    badgeLabel = 'Slight Softening';
    headline = `Revenue softened ${revGrowth.toFixed(1)}% (${periodName})`;
    summary = `Sales contracted by ₹${Math.round(Math.abs(growth.revenueDelta)).toLocaleString()} compared to the prior baseline.`;
    primaryTrend = 'down';
  } else {
    verdict = 'sharp_decline';
    badgeLabel = 'Action Needed';
    headline = `Revenue declined ${revGrowth.toFixed(1)}% (${periodName})`;
    summary = `Notable slowdown of -₹${Math.round(Math.abs(growth.revenueDelta)).toLocaleString()}. Review pricing, shift staffing, and active nudges.`;
    primaryTrend = 'down';
  }

  const volumeDriver = ordGrowth >= 0
    ? `Order Volume: +${ordGrowth.toFixed(1)}% (${growth.ordersDelta >= 0 ? '+' : ''}${growth.ordersDelta} orders)`
    : `Order Volume: ${ordGrowth.toFixed(1)}% (${growth.ordersDelta} orders)`;

  const ticketDriver = aovGrowth >= 0
    ? `Average Spend: ₹${Math.round(growth.current.aov)} (+${aovGrowth.toFixed(1)}% / +₹${Math.round(growth.current.aov - growth.previous.aov)})`
    : `Average Spend: ₹${Math.round(growth.current.aov)} (${aovGrowth.toFixed(1)}% / -₹${Math.round(Math.abs(growth.current.aov - growth.previous.aov))})`;

  return {
    verdict,
    badgeLabel,
    headline,
    summary: contextNote ? `${summary} ${contextNote}` : summary,
    volumeDriver,
    ticketDriver,
    primaryTrend,
  };
}

export function computeDashboardMetrics(params: {
  start: Date;
  end: Date;
  eventAggregates: {
    cartsStarted: Array<{ count: number }>;
    nudgeShownCounts: Array<{ _id: string; count: number }>;
    ruleStatsTriggers: Array<{ _id: string; count: number }>;
    modalOpenCounts: Array<{ _id: string; count: number }>;
  };
  orderAggregates: {
    kpis: Array<{ ordersCount: number; revenue: number; itemsCount: number }>;
    upsellKPI: Array<{ revenue: number }>;
    heatmap: Array<{ _id: { dayOfWeek: number; hour: number }; count: number; revenue: number; nonCancelledCount: number }>;
    trends: Array<{ _id: string; orders: number; revenue: number; itemsCount: number }>;
    itemSales: Array<{ _id: string; itemId: string; quantity: number; revenue: number }>;
    ruleConversions: Array<{ _id: string; count: number; revenue: number }>;
    customerPhones: Array<{ _id: string; orderCount: number }>;
    paymentSplit?: Array<{ _id: string; count: number; revenue: number }>;
    dailyPaymentSplit?: Array<{ _id: { dateStr: string; paymentMode: string }; count: number; revenue: number }>;
  };
  recentCompletedOrders: Array<{ items: Array<{ name: string }> }>;
  ordersTableRaw: any[];
  threeDayAggregation?: Array<{ _id: { dateStr: string; paymentMode: string }; count: number; revenue: number }>;
  menuItems: IMenuItem[];
  pairingRules: IPairingRule[];
  comboRules: IComboRule[];
  discountTiers: IDiscountTier[];
  pendingOrdersCount: number;
  totalCustomersCount: number;
  discountTierAchievement: Array<{
    tierId: string;
    minSpend: number;
    percentOff: number;
    ordersReached: number;
    avgOrderValueReached: number;
  }>;
  avgOrderValueNoTier: number;
  customersByPhone: ICustomer[];
}) {
  const {
    start,
    end,
    eventAggregates,
    orderAggregates,
    recentCompletedOrders,
    ordersTableRaw,
    threeDayAggregation,
    menuItems,
    pairingRules,
    comboRules,
    pendingOrdersCount,
    totalCustomersCount,
    discountTierAchievement,
    avgOrderValueNoTier,
    customersByPhone
  } = params;

  const menuItemsMap = new Map(menuItems.map(item => [item.name, item]));

  // 1. Time Intelligence Day x Hour Heatmap (7 days x 24 hours matrix)
  const dayHourHeatmap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
  
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bestDaysMap = Array(7).fill(null).map((_, i) => ({
    weekday: i,
    name: weekdayNames[i],
    totalOrders: 0,
    totalRevenue: 0,
  }));

  const periods = [
    { name: 'Breakfast', label: 'Breakfast (06:00 - 11:00)', hours: [6, 7, 8, 9, 10], orders: 0, revenue: 0 },
    { name: 'Lunch', label: 'Lunch (11:00 - 16:00)', hours: [11, 12, 13, 14, 15], orders: 0, revenue: 0 },
    { name: 'Evening', label: 'Afternoon/Evening (16:00 - 19:00)', hours: [16, 17, 18], orders: 0, revenue: 0 },
    { name: 'Dinner', label: 'Dinner (19:00 - 23:00)', hours: [19, 20, 21, 22], orders: 0, revenue: 0 },
    { name: 'Late Night', label: 'Late Night (23:00 - 06:00)', hours: [23, 0, 1, 2, 3, 4, 5], orders: 0, revenue: 0 },
  ];

  (orderAggregates.heatmap || []).forEach(item => {
    const day = item._id.dayOfWeek - 1; // 1-7 (Sun-Sat) to 0-6
    const hour = item._id.hour;

    if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
      dayHourHeatmap[day][hour] = item.count;

      bestDaysMap[day].totalOrders += item.nonCancelledCount;
      bestDaysMap[day].totalRevenue += item.revenue;

      const period = periods.find(p => p.hours.includes(hour));
      if (period) {
        period.orders += item.nonCancelledCount;
        period.revenue += item.revenue;
      }
    }
  });

  const bestDays = [...bestDaysMap].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const bestTimeOfDay = periods
    .map(p => ({ period: p.name, label: p.label, orders: p.orders, revenue: p.revenue }))
    .sort((a, b) => b.orders - a.orders);

  // KPIs
  const kpi = orderAggregates.kpis[0] || { ordersCount: 0, revenue: 0, itemsCount: 0 };
  const totalOrders = kpi.ordersCount;
  const totalRevenue = kpi.revenue;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const averageItemsPerOrder = totalOrders > 0 ? kpi.itemsCount / totalOrders : 0;
  const upsellRevenue = orderAggregates.upsellKPI[0]?.revenue || 0;

  // 2. Revenue Trends
  const toOperationalDateStr = (d: Date): string => {
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  };

  const trendsMap: Record<string, { date: string; revenue: number; orders: number; itemsCount: number }> = {};
  const currentDate = new Date(start);
  const endLimitStr = toOperationalDateStr(end);
  let iterSafety = 0;
  while (iterSafety < 366) {
    const dStr = toOperationalDateStr(currentDate);
    trendsMap[dStr] = { date: dStr, revenue: 0, orders: 0, itemsCount: 0 };
    if (dStr >= endLimitStr) break;
    currentDate.setDate(currentDate.getDate() + 1);
    iterSafety++;
  }

  (orderAggregates.trends || []).forEach(item => {
    const dStr = item._id;
    if (!trendsMap[dStr]) {
      trendsMap[dStr] = { date: dStr, revenue: 0, orders: 0, itemsCount: 0 };
    }
    trendsMap[dStr].revenue = item.revenue;
    trendsMap[dStr].orders = item.orders;
    trendsMap[dStr].itemsCount = item.itemsCount;
  });

  const trends = Object.values(trendsMap)
    .map(t => ({
      date: t.date,
      revenue: t.revenue,
      orders: t.orders,
      aov: t.orders > 0 ? t.revenue / t.orders : 0,
      avgItems: t.orders > 0 ? t.itemsCount / t.orders : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Sortable order list
  const ordersTable = (ordersTableRaw || []).map(order => {
    const itemsSummary = (order.items || []).map((item: any) => `${item.name} x${item.quantity}`).join(', ');
    const discountApplied = Math.max(0, order.subtotal - order.total);
    const upsellAccepted = (order.items || []).some((item: any) => item.originatedFromNudge);
    return {
      _id: order._id.toString(),
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      subtotal: order.subtotal,
      total: order.total,
      status: order.status,
      paymentMode: order.paymentMode || 'cash',
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : new Date(order.createdAt).toISOString(),
      discountApplied,
      upsellAccepted,
      itemsSummary,
      tableId: order.tableId,
    };
  });

  // 3. Upsell Engine Performance
  const nudgeShownCounts = { cross_sell: 0, threshold_discount: 0, combo_freebie: 0 };
  (eventAggregates.nudgeShownCounts || []).forEach(item => {
    const nt = item._id;
    if (nt in nudgeShownCounts) {
      nudgeShownCounts[nt as keyof typeof nudgeShownCounts] = item.count;
    }
  });

  const nudgeAcceptedCounts = { cross_sell: 0, threshold_discount: 0, combo_freebie: 0 };

  const ruleMap = new Map<string, { description: string; type: 'pairing' | 'combo' }>();
  for (const rule of pairingRules) {
    ruleMap.set(rule._id.toString(), {
      description: `Pairing Rule: Category ${rule.triggerCategory} ➔ ${rule.suggestCategories.join(', ')}`,
      type: 'pairing',
    });
  }
  for (const rule of comboRules) {
    ruleMap.set(rule._id.toString(), {
      description: `Combo Rule: ${rule.customerMessage}`,
      type: 'combo',
    });
  }

  const ruleStats: Record<string, { triggers: number; conversions: number; revenue: number }> = {};
  (eventAggregates.ruleStatsTriggers || []).forEach(item => {
    const ruleId = item._id;
    ruleStats[ruleId] = { triggers: item.count, conversions: 0, revenue: 0 };
  });

  (orderAggregates.ruleConversions || []).forEach(item => {
    const ruleId = item._id;
    if (!ruleStats[ruleId]) {
      ruleStats[ruleId] = { triggers: 0, conversions: 0, revenue: 0 };
    }
    ruleStats[ruleId].conversions = item.count;
    ruleStats[ruleId].revenue = item.revenue;

    // Track accepted counts by type
    const ruleInfo = ruleMap.get(ruleId);
    if (ruleInfo) {
      if (ruleInfo.type === 'pairing') {
        nudgeAcceptedCounts.cross_sell += item.count;
      } else {
        // combos and discounts
        nudgeAcceptedCounts.combo_freebie += item.count;
      }
    } else {
      // Fallback cross_sell
      nudgeAcceptedCounts.cross_sell += item.count;
    }
  });

  const upsellPerformance = {
    conversionRateByType: {
      cross_sell: {
        shown: nudgeShownCounts.cross_sell,
        accepted: nudgeAcceptedCounts.cross_sell,
        rate: nudgeShownCounts.cross_sell > 0 ? (nudgeAcceptedCounts.cross_sell / nudgeShownCounts.cross_sell) * 100 : 0,
      },
      threshold_discount: {
        shown: nudgeShownCounts.threshold_discount,
        accepted: nudgeAcceptedCounts.threshold_discount,
        rate: nudgeShownCounts.threshold_discount > 0 ? (nudgeAcceptedCounts.threshold_discount / nudgeShownCounts.threshold_discount) * 100 : 0,
      },
      combo_freebie: {
        shown: nudgeShownCounts.combo_freebie,
        accepted: nudgeAcceptedCounts.combo_freebie,
        rate: nudgeShownCounts.combo_freebie > 0 ? (nudgeAcceptedCounts.combo_freebie / nudgeShownCounts.combo_freebie) * 100 : 0,
      },
    },
    attributedRevenue: upsellRevenue,
    topRules: [] as any[],
    discountTierAchievement: [] as any[],
    avgOrderValueNoTier: avgOrderValueNoTier,
  };

  upsellPerformance.topRules = Object.entries(ruleStats).map(([ruleId, stats]) => {
    const info = ruleMap.get(ruleId) || { description: `Rule #${ruleId.substring(ruleId.length - 6).toUpperCase()}`, type: 'pairing' as const };
    const finalTriggers = Math.max(stats.triggers, stats.conversions);
    return {
      ruleId,
      ruleType: info.type,
      description: info.description,
      triggers: finalTriggers,
      conversions: stats.conversions,
      revenue: stats.revenue,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  upsellPerformance.discountTierAchievement = discountTierAchievement.map(tier => ({
    ...tier,
    percentReached: totalOrders > 0 ? (tier.ordersReached / totalOrders) * 100 : 0,
  }));

  // 4. Menu Intelligence
  const itemSalesList = (orderAggregates.itemSales || []).map(item => ({
    itemId: item.itemId ? item.itemId.toString() : '',
    name: item._id,
    quantity: item.quantity,
    revenue: item.revenue
  }));

  // Ensure menu items with 0 sales are also in sales list for underperforming item evaluation
  menuItems.forEach(item => {
    if (!itemSalesList.some(s => s.name === item.name)) {
      itemSalesList.push({
        itemId: item._id.toString(),
        name: item.name,
        quantity: 0,
        revenue: 0
      });
    }
  });

  const bestSellersQty = [...itemSalesList].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  const bestSellersRev = [...itemSalesList].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const worstSellers = [...itemSalesList]
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 10)
    .map(item => ({
      ...item,
      flagReview: item.quantity === 0,
    }));

  // Computed co-occurrence pairs from limited completed orders (last 1,000)
  const itemCountMap: Record<string, number> = {};
  const coOccurrenceMap: Record<string, Record<string, number>> = {};

  recentCompletedOrders.forEach((order) => {
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

  const frequentlyBoughtTogether: Array<{
    itemA: string;
    itemB: string;
    coOccurrenceCount: number;
    confidence: number;
    matchingManualRule: boolean;
  }> = [];

  const minCoCount = recentCompletedOrders.length >= 50 ? 5 : 2;

  Object.keys(coOccurrenceMap).forEach((itemA) => {
    const countA = itemCountMap[itemA] || 0;
    if (countA > 0) {
      Object.keys(coOccurrenceMap[itemA]).forEach((itemB) => {
        const countPair = coOccurrenceMap[itemA][itemB];
        if (countPair >= minCoCount) {
          const confidence = countPair / countA;
          if (confidence > 0.1) {
            const menuItemA = menuItemsMap.get(itemA);
            const menuItemB = menuItemsMap.get(itemB);
            let matchingManualRule = false;

            if (menuItemA && menuItemB) {
              matchingManualRule = pairingRules.some(rule => 
                rule.active && 
                rule.triggerCategory === menuItemA.category && 
                rule.suggestCategories.includes(menuItemB.category)
              );
            }

            frequentlyBoughtTogether.push({
              itemA,
              itemB,
              coOccurrenceCount: countPair,
              confidence,
              matchingManualRule,
            });
          }
        }
      });
    }
  });
  frequentlyBoughtTogether.sort((a, b) => b.coOccurrenceCount - a.coOccurrenceCount || b.confidence - a.confidence);

  // Modal converted conversions mapping (Menu Friction)
  const modalOpenMap = new Map<string, number>();
  (eventAggregates.modalOpenCounts || []).forEach(item => {
    modalOpenMap.set(item._id, item.count);
  });

  const menuFriction = menuItems.map(item => {
    const itemIdStr = item._id.toString();
    const modalOpens = modalOpenMap.get(itemIdStr) || 0;
    const salesObj = itemSalesList.find(s => s.name === item.name);
    const conversions = salesObj ? salesObj.quantity : 0;
    const rate = modalOpens > 0 ? (conversions / modalOpens) * 100 : 0;
    const flagReview = modalOpens >= 10 && rate < 15;

    return {
      itemId: itemIdStr,
      name: item.name,
      modalOpens,
      conversions,
      conversionRate: rate,
      flagReview,
    };
  }).filter(f => f.modalOpens > 0)
    .sort((a, b) => b.modalOpens - a.modalOpens);

  const menuIntelligence = {
    bestSellersQty,
    bestSellersRev,
    worstSellers,
    frequentlyBoughtTogether: frequentlyBoughtTogether.slice(0, 10),
    menuFriction,
  };

  // 5. Customer Behavior
  const hasPhoneNumbers = (orderAggregates.customerPhones || []).length > 0;
  let newVsRepeat = null;

  if (hasPhoneNumbers && customersByPhone.length > 0) {
    const repeatPhones = new Set(customersByPhone.filter(c => c.totalOrders >= 2).map(c => c.phone.trim()));

    let newOrdersCount = 0;
    let repeatOrdersCount = 0;
    let repeatCustomersCount = 0;
    let newCustomersCount = 0;

    (orderAggregates.customerPhones || []).forEach(item => {
      const phone = item._id.trim();
      const isRepeat = repeatPhones.has(phone);
      if (isRepeat) {
        repeatOrdersCount += item.orderCount;
        repeatCustomersCount++;
      } else {
        newOrdersCount += item.orderCount;
        newCustomersCount++;
      }
    });

    newVsRepeat = {
      newCustomers: newCustomersCount,
      repeatCustomers: repeatCustomersCount,
      newOrdersCount,
      repeatOrdersCount,
    };
  }

  const cartsStarted = eventAggregates.cartsStarted[0]?.count || 0;
  const abandonmentRate = cartsStarted > 0 ? Math.max(0, ((cartsStarted - totalOrders) / cartsStarted) * 100) : 0;

  const customerBehavior = {
    hasPhoneNumbers,
    newVsRepeat,
    cartAbandonment: {
      cartsStarted,
      ordersCompleted: totalOrders,
      abandonmentRate,
    },
    avgPartySizeProxy: averageItemsPerOrder,
  };

  // 6. Operational Signals
  const spiceDistribution = { mild: 0, medium: 0, hot: 0 };
  itemSalesList.forEach(item => {
    const menuItem = menuItemsMap.get(item.name);
    const level = menuItem ? menuItem.spiceLevel : 0;
    if (level <= 1) {
      spiceDistribution.mild += item.quantity;
    } else if (level === 2) {
      spiceDistribution.medium += item.quantity;
    } else {
      spiceDistribution.hot += item.quantity;
    }
  });

  const allergenFrequency: Record<string, number> = {
    nuts: 0,
    dairy: 0,
    egg: 0,
    gluten: 0,
    soy: 0,
    shellfish: 0,
    fish: 0,
    sesame: 0,
  };

  const itemAllergenMap = new Map<string, string[]>();
  for (const item of menuItems) {
    itemAllergenMap.set(item.name, getItemAllergens(item.ingredients));
  }

  itemSalesList.forEach(item => {
    const allergens = itemAllergenMap.get(item.name) || [];
    for (const allergen of allergens) {
      if (allergenFrequency[allergen] !== undefined) {
        allergenFrequency[allergen] += item.quantity;
      }
    }
  });

  const operationalSignals = {
    spiceDistribution,
    allergenFrequency,
  };

  // 7. Calculate 3-Day Sales & Payment Split Summary (Today, Yesterday, 2 Days Ago)
  const threeDaySource = (threeDayAggregation && threeDayAggregation.length > 0)
    ? threeDayAggregation
    : (orderAggregates.dailyPaymentSplit || []);

  const threeDayMap = new Map<string, { cashRev: number; cashCount: number; onlineRev: number; onlineCount: number; creditRev: number; creditCount: number }>();
  threeDaySource.forEach((item: any) => {
    const date = item._id?.dateStr;
    const mode = (item._id?.paymentMode || 'cash').toLowerCase();
    if (!date) return;

    if (!threeDayMap.has(date)) {
      threeDayMap.set(date, { cashRev: 0, cashCount: 0, onlineRev: 0, onlineCount: 0, creditRev: 0, creditCount: 0 });
    }
    const entry = threeDayMap.get(date)!;
    if (mode === 'online') {
      entry.onlineRev += item.revenue || 0;
      entry.onlineCount += item.count || 0;
    } else if (mode === 'credit') {
      entry.creditRev += item.revenue || 0;
      entry.creditCount += item.count || 0;
    } else {
      entry.cashRev += item.revenue || 0;
      entry.cashCount += item.count || 0;
    }
  });

  const now = new Date();
  const formatUtcDate = (d: Date) => d.toISOString().split('T')[0];

  const todayStr = formatUtcDate(now);
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = formatUtcDate(yesterdayDate);
  const twoDaysAgoDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const twoDaysAgoStr = formatUtcDate(twoDaysAgoDate);

  const sortedAvailableDates = Array.from(threeDayMap.keys()).sort((a, b) => b.localeCompare(a));
  const hasCurrentDates = threeDayMap.has(todayStr) || threeDayMap.has(yesterdayStr);

  const targetDate1 = hasCurrentDates || sortedAvailableDates.length === 0 ? todayStr : (sortedAvailableDates[0] || todayStr);
  const targetDate2 = hasCurrentDates || sortedAvailableDates.length < 2 ? yesterdayStr : (sortedAvailableDates[1] || yesterdayStr);
  const targetDate3 = hasCurrentDates || sortedAvailableDates.length < 3 ? twoDaysAgoStr : (sortedAvailableDates[2] || twoDaysAgoStr);

  const getDayDetail = (dateStr: string, label: string): DayPaymentDetail => {
    const data = threeDayMap.get(dateStr) || { cashRev: 0, cashCount: 0, onlineRev: 0, onlineCount: 0, creditRev: 0, creditCount: 0 };
    const dayTotalRev = data.cashRev + data.onlineRev + data.creditRev;
    const dayTotalOrders = data.cashCount + data.onlineCount + data.creditCount;
    const cashPercent = dayTotalRev > 0 ? (data.cashRev / dayTotalRev) * 100 : 0;
    const onlinePercent = dayTotalRev > 0 ? (data.onlineRev / dayTotalRev) * 100 : 0;
    const creditPercent = dayTotalRev > 0 ? (data.creditRev / dayTotalRev) * 100 : 0;
    const dayAov = dayTotalOrders > 0 ? dayTotalRev / dayTotalOrders : 0;

    return {
      date: dateStr,
      label,
      totalRevenue: dayTotalRev,
      totalOrders: dayTotalOrders,
      cashRevenue: data.cashRev,
      cashOrders: data.cashCount,
      cashPercent,
      onlineRevenue: data.onlineRev,
      onlineOrders: data.onlineCount,
      onlinePercent,
      creditRevenue: data.creditRev,
      creditOrders: data.creditCount,
      creditPercent,
      aov: dayAov,
    };
  };

  const day1 = getDayDetail(targetDate1, 'Today');
  const day2 = getDayDetail(targetDate2, 'Yesterday');
  const day3 = getDayDetail(targetDate3, '2 Days Ago');

  const cumCashRev = day1.cashRevenue + day2.cashRevenue + day3.cashRevenue;
  const cumOnlineRev = day1.onlineRevenue + day2.onlineRevenue + day3.onlineRevenue;
  const cumCreditRev = (day1.creditRevenue || 0) + (day2.creditRevenue || 0) + (day3.creditRevenue || 0);
  const cumTotalRev = cumCashRev + cumOnlineRev + cumCreditRev;
  const cumCashOrders = day1.cashOrders + day2.cashOrders + day3.cashOrders;
  const cumOnlineOrders = day1.onlineOrders + day2.onlineOrders + day3.onlineOrders;
  const cumCreditOrders = (day1.creditOrders || 0) + (day2.creditOrders || 0) + (day3.creditOrders || 0);
  const cumTotalOrders = cumCashOrders + cumOnlineOrders + cumCreditOrders;

  const revenueGrowthVsYesterday = day2.totalRevenue > 0
    ? ((day1.totalRevenue - day2.totalRevenue) / day2.totalRevenue) * 100
    : (day1.totalRevenue > 0 ? 100 : 0);

  const ordersGrowthVsYesterday = day2.totalOrders > 0
    ? ((day1.totalOrders - day2.totalOrders) / day2.totalOrders) * 100
    : (day1.totalOrders > 0 ? 100 : 0);

  const threeDaySummary: ThreeDaySalesSummary = {
    day1,
    day2,
    day3,
    cumulative: {
      totalRevenue: cumTotalRev,
      totalOrders: cumTotalOrders,
      cashRevenue: cumCashRev,
      cashOrders: cumCashOrders,
      cashPercent: cumTotalRev > 0 ? (cumCashRev / cumTotalRev) * 100 : 0,
      onlineRevenue: cumOnlineRev,
      onlineOrders: cumOnlineOrders,
      onlinePercent: cumTotalRev > 0 ? (cumOnlineRev / cumTotalRev) * 100 : 0,
      creditRevenue: cumCreditRev,
      creditOrders: cumCreditOrders,
      creditPercent: cumTotalRev > 0 ? (cumCreditRev / cumTotalRev) * 100 : 0,
      aov: cumTotalOrders > 0 ? cumTotalRev / cumTotalOrders : 0,
    },
    comparison: {
      revenueGrowthVsYesterday,
      ordersGrowthVsYesterday,
    },
  };

  // 8. Payment Split (Cash vs Online vs Credit) for selected date range
  let splitCashRev = 0;
  let splitCashCount = 0;
  let splitOnlineRev = 0;
  let splitOnlineCount = 0;
  let splitCreditRev = 0;
  let splitCreditCount = 0;

  (orderAggregates.paymentSplit || []).forEach((item: any) => {
    const mode = (item._id || 'cash').toLowerCase();
    if (mode === 'online') {
      splitOnlineRev += item.revenue || 0;
      splitOnlineCount += item.count || 0;
    } else if (mode === 'credit') {
      splitCreditRev += item.revenue || 0;
      splitCreditCount += item.count || 0;
    } else {
      splitCashRev += item.revenue || 0;
      splitCashCount += item.count || 0;
    }
  });

  // If orderAggregates.paymentSplit was empty, fallback
  if (splitCashRev === 0 && splitOnlineRev === 0 && splitCreditRev === 0 && (orderAggregates.dailyPaymentSplit || []).length > 0) {
    (orderAggregates.dailyPaymentSplit || []).forEach((item: any) => {
      const mode = (item._id?.paymentMode || 'cash').toLowerCase();
      if (mode === 'online') {
        splitOnlineRev += item.revenue || 0;
        splitOnlineCount += item.count || 0;
      } else if (mode === 'credit') {
        splitCreditRev += item.revenue || 0;
        splitCreditCount += item.count || 0;
      } else {
        splitCashRev += item.revenue || 0;
        splitCashCount += item.count || 0;
      }
    });
  } else if (splitCashRev === 0 && splitOnlineRev === 0 && splitCreditRev === 0 && (ordersTableRaw || []).length > 0) {
    (ordersTableRaw || []).forEach((order: any) => {
      if (order.status === 'cancelled') return;
      const mode = (order.paymentMode || 'cash').toLowerCase();
      if (mode === 'online') {
        splitOnlineRev += order.total || 0;
        splitOnlineCount += 1;
      } else if (mode === 'credit') {
        splitCreditRev += order.total || 0;
        splitCreditCount += 1;
      } else {
        splitCashRev += order.total || 0;
        splitCashCount += 1;
      }
    });
  }

  const totalSplitRev = splitCashRev + splitOnlineRev + splitCreditRev;
  const totalSplitOrders = splitCashCount + splitOnlineCount + splitCreditCount;

  const periodDailyMap = new Map<string, { cashRev: number; cashCount: number; onlineRev: number; onlineCount: number; creditRev: number; creditCount: number }>();
  (orderAggregates.dailyPaymentSplit || []).forEach((item: any) => {
    const date = item._id?.dateStr;
    const mode = (item._id?.paymentMode || 'cash').toLowerCase();
    if (!date) return;

    if (!periodDailyMap.has(date)) {
      periodDailyMap.set(date, { cashRev: 0, cashCount: 0, onlineRev: 0, onlineCount: 0, creditRev: 0, creditCount: 0 });
    }
    const entry = periodDailyMap.get(date)!;
    if (mode === 'online') {
      entry.onlineRev += item.revenue || 0;
      entry.onlineCount += item.count || 0;
    } else if (mode === 'credit') {
      entry.creditRev += item.revenue || 0;
      entry.creditCount += item.count || 0;
    } else {
      entry.cashRev += item.revenue || 0;
      entry.cashCount += item.count || 0;
    }
  });

  const dailyBreakdown = Array.from(periodDailyMap.entries())
    .map(([date, data]) => {
      const dayTotalRev = data.cashRev + data.onlineRev + data.creditRev;
      const dayTotalOrders = data.cashCount + data.onlineCount + data.creditCount;
      return {
        date,
        totalRevenue: dayTotalRev,
        totalOrders: dayTotalOrders,
        cashRevenue: data.cashRev,
        cashOrders: data.cashCount,
        onlineRevenue: data.onlineRev,
        onlineOrders: data.onlineCount,
        creditRevenue: data.creditRev,
        creditOrders: data.creditCount,
        cashPercent: dayTotalRev > 0 ? (data.cashRev / dayTotalRev) * 100 : 0,
        onlinePercent: dayTotalRev > 0 ? (data.onlineRev / dayTotalRev) * 100 : 0,
        creditPercent: dayTotalRev > 0 ? (data.creditRev / dayTotalRev) * 100 : 0,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const paymentSplit: PaymentSplitOverview = {
    totalRevenue: totalSplitRev,
    totalOrders: totalSplitOrders,
    cashRevenue: splitCashRev,
    cashOrders: splitCashCount,
    cashPercent: totalSplitRev > 0 ? (splitCashRev / totalSplitRev) * 100 : 0,
    onlineRevenue: splitOnlineRev,
    onlineOrders: splitOnlineCount,
    onlinePercent: totalSplitRev > 0 ? (splitOnlineRev / totalSplitRev) * 100 : 0,
    creditRevenue: splitCreditRev,
    creditOrders: splitCreditCount,
    creditPercent: totalSplitRev > 0 ? (splitCreditRev / totalSplitRev) * 100 : 0,
    dailyBreakdown,
  };

  // 9. Compute Multi-Period Growth Analysis (DoD, 2-Day, 3-Day, WoW, MoM, QoQ)
  const allHistoricalDays = new Map<string, { revenue: number; orders: number; cashRevenue: number; onlineRevenue: number }>();
  threeDaySource.forEach((item: any) => {
    const date = item._id?.dateStr;
    const mode = (item._id?.paymentMode || 'cash').toLowerCase();
    if (!date) return;
    if (!allHistoricalDays.has(date)) {
      allHistoricalDays.set(date, { revenue: 0, orders: 0, cashRevenue: 0, onlineRevenue: 0 });
    }
    const entry = allHistoricalDays.get(date)!;
    entry.revenue += item.revenue || 0;
    entry.orders += item.count || 0;
    if (mode === 'online') {
      entry.onlineRevenue += item.revenue || 0;
    } else {
      entry.cashRevenue += item.revenue || 0;
    }
  });

  const getDayOffsetStr = (base: Date, daysAgo: number) => {
    const d = new Date(base.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return toOperationalDateStr(d);
  };

  // Determine base date (today or latest available date in dataset)
  let growthBaseDate = now;
  const sortedHistoryDates = Array.from(allHistoricalDays.keys()).sort((a, b) => b.localeCompare(a));
  if (!allHistoricalDays.has(todayStr) && sortedHistoryDates.length > 0) {
    growthBaseDate = new Date(sortedHistoryDates[0] + 'T12:00:00+05:30');
  }

  const helperPeriodMetrics = (dates: string[], label: string): PeriodMetrics => {
    let rev = 0;
    let ord = 0;
    dates.forEach(d => {
      const entry = allHistoricalDays.get(d);
      if (entry) {
        rev += entry.revenue;
        ord += entry.orders;
      }
    });
    const aov = ord > 0 ? rev / ord : 0;
    return {
      label,
      startDate: dates[dates.length - 1] || '',
      endDate: dates[0] || '',
      revenue: rev,
      orders: ord,
      aov,
    };
  };

  const helperGrowthComparison = (current: PeriodMetrics, previous: PeriodMetrics): GrowthComparison => {
    const revenueGrowthPercent = previous.revenue > 0
      ? ((current.revenue - previous.revenue) / previous.revenue) * 100
      : (current.revenue > 0 ? 100 : 0);

    const ordersGrowthPercent = previous.orders > 0
      ? ((current.orders - previous.orders) / previous.orders) * 100
      : (current.orders > 0 ? 100 : 0);

    const aovGrowthPercent = previous.aov > 0
      ? ((current.aov - previous.aov) / previous.aov) * 100
      : (current.aov > 0 ? 100 : 0);

    const revenueDelta = current.revenue - previous.revenue;
    const ordersDelta = current.orders - previous.orders;

    let status: 'growth' | 'decline' | 'stable' = 'stable';
    if (revenueGrowthPercent >= 2) status = 'growth';
    else if (revenueGrowthPercent <= -2) status = 'decline';

    return {
      current,
      previous,
      revenueGrowthPercent,
      ordersGrowthPercent,
      aovGrowthPercent,
      revenueDelta,
      ordersDelta,
      status,
    };
  };

  // 1. DoD: Daily (1D)
  const d0Str = getDayOffsetStr(growthBaseDate, 0);
  const d1Str = getDayOffsetStr(growthBaseDate, 1);
  const dodCurrent = helperPeriodMetrics([d0Str], 'Today');
  const dodPrevious = helperPeriodMetrics([d1Str], 'Yesterday');
  const dod = helperGrowthComparison(dodCurrent, dodPrevious);

  // 2. 2-Day Pace (Days 0-1 vs Days 2-3)
  const twoDayCurrentDates = [getDayOffsetStr(growthBaseDate, 0), getDayOffsetStr(growthBaseDate, 1)];
  const twoDayPriorDates = [getDayOffsetStr(growthBaseDate, 2), getDayOffsetStr(growthBaseDate, 3)];
  const twoDayCurrent = helperPeriodMetrics(twoDayCurrentDates, 'Last 2 Days');
  const twoDayPrevious = helperPeriodMetrics(twoDayPriorDates, 'Prior 2 Days');
  const twoDay = helperGrowthComparison(twoDayCurrent, twoDayPrevious);

  // 3. 3-Day Cycle (Days 0-2 vs Days 3-5)
  const threeDayCurrentDates = [getDayOffsetStr(growthBaseDate, 0), getDayOffsetStr(growthBaseDate, 1), getDayOffsetStr(growthBaseDate, 2)];
  const threeDayPriorDates = [getDayOffsetStr(growthBaseDate, 3), getDayOffsetStr(growthBaseDate, 4), getDayOffsetStr(growthBaseDate, 5)];
  const threeDayCurrent = helperPeriodMetrics(threeDayCurrentDates, 'Last 3 Days');
  const threeDayPrevious = helperPeriodMetrics(threeDayPriorDates, 'Prior 3 Days');
  const threeDay = helperGrowthComparison(threeDayCurrent, threeDayPrevious);

  // 4. WoW: Weekly 7-Day Cycle (Days 0-6 vs Days 7-13)
  const current7Dates: string[] = [];
  for (let i = 0; i < 7; i++) current7Dates.push(getDayOffsetStr(growthBaseDate, i));

  const prior7Dates: string[] = [];
  for (let i = 7; i < 14; i++) prior7Dates.push(getDayOffsetStr(growthBaseDate, i));

  const wowCurrent = helperPeriodMetrics(current7Dates, 'Last 7 Days');
  const wowPrevious = helperPeriodMetrics(prior7Dates, 'Prior 7 Days');
  const wow = helperGrowthComparison(wowCurrent, wowPrevious);

  // 5. MoM: Monthly 30-Day Cycle (Days 0-29 vs Days 30-59)
  const current30Dates: string[] = [];
  for (let i = 0; i < 30; i++) current30Dates.push(getDayOffsetStr(growthBaseDate, i));

  const prior30Dates: string[] = [];
  for (let i = 30; i < 60; i++) prior30Dates.push(getDayOffsetStr(growthBaseDate, i));

  const momCurrent = helperPeriodMetrics(current30Dates, 'Last 30 Days');
  const momPrevious = helperPeriodMetrics(prior30Dates, 'Prior 30 Days');
  const mom = helperGrowthComparison(momCurrent, momPrevious);

  // 6. QoQ: Quarterly 90-Day Velocity (Days 0-89 vs Days 90-179)
  const current90Dates: string[] = [];
  for (let i = 0; i < 90; i++) current90Dates.push(getDayOffsetStr(growthBaseDate, i));

  const prior90Dates: string[] = [];
  for (let i = 90; i < 180; i++) prior90Dates.push(getDayOffsetStr(growthBaseDate, i));

  const quarterCurrent = helperPeriodMetrics(current90Dates, 'Last 90 Days');
  const quarterPrevious = helperPeriodMetrics(prior90Dates, 'Prior 90 Days');
  const quarter = helperGrowthComparison(quarterCurrent, quarterPrevious);

  // Day-of-week matching comparison (This Mon vs Last Mon, This Tue vs Last Tue, etc.)
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const wowDayBreakdown: DailyTrendComparison[] = [];
  for (let i = 6; i >= 0; i--) {
    const cDate = getDayOffsetStr(growthBaseDate, i);
    const pDate = getDayOffsetStr(growthBaseDate, i + 7);
    const cRev = allHistoricalDays.get(cDate)?.revenue || 0;
    const pRev = allHistoricalDays.get(pDate)?.revenue || 0;
    const growth = pRev > 0 ? ((cRev - pRev) / pRev) * 100 : (cRev > 0 ? 100 : 0);
    const parsedDate = new Date(cDate + 'T12:00:00Z');
    const dayName = shortDays[parsedDate.getUTCDay()] || '';

    wowDayBreakdown.push({
      dayName,
      currentDate: cDate,
      previousDate: pDate,
      currentRevenue: cRev,
      previousRevenue: pRev,
      growthPercent: growth,
    });
  }

  // Compile full sorted list of all historical day records
  const historicalDays: HistoricalDayRecord[] = Array.from(allHistoricalDays.entries())
    .map(([date, d]) => {
      const parsed = new Date(date + 'T12:00:00Z');
      const dayName = shortDays[parsed.getUTCDay()] || '';
      return {
        date,
        dayName,
        revenue: d.revenue,
        orders: d.orders,
        aov: d.orders > 0 ? d.revenue / d.orders : 0,
        cashRevenue: d.cashRevenue,
        onlineRevenue: d.onlineRevenue,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  // Default executive diagnosis (defaults to WoW, falling back to MoM or DoD)
  const defaultGrowth = wow.previous.revenue > 0 || wow.current.revenue > 0
    ? wow
    : (mom.previous.revenue > 0 || mom.current.revenue > 0 ? mom : dod);
  const defaultLabel = wow.previous.revenue > 0 || wow.current.revenue > 0
    ? 'Week-on-Week'
    : (mom.previous.revenue > 0 || mom.current.revenue > 0 ? 'Month-on-Month' : 'Day-on-Day');

  const diagnosis = generateGrowthDiagnosis(defaultGrowth, defaultLabel);

  const growthAnalysis: BusinessGrowthAnalysis = {
    dod,
    twoDay,
    threeDay,
    wow,
    mom,
    quarter,
    wowDayBreakdown,
    historicalDays,
    diagnosis,
  };

  return {
    ordersCount: totalOrders,
    revenue: totalRevenue,
    aov: averageOrderValue,
    itemsPerOrder: averageItemsPerOrder,
    upsellRevenue: upsellRevenue,
    pendingOrders: pendingOrdersCount,
    customers: totalCustomersCount,
    threeDaySummary,
    paymentSplit,
    growthAnalysis,
    dayHourHeatmap,
    bestDays,
    bestTimeOfDay,
    trends,
    ordersTable,
    upsellPerformance,
    menuIntelligence,
    customerBehavior,
    operationalSignals,
  };
}
