import dbConnect from '@/lib/mongodb';
import Order, { StaffCall } from './model';
import { IOrder } from './types';
import crypto from 'crypto';

export function sanitizeTenantId(id: string): string {
  if (!id) return '';
  return id.trim().toLowerCase();
}

/**
 * Normalizes a raw Mongoose document representing an Order into a standard IOrder plain object.
 * Converts DB properties to type-safe and serialized fields.
 * 
 * @param doc The raw Mongoose document.
 * @returns A standardized, plain interface structure of the order.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeOrder(doc: any): IOrder {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    restaurantId: plain.restaurantId,
    customerName: plain.customerName,
    customerPhone: plain.customerPhone,
    tableId: plain.tableId || '',
    orderType: plain.orderType || 'takeaway',
    paymentMode: plain.paymentMode || 'cash',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (plain.items || []).map((item: any) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image || '',
      originatedFromNudge: !!item.originatedFromNudge,
      nudgeType: item.nudgeType || null,
      nudgeRuleId: item.nudgeRuleId || null,
    })),
    subtotal: plain.subtotal,
    total: plain.total,
    status: plain.status,
    notes: plain.notes || '',
    appointmentDetails: plain.appointmentDetails ? {
      bookingDate: plain.appointmentDetails.bookingDate,
      bookingTime: plain.appointmentDetails.bookingTime,
      specialistId: plain.appointmentDetails.specialistId || '',
      specialistName: plain.appointmentDetails.specialistName || '',
      userNotes: plain.appointmentDetails.userNotes || '',
    } : undefined,
    activeSlotKey: plain.activeSlotKey || null,
    estimatedTime: plain.estimatedTime ?? 0,
    actualPrepTimeMinutes: plain.actualPrepTimeMinutes ?? 0,
    delayMinutes: plain.delayMinutes ?? 0,
    isDelayed: !!plain.isDelayed,
    delayReason: plain.delayReason || '',
    rejectionReason: plain.rejectionReason || '',
    rejectedAt: plain.rejectedAt ? new Date(plain.rejectedAt).toISOString() : '',
    trackingToken: plain.trackingToken || '',
    source: plain.source || 'qr_scan',
    placed_at: plain.placed_at ? new Date(plain.placed_at).toISOString() : (plain.createdAt ? new Date(plain.createdAt).toISOString() : ''),
    ready_at: plain.ready_at ? new Date(plain.ready_at).toISOString() : null,
    prep_duration_seconds: plain.prep_duration_seconds ?? null,
    whatsapp_notified: !!plain.whatsapp_notified,
    whatsapp_notified_at: plain.whatsapp_notified_at ? new Date(plain.whatsapp_notified_at).toISOString() : null,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : '',
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : '',
  };
}

/**
 * Creates and inserts a new Order transaction document into the database.
 * 
 * @param data Order details including subtotal, total, status, and items list.
 * @returns The newly created and normalized IOrder object.
 */
export async function create(data: {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  tableId?: string;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  paymentMode?: 'cash' | 'online';
  source?: 'qr_scan' | 'admin_counter';
  placed_at?: Date;
  ready_at?: Date;
  prep_duration_seconds?: number;
  whatsapp_notified?: boolean;
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
  status: IOrder['status'];
  notes?: string;
  appointmentDetails?: IOrder['appointmentDetails'];
  activeSlotKey?: string | null;
  trackingToken?: string;
}, options?: { session?: any }): Promise<IOrder> {
  await dbConnect();
  const cleanData = {
    ...data,
    restaurantId: sanitizeTenantId(data.restaurantId),
    source: data.source || 'qr_scan',
    placed_at: data.placed_at || new Date(),
    trackingToken: data.trackingToken || crypto.randomBytes(16).toString('hex'),
  };
  const docs = await Order.create([cleanData], options?.session ? { session: options.session } : undefined);
  const doc = Array.isArray(docs) ? docs[0] : docs;
  return normalizeOrder(doc);
}

/**
 * Retrieves an active appointment for date, time slot, and specialist to enforce concurrency locks.
 */
export async function findActiveAppointment(
  restaurantId: string,
  bookingDate: string,
  bookingTime: string,
  specialistName?: string
): Promise<IOrder | null> {
  await dbConnect();
  const cleanRestId = sanitizeTenantId(restaurantId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    restaurantId: cleanRestId,
    'appointmentDetails.bookingDate': bookingDate,
    'appointmentDetails.bookingTime': bookingTime,
    status: { $nin: ['cancelled', 'rejected'] },
  };
  if (specialistName) {
    query['appointmentDetails.specialistName'] = specialistName;
  }
  const doc = await Order.findOne(query);
  return doc ? normalizeOrder(doc) : null;
}

