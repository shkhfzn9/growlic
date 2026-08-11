'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { PageHeader, AdminButton } from '@/components/ui';
import {
  Percent,
  Power,
  ShieldAlert,
  Ticket,
  Plus,
  Trash2,
  CheckCircle2,
  Settings,
  Layers,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Tag,
  Pencil,
  X,
  Search,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  PieChart,
  Ban,
  Play,
  TrendingDown,
} from 'lucide-react';
import { ICoupon, IDiscountSettings, IDiscountAnalytics } from '../types';
import { saveDiscountTier, deleteDiscountTier, saveComboRule, deleteComboRule } from '@/actions/upsell';

interface SpendTier {
  _id: string;
  minSpend: number;
  percentOff: number;
  categoryScope: string | null;
  active?: boolean;
}

interface ComboRule {
  _id: string;
  conditionCategory: string;
  conditionExcludeCategory?: string | null;
  rewardType: 'free_item' | 'percent_off_item' | 'percent_off_order';
  rewardTarget: string;
  customerMessage: string;
  active: boolean;
}

interface MenuItem {
  _id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  active: boolean;
  available: boolean;
}

export default function DiscountsManager() {
  const auth = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<'audit' | 'overview' | 'coupons' | 'tiers' | 'combos' | 'items'>('audit');
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Overview Data
  const [settings, setSettings] = useState<IDiscountSettings>({
    restaurantId: '',
    masterEnabled: true,
    couponsEnabled: true,
    spendTiersEnabled: true,
    comboRulesEnabled: true,
    itemDiscountsEnabled: true,
    maxDiscountPerOrder: 0,
    allowStacking: true,
  });

  const [coupons, setCoupons] = useState<ICoupon[]>([]);
  const [spendTiers, setSpendTiers] = useState<SpendTier[]>([]);
  const [comboRules, setComboRules] = useState<ComboRule[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [analytics, setAnalytics] = useState<IDiscountAnalytics>({
    totalDiscountGiven: 0,
    discountedOrdersCount: 0,
    totalOrdersCount: 0,
    avgDiscountPerOrder: 0,
    maxDiscountInSingleOrder: 0,
    totalRevenue: 0,
  });
  const [itemSearch, setItemSearch] = useState('');

  // Coupon Form State (Create & Edit)
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState<number | ''>(10);
  const [couponMinSpend, setCouponMinSpend] = useState<number | ''>(0);
  const [couponMaxUsage, setCouponMaxUsage] = useState<number | ''>('');
  const [couponExpiresAt, setCouponExpiresAt] = useState('');
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Spend Tier Form State (Create & Edit)
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierMinSpend, setTierMinSpend] = useState<number | ''>(500);
  const [tierPercentOff, setTierPercentOff] = useState<number | ''>(10);
  const [tierCategoryScope, setTierCategoryScope] = useState('');
  const [savingTier, setSavingTier] = useState(false);

  // Combo Rule Form State (Create & Edit)
  const [editingComboId, setEditingComboId] = useState<string | null>(null);
  const [comboMessage, setComboMessage] = useState('');
  const [comboConditionCat, setComboConditionCat] = useState('Classic Momos');
  const [comboExcludeCat, setComboExcludeCat] = useState('');
  const [comboRewardType, setComboRewardType] = useState<'free_item' | 'percent_off_item' | 'percent_off_order'>('free_item');
  const [comboRewardTarget, setComboRewardTarget] = useState('Tokyo Soups');
  const [savingCombo, setSavingCombo] = useState(false);
  const [showComboForm, setShowComboForm] = useState(false);

  const loadDiscountData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/discounts');
      const json = await res.json();
      if (json.success) {
        setSettings(json.data.settings);
        setCoupons(json.data.coupons || []);
        setSpendTiers(json.data.spendTiers || []);
        setComboRules(json.data.comboRules || []);
        setMenuItems(json.data.items || []);
        if (json.data.analytics) {
          setAnalytics(json.data.analytics);
        }
      }
    } catch (err) {
      console.error('Failed to load discounts data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.isLoggedIn && auth.restaurantId) {
      loadDiscountData();
    }
  }, [auth.isLoggedIn, auth.restaurantId]);

  const handleUpdateSettings = async (newSettings: Partial<IDiscountSettings>) => {
    setSavingSettings(true);
    try {
      const updated = { ...settings, ...newSettings };
      const res = await fetch('/api/admin/discounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const json = await res.json();
      if (json.success) {
        setSettings(json.settings);
        setSaveSuccessMsg('Discount settings updated successfully!');
        setTimeout(() => setSaveSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update discount settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // --- COUPON HANDLERS ---
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim() || !couponValue) return;

    setSavingCoupon(true);
    try {
      const payload = {
        _id: editingCouponId || undefined,
        code: couponCode.trim(),
        discountType: couponType,
        discountValue: Number(couponValue),
        minSpend: Number(couponMinSpend || 0),
        maxUsage: couponMaxUsage ? Number(couponMaxUsage) : undefined,
        expiresAt: couponExpiresAt || undefined,
      };

      const res = await fetch('/api/admin/discounts/coupons', {
        method: editingCouponId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        resetCouponForm();
        await loadDiscountData();
        setSaveSuccessMsg(editingCouponId ? 'Coupon updated successfully!' : 'New promo coupon created!');
        setTimeout(() => setSaveSuccessMsg(''), 3000);
      } else {
        alert(json.error || 'Failed to save coupon');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save coupon');
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleStartEditCoupon = (coupon: ICoupon) => {
    setActiveTab('coupons');
    setEditingCouponId(coupon._id);
    setCouponCode(coupon.code);
    setCouponType(coupon.discountType);
    setCouponValue(coupon.discountValue);
    setCouponMinSpend(coupon.minSpend || 0);
    setCouponMaxUsage(coupon.maxUsage || '');
    setCouponExpiresAt(coupon.expiresAt ? coupon.expiresAt.split('T')[0] : '');
  };

  const resetCouponForm = () => {
    setEditingCouponId(null);
    setCouponCode('');
    setCouponType('percentage');
    setCouponValue(10);
    setCouponMinSpend(0);
    setCouponMaxUsage('');
    setCouponExpiresAt('');
  };

  const handleToggleCoupon = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/discounts/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: id, active: !currentActive }),
      });
      if (res.ok) {
        await loadDiscountData();
        setSaveSuccessMsg(!currentActive ? 'Coupon activated!' : 'Coupon stopped! It will no longer apply to customer orders.');
        setTimeout(() => setSaveSuccessMsg(''), 3500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (confirm('Are you sure you want to delete this coupon?')) {
      try {
        await fetch(`/api/admin/discounts/coupons?id=${id}`, { method: 'DELETE' });
        await loadDiscountData();
        setSaveSuccessMsg('Coupon deleted.');
        setTimeout(() => setSaveSuccessMsg(''), 3000);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- SPEND TIER HANDLERS ---
  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierMinSpend || !tierPercentOff) return;

    setSavingTier(true);
    try {
      await saveDiscountTier({
        _id: editingTierId || undefined,
        minSpend: Number(tierMinSpend),
        percentOff: Number(tierPercentOff),
        categoryScope: tierCategoryScope.trim() || null,
        active: true,
      });

      resetTierForm();
      await loadDiscountData();
      setSaveSuccessMsg(editingTierId ? 'Minimum spend tier updated!' : 'New minimum spend tier added!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save spend tier');
    } finally {
      setSavingTier(false);
    }
  };

  const handleStartEditTier = (tier: SpendTier) => {
    setActiveTab('tiers');
    setEditingTierId(tier._id);
    setTierMinSpend(tier.minSpend);
    setTierPercentOff(tier.percentOff);
    setTierCategoryScope(tier.categoryScope || '');
  };

  const resetTierForm = () => {
    setEditingTierId(null);
    setTierMinSpend(500);
    setTierPercentOff(10);
    setTierCategoryScope('');
  };

  const handleToggleTier = async (tier: SpendTier) => {
    const isNowActive = !(tier.active !== false);
    try {
      await saveDiscountTier({
        _id: tier._id,
        minSpend: tier.minSpend,
        percentOff: tier.percentOff,
        categoryScope: tier.categoryScope,
        active: isNowActive,
      });
      await loadDiscountData();
      setSaveSuccessMsg(isNowActive ? 'Spend tier activated!' : 'Spend tier stopped! It will no longer apply to customer orders.');
      setTimeout(() => setSaveSuccessMsg(''), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTier = async (id: string) => {
    if (confirm('Delete this minimum spend tier?')) {
      try {
        await deleteDiscountTier(id);
        await loadDiscountData();
        setSaveSuccessMsg('Spend tier deleted.');
        setTimeout(() => setSaveSuccessMsg(''), 3000);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- COMBO RULE HANDLERS ---
  const handleSaveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comboMessage.trim()) return;

    setSavingCombo(true);
    try {
      await saveComboRule({
        _id: editingComboId || undefined,
        customerMessage: comboMessage.trim(),
        conditionCategory: comboConditionCat,
        conditionExcludeCategory: comboExcludeCat.trim() || null,
        rewardType: comboRewardType,
        rewardTarget: comboRewardTarget,
        active: true,
      });

      resetComboForm();
      await loadDiscountData();
      setSaveSuccessMsg(editingComboId ? 'Combo rule updated!' : 'New combo rule created!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save combo rule');
    } finally {
      setSavingCombo(false);
    }
  };

  const handleStartEditCombo = (rule: ComboRule) => {
    setActiveTab('combos');
    setEditingComboId(rule._id);
    setComboMessage(rule.customerMessage);
    setComboConditionCat(rule.conditionCategory);
    setComboExcludeCat(rule.conditionExcludeCategory || '');
    setComboRewardType(rule.rewardType);
    setComboRewardTarget(rule.rewardTarget);
    setShowComboForm(true);
  };

  const resetComboForm = () => {
    setEditingComboId(null);
    setComboMessage('');
    setComboConditionCat('Classic Momos');
    setComboExcludeCat('');
    setComboRewardType('free_item');
    setComboRewardTarget('Tokyo Soups');
    setShowComboForm(false);
  };

  const handleToggleComboRule = async (rule: ComboRule) => {
    const isNowActive = !rule.active;
    try {
      await saveComboRule({
        _id: rule._id,
        customerMessage: rule.customerMessage,
        conditionCategory: rule.conditionCategory,
        conditionExcludeCategory: rule.conditionExcludeCategory || null,
        rewardType: rule.rewardType,
        rewardTarget: rule.rewardTarget,
        active: isNowActive,
      });
      await loadDiscountData();
      setSaveSuccessMsg(isNowActive ? 'Combo rule activated!' : 'Combo rule stopped! It will no longer apply to customer orders.');
      setTimeout(() => setSaveSuccessMsg(''), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComboRule = async (id: string) => {
    if (confirm('Delete this combo rule?')) {
      try {
        await deleteComboRule(id);
        await loadDiscountData();
        setSaveSuccessMsg('Combo rule deleted.');
        setTimeout(() => setSaveSuccessMsg(''), 3000);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // --- LEAKAGE SCORE & AUDIT CALCULATIONS ---
  const auditRisks = React.useMemo(() => {
    const risks: Array<{ title: string; desc: string; severity: 'high' | 'medium' | 'low'; actionTab: 'overview' | 'coupons' | 'tiers' | 'combos' }> = [];

    if (settings.maxDiscountPerOrder === 0) {
      risks.push({
        title: 'No Order Discount Limit Cap Configured',
        desc: 'Without a maximum order discount cap, large bulk orders could receive excessive percentage discounts.',
        severity: 'high',
        actionTab: 'overview',
      });
    }

    const uncappedCoupons = coupons.filter((c) => c.active && !c.maxUsage);
    if (uncappedCoupons.length > 0) {
      risks.push({
        title: `${uncappedCoupons.length} Active Coupon(s) Without Usage Limits`,
        desc: `Coupon codes like '${uncappedCoupons[0].code}' have no maximum usage limit.`,
        severity: 'high',
        actionTab: 'coupons',
      });
    }

    if (settings.allowStacking && spendTiers.some((t) => t.active !== false) && coupons.some((c) => c.active)) {
      risks.push({
        title: 'Discount Stacking Enabled',
        desc: 'Customers can combine checkout promo codes on top of automatic minimum spend tier discounts.',
        severity: 'medium',
        actionTab: 'overview',
      });
    }

    const lowTiers = spendTiers.filter((t) => t.active !== false && t.minSpend < 300);
    if (lowTiers.length > 0) {
      risks.push({
        title: 'Low Minimum Spend Tier Threshold',
        desc: `Spend tier offering ${lowTiers[0].percentOff}% off starts at just ₹${lowTiers[0].minSpend}.`,
        severity: 'medium',
        actionTab: 'tiers',
      });
    }

    return risks;
  }, [settings, coupons, spendTiers]);

  const leakageScore = React.useMemo(() => {
    let score = 100;
    auditRisks.forEach((r) => {
      if (r.severity === 'high') score -= 20;
      if (r.severity === 'medium') score -= 10;
      if (r.severity === 'low') score -= 5;
    });
    return Math.max(0, score);
  }, [auditRisks]);

  const minActiveDiscountText = React.useMemo(() => {
    const values: string[] = [];
    spendTiers.filter((t) => t.active !== false).forEach((t) => values.push(`${t.percentOff}%`));
    coupons.filter((c) => c.active).forEach((c) => values.push(c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`));
    return values.length > 0 ? values[0] : 'None Active';
  }, [spendTiers, coupons]);

  const maxActiveDiscountText = React.useMemo(() => {
    let maxPct = 0;
    let maxFixed = 0;
    spendTiers.filter((t) => t.active !== false).forEach((t) => { if (t.percentOff > maxPct) maxPct = t.percentOff; });
    coupons.filter((c) => c.active).forEach((c) => {
      if (c.discountType === 'percentage' && c.discountValue > maxPct) maxPct = c.discountValue;
      if (c.discountType === 'fixed' && c.discountValue > maxFixed) maxFixed = c.discountValue;
    });
    if (maxPct > 0) return `${maxPct}% OFF`;
    if (maxFixed > 0) return `₹${maxFixed} OFF`;
    return 'None Active';
  }, [spendTiers, coupons]);

  const filteredMenuItems = menuItems.filter(
    (item) =>
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(itemSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Discount Control & Leakage Audit"
          subtitle="Full cost analysis, redemption tracking, and profit leakage protection for your store."
        />
        <button
          onClick={loadDiscountData}
          className="self-start md:self-auto flex items-center gap-2 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50 px-3.5 py-2 rounded-lg text-neutral-700 shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 font-semibold shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {saveSuccessMsg}
        </div>
      )}

      {/* MASTER KILL SWITCH BANNER */}
      <div
        className={`rounded-2xl p-6 border shadow-md transition-all ${
          settings.masterEnabled
            ? 'bg-gradient-to-r from-slate-900 via-neutral-900 to-slate-800 text-white border-slate-700'
            : 'bg-gradient-to-r from-red-950 via-red-900 to-amber-950 text-white border-red-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-2xl ${
                settings.masterEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              <Power className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black tracking-tight">Master Store Discount Switch</h2>
                <span
                  className={`text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full border ${
                    settings.masterEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }`}
                >
                  {settings.masterEnabled ? '● DISCOUNTS ENABLED' : '✕ DISCOUNTS DISABLED'}
                </span>
              </div>
              <p className="text-xs text-white/70 mt-1 max-w-xl">
                {settings.masterEnabled
                  ? 'All active discount rules, spend tiers, and valid coupons are currently enabled for customers.'
                  : 'GLOBAL KILL SWITCH ACTIVE: All discounts are suspended store-wide. No discounts will apply on any order.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleUpdateSettings({ masterEnabled: !settings.masterEnabled })}
            disabled={savingSettings}
            className={`px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-95 shrink-0 ${
              settings.masterEnabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            <Power className="w-4 h-4" />
            {settings.masterEnabled ? 'DISABLE ALL DISCOUNTS' : 'ENABLE ALL DISCOUNTS'}
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-neutral-200 overflow-x-auto pb-1">
        {[
          { id: 'audit', label: 'Cost & Leakage Control', icon: ShieldAlert },
          { id: 'overview', label: 'Master Controls & Limits', icon: Settings },
          { id: 'coupons', label: `Promo Coupons (${coupons.length})`, icon: Ticket },
          { id: 'tiers', label: `Minimum Spend Tiers (${spendTiers.length})`, icon: Percent },
          { id: 'combos', label: `Combo Rules (${comboRules.length})`, icon: Layers },
          { id: 'items', label: `Item Catalog (${menuItems.length})`, icon: Tag },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-[#C0181A] text-[#C0181A] bg-red-50/50'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 0: COST ANALYSIS & LEAKAGE CONTROL */}
      {activeTab === 'audit' && (
        <div className="flex flex-col gap-6">
          {/* Top Metrics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Discount Cost</span>
                <DollarSign className="w-4 h-4 text-[#C0181A]" />
              </div>
              <div>
                <span className="text-2xl font-black text-neutral-900 block">₹{analytics.totalDiscountGiven}</span>
                <p className="text-xs text-neutral-500 font-semibold mt-1">
                  Given across <strong className="text-neutral-900">{analytics.discountedOrdersCount}</strong> orders
                </p>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Offered Min & Max</span>
                <TrendingDown className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-extrabold text-neutral-500">Min: {minActiveDiscountText}</span>
                  <span className="text-lg font-black text-[#C0181A]">Max: {maxActiveDiscountText}</span>
                </div>
                <p className="text-xs text-neutral-500 font-semibold mt-1">
                  Order Limit Cap: <strong className="text-neutral-900">{settings.maxDiscountPerOrder > 0 ? `₹${settings.maxDiscountPerOrder}` : 'No Cap Set'}</strong>
                </p>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Leakage Protection</span>
                <ShieldAlert className={`w-4 h-4 ${leakageScore >= 80 ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-neutral-900">{leakageScore} / 100</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    leakageScore >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {leakageScore >= 80 ? 'SAFE' : 'ATTENTION'}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 font-semibold mt-1">
                  {auditRisks.length === 0 ? 'No critical leakage risks detected' : `${auditRisks.length} leakage risk alert(s)`}
                </p>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Average Discount</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <span className="text-2xl font-black text-neutral-900 block">₹{analytics.avgDiscountPerOrder}</span>
                <p className="text-xs text-neutral-500 font-semibold mt-1">
                  Single order max discount: <strong className="text-neutral-900">₹{analytics.maxDiscountInSingleOrder}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Profit Leakage Risk Alerts */}
          {auditRisks.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="font-extrabold text-sm text-amber-950 uppercase tracking-wide">
                  Profit Protection Audit ({auditRisks.length} Leakage Warning{auditRisks.length > 1 ? 's' : ''})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {auditRisks.map((risk, idx) => (
                  <div key={idx} className="bg-white border border-amber-200/80 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          risk.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {risk.severity.toUpperCase()} RISK
                        </span>
                        <h4 className="font-bold text-xs text-neutral-900">{risk.title}</h4>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">{risk.desc}</p>
                    </div>
                    <button
                      onClick={() => setActiveTab(risk.actionTab)}
                      className="self-start text-xs font-bold text-[#C0181A] hover:text-[#8B0000] flex items-center gap-1 transition-colors"
                    >
                      Fix / Tighten Now <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Master Active Discounts Audit & Redemption Directory */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#C0181A]" /> Where & How Discounts Are Offered (Redemption Audit)
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Complete directory showing where each discount is given, how customers redeem it, current cost, and direct stop & edit controls.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="p-3">Discount Offer</th>
                    <th className="p-3">Discount Rate</th>
                    <th className="p-3">How Customer Redeems It</th>
                    <th className="p-3">Current Status</th>
                    <th className="p-3">Leakage Risk</th>
                    <th className="p-3 text-right">Actions (Stop & Edit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium text-neutral-800">
                  {/* Coupon Codes */}
                  {coupons.map((coupon) => (
                    <tr key={coupon._id} className={`hover:bg-neutral-50/80 transition-colors ${!coupon.active ? 'opacity-60 bg-neutral-50/50' : ''}`}>
                      <td className="p-3 font-bold">
                        <div className="flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-[#C0181A] shrink-0" />
                          <span>Coupon: <strong className="font-mono text-[#C0181A]">{coupon.code}</strong></span>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-neutral-900">
                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                      </td>
                      <td className="p-3 text-neutral-600">
                        Enters code <code className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono font-bold text-neutral-800">{coupon.code}</code> in checkout cart box
                        {coupon.minSpend > 0 ? ` (Min spend ₹${coupon.minSpend})` : ''}
                      </td>
                      <td className="p-3">
                        <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full ${
                          coupon.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {coupon.active ? '● ACTIVE & LIVE' : '✕ STOPPED / DEACTIVATED'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded ${
                          !coupon.maxUsage ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {!coupon.maxUsage ? 'HIGH (NO CAP)' : 'LOW (CAPPED)'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleToggleCoupon(coupon._id, coupon.active)}
                            className={`font-extrabold px-3 py-1.5 rounded-lg text-[11px] transition-colors inline-flex items-center gap-1.5 ${
                              coupon.active
                                ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                            title={coupon.active ? 'Stop this discount so customers cannot redeem it' : 'Resume this discount'}
                          >
                            {coupon.active ? <Ban className="w-3.5 h-3.5 text-red-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                            <span>{coupon.active ? 'STOP DISCOUNT' : 'RESUME DISCOUNT'}</span>
                          </button>

                          <button
                            onClick={() => handleStartEditCoupon(coupon)}
                            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition-colors inline-flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Minimum Spend Tiers */}
                  {spendTiers.map((tier) => (
                    <tr key={tier._id} className={`hover:bg-neutral-50/80 transition-colors ${tier.active === false ? 'opacity-60 bg-neutral-50/50' : ''}`}>
                      <td className="p-3 font-bold">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-[#C0181A] shrink-0" />
                          <span>Spend Tier: Spend &gt; ₹{tier.minSpend}</span>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-neutral-900">{tier.percentOff}% OFF</td>
                      <td className="p-3 text-neutral-600">
                        Automatically unlocked when cart subtotal reaches ₹{tier.minSpend}
                        {tier.categoryScope ? ` in '${tier.categoryScope}'` : ' (Entire Order)'}
                      </td>
                      <td className="p-3">
                        <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full ${
                          tier.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {tier.active !== false ? '● ACTIVE & LIVE' : '✕ STOPPED / DEACTIVATED'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded ${
                          tier.minSpend < 300 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {tier.minSpend < 300 ? 'MEDIUM (LOW MIN SPEND)' : 'LOW (CONTROLLED)'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleToggleTier(tier)}
                            className={`font-extrabold px-3 py-1.5 rounded-lg text-[11px] transition-colors inline-flex items-center gap-1.5 ${
                              tier.active !== false
                                ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                            title={tier.active !== false ? 'Stop this discount so customers cannot receive it' : 'Resume this discount'}
                          >
                            {tier.active !== false ? <Ban className="w-3.5 h-3.5 text-red-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                            <span>{tier.active !== false ? 'STOP DISCOUNT' : 'RESUME DISCOUNT'}</span>
                          </button>

                          <button
                            onClick={() => handleStartEditTier(tier)}
                            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition-colors inline-flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Combo Rules */}
                  {comboRules.map((rule) => (
                    <tr key={rule._id} className={`hover:bg-neutral-50/80 transition-colors ${!rule.active ? 'opacity-60 bg-neutral-50/50' : ''}`}>
                      <td className="p-3 font-bold">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#C0181A] shrink-0" />
                          <span>Combo: {rule.customerMessage}</span>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-neutral-900">{rule.rewardType.replace(/_/g, ' ')}</td>
                      <td className="p-3 text-neutral-600">
                        Triggered when customer adds items from category &apos;{rule.conditionCategory}&apos;
                      </td>
                      <td className="p-3">
                        <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full ${
                          rule.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {rule.active ? '● ACTIVE & LIVE' : '✕ STOPPED / DEACTIVATED'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          LOW (ITEM SCOPED)
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleToggleComboRule(rule)}
                            className={`font-extrabold px-3 py-1.5 rounded-lg text-[11px] transition-colors inline-flex items-center gap-1.5 ${
                              rule.active
                                ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                            title={rule.active ? 'Stop this discount so customers cannot receive it' : 'Resume this discount'}
                          >
                            {rule.active ? <Ban className="w-3.5 h-3.5 text-red-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                            <span>{rule.active ? 'STOP DISCOUNT' : 'RESUME DISCOUNT'}</span>
                          </button>

                          <button
                            onClick={() => handleStartEditCombo(rule)}
                            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition-colors inline-flex items-center gap-1"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: MASTER CONTROLS & LIMITS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Module Controls Card */}
          <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
            <div>
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#C0181A]" /> Discount Modules Master Control
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Toggle individual discount sub-systems on or off to ensure no unnecessary discounts are given.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  key: 'couponsEnabled',
                  title: 'Promo Coupon Codes',
                  desc: 'Allow customers to redeem checkout coupon codes (e.g. WELCOME10)',
                  enabled: settings.couponsEnabled,
                  icon: Ticket,
                },
                {
                  key: 'spendTiersEnabled',
                  title: 'Minimum Spend Tiers',
                  desc: 'Automatic threshold order discounts (e.g. 10% off over ₹500)',
                  enabled: settings.spendTiersEnabled,
                  icon: Percent,
                },
                {
                  key: 'comboRulesEnabled',
                  title: 'Combo & Upsell Rules',
                  desc: 'Bundle rewards and cross-sell discounts',
                  enabled: settings.comboRulesEnabled,
                  icon: Layers,
                },
                {
                  key: 'itemDiscountsEnabled',
                  title: 'Item Level Deals',
                  desc: 'Direct menu item promotional pricing',
                  enabled: settings.itemDiscountsEnabled,
                  icon: Tag,
                },
              ].map((mod) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.key}
                    className={`border rounded-xl p-4 flex flex-col justify-between transition-colors ${
                      mod.enabled ? 'bg-emerald-50/40 border-emerald-200' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-lg ${
                            mod.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-sm text-neutral-900">{mod.title}</h4>
                      </div>
                      <input
                        type="checkbox"
                        checked={mod.enabled}
                        onChange={(e) => handleUpdateSettings({ [mod.key]: e.target.checked })}
                        className="w-4 h-4 accent-[#C0181A] cursor-pointer"
                      />
                    </div>
                    <p className="text-xs text-neutral-500">{mod.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Max Discount Cap per Order */}
            <div className="border-t border-neutral-200 pt-6 flex flex-col gap-4">
              <div>
                <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" /> Maximum Discount Limit Cap (Per Order)
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Set a maximum dollar/rupee limit on total discount per order to avoid excessive profit loss. Set to 0 for unlimited.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500 (0 = Unlimited)"
                    value={settings.maxDiscountPerOrder}
                    onChange={(e) =>
                      setSettings({ ...settings, maxDiscountPerOrder: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl pl-8 pr-4 py-2.5 text-sm font-semibold outline-none transition-colors"
                  />
                </div>
                <button
                  onClick={() => handleUpdateSettings({ maxDiscountPerOrder: settings.maxDiscountPerOrder })}
                  disabled={savingSettings}
                  className="bg-[#C0181A] hover:bg-[#8B0000] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm"
                >
                  Save Max Cap
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Stacking Policy Card */}
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Discount System Overview
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3.5 text-center">
                  <span className="text-2xl font-black text-neutral-900 block">{coupons.filter((c) => c.active).length}</span>
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Active Coupons</span>
                </div>
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3.5 text-center">
                  <span className="text-2xl font-black text-neutral-900 block">{spendTiers.filter((t) => t.active !== false).length}</span>
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Spend Tiers</span>
                </div>
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3.5 text-center">
                  <span className="text-2xl font-black text-neutral-900 block">{comboRules.filter((r) => r.active).length}</span>
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Combo Rules</span>
                </div>
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3.5 text-center">
                  <span className="text-2xl font-black text-neutral-900 block">
                    {settings.maxDiscountPerOrder > 0 ? `₹${settings.maxDiscountPerOrder}` : 'No Cap'}
                  </span>
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Max Order Cap</span>
                </div>
              </div>
            </div>

            {/* Discount Stacking Rule */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col gap-3">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C0181A]" /> Discount Stacking Policy
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Control whether customers can combine coupon codes together with automated spend tier discounts on a single order.
              </p>

              <label className="flex items-center gap-3 bg-neutral-50 border border-neutral-200 rounded-xl p-3 cursor-pointer hover:bg-neutral-100/60 transition-colors mt-1">
                <input
                  type="checkbox"
                  checked={settings.allowStacking}
                  onChange={(e) => handleUpdateSettings({ allowStacking: e.target.checked })}
                  className="w-4 h-4 accent-[#C0181A]"
                />
                <span className="text-xs font-semibold text-neutral-800">
                  Allow stacking coupon codes with spend tier discounts
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROMO COUPON CODES */}
      {activeTab === 'coupons' && (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Create / Edit Coupon Form */}
          <div className="w-full lg:max-w-md">
            <form onSubmit={handleSaveCoupon} className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-[#C0181A]" />
                    {editingCouponId ? 'Edit Promo Coupon' : 'Create New Coupon Code'}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {editingCouponId ? 'Update details for this coupon.' : 'Generate promo codes for campaigns or VIP customers.'}
                  </p>
                </div>
                {editingCouponId && (
                  <button
                    type="button"
                    onClick={resetCouponForm}
                    className="text-xs text-neutral-500 hover:text-neutral-800 p-1 font-semibold flex items-center gap-1"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold uppercase text-neutral-600 tracking-wider">Coupon Code *</label>
                <input
                  type="text"
                  placeholder="e.g. WELCOME20, SAVE50"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl px-4 py-2.5 text-sm font-mono font-bold uppercase text-neutral-900 outline-none transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold uppercase text-neutral-600 tracking-wider">Discount Type</label>
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value as any)}
                    className="bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl px-3 py-2.5 text-xs font-bold text-neutral-900 outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold uppercase text-neutral-600 tracking-wider">
                    Value ({couponType === 'percentage' ? '%' : '₹'}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 20"
                    value={couponValue}
                    onChange={(e) => setCouponValue(e.target.value ? Number(e.target.value) : '')}
                    className="bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-900 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold uppercase text-neutral-600 tracking-wider">Min Spend (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = No Min"
                    value={couponMinSpend}
                    onChange={(e) => setCouponMinSpend(e.target.value ? Number(e.target.value) : '')}
                    className="bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-900 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold uppercase text-neutral-600 tracking-wider">Max Uses Limit</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Blank = Unlimited"
                    value={couponMaxUsage}
                    onChange={(e) => setCouponMaxUsage(e.target.value ? Number(e.target.value) : '')}
                    className="bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold uppercase text-neutral-600 tracking-wider">Expiration Date</label>
                <input
                  type="date"
                  value={couponExpiresAt}
                  onChange={(e) => setCouponExpiresAt(e.target.value)}
                  className="bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl px-4 py-2.5 text-xs font-semibold text-neutral-900 outline-none"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <AdminButton type="submit" loading={savingCoupon} className="flex-1 text-white bg-[#C0181A] hover:bg-[#8B0000]">
                  {editingCouponId ? 'Save Coupon Changes' : 'Create Coupon Code'}
                </AdminButton>
                {editingCouponId && (
                  <button
                    type="button"
                    onClick={resetCouponForm}
                    className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List of Coupon Codes */}
          <div className="flex-1">
            <h3 className="text-base font-bold text-neutral-900 mb-4">Active & Issued Coupons</h3>
            {coupons.length === 0 ? (
              <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-12 text-center text-sm text-neutral-500">
                <Ticket className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
                No promo coupon codes created yet. Fill in the form on the left to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coupons.map((coupon) => (
                  <div
                    key={coupon._id}
                    className={`border rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-all ${
                      editingCouponId === coupon._id ? 'border-[#C0181A] ring-2 ring-[#C0181A]/20 bg-red-50/20' : ''
                    } ${coupon.active ? 'bg-white border-neutral-200' : 'bg-neutral-50 border-neutral-200 opacity-60'}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-black text-base tracking-wider text-[#C0181A] bg-red-50 border border-red-200 px-3 py-1 rounded-lg">
                          {coupon.code}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(coupon.code)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                            title="Copy Code"
                          >
                            {copiedCode === coupon.code ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="text-lg font-black text-neutral-900 mt-2">
                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                      </div>

                      <div className="flex flex-wrap gap-2 text-[11px] text-neutral-500 font-medium mt-2">
                        {coupon.minSpend > 0 && <span className="bg-neutral-100 px-2 py-0.5 rounded">Min Spend ₹{coupon.minSpend}</span>}
                        <span className="bg-neutral-100 px-2 py-0.5 rounded">
                          Used: {coupon.usageCount} {coupon.maxUsage ? `/ ${coupon.maxUsage}` : ''}
                        </span>
                        {coupon.expiresAt && (
                          <span className="bg-neutral-100 px-2 py-0.5 rounded">
                            Expires: {new Date(coupon.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-neutral-100 pt-3 mt-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${coupon.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {coupon.active ? '● ACTIVE & LIVE' : '✕ STOPPED'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleCoupon(coupon._id, coupon.active)}
                          className={`font-extrabold px-2.5 py-1 rounded-lg text-[11px] transition-colors inline-flex items-center gap-1 ${
                            coupon.active
                              ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                          title={coupon.active ? 'Stop this coupon' : 'Resume this coupon'}
                        >
                          {coupon.active ? <Ban className="w-3.5 h-3.5 text-red-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                          <span>{coupon.active ? 'STOP' : 'RESUME'}</span>
                        </button>
                        <button
                          onClick={() => handleStartEditCoupon(coupon)}
                          className="flex items-center gap-1 text-xs font-bold text-neutral-600 hover:text-[#C0181A] bg-neutral-100 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon._id)}
                          className="text-xs text-neutral-400 hover:text-red-600 p-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MINIMUM SPEND TIERS */}
      {activeTab === 'tiers' && (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Create / Edit Spend Tier Form */}
          <div className="w-full lg:max-w-md">
            <form onSubmit={handleSaveTier} className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <Percent className="w-5 h-5 text-[#C0181A]" />
                    {editingTierId ? 'Edit Minimum Spend Tier' : 'Create Spend Tier'}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {editingTierId ? 'Modify minimum spend & percentage discount.' : 'Offer automatic discount percentages when cart meets minimum spend.'}
                  </p>
                </div>
                {editingTierId && (
                  <button
                    type="button"
                    onClick={resetTierForm}
                    className="text-xs text-neutral-500 hover:text-neutral-800 p-1 font-semibold flex items-center gap-1"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold uppercase text-neutral-600 tracking-wider">Minimum Spend (₹) *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 500"
                  value={tierMinSpend}
                  onChange={(e) => setTierMinSpend(e.target.value ? Number(e.target.value) : '')}
                  className="bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-900 outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold uppercase text-neutral-600 tracking-wider">Discount Percent (%) *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="e.g. 10"
                  value={tierPercentOff}
                  onChange={(e) => setTierPercentOff(e.target.value ? Number(e.target.value) : '')}
                  className="bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-900 outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold uppercase text-neutral-600 tracking-wider">Category Scope (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank for entire cart order"
                  value={tierCategoryScope}
                  onChange={(e) => setTierCategoryScope(e.target.value)}
                  className="bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl px-4 py-2.5 text-sm text-neutral-900 outline-none"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <AdminButton type="submit" loading={savingTier} className="flex-1 text-white bg-[#C0181A] hover:bg-[#8B0000]">
                  {editingTierId ? 'Save Tier Changes' : 'Add Minimum Spend Tier'}
                </AdminButton>
                {editingTierId && (
                  <button
                    type="button"
                    onClick={resetTierForm}
                    className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List of Spend Tiers */}
          <div className="flex-1">
            <h3 className="text-base font-bold text-neutral-900 mb-4">Configured Spend Tiers ({spendTiers.length})</h3>
            {spendTiers.length === 0 ? (
              <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-12 text-center text-sm text-neutral-500">
                <Percent className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
                No spend tiers added yet. Create one on the left.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {spendTiers.map((tier) => (
                  <div
                    key={tier._id}
                    className={`bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all ${
                      editingTierId === tier._id ? 'border-[#C0181A] ring-2 ring-[#C0181A]/20 bg-red-50/20' : 'border-neutral-200'
                    } ${tier.active !== false ? '' : 'opacity-60 bg-neutral-50'}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-neutral-900">{tier.percentOff}% OFF</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tier.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {tier.active !== false ? '● ACTIVE & LIVE' : '✕ STOPPED'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 font-semibold mt-0.5">
                        Applies on cart spend over <strong className="text-neutral-900">₹{tier.minSpend}</strong>
                        {tier.categoryScope ? ` in '${tier.categoryScope}'` : ' (Entire Order)'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleTier(tier)}
                        className={`font-extrabold px-3 py-1.5 rounded-lg text-[11px] transition-colors inline-flex items-center gap-1.5 ${
                          tier.active !== false
                            ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                        title={tier.active !== false ? 'Stop this discount' : 'Resume this discount'}
                      >
                        {tier.active !== false ? <Ban className="w-3.5 h-3.5 text-red-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                        <span>{tier.active !== false ? 'STOP DISCOUNT' : 'RESUME DISCOUNT'}</span>
                      </button>

                      <button
                        onClick={() => handleStartEditTier(tier)}
                        className="flex items-center gap-1 text-xs font-bold text-neutral-600 hover:text-[#C0181A] bg-neutral-100 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTier(tier._id)}
                        className="text-neutral-400 hover:text-red-600 p-1.5 transition-colors"
                        title="Delete Tier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: COMBO RULES */}
      {activeTab === 'combos' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Active Combo & Upsell Rules</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Configure bundle deals (e.g., Buy X get Y free or % off).</p>
            </div>
            <button
              onClick={() => {
                if (showComboForm) resetComboForm();
                else setShowComboForm(true);
              }}
              className="flex items-center gap-1.5 bg-[#C0181A] hover:bg-[#8B0000] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-colors"
            >
              {showComboForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showComboForm ? 'Close Form' : 'Add New Combo Rule'}
            </button>
          </div>

          {/* Create / Edit Combo Rule Form */}
          {showComboForm && (
            <form onSubmit={handleSaveCombo} className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C0181A]" />
                {editingComboId ? 'Edit Combo Rule' : 'Create New Combo Rule'}
              </h4>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold uppercase text-neutral-600 tracking-wider">Customer Message Banner *</label>
                <input
                  type="text"
                  placeholder="e.g. Buy Momos & get 20% off Drinks!"
                  value={comboMessage}
                  onChange={(e) => setComboMessage(e.target.value)}
                  className="bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl px-4 py-2.5 text-sm text-neutral-900 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold uppercase text-neutral-600 tracking-wider">Condition Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Classic Momos"
                    value={comboConditionCat}
                    onChange={(e) => setComboConditionCat(e.target.value)}
                    className="bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl px-3 py-2.5 text-xs text-neutral-900 outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold uppercase text-neutral-600 tracking-wider">Reward Type</label>
                  <select
                    value={comboRewardType}
                    onChange={(e) => setComboRewardType(e.target.value as any)}
                    className="bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl px-3 py-2.5 text-xs font-bold text-neutral-900 outline-none"
                  >
                    <option value="free_item">Free Item</option>
                    <option value="percent_off_item">Percent Off Item</option>
                    <option value="percent_off_order">Percent Off Order</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold uppercase text-neutral-600 tracking-wider">Reward Target Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Tokyo Soups, beverages:20"
                    value={comboRewardTarget}
                    onChange={(e) => setComboRewardTarget(e.target.value)}
                    className="bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl px-3 py-2.5 text-xs text-neutral-900 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <AdminButton type="submit" loading={savingCombo} className="flex-1 text-white bg-[#C0181A] hover:bg-[#8B0000]">
                  {editingComboId ? 'Save Combo Changes' : 'Create Combo Rule'}
                </AdminButton>
                <button
                  type="button"
                  onClick={resetComboForm}
                  className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* List of Combo Rules */}
          {comboRules.length === 0 ? (
            <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-12 text-center text-sm text-neutral-500">
              <Layers className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
              No combo rules defined yet. Click &quot;Add New Combo Rule&quot; above to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comboRules.map((rule) => (
                <div
                  key={rule._id}
                  className={`bg-white border rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-all ${
                    editingComboId === rule._id ? 'border-[#C0181A] ring-2 ring-[#C0181A]/20 bg-red-50/20' : 'border-neutral-200'
                  } ${rule.active ? '' : 'opacity-60 bg-neutral-50'}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#C0181A] uppercase tracking-wider">
                        {rule.rewardType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-neutral-900 mt-1">{rule.customerMessage}</h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      Trigger category: <strong className="text-neutral-700">{rule.conditionCategory}</strong> · Target: <strong className="text-neutral-700">{rule.rewardTarget}</strong>
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-100 pt-3 mt-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${rule.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {rule.active ? '● ACTIVE & LIVE' : '✕ STOPPED'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleComboRule(rule)}
                        className={`font-extrabold px-2.5 py-1 rounded-lg text-[11px] transition-colors inline-flex items-center gap-1 ${
                          rule.active
                            ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                        title={rule.active ? 'Stop this combo rule' : 'Resume this combo rule'}
                      >
                        {rule.active ? <Ban className="w-3.5 h-3.5 text-red-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                        <span>{rule.active ? 'STOP' : 'RESUME'}</span>
                      </button>

                      <button
                        onClick={() => handleStartEditCombo(rule)}
                        className="flex items-center gap-1 text-xs font-bold text-neutral-600 hover:text-[#C0181A] bg-neutral-100 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteComboRule(rule._id)}
                        className="text-xs text-neutral-400 hover:text-red-600 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MENU ITEM CATALOG */}
      {activeTab === 'items' && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Menu Items Overview</h3>
              <p className="text-xs text-neutral-500">View menu items and active pricing.</p>
            </div>
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search items by name..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 focus:border-[#C0181A] rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-neutral-900 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredMenuItems.map((item) => (
              <div key={item._id} className="border border-neutral-200 rounded-xl p-3 flex items-center justify-between bg-neutral-50/50">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900">{item.name}</h4>
                  <span className="text-xs text-neutral-500 font-semibold">{item.category} • ₹{item.price}</span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  STANDARD
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
