import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { can } from '@/features/auth';
import * as expenseService from '@/features/expense';
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
 * GET /api/admin/expense/logs?itemId=&from=&to=&page=&limit=
 * Retrieves paginated expense purchase logs.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) throw new AuthenticationError('Unauthorized access');

    const url = new URL(req.url);
    const itemId = url.searchParams.get('itemId') || undefined;
    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    const result = await expenseService.getExpenseLogsPaginated({
      restaurantId: auth.restaurantId,
      itemId,
      from,
      to,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/admin/expense/logs
 * Body: { itemId, purchaseDate, quantity, totalPrice, vendor?, note? }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) throw new AuthenticationError('Unauthorized access');

    const isAllowed = await can('edit_menu', auth.token, auth.restaurantId);
    if (!isAllowed) throw new AuthenticationError('Forbidden: Insufficient permissions');

    const body = await req.json();
    if (!body.itemId) throw new ValidationError('Item ID is required');
    if (!body.purchaseDate) throw new ValidationError('Purchase date is required');
    if (typeof body.quantity !== 'number' || body.quantity <= 0) {
      throw new ValidationError('Quantity must be greater than 0');
    }
    if (typeof body.totalPrice !== 'number' || body.totalPrice < 0) {
      throw new ValidationError('Total price cannot be negative');
    }

    const log = await expenseService.createExpenseLog({
      restaurantId: auth.restaurantId,
      itemId: body.itemId,
      purchaseDate: body.purchaseDate,
      quantity: body.quantity,
      totalPrice: body.totalPrice,
      note: body.note,
      vendor: body.vendor,
      createdBy: (auth as any).userId,
    });

    return NextResponse.json({ success: true, log }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
