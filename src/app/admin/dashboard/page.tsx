'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { getDashboardMetrics, updateOrderStatus } from '@/actions/orders';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Flame,
  AlertTriangle,
  CheckCircle,
  Users,
  DollarSign,
  Percent,
  RefreshCw,
  Info,
  ShoppingCart
} from 'lucide-react';

interface MetricTrend {
  date: string;
  revenue: number;
  orders: number;
  aov: number;
  avgItems: number;
}

interface MetricOrderTable {
  _id: string;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  total: number;
  status: 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  createdAt: string;
  discountApplied: number;
  upsellAccepted: boolean;
  itemsSummary: string;
  tableId?: string;
}

interface RuleStat {
  ruleId: string;
  ruleType: 'pairing' | 'combo';
  description: string;
  triggers: number;
  conversions: number;
  revenue: number;
}

interface TierAchievement {
  tierId: string;
  minSpend: number;
  percentOff: number;
  ordersReached: number;
  percentReached: number;
  avgOrderValueReached: number;
}

interface MenuItemSales {
  itemId: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface CoOccurrence {
  itemA: string;
  itemB: string;
  coOccurrenceCount: number;
  confidence: number;
  matchingManualRule: boolean;
}

interface MenuFrictionItem {
  itemId: string;
  name: string;
  modalOpens: number;
  conversions: number;
  conversionRate: number;
  flagReview: boolean;
}

interface Metrics {
  ordersCount: number;
  revenue: number;
  aov: number;
  itemsPerOrder: number;
  upsellRevenue: number;
  pendingOrders: number;
  customers: number;
  dayHourHeatmap: number[][];
  bestDays: Array<{
    weekday: number;
    name: string;
    totalOrders: number;
    totalRevenue: number;
  }>;
  bestTimeOfDay: Array<{
    period: string;
    label: string;
    orders: number;
    revenue: number;
  }>;
  trends: MetricTrend[];
  ordersTable: MetricOrderTable[];
  upsellPerformance: {
    conversionRateByType: {
      cross_sell: { shown: number; accepted: number; rate: number };
      threshold_discount: { shown: number; accepted: number; rate: number };
      combo_freebie: { shown: number; accepted: number; rate: number };
    };
    attributedRevenue: number;
    topRules: RuleStat[];
    discountTierAchievement: TierAchievement[];
    avgOrderValueNoTier: number;
  };
  menuIntelligence: {
    bestSellersQty: MenuItemSales[];
    bestSellersRev: MenuItemSales[];
    worstSellers: Array<MenuItemSales & { flagReview: boolean }>;
    frequentlyBoughtTogether: CoOccurrence[];
    menuFriction: MenuFrictionItem[];
  };
  customerBehavior: {
    hasPhoneNumbers: boolean;
    newVsRepeat: {
      newCustomers: number;
      repeatCustomers: number;
      newOrdersCount: number;
      repeatOrdersCount: number;
    } | null;
    cartAbandonment: {
      cartsStarted: number;
      ordersCompleted: number;
      abandonmentRate: number;
    } | null;
    avgPartySizeProxy: number;
  };
  operationalSignals: {
    spiceDistribution: {
      mild: number;
      medium: number;
      hot: number;
    };
    allergenFrequency: Record<string, number>;
  };
}

export default function DashboardPage() {
  // Preset dates state
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

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Accordion state
  const [expandedSections, setExpandedSections] = useState({
    revenue: true,
    upsell: true,
    menu: false,
    customer: false,
    operational: false,
  });

  // Client-side order filter/sort state
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSortField, setOrderSortField] = useState<'createdAt' | 'total' | 'discountApplied' | 'upsellAccepted'>('createdAt');
  const [orderSortOrder, setOrderSortOrder] = useState<'asc' | 'desc'>('desc');
  const [orderUpsellFilter, setOrderUpsellFilter] = useState<'all' | 'upsell' | 'no-upsell'>('all');

