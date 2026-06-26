export interface MenuItem {
  _id: string;
  category: string;
  name: string;
  description: string;
  image: string;
  price: number;
  available: boolean;
  active?: boolean;
  pairsWithCategories?: string[];
  images?: string[];
  preparation?: string;
  ingredients?: string[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  spiceLevel?: number;
  portionSize?: string;
  prepTimeMin?: number;
  prepTimeMax?: number;
  chefNote?: string;
}

export interface BannerData {
  _id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  image: string;
  active: boolean;
}

export interface PairingRuleData {
  _id: string;
  triggerCategory: string;
  suggestCategories: string[];
  active: boolean;
  triggerCount: number;
}

export interface DiscountTierData {
  _id: string;
  minSpend: number;
  percentOff: number;
  categoryScope: string | null;
  active: boolean;
}

export interface ComboRuleData {
  _id: string;
  conditionCategory: string;
  conditionExcludeCategory: string | null;
  rewardType: 'free_item' | 'percent_off_item' | 'percent_off_order';
  rewardTarget: string;
  customerMessage: string;
  active: boolean;
  triggerCount: number;
}
