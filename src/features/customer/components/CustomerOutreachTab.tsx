'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  CheckSquare,
  Square,
  Edit3,
  Copy,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Users,
  Phone,
  ExternalLink,
  X,
  Save,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  ArrowRight,
  Check,
  Megaphone,
  Percent,
  Gift,
  Download,
} from 'lucide-react';
import { normalizeCustomerPhone, isValidCustomerPhone } from '@/lib/phoneUtils';
import { normalizePhoneNumber } from '@/lib/whatsappService';

interface CustomerOutreachTabProps {
  restaurantName: string;
  restaurantId: string;
}

// Preset outreach templates tailored for cold / new customer acquisition (no customer name required)
const OUTREACH_TEMPLATES = [
  {
    id: 'welcome_discount',
    title: '🔥 20% First Visit Discount',
    text: 'Hello! 👋 Greetings from {restaurantName}! 🎉 Try our delicious chef special meals today with an exclusive 20% discount on your first visit. Show this message at the counter to claim your discount! 🍽️✨',
  },
  {
    id: 'free_starter',
    title: '🎁 Free Starter / Beverage',
    text: 'Hey foodie! 😋 Enjoy a complimentary starter with your first meal at {restaurantName}! Come visit us this week and show this message at our counter. See you soon! 🍔🥤',
  },
  {
    id: 'flat_discount',
    title: '🍕 Flat ₹100 Off Treat',
    text: 'Hi there! 🌟 Discover mouth-watering meals, snacks & desserts at {restaurantName}. Show this message at checkout to get a flat ₹100 off on your first bill! 🍕🍰',
  },
  {
    id: 'chef_special',
    title: '⭐ Weekend Special Invite',
    text: 'Hello! ⭐ Looking for an amazing food spot? Check out our newly launched specials at {restaurantName}. Fresh ingredients, authentic taste, and warm hospitality await you! Visit us today. 🍲🥘',
  },
];

