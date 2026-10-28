'use client';

import React, { useState } from 'react';
import {
  Calendar,
  ChevronDown,
  RefreshCw,
  Download,
  SlidersHorizontal,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import {
  PnLTimePeriod,
  QuarterName,
  PnLBreakdownGranularity,
} from '../types';

interface PnLPeriodFilterProps {
  period: PnLTimePeriod;
  quarter?: QuarterName;
  year?: number;
  granularity: PnLBreakdownGranularity;
  singleDate?: string;
  startDate?: string;
  endDate?: string;
  loading?: boolean;
  onPeriodChange: (newPeriod: PnLTimePeriod) => void;
  onQuarterChange: (q: QuarterName, year: number) => void;
  onGranularityChange: (g: PnLBreakdownGranularity) => void;
  onSingleDateChange: (d: string) => void;
  onCustomRangeChange: (start: string, end: string) => void;
  onRefresh: () => void;
  onExportCSV: () => void;
}

export default function PnLPeriodFilter({
  period,
  quarter = 'Q4',
  year = 2026,
  granularity,
  singleDate,
  startDate,
  endDate,
  loading = false,
  onPeriodChange,
  onQuarterChange,
  onGranularityChange,
  onSingleDateChange,
  onCustomRangeChange,
  onRefresh,
  onExportCSV,
}: PnLPeriodFilterProps) {
  // Main tabs
  const mainTabs: { id: PnLTimePeriod; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'quarter', label: 'Quarterly (Q1-Q4)' },
    { id: 'single_date', label: 'Pick Day' },
    { id: 'custom', label: 'Custom Range' },
  ];

  // Temporary custom inputs
  const [tempStart, setTempStart] = useState(startDate || '');
  const [tempEnd, setTempEnd] = useState(endDate || '');

  const applyCustomRange = () => {
    if (tempStart && tempEnd) {
      onCustomRangeChange(tempStart, tempEnd);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-[#E2E6EA] shadow-sm flex flex-col gap-3">
      {/* Top Bar: Tabs + Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 [scrollbar-width:none]">
          {mainTabs.map((tab) => {
            const isActive = period === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onPeriodChange(tab.id)}
                className={`px-3 py-1.5 text-[13px] font-semibold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#C0181A] text-white shadow-sm'
                    : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
                }`}
              >
                {tab.id === 'quarter' && <Sparkles className="w-3.5 h-3.5" />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Refresh & CSV Actions */}
        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh P&L calculation"
            className="p-2 text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onExportCSV}
            title="Export P&L statement to CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#111827] bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#6B7280]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Sub-bar for Quarter Selection & "Per Day" toggle */}
      {period === 'quarter' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F1F3F5] bg-[#F9FAFB] p-3 rounded-lg">
          {/* Quarter buttons */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-[#4B5563]">Select Quarter:</span>
            {(['Q1', 'Q2', 'Q3', 'Q4'] as QuarterName[]).map((q) => {
              const isSelected = quarter === q;
              const quarterLabels: Record<QuarterName, string> = {
                Q1: 'Q1 (Jan-Mar)',
                Q2: 'Q2 (Apr-Jun)',
                Q3: 'Q3 (Jul-Sep)',
                Q4: 'Q4 (Oct-Dec)',
              };
              return (
                <button
                  key={q}
                  onClick={() => onQuarterChange(q, year)}
                  className={`px-2.5 py-1 text-[12px] font-bold rounded-md transition-colors ${
                    isSelected
                      ? 'bg-[#1C2333] text-white'
                      : 'bg-white border border-[#E5E7EB] text-[#4B5563] hover:bg-[#F3F4F6]'
                  }`}
                >
                  {quarterLabels[q]}
                </button>
              );
            })}

            {/* Year Selector */}
            <select
              value={year}
              onChange={(e) => onQuarterChange(quarter, Number(e.target.value))}
              aria-label="Select Year"
              className="text-[12px] font-bold bg-white border border-[#E5E7EB] rounded-md px-2 py-1 text-[#111827] focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          {/* Granularity Toggle: Per-Day vs Per-Month */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-[#4B5563]">View Breakdown:</span>
            <div className="inline-flex rounded-md border border-[#E5E7EB] bg-white p-0.5 shadow-2xs">
              <button
                onClick={() => onGranularityChange('day')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded ${
                  granularity === 'day'
                    ? 'bg-blue-600 text-white'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                📅 Per Day (Daily P&L)
              </button>
              <button
                onClick={() => onGranularityChange('month')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded ${
                  granularity === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                📊 Per Month
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-bar for Single Date Picker */}
      {period === 'single_date' && (
        <div className="flex items-center gap-3 pt-3 border-t border-[#F1F3F5]">
          <span className="text-[12px] font-bold text-[#4B5563] flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-red-600" />
            Select Business Date:
          </span>
          <input
            type="date"
            value={singleDate}
            onChange={(e) => onSingleDateChange(e.target.value)}
            className="text-[13px] border border-[#E5E7EB] rounded-lg px-3 py-1.5 font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>
      )}

      {/* Sub-bar for Custom Range Picker */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#F1F3F5]">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-[#4B5563]">From:</span>
            <input
              type="date"
              value={tempStart}
              onChange={(e) => setTempStart(e.target.value)}
              className="text-[13px] border border-[#E5E7EB] rounded-lg px-3 py-1.5 font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-[#4B5563]">To:</span>
            <input
              type="date"
              value={tempEnd}
              onChange={(e) => setTempEnd(e.target.value)}
              className="text-[13px] border border-[#E5E7EB] rounded-lg px-3 py-1.5 font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <button
            onClick={applyCustomRange}
            className="px-4 py-1.5 bg-[#1C2333] hover:bg-[#2A3347] text-white text-[12px] font-bold rounded-lg transition-colors shadow-2xs"
          >
            Apply Range
          </button>
        </div>
      )}
    </div>
  );
}
