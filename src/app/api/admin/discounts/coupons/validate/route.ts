import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, ValidationError } from '@/shared/errors';
import * as discountRepo from '@/features/discount/repository';

/**
 * POST /api/admin/discounts/coupons/validate
 * Public endpoint for cart checkout to validate a coupon code.
 * Body: { restaurantId: string, code: string, subtotal: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantId, code, subtotal } = body;

    if (!restaurantId) throw new ValidationError('Restaurant ID is required');
    if (!code || !code.trim()) throw new ValidationError('Coupon code is required');

    const result = await discountRepo.validateCoupon(
      restaurantId,
      code,
      Number(subtotal) || 0
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
