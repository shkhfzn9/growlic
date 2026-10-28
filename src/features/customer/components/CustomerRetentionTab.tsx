'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getCustomersWithSegmentsAction } from '@/actions/customers';
import { ICustomerWithSegment, ICustomerListFilters } from '@/features/customer/types';
import { normalizePhoneNumber } from '@/lib/whatsappService';
import {
  MessageSquare,
  Send,
  CheckSquare,
  Square,
  Edit,
  Sparkles,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Users,
  Phone,
  ExternalLink,
  X,
  Save,
  HeartHandshake,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';

interface CustomerRetentionTabProps {
  restaurantName: string;
  restaurantId: string;
}

// Default outreach message templates
const PRESET_TEMPLATES = [
  {
    id: 'win_back_discount',
    title: '🎁 20% Win-Back Discount',
    text: 'Hi {name}! 👋 We miss having you at {restaurantName}. Here is an exclusive 20% discount on your next visit! Show this message at the counter or order takeaway. Hope to see you soon! 🍽️',
  },
  {
    id: 'vip_appreciation',
    title: '⭐ VIP Loyalty Treat',
    text: 'Hello {name}! ⭐ Thank you for being one of our top valued guests at {restaurantName}. We have a special complimentary treat waiting for you on your next visit! Show this message to claim it. 🎁',
  },
  {
    id: 'gentle_checkin',
    title: '👋 Friendly Check-in',
    text: "Hey {name}, it's been {days} days since your last order at {restaurantName}! We've added delicious new items to our menu. Come try them out this week! 🥟✨",
  },
];

export default function CustomerRetentionTab({
  restaurantName,
  restaurantId,
}: CustomerRetentionTabProps) {
  // -------------------------------------------------------------
  // 1. WhatsApp Template State & Persistence
  // -------------------------------------------------------------
  const templateStorageKey = `growlic_retention_template_${restaurantId || 'default'}`;
  const defaultMessage =
    'Hi {name}! 👋 We miss having you at {restaurantName}. Here is an exclusive 20% discount on your next visit! Show this message at the counter. Hope to see you soon! 🍽️';

  const [messageTemplate, setMessageTemplate] = useState<string>(defaultMessage);

  // Modal Dialog State for editing message
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draftTemplate, setDraftTemplate] = useState(defaultMessage);
  const [saveToast, setSaveToast] = useState('');

  // -------------------------------------------------------------
  // 2. Sent Tracking Checkboxes State & Persistence
  // -------------------------------------------------------------
  const sentTrackerStorageKey = `growlic_retention_sent_${restaurantId || 'default'}`;
  const [sentPhones, setSentPhones] = useState<Set<string>>(new Set<string>());

  // Load persisted template and sent tracker from localStorage on mount (hydration-safe)
  useEffect(() => {
    try {
      const savedTemplate = localStorage.getItem(templateStorageKey);
      if (savedTemplate) {
        setMessageTemplate(savedTemplate);
        setDraftTemplate(savedTemplate);
      }
      const savedSent = localStorage.getItem(sentTrackerStorageKey);
      if (savedSent) {
        const parsed = JSON.parse(savedSent);
        if (Array.isArray(parsed)) {
          setSentPhones(new Set<string>(parsed));
        }
      }
    } catch (e) {
      console.error('Failed to load retention data from localStorage:', e);
    }
  }, [templateStorageKey, sentTrackerStorageKey]);

  // Save sent set to localStorage
  const persistSentPhones = useCallback(
    (newSet: Set<string>) => {
      setSentPhones(newSet);
      if (typeof window !== 'undefined') {
        localStorage.setItem(sentTrackerStorageKey, JSON.stringify(Array.from(newSet)));
      }
    },
    [sentTrackerStorageKey]
  );

  // Toggle single customer sent checkbox
  const toggleSentPhone = (phone: string) => {
    const next = new Set(sentPhones);
    if (next.has(phone)) {
      next.delete(phone);
    } else {
      next.add(phone);
    }
    persistSentPhones(next);
  };

  // Reset all tracking checks
  const handleResetTracker = () => {
    if (window.confirm('Are you sure you want to reset all sent checkboxes? This will start a fresh outreach tracker.')) {
      persistSentPhones(new Set<string>());
    }
  };

  // Mark all currently visible customers as sent
  const handleMarkAllVisibleSent = () => {
    const next = new Set(sentPhones);
    customers.forEach((c) => next.add(c.phone));
    persistSentPhones(next);
  };

  // -------------------------------------------------------------
  // 3. Customers Data & Filter State
  // -------------------------------------------------------------
  const [customers, setCustomers] = useState<ICustomerWithSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [selectedSegment, setSelectedSegment] = useState<'ALL' | 'AT_RISK' | 'LOST' | 'VIP' | 'REGULAR'>('ALL');
  const [outreachStatusFilter, setOutreachStatusFilter] = useState<'ALL' | 'PENDING' | 'SENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch customers
  const fetchRetentionCustomers = useCallback(
    async (targetPage = 1) => {
      try {
        setLoading(true);
        const filters: ICustomerListFilters = {
          page: targetPage,
          limit: 25,
          search: debouncedSearch.trim() || undefined,
          segment: selectedSegment !== 'ALL' ? selectedSegment : undefined,
        };

        const res = await getCustomersWithSegmentsAction(filters);
        if (res) {
          setCustomers(res.customers || []);
          setTotal(res.total || 0);
          setPage(res.page || 1);
          setTotalPages(res.totalPages || 1);
        }
      } catch (err) {
        console.error('Failed to load retention customers:', err);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, selectedSegment]
  );

  useEffect(() => {
    fetchRetentionCustomers(1);
  }, [fetchRetentionCustomers]);

  // Filter customers by Outreach Status (All vs Pending vs Sent)
  const displayedCustomers = useMemo(() => {
    if (outreachStatusFilter === 'ALL') return customers;
    if (outreachStatusFilter === 'SENT') {
      return customers.filter((c) => sentPhones.has(c.phone));
    }
    return customers.filter((c) => !sentPhones.has(c.phone));
  }, [customers, outreachStatusFilter, sentPhones]);

  // Metrics
  const visibleSentCount = customers.filter((c) => sentPhones.has(c.phone)).length;
  const progressPercent = customers.length > 0 ? Math.round((visibleSentCount / customers.length) * 100) : 0;

  // -------------------------------------------------------------
  // 4. WhatsApp Message Personalization & Dispatch
  // -------------------------------------------------------------
  const formatCustomerMessage = (template: string, customer: ICustomerWithSegment) => {
    const custName = customer.name?.trim() || 'Valued Guest';
    const daysStr = customer.daysSinceLastVisit < 900 ? String(customer.daysSinceLastVisit) : '30+';
    const restName = restaurantName || 'our restaurant';

    return template
      .replace(/{name}/g, custName)
      .replace(/{customerName}/g, custName)
      .replace(/{restaurantName}/g, restName)
      .replace(/{days}/g, daysStr);
  };

  const handleSendWhatsApp = (customer: ICustomerWithSegment) => {
    // 1. Format normalized phone with 91 international prefix
    const cleanPhone = normalizePhoneNumber(customer.phone);
    if (!cleanPhone) {
      alert(`Invalid phone number: ${customer.phone}`);
      return;
    }

    // 2. Personalize message template
    const textToSend = formatCustomerMessage(messageTemplate, customer);

    // 3. Mark customer checkbox as SENT automatically
    const next = new Set(sentPhones);
    next.add(customer.phone);
    persistSentPhones(next);

    // 4. Open WhatsApp click-to-chat URL in new window/tab
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textToSend)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // -------------------------------------------------------------
  // 5. Template Dialog Handlers
  // -------------------------------------------------------------
  const handleOpenDialog = () => {
    setDraftTemplate(messageTemplate);
    setIsDialogOpen(true);
  };

  const handleSaveDialog = () => {
    const trimmed = draftTemplate.trim();
    if (!trimmed) {
      alert('Message template cannot be empty.');
      return;
    }
    setMessageTemplate(trimmed);
    if (typeof window !== 'undefined') {
      localStorage.setItem(templateStorageKey, trimmed);
    }
    setIsDialogOpen(false);
    setSaveToast('WhatsApp retention message saved successfully!');
    setTimeout(() => setSaveToast(''), 4000);
  };

  const insertVariable = (variable: string) => {
    setDraftTemplate((prev) => `${prev} ${variable}`);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header Banner & Template Preview Card */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-purple-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Direct WhatsApp Retention
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white mt-1">
            Customer Retention & Re-Engagement Hub
          </h2>
          <p className="text-xs text-purple-200/80 leading-relaxed">
            Directly re-engage inactive, lost, and VIP customers with personalized WhatsApp messages.
            Track who has received messages in real-time.
          </p>
        </div>

        {/* Action Button: Edit WhatsApp Message */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenDialog}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Edit className="w-4 h-4" />
            <span>Customize WhatsApp Message</span>
          </button>
        </div>
      </div>

      {/* Active Message Preview Strip */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-emerald-900 tracking-wider">
                Current Active WhatsApp Message:
              </span>
              <span className="text-[10px] bg-emerald-200 text-emerald-950 font-bold px-1.5 py-0.2 rounded">
                Clicking WhatsApp uses this
              </span>
            </div>
            <p className="text-xs text-emerald-950 font-medium italic truncate max-w-2xl mt-0.5">
              &quot;{messageTemplate}&quot;
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenDialog}
          className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100/60 font-bold text-xs rounded-xl shrink-0 transition-colors cursor-pointer"
        >
          Edit Template
        </button>
      </div>

      {/* Retention Progress & KPI Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1: Target Customers */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            Target Pool
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-gray-900">{total}</span>
            <span className="text-[10px] text-gray-500 font-semibold block mt-0.5">
              Filtered for outreach
            </span>
          </div>
        </div>

        {/* Metric 2: Messages Sent */}
        <div className="bg-white border border-emerald-200/80 p-4 rounded-2xl shadow-2xs flex flex-col justify-between bg-emerald-50/20">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Messages Sent
          </span>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-950">{visibleSentCount}</span>
              <span className="text-xs font-bold text-emerald-700">/ {customers.length}</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 3: Pending Outreach */}
        <div className="bg-white border border-amber-200/80 p-4 rounded-2xl shadow-2xs flex flex-col justify-between bg-amber-50/20">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Outreach
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-950">
              {Math.max(0, customers.length - visibleSentCount)}
            </span>
            <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
              Awaiting message
            </span>
          </div>
        </div>

        {/* Metric 4: Batch Controls */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
            Tracker Actions
          </span>
          <div className="flex flex-col gap-1.5 mt-2">
            <button
              type="button"
              onClick={handleMarkAllVisibleSent}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline text-left cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Mark all visible as Sent
            </button>
            <button
              type="button"
              onClick={handleResetTracker}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline text-left cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset all checkmarks
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Segment Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: '👥 All Customers' },
              { id: 'AT_RISK', label: '⚠️ At-Risk (>45d)' },
              { id: 'LOST', label: '🛑 Lost (>90d)' },
              { id: 'VIP', label: '⭐ VIPs' },
              { id: 'REGULAR', label: '🔁 Regulars' },
            ].map((seg) => (
              <button
                key={seg.id}
                type="button"
                onClick={() => setSelectedSegment(seg.id as any)}
                className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer shrink-0 border ${
                  selectedSegment === seg.id
                    ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {seg.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-purple-700 outline-none"
            />
          </div>
        </div>

        {/* Sub-Filter: Outreach Status (All vs Pending vs Sent) */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider mr-1">
              Status Filter:
            </span>
            {[
              { id: 'ALL', label: `All (${customers.length})` },
              { id: 'PENDING', label: `Pending (${Math.max(0, customers.length - visibleSentCount)})` },
              { id: 'SENT', label: `Sent (${visibleSentCount})` },
            ].map((status) => (
              <button
                key={status.id}
                type="button"
                onClick={() => setOutreachStatusFilter(status.id as any)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  outreachStatusFilter === status.id
                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-extrabold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-gray-500 font-semibold">
            Showing {displayedCustomers.length} recipients
          </span>
        </div>
      </div>

      {/* Retention Customer Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-gray-500 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading target retention customers...</span>
          </div>
        ) : displayedCustomers.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
            <HeartHandshake className="w-8 h-8 text-gray-300" />
            <span className="font-extrabold text-sm text-gray-700">No customers found</span>
            <span>All customers in this filter have been contacted or no records match.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[750px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="px-4 py-3 text-left w-12">
                    <span className="sr-only">Tracker</span>
                    Track
                  </th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Phone Number</th>
                  <th className="px-4 py-3 text-center">Segment</th>
                  <th className="px-4 py-3 text-left">Last Visit</th>
                  <th className="px-4 py-3 text-right">Total Spent</th>
                  <th className="px-4 py-3 text-right w-44">WhatsApp Outreach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {displayedCustomers.map((cust) => {
                  const isSent = sentPhones.has(cust.phone);

                  return (
                    <tr
                      key={cust._id}
                      className={`hover:bg-purple-50/40 transition-colors ${
                        isSent ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      {/* Checkbox Tracker Column */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => toggleSentPhone(cust.phone)}
                          className="flex items-center justify-center p-1 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                          title={isSent ? 'Mark as Not Sent' : 'Mark as Sent'}
                        >
                          {isSent ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />
                          )}
                        </button>
                      </td>

                      {/* Customer Profile Column */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                              isSent ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-900'
                            }`}
                          >
                            {cust.name ? cust.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <span className="font-extrabold text-gray-900 block leading-tight">
                              {cust.name || 'Walk-in Guest'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {cust.totalOrders} total visits
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone Column with Checkbox on the side of the number */}
                      <td className="px-4 py-3.5 font-mono text-gray-700">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSentPhone(cust.phone)}
                            className="flex items-center justify-center p-1 rounded hover:bg-gray-200/60 transition-colors cursor-pointer shrink-0"
                            title={isSent ? 'Mark as Not Sent' : 'Mark as Sent'}
                          >
                            {isSent ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />
                            )}
                          </button>
                          <span className="font-bold">{cust.phone}</span>
                          {isSent && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold shrink-0">
                              Sent ✓
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Segment Column */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            cust.segment === 'VIP'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : cust.segment === 'AT_RISK'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : cust.segment === 'LOST'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {cust.segment === 'AT_RISK'
                            ? '⚠️ At-Risk'
                            : cust.segment === 'LOST'
                            ? '🛑 Lost'
                            : cust.segment === 'VIP'
                            ? '⭐ VIP'
                            : cust.segment}
                        </span>
                      </td>

                      {/* Last Visit / Recency */}
                      <td className="px-4 py-3.5 text-gray-600">
                        <div className="text-[11px]">
                          <span className="font-semibold text-gray-800 block">
                            {cust.daysSinceLastVisit < 900
                              ? `${cust.daysSinceLastVisit} days ago`
                              : 'No visits logged'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {cust.lastOrderDate ? cust.lastOrderDate.split('T')[0] : 'Never'}
                          </span>
                        </div>
                      </td>

                      {/* Total Spent */}
                      <td className="px-4 py-3.5 text-right font-black text-gray-900">
                        ₹{cust.totalSpent.toLocaleString('en-IN')}
                      </td>

                      {/* Direct WhatsApp Action Button */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(cust)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer ${
                            isSent
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-700/20'
                          }`}
                          title={`Send WhatsApp retention message to ${cust.name || cust.phone}`}
                        >
                          {/* Official WhatsApp SVG Icon */}
                          <svg
                            className="w-3.5 h-3.5 fill-current"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          <span>{isSent ? 'Resend WhatsApp' : 'Send WhatsApp'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs">
            <span className="text-gray-500 font-semibold">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => fetchRetentionCustomers(page - 1)}
                className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => fetchRetentionCustomers(page + 1)}
                className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL DIALOG: Customize WhatsApp Retention Message          */}
      {/* ------------------------------------------------------------- */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-gray-200 overflow-hidden flex flex-col animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Edit Retention WhatsApp Message
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    This message will be pre-filled when you click Send WhatsApp on any customer.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-200/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4">
              {/* Preset Templates Quick Selector */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Choose a Quick Template Preset:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PRESET_TEMPLATES.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setDraftTemplate(preset.text)}
                      className="p-2.5 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <span className="text-[11px] font-extrabold text-gray-800 group-hover:text-emerald-900 block leading-tight">
                        {preset.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Textarea */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">
                    Message Content *
                  </label>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {draftTemplate.length} characters
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={draftTemplate}
                  onChange={(e) => setDraftTemplate(e.target.value)}
                  placeholder="Type your WhatsApp retention message..."
                  className="w-full text-xs font-medium p-3 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:border-emerald-600 outline-none leading-relaxed transition-all"
                />
              </div>

              {/* Dynamic Tag Insertion Chips */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                  Insert Personalized Variables:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { tag: '{name}', desc: 'Customer Name' },
                    { tag: '{restaurantName}', desc: 'Your Restaurant Name' },
                    { tag: '{days}', desc: 'Days Since Last Visit' },
                  ].map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => insertVariable(item.tag)}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer"
                    >
                      + {item.tag} <span className="text-[10px] font-sans text-purple-600">({item.desc})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time WhatsApp Chat Bubble Preview */}
              <div className="flex flex-col gap-1 bg-[#EFEAE2] p-4 rounded-2xl border border-gray-200">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-gray-500 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Live WhatsApp Message Preview (as seen by recipient):
                </div>
                <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-sm text-xs font-medium text-gray-900 leading-relaxed relative">
                  <p className="whitespace-pre-wrap">
                    {formatCustomerMessage(draftTemplate, {
                      name: 'Aman Sharma',
                      phone: '9876543210',
                      daysSinceLastVisit: 45,
                    } as any)}
                  </p>
                  <span className="text-[9px] text-gray-400 font-bold block text-right mt-1.5">
                    12:30 PM ✓✓
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-200/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveDialog}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save & Apply Message</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
