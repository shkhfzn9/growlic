export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  originatedFromNudge?: boolean;
  nudgeType?: 'cross_sell' | 'threshold_discount' | 'combo_freebie';
  nudgeRuleId?: string;
}

export interface Order {
  _id: string;
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  tableId?: string;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  paymentMode?: 'cash' | 'online';
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: 'received' | 'scheduled' | 'accepted' | 'confirmed' | 'in_progress' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'rejected';
  notes?: string;
  estimatedTime?: number;
  actualPrepTimeMinutes?: number;
  delayMinutes?: number;
  isDelayed?: boolean;
  delayReason?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}
