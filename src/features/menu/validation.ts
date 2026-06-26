import { menuSchemas } from './schemas/menu.schema';

export function validateRestaurantId(restaurantId: string): void {
  menuSchemas.restaurantId(restaurantId);
}

export function validateItemId(id: string): void {
  menuSchemas.itemId(id);
}

export function validateCreateMenuItem(restaurantId: string, data: { category?: string; name?: string; price?: number }): void {
  menuSchemas.createMenuItem(restaurantId, data);
}

export function validateSaveComboRule(restaurantId: string, data: { conditionCategory?: string; rewardType?: string; rewardTarget?: string; customerMessage?: string }): void {
  menuSchemas.saveComboRule(restaurantId, data);
}

export function validateDeleteComboRule(id: string, restaurantId: string): void {
  menuSchemas.deleteComboRule(id, restaurantId);
}

export function validateSaveDiscountTier(restaurantId: string, data: { minSpend?: number; percentOff?: number }): void {
  menuSchemas.saveDiscountTier(restaurantId, data);
}

export function validateDeleteDiscountTier(id: string, restaurantId: string): void {
  menuSchemas.deleteDiscountTier(id, restaurantId);
}

export function validateSavePairingRule(restaurantId: string, data: { triggerCategory?: string; suggestCategories?: string[] }): void {
  menuSchemas.savePairingRule(restaurantId, data);
}

export function validateDeletePairingRule(id: string, restaurantId: string): void {
  menuSchemas.deletePairingRule(id, restaurantId);
}
