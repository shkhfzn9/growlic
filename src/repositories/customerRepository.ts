import dbConnect from '@/lib/mongodb';
import Customer from '@/models/Customer';
import { ICustomer } from '@/types';

/**
 * Normalizes a raw Mongoose document representing a Customer into a standardized ICustomer plain object.
 * Converts DB identifiers to string form and serializes numeric fields.
 * 
 * @param doc The raw Mongoose document or plain object.
 * @returns A normalized ICustomer object.
 */
export function normalizeCustomer(doc: any): ICustomer {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    restaurantId: plain.restaurantId,
    name: plain.name,
    phone: plain.phone,
    totalOrders: plain.totalOrders ?? 0,
    totalSpent: plain.totalSpent ?? 0,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
  };
}

/**
 * Finds a customer record matching the restaurant scope ID and their phone number.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param phone The unique customer phone number string.
 * @returns The normalized ICustomer record if found, or null otherwise.
 */
export async function findByPhone(restaurantId: string, phone: string): Promise<ICustomer | null> {
  await dbConnect();
  const doc = await Customer.findOne({
    restaurantId,
    phone: phone.trim(),
  });
  return doc ? normalizeCustomer(doc) : null;
}

/**
 * Creates and inserts a new Customer document into the database.
 * 
 * @param data Customer details including name, phone, and optional initial stats.
 * @returns The newly created and normalized ICustomer record.
 */
export async function create(data: {
  restaurantId: string;
  name: string;
  phone: string;
  totalOrders?: number;
  totalSpent?: number;
}): Promise<ICustomer> {
  await dbConnect();
  const doc = await Customer.create({
    restaurantId: data.restaurantId,
    name: data.name.trim(),
    phone: data.phone.trim(),
    totalOrders: data.totalOrders ?? 0,
    totalSpent: data.totalSpent ?? 0,
  });
  return normalizeCustomer(doc);
}

/**
 * Updates the accumulated order count and spent totals of a specific customer.
 * 
 * @param id The database ID string of the target customer.
 * @param totalOrders The updated total number of completed orders.
 * @param totalSpent The updated total revenue spent by the customer.
 * @returns The updated, normalized ICustomer document, or null.
 */
export async function updateStats(
  id: string,
  totalOrders: number,
  totalSpent: number
): Promise<ICustomer | null> {
  await dbConnect();
  const doc = await Customer.findByIdAndUpdate(
    id,
    { totalOrders, totalSpent },
    { new: true }
  );
  return doc ? normalizeCustomer(doc) : null;
}

/**
 * Searches for customer profiles matching a phone number query inside a restaurant's scope.
 * Records are returned sorted descending by total spent, then by total order count.
 * 
 * @param restaurantId The identifier of the restaurant tenant.
 * @param searchPhone Optional query phone string (matches using case-insensitive regex).
 * @returns An array of normalized ICustomer records.
 */
export async function search(restaurantId: string, searchPhone?: string): Promise<ICustomer[]> {
  await dbConnect();
  const query: any = { restaurantId };
  if (searchPhone) {
    query.phone = { $regex: searchPhone.trim(), $options: 'i' };
  }
  const docs = await Customer.find(query).sort({ totalSpent: -1, totalOrders: -1 });
  return docs.map(normalizeCustomer);
}

/**
 * Counts the total number of registered customer profiles under a specific restaurant.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns A promise resolving to the total count of customer records.
 */
export async function count(restaurantId: string): Promise<number> {
  await dbConnect();
  return Customer.countDocuments({ restaurantId });
}

/**
 * Finds multiple customer records matching a list of phone numbers inside a restaurant's scope.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param phones Array of customer phone strings.
 * @returns An array of matching, normalized ICustomer records.
 */
export async function findManyByPhones(restaurantId: string, phones: string[]): Promise<ICustomer[]> {
  await dbConnect();
  const docs = await Customer.find({
    restaurantId,
    phone: { $in: phones.map(p => p.trim()) },
  });
  return docs.map(normalizeCustomer);
}
