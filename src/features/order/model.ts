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

export interface IAppointmentDetails {
  bookingDate: string;
  bookingTime: string;
  specialistId?: string;
  specialistName?: string;
  userNotes?: string;
}

export interface IOrderDocument extends Document {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  tableId?: string;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  paymentMode?: 'cash' | 'online';
  items: IOrderItem[];
  subtotal: number;
  total: number;
  discount?: number;
  couponCode?: string;
  status: 'received' | 'scheduled' | 'accepted' | 'confirmed' | 'in_progress' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'rejected';
  notes?: string;
  appointmentDetails?: IAppointmentDetails;
  activeSlotKey?: string | null;
  estimatedTime?: number; // preparation time in minutes
  actualPrepTimeMinutes?: number;
  delayMinutes?: number;
  isDelayed?: boolean;
  delayReason?: string;
  rejectionReason?: string;
  rejectedAt?: Date;
  trackingToken?: string;
  source?: 'qr_scan' | 'admin_counter';
  placed_at?: Date;
  ready_at?: Date | null;
  prep_duration_seconds?: number | null;
  whatsapp_notified?: boolean;
  whatsapp_notified_at?: Date | null;
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

const AppointmentDetailsSchema: Schema = new Schema<IAppointmentDetails>({
  bookingDate: { type: String, required: true },
  bookingTime: { type: String, required: true },
  specialistId: { type: String, default: '' },
  specialistName: { type: String, default: '' },
  userNotes: { type: String, default: '' },
}, { _id: false });

const OrderSchema: Schema = new Schema<IOrderDocument>(
  {
    restaurantId: { type: String, required: true, index: true },
    customerName: { type: String, default: 'Counter Guest' },
    customerPhone: { type: String, required: true, index: true },
    tableId: { type: String, default: null },
    orderType: { type: String, enum: ['dine_in', 'takeaway', 'delivery'], default: 'takeaway' },
    paymentMode: { type: String, enum: ['cash', 'online'], default: 'cash' },
    source: { type: String, enum: ['qr_scan', 'admin_counter'], default: 'qr_scan', index: true },
    placed_at: { type: Date, default: Date.now },
    ready_at: { type: Date, default: null },
    prep_duration_seconds: { type: Number, default: null },
    whatsapp_notified: { type: Boolean, default: false },
    whatsapp_notified_at: { type: Date, default: null },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    status: {
      type: String,
      enum: ['received', 'scheduled', 'accepted', 'confirmed', 'in_progress', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'],
      default: 'received',
      index: true,
    },
    notes: { type: String, default: '' },
    appointmentDetails: { type: AppointmentDetailsSchema, default: null },
    activeSlotKey: { type: String, default: null },
    estimatedTime: { type: Number, default: 0 },
    actualPrepTimeMinutes: { type: Number, default: 0 },
    delayMinutes: { type: Number, default: 0 },
    isDelayed: { type: Boolean, default: false, index: true },
    delayReason: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    rejectedAt: { type: Date, default: null },
    trackingToken: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true }
);

OrderSchema.index({ restaurantId: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, source: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, source: 1, status: 1, createdAt: -1 });

// Valid Atomic Concurrency Lock: Partial Unique Index on activeSlotKey
OrderSchema.index(
  { activeSlotKey: 1 },
  {
    unique: true,
    partialFilterExpression: { activeSlotKey: { $type: 'string' } },
  }
);

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
