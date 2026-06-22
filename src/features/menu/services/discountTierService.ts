import * as discountTierRepo from '../repositories/discountTierRepository';
import { ValidationError, NotFoundError } from '@/shared/errors';
import { IDiscountTier } from '../types';

/**
 * Retrieves all discount tiers matching a specific restaurant ID.
 * Tiers are sorted in ascending order of their minimum spend requirements.
 * Throws a ValidationError if the restaurantId argument is missing.
 * 
 * @param restaurantId The unique identifier slug of the restaurant tenant.
 * @returns A list of normalized IDiscountTier objects.
 */
export async function getDiscountTiers(restaurantId: string): Promise<IDiscountTier[]> {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
  return discountTierRepo.findAll(restaurantId);
}

/**
 * Saves or updates a discount tier config in the database.
 * If data contains an `_id`, it updates the matching tier; otherwise, it creates a new tier.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param data Configuration values detailing minimum spend, percentage off, category scope and optional target ID.
 * @returns The saved or updated IDiscountTier record.
 */
export async function saveDiscountTier(restaurantId: string, data: {
  _id?: string;
  minSpend: number;
  percentOff: number;
  categoryScope: string | null;
  active?: boolean;
}) {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
  if (data.minSpend === undefined || data.percentOff === undefined) {
    throw new ValidationError('Minimum spend and percent off are required');
  }

  if (data._id) {
    const existing = await discountTierRepo.update(data._id, restaurantId, {
      minSpend: data.minSpend,
      percentOff: data.percentOff,
      categoryScope: data.categoryScope,
      active: data.active,
    });
    if (!existing) {
      throw new NotFoundError('Discount tier not found');
    }
    return existing;
  } else {
    return discountTierRepo.create({
      restaurantId,
      minSpend: data.minSpend,
      percentOff: data.percentOff,
      categoryScope: data.categoryScope,
      active: data.active,
    });
  }
}

/**
 * Deletes a discount tier after validating tier ownership.
 * Throws a ValidationError if IDs are missing, or a NotFoundError if the tier wasn't deleted.
 * 
 * @param id The target tier database identifier.
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @returns Resolves to true if deleted successfully.
 */
export async function deleteDiscountTier(id: string, restaurantId: string): Promise<boolean> {
  if (!id || !restaurantId) {
    throw new ValidationError('Tier ID and Restaurant ID are required');
  }
  const deleted = await discountTierRepo.deleteTier(id, restaurantId);
  if (!deleted) {
    throw new NotFoundError('Discount tier not found');
  }
  return deleted;
}
