import * as orderRepo from './repository';
import * as customerRepo from '@/repositories/customerRepository';
import { NotFoundError } from '@/shared/errors';
import { IOrder } from './types';
import { validateCreateOrderPayload, validateOrderId, validateRestaurantId } from './validation';

/**
 * Places a new order inside the system.
 * Validates payload parameters, inserts an Order record, and updates or registers the Customer stats (spent/orders count) under the restaurant.
 * 
 * @param data Order details including name, phone, cart items, subtotal, and total amount.
 * @returns The newly created and normalized IOrder document.
 */
export async function createOrder(data: {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    originatedFromNudge?: boolean;
    nudgeType?: 'cross_sell' | 'threshold_discount' | 'combo_freebie';
    nudgeRuleId?: string;
  }>;
  subtotal: number;
  total: number;
}): Promise<IOrder> {
  validateCreateOrderPayload(data);
  const { restaurantId, customerName, customerPhone, items, subtotal, total } = data;

  // 1. Create order
  const order = await orderRepo.create({
    restaurantId,
    customerName,
    customerPhone,
    items,
    subtotal,
    total,
    status: 'received',
  });

  // 2. Track customer spent
  const trimmedPhone = customerPhone.trim();
  const trimmedName = customerName.trim();

  const customer = await customerRepo.findByPhone(restaurantId, trimmedPhone);
  if (customer) {
    await customerRepo.updateStats(
      customer._id,
      customer.totalOrders + 1,
      customer.totalSpent + total
    );
  } else {
    await customerRepo.create({
      restaurantId,
      name: trimmedName,
      phone: trimmedPhone,
      totalOrders: 1,
      totalSpent: total,
    });
  }

  return order;
}

/**
 * Retrieves a single order by its database ID string.
 * Throws a ValidationError if the ID is missing.
 * 
 * @param id The target order database identifier.
 * @returns The normalized IOrder record if found, or null otherwise.
 */
export async function getOrderById(id: string): Promise<IOrder | null> {
  validateOrderId(id);
  return orderRepo.findById(id);
}

/**
 * Retrieves all order histories associated with a specific restaurant tenant.
 * Throws a ValidationError if the restaurantId argument is missing.
 * 
 * @param restaurantId The unique identifier slug of the restaurant tenant.
 * @returns An array of normalized IOrder objects.
 */
export async function getAdminOrders(restaurantId: string): Promise<IOrder[]> {
  validateRestaurantId(restaurantId);
  return orderRepo.findAll(restaurantId);
}

/**
 * Updates the cooking/completion status of a specific order.
 * Validates ownership scopes to prevent multi-tenant data leaks.
 * 
 * @param id The database ID string of the target order.
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param status The updated status state (received, accepted, preparing, ready, completed, cancelled).
 * @returns The updated, normalized IOrder document.
 */
export async function updateOrderStatus(id: string, restaurantId: string, status: IOrder['status']): Promise<IOrder> {
  validateOrderId(id);
  const order = await orderRepo.findById(id);
  if (!order || order.restaurantId !== restaurantId) {
    throw new NotFoundError('Unauthorized or order not found');
  }

  const updated = await orderRepo.updateStatus(id, status);
  if (!updated) {
    throw new NotFoundError('Order not found');
  }
  return updated;
}

/**
 * Updates the estimated preparation time (ETA minutes) and shifts status to 'accepted'.
 * Validates ownership scopes to prevent multi-tenant data leaks.
 * 
 * @param id The database ID string of the target order.
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param minutes The preparation duration estimate in minutes.
 * @returns The updated, normalized IOrder document.
 */
export async function updateOrderEstimatedTime(id: string, restaurantId: string, minutes: number): Promise<IOrder> {
  validateOrderId(id);
  const order = await orderRepo.findById(id);
  if (!order || order.restaurantId !== restaurantId) {
    throw new NotFoundError('Unauthorized or order not found');
  }

  const updated = await orderRepo.updateEstimatedTime(id, minutes, 'accepted');
  if (!updated) {
    throw new NotFoundError('Order not found');
  }
  return updated;
}
