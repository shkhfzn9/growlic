'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react';
import { PnLTimeBucket, PnLBreakdownGranularity } from '../types';

interface PnLBreakdownTableProps {
  buckets: PnLTimeBucket[];
  granularity: PnLBreakdownGranularity;
  onSelectBucketForOrders: (bucket: PnLTimeBucket) => void;
}

export default function PnLBreakdownTable({
  buckets,
  granularity,
  onSelectBucketForOrders,
}: PnLBreakdownTableProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'profitable' | 'loss' | 'with_orders'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered buckets
  const filteredBuckets = useMemo(() => {
    return buckets.filter((b) => {
      // Profitability filter
      if (filterMode === 'profitable' && b.netProfit < 0) return false;
      if (filterMode === 'loss' && b.netProfit >= 0) return false;
      if (filterMode === 'with_orders' && b.orderCount === 0) return false;

      // Search filter
      if (searchTerm.trim().length > 0) {
        const query = searchTerm.toLowerCase();
        return (
          b.displayLabel.toLowerCase().includes(query) ||
          b.periodKey.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [buckets, filterMode, searchTerm]);

  // Overall totals of displayed buckets
  const totals = useMemo(() => {
    let orderCount = 0;
    let grossSales = 0;
    let discounts = 0;
    let netSales = 0;
    let cogs = 0;
    let grossProfit = 0;
    let opex = 0;
    let netProfit = 0;

    for (const b of filteredBuckets) {
      orderCount += b.orderCount;
      grossSales += b.grossSales;
      discounts += b.discounts;
      netSales += b.netSales;
      cogs += b.cogs;
      grossProfit += b.grossProfit;
      opex += b.opex;
      netProfit += b.netProfit;
    }

    const netMargin = netSales > 0 ? Math.round((netProfit / netSales) * 10000) / 100 : 0;

    return {
      orderCount,
      grossSales: Math.round(grossSales * 100) / 100,
      discounts: Math.round(discounts * 100) / 100,
      netSales: Math.round(netSales * 100) / 100,
      cogs: Math.round(cogs * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      opex: Math.round(opex * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      netMargin,
    };
  }, [filteredBuckets]);

  return (
    <div className="bg-white rounded-xl border border-[#E2E6EA] shadow-sm overflow-hidden flex flex-col">
      {/* Header & Local Filters */}
      <div className="p-4 border-b border-[#E2E6EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F9FAFB]">
        <div>
          <h2 className="text-[14px] font-bold text-[#111827] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-red-600" />
            {granularity === 'day' ? 'Day-by-Day Statement & Order Ledger' : 'Period Breakdown'}
          </h2>
          <p className="text-[12px] text-[#6B7280]">
            Click any row or order count to drill down into exact customer receipts and item breakdown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Date */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-[12px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-red-500 w-36 sm:w-44"
            />
          </div>

          {/* Quick Filter buttons */}
          <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-white p-0.5 shadow-2xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2 py-1 text-[11px] font-bold rounded ${
                filterMode === 'all'
                  ? 'bg-[#1C2333] text-white'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              All ({buckets.length})
            </button>
            <button
              onClick={() => setFilterMode('with_orders')}
              className={`px-2 py-1 text-[11px] font-bold rounded ${
                filterMode === 'with_orders'
                  ? 'bg-[#1C2333] text-white'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Active Days
            </button>
            <button
              onClick={() => setFilterMode('profitable')}
              className={`px-2 py-1 text-[11px] font-bold rounded ${
                filterMode === 'profitable'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Profitable
            </button>
            <button
              onClick={() => setFilterMode('loss')}
              className={`px-2 py-1 text-[11px] font-bold rounded ${
                filterMode === 'loss'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              Loss
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#E2E6EA] bg-[#F4F6F9] text-[11px] uppercase font-bold text-[#6B7280] tracking-wider select-none">
              <th className="py-3 px-4">Period / Date</th>
              <th className="py-3 px-3 text-center">Orders</th>
              <th className="py-3 px-3 text-right">Gross Sales</th>
              <th className="py-3 px-3 text-right">Discounts</th>
              <th className="py-3 px-3 text-right">Net Sales</th>
              <th className="py-3 px-3 text-right">COGS (Direct)</th>
              <th className="py-3 px-3 text-right">Gross Profit</th>
              <th className="py-3 px-3 text-right">OPEX</th>
              <th className="py-3 px-3 text-right">Net Profit / Loss</th>
              <th className="py-3 px-3 text-right">Margin %</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F3F5]">
            {filteredBuckets.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-[#6B7280]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="font-semibold text-[14px]">No records found for this filter</p>
                    <button
                      onClick={() => {
                        setFilterMode('all');
                        setSearchTerm('');
                      }}
                      className="text-blue-600 hover:underline text-xs font-bold"
                    >
                      Clear table filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredBuckets.map((bucket) => {
                const isProfitable = bucket.netProfit >= 0;
                const hasOrders = bucket.orderCount > 0;

                return (
                  <tr
                    key={bucket.periodKey}
                    onClick={() => onSelectBucketForOrders(bucket)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                  >
                    {/* Period / Date */}
                    <td className="py-3 px-4 font-bold text-[#111827] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="group-hover:text-blue-600 transition-colors">
                          {bucket.displayLabel}
                        </span>
                      </div>
                    </td>

                    {/* Orders Pill */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {hasOrders ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <ShoppingCart className="w-3 h-3" />
                          {bucket.orderCount}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#9CA3AF]">-</span>
                      )}
                    </td>

                    {/* Gross Sales */}
                    <td className="py-3 px-3 text-right font-medium text-[#4B5563] whitespace-nowrap">
                      ₹{bucket.grossSales.toLocaleString('en-IN')}
                    </td>

                    {/* Discounts */}
                    <td className="py-3 px-3 text-right font-medium text-amber-700 whitespace-nowrap">
                      {bucket.discounts > 0 ? `-₹${bucket.discounts.toLocaleString('en-IN')}` : '-'}
                    </td>

                    {/* Net Sales */}
                    <td className="py-3 px-3 text-right font-bold text-[#111827] whitespace-nowrap">
                      ₹{bucket.netSales.toLocaleString('en-IN')}
                    </td>

                    {/* COGS */}
                    <td className="py-3 px-3 text-right font-medium text-orange-700 whitespace-nowrap">
                      {bucket.cogs > 0 ? `₹${bucket.cogs.toLocaleString('en-IN')}` : '₹0'}
                    </td>

                    {/* Gross Profit */}
                    <td className="py-3 px-3 text-right font-medium text-[#111827] whitespace-nowrap">
                      ₹{bucket.grossProfit.toLocaleString('en-IN')}
                    </td>

                    {/* OPEX */}
                    <td className="py-3 px-3 text-right font-medium text-purple-700 whitespace-nowrap">
                      {bucket.opex > 0 ? `₹${bucket.opex.toLocaleString('en-IN')}` : '₹0'}
                    </td>

                    {/* Net Profit */}
                    <td className="py-3 px-3 text-right font-black whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded ${
                          isProfitable
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {isProfitable ? '+' : ''}₹{bucket.netProfit.toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* Margin % */}
                    <td className="py-3 px-3 text-right font-bold whitespace-nowrap">
                      <span className={isProfitable ? 'text-emerald-700' : 'text-rose-700'}>
                        {bucket.netMargin}%
                      </span>
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBucketForOrders(bucket);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded hover:bg-blue-100/50"
                      >
                        <span>Orders</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Footer Totals Row */}
          {filteredBuckets.length > 0 && (
            <tfoot>
              <tr className="bg-[#1C2333] text-white font-black text-[13px] border-t-2 border-white/20">
                <td className="py-3.5 px-4 uppercase text-[11px] tracking-wider">
                  Total Summary ({filteredBuckets.length} {granularity === 'day' ? 'Days' : 'Periods'})
                </td>
                <td className="py-3.5 px-3 text-center">
                  <span className="inline-block px-2 py-0.5 bg-white/20 rounded text-[11px]">
                    {totals.orderCount} Orders
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-bold text-white/90">
                  ₹{totals.grossSales.toLocaleString('en-IN')}
                </td>
                <td className="py-3.5 px-3 text-right font-bold text-amber-300">
                  {totals.discounts > 0 ? `-₹${totals.discounts.toLocaleString('en-IN')}` : '-'}
                </td>
                <td className="py-3.5 px-3 text-right font-extrabold text-white">
                  ₹{totals.netSales.toLocaleString('en-IN')}
                </td>
                <td className="py-3.5 px-3 text-right font-bold text-orange-300">
                  ₹{totals.cogs.toLocaleString('en-IN')}
                </td>
                <td className="py-3.5 px-3 text-right font-bold text-white">
                  ₹{totals.grossProfit.toLocaleString('en-IN')}
                </td>
                <td className="py-3.5 px-3 text-right font-bold text-purple-300">
                  ₹{totals.opex.toLocaleString('en-IN')}
                </td>
                <td className="py-3.5 px-3 text-right font-black">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[13px] ${
                      totals.netProfit >= 0
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                        : 'bg-rose-500/30 text-rose-300 border border-rose-400/40'
                    }`}
                  >
                    {totals.netProfit >= 0 ? '+' : ''}₹{totals.netProfit.toLocaleString('en-IN')}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-extrabold text-white">
                  {totals.netMargin}%
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-[10px] text-white/60">Tally</span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
