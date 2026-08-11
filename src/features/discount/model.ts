import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. Coupon Schema
export interface ICouponDoc extends Document {
  restaurantId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minSpend: number;
  maxUsage?: number;
  usageCount: number;
  expiresAt?: Date;
  active: boolean;
}

const CouponSchema: Schema = new Schema<ICouponDoc>(
  {
    restaurantId: { type: String, required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minSpend: { type: Number, default: 0 },
    maxUsage: { type: Number, default: null },
    usageCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CouponSchema.index({ restaurantId: 1, code: 1 }, { unique: true });

export const Coupon: Model<ICouponDoc> =
  mongoose.models.Coupon || mongoose.model<ICouponDoc>('Coupon', CouponSchema);

// 2. Discount Settings Schema
export interface IDiscountSettingsDoc extends Document {
  restaurantId: string;
  masterEnabled: boolean;
  couponsEnabled: boolean;
  spendTiersEnabled: boolean;
  comboRulesEnabled: boolean;
  itemDiscountsEnabled: boolean;
  specialAddonsEnabled: boolean;
  specialAddonDiscountPercent: number;
  maxDiscountPerOrder: number;
  allowStacking: boolean;
}

const DiscountSettingsSchema: Schema = new Schema<IDiscountSettingsDoc>(
  {
    restaurantId: { type: String, required: true, unique: true, index: true },
    masterEnabled: { type: Boolean, default: true },
    couponsEnabled: { type: Boolean, default: true },
    spendTiersEnabled: { type: Boolean, default: true },
    comboRulesEnabled: { type: Boolean, default: true },
    itemDiscountsEnabled: { type: Boolean, default: true },
    specialAddonsEnabled: { type: Boolean, default: true },
    specialAddonDiscountPercent: { type: Number, default: 30 },
    maxDiscountPerOrder: { type: Number, default: 0 }, // 0 = unlimited cap
    allowStacking: { type: Boolean, default: true },
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.DiscountSettings) {
  delete (mongoose.models as any).DiscountSettings;
}

export const DiscountSettings: Model<IDiscountSettingsDoc> =
  mongoose.model<IDiscountSettingsDoc>('DiscountSettings', DiscountSettingsSchema);
