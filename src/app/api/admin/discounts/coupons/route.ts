import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { handleRouteError, AuthenticationError, ValidationError } from '@/shared/errors';
import * as discountRepo from '@/features/discount/repository';

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
 * POST /api/admin/discounts/coupons
 * Creates a new promo coupon code.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) throw new AuthenticationError('Unauthorized access');

    const body = await req.json();

    if (!body.code || !body.code.trim()) {
      throw new ValidationError('Coupon code is required');
    }
    if (!body.discountType || !['percentage', 'fixed'].includes(body.discountType)) {
      throw new ValidationError('Valid discount type (percentage or fixed) is required');
    }
    if (body.discountValue === undefined || Number(body.discountValue) <= 0) {
      throw new ValidationError('Discount value must be greater than 0');
    }

    const coupon = await discountRepo.createCoupon({
      restaurantId: auth.restaurantId,
      code: body.code,
      discountType: body.discountType,
      discountValue: body.discountValue,
      minSpend: body.minSpend,
      maxUsage: body.maxUsage,
      expiresAt: body.expiresAt,
      active: body.active,
    });

    return NextResponse.json({ success: true, coupon }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PUT /api/admin/discounts/coupons
 * Updates an existing coupon or toggles active state. Body must include `_id` or `id`.
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) throw new AuthenticationError('Unauthorized access');

    const body = await req.json();
    const id = body._id || body.id;

    if (!id) {
      throw new ValidationError('Coupon ID is required');
    }

    const updated = await discountRepo.updateCoupon(id, auth.restaurantId, body);
    if (!updated) {
      throw new ValidationError('Coupon not found or unauthorized');
    }

    return NextResponse.json({ success: true, coupon: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * DELETE /api/admin/discounts/coupons?id=XXX
 * Deletes a coupon code.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) throw new AuthenticationError('Unauthorized access');

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      throw new ValidationError('Coupon ID is required in query params');
    }

    const deleted = await discountRepo.deleteCoupon(id, auth.restaurantId);
    if (!deleted) {
      throw new ValidationError('Coupon not found');
    }

    return NextResponse.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    return handleRouteError(error);
  }
}
