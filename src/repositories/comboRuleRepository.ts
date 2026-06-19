import dbConnect from '@/lib/mongodb';
import ComboRule from '@/models/ComboRule';
import { IComboRule } from '@/types';

/**
 * Normalizes a raw Mongoose document representing a ComboRule into a standard IComboRule plain object.
 * Converts DB properties to type-safe and serialized fields.
 * 
 * @param doc The raw Mongoose document.
 * @returns A standardized, plain interface structure of the combo rule.
 */
export function normalizeComboRule(doc: any): IComboRule {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    restaurantId: plain.restaurantId,
    conditionCategory: plain.conditionCategory,
    conditionExcludeCategory: plain.conditionExcludeCategory || null,
    rewardType: plain.rewardType,
    rewardTarget: plain.rewardTarget,
    customerMessage: plain.customerMessage,
    active: plain.active !== undefined ? plain.active : true,
    triggerCount: plain.triggerCount ?? 0,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
  };
}

/**
 * Retrieves all combo rules associated with a specific restaurant ID.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns An array of normalized IComboRule objects.
 */
export async function findAll(restaurantId: string): Promise<IComboRule[]> {
  await dbConnect();
  const docs = await ComboRule.find({ restaurantId });
  return docs.map(normalizeComboRule);
}

/**
 * Retrieves all active combo rules associated with a specific restaurant ID.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns An array of active, normalized IComboRule objects.
 */
export async function findActive(restaurantId: string): Promise<IComboRule[]> {
  await dbConnect();
  const docs = await ComboRule.find({ restaurantId, active: true });
  return docs.map(normalizeComboRule);
}

/**
 * Creates and registers a new promotional combo rule (e.g. BOGO) in the database.
 * 
 * @param data Configuration values detailing condition categories, exclusions, reward types, targets, and custom customer messages.
 * @returns The newly created, normalized IComboRule object.
 */
export async function create(data: {
  restaurantId: string;
  conditionCategory: string;
  conditionExcludeCategory: string | null;
  rewardType: 'free_item' | 'percent_off_item' | 'percent_off_order';
  rewardTarget: string;
  customerMessage: string;
  active: boolean;
  triggerCount?: number;
}): Promise<IComboRule> {
  await dbConnect();
  const doc = await ComboRule.create({
    restaurantId: data.restaurantId,
    conditionCategory: data.conditionCategory,
    conditionExcludeCategory: data.conditionExcludeCategory,
    rewardType: data.rewardType,
    rewardTarget: data.rewardTarget,
    customerMessage: data.customerMessage,
    active: data.active,
    triggerCount: data.triggerCount ?? 0,
  });
  return normalizeComboRule(doc);
}

/**
 * Updates properties of an existing combo rule.
 * 
 * @param id The database ID string of the combo rule.
 * @param restaurantId Tenant identifier to ensure isolation checks.
 * @param data Partial combo rule updates containing condition rules or reward targets.
 * @returns The updated, normalized IComboRule document, or null if not found.
 */
export async function update(
  id: string,
  restaurantId: string,
  data: {
    conditionCategory?: string;
    conditionExcludeCategory?: string | null;
    rewardType?: 'free_item' | 'percent_off_item' | 'percent_off_order';
    rewardTarget?: string;
    customerMessage?: string;
    active?: boolean;
    triggerCount?: number;
  }
): Promise<IComboRule | null> {
  await dbConnect();
  const doc = await ComboRule.findOneAndUpdate(
    { _id: id, restaurantId },
    data,
    { new: true }
  );
  return doc ? normalizeComboRule(doc) : null;
}

/**
 * Deletes a combo rule.
 * 
 * @param id The target rule database identifier.
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @returns A promise resolving to true if deleted, false otherwise.
 */
export async function deleteRule(id: string, restaurantId: string): Promise<boolean> {
  await dbConnect();
  const result = await ComboRule.deleteOne({ _id: id, restaurantId });
  return result.deletedCount > 0;
}

/**
 * Performs a bulk insert of combo rules.
 * 
 * @param items Array of combo rule raw parameters.
 * @returns An array of newly created, normalized combo rules.
 */
export async function insertMany(items: any[]): Promise<IComboRule[]> {
  await dbConnect();
  const docs = await ComboRule.insertMany(items);
  return docs.map(normalizeComboRule);
}

/**
 * Deletes all combo rules belonging to a specific restaurant tenant.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns Resolves to true if records were deleted, false otherwise.
 */
export async function deleteByRestaurantId(restaurantId: string): Promise<boolean> {
  await dbConnect();
  const result = await ComboRule.deleteMany({ restaurantId });
  return result.deletedCount > 0;
}
