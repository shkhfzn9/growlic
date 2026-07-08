'use server';

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { revalidatePath, unstable_cache, revalidateTag } from 'next/cache';
import * as menuService from '@/features/menu';
import { validateSession, can, getAdminByRestaurantId } from '@/features/auth';
import { logAction } from '@/features/audit';

/**
 * Validates the admin's authentication cookie ('admin_token') and decodes its payload.
 * Throws an Error if the token is missing or invalid.
 * 
 * @returns The decoded admin session JWT token object, raw token, and userId.
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

  return { ...decoded, token, userId: admin._id };
}

/**
 * Server action to retrieve all menu items registered under a specific restaurant.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns Serialized, plain array of menu items.
 */
export async function getMenuItems(restaurantId: string) {
  try {
    const items = await menuService.getMenuItems(restaurantId);
    return JSON.parse(JSON.stringify(items));
  } catch (error) {
    console.error('Error fetching menu items action:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch menu items';
    throw new Error(message);
  }
}

/**
 * Server action to retrieve a single menu item by its database ID.
 * 
 * @param id The database ID string of the target item.
 * @returns Serialized, plain menu item record.
 */
export async function getMenuItemById(id: string) {
  try {
    const admin = await checkAdminAuth();
    const item = await menuService.getMenuItemById(admin.restaurantId, id);
    return JSON.parse(JSON.stringify(item));
  } catch (error) {
    console.error('Error fetching menu item by ID action:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch menu item';
    throw new Error(message);
  }
}

/**
 * Server action to create a new menu item for the authenticated admin's restaurant.
 * Triggers Next.js page revalidation.
 * 
 * @param data Menu item configuration values.
 * @returns Serialized, plain object of the newly created menu item.
 */
export async function createMenuItem(data: {
  category: string;
  name: string;
  description: string;
  image: string;
  price: number;
  available?: boolean;
  images?: string[];
  preparation?: string;
  ingredients?: string[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  spiceLevel?: number;
  portionSize?: string;
  prepTimeMin?: number;
  prepTimeMax?: number;
  chefNote?: string;
}) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) {
      throw new Error('Forbidden: Insufficient permissions to edit menu');
    }

    const newItem = await menuService.createMenuItem(admin.restaurantId, data);
    revalidateTag(`menu-${admin.restaurantId}`, 'max');
    revalidatePath(`/menu/${admin.restaurantId}`);
    return JSON.parse(JSON.stringify(newItem));
  } catch (error) {
    console.error('Error creating menu item action:', error);
    const message = error instanceof Error ? error.message : 'Failed to create menu item';
    throw new Error(message);
  }
}

/**
 * Server action to update configurations of an existing menu item.
 * Triggers Next.js page revalidation.
 * 
 * @param id The database ID of the target item.
 * @param data Updated menu item properties.
 * @returns Serialized, plain updated menu item object.
 */
export async function updateMenuItem(
  id: string,
  data: {
    category: string;
    name: string;
    description: string;
    image: string;
    price: number;
    available?: boolean;
    images?: string[];
    preparation?: string;
    ingredients?: string[];
    nutrition?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    spiceLevel?: number;
    portionSize?: string;
    prepTimeMin?: number;
    prepTimeMax?: number;
    chefNote?: string;
  }
) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) {
      throw new Error('Forbidden: Insufficient permissions to edit menu');
    }

    const existing = await menuService.getMenuItemById(admin.restaurantId, id);
    if (existing && existing.price !== data.price) {
      const isPriceAllowed = await can('change_pricing', admin.token, admin.restaurantId);
      if (!isPriceAllowed) {
        throw new Error('Forbidden: Only owners are allowed to change pricing');
      }
    }

    const updatedItem = await menuService.updateMenuItem(id, admin.restaurantId, data);

    // Audit log menu update/pricing change
    const action = (existing && updatedItem && existing.price !== updatedItem.price) ? 'MENU_PRICE_CHANGED' : 'MENU_UPDATED';
    await logAction(admin.restaurantId, admin.userId, action, existing, updatedItem);

    revalidateTag(`menu-${admin.restaurantId}`, 'max');
    revalidatePath(`/menu/${admin.restaurantId}`);
    return JSON.parse(JSON.stringify(updatedItem));
  } catch (error) {
    console.error('Error updating menu item action:', error);
    const message = error instanceof Error ? error.message : 'Failed to update menu item';
    throw new Error(message);
  }
}

/**
 * Server action to toggle a menu item's active/live availability.
 * Triggers Next.js page revalidation.
 * 
 * @param id The database ID string of the target item.
 * @param available The target availability state to set.
 * @returns Serialized, plain updated menu item object.
 */
export async function toggleMenuItemAvailability(id: string, available: boolean) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) {
      throw new Error('Forbidden: Insufficient permissions to edit menu');
    }

    const existing = await menuService.getMenuItemById(admin.restaurantId, id);
    const item = await menuService.toggleMenuItemAvailability(id, admin.restaurantId, available);

    // Audit log menu update
    await logAction(admin.restaurantId, admin.userId, 'MENU_UPDATED', existing, item);

    revalidateTag(`menu-${admin.restaurantId}`, 'max');
    revalidatePath(`/menu/${admin.restaurantId}`);
    return JSON.parse(JSON.stringify(item));
  } catch (error) {
    console.error('Error toggling menu item availability action:', error);
    const message = error instanceof Error ? error.message : 'Failed to toggle item availability';
    throw new Error(message);
  }
}

/**
 * Server action to delete a menu item from the store.
 * Triggers Next.js page revalidation.
 * 
 * @param id The database ID string of the target item.
 * @returns Resolves to an object indicating success status.
 */
export async function deleteMenuItem(id: string) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) {
      throw new Error('Forbidden: Insufficient permissions to edit menu');
    }

    await menuService.deleteMenuItem(id, admin.restaurantId);
    revalidateTag(`menu-${admin.restaurantId}`, 'max');
    revalidatePath(`/menu/${admin.restaurantId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting menu item action:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete menu item';
    throw new Error(message);
  }
}

/**
 * Server action to retrieve the entire client menu context (admin config, active banners, and upsell data)
 * in a single batch request to reduce roundtrips.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns An object containing the serialized admin, active banners, and upsell configuration.
 */
export async function getRestaurantMenuContext(restaurantId: string) {
  try {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    const cachedFetch = unstable_cache(
      async (restId: string) => {
        const [admin, banners, upsellConfig] = await Promise.all([
          getAdminByRestaurantId(restId),
          menuService.getActiveBanners(restId),
          menuService.getUpsellConfig(restId),
        ]);
        return { admin, banners, upsellConfig };
      },
      ['restaurant-menu-context'],
      {
        tags: [`menu-${restaurantId}`],
        revalidate: 30,
      }
    );

    const data = await cachedFetch(restaurantId);

    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error('Error fetching restaurant menu context action:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch restaurant menu context';
    throw new Error(message);
  }
}

