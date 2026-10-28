'use server';

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getCustomersBySearch } from '@/features/customer';
import {
  getCustomerListWithSegments,
  getCustomerDetail,
  getCustomerVisitHistory,
  getCustomerAnalytics,
} from '@/features/customer/services/customerAnalyticsService';
import { ICustomerListFilters } from '@/features/customer/types';
import { getTopRecentCustomers, lookupCustomerPhone } from '@/features/customer/repository';
import { normalizeCustomerPhone } from '@/lib/phoneUtils';

/**
 * Validates the admin's authentication cookie ('admin_token') and decodes its payload.
 * Throws an Error if the token is missing or invalid.
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

  return decoded;
}

/**
 * Legacy server action to fetch customers scoped to the authenticated admin's restaurant.
 * Retained for backward compatibility.
 */
export async function getCustomers(searchPhone?: string) {
  try {
    const admin = await checkAdminAuth();
    const result = await getCustomersBySearch(admin.restaurantId, searchPhone);
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error('Error fetching customers action:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch customers';
    throw new Error(message);
  }
}

/**
 * Server action to fetch paginated customers enriched with computed segments,
 * multi-filters, and segment count summary chips.
 */
export async function getCustomersWithSegmentsAction(filters: ICustomerListFilters = {}) {
  try {
    const admin = await checkAdminAuth();
    const result = await getCustomerListWithSegments(admin.restaurantId, filters);
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error('Error fetching customers with segments:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch customers list';
    throw new Error(message);
  }
}

/**
 * Server action to fetch single customer profile, RFM frequency metrics, and 6 insight cards.
 */
export async function getCustomerDetailAction(phone: string) {
  try {
    const admin = await checkAdminAuth();
    const result = await getCustomerDetail(admin.restaurantId, phone);
    if (!result) {
      return null;
    }
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error('Error fetching customer detail action:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch customer profile';
    throw new Error(message);
  }
}

/**
 * Server action to fetch paginated visit history for a customer.
 */
export async function getCustomerVisitHistoryAction(phone: string, page = 1, limit = 10) {
  try {
    const admin = await checkAdminAuth();
    const result = await getCustomerVisitHistory(admin.restaurantId, phone, page, limit);
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error('Error fetching customer visit history action:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch visit history';
    throw new Error(message);
  }
}

/**
 * Server action to fetch Cohort Retention Heatmap, Pareto 80/20 data, and Summary KPIs.
 */
export async function getCustomerAnalyticsAction(forceRefresh = false) {
  try {
    const admin = await checkAdminAuth();
    const result = await getCustomerAnalytics(admin.restaurantId, forceRefresh);
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error('Error fetching customer analytics action:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch customer analytics';
    throw new Error(message);
  }
}

/**
 * Server action to retrieve all filtered customers formatted for CSV export.
 */
export async function exportCustomersCsvDataAction(filters: ICustomerListFilters = {}) {
  try {
    const admin = await checkAdminAuth();
    // Fetch all matching records without pagination cutoff (limit: 5000)
    const result = await getCustomerListWithSegments(admin.restaurantId, {
      ...filters,
      page: 1,
      limit: 5000,
    });
    return JSON.parse(JSON.stringify(result.customers));
  } catch (error) {
    console.error('Error exporting customers CSV:', error);
    const message = error instanceof Error ? error.message : 'Failed to export customers CSV';
    throw new Error(message);
  }
}

/**
 * Server action to fetch top recent customers for POS counter bounded preload (max 1,000).
 * Safe failure: returns empty array if error occurs, ensuring counter form never breaks.
 */
export async function getPreloadCustomersAction(): Promise<Array<{ phone: string; name: string }>> {
  try {
    const admin = await checkAdminAuth();
    if (!admin?.restaurantId) return [];
    const customers = await getTopRecentCustomers(admin.restaurantId, 1000);
    return JSON.parse(JSON.stringify(customers));
  } catch (error) {
    console.error('getPreloadCustomersAction safe failure:', error);
    return [];
  }
}

/**
 * Server action to look up a customer by normalized phone for POS counter fallback.
 * Safe failure: returns null on failure so form remains fully functional.
 */
export async function lookupCustomerByPhoneAction(
  phone: string
): Promise<{ phone: string; name: string } | null> {
  try {
    const admin = await checkAdminAuth();
    if (!admin?.restaurantId || !phone) return null;
    const normalizedPhone = normalizeCustomerPhone(phone);
    if (!normalizedPhone) return null;
    const customer = await lookupCustomerPhone(admin.restaurantId, normalizedPhone);
    return customer ? JSON.parse(JSON.stringify(customer)) : null;
  } catch (error) {
    console.error('lookupCustomerByPhoneAction safe failure:', error);
    return null;
  }
}
