'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const SettingsPage = dynamic(() => import('@/features/auth/components/SettingsPage'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-8 w-32 bg-[#E2E6EA] rounded" />
      <div className="h-96 bg-white border border-[#E2E6EA] rounded-xl" />
    </div>
  ),
});

export default function AdminSettingsPage() {
  return <SettingsPage />;
}
