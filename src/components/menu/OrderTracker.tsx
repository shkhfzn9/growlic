'use client';

import React, { useEffect, useState } from 'react';
import { getOrderById } from '@/actions/orders';
import Link from 'next/link';

interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderData {
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

interface OrderTrackerProps {
  initialOrder: OrderData;
  orderId: string;
}

const STATUS_STEPS: Array<{ key: OrderData['status']; label: string }> = [
  { key: 'received', label: 'Received' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
];

export default function OrderTracker({ initialOrder, orderId }: OrderTrackerProps) {
  const [order, setOrder] = useState<OrderData>(initialOrder);
  const [now, setNow] = useState(() => Date.now());

  // Set up 2-second short polling for near-instant real-time updates
  useEffect(() => {
    if (order.status === 'completed' || order.status === 'cancelled') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const latestOrder = await getOrderById(orderId, order.restaurantId);
        if (latestOrder) {
          setOrder(latestOrder);
        }
      } catch (err) {
        console.error('Error polling order status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [orderId, order.status, order.restaurantId]);

  // Set up 1-second active ticking clock for prep ETA
  useEffect(() => {
    if (!order.estimatedTime || ['ready', 'completed', 'cancelled'].includes(order.status)) {
      return;
    }

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [order.estimatedTime, order.status]);

  // Dynamically derive ticking countdown string
  const getTimeLeft = () => {
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

    const minutes = Math.floor((difference / 1000 / 60) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    const minutesStr = minutes.toString().padStart(2, '0');
    const secondsStr = seconds.toString().padStart(2, '0');

    return `${minutesStr}:${secondsStr}`;
  };

  // Get a user-friendly tracking description based on the order status
  const getStatusSubtext = () => {
    switch (order.status) {
      case 'received':
        return 'Order received. Awaiting kitchen approval.';
      case 'accepted':
        return 'Order approved. Preparing ingredients...';
      case 'preparing':
        return 'Freshly cooking your order in our Srinagar kitchen.';
      case 'ready':
        return 'Your meal is hot and ready for pickup!';
      case 'completed':
        return 'Order picked up. Thank you for dining!';
      case 'cancelled':
        return 'Order has been cancelled.';
      default:
        return 'Tracking your order status...';
    }
  };

  const timeLeft = getTimeLeft();

  const getStepIndex = (status: OrderData['status']) => {
    if (status === 'cancelled') return -1;
    return STATUS_STEPS.findIndex((step) => step.key === status);
  };

  const currentStepIndex = getStepIndex(order.status);
  const displayId = order._id.substring(order._id.length - 6).toUpperCase();

  return (
    <div className="max-w-md mx-auto px-4 py-8 font-mono-custom min-h-screen flex flex-col justify-center animate-fade-in">
      <div className="border border-black p-6 bg-white flex flex-col gap-6 shadow-md">
        {/* Header */}
        <div className="border-b border-black pb-4 text-center">
          <span className="text-xs uppercase text-zinc-500 font-bold">Live Status Tracker</span>
          <h1 className="text-2xl font-bold uppercase mt-1">Order #{displayId}</h1>
          <span className="text-[10px] text-zinc-400 block mt-1 uppercase font-sans">
            ID: {order._id}
          </span>
        </div>

        {/* State Banner Notifications */}
        {order.status === 'cancelled' && (
          <div className="border-2 border-red-600 bg-red-50 p-4 text-center text-red-600 font-bold uppercase text-sm">
            ❌ ORDER CANCELLED / REJECTED
          </div>
        )}

        {order.status === 'ready' && (
          <div className="border-2 border-black bg-zinc-100 p-4 text-center text-black font-extrabold uppercase text-sm border-black-double">
            🍲 YOUR ORDER IS READY FOR PICKUP!
          </div>
        )}

        {order.status === 'completed' && (
          <div className="border-2 border-black bg-zinc-50 p-4 text-center text-zinc-500 font-bold uppercase text-sm">
            ✓ ORDER COMPLETED & DELIVERED
          </div>
        )}

        {/* Estimated Prep ETA Countdown */}
        {order.status !== 'cancelled' && order.status !== 'completed' && order.status !== 'ready' && order.estimatedTime ? (
          <div className="border-2 border-black bg-zinc-50 p-4 text-center flex flex-col gap-1 items-center justify-center">
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Estimated Prep Countdown</span>
            <span className="text-3xl font-extrabold tracking-tighter">
              {timeLeft || `${order.estimatedTime}:00`}
            </span>
            <span className="text-[9px] text-zinc-400 uppercase">
              {getStatusSubtext()}
            </span>
          </div>
        ) : null}

        {/* Status Progress Steps */}
        {order.status !== 'cancelled' && (
          <div className="flex flex-col gap-4 py-2 border-t border-b border-zinc-100 my-1">
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step.key} className="flex items-center gap-4">
                  <div
                    className={`w-6 h-6 border flex items-center justify-center select-none font-bold text-xs transition-all ${
                      isCompleted
                        ? 'border-black bg-black text-white'
                        : 'border-black bg-white text-black'
                    }`}
                  >
                    {isCompleted ? '✓' : '○'}
                  </div>
                  <span
                    className={`text-sm uppercase ${
                      isCurrent ? 'font-bold underline' : isCompleted ? 'font-bold' : 'text-zinc-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Customer Details */}
        <div className="border-t border-black pt-4">
          <h3 className="font-bold text-xs uppercase mb-2">Customer Details</h3>
          <p className="text-xs">NAME: {order.customerName.toUpperCase()}</p>
          <p className="text-xs mt-1">PHONE: {order.customerPhone}</p>
        </div>

        {/* Order Items Summary */}
        <div className="border-t border-black pt-4">
          <h3 className="font-bold text-xs uppercase mb-2">Order Items</h3>
          <div className="divide-y divide-dashed divide-zinc-300">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-2 flex justify-between text-xs uppercase">
                <span>
                  {item.name} x{item.quantity}
                </span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-black pt-2 mt-2 flex justify-between font-bold text-sm uppercase">
            <span>Total</span>
            <span>₹{order.total}</span>
          </div>
        </div>

        {/* Go Back Link */}
        <div className="text-center pt-2">
          <Link
            href={`/menu/${order.restaurantId}`}
            className="text-xs uppercase underline hover:no-underline font-bold"
          >
            [ Back to Menu ]
          </Link>
        </div>
      </div>
    </div>
  );
}
