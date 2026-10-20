'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Sparkles,
  ShoppingBag,
  Percent,
  ChevronDown,
  ChevronUp,
  Receipt,
  UtensilsCrossed,
  ArrowRight,
  Loader2,
  RefreshCw,
  Phone,
  User,
  ExternalLink,
} from 'lucide-react';
import {
  getCustomerDetailAction,
  getCustomerVisitHistoryAction,
} from '../services/customer.service';
import {
  ICustomerDetail,
  ICustomerVisitOrder,
  CustomerSegment,
  MealTimeSlot,
} from '../types';

interface CustomerDetailDrawerProps {
  phone: string;
  onClose?: () => void;
  isStandalonePage?: boolean;
}

export function getSegmentBadgeStyle(segment: CustomerSegment) {
  switch (segment) {
    case 'VIP':
      return {
        bg: 'bg-purple-100 text-purple-900 border-purple-300',
        dot: 'bg-purple-600',
        label: 'VIP Customer',
      };
    case 'REGULAR':
      return {
        bg: 'bg-blue-100 text-blue-900 border-blue-300',
        dot: 'bg-blue-600',
        label: 'Regular',
      };
    case 'NEW':
      return {
        bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        dot: 'bg-emerald-600',
        label: 'New Customer',
      };
    case 'AT_RISK':
      return {
        bg: 'bg-amber-100 text-amber-900 border-amber-300',
        dot: 'bg-amber-600',
        label: 'At-Risk',
      };
    case 'LOST':
      return {
        bg: 'bg-rose-100 text-rose-900 border-rose-300',
        dot: 'bg-rose-600',
        label: 'Lost / Churned',
      };
    default:
      return {
        bg: 'bg-gray-100 text-gray-800 border-gray-300',
        dot: 'bg-gray-500',
        label: segment,
      };
  }
}

export function getMealSlotBadgeStyle(slot: MealTimeSlot) {
  switch (slot) {
    case 'Breakfast':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Lunch':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Snacks':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'Dinner':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    default:
      return 'bg-gray-50 text-gray-800 border-gray-200';
  }
}

