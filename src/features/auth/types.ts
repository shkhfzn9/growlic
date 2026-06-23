export interface IAdmin {
  _id: string;
  email: string;
  restaurantId: string;
  restaurantName: string;
  phone: string;
  designation: string;
  role: 'owner' | 'manager' | 'staff';
  logoUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  createdAt?: string;
  updatedAt?: string;
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
