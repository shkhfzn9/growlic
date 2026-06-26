'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  RefreshCw,
  Store,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Percent,
  ChevronRight
} from 'lucide-react';
import { StatCard, PageHeader } from '@/components/ui';

interface AovTrendPoint {
  date: string;
  aov: number;
}

interface OverviewData {
  totalRestaurants: number;
  activeRestaurants: number;
  inactiveRestaurants: number;
  ordersCount: number;
  ordersCountChange: number;
  gmv: number;
  gmvChange: number;
  aov: number;
  aovChange: number;
  aovTrend: AovTrendPoint[];
}

interface AnomalyItem {
  restaurantId: string;
  restaurantName: string;
  description: string;
}

export default function SuperAdminDashboardPage() {
  const [datePreset, setDatePreset] = useState<'7d' | '30d' | 'custom'>('30d');
  
  const getInitialDates = () => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 30);
    return {
      todayStr: today.toISOString().split('T')[0],
      startStr: start.toISOString().split('T')[0],
    };
  };

  const { todayStr, startStr } = getInitialDates();
  const [startDate, setStartDate] = useState(startStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; date: string; value: number } | null>(null);

  const fetchOverviewData = async (showLoading = false, start = startDate, end = endDate) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/overview?startDate=${start}&endDate=${end}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load platform overview');
      }
      setOverview(data.overview);
      setAnomalies(data.anomalies);
      setError('');
    } catch (err) {
      console.error('Error loading platform metrics:', err);
      const message = err instanceof Error ? err.message : 'Failed to load platform metrics';
      setError(message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData(true, startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const handlePresetSelect = (preset: '7d' | '30d') => {
    setDatePreset(preset);
    const today = new Date();
    const start = new Date();
    if (preset === '7d') {
      start.setDate(today.getDate() - 7);
    } else {
      start.setDate(today.getDate() - 30);
    }
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  // Helper to format trend numbers
  const formatChange = (val: number) => {
    const num = Math.round(Math.abs(val));
    const isUp = val >= 0;
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${isUp ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {num}%
      </span>
    );
  };

  // SVG Chart rendering calculations
  const renderTrendChart = () => {
    if (!overview?.aovTrend || overview.aovTrend.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-sm text-[#6B7280]">
          No data points available for AOV trend.
        </div>
      );
    }

    const trend = overview.aovTrend;
    const aovValues = trend.map(t => t.aov);
    const maxAov = Math.max(...aovValues, 100);
    const minAov = Math.max(0, Math.min(...aovValues, maxAov) - 50);
    const range = maxAov - minAov || 1;

    const width = 1000;
    const height = 180;
    const padding = 20;

    const points = trend.map((point, idx) => {
      const x = padding + (idx / (trend.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - ((point.aov - minAov) / range) * (height - padding * 2);
      return { x, y, date: point.date, value: point.aov };
    });

    const dPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const dArea = points.length > 0
      ? `${dPath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : '';

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#E2E6EA" strokeDasharray="4 4" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#E2E6EA" strokeDasharray="4 4" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E2E6EA" />

          {/* Area under line */}
          {dArea && <path d={dArea} fill="url(#chartGradient)" />}

          {/* Core line */}
          <path d={dPath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interaction dots */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="4"
              className="fill-white stroke-[#2563EB] stroke-[2.5px] cursor-pointer hover:r-6 transition-all"
              onMouseEnter={() => {
                setHoveredPoint({
                  x: p.x,
                  y: p.y,
                  date: p.date,
                  value: p.value
                });
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
        </svg>

        {/* Floating tooltip */}
        {hoveredPoint && (
          <div
            className="absolute bg-[#111827] text-white text-[11px] p-2 rounded-md shadow-lg pointer-events-none z-10 transition-opacity"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100 - 25}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-semibold text-center">₹{hoveredPoint.value}</div>
            <div className="text-[9px] text-white/50">{hoveredPoint.date}</div>
          </div>
        )}

        <div className="flex justify-between mt-2 text-[10px] text-[#6B7280] font-medium px-2">
          <span>{trend[0]?.date}</span>
          <span>{trend[trend.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  if (loading && !overview) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 bg-[#E2E6EA] rounded animate-pulse" />
        <div className="h-20 bg-white border border-[#E2E6EA] rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCard key={i} label="" value="" loading />
          ))}
        </div>
        <div className="h-64 bg-white border border-[#E2E6EA] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#DC2626] mb-2">Error Loading Overview</h3>
        <p className="text-sm text-[#DC2626]/80 mb-4">{error}</p>
        <button
          onClick={() => fetchOverviewData(true)}
          className="px-4 py-2 text-sm font-medium bg-[#DC2626] text-white rounded-lg hover:bg-[#DC2626]/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header with date presets */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <PageHeader title="Platform Overview" subtitle="Aggregate KPIs and metrics across all Tokyo Momos outlets" />
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#E2E6EA] overflow-hidden bg-white">
            <button
              onClick={() => handlePresetSelect('7d')}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                datePreset === '7d' ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => handlePresetSelect('30d')}
              className={`px-3 py-2 text-xs font-medium border-l border-[#E2E6EA] transition-colors ${
                datePreset === '30d' ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'
              }`}
            >
              30 Days
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E2E6EA] rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
              max={endDate}
              className="text-xs text-[#111827] font-medium outline-none bg-transparent"
            />
            <span className="text-[#6B7280] text-xs">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
              min={startDate}
              max={todayStr}
              className="text-xs text-[#111827] font-medium outline-none bg-transparent"
            />
          </div>

          <button
            onClick={() => fetchOverviewData(true)}
            className="p-2 bg-white border border-[#E2E6EA] rounded-lg text-[#6B7280] hover:bg-[#F4F6F9] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Needs Attention Strip */}
      <div className="bg-white border border-[#E2E6EA] rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 border-b border-[#E2E6EA] pb-2">
          <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          <h2 className="text-[14px] font-bold text-[#111827]">Needs Attention</h2>
        </div>

        {anomalies.length === 0 ? (
          <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#16A34A]/20 text-[#16A34A] rounded-lg px-4 py-3 text-xs font-semibold">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            All restaurants operating normally
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
            {anomalies.map((anomaly, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg p-3 text-xs"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                  <span className="font-bold text-[#111827]">{anomaly.restaurantName}</span>
                  <span className="text-[#DC2626] font-medium">{anomaly.description}</span>
                </div>
                <Link
                  href={`/super-admin/restaurants/${anomaly.restaurantId}`}
                  className="inline-flex items-center gap-1 font-semibold text-[#C0181A] hover:underline"
                >
                  View
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Restaurants"
          value={overview?.totalRestaurants || 0}
          subtitle={`${overview?.activeRestaurants || 0} active, ${overview?.inactiveRestaurants || 0} inactive`}
          icon={<Store className="w-4 h-4" />}
        />
        <StatCard
          label="Total Orders"
          value={(overview?.ordersCount || 0).toLocaleString()}
          subtitle={overview ? formatChange(overview.ordersCountChange) : ''}
          icon={<ShoppingCart className="w-4 h-4" />}
        />
        <StatCard
          label="Platform GMV"
          value={`₹${Math.round(overview?.gmv || 0).toLocaleString()}`}
          subtitle={overview ? formatChange(overview.gmvChange) : ''}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Platform AOV"
          value={`₹${Math.round(overview?.aov || 0)}`}
          subtitle={overview ? formatChange(overview.aovChange) : ''}
          icon={<Percent className="w-4 h-4" />}
        />
      </div>

      {/* AOV Trend Chart */}
      <div className="bg-white border border-[#E2E6EA] rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-baseline mb-6">
          <div>
            <h2 className="text-[16px] font-bold text-[#111827]">Average Order Value (AOV) Trend</h2>
            <p className="text-[13px] text-[#6B7280]">Upselling calibration signal across the platform</p>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Scale Nudge</span>
        </div>

        {renderTrendChart()}
      </div>
    </div>
  );
}
