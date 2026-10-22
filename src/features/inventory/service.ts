import dbConnect from '@/lib/mongodb';
import Order from '@/features/order/model';
import Menu from '@/features/menu/model';
import { sanitizeTenantId } from '@/lib/tenant';
import {
  InventoryAnalyticsReport,
  InventoryTimePeriod,
  ItemSalesMetric,
  CategorySalesSummary,
  HourlySalesDistribution,
  TomorrowDemandForecast,
  BusinessSituationInsight,
} from './types';

/**
 * Returns Start and End Date boundaries for a chosen period.
 * Operates in IST (+05:30) offset for consistent Indian restaurant/business operations.
 */
function getDateBoundaries(
  period: InventoryTimePeriod,
  singleDateStr?: string
): { start: Date; end: Date; label: string; singleDateVal?: string } {
  const now = new Date();
  // Adjust to IST timezone representation
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);

  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth();
  const date = istNow.getUTCDate();

  const getDayStart = (y: number, m: number, d: number) => {
    // 00:00:00 in IST is (00:00:00 - 5.5h) in UTC
    return new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - istOffset);
  };

  const getDayEnd = (y: number, m: number, d: number) => {
    // 23:59:59.999 in IST
    return new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - istOffset);
  };

  switch (period) {
    case 'today': {
      return {
        start: getDayStart(year, month, date),
        end: getDayEnd(year, month, date),
        label: 'Today',
      };
    }

    case 'yesterday': {
      const yDate = new Date(Date.UTC(year, month, date - 1));
      return {
        start: getDayStart(yDate.getUTCFullYear(), yDate.getUTCMonth(), yDate.getUTCDate()),
        end: getDayEnd(yDate.getUTCFullYear(), yDate.getUTCMonth(), yDate.getUTCDate()),
        label: 'Yesterday',
      };
    }

    case 'tomorrow': {
      const tDate = new Date(Date.UTC(year, month, date + 1));
      return {
        start: getDayStart(tDate.getUTCFullYear(), tDate.getUTCMonth(), tDate.getUTCDate()),
        end: getDayEnd(tDate.getUTCFullYear(), tDate.getUTCMonth(), tDate.getUTCDate()),
        label: 'Tomorrow (Forecast & Bookings)',
      };
    }

    case 'week': {
      // Find Monday of current week
      const dayOfWeek = istNow.getUTCDay(); // 0 is Sun, 1 is Mon...
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const mondayDate = new Date(Date.UTC(year, month, date - daysFromMonday));

      return {
        start: getDayStart(mondayDate.getUTCFullYear(), mondayDate.getUTCMonth(), mondayDate.getUTCDate()),
        end: getDayEnd(year, month, date),
        label: 'This Week',
      };
    }

    case 'month': {
      return {
        start: getDayStart(year, month, 1),
        end: getDayEnd(year, month, date),
        label: 'This Month',
      };
    }

    case 'single_date': {
      if (!singleDateStr) {
        return {
          start: getDayStart(year, month, date),
          end: getDayEnd(year, month, date),
          label: 'Today',
          singleDateVal: istNow.toISOString().split('T')[0],
        };
      }

      // Format expected: "YYYY-MM-DD"
      const parts = singleDateStr.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const sYear = parts[0];
        const sMonth = parts[1] - 1;
        const sDate = parts[2];
        return {
          start: getDayStart(sYear, sMonth, sDate),
          end: getDayEnd(sYear, sMonth, sDate),
          label: `Date: ${singleDateStr}`,
          singleDateVal: singleDateStr,
        };
      }

      return {
        start: getDayStart(year, month, date),
        end: getDayEnd(year, month, date),
        label: 'Today',
        singleDateVal: istNow.toISOString().split('T')[0],
      };
    }

    default:
      return {
        start: getDayStart(year, month, date),
        end: getDayEnd(year, month, date),
        label: 'Today',
      };
  }
}

/**
 * High-performance computation of Inventory & Item Sales Analytics
 */