export async function findBookedSlotsForDate(
  restaurantId: string,
  bookingDate: string,
  specialistName?: string
): Promise<string[]> {
  await dbConnect();
  const cleanRestId = sanitizeTenantId(restaurantId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    restaurantId: cleanRestId,
    'appointmentDetails.bookingDate': bookingDate,
    status: { $nin: ['cancelled', 'rejected'] },
  };
  if (specialistName && specialistName !== 'Any Available Specialist') {
    query['appointmentDetails.specialistName'] = specialistName;
  }
  const orders = await Order.find(query, { 'appointmentDetails.bookingTime': 1 });
  return orders
    .map((o) => o.appointmentDetails?.bookingTime)
    .filter((time): time is string => Boolean(time));
}

export async function countActiveUnassignedAppointments(
  restaurantId: string,
  bookingDate: string,
  bookingTime: string
): Promise<number> {
  await dbConnect();
  const cleanRestId = sanitizeTenantId(restaurantId);
  return Order.countDocuments({
    restaurantId: cleanRestId,
    'appointmentDetails.bookingDate': bookingDate,
    'appointmentDetails.bookingTime': bookingTime,
    $or: [
      { 'appointmentDetails.specialistName': '' },
      { 'appointmentDetails.specialistName': null },
      { 'appointmentDetails.specialistName': { $exists: false } },
    ],
    status: { $nin: ['cancelled', 'rejected'] },
  });
}

/**
 * Retrieves the most recent completed orders for a restaurant, up to a limit.
 * Used by the recommendation engine to optimize memory and query sizing.
 * 
 * @param restaurantId Scope parameter enforcing tenant isolation.
 * @param limitCount Maximum number of orders to fetch (default: 1000).
 * @returns Array of normalized completed orders.
 */
export async function findRecentCompleted(restaurantId: string, limitCount = 1000): Promise<IOrder[]> {
  await dbConnect();
  const docs = await Order.find({ restaurantId: sanitizeTenantId(restaurantId), status: 'completed' })
                          .sort({ createdAt: -1 })
                          .limit(limitCount);
  return docs.map(normalizeOrder);
}

/**
 * Retrieves a single order by database ID within a specific restaurant scope.
 * 
 * @param restaurantId Scope enforcing multi-tenant isolation.
 * @param id Database string ID.
 * @returns The normalized order or null if not found.
 */
export async function findById(restaurantId?: string, id?: string): Promise<IOrder | null> {
  await dbConnect();
  if (!id) return null;
  const cleanRestId = sanitizeTenantId(restaurantId || '');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = { _id: id };
  if (cleanRestId) query.restaurantId = cleanRestId;
  const doc = await Order.findOne(query);
  return doc ? normalizeOrder(doc) : null;
}

/**
 * Retrieves orders associated with a specific restaurant tenant, paginated and optionally filtered.
 * 
 * @param restaurantId The restaurant slug ID.
 * @param limit Maximum number of orders to fetch.
 * @param skip Number of orders to skip.
 * @param status Optional order status filter.
 * @returns An object containing normalized IOrder objects and totalCount.
 */
export async function findAll(
  restaurantId: string,
  limit?: number,
  skip?: number,
  status?: string,
  source?: string
): Promise<{ orders: IOrder[]; totalCount: number }> {
  await dbConnect();
  const cleanRestId = sanitizeTenantId(restaurantId);
  const query: any = { restaurantId: cleanRestId };
  if (source && source !== 'all') {
    if (source === 'admin_counter') {
      query.source = 'admin_counter';
    } else if (source === 'qr_scan') {
      query.source = { $ne: 'admin_counter' };
    }
  }
  if (status && status !== 'all') {
    if (status === 'delayed') {
      query.isDelayed = true;
    } else if (status === 'missed') {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      query.status = 'received';
      query.createdAt = { $lt: tenMinutesAgo };
    } else {
      query.status = status;
    }
  }
  const totalCount = await Order.countDocuments(query);
  const findQuery = Order.find(query).sort({ createdAt: -1 });
  if (skip !== undefined) {
    findQuery.skip(skip);
  }
  if (limit !== undefined) {
    findQuery.limit(limit);
  }
  const docs = await findQuery;
  return {
    orders: docs.map(normalizeOrder),
    totalCount
  };
}

/**
 * Updates the cooking/completion status of a specific order inside a specific restaurant scope.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param id The database ID string of the target order.
 * @param status The updated status state (received, accepted, preparing, ready, completed, cancelled).
 * @returns The updated, normalized IOrder document, or null if not found.
 */
