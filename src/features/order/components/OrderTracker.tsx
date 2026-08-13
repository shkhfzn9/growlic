'use client';

import React, { useEffect, useState } from 'react';
import { getOrderById, getCustomerLoyaltyInfo } from '@/actions/orders';
import { getDeveloperPromo } from '@/actions/developerPromo';
import Link from 'next/link';
import { Check, Clock, ChefHat, UtensilsCrossed, PartyPopper, XCircle, ExternalLink, Sparkles, MessageCircle, PhoneCall, CreditCard, QrCode, X, Camera, Smartphone, Image as ImageIcon } from 'lucide-react';
import { CustomerNavbar } from '@/components/layout';
import ConsultationModal from '@/components/ui/ConsultationModal';
import { TRACK_NUDGES } from '../constants/trackNudges';

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
  restaurantWhatsApp?: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  estimatedTime?: number;
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface OrderTrackerProps {
  initialOrder: OrderData;
  orderId: string;
}

const STATUS_STEPS: Array<{ key: OrderData['status']; label: string; icon: React.ReactNode }> = [
  { key: 'accepted', label: 'Accepted', icon: <Clock className="w-4 h-4" /> },
  { key: 'preparing', label: 'Preparing', icon: <ChefHat className="w-4 h-4" /> },
  { key: 'completed', label: 'Completed', icon: <PartyPopper className="w-4 h-4" /> },
];

