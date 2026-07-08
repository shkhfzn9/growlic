import { NextRequest, NextResponse } from 'next/server';
import * as orderService from '@/features/order';
import { handleRouteError } from '@/shared/errors';

/**
 * POST /api/customer/staff-calls
 * Creates a pending staff assistance call for a customer.
 * 
 * Sample Payload:
 * {
 *   "restaurantId": "tokyo-momos",
 *   "tableId": "T-3"
 * }
 * 
 * Sample Response:
 * {
 *   "success": true,
 *   "call": {
 *     "_id": "6685f0b8f1b2c4c8d5d90999",
 *     "restaurantId": "tokyo-momos",
 *     "tableId": "T-3",
 *     "status": "pending",
 *     "createdAt": "..."
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantId, tableId } = body;

    if (!restaurantId || !tableId) {
      return NextResponse.json({ error: 'restaurantId and tableId are required' }, { status: 400 });
    }

    const result = await orderService.createStaffCall(restaurantId, tableId);
    return NextResponse.json({
      success: true,
      call: result,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
