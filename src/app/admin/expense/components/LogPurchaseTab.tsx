'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { AdminButton } from '@/components/ui';
import { PlainExpenseCategory, PlainExpenseItem, PlainExpenseLog } from '@/features/expense';
import { createExpenseLogAction, getExpenseLogsPaginatedAction } from '@/actions/expense';

interface Props {
  categories: PlainExpenseCategory[];
  items: PlainExpenseItem[];
  recentLogs: PlainExpenseLog[];
  onRefresh: () => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function LogPurchaseTab({ categories, items, recentLogs, onRefresh, onShowToast }: Props) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(todayStr);
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [totalPriceInput, setTotalPriceInput] = useState<string>('');
  const [vendorInput, setVendorInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);

  // Set default selected item
  useEffect(() => {
    if (items.length > 0 && !selectedItemId) {
      setSelectedItemId(items[0]._id);
    }
  }, [items, selectedItemId]);

  const selectedItem = useMemo(() => {
    return items.find((i) => i._id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // Find most recent prior log for selectedItem to compute live comparison preview
  const previousLog = useMemo(() => {
    if (!selectedItemId) return null;
    return (
      recentLogs.find((l) => {
        const id = typeof l.itemId === 'object' ? l.itemId._id : l.itemId;
        return id === selectedItemId;
      }) || null
    );
  }, [recentLogs, selectedItemId]);

  // Real-time calculation math
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
      onShowToast('Please select an item', 'error');
      return;
    }
    if (qty <= 0) {
      onShowToast('Quantity must be greater than 0', 'error');
      return;
    }
    if (total < 0) {
      onShowToast('Total price cannot be negative', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await createExpenseLogAction({
        itemId: selectedItemId,
        purchaseDate,
        quantity: qty,
        totalPrice: total,
        vendor: vendorInput.trim(),
        note: noteInput.trim(),
      });

      onShowToast(
        `Logged ${qty} ${selectedItem?.unit} of ${selectedItem?.name} for ₹${total.toLocaleString('en-IN')}`,
        'success'
      );

      // Reset numeric inputs & keep form ready for fast sequential entry
      setQuantityInput('');
      setTotalPriceInput('');
      setNoteInput('');
      await onRefresh();
    } catch (err) {
      console.error(err);
      onShowToast(err instanceof Error ? err.message : 'Failed to log purchase', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      {/* Left 2 Cols: High-Speed Log Purchase Form */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C0181A] text-white flex items-center justify-center shadow-md">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Log Daily Raw-Material Purchase</h3>
              <p className="text-xs text-slate-500 font-medium">
                High-speed daily entry for kitchen raw materials with real-time per-unit cost preview
              </p>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Please create item profiles under "Items & Categories" first before logging purchases.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Item Selector Grouped by Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                Select Raw Material Item <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none bg-slate-50 focus:bg-white focus:border-[#C0181A] cursor-pointer shadow-2xs"
                required
              >
                {categories.map((cat) => {
                  const catItems = items.filter((i) => {
                    const cId = typeof i.categoryId === 'object' ? i.categoryId._id : i.categoryId;
                    return cId === cat._id;
                  });

                  if (catItems.length === 0) return null;

                  return (
                    <optgroup key={cat._id} label={`📁 ${cat.name}`}>
                      {catItems.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name} ({item.unit})
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Purchase Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold uppercase text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Purchase Date <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#C0181A] font-mono cursor-pointer bg-slate-50"
                  required
                />
              </div>

              {/* Vendor */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold uppercase text-slate-700 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-slate-500" />
                  <span>Vendor / Supplier (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fortune Wholesalers, Standard Farm"
                  value={vendorInput}
                  onChange={(e) => setVendorInput(e.target.value)}
                  className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#C0181A]"
                />
              </div>

              {/* Quantity */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold uppercase text-slate-700 flex items-center justify-between">
                  <span>Quantity Purchased <span className="text-red-500">*</span></span>
                  {selectedItem && (
                    <span className="text-[10px] font-mono font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                      Unit: {selectedItem.unit}
                    </span>
                  )}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    placeholder="e.g. 10"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-[#C0181A] pr-16"
                    required
                  />
                  <span className="absolute right-3 text-xs font-extrabold text-slate-400 font-mono">
                    {selectedItem?.unit || 'units'}
                  </span>
                </div>
              </div>

              {/* Total Price Paid */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold uppercase text-slate-700">
                  Total Price Paid (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-black text-slate-400 font-mono">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 1800"
                    value={totalPriceInput}
                    onChange={(e) => setTotalPriceInput(e.target.value)}
                    className="w-full pl-7 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-[#C0181A]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase text-slate-700 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Note / Remark (Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. bought from new vendor due to morning rush"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-[#C0181A]"
              />
            </div>

            {/* Live Per-Unit Calculation & Comparison Card */}
            {livePricePerUnit > 0 && (
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col gap-2 shadow-lg border border-slate-800 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Calculated Per-{selectedItem?.unit || 'unit'} Cost
                  </span>
                  <span className="font-mono font-black text-lg text-[#F5C518]">
                    ₹{livePricePerUnit.toFixed(2)} / {selectedItem?.unit || 'unit'}
                  </span>
                </div>

                {liveComparison ? (
                  <div
                    className={`mt-1 p-3 rounded-xl border text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                      liveComparison.isPriceHigher
                        ? 'bg-red-950/80 border-red-800 text-red-200'
                        : liveComparison.isPriceEqual
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {liveComparison.isPriceHigher ? (
                        <TrendingUp className="w-4 h-4 text-red-400 shrink-0" />
                      ) : liveComparison.isPriceEqual ? (
                        <Zap className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <span>
                        {liveComparison.isPriceHigher
                          ? `▲ ₹${liveComparison.deltaPerUnit.toFixed(2)} more per ${selectedItem?.unit} (+${liveComparison.deltaPercent}%)`
                          : liveComparison.isPriceEqual
                          ? `Same rate as last purchase (₹${liveComparison.prevPricePerUnit.toFixed(2)} / ${selectedItem?.unit})`
                          : `▼ ₹${Math.abs(liveComparison.deltaPerUnit).toFixed(2)} less per ${selectedItem?.unit} (${liveComparison.deltaPercent}%)`}
                      </span>
                    </div>

                    {!liveComparison.isPriceEqual && (
                      <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded bg-black/40">
                        {liveComparison.isPriceHigher
                          ? `₹${liveComparison.deltaTotal.toFixed(2)} extra on this purchase`
                          : `Saved ₹${Math.abs(liveComparison.deltaTotal).toFixed(2)} on this purchase`}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] italic text-slate-400">
                    💡 First purchase log recorded for {selectedItem?.name} (no prior log to compare).
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <AdminButton type="submit" loading={submitting}>
                Save & Log Purchase Entry
              </AdminButton>
            </div>
          </form>
        )}
      </div>

      {/* Right Col: Recent Purchases Quick Feed */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-2xs">
        <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
          <Zap className="w-4 h-4 text-[#C0181A]" />
          <span>Recent Purchase Feed</span>
        </h4>

        {recentLogs.length === 0 ? (
          <p className="text-xs italic text-slate-400 p-4 bg-white rounded-xl border border-slate-200">
            No purchase logs recorded yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3 max-h-[550px] overflow-y-auto pr-1">
            {recentLogs.slice(0, 10).map((log) => {
              const name = typeof log.itemId === 'object' ? log.itemId.name : log.itemName || 'Item';
              const unit = typeof log.itemId === 'object' ? log.itemId.unit : log.itemUnit || 'unit';
              const isHigher = Boolean(log.deltaPerUnit && log.deltaPerUnit > 0);
              const isLower = Boolean(log.deltaPerUnit && log.deltaPerUnit < 0);

              return (
                <div key={log._id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col gap-1.5 shadow-2xs text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-extrabold text-slate-900">{name}</span>
                    <span className="font-mono font-black text-slate-900">₹{log.totalPrice.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
                    <span>{log.quantity} {unit} @ ₹{log.pricePerUnit.toFixed(2)}/{unit}</span>
                    <span className="font-mono text-[10px] text-slate-400">{log.purchaseDate.slice(0, 10)}</span>
                  </div>

                  {log.deltaPerUnit !== null && log.deltaPerUnit !== undefined && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isHigher ? (
                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          ▲ +₹{log.deltaPerUnit.toFixed(2)}/{unit} (+{log.deltaPercent}%)
                        </span>
                      ) : isLower ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ▼ -₹{Math.abs(log.deltaPerUnit).toFixed(2)}/{unit} ({log.deltaPercent}%)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Same rate
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
