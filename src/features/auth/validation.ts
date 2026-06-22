import { ValidationError } from '@/shared/errors';

export function getAdminByRestaurantIdValidation(restaurantId: string): void {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
}

export function authenticateAdminValidation(email: string, password?: string): void {
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }
}

export function registerRestaurantValidation(data: {
  restaurantName: string;
  restaurantId: string;
  email: string;
  password?: string;
  phone: string;
  designation: string;
}): { phoneClean: string } {
  const { restaurantName, restaurantId, email, password, phone, designation } = data;

  if (!restaurantName || !restaurantId || !email || !password || !phone || !designation) {
    throw new ValidationError('All fields are required');
  }

  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(restaurantId)) {
    throw new ValidationError('Restaurant ID must contain only lowercase letters, numbers, and dashes (e.g. my-restaurant)');
  }

  if (restaurantId.length < 3) {
    throw new ValidationError('Restaurant ID must be at least 3 characters long');
  }

  const phoneClean = phone.trim().replace(/\D/g, '');
  if (phoneClean.length !== 10) {
    throw new ValidationError('Please enter a valid 10-digit phone number');
  }

  return { phoneClean };
}
