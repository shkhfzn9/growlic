'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { PageHeader, StatusBadge, AdminButton, EmptyState } from '@/components/ui';
import {
  Calendar,
  Clock,
  UserCheck,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Scissors,
  Sparkles,
  Bell,
  Check,
  X,
  Loader2,
  MessageCircle,
  Plus,
} from 'lucide-react';
import { SalonAppointment, BookingStatus } from '../types';
import { generateWhatsAppOrderLink } from '@/lib/whatsappService';

export default function SalonAppointmentsPage() {
  const auth = useSelector((state: RootState) => state.auth);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState<string>('');
  const [statusTab, setStatusTab] = useState<string>('all');
  const [appointments, setAppointments] = useState<SalonAppointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cooldownSec, setCooldownSec] = useState<number>(0);

  // 5-second cooldown timer interval
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  const fetchAppointments = async () => {
    if (!auth.restaurantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders`);
      const json = await res.json();
      const rawOrders = json.orders || json.data || [];
      if (json.success && Array.isArray(rawOrders)) {
        // Map raw orders to Salon appointments
        const mapped: SalonAppointment[] = rawOrders.map((order: any) => {
          let bookingDate = order.appointmentDetails?.bookingDate || order.createdAt?.split('T')[0] || todayStr;
          let bookingTime = order.appointmentDetails?.bookingTime || 'Scheduled Slot';
          let specialistName = order.appointmentDetails?.specialistName || 'Any Available Specialist';
          let userNotes = order.appointmentDetails?.userNotes || '';

          if (!order.appointmentDetails) {
            const notes: string = order.notes || '';
            notes.split('\n').forEach((line) => {
              if (line.includes('📅 Booking Date:')) bookingDate = line.replace('📅 Booking Date:', '').trim();
              else if (line.includes('⏰ Time Slot:')) bookingTime = line.replace('⏰ Time Slot:', '').trim();
              else if (line.includes('✂️ Specialist:')) specialistName = line.replace('✂️ Specialist:', '').trim();
              else if (line.includes('📝 Notes:')) userNotes = line.replace('📝 Notes:', '').trim();
            });
          }

          return {
            _id: order._id,
            restaurantId: order.restaurantId,
            orderNumber: order.orderNumber || 0,
            customerName: order.customerName || 'Client',
            customerPhone: order.customerPhone || '',
            bookingDate,
            bookingTime,
            specialistName,
            notes: userNotes,
            status: (order.status === 'completed'
              ? 'completed'
              : order.status === 'cancelled' || order.status === 'rejected'
              ? 'cancelled'
              : order.status === 'in_progress' || order.status === 'preparing'
              ? 'in_progress'
              : order.status === 'confirmed' || order.status === 'accepted' || order.status === 'ready'
              ? 'confirmed'
              : 'scheduled') as BookingStatus,
            items: (order.items || []).map((i: any) => ({
              id: i.menuItemId,
              name: i.name,
              price: i.price,
              quantity: i.quantity,
              category: 'Service',
            })),
            totalAmount: order.total || 0,
            createdAt: order.createdAt || new Date().toISOString(),
          };
        });

        setAppointments(mapped);
      }
    } catch (err) {
      console.error('Error loading salon appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [auth.restaurantId]);

  const handleManualRefresh = () => {
    if (cooldownSec > 0 || loading) return;
    setCooldownSec(5);
    fetchAppointments();
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        fetchAppointments();
      } else {
        alert(json.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Appointments awaiting admin accept/reject
  const pendingRequests = appointments.filter(
    (app) => app.status === 'scheduled' || (app.status as any) === 'received'
  );

  // Filter appointments according to selected tab
  const filtered = appointments.filter((app) => {
    if (filterDate && app.bookingDate !== filterDate) return false;
    if (statusTab === 'pending') return app.status === 'scheduled' || (app.status as any) === 'received';
    if (statusTab === 'confirmed') return app.status === 'confirmed' || app.status === 'in_progress';
    if (statusTab === 'completed') return app.status === 'completed';
    if (statusTab === 'cancelled') return app.status === 'cancelled';
    return true; // 'all'
  });

  const getStatusBadgeVariant = (st: BookingStatus) => {
    switch (st) {
      case 'completed': return 'success';
      case 'confirmed': return 'info';
      case 'in_progress': return 'warning';
      case 'cancelled': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Salon Bookings & Schedule Tracker"
        subtitle="Manage client appointments, scheduled time slots, and accept/reject booking requests"
        actions={
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/appointments/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 active:scale-95 rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>+ Walk-in Booking (POS)</span>
            </Link>
            <AdminButton
              variant="secondary"
              onClick={handleManualRefresh}
              disabled={loading || cooldownSec > 0}
              className="transition-all min-w-[170px]"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              {cooldownSec > 0 ? `REFRESH (${cooldownSec}s)` : 'REFRESH SCHEDULE'}
            </AdminButton>
          </div>
        }
      />

      {/* Pending Requests Alert Banner (if any) */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-amber-950">
                {pendingRequests.length} New Booking Request{pendingRequests.length > 1 ? 's' : ''} Awaiting Action
              </h4>
              <p className="text-xs text-amber-800 font-medium">
                Incoming appointments require manual Acceptance or Rejection before adding to schedule.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusTab('pending')}
            className="px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Review {pendingRequests.length} Request{pendingRequests.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Date & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E2E6EA] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-700 shrink-0" />
          <span className="text-xs font-bold uppercase text-gray-700">Booking Date:</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-purple-50 border border-purple-200 rounded-xl text-purple-950 outline-none focus:ring-2 focus:ring-purple-700/20 cursor-pointer"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="text-[11px] font-extrabold text-purple-700 hover:underline ml-1 cursor-pointer"
            >
              Show All Dates
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            {
              id: 'pending',
              label: `Pending Requests (${appointments.filter((a) => (!filterDate || a.bookingDate === filterDate) && a.status === 'scheduled').length})`,
              badge: appointments.filter((a) => (!filterDate || a.bookingDate === filterDate) && a.status === 'scheduled').length > 0,
            },
            {
              id: 'confirmed',
              label: `Confirmed Schedule (${appointments.filter((a) => (!filterDate || a.bookingDate === filterDate) && (a.status === 'confirmed' || a.status === 'in_progress')).length})`,
            },
            {
              id: 'completed',
              label: `Completed (${appointments.filter((a) => (!filterDate || a.bookingDate === filterDate) && a.status === 'completed').length})`,
            },
            {
              id: 'cancelled',
              label: `Cancelled / Rejected (${appointments.filter((a) => (!filterDate || a.bookingDate === filterDate) && a.status === 'cancelled').length})`,
            },
            {
              id: 'all',
              label: `All (${appointments.filter((a) => !filterDate || a.bookingDate === filterDate).length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                statusTab === tab.id
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Appointment Cards List */}
      {filtered.length === 0 ? (
        <EmptyState
          title={statusTab === 'pending' ? 'No Pending Requests' : 'No Appointments Found'}
          description={
            statusTab === 'pending'
              ? 'All incoming appointment requests have been processed.'
              : filterDate
              ? `No bookings found for date ${filterDate}.`
              : 'No appointments available for this status filter.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((app) => {
            const isPending = app.status === 'scheduled';

            return (
              <div
                key={app._id}
                className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4 transition-all ${
                  isPending
                    ? 'border-2 border-amber-400 bg-amber-50/20 hover:border-amber-500'
                    : 'border-[#E2E6EA] hover:border-purple-300'
                }`}
              >
                <div className="flex flex-col gap-3">
                  {/* Header Badge */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900">#Booking-{app.orderNumber || app._id.slice(-4)}</span>
                      <StatusBadge
                        label={isPending ? 'PENDING APPROVAL' : app.status.toUpperCase()}
                        variant={isPending ? 'warning' : getStatusBadgeVariant(app.status)}
                      />
                    </div>
                    <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-purple-100 text-purple-900 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-700" />
                      <span>{app.bookingTime}</span>
                    </span>
                  </div>

                  {/* Client Info */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-800">Client Details</span>
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-base text-gray-900 leading-tight">{app.customerName}</h3>
                      <div className="flex items-center gap-2">
                        {app.customerPhone && (
                          <a
                            href={generateWhatsAppOrderLink({
                              type: app.status === 'confirmed' || app.status === 'in_progress' ? 'ready' : 'placed',
                              phone: app.customerPhone,
                              customerName: app.customerName,
                              orderId: app._id,
                              orderNumber: app.orderNumber,
                              restaurantName: auth.restaurantName || 'Salon',
                              total: app.totalAmount,
                              items: app.items,
                              businessCategory: 'salon',
                              appointmentDetails: {
                                bookingDate: app.bookingDate,
                                bookingTime: app.bookingTime,
                                specialistName: app.specialistName,
                                userNotes: app.notes,
                              },
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Send WhatsApp Booking Confirmation"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                        <a
                          href={`tel:${app.customerPhone}`}
                          className="text-xs font-extrabold text-purple-700 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{app.customerPhone}</span>
                        </a>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 font-semibold flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>Booking Date: {app.bookingDate}</span>
                    </span>
                  </div>

                  {/* Specialist & Notes */}
                  <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3 flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-purple-950">
                      <Scissors className="w-3.5 h-3.5 text-purple-700" />
                      <span>Stylist: {app.specialistName}</span>
                    </div>
                    {app.notes && (
                      <p className="text-[11px] text-purple-900 italic mt-0.5 leading-snug">
                        &ldquo;{app.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Booked Services */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Services Booked</span>
                    <div className="flex flex-col gap-1 bg-gray-50 rounded-xl p-3 border border-gray-100">
                      {app.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-semibold text-gray-800">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="font-extrabold text-gray-900">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-xs font-black text-purple-950 border-t border-gray-200/80 pt-1.5 mt-1">
                        <span>Total Amount</span>
                        <span className="text-sm font-extrabold text-purple-900">₹{app.totalAmount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Accept / Reject for Pending, Complete / Cancel for Confirmed */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#E2E6EA]">
                  {isPending ? (
                    <>
                      <button
                        disabled={updatingId === app._id}
                        onClick={() => handleStatusUpdate(app._id, 'confirmed')}
                        className={`flex-1 text-white text-xs font-extrabold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                          updatingId === app._id
                            ? 'bg-emerald-400 cursor-not-allowed opacity-90'
                            : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                        }`}
                      >
                        {updatingId === app._id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>ACCEPTING...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>ACCEPT BOOKING</span>
                          </>
                        )}
                      </button>

                      <button
                        disabled={updatingId === app._id}
                        onClick={() => handleStatusUpdate(app._id, 'cancelled')}
                        className={`px-3.5 py-2.5 text-red-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 border border-red-200 ${
                          updatingId === app._id
                            ? 'bg-red-100 opacity-80 cursor-not-allowed'
                            : 'bg-red-50 hover:bg-red-100 active:scale-95'
                        }`}
                      >
                        {updatingId === app._id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>REJECTING...</span>
                          </>
                        ) : (
                          <>
                            <X className="w-3.5 h-3.5" />
                            <span>REJECT</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      {app.status === 'confirmed' && (
                        <button
                          disabled={updatingId === app._id}
                          onClick={() => handleStatusUpdate(app._id, 'in_progress')}
                          className={`flex-1 text-purple-950 bg-purple-100 hover:bg-purple-200 text-xs font-extrabold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                            updatingId === app._id
                              ? 'opacity-80 cursor-not-allowed'
                              : 'active:scale-95'
                          }`}
                        >
                          {updatingId === app._id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>SEATING...</span>
                            </>
                          ) : (
                            <>
                              <Scissors className="w-3.5 h-3.5 text-purple-700" />
                              <span>Seat Client</span>
                            </>
                          )}
                        </button>
                      )}

                      {(app.status === 'confirmed' || app.status === 'in_progress') && (
                        <button
                          disabled={updatingId === app._id}
                          onClick={() => handleStatusUpdate(app._id, 'completed')}
                          className={`flex-1 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                            updatingId === app._id
                              ? 'bg-purple-950/70 cursor-not-allowed'
                              : 'bg-purple-900 hover:bg-black active:scale-95'
                          }`}
                        >
                          {updatingId === app._id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-300" />
                              <span>COMPLETING...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Mark Completed</span>
                            </>
                          )}
                        </button>
                      )}

                      {app.status !== 'cancelled' && app.status !== 'completed' && (
                        <button
                          disabled={updatingId === app._id}
                          onClick={() => handleStatusUpdate(app._id, 'cancelled')}
                          className={`px-3 py-2.5 text-red-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 border border-red-200 ${
                            updatingId === app._id
                              ? 'bg-red-100 opacity-80 cursor-not-allowed'
                              : 'bg-red-50 hover:bg-red-100 active:scale-95'
                          }`}
                        >
                          {updatingId === app._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>Cancel</span>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

