'use client';

import React from 'react';
import { ArrowRight, Layers, Sparkles } from 'lucide-react';
import { PnLSummaryMetrics } from '../types';

interface PnLMarginWaterfallProps {
  metrics: PnLSummaryMetrics;
}

export default function PnLMarginWaterfall({ metrics }: PnLMarginWaterfallProps) {
  const netSales = metrics.netSales || 1; // avoid division by zero
  const cogsPct = Math.min(100, Math.max(0, (metrics.cogsUsed / netSales) * 100));
  const opexPct = Math.min(100 - cogsPct, Math.max(0, (metrics.totalOpex / netSales) * 100));
  const netProfitPct = Math.max(0, 100 - cogsPct - opexPct);
  const isLoss = metrics.netProfit < 0;

  return (
    <div className="bg-white rounded-xl p-5 border border-[#E2E6EA] shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-[14px] font-bold text-[#111827] flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Financial Flow & Profit Margin Waterfall
          </h2>
          <p className="text-[12px] text-[#6B7280]">
            How every ₹100 in revenue translates into net bottom-line earnings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[#6B7280] bg-[#F4F6F9] px-2.5 py-1 rounded-full border border-[#E2E6EA]">
            Avg Order: <strong className="text-[#111827]">₹{metrics.averageOrderValue.toLocaleString('en-IN')}</strong>
          </span>
          <span className="text-[11px] font-semibold text-[#6B7280] bg-[#F4F6F9] px-2.5 py-1 rounded-full border border-[#E2E6EA]">
            Tax (GST) Collected: <strong className="text-[#111827]">₹{metrics.taxCollected.toLocaleString('en-IN')}</strong>
          </span>
        </div>
      </div>

      {/* Visual Multi-Segment Bar */}
      <div className="w-full h-4 bg-[#F1F3F5] rounded-full overflow-hidden flex mb-3">
        {/* COGS Segment */}
        <div
          style={{ width: `${cogsPct}%` }}
          className="bg-orange-500 h-full transition-all duration-300 relative group"
          title={`COGS / Raw Material: ${metrics.cogsRatio}% (₹${metrics.cogsUsed})`}
        />
        {/* OPEX Segment */}
        <div
          style={{ width: `${opexPct}%` }}
          className="bg-purple-500 h-full transition-all duration-300 relative group"
          title={`OPEX / Operating: ${metrics.opexRatio}% (₹${metrics.totalOpex})`}
        />
        {/* Net Profit Segment */}
        <div
          style={{ width: `${netProfitPct}%` }}
          className={`${
            isLoss ? 'bg-rose-500' : 'bg-emerald-500'
          } h-full transition-all duration-300 relative group`}
          title={`Net Profit: ${metrics.netMargin}% (₹${metrics.netProfit})`}
        />
      </div>

      {/* Legend & Waterfall Steps */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-[12px]">
        {/* Step 1: Net Sales */}
        <div className="flex flex-col p-2.5 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
          <div className="flex items-center gap-1.5 text-[#4B5563] text-[11px] font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            1. Net Revenue
          </div>
          <span className="text-[15px] font-black text-[#111827] mt-1">
            ₹{metrics.netSales.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-[#6B7280]">100% Top-line</span>
        </div>

        {/* Step 2: COGS */}
        <div className="flex flex-col p-2.5 bg-[#FFF7ED] rounded-lg border border-[#FED7AA]">
          <div className="flex items-center gap-1.5 text-orange-800 text-[11px] font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            2. Raw Material (COGS)
          </div>
          <span className="text-[15px] font-black text-orange-950 mt-1">
            -₹{metrics.cogsUsed.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-orange-700">
            {metrics.cogsRatio}% cost share {metrics.isCogsEstimated ? '(benchmark)' : '(actual)'}
          </span>
        </div>

        {/* Step 3: OPEX */}
        <div className="flex flex-col p-2.5 bg-[#FAF5FF] rounded-lg border border-[#E9D5FF]">
          <div className="flex items-center gap-1.5 text-purple-800 text-[11px] font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            3. Operations (OPEX)
          </div>
          <span className="text-[15px] font-black text-purple-950 mt-1">
            -₹{metrics.totalOpex.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-purple-700">
            {metrics.opexRatio}% operating cost
          </span>
        </div>

        {/* Step 4: Net Profit */}
        <div
          className={`flex flex-col p-2.5 rounded-lg border ${
            isLoss
              ? 'bg-[#FFF1F2] border-[#FECDD3]'
              : 'bg-[#ECFDF5] border-[#A7F3D0]'
          }`}
        >
          <div
            className={`flex items-center gap-1.5 text-[11px] font-bold ${
              isLoss ? 'text-rose-800' : 'text-emerald-800'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isLoss ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            />
            4. Net Margin
          </div>
          <span
            className={`text-[15px] font-black mt-1 ${
              isLoss ? 'text-rose-950' : 'text-emerald-950'
            }`}
          >
            {isLoss ? '' : '+'}₹{metrics.netProfit.toLocaleString('en-IN')}
          </span>
          <span
            className={`text-[10px] font-extrabold ${
              isLoss ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            {metrics.netMargin}% net earnings
          </span>
        </div>
      </div>
    </div>
  );
}
