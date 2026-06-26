'use client';

import React from 'react';

export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto p-4 md:p-8">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 bg-[#E2E6EA] rounded animate-pulse" />
        <div className="h-4 w-72 bg-[#E2E6EA] rounded animate-pulse" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-[#E2E6EA] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-[#E2E6EA] rounded animate-pulse" />
              <div className="w-4 h-4 bg-[#E2E6EA] rounded-full animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-[#E2E6EA] rounded animate-pulse" />
            <div className="h-3 w-36 bg-[#E2E6EA] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Big Card Block Skeleton */}
      <div className="bg-white border border-[#E2E6EA] rounded-xl p-6 h-80 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="h-5 w-40 bg-[#E2E6EA] rounded animate-pulse" />
          <div className="h-4 w-20 bg-[#E2E6EA] rounded animate-pulse" />
        </div>
        <div className="flex-1 bg-[#F4F6F9] rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
