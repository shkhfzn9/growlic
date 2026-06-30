'use server';

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import * as orderService from '@/features/order';
import * as analyticsService from '@/features/analytics';
import * as eventService from '@/features/analytics';
import { validateSession, can, getAdminByRestaurantId } from '@/features/auth';
import { logAction } from '@/features/audit';
import * as customerRepo from '@/features/customer/repository';

/**
 * Validates the admin's authentication cookie ('admin_token') and decodes its payload.
 * Throws an Error if the token is missing or invalid.
 * 
 * @returns The decoded admin session JWT token object, raw token, and userId.
 */
async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) {
    throw new Error('Unauthorized: No token provided');
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    throw new Error('Unauthorized: Invalid token');
  }

  const isValid = await validateSession(decoded.restaurantId, token);
  if (!isValid) {
    throw new Error('Unauthorized: Session has expired or been revoked');
  }

  const admin = await getAdminByRestaurantId(decoded.restaurantId);
  if (!admin) {
    throw new Error('Unauthorized: Admin account not found');
  }

  return { ...decoded, token, userId: admin._id };
}

/**
 * Server action to register and place a new order.
 * Triggers Next.js dashboard/orders path revalidation.
 * 
 * @param data Order details including name, phone, cart items, subtotal, and total amount.
 * @returns Serialized, plain object of the newly placed order.
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
}) {
  try {
    const order = await orderService.createOrder(data);
    // revalidatePath(`/admin/dashboard`);
    // revalidatePath(`/admin/orders`);
    return JSON.parse(JSON.stringify(order));
  } catch (error) {
    console.error('Error creating order action:', error);
    const message = error instanceof Error ? error.message : 'Failed to place order';
    throw new Error(message);
  }
}

/**
 * Server action to retrieve a single order record by its database ID.
 * 
 * @param id The target order ID string.
 * @returns Serialized, plain order record, or null.
 */
export async function getOrderById(id: string, restaurantId?: string) {
  try {
    const order = await orderService.getOrderById(id, restaurantId);
    if (!order) return null;
    return JSON.parse(JSON.stringify(order));
  } catch (error) {
    console.error('Error fetching order action:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch order';
    throw new Error(message);
  }
}

/**
 * Server action to retrieve all orders matching the authenticated admin's restaurant.
 * 
 * @returns Serialized, plain array of order history.
 */
export async function getAdminOrders(limit?: number, skip?: number, status?: string) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = (await can('manage_orders', admin.token, admin.restaurantId)) ||
                      (await can('update_order_status', admin.token, admin.restaurantId));
    if (!isAllowed) {
      throw new Error('Forbidden: Insufficient permissions to view orders');
    }

    const result = await orderService.getAdminOrders(admin.restaurantId, limit, skip, status);
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error('Error fetching admin orders action:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch orders';
    throw new Error(message);
  }
}

/**
 * Server action to update status of a specific order.
 * Triggers Next.js path revalidation.
 * 
 * @param id The database ID string of the target order.
 * @param status The updated status state (received, accepted, preparing, ready, completed, cancelled).
 * @returns Serialized, plain updated order object.
 */
export async function updateOrderStatus(id: string, status: 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled') {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('update_order_status', admin.token, admin.restaurantId);
    if (!isAllowed) {
      throw new Error('Forbidden: Insufficient permissions to update orders');
    }

    const existing = await orderService.getOrderById(id, admin.restaurantId);
    const order = await orderService.updateOrderStatus(id, admin.restaurantId, status);

    // Audit log order status change
    await logAction(admin.restaurantId, admin.userId, 'ORDER_STATUS_CHANGED', existing, order);

    // revalidatePath(`/admin/dashboard`);
    // revalidatePath(`/admin/orders`);
    return JSON.parse(JSON.stringify(order));
  } catch (error) {
    console.error('Error updating order status action:', error);
    const message = error instanceof Error ? error.message : 'Failed to update order status';
    throw new Error(message);
  }
}

/**
 * Server action to update estimated preparation time (ETA minutes) of a specific order.
 * Triggers Next.js path revalidation.
 * 
 * @param id The database ID string of the target order.
 * @param minutes The preparation duration estimate in minutes.
 * @returns Serialized, plain updated order object.
 */
export async function updateOrderEstimatedTime(id: string, minutes: number) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('update_order_status', admin.token, admin.restaurantId);
    if (!isAllowed) {
      throw new Error('Forbidden: Insufficient permissions to update orders');
    }

    const existing = await orderService.getOrderById(id, admin.restaurantId);
    const order = await orderService.updateOrderEstimatedTime(id, admin.restaurantId, minutes);

    // Audit log order status change (ETA change)
    await logAction(admin.restaurantId, admin.userId, 'ORDER_STATUS_CHANGED', existing, order);

    // revalidatePath(`/admin/dashboard`);
    // revalidatePath(`/admin/orders`);
    return JSON.parse(JSON.stringify(order));
  } catch (error) {
    console.error('Error updating order estimated time action:', error);
    const message = error instanceof Error ? error.message : 'Failed to update order ETA';
    throw new Error(message);
  }
}

/**
 * Server action to fetch dashboard analytics metrics.
 * Restricts access to the authenticated admin's scoped restaurant.
 * 
 * @param startDateStr Optional start date ISO string.
 * @param endDateStr Optional end date ISO string.
 * @returns Serialized computed metrics object.
 */
