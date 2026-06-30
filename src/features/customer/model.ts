import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomerDocument extends Document {
  restaurantId: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  stampCount: number;
  lastStampDate: Date | null;
  hasPendingDiscount: boolean;
  totalRedemptions: number;
}

const CustomerSchema: Schema = new Schema<ICustomerDocument>(
  {
    restaurantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    stampCount: { type: Number, default: 0 },
    lastStampDate: { type: Date, default: null },
    hasPendingDiscount: { type: Boolean, default: false },
    totalRedemptions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CustomerSchema.index({ restaurantId: 1, phone: 1 });

const Customer: Model<ICustomerDocument> =
  mongoose.models.Customer || mongoose.model<ICustomerDocument>('Customer', CustomerSchema);

export default Customer;
