'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { AdminButton } from '@/components/ui';

export default function SuperAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Super Admin Panel Error Caught:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white border border-[#E2E6EA] rounded-xl shadow-sm text-center my-6 max-w-lg mx-auto">
      <div className="bg-[#FEF2F2] rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 border border-[#FEF2F2]">
        <AlertTriangle className="w-5 h-5 text-[#C0181A]" />
      </div>
      <h2 className="text-[16px] font-bold text-[#111827] uppercase tracking-tight mb-2">
        Super Admin Section Error
      </h2>
      <p className="text-xs text-[#6B7280] mb-5">
        Something went wrong inside the platform overview dashboard.
      </p>
      {error.message && (
        <div className="w-full bg-[#F4F6F9] rounded-lg p-3 text-left font-mono text-[11px] text-[#374151] mb-5 max-h-24 overflow-y-auto border border-[#E2E6EA]">
          {error.message}
        </div>
      )}
      <div className="flex gap-2">
        <AdminButton
          onClick={() => reset()}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try Loading Overview Again
        </AdminButton>
      </div>
    </div>
  );
}
