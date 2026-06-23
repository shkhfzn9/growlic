import dbConnect from '@/lib/mongodb';
import Order from './model';
import { IOrder } from './types';

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
    estimatedTime: plain.estimatedTime ?? 0,
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
  status?: IOrder['status'];
}): Promise<IOrder> {
  await dbConnect();
  const doc = await Order.create({
    restaurantId: data.restaurantId,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    tableId: data.tableId || undefined,
    items: data.items,
    subtotal: data.subtotal,
    total: data.total,
    status: data.status || 'received',
  });
  return normalizeOrder(doc);
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
  const docs = await Order.find({ restaurantId, status: 'completed' })
                          .sort({ createdAt: -1 })
                          .limit(limitCount);
  return docs.map(normalizeOrder);
}

/**
 * Retrieves a single order by its database identifier ID within a specific restaurant scope.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param id The order ID string.
 * @returns The normalized IOrder record if found, or null otherwise.
 */
export async function findById(restaurantId: string | undefined, id: string): Promise<IOrder | null> {
  await dbConnect();
  const query: any = { _id: id };
  if (restaurantId) {
    query.restaurantId = restaurantId.toLowerCase();
  } else {
    query.restaurantId = { $exists: true };
  }
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
  status?: string
): Promise<{ orders: IOrder[]; totalCount: number }> {
  await dbConnect();
  const query: any = { restaurantId };
  if (status && status !== 'all') {
    query.status = status;
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
export async function updateStatus(restaurantId: string, id: string, status: IOrder['status']): Promise<IOrder | null> {
  await dbConnect();
  const doc = await Order.findOneAndUpdate(
    { _id: id, restaurantId },
    { status },
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
    { _id: id, restaurantId },
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
    restaurantId,
    createdAt: { $gte: start, $lte: end },
  }).sort({ createdAt: -1 });
  return docs.map(normalizeOrder);
}

/**
 * Counts the number of pending orders (received, accepted, preparing, or ready) for a specific restaurant.
 * Used to calculate active load warnings on the client.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns A promise resolving to the pending orders count.
 */
export async function countPending(restaurantId: string): Promise<number> {
  await dbConnect();
  return Order.countDocuments({
    restaurantId,
    status: { $in: ['received', 'accepted', 'preparing', 'ready'] },
  });
}

/**
 * Performs a bulk insert of order documents scoped to a specific restaurant.
 * 
 * @param restaurantId The restaurant slug ID.
 * @param items Array of raw order parameters.
 * @returns An array of newly created, normalized order records.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function insertMany(restaurantId: string, items: any[]): Promise<IOrder[]> {
  await dbConnect();
  const itemsWithTenant = items.map(item => ({ ...item, restaurantId }));
  const docs = await Order.insertMany(itemsWithTenant);
  return docs.map(normalizeOrder);
}

/**
 * Deletes all orders belonging to a specific restaurant tenant.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns Resolves to true if records were deleted, false otherwise.
 */
export async function deleteByRestaurantId(restaurantId: string): Promise<boolean> {
  await dbConnect();
  const result = await Order.deleteMany({ restaurantId });
  return result.deletedCount > 0;
}
