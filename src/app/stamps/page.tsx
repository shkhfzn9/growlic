'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Award, 
  Star, 
  Loader2, 
  ArrowLeft, 
  Phone, 
  User, 
  Sparkles,
  ShoppingBag,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { CustomerNavbar } from '@/components/layout';
import { getCustomerLoyaltySummary, redeemLoyaltyReward } from '@/actions/orders';

interface LoyaltySummary {
  restaurantId: string;
  restaurantName: string;
  logoUrl: string;
  stampCount: number;
  stampsRequired: number;
  discountPercentage: number;
  hasPendingDiscount: boolean;
  totalRedemptions: number;
}

function StampsDashboardContent() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isCached, setIsCached] = useState(false);
  const [summaries, setSummaries] = useState<LoyaltySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; show: boolean } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState<Record<string, boolean>>({});

  // Form inputs for unauthenticated state
  const [inputName, setInputName] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [error, setError] = useState('');

  // Load cache on load
  useEffect(() => {
    async function loadCacheAndFetch() {
      if (typeof window !== 'undefined') {
        const cachedName = localStorage.getItem('customer_name');
        const cachedPhone = localStorage.getItem('customer_phone');

        if (cachedName && cachedPhone) {
          setName(cachedName);
          setPhone(cachedPhone);
          setIsCached(true);

          try {
            const data = await getCustomerLoyaltySummary(cachedPhone);
            setSummaries(data);
          } catch (err) {
            console.error('Error fetching loyalty summaries:', err);
          }
        }
      }
      setLoading(false);
    }

    loadCacheAndFetch();
  }, []);

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
      const data = await getCustomerLoyaltySummary(inputPhone.trim());
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('customer_name', inputName.trim());
        localStorage.setItem('customer_phone', inputPhone.trim());
      }

      setName(inputName.trim());
      setPhone(inputPhone.trim());
      setIsCached(true);
      setSummaries(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to retrieve stamp records.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reward Redemption
  const handleRedeem = async (restaurantId: string, restaurantName: string) => {
    if (!phone) return;
    setRedeemLoading((prev) => ({ ...prev, [restaurantId]: true }));
    try {
      await redeemLoyaltyReward(phone, restaurantId);
      const updatedSummaries = await getCustomerLoyaltySummary(phone);
      setSummaries(updatedSummaries);
      
      setToast({
        message: `Congratulations! Your loyalty reward at ${restaurantName} was successfully claimed. A discount will be applied automatically on your next checkout!`,
        show: true
      });
      setTimeout(() => {
        setToast(null);
      }, 6000);
    } catch (err) {
      console.error(err);
      alert('Failed to redeem reward: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setRedeemLoading((prev) => ({ ...prev, [restaurantId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#8B0000] to-[#6B0000] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-[#F5C518] animate-spin" />
        <span className="text-white/60 text-xs mt-3 uppercase tracking-wider font-bold">Loading Stamps...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#8B0000] to-[#6B0000] pb-28">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-5 max-w-md mx-auto">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-1.5">
          <Award className="w-5 h-5 text-[#F5C518]" /> Loyalty Stamps
        </h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <main className="max-w-md mx-auto px-4 flex flex-col gap-6">
        {isCached ? (
          <>
            {/* Customer Profile Banner */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F5C518]/20 flex items-center justify-center text-[#F5C518]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">{name}</h3>
                <p className="text-xs text-white/60 font-mono">{phone}</p>
              </div>
            </div>

            {/* Loyalty Cards List */}
            <div className="flex flex-col gap-5">
              {summaries.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/50">
                    <Star className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">No stamps collected yet</h4>
                    <p className="text-white/60 text-xs mt-1 leading-relaxed px-4">
                      Place orders at active restaurants to start earning stamps. You will earn 1 stamp per day you order!
                    </p>
                  </div>
                  <Link
                    href="/"
                    className="bg-[#F5C518] text-[#1A1A1A] font-extrabold text-xs py-3 px-6 rounded-xl uppercase tracking-wider active:scale-95 transition-transform mt-2 shadow-[0_4px_12px_rgba(245,197,24,0.25)]"
                  >
                    Browse Menu
                  </Link>
                </div>
              ) : (
                summaries.map((summary) => {
                  const stampCount = summary.stampCount;
                  const stampsRequired = summary.stampsRequired;
                  const isEligible = stampCount >= stampsRequired;

                  return (
                    <div 
                      key={summary.restaurantId} 
                      className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] p-5 border border-black/5 flex flex-col gap-4"
                    >
                      {/* Restaurant info header */}
                      <div className="flex justify-between items-start border-b border-neutral-100 pb-3">
                        <div>
                          <h3 className="font-black text-sm text-[#1A1A1A] uppercase tracking-tight">{summary.restaurantName}</h3>
                          <span className="text-[10px] text-[#6B7280] font-bold block mt-0.5">
                            {summary.discountPercentage}% Off Reward
                          </span>
                        </div>
                        <Link
                          href={`/menu/${summary.restaurantId}`}
                          className="flex items-center gap-1 text-[11px] font-extrabold text-[#8B0000] hover:underline"
                        >
                          Menu <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>

                      {/* Visual Stamp Card Line Tracker */}
                      <div className="relative py-4 px-2 my-3 flex items-center justify-between">
                        {/* Connecting Line Track */}
                        <div className="absolute left-4 right-4 h-0.5 bg-gray-200 top-1/2 -translate-y-1/2" />
                        <div 
                          className="absolute left-4 h-0.5 bg-[#C0181A] top-1/2 -translate-y-1/2 transition-all duration-500"
                          style={{ 
                            width: `${Math.min(100, Math.max(0, ((stampCount - 1) / (stampsRequired - 1)) * 100))}%` 
                          }}
                        />

                        {/* Stamp Circles */}
                        {Array.from({ length: stampsRequired }).map((_, idx) => {
                          const stampNumber = idx + 1;
                          const isCollected = stampNumber <= stampCount;
                          const isCurrent = stampNumber === stampCount;

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

                      {/* Progress summary details */}
                      <div className="flex justify-between items-center pt-2 border-t border-neutral-100 text-xs">
                        <div>
                          <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">Progress</span>
                          <span className="font-extrabold text-sm text-[#1A1A1A]">
                            {stampCount} / {stampsRequired} Stamps
                          </span>
                        </div>
                        {summary.totalRedemptions > 0 && (
                          <div className="text-right">
                            <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">Redeemed</span>
                            <span className="font-bold text-neutral-500">
                              {summary.totalRedemptions} times
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {summary.hasPendingDiscount ? (
                        <div className="bg-green-50/70 border border-green-200/50 rounded-xl p-3 text-center flex flex-col gap-0.5">
                          <div className="flex items-center justify-center gap-1 text-green-700 font-extrabold text-xs uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-[#F5C518] fill-current animate-pulse" />
                            <span>Reward Unlocked!</span>
                          </div>
                          <p className="text-[10px] text-green-600 font-semibold">
                            A {summary.discountPercentage}% discount will be applied automatically on your next checkout order.
                          </p>
                        </div>
                      ) : isEligible ? (
                        <button
                          onClick={() => handleRedeem(summary.restaurantId, summary.restaurantName)}
                          disabled={redeemLoading[summary.restaurantId]}
                          className="w-full bg-[#F5C518] hover:bg-[#e0b410] text-[#1A1A1A] font-black text-xs py-3 rounded-xl uppercase tracking-wider active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(245,197,24,0.25)]"
                        >
                          {redeemLoading[summary.restaurantId] && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Claim {summary.discountPercentage}% Off Reward
                        </button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* Check-In Card */
          <div className="bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] p-6 border border-black/5 mt-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-[#8B0000]/10 flex items-center justify-center mx-auto text-[#8B0000] mb-3">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-[#1A1A1A] uppercase tracking-tight">Loyalty Stamps</h2>
              <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                Enter your details to track collected stamps and claim discounts across all restaurants.
              </p>
            </div>

            <form onSubmit={handleCheckIn} className="flex flex-col gap-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200/50 rounded-xl p-3.5 text-xs text-red-600 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider pl-1">Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="px-3.5 py-3 text-sm border border-[#E2E6EA] rounded-xl bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#8B0000]/20 focus:border-[#8B0000] transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider pl-1">Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#6B7280] font-bold">+91</span>
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    maxLength={10}
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 pr-3.5 py-3 text-sm border border-[#E2E6EA] rounded-xl bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#8B0000]/20 focus:border-[#8B0000] transition-all"
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
                {actionLoading ? 'Retrieving...' : 'Check Stamps'}
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

      <CustomerNavbar />
    </div>
  );
}

export default function StampsDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#8B0000] to-[#6B0000] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#F5C518] animate-spin" />
      </div>
    }>
      <StampsDashboardContent />
    </Suspense>
  );
}
