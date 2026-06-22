import * as customerRepo from './repository';
import { validateRestaurantId } from './validation';
import { ICustomer } from './types';

/**
 * Searches for and retrieves customer profiles matching a phone number query inside a restaurant's scope.
 * Throws a ValidationError if the restaurantId argument is missing.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param searchPhone Optional query phone string (matches using case-insensitive regex).
 * @returns An array of normalized ICustomer records.
 */
export async function getCustomersBySearch(restaurantId: string, searchPhone?: string): Promise<ICustomer[]> {
  validateRestaurantId(restaurantId);
  return customerRepo.search(restaurantId, searchPhone);
}
