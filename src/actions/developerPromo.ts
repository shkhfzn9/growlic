'use server';

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import * as menuService from '@/features/menu';

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

  return decoded;
}

/**
 * Server action to get developer promo settings for a specific restaurant (customer facing).
 */
export async function getDeveloperPromo(restaurantId: string) {
  try {
    const promo = await menuService.getDeveloperPromo(restaurantId);
    return JSON.parse(JSON.stringify(promo));
  } catch (error) {
    console.error('Error fetching developer promo action:', error);
    return null;
  }
}

/**
 * Server action to get developer promo settings for logged-in admin's restaurant.
 */
export async function getAdminDeveloperPromo() {
  try {
    const admin = await checkAdminAuth();
    const promo = await menuService.getDeveloperPromo(admin.restaurantId);
    return JSON.parse(JSON.stringify(promo));
  } catch (error) {
    console.error('Error fetching admin developer promo action:', error);
    throw new Error('Failed to load developer promo settings');
  }
}

/**
 * Server action to save/update developer promo settings for logged-in admin's restaurant.
 */
export async function saveDeveloperPromo(data: {
  active?: boolean;
  position?: number;
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaLink?: string;
  bgColorFrom?: string;
  bgColorTo?: string;
  textColor?: string;
  ctaBgColor?: string;
  ctaTextColor?: string;
  badgeText?: string;
  image?: string;
}) {
  try {
    const admin = await checkAdminAuth();
    const promo = await menuService.saveDeveloperPromo(admin.restaurantId, data);
    revalidateTag(`menu-${admin.restaurantId}`, 'max');
    revalidatePath(`/menu/${admin.restaurantId}`);
    revalidatePath(`/admin/developer-promo`);
    return JSON.parse(JSON.stringify(promo));
  } catch (error) {
    console.error('Error saving developer promo action:', error);
    throw new Error('Failed to save developer promo settings');
  }
}
