import dbConnect from '@/lib/mongodb';
import { Coupon, DiscountSettings } from './model';
import { ICoupon, IDiscountSettings } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCoupon(doc: any): ICoupon {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    restaurantId: plain.restaurantId,
    code: plain.code,
    discountType: plain.discountType,
    discountValue: plain.discountValue,
    minSpend: plain.minSpend || 0,
    maxUsage: plain.maxUsage || undefined,
    usageCount: plain.usageCount || 0,
    expiresAt: plain.expiresAt ? new Date(plain.expiresAt).toISOString() : undefined,
    active: plain.active !== undefined ? plain.active : true,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSettings(doc: any): IDiscountSettings {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    restaurantId: plain.restaurantId,
    masterEnabled: plain.masterEnabled !== undefined ? plain.masterEnabled : true,
    couponsEnabled: plain.couponsEnabled !== undefined ? plain.couponsEnabled : true,
    spendTiersEnabled: plain.spendTiersEnabled !== undefined ? plain.spendTiersEnabled : true,
    comboRulesEnabled: plain.comboRulesEnabled !== undefined ? plain.comboRulesEnabled : true,
    itemDiscountsEnabled: plain.itemDiscountsEnabled !== undefined ? plain.itemDiscountsEnabled : true,
    specialAddonsEnabled: plain.specialAddonsEnabled !== undefined ? plain.specialAddonsEnabled : true,
    specialAddonDiscountPercent: plain.specialAddonDiscountPercent ?? 30,
    maxDiscountPerOrder: plain.maxDiscountPerOrder || 0,
    allowStacking: plain.allowStacking !== undefined ? plain.allowStacking : true,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
  };
}

/**
 * Gets or creates default discount settings for a restaurant.
 */
export async function getDiscountSettings(restaurantId: string): Promise<IDiscountSettings> {
  await dbConnect();
  let settings = await DiscountSettings.findOne({ restaurantId });
  if (!settings) {
    settings = await DiscountSettings.create({
      restaurantId,
      masterEnabled: true,
      couponsEnabled: true,
      spendTiersEnabled: true,
      comboRulesEnabled: true,
      itemDiscountsEnabled: true,
      specialAddonsEnabled: true,
      specialAddonDiscountPercent: 30,
      maxDiscountPerOrder: 0,
      allowStacking: true,
    });
  }
  return normalizeSettings(settings);
}

/**
 * Updates discount settings for a restaurant.
 */
export async function updateDiscountSettings(
  restaurantId: string,
  data: Partial<IDiscountSettings>
): Promise<IDiscountSettings> {
  await dbConnect();
  const settings = await DiscountSettings.findOneAndUpdate(
    { restaurantId },
    { $set: data },
    { new: true, upsert: true }
  );
  return normalizeSettings(settings);
}

/**
 * Gets all coupons for a restaurant.
 */
export async function getCoupons(restaurantId: string): Promise<ICoupon[]> {
  await dbConnect();
  const docs = await Coupon.find({ restaurantId }).sort({ createdAt: -1 });
  return docs.map(normalizeCoupon);
}

/**
 * Creates a new coupon.
 */
export async function createCoupon(data: {
  restaurantId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minSpend?: number;
  maxUsage?: number;
  expiresAt?: string;
  active?: boolean;
}): Promise<ICoupon> {
  await dbConnect();
  const formattedCode = data.code.trim().toUpperCase();
  const existing = await Coupon.findOne({ restaurantId: data.restaurantId, code: formattedCode });
  if (existing) {
    throw new Error(`Coupon code '${formattedCode}' already exists for this restaurant.`);
  }

  const doc = await Coupon.create({
    restaurantId: data.restaurantId,
    code: formattedCode,
    discountType: data.discountType,
    discountValue: Number(data.discountValue),
    minSpend: Number(data.minSpend || 0),
    maxUsage: data.maxUsage ? Number(data.maxUsage) : undefined,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    active: data.active !== undefined ? data.active : true,
  });

  return normalizeCoupon(doc);
}

/**
 * Updates an existing coupon.
 */
export async function updateCoupon(
  id: string,
  restaurantId: string,
  data: Partial<ICoupon>
): Promise<ICoupon | null> {
  await dbConnect();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {};
  if (data.code !== undefined) payload.code = data.code.trim().toUpperCase();
  if (data.discountType !== undefined) payload.discountType = data.discountType;
  if (data.discountValue !== undefined) payload.discountValue = Number(data.discountValue);
  if (data.minSpend !== undefined) payload.minSpend = Number(data.minSpend);
  if (data.maxUsage !== undefined) payload.maxUsage = data.maxUsage ? Number(data.maxUsage) : null;
  if (data.expiresAt !== undefined) payload.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  if (data.active !== undefined) payload.active = data.active;

  const doc = await Coupon.findOneAndUpdate({ _id: id, restaurantId }, payload, { new: true });
  return doc ? normalizeCoupon(doc) : null;
}

/**
 * Deletes a coupon.
 */
export async function deleteCoupon(id: string, restaurantId: string): Promise<boolean> {
  await dbConnect();
  const res = await Coupon.deleteOne({ _id: id, restaurantId });
  return res.deletedCount > 0;
}

/**
 * Validates a coupon code for customer cart checkout.
 */
export async function validateCoupon(
  restaurantId: string,
  code: string,
  subtotal: number
): Promise<{ valid: boolean; coupon?: ICoupon; discountAmount: number; message: string }> {
  await dbConnect();
  const settings = await getDiscountSettings(restaurantId);

  if (!settings.masterEnabled) {
    return { valid: false, discountAmount: 0, message: 'Discounts are currently disabled by store management.' };
  }

  if (!settings.couponsEnabled) {
    return { valid: false, discountAmount: 0, message: 'Promo coupon codes are disabled.' };
  }

  const formattedCode = code.trim().toUpperCase();
  const couponDoc = await Coupon.findOne({ restaurantId, code: formattedCode });

  if (!couponDoc) {
    return { valid: false, discountAmount: 0, message: 'Invalid coupon code.' };
  }

  const coupon = normalizeCoupon(couponDoc);

  if (!coupon.active) {
    return { valid: false, discountAmount: 0, message: 'This coupon is no longer active.' };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { valid: false, discountAmount: 0, message: 'This coupon code has expired.' };
  }

  if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
    return { valid: false, discountAmount: 0, message: 'Coupon usage limit has been reached.' };
  }

  if (subtotal < coupon.minSpend) {
    return {
      valid: false,
      discountAmount: 0,
      message: `Minimum spend of ₹${coupon.minSpend} required for this coupon code.`,
    };
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = Math.round(subtotal * (coupon.discountValue / 100));
  } else {
    discountAmount = coupon.discountValue;
  }

  // Cap discount if maxDiscountPerOrder is set in store settings
  if (settings.maxDiscountPerOrder > 0 && discountAmount > settings.maxDiscountPerOrder) {
    discountAmount = settings.maxDiscountPerOrder;
  }

  discountAmount = Math.min(discountAmount, subtotal);

  return {
    valid: true,
    coupon,
    discountAmount,
    message: `Coupon code '${coupon.code}' applied successfully!`,
  };
}

/**
 * Increments coupon usage count after an order is successfully placed.
 */
export async function incrementCouponUsage(restaurantId: string, code: string): Promise<void> {
  await dbConnect();
  await Coupon.updateOne(
    { restaurantId, code: code.trim().toUpperCase() },
    { $inc: { usageCount: 1 } }
  );
}
