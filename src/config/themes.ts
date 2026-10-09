export interface ThemePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  primaryColor: string;
  gradientDark: string;
  gradientDarker: string;
  accentColor: string;
  previewBg: string;
}

export interface BusinessCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { id: 'restaurant', name: 'Restaurants & Cafes', icon: '🍽️', description: 'Digital menus, table QR ordering & kitchen tracking' },
  { id: 'salon', name: 'Beauty Salons & Spas', icon: '💇‍♀️', description: 'Service catalog, appointment booking & treatment packages' },
  { id: 'detailing', name: 'Auto Detailing & Car Care', icon: '🚗', description: 'Coating packages, wash services & appointment tracker' },
  { id: 'retail', name: 'Boutiques & Retail Stores', icon: '🛍️', description: 'Product storefront, catalog display & order checkout' },
  { id: 'services', name: 'Services & Consulting', icon: '💼', description: 'Consultation packages, service booking & direct invoicing' },
];

export const THEME_PRESETS: ThemePreset[] = [
  // Restaurants & Cafes
  {
    id: 'burgundy',
    name: 'Burgundy Classic',
    category: 'Fine Dining & Steakhouses',
    description: 'Signature rich burgundy gradient with gold accents. Elegant and appetizing.',
    primaryColor: '#C0181A',
    gradientDark: '#8B0000',
    gradientDarker: '#6B0000',
    accentColor: '#F5C518',
    previewBg: 'linear-gradient(135deg, #8B0000 0%, #6B0000 100%)',
  },
  {
    id: 'midnight',
    name: 'Onyx Midnight',
    category: 'Bars, Lounges & Nightlife',
    description: 'Deep sleek dark slate theme with vibrant electric cobalt accents.',
    primaryColor: '#3B82F6',
    gradientDark: '#111827',
    gradientDarker: '#030712',
    accentColor: '#60A5FA',
    previewBg: 'linear-gradient(135deg, #111827 0%, #030712 100%)',
  },
  {
    id: 'emerald',
    name: 'Emerald Botanical',
    category: 'Cafes, Vegan & Health Dining',
    description: 'Fresh forest green theme with warm gold highlights.',
    primaryColor: '#10B981',
    gradientDark: '#064E3B',
    gradientDarker: '#022C22',
    accentColor: '#F59E0B',
    previewBg: 'linear-gradient(135deg, #064E3B 0%, #022C22 100%)',
  },
  // Salons, Spas & Beauty
  {
    id: 'rose_quartz',
    name: 'Rose Quartz & Plum',
    category: 'Salons & Luxury Spas',
    description: 'Luxe velvet plum gradient with delicate rose quartz & blush gold accents.',
    primaryColor: '#EC4899',
    gradientDark: '#831843',
    gradientDarker: '#4C0519',
    accentColor: '#F472B6',
    previewBg: 'linear-gradient(135deg, #831843 0%, #4C0519 100%)',
  },
  {
    id: 'velvet_noir',
    name: 'Gold & Noir Velvet',
    category: 'Premium Salons & Barbering',
    description: 'High-end black velvet background with radiant champagne gold highlights.',
    primaryColor: '#EAB308',
    gradientDark: '#18181B',
    gradientDarker: '#09090B',
    accentColor: '#FACC15',
    previewBg: 'linear-gradient(135deg, #18181B 0%, #09090B 100%)',
  },
  // Auto Detailing & Car Care Showrooms
  {
    id: 'carbon_crimson',
    name: 'Carbon Fiber Crimson',
    category: 'Auto Detailing & Car Care',
    description: 'Aggressive dark carbon slate gradient with vibrant crimson red racing accents.',
    primaryColor: '#EF4444',
    gradientDark: '#18181B',
    gradientDarker: '#09090B',
    accentColor: '#F87171',
    previewBg: 'linear-gradient(135deg, #18181B 0%, #09090B 100%)',
  },
  {
    id: 'cyber_cyan',
    name: 'Cyber Cyan Metallic',
    category: 'Detailing & Wrap Studios',
    description: 'Futuristic metallic deep navy backdrop with glowing electric cyan accents.',
    primaryColor: '#06B6D4',
    gradientDark: '#0F172A',
    gradientDarker: '#020617',
    accentColor: '#22D3EE',
    previewBg: 'linear-gradient(135deg, #0F172A 0%, #020617 100%)',
  },
  // Retail, Boutiques & General Services
  {
    id: 'purple',
    name: 'Royal Violet',
    category: 'Boutiques & Luxury Retail',
    description: 'Regal deep violet gradient with coral rose accents.',
    primaryColor: '#8B5CF6',
    gradientDark: '#4C1D95',
    gradientDarker: '#2E1065',
    accentColor: '#F43F5E',
    previewBg: 'linear-gradient(135deg, #4C1D95 0%, #2E1065 100%)',
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    category: 'Boutiques & Fast Casual',
    description: 'Warm terracotta & burnt orange gradient with sunshine yellow accents.',
    primaryColor: '#EA580C',
    gradientDark: '#7C2D12',
    gradientDarker: '#451A03',
    accentColor: '#FACC15',
    previewBg: 'linear-gradient(135deg, #7C2D12 0%, #451A03 100%)',
  },
  {
    id: 'navy',
    name: 'Ocean Deep',
    category: 'Services & Coastal Dining',
    description: 'Rich nautical navy gradient with vibrant sky blue accents.',
    primaryColor: '#0284C7',
    gradientDark: '#0C4A6E',
    gradientDarker: '#082F49',
    accentColor: '#38BDF8',
    previewBg: 'linear-gradient(135deg, #0C4A6E 0%, #082F49 100%)',
  },
];

