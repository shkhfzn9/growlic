'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
}

export default function StatCard({ label, value, subtitle, icon, loading = false }: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-white border border-[#E2E6EA] rounded-xl p-5 flex flex-col gap-3 animate-pulse">
        <div className="h-3 w-24 bg-[#E2E6EA] rounded" />
        <div className="h-8 w-32 bg-[#E2E6EA] rounded" />
        <div className="h-3 w-20 bg-[#E2E6EA] rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E2E6EA] rounded-xl p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
          {label}
        </span>
        {icon && <span className="text-[#6B7280]">{icon}</span>}
      </div>
      <span className="text-[28px] font-bold text-[#111827] leading-tight mt-1">
        {value}
      </span>
      {subtitle && (
        <span className="text-[13px] text-[#6B7280] mt-1">{subtitle}</span>
      )}
    </div>
  );
}
