'use client';

import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export default function EmptyState({
  title = 'No data found',
  description = 'There are no records to display.',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white border border-[#E2E6EA] rounded-xl">
      <div className="w-12 h-12 rounded-full bg-[#F4F6F9] flex items-center justify-center mb-4">
        {icon || <Inbox className="w-6 h-6 text-[#6B7280]" />}
      </div>
      <h3 className="text-[15px] font-semibold text-[#111827] mb-1">{title}</h3>
      <p className="text-[13px] text-[#6B7280] max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
