import { ValidationError } from '@/shared/errors';

export const menuSchemas = {
  restaurantId: (restaurantId: string) => {
    if (!restaurantId) {
      throw new ValidationError('Restaurant ID is required');
    }
  },

  itemId: (id: string) => {
    if (!id) {
      throw new ValidationError('Item ID is required');
    }
  },

  createMenuItem: (restaurantId: string, data: { category?: string; name?: string; price?: number }) => {
    menuSchemas.restaurantId(restaurantId);
    if (!data.category || !data.name || data.price === undefined) {
      throw new ValidationError('Category, name, and price are required');
    }
    if (data.price < 0) {
      throw new ValidationError('Price cannot be negative');
    }
  },

  saveComboRule: (restaurantId: string, data: { conditionCategory?: string; rewardType?: string; rewardTarget?: string; customerMessage?: string }) => {
    menuSchemas.restaurantId(restaurantId);
    if (!data.conditionCategory || !data.rewardType || !data.rewardTarget || !data.customerMessage) {
      throw new ValidationError('Condition category, reward type, reward target, and customer message are required');
    }
  },

  deleteComboRule: (id: string, restaurantId: string) => {
    if (!id || !restaurantId) {
      throw new ValidationError('Rule ID and Restaurant ID are required');
    }
  },

  saveDiscountTier: (restaurantId: string, data: { minSpend?: number; percentOff?: number }) => {
    menuSchemas.restaurantId(restaurantId);
    if (data.minSpend === undefined || data.percentOff === undefined) {
      throw new ValidationError('Minimum spend and percent off are required');
    }
    if (data.percentOff < 0 || data.percentOff > 100) {
      throw new ValidationError('Percent off must be between 0 and 100');
    }
  },

  deleteDiscountTier: (id: string, restaurantId: string) => {
    if (!id || !restaurantId) {
      throw new ValidationError('Tier ID and Restaurant ID are required');
    }
  },

  savePairingRule: (restaurantId: string, data: { triggerCategory?: string; suggestCategories?: string[] }) => {
    menuSchemas.restaurantId(restaurantId);
    if (!data.triggerCategory || !data.suggestCategories || data.suggestCategories.length === 0) {
      throw new ValidationError('Trigger category and suggest categories are required');
    }
  },

  deletePairingRule: (id: string, restaurantId: string) => {
    if (!id || !restaurantId) {
      throw new ValidationError('Rule ID and Restaurant ID are required');
    }
  }
};
