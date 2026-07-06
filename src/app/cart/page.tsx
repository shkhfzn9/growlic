'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { updateQuantity, removeItem, clearCart, addItem } from '@/redux/cartSlice';
import { createOrder, logEvent, getCustomerLoyaltyInfo } from '@/actions/orders';
import { getUpsellConfig } from '@/actions/upsell';
import { getRestaurantMenuContext } from '@/actions/menu';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Minus, Plus, ArrowLeft, ShoppingBag, Loader2, X, Gift, TrendingUp, Sparkles } from 'lucide-react';
import { CustomerNavbar } from '@/components/layout';

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

function CartContent() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cart = useSelector((state: RootState) => state.cart);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [pairingRules, setPairingRules] = useState<PairingRule[]>([]);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([]);
  const [comboRules, setComboRules] = useState<ComboRule[]>([]);
  const [computedAffinity, setComputedAffinity] = useState<Record<string, Array<{ name: string; confidence: number }>>>({});
  const [completedCount, setCompletedCount] = useState(0);

  const [restaurantName, setRestaurantName] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Welcome to our restaurant!');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [offersLoading, setOffersLoading] = useState(true);
  const [isCachedUser, setIsCachedUser] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [originalCachedPhone, setOriginalCachedPhone] = useState('');
  const [mounted, setMounted] = useState(false);
  const [notes, setNotes] = useState('');

  const searchRestId = searchParams.get('restaurantId');
  const resolvedRestId = React.useMemo(() => {
    return (
      searchRestId ||
      cart.restaurantId ||
      (typeof window !== 'undefined' ? localStorage.getItem('last_order_restaurant_id') : null) ||
      'tokyo-momos'
    );
  }, [searchRestId, cart.restaurantId]);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [loyaltyInfo, setLoyaltyInfo] = useState<{
    customer: {
      stampCount: number;
      hasPendingDiscount: boolean;
      totalRedemptions: number;
    } | null;
    loyaltyEnabled: boolean;
    stampsRequired: number;
    discountPercentage: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedName = localStorage.getItem('customer_name');
      const cachedPhone = localStorage.getItem('customer_phone');
      if (cachedName && cachedPhone) {
        setName(cachedName);
        setPhone(cachedPhone);
        setOriginalCachedPhone(cachedPhone);
        setIsCachedUser(true);
        if (resolvedRestId) {
          getCustomerLoyaltyInfo(cachedPhone, resolvedRestId)
            .then(setLoyaltyInfo)
            .catch((err) => console.error('Error fetching loyalty details inside cart:', err));
        }
      }
    }
  }, [resolvedRestId]);

  useEffect(() => {
    if (phone.length === 10 && resolvedRestId) {
      getCustomerLoyaltyInfo(phone, resolvedRestId)
        .then((info) => {
          setLoyaltyInfo(info);
          if (info.customer) {
            setName(info.customer.name);
          }
        })
        .catch((err) => console.error('Error loading loyalty details on input:', err));
    }
  }, [phone, resolvedRestId]);

  useEffect(() => {
    if (resolvedRestId) {
      setOffersLoading(true);
      getRestaurantMenuContext(resolvedRestId)
        .then((context) => {
          if (context.admin) {
            setRestaurantName(context.admin.restaurantName || '');
            setWelcomeMessage(context.admin.welcomeMessage || 'Welcome to our restaurant!');
          }
          const config = context.upsellConfig || {};
          setMenuItems(config.menuItems || []);
          setPairingRules(config.pairingRules || []);
          setDiscountTiers(config.discountTiers || []);
          setComboRules(config.comboRules || []);
          setComputedAffinity(config.computedAffinity || {});
          setCompletedCount(config.completedCount || 0);
        })
        .catch((err) => {
          console.error('Error fetching restaurant menu context:', err);
        })
        .finally(() => {
          setOffersLoading(false);
        });
    }
  }, [resolvedRestId]);

  const { subtotal, items } = cart;

  // Core Rules Evaluation Engine
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

    const consumedQuantities: Record<string, number> = {};
    const getAvailableQty = (itemId: string, initialQty: number) => {
      return initialQty - (consumedQuantities[itemId] || 0);
    };

    comboRules.forEach((rule) => {
      if (!rule.active) return;

      const condition = rule.conditionCategory;
      const excludeCat = rule.conditionExcludeCategory;
      const rewardType = rule.rewardType;
      const rewardTarget = rule.rewardTarget;

      let conditionMet = false;

      if (condition === 'momos_variety') {
        const momoCategories = ['Classic Momos', 'Momos Gravy Add Ons', 'Momos Woksizzle'];
        const distinctMomoItems = items.filter(
          (i) => momoCategories.includes(i.category) && getAvailableQty(i.id, i.quantity) > 0
        );
        conditionMet = distinctMomoItems.length >= 2;
      } else if (condition.startsWith('subtotal:')) {
        const threshold = Number(condition.split(':')[1]) || 0;
        conditionMet = subtotal >= threshold;
      } else {
        const categories = condition.split(',').map((c) => c.trim());
        const totalQty = items
          .filter((i) => categories.includes(i.category))
          .reduce((sum, i) => sum + getAvailableQty(i.id, i.quantity), 0);
        const requiredQty = rule.customerMessage.toLowerCase().includes('2+') ? 2 : 1;
        conditionMet = totalQty >= requiredQty;
      }

      if (conditionMet) {
        let resolvedExcludeCat = excludeCat;
        let resolvedRewardTargetCat = rewardTarget;

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

  // Cross-sell Suggestions
  const crossSellSuggestions = React.useMemo<Array<MenuItem & { socialProof?: string }>>(() => {
    if (menuItems.length === 0) return [];

    const notInCart = menuItems.filter(
      (m) => m.available && m.active !== false && !items.some((i) => i.id === m._id)
    );

    if (notInCart.length === 0) return [];

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

    suggestions.sort((a, b) => (b.score || 0) - (a.score || 0));

    const manualSuggestions: Array<MenuItem & { priority: number }> = [];
    items.forEach((cartItem) => {
      const menuVer = menuItems.find(m => m._id === cartItem.id);
      if (menuVer && menuVer.pairsWithCategories) {
        menuVer.pairsWithCategories.forEach((cat) => {
          finalCandidates.forEach((candidate) => {
            if (candidate.category === cat && !suggestions.some(s => s._id === candidate._id) && !manualSuggestions.some(m => m._id === candidate._id)) {
              manualSuggestions.push({ ...candidate, priority: 2 });
            }
          });
        });
      }

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

    let index = 0;
    while (combined.length < 3 && index < finalCandidates.length) {
      const candidate = finalCandidates[index];
      if (!combined.some((s) => s._id === candidate._id)) {
        combined.push({ ...candidate, priority: 4 });
      }
      index++;
    }

    return combined.slice(0, 8);
  }, [menuItems, items, completedCount, computedAffinity, pairingRules]);

  const bestAddOns = React.useMemo(() => {
    return menuItems.filter(
      (m) => m.available && m.active !== false && ['Additional Snacks', 'Chicken Salad'].includes(m.category) && !items.some((i) => i.id === m._id)
    ).slice(0, 3);
  }, [menuItems, items]);

  // Nudges to show
  const nudgesToShow = React.useMemo(() => {
    const list: Nudge[] = [];

    if (evaluationResult.discountNudge) {
      list.push(evaluationResult.discountNudge);
    }

    evaluationResult.potentialCombos.forEach((c) => list.push(c));

    if (crossSellSuggestions.length > 0) {
      const topItem = crossSellSuggestions[0];
      list.push({
        id: 'cross_sell_' + topItem._id,
        type: 'cross_sell',
        title: 'Complete Your Meal',
        message: `Complete your meal with our delicious selections!`,
        savings: 0,
        suggestedItems: crossSellSuggestions,
        socialProof: topItem.socialProof,
      });
    }

    return list.sort((a, b) => b.savings - a.savings).slice(0, 2);
  }, [evaluationResult, crossSellSuggestions]);

  // Log nudge views
  useEffect(() => {
    const restaurantId = cart.restaurantId;
    if (nudgesToShow.length > 0 && restaurantId) {
      nudgesToShow.forEach((nudge) => {
        let apiType: 'cross_sell' | 'threshold_discount' | 'combo_freebie' = 'cross_sell';
        if (nudge.type === 'discount') apiType = 'threshold_discount';
        if (nudge.type === 'combo') apiType = 'combo_freebie';

        let ruleId = nudge.id || '';
        if (ruleId.startsWith('cross_sell_')) {
          ruleId = ruleId.replace('cross_sell_', '');
        }

        logEvent(restaurantId, 'nudge_show', ruleId, apiType).catch((err) =>
          console.error('Error logging nudge show event:', err)
        );
      });
    }
  }, [nudgesToShow, cart.restaurantId]);

  const handleAddUpsell = (item: MenuItem, nudgeType: 'cross_sell' | 'threshold_discount' | 'combo_freebie', nudgeRuleId?: string) => {
    if (resolvedRestId) {
      dispatch(
        addItem({
          item: {
            id: item._id,
            name: item.name,
            price: item.price,
            image: item.image,
            category: item.category,
            originatedFromNudge: true,
            nudgeType,
            nudgeRuleId,
          },
          restaurantId: resolvedRestId,
          restaurantName: restaurantName || cart.restaurantName || '',
        })
      );
    }
  };

  const handleAddCombo = (rule: ComboRule) => {
    if (!resolvedRestId || menuItems.length === 0) return;

    // Find a condition item
    let conditionItem: MenuItem | undefined;
    if (rule.conditionCategory.startsWith('subtotal:')) {
      conditionItem = menuItems[0];
    } else if (rule.conditionCategory === 'momos_variety') {
      const momoItems = menuItems.filter(m => ['Classic Momos', 'Momos Gravy Add Ons', 'Momos Woksizzle'].includes(m.category) && m.available && m.active !== false);
      if (momoItems.length >= 2) {
        dispatch(addItem({ item: { id: momoItems[0]._id, name: momoItems[0].name, price: momoItems[0].price, image: momoItems[0].image, category: momoItems[0].category }, restaurantId: resolvedRestId, restaurantName: restaurantName || cart.restaurantName || 'Tokyo Momos' }));
        dispatch(addItem({ item: { id: momoItems[1]._id, name: momoItems[1].name, price: momoItems[1].price, image: momoItems[1].image, category: momoItems[1].category }, restaurantId: resolvedRestId, restaurantName: restaurantName || cart.restaurantName || 'Tokyo Momos' }));
        return;
      }
    } else {
      const cats = rule.conditionCategory.split(',').map(c => c.trim());
      conditionItem = menuItems.find(m => cats.includes(m.category) && m.available && m.active !== false);
    }

    // Find a reward item
    let rewardItem: MenuItem | undefined;
    if (rule.rewardTarget === 'cheapest_momo') {
      const momoItems = menuItems.filter(m => ['Classic Momos', 'Momos Gravy Add Ons', 'Momos Woksizzle'].includes(m.category) && m.available && m.active !== false);
      rewardItem = momoItems[0];
    } else {
      const targetCat = rule.rewardTarget.split(':')[0];
      rewardItem = menuItems.find(m => m.category === targetCat && m.available && m.active !== false);
    }

    if (conditionItem) {
      dispatch(addItem({
        item: {
          id: conditionItem._id,
          name: conditionItem.name,
          price: conditionItem.price,
          image: conditionItem.image,
          category: conditionItem.category,
        },
        restaurantId: resolvedRestId,
        restaurantName: restaurantName || cart.restaurantName || 'Tokyo Momos',
      }));
    }
    if (rewardItem) {
      dispatch(addItem({
        item: {
          id: rewardItem._id,
          name: rewardItem.name,
          price: rewardItem.price,
          image: rewardItem.image,
          category: rewardItem.category,
          originatedFromNudge: true,
          nudgeType: rule.rewardType === 'free_item' ? 'combo_freebie' : 'cross_sell',
          nudgeRuleId: rule._id,
        },
        restaurantId: resolvedRestId,
        restaurantName: restaurantName || cart.restaurantName || 'Tokyo Momos',
      }));
    }
  };

  const handleAddSpecialAddon = (item: MenuItem, offerPrice: number) => {
    if (!resolvedRestId) return;
    dispatch(addItem({
      item: {
        id: item._id,
        name: `${item.name} (Special Add-on)`,
        price: offerPrice,
        image: item.image,
        category: item.category,
        originatedFromNudge: true,
        nudgeType: 'cross_sell',
      },
      restaurantId: resolvedRestId,
      restaurantName: restaurantName || cart.restaurantName || 'Tokyo Momos',
    }));
  };

  const handleQtyChange = (id: string, newQty: number) => {
    if (newQty <= 0) {
      dispatch(removeItem(id));
    } else {
      dispatch(updateQuantity({ id, quantity: newQty }));
    }
  };

  const loyaltyDiscount = React.useMemo(() => {
    if (loyaltyInfo?.loyaltyEnabled && loyaltyInfo?.customer?.hasPendingDiscount && items.length > 0) {
      return Math.round(subtotal * (loyaltyInfo.discountPercentage / 100));
    }
    return 0;
  }, [loyaltyInfo, subtotal, items]);

  const finalDiscountedTotal = Math.max(0, evaluationResult.discountedTotal - loyaltyDiscount);

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
      const targetRestaurantId = cart.restaurantId || resolvedRestId || 'tokyo-momos';
      const orderPayload = {
        restaurantId: targetRestaurantId,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerOldPhone: originalCachedPhone ? originalCachedPhone.trim() : undefined,
        tableId: cart.tableId || undefined,
        items: cart.items.map((item) => ({
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        subtotal: subtotal,
        total: finalDiscountedTotal,
        notes: notes.trim() || undefined,
      };

      const createdOrder = await createOrder(orderPayload);

      if (typeof window !== 'undefined') {
        localStorage.setItem('last_order_id', createdOrder._id);
        localStorage.setItem('last_order_restaurant_id', targetRestaurantId);
        localStorage.setItem('customer_name', name.trim());
        localStorage.setItem('customer_phone', phone.trim());
        setOriginalCachedPhone(phone.trim());
        setIsCachedUser(true);
        setIsEditingDetails(false);
      }

      dispatch(clearCart());
      setShowModal(false);
      setNotes('');

      router.push(`/track/${createdOrder._id}?restaurantId=${targetRestaurantId}`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      setFormError(message);
      setLoading(false);
    }
  };

  const menuUrl = resolvedRestId ? `/menu/${resolvedRestId}` : '/menu/tokyo-momos';

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-dark to-bg-darker flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#8B0000] to-[#5A0000] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="bg-white rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl border border-gray-100 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
          <Loader2 className="w-10 h-10 text-[#C0181A] animate-spin" />
          <h2 className="font-extrabold text-lg text-gray-900 uppercase tracking-tight">Placing Order...</h2>
          <p className="text-xs text-gray-500">Preparing your live status tracker...</p>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col pb-28">
        {/* Header */}
        <header className="bg-gradient-to-br from-[#8B0000] to-[#5A0000] px-4 pt-6 pb-8 relative overflow-hidden rounded-b-[2rem] shadow-lg">
          <svg className="absolute bottom-0 left-0 w-full h-12" viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,60L60,52C120,44,240,28,360,32C480,36,600,60,720,68C840,76,960,68,1080,56C1200,44,1320,28,1380,20L1440,12L1440,120L0,120Z" fill="#C0181A" fillOpacity="0.15" />
          </svg>
          <div className="max-w-md mx-auto text-center relative z-10">
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">{restaurantName || cart.restaurantName || 'TOKYO MOMOS'}</h1>
            <p className="text-white/85 text-xs mt-1 font-semibold">{welcomeMessage || 'Welcome to our restaurant!'}</p>
          </div>
        </header>

        <div className="flex-1 max-w-md mx-auto w-full px-4 -mt-4 relative z-10 flex flex-col gap-6">
          {/* Your Cart is Empty Card */}
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-8 text-center border border-gray-100">
            <div className="bg-red-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5 shadow-inner">
              <ShoppingBag className="w-9 h-9 text-[#C0181A]" />
            </div>
            <h2 className="font-extrabold text-2xl text-gray-900 uppercase tracking-tight mb-2">Your Cart is Empty</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Add items from the menu to place an order.
            </p>
            <Link
              href={menuUrl}
              className="block bg-[#F5C518] text-[#1A1A1A] font-black text-sm py-4 rounded-2xl uppercase tracking-wider text-center active:scale-[0.98] transition-transform shadow-md hover:shadow-lg"
            >
              Browse Menu
            </Link>
          </div>

          {/* Offers Section */}
          <div className="flex flex-col gap-4">
            <div className="px-1">
              <div className="flex items-center gap-1.5 text-gray-900 font-black text-lg uppercase tracking-tight">
                <span className="text-xl">🔥</span> Offers For You
              </div>
              <p className="text-xs text-gray-500 font-semibold mt-0.5">Add items and unlock exciting offers</p>
            </div>

            {offersLoading ? (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 text-[#C0181A] animate-spin" />
                <span className="text-sm text-gray-500 font-medium animate-pulse">Loading exciting offers...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* 1. Render Discount Tiers */}
                {discountTiers.filter(t => t.active !== false).map((tier) => {
                  const sampleItem = menuItems.find(m => tier.categoryScope ? m.category === tier.categoryScope : m.category === 'Classic Momos');
                  const imageSrc = sampleItem ? getItemImage(sampleItem.image) : DISH_PLACEHOLDER;
                  return (
                    <div key={tier._id} className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <span className="bg-[#FFF8E7] text-[#D97706] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-[#F5C518]/30">
                          {tier.percentOff}% OFF
                        </span>
                        <h3 className="font-extrabold text-base text-gray-900 mt-2.5 leading-tight">
                          {tier.percentOff}% OFF on orders above ₹{tier.minSpend}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 font-semibold">
                          Add ₹{tier.minSpend} more to unlock
                        </p>
                        
                        {/* Progress Bar (0%) */}
                        <div className="w-full bg-gray-100 h-2 rounded-full mt-3.5 overflow-hidden">
                          <div className="bg-[#D97706] h-full rounded-full w-0" />
                        </div>
                        <div className="flex justify-between text-[10px] mt-1.5 font-bold text-gray-400">
                          <span>0% there</span>
                          <span className="text-green-600 font-extrabold">Save ₹{Math.round(tier.minSpend * tier.percentOff / 100)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-3 flex-shrink-0">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md bg-gray-50 border border-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageSrc} alt="Offer Item" className="w-full h-full object-cover" />
                        </div>
                        <Link
                          href={menuUrl}
                          className="bg-[#C0181A] hover:bg-[#A01012] text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-wider transition-all shadow active:scale-95 text-center"
                        >
                          + Add Items
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Render Combo Rules */}
                {comboRules.filter(r => r.active).map((rule) => {
                  const sampleItem = menuItems.find(m => rule.conditionCategory.includes(m.category));
                  const imageSrc = sampleItem ? getItemImage(sampleItem.image) : DISH_PLACEHOLDER;
                  return (
                    <div key={rule._id} className="bg-gradient-to-br from-[#8B0000] to-[#5A0000] rounded-3xl p-5 shadow-lg text-white flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <span className="bg-[#F5C518] text-[#1A1A1A] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Combo Offer
                        </span>
                        <h3 className="font-extrabold text-base mt-3 leading-snug">
                          {rule.customerMessage}
                        </h3>
                        <p className="text-xs text-white/70 mt-1 font-semibold">
                          {rule.rewardType === 'free_item' ? 'Get free item with this combo!' : 'Save big with this pairing!'}
                        </p>
                      </div>

                      <div className="flex flex-col items-center gap-3 flex-shrink-0">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md bg-white/10 border border-white/15">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageSrc} alt="Combo Item" className="w-full h-full object-cover" />
                        </div>
                        <button
                          onClick={() => handleAddCombo(rule)}
                          className="bg-[#F5C518] hover:bg-[#E0B310] text-[#1A1A1A] text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-wider transition-all shadow active:scale-95 text-center"
                        >
                          + Add Combo
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* 3. Render Special Add-ons */}
                {menuItems.filter(m => m.category === 'Additional Snacks' && m.available && m.active !== false).slice(0, 2).map((item) => {
                  const offerPrice = Math.round(item.price * 0.7); // 30% discount for special offer
                  return (
                    <div key={item._id} className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <span className="bg-red-50 text-[#C0181A] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-red-100">
                          Special Add-on
                        </span>
                        <h3 className="font-extrabold text-base text-gray-900 mt-2.5 leading-tight">
                          Add {item.name} for ₹{offerPrice} only
                        </h3>
                        <div className="flex items-center gap-2 mt-2 font-bold">
                          <span className="text-gray-400 line-through text-xs">₹{item.price}</span>
                          <span className="text-[#C0181A] text-sm">₹{offerPrice}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-3 flex-shrink-0">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md bg-gray-50 border border-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={getItemImage(item.image)} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <button
                          onClick={() => handleAddSpecialAddon(item, offerPrice)}
                          className="bg-[#C0181A] hover:bg-[#A01012] text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-wider transition-all shadow active:scale-95 text-center"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Navbar */}
        <CustomerNavbar restaurantId={resolvedRestId} />
      </div>
    );
  }

  return (
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

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-5 pb-28 flex flex-col gap-5">
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
                </div>
              </div>
            </div>
          ))}

          {/* Loyalty Discount Banner */}
          {loyaltyInfo?.loyaltyEnabled && loyaltyInfo?.customer?.hasPendingDiscount && (
            <div className="bg-green-50 border-t border-b border-green-200/50 p-4 text-green-800 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#F5C518] fill-current animate-pulse flex-shrink-0" />
              <div>
                <span className="font-bold text-xs uppercase tracking-wide block">Loyalty Reward Active!</span>
                <p className="text-[11px] text-green-600 font-semibold leading-tight mt-0.5">
                  A {loyaltyInfo.discountPercentage}% discount has been applied to this order since you redeemed your stamps.
                </p>
              </div>
            </div>
          )}

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

            {loyaltyDiscount > 0 && (
              <div className="flex justify-between text-xs text-green-700 font-bold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#F5C518] fill-current animate-pulse" />
                  Loyalty Reward ({loyaltyInfo?.discountPercentage}% Off)
                </span>
                <span>-₹{loyaltyDiscount}</span>
              </div>
            )}

            <div className="flex justify-between items-center border-t border-text-dark/10 pt-2 mt-1">
              <span className="font-black text-lg text-text-dark">Total</span>
              <span className="font-black text-xl text-text-dark">₹{finalDiscountedTotal}</span>
            </div>
          </div>
        </div>

        {/* Nudges & Offers Section */}
        {offersLoading ? (
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 flex items-center justify-center gap-3 border border-gray-100">
            <Loader2 className="w-5 h-5 text-[#C0181A] animate-spin" />
            <span className="text-sm text-gray-500 font-medium animate-pulse">Personalizing your offers...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* 1. Discount Booster */}
            {evaluationResult.discountNudge && (
              <div className="bg-gradient-to-br from-[#8B0000] to-[#5A0000] rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
                <div className="flex items-start justify-between gap-2 mb-3.5 relative z-10">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#F5C518]" />
                    <span className="font-bold text-xs uppercase tracking-wider">Discount Booster</span>
                  </div>
                  <span className="bg-[#FFF8E7] text-[#D97706] text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-[#F5C518]/30">
                    {evaluationResult.discountNudge.percentOff}% Off
                  </span>
                </div>
                <p className="text-sm font-extrabold mb-3.5 relative z-10">{evaluationResult.discountNudge.message}</p>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden relative z-10">
                  <div
                    className="bg-[#F5C518] h-full rounded-full transition-all duration-700"
                    style={{ width: `${evaluationResult.discountNudge.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] mt-2 font-bold opacity-90 relative z-10">
                  <span>{Math.round(evaluationResult.discountNudge.progress || 0)}% there</span>
                  <span className="text-[#F5C518] font-black">Save ₹{evaluationResult.discountNudge.savings}</span>
                </div>
              </div>
            )}

            {/* 2. Combo Deals */}
            {evaluationResult.potentialCombos.map((ruleNudge) => (
              <div key={ruleNudge.id} className="bg-gradient-to-br from-[#8B0000] to-[#5A0000] rounded-3xl p-5 text-white shadow-lg flex items-center justify-between gap-4">
                <div className="flex-1">
                  <span className="bg-[#F5C518] text-[#1A1A1A] text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Combo Deal
                  </span>
                  <h3 className="font-extrabold text-sm mt-3 leading-snug">
                    {ruleNudge.message}
                  </h3>
                  <p className="text-[10px] text-white/70 mt-1 font-semibold">
                    Get extra value!
                  </p>
                </div>
                {ruleNudge.suggestedItems && ruleNudge.suggestedItems.length > 0 && (
                  <div className="flex flex-col items-center gap-3 flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md bg-white/10 border border-white/15">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={getItemImage(ruleNudge.suggestedItems[0].image)} alt="Combo Item" className="w-full h-full object-cover" />
                    </div>
                    <button
                      onClick={() => handleAddUpsell(ruleNudge.suggestedItems![0], 'combo_freebie', ruleNudge.id)}
                      className="bg-[#F5C518] hover:bg-[#E0B310] text-[#1A1A1A] text-[9px] font-black px-3.5 py-1.5 rounded-lg uppercase tracking-wider transition-all active:scale-95 text-center"
                    >
                      + Add
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* 3. Recommended to Unlock Offer */}
            {crossSellSuggestions.length > 0 && (
              <div className="bg-white rounded-3xl shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3.5">
                  <Sparkles className="w-4.5 h-4.5 text-[#C0181A]" />
                  <span className="font-black text-xs text-gray-900 uppercase tracking-wider">
                    {evaluationResult.discountNudge ? 'Recommended to Unlock Offer' : 'Recommended For You'}
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1.5 scrollbar-thin">
                  {crossSellSuggestions.map((item) => (
                    <div key={item._id} className="bg-gray-50 rounded-2xl p-3 flex-shrink-0 w-[140px] flex flex-col gap-2.5 border border-gray-100/50">
                      <div className="w-full h-20 rounded-xl overflow-hidden bg-gray-100 shadow-inner">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getItemImage(item.image)} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[11px] font-extrabold text-gray-800 truncate leading-tight">{item.name}</span>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-xs font-black text-gray-900">₹{item.price}</span>
                        <button
                          onClick={() => handleAddUpsell(item, 'cross_sell')}
                          className="bg-[#C0181A] text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase active:scale-95 transition-transform"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Best Add-ons For You */}
            {bestAddOns.length > 0 && (
              <div className="bg-white rounded-3xl shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3.5">
                  <Sparkles className="w-4.5 h-4.5 text-[#C0181A]" />
                  <span className="font-black text-xs text-gray-900 uppercase tracking-wider">Best Add-ons For You</span>
                </div>
                <div className="flex flex-col gap-3">
                  {bestAddOns.map((item) => (
                    <div key={item._id} className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shadow-sm flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={getItemImage(item.image)} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black text-[#D97706] uppercase tracking-wider block">{item.category}</span>
                          <h4 className="font-extrabold text-sm text-gray-800 truncate leading-tight mt-0.5">{item.name}</h4>
                          <span className="text-xs font-bold text-gray-900 block mt-1">₹{item.price}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddUpsell(item, 'cross_sell')}
                        className="bg-[#C0181A] hover:bg-[#A01012] text-white text-xs font-black px-4 py-2 rounded-xl uppercase tracking-wider active:scale-95 transition-all shadow-sm"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Place Order Button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-cta text-text-dark font-bold text-sm py-4 rounded-xl uppercase tracking-wide active:scale-[0.97] transition-transform shadow-[0_4px_15px_rgba(245,197,24,0.3)]"
        >
          Place Order
        </button>
      </div>

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
              </div>
            )}

            {isCachedUser && !isEditingDetails ? (
              <div className="flex flex-col gap-4">
                <div className="bg-surface rounded-xl p-4 border border-text-dark/5">
                  <span className="text-[0.65rem] text-text-dark/40 uppercase font-bold tracking-wider">Ordering As</span>
                  <p className="font-bold text-base text-text-dark mt-0.5">{name}</p>
                  <p className="text-xs text-text-dark/60 mt-0.5">{phone}</p>
                </div>

                <div className="flex flex-col gap-1.5 border border-text-dark/5 bg-surface rounded-xl p-3">
                  <label className="text-[0.65rem] font-bold text-text-dark/50 uppercase tracking-wider">Note to Chef (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Make it extra spicy / No onions"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                    className="bg-white border border-text-dark/10 rounded-lg px-3 py-2 text-xs text-text-dark outline-none resize-none focus:border-primary placeholder:text-text-dark/30 font-medium"
                  />
                </div>
                
                <p className="text-xs text-text-dark/50 text-center px-2">
                  Confirm your details above. Your details are cached on this device for a faster checkout.
                </p>

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      handleSubmit(e);
                    }}
                    disabled={loading}
                    className="w-full bg-cta text-text-dark font-bold text-sm py-4 rounded-xl uppercase tracking-wide active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Placing Order...' : 'Confirm & Place Order'}
                  </button>

                  <button
                    onClick={() => setIsEditingDetails(true)}
                    disabled={loading}
                    className="w-full bg-surface text-text-dark font-bold text-xs py-3 rounded-xl hover:bg-surface/80 transition-colors"
                  >
                    Change Details
                  </button>
                </div>
              </div>
            ) : (
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

                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.7rem] uppercase font-bold text-bg-dark tracking-[0.02em]">Note to Chef (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Make it extra spicy / No onions"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                    className="bg-surface border-[1.5px] border-transparent rounded-[10px] px-4 py-3 text-xs text-text-dark outline-none resize-none focus:border-primary placeholder:text-text-dark/40 font-medium"
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

                {isCachedUser && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDetails(false)}
                    className="text-xs text-text-dark/50 hover:text-text-dark text-center mt-1 underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      )}
      <CustomerNavbar restaurantId={resolvedRestId} />
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#8B0000] to-[#5A0000] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <Loader2 className="w-8 h-8 text-[#F5C518] animate-spin" />
      </div>
    }>
      <CartContent />
    </Suspense>
  );
}
