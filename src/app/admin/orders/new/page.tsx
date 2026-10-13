'use client';

import React from 'react';
import dynamic from 'next/dynamic';

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

export default function NewCounterOrderPage() {
  return <CounterOrderForm />;
}
