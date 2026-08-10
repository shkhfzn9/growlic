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
 * GET /api/admin/expense/analytics/item/:itemId?range=daily|weekly|monthly&from=&to=
 * Returns time-bucketed aggregation for single item price trends.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const auth = getAuthDetails(req);
    if (!auth) throw new AuthenticationError('Unauthorized access');

    const { itemId } = await params;
    const url = new URL(req.url);
    const range = (url.searchParams.get('range') as 'daily' | 'weekly' | 'monthly') || 'weekly';
    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;

    const buckets = await expenseService.getItemPriceTrendsAggregation({
      restaurantId: auth.restaurantId,
      itemId,
      range,
      from,
      to,
    });

    return NextResponse.json({ success: true, itemId, range, buckets });
  } catch (error) {
    return handleRouteError(error);
  }
}
