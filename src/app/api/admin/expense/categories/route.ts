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
 * GET /api/admin/expense/categories
 * Returns list of expense categories for the admin's restaurant.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) throw new AuthenticationError('Unauthorized access');

    const categories = await expenseService.getCategories(auth.restaurantId);
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/admin/expense/categories
 * Body: { name: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) throw new AuthenticationError('Unauthorized access');

    const isAllowed = await can('edit_menu', auth.token, auth.restaurantId);
    if (!isAllowed) throw new AuthenticationError('Forbidden: Insufficient permissions');

    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      throw new ValidationError('Category name is required');
    }

    const category = await expenseService.createCategory({
      restaurantId: auth.restaurantId,
      name: body.name,
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
