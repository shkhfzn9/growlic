import * as menuItemRepo from '@/repositories/menuItemRepository';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { IMenuItem } from '@/types';

/**
 * Retrieves all menu items registered under a specific restaurant.
 * Throws a ValidationError if the restaurantId argument is missing.
 * 
 * @param restaurantId The unique identifier slug of the restaurant tenant.
 * @returns A list of normalized IMenuItem objects.
 */
export async function getMenuItems(restaurantId: string): Promise<IMenuItem[]> {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
  return menuItemRepo.findAll(restaurantId);
}

/**
 * Retrieves a single menu item by its database ID.
 * Throws ValidationError if ID is missing or NotFoundError if no item matches.
 * 
 * @param id The database ID string.
 * @returns The matching, normalized IMenuItem record.
 */
export async function getMenuItemById(id: string): Promise<IMenuItem> {
  if (!id) {
    throw new ValidationError('Item ID is required');
  }
  const item = await menuItemRepo.findById(id);
  if (!item) {
    throw new NotFoundError('Menu item not found');
  }
  return item;
}

/**
 * Creates a new menu item inside the specified restaurant tenant.
 * Validates that category, name, and pricing are correctly defined.
 * 
 * @param restaurantId The identifier of the restaurant tenant.
 * @param data The configuration properties of the new menu item.
 * @returns The newly created and normalized menu item object.
 */
export async function createMenuItem(restaurantId: string, data: Partial<IMenuItem> & { category: string; name: string; price: number }) {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
  if (!data.category || !data.name || data.price === undefined) {
    throw new ValidationError('Category, name, and price are required');
  }
  return menuItemRepo.create({
    ...data,
    restaurantId,
  });
}

/**
 * Updates menu item configurations after validating ownership scopes.
 * 
 * @param id The database ID string of the target menu item.
 * @param restaurantId The active restaurant slug of the administrator.
 * @param data The updated menu item properties.
 * @returns The updated, normalized menu item object.
 */
export async function updateMenuItem(id: string, restaurantId: string, data: Partial<IMenuItem>) {
  if (!id) {
    throw new ValidationError('Item ID is required');
  }
  const item = await menuItemRepo.findById(id);
  if (!item || item.restaurantId !== restaurantId) {
    throw new NotFoundError('Unauthorized or item not found');
  }
  return menuItemRepo.update(id, data);
}

/**
 * Toggles the instant availability status of a menu item.
 * 
 * @param id The database ID string of the target menu item.
 * @param restaurantId The active restaurant slug of the administrator.
 * @param available The target availability state to set.
 * @returns The updated, normalized menu item object.
 */
export async function toggleMenuItemAvailability(id: string, restaurantId: string, available: boolean) {
  if (!id) {
    throw new ValidationError('Item ID is required');
  }
  const item = await menuItemRepo.findById(id);
  if (!item || item.restaurantId !== restaurantId) {
    throw new NotFoundError('Unauthorized or item not found');
  }
  return menuItemRepo.update(id, { available });
}

/**
 * Deletes a menu item after checking security and tenant ownership.
 * 
 * @param id The target menu item ID string.
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @returns Resolves to true if deleted successfully.
 */
export async function deleteMenuItem(id: string, restaurantId: string) {
  if (!id) {
    throw new ValidationError('Item ID is required');
  }
  const item = await menuItemRepo.findById(id);
  if (!item || item.restaurantId !== restaurantId) {
    throw new NotFoundError('Unauthorized or item not found');
  }
  return menuItemRepo.deleteItem(id);
}
