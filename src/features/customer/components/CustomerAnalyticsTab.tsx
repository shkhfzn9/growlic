'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  TrendingUp,
  Percent,
  Calendar,
  Clock,
  PieChart as PieIcon,
  Award,
  Layers,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { getCustomerAnalyticsAction } from '../services/customer.service';
import { ICustomerAnalytics, CustomerSegment } from '../types';
import { getSegmentBadgeStyle } from './CustomerDetailDrawer';

export default function CustomerAnalyticsTab() {
  const [analytics, setAnalytics] = useState<ICustomerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadAnalytics = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      const data = await getCustomerAnalyticsAction(forceRefresh);
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      setError('Failed to calculate customer analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  // Heatmap color generator
  const getHeatmapColor = (pct: number, monthIndex: number) => {
    if (monthIndex === 0) return 'bg-purple-900 text-white font-black';
    if (pct === 0) return 'bg-gray-50 text-gray-400 font-normal';
    if (pct < 15) return 'bg-emerald-50 text-emerald-800 font-medium';
    if (pct < 30) return 'bg-emerald-100 text-emerald-900 font-semibold';
    if (pct < 50) return 'bg-emerald-200 text-emerald-950 font-bold';
    if (pct < 70) return 'bg-emerald-300 text-emerald-950 font-extrabold';
    return 'bg-emerald-400 text-emerald-950 font-black';
  };

  // Pareto SVG Chart Renderer
  const renderParetoChart = () => {
    if (!analytics?.pareto?.chartDeciles?.length) return null;
    const deciles = analytics.pareto.chartDeciles;

    const width = 500;
    const height = 180;
    const padding = 35;

    const maxRev = Math.max(...deciles.map((d) => d.revenue), 100);

    // Points for cumulative line
    const linePoints = deciles.map((d, i) => {
      const x = padding + (i / Math.max(1, deciles.length - 1)) * (width - 2 * padding);
      const y = height - padding - (d.cumulativePercentage / 100) * (height - 2 * padding);
      return { x, y, pct: d.cumulativePercentage };
    });

    const dPath = linePoints.reduce(
      (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
      ''
    );

    return (
      <div className="w-full overflow-hidden flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] text-gray-500 font-bold px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-purple-500 rounded-xs" />
            Revenue per Decile (₹)
          </span>
          <span className="flex items-center gap-1.5 text-amber-700">
            <span className="w-2.5 h-0.5 bg-amber-500" />
            Cumulative % Line
          </span>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          {/* Horizontal Grid lines */}
          {[0, 25, 50, 75, 100].map((pct, idx) => {
            const y = height - padding - (pct / 100) * (height - 2 * padding);
            return (
              <g key={idx}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#E5E7EB" strokeDasharray="3 3" />
                <text x={padding - 6} y={y + 3} textAnchor="end" className="text-[9px] fill-gray-400 font-mono">
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Decile Revenue Bars */}
          {deciles.map((d, i) => {
            const barW = (width - 2 * padding) / deciles.length - 8;
            const barX = padding + i * ((width - 2 * padding) / deciles.length) + 4;
            const barH = (d.revenue / maxRev) * (height - 2 * padding);
            const barY = height - padding - barH;

            return (
              <g key={i} className="group cursor-pointer">
                <rect
                  x={barX}
                  y={barY}
                  width={barW}
                  height={barH}
                  className="fill-purple-400 hover:fill-purple-600 transition-colors rounded-t-xs"
                />
                <text
                  x={barX + barW / 2}
                  y={height - padding + 12}
                  textAnchor="middle"
                  className="text-[8px] fill-gray-500 font-bold"
                >
                  {i === 0 ? 'Top 10%' : `${(i + 1) * 10}%`}
                </text>
              </g>
            );
          })}

          {/* Pareto 80% guideline */}
          <line
            x1={padding}
            y1={height - padding - 0.8 * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - 0.8 * (height - 2 * padding)}
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Cumulative Percentage Line */}
          {dPath && (
            <path
              d={dPath}
              fill="none"
              stroke="#D97706"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Line dots */}
          {linePoints.map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.y} r="3" className="fill-white stroke-amber-600 stroke-2" />
          ))}
        </svg>
      </div>
    );
  };

  // Donut Chart Renderer for Segment Distribution
  const renderDonutChart = () => {
    if (!analytics?.kpis?.segmentDistribution) return null;
    const distribution = analytics.kpis.segmentDistribution;

    const size = 160;
    const strokeWidth = 26;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let accumulatedPct = 0;

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
        <div className="relative w-40 h-40 shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#F3F4F6"
              strokeWidth={strokeWidth}
            />
            {distribution.map((item, idx) => {
              if (item.percentage === 0) return null;
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPct / 100) * circumference);
              accumulatedPct += item.percentage;

              return (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all hover:opacity-80"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase font-bold text-gray-500">Total</span>
            <span className="text-xl font-black text-gray-900">
              {distribution.reduce((acc, curr) => acc + curr.count, 0)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 min-w-[160px]">
          {distribution.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="font-bold text-gray-800">{item.segment.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="font-extrabold text-gray-900">{item.count}</span>
                <span className="text-[10px] text-gray-500">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3 min-h-[400px]">
        <Loader2 className="w-8 h-8 text-purple-700 animate-spin" />
        <p className="text-sm font-semibold text-gray-600">
          Calculating monthly cohort retention & Pareto revenue distribution...
        </p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-8 text-center flex flex-col items-center gap-3">
        <p className="text-sm text-red-600 font-bold">{error || 'Failed to load analytics'}</p>
        <button
          onClick={() => loadAnalytics()}
          className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold hover:bg-purple-800 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const { kpis, pareto, cohortAnalysis } = analytics;

  return (
    <div className="flex flex-col gap-6">
      {/* Analytics Refresh & Metadata Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E2E6EA] rounded-2xl px-5 py-3.5 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Retention & Revenue Intelligence</span>
          </h3>
          <p className="text-xs text-gray-500">Live cohorts and Pareto concentration for this restaurant</p>
        </div>
        <button
          onClick={() => loadAnalytics(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Analytics'}</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PART 4 - C: SUMMARY KPIS                                       */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: New vs Repeat */}
        <div className="bg-white border border-[#E2E6EA] rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-black uppercase tracking-wider">Active This Month</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {kpis.newCustomersThisMonth + kpis.repeatCustomersThisMonth}
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold mt-1">
              <span className="text-emerald-700">+{kpis.newCustomersThisMonth} New</span>
              <span className="text-gray-400">•</span>
              <span className="text-purple-700">{kpis.repeatCustomersThisMonth} Repeat</span>
            </div>
          </div>
          <span className="text-[10px] text-gray-400">Unique ordering clients in current month</span>
        </div>

        {/* KPI 2: Repeat Rate */}
        <div className="bg-white border border-[#E2E6EA] rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-black uppercase tracking-wider">Repeat Rate</span>
            <Percent className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-purple-900">{kpis.repeatRatePercent}%</div>
            <span className="text-xs text-gray-600 font-semibold mt-1 block">Clients with 2+ completed visits</span>
          </div>
          <span className="text-[10px] text-gray-400">Total customer loyalty benchmark</span>
        </div>

        {/* KPI 3: 30-Day Retention */}
        <div className="bg-white border border-[#E2E6EA] rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-black uppercase tracking-wider">30-Day Retention</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">{kpis.retention30DayPercent}%</div>
            <span className="text-xs text-gray-600 font-semibold mt-1 block">Active in past 30 days</span>
          </div>
          <span className="text-[10px] text-gray-400">Short-term re-engagement measure</span>
        </div>

        {/* KPI 4: Avg Days Between Visits */}
        <div className="bg-white border border-[#E2E6EA] rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-black uppercase tracking-wider">Visit Cadence</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{kpis.overallAvgIntervalDays} days</div>
            <span className="text-xs text-gray-600 font-semibold mt-1 block">Average interval between visits</span>
          </div>
          <span className="text-[10px] text-gray-400">Calculated across returning customers</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PART 4 - A: COHORT RETENTION HEATMAP                           */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-[#E2E6EA] rounded-3xl p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-700" />
              <h3 className="text-base font-black text-gray-900">Cohort Retention Analysis</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Percentage of newly acquired customers who returned to order in subsequent months.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500">
            <span>Color scale:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">Low</span>
            <span className="px-2 py-0.5 rounded bg-emerald-300 text-emerald-950 font-bold">Medium</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500 text-white font-bold">High</span>
          </div>
        </div>

        {!cohortAnalysis.hasData ? (
          <div className="p-8 text-center text-xs text-gray-400 italic">
            Insufficient order history to construct monthly cohorts. Place orders across consecutive months to view retention rates.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[650px] border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600 font-extrabold uppercase text-[10px]">
                  <th className="py-2.5 px-3 text-left">Cohort Month</th>
                  <th className="py-2.5 px-3 text-center">Acquired</th>
                  {[0, 1, 2, 3, 4, 5].map((m) => (
                    <th key={m} className="py-2.5 px-3 text-center">
                      Month {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {cohortAnalysis.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-sans font-extrabold text-gray-900">{row.cohortMonth}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-gray-700 font-sans">
                      {row.cohortSize} users
                    </td>
                    {[0, 1, 2, 3, 4, 5].map((monthIdx) => {
                      const data = row.retentionByMonth.find((r) => r.monthIndex === monthIdx);
                      if (!data) {
                        return (
                          <td key={monthIdx} className="py-2 px-3 text-center text-gray-300">
                            -
                          </td>
                        );
                      }
                      const colorClass = getHeatmapColor(data.percentage, monthIdx);
                      return (
                        <td key={monthIdx} className="p-1">
                          <div
                            className={`py-2 px-2 rounded-lg text-center transition-all ${colorClass}`}
                            title={`${data.activeCount} of ${row.cohortSize} customers returned`}
                          >
                            {data.percentage}%
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PART 4 - B: REVENUE CONCENTRATION (PARETO 80/20)               */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pareto Dual-Axis Chart & Highlight */}
        <div className="bg-white border border-[#E2E6EA] rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-gray-900">Pareto Revenue Concentration</h3>
              </div>
              <span className="text-[11px] font-black text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full">
                80/20 Rule
              </span>
            </div>

            <div className="bg-purple-50/70 border border-purple-200/60 rounded-2xl p-4 mt-4">
              <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">Revenue Impact</h4>
              <p className="text-sm font-extrabold text-purple-950 mt-1">
                Top <span className="text-purple-700 font-black">20%</span> of customers contribute{' '}
                <span className="text-purple-900 text-lg font-black">{pareto.top20PercentShare}%</span> of total revenue!
              </p>
              <p className="text-xs text-purple-800 mt-0.5">
                {pareto.top20CustomersCount} key accounts generated ₹
                {Math.round(pareto.totalRevenue * (pareto.top20PercentShare / 100)).toLocaleString('en-IN')} out of ₹
                {pareto.totalRevenue.toLocaleString('en-IN')}.
              </p>
            </div>

            <div className="mt-4">{renderParetoChart()}</div>
          </div>
        </div>

        {/* Top 20% Customers Table */}
        <div className="bg-white border border-[#E2E6EA] rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-700" />
                <h3 className="text-base font-black text-gray-900">Top Revenue Contributors</h3>
              </div>
              <span className="text-xs font-bold text-gray-500">Top VIPs</span>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 text-left">Customer</th>
                    <th className="py-2.5 text-right">LTV</th>
                    <th className="py-2.5 text-right">Visits</th>
                    <th className="py-2.5 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pareto.topCustomers.map((cust, idx) => {
                    const badge = getSegmentBadgeStyle(cust.segment);
                    return (
                      <tr key={idx} className="hover:bg-purple-50/30">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-purple-50 text-purple-900 font-black text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <span className="font-extrabold text-gray-900 block leading-tight">{cust.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{cust.phone}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-black text-purple-950">₹{cust.totalSpent}</td>
                        <td className="py-2.5 text-right font-bold text-gray-700">{cust.totalOrders}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-emerald-700">
                          {cust.revenueSharePercent}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SEGMENT DISTRIBUTION DONUT                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-[#E2E6EA] rounded-3xl p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-purple-700" />
            <h3 className="text-base font-black text-gray-900">Customer Segment Distribution</h3>
          </div>
          <span className="text-xs text-gray-500 font-semibold">RFM & Behavioral Breakdown</span>
        </div>

        <div className="py-2">{renderDonutChart()}</div>
      </div>
    </div>
  );
}
