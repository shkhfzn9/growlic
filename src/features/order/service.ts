import * as orderRepo from './repository';
import * as customerRepo from '@/features/customer/repository';
import * as menuRepo from '@/features/menu/repositories/menuRepository';
import * as discountRepo from '@/features/discount/repository';
import * as discountTierRepo from '@/features/menu/repositories/discountTierRepository';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { IOrder } from './types';
import { validateCreateOrderPayload, validateOrderId, validateRestaurantId } from './validation';
import { getAdminByRestaurantId } from '@/features/auth';
import { sendNewOrderPush, sendStaffCallPush } from '@/lib/send-push';

export const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  received: ['accepted', 'confirmed', 'scheduled', 'in_progress', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'],
  scheduled: ['accepted', 'confirmed', 'in_progress', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'],
  accepted: ['confirmed', 'in_progress', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'],
  confirmed: ['in_progress', 'accepted', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'],
  in_progress: ['confirmed', 'accepted', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'],
  preparing: ['ready', 'completed', 'cancelled', 'rejected'],
  ready: ['completed', 'cancelled', 'rejected'],
  completed: [],
  cancelled: [],
  rejected: [],
};


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
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  paymentMode?: 'cash' | 'online' | 'credit';
  items: Array<{
    menuItemId: string;
    name?: string;
    price?: number;
    quantity: number;
    image?: string;
    originatedFromNudge?: boolean;
    nudgeType?: 'cross_sell' | 'threshold_discount' | 'combo_freebie';
    nudgeRuleId?: string;
  }>;
  subtotal?: number;
  total?: number;
  discount?: number;
  couponCode?: string;
  notes?: string;
  source?: 'qr_scan' | 'admin_counter';
  status?: IOrder['status'];
  ready_at?: Date;
  prep_duration_seconds?: number;
  appointmentDetails?: IOrder['appointmentDetails'];
}): Promise<IOrder> {
  validateCreateOrderPayload(data);
  const { customerName, customerPhone, customerOldPhone, tableId, orderType, paymentMode, items, notes, appointmentDetails } = data;
  const restaurantId = orderRepo.sanitizeTenantId(data.restaurantId);

  const admin = await getAdminByRestaurantId(restaurantId);
  if (!admin) {
    throw new NotFoundError(`Restaurant tenant '${restaurantId}' not found`);
  }
  if (admin.maintenanceModeEnabled) {
    throw new Error(admin.maintenanceMessage || 'Kitchen is currently under maintenance. Ordering is temporarily paused.');
  }

  const trimmedPhone = customerPhone.trim();
  const trimmedName = customerName.trim();
  const trimmedOldPhone = customerOldPhone?.trim();

  // Recompute prices, names, images, line subtotals, and order total strictly from DB menu items
  const validatedItems: IOrder['items'] = [];
  let calculatedSubtotal = 0;

  const itemIds = items.map((i) => i.menuItemId);
  const dbItems = await menuRepo.findByIds(restaurantId, itemIds);
  const dbItemsMap = new Map(dbItems.map((dbItem) => [dbItem._id, dbItem]));

  for (const item of items) {
    const dbItem = dbItemsMap.get(item.menuItemId);
    if (!dbItem || dbItem.restaurantId !== restaurantId || dbItem.available === false || dbItem.active === false) {
      throw new Error(`Menu item '${item.menuItemId}' is invalid or unavailable for tenant '${restaurantId}'`);
    }
    const lineTotal = dbItem.price * item.quantity;
    calculatedSubtotal += lineTotal;
    validatedItems.push({
      menuItemId: dbItem._id,
      name: dbItem.name,
      price: dbItem.price,
      quantity: item.quantity,
      image: dbItem.image || '',
      originatedFromNudge: item.originatedFromNudge,
      nudgeType: item.nudgeType,
      nudgeRuleId: item.nudgeRuleId,
    });
  }

  let calculatedTotal = calculatedSubtotal;
  let orderDiscount = 0;

  if (typeof data.total === 'number' && data.total < calculatedSubtotal && data.total >= 0) {
    const rawClaimedDiscount = Math.round((calculatedSubtotal - data.total) * 100) / 100;
    let maxAllowedDiscount = 0;

    const discountSettings = await discountRepo.getDiscountSettings(restaurantId);
    const storeDiscountsAllowed = discountSettings.masterEnabled !== false;

    if (data.couponCode && discountSettings.couponsEnabled !== false && storeDiscountsAllowed) {
      try {
        const couponResult = await discountRepo.validateCoupon(restaurantId, data.couponCode, calculatedSubtotal);
        if (couponResult.valid) {
          maxAllowedDiscount += couponResult.discountAmount;
          discountRepo.incrementCouponUsage(restaurantId, data.couponCode).catch((err) => {
            console.error('[COUPON_USAGE_INCREMENT_ERROR]', err);
          });
        }
      } catch (err) {
        console.warn('[COUPON_VALIDATION_ERROR]', err);
      }
    }

    if (admin.loyaltyEnabled) {
      const existingCust = await customerRepo.findByPhone(restaurantId, trimmedPhone);
      if (existingCust?.hasPendingDiscount) {
        const loyaltyPercent = admin.discountPercentage || 20;
        const loyaltyDiscountAmount = Math.round(calculatedSubtotal * (loyaltyPercent / 100));
        maxAllowedDiscount += loyaltyDiscountAmount;
      }
    }

    if (storeDiscountsAllowed) {
      if (discountSettings.spendTiersEnabled !== false) {
        try {
          const activeTiers = await discountTierRepo.findActive(restaurantId);
          let bestTierDiscount = 0;
          for (const tier of activeTiers) {
            if (calculatedSubtotal >= tier.minSpend) {
              const discountAmt = Math.round(calculatedSubtotal * (tier.percentOff / 100));
              if (discountAmt > bestTierDiscount) bestTierDiscount = discountAmt;
            }
          }
          maxAllowedDiscount += bestTierDiscount;
        } catch (tierErr) {
          console.warn('[TIER_DISCOUNT_ERROR]', tierErr);
        }
      }

      if (discountSettings.maxDiscountPerOrder > 0 && maxAllowedDiscount > discountSettings.maxDiscountPerOrder) {
        maxAllowedDiscount = discountSettings.maxDiscountPerOrder;
      }
    } else {
      maxAllowedDiscount = 0;
    }

    orderDiscount = Math.min(rawClaimedDiscount, maxAllowedDiscount, calculatedSubtotal);
    calculatedTotal = Math.max(0, calculatedSubtotal - orderDiscount);
  }

  // 1. Double-booking concurrency check & activeSlotKey generation for Salon appointments
  let activeSlotKey: string | null = null;
  if (appointmentDetails?.bookingDate && appointmentDetails?.bookingTime) {
    const specName = appointmentDetails.specialistName?.trim() || '';
    if (specName) {
      activeSlotKey = `${restaurantId}:${appointmentDetails.bookingDate}:${appointmentDetails.bookingTime}:${specName.toLowerCase()}`;
    } else {
      const activeUnassignedCount = await orderRepo.countActiveUnassignedAppointments(
        restaurantId,
        appointmentDetails.bookingDate,
        appointmentDetails.bookingTime
      );
      if (activeUnassignedCount >= 5) {
        throw new Error('This time slot has reached maximum booking capacity. Please choose another time slot.');
      }
    }
  }

  // 2. Handle profile updates if they override their cached details
  if (trimmedOldPhone && trimmedOldPhone !== trimmedPhone) {
    const oldCustomer = await customerRepo.findByPhone(restaurantId, trimmedOldPhone);
    if (oldCustomer) {
      const newPhoneExists = await customerRepo.findByPhone(restaurantId, trimmedPhone);
      if (!newPhoneExists) {
        await customerRepo.updateNameAndPhone(restaurantId, oldCustomer._id, trimmedName, trimmedPhone);
        await orderRepo.updateOrdersCustomerDetails(restaurantId, trimmedOldPhone, trimmedName, trimmedPhone);
      }
    }
  } else {
    const existingCustomer = await customerRepo.findByPhone(restaurantId, trimmedPhone);
    if (existingCustomer && existingCustomer.name !== trimmedName) {
      await customerRepo.updateName(restaurantId, existingCustomer._id, trimmedName);
      await orderRepo.updateOrdersCustomerName(restaurantId, trimmedPhone, trimmedName);
    }
  }

  // 3. Create order with Atomic DB Index Protection against race conditions
  let order: IOrder;
  try {
    order = await orderRepo.create({
      restaurantId,
      customerName: trimmedName,
      customerPhone: trimmedPhone,
      tableId,
      orderType,
      paymentMode,
      items: validatedItems,
      subtotal: calculatedSubtotal,
      total: calculatedTotal,
      discount: orderDiscount,
      couponCode: data.couponCode ? data.couponCode.trim().toUpperCase() : undefined,
      status: data.status || 'received',
      ready_at: data.ready_at,
      prep_duration_seconds: data.prep_duration_seconds,
      source: data.source || 'qr_scan',
      notes,
      appointmentDetails,
      activeSlotKey,
    });
  } catch (createErr: any) {
    if (createErr?.code === 11000 || createErr?.message?.includes('E11000')) {
      throw new Error('This appointment slot with the selected specialist is already booked. Please choose another time slot.');
    }
    throw createErr;
  }

  // 4. Track customer spent using atomic $inc upsert
  try {
    const customer = await customerRepo.incrementCustomerStats(
      restaurantId,
      trimmedName,
      trimmedPhone,
      calculatedTotal
    );
    if (customer.hasPendingDiscount && orderDiscount > 0) {
      await customerRepo.resetPendingDiscount(restaurantId, customer._id);
    }
  } catch (statsErr) {
    // Atomicity guarantee: delete order on customer stats failure so both succeed or both roll back
    if (order && order._id) {
      await orderRepo.deleteById(order._id);
    }
    throw statsErr;
  }

  // Trigger FCM Push Notification asynchronously (non-blocking) to all registered restaurant devices
  try {
    const admin = await getAdminByRestaurantId(restaurantId);
    const targetTokens = (admin?.fcmTokens && admin.fcmTokens.length > 0)
      ? admin.fcmTokens
      : (admin?.fcmToken ? [admin.fcmToken] : []);

    if (targetTokens.length > 0) {
      sendNewOrderPush(targetTokens, order, restaurantId).catch((err) => {
        console.error('[ORDER_SERVICE_PUSH_ERROR] Background FCM dispatch failed:', err);
      });
    }
  } catch (pushError) {
    console.error('[ORDER_SERVICE_PUSH_ERROR] Failed to query restaurant admin settings for push:', pushError);
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
  status?: string,
  source?: string
): Promise<{
  orders: IOrder[];
  totalCount: number;
  stats?: {
    onTimeRate: number;
    delayedCount: number;
    avgDelayMins: string;
    totalProcessed: number;
    totalCompleted: number;
  };
}> {
  validateRestaurantId(restaurantId);
  return orderRepo.findAll(restaurantId, limit, skip, status, source);
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
export async function updateOrderStatus(
  id: string,
  restaurantId: string,
  status: IOrder['status'],
  delayData?: {
    actualPrepTimeMinutes?: number;
    delayMinutes?: number;
    isDelayed?: boolean;
    delayReason?: string;
  },
  rejectionReason?: string
): Promise<IOrder> {
  validateOrderId(id);
  const order = await orderRepo.findById(restaurantId, id);
  if (!order || order.restaurantId !== restaurantId) {
    throw new NotFoundError('Unauthorized or order not found');
  }

  if (order.status !== status) {
    const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      throw new ValidationError(`Invalid order status transition from '${order.status}' to '${status}'`);
    }
  }

  const updated = await orderRepo.updateStatus(restaurantId, id, status, delayData, rejectionReason);
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
 * Updates items, line quantities, and notes of an existing order.
 * Revalidates prices strictly against DB menu items to prevent manipulation.
 */
export async function updateOrderItems(
  id: string,
  restaurantId: string,
  items: Array<{ menuItemId: string; quantity: number }>,
  notes?: string
): Promise<IOrder> {
  validateOrderId(id);
  const cleanRestId = orderRepo.sanitizeTenantId(restaurantId);
  const existing = await orderRepo.findById(cleanRestId, id);
  if (!existing || existing.restaurantId !== cleanRestId) {
    throw new NotFoundError(`Order '${id}' not found`);
  }

  if (['cancelled', 'rejected'].includes(existing.status)) {
    throw new Error(`Cannot modify order '${id}' because it has already been ${existing.status}`);
  }

  if (!items || items.length === 0) {
    throw new Error('Order must contain at least one item');
  }

  // Fetch current menu items from database to compute safe prices
  const itemIds = items.map((i) => i.menuItemId);
  const dbItems = await menuRepo.findByIds(cleanRestId, itemIds);
  const dbItemsMap = new Map(dbItems.map((dbItem) => [dbItem._id, dbItem]));

  const validatedItems: IOrder['items'] = [];
  let calculatedSubtotal = 0;

  for (const item of items) {
    if (item.quantity <= 0) continue;
    const dbItem = dbItemsMap.get(item.menuItemId);
    const existingItem = existing.items.find((ei) => ei.menuItemId === item.menuItemId);

    const itemName = dbItem?.name || existingItem?.name || 'Item';
    const itemPrice = dbItem ? dbItem.price : (existingItem ? existingItem.price : 0);
    const itemImage = dbItem?.image || existingItem?.image || '';

    const lineTotal = itemPrice * item.quantity;
    calculatedSubtotal += lineTotal;
    validatedItems.push({
      menuItemId: item.menuItemId,
      name: itemName,
      price: itemPrice,
      quantity: item.quantity,
      image: itemImage,
    });
  }

  if (validatedItems.length === 0) {
    throw new Error('Order must contain at least one valid item with quantity > 0');
  }

  const calculatedTotal = calculatedSubtotal;
  const updated = await orderRepo.updateOrderItems(
    cleanRestId,
    id,
    validatedItems,
    calculatedSubtotal,
    calculatedTotal,
    notes
  );

  if (!updated) {
    throw new NotFoundError(`Order '${id}' not found`);
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
  const result = await orderRepo.createStaffCall(restaurantId, tableId);

  // Trigger FCM Push Notification asynchronously (non-blocking) to all registered restaurant devices
  try {
    const admin = await getAdminByRestaurantId(restaurantId);
    const targetTokens = (admin?.fcmTokens && admin.fcmTokens.length > 0)
      ? admin.fcmTokens
      : (admin?.fcmToken ? [admin.fcmToken] : []);

    if (targetTokens.length > 0) {
      sendStaffCallPush(targetTokens, { tableId }, restaurantId).catch((err) => {
        console.error('[STAFF_CALL_SERVICE_PUSH_ERROR] Background FCM dispatch failed:', err);
      });
    }
  } catch (pushError) {
    console.error('[STAFF_CALL_SERVICE_PUSH_ERROR] Failed to query restaurant admin settings for push:', pushError);
  }

  return result;
}

export async function getPendingStaffCalls(restaurantId: string) {
  return orderRepo.getPendingStaffCalls(restaurantId);
}

export async function updateStaffCallStatus(callId: string, restaurantId: string, status: 'accepted' | 'rejected') {
  return orderRepo.updateStaffCallStatus(callId, restaurantId, status);
}

export async function getNotificationAlerts(
  restaurantId: string,
  acknowledgedOrderIds: string[] = [],
  acknowledgedCallIds: string[] = []
) {
  return orderRepo.getNotificationAlerts(restaurantId, acknowledgedOrderIds, acknowledgedCallIds);
}

/**
 * Retrieves unauthenticated public order tracking information.
 * Lookups order by trackingToken (or fallback by ObjectId if 24-char hex ID),
 * returning strictly limited public tracking fields (first name only, no phone, no user notes).
 */
export async function getPublicOrderTrackInfo(tokenOrId: string, restaurantId?: string) {
  if (!tokenOrId) return null;
  const cleanRestId = restaurantId ? orderRepo.sanitizeTenantId(restaurantId) : undefined;

  let order: IOrder | null = null;
  order = await orderRepo.findByTrackingToken(tokenOrId, cleanRestId);

  const enableObjectIdFallback = process.env.ENABLE_TRACK_OBJECTID_FALLBACK !== 'false';
  if (!order && enableObjectIdFallback && /^[0-9a-fA-F]{24}$/.test(tokenOrId)) {
    order = await orderRepo.findById(cleanRestId, tokenOrId);
  }

  if (!order) return null;

  const admin = await getAdminByRestaurantId(order.restaurantId);
  const storeWa = (admin?.whatsappNumber && admin?.whatsappNumber !== '9541234068')
    ? admin.whatsappNumber
    : (admin?.phone || admin?.whatsappNumber || '9541234068');

  return {
    _id: order._id,
    trackingToken: order.trackingToken || order._id,
    restaurantId: order.restaurantId,
    customerFirstName: order.customerName ? order.customerName.trim().split(' ')[0] : 'Customer',
    customerPhone: '', // OMITTED for privacy
    notes: '', // OMITTED for privacy
    status: order.status,
    estimatedTime: order.estimatedTime ?? 0,
    actualPrepTimeMinutes: order.actualPrepTimeMinutes ?? 0,
    delayMinutes: order.delayMinutes ?? 0,
    isDelayed: !!order.isDelayed,
    items: (order.items || []).map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image || '',
    })),
    subtotal: order.subtotal,
    total: order.total,
    businessCategory: admin?.businessCategory || 'restaurant',
    appointmentDetails: order.appointmentDetails ? {
      bookingDate: order.appointmentDetails.bookingDate,
      bookingTime: order.appointmentDetails.bookingTime,
      specialistName: order.appointmentDetails.specialistName || '',
    } : undefined,
    createdAt: order.createdAt,
    restaurantWhatsApp: storeWa,
    rejectionReason: order.rejectionReason || '',
  };
}

export async function getBookedSlotsForDate(
  restaurantId: string,
  bookingDate: string,
  specialistName?: string
): Promise<string[]> {
  validateRestaurantId(restaurantId);
  return orderRepo.findBookedSlotsForDate(restaurantId, bookingDate, specialistName);
}

export async function markWhatsAppNotified(restaurantId: string, id: string): Promise<IOrder | null> {
  validateRestaurantId(restaurantId);
  return orderRepo.markWhatsAppNotified(restaurantId, id);
}

/**
 * Updates the payment mode of an existing order.
 */
export async function updateOrderPaymentMode(
  id: string,
  restaurantId: string,
  paymentMode: 'cash' | 'online' | 'credit'
): Promise<IOrder> {
  validateOrderId(id);
  validateRestaurantId(restaurantId);

  const cleanRestId = orderRepo.sanitizeTenantId(restaurantId);
  const existing = await orderRepo.findById(cleanRestId, id);
  if (!existing || existing.restaurantId !== cleanRestId) {
    throw new NotFoundError(`Order '${id}' not found`);
  }

  if (['cancelled', 'rejected'].includes(existing.status)) {
    throw new Error(`Cannot update payment for order '${id}' because it has already been ${existing.status}`);
  }

  const updated = await orderRepo.updatePaymentMode(cleanRestId, id, paymentMode);
  if (!updated) {
    throw new NotFoundError(`Order '${id}' not found`);
  }

  return updated;
}


