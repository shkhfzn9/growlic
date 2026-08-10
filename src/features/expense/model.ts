import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. Expense Category Schema
export interface IExpenseCategoryDocument extends Document {
  restaurantId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseCategorySchema = new Schema<IExpenseCategoryDocument>(
  {
    restaurantId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

ExpenseCategorySchema.index({ restaurantId: 1, name: 1 }, { unique: true });

export const ExpenseCategory: Model<IExpenseCategoryDocument> =
  mongoose.models.ExpenseCategory ||
  mongoose.model<IExpenseCategoryDocument>('ExpenseCategory', ExpenseCategorySchema);

// 2. Expense Item Profile Schema
export type ExpenseUnit = 'kg' | 'litre' | 'gram' | 'ml' | 'piece' | 'dozen' | 'packet';

export interface IExpenseItemDocument extends Document {
  restaurantId: string;
  categoryId: mongoose.Types.ObjectId | string;
  name: string;
  unit: ExpenseUnit;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseItemSchema = new Schema<IExpenseItemDocument>(
  {
    restaurantId: { type: String, required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'ExpenseCategory', required: true, index: true },
    name: { type: String, required: true, trim: true },
    unit: {
      type: String,
      enum: ['kg', 'litre', 'gram', 'ml', 'piece', 'dozen', 'packet'],
      required: true,
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ExpenseItemSchema.index({ restaurantId: 1, categoryId: 1, name: 1 }, { unique: true });

export const ExpenseItem: Model<IExpenseItemDocument> =
  mongoose.models.ExpenseItem ||
  mongoose.model<IExpenseItemDocument>('ExpenseItem', ExpenseItemSchema);

// 3. Expense Log Purchase Schema
export interface IExpenseLogDocument extends Document {
  restaurantId: string;
  itemId: mongoose.Types.ObjectId | string;
  purchaseDate: Date;
  quantity: number;
  totalPrice: number;
  pricePerUnit: number;
  previousLogId?: mongoose.Types.ObjectId | string | null;
  deltaPerUnit?: number | null;
  deltaTotal?: number | null;
  deltaPercent?: number | null;
  note?: string;
  vendor?: string;
  createdBy?: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseLogSchema = new Schema<IExpenseLogDocument>(
  {
    restaurantId: { type: String, required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'ExpenseItem', required: true, index: true },
    purchaseDate: { type: Date, required: true, index: true },
    quantity: { type: Number, required: true, min: 0.0001 },
    totalPrice: { type: Number, required: true, min: 0 },
    pricePerUnit: { type: Number, required: true },
    previousLogId: { type: Schema.Types.ObjectId, ref: 'ExpenseLog', default: null },
    deltaPerUnit: { type: Number, default: null },
    deltaTotal: { type: Number, default: null },
    deltaPercent: { type: Number, default: null },
    note: { type: String, default: '' },
    vendor: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Hot path index for log history, delta lookups & time series charts
ExpenseLogSchema.index({ restaurantId: 1, itemId: 1, purchaseDate: -1, _id: -1 });

export const ExpenseLog: Model<IExpenseLogDocument> =
  mongoose.models.ExpenseLog ||
  mongoose.model<IExpenseLogDocument>('ExpenseLog', ExpenseLogSchema);
