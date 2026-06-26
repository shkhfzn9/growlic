'use client';

import React, { useEffect, useState } from 'react';
import { getCustomers } from '../services/customer.service';
import { Search, Users } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/ui';
import { Customer } from '../types/customer.types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCustomers = async (searchVal = '') => {
    try {
      setLoading(true);
      const data = await getCustomers(searchVal);
      setCustomers(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => loadCustomers());
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchPhone(val);
    loadCustomers(val);
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-40 bg-[#E2E6EA] rounded animate-pulse" />
        <div className="h-10 w-64 bg-[#E2E6EA] rounded-lg animate-pulse" />
        <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex gap-4 animate-pulse border-b border-[#E2E6EA] last:border-0">
              <div className="h-4 flex-1 bg-[#E2E6EA] rounded" />
              <div className="h-4 w-24 bg-[#E2E6EA] rounded" />
              <div className="h-4 w-16 bg-[#E2E6EA] rounded" />
              <div className="h-4 w-20 bg-[#E2E6EA] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Customers" subtitle="View customer ordering history" />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
        <input
          type="text"
          placeholder="Search by phone number..."
          value={searchPhone}
          onChange={handleSearchChange}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#E2E6EA] rounded-lg bg-[#F4F6F9] outline-none focus:ring-2 focus:ring-[#C0181A]/20 focus:border-[#C0181A] transition-colors"
        />
      </div>

      {error && (
        <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg p-3 text-sm text-[#DC2626] font-medium">
          {error}
        </div>
      )}

      {customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description={searchPhone ? 'Try a different search term.' : 'Customer profiles appear after orders are placed.'}
          icon={<Users className="w-6 h-6 text-[#6B7280]" />}
        />
      ) : (
        <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#E2E6EA]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Customer</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Phone</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Orders</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6EA]">
                {customers.map((cust) => (
                  <tr key={cust._id} className="hover:bg-[#F4F6F9]/50 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-[#111827]">{cust.name}</td>
                    <td className="px-4 py-3.5 text-[#6B7280] font-mono text-[13px]">{cust.phone}</td>
                    <td className="px-4 py-3.5 text-right text-[#111827]">{cust.totalOrders}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-[#111827]">₹{cust.totalSpent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
