'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { addItem, updateQuantity, removeItem, setTableId } from '@/redux/cartSlice';
import Link from 'next/link';
import { logEvent } from '@/actions/orders';
import { Search, ShoppingBag, Minus, Plus, X, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { CustomerNavbar } from '@/components/layout';
import { getActiveBanners } from '@/actions/banners';

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

  const [banners, setBanners] = useState<any[]>([]);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  const defaultBanners = [
    {
      _id: 'default-specials',
      title: "Free delivery for\ntoday's specials",
      subtitle: "Up to 3 times per day",
      buttonText: "Order now",
      buttonLink: `/menu/${restaurantId}`,
      image: '/dish_placeholder.jpg'
    },
    {
      _id: 'default-discount',
      title: "Get 10% OFF on\norders above ₹399!",
      subtitle: "Discount applied automatically at checkout",
      buttonText: "Browse Menu",
      buttonLink: `/menu/${restaurantId}`,
      image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+NuDwvdGV4dD48L3N2Zz4='
    },
    {
      _id: 'default-combo',
      title: "Add a Drink at 50% OFF\nwith any Momos!",
      subtitle: "Combo discount active today",
      buttonText: "Order Momos",
      buttonLink: `/menu/${restaurantId}?category=Classic Momos`,
      image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+lnzwvdGV4dD48L3N2Zz4='
    }
  ];

  const displayBanners = banners.length > 0 ? banners : defaultBanners;

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const activeBanners = await getActiveBanners(restaurantId);
        setBanners(activeBanners);
      } catch (err) {
        console.error('Failed to load advertisements:', err);
      }
    };
    fetchBanners();
  }, [restaurantId]);

  useEffect(() => {
    if (activeBannerIdx >= displayBanners.length) {
      setActiveBannerIdx(0);
    }
  }, [displayBanners.length, activeBannerIdx]);

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % displayBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [displayBanners.length]);

  const openDetailedModal = (item: MenuItem) => {
    setSelectedDetailedItem(item);
    setActiveImageIndex(0);
    logEvent(restaurantId, 'modal_open', item._id).catch((e) => console.error('Error logging modal view:', e));
  };

  const getPairedItem = (item: MenuItem) => {
    if (!upsellData) return null;
    const { computedAffinity, pairingRules, menuItems } = upsellData;

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
    ? [getItemImage(selectedDetailedItem.image), ...(selectedDetailedItem.images || []).map(img => getItemImage(img))].filter(Boolean)
    : [];

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32">
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

      {/* Promo Banner Carousel */}
      <div className="w-full px-4 py-4 bg-white relative group select-none">
        <div className="max-w-2xl mx-auto relative overflow-hidden rounded-2xl h-[140px] shadow-[0_6px_24px_rgba(139,0,0,0.25)]">
          {/* Carousel Slides Container */}
          <div 
            className="flex h-full transition-transform duration-500 ease-out"
            style={{ 
              transform: `translate3d(-${activeBannerIdx * (100 / (displayBanners.length || 1))}%, 0, 0)`, 
              width: `${(displayBanners.length || 1) * 100}%` 
            }}
          >
            {displayBanners.map((banner, idx) => (
              <div 
                key={banner._id || idx} 
                className="h-full flex items-stretch relative flex-shrink-0" 
                style={{ width: `${100 / (displayBanners.length || 1)}%` }}
              >
                {/* Slide Content */}
                <div className="bg-gradient-to-r from-bg-dark via-bg-dark to-primary w-full flex items-stretch">
                  <div className="w-[60%] p-5 flex flex-col justify-center relative z-10">
                    <h2 className="font-black text-lg sm:text-xl text-white leading-tight tracking-tight whitespace-pre-line">
                      {banner.title}
                    </h2>
                    {banner.subtitle && (
                      <p className="text-[0.7rem] text-white/70 mt-1.5 font-medium line-clamp-1">{banner.subtitle}</p>
                    )}
                    {banner.buttonLink && (
                      <Link 
                        href={banner.buttonLink}
                        className="mt-3 bg-cta text-text-dark text-[0.7rem] font-bold uppercase px-5 py-2.5 rounded-full w-fit active:scale-95 transition-transform shadow-[0_4px_12px_rgba(245,197,24,0.3)] text-center block"
                      >
                        {banner.buttonText || 'Order now'}
                      </Link>
                    )}
                  </div>
                  <div className="w-[40%] relative overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getItemImage(banner.image)}
                      alt={banner.title}
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
            ))}
          </div>

          {/* Slide Indicator Dots */}
          {displayBanners.length > 1 && (
            <div className="absolute bottom-3 left-5 flex gap-1.5 z-25">
              {displayBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveBannerIdx(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    activeBannerIdx === idx ? 'bg-cta w-3' : 'bg-white/40'
                  }`}
                  title={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
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
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-surface text-text-dark hover:bg-primary/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

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

      {/* Persistent Customer Navigation Bar */}
      <CustomerNavbar restaurantId={restaurantId} />

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
                      </div>

                      <div>
                        {pairedQty === 0 ? (
                          <button
                            onClick={() => handleAddOne(pairedItem, true, 'cross_sell', pairedItem._id)}
                            className="bg-primary text-white text-[0.65rem] font-bold px-3 py-1.5 rounded-lg uppercase active:scale-95 transition-transform"
                          >
                            + Add
                          </button>
                        ) : (
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
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
