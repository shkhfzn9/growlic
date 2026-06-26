import dbConnect from '@/lib/mongodb';
import { Banner } from '../model';
import { IBanner } from '../types';

/**
 * Normalizes a raw Mongoose document representing a Banner into a plain IBanner object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeBanner(doc: any): IBanner {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    restaurantId: plain.restaurantId,
    title: plain.title,
    subtitle: plain.subtitle || '',
    buttonText: plain.buttonText || 'Order Now',
    buttonLink: plain.buttonLink || '',
    image: plain.image || '',
    active: plain.active !== undefined ? plain.active : true,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
  };
}

/**
 * Retrieves all banners associated with a specific restaurant ID.
 */
export async function findAll(restaurantId: string): Promise<IBanner[]> {
  await dbConnect();
  const docs = await Banner.find({ restaurantId }).sort({ createdAt: -1 });
  return docs.map(normalizeBanner);
}

/**
 * Retrieves active banners associated with a specific restaurant ID.
 */
export async function findActive(restaurantId: string): Promise<IBanner[]> {
  await dbConnect();
  const docs = await Banner.find({ restaurantId, active: true }).sort({ createdAt: -1 });
  return docs.map(normalizeBanner);
}

/**
 * Creates and registers a new banner in the database.
 */
export async function create(data: {
  restaurantId: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  image?: string;
  active?: boolean;
}): Promise<IBanner> {
  await dbConnect();
  const doc = await Banner.create({
    restaurantId: data.restaurantId,
    title: data.title.trim(),
    subtitle: data.subtitle ? data.subtitle.trim() : '',
    buttonText: data.buttonText ? data.buttonText.trim() : 'Order Now',
    buttonLink: data.buttonLink ? data.buttonLink.trim() : '',
    image: data.image || '',
    active: data.active !== undefined ? data.active : true,
  });
  return normalizeBanner(doc);
}

/**
 * Updates properties of an existing banner.
 */
export async function update(
  id: string,
  restaurantId: string,
  data: {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
    image?: string;
    active?: boolean;
  }
): Promise<IBanner | null> {
  await dbConnect();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: any = {};
  if (data.title !== undefined) updatePayload.title = data.title.trim();
  if (data.subtitle !== undefined) updatePayload.subtitle = data.subtitle.trim();
  if (data.buttonText !== undefined) updatePayload.buttonText = data.buttonText.trim();
  if (data.buttonLink !== undefined) updatePayload.buttonLink = data.buttonLink.trim();
  if (data.image !== undefined) updatePayload.image = data.image;
  if (data.active !== undefined) updatePayload.active = data.active;

  const doc = await Banner.findOneAndUpdate(
    { _id: id, restaurantId },
    updatePayload,
    { new: true }
  );
  return doc ? normalizeBanner(doc) : null;
}

/**
 * Deletes a banner.
 */
export async function deleteBanner(id: string, restaurantId: string): Promise<boolean> {
  await dbConnect();
  const result = await Banner.deleteOne({ _id: id, restaurantId });
  return result.deletedCount > 0;
}

/**
 * Deletes all banners for a restaurant.
 */
export async function deleteByRestaurantId(restaurantId: string): Promise<boolean> {
  await dbConnect();
  const result = await Banner.deleteMany({ restaurantId });
  return result.deletedCount > 0;
}
