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

export interface IOrder extends Document {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  items: IOrderItem[];
  subtotal: number;
  total: number;
  status: 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
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

const OrderSchema: Schema = new Schema<IOrder>(
  {
    restaurantId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['received', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'received',
      index: true,
    },
    estimatedTime: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
