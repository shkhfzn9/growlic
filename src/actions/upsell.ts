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
 * Server action to retrieve complete upsell configs including rules, tiers, and computed affinity charts.
 * 
 * @param restaurantId The restaurant identifier slug.
 * @returns Serialized, plain configuration dataset.
 */
export async function getUpsellConfig(restaurantId: string) {
  try {
    const config = await menuService.getUpsellConfig(restaurantId);
    return JSON.parse(JSON.stringify(config));
  } catch (error) {
    console.error('Error fetching upsell config action:', error);
    throw new Error('Failed to load recommendation settings');
  }
}

/**
 * Server action to update a menu item's category.
 * Triggers Next.js path revalidation.
 * 
 * @param itemId Target item database identifier.
 * @param category Target category name.
 * @returns Serialized, plain modified menu item object.
 */
export async function updateMenuItemCategory(itemId: string, category: string) {
  try {
    const admin = await checkAdminAuth();
    const updated = await menuService.updateMenuItem(itemId, admin.restaurantId, { category: category.trim() });
    revalidatePath(`/admin/upsell`);
    revalidatePath(`/menu/${admin.restaurantId}`);
    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating category action:', error);
    throw new Error('Failed to update category');
  }
}

/**
 * Server action to update the categories this item triggers cross-sell pairings with.
 * Triggers Next.js path revalidation.
 * 
 * @param itemId Target item database identifier.
 * @param pairsWithCategories Categories list to pair with.
 * @returns Serialized, plain modified menu item object.
 */
export async function updateMenuItemPairsWith(itemId: string, pairsWithCategories: string[]) {
  try {
    const admin = await checkAdminAuth();
    const updated = await menuService.updateMenuItem(itemId, admin.restaurantId, { pairsWithCategories });
    revalidatePath(`/admin/upsell`);
    revalidatePath(`/menu/${admin.restaurantId}`);
    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating pairings action:', error);
    throw new Error('Failed to update item pairings');
  }
}

/**
 * Server action to toggle a menu item's active/live availability state.
 * Triggers Next.js path revalidation.
 * 
 * @param itemId Target item database identifier.
 * @param active Visible flag state to set.
 * @returns Serialized, plain modified menu item object.
 */
export async function updateMenuItemActive(itemId: string, active: boolean) {
  try {
    const admin = await checkAdminAuth();
    const updated = await menuService.updateMenuItem(itemId, admin.restaurantId, { active, available: active });
    revalidatePath(`/admin/upsell`);
    revalidatePath(`/menu/${admin.restaurantId}`);
    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating item state action:', error);
    throw new Error('Failed to update item active status');
  }
}

/**
 * Server action to save or update a category pairing rule.
 * Triggers Next.js path revalidation.
 * 
 * @param data Pairing rule configuration parameters.
 * @returns Serialized, plain saved rule object.
 */
export async function savePairingRule(data: {
  _id?: string;
  triggerCategory: string;
  suggestCategories: string[];
  active: boolean;
}) {
  try {
    const admin = await checkAdminAuth();
    const rule = await menuService.savePairingRule(admin.restaurantId, data);
    revalidatePath(`/admin/upsell`);
    return JSON.parse(JSON.stringify(rule));
  } catch (error) {
    console.error('Error saving pairing rule action:', error);
    throw new Error('Failed to save pairing rule');
  }
}

/**
 * Server action to delete a pairing rule.
 * Triggers Next.js path revalidation.
 * 
 * @param id Target rule ID string.
 * @returns Resolves to success state object.
 */
export async function deletePairingRule(id: string) {
  try {
    const admin = await checkAdminAuth();
    await menuService.deletePairingRule(id, admin.restaurantId);
    revalidatePath(`/admin/upsell`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting pairing rule action:', error);
    throw new Error('Failed to delete pairing rule');
  }
}

/**
 * Server action to save or update a discount tier rule.
 * Triggers Next.js path revalidation.
 * 
 * @param data Discount tier configuration parameters.
 * @returns Serialized, plain saved tier object.
 */
export async function saveDiscountTier(data: {
  _id?: string;
  minSpend: number;
  percentOff: number;
  categoryScope: string | null;
  active?: boolean;
}) {
  try {
    const admin = await checkAdminAuth();
    const tier = await menuService.saveDiscountTier(admin.restaurantId, data);
    revalidatePath(`/admin/upsell`);
    return JSON.parse(JSON.stringify(tier));
  } catch (error) {
    console.error('Error saving discount tier action:', error);
    throw new Error('Failed to save discount tier');
  }
}

/**
 * Server action to delete a discount tier.
 * Triggers Next.js path revalidation.
 * 
 * @param id Target tier ID string.
 * @returns Resolves to success state object.
 */
export async function deleteDiscountTier(id: string) {
  try {
    const admin = await checkAdminAuth();
    await menuService.deleteDiscountTier(id, admin.restaurantId);
    revalidatePath(`/admin/upsell`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting discount tier action:', error);
    throw new Error('Failed to delete discount tier');
  }
}

/**
 * Server action to save or update a combo rule.
 * Triggers Next.js path revalidation.
 * 
 * @param data Combo rule configuration parameters.
 * @returns Serialized, plain saved rule object.
 */
export async function saveComboRule(data: {
  _id?: string;
  conditionCategory: string;
  conditionExcludeCategory: string | null;
  rewardType: 'free_item' | 'percent_off_item' | 'percent_off_order';
  rewardTarget: string;
  customerMessage: string;
  active: boolean;
}) {
  try {
    const admin = await checkAdminAuth();
    const rule = await menuService.saveComboRule(admin.restaurantId, data);
    revalidatePath(`/admin/upsell`);
    return JSON.parse(JSON.stringify(rule));
  } catch (error) {
    console.error('Error saving combo rule action:', error);
    throw new Error('Failed to save combo rule');
  }
}

/**
 * Server action to delete a combo rule.
 * Triggers Next.js path revalidation.
 * 
 * @param id Target rule ID string.
 * @returns Resolves to success state object.
 */
export async function deleteComboRule(id: string) {
  try {
    const admin = await checkAdminAuth();
    await menuService.deleteComboRule(id, admin.restaurantId);
    revalidatePath(`/admin/upsell`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting combo rule action:', error);
    throw new Error('Failed to delete combo rule');
  }
}
