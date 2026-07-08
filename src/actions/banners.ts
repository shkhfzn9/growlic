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
 * Server action to get all active banners for a restaurant (for customers).
 */
export async function getActiveBanners(restaurantId: string) {
  try {
    const banners = await menuService.getActiveBanners(restaurantId);
    return JSON.parse(JSON.stringify(banners));
  } catch (error) {
    console.error('Error fetching active banners action:', error);
    return [];
  }
}

/**
 * Server action to get all banners for an admin's restaurant.
 */
export async function getAdminBanners() {
  try {
    const admin = await checkAdminAuth();
    const banners = await menuService.getBanners(admin.restaurantId);
    return JSON.parse(JSON.stringify(banners));
  } catch (error) {
    console.error('Error fetching admin banners action:', error);
    throw new Error('Failed to load advertisements');
  }
}

/**
 * Server action to create or update a banner.
 */
export async function saveBanner(data: {
  _id?: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  image?: string;
  active?: boolean;
}) {
  try {
    const admin = await checkAdminAuth();
    const banner = await menuService.saveBanner(admin.restaurantId, data);
    revalidateTag(`menu-${admin.restaurantId}`, 'max');
    revalidatePath(`/menu/${admin.restaurantId}`);
    return JSON.parse(JSON.stringify(banner));
  } catch (error) {
    console.error('Error saving banner action:', error);
    throw new Error('Failed to save advertisement');
  }
}

/**
 * Server action to delete a banner.
 */
export async function deleteBanner(id: string) {
  try {
    const admin = await checkAdminAuth();
    await menuService.deleteBanner(id, admin.restaurantId);
    revalidateTag(`menu-${admin.restaurantId}`, 'max');
    revalidatePath(`/menu/${admin.restaurantId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting banner action:', error);
    throw new Error('Failed to delete advertisement');
  }
}