export async function getInventoryAnalytics(
  restaurantId: string,
  options: {
    period: InventoryTimePeriod;
    singleDate?: string;
  }
): Promise<InventoryAnalyticsReport> {
  await dbConnect();
  const cleanRestId = sanitizeTenantId(restaurantId);
  const { period, singleDate } = options;

  const { start, end, label: periodLabel, singleDateVal } = getDateBoundaries(period, singleDate);

  // Fetch catalog menu items concurrently with order analytics
  const [menuItemsDocs, orderAggregations, scheduledOrdersDocs] = await Promise.all([
    Menu.find({ restaurantId: cleanRestId }).lean(),

    Order.aggregate([
      {
        $match: {
          restaurantId: cleanRestId,
          createdAt: { $gte: start, $lte: end },
          status: { $nin: ['cancelled', 'rejected'] },
        },
      },
      {
        $facet: {
          overallStats: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalItemCount: { $sum: { $sum: '$items.quantity' } },
                totalItemRevenue: {
                  $sum: {
                    $reduce: {
                      input: '$items',
                      initialValue: 0,
                      in: { $add: ['$$value', { $multiply: ['$$this.price', '$$this.quantity'] }] },
                    },
                  },
                },
              },
            },
          ],
          itemBreakdown: [
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.name',
                menuItemId: { $first: '$items.menuItemId' },
                quantitySold: { $sum: '$items.quantity' },
                revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                orderFrequency: { $sum: 1 },
                avgPrice: { $avg: '$items.price' },
              },
            },
          ],
          hourlyDistribution: [
            { $unwind: '$items' },
            {
              $project: {
                hour: { $hour: { date: '$createdAt', timezone: '+05:30' } },
                quantity: '$items.quantity',
                revenue: { $multiply: ['$items.price', '$items.quantity'] },
              },
            },
            {
              $group: {
                _id: '$hour',
                quantitySold: { $sum: '$quantity' },
                revenue: { $sum: '$revenue' },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]),

    // For tomorrow forecast: find scheduled orders
    period === 'tomorrow'
      ? Order.find({
          restaurantId: cleanRestId,
          status: { $in: ['scheduled', 'accepted', 'received'] },
        }).lean()
      : Promise.resolve([]),
  ]);

  const facet = orderAggregations[0] || { overallStats: [], itemBreakdown: [], hourlyDistribution: [] };
  const overall = facet.overallStats[0] || { totalOrders: 0, totalItemCount: 0, totalItemRevenue: 0 };
  const rawItemSales = facet.itemBreakdown || [];
  const rawHourly = facet.hourlyDistribution || [];

  const totalQuantitySold = overall.totalItemCount || 0;
  const totalItemRevenue = overall.totalItemRevenue || 0;
  const totalOrdersCount = overall.totalOrders || 0;

  // Catalog item lookup map
  const catalogMap = new Map<string, any>();
  menuItemsDocs.forEach((doc: any) => {
    catalogMap.set(doc.name, doc);
    if (doc._id) {
      catalogMap.set(doc._id.toString(), doc);
    }
  });

  // Build merged items list (including items with 0 sales)
  const itemsMap = new Map<string, ItemSalesMetric>();

  rawItemSales.forEach((s: any) => {
    const catalogItem = catalogMap.get(s._id) || catalogMap.get(s.menuItemId);
    const price = catalogItem ? catalogItem.price : (s.avgPrice || 0);
    const category = catalogItem ? catalogItem.category : 'General';
    const image = catalogItem ? (catalogItem.image || (catalogItem.images && catalogItem.images[0])) : '';
    const available = catalogItem ? (catalogItem.available !== false) : true;
    const trackInventory = catalogItem?.trackInventory || false;
    const stockQuantity = catalogItem?.stockQuantity !== undefined ? catalogItem.stockQuantity : -1;
    const lowStockThreshold = catalogItem?.lowStockThreshold ?? 5;

    const volumeShare = totalQuantitySold > 0 ? (s.quantitySold / totalQuantitySold) * 100 : 0;
    const revenueShare = totalItemRevenue > 0 ? (s.revenue / totalItemRevenue) * 100 : 0;

    itemsMap.set(s._id, {
      itemId: s.menuItemId || (catalogItem ? catalogItem._id.toString() : s._id),
      name: s._id,
      category,
      price,
      image,
      quantitySold: s.quantitySold || 0,
      revenue: s.revenue || 0,
      revenueSharePercent: Math.round(revenueShare * 10) / 10,
      volumeSharePercent: Math.round(volumeShare * 10) / 10,
      orderFrequency: s.orderFrequency || 0,
      available,
      trackInventory,
      stockQuantity,
      lowStockThreshold,
      velocityStatus: 'moderate', // will reassign after sorting
      rank: 0,
      isTopSeller: false,
      isTopGrossing: false,
    });
  });

  // Add menu items with 0 sales
  menuItemsDocs.forEach((doc: any) => {
    if (!itemsMap.has(doc.name)) {
      itemsMap.set(doc.name, {
        itemId: doc._id.toString(),
        name: doc.name,
        category: doc.category || 'General',
        price: doc.price || 0,
        image: doc.image || (doc.images && doc.images[0]) || '',
        quantitySold: 0,
        revenue: 0,
        revenueSharePercent: 0,
        volumeSharePercent: 0,
        orderFrequency: 0,
        available: doc.available !== false,
        trackInventory: doc.trackInventory || false,
        stockQuantity: doc.stockQuantity !== undefined ? doc.stockQuantity : -1,
        lowStockThreshold: doc.lowStockThreshold ?? 5,
        velocityStatus: 'zero_sales',
        rank: 0,
        isTopSeller: false,
        isTopGrossing: false,
      });
    }
  });

  // Sort items: First by quantitySold desc, then revenue desc
  const sortedItems = Array.from(itemsMap.values()).sort((a, b) => {
    if (b.quantitySold !== a.quantitySold) {
      return b.quantitySold - a.quantitySold;
    }
    return b.revenue - a.revenue;
  });

  // Assign ranks & velocity statuses
  const highestQty = sortedItems.length > 0 ? sortedItems[0].quantitySold : 0;
  let topGrossingCandidate: ItemSalesMetric | null = null;
  let maxRevenueFound = -1;

  sortedItems.forEach((item, index) => {
    item.rank = index + 1;

    if (item.quantitySold === 0) {
      item.velocityStatus = 'zero_sales';
    } else if (highestQty > 0 && item.quantitySold >= Math.max(4, highestQty * 0.5)) {
      item.velocityStatus = 'fast_mover';
    } else if (item.quantitySold >= 2) {
      item.velocityStatus = 'moderate';
    } else {
      item.velocityStatus = 'slow_mover';
    }

    if (item.revenue > maxRevenueFound && item.revenue > 0) {
      maxRevenueFound = item.revenue;
      topGrossingCandidate = item;
    }
  });

  if (sortedItems.length > 0 && sortedItems[0].quantitySold > 0) {
    sortedItems[0].isTopSeller = true;
  }
  if (topGrossingCandidate) {
    (topGrossingCandidate as ItemSalesMetric).isTopGrossing = true;
  }

  // Categories aggregation
  const categoryMap = new Map<string, { quantity: number; revenue: number; count: number }>();
  sortedItems.forEach((item) => {
    const existing = categoryMap.get(item.category) || { quantity: 0, revenue: 0, count: 0 };
    existing.quantity += item.quantitySold;
    existing.revenue += item.revenue;
    existing.count += 1;
    categoryMap.set(item.category, existing);
  });

  const categories: CategorySalesSummary[] = Array.from(categoryMap.entries())
    .map(([catName, stats]) => ({
      category: catName,
      quantitySold: stats.quantity,
      revenue: stats.revenue,
      revenueSharePercent: totalItemRevenue > 0 ? Math.round((stats.revenue / totalItemRevenue) * 1000) / 10 : 0,
      volumeSharePercent: totalQuantitySold > 0 ? Math.round((stats.quantity / totalQuantitySold) * 1000) / 10 : 0,
      itemCount: stats.count,
    }))
    .sort((a, b) => b.quantitySold - a.quantitySold);

  // Hourly distribution: Populate all 24 hours (or operational hours 8 AM to 11 PM)
  const hourlyMap = new Map<number, { qty: number; rev: number }>();
  rawHourly.forEach((h: any) => {
    hourlyMap.set(h._id, { qty: h.quantitySold || 0, rev: h.revenue || 0 });
  });

  const hourlySales: HourlySalesDistribution[] = [];
  for (let hour = 8; hour <= 23; hour++) {
    const data = hourlyMap.get(hour) || { qty: 0, rev: 0 };
    const periodStr = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    hourlySales.push({
      hour,
      label: `${displayHour} ${periodStr}`,
      quantitySold: data.qty,
      revenue: data.rev,
    });
  }

  // Pareto 80/20 Analysis (Sorted by revenue)
  const itemsByRevenue = [...sortedItems].filter((i) => i.revenue > 0).sort((a, b) => b.revenue - a.revenue);
  let cumulativeRevenue = 0;
  let coreDriversCount = 0;
  for (const item of itemsByRevenue) {
    cumulativeRevenue += item.revenue;
    coreDriversCount++;
    if (totalItemRevenue > 0 && cumulativeRevenue >= totalItemRevenue * 0.8) {
      break;
    }
  }

  // Tomorrow Demand Forecast calculation (if period === 'tomorrow' or for proactive forecasting)
  let tomorrowForecast: TomorrowDemandForecast | undefined = undefined;
  if (period === 'tomorrow') {
    const istTomorrow = new Date(Date.now() + 5.5 * 3600 * 1000 + 24 * 3600 * 1000);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const tomorrowDayName = dayNames[istTomorrow.getUTCDay()];
    const tomorrowDateStr = istTomorrow.toISOString().split('T')[0];

    // Filter confirmed scheduled orders for tomorrow
    const scheduledForTomorrow = scheduledOrdersDocs.filter((ord: any) => {
      const bDate = ord.appointmentDetails?.bookingDate;
      return bDate === tomorrowDateStr;
    });

    let scheduledUnits = 0;
    let scheduledRev = 0;
    const scheduledBookings = scheduledForTomorrow.map((ord: any) => {
      const units = (ord.items || []).reduce((acc: number, it: any) => acc + (it.quantity || 1), 0);
      scheduledUnits += units;
      scheduledRev += (ord.total || 0);
      const itemsSummary = (ord.items || []).map((it: any) => `${it.quantity}x ${it.name}`).join(', ');
      return {
        orderId: ord._id.toString(),
        customerName: ord.customerName || 'Guest',
        time: ord.appointmentDetails?.bookingTime || 'Scheduled',
        itemsSummary,
        total: ord.total || 0,
      };
    });

    // Estimate projected velocity: Average volume of top items
    const topForecastItems = sortedItems.slice(0, 5).map((it) => {
      const expectedQty = Math.max(1, Math.round(it.quantitySold * 1.1) || 5);
      return {
        name: it.name,
        category: it.category,
        expectedQty,
        expectedRevenue: expectedQty * it.price,
      };
    });

    const projectedTotalUnits = topForecastItems.reduce((acc, it) => acc + it.expectedQty, 0) + scheduledUnits;
    const projectedTotalRevenue = topForecastItems.reduce((acc, it) => acc + it.expectedRevenue, 0) + scheduledRev;

    tomorrowForecast = {
      dayName: tomorrowDayName,
      dateStr: tomorrowDateStr,
      scheduledOrdersCount: scheduledForTomorrow.length,
      scheduledItemsCount: scheduledUnits,
      scheduledRevenue: scheduledRev,
      projectedTotalUnits,
      projectedTotalRevenue,
      topForecastItems,
      scheduledBookings,
    };
  }

  // Active items count vs zero sales
  const activeItemsSoldCount = sortedItems.filter((i) => i.quantitySold > 0).length;
  const totalCatalogItemsCount = sortedItems.length;
  const zeroSalesCount = sortedItems.filter((i) => i.quantitySold === 0).length;
  const fastMoversCount = sortedItems.filter((i) => i.velocityStatus === 'fast_mover').length;
  const moderateMoversCount = sortedItems.filter((i) => i.velocityStatus === 'moderate').length;
  const slowMoversCount = sortedItems.filter((i) => i.velocityStatus === 'slow_mover').length;

  const topSeller = sortedItems.length > 0 && sortedItems[0].quantitySold > 0 ? sortedItems[0] : null;
  const topGrosser = topGrossingCandidate ? (topGrossingCandidate as ItemSalesMetric) : null;

  // Strategic Business Insights
  const insights: BusinessSituationInsight[] = [];

  if (topSeller) {
    insights.push({
      type: 'success',
      title: `Top Performer: ${topSeller.name}`,
      description: `${topSeller.name} is your highest velocity item with ${topSeller.quantitySold} units sold, driving ₹${topSeller.revenue.toLocaleString('en-IN')} (${topSeller.revenueSharePercent}% of total sales). Ensure kitchen prep stations have adequate inventory.`,
      impactScore: topSeller.revenueSharePercent,
    });
  }

  if (categories.length > 0) {
    const topCat = categories[0];
    insights.push({
      type: 'info',
      title: `Dominant Category: ${topCat.category}`,
      description: `${topCat.category} leads all categories with ${topCat.quantitySold} units sold generating ₹${topCat.revenue.toLocaleString('en-IN')} (${topCat.revenueSharePercent}% revenue share).`,
    });
  }

  if (coreDriversCount > 0 && totalItemRevenue > 0) {
    insights.push({
      type: 'opportunity',
      title: `Pareto 80/20 Rule: ${coreDriversCount} Key Items Drive 80% Revenue`,
      description: `Just ${coreDriversCount} of your ${totalCatalogItemsCount} catalog items generate 80% of your business revenue. Prioritize ingredient freshness and availability for these core anchors.`,
    });
  }

  if (zeroSalesCount > 0) {
    insights.push({
      type: 'warning',
      title: `Dead Stock Alert: ${zeroSalesCount} Items with 0 Sales`,
      description: `${zeroSalesCount} items did not sell any units in this period. Consider pairing them in checkout combo nudges or testing an introductory 10% discount.`,
    });
  }

  return {
    period,
    periodLabel,
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    singleDate: singleDateVal,
    summary: {
      totalQuantitySold,
      totalItemRevenue,
      totalOrdersCount,
      avgBasketSize: totalOrdersCount > 0 ? Math.round((totalQuantitySold / totalOrdersCount) * 10) / 10 : 0,
      avgItemPrice: totalQuantitySold > 0 ? Math.round(totalItemRevenue / totalQuantitySold) : 0,
      activeItemsSoldCount,
      totalCatalogItemsCount,
      catalogActivePercent: totalCatalogItemsCount > 0 ? Math.round((activeItemsSoldCount / totalCatalogItemsCount) * 100) : 0,
      topSellingItem: topSeller
        ? {
            name: topSeller.name,
            category: topSeller.category,
            quantity: topSeller.quantitySold,
            revenue: topSeller.revenue,
            price: topSeller.price,
            volumeSharePercent: topSeller.volumeSharePercent,
          }
        : null,
      topGrossingItem: topGrosser
        ? {
            name: topGrosser.name,
            category: topGrosser.category,
            revenue: topGrosser.revenue,
            quantity: topGrosser.quantitySold,
            revenueSharePercent: topGrosser.revenueSharePercent,
          }
        : null,
      fastMoversCount,
      moderateMoversCount,
      slowMoversCount,
      zeroSalesCount,
    },
    items: sortedItems,
    categories,
    hourlySales,
    tomorrowForecast,
    insights,
    pareto: {
      coreDriversCount,
      coreDriversPercent: totalCatalogItemsCount > 0 ? Math.round((coreDriversCount / totalCatalogItemsCount) * 100) : 0,
      coreDriversRevenue: Math.round(totalItemRevenue * 0.8),
    },
  };
}

/**
 * Updates stock quantity for a menu item directly from the inventory dashboard
 */
export async function updateItemStock(
  restaurantId: string,
  itemId: string,
  stockQuantity: number,
  trackInventory?: boolean
) {
  await dbConnect();
  const cleanRestId = sanitizeTenantId(restaurantId);

  const updatePayload: any = { stockQuantity };
  if (trackInventory !== undefined) {
    updatePayload.trackInventory = trackInventory;
  }
  if (stockQuantity === 0) {
    updatePayload.available = false;
  } else if (stockQuantity > 0) {
    updatePayload.available = true;
  }

  const updated = await Menu.findOneAndUpdate(
    { _id: itemId, restaurantId: cleanRestId },
    { $set: updatePayload },
    { new: true }
  ).lean();

  return updated;
}

/**
 * Toggles an item's availability (In Stock / Out of Stock) instantly
 */
export async function toggleItemAvailability(
  restaurantId: string,
  itemId: string,
  available: boolean
) {
  await dbConnect();
  const cleanRestId = sanitizeTenantId(restaurantId);

  const updated = await Menu.findOneAndUpdate(
    { _id: itemId, restaurantId: cleanRestId },
    { $set: { available } },
    { new: true }
  ).lean();

  return updated;
}
