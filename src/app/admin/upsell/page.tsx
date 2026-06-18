'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import {
  getUpsellConfig,
  updateMenuItemCategory,
  updateMenuItemPairsWith,
  updateMenuItemActive,
  savePairingRule,
  deletePairingRule,
  saveDiscountTier,
  deleteDiscountTier,
  saveComboRule,
  deleteComboRule,
} from '@/actions/upsell';

interface MenuItem {
  _id: string;
  category: string;
  name: string;
  price: number;
  pairsWithCategories: string[];
  active: boolean;
}

interface PairingRuleData {
  _id: string;
  triggerCategory: string;
  suggestCategories: string[];
  active: boolean;
  triggerCount: number;
}

interface DiscountTierData {
  _id: string;
  minSpend: number;
  percentOff: number;
  categoryScope: string | null;
  active: boolean;
}

interface ComboRuleData {
  _id: string;
  conditionCategory: string;
  conditionExcludeCategory: string | null;
  rewardType: 'free_item' | 'percent_off_item' | 'percent_off_order';
  rewardTarget: string;
  customerMessage: string;
  active: boolean;
  triggerCount: number;
}

const CATEGORY_TAGS = [
  'Classic Momos',
  'Momos Gravy Add Ons',
  'Momos Woksizzle',
  'Tokyo Rice Paradise',
  'Tokyo Rice Bowls',
  'Tokyo Special',
  'Tokyo Soups',
  'Tokyo Noodles',
  'Tokyo Rolls',
  'Chicken Salad',
  'Fit Meals',
  'Additional Snacks',
];

