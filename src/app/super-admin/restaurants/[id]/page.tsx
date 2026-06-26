'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Hourglass } from 'lucide-react';
import { PageHeader } from '@/components/admin/ui';

export default function RestaurantDetailPlaceholder() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Back button */}
      <div>
        <Link
          href="/super-admin/restaurants"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Restaurants List
        </Link>
      </div>

      <PageHeader
        title={`Restaurant Details: ${id}`}
        subtitle="Operational metrics and detailed configurations"
      />

      {/* Placeholder Card */}
      <div className="bg-white border border-[#E2E6EA] rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-sm max-w-lg mx-auto mt-8">
        <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] mb-4">
          <Hourglass className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-[18px] font-bold text-[#111827] mb-2">Coming in Phase 2</h2>
        <p className="text-[14px] text-[#6B7280] max-w-sm mb-6">
          The restaurant detail view, configuration comparisons, and management control actions will be fully integrated in the Phase 2 build.
        </p>
        <Link
          href="/super-admin/restaurants"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#C0181A] rounded-lg hover:bg-[#A01416] transition-colors shadow-sm"
        >
          Return to List
        </Link>
      </div>
    </div>
  );
}
