'use client';

import React from 'react';
import { BusinessFormData, BusinessFormFieldProps } from './types';
import { getVocabulary } from '@/config/businessVocabulary';
import RestaurantItemFormFields from './RestaurantItemFormFields';
import SalonItemFormFields from './SalonItemFormFields';
import DetailingItemFormFields from './DetailingItemFormFields';
import RetailItemFormFields from './RetailItemFormFields';

interface BusinessFormFieldsContainerProps {
  businessCategory: string;
  formData: BusinessFormData;
  onChange: (field: keyof BusinessFormData, value: string) => void;
  disabled?: boolean;
}

export default function BusinessFormFieldsContainer({
  businessCategory,
  formData,
  onChange,
  disabled,
}: BusinessFormFieldsContainerProps) {
  const categoryKey = (businessCategory || 'restaurant').toLowerCase().trim();
  const vocab = getVocabulary(categoryKey);

  const props: BusinessFormFieldProps = {
    formData,
    onChange,
    vocab,
    disabled,
  };

  switch (categoryKey) {
    case 'salon':
      return <SalonItemFormFields {...props} />;
    case 'detailing':
      return <DetailingItemFormFields {...props} />;
    case 'retail':
      return <RetailItemFormFields {...props} />;
    case 'restaurant':
    default:
      return <RestaurantItemFormFields {...props} />;
  }
}
