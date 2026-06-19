'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAdminOrders, updateOrderStatus, updateOrderEstimatedTime } from '@/actions/orders';

interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  _id: string;
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  estimatedTime?: number;
  createdAt: string;
}

type FilterStatus = 'all' | Order['status'];

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

  const loadOrders = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getAdminOrders();
      setOrders(data);

      // Handle highlight from URL if selectOrder is not manually set yet
      if (highlightId && showLoading) {
        const found = data.find((o: Order) => o._id === highlightId);
        if (found) {
          setSelectedOrder(found);
          setViewMode('detail');
        }
      } else if (!selectedOrder && data.length > 0 && showLoading) {
        setSelectedOrder(data[0]);
      } else if (selectedOrder) {
        // Keep selected order updated with new status if polled
        const updated = data.find((o: Order) => o._id === selectedOrder._id);
        if (updated) {
          setSelectedOrder(updated);
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

  useEffect(() => {
    Promise.resolve().then(() => loadOrders(true));

    // Poll orders every 10 seconds
    const interval = setInterval(() => {
      loadOrders(false);
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

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

  const filteredOrders = orders.filter((o) => (filter === 'all' ? true : o.status === filter));

  const getStatusLabel = (status: Order['status']) => {
    return status.toUpperCase();
  };

  const getStatusColorClass = (status: Order['status']) => {
    switch (status) {
      case 'cancelled':
        return 'border-red-600 text-red-600';
      case 'completed':
        return 'border-zinc-300 text-zinc-400';
      default:
        return 'border-black bg-black text-white';
    }
  };

  if (loading) {
    return <div className="font-mono-custom text-xs text-center py-12">LOADING ORDERS LIST...</div>;
  }

  return (
    <div className="font-mono-custom flex flex-col gap-6">
      {/* Title */}
      <div className="border-b border-black pb-4 flex justify-between items-baseline">
        <div>
          <h1 className="text-2xl font-bold uppercase">Orders</h1>
          <span className="text-xs uppercase text-zinc-500">Track and manage customer orders</span>
        </div>
        <span className="text-xs uppercase text-zinc-400">Live Updates Active</span>
      </div>

      {error && (
        <div className="border border-black p-3 text-xs bg-zinc-100 font-bold text-red-600 uppercase">
          ⚠️ {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-black">
        {(['all', 'received', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'] as FilterStatus[]).map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 text-[10px] font-bold border border-black cursor-pointer uppercase whitespace-nowrap transition-colors ${
                filter === status
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-zinc-100'
              }`}
            >
              {status}
            </button>
          )
        )}
      </div>

      {orders.length === 0 ? (
        <div className="border border-dashed border-black p-12 text-center text-xs uppercase bg-white">
          No orders received yet.
        </div>
      ) : (
        /* Split-Pane Layout */
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left pane: Orders list */}
          <div className={`w-full lg:w-1/2 border border-black bg-white max-h-[600px] overflow-y-auto ${viewMode === 'detail' ? 'hidden lg:block' : 'block'}`}>
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-xs uppercase text-zinc-400">
                No orders matching filter.
              </div>
            ) : (
              <div className="divide-y divide-black">
                {filteredOrders.map((order) => {
                  const displayId = order._id.substring(order._id.length - 6).toUpperCase();
                  const isSelected = selectedOrder?._id === order._id;
                  const itemNames = order.items.map((i) => i.name).join(', ');
                  const dateStr = new Date(order.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={order._id}
                      onClick={() => {
                        setSelectedOrder(order);
                        setViewMode('detail');
                      }}
                      className={`p-4 flex flex-col gap-1 cursor-pointer hover:bg-zinc-50 transition-colors ${
                        isSelected ? 'bg-zinc-100 border-l-4 border-black font-bold' : ''
                      }`}
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold">#{displayId}</span>
                        <span className="text-[10px] text-zinc-500">{dateStr}</span>
                      </div>
                      <div className="text-xs uppercase flex justify-between">
                        <span>{order.customerName}</span>
                        <span className="font-bold">₹{order.total}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate mt-1">
                        ITEMS: {itemNames}
                      </div>
                      <div className="mt-2 flex justify-start">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 border ${getStatusColorClass(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right pane: Order detail */}
          <div className={`w-full lg:w-1/2 border border-black p-6 bg-white flex flex-col gap-6 sticky top-6 ${viewMode === 'list' ? 'hidden lg:flex' : 'flex'}`}>
            {selectedOrder ? (
              <>
                {/* Back Button for Mobile */}
                <button
                  onClick={() => setViewMode('list')}
                  className="lg:hidden w-full border border-black py-2.5 text-xs font-bold uppercase bg-zinc-50 hover:bg-zinc-100 transition-all cursor-pointer mb-2"
                >
                  ← Back to Orders List
                </button>
                {/* Header */}
                <div className="border-b border-black pb-4">
                  <div className="flex justify-between items-baseline">
                    <h2 className="text-lg font-bold">ORDER DETAILS</h2>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 border ${getStatusColorClass(
                        selectedOrder.status
                      )}`}
                    >
                      {getStatusLabel(selectedOrder.status)}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase mt-1 block">
                    ID: {selectedOrder._id}
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase mt-0.5 block">
                    Placed: {new Date(selectedOrder.createdAt).toLocaleString()}
                  </span>
                  {selectedOrder.estimatedTime ? (
                    <span className="text-[10px] text-black font-bold uppercase mt-0.5 block bg-zinc-100 px-2 py-0.5 w-fit border border-dashed border-black">
                      Preparation ETA: {selectedOrder.estimatedTime} mins
                    </span>
                  ) : null}
                </div>

                {/* Customer Details */}
                <div>
                  <h3 className="font-bold text-xs uppercase mb-2 border-b border-dashed border-zinc-200 pb-1">
                    Customer
                  </h3>
                  <p className="text-xs font-bold">{selectedOrder.customerName.toUpperCase()}</p>
                  <p className="text-xs text-zinc-600 mt-1">{selectedOrder.customerPhone}</p>
                </div>

                {/* Receipt Details */}
                <div>
                  <h3 className="font-bold text-xs uppercase mb-2 border-b border-dashed border-zinc-200 pb-1">
                    Receipt
                  </h3>
                  <div className="divide-y divide-dashed divide-zinc-200 text-xs">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="py-2 flex justify-between uppercase">
                        <span>
                          {item.name} x{item.quantity}
                        </span>
                        <span>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-black pt-3 mt-2 flex justify-between font-bold text-sm uppercase">
                    <span>Total Paid</span>
                    <span>₹{selectedOrder.total}</span>
                  </div>
                </div>

                {/* Workflow Transitions */}
                <div className="border-t border-black pt-4 flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-xs uppercase mb-2">Set Preparation ETA</h3>
                    {actionLoading[selectedOrder._id] ? (
                      <span className="text-xs font-bold uppercase text-zinc-400 animate-pulse block my-1">
                        🔄 Updating order ETA...
                      </span>
                    ) : ['received', 'accepted', 'preparing'].includes(selectedOrder.status) ? (
                      <div className="flex flex-col gap-2">
                        {/* Preset ETA Buttons */}
                        <div className="flex flex-wrap gap-1.5">
                          {[10, 15, 20, 30, 45, 60].map((mins) => (
                            <button
                              key={mins}
                              onClick={() => handleEtaChange(selectedOrder._id, mins)}
                              disabled={actionLoading[selectedOrder._id]}
                              className="border border-black bg-white text-black hover:bg-black hover:text-white px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer"
                            >
                              +{mins} Min
                            </button>
                          ))}
                        </div>
                        
                        {/* Custom ETA input */}
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            min="1"
                            max="180"
                            placeholder="Custom Mins (e.g. 25)"
                            value={customEta}
                            onChange={(e) => setCustomEta(e.target.value)}
                            disabled={actionLoading[selectedOrder._id]}
                            className="text-[10px] w-36 px-2 py-1"
                          />
                          <button
                            onClick={() => {
                              const val = parseInt(customEta);
                              if (val > 0) {
                                handleEtaChange(selectedOrder._id, val);
                              } else {
                                alert('Please enter valid minutes');
                              }
                            }}
                            disabled={actionLoading[selectedOrder._id]}
                            className="border border-black bg-black text-white hover:bg-white hover:text-black px-3 py-1 text-[10px] font-bold uppercase cursor-pointer"
                          >
                            [ SET ]
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-400 uppercase italic">
                        Cannot change ETA for {selectedOrder.status} orders.
                      </span>
                    )}
                  </div>

                  <div className="border-t border-dashed border-zinc-200 pt-3 flex flex-col gap-2">
                    <h3 className="font-bold text-xs uppercase mb-2">Change Order Status</h3>
                    {actionLoading[selectedOrder._id] ? (
                      <span className="text-xs font-bold uppercase text-zinc-400 animate-pulse block my-1">
                        🔄 Transiting order status...
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {selectedOrder.status === 'received' && (
                          <button
                            onClick={() => handleStatusChange(selectedOrder._id, 'accepted')}
                            disabled={actionLoading[selectedOrder._id]}
                            className="border border-black bg-black text-white hover:bg-white hover:text-black font-bold px-3 py-1.5 cursor-pointer uppercase"
                          >
                            [ Accept Order ]
                          </button>
                        )}
                        {selectedOrder.status === 'accepted' && (
                          <button
                            onClick={() => handleStatusChange(selectedOrder._id, 'preparing')}
                            disabled={actionLoading[selectedOrder._id]}
                            className="border border-black bg-black text-white hover:bg-white hover:text-black font-bold px-3 py-1.5 cursor-pointer uppercase"
                          >
                            [ Start Preparing ]
                          </button>
                        )}
                        {selectedOrder.status === 'preparing' && (
                          <button
                            onClick={() => handleStatusChange(selectedOrder._id, 'ready')}
                            disabled={actionLoading[selectedOrder._id]}
                            className="border border-black bg-black text-white hover:bg-white hover:text-black font-bold px-3 py-1.5 cursor-pointer uppercase"
                          >
                            [ Mark as Ready ]
                          </button>
                        )}
                        {selectedOrder.status === 'ready' && (
                          <button
                            onClick={() => handleStatusChange(selectedOrder._id, 'completed')}
                            disabled={actionLoading[selectedOrder._id]}
                            className="border border-black bg-black text-white hover:bg-white hover:text-black font-bold px-3 py-1.5 cursor-pointer uppercase"
                          >
                            [ Mark as Completed ]
                          </button>
                        )}
                        {['received', 'accepted', 'preparing', 'ready'].includes(selectedOrder.status) && (
                          <button
                            onClick={() => handleCancelOrder(selectedOrder._id)}
                            disabled={actionLoading[selectedOrder._id]}
                            className="border border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-bold px-3 py-1.5 cursor-pointer uppercase"
                          >
                            [ Reject/Cancel Order ]
                          </button>
                        )}
                        {['completed', 'cancelled'].includes(selectedOrder.status) && (
                          <span className="text-[10px] text-zinc-400 uppercase italic">
                            This order is final and has no remaining transitions.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-xs uppercase text-zinc-400">
                Select an order from the list to view details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="font-mono-custom text-xs text-center py-12">LOADING ORDERS PAGE...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
