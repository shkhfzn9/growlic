import dbConnect from '@/lib/mongodb';
import DiscountTier from '@/models/DiscountTier';
import { IDiscountTier } from '@/types';

/**
 * Normalizes a raw Mongoose document representing a DiscountTier into a standard IDiscountTier plain object.
 * Converts DB properties to type-safe and serialized fields.
 * 
 * @param doc The raw Mongoose document.
 * @returns A standardized, plain interface structure of the discount tier.
 */
export function normalizeDiscountTier(doc: any): IDiscountTier {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    restaurantId: plain.restaurantId,
    minSpend: plain.minSpend,
    percentOff: plain.percentOff,
    categoryScope: plain.categoryScope || null,
    active: plain.active !== undefined ? plain.active : true,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
  };
}

/**
 * Retrieves all discount tiers associated with a specific restaurant ID.
 * Tiers are sorted in ascending order of their minimum spend requirements.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns An array of normalized IDiscountTier objects.
 */
export async function findAll(restaurantId: string): Promise<IDiscountTier[]> {
  await dbConnect();
  const docs = await DiscountTier.find({ restaurantId }).sort({ minSpend: 1 });
  return docs.map(normalizeDiscountTier);
}

/**
 * Retrieves all active discount tiers associated with a specific restaurant ID.
 * Tiers are sorted in ascending order of their minimum spend requirements.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns An array of active, normalized IDiscountTier objects.
 */
export async function findActive(restaurantId: string): Promise<IDiscountTier[]> {
  await dbConnect();
  const docs = await DiscountTier.find({ restaurantId, active: true }).sort({ minSpend: 1 });
  return docs.map(normalizeDiscountTier);
}

/**
 * Creates and registers a new threshold spent discount tier in the database.
 * 
 * @param data Configuration values detailing minimum spend, percentage off, category scope and status.
 * @returns The newly created, normalized IDiscountTier object.
 */
export async function create(data: {
  restaurantId: string;
  minSpend: number;
  percentOff: number;
  categoryScope: string | null;
  active?: boolean;
}): Promise<IDiscountTier> {
  await dbConnect();
  const doc = await DiscountTier.create({
    restaurantId: data.restaurantId,
    minSpend: Number(data.minSpend),
    percentOff: Number(data.percentOff),
    categoryScope: data.categoryScope ? data.categoryScope.trim() : null,
    active: data.active !== undefined ? data.active : true,
  });
  return normalizeDiscountTier(doc);
}

/**
 * Updates properties of an existing discount tier.
 * 
 * @param id The database ID string of the discount tier.
 * @param restaurantId Tenant identifier to ensure isolation checks.
 * @param data Partial tier updates containing minimum spent or discount values.
 * @returns The updated, normalized IDiscountTier document, or null if not found.
 */
export async function update(
  id: string,
  restaurantId: string,
  data: {
    minSpend?: number;
    percentOff?: number;
    categoryScope?: string | null;
    active?: boolean;
  }
): Promise<IDiscountTier | null> {
  await dbConnect();
  const updatePayload: any = {};
  if (data.minSpend !== undefined) updatePayload.minSpend = Number(data.minSpend);
  if (data.percentOff !== undefined) updatePayload.percentOff = Number(data.percentOff);
  if (data.categoryScope !== undefined) {
    updatePayload.categoryScope = data.categoryScope ? data.categoryScope.trim() : null;
  }
  if (data.active !== undefined) updatePayload.active = data.active;

  const doc = await DiscountTier.findOneAndUpdate(
    { _id: id, restaurantId },
    updatePayload,
    { new: true }
  );
  return doc ? normalizeDiscountTier(doc) : null;
}

/**
 * Deletes a discount tier.
 * 
 * @param id The target tier database identifier.
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @returns A promise resolving to true if deleted, false otherwise.
 */
export async function deleteTier(id: string, restaurantId: string): Promise<boolean> {
  await dbConnect();
  const result = await DiscountTier.deleteOne({ _id: id, restaurantId });
  return result.deletedCount > 0;
}

/**
 * Performs a bulk insert of discount tiers.
 * 
 * @param items Array of discount tier raw parameters.
 * @returns An array of newly created, normalized discount tiers.
 */
export async function insertMany(items: any[]): Promise<IDiscountTier[]> {
  await dbConnect();
  const docs = await DiscountTier.insertMany(items);
  return docs.map(normalizeDiscountTier);
}

/**
 * Deletes all discount tiers belonging to a specific restaurant tenant.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns Resolves to true if records were deleted, false otherwise.
 */
export async function deleteByRestaurantId(restaurantId: string): Promise<boolean> {
  await dbConnect();
  const result = await DiscountTier.deleteMany({ restaurantId });
  return result.deletedCount > 0;
}
