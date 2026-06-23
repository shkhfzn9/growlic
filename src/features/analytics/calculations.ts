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
  };
  recentCompletedOrders: Array<{ items: Array<{ name: string }> }>;
  ordersTableRaw: any[];
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
  const trendsMap: Record<string, { date: string; revenue: number; orders: number; itemsCount: number }> = {};
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dStr = currentDate.toISOString().split('T')[0];
    trendsMap[dStr] = { date: dStr, revenue: 0, orders: 0, itemsCount: 0 };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  (orderAggregates.trends || []).forEach(item => {
    const dStr = item._id;
    if (trendsMap[dStr]) {
      trendsMap[dStr].revenue = item.revenue;
      trendsMap[dStr].orders = item.orders;
      trendsMap[dStr].itemsCount = item.itemsCount;
    }
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

  return {
    ordersCount: totalOrders,
    revenue: totalRevenue,
    aov: averageOrderValue,
    itemsPerOrder: averageItemsPerOrder,
    upsellRevenue: upsellRevenue,
    pendingOrders: pendingOrdersCount,
    customers: totalCustomersCount,
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
