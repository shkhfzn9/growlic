import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, ValidationError } from '@/shared/errors';
import * as discountRepo from '@/features/discount/repository';

/**
 * GET /api/customer/discounts?restaurantId=...
 * Public unauthenticated endpoint for cart checkout to retrieve customer-visible discount settings.
 * Cached at edge with s-maxage=60.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId || !restaurantId.trim()) {
      throw new ValidationError('restaurantId query parameter is required');
    }

    const settings = await discountRepo.getDiscountSettings(restaurantId);

    // Return only customer-visible settings
    const customerVisibleSettings = {
      masterEnabled: settings.masterEnabled,
      couponsEnabled: settings.couponsEnabled,
      spendTiersEnabled: settings.spendTiersEnabled,
      comboRulesEnabled: settings.comboRulesEnabled,
      itemDiscountsEnabled: settings.itemDiscountsEnabled,
      specialAddonsEnabled: settings.specialAddonsEnabled,
      specialAddonDiscountPercent: settings.specialAddonDiscountPercent,
      maxDiscountPerOrder: settings.maxDiscountPerOrder,
      allowStacking: settings.allowStacking,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          settings: customerVisibleSettings,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
