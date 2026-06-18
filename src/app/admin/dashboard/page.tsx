'use client';

import React, { useEffect, useState } from 'react';
import { getDashboardMetrics, updateOrderStatus } from '@/actions/orders';
import Link from 'next/link';

interface Order {
  _id: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  createdAt: string;
}

interface Metrics {
  ordersToday: number;
  revenueToday: number;
  pendingOrders: number;
  customers: number;
  recentOrders: Order[];
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getDashboardMetrics();
      setMetrics(data);
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
    Promise.resolve().then(() => fetchMetrics(true));

    // Short-poll every 10 seconds for real-time dashboard updates
    const interval = setInterval(() => {
      fetchMetrics(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleStatusTransition = async (orderId: string, currentStatus: Order['status']) => {
    let nextStatus: Order['status'];
    
    switch (currentStatus) {
      case 'received':
        nextStatus = 'accepted';
        break;
      case 'accepted':
        nextStatus = 'preparing';
        break;
      case 'preparing':
        nextStatus = 'ready';
        break;
      case 'ready':
        nextStatus = 'completed';
        break;
      default:
        return;
    }

    try {
      await updateOrderStatus(orderId, nextStatus);
      // Refresh metrics
      fetchMetrics(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update order status';
      alert(message);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      try {
        await updateOrderStatus(orderId, 'cancelled');
        fetchMetrics(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel order';
        alert(message);
      }
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'received':
        return 'RECEIVED';
      case 'accepted':
        return 'ACCEPTED';
      case 'preparing':
        return 'PREPARING';
      case 'ready':
        return 'READY';
      case 'completed':
        return 'COMPLETED';
      case 'cancelled':
        return 'CANCELLED';
    }
  };

  if (loading) {
    return <div className="font-mono-custom text-xs text-center py-12">LOADING DASHBOARD METRICS...</div>;
  }

  if (error) {
    return (
      <div className="border border-black p-4 bg-zinc-50 font-mono-custom text-xs">
        <h3 className="font-bold text-red-600 uppercase mb-2">Error Loading Dashboard</h3>
        <p className="mb-4">{error}</p>
        <button
          onClick={() => fetchMetrics(true)}
          className="border border-black px-3 py-1 font-bold uppercase hover:bg-black hover:text-white"
        >
          [ Retry ]
        </button>
      </div>
    );
  }

  return (
    <div className="font-mono-custom flex flex-col gap-8">
      {/* Title */}
      <div className="border-b border-black pb-4 flex justify-between items-baseline">
        <h1 className="text-2xl font-bold uppercase">Overview</h1>
        <span className="text-xs uppercase text-zinc-500">Live Polling Active</span>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-black p-5 bg-white">
          <span className="text-xs uppercase text-zinc-500 block mb-1">Orders Today</span>
          <span className="text-3xl font-bold">{metrics?.ordersToday}</span>
        </div>
        <div className="border border-black p-5 bg-white">
          <span className="text-xs uppercase text-zinc-500 block mb-1">Revenue Today</span>
          <span className="text-3xl font-bold">₹{metrics?.revenueToday}</span>
        </div>
        <div className="border border-black p-5 bg-white">
          <span className="text-xs uppercase text-zinc-500 block mb-1">Pending Orders</span>
          <span className="text-3xl font-bold">{metrics?.pendingOrders}</span>
        </div>
        <div className="border border-black p-5 bg-white">
          <span className="text-xs uppercase text-zinc-500 block mb-1">Total Customers</span>
          <span className="text-3xl font-bold">{metrics?.customers}</span>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-baseline">
          <h2 className="text-lg font-bold uppercase">Recent Orders</h2>
          <Link href="/admin/orders" className="text-xs uppercase underline hover:no-underline">
            [ View All Orders ]
          </Link>
        </div>

        {metrics?.recentOrders.length === 0 ? (
          <div className="border border-dashed border-black p-8 text-center text-xs uppercase">
            No orders received yet.
          </div>
        ) : (
          <div className="border border-black overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-black bg-zinc-50 font-bold text-xs uppercase">
                  <th className="p-3 border-r border-black">Order ID</th>
                  <th className="p-3 border-r border-black">Customer</th>
                  <th className="p-3 border-r border-black">Amount</th>
                  <th className="p-3 border-r border-black">Status</th>
                  <th className="p-3 border-r border-black">Time</th>
                  <th className="p-3">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-xs uppercase">
                {metrics?.recentOrders.map((order) => {
                  const displayId = order._id.substring(order._id.length - 6).toUpperCase();
                  const orderTime = new Date(order.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={order._id} className="hover:bg-zinc-50">
                      <td className="p-3 border-r border-black font-bold">
                        <Link href={`/admin/orders?highlight=${order._id}`} className="underline">
                          #{displayId}
                        </Link>
                      </td>
                      <td className="p-3 border-r border-black">
                        {order.customerName}
                        <span className="text-[10px] text-zinc-500 block">{order.customerPhone}</span>
                      </td>
                      <td className="p-3 border-r border-black font-bold">₹{order.total}</td>
                      <td className="p-3 border-r border-black">
                        <span
                          className={`font-bold px-1.5 py-0.5 border ${
                            order.status === 'cancelled'
                              ? 'border-red-600 text-red-600'
                              : order.status === 'completed'
                              ? 'border-zinc-400 text-zinc-500'
                              : 'border-black bg-black text-white'
                          }`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="p-3 border-r border-black">{orderTime}</td>
                      <td className="p-3 flex gap-2">
                        {order.status === 'received' && (
                          <button
                            onClick={() => handleStatusTransition(order._id, 'received')}
                            className="border border-black px-2 py-0.5 bg-white text-black hover:bg-black hover:text-white cursor-pointer font-bold"
                          >
                            [ ACCEPT ]
                          </button>
                        )}
                        {order.status === 'accepted' && (
                          <button
                            onClick={() => handleStatusTransition(order._id, 'accepted')}
                            className="border border-black px-2 py-0.5 bg-white text-black hover:bg-black hover:text-white cursor-pointer font-bold"
                          >
                            [ PREPARE ]
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => handleStatusTransition(order._id, 'preparing')}
                            className="border border-black px-2 py-0.5 bg-white text-black hover:bg-black hover:text-white cursor-pointer font-bold"
                          >
                            [ READY ]
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <button
                            onClick={() => handleStatusTransition(order._id, 'ready')}
                            className="border border-black px-2 py-0.5 bg-white text-black hover:bg-black hover:text-white cursor-pointer font-bold"
                          >
                            [ COMPLETE ]
                          </button>
                        )}
                        {['received', 'accepted', 'preparing', 'ready'].includes(order.status) && (
                          <button
                            onClick={() => handleCancelOrder(order._id)}
                            className="border border-red-600 text-red-600 px-2 py-0.5 hover:bg-red-600 hover:text-white cursor-pointer font-bold"
                          >
                            [ CANCEL ]
                          </button>
                        )}
                        {['completed', 'cancelled'].includes(order.status) && (
                          <span className="text-[10px] text-zinc-400">NO ACTIONS</span>
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
  );
}