export default function CustomerDetailDrawer({
  phone,
  onClose,
  isStandalonePage = false,
}: CustomerDetailDrawerProps) {
  const [detail, setDetail] = useState<ICustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Visit history pagination
  const [visits, setVisits] = useState<ICustomerVisitOrder[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsPage, setVisitsPage] = useState(1);
  const [visitsTotalPages, setVisitsTotalPages] = useState(1);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getCustomerDetailAction(phone);
      if (!data) {
        setError('Customer profile not found.');
      } else {
        setDetail(data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load customer profile.');
    } finally {
      setLoading(false);
    }
  };

  const loadVisits = async (page = 1) => {
    try {
      setVisitsLoading(true);
      const res = await getCustomerVisitHistoryAction(phone, page, 8);
      if (res && res.orders) {
        setVisits(res.orders);
        setVisitsPage(res.page);
        setVisitsTotalPages(res.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVisitsLoading(false);
    }
  };

  useEffect(() => {
    if (phone) {
      loadCustomer();
      loadVisits(1);
    }
  }, [phone]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  // Render SVG spend trend chart
  const renderSpendTrendChart = () => {
    if (!detail?.insights?.spendTrend?.length) {
      return (
        <div className="h-36 flex items-center justify-center text-xs text-gray-500 italic">
          No order trend data available
        </div>
      );
    }

    const data = detail.insights.spendTrend;
    const width = 360;
    const height = 120;
    const padding = 20;

    const maxVal = Math.max(...data.map((d) => d.amount), 100);
    const minVal = 0;

    const points = data.map((d, idx) => {
      const x = padding + (idx / Math.max(1, data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((d.amount - minVal) / (maxVal - minVal)) * (height - 2 * padding);
      return { x, y, amount: d.amount, date: d.date };
    });

    const dPath = points.reduce(
      (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
      ''
    );

    const dArea = points.length
      ? `${dPath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : '';

    return (
      <div className="w-full flex flex-col gap-1.5 pt-1">
        <div className="flex justify-between items-center text-[10px] text-gray-600 font-bold px-1">
          <span>₹{minVal}</span>
          <span>Peak: ₹{maxVal}</span>
        </div>
        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
            <defs>
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area */}
            {dArea && <path d={dArea} fill="url(#spendGrad)" />}

            {/* Line */}
            {dPath && (
              <path
                d={dPath}
                fill="none"
                stroke="#7C3AED"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Dots */}
            {points.map((pt, i) => (
              <g key={i} className="group cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  className="fill-white stroke-purple-700 stroke-2 group-hover:r-5 transition-all"
                />
              </g>
            ))}
          </svg>
        </div>
        <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium px-1">
          <span>First Visit: {data[0]?.date}</span>
          <span>Latest: {data[data.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 gap-3 min-h-[400px]">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-sm font-semibold text-gray-600">Loading customer profile & analytics...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 gap-4 min-h-[400px]">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
          <X className="w-6 h-6" />
        </div>
        <div className="text-center">
          <h3 className="font-extrabold text-gray-900 text-base">Unable to load profile</h3>
          <p className="text-xs text-gray-500 mt-1">{error || 'Record does not exist'}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  const { customer, insights, visitFrequencyText, expectedNextVisitText, customerSinceText } = detail;
  const segStyle = getSegmentBadgeStyle(customer.segment);

  return (
    <div className={`flex flex-col gap-6 ${isStandalonePage ? 'max-w-6xl mx-auto p-4 sm:p-6' : 'p-5 sm:p-6 pb-20'}`}>
      {/* Top Bar for Drawer / Page */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-black text-base shadow-xs">
            {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900 leading-tight">{customer.name}</h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${segStyle.bg}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${segStyle.dot}`} />
                {segStyle.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mt-0.5">
              <Phone className="w-3.5 h-3.5" />
              <span>{customer.phone}</span>
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PART 2 - A: HEADER CARD                                        */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-5">
          {/* Top Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">Customer LTV</span>
              <span className="text-2xl font-black text-white mt-0.5">₹{customer.totalSpent.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-purple-300 font-semibold mt-0.5">Lifetime Spend</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">Avg Order (AOV)</span>
              <span className="text-2xl font-black text-white mt-0.5">₹{customer.averageOrderValue}</span>
              <span className="text-[10px] text-purple-300 font-semibold mt-0.5">Per Completed Visit</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">Total Visits</span>
              <span className="text-2xl font-black text-white mt-0.5">{customer.totalOrders}</span>
              <span className="text-[10px] text-purple-300 font-semibold mt-0.5">Completed Orders</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">Stamps / Rewards</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-amber-300">{customer.stampCount}</span>
                <span className="text-xs text-purple-200 font-semibold">Stamps</span>
              </div>
              <span className="text-[10px] text-purple-300 font-semibold mt-0.5">
                {customer.hasPendingDiscount ? '⭐ Reward Pending Redemption' : `${customer.totalRedemptions} redeemed`}
              </span>
            </div>
          </div>

          {/* Sub-Card Details: Recency, Frequency, Next Visit, Customer Since */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Customer Since</span>
              <span className="font-extrabold text-white">{customerSinceText}</span>
              <span className="text-[10px] text-purple-200/80">
                First: {customer.firstOrderDate ? customer.firstOrderDate.split('T')[0] : 'N/A'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Last Visit (Recency)</span>
              <span className="font-extrabold text-white">
                {customer.daysSinceLastVisit === 0 ? 'Today' : `${customer.daysSinceLastVisit} days ago`}
              </span>
              <span className="text-[10px] text-purple-200/80">
                {customer.lastOrderDate ? customer.lastOrderDate.split('T')[0] : 'N/A'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Avg Visit Interval</span>
              <span className="font-extrabold text-white">{visitFrequencyText}</span>
              <span className="text-[10px] text-purple-200/80">
                {customer.totalOrders < 2 ? 'Single visit' : 'Cadence'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Predicted Next Visit</span>
              <span className="font-extrabold text-amber-300">{expectedNextVisitText}</span>
              <span className="text-[10px] text-purple-200/80">Projected Date</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PART 2 - B: INSIGHT CARDS                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">
          Customer Behavioral Insights
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Top 5 Favorite Items */}
          <div className="bg-white border border-[#E2E6EA] rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100">
                <UtensilsCrossed className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">Favorite Items</h4>
              </div>

              {insights.topFavoriteItems.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 italic text-center">No item data recorded</p>
              ) : (
                <div className="flex flex-col gap-2 mt-3">
                  {insights.topFavoriteItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-purple-50 text-purple-800 font-black text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-gray-800 truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-right shrink-0">
                        <span className="font-black text-gray-900">{item.quantity}x</span>
                        <span className="text-[10px] text-gray-500 font-mono">₹{item.totalSpend}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-semibold">
              <span>Favorite Category:</span>
              <span className="font-black text-purple-900 bg-purple-50 px-2 py-0.5 rounded-full">
                {insights.favoriteCategory}
              </span>
            </div>
          </div>

          {/* Card 2: Preferred Time & Weekday + Veg/Non-Veg */}
          <div className="bg-white border border-[#E2E6EA] rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100">
                <Clock className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">Visiting Habit</h4>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Top Day</span>
                  <span className="text-sm font-black text-gray-900">{insights.preferredDayOfWeek}</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Top Slot</span>
                  <span className="text-sm font-black text-purple-900">{insights.preferredTimeSlot}</span>
                </div>
              </div>

              {/* Veg / Non-Veg Split */}
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex justify-between text-[11px] font-bold text-gray-700">
                  <span>Dietary Preference</span>
                  <span>
                    {insights.vegNonVegSplit.hasData
                      ? `${insights.vegNonVegSplit.vegPercent}% Veg • ${insights.vegNonVegSplit.nonVegPercent}% Non-Veg`
                      : 'Standard Menu'}
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${insights.vegNonVegSplit.vegPercent}%` }}
                    className="bg-emerald-500 h-full"
                    title="Veg"
                  />
                  <div
                    style={{ width: `${insights.vegNonVegSplit.nonVegPercent}%` }}
                    className="bg-rose-500 h-full"
                    title="Non-Veg"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-semibold">
              <span className="flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-amber-600" />
                Discount Dependency:
              </span>
              <span className="font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full">
                {insights.discountDependencyPercent}% of visits
              </span>
            </div>
          </div>

          {/* Card 3: Spend Trend Chart */}
          <div className="bg-white border border-[#E2E6EA] rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">Spend per Visit Trend</h4>
              </div>
              {renderSpendTrendChart()}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PART 2 - C: VISIT HISTORY TABLE                                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">
            Order & Visit History ({visits.length} of {customer.totalOrders} visits)
          </h3>
          <span className="text-[11px] text-gray-400 font-medium">Newest first</span>
        </div>

        <div className="bg-white border border-[#E2E6EA] rounded-2xl overflow-hidden shadow-xs">
          {visits.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 italic">No visit history found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3 text-left">Order / Date</th>
                    <th className="px-4 py-3 text-left">Slot & Day</th>
                    <th className="px-4 py-3 text-left">Type & Station</th>
                    <th className="px-4 py-3 text-left">Payment</th>
                    <th className="px-4 py-3 text-right">Bill Total</th>
                    <th className="px-4 py-3 text-center w-16">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visits.map((ord) => {
                    const isExpanded = expandedOrderId === ord._id;
                    const slotStyle = getMealSlotBadgeStyle(ord.timeSlot);

                    return (
                      <React.Fragment key={ord._id}>
                        <tr
                          onClick={() => toggleOrderExpand(ord._id)}
                          className="hover:bg-purple-50/40 transition-colors cursor-pointer font-medium text-gray-800"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-gray-900">#{ord.orderNumber}</span>
                              <span className="text-[10px] text-gray-500">{ord.dateStr}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${slotStyle}`}>
                                {ord.timeSlot}
                              </span>
                              <span className="text-gray-500 text-[11px]">({ord.dayOfWeek})</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="capitalize font-bold text-gray-800">
                              {ord.orderType.replace('_', ' ')}
                            </span>
                            {ord.tableId && ord.tableId !== 'Counter' && (
                              <span className="block text-[10px] text-purple-700 font-semibold">
                                {ord.tableId}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="uppercase text-[10px] font-black px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                              {ord.paymentMode}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right font-black text-gray-900 text-sm">
                            ₹{ord.total}
                          </td>

                          <td className="px-4 py-3.5 text-center text-purple-700">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 mx-auto" />
                            ) : (
                              <ChevronDown className="w-4 h-4 mx-auto" />
                            )}
                          </td>
                        </tr>

                        {/* Accordion Order Items */}
                        {isExpanded && (
                          <tr className="bg-purple-50/20">
                            <td colSpan={6} className="px-5 py-4 border-b border-purple-100">
                              <div className="flex flex-col gap-2 max-w-xl bg-white border border-purple-100 rounded-xl p-3 shadow-xs">
                                <span className="text-[10px] font-black uppercase text-purple-900">
                                  Order Breakdown #{ord.orderNumber}
                                </span>
                                <div className="divide-y divide-gray-100">
                                  {ord.items.map((it, idx) => (
                                    <div key={idx} className="py-1.5 flex justify-between items-center text-xs">
                                      <span className="font-semibold text-gray-800">
                                        {it.quantity}x {it.name}
                                      </span>
                                      <span className="font-mono text-gray-700">
                                        ₹{it.price} ea = <strong className="font-extrabold text-gray-900">₹{it.subtotal}</strong>
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                <div className="pt-2 border-t border-gray-100 flex flex-col gap-1 text-[11px]">
                                  <div className="flex justify-between text-gray-600">
                                    <span>Subtotal:</span>
                                    <span>₹{ord.subtotal}</span>
                                  </div>
                                  {ord.discount > 0 && (
                                    <div className="flex justify-between text-emerald-700 font-bold">
                                      <span>Discount Applied:</span>
                                      <span>-₹{ord.discount}</span>
                                    </div>
                                  )}
                                  {ord.tax > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                      <span>Taxes & Charges:</span>
                                      <span>₹{ord.tax}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-xs font-black text-purple-950 border-t border-purple-100 pt-1 mt-0.5">
                                    <span>Final Paid Bill:</span>
                                    <span>₹{ord.total}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Visits Pagination */}
          {visitsTotalPages > 1 && (
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500">
                Page {visitsPage} of {visitsTotalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={visitsPage <= 1 || visitsLoading}
                  onClick={() => loadVisits(visitsPage - 1)}
                  className="px-2.5 py-1 rounded bg-white border border-gray-200 disabled:opacity-50 font-bold text-gray-700 cursor-pointer"
                >
                  Prev
                </button>
                <button
                  disabled={visitsPage >= visitsTotalPages || visitsLoading}
                  onClick={() => loadVisits(visitsPage + 1)}
                  className="px-2.5 py-1 rounded bg-white border border-gray-200 disabled:opacity-50 font-bold text-gray-700 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
