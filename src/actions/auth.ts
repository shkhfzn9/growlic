'use server';

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { validateSession, getAdminByRestaurantId, updateRestaurantBranding, can } from '@/features/auth';

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

  return { ...decoded, token, userId: admin._id };
}

/**
 * Server action to save branding configuration details.
 */
export async function saveRestaurantBranding(data: {
  logoUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  loyaltyEnabled?: boolean;
  callStaffEnabled?: boolean;
  stampsRequired?: number;
  discountPercentage?: number;
  maintenanceModeEnabled?: boolean;
  maintenanceMessage?: string;
  maintenanceEstimatedRestore?: string;
  whatsappNumber?: string;
  phone?: string;
  themePreset?: string;
  themeGradientDark?: string;
  themeGradientDarker?: string;
  themeAccentColor?: string;
}) {
  try {
    const admin = await checkAdminAuth();
    // Only owners/managers can edit branding configurations
    const isAllowed = await can('edit_menu', admin.token, admin.restaurantId);
    if (!isAllowed) {
      throw new Error('Forbidden: Insufficient permissions to change settings');
    }

    const updated = await updateRestaurantBranding(admin.restaurantId, data);
    
    revalidatePath(`/admin/settings`);
    revalidatePath(`/menu/${admin.restaurantId}`);
    revalidatePath(`/cart`);
    revalidateTag(`menu-${admin.restaurantId}`, 'max');
    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving restaurant branding:', error);
    const message = error instanceof Error ? error.message : 'Failed to save branding configurations';
    throw new Error(message);
  }
}

/**
 * Server action to retrieve the current restaurant admin/branding configurations.
 */
export async function getRestaurantDetails() {
  try {
    const admin = await checkAdminAuth();
    // Fetch the fresh DB admin document (which contains the branding fields)
    const freshAdmin = await getAdminByRestaurantId(admin.restaurantId);
    if (!freshAdmin) {
      throw new Error('Restaurant details not found');
    }
    return JSON.parse(JSON.stringify(freshAdmin));
  } catch (error) {
    console.error('Error fetching restaurant details:', error);
    const message = error instanceof Error ? error.message : 'Failed to retrieve settings details';
    throw new Error(message);
  }
}

/**
 * Public Server Action to retrieve restaurant maintenance & public configuration settings.
 */
export async function getPublicRestaurantSettings(restaurantId: string) {
  try {
    if (!restaurantId) return null;
    const cleanId = restaurantId.toLowerCase().trim();
    const admin = await getAdminByRestaurantId(cleanId);
    if (!admin) return null;
    return {
      restaurantName: admin.restaurantName,
      logoUrl: admin.logoUrl || '',
      maintenanceModeEnabled: !!admin.maintenanceModeEnabled,
      maintenanceMessage: admin.maintenanceMessage || 'Kitchen is currently under maintenance. Ordering will resume shortly.',
      maintenanceEstimatedRestore: admin.maintenanceEstimatedRestore || '',
    };
  } catch (error) {
    console.error('Error fetching public restaurant settings:', error);
    return null;
  }
}

