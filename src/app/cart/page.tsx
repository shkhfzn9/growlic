'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { updateQuantity, removeItem, clearCart, addItem } from '@/redux/cartSlice';
import { createOrder, logEvent } from '@/actions/orders';
import { getUpsellConfig } from '@/actions/upsell';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
<<<<<<< Updated upstream
import { Minus, Plus, ArrowLeft, ShoppingBag, Loader2, X, Gift, TrendingUp, Sparkles } from 'lucide-react';

const DISH_PLACEHOLDER = '/dish_placeholder.jpg';

const getItemImage = (image?: string) => {
  if (!image || image.startsWith('data:image/svg+xml')) return DISH_PLACEHOLDER;
  return image;
};
=======
>>>>>>> Stashed changes

interface MenuItem {
  _id: string;
  restaurantId: string;
  category: string;
  name: string;
  description: string;
  image: string;
  price: number;
  available: boolean;
  pairsWithCategories?: string[];
  active?: boolean;
}

interface PairingRule {
  _id: string;
  triggerCategory: string;
  suggestCategories: string[];
  active: boolean;
}

interface DiscountTier {
  _id: string;
  minSpend: number;
  percentOff: number;
  categoryScope: string | null;
  active?: boolean;
}

interface ComboRule {
  _id: string;
  conditionCategory: string;
  conditionExcludeCategory: string | null;
  rewardType: 'free_item' | 'percent_off_item' | 'percent_off_order';
  rewardTarget: string;
  customerMessage: string;
  active: boolean;
}

interface Nudge {
  id: string;
  type: 'discount' | 'combo' | 'cross_sell';
  title: string;
  message: string;
  savings: number;
  progress?: number;
  distance?: number;
  percentOff?: number;
  suggestedItems?: MenuItem[];
  socialProof?: string;
}

const BRAND_FALLBACK = '#8b0021';

export default function CartPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const cart = useSelector((state: RootState) => state.cart);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [pairingRules, setPairingRules] = useState<PairingRule[]>([]);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([]);
  const [comboRules, setComboRules] = useState<ComboRule[]>([]);
  const [computedAffinity, setComputedAffinity] = useState<Record<string, Array<{ name: string; confidence: number }>>>({});
  const [completedCount, setCompletedCount] = useState(0);
  const [brand, setBrand] = useState(BRAND_FALLBACK);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [offersLoading, setOffersLoading] = useState(true);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    if (cart.restaurantId) {
      setOffersLoading(true);
      getUpsellConfig(cart.restaurantId)
        .then((config) => {
          setMenuItems(config.menuItems || []);
          setPairingRules(config.pairingRules || []);
          setDiscountTiers(config.discountTiers || []);
          setComboRules(config.comboRules || []);
          setComputedAffinity(config.computedAffinity || {});
          setCompletedCount(config.completedCount || 0);
          if (config.primaryColor) setBrand(config.primaryColor);
        })
        .catch((err) => console.error('Error fetching upsell config:', err))
        .finally(() => setOffersLoading(false));
    }
  }, [cart.restaurantId]);

  const { subtotal, items } = cart;

<<<<<<< Updated upstream
  // Core Rules Evaluation Engine
=======
  // ── Core Rules Evaluation Engine ──────────────────────────────────
