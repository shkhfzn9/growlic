import dbConnect from '@/lib/mongodb';
import Menu from '@/models/Menu';
import { IMenuItem } from '@/types';

/**
 * Normalizes a raw Mongoose document representing a Menu item into a plain IMenuItem object.
 * Converts DB properties to type-safe and serialized fields.
 * 
 * @param doc The raw Mongoose document.
 * @returns A standardized, plain interface structure of the menu item.
 */
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
  const docs = await Menu.find({ restaurantId }).sort({ category: 1, name: 1 });
  return docs.map(normalizeMenuItem);
}

/**
 * Retrieves a single menu item by its database ID.
 * 
 * @param id The menu item database ID string.
 * @returns The normalized IMenuItem object if found, or null otherwise.
 */
export async function findById(id: string): Promise<IMenuItem | null> {
  await dbConnect();
  const doc = await Menu.findById(id);
  return doc ? normalizeMenuItem(doc) : null;
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
    restaurantId: data.restaurantId,
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
 * Updates properties of an existing menu item.
 * 
 * @param id The database ID string of the target menu item.
 * @param data Partial item settings containing fields to overwrite.
 * @returns The modified, normalized IMenuItem record, or null if matching document doesn't exist.
 */
export async function update(id: string, data: Partial<IMenuItem>): Promise<IMenuItem | null> {
  await dbConnect();
  const updatePayload: any = { ...data };
  if (data.price !== undefined) {
    updatePayload.price = Number(data.price);
  }
  const doc = await Menu.findByIdAndUpdate(id, updatePayload, { new: true });
  return doc ? normalizeMenuItem(doc) : null;
}

/**
 * Deletes a menu item from the database.
 * 
 * @param id The target menu item ID string.
 * @returns A promise resolving to true if deleted, false otherwise.
 */
export async function deleteItem(id: string): Promise<boolean> {
  await dbConnect();
  const result = await Menu.findByIdAndDelete(id);
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
 * Performs a bulk insert of menu item documents.
 * 
 * @param items Array of menu item raw parameters.
 * @returns An array of newly created, normalized menu items.
 */
export async function insertMany(items: any[]): Promise<IMenuItem[]> {
  await dbConnect();
  const docs = await Menu.insertMany(items);
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
