'use client';

import React, { useEffect, useState, useMemo, useCallback, use } from 'react';
import {
  ShoppingCart,
  Calendar,
  TrendingUp,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Store,
  FileText,
  DollarSign,
  Zap,
  Plus,
  Package,
  Layers,
  X,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { PlainExpenseCategory, PlainExpenseItem, PlainExpenseLog, ExpenseUnit } from '@/features/expense';
import {
  getPublicExpenseCategoriesAction,
  getPublicExpenseItemsAction,
  getPublicExpenseLogsAction,
  createPublicExpenseCategoryAction,
  createPublicExpenseItemAction,
  createPublicExpenseLogAction,
  updatePublicExpenseCategoryAction,
  deletePublicExpenseCategoryAction,
  updatePublicExpenseItemAction,
  deletePublicExpenseItemAction,
  seedSampleExpenseDataAction,
} from '@/actions/expense';
import { Edit2, Trash2 } from 'lucide-react';
import PwaInstallBanner from '@/components/pwa/PwaInstallBanner';

const UNIT_OPTIONS: Array<{ value: ExpenseUnit; label: string }> = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'litre', label: 'Litre (litre)' },
  { value: 'gram', label: 'Gram (gram)' },
  { value: 'ml', label: 'Millilitre (ml)' },
  { value: 'piece', label: 'Piece (piece)' },
  { value: 'dozen', label: 'Dozen (dozen)' },
  { value: 'packet', label: 'Packet (packet)' },
];

