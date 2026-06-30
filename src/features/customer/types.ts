export interface ICustomer {
  _id: string;
  restaurantId: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  stampCount: number;
  lastStampDate: string | null;
  hasPendingDiscount: boolean;
  totalRedemptions: number;
  createdAt?: string;
  updatedAt?: string;
}
