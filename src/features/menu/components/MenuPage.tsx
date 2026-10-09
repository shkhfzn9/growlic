'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { getMenuItems, toggleMenuItemAvailability, deleteMenuItem } from '../services/menu.service';
import { increaseAllMenuPricesAction, decreaseAllMenuPricesAction } from '@/actions/menu';
import { getRestaurantDetails } from '@/actions/auth';
import Link from 'next/link';
import { Plus, Pencil, Trash2, ImageOff, Search, CheckCircle2, PackageX, PackageCheck, AlertCircle, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { PageHeader, AdminButton, EmptyState } from '@/components/ui';
import { MenuItem } from '../types/menu.types';
import { getVocabulary } from '@/config/businessVocabulary';
import AiMenuScanModal from './AiMenuScanModal';

export default function MenuPage() {
  const auth = useSelector((state: RootState) => state.auth);
  const [businessCategory, setBusinessCategory] = useState<string>('restaurant');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiScanModalOpen, setAiScanModalOpen] = useState(false);

  useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        const details = await getRestaurantDetails();
        if (details?.businessCategory) {
          setBusinessCategory(details.businessCategory);
        } else if (details?.themePreset === 'rose_quartz' || details?.themePreset === 'velvet_noir') {
          setBusinessCategory('salon');
        } else if (details?.themePreset === 'carbon_crimson' || details?.themePreset === 'cyber_cyan') {
          setBusinessCategory('detailing');
        }
      } catch (err) {
        console.error('Failed to load business details:', err);
      }
    };

    fetchBusinessInfo();
  }, []);

  const hasSalonCats = useMemo(() => {
    return items.some((i) => {
      const cat = i.category.toLowerCase();
      return cat.includes('hair') || cat.includes('spa') || cat.includes('facial') || cat.includes('nail') || cat.includes('treatment');
    });
  }, [items]);

  const hasDetailingCats = useMemo(() => {
    return items.some((i) => {
      const cat = i.category.toLowerCase();
      return cat.includes('coating') || cat.includes('detailing') || cat.includes('polish') || cat.includes('wrap');
    });
  }, [items]);

  const effectiveCategory = hasSalonCats ? 'salon' : hasDetailingCats ? 'detailing' : businessCategory;
  const vocab = getVocabulary(effectiveCategory);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [increasingPrices, setIncreasingPrices] = useState(false);
  const [decreasingPrices, setDecreasingPrices] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'outofstock'>('all');

  const loadMenu = async () => {
    if (!auth.restaurantId) return;
    try {
      setLoading(true);
      const menu = await getMenuItems(auth.restaurantId);
      setItems(menu);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load catalog items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.restaurantId) {
      Promise.resolve().then(() => loadMenu());
    }
  }, [auth.restaurantId]);

  const handleIncreaseAllPrices = async () => {
    if (!confirm(`Increase prices of ALL ${vocab.itemsNoun.toLowerCase()} by ₹1?`)) return;
    setIncreasingPrices(true);
    try {
      const res = await increaseAllMenuPricesAction(1);
      if (res.success) {
        setToastMsg(`Successfully updated prices! Increased by +₹1.`);
        await loadMenu();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to increase prices');
    } finally {
      setIncreasingPrices(false);
    }
  };

  const handleDecreaseAllPrices = async () => {
    if (!confirm(`Decrease prices of ALL ${vocab.itemsNoun.toLowerCase()} by ₹1?`)) return;
    setDecreasingPrices(true);
    try {
      const res = await decreaseAllMenuPricesAction(1);
      if (res.success) {
        setToastMsg(`Successfully updated prices! Decreased by -₹1.`);
        await loadMenu();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to decrease prices');
    } finally {
      setDecreasingPrices(false);
    }
  };

  const handleToggleStock = async (item: MenuItem) => {
    const newAvailable = !item.available;
    try {
      await toggleMenuItemAvailability(item._id, newAvailable);
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, available: newAvailable } : i))
      );
      setToastMsg(
        newAvailable
          ? `"${item.name}" marked as Available!`
          : `"${item.name}" marked as Unavailable! Customers can no longer add it.`
      );
      setTimeout(() => setToastMsg(''), 3500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle item availability.';
      alert(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Are you sure you want to delete this ${vocab.itemNoun.toLowerCase()}?`)) {
      try {
        await deleteMenuItem(id);
        setItems((prev) => prev.filter((item) => item._id !== id));
        setToastMsg(`${vocab.itemNoun} deleted.`);
        setTimeout(() => setToastMsg(''), 3000);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete item.';
        alert(message);
      }
    }
  };

  const inStockCount = useMemo(() => items.filter((i) => i.available !== false).length, [items]);
  const outOfStockCount = useMemo(() => items.filter((i) => i.available === false).length, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (stockFilter === 'instock') return item.available !== false;
      if (stockFilter === 'outofstock') return item.available === false;
      return true;
    });
  }, [items, searchQuery, stockFilter]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-40 bg-[#E2E6EA] rounded animate-pulse" />
        <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex gap-4 animate-pulse border-b border-[#E2E6EA] last:border-0">
              <div className="w-12 h-12 bg-[#E2E6EA] rounded-lg" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 w-32 bg-[#E2E6EA] rounded" />
                <div className="h-3 w-48 bg-[#E2E6EA] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-16">
      <PageHeader
        title={vocab.catalogTitle}
        subtitle={vocab.catalogSubtitle}
        actions={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <AdminButton
              variant="secondary"
              icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
              loading={increasingPrices}
              onClick={handleIncreaseAllPrices}
            >
              +₹1 Increase All
            </AdminButton>
            <AdminButton
              variant="secondary"
              icon={<TrendingDown className="w-4 h-4 text-amber-600" />}
              loading={decreasingPrices}
              onClick={handleDecreaseAllPrices}
            >
              -₹1 Decrease All
            </AdminButton>
            <AdminButton
              variant="secondary"
              icon={<Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />}
              onClick={() => setAiScanModalOpen(true)}
              className="bg-purple-50 hover:bg-purple-100 text-purple-950 border-purple-200"
            >
              ✨ AI Scan Menu Photo
            </AdminButton>
            <Link href="/admin/menu/new">
              <AdminButton icon={<Plus className="w-4 h-4" />}>{vocab.addItemTitle}</AdminButton>
            </Link>
          </div>
        }
      />

      {toastMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-sm text-emerald-800 font-semibold shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {error && (
        <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg p-3 text-sm text-[#DC2626] font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* FILTER & SEARCH CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-[#E2E6EA] rounded-xl p-4 shadow-xs">
        {/* Stock Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-[#F4F6F9] p-1 rounded-lg">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              stockFilter === 'all' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All Items ({items.length})
          </button>
          <button
            onClick={() => setStockFilter('instock')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              stockFilter === 'instock' ? 'bg-emerald-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            In Stock ({inStockCount})
          </button>
          <button
            onClick={() => setStockFilter('outofstock')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              stockFilter === 'outofstock' ? 'bg-red-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Out of Stock ({outOfStockCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search dish or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F4F6F9] border border-[#E2E6EA] focus:border-[#C0181A] rounded-lg pl-9 pr-4 py-2 text-xs font-semibold text-neutral-900 outline-none transition-colors"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No menu items"
          description="Add your first menu item to get started."
          action={
            <Link href="/admin/menu/new">
              <AdminButton icon={<Plus className="w-4 h-4" />}>Add Item</AdminButton>
            </Link>
          }
        />
      ) : (
        <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#E2E6EA]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] w-16">Image</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Item Details</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Category</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Price</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Stock Availability</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6EA]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-neutral-500 text-xs font-semibold">
                      No menu items match your search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isAvailable = item.available !== false;
                    return (
                      <tr
                        key={item._id}
                        className={`transition-colors ${
                          isAvailable ? 'hover:bg-[#F4F6F9]/50' : 'bg-red-50/20 hover:bg-red-50/40 opacity-80'
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          {item.image ? (
                            <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#F4F6F9] border border-[#E2E6EA] shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-[#F4F6F9] border border-[#E2E6EA] flex items-center justify-center shrink-0">
                              <ImageOff className="w-4 h-4 text-[#6B7280]" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`font-bold text-sm block ${isAvailable ? 'text-[#111827]' : 'text-red-950 line-through'}`}>
                            {item.name}
                          </span>
                          <span className="text-[12px] text-[#6B7280] line-clamp-1 mt-0.5">{item.description}</span>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-[#6B7280]">{item.category}</td>
                        <td className="px-4 py-3.5 text-right font-black text-[#111827]">₹{item.price}</td>

                        {/* Stock Availability Column */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                isAvailable
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-red-100 text-red-800 border border-red-200'
                              }`}
                            >
                              {isAvailable ? '● IN STOCK' : '✕ OUT OF STOCK'}
                            </span>
                          </div>
                        </td>

                        {/* Actions & Instant Stock Toggle */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex gap-2 justify-end items-center">
                            <button
                              onClick={() => handleToggleStock(item)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer ${
                                isAvailable
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                              title={isAvailable ? 'Mark item as Out of Stock' : 'Mark item as In Stock'}
                            >
                              {isAvailable ? (
                                <>
                                  <PackageX className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Mark Out of Stock</span>
                                </>
                              ) : (
                                <>
                                  <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Mark In Stock</span>
                                </>
                              )}
                            </button>

                            <Link href={`/admin/menu/edit/${item._id}`}>
                              <AdminButton variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />}>
                                Edit
                              </AdminButton>
                            </Link>

                            <AdminButton
                              variant="danger"
                              size="sm"
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                              onClick={() => handleDelete(item._id)}
                            >
                              Delete
                            </AdminButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AiMenuScanModal
        isOpen={aiScanModalOpen}
        onClose={() => setAiScanModalOpen(false)}
        onSuccess={(count) => {
          setToastMsg(`Successfully scanned & added ${count} ${vocab.itemNoun.toLowerCase()}${count > 1 ? 's' : ''} to store database!`);
          loadMenu();
          setTimeout(() => setToastMsg(''), 5000);
        }}
        businessCategory={effectiveCategory}
        itemNoun={vocab.itemNoun}
        catalogTitle={vocab.catalogTitle}
      />
    </div>
  );
}
