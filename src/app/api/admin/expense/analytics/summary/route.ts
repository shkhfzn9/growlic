import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
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
 * GET /api/admin/expense/analytics/summary?from=&to=
 * Returns dashboard-level expense summary analytics.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) throw new AuthenticationError('Unauthorized access');

    const url = new URL(req.url);
    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;

    const summary = await expenseService.getExpenseSummaryAnalytics({
      restaurantId: auth.restaurantId,
      from,
      to,
    });

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    return handleRouteError(error);
  }
}
