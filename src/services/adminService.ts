import * as adminRepo from '@/repositories/adminRepository';
import * as menuItemRepo from '@/repositories/menuItemRepository';
import * as discountTierRepo from '@/repositories/discountTierRepository';
import * as comboRuleRepo from '@/repositories/comboRuleRepository';
import * as pairingRuleRepo from '@/repositories/pairingRuleRepository';
import { hashPassword, comparePassword, signToken } from '@/lib/auth';
import { ValidationError, AuthenticationError, ConflictError } from '@/lib/errors';
import { IAdmin } from '@/types';

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
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
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
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  const result = await adminRepo.findWithPasswordByEmail(email);
  if (!result) {
    throw new AuthenticationError('Invalid credentials');
  }

  const isMatch = await comparePassword(password, result.passwordHash);
  if (!isMatch) {
    throw new AuthenticationError('Invalid credentials');
  }

  const token = signToken({
    email: result.admin.email,
    restaurantId: result.admin.restaurantId,
    restaurantName: result.admin.restaurantName,
  });

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
  const { restaurantName, restaurantId, email, password, phone, designation } = data;

  if (!restaurantName || !restaurantId || !email || !password || !phone || !designation) {
    throw new ValidationError('All fields are required');
  }

  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(restaurantId)) {
    throw new ValidationError('Restaurant ID must contain only lowercase letters, numbers, and dashes (e.g. my-restaurant)');
  }

  if (restaurantId.length < 3) {
    throw new ValidationError('Restaurant ID must be at least 3 characters long');
  }

  const phoneClean = phone.trim().replace(/\D/g, '');
  if (phoneClean.length !== 10) {
    throw new ValidationError('Please enter a valid 10-digit phone number');
  }

  const existingEmail = await adminRepo.findByEmail(email);
  if (existingEmail) {
    throw new ConflictError('Email address is already registered');
  }

  const existingSlug = await adminRepo.findByRestaurantId(restaurantId);
  if (existingSlug) {
    throw new ConflictError('Restaurant ID is already taken. Please choose another one.');
  }

  const hashedPassword = await hashPassword(password);
  const newAdmin = await adminRepo.create({
    email,
    password: hashedPassword,
    restaurantId,
    restaurantName,
    phone: phoneClean,
    designation,
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

  await menuItemRepo.insertMany(starterMenu);

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
