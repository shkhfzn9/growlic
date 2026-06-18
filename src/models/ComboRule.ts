import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComboRule extends Document {
  restaurantId: string;
  conditionCategory: string;
  conditionExcludeCategory: string | null;
  rewardType: 'free_item' | 'percent_off_item' | 'percent_off_order';
  rewardTarget: string; // Refers to a category name or specific item name/ID
  customerMessage: string;
  active: boolean;
  triggerCount: number;
}

const ComboRuleSchema: Schema = new Schema<IComboRule>(
  {
    restaurantId: { type: String, required: true, index: true },
    conditionCategory: { type: String, required: true },
    conditionExcludeCategory: { type: String, default: null },
    rewardType: {
      type: String,
      enum: ['free_item', 'percent_off_item', 'percent_off_order'],
      required: true,
    },
    rewardTarget: { type: String, required: true },
    customerMessage: { type: String, required: true },
    active: { type: Boolean, default: true },
    triggerCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ComboRule: Model<IComboRule> =
  mongoose.models.ComboRule || mongoose.model<IComboRule>('ComboRule', ComboRuleSchema);

export default ComboRule;
