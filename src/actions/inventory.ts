'use server';

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import * as inventoryService from '@/features/inventory';
import { validateSession, can, getAdminByRestaurantId } from '@/features/auth';
import { logAction } from '@/features/audit';
import { InventoryTimePeriod } from '@/features/inventory/types';

/**
 * Validates the admin's authentication cookie ('admin_token') and decodes its payload.
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
    throw new Error('Unauthorized: Session has expired or been revoked');
  }

  const admin = await getAdminByRestaurantId(decoded.restaurantId);
  if (!admin) {
    throw new Error('Unauthorized: Admin account not found');
  }

  return { ...decoded, token, userId: admin._id, role: admin.role || decoded.role };
}

/**
 * Server action to fetch inventory and item sales analytics for a selected period or single date.
 */
export async function getInventoryAnalyticsAction(options: {
  period: InventoryTimePeriod;
  singleDate?: string;
}) {
  try {
    const admin = await checkAdminAuth();
    const data = await inventoryService.getInventoryAnalytics(admin.restaurantId, options);
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error('Error in getInventoryAnalyticsAction:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory analytics';
    throw new Error(message);
  }
}

/**
 * Server action to update item stock quantity and inventory tracking status.
 */
export async function updateItemStockAction(
  itemId: string,
  stockQuantity: number,
  trackInventory?: boolean
) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) {
      throw new Error('Forbidden: Insufficient permissions to manage inventory');
    }

    const updated = await inventoryService.updateItemStock(
      admin.restaurantId,
      itemId,
      stockQuantity,
      trackInventory
    );

    await logAction(admin.restaurantId, admin.userId, 'INVENTORY_STOCK_UPDATED', null, {
      itemId,
      stockQuantity,
      trackInventory,
    });

    revalidateTag(`menu-${admin.restaurantId}`, 'max');
    revalidatePath(`/admin/inventory`);
    revalidatePath(`/admin/menu`);
    revalidatePath(`/menu/${admin.restaurantId}`);

    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Error in updateItemStockAction:', error);
    const message = error instanceof Error ? error.message : 'Failed to update item stock';
    throw new Error(message);
  }
}

/**
 * Server action to quickly toggle item availability (In Stock / Out of Stock).
 */
export async function toggleItemAvailabilityAction(itemId: string, available: boolean) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) {
      throw new Error('Forbidden: Insufficient permissions to change item availability');
    }

    const updated = await inventoryService.toggleItemAvailability(
      admin.restaurantId,
      itemId,
      available
    );

    await logAction(admin.restaurantId, admin.userId, 'INVENTORY_AVAILABILITY_TOGGLED', null, {
      itemId,
      available,
    });

    revalidateTag(`menu-${admin.restaurantId}`, 'max');
    revalidatePath(`/admin/inventory`);
    revalidatePath(`/admin/menu`);
    revalidatePath(`/menu/${admin.restaurantId}`);

    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Error in toggleItemAvailabilityAction:', error);
    const message = error instanceof Error ? error.message : 'Failed to toggle item availability';
    throw new Error(message);
  }
}
