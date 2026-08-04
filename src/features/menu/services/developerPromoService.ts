import * as devPromoRepo from '../repositories/developerPromoRepository';
import { IDeveloperPromo } from '../types';

/**
 * Retrieves the developer promo settings for a specific restaurant tenant.
 */
export async function getDeveloperPromo(restaurantId: string): Promise<IDeveloperPromo> {
  return devPromoRepo.findByRestaurantId(restaurantId);
}

/**
 * Saves or updates developer promo settings for a specific restaurant tenant.
 */
export async function saveDeveloperPromo(
  restaurantId: string,
  data: Partial<IDeveloperPromo>
): Promise<IDeveloperPromo> {
  return devPromoRepo.saveForRestaurant(restaurantId, data);
}