export default function OrderTracker({ initialOrder, orderId }: OrderTrackerProps) {
  const [order, setOrder] = useState<OrderData>(initialOrder);
  const [now, setNow] = useState(() => Date.now());
  const [mounted, setMounted] = useState(false);
  const [currentNudgeIdx, setCurrentNudgeIdx] = useState(0);
  const [loyaltyInfo, setLoyaltyInfo] = useState<{
    loyaltyEnabled: boolean;
    stampsRequired: number;
    stampCount: number;
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [devPromo, setDevPromo] = useState<any>(null);
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (order.restaurantId) {
      getDeveloperPromo(order.restaurantId)
        .then((data) => {
          if (data) setDevPromo(data);
        })
        .catch((err) => console.error('Error fetching dev promo on tracker:', err));
    }
  }, [order.restaurantId]);

  useEffect(() => {
    if (order.customerPhone && order.restaurantId) {
      getCustomerLoyaltyInfo(order.customerPhone, order.restaurantId)
        .then((info) => {
          if (info && info.loyaltyEnabled) {
            setLoyaltyInfo({
              loyaltyEnabled: true,
              stampsRequired: info.stampsRequired || 8,
              stampCount: info.customer?.stampCount || 0,
            });
          }
        })
        .catch((err) => console.error('Error fetching tracker loyalty info:', err));
    }
  }, [order.customerPhone, order.restaurantId]);

  useEffect(() => {
    const isPreparing = !['ready', 'completed', 'cancelled'].includes(order.status);
    if (!isPreparing) return;

    const interval = setInterval(() => {
      setCurrentNudgeIdx((prev) => (prev + 1) % TRACK_NUDGES.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [order.status]);

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
    }, 5000);

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
      case 'completed':
        return 'Your meal is hot and ready for pickup!';
      case 'cancelled':
        return 'Order has been cancelled.';
      default:
        return 'Tracking your order status...';
    }
  };

  const timeLeft = getTimeLeft();

  const getStepIndex = (status: OrderData['status']) => {
    if (status === 'cancelled' || status === 'received') return -1;
    if (status === 'ready') return 2; // Map ready (legacy) to Completed step
    return STATUS_STEPS.findIndex((step) => step.key === status);
  };

  const currentStepIndex = getStepIndex(order.status);
  const displayId = order._id.substring(order._id.length - 6).toUpperCase();

  // WhatsApp & Emergency Contact calculations
  const targetWhatsAppNum = order.restaurantWhatsApp || '9541234068';
  const cleanPhoneDigits = targetWhatsAppNum.replace(/\D/g, '');
  const formattedWaPhone = cleanPhoneDigits.length === 10 ? `91${cleanPhoneDigits}` : cleanPhoneDigits;

  const elapsedMs = now - new Date(order.createdAt).getTime();
  const isUnacceptedOver5Min = (order.status === 'received' || order.status === 'accepted') && elapsedMs >= 5 * 60 * 1000;

  const orderItemsFormatted = order.items
    .map((item) => `• *${item.name}* ×${item.quantity} - ₹${item.price * item.quantity}`)
    .join('\n');

  const currentTrackUrl = typeof window !== 'undefined' ? window.location.href : '';

  const whatsappMessageText = `Hello! I just placed an order on your digital menu:

*Order ID:* #${displayId} (${order._id})
*Customer:* ${order.customerName}
*Phone:* ${order.customerPhone}

*Items:*
${orderItemsFormatted}

*Total Amount:* ₹${order.total}${order.notes ? `\n*Note:* ${order.notes}` : ''}

Please confirm and prepare my order!
*Track Order:* ${currentTrackUrl}`;

  const whatsappUrl = `https://wa.me/${formattedWaPhone}?text=${encodeURIComponent(whatsappMessageText)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-dark to-bg-darker flex flex-col relative overflow-hidden pb-28">
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
            <div className="bg-red-50 border border-red-200/80 rounded-xl p-4 text-center flex flex-col items-center justify-center gap-1.5 shadow-xs">
              <div className="flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span className="font-black text-sm text-red-600 uppercase tracking-wide">Order Cancelled</span>
              </div>
              {order.rejectionReason ? (
                <p className="text-xs text-red-800 font-semibold italic mt-0.5 max-w-xs">
                  Reason: {order.rejectionReason}
                </p>
              ) : (
                <p className="text-[11px] text-red-600/80 font-medium mt-0.5">
                  This order was cancelled by the restaurant.
                </p>
              )}
            </div>
          )}

          {(order.status === 'ready' || order.status === 'completed') && (
            <div className="bg-cta/20 rounded-xl p-4 text-center">
              <span className="font-black text-sm text-text-dark uppercase">Your Order is Ready for Pickup!</span>
            </div>
          )}

          {/* Countdown Timer */}
          {order.status !== 'cancelled' && order.status !== 'completed' && order.status !== 'ready' && order.estimatedTime && (
            <div className="bg-surface rounded-xl p-5 text-center">
              <span className="text-[0.6rem] text-text-dark/50 uppercase tracking-wider font-bold block">Estimated Time</span>
              <span className="font-black text-4xl text-text-dark tracking-tight block mt-1" suppressHydrationWarning>
                {mounted && timeLeft ? timeLeft : `${order.estimatedTime}:00`}
              </span>
              <span className="text-xs text-text-dark/50 mt-1 block">{getStatusSubtext()}</span>
            </div>
          )}

          {/* Stamps Progress Tracker */}
          {loyaltyInfo && loyaltyInfo.loyaltyEnabled && (
            <div className="bg-[#FAF9F5] border border-amber-200/40 rounded-xl p-4 flex flex-col gap-3 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-amber-800 font-extrabold uppercase tracking-wider flex items-center gap-1">
                  ✨ Stamp Reward Progress
                </span>
                <span className="text-[10px] text-gray-500 font-bold">
                  {loyaltyInfo.stampCount} / {loyaltyInfo.stampsRequired} Stamps
                </span>
              </div>

              {/* Stamp Line */}
              <div className="relative py-4 px-2 flex items-center justify-between">
                {/* Connecting Line Track */}
                <div className="absolute left-4 right-4 h-0.5 bg-gray-200 top-1/2 -translate-y-1/2" />
                <div 
                  className="absolute left-4 h-0.5 bg-[#C0181A] top-1/2 -translate-y-1/2 transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, Math.max(0, ((loyaltyInfo.stampCount - 1) / (loyaltyInfo.stampsRequired - 1)) * 100))}%` 
                  }}
                />

                {/* Stamp Circles */}
                {Array.from({ length: loyaltyInfo.stampsRequired }).map((_, idx) => {
                  const stampNumber = idx + 1;
                  const isCollected = stampNumber <= loyaltyInfo.stampCount;
                  const isCurrent = stampNumber === loyaltyInfo.stampCount;

                  return (
                    <div key={idx} className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[9px] transition-all duration-300 ${
                          isCollected
                            ? 'bg-[#C0181A] text-white shadow-md scale-110'
                            : 'bg-white border-2 border-gray-200 text-gray-400'
                        } ${isCurrent ? 'ring-2 ring-[#C0181A]/40' : ''}`}
                      >
                        {stampNumber}
                      </div>

                      {/* Pointer Indicator */}
                      {isCurrent && (
                        <div className="absolute -bottom-4 animate-bounce flex flex-col items-center">
                          <span className="text-[7px] bg-[#C0181A] text-white px-1.5 py-0.2 rounded font-black uppercase tracking-tighter whitespace-nowrap shadow-sm">
                            You
                          </span>
                          <div className="w-1 h-1 bg-[#C0181A] rotate-45 -mt-0.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-[9px] text-gray-500 font-semibold text-center mt-2 leading-relaxed">
                Each order gets you closer to a free meal! {loyaltyInfo.stampsRequired - loyaltyInfo.stampCount} stamps left to unlock your discount.
              </p>
            </div>
          )}

          {/* Moving Nudges Ticker */}
          {!['ready', 'completed', 'cancelled'].includes(order.status) && (
            <div className="bg-[#FFFDF5] border border-[#F5C518]/30 rounded-xl p-3.5 shadow-sm overflow-hidden relative min-h-[56px] flex items-center justify-center transition-all duration-300">
              <div key={currentNudgeIdx} className="text-center text-xs text-amber-900 font-bold leading-relaxed animate-in fade-in slide-in-from-right-4 duration-350">
                {TRACK_NUDGES[currentNudgeIdx].text}
              </div>
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
                      <div className={`absolute left-[15px] -top-3 w-0.5 h-3 ${index <= currentStepIndex ? 'bg-primary' : 'bg-surface'
                        }`} />
                    )}

                    {/* Circle */}
                    <div
                      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 transition-all ${isCompleted
                          ? 'bg-primary text-white'
                          : 'bg-surface text-text-dark/30'
                        } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                    >
                      {step.icon}
                    </div>

                    {/* Label */}
                    <span
                      className={`text-sm ${isCurrent ? 'font-black text-text-dark' : isCompleted ? 'font-bold text-text-dark' : 'text-text-dark/40'
                        }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pay Here Link Card */}
          {!['ready', 'completed', 'cancelled'].includes(order.status) && (
            <div className="border-t border-surface pt-4 flex flex-col items-center text-center">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 w-full flex flex-col items-center gap-2.5 shadow-sm">
                <span className="text-[10px] bg-emerald-600 text-white px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Quick Online Payment
                </span>
                
                <p className="text-xs font-black text-gray-900 leading-snug">
                  Pay ₹{order.total} online to confirm order & start kitchen prep
                </p>

                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="w-full bg-[#C0181A] hover:bg-[#A01012] text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  <CreditCard className="w-4 h-4 text-yellow-300" />
                  <span>Pay Here to Confirm Order (₹{order.total})</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <p className="text-[10px] text-emerald-800 font-semibold leading-relaxed">
                  Tap to view payment QR and step-by-step payment instructions.
                </p>
              </div>
            </div>
          )}

          {/* Customer Details */}
          <div className="border-t border-surface pt-4">
            <h3 className="text-[0.65rem] font-bold uppercase text-bg-dark tracking-wider mb-2">Customer</h3>
            <p className="text-sm text-text-dark font-medium">{order.customerName}</p>
            <p className="text-xs text-text-dark/60">{order.customerPhone}</p>
            {order.notes && (
              <div className="mt-3 p-3 bg-[#FFFBEB] border border-[#F5C518]/20 rounded-xl text-xs text-[#D97706] font-semibold leading-relaxed">
                <span className="font-extrabold uppercase block text-[9px] text-[#B45309] tracking-wider mb-0.5">Note to Chef:</span>
                <p className="italic">"{order.notes}"</p>
              </div>
            )}
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

          {/* WhatsApp & Emergency Call Action Card (Placed below Order Total) */}
          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <div className={`rounded-2xl p-4 flex flex-col gap-3 shadow-sm border transition-all ${
              isUnacceptedOver5Min
                ? 'bg-[#FFF5F5] border-[#FECACA] animate-in fade-in duration-300 ring-2 ring-red-400/20'
                : 'bg-[#F0FDF4] border-[#BBF7D0]'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isUnacceptedOver5Min ? 'bg-red-400' : 'bg-emerald-400'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      isUnacceptedOver5Min ? 'bg-red-500' : 'bg-emerald-500'
                    }`}></span>
                  </span>
                  <span className="font-extrabold text-xs text-gray-900 uppercase tracking-wide">
                    {isUnacceptedOver5Min ? 'Order Pending (> 5 Min)' : 'Direct Restaurant Connect'}
                  </span>
                </div>

                <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  WhatsApp Active
                </span>
              </div>

              <p className="text-xs text-gray-700 font-semibold leading-relaxed">
                {isUnacceptedOver5Min
                  ? 'Your order has been pending for over 5 minutes! Tap below to send this exact order copy directly to the restaurant on WhatsApp or call for immediate confirmation.'
                  : 'Tap below to send this order copy directly to the restaurant on WhatsApp or call for quick updates.'}
              </p>

              {/* Note for 5 minute contact */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 text-[10px] text-amber-900 font-bold leading-snug">
                <span className="font-extrabold uppercase text-[#B45309] block mb-0.5">⚠️ Contact Note</span>
                If order is not accepted in 5 min, please contact directly on WhatsApp or Call below.
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-0.5">
                {/* Send on WhatsApp Button */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs py-3 px-3.5 rounded-xl uppercase tracking-wide flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all text-center"
                >
                  <MessageCircle className="w-4 h-4 fill-current flex-shrink-0" />
                  <span>Send Order on WhatsApp</span>
                </a>

                {/* Call Restaurant Button */}
                <a
                  href={`tel:${cleanPhoneDigits}`}
                  className="bg-[#1E293B] hover:bg-slate-900 text-white font-extrabold text-xs py-3 px-3.5 rounded-xl uppercase tracking-wide flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all text-center flex-shrink-0"
                >
                  <PhoneCall className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Call</span>
                </a>
              </div>
            </div>
          )}

          {/* Developer Promo Banner Ad Glimpse for Waiting Customers */}
          {devPromo?.active !== false && (
            <div
              className="rounded-2xl p-4 shadow-md flex flex-col justify-between relative overflow-hidden text-white my-1 border border-white/10"
              style={{
                background: `linear-gradient(135deg, ${devPromo?.bgColorFrom || '#0F172A'} 0%, ${devPromo?.bgColorTo || '#1E1B4B'} 100%)`,
              }}
            >
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex-1 min-w-0">
                  <span
                    className="inline-block text-[8px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider mb-1.5"
                    style={{
                      backgroundColor: `${devPromo?.ctaBgColor || '#F5C518'}25`,
                      color: devPromo?.ctaBgColor || '#F5C518',
                      border: `1px solid ${devPromo?.ctaBgColor || '#F5C518'}40`,
                    }}
                  >
                    ⚡ {devPromo?.badgeText || 'SOFTWARE & DIGITAL SOLUTIONS'}
                  </span>
                  <h3
                    className="font-black text-sm leading-snug tracking-tight truncate"
                    style={{ color: devPromo?.textColor || '#FFFFFF' }}
                  >
                    {devPromo?.headline || 'Your Business Deserves Better Software.'}
                  </h3>
                  <p
                    className="text-[10px] mt-1 font-medium opacity-85 leading-relaxed line-clamp-2"
                    style={{ color: devPromo?.textColor || '#FFFFFF' }}
                  >
                    {devPromo?.subheadline || 'Custom websites, web apps, mobile apps & AI automation built to grow your business.'}
                  </p>
                </div>

                {/* Right side Image Graphic */}
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative border border-white/15 bg-white/5 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={devPromo?.image || '/Screenshot 2026-08-03 175540.png'}
                    alt="Developer Promo"
                    className="w-full h-full object-cover object-center scale-105"
                  />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between relative z-10">
                <span className="text-[9.5px] text-white/70 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-400 fill-current animate-pulse flex-shrink-0" />
                  Explore software while waiting
                </span>
                <button
                  type="button"
                  onClick={() => setConsultationModalOpen(true)}
                  className="text-[9.5px] font-extrabold uppercase px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                  style={{
                    backgroundColor: devPromo?.ctaBgColor || '#F5C518',
                    color: devPromo?.ctaTextColor || '#1A1A1A',
                  }}
                >
                  <span>{devPromo?.ctaText || 'Book a Free Consultation'}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Back to Menu */}
          <Link
            href={`/menu/${order.restaurantId}`}
            className="block text-center bg-surface text-text-dark font-bold text-sm py-3 rounded-xl hover:bg-surface/80 transition-colors"
          >
            Back to Menu
          </Link>
        </div>
      </div>

      {/* Free Consultation Qualification Modal */}
      <ConsultationModal
        isOpen={consultationModalOpen}
        onClose={() => setConsultationModalOpen(false)}
        restaurantId={order.restaurantId}
      />

      {/* Step-by-Step Payment QR & Instructions Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 flex flex-col items-center gap-4 text-center relative max-h-[92vh] overflow-y-auto my-auto">
            <button
              onClick={() => setPaymentModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-0.5 rounded-full font-black uppercase tracking-wider">
              UPI Payment QR
            </span>

            <h3 className="font-black text-xl text-gray-900 leading-tight">
              Pay ₹{order.total} to Confirm Order
            </h3>

            {/* QR Code Container */}
            <div className="bg-white p-3 rounded-2xl border-2 border-dashed border-emerald-300 shadow-sm relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/1783337039466.png"
                alt="UPI Payment QR Code"
                className="w-56 h-56 object-contain rounded-xl"
              />
            </div>

            {/* Step-by-Step Payment Instructions */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 w-full text-left flex flex-col gap-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>How to Make Payment (4 Easy Steps):</span>
              </h4>
              <ol className="text-xs text-gray-800 font-semibold space-y-2.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="bg-emerald-600 text-white rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span><strong>Take a screenshot</strong> of this QR code on your phone.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-emerald-600 text-white rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Open <strong>PhonePe</strong>, <strong>Google Pay (GPay)</strong>, or <strong>Paytm</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-emerald-600 text-white rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Select <strong>Scan QR</strong> & tap the <strong>Gallery / Photo icon</strong> at the bottom right.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-emerald-600 text-white rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">4</span>
                  <span>Select the screenshot from your gallery to complete payment of <strong>₹{order.total}</strong>.</span>
                </li>
              </ol>
            </div>

            <p className="text-[11px] text-gray-500 font-medium leading-tight">
              💡 Showing payment confirmation screenshot to staff starts kitchen prep immediately!
            </p>

            <button
              onClick={() => setPaymentModalOpen(false)}
              className="w-full bg-[#111827] hover:bg-black text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider active:scale-95 transition-all shadow-md mt-1"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}

      <CustomerNavbar restaurantId={order.restaurantId} />
    </div>
  );
}
