import * as comboRuleRepo from '../repositories/comboRuleRepository';
import { ValidationError, NotFoundError } from '@/shared/errors';
import { IComboRule } from '../types';

/**
 * Retrieves all combo rules matching a specific restaurant ID.
 * Throws a ValidationError if the restaurantId argument is missing.
 * 
 * @param restaurantId The unique identifier slug of the restaurant tenant.
 * @returns A list of normalized IComboRule objects.
 */
export async function getComboRules(restaurantId: string): Promise<IComboRule[]> {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
  return comboRuleRepo.findAll(restaurantId);
}

/**
 * Saves or updates a combo rule config in the database.
 * If data contains an `_id`, it updates the matching rule; otherwise, it creates a new rule.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param data Configuration values detailing condition category, exclusions, reward types, targets, and optional target ID.
 * @returns The saved or updated IComboRule record.
 */
export async function saveComboRule(restaurantId: string, data: {
  _id?: string;
  conditionCategory: string;
  conditionExcludeCategory: string | null;
  rewardType: 'free_item' | 'percent_off_item' | 'percent_off_order';
  rewardTarget: string;
  customerMessage: string;
  active: boolean;
}) {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
  if (!data.conditionCategory || !data.rewardType || !data.rewardTarget || !data.customerMessage) {
    throw new ValidationError('Condition category, reward type, reward target, and customer message are required');
  }

  if (data._id) {
    const existing = await comboRuleRepo.update(data._id, restaurantId, {
      conditionCategory: data.conditionCategory,
      conditionExcludeCategory: data.conditionExcludeCategory,
      rewardType: data.rewardType,
      rewardTarget: data.rewardTarget,
      customerMessage: data.customerMessage,
      active: data.active,
    });
    if (!existing) {
      throw new NotFoundError('Combo rule not found');
    }
    return existing;
  } else {
    return comboRuleRepo.create({
      restaurantId,
      conditionCategory: data.conditionCategory,
      conditionExcludeCategory: data.conditionExcludeCategory,
      rewardType: data.rewardType,
      rewardTarget: data.rewardTarget,
      customerMessage: data.customerMessage,
      active: data.active,
    });
  }
}

/**
 * Deletes a combo rule after validating rule ownership.
 * Throws a ValidationError if IDs are missing, or a NotFoundError if the rule wasn't deleted.
 * 
 * @param id The target rule database identifier.
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @returns Resolves to true if deleted successfully.
 */
export async function deleteComboRule(id: string, restaurantId: string): Promise<boolean> {
  if (!id || !restaurantId) {
    throw new ValidationError('Rule ID and Restaurant ID are required');
  }
  const deleted = await comboRuleRepo.deleteRule(id, restaurantId);
  if (!deleted) {
    throw new NotFoundError('Combo rule not found');
  }
  return deleted;
}
