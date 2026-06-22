import { ValidationError } from '@/shared/errors';

export function validateRestaurantId(restaurantId: string): void {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
}

export function validateLogEventParams(restaurantId: string, type: string): void {
  if (!restaurantId || !type) {
    throw new ValidationError('Restaurant ID and event type are required');
  }
}
