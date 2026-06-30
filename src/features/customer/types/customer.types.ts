export interface Customer {
  _id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  stampCount?: number;
  hasPendingDiscount?: boolean;
  totalRedemptions?: number;
}
