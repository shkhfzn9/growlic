'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Percent,
  Receipt,
  AlertCircle,
  HelpCircle,
  Info,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Edit2,
  X,
} from 'lucide-react';
import { PnLSummaryMetrics } from '../types';

interface PnLSummaryCardsProps {
  metrics: PnLSummaryMetrics;
  customCogsPercent?: number | null;
  onOpenExpenses?: (type?: 'all' | 'cogs' | 'opex') => void;
  onInspectAllOrders?: () => void;
  onSetCustomCogsPercent?: (pct: number | null) => void;
}

export default function PnLSummaryCards({
  metrics,
  customCogsPercent,
  onOpenExpenses,
  onInspectAllOrders,
  onSetCustomCogsPercent,
}: PnLSummaryCardsProps) {
  const isNetProfitable = metrics.netProfit >= 0;

  // Custom COGS modal/popover state
  const [showCogsModal, setShowCogsModal] = useState(false);
  const [inputPct, setInputPct] = useState<string>(
    customCogsPercent != null ? String(customCogsPercent) : String(metrics.cogsRatio || 32)
  );

  const presets = [25, 28, 30, 32, 35, 40];

  const handleApplyCustom = () => {
    const val = parseFloat(inputPct);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      if (onSetCustomCogsPercent) {
        onSetCustomCogsPercent(val);
      }
      setShowCogsModal(false);
    }
  };

  const handleResetToTracked = () => {
    if (onSetCustomCogsPercent) {
      onSetCustomCogsPercent(null);
    }
    setShowCogsModal(false);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
      {/* 1. Net Sales / Revenue */}
      <div className="bg-white rounded-xl p-5 border border-[#E2E6EA] shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">
            Net Sales (Revenue)
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#111827]">
            ₹{metrics.netSales.toLocaleString('en-IN')}
          </span>
          {metrics.totalDiscounts > 0 && (
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              -₹{metrics.totalDiscounts.toLocaleString('en-IN')} disc
            </span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-[#F1F3F5] flex items-center justify-between text-[11px] text-[#6B7280]">
          <span>Gross: ₹{metrics.grossSales.toLocaleString('en-IN')}</span>
          <button
            onClick={onInspectAllOrders}
            className="text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ShoppingCart className="w-3 h-3" />
            {metrics.totalOrders} {metrics.totalOrders === 1 ? 'Order' : 'Orders'}
          </button>
        </div>
      </div>

      {/* 2. Cost of Goods Sold (COGS) */}
      <div className="bg-white rounded-xl p-5 border border-[#E2E6EA] shadow-sm hover:shadow-md transition-shadow relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">
              Cost of Goods (COGS)
            </span>
            {metrics.cogsMode === 'custom' ? (
              <button
                onClick={() => setShowCogsModal(true)}
                title="Click to edit custom COGS percentage"
                className="text-[10px] font-extrabold bg-blue-100 text-blue-800 hover:bg-blue-200 px-1.5 py-0.2 rounded flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Custom ({metrics.cogsRatio}%)</span>
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            ) : metrics.cogsMode === 'benchmark' ? (
              <span
                title="Estimated via 32% food cost benchmark since no direct kitchen expenses were logged"
                className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded"
              >
                Est. 32%
              </span>
            ) : (
              <span
                title="Using actual logged purchases from ExpenseLog"
                className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded"
              >
                Tracked Actuals
              </span>
            )}
          </div>

          <button
            onClick={() => setShowCogsModal(true)}
            title="Set custom COGS percentage"
            className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 flex items-center justify-center font-bold transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#111827]">
            ₹{metrics.cogsUsed.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] font-bold text-[#6B7280]">
            ({metrics.cogsRatio}%)
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-[#F1F3F5] flex items-center justify-between text-[11px]">
          <span className="text-[#6B7280]">
            Gross Margin: <strong className="text-emerald-600 font-bold">{metrics.grossMargin}%</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCogsModal(true)}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Custom %
            </button>
            {onOpenExpenses && (
              <>
                <span className="text-gray-300">•</span>
                <button
                  onClick={() => onOpenExpenses('cogs')}
                  className="text-orange-600 font-semibold hover:underline cursor-pointer"
                >
                  Items →
                </button>
              </>
            )}
          </div>
        </div>

        {/* Custom COGS Inline Modal Popover */}
        {showCogsModal && (
          <div className="absolute top-full left-0 right-0 sm:left-auto sm:right-0 sm:w-80 mt-2 bg-white rounded-xl shadow-2xl border border-[#D1D5DB] p-4 z-40 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F3F5] mb-3">
              <h4 className="text-[13px] font-bold text-[#111827] flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                Custom COGS % (Food Cost)
              </h4>
              <button
                onClick={() => setShowCogsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-[#6B7280] mb-3">
              Set a manual Cost of Goods (COGS) ratio to calculate food and beverage margins directly from Net Sales.
            </p>

            {/* Presets */}
            <div className="mb-3">
              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase block mb-1.5">
                Quick Presets
              </span>
              <div className="grid grid-cols-6 gap-1">
                {presets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setInputPct(String(p))}
                    className={`text-[11px] font-bold py-1 rounded border transition-colors ${
                      inputPct === String(p)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            {/* Manual input */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={inputPct}
                  onChange={(e) => setInputPct(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full text-[14px] font-bold pr-7 pl-3 py-1.5 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[12px]">
                  %
                </span>
              </div>
              <button
                onClick={handleApplyCustom}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            </div>

            {/* Reset to Actuals */}
            <div className="pt-2 border-t border-[#F1F3F5] flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280]">
                Logged in Tracker: ₹{metrics.cogsTracked.toLocaleString('en-IN')}
              </span>
              <button
                onClick={handleResetToTracked}
                className="text-[11px] font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1 hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Actuals</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Operating Expenses (OPEX) */}
      <div className="bg-white rounded-xl p-5 border border-[#E2E6EA] shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">
            Operating Costs (OPEX)
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Percent className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#111827]">
            ₹{metrics.totalOpex.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] font-bold text-[#6B7280]">
            ({metrics.opexRatio}%)
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-[#F1F3F5] flex items-center justify-between text-[11px] text-[#6B7280]">
          <span>{metrics.categoryExpenses.filter((c) => c.type === 'opex').length} Categories logged</span>
          {onOpenExpenses && (
            <button
              onClick={() => onOpenExpenses('opex')}
              className="text-purple-600 font-semibold hover:underline"
            >
              Breakdown →
            </button>
          )}
        </div>
      </div>

      {/* 4. Net Profit / Net Loss (Bottom Line) */}
      <div
        className={`rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow ${
          isNetProfitable
            ? 'bg-gradient-to-br from-emerald-50/50 to-white border-emerald-200'
            : 'bg-gradient-to-br from-rose-50/50 to-white border-rose-200'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">
            Net Profit (Bottom Line)
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              isNetProfitable
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            {isNetProfitable ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className={`text-2xl font-black ${
              isNetProfitable ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {isNetProfitable ? '+' : ''}₹{metrics.netProfit.toLocaleString('en-IN')}
          </span>
          <span
            className={`text-[12px] font-extrabold px-1.5 py-0.5 rounded ${
              isNetProfitable
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {metrics.netMargin}%
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-[11px]">
          <span className="text-[#6B7280]">
            Avg / day: ₹{metrics.dailyAverageProfit.toLocaleString('en-IN')}
          </span>
          <span
            className={`font-bold ${
              isNetProfitable ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {isNetProfitable ? 'Profitable' : 'Loss'}
          </span>
        </div>
      </div>
    </div>
  );
}
