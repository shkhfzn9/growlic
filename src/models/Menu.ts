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
  },
  { timestamps: true }
);

// Prevent compiling model query multiple times
const Menu: Model<IMenu> = mongoose.models.Menu || mongoose.model<IMenu>('Menu', MenuSchema);

export default Menu;
