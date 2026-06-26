export interface IMenuItem {
  _id: string;
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
  chefNote: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IPairingRule {
  _id: string;
  restaurantId: string;
  triggerCategory: string;
  suggestCategories: string[];
  active: boolean;
  triggerCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IDiscountTier {
  _id: string;
  restaurantId: string;
  minSpend: number;
  percentOff: number;
  categoryScope: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IComboRule {
  _id: string;
  restaurantId: string;
  conditionCategory: string;
  conditionExcludeCategory: string | null;
  rewardType: 'free_item' | 'percent_off_item' | 'percent_off_order';
  rewardTarget: string;
  customerMessage: string;
  active: boolean;
  triggerCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IBanner {
  _id: string;
  restaurantId: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  image: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}
