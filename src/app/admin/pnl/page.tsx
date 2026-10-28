'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const PnLPage = dynamic(
  () => import('@/features/pnl/components/PnLPage'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-5 w-full animate-pulse">
        <div className="h-8 w-64 bg-[#E2E6EA] rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-white border border-[#E2E6EA] rounded-xl" />
          ))}
        </div>
        <div className="h-44 bg-white border border-[#E2E6EA] rounded-xl" />
        <div className="h-96 bg-white border border-[#E2E6EA] rounded-xl" />
      </div>
    ),
  }
);

export default function AdminPnLPage() {
  return <PnLPage />;
}
