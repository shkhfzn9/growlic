'use client';

import React from 'react';
import dynamic from 'next/dynamic';

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

export default function NewSalonBookingPage() {
  return <SalonCounterOrderForm />;
}
