'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const UpsellPage = dynamic(() => import('@/features/menu/components/UpsellPage'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-8 w-48 bg-[#E2E6EA] rounded" />
      <div className="h-96 bg-white border border-[#E2E6EA] rounded-xl" />
    </div>
  ),
});

export default function AdminUpsellRoutingPage() {
  return <UpsellPage />;
}
