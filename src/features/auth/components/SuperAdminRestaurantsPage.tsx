'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Check,
  X as XIcon
} from 'lucide-react';
import { PageHeader, StatusBadge } from '@/components/ui';

interface ChecklistItem {
  label: string;
  passed: boolean;
}

interface RestaurantListItem {
  restaurantId: string;
  restaurantName: string;
  location: string;
  active: boolean;
  periodOrdersCount: number;
  periodGmv: number;
  periodAov: number;
  setupScore: number;
  checklist: ChecklistItem[];
  lastOrderDate: string | null;
}

type SortField = 'restaurantName' | 'location' | 'active' | 'periodOrdersCount' | 'periodGmv' | 'periodAov' | 'setupScore' | 'lastOrderDate';
type SortOrder = 'asc' | 'desc';

export default function SuperAdminRestaurantsPage() {
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

  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<SortField>('restaurantName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const fetchRestaurants = async (showLoading = false, start = startDate, end = endDate) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/restaurants?startDate=${start}&endDate=${end}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load restaurants list');
      }
      setRestaurants(data.restaurants);
      setError('');
    } catch (err) {
      console.error('Error fetching restaurants:', err);
      const message = err instanceof Error ? err.message : 'Failed to fetch restaurants list';
      setError(message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants(true, startDate, endDate);
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedRestaurants = useMemo(() => {
    let result = [...restaurants];

    // Filter by search term
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      result = result.filter(
        r =>
          r.restaurantName.toLowerCase().includes(query) ||
          r.location.toLowerCase().includes(query) ||
          r.restaurantId.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter === 'active') {
      result = result.filter(r => r.active === true);
    } else if (statusFilter === 'inactive') {
      result = result.filter(r => r.active !== true);
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'lastOrderDate') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [restaurants, searchTerm, statusFilter, sortField, sortOrder]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40 flex-shrink-0" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#111827] flex-shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#111827] flex-shrink-0" />
    );
  };

  const getScoreColor = (score: number) => {
    if (score < 40) return 'bg-[#DC2626]'; // Red
    if (score < 75) return 'bg-[#D97706]'; // Amber
    return 'bg-[#16A34A]'; // Green
  };

  if (error) {
    return (
      <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#DC2626] mb-2">Error Loading Restaurants</h3>
        <p className="text-sm text-[#DC2626]/80 mb-4">{error}</p>
        <button
          onClick={() => fetchRestaurants(true)}
          className="px-4 py-2 text-sm font-medium bg-[#DC2626] text-white rounded-lg hover:bg-[#DC2626]/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading && restaurants.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 bg-[#E2E6EA] rounded animate-pulse" />
        <div className="h-10 bg-white border border-[#E2E6EA] rounded-xl animate-pulse" />
        <div className="h-96 bg-white border border-[#E2E6EA] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header and Date Filter */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <PageHeader title="Restaurants" subtitle="Monitor and manage all onboarded outlets" />
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
            onClick={() => fetchRestaurants(true)}
            className="p-2 bg-white border border-[#E2E6EA] rounded-lg text-[#6B7280] hover:bg-[#F4F6F9] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-[#E2E6EA] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search restaurants or location..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-[#E2E6EA] rounded-lg bg-[#F4F6F9] outline-none focus:ring-2 focus:ring-[#C0181A]/20 focus:border-[#C0181A] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#6B7280]" />
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs border border-[#E2E6EA] rounded-lg bg-white outline-none cursor-pointer text-[#111827] font-medium"
          >
            <option value="all">All Outlets</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Restaurants Table */}
      <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden shadow-sm">
        {filteredAndSortedRestaurants.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#6B7280]">
            No matching restaurants found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[950px]">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#E2E6EA]">
                  <th
                    onClick={() => handleSort('restaurantName')}
                    className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] cursor-pointer select-none text-left"
                  >
                    <span className="inline-flex items-center gap-1">
                      Name {getSortIcon('restaurantName')}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('location')}
                    className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] cursor-pointer select-none text-left"
                  >
                    <span className="inline-flex items-center gap-1">
                      Location {getSortIcon('location')}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('active')}
                    className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] cursor-pointer select-none text-center"
                  >
                    <span className="inline-flex items-center gap-1 justify-center">
                      Status {getSortIcon('active')}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('periodOrdersCount')}
                    className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] cursor-pointer select-none text-right"
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      Orders {getSortIcon('periodOrdersCount')}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('periodGmv')}
                    className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] cursor-pointer select-none text-right"
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      GMV {getSortIcon('periodGmv')}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('periodAov')}
                    className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] cursor-pointer select-none text-right"
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      AOV {getSortIcon('periodAov')}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('setupScore')}
                    className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] cursor-pointer select-none text-left w-[180px]"
                  >
                    <span className="inline-flex items-center gap-1">
                      Setup Score {getSortIcon('setupScore')}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('lastOrderDate')}
                    className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] cursor-pointer select-none text-left"
                  >
                    <span className="inline-flex items-center gap-1">
                      Last Order {getSortIcon('lastOrderDate')}
                    </span>
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6EA]">
                {filteredAndSortedRestaurants.map((r) => {
                  const lastOrder = r.lastOrderDate
                    ? new Date(r.lastOrderDate).toLocaleDateString() + ' ' + new Date(r.lastOrderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'No orders yet';
                    
                  const passedPoints = r.checklist.filter(c => c.passed).map(c => c.label);
                  const missingPoints = r.checklist.filter(c => !c.passed).map(c => c.label);

                  return (
                    <tr key={r.restaurantId} className="hover:bg-[#F4F6F9]/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-[#111827] text-[14px] block">
                          {r.restaurantName}
                        </span>
                        <span className="text-[11px] text-[#6B7280]">
                          ID: {r.restaurantId}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[14px] text-[#111827]">
                        {r.location}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge
                           label={r.active ? 'Active' : 'Inactive'}
                           variant={r.active ? 'success' : 'neutral'}
                        />
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-[#111827]">
                        {r.periodOrdersCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-[#111827]">
                        ₹{Math.round(r.periodGmv).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-[#111827]">
                        ₹{Math.round(r.periodAov)}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="relative group flex items-center gap-2 cursor-help">
                          {/* Progress bar container */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-[11px] font-bold text-[#111827] mb-1">
                              <span>{r.setupScore}%</span>
                            </div>
                            <div className="w-32 bg-[#E2E6EA] h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getScoreColor(r.setupScore)}`}
                                style={{ width: `${r.setupScore}%` }}
                              />
                            </div>
                          </div>
                          
                          {/* Custom hover tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#111827] text-white text-xs p-3 rounded-lg shadow-xl w-64 z-50 pointer-events-none">
                            <div className="font-bold border-b border-white/15 pb-1.5 mb-1.5 text-white">
                              Checkpoints Checklist
                            </div>
                            
                            <div className="flex flex-col gap-1 text-[11px]">
                              {passedPoints.length > 0 && (
                                <div className="text-emerald-400 font-medium">
                                  <div className="mb-0.5 text-white/50 text-[10px] uppercase">Passed:</div>
                                  {passedPoints.map((lbl, idx) => (
                                    <div key={idx} className="flex items-start gap-1">
                                      <Check className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                      <span>{lbl}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {missingPoints.length > 0 && (
                                <div className="text-rose-400 font-medium mt-1.5">
                                  <div className="mb-0.5 text-white/50 text-[10px] uppercase">Missing:</div>
                                  {missingPoints.map((lbl, idx) => (
                                    <div key={idx} className="flex items-start gap-1">
                                      <XIcon className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                      <span>{lbl}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-[#6B7280]">
                        {lastOrder}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/super-admin/restaurants/${r.restaurantId}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#C0181A] bg-[#FEF2F2] border border-[#C0181A]/10 rounded-lg hover:bg-[#C0181A] hover:text-white transition-all"
                        >
                          View
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
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
  );
}
