'use client';

import React, { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getAdminOrders, updateOrderStatus, updateOrderEstimatedTime, markOrderWhatsAppNotifiedAction } from '../services/order.service';
import { PageHeader, StatusBadge, AdminButton } from '@/components/ui';
import { useOrderNotification } from '@/components/providers';
import { Clock, ArrowLeft, AlertTriangle, CheckCircle2, TrendingDown, MessageSquare, X, ShieldAlert, Plus, ExternalLink, ShoppingBag, Sparkles } from 'lucide-react';
import { OrderItem, Order } from '../types/order.types';
import { ORDER_CONFIG } from '@/config/orderConfig';
import { generateWhatsAppOrderLink } from '@/lib/whatsappService';

import { getRestaurantDetails } from '@/actions/auth';
import { getVocabulary, getDelayReasons, getRejectionReasons } from '@/config/businessVocabulary';

type FilterStatus = 'all' | Order['status'] | 'delayed' | 'missed';

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

function getOrderTimerInfo(order: Order, now: number) {
  const isFinalized = ['cancelled', 'rejected'].includes(order.status);
  if (isFinalized) {
    return null;
  }

  const placedTime = new Date(order.placed_at || order.createdAt).getTime();

  // If order is ready or completed, show the frozen, recorded prep duration
  if (order.status === 'ready' || order.status === 'completed') {
    let prepSecs = order.prep_duration_seconds;
    if (prepSecs == null && order.ready_at) {
      prepSecs = Math.max(0, Math.round((new Date(order.ready_at).getTime() - placedTime) / 1000));
    }
    if (prepSecs == null && order.actualPrepTimeMinutes) {
      prepSecs = order.actualPrepTimeMinutes * 60;
    }
    if (prepSecs == null) {
      const finishTime = new Date(order.updatedAt || order.createdAt).getTime();
      prepSecs = Math.max(0, Math.round((finishTime - placedTime) / 1000));
    }
    const mins = Math.floor(prepSecs / 60);
    const secs = prepSecs % 60;
    const isDelayed = mins >= ORDER_CONFIG.COUNTER_ORDER_DELAY_THRESHOLD_MINUTES;
    const isCapped = mins >= ORDER_CONFIG.MAX_PREP_STOPWATCH_MINUTES;
    return {
      type: 'completed' as const,
      label: isCapped ? '1hr +' : `${mins}m ${secs.toString().padStart(2, '0')}s`,
      isDelayed,
      mins,
      isCapped,
    };
  }

  // Active running timer: count up from +ve 0m 00s -> 1m -> 2m...
  const elapsedSec = Math.max(0, Math.floor((now - placedTime) / 1000));
  const elapsedMins = Math.floor(elapsedSec / 60);
  const elapsedSecsRem = elapsedSec % 60;
  const isDelayed = elapsedMins >= ORDER_CONFIG.COUNTER_ORDER_DELAY_THRESHOLD_MINUTES;
  const isCapped = elapsedMins >= ORDER_CONFIG.MAX_PREP_STOPWATCH_MINUTES;

  // Guard rail: Stop stopwatch when 1hr has passed; display '1hr +' without running infinitely
  if (isCapped) {
    return {
      type: 'running' as const,
      label: '1hr +',
      isDelayed: true,
      mins: elapsedMins,
      isCapped: true,
    };
  }

  return {
    type: 'running' as const,
    label: `+${elapsedMins}m ${elapsedSecsRem.toString().padStart(2, '0')}s`,
    isDelayed,
    mins: elapsedMins,
    isCapped: false,
  };
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const tabParam = searchParams.get('tab');
  const initialSourceTab = tabParam === 'counter' ? 'admin_counter' : 'qr_scan';
  const { acknowledgeOrder } = useOrderNotification();

  const [businessCategory, setBusinessCategory] = useState<string>('restaurant');
  const [restaurantName, setRestaurantName] = useState<string>('Restaurant');
  const [sourceTab, setSourceTab] = useState<'qr_scan' | 'admin_counter' | 'all'>(initialSourceTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customEta, setCustomEta] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [waSending, setWaSending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getRestaurantDetails()
      .then((details) => {
        if (details?.businessCategory) {
          setBusinessCategory(details.businessCategory);
        }
        if (details?.name) {
          setRestaurantName(details.name);
        }
      })
      .catch((err) => console.error('Error loading business category for orders:', err));
  }, []);

  const vocab = getVocabulary(businessCategory);
  const presetDelayReasons = getDelayReasons(businessCategory);
  const presetRejectionReasons = getRejectionReasons(businessCategory);

  // Delay Tracking & Reason Modal states
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [pendingDelayOrder, setPendingDelayOrder] = useState<{
    order: Order;
    nextStatus: Order['status'];
    actualMins: number;
    delayMins: number;
  } | null>(null);
  const [selectedDelayReason, setSelectedDelayReason] = useState(presetDelayReasons[0]);
  const [customDelayReason, setCustomDelayReason] = useState('');

  // Order Rejection Audit Modal states
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [pendingRejectionOrder, setPendingRejectionOrder] = useState<Order | null>(null);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState(presetRejectionReasons[0]);
  const [customRejectionReason, setCustomRejectionReason] = useState('');

  useEffect(() => {
    if (presetDelayReasons.length > 0 && !presetDelayReasons.includes(selectedDelayReason)) {
      setSelectedDelayReason(presetDelayReasons[0]);
    }
  }, [businessCategory, presetDelayReasons]);

  useEffect(() => {
    if (presetRejectionReasons.length > 0 && !presetRejectionReasons.includes(selectedRejectionReason)) {
      setSelectedRejectionReason(presetRejectionReasons[0]);
    }
  }, [businessCategory, presetRejectionReasons]);


  const handleOrderSelect = useCallback((order: Order) => {
    setSelectedOrder(order);
    setViewMode('detail');
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 50;

  // Refs to avoid stale closures in background polling and loading callbacks
  const filterRef = useRef(filter);
  const currentPageRef = useRef(currentPage);
  const ordersRef = useRef(orders);
  const selectedOrderRef = useRef(selectedOrder);
  const highlightIdRef = useRef(highlightId);
  const sourceTabRef = useRef(sourceTab);

  useEffect(() => { filterRef.current = filter; }, [filter]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { selectedOrderRef.current = selectedOrder; }, [selectedOrder]);
  useEffect(() => { highlightIdRef.current = highlightId; }, [highlightId]);
  useEffect(() => { sourceTabRef.current = sourceTab; }, [sourceTab]);

  // Live timer state for countdown / prep stopwatch
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const maxStopwatchMs = ORDER_CONFIG.MAX_PREP_STOPWATCH_MINUTES * 60 * 1000;

    const timer = setInterval(() => {
      const currentNow = Date.now();
      const currentOrders = ordersRef.current;
      const currentSelected = selectedOrderRef.current;
      const allActive = [
        ...currentOrders,
        ...(currentSelected && !currentOrders.some((o) => o._id === currentSelected._id) ? [currentSelected] : []),
      ];

      // Guard rail: only tick/re-render if there's at least one active order under the 1hr cap
      const hasActive = allActive.some((order) => {
        if (['ready', 'completed', 'cancelled', 'rejected'].includes(order.status)) return false;
        const placedTime = new Date(order.placed_at || order.createdAt).getTime();
        const elapsedMs = currentNow - placedTime;
        return elapsedMs >= 0 && elapsedMs < maxStopwatchMs;
      });

      if (hasActive) {
        setNow(currentNow);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);


  const loadOrders = async (showLoading = false, pageNum?: number) => {
    const activePage = pageNum !== undefined ? pageNum : currentPageRef.current;
    const activeFilter = filterRef.current;
    const activeHighlightId = highlightIdRef.current;
    const activeSource = sourceTabRef.current;

    if (showLoading) setLoading(true);
    try {
      const skipNum = (activePage - 1) * limit;
      const data = await getAdminOrders(limit, skipNum, activeFilter, activeSource);
      if (data?.unauthorized) {
        setError('Your session has expired or you are not logged in. Please log in again.');
        setOrders([]);
        setLoading(false);
        return;
      }
      const fetchedOrders = data?.orders || [];
      const total = data?.totalCount || 0;

      setOrders(fetchedOrders);
      setTotalCount(total);
      setCurrentPage(activePage);

      const currentSelected = selectedOrderRef.current;

      if (activeHighlightId && showLoading) {
        const found = fetchedOrders.find((o: Order) => o._id === activeHighlightId);
        if (found) {
          setSelectedOrder(found);
          setViewMode('detail');
        }
      } else if (!currentSelected && fetchedOrders.length > 0) {
        if (showLoading) {
          setSelectedOrder(fetchedOrders[0]);
        }
      } else if (currentSelected) {
        const updated = fetchedOrders.find((o: Order) => o._id === currentSelected._id);
        if (updated) {
          setSelectedOrder(updated);
        } else if (showLoading) {
          setSelectedOrder(fetchedOrders[0] || null);
        }
      }

      setError('');
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || '';
      if (msg.includes('unexpected response') || msg.includes('Unauthorized') || msg.includes('login')) {
        setError('Your session has expired. Please log in again to manage orders.');
      } else {
        setError('Failed to load orders.');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const isInitialMount = useRef(true);

  useEffect(() => {
    const showLoading = isInitialMount.current;
    loadOrders(showLoading, currentPage);
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [filter, currentPage, highlightId, sourceTab]);

  useEffect(() => {
    if (tabParam === 'counter' && sourceTab !== 'admin_counter') {
      setSourceTab('admin_counter');
      setFilter('all');
      setCurrentPage(1);
    }
  }, [tabParam]);

  useEffect(() => {
    if (businessCategory === 'salon') {
      return; // Do not run background polling for salon mode
    }

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      loadOrders(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [businessCategory]);

  // Execution helper for status updates with delay metadata and rejection reason
  const executeStatusUpdate = async (
    orderId: string,
    nextStatus: Order['status'],
    delayData?: {
      actualPrepTimeMinutes?: number;
      delayMinutes?: number;
      isDelayed?: boolean;
      delayReason?: string;
    },
    rejectionReason?: string
  ) => {
    setActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const updated = await updateOrderStatus(orderId, nextStatus, delayData, rejectionReason);
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      setSelectedOrder(updated);
      acknowledgeOrder(orderId);
      setDelayModalOpen(false);
      setPendingDelayOrder(null);
      setRejectionModalOpen(false);
      setPendingRejectionOrder(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update order status';
      alert(message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Smart status change interceptor that checks for delays & cancellation reasons
  const handleStatusChange = async (orderId: string, nextStatus: Order['status']) => {
    const targetOrder = orders.find((o) => o._id === orderId) || selectedOrder;
    if (!targetOrder) return;

    // Check if rejecting / cancelling order
    if (nextStatus === 'cancelled') {
      setPendingRejectionOrder(targetOrder);
      setSelectedRejectionReason(presetRejectionReasons[0]);
      setCustomRejectionReason('');
      setRejectionModalOpen(true);
      return;
    }

    // Check if moving to 'completed' or 'ready' and has estimatedTime set or exceeds counter threshold
    if (['ready', 'completed'].includes(nextStatus)) {
      const placedTime = new Date(targetOrder.placed_at || targetOrder.createdAt).getTime();
      const actualMins = Math.max(1, Math.round((Date.now() - placedTime) / (60 * 1000)));

      // Counter orders: bypass audit modal and record prep duration directly
      if (targetOrder.source === 'admin_counter') {
        const threshold = ORDER_CONFIG.COUNTER_ORDER_DELAY_THRESHOLD_MINUTES;
        const delayMins = Math.max(0, actualMins - threshold);
        executeStatusUpdate(orderId, nextStatus, {
          actualPrepTimeMinutes: actualMins,
          delayMinutes: delayMins,
          isDelayed: delayMins > 0,
          delayReason: delayMins > 0 ? 'Exceeded 10 min window' : '',
        });
        return;
      }

      const threshold = targetOrder.estimatedTime && targetOrder.estimatedTime > 0
        ? targetOrder.estimatedTime
        : ORDER_CONFIG.COUNTER_ORDER_DELAY_THRESHOLD_MINUTES;
      const delayMins = actualMins - threshold;

      if (delayMins > 0) {
        setPendingDelayOrder({
          order: targetOrder,
          nextStatus,
          actualMins,
          delayMins,
        });
        setSelectedDelayReason(presetDelayReasons[0]);
        setCustomDelayReason('');
        setDelayModalOpen(true);
        return;
      } else {
        // On time! Update status with delay metadata
        executeStatusUpdate(orderId, nextStatus, {
          actualPrepTimeMinutes: actualMins,
          delayMinutes: 0,
          isDelayed: false,
          delayReason: '',
        });
        return;
      }
    }

    // Default status change
    executeStatusUpdate(orderId, nextStatus);
  };

  const handleSendWhatsApp = async (order: Order) => {
    if (!order.customerPhone) {
      alert('No customer phone number recorded for this order.');
      return;
    }
    const isReady = order.status === 'ready' || order.status === 'completed';
    const waUrl = generateWhatsAppOrderLink({
      type: isReady ? 'ready' : 'placed',
      phone: order.customerPhone,
      customerName: order.customerName,
      orderId: order._id,
      restaurantName: restaurantName || 'Restaurant',
      total: order.total,
    });

    if (waUrl) {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }

    setWaSending((prev) => ({ ...prev, [order._id]: true }));
    try {
      await markOrderWhatsAppNotifiedAction(order._id);
      const updatedOrder = {
        ...order,
        whatsapp_notified: true,
        whatsapp_notified_at: new Date().toISOString(),
      };
      setOrders((prev) => prev.map((o) => (o._id === order._id ? updatedOrder : o)));
      if (selectedOrder?._id === order._id) {
        setSelectedOrder(updatedOrder);
      }
    } catch (err) {
      console.error('Failed to update WhatsApp notification status:', err);
    } finally {
      setWaSending((prev) => ({ ...prev, [order._id]: false }));
    }
  };

  const handleConfirmRejection = () => {
    if (!pendingRejectionOrder) return;
    const isCustom = selectedRejectionReason.includes('Other');
    const finalReason = isCustom
      ? (customRejectionReason.trim() || 'Unspecified Rejection Reason')
      : (selectedRejectionReason + (customRejectionReason.trim() ? `: ${customRejectionReason.trim()}` : ''));

    executeStatusUpdate(pendingRejectionOrder._id, 'cancelled', undefined, finalReason);
  };

  const handleConfirmDelayAndComplete = () => {
    if (!pendingDelayOrder) return;

    const isCustom = selectedDelayReason.includes('Other');
    const finalReason = isCustom
      ? (customDelayReason.trim() || 'Unspecified Kitchen Delay')
      : (selectedDelayReason + (customDelayReason.trim() ? `: ${customDelayReason.trim()}` : ''));

    executeStatusUpdate(pendingDelayOrder.order._id, pendingDelayOrder.nextStatus, {
      actualPrepTimeMinutes: pendingDelayOrder.actualMins,
      delayMinutes: pendingDelayOrder.delayMins,
      isDelayed: true,
      delayReason: finalReason,
    });
  };

  const handleCancelOrder = async (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      executeStatusUpdate(orderId, 'cancelled');
    }
  };

  // Calculate kitchen metrics
  const delayedOrders = orders.filter((o) => o.isDelayed);
  const totalCompleted = orders.filter((o) => ['ready', 'completed'].includes(o.status)).length;
  const onTimeCount = Math.max(0, totalCompleted - delayedOrders.length);
  const onTimeRate = totalCompleted > 0 ? Math.round((onTimeCount / totalCompleted) * 100) : 100;
  const totalDelayMins = delayedOrders.reduce((sum, o) => sum + (o.delayMinutes || 0), 0);
  const avgDelayMins = delayedOrders.length > 0 ? (totalDelayMins / delayedOrders.length).toFixed(1) : '0';

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
        title={vocab.ordersNoun}
        subtitle={`Track live ${vocab.orderNoun.toLowerCase()}s, prep timers, delays & ${vocab.prepArea.toLowerCase()} performance`}
        actions={
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/orders/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#C0181A] hover:bg-[#A01416] rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Counter Order</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#16A34A] font-medium bg-[#F0FDF4] px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              Live Polling Active
            </span>
          </div>
        }
      />

      {error && (
        <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg p-3 text-sm text-[#DC2626] font-medium">
          {error}
        </div>
      )}

      {/* Kitchen Efficiency & Delay Analytics Summary Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border border-[#E2E6EA] rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
          <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> On-Time Rate
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-950">{onTimeRate}%</span>
            <span className="text-[10px] text-emerald-700 block font-semibold">Target: 90%+ On-Time</span>
          </div>
        </div>

        <div className="flex flex-col justify-between p-3 bg-red-50/50 border border-red-100 rounded-xl">
          <span className="text-[10px] font-black uppercase text-red-800 tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Delayed Orders
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-red-950">{delayedOrders.length}</span>
            <span className="text-[10px] text-red-700 block font-semibold">{totalDelayMins} total delay mins</span>
          </div>
        </div>

        <div className="flex flex-col justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
          <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Avg Delay / Order
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-950">+{avgDelayMins} min</span>
            <span className="text-[10px] text-amber-700 block font-semibold">Exceeded promised ETA</span>
          </div>
        </div>

        <div className="flex flex-col justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
          <span className="text-[10px] font-black uppercase text-gray-700 tracking-wider">
            Total Processed
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-gray-900">{totalCount}</span>
            <span className="text-[10px] text-gray-500 block font-semibold">{totalCompleted} completed</span>
          </div>
        </div>
      </div>

      {/* Primary Channel Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => {
              setSourceTab('qr_scan');
              setFilter('all');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              sourceTab === 'qr_scan'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>📱 QR Scan Orders</span>
            {sourceTab === 'qr_scan' && (
              <span className="bg-sky-100 text-sky-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {totalCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSourceTab('admin_counter');
              setFilter('all');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              sourceTab === 'admin_counter'
                ? 'bg-[#C0181A] text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>🥡 Counter Orders (Walk-in)</span>
            {sourceTab === 'admin_counter' ? (
              <span className="bg-white/20 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {totalCount}
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#C0181A]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSourceTab('all');
              setFilter('all');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
              sourceTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <span>All Channels</span>
          </button>
        </div>

        {/* Enter New Counter Order button */}
        <Link
          href="/admin/orders/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black text-white bg-[#C0181A] hover:bg-[#A01416] rounded-xl shadow-md transition-all active:scale-98 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Enter New Counter Order</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {((sourceTab === 'admin_counter'
          ? ['all', 'received', 'preparing', 'ready', 'completed', 'delayed', 'cancelled']
          : ['all', 'received', 'accepted', 'preparing', 'completed', 'delayed', 'missed', 'cancelled']) as FilterStatus[]).map(
          (status) => (
            <button
              key={status}
              onClick={() => {
                setFilter(status);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors capitalize flex items-center gap-1.5 ${
                filter === status
                  ? 'bg-[#111827] text-white shadow-sm'
                  : status === 'delayed'
                  ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-extrabold'
                  : status === 'missed'
                  ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 font-black'
                  : status === 'ready'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-extrabold'
                  : 'bg-white text-[#6B7280] border border-[#E2E6EA] hover:bg-[#F4F6F9]'
              }`}
            >
              {status === 'delayed' && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
              {status === 'missed' && <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />}
              {status === 'ready' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{status === 'delayed' ? `Delayed (${delayedOrders.length})` : status === 'missed' ? '⚠️ Missed (10m+)' : status}</span>
            </button>
          )
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-[#E2E6EA] rounded-2xl p-14 text-center flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-gray-50 rounded-2xl text-gray-400">
            {sourceTab === 'admin_counter' ? <ShoppingBag className="w-8 h-8 text-gray-400" /> : <Clock className="w-8 h-8 text-gray-400" />}
          </div>
          <p className="text-sm font-semibold text-[#6B7280]">
            {sourceTab === 'admin_counter'
              ? 'No counter orders found for this view.'
              : filter === 'delayed'
              ? 'Great job! No delayed orders found.'
              : 'No orders received yet.'}
          </p>
          {sourceTab === 'admin_counter' && (
            <Link
              href="/admin/orders/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#C0181A] hover:bg-[#A01416] rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Enter First Counter Order</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
          {/* Left pane: Orders list */}
          <div className={`w-full lg:w-1/2 flex flex-col gap-3 ${viewMode === 'detail' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="bg-white border border-[#E2E6EA] rounded-xl max-h-[600px] overflow-y-auto">
              <div className="divide-y divide-[#E2E6EA]">
                {orders.map((order) => (
                  <OrderListItem
                    key={order._id}
                    order={order}
                    isSelected={selectedOrder?._id === order._id}
                    onClick={handleOrderSelect}
                    now={now}
                    onStatusChange={handleStatusChange}
                    isActionLoading={actionLoading[order._id] || false}
                    businessCategory={businessCategory}
                  />
                ))}
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
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-[#111827]">Order Details</h2>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        selectedOrder.source === 'admin_counter'
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : 'bg-sky-100 text-sky-800 border-sky-200'
                      }`}>
                        {selectedOrder.source === 'admin_counter' ? '🥡 Counter Order' : '📱 QR Scan'}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#6B7280] block mt-0.5">ID: {selectedOrder._id}</span>
                    <span className="text-[12px] text-[#6B7280] block">
                      Placed: {new Date(selectedOrder.placed_at || selectedOrder.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <StatusBadge label={selectedOrder.status} variant={getStatusVariant(selectedOrder.status)} />
                </div>

                {/* Delay Warning Badge in Detail View */}
                {selectedOrder.isDelayed && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        Order Delayed by +{selectedOrder.delayMinutes} Mins
                      </span>
                      <span className="text-[10px] bg-red-100 text-red-800 font-extrabold px-2.5 py-0.5 rounded-full">
                        ETA: {selectedOrder.estimatedTime}m | Actual: {selectedOrder.actualPrepTimeMinutes}m
                      </span>
                    </div>
                    {selectedOrder.delayReason && (
                      <div className="text-xs text-red-900 font-semibold bg-white/70 border border-red-200/60 p-2.5 rounded-xl">
                        <span className="font-extrabold uppercase text-[9px] text-red-700 block mb-0.5">Logged Delay Reason:</span>
                        <p className="italic">"{selectedOrder.delayReason}"</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedOrder.estimatedTime && !selectedOrder.isDelayed && (
                  <div className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D97706] bg-[#FFFBEB] px-3 py-1.5 rounded-lg border border-[#D97706]/20 w-fit">
                    <Clock className="w-3.5 h-3.5" />
                    ETA: {selectedOrder.estimatedTime} mins
                  </div>
                )}

                {/* Rejection Audit Warning Badge in Detail View */}
                {selectedOrder.status === 'cancelled' && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                        Order Rejected / Cancelled
                      </span>
                      {selectedOrder.rejectedAt && (
                        <span className="text-[10px] bg-red-100 text-red-800 font-extrabold px-2.5 py-0.5 rounded-full">
                          {new Date(selectedOrder.rejectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-red-900 font-semibold bg-white/70 border border-red-200/60 p-2.5 rounded-xl">
                      <span className="font-extrabold uppercase text-[9px] text-red-700 block mb-0.5">Internal Audit Rejection Reason:</span>
                      <p className="italic font-bold">"{selectedOrder.rejectionReason || 'No specific reason logged'}"</p>
                    </div>
                  </div>
                )}

                {/* Customer, Order Type & Payment Method */}
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B7280] mb-2">Customer & Order Details</h3>
                  <p className="text-sm font-black text-[#111827]">{selectedOrder.customerName}</p>
                  <p className="text-xs font-semibold text-[#6B7280]">{selectedOrder.customerPhone}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                      selectedOrder.appointmentDetails || businessCategory === 'salon'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : selectedOrder.orderType === 'dine_in' || (selectedOrder.tableId && !selectedOrder.tableId.toLowerCase().includes('takeaway'))
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : selectedOrder.orderType === 'delivery'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {selectedOrder.appointmentDetails || businessCategory === 'salon'
                        ? `📅 In-Salon Appointment ${selectedOrder.tableId ? `(Station ${selectedOrder.tableId})` : ''}`
                        : selectedOrder.orderType === 'dine_in' || (selectedOrder.tableId && !selectedOrder.tableId.toLowerCase().includes('takeaway'))
                        ? `🍽️ Dine In ${selectedOrder.tableId ? `(Table ${selectedOrder.tableId})` : '(At table)'}`
                        : selectedOrder.orderType === 'delivery'
                        ? '🛵 Delivery (Home delivery)'
                        : '🥡 Takeaway (Self pickup)'}
                    </span>
                    <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                      selectedOrder.paymentMode === 'online'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-green-100 text-green-800 border-green-200'
                    }`}>
                      {selectedOrder.paymentMode === 'online' ? '💳 Online Payment' : '💵 Cash'}
                    </span>
                  </div>
                  {selectedOrder.notes && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-[#C0181A]">
                      <span className="font-extrabold uppercase tracking-wide block mb-1">
                        {businessCategory === 'salon' ? 'Client Request Note:' : businessCategory === 'detailing' ? 'Job / Bay Note:' : 'Note to Chef:'}
                      </span>
                      <p className="italic font-medium leading-relaxed">"{selectedOrder.notes}"</p>
                    </div>
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

                {/* Salon Appointment Details Card */}
                {(selectedOrder.appointmentDetails || businessCategory === 'salon') && (
                  <div className="border-t border-[#E2E6EA] pt-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-purple-700 mb-2 flex items-center gap-1.5">
                      <span>Appointment Reservation Details</span>
                    </h3>
                    <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/90 rounded-xl p-3 border border-purple-100">
                          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Date & Slot</span>
                          <span className="font-black text-sm text-gray-900 block">
                            {selectedOrder.appointmentDetails?.bookingDate || 'Scheduled Date'} • {selectedOrder.appointmentDetails?.bookingTime || 'Scheduled Slot'}
                          </span>
                        </div>
                        <div className="bg-white/90 rounded-xl p-3 border border-purple-100">
                          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Assigned Specialist</span>
                          <span className="font-black text-sm text-gray-900 block truncate">
                            {selectedOrder.appointmentDetails?.specialistName || 'Any Available Specialist'}
                          </span>
                        </div>
                      </div>
                      {selectedOrder.appointmentDetails?.userNotes && (
                        <div className="bg-white/90 rounded-xl p-3 border border-purple-100 text-xs">
                          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Client Special Notes:</span>
                          <p className="italic text-gray-700">"{selectedOrder.appointmentDetails.userNotes}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Running Prep Timer or Completed Performance Card - STRICTLY for Restaurant ONLY */}
                {(() => {
                  // Guard rail: Salons, detailing, and retail do NOT have kitchen prep metrics
                  if (businessCategory !== 'restaurant') {
                    return null;
                  }

                  const timerInfo = getOrderTimerInfo(selectedOrder, now);
                  const isReadyOrDone = ['ready', 'completed'].includes(selectedOrder.status);

                  if (isReadyOrDone && timerInfo?.type === 'completed') {
                    return (
                      <div className="border-t border-[#E2E6EA] pt-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B7280] mb-2">
                          Kitchen Prep Performance
                        </h3>
                        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                          timerInfo.isDelayed
                            ? 'bg-red-50/70 border-red-200'
                            : 'bg-emerald-50/70 border-emerald-200'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${
                              timerInfo.isDelayed ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                              <Clock className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-xs text-[#6B7280] block font-semibold">Prep Duration</span>
                              <span className="text-2xl font-black text-[#111827] tracking-tight tabular-nums">
                                {timerInfo.label}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-1 rounded-full border ${
                              timerInfo.isDelayed
                                ? 'bg-red-100 text-red-800 border-red-200'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}>
                              {timerInfo.isDelayed ? <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                              <span>{timerInfo.isDelayed ? `Delayed (${timerInfo.isCapped ? '1hr+' : `${timerInfo.mins}m`})` : `On-Time (${timerInfo.mins}m)`}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (!isReadyOrDone && ['received', 'accepted', 'preparing'].includes(selectedOrder.status)) {
                    return (
                      <div className="border-t border-[#E2E6EA] pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B7280]">
                            Live Prep Elapsed Stopwatch (+ve Elapsed)
                          </h3>
                          <div className="flex items-center gap-2">
                            {selectedOrder.estimatedTime ? (
                              <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                                Target: {selectedOrder.estimatedTime}m
                              </span>
                            ) : null}
                            {timerInfo?.isCapped ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3 text-red-600" />
                                1hr+
                              </span>
                            ) : timerInfo?.isDelayed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-red-600" />
                                Over 10m
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                          timerInfo?.isDelayed
                            ? 'bg-gradient-to-r from-red-50 to-red-100/50 border-red-200 shadow-sm ring-1 ring-red-400'
                            : 'bg-gradient-to-r from-[#FEF2F2] to-[#FFF5F5] border-[#FEE2E2] shadow-sm'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${timerInfo?.isDelayed ? 'bg-red-600 text-white' : 'bg-[#C0181A]/10 text-[#C0181A]'}`}>
                              <Clock className={`w-5 h-5 ${timerInfo?.isCapped ? '' : timerInfo?.isDelayed ? 'animate-bounce' : 'animate-pulse'}`} />
                            </div>
                            <div>
                              <span className="text-xs text-[#6B7280] block font-medium">Running Elapsed Time</span>
                              <span className={`text-2xl font-black tracking-tight tabular-nums ${timerInfo?.isDelayed ? 'text-red-700' : 'text-[#111827]'}`}>
                                {timerInfo?.label || '+0m 00s'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={actionLoading[selectedOrder._id]}
                              onClick={() => handleStatusChange(selectedOrder._id, 'ready')}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Sparkles className="w-4 h-4 text-amber-300" />
                              <span>{actionLoading[selectedOrder._id] ? 'Logging...' : '⚡ Mark Ready & Log Prep Time'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

                {/* WhatsApp Notification Card */}
                <div className="border-t border-[#E2E6EA] pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B7280]">
                      Customer Notification
                    </h3>
                    {selectedOrder.whatsapp_notified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        WhatsApp Notified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pending Notification
                      </span>
                    )}
                  </div>
                  <div className="bg-[#F9FAFB] border border-[#E2E6EA] rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-lg">
                        <MessageSquare className="w-5 h-5 text-[#25D366]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111827]">
                          {selectedOrder.customerPhone || 'No phone number'}
                        </p>
                        <p className="text-[11px] text-[#6B7280]">
                          {selectedOrder.whatsapp_notified_at
                            ? `Sent at ${new Date(selectedOrder.whatsapp_notified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : selectedOrder.status === 'ready' || selectedOrder.status === 'completed'
                            ? 'Send "Order Ready" pickup alert'
                            : 'Send "Order Placed" receipt link'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={waSending[selectedOrder._id] || !selectedOrder.customerPhone}
                      onClick={() => handleSendWhatsApp(selectedOrder)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366] hover:bg-[#1EBE5D] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>
                        {waSending[selectedOrder._id]
                          ? 'Opening...'
                          : selectedOrder.whatsapp_notified
                          ? 'Resend WhatsApp'
                          : 'Notify on WhatsApp'}
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </button>
                  </div>
                </div>

                {/* Status Controls */}
                <div className="border-t border-[#E2E6EA] pt-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] mb-3">Update Status</h3>
                  {actionLoading[selectedOrder._id] ? (
                    <span className="text-xs text-[#6B7280] animate-pulse">Updating...</span>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {businessCategory === 'salon' ? (
                        /* Salon / Service Business Workflow */
                        <div className="flex flex-col gap-3">
                          {selectedOrder.status === 'received' && (
                            <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E2E6EA] flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase text-gray-700 tracking-wider">
                                  Appointment Actions
                                </span>
                                <span className="text-[10px] bg-purple-100 text-purple-800 font-extrabold px-2.5 py-0.5 rounded-full">
                                  New Booking
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2.5 items-center">
                                <AdminButton
                                  variant="success"
                                  onClick={async () => {
                                    setActionLoading((prev) => ({ ...prev, [selectedOrder._id]: true }));
                                    try {
                                      const updated = await updateOrderEstimatedTime(selectedOrder._id, 30);
                                      setOrders((prev) => prev.map((o) => (o._id === selectedOrder._id ? updated : o)));
                                      setSelectedOrder(updated);
                                      acknowledgeOrder(selectedOrder._id);
                                    } catch (err) {
                                      const message = err instanceof Error ? err.message : 'Failed to confirm booking';
                                      alert(message);
                                    } finally {
                                      setActionLoading((prev) => ({ ...prev, [selectedOrder._id]: false }));
                                    }
                                  }}
                                >
                                  <span className="flex items-center gap-1.5 font-bold">
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                    <span>Accept & Confirm Booking</span>
                                  </span>
                                </AdminButton>
                                <AdminButton
                                  variant="secondary"
                                  onClick={() => handleStatusChange(selectedOrder._id, 'preparing')}
                                >
                                  Start Service
                                </AdminButton>
                                <AdminButton
                                  variant="dangerSolid"
                                  onClick={() => handleCancelOrder(selectedOrder._id)}
                                >
                                  Decline Booking
                                </AdminButton>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {selectedOrder.status === 'accepted' && (
                              <>
                                <AdminButton onClick={() => handleStatusChange(selectedOrder._id, 'preparing')}>
                                  Start Service
                                </AdminButton>
                                <AdminButton variant="success" onClick={() => handleStatusChange(selectedOrder._id, 'completed')}>
                                  Mark Completed
                                </AdminButton>
                              </>
                            )}
                            {selectedOrder.status === 'preparing' && (
                              <AdminButton variant="success" onClick={() => handleStatusChange(selectedOrder._id, 'completed')}>
                                Mark Completed
                              </AdminButton>
                            )}
                            {selectedOrder.status === 'ready' && (
                              <AdminButton variant="success" onClick={() => handleStatusChange(selectedOrder._id, 'completed')}>
                                Complete Service
                              </AdminButton>
                            )}
                            {['accepted', 'preparing', 'ready'].includes(selectedOrder.status) && (
                              <AdminButton variant="danger" onClick={() => handleCancelOrder(selectedOrder._id)}>
                                Cancel Booking
                              </AdminButton>
                            )}
                            {['completed', 'cancelled'].includes(selectedOrder.status) && (
                              <span className="text-sm text-[#6B7280]">This appointment is finalized.</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Standard Restaurant Workflow */
                        <div className="flex flex-col gap-3">
                          {selectedOrder.status === 'received' && (
                            selectedOrder.source === 'admin_counter' ? (
                              <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E2E6EA] flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-black uppercase text-gray-700 tracking-wider">
                                    Walk-in Counter Actions
                                  </span>
                                  <span className="text-[10px] bg-purple-100 text-purple-800 font-extrabold px-2.5 py-0.5 rounded-full">
                                    Walk-in POS
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2.5 items-center">
                                  <AdminButton
                                    variant="success"
                                    onClick={() => handleStatusChange(selectedOrder._id, 'ready')}
                                  >
                                    <span className="flex items-center gap-1.5 font-black">
                                      <Sparkles className="w-4 h-4 text-amber-300" />
                                      <span>⚡ Mark Ready</span>
                                    </span>
                                  </AdminButton>
                                  <AdminButton
                                    variant="secondary"
                                    onClick={() => handleStatusChange(selectedOrder._id, 'preparing')}
                                  >
                                    Start Preparing
                                  </AdminButton>
                                  <AdminButton
                                    variant="dangerSolid"
                                    onClick={() => handleCancelOrder(selectedOrder._id)}
                                  >
                                    Cancel Order
                                  </AdminButton>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-[#F9FAFB] p-3 rounded-lg border border-[#E2E6EA] w-full">
                                <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-2">Set Preparation Time</label>
                                <div className="flex flex-col gap-2">
                                  <div className="flex flex-wrap gap-1.5">
                                    {[15, 20, 30, 45, 60].map((mins) => (
                                      <button
                                        key={mins}
                                        type="button"
                                        onClick={() => setCustomEta(mins.toString())}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                                          customEta === mins.toString()
                                            ? 'bg-green-600 text-white border-green-600'
                                            : 'bg-white text-[#374151] border-[#E2E6EA] hover:bg-[#F4F6F9]'
                                        }`}
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
                                      className="px-3 py-1.5 text-xs border border-[#E2E6EA] rounded-lg w-32 outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981]"
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-2 items-center mt-2 border-t border-[#E2E6EA] pt-2">
                                    <AdminButton
                                      variant="success"
                                      onClick={async () => {
                                        const mins = parseInt(customEta, 10) || 20;
                                        setActionLoading((prev) => ({ ...prev, [selectedOrder._id]: true }));
                                        try {
                                          const updated = await updateOrderEstimatedTime(selectedOrder._id, mins);
                                          setOrders((prev) => prev.map((o) => (o._id === selectedOrder._id ? updated : o)));
                                          setSelectedOrder(updated);
                                          acknowledgeOrder(selectedOrder._id);
                                          setCustomEta('');
                                        } catch (err) {
                                          const message = err instanceof Error ? err.message : 'Failed to accept order';
                                          alert(message);
                                        } finally {
                                          setActionLoading((prev) => ({ ...prev, [selectedOrder._id]: false }));
                                        }
                                      }}
                                    >
                                      Accept Order
                                    </AdminButton>
                                    <AdminButton
                                      variant="secondary"
                                      onClick={() => handleStatusChange(selectedOrder._id, 'ready')}
                                    >
                                      <span className="flex items-center gap-1 font-black">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                        <span>Mark Ready</span>
                                      </span>
                                    </AdminButton>
                                    <AdminButton
                                      variant="dangerSolid"
                                      onClick={() => handleCancelOrder(selectedOrder._id)}
                                    >
                                      Reject Order
                                    </AdminButton>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                          <div className="flex flex-wrap gap-2">
                            {selectedOrder.status === 'accepted' && (
                              <>
                                <AdminButton onClick={() => handleStatusChange(selectedOrder._id, 'preparing')}>Start Preparing</AdminButton>
                                <AdminButton variant="success" onClick={() => handleStatusChange(selectedOrder._id, 'ready')}>Mark Ready</AdminButton>
                              </>
                            )}
                            {selectedOrder.status === 'preparing' && (
                              <AdminButton variant="success" onClick={() => handleStatusChange(selectedOrder._id, 'ready')}>Mark Ready</AdminButton>
                            )}
                            {selectedOrder.status === 'ready' && (
                              <AdminButton variant="success" onClick={() => handleStatusChange(selectedOrder._id, 'completed')}>Complete / Delivered</AdminButton>
                            )}
                            {['accepted', 'preparing', 'ready'].includes(selectedOrder.status) && (
                              <AdminButton variant="danger" onClick={() => handleCancelOrder(selectedOrder._id)}>Cancel</AdminButton>
                            )}
                            {['completed', 'cancelled'].includes(selectedOrder.status) && (
                              <span className="text-sm text-[#6B7280]">This order is finalized.</span>
                            )}
                          </div>
                        </div>
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

      {/* Order Delay Reason & Notes Modal */}
      {delayModalOpen && pendingDelayOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 flex flex-col gap-4 relative">
            <button
              onClick={() => setDelayModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full inline-block mb-0.5">
                  DELAY AUDIT LOG
                </span>
                <h3 className="text-base font-extrabold text-gray-900">
                  Order #{pendingDelayOrder.order._id.substring(pendingDelayOrder.order._id.length - 6).toUpperCase()} Exceeded Promised ETA!
                </h3>
              </div>
            </div>

            {/* Delay Metrics Header Box */}
            <div className="bg-red-50/80 border border-red-200 rounded-2xl p-4 grid grid-cols-3 text-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-red-700 block">Promised ETA</span>
                <span className="text-base font-black text-red-950">{pendingDelayOrder.order.estimatedTime} min</span>
              </div>
              <div className="border-x border-red-200">
                <span className="text-[9px] uppercase font-bold text-red-700 block">Actual Time</span>
                <span className="text-base font-black text-red-950">{pendingDelayOrder.actualMins} min</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-red-700 block">Total Delay</span>
                <span className="text-base font-black text-red-600">+{pendingDelayOrder.delayMins} min</span>
              </div>
            </div>

            {/* Reason Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
                Select Delay Reason (Required for Admin Analytics) *
              </label>
              <div className="flex flex-col gap-1.5">
                {presetDelayReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedDelayReason(reason)}
                    className={`text-left text-xs px-3.5 py-2.5 rounded-xl border transition-all font-semibold flex items-center justify-between ${
                      selectedDelayReason === reason
                        ? 'bg-[#111827] text-white border-[#111827] shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span>{reason}</span>
                    {selectedDelayReason === reason && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notes Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                Optional Delay Notes / Details
              </label>
              <textarea
                rows={2}
                placeholder={`e.g. Unforeseen delay at ${vocab.prepArea.toLowerCase()} station...`}
                value={customDelayReason}
                onChange={(e) => setCustomDelayReason(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 outline-none focus:border-indigo-600 transition-colors resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleConfirmDelayAndComplete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs py-3 rounded-xl uppercase tracking-wider transition-all shadow-md active:scale-98"
              >
                Log Delay & Mark Ready
              </button>
              <button
                type="button"
                onClick={() => setDelayModalOpen(false)}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Order Rejection Audit Modal */}
      {rejectionModalOpen && pendingRejectionOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-gray-900">
                  Reject Order #{pendingRejectionOrder._id.slice(-6).toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setRejectionModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl p-3.5 text-xs text-red-900 font-semibold">
              🔒 <strong>Internal Rejection Audit:</strong> Select reason why this order is rejected. Saved internally for management analysis.
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Select Rejection Reason *</label>
              <div className="flex flex-col gap-1.5">
                {presetRejectionReasons.map((reason) => {
                  const isSelected = selectedRejectionReason === reason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setSelectedRejectionReason(reason)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <span>{reason}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedRejectionReason.includes('Other') && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
                <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Specify Internal Reason *</label>
                <textarea
                  rows={2}
                  value={customRejectionReason}
                  onChange={(e) => setCustomRejectionReason(e.target.value)}
                  placeholder={`e.g. Out of stock / ${vocab.prepStaff} unavailable...`}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs font-medium focus:border-red-600 outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading[pendingRejectionOrder._id]}
                onClick={handleConfirmRejection}
                className="px-5 py-2.5 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading[pendingRejectionOrder._id] ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
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

interface OrderListItemProps {
  order: Order;
  isSelected: boolean;
  onClick: (order: Order) => void;
  now: number;
  onStatusChange?: (orderId: string, status: Order['status']) => void;
  isActionLoading?: boolean;
  businessCategory?: string;
}

const OrderListItem = React.memo(function OrderListItem({
  order,
  isSelected,
  onClick,
  now,
  onStatusChange,
  isActionLoading = false,
  businessCategory = 'restaurant',
}: OrderListItemProps) {
  const effectiveCategory = (order as any).businessCategory || businessCategory || 'restaurant';
  const displayId = order._id.substring(order._id.length - 6).toUpperCase();
  const itemNames = order.items.map((i) => i.name).join(', ');
  const dateStr = new Date(order.placed_at || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isDineIn = order.orderType === 'dine_in' || (order.tableId && !order.tableId.toLowerCase().includes('takeaway'));
  const isDelivery = order.orderType === 'delivery';
  const isOnlinePay = order.paymentMode === 'online';
  const isCounter = order.source === 'admin_counter';

  const timerInfo = getOrderTimerInfo(order, now);
  const isDelayedRunning = timerInfo?.type === 'running' && timerInfo.isDelayed;
  const canMarkReady = ['received', 'accepted', 'preparing'].includes(order.status);
  const canComplete = order.status === 'ready';

  return (
    <div
      onClick={() => onClick(order)}
      className={`p-4 flex flex-col gap-2 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-[#FEF2F2] border-l-[3px] border-l-[#C0181A]'
          : isDelayedRunning
          ? 'bg-red-50/40 hover:bg-red-50/60 border-l-[3px] border-l-red-500'
          : 'hover:bg-[#F4F6F9]'
      }`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#111827]">#{displayId}</span>
          <span className={`inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
            isCounter
              ? 'bg-purple-50 text-purple-800 border-purple-200'
              : 'bg-sky-50 text-sky-800 border-sky-200'
          }`}>
            {isCounter ? '🥡 Counter' : '📱 QR Scan'}
          </span>
        </div>
        <span className="text-[11px] text-[#6B7280]">{dateStr}</span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-[#111827] font-semibold">
          {order.customerName}
        </span>
        <span className="font-extrabold text-[#111827]">₹{order.total}</span>
      </div>
      <div className="text-[12px] text-[#6B7280] truncate">{itemNames}</div>
      <div className="mt-1 flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge label={order.status} variant={getStatusVariant(order.status)} />
          <span className={`inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full border ${
            isDineIn
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : isDelivery
              ? 'bg-purple-50 text-purple-800 border-purple-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            {isDineIn ? `🍽️ Table ${order.tableId || 'Dine In'}` : isDelivery ? '🛵 Delivery' : '🥡 Takeaway'}
          </span>
          <span className={`inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full border ${
            isOnlinePay
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-green-50 text-green-800 border-green-200'
          }`}>
            {isOnlinePay ? '💳 Online' : '💵 Cash'}
          </span>

          {/* Positive Count-Up Running Timer - STRICTLY for Restaurant ONLY */}
          {effectiveCategory === 'restaurant' && timerInfo?.type === 'running' && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${
              timerInfo.isDelayed
                ? `bg-red-100 text-red-800 border-red-300 ${timerInfo.isCapped ? '' : 'animate-pulse'}`
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              <Clock className="w-3 h-3 text-current" />
              <span>⏱️ {timerInfo.label}</span>
            </span>
          )}

          {/* Frozen Recorded Prep Duration - STRICTLY for Restaurant ONLY */}
          {effectiveCategory === 'restaurant' && timerInfo?.type === 'completed' && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${
              timerInfo.isDelayed
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              <CheckCircle2 className="w-3 h-3 text-current" />
              <span>✅ Prep: {timerInfo.label}</span>
            </span>
          )}

          {/* Salon Appointment Badge in List */}
          {(order.appointmentDetails || effectiveCategory === 'salon') && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
              <span>📅 {order.appointmentDetails?.bookingDate || 'Booking'} {order.appointmentDetails?.bookingTime ? `• ${order.appointmentDetails.bookingTime}` : ''}</span>
            </span>
          )}

          {order.whatsapp_notified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <MessageSquare className="w-3 h-3 text-emerald-600" />
              <span>Notified</span>
            </span>
          )}

          {order.status === 'cancelled' && order.rejectionReason && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              <ShieldAlert className="w-3 h-3 text-red-600 shrink-0" />
              <span className="truncate max-w-[140px]">Audit: {order.rejectionReason}</span>
            </span>
          )}
        </div>

        {/* Quick inline action buttons on the card */}
        {onStatusChange && canMarkReady && (
          <button
            type="button"
            disabled={isActionLoading}
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(order._id, 'ready');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-[11px] font-black rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-3 h-3 text-amber-200" />
            <span>{isActionLoading ? 'Saving...' : '⚡ Mark Ready'}</span>
          </button>
        )}

        {onStatusChange && canComplete && (
          <button
            type="button"
            disabled={isActionLoading}
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(order._id, 'completed');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-900 hover:bg-gray-800 active:scale-95 disabled:opacity-50 text-white text-[11px] font-black rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{isActionLoading ? 'Saving...' : '✓ Complete'}</span>
          </button>
        )}
      </div>
    </div>
  );
});