export async function getDashboardMetrics(startDateStr?: string, endDateStr?: string) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('view_analytics', admin.token, admin.restaurantId);
    if (!isAllowed) {
      throw new Error('Forbidden: Insufficient permissions to view dashboard analytics');
    }

    const metrics = await analyticsService.getDashboardMetrics(admin.restaurantId, startDateStr, endDateStr);
    return JSON.parse(JSON.stringify(metrics));
  } catch (error) {
    console.error('Error fetching dashboard metrics action:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard metrics';
    throw new Error(message);
  }
}

/**
 * Server action to log customer events (nudge displays, modal views).
 * Scopes the logs to the active restaurant parameter.
 * 
 * @param restaurantId The target restaurant identifier slug.
 * @param type The action event category name ('modal_open', 'cart_create', 'nudge_show').
 * @param itemId Optional menu item database identifier.
 * @param nudgeType Optional nudge recommendation classification.
 * @returns Indicator object indicating success state and generated event ID.
 */
export async function logEvent(
  restaurantId: string,
  type: 'modal_open' | 'cart_create' | 'nudge_show',
  itemId?: string,
  nudgeType?: string
) {
  try {
    const result = await eventService.logEvent(restaurantId, type, itemId, nudgeType);
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error('Error logging event action:', error);
    return { success: false };
  }
}

/**
 * Server action to retrieve order histories associated with a customer's phone number.
 * 
 * @param phone The unique customer phone number.
 * @param restaurantId Optional restaurant slug ID.
 * @returns Serialized, plain array of order history.
 */
export async function getOrdersByCustomerPhone(phone: string, restaurantId?: string) {
  try {
    const orders = await orderService.getOrdersByCustomerPhone(phone, restaurantId);
    return JSON.parse(JSON.stringify(orders));
  } catch (error) {
    console.error('Error fetching customer orders action:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch order history';
    throw new Error(message);
  }
}

/**
 * Server action to fetch customer loyalty profile details and restaurant loyalty configuration.
 */
export async function getCustomerLoyaltyInfo(phone: string, restaurantId: string) {
  try {
    if (!phone || !restaurantId) {
      throw new Error('Phone number and Restaurant ID are required');
    }
    const [customer, admin] = await Promise.all([
      customerRepo.findByPhone(restaurantId, phone),
      getAdminByRestaurantId(restaurantId),
    ]);

    return {
      customer: customer ? JSON.parse(JSON.stringify(customer)) : null,
      loyaltyEnabled: admin?.loyaltyEnabled ?? false,
      stampsRequired: admin?.stampsRequired ?? 8,
      discountPercentage: admin?.discountPercentage ?? 20,
    };
  } catch (error) {
    console.error('Error fetching customer loyalty info:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch loyalty details';
    throw new Error(message);
  }
}

/**
 * Server action to manually redeem loyalty stamps for a customer discount reward.
 */
export async function redeemLoyaltyReward(phone: string, restaurantId: string) {
  try {
    if (!phone || !restaurantId) {
      throw new Error('Phone number and Restaurant ID are required');
    }
    const admin = await getAdminByRestaurantId(restaurantId);
    if (!admin || !admin.loyaltyEnabled) {
      throw new Error('Loyalty program is currently disabled');
    }

    const customer = await customerRepo.findByPhone(restaurantId, phone);
    if (!customer) {
      throw new Error('Customer profile not found');
    }

    const stampsRequired = admin.stampsRequired ?? 8;
    if (customer.stampCount < stampsRequired) {
      throw new Error(`Insufficient stamps collected (${customer.stampCount}/${stampsRequired})`);
    }

    const updated = await customerRepo.redeemReward(restaurantId, customer._id);
    
    // Revalidate customer history and settings paths
    revalidatePath(`/orders`);
    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Error redeeming loyalty reward:', error);
    const message = error instanceof Error ? error.message : 'Failed to redeem reward';
    throw new Error(message);
  }
}

/**
 * Server action to fetch all loyalty summaries for a customer across all restaurants.
 */
export async function getCustomerLoyaltySummary(phone: string) {
  try {
    if (!phone) {
      throw new Error('Phone number is required');
    }
    const trimmedPhone = phone.trim();
    // Find all customer records for this phone number
    const customerDocs = await customerRepo.findManyByPhoneAcrossRestaurants(trimmedPhone);

    // Resolve restaurant details and filter for active loyalty programs
    const summaryPromises = customerDocs.map(async (cust) => {
      const admin = await getAdminByRestaurantId(cust.restaurantId);
      if (admin && admin.loyaltyEnabled) {
        return {
          restaurantId: cust.restaurantId,
          restaurantName: admin.restaurantName,
          logoUrl: admin.logoUrl || '',
          stampCount: cust.stampCount ?? 0,
          stampsRequired: admin.stampsRequired ?? 8,
          discountPercentage: admin.discountPercentage ?? 20,
          hasPendingDiscount: cust.hasPendingDiscount ?? false,
          totalRedemptions: cust.totalRedemptions ?? 0,
        };
      }
      return null;
    });

    const summaries = await Promise.all(summaryPromises);
    return summaries.filter((s): s is NonNullable<typeof s> => s !== null);
  } catch (error) {
    console.error('Error fetching customer loyalty summary:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch loyalty summary';
    throw new Error(message);
  }
}


