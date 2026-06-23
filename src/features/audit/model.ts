import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLogDocument extends Document {
  restaurantId: string;
  userId?: string;
  action: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  before?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  after?: any;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema<IAuditLogDocument>(
  {
    restaurantId: { type: String, required: true },
    userId: { type: String },
    action: { type: String, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  }
);

// Compound Index for isolation and chronological queries
AuditLogSchema.index({ restaurantId: 1, createdAt: -1 });

const AuditLog: Model<IAuditLogDocument> =
  mongoose.models.AuditLog || mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);

export default AuditLog;
