'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { getDashboardMetrics, updateOrderStatus, updateOrderEstimatedTime } from '@/actions/orders';
import { useOrderNotification } from '@/components/providers';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  RefreshCw,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Zap,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { StatCard, StatusBadge, PageHeader } from '@/components/ui';

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

function getOrderStatusVariant(status: MetricOrderTable['status']) {
  switch (status) {
    case 'received': return 'info' as const;
    case 'accepted': return 'info' as const;
    case 'preparing': return 'warning' as const;
    case 'ready': return 'success' as const;
    case 'completed': return 'neutral' as const;
    case 'cancelled': return 'error' as const;
    default: return 'neutral' as const;
  }
}

function Section({ title, badge, description, defaultOpen = false, children }: {
  title: string;
  badge?: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex justify-between items-start text-left hover:bg-[#F4F6F9]/50 transition-colors"
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-bold text-[#111827]">{title}</h2>
            {badge && (
              <span className="text-[10px] font-semibold bg-[#FEF2F2] text-[#C0181A] px-2 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </div>
          {description && <p className="text-[13px] text-[#6B7280] mt-0.5">{description}</p>}
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-[#6B7280]" /> : <ChevronDown className="w-5 h-5 text-[#6B7280]" />}
      </button>
      {open && (
        <div className="px-6 pb-6 pt-2 border-t border-[#E2E6EA]">
          {children}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { acknowledgeOrder } = useOrderNotification();
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

  const [orderSearch, setOrderSearch] = useState('');
  const [orderSortField, setOrderSortField] = useState<'createdAt' | 'total' | 'discountApplied'>('createdAt');
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

  useEffect(() => {
    fetchMetrics(true, startDate, endDate);
  }, [startDate, endDate]);

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
      case 'received': nextStatus = 'accepted'; break;
      case 'accepted': nextStatus = 'preparing'; break;
      case 'preparing': nextStatus = 'completed'; break;
      default: return;
    }
    setActionLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      await updateOrderStatus(orderId, nextStatus);
      await fetchMetrics(false);
      acknowledgeOrder(orderId);
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
        acknowledgeOrder(orderId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel order';
        alert(message);
      } finally {
        setActionLoading(prev => ({ ...prev, [orderId]: false }));
      }
    }
  };

  const filteredOrders = useMemo(() => {
    if (!metrics?.ordersTable) return [];
    let result = [...metrics.ordersTable];

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

    if (orderUpsellFilter === 'upsell') {
      result = result.filter(o => o.upsellAccepted);
    } else if (orderUpsellFilter === 'no-upsell') {
      result = result.filter(o => !o.upsellAccepted);
    }

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
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 bg-[#E2E6EA] rounded animate-pulse" />
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
        <h3 className="text-sm font-semibold text-[#DC2626] mb-2">Error Loading Dashboard</h3>
        <p className="text-sm text-[#DC2626]/80 mb-4">{error}</p>
        <button
          onClick={() => fetchMetrics(true)}
          className="px-4 py-2 text-sm font-medium bg-[#DC2626] text-white rounded-lg hover:bg-[#DC2626]/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  let maxHeatmapCount = 1;
  if (metrics?.dayHourHeatmap) {
    metrics.dayHourHeatmap.forEach(row => {
      row.forEach(val => {
        if (val > maxHeatmapCount) maxHeatmapCount = val;
      });
    });
  }

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header with date filter */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <PageHeader title="Dashboard" subtitle="Overview of your restaurant operations" />
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
            onClick={() => fetchMetrics(true)}
            className="p-2 bg-white border border-[#E2E6EA] rounded-lg text-[#6B7280] hover:bg-[#F4F6F9] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={`₹${Math.round(metrics?.revenue || 0).toLocaleString()}`}
          subtitle="Selected period"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          label="Total Orders"
          value={metrics?.ordersCount || 0}
          subtitle="Checkout count"
          icon={<ShoppingCart className="w-4 h-4" />}
        />
        <StatCard
          label="Avg. Order Value"
          value={`₹${Math.round(metrics?.aov || 0)}`}
          subtitle="Key spend indicator"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Upsell Revenue"
          value={`₹${Math.round(metrics?.upsellRevenue || 0).toLocaleString()}`}
          subtitle={metrics && metrics.revenue > 0 ? `${Math.round((metrics.upsellRevenue / metrics.revenue) * 100)}% of total` : 'Engine nudges'}
          icon={<Zap className="w-4 h-4" />}
        />
      </div>

      {/* Heatmap */}
      <div className="bg-white border border-[#E2E6EA] rounded-xl p-6">
        <div className="flex justify-between items-baseline mb-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#111827]">Staffing Heatmap</h2>
            <p className="text-[13px] text-[#6B7280]">Plan staff shifts based on order volume by day and hour</p>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Time Intel</span>
        </div>

        {metrics?.dayHourHeatmap ? (
          <div className="flex flex-col gap-6">
            <div className="overflow-x-auto">
              <div className="min-w-[700px] flex flex-col gap-0.5">
                <div className="flex gap-0.5 items-center mb-1 text-[9px] text-[#6B7280] font-medium text-center">
                  <div className="w-10 text-left" />
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div key={hour} className="flex-1 min-w-[20px]">
                      {hour === 0 ? '12a' : hour === 12 ? '12p' : hour > 12 ? `${hour-12}p` : `${hour}a`}
                    </div>
                  ))}
                </div>
                {metrics.dayHourHeatmap.map((row, dIdx) => (
                  <div key={dIdx} className="flex gap-0.5 items-center">
                    <div className="w-10 text-[11px] font-medium text-[#6B7280]">{weekdayNames[dIdx]}</div>
                    {row.map((count, hIdx) => {
                      let bgClass = 'bg-[#F4F6F9]';
                      if (count > 0) {
                        const ratio = count / maxHeatmapCount;
                        if (ratio <= 0.25) bgClass = 'bg-[#C0181A]/15';
                        else if (ratio <= 0.5) bgClass = 'bg-[#C0181A]/30';
                        else if (ratio <= 0.75) bgClass = 'bg-[#C0181A]/55';
                        else bgClass = 'bg-[#C0181A]/85';
                      }
                      return (
                        <div
                          key={hIdx}
                          className={`flex-1 min-w-[20px] h-7 flex items-center justify-center text-[9px] rounded-sm cursor-default transition-colors ${bgClass} ${count > 0 && count / maxHeatmapCount > 0.5 ? 'text-white font-medium' : 'text-[#6B7280]'}`}
                          title={`${weekdayNames[dIdx]} ${hIdx}:00 — ${count} orders`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#F4F6F9] rounded-lg p-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-3">Best Days by Revenue</h3>
                {metrics.bestDays.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">No data</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {metrics.bestDays.map((day, idx) => (
                      <div key={day.weekday} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-[#111827]">{idx + 1}. {day.name}</span>
                        <span className="text-[#6B7280]">{day.totalOrders} orders · ₹{Math.round(day.totalRevenue).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-[#F4F6F9] rounded-lg p-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-3">Best Meal Periods</h3>
                {metrics.bestTimeOfDay.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">No data</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {metrics.bestTimeOfDay.map((p, idx) => (
                      <div key={p.period} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-[#111827]">{idx + 1}. {p.label}</span>
                        <span className="text-[#6B7280]">{p.orders} orders · ₹{Math.round(p.revenue).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#6B7280] text-center py-8">No time intelligence data for selected range.</p>
        )}
      </div>

      {/* Revenue & Order Trends */}
      <Section title="Revenue & Order Trends" badge="Trends" description="Revenue and order count over time. AOV shows upselling effectiveness." defaultOpen>
        {metrics?.trends && metrics.trends.length > 0 ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-[#F4F6F9] rounded-lg p-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-4">Daily Revenue</h3>
                {(() => {
                  const maxRevenue = Math.max(...metrics.trends.map(t => t.revenue), 1);
                  return (
                    <div className="h-32 flex items-end gap-[2px] relative">
                      {metrics.trends.map((t) => (
                        <div
                          key={t.date}
                          className="flex-1 bg-[#C0181A]/70 hover:bg-[#C0181A] rounded-t-sm transition-colors group relative cursor-pointer min-h-[2px]"
                          style={{ height: `${(t.revenue / maxRevenue) * 100}%` }}
                        >
                          <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-[#111827] text-white text-[10px] p-2 rounded-md whitespace-nowrap z-10 mb-1 shadow-lg">
                            {t.date}: ₹{Math.round(t.revenue)} ({t.orders} orders)
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="flex justify-between mt-2 text-[10px] text-[#6B7280]">
                  <span>{metrics.trends[0]?.date}</span>
                  <span>{metrics.trends[metrics.trends.length - 1]?.date}</span>
                </div>
              </div>

              <div className="bg-[#F4F6F9] rounded-lg p-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-4">Daily AOV</h3>
                {(() => {
                  const maxAov = Math.max(...metrics.trends.map(t => t.aov), 1);
                  return (
                    <div className="h-32 flex items-end gap-[2px] relative">
                      {metrics.trends.map((t) => (
                        <div
                          key={t.date}
                          className="flex-1 bg-[#2563EB]/50 hover:bg-[#2563EB]/80 rounded-t-sm transition-colors group relative cursor-pointer min-h-[2px]"
                          style={{ height: `${(t.aov / maxAov) * 100}%` }}
                        >
                          <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-[#111827] text-white text-[10px] p-2 rounded-md whitespace-nowrap z-10 mb-1 shadow-lg">
                            {t.date}: AOV ₹{Math.round(t.aov)} · {t.avgItems.toFixed(1)} items
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="flex justify-between mt-2 text-[10px] text-[#6B7280]">
                  <span>{metrics.trends[0]?.date}</span>
                  <span>{metrics.trends[metrics.trends.length - 1]?.date}</span>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                <h3 className="text-[14px] font-semibold text-[#111827]">Order Log</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-[#E2E6EA] rounded-lg bg-[#F4F6F9] outline-none focus:ring-2 focus:ring-[#C0181A]/20 focus:border-[#C0181A] w-44"
                  />
                  <select
                    value={orderUpsellFilter}
                    onChange={(e) => setOrderUpsellFilter(e.target.value as any)}
                    className="px-3 py-1.5 text-xs border border-[#E2E6EA] rounded-lg bg-white outline-none cursor-pointer"
                  >
                    <option value="all">All Orders</option>
                    <option value="upsell">Upsell Accepted</option>
                    <option value="no-upsell">No Upsell</option>
                  </select>
                  <select
                    value={orderSortField}
                    onChange={(e) => setOrderSortField(e.target.value as any)}
                    className="px-3 py-1.5 text-xs border border-[#E2E6EA] rounded-lg bg-white outline-none cursor-pointer"
                  >
                    <option value="createdAt">Sort: Date</option>
                    <option value="total">Sort: Total</option>
                    <option value="discountApplied">Sort: Discount</option>
                  </select>
                  <button
                    onClick={() => setOrderSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-1.5 text-xs border border-[#E2E6EA] rounded-lg bg-white hover:bg-[#F4F6F9] font-medium transition-colors"
                  >
                    {orderSortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                  </button>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="bg-[#F4F6F9] rounded-lg p-8 text-center text-sm text-[#6B7280]">
                  No matching orders found.
                </div>
              ) : (
                <div className="border border-[#E2E6EA] rounded-lg overflow-x-auto bg-white">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="bg-[#F4F6F9] border-b border-[#E2E6EA]">
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Time</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Order</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Table</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Customer</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Items</th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Total</th>
                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Upsell</th>
                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Status</th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E6EA]">
                      {filteredOrders.map((order) => {
                        const displayId = order._id.substring(order._id.length - 6).toUpperCase();
                        const oDate = new Date(order.createdAt);
                        const dateFormatted = oDate.toLocaleDateString([], { month: 'short', day: '2-digit' });
                        const timeFormatted = oDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const isActionLoading = actionLoading[order._id];

                        return (
                          <tr key={order._id} className="hover:bg-[#F4F6F9]/50 transition-colors">
                            <td className="px-3 py-3 text-[12px] text-[#6B7280] whitespace-nowrap">
                              {dateFormatted}<br/><span className="text-[11px]">{timeFormatted}</span>
                            </td>
                            <td className="px-3 py-3">
                              <Link href={`/admin/orders?highlight=${order._id}`} className="text-[#C0181A] font-medium hover:underline">
                                #{displayId}
                              </Link>
                            </td>
                            <td className="px-3 py-3 text-[13px] font-medium text-[#111827]">
                              {order.tableId || '—'}
                            </td>
                            <td className="px-3 py-3">
                              <span className="font-medium text-[#111827] text-[13px] block">{order.customerName}</span>
                              <span className="text-[11px] text-[#6B7280]">{order.customerPhone || 'N/A'}</span>
                            </td>
                            <td className="px-3 py-3 text-[12px] text-[#6B7280] max-w-[180px] truncate" title={order.itemsSummary}>
                              {order.itemsSummary}
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-[#111827]">₹{order.total}</td>
                            <td className="px-3 py-3 text-center">
                              {order.upsellAccepted ? (
                                <StatusBadge label="Yes" variant="success" dot={false} />
                              ) : (
                                <span className="text-[12px] text-[#6B7280]">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <StatusBadge label={order.status} variant={getOrderStatusVariant(order.status)} />
                            </td>
                            <td className="px-3 py-3 text-right whitespace-nowrap">
                              {isActionLoading ? (
                                <span className="text-[11px] text-[#6B7280] animate-pulse">Updating...</span>
                              ) : (
                                <div className="flex gap-1 justify-end items-center">
                                  {order.status === 'received' && (
                                    <div className="flex items-center gap-1">
                                      <select
                                        id={`dash-eta-${order._id}`}
                                        className="bg-white border border-[#E2E6EA] hover:border-green-500/30 rounded text-[10px] px-1 py-0.5 font-semibold text-[#374151] outline-none transition-all cursor-pointer"
                                        defaultValue="20"
                                      >
                                        <option value="15">15m</option>
                                        <option value="20">20m</option>
                                        <option value="30">30m</option>
                                        <option value="45">45m</option>
                                        <option value="60">60m</option>
                                      </select>
                                      <button
                                        onClick={async () => {
                                          const selectEl = document.getElementById(`dash-eta-${order._id}`) as HTMLSelectElement | null;
                                          const mins = selectEl ? parseInt(selectEl.value, 10) : 20;
                                          setActionLoading(prev => ({ ...prev, [order._id]: true }));
                                          try {
                                            await updateOrderStatus(order._id, 'accepted');
                                            await updateOrderEstimatedTime(order._id, mins);
                                            await fetchMetrics(false);
                                            acknowledgeOrder(order._id);
                                          } catch (err) {
                                            const message = err instanceof Error ? err.message : 'Failed to accept order';
                                            alert(message);
                                          } finally {
                                            setActionLoading(prev => ({ ...prev, [order._id]: false }));
                                          }
                                        }}
                                        className="px-2 py-1 text-[11px] font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => handleCancelOrder(order._id)}
                                        className="px-2 py-1 text-[11px] font-medium bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                  {order.status === 'accepted' && (
                                    <button onClick={() => handleStatusTransition(order._id, 'accepted')} className="px-2 py-1 text-[11px] font-medium bg-[#C0181A] text-white rounded hover:bg-[#A01416] transition-colors">Prepare</button>
                                  )}
                                  {order.status === 'preparing' && (
                                    <button onClick={() => handleStatusTransition(order._id, 'preparing')} className="px-2 py-1 text-[11px] font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors">Mark Ready</button>
                                  )}
                                  {['accepted', 'preparing'].includes(order.status) && (
                                    <button onClick={() => handleCancelOrder(order._id)} className="px-2 py-1 text-[11px] font-medium text-[#DC2626] bg-[#FEF2F2] rounded hover:bg-[#DC2626] hover:text-white transition-colors">Cancel</button>
                                  )}
                                  {['completed', 'cancelled'].includes(order.status) && (
                                    <span className="text-[11px] text-[#6B7280]">—</span>
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
        ) : (
          <p className="text-sm text-[#6B7280] text-center py-6">No trend data for selected range.</p>
        )}
      </Section>

      {/* Upsell Engine Performance */}
      <Section title="Upsell Engine Performance" badge="Critical" description="Is the upsell system generating revenue or adding clutter?">
        {metrics?.upsellPerformance ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {Object.entries(metrics.upsellPerformance.conversionRateByType).map(([type, stats]) => {
                const typeLabels: Record<string, string> = {
                  cross_sell: 'Cross-Sell',
                  threshold_discount: 'Threshold Discount',
                  combo_freebie: 'Combo Freebie',
                };
                return (
                  <div key={type} className="bg-[#F4F6F9] rounded-lg p-4">
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-2">{typeLabels[type] || type}</h4>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-[24px] font-bold text-[#111827]">{stats.rate.toFixed(1)}%</span>
                      <span className="text-[12px] text-[#6B7280]">{stats.accepted}/{stats.shown} shown</span>
                    </div>
                    <div className="w-full bg-[#E2E6EA] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#C0181A] h-full rounded-full transition-all" style={{ width: `${Math.min(stats.rate, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-[#F4F6F9] rounded-lg p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-3">Discount Tier Calibration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-3 border border-[#E2E6EA]">
                  <span className="text-[10px] text-[#6B7280] uppercase block font-medium">No Tier</span>
                  <span className="text-[18px] font-bold text-[#111827] block mt-1">₹{Math.round(metrics.upsellPerformance.avgOrderValueNoTier)}</span>
                  <span className="text-[11px] text-[#6B7280]">Avg order value</span>
                </div>
                {metrics.upsellPerformance.discountTierAchievement.map((tier) => (
                  <div key={tier.tierId} className="bg-white rounded-lg p-3 border border-[#E2E6EA]">
                    <span className="text-[10px] text-[#6B7280] uppercase block font-medium">{tier.percentOff}% OFF · Min ₹{tier.minSpend}</span>
                    <span className="text-[18px] font-bold text-[#111827] block mt-1">{tier.percentReached.toFixed(1)}%</span>
                    <span className="text-[11px] text-[#6B7280]">{tier.ordersReached} orders · AOV ₹{Math.round(tier.avgOrderValueReached)}</span>
                  </div>
                ))}
              </div>
            </div>

            {metrics.upsellPerformance.topRules.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-3">Top Performing Rules</h3>
                <div className="border border-[#E2E6EA] rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F4F6F9] border-b border-[#E2E6EA]">
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Type</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Description</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Conv.</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Rate</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E6EA]">
                      {metrics.upsellPerformance.topRules.map((rule) => (
                        <tr key={rule.ruleId} className="hover:bg-[#F4F6F9]/50">
                          <td className="px-3 py-2.5">
                            <StatusBadge label={rule.ruleType} variant={rule.ruleType === 'combo' ? 'info' : 'neutral'} dot={false} />
                          </td>
                          <td className="px-3 py-2.5 text-[13px] text-[#111827]">{rule.description}</td>
                          <td className="px-3 py-2.5 text-right font-medium">{rule.conversions}/{rule.triggers}</td>
                          <td className="px-3 py-2.5 text-right font-medium">{rule.triggers > 0 ? ((rule.conversions / rule.triggers) * 100).toFixed(1) : 0}%</td>
                          <td className="px-3 py-2.5 text-right font-semibold">₹{Math.round(rule.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#6B7280] text-center py-6">No upsell metrics for selected range.</p>
        )}
      </Section>

      {/* Menu Intelligence */}
      <Section title="Menu Intelligence" badge="Menu" description="Decide what to feature, reprice, or remove.">
        {metrics?.menuIntelligence ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-[#F4F6F9] rounded-lg p-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-3">Best Sellers (Quantity)</h3>
                <div className="flex flex-col gap-2">
                  {metrics.menuIntelligence.bestSellersQty.slice(0, 5).map((item, idx) => (
                    <div key={item.itemId} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-[#111827]">{idx + 1}. {item.name}</span>
                      <span className="text-[#6B7280]">{item.quantity} sold · ₹{Math.round(item.revenue).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#F4F6F9] rounded-lg p-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-3">Best Sellers (Revenue)</h3>
                <div className="flex flex-col gap-2">
                  {metrics.menuIntelligence.bestSellersRev.slice(0, 5).map((item, idx) => (
                    <div key={item.itemId} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-[#111827]">{idx + 1}. {item.name}</span>
                      <span className="text-[#6B7280]">₹{Math.round(item.revenue).toLocaleString()} · {item.quantity} sold</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {metrics.menuIntelligence.worstSellers.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-3">Low Performers — Review Needed</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {metrics.menuIntelligence.worstSellers.slice(0, 6).map((item) => (
                    <div
                      key={item.itemId}
                      className={`flex justify-between items-center p-3 rounded-lg border text-sm ${
                        item.flagReview ? 'bg-[#FEF2F2] border-[#DC2626]/20' : 'bg-[#F4F6F9] border-[#E2E6EA]'
                      }`}
                    >
                      <div>
                        <span className="font-medium text-[#111827]">{item.name}</span>
                        <span className="text-[12px] text-[#6B7280] block">Qty: {item.quantity} · Rev: ₹{item.revenue}</span>
                      </div>
                      {item.flagReview && <StatusBadge label="Review" variant="error" dot={false} />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {metrics.menuIntelligence.frequentlyBoughtTogether.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-3">Frequently Bought Together</h3>
                <div className="border border-[#E2E6EA] rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F4F6F9] border-b border-[#E2E6EA]">
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Item A</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Item B</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Count</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Confidence</th>
                        <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Coverage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E6EA]">
                      {metrics.menuIntelligence.frequentlyBoughtTogether.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#F4F6F9]/50">
                          <td className="px-3 py-2.5 font-medium">{row.itemA}</td>
                          <td className="px-3 py-2.5">{row.itemB}</td>
                          <td className="px-3 py-2.5 text-right">{row.coOccurrenceCount}</td>
                          <td className="px-3 py-2.5 text-right">{(row.confidence * 100).toFixed(0)}%</td>
                          <td className="px-3 py-2.5 text-center">
                            <StatusBadge
                              label={row.matchingManualRule ? 'Covered' : 'Opportunity'}
                              variant={row.matchingManualRule ? 'success' : 'warning'}
                              dot={false}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {metrics.menuIntelligence.menuFriction.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-3">Menu Friction — High View, Low Conversion</h3>
                <div className="border border-[#E2E6EA] rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F4F6F9] border-b border-[#E2E6EA]">
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Item</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Views</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Sold</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Conv. Rate</th>
                        <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E6EA]">
                      {metrics.menuIntelligence.menuFriction.map((item) => (
                        <tr key={item.itemId} className={`hover:bg-[#F4F6F9]/50 ${item.flagReview ? 'bg-[#FEF2F2]/30' : ''}`}>
                          <td className="px-3 py-2.5 font-medium">{item.name}</td>
                          <td className="px-3 py-2.5 text-right">{item.modalOpens}</td>
                          <td className="px-3 py-2.5 text-right">{item.conversions}</td>
                          <td className="px-3 py-2.5 text-right font-medium">{item.conversionRate.toFixed(1)}%</td>
                          <td className="px-3 py-2.5 text-center">
                            {item.flagReview ? <StatusBadge label="Friction" variant="warning" dot={false} /> : <span className="text-[12px] text-[#6B7280]">OK</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {metrics.menuIntelligence.menuFriction.some(i => i.flagReview) && (
                  <div className="mt-3 bg-[#FFFBEB] border border-[#D97706]/20 rounded-lg p-3 text-[13px] text-[#D97706]">
                    <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                    Flagged items get viewed but not added to cart. Consider adjusting descriptions, pricing, or photos.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#6B7280] text-center py-6">No menu intelligence data for selected range.</p>
        )}
      </Section>

      {/* Customer Behavior */}
      <Section title="Customer Behavior" badge="Identity" description="Repeat rates, cart abandonment, and party size estimates.">
        {metrics?.customerBehavior ? (
          <div className="flex flex-col gap-6">
            {metrics.customerBehavior.hasPhoneNumbers && metrics.customerBehavior.newVsRepeat ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#F4F6F9] rounded-lg p-4">
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-3">New vs. Repeat Customers</h4>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#6B7280]">New Customers</span><span className="font-medium">{metrics.customerBehavior.newVsRepeat.newCustomers}</span></div>
                    <div className="flex justify-between"><span className="text-[#6B7280]">Repeat Customers</span><span className="font-semibold text-[#111827]">{metrics.customerBehavior.newVsRepeat.repeatCustomers}</span></div>
                  </div>
                </div>
                <div className="bg-[#F4F6F9] rounded-lg p-4">
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-3">Orders Breakdown</h4>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#6B7280]">From New</span><span className="font-medium">{metrics.customerBehavior.newVsRepeat.newOrdersCount} orders</span></div>
                    <div className="flex justify-between"><span className="text-[#6B7280]">From Repeat</span><span className="font-semibold text-[#111827]">{metrics.customerBehavior.newVsRepeat.repeatOrdersCount} orders</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#F4F6F9] rounded-lg p-4 text-center">
                <p className="text-sm text-[#6B7280]">Capture phone numbers at checkout to unlock repeat-customer insights.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#F4F6F9] rounded-lg p-4">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-2">Cart Abandonment</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-[24px] font-bold text-[#111827]">
                    {metrics.customerBehavior.cartAbandonment ? `${metrics.customerBehavior.cartAbandonment.abandonmentRate.toFixed(1)}%` : '—'}
                  </span>
                  <span className="text-[12px] text-[#6B7280]">
                    {metrics.customerBehavior.cartAbandonment?.cartsStarted || 0} carts started
                  </span>
                </div>
                {metrics.customerBehavior.cartAbandonment && (
                  <div className="w-full bg-[#E2E6EA] h-2 rounded-full overflow-hidden mt-2">
                    <div className="bg-[#D97706] h-full rounded-full" style={{ width: `${metrics.customerBehavior.cartAbandonment.abandonmentRate}%` }} />
                  </div>
                )}
              </div>
              <div className="bg-[#F4F6F9] rounded-lg p-4">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-2">Party Size (Proxy)</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-[24px] font-bold text-[#111827]">{metrics.customerBehavior.avgPartySizeProxy.toFixed(1)}</span>
                  <span className="text-[12px] text-[#6B7280]">items per table</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#6B7280] text-center py-6">No customer behavior data for selected range.</p>
        )}
      </Section>

      {/* Operational Signals */}
      <Section title="Operational Signals" badge="Kitchen" description="Spice distribution and allergen prep requirements.">
        {metrics?.operationalSignals ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#F4F6F9] rounded-lg p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-4">Spice Level Distribution</h3>
              {(() => {
                const { mild, medium, hot } = metrics.operationalSignals.spiceDistribution;
                const total = mild + medium + hot || 1;
                return (
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#6B7280]">Mild</span>
                        <span className="font-medium">{mild} ({((mild / total) * 100).toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-[#E2E6EA] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#16A34A] h-full rounded-full" style={{ width: `${(mild / total) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#6B7280]">Medium</span>
                        <span className="font-medium">{medium} ({((medium / total) * 100).toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-[#E2E6EA] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#D97706] h-full rounded-full" style={{ width: `${(medium / total) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#6B7280]">Hot / Extra Spicy</span>
                        <span className="font-medium">{hot} ({((hot / total) * 100).toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-[#E2E6EA] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#DC2626] h-full rounded-full" style={{ width: `${(hot / total) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-[#F4F6F9] rounded-lg p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-4">Allergen Frequency</h3>
              <div className="flex flex-col gap-2">
                {Object.entries(metrics.operationalSignals.allergenFrequency)
                  .sort((a, b) => b[1] - a[1])
                  .map(([allergen, count]) => (
                    <div key={allergen} className="flex justify-between items-center text-sm border-b border-[#E2E6EA] pb-2 last:border-0">
                      <span className="text-[#6B7280] capitalize">{allergen}</span>
                      <span className="font-medium text-[#111827]">{count} portions</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#6B7280] text-center py-6">No operational data for selected range.</p>
        )}
      </Section>
    </div>
  );
}
