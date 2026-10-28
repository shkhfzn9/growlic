'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Receipt,
  Calendar,
  Layers,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  Package,
} from 'lucide-react';
import { PnLExpensesResponse, PnLExpenseDrilldownItem } from '../types';
import { getPnLExpensesAction } from '@/actions/pnl';

interface ExpenseHistoryDrawerProps {
  isOpen: boolean;
  startDateIso: string;
  endDateIso: string;
  initialType?: 'all' | 'cogs' | 'opex';
  onClose: () => void;
}

export default function ExpenseHistoryDrawer({
  isOpen,
  startDateIso,
  endDateIso,
  initialType = 'all',
  onClose,
}: ExpenseHistoryDrawerProps) {
  const [data, setData] = useState<PnLExpensesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'cogs' | 'opex'>(initialType);
  const [search, setSearch] = useState('');

  const fetchExpenses = useCallback(async () => {
    if (!isOpen || !startDateIso || !endDateIso) return;
    setLoading(true);
    setError('');

    try {
      const res = await getPnLExpensesAction({
        startDateIso,
        endDateIso,
        type: typeFilter,
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load expenses drilldown:', err);
      setError(err?.message || 'Failed to load expense items');
    } finally {
      setLoading(false);
    }
  }, [isOpen, startDateIso, endDateIso, typeFilter]);

  useEffect(() => {
    setTypeFilter(initialType);
  }, [initialType]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Filter local search
  const filteredExpenses = (data?.expenses || []).filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.itemName.toLowerCase().includes(q) ||
      e.categoryName.toLowerCase().includes(q) ||
      (e.vendor && e.vendor.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-[#F8FAFC] w-full max-w-2xl h-full flex flex-col shadow-2xl border-l border-white/20 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#1C2333] text-white flex items-center justify-between shrink-0 border-b border-white/10">
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-400" />
              Expense Ledger & Cost Breakdown
            </h2>
            <p className="text-[12px] text-white/70 mt-0.5">
              Logged purchases, raw materials (COGS), and operational overhead (OPEX)
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close expense drilldown"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Toggles */}
        <div className="p-3 sm:p-4 bg-white border-b border-[#E2E6EA] shrink-0 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            {/* Type selector */}
            <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-0.5 shadow-2xs">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 text-[12px] font-bold rounded-md ${
                  typeFilter === 'all'
                    ? 'bg-[#1C2333] text-white'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                All (₹{data?.totalSpend.toLocaleString('en-IN') ?? 0})
              </button>
              <button
                onClick={() => setTypeFilter('cogs')}
                className={`px-3 py-1 text-[12px] font-bold rounded-md ${
                  typeFilter === 'cogs'
                    ? 'bg-orange-600 text-white'
                    : 'text-orange-700 hover:bg-orange-50'
                }`}
              >
                COGS / Raw Material (₹{data?.cogsSpend.toLocaleString('en-IN') ?? 0})
              </button>
              <button
                onClick={() => setTypeFilter('opex')}
                className={`px-3 py-1 text-[12px] font-bold rounded-md ${
                  typeFilter === 'opex'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-700 hover:bg-purple-50'
                }`}
              >
                OPEX / Overhead (₹{data?.opexSpend.toLocaleString('en-IN') ?? 0})
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search expense item, category, or vendor..."
              value={search}
              onChange={(e) => setSearch}
              onInput={(e: any) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-[12px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Expenses List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 [scrollbar-width:thin]">
          {loading ? (
            <div className="flex flex-col gap-2 py-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-lg border border-[#E2E6EA] p-3 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertCircle className="w-4 h-4" />
                <span>Error loading expenses</span>
              </div>
              <p>{error}</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E2E6EA] p-8 text-center my-auto flex flex-col items-center">
              <Package className="w-10 h-10 text-gray-300 mb-2" />
              <h3 className="font-bold text-[#111827] text-sm">No expenses logged for this range</h3>
              <p className="text-xs text-[#6B7280] mt-1">
                To track exact food cost and operating expenses, add logs in Expense Tracker.
              </p>
            </div>
          ) : (
            filteredExpenses.map((exp) => (
              <div
                key={exp._id}
                className="bg-white rounded-xl border border-[#E2E6EA] p-3.5 shadow-2xs hover:shadow-xs transition-shadow flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[13px] text-[#111827]">{exp.itemName}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        exp.type === 'cogs'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {exp.type.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#6B7280] mt-1">
                    <span>Category: <strong>{exp.categoryName}</strong></span>
                    <span>•</span>
                    <span>{exp.quantity} {exp.unit} @ ₹{exp.pricePerUnit}/{exp.unit}</span>
                    {exp.vendor && (
                      <>
                        <span>•</span>
                        <span>Vendor: {exp.vendor}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[15px] font-black text-[#111827] block">
                    ₹{exp.totalPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">{exp.purchaseDateFormatted}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
