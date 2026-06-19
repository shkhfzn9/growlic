import dbConnect from '@/lib/mongodb';
import PairingRule from '@/models/PairingRule';
import { IPairingRule } from '@/types';

/**
 * Normalizes a raw Mongoose document representing a PairingRule into a standard IPairingRule plain object.
 * Converts DB properties to type-safe and serialized fields.
 * 
 * @param doc The raw Mongoose document.
 * @returns A standardized, plain interface structure of the pairing rule.
 */
export function normalizePairingRule(doc: any): IPairingRule {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    restaurantId: plain.restaurantId,
    triggerCategory: plain.triggerCategory,
    suggestCategories: plain.suggestCategories || [],
    active: plain.active !== undefined ? plain.active : true,
    triggerCount: plain.triggerCount ?? 0,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
  };
}

/**
 * Retrieves all pairing rules associated with a specific restaurant ID.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns An array of normalized IPairingRule objects.
 */
export async function findAll(restaurantId: string): Promise<IPairingRule[]> {
  await dbConnect();
  const docs = await PairingRule.find({ restaurantId });
  return docs.map(normalizePairingRule);
}

/**
 * Retrieves all active/live pairing rules associated with a specific restaurant ID.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns An array of active, normalized IPairingRule objects.
 */
export async function findActive(restaurantId: string): Promise<IPairingRule[]> {
  await dbConnect();
  const docs = await PairingRule.find({ restaurantId, active: true });
  return docs.map(normalizePairingRule);
}

/**
 * Creates a new cross-sell category pairing rule in the database.
 * 
 * @param data Configuration values containing trigger category, suggestions array, and active status.
 * @returns The newly created, normalized IPairingRule object.
 */
export async function create(data: {
  restaurantId: string;
  triggerCategory: string;
  suggestCategories: string[];
  active: boolean;
  triggerCount?: number;
}): Promise<IPairingRule> {
  await dbConnect();
  const doc = await PairingRule.create({
    restaurantId: data.restaurantId,
    triggerCategory: data.triggerCategory,
    suggestCategories: data.suggestCategories,
    active: data.active,
    triggerCount: data.triggerCount ?? 0,
  });
  return normalizePairingRule(doc);
}

/**
 * Updates properties of an existing pairing rule.
 * 
 * @param id The database ID string of the pairing rule.
 * @param restaurantId Tenant identifier to ensure isolation checks.
 * @param data Partial rule updates containing trigger fields or suggestions array.
 * @returns The updated, normalized IPairingRule document, or null if not found.
 */
export async function update(
  id: string,
  restaurantId: string,
  data: {
    triggerCategory?: string;
    suggestCategories?: string[];
    active?: boolean;
    triggerCount?: number;
  }
): Promise<IPairingRule | null> {
  await dbConnect();
  const doc = await PairingRule.findOneAndUpdate(
    { _id: id, restaurantId },
    data,
    { new: true }
  );
  return doc ? normalizePairingRule(doc) : null;
}

/**
 * Deletes a pairing rule.
 * 
 * @param id The target rule database identifier.
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @returns A promise resolving to true if deleted, false otherwise.
 */
export async function deleteRule(id: string, restaurantId: string): Promise<boolean> {
  await dbConnect();
  const result = await PairingRule.deleteOne({ _id: id, restaurantId });
  return result.deletedCount > 0;
}

/**
 * Performs a bulk insert of pairing rules.
 * 
 * @param items Array of pairing rule raw parameters.
 * @returns An array of newly created, normalized pairing rules.
 */
export async function insertMany(items: any[]): Promise<IPairingRule[]> {
  await dbConnect();
  const docs = await PairingRule.insertMany(items);
  return docs.map(normalizePairingRule);
}

/**
 * Deletes all pairing rules belonging to a specific restaurant tenant.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns Resolves to true if records were deleted, false otherwise.
 */
export async function deleteByRestaurantId(restaurantId: string): Promise<boolean> {
  await dbConnect();
  const result = await PairingRule.deleteMany({ restaurantId });
  return result.deletedCount > 0;
}
