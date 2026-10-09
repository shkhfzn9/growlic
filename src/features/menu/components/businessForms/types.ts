import { BusinessVocabulary } from '@/config/businessVocabulary';

export interface BusinessFormData {
  preparation: string;
  ingredients: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  spiceLevel: string;
  portionSize: string;
  customPortionSize: string;
  prepTimeMin: string;
  prepTimeMax: string;
  chefNote: string;
}

export interface BusinessFormFieldProps {
  formData: BusinessFormData;
  onChange: (field: keyof BusinessFormData, value: string) => void;
  vocab: BusinessVocabulary;
  disabled?: boolean;
}
