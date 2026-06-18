import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomer extends Document {
  restaurantId: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
}

const CustomerSchema: Schema = new Schema<ICustomer>(
  {
    restaurantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compiling model query once
const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

export default Customer;
