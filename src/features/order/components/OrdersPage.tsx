'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAdminOrders, updateOrderStatus, updateOrderEstimatedTime } from '../services/order.service';
import { PageHeader, StatusBadge, AdminButton } from '@/components/ui';
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

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customEta, setCustomEta] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 50;

  const loadOrders = async (showLoading = false, pageNum = 1) => {
    if (showLoading) setLoading(true);
    try {
      const skipNum = (pageNum - 1) * limit;
      const data = await getAdminOrders(limit, skipNum, filter);
      const fetchedOrders = data.orders || [];
      const total = data.totalCount || 0;

      setOrders(fetchedOrders);
      setTotalCount(total);
      setCurrentPage(pageNum);

      if (highlightId && showLoading) {
        const found = fetchedOrders.find((o: Order) => o._id === highlightId);
        if (found) {
          setSelectedOrder(found);
          setViewMode('detail');
        }
      } else if (!selectedOrder && fetchedOrders.length > 0 && showLoading) {
        setSelectedOrder(fetchedOrders[0]);
      } else if (selectedOrder) {
        const updated = fetchedOrders.find((o: Order) => o._id === selectedOrder._id);
        if (updated) setSelectedOrder(updated);
      }

      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load orders.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(true, 1);
  }, [filter]);

  useEffect(() => {
    Promise.resolve().then(() => loadOrders(true, currentPage));
    const interval = setInterval(() => { loadOrders(false, currentPage); }, 10000);
    return () => clearInterval(interval);
  }, [highlightId, currentPage]);

  const handleStatusChange = async (orderId: string, nextStatus: Order['status']) => {
    setActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const updated = await updateOrderStatus(orderId, nextStatus);
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      setSelectedOrder(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update order status';
      alert(message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleEtaChange = async (orderId: string, minutes: number) => {
    setActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const updated = await updateOrderEstimatedTime(orderId, minutes);
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      setSelectedOrder(updated);
      setCustomEta('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update preparation time';
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
        {(['all', 'received', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'] as FilterStatus[]).map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
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
                {orders.map((order) => {
                  const displayId = order._id.substring(order._id.length - 6).toUpperCase();
                  const isSelected = selectedOrder?._id === order._id;
                  const itemNames = order.items.map((i) => i.name).join(', ');
                  const dateStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={order._id}
                      onClick={() => { setSelectedOrder(order); setViewMode('detail'); }}
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
                })}
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

                {/* ETA Controls */}
                {['received', 'accepted', 'preparing'].includes(selectedOrder.status) && (
                  <div className="border-t border-[#E2E6EA] pt-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-2">Set Preparation ETA</h3>
                    {actionLoading[selectedOrder._id] ? (
                      <span className="text-xs text-[#6B7280] animate-pulse">Updating...</span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {[10, 15, 20, 30, 45, 60].map((mins) => (
                            <button
                              key={mins}
                              onClick={() => handleEtaChange(selectedOrder._id, mins)}
                              className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E2E6EA] rounded-lg hover:bg-[#F4F6F9] transition-colors"
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
                            className="px-3 py-1.5 text-xs border border-[#E2E6EA] rounded-lg w-32 outline-none focus:ring-2 focus:ring-[#C0181A]/20 focus:border-[#C0181A]"
                          />
                          <AdminButton
                            size="sm"
                            onClick={() => {
                              const val = parseInt(customEta);
                              if (val > 0) handleEtaChange(selectedOrder._id, val);
                              else alert('Please enter valid minutes');
                            }}
                          >
                            Set
                          </AdminButton>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Controls */}
                <div className="border-t border-[#E2E6EA] pt-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-3">Update Status</h3>
                  {actionLoading[selectedOrder._id] ? (
                    <span className="text-xs text-[#6B7280] animate-pulse">Updating...</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedOrder.status === 'received' && (
                        <AdminButton onClick={() => handleStatusChange(selectedOrder._id, 'accepted')}>Accept Order</AdminButton>
                      )}
                      {selectedOrder.status === 'accepted' && (
                        <AdminButton onClick={() => handleStatusChange(selectedOrder._id, 'preparing')}>Start Preparing</AdminButton>
                      )}
                      {selectedOrder.status === 'preparing' && (
                        <AdminButton onClick={() => handleStatusChange(selectedOrder._id, 'ready')}>Mark Ready</AdminButton>
                      )}
                      {selectedOrder.status === 'ready' && (
                        <AdminButton onClick={() => handleStatusChange(selectedOrder._id, 'completed')}>Complete</AdminButton>
                      )}
                      {['received', 'accepted', 'preparing', 'ready'].includes(selectedOrder.status) && (
                        <AdminButton variant="danger" onClick={() => handleCancelOrder(selectedOrder._id)}>Cancel</AdminButton>
                      )}
                      {['completed', 'cancelled'].includes(selectedOrder.status) && (
                        <span className="text-sm text-[#6B7280]">This order is finalized.</span>
                      )}
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
