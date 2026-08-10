'use client';

import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Package,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Zap,
} from 'lucide-react';
import { AdminButton } from '@/components/ui';
import { PlainExpenseCategory, PlainExpenseItem } from '@/features/expense';
import {
  createExpenseCategoryAction,
  updateExpenseCategoryAction,
  deleteExpenseCategoryAction,
  createExpenseItemAction,
  updateExpenseItemAction,
  deleteExpenseItemAction,
  seedSampleExpenseDataAction,
} from '@/actions/expense';

interface Props {
  categories: PlainExpenseCategory[];
  items: PlainExpenseItem[];
  onRefresh: () => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'litre', label: 'Litre (litre)' },
  { value: 'gram', label: 'Gram (gram)' },
  { value: 'ml', label: 'Millilitre (ml)' },
  { value: 'piece', label: 'Piece (piece)' },
  { value: 'dozen', label: 'Dozen (dozen)' },
  { value: 'packet', label: 'Packet (packet)' },
];

export default function ItemsAndCategoriesTab({ categories, items, onRefresh, onShowToast }: Props) {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

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
  const [itemUnitInput, setItemUnitInput] = useState<any>('kg');
  const [savingItem, setSavingItem] = useState(false);

  const [seeding, setSeeding] = useState(false);

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Create or Rename Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) return;

    try {
      setSavingCategory(true);
      if (editingCategory) {
        await updateExpenseCategoryAction(editingCategory._id, categoryNameInput.trim());
        onShowToast(`Category renamed to "${categoryNameInput.trim()}"`, 'success');
      } else {
        await createExpenseCategoryAction(categoryNameInput.trim());
        onShowToast(`Category "${categoryNameInput.trim()}" created!`, 'success');
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryNameInput('');
      await onRefresh();
    } catch (err) {
      console.error(err);
      onShowToast(err instanceof Error ? err.message : 'Failed to save category', 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: PlainExpenseCategory) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    try {
      await deleteExpenseCategoryAction(cat._id);
      onShowToast(`Category "${cat.name}" deleted`, 'info');
      await onRefresh();
    } catch (err) {
      console.error(err);
      onShowToast(err instanceof Error ? err.message : 'Failed to delete category', 'error');
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemNameInput.trim()) return;

    try {
      setSavingItem(true);
      let targetCategoryId = itemCategoryId;
      if (!targetCategoryId) {
        const existingGenCat = categories.find((c) => c.name.toLowerCase().includes('general') || c.name.toLowerCase().includes('raw'));
        if (!existingGenCat) {
          const createdCat = await createExpenseCategoryAction('General Raw Materials');
          targetCategoryId = createdCat._id;
        } else {
          targetCategoryId = existingGenCat._id;
        }
      }

      if (editingItem) {
        await updateExpenseItemAction(editingItem._id, {
          name: itemNameInput.trim(),
          unit: itemUnitInput,
          categoryId: targetCategoryId,
        });
        onShowToast(`Item "${itemNameInput.trim()}" updated!`, 'success');
      } else {
        await createExpenseItemAction({
          categoryId: targetCategoryId,
          name: itemNameInput.trim(),
          unit: itemUnitInput,
        });
        onShowToast(`Item "${itemNameInput.trim()}" created!`, 'success');
      }
      setShowItemModal(false);
      setEditingItem(null);
      setItemNameInput('');
      await onRefresh();
    } catch (err) {
      console.error(err);
      onShowToast(err instanceof Error ? err.message : 'Failed to save item', 'error');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (item: PlainExpenseItem) => {
    if (!confirm(`Remove item profile "${item.name}"?`)) return;
    try {
      const res = await deleteExpenseItemAction(item._id);
      if (res.softDeleted) {
        onShowToast(`Archived item "${item.name}" (purchase history preserved)`, 'info');
      } else {
        onShowToast(`Deleted item "${item.name}"`, 'info');
      }
      await onRefresh();
    } catch (err) {
      console.error(err);
      onShowToast(err instanceof Error ? err.message : 'Failed to delete item', 'error');
    }
  };

  const handleSeedSampleData = async () => {
    if (!confirm('Seed 4 sample categories and 30-day raw material purchase logs for your restaurant?')) return;
    try {
      setSeeding(true);
      await seedSampleExpenseDataAction();
      onShowToast('Seeded 30-day sample raw material purchase history!', 'success');
      await onRefresh();
    } catch (err) {
      console.error(err);
      onShowToast('Failed to seed sample data', 'error');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#C0181A]" />
            <span>Raw Material Item Profiles ({items.length} Items, {categories.length} Categories)</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Define reusable items and categories to track per-unit costs and price trends
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={handleSeedSampleData}
              disabled={seeding}
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
              title="Dev Only: Populate 30 days of sample raw material logs"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{seeding ? 'Seeding...' : 'Seed 30-Day Sample Data (Dev)'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryNameInput('');
              setShowCategoryModal(true);
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Category</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setItemNameInput('');
              setItemUnitInput('kg');
              setItemCategoryId(categories[0]?._id || '');
              setShowItemModal(true);
            }}
            className="bg-[#C0181A] hover:bg-red-700 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md"
          >
            <Package className="w-4 h-4" />
            <span>+ Add Item Profile</span>
          </button>
        </div>
      </div>

      {/* Categories & Items Accordion List */}
      {categories.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center gap-3">
          <Package className="w-12 h-12 text-slate-300" />
          <h4 className="font-extrabold text-sm text-slate-900">No Expense Categories Defined</h4>
          <p className="text-xs text-slate-500 max-w-md">
            Get started by defining raw-material categories (Meat, Grocery, Packaging, Dairy) or seed 30-day sample data.
          </p>
          <button
            onClick={handleSeedSampleData}
            disabled={seeding}
            className="mt-2 bg-[#C0181A] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Seed 30-Day Sample Data</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {categories.map((cat) => {
            const catItems = items.filter((item) => {
              const cId = typeof item.categoryId === 'object' ? item.categoryId._id : item.categoryId;
              return cId === cat._id;
            });

            const isCollapsed = Boolean(collapsedCategories[cat._id]);

            return (
              <div key={cat._id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                {/* Category Header */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3.5 flex items-center justify-between">
                  <div
                    onClick={() => toggleCategoryCollapse(cat._id)}
                    className="flex items-center gap-2.5 cursor-pointer select-none"
                  >
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    <h4 className="font-black text-sm text-slate-900 uppercase tracking-wider">{cat.name}</h4>
                    <span className="text-[10px] font-black bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {catItems.length} {catItems.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        setItemNameInput('');
                        setItemUnitInput('kg');
                        setItemCategoryId(cat._id);
                        setShowItemModal(true);
                      }}
                      className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Item</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setCategoryNameInput(cat.name);
                        setShowCategoryModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Rename Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Items List */}
                {!isCollapsed && (
                  <div className="p-3">
                    {catItems.length === 0 ? (
                      <p className="text-xs italic text-slate-400 p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        No item profiles created in "{cat.name}" category yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {catItems.map((item) => (
                          <div
                            key={item._id}
                            className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between hover:bg-white transition-all shadow-2xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-900 text-[#F5C518] font-black text-sm flex items-center justify-center shrink-0">
                                {item.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-extrabold text-xs text-slate-900">{item.name}</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase">
                                  Standard Unit: <span className="text-slate-900 font-mono">{item.unit}</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setItemNameInput(item.name);
                                  setItemUnitInput(item.unit);
                                  const cId = typeof item.categoryId === 'object' ? item.categoryId._id : item.categoryId;
                                  setItemCategoryId(cId);
                                  setShowItemModal(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                                title="Edit Item Profile"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                title="Archive / Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCategory} className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base text-slate-900">
                {editingCategory ? 'Rename Category' : 'Create Expense Category'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase text-slate-600">Category Name</label>
              <input
                type="text"
                placeholder="e.g. Meat & Poultry, Packaging, Grocery"
                value={categoryNameInput}
                onChange={(e) => setCategoryNameInput(e.target.value)}
                className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#C0181A]"
                required
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <AdminButton type="submit" loading={savingCategory}>
                {editingCategory ? 'Save Changes' : 'Create Category'}
              </AdminButton>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveItem} className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base text-slate-900">
                {editingItem ? 'Edit Item Profile' : 'Add Item Profile'}
              </h3>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase text-slate-600">Expense Category</label>
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none bg-slate-50 cursor-pointer"
                required
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    📁 {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase text-slate-600">Item Name</label>
              <input
                type="text"
                placeholder="e.g. Chicken (Fresh), Refined Oil, Maida"
                value={itemNameInput}
                onChange={(e) => setItemNameInput(e.target.value)}
                className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#C0181A]"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase text-slate-600">Standard Purchase Unit</label>
              <select
                value={itemUnitInput}
                onChange={(e) => setItemUnitInput(e.target.value as any)}
                className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none bg-slate-50 cursor-pointer"
                required
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <AdminButton type="submit" loading={savingItem}>
                {editingItem ? 'Update Profile' : 'Create Item Profile'}
              </AdminButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
