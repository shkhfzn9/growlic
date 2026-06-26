'use client';

import React from 'react';

export default function RootLoading() {
  return (
    <div className="flex-grow min-h-screen flex items-center justify-center bg-[#F4F6F9]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#E2E6EA] border-t-[#C0181A] rounded-full animate-spin" />
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
          Loading Growlic...
        </span>
      </div>
    </div>
  );
}