export async function updateStatus(
  restaurantId: string,
  id: string,
  status: IOrder['status'],
  delayData?: {
    actualPrepTimeMinutes?: number;
    delayMinutes?: number;
    isDelayed?: boolean;
    delayReason?: string;
  },
  rejectionReason?: string
): Promise<IOrder | null> {
  await dbConnect();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = { status };
  if (delayData) {
    if (delayData.actualPrepTimeMinutes !== undefined) payload.actualPrepTimeMinutes = delayData.actualPrepTimeMinutes;
    if (delayData.delayMinutes !== undefined) payload.delayMinutes = delayData.delayMinutes;
    if (delayData.isDelayed !== undefined) payload.isDelayed = delayData.isDelayed;
    if (delayData.delayReason !== undefined) payload.delayReason = delayData.delayReason;
  }
  if (status === 'cancelled' || status === 'rejected') {
    payload.activeSlotKey = null;
  }
  if (status === 'ready' || status === 'completed') {
    const existing = await Order.findOne({ _id: id, restaurantId: sanitizeTenantId(restaurantId) });
    if (existing && !existing.ready_at) {
      const readyAt = new Date();
      payload.ready_at = readyAt;
      const placedAt = existing.placed_at || existing.createdAt;
      if (placedAt) {
        payload.prep_duration_seconds = Math.max(0, Math.round((readyAt.getTime() - new Date(placedAt).getTime()) / 1000));
      }
    }
  }

  const doc = await Order.findOneAndUpdate(
    { _id: id, restaurantId: sanitizeTenantId(restaurantId) },
    payload,
    { new: true }
  );
  return doc ? normalizeOrder(doc) : null;
}

/**
 * Marks an order as notified via WhatsApp.
 */
export async function markWhatsAppNotified(restaurantId: string, id: string): Promise<IOrder | null> {
  await dbConnect();
  const doc = await Order.findOneAndUpdate(
    { _id: id, restaurantId: sanitizeTenantId(restaurantId) },
    { whatsapp_notified: true, whatsapp_notified_at: new Date() },
    { new: true }
  );
  return doc ? normalizeOrder(doc) : null;
}

/**
 * Updates the estimated preparation time (ETA minutes) and optionally shifts status to 'accepted' inside a specific restaurant scope.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param id The database ID string of the target order.
 * @param minutes The preparation duration estimate in minutes.
 * @param status The status state to apply (normally 'accepted').
 * @returns The updated, normalized IOrder document, or null.
 */
export async function updateEstimatedTime(
  restaurantId: string,
  id: string,
  minutes: number,
  status: IOrder['status']
): Promise<IOrder | null> {
  await dbConnect();
  const doc = await Order.findOneAndUpdate(
    { _id: id, restaurantId: sanitizeTenantId(restaurantId) },
    { estimatedTime: minutes, status },
    { new: true }
  );
  return doc ? normalizeOrder(doc) : null;
}

/**
 * Retrieves all orders belonging to a restaurant within a specified creation date range.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param start The start boundary Date object.
 * @param end The end boundary Date object.
 * @returns An array of normalized IOrder objects.
 */
export async function findInRange(restaurantId: string, start: Date, end: Date): Promise<IOrder[]> {
  await dbConnect();
  const docs = await Order.find({
    restaurantId: sanitizeTenantId(restaurantId),
    createdAt: { $gte: start, $lte: end },
  }).sort({ createdAt: -1 });
  return docs.map(normalizeOrder);
}

