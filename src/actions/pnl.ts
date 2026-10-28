'use server';

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { validateSession, getAdminByRestaurantId } from '@/features/auth';
import * as pnlService from '@/features/pnl/service';
import {
  PnLTimePeriod,
  QuarterName,
  PnLBreakdownGranularity,
  PnLOrderDrilldownFilter,
  PnLStatementResponse,
  PnLOrdersResponse,
  PnLExpensesResponse,
} from '@/features/pnl/types';

/**
 * Validates admin session authentication cookie.
 */
async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) {
    throw new Error('Unauthorized: No token provided');
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    throw new Error('Unauthorized: Invalid token');
  }

  const isValid = await validateSession(decoded.restaurantId, token);
  if (!isValid) {
    throw new Error('Unauthorized: Session has expired');
  }

  const admin = await getAdminByRestaurantId(decoded.restaurantId);
  if (!admin) {
    throw new Error('Unauthorized: Admin account not found');
  }

  return { ...decoded, token, userId: admin._id, role: admin.role || decoded.role };
}

/**
 * Server Action: Fetches the aggregate Profit & Loss statement for the chosen period.
 */
export async function getPnLStatementAction(params: {
  period: PnLTimePeriod;
  granularity?: PnLBreakdownGranularity;
  singleDate?: string;
  startDate?: string;
  endDate?: string;
  quarter?: QuarterName;
  year?: number;
  monthIndex?: number;
  customCogsPercent?: number | null;
}): Promise<PnLStatementResponse> {
  const admin = await checkAdminAuth();

  const statement = await pnlService.getPnLStatement({
    restaurantId: admin.restaurantId,
    period: params.period,
    granularity: params.granularity,
    singleDate: params.singleDate,
    startDate: params.startDate,
    endDate: params.endDate,
    quarter: params.quarter,
    year: params.year,
    monthIndex: params.monthIndex,
    customCogsPercent: params.customCogsPercent,
  });

  return JSON.parse(JSON.stringify(statement));
}

/**
 * Server Action: Fetches itemized orders drilldown for a specific day or date range with multi-filters.
 */
export async function getPnLOrdersAction(params: {
  startDateIso: string;
  endDateIso: string;
  filter?: PnLOrderDrilldownFilter;
}): Promise<PnLOrdersResponse> {
  const admin = await checkAdminAuth();

  const result = await pnlService.getPnLOrdersDrilldown({
    restaurantId: admin.restaurantId,
    startDateIso: params.startDateIso,
    endDateIso: params.endDateIso,
    filter: params.filter,
  });

  return JSON.parse(JSON.stringify(result));
}

/**
 * Server Action: Fetches logged expense items drilldown for a specific day or date range.
 */
export async function getPnLExpensesAction(params: {
  startDateIso: string;
  endDateIso: string;
  type?: 'all' | 'cogs' | 'opex';
}): Promise<PnLExpensesResponse> {
  const admin = await checkAdminAuth();

  const result = await pnlService.getPnLExpensesDrilldown({
    restaurantId: admin.restaurantId,
    startDateIso: params.startDateIso,
    endDateIso: params.endDateIso,
    type: params.type,
  });

  return JSON.parse(JSON.stringify(result));
}
