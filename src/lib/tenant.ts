import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

/**
 * Centralized tenant ID sanitizer and validator module for Growlic Multi-Tenant Platform.
 */

/**
 * Sanitizes and normalizes any raw tenant ID string to lowercase trimmed format.
 */
export function sanitizeTenantId(rawTenantId?: string | null): string {
  if (!rawTenantId || typeof rawTenantId !== 'string') {
    return '';
  }
  return rawTenantId.trim().toLowerCase();
}

/**
 * Validates that a restaurantId string is non-empty and returns trimmed lowercase slug.
 */
export function validateRestaurantId(restaurantId: any): string {
  if (!restaurantId || typeof restaurantId !== 'string' || !restaurantId.trim()) {
    throw new Error('Restaurant ID is required');
  }
  return sanitizeTenantId(restaurantId);
}

/**
 * Validates that context tenant ID matches target tenant ID.
 */
export function validateRestaurantAccess(context: { restaurantId: string }, targetRestaurantId: string): void {
  if (!targetRestaurantId || !targetRestaurantId.trim()) {
    throw new Error('Target Restaurant ID is required');
  }
  if (sanitizeTenantId(context?.restaurantId) !== sanitizeTenantId(targetRestaurantId)) {
    throw new Error('Forbidden: Tenant mismatch');
  }
}

/**
 * Validates that a tenant ID conforms to lowercase slug format (alphanumeric + single hyphens, 3-40 chars).
 */
export function isValidTenantSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  const clean = slug.trim();
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(clean) && clean.length >= 3 && clean.length <= 40;
}

/**
 * Server-side helper to require an authenticated tenant admin session from HTTP cookies.
 */
export async function requireTenant() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) {
    throw new Error('Unauthorized: No tenant session token provided');
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    throw new Error('Unauthorized: Invalid or expired tenant session');
  }
  return {
    restaurantId: sanitizeTenantId(decoded.restaurantId),
    restaurantName: decoded.restaurantName,
    email: decoded.email,
  };
}
