import dbConnect from '@/lib/mongodb';
import Menu from '../model';
import { IMenuItem } from '../types';
import { sanitizeTenantId } from '@/lib/tenant';

/**
 * Normalizes a raw Mongoose document representing a Menu item into a plain IMenuItem object.
 * Converts DB properties to type-safe and serialized fields.
 * 
 * @param doc The raw Mongoose document.
 * @returns A standardized, plain interface structure of the menu item.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeMenuItem(doc: any): IMenuItem {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    restaurantId: plain.restaurantId,
    category: plain.category,
    name: plain.name,
    description: plain.description || '',
    image: plain.image || '',
    price: plain.price,
    available: plain.available !== undefined ? plain.available : true,
    pairsWithCategories: plain.pairsWithCategories || [],
    active: plain.active !== undefined ? plain.active : true,
    images: plain.images || [],
    preparation: plain.preparation || '',
    ingredients: plain.ingredients || [],
    nutrition: {
      calories: plain.nutrition?.calories ?? 0,
      protein: plain.nutrition?.protein ?? 0,
      carbs: plain.nutrition?.carbs ?? 0,
      fat: plain.nutrition?.fat ?? 0,
    },
    spiceLevel: plain.spiceLevel ?? 0,
    portionSize: plain.portionSize || '',
    prepTimeMin: plain.prepTimeMin ?? 0,
    prepTimeMax: plain.prepTimeMax ?? 0,
    chefNote: plain.chefNote || '',
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
  };
}

/**
 * Returns all menu items associated with a specific restaurant ID.
 * Items are sorted alphabetically by category name and dish name.
 * 
 * @param restaurantId The unique identifier slug of the restaurant tenant.
 * @returns An array of normalized IMenuItem objects.
 */
export async function findAll(restaurantId: string): Promise<IMenuItem[]> {
  await dbConnect();
  const docs = await Menu.find({ restaurantId: sanitizeTenantId(restaurantId) }).sort({ category: 1, name: 1 }).lean();
  return docs.map(normalizeMenuItem);
}

export async function findById(restaurantId: string, id: string): Promise<IMenuItem | null> {
  await dbConnect();
  if (!id || typeof id !== 'string') return null;
  const cleanRestId = sanitizeTenantId(restaurantId);
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
  try {
    const doc = await Menu.findOne({ _id: id, restaurantId: cleanRestId }).lean();
    return doc ? normalizeMenuItem(doc) : null;
  } catch (err) {
    return null;
  }
}

/**
 * Creates and registers a new Menu Item in the database.
 * 
 * @param data Menu item properties such as categories, names, margins, and nutritional values.
 * @returns The newly created and normalized IMenuItem document.
 */
export async function create(data: Partial<IMenuItem> & { restaurantId: string; category: string; name: string; price: number }): Promise<IMenuItem> {
  await dbConnect();
  const doc = await Menu.create({
    restaurantId: sanitizeTenantId(data.restaurantId),
    category: data.category,
    name: data.name,
    description: data.description || '',
    image: data.image || '',
    price: Number(data.price),
    available: data.available !== undefined ? data.available : true,
    pairsWithCategories: data.pairsWithCategories || [],
    active: data.active !== undefined ? data.active : true,
    images: data.images || [],
    preparation: data.preparation || '',
    ingredients: data.ingredients || [],
    nutrition: data.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    spiceLevel: data.spiceLevel || 0,
    portionSize: data.portionSize || '',
    prepTimeMin: data.prepTimeMin || 0,
    prepTimeMax: data.prepTimeMax || 0,
    chefNote: data.chefNote || '',
  });
  return normalizeMenuItem(doc);
}

/**
 * Inserts multiple menu items into MongoDB inside a bulk operation under the specified restaurant tenant.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param items Array of menu item objects to create.
 * @returns Array of newly created and normalized IMenuItem objects.
 */
export async function bulkCreate(
  restaurantId: string,
  items: Array<Omit<IMenuItem, '_id'>>
): Promise<IMenuItem[]> {
  await dbConnect();
  const cleanRestId = sanitizeTenantId(restaurantId);
  const docsToInsert = items.map((item) => ({
    restaurantId: cleanRestId,
    category: item.category,
    name: item.name,
    description: item.description || '',
    image: item.image || '',
    price: Number(item.price),
    available: item.available !== undefined ? item.available : true,
    active: item.active !== undefined ? item.active : true,
    pairsWithCategories: item.pairsWithCategories || [],
    images: item.images || [],
    preparation: item.preparation || '',
    ingredients: item.ingredients || [],
    nutrition: item.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    spiceLevel: item.spiceLevel || 0,
    portionSize: item.portionSize || '',
    prepTimeMin: item.prepTimeMin || 0,
    prepTimeMax: item.prepTimeMax || 0,
    chefNote: item.chefNote || '',
  }));

  const docs = await Menu.insertMany(docsToInsert);
  return docs.map(normalizeMenuItem);
}

