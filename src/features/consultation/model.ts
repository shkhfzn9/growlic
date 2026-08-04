import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IConsultationLead extends Document {
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  industry: string;
  purpose: string;
  monthlyIncome: string;
  budgetRange: string;
  timeline: string;
  description: string;
  qualificationScore: 'High Intent 🔥' | 'Medium Intent' | 'Exploring';
  status: 'new' | 'contacted' | 'in_discussion' | 'qualified' | 'converted' | 'archived';
  notes?: string;
  restaurantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConsultationLeadSchema: Schema = new Schema<IConsultationLead>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    companyName: { type: String, default: '', trim: true },
    industry: { type: String, required: true, trim: true },
    purpose: { type: String, required: true, trim: true },
    monthlyIncome: { type: String, required: true },
    budgetRange: { type: String, required: true },
    timeline: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    qualificationScore: {
      type: String,
      enum: ['High Intent 🔥', 'Medium Intent', 'Exploring'],
      default: 'Medium Intent',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'in_discussion', 'qualified', 'converted', 'archived'],
      default: 'new',
    },
    notes: { type: String, default: '' },
    restaurantId: { type: String, default: '', index: true },
  },
  { timestamps: true }
);

ConsultationLeadSchema.index({ createdAt: -1 });
ConsultationLeadSchema.index({ status: 1 });
ConsultationLeadSchema.index({ qualificationScore: 1 });

export const ConsultationLead: Model<IConsultationLead> =
  mongoose.models.ConsultationLead ||
  mongoose.model<IConsultationLead>('ConsultationLead', ConsultationLeadSchema);

export default ConsultationLead;
