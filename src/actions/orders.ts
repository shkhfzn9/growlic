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
import { checkAndIncrementRateLimit } from '@/lib/rateLimiter';
import { orderTelemetry } from '@/lib/orderTelemetry';

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
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  paymentMode?: 'cash' | 'online';
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
  appointmentDetails?: {
    bookingDate: string;
    bookingTime: string;
    specialistId?: string;
    specialistName?: string;
    userNotes?: string;
  };
}) {
  try {
    const order = await orderService.createOrder(data);
    orderTelemetry.recordRequest(order._id, order.restaurantId, order.status || 'received');
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
    const admin = await getAdminByRestaurantId(order.restaurantId || restaurantId || '');
    const plainOrder = JSON.parse(JSON.stringify(order));
    const storeWa = (admin?.whatsappNumber && admin?.whatsappNumber !== '9541234068') ? admin.whatsappNumber : (admin?.phone || admin?.whatsappNumber || '9541234068');
    plainOrder.restaurantWhatsApp = storeWa;
    return plainOrder;
  } catch (error) {
    console.error('Error fetching order action:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch order';
    throw new Error(message);
  }
}

async function checkTrackRateLimit(ipOrKey: string): Promise<void> {
  const limit = await checkAndIncrementRateLimit(`track:ip:${ipOrKey}`, 30, 60);
  if (!limit.allowed) {
    throw new Error('Too many tracking requests. Please try again later.');
  }
}

/**
 * Public unauthenticated order tracking Server Action with rate limiting.
 * Returns only essential public tracking fields (first name only, items, status, ETA, no phone, no notes).
 */
export async function getPublicOrderTrackInfoAction(tokenOrId: string, restaurantId?: string) {
  try {
    await checkTrackRateLimit(tokenOrId || restaurantId || 'global');
    const trackInfo = await orderService.getPublicOrderTrackInfo(tokenOrId, restaurantId);
    if (!trackInfo) return null;
    return JSON.parse(JSON.stringify(trackInfo));
  } catch (error) {
    console.error('Error fetching public order tracking info:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch tracking details';
    throw new Error(message);
  }
}

/**
 * Server action to retrieve all orders matching the authenticated admin's restaurant.
 * 
 * @returns Serialized, plain array of order history.
 */
export async function getAdminOrders(limit?: number, skip?: number, status?: string, source?: string) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = (await can('manage_orders', admin.token, admin.restaurantId)) ||
                      (await can('update_order_status', admin.token, admin.restaurantId));
    if (!isAllowed) {
      return { orders: [], total: 0, totalCount: 0, unauthorized: true, error: 'Forbidden: Insufficient permissions to view orders' };
    }

    const result = await orderService.getAdminOrders(admin.restaurantId, limit, skip, status, source);
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { orders: [], total: 0, totalCount: 0, unauthorized: true, error: error.message };
    }
    console.error('Error fetching admin orders action:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch orders';
    return { orders: [], total: 0, totalCount: 0, error: message };
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
export async function updateOrderStatus(
  id: string,
  status: 'received' | 'scheduled' | 'accepted' | 'confirmed' | 'in_progress' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'rejected',
  delayData?: {
    actualPrepTimeMinutes?: number;
    delayMinutes?: number;
    isDelayed?: boolean;
    delayReason?: string;
  },
  rejectionReason?: string
) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = (await can('update_order_status', admin.token, admin.restaurantId)) ||
                      (await can('manage_orders', admin.token, admin.restaurantId));
    if (!isAllowed) {
      throw new Error('Forbidden: Insufficient permissions to update orders');
    }

    const existing = await orderService.getOrderById(id, admin.restaurantId);
    const order = await orderService.updateOrderStatus(id, admin.restaurantId, status, delayData, rejectionReason);

    if (existing) {
      orderTelemetry.recordStatusChange(id, existing.status, status);
    }
    orderTelemetry.recordRequest(id, admin.restaurantId, status);

    // Audit log order status change
    await logAction(admin.restaurantId, admin.userId, 'ORDER_STATUS_CHANGED', existing, order);

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
    const cleanRestaurantId = restaurantId.toLowerCase().trim();
    const [customer, admin] = await Promise.all([
      customerRepo.findByPhone(cleanRestaurantId, phone),
      getAdminByRestaurantId(cleanRestaurantId),
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
    const cleanRestaurantId = restaurantId.toLowerCase().trim();
    const admin = await getAdminByRestaurantId(cleanRestaurantId);
    if (!admin || !admin.loyaltyEnabled) {
      throw new Error('Loyalty program is currently disabled');
    }

    const customer = await customerRepo.findByPhone(cleanRestaurantId, phone);
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

export async function callStaffAction(restaurantId: string, tableId: string) {
  try {
    const result = await orderService.createStaffCall(restaurantId, tableId);
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error('Error creating staff call action:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to call staff');
  }
}

export async function getPendingStaffCallsAction(restaurantId: string) {
  try {
    const admin = await checkAdminAuth();
    if (admin.restaurantId.toLowerCase() !== restaurantId.toLowerCase()) {
      return [];
    }
    const result = await orderService.getPendingStaffCalls(restaurantId);
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return [];
    }
    console.error('Error getting pending staff calls:', error);
    return [];
  }
}

export async function resolveStaffCallAction(callId: string, status: 'accepted' | 'rejected') {
  try {
    const admin = await checkAdminAuth();
    const result = await orderService.updateStaffCallStatus(callId, admin.restaurantId, status);
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error('Error resolving staff call:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to resolve staff call');
  }
}

/**
 * Highly optimized notification polling Server Action:
 * 1. Count-check: runs fast Order.countDocuments() and StaffCall.countDocuments() first.
 *    If count === 0, returns immediately without running full find queries or document mapping.
 * 2. Field Projection: Projects ONLY necessary alert card fields (.select(...)).
 */
export async function getAdminNotificationAlertsAction(
  restaurantId: string,
  acknowledgedOrderIds: string[] = [],
  acknowledgedCallIds: string[] = []
) {
  try {
    const admin = await checkAdminAuth();
    if (admin.restaurantId.toLowerCase() !== restaurantId.toLowerCase()) {
      return { unauthorized: true, orders: [], staffCalls: [] };
    }

    const result = await orderService.getNotificationAlerts(
      restaurantId,
      acknowledgedOrderIds,
      acknowledgedCallIds
    );

    if (result?.orders) {
      result.orders.forEach((o: any) => {
        orderTelemetry.recordRequest(o._id.toString(), restaurantId, o.status || 'received');
      });
    }

    return {
      success: true,
      orders: JSON.parse(JSON.stringify(result.orders)),
      staffCalls: JSON.parse(JSON.stringify(result.staffCalls)),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { unauthorized: true, orders: [], staffCalls: [] };
    }
    console.error('Error getting admin notification alerts:', error);
    return { success: false, orders: [], staffCalls: [] };
  }
}

/**
 * Server action to get already booked active appointment slots for a restaurant date & specialist.
 */
export async function getBookedSlotsAction(
  restaurantId: string,
  bookingDate: string,
  specialistName?: string
): Promise<string[]> {
  try {
    return await orderService.getBookedSlotsForDate(restaurantId, bookingDate, specialistName);
  } catch (error) {
    console.error('Error fetching booked slots:', error);
    return [];
  }
}

/**
 * Server action for ADMINS to create manual walk-in / counter orders.
 * Strictly protected by checkAdminAuth() and can('manage_orders').
 */
export async function createCounterOrderAction(data: {
  customerPhone: string;
  customerName?: string;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  paymentMode?: 'cash' | 'online';
  tableId?: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
  notes?: string;
  markReadyDirectly?: boolean;
}) {
  try {
    const admin = await checkAdminAuth();
    const isAllowed = await can('manage_orders', admin.token, admin.restaurantId);
    if (!isAllowed) {
      throw new Error('Forbidden: Insufficient permissions to create counter orders');
    }

    const { normalizePhoneNumber, isValidPhoneNumber } = await import('@/lib/whatsappService');
    const rawPhone = data.customerPhone.trim();
    if (!isValidPhoneNumber(rawPhone)) {
      throw new Error('Invalid phone number format. Please provide a valid 10-15 digit phone number.');
    }
    const cleanPhone = normalizePhoneNumber(rawPhone);
    const now = new Date();
    const isReady = !!data.markReadyDirectly;

    const orderPayload = {
      restaurantId: admin.restaurantId,
      customerName: data.customerName?.trim() || 'Walk-in Customer',
      customerPhone: cleanPhone,
      orderType: data.orderType || 'takeaway',
      paymentMode: data.paymentMode || 'cash',
      tableId: data.tableId || undefined,
      items: data.items,
      notes: data.notes || '',
      source: 'admin_counter' as const,
      status: (isReady ? 'ready' : 'received') as any,
      placed_at: now,
      ready_at: isReady ? now : undefined,
      prep_duration_seconds: isReady ? 0 : undefined,
    };

    const order = await orderService.createOrder(orderPayload);

    // Telemetry & audit logging (dispatched in background without blocking POS response)
    orderTelemetry.recordRequest(order._id, admin.restaurantId, order.status);
    logAction(admin.restaurantId, admin.userId, 'COUNTER_ORDER_CREATED', null, { orderId: order._id, total: order.total, status: order.status }).catch((err) => {
      console.error('[AUDIT_LOG_ERROR] Non-blocking audit log failed:', err);
    });

    return { success: true, order: JSON.parse(JSON.stringify(order)) };
  } catch (error) {
    console.error('Error creating counter order action:', error);
    const message = error instanceof Error ? error.message : 'Failed to create counter order';
    throw new Error(message);
  }
}

/**
 * Server action to mark an order as notified via WhatsApp.
 */
export async function markOrderWhatsAppNotifiedAction(orderId: string) {
  try {
    const admin = await checkAdminAuth();
    const updated = await orderService.markWhatsAppNotified(admin.restaurantId, orderId);
    if (!updated) {
      throw new Error('Order not found or update failed');
    }
    revalidatePath('/admin/orders');
    return { success: true, order: JSON.parse(JSON.stringify(updated)) };
  } catch (error) {
    console.error('Error marking order WhatsApp notified action:', error);
    const message = error instanceof Error ? error.message : 'Failed to update WhatsApp notification status';
    throw new Error(message);
  }
}


