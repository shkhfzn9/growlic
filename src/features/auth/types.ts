export interface IAdmin {
  _id: string;
  email: string;
  restaurantId: string;
  restaurantName: string;
  phone: string;
  designation: string;
  role: 'owner' | 'manager' | 'staff' | 'restaurant_admin' | 'super_admin';
  logoUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  createdAt?: string;
  updatedAt?: string;
  active?: boolean;
  location?: string;
}

export interface ISession {
  _id: string;
  userId: string;
  restaurantId: string;
  tokenHash: string;
  createdAt?: string;
  expiresAt: string;
  revoked: boolean;
}
