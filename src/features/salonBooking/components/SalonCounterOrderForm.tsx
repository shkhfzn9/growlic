'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { getMenuItems } from '@/actions/menu';
import { getRestaurantDetails } from '@/actions/auth';
import { createCounterOrderAction } from '@/actions/orders';
import { isValidPhoneNumber, generateWhatsAppOrderLink } from '@/lib/whatsappService';
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Search,
  Scissors,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  User,
  Calendar,
  MessageSquare,
  CreditCard,
  Banknote,
  ShieldCheck,
  Tag,
  MapPin,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { DEFAULT_SPECIALISTS, SALON_TIME_SLOTS } from '../service';
import { getVocabulary } from '@/config/businessVocabulary';
import { getCachedPosMenu, setCachedPosMenu, prependOrderToCache } from '@/features/order/services/orderClientCache';

interface ServiceItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  available?: boolean;
}

interface ServiceCartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export default function SalonCounterOrderForm() {
  const router = useRouter();
  const auth = useSelector((state: RootState) => state.auth);

  // Pre-cached POS data for 0ms mount
  const cachedPos = getCachedPosMenu();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [serviceDate, setServiceDate] = useState(todayStr);
  const [serviceTimeSlot, setServiceTimeSlot] = useState('Immediate Walk-in');
  const [specialistName, setSpecialistName] = useState('Any Available Specialist');
  const [customSpecialist, setCustomSpecialist] = useState('');
  const [stationId, setStationId] = useState('Station 1');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online' | 'credit'>('cash');
  const [startImmediately, setStartImmediately] = useState(true);
  const [notes, setNotes] = useState('');

  // Mobile navigation tab
  const [activeMobileTab, setActiveMobileTab] = useState<'services' | 'ticket'>('services');

  // Services Catalog & Cart State
  const [services, setServices] = useState<ServiceItem[]>(cachedPos?.items || []);
  const [cart, setCart] = useState<ServiceCartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [salonName, setSalonName] = useState(
    cachedPos?.details?.restaurantName ||
    cachedPos?.details?.name ||
    auth.restaurantName ||
    'Salon & Spa'
  );

