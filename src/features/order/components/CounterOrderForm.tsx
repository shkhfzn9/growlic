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
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  User,
  UtensilsCrossed,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

import { getVocabulary } from '@/config/businessVocabulary';
import { getCachedPosMenu, setCachedPosMenu, prependOrderToCache } from '../services/orderClientCache';

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  available?: boolean;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export default function CounterOrderForm() {
  const router = useRouter();
  const auth = useSelector((state: RootState) => state.auth);

  // Check if we have pre-cached POS data for 0ms mount
  const cachedPos = getCachedPosMenu();

  // Form State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState<'takeaway' | 'dine_in' | 'delivery'>('takeaway');
  const [tableId, setTableId] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online'>('cash');
  const [notes, setNotes] = useState('');
  const [businessCategory, setBusinessCategory] = useState<string>(
    cachedPos?.details?.businessCategory ||
    (cachedPos?.details?.themePreset === 'rose_quartz' || cachedPos?.details?.themePreset === 'velvet_noir' ? 'salon' :
     cachedPos?.details?.themePreset === 'carbon_crimson' || cachedPos?.details?.themePreset === 'cyber_cyan' ? 'detailing' : 'restaurant')
  );

  // Mobile / Small Screen Navigation Tab
  const [activeMobileTab, setActiveMobileTab] = useState<'menu' | 'ticket'>('menu');

  // Cart & Menu State
  const [menuItems, setMenuItems] = useState<MenuItem[]>(cachedPos?.items || []);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [restaurantName, setRestaurantName] = useState(
    cachedPos?.details?.restaurantName ||
    cachedPos?.details?.name ||
    auth.restaurantName ||
    'Restaurant'
  );

  // UI state: instant 0ms mount if cache is present
  const [loading, setLoading] = useState(!cachedPos);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  // Load menu items & store profile (syncs and updates cache)
  useEffect(() => {
    if (!auth.restaurantId) return;

    Promise.all([
      getMenuItems(auth.restaurantId),
      getRestaurantDetails(),
    ])
      .then(([items, details]) => {
        setMenuItems(items || []);
        const resolvedName = details?.restaurantName || details?.name || auth.restaurantName;
        if (resolvedName) {
          setRestaurantName(resolvedName);
        }
        if (details?.businessCategory) {
          setBusinessCategory(details.businessCategory);
        } else if (details?.themePreset === 'rose_quartz' || details?.themePreset === 'velvet_noir') {
          setBusinessCategory('salon');
        } else if (details?.themePreset === 'carbon_crimson' || details?.themePreset === 'cyber_cyan') {
          setBusinessCategory('detailing');
        }
        setCachedPosMenu(items || [], details);
      })
      .catch((err) => {
        console.error('Failed to load menu items:', err);
        if (!cachedPos) {
          setError('Failed to load menu items. Please refresh the page.');
        }
      })
      .finally(() => setLoading(false));
  }, [auth.restaurantId]);

  const vocab = getVocabulary(businessCategory);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [menuItems]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const total = subtotal;

  const totalItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Cart Handlers
  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item._id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: 1,
          image: item.image,
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
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((item) => item.menuItemId !== menuItemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Submit Handler
  const handleSubmitOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    // Validate Phone Number
    const rawPhone = customerPhone.trim();
    if (!rawPhone) {
      setActiveMobileTab('ticket');
      setError('Customer phone number is required for counter orders.');
      return;
    }
    if (!isValidPhoneNumber(rawPhone)) {
      setActiveMobileTab('ticket');
      setError('Please provide a valid 10-15 digit phone number (e.g. 9876543210).');
      return;
    }

    // Validate Cart
    if (cart.length === 0) {
      setActiveMobileTab('menu');
      setError('Please add at least one item to the order ticket.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        customerPhone: rawPhone,
        customerName: customerName.trim() || 'Walk-in Customer',
        orderType,
        paymentMode,
        tableId: orderType === 'dine_in' ? (tableId.trim() || undefined) : undefined,
        items: cart.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
        })),
        notes: notes.trim() || undefined,
      };

      const res = await createCounterOrderAction(payload);
      if (res.success && res.order) {
        setSuccessOrder(res.order);
        prependOrderToCache(res.order);
        // Reset form inputs for next order
        setCart([]);
        setCustomerPhone('');
        setCustomerName('');
        setNotes('');
        setTableId('');
        setActiveMobileTab('menu');
      }
    } catch (err) {
      console.error('Failed to create counter order:', err);
      const msg = err instanceof Error ? err.message : 'Failed to place order';
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
            href="/admin/orders?tab=counter"
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="lg:col-span-2 h-96 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="h-10 bg-gray-100 rounded-xl" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="h-28 bg-gray-100 rounded-xl" />
              <div className="h-28 bg-gray-100 rounded-xl" />
              <div className="h-28 bg-gray-100 rounded-xl" />
            </div>
          </div>
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
            href="/admin/orders?tab=counter"
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>Add Walk-in Counter Order</span>
              <span className="text-[11px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full">
                POS Entry
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Take customer orders verbally at the counter, select items, and log directly into the database.
            </p>
          </div>
        </div>

        <Link
          href="/admin/orders?tab=counter"
          className="text-xs font-bold text-gray-600 hover:text-gray-900 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors self-start sm:self-auto"
        >
          View Counter Orders Tab
        </Link>
      </div>

      {/* Success Notification Alert */}
      {successOrder && (
        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sm text-emerald-950">
                Order #{successOrder._id.slice(-6).toUpperCase()} Placed Successfully!
              </h4>
              <p className="text-xs text-emerald-800 font-medium mt-0.5">
                Total: ₹{successOrder.total} • Status: Received • Customer: {successOrder.customerName} ({successOrder.customerPhone})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={generateWhatsAppOrderLink({
                type: 'placed',
                phone: successOrder.customerPhone,
                customerName: successOrder.customerName,
                orderId: successOrder._id,
                restaurantName: restaurantName || auth.restaurantName || 'Restaurant',
                total: successOrder.total,
                items: successOrder.items,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Receipt</span>
            </a>
            <button
              type="button"
              onClick={() => setSuccessOrder(null)}
              className="px-3 py-2 text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              Dismiss
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

      {/* Mobile / Small Screen Segmented View Switcher */}
      <div className="lg:hidden flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveMobileTab('menu')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'menu'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-red-600" />
          <span>1. Items ({filteredItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMobileTab('ticket')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 relative ${
            activeMobileTab === 'ticket'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <User className="w-4 h-4 text-red-600" />
          <span>2. Customer & Ticket</span>
          {totalItemCount > 0 && (
            <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
              {totalItemCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Form & Menu Grid */}
      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Menu Picker & Items (8 Columns on desktop, toggled on mobile) */}
        <div className={`lg:col-span-7 xl:col-span-8 flex flex-col gap-4 ${
          activeMobileTab === 'menu' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Search & Category Filter */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${vocab.itemsNoun.toLowerCase()} or categories...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-red-600 outline-none transition-all"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Items ({menuItems.length})
              </button>
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-colors capitalize ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[65vh] sm:max-h-[580px] lg:max-h-[640px] overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const inCart = cart.find((i) => i.menuItemId === item._id);
              return (
                <div
                  key={item._id}
                  className={`bg-white border rounded-2xl p-3 flex flex-col justify-between gap-3 shadow-xs hover:border-red-400 transition-all ${
                    inCart ? 'border-red-400 ring-1 ring-red-400/30' : 'border-gray-200'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        {item.category}
                      </span>
                      {inCart && (
                        <span className="text-[10px] font-black bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                          {inCart.quantity} in ticket
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-xs text-gray-900 mt-1 leading-snug line-clamp-2">
                      {item.name}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="font-black text-sm text-red-600">₹{item.price}</span>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      className="px-3 py-1.5 bg-gray-900 hover:bg-red-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Customer Details & Order Ticket (4-5 Columns on desktop, toggled on mobile) */}
        <div className={`lg:col-span-5 xl:col-span-4 flex flex-col gap-4 lg:sticky lg:top-6 ${
          activeMobileTab === 'ticket' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Mobile Back-to-Menu banner */}
          <div className="lg:hidden flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl p-3 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
              <span>Ticket:</span>
              <span className="font-extrabold text-red-600">{totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}</span>
              <span>•</span>
              <span className="font-extrabold text-gray-900">₹{total}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveMobileTab('menu')}
              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>+ Add More Items</span>
            </button>
          </div>

          {/* Customer Input Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col gap-3.5">
            <h3 className="font-black text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Customer Details</span>
            </h3>

            {/* Customer Phone (Required) */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                <span>Customer Phone *</span>
                <span className="text-[10px] text-gray-400 font-normal">(WhatsApp Receipt)</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full text-xs font-bold pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-red-600 outline-none"
                />
              </div>
            </div>

            {/* Customer Name (Optional) */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-700">
                Customer Name <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Walk-in Guest"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-red-600 outline-none"
              />
            </div>

            {/* Order Type & Payment Mode */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Order Type</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as any)}
                  className="w-full text-xs font-bold px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-red-600 outline-none cursor-pointer"
                >
                  {businessCategory === 'salon' ? (
                    <>
                      <option value="takeaway">💇 Walk-in / In-Salon</option>
                      <option value="dine_in">📅 Scheduled Slot</option>
                      <option value="delivery">🏡 Home Service</option>
                    </>
                  ) : (
                    <>
                      <option value="takeaway">🥡 Takeaway</option>
                      <option value="dine_in">🍽️ Dine In</option>
                      <option value="delivery">🛵 Delivery</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full text-xs font-bold px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-red-600 outline-none cursor-pointer"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="online">💳 Online / UPI</option>
                </select>
              </div>
            </div>

            {orderType === 'dine_in' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">{vocab.tableNoun} Number</label>
                <input
                  type="text"
                  placeholder={businessCategory === 'salon' ? 'e.g. Chair 2 or Bay A' : 'e.g. 4 or T2'}
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-red-600 outline-none"
                />
              </div>
            )}

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">
                {businessCategory === 'salon' ? 'Stylist / Service Notes' : 'Kitchen / Chef Notes'}
              </label>
              <input
                type="text"
                placeholder={businessCategory === 'salon' ? 'e.g. Hair wash first, sensitive scalp...' : 'e.g. Extra spicy, no onions...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs font-medium px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-red-600 outline-none"
              />
            </div>
          </div>

          {/* Order Ticket & Cart */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-black text-xs uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-red-600" />
                <span>Order Ticket ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-[10px] font-bold text-red-600 hover:text-red-800 transition-colors"
                >
                  Clear Ticket
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs font-medium flex flex-col items-center gap-2">
                {businessCategory === 'salon' ? (
                  <Sparkles className="w-8 h-8 text-gray-300" />
                ) : (
                  <UtensilsCrossed className="w-8 h-8 text-gray-300" />
                )}
                <span>No {vocab.itemsNoun.toLowerCase()} selected yet.<br />Click "+ Add" on items.</span>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100 max-h-56 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.menuItemId} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-gray-900 truncate">{item.name}</h5>
                      <span className="text-[11px] font-semibold text-gray-500">₹{item.price} each</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.menuItemId, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-black text-xs text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.menuItemId, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-black text-xs text-gray-900 min-w-12 text-right">
                        ₹{item.price * item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.menuItemId)}
                        className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Summary */}
            <div className="border-t border-gray-900 pt-3 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between items-center text-base font-black text-gray-900">
                <span>Total Amount</span>
                <span className="text-red-600">₹{total}</span>
              </div>
            </div>

            {/* Single Submit Button */}
            <div className="mt-2">
              <button
                type="submit"
                disabled={submitting || cart.length === 0}
                className="w-full py-3.5 bg-[#C0181A] hover:bg-[#A01416] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Placing Order...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Place Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Mobile Floating Bar when on Menu Tab */}
      {activeMobileTab === 'menu' && totalItemCount > 0 && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-40 animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-gray-900 text-white rounded-2xl p-3.5 shadow-2xl border border-gray-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shrink-0 font-black text-sm text-white">
                {totalItemCount}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider block">
                  Current Ticket
                </span>
                <span className="text-sm font-black text-white truncate block">
                  ₹{total}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveMobileTab('ticket');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <span>Customer & Ticket</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
