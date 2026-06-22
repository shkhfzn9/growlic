import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminDocument extends Document {
  email: string;
  password: string;
  restaurantId: string;
  restaurantName: string;
  phone: string;
  designation: string;
}

const AdminSchema: Schema = new Schema<IAdminDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    restaurantId: { type: String, required: true, unique: true, index: true },
    restaurantName: { type: String, required: true },
    phone: { type: String, required: true },
    designation: { type: String, required: true },
  },
  { timestamps: true }
);

const Admin: Model<IAdminDocument> =
  mongoose.models.Admin || mongoose.model<IAdminDocument>('Admin', AdminSchema);

export default Admin;
