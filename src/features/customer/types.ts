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
