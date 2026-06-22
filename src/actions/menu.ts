'use server';

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import * as menuService from '@/features/menu';

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
    const item = await menuService.getMenuItemById(id);
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
    const newItem = await menuService.createMenuItem(admin.restaurantId, data);
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
    const updatedItem = await menuService.updateMenuItem(id, admin.restaurantId, data);
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
    const item = await menuService.toggleMenuItemAvailability(id, admin.restaurantId, available);
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
    await menuService.deleteMenuItem(id, admin.restaurantId);
    revalidatePath(`/menu/${admin.restaurantId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting menu item action:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete menu item';
    throw new Error(message);
  }
}
