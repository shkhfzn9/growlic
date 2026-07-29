/**
 * Menu Image Lookup
 *
 * Maps menu item names (keyword-based, case-insensitive) to their
 * corresponding compressed WebP image paths served from /public/menu/.
 *
 * HOW IT WORKS
 * ─────────────
 * `resolveMenuImage(name, dbImage)` is the single entry point.
 *
 * Priority:
 *   1. If the item already has a real image URL/path stored in the DB → use it.
 *   2. If a keyword in MENU_IMAGE_MAP matches the item name → use that image.
 *   3. Fallback → /menu/allOtherFoods.webp
 *
 * HOW TO ADD MORE ITEMS
 * ──────────────────────
 * Add a new entry to MENU_IMAGE_MAP with one or more lowercase keyword
 * fragments and the matching public image path. Keywords are matched
 * against the lowercased item name using substring search.
 * All images are WebP for optimal performance.
 *
 * Example:
 *   { keywords: ['dragon roll'], image: '/menu/dragonRoll.webp' },
 */

const FALLBACK_IMAGE = '/menu/allOtherFoods.webp';

interface ImageEntry {
  /** Lowercase keyword fragments. The FIRST match wins. */
  keywords: string[];
  image: string;
}

/**
 * Ordered list of keyword → image mappings.
 * More specific entries should come BEFORE more generic ones.
 * e.g. "chilli garlic momos" before "momos"
 */
const MENU_IMAGE_MAP: ImageEntry[] = [
  // ── Momos ───────────────────────────────────────────────────────────────
  { keywords: ['afghani momo', 'afghani momos'], image: '/menu/afghaniMomos.webp' },
  { keywords: ['butter chicken momo', 'butter chicken momos'], image: '/menu/butterChickenMomos.webp' },
  { keywords: ['chilli garlic momo', 'chilli garlic momos'], image: '/menu/ChilliGarlicMomos.webp' },
  { keywords: ['schezwan momo', 'schezwan momos'], image: '/menu/SchezwanMomos.webp' },
  { keywords: ['tandoori momo', 'tandoori momos'], image: '/menu/TandooriMomos.webp' },
  { keywords: ['malai momo', 'malai momos'], image: '/menu/MalaiMomos.webp' },
  { keywords: ['kadhai momo', 'kadhai momos'], image: '/menu/kadhaiMomos.webp' },
  { keywords: ['jhol momo', 'jhol momos'], image: '/menu/JholMomos.webp' },
  { keywords: ['pan fried momo', 'pan-fried momo', 'panfried momo', 'pan fried momos', 'pan-fried momos', 'panfried momos'], image: '/menu/PanFriedMomos.webp' },
  { keywords: ['fried momo', 'fried momos'], image: '/menu/FriedMomos.webp' },
  { keywords: ['savoury momo', 'savoury momos', 'steam momo', 'steamed momo', 'steam momos', 'steamed momos', 'veg momo', 'veg momos', 'classic momo', 'classic momos'], image: '/menu/SteamMomos.webp' },

  // ── Noodles ─────────────────────────────────────────────────────────────
  { keywords: ['chilli garlic noodle', 'chilli garlic noodles'], image: '/menu/ChilliGarlicNoodles.webp' },
  { keywords: ['hong kong noodle', 'hong kong noodles'], image: '/menu/HongKongNoodles.webp' },
  { keywords: ['schezwan noodle', 'schezwan noodles'], image: '/menu/schezwanNoodles.webp' },
  { keywords: ['singapore noodle', 'singapore noodles'], image: '/menu/SingaporeNoodles.webp' },
  { keywords: ['ramen'], image: '/menu/Ramen.webp' },
  { keywords: ['classic noodle', 'classic noodles', 'plain noodle', 'plain noodles'], image: '/menu/ClassicNoodles.webp' },

  // ── Fried Rice ──────────────────────────────────────────────────────────
  { keywords: ['chilli garlic fried rice', 'chilli garlic rice'], image: '/menu/ChilliGarlicFriedRice.webp' },
  { keywords: ['hong kong fried rice', 'hong kong rice'], image: '/menu/HongKongFriedRice.webp' },
  { keywords: ['schezwan fried rice', 'schezwan rice'], image: '/menu/SchwanFriedRice.webp' },
  { keywords: ['classic chicken fried rice', 'chicken fried rice'], image: '/menu/ClassicChickenFriedRice.webp' },
  { keywords: ['veg fried rice', 'veg rice', 'vegetable fried rice', 'plain fried rice'], image: '/menu/vegFriedRice.webp' },

  // ── Chicken Dishes ──────────────────────────────────────────────────────
  { keywords: ['chilli chicken'], image: '/menu/ChilliChicken.webp' },
  { keywords: ['chicken popcorn', 'popcorn chicken'], image: '/menu/ChickenPopcorn.webp' },
  { keywords: ['chicken strips', 'chicken strip'], image: '/menu/chickenStrips.webp' },
  { keywords: ['chicken breast', 'grilled chicken breast', 'grilled chicken'], image: '/menu/grilledChicenBreast.webp' },
  { keywords: ['chicken salad'], image: '/menu/chickenSalad.webp' },
  { keywords: ['chicken crispeze', 'crispeze'], image: '/menu/chickenCrispeze.webp' },

  // ── Rolls & Wraps ────────────────────────────────────────────────────────
  { keywords: ['tokyo chilli garlic wrap', 'chilli garlic wrap'], image: '/menu/tokyoChilliGarlicWrap.webp' },
  { keywords: ['beef roll'], image: '/menu/beefRoll.webp' },
  { keywords: ['burrito'], image: '/menu/Buritto.webp' },
  { keywords: ['roll', 'wrap'], image: '/menu/all-rolls.webp' },
];

/**
 * Resolves the best image path for a menu item.
 *
 * @param name     - The item's display name (from the DB).
 * @param dbImage  - The item's `image` field value stored in the DB (may be empty/svg placeholder).
 * @returns        - An absolute public path string like `/menu/SteamMomos.webp`
 */
export function resolveMenuImage(name: string, dbImage?: string): string {
  // 1. Trust the DB image if it is a real URL or a non-placeholder path
  if (
    dbImage &&
    !dbImage.startsWith('data:image/svg+xml') &&
    dbImage.trim() !== '' &&
    dbImage !== '/dish_placeholder.jpg'
  ) {
    return dbImage;
  }

  // 2. Keyword match against the item name
  const lowerName = name.toLowerCase();
  for (const entry of MENU_IMAGE_MAP) {
    for (const keyword of entry.keywords) {
      if (lowerName.includes(keyword)) {
        return entry.image;
      }
    }
  }

  // 3. Fallback
  return FALLBACK_IMAGE;
}
