import { authSchemas, RegisterPayload } from './schemas/auth.schema';

export function getAdminByRestaurantIdValidation(restaurantId: string): void {
  authSchemas.restaurantId(restaurantId);
}

export function authenticateAdminValidation(email: string, password?: string): void {
  authSchemas.login(email, password);
}

export function registerRestaurantValidation(data: RegisterPayload): { phoneClean: string } {
  return authSchemas.register(data);
}
