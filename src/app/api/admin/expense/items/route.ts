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
 * GET /api/admin/expense/items?categoryId=
 * List active expense items (filterable by category).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) throw new AuthenticationError('Unauthorized access');

    const url = new URL(req.url);
    const categoryId = url.searchParams.get('categoryId') || undefined;

    const items = await expenseService.getItems(auth.restaurantId, categoryId);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/admin/expense/items
 * Body: { name: string, unit: ExpenseUnit, categoryId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) throw new AuthenticationError('Unauthorized access');

    const isAllowed = await can('edit_menu', auth.token, auth.restaurantId);
    if (!isAllowed) throw new AuthenticationError('Forbidden: Insufficient permissions');

    const body = await req.json();
    if (!body.name || !body.name.trim()) throw new ValidationError('Item name is required');
    if (!body.categoryId) throw new ValidationError('Category ID is required');
    if (!body.unit) throw new ValidationError('Unit is required');

    const item = await expenseService.createItem({
      restaurantId: auth.restaurantId,
      categoryId: body.categoryId,
      name: body.name,
      unit: body.unit,
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
