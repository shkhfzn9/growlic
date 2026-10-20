'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { getCachedPosMenu } from '@/features/order/services/orderClientCache';

const CounterOrderForm = dynamic(
  () => import('@/features/order/components/CounterOrderForm'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-4 animate-pulse p-6">
        <div className="h-8 w-48 bg-[#E2E6EA] rounded" />
        <div className="h-[600px] bg-white border border-[#E2E6EA] rounded-xl" />
      </div>
    ),
  }
);

const SalonCounterOrderForm = dynamic(
  () => import('@/features/salonBooking/components/SalonCounterOrderForm'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-4 animate-pulse p-6">
        <div className="h-8 w-48 bg-purple-100 rounded-xl" />
        <div className="h-[600px] bg-white border border-gray-200 rounded-2xl" />
      </div>
    ),
  }
);

export default function NewCounterOrderPage() {
  const auth = useSelector((state: RootState) => state.auth);
  const cachedPos = getCachedPosMenu();

  const isSalon =
    (auth as any)?.businessCategory === 'salon' ||
    cachedPos?.details?.businessCategory === 'salon' ||
    cachedPos?.details?.themePreset === 'rose_quartz' ||
    cachedPos?.details?.themePreset === 'velvet_noir';

  if (isSalon) {
    return <SalonCounterOrderForm />;
  }

  return <CounterOrderForm />;
}
