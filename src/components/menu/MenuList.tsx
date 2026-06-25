'use client';

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { addItem, updateQuantity, removeItem, setTableId } from '@/redux/cartSlice';
import Link from 'next/link';
import { logEvent } from '@/actions/orders';
import { Search, ShoppingBag, Minus, Plus, X, ChevronLeft, ChevronRight, Flame } from 'lucide-react';

const DISH_PLACEHOLDER = '/dish_placeholder.jpg';

const getItemImage = (image?: string) => {
  if (!image || image.startsWith('data:image/svg+xml')) return DISH_PLACEHOLDER;
  return image;
};

interface MenuItem {
  _id: string;
  restaurantId: string;
  category: string;
  name: string;
  description: string;
  image: string;
  price: number;
  available: boolean;
  images?: string[];
  preparation?: string;
  ingredients?: string[];
  nutrition?: { calories: number; protein: number; carbs: number; fat: number };
  spiceLevel?: number;
  portionSize?: string;
  prepTimeMin?: number;
  prepTimeMax?: number;
  chefNote?: string;
  active?: boolean;
  pairsWithCategories?: string[];
}

// Fallback nutrition estimator
const estimateNutrition = (name: string, category: string) => {
<<<<<<< Updated upstream
  const lowerName = name.toLowerCase();
  const lowerCat = category.toLowerCase();

  let calories = 250;
  let protein = 12;
  let carbs = 35;
  let fat = 8;

  if (lowerCat.includes('salad') || lowerName.includes('salad')) {
    calories = 180; protein = 15; carbs = 8; fat = 6;
    if (lowerName.includes('chicken')) { protein = 24; calories = 220; }
  } else if (lowerCat.includes('soup') || lowerName.includes('soup')) {
    calories = 95; protein = 4; carbs = 12; fat = 2;
    if (lowerName.includes('chicken')) { protein = 8; calories = 110; }
  } else if (lowerCat.includes('momo') || lowerName.includes('momo')) {
    calories = 280; protein = 14; carbs = 38; fat = 8;
    if (lowerName.includes('fried') || lowerName.includes('crispy')) { calories = 380; fat = 16; }
    if (lowerName.includes('cheese') || lowerName.includes('paneer')) { calories = 340; fat = 14; protein = 15; }
    if (lowerName.includes('chicken') || lowerName.includes('meat')) { protein = 18; calories = 290; }
  } else if (lowerCat.includes('rice') || lowerName.includes('rice') || lowerCat.includes('noodle') || lowerName.includes('noodle')) {
    calories = 520; protein = 12; carbs = 78; fat = 10;
    if (lowerName.includes('chicken')) { protein = 22; calories = 560; fat = 12; }
    if (lowerName.includes('egg')) { protein = 16; calories = 540; }
  } else if (lowerCat.includes('roll') || lowerName.includes('roll') || lowerName.includes('wrap')) {
    calories = 420; protein = 16; carbs = 48; fat = 14;
    if (lowerName.includes('chicken')) { protein = 22; calories = 460; }
  }
  return { calories, protein, carbs, fat };
};

const highlightAllergens = (text: string) => {
  const allergenRegex = /(nuts|dairy|egg|gluten|wheat|soy|shellfish|fish|sesame|milk|cheese|cashew|peanut|butter|almond)/gi;
  const parts = text.split(allergenRegex);
  return parts.map((part, idx) => {
    if (part.toLowerCase().match(allergenRegex)) {
      return (
        <strong key={idx} className="text-primary font-bold">
          {part}
        </strong>
      );
    }
    return part;
  });
};


