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
  status: 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  notes?: string;
  estimatedTime?: number;
  actualPrepTimeMinutes?: number;
  delayMinutes?: number;
  isDelayed?: boolean;
  delayReason?: string;
  createdAt?: string;
  updatedAt?: string;
}
