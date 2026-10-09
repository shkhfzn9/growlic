import * as adminRepo from './repository';
import * as menuItemRepo from '@/features/menu/repositories/menuRepository';
import * as discountTierRepo from '@/features/menu/repositories/discountTierRepository';
import * as comboRuleRepo from '@/features/menu/repositories/comboRuleRepository';
import * as pairingRuleRepo from '@/features/menu/repositories/pairingRuleRepository';
import * as bannerRepo from '@/features/menu/repositories/bannerRepository';
import { getDefaultBanners } from '@/config/businessVocabulary';
import { hashPassword, comparePassword, signToken, verifyToken } from '@/lib/auth';
import { AuthenticationError, ConflictError, ValidationError } from '@/shared/errors';
import { IAdmin } from './types';
import {
  getAdminByRestaurantIdValidation,
  authenticateAdminValidation,
  registerRestaurantValidation,
} from './validation';
import crypto from 'crypto';
import { logAction } from '@/features/audit';

const SVG_MOMO = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+lnzwvdGV4dD48L3N2Zz4=`;
const SVG_RICE = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+fjzwvdGV4dD48L3N2Zz4=`;
const SVG_BOWL = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+NuDwvdGV4dD48L3N2Zz4=`;
const SVG_SNACKS = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+fjzwvdGV4dD48L3N2Zz4=`;

/**
 * Retrieves the restaurant administrator profile details matched by the restaurant slug ID.
 * Throws a ValidationError if the restaurantId argument is missing.
 * 
 * @param restaurantId The unique identifier slug of the restaurant tenant.
 * @returns The matching IAdmin profile record, or null.
 */
export async function getAdminByRestaurantId(restaurantId: string): Promise<IAdmin | null> {
  getAdminByRestaurantIdValidation(restaurantId);
  return adminRepo.findByRestaurantId(restaurantId);
}

/**
 * Authenticates an Admin using email credentials.
 * Hashes and matches password inputs, generating a signed JWT token if credentials are valid.
 * 
 * @param email The admin email address.
 * @param password The raw password input.
 * @returns An object containing the IAdmin profile and a signed JWT authorization string.
 */
const DUMMY_HASH = '$2a$10$e857X/O6S/aEa1F3n/6gUO.4d6r1M/8.jV9N2Q.E1R8nQ7g.6eG6S';

export async function authenticateAdmin(email: string, password?: string) {
  authenticateAdminValidation(email, password);

  console.log('[SERVICE AUTH] Authenticating email:', email);
  const result = await adminRepo.findWithPasswordByEmail(undefined, email);
  if (!result) {
    console.log('[SERVICE AUTH] Admin document not found for email:', email);
    // Perform dummy bcrypt comparison to ensure constant-time response and prevent timing attacks
    await comparePassword(password || 'dummy', DUMMY_HASH);
    await logAction('system', undefined, 'LOGIN_FAILED', null, { email });
    throw new AuthenticationError('Invalid credentials');
  }

  console.log('[SERVICE AUTH] Found admin document:', {
    email: result.admin.email,
    restaurantId: result.admin.restaurantId,
    role: result.admin.role,
  });

  const isMatch = await comparePassword(password!, result.passwordHash);
  console.log('[SERVICE AUTH] Password match:', isMatch);
  if (!isMatch) {
    console.log('[SERVICE AUTH] Password mismatch for:', email);
    await logAction(result.admin.restaurantId, result.admin._id, 'LOGIN_FAILED', null, { email });
    throw new AuthenticationError('Invalid credentials');
  }

  const token = signToken({
    email: result.admin.email,
    restaurantId: result.admin.restaurantId,
    restaurantName: result.admin.restaurantName,
    role: result.admin.role,
  });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await adminRepo.createSession(
    result.admin.restaurantId,
    result.admin._id,
    tokenHash,
    expiresAt
  );

  await logAction(result.admin.restaurantId, result.admin._id, 'LOGIN_SUCCESS', null, { email: result.admin.email });

  return {
    admin: result.admin,
    token,
  };
}


/**
 * Registers a new Restaurant account profile and seeds initial onboarding mock/starter rules.
 * Performs unique identifier validations (emails, restaurant slugs) and formats input data.
 * 
 * @param data Account properties including name, slug, email, password, phone, and role.
 * @returns The newly created IAdmin record.
 */
