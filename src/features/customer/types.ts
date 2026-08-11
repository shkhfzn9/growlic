export interface ICustomer {
  _id: string;
  restaurantId: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue?: number;
  lastOrderDate?: string | null;
  favoriteCategory?: string;
  stampCount: number;
  lastStampDate: string | null;
  hasPendingDiscount: boolean;
  totalRedemptions: number;
  createdAt?: string;
  updatedAt?: string;
}
