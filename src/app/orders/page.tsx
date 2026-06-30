'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Receipt, 
  Calendar, 
  Trash2, 
  Loader2, 
  ArrowLeft, 
  Clock, 
  Phone, 
  User, 
  ChevronRight, 
  ShoppingBag,
  AlertCircle,
  Sparkles,
  Award,
  Star,
  CheckCircle
} from 'lucide-react';
import { CustomerNavbar } from '@/components/layout';
import { getOrdersByCustomerPhone, getCustomerLoyaltyInfo, redeemLoyaltyReward } from '@/actions/orders';

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
  createdAt: string;
}

function OrdersHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlRestaurantId = searchParams.get('restaurantId') || '';
  const [resolvedRestaurantId, setResolvedRestaurantId] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isCached, setIsCached] = useState(false);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [loyaltyInfo, setLoyaltyInfo] = useState<{
    customer: {
      stampCount: number;
      hasPendingDiscount: boolean;
      totalRedemptions: number;
    } | null;
    loyaltyEnabled: boolean;
    stampsRequired: number;
    discountPercentage: number;
  } | null>(null);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; show: boolean } | null>(null);

  // Form inputs for unauthenticated state
  const [inputName, setInputName] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [error, setError] = useState('');

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Status Badge configurations
  const getStatusBadge = (status: OrderData['status']) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-green-500/10 border-green-500/20 text-green-600', label: 'Completed' };
      case 'ready':
        return { bg: 'bg-[#F5C518]/15 border-[#F5C518]/30 text-[#8B6508]', label: 'Ready' };
      case 'preparing':
        return { bg: 'bg-[#C0181A]/10 border-[#C0181A]/20 text-[#C0181A]', label: 'Preparing' };
      case 'accepted':
        return { bg: 'bg-blue-500/10 border-blue-500/20 text-blue-600', label: 'Accepted' };
      case 'received':
        return { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600', label: 'Received' };
      case 'cancelled':
        return { bg: 'bg-red-500/10 border-red-500/20 text-red-600', label: 'Cancelled' };
      default:
        return { bg: 'bg-gray-500/10 border-gray-500/20 text-gray-600', label: status };
    }
  };

  // Resolve restaurant ID from URL, cart, or last order
  useEffect(() => {
    let restId = urlRestaurantId;
    if (!restId && typeof window !== 'undefined') {
      const cachedRestId = localStorage.getItem('last_order_restaurant_id');
      if (cachedRestId) {
        restId = cachedRestId;
      } else {
        restId = 'tokyo-momos'; // Default fallback
      }
    }
    setResolvedRestaurantId(restId);
  }, [urlRestaurantId]);

  // Load cache on load
  useEffect(() => {
    async function loadCacheAndFetch() {
      if (!resolvedRestaurantId) return;

      if (typeof window !== 'undefined') {
        const cachedName = localStorage.getItem('customer_name');
        const cachedPhone = localStorage.getItem('customer_phone');

        if (cachedName && cachedPhone) {
          setName(cachedName);
          setPhone(cachedPhone);
          setIsCached(true);

          try {
            // Fetch history and loyalty details from DB using cached phone
            const [fetchedOrders, fetchedLoyalty] = await Promise.all([
              getOrdersByCustomerPhone(cachedPhone, resolvedRestaurantId || undefined),
              getCustomerLoyaltyInfo(cachedPhone, resolvedRestaurantId)
            ]);
            setOrders(fetchedOrders);
            setLoyaltyInfo(fetchedLoyalty);
          } catch (err) {
            console.error('Error fetching order history:', err);
          }
        }
      }
      setLoading(false);
    }

    loadCacheAndFetch();
  }, [resolvedRestaurantId]);

  // Handle Logout/Clear Cache
  const handleLogout = () => {
    if (confirm('Are you sure you want to clear your cached details from this device? This will log you out of your order history.')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('customer_name');
        localStorage.removeItem('customer_phone');
        localStorage.removeItem('last_order_id');
        localStorage.removeItem('last_order_restaurant_id');
      }
      setName('');
      setPhone('');
      setOrders([]);
      setIsCached(false);
      setInputName('');
      setInputPhone('');
      setError('');
      setLoyaltyInfo(null);
    }
  };

  // Handle Check In
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!inputName.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!inputPhone.trim() || !/^\d{10}$/.test(inputPhone.trim())) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setActionLoading(true);

    try {
      const [fetchedOrders, fetchedLoyalty] = await Promise.all([
        getOrdersByCustomerPhone(inputPhone.trim(), resolvedRestaurantId || undefined),
        getCustomerLoyaltyInfo(inputPhone.trim(), resolvedRestaurantId)
      ]);

      if (typeof window !== 'undefined') {
        localStorage.setItem('customer_name', inputName.trim());
        localStorage.setItem('customer_phone', inputPhone.trim());
      }

      setName(inputName.trim());
      setPhone(inputPhone.trim());
      setIsCached(true);
      setOrders(fetchedOrders);
      setLoyaltyInfo(fetchedLoyalty);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to retrieve order history.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reward Redemption
  const handleRedeem = async () => {
    if (!phone || !resolvedRestaurantId) return;
    setRedeemLoading(true);
    try {
      await redeemLoyaltyReward(phone, resolvedRestaurantId);
      const fetchedLoyalty = await getCustomerLoyaltyInfo(phone, resolvedRestaurantId);
      setLoyaltyInfo(fetchedLoyalty);
      
      setToast({
        message: `Congratulations! Your loyalty reward was successfully claimed. A ${fetchedLoyalty?.discountPercentage ?? loyaltyInfo?.discountPercentage ?? 20}% discount will be applied automatically on your next checkout!`,
        show: true
      });
      setTimeout(() => {
        setToast(null);
      }, 6000);
    } catch (err) {
      console.error(err);
      alert('Failed to redeem reward: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setRedeemLoading(false);
    }
  };

  const menuUrl = resolvedRestaurantId ? `/menu/${resolvedRestaurantId}` : '/menu/tokyo-momos';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#8B0000] to-[#6B0000] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#F5C518] animate-spin" />
          <span className="text-white/80 font-bold text-sm uppercase tracking-wider">Loading Orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col pb-28">
      {/* Header Banner */}
      <header className="bg-gradient-to-br from-[#8B0000] to-[#6B0000] px-4 pt-5 pb-8 relative overflow-hidden">
        <svg className="absolute bottom-0 left-0 w-full h-12" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,60L60,52C120,44,240,28,360,32C480,36,600,60,720,68C840,76,960,68,1080,56C1200,44,1320,28,1380,20L1440,12L1440,120L0,120Z" fill="#C0181A" fillOpacity="0.15" />
        </svg>
        <div className="max-w-md mx-auto relative z-10">
          <Link href={menuUrl} className="inline-flex items-center gap-1.5 text-white/80 text-sm mb-3 active:opacity-75">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Menu</span>
          </Link>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Your Orders</h1>
          <p className="text-white/60 text-xs mt-0.5">View and track all your previous orders</p>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-4 mt-6 flex flex-col gap-5 relative z-10">
        {isCached ? (
          <>
            {/* Customer Profile Bar */}
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 border border-black/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#8B0000]/10 flex items-center justify-center text-[#8B0000]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1A1A1A]">{name}</h3>
                  <p className="text-xs text-[#6B7280] font-mono">{phone}</p>
                </div>
              </div>
            </div>

            {/* Loyalty Stamp Card */}
            {loyaltyInfo?.loyaltyEnabled && (
              <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 border border-black/5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-[#8B0000]">
                    <Award className="w-5 h-5 text-[#F5C518]" />
                    <h3 className="font-black text-sm uppercase tracking-tight">Stamp Loyalty Card</h3>
                  </div>
                  <span className="bg-[#8B0000]/10 text-[#8B0000] text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-[#8B0000]/10">
                    {loyaltyInfo.discountPercentage}% Off Reward
                  </span>
                </div>

                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Earn 1 stamp per calendar day you place an order. Collect {loyaltyInfo.stampsRequired} stamps to unlock your reward discount!
                </p>

                {/* Stamp grid */}
                <div className="grid grid-cols-4 gap-3 my-2 justify-items-center">
                  {Array.from({ length: loyaltyInfo.stampsRequired }).map((_, idx) => {
                    const stampCount = loyaltyInfo.customer?.stampCount ?? 0;
                    const isEarned = idx < stampCount;
                    return (
                      <div
                        key={idx}
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center relative transition-all ${
                          isEarned
                            ? 'bg-gradient-to-br from-[#8B0000] to-[#C0181A] border-[#8B0000] text-[#F5C518] shadow-md scale-105'
                            : 'bg-neutral-50 border-dashed border-neutral-300 text-neutral-300'
                        }`}
                      >
                        {isEarned ? (
                          <Star className="w-5 h-5 fill-current" />
                        ) : (
                          <span className="text-xs font-extrabold font-mono">{idx + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Stamp Card Progress details */}
                <div className="flex justify-between items-center mt-1 pt-2 border-t border-neutral-100">
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">Progress</span>
                    <span className="font-extrabold text-sm text-[#1A1A1A]">
                      {loyaltyInfo.customer?.stampCount ?? 0} / {loyaltyInfo.stampsRequired} Stamps
                    </span>
                  </div>
                  {loyaltyInfo.customer && loyaltyInfo.customer.totalRedemptions > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">Redeemed</span>
                      <span className="font-bold text-xs text-[#6B7280]">
                        {loyaltyInfo.customer.totalRedemptions} times
                      </span>
                    </div>
                  )}
                </div>

                {/* Pending discount banner or redeem button */}
                {loyaltyInfo.customer?.hasPendingDiscount ? (
                  <div className="bg-green-50/50 border border-green-200/40 rounded-xl p-3 text-center flex flex-col gap-0.5">
                    <div className="flex items-center justify-center gap-1 text-green-700 font-extrabold text-xs uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-[#F5C518] fill-current animate-pulse" />
                      <span>Reward Active!</span>
                    </div>
                    <p className="text-[10px] text-green-600 font-semibold">
                      A {loyaltyInfo.discountPercentage}% discount will be automatically applied to your next checkout order.
                    </p>
                  </div>
                ) : (loyaltyInfo.customer?.stampCount ?? 0) >= loyaltyInfo.stampsRequired ? (
                  <button
                    onClick={handleRedeem}
                    disabled={redeemLoading}
                    className="w-full bg-[#F5C518] hover:bg-[#e0b410] text-[#1A1A1A] font-black text-xs py-3 rounded-xl uppercase tracking-wider active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(245,197,24,0.25)]"
                  >
                    {redeemLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Claim {loyaltyInfo.discountPercentage}% Off Reward
                  </button>
                ) : null}
              </div>
            )}

            {/* Orders History List */}
            <div className="flex flex-col gap-4">
              <h2 className="text-xs uppercase font-bold text-[#6B7280] tracking-wider pl-1">History ({orders.length})</h2>
              
              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-black/5 flex flex-col items-center gap-4">
                  <div className="bg-neutral-100 rounded-full w-14 h-14 flex items-center justify-center text-[#6B7280]">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#1A1A1A]">No Orders Found</h3>
                    <p className="text-xs text-[#6B7280] mt-1 max-w-xs px-4">
                      You haven&apos;t placed any orders using this phone number yet.
                    </p>
                  </div>
                  <Link
                    href={menuUrl}
                    className="mt-2 bg-[#F5C518] text-[#1A1A1A] font-bold text-xs py-3 px-6 rounded-xl uppercase tracking-wide active:scale-95 transition-all"
                  >
                    Start Ordering
                  </Link>
                </div>
              ) : (
                orders.map((order) => {
                  const statusInfo = getStatusBadge(order.status);
                  const isOrderActive = ['received', 'accepted', 'preparing', 'ready'].includes(order.status);

                  return (
                    <div key={order._id} className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden border border-black/5">
                      {/* Card Header */}
                      <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
                          <span className="text-[11px] text-[#6B7280] font-medium">{formatDate(order.createdAt)}</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider border rounded-md px-2 py-0.5 ${statusInfo.bg}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Items Body */}
                      <div className="p-4 flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-[#1A1A1A]">
                              <span className="font-medium">
                                {item.name} <span className="text-[#6B7280]">× {item.quantity}</span>
                              </span>
                              <span className="font-semibold text-neutral-500">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {/* Total Footer */}
                        <div className="border-t border-neutral-100 pt-3 mt-1 flex justify-between items-center">
                          <div>
                            <span className="text-[9px] text-[#6B7280] uppercase font-bold tracking-wider block leading-none">Order ID</span>
                            <span className="text-[10px] text-neutral-400 font-mono">#{order._id.substring(order._id.length - 6).toUpperCase()}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-[#6B7280] uppercase font-bold tracking-wider block leading-none">Total Paid</span>
                            <span className="font-black text-base text-[#C0181A]">₹{order.total}</span>
                          </div>
                        </div>

                        {/* Tracker Link */}
                        <div className="pt-2 mt-1">
                          <Link
                            href={`/track/${order._id}?restaurantId=${order.restaurantId}`}
                            className={`w-full text-center flex items-center justify-center gap-1.5 font-bold text-xs py-2.5 rounded-xl transition-all ${
                              isOrderActive
                                ? 'bg-[#F5C518] text-[#1A1A1A] hover:bg-[#e0b410] shadow-[0_2px_8px_rgba(245,197,24,0.3)] animate-pulse'
                                : 'bg-neutral-100 text-[#1A1A1A] hover:bg-neutral-200'
                            }`}
                          >
                            <span>{isOrderActive ? 'Track Live Order' : 'View Order Details'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* Checkout check-in profile setup */
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-6 border border-black/5 mt-2">
            <div className="text-center mb-6">
              <div className="bg-[#8B0000]/10 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3 text-[#8B0000]">
                <Receipt className="w-6 h-6" />
              </div>
              <h2 className="font-black text-xl text-[#1A1A1A] uppercase tracking-tight">View Your History</h2>
              <p className="text-xs text-[#6B7280] mt-1 px-4">
                Enter your details to retrieve and cache your previous order details on this device.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-[#C0181A] text-xs font-semibold rounded-xl p-3.5 mb-5 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCheckIn} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-[#8B0000] tracking-wider pl-1">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    disabled={actionLoading}
                    className="w-full bg-[#F5F5F5] border border-transparent rounded-xl py-3 pl-10 pr-4 text-sm text-[#1A1A1A] outline-none focus:border-[#C0181A] transition-colors placeholder:text-neutral-400"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-[#8B0000] tracking-wider pl-1">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value.replace(/\D/g, ''))}
                    disabled={actionLoading}
                    className="w-full bg-[#F5F5F5] border border-transparent rounded-xl py-3 pl-10 pr-4 text-sm text-[#1A1A1A] outline-none focus:border-[#C0181A] transition-colors placeholder:text-neutral-400"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-[#F5C518] text-[#1A1A1A] font-extrabold text-sm py-3.5 rounded-xl uppercase tracking-wider mt-2 active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(245,197,24,0.25)]"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {actionLoading ? 'Retrieving...' : 'Check History'}
              </button>
            </form>
          </div>
        )}
      </main>

      {toast && toast.show && (
        <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-green-50 border-2 border-green-600 rounded-xl p-4 shadow-2xl z-50 animate-bounce flex gap-3 items-start">
          <div className="bg-green-600 text-white p-1.5 rounded-lg flex-shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-black text-green-800 uppercase tracking-wide">Reward Claimed!</h4>
            <p className="text-xs text-green-700 mt-0.5 leading-relaxed font-medium">
              {toast.message}
            </p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-green-500 hover:text-green-700 transition-colors text-xs font-bold px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      <CustomerNavbar restaurantId={resolvedRestaurantId} />
    </div>
  );
}

export default function OrdersHistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#8B0000] to-[#6B0000] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#F5C518] animate-spin" />
      </div>
    }>
      <OrdersHistoryContent />
    </Suspense>
  );
}
