import mongoose, { Schema, Document, Model } from 'mongoose';

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

// Prevent compiling model query multiple times
const Menu: Model<IMenu> = mongoose.models.Menu || mongoose.model<IMenu>('Menu', MenuSchema);

export default Menu;
