import { ValidationError } from '@/shared/errors';

export interface CreateOrderPayload {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  tableId?: string;
  items: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  total: number;
}

export const orderSchemas = {
  createOrder: (data: CreateOrderPayload) => {
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

    const phoneClean = customerPhone.trim().replace(/\D/g, '');
    if (phoneClean.length < 8) {
      throw new ValidationError('Please enter a valid phone number');
    }
  },

  orderId: (id: string) => {
    if (!id) {
      throw new ValidationError('Order ID is required');
    }
  },

  restaurantId: (restaurantId: string) => {
    if (!restaurantId) {
      throw new ValidationError('Restaurant ID is required');
    }
  }
};