export const DEFAULT_THEME = THEME_PRESETS[0];

export function getThemeById(id?: string): ThemePreset {
  if (!id) return DEFAULT_THEME;
  const found = THEME_PRESETS.find((t) => t.id === id);
  return found || DEFAULT_THEME;
}

export interface ActiveTheme {
  primaryColor: string;
  themeGradientDark: string;
  themeGradientDarker: string;
  themeAccentColor: string;
}

export function saveActiveTheme(theme: ActiveTheme, restaurantId?: string) {
  if (typeof window === 'undefined') return;
  try {
    const data = JSON.stringify(theme);
    localStorage.setItem('current_active_theme', data);
    if (restaurantId) {
      localStorage.setItem(`theme_${restaurantId}`, data);
    }
    document.documentElement.style.setProperty('--theme-primary', theme.primaryColor);
    document.documentElement.style.setProperty('--theme-bg-dark', theme.themeGradientDark);
    document.documentElement.style.setProperty('--theme-bg-darker', theme.themeGradientDarker);
    document.documentElement.style.setProperty('--theme-accent', theme.themeAccentColor);
  } catch (e) {
    console.error('Error saving active theme:', e);
  }
}

export function getActiveTheme(restaurantId?: string): ActiveTheme {
  if (typeof window !== 'undefined') {
    try {
      const targetId =
        restaurantId ||
        new URLSearchParams(window.location.search).get('restaurantId') ||
        localStorage.getItem('last_order_restaurant_id');

      if (targetId) {
        const specific = localStorage.getItem(`theme_${targetId}`);
        if (specific) {
          const parsed = JSON.parse(specific);
          if (parsed?.primaryColor) return parsed;
        }
      }

      const globalTheme = localStorage.getItem('current_active_theme');
      if (globalTheme) {
        const parsed = JSON.parse(globalTheme);
        if (parsed?.primaryColor) return parsed;
      }
    } catch (e) {
      console.error('Error reading active theme:', e);
    }
  }

  return {
    primaryColor: '#C0181A',
    themeGradientDark: '#8B0000',
    themeGradientDarker: '#6B0000',
    themeAccentColor: '#F5C518',
  };
}
