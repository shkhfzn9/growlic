export interface ICoupon {
  _id: string;
  restaurantId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minSpend: number;
  maxUsage?: number;
  usageCount: number;
  expiresAt?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IDiscountSettings {
  _id?: string;
  restaurantId: string;
  masterEnabled: boolean;
  couponsEnabled: boolean;
  spendTiersEnabled: boolean;
  comboRulesEnabled: boolean;
  itemDiscountsEnabled: boolean;
  specialAddonsEnabled: boolean;
  specialAddonDiscountPercent: number;
  maxDiscountPerOrder: number; // 0 = unlimited
  allowStacking: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IItemDiscountInfo {
  _id: string;
  name: string;
  category: string;
  price: number;
  discountPercent: number;
  discountedPrice: number;
  active: boolean;
}

export interface IDiscountAnalytics {
  totalDiscountGiven: number;
  discountedOrdersCount: number;
  totalOrdersCount: number;
  avgDiscountPerOrder: number;
  maxDiscountInSingleOrder: number;
  totalRevenue: number;
}
