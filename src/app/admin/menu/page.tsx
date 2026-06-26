'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const MenuPage = dynamic(() => import('@/features/menu/components/MenuPage'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-40 bg-[#E2E6EA] rounded animate-pulse" />
      <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4 animate-pulse border-b border-[#E2E6EA] last:border-0">
            <div className="w-12 h-12 bg-[#E2E6EA] rounded-lg" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-4 w-32 bg-[#E2E6EA] rounded" />
              <div className="h-3 w-48 bg-[#E2E6EA] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
});

export default function AdminMenuRoutingPage() {
  return <MenuPage />;
}