export async function registerRestaurant(data: {
  restaurantName: string;
  restaurantId: string;
  email: string;
  password?: string;
  phone: string;
  designation: string;
  businessCategory?: string;
}) {
  const { phoneClean } = registerRestaurantValidation(data);
  const { restaurantName, restaurantId, email, password, designation, businessCategory = 'restaurant' } = data;

  const existingEmail = await adminRepo.findByEmail(restaurantId, email);
  if (existingEmail) {
    throw new ConflictError('Email address is already registered');
  }

  const existingSlug = await adminRepo.findByRestaurantId(restaurantId);
  if (existingSlug) {
    throw new ConflictError('Restaurant ID is already taken. Please choose another one.');
  }

  let role: 'owner' | 'manager' | 'staff' = 'owner';
  const designationLower = designation.toLowerCase().trim();
  if (designationLower === 'owner') role = 'owner';
  else if (designationLower === 'manager') role = 'manager';
  else if (designationLower === 'staff') role = 'staff';

  // Determine theme preset by business category
  let defaultPreset = 'burgundy';
  let defaultPrimary = '#C0181A';
  let defaultDark = '#8B0000';
  let defaultDarker = '#6B0000';
  let defaultAccent = '#F5C518';

  if (businessCategory === 'salon') {
    defaultPreset = 'rose_quartz';
    defaultPrimary = '#EC4899';
    defaultDark = '#831843';
    defaultDarker = '#4C0519';
    defaultAccent = '#F472B6';
  } else if (businessCategory === 'detailing') {
    defaultPreset = 'carbon_crimson';
    defaultPrimary = '#EF4444';
    defaultDark = '#18181B';
    defaultDarker = '#09090B';
    defaultAccent = '#F87171';
  } else if (businessCategory === 'retail') {
    defaultPreset = 'purple';
    defaultPrimary = '#8B5CF6';
    defaultDark = '#4C1D95';
    defaultDarker = '#2E1065';
    defaultAccent = '#F43F5E';
  }

  const hashedPassword = await hashPassword(password!);
  const newAdmin = await adminRepo.create({
    email,
    password: hashedPassword,
    restaurantId,
    restaurantName,
    phone: phoneClean,
    whatsappNumber: phoneClean,
    designation,
    role,
    businessCategory,
    themePreset: defaultPreset,
    primaryColor: defaultPrimary,
    themeGradientDark: defaultDark,
    themeGradientDarker: defaultDarker,
    themeAccentColor: defaultAccent,
    welcomeMessage: businessCategory === 'salon'
      ? 'Welcome to our Luxury Salon & Spa!'
      : businessCategory === 'detailing'
      ? 'Welcome to our Auto Detailing Studio!'
      : businessCategory === 'retail'
      ? 'Welcome to our Boutique Store!'
      : 'Welcome to our restaurant!',
  });

  const tenantId = newAdmin.restaurantId;

  // Business Specific Onboarding Starter Seeds
  let starterMenu = [];

  if (businessCategory === 'salon') {
    starterMenu = [
      {
        restaurantId: tenantId,
        category: 'Hair Treatments',
        name: 'Signature Haircut & Styling',
        description: 'Precision cut, wash, scalp massage, and professional blow-dry styling.',
        image: '/dish_placeholder.jpg',
        price: 599,
        available: true,
        pairsWithCategories: ['Spa Therapy'],
        active: true,
      },
      {
        restaurantId: tenantId,
        category: 'Hair Treatments',
        name: 'Keratin Smoothing Therapy',
        description: 'Deep restorative keratin treatment for smooth, frizz-free, ultra-shiny hair.',
        image: '/dish_placeholder.jpg',
        price: 2499,
        available: true,
        pairsWithCategories: ['Spa Therapy'],
        active: true,
      },
      {
        restaurantId: tenantId,
        category: 'Spa Therapy',
        name: 'Hydra Glow Facial Spa',
        description: 'Deep pore cleansing, exfoliation, hydration mask, and relaxing face massage.',
        image: '/dish_placeholder.jpg',
        price: 1299,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
    ];
  } else if (businessCategory === 'detailing') {
    starterMenu = [
      {
        restaurantId: tenantId,
        category: 'Detailing Packages',
        name: 'Ceramic Coating Protection (9H)',
        description: '3-layer 9H nano-ceramic glass shield for ultra gloss, hydrophobic water repelling, and scratch defense.',
        image: '/dish_placeholder.jpg',
        price: 9999,
        available: true,
        pairsWithCategories: ['Wash & Polish'],
        active: true,
      },
      {
        restaurantId: tenantId,
        category: 'Detailing Packages',
        name: 'Deep Interior Spa & Sanitization',
        description: 'Steam extraction, leather conditioning, dashboard dressing, and antibacterial UV sanitization.',
        image: '/dish_placeholder.jpg',
        price: 1999,
        available: true,
        pairsWithCategories: ['Wash & Polish'],
        active: true,
      },
      {
        restaurantId: tenantId,
        category: 'Wash & Polish',
        name: 'Premium Snow Foam Wash & Wax',
        description: 'pH neutral snow foam pre-wash, 2-bucket hand wash, alloy wheel de-con, and synthetic spray sealant.',
        image: '/dish_placeholder.jpg',
        price: 799,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
    ];
  } else {
    // Default Restaurant & Cafe Starter Menu
    starterMenu = [
      {
        restaurantId: tenantId,
        category: 'Classic Momos',
        name: 'Veg Steamed Momos',
        description: 'Authentic steamed dumplings stuffed with finely minced fresh seasonal vegetables and herbs.',
        image: SVG_MOMO,
        price: 129,
        available: true,
        pairsWithCategories: ['Drinks'],
        active: true,
      },
      {
        restaurantId: tenantId,
        category: 'Classic Momos',
        name: 'Chicken Fried Momos',
        description: 'Crispy golden-fried momos filled with spiced succulent chicken mince. Served with hot chilli sauce.',
        image: SVG_MOMO,
        price: 159,
        available: true,
        pairsWithCategories: ['Drinks'],
        active: true,
      },
      {
        restaurantId: tenantId,
        category: 'Biryani',
        name: 'Veg Dum Biryani',
        description: 'Slow-cooked aromatic basmati rice layered with fresh vegetables, saffron, and traditional spices.',
        image: SVG_RICE,
        price: 249,
        available: true,
        pairsWithCategories: ['Drinks'],
        active: true,
      },
      {
        restaurantId: tenantId,
        category: 'Drinks',
        name: 'Fresh Lime Soda',
        description: 'Chilled carbonated soda with squeezed fresh key lime juice, organic sugar syrup, and mint sprigs.',
        image: SVG_BOWL,
        price: 59,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
    ];
  }

  await menuItemRepo.insertMany(tenantId, starterMenu);

  // Onboarding Seeds for Domain-Specific Discounts & Banners
  const seedBanners = getDefaultBanners(businessCategory, tenantId);
  for (const b of seedBanners) {
    await bannerRepo.create({
      restaurantId: tenantId,
      title: b.title,
      subtitle: b.subtitle,
      buttonText: b.buttonText,
      buttonLink: b.buttonLink,
      image: b.image,
      active: true,
    });
  }

  if (businessCategory === 'salon') {
    await discountTierRepo.create({
      restaurantId: tenantId,
      minSpend: 999,
      percentOff: 10,
      categoryScope: null,
      active: true,
    });
    await comboRuleRepo.create({
      restaurantId: tenantId,
      conditionCategory: 'Hair Styling & Treatment',
      conditionExcludeCategory: 'Skin & Facial Care',
      rewardType: 'percent_off_item',
      rewardTarget: 'Skin & Facial Care:50',
      customerMessage: 'Free Hair Wash & Styling with any Hair Color!',
      active: true,
    });
    await pairingRuleRepo.create({
      restaurantId: tenantId,
      triggerCategory: 'Hair Styling & Treatment',
      suggestCategories: ['Skin & Facial Care'],
      active: true,
    });
  } else if (businessCategory === 'detailing') {
    await discountTierRepo.create({
      restaurantId: tenantId,
      minSpend: 1999,
      percentOff: 10,
      categoryScope: null,
      active: true,
    });
    await comboRuleRepo.create({
      restaurantId: tenantId,
      conditionCategory: 'Paint Protection & Coating',
      conditionExcludeCategory: 'Wash & Polish',
      rewardType: 'percent_off_item',
      rewardTarget: 'Wash & Polish:50',
      customerMessage: 'Free Interior Detailing with Ceramic Coating!',
      active: true,
    });
    await pairingRuleRepo.create({
      restaurantId: tenantId,
      triggerCategory: 'Paint Protection & Coating',
      suggestCategories: ['Wash & Polish'],
      active: true,
    });
  } else if (businessCategory === 'retail') {
    await discountTierRepo.create({
      restaurantId: tenantId,
      minSpend: 499,
      percentOff: 10,
      categoryScope: null,
      active: true,
    });
    await comboRuleRepo.create({
      restaurantId: tenantId,
      conditionCategory: 'Apparel & Clothing',
      conditionExcludeCategory: 'Footwear & Accessories',
      rewardType: 'percent_off_item',
      rewardTarget: 'Footwear & Accessories:50',
      customerMessage: 'Buy 2 Get 1 FREE on all Fashion Apparel!',
      active: true,
    });
    await pairingRuleRepo.create({
      restaurantId: tenantId,
      triggerCategory: 'Apparel & Clothing',
      suggestCategories: ['Footwear & Accessories'],
      active: true,
    });
  } else {
    await discountTierRepo.create({
      restaurantId: tenantId,
      minSpend: 399,
      percentOff: 10,
      categoryScope: null,
      active: true,
    });
    await comboRuleRepo.create({
      restaurantId: tenantId,
      conditionCategory: 'Classic Momos',
      conditionExcludeCategory: 'Drinks',
      rewardType: 'percent_off_item',
      rewardTarget: 'Drinks:50',
      customerMessage: 'Add a Drink at 50% OFF with any Momos!',
      active: true,
    });
    await pairingRuleRepo.create({
      restaurantId: tenantId,
      triggerCategory: 'Classic Momos',
      suggestCategories: ['Drinks'],
      active: true,
    });
  }

  return newAdmin;
}

/**
 * Validates a session by checking if it exists in the DB, is not revoked, and is not expired.
 */
export async function validateSession(restaurantId: string, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await adminRepo.findSessionByTokenHash(restaurantId, tokenHash);
    if (!session) return false;
    if (session.revoked) return false;

    const expiryDate = new Date(session.expiresAt);
    if (expiryDate.getTime() < Date.now()) return false;

    return true;
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
}

/**
 * Revokes a session by token.
 */
export async function revokeSession(restaurantId: string, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return await adminRepo.revokeSession(restaurantId, tokenHash);
  } catch (error) {
    console.error('Error revoking session:', error);
    return false;
  }
}

// Role-Based Authorization
const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ['manage_users', 'change_pricing', 'view_analytics', 'edit_menu', 'manage_orders', 'update_order_status', 'manage_branding', 'manage_settings'],
  manager: ['edit_menu', 'manage_orders', 'update_order_status', 'manage_branding', 'manage_settings'],
  staff: ['update_order_status'],
  restaurant_admin: ['manage_users', 'change_pricing', 'view_analytics', 'edit_menu', 'manage_orders', 'update_order_status', 'manage_branding', 'manage_settings'],
  super_admin: ['manage_users', 'change_pricing', 'view_analytics', 'edit_menu', 'manage_orders', 'update_order_status', 'manage_branding', 'manage_settings'],
};

/**
 * Checks whether a given role holds the requested permission.
 */
export function hasPermission(role: string, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Checks whether the currently authenticated admin token holds the requested permission.
 */
export async function can(permission: string, token: string, restaurantId: string): Promise<boolean> {
  const isValid = await validateSession(restaurantId, token);
  if (!isValid) return false;

  const decoded = verifyToken(token);
  if (!decoded) return false;

  const admin = await adminRepo.findByEmail(restaurantId, decoded.email);
  if (!admin) return false;

  return hasPermission(admin.role, permission);
}

/**
 * Updates restaurant branding configuration.
 */
export async function updateRestaurantBranding(
  restaurantId: string,
  data: {
    restaurantName?: string;
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
  }
) {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
  return adminRepo.updateBranding(restaurantId, data);
}

/**
 * Updates the push notification tokens for a specific restaurant/tenant.
 */
export async function updatePushTokens(
  restaurantId: string,
  expoPushToken: string | null,
  fcmToken: string | null
) {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
  return adminRepo.updatePushTokens(restaurantId, expoPushToken, fcmToken);
}

export async function removeStaleFcmToken(restaurantId: string, staleFcmToken: string) {
  if (!restaurantId || !staleFcmToken) return;
  return adminRepo.removeStaleFcmToken(restaurantId, staleFcmToken);
}


