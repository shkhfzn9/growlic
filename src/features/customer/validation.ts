import { ValidationError } from '@/shared/errors';

export function validateRestaurantId(restaurantId: string): void {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
}
