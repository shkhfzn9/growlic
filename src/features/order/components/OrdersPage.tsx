'use client';

import React, { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAdminOrders, updateOrderStatus, updateOrderEstimatedTime } from '../services/order.service';
import { PageHeader, StatusBadge, AdminButton } from '@/components/ui';
import { useOrderNotification } from '@/components/providers';
import { Clock, ArrowLeft } from 'lucide-react';
import { OrderItem, Order } from '../types/order.types';

type FilterStatus = 'all' | Order['status'];

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
      const fetchedOrders = data.orders || [];
      const total = data.totalCount || 0;

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

  // Tracks initial mount to show skeleton loader only once
  const isInitialMount = useRef(true);

  // Consolidated loading effect (runs when filter, page, or highlightId change)
  useEffect(() => {
    const showLoading = isInitialMount.current;
    loadOrders(showLoading, currentPage);
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [filter, currentPage, highlightId]);

  // Polling effect (runs every 10 seconds, accesses latest states through refs)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      loadOrders(false);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (orderId: string, nextStatus: Order['status']) => {
    setActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const updated = await updateOrderStatus(orderId, nextStatus);
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      setSelectedOrder(updated);
      acknowledgeOrder(orderId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update order status';
      alert(message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };



  const handleCancelOrder = async (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      setActionLoading((prev) => ({ ...prev, [orderId]: true }));
      try {
        const updated = await updateOrderStatus(orderId, 'cancelled');
        setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
        setSelectedOrder(updated);
        acknowledgeOrder(orderId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel order';
        alert(message);
      } finally {
        setActionLoading((prev) => ({ ...prev, [orderId]: false }));
      }
    }
  };

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
        title="Orders"
        subtitle="Track and manage customer orders in real-time"
        actions={
          <span className="inline-flex items-center gap-1.5 text-xs text-[#16A34A] font-medium bg-[#F0FDF4] px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
            Live
          </span>
        }
      />

      {error && (
        <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg p-3 text-sm text-[#DC2626] font-medium">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'received', 'accepted', 'preparing', 'completed', 'cancelled'] as FilterStatus[]).map(
          (status) => (
            <button
              key={status}
              onClick={() => {
                setFilter(status);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors capitalize ${
                filter === status
                  ? 'bg-[#111827] text-white'
                  : 'bg-white text-[#6B7280] border border-[#E2E6EA] hover:bg-[#F4F6F9]'
              }`}
            >
              {status}
            </button>
          )
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-[#E2E6EA] rounded-xl p-16 text-center">
          <p className="text-sm text-[#6B7280]">No orders received yet.</p>
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

                {selectedOrder.estimatedTime && (
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
      <div className="mt-1">
        <StatusBadge label={order.status} variant={getStatusVariant(order.status)} />
      </div>
    </div>
  );
});
