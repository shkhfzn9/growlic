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
  paymentMode?: 'cash' | 'online';
  items: IOrderItem[];
  subtotal: number;
  total: number;
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
  createdAt?: string;
  updatedAt?: string;
}
