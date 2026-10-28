'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  Receipt,
  ShoppingCart,
  Boxes,
} from 'lucide-react';
import { PageHeader } from '@/components/ui';
import {
  PnLTimePeriod,
  QuarterName,
  PnLBreakdownGranularity,
  PnLStatementResponse,
  PnLTimeBucket,
} from '../types';
import { getPnLStatementAction } from '@/actions/pnl';
import { getRestaurantDetails } from '@/actions/auth';
import PnLSummaryCards from './PnLSummaryCards';
import PnLMarginWaterfall from './PnLMarginWaterfall';
import PnLPeriodFilter from './PnLPeriodFilter';
import PnLBreakdownTable from './PnLBreakdownTable';
import OrderHistoryDrawer from './OrderHistoryDrawer';
import ExpenseHistoryDrawer from './ExpenseHistoryDrawer';

export default function PnLPage() {
  const [period, setPeriod] = useState<PnLTimePeriod>('this_month');
  const [quarter, setQuarter] = useState<QuarterName>('Q4');
  const [year, setYear] = useState<number>(2026);
  const [granularity, setGranularity] = useState<PnLBreakdownGranularity>('day');

  // Single date in IST
  const [singleDate, setSingleDate] = useState<string>(() => {
    const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
    return ist.toISOString().split('T')[0];
  });

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Custom COGS percentage state (persisted in localStorage)
  const [customCogsPercent, setCustomCogsPercent] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('growlic_pnl_custom_cogs');
      if (saved && !isNaN(Number(saved))) return Number(saved);
    }
    return null;
  });

  const [data, setData] = useState<PnLStatementResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [restaurantName, setRestaurantName] = useState<string>('');

  // Order Drilldown Modal State
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [orderDrawerStart, setOrderDrawerStart] = useState('');
  const [orderDrawerEnd, setOrderDrawerEnd] = useState('');
  const [orderDrawerLabel, setOrderDrawerLabel] = useState('');

  // Expense Drilldown Modal State
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const [expenseDrawerType, setExpenseDrawerType] = useState<'all' | 'cogs' | 'opex'>('all');

  const handleSetCustomCogsPercent = (pct: number | null) => {
    setCustomCogsPercent(pct);
    if (typeof window !== 'undefined') {
      if (pct != null) {
        localStorage.setItem('growlic_pnl_custom_cogs', String(pct));
      } else {
        localStorage.removeItem('growlic_pnl_custom_cogs');
      }
    }
  };

  // Load restaurant metadata
  useEffect(() => {
    getRestaurantDetails()
      .then((det) => {
        if (det?.restaurantName) setRestaurantName(det.restaurantName);
      })
      .catch(() => {});
  }, []);

  // Fetch statement data
  const loadStatement = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await getPnLStatementAction({
        period,
        granularity,
        quarter: period === 'quarter' ? quarter : undefined,
        year: period === 'quarter' ? year : undefined,
        singleDate: period === 'single_date' ? singleDate : undefined,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        customCogsPercent,
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load P&L statement:', err);
      setError(err?.message || 'Failed to load Profit & Loss statement');
    } finally {
      setLoading(false);
    }
  }, [period, granularity, quarter, year, singleDate, startDate, endDate, customCogsPercent]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  // Handle drilldown trigger from a specific bucket row
  const handleOpenBucketOrders = (bucket: PnLTimeBucket) => {
    setOrderDrawerStart(bucket.dateStart);
    setOrderDrawerEnd(bucket.dateEnd);
    setOrderDrawerLabel(bucket.displayLabel);
    setOrderDrawerOpen(true);
  };

  // Handle drilldown trigger for all orders in the current full period
  const handleInspectAllOrders = () => {
    if (!data) return;
    setOrderDrawerStart(data.dateRange.start);
    setOrderDrawerEnd(data.dateRange.end);
    setOrderDrawerLabel(`All Orders (${data.dateRange.label})`);
    setOrderDrawerOpen(true);
  };

  // Handle expense drilldown trigger
  const handleOpenExpenses = (type: 'all' | 'cogs' | 'opex' = 'all') => {
    setExpenseDrawerType(type);
    setExpenseDrawerOpen(true);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!data) return;

    const rows: string[] = [];

    // Title & Metadata
    rows.push(`"Profit & Loss (P&L) Statement - Growlic"`);
    rows.push(`"Business Name","${restaurantName || 'Growlic Merchant'}"`);
    rows.push(`"Period","${data.dateRange.label}"`);
    rows.push(`"Generated At","${new Date().toLocaleString('en-IN')}"`);
    rows.push(``);

    // Summary Section
    rows.push(`"Financial KPI Summary"`);
    rows.push(`"Metric","Amount (INR)","Percentage"`);
    rows.push(`"Gross Sales","${data.metrics.grossSales}",""`);
    rows.push(`"Discounts Given","-${data.metrics.totalDiscounts}",""`);
    rows.push(`"Net Sales (Revenue)","${data.metrics.netSales}","100.0%"`);
    rows.push(`"Tax (GST) Collected","${data.metrics.taxCollected}",""`);
    rows.push(`"Cost of Goods Sold (COGS)","-${data.metrics.cogsUsed}","${data.metrics.cogsRatio}%"`);
    rows.push(`"Gross Profit","${data.metrics.grossProfit}","${data.metrics.grossMargin}%"`);
    rows.push(`"Operating Costs (OPEX)","-${data.metrics.totalOpex}","${data.metrics.opexRatio}%"`);
    rows.push(`"Net Profit / Loss","${data.metrics.netProfit}","${data.metrics.netMargin}%"`);
    rows.push(`"Total Orders Placed","${data.metrics.totalOrders}",""`);
    rows.push(`"Average Order Value (AOV)","${data.metrics.averageOrderValue}",""`);
    rows.push(``);

    // Breakdown Section
    rows.push(`"Period Breakdown Table"`);
    rows.push(
      `"Period / Date","Orders","Gross Sales (INR)","Discounts (INR)","Net Sales (INR)","COGS (INR)","Gross Profit (INR)","OPEX (INR)","Net Profit / Loss (INR)","Net Margin (%)"`
    );

    for (const b of data.breakdown) {
      rows.push(
        `"${b.displayLabel}","${b.orderCount}","${b.grossSales}","${b.discounts}","${b.netSales}","${b.cogs}","${b.grossProfit}","${b.opex}","${b.netProfit}","${b.netMargin}%"`
      );
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    const filename = `PnL_Statement_${data.dateRange.period}_${Date.now()}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-5 w-full pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title="Profit & Loss Statement"
        subtitle="Audited financial statement, top-line revenue, food costs (COGS), operating expenses, and order-by-order ledger."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/expense"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[#4B5563] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              <Receipt className="w-3.5 h-3.5 text-orange-600" />
              <span>Log Expense</span>
            </Link>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-[#1C2333] hover:bg-[#2A3347] rounded-lg transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
          </div>
        }
      />

      {/* 2. Period & Timeframe Selector Bar */}
      <PnLPeriodFilter
        period={period}
        quarter={quarter}
        year={year}
        granularity={granularity}
        singleDate={singleDate}
        startDate={startDate}
        endDate={endDate}
        loading={loading}
        onPeriodChange={(newP) => {
          setPeriod(newP);
          if (newP === 'quarter') {
            setGranularity('day'); // Default to "per day quater p$l"
          }
        }}
        onQuarterChange={(q, y) => {
          setQuarter(q);
          setYear(y);
        }}
        onGranularityChange={setGranularity}
        onSingleDateChange={setSingleDate}
        onCustomRangeChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
        }}
        onRefresh={loadStatement}
        onExportCSV={handleExportCSV}
      />

      {/* 3. Error Banner */}
      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-sm">{error}</span>
          </div>
          <button
            onClick={loadStatement}
            className="text-xs font-bold underline hover:no-underline text-red-900"
          >
            Try Again
          </button>
        </div>
      )}

      {/* 4. Loading Skeletons */}
      {loading && !data && (
        <div className="flex flex-col gap-5 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-xl border border-[#E2E6EA]" />
            ))}
          </div>
          <div className="h-44 bg-white rounded-xl border border-[#E2E6EA]" />
          <div className="h-96 bg-white rounded-xl border border-[#E2E6EA]" />
        </div>
      )}

      {/* 5. Main Dashboard Content */}
      {data && (
        <>
          {/* KPI Summary Cards */}
          <PnLSummaryCards
            metrics={data.metrics}
            customCogsPercent={customCogsPercent}
            onSetCustomCogsPercent={handleSetCustomCogsPercent}
            onOpenExpenses={handleOpenExpenses}
            onInspectAllOrders={handleInspectAllOrders}
          />

          {/* Margin Waterfall Flow */}
          <PnLMarginWaterfall metrics={data.metrics} />

          {/* Breakdown Table with Order Inspection Triggers */}
          <PnLBreakdownTable
            buckets={data.breakdown}
            granularity={data.breakdownGranularity}
            onSelectBucketForOrders={handleOpenBucketOrders}
          />
        </>
      )}

      {/* 6. Order History Drilldown Modal / Drawer */}
      <OrderHistoryDrawer
        isOpen={orderDrawerOpen}
        startDateIso={orderDrawerStart}
        endDateIso={orderDrawerEnd}
        periodLabel={orderDrawerLabel}
        onClose={() => setOrderDrawerOpen(false)}
      />

      {/* 7. Expense History Drilldown Modal / Drawer */}
      {data && (
        <ExpenseHistoryDrawer
          isOpen={expenseDrawerOpen}
          startDateIso={data.dateRange.start}
          endDateIso={data.dateRange.end}
          initialType={expenseDrawerType}
          onClose={() => setExpenseDrawerOpen(false)}
        />
      )}
    </div>
  );
}