  const fetchMetrics = async (showLoading = false, start = startDate, end = endDate) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getDashboardMetrics(start, end);
      setMetrics(data as unknown as Metrics);
      setError('');
    } catch (err) {
      console.error('Error loading metrics:', err);
      const message = err instanceof Error ? err.message : 'Failed to load metrics';
      setError(message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Fetch when dates change
  useEffect(() => {
    fetchMetrics(true, startDate, endDate);
  }, [startDate, endDate]);

  // Short-polling interval (resets on date range modifications)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics(false, startDate, endDate);
    }, 10000);
    return () => clearInterval(interval);
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

  const handleStatusTransition = async (orderId: string, currentStatus: MetricOrderTable['status']) => {
    let nextStatus: MetricOrderTable['status'];
    switch (currentStatus) {
      case 'received':
        nextStatus = 'accepted';
        break;
      case 'accepted':
        nextStatus = 'preparing';
        break;
      case 'preparing':
        nextStatus = 'ready';
        break;
      case 'ready':
        nextStatus = 'completed';
        break;
      default:
        return;
    }

    setActionLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      await updateOrderStatus(orderId, nextStatus);
      await fetchMetrics(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update order status';
      alert(message);
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      setActionLoading(prev => ({ ...prev, [orderId]: true }));
      try {
        await updateOrderStatus(orderId, 'cancelled');
        await fetchMetrics(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel order';
        alert(message);
      } finally {
        setActionLoading(prev => ({ ...prev, [orderId]: false }));
      }
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Client-side filtering & sorting of orders table
  const filteredOrders = useMemo(() => {
    if (!metrics?.ordersTable) return [];
    
    let result = [...metrics.ordersTable];

    // Search filter
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      result = result.filter(
        o =>
          o._id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q) ||
          o.itemsSummary.toLowerCase().includes(q)
      );
    }

    // Upsell engine filter
    if (orderUpsellFilter === 'upsell') {
      result = result.filter(o => o.upsellAccepted);
    } else if (orderUpsellFilter === 'no-upsell') {
      result = result.filter(o => !o.upsellAccepted);
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[orderSortField];
      let valB: any = b[orderSortField];

      if (orderSortField === 'createdAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return orderSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return orderSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [metrics?.ordersTable, orderSearch, orderSortField, orderSortOrder, orderUpsellFilter]);

  if (loading && !metrics) {
    return <div className="font-mono-custom text-xs text-center py-12">LOADING DASHBOARD METRICS...</div>;
  }

  if (error) {
    return (
      <div className="border border-black p-4 bg-zinc-50 font-mono-custom text-xs">
        <h3 className="font-bold text-red-600 uppercase mb-2">Error Loading Dashboard</h3>
        <p className="mb-4">{error}</p>
        <button
          onClick={() => fetchMetrics(true)}
          className="border border-black px-3 py-1 font-bold uppercase hover:bg-black hover:text-white"
        >
          [ Retry ]
        </button>
      </div>
    );
  }

  // Find max cell count for heatmap color intensity
  let maxHeatmapCount = 1;
  if (metrics?.dayHourHeatmap) {
    metrics.dayHourHeatmap.forEach(row => {
      row.forEach(val => {
        if (val > maxHeatmapCount) maxHeatmapCount = val;
      });
    });
  }

  // Weekday labels
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="font-mono-custom flex flex-col gap-8 pb-16">
      {/* Title & Date Selector */}
      <div className="border-b border-black pb-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Overview Dashboard</h1>
          <p className="text-[10px] text-zinc-500 uppercase mt-1">Operational back-office analytics system</p>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Preset buttons */}
          <div className="border border-black flex overflow-hidden bg-white text-xs font-bold uppercase">
            <button
              onClick={() => handlePresetSelect('7d')}
              className={`px-3 py-1.5 border-r border-black hover:bg-zinc-100 ${datePreset === '7d' ? 'bg-black text-white hover:bg-black' : ''}`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handlePresetSelect('30d')}
              className={`px-3 py-1.5 hover:bg-zinc-100 ${datePreset === '30d' ? 'bg-black text-white hover:bg-black' : ''}`}
            >
              Last 30 Days
            </button>
          </div>

          {/* Custom Date Pickers */}
          <div className="border border-black bg-white flex items-center px-2 py-1 gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              max={endDate}
              className="outline-none text-[11px] font-bold"
            />
            <span className="text-zinc-400">➔</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              min={startDate}
              max={todayStr}
              className="outline-none text-[11px] font-bold"
            />
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchMetrics(true)}
            className="border border-black p-2 bg-white hover:bg-zinc-100 uppercase text-xs font-bold flex items-center justify-center"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ABOVE THE FOLD CONTENT */}
      <div className="flex flex-col gap-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-black p-5 bg-white shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Total Revenue</span>
              <span className="text-3xl font-black tracking-tight">₹{Math.round(metrics?.revenue || 0).toLocaleString()}</span>
            </div>
            <div className="text-[9px] uppercase text-zinc-400 mt-2 font-semibold">
              Selected period volume
            </div>
          </div>

          <div className="border border-black p-5 bg-white shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Total Orders</span>
              <span className="text-3xl font-black tracking-tight">{metrics?.ordersCount}</span>
            </div>
            <div className="text-[9px] uppercase text-zinc-400 mt-2 font-semibold">
              Total checkout count
            </div>
          </div>

          <div className="border border-black p-5 bg-white shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Average Order Value (AOV)</span>
              <span className="text-3xl font-black tracking-tight">₹{Math.round(metrics?.aov || 0)}</span>
            </div>
            <div className="text-[9px] uppercase text-zinc-400 mt-2 font-semibold">
              Key spend indicator per table
            </div>
          </div>

          <div className="border border-black p-5 bg-white shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Upsell Revenue</span>
              <span className="text-3xl font-black tracking-tight">₹{Math.round(metrics?.upsellRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[9px] uppercase text-zinc-400 font-semibold">Attributed to engine nudges</span>
              {metrics && metrics.revenue > 0 && (
                <span className="text-[9px] font-bold bg-zinc-100 border border-zinc-300 px-1 py-0.5">
                  {Math.round((metrics.upsellRevenue / metrics.revenue) * 100)}% of total
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section A: Time Intelligence Day x Hour order heatmap */}
        <div className="border border-black p-5 bg-white shadow-sm">
          <div className="flex justify-between items-baseline mb-2">
            <h2 className="text-sm font-black uppercase tracking-tight">A. Staffing Heatmap & Time Intelligence</h2>
            <span className="text-[10px] font-bold text-zinc-400 uppercase">TIME INTEL</span>
          </div>
          <p className="text-[11px] text-zinc-500 uppercase mb-4">Use this to plan staff shifts and prep timing.</p>

          {metrics?.dayHourHeatmap ? (
            <div className="flex flex-col gap-6">
              {/* Heatmap Grid */}
              <div className="overflow-x-auto">
                <div className="min-w-[700px] flex flex-col gap-1">
                  {/* Hours Header Row */}
                  <div className="flex gap-1 items-center mb-1 text-[9px] text-zinc-500 font-bold text-center">
                    <div className="w-12 text-left uppercase text-[8px] text-zinc-400">Day/Hr</div>
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div key={hour} className="flex-1 min-w-[20px]">
                        {hour === 0 ? '12a' : hour === 12 ? '12p' : hour > 12 ? `${hour-12}p` : `${hour}a`}
                      </div>
                    ))}
                  </div>

                  {/* Heatmap Rows */}
                  {metrics.dayHourHeatmap.map((row, dIdx) => (
                    <div key={dIdx} className="flex gap-1 items-center">
                      {/* Day Label */}
                      <div className="w-12 text-xs font-bold text-zinc-600 uppercase">{weekdayNames[dIdx]}</div>
                      {row.map((count, hIdx) => {
                        // Intensity calculations
                        let intensityClass = 'bg-zinc-100 hover:bg-zinc-200 text-zinc-400';
                        if (count > 0) {
                          const ratio = count / maxHeatmapCount;
                          if (ratio <= 0.25) intensityClass = 'bg-zinc-300 hover:bg-zinc-400 text-black';
                          else if (ratio <= 0.5) intensityClass = 'bg-zinc-500 hover:bg-zinc-600 text-white';
                          else if (ratio <= 0.75) intensityClass = 'bg-zinc-700 hover:bg-zinc-800 text-white';
                          else intensityClass = 'bg-zinc-950 hover:bg-black text-white font-extrabold';
                        }
                        return (
                          <div
                            key={hIdx}
                            className={`flex-1 min-w-[20px] h-6 flex items-center justify-center text-[10px] cursor-pointer border border-zinc-250 transition-colors ${intensityClass}`}
                            title={`${weekdayNames[dIdx]} ${hIdx}:00 - ${count} orders`}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap Legend */}
              <div className="flex items-center gap-4 text-[9px] font-bold uppercase text-zinc-500 border-t border-zinc-100 pt-3">
                <span>Legend (Order count ratio):</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-zinc-100 border border-zinc-300"></div>
                  <span>0</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-zinc-300 border border-zinc-300"></div>
                  <span>1-25% Peak</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-zinc-500"></div>
                  <span>26-50% Peak</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-zinc-700"></div>
                  <span>51-75% Peak</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-zinc-950"></div>
                  <span>76-100% Peak</span>
                </div>
              </div>

              {/* Ranked Breakdown Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Best Days Table */}
                <div className="border border-black p-4 bg-zinc-50">
                  <h3 className="text-xs font-bold uppercase mb-2 border-b border-black pb-1.5 flex justify-between">
                    <span>Ranked Weekdays</span>
                    <span className="text-[9px] text-zinc-500 font-semibold">By Revenue</span>
                  </h3>
                  {metrics.bestDays.length === 0 ? (
                    <div className="text-[10px] text-zinc-400 py-3 uppercase">No weekday data available</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {metrics.bestDays.map((day, idx) => (
                        <div key={day.weekday} className="flex justify-between items-center text-xs">
                          <span className="font-bold">{idx + 1}. {day.name}</span>
                          <span className="font-semibold text-zinc-600">
                            {day.totalOrders} orders (₹{Math.round(day.totalRevenue).toLocaleString()})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Best Periods Table */}
                <div className="border border-black p-4 bg-zinc-50">
                  <h3 className="text-xs font-bold uppercase mb-2 border-b border-black pb-1.5 flex justify-between">
                    <span>Ranked Meal Periods</span>
                    <span className="text-[9px] text-zinc-500 font-semibold">By Order Volume</span>
                  </h3>
                  {metrics.bestTimeOfDay.length === 0 ? (
                    <div className="text-[10px] text-zinc-400 py-3 uppercase">No period data available</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {metrics.bestTimeOfDay.map((p, idx) => (
                        <div key={p.period} className="flex justify-between items-center text-xs">
                          <span className="font-bold">{idx + 1}. {p.label}</span>
                          <span className="font-semibold text-zinc-600">
                            {p.orders} orders (₹{Math.round(p.revenue).toLocaleString()})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-black p-6 text-center text-xs uppercase">
              No Time Intelligence data matches selection.
            </div>
          )}
        </div>
      </div>

      {/* COLLAPSIBLE ACCORDION CARDS BELOW THE FOLD */}
      <div className="flex flex-col gap-6">

        {/* B. Revenue & Order Fundamentals */}
        <div className="border border-black bg-white shadow-sm">
          <button
            onClick={() => toggleSection('revenue')}
            className="w-full p-5 flex justify-between items-start text-left hover:bg-zinc-50 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black uppercase tracking-tight">B. Revenue & Order Fundamentals</h2>
                <span className="text-[9px] font-bold bg-black text-white px-1.5 py-0.5 border border-black">TRENDS & LIST</span>
              </div>
              <p className="text-[11px] text-zinc-500 uppercase mt-1">Revenue and order count tell you volume. AOV tells you whether upselling is working.</p>
            </div>
            {expandedSections.revenue ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {expandedSections.revenue && (
            <div className="p-5 border-t border-black bg-zinc-50/50 flex flex-col gap-8">
              {/* Daily Trend Charts Row */}
              {metrics?.trends && metrics.trends.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Revenue Chart */}
                  <div className="border border-black p-4 bg-white">
                    <h3 className="text-xs font-bold uppercase mb-4 flex justify-between">
                      <span>Daily Revenue Trend</span>
                      <span className="text-[9px] text-zinc-400">Total range values</span>
                    </h3>
                    {(() => {
                      const maxRevenue = Math.max(...metrics.trends.map(t => t.revenue), 1);
                      return (
                        <div className="h-32 flex items-end gap-1 border-b border-l border-black p-1 bg-zinc-50 relative">
                          {metrics.trends.map((t) => {
                            const heightPercent = `${(t.revenue / maxRevenue) * 100}%`;
                            return (
                              <div
                                key={t.date}
                                className="flex-1 bg-black group relative cursor-pointer min-h-[2px]"
                                style={{ height: heightPercent }}
                              >
                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-black text-white text-[9px] p-1 font-mono uppercase whitespace-nowrap z-10 border border-white">
                                  {t.date}: ₹{Math.round(t.revenue)} ({t.orders} orders)
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    <div className="flex justify-between mt-2 text-[9px] text-zinc-500 uppercase font-bold">
                      <span>{metrics.trends[0]?.date}</span>
                      <span>{metrics.trends[metrics.trends.length - 1]?.date}</span>
                    </div>
                  </div>

                  {/* Daily AOV & Items Trend Chart */}
                  <div className="border border-black p-4 bg-white">
                    <h3 className="text-xs font-bold uppercase mb-4 flex justify-between">
                      <span>Daily AOV &amp; Avg Items per Order</span>
                      <span className="text-[9px] text-zinc-400">Upsell tracking proxy</span>
                    </h3>
                    {(() => {
                      const maxAov = Math.max(...metrics.trends.map(t => t.aov), 1);
                      return (
                        <div className="h-32 flex items-end gap-1 border-b border-l border-black p-1 bg-zinc-50 relative">
                          {metrics.trends.map((t) => {
                            const heightPercent = `${(t.aov / maxAov) * 100}%`;
                            return (
                              <div
                                key={t.date}
                                className="flex-1 bg-zinc-600 hover:bg-black group relative cursor-pointer min-h-[2px]"
                                style={{ height: heightPercent }}
                              >
                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-black text-white text-[9px] p-1 font-mono uppercase whitespace-nowrap z-10 border border-white">
                                  {t.date}: AOV ₹{Math.round(t.aov)} | Avg Items: {t.avgItems.toFixed(1)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    <div className="flex justify-between mt-2 text-[9px] text-zinc-500 uppercase font-bold">
                      <span>{metrics.trends[0]?.date}</span>
                      <span>{metrics.trends[metrics.trends.length - 1]?.date}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-black p-6 text-center text-xs uppercase text-zinc-500 bg-white">
                  No trend data available for selected range.
                </div>
              )}

              {/* Interactive Orders List Table */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                  <h3 className="text-sm font-bold uppercase tracking-tight">Order Log</h3>

                  {/* Filter and Sort controls */}
                  <div className="flex flex-wrap items-center gap-3 text-xs w-full lg:w-auto">
                    {/* Search */}
                    <input
                      type="text"
                      placeholder="SEARCH ORDER / CUST..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="border border-black px-2 py-1 outline-none text-[11px] font-bold w-full sm:w-48 bg-white uppercase placeholder-zinc-300"
                    />

                    {/* Filter Nudge */}
                    <select
                      value={orderUpsellFilter}
                      onChange={(e) => setOrderUpsellFilter(e.target.value as any)}
                      className="border border-black px-2 py-1 outline-none font-bold bg-white text-[11px] uppercase cursor-pointer"
                    >
                      <option value="all">All Orders</option>
                      <option value="upsell">Only Accepted Upsells</option>
                      <option value="no-upsell">No Upsells</option>
                    </select>

                    {/* Sort Field */}
                    <select
                      value={orderSortField}
                      onChange={(e) => setOrderSortField(e.target.value as any)}
                      className="border border-black px-2 py-1 outline-none font-bold bg-white text-[11px] uppercase cursor-pointer"
                    >
                      <option value="createdAt">Sort: Order Date</option>
                      <option value="total">Sort: Total Revenue</option>
                      <option value="discountApplied">Sort: Discount Applied</option>
                    </select>

                    {/* Sort Order */}
                    <button
                      onClick={() => setOrderSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="border border-black px-2 py-1 bg-white hover:bg-zinc-100 font-bold text-[11px] uppercase"
                    >
                      {orderSortOrder === 'asc' ? '[ ASC ]' : '[ DESC ]'}
                    </button>
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="border border-dashed border-black p-8 text-center text-xs uppercase bg-white">
                    No matching orders found.
                  </div>
                ) : (
                  <div className="border border-black overflow-x-auto bg-white shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[750px]">
                      <thead>
                        <tr className="border-b border-black bg-zinc-50 font-bold text-xs uppercase">
                          <th className="p-3 border-r border-black">Time / Date</th>
                          <th className="p-3 border-r border-black">Order ID</th>
                          <th className="p-3 border-r border-black">Table</th>
                          <th className="p-3 border-r border-black">Customer (Phone)</th>
                          <th className="p-3 border-r border-black">Items Ordered</th>
                          <th className="p-3 border-r border-black text-right">Subtotal</th>
                          <th className="p-3 border-r border-black text-right">Discount</th>
                          <th className="p-3 border-r border-black text-right">Total</th>
                          <th className="p-3 border-r border-black">Nudge?</th>
                          <th className="p-3 border-r border-black">Status</th>
                          <th className="p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black text-xs uppercase">
                        {filteredOrders.map((order) => {
                          const displayId = order._id.substring(order._id.length - 6).toUpperCase();
                          const oDate = new Date(order.createdAt);
                          const dateFormatted = oDate.toLocaleDateString([], { month: 'short', day: '2-digit' });
                          const timeFormatted = oDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          const isActionLoading = actionLoading[order._id];

                          return (
                            <tr key={order._id} className="hover:bg-zinc-50">
                              <td className="p-3 border-r border-black text-[10px] text-zinc-500 whitespace-nowrap">
                                {dateFormatted} {timeFormatted}
                              </td>
                              <td className="p-3 border-r border-black font-bold">
                                <Link href={`/admin/orders?highlight=${order._id}`} className="underline">
                                  #{displayId}
                                </Link>
                              </td>
                              <td className="p-3 border-r border-black text-center font-bold text-[11px]">
                                {order.tableId ? order.tableId : '—'}
                              </td>
                              <td className="p-3 border-r border-black">
                                <span className="font-bold">{order.customerName}</span>
                                <span className="text-[10px] text-zinc-400 block">{order.customerPhone || 'N/A'}</span>
                              </td>
                              <td className="p-3 border-r border-black text-[10px] max-w-[200px] truncate" title={order.itemsSummary}>
                                {order.itemsSummary}
                              </td>
                              <td className="p-3 border-r border-black text-right">₹{order.subtotal}</td>
                              <td className="p-3 border-r border-black text-right text-red-650 font-semibold">
                                {order.discountApplied > 0 ? `₹${order.discountApplied}` : '—'}
                              </td>
                              <td className="p-3 border-r border-black text-right font-black">₹{order.total}</td>
                              <td className="p-3 border-r border-black text-center">
                                {order.upsellAccepted ? (
                                  <span className="bg-black text-white text-[9px] px-1 py-0.5 border border-black font-black">
                                    YES
                                  </span>
                                ) : (
                                  <span className="text-zinc-300 text-[10px]">NO</span>
                                )}
                              </td>
                              <td className="p-3 border-r border-black whitespace-nowrap">
                                <span
                                  className={`font-black px-1.5 py-0.5 border text-[9px] ${
                                    order.status === 'cancelled'
                                      ? 'border-red-650 text-red-600 bg-red-50'
                                      : order.status === 'completed'
                                      ? 'border-zinc-300 text-zinc-450 bg-zinc-50'
                                      : 'border-black bg-black text-white'
                                  }`}
                                >
                                  {order.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                {isActionLoading ? (
                                  <span className="text-[10px] text-zinc-400 font-bold uppercase animate-pulse">WAIT...</span>
                                ) : (
                                  <div className="flex gap-2">
                                    {order.status === 'received' && (
                                      <button
                                        onClick={() => handleStatusTransition(order._id, 'received')}
                                        className="border border-black px-1.5 py-0.5 bg-white text-black hover:bg-black hover:text-white cursor-pointer font-bold text-[10px]"
                                      >
                                        ACCEPT
                                      </button>
                                    )}
                                    {order.status === 'accepted' && (
                                      <button
                                        onClick={() => handleStatusTransition(order._id, 'accepted')}
                                        className="border border-black px-1.5 py-0.5 bg-white text-black hover:bg-black hover:text-white cursor-pointer font-bold text-[10px]"
                                      >
                                        PREPARE
                                      </button>
                                    )}
                                    {order.status === 'preparing' && (
                                      <button
                                        onClick={() => handleStatusTransition(order._id, 'preparing')}
                                        className="border border-black px-1.5 py-0.5 bg-white text-black hover:bg-black hover:text-white cursor-pointer font-bold text-[10px]"
                                      >
                                        READY
                                      </button>
                                    )}
                                    {order.status === 'ready' && (
                                      <button
                                        onClick={() => handleStatusTransition(order._id, 'ready')}
                                        className="border border-black px-1.5 py-0.5 bg-white text-black hover:bg-black hover:text-white cursor-pointer font-bold text-[10px]"
                                      >
                                        COMPLETE
                                      </button>
                                    )}
                                    {['received', 'accepted', 'preparing', 'ready'].includes(order.status) && (
                                      <button
                                        onClick={() => handleCancelOrder(order._id)}
                                        className="border border-red-600 text-red-600 px-1.5 py-0.5 hover:bg-red-650 hover:text-white cursor-pointer font-bold text-[10px]"
                                      >
                                        CANCEL
                                      </button>
                                    )}
                                    {['completed', 'cancelled'].includes(order.status) && (
                                      <span className="text-[10px] text-zinc-400">NONE</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* C. Upsell Engine Performance */}
        <div className="border border-black bg-white shadow-sm">
          <button
            onClick={() => toggleSection('upsell')}
            className="w-full p-5 flex justify-between items-start text-left hover:bg-zinc-50 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black uppercase tracking-tight">C. Upsell Engine Performance</h2>
                <span className="text-[9px] font-bold bg-black text-white px-1.5 py-0.5 border border-black">CRITICAL CHECK</span>
              </div>
              <p className="text-[11px] text-zinc-500 uppercase mt-1">This section tells you if the upsell system is actually making money or just adding clutter — check it weekly for the first month.</p>
            </div>
            {expandedSections.upsell ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {expandedSections.upsell && (
            <div className="p-5 border-t border-black bg-zinc-50/50 flex flex-col gap-6">
              {metrics?.upsellPerformance ? (
                <div className="flex flex-col gap-6">
                  {/* Conversion Rate Funnels */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {Object.entries(metrics.upsellPerformance.conversionRateByType).map(([type, stats]) => {
                      const typeLabels: Record<string, string> = {
                        cross_sell: 'Cross-Sell Recommendations',
                        threshold_discount: 'Threshold Level-Up Discounts',
                        combo_freebie: 'Combo Meal Discounts',
                      };
                      return (
                        <div key={type} className="border border-black p-4 bg-white flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-black uppercase mb-1">{typeLabels[type] || type}</h4>
                            <span className="text-[9px] uppercase text-zinc-400 font-semibold block mb-3">Conversion engine</span>
                            
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="text-2xl font-black">{stats.rate.toFixed(1)}%</span>
                              <span className="text-[10px] text-zinc-500 font-semibold uppercase">
                                {stats.accepted} of {stats.shown} shown
                              </span>
                            </div>

                            {/* Conversion Rate Progress Bar */}
                            <div className="w-full bg-zinc-150 h-2 border border-black overflow-hidden relative mb-2">
                              <div className="bg-black h-full" style={{ width: `${stats.rate}%` }}></div>
                            </div>
                          </div>
                          <span className="text-[9px] text-zinc-400 font-bold uppercase mt-2">Conversion efficiency</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Seed Threshold Discount Calibration Rate */}
                  <div className="border border-black p-5 bg-white">
                    <h3 className="text-xs font-black uppercase mb-3 border-b border-black pb-1.5 flex justify-between">
                      <span>Discount Tier Calibration Rate</span>
                      <span className="text-[9px] text-zinc-400">Validates seed thresholds: ₹399 / ₹599 / ₹899</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                      <div className="border border-dashed border-zinc-300 p-3 bg-zinc-50">
                        <span className="text-[9px] text-zinc-500 uppercase block font-bold">No Tier Reached</span>
                        <span className="text-xs font-bold text-zinc-400 uppercase mt-1 block">Subtotal &lt; ₹399</span>
                        <span className="text-lg font-black mt-2 block">₹{Math.round(metrics.upsellPerformance.avgOrderValueNoTier)}</span>
                        <span className="text-[9px] text-zinc-400 uppercase mt-0.5 block">Avg Order Value</span>
                      </div>
                      
                      {metrics.upsellPerformance.discountTierAchievement.map((tier) => (
                        <div key={tier.tierId} className="border border-black p-3 bg-white">
                          <span className="font-extrabold text-[10px] uppercase block">Tier: {tier.percentOff}% OFF</span>
                          <span className="text-xs font-bold text-zinc-500 mt-1 block">Min spend: ₹{tier.minSpend}</span>
                          <span className="text-lg font-black mt-2 block">
                            {tier.percentReached.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-zinc-400 uppercase mt-0.5 block">
                            {tier.ordersReached} orders reached (AOV: ₹{Math.round(tier.avgOrderValueReached)})
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-[10px] border border-dashed border-black/20 p-2.5 bg-zinc-50 uppercase text-zinc-500">
                      <strong>Design Tip:</strong> If Tier 1 percentage is &gt; 80%, increase the ₹399 threshold. If Tier 3 is 0%, lower the ₹899 threshold to make it achievable.
                    </div>
                  </div>

                  {/* Top Performing Specific Rules */}
                  <div className="border border-black p-4 bg-white">
                    <h3 className="text-xs font-black uppercase mb-3 border-b border-black pb-1.5 flex justify-between">
                      <span>Top Performing Seed Rules</span>
                      <span className="text-[9px] text-zinc-400">Pairing &amp; Combo conversions</span>
                    </h3>
                    {metrics.upsellPerformance.topRules.length === 0 ? (
                      <div className="text-xs text-zinc-400 uppercase text-center py-6">No upsell rules triggered conversions yet.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs uppercase">
                          <thead>
                            <tr className="border-b border-black font-bold text-zinc-500 text-[10px]">
                              <th className="pb-2">Rule Type</th>
                              <th className="pb-2">Trigger Condition &amp; Reward</th>
                              <th className="pb-2 text-right">Conversions</th>
                              <th className="pb-2 text-right">Clicks / Shows</th>
                              <th className="pb-2 text-right">Conv. Rate</th>
                              <th className="pb-2 text-right">Revenue Generated</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200">
                            {metrics.upsellPerformance.topRules.map((rule) => {
                              const conversionRate = rule.triggers > 0 ? (rule.conversions / rule.triggers) * 100 : 0;
                              return (
                                <tr key={rule.ruleId} className="hover:bg-zinc-50">
                                  <td className="py-2.5 font-bold">
                                    <span className={`px-1 py-0.5 text-[9px] border font-black ${rule.ruleType === 'combo' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-400 text-zinc-650 bg-zinc-50'}`}>
                                      {rule.ruleType}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-zinc-700 font-semibold">{rule.description}</td>
                                  <td className="py-2.5 text-right font-bold">{rule.conversions}</td>
                                  <td className="py-2.5 text-right">{rule.triggers}</td>
                                  <td className="py-2.5 text-right font-bold">{conversionRate.toFixed(1)}%</td>
                                  <td className="py-2.5 text-right font-black">₹{Math.round(rule.revenue)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-black p-6 text-center text-xs uppercase text-zinc-500 bg-white">
                  No upsell metrics matching date selection.
                </div>
              )}
            </div>
          )}
        </div>

        {/* D. Menu Intelligence */}
        <div className="border border-black bg-white shadow-sm">
          <button
            onClick={() => toggleSection('menu')}
            className="w-full p-5 flex justify-between items-start text-left hover:bg-zinc-50 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black uppercase tracking-tight">D. Menu Intelligence</h2>
                <span className="text-[9px] font-bold bg-black text-white px-1.5 py-0.5 border border-black">MENU MODIFICATIONS</span>
              </div>
              <p className="text-[11px] text-zinc-500 uppercase mt-1">Use this to decide what to feature, reprice, or remove.</p>
            </div>
            {expandedSections.menu ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {expandedSections.menu && (
            <div className="p-5 border-t border-black bg-zinc-50/50 flex flex-col gap-6">
              {metrics?.menuIntelligence ? (
                <div className="flex flex-col gap-6">
                  {/* Best Sellers side-by-side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Ranked by Quantity */}
                    <div className="border border-black p-4 bg-white">
                      <h3 className="text-xs font-black uppercase mb-3 border-b border-black pb-1.5 flex justify-between">
                        <span>Best Sellers (By Qty Sold)</span>
                        <span className="text-[9px] text-zinc-400">Total portions</span>
                      </h3>
                      <div className="flex flex-col gap-2">
                        {metrics.menuIntelligence.bestSellersQty.slice(0, 5).map((item, idx) => (
                          <div key={item.itemId} className="flex justify-between items-center text-xs">
                            <span className="font-bold">{idx + 1}. {item.name}</span>
                            <span className="font-semibold text-zinc-600">
                              {item.quantity} portions (₹{Math.round(item.revenue).toLocaleString()})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ranked by Revenue */}
                    <div className="border border-black p-4 bg-white">
                      <h3 className="text-xs font-black uppercase mb-3 border-b border-black pb-1.5 flex justify-between">
                        <span>Best Sellers (By Revenue)</span>
                        <span className="text-[9px] text-zinc-400">Total gross value</span>
                      </h3>
                      <div className="flex flex-col gap-2">
                        {metrics.menuIntelligence.bestSellersRev.slice(0, 5).map((item, idx) => (
                          <div key={item.itemId} className="flex justify-between items-center text-xs">
                            <span className="font-bold">{idx + 1}. {item.name}</span>
                            <span className="font-semibold text-zinc-600">
                              ₹{Math.round(item.revenue).toLocaleString()} ({item.quantity} portions)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Worst Sellers with Review Flags */}
                  <div className="border border-black p-4 bg-white">
                    <h3 className="text-xs font-black uppercase mb-3 border-b border-black pb-1.5">
                      <span>Worst Sellers (Review Required)</span>
                    </h3>
                    <p className="text-[10px] text-zinc-400 uppercase mb-3">Items with low sales volume inside the active filter range.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {metrics.menuIntelligence.worstSellers.slice(0, 6).map((item) => (
                        <div
                          key={item.itemId}
                          className={`border p-2.5 flex justify-between items-center text-xs ${
                            item.flagReview ? 'border-red-650 bg-red-50 text-red-700' : 'border-zinc-300 bg-zinc-50 text-zinc-650'
                          }`}
                        >
                          <div>
                            <span className="font-bold">{item.name}</span>
                            <span className="text-[9px] block text-zinc-400 uppercase">
                              Qty: {item.quantity} | Rev: ₹{item.revenue}
                            </span>
                          </div>
                          {item.flagReview ? (
                            <span className="text-[9px] font-black uppercase bg-red-600 text-white px-1.5 py-0.5 border border-red-650">
                              REVIEW ITEM
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold uppercase text-zinc-450">LOW SALES</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Frequently Bought Together vs Manual Rules */}
                  <div className="border border-black p-4 bg-white">
                    <h3 className="text-xs font-black uppercase mb-3 border-b border-black pb-1.5 flex justify-between">
                      <span>Frequently Bought Together vs. Configured Rules</span>
                      <span className="text-[9px] text-zinc-400">Co-occurrence affinity verification</span>
                    </h3>
                    <p className="text-[10px] text-zinc-400 uppercase mb-4">
                      Matches real co-occurrence patterns (affinity engine logic) side-by-side with manual pairing rules to detect gaps.
                    </p>

                    {metrics.menuIntelligence.frequentlyBoughtTogether.length === 0 ? (
                      <div className="text-xs text-zinc-400 uppercase text-center py-6">Insufficient order affinity data to compute co-occurrences.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs uppercase">
                          <thead>
                            <tr className="border-b border-black font-bold text-zinc-500 text-[10px]">
                              <th className="pb-2">Item A</th>
                              <th className="pb-2">Frequently Bought With (Item B)</th>
                              <th className="pb-2 text-right">Co-Occurrences</th>
                              <th className="pb-2 text-right">Confidence (A➔B)</th>
                              <th className="pb-2 text-center">Manual Rule Coverage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200">
                            {metrics.menuIntelligence.frequentlyBoughtTogether.map((row, idx) => (
                              <tr key={idx} className="hover:bg-zinc-50">
                                <td className="py-2 font-bold text-zinc-800">{row.itemA}</td>
                                <td className="py-2 text-zinc-655 font-semibold">{row.itemB}</td>
                                <td className="py-2 text-right font-bold">{row.coOccurrenceCount}</td>
                                <td className="py-2 text-right">{(row.confidence * 100).toFixed(0)}%</td>
                                <td className="py-2 text-center">
                                  {row.matchingManualRule ? (
                                    <span className="inline-block text-[9px] font-black border border-black text-black bg-white px-1.5 py-0.5">
                                      ✓ MANUALLY COVERED
                                    </span>
                                  ) : (
                                    <span className="inline-block text-[9px] font-black border border-red-600 text-red-650 bg-red-50 px-1.5 py-0.5">
                                      ⚠ NEW OPPORTUNITY
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Menu Friction: Modal View vs Add to Cart Conversion */}
                  <div className="border border-black p-4 bg-white">
                    <h3 className="text-xs font-black uppercase mb-3 border-b border-black pb-1.5 flex justify-between">
                      <span>Menu Friction &amp; Customer Interest Flags</span>
                      <span className="text-[9px] text-zinc-400">Modal views vs order conversion rate</span>
                    </h3>
                    <p className="text-[10px] text-zinc-400 uppercase mb-4">
                      Finds items that customers inspect (by opening detail modals) but rarely purchase (conversion rate &lt; 15%).
                    </p>

                    {metrics.menuIntelligence.menuFriction.length === 0 ? (
                      <div className="text-xs text-zinc-450 uppercase text-center py-6">No item detail modal views logged in this period.</div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs uppercase">
                            <thead>
                              <tr className="border-b border-black font-bold text-zinc-500 text-[10px]">
                                <th className="pb-2">Menu Item</th>
                                <th className="pb-2 text-right">Detail Modal Views</th>
                                <th className="pb-2 text-right">Total Portions Sold</th>
                                <th className="pb-2 text-right">Interest Conversion</th>
                                <th className="pb-2 text-center">Friction Flag</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200">
                              {metrics.menuIntelligence.menuFriction.map((item) => (
                                <tr key={item.itemId} className={`hover:bg-zinc-50 ${item.flagReview ? 'bg-red-50/50' : ''}`}>
                                  <td className="py-2.5 font-bold text-zinc-800">{item.name}</td>
                                  <td className="py-2.5 text-right font-semibold">{item.modalOpens}</td>
                                  <td className="py-2.5 text-right">{item.conversions}</td>
                                  <td className="py-2.5 text-right font-black">{item.conversionRate.toFixed(1)}%</td>
                                  <td className="py-2.5 text-center">
                                    {item.flagReview ? (
                                      <span className="inline-block text-[9px] font-black border border-red-650 text-red-655 bg-red-50 px-1.5 py-0.5">
                                        ⚠ Friction Warning
                                      </span>
                                    ) : (
                                      <span className="inline-block text-[9px] font-bold text-zinc-400 uppercase">Optimal</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Friction warnings callout box */}
                        {metrics.menuIntelligence.menuFriction.some(i => i.flagReview) && (
                          <div className="border border-dashed border-red-600 p-3 bg-red-50 text-[10px] uppercase text-red-700 font-semibold leading-relaxed">
                            <strong>Action Item:</strong> The flagged dishes above get inspected by customers but aren't being added to carts. Consider adjusting their description, ingredients text, adding allergen safety clarity, repricing, or improving their food photo in the Menu Editor!
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-black p-6 text-center text-xs uppercase text-zinc-500 bg-white">
                  No Menu Intelligence metrics matches selection.
                </div>
              )}
            </div>
          )}
        </div>

        {/* E. Customer Behavior */}
        <div className="border border-black bg-white shadow-sm">
          <button
            onClick={() => toggleSection('customer')}
            className="w-full p-5 flex justify-between items-start text-left hover:bg-zinc-50 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black uppercase tracking-tight">E. Customer Behavior</h2>
                <span className="text-[9px] font-bold bg-black text-white px-1.5 py-0.5 border border-black">IDENTITY GATED</span>
              </div>
              <p className="text-[11px] text-zinc-500 uppercase mt-1">Understand who's ordering and whether people are dropping off before completing checkout.</p>
            </div>
            {expandedSections.customer ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {expandedSections.customer && (
            <div className="p-5 border-t border-black bg-zinc-50/50 flex flex-col gap-6">
              {metrics?.customerBehavior ? (
                <div className="flex flex-col gap-6">
                  {/* Identity Check Conditional Section */}
                  <div className="border border-black p-4 bg-white">
                    <h3 className="text-xs font-black uppercase mb-3 border-b border-black pb-1.5 flex justify-between">
                      <span>Repeat Customer Analytics</span>
                      <span className="text-[9px] text-zinc-400">Phone Identifier Gated</span>
                    </h3>

                    {metrics.customerBehavior.hasPhoneNumbers && metrics.customerBehavior.newVsRepeat ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* New vs Repeat orders breakdown */}
                        <div className="border border-dashed border-zinc-300 p-3 bg-zinc-50 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">New vs. Repeat Customers</span>
                            <span className="text-[9px] text-zinc-400 uppercase block mb-3">Overall profiles mapped</span>
                            
                            <div className="flex flex-col gap-2 text-xs font-semibold">
                              <div className="flex justify-between">
                                <span>New Customers:</span>
                                <span>{metrics.customerBehavior.newVsRepeat.newCustomers} profiles</span>
                              </div>
                              <div className="flex justify-between border-t border-zinc-200 pt-1.5">
                                <span className="font-bold">Repeat Customers:</span>
                                <span className="font-bold text-black">{metrics.customerBehavior.newVsRepeat.repeatCustomers} profiles</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border border-dashed border-zinc-300 p-3 bg-zinc-50 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">Orders Breakdown</span>
                            <span className="text-[9px] text-zinc-400 uppercase block mb-3">Selected range volume</span>

                            <div className="flex flex-col gap-2 text-xs font-semibold">
                              <div className="flex justify-between">
                                <span>Orders by New:</span>
                                <span>{metrics.customerBehavior.newVsRepeat.newOrdersCount} orders</span>
                              </div>
                              <div className="flex justify-between border-t border-zinc-200 pt-1.5">
                                <span className="font-bold">Orders by Repeat:</span>
                                <span className="font-black text-black">{metrics.customerBehavior.newVsRepeat.repeatOrdersCount} orders</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-xs uppercase text-zinc-500 italic font-bold">
                          Capture a phone number at checkout to unlock repeat-customer insights
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cart abandonment indicators and proxy party size */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Cart Abandonment */}
                    <div className="border border-black p-4 bg-white flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-black uppercase mb-1">Cart Abandonment Rate</h4>
                        <span className="text-[9px] uppercase text-zinc-400 font-semibold block mb-3">Cart events vs submissions</span>
                        
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-2xl font-black">
                            {metrics.customerBehavior.cartAbandonment ? `${metrics.customerBehavior.cartAbandonment.abandonmentRate.toFixed(1)}%` : '—'}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase">
                            {metrics.customerBehavior.cartAbandonment?.cartsStarted || 0} carts started
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-zinc-150 h-2 border border-black overflow-hidden relative mb-2">
                          <div
                            className="bg-black h-full"
                            style={{ width: `${metrics.customerBehavior.cartAbandonment?.abandonmentRate || 0}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-[9px] text-zinc-400 font-bold uppercase mt-2">Abandonment index</span>
                    </div>

                    {/* Party Size Proxy */}
                    <div className="border border-black p-4 bg-white flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-black uppercase mb-1">Party Size Proxy</h4>
                        <span className="text-[9px] uppercase text-zinc-400 font-semibold block mb-3">Estimated from items per order</span>
                        
                        <div className="flex justify-between items-baseline mb-1 mt-4">
                          <span className="text-2xl font-black">
                            {metrics.customerBehavior.avgPartySizeProxy.toFixed(1)} items
                          </span>
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase">
                            per customer table
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] text-zinc-400 font-bold uppercase mt-2">Estimated size proxy</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-black p-6 text-center text-xs uppercase text-zinc-500 bg-white">
                  No Customer Behavior metrics matches selection.
                </div>
              )}
            </div>
          )}
        </div>

        {/* F. Genuine-Concern / Operational Signals */}
        <div className="border border-black bg-white shadow-sm">
          <button
            onClick={() => toggleSection('operational')}
            className="w-full p-5 flex justify-between items-start text-left hover:bg-zinc-50 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black uppercase tracking-tight">F. Genuine-Concern / Operational Signals</h2>
                <span className="text-[9px] font-bold bg-black text-white px-1.5 py-0.5 border border-black">KITCHEN PREP</span>
              </div>
              <p className="text-[11px] text-zinc-500 uppercase mt-1">Genuine operational signals — not for marketing, just for running the kitchen smarter.</p>
            </div>
            {expandedSections.operational ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {expandedSections.operational && (
            <div className="p-5 border-t border-black bg-zinc-50/50 flex flex-col gap-6">
              {metrics?.operationalSignals ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Spice Level Distribution */}
                  <div className="border border-black p-4 bg-white flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase mb-3 border-b border-black pb-1.5">
                        <span>Spice Level Demand Distribution</span>
                      </h3>
                      <p className="text-[10px] text-zinc-400 uppercase mb-4">Total quantities of items prepared grouped by spice levels.</p>

                      {(() => {
                        const { mild, medium, hot } = metrics.operationalSignals.spiceDistribution;
                        const totalSpiceItems = mild + medium + hot || 1;
                        const mildPct = (mild / totalSpiceItems) * 100;
                        const medPct = (medium / totalSpiceItems) * 100;
                        const hotPct = (hot / totalSpiceItems) * 100;

                        return (
                          <div className="flex flex-col gap-4 text-xs font-bold uppercase">
                            {/* Mild bar */}
                            <div>
                              <div className="flex justify-between mb-1.5">
                                <span>No Spice / Mild (0-1 Flames)</span>
                                <span>{mild} portions ({mildPct.toFixed(0)}%)</span>
                              </div>
                              <div className="w-full bg-zinc-150 h-2 border border-black overflow-hidden">
                                <div className="bg-zinc-400 h-full" style={{ width: `${mildPct}%` }}></div>
                              </div>
                            </div>

                            {/* Medium bar */}
                            <div>
                              <div className="flex justify-between mb-1.5">
                                <span>Medium Spicy (2 Flames)</span>
                                <span>{medium} portions ({medPct.toFixed(0)}%)</span>
                              </div>
                              <div className="w-full bg-zinc-150 h-2 border border-black overflow-hidden">
                                <div className="bg-zinc-700 h-full" style={{ width: `${medPct}%` }}></div>
                              </div>
                            </div>

                            {/* Hot bar */}
                            <div>
                              <div className="flex justify-between mb-1.5 text-red-600">
                                <span>Hot / Extra Spicy (3 Flames)</span>
                                <span>{hot} portions ({hotPct.toFixed(0)}%)</span>
                              </div>
                              <div className="w-full bg-zinc-150 h-2 border border-black overflow-hidden">
                                <div className="bg-zinc-950 h-full" style={{ width: `${hotPct}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase mt-4 block pt-2 border-t border-zinc-100">Spice profile breakdown</span>
                  </div>

                  {/* Allergen Frequencies */}
                  <div className="border border-black p-4 bg-white flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase mb-3 border-b border-black pb-1.5">
                        <span>Allergen-Tagged Order Frequency</span>
                      </h3>
                      <p className="text-[10px] text-zinc-400 uppercase mb-3">Count of ordered portions containing allergen ingredients.</p>

                      <div className="flex flex-col gap-2">
                        {Object.entries(metrics.operationalSignals.allergenFrequency)
                          .sort((a, b) => b[1] - a[1])
                          .map(([allergen, count]) => (
                            <div key={allergen} className="flex justify-between items-center text-xs border-b border-zinc-100 pb-1 last:border-0 uppercase">
                              <span className="font-bold text-zinc-500">{allergen}</span>
                              <span className="font-black text-black">{count} portions</span>
                            </div>
                          ))}
                      </div>
                    </div>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase mt-4 block pt-2 border-t border-zinc-100">Portions requiring special prep care</span>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-black p-6 text-center text-xs uppercase text-zinc-500 bg-white">
                  No operational metrics matching selection.
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
