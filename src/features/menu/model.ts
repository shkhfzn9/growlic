import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. Menu Item Schema
export interface IMenu extends Document {
  restaurantId: string;
  category: string;
  name: string;
  description: string;
  image: string;
  price: number;
  available: boolean;
  pairsWithCategories: string[];
  active: boolean;
  images: string[];
  preparation: string;
  ingredients: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  spiceLevel: number;
  portionSize: string;
  prepTimeMin: number;
  prepTimeMax: number;
  chefNote?: string;
}

const MenuSchema: Schema = new Schema<IMenu>(
  {
    restaurantId: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    price: { type: Number, required: true },
    available: { type: Boolean, default: true },
    pairsWithCategories: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    images: { type: [String], default: [] },
    preparation: { type: String, default: '' },
    ingredients: { type: [String], default: [] },
    nutrition: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
    },
    spiceLevel: { type: Number, default: 0 },
    portionSize: { type: String, default: '' },
    prepTimeMin: { type: Number, default: 0 },
    prepTimeMax: { type: Number, default: 0 },
    chefNote: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Menu: Model<IMenu> = mongoose.models.Menu || mongoose.model<IMenu>('Menu', MenuSchema);

// 2. Combo Rule Schema
export interface IComboRule extends Document {
  restaurantId: string;
  conditionCategory: string;
  conditionExcludeCategory: string | null;
  rewardType: 'free_item' | 'percent_off_item' | 'percent_off_order';
  rewardTarget: string;
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

export const ComboRule: Model<IComboRule> =
  mongoose.models.ComboRule || mongoose.model<IComboRule>('ComboRule', ComboRuleSchema);

// 3. Discount Tier Schema
export interface IDiscountTier extends Document {
  restaurantId: string;
  minSpend: number;
  percentOff: number;
  categoryScope: string | null;
  active: boolean;
}

const DiscountTierSchema: Schema = new Schema<IDiscountTier>(
  {
    restaurantId: { type: String, required: true, index: true },
    minSpend: { type: Number, required: true },
    percentOff: { type: Number, required: true },
    categoryScope: { type: String, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const DiscountTier: Model<IDiscountTier> =
  mongoose.models.DiscountTier || mongoose.model<IDiscountTier>('DiscountTier', DiscountTierSchema);

// 4. Pairing Rule Schema
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

export const PairingRule: Model<IPairingRule> =
  mongoose.models.PairingRule || mongoose.model<IPairingRule>('PairingRule', PairingRuleSchema);

export default Menu;