/**
 * Updates properties of an existing menu item inside a specific restaurant scope.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param id The database ID string of the target menu item.
 * @param data Partial item settings containing fields to overwrite.
 * @returns The modified, normalized IMenuItem record, or null if matching document doesn't exist.
 */
export async function update(restaurantId: string, id: string, data: Partial<IMenuItem>): Promise<IMenuItem | null> {
  await dbConnect();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: any = { ...data };
  if (data.price !== undefined) {
    updatePayload.price = Number(data.price);
  }
  const doc = await Menu.findOneAndUpdate(
    { _id: id, restaurantId },
    updatePayload,
    { new: true }
  );
  return doc ? normalizeMenuItem(doc) : null;
}

/**
 * Deletes a menu item from the database within a specific restaurant scope.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param id The target menu item ID string.
 * @returns A promise resolving to true if deleted, false otherwise.
 */
export async function deleteItem(restaurantId: string, id: string): Promise<boolean> {
  await dbConnect();
  const result = await Menu.findOneAndDelete({ _id: id, restaurantId });
  return !!result;
}

/**
 * Updates the category classification tag for a specific menu item.
 * 
 * @param id The target menu item database identifier.
 * @param category The name of the updated category.
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @returns The updated, normalized IMenuItem, or null.
 */
export async function updateCategory(id: string, category: string, restaurantId: string): Promise<IMenuItem | null> {
  await dbConnect();
  const doc = await Menu.findOneAndUpdate(
    { _id: id, restaurantId },
    { category: category.trim() },
    { new: true }
  );
  return doc ? normalizeMenuItem(doc) : null;
}

/**
 * Updates the list of category suggestion tags for upsell pairings.
 * 
 * @param id The target menu item database identifier.
 * @param pairsWithCategories The list of categories this item pairs with.
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @returns The updated, normalized IMenuItem, or null.
 */
export async function updatePairsWith(id: string, pairsWithCategories: string[], restaurantId: string): Promise<IMenuItem | null> {
  await dbConnect();
  const doc = await Menu.findOneAndUpdate(
    { _id: id, restaurantId },
    { pairsWithCategories },
    { new: true }
  );
  return doc ? normalizeMenuItem(doc) : null;
}

/**
 * Toggles a menu item's active and live availability flags.
 * 
 * @param id The target menu item database identifier.
 * @param active Status flag indicating visibility.
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @returns The updated, normalized IMenuItem, or null.
 */
export async function updateActive(id: string, active: boolean, restaurantId: string): Promise<IMenuItem | null> {
  await dbConnect();
  const doc = await Menu.findOneAndUpdate(
    { _id: id, restaurantId },
    { active, available: active },
    { new: true }
  );
  return doc ? normalizeMenuItem(doc) : null;
}

/**
 * Performs a bulk insert of menu item documents scoped to a specific restaurant.
 * 
 * @param restaurantId The restaurant slug ID.
 * @param items Array of menu item raw parameters.
 * @returns An array of newly created, normalized menu items.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function insertMany(restaurantId: string, items: any[]): Promise<IMenuItem[]> {
  await dbConnect();
  const itemsWithTenant = items.map(item => ({ ...item, restaurantId }));
  const docs = await Menu.insertMany(itemsWithTenant);
  return docs.map(normalizeMenuItem);
}

/**
 * Clears/deletes all menu items matching a specific restaurant identifier.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns Resolves to true if matching records were deleted, false otherwise.
 */
export async function deleteByRestaurantId(restaurantId: string): Promise<boolean> {
  await dbConnect();
  const result = await Menu.deleteMany({ restaurantId });
  return result.deletedCount > 0;
}

/**
 * Adjusts all menu item prices for a restaurant by a specified amount (e.g. +1 or -1).
 * Ensures item price does not fall below ₹1.
 * 
 * @param restaurantId The restaurant slug ID.
 * @param amount The numeric adjustment amount (+1 or -1).
 * @returns The count of updated menu items.
 */
export async function adjustAllPrices(restaurantId: string, amount: number): Promise<number> {
  await dbConnect();
  const docs = await Menu.find({ restaurantId });
  let count = 0;
  for (const doc of docs) {
    const updated = Math.max(1, Number(doc.price) + amount);
    doc.price = updated;
    await doc.save();
    count++;
  }
  return count;
}

export async function increaseAllPrices(restaurantId: string, amount: number = 1): Promise<number> {
  return adjustAllPrices(restaurantId, amount);
}
