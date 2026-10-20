'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import CustomerDetailDrawer from '@/features/customer/components/CustomerDetailDrawer';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CustomerProfileDirectPage() {
  const params = useParams();
  const phone = (params?.phone as string) || '';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>
      </div>

      <div className="bg-white border border-[#E2E6EA] rounded-3xl overflow-hidden shadow-xs">
        <CustomerDetailDrawer phone={phone} isStandalonePage={true} />
      </div>
    </div>
  );
}
