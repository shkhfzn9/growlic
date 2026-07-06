'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { getAdminOrders, updateOrderStatus, updateOrderEstimatedTime, getPendingStaffCallsAction, resolveStaffCallAction } from '@/actions/orders';
import { BellRing, VolumeX, Volume2, AlertCircle } from 'lucide-react';
import { AdminButton } from '../ui';
import { usePathname, useRouter } from 'next/navigation';

interface Order {
  _id: string;
  restaurantId: string;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{ name: string; quantity: number }>;
  total: number;
  status: 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

interface OrderNotificationContextType {
  activeAlertOrders: Order[];
  acknowledgeOrder: (orderId: string) => void;
  stopAllAlerts: () => void;
  audioUnlocked: boolean;
}

const OrderNotificationContext = createContext<OrderNotificationContextType>({
  activeAlertOrders: [],
  acknowledgeOrder: () => {},
  stopAllAlerts: () => {},
  audioUnlocked: false,
});

export const useOrderNotification = () => useContext(OrderNotificationContext);

export default function OrderNotificationProvider({ children }: { children: React.ReactNode }) {
  const auth = useSelector((state: RootState) => state.auth);
  const pathname = usePathname();
  const router = useRouter();
  const isAdminRoute = pathname ? pathname.startsWith('/admin') : false;

  const [activeAlertOrders, setActiveAlertOrders] = useState<Order[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);

  const [activeStaffCalls, setActiveStaffCalls] = useState<any[]>([]);
  const [acknowledgedCallIds, setAcknowledgedCallIds] = useState<string[]>([]);

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthIntervalRef = useRef<any>(null);
  const intervalId = useRef<any>(null);
  const lastCheckedAt = useRef<number>(0);

  const unlockAudio = useCallback(() => {
    // 1. Try unlocking Audio Element
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => {
          audioRef.current?.pause();
          setAudioUnlocked(true);
          console.log('[Alert] HTML5 Audio playback unlocked successfully.');
        })
        .catch((err) => {
          console.log('[Alert] HTML5 Audio unlock blocked or failed:', err.message);
        });
    }

    // 2. Try unlocking Web Audio API Context (synthesizer fallback)
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().then(() => {
            setAudioUnlocked(true);
            console.log('[Alert] Web Audio API context resumed successfully.');
          });
        } else {
          setAudioUnlocked(true);
        }
      }
    } catch (e) {
      console.error('[Alert] Web Audio API init failed:', e);
    }

    // Remove window event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    }
  }, []);

  // Initialize acknowledged IDs list from localStorage
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('growlic_acknowledged_orders');
      if (stored) {
        try {
          setAcknowledgedIds(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse acknowledged order IDs from localStorage:', e);
        }
      }
      const storedCalls = localStorage.getItem('growlic_acknowledged_calls');
      if (storedCalls) {
        try {
          setAcknowledgedCallIds(JSON.parse(storedCalls));
        } catch (e) {
          console.error('Failed to parse acknowledged call IDs from localStorage:', e);
        }
      }
    }
  }, []);

  // Sync acknowledged IDs list to localStorage
  const saveAcknowledgedIds = (ids: string[]) => {
    setAcknowledgedIds(ids);
    if (typeof window !== 'undefined') {
      localStorage.setItem('growlic_acknowledged_orders', JSON.stringify(ids));
    }
  };

  // Preload Audio and Handle Autoplay/User Interaction Unlock
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize Audio element pointing to bell sound
    const audio = new Audio('/sounds/mixkit-church-bell-calling-603.wav');
    audio.preload = 'auto';
    audio.loop = true;
    audioRef.current = audio;

    // Track audio loading errors to fall back to synthesizer
    audio.addEventListener('error', () => {
      console.warn('[Alert] Failed to load mixkit-church-bell-calling-603.wav. Falling back to Web Audio API synthesis.');
      setAudioError(true);
    });

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (synthIntervalRef.current) {
        clearInterval(synthIntervalRef.current);
      }
    };
  }, []);

  // Web Audio API Synthesizer Fallback - Beeps like a kitchen timer
  const playSynthesizedBeep = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'suspended') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // 880Hz (high pitch chime)
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Fade-in / Fade-out envelope
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error('[Alert] Sound synthesis error:', e);
    }
  };

  // Loop Audio playback or trigger synthesis based on active alert status
  useEffect(() => {
    const hasUnacknowledgedOrders = activeAlertOrders.length > 0;
    const hasUnacknowledgedCalls = activeStaffCalls.length > 0;
    const shouldPlay = (hasUnacknowledgedOrders || hasUnacknowledgedCalls) && isAdminRoute;

    if (shouldPlay && audioUnlocked) {
      if (audioError) {
        // Fallback: trigger repeating beep synthesized sound every 1.5s
        if (!synthIntervalRef.current) {
          playSynthesizedBeep();
          synthIntervalRef.current = setInterval(playSynthesizedBeep, 1500);
        }
      } else if (audioRef.current) {
        // Main: play WAV loop
        audioRef.current.play().catch((err) => {
          console.warn('[Alert] Playback failed. User gesture may still be required:', err.message);
          // If HTMLAudio throws, attempt synthesis trigger
          playSynthesizedBeep();
        });
      }
    } else {
      // Silence the alarm
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (synthIntervalRef.current) {
        clearInterval(synthIntervalRef.current);
        synthIntervalRef.current = null;
      }
    }
  }, [activeAlertOrders, activeStaffCalls, audioUnlocked, audioError, isAdminRoute]);

  // Polling mechanism to check for incoming orders and staff calls
  useEffect(() => {
    if (!auth.isLoggedIn || !auth.restaurantId || !isAdminRoute) {
      // Clear alert state if logged out or not on admin route
      setActiveAlertOrders([]);
      setActiveStaffCalls([]);
      return;
    }

    const checkIncomingOrdersAndCalls = async () => {
      const timestamp = Date.now();
      // Throttle manual trigger checks to at most once per 5 seconds
      if (!intervalId.current && timestamp - lastCheckedAt.current < 5000) {
        return;
      }
      lastCheckedAt.current = timestamp;

      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      try {
        // Fetch received orders and pending staff calls in parallel
        const [ordersResult, staffCallsResult] = await Promise.all([
          getAdminOrders(50, 0, 'received'),
          getPendingStaffCallsAction(auth.restaurantId || ''),
        ]);

        const incomingOrders: Order[] = ordersResult.orders || [];
        const incomingCalls: any[] = staffCallsResult || [];

        // Filter out orders/calls that have already been acknowledged
        const unacknowledged = incomingOrders.filter(
          (order) => order.status === 'received' && !acknowledgedIds.includes(order._id)
        );
        const unacknowledgedCalls = incomingCalls.filter(
          (call) => call.status === 'pending' && !acknowledgedCallIds.includes(call._id)
        );

        setActiveAlertOrders(unacknowledged);
        setActiveStaffCalls(unacknowledgedCalls);

        const totalUnacknowledged = unacknowledged.length + unacknowledgedCalls.length;

        // Dynamic polling interval:
        // - If we have active alerts, poll fast (5s) to keep alerts responsive.
        // - If there are zero received alerts, clear interval entirely (0 background requests).
        if (totalUnacknowledged > 0) {
          if (!intervalId.current) {
            intervalId.current = setInterval(checkIncomingOrdersAndCalls, 5000);
          }
        } else {
          if (intervalId.current) {
            clearInterval(intervalId.current);
            intervalId.current = null;
          }
        }
      } catch (err) {
        console.error('[Alert] Error polling new orders and staff calls:', err);
      }
    };

    // Run first check immediately
    checkIncomingOrdersAndCalls();

    // Trigger single check on window focus/click to wake up interval
    const handleActivity = () => {
      checkIncomingOrdersAndCalls();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleActivity);
      window.addEventListener('click', handleActivity);
    }

    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleActivity);
        window.removeEventListener('click', handleActivity);
      }
    };
  }, [auth.isLoggedIn, auth.restaurantId, acknowledgedIds, acknowledgedCallIds, isAdminRoute]);

  // Stop alert for a specific order (Add to acknowledged lists)
  const acknowledgeOrder = (orderId: string) => {
    if (!acknowledgedIds.includes(orderId)) {
      const updated = [...acknowledgedIds, orderId];
      saveAcknowledgedIds(updated);
      setActiveAlertOrders((prev) => prev.filter((o) => o._id !== orderId));
    }
  };

  // Stop all active ringing alerts (Acknowledge all current ones)
  const stopAllAlerts = () => {
    const activeIds = activeAlertOrders.map((o) => o._id);
    const updated = [...acknowledgedIds, ...activeIds.filter((id) => !acknowledgedIds.includes(id))];
    saveAcknowledgedIds(updated);
    setActiveAlertOrders([]);
  };

  const handleAccept = async (orderId: string) => {
    const selectEl = document.getElementById(`eta-${orderId}`) as HTMLSelectElement | null;
    const minutes = selectEl ? parseInt(selectEl.value, 10) : 20;

    setActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      await updateOrderEstimatedTime(orderId, minutes);
      acknowledgeOrder(orderId);
      router.push(`/admin/orders?highlight=${orderId}`);
    } catch (err) {
      console.error('Failed to accept order:', err);
      alert('Failed to accept order');
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleReject = async (orderId: string) => {
    if (confirm('Are you sure you want to reject this order?')) {
      setActionLoading((prev) => ({ ...prev, [orderId]: true }));
      try {
        await updateOrderStatus(orderId, 'cancelled');
        acknowledgeOrder(orderId);
      } catch (err) {
        console.error('Failed to reject order:', err);
        alert('Failed to reject order');
      } finally {
        setActionLoading((prev) => ({ ...prev, [orderId]: false }));
      }
    }
  };

  return (
    <OrderNotificationContext.Provider
      value={{
        activeAlertOrders,
        acknowledgeOrder,
        stopAllAlerts,
        audioUnlocked,
      }}
    >
      {children}

      {/* 1. Global Interactivity Warning Banner */}
      {mounted && !audioUnlocked && auth.isLoggedIn && isAdminRoute && (
        <div 
          onClick={unlockAudio}
          onTouchStart={unlockAudio}
          className="fixed top-4 right-4 left-4 md:left-auto md:max-w-sm bg-[#FFFBEB] border border-[#D97706]/20 rounded-xl p-3 shadow-lg z-50 flex items-center justify-between gap-2.5 animate-bounce cursor-pointer hover:bg-[#FFFDF5] active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <AlertCircle className="w-5 h-5 text-[#D97706] flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-[#D97706]">Sound Alerts Suspended</p>
              <p className="text-[10px] text-[#D97706]/80 mt-0.5 truncate">Tap here or click anywhere to activate chimes.</p>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              unlockAudio();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              unlockAudio();
            }}
            className="px-2.5 py-1 text-[10px] font-bold bg-[#D97706] hover:bg-[#B45309] text-white rounded-lg transition-colors flex-shrink-0"
          >
            Enable
          </button>
        </div>
      )}

      {/* 2. Floating Kitchen Alert Modal */}
      {mounted && activeAlertOrders.length > 0 && isAdminRoute && (
        <div className="fixed top-20 right-6 left-6 md:left-auto md:max-w-xl bg-[#FEF2F2] border-2 border-[#C0181A] rounded-xl p-5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex gap-3 items-start">
            <div className="bg-[#C0181A] p-2.5 rounded-lg text-white animate-pulse flex-shrink-0">
              <BellRing className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-black text-[#C0181A] uppercase tracking-wide">
                Incoming Order Notification!
              </h3>
              <p className="text-xs text-[#374151] mt-1 font-medium">
                {activeAlertOrders.length === 1
                  ? `New order from Table ${activeAlertOrders[0].tableId || 'Takeaway'} - Total: ₹${activeAlertOrders[0].total}`
                  : `You have ${activeAlertOrders.length} unacknowledged new orders.`}
              </p>

              {/* Scrollable list of active orders */}
              <div className="flex flex-col gap-2.5 mt-3 max-h-[60vh] overflow-y-auto pr-1">
                {activeAlertOrders.map((order) => {
                  const itemsSummary = order.items.map((i) => `${i.name} (${i.quantity}x)`).join(', ');
                  const isLoading = actionLoading[order._id];
                  return (
                    <div key={order._id} className="bg-white border border-[#C0181A]/20 rounded-lg p-3 flex flex-col justify-between gap-3 shadow-sm">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-1.5">
                          <span className="text-xs font-bold text-[#111827]">
                            Table {order.tableId || 'Takeaway'} ({order.customerName || 'Guest'})
                          </span>
                          <span className="text-xs font-black text-[#C0181A]">₹{order.total}</span>
                        </div>
                        <span className="text-[11px] text-[#4B5563] block font-medium mb-1.5" title={itemsSummary}>
                          {itemsSummary}
                        </span>
                        {order.notes && (
                          <div className="mt-2.5 p-2.5 bg-red-50/70 border border-red-100 rounded-lg text-[10px] text-[#C0181A] font-semibold leading-relaxed">
                            <span className="font-extrabold uppercase block tracking-wider text-[8px] mb-0.5">Chef Note:</span>
                            <p className="italic">"{order.notes}"</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 justify-between sm:justify-start w-full sm:w-auto pt-2 sm:pt-0 border-t border-dashed border-gray-100 sm:border-0">
                        <select
                          id={`eta-${order._id}`}
                          disabled={isLoading}
                          className="bg-white border border-[#E2E6EA] hover:border-[#C0181A]/30 rounded text-[10px] px-2 py-1 font-bold text-[#374151] outline-none disabled:opacity-50 transition-all cursor-pointer flex-1 sm:flex-none"
                        >
                          <option value="15">15 Min</option>
                          <option value="20">20 Min</option>
                          <option value="30">30 Min</option>
                          <option value="45">45 Min</option>
                          <option value="60">60 Min</option>
                        </select>
                        <button
                          disabled={isLoading}
                          onClick={() => handleAccept(order._id)}
                          className="px-3 py-1 text-[10px] font-bold bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 transition-all flex-1 sm:flex-none"
                        >
                          {isLoading ? '...' : 'Accept'}
                        </button>
                        <button
                          disabled={isLoading}
                          onClick={() => handleReject(order._id)}
                          className="px-3 py-1 text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 transition-all flex-1 sm:flex-none"
                        >
                          {isLoading ? '...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Floating Staff Call Alert Modal */}
      {mounted && activeStaffCalls.length > 0 && isAdminRoute && (
        <div className="fixed bottom-24 right-6 left-6 md:left-auto md:max-w-md bg-[#FFFBEB] border-2 border-[#D97706] rounded-xl p-5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex gap-3 items-start">
            <div className="bg-[#D97706] p-2.5 rounded-lg text-white animate-pulse flex-shrink-0">
              <BellRing className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-black text-[#D97706] uppercase tracking-wide">
                Customer Calling Staff!
              </h3>
              <p className="text-xs text-[#374151] mt-1 font-semibold">
                {activeStaffCalls.length === 1
                  ? `Customer at Table ${activeStaffCalls[0].tableId} is requesting assistance.`
                  : `${activeStaffCalls.length} tables are calling for assistance.`}
              </p>

              <div className="flex flex-col gap-2 mt-3 max-h-36 overflow-y-auto pr-1">
                {activeStaffCalls.map((call) => {
                  const isCallLoading = actionLoading[call._id];
                  return (
                    <div key={call._id} className="bg-white border border-[#D97706]/20 rounded-lg p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-[#111827] block">
                          Table {call.tableId}
                        </span>
                        <span className="text-[10px] text-[#6B7280] block">
                          Needs assistance
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          disabled={isCallLoading}
                          onClick={async () => {
                            setActionLoading((prev) => ({ ...prev, [call._id]: true }));
                            try {
                              await resolveStaffCallAction(call._id, 'accepted');
                              setAcknowledgedCallIds((prev) => {
                                const updated = [...prev, call._id];
                                localStorage.setItem('growlic_acknowledged_calls', JSON.stringify(updated));
                                return updated;
                              });
                              setActiveStaffCalls((prev) => prev.filter((c) => c._id !== call._id));
                            } catch (err) {
                              console.error('Failed to accept staff call:', err);
                            } finally {
                              setActionLoading((prev) => ({ ...prev, [call._id]: false }));
                            }
                          }}
                          className="px-3 py-1.5 text-[10px] font-bold bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 transition-all"
                        >
                          Accept
                        </button>
                        <button
                          disabled={isCallLoading}
                          onClick={async () => {
                            if (confirm('Dismiss/Reject this call alert?')) {
                              setActionLoading((prev) => ({ ...prev, [call._id]: true }));
                              try {
                                await resolveStaffCallAction(call._id, 'rejected');
                                setAcknowledgedCallIds((prev) => {
                                  const updated = [...prev, call._id];
                                  localStorage.setItem('growlic_acknowledged_calls', JSON.stringify(updated));
                                  return updated;
                                });
                                setActiveStaffCalls((prev) => prev.filter((c) => c._id !== call._id));
                              } catch (err) {
                                console.error('Failed to reject staff call:', err);
                              } finally {
                                setActionLoading((prev) => ({ ...prev, [call._id]: false }));
                              }
                            }
                          }}
                          className="px-3 py-1.5 text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </OrderNotificationContext.Provider>
  );
}
