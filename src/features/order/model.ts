import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  originatedFromNudge?: boolean;
  nudgeType?: 'cross_sell' | 'threshold_discount' | 'combo_freebie';
  nudgeRuleId?: string;
}

export interface IOrderDocument extends Document {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  tableId?: string;
  items: IOrderItem[];
  subtotal: number;
  total: number;
  status: 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  notes?: string;
  estimatedTime?: number; // preparation time in minutes
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema: Schema = new Schema<IOrderItem>({
  menuItemId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: { type: String, default: '' },
  originatedFromNudge: { type: Boolean, default: false },
  nudgeType: { type: String, enum: ['cross_sell', 'threshold_discount', 'combo_freebie'], default: null },
  nudgeRuleId: { type: String, default: null },
});

const OrderSchema: Schema = new Schema<IOrderDocument>(
  {
    restaurantId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true, index: true },
    tableId: { type: String, default: null },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['received', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'received',
      index: true,
    },
    notes: { type: String, default: '' },
    estimatedTime: { type: Number, default: 0 },
  },
  { timestamps: true }
);

OrderSchema.index({ restaurantId: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });

export interface IStaffCall {
  _id: string;
  restaurantId: string;
  tableId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
}

export interface IStaffCallDocument extends Document {
  restaurantId: string;
  tableId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const StaffCallSchema: Schema = new Schema<IStaffCallDocument>(
  {
    restaurantId: { type: String, required: true, index: true },
    tableId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Order;
  delete mongoose.models.StaffCall;
}

const Order: Model<IOrderDocument> = mongoose.models.Order || mongoose.model<IOrderDocument>('Order', OrderSchema);

export const StaffCall: Model<IStaffCallDocument> =
  mongoose.models.StaffCall || mongoose.model<IStaffCallDocument>('StaffCall', StaffCallSchema);

export default Order;
