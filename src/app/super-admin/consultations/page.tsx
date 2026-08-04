'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ConsultationLeadsPage = dynamic(
  () => import('@/features/consultation/components/ConsultationLeadsPage'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-4 animate-pulse p-6">
        <div className="h-8 w-64 bg-[#E2E6EA] rounded-lg" />
        <div className="h-48 bg-white border border-[#E2E6EA] rounded-2xl" />
      </div>
    ),
  }
);

export default function SuperAdminConsultationsRoutingPage() {
  return <ConsultationLeadsPage />;
}
