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
} from '../services/menu.service';
import { PageHeader, StatusBadge, AdminButton, EmptyState } from '@/components/ui';
import { AlertTriangle, Pencil, Trash2, Pause, Play, Info, Lightbulb, Ban, CheckCircle2, Zap, Percent, Layers, Tag } from 'lucide-react';
import { MenuItem, PairingRuleData, DiscountTierData, ComboRuleData } from '../types/menu.types';
import { getRestaurantDetails } from '@/actions/auth';
import { getDomainCategories, getDomainAddonInfo, getVocabulary } from '@/config/businessVocabulary';

export default function UpsellPage() {
  const auth = useSelector((state: RootState) => state.auth);
  const [businessCategory, setBusinessCategory] = useState<string>('restaurant');
  const [activeTab, setActiveTab] = useState<'items' | 'pairings' | 'discounts' | 'combos'>('items');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [pairingRules, setPairingRules] = useState<PairingRuleData[]>([]);
  const [discountTiers, setDiscountTiers] = useState<DiscountTierData[]>([]);
  const [comboRules, setComboRules] = useState<ComboRuleData[]>([]);
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0);
  const [hasDrinksCategory, setHasDrinksCategory] = useState(false);

  const [editingPairing, setEditingPairing] = useState<Partial<PairingRuleData> | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<Partial<DiscountTierData> | null>(null);
  const [editingCombo, setEditingCombo] = useState<Partial<ComboRuleData> | null>(null);

  const hasSalonItems = menuItems.some((i) =>
    i.category?.toLowerCase().includes('hair') ||
    i.category?.toLowerCase().includes('skin') ||
    i.category?.toLowerCase().includes('spa') ||
    i.category?.toLowerCase().includes('facial') ||
    i.category?.toLowerCase().includes('nail') ||
    i.category?.toLowerCase().includes('treatment')
  );
  const hasDetailingItems = menuItems.some((i) =>
    i.category?.toLowerCase().includes('coating') ||
    i.category?.toLowerCase().includes('wash') ||
    i.category?.toLowerCase().includes('paint') ||
    i.category?.toLowerCase().includes('polish')
  );
  const effectiveCategory = hasSalonItems ? 'salon' : hasDetailingItems ? 'detailing' : businessCategory;

  const domainDefaultCategories = getDomainCategories(effectiveCategory);
  const itemCategories = Array.from(new Set(menuItems.map((i) => i.category).filter(Boolean)));
  const availableCategories = Array.from(new Set([...itemCategories, ...domainDefaultCategories]));

  const vocab = getVocabulary(effectiveCategory);
  const addonInfo = getDomainAddonInfo(effectiveCategory);

  const [pairingTrigger, setPairingTrigger] = useState('');
  const [pairingSuggestions, setPairingSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (availableCategories.length > 0 && !pairingTrigger) {
      setPairingTrigger(availableCategories[0]);
    }
  }, [availableCategories, pairingTrigger]);

  const loadData = async () => {
    if (!auth.restaurantId) return;
    try {
      setLoading(true);
      const [res, details] = await Promise.all([
        getUpsellConfig(auth.restaurantId),
        getRestaurantDetails(),
      ]);
      const bizCat = details?.businessCategory || 'restaurant';
      setBusinessCategory(bizCat);

      const items: MenuItem[] = res.menuItems || [];
      const isSalonStore = bizCat === 'salon' || items.some((i) =>
        i.category?.toLowerCase().includes('hair') ||
        i.category?.toLowerCase().includes('skin') ||
        i.category?.toLowerCase().includes('spa') ||
        i.category?.toLowerCase().includes('facial') ||
        i.category?.toLowerCase().includes('nail') ||
        i.category?.toLowerCase().includes('treatment')
      );
      const isDetailingStore = bizCat === 'detailing' || items.some((i) =>
        i.category?.toLowerCase().includes('coating') ||
        i.category?.toLowerCase().includes('wash') ||
        i.category?.toLowerCase().includes('paint') ||
        i.category?.toLowerCase().includes('polish')
      );
      const activeBiz = isSalonStore ? 'salon' : isDetailingStore ? 'detailing' : bizCat;

      const rawCombos: ComboRuleData[] = res.comboRules || [];
      const sanitizedCombos = rawCombos.map((rule) => {
        const isFoodRule =
          rule.conditionCategory?.toLowerCase().includes('momo') ||
          rule.rewardTarget?.toLowerCase().includes('drink') ||
          rule.customerMessage?.toLowerCase().includes('momo') ||
          rule.customerMessage?.toLowerCase().includes('drink');
        if (isFoodRule && activeBiz === 'salon') {
          return {
            ...rule,
            conditionCategory: 'Hair Styling & Treatment',
            conditionExcludeCategory: 'Skin & Facial Care',
            rewardTarget: 'Skin & Facial Care:50',
            customerMessage: 'Free Hair Wash & Styling with any Hair Color!',
          };
        }
        if (isFoodRule && activeBiz === 'detailing') {
          return {
            ...rule,
            conditionCategory: 'Paint Protection & Coating',
            conditionExcludeCategory: 'Wash & Polish',
            rewardTarget: 'Wash & Polish:50',
            customerMessage: 'Free Interior Detailing with Ceramic Coating!',
          };
        }
        if (isFoodRule && activeBiz === 'retail') {
          return {
            ...rule,
            conditionCategory: 'Apparel & Fashion',
            conditionExcludeCategory: 'Footwear & Accessories',
            rewardTarget: 'Footwear & Accessories:50',
            customerMessage: 'Buy 2 Get 1 FREE on all Fashion Apparel!',
          };
        }
        return rule;
      });

      const rawPairings: PairingRuleData[] = res.pairingRules || [];
      const sanitizedPairings = rawPairings.map((rule) => {
        const isFoodRule =
          rule.triggerCategory?.toLowerCase().includes('momo') ||
          rule.suggestCategories?.some((c) => c.toLowerCase().includes('drink'));
        if (isFoodRule && activeBiz === 'salon') {
          return {
            ...rule,
            triggerCategory: 'Hair Styling & Treatment',
            suggestCategories: ['Skin & Facial Care'],
          };
        }
        if (isFoodRule && activeBiz === 'detailing') {
          return {
            ...rule,
            triggerCategory: 'Paint Protection & Coating',
            suggestCategories: ['Wash & Polish'],
          };
        }
        if (isFoodRule && activeBiz === 'retail') {
          return {
            ...rule,
            triggerCategory: 'Apparel & Fashion',
            suggestCategories: ['Footwear & Accessories'],
          };
        }
        return rule;
      });

      setMenuItems(items);
      setPairingRules(sanitizedPairings);
      setDiscountTiers(res.discountTiers || []);
      setComboRules(sanitizedCombos);
      setCompletedOrdersCount(res.completedCount || 0);
      setHasDrinksCategory(items.some(
        (item: MenuItem) => item.category?.toLowerCase().includes('drink') || item.category?.toLowerCase().includes('beverage')
      ));
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch recommendation configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.restaurantId) { Promise.resolve().then(() => loadData()); }
  }, [auth.restaurantId]);

  const handleCategoryChange = async (itemId: string, category: string) => {
    try {
      const updated = await updateMenuItemCategory(itemId, category);
      setMenuItems((prev) => prev.map((item) => (item._id === itemId ? updated : item)));
    } catch (err) { alert(err instanceof Error ? err.message : 'Category update failed'); }
  };

  const handlePairsWithChange = async (itemId: string, cat: string, isChecked: boolean) => {
    const item = menuItems.find((i) => i._id === itemId);
    if (!item) return;
    let updatedList = [...(item.pairsWithCategories || [])];
    if (isChecked) { if (!updatedList.includes(cat)) updatedList.push(cat); }
    else { updatedList = updatedList.filter((c) => c !== cat); }
    try {
      const updated = await updateMenuItemPairsWith(itemId, updatedList);
      setMenuItems((prev) => prev.map((i) => (i._id === itemId ? updated : i)));
    } catch (err) { alert(err instanceof Error ? err.message : 'Pairings update failed'); }
  };

  const handleItemActiveToggle = async (itemId: string, currentActive: boolean) => {
    try {
      const updated = await updateMenuItemActive(itemId, !currentActive);
      setMenuItems((prev) => prev.map((i) => (i._id === itemId ? updated : i)));
    } catch (err) { alert(err instanceof Error ? err.message : 'Toggle failed'); }
  };

  const handleSavePairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pairingSuggestions.length === 0) { alert('Select at least one suggestion category'); return; }
    try {
      await savePairingRule({
        _id: editingPairing?._id,
        triggerCategory: pairingTrigger || availableCategories[0],
        suggestCategories: pairingSuggestions,
        active: editingPairing ? editingPairing.active ?? true : true,
      });
      setEditingPairing(null);
      setPairingSuggestions([]);
      loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Save rule failed'); }
  };

  const handleTogglePairingActive = async (rule: PairingRuleData) => {
    try { await savePairingRule({ ...rule, active: !rule.active }); loadData(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Toggle failed'); }
  };

  const handleDeletePairing = async (id: string) => {
    if (confirm('Delete this pairing rule?')) {
      try { await deletePairingRule(id); loadData(); }
      catch (err) { alert(err instanceof Error ? err.message : 'Delete failed'); }
    }
  };

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiscount?.minSpend || !editingDiscount.percentOff) { alert('Fill all fields'); return; }
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
    } catch (err) { alert(err instanceof Error ? err.message : 'Save tier failed'); }
  };

  const handleToggleDiscountActive = async (tier: DiscountTierData) => {
    try {
      await saveDiscountTier({ _id: tier._id, minSpend: tier.minSpend, percentOff: tier.percentOff, categoryScope: tier.categoryScope, active: !tier.active });
      loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Toggle failed'); }
  };

  const handleDeleteDiscount = async (id: string) => {
    if (confirm('Delete this discount tier?')) {
      try { await deleteDiscountTier(id); loadData(); }
      catch (err) { alert(err instanceof Error ? err.message : 'Delete failed'); }
    }
  };

  const handleSaveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCombo?.conditionCategory || !editingCombo.rewardType || !editingCombo.rewardTarget || !editingCombo.customerMessage) {
      alert('Fill all combo fields'); return;
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
    } catch (err) { alert(err instanceof Error ? err.message : 'Save combo failed'); }
  };

  const handleToggleComboActive = async (rule: ComboRuleData) => {
    try { await saveComboRule({ ...rule, active: !rule.active }); loadData(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Toggle failed'); }
  };

  const handleDeleteCombo = async (id: string) => {
    if (confirm('Delete this combo rule?')) {
      try { await deleteComboRule(id); loadData(); }
      catch (err) { alert(err instanceof Error ? err.message : 'Delete failed'); }
    }
  };

  const getPairingPreviewText = (trigger: string, suggestions: string[]) => {
    if (suggestions.length === 0) return 'Select categories to see preview...';
    return `When a customer adds a "${trigger}" ${vocab.itemNoun.toLowerCase()}, suggest from "${suggestions.join('" or "')}"`;
  };

  if (loading && menuItems.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 bg-[#E2E6EA] rounded animate-pulse" />
        <div className="h-10 w-full bg-[#E2E6EA] rounded-lg animate-pulse" />
        <div className="h-96 bg-white border border-[#E2E6EA] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Upsell & Rules Engine" subtitle={`Configure ${vocab.itemsNoun.toLowerCase()} pairings, spend discounts, and combo triggers`} />

      {businessCategory === 'restaurant' && !hasDrinksCategory && (
        <div className="flex items-start gap-2 bg-[#FFFBEB] border border-[#D97706]/20 rounded-lg p-3 text-sm text-[#D97706]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>No drinks/beverages category found. Combo rules referencing drinks will fall back to cheapest soup or side.</span>
        </div>
      )}

      <div className="flex items-center justify-between bg-white border border-[#E2E6EA] rounded-lg px-4 py-2.5">
        <span className="text-sm text-[#6B7280]">Order Volume: <span className="font-medium text-[#111827]">{completedOrdersCount} completed</span></span>
        <StatusBadge
          label={completedOrdersCount >= 50 ? 'Affinity Engine Active' : 'Cold-start mode (<50 orders)'}
          variant={completedOrdersCount >= 50 ? 'success' : 'neutral'}
        />
      </div>

      {error && (
        <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg p-3 text-sm text-[#DC2626] font-medium">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'items' as const, label: `${vocab.itemsNoun} (${menuItems.filter(i => i.active).length} active)` },
          { id: 'pairings' as const, label: `Pairing Rules (${pairingRules.filter(r => r.active).length} active)` },
          { id: 'discounts' as const, label: `Discount Tiers (${discountTiers.filter(t => t.active !== false).length} active)` },
          { id: 'combos' as const, label: `Combo Rewards (${comboRules.filter(c => c.active).length} active)` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id ? 'bg-[#111827] text-white' : 'bg-white text-[#6B7280] border border-[#E2E6EA] hover:bg-[#F4F6F9]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Items */}
      {activeTab === 'items' && (
        <div className="flex flex-col gap-4">
          {/* Info Pointer Card with Example */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Item-Level Category Pairings</span>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed">
              Configure which complementary categories pair with specific {vocab.itemsNoun.toLowerCase()}. When a customer adds an item to their cart, items from its paired categories are highlighted on customer checkout screens.
            </p>
            <div className="bg-white/80 border border-blue-200/80 rounded-lg p-2.5 text-xs text-blue-950 flex items-start gap-2 mt-1">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong>Example:</strong> If a customer selects <strong>{menuItems[0]?.name || (businessCategory === 'salon' ? 'Keratin Hair Treatment' : 'Signature Item')}</strong>, the upsell engine will present recommendations from <strong>{availableCategories[1] || availableCategories[0] || 'Skin Care'}</strong> during checkout.
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-[#F4F6F9] border-b border-[#E2E6EA]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">{vocab.itemNoun} Name</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Category</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Pairs With Categories</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] w-36">Upsell Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6EA]">
                  {menuItems.map((item) => (
                    <tr key={item._id} className="hover:bg-[#F4F6F9]/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#111827] block">{item.name}</span>
                        <span className="text-[12px] text-[#6B7280]">₹{item.price}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.category}
                          onChange={(e) => handleCategoryChange(item._id, e.target.value)}
                          className="text-xs px-2.5 py-1.5 border border-[#E2E6EA] rounded-lg bg-white w-full outline-none focus:ring-2 focus:ring-[#C0181A]/20 cursor-pointer font-medium"
                        >
                          {availableCategories.map((tag) => (<option key={tag} value={tag}>{tag}</option>))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {availableCategories.map((cat) => (
                            <label key={cat} className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[#4B5563] hover:text-[#111827]">
                              <input
                                type="checkbox"
                                checked={item.pairsWithCategories?.includes(cat) || false}
                                onChange={(e) => handlePairsWithChange(item._id, cat, e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-[#E2E6EA] text-[#C0181A] focus:ring-[#C0181A]/20 cursor-pointer"
                              />
                              <span className="truncate">{cat}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleItemActiveToggle(item._id, item.active || false)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border inline-flex items-center gap-1.5 cursor-pointer ${
                            item.active
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border-neutral-300'
                          }`}
                        >
                          {item.active ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Ban className="w-3.5 h-3.5 text-neutral-500" />}
                          <span>{item.active ? 'ACTIVE UP-SELL' : 'STOP UP-SELL'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Pairings */}
      {activeTab === 'pairings' && (
        <div className="flex flex-col gap-4">
          {/* Info Pointer Card with Example */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
              <Zap className="w-4 h-4 text-purple-600" />
              <span>Category Trigger Pairing Rules</span>
            </div>
            <p className="text-xs text-purple-800 leading-relaxed">
              Define category-wide upsell triggers. Whenever ANY item from the Trigger Category is added to a customer cart, target categories are recommended automatically.
            </p>
            <div className="bg-white/80 border border-purple-200/80 rounded-lg p-2.5 text-xs text-purple-950 flex items-start gap-2 mt-1">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong>Example:</strong> Trigger Category <strong>{availableCategories[0] || 'Hair Styling'}</strong> $\rightarrow$ Suggest <strong>{availableCategories[1] || 'Skin Care'}</strong>. Any booking from the trigger category displays the target category suggestions.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <form onSubmit={handleSavePairing} className="bg-white border border-[#E2E6EA] rounded-xl p-5 flex flex-col gap-4 lg:col-span-1 shadow-sm">
              <h3 className="text-[14px] font-bold text-[#111827]">
                {editingPairing ? 'Edit Pairing Rule' : 'Create Pairing Rule'}
              </h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Trigger Category</label>
                <select value={pairingTrigger} onChange={(e) => setPairingTrigger(e.target.value)} className="text-sm px-3 py-2 border border-[#E2E6EA] rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#C0181A]/20 cursor-pointer">
                  {availableCategories.map((tag) => (<option key={tag} value={tag}>{tag}</option>))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Suggest Categories</label>
                <div className="border border-[#E2E6EA] rounded-lg p-3 max-h-44 overflow-y-auto bg-[#F4F6F9] flex flex-col gap-1.5">
                  {availableCategories.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer text-[#6B7280] hover:text-[#111827]">
                      <input type="checkbox" checked={pairingSuggestions.includes(cat)}
                        onChange={(e) => { if (e.target.checked) setPairingSuggestions(prev => [...prev, cat]); else setPairingSuggestions(prev => prev.filter(i => i !== cat)); }}
                        className="w-3.5 h-3.5 rounded border-[#E2E6EA] text-[#C0181A] focus:ring-[#C0181A]/20 cursor-pointer"
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>
              <div className="bg-[#FFFBEB] border border-[#D97706]/20 rounded-lg p-3 text-[12px] text-[#D97706]">
                <span className="font-medium">Live Rule Preview:</span> {getPairingPreviewText(pairingTrigger, pairingSuggestions)}
              </div>
              <div className="flex gap-2">
                <AdminButton type="submit" className="flex-1 bg-[#111827] text-white hover:bg-black font-bold">{editingPairing ? 'APPLY CHANGES' : 'SAVE RULE'}</AdminButton>
                {editingPairing && <AdminButton variant="secondary" type="button" onClick={() => { setEditingPairing(null); setPairingSuggestions([]); }}>CANCEL</AdminButton>}
              </div>
            </form>

            <div className="lg:col-span-2 flex flex-col gap-3">
              <h3 className="text-[14px] font-bold text-[#111827]">Active Category Pairings</h3>
              {pairingRules.length === 0 ? (
                <EmptyState title="No pairing rules" description="Create your first pairing rule to get started." />
              ) : (
                <div className="bg-white border border-[#E2E6EA] rounded-xl divide-y divide-[#E2E6EA] overflow-hidden shadow-sm">
                  {pairingRules.map((rule) => (
                    <div key={rule._id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-[#F4F6F9]/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge label={`IF ${rule.triggerCategory}`} variant="info" dot={false} />
                          <span className="text-[#6B7280]">→</span>
                          <StatusBadge label={`Suggest: ${rule.suggestCategories.join(', ')}`} variant="neutral" dot={false} />
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${rule.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                            {rule.active ? '● LIVE RULE' : '✕ STOPPED'}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#6B7280] mt-1.5 italic">{getPairingPreviewText(rule.triggerCategory, rule.suggestCategories)}</p>
                        <span className="text-[11px] text-[#6B7280] mt-1 block">Triggered {rule.triggerCount || 0} times</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTogglePairingActive(rule)}
                          className={`font-extrabold px-3 py-1.5 rounded-lg text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer border ${
                            rule.active
                              ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {rule.active ? <Ban className="w-3.5 h-3.5 text-red-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                          <span>{rule.active ? 'STOP RULE' : 'RESUME RULE'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingPairing(rule); setPairingTrigger(rule.triggerCategory); setPairingSuggestions(rule.suggestCategories); }}
                          className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" /> EDIT
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePairing(rule._id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer border border-red-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> DELETE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Discounts */}
      {activeTab === 'discounts' && (
        <div className="flex flex-col gap-4">
          {/* Info Pointer Card with Example */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>Spend-Based Discount Tiers</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Encourage customers to add more items to their cart to reach spend milestones. A live progress banner nudges customers on checkout screens.
            </p>
            <div className="bg-white/80 border border-emerald-200/80 rounded-lg p-2.5 text-xs text-emerald-950 flex items-start gap-2 mt-1">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong>Example:</strong> Setting Min Spend <strong>₹999</strong> for <strong>10% OFF</strong> $\rightarrow$ When customer cart reaches ₹800, system displays: <i>"Add ₹199 more to unlock 10% OFF!"</i>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <form onSubmit={handleSaveDiscount} className="bg-white border border-[#E2E6EA] rounded-xl p-5 flex flex-col gap-4 lg:col-span-1 shadow-sm">
              <h3 className="text-[14px] font-bold text-[#111827]">{editingDiscount ? 'Edit Spend Tier' : 'Add Discount Tier'}</h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Min Spend (₹)</label>
                <input type="number" min="1" placeholder="999" value={editingDiscount?.minSpend || ''} onChange={(e) => setEditingDiscount(prev => ({ ...prev, minSpend: Number(e.target.value) }))}
                  className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-lg outline-none focus:ring-2 focus:ring-[#C0181A]/20" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Discount %</label>
                <input type="number" min="1" max="100" placeholder="10" value={editingDiscount?.percentOff || ''} onChange={(e) => setEditingDiscount(prev => ({ ...prev, percentOff: Number(e.target.value) }))}
                  className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-lg outline-none focus:ring-2 focus:ring-[#C0181A]/20" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Category Scope</label>
                <select value={editingDiscount?.categoryScope || ''} onChange={(e) => setEditingDiscount(prev => ({ ...prev, categoryScope: e.target.value || null }))}
                  className="text-sm px-3 py-2 border border-[#E2E6EA] rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#C0181A]/20 cursor-pointer">
                  <option value="">All Items</option>
                  {availableCategories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
              </div>
              <div className="flex gap-2">
                <AdminButton type="submit" className="flex-1 bg-[#111827] text-white hover:bg-black font-bold">{editingDiscount ? 'APPLY CHANGES' : 'SAVE TIER'}</AdminButton>
                {editingDiscount && <AdminButton variant="secondary" type="button" onClick={() => setEditingDiscount(null)}>CANCEL</AdminButton>}
              </div>
            </form>

            <div className="lg:col-span-2">
              <h3 className="text-[14px] font-bold text-[#111827] mb-3">Active Discount Tiers</h3>
              {discountTiers.length === 0 ? (
                <EmptyState title="No discount tiers" description="Add a spend threshold to encourage larger orders." />
              ) : (
                <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F4F6F9] border-b border-[#E2E6EA]">
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Min Spend</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Discount</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Scope</th>
                        <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Status</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E6EA]">
                      {discountTiers.map((tier) => (
                        <tr key={tier._id} className="hover:bg-[#F4F6F9]/50 transition-colors">
                          <td className="px-4 py-3 font-bold">₹{tier.minSpend}</td>
                          <td className="px-4 py-3 font-bold text-[#16A34A]">{tier.percentOff}% OFF</td>
                          <td className="px-4 py-3 text-[#6B7280]">{tier.categoryScope || 'All Items'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${tier.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {tier.active !== false ? '● LIVE TIER' : '✕ STOPPED'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => handleToggleDiscountActive(tier)}
                                className={`font-extrabold px-2.5 py-1 rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer border ${
                                  tier.active !== false
                                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {tier.active !== false ? <Ban className="w-3.5 h-3.5 text-red-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                                <span>{tier.active !== false ? 'STOP TIER' : 'RESUME TIER'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingDiscount(tier)}
                                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-2.5 py-1 rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" /> EDIT
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDiscount(tier._id)}
                                className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer border border-red-200"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> DELETE
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Combos */}
      {activeTab === 'combos' && (
        <div className="flex flex-col gap-4">
          {/* Info Pointer Card with Example */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Automated Combo & Bundle Rewards</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Create "Buy X, Get Y" or bundle reward rules to incentivize cross-selling complementary items.
            </p>
            <div className="bg-white/80 border border-amber-200/80 rounded-lg p-2.5 text-xs text-amber-950 flex items-start gap-2 mt-1">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong>Example:</strong> IF cart has <strong>{addonInfo.conditionCatPlaceholder.replace('e.g. ', '')}</strong> $\rightarrow$ Give 50% OFF on <strong>{addonInfo.rewardTargetPlaceholder.replace('e.g. ', '')}</strong> with prompt: <i>"{addonInfo.messagePlaceholder}"</i>.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <form onSubmit={handleSaveCombo} className="bg-white border border-[#E2E6EA] rounded-xl p-5 flex flex-col gap-4 lg:col-span-1 shadow-sm">
              <h3 className="text-[14px] font-bold text-[#111827]">{editingCombo ? 'Edit Combo Rule' : 'Add Combo Rule'}</h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">IF cart has category</label>
                <input type="text" placeholder={addonInfo.conditionCatPlaceholder} value={editingCombo?.conditionCategory || ''} onChange={(e) => setEditingCombo(prev => ({ ...prev, conditionCategory: e.target.value }))}
                  className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-lg outline-none focus:ring-2 focus:ring-[#C0181A]/20" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Exclude category (optional)</label>
                <input type="text" placeholder="e.g. Special Care" value={editingCombo?.conditionExcludeCategory || ''} onChange={(e) => setEditingCombo(prev => ({ ...prev, conditionExcludeCategory: e.target.value || null }))}
                  className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-lg outline-none focus:ring-2 focus:ring-[#C0181A]/20" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Reward type</label>
                <select value={editingCombo?.rewardType || 'free_item'} onChange={(e) => setEditingCombo(prev => ({ ...prev, rewardType: e.target.value as any }))}
                  className="text-sm px-3 py-2 border border-[#E2E6EA] rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#C0181A]/20 cursor-pointer" required>
                  <option value="free_item">Free Item</option>
                  <option value="percent_off_item">% Off Specific Item</option>
                  <option value="percent_off_order">% Off Whole Order</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Reward target</label>
                <input type="text" placeholder={addonInfo.rewardTargetPlaceholder} value={editingCombo?.rewardTarget || ''} onChange={(e) => setEditingCombo(prev => ({ ...prev, rewardTarget: e.target.value }))}
                  className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-lg outline-none focus:ring-2 focus:ring-[#C0181A]/20" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Customer message prompt</label>
                <input type="text" placeholder={addonInfo.messagePlaceholder} value={editingCombo?.customerMessage || ''} onChange={(e) => setEditingCombo(prev => ({ ...prev, customerMessage: e.target.value }))}
                  className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-lg outline-none focus:ring-2 focus:ring-[#C0181A]/20" required />
              </div>
              <div className="flex gap-2">
                <AdminButton type="submit" className="flex-1 bg-[#111827] text-white hover:bg-black font-bold">{editingCombo ? 'APPLY CHANGES' : 'SAVE COMBO'}</AdminButton>
                {editingCombo && <AdminButton variant="secondary" type="button" onClick={() => setEditingCombo(null)}>CANCEL</AdminButton>}
              </div>
            </form>

            <div className="lg:col-span-2 flex flex-col gap-3">
              <h3 className="text-[14px] font-bold text-[#111827]">Active Combos</h3>
              {comboRules.length === 0 ? (
                <EmptyState title="No combo rules" description="Create a combo rule to nudge customers toward complementary items." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {comboRules.map((rule) => (
                    <div key={rule._id} className="bg-white border border-[#E2E6EA] rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${rule.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {rule.active ? '● LIVE COMBO' : '✕ STOPPED'}
                        </span>
                        <span className="text-[11px] text-[#6B7280]">{rule.triggerCount || 0} triggers</span>
                      </div>
                      <div className="text-sm text-[#111827]">
                        <span className="text-[#6B7280]">IF:</span> <span className="font-bold">{rule.conditionCategory}</span>
                        {rule.conditionExcludeCategory && (<><br/><span className="text-[#6B7280]">NOT:</span> {rule.conditionExcludeCategory}</>)}
                      </div>
                      <div className="text-sm text-[#16A34A] font-bold">
                        <span className="text-[#6B7280] font-normal">Then:</span> {rule.rewardType.replace(/_/g, ' ')} → {rule.rewardTarget}
                      </div>
                      <div className="bg-[#F4F6F9] rounded-lg p-2.5 text-[12px] text-[#4B5563] italic font-medium">
                        &ldquo;{rule.customerMessage}&rdquo;
                      </div>
                      <div className="flex items-center gap-2 justify-end pt-2 border-t border-[#E2E6EA]">
                        <button
                          type="button"
                          onClick={() => handleToggleComboActive(rule)}
                          className={`font-extrabold px-2.5 py-1 rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer border ${
                            rule.active
                              ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {rule.active ? <Ban className="w-3.5 h-3.5 text-red-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                          <span>{rule.active ? 'STOP COMBO' : 'RESUME COMBO'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCombo(rule)}
                          className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-2.5 py-1 rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" /> EDIT
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCombo(rule._id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer border border-red-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> DELETE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
