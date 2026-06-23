import * as adminRepo from './repository';
import * as menuItemRepo from '@/features/menu/repositories/menuRepository';
import * as discountTierRepo from '@/features/menu/repositories/discountTierRepository';
import * as comboRuleRepo from '@/features/menu/repositories/comboRuleRepository';
import * as pairingRuleRepo from '@/features/menu/repositories/pairingRuleRepository';
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
export async function authenticateAdmin(email: string, password?: string) {
  authenticateAdminValidation(email, password);

  const result = await adminRepo.findWithPasswordByEmail(undefined, email);
  if (!result) {
    // Log failed login with fallback restaurant ID when admin is not registered
    await logAction('system', undefined, 'LOGIN_FAILED', null, { email });
    throw new AuthenticationError('Invalid credentials');
  }

  const isMatch = await comparePassword(password!, result.passwordHash);
  if (!isMatch) {
    await logAction(result.admin.restaurantId, result.admin._id, 'LOGIN_FAILED', null, { email });
    throw new AuthenticationError('Invalid credentials');
  }

  const token = signToken({
    email: result.admin.email,
    restaurantId: result.admin.restaurantId,
    restaurantName: result.admin.restaurantName,
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
}) {
  const { phoneClean } = registerRestaurantValidation(data);
  const { restaurantName, restaurantId, email, password, designation } = data;

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

  const hashedPassword = await hashPassword(password!);
  const newAdmin = await adminRepo.create({
    email,
    password: hashedPassword,
    restaurantId,
    restaurantName,
    phone: phoneClean,
    designation,
    role,
  });

  const tenantId = newAdmin.restaurantId;

  // Onboarding Seeds
  const starterMenu = [
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
      category: 'Biryani',
      name: 'Chicken Dum Biryani',
      description: 'Classic chicken biryani slow-cooked on dum with aromatic spices and basmati rice.',
      image: SVG_RICE,
      price: 289,
      available: true,
      pairsWithCategories: ['Drinks'],
      active: true,
    },
    {
      restaurantId: tenantId,
      category: 'Tandoori',
      name: 'Paneer Tikka',
      description: 'Cubes of paneer marinated in spiced yogurt and grilled in a traditional tandoor clay oven.',
      image: SVG_SNACKS,
      price: 199,
      available: true,
      pairsWithCategories: ['Drinks'],
      active: true,
    },
    {
      restaurantId: tenantId,
      category: 'Tandoori',
      name: 'Chicken Tandoori (Half)',
      description: 'Tender chicken marinated in yogurt and tandoori spices, grilled to perfection in clay oven.',
      image: SVG_SNACKS,
      price: 269,
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
    {
      restaurantId: tenantId,
      category: 'Drinks',
      name: 'Masala Chai',
      description: 'Brewed black tea with a mixture of aromatic spices and milk.',
      image: SVG_BOWL,
      price: 39,
      available: true,
      pairsWithCategories: [],
      active: true,
    }
  ];

  await menuItemRepo.insertMany(tenantId, starterMenu);

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
  owner: ['manage_users', 'change_pricing', 'view_analytics', 'edit_menu', 'manage_orders', 'update_order_status'],
  manager: ['edit_menu', 'manage_orders', 'update_order_status'],
  staff: ['update_order_status'],
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
    logoUrl?: string;
    primaryColor?: string;
    welcomeMessage?: string;
  }
) {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
  return adminRepo.updateBranding(restaurantId, data);
}


