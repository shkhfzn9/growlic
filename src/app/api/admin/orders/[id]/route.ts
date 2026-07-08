import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { can } from '@/features/auth';
import * as orderService from '@/features/order';
import { logAction } from '@/features/audit';
import { getAdminByRestaurantId } from '@/features/auth';
import { handleRouteError, AuthenticationError, ValidationError } from '@/shared/errors';

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
 * PATCH /api/admin/orders/[id]
 * Updates order preparation ETA (estimatedTime) or/and order status.
 * Requires Header: Authorization: Bearer <jwt_token>
 * 
 * Sample Payloads:
 * 1. Accept order & set preparation time:
 * {
 *   "status": "accepted",
 *   "estimatedTime": 20
 * }
 * 
 * 2. Mark order as preparing:
 * {
 *   "status": "preparing"
 * }
 * 
 * 3. Mark order as ready/completed/cancelled:
 * {
 *   "status": "ready"
 * }
 * 
 * Sample Response:
 * {
 *   "success": true,
 *   "order": {
 *     "_id": "6682fa08f1b2c4c8d5d90123",
 *     "restaurantId": "tokyo-momos",
 *     "status": "accepted",
 *     "estimatedTime": 20,
 *     "updatedAt": "..."
 *   }
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<any> }
) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) {
      throw new AuthenticationError('Unauthorized access');
    }

    const { id } = await params;
    const body = await req.json();
    const { status, estimatedTime } = body;

    const isAllowed = await can('update_order_status', auth.token, auth.restaurantId);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const adminUser = await getAdminByRestaurantId(auth.restaurantId);
    if (!adminUser) {
      throw new Error('Admin account not found');
    }

    const existing = await orderService.getOrderById(id, auth.restaurantId);
    if (!existing) {
      return NextResponse.json({ error: 'Order not found or unauthorized' }, { status: 404 });
    }

    if (status === undefined && estimatedTime === undefined) {
      throw new ValidationError('Either status or estimatedTime must be provided');
    }

    let updatedOrder = existing;

    if (typeof estimatedTime === 'number') {
      updatedOrder = await orderService.updateOrderEstimatedTime(id, auth.restaurantId, estimatedTime);
      await logAction(auth.restaurantId, adminUser._id, 'ORDER_STATUS_CHANGED', existing, updatedOrder);
    }

    if (status) {
      const prevOrder = updatedOrder;
      updatedOrder = await orderService.updateOrderStatus(id, auth.restaurantId, status);
      await logAction(auth.restaurantId, adminUser._id, 'ORDER_STATUS_CHANGED', prevOrder, updatedOrder);
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
