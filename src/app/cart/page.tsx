'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { updateQuantity, removeItem, clearCart, addItem } from '@/redux/cartSlice';
import { createOrder } from '@/actions/orders';
import { getUpsellConfig } from '@/actions/upsell';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Fetch upsell configs on component load or restaurant ID changes
  useEffect(() => {
    if (cart.restaurantId) {
      getUpsellConfig(cart.restaurantId)
        .then((config) => {
          setMenuItems(config.menuItems || []);
          setPairingRules(config.pairingRules || []);
          setDiscountTiers(config.discountTiers || []);
          setComboRules(config.comboRules || []);
          setComputedAffinity(config.computedAffinity || {});
          setCompletedCount(config.completedCount || 0);
        })
        .catch((err) => {
          console.error('Error fetching upsell config:', err);
        });
    }
  }, [cart.restaurantId]);

  const { subtotal, items } = cart;

  // 1. Core Rules Evaluation Engine (Memoized)
  const evaluationResult = React.useMemo(() => {
    if (items.length === 0) {
      return {
        appliedCombos: [],
        comboDiscounts: 0,
        unlockedDiscountTier: null,
        tierDiscount: 0,
        totalDiscount: 0,
        discountedTotal: 0,
        potentialCombos: [],
        discountNudge: null,
      };
    }

    const appliedCombos: Array<{ name: string; amount: number }> = [];
    let comboDiscounts = 0;
    const potentialCombos: Nudge[] = [];

    // Track consumed quantities per item to avoid double-discounting
    const consumedQuantities: Record<string, number> = {};
    const getAvailableQty = (itemId: string, initialQty: number) => {
      return initialQty - (consumedQuantities[itemId] || 0);
    };

    // Evaluate Combo/Freebie Rules
    comboRules.forEach((rule) => {
      if (!rule.active) return;

      const condition = rule.conditionCategory;
      const excludeCat = rule.conditionExcludeCategory;
      const rewardType = rule.rewardType;
      const rewardTarget = rule.rewardTarget;

      let conditionMet = false;

      if (condition === 'momos_variety') {
        // At least 2 distinct momo items in cart
        const momoCategories = ['Classic Momos', 'Momos Gravy Add Ons', 'Momos Woksizzle'];
        const distinctMomoItems = items.filter(
          (i) => momoCategories.includes(i.category) && getAvailableQty(i.id, i.quantity) > 0
        );
        conditionMet = distinctMomoItems.length >= 2;
      } else if (condition.startsWith('subtotal:')) {
        const threshold = Number(condition.split(':')[1]) || 0;
        conditionMet = subtotal >= threshold;
      } else {
        // Comma-separated list of categories
        const categories = condition.split(',').map((c) => c.trim());
        const totalQty = items
          .filter((i) => categories.includes(i.category))
          .reduce((sum, i) => sum + getAvailableQty(i.id, i.quantity), 0);
        // If message has '2+', require 2; else require 1
        const requiredQty = rule.customerMessage.toLowerCase().includes('2+') ? 2 : 1;
        conditionMet = totalQty >= requiredQty;
      }

      if (conditionMet) {
        // Resolve drinks missing category fallback
        let resolvedExcludeCat = excludeCat;
        let resolvedRewardTargetCat = rewardTarget;
        
        const menuCategories = Array.from(new Set(menuItems.map((m) => m.category)));
        const drinksExist = menuCategories.some(
          (c) => c.toLowerCase().includes('drink') || c.toLowerCase().includes('beverage')
        );

        if (excludeCat && (excludeCat.toLowerCase().includes('drink') || excludeCat.toLowerCase().includes('beverage')) && !drinksExist) {
          resolvedExcludeCat = 'Tokyo Soups'; // Fallback exclude category
        }

        const isTargetDrinks = rewardTarget.toLowerCase().includes('drink') || rewardTarget.toLowerCase().includes('beverage');
        if (isTargetDrinks && !drinksExist) {
          resolvedRewardTargetCat = 'Tokyo Soups'; // Fallback reward target category
        }

        // Check if user has the target/exclusion in cart
        let hasRewardInCart = false;
        let targetItemsInCart: typeof items = [];

        if (resolvedExcludeCat) {
          targetItemsInCart = items.filter(
            (i) => i.category === resolvedExcludeCat && getAvailableQty(i.id, i.quantity) > 0
          );
          hasRewardInCart = targetItemsInCart.length > 0;
        } else if (rewardTarget === 'cheapest_momo') {
          const momoCategories = ['Classic Momos', 'Momos Gravy Add Ons', 'Momos Woksizzle'];
          targetItemsInCart = items.filter(
            (i) => momoCategories.includes(i.category) && getAvailableQty(i.id, i.quantity) > 0
          );
          hasRewardInCart = targetItemsInCart.length > 0;
        } else {
          const targetCat = resolvedRewardTargetCat.split(':')[0];
          targetItemsInCart = items.filter(
            (i) => i.category === targetCat && getAvailableQty(i.id, i.quantity) > 0
          );
          hasRewardInCart = targetItemsInCart.length > 0;
        }

        if (hasRewardInCart) {
          // Combo applied!
          let discount = 0;
          let discountedItemName = '';

          if (rewardTarget === 'cheapest_momo') {
            const sortedMomos = [...targetItemsInCart].sort((a, b) => a.price - b.price);
            const cheapest = sortedMomos[0];
            if (cheapest) {
              discount = cheapest.price;
              discountedItemName = cheapest.name;
              consumedQuantities[cheapest.id] = (consumedQuantities[cheapest.id] || 0) + 1;
            }
          } else if (rewardType === 'free_item') {
            const sortedItems = [...targetItemsInCart].sort((a, b) => a.price - b.price);
            const cheapest = sortedItems[0];
            if (cheapest) {
              discount = cheapest.price;
              discountedItemName = cheapest.name;
              consumedQuantities[cheapest.id] = (consumedQuantities[cheapest.id] || 0) + 1;
            }
          } else if (rewardType === 'percent_off_item') {
            const parts = resolvedRewardTargetCat.split(':');
            const percent = Number(parts[1]) || 0;
            const sortedItems = [...targetItemsInCart].sort((a, b) => a.price - b.price);
            const cheapest = sortedItems[0];
            if (cheapest) {
              discount = Math.round(cheapest.price * (percent / 100));
              discountedItemName = cheapest.name;
              consumedQuantities[cheapest.id] = (consumedQuantities[cheapest.id] || 0) + 1;
            }
          } else if (rewardType === 'percent_off_order') {
            const percent = Number(resolvedRewardTargetCat) || 0;
            discount = Math.round(subtotal * (percent / 100));
            discountedItemName = 'Order Subtotal';
          }

          if (discount > 0) {
            comboDiscounts += discount;
            appliedCombos.push({
              name: `${rule.customerMessage} (Saved ₹${discount} on ${discountedItemName})`,
              amount: discount,
            });
          }
        } else {
          // Condition met, but reward is missing. Show Nudge!
          let savingsValue = 0;
          let suggestedItemsForNudge: MenuItem[] = [];

          const targetCat = resolvedExcludeCat || resolvedRewardTargetCat.split(':')[0];
          suggestedItemsForNudge = menuItems.filter(
            (m) => m.category === targetCat && m.available && m.active !== false
          );

          if (rewardType === 'free_item') {
            const cheapestMenu = [...suggestedItemsForNudge].sort((a, b) => a.price - b.price)[0];
            savingsValue = cheapestMenu ? cheapestMenu.price : 99;
          } else if (rewardType === 'percent_off_item') {
            const parts = resolvedRewardTargetCat.split(':');
            const percent = Number(parts[1]) || 15;
            const cheapestMenu = [...suggestedItemsForNudge].sort((a, b) => a.price - b.price)[0];
            savingsValue = cheapestMenu ? Math.round(cheapestMenu.price * (percent / 100)) : 20;
          }

          potentialCombos.push({
            id: rule._id,
            type: 'combo',
            title: 'Combo Benefit Available!',
            message: rule.customerMessage,
            savings: savingsValue,
            suggestedItems: suggestedItemsForNudge.slice(0, 2),
          });
        }
      }
    });

    // Evaluate Discount Tiers
    let unlockedDiscountTier: DiscountTier | null = null;
    let tierDiscount = 0;

    const activeTiers = discountTiers.filter((t) => t.active !== false);
    const sortedTiers = [...activeTiers].sort((a, b) => a.minSpend - b.minSpend);

    sortedTiers.forEach((tier) => {
      let spend = subtotal;
      if (tier.categoryScope) {
        spend = items
          .filter((i) => i.category === tier.categoryScope)
          .reduce((sum, i) => sum + i.price * i.quantity, 0);
      }

      if (spend >= tier.minSpend) {
        unlockedDiscountTier = tier;
      }
    });

    if (unlockedDiscountTier) {
      const tier = unlockedDiscountTier as DiscountTier;
      let spend = subtotal;
      if (tier.categoryScope) {
        spend = items
          .filter((i) => i.category === tier.categoryScope)
          .reduce((sum, i) => sum + i.price * i.quantity, 0);
      }
      tierDiscount = Math.round(spend * (tier.percentOff / 100));
      appliedCombos.push({
        name: `${tier.percentOff}% off on ${tier.categoryScope || 'order'} (Unlocked at ₹${tier.minSpend} spend)`,
        amount: tierDiscount,
      });
    }

    // Next Locked Tier Nudge
    const nextLockedTier = sortedTiers.find((tier) => {
      let spend = subtotal;
      if (tier.categoryScope) {
        spend = items
          .filter((i) => i.category === tier.categoryScope)
          .reduce((sum, i) => sum + i.price * i.quantity, 0);
      }
      return spend < tier.minSpend;
    });

    let discountNudge: Nudge | null = null;
    if (nextLockedTier) {
      let spend = subtotal;
      if (nextLockedTier.categoryScope) {
        spend = items
          .filter((i) => i.category === nextLockedTier.categoryScope)
          .reduce((sum, i) => sum + i.price * i.quantity, 0);
      }
      const distance = nextLockedTier.minSpend - spend;
      const progress = Math.min(100, (spend / nextLockedTier.minSpend) * 100);
      const potentialSavings = Math.round(nextLockedTier.minSpend * (nextLockedTier.percentOff / 100));
      const incrementalSavings = potentialSavings - tierDiscount;

      discountNudge = {
        id: nextLockedTier._id,
        type: 'discount',
        title: 'Discount Level Up',
        message: `Add ₹${distance} more to unlock ${nextLockedTier.percentOff}% OFF your ${nextLockedTier.categoryScope || 'order'}!`,
        savings: incrementalSavings,
        progress,
        distance,
        percentOff: nextLockedTier.percentOff,
      };
    }

    const totalDiscount = comboDiscounts + tierDiscount;
    const discountedTotal = Math.max(0, subtotal - totalDiscount);

    return {
      appliedCombos,
      comboDiscounts,
      unlockedDiscountTier,
      tierDiscount,
      totalDiscount,
      discountedTotal,
      potentialCombos,
      discountNudge,
    };
  }, [items, subtotal, comboRules, discountTiers, menuItems]);

  // 2. Cross-sell / Affinity Suggestions (Memoized)
  const crossSellSuggestions = React.useMemo<Array<MenuItem & { socialProof?: string }>>(() => {
    if (menuItems.length === 0) return [];

    const notInCart = menuItems.filter(
      (m) => m.available && m.active !== false && !items.some((i) => i.id === m._id)
    );

    if (notInCart.length === 0) return [];

    // Enforce fit meals diet exclusions
    const hasFitMeals = items.some((i) => ['Fit Meals', 'Chicken Salad'].includes(i.category));
    
    const isExcludedByDiet = (item: MenuItem) => {
      if (!hasFitMeals) return false;
      const nameLower = item.name.toLowerCase();
      const catLower = item.category.toLowerCase();
      const richKeywords = ['butter', 'malai', 'cheese', 'cheesy', 'fried', 'crispy'];
      return richKeywords.some(kw => nameLower.includes(kw) || catLower.includes(kw));
    };

    const finalCandidates = notInCart.filter(item => !isExcludedByDiet(item));
    if (finalCandidates.length === 0) return [];

    const suggestions: Array<MenuItem & { socialProof?: string; priority: number; score?: number }> = [];

    // Data-driven affinity (unlocked if completedCount >= 50)
    if (completedCount >= 50) {
      items.forEach((cartItem) => {
        const affinityList = computedAffinity[cartItem.name];
        if (affinityList && Array.isArray(affinityList)) {
          affinityList.forEach((aff) => {
            const matched = finalCandidates.find((m) => m.name === aff.name);
            if (matched) {
              const confidencePct = Math.round(aff.confidence * 100);
              const existingIdx = suggestions.findIndex(s => s._id === matched._id);
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
            }
          });
        }
      });
    }

    // Sort data-driven matches by confidence score descending
    suggestions.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Manual fallback category tag mappings
    const manualSuggestions: Array<MenuItem & { priority: number }> = [];
    items.forEach((cartItem) => {
      // Menu item overrides
      const menuVer = menuItems.find(m => m._id === cartItem.id);
      if (menuVer && menuVer.pairsWithCategories) {
        menuVer.pairsWithCategories.forEach((cat) => {
          finalCandidates.forEach((candidate) => {
            if (candidate.category === cat && !suggestions.some(s => s._id === candidate._id) && !manualSuggestions.some(m => m._id === candidate._id)) {
              manualSuggestions.push({
                ...candidate,
                priority: 2
              });
            }
          });
        });
      }

      // Pairing Rules overrides
      pairingRules.forEach((rule) => {
        if (rule.active && rule.triggerCategory === cartItem.category) {
          rule.suggestCategories.forEach((cat) => {
            finalCandidates.forEach((candidate) => {
              if (candidate.category === cat && !suggestions.some(s => s._id === candidate._id) && !manualSuggestions.some(m => m._id === candidate._id)) {
                manualSuggestions.push({
                  ...candidate,
                  priority: 3
                });
              }
            });
          });
        }
      });
    });

    const combined = [...suggestions, ...manualSuggestions];

    // Popular default items if suggestions count < 3
    let index = 0;
    while (combined.length < 3 && index < finalCandidates.length) {
      const candidate = finalCandidates[index];
      if (!combined.some((s) => s._id === candidate._id)) {
        combined.push({
          ...candidate,
          priority: 4
        });
      }
      index++;
    }

    return combined.slice(0, 3);
  }, [menuItems, items, completedCount, computedAffinity, pairingRules]);

  // 3. Compile Nudges to Display (Cap at 2, ranked by savings value)
  const nudgesToShow = React.useMemo(() => {
    const list: Nudge[] = [];

    // Add discount level up progress nudge
    if (evaluationResult.discountNudge) {
      list.push(evaluationResult.discountNudge);
    }

    // Add potential combo nudges
    evaluationResult.potentialCombos.forEach((c) => list.push(c));

    // Add cross-sell nudge if list is below cap
    if (crossSellSuggestions.length > 0) {
      const topItem = crossSellSuggestions[0];
      list.push({
        id: 'cross_sell_' + topItem._id,
        type: 'cross_sell',
        title: 'Complete Your Meal',
        message: `Complete your meal with our delicious ${topItem.name}!`,
        savings: 0,
        suggestedItems: [topItem],
        socialProof: topItem.socialProof,
      });
    }

    // Deduplicate & Rank by highest potential savings, capping at 2
    return list.sort((a, b) => b.savings - a.savings).slice(0, 2);
  }, [evaluationResult, crossSellSuggestions]);

  const handleAddUpsell = (item: MenuItem) => {
    if (cart.restaurantId) {
      dispatch(
        addItem({
          item: {
            id: item._id,
            name: item.name,
            price: item.price,
            image: item.image,
            category: item.category,
          },
          restaurantId: cart.restaurantId,
        })
      );
    }
  };

  const handleQtyChange = (id: string, newQty: number) => {
    if (newQty <= 0) {
      dispatch(removeItem(id));
    } else {
      dispatch(updateQuantity({ id, quantity: newQty }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }

    if (!phone.trim() || !/^\d{10}$/.test(phone.trim())) {
      setFormError('Please enter a valid 10-digit phone number.');
      return;
    }

    if (cart.items.length === 0 || !cart.restaurantId) {
      setFormError('Your cart is empty.');
      return;
    }

    setLoading(true);

    try {
      const orderPayload = {
        restaurantId: cart.restaurantId,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        items: cart.items.map((item) => ({
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        subtotal: subtotal,
        total: evaluationResult.discountedTotal,
      };

      const createdOrder = await createOrder(orderPayload);
      
      dispatch(clearCart());
      setShowModal(false);
      router.push(`/track/${createdOrder._id}`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      setFormError(message);
      setLoading(false);
    }
  };

  const menuUrl = cart.restaurantId ? `/menu/${cart.restaurantId}` : '/menu/tokyo-momos';

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-mono-custom text-center">
        <div className="border border-black p-8 max-w-sm">
          <h1 className="text-xl font-bold uppercase mb-4">Your Cart is Empty</h1>
          <p className="text-xs text-zinc-600 mb-6">
            Add items from the menu to place an order.
          </p>
          <Link
            href={menuUrl}
            className="w-full inline-block border border-black px-4 py-2 text-xs font-bold uppercase bg-black text-white hover:bg-white hover:text-black transition-all"
          >
            [ GO TO MENU ]
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 font-mono-custom min-h-screen flex flex-col relative">
      <div className="flex justify-between items-baseline border-b border-black pb-4 mb-6">
        <h1 className="text-2xl font-bold uppercase">Your Cart</h1>
        <Link href={menuUrl} className="text-xs uppercase hover:underline">
          ← Keep Ordering
        </Link>
      </div>

      {/* Cart Items List */}
      <div className="border border-black bg-white mb-6 animate-fade-in">
        <div className="divide-y divide-black">
          {cart.items.map((item) => (
            <div key={item.id} className="p-4 flex justify-between items-start gap-4">
              <div className="flex-1">
                <span className="text-xs uppercase text-zinc-500 block">{item.category}</span>
                <span className="font-bold text-sm block uppercase">{item.name}</span>
                <span className="text-xs text-zinc-600">₹{item.price} each</span>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="font-bold text-sm">₹{item.price * item.quantity}</span>
                
                {/* Quantity Controls */}
                <div className="flex items-center border border-black text-xs">
                  <button
                    onClick={() => handleQtyChange(item.id, item.quantity - 1)}
                    className="px-2 py-0.5 border-r border-black hover:bg-zinc-100"
                  >
                    -
                  </button>
                  <span className="px-3 py-0.5">{item.quantity}</span>
                  <button
                    onClick={() => handleQtyChange(item.id, item.quantity + 1)}
                    className="px-2 py-0.5 border-l border-black hover:bg-zinc-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totals Breakdown Section */}
        <div className="border-t border-black p-4 bg-zinc-50 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs text-zinc-600">
            <span>SUBTOTAL</span>
            <span>₹{subtotal}</span>
          </div>

          {evaluationResult.appliedCombos.map((combo, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs text-green-700 font-bold uppercase">
              <span>✓ {combo.name}</span>
              <span>-₹{combo.amount}</span>
            </div>
          ))}

          <div className="flex justify-between items-center border-t border-dashed border-black/20 pt-2 mt-1">
            <span className="font-bold text-base uppercase">Total</span>
            <span className="font-bold text-lg">₹{evaluationResult.discountedTotal}</span>
          </div>
        </div>
      </div>

      {/* Colorful Appetite-Driven Nudges (Capped at 2, ranked by savings) */}
      {nudgesToShow.length > 0 && (
        <div className="flex flex-col gap-4 mb-6">
          {nudgesToShow.map((nudge) => {
            if (nudge.type === 'discount') {
              return (
                <div
                  key={nudge.id}
                  className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white border border-black p-5 rounded-lg shadow-sm flex flex-col gap-3 relative select-none"
                >
                  <div className="absolute top-3 right-3 bg-white text-black font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    {nudge.percentOff}% OFF GOAL
                  </div>
                  <div className="flex flex-col gap-1.5 pr-20">
                    <span className="font-bold text-[10px] tracking-wider uppercase opacity-90">⭐ DISCOUNT BOOSTER</span>
                    <h3 className="font-extrabold text-sm uppercase leading-tight">{nudge.message}</h3>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-black/30 h-3 border border-white/20 rounded-full overflow-hidden relative mt-1">
                    <div
                      className="bg-gradient-to-r from-yellow-300 to-yellow-400 h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${nudge.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase opacity-90">
                    <span>Progress: {Math.round(nudge.progress || 0)}%</span>
                    <span>Worth: Save ₹{nudge.savings}!</span>
                  </div>
                </div>
              );
            } else if (nudge.type === 'combo') {
              return (
                <div
                  key={nudge.id}
                  className="bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 text-white border border-black p-5 rounded-lg shadow-sm flex flex-col gap-3 relative select-none animate-fade-in"
                >
                  <div className="absolute top-3 right-3 bg-yellow-400 text-black font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm animate-pulse">
                    FREEBIE UNLOCK
                  </div>
                  <div className="flex flex-col gap-1 pr-24">
                    <span className="font-bold text-[10px] tracking-wider uppercase opacity-90">🎁 COMBO DEAL</span>
                    <h3 className="font-extrabold text-sm uppercase leading-tight">{nudge.message}</h3>
                    <span className="text-[10px] uppercase font-bold text-yellow-200">Value of Reward: ₹{nudge.savings}!</span>
                  </div>

                  {nudge.suggestedItems && nudge.suggestedItems.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      {nudge.suggestedItems.map((item) => (
                        <div
                          key={item._id}
                          className="border border-white/20 p-3 bg-black/20 flex flex-col justify-between gap-3 rounded hover:bg-black/30 transition-all"
                        >
                          <div className="flex gap-2.5 items-start">
                            {item.image && (
                              <div className="w-9 h-9 border border-white/30 flex-shrink-0 flex items-center justify-center bg-white select-none rounded">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover rounded-xs"
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-xs block uppercase truncate text-white">{item.name}</span>
                              <span className="text-[10px] text-white/80 block">₹{item.price}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddUpsell(item)}
                            className="w-full border border-white bg-white text-black py-1.5 text-[9px] font-bold uppercase hover:bg-black hover:text-white hover:border-black transition-all cursor-pointer text-center rounded"
                          >
                            [ + ADD COMBO ]
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            } else {
              // Cross-sell nudge fallback
              return (
                <div
                  key={nudge.id}
                  className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white border border-black p-5 rounded-lg shadow-sm flex flex-col gap-3 relative select-none animate-fade-in"
                >
                  <div className="absolute top-3 right-3 bg-black text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    RECOMMENDED
                  </div>
                  <div className="flex flex-col gap-1 pr-24">
                    <span className="font-bold text-[10px] tracking-wider uppercase opacity-90">🔥 POPULAR PAIRING</span>
                    <h3 className="font-extrabold text-sm uppercase leading-tight">Complete your meal</h3>
                    {nudge.socialProof && (
                      <span className="text-[10px] uppercase font-bold text-yellow-200 mt-0.5">
                        📈 {nudge.socialProof}
                      </span>
                    )}
                  </div>

                  {nudge.suggestedItems && nudge.suggestedItems.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      {nudge.suggestedItems.map((item) => (
                        <div
                          key={item._id}
                          className="border border-white/20 p-3 bg-black/20 flex flex-col justify-between gap-3 rounded hover:bg-black/30 transition-all"
                        >
                          <div className="flex gap-2.5 items-start">
                            {item.image && (
                              <div className="w-9 h-9 border border-white/30 flex-shrink-0 flex items-center justify-center bg-white select-none rounded">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover rounded-xs"
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-xs block uppercase truncate text-white">{item.name}</span>
                              <span className="text-[10px] text-white/80 block">₹{item.price}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddUpsell(item)}
                            className="w-full border border-white bg-white text-black py-1.5 text-[9px] font-bold uppercase hover:bg-black hover:text-white hover:border-black transition-all cursor-pointer text-center rounded"
                          >
                            [ + ADD ITEM ]
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
          })}
        </div>
      )}

      {/* Book Order Button */}
      <div className="mt-2">
        <button
          onClick={() => setShowModal(true)}
          className="border border-black w-full py-4 text-sm font-bold uppercase bg-black text-white hover:bg-white hover:text-black transition-all cursor-pointer text-center"
        >
          [ BOOK ORDER ]
        </button>
      </div>

      {/* Book Order Details Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="border border-black bg-white p-6 w-full max-w-sm flex flex-col gap-4 font-mono-custom shadow-2xl relative">
            <div className="flex justify-between items-baseline border-b border-black pb-2 mb-2">
              <h3 className="font-bold text-sm uppercase">Enter Booking Details</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-xs uppercase font-bold cursor-pointer hover:underline"
              >
                [ Close ]
              </button>
            </div>
            
            {formError && (
              <div className="border border-black p-3 text-xs bg-zinc-100 font-bold text-red-600 uppercase">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase">Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="w-full text-sm font-mono-custom"
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase">Phone Number</label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  className="w-full text-sm font-mono-custom"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="border-2 border-black w-full py-3 text-xs font-bold uppercase bg-black text-white hover:bg-white hover:text-black transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? 'BOOKING ORDER...' : '[ CONFIRM & PLACE ORDER ]'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
