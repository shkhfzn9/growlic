import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { can } from '@/features/auth';
import * as expenseService from '@/features/expense';
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
 * PATCH /api/admin/expense/logs/:id
 * Body: { purchaseDate?, quantity?, totalPrice?, vendor?, note? }
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

    const updated = await expenseService.updateExpenseLog(id, auth.restaurantId, body);
    return NextResponse.json({ success: true, log: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * DELETE /api/admin/expense/logs/:id
 * Deletes purchase log entry and repairs the delta chain for subsequent entries.
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
    const res = await expenseService.deleteExpenseLog(id, auth.restaurantId);
    return NextResponse.json(res);
  } catch (error) {
    return handleRouteError(error);
  }
}
