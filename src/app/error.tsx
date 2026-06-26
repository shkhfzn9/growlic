'use client';

import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root App Router Error Caught:', error);
  }, [error]);

  return (
    <div className="flex-grow min-h-screen flex items-center justify-center p-6 bg-[#F4F6F9] font-sans">
      <div className="bg-white border border-[#E2E6EA] p-8 max-w-md w-full text-center rounded-xl shadow-sm">
        <div className="bg-[#FEF2F2] rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4 border border-[#FEF2F2]">
          <AlertTriangle className="w-6 h-6 text-[#C0181A]" />
        </div>
        <h1 className="text-lg font-bold text-[#111827] uppercase tracking-tight mb-2">
          Application Error
        </h1>
        <p className="text-xs text-[#6B7280] mb-6">
          A critical error occurred while loading this page. Our team has been notified.
        </p>
        {error.message && (
          <div className="bg-[#F4F6F9] rounded-lg p-3 text-left font-mono text-[11px] text-[#374151] mb-6 max-h-24 overflow-y-auto border border-[#E2E6EA]">
            {error.message}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] bg-[#C0181A] hover:bg-[#A01416] text-white rounded-lg transition-all"
          >
            Reset and Retry
          </button>
          <a
            href="/"
            className="w-full inline-flex items-center justify-center px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] border border-[#E2E6EA] bg-white text-[#374151] hover:bg-[#F4F6F9] rounded-lg transition-all"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    </div>
  );
}
