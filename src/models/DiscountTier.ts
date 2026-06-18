import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDiscountTier extends Document {
  restaurantId: string;
  minSpend: number;
  percentOff: number;
  categoryScope: string | null; // e.g. null = all items
  active: boolean;
}

const DiscountTierSchema: Schema = new Schema<IDiscountTier>(
  {
    restaurantId: { type: String, required: true, index: true },
    minSpend: { type: Number, required: true },
    percentOff: { type: Number, required: true },
    categoryScope: { type: String, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const DiscountTier: Model<IDiscountTier> =
  mongoose.models.DiscountTier || mongoose.model<IDiscountTier>('DiscountTier', DiscountTierSchema);

export default DiscountTier;
