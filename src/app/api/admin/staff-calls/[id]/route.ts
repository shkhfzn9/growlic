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
 * PATCH /api/admin/staff-calls/[id]
 * Updates status of a staff call to mark it as resolved (accepted/rejected).
 * Responsible for letting admins accept/dismiss requests for table service/waiter assistance.
 * Securely restricts updating only calls belonging to the authenticated admin's restaurant.
 * Requires Header: Authorization: Bearer <jwt_token>
 * 
 * Sample Payload:
 * {
 *   "status": "accepted"
 * }
 * 
 * Sample Response:
 * {
 *   "success": true,
 *   "call": {
 *     "_id": "6685f0b8f1b2c4c8d5d90999",
 *     "restaurantId": "tokyo-momos",
 *     "tableId": "T-3",
 *     "status": "accepted",
 *     "createdAt": "...",
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
    const { status } = body;

    if (status !== 'accepted' && status !== 'rejected') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const result = await orderService.updateStaffCallStatus(id, auth.restaurantId, status);
    if (!result) {
      return NextResponse.json({ error: 'Staff call not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      call: result,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
