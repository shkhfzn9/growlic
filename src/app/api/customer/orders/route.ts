import { NextRequest, NextResponse } from 'next/server';
import * as orderService from '@/features/order';
import { handleRouteError } from '@/shared/errors';

/**
 * POST /api/customer/orders
 * Creates and places a new customer order.
 * 
 * Sample Payload:
 * {
 *   "restaurantId": "tokyo-momos",
 *   "customerName": "Jane Doe",
 *   "customerPhone": "+919876543210",
 *   "tableId": "T-3",
 *   "items": [
 *     {
 *       "menuItemId": "6682f9d8f1b2c4c8d5d90111",
 *       "name": "Steamed Veg Momo",
 *       "price": 120,
 *       "quantity": 2,
 *       "image": "/images/veg-momo.jpg"
 *     }
 *   ],
 *   "subtotal": 240,
 *   "total": 240,
 *   "notes": "No onions"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const order = await orderService.createOrder(body);
    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
