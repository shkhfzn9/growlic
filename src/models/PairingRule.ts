import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPairingRule extends Document {
  restaurantId: string;
  triggerCategory: string;
  suggestCategories: string[];
  active: boolean;
  triggerCount: number;
}

const PairingRuleSchema: Schema = new Schema<IPairingRule>(
  {
    restaurantId: { type: String, required: true, index: true },
    triggerCategory: { type: String, required: true, index: true },
    suggestCategories: { type: [String], required: true },
    active: { type: Boolean, default: true },
    triggerCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const PairingRule: Model<IPairingRule> =
  mongoose.models.PairingRule || mongoose.model<IPairingRule>('PairingRule', PairingRuleSchema);

export default PairingRule;
