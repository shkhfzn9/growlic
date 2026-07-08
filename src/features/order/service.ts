import * as orderRepo from './repository';
import * as customerRepo from '@/features/customer/repository';
import { NotFoundError } from '@/shared/errors';
import { IOrder } from './types';
import { validateCreateOrderPayload, validateOrderId, validateRestaurantId } from './validation';
import { getAdminByRestaurantId } from '@/features/auth';

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
  customerOldPhone?: string;
  tableId?: string;
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
  notes?: string;
}): Promise<IOrder> {
  validateCreateOrderPayload(data);
  const { restaurantId, customerName, customerPhone, customerOldPhone, tableId, items, subtotal, total, notes } = data;

  const trimmedPhone = customerPhone.trim();
  const trimmedName = customerName.trim();
  const trimmedOldPhone = customerOldPhone?.trim();

  // 1. Handle profile updates if they override their cached details
  if (trimmedOldPhone && trimmedOldPhone !== trimmedPhone) {
    const oldCustomer = await customerRepo.findByPhone(restaurantId, trimmedOldPhone);
    if (oldCustomer) {
      const newPhoneExists = await customerRepo.findByPhone(restaurantId, trimmedPhone);
      if (!newPhoneExists) {
        // Update the existing customer document with the new name and phone number
        await customerRepo.updateNameAndPhone(restaurantId, oldCustomer._id, trimmedName, trimmedPhone);
        // Retroactively update past orders to the new details
        await orderRepo.updateOrdersCustomerDetails(restaurantId, trimmedOldPhone, trimmedName, trimmedPhone);
      }
    }
  } else {
    // Phone number is the same (or no old phone provided), but they might have changed their name
    const existingCustomer = await customerRepo.findByPhone(restaurantId, trimmedPhone);
    if (existingCustomer && existingCustomer.name !== trimmedName) {
      await customerRepo.updateName(restaurantId, existingCustomer._id, trimmedName);
      await orderRepo.updateOrdersCustomerName(restaurantId, trimmedPhone, trimmedName);
    }
  }

  // 2. Create order
  const order = await orderRepo.create({
    restaurantId,
    customerName,
    customerPhone,
    tableId,
    items,
    subtotal,
    total,
    status: 'received',
    notes,
  });

  // 3. Track customer spent and handle loyalty discount reset
  const customer = await customerRepo.findByPhone(restaurantId, trimmedPhone);
  if (customer) {
    await customerRepo.updateStats(
      restaurantId,
      customer._id,
      customer.totalOrders + 1,
      customer.totalSpent + total
    );
    if (customer.hasPendingDiscount) {
      await customerRepo.resetPendingDiscount(restaurantId, customer._id);
    }
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
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @returns The normalized IOrder record if found, or null otherwise.
 */
export async function getOrderById(id: string, restaurantId?: string): Promise<IOrder | null> {
  validateOrderId(id);
  return orderRepo.findById(restaurantId, id);
}

/**
 * Retrieves order histories associated with a specific restaurant tenant, paginated and optionally filtered.
 * Throws a ValidationError if the restaurantId argument is missing.
 * 
 * @param restaurantId The unique identifier slug of the restaurant tenant.
 * @param limit Maximum number of orders to fetch.
 * @param skip Number of orders to skip.
 * @param status Optional order status filter.
 * @returns An object containing normalized IOrder objects and totalCount.
 */
export async function getAdminOrders(
  restaurantId: string,
  limit?: number,
  skip?: number,
  status?: string
): Promise<{ orders: IOrder[]; totalCount: number }> {
  validateRestaurantId(restaurantId);
  return orderRepo.findAll(restaurantId, limit, skip, status);
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
  const order = await orderRepo.findById(restaurantId, id);
  if (!order || order.restaurantId !== restaurantId) {
    throw new NotFoundError('Unauthorized or order not found');
  }

  const updated = await orderRepo.updateStatus(restaurantId, id, status);
  if (!updated) {
    throw new NotFoundError('Order not found');
  }

  // Stamp Earning logic trigger on order completion
  if (status === 'completed') {
    try {
      const admin = await getAdminByRestaurantId(restaurantId);
      if (admin && admin.loyaltyEnabled) {
        const stampsRequired = admin.stampsRequired ?? 8;
        const phone = order.customerPhone.trim();
        const customer = await customerRepo.findByPhone(restaurantId, phone);
        if (customer) {
          // If stamp count is already at max threshold, they must redeem first, so do not add more stamps
          if (customer.stampCount < stampsRequired) {
            // Check if they placed an order and earned a stamp today
            const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
            const lastStampStr = customer.lastStampDate 
              ? new Date(customer.lastStampDate).toISOString().split('T')[0] 
              : '';
            
            if (todayStr !== lastStampStr) {
              await customerRepo.awardStamp(restaurantId, customer._id, new Date());
            }
          }
        }
      }
    } catch (err) {
      console.error('Error awarding stamp on order completion:', err);
    }
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
  const order = await orderRepo.findById(restaurantId, id);
  if (!order || order.restaurantId !== restaurantId) {
    throw new NotFoundError('Unauthorized or order not found');
  }

  const updated = await orderRepo.updateEstimatedTime(restaurantId, id, minutes, 'accepted');
  if (!updated) {
    throw new NotFoundError('Order not found');
  }
  return updated;
}

/**
 * Retrieves past orders associated with a customer's phone number.
 * 
 * @param phone The unique customer phone number.
 * @param restaurantId Optional restaurant slug ID.
 * @returns Normalized orders array.
 */
export async function getOrdersByCustomerPhone(phone: string, restaurantId?: string): Promise<IOrder[]> {
  if (!phone || phone.trim().length < 8) {
    throw new Error('Valid phone number is required');
  }
  return orderRepo.findByCustomerPhone(restaurantId, phone.trim());
}

export async function createStaffCall(restaurantId: string, tableId: string) {
  return orderRepo.createStaffCall(restaurantId, tableId);
}

export async function getPendingStaffCalls(restaurantId: string) {
  return orderRepo.getPendingStaffCalls(restaurantId);
}

export async function updateStaffCallStatus(callId: string, restaurantId: string, status: 'accepted' | 'rejected') {
  return orderRepo.updateStaffCallStatus(callId, restaurantId, status);
}

