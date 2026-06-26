'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const PromosManager = dynamic(() => import('@/features/menu/components/PromosManager'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-8 w-48 bg-[#E2E6EA] rounded" />
      <div className="h-40 bg-white border border-[#E2E6EA] rounded-xl" />
    </div>
  ),
});

export default function AdminPromosRoutingPage() {
  return <PromosManager />;
}
