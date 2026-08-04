/**
 * Smart Personalized Recommendation Engine Algorithm
 * 
 * Hyper-personalized recommendation system inspired by Netflix / Amazon collaborative filtering & culinary pairing matrix.
 * Combines 7 real-time signals:
 *  1. Cart Co-Occurrence Association Matrix (computedAffinity - Apriori mining)
 *  2. Culinary Product Pairing Synergy Matrix (Pairs Steamed Momos, Ramen, Fried Rice, Chicken Strips with matching add-ons)
 *  3. Category & Tag Pairing Rules
 *  4. Customer Order History & Preferred Categories (from customer past orders)
 *  5. Offer Gap Matching (price optimization to unlock discount tiers)
 *  6. Dietary & Flavor Harmony (protects healthy carts from conflicting heavy items)
 *  7. Price Balance & Relative Affinity Scoring
 */

export interface RecommendationItem {
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

export interface CartContextItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export interface PairingRule {
  _id: string;
  triggerCategory: string;
  suggestCategories: string[];
  active: boolean;
}

export interface PastOrderItem {
  name: string;
  category?: string;
  price?: number;
}

export interface PastOrder {
  items: PastOrderItem[];
}

export interface RecommendationOptions {
  menuItems: RecommendationItem[];
  cartItems: CartContextItem[];
  subtotal: number;
  pairingRules?: PairingRule[];
  computedAffinity?: Record<string, Array<{ name: string; confidence: number }>>;
  pastOrders?: PastOrder[];
  targetGap?: number; // Distance remaining to unlock next discount tier (e.g. ₹75)
  limit?: number;
}

export interface ScoredRecommendation extends RecommendationItem {
  score: number;
  socialProof?: string;
  recommendationReason?: string;
  gapFit?: boolean;
}

/**
 * Culinary Product Combination Knowledge Matrix
 * Explicitly pairs products that naturally belong together in food combinations.
 */
export const PRODUCT_PAIRING_MATRIX: Array<{
  keywords: string[];
  suggestedAddOnKeywords: string[];
  suggestedCategories: string[];
  reason: (cartItemName: string) => string;
}> = [
  {
    keywords: ['momo', 'momos', 'steamed momo', 'classic momos'],
    suggestedAddOnKeywords: ['dip', 'chutney', 'gravy', 'soup', 'thukpa', 'iced tea', 'drink', 'beverage', 'coke', 'thums up', 'pepsi', 'sprite'],
    suggestedCategories: ['Momos Gravy Add Ons', 'Tokyo Soups', 'Drinks & Beverages', 'Additional Snacks'],
    reason: (name) => `Pairs perfectly with your ${name}`,
  },
  {
    keywords: ['ramen', 'thukpa', 'noodle soup'],
    suggestedAddOnKeywords: ['egg', 'strip', 'strips', 'crispy', 'steamed', 'kimchi', 'tea', 'boba', 'drink', 'beverage'],
    suggestedCategories: ['Classic Momos', 'Additional Snacks', 'Drinks & Beverages'],
    reason: (name) => `Delicious companion with ${name}`,
  },
  {
    keywords: ['fried rice', 'rice', 'woksizzle', 'noodles', 'hakka'],
    suggestedAddOnKeywords: ['chilli chicken', 'manchurian', 'gravy', 'spring roll', 'wing', 'wings', 'coke', 'pepsi'],
    suggestedCategories: ['Momos Gravy Add Ons', 'Additional Snacks', 'Drinks & Beverages'],
    reason: (name) => `Classic combo with ${name}`,
  },
  {
    keywords: ['strip', 'strips', 'fries', 'wing', 'wings', 'fried chicken', 'chicken strips'],
    suggestedAddOnKeywords: ['dip', 'mayo', 'cheese', 'peri peri', 'shake', 'cold drink', 'beverage', 'coke', 'sprite'],
    suggestedCategories: ['Additional Snacks', 'Drinks & Beverages'],
    reason: (name) => `Must-have pairing for ${name}`,
  },
  {
    keywords: ['gravy', 'curry', 'manchurian', 'chilli chicken', 'chilli momos'],
    suggestedAddOnKeywords: ['fried rice', 'steam rice', 'rice', 'noodles', 'bread', 'coke', 'drink'],
    suggestedCategories: ['Momos Woksizzle', 'Drinks & Beverages'],
    reason: (name) => `Best enjoyed with ${name}`,
  },
];

/**
 * Calculates customer preferences from their past order history.
 */
export function analyzeCustomerPreferences(pastOrders: PastOrder[]) {
  const categoryCounts: Record<string, number> = {};
  const itemCounts: Record<string, number> = {};
  let totalItemsOrdered = 0;

  if (pastOrders && Array.isArray(pastOrders)) {
    pastOrders.forEach((order) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          totalItemsOrdered++;
          if (item.category) {
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
          }
          if (item.name) {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
          }
        });
      }
    });
  }

  // Top preferred categories sorted by frequency
  const preferredCategories = Object.keys(categoryCounts).sort(
    (a, b) => categoryCounts[b] - categoryCounts[a]
  );

  return {
    preferredCategories,
    categoryCounts,
    itemCounts,
    totalItemsOrdered,
  };
}

