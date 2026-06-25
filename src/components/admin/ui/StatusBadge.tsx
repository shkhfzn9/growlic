'use client';

import React from 'react';

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  dot?: boolean;
}

const variantStyles: Record<StatusVariant, string> = {
  success: 'bg-[#F0FDF4] text-[#16A34A] border-[#16A34A]/20',
  warning: 'bg-[#FFFBEB] text-[#D97706] border-[#D97706]/20',
  error: 'bg-[#FEF2F2] text-[#DC2626] border-[#DC2626]/20',
  info: 'bg-[#EFF6FF] text-[#2563EB] border-[#2563EB]/20',
  neutral: 'bg-[#F4F6F9] text-[#6B7280] border-[#E2E6EA]',
};

const dotColors: Record<StatusVariant, string> = {
  success: 'bg-[#16A34A]',
  warning: 'bg-[#D97706]',
  error: 'bg-[#DC2626]',
  info: 'bg-[#2563EB]',
  neutral: 'bg-[#6B7280]',
};

export default function StatusBadge({ label, variant = 'neutral', dot = true }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${variantStyles[variant]}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {label}
    </span>
  );
}