export default function CustomerOutreachTab({
  restaurantName,
  restaurantId,
}: CustomerOutreachTabProps) {
  // -------------------------------------------------------------
  // Storage Keys (Tenant-isolated)
  // -------------------------------------------------------------
  const numbersStorageKey = `growlic_outreach_numbers_${restaurantId || 'default'}`;
  const sentTrackerStorageKey = `growlic_outreach_sent_${restaurantId || 'default'}`;
  const templateStorageKey = `growlic_outreach_template_${restaurantId || 'default'}`;

  // -------------------------------------------------------------
  // 1. Message Template State
  // -------------------------------------------------------------
  const defaultTemplate = OUTREACH_TEMPLATES[0].text;
  const [messageTemplate, setMessageTemplate] = useState<string>(defaultTemplate);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [draftTemplate, setDraftTemplate] = useState<string>(defaultTemplate);
  const [saveSuccessToast, setSaveSuccessToast] = useState('');

  // -------------------------------------------------------------
  // 2. Outreach Numbers List & Sent Tracking State
  // -------------------------------------------------------------
  const [numbers, setNumbers] = useState<string[]>([]);
  const [sentPhones, setSentPhones] = useState<Set<string>>(new Set<string>());
  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
  const [rawPastedText, setRawPastedText] = useState('');
  const [pasteMode, setPasteMode] = useState<'replace' | 'append'>('replace');

  // -------------------------------------------------------------
  // 3. Search & Filter State
  // -------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'sent'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50; // High-performance 50 per page handles 1,000+ smoothly

  const [copiedPhoneToast, setCopiedPhoneToast] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Hydration-safe loading from localStorage
  useEffect(() => {
    try {
      const savedTemplate = localStorage.getItem(templateStorageKey);
      if (savedTemplate) {
        setMessageTemplate(savedTemplate);
        setDraftTemplate(savedTemplate);
      }
      const savedNumbers = localStorage.getItem(numbersStorageKey);
      if (savedNumbers) {
        const parsed = JSON.parse(savedNumbers);
        if (Array.isArray(parsed)) {
          setNumbers(parsed);
        }
      }
      const savedSent = localStorage.getItem(sentTrackerStorageKey);
      if (savedSent) {
        const parsed = JSON.parse(savedSent);
        if (Array.isArray(parsed)) {
          setSentPhones(new Set<string>(parsed));
        }
      }
    } catch (err) {
      console.error('Failed to load outreach state from localStorage:', err);
    }
  }, [templateStorageKey, numbersStorageKey, sentTrackerStorageKey]);

  // Save numbers to localStorage
  const persistNumbers = useCallback(
    (newNumbers: string[]) => {
      setNumbers(newNumbers);
      if (typeof window !== 'undefined') {
        localStorage.setItem(numbersStorageKey, JSON.stringify(newNumbers));
      }
    },
    [numbersStorageKey]
  );

  // Save sent tracker to localStorage
  const persistSentPhones = useCallback(
    (newSet: Set<string>) => {
      setSentPhones(newSet);
      if (typeof window !== 'undefined') {
        localStorage.setItem(sentTrackerStorageKey, JSON.stringify(Array.from(newSet)));
      }
    },
    [sentTrackerStorageKey]
  );

  // -------------------------------------------------------------
  // Bulk Number Parser (Supports Excel columns, CSV, spaces, +91)
  // -------------------------------------------------------------
  const parseRawInput = (text: string) => {
    if (!text.trim()) {
      return { valid: [], rawCount: 0, duplicateCount: 0, invalidCount: 0 };
    }

    // Split on newlines, commas, semicolons, tabs
    const tokens = text
      .split(/[\r\n,;\t]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const seen = new Set<string>();
    const validList: string[] = [];
    let duplicates = 0;
    let invalid = 0;

    for (const token of tokens) {
      const cleaned = normalizeCustomerPhone(token);
      if (isValidCustomerPhone(cleaned)) {
        if (seen.has(cleaned)) {
          duplicates++;
        } else {
          seen.add(cleaned);
          validList.push(cleaned);
        }
      } else {
        invalid++;
      }
    }

    return {
      valid: validList,
      rawCount: tokens.length,
      duplicateCount: duplicates,
      invalidCount: invalid,
    };
  };

  const previewStats = useMemo(() => {
    return parseRawInput(rawPastedText);
  }, [rawPastedText]);

  const handleImportNumbers = () => {
    if (previewStats.valid.length === 0) {
      alert('Please enter or paste at least one valid 10-digit phone number.');
      return;
    }

    let nextNumbers: string[] = [];
    if (pasteMode === 'replace') {
      nextNumbers = previewStats.valid;
      // Also reset sent phones for fresh campaign
      persistSentPhones(new Set<string>());
    } else {
      const existingSet = new Set(numbers);
      const combined = [...numbers];
      for (const p of previewStats.valid) {
        if (!existingSet.has(p)) {
          existingSet.add(p);
          combined.push(p);
        }
      }
      nextNumbers = combined;
    }

    persistNumbers(nextNumbers);
    setIsPasteDialogOpen(false);
    setRawPastedText('');
    setCurrentPage(1);

    setActionNotice(`Successfully imported ${previewStats.valid.length} numbers!`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // -------------------------------------------------------------
  // WhatsApp Message Compilation
  // -------------------------------------------------------------
  const compileMessage = useCallback(() => {
    return messageTemplate
      .replace(/{restaurantName}/gi, restaurantName || 'Our Restaurant')
      .trim();
  }, [messageTemplate, restaurantName]);

  const handleSaveTemplate = () => {
    if (!draftTemplate.trim()) {
      alert('Please enter a message template.');
      return;
    }
    setMessageTemplate(draftTemplate);
    if (typeof window !== 'undefined') {
      localStorage.setItem(templateStorageKey, draftTemplate);
    }
    setSaveSuccessToast('Template saved successfully!');
    setTimeout(() => {
      setSaveSuccessToast('');
      setIsTemplateDialogOpen(false);
    }, 1200);
  };

  // -------------------------------------------------------------
  // Single Checkbox & WhatsApp Direct Click Handler
  // -------------------------------------------------------------
  const toggleSentPhone = (phone: string) => {
    const next = new Set(sentPhones);
    if (next.has(phone)) {
      next.delete(phone);
    } else {
      next.add(phone);
    }
    persistSentPhones(next);
  };

  const handleSendWhatsApp = (phone: string) => {
    // 1. Auto-mark as sent (checked) immediately upon click
    if (!sentPhones.has(phone)) {
      const next = new Set(sentPhones);
      next.add(phone);
      persistSentPhones(next);
    }

    // 2. Format international number (e.g. 919876543210)
    const normalized = normalizePhoneNumber(phone, '91');
    const msg = compileMessage();
    const encoded = encodeURIComponent(msg);
    const waUrl = `https://wa.me/${normalized}?text=${encoded}`;

    // 3. Open WhatsApp Web or mobile app in a new window/tab
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Copy phone to clipboard
  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhoneToast(phone);
    setTimeout(() => setCopiedPhoneToast(null), 2000);
  };

  // Copy remaining unsent numbers
  const handleCopyUnsentNumbers = () => {
    const unsent = numbers.filter((p) => !sentPhones.has(p));
    if (unsent.length === 0) {
      alert('All numbers in this list have already been messaged!');
      return;
    }
    navigator.clipboard.writeText(unsent.join('\n'));
    setActionNotice(`Copied ${unsent.length} pending numbers to clipboard!`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Export current list as CSV
  const handleExportCsv = () => {
    if (numbers.length === 0) return;
    const header = 'Phone,Status\n';
    const rows = numbers
      .map((p) => `"${p}","${sentPhones.has(p) ? 'Sent' : 'Pending'}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `outreach_campaign_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Reset sent progress
  const handleResetSent = () => {
    if (confirm('Reset sent tracking for all numbers in this list? Checkboxes will be cleared.')) {
      persistSentPhones(new Set<string>());
      setActionNotice('Sent tracking reset.');
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  // Clear entire list
  const handleClearList = () => {
    if (confirm('Are you sure you want to clear the imported outreach numbers list?')) {
      persistNumbers([]);
      persistSentPhones(new Set<string>());
      setCurrentPage(1);
    }
  };

  // -------------------------------------------------------------
  // Filtered & Paginated Numbers
  // -------------------------------------------------------------
  const filteredNumbers = useMemo(() => {
    let result = numbers;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) => p.includes(q));
    }

    if (statusFilter === 'pending') {
      result = result.filter((p) => !sentPhones.has(p));
    } else if (statusFilter === 'sent') {
      result = result.filter((p) => sentPhones.has(p));
    }

    return result;
  }, [numbers, searchQuery, statusFilter, sentPhones]);

  const totalPages = Math.max(1, Math.ceil(filteredNumbers.length / pageSize));
  const paginatedNumbers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredNumbers.slice(start, start + pageSize);
  }, [filteredNumbers, currentPage, pageSize]);

  // Counts
  const totalCount = numbers.length;
  const sentCount = numbers.filter((p) => sentPhones.has(p)).length;
  const pendingCount = Math.max(0, totalCount - sentCount);
  const percentComplete = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Campaign Summary & Outreach Header Card */}
      <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-black text-purple-200 w-fit border border-white/10">
              <Megaphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Bulk WhatsApp Outreach Campaign</span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Acquire New Customers with 1-Click WhatsApp Promos
            </h2>
            <p className="text-xs text-purple-200 leading-relaxed font-medium">
              Copy-paste up to <strong>1,000 phone numbers</strong> at once (from Excel, Google Sheets, or chats).
              Craft your promotional offer and send personalized WhatsApp messages with instant tracking.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsPasteDialogOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-950 hover:bg-gray-100 font-black text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <ClipboardPaste className="w-4 h-4 text-purple-700" />
              <span>Paste Numbers ({totalCount > 0 ? `${totalCount} Loaded` : 'Bulk 1,000'})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDraftTemplate(messageTemplate);
                setIsTemplateDialogOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white font-black text-xs rounded-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-amber-300" />
              <span>Edit Message</span>
            </button>
          </div>
        </div>

        {/* Progress Tracker Bar */}
        {totalCount > 0 && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
              <span className="font-bold text-purple-200">
                Campaign Progress: <strong className="text-white font-black">{sentCount}</strong> of{' '}
                <strong className="text-white font-black">{totalCount}</strong> messaged ({percentComplete}%)
              </span>
              <div className="flex items-center gap-3 text-[11px] text-purple-300 font-semibold">
                <span>⏳ Pending: <strong className="text-amber-300">{pendingCount}</strong></span>
                <span>✅ Sent: <strong className="text-emerald-300">{sentCount}</strong></span>
              </div>
            </div>

            {/* Visual Progress Line */}
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Active Message Preview Bar */}
      <div className="bg-white border border-[#E2E6EA] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl mt-0.5 border border-emerald-100 shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-1 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                Active WhatsApp Message:
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Ready to Send
              </span>
            </div>
            <p className="text-xs text-gray-800 line-clamp-2 italic font-medium">
              &quot;{compileMessage()}&quot;
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setDraftTemplate(messageTemplate);
            setIsTemplateDialogOpen(true);
          }}
          className="text-xs font-black text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors shrink-0 cursor-pointer self-end md:self-center"
        >
          Change Message
        </button>
      </div>

      {/* Outreach Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span>All Numbers</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/20 rounded-full font-black">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs font-black'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/20 rounded-full font-black">
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter('sent'); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'sent'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Messaged</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/20 rounded-full font-black">
              {sentCount}
            </span>
          </button>
        </div>

        {/* Search & Bulk Utilities */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[180px] sm:w-56">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search phone number..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs font-semibold pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {totalCount > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopyUnsentNumbers}
                title="Copy remaining pending numbers to clipboard"
                className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3 text-gray-500" />
                <span>Copy Pending</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                title="Download CSV report"
                className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetSent}
                title="Reset checkboxes"
                className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-amber-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleClearList}
                title="Clear all numbers"
                className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-red-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Outreach Numbers Table */}
      {totalCount === 0 ? (
        <div className="bg-white border border-[#E2E6EA] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-700 rounded-2xl">
            <ClipboardPaste className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-1 max-w-md">
            <h3 className="text-base font-black text-gray-900">No Outreach Numbers Loaded Yet</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              Copy a column of phone numbers from Excel, Google Sheets, or your text notes, and paste them here.
              We automatically clean, format, and prepare 1-click WhatsApp buttons for all of them!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPasteDialogOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer mt-2"
          >
            <ClipboardPaste className="w-4 h-4 text-purple-300" />
            <span>Paste Numbers in Bulk</span>
          </button>
        </div>
      ) : filteredNumbers.length === 0 ? (
        <div className="bg-white border border-[#E2E6EA] rounded-xl p-10 text-center text-xs text-gray-500 font-semibold">
          No numbers match the selected filter &quot;{statusFilter}&quot; or search query.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-black">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Status</th>
                    <th className="py-3 px-3 w-14">#</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Delivery State</th>
                    <th className="py-3 px-4 text-right">WhatsApp Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedNumbers.map((phone, idx) => {
                    const isSent = sentPhones.has(phone);
                    const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                    const isCopied = copiedPhoneToast === phone;

                    return (
                      <tr
                        key={phone}
                        className={`transition-colors hover:bg-gray-50/80 ${
                          isSent ? 'bg-emerald-50/30' : 'bg-white'
                        }`}
                      >
                        {/* Sent Checkbox */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSentPhone(phone)}
                            className="cursor-pointer text-gray-400 hover:text-gray-900 transition-colors"
                            title={isSent ? 'Mark as Unsent' : 'Mark as Messaged'}
                          >
                            {isSent ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />
                            )}
                          </button>
                        </td>

                        {/* Serial Number */}
                        <td className="py-3 px-3 font-mono text-[11px] text-gray-400 font-bold">
                          {globalIndex}
                        </td>

                        {/* Phone Number */}
                        <td className="py-3 px-4 font-mono font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>+91 {phone.slice(0, 5)} {phone.slice(5)}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyPhone(phone)}
                              className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                              title="Copy number"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Delivery Status Badge */}
                        <td className="py-3 px-4 hidden sm:table-cell">
                          {isSent ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Messaged
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                              <Clock className="w-3 h-3 text-gray-400" />
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Direct 1-Click WhatsApp Button */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(phone)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-xs ${
                              isSent
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-[#25D366] hover:bg-[#20ba59] text-white shadow-xs'
                            }`}
                            title="Open WhatsApp with pre-filled promo message"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isSent ? 'Resend WhatsApp' : 'Send WhatsApp'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs">
                <span className="text-gray-500 font-semibold text-[11px]">
                  Showing{' '}
                  <strong className="text-gray-900 font-bold">
                    {(currentPage - 1) * pageSize + 1} -{' '}
                    {Math.min(filteredNumbers.length, currentPage * pageSize)}
                  </strong>{' '}
                  of <strong className="text-gray-900 font-bold">{filteredNumbers.length}</strong>{' '}
                  numbers
                </span>

                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-700" />
                  </button>

                  <span className="px-3 py-1 text-xs font-bold text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: BULK PASTE NUMBERS DIALOG                            */}
      {/* ------------------------------------------------------------- */}
      {isPasteDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-indigo-700" />
                <h3 className="font-black text-sm text-gray-900">
                  Bulk Paste Phone Numbers (Up to 1,000)
                </h3>
              </div>
              <button
                onClick={() => setIsPasteDialogOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col gap-4">
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Copy an entire column of customer numbers from Excel or Google Sheets and paste it directly below.
                We handle commas, spaces, <code>+91</code> prefixes, and strip duplicates automatically.
              </p>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  rows={8}
                  placeholder={`Paste numbers here (one per line, or comma-separated)...\n\nExample:\n9876543210\n+91 91234 56789\n8877665544\n9988776655`}
                  value={rawPastedText}
                  onChange={(e) => setRawPastedText(e.target.value)}
                  className="w-full text-xs font-mono p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none transition-all leading-relaxed"
                />
              </div>

              {/* Live Parsing Stats Card */}
              {rawPastedText.trim().length > 0 && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 flex items-center justify-between text-xs text-indigo-950 font-bold">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-700">
                      ✓ Valid: <strong>{previewStats.valid.length}</strong>
                    </span>
                    {previewStats.duplicateCount > 0 && (
                      <span className="text-amber-700">
                        • Duplicates: <strong>{previewStats.duplicateCount}</strong>
                      </span>
                    )}
                    {previewStats.invalidCount > 0 && (
                      <span className="text-gray-500">
                        • Invalid: <strong>{previewStats.invalidCount}</strong>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-indigo-700">
                    Total Raw: {previewStats.rawCount}
                  </span>
                </div>
              )}

              {/* Mode Selection */}
              {numbers.length > 0 && (
                <div className="flex items-center gap-4 text-xs font-bold text-gray-700 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="pasteMode"
                      checked={pasteMode === 'replace'}
                      onChange={() => setPasteMode('replace')}
                      className="text-indigo-600"
                    />
                    <span>Replace current list ({numbers.length} numbers)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="pasteMode"
                      checked={pasteMode === 'append'}
                      onChange={() => setPasteMode('append')}
                      className="text-indigo-600"
                    />
                    <span>Append to existing list</span>
                  </label>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRawPastedText('')}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                Clear Input
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPasteDialogOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportNumbers}
                  disabled={previewStats.valid.length === 0}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-black disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                  style={{ backgroundColor: '#111827', color: '#ffffff' }}
                >
                  Import {previewStats.valid.length} Numbers
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: EDIT OUTREACH MESSAGE DIALOG                          */}
      {/* ------------------------------------------------------------- */}
      {isTemplateDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-700" />
                <h3 className="font-black text-sm text-gray-900">
                  Customize New Customer Outreach Message
                </h3>
              </div>
              <button
                onClick={() => setIsTemplateDialogOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-4">
              {/* Presets */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Select a High-Converting Outreach Template:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {OUTREACH_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setDraftTemplate(tmpl.text)}
                      className="p-2.5 text-left rounded-xl border border-gray-200 hover:border-indigo-600 hover:bg-indigo-50/50 transition-all cursor-pointer flex flex-col gap-1 group"
                    >
                      <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-950">
                        {tmpl.title}
                      </span>
                      <span className="text-[11px] text-gray-500 line-clamp-2">
                        {tmpl.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Textarea */}
              <div className="flex flex-col gap-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">
                    Message Text:
                  </label>
                  <span className="text-[11px] text-gray-400">
                    Supported Tag: <code className="bg-gray-100 px-1 py-0.5 rounded text-indigo-700 font-bold">{'{restaurantName}'}</code>
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={draftTemplate}
                  onChange={(e) => setDraftTemplate(e.target.value)}
                  className="w-full text-xs font-medium p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none transition-all leading-relaxed text-gray-800"
                />
              </div>

              {/* Live Preview Card */}
              <div className="bg-[#EFEAE2] rounded-xl p-4 border border-[#D1D7DB] flex flex-col gap-1.5 shadow-inner">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                  Live WhatsApp Preview:
                </span>
                <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-xs text-xs text-gray-800 max-w-md leading-relaxed whitespace-pre-wrap">
                  {draftTemplate.replace(/{restaurantName}/gi, restaurantName || 'Our Restaurant')}
                  <div className="text-[9px] text-gray-400 text-right mt-1">10:30 AM ✓✓</div>
                </div>
              </div>

              {saveSuccessToast && (
                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-xl text-center animate-in fade-in">
                  {saveSuccessToast}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDraftTemplate(defaultTemplate)}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                Reset to Default
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateDialogOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                  style={{ backgroundColor: '#059669', color: '#ffffff' }}
                >
                  <Save className="w-4 h-4 text-white" />
                  <span className="text-white font-black">Save Message</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