/**
 * Primary Smart Recommendation Algorithm.
 * Evaluates candidates against all personalization & culinary pairing signals.
 */
export function getPersonalizedRecommendations(options: RecommendationOptions): ScoredRecommendation[] {
  const {
    menuItems = [],
    cartItems = [],
    pairingRules = [],
    computedAffinity = {},
    pastOrders = [],
    targetGap = 0,
    limit = 6,
  } = options;

  if (!menuItems || menuItems.length === 0) return [];

  // Filter out candidates that are unavailable, inactive, or ALREADY in the current cart
  const cartItemIds = new Set(cartItems.map((i) => i.id));
  const candidates = menuItems.filter(
    (m) => m.available && m.active !== false && !cartItemIds.has(m._id)
  );

  if (candidates.length === 0) return [];

  // Analyze Customer Preferences from history
  const customerPrefs = analyzeCustomerPreferences(pastOrders);

  // Check cart dietary profile
  const hasFitMeals = cartItems.some((i) =>
    ['Fit Meals', 'Chicken Salad', 'Salad', 'Soups'].includes(i.category) ||
    i.name.toLowerCase().includes('salad') ||
    i.name.toLowerCase().includes('grilled')
  );

  const averageCartPrice =
    cartItems.length > 0
      ? cartItems.reduce((sum, i) => sum + i.price, 0) / cartItems.length
      : 150;

  const scoredList: ScoredRecommendation[] = [];

  candidates.forEach((candidate) => {
    let score = 0;
    let socialProof: string | undefined;
    let recommendationReason: string | undefined;
    let gapFit = false;

    const candidateNameLower = candidate.name.toLowerCase();
    const candidateCatLower = candidate.category.toLowerCase();

    // ── Signal 1: Culinary Product Combination Synergy Matrix ──
    cartItems.forEach((cartItem) => {
      const cartNameLower = cartItem.name.toLowerCase();
      const cartCatLower = (cartItem.category || '').toLowerCase();

      PRODUCT_PAIRING_MATRIX.forEach((pairingRule) => {
        const matchesCartItem = pairingRule.keywords.some(
          (kw) => cartNameLower.includes(kw) || cartCatLower.includes(kw)
        );

        if (matchesCartItem) {
          const matchesCandidate =
            pairingRule.suggestedAddOnKeywords.some(
              (kw) => candidateNameLower.includes(kw) || candidateCatLower.includes(kw)
            ) || pairingRule.suggestedCategories.includes(candidate.category);

          if (matchesCandidate) {
            score += 55; // High culinary pairing score
            if (!recommendationReason) {
              recommendationReason = pairingRule.reason(cartItem.name);
            }
          }
        }
      });
    });

    // ── Signal 2: Co-Occurrence Association Rules (computedAffinity) ──
    cartItems.forEach((cartItem) => {
      const affinityList = computedAffinity[cartItem.name];
      if (affinityList && Array.isArray(affinityList)) {
        const matched = affinityList.find((aff) => aff.name === candidate.name);
        if (matched) {
          const confidencePct = Math.round(matched.confidence * 100);
          score += matched.confidence * 60; // Max +60 score boost
          socialProof = `${confidencePct}% of customers who ordered ${cartItem.name} also added this`;
          if (!recommendationReason) {
            recommendationReason = `Frequently paired with your ${cartItem.name}`;
          }
        }
      }
    });

    // ── Signal 3: Category Pairing Rules & Tags ──
    cartItems.forEach((cartItem) => {
      const menuVer = menuItems.find((m) => m._id === cartItem.id || m.name === cartItem.name);
      if (menuVer && menuVer.pairsWithCategories) {
        if (menuVer.pairsWithCategories.includes(candidate.category)) {
          score += 35;
          if (!recommendationReason) {
            recommendationReason = `Great companion for ${cartItem.name}`;
          }
        }
      }

      pairingRules.forEach((rule) => {
        if (rule.active && rule.triggerCategory === cartItem.category) {
          if (rule.suggestCategories.includes(candidate.category)) {
            score += 30;
            if (!recommendationReason) {
              recommendationReason = `Recommended pairing with ${cartItem.category}`;
            }
          }
        }
      });
    });

    // ── Signal 4: Customer History & Favorite Categories ──
    if (customerPrefs.totalItemsOrdered > 0) {
      const catRank = customerPrefs.preferredCategories.indexOf(candidate.category);
      if (catRank === 0) {
        score += 30;
        if (!recommendationReason) recommendationReason = `From your #1 favorite category (${candidate.category})`;
      } else if (catRank === 1 || catRank === 2) {
        score += 20;
        if (!recommendationReason) recommendationReason = `Matches your past order preferences`;
      }

      if (customerPrefs.itemCounts[candidate.name]) {
        score += 25;
        if (!recommendationReason) recommendationReason = `Reorder one of your past favorites`;
      }
    }

    // ── Signal 5: Offer Target Gap Matching ──
    if (targetGap > 0) {
      if (candidate.price >= targetGap && candidate.price <= targetGap + 70) {
        score += 45;
        gapFit = true;
        recommendationReason = `Adds ₹${candidate.price} to instantly unlock your discount offer!`;
      } else if (candidate.price < targetGap && candidate.price >= targetGap * 0.5) {
        score += 25;
        gapFit = true;
        if (!recommendationReason) recommendationReason = `Gets you ₹${candidate.price} closer to unlocking your offer!`;
      }
    }

    // ── Signal 6: Dietary Coherence Protection ──
    if (hasFitMeals) {
      const richKeywords = ['butter', 'malai', 'cheese', 'cheesy', 'deep fried', 'crispy'];
      if (richKeywords.some((kw) => candidateNameLower.includes(kw) || candidateCatLower.includes(kw))) {
        score -= 40;
      } else if (['Tokyo Soups', 'Fit Meals', 'Chicken Salad'].includes(candidate.category)) {
        score += 25;
        if (!recommendationReason) recommendationReason = `Keeps your meal healthy & balanced`;
      }
    }

    // ── Signal 7: Price Balance Bonus ──
    if (candidate.price >= averageCartPrice * 0.4 && candidate.price <= averageCartPrice * 1.6) {
      score += 10;
    }

    // Fallback baseline for popular items
    if (score === 0) {
      score = 10;
      recommendationReason = `Popular chef choice loved by customers`;
    }

    scoredList.push({
      ...candidate,
      score,
      socialProof,
      recommendationReason,
      gapFit,
    });
  });

  // Sort candidates by score descending
  scoredList.sort((a, b) => b.score - a.score);

  return scoredList.slice(0, limit);
}

