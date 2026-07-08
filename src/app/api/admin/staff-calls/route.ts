import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
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
 * GET /api/admin/staff-calls
 * Retrieves all pending staff assistance calls for the admin's restaurant.
 * Requires Header: Authorization: Bearer <jwt_token>
 * 
 * Sample Response:
 * {
 *   "success": true,
 *   "calls": [
 *     {
 *       "_id": "6685f0b8f1b2c4c8d5d90999",
 *       "restaurantId": "tokyo-momos",
 *       "tableId": "T-3",
 *       "status": "pending",
 *       "createdAt": "2026-07-03T10:15:00.000Z"
 *     }
 *   ]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) {
      throw new AuthenticationError('Unauthorized access');
    }

    const result = await orderService.getPendingStaffCalls(auth.restaurantId);
    return NextResponse.json({
      success: true,
      calls: result,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
