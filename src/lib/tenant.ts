import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export interface TenantContext {
  restaurantId: string;
  restaurantName?: string;
  email?: string;
  role?: string;
}

/**
 * Validates that the active tenant matches the target database operation context.
 * Throws an error if the context restaurantId does not match the target.
 */
export function validateRestaurantAccess(context: TenantContext, targetRestaurantId: string): void {
  if (!targetRestaurantId) {
    throw new Error('Target Restaurant ID is required for validation');
  }
  if (context.restaurantId.toLowerCase() !== targetRestaurantId.toLowerCase()) {
    throw new Error('Forbidden: Tenant mismatch or unauthorized access');
  }
}

/**
 * Validates a passed restaurantId string.
 * Throws an error if it is invalid or empty.
 */
export function validateRestaurantId(restaurantId: unknown): string {
  if (!restaurantId || typeof restaurantId !== 'string' || !restaurantId.trim()) {
    throw new Error('Restaurant ID is required and must be a valid string');
  }
  return restaurantId.trim().toLowerCase();
}

/**
 * requireTenant retrieves the tenant context from the active admin cookies session.
 * If authentication fails or the token is missing, it throws an error.
 */
export async function requireTenant(): Promise<TenantContext> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) {
    throw new Error('Unauthorized: No tenant session token provided');
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.restaurantId) {
    throw new Error('Unauthorized: Invalid or expired tenant session');
  }

  return {
    restaurantId: decoded.restaurantId,
    restaurantName: decoded.restaurantName,
    email: decoded.email,
  };
}
