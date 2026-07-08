import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { can } from '@/features/auth';
import * as orderService from '@/features/order';
import { handleRouteError, AuthenticationError } from '@/shared/errors';

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
 * GET /api/admin/orders?status=received&limit=20&skip=0
 * Retrieves orders for the admin's restaurant.
 * Requires Header: Authorization: Bearer <jwt_token>
 * 
 * Query Parameters:
 * - status: 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled'
 * - limit: default 50
 * - skip: default 0
 * 
 * Sample Response:
 * {
 *   "success": true,
 *   "orders": [
 *     {
 *       "_id": "6682fa08f1b2c4c8d5d90123",
 *       "restaurantId": "tokyo-momos",
 *       "customerName": "Jane Doe",
 *       "customerPhone": "+919876543210",
 *       "tableId": "T-3",
 *       "status": "received",
 *       "items": [...],
 *       "subtotal": 240,
 *       "total": 240,
 *       "createdAt": "..."
 *     }
 *   ],
 *   "totalCount": 1
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) {
      throw new AuthenticationError('Unauthorized access');
    }

    const isAllowed = (await can('manage_orders', auth.token, auth.restaurantId)) ||
                      (await can('update_order_status', auth.token, auth.restaurantId));
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    const result = await orderService.getAdminOrders(auth.restaurantId, limit, skip, status);
    return NextResponse.json({
      success: true,
      orders: result.orders,
      totalCount: result.totalCount,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
