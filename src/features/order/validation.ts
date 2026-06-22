import { ValidationError } from '@/shared/errors';

export function validateCreateOrderPayload(data: {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  total: number;
}): void {
  const { restaurantId, customerName, customerPhone, items, subtotal, total } = data;

  if (
    !restaurantId ||
    !customerName ||
    !customerPhone ||
    !items ||
    items.length === 0 ||
    subtotal === undefined ||
    total === undefined
  ) {
    throw new ValidationError('Malformed order payload: missing required fields');
  }
}

export function validateOrderId(id: string): void {
  if (!id) {
    throw new ValidationError('Order ID is required');
  }
}

export function validateRestaurantId(restaurantId: string): void {
  if (!restaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }
}
