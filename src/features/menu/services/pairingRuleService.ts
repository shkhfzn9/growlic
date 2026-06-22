import * as pairingRuleRepo from '../repositories/pairingRuleRepository';
import { ValidationError, NotFoundError } from '@/shared/errors';
import { IPairingRule } from '../types';

/**
 * Retrieves all pairing rules matching a specific restaurant ID.
 * Throws a ValidationError if the restaurantId argument is missing.
 * 
 * @param restaurantId The unique identifier slug of the restaurant tenant.
 * @returns A list of normalized IPairingRule objects.
 */
export async function getPairingRules(restaurantId: string): Promise<IPairingRule[]> {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
  return pairingRuleRepo.findAll(restaurantId);
}

/**
 * Saves or updates a pairing rule config in the database.
 * If data contains an `_id`, it updates the matching rule; otherwise, it creates a new rule.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param data Configuration values detailing trigger category, suggestions array, active status, and optional target ID.
 * @returns The saved or updated IPairingRule record.
 */
export async function savePairingRule(restaurantId: string, data: {
  _id?: string;
  triggerCategory: string;
  suggestCategories: string[];
  active: boolean;
}) {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
  if (!data.triggerCategory || !data.suggestCategories || data.suggestCategories.length === 0) {
    throw new ValidationError('Trigger category and suggest categories are required');
  }

  if (data._id) {
    const existing = await pairingRuleRepo.update(data._id, restaurantId, {
      triggerCategory: data.triggerCategory,
      suggestCategories: data.suggestCategories,
      active: data.active,
    });
    if (!existing) {
      throw new NotFoundError('Pairing rule not found');
    }
    return existing;
  } else {
    return pairingRuleRepo.create({
      restaurantId,
      triggerCategory: data.triggerCategory,
      suggestCategories: data.suggestCategories,
      active: data.active,
    });
  }
}

/**
 * Deletes a pairing rule after validating rule ownership.
 * Throws a ValidationError if IDs are missing, or a NotFoundError if the rule wasn't deleted.
 * 
 * @param id The target rule database identifier.
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @returns Resolves to true if deleted successfully.
 */
export async function deletePairingRule(id: string, restaurantId: string): Promise<boolean> {
  if (!id || !restaurantId) {
    throw new ValidationError('Rule ID and Restaurant ID are required');
  }
  const deleted = await pairingRuleRepo.deleteRule(id, restaurantId);
  if (!deleted) {
    throw new NotFoundError('Pairing rule not found');
  }
  return deleted;
}