>>>>>>> Stashed changes
  const evaluationResult = React.useMemo(() => {
    if (items.length === 0) {
      return { appliedCombos: [], comboDiscounts: 0, unlockedDiscountTier: null, tierDiscount: 0, totalDiscount: 0, discountedTotal: 0, potentialCombos: [], discountNudge: null };
    }

    const appliedCombos: Array<{ name: string; amount: number }> = [];
    let comboDiscounts = 0;
    const potentialCombos: Nudge[] = [];
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
    const consumedQuantities: Record<string, number> = {};
    const getAvailableQty = (itemId: string, initialQty: number) => initialQty - (consumedQuantities[itemId] || 0);

    comboRules.forEach((rule) => {
      if (!rule.active) return;
      const condition = rule.conditionCategory;
      const excludeCat = rule.conditionExcludeCategory;
      const rewardType = rule.rewardType;
      const rewardTarget = rule.rewardTarget;
      let conditionMet = false;

      if (condition === 'momos_variety') {
        const momoCategories = ['Classic Momos', 'Momos Gravy Add Ons', 'Momos Woksizzle'];
        const distinctMomoItems = items.filter((i) => momoCategories.includes(i.category) && getAvailableQty(i.id, i.quantity) > 0);
        conditionMet = distinctMomoItems.length >= 2;
      } else if (condition.startsWith('subtotal:')) {
        conditionMet = subtotal >= (Number(condition.split(':')[1]) || 0);
      } else {
        const categories = condition.split(',').map((c) => c.trim());
<<<<<<< Updated upstream
        const totalQty = items
          .filter((i) => categories.includes(i.category))
          .reduce((sum, i) => sum + getAvailableQty(i.id, i.quantity), 0);
=======
        const totalQty = items.filter((i) => categories.includes(i.category)).reduce((sum, i) => sum + getAvailableQty(i.id, i.quantity), 0);
>>>>>>> Stashed changes
        const requiredQty = rule.customerMessage.toLowerCase().includes('2+') ? 2 : 1;
        conditionMet = totalQty >= requiredQty;
      }

      if (conditionMet) {
        let resolvedExcludeCat = excludeCat;
        let resolvedRewardTargetCat = rewardTarget;
<<<<<<< Updated upstream

        const menuCategories = Array.from(new Set(menuItems.map((m) => m.category)));
        const drinksExist = menuCategories.some(
          (c) => c.toLowerCase().includes('drink') || c.toLowerCase().includes('beverage')
        );

        if (excludeCat && (excludeCat.toLowerCase().includes('drink') || excludeCat.toLowerCase().includes('beverage')) && !drinksExist) {
          resolvedExcludeCat = 'Tokyo Soups';
        }

        const isTargetDrinks = rewardTarget.toLowerCase().includes('drink') || rewardTarget.toLowerCase().includes('beverage');
        if (isTargetDrinks && !drinksExist) {
          resolvedRewardTargetCat = 'Tokyo Soups';
        }
=======
        const menuCategories = Array.from(new Set(menuItems.map((m) => m.category)));
        const drinksExist = menuCategories.some((c) => c.toLowerCase().includes('drink') || c.toLowerCase().includes('beverage'));
        if (excludeCat && (excludeCat.toLowerCase().includes('drink') || excludeCat.toLowerCase().includes('beverage')) && !drinksExist) resolvedExcludeCat = 'Tokyo Soups';
        const isTargetDrinks = rewardTarget.toLowerCase().includes('drink') || rewardTarget.toLowerCase().includes('beverage');
        if (isTargetDrinks && !drinksExist) resolvedRewardTargetCat = 'Tokyo Soups';
>>>>>>> Stashed changes

        let hasRewardInCart = false;
        let targetItemsInCart: typeof items = [];
        if (resolvedExcludeCat) {
          targetItemsInCart = items.filter((i) => i.category === resolvedExcludeCat && getAvailableQty(i.id, i.quantity) > 0);
          hasRewardInCart = targetItemsInCart.length > 0;
        } else if (rewardTarget === 'cheapest_momo') {
          const momoCategories = ['Classic Momos', 'Momos Gravy Add Ons', 'Momos Woksizzle'];
          targetItemsInCart = items.filter((i) => momoCategories.includes(i.category) && getAvailableQty(i.id, i.quantity) > 0);
          hasRewardInCart = targetItemsInCart.length > 0;
        } else {
          const targetCat = resolvedRewardTargetCat.split(':')[0];
          targetItemsInCart = items.filter((i) => i.category === targetCat && getAvailableQty(i.id, i.quantity) > 0);
          hasRewardInCart = targetItemsInCart.length > 0;
        }

        if (hasRewardInCart) {
          let discount = 0;
          let discountedItemName = '';
          if (rewardTarget === 'cheapest_momo') {
            const cheapest = [...targetItemsInCart].sort((a, b) => a.price - b.price)[0];
            if (cheapest) { discount = cheapest.price; discountedItemName = cheapest.name; consumedQuantities[cheapest.id] = (consumedQuantities[cheapest.id] || 0) + 1; }
          } else if (rewardType === 'free_item') {
            const cheapest = [...targetItemsInCart].sort((a, b) => a.price - b.price)[0];
            if (cheapest) { discount = cheapest.price; discountedItemName = cheapest.name; consumedQuantities[cheapest.id] = (consumedQuantities[cheapest.id] || 0) + 1; }
          } else if (rewardType === 'percent_off_item') {
            const parts = resolvedRewardTargetCat.split(':');
            const percent = Number(parts[1]) || 0;
            const cheapest = [...targetItemsInCart].sort((a, b) => a.price - b.price)[0];
            if (cheapest) { discount = Math.round(cheapest.price * (percent / 100)); discountedItemName = cheapest.name; consumedQuantities[cheapest.id] = (consumedQuantities[cheapest.id] || 0) + 1; }
          } else if (rewardType === 'percent_off_order') {
            const percent = Number(resolvedRewardTargetCat) || 0;
            discount = Math.round(subtotal * (percent / 100));
            discountedItemName = 'Order Subtotal';
          }
          if (discount > 0) {
            comboDiscounts += discount;
            appliedCombos.push({ name: `${rule.customerMessage} (Saved ₹${discount} on ${discountedItemName})`, amount: discount });
          }
        } else {
          let savingsValue = 0;
          const targetCat = resolvedExcludeCat || resolvedRewardTargetCat.split(':')[0];
          const suggestedItemsForNudge = menuItems.filter((m) => m.category === targetCat && m.available && m.active !== false);
          if (rewardType === 'free_item') {
            const cheapestMenu = [...suggestedItemsForNudge].sort((a, b) => a.price - b.price)[0];
            savingsValue = cheapestMenu ? cheapestMenu.price : 99;
          } else if (rewardType === 'percent_off_item') {
            const parts = resolvedRewardTargetCat.split(':');
            const percent = Number(parts[1]) || 15;
            const cheapestMenu = [...suggestedItemsForNudge].sort((a, b) => a.price - b.price)[0];
            savingsValue = cheapestMenu ? Math.round(cheapestMenu.price * (percent / 100)) : 20;
          }
          potentialCombos.push({ id: rule._id, type: 'combo', title: 'Combo Benefit Available!', message: rule.customerMessage, savings: savingsValue, suggestedItems: suggestedItemsForNudge.slice(0, 2) });
        }
      }
    });

<<<<<<< Updated upstream
=======
    // Discount tiers
>>>>>>> Stashed changes
    let unlockedDiscountTier: DiscountTier | null = null;
    let tierDiscount = 0;
    const activeTiers = discountTiers.filter((t) => t.active !== false);
    const sortedTiers = [...activeTiers].sort((a, b) => a.minSpend - b.minSpend);
    sortedTiers.forEach((tier) => {
      let spend = subtotal;
<<<<<<< Updated upstream
      if (tier.categoryScope) {
        spend = items
          .filter((i) => i.category === tier.categoryScope)
          .reduce((sum, i) => sum + i.price * i.quantity, 0);
      }
      if (spend >= tier.minSpend) {
        unlockedDiscountTier = tier;
      }
=======
      if (tier.categoryScope) spend = items.filter((i) => i.category === tier.categoryScope).reduce((sum, i) => sum + i.price * i.quantity, 0);
      if (spend >= tier.minSpend) unlockedDiscountTier = tier;
>>>>>>> Stashed changes
    });
    if (unlockedDiscountTier) {
      const tier = unlockedDiscountTier as DiscountTier;
      let spend = subtotal;
      if (tier.categoryScope) spend = items.filter((i) => i.category === tier.categoryScope).reduce((sum, i) => sum + i.price * i.quantity, 0);
      tierDiscount = Math.round(spend * (tier.percentOff / 100));
      appliedCombos.push({ name: `${tier.percentOff}% off on ${tier.categoryScope || 'order'} (Unlocked at ₹${tier.minSpend} spend)`, amount: tierDiscount });
    }

    const nextLockedTier = sortedTiers.find((tier) => {
      let spend = subtotal;
      if (tier.categoryScope) spend = items.filter((i) => i.category === tier.categoryScope).reduce((sum, i) => sum + i.price * i.quantity, 0);
      return spend < tier.minSpend;
    });
    let discountNudge: Nudge | null = null;
    if (nextLockedTier) {
      let spend = subtotal;
      if (nextLockedTier.categoryScope) spend = items.filter((i) => i.category === nextLockedTier.categoryScope).reduce((sum, i) => sum + i.price * i.quantity, 0);
      const distance = nextLockedTier.minSpend - spend;
      const progress = Math.min(100, (spend / nextLockedTier.minSpend) * 100);
      const potentialSavings = Math.round(nextLockedTier.minSpend * (nextLockedTier.percentOff / 100));
      discountNudge = { id: nextLockedTier._id, type: 'discount', title: 'Discount Level Up', message: `Add ₹${distance} more to unlock ${nextLockedTier.percentOff}% OFF!`, savings: potentialSavings - tierDiscount, progress, distance, percentOff: nextLockedTier.percentOff };
    }

    const totalDiscount = comboDiscounts + tierDiscount;
    return { appliedCombos, comboDiscounts, unlockedDiscountTier, tierDiscount, totalDiscount, discountedTotal: Math.max(0, subtotal - totalDiscount), potentialCombos, discountNudge };
  }, [items, subtotal, comboRules, discountTiers, menuItems]);

