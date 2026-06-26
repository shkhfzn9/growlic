import { orderSchemas, CreateOrderPayload } from './schemas/order.schema';

export function validateCreateOrderPayload(data: CreateOrderPayload): void {
  orderSchemas.createOrder(data);
}

export function validateOrderId(id: string): void {
  orderSchemas.orderId(id);
}

export function validateRestaurantId(restaurantId: string): void {
  orderSchemas.restaurantId(restaurantId);
}
