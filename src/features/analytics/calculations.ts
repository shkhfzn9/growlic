import { IOrder } from '@/features/order/types';
import { IEvent } from './types';
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
  orders: IOrder[];
  events: IEvent[];
  menuItems: IMenuItem[];
  pairingRules: IPairingRule[];
  comboRules: IComboRule[];
  discountTiers: IDiscountTier[];
  pendingOrdersCount: number;
  totalCustomersCount: number;
  customersByPhone: ICustomer[];
}) {
  const {
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
    customersByPhone
  } = params;

  const menuItemsMap = new Map(menuItems.map(item => [item.name, item]));
  const menuItemsIdMap = new Map(menuItems.map(item => [item._id, item]));

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

  let totalRevenue = 0;
  let totalOrders = 0;
  let totalItemsCount = 0;

  for (const order of orders) {
    const date = new Date(order.createdAt!);
    const day = date.getDay();
    const hour = date.getHours();

    dayHourHeatmap[day][hour]++;

    if (order.status !== 'cancelled') {
      totalOrders++;
      totalRevenue += order.total;
      totalItemsCount += order.items.reduce((sum, item) => sum + item.quantity, 0);

      bestDaysMap[day].totalOrders++;
      bestDaysMap[day].totalRevenue += order.total;

      const period = periods.find(p => p.hours.includes(hour));
      if (period) {
        period.orders++;
        period.revenue += order.total;
      }
    }
  }

  const bestDays = [...bestDaysMap].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const bestTimeOfDay = periods
    .map(p => ({ period: p.name, label: p.label, orders: p.orders, revenue: p.revenue }))
    .sort((a, b) => b.orders - a.orders);

  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const averageItemsPerOrder = totalOrders > 0 ? totalItemsCount / totalOrders : 0;

  // 2. Revenue Trends
  const trendsMap: Record<string, { date: string; revenue: number; orders: number; itemsCount: number }> = {};
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dStr = currentDate.toISOString().split('T')[0];
    trendsMap[dStr] = { date: dStr, revenue: 0, orders: 0, itemsCount: 0 };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const dStr = new Date(order.createdAt!).toISOString().split('T')[0];
    if (!trendsMap[dStr]) {
      trendsMap[dStr] = { date: dStr, revenue: 0, orders: 0, itemsCount: 0 };
    }
    trendsMap[dStr].revenue += order.total;
    trendsMap[dStr].orders++;
    trendsMap[dStr].itemsCount += order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

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
  const ordersTable = orders.map(order => {
    const itemsSummary = order.items.map(item => `${item.name} x${item.quantity}`).join(', ');
    const discountApplied = Math.max(0, order.subtotal - order.total);
    const upsellAccepted = order.items.some(item => item.originatedFromNudge);
    return {
      _id: order._id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      subtotal: order.subtotal,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      discountApplied,
      upsellAccepted,
      itemsSummary,
      tableId: order.tableId,
    };
  });

  // 3. Upsell Engine Performance
  const nudgeShownCounts = { cross_sell: 0, threshold_discount: 0, combo_freebie: 0 };
  for (const ev of events) {
    if (ev.type === 'nudge_show') {
      const nt = ev.nudgeType;
      if (nt === 'cross_sell' || nt === 'threshold_discount' || nt === 'combo_freebie') {
        nudgeShownCounts[nt as 'cross_sell' | 'threshold_discount' | 'combo_freebie']++;
      }
    }
  }

  const nudgeAcceptedCounts = { cross_sell: 0, threshold_discount: 0, combo_freebie: 0 };
  let upsellAttributedRevenue = 0;

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    for (const item of order.items) {
      if (item.originatedFromNudge && item.nudgeType) {
        const nt = item.nudgeType;
        if (nt === 'cross_sell' || nt === 'threshold_discount' || nt === 'combo_freebie') {
          nudgeAcceptedCounts[nt as 'cross_sell' | 'threshold_discount' | 'combo_freebie']++;
          upsellAttributedRevenue += item.price * item.quantity;
        }
      }
    }
  }

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
    attributedRevenue: upsellAttributedRevenue,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    topRules: [] as any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    discountTierAchievement: [] as any[],
    avgOrderValueNoTier: 0,
  };

  const ruleMap = new Map<string, { description: string; type: 'pairing' | 'combo' }>();
  
  for (const rule of pairingRules) {
    ruleMap.set(rule._id, {
      description: `Pairing Rule: Category ${rule.triggerCategory} ➔ ${rule.suggestCategories.join(', ')}`,
      type: 'pairing',
    });
  }
  for (const rule of comboRules) {
    ruleMap.set(rule._id, {
      description: `Combo Rule: ${rule.customerMessage}`,
      type: 'combo',
    });
  }

  const ruleStats: Record<string, { triggers: number; conversions: number; revenue: number }> = {};
  for (const ev of events) {
    if (ev.type === 'nudge_show' && ev.itemId) {
      const ruleId = ev.itemId;
      if (!ruleStats[ruleId]) {
        ruleStats[ruleId] = { triggers: 0, conversions: 0, revenue: 0 };
      }
      ruleStats[ruleId].triggers++;
    }
  }

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    for (const item of order.items) {
      if (item.originatedFromNudge && item.nudgeRuleId) {
        const ruleId = item.nudgeRuleId;
        if (!ruleStats[ruleId]) {
          ruleStats[ruleId] = { triggers: 0, conversions: 0, revenue: 0 };
        }
        ruleStats[ruleId].conversions++;
        ruleStats[ruleId].revenue += item.price * item.quantity;
      }
    }
  }

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

  // Discount Tiers achievement rates
  upsellPerformance.discountTierAchievement = discountTiers.map((tier) => {
    const reachedOrders = orders.filter(o => o.status !== 'cancelled' && o.subtotal >= tier.minSpend);
    const count = reachedOrders.length;
    const avgAov = count > 0 ? reachedOrders.reduce((sum, o) => sum + o.total, 0) / count : 0;
    return {
      tierId: tier._id,
      minSpend: tier.minSpend,
      percentOff: tier.percentOff,
      ordersReached: count,
      percentReached: totalOrders > 0 ? (count / totalOrders) * 100 : 0,
      avgOrderValueReached: avgAov,
    };
  });

  const ordersNoTier = orders.filter(o => {
    if (o.status === 'cancelled') return false;
    const lowestMin = discountTiers.length > 0 ? discountTiers[0].minSpend : 0;
    return o.subtotal < lowestMin;
  });
  upsellPerformance.avgOrderValueNoTier = ordersNoTier.length > 0
    ? ordersNoTier.reduce((sum, o) => sum + o.total, 0) / ordersNoTier.length
    : 0;

  // 4. Menu Intelligence
  const itemSales: Record<string, { itemId: string; name: string; quantity: number; revenue: number }> = {};
  for (const item of menuItems) {
    itemSales[item.name] = {
      itemId: item._id,
      name: item.name,
      quantity: 0,
      revenue: 0,
    };
  }

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    for (const item of order.items) {
      if (!itemSales[item.name]) {
        itemSales[item.name] = {
          itemId: item.menuItemId || '',
          name: item.name,
          quantity: 0,
          revenue: 0,
        };
      }
      itemSales[item.name].quantity += item.quantity;
      itemSales[item.name].revenue += item.price * item.quantity;
    }
  }

  const salesList = Object.values(itemSales);
  const bestSellersQty = [...salesList].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  const bestSellersRev = [...salesList].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const worstSellers = [...salesList]
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 10)
    .map(item => ({
      ...item,
      flagReview: item.quantity === 0,
    }));

  // Computed co-occurrence pairs from real order data
  const itemCountMap: Record<string, number> = {};
  const coOccurrenceMap: Record<string, Record<string, number>> = {};
  const completedOrders = orders.filter(o => o.status === 'completed');

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

  const frequentlyBoughtTogether: Array<{
    itemA: string;
    itemB: string;
    coOccurrenceCount: number;
    confidence: number;
    matchingManualRule: boolean;
  }> = [];

  const minCoCount = completedOrders.length >= 50 ? 5 : 2;

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

  // Modal views vs add-to-cart conversion (Menu Friction)
  const modalOpenCounts: Record<string, number> = {};
  for (const ev of events) {
    if (ev.type === 'nudge_show' && ev.itemId) {
      const ruleId = ev.itemId;
      const ruleInfo = ruleMap.get(ruleId);
      if (ruleInfo && ruleInfo.type === 'pairing') {
        // Find triggering categories or suggestions if needed, but wait!
        // In the legacy code, modal conversion checks modal_open type of events.
      }
    }
    if (ev.type === 'modal_open' && ev.itemId) {
      const menuItem = menuItemsIdMap.get(ev.itemId);
      if (menuItem) {
        modalOpenCounts[menuItem.name] = (modalOpenCounts[menuItem.name] || 0) + 1;
      }
    }
  }

  const menuFriction = menuItems.map(item => {
    const name = item.name;
    const modalOpens = modalOpenCounts[name] || 0;
    const salesObj = itemSales[name];
    const conversions = salesObj ? salesObj.quantity : 0;
    const rate = modalOpens > 0 ? (conversions / modalOpens) * 100 : 0;
    const flagReview = modalOpens >= 10 && rate < 15;

    return {
      itemId: item._id,
      name,
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
  const ordersWithPhone = orders.filter(o => o.customerPhone && o.customerPhone.trim().length > 5);
  const hasPhoneNumbers = ordersWithPhone.length > 0;
  let newVsRepeat = null;

  if (hasPhoneNumbers && customersByPhone.length > 0) {
    const repeatPhones = new Set(customersByPhone.filter(c => c.totalOrders >= 2).map(c => c.phone.trim()));

    let newOrdersCount = 0;
    let repeatOrdersCount = 0;

    for (const order of ordersWithPhone) {
      if (repeatPhones.has(order.customerPhone.trim())) {
        repeatOrdersCount++;
      } else {
        newOrdersCount++;
      }
    }

    const totalUniqueCustomers = Array.from(new Set(ordersWithPhone.map(o => o.customerPhone.trim()))).length;
    const repeatCustomersCount = repeatPhones.size;
    const newCustomersCount = Math.max(0, totalUniqueCustomers - repeatCustomersCount);

    newVsRepeat = {
      newCustomers: newCustomersCount,
      repeatCustomers: repeatCustomersCount,
      newOrdersCount,
      repeatOrdersCount,
    };
  }

  const cartsStarted = events.filter(e => e.type === 'cart_create').length;
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
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    for (const item of order.items) {
      const menuItem = menuItemsMap.get(item.name);
      const level = menuItem ? menuItem.spiceLevel : 0;
      if (level <= 1) {
        spiceDistribution.mild += item.quantity;
      } else if (level === 2) {
        spiceDistribution.medium += item.quantity;
      } else {
        spiceDistribution.hot += item.quantity;
      }
    }
  }

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

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    for (const item of order.items) {
      const allergens = itemAllergenMap.get(item.name) || [];
      for (const allergen of allergens) {
        if (allergenFrequency[allergen] !== undefined) {
          allergenFrequency[allergen] += item.quantity;
        }
      }
    }
  }

  const operationalSignals = {
    spiceDistribution,
    allergenFrequency,
  };

  return {
    ordersCount: totalOrders,
    revenue: totalRevenue,
    aov: averageOrderValue,
    itemsPerOrder: averageItemsPerOrder,
    upsellRevenue: upsellAttributedRevenue,
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
