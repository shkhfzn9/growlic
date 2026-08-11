export interface Customer {
  _id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue?: number;
  lastOrderDate?: string | null;
  favoriteCategory?: string;
  stampCount?: number;
  hasPendingDiscount?: boolean;
  totalRedemptions?: number;
}
