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

export const THEME_PRESETS: ThemePreset[] = [
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
  {
    id: 'purple',
    name: 'Royal Violet',
    category: 'Boutique & Luxury Eateries',
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
    category: 'Fast Casual, Burgers & Pizzas',
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
    category: 'Seafood & Coastal Dining',
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
