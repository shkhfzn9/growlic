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
import { AlertTriangle, Pencil, Trash2, Pause, Play } from 'lucide-react';
import { MenuItem, PairingRuleData, DiscountTierData, ComboRuleData } from '../types/menu.types';

const CATEGORY_TAGS = [
  'Classic Momos', 'Momos Gravy Add Ons', 'Momos Woksizzle', 'Tokyo Rice Paradise',
  'Tokyo Rice Bowls', 'Tokyo Special', 'Tokyo Soups', 'Tokyo Noodles',
  'Tokyo Rolls', 'Chicken Salad', 'Fit Meals', 'Additional Snacks',
];

export default function UpsellPage() {
  const auth = useSelector((state: RootState) => state.auth);
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
      setHasDrinksCategory(res.menuItems.some(
        (item: MenuItem) => item.category.toLowerCase().includes('drink') || item.category.toLowerCase().includes('beverage')
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
        triggerCategory: pairingTrigger,
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
    return `When a customer adds a "${trigger}" item, suggest from "${suggestions.join('" or "')}"`;
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
      <PageHeader title="Upsell & Rules" subtitle="Configure pairings, discounts, and combo triggers" />

      {!hasDrinksCategory && (
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
          { id: 'items' as const, label: `Items (${menuItems.filter(i => i.active).length} active)` },
          { id: 'pairings' as const, label: `Pairings (${pairingRules.filter(r => r.active).length} active)` },
          { id: 'discounts' as const, label: `Discounts (${discountTiers.filter(t => t.active !== false).length} active)` },
          { id: 'combos' as const, label: `Combos (${comboRules.filter(c => c.active).length} active)` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-[#111827] text-white' : 'bg-white text-[#6B7280] border border-[#E2E6EA] hover:bg-[#F4F6F9]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Items */}
      {activeTab === 'items' && (
        <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#E2E6EA]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Item</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Category</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Pairs With</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6EA]">
                {menuItems.map((item) => (
                  <tr key={item._id} className="hover:bg-[#F4F6F9]/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#111827] block">{item.name}</span>
                      <span className="text-[12px] text-[#6B7280]">₹{item.price}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.category}
                        onChange={(e) => handleCategoryChange(item._id, e.target.value)}
                        className="text-xs px-2 py-1.5 border border-[#E2E6EA] rounded-lg bg-white w-full outline-none focus:ring-2 focus:ring-[#C0181A]/20"
                      >
                        {CATEGORY_TAGS.map((tag) => (<option key={tag} value={tag}>{tag}</option>))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-1 max-h-20 overflow-y-auto">
                        {CATEGORY_TAGS.map((cat) => (
                          <label key={cat} className="flex items-center gap-1 cursor-pointer text-[11px] text-[#6B7280]">
                            <input
                              type="checkbox"
                              checked={item.pairsWithCategories?.includes(cat) || false}
                              onChange={(e) => handlePairsWithChange(item._id, cat, e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-[#E2E6EA] text-[#C0181A] focus:ring-[#C0181A]/20"
                            />
                            <span className="truncate">{cat}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleItemActiveToggle(item._id, item.active || false)}>
                        <StatusBadge label={item.active ? 'Active' : 'Inactive'} variant={item.active ? 'success' : 'neutral'} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Pairings */}
      {activeTab === 'pairings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <form onSubmit={handleSavePairing} className="bg-white border border-[#E2E6EA] rounded-xl p-5 flex flex-col gap-4 lg:col-span-1">
            <h3 className="text-[14px] font-semibold text-[#111827]">
              {editingPairing ? 'Edit Rule' : 'Create Pairing Rule'}
            </h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Trigger Category</label>
              <select value={pairingTrigger} onChange={(e) => setPairingTrigger(e.target.value)} className="text-sm px-3 py-2 border border-[#E2E6EA] rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#C0181A]/20">
                {CATEGORY_TAGS.map((tag) => (<option key={tag} value={tag}>{tag}</option>))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Suggest Categories</label>
              <div className="border border-[#E2E6EA] rounded-lg p-3 max-h-44 overflow-y-auto bg-[#F4F6F9] flex flex-col gap-1.5">
                {CATEGORY_TAGS.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer text-[#6B7280] hover:text-[#111827]">
                    <input type="checkbox" checked={pairingSuggestions.includes(cat)}
                      onChange={(e) => { if (e.target.checked) setPairingSuggestions(prev => [...prev, cat]); else setPairingSuggestions(prev => prev.filter(i => i !== cat)); }}
                      className="w-3.5 h-3.5 rounded border-[#E2E6EA] text-[#C0181A] focus:ring-[#C0181A]/20"
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
            <div className="bg-[#FFFBEB] border border-[#D97706]/20 rounded-lg p-3 text-[12px] text-[#D97706]">
              <span className="font-medium">Preview:</span> {getPairingPreviewText(pairingTrigger, pairingSuggestions)}
            </div>
            <div className="flex gap-2">
              <AdminButton type="submit" className="flex-1">{editingPairing ? 'Update' : 'Add Rule'}</AdminButton>
              {editingPairing && <AdminButton variant="secondary" type="button" onClick={() => { setEditingPairing(null); setPairingSuggestions([]); }}>Cancel</AdminButton>}
            </div>
          </form>

          <div className="lg:col-span-2 flex flex-col gap-3">
            <h3 className="text-[14px] font-semibold text-[#111827]">Active Pairings</h3>
            {pairingRules.length === 0 ? (
              <EmptyState title="No pairing rules" description="Create your first pairing rule to get started." />
            ) : (
              <div className="bg-white border border-[#E2E6EA] rounded-xl divide-y divide-[#E2E6EA] overflow-hidden">
                {pairingRules.map((rule) => (
                  <div key={rule._id} className="p-4 flex justify-between items-start gap-3 hover:bg-[#F4F6F9]/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge label={`IF ${rule.triggerCategory}`} variant="info" dot={false} />
                        <span className="text-[#6B7280]">→</span>
                        <StatusBadge label={`Suggest: ${rule.suggestCategories.join(', ')}`} variant="neutral" dot={false} />
                      </div>
                      <p className="text-[12px] text-[#6B7280] mt-1.5 italic">{getPairingPreviewText(rule.triggerCategory, rule.suggestCategories)}</p>
                      <span className="text-[11px] text-[#6B7280] mt-1 block">Triggered {rule.triggerCount || 0} times</span>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => handleTogglePairingActive(rule)} className="p-1.5 rounded-lg hover:bg-[#F4F6F9] text-[#6B7280] transition-colors" title={rule.active ? 'Pause' : 'Activate'}>
                        {rule.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => { setEditingPairing(rule); setPairingTrigger(rule.triggerCategory); setPairingSuggestions(rule.suggestCategories); }} className="p-1.5 rounded-lg hover:bg-[#F4F6F9] text-[#6B7280] transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeletePairing(rule._id)} className="p-1.5 rounded-lg hover:bg-[#FEF2F2] text-[#DC2626] transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Discounts */}
      {activeTab === 'discounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <form onSubmit={handleSaveDiscount} className="bg-white border border-[#E2E6EA] rounded-xl p-5 flex flex-col gap-4 lg:col-span-1">
            <h3 className="text-[14px] font-semibold text-[#111827]">{editingDiscount ? 'Edit Tier' : 'Add Discount Tier'}</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Min Spend (₹)</label>
              <input type="number" min="1" placeholder="399" value={editingDiscount?.minSpend || ''} onChange={(e) => setEditingDiscount(prev => ({ ...prev, minSpend: Number(e.target.value) }))}
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
                className="text-sm px-3 py-2 border border-[#E2E6EA] rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#C0181A]/20">
                <option value="">All Items</option>
                {CATEGORY_TAGS.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>
            <div className="flex gap-2">
              <AdminButton type="submit" className="flex-1">{editingDiscount ? 'Update' : 'Add Tier'}</AdminButton>
              {editingDiscount && <AdminButton variant="secondary" type="button" onClick={() => setEditingDiscount(null)}>Cancel</AdminButton>}
            </div>
          </form>

          <div className="lg:col-span-2">
            <h3 className="text-[14px] font-semibold text-[#111827] mb-3">Active Tiers</h3>
            {discountTiers.length === 0 ? (
              <EmptyState title="No discount tiers" description="Add a spend threshold to encourage larger orders." />
            ) : (
              <div className="bg-white border border-[#E2E6EA] rounded-xl overflow-hidden">
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
                        <td className="px-4 py-3 font-medium">₹{tier.minSpend}</td>
                        <td className="px-4 py-3 font-semibold text-[#16A34A]">{tier.percentOff}% OFF</td>
                        <td className="px-4 py-3 text-[#6B7280]">{tier.categoryScope || 'All Items'}</td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge label={tier.active !== false ? 'Active' : 'Paused'} variant={tier.active !== false ? 'success' : 'neutral'} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            <button onClick={() => handleToggleDiscountActive(tier)} className="p-1.5 rounded-lg hover:bg-[#F4F6F9] text-[#6B7280] transition-colors">
                              {tier.active !== false ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => setEditingDiscount(tier)} className="p-1.5 rounded-lg hover:bg-[#F4F6F9] text-[#6B7280] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteDiscount(tier._id)} className="p-1.5 rounded-lg hover:bg-[#FEF2F2] text-[#DC2626] transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
      )}

      {/* Tab 4: Combos */}
      {activeTab === 'combos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <form onSubmit={handleSaveCombo} className="bg-white border border-[#E2E6EA] rounded-xl p-5 flex flex-col gap-4 lg:col-span-1">
            <h3 className="text-[14px] font-semibold text-[#111827]">{editingCombo ? 'Edit Combo' : 'Add Combo Rule'}</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">IF has category</label>
              <input type="text" placeholder="e.g. Classic Momos" value={editingCombo?.conditionCategory || ''} onChange={(e) => setEditingCombo(prev => ({ ...prev, conditionCategory: e.target.value }))}
                className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-lg outline-none focus:ring-2 focus:ring-[#C0181A]/20" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Exclude category (optional)</label>
              <input type="text" placeholder="e.g. Tokyo Soups" value={editingCombo?.conditionExcludeCategory || ''} onChange={(e) => setEditingCombo(prev => ({ ...prev, conditionExcludeCategory: e.target.value || null }))}
                className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-lg outline-none focus:ring-2 focus:ring-[#C0181A]/20" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Reward type</label>
              <select value={editingCombo?.rewardType || 'free_item'} onChange={(e) => setEditingCombo(prev => ({ ...prev, rewardType: e.target.value as any }))}
                className="text-sm px-3 py-2 border border-[#E2E6EA] rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#C0181A]/20" required>
                <option value="free_item">Free Item</option>
                <option value="percent_off_item">% Off Specific Item</option>
                <option value="percent_off_order">% Off Whole Order</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Reward target</label>
              <input type="text" placeholder="e.g. Tokyo Soups" value={editingCombo?.rewardTarget || ''} onChange={(e) => setEditingCombo(prev => ({ ...prev, rewardTarget: e.target.value }))}
                className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-lg outline-none focus:ring-2 focus:ring-[#C0181A]/20" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Customer message</label>
              <input type="text" placeholder="Add a soup, it's on us!" value={editingCombo?.customerMessage || ''} onChange={(e) => setEditingCombo(prev => ({ ...prev, customerMessage: e.target.value }))}
                className="px-3 py-2 text-sm border border-[#E2E6EA] rounded-lg outline-none focus:ring-2 focus:ring-[#C0181A]/20" required />
            </div>
            <div className="flex gap-2">
              <AdminButton type="submit" className="flex-1">{editingCombo ? 'Update' : 'Add Combo'}</AdminButton>
              {editingCombo && <AdminButton variant="secondary" type="button" onClick={() => setEditingCombo(null)}>Cancel</AdminButton>}
            </div>
          </form>

          <div className="lg:col-span-2 flex flex-col gap-3">
            <h3 className="text-[14px] font-semibold text-[#111827]">Active Combos</h3>
            {comboRules.length === 0 ? (
              <EmptyState title="No combo rules" description="Create a combo rule to nudge customers toward complementary items." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {comboRules.map((rule) => (
                  <div key={rule._id} className="bg-white border border-[#E2E6EA] rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <StatusBadge label={rule.active ? 'Active' : 'Paused'} variant={rule.active ? 'success' : 'neutral'} />
                      <span className="text-[11px] text-[#6B7280]">{rule.triggerCount || 0} triggers</span>
                    </div>
                    <div className="text-sm text-[#111827]">
                      <span className="text-[#6B7280]">IF:</span> <span className="font-medium">{rule.conditionCategory}</span>
                      {rule.conditionExcludeCategory && (<><br/><span className="text-[#6B7280]">NOT:</span> {rule.conditionExcludeCategory}</>)}
                    </div>
                    <div className="text-sm text-[#16A34A] font-medium">
                      <span className="text-[#6B7280] font-normal">Then:</span> {rule.rewardType.replace(/_/g, ' ')} → {rule.rewardTarget}
                    </div>
                    <div className="bg-[#F4F6F9] rounded-lg p-2.5 text-[12px] text-[#6B7280] italic">
                      &ldquo;{rule.customerMessage}&rdquo;
                    </div>
                    <div className="flex gap-1.5 justify-end pt-2 border-t border-[#E2E6EA]">
                      <button onClick={() => handleToggleComboActive(rule)} className="p-1.5 rounded-lg hover:bg-[#F4F6F9] text-[#6B7280] transition-colors">
                        {rule.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditingCombo(rule)} className="p-1.5 rounded-lg hover:bg-[#F4F6F9] text-[#6B7280] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteCombo(rule._id)} className="p-1.5 rounded-lg hover:bg-[#FEF2F2] text-[#DC2626] transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