const getItemTag = (name: string, category: string, price: number) => {
  const lowerName = name.toLowerCase();
  const lowerCat = category.toLowerCase();

  if (lowerName.includes('tandoori') || lowerName.includes('ramen') || lowerName.includes('butter chicken')) {
    return { text: "CHEF'S SPECIAL", bg: 'bg-cta/20 text-text-dark' };
  }
  if (lowerName.includes('schezwan') || lowerName.includes('chilli') || lowerName.includes('peri peri') || lowerName.includes('spicy')) {
    return { text: 'EXTRA SPICY', bg: 'bg-primary/10 text-primary' };
  }
  if (lowerCat.includes('salad') || lowerCat.includes('fit') || lowerName.includes('protein') || lowerName.includes('breast')) {
    return { text: 'HEALTHY CHOICE', bg: 'bg-green-100 text-green-800' };
  }
  if (lowerName.includes('steam') || lowerName.includes('classic') || lowerName.includes('noodle')) {
    if (price > 140) {
      return { text: "TODAY'S SPECIAL", bg: 'bg-cta/15 text-text-dark' };
    } else {
      return { text: 'MOST POPULAR', bg: 'bg-primary/10 text-primary' };
    }
  }
  if (price > 200) {
    return { text: 'PREMIUM', bg: 'bg-bg-dark/10 text-bg-dark' };
  }

  const hash = name.length % 3;
  if (hash === 0) {
    return { text: "RECOMMENDED", bg: 'bg-cta/15 text-text-dark' };
  } else if (hash === 1) {
    return { text: 'BEST SELLER', bg: 'bg-primary/10 text-primary' };
  } else {
    return { text: 'HOUSE SPECIAL', bg: 'bg-bg-dark/10 text-bg-dark' };
=======
  const n = name.toLowerCase(), c = category.toLowerCase();
  let cal = 280, pro = 14, carb = 36, fat = 9;
  if (c.includes('salad') || n.includes('salad')) { cal = 180; pro = 15; carb = 8; fat = 6; }
  else if (c.includes('soup') || n.includes('soup')) { cal = 95; pro = 4; carb = 12; fat = 2; }
  else if (c.includes('momo') || n.includes('momo')) {
    cal = 280; pro = 14; carb = 38; fat = 8;
    if (n.includes('fried') || n.includes('crispy')) { cal = 380; fat = 16; }
    if (n.includes('cheese') || n.includes('paneer')) { cal = 340; fat = 14; }
    if (n.includes('chicken') || n.includes('meat')) { pro = 18; cal = 290; }
  } else if (c.includes('rice') || n.includes('rice') || c.includes('noodle') || n.includes('noodle')) {
    cal = 520; pro = 12; carb = 78; fat = 10;
    if (n.includes('chicken')) { pro = 22; cal = 560; }
>>>>>>> Stashed changes
  }
  return { calories: cal, protein: pro, carbs: carb, fat };
};

const COMMON_ALLERGENS = ['wheat','soy','dairy','egg','peanut','milk','cheese','gluten','nut','cashew','sesame'];
const isAllergen = (ing: string) => COMMON_ALLERGENS.some(a => ing.toLowerCase().includes(a));

interface MenuListProps {
  initialItems: MenuItem[];
  restaurantName: string;
  restaurantId: string;
  table?: string;
  logoUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  upsellData?: {
    pairingRules: any[];
    computedAffinity: Record<string, Array<{ name: string; confidence: number }>>;
    completedCount: number;
    menuItems: MenuItem[];
  };
}

export default function MenuList({
  initialItems,
  restaurantName,
  restaurantId,
  table,
  logoUrl,
<<<<<<< Updated upstream
  welcomeMessage,
=======
  primaryColor,
>>>>>>> Stashed changes
  upsellData,
}: MenuListProps) {
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart);

  React.useEffect(() => { dispatch(setTableId(table || null)); }, [table, dispatch]);

  const brand = primaryColor || '#8b0021';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  // "added to bag" toast state
  const [lastAdded, setLastAdded] = useState<MenuItem | null>(null);
  const [showAddedModal, setShowAddedModal] = useState(false);

  const openDetail = (item: MenuItem) => {
    setDetailItem(item);
    setActiveImageIdx(0);
    logEvent(restaurantId, 'modal_open', item._id).catch(() => {});
  };

  const getPairedItem = (item: MenuItem): { item: MenuItem; showSocialProof: boolean } | null => {
    if (!upsellData) return null;
    const { computedAffinity, pairingRules, menuItems } = upsellData;
<<<<<<< Updated upstream

    const notThisItem = menuItems.filter(
      (m) => m.available && m.active !== false && m._id !== item._id
    );

    const isFitMeal = ['Fit Meals', 'Chicken Salad'].includes(item.category);
    const isExcludedByDiet = (candidate: MenuItem) => {
      if (!isFitMeal) return false;
      const nameLower = candidate.name.toLowerCase();
      const catLower = candidate.category.toLowerCase();
      const richKeywords = ['butter', 'malai', 'cheese', 'cheesy', 'fried', 'crispy'];
      return richKeywords.some(kw => nameLower.includes(kw) || catLower.includes(kw));
    };
    const candidates = notThisItem.filter(c => !isExcludedByDiet(c));

    if (candidates.length === 0) return null;

    const affinityList = computedAffinity ? computedAffinity[item.name] : null;
    if (affinityList && Array.isArray(affinityList) && affinityList.length > 0) {
=======
    const notThis = menuItems.filter(m => m.available && m.active !== false && m._id !== item._id);
    if (!notThis.length) return null;
    const affinityList = computedAffinity?.[item.name];
    if (affinityList?.length) {
>>>>>>> Stashed changes
      for (const aff of affinityList) {
        const matched = notThis.find(c => c.name === aff.name);
        if (matched) return { item: matched, showSocialProof: true };
      }
    }
<<<<<<< Updated upstream

    if (item.pairsWithCategories && item.pairsWithCategories.length > 0) {
=======
    if (item.pairsWithCategories?.length) {
>>>>>>> Stashed changes
      for (const cat of item.pairsWithCategories) {
        const matched = notThis.find(c => c.category === cat);
        if (matched) return { item: matched, showSocialProof: false };
      }
    }
<<<<<<< Updated upstream

    if (pairingRules && pairingRules.length > 0) {
      const activeRules = pairingRules.filter((r) => r.active && r.triggerCategory === item.category);
      for (const rule of activeRules) {
=======
    for (const rule of (pairingRules || [])) {
      if (rule.active && rule.triggerCategory === item.category) {
>>>>>>> Stashed changes
        for (const cat of rule.suggestCategories) {
          const matched = notThis.find(c => c.category === cat);
          if (matched) return { item: matched, showSocialProof: false };
        }
      }
    }
    return null;
  };

<<<<<<< Updated upstream
  const categories = Array.from(new Set(initialItems.map((item) => item.category)));

  const filteredItems = initialItems.filter((item) => {
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.available;
  });

  const getItemQuantity = (itemId: string) => {
    const item = cart.items.find((i) => i.id === itemId);
    return item ? item.quantity : 0;
=======
  const categories = Array.from(new Set(initialItems.map(i => i.category)));

  const filteredItems = initialItems.filter(item => {
    const cat = selectedCategory ? item.category === selectedCategory : true;
    const q = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return cat && q && item.available;
  });

  const getQty = (id: string) => cart.items.find(i => i.id === id)?.quantity || 0;

  const handleAdd = (item: MenuItem, fromNudge = false, nudgeType?: 'cross_sell' | 'threshold_discount' | 'combo_freebie', nudgeRuleId?: string) => {
    if (cart.items.length === 0) logEvent(restaurantId, 'cart_create').catch(() => {});
    dispatch(addItem({
      item: { id: item._id, name: item.name, price: item.price, image: item.image, category: item.category, originatedFromNudge: fromNudge, nudgeType, nudgeRuleId },
      restaurantId,
      restaurantName,
    }));
    setLastAdded(item);
    setShowAddedModal(true);
>>>>>>> Stashed changes
  };

  const handleRemove = (id: string, qty: number) => {
    if (qty <= 1) dispatch(removeItem(id));
    else dispatch(updateQuantity({ id, quantity: qty - 1 }));
  };

  const handleAddMore = (id: string, qty: number) => dispatch(updateQuantity({ id, quantity: qty + 1 }));

  const totalCount = cart.items.reduce((s, i) => s + i.quantity, 0);

  // Group items by category for display
  const groupedItems = React.useMemo(() => {
    const groups: Array<{ category: string; items: MenuItem[] }> = [];
    categories.forEach(cat => {
      const items = filteredItems.filter(i => i.category === cat);
      if (items.length > 0) groups.push({ category: cat, items });
    });
    return groups;
  }, [categories, filteredItems]);

<<<<<<< Updated upstream
  const slides = selectedDetailedItem
    ? [getItemImage(selectedDetailedItem.image), ...(selectedDetailedItem.images || []).map(img => getItemImage(img))].filter(Boolean)
    : [];

  return (
    <div className="flex flex-col min-h-screen bg-white pb-28">
      {/* Hero Header */}
      <header className="bg-gradient-to-br from-bg-dark to-bg-darker relative overflow-hidden">
        {/* Wave decoration */}
        <svg
          className="absolute bottom-0 left-0 w-full h-16 opacity-100"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0,60L60,52C120,44,240,28,360,32C480,36,600,60,720,68C840,76,960,68,1080,56C1200,44,1320,28,1380,20L1440,12L1440,120L0,120Z"
            fill="#C0181A"
            fillOpacity="0.15"
          />
        </svg>

        <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-8">
          {/* Restaurant Info */}
          <div className="flex items-center gap-3 mb-4">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={restaurantName}
                className="w-12 h-12 rounded-full object-cover border-2 border-white/30 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black uppercase tracking-tight text-white leading-tight">
                {restaurantName}
              </h1>
              {welcomeMessage && (
                <p className="text-white/70 text-xs mt-0.5 leading-tight">{welcomeMessage}</p>
              )}
            </div>
            {table && (
              <span className="bg-white/20 text-white text-[0.65rem] font-bold uppercase px-2.5 py-1 rounded-full">
                Table {table}
              </span>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark/40" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white rounded-xl pl-10 pr-4 py-3 text-sm text-text-dark outline-none placeholder:text-text-dark/40 shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
            />
          </div>
        </div>
      </header>

      {/* Promo Banner */}
      <div className="w-full px-4 py-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-bg-dark via-bg-dark to-primary rounded-2xl overflow-hidden flex items-stretch h-[140px] shadow-[0_6px_24px_rgba(139,0,0,0.25)]">
            <div className="w-[60%] p-5 flex flex-col justify-center relative z-10">
              <h2 className="font-black text-xl text-white leading-tight tracking-tight">
                Free delivery for<br />
                <span className="text-cta">today&apos;s specials</span>
              </h2>
              <p className="text-[0.7rem] text-white/70 mt-1.5 font-medium">Up to 3 times per day</p>
              <button className="mt-3 bg-cta text-text-dark text-[0.7rem] font-bold uppercase px-5 py-2.5 rounded-full w-fit active:scale-95 transition-transform shadow-[0_4px_12px_rgba(245,197,24,0.3)]">
                Order now
              </button>
            </div>
            <div className="w-[40%] relative overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={DISH_PLACEHOLDER}
                alt="Featured dish"
                className="w-full h-full object-cover scale-110"
              />
              {/* Arc separator */}
              <svg
                className="absolute left-0 top-0 h-full w-6"
                viewBox="0 0 24 100"
                preserveAspectRatio="none"
                fill="none"
              >
                <path d="M24,0 C0,25 0,75 24,100 L0,100 L0,0 Z" fill="#8B0000" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="sticky top-0 z-20 bg-white border-b border-surface shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === null
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-dark hover:bg-primary/10'
              }`}
=======
  const slides = detailItem ? [detailItem.image, ...(detailItem.images || [])].filter(Boolean) : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#eef2fb' }}>
      <style>{`
        :root { --brand: ${brand}; }
        .brand-text { color: ${brand}; }
        .brand-bg { background-color: ${brand}; }
        .brand-border { border-color: ${brand}; }
        .cat-active { background-color: ${brand} !important; color: #fff !important; border-color: ${brand} !important; }
        .add-circle { background-color: ${brand}; }
        .qty-bg { background-color: ${brand}1a; }
        .qty-icon { color: ${brand}; }
      `}</style>

      {/* ─── STICKY HEADER ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#eef2fb] pt-5 pb-2 px-5">
        <div className="max-w-lg mx-auto">
          {/* Top Row: search icon | restaurant name + table | cart */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => { setSearchOpen(v => !v); if (searchOpen) setSearchQuery(''); }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm"
              aria-label="Search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={brand} strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>

            <div className="text-center">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                {table ? `Table ${table}` : 'Menu'}
              </p>
              <div className="flex items-center gap-1 justify-center">
                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                )}
                <h1 className="font-serif font-bold text-[17px] text-gray-900">{restaurantName}</h1>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            <Link href="/cart" aria-label="Cart">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm relative">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={brand} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                {totalCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white brand-bg">
                    {totalCount}
                  </span>
                )}
              </div>
            </Link>
          </div>

          {/* Search input */}
          {searchOpen && (
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search dishes…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-white rounded-full px-5 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none shadow-sm"
                style={{ border: `1.5px solid ${brand}44` }}
              />
            </div>
          )}

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedCategory === null ? 'cat-active' : 'bg-white text-gray-700 border-gray-200'}`}
>>>>>>> Stashed changes
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
<<<<<<< Updated upstream
                className={`px-4 py-2 text-xs font-bold uppercase rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-surface text-text-dark hover:bg-primary/10'
                }`}
=======
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedCategory === cat ? 'cat-active' : 'bg-white text-gray-700 border-gray-200'}`}
>>>>>>> Stashed changes
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

<<<<<<< Updated upstream
      {/* Menu Items Grid */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-dark/50 text-sm">No items found matching your search.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredItems.map((item) => {
              const qty = getItemQuantity(item._id);
              const tag = getItemTag(item.name, item.category, item.price);
              return (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] p-3.5 flex gap-3.5"
                >
                  {/* Image */}
                  <div
                    onClick={() => openDetailedModal(item)}
                    className="w-[90px] h-[90px] rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getItemImage(item.image)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      {tag && (
                        <span className={`text-[0.6rem] font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mb-1.5 ${tag.bg}`}>
                          {tag.text}
                        </span>
                      )}
                      <h3
                        onClick={() => openDetailedModal(item)}
                        className="font-bold text-sm text-text-dark leading-tight cursor-pointer hover:text-primary transition-colors line-clamp-1"
                      >
                        {item.name}
                      </h3>
                      <p className="text-xs text-text-dark/60 mt-0.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="font-black text-base text-text-dark">
                        ₹{item.price}
                      </span>

                      {qty === 0 ? (
                        <button
                          onClick={() => handleAddOne(item)}
                          className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wide active:scale-95 transition-transform"
                        >
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-0 bg-primary rounded-lg overflow-hidden">
                          <button
                            onClick={() => handleRemoveOne(item._id, qty)}
                            className="text-white px-2.5 py-2 active:bg-bg-dark transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-white font-bold text-sm px-2 min-w-[24px] text-center">{qty}</span>
                          <button
                            onClick={() => handleAddMore(item._id, qty)}
                            className="text-white px-2.5 py-2 active:bg-bg-dark transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4">
          <Link
            href="/cart"
            className="max-w-2xl mx-auto flex items-center justify-between bg-primary rounded-2xl px-5 py-4 shadow-[0_8px_30px_rgba(139,0,0,0.4)] active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-white/80 text-xs font-medium block">
                  {totalItemsCount} item{totalItemsCount > 1 ? 's' : ''}
                </span>
                <span className="text-white font-black text-lg leading-tight">₹{cart.total}</span>
              </div>
            </div>
            <span className="text-white font-bold text-sm uppercase tracking-wide">
              View Cart →
            </span>
          </Link>
        </div>
      )}

      {/* Product Details Modal */}
      {selectedDetailedItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedDetailedItem(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Slider */}
            {slides.length > 0 && (
              <div className="relative w-full h-56 overflow-hidden bg-surface">
                <div
                  className="flex h-full transition-transform duration-300 ease-out"
                  style={{ transform: `translate3d(-${activeImageIndex * 100}%, 0, 0)` }}
                >
                  {slides.map((slide, idx) => (
                    <div key={idx} className="w-full h-full flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slide}
                        alt={`${selectedDetailedItem.name} slide ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                {/* Close button */}
                <button
                  onClick={() => setSelectedDetailedItem(null)}
                  className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white rounded-full p-2 z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                {slides.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev - 1 + slides.length) % slides.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1.5 shadow-md z-10"
                    >
                      <ChevronLeft className="w-4 h-4 text-text-dark" />
                    </button>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev + 1) % slides.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1.5 shadow-md z-10"
                    >
                      <ChevronRight className="w-4 h-4 text-text-dark" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {slides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            activeImageIndex === idx ? 'bg-white scale-125' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto">
              {/* Header info */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <span className="text-[0.65rem] text-primary font-bold uppercase tracking-wider">
                    {selectedDetailedItem.category}
                  </span>
                  <h3 className="font-black text-xl text-text-dark leading-tight mt-0.5">
                    {selectedDetailedItem.name}
                  </h3>
                </div>
                <span className="font-black text-xl text-primary shrink-0">
                  ₹{selectedDetailedItem.price}
                </span>
              </div>

              {/* Quick info row */}
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                {selectedDetailedItem.spiceLevel !== undefined && selectedDetailedItem.spiceLevel > 0 && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: selectedDetailedItem.spiceLevel }).map((_, i) => (
                      <Flame key={i} className="w-3.5 h-3.5 text-primary fill-primary" />
                    ))}
                  </div>
                )}
                <span className="text-xs text-text-dark/60">
                  {selectedDetailedItem.portionSize || 'Good for 1'}
                </span>
                <span className="text-xs text-text-dark/60">
                  ~{selectedDetailedItem.prepTimeMin || 10}-{selectedDetailedItem.prepTimeMax || 12} min
                </span>
              </div>

              {/* Chef's Note */}
              {selectedDetailedItem.chefNote && (
                <div className="bg-cta/10 rounded-xl p-3 mb-4">
                  <p className="text-xs text-text-dark italic leading-relaxed">
                    &ldquo;{selectedDetailedItem.chefNote}&rdquo; — Chef
                  </p>
                </div>
              )}

              {/* Description */}
              <p className="text-sm text-text-dark/70 leading-relaxed mb-4">{selectedDetailedItem.description}</p>

              {/* Preparation */}
              {selectedDetailedItem.preparation && (
                <div className="mb-4">
                  <h4 className="text-[0.65rem] font-bold uppercase text-bg-dark tracking-wider mb-1">Preparation</h4>
                  <p className="text-xs text-text-dark/70 leading-relaxed">{selectedDetailedItem.preparation}</p>
                </div>
              )}

              {/* Ingredients */}
              {selectedDetailedItem.ingredients && selectedDetailedItem.ingredients.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[0.65rem] font-bold uppercase text-bg-dark tracking-wider mb-2">Ingredients</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDetailedItem.ingredients.map((ing, idx) => {
                      const allergen = isAllergen(ing);
                      return (
                        <span
                          key={idx}
                          className={`text-[0.65rem] px-2 py-1 rounded-full ${
                            allergen ? 'bg-primary/10 text-primary font-bold' : 'bg-surface text-text-dark/70'
                          }`}
                        >
                          {highlightAllergens(ing)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nutrition */}
              {(() => {
                const hasCustomNutrition = !!(selectedDetailedItem.nutrition &&
                  (selectedDetailedItem.nutrition.calories > 0 ||
                   selectedDetailedItem.nutrition.protein > 0 ||
                   selectedDetailedItem.nutrition.carbs > 0 ||
                   selectedDetailedItem.nutrition.fat > 0));

                const displayNutrition = hasCustomNutrition && selectedDetailedItem.nutrition
                  ? selectedDetailedItem.nutrition
                  : estimateNutrition(selectedDetailedItem.name, selectedDetailedItem.category);

                return (
                  <div className="mb-4">
                    <h4 className="text-[0.65rem] font-bold uppercase text-bg-dark tracking-wider mb-2">
                      Nutrition {hasCustomNutrition ? '' : '(Approx)'}
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Cal', value: displayNutrition.calories },
                        { label: 'Protein', value: `${displayNutrition.protein}g` },
                        { label: 'Carbs', value: `${displayNutrition.carbs}g` },
                        { label: 'Fat', value: `${displayNutrition.fat}g` },
                      ].map((n) => (
                        <div key={n.label} className="bg-surface rounded-lg p-2 text-center">
                          <span className="text-[0.6rem] text-text-dark/50 uppercase block">{n.label}</span>
                          <span className="text-sm font-bold text-text-dark">{n.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Goes Well With */}
              {(() => {
                const pairedData = getPairedItem(selectedDetailedItem);
                if (!pairedData) return null;

                const pairedItem = pairedData.item;
                const showAnySocialProof = !selectedDetailedItem.chefNote;
                const pairedQty = getItemQuantity(pairedItem._id);

                return (
                  <div className="border-t border-surface pt-4 mt-2">
                    <h4 className="text-[0.65rem] font-bold uppercase text-bg-dark tracking-wider mb-2">
                      Goes Well With
                    </h4>

                    {showAnySocialProof && (
                      <p className="text-[0.65rem] text-text-dark/50 mb-2">
                        {pairedData.showSocialProof
                          ? `Most people order this with ${pairedItem.name}`
                          : `Popular choice recommended with this item`}
                      </p>
                    )}

                    <div className="bg-surface rounded-xl p-3 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getItemImage(pairedItem.image)} alt={pairedItem.name} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-sm text-text-dark truncate">{pairedItem.name}</h5>
                        <span className="text-xs font-bold text-primary">₹{pairedItem.price}</span>
=======
      {/* ─── MENU CONTENT ──────────────────────────────────────────────── */}
      <main className="max-w-lg mx-auto px-4 pt-4 pb-32">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center mt-4">
            <p className="text-gray-400 text-sm">No items found</p>
          </div>
        ) : (
          groupedItems.map(({ category, items }) => (
            <div key={category} className="mb-6">
              {/* Section header */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif font-bold text-xl text-gray-900">{category}</h2>
                <span className="text-xs text-gray-400 font-medium">See all</span>
              </div>

              {/* Item cards */}
              <div className="flex flex-col gap-3">
                {items.map(item => {
                  const qty = getQty(item._id);
                  return (
                    <div
                      key={item._id}
                      className="bg-white rounded-2xl flex items-center gap-3 p-3 shadow-sm cursor-pointer"
                      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                    >
                      {/* Thumb */}
                      <div
                        className="w-[90px] h-[90px] rounded-xl flex-shrink-0 overflow-hidden bg-gray-100"
                        onClick={() => openDetail(item)}
                      >
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-2xl">🍽️</span>
                          </div>
                        )}
>>>>>>> Stashed changes
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0" onClick={() => openDetail(item)}>
                        <h3 className="font-bold text-[15px] text-gray-900 leading-tight">{item.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {/* Star */}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                          </svg>
                          <span className="text-[11px] font-semibold text-gray-500">4.5</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-[11px] text-gray-400">~{item.prepTimeMin || 10}–{item.prepTimeMax || 15} min</span>
                        </div>
                        <p className="font-bold text-[17px] mt-2 brand-text">₹{item.price}</p>
                      </div>

                      {/* Add / Qty control */}
                      <div className="flex-shrink-0">
                        {qty === 0 ? (
                          <button
<<<<<<< Updated upstream
                            onClick={() => handleAddOne(pairedItem, true, 'cross_sell', pairedItem._id)}
                            className="bg-primary text-white text-[0.65rem] font-bold px-3 py-1.5 rounded-lg uppercase active:scale-95 transition-transform"
=======
                            onClick={() => handleAdd(item)}
                            className="add-circle w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-90"
                            style={{ boxShadow: `0 4px 12px ${brand}55` }}
>>>>>>> Stashed changes
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M12 5v14M5 12h14"/>
                            </svg>
                          </button>
                        ) : (
<<<<<<< Updated upstream
                          <div className="flex items-center gap-0 bg-primary rounded-lg overflow-hidden">
                            <button
                              onClick={() => handleRemoveOne(pairedItem._id, pairedQty)}
                              className="text-white px-2 py-1.5"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-white font-bold text-xs px-1.5">{pairedQty}</span>
                            <button
                              onClick={() => handleAddMore(pairedItem._id, pairedQty)}
                              className="text-white px-2 py-1.5"
                            >
                              <Plus className="w-3 h-3" />
=======
                          <div className="flex items-center rounded-full px-1.5 py-1 gap-1 qty-bg">
                            <button onClick={() => handleRemove(item._id, qty)} className="w-6 h-6 flex items-center justify-center qty-icon">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>
                            </button>
                            <span className="font-bold text-sm w-5 text-center text-gray-900">{qty}</span>
                            <button onClick={() => handleAddMore(item._id, qty)} className="w-6 h-6 flex items-center justify-center qty-icon">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
>>>>>>> Stashed changes
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>

      {/* ─── FLOATING CART BAR ─────────────────────────────────────────── */}
      {totalCount > 0 && (
        <div className="fixed bottom-5 left-4 right-4 z-30 max-w-lg mx-auto">
          <Link href="/cart">
            <div
              className="brand-bg rounded-full px-6 py-4 flex items-center justify-between shadow-2xl"
              style={{ boxShadow: `0 8px 32px ${brand}55` }}
            >
              <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center">
                <span className="font-bold text-white text-sm">{totalCount}</span>
              </div>
              <span className="font-bold text-white text-[15px]">Go to Checkout</span>
              <span className="font-serif font-bold text-white text-[17px]">₹{cart.total}</span>
            </div>
          </Link>
        </div>
      )}

      {/* ─── "ADDED TO BAG" CONFIRMATION MODAL ─────────────────────────── */}
      {showAddedModal && lastAdded && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAddedModal(false)}>
          <div
            className="bg-[#eef2fb] w-full max-w-lg rounded-t-3xl px-5 pt-6 pb-10 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setShowAddedModal(false)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
              <h2 className="font-serif font-bold text-xl" style={{ color: brand }}>Item Added</h2>
              <div className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm relative">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={brand} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                {totalCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center brand-bg">{totalCount}</span>
                )}
              </div>
            </div>

            {/* Success message */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#dcfce7' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>
                </svg>
              </div>
              <h3 className="font-serif font-bold text-2xl text-gray-900 mb-1">Added to Bag!</h3>
              <p className="text-sm text-gray-500">Great choice. Let&apos;s finish your order or add more treats.</p>
            </div>

            {/* Added item card */}
            <div className="bg-white rounded-2xl p-3 flex items-center gap-3 mb-6 shadow-sm">
              {lastAdded.image && (
                <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lastAdded.image} alt={lastAdded.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm">{lastAdded.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{lastAdded.category}</p>
                <p className="font-bold text-[17px] mt-1 brand-text">₹{lastAdded.price}</p>
              </div>
              <div className="flex items-center rounded-full px-2 py-1.5 gap-1 qty-bg">
                <button onClick={() => handleRemove(lastAdded._id, getQty(lastAdded._id))} className="w-6 h-6 flex items-center justify-center qty-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>
                </button>
                <span className="font-bold text-sm w-5 text-center text-gray-900">{getQty(lastAdded._id)}</span>
                <button onClick={() => handleAddMore(lastAdded._id, getQty(lastAdded._id))} className="w-6 h-6 flex items-center justify-center qty-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                </button>
              </div>
            </div>

            {/* Upsell: Goes well with */}
            {(() => {
              const pair = getPairedItem(lastAdded);
              const crossItems = upsellData?.menuItems.filter(m =>
                m.available && m.active !== false && m._id !== lastAdded._id && !cart.items.some(i => i.id === m._id)
              ).slice(0, 3) || [];
              const displayItems = pair ? [pair.item, ...crossItems.filter(i => i._id !== pair.item._id)].slice(0, 3) : crossItems;

              if (displayItems.length === 0) return null;
              return (
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-serif font-bold text-lg text-gray-900">Add more &amp; Save</h4>
                    <span className="text-xs brand-text font-semibold">See all</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {displayItems.map(item => (
                      <div
                        key={item._id}
                        className="flex-shrink-0 w-[130px] bg-white rounded-2xl p-3 flex flex-col gap-2"
                        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                      >
                        <div className="w-full h-[90px] rounded-xl overflow-hidden bg-gray-100">
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                          )}
                        </div>
                        <p className="font-semibold text-[12px] text-gray-900 line-clamp-2 leading-tight">{item.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[13px] brand-text">+₹{item.price}</span>
                          <button
                            onClick={() => handleAdd(item, true, 'cross_sell', item._id)}
                            className="text-[11px] font-bold text-gray-600 bg-gray-100 rounded-full px-3 py-1 hover:bg-gray-200 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Action buttons */}
            <Link href="/cart" onClick={() => setShowAddedModal(false)}>
              <div
                className="brand-bg rounded-full py-4 flex items-center justify-between px-6 mb-3 shadow-lg"
                style={{ boxShadow: `0 6px 20px ${brand}44` }}
              >
                <span className="font-bold text-white text-[15px]">Go to Checkout</span>
                <span className="font-serif font-bold text-white text-[17px]">₹{cart.total}</span>
              </div>
            </Link>
            <button
              onClick={() => setShowAddedModal(false)}
              className="w-full py-4 rounded-full border-2 font-bold text-[15px] brand-text transition-all active:scale-95"
              style={{ borderColor: brand }}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {/* ─── ITEM DETAIL MODAL ──────────────────────────────────────────── */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="bg-white w-full max-w-lg max-h-[95vh] flex flex-col rounded-t-[2rem] overflow-hidden animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Hero Image */}
            <div className="relative h-[300px] flex-shrink-0 bg-gray-100">
              {slides.length > 0 ? (
                <div
                  className="flex h-full transition-transform duration-300"
                  style={{ transform: `translateX(-${activeImageIdx * 100}%)` }}
                >
                  {slides.map((s, i) => (
                    <div key={i} className="w-full h-full flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s} alt={detailItem.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
              )}

              {/* Back & Fav buttons */}
              <div className="absolute top-5 left-5 right-5 flex justify-between">
                <button
                  onClick={() => setDetailItem(null)}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={brand} stroke={brand} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
              </div>

              {/* Dots */}
              {slides.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIdx(i)}
                      className="rounded-full transition-all"
                      style={{ width: activeImageIdx === i ? 20 : 6, height: 6, backgroundColor: activeImageIdx === i ? brand : 'rgba(255,255,255,0.6)' }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4 space-y-5" style={{ scrollbarWidth: 'none' }}>
              {/* Title + Price */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="font-serif font-bold text-3xl text-gray-900 leading-tight">{detailItem.name}</h2>
                  {detailItem.portionSize && (
                    <p className="text-sm text-gray-400 mt-0.5">{detailItem.portionSize}</p>
                  )}
                </div>
                <div className="text-right pt-1">
                  <p className="font-bold text-3xl brand-text">₹{detailItem.price}</p>
                </div>
              </div>

              {/* Stats row: star · distance · time */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                  </svg>
                  <strong className="text-gray-700">4.9</strong>
                </span>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  {detailItem.prepTimeMin || 10}–{detailItem.prepTimeMax || 15} mins
                </span>
              </div>

              {/* Chef note */}
              {detailItem.chefNote && (
                <div className="rounded-2xl p-4 bg-amber-50 border border-amber-100">
                  <p className="text-sm italic text-amber-800">&ldquo;{detailItem.chefNote}&rdquo;</p>
                  <p className="text-[11px] font-bold text-amber-600 mt-1">— Chef&apos;s Note</p>
                </div>
              )}

              {/* Ingredients section */}
              <div>
                <h3 className="font-serif font-bold text-lg text-gray-900 mb-2">Ingredients:</h3>
                {detailItem.ingredients && detailItem.ingredients.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {detailItem.ingredients.map((ing, i) => (
                      <span
                        key={i}
                        className="text-xs px-3 py-1.5 rounded-full font-medium"
                        style={{
                          backgroundColor: isAllergen(ing) ? '#fee2e2' : '#f3f4f6',
                          color: isAllergen(ing) ? '#991b1b' : '#374151',
                        }}
                      >
                        {isAllergen(ing) ? '⚠ ' : ''}{ing}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 leading-relaxed">{detailItem.description}</p>
                )}
              </div>

              {/* Description (if ingredients also exist) */}
              {detailItem.ingredients && detailItem.ingredients.length > 0 && detailItem.description && (
                <p className="text-sm text-gray-500 leading-relaxed">{detailItem.description}</p>
              )}

              {/* Preparation */}
              {detailItem.preparation && (
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900 mb-2">Preparation:</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{detailItem.preparation}</p>
                </div>
              )}

              {/* Portion size pills */}
              {detailItem.portionSize && (
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900 mb-3">Select Portion Size</h3>
                  <div className="flex gap-3">
                    {['Standard', 'Large', 'Party Pack'].map((size, i) => (
                      <button
                        key={size}
                        className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
                        style={{
                          backgroundColor: i === 0 ? brand : '#f3f4f6',
                          color: i === 0 ? '#fff' : '#374151',
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nutrition card */}
              {(() => {
                const hasCustom = !!(detailItem.nutrition && (detailItem.nutrition.calories > 0));
                const nut = hasCustom && detailItem.nutrition ? detailItem.nutrition : estimateNutrition(detailItem.name, detailItem.category);
                return (
                  <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: '#f0f4ff' }}>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={brand} strokeWidth="2" strokeLinecap="round">
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">
                        Nutritional Value {!hasCustom && <span className="font-normal text-xs text-gray-400">(Approx.)</span>}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        High in protein · {nut.calories} kcal · {nut.protein}g protein · {nut.carbs}g carbs · {nut.fat}g fat
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Pairs well with */}
              {(() => {
                const pair = getPairedItem(detailItem);
                if (!pair) return null;
                const pairQty = getQty(pair.item._id);
                return (
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900 mb-3">Goes Well With</h3>
                    {pair.showSocialProof && (
                      <p className="text-[12px] font-semibold mb-2" style={{ color: brand }}>
                        👥 Guests who order this often add {pair.item.name}
                      </p>
                    )}
                    <div className="bg-gray-50 rounded-2xl p-3 flex items-center gap-3" style={{ border: '1px solid #e5e7eb' }}>
                      {pair.item.image && (
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={pair.item.image} alt={pair.item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-sm text-gray-900">{pair.item.name}</p>
                        <p className="font-bold text-sm brand-text">₹{pair.item.price}</p>
                      </div>
                      {pairQty === 0 ? (
                        <button onClick={() => handleAdd(pair.item, true, 'cross_sell', pair.item._id)} className="brand-bg text-white text-xs font-bold px-4 py-1.5 rounded-full">
                          + Add
                        </button>
                      ) : (
                        <div className="flex items-center rounded-full px-1.5 py-1 gap-1 qty-bg">
                          <button onClick={() => handleRemove(pair.item._id, pairQty)} className="w-6 h-6 flex items-center justify-center qty-icon">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>
                          </button>
                          <span className="font-bold text-xs w-5 text-center text-gray-900">{pairQty}</span>
                          <button onClick={() => handleAddMore(pair.item._id, pairQty)} className="w-6 h-6 flex items-center justify-center qty-icon">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="h-2" />
            </div>

<<<<<<< Updated upstream
            {/* Bottom Add to Cart Bar */}
            <div className="border-t border-surface p-4 bg-white flex items-center justify-between">
              <div>
                <span className="text-[0.6rem] text-text-dark/50 uppercase">Total</span>
                <span className="block font-black text-lg text-text-dark">₹{selectedDetailedItem.price}</span>
              </div>

              <div>
                {getItemQuantity(selectedDetailedItem._id) === 0 ? (
                  <button
                    onClick={() => handleAddOne(selectedDetailedItem)}
                    className="bg-cta text-text-dark font-bold text-sm px-6 py-3 rounded-xl uppercase tracking-wide active:scale-95 transition-transform"
                  >
                    Add to Cart
                  </button>
                ) : (
                  <div className="flex items-center gap-0 bg-primary rounded-xl overflow-hidden">
                    <button
                      onClick={() => handleRemoveOne(selectedDetailedItem._id, getItemQuantity(selectedDetailedItem._id))}
                      className="text-white px-3.5 py-3"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-white font-bold text-base px-3">{getItemQuantity(selectedDetailedItem._id)}</span>
                    <button
                      onClick={() => handleAddMore(selectedDetailedItem._id, getItemQuantity(selectedDetailedItem._id))}
                      className="text-white px-3.5 py-3"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
=======
            {/* Fixed Bottom: Qty + Add to Cart */}
            <div
              className="px-5 py-4 bg-white flex items-center gap-4"
              style={{ borderTop: '1px solid #f3f4f6', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              {/* Qty stepper */}
              <div className="flex items-center rounded-full border border-gray-200 px-2 py-2 gap-2">
                <button
                  onClick={() => { const q = getQty(detailItem._id); if (q > 0) handleRemove(detailItem._id, q); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full qty-bg qty-icon"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>
                </button>
                <span className="font-bold text-lg text-gray-900 w-8 text-center">{getQty(detailItem._id)}</span>
                <button
                  onClick={() => {
                    const q = getQty(detailItem._id);
                    if (q === 0) handleAdd(detailItem);
                    else handleAddMore(detailItem._id, q);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full qty-bg qty-icon"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                </button>
>>>>>>> Stashed changes
              </div>

              {/* Add to Cart CTA */}
              <button
                onClick={() => {
                  if (getQty(detailItem._id) === 0) handleAdd(detailItem);
                  else setDetailItem(null);
                }}
                className="flex-1 brand-bg text-white rounded-full py-4 font-bold text-[15px] flex items-center justify-between px-6 transition-all active:scale-[0.98] shadow-lg"
                style={{ boxShadow: `0 6px 20px ${brand}44` }}
              >
                <span>Add to cart</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
