'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import {
  Package,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Calendar,
  Layers,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Flame,
  Zap,
  Clock,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Boxes,
  HelpCircle,
  X,
  Edit2,
  CalendarDays,
} from 'lucide-react';
import {
  InventoryAnalyticsReport,
  InventoryTimePeriod,
  ItemSalesMetric,
} from '../types';
import {
  getInventoryAnalyticsAction,
  updateItemStockAction,
  toggleItemAvailabilityAction,
} from '@/actions/inventory';
import { getRestaurantDetails } from '@/actions/auth';
import { getVocabulary } from '@/config/businessVocabulary';

export default function InventoryPage() {
  const [period, setPeriod] = useState<InventoryTimePeriod>('today');
  const [singleDate, setSingleDate] = useState<string>(() => {
    // Current IST date string
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
    return ist.toISOString().split('T')[0];
  });

  const [data, setData] = useState<InventoryAnalyticsReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  // Business Vocabulary
  const [businessCategory, setBusinessCategory] = useState<string>('restaurant');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [velocityFilter, setVelocityFilter] = useState<'all' | 'fast' | 'moderate' | 'zero'>('all');
  const [sortBy, setSortBy] = useState<'quantity' | 'revenue' | 'name'>('quantity');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Stock edit modal
  const [editingItem, setEditingItem] = useState<ItemSalesMetric | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [trackInventoryEnabled, setTrackInventoryEnabled] = useState<boolean>(false);
  const [savingStock, setSavingStock] = useState<boolean>(false);

  // Success toast
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    const fetchBiz = async () => {
      try {
        const details = await getRestaurantDetails();
        if (details?.businessCategory) {
          setBusinessCategory(details.businessCategory);
        }
      } catch (e) {
        // quiet fallback
      }
    };
    fetchBiz();
  }, []);

  const vocab = getVocabulary(businessCategory);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadData = async (targetPeriod: InventoryTimePeriod, targetDate?: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await getInventoryAnalyticsAction({
        period: targetPeriod,
        singleDate: targetDate,
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load inventory data:', err);
      setError(err?.message || 'Failed to load inventory analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(period, singleDate);
  }, [period, singleDate]);

  // Handle period change
  const handlePeriodChange = (newPeriod: InventoryTimePeriod) => {
    setPeriod(newPeriod);
  };

  // Availability Toggle
  const handleToggleAvailability = async (item: ItemSalesMetric) => {
    const newStatus = !item.available;
    // Optimistic update
    if (data) {
      setData({
        ...data,
        items: data.items.map((it) =>
          it.itemId === item.itemId ? { ...it, available: newStatus } : it
        ),
      });
    }

    try {
      await toggleItemAvailabilityAction(item.itemId, newStatus);
      showToast(`${item.name} is now marked ${newStatus ? 'In Stock' : 'Out of Stock'}`);
    } catch (err: any) {
      // Revert on failure
      loadData(period, singleDate);
      showToast(`Error: ${err?.message || 'Failed to update availability'}`);
    }
  };

  // Stock Update Submit
  const handleSaveStock = async () => {
    if (!editingItem) return;
    setSavingStock(true);
    try {
      await updateItemStockAction(
        editingItem.itemId,
        newStockQty,
        trackInventoryEnabled
      );
      showToast(`Stock updated for ${editingItem.name}`);
      setEditingItem(null);
      loadData(period, singleDate);
    } catch (err: any) {
      showToast(`Error: ${err?.message || 'Failed to update stock'}`);
    } finally {
      setSavingStock(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!data || !data.items.length) return;

    const headers = [
      'Rank',
      `${vocab.itemNoun} Name`,
      'Category',
      'Price (INR)',
      'Quantity Sold',
      'Revenue (INR)',
      'Revenue Share (%)',
      'Volume Share (%)',
      'Velocity Status',
      'Stock Status',
      'Stock Quantity',
    ];

    const rows = data.items.map((item) => [
      item.rank,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      item.price,
      item.quantitySold,
      item.revenue,
      item.revenueSharePercent,
      item.volumeSharePercent,
      item.velocityStatus,
      item.available ? 'In Stock' : 'Out of Stock',
      item.stockQuantity === -1 ? 'Unlimited' : item.stockQuantity,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `inventory_sales_${period}_${singleDate || 'report'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Sort Items
  const filteredItems = useMemo(() => {
    if (!data) return [];
    let list = [...data.items];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((it) => it.category === selectedCategory);
    }

    // Velocity filter
    if (velocityFilter === 'fast') {
      list = list.filter((it) => it.velocityStatus === 'fast_mover');
    } else if (velocityFilter === 'moderate') {
      list = list.filter((it) => it.velocityStatus === 'moderate');
    } else if (velocityFilter === 'zero') {
      list = list.filter((it) => it.velocityStatus === 'zero_sales');
    }

    // Sorting
    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'quantity') {
        diff = a.quantitySold - b.quantitySold;
      } else if (sortBy === 'revenue') {
        diff = a.revenue - b.revenue;
      } else if (sortBy === 'name') {
        diff = a.name.localeCompare(b.name);
      }
      return sortOrder === 'desc' ? -diff : diff;
    });

    return list;
  }, [data, searchQuery, selectedCategory, velocityFilter, sortBy, sortOrder]);

  const uniqueCategories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.items.map((it) => it.category))).filter(Boolean);
  }, [data]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1300px] mx-auto pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111827] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10 text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#E2E6EA] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#C0181A]/10 text-[#C0181A] rounded-xl">
              <Boxes className="w-6 h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
              Inventory & {vocab.itemsNoun} Analytics
            </h1>
            <span className="bg-[#FEF2F2] text-[#C0181A] border border-[#C0181A]/20 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
              Live Intel
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            Real-time breakdown of your most selling {vocab.itemsNoun.toLowerCase()}, quantities sold, and business revenue impact.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => loadData(period, singleDate)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#374151] bg-[#F4F6F9] hover:bg-[#E5E9EE] border border-[#E2E6EA] rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#C0181A]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!data || !data.items.length}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1C2333] hover:bg-[#111827] rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* TIME PERIOD SELECTOR BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#1C2333] text-white p-3 sm:p-4 rounded-2xl shadow-md">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 [scrollbar-width:none]">
          <span className="text-xs font-bold text-white/50 px-2 uppercase tracking-wider hidden sm:inline">
            Period:
          </span>

          <button
            onClick={() => handlePeriodChange('today')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              period === 'today'
                ? 'bg-[#C0181A] text-white shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            ☀️ Today
          </button>

          <button
            onClick={() => handlePeriodChange('tomorrow')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
              period === 'tomorrow'
                ? 'bg-[#C0181A] text-white shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>Tomorrow (Forecast)</span>
          </button>

          <button
            onClick={() => handlePeriodChange('yesterday')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              period === 'yesterday'
                ? 'bg-[#C0181A] text-white shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            ⏪ Yesterday
          </button>

          <button
            onClick={() => handlePeriodChange('week')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              period === 'week'
                ? 'bg-[#C0181A] text-white shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            📊 This Week
          </button>

          <button
            onClick={() => handlePeriodChange('month')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              period === 'month'
                ? 'bg-[#C0181A] text-white shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            🗓️ This Month
          </button>

          <button
            onClick={() => handlePeriodChange('single_date')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              period === 'single_date'
                ? 'bg-[#C0181A] text-white shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Pick Single Date</span>
          </button>
        </div>

        {/* SINGLE DATE PICKER INPUT */}
        {period === 'single_date' && (
          <div className="flex items-center gap-2 bg-[#2A3347] px-3 py-1.5 rounded-xl border border-white/15 animate-fade-in self-start lg:self-auto">
            <span className="text-xs text-white/70 font-medium">Select Date:</span>
            <input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer [color-scheme:dark]"
            />
          </div>
        )}
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="bg-[#FEF2F2] border border-[#C0181A]/20 text-[#C0181A] p-4 rounded-2xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Error loading analytics:</span> {error}
          </div>
          <button
            onClick={() => loadData(period, singleDate)}
            className="text-xs font-extrabold underline hover:text-[#901012] cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* HERO SECTION: TOP SELLING ITEM & REVENUE LEADER */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* CARD 1: #1 MOST SELLING ITEM */}
          <div className="bg-gradient-to-br from-[#1C2333] to-[#111827] text-white p-6 rounded-2xl shadow-md border border-white/10 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Flame className="w-24 h-24 text-yellow-500" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>🏆</span> #1 Most Sold {vocab.itemNoun}
                </span>
                <span className="text-xs font-bold text-white/50">{data.periodLabel}</span>
              </div>

              {data.summary.topSellingItem ? (
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight line-clamp-1">
                    {data.summary.topSellingItem.name}
                  </h3>
                  <span className="text-xs text-white/60 font-medium block mt-0.5">
                    Category: {data.summary.topSellingItem.category}
                  </span>

                  <div className="mt-4 flex items-baseline gap-3">
                    <span className="text-3xl font-black text-yellow-400">
                      {data.summary.topSellingItem.quantity}
                    </span>
                    <span className="text-xs font-semibold text-white/70 uppercase">
                      Units Sold
                    </span>
                  </div>

                  <div className="mt-3 w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, data.summary.topSellingItem.volumeSharePercent))}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-white/50 mt-1 block">
                    Represents {data.summary.topSellingItem.volumeSharePercent}% of all sold units in this period
                  </span>
                </div>
              ) : (
                <div className="py-6 text-center text-white/40 text-xs">
                  No {vocab.itemsNoun.toLowerCase()} sold yet in this period.
                </div>
              )}
            </div>

            {data.summary.topSellingItem && (
              <div className="mt-5 pt-3 border-t border-white/10 flex justify-between items-center text-xs">
                <span className="text-white/60">Revenue Impact:</span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  ₹{data.summary.topSellingItem.revenue.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>

          {/* CARD 2: #1 TOP GROSSING (REVENUE DRIVER) */}
          <div className="bg-gradient-to-br from-[#1C2333] to-[#111827] text-white p-6 rounded-2xl shadow-md border border-white/10 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <DollarSign className="w-24 h-24 text-emerald-400" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>💰</span> Top Revenue Driver
                </span>
                <span className="text-xs font-bold text-white/50">{data.periodLabel}</span>
              </div>

              {data.summary.topGrossingItem ? (
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight line-clamp-1">
                    {data.summary.topGrossingItem.name}
                  </h3>
                  <span className="text-xs text-white/60 font-medium block mt-0.5">
                    Category: {data.summary.topGrossingItem.category}
                  </span>

                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-400">
                      ₹{data.summary.topGrossingItem.revenue.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-semibold text-white/70 uppercase">
                      Revenue
                    </span>
                  </div>

                  <div className="mt-3 w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, data.summary.topGrossingItem.revenueSharePercent))}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-white/50 mt-1 block">
                    Generated {data.summary.topGrossingItem.revenueSharePercent}% of total business earnings
                  </span>
                </div>
              ) : (
                <div className="py-6 text-center text-white/40 text-xs">
                  No revenue generated yet in this period.
                </div>
              )}
            </div>

            {data.summary.topGrossingItem && (
              <div className="mt-5 pt-3 border-t border-white/10 flex justify-between items-center text-xs">
                <span className="text-white/60">Volume Sold:</span>
                <span className="font-extrabold text-white text-sm">
                  {data.summary.topGrossingItem.quantity} units
                </span>
              </div>
            )}
          </div>

          {/* CARD 3: CATALOG VELOCITY & COVERAGE */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#E2E6EA] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-[#6B7280]">
                  Catalog Velocity
                </span>
                <span className="text-xs font-extrabold text-[#C0181A]">
                  {data.summary.catalogActivePercent}% Active
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-[#111827]">
                  {data.summary.activeItemsSoldCount}
                </span>
                <span className="text-sm font-bold text-[#6B7280]">
                  / {data.summary.totalCatalogItemsCount} {vocab.itemsNoun} Sold
                </span>
              </div>

              {/* Velocity Pills */}
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="bg-[#F0FDF4] border border-emerald-200 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1 text-emerald-800 font-bold">
                    <Flame className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Fast Movers</span>
                  </div>
                  <span className="text-lg font-black text-emerald-700 mt-1 block">
                    {data.summary.fastMoversCount}
                  </span>
                </div>

                <div className="bg-[#FEF2F2] border border-rose-200 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1 text-rose-800 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Zero Sales</span>
                  </div>
                  <span className="text-lg font-black text-rose-700 mt-1 block">
                    {data.summary.zeroSalesCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2E6EA] flex justify-between items-center text-xs">
              <span className="text-[#6B7280]">Avg Basket Depth:</span>
              <span className="font-extrabold text-[#111827]">
                {data.summary.avgBasketSize} units / order
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SUMMARY KPI STRIP */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E2E6EA] shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase">
              <ShoppingCart className="w-4 h-4 text-[#C0181A]" />
              <span>Total Quantity</span>
            </div>
            <div className="text-2xl font-black text-[#111827] mt-1.5">
              {data.summary.totalQuantitySold.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-[#6B7280] font-medium">Units sold in period</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E6EA] shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Total Item Revenue</span>
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1.5">
              ₹{data.summary.totalItemRevenue.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-[#6B7280] font-medium">Gross sales generated</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E6EA] shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Total Orders</span>
            </div>
            <div className="text-2xl font-black text-[#111827] mt-1.5">
              {data.summary.totalOrdersCount.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-[#6B7280] font-medium">Fulfilled transactions</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E6EA] shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>Avg Selling Price</span>
            </div>
            <div className="text-2xl font-black text-[#111827] mt-1.5">
              ₹{data.summary.avgItemPrice.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-[#6B7280] font-medium">Per item realized</span>
          </div>
        </div>
      )}

      {/* TOMORROW FORECAST & SCHEDULED BOOKINGS (Special Display) */}
      {data?.tomorrowForecast && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-blue-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-blue-500/20 text-blue-300 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-black text-white">
                  Tomorrow&apos;s Demand Forecast ({data.tomorrowForecast.dayName}, {data.tomorrowForecast.dateStr})
                </h3>
                <p className="text-xs text-white/60">
                  Projected demand and confirmed scheduled appointments based on historical velocity.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/10 px-4 py-2 rounded-xl text-xs">
              <div>
                <span className="text-white/60 block text-[10px] uppercase font-bold">Projected Demand</span>
                <span className="text-sm font-black text-amber-300">~{data.tomorrowForecast.projectedTotalUnits} units</span>
              </div>
              <div className="h-6 w-px bg-white/20" />
              <div>
                <span className="text-white/60 block text-[10px] uppercase font-bold">Projected Revenue</span>
                <span className="text-sm font-black text-emerald-300">₹{data.tomorrowForecast.projectedTotalRevenue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            {/* Projected Top Items */}
            <div>
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider block mb-2">
                Expected High Demand {vocab.itemsNoun}:
              </span>
              <div className="flex flex-col gap-2">
                {data.tomorrowForecast.topForecastItems.map((fItem, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-white/5 hover:bg-white/10 px-3.5 py-2.5 rounded-xl border border-white/5 text-xs transition-colors"
                  >
                    <div>
                      <span className="font-bold text-white">{fItem.name}</span>
                      <span className="text-[11px] text-white/50 block">{fItem.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-amber-300">~{fItem.expectedQty} units</span>
                      <span className="text-[11px] text-emerald-300 block">₹{fItem.expectedRevenue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scheduled Advance Bookings */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white/70 uppercase tracking-wider">
                  Confirmed Scheduled Orders:
                </span>
                <span className="text-xs font-extrabold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-md">
                  {data.tomorrowForecast.scheduledOrdersCount} Booked
                </span>
              </div>

              {data.tomorrowForecast.scheduledBookings.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {data.tomorrowForecast.scheduledBookings.map((booking, bIdx) => (
                    <div
                      key={bIdx}
                      className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs flex justify-between items-start"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{booking.customerName}</span>
                          <span className="text-[10px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded">
                            {booking.time}
                          </span>
                        </div>
                        <span className="text-[11px] text-white/60 line-clamp-1 mt-0.5">
                          {booking.itemsSummary}
                        </span>
                      </div>
                      <span className="font-black text-emerald-300 whitespace-nowrap ml-2">
                        ₹{booking.total}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 p-4 rounded-xl text-center text-xs text-white/50">
                  No advance orders scheduled yet for tomorrow. Prep stations will operate on walk-in & regular velocity.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STRATEGIC BUSINESS INSIGHTS */}
      {data?.insights && data.insights.length > 0 && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E2E6EA] shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#C0181A]" />
            <h3 className="text-base font-black text-[#111827]">
              Business Situation & Strategic Recommendations
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {data.insights.map((insight, iIdx) => {
              const bg =
                insight.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : insight.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : insight.type === 'opportunity'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900';

              const icon =
                insight.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : insight.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : insight.type === 'opportunity' ? (
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                );

              return (
                <div key={iIdx} className={`p-4 rounded-xl border ${bg} flex items-start gap-3`}>
                  {icon}
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-wide">{insight.title}</h4>
                    <p className="text-xs opacity-90 mt-1 leading-relaxed">{insight.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CATEGORY REVENUE & VOLUME BREAKDOWN */}
      {data?.categories && data.categories.length > 0 && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E2E6EA] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-[#111827]">
                Category Contribution Breakdown
              </h3>
              <p className="text-xs text-[#6B7280]">
                See which menu categories drive your volume and earnings.
              </p>
            </div>
            <span className="text-xs font-bold text-[#6B7280]">
              {data.categories.length} Categories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {data.categories.map((cat, cIdx) => (
              <div
                key={cIdx}
                className="bg-[#F8FAFC] border border-[#E2E6EA] p-4 rounded-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-black text-sm text-[#111827] line-clamp-1">{cat.category}</span>
                    <span className="text-xs font-extrabold text-emerald-600">
                      ₹{cat.revenue.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-[#6B7280] mb-1.5">
                    <span>{cat.quantitySold} units sold</span>
                    <span className="font-bold">{cat.revenueSharePercent}% Revenue</span>
                  </div>

                  <div className="w-full bg-[#E2E6EA] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#C0181A] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(3, cat.revenueSharePercent))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INVENTORY & ITEM SALES BREAKDOWN TABLE */}
      <div className="bg-white rounded-2xl border border-[#E2E6EA] shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-6 border-b border-[#E2E6EA] flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#111827]">
                {vocab.itemsNoun} Sales & Stock Status
              </h3>
              <p className="text-xs text-[#6B7280]">
                Detailed list of all items with quantity sold, revenue generated, velocity, and stock control.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              {/* Velocity Pills */}
              <button
                onClick={() => setVelocityFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  velocityFilter === 'all'
                    ? 'bg-[#111827] text-white'
                    : 'bg-[#F4F6F9] text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                All ({data?.items.length || 0})
              </button>
              <button
                onClick={() => setVelocityFilter('fast')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  velocityFilter === 'fast'
                    ? 'bg-[#111827] text-white'
                    : 'bg-[#F4F6F9] text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                <Flame className="w-3 h-3 text-orange-500" />
                <span>Fast</span>
              </button>
              <button
                onClick={() => setVelocityFilter('zero')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  velocityFilter === 'zero'
                    ? 'bg-[#111827] text-white'
                    : 'bg-[#F4F6F9] text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-rose-500" />
                <span>Zero Sales</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${vocab.itemsNoun.toLowerCase()} by name or category...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#F4F6F9] border border-[#E2E6EA] rounded-xl text-xs text-[#111827] outline-none focus:border-[#C0181A] focus:ring-1 focus:ring-[#C0181A]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#F4F6F9] border border-[#E2E6EA] rounded-xl px-3 py-2 text-xs font-bold text-[#374151] outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, ord] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(ord as any);
                }}
                className="bg-[#F4F6F9] border border-[#E2E6EA] rounded-xl px-3 py-2 text-xs font-bold text-[#374151] outline-none cursor-pointer"
              >
                <option value="quantity-desc">Qty: High to Low</option>
                <option value="quantity-asc">Qty: Low to High</option>
                <option value="revenue-desc">Revenue: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E6EA] text-[11px] font-black uppercase text-[#6B7280] tracking-wider">
                <th className="py-3.5 px-4"># Rank</th>
                <th className="py-3.5 px-4">{vocab.itemNoun} Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Price</th>
                <th className="py-3.5 px-4 text-center">Quantity Sold</th>
                <th className="py-3.5 px-4 text-right">Revenue</th>
                <th className="py-3.5 px-4 text-center">Velocity</th>
                <th className="py-3.5 px-4 text-center">Stock & Availability</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6EA] text-xs">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr
                    key={item.itemId}
                    className="hover:bg-[#F8FAFC] transition-colors group"
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 font-black text-[#6B7280]">
                      {item.rank <= 3 && item.quantitySold > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-800 text-xs font-black">
                          {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        `#${item.rank}`
                      )}
                    </td>

                    {/* Item Name */}
                    <td className="py-3.5 px-4 font-bold text-[#111827]">
                      <div className="flex items-center gap-2">
                        <span className="line-clamp-1">{item.name}</span>
                        {item.isTopSeller && (
                          <span className="bg-yellow-100 text-yellow-800 text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0">
                            Top Seller
                          </span>
                        )}
                        {item.isTopGrossing && (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0">
                            Revenue Leader
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-[#6B7280]">
                      <span className="bg-[#F4F6F9] border border-[#E2E6EA] px-2 py-0.5 rounded-md text-[11px] font-medium">
                        {item.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-[#111827]">
                      ₹{item.price}
                    </td>

                    {/* Quantity Sold */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-black text-sm text-[#111827]">
                          {item.quantitySold}
                        </span>
                        {item.volumeSharePercent > 0 && (
                          <span className="text-[10px] text-[#6B7280]">
                            {item.volumeSharePercent}% share
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Revenue */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-black text-sm text-emerald-600">
                          ₹{item.revenue.toLocaleString('en-IN')}
                        </span>
                        {item.revenueSharePercent > 0 && (
                          <span className="text-[10px] text-[#6B7280]">
                            {item.revenueSharePercent}% total
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Velocity Status */}
                    <td className="py-3.5 px-4 text-center">
                      {item.velocityStatus === 'fast_mover' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                          <Flame className="w-3 h-3 text-emerald-600" />
                          <span>Fast Mover</span>
                        </span>
                      ) : item.velocityStatus === 'moderate' ? (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                          <Zap className="w-3 h-3 text-blue-600" />
                          <span>Moderate</span>
                        </span>
                      ) : item.velocityStatus === 'slow_mover' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Slow Mover</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Zero Sales</span>
                        </span>
                      )}
                    </td>

                    {/* Stock & Availability Control */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            item.available ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                          title={`Click to mark ${item.available ? 'Out of Stock' : 'In Stock'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              item.available ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        <span
                          className={`text-[11px] font-extrabold ${
                            item.available ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {item.available ? 'In Stock' : 'Out of Stock'}
                        </span>

                        {item.trackInventory && item.stockQuantity !== -1 && (
                          <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                            ({item.stockQuantity} left)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setNewStockQty(item.stockQuantity === -1 ? 50 : (item.stockQuantity || 0));
                          setTrackInventoryEnabled(!!item.trackInventory);
                        }}
                        className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F4F6F9] transition-colors cursor-pointer"
                        title="Edit stock levels"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-xs text-[#6B7280]">
                    No {vocab.itemsNoun.toLowerCase()} matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK STOCK ADJUSTMENT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#E2E6EA] animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6EA]">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-[#C0181A]" />
                <h3 className="font-black text-base text-[#111827]">
                  Manage Stock: {editingItem.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-[#6B7280] hover:text-[#111827] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E6EA] text-xs">
                <span className="text-[#6B7280] block">Category: {editingItem.category}</span>
                <span className="text-[#6B7280] block">Selling Price: ₹{editingItem.price}</span>
                <span className="text-[#111827] font-bold block mt-1">
                  Sold in {data?.periodLabel || 'period'}: {editingItem.quantitySold} units
                </span>
              </div>

              {/* Track Inventory Toggle */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-[#E2E6EA] cursor-pointer hover:bg-[#F8FAFC]">
                <div>
                  <span className="text-xs font-bold text-[#111827] block">Track Inventory Quantity</span>
                  <span className="text-[11px] text-[#6B7280] block">
                    Automatically decrement stock as orders are placed
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={trackInventoryEnabled}
                  onChange={(e) => setTrackInventoryEnabled(e.target.checked)}
                  className="rounded text-[#C0181A] focus:ring-[#C0181A] cursor-pointer"
                />
              </label>

              {/* Stock Count */}
              <div>
                <label className="text-xs font-bold text-[#374151] block mb-1">
                  Available Quantity on Hand
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={newStockQty}
                    onChange={(e) => setNewStockQty(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 bg-[#F4F6F9] border border-[#E2E6EA] rounded-xl px-4 py-2 text-sm text-[#111827] font-black outline-none focus:border-[#C0181A]"
                  />
                  <button
                    type="button"
                    onClick={() => setNewStockQty(newStockQty + 10)}
                    className="px-3 py-2 bg-[#F4F6F9] hover:bg-[#E2E6EA] border border-[#E2E6EA] rounded-xl text-xs font-bold text-[#374151] cursor-pointer"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStockQty(newStockQty + 50)}
                    className="px-3 py-2 bg-[#F4F6F9] hover:bg-[#E2E6EA] border border-[#E2E6EA] rounded-xl text-xs font-bold text-[#374151] cursor-pointer"
                  >
                    +50
                  </button>
                </div>
                <span className="text-[10px] text-[#6B7280] mt-1 block">
                  Setting stock to 0 automatically marks this item as &apos;Out of Stock&apos;.
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E2E6EA] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-bold text-[#6B7280] hover:text-[#111827] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStock}
                disabled={savingStock}
                className="px-5 py-2 text-xs font-bold text-white bg-[#C0181A] hover:bg-[#A01416] rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {savingStock ? 'Saving...' : 'Save Stock Levels'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
