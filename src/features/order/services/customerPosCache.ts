'use client';

/**
 * In-memory client-side cache for returning customer autofill on the POS Counter screen.
 *
 * Architecture & Constraints:
 * 1. Kept outside React state (plain Maps) to avoid unnecessary re-renders.
 * 2. Keyed by restaurantId to enforce multi-tenant isolation.
 * 3. Supports instant O(1) synchronous lookups (0ms).
 * 4. Cleared on admin logout via clearCustomerCache().
 * 5. Imported ONLY in client components (never on server).
 */

// Tenant-keyed store: Map<restaurantId, Map<phone, name>>
const customerCacheByTenant = new Map<string, Map<string, string>>();
const cacheLoadedByTenant = new Set<string>();

/**
 * Checks whether the customer cache has already been initialized for a given restaurant.
 */
export function isCustomerCacheLoaded(restaurantId: string): boolean {
  if (!restaurantId) return false;
  return cacheLoadedByTenant.has(restaurantId);
}

/**
 * Initializes the bounded in-memory cache for a restaurant with preloaded customers.
 */
export function initializeCustomerCache(
  restaurantId: string,
  customers: Array<{ phone: string; name: string }>
): void {
  if (!restaurantId) return;
  let tenantMap = customerCacheByTenant.get(restaurantId);
  if (!tenantMap) {
    tenantMap = new Map<string, string>();
    customerCacheByTenant.set(restaurantId, tenantMap);
  }

  for (const c of customers) {
    if (c?.phone && c?.name) {
      tenantMap.set(c.phone, c.name);
    }
  }
  cacheLoadedByTenant.add(restaurantId);
}

/**
 * Performs an instant O(1) synchronous lookup in memory for a given restaurant.
 * Returns customer name if cached, or null on cache miss.
 */
export function getCachedCustomer(
  restaurantId: string,
  normalizedPhone: string
): string | null {
  if (!restaurantId || !normalizedPhone) return null;
  const tenantMap = customerCacheByTenant.get(restaurantId);
  if (!tenantMap) return null;
  return tenantMap.get(normalizedPhone) || null;
}

/**
 * Sets or updates a customer in the in-memory cache for the specified restaurant.
 * Called when DB lookup resolves or when a new order is placed.
 */
export function setCachedCustomer(
  restaurantId: string,
  normalizedPhone: string,
  name: string
): void {
  if (!restaurantId || !normalizedPhone || !name) return;
  let tenantMap = customerCacheByTenant.get(restaurantId);
  if (!tenantMap) {
    tenantMap = new Map<string, string>();
    customerCacheByTenant.set(restaurantId, tenantMap);
  }
  tenantMap.set(normalizedPhone, name);
}

/**
 * Clears the customer cache.
 * If restaurantId is provided, clears only that restaurant's cache.
 * If omitted, clears all tenant caches (e.g. on full admin logout).
 */
export function clearCustomerCache(restaurantId?: string): void {
  if (restaurantId) {
    customerCacheByTenant.delete(restaurantId);
    cacheLoadedByTenant.delete(restaurantId);
  } else {
    customerCacheByTenant.clear();
    cacheLoadedByTenant.clear();
  }
}

/**
 * Returns cache size for testing and diagnostic verification.
 */
export function getCustomerCacheSize(restaurantId: string): number {
  return customerCacheByTenant.get(restaurantId)?.size ?? 0;
}
