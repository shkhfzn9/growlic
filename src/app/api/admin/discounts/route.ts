import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { handleRouteError, AuthenticationError } from '@/shared/errors';
import * as discountRepo from '@/features/discount/repository';
import * as discountTierRepo from '@/features/menu/repositories/discountTierRepository';
import dbConnect from '@/lib/mongodb';
import { ComboRule, Menu } from '@/features/menu/model';
import Order from '@/features/order/model';

function getAuthDetails(req: NextRequest) {
  let token = req.cookies.get('admin_token')?.value;
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  return { ...decoded, token };
}

/**
 * GET /api/admin/discounts
 * Retrieves full discount overview for the restaurant:
 * - Master & module discount settings
 * - Coupons list
 * - Spend-based discount tiers list
 * - Combo & upsell rules list
 * - Menu items with discount flags
 * - Real-time discount cost & leakage analytics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryRestId = searchParams.get('restaurantId');
    const auth = getAuthDetails(req);
    const restaurantId = queryRestId || auth?.restaurantId;

    if (!restaurantId) throw new AuthenticationError('Restaurant ID required');

    await dbConnect();

    const [settings, coupons, spendTiers, rawComboRules, rawMenuItems, orders] = await Promise.all([
      discountRepo.getDiscountSettings(restaurantId),
      discountRepo.getCoupons(restaurantId),
      discountTierRepo.findAll(restaurantId),
      ComboRule.find({ restaurantId }).sort({ createdAt: -1 }),
      Menu.find({ restaurantId }).sort({ category: 1, name: 1 }),
      Order.find({ restaurantId, status: { $ne: 'cancelled' } }),
    ]);

    let totalDiscountGiven = 0;
    let discountedOrdersCount = 0;
    let maxDiscountInSingleOrder = 0;
    let totalRevenue = 0;

    orders.forEach((o) => {
      totalRevenue += o.total || 0;
      const discount = Math.max(0, (o.subtotal || 0) - (o.total || 0));
      if (discount > 0) {
        totalDiscountGiven += discount;
        discountedOrdersCount++;
        if (discount > maxDiscountInSingleOrder) {
          maxDiscountInSingleOrder = discount;
        }
      }
    });

    const avgDiscountPerOrder = discountedOrdersCount > 0 ? Math.round(totalDiscountGiven / discountedOrdersCount) : 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comboRules = rawComboRules.map((doc: any) => {
      const p = doc.toObject ? doc.toObject() : doc;
      return {
        _id: p._id.toString(),
        restaurantId: p.restaurantId,
        conditionCategory: p.conditionCategory,
        conditionExcludeCategory: p.conditionExcludeCategory || null,
        rewardType: p.rewardType,
        rewardTarget: p.rewardTarget,
        customerMessage: p.customerMessage,
        active: p.active !== undefined ? p.active : true,
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = rawMenuItems.map((doc: any) => {
      const p = doc.toObject ? doc.toObject() : doc;
      return {
        _id: p._id.toString(),
        name: p.name,
        category: p.category,
        price: p.price,
        image: p.image || '',
        active: p.active !== undefined ? p.active : true,
        available: p.available !== undefined ? p.available : true,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        settings,
        coupons,
        spendTiers,
        comboRules,
        items,
        analytics: {
          totalDiscountGiven,
          discountedOrdersCount,
          totalOrdersCount: orders.length,
          avgDiscountPerOrder,
          maxDiscountInSingleOrder,
          totalRevenue,
        },
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PUT /api/admin/discounts
 * Updates master discount settings (master switch, order discount cap, module toggles).
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) throw new AuthenticationError('Unauthorized access');

    const body = await req.json();
    const updatedSettings = await discountRepo.updateDiscountSettings(auth.restaurantId, body);

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