/**
 * Dedicated Recommendation Engine function for "Recommended to Unlock Offer".
 * Specifically optimizes candidate selection to bridge subtotal gaps to unlock discount tiers.
 */
export function getGapUnlockingRecommendations(options: RecommendationOptions): ScoredRecommendation[] {
  const { targetGap = 0 } = options;
  const list = getPersonalizedRecommendations({
    ...options,
    limit: 8,
  });

  if (targetGap <= 0) return list.slice(0, 4);

  // Re-sort to prioritize items that satisfy gapFit
  const gapFits = list.filter((i) => i.gapFit);
  const others = list.filter((i) => !i.gapFit);

  return [...gapFits, ...others].slice(0, 5);
}

/**
 * Dedicated Recommendation Engine function for "Best Add-ons For You".
 * Dynamically ranks add-on candidates using culinary product combinations (Steamed Momos, Ramen, Fried Rice, Chicken Strips),
 * cart context, category pairing, and past order preferences.
 */
export function getBestAddOnsRecommendations(options: RecommendationOptions): ScoredRecommendation[] {
  const { menuItems = [] } = options;

  // Identify add-on candidates across categories (sides, beverages, dips, soups, desserts, low-priced additions)
  const addOnKeywords = [
    'add-on', 'addon', 'beverage', 'drink', 'sauce', 'dip', 'gravy', 'extra', 'dessert', 'side', 'snack', 'soup', 'thukpa', 'chutney', 'egg', 'kimchi', 'fries', 'mayo', 'wing', 'wings', 'strip', 'strips'
  ];

  const addOnCandidates = menuItems.filter((m) => {
    const catLower = (m.category || '').toLowerCase();
    const nameLower = (m.name || '').toLowerCase();
    return addOnKeywords.some((kw) => catLower.includes(kw) || nameLower.includes(kw)) || m.price <= 180;
  });

  const candidatesToUse = addOnCandidates.length >= 3 ? addOnCandidates : menuItems;

  return getPersonalizedRecommendations({
    ...options,
    menuItems: candidatesToUse,
    limit: 6,
  });
}
