'use client';

import React, { useEffect, useState } from 'react';
import { getOrderById } from '@/actions/orders';
import Link from 'next/link';
import { Check, Clock, ChefHat, UtensilsCrossed, PartyPopper, XCircle } from 'lucide-react';

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

const STATUS_STEPS: Array<{ key: OrderData['status']; label: string; icon: React.ReactNode }> = [
  { key: 'received', label: 'Received', icon: <Check className="w-4 h-4" /> },
  { key: 'accepted', label: 'Accepted', icon: <Clock className="w-4 h-4" /> },
  { key: 'preparing', label: 'Preparing', icon: <ChefHat className="w-4 h-4" /> },
  { key: 'ready', label: 'Ready', icon: <UtensilsCrossed className="w-4 h-4" /> },
  { key: 'completed', label: 'Completed', icon: <PartyPopper className="w-4 h-4" /> },
];

export default function OrderTracker({ initialOrder, orderId }: OrderTrackerProps) {
  const [order, setOrder] = useState<OrderData>(initialOrder);
  const [now, setNow] = useState(() => Date.now());

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

  useEffect(() => {
    if (!order.estimatedTime || ['ready', 'completed', 'cancelled'].includes(order.status)) {
      return;
    }

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [order.estimatedTime, order.status]);

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

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusSubtext = () => {
    switch (order.status) {
      case 'received':
        return 'Order received. Awaiting kitchen approval.';
      case 'accepted':
        return 'Order approved. Preparing ingredients...';
      case 'preparing':
        return 'Freshly cooking your order now.';
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
    <div className="min-h-screen bg-gradient-to-br from-bg-dark to-bg-darker flex flex-col relative overflow-hidden">
      {/* Wave decoration */}
      <svg className="absolute bottom-0 left-0 w-full h-[40%]" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path d="M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,154.7C672,149,768,171,864,186.7C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L0,320Z" fill="#C0181A" fillOpacity="0.15" />
      </svg>

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6 w-full max-w-md flex flex-col gap-5">
          {/* Header */}
          <div className="text-center">
            <span className="text-[0.65rem] text-primary font-bold uppercase tracking-wider">Live Status Tracker</span>
            <h1 className="font-black text-2xl text-text-dark uppercase tracking-tight mt-1">
              Order #{displayId}
            </h1>
            <p className="text-[0.6rem] text-text-dark/40 mt-0.5">{order._id}</p>
          </div>

          {/* Status Banners */}
          {order.status === 'cancelled' && (
            <div className="bg-primary/10 rounded-xl p-4 text-center flex items-center justify-center gap-2">
              <XCircle className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm text-primary uppercase">Order Cancelled</span>
            </div>
          )}

          {order.status === 'ready' && (
            <div className="bg-cta/20 rounded-xl p-4 text-center">
              <span className="font-black text-sm text-text-dark uppercase">Your Order is Ready for Pickup!</span>
            </div>
          )}

          {order.status === 'completed' && (
            <div className="bg-surface rounded-xl p-4 text-center">
              <span className="font-bold text-sm text-text-dark/60 uppercase">Order Completed</span>
            </div>
          )}

          {/* Countdown Timer */}
          {order.status !== 'cancelled' && order.status !== 'completed' && order.status !== 'ready' && order.estimatedTime && (
            <div className="bg-surface rounded-xl p-5 text-center">
              <span className="text-[0.6rem] text-text-dark/50 uppercase tracking-wider font-bold block">Estimated Time</span>
              <span className="font-black text-4xl text-text-dark tracking-tight block mt-1">
                {timeLeft || `${order.estimatedTime}:00`}
              </span>
              <span className="text-xs text-text-dark/50 mt-1 block">{getStatusSubtext()}</span>
            </div>
          )}

          {/* Progress Steps */}
          {order.status !== 'cancelled' && (
            <div className="flex flex-col gap-0 py-2">
              {STATUS_STEPS.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step.key} className="flex items-center gap-3 relative">
                    {/* Connector line */}
                    {index > 0 && (
                      <div className={`absolute left-[15px] -top-3 w-0.5 h-3 ${
                        index <= currentStepIndex ? 'bg-primary' : 'bg-surface'
                      }`} />
                    )}

                    {/* Circle */}
                    <div
                      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        isCompleted
                          ? 'bg-primary text-white'
                          : 'bg-surface text-text-dark/30'
                      } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                    >
                      {step.icon}
                    </div>

                    {/* Label */}
                    <span
                      className={`text-sm ${
                        isCurrent ? 'font-black text-text-dark' : isCompleted ? 'font-bold text-text-dark' : 'text-text-dark/40'
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
          <div className="border-t border-surface pt-4">
            <h3 className="text-[0.65rem] font-bold uppercase text-bg-dark tracking-wider mb-2">Customer</h3>
            <p className="text-sm text-text-dark font-medium">{order.customerName}</p>
            <p className="text-xs text-text-dark/60">{order.customerPhone}</p>
          </div>

          {/* Order Items */}
          <div className="border-t border-surface pt-4">
            <h3 className="text-[0.65rem] font-bold uppercase text-bg-dark tracking-wider mb-2">Items</h3>
            <div className="flex flex-col gap-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-text-dark">
                    {item.name} <span className="text-text-dark/50">×{item.quantity}</span>
                  </span>
                  <span className="font-bold text-text-dark">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-surface pt-2 mt-3 flex justify-between">
              <span className="font-black text-text-dark">Total</span>
              <span className="font-black text-lg text-primary">₹{order.total}</span>
            </div>
          </div>

          {/* Back to Menu */}
          <Link
            href={`/menu/${order.restaurantId}`}
            className="block text-center bg-surface text-text-dark font-bold text-sm py-3 rounded-xl hover:bg-surface/80 transition-colors"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
