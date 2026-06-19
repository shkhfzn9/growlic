export interface IMenuItem {
  _id: string;
  restaurantId: string;
  category: string;
  name: string;
  description: string;
  image: string;
  price: number;
  available: boolean;
  pairsWithCategories: string[];
  active: boolean;
  images: string[];
  preparation: string;
  ingredients: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  spiceLevel: number;
  portionSize: string;
  prepTimeMin: number;
  prepTimeMax: number;
  chefNote: string;
  createdAt?: string;
  updatedAt?: string;
}

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
  items: IOrderItem[];
  subtotal: number;
  total: number;
  status: 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  estimatedTime?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ICustomer {
  _id: string;
  restaurantId: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IEvent {
  _id: string;
  restaurantId: string;
  type: 'modal_open' | 'cart_create' | 'nudge_show';
  itemId?: string;
  nudgeType?: string;
  createdAt: string;
}

export interface IPairingRule {
  _id: string;
  restaurantId: string;
  triggerCategory: string;
  suggestCategories: string[];
  active: boolean;
  triggerCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IDiscountTier {
  _id: string;
  restaurantId: string;
  minSpend: number;
  percentOff: number;
  categoryScope: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IComboRule {
  _id: string;
  restaurantId: string;
  conditionCategory: string;
  conditionExcludeCategory: string | null;
  rewardType: 'free_item' | 'percent_off_item' | 'percent_off_order';
  rewardTarget: string;
  customerMessage: string;
  active: boolean;
  triggerCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IAdmin {
  _id: string;
  email: string;
  restaurantId: string;
  restaurantName: string;
  phone: string;
  designation: string;
  createdAt?: string;
  updatedAt?: string;
}
