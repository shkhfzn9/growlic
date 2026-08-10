'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  PlainExpenseCategory,
  PlainExpenseItem,
  PlainExpenseLog,
  ExpenseDashboardSummary,
  ItemTimeSeriesBucket,
  MarginImpactSummary,
  ItemMarginImpact,
} from '@/features/expense';
import {
  getItemPriceTrendsAggregationAction,
  getItemMarginImpactAnalyticsAction,
  getItemLogsForInspectionAction,
  deleteExpenseLogAction,
  updateExpenseLogAction,
} from '@/actions/expense';

interface Props {
  categories: PlainExpenseCategory[];
  items: PlainExpenseItem[];
  summary: ExpenseDashboardSummary | null;
  logs: PlainExpenseLog[];
  totalLogsCount: number;
  currentPage: number;
  onPageChange: (newPage: number) => void;
  onRefresh: () => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function DashboardTrendsTab({
  categories,
  items,
  summary,
  logs,
  totalLogsCount,
  currentPage,
  onPageChange,
  onRefresh,
  onShowToast,
}: Props) {
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?._id || '');
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const [timeSeriesBuckets, setTimeSeriesBuckets] = useState<ItemTimeSeriesBucket[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // Margin Impact & Inflation Analytics State
  const [marginTimeframe, setMarginTimeframe] = useState<'week' | '30days' | '90days'>('30days');
  const [marginCategoryId, setMarginCategoryId] = useState<string>('all');
  const [marginSummary, setMarginSummary] = useState<MarginImpactSummary | null>(null);
  const [loadingMargin, setLoadingMargin] = useState(false);

  // Inspection Modal State
  const [inspectingItem, setInspectingItem] = useState<ItemMarginImpact | null>(null);
  const [inspectingLogs, setInspectingLogs] = useState<PlainExpenseLog[]>([]);
  const [loadingInspectingLogs, setLoadingInspectingLogs] = useState(false);

  useEffect(() => {
    if (!inspectingItem) {
      setInspectingLogs([]);
      return;
    }

    const targetItemId = inspectingItem.itemId;
    let isMounted = true;
    async function fetchInspectingLogs() {
      try {
        setLoadingInspectingLogs(true);
        const logs = await getItemLogsForInspectionAction({
          itemId: targetItemId,
          timeframe: marginTimeframe,
        });
        if (isMounted) setInspectingLogs(logs);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoadingInspectingLogs(false);
      }
    }
    fetchInspectingLogs();
    return () => {
      isMounted = false;
    };
  }, [inspectingItem, marginTimeframe]);

  useEffect(() => {
    let isMounted = true;
    async function fetchMarginAnalytics() {
      try {
        setLoadingMargin(true);
        const res = await getItemMarginImpactAnalyticsAction({
          timeframe: marginTimeframe,
          categoryId: marginCategoryId,
        });
        if (isMounted) setMarginSummary(res);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoadingMargin(false);
      }
    }
    fetchMarginAnalytics();
    return () => {
      isMounted = false;
    };
  }, [marginTimeframe, marginCategoryId]);

  // Edit Log Modal State
  const [editingLog, setEditingLog] = useState<PlainExpenseLog | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [editVendor, setEditVendor] = useState('');
  const [editNote, setEditNote] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch Time Series Aggregation whenever selectedItemId or timeRange changes
  useEffect(() => {
    if (!selectedItemId && items.length > 0) {
      setSelectedItemId(items[0]._id);
      return;
    }

    if (!selectedItemId) return;

    let isMounted = true;
    async function fetchTrends() {
      try {
        setLoadingChart(true);
        const buckets = await getItemPriceTrendsAggregationAction({
          itemId: selectedItemId,
          range: timeRange,
        });
        if (isMounted) setTimeSeriesBuckets(buckets);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoadingChart(false);
      }
    }

    fetchTrends();
    return () => {
      isMounted = false;
    };
  }, [selectedItemId, timeRange, items]);

  const selectedItem = useMemo(() => {
    return items.find((i) => i._id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // Chart Min / Max calculations for SVG rendering
  const chartMath = useMemo(() => {
    if (timeSeriesBuckets.length === 0) return { min: 0, max: 100 };
    const prices = timeSeriesBuckets.map((b) => b.avgPricePerUnit);
    let min = Math.min(...prices);
    let max = Math.max(...prices);

    if (min === max) {
      min = Math.max(0, min - 10);
      max = max + 10;
    } else {
      const padding = (max - min) * 0.15;
      min = Math.max(0, min - padding);
      max = max + padding;
    }
    return { min, max };
  }, [timeSeriesBuckets]);

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Delete this purchase log entry? (Delta chain will be repaired automatically)')) return;
    try {
      await deleteExpenseLogAction(logId);
      onShowToast('Deleted purchase log & repaired delta chain', 'info');
      await onRefresh();
    } catch (err) {
      console.error(err);
      onShowToast(err instanceof Error ? err.message : 'Failed to delete log', 'error');
    }
  };

  const handleSaveEditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    const qty = parseFloat(editQty);
    const total = parseFloat(editTotal);

    if (isNaN(qty) || qty <= 0) {
      onShowToast('Quantity must be greater than 0', 'error');
      return;
    }
    if (isNaN(total) || total < 0) {
      onShowToast('Total price cannot be negative', 'error');
      return;
    }

    try {
      setSavingEdit(true);
      await updateExpenseLogAction(editingLog._id, {
        purchaseDate: editDate,
        quantity: qty,
        totalPrice: total,
        vendor: editVendor.trim(),
        note: editNote.trim(),
      });

      onShowToast('Updated log entry & recomputed delta chain!', 'success');
      setEditingLog(null);
      await onRefresh();
    } catch (err) {
      console.error(err);
      onShowToast(err instanceof Error ? err.message : 'Failed to update log', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* 1. Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Weekly Spend Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">This Week Spend</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Calendar className="w-4 h-4" />
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            <span className="text-2xl font-black text-slate-900">
              ₹{(summary?.totalSpendThisWeek || 0).toLocaleString('en-IN')}
            </span>
            <div className="flex items-center gap-1.5 text-xs">
              {(summary?.weekOverWeekDelta || 0) >= 0 ? (
                <span className="font-extrabold text-red-600 flex items-center bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +₹{Math.abs(summary?.weekOverWeekDelta || 0).toLocaleString('en-IN')} (+{summary?.weekOverWeekPercent || 0}%)
                </span>
              ) : (
                <span className="font-extrabold text-emerald-700 flex items-center bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  -₹{Math.abs(summary?.weekOverWeekDelta || 0).toLocaleString('en-IN')} ({summary?.weekOverWeekPercent || 0}%)
                </span>
              )}
              <span className="text-[11px] text-slate-500 font-medium">vs last week</span>
            </div>
          </div>
        </div>

        {/* Monthly Spend Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">This Month Spend</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            <span className="text-2xl font-black text-slate-900">
              ₹{(summary?.totalSpendThisMonth || 0).toLocaleString('en-IN')}
            </span>
            <div className="flex items-center gap-1.5 text-xs">
              {(summary?.monthOverMonthDelta || 0) >= 0 ? (
                <span className="font-extrabold text-red-600 flex items-center bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +₹{Math.abs(summary?.monthOverMonthDelta || 0).toLocaleString('en-IN')} (+{summary?.monthOverMonthPercent || 0}%)
                </span>
              ) : (
                <span className="font-extrabold text-emerald-700 flex items-center bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  -₹{Math.abs(summary?.monthOverMonthDelta || 0).toLocaleString('en-IN')} ({summary?.monthOverMonthPercent || 0}%)
                </span>
              )}
              <span className="text-[11px] text-slate-500 font-medium">vs last month</span>
            </div>
          </div>
        </div>

        {/* Highest Price Jump Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-2xs sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Biggest Price Jump</span>
            <span className="p-2 rounded-xl bg-red-50 text-red-700">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            {summary?.highestPriceJumpItem ? (
              <>
                <span className="text-lg font-black text-slate-900 truncate">
                  {summary.highestPriceJumpItem.itemName}
                </span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-mono font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    ▲ +{summary.highestPriceJumpItem.deltaPercent}%
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium">
                    (₹{summary.highestPriceJumpItem.prevPrice} → ₹{summary.highestPriceJumpItem.currentPrice}/{summary.highestPriceJumpItem.unit})
                  </span>
                </div>
              </>
            ) : (
              <span className="text-xs italic text-slate-400">No price jumps recorded in recent purchases</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Interactive Price Trend Line Chart Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
        {/* Chart Header & Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#F5C518] flex items-center justify-center shadow">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Per-Unit Price Trend Chart</h3>
              <p className="text-xs text-slate-500 font-medium">
                Visualize raw material rate changes over time to identify inflation and price spikes
              </p>
            </div>
          </div>

          {/* Item & Timeframe Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Item Dropdown */}
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none bg-slate-50 cursor-pointer"
            >
              {items.map((i) => (
                <option key={i._id} value={i._id}>
                  📦 {i.name} ({i.unit})
                </option>
              ))}
            </select>

            {/* Range Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {[
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly Avg' },
                { id: 'monthly', label: 'Monthly Avg' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setTimeRange(r.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all ${
                    timeRange === r.id ? 'bg-[#C0181A] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SVG Price Line Chart Display */}
        {loadingChart ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            Loading price trend chart data...
          </div>
        ) : timeSeriesBuckets.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <BarChart3 className="w-8 h-8 text-slate-300" />
            <span>No purchase logs recorded for {selectedItem?.name || 'this item'} in the selected timeframe.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Legend & Stock Line Chart Container */}
            <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-2xl overflow-x-auto scrollbar-thin flex flex-col gap-3">
              {/* Color Pointer Legend */}
              <div className="flex items-center justify-end gap-4 text-[11px] font-bold border-b border-slate-800/80 pb-2.5 px-2">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] border stroke-white inline-block shadow-2xs"></span>
                  <span>Rate Increase (Inflation 🔴)</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] border stroke-white inline-block shadow-2xs"></span>
                  <span>Rate Decline (Savings 🟢)</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F5C518] border stroke-white inline-block shadow-2xs"></span>
                  <span>Baseline / Flat 🟡</span>
                </div>
              </div>

              <div className="min-w-[650px] flex gap-4 items-stretch">
                {/* Y-Axis Price Labels (Left Column) */}
                <div className="flex flex-col justify-between text-[11px] font-mono font-black text-amber-400 py-2 pr-2 border-r border-slate-800 shrink-0 select-none">
                  <span>₹{chartMath.max.toFixed(2)}</span>
                  <span>₹{((chartMath.max + chartMath.min) * 0.75 / 1.5).toFixed(2)}</span>
                  <span>₹{((chartMath.max + chartMath.min) / 2).toFixed(2)}</span>
                  <span>₹{((chartMath.max + chartMath.min) * 0.25).toFixed(2)}</span>
                  <span>₹{chartMath.min.toFixed(2)}</span>
                </div>

                {/* Main Graph Area */}
                <div className="flex-1 flex flex-col justify-between relative pt-2">
                  <div className="h-64 relative w-full">
                    {(() => {
                      const svgWidth = 800;
                      const svgHeight = 260;
                      const paddingY = 30; // 30px padding top/bottom for expandable headroom
                      const range = chartMath.max - chartMath.min || 1;
                      const usableHeight = svgHeight - (paddingY * 2);

                      const svgPoints = timeSeriesBuckets.map((b, idx) => {
                        const x = timeSeriesBuckets.length === 1 ? svgWidth / 2 : (idx / (timeSeriesBuckets.length - 1)) * svgWidth;
                        const y = svgHeight - paddingY - ((b.avgPricePerUnit - chartMath.min) / range) * usableHeight;
                        return { x, y, bucket: b };
                      });

                      const polylinePoints = svgPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                      const polygonPoints = `0,${svgHeight} ` + polylinePoints + ` ${svgWidth},${svgHeight}`;

                      return (
                        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                          <defs>
                            <linearGradient id="stockAreaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#F5C518" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#F5C518" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Horizontal Grid Lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                            const lineY = paddingY + pct * usableHeight;
                            return (
                              <line
                                key={idx}
                                x1="0"
                                y1={lineY}
                                x2={svgWidth}
                                y2={lineY}
                                stroke="#334155"
                                strokeDasharray="4 4"
                                strokeWidth="1"
                              />
                            );
                          })}

                          {/* Gradient Area Fill under Stock Line */}
                          {svgPoints.length > 1 && (
                            <polygon fill="url(#stockAreaGradient)" points={polygonPoints} />
                          )}

                          {/* Stock Line Connecting All Pointers */}
                          {svgPoints.length > 1 && (
                            <polyline
                              fill="none"
                              stroke="#F5C518"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={polylinePoints}
                            />
                          )}

                          {/* Dynamic Color-Coded Hover Point Dots */}
                          {svgPoints.map((p, idx) => {
                            const b = p.bucket;
                            const pointColor =
                              typeof b.deltaVsPrevPeriod === 'number' && b.deltaVsPrevPeriod > 0
                                ? '#EF4444' // Red Pointer (Rate Increase)
                                : typeof b.deltaVsPrevPeriod === 'number' && b.deltaVsPrevPeriod < 0
                                ? '#10B981' // Green Pointer (Price Decline)
                                : '#F5C518'; // Yellow/Amber Pointer (Baseline)

                            // Smart Tooltip Position: Flip BELOW dot if in top half of graph to prevent clipping!
                            const isTopHalf = p.y < 120;
                            const tooltipY = isTopHalf ? p.y + 15 : p.y - 115;
                            const tooltipX = Math.max(10, Math.min(svgWidth - 190, p.x - 90));

                            return (
                              <g key={idx} className="group cursor-pointer">
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="7.5"
                                  fill={pointColor}
                                  stroke="#FFFFFF"
                                  strokeWidth="2.5"
                                  className="transition-all duration-200 group-hover:r-10 shadow-lg"
                                />

                                {/* Floating Rich Tooltip with Adaptive Smart Position */}
                                <foreignObject
                                  x={tooltipX}
                                  y={tooltipY}
                                  width="180"
                                  height="100"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 overflow-visible"
                                >
                                  <div className="bg-slate-900/95 border border-amber-400 text-white rounded-xl p-2.5 shadow-2xl flex flex-col gap-1.5 text-[11px] font-sans backdrop-blur-md">
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                                      <span className="font-mono font-black text-amber-400 flex items-center gap-1 text-[11px]">
                                        <span>📅 Date:</span>
                                        <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{b.period}</span>
                                      </span>
                                      {typeof b.deltaVsPrevPeriod === 'number' && (
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${b.deltaVsPrevPeriod > 0 ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                                          {b.deltaVsPrevPeriod > 0 ? `▲ +${b.deltaVsPrevPeriod}%` : `▼ ${b.deltaVsPrevPeriod}%`}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex justify-between items-center font-extrabold">
                                      <span className="text-slate-400 text-[10px] uppercase">Price / Unit:</span>
                                      <span className="font-mono font-black text-amber-300 text-xs">₹{b.avgPricePerUnit.toFixed(2)} / {selectedItem?.unit}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400 uppercase">Total Spend:</span>
                                      <span className="font-mono text-emerald-400 font-black">₹{b.totalSpend.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-800/60 pt-1">
                                      <span>Bought: {b.totalQuantity} {selectedItem?.unit}</span>
                                      <span>({b.purchaseCount} {b.purchaseCount === 1 ? 'purchase log' : 'logs'})</span>
                                    </div>
                                  </div>
                                </foreignObject>
                              </g>
                            );
                          })}
                        </svg>
                      );
                    })()}
                  </div>

                  {/* X-Axis Date Labels */}
                  <div className="flex justify-between items-center text-[11px] text-slate-300 font-mono mt-4 border-t border-slate-800 pt-2 font-bold select-none">
                    {timeSeriesBuckets.map((b, idx) => (
                      <span key={idx} className="truncate text-center max-w-[80px]">
                        {b.period}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Time-Bucket Data Pills below chart */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {timeSeriesBuckets.map((b, idx) => (
                <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col text-xs shadow-2xs">
                  <span className="text-[9px] font-mono text-slate-400 uppercase">{b.period}</span>
                  <span className="font-mono font-black text-slate-900">₹{b.avgPricePerUnit.toFixed(2)}/{selectedItem?.unit}</span>
                  <span className="text-[10px] text-slate-500 font-bold">Total: ₹{b.totalSpend.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Top 5 Spend Items Breakdown */}
      {summary?.topSpendItems && summary.topSpendItems.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 shadow-2xs">
          <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-3">
            🔥 Top Expense Items by Total Spend
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.topSpendItems.map((ti) => {
              const highestSpend = summary.topSpendItems[0]?.totalSpend || 1;
              const barPct = Math.round((ti.totalSpend / highestSpend) * 100);

              return (
                <div key={ti.itemId} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between items-center font-extrabold text-slate-900">
                    <span>{ti.itemName} <span className="text-[10px] text-slate-400 font-normal">({ti.categoryName})</span></span>
                    <span className="font-mono font-black text-slate-900">₹{ti.totalSpend.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C0181A] rounded-full transition-all" style={{ width: `${barPct}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold">
                    Total Quantity Bought: {ti.totalQuantity} {ti.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Profit Margin & Cost Inflation Analyzer */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950 text-red-400 flex items-center justify-center shadow">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <span>Profit Margin & Cost Inflation Analyzer</span>
                <span className="text-xs font-black bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full uppercase border border-red-200">
                  Margin Impact
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pinpoint exact raw material price jumps eating into your restaurant's profits this week/month
              </p>
            </div>
          </div>

          {/* Timeframe & Category Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={marginCategoryId}
              onChange={(e) => setMarginCategoryId(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none bg-slate-50 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  📁 {c.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {[
                { id: 'week', label: '7 Days' },
                { id: '30days', label: '30 Days' },
                { id: '90days', label: '90 Days' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setMarginTimeframe(r.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    marginTimeframe === r.id ? 'bg-[#C0181A] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loadingMargin ? (
          <div className="py-12 text-center text-xs text-slate-400 font-bold">
            Analyzing price inflation and margin impact...
          </div>
        ) : !marginSummary || marginSummary.items.length === 0 ? (
          <div className="p-8 text-center text-xs italic text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
            No purchase logs found for the selected margin analysis timeframe.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Margin Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[11px] font-black uppercase text-red-700 tracking-wider">Extra Paid (Inflation Loss)</span>
                <div className="mt-2 flex flex-col">
                  <span className="text-2xl font-black text-red-900 font-mono">
                    +₹{marginSummary.totalExtraSpendDueToInflation.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-red-700 font-extrabold mt-0.5">
                    Total across {marginSummary.items.length} items ({marginSummary.timeframe})
                  </span>
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[11px] font-black uppercase text-emerald-700 tracking-wider">Cost Savings (Price Drops)</span>
                <div className="mt-2 flex flex-col">
                  <span className="text-2xl font-black text-emerald-900 font-mono">
                    -₹{marginSummary.totalSavingsFromPriceDrops.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-extrabold mt-0.5">
                    Saved from rate drops below baseline
                  </span>
                </div>
              </div>

              <div
                onClick={() => marginSummary.topMarginEaterItem && setInspectingItem(marginSummary.topMarginEaterItem)}
                className={`bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col justify-between transition-all ${
                  marginSummary.topMarginEaterItem ? 'cursor-pointer hover:border-amber-400 hover:bg-amber-100/80 shadow-2xs' : ''
                }`}
                title={marginSummary.topMarginEaterItem ? 'Click to inspect day-by-day log details' : ''}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-amber-800 tracking-wider">#1 Profit Margin Eater</span>
                  {marginSummary.topMarginEaterItem && (
                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">
                      Click to Inspect 🔍
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-col">
                  <span className="text-base font-black text-amber-950 truncate">
                    {marginSummary.topMarginEaterItem ? marginSummary.topMarginEaterItem.itemName : 'None'}
                  </span>
                  <span className="text-[11px] text-amber-800 font-extrabold mt-0.5 font-mono">
                    {marginSummary.topMarginEaterItem
                      ? `+₹${marginSummary.topMarginEaterItem.totalExtraPaid.toLocaleString('en-IN')} extra paid (Caused ${
                          marginSummary.totalExtraSpendDueToInflation > 0
                            ? Math.round((marginSummary.topMarginEaterItem.totalExtraPaid / marginSummary.totalExtraSpendDueToInflation) * 100)
                            : 100
                        }% of your ₹${marginSummary.totalExtraSpendDueToInflation.toLocaleString('en-IN')} total loss)`
                      : 'No inflation recorded'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col justify-between shadow-md" title="Net percentage change in total kitchen purchasing budget after subtracting price drop savings">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Net Inflation Rate Spike</span>
                <div className="mt-2 flex flex-col">
                  <span className={`text-2xl font-black font-mono ${marginSummary.overallInflationPercent > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {marginSummary.overallInflationPercent > 0 ? `+${marginSummary.overallInflationPercent}%` : `${marginSummary.overallInflationPercent}%`}
                  </span>
                  <span className="text-[11px] text-slate-400 font-bold mt-0.5">
                    Net budget growth rate ({marginSummary.timeframe})
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Item-by-Item Margin Loss Table */}
            <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="p-3">Item Profile & Category</th>
                    <th className="p-3 text-center">Baseline Rate</th>
                    <th className="p-3 text-center">Current / Peak Rate</th>
                    <th className="p-3 text-right">Total Qty & Spend</th>
                    <th className="p-3 text-right">Extra Spend (Margin Impact)</th>
                    <th className="p-3 text-center">Inflation %</th>
                    <th className="p-3 text-center">Profit Risk Status</th>
                    <th className="p-3 text-right">Inspect Logs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-900">
                  {marginSummary.items.map((item) => (
                    <tr
                      key={item.itemId}
                      onClick={() => setInspectingItem(item)}
                      className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                      title="Click to inspect day-by-day log details"
                    >
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900">{item.itemName}</span>
                          <span className="text-[10px] text-slate-500 font-bold">📁 {item.categoryName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-600">
                        ₹{item.firstPricePerUnit.toFixed(2)} / {item.unit}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-900">
                        <div>₹{item.latestPricePerUnit.toFixed(2)} / {item.unit}</div>
                        <div className="text-[9px] text-slate-400">Peak: ₹{item.maxPricePerUnit.toFixed(2)}</div>
                      </td>
                      <td className="p-3 text-right font-mono">
                        <div className="font-black text-slate-900">₹{item.totalSpend.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-slate-500">{item.totalQuantity} {item.unit}</div>
                      </td>
                      <td className="p-3 text-right font-mono">
                        {item.netExtraSpend > 0 ? (
                          <span className="font-black text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                            +₹{item.netExtraSpend.toLocaleString('en-IN')} 🔴
                          </span>
                        ) : item.netExtraSpend < 0 ? (
                          <span className="font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                            -₹{Math.abs(item.netExtraSpend).toLocaleString('en-IN')} 🟢
                          </span>
                        ) : (
                          <span className="font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                            ₹0.00 (No change)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={item.inflationPercent > 0 ? 'text-red-600 font-black' : item.inflationPercent < 0 ? 'text-emerald-600 font-black' : 'text-slate-500'}>
                          {item.inflationPercent > 0 ? `▲ +${item.inflationPercent}%` : item.inflationPercent < 0 ? `▼ ${item.inflationPercent}%` : '0%'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {item.riskLevel === 'HIGH_RISK' && (
                          <span className="bg-red-100 text-red-800 border border-red-300 font-black text-[10px] px-2.5 py-1 rounded-full uppercase">
                            ⚠️ High Margin Loss
                          </span>
                        )}
                        {item.riskLevel === 'MEDIUM_RISK' && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 font-black text-[10px] px-2.5 py-1 rounded-full uppercase">
                            ⚡ Rate Increase
                          </span>
                        )}
                        {item.riskLevel === 'SAVINGS' && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[10px] px-2.5 py-1 rounded-full uppercase">
                            🟢 Cost Savings
                          </span>
                        )}
                        {item.riskLevel === 'STABLE' && (
                          <span className="bg-slate-100 text-slate-600 border border-slate-200 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">
                            Stable Rate
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingItem(item);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-amber-400 text-[11px] font-black px-3 py-1.5 rounded-xl shadow-2xs transition-all inline-flex items-center gap-1"
                        >
                          <span>Inspect Logs</span>
                          <span className="text-[9px]">🔍</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. Paginated Purchase History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <Layers className="w-4.5 h-4.5 text-[#C0181A]" />
            <span>Complete Purchase History Log ({totalLogsCount} Records)</span>
          </h3>
        </div>

        {logs.length === 0 ? (
          <p className="text-xs italic text-slate-400 p-4 bg-slate-50 rounded-xl border border-slate-200">
            No purchase history logged.
          </p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Item Profile</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Total Paid</th>
                  <th className="p-3">Rate / Unit</th>
                  <th className="p-3">Price Delta</th>
                  <th className="p-3">Vendor / Note</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-900">
                {logs.map((log) => {
                  const itemName = typeof log.itemId === 'object' ? log.itemId.name : log.itemName || 'Item';
                  const itemUnit = typeof log.itemId === 'object' ? log.itemId.unit : log.itemUnit || 'unit';
                  const isHigher = Boolean(log.deltaPerUnit && log.deltaPerUnit > 0);
                  const isLower = Boolean(log.deltaPerUnit && log.deltaPerUnit < 0);

                  return (
                    <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-extrabold text-slate-700 whitespace-nowrap">
                        {log.purchaseDate.slice(0, 10)}
                      </td>
                      <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                        {itemName}
                      </td>
                      <td className="p-3 font-mono">
                        {log.quantity} {itemUnit}
                      </td>
                      <td className="p-3 font-mono font-black text-slate-900">
                        ₹{log.totalPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        ₹{log.pricePerUnit.toFixed(2)} / {itemUnit}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {log.deltaPerUnit !== null && log.deltaPerUnit !== undefined ? (
                          isHigher ? (
                            <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-mono">
                              ▲ +₹{log.deltaPerUnit.toFixed(2)} (+{log.deltaPercent}%)
                            </span>
                          ) : isLower ? (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                              ▼ -₹{Math.abs(log.deltaPerUnit).toFixed(2)} ({log.deltaPercent}%)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Same rate
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">First purchase</span>
                        )}
                      </td>
                      <td className="p-3 max-w-xs truncate text-[11px] text-slate-500">
                        {log.vendor && <span className="font-extrabold text-slate-700">{log.vendor} </span>}
                        {log.note && <span className="italic">"{log.note}"</span>}
                        {!log.vendor && !log.note && <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingLog(log);
                              setEditDate(log.purchaseDate.slice(0, 10));
                              setEditQty(log.quantity.toString());
                              setEditTotal(log.totalPrice.toString());
                              setEditVendor(log.vendor || '');
                              setEditNote(log.note || '');
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                            title="Edit Purchase Entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log._id)}
                            className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            title="Delete Purchase Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalLogsCount > 20 && (
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs">
            <span className="text-slate-500 font-medium">
              Showing page {currentPage} of {Math.ceil(totalLogsCount / 20)}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="px-3 py-1.5 rounded-lg border text-xs font-bold disabled:opacity-40 bg-white hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4 inline" /> Prev
              </button>
              <button
                disabled={currentPage >= Math.ceil(totalLogsCount / 20)}
                onClick={() => onPageChange(currentPage + 1)}
                className="px-3 py-1.5 rounded-lg border text-xs font-bold disabled:opacity-40 bg-white hover:bg-slate-50"
              >
                Next <ChevronRight className="w-4 h-4 inline" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Purchase Log Modal */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEditLog} className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 text-slate-900">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base">Edit Purchase Entry</h3>
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase text-slate-600">Purchase Date</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none font-mono cursor-pointer"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold uppercase text-slate-600">Quantity</label>
                <input
                  type="number"
                  step="any"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold uppercase text-slate-600">Total Paid (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={editTotal}
                  onChange={(e) => setEditTotal(e.target.value)}
                  className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase text-slate-600">Vendor</label>
              <input
                type="text"
                value={editVendor}
                onChange={(e) => setEditVendor(e.target.value)}
                className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase text-slate-600">Note</label>
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none"
              />
            </div>

            <p className="text-[11px] italic text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              ⚠️ Editing this entry will automatically recompute per-unit costs and repair the delta chain for subsequent entries.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="bg-[#C0181A] hover:bg-red-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow"
              >
                {savingEdit ? 'Saving...' : 'Save & Recompute Chain'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. Pinpoint Day-by-Day Purchase Log Inspection Modal */}
      {inspectingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl flex flex-col gap-5 shadow-2xl max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shadow">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <span>📦 {inspectingItem.itemName}</span>
                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      {inspectingItem.unit}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Pinpoint Day-by-Day Purchase Log Breakdown ({marginTimeframe === 'week' ? 'Last 7 Days' : marginTimeframe === '90days' ? 'Last 90 Days' : 'Last 30 Days'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingItem(null)}
                className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-slate-400">Baseline Rate</span>
                <span className="font-mono font-extrabold text-slate-700">₹{inspectingItem.firstPricePerUnit.toFixed(2)}/{inspectingItem.unit}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-slate-400">Current Rate</span>
                <span className="font-mono font-extrabold text-slate-900">₹{inspectingItem.latestPricePerUnit.toFixed(2)}/{inspectingItem.unit}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-slate-400">Extra Paid</span>
                <span className={`font-mono font-black ${inspectingItem.netExtraSpend > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {inspectingItem.netExtraSpend > 0 ? `+₹${inspectingItem.netExtraSpend}` : `₹${inspectingItem.netExtraSpend}`}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-slate-400">Inflation %</span>
                <span className={`font-mono font-black ${inspectingItem.inflationPercent > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {inspectingItem.inflationPercent > 0 ? `▲ +${inspectingItem.inflationPercent}%` : `${inspectingItem.inflationPercent}%`}
                </span>
              </div>
            </div>

            {/* Inspection Log List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 flex flex-col gap-3">
              {loadingInspectingLogs ? (
                <div className="py-12 text-center text-xs text-slate-400 font-bold">
                  Fetching pinpoint purchase logs...
                </div>
              ) : inspectingLogs.length === 0 ? (
                <div className="py-8 text-center text-xs italic text-slate-400">
                  No logs found for this item in the selected period.
                </div>
              ) : (
                inspectingLogs.map((log) => {
                  const isJump = Boolean(log.deltaPerUnit && log.deltaPerUnit > 0);
                  const isDrop = Boolean(log.deltaPerUnit && log.deltaPerUnit < 0);

                  return (
                    <div
                      key={log._id}
                      className={`p-4 rounded-2xl border flex flex-col gap-2 transition-all ${
                        isJump
                          ? 'bg-red-50/50 border-red-200'
                          : isDrop
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono font-black text-xs text-slate-900">
                            {log.purchaseDate.slice(0, 10)}
                          </span>
                          {log.vendor && (
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border">
                              🏪 {log.vendor}
                            </span>
                          )}
                        </div>

                        {/* Rate Delta Badge */}
                        {isJump && (
                          <span className="font-mono font-black text-xs text-red-600 bg-red-100 border border-red-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>+₹{log.deltaPerUnit?.toFixed(2)}/{inspectingItem.unit} (+{log.deltaPercent?.toFixed(1)}%)</span>
                          </span>
                        )}
                        {isDrop && (
                          <span className="font-mono font-black text-xs text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            <span>-₹{Math.abs(log.deltaPerUnit || 0).toFixed(2)}/{inspectingItem.unit} ({log.deltaPercent?.toFixed(1)}%)</span>
                          </span>
                        )}
                        {!isJump && !isDrop && (
                          <span className="font-mono font-bold text-[10px] text-slate-500 bg-slate-100 border px-2 py-0.5 rounded-full">
                            First / Baseline Purchase
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-white/80 p-2.5 rounded-xl border text-xs font-mono">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Quantity</span>
                          <span className="font-bold text-slate-800">{log.quantity} {inspectingItem.unit}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Rate / Unit</span>
                          <span className="font-black text-slate-900">₹{log.pricePerUnit.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Amount</span>
                          <span className="font-black text-slate-900">₹{log.totalPrice.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Delta Impact Statement */}
                      {typeof log.deltaTotal === 'number' && log.deltaTotal !== 0 && (
                        <div className="flex justify-between items-center text-[11px] font-bold border-t pt-1.5 mt-0.5">
                          <span className="text-slate-500">Margin Impact on this Purchase:</span>
                          {log.deltaTotal > 0 ? (
                            <span className="text-red-700 font-mono font-black">
                              +₹{log.deltaTotal.toFixed(2)} Extra Paid vs Previous Rate 🔴
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-mono font-black">
                              -₹{Math.abs(log.deltaTotal).toFixed(2)} Saved vs Previous Rate 🟢
                            </span>
                          )}
                        </div>
                      )}

                      {log.note && (
                        <p className="text-[11px] italic text-slate-500">
                          Note: "{log.note}"
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end border-t pt-3">
              <button
                onClick={() => setInspectingItem(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
