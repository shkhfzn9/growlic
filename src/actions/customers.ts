'use server';

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getCustomersBySearch } from '@/features/customer';

/**
 * Validates the admin's authentication cookie ('admin_token') and decodes its payload.
 * Throws an Error if the token is missing or invalid.
 * 
 * @returns The decoded admin session JWT token object.
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
 * Server action to fetch customers scoped to the authenticated admin's restaurant.
 * Support search filters by customer phone numbers.
 * 
 * @param searchPhone Optional search query phone string.
 * @returns Serialized, plain array of customer records.
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
