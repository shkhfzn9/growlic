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
 * PATCH /api/admin/expense/categories/:id
 * Body: { name: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) throw new AuthenticationError('Unauthorized access');

    const isAllowed = await can('edit_menu', auth.token, auth.restaurantId);
    if (!isAllowed) throw new AuthenticationError('Forbidden: Insufficient permissions');

    const { id } = await params;
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      throw new ValidationError('Category name is required');
    }

    const updated = await expenseService.updateCategory(id, auth.restaurantId, body.name);
    return NextResponse.json({ success: true, category: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * DELETE /api/admin/expense/categories/:id
 * Only succeeds if no items reference this category; else throws 409 Conflict.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) throw new AuthenticationError('Unauthorized access');

    const isAllowed = await can('edit_menu', auth.token, auth.restaurantId);
    if (!isAllowed) throw new AuthenticationError('Forbidden: Insufficient permissions');

    const { id } = await params;
    const res = await expenseService.deleteCategory(id, auth.restaurantId);
    return NextResponse.json(res);
  } catch (error) {
    return handleRouteError(error);
  }
}
