import { ValidationError } from '@/shared/errors';

export function validateRestaurantId(restaurantId: string): void {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
}

export function validateItemId(id: string): void {
  if (!id) {
    throw new ValidationError('Item ID is required');
  }
}

export function validateCreateMenuItem(restaurantId: string, data: { category?: string; name?: string; price?: number }): void {
  validateRestaurantId(restaurantId);
  if (!data.category || !data.name || data.price === undefined) {
    throw new ValidationError('Category, name, and price are required');
  }
}

export function validateSaveComboRule(restaurantId: string, data: { conditionCategory?: string; rewardType?: string; rewardTarget?: string; customerMessage?: string }): void {
  validateRestaurantId(restaurantId);
  if (!data.conditionCategory || !data.rewardType || !data.rewardTarget || !data.customerMessage) {
    throw new ValidationError('Condition category, reward type, reward target, and customer message are required');
  }
}

export function validateDeleteComboRule(id: string, restaurantId: string): void {
  if (!id || !restaurantId) {
    throw new ValidationError('Rule ID and Restaurant ID are required');
  }
}

export function validateSaveDiscountTier(restaurantId: string, data: { minSpend?: number; percentOff?: number }): void {
  validateRestaurantId(restaurantId);
  if (data.minSpend === undefined || data.percentOff === undefined) {
    throw new ValidationError('Minimum spend and percent off are required');
  }
}

export function validateDeleteDiscountTier(id: string, restaurantId: string): void {
  if (!id || !restaurantId) {
    throw new ValidationError('Tier ID and Restaurant ID are required');
  }
}

export function validateSavePairingRule(restaurantId: string, data: { triggerCategory?: string; suggestCategories?: string[] }): void {
  validateRestaurantId(restaurantId);
  if (!data.triggerCategory || !data.suggestCategories || data.suggestCategories.length === 0) {
    throw new ValidationError('Trigger category and suggest categories are required');
  }
}

export function validateDeletePairingRule(id: string, restaurantId: string): void {
  if (!id || !restaurantId) {
    throw new ValidationError('Rule ID and Restaurant ID are required');
  }
}
