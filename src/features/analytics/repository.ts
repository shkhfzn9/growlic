import dbConnect from '@/lib/mongodb';
import * as orderRepo from '@/features/order/repository';
import * as menuItemRepo from '@/features/menu/repositories/menuRepository';
import * as pairingRuleRepo from '@/features/menu/repositories/pairingRuleRepository';
import * as comboRuleRepo from '@/features/menu/repositories/comboRuleRepository';
import * as discountTierRepo from '@/features/menu/repositories/discountTierRepository';
import * as customerRepo from '@/features/customer/repository';
import Order from '@/features/order/model';
import Event from './model';

/**
 * Aggregates database transaction records and event logs on MongoDB using high-performance pipelines.
 * Resolves memory bottlenecks by computing heatmaps, daily trends, item sales, and event logs on the DB.
 * 
 * @param restaurantId The restaurant slug ID.
 * @param start The start boundary Date object.
 * @param end The end boundary Date object.
 * @returns Aggregated metrics and configuration lists.
 */
export async function fetchRawDashboardData(restaurantId: string, start: Date, end: Date) {
  await dbConnect();

  const [
    eventAggregation,
    orderAggregation,
    recentCompletedOrders,
    ordersTableRaw,
    menuItems,
    pairingRules,
    comboRules,
    discountTiers,
    pendingOrdersCount,
    totalCustomersCount
  ] = await Promise.all([
    // 1. Event Aggregation Pipeline
    Event.aggregate([
      {
        $match: {
          restaurantId,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $facet: {
          cartsStarted: [
            { $match: { type: 'cart_create' } },
            { $count: 'count' }
          ],
          nudgeShownCounts: [
            { $match: { type: 'nudge_show', nudgeType: { $in: ['cross_sell', 'threshold_discount', 'combo_freebie'] } } },
            { $group: { _id: '$nudgeType', count: { $sum: 1 } } }
          ],
          ruleStatsTriggers: [
            { $match: { type: 'nudge_show', itemId: { $ne: '' } } },
            { $group: { _id: '$itemId', count: { $sum: 1 } } }
          ],
          modalOpenCounts: [
            { $match: { type: 'modal_open', itemId: { $ne: '' } } },
            { $group: { _id: '$itemId', count: { $sum: 1 } } }
          ]
        }
      }
    ]),

    // 2. Order Aggregation Pipeline
    Order.aggregate([
      {
        $match: {
          restaurantId,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $facet: {
          kpis: [
            { $match: { status: { $ne: 'cancelled' } } },
            {
              $group: {
                _id: null,
                ordersCount: { $sum: 1 },
                revenue: { $sum: '$total' },
                itemsCount: { $sum: { $sum: '$items.quantity' } }
              }
            }
          ],
          upsellKPI: [
            { $match: { status: { $ne: 'cancelled' } } },
            { $unwind: '$items' },
            { $match: { 'items.originatedFromNudge': true } },
            {
              $group: {
                _id: null,
                revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
              }
            }
          ],
          heatmap: [
            {
              $project: {
                status: 1,
                total: 1,
                dayOfWeek: { $dayOfWeek: '$createdAt' }, // 1 (Sun) to 7 (Sat)
                hour: { $hour: '$createdAt' } // 0 to 23
              }
            },
            {
              $group: {
                _id: { dayOfWeek: '$dayOfWeek', hour: '$hour' },
                count: { $sum: 1 },
                revenue: {
                  $sum: {
                    $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', 0]
                  }
                },
                nonCancelledCount: {
                  $sum: {
                    $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0]
                  }
                }
              }
            }
          ],
          trends: [
            {
              $project: {
                status: 1,
                total: 1,
                itemsCount: { $sum: '$items.quantity' },
                dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
              }
            },
            {
              $group: {
                _id: '$dateStr',
                orders: {
                  $sum: {
                    $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0]
                  }
                },
                revenue: {
                  $sum: {
                    $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', 0]
                  }
                },
                itemsCount: {
                  $sum: {
                    $cond: [{ $ne: ['$status', 'cancelled'] }, '$itemsCount', 0]
                  }
                }
              }
            },
            { $sort: { _id: 1 } }
          ],
          itemSales: [
            { $match: { status: { $ne: 'cancelled' } } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.name',
                itemId: { $first: '$items.menuItemId' },
                quantity: { $sum: '$items.quantity' },
                revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
              }
            }
          ],
          ruleConversions: [
            { $match: { status: { $ne: 'cancelled' } } },
            { $unwind: '$items' },
            { $match: { 'items.originatedFromNudge': true, 'items.nudgeRuleId': { $ne: null } } },
            {
              $group: {
                _id: '$items.nudgeRuleId',
                count: { $sum: '$items.quantity' },
                revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
              }
            }
          ],
          customerPhones: [
            { $match: { status: { $ne: 'cancelled' } } },
            {
              $group: {
                _id: '$customerPhone',
                orderCount: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]),

    // 3. Recent completed orders for association rule calculations (limited to 1,000)
    Order.find({
      restaurantId,
      status: 'completed',
      createdAt: { $gte: start, $lte: end }
    })
    .select('items.name')
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean(),

    // 4. Projected orders log table (limited to 1,000)
    Order.find({
      restaurantId,
      createdAt: { $gte: start, $lte: end }
    })
    .select('_id customerName customerPhone subtotal total status createdAt items.name items.quantity items.originatedFromNudge tableId')
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean(),

    // Configurations/counts
    menuItemRepo.findAll(restaurantId),
    pairingRuleRepo.findAll(restaurantId),
    comboRuleRepo.findAll(restaurantId),
    discountTierRepo.findActive(restaurantId),
    orderRepo.countPending(restaurantId),
    customerRepo.count(restaurantId)
  ]);

  // Compute discount tier achievements directly via Mongo queries
  const discountTierAchievement = await Promise.all(discountTiers.map(async (tier) => {
    const count = await Order.countDocuments({
      restaurantId,
      status: { $ne: 'cancelled' },
      createdAt: { $gte: start, $lte: end },
      subtotal: { $gte: tier.minSpend }
    });
    const avgAovResult = await Order.aggregate([
      {
        $match: {
          restaurantId,
          status: { $ne: 'cancelled' },
          createdAt: { $gte: start, $lte: end },
          subtotal: { $gte: tier.minSpend }
        }
      },
      {
        $group: {
          _id: null,
          avgAov: { $avg: '$total' }
        }
      }
    ]);
    const avgAov = avgAovResult[0]?.avgAov || 0;
    return {
      tierId: tier._id.toString(),
      minSpend: tier.minSpend,
      percentOff: tier.percentOff,
      ordersReached: count,
      avgOrderValueReached: avgAov,
    };
  }));

  const lowestMin = discountTiers.length > 0 ? discountTiers[0].minSpend : 0;
  const avgNoTierResult = await Order.aggregate([
    {
      $match: {
        restaurantId,
        status: { $ne: 'cancelled' },
        createdAt: { $gte: start, $lte: end },
        subtotal: { $lt: lowestMin }
      }
    },
    {
      $group: {
        _id: null,
        avgAov: { $avg: '$total' }
      }
    }
  ]);
  const avgOrderValueNoTier = avgNoTierResult[0]?.avgAov || 0;

  return {
    eventAggregates: eventAggregation[0] || {
      cartsStarted: [],
      nudgeShownCounts: [],
      ruleStatsTriggers: [],
      modalOpenCounts: []
    },
    orderAggregates: orderAggregation[0] || {
      kpis: [],
      upsellKPI: [],
      heatmap: [],
      trends: [],
      itemSales: [],
      ruleConversions: [],
      customerPhones: []
    },
    recentCompletedOrders,
    ordersTableRaw,
    menuItems,
    pairingRules,
    comboRules,
    discountTiers,
    pendingOrdersCount,
    totalCustomersCount,
    discountTierAchievement,
    avgOrderValueNoTier
  };
}
