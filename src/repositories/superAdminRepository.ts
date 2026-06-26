import dbConnect from '@/lib/mongodb';
import { Admin } from '@/features/auth/model';
import Order from '@/features/order/model';
import { Menu, ComboRule, DiscountTier, PairingRule } from '@/features/menu/model';

// Phase 2: restaurant detail functions go here

// Phase 3: customer and audit log functions go here

/**
 * Counts all registered restaurants and breaks them down by Active/Inactive status.
 */
export async function getRestaurantCounts(): Promise<{ total: number; active: number; inactive: number }> {
  await dbConnect();
  
  const results = await Admin.aggregate([
    { $match: { role: { $ne: 'super_admin' } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ['$active', true] }, 1, 0] }
        },
        inactive: {
          $sum: { $cond: [{ $ne: ['$active', true] }, 1, 0] }
        }
      }
    }
  ]);

  if (results.length === 0) {
    return { total: 0, active: 0, inactive: 0 };
  }

  return {
    total: results[0].total || 0,
    active: results[0].active || 0,
    inactive: results[0].inactive || 0
  };
}

/**
 * Aggregates order volume (Total Orders, GMV, and AOV) across all restaurants in a given date range.
 */
export async function getPlatformOrderStats(startDate: Date, endDate: Date): Promise<{ ordersCount: number; gmv: number; aov: number }> {
  await dbConnect();

  const results = await Order.aggregate([
    {
      $match: {
        status: { $ne: 'cancelled' },
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        ordersCount: { $sum: 1 },
        gmv: { $sum: '$total' }
      }
    }
  ]);

  if (results.length === 0) {
    return { ordersCount: 0, gmv: 0, aov: 0 };
  }

  const ordersCount = results[0].ordersCount || 0;
  const gmv = results[0].gmv || 0;
  const aov = ordersCount > 0 ? gmv / ordersCount : 0;

  return { ordersCount, gmv, aov };
}

/**
 * Aggregates daily order stats (GMV and Order count) for daily/weekly trend lines.
 */
export async function getDailyAovTrend(startDate: Date, endDate: Date): Promise<Array<{ date: string; gmv: number; ordersCount: number }>> {
  await dbConnect();

  const results = await Order.aggregate([
    {
      $match: {
        status: { $ne: 'cancelled' },
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        gmv: { $sum: '$total' },
        ordersCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return results.map((r) => ({
    date: r._id,
    gmv: r.gmv || 0,
    ordersCount: r.ordersCount || 0
  }));
}

/**
 * Aggregates and retrieves setup completion checklists for all registered restaurants.
 */
export async function getRestaurantChecklists(startDate: Date, endDate: Date): Promise<any[]> {
  await dbConnect();

  // Run all aggregations in parallel to minimize DB roundtrips
  const [
    restaurantsList,
    menuStats,
    discountTiersCount,
    comboRulesCount,
    pairingRulesCount,
    orderStats
  ] = await Promise.all([
    // All restaurants
    Admin.find({ role: { $ne: 'super_admin' } }).select('restaurantId restaurantName active location phone email createdAt').lean(),

    // Menu item stats per restaurant
    Menu.aggregate([
      {
        $group: {
          _id: '$restaurantId',
          totalItems: { $sum: 1 },
          chefNotesCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$chefNote', null] },
                    { $ne: [{ $trim: { input: '$chefNote' } }, ''] }
                  ]
                },
                1,
                0
              ]
            }
          },
          spiceLevelCount: {
            $sum: {
              $cond: [
                { $gt: ['$spiceLevel', 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ]),

    // Active discount tiers per restaurant
    DiscountTier.aggregate([
      { $match: { active: true } },
      {
        $group: {
          _id: '$restaurantId',
          activeCount: { $sum: 1 }
        }
      }
    ]),

    // Active combo rules per restaurant
    ComboRule.aggregate([
      { $match: { active: true } },
      {
        $group: {
          _id: '$restaurantId',
          activeCount: { $sum: 1 }
        }
      }
    ]),

    // Active pairing rules per restaurant
    PairingRule.aggregate([
      { $match: { active: true } },
      {
        $group: {
          _id: '$restaurantId',
          activeCount: { $sum: 1 }
        }
      }
    ]),

    // Order statistics facet: overall completion + selected period metrics
    Order.aggregate([
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: '$restaurantId',
                completedCount: {
                  $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                lastOrderDate: { $max: '$createdAt' }
              }
            }
          ],
          inPeriod: [
            {
              $match: {
                status: { $ne: 'cancelled' },
                createdAt: { $gte: startDate, $lte: endDate }
              }
            },
            {
              $group: {
                _id: '$restaurantId',
                totalOrders: { $sum: 1 },
                gmv: { $sum: '$total' }
              }
            }
          ]
        }
      }
    ])
  ]);

  // Map aggregates into maps for instant lookup
  const menuMap = new Map<string, any>(menuStats.map(m => [m._id.toLowerCase(), m]));
  const discountMap = new Map<string, number>(discountTiersCount.map(d => [d._id.toLowerCase(), d.activeCount]));
  const comboMap = new Map<string, number>(comboRulesCount.map(c => [c._id.toLowerCase(), c.activeCount]));
  const pairingMap = new Map<string, number>(pairingRulesCount.map(p => [p._id.toLowerCase(), p.activeCount]));

  const orderFacet = orderStats[0] || { overall: [], inPeriod: [] };
  const overallOrderMap = new Map<string, any>(orderFacet.overall.map((o: any) => [o._id.toLowerCase(), o]));
  const periodOrderMap = new Map<string, any>(orderFacet.inPeriod.map((o: any) => [o._id.toLowerCase(), o]));

  // Combine data for each restaurant
  return restaurantsList.map((r: any) => {
    const rId = r.restaurantId.toLowerCase();

    const m = menuMap.get(rId) || { totalItems: 0, chefNotesCount: 0, spiceLevelCount: 0 };
    const dt = discountMap.get(rId) || 0;
    const cr = comboMap.get(rId) || 0;
    const pr = pairingMap.get(rId) || 0;

    const overallO = overallOrderMap.get(rId) || { completedCount: 0, lastOrderDate: null };
    const periodO = periodOrderMap.get(rId) || { totalOrders: 0, gmv: 0 };

    return {
      restaurantId: r.restaurantId,
      restaurantName: r.restaurantName,
      active: r.active,
      location: r.location || 'Tokyo',
      createdAt: r.createdAt,
      // Checkpoints metrics
      menuItemsCount: m.totalItems,
      chefNotesCount: m.chefNotesCount,
      spiceLevelCount: m.spiceLevelCount,
      activeDiscountTiers: dt,
      activeComboRules: cr,
      activePairingRules: pr,
      completedOrdersCount: overallO.completedCount,
      lastOrderDate: overallO.lastOrderDate,
      // Date range period metrics
      periodOrdersCount: periodO.totalOrders,
      periodGmv: periodO.gmv,
    };
  });
}
