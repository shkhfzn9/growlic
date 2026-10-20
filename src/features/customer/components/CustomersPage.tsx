'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Users,
  Download,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Calendar,
  Phone,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/ui';
import {
  getCustomersWithSegmentsAction,
  exportCustomersCsvDataAction,
} from '../services/customer.service';
import {
  ICustomerWithSegment,
  ICustomerListFilters,
  CustomerSegment,
} from '../types';
import CustomerDetailDrawer, { getSegmentBadgeStyle } from './CustomerDetailDrawer';
import CustomerAnalyticsTab from './CustomerAnalyticsTab';

export default function CustomersPage() {
  const [activeTab, setActiveTab] = useState<'directory' | 'analytics'>('directory');

  // Directory State
  const [customers, setCustomers] = useState<ICustomerWithSegment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Segment Summary Counts
  const [segmentCounts, setSegmentCounts] = useState({
    ALL: 0,
    VIP: 0,
    REGULAR: 0,
    NEW: 0,
    AT_RISK: 0,
    LOST: 0,
  });

  // Filters State
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [minLtv, setMinLtv] = useState<string>('');
  const [maxLtv, setMaxLtv] = useState<string>('');
  const [lastVisitBeforeDays, setLastVisitBeforeDays] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Debounce search by 300ms to eliminate redundant network & DB calls while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Selected customer for drill-down drawer
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);

  const fetchCustomerList = useCallback(
    async (targetPage = 1) => {
      try {
        setLoading(true);
        setError('');

        const filters: ICustomerListFilters = {
          page: targetPage,
          limit: 15,
          search: debouncedSearch.trim() || undefined,
          segment: selectedSegment !== 'ALL' ? selectedSegment : undefined,
          minLtv: minLtv ? Number(minLtv) : undefined,
          maxLtv: maxLtv ? Number(maxLtv) : undefined,
          lastVisitBeforeDays: lastVisitBeforeDays ? Number(lastVisitBeforeDays) : undefined,
        };

        const res = await getCustomersWithSegmentsAction(filters);
        if (res) {
          setCustomers(res.customers || []);
          setTotal(res.total || 0);
          setPage(res.page || 1);
          setTotalPages(res.totalPages || 1);
          if (res.segmentCounts) {
            setSegmentCounts(res.segmentCounts);
          }
        }
      } catch (err) {
        console.error('Error loading customers:', err);
        setError('Failed to load customer list.');
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, selectedSegment, minLtv, maxLtv, lastVisitBeforeDays]
  );

  useEffect(() => {
    fetchCustomerList(1);
  }, [fetchCustomerList]);

  // CSV Export
  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const filters: ICustomerListFilters = {
        search: searchQuery.trim() || undefined,
        segment: selectedSegment !== 'ALL' ? selectedSegment : undefined,
        minLtv: minLtv ? Number(minLtv) : undefined,
        maxLtv: maxLtv ? Number(maxLtv) : undefined,
        lastVisitBeforeDays: lastVisitBeforeDays ? Number(lastVisitBeforeDays) : undefined,
      };

      const data = await exportCustomersCsvDataAction(filters);
      if (!data || !data.length) {
        alert('No customers match the current filter criteria for export.');
        return;
      }

      // Build CSV string
      const headers = [
        'Customer Name',
        'Phone Number',
        'Segment',
        'Total Visits',
        'LTV (INR)',
        'AOV (INR)',
        'Last Visit Date',
        'Days Since Last Visit',
        'Avg Visit Interval (Days)',
        'Stamps Count',
      ];

      const rows = data.map((c: ICustomerWithSegment) => [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${c.phone}"`,
        c.segment,
        c.totalOrders,
        c.totalSpent,
        c.averageOrderValue || 0,
        c.lastOrderDate ? c.lastOrderDate.split('T')[0] : 'N/A',
        c.daysSinceLastVisit,
        c.averageVisitIntervalDays !== null ? c.averageVisitIntervalDays : 'N/A',
        c.stampCount ?? 0,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `growlic_customers_${selectedSegment.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to generate CSV export.');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedSegment('ALL');
    setSearchQuery('');
    setMinLtv('');
    setMaxLtv('');
    setLastVisitBeforeDays('');
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <PageHeader
        title="Customers & Client Retention"
        subtitle="Manage customer relationships, track RFM behavioral segments, and view cohort analytics"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={exportingCsv || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-[#E2E6EA] hover:bg-gray-50 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${exportingCsv ? 'animate-bounce' : ''}`} />
              <span>{exportingCsv ? 'Exporting...' : 'Export to CSV'}</span>
            </button>
          </div>
        }
      />

      {/* Main Top Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('directory')}
          className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'directory'
              ? 'bg-purple-900 text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Customer Directory</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{total}</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-purple-900 text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Customer Analytics & Cohorts</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: CUSTOMER DIRECTORY                                      */}
      {/* ------------------------------------------------------------- */}
      <div className={activeTab === 'directory' ? 'flex flex-col gap-4' : 'hidden'}>
          {/* Segment Summary Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 items-center">
            {[
              { id: 'ALL', label: 'All Customers', count: segmentCounts.ALL, color: 'border-gray-300' },
              { id: 'VIP', label: 'VIP (Top 10%)', count: segmentCounts.VIP, color: 'border-purple-300 text-purple-900' },
              { id: 'REGULAR', label: 'Regular (2+ visits)', count: segmentCounts.REGULAR, color: 'border-blue-300 text-blue-900' },
              { id: 'NEW', label: 'New (<=30d)', count: segmentCounts.NEW, color: 'border-emerald-300 text-emerald-900' },
              { id: 'AT_RISK', label: 'At-Risk', count: segmentCounts.AT_RISK, color: 'border-amber-300 text-amber-900' },
              { id: 'LOST', label: 'Lost (>90d)', count: segmentCounts.LOST, color: 'border-rose-300 text-rose-900' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setSelectedSegment(chip.id as any)}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 border ${
                  selectedSegment === chip.id
                    ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
                    : `bg-white ${chip.color} hover:bg-gray-50`
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    selectedSegment === chip.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Filter Controls */}
          <div className="bg-white border border-[#E2E6EA] rounded-2xl p-4 shadow-xs flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search by Name or Phone */}
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by customer name or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                    showFilters || minLtv || maxLtv || lastVisitBeforeDays
                      ? 'bg-purple-50 text-purple-900 border-purple-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {(minLtv || maxLtv || lastVisitBeforeDays) && (
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                  )}
                </button>

                {(searchQuery || selectedSegment !== 'ALL' || minLtv || maxLtv || lastVisitBeforeDays) && (
                  <button
                    onClick={handleClearFilters}
                    className="px-2.5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Expandable Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Min Customer LTV (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={minLtv}
                    onChange={(e) => setMinLtv(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Max Customer LTV (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 10000"
                    value={maxLtv}
                    onChange={(e) => setMaxLtv(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Last Visit Before (Days)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 45"
                    value={lastVisitBeforeDays}
                    onChange={(e) => setLastVisitBeforeDays(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Customer Table */}
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {customers.length === 0 && !loading ? (
            <EmptyState
              title="No customers match criteria"
              description="Try adjusting your search query, segment filter, or LTV parameters."
              icon={<Users className="w-6 h-6 text-gray-400" />}
            />
          ) : (
            <div className="bg-white border border-[#E2E6EA] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[850px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase text-[10px] tracking-wider">
                      <th className="px-4 py-3 text-left">Customer Profile</th>
                      <th className="px-4 py-3 text-left">Phone Number</th>
                      <th className="px-4 py-3 text-center">Segment</th>
                      <th className="px-4 py-3 text-right">Total Visits</th>
                      <th className="px-4 py-3 text-right">Customer LTV</th>
                      <th className="px-4 py-3 text-right">Avg Order (AOV)</th>
                      <th className="px-4 py-3 text-left">Last Visit</th>
                      <th className="px-4 py-3 text-left">Recency</th>
                      <th className="px-4 py-3 text-center">Stamps / Rewards</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {customers.map((cust) => {
                      const seg = getSegmentBadgeStyle(cust.segment);

                      return (
                        <tr
                          key={cust._id}
                          onClick={() => setSelectedCustomerPhone(cust.phone)}
                          className="hover:bg-purple-50/50 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center shrink-0">
                                {cust.name ? cust.name.charAt(0).toUpperCase() : 'C'}
                              </div>
                              <div>
                                <span className="font-extrabold text-gray-900 group-hover:text-purple-700 transition-colors block leading-tight">
                                  {cust.name}
                                </span>
                                {cust.favoriteCategory && (
                                  <span className="text-[10px] text-purple-800 font-semibold mt-0.5 inline-block">
                                    Loves: {cust.favoriteCategory}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-gray-600 font-mono text-[11px]">
                            {cust.phone}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${seg.bg}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${seg.dot}`} />
                              {seg.label}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right font-bold text-gray-900">
                            {cust.totalOrders} visits
                          </td>

                          <td className="px-4 py-3.5 text-right font-black text-purple-950">
                            ₹{cust.totalSpent.toLocaleString('en-IN')}
                          </td>

                          <td className="px-4 py-3.5 text-right font-bold text-gray-800">
                            ₹{cust.averageOrderValue}
                          </td>

                          <td className="px-4 py-3.5 text-gray-600 text-[11px]">
                            {cust.lastOrderDate ? cust.lastOrderDate.split('T')[0] : 'N/A'}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="text-[11px] font-bold text-gray-700">
                              {cust.daysSinceLastVisit === 0 ? 'Today' : `${cust.daysSinceLastVisit}d ago`}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <div className="inline-flex items-center gap-1">
                              <span className="bg-gray-100 text-gray-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-gray-200">
                                {cust.stampCount ?? 0} Stamps
                              </span>
                              {cust.hasPendingDiscount && (
                                <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-amber-300">
                                  Reward Active
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Bar */}
              <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">
                  Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, total)} of {total} customers
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1 || loading}
                    onClick={() => fetchCustomerList(page - 1)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-50 font-bold text-gray-700 cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <span className="px-2 text-gray-700 font-black">
                    {page} / {totalPages}
                  </span>

                  <button
                    disabled={page >= totalPages || loading}
                    onClick={() => fetchCustomerList(page + 1)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-50 font-bold text-gray-700 cursor-pointer flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: CUSTOMER ANALYTICS & RETENTION                         */}
      {/* ------------------------------------------------------------- */}
      <div className={activeTab === 'analytics' ? 'block' : 'hidden'}>
        <CustomerAnalyticsTab />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SLIDE-OVER CUSTOMER DETAIL DRAWER                             */}
      {/* ------------------------------------------------------------- */}
      {selectedCustomerPhone && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedCustomerPhone(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full overflow-y-auto z-10 animate-slide-left">
            <CustomerDetailDrawer
              phone={selectedCustomerPhone}
              onClose={() => setSelectedCustomerPhone(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
