import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { handleRouteError, AuthenticationError } from '@/shared/errors';
import * as superAdminService from '@/services/superAdminService';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth || auth.role !== 'super_admin') {
      throw new AuthenticationError('Unauthorized access');
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const status = (searchParams.get('status') as 'all' | 'active' | 'inactive') || 'all';

    const list = await superAdminService.getRestaurantList(startDate, endDate, status);

    return NextResponse.json({
      success: true,
      restaurants: list,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