export async function countPending(restaurantId: string): Promise<number> {
  await dbConnect();
  return Order.countDocuments({
    restaurantId: sanitizeTenantId(restaurantId),
    status: { $in: ['received', 'accepted', 'preparing', 'ready'] },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function insertMany(restaurantId: string, items: any[]): Promise<IOrder[]> {
  await dbConnect();
  const cleanRestId = sanitizeTenantId(restaurantId);
  const itemsWithTenant = items.map(item => ({ ...item, restaurantId: cleanRestId }));
  const docs = await Order.insertMany(itemsWithTenant);
  return docs.map(normalizeOrder);
}

export async function deleteByRestaurantId(restaurantId: string): Promise<boolean> {
  await dbConnect();
  const result = await Order.deleteMany({ restaurantId: sanitizeTenantId(restaurantId) });
  return result.deletedCount > 0;
}

export async function deleteById(id: string): Promise<boolean> {
  await dbConnect();
  const result = await Order.deleteOne({ _id: id });
  return result.deletedCount > 0;
}

export async function findByTrackingToken(trackingToken: string, restaurantId?: string): Promise<IOrder | null> {
  await dbConnect();
  if (!trackingToken) return null;
  const query: any = { trackingToken };
  if (restaurantId) {
    query.restaurantId = sanitizeTenantId(restaurantId);
  }
  const doc = await Order.findOne(query);
  return doc ? normalizeOrder(doc) : null;
}

export async function findByCustomerPhone(restaurantId: string | undefined, phone: string): Promise<IOrder[]> {
  await dbConnect();
  const query: any = { customerPhone: phone };
  if (restaurantId) {
    query.restaurantId = sanitizeTenantId(restaurantId);
  }
  const docs = await Order.find(query).sort({ createdAt: -1 });
  return docs.map(normalizeOrder);
}

/**
 * Updates customerPhone and customerName on all orders belonging to a phone number.
 */
export async function updateOrdersCustomerDetails(
  restaurantId: string,
  oldPhone: string,
  newName: string,
  newPhone: string
): Promise<void> {
  await dbConnect();
  await Order.updateMany(
    { restaurantId, customerPhone: oldPhone.trim() },
    { $set: { customerName: newName.trim(), customerPhone: newPhone.trim() } }
  );
}

/**
 * Updates customerName on all orders belonging to a phone number.
 */
export async function updateOrdersCustomerName(
  restaurantId: string,
  phone: string,
  newName: string
): Promise<void> {
  await dbConnect();
  await Order.updateMany(
    { restaurantId, customerPhone: phone.trim() },
    { $set: { customerName: newName.trim() } }
  );
}

export function normalizeStaffCall(doc: any) {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    restaurantId: plain.restaurantId,
    tableId: plain.tableId,
    status: plain.status,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : '',
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : '',
  };
}

export async function createStaffCall(restaurantId: string, tableId: string) {
  await dbConnect();
  // Clear any existing pending calls for the same table to avoid duplicate alerts
  await StaffCall.deleteMany({ restaurantId: restaurantId.toLowerCase(), tableId, status: 'pending' });
  const doc = await StaffCall.create({
    restaurantId: restaurantId.toLowerCase(),
    tableId,
    status: 'pending',
  });
  return normalizeStaffCall(doc);
}

export async function getPendingStaffCalls(restaurantId: string) {
  await dbConnect();
  const docs = await StaffCall.find({
    restaurantId: restaurantId.toLowerCase(),
    status: 'pending',
  }).sort({ createdAt: 1 });
  return docs.map(normalizeStaffCall);
}

export async function updateStaffCallStatus(callId: string, restaurantId: string, status: 'accepted' | 'rejected') {
  await dbConnect();
  const doc = await StaffCall.findOneAndUpdate(
    { _id: callId, restaurantId: restaurantId.toLowerCase() },
    { status },
    { new: true }
  );
  return doc ? normalizeStaffCall(doc) : null;
}

/**
 * Highly optimized query for notification polling:
 * 1. Count-check: runs fast Order.countDocuments() and StaffCall.countDocuments() first.
 *    If count === 0, returns immediately without running full find queries or document mapping.
 * 2. Field Projection: Projects ONLY necessary alert card fields (.select(...)).
 */
export async function getNotificationAlerts(
  restaurantId: string,
  acknowledgedOrderIds: string[] = [],
  acknowledgedCallIds: string[] = []
): Promise<{ orders: IOrder[]; staffCalls: any[] }> {
  await dbConnect();
  const cleanRestId = restaurantId.toLowerCase().trim();

  // 1. Fast count check first
  const [receivedOrderCount, pendingCallCount] = await Promise.all([
    Order.countDocuments({
      restaurantId: cleanRestId,
      status: 'received',
      source: { $ne: 'admin_counter' },
      _id: { $nin: acknowledgedOrderIds },
    }),
    StaffCall.countDocuments({
      restaurantId: cleanRestId,
      status: 'pending',
      _id: { $nin: acknowledgedCallIds },
    }),
  ]);

  if (receivedOrderCount === 0 && pendingCallCount === 0) {
    return { orders: [], staffCalls: [] };
  }

  // 2. Field projection: fetch ONLY fields required by notification cards
  const [orderDocs, callDocs] = await Promise.all([
    receivedOrderCount > 0
      ? Order.find({
          restaurantId: cleanRestId,
          status: 'received',
          source: { $ne: 'admin_counter' },
          _id: { $nin: acknowledgedOrderIds },
        })
          .select('_id restaurantId customerName customerPhone tableId orderType paymentMode total items createdAt')
          .sort({ createdAt: -1 })
          .limit(20)
      : Promise.resolve([]),
    pendingCallCount > 0
      ? StaffCall.find({
          restaurantId: cleanRestId,
          status: 'pending',
          _id: { $nin: acknowledgedCallIds },
        }).sort({ createdAt: 1 })
      : Promise.resolve([]),
  ]);

  return {
    orders: orderDocs.map(normalizeOrder),
    staffCalls: callDocs.map(normalizeStaffCall),
  };
}

