'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { getAdminSopAnalyticsAction } from '@/actions/sop';
import { computeStaffPerformanceMetrics, formatExecutionTime, getLocalDateStr } from '@/features/sop/analyticsEngine';
import { PageHeader } from '@/components/ui';
import {
  ArrowLeft,
  BarChart2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Award,
  Zap,
  Clock,
  User,
} from 'lucide-react';

interface PlainSopTask {
  _id: string;
  restaurantId: string;
  batchName: string;
  batchWindow: string;
  taskName: string;
  description?: string;
  targetMinutes: number;
  assignedStaffName?: string;
  active: boolean;
  orderIndex?: number;
}

interface PlainSopLog {
  _id: string;
  taskId?: string;
  taskName: string;
  batchName: string;
  employeeName: string;
  actualMinutes: number;
  targetMinutes: number;
  delayMinutes: number;
  status: 'completed' | 'delayed';
  delayReason?: string;
  dateStr: string;
  completedAtIso?: string;
  createdAt?: string;
}

interface PlainSopStaff {
  _id: string;
  restaurantId: string;
  name: string;
  role?: string;
  active: boolean;
}

function InDepthAnalyticsContent() {
  const searchParams = useSearchParams();
  const initialStaffParam = searchParams.get('staff') || '';

  const auth = useSelector((state: RootState) => state.auth);

  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [selectedStaffName, setSelectedStaffName] = useState<string>(initialStaffParam);

  const [analytics, setAnalytics] = useState<{
    logs: PlainSopLog[];
    tasks: PlainSopTask[];
    staffProfiles: PlainSopStaff[];
  } | null>(null);

  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | '6months' | 'year'>('month');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [startDateInput, setStartDateInput] = useState<string>('');
  const [endDateInput, setEndDateInput] = useState<string>('');
  const [graphFilter, setGraphFilter] = useState<'all' | 'delayed_only' | 'missed_only' | 'perfect_only'>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const endDateStr = today.toISOString().split('T')[0];
      const start = new Date();
      start.setDate(today.getDate() - 100);
      const startDateStr = start.toISOString().split('T')[0];

      const res = await getAdminSopAnalyticsAction(startDateStr, endDateStr, selectedBatch);
      setAnalytics(res);

      if (!selectedStaffName && res.staffProfiles && res.staffProfiles.length > 0) {
        setSelectedStaffName(res.staffProfiles[0].name);
      }
    } catch (err) {
      console.error('Failed to load SOP in-depth analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBatch]);

  const activeStaffProfiles = useMemo(() => {
    return analytics?.staffProfiles || [];
  }, [analytics]);

  const activeStaffObj = useMemo(() => {
    if (!selectedStaffName) return null;
    return activeStaffProfiles.find(
      (s) => s.name.trim().toLowerCase() === selectedStaffName.trim().toLowerCase()
    ) || { name: selectedStaffName, role: 'Kitchen Staff' };
  }, [selectedStaffName, activeStaffProfiles]);

  const assignedTasksForStaff = useMemo(() => {
    if (!selectedStaffName || !analytics?.tasks) return [];
    return analytics.tasks.filter(
      (t) => t.assignedStaffName?.trim().toLowerCase() === selectedStaffName.trim().toLowerCase()
    );
  }, [selectedStaffName, analytics]);

  const metrics = useMemo(() => {
    if (!selectedStaffName) return null;
    return computeStaffPerformanceMetrics({
      staffName: selectedStaffName,
      allLogs: analytics?.logs || [],
      assignedTasks: assignedTasksForStaff,
      timeframe,
      customDateRange: startDateInput && endDateInput ? { startDateStr: startDateInput, endDateStr: endDateInput } : undefined,
    });
  }, [selectedStaffName, analytics, assignedTasksForStaff, timeframe, startDateInput, endDateInput]);

  return (
    <div className="flex flex-col gap-6 max-w-6xl pb-16 font-sans">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E6EA] pb-4">
        <div>
          <Link
            href="/admin/sop-tracker"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to SOP Tracker</span>
          </Link>
          <PageHeader
            title="Charts & In-Depth SOP Analytics 📈"
            subtitle="Advanced performance graphs, period capping (100 / 700 / 3000 caps), day pinpoint inspection, & custom date range filter"
          />
        </div>

        {/* Staff Selector Dropdown */}
        <div className="flex items-center gap-2 bg-white border border-[#E2E6EA] p-2 rounded-2xl shadow-xs">
          <User className="w-4 h-4 text-slate-500 ml-1" />
          <span className="text-xs font-bold text-slate-600">Select Staff:</span>
          <select
            value={selectedStaffName}
            onChange={(e) => {
              setSelectedStaffName(e.target.value);
              setSelectedDate('');
              setStartDateInput('');
              setEndDateInput('');
            }}
            className="bg-slate-100 text-xs font-black text-slate-900 px-3 py-1.5 rounded-xl border border-slate-300 outline-none cursor-pointer"
          >
            {activeStaffProfiles.map((s) => (
              <option key={s._id || s.name} value={s.name}>
                {s.name} ({s.role || 'Kitchen Staff'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E6EA] rounded-2xl p-12 text-center text-gray-500 text-sm animate-pulse">
          Loading 100-day in-depth operational analytics...
        </div>
      ) : !metrics || !selectedStaffName ? (
        <div className="bg-white border border-[#E2E6EA] rounded-2xl p-12 text-center text-gray-500 text-sm">
          No staff profile selected or available. Please create staff profiles in the SOP Tracker.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Staff Hero Performance Bar */}
          <div className="bg-[#0F172A] text-white rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl border border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F5C518] text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg">
                {selectedStaffName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-black text-xl text-white">{selectedStaffName}'s Performance Dashboard</h2>
                <span className="text-xs text-slate-400 font-medium">
                  {activeStaffObj?.role || 'Kitchen Staff'} • Evaluated over {metrics.daysCount} Active {metrics.daysCount === 1 ? 'Day' : 'Days'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <div
                  className={`px-5 py-2 rounded-2xl font-black text-lg shadow-md flex items-center gap-2 ${
                    metrics.productivityRatio >= 90
                      ? 'bg-emerald-500 text-white'
                      : metrics.productivityRatio >= 75
                      ? 'bg-amber-500 text-white'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  <span>{metrics.productivityRatio}%</span>
                  <span className="text-xs font-normal opacity-90">({metrics.earnedScore}/{metrics.maxBaseScore} pts)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                  {metrics.gradeLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Timeframe & Date Pickers Control Bar */}
          <div className="bg-white border border-[#E2E6EA] rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E2E6EA] pb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#C0181A]" />
                <span>Analytics Window & Custom Date Range</span>
              </span>

              {/* Timeframe Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'day', label: '📅 Today (100 cap)' },
                  { id: 'week', label: '🗓️ Last 7 Days (700 cap)' },
                  { id: 'month', label: '📆 Last 30 Days (3000 cap)' },
                  { id: '6months', label: '📈 6 Months (18K cap)' },
                  { id: 'year', label: '🏆 1 Year (36.5K cap)' },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => {
                      setTimeframe(tf.id as any);
                      setSelectedDate('');
                      setStartDateInput('');
                      setEndDateInput('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
                      timeframe === tf.id && !selectedDate && !startDateInput
                        ? 'bg-[#F5C518] text-slate-950 shadow'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Range & Single Day Pickers */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Single Day Picker */}
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600">📅 Single Day:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setStartDateInput('');
                      setEndDateInput('');
                    }}
                    className="bg-white border border-slate-300 text-xs text-slate-900 rounded px-2 py-0.5 outline-none font-mono cursor-pointer"
                  />
                </div>

                {/* Custom Range Picker */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">🗓️ Pick Range:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">From</span>
                    <input
                      type="date"
                      value={startDateInput}
                      onChange={(e) => {
                        setStartDateInput(e.target.value);
                        setSelectedDate('');
                      }}
                      className="bg-white border border-slate-300 text-xs text-slate-900 rounded px-2 py-0.5 outline-none font-mono cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">To</span>
                    <input
                      type="date"
                      value={endDateInput}
                      onChange={(e) => {
                        setEndDateInput(e.target.value);
                        setSelectedDate('');
                      }}
                      className="bg-white border border-slate-300 text-xs text-slate-900 rounded px-2 py-0.5 outline-none font-mono cursor-pointer"
                    />
                  </div>
                </div>

                {(selectedDate || startDateInput || endDateInput) && (
                  <button
                    onClick={() => {
                      setSelectedDate('');
                      setStartDateInput('');
                      setEndDateInput('');
                    }}
                    className="text-xs font-extrabold text-amber-700 hover:text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 transition-all active:scale-95"
                  >
                    Reset Range Filter
                  </button>
                )}
              </div>

              <span className="text-[11px] text-slate-400 italic">
                💡 Base score = {metrics.daysCount} days × 100 = {metrics.maxBaseScore} pts max
              </span>
            </div>
          </div>

          {/* Positives (+ve) vs Negatives (-ve) Work Performance Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Positives (+ve) Card */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                  <span>+ve Work Positives</span>
                </span>
                <span className="text-[10px] font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
                  {metrics.gradeLabel}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">On-Time Tasks</span>
                  <span className="text-lg font-black text-emerald-700">{metrics.onTimeCount} Tasks</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Productivity Ratio</span>
                  <span className="text-lg font-black text-emerald-700">{metrics.productivityRatio}%</span>
                </div>
              </div>
            </div>

            {/* Negatives (-ve) Card */}
            <div className="bg-red-50/70 border border-red-200 rounded-2xl p-5 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
                  <span>-ve Delays, Missed & Penalties</span>
                </span>
                <span className="text-[10px] font-black bg-red-600 text-white px-2.5 py-0.5 rounded-full">
                  -{metrics.totalPenalties} PTS
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="bg-white p-3 rounded-xl border border-red-100 shadow-2xs">
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Delays</span>
                  <span className="text-base font-black text-red-600">{metrics.delayedCount} (-{metrics.delayedCount * 5})</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-red-100 shadow-2xs">
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Missed Tasks</span>
                  <span className="text-base font-black text-amber-700">{metrics.missedCount} (-{metrics.missedCount * 5})</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-red-100 shadow-2xs">
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Total Penalty</span>
                  <span className="text-base font-black text-red-700">-{metrics.totalPenalties} pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparative Insights (Best vs Worst Windows) */}
          <div className="bg-[#FAF9F5] border border-amber-200/80 rounded-2xl p-5 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <Award className="w-4 h-4 text-amber-600" />
              <h4 className="font-extrabold text-xs uppercase tracking-wider">
                Comparative Insights (Best vs. Worst Performance Windows)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Daily Best & Worst */}
              <div className="bg-white p-3.5 rounded-xl border border-amber-100 flex flex-col gap-1.5 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase text-gray-400">📅 Day Evaluation (100 Cap)</span>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700 font-extrabold text-xs">🏆 Best: {metrics.bestDay ? `${metrics.bestDay.dateStr.slice(5)} (${metrics.bestDay.score} pts)` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-600 font-extrabold text-xs">⚠️ Worst: {metrics.worstDay ? `${metrics.worstDay.dateStr.slice(5)} (${metrics.worstDay.score} pts)` : 'N/A'}</span>
                </div>
              </div>

              {/* Weekly Best & Worst */}
              <div className="bg-white p-3.5 rounded-xl border border-amber-100 flex flex-col gap-1.5 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase text-gray-400">🗓️ Week Evaluation (700 Cap)</span>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700 font-extrabold text-xs">📈 Best: {metrics.bestWeek ? `${metrics.bestWeek.label} (${metrics.bestWeek.earned}/${metrics.bestWeek.cap} pts)` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-600 font-extrabold text-xs">⚠️ Worst: {metrics.worstWeek ? `${metrics.worstWeek.label} (${metrics.worstWeek.earned}/${metrics.worstWeek.cap} pts)` : 'N/A'}</span>
                </div>
              </div>

              {/* Monthly Best & Worst */}
              <div className="bg-white p-3.5 rounded-xl border border-amber-100 flex flex-col gap-1.5 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase text-gray-400">📆 Month Evaluation (3000 Cap)</span>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700 font-extrabold text-xs">🏆 Best: {metrics.bestMonth ? `${metrics.bestMonth.label} (${metrics.bestMonth.earned}/${metrics.bestMonth.cap} pts)` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-600 font-extrabold text-xs">⚠️ Worst: {metrics.worstMonth ? `${metrics.worstMonth.label} (${metrics.worstMonth.earned}/${metrics.worstMonth.cap} pts)` : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Day-by-Day Score History Bar Chart */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                <span>Day-by-Day Score History ({selectedDate ? `Day: ${selectedDate}` : timeframe.toUpperCase()})</span>
              </h3>

              {/* Graph Filter Status Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setGraphFilter('all')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                    graphFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({metrics.dailyBreakdown.length})
                </button>
                <button
                  onClick={() => setGraphFilter('delayed_only')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                    graphFilter === 'delayed_only'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  🔴 Delays ({metrics.dailyBreakdown.filter((d) => d.delayed > 0).length})
                </button>
                <button
                  onClick={() => setGraphFilter('missed_only')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                    graphFilter === 'missed_only'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  ⚠️ Missed ({metrics.dailyBreakdown.filter((d) => d.missed > 0).length})
                </button>
                <button
                  onClick={() => setGraphFilter('perfect_only')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                    graphFilter === 'perfect_only'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  🟢 Perfect ({metrics.dailyBreakdown.filter((d) => d.delayed === 0 && d.missed === 0).length})
                </button>
              </div>
            </div>

            {(() => {
              const visibleDailyBreakdown = metrics.dailyBreakdown.filter((item) => {
                if (graphFilter === 'delayed_only') return item.delayed > 0;
                if (graphFilter === 'missed_only') return item.missed > 0;
                if (graphFilter === 'perfect_only') return item.delayed === 0 && item.missed === 0;
                return true;
              });

              if (visibleDailyBreakdown.length === 0) {
                return (
                  <p className="text-xs text-[#6B7280] italic bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E6EA]">
                    No historical logs matching "{graphFilter}" filter in this timeframe.
                  </p>
                );
              }

              return (
                <div className="bg-[#F8FAFC] border border-[#E2E6EA] rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
                  {/* Bars Container */}
                  <div className="flex items-end justify-start gap-2 h-56 pt-14 pb-3 border-b border-gray-200 px-2 overflow-x-auto scrollbar-thin">
                    {visibleDailyBreakdown.map((item, idx) => {
                      const scoreHeightPct = Math.max(12, item.score);
                      const isSelectedDate = selectedDate === item.dateStr;
                      const barColorClass =
                        item.score >= 90
                          ? 'bg-emerald-500 hover:bg-emerald-600'
                          : item.score >= 75
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-red-500 hover:bg-red-600';

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedDate(item.dateStr)}
                          className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer min-w-[32px] sm:min-w-[36px]"
                        >
                          {/* Hover Pointer & Tooltip Card */}
                          <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-slate-950 text-white text-[10px] font-extrabold px-3 py-2 rounded-xl shadow-2xl pointer-events-none whitespace-nowrap z-50 border border-slate-700 flex flex-col items-center gap-0.5 transform -translate-y-1 group-hover:translate-y-0">
                            <span className="text-[#F5C518] flex items-center gap-1 font-mono">
                              📅 {(() => {
                                const parts = item.dateStr.split('-');
                                if (parts.length !== 3) return item.dateStr;
                                const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                return d.toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: '2-digit',
                                  year: 'numeric',
                                });
                              })()}
                            </span>
                            <span className="text-slate-200 text-[9.5px] font-bold">
                              Score: {item.score}/100 • {item.delayed > 0 ? `🔴 ${item.delayed} Delays ` : ''}{item.missed > 0 ? `⚠️ ${item.missed} Missed ` : ''}{item.delayed === 0 && item.missed === 0 ? '🟢 Perfect Execution' : `(-${(item.delayed * 5) + (item.missed * 5)} pts)`}
                            </span>
                            <div className="w-2 h-2 bg-slate-950 rotate-45 border-r border-b border-slate-700 -mb-3.5 mt-0.5" />
                          </div>

                          {/* Score & Penalty Badge */}
                          <div className="flex flex-col items-center mb-1 gap-0.5">
                            <span className="text-[9px] font-black text-slate-700 bg-white px-1.5 py-0.5 rounded shadow-2xs border border-slate-200">
                              {item.score}
                            </span>
                            {(item.delayed > 0 || item.missed > 0) && (
                              <span className="text-[8px] font-black text-red-600 bg-red-100 px-1 rounded-sm">
                                -{(item.delayed * 5) + (item.missed * 5)}
                              </span>
                            )}
                          </div>

                          {/* Bar element */}
                          <div
                            className={`w-full max-w-[34px] rounded-t-xl transition-all duration-300 shadow-md ${barColorClass} ${
                              isSelectedDate ? 'ring-2 ring-slate-950 scale-105 shadow-lg' : ''
                            }`}
                            style={{ height: `${scoreHeightPct}%` }}
                          />

                          {/* Date label */}
                          <span className={`text-[9px] font-extrabold mt-2 truncate max-w-full ${isSelectedDate ? 'text-slate-950 underline font-black' : 'text-gray-600'}`}>
                            {item.dateStr.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[11px] font-bold text-gray-600 pt-1">
                    <span className="flex items-center gap-1.5">🟢 90–100 (Excellent)</span>
                    <span className="flex items-center gap-1.5">🟡 75–89 (Minor Delays)</span>
                    <span className="flex items-center gap-1.5">🔴 &lt; 75 (Mistakes / Penalties)</span>
                    <span className="text-[10px] text-gray-400 italic">💡 Hover over any bar for full date & click to pinpoint</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Pinpoint Single Day Inspection Panel */}
          {selectedDate && (() => {
            const dayLogs = (analytics?.logs || []).filter(
              (l) => l.employeeName?.trim().toLowerCase() === selectedStaffName.trim().toLowerCase() && l.dateStr === selectedDate
            );
            const dayDelays = dayLogs.filter((l) => l.status === 'delayed' || Boolean(l.delayReason?.trim()));
            const dayOnTime = dayLogs.filter((l) => l.status === 'completed' && !l.delayReason?.trim());
            const dayMissed = metrics.missedTasks.filter((m) => m.dateStr === selectedDate);
            const totalDayPenalty = (dayDelays.length * 5) + (dayMissed.length * 5);
            const dayScore = Math.max(0, 100 - totalDayPenalty);

            return (
              <div className="bg-amber-500/10 border-2 border-amber-500 rounded-2xl p-5 flex flex-col gap-4 shadow-md animate-in fade-in">
                <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
                  <div className="flex items-center gap-2 text-amber-950 font-black text-sm uppercase tracking-wider">
                    <Calendar className="w-4.5 h-4.5 text-amber-600" />
                    <span>Pinpoint Day Inspection: {selectedDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black px-3 py-1 rounded-xl border shadow-sm ${
                      dayScore >= 90
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : dayScore >= 75
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-red-600 text-white border-red-700'
                    }`}>
                      Day Score: {dayScore} / 100 pts
                    </span>
                    <button
                      onClick={() => setSelectedDate('')}
                      className="text-[10px] font-bold text-gray-600 hover:text-gray-900 bg-white px-2.5 py-1 rounded-lg border shadow-2xs"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center font-bold">
                  <div className="bg-white p-3 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-gray-500 block uppercase">On-Time</span>
                    <span className="text-base font-black text-emerald-700">{dayOnTime.length}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-gray-500 block uppercase">Delays Logged</span>
                    <span className="text-base font-black text-red-600">{dayDelays.length} (-{dayDelays.length * 5})</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-gray-500 block uppercase">Missed Tasks</span>
                    <span className="text-base font-black text-amber-700">{dayMissed.length} (-{dayMissed.length * 5})</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-gray-500 block uppercase">Total Penalty</span>
                    <span className="text-base font-black text-red-700">-{totalDayPenalty} pts</span>
                  </div>
                </div>

                {/* Batch-by-Batch Detailed Inspection for Selected Date */}
                <div className="flex flex-col gap-3.5 mt-1">
                  {(() => {
                    const allTasks = analytics?.tasks || [];
                    const groupedBatches = allTasks.reduce((acc, t) => {
                      const b = t.batchName || 'General SOP';
                      if (!acc[b]) acc[b] = [];
                      acc[b].push(t);
                      return acc;
                    }, {} as Record<string, PlainSopTask[]>);

                    const isToday = selectedDate === getLocalDateStr(new Date());

                    if (allTasks.length === 0) {
                      return (
                        <p className="text-xs italic text-gray-500 bg-white p-3 rounded-xl border">
                          No tasks recorded or defined for {selectedStaffName} on this date.
                        </p>
                      );
                    }

                    return Object.entries(groupedBatches).map(([batchName, bTasks]) => {
                      const batchWindow = bTasks[0]?.batchWindow || '';

                      // Completed logs for this batch on selectedDate
                      const completedLogsInBatch = dayLogs.filter((l) =>
                        bTasks.some(
                          (t) => (l.taskId && l.taskId === t._id) || l.taskName.trim().toLowerCase() === t.taskName.trim().toLowerCase()
                        )
                      );

                      const batchCompletedCount = completedLogsInBatch.length;
                      const progressPct = bTasks.length > 0 ? Math.round((batchCompletedCount / bTasks.length) * 100) : 0;

                      return (
                        <div key={batchName} className="bg-white border border-amber-200/80 rounded-2xl p-4 flex flex-col gap-3 shadow-2xs">
                          {/* Batch Header Bar */}
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-slate-900 uppercase tracking-wider">{batchName}</span>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                {batchWindow}
                              </span>
                            </div>

                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                              batchCompletedCount === bTasks.length
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : batchCompletedCount > 0
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {batchCompletedCount} / {bTasks.length} Done ({progressPct}%)
                            </span>
                          </div>

                          {/* Batch Tasks List */}
                          <div className="flex flex-col gap-2">
                            {bTasks.map((t) => {
                              const log = dayLogs.find(
                                (l) => (l.taskId && l.taskId === t._id) || l.taskName.trim().toLowerCase() === t.taskName.trim().toLowerCase()
                              );

                              const isDone = Boolean(log);
                              const isDel = log && (log.status === 'delayed' || Boolean(log.delayReason?.trim()));
                              const timeFormatted = log ? formatExecutionTime(log.completedAtIso, log.createdAt) : '';
                              const isAssigned = t.assignedStaffName?.trim().toLowerCase() === selectedStaffName.trim().toLowerCase();

                              return (
                                <div
                                  key={t._id}
                                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
                                    isDone
                                      ? isDel
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-emerald-50/80 border-emerald-200'
                                      : !isToday && isAssigned
                                      ? 'bg-amber-50/80 border-amber-200'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                      <span>{t.taskName}</span>
                                      {isAssigned && (
                                        <span className="text-[9px] font-extrabold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                                          Assigned
                                        </span>
                                      )}
                                    </span>
                                    {isDel && log?.delayReason && (
                                      <p className="text-[11px] text-red-800 italic bg-white p-2 rounded border border-red-200 mt-1">
                                        Delay Reason: "{log.delayReason}"
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {isDone ? (
                                      isDel ? (
                                        <span className="bg-red-100 text-red-700 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-red-200 font-mono">
                                          🔴 Delayed ({timeFormatted})
                                        </span>
                                      ) : (
                                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                                          🟢 Completed ({timeFormatted})
                                        </span>
                                      )
                                    ) : !isToday && isAssigned ? (
                                      <span className="bg-amber-100 text-amber-900 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-200">
                                        ⚠️ Missed (-5 pts)
                                      </span>
                                    ) : (
                                      <span className="bg-slate-100 text-slate-500 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md border border-slate-200">
                                        ⏳ Pending Today
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default function InDepthAnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">Loading Analytics Dashboard...</div>}>
      <InDepthAnalyticsContent />
    </Suspense>
  );
}
