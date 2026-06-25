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

<<<<<<< Updated upstream
const STATUS_STEPS: Array<{ key: OrderData['status']; label: string; icon: React.ReactNode }> = [
  { key: 'received', label: 'Received', icon: <Check className="w-4 h-4" /> },
  { key: 'accepted', label: 'Accepted', icon: <Clock className="w-4 h-4" /> },
  { key: 'preparing', label: 'Preparing', icon: <ChefHat className="w-4 h-4" /> },
  { key: 'ready', label: 'Ready', icon: <UtensilsCrossed className="w-4 h-4" /> },
  { key: 'completed', label: 'Completed', icon: <PartyPopper className="w-4 h-4" /> },
=======
const STATUS_STEPS: Array<{ key: OrderData['status']; label: string; icon: string }> = [
  { key: 'received',  label: 'Order Received',  icon: 'receipt_long' },
  { key: 'accepted',  label: 'Order Accepted',  icon: 'thumb_up' },
  { key: 'preparing', label: 'Being Prepared',  icon: 'local_fire_department' },
  { key: 'ready',     label: 'Ready for Pickup', icon: 'room_service' },
  { key: 'completed', label: 'Completed',        icon: 'check_circle' },
>>>>>>> Stashed changes
];

const BRAND = '#8b0021';

export default function OrderTracker({ initialOrder, orderId }: OrderTrackerProps) {
  const [order, setOrder] = useState<OrderData>(initialOrder);
  const [now, setNow] = useState(() => Date.now());

<<<<<<< Updated upstream
=======
  // 2-second short polling
>>>>>>> Stashed changes
  useEffect(() => {
    if (order.status === 'completed' || order.status === 'cancelled') return;
    const interval = setInterval(async () => {
      try {
        const latestOrder = await getOrderById(orderId, order.restaurantId);
        if (latestOrder) setOrder(latestOrder);
      } catch (err) {
        console.error('Error polling order status:', err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [orderId, order.status, order.restaurantId]);

<<<<<<< Updated upstream
=======
  // 1-second ticking clock for prep ETA
>>>>>>> Stashed changes
  useEffect(() => {
    if (!order.estimatedTime || ['ready', 'completed', 'cancelled'].includes(order.status)) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [order.estimatedTime, order.status]);

  const getTimeLeft = () => {
    if (!order.estimatedTime || ['ready', 'completed', 'cancelled'].includes(order.status)) return null;
    const placedTime = new Date(order.createdAt).getTime();
    const targetTime = placedTime + order.estimatedTime * 60 * 1000;
    const difference = targetTime - now;
    if (difference <= 0) return 'Almost Ready';
    const minutes = Math.floor((difference / 1000 / 60) % 60);
    const seconds = Math.floor((difference / 1000) % 60);
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusSubtext = () => {
    switch (order.status) {
<<<<<<< Updated upstream
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
=======
      case 'received':   return 'Order received. Awaiting kitchen approval.';
      case 'accepted':   return 'Order approved. Preparing ingredients...';
      case 'preparing':  return 'Freshly cooking your order in our kitchen.';
      case 'ready':      return 'Your meal is hot and ready for pickup!';
      case 'completed':  return 'Order completed. Thank you for dining!';
      case 'cancelled':  return 'Order has been cancelled.';
      default:           return 'Tracking your order status...';
>>>>>>> Stashed changes
    }
  };

  const getStepIndex = (status: OrderData['status']) => {
    if (status === 'cancelled') return -1;
    return STATUS_STEPS.findIndex((step) => step.key === status);
  };

  const currentStepIndex = getStepIndex(order.status);
  const displayId = order._id.substring(order._id.length - 6).toUpperCase();
  const timeLeft = getTimeLeft();

  return (
<<<<<<< Updated upstream
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
=======
    <div className="min-h-screen pb-12" style={{ backgroundColor: 'var(--gourmet-surface)' }}>
      <style>{`
        .brand-primary { color: ${BRAND}; }
        .brand-bg { background-color: ${BRAND}; }
        .price-text { color: ${BRAND}; }
      `}</style>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 px-5 py-4"
        style={{ backgroundColor: 'var(--gourmet-surface)', boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${BRAND}15` }}>
            <span className="material-symbols-outlined text-[20px] brand-primary">receipt_long</span>
          </div>
          <div>
            <p className="text-[11px] font-medium" style={{ color: 'var(--gourmet-on-surface-variant)' }}>Live Status Tracker</p>
            <h1 className="font-serif text-xl font-bold leading-tight" style={{ color: 'var(--gourmet-on-surface)' }}>Order #{displayId}</h1>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* ── Status Banner ── */}
        {order.status === 'cancelled' && (
          <div className="rounded-2xl p-5 flex items-center gap-3 animate-fade-in-up" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
            <span className="material-symbols-outlined text-[28px]" style={{ color: '#dc2626', fontVariationSettings: `'FILL' 1` }}>cancel</span>
            <div>
              <p className="font-bold text-sm" style={{ color: '#991b1b' }}>Order Cancelled / Rejected</p>
              <p className="text-xs mt-0.5" style={{ color: '#b91c1c' }}>Please contact the restaurant for more information.</p>
            </div>
>>>>>>> Stashed changes
          </div>

<<<<<<< Updated upstream
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
=======
        {order.status === 'ready' && (
          <div
            className="rounded-2xl p-5 flex items-center gap-3 animate-scale-in"
            style={{ background: `linear-gradient(135deg, ${BRAND}, #b91c1c)`, color: '#fff' }}
          >
            <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: `'FILL' 1` }}>room_service</span>
            <div>
              <p className="font-serif font-bold text-lg">Your Order is Ready! 🍽️</p>
              <p className="text-sm opacity-90 mt-0.5">Come pick it up — it's hot and fresh!</p>
            </div>
          </div>
        )}

        {order.status === 'completed' && (
          <div className="rounded-2xl p-5 flex items-center gap-3 animate-fade-in-up" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <span className="material-symbols-outlined text-[28px]" style={{ color: '#15803d', fontVariationSettings: `'FILL' 1` }}>check_circle</span>
            <div>
              <p className="font-bold text-sm" style={{ color: '#166534' }}>Order Completed & Delivered</p>
              <p className="text-xs mt-0.5" style={{ color: '#15803d' }}>Thank you for dining with us!</p>
            </div>
          </div>
        )}

        {/* ── ETA Countdown ── */}
        {order.status !== 'cancelled' && order.status !== 'completed' && order.status !== 'ready' && order.estimatedTime && (
          <div className="gourmet-card p-5 flex items-center gap-5 animate-fade-in-up">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--gourmet-on-surface-variant)' }}>Prep Time</span>
              <span className="font-serif text-4xl font-bold price-text tabular-nums">
                {timeLeft || `${order.estimatedTime}:00`}
              </span>
              {timeLeft === 'Almost Ready' && (
                <span className="text-[11px] font-bold mt-0.5" style={{ color: '#15803d' }}>Almost Ready!</span>
              )}
            </div>
            <div style={{ width: '1px', height: '48px', backgroundColor: 'var(--gourmet-outline-variant)' }} />
            <div>
              <p className="font-serif font-bold text-base" style={{ color: 'var(--gourmet-on-surface)' }}>
                {STATUS_STEPS.find(s => s.key === order.status)?.label}
              </p>
              <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--gourmet-on-surface-variant)' }}>{getStatusSubtext()}</p>
            </div>
          </div>
        )}

        {/* ── Status Steps ── */}
        {order.status !== 'cancelled' && (
          <div className="gourmet-card p-5">
            <h2 className="font-serif font-bold text-lg mb-5" style={{ color: 'var(--gourmet-on-surface)' }}>Order Progress</h2>
            <div className="relative">
              {/* Vertical line */}
              <div
                className="absolute left-5 top-5 bottom-5 w-0.5"
                style={{ backgroundColor: 'var(--gourmet-outline-variant)' }}
              />
              {/* Filled progress line */}
              <div
                className="absolute left-5 top-5 w-0.5 transition-all duration-700 ease-out brand-bg"
                style={{ height: currentStepIndex > 0 ? `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` : '0%' }}
              />

              <div className="space-y-6">
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  return (
                    <div key={step.key} className="flex items-center gap-4 relative">
                      {/* Step circle */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all duration-300"
                        style={{
                          backgroundColor: isCompleted ? BRAND : 'var(--gourmet-surface-lowest)',
                          border: isCompleted ? `2px solid ${BRAND}` : '2px solid var(--gourmet-outline-variant)',
                          boxShadow: isCurrent ? `0 0 0 4px ${BRAND}22` : 'none',
                        }}
                      >
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={{
                            color: isCompleted ? '#fff' : 'var(--gourmet-outline)',
                            fontVariationSettings: isCompleted ? `'FILL' 1` : `'FILL' 0`,
                          }}
                        >
                          {isCompleted ? 'check_circle' : step.icon}
                        </span>
                      </div>

                      {/* Step label */}
                      <div className="flex-1">
                        <p
                          className="font-bold text-sm transition-all"
                          style={{
                            color: isCurrent ? BRAND : isCompleted ? 'var(--gourmet-on-surface)' : 'var(--gourmet-outline)',
                          }}
                        >
                          {step.label}
                          {isCurrent && (
                            <span
                              className="ml-2 text-[9px] font-black px-1.5 py-0.5 rounded-full text-white inline-block align-middle"
                              style={{ backgroundColor: BRAND }}
                            >
                              CURRENT
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
>>>>>>> Stashed changes
            </div>
          </div>

<<<<<<< Updated upstream
          {/* Back to Menu */}
          <Link
            href={`/menu/${order.restaurantId}`}
            className="block text-center bg-surface text-text-dark font-bold text-sm py-3 rounded-xl hover:bg-surface/80 transition-colors"
          >
=======
        {/* ── Order Summary ── */}
        <div className="gourmet-card overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h2 className="font-serif font-bold text-lg" style={{ color: 'var(--gourmet-on-surface)' }}>Order Summary</h2>
          </div>

          {/* Customer info */}
          <div className="px-5 pb-3" style={{ borderBottom: '1px solid var(--gourmet-outline-variant)' }}>
            <p className="text-sm" style={{ color: 'var(--gourmet-on-surface-variant)' }}>
              <span className="font-bold" style={{ color: 'var(--gourmet-on-surface)' }}>{order.customerName}</span>
              {' · '}{order.customerPhone}
            </p>
            <p className="text-[11px] mt-1 font-mono" style={{ color: 'var(--gourmet-outline)' }}>ID: {order._id}</p>
          </div>

          {/* Items */}
          <div className="divide-y" style={{ borderColor: 'var(--gourmet-outline-variant)' }}>
            {order.items.map((item, idx) => (
              <div key={idx} className="px-5 py-3 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--gourmet-on-surface)' }}>{item.name}</p>
                  <p className="text-xs" style={{ color: 'var(--gourmet-on-surface-variant)' }}>×{item.quantity} · ₹{item.price} each</p>
                </div>
                <p className="font-serif font-bold text-sm price-text">₹{item.price * item.quantity}</p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="px-5 py-4 flex justify-between items-center" style={{ backgroundColor: 'var(--gourmet-surface-low)' }}>
            <span className="font-serif font-bold text-base" style={{ color: 'var(--gourmet-on-surface)' }}>Total</span>
            <span className="font-serif font-bold text-xl price-text">₹{order.total}</span>
          </div>
        </div>

        {/* ── Back to menu ── */}
        <div className="text-center pt-2 pb-6">
          <Link
            href={`/menu/${order.restaurantId}`}
            className="inline-flex items-center gap-2 text-sm font-bold transition-opacity hover:opacity-70"
            style={{ color: BRAND }}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
>>>>>>> Stashed changes
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
