'use client';

import React, { useEffect, useState } from 'react';
import { getCustomers } from '@/actions/customers';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
}

export default function AdminCustomersPage() {
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

  return (
    <div className="font-mono-custom flex flex-col gap-6">
      {/* Title */}
      <div className="border-b border-black pb-4 flex justify-between items-baseline flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">Customers</h1>
          <span className="text-xs uppercase text-zinc-500">View customer ordering history</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="max-w-md w-full">
        <input
          type="text"
          placeholder="Search by phone number..."
          value={searchPhone}
          onChange={handleSearchChange}
          className="w-full text-xs"
        />
      </div>

      {error && (
        <div className="border border-black p-3 text-xs bg-zinc-100 font-bold text-red-600 uppercase">
          ⚠️ {error}
        </div>
      )}

      {loading && customers.length === 0 ? (
        <div className="font-mono-custom text-xs text-center py-12">LOADING CUSTOMERS...</div>
      ) : customers.length === 0 ? (
        <div className="border border-dashed border-black p-12 text-center text-xs uppercase bg-white">
          No customer profiles found.
        </div>
      ) : (
        <div className="border border-black overflow-x-auto bg-white">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-black bg-zinc-50 font-bold text-xs uppercase">
                <th className="p-3 border-r border-black">Customer Name</th>
                <th className="p-3 border-r border-black">Phone</th>
                <th className="p-3 border-r border-black">Total Orders</th>
                <th className="p-3">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black text-xs uppercase">
              {customers.map((cust) => (
                <tr key={cust._id} className="hover:bg-zinc-50">
                  <td className="p-3 border-r border-black font-bold">{cust.name}</td>
                  <td className="p-3 border-r border-black font-mono-custom">{cust.phone}</td>
                  <td className="p-3 border-r border-black">{cust.totalOrders} order(s)</td>
                  <td className="p-3 font-bold">₹{cust.totalSpent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
