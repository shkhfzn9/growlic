'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { getDashboardMetrics, updateOrderStatus, updateOrderEstimatedTime } from '@/actions/orders';
import { getRestaurantDetails } from '@/actions/auth';
import { getVocabulary } from '@/config/businessVocabulary';
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
  Banknote,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  ShieldCheck,
  TrendingDown,
  BarChart3,
  Activity,
} from 'lucide-react';
import { StatCard, StatusBadge, PageHeader } from '@/components/ui';
import {
  ThreeDaySalesSummary,
  DayPaymentDetail,
  PaymentSplitOverview,
  BusinessGrowthAnalysis,
  GrowthComparison,
  DailyTrendComparison,
  GrowthDiagnosis,
  HistoricalDayRecord,
  generateGrowthDiagnosis,
} from '../calculations';

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
  paymentMode?: 'cash' | 'online';
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
  threeDaySummary: ThreeDaySalesSummary;
  paymentSplit: PaymentSplitOverview;
  growthAnalysis: BusinessGrowthAnalysis;
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
  const [datePreset, setDatePreset] = useState<'today' | '2d' | '3d' | '7d' | '30d' | 'custom'>('30d');
  const [businessCategory, setBusinessCategory] = useState<string>('restaurant');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<'all' | 'cash' | 'online'>('all');

  useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        const details = await getRestaurantDetails();
        if (details?.businessCategory) {
          setBusinessCategory(details.businessCategory);
        } else if (details?.themePreset === 'rose_quartz' || details?.themePreset === 'velvet_noir') {
          setBusinessCategory('salon');
        } else if (details?.themePreset === 'carbon_crimson' || details?.themePreset === 'cyber_cyan') {
          setBusinessCategory('detailing');
        }
      } catch (err) {
        console.error('Failed to load business details in dashboard:', err);
      }
    };

    fetchBusinessInfo();
  }, []);

  const vocab = getVocabulary(businessCategory);

  const formatLocalDate = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getInitialDates = () => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 30);
    return {
      todayStr: formatLocalDate(today),
      startStr: formatLocalDate(start),
    };
  };

  const { todayStr, startStr } = getInitialDates();
  const [startDate, setStartDate] = useState(startStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Business Growth & Trajectory Engine Filter States
  type GrowthFilterPeriod = '1d' | '2d' | '3d' | '7d' | '30d' | 'quarter' | 'custom_day';
  const [growthPeriod, setGrowthPeriod] = useState<GrowthFilterPeriod>('7d');
  const [selectedParticularDate, setSelectedParticularDate] = useState<string>('');

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

  const handlePresetSelect = (preset: 'today' | '2d' | '3d' | '7d' | '30d') => {
    setDatePreset(preset);
    const today = new Date();
    const start = new Date();
    if (preset === 'today') {
      start.setDate(today.getDate());
    } else if (preset === '2d') {
      start.setDate(today.getDate() - 1);
    } else if (preset === '3d') {
      start.setDate(today.getDate() - 2);
    } else if (preset === '7d') {
      start.setDate(today.getDate() - 6);
    } else {
      start.setDate(today.getDate() - 29);
    }
    setStartDate(formatLocalDate(start));
    setEndDate(formatLocalDate(today));
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

    if (orderPaymentFilter === 'cash') {
      result = result.filter(o => (o.paymentMode || 'cash') === 'cash');
    } else if (orderPaymentFilter === 'online') {
      result = result.filter(o => o.paymentMode === 'online');
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
  }, [metrics?.ordersTable, orderSearch, orderSortField, orderSortOrder, orderUpsellFilter, orderPaymentFilter]);

  const activeGrowthComparison = useMemo(() => {
    if (!metrics?.growthAnalysis) return null;
    const { dod, twoDay, threeDay, wow, mom, quarter, historicalDays } = metrics.growthAnalysis;

    if (growthPeriod === '1d') {
      return {
        comparison: dod,
        title: 'Day on Day (DoD)',
        subtitle: 'Daily Momentum',
        periodName: 'Day-on-Day',
        badge: '1D · Today vs Yesterday',
        currentLabel: dod.current.label || 'Today',
        previousLabel: dod.previous.label || 'Yesterday',
      };
    }
    if (growthPeriod === '2d') {
      return {
        comparison: twoDay,
        title: '2-Day Pace',
        subtitle: '48-Hour Velocity',
        periodName: '2-Day Pace',
        badge: '2D · Last 2 Days vs Prior 2 Days',
        currentLabel: twoDay.current.label || 'Last 2 Days',
        previousLabel: twoDay.previous.label || 'Prior 2 Days',
      };
    }
    if (growthPeriod === '3d') {
      return {
        comparison: threeDay,
        title: '3-Day Cycle',
        subtitle: 'Short-Term Operational Pace',
        periodName: '3-Day Cycle',
        badge: '3D · Last 3 Days vs Prior 3 Days',
        currentLabel: threeDay.current.label || 'Last 3 Days',
        previousLabel: threeDay.previous.label || 'Prior 3 Days',
      };
    }
    if (growthPeriod === '7d') {
      return {
        comparison: wow,
        title: 'Week on Week (WoW)',
        subtitle: '7-Day Trajectory',
        periodName: 'Week-on-Week',
        badge: '7D · Last 7 Days vs Prior 7 Days',
        currentLabel: wow.current.label || 'Last 7 Days',
        previousLabel: wow.previous.label || 'Prior 7 Days',
      };
    }
    if (growthPeriod === '30d') {
      return {
        comparison: mom,
        title: 'Month on Month (MoM)',
        subtitle: '30-Day Trend',
        periodName: 'Month-on-Month',
        badge: '30D · Last 30 Days vs Prior 30 Days',
        currentLabel: mom.current.label || 'Last 30 Days',
        previousLabel: mom.previous.label || 'Prior 30 Days',
      };
    }
    if (growthPeriod === 'quarter') {
      return {
        comparison: quarter,
        title: 'Quarter on Quarter (QoQ)',
        subtitle: '90-Day Velocity',
        periodName: 'Quarter-on-Quarter',
        badge: '90D · Last 90 Days vs Prior 90 Days',
        currentLabel: quarter.current.label || 'Last 90 Days',
        previousLabel: quarter.previous.label || 'Prior 90 Days',
      };
    }

    // Custom Particular Day
    const targetDate = selectedParticularDate || (historicalDays[0]?.date || todayStr);
    const targetEntry = historicalDays.find(d => d.date === targetDate) || {
      date: targetDate,
      dayName: '',
      revenue: 0,
      orders: 0,
      aov: 0,
      cashRevenue: 0,
      onlineRevenue: 0,
    };

    const targetDateObj = new Date(targetDate + 'T12:00:00Z');
    const prevDate = formatLocalDate(new Date(targetDateObj.getTime() - 24 * 60 * 60 * 1000));
    const prevEntry = historicalDays.find(d => d.date === prevDate) || {
      date: prevDate,
      dayName: '',
      revenue: 0,
      orders: 0,
      aov: 0,
      cashRevenue: 0,
      onlineRevenue: 0,
    };

    // Same weekday 7 days ago
    const sameDayLastWeekDate = formatLocalDate(new Date(targetDateObj.getTime() - 7 * 24 * 60 * 60 * 1000));
    const sameDayLastWeekEntry = historicalDays.find(d => d.date === sameDayLastWeekDate) || {
      date: sameDayLastWeekDate,
      dayName: '',
      revenue: 0,
      orders: 0,
      aov: 0,
      cashRevenue: 0,
      onlineRevenue: 0,
    };

    const revGrowth = prevEntry.revenue > 0
      ? ((targetEntry.revenue - prevEntry.revenue) / prevEntry.revenue) * 100
      : (targetEntry.revenue > 0 ? 100 : 0);
    const ordGrowth = prevEntry.orders > 0
      ? ((targetEntry.orders - prevEntry.orders) / prevEntry.orders) * 100
      : (targetEntry.orders > 0 ? 100 : 0);
    const aovGrowth = prevEntry.aov > 0
      ? ((targetEntry.aov - prevEntry.aov) / prevEntry.aov) * 100
      : (targetEntry.aov > 0 ? 100 : 0);

    const customComparison: GrowthComparison = {
      current: {
        label: `${targetDate}`,
        startDate: targetDate,
        endDate: targetDate,
        revenue: targetEntry.revenue,
        orders: targetEntry.orders,
        aov: targetEntry.aov,
      },
      previous: {
        label: `${prevDate}`,
        startDate: prevDate,
        endDate: prevDate,
        revenue: prevEntry.revenue,
        orders: prevEntry.orders,
        aov: prevEntry.aov,
      },
      revenueGrowthPercent: revGrowth,
      ordersGrowthPercent: ordGrowth,
      aovGrowthPercent: aovGrowth,
      revenueDelta: targetEntry.revenue - prevEntry.revenue,
      ordersDelta: targetEntry.orders - prevEntry.orders,
      status: revGrowth >= 2 ? 'growth' : revGrowth <= -2 ? 'decline' : 'stable',
    };

    return {
      comparison: customComparison,
      title: `Day Deep-Dive: ${targetDate}`,
      subtitle: `${targetEntry.dayName ? targetEntry.dayName + ' · ' : ''}Single Day Trajectory vs Prior Day`,
      periodName: `${targetDate}`,
      badge: `Particular Day · ${targetDate}`,
      currentLabel: targetDate,
      previousLabel: prevDate,
      targetEntry,
      prevEntry,
      sameDayLastWeekEntry,
    };
  }, [metrics?.growthAnalysis, growthPeriod, selectedParticularDate, todayStr]);

  const dynamicDiagnosis = useMemo(() => {
    if (!activeGrowthComparison) return metrics?.growthAnalysis?.diagnosis || null;
    return generateGrowthDiagnosis(
      activeGrowthComparison.comparison,
      activeGrowthComparison.periodName
    );
  }, [activeGrowthComparison, metrics?.growthAnalysis?.diagnosis]);

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
          <div className="inline-flex rounded-lg border border-[#E2E6EA] overflow-hidden bg-white shadow-sm">
            <button
              onClick={() => handlePresetSelect('today')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                datePreset === 'today' ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'
              }`}
            >
              Today (1D)
            </button>
            <button
              onClick={() => handlePresetSelect('2d')}
              className={`px-3 py-1.5 text-xs font-semibold border-l border-[#E2E6EA] transition-colors ${
                datePreset === '2d' ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'
              }`}
            >
              2 Days
            </button>
            <button
              onClick={() => handlePresetSelect('3d')}
              className={`px-3 py-1.5 text-xs font-semibold border-l border-[#E2E6EA] transition-colors ${
                datePreset === '3d' ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'
              }`}
            >
              3 Days
            </button>
            <button
              onClick={() => handlePresetSelect('7d')}
              className={`px-3 py-1.5 text-xs font-semibold border-l border-[#E2E6EA] transition-colors ${
                datePreset === '7d' ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => handlePresetSelect('30d')}
              className={`px-3 py-1.5 text-xs font-semibold border-l border-[#E2E6EA] transition-colors ${
                datePreset === '30d' ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'
              }`}
            >
              30 Days
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E2E6EA] rounded-lg shadow-sm">
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
            className="p-2 bg-white border border-[#E2E6EA] rounded-lg text-[#6B7280] hover:bg-[#F4F6F9] transition-colors shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3-Day Sales Operations Glance & Payment Split */}
      {metrics?.threeDaySummary && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-[#111827]">3-Day Sales & Till Progress</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Operational Snapshot
              </span>
            </div>
            <span className="text-[12px] text-[#6B7280]">
              Day 1 (Today) vs Day 2 (Yesterday) vs Day 3 with cash & online till split
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Day 1: Today */}
            <div className="bg-white border-2 border-emerald-500/40 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/70 rounded-full blur-2xl -z-0 pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 tracking-wide uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Day 1 · Today
                  </span>
                  <span className="text-[11px] text-[#6B7280] font-medium">{metrics.threeDaySummary.day1.date}</span>
                </div>
                <div className="mt-1">
                  <div className="text-[26px] font-extrabold text-[#111827] tracking-tight">
                    ₹{Math.round(metrics.threeDaySummary.day1.totalRevenue).toLocaleString()}
                  </div>
                  <p className="text-[12px] text-[#6B7280] mt-0.5 font-medium">
                    {metrics.threeDaySummary.day1.totalOrders} {metrics.threeDaySummary.day1.totalOrders === 1 ? 'order' : 'orders'} · AOV ₹{Math.round(metrics.threeDaySummary.day1.aov)}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E2E6EA] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    💵 Cash
                  </span>
                  <span className="font-bold text-[#111827]">
                    ₹{Math.round(metrics.threeDaySummary.day1.cashRevenue).toLocaleString()}{' '}
                    <span className="text-[#6B7280] font-normal">({metrics.threeDaySummary.day1.cashOrders} · {metrics.threeDaySummary.day1.cashPercent.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    💳 Online
                  </span>
                  <span className="font-bold text-[#111827]">
                    ₹{Math.round(metrics.threeDaySummary.day1.onlineRevenue).toLocaleString()}{' '}
                    <span className="text-[#6B7280] font-normal">({metrics.threeDaySummary.day1.onlineOrders} · {metrics.threeDaySummary.day1.onlinePercent.toFixed(0)}%)</span>
                  </span>
                </div>

                <div className="w-full bg-[#E2E6EA] h-2 rounded-full overflow-hidden flex mt-1">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${metrics.threeDaySummary.day1.cashPercent}%` }}
                    title={`Cash: ${metrics.threeDaySummary.day1.cashPercent.toFixed(1)}%`}
                  />
                  <div
                    className="bg-blue-500 h-full transition-all duration-500"
                    style={{ width: `${metrics.threeDaySummary.day1.onlinePercent}%` }}
                    title={`Online: ${metrics.threeDaySummary.day1.onlinePercent.toFixed(1)}%`}
                  />
                </div>
              </div>
            </div>

            {/* Day 2: Yesterday */}
            <div className="bg-white border border-[#E2E6EA] rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F4F6F9] text-[#4B5563] tracking-wide uppercase border border-[#E2E6EA]">
                    Day 2 · Yesterday
                  </span>
                  <span className="text-[11px] text-[#6B7280] font-medium">{metrics.threeDaySummary.day2.date}</span>
                </div>
                <div className="mt-1">
                  <div className="flex items-baseline justify-between">
                    <div className="text-[26px] font-extrabold text-[#111827] tracking-tight">
                      ₹{Math.round(metrics.threeDaySummary.day2.totalRevenue).toLocaleString()}
                    </div>
                    {metrics.threeDaySummary.day2.totalRevenue > 0 && (
                      <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded ${
                        metrics.threeDaySummary.comparison.revenueGrowthVsYesterday >= 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {metrics.threeDaySummary.comparison.revenueGrowthVsYesterday >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {Math.abs(metrics.threeDaySummary.comparison.revenueGrowthVsYesterday).toFixed(1)}% DoD
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#6B7280] mt-0.5 font-medium">
                    {metrics.threeDaySummary.day2.totalOrders} {metrics.threeDaySummary.day2.totalOrders === 1 ? 'order' : 'orders'} · AOV ₹{Math.round(metrics.threeDaySummary.day2.aov)}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E2E6EA] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    💵 Cash
                  </span>
                  <span className="font-bold text-[#111827]">
                    ₹{Math.round(metrics.threeDaySummary.day2.cashRevenue).toLocaleString()}{' '}
                    <span className="text-[#6B7280] font-normal">({metrics.threeDaySummary.day2.cashOrders} · {metrics.threeDaySummary.day2.cashPercent.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    💳 Online
                  </span>
                  <span className="font-bold text-[#111827]">
                    ₹{Math.round(metrics.threeDaySummary.day2.onlineRevenue).toLocaleString()}{' '}
                    <span className="text-[#6B7280] font-normal">({metrics.threeDaySummary.day2.onlineOrders} · {metrics.threeDaySummary.day2.onlinePercent.toFixed(0)}%)</span>
                  </span>
                </div>

                <div className="w-full bg-[#E2E6EA] h-2 rounded-full overflow-hidden flex mt-1">
                  <div
                    className="bg-emerald-500 h-full"
                    style={{ width: `${metrics.threeDaySummary.day2.cashPercent}%` }}
                  />
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${metrics.threeDaySummary.day2.onlinePercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Day 3: 2 Days Ago */}
            <div className="bg-white border border-[#E2E6EA] rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F4F6F9] text-[#4B5563] tracking-wide uppercase border border-[#E2E6EA]">
                    Day 3 · 2 Days Ago
                  </span>
                  <span className="text-[11px] text-[#6B7280] font-medium">{metrics.threeDaySummary.day3.date}</span>
                </div>
                <div className="mt-1">
                  <div className="text-[26px] font-extrabold text-[#111827] tracking-tight">
                    ₹{Math.round(metrics.threeDaySummary.day3.totalRevenue).toLocaleString()}
                  </div>
                  <p className="text-[12px] text-[#6B7280] mt-0.5 font-medium">
                    {metrics.threeDaySummary.day3.totalOrders} {metrics.threeDaySummary.day3.totalOrders === 1 ? 'order' : 'orders'} · AOV ₹{Math.round(metrics.threeDaySummary.day3.aov)}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E2E6EA] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    💵 Cash
                  </span>
                  <span className="font-bold text-[#111827]">
                    ₹{Math.round(metrics.threeDaySummary.day3.cashRevenue).toLocaleString()}{' '}
                    <span className="text-[#6B7280] font-normal">({metrics.threeDaySummary.day3.cashOrders} · {metrics.threeDaySummary.day3.cashPercent.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    💳 Online
                  </span>
                  <span className="font-bold text-[#111827]">
                    ₹{Math.round(metrics.threeDaySummary.day3.onlineRevenue).toLocaleString()}{' '}
                    <span className="text-[#6B7280] font-normal">({metrics.threeDaySummary.day3.onlineOrders} · {metrics.threeDaySummary.day3.onlinePercent.toFixed(0)}%)</span>
                  </span>
                </div>

                <div className="w-full bg-[#E2E6EA] h-2 rounded-full overflow-hidden flex mt-1">
                  <div
                    className="bg-emerald-500 h-full"
                    style={{ width: `${metrics.threeDaySummary.day3.cashPercent}%` }}
                  />
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${metrics.threeDaySummary.day3.onlinePercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 4: 3-Day Cumulative Total */}
            <div className="bg-gradient-to-br from-[#111827] via-[#1E293B] to-[#0F172A] text-white rounded-xl p-5 shadow-md flex flex-col justify-between relative overflow-hidden border border-gray-800">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -z-0 pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 tracking-wide uppercase">
                    3-Day Cumulative
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">Drawer & UPI Total</span>
                </div>
                <div className="mt-1">
                  <div className="text-[26px] font-extrabold text-white tracking-tight">
                    ₹{Math.round(metrics.threeDaySummary.cumulative.totalRevenue).toLocaleString()}
                  </div>
                  <p className="text-[12px] text-gray-300 mt-0.5 font-medium">
                    {metrics.threeDaySummary.cumulative.totalOrders} total orders across 3 days
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-700/60 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    💵 Drawer Cash
                  </span>
                  <span className="font-bold text-white">
                    ₹{Math.round(metrics.threeDaySummary.cumulative.cashRevenue).toLocaleString()}{' '}
                    <span className="text-gray-400 font-normal">({metrics.threeDaySummary.cumulative.cashPercent.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    💳 Bank / UPI Settled
                  </span>
                  <span className="font-bold text-white">
                    ₹{Math.round(metrics.threeDaySummary.cumulative.onlineRevenue).toLocaleString()}{' '}
                    <span className="text-gray-400 font-normal">({metrics.threeDaySummary.cumulative.onlinePercent.toFixed(0)}%)</span>
                  </span>
                </div>

                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden flex mt-1">
                  <div
                    className="bg-emerald-400 h-full"
                    style={{ width: `${metrics.threeDaySummary.cumulative.cashPercent}%` }}
                  />
                  <div
                    className="bg-blue-400 h-full"
                    style={{ width: `${metrics.threeDaySummary.cumulative.onlinePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Business Growth & Trajectory Engine (Day on Day, Week on Week, Month on Month) */}
      {metrics?.growthAnalysis && (
        <div className="bg-white border border-[#E2E6EA] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[#111827]">Business Growth & Trajectory Engine</h2>
                  <span className="text-[12px] text-[#6B7280]">
                    Track velocity and understand exactly why sales increased or decreased Day-on-Day, Week-on-Week, and Month-on-Month
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full">
              Executive Growth Intelligence
            </span>
          </div>

          {/* Interactive Granular Period & Day Selector */}
          <div className="flex flex-col gap-3 p-4 bg-[#F8FAFC] border border-[#E2E6EA] rounded-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                  Pace & Velocity Filter:
                </span>
                <span className="text-xs text-[#6B7280]">
                  Select period or pick a particular day to analyze trajectory
                </span>
              </div>
              {activeGrowthComparison?.badge && (
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  Focus: {activeGrowthComparison.badge}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: '1d', label: 'Daily (1D)', desc: 'Today vs Yesterday' },
                { id: '2d', label: '2-Day Pace', desc: 'Last 2D vs Prior 2D' },
                { id: '3d', label: '3-Day Cycle', desc: 'Last 3D vs Prior 3D' },
                { id: '7d', label: 'Weekly (7D)', desc: 'Last 7D vs Prior 7D' },
                { id: '30d', label: 'Monthly (30D)', desc: 'Last 30D vs Prior 30D' },
                { id: 'quarter', label: 'Quarter (90D)', desc: 'Last 90D vs Prior 90D' },
                { id: 'custom_day', label: '📅 Particular Day', desc: 'Inspect Single Date' },
              ].map((tab) => {
                const isActive = growthPeriod === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setGrowthPeriod(tab.id as GrowthFilterPeriod);
                      if (tab.id === 'custom_day' && !selectedParticularDate) {
                        const defaultDate = metrics.growthAnalysis.historicalDays[0]?.date || todayStr;
                        setSelectedParticularDate(defaultDate);
                      }
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                      isActive
                        ? 'bg-[#111827] text-white shadow-sm ring-2 ring-[#111827]/10'
                        : 'bg-white text-[#4B5563] border border-[#E2E6EA] hover:bg-[#F4F6F9] hover:text-[#111827]'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* If Particular Day is active, show the interactive calendar picker and quick jump pills */}
            {growthPeriod === 'custom_day' && (
              <div className="mt-2 pt-3 border-t border-[#E2E6EA] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-[#111827]">Pick Target Date:</span>
                  <input
                    type="date"
                    value={selectedParticularDate || todayStr}
                    max={todayStr}
                    onChange={(e) => setSelectedParticularDate(e.target.value)}
                    className="px-2.5 py-1 text-xs font-semibold text-[#111827] bg-[#F4F6F9] border border-[#E2E6EA] rounded-md outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[#6B7280]">Quick Jumps:</span>
                  {[
                    { label: 'Today', daysAgo: 0 },
                    { label: 'Yesterday', daysAgo: 1 },
                    { label: '2 Days Ago', daysAgo: 2 },
                    { label: '3 Days Ago', daysAgo: 3 },
                    { label: '7 Days Ago', daysAgo: 7 },
                  ].map((preset) => {
                    const presetDate = formatLocalDate(new Date(Date.now() - preset.daysAgo * 24 * 60 * 60 * 1000));
                    const isSelected = selectedParticularDate === presetDate;
                    return (
                      <button
                        key={preset.label}
                        onClick={() => setSelectedParticularDate(presetDate)}
                        className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-[#F4F6F9] text-[#4B5563] hover:bg-[#E2E6EA]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Executive Diagnostic Spotlight Banner */}
          {(() => {
            const diag = dynamicDiagnosis || metrics.growthAnalysis.diagnosis;
            const isGrowth = diag.verdict === 'strong_growth' || diag.verdict === 'moderate_growth';
            const isStable = diag.verdict === 'stable';

            const bannerBg = isGrowth
              ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-white border-emerald-500/30'
              : isStable
              ? 'bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-white border-blue-500/30'
              : 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-white border-rose-500/30';

            const textColor = isGrowth
              ? 'text-emerald-900'
              : isStable
              ? 'text-blue-900'
              : 'text-rose-900';

            const badgeBg = isGrowth
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : isStable
              ? 'bg-blue-100 text-blue-800 border-blue-200'
              : 'bg-rose-100 text-rose-800 border-rose-200';

            return (
              <div className={`border rounded-xl p-5 ${bannerBg} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm`}>
                <div className="flex items-start gap-3.5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isGrowth ? 'bg-emerald-500 text-white shadow-emerald-200' : isStable ? 'bg-blue-600 text-white' : 'bg-rose-500 text-white'} shadow-md`}>
                    {isGrowth ? <TrendingUp className="w-6 h-6" /> : isStable ? <CheckCircle2 className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${badgeBg}`}>
                        {diag.badgeLabel}
                      </span>
                      <span className="text-[11px] font-semibold text-[#6B7280]">
                        {activeGrowthComparison?.title || 'Real-Time Trajectory'}
                      </span>
                    </div>
                    <h3 className={`text-[17px] font-black ${textColor} tracking-tight`}>
                      {diag.headline}
                    </h3>
                    <p className="text-[13px] text-[#4B5563] mt-0.5 max-w-2xl">
                      {diag.summary}
                    </p>
                  </div>
                </div>

                {/* Driver Pills */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto">
                  <div className="px-3 py-2 bg-white/90 border border-[#E2E6EA] rounded-lg shadow-2xs text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Volume Factor (Traffic)</div>
                    <div className="font-bold text-[#111827] mt-0.5">{diag.volumeDriver}</div>
                  </div>
                  <div className="px-3 py-2 bg-white/90 border border-[#E2E6EA] rounded-lg shadow-2xs text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Spend Factor (AOV)</div>
                    <div className="font-bold text-[#111827] mt-0.5">{diag.ticketDriver}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Custom Day Spotlight Hero Card if custom_day is active */}
          {growthPeriod === 'custom_day' && activeGrowthComparison?.targetEntry && (
            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-[#111827] text-white rounded-xl p-5 border border-indigo-500/30 shadow-md">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-gray-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white uppercase tracking-wider">
                      {activeGrowthComparison.targetEntry.dayName || 'Date Record'}
                    </span>
                    <h3 className="text-[17px] font-extrabold text-white">
                      Single Day Operational Audit: {activeGrowthComparison.targetEntry.date}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Complete day performance breakdown comparing vs day before and same weekday last week
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400">Day Total Revenue</div>
                    <div className="text-[22px] font-black text-emerald-400">
                      ₹{Math.round(activeGrowthComparison.targetEntry.revenue).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right pl-3 border-l border-gray-800">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400">Total Checkouts</div>
                    <div className="text-[22px] font-black text-white">
                      {activeGrowthComparison.targetEntry.orders} orders
                    </div>
                  </div>
                  <div className="text-right pl-3 border-l border-gray-800">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400">Average Spend (AOV)</div>
                    <div className="text-[22px] font-black text-blue-400">
                      ₹{Math.round(activeGrowthComparison.targetEntry.aov)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Comparative Metrics for the Day */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Day on Day shift */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-gray-400 font-medium">Day-on-Day Pace</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                      activeGrowthComparison.comparison.revenueGrowthPercent >= 0
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {activeGrowthComparison.comparison.revenueGrowthPercent >= 0 ? '+' : ''}
                      {activeGrowthComparison.comparison.revenueGrowthPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {activeGrowthComparison.comparison.revenueDelta >= 0 ? '+' : ''}₹{Math.round(activeGrowthComparison.comparison.revenueDelta).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    vs previous day ({activeGrowthComparison.previousLabel}: ₹{Math.round(activeGrowthComparison.comparison.previous.revenue).toLocaleString()})
                  </p>
                </div>

                {/* 2. Same Day Last Week Shift */}
                {activeGrowthComparison.sameDayLastWeekEntry && (() => {
                  const sRev = activeGrowthComparison.sameDayLastWeekEntry.revenue;
                  const curRev = activeGrowthComparison.targetEntry.revenue;
                  const sGrowth = sRev > 0 ? ((curRev - sRev) / sRev) * 100 : (curRev > 0 ? 100 : 0);
                  const sDelta = curRev - sRev;
                  return (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-gray-400 font-medium">Weekday Match (WoW)</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          sGrowth >= 0
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {sGrowth >= 0 ? '+' : ''}{sGrowth.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white mt-1">
                        {sDelta >= 0 ? '+' : ''}₹{Math.round(sDelta).toLocaleString()}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        vs same weekday 7 days ago (₹{Math.round(sRev).toLocaleString()})
                      </p>
                    </div>
                  );
                })()}

                {/* 3. Drawer Payment Split */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-gray-400 font-medium">Till Split</span>
                    <span className="text-[10px] text-gray-300 font-bold">
                      ₹{Math.round(activeGrowthComparison.targetEntry.cashRevenue)} cash / ₹{Math.round(activeGrowthComparison.targetEntry.onlineRevenue)} online
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden flex mt-2">
                    {(() => {
                      const total = activeGrowthComparison.targetEntry.revenue;
                      const cashP = total > 0 ? (activeGrowthComparison.targetEntry.cashRevenue / total) * 100 : 0;
                      const onlineP = total > 0 ? (activeGrowthComparison.targetEntry.onlineRevenue / total) * 100 : 0;
                      return (
                        <>
                          <div className="bg-emerald-400 h-full" style={{ width: `${cashP}%` }} />
                          <div className="bg-blue-400 h-full" style={{ width: `${onlineP}%` }} />
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1.5 font-medium">
                    <span className="text-emerald-400 font-semibold">💵 Drawer Cash</span>
                    <span className="text-blue-400 font-semibold">💳 UPI / Online</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comparative Growth Velocity Grid (Daily 1D, 2-Day, 3-Day, Weekly 7D, Monthly 30D, Quarter 90D) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                id: '1d',
                badge: 'DoD · Daily',
                title: 'Daily Momentum',
                periodData: metrics.growthAnalysis.dod,
                curText: 'Today',
                prevText: 'Yesterday',
              },
              {
                id: '2d',
                badge: '2-Day Pace',
                title: '48-Hour Velocity',
                periodData: metrics.growthAnalysis.twoDay,
                curText: 'Last 2 Days',
                prevText: 'Prior 2 Days',
              },
              {
                id: '3d',
                badge: '3-Day Cycle',
                title: '3-Day Trend',
                periodData: metrics.growthAnalysis.threeDay,
                curText: 'Last 3 Days',
                prevText: 'Prior 3 Days',
              },
              {
                id: '7d',
                badge: 'WoW · Weekly',
                title: '7-Day Trajectory',
                periodData: metrics.growthAnalysis.wow,
                curText: 'Last 7 Days',
                prevText: 'Prior 7 Days',
              },
              {
                id: '30d',
                badge: 'MoM · Monthly',
                title: '30-Day Velocity',
                periodData: metrics.growthAnalysis.mom,
                curText: 'Last 30 Days',
                prevText: 'Prior 30 Days',
              },
              {
                id: 'quarter',
                badge: 'QoQ · Quarter',
                title: 'Quarter (90D) Velocity',
                periodData: metrics.growthAnalysis.quarter,
                curText: 'Last 90 Days',
                prevText: 'Prior 90 Days',
              },
            ].map((card) => {
              const isActive = growthPeriod === card.id;
              const isGrowth = card.periodData.revenueGrowthPercent >= 0;
              return (
                <div
                  key={card.id}
                  onClick={() => setGrowthPeriod(card.id as GrowthFilterPeriod)}
                  className={`bg-white rounded-xl p-5 shadow-xs flex flex-col justify-between cursor-pointer transition-all border-2 ${
                    isActive
                      ? 'border-indigo-600 ring-4 ring-indigo-500/10 shadow-sm'
                      : 'border-[#E2E6EA] hover:border-indigo-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'text-indigo-700 bg-indigo-50 border border-indigo-200'
                        }`}>
                          {card.badge}
                        </span>
                        <h4 className="text-[15px] font-bold text-[#111827] mt-2">{card.title}</h4>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-0.5 text-[12px] font-bold px-2 py-0.5 rounded-md ${
                          isGrowth
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {isGrowth ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {isGrowth ? '+' : ''}{card.periodData.revenueGrowthPercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#F8FAFC] border border-[#E2E6EA] rounded-lg p-3 my-3">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs text-[#6B7280] font-medium">{card.curText}:</span>
                        <span className="text-[16px] font-extrabold text-[#111827]">
                          ₹{Math.round(card.periodData.current.revenue).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs text-[#6B7280]">
                        <span>{card.prevText}:</span>
                        <span className="font-semibold text-[#4B5563]">
                          ₹{Math.round(card.periodData.previous.revenue).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-[#E2E6EA] flex justify-between text-[11px]">
                        <span className="text-[#6B7280]">Difference:</span>
                        <span className={`font-bold ${card.periodData.revenueDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {card.periodData.revenueDelta >= 0 ? '+' : ''}₹{Math.round(card.periodData.revenueDelta).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#E2E6EA] text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#6B7280] block font-semibold">Orders (Volume)</span>
                      <span className="font-bold text-[#111827]">
                        {card.periodData.current.orders}{' '}
                        <span className={`text-[10px] font-bold ${card.periodData.ordersGrowthPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          ({card.periodData.ordersGrowthPercent >= 0 ? '+' : ''}{card.periodData.ordersGrowthPercent.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#6B7280] block font-semibold">Avg Ticket (AOV)</span>
                      <span className="font-bold text-[#111827]">
                        ₹{Math.round(card.periodData.current.aov)}{' '}
                        <span className={`text-[10px] font-bold ${card.periodData.aovGrowthPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          ({card.periodData.aovGrowthPercent >= 0 ? '+' : ''}{card.periodData.aovGrowthPercent.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Week-on-Week Day-by-Day Matching Table (This Mon vs Last Mon, etc.) */}
          {metrics.growthAnalysis.wowDayBreakdown.length > 0 && (
            <div className="border border-[#E2E6EA] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E6EA] flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                    Day-by-Day Matching (This Week vs. Exactly Same Day Last Week)
                  </h4>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    Apples-to-apples weekday comparison to identify which days are gaining or dropping sales
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-[#6B7280] bg-white border border-[#E2E6EA] px-2 py-1 rounded">
                  7-Day Cycle
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white border-b border-[#E2E6EA] text-[#6B7280]">
                      <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-[10px]">Weekday</th>
                      <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider text-[10px] text-[#111827]">This Week (₹)</th>
                      <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider text-[10px] text-[#6B7280]">Last Week (₹)</th>
                      <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider text-[10px]">Variance (₹)</th>
                      <th className="px-4 py-2.5 text-center font-bold uppercase tracking-wider text-[10px]">Pace</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6EA]">
                    {metrics.growthAnalysis.wowDayBreakdown.map((row) => {
                      const diff = row.currentRevenue - row.previousRevenue;
                      const isPositive = diff >= 0;
                      return (
                        <tr key={row.currentDate} className="hover:bg-[#F8FAFC]/80 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-[#111827]">
                            {row.dayName}{' '}
                            <span className="text-[10px] text-[#6B7280] font-normal">({row.currentDate})</span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-extrabold text-[#111827]">
                            ₹{Math.round(row.currentRevenue).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right text-[#6B7280] font-medium">
                            ₹{Math.round(row.previousRevenue).toLocaleString()}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-bold ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isPositive ? '+' : ''}₹{Math.round(diff).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {isPositive ? '+' : ''}{row.growthPercent.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Mode Split & Till Reconciliation Section */}
      {metrics?.paymentSplit && (
        <div className="bg-white border border-[#E2E6EA] rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-bold text-[#111827]">Cash vs. Online Settlement & Till Reconciliation</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  Till Audit
                </span>
              </div>
              <p className="text-[13px] text-[#6B7280] mt-0.5">
                Daily physical cash drawer accounting vs. UPI & card digital settlements for the active period ({startDate} to {endDate})
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#4B5563] bg-[#F4F6F9] px-3 py-1.5 rounded-lg border border-[#E2E6EA]">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Till Balance Ready
            </div>
          </div>

          {/* Two Big Highlight Cards: Cash Drawer vs Online Settlement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Cash Card */}
            <div className="bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-200/80 rounded-xl p-5 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#111827]">💵 Cash Register Drawer</h3>
                      <span className="text-[11px] text-emerald-800 font-medium">Physical cash collected in drawer</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-[28px] font-extrabold text-emerald-800 tracking-tight">
                      ₹{Math.round(metrics.paymentSplit.cashRevenue).toLocaleString()}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#4B5563]">
                      <span className="font-semibold text-[#111827]">{metrics.paymentSplit.cashOrders} cash orders</span>
                      <span>·</span>
                      <span className="font-semibold text-emerald-700">{metrics.paymentSplit.cashPercent.toFixed(1)}% of total revenue</span>
                      <span>·</span>
                      <span>Avg. cash ticket: ₹{Math.round(metrics.paymentSplit.cashRevenue / (metrics.paymentSplit.cashOrders || 1))}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-2.5 bg-emerald-100/60 rounded-lg border border-emerald-200/50 text-[11px] text-emerald-900 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Reconcile this exact amount with physical currency in your cash drawer at shift close.</span>
              </div>
            </div>

            {/* Online Card */}
            <div className="bg-gradient-to-br from-blue-50/60 to-white border border-blue-200/80 rounded-xl p-5 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#111827]">💳 Online & UPI Collections</h3>
                      <span className="text-[11px] text-blue-800 font-medium">Direct bank & gateway settlements</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-[28px] font-extrabold text-blue-800 tracking-tight">
                      ₹{Math.round(metrics.paymentSplit.onlineRevenue).toLocaleString()}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#4B5563]">
                      <span className="font-semibold text-[#111827]">{metrics.paymentSplit.onlineOrders} online orders</span>
                      <span>·</span>
                      <span className="font-semibold text-blue-700">{metrics.paymentSplit.onlinePercent.toFixed(1)}% of total revenue</span>
                      <span>·</span>
                      <span>Avg. digital ticket: ₹{Math.round(metrics.paymentSplit.onlineRevenue / (metrics.paymentSplit.onlineOrders || 1))}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-2.5 bg-blue-100/60 rounded-lg border border-blue-200/50 text-[11px] text-blue-900 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>Verify this amount against UPI QR merchant dashboard & card swipe EDC settlement slips.</span>
              </div>
            </div>
          </div>

          {/* Proportional Split Visual Bar */}
          <div className="bg-[#F8FAFC] border border-[#E2E6EA] rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center text-xs font-semibold mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[#111827]">Cash Share: {metrics.paymentSplit.cashPercent.toFixed(1)}%</span>
                <span className="text-[#6B7280] font-normal">(₹{Math.round(metrics.paymentSplit.cashRevenue).toLocaleString()})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-[#111827]">Online Share: {metrics.paymentSplit.onlinePercent.toFixed(1)}%</span>
                <span className="text-[#6B7280] font-normal">(₹{Math.round(metrics.paymentSplit.onlineRevenue).toLocaleString()})</span>
              </div>
            </div>

            <div className="w-full bg-[#E2E6EA] h-3 rounded-full overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${metrics.paymentSplit.cashPercent}%` }}
              />
              <div
                className="bg-blue-500 h-full transition-all duration-500"
                style={{ width: `${metrics.paymentSplit.onlinePercent}%` }}
              />
            </div>
          </div>

          {/* Daily Till Settlement Table */}
          {metrics.paymentSplit.dailyBreakdown.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                  Day-by-Day Till Settlement Breakdown
                </h3>
                <span className="text-[11px] text-[#6B7280]">Sorted newest first</span>
              </div>
              <div className="border border-[#E2E6EA] rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F4F6F9] border-b border-[#E2E6EA]">
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Date</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Total Revenue</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-800">💵 Cash in Drawer</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-800">💳 Online Settled</th>
                      <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Cash / Online Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6EA]">
                    {metrics.paymentSplit.dailyBreakdown.map((row) => (
                      <tr key={row.date} className="hover:bg-[#F4F6F9]/50 transition-colors">
                        <td className="px-3 py-2.5 font-semibold text-[#111827]">
                          {row.date}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-[#111827]">
                          ₹{Math.round(row.totalRevenue).toLocaleString()}
                          <span className="text-[11px] text-[#6B7280] font-normal block">{row.totalOrders} {row.totalOrders === 1 ? 'order' : 'orders'}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-800">
                          ₹{Math.round(row.cashRevenue).toLocaleString()}
                          <span className="text-[11px] text-emerald-700 font-medium block">
                            {row.cashOrders} orders ({row.cashPercent.toFixed(0)}%)
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-blue-800">
                          ₹{Math.round(row.onlineRevenue).toLocaleString()}
                          <span className="text-[11px] text-blue-700 font-medium block">
                            {row.onlineOrders} orders ({row.onlinePercent.toFixed(0)}%)
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="w-28 mx-auto bg-[#E2E6EA] h-2 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full" style={{ width: `${row.cashPercent}%` }} />
                            <div className="bg-blue-500 h-full" style={{ width: `${row.onlinePercent}%` }} />
                          </div>
                          <span className="text-[10px] text-[#6B7280] mt-1 block font-medium">
                            {row.cashPercent.toFixed(0)}% cash / {row.onlinePercent.toFixed(0)}% online
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

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
                    value={orderPaymentFilter}
                    onChange={(e) => setOrderPaymentFilter(e.target.value as any)}
                    className="px-3 py-1.5 text-xs border border-[#E2E6EA] rounded-lg bg-white outline-none cursor-pointer"
                  >
                    <option value="all">All Payments</option>
                    <option value="cash">💵 Cash Only</option>
                    <option value="online">💳 Online Only</option>
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
                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Payment</th>
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
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide ${
                                order.paymentMode === 'online'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {order.paymentMode === 'online' ? '💳 Online' : '💵 Cash'}
                              </span>
                            </td>
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
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-2">
                  {businessCategory === 'restaurant' ? 'Party Size (Proxy)' : `${vocab.itemNoun} Volume (Proxy)`}
                </h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-[24px] font-bold text-[#111827]">{metrics.customerBehavior.avgPartySizeProxy.toFixed(1)}</span>
                  <span className="text-[12px] text-[#6B7280]">
                    items per {vocab.tableNoun.split(' ')[0].toLowerCase() || 'order'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#6B7280] text-center py-6">No customer behavior data for selected range.</p>
        )}
      </Section>

      {/* Operational Signals */}
      <Section
        title="Operational Signals"
        badge={vocab.prepArea}
        description={
          businessCategory === 'salon'
            ? 'Treatment duration and products used analysis.'
            : businessCategory === 'detailing'
            ? 'Work & cure time distribution and package signals.'
            : businessCategory === 'retail'
            ? 'Fulfillment packing times and product material signals.'
            : 'Spice distribution and allergen prep requirements.'
        }
      >
        {metrics?.operationalSignals ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#F4F6F9] rounded-lg p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-4">
                {businessCategory === 'salon'
                  ? 'Service Duration Distribution'
                  : businessCategory === 'detailing'
                  ? 'Work & Cure Duration Breakdown'
                  : businessCategory === 'retail'
                  ? 'Dispatch & Packing Time Breakdown'
                  : 'Spice Level Distribution'}
              </h3>
              {(() => {
                const { mild, medium, hot } = metrics.operationalSignals.spiceDistribution;
                const total = mild + medium + hot || 1;
                const label1 = businessCategory === 'salon' ? 'Express (<30m)' : businessCategory === 'detailing' ? 'Express Wash (<60m)' : businessCategory === 'retail' ? 'Express (<10m)' : 'Mild';
                const label2 = businessCategory === 'salon' ? 'Standard (30-60m)' : businessCategory === 'detailing' ? 'Full Detail (60-180m)' : businessCategory === 'retail' ? 'Standard (10-30m)' : 'Medium';
                const label3 = businessCategory === 'salon' ? 'Deep Treatment (>60m)' : businessCategory === 'detailing' ? 'Ceramic Coating (>180m)' : businessCategory === 'retail' ? 'Special Order (>30m)' : 'Hot / Extra Spicy';

                return (
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#6B7280]">{label1}</span>
                        <span className="font-medium">{mild} ({((mild / total) * 100).toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-[#E2E6EA] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#16A34A] h-full rounded-full" style={{ width: `${(mild / total) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#6B7280]">{label2}</span>
                        <span className="font-medium">{medium} ({((medium / total) * 100).toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-[#E2E6EA] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#D97706] h-full rounded-full" style={{ width: `${(medium / total) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#6B7280]">{label3}</span>
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
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-4">
                {vocab.suppliesLabel} Frequency
              </h3>
              <div className="flex flex-col gap-2">
                {Object.entries(metrics.operationalSignals.allergenFrequency).length > 0 ? (
                  Object.entries(metrics.operationalSignals.allergenFrequency)
                    .sort((a, b) => b[1] - a[1])
                    .map(([item, count]) => (
                      <div key={item} className="flex justify-between items-center text-sm border-b border-[#E2E6EA] pb-2 last:border-0">
                        <span className="text-[#6B7280] capitalize">{item}</span>
                        <span className="font-medium text-[#111827]">{count} units</span>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-[#6B7280] italic">No material/ingredient signals recorded for this range.</p>
                )}
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
