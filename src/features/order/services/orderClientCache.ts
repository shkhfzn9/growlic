import { Order } from '../types/order.types';
import { getMenuItems } from '@/actions/menu';
import { getRestaurantDetails } from '@/actions/auth';

export interface KitchenStats {
  onTimeRate: number;
  delayedCount: number;
  avgDelayMins: string;
  totalProcessed: number;
  totalCompleted: number;
}

export interface CachedOrdersData {
  orders: Order[];
  totalCount: number;
  stats?: KitchenStats;
  timestamp: number;
}

// In-memory client cache for fast SWR tab transitions
const ordersCache = new Map<string, CachedOrdersData>();

export function getCachedOrders(key: string): CachedOrdersData | undefined {
  return ordersCache.get(key);
}

export function setCachedOrders(
  key: string,
  data: {
    orders: Order[];
    totalCount: number;
    stats?: KitchenStats;
  }
) {
  ordersCache.set(key, {
    ...data,
    timestamp: Date.now(),
  });
}

export function invalidateOrdersCache() {
  ordersCache.clear();
}

/**
 * Updates a specific order across all cached tabs (e.g. when marking status or changing ETA).
 */
export function updateOrderInCache(updatedOrder: Order) {
  for (const [key, val] of ordersCache.entries()) {
    const idx = val.orders.findIndex((o) => o._id === updatedOrder._id);
    if (idx !== -1) {
      const newOrders = [...val.orders];
      newOrders[idx] = updatedOrder;
      ordersCache.set(key, {
        ...val,
        orders: newOrders,
        timestamp: Date.now(),
      });
    }
  }
}

/**
 * Immediately prepends a newly created counter order into cached lists so it is visible in 0ms.
 */
export function prependOrderToCache(order: Order) {
  for (const [key, val] of ordersCache.entries()) {
    // Only prepend to counter tabs or 'all' channels
    if (key.startsWith('admin_counter') || key.startsWith('all')) {
      if (!val.orders.some((o) => o._id === order._id)) {
        ordersCache.set(key, {
          ...val,
          orders: [order, ...val.orders],
          totalCount: val.totalCount + 1,
          timestamp: Date.now(),
        });
      }
    }
  }
}

// POS Menu & Store Details Client Cache
export interface CachedPosMenu {
  items: any[];
  details: any;
  timestamp: number;
}

let posMenuCache: CachedPosMenu | null = null;
let posPrefetchPromise: Promise<void> | null = null;

export function getCachedPosMenu(): CachedPosMenu | null {
  if (!posMenuCache) return null;
  // 3-minute TTL for POS menu items
  if (Date.now() - posMenuCache.timestamp > 180000) {
    return null;
  }
  return posMenuCache;
}

export function setCachedPosMenu(items: any[], details: any) {
  posMenuCache = {
    items,
    details,
    timestamp: Date.now(),
  };
}

/**
 * Prefetches POS menu items and details in the background so opening POS is 0ms.
 */
export async function prefetchPosMenu(restaurantId: string): Promise<void> {
  if (!restaurantId) return;
  if (posMenuCache && Date.now() - posMenuCache.timestamp < 120000) {
    return;
  }
  if (posPrefetchPromise) return posPrefetchPromise;

  posPrefetchPromise = Promise.all([
    getMenuItems(restaurantId),
    getRestaurantDetails(),
  ])
    .then(([items, details]) => {
      setCachedPosMenu(items || [], details);
    })
    .catch((err) => {
      console.warn('[POS_PREFETCH] Background prefetch warning:', err);
    })
    .finally(() => {
      posPrefetchPromise = null;
    });

  return posPrefetchPromise;
}