<<<<<<< Updated upstream
  // Cross-sell Suggestions
=======
  // ── Cross-sell suggestions ──────────────────────────────────────────
>>>>>>> Stashed changes
  const crossSellSuggestions = React.useMemo<Array<MenuItem & { socialProof?: string }>>(() => {
    if (menuItems.length === 0) return [];
    const notInCart = menuItems.filter((m) => m.available && m.active !== false && !items.some((i) => i.id === m._id));
    if (notInCart.length === 0) return [];
<<<<<<< Updated upstream

    const hasFitMeals = items.some((i) => ['Fit Meals', 'Chicken Salad'].includes(i.category));

=======
    const hasFitMeals = items.some((i) => ['Fit Meals', 'Chicken Salad'].includes(i.category));
>>>>>>> Stashed changes
    const isExcludedByDiet = (item: MenuItem) => {
      if (!hasFitMeals) return false;
      const kw = ['butter', 'malai', 'cheese', 'cheesy', 'fried', 'crispy'];
      return kw.some(k => item.name.toLowerCase().includes(k) || item.category.toLowerCase().includes(k));
    };
    const finalCandidates = notInCart.filter(item => !isExcludedByDiet(item));
    if (finalCandidates.length === 0) return [];
    const suggestions: Array<MenuItem & { socialProof?: string; priority: number; score?: number }> = [];

    if (completedCount >= 50) {
      items.forEach((cartItem) => {
        const affinityList = computedAffinity[cartItem.name];
        if (affinityList && Array.isArray(affinityList)) {
          affinityList.forEach((aff) => {
            const matched = finalCandidates.find((m) => m.name === aff.name);
            if (matched) {
              const existingIdx = suggestions.findIndex(s => s._id === matched._id);
<<<<<<< Updated upstream
              const socialProofText = `${confidencePct}% of customers who ordered ${cartItem.name} also added this`;

              if (existingIdx > -1) {
                if ((suggestions[existingIdx].score || 0) < aff.confidence) {
                  suggestions[existingIdx] = {
                    ...matched,
                    socialProof: socialProofText,
                    priority: 1,
                    score: aff.confidence
                  };
                }
              } else {
                suggestions.push({
                  ...matched,
                  socialProof: socialProofText,
                  priority: 1,
                  score: aff.confidence
                });
              }
=======
              const socialProofText = `${Math.round(aff.confidence * 100)}% of guests who ordered ${cartItem.name} also added this`;
              if (existingIdx > -1) { if ((suggestions[existingIdx].score || 0) < aff.confidence) suggestions[existingIdx] = { ...matched, socialProof: socialProofText, priority: 1, score: aff.confidence }; }
              else suggestions.push({ ...matched, socialProof: socialProofText, priority: 1, score: aff.confidence });
>>>>>>> Stashed changes
            }
          });
        }
      });
    }
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
    suggestions.sort((a, b) => (b.score || 0) - (a.score || 0));

    const manualSuggestions: Array<MenuItem & { priority: number }> = [];
    items.forEach((cartItem) => {
      const menuVer = menuItems.find(m => m._id === cartItem.id);
      if (menuVer?.pairsWithCategories) {
        menuVer.pairsWithCategories.forEach((cat) => {
          finalCandidates.forEach((candidate) => {
            if (candidate.category === cat && !suggestions.some(s => s._id === candidate._id) && !manualSuggestions.some(m => m._id === candidate._id)) {
              manualSuggestions.push({ ...candidate, priority: 2 });
            }
          });
        });
      }
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
      pairingRules.forEach((rule) => {
        if (rule.active && rule.triggerCategory === cartItem.category) {
          rule.suggestCategories.forEach((cat) => {
            finalCandidates.forEach((candidate) => {
              if (candidate.category === cat && !suggestions.some(s => s._id === candidate._id) && !manualSuggestions.some(m => m._id === candidate._id)) {
                manualSuggestions.push({ ...candidate, priority: 3 });
              }
            });
          });
        }
      });
    });

    const combined = [...suggestions, ...manualSuggestions];
<<<<<<< Updated upstream

    let index = 0;
    while (combined.length < 3 && index < finalCandidates.length) {
      const candidate = finalCandidates[index];
      if (!combined.some((s) => s._id === candidate._id)) {
        combined.push({ ...candidate, priority: 4 });
      }
=======
    let index = 0;
    while (combined.length < 3 && index < finalCandidates.length) {
      const candidate = finalCandidates[index];
      if (!combined.some((s) => s._id === candidate._id)) combined.push({ ...candidate, priority: 4 });
>>>>>>> Stashed changes
      index++;
    }
    return combined.slice(0, 8);
  }, [menuItems, items, completedCount, computedAffinity, pairingRules]);

<<<<<<< Updated upstream
  // Nudges to show
  const nudgesToShow = React.useMemo(() => {
    const list: Nudge[] = [];

    if (evaluationResult.discountNudge) {
      list.push(evaluationResult.discountNudge);
    }

    evaluationResult.potentialCombos.forEach((c) => list.push(c));

=======
  // ── Nudges (cap at 2) ─────────────────────────────────────────────
  const nudgesToShow = React.useMemo(() => {
    const list: Nudge[] = [];
    if (evaluationResult.discountNudge) list.push(evaluationResult.discountNudge);
    evaluationResult.potentialCombos.forEach((c) => list.push(c));
>>>>>>> Stashed changes
    if (crossSellSuggestions.length > 0) {
      const topItem = crossSellSuggestions[0];
      list.push({ id: 'cross_sell_' + topItem._id, type: 'cross_sell', title: 'Complete Your Meal', message: 'Complete your meal with our delicious selections!', savings: 0, suggestedItems: crossSellSuggestions, socialProof: topItem.socialProof });
    }
<<<<<<< Updated upstream

    return list.sort((a, b) => b.savings - a.savings).slice(0, 2);
  }, [evaluationResult, crossSellSuggestions]);

  // Log nudge views
=======
    return list.sort((a, b) => b.savings - a.savings).slice(0, 2);
  }, [evaluationResult, crossSellSuggestions]);

>>>>>>> Stashed changes
  useEffect(() => {
    const restaurantId = cart.restaurantId;
    if (nudgesToShow.length > 0 && restaurantId) {
      nudgesToShow.forEach((nudge) => {
        let apiType: 'cross_sell' | 'threshold_discount' | 'combo_freebie' = 'cross_sell';
        if (nudge.type === 'discount') apiType = 'threshold_discount';
        if (nudge.type === 'combo') apiType = 'combo_freebie';
        let ruleId = nudge.id || '';
        if (ruleId.startsWith('cross_sell_')) ruleId = ruleId.replace('cross_sell_', '');
        logEvent(restaurantId, 'nudge_show', ruleId, apiType).catch((err) => console.error('Error logging nudge show event:', err));
      });
    }
  }, [nudgesToShow, cart.restaurantId]);

  const handleAddUpsell = (item: MenuItem, nudgeType: 'cross_sell' | 'threshold_discount' | 'combo_freebie', nudgeRuleId?: string) => {
    if (cart.restaurantId) {
      dispatch(addItem({ item: { id: item._id, name: item.name, price: item.price, image: item.image, category: item.category, originatedFromNudge: true, nudgeType, nudgeRuleId }, restaurantId: cart.restaurantId, restaurantName: cart.restaurantName || '' }));
    }
  };

  const handleQtyChange = (id: string, newQty: number) => {
    if (newQty <= 0) dispatch(removeItem(id));
    else dispatch(updateQuantity({ id, quantity: newQty }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) { setFormError('Name is required.'); return; }
    if (!phone.trim() || !/^\d{10}$/.test(phone.trim())) { setFormError('Please enter a valid 10-digit phone number.'); return; }
    if (cart.items.length === 0 || !cart.restaurantId) { setFormError('Your cart is empty.'); return; }
    setLoading(true);
    try {
      const createdOrder = await createOrder({
        restaurantId: cart.restaurantId,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        tableId: cart.tableId || undefined,
        items: cart.items.map((item) => ({ menuItemId: item.id, name: item.name, price: item.price, quantity: item.quantity, image: item.image })),
        subtotal,
        total: evaluationResult.discountedTotal,
<<<<<<< Updated upstream
      };

      const createdOrder = await createOrder(orderPayload);

      dispatch(clearCart());
      setShowModal(false);
      router.push(`/track/${createdOrder._id}?restaurantId=${cart.restaurantId}`);
=======
      });
      setOrderSuccess(true);
      setTimeout(() => {
        dispatch(clearCart());
        setShowModal(false);
        router.push(`/track/${createdOrder._id}?restaurantId=${cart.restaurantId}`);
      }, 1200);
>>>>>>> Stashed changes
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      setFormError(message);
      setLoading(false);
    }
  };

  const menuUrl = cart.restaurantId ? `/menu/${cart.restaurantId}` : '/menu/tokyo-momos';

  // ── Empty cart ─────────────────────────────────────────────────────
  if (cart.items.length === 0) {
    return (
<<<<<<< Updated upstream
      <div className="min-h-screen bg-gradient-to-br from-bg-dark to-bg-darker flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <svg className="absolute bottom-0 left-0 w-full h-[40%]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,154.7C672,149,768,171,864,186.7C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L0,320Z" fill="#C0181A" fillOpacity="0.15" />
        </svg>
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-8 max-w-sm w-full text-center relative z-10">
          <div className="bg-surface rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-black text-xl text-text-dark uppercase tracking-tight mb-2">Your Cart is Empty</h1>
          <p className="text-sm text-text-dark/60 mb-6">
            Add items from the menu to place an order.
          </p>
          <Link
            href={menuUrl}
            className="block bg-cta text-text-dark font-bold text-sm py-3.5 rounded-xl uppercase tracking-wide text-center active:scale-[0.97] transition-transform"
          >
            Browse Menu
=======
      <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ backgroundColor: '#eef2fb' }}
    >
      <style>{`
          .brand-primary { color: ${brand}; }
          .brand-bg { background-color: ${brand}; }
        `}</style>
        <div className="gourmet-card p-10 max-w-sm w-full">
          <div className="text-5xl mb-4">🛍️</div>
          <h1 className="font-serif text-2xl font-bold mb-2" style={{ color: '#111827' }}>Your Bag is Empty</h1>
          <p className="text-sm mb-6" style={{ color: '#6b7280' }}>
            Add items from the menu to place an order.
          </p>
          <Link href={menuUrl}>
            <div
              className="brand-bg text-white rounded-full py-3 px-6 font-bold text-sm text-center transition-all active:scale-95"
              style={{ boxShadow: `0 4px 14px ${brand}44` }}
            >
              Browse Menu
            </div>
>>>>>>> Stashed changes
          </Link>
        </div>
      </div>
    );
  }

  return (
<<<<<<< Updated upstream
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-br from-bg-dark to-bg-darker px-4 pt-5 pb-6 relative overflow-hidden">
        <svg className="absolute bottom-0 left-0 w-full h-12" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,60L60,52C120,44,240,28,360,32C480,36,600,60,720,68C840,76,960,68,1080,56C1200,44,1320,28,1380,20L1440,12L1440,120L0,120Z" fill="#C0181A" fillOpacity="0.15" />
        </svg>
        <div className="max-w-2xl mx-auto relative z-10">
          <Link href={menuUrl} className="inline-flex items-center gap-1.5 text-white/80 text-sm mb-3 active:opacity-70">
            <ArrowLeft className="w-4 h-4" />
            <span>Keep Ordering</span>
          </Link>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Your Cart</h1>
          {cart.restaurantName && (
            <p className="text-white/60 text-xs mt-0.5">
              {cart.restaurantName} {cart.tableId ? `· Table ${cart.tableId}` : ''}
            </p>
          )}
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-5">
        {/* Cart Items */}
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          {cart.items.map((item, idx) => (
            <div key={item.id} className={`p-4 flex gap-3 ${idx > 0 ? 'border-t border-surface' : ''}`}>
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getItemImage(item.image)} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[0.6rem] text-text-dark/50 uppercase font-bold">{item.category}</span>
                <h3 className="font-bold text-sm text-text-dark leading-tight truncate">{item.name}</h3>
                <span className="text-xs text-text-dark/60">₹{item.price} each</span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="font-black text-sm text-text-dark">₹{item.price * item.quantity}</span>
                <div className="flex items-center bg-surface rounded-lg overflow-hidden">
                  <button
                    onClick={() => handleQtyChange(item.id, item.quantity - 1)}
                    className="px-2.5 py-1.5 text-primary active:bg-primary/10"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-sm font-bold text-text-dark min-w-[20px] text-center">{item.quantity}</span>
                  <button
                    onClick={() => handleQtyChange(item.id, item.quantity + 1)}
                    className="px-2.5 py-1.5 text-primary active:bg-primary/10"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
=======
    <div
      className="min-h-screen pb-32"
      style={{ backgroundColor: '#eef2fb' }}
    >
      <style>{`
        .brand-primary { color: ${brand}; }
        .brand-bg { background-color: ${brand}; }
        .brand-border { border-color: ${brand}; }
        .qty-pill { background-color: ${brand}1a; }
        .qty-btn-icon { color: ${brand}; }
        .add-btn { background-color: ${brand}; color: #ffffff; }
        .price-text { color: ${brand}; }
        .progress-fill { background: linear-gradient(to right, #f0c12c, #fccc38); }
      `}</style>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 px-5 py-4"
        style={{ backgroundColor: '#eef2fb', boxShadow: '0 1px 0 rgba(0,0,0,0.05)' }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href={menuUrl} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={brand} strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <div className="text-center">
            <h1 className="font-serif text-xl font-bold" style={{ color: '#111827' }}>Your Bag</h1>
            {cart.restaurantName && (
              <p className="text-[11px] text-gray-400">
                {cart.restaurantName}{cart.tableId ? ` · Table ${cart.tableId}` : ''}
              </p>
            )}
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* ── Cart Items ── */}
        <div className="gourmet-card overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="font-serif text-lg font-bold" style={{ color: '#111827' }}>
              Order Items
            </h2>
          </div>
          <div>
            {cart.items.map((item, idx) => (
              <div
                key={item.id}
                className="px-4 py-3 flex items-center gap-3"
                style={{ borderTop: idx > 0 ? '1px solid #f3f4f6' : 'none' }}
              >
                {item.image && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-tight text-gray-900">{item.name}</p>
                  <p className="text-[11px] mt-0.5 text-gray-400">{item.category} · ₹{item.price} each</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-bold text-sm price-text">₹{item.price * item.quantity}</p>
                  <div className="flex items-center rounded-full h-8 px-1.5 gap-1 qty-pill">
                    <button onClick={() => handleQtyChange(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded-full qty-btn-icon">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>
                    </button>
                    <span className="font-bold text-sm w-5 text-center text-gray-900">{item.quantity}</span>
                    <button onClick={() => handleQtyChange(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded-full qty-btn-icon">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                  </div>
>>>>>>> Stashed changes
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-4 py-4" style={{ borderTop: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
            <div className="flex justify-between text-sm mb-2 text-gray-500">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
<<<<<<< Updated upstream
          ))}

          {/* Totals */}
          <div className="border-t border-surface bg-surface/50 p-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm text-text-dark/60">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>

            {evaluationResult.appliedCombos.map((combo, idx) => (
              <div key={idx} className="flex justify-between text-xs text-green-700 font-bold">
                <span className="flex items-center gap-1">
                  <Gift className="w-3 h-3" /> {combo.name}
                </span>
                <span>-₹{combo.amount}</span>
              </div>
            ))}

            <div className="flex justify-between items-center border-t border-text-dark/10 pt-2 mt-1">
              <span className="font-black text-lg text-text-dark">Total</span>
              <span className="font-black text-xl text-text-dark">₹{evaluationResult.discountedTotal}</span>
            </div>
          </div>
        </div>

        {/* Nudges */}
        {offersLoading ? (
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-sm text-text-dark/60">Personalizing offers...</span>
          </div>
        ) : nudgesToShow.length > 0 ? (
          <div className="flex flex-col gap-3">
            {nudgesToShow.map((nudge) => {
              if (nudge.type === 'discount') {
                return (
                  <div key={nudge.id} className="bg-gradient-to-r from-primary to-bg-dark rounded-2xl p-4 text-white">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-cta" />
                        <span className="font-bold text-xs uppercase tracking-wide">Discount Booster</span>
                      </div>
                      <span className="bg-cta text-text-dark text-[0.6rem] font-bold px-2 py-0.5 rounded-full uppercase">
                        {nudge.percentOff}% Off
                      </span>
                    </div>
                    <p className="text-sm font-bold mb-3">{nudge.message}</p>
                    <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-cta h-full rounded-full transition-all duration-700"
                        style={{ width: `${nudge.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[0.65rem] mt-1.5 opacity-80">
                      <span>{Math.round(nudge.progress || 0)}% there</span>
=======
            {evaluationResult.appliedCombos.map((combo, idx) => (
              <div key={idx} className="flex justify-between text-xs font-bold mb-2" style={{ color: '#15803d' }}>
                <span className="flex items-center gap-1">
                  ✓ {combo.name}
                </span>
                <span>−₹{combo.amount}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2" style={{ borderTop: '1px dashed #e5e7eb' }}>
              <span className="font-serif font-bold text-lg text-gray-900">Total</span>
              <span className="font-bold text-xl price-text">₹{evaluationResult.discountedTotal}</span>
            </div>
          </div>
        </div>

        {/* ── Nudges ── */}
        {offersLoading ? (
          <div className="gourmet-card p-5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: 'var(--gourmet-surface-container)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded-full animate-pulse w-2/3" style={{ backgroundColor: 'var(--gourmet-surface-container)' }} />
              <div className="h-2 rounded-full animate-pulse w-1/2" style={{ backgroundColor: 'var(--gourmet-surface-container)' }} />
            </div>
          </div>
        ) : nudgesToShow.length > 0 ? (
          <div className="space-y-3">
            {nudgesToShow.map((nudge) => {
              if (nudge.type === 'discount') {
                return (
                  <div
                    key={nudge.id}
                    className="rounded-2xl p-5 flex flex-col gap-3"
                    style={{ background: 'linear-gradient(135deg, #b45309, #d97706, #b91c1c)', color: '#fff' }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider opacity-80">⭐ DISCOUNT BOOSTER</span>
                        <h3 className="font-bold text-sm mt-0.5">{nudge.message}</h3>
                      </div>
                      <span className="bg-white text-black text-[10px] font-black px-2 py-0.5 rounded-full">{nudge.percentOff}% OFF GOAL</span>
                    </div>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: `${nudge.progress}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] font-bold opacity-90">
                      <span>Progress: {Math.round(nudge.progress || 0)}%</span>
>>>>>>> Stashed changes
                      <span>Save ₹{nudge.savings}</span>
                    </div>
                  </div>
                );
<<<<<<< Updated upstream
              } else if (nudge.type === 'combo') {
                return (
                  <div key={nudge.id} className="bg-gradient-to-r from-primary to-bg-dark rounded-2xl p-4 text-white">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-cta" />
                        <span className="font-bold text-xs uppercase tracking-wide">Combo Deal</span>
                      </div>
                      <span className="bg-cta text-text-dark text-[0.6rem] font-bold px-2 py-0.5 rounded-full uppercase">
                        Freebie
                      </span>
                    </div>
                    <p className="text-sm font-bold mb-3">{nudge.message}</p>
                    {nudge.suggestedItems && nudge.suggestedItems.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {nudge.suggestedItems.map((item) => (
                          <div key={item._id} className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 flex-shrink-0 w-[140px] flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={getItemImage(item.image)} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[0.6rem] font-bold text-white block truncate">{item.name}</span>
                                <span className="text-[0.55rem] text-white/70">₹{item.price}</span>
=======
              }
              if (nudge.type === 'combo') {
                return (
                  <div
                    key={nudge.id}
                    className="rounded-2xl p-5 flex flex-col gap-3"
                    style={{ background: 'linear-gradient(135deg, #d97706, #b45309, #b91c1c)', color: '#fff' }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider opacity-80">🎁 COMBO DEAL</span>
                        <h3 className="font-bold text-sm mt-0.5">{nudge.message}</h3>
                        <span className="text-[11px] text-yellow-200 font-bold">Save ₹{nudge.savings}!</span>
                      </div>
                      <span className="bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">FREEBIE</span>
                    </div>
                    {nudge.suggestedItems && nudge.suggestedItems.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {nudge.suggestedItems.map((item) => (
                          <div key={item._id} className="bg-black/20 rounded-xl p-2.5 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              {item.image && (
                                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-white truncate">{item.name}</p>
                                <p className="text-[10px] text-white/80">₹{item.price}</p>
>>>>>>> Stashed changes
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddUpsell(item, 'combo_freebie', nudge.id)}
<<<<<<< Updated upstream
                              className="w-full bg-white text-primary text-[0.6rem] font-bold py-1.5 rounded-lg uppercase active:scale-95 transition-transform"
                            >
                              + Add
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  <div key={nudge.id} className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="font-bold text-xs text-text-dark uppercase tracking-wide">Complete Your Meal</span>
                    </div>
                    {nudge.socialProof && (
                      <p className="text-[0.65rem] text-text-dark/50 mb-2">{nudge.socialProof}</p>
                    )}
                    <div className="flex gap-2.5 overflow-x-auto pb-1">
                      {nudge.suggestedItems?.map((item) => (
                        <div key={item._id} className="bg-surface rounded-xl p-2.5 flex-shrink-0 w-[130px] flex flex-col gap-2">
                          <div className="w-full h-16 rounded-lg overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={getItemImage(item.image)} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[0.6rem] font-bold text-text-dark truncate">{item.name}</span>
                          <div className="flex items-center justify-between">
                            <span className="text-[0.6rem] font-bold text-primary">₹{item.price}</span>
                            <button
                              onClick={() => handleAddUpsell(item, 'cross_sell', nudge.id)}
                              className="bg-primary text-white text-[0.55rem] font-bold px-2 py-1 rounded-md uppercase active:scale-95 transition-transform"
=======
                              className="w-full bg-white text-black rounded-lg py-1 text-[10px] font-bold hover:bg-black hover:text-white transition-colors"
>>>>>>> Stashed changes
                            >
                              + Add
                            </button>
                          </div>
<<<<<<< Updated upstream
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
=======
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              // Cross-sell
              return (
                <div
                  key={nudge.id}
                  className="gourmet-card p-5 flex flex-col gap-3"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider" style={{ color: brand }}>🔥 POPULAR PAIRINGS</span>
                      <h3 className="font-serif font-bold text-base mt-0.5" style={{ color: 'var(--gourmet-on-surface)' }}>Complete Your Meal</h3>
                      {nudge.socialProof && <p className="text-[11px] mt-0.5" style={{ color: 'var(--gourmet-on-surface-variant)' }}>📈 {nudge.socialProof}</p>}
                    </div>
                  </div>
                  {nudge.suggestedItems && nudge.suggestedItems.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                      {nudge.suggestedItems.map((item) => (
                        <div
                          key={item._id}
                          className="flex-shrink-0 w-36 rounded-xl p-2.5 flex flex-col gap-2"
                          style={{ backgroundColor: 'var(--gourmet-surface-low)', border: '1px solid var(--gourmet-outline-variant)' }}
                        >
                          <div className="w-full aspect-square rounded-lg overflow-hidden">
                            {item.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--gourmet-surface-container)' }}>
                                <span className="material-symbols-outlined text-[32px]" style={{ color: 'var(--gourmet-outline)' }}>restaurant</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-xs line-clamp-2" style={{ color: 'var(--gourmet-on-surface)' }}>{item.name}</p>
                            <p className="font-serif text-sm font-bold mt-0.5 price-text">₹{item.price}</p>
                          </div>
                          <button
                            onClick={() => handleAddUpsell(item, 'cross_sell', nudge.id)}
                            className="w-full rounded-lg py-1.5 text-[11px] font-bold text-white transition-all active:scale-95 add-btn"
                          >
                            + Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
>>>>>>> Stashed changes
            })}
          </div>
        ) : null}

<<<<<<< Updated upstream
        {/* Place Order Button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-cta text-text-dark font-bold text-sm py-4 rounded-xl uppercase tracking-wide active:scale-[0.97] transition-transform shadow-[0_4px_15px_rgba(245,197,24,0.3)]"
        >
          Place Order
=======
        {/* ── Place Order Button ── */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full h-14 rounded-full font-bold text-[15px] text-white flex items-center justify-between px-6 transition-all active:scale-[0.98] brand-bg"
          style={{ boxShadow: `0 6px 20px ${brand}44` }}
        >
          <span>Go to Checkout</span>
          <span className="font-bold text-lg">₹{evaluationResult.discountedTotal}</span>
>>>>>>> Stashed changes
        </button>

        <div className="text-center pb-4">
          <Link href={menuUrl}>
            <button className="w-full py-4 rounded-full border-2 font-bold text-[15px] brand-primary transition-all active:scale-95" style={{ borderColor: brand }}>
              Continue Shopping
            </button>
          </Link>
        </div>
      </div>

<<<<<<< Updated upstream
      {/* Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl p-6 relative max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-black text-lg text-text-dark uppercase tracking-tight">Confirm Order</h3>
              <button onClick={() => setShowModal(false)} className="text-text-dark/40 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-primary/10 text-primary text-sm font-medium rounded-lg p-3 mb-4">
                {formError}
=======
      {/* ── Checkout Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
          onClick={() => { if (!loading) setShowModal(false); }}
        >
          <div
            className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-5 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success state */}
            {orderSuccess ? (
              <div className="flex flex-col items-center text-center py-4 gap-3 animate-scale-in">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
                  <span className="material-symbols-outlined text-[36px]" style={{ color: '#16a34a', fontVariationSettings: `'FILL' 1` }}>check_circle</span>
                </div>
                <h3 className="font-serif text-2xl font-bold" style={{ color: 'var(--gourmet-on-surface)' }}>Order Placed!</h3>
                <p className="text-sm" style={{ color: 'var(--gourmet-on-surface-variant)' }}>Redirecting you to your order status...</p>
>>>>>>> Stashed changes
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-xl font-bold" style={{ color: 'var(--gourmet-on-surface)' }}>Your Details</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full"
                    style={{ backgroundColor: 'var(--gourmet-surface-low)' }}
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--gourmet-on-surface-variant)' }}>close</span>
                  </button>
                </div>

                {formError && (
                  <div className="rounded-xl p-3 flex items-center gap-2 text-sm font-medium" style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: `'FILL' 1` }}>error</span>
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--gourmet-on-surface-variant)' }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      required
                      autoFocus
                      style={{ borderColor: 'var(--gourmet-outline-variant)' }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--gourmet-on-surface-variant)' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      disabled={loading}
                      required
                      style={{ borderColor: 'var(--gourmet-outline-variant)' }}
                    />
                  </div>

                  {/* Order summary in modal */}
                  <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--gourmet-surface-low)' }}>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--gourmet-on-surface-variant)' }}>{items.length} item{items.length > 1 ? 's' : ''}</span>
                      {evaluationResult.totalDiscount > 0 && (
                        <span className="font-bold" style={{ color: '#15803d' }}>−₹{evaluationResult.totalDiscount} saved</span>
                      )}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="font-serif font-bold" style={{ color: 'var(--gourmet-on-surface)' }}>Total to Pay</span>
                      <span className="font-serif font-bold text-lg price-text">₹{evaluationResult.discountedTotal}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] brand-bg disabled:opacity-60"
                    style={{ boxShadow: `0 4px 14px ${brand}44` }}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Placing Order...
                      </>
                    ) : 'Confirm & Place Order'}
                  </button>
                </form>
              </>
            )}
<<<<<<< Updated upstream

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.7rem] uppercase font-bold text-bg-dark tracking-[0.02em]">Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="bg-surface border-[1.5px] border-transparent rounded-[10px] px-4 py-3 text-sm text-text-dark outline-none transition-colors focus:border-primary placeholder:text-text-dark/40"
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.7rem] uppercase font-bold text-bg-dark tracking-[0.02em]">Phone Number</label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  className="bg-surface border-[1.5px] border-transparent rounded-[10px] px-4 py-3 text-sm text-text-dark outline-none transition-colors focus:border-primary placeholder:text-text-dark/40"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cta text-text-dark font-bold text-sm py-4 rounded-xl uppercase tracking-wide mt-2 active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Placing Order...' : 'Confirm & Place Order'}
              </button>
            </form>
=======
>>>>>>> Stashed changes
          </div>
        </div>
      )}
    </div>
  );
}
