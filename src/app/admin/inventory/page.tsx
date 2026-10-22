'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const InventoryPage = dynamic(
  () => import('@/features/inventory/components/InventoryPage'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-6 w-full animate-pulse">
        <div className="h-8 w-64 bg-[#E2E6EA] rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-white border border-[#E2E6EA] rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-white border border-[#E2E6EA] rounded-2xl" />
      </div>
    ),
  }
);

export default function AdminInventoryPage() {
  return <InventoryPage />;
}