  const [loading, setLoading] = useState(!cachedPos);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successBooking, setSuccessBooking] = useState<any | null>(null);

  // Load salon services & profile
  useEffect(() => {
    if (!auth.restaurantId) return;

    Promise.all([
      getMenuItems(auth.restaurantId),
      getRestaurantDetails(),
    ])
      .then(([items, details]) => {
        setServices(items || []);
        const resolvedName = details?.restaurantName || details?.name || auth.restaurantName;
        if (resolvedName) {
          setSalonName(resolvedName);
        }
        setCachedPosMenu(items || [], details);
      })
      .catch((err) => {
        console.error('Failed to load salon services:', err);
        if (!cachedPos) {
          setError('Failed to load services. Please refresh the page.');
        }
      })
      .finally(() => setLoading(false));
  }, [auth.restaurantId]);

  const vocab = getVocabulary('salon');

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [services]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [services, searchQuery, selectedCategory]);

  // Ticket totals
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const total = subtotal;

  const totalServiceCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Cart Handlers
  const handleAddToCart = (service: ServiceItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === service._id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === service._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: service._id,
          name: service.name,
          price: service.price,
          quantity: 1,
          image: service.image,
        },
      ];
    });
  };

  const handleUpdateQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.menuItemId === menuItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as ServiceCartItem[];
    });
  };

  const handleRemoveFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((item) => item.menuItemId !== menuItemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Submit Handler
  const handleSubmitBooking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    const rawPhone = customerPhone.trim();
    if (!rawPhone) {
      setActiveMobileTab('ticket');
      setError('Client phone number is required for booking confirmation & WhatsApp receipt.');
      return;
    }
    if (!isValidPhoneNumber(rawPhone)) {
      setActiveMobileTab('ticket');
      setError('Please provide a valid 10-15 digit phone number (e.g. 9876543210).');
      return;
    }

    if (cart.length === 0) {
      setActiveMobileTab('services');
      setError('Please add at least one service to the booking ticket.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const finalSpecialist = specialistName === 'custom'
        ? (customSpecialist.trim() || 'Assigned Stylist')
        : specialistName;

      const appointmentDetails = {
        bookingDate: serviceDate,
        bookingTime: serviceTimeSlot === 'Immediate Walk-in' ? 'Walk-in Now' : serviceTimeSlot,
        specialistName: finalSpecialist,
        userNotes: notes.trim() || undefined,
      };

      const payload = {
        customerPhone: rawPhone,
        customerName: customerName.trim() || 'Walk-in Client',
        orderType,
        paymentMode,
        tableId: stationId.trim() || 'Station 1',
        items: cart.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
        })),
        notes: notes.trim() || undefined,
        appointmentDetails,
        initialStatus: startImmediately ? ('in_progress' as const) : ('confirmed' as const),
      };

      const res = await createCounterOrderAction(payload);
      if (res.success && res.order) {
        setSuccessBooking(res.order);
        prependOrderToCache(res.order);

        // Reset form for next client
        setCart([]);
        setCustomerPhone('');
        setCustomerName('');
        setNotes('');
        setStationId('Station 1');
        setActiveMobileTab('services');
      }
    } catch (err) {
      console.error('Failed to create walk-in salon booking:', err);
      const msg = err instanceof Error ? err.message : 'Failed to register walk-in booking';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto pb-28 lg:pb-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <Link
            href="/admin/appointments"
            className="w-10 h-10 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-8 w-48 bg-purple-100 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="lg:col-span-2 h-96 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3" />
          <div className="h-96 bg-white border border-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto pb-28 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/appointments"
            className="w-10 h-10 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Back to Bookings"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>Walk-in Client Booking</span>
              <span className="text-[11px] font-extrabold uppercase bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full">
                Salon POS
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Log walk-in client services at reception, assign stylist, set station, and issue instant WhatsApp receipts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/appointments"
            className="text-xs font-bold text-purple-700 hover:text-purple-900 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
          >
            Schedule & Bookings
          </Link>
          <Link
            href="/admin/orders"
            className="text-xs font-bold text-gray-600 hover:text-gray-900 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            All Orders
          </Link>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successBooking && (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sm text-purple-950 flex items-center gap-2">
                <span>Walk-in Booking #{successBooking._id.slice(-6).toUpperCase()} Registered!</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900 uppercase">
                  {successBooking.status === 'preparing' ? '⚡ In-Service' : 'Confirmed'}
                </span>
              </h4>
              <p className="text-xs text-purple-900 font-medium mt-0.5">
                Total: ₹{successBooking.total} • Client: {successBooking.customerName} ({successBooking.customerPhone}) • Stylist: {successBooking.appointmentDetails?.specialistName || 'Any Specialist'} • {successBooking.tableId ? `Station: ${successBooking.tableId}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={generateWhatsAppOrderLink({
                type: 'confirmed',
                phone: successBooking.customerPhone,
                customerName: successBooking.customerName,
                orderId: successBooking._id,
                orderNumber: (successBooking as any).orderNumber,
                restaurantName: salonName || 'Salon & Spa',
                total: successBooking.total,
                items: successBooking.items,
                businessCategory: 'salon',
                appointmentDetails: successBooking.appointmentDetails,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Booking Card</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
            <button
              type="button"
              onClick={() => setSuccessBooking(null)}
              className="px-3 py-2 text-xs font-bold text-purple-800 hover:text-purple-950 hover:bg-purple-100 rounded-xl transition-colors"
            >
              Next Client
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl p-4 flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mobile View Switcher */}
      <div className="lg:hidden flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveMobileTab('services')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'services'
              ? 'bg-white text-purple-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Scissors className="w-4 h-4 text-purple-600" />
          <span>1. Services ({filteredServices.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMobileTab('ticket')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 relative ${
            activeMobileTab === 'ticket'
              ? 'bg-white text-purple-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <User className="w-4 h-4 text-purple-600" />
          <span>2. Client & Appointment</span>
          {totalServiceCount > 0 && (
            <span className="bg-purple-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
              {totalServiceCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Grid: Services Catalog & Booking Ticket */}
      <form onSubmit={handleSubmitBooking} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Services Catalog */}
        <div className={`lg:col-span-7 xl:col-span-8 flex flex-col gap-4 ${
          activeMobileTab === 'services' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Search & Categories */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search services (e.g. Haircut, Facial, Keratin Spa, Manicure)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-600 outline-none transition-all"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Services ({services.length})
              </button>

              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Service Cards Grid */}
          {filteredServices.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-2">
              <Scissors className="w-8 h-8 text-gray-300" />
              <p className="text-sm font-bold text-gray-700">No salon services found</p>
              <p className="text-xs text-gray-400">
                {searchQuery ? 'Try matching another service name or clear the search query.' : 'Add services in the Service Catalog to start booking.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs font-extrabold text-purple-600 hover:text-purple-700 underline"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredServices.map((service) => {
                const inCart = cart.find((i) => i.menuItemId === service._id);
                return (
                  <div
                    key={service._id}
                    className={`bg-white border rounded-2xl p-3.5 flex flex-col justify-between gap-3 transition-all ${
                      inCart
                        ? 'border-purple-500 shadow-sm ring-1 ring-purple-500/20'
                        : 'border-gray-200 hover:border-purple-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm text-gray-900 leading-snug">
                          {service.name}
                        </h4>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 shrink-0">
                          {service.category || 'Service'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-2.5">
                      <span className="text-base font-black text-gray-900">
                        ₹{service.price}
                      </span>

                      {inCart ? (
                        <div className="flex items-center gap-1.5 bg-purple-700 text-white rounded-xl p-1 shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(service._id, -1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-purple-800 text-purple-100 transition-colors cursor-pointer"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-black text-xs text-white select-none">
                            {inCart.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(service)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-purple-800 text-purple-100 transition-colors cursor-pointer"
                            title="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(service)}
                          className="px-3.5 py-1.5 bg-gray-900 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Client & Appointment Ticket */}
        <div className={`lg:col-span-5 xl:col-span-4 flex flex-col gap-4 lg:sticky lg:top-6 ${
          activeMobileTab === 'ticket' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Mobile Back Banner */}
          <div className="lg:hidden flex items-center justify-between bg-purple-50 border border-purple-200 rounded-2xl p-3 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
              <span>Ticket:</span>
              <span className="font-extrabold text-purple-700">{totalServiceCount} {totalServiceCount === 1 ? 'service' : 'services'}</span>
              <span>•</span>
              <span className="font-extrabold text-gray-900">₹{total}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveMobileTab('services')}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>+ Add Services</span>
            </button>
          </div>

          {/* Client Details Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col gap-3.5">
            <h3 className="font-black text-xs uppercase tracking-wider text-purple-800 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Client Details</span>
            </h3>

            {/* Phone (Required) */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                <span>Client Phone *</span>
                <span className="text-[10px] text-gray-400 font-normal">(WhatsApp Receipt & Stamp Card)</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full text-xs font-bold pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-600 outline-none"
                />
              </div>
            </div>

            {/* Client Name */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-700">
                Client Name <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Walk-in Guest"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-600 outline-none"
              />
            </div>

            {/* Salon Station & Specialist Controls */}
            <div className="border-t border-gray-100 pt-3 flex flex-col gap-3">
              <h3 className="font-black text-xs uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5" />
                <span>Station & Specialist</span>
              </h3>

              {/* Station / Chair & Specialist Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Station / Chair #</label>
                  <select
                    value={stationId}
                    onChange={(e) => setStationId(e.target.value)}
                    className="w-full text-xs font-bold px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-600 outline-none cursor-pointer"
                  >
                    <option value="Station 1">🪑 Station 1</option>
                    <option value="Station 2">🪑 Station 2</option>
                    <option value="Station 3">🪑 Station 3</option>
                    <option value="VIP Room 1">✨ VIP Room 1</option>
                    <option value="Shampoo Bay">🧴 Shampoo Bay</option>
                    <option value="Spa Room">🌿 Spa Room</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Service Type</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as any)}
                    className="w-full text-xs font-bold px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-600 outline-none cursor-pointer"
                  >
                    <option value="dine_in">💇 In-Salon Service</option>
                    <option value="delivery">🏡 Home Visit Service</option>
                    <option value="takeaway">🥡 Walk-in Pickup</option>
                  </select>
                </div>
              </div>

              {/* Stylist Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Assigned Specialist / Stylist</label>
                <select
                  value={specialistName}
                  onChange={(e) => setSpecialistName(e.target.value)}
                  className="w-full text-xs font-bold px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-600 outline-none cursor-pointer"
                >
                  {DEFAULT_SPECIALISTS.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                  <option value="custom">✏️ Enter Specific Stylist Name...</option>
                </select>
                {specialistName === 'custom' && (
                  <input
                    type="text"
                    placeholder="Enter stylist name (e.g. Pooja, Rohit)"
                    value={customSpecialist}
                    onChange={(e) => setCustomSpecialist(e.target.value)}
                    className="mt-1 w-full text-xs font-semibold px-3 py-1.5 bg-gray-50 border border-purple-200 rounded-xl focus:bg-white focus:border-purple-600 outline-none"
                  />
                )}
              </div>

              {/* Date & Time Slot */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Booking Date</label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full text-xs font-bold px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-600 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Time Slot</label>
                  <select
                    value={serviceTimeSlot}
                    onChange={(e) => setServiceTimeSlot(e.target.value)}
                    className="w-full text-xs font-bold px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-600 outline-none cursor-pointer"
                  >
                    <option value="Immediate Walk-in">⚡ Immediate Walk-in</option>
                    {SALON_TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Method & Initial State */}
            <div className="border-t border-gray-100 pt-3 flex flex-col gap-2.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Payment Method</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMode('cash')}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMode === 'cash'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>💵 Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('online')}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMode === 'online'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>💳 Online / UPI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('credit')}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMode === 'credit'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>⏳ Credit / Udhar</span>
                </button>
              </div>

              {paymentMode === 'credit' && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                  <span className="text-sm">⏳</span>
                  <span className="text-[11px] font-medium leading-tight">
                    This appointment will be marked as <strong>Credit / Udhar (Pending Payment)</strong>. Settle it anytime from the bookings or orders dashboard.
                  </span>
                </div>
              )}

              {/* Service Start State Toggle */}
              <label className="flex items-center gap-2 cursor-pointer mt-1 bg-purple-50/70 p-2.5 rounded-xl border border-purple-200/80">
                <input
                  type="checkbox"
                  checked={startImmediately}
                  onChange={(e) => setStartImmediately(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-purple-950">
                  ⚡ Client is in the chair (Start Service / In-Progress)
                </span>
              </label>
            </div>

            {/* Client Notes / Hair & Skin Preferences */}
            <div className="flex flex-col gap-1 border-t border-gray-100 pt-3">
              <label className="text-[11px] font-bold text-gray-700">
                Stylist Notes / Allergies <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Sensitive skin, prefer organic serum, requested low-heat blowdry..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-600 outline-none resize-none"
              />
            </div>
          </div>

          {/* Ticket Summary & Place Booking */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">
                Booking Summary ({totalServiceCount})
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-[11px] text-red-600 hover:text-red-700 font-bold cursor-pointer"
                >
                  Clear Ticket
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4 italic">
                No services added yet. Click &quot;Add&quot; on services in the left catalog.
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.menuItemId} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-purple-700">{item.quantity}×</span>
                      <span className="font-semibold text-gray-800">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">₹{item.price * item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.menuItemId)}
                        className="text-gray-400 hover:text-red-600 p-0.5"
                        title="Remove service"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-900 pt-3 flex items-center justify-between">
              <span className="font-black text-sm text-gray-900">Total Payable</span>
              <span className="font-black text-xl text-gray-950">₹{total}</span>
            </div>

            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 active:scale-95 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              <Scissors className="w-4 h-4 text-purple-200" />
              <span>{submitting ? 'Registering Booking...' : '⚡ Place Walk-in Booking'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
