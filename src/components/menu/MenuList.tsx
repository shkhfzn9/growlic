'use client';

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { addItem, updateQuantity, removeItem, setTableId } from '@/redux/cartSlice';
import Link from 'next/link';
import { logEvent } from '@/actions/orders';

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
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  spiceLevel?: number;
  portionSize?: string;
  prepTimeMin?: number;
  prepTimeMax?: number;
  chefNote?: string;
  active?: boolean;
  pairsWithCategories?: string[];
}


const COMMON_ALLERGENS = ['wheat', 'soy', 'dairy', 'egg', 'peanut'];
const isAllergen = (ingredient: string) => {
  const lower = ingredient.toLowerCase();
  for (const allergen of COMMON_ALLERGENS) {
    if (lower.includes(allergen)) return allergen;
  }
  for (const allergen of ['milk', 'cheese', 'gluten', 'nut', 'cashew', 'sesame']) {
    if (lower.includes(allergen)) return allergen;
  }
  return null;
};

const estimateNutrition = (name: string, category: string) => {
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
        <strong key={idx} className="text-red-600 font-bold">
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
    return { text: "CHEF'S SPECIAL", bg: 'bg-amber-100 text-amber-800 border-amber-300' };
  }
  if (lowerName.includes('schezwan') || lowerName.includes('chilli') || lowerName.includes('peri peri') || lowerName.includes('spicy')) {
    return { text: 'EXTRA SPICY', bg: 'bg-rose-100 text-rose-850 border-rose-350' };
  }
  if (lowerCat.includes('salad') || lowerCat.includes('fit') || lowerName.includes('protein') || lowerName.includes('breast')) {
    return { text: 'HEALTHY CHOICE', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  }
  if (lowerName.includes('steam') || lowerName.includes('classic') || lowerName.includes('noodle')) {
    if (price > 140) {
      return { text: "TODAY'S SPECIAL", bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
    } else {
      return { text: 'MOST POPULAR', bg: 'bg-sky-100 text-sky-850 border-sky-350' };
    }
  }
  if (price > 200) {
    return { text: 'PREMIUM CHOICE', bg: 'bg-purple-100 text-purple-800 border-purple-300' };
  }
  
  // Deterministic fallback based on name length
  const hash = name.length % 3;
  if (hash === 0) {
    return { text: "TODAY'S RECOMMENDATION", bg: 'bg-teal-100 text-teal-800 border-teal-300' };
  } else if (hash === 1) {
    return { text: 'BEST SELLER', bg: 'bg-pink-100 text-pink-800 border-pink-300' };
  } else {
    return { text: 'HOUSE SPECIAL', bg: 'bg-orange-100 text-orange-800 border-orange-300' };
  }
};


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
  primaryColor,
  welcomeMessage,
  upsellData,
}: MenuListProps) {
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart);

  React.useEffect(() => {
    dispatch(setTableId(table || null));
  }, [table, dispatch]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDetailedItem, setSelectedDetailedItem] = useState<MenuItem | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const openDetailedModal = (item: MenuItem) => {
    setSelectedDetailedItem(item);
    setActiveImageIndex(0);
    logEvent(restaurantId, 'modal_open', item._id).catch((e) => console.error('Error logging modal view:', e));
  };

  const getPairedItem = (item: MenuItem) => {
    if (!upsellData) return null;
    const { computedAffinity, pairingRules, menuItems } = upsellData;

    // Filter candidate items: must be available, active, and not the current item
    const notThisItem = menuItems.filter(
      (m) => m.available && m.active !== false && m._id !== item._id
    );

    // Apply Fit Meals Diet Exclusions if the item itself is a fit meal / salad
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

    // 1. Data-driven affinity (confidence score descending)
    const affinityList = computedAffinity ? computedAffinity[item.name] : null;
    if (affinityList && Array.isArray(affinityList) && affinityList.length > 0) {
      for (const aff of affinityList) {
        const matched = candidates.find((c) => c.name === aff.name);
        if (matched) {
          return {
            item: matched,
            showSocialProof: true,
          };
        }
      }
    }

    // 2. Manual pairsWithCategories on item level
    if (item.pairsWithCategories && item.pairsWithCategories.length > 0) {
      for (const cat of item.pairsWithCategories) {
        const matched = candidates.find((c) => c.category === cat);
        if (matched) {
          return {
            item: matched,
            showSocialProof: false,
          };
        }
      }
    }

    // 3. PairingRules based on category
    if (pairingRules && pairingRules.length > 0) {
      const activeRules = pairingRules.filter((r) => r.active && r.triggerCategory === item.category);
      for (const rule of activeRules) {
        for (const cat of rule.suggestCategories) {
          const matched = candidates.find((c) => c.category === cat);
          if (matched) {
            return {
              item: matched,
              showSocialProof: false,
            };
          }
        }
      }
    }

    return null;
  };



  // Extract unique categories
  const categories = Array.from(new Set(initialItems.map((item) => item.category)));

  // Filter items based on category and search query
  const filteredItems = initialItems.filter((item) => {
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.available;
  });

  // Helper to get item quantity in cart
  const getItemQuantity = (itemId: string) => {
    const item = cart.items.find((i) => i.id === itemId);
    return item ? item.quantity : 0;
  };

  const handleAddOne = (item: MenuItem, originatedFromNudge = false, nudgeType?: 'cross_sell' | 'threshold_discount' | 'combo_freebie', nudgeRuleId?: string) => {
    if (cart.items.length === 0) {
      logEvent(restaurantId, 'cart_create').catch((e) => console.error('Error logging cart create:', e));
    }
    dispatch(
      addItem({
        item: {
          id: item._id,
          name: item.name,
          price: item.price,
          image: item.image,
          category: item.category,
          originatedFromNudge,
          nudgeType,
          nudgeRuleId,
        },
        restaurantId,
        restaurantName,
      })
    );
  };

  const handleRemoveOne = (itemId: string, currentQty: number) => {
    if (currentQty <= 1) {
      dispatch(removeItem(itemId));
    } else {
      dispatch(updateQuantity({ id: itemId, quantity: currentQty - 1 }));
    }
  };

  const handleAddMore = (itemId: string, currentQty: number) => {
    dispatch(updateQuantity({ id: itemId, quantity: currentQty + 1 }));
  };

  const totalItemsCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const slides = selectedDetailedItem 
    ? [selectedDetailedItem.image, ...(selectedDetailedItem.images || [])].filter(Boolean)
    : [];

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Brand custom styles */}
      <style>{`
        .brand-bg-primary { background-color: ${primaryColor || '#000000'} !important; }
        .brand-border-primary { border-color: ${primaryColor || '#000000'} !important; }
        .brand-text-primary { color: ${primaryColor || '#000000'} !important; }
        
        .brand-btn-primary {
          border-color: ${primaryColor || '#000000'} !important;
          color: ${primaryColor || '#000000'} !important;
          background-color: transparent !important;
        }
        .brand-btn-primary:hover {
          background-color: ${primaryColor || '#000000'} !important;
          color: #ffffff !important;
        }
        
        .brand-btn-solid {
          background-color: ${primaryColor || '#000000'} !important;
          color: #ffffff !important;
          border-color: ${primaryColor || '#000000'} !important;
        }
        .brand-btn-solid:hover {
          background-color: transparent !important;
          color: ${primaryColor || '#000000'} !important;
        }
        .hover\\:text-brand-primary:hover {
          color: ${primaryColor || '#000000'} !important;
        }
        .divide-brand-primary > :not([hidden]) ~ :not([hidden]) {
          border-color: ${primaryColor || '#000000'} !important;
        }
      `}</style>

      {/* Header */}
      <header className="border-b-2 py-6 px-4 bg-white sticky top-0 z-10 brand-border-primary">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={restaurantName}
                className="w-14 h-14 object-cover border-2 brand-border-primary shrink-0"
                style={{ borderRadius: '0px' }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline flex-wrap gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase font-mono-custom break-words max-w-[75%]">
                  {restaurantName}
                </h1>
                <span className="text-xs uppercase border px-2 py-0.5 font-mono-custom shrink-0 brand-border-primary brand-text-primary font-bold">
                  {table ? `Table ${table}` : 'QR Menu'}
                </span>
              </div>
              {welcomeMessage && (
                <p className="text-[11px] text-zinc-500 font-sans italic mt-1 leading-tight">
                  {welcomeMessage}
                </p>
              )}
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm font-mono-custom border brand-border-primary focus:ring-0 focus:outline-none"
          />

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none font-mono-custom">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 text-xs border cursor-pointer transition-colors ${
                selectedCategory === null
                  ? 'brand-btn-solid font-bold'
                  : 'brand-btn-primary'
              }`}
            >
              ALL
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs border uppercase cursor-pointer transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'brand-btn-solid font-bold'
                    : 'brand-btn-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu List */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="border border-dashed p-8 text-center font-mono-custom text-sm brand-border-primary">
            NO ITEMS FOUND MATCHING YOUR SEARCH.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredItems.map((item) => {
              const qty = getItemQuantity(item._id);
              return (
                <div
                  key={item._id}
                  className="border p-4 flex gap-4 bg-white transition-colors duration-100 brand-border-primary"
                >
                  {/* Image/Emoji */}
                  {item.image && (
                    <div 
                      onClick={() => openDetailedModal(item)}
                      className="w-20 h-20 border flex-shrink-0 flex items-center justify-center bg-zinc-50 select-none cursor-pointer hover:opacity-80 transition-opacity brand-border-primary"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-none"
                      />
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {(() => {
                        const tag = getItemTag(item.name, item.category, item.price);
                        if (!tag) return null;
                        return (
                          <span className={`text-[8px] font-bold tracking-wider px-1.5 py-0.5 border rounded-none inline-block font-mono-custom mb-1.5 uppercase leading-none ${tag.bg}`}>
                            {tag.text}
                          </span>
                        );
                      })()}
                      <div className="flex justify-between items-start">
                        <h3 
                          onClick={() => openDetailedModal(item)}
                          className="font-bold text-base tracking-tight uppercase cursor-pointer hover:underline"
                        >
                          {item.name}
                        </h3>
                        <span className="font-mono-custom font-bold text-sm">
                          ₹{item.price}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 mt-1 font-sans line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end mt-3">
                      {qty === 0 ? (
                        <button
                          onClick={() => handleAddOne(item)}
                          className="px-4 py-1 text-xs border font-bold uppercase font-mono-custom transition-all brand-btn-primary"
                        >
                          [ ADD ]
                        </button>
                      ) : (
                        <div className="flex items-center border font-mono-custom text-xs brand-border-primary">
                          <button
                            onClick={() => handleRemoveOne(item._id, qty)}
                            className="px-3 py-1 font-bold border-r hover:bg-zinc-100 brand-border-primary"
                          >
                            -
                          </button>
                          <span className="px-4 py-1 font-bold brand-text-primary">{qty}</span>
                          <button
                            onClick={() => handleAddMore(item._id, qty)}
                            className="px-3 py-1 font-bold border-l hover:bg-zinc-100 brand-border-primary"
                          >
                            +
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
        <div className="fixed bottom-0 left-0 right-0 py-4 px-6 border-t-2 z-20 brand-bg-primary brand-border-primary text-white">
          <div className="max-w-2xl mx-auto flex justify-between items-center font-mono-custom">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-300">
                {totalItemsCount} ITEM{totalItemsCount > 1 ? 'S' : ''} IN CART
              </span>
              <span className="text-lg font-bold">Total: ₹{cart.total}</span>
            </div>
            <Link
              href="/cart"
              className="border border-white bg-white px-5 py-2 text-sm font-bold uppercase transition-all brand-text-primary hover:bg-transparent hover:text-white"
            >
              [ VIEW CART → ]
            </Link>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {selectedDetailedItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
          onClick={() => setSelectedDetailedItem(null)}
        >
          <div 
            className="bg-white border-2 max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden relative shadow-2xl animate-in fade-in zoom-in-95 duration-150 brand-border-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b-2 p-4 flex justify-between items-center text-white brand-bg-primary brand-border-primary">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-300 font-mono-custom">
                  {selectedDetailedItem.category}
                </span>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <h3 className="font-bold text-lg leading-tight uppercase font-mono-custom">
                    {selectedDetailedItem.name}
                  </h3>
                  {(() => {
                    const tag = getItemTag(selectedDetailedItem.name, selectedDetailedItem.category, selectedDetailedItem.price);
                    if (!tag) return null;
                    return (
                      <span className={`text-[8px] font-bold tracking-wider px-1.5 py-0.5 border rounded-none inline-block font-mono-custom uppercase leading-none ${tag.bg}`}>
                        {tag.text}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <button 
                onClick={() => setSelectedDetailedItem(null)}
                className="px-2 py-1 text-xs border border-white font-mono-custom hover:bg-white hover:text-brand-primary transition-all cursor-pointer font-bold"
              >
                [ CLOSE ]
              </button>
            </div>

            {/* Slider */}
            {slides.length > 0 && (
              <div className="relative w-full h-56 border-b bg-zinc-50 overflow-hidden group brand-border-primary">
                <div 
                  className="flex h-full transition-transform duration-300 ease-out"
                  style={{ transform: `translate3d(-${activeImageIndex * 100}%, 0, 0)` }}
                >
                  {slides.map((slide, idx) => (
                    <div key={idx} className="w-full h-full flex-shrink-0 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slide}
                        alt={`${selectedDetailedItem.name} slide ${idx + 1}`}
                        className="w-full h-full object-cover select-none"
                      />
                    </div>
                  ))}
                </div>

                {slides.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev - 1 + slides.length) % slides.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white border w-8 h-8 flex items-center justify-center text-sm font-bold font-mono-custom transition-colors cursor-pointer shadow-md z-10 brand-border-primary hover:brand-bg-primary hover:text-white"
                    >
                      &lt;
                    </button>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev + 1) % slides.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white border w-8 h-8 flex items-center justify-center text-sm font-bold font-mono-custom transition-colors cursor-pointer shadow-md z-10 brand-border-primary hover:brand-bg-primary hover:text-white"
                    >
                      &gt;
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10 bg-white border px-2 py-1 brand-border-primary">
                      {slides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`w-1.5 h-1.5 rounded-full border transition-all cursor-pointer brand-border-primary ${
                            activeImageIndex === idx ? 'brand-bg-primary scale-110' : 'bg-white hover:bg-black/50'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="absolute top-3 right-3 bg-white border px-2 py-0.5 text-[9px] font-bold font-mono-custom z-10 brand-border-primary">
                      {activeImageIndex + 1} / {slides.length}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Modal Body / Scrollable Content */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Portion, Price, Spice, Prep Info Box */}
              <div className="border p-3 bg-zinc-50 space-y-1.5 font-mono-custom brand-border-primary">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-sm text-black">₹{selectedDetailedItem.price}</span>
                  {selectedDetailedItem.spiceLevel !== undefined && selectedDetailedItem.spiceLevel > 0 && (
                    <span className="flex items-center text-[10px] uppercase font-bold text-zinc-500">
                      Spice:
                      <span className="ml-1 flex gap-0.5 text-xs text-red-600">
                        {Array.from({ length: selectedDetailedItem.spiceLevel }).map((_, i) => (
                          <span key={i}>🔥</span>
                        ))}
                      </span>
                    </span>
                  )}
                </div>
                <div className="h-px bg-zinc-200 w-full" />
                <div className="text-xs text-zinc-800 flex justify-between">
                  <span className="text-[9px] uppercase text-zinc-400 font-bold">Portion</span>
                  <span className="font-bold">{selectedDetailedItem.portionSize || 'Good for 1'}</span>
                </div>
                <div className="text-xs text-zinc-800 flex justify-between">
                  <span className="text-[9px] uppercase text-zinc-400 font-bold">Prep</span>
                  <span className="font-bold text-right text-zinc-700">
                    ~{selectedDetailedItem.prepTimeMin || 10}-{selectedDetailedItem.prepTimeMax || 12} min, made fresh to order
                  </span>
                </div>
              </div>

              {/* Chef's Note */}
              {selectedDetailedItem.chefNote && (
                <div className="border-l-2 pl-3 py-0.5 italic text-xs font-medium text-zinc-700 font-sans leading-relaxed brand-border-primary">
                  &ldquo;{selectedDetailedItem.chefNote}&rdquo; &mdash; Chef
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="text-[10px] font-bold uppercase text-zinc-400 font-mono-custom mb-1">Description</h4>
                <p className="text-xs text-zinc-800 font-sans leading-relaxed">{selectedDetailedItem.description}</p>
              </div>

              {/* Preparation */}
              {selectedDetailedItem.preparation && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-zinc-400 font-mono-custom mb-1">Preparation</h4>
                  <p className="text-xs text-zinc-800 font-sans leading-relaxed">{selectedDetailedItem.preparation}</p>
                </div>
              )}

              {/* Ingredients & Allergens */}
              {selectedDetailedItem.ingredients && selectedDetailedItem.ingredients.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-zinc-400 font-mono-custom mb-1.5">Ingredients &amp; Allergens</h4>
                  <ul className="text-xs font-sans space-y-1">
                     {selectedDetailedItem.ingredients.map((ing, idx) => {
                      const allergen = isAllergen(ing);
                      return (
                        <li key={idx} className="text-zinc-700 flex items-start gap-1.5">
                          <span className="text-zinc-400">•</span>
                          <span className="leading-tight">
                            {highlightAllergens(ing)}
                            {allergen && (
                              <span className="ml-1 text-[8px] uppercase border border-red-600 px-1 py-0.2 rounded font-mono-custom text-red-600 font-bold inline-block leading-none">
                                Contains {allergen}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Nutrition Facts */}
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
                  <div>
                    <h4 className="text-[10px] font-bold uppercase text-zinc-400 font-mono-custom mb-1.5">
                      Nutrition Facts {hasCustomNutrition ? '' : '(Approx)'}
                    </h4>
                    <div className="grid grid-cols-4 border text-center bg-zinc-50 font-mono-custom text-xs brand-border-primary divide-brand-primary">
                      <div className="p-2">
                        <div className="text-zinc-500 text-[9px] uppercase">Cal</div>
                        <div className="font-bold text-sm text-black">{displayNutrition.calories}</div>
                      </div>
                      <div className="p-2">
                        <div className="text-zinc-500 text-[9px] uppercase">Protein</div>
                        <div className="font-bold text-sm text-black">{displayNutrition.protein}g</div>
                      </div>
                      <div className="p-2">
                        <div className="text-zinc-500 text-[9px] uppercase">Carbs</div>
                        <div className="font-bold text-sm text-black">{displayNutrition.carbs}g</div>
                      </div>
                      <div className="p-2">
                        <div className="text-zinc-500 text-[9px] uppercase">Fat</div>
                        <div className="font-bold text-sm text-black">{displayNutrition.fat}g</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Goes Well With Recommendation */}
              {(() => {
                const pairedData = getPairedItem(selectedDetailedItem);
                if (!pairedData) return null;

                const pairedItem = pairedData.item;
                // Suppress social proof if Chef's Note is already active, to strictly obey 2-trigger cap (chefNote + goesWellWith)
                const showAnySocialProof = !selectedDetailedItem.chefNote;
                const pairedQty = getItemQuantity(pairedItem._id);

                return (
                  <div className="border-t border-dashed pt-4 mt-2 brand-border-primary">
                    <h4 className="text-[10px] font-bold uppercase text-zinc-400 font-mono-custom mb-2">
                      Goes Well With
                    </h4>
                    
                    {showAnySocialProof && (
                      <p className="text-[10px] text-zinc-500 font-mono-custom mb-2">
                        {pairedData.showSocialProof ? (
                          `👥 Most people order this with ${pairedItem.name}`
                        ) : (
                          `🔥 Popular choice recommended with this item`
                        )}
                      </p>
                    )}

                    <div className="border p-3 bg-zinc-50 flex gap-3 items-center brand-border-primary">
                      {pairedItem.image && (
                        <div className="w-12 h-12 border flex-shrink-0 flex items-center justify-center bg-white select-none brand-border-primary">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={pairedItem.image} alt={pairedItem.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-xs uppercase truncate">{pairedItem.name}</h5>
                        <span className="font-mono-custom text-[10px] font-bold text-zinc-650">₹{pairedItem.price}</span>
                      </div>

                      <div>
                        {pairedQty === 0 ? (
                          <button
                            onClick={() => handleAddOne(pairedItem, true, 'cross_sell', pairedItem._id)}
                            className="px-3 py-1.5 border text-[10px] font-bold uppercase transition-all cursor-pointer font-mono-custom brand-btn-primary"
                          >
                            + Add
                          </button>
                        ) : (
                          <div className="flex items-center border text-[10px] font-mono-custom bg-white brand-border-primary">
                            <button
                              onClick={() => handleRemoveOne(pairedItem._id, pairedQty)}
                              className="px-2 py-1 font-bold border-r hover:bg-zinc-100 brand-border-primary"
                            >
                              -
                            </button>
                            <span className="px-3 py-1 font-bold brand-text-primary">{pairedQty}</span>
                            <button
                              onClick={() => handleAddMore(pairedItem._id, pairedQty)}
                              className="px-2 py-1 font-bold border-l hover:bg-zinc-100 brand-border-primary"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Bottom Bar: Price & Add to Cart */}
            <div className="border-t-2 p-4 bg-white flex justify-between items-center font-mono-custom brand-border-primary">
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-400 uppercase">Total Price</span>
                <span className="font-bold text-lg brand-text-primary">₹{selectedDetailedItem.price}</span>
              </div>
              
              <div>
                {getItemQuantity(selectedDetailedItem._id) === 0 ? (
                  <button
                    onClick={() => handleAddOne(selectedDetailedItem)}
                    className="px-5 py-2 border font-bold uppercase transition-all text-xs cursor-pointer brand-btn-solid"
                  >
                    [ Add to Cart ]
                  </button>
                ) : (
                  <div className="flex items-center border text-xs brand-border-primary">
                    <button
                      onClick={() => handleRemoveOne(selectedDetailedItem._id, getItemQuantity(selectedDetailedItem._id))}
                      className="px-3.5 py-2 font-bold border-r hover:bg-zinc-100 cursor-pointer brand-border-primary"
                    >
                      -
                    </button>
                    <span className="px-5 py-2 font-bold brand-text-primary">{getItemQuantity(selectedDetailedItem._id)}</span>
                    <button
                      onClick={() => handleAddMore(selectedDetailedItem._id, getItemQuantity(selectedDetailedItem._id))}
                      className="px-3.5 py-2 font-bold border-l hover:bg-zinc-100 cursor-pointer brand-border-primary"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