export default function PublicExpenseTrackerPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const resolvedParams = use(params);
  const restaurantId = resolvedParams.restaurantId;

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [activeTab, setActiveTab] = useState<'log' | 'items' | 'logs'>('log');
  const [categories, setCategories] = useState<PlainExpenseCategory[]>([]);
  const [items, setItems] = useState<PlainExpenseItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<PlainExpenseLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Purchase Form State
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(todayStr);
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [totalPriceInput, setTotalPriceInput] = useState<string>('');
  const [vendorInput, setVendorInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PlainExpenseCategory | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Item Modal State
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PlainExpenseItem | null>(null);
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemNameInput, setItemNameInput] = useState('');
  const [itemUnitInput, setItemUnitInput] = useState<ExpenseUnit>('kg');
  const [savingItem, setSavingItem] = useState(false);

  // Toast System State
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'info',
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, itemRes, logsRes] = await Promise.all([
        getPublicExpenseCategoriesAction(restaurantId).catch(() => []),
        getPublicExpenseItemsAction(restaurantId).catch(() => []),
        getPublicExpenseLogsAction(restaurantId).catch(() => ({ logs: [] })),
      ]);

      setCategories(catRes || []);
      setItems(itemRes || []);
      setRecentLogs(logsRes?.logs || []);
    } catch (err) {
      console.error('Failed to load public expense tracker:', err);
      showToast('Failed to load expense tracker data', 'error');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh data when staff opens the PWA or returns to foreground (e.g. next morning)
  useEffect(() => {
    let lastDate = new Date().toDateString();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentDate = new Date().toDateString();
        if (currentDate !== lastDate) {
          lastDate = currentDate;
          loadData();
        } else {
          loadData();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData]);

  // Keep selectedItemId valid when items list changes
  useEffect(() => {
    if (items.length > 0) {
      const exists = items.some((i) => i._id === selectedItemId);
      if (!exists) {
        setSelectedItemId(items[0]._id);
      }
    } else {
      setSelectedItemId('');
    }
  }, [items, selectedItemId]);

  const selectedItem = useMemo(() => {
    return items.find((i) => i._id === selectedItemId) || null;
  }, [items, selectedItemId]);

  const previousLog = useMemo(() => {
    if (!selectedItemId) return null;
    return (
      recentLogs.find((l) => {
        const id = typeof l.itemId === 'object' ? l.itemId._id : l.itemId;
        return id === selectedItemId;
      }) || null
    );
  }, [recentLogs, selectedItemId]);

  const qty = parseFloat(quantityInput) || 0;
  const total = parseFloat(totalPriceInput) || 0;
  const livePricePerUnit = qty > 0 ? total / qty : 0;

  const liveComparison = useMemo(() => {
    if (!previousLog || livePricePerUnit <= 0 || qty <= 0) return null;

    const prevPricePerUnit = previousLog.pricePerUnit;
    const deltaPerUnit = livePricePerUnit - prevPricePerUnit;
    const deltaTotal = deltaPerUnit * qty;
    const deltaPercent = prevPricePerUnit > 0 ? (deltaPerUnit / prevPricePerUnit) * 100 : 0;

    return {
      prevPricePerUnit: Math.round(prevPricePerUnit * 100) / 100,
      deltaPerUnit: Math.round(deltaPerUnit * 100) / 100,
      deltaTotal: Math.round(deltaTotal * 100) / 100,
      deltaPercent: Math.round(deltaPercent * 10) / 10,
      isPriceHigher: deltaPerUnit > 0,
      isPriceEqual: Math.abs(deltaPerUnit) < 0.01,
    };
  }, [previousLog, livePricePerUnit, qty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      showToast('Please select an item', 'error');
      return;
    }
    if (qty <= 0) {
      showToast('Quantity must be greater than 0', 'error');
      return;
    }
    if (total < 0) {
      showToast('Total price cannot be negative', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await createPublicExpenseLogAction({
        restaurantId,
        itemId: selectedItemId,
        purchaseDate,
        quantity: qty,
        totalPrice: total,
        vendor: vendorInput.trim(),
        note: noteInput.trim(),
      });

      showToast(
        `Logged ${qty} ${selectedItem?.unit} of ${selectedItem?.name} for ₹${total.toLocaleString('en-IN')}`,
        'success'
      );

      setQuantityInput('');
      setTotalPriceInput('');
      setNoteInput('');
      await loadData();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Failed to log purchase', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) return;

    try {
      setSavingCategory(true);
      if (editingCategory) {
        await updatePublicExpenseCategoryAction(restaurantId, editingCategory._id, categoryNameInput.trim());
        showToast(`Category renamed to "${categoryNameInput.trim()}"`, 'success');
      } else {
        await createPublicExpenseCategoryAction(restaurantId, categoryNameInput.trim());
        showToast(`Category "${categoryNameInput.trim()}" created!`, 'success');
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryNameInput('');
      await loadData();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Failed to save category', 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: PlainExpenseCategory) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"? (Assigned items will be reassigned)`)) return;
    try {
      const res = await deletePublicExpenseCategoryAction(restaurantId, cat._id);
      if (res.itemsReassigned) {
        showToast(`Deleted "${cat.name}" and reassigned its items to General Raw Materials`, 'info');
      } else {
        showToast(`Category "${cat.name}" deleted`, 'info');
      }
      await loadData();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Failed to delete category', 'error');
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemNameInput.trim()) return;

    try {
      setSavingItem(true);
      let targetCategoryId = itemCategoryId;
      if (!targetCategoryId) {
        const existingGenCat = categories.find((c) => c.name.toLowerCase().includes('general') || c.name.toLowerCase().includes('raw'));
        if (!existingGenCat) {
          const createdCat = await createPublicExpenseCategoryAction(restaurantId, 'General Raw Materials');
          targetCategoryId = createdCat._id;
        } else {
          targetCategoryId = existingGenCat._id;
        }
      }

      if (editingItem) {
        await updatePublicExpenseItemAction(restaurantId, editingItem._id, {
          name: itemNameInput.trim(),
          unit: itemUnitInput,
          categoryId: targetCategoryId,
        });
        showToast(`Item "${itemNameInput.trim()}" updated!`, 'success');
      } else {
        await createPublicExpenseItemAction(restaurantId, targetCategoryId, itemNameInput.trim(), itemUnitInput);
        showToast(`Item profile "${itemNameInput.trim()}" created!`, 'success');
      }

      setShowItemModal(false);
      setEditingItem(null);
      setItemNameInput('');
      await loadData();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Failed to save item profile', 'error');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (item: PlainExpenseItem) => {
    if (!confirm(`Remove item profile "${item.name}"?`)) return;
    try {
      const res = await deletePublicExpenseItemAction(restaurantId, item._id);
      if (res.softDeleted) {
        showToast(`Archived item "${item.name}" (purchase history preserved)`, 'info');
      } else {
        showToast(`Deleted item "${item.name}"`, 'info');
      }
      await loadData();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Failed to delete item', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md text-xs font-bold ${
              toast.type === 'error'
                ? 'bg-red-950/90 text-red-100 border-red-800'
                : toast.type === 'info'
                ? 'bg-slate-900/90 text-slate-100 border-slate-700'
                : 'bg-emerald-950/90 text-emerald-100 border-emerald-800'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : toast.type === 'info' ? (
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast((prev) => ({ ...prev, show: false }))} className="ml-2 text-white/60 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <PwaInstallBanner
        appName="Daily Expense Tracker"
        manifestPath={`/api/manifest/expense-tracker/${restaurantId}`}
        themeColor="#3B82F6"
      />
      <header className="bg-[#1C2333] text-white border-b border-white/10 sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C0181A] text-white font-black text-lg flex items-center justify-center shadow">
              🛒
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white capitalize">{restaurantId.replace(/-/g, ' ')}</h1>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                  Public Logger
                </span>
              </div>
              <p className="text-[11px] text-white/60 font-medium">Daily Raw Material Expense Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setItemCategoryId(categories[0]?._id || '');
                setShowItemModal(true);
              }}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Item</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-2 border-t border-white/10 pt-1 pb-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('log')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'log' ? 'bg-[#C0181A] text-white shadow' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Log Daily Purchase</span>
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'items' ? 'bg-white text-slate-900 shadow' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Items & Categories ({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'logs' ? 'bg-white text-slate-900 shadow' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Recent Purchase Log ({recentLogs.length})</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs font-bold text-slate-400">
            Loading Expense Logger Portal...
          </div>
        ) : (
          <>
            {/* TAB 1: LOG DAILY PURCHASE */}
            {activeTab === 'log' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-[#C0181A]" />
                      <span>Log Daily Raw Material Purchase</span>
                    </h3>
                  </div>

                  {items.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs font-bold flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>No raw material item profiles exist for this restaurant.</span>
                      </div>
                      <button
                        onClick={() => {
                          setItemCategoryId(categories[0]?._id || '');
                          setShowItemModal(true);
                        }}
                        className="mt-2 bg-[#C0181A] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow"
                      >
                        + Add First Item Profile
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                      {/* Item Selector */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-extrabold uppercase text-slate-700">
                          Select Raw Material Item <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedItemId}
                          onChange={(e) => setSelectedItemId(e.target.value)}
                          className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none bg-slate-50 cursor-pointer"
                          required
                        >
                          {categories.length > 0
                            ? categories.map((cat) => {
                                const catItems = items.filter((i) => {
                                  const cId = typeof i.categoryId === 'object' ? i.categoryId._id : i.categoryId;
                                  return cId === cat._id;
                                });
                                if (catItems.length === 0) return null;
                                return (
                                  <optgroup key={cat._id} label={`📁 ${cat.name}`}>
                                    {catItems.map((i) => (
                                      <option key={i._id} value={i._id}>
                                        {i.name} ({i.unit})
                                      </option>
                                    ))}
                                  </optgroup>
                                );
                              })
                            : items.map((i) => (
                                <option key={i._id} value={i._id}>
                                  {i.name} ({i.unit})
                                </option>
                              ))}
                        </select>
                      </div>

                      {/* Date & Vendor */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-extrabold uppercase text-slate-700">Purchase Date</label>
                          <input
                            type="date"
                            value={purchaseDate}
                            onChange={(e) => setPurchaseDate(e.target.value)}
                            className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none font-mono bg-slate-50 cursor-pointer"
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-extrabold uppercase text-slate-700">Vendor / Supplier</label>
                          <input
                            type="text"
                            placeholder="e.g. Local Wholesale Market"
                            value={vendorInput}
                            onChange={(e) => setVendorInput(e.target.value)}
                            className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                          />
                        </div>
                      </div>

                      {/* Quantity & Total Price */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-extrabold uppercase text-slate-700">
                            Quantity ({selectedItem?.unit || 'unit'}) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            placeholder="e.g. 10"
                            value={quantityInput}
                            onChange={(e) => setQuantityInput(e.target.value)}
                            className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none"
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-extrabold uppercase text-slate-700">
                            Total Paid (₹) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="e.g. 1800"
                            value={totalPriceInput}
                            onChange={(e) => setTotalPriceInput(e.target.value)}
                            className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none"
                            required
                          />
                        </div>
                      </div>

                      {/* Note */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-extrabold uppercase text-slate-700">Note / Remark</label>
                        <input
                          type="text"
                          placeholder="e.g. morning fresh batch"
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none"
                        />
                      </div>

                      {/* Live Calculation Preview */}
                      {livePricePerUnit > 0 && (
                        <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col gap-2 shadow-md">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-400">Rate / {selectedItem?.unit || 'unit'}</span>
                            <span className="font-mono font-black text-base text-[#F5C518]">
                              ₹{livePricePerUnit.toFixed(2)} / {selectedItem?.unit}
                            </span>
                          </div>

                          {liveComparison && (
                            <div
                              className={`p-2.5 rounded-lg border text-xs font-bold flex items-center gap-2 ${
                                liveComparison.isPriceHigher
                                  ? 'bg-red-950/80 border-red-800 text-red-200'
                                  : liveComparison.isPriceEqual
                                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                                  : 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                              }`}
                            >
                              {liveComparison.isPriceHigher ? (
                                <TrendingUp className="w-4 h-4 text-red-400 shrink-0" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                              <span>
                                {liveComparison.isPriceHigher
                                  ? `▲ ₹${liveComparison.deltaPerUnit.toFixed(2)} higher (+${liveComparison.deltaPercent}%)`
                                  : `▼ ₹${Math.abs(liveComparison.deltaPerUnit).toFixed(2)} lower (${liveComparison.deltaPercent}%)`}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-[#C0181A] hover:bg-red-700 text-white text-xs font-black py-3 rounded-xl shadow-md transition-transform active:scale-95 mt-1"
                      >
                        {submitting ? 'Logging Entry...' : 'Save & Log Purchase Entry'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Right Col: Quick Recent Feed */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-2xs">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b pb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#C0181A]" />
                    <span>Recent Activity</span>
                  </h4>
                  {recentLogs.length === 0 ? (
                    <p className="text-xs italic text-slate-400 p-3">No purchases logged yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
                      {recentLogs.slice(0, 8).map((log) => {
                        const name = typeof log.itemId === 'object' ? log.itemId.name : log.itemName || 'Item';
                        const unit = typeof log.itemId === 'object' ? log.itemId.unit : log.itemUnit || 'unit';
                        return (
                          <div key={log._id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-1 text-xs">
                            <div className="flex justify-between items-center font-extrabold text-slate-900">
                              <span>{name}</span>
                              <span className="font-mono font-black">₹{log.totalPrice.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                              <span>{log.quantity} {unit} @ ₹{log.pricePerUnit.toFixed(2)}/{unit}</span>
                              <span className="font-mono text-[10px]">{log.purchaseDate.slice(0, 10)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ITEMS & CATEGORIES */}
            {activeTab === 'items' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-extrabold text-sm text-slate-900">Raw Material Item Profiles</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCategoryNameInput('');
                        setShowCategoryModal(true);
                      }}
                      className="bg-slate-100 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-xl border"
                    >
                      + Add Category
                    </button>
                    <button
                      onClick={() => {
                        setItemCategoryId(categories[0]?._id || '');
                        setItemNameInput('');
                        setShowItemModal(true);
                      }}
                      className="bg-[#C0181A] text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow"
                    >
                      + Add Item Profile
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {categories.map((cat) => {
                    const catItems = items.filter((i) => {
                      const cId = typeof i.categoryId === 'object' ? i.categoryId._id : i.categoryId;
                      return cId === cat._id;
                    });
                    return (
                      <div key={cat._id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-black text-xs uppercase tracking-wider text-slate-900">{cat.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500">{catItems.length} Items</span>
                            <button
                              onClick={() => {
                                setEditingCategory(cat);
                                setCategoryNameInput(cat.name);
                                setShowCategoryModal(true);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-800 rounded"
                              title="Rename Category"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat)}
                              className="p-1 text-red-400 hover:text-red-700 rounded"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                          {catItems.map((item) => (
                            <div key={item._id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-900">{item.name}</span>
                                <span className="font-mono text-[10px] font-bold text-slate-500">Unit: {item.unit}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingItem(item);
                                    setItemNameInput(item.name);
                                    setItemUnitInput(item.unit);
                                    const cId = typeof item.categoryId === 'object' ? item.categoryId._id : item.categoryId;
                                    setItemCategoryId(cId);
                                    setShowItemModal(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-800 rounded"
                                  title="Edit Item Profile"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item)}
                                  className="p-1 text-red-400 hover:text-red-700 rounded"
                                  title="Delete Item Profile"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: RECENT LOGS */}
            {activeTab === 'logs' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
                <h3 className="font-extrabold text-sm text-slate-900 border-b pb-3">Recent Purchase History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b text-[10px]">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Item Profile</th>
                        <th className="p-3">Quantity</th>
                        <th className="p-3">Total Paid</th>
                        <th className="p-3">Rate / Unit</th>
                        <th className="p-3">Vendor / Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-900 font-medium">
                      {recentLogs.map((log) => {
                        const name = typeof log.itemId === 'object' ? log.itemId.name : log.itemName || 'Item';
                        const unit = typeof log.itemId === 'object' ? log.itemId.unit : log.itemUnit || 'unit';
                        return (
                          <tr key={log._id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold">{log.purchaseDate.slice(0, 10)}</td>
                            <td className="p-3 font-extrabold">{name}</td>
                            <td className="p-3 font-mono">{log.quantity} {unit}</td>
                            <td className="p-3 font-mono font-black">₹{log.totalPrice.toLocaleString('en-IN')}</td>
                            <td className="p-3 font-mono font-bold">₹{log.pricePerUnit.toFixed(2)}/{unit}</td>
                            <td className="p-3 text-[11px] text-slate-500">{log.vendor || log.note || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateCategory} className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl">
            <h3 className="font-black text-base">Create Expense Category</h3>
            <input
              type="text"
              placeholder="e.g. Meat & Poultry, Packaging"
              value={categoryNameInput}
              onChange={(e) => setCategoryNameInput(e.target.value)}
              className="px-3.5 py-2.5 border rounded-xl text-xs font-bold"
              required
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-xs font-bold bg-slate-100 rounded-xl">
                Cancel
              </button>
              <button type="submit" disabled={savingCategory} className="bg-[#C0181A] text-white text-xs font-black px-4 py-2 rounded-xl shadow">
                {savingCategory ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateItem} className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl">
            <h3 className="font-black text-base">Create Item Profile</h3>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-extrabold uppercase text-slate-600">Category</label>
              <select
                value={itemCategoryId || (categories[0]?._id ?? '')}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className="px-3.5 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-900 outline-none cursor-pointer"
              >
                {categories.length === 0 ? (
                  <option value="">📁 General Raw Materials (Auto-Created)</option>
                ) : (
                  categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      📁 {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <input
              type="text"
              placeholder="e.g. Chicken (Fresh), Refined Oil"
              value={itemNameInput}
              onChange={(e) => setItemNameInput(e.target.value)}
              className="px-3.5 py-2.5 border rounded-xl text-xs font-bold"
              required
            />
            <select
              value={itemUnitInput}
              onChange={(e) => setItemUnitInput(e.target.value as any)}
              className="px-3.5 py-2.5 border rounded-xl text-xs font-bold bg-slate-50"
              required
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowItemModal(false)} className="px-4 py-2 text-xs font-bold bg-slate-100 rounded-xl">
                Cancel
              </button>
              <button type="submit" disabled={savingItem} className="bg-[#C0181A] text-white text-xs font-black px-4 py-2 rounded-xl shadow">
                {savingItem ? 'Creating...' : 'Create Item Profile'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
