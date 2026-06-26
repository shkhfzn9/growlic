'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const DashboardPage = dynamic(() => import('@/features/analytics/components/DashboardPage'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-6 w-full animate-pulse">
      <div className="h-8 w-48 bg-[#E2E6EA] rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-white border border-[#E2E6EA] rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-white border border-[#E2E6EA] rounded-xl" />
    </div>
  ),
});

export default function AdminDashboardPage() {
  return <DashboardPage />;
}
