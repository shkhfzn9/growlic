import dbConnect from '@/lib/mongodb';
import { DeveloperPromo } from '../model';
import { IDeveloperPromo } from '../types';

export const DEFAULT_DEVELOPER_PROMO = {
  active: true,
  position: 2,
  headline: 'Your Business Deserves Better Software.',
  subheadline: 'Custom websites, web apps, mobile apps & AI automation built to grow your business.',
  ctaText: 'Book a Free Consultation',
  ctaLink: 'https://growlic.com',
  bgColorFrom: '#0F172A',
  bgColorTo: '#1E1B4B',
  textColor: '#FFFFFF',
  ctaBgColor: '#F5C518',
  ctaTextColor: '#1A1A1A',
  badgeText: 'SOFTWARE & DIGITAL SOLUTIONS',
  image: '/Screenshot 2026-08-03 175540.png',
};

/**
 * Normalizes a raw Mongoose document representing DeveloperPromo into a plain IDeveloperPromo object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeDeveloperPromo(doc: any, restaurantId: string): IDeveloperPromo {
  if (!doc) {
    return {
      restaurantId,
      ...DEFAULT_DEVELOPER_PROMO,
    };
  }
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id ? plain._id.toString() : undefined,
    restaurantId: plain.restaurantId || restaurantId,
    active: plain.active !== undefined ? plain.active : DEFAULT_DEVELOPER_PROMO.active,
    position: plain.position !== undefined ? Number(plain.position) : DEFAULT_DEVELOPER_PROMO.position,
    headline: plain.headline || DEFAULT_DEVELOPER_PROMO.headline,
    subheadline: plain.subheadline || DEFAULT_DEVELOPER_PROMO.subheadline,
    ctaText: plain.ctaText || DEFAULT_DEVELOPER_PROMO.ctaText,
    ctaLink: plain.ctaLink || DEFAULT_DEVELOPER_PROMO.ctaLink,
    bgColorFrom: plain.bgColorFrom || DEFAULT_DEVELOPER_PROMO.bgColorFrom,
    bgColorTo: plain.bgColorTo || DEFAULT_DEVELOPER_PROMO.bgColorTo,
    textColor: plain.textColor || DEFAULT_DEVELOPER_PROMO.textColor,
    ctaBgColor: plain.ctaBgColor || DEFAULT_DEVELOPER_PROMO.ctaBgColor,
    ctaTextColor: plain.ctaTextColor || DEFAULT_DEVELOPER_PROMO.ctaTextColor,
    badgeText: plain.badgeText || DEFAULT_DEVELOPER_PROMO.badgeText,
    image: plain.image || DEFAULT_DEVELOPER_PROMO.image,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
  };
}

/**
 * Retrieves the DeveloperPromo document for a specific restaurant ID.
 */
export async function findByRestaurantId(restaurantId: string): Promise<IDeveloperPromo> {
  await dbConnect();
  const doc = await DeveloperPromo.findOne({ restaurantId });
  return normalizeDeveloperPromo(doc, restaurantId);
}

/**
 * Upserts the DeveloperPromo document for a specific restaurant ID.
 */
export async function saveForRestaurant(
  restaurantId: string,
  data: Partial<IDeveloperPromo>
): Promise<IDeveloperPromo> {
  await dbConnect();
  const updatePayload = {
    restaurantId,
    active: data.active !== undefined ? data.active : true,
    position: data.position !== undefined ? Number(data.position) : 1,
    headline: data.headline?.trim() || DEFAULT_DEVELOPER_PROMO.headline,
    subheadline: data.subheadline?.trim() || DEFAULT_DEVELOPER_PROMO.subheadline,
    ctaText: data.ctaText?.trim() || DEFAULT_DEVELOPER_PROMO.ctaText,
    ctaLink: data.ctaLink?.trim() || DEFAULT_DEVELOPER_PROMO.ctaLink,
    bgColorFrom: data.bgColorFrom || DEFAULT_DEVELOPER_PROMO.bgColorFrom,
    bgColorTo: data.bgColorTo || DEFAULT_DEVELOPER_PROMO.bgColorTo,
    textColor: data.textColor || DEFAULT_DEVELOPER_PROMO.textColor,
    ctaBgColor: data.ctaBgColor || DEFAULT_DEVELOPER_PROMO.ctaBgColor,
    ctaTextColor: data.ctaTextColor || DEFAULT_DEVELOPER_PROMO.ctaTextColor,
    badgeText: data.badgeText?.trim() || DEFAULT_DEVELOPER_PROMO.badgeText,
    image: data.image || '',
  };

  const doc = await DeveloperPromo.findOneAndUpdate(
    { restaurantId },
    updatePayload,
    { new: true, upsert: true }
  );
  return normalizeDeveloperPromo(doc, restaurantId);
}