export default function AdminUpsellPage() {
  const auth = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState<'items' | 'pairings' | 'discounts' | 'combos'>('items');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [pairingRules, setPairingRules] = useState<PairingRuleData[]>([]);
  const [discountTiers, setDiscountTiers] = useState<DiscountTierData[]>([]);
  const [comboRules, setComboRules] = useState<ComboRuleData[]>([]);
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0);

  // Notice state
  const [hasDrinksCategory, setHasDrinksCategory] = useState(false);

  // Form states
  const [editingPairing, setEditingPairing] = useState<Partial<PairingRuleData> | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<Partial<DiscountTierData> | null>(null);
  const [editingCombo, setEditingCombo] = useState<Partial<ComboRuleData> | null>(null);

  // Dropdown pairings logic
  const [pairingTrigger, setPairingTrigger] = useState(CATEGORY_TAGS[0]);
  const [pairingSuggestions, setPairingSuggestions] = useState<string[]>([]);

  const loadData = async () => {
    if (!auth.restaurantId) return;
    try {
      setLoading(true);
      const res = await getUpsellConfig(auth.restaurantId);
      setMenuItems(res.menuItems);
      setPairingRules(res.pairingRules);
      setDiscountTiers(res.discountTiers);
      setComboRules(res.comboRules);
      setCompletedOrdersCount(res.completedCount);

      // Check if drinks category exists
      const drinksFound = res.menuItems.some(
        (item: MenuItem) =>
          item.category.toLowerCase().includes('drink') ||
          item.category.toLowerCase().includes('beverage')
      );
      setHasDrinksCategory(drinksFound);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch recommendation configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.restaurantId) {
      Promise.resolve().then(() => {
        loadData();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.restaurantId]);

  // Tab 1 handlers
  const handleCategoryChange = async (itemId: string, category: string) => {
    try {
      const updated = await updateMenuItemCategory(itemId, category);
      setMenuItems((prev) => prev.map((item) => (item._id === itemId ? updated : item)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Category update failed');
    }
  };

  const handlePairsWithChange = async (itemId: string, cat: string, isChecked: boolean) => {
    const item = menuItems.find((i) => i._id === itemId);
    if (!item) return;

    let updatedList = [...(item.pairsWithCategories || [])];
    if (isChecked) {
      if (!updatedList.includes(cat)) updatedList.push(cat);
    } else {
      updatedList = updatedList.filter((c) => c !== cat);
    }

    try {
      const updated = await updateMenuItemPairsWith(itemId, updatedList);
      setMenuItems((prev) => prev.map((i) => (i._id === itemId ? updated : i)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Pairings update failed');
    }
  };

  const handleItemActiveToggle = async (itemId: string, currentActive: boolean) => {
    try {
      const updated = await updateMenuItemActive(itemId, !currentActive);
      setMenuItems((prev) => prev.map((i) => (i._id === itemId ? updated : i)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'State toggle failed');
    }
  };

  // Tab 2: Pairing Rules CRUD
  const handleSavePairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pairingSuggestions.length === 0) {
      alert('Please select at least one suggestion category');
      return;
    }
    try {
      const payload = {
        _id: editingPairing?._id,
        triggerCategory: pairingTrigger,
        suggestCategories: pairingSuggestions,
        active: editingPairing ? editingPairing.active ?? true : true,
      };
      await savePairingRule(payload);
      setEditingPairing(null);
      setPairingSuggestions([]);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save rule failed');
    }
  };

  const handleTogglePairingActive = async (rule: PairingRuleData) => {
    try {
      await savePairingRule({
        ...rule,
        active: !rule.active,
      });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const handleDeletePairing = async (id: string) => {
    if (confirm('Are you sure you want to delete this pairing rule?')) {
      try {
        await deletePairingRule(id);
        loadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Delete failed');
      }
    }
  };

  // Tab 3: Discount Tiers CRUD
  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiscount?.minSpend || !editingDiscount.percentOff) {
      alert('Please fill all discount fields');
      return;
    }
    try {
      await saveDiscountTier({
        _id: editingDiscount._id,
        minSpend: Number(editingDiscount.minSpend),
        percentOff: Number(editingDiscount.percentOff),
        categoryScope: editingDiscount.categoryScope || null,
        active: editingDiscount.active ?? true,
      });
      setEditingDiscount(null);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save tier failed');
    }
  };

  const handleToggleDiscountActive = async (tier: DiscountTierData) => {
    try {
      await saveDiscountTier({
        _id: tier._id,
        minSpend: tier.minSpend,
        percentOff: tier.percentOff,
        categoryScope: tier.categoryScope,
        active: tier.active === false ? true : false,
      });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    if (confirm('Delete this discount tier?')) {
      try {
        await deleteDiscountTier(id);
        loadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Delete failed');
      }
    }
  };

  // Tab 4: Combo Rules CRUD
  const handleSaveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCombo?.conditionCategory || !editingCombo.rewardType || !editingCombo.rewardTarget || !editingCombo.customerMessage) {
      alert('Please fill all combo builder fields');
      return;
    }
    try {
      await saveComboRule({
        _id: editingCombo._id,
        conditionCategory: editingCombo.conditionCategory,
        conditionExcludeCategory: editingCombo.conditionExcludeCategory || null,
        rewardType: editingCombo.rewardType,
        rewardTarget: editingCombo.rewardTarget,
        customerMessage: editingCombo.customerMessage,
        active: editingCombo.active ?? true,
      });
      setEditingCombo(null);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save combo failed');
    }
  };

  const handleToggleComboActive = async (rule: ComboRuleData) => {
    try {
      await saveComboRule({
        ...rule,
        active: !rule.active,
      });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const handleDeleteCombo = async (id: string) => {
    if (confirm('Delete this combo rule?')) {
      try {
        await deleteComboRule(id);
        loadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Delete failed');
      }
    }
  };

  // Dynamic preview helper for category pairings
  const getPairingPreviewText = (trigger: string, suggestions: string[]) => {
    if (suggestions.length === 0) return 'Select categories to see live preview...';
    const suggestionsStr = suggestions.join(' or ');
    return `When a customer adds a "${trigger}" item, we'll suggest a "${suggestionsStr}".`;
  };

  if (loading && menuItems.length === 0) {
    return <div className="font-mono-custom text-xs text-center py-12">LOADING PAIRINGS PANEL CONFIG...</div>;
  }

  return (
    <div className="font-mono-custom flex flex-col gap-6">
      {/* Title */}
      <div className="border-b border-black pb-4">
        <h1 className="text-2xl font-bold uppercase">Upsell & Pairing Panel</h1>
        <span className="text-xs uppercase text-zinc-500">Configure psychological triggers, pairings, and combos</span>
      </div>

      {/* Drinks gap notice */}
      {!hasDrinksCategory && (
        <div className="border-2 border-amber-600 bg-amber-50 p-4 text-xs font-bold text-amber-900 uppercase">
          ⚠️ NOTICE: There is no drinks/beverages category configured in the menu. Any combo or freebie rules referencing drinks will automatically fall back to the cheapest Soup or Side Snack in the customer&apos;s cart until a beverages category is added.
        </div>
      )}

      {/* Analytics info */}
      <div className="border border-black p-3 bg-zinc-50 flex justify-between text-[10px] uppercase font-bold">
        <span>Order Volume: {completedOrdersCount} completed orders</span>
        <span className={completedOrdersCount >= 50 ? 'text-green-700' : 'text-zinc-500'}>
          {completedOrdersCount >= 50
            ? '✓ Data-Driven Affinity Engine Unlocked'
            : 'Cold-starting: Manual category tags fallback active (<50 orders)'}
        </span>
      </div>

      {error && (
        <div className="border border-black p-3 text-xs bg-zinc-100 font-bold text-red-600 uppercase">
          ⚠️ {error}
        </div>
      )}

      {/* Tab Selectors */}
      <div className="flex gap-2 border-b border-black overflow-x-auto pb-1">
        {[
          { id: 'items', label: `Step 1: Item Categories (${menuItems.filter(i => i.active).length} Active)` },
          { id: 'pairings', label: `Step 2: Category Pairings (${pairingRules.filter(r => r.active).length} Active)` },
          { id: 'discounts', label: `Step 3: Discount Tiers (${discountTiers.filter(t => t.active !== false).length} Active)` },
          { id: 'combos', label: `Step 4: Combo Rules (${comboRules.filter(c => c.active).length} Active)` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'items' | 'pairings' | 'discounts' | 'combos')}
            className={`px-3 py-1.5 text-[10px] font-bold border border-black cursor-pointer uppercase whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ITEM CATEGORIES */}
      {activeTab === 'items' && (
        <div className="flex flex-col gap-4">
          <div className="text-xs uppercase text-zinc-500 border-b border-zinc-200 pb-2">
            Assign menu items to categories and configure custom pairings override.
          </div>
          <div className="border border-black overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-black bg-zinc-50 font-bold text-[10px] uppercase">
                  <th className="p-3 border-r border-black w-1/3">Item Details</th>
                  <th className="p-3 border-r border-black w-1/4">Category Tag</th>
                  <th className="p-3 border-r border-black">Pairs With Category Overrides</th>
                  <th className="p-3 w-28 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-[11px] uppercase">
                {menuItems.map((item) => (
                  <tr key={item._id} className="hover:bg-zinc-50">
                    <td className="p-3 border-r border-black">
                      <span className="font-bold text-sm block">{item.name}</span>
                      <span className="text-[10px] text-zinc-500 block">Price: ₹{item.price}</span>
                    </td>
                    <td className="p-3 border-r border-black">
                      <select
                        value={item.category}
                        onChange={(e) => handleCategoryChange(item._id, e.target.value)}
                        className="text-[10px] p-1.5 border border-black bg-white w-full uppercase"
                      >
                        {CATEGORY_TAGS.map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 border-r border-black">
                      <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {CATEGORY_TAGS.map((cat) => (
                          <label key={cat} className="flex items-center gap-1.5 cursor-pointer text-[9px]">
                            <input
                              type="checkbox"
                              checked={item.pairsWithCategories?.includes(cat) || false}
                              onChange={(e) => handlePairsWithChange(item._id, cat, e.target.checked)}
                              className="w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="truncate">{cat}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleItemActiveToggle(item._id, item.active)}
                        className={`font-bold px-2 py-1 text-[9px] border cursor-pointer w-full transition-all ${
                          item.active
                            ? 'border-black bg-black text-white hover:bg-zinc-800'
                            : 'border-zinc-300 text-zinc-400 hover:bg-zinc-100'
                        }`}
                      >
                        {item.active ? 'ACTIVE' : 'INACTIVE'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORY PAIRINGS */}
      {activeTab === 'pairings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Rule Creator */}
          <form onSubmit={handleSavePairing} className="border border-black p-5 bg-white flex flex-col gap-4 lg:col-span-1">
            <h3 className="font-bold text-xs uppercase border-b border-black pb-2">
              {editingPairing ? 'Edit Pairing Rule' : 'Create Pairing Rule'}
            </h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase">When customer has item from category:</label>
              <select
                value={pairingTrigger}
                onChange={(e) => setPairingTrigger(e.target.value)}
                className="text-xs p-2 border border-black bg-white w-full"
              >
                {CATEGORY_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase">Suggest items from category (Multi-select):</label>
              <div className="border border-black p-3 max-h-48 overflow-y-auto bg-zinc-50 flex flex-col gap-2">
                {CATEGORY_TAGS.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-xs uppercase cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pairingSuggestions.includes(cat)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPairingSuggestions((prev) => [...prev, cat]);
                        } else {
                          setPairingSuggestions((prev) => prev.filter((item) => item !== cat));
                        }
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Plain English live preview */}
            <div className="border border-dashed border-black p-3 bg-amber-50 text-[10px] font-bold text-zinc-700 uppercase">
              <strong>Live Preview:</strong>
              <p className="mt-1 normal-case italic font-sans">{getPairingPreviewText(pairingTrigger, pairingSuggestions)}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 border border-black bg-black text-white hover:bg-white hover:text-black py-2 text-xs font-bold uppercase cursor-pointer transition-all"
              >
                {editingPairing ? '[ UPDATE RULE ]' : '[ ADD PAIRING ]'}
              </button>
              {editingPairing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPairing(null);
                    setPairingSuggestions([]);
                  }}
                  className="border border-black bg-white text-black hover:bg-zinc-100 px-3 py-2 text-xs font-bold uppercase cursor-pointer"
                >
                  [ CANCEL ]
                </button>
              )}
            </div>
          </form>

          {/* Rules List */}
          <div className="lg:col-span-2 border border-black p-5 bg-white flex flex-col gap-4">
            <h3 className="font-bold text-xs uppercase border-b border-black pb-2">Active Category Pairings</h3>
            {pairingRules.length === 0 ? (
              <div className="border border-dashed border-black p-8 text-center text-xs uppercase text-zinc-400">
                No pairing rules configured.
              </div>
            ) : (
              <div className="border border-black bg-white overflow-hidden divide-y divide-black">
                {pairingRules.map((rule) => (
                  <div key={rule._id} className="p-4 flex justify-between items-start gap-4 hover:bg-zinc-50">
                    <div className="flex-1 flex flex-col gap-1 text-[11px] uppercase">
                      <div className="flex gap-2 items-center">
                        <span className="font-bold bg-black text-white px-2 py-0.5 text-[9px]">
                          IF {rule.triggerCategory}
                        </span>
                        <span className="text-zinc-400">→</span>
                        <span className="font-bold border border-black px-2 py-0.5 text-[9px]">
                          SUGGEST {rule.suggestCategories.join(', ')}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-2 font-sans italic normal-case">
                        {getPairingPreviewText(rule.triggerCategory, rule.suggestCategories)}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-400 mt-1 uppercase">
                        Triggers: {rule.triggerCount || 0} times
                      </span>
                    </div>

                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => handleTogglePairingActive(rule)}
                        className={`text-[9px] font-bold px-2 py-1 border cursor-pointer ${
                          rule.active ? 'border-black bg-zinc-100' : 'border-zinc-300 text-zinc-400'
                        }`}
                      >
                        {rule.active ? 'ACTIVE' : 'PAUSED'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingPairing(rule);
                          setPairingTrigger(rule.triggerCategory);
                          setPairingSuggestions(rule.suggestCategories);
                        }}
                        className="text-[9px] font-bold border border-black px-2 py-1 bg-white hover:bg-zinc-100 cursor-pointer"
                      >
                        [ EDIT ]
                      </button>
                      <button
                        onClick={() => handleDeletePairing(rule._id)}
                        className="text-[9px] font-bold border border-red-600 text-red-600 px-2 py-1 bg-white hover:bg-red-50 cursor-pointer"
                      >
                        [ DELETE ]
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DISCOUNT TIERS */}
      {activeTab === 'discounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Creator Form */}
          <form onSubmit={handleSaveDiscount} className="border border-black p-5 bg-white flex flex-col gap-4 lg:col-span-1">
            <h3 className="font-bold text-xs uppercase border-b border-black pb-2">
              {editingDiscount ? 'Edit Discount Tier' : 'Add Discount Tier'}
            </h3>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase">Spend Amount Threshold (₹):</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 399"
                value={editingDiscount?.minSpend || ''}
                onChange={(e) => setEditingDiscount((prev) => ({ ...prev, minSpend: Number(e.target.value) }))}
                className="text-xs p-2 border border-black w-full"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase">Discount Percentage (%):</label>
              <input
                type="number"
                min="1"
                max="100"
                placeholder="e.g. 10"
                value={editingDiscount?.percentOff || ''}
                onChange={(e) => setEditingDiscount((prev) => ({ ...prev, percentOff: Number(e.target.value) }))}
                className="text-xs p-2 border border-black w-full"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase">Applies to category scope (Optional):</label>
              <select
                value={editingDiscount?.categoryScope || ''}
                onChange={(e) => setEditingDiscount((prev) => ({ ...prev, categoryScope: e.target.value || null }))}
                className="text-xs p-2 border border-black bg-white w-full uppercase"
              >
                <option value="">ALL ITEMS</option>
                {CATEGORY_TAGS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="border border-dashed border-black p-3 bg-amber-50 text-[10px] font-bold text-zinc-700 uppercase">
              <strong>Info:</strong>
              <p className="mt-1 normal-case italic font-sans text-zinc-600">
                When a customer&apos;s cart reaches the spend amount, they&apos;ll automatically see this discount as a goal to unlock.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 border border-black bg-black text-white hover:bg-white hover:text-black py-2 text-xs font-bold uppercase cursor-pointer transition-all"
              >
                {editingDiscount ? '[ UPDATE TIER ]' : '[ ADD TIER ]'}
              </button>
              {editingDiscount && (
                <button
                  type="button"
                  onClick={() => setEditingDiscount(null)}
                  className="border border-black bg-white text-black hover:bg-zinc-100 px-3 py-2 text-xs font-bold uppercase cursor-pointer"
                >
                  [ CANCEL ]
                </button>
              )}
            </div>
          </form>

          {/* List Tiers */}
          <div className="lg:col-span-2 border border-black p-5 bg-white flex flex-col gap-4">
            <h3 className="font-bold text-xs uppercase border-b border-black pb-2">Active Discount Tiers</h3>
            {discountTiers.length === 0 ? (
              <div className="border border-dashed border-black p-8 text-center text-xs uppercase text-zinc-400">
                No discount tiers configured.
              </div>
            ) : (
              <div className="border border-black overflow-x-auto bg-white">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-black bg-zinc-50 font-bold text-[10px] uppercase">
                      <th className="p-3 border-r border-black w-1/4">Min Spend Required</th>
                      <th className="p-3 border-r border-black w-1/4">Discount Percentage</th>
                      <th className="p-3 border-r border-black w-1/4">Scope Target</th>
                      <th className="p-3 border-r border-black w-24 text-center">Status</th>
                      <th className="p-3 text-center w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black text-xs uppercase font-mono-custom">
                    {discountTiers.map((tier) => (
                      <tr key={tier._id} className="hover:bg-zinc-50">
                        <td className="p-3 border-r border-black font-bold">₹{tier.minSpend}</td>
                        <td className="p-3 border-r border-black font-bold text-green-700">{tier.percentOff}% OFF</td>
                        <td className="p-3 border-r border-black">{tier.categoryScope || 'ALL ITEMS'}</td>
                        <td className="p-3 border-r border-black text-center">
                          <button
                            onClick={() => handleToggleDiscountActive(tier)}
                            className={`text-[9px] font-bold px-2 py-1 border cursor-pointer w-full transition-all ${
                              tier.active !== false ? 'border-black bg-zinc-100' : 'border-zinc-300 text-zinc-400'
                            }`}
                          >
                            {tier.active !== false ? 'ACTIVE' : 'PAUSED'}
                          </button>
                        </td>
                        <td className="p-3 text-center flex gap-2 justify-center">
                          <button
                            onClick={() => setEditingDiscount(tier)}
                            className="text-[9px] font-bold border border-black px-2 py-1 bg-white hover:bg-zinc-100 cursor-pointer"
                          >
                            [ EDIT ]
                          </button>
                          <button
                            onClick={() => handleDeleteDiscount(tier._id)}
                            className="text-[9px] font-bold border border-red-600 text-red-600 px-2 py-1 bg-white hover:bg-red-50 cursor-pointer"
                          >
                            [ DELETE ]
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: COMBO RULES */}
      {activeTab === 'combos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Creator Form Card */}
          <form onSubmit={handleSaveCombo} className="border border-black p-5 bg-white flex flex-col gap-4 lg:col-span-1">
            <h3 className="font-bold text-xs uppercase border-b border-black pb-2">
              {editingCombo ? 'Edit Combo Rule' : 'Add Combo Rule'}
            </h3>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase">IF customer has items from category:</label>
              <input
                type="text"
                placeholder="e.g. Classic Momos (or subtotal:350)"
                value={editingCombo?.conditionCategory || ''}
                onChange={(e) => setEditingCombo((prev) => ({ ...prev, conditionCategory: e.target.value }))}
                className="text-xs p-2 border border-black w-full"
                required
              />
              <span className="text-[9px] text-zinc-400 uppercase">comma-separate multiple, or use `subtotal:350` / `momos_variety`</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase">AND does NOT have category (Optional):</label>
              <input
                type="text"
                placeholder="e.g. Tokyo Soups"
                value={editingCombo?.conditionExcludeCategory || ''}
                onChange={(e) => setEditingCombo((prev) => ({ ...prev, conditionExcludeCategory: e.target.value || null }))}
                className="text-xs p-2 border border-black w-full"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase">THEN Reward Type:</label>
              <select
                value={editingCombo?.rewardType || 'free_item'}
                onChange={(e) => setEditingCombo((prev) => ({ ...prev, rewardType: e.target.value as 'free_item' | 'percent_off_item' | 'percent_off_order' }))}
                className="text-xs p-2 border border-black bg-white w-full uppercase"
                required
              >
                <option value="free_item">Free Item</option>
                <option value="percent_off_item">Percent Off Specific Item</option>
                <option value="percent_off_order">Percent Off Whole Order</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase">Reward Target:</label>
              <input
                type="text"
                placeholder="e.g. Tokyo Soups (or category:15 / cheapest_momo)"
                value={editingCombo?.rewardTarget || ''}
                onChange={(e) => setEditingCombo((prev) => ({ ...prev, rewardTarget: e.target.value }))}
                className="text-xs p-2 border border-black w-full"
                required
              />
              <span className="text-[9px] text-zinc-400 uppercase">Use category name, or tag `cheapest_momo`, or category:15 for 15% off</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase">Customer sees this message:</label>
              <input
                type="text"
                placeholder="e.g. Add a soup, it's on us with 2+ momos"
                value={editingCombo?.customerMessage || ''}
                onChange={(e) => setEditingCombo((prev) => ({ ...prev, customerMessage: e.target.value }))}
                className="text-xs p-2 border border-black w-full"
                required
              />
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="flex-1 border border-black bg-black text-white hover:bg-white hover:text-black py-2 text-xs font-bold uppercase cursor-pointer transition-all"
              >
                {editingCombo ? '[ UPDATE COMBO ]' : '[ ADD COMBO ]'}
              </button>
              {editingCombo && (
                <button
                  type="button"
                  onClick={() => setEditingCombo(null)}
                  className="border border-black bg-white text-black hover:bg-zinc-100 px-3 py-2 text-xs font-bold uppercase cursor-pointer"
                >
                  [ CANCEL ]
                </button>
              )}
            </div>
          </form>

          {/* Cards list */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h3 className="font-bold text-xs uppercase border-b border-black pb-2">Active Combo Rules</h3>
            {comboRules.length === 0 ? (
              <div className="border border-dashed border-black p-8 text-center text-xs uppercase text-zinc-400">
                No combo cards configured.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {comboRules.map((rule) => (
                  <div key={rule._id} className="border border-black p-4 bg-white flex flex-col justify-between gap-4 shadow-sm relative">
                    <span className="absolute top-2 right-2 text-[9px] font-bold text-zinc-400 uppercase">
                      Triggered: {rule.triggerCount || 0} times
                    </span>
                    <div className="flex flex-col gap-2 uppercase">
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 w-fit border border-dashed border-amber-400">
                        Starter rule — customize or delete
                      </span>
                      <div className="text-[10px] font-bold text-zinc-700 mt-2">
                        <span className="text-zinc-400 font-normal">IF has:</span> {rule.conditionCategory}
                        {rule.conditionExcludeCategory && (
                          <>
                            <br />
                            <span className="text-zinc-400 font-normal">AND does NOT have:</span> {rule.conditionExcludeCategory}
                          </>
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-green-700">
                        <span className="text-zinc-400 font-normal">THEN:</span> {rule.rewardType.replace('_', ' ')} ({rule.rewardTarget})
                      </div>
                      <div className="border border-zinc-200 p-2 bg-zinc-50 text-[10px] text-zinc-600 italic font-sans normal-case mt-1">
                        &quot;{rule.customerMessage}&quot;
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-zinc-100">
                      <button
                        onClick={() => handleToggleComboActive(rule)}
                        className={`text-[9px] font-bold px-2 py-1 border cursor-pointer ${
                          rule.active ? 'border-black bg-zinc-100' : 'border-zinc-300 text-zinc-400'
                        }`}
                      >
                        {rule.active ? 'ACTIVE' : 'PAUSED'}
                      </button>
                      <button
                        onClick={() => setEditingCombo(rule)}
                        className="text-[9px] font-bold border border-black px-2 py-1 bg-white hover:bg-zinc-100 cursor-pointer"
                      >
                        [ EDIT ]
                      </button>
                      <button
                        onClick={() => handleDeleteCombo(rule._id)}
                        className="text-[9px] font-bold border border-red-600 text-red-600 px-2 py-1 bg-white hover:bg-red-50 cursor-pointer"
                      >
                        [ DELETE ]
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
