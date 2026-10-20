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

export interface IOrder {
  _id: string;
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  tableId?: string;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  paymentMode?: 'cash' | 'online' | 'credit';
  items: IOrderItem[];
  subtotal: number;
  total: number;
  discount?: number;
  tax?: number;
  couponCode?: string;
  status: 'received' | 'scheduled' | 'accepted' | 'confirmed' | 'in_progress' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'rejected';
  notes?: string;
  appointmentDetails?: IAppointmentDetails;
  activeSlotKey?: string | null;
  estimatedTime?: number;
  actualPrepTimeMinutes?: number;
  delayMinutes?: number;
  isDelayed?: boolean;
  delayReason?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  trackingToken?: string;
  source?: 'qr_scan' | 'admin_counter';
  placed_at?: string;
  ready_at?: string | null;
  prep_duration_seconds?: number | null;
  whatsapp_notified?: boolean;
  whatsapp_notified_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
