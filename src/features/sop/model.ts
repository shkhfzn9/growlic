import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. SOP Task Definition Interface & Schema
export interface ISopTaskDocument extends Document {
  restaurantId: string;
  batchName: string;
  batchWindow: string;
  taskName: string;
  description?: string;
  targetMinutes: number;
  assignedStaffName?: string;
  active: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

const SopTaskSchema: Schema = new Schema<ISopTaskDocument>(
  {
    restaurantId: { type: String, required: true, index: true },
    batchName: { type: String, required: true, index: true },
    batchWindow: { type: String, required: true },
    taskName: { type: String, required: true },
    description: { type: String, default: '' },
    targetMinutes: { type: Number, required: true, min: 1 },
    assignedStaffName: { type: String, default: '' },
    active: { type: Boolean, default: true, index: true },
    orderIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SopTaskSchema.index({ restaurantId: 1, active: 1, orderIndex: 1 });

export const SopTask: Model<ISopTaskDocument> =
  mongoose.models.SopTask || mongoose.model<ISopTaskDocument>('SopTask', SopTaskSchema);

// 2. SOP Log Entry Interface & Schema (Employee Task Execution & Bottleneck Tracking)
export interface ISopLogDocument extends Document {
  restaurantId: string;
  taskId: string;
  taskName: string;
  batchName: string;
  employeeName: string;
  startTime: Date;
  endTime: Date;
  actualMinutes: number;
  targetMinutes: number;
  delayMinutes: number; // actualMinutes - targetMinutes (if > 0)
  status: 'completed' | 'delayed';
  delayReason?: string;
  dateStr: string; // YYYY-MM-DD format for fast querying
  createdAt: Date;
  updatedAt: Date;
}

const SopLogSchema: Schema = new Schema<ISopLogDocument>(
  {
    restaurantId: { type: String, required: true, index: true },
    taskId: { type: String, required: true, index: true },
    taskName: { type: String, required: true },
    batchName: { type: String, required: true },
    employeeName: { type: String, required: true, index: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    actualMinutes: { type: Number, required: true },
    targetMinutes: { type: Number, required: true },
    delayMinutes: { type: Number, default: 0 },
    status: { type: String, enum: ['completed', 'delayed'], default: 'completed', index: true },
    delayReason: { type: String, default: '' },
    dateStr: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

SopLogSchema.index({ restaurantId: 1, dateStr: 1 });

export const SopLog: Model<ISopLogDocument> =
  mongoose.models.SopLog || mongoose.model<ISopLogDocument>('SopLog', SopLogSchema);

// 3. SOP Staff Profile Interface & Schema
export interface ISopStaffDocument extends Document {
  restaurantId: string;
  name: string;
  role?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SopStaffSchema: Schema = new Schema<ISopStaffDocument>(
  {
    restaurantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    role: { type: String, default: 'Kitchen Staff' },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

SopStaffSchema.index({ restaurantId: 1, active: 1 });

export const SopStaff: Model<ISopStaffDocument> =
  mongoose.models.SopStaff || mongoose.model<ISopStaffDocument>('SopStaff', SopStaffSchema);
