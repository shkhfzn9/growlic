'use client';

import React, { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAdminOrders, updateOrderStatus, updateOrderEstimatedTime } from '../services/order.service';
import { PageHeader, StatusBadge, AdminButton } from '@/components/ui';
import { useOrderNotification } from '@/components/providers';
import { Clock, ArrowLeft, AlertTriangle, CheckCircle2, TrendingDown, MessageSquare, X, ShieldAlert } from 'lucide-react';
import { OrderItem, Order } from '../types/order.types';

type FilterStatus = 'all' | Order['status'] | 'delayed';

const PRESET_DELAY_REASONS = [
  'Kitchen Rush & Heavy Wok Load',
  'Ingredient Shortage / Prep Refill',
  'Special Customer Customization',
  'Staff Shortage during Peak Hour',
  'Takeaway Packaging Queue',
  'Other / Custom Note',
];

function getStatusVariant(status: Order['status']) {
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

function OrdersContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const { acknowledgeOrder } = useOrderNotification();

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customEta, setCustomEta] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Delay Tracking & Reason Modal states
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [pendingDelayOrder, setPendingDelayOrder] = useState<{
    order: Order;
    nextStatus: Order['status'];
    actualMins: number;
    delayMins: number;
  } | null>(null);
  const [selectedDelayReason, setSelectedDelayReason] = useState(PRESET_DELAY_REASONS[0]);
  const [customDelayReason, setCustomDelayReason] = useState('');

  const handleOrderSelect = useCallback((order: Order) => {
    setSelectedOrder(order);
    setViewMode('detail');
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 50;

  // Refs to avoid stale closures in background polling and loading callbacks
  const filterRef = useRef(filter);
  const currentPageRef = useRef(currentPage);
  const selectedOrderRef = useRef(selectedOrder);
  const highlightIdRef = useRef(highlightId);

  useEffect(() => { filterRef.current = filter; }, [filter]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { selectedOrderRef.current = selectedOrder; }, [selectedOrder]);
  useEffect(() => { highlightIdRef.current = highlightId; }, [highlightId]);

  // Live timer state for countdown
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getTimeLeft = (order: Order) => {
    if (!order.estimatedTime || ['ready', 'completed', 'cancelled'].includes(order.status)) {
      return null;
    }

    const placedTime = new Date(order.createdAt).getTime();
    const prepDurationMs = order.estimatedTime * 60 * 1000;
    const targetTime = placedTime + prepDurationMs;
    const difference = targetTime - now;

    if (difference <= 0) {
      return 'ALMOST READY';
    }

    const minutes = Math.floor(difference / 1000 / 60);
    const seconds = Math.floor((difference / 1000) % 60);

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const loadOrders = async (showLoading = false, pageNum?: number) => {
    const activePage = pageNum !== undefined ? pageNum : currentPageRef.current;
    const activeFilter = filterRef.current;
    const activeHighlightId = highlightIdRef.current;

    if (showLoading) setLoading(true);
    try {
      const skipNum = (activePage - 1) * limit;
      const data = await getAdminOrders(limit, skipNum, activeFilter);
      if (data?.unauthorized) {
        setError('Your session has expired or you are not logged in. Please log in again.');
        setOrders([]);
        setLoading(false);
        return;
      }
      const fetchedOrders = data?.orders || [];
      const total = data?.totalCount || 0;

      setOrders(fetchedOrders);
      setTotalCount(total);
      setCurrentPage(activePage);

      const currentSelected = selectedOrderRef.current;

      if (activeHighlightId && showLoading) {
        const found = fetchedOrders.find((o: Order) => o._id === activeHighlightId);
        if (found) {
          setSelectedOrder(found);
          setViewMode('detail');
        }
      } else if (!currentSelected && fetchedOrders.length > 0) {
        if (showLoading) {
          setSelectedOrder(fetchedOrders[0]);
        }
      } else if (currentSelected) {
        const updated = fetchedOrders.find((o: Order) => o._id === currentSelected._id);
        if (updated) {
          setSelectedOrder(updated);
        } else if (showLoading) {
          setSelectedOrder(fetchedOrders[0] || null);
        }
      }

      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load orders.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const isInitialMount = useRef(true);

  useEffect(() => {
    const showLoading = isInitialMount.current;
    loadOrders(showLoading, currentPage);
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [filter, currentPage, highlightId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      loadOrders(false);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Execution helper for status updates with delay metadata
  const executeStatusUpdate = async (
    orderId: string,
    nextStatus: Order['status'],
    delayData?: {
      actualPrepTimeMinutes?: number;
      delayMinutes?: number;
      isDelayed?: boolean;
      delayReason?: string;
    }
  ) => {
    setActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const updated = await updateOrderStatus(orderId, nextStatus, delayData);
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      setSelectedOrder(updated);
      acknowledgeOrder(orderId);
      setDelayModalOpen(false);
      setPendingDelayOrder(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update order status';
      alert(message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Smart status change interceptor that checks for delays
  const handleStatusChange = async (orderId: string, nextStatus: Order['status']) => {
    const targetOrder = orders.find((o) => o._id === orderId) || selectedOrder;
    if (!targetOrder) return;

    // Check if moving to 'completed' or 'ready' and has estimatedTime set
    if (['ready', 'completed'].includes(nextStatus) && targetOrder.estimatedTime && targetOrder.estimatedTime > 0) {
      const placedTime = new Date(targetOrder.createdAt).getTime();
      const actualMins = Math.max(1, Math.round((Date.now() - placedTime) / (60 * 1000)));
      const delayMins = actualMins - targetOrder.estimatedTime;

      if (delayMins > 0) {
        setPendingDelayOrder({
          order: targetOrder,
          nextStatus,
          actualMins,
          delayMins,
        });
        setSelectedDelayReason(PRESET_DELAY_REASONS[0]);
        setCustomDelayReason('');
        setDelayModalOpen(true);
        return;
      } else {
        // On time! Update status with delay metadata
        executeStatusUpdate(orderId, nextStatus, {
          actualPrepTimeMinutes: actualMins,
          delayMinutes: 0,
          isDelayed: false,
          delayReason: '',
        });
        return;
      }
    }

    // Default status change
    executeStatusUpdate(orderId, nextStatus);
  };

  const handleConfirmDelayAndComplete = () => {
    if (!pendingDelayOrder) return;

    const isCustom = selectedDelayReason.includes('Other');
    const finalReason = isCustom
      ? (customDelayReason.trim() || 'Unspecified Kitchen Delay')
      : (selectedDelayReason + (customDelayReason.trim() ? `: ${customDelayReason.trim()}` : ''));

    executeStatusUpdate(pendingDelayOrder.order._id, pendingDelayOrder.nextStatus, {
      actualPrepTimeMinutes: pendingDelayOrder.actualMins,
      delayMinutes: pendingDelayOrder.delayMins,
      isDelayed: true,
      delayReason: finalReason,
    });
  };

  const handleCancelOrder = async (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      executeStatusUpdate(orderId, 'cancelled');
    }
  };

  // Calculate kitchen metrics
  const delayedOrders = orders.filter((o) => o.isDelayed);
  const totalCompleted = orders.filter((o) => ['ready', 'completed'].includes(o.status)).length;
  const onTimeCount = Math.max(0, totalCompleted - delayedOrders.length);
  const onTimeRate = totalCompleted > 0 ? Math.round((onTimeCount / totalCompleted) * 100) : 100;
  const totalDelayMins = delayedOrders.reduce((sum, o) => sum + (o.delayMinutes || 0), 0);
  const avgDelayMins = delayedOrders.length > 0 ? (totalDelayMins / delayedOrders.length).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-32 bg-[#E2E6EA] rounded animate-pulse" />
        <div className="h-10 w-full bg-[#E2E6EA] rounded-lg animate-pulse" />
        <div className="flex gap-4">
          <div className="flex-1 h-96 bg-white border border-[#E2E6EA] rounded-xl animate-pulse" />
          <div className="flex-1 h-96 bg-white border border-[#E2E6EA] rounded-xl animate-pulse hidden lg:block" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Orders & Kitchen Analytics"
        subtitle="Track live orders, prep timers, delays & kitchen performance"
        actions={
          <span className="inline-flex items-center gap-1.5 text-xs text-[#16A34A] font-medium bg-[#F0FDF4] px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
            Live Polling Active
          </span>
        }
      />

      {error && (
        <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg p-3 text-sm text-[#DC2626] font-medium">
          {error}
        </div>
      )}

      {/* Kitchen Efficiency & Delay Analytics Summary Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border border-[#E2E6EA] rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
          <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> On-Time Rate
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-950">{onTimeRate}%</span>
            <span className="text-[10px] text-emerald-700 block font-semibold">Target: 90%+ On-Time</span>
          </div>
        </div>

        <div className="flex flex-col justify-between p-3 bg-red-50/50 border border-red-100 rounded-xl">
          <span className="text-[10px] font-black uppercase text-red-800 tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Delayed Orders
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-red-950">{delayedOrders.length}</span>
            <span className="text-[10px] text-red-700 block font-semibold">{totalDelayMins} total delay mins</span>
          </div>
        </div>

        <div className="flex flex-col justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
          <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Avg Delay / Order
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-950">+{avgDelayMins} min</span>
            <span className="text-[10px] text-amber-700 block font-semibold">Exceeded promised ETA</span>
          </div>
        </div>

        <div className="flex flex-col justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
          <span className="text-[10px] font-black uppercase text-gray-700 tracking-wider">
            Total Processed
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-gray-900">{totalCount}</span>
            <span className="text-[10px] text-gray-500 block font-semibold">{totalCompleted} completed</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'received', 'accepted', 'preparing', 'completed', 'delayed', 'cancelled'] as FilterStatus[]).map(
          (status) => (
            <button
              key={status}
              onClick={() => {
                setFilter(status);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors capitalize flex items-center gap-1.5 ${
                filter === status
                  ? 'bg-[#111827] text-white shadow-sm'
                  : status === 'delayed'
                  ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-extrabold'
                  : 'bg-white text-[#6B7280] border border-[#E2E6EA] hover:bg-[#F4F6F9]'
              }`}
            >
              {status === 'delayed' && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
              <span>{status === 'delayed' ? `Delayed (${delayedOrders.length})` : status}</span>
            </button>
          )
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-[#E2E6EA] rounded-xl p-16 text-center">
          <p className="text-sm text-[#6B7280]">
            {filter === 'delayed' ? 'Great job! No delayed orders found.' : 'No orders received yet.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
          {/* Left pane: Orders list */}
          <div className={`w-full lg:w-1/2 flex flex-col gap-3 ${viewMode === 'detail' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="bg-white border border-[#E2E6EA] rounded-xl max-h-[600px] overflow-y-auto">
              <div className="divide-y divide-[#E2E6EA]">
                {orders.map((order) => (
                  <OrderListItem
                    key={order._id}
                    order={order}
                    isSelected={selectedOrder?._id === order._id}
                    onClick={handleOrderSelect}
                  />
                ))}
              </div>
            </div>

            {totalCount > limit && (
              <div className="flex justify-between items-center px-4 py-2.5 bg-white border border-[#E2E6EA] rounded-lg text-xs">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => loadOrders(true, currentPage - 1)}
                  className="px-3 py-1.5 border border-[#E2E6EA] rounded-lg hover:bg-[#F4F6F9] disabled:opacity-40 font-medium transition-colors"
                >
                  Previous
                </button>
                <span className="text-[#6B7280]">
                  Page {currentPage} of {Math.ceil(totalCount / limit)} ({totalCount} total)
                </span>
                <button
                  disabled={currentPage >= Math.ceil(totalCount / limit)}
                  onClick={() => loadOrders(true, currentPage + 1)}
                  className="px-3 py-1.5 border border-[#E2E6EA] rounded-lg hover:bg-[#F4F6F9] disabled:opacity-40 font-medium transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Right pane: Detail */}
          <div className={`w-full lg:w-1/2 bg-white border border-[#E2E6EA] rounded-xl p-6 flex flex-col gap-5 lg:sticky lg:top-6 ${viewMode === 'list' ? 'hidden lg:flex' : 'flex'}`}>
            {selectedOrder ? (
              <>
                <button
                  onClick={() => setViewMode('list')}
                  className="lg:hidden flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111827] mb-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to list
                </button>

                {/* Header */}
                <div className="flex justify-between items-start border-b border-[#E2E6EA] pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#111827]">Order Details</h2>
                    <span className="text-[12px] text-[#6B7280] block mt-0.5">ID: {selectedOrder._id}</span>
                    <span className="text-[12px] text-[#6B7280] block">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                  </div>
                  <StatusBadge label={selectedOrder.status} variant={getStatusVariant(selectedOrder.status)} />
                </div>

                {/* Delay Warning Badge in Detail View */}
                {selectedOrder.isDelayed && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        Order Delayed by +{selectedOrder.delayMinutes} Mins
                      </span>
                      <span className="text-[10px] bg-red-100 text-red-800 font-extrabold px-2.5 py-0.5 rounded-full">
                        ETA: {selectedOrder.estimatedTime}m | Actual: {selectedOrder.actualPrepTimeMinutes}m
                      </span>
                    </div>
                    {selectedOrder.delayReason && (
                      <div className="text-xs text-red-900 font-semibold bg-white/70 border border-red-200/60 p-2.5 rounded-xl">
                        <span className="font-extrabold uppercase text-[9px] text-red-700 block mb-0.5">Logged Delay Reason:</span>
                        <p className="italic">"{selectedOrder.delayReason}"</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedOrder.estimatedTime && !selectedOrder.isDelayed && (
                  <div className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D97706] bg-[#FFFBEB] px-3 py-1.5 rounded-lg border border-[#D97706]/20 w-fit">
                    <Clock className="w-3.5 h-3.5" />
                    ETA: {selectedOrder.estimatedTime} mins
                  </div>
                )}

                {/* Customer */}
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-2">Customer</h3>
                  <p className="text-sm font-medium text-[#111827]">{selectedOrder.customerName}</p>
                  <p className="text-sm text-[#6B7280]">{selectedOrder.customerPhone}</p>
                  {selectedOrder.tableId && (
                    <span className="inline-flex mt-1.5 text-xs font-medium bg-[#FFFBEB] text-[#D97706] px-2 py-0.5 rounded border border-[#D97706]/20">
                      Table {selectedOrder.tableId}
                    </span>
                  )}
                  {selectedOrder.notes && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-[#C0181A]">
                      <span className="font-extrabold uppercase tracking-wide block mb-1">Note to Chef:</span>
                      <p className="italic font-medium leading-relaxed">"{selectedOrder.notes}"</p>
                    </div>
                  )}
                </div>

                {/* Receipt */}
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-2">Items</h3>
                  <div className="divide-y divide-[#E2E6EA]">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="py-2 flex justify-between text-sm">
                        <span className="text-[#111827]">{item.name} <span className="text-[#6B7280]">×{item.quantity}</span></span>
                        <span className="font-medium">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[#111827] pt-3 mt-2 flex justify-between font-semibold text-[#111827]">
                    <span>Total</span>
                    <span>₹{selectedOrder.total}</span>
                  </div>
                </div>

                {/* Preparation Timer */}
                {['accepted', 'preparing'].includes(selectedOrder.status) && selectedOrder.estimatedTime && (
                  <div className="border-t border-[#E2E6EA] pt-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-2">Preparation Timer</h3>
                    <div className="bg-gradient-to-r from-[#FEF2F2] to-[#FFF5F5] border border-[#FEE2E2] rounded-xl p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#C0181A]/10 rounded-lg text-[#C0181A]">
                          <Clock className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <span className="text-xs text-[#6B7280] block font-medium">Time Remaining</span>
                          <span className="text-2xl font-black text-[#111827] tracking-tight tabular-nums">
                            {getTimeLeft(selectedOrder) || `${selectedOrder.estimatedTime}:00`}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#C0181A] bg-[#C0181A]/10 px-2.5 py-1 rounded-full font-semibold">
                          ETA: {selectedOrder.estimatedTime} min
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Controls */}
                <div className="border-t border-[#E2E6EA] pt-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-3">Update Status</h3>
                  {actionLoading[selectedOrder._id] ? (
                    <span className="text-xs text-[#6B7280] animate-pulse">Updating...</span>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {selectedOrder.status === 'received' && (
                        <div className="bg-[#F9FAFB] p-3 rounded-lg border border-[#E2E6EA] w-full">
                          <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-2">Set Preparation Time</label>
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              {[15, 20, 30, 45, 60].map((mins) => (
                                <button
                                  key={mins}
                                  type="button"
                                  onClick={() => setCustomEta(mins.toString())}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                                    customEta === mins.toString()
                                      ? 'bg-green-600 text-white border-green-600'
                                      : 'bg-white text-[#374151] border-[#E2E6EA] hover:bg-[#F4F6F9]'
                                  }`}
                                >
                                  {mins} min
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                min="1"
                                max="180"
                                placeholder="Custom minutes"
                                value={customEta}
                                onChange={(e) => setCustomEta(e.target.value)}
                                className="px-3 py-1.5 text-xs border border-[#E2E6EA] rounded-lg w-32 outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981]"
                              />
                            </div>
                            <div className="flex gap-2 items-center mt-2 border-t border-[#E2E6EA] pt-2">
                              <AdminButton
                                variant="success"
                                onClick={async () => {
                                  const mins = parseInt(customEta, 10) || 20;
                                  setActionLoading((prev) => ({ ...prev, [selectedOrder._id]: true }));
                                  try {
                                    const updated = await updateOrderEstimatedTime(selectedOrder._id, mins);
                                    setOrders((prev) => prev.map((o) => (o._id === selectedOrder._id ? updated : o)));
                                    setSelectedOrder(updated);
                                    acknowledgeOrder(selectedOrder._id);
                                    setCustomEta('');
                                  } catch (err) {
                                    const message = err instanceof Error ? err.message : 'Failed to accept order';
                                    alert(message);
                                  } finally {
                                    setActionLoading((prev) => ({ ...prev, [selectedOrder._id]: false }));
                                  }
                                }}
                              >
                                Accept Order
                              </AdminButton>
                              <AdminButton
                                variant="dangerSolid"
                                onClick={() => handleCancelOrder(selectedOrder._id)}
                              >
                                Reject Order
                              </AdminButton>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {selectedOrder.status === 'accepted' && (
                          <AdminButton onClick={() => handleStatusChange(selectedOrder._id, 'preparing')}>Start Preparing</AdminButton>
                        )}
                        {selectedOrder.status === 'preparing' && (
                          <AdminButton variant="success" onClick={() => handleStatusChange(selectedOrder._id, 'completed')}>Mark Ready</AdminButton>
                        )}
                        {['accepted', 'preparing'].includes(selectedOrder.status) && (
                          <AdminButton variant="danger" onClick={() => handleCancelOrder(selectedOrder._id)}>Cancel</AdminButton>
                        )}
                        {['completed', 'cancelled'].includes(selectedOrder.status) && (
                          <span className="text-sm text-[#6B7280]">This order is finalized.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-sm text-[#6B7280]">
                Select an order from the list to view details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Delay Reason & Notes Modal */}
      {delayModalOpen && pendingDelayOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 flex flex-col gap-4 relative">
            <button
              onClick={() => setDelayModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full inline-block mb-0.5">
                  DELAY AUDIT LOG
                </span>
                <h3 className="text-base font-extrabold text-gray-900">
                  Order #{pendingDelayOrder.order._id.substring(pendingDelayOrder.order._id.length - 6).toUpperCase()} Exceeded Promised ETA!
                </h3>
              </div>
            </div>

            {/* Delay Metrics Header Box */}
            <div className="bg-red-50/80 border border-red-200 rounded-2xl p-4 grid grid-cols-3 text-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-red-700 block">Promised ETA</span>
                <span className="text-base font-black text-red-950">{pendingDelayOrder.order.estimatedTime} min</span>
              </div>
              <div className="border-x border-red-200">
                <span className="text-[9px] uppercase font-bold text-red-700 block">Actual Time</span>
                <span className="text-base font-black text-red-950">{pendingDelayOrder.actualMins} min</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-red-700 block">Total Delay</span>
                <span className="text-base font-black text-red-600">+{pendingDelayOrder.delayMins} min</span>
              </div>
            </div>

            {/* Reason Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
                Select Delay Reason (Required for Admin Analytics) *
              </label>
              <div className="flex flex-col gap-1.5">
                {PRESET_DELAY_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedDelayReason(reason)}
                    className={`text-left text-xs px-3.5 py-2.5 rounded-xl border transition-all font-semibold flex items-center justify-between ${
                      selectedDelayReason === reason
                        ? 'bg-[#111827] text-white border-[#111827] shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span>{reason}</span>
                    {selectedDelayReason === reason && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notes Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                Optional Delay Notes / Details
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Extra large order of 6 momo sizzlers overwhelmed wok station..."
                value={customDelayReason}
                onChange={(e) => setCustomDelayReason(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 outline-none focus:border-indigo-600 transition-colors resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleConfirmDelayAndComplete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs py-3 rounded-xl uppercase tracking-wider transition-all shadow-md active:scale-98"
              >
                Log Delay & Mark Ready
              </button>
              <button
                type="button"
                onClick={() => setDelayModalOpen(false)}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-4">
        <div className="h-8 w-32 bg-[#E2E6EA] rounded animate-pulse" />
        <div className="h-96 bg-white border border-[#E2E6EA] rounded-xl animate-pulse" />
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}

interface OrderListItemProps {
  order: Order;
  isSelected: boolean;
  onClick: (order: Order) => void;
}

const OrderListItem = React.memo(function OrderListItem({ order, isSelected, onClick }: OrderListItemProps) {
  const displayId = order._id.substring(order._id.length - 6).toUpperCase();
  const itemNames = order.items.map((i) => i.name).join(', ');
  const dateStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      onClick={() => onClick(order)}
      className={`p-4 flex flex-col gap-1.5 cursor-pointer transition-colors ${
        isSelected ? 'bg-[#FEF2F2] border-l-[3px] border-l-[#C0181A]' : 'hover:bg-[#F4F6F9]'
      }`}
    >
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-[#111827]">#{displayId}</span>
        <span className="text-[11px] text-[#6B7280]">{dateStr}</span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-[#111827]">{order.customerName} {order.tableId ? `· Table ${order.tableId}` : ''}</span>
        <span className="font-semibold text-[#111827]">₹{order.total}</span>
      </div>
      <div className="text-[12px] text-[#6B7280] truncate">{itemNames}</div>
      <div className="mt-1 flex items-center gap-2 flex-wrap">
        <StatusBadge label={order.status} variant={getStatusVariant(order.status)} />
        {order.isDelayed && (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            <span>Delayed +{order.delayMinutes}m</span>
          </span>
        )}
      </div>
    </div>
  );
});
