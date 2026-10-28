'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Filter,
  ShoppingCart,
  Clock,
  User,
  Phone,
  UtensilsCrossed,
  CreditCard,
  Banknote,
  QrCode,
  Store,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  AlertCircle,
  Tag,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  PnLDrilldownOrder,
  PnLOrderDrilldownFilter,
  PnLOrdersResponse,
} from '../types';
import { getPnLOrdersAction } from '@/actions/pnl';

interface OrderHistoryDrawerProps {
  isOpen: boolean;
  startDateIso: string;
  endDateIso: string;
  periodLabel: string;
  onClose: () => void;
}

export default function OrderHistoryDrawer({
  isOpen,
  startDateIso,
  endDateIso,
  periodLabel,
  onClose,
}: OrderHistoryDrawerProps) {
  const [data, setData] = useState<PnLOrdersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters State
  const [search, setSearch] = useState('');
  const [orderType, setOrderType] = useState<'all' | 'dine_in' | 'takeaway' | 'delivery'>('all');
  const [source, setSource] = useState<'all' | 'qr_scan' | 'admin_counter'>('all');
  const [paymentMode, setPaymentMode] = useState<'all' | 'cash' | 'online' | 'credit'>('all');
  const [status, setStatus] = useState<'all' | 'valid_only' | 'completed' | 'preparing' | 'confirmed' | 'received' | 'cancelled'>('valid_only');
  const [sortBy, setSortBy] = useState<'time_desc' | 'time_asc' | 'total_desc' | 'total_asc'>('time_desc');
  const [page, setPage] = useState(1);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!isOpen || !startDateIso || !endDateIso) return;
    setLoading(true);
    setError('');

    try {
      const res = await getPnLOrdersAction({
        startDateIso,
        endDateIso,
        filter: {
          search,
          orderType,
          source,
          paymentMode,
          status,
          sortBy,
          page,
          limit: 15,
        },
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load orders drilldown:', err);
      setError(err?.message || 'Failed to load order history');
    } finally {
      setLoading(false);
    }
  }, [isOpen, startDateIso, endDateIso, search, orderType, source, paymentMode, status, sortBy, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset page when filters change
  const handleFilterChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setOrderType('all');
    setSource('all');
    setPaymentMode('all');
    setStatus('valid_only');
    setSortBy('time_desc');
    setPage(1);
  };

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      {/* Drawer Panel */}
      <div className="bg-[#F8FAFC] w-full max-w-3xl h-full flex flex-col shadow-2xl border-l border-white/20 overflow-hidden">
        {/* 1. Header */}
        <div className="p-4 sm:p-5 bg-[#1C2333] text-white flex items-center justify-between shrink-0 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-base sm:text-lg font-bold">
                Order History & Customer Ledger
              </h2>
            </div>
            <p className="text-[12px] text-white/70 mt-0.5">
              {data?.summaryDateLabel || periodLabel} •{' '}
              <strong className="text-white">
                {data?.totalCount ?? 0} {data?.totalCount === 1 ? 'Order' : 'Orders'}
              </strong>
              {data ? ` • Total Sales: ₹${data.totalRevenue.toLocaleString('en-IN')}` : ''}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close orders drilldown"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Filter Bar */}
        <div className="p-3 sm:p-4 bg-white border-b border-[#E2E6EA] shrink-0 flex flex-col gap-2.5 shadow-xs">
          {/* Top row: Search input + Sort */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search by customer name, phone, dish name..."
                value={search}
                onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[12px] font-semibold text-[#6B7280] whitespace-nowrap">
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => handleFilterChange(setSortBy, e.target.value)}
                aria-label="Sort orders"
                className="text-[12px] font-medium bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-[#111827] focus:outline-none focus:ring-1 focus:ring-red-500 w-full sm:w-auto"
              >
                <option value="time_desc">🕒 Newest Placed First</option>
                <option value="time_asc">🕒 Oldest First</option>
                <option value="total_desc">💰 Highest Bill Amount</option>
                <option value="total_asc">💰 Lowest Bill Amount</option>
              </select>
            </div>
          </div>

          {/* Bottom row: Multi-filter pills */}
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            {/* Status */}
            <select
              value={status}
              onChange={(e) => handleFilterChange(setStatus, e.target.value)}
              aria-label="Filter by order status"
              className="text-[12px] font-medium bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-2 py-1 text-[#4B5563]"
            >
              <option value="valid_only">Status: Valid Orders (Sales)</option>
              <option value="all">Status: All (Incl. Cancelled)</option>
              <option value="completed">Status: Completed Only</option>
              <option value="preparing">Status: Preparing / Kitchen</option>
              <option value="confirmed">Status: Confirmed</option>
              <option value="cancelled">Status: Cancelled Only</option>
            </select>

            {/* Order Type */}
            <select
              value={orderType}
              onChange={(e) => handleFilterChange(setOrderType, e.target.value)}
              aria-label="Filter by order type"
              className="text-[12px] font-medium bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-2 py-1 text-[#4B5563]"
            >
              <option value="all">Type: All Types</option>
              <option value="dine_in">Dine-in (Table)</option>
              <option value="takeaway">Takeaway / Parcel</option>
              <option value="delivery">Home Delivery</option>
            </select>

            {/* Source */}
            <select
              value={source}
              onChange={(e) => handleFilterChange(setSource, e.target.value)}
              aria-label="Filter by channel source"
              className="text-[12px] font-medium bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-2 py-1 text-[#4B5563]"
            >
              <option value="all">Channel: All Channels</option>
              <option value="qr_scan">QR Scan (Digital)</option>
              <option value="admin_counter">Counter POS</option>
            </select>

            {/* Payment Mode */}
            <select
              value={paymentMode}
              onChange={(e) => handleFilterChange(setPaymentMode, e.target.value)}
              aria-label="Filter by payment mode"
              className="text-[12px] font-medium bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-2 py-1 text-[#4B5563]"
            >
              <option value="all">Payment: All Modes</option>
              <option value="cash">Cash</option>
              <option value="online">Online / UPI / Card</option>
              <option value="credit">Credit / Due</option>
            </select>

            {(search || orderType !== 'all' || source !== 'all' || paymentMode !== 'all' || status !== 'valid_only') && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-red-600 hover:underline px-1.5 py-0.5 ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* 3. Orders List Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-3.5 [scrollbar-width:thin]">
          {loading ? (
            <div className="flex flex-col gap-3 py-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-white rounded-xl border border-[#E2E6EA] p-4 animate-pulse">
                  <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-48 bg-gray-100 rounded mb-4" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertCircle className="w-4 h-4" />
                <span>Failed to load orders</span>
              </div>
              <p>{error}</p>
            </div>
          ) : !data?.orders || data.orders.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E2E6EA] p-8 text-center flex flex-col items-center justify-center my-auto">
              <ShoppingCart className="w-10 h-10 text-gray-300 mb-2" />
              <h3 className="font-bold text-[#111827] text-base">No orders match these criteria</h3>
              <p className="text-xs text-[#6B7280] mt-1 max-w-sm">
                No orders were recorded with the chosen filters in this timeframe.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-3 text-xs font-bold text-blue-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            data.orders.map((order) => {
              const isCancelled = order.status === 'cancelled' || order.status === 'rejected';

              return (
                <div
                  key={order._id}
                  className={`bg-white rounded-xl border p-4 sm:p-4.5 shadow-xs transition-shadow hover:shadow-md ${
                    isCancelled ? 'border-red-200 bg-red-50/20 opacity-80' : 'border-[#E2E6EA]'
                  }`}
                >
                  {/* Top Bar: Order ID, Timestamp & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#F1F3F5]">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[14px] text-[#111827] tracking-tight">
                        {order.orderIdShort}
                      </span>
                      <span className="text-[11px] font-semibold text-[#6B7280] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#9CA3AF]" />
                        {order.placedTimeFormatted}
                      </span>
                      <span className="text-[10px] bg-[#F3F4F6] text-[#4B5563] px-1.5 py-0.2 rounded font-medium">
                        {order.relativeTime}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          order.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : order.status === 'preparing' || order.status === 'in_progress'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : order.status === 'cancelled' || order.status === 'rejected'
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Operational Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[12px]">
                    {/* Customer Info */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 font-bold text-[#111827]">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span>{order.customerName}</span>
                      </div>

                      {order.customerPhone && (
                        <a
                          href={`https://wa.me/91${order.customerPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp Customer"
                          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>{order.customerPhone}</span>
                        </a>
                      )}
                    </div>

                    {/* Metadata Tags: Type, Channel, Payment */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Table / Order Type */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#F4F6F9] text-[#4B5563] px-2 py-0.5 rounded border border-[#E2E6EA]">
                        <UtensilsCrossed className="w-3 h-3 text-[#6B7280]" />
                        {order.orderType === 'dine_in'
                          ? order.tableId
                            ? `Table ${order.tableId}`
                            : 'Dine-In'
                          : order.orderType === 'takeaway'
                          ? 'Takeaway'
                          : 'Delivery'}
                      </span>

                      {/* Source */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#F4F6F9] text-[#4B5563] px-2 py-0.5 rounded border border-[#E2E6EA]">
                        {order.source === 'qr_scan' ? (
                          <>
                            <QrCode className="w-3 h-3 text-purple-600" />
                            <span>QR Digital</span>
                          </>
                        ) : (
                          <>
                            <Store className="w-3 h-3 text-blue-600" />
                            <span>Counter POS</span>
                          </>
                        )}
                      </span>

                      {/* Payment Mode */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#F4F6F9] text-[#4B5563] px-2 py-0.5 rounded border border-[#E2E6EA]">
                        {order.paymentMode === 'online' ? (
                          <>
                            <CreditCard className="w-3 h-3 text-blue-600" />
                            <span>Online UPI</span>
                          </>
                        ) : order.paymentMode === 'credit' ? (
                          <>
                            <Tag className="w-3 h-3 text-amber-600" />
                            <span>Due / Credit</span>
                          </>
                        ) : (
                          <>
                            <Banknote className="w-3 h-3 text-emerald-600" />
                            <span>Cash</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Itemized Food List */}
                  <div className="mt-2 pt-2 border-t border-[#F1F3F5] bg-[#F9FAFB] rounded-lg p-3">
                    <span className="text-[11px] font-extrabold uppercase text-[#6B7280] block mb-1.5">
                      Itemized Items ({order.itemCount})
                    </span>

                    <div className="flex flex-col gap-1 text-[12px]">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[#374151]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#111827]">
                              {item.quantity}x
                            </span>
                            <span>{item.name}</span>
                            {item.originatedFromNudge && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded">
                                Upsell
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 font-semibold">
                            <span className="text-[#9CA3AF] text-[11px]">
                              @₹{item.price}
                            </span>
                            <span className="text-[#111827] w-14 text-right">
                              ₹{item.subtotal}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <p className="mt-2 text-[11px] text-[#6B7280] italic bg-white p-1.5 rounded border border-[#E5E7EB]">
                        Note: &ldquo;{order.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Financial Bill Tally */}
                  <div className="mt-3 pt-2 flex flex-wrap items-center justify-between gap-2 text-[12px]">
                    <div className="flex items-center gap-3 text-[#6B7280] text-[11px]">
                      <span>Subtotal: ₹{order.subtotal}</span>
                      {order.discount > 0 && (
                        <span className="text-amber-700 font-semibold">
                          Discount: -₹{order.discount} {order.couponCode ? `(${order.couponCode})` : ''}
                        </span>
                      )}
                      {order.tax > 0 && <span>Tax: +₹{order.tax}</span>}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-[11px] text-[#6B7280] font-medium">Grand Total:</span>
                      <span className="text-[16px] font-black text-[#111827]">
                        ₹{order.total.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. Footer Pagination */}
        {data && data.totalPages > 1 && (
          <div className="p-3 bg-white border-t border-[#E2E6EA] flex items-center justify-between shrink-0 text-[12px]">
            <span className="text-[#6B7280] font-medium">
              Page <strong>{data.currentPage}</strong> of <strong>{data.totalPages}</strong> (
              {data.totalCount} Orders)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.currentPage <= 1 || loading}
                className="px-2.5 py-1 text-[12px] font-bold rounded border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F3F4F6] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={data.currentPage >= data.totalPages || loading}
                className="px-2.5 py-1 text-[12px] font-bold rounded border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F3F4F6] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
