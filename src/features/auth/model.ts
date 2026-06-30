import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminDocument extends Document {
  email: string;
  password: string;
  restaurantId: string;
  restaurantName: string;
  phone: string;
  designation: string;
  role: 'owner' | 'manager' | 'staff' | 'restaurant_admin' | 'super_admin';
  logoUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  active?: boolean;
  location?: string;
  loyaltyEnabled?: boolean;
  stampsRequired?: number;
  discountPercentage?: number;
}

const AdminSchema: Schema = new Schema<IAdminDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    restaurantId: { type: String, required: true, unique: true, index: true },
    restaurantName: { type: String, required: true },
    phone: { type: String, required: true },
    designation: { type: String, required: true },
    role: { type: String, enum: ['owner', 'manager', 'staff', 'restaurant_admin', 'super_admin'], default: 'staff', required: true },
    logoUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#000000' },
    welcomeMessage: { type: String, default: 'Welcome to our restaurant!' },
    active: { type: Boolean, default: true, required: true },
    location: { type: String, default: 'Tokyo', required: true },
    loyaltyEnabled: { type: Boolean, default: false },
    stampsRequired: { type: Number, default: 8 },
    discountPercentage: { type: Number, default: 20 },
  },
  { timestamps: true }
);


const Admin: Model<IAdminDocument> =
  mongoose.models.Admin || mongoose.model<IAdminDocument>('Admin', AdminSchema);

export interface ISessionDocument extends Document {
  userId: string;
  restaurantId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revoked: boolean;
}

const SessionSchema: Schema = new Schema<ISessionDocument>(
  {
    userId: { type: String, required: true },
    restaurantId: { type: String, required: true },
    tokenHash: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false, required: true },
  }
);

// Indexes
SessionSchema.index({ restaurantId: 1, tokenHash: 1 });
SessionSchema.index({ userId: 1, revoked: 1 });

const Session: Model<ISessionDocument> =
  mongoose.models.Session || mongoose.model<ISessionDocument>('Session', SessionSchema);

export { Admin, Session };
export default Admin;
