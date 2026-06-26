import React from 'react';
import { getAdminByRestaurantId } from '@/features/auth';
import { getUpsellConfig } from '@/actions/upsell';
import { MenuList } from '@/features/menu';
import Link from 'next/link';
import { AlertTriangle, UtensilsCrossed } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}

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
}

export default async function MenuPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;
  const table = searchParamsResolved?.table || '';

  let menuItems: MenuItem[] = [];
  let restaurantName = 'Tokyo Momos';
  let hasError = false;
  let upsellDataResult: any = null;

  let logoUrl = '';
  let primaryColor = '#C0181A';
  let welcomeMessage = 'Welcome to our restaurant!';

  try {
    const admin = await getAdminByRestaurantId(slug);
    upsellDataResult = await getUpsellConfig(slug);
    menuItems = upsellDataResult.menuItems;

    if (admin) {
      restaurantName = admin.restaurantName;
      logoUrl = admin.logoUrl || '';
      primaryColor = admin.primaryColor || '#C0181A';
      welcomeMessage = admin.welcomeMessage || 'Welcome to our restaurant!';
    }
  } catch (error) {
    console.error('Error loading menu page:', error);
    hasError = true;
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-dark to-bg-darker flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <svg className="absolute bottom-0 left-0 w-full h-[40%]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,154.7C672,149,768,171,864,186.7C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L0,320Z" fill="#C0181A" fillOpacity="0.15" />
        </svg>
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-8 max-w-sm w-full text-center relative z-10">
          <div className="bg-primary/10 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-black text-xl text-text-dark uppercase tracking-tight mb-2">Connection Error</h1>
          <p className="text-sm text-text-dark/60 mb-6">
            Failed to connect to the database. Please verify your connection.
          </p>
          <Link
            href="/api/seed"
            className="block bg-cta text-text-dark font-bold text-sm py-3 rounded-xl uppercase tracking-wide text-center active:scale-[0.97] transition-transform"
          >
            Try to Re-Seed
          </Link>
        </div>
      </div>
    );
  }

  if (menuItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-dark to-bg-darker flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <svg className="absolute bottom-0 left-0 w-full h-[40%]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,154.7C672,149,768,171,864,186.7C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L0,320Z" fill="#C0181A" fillOpacity="0.15" />
        </svg>
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-8 max-w-sm w-full text-center relative z-10">
          <div className="bg-surface rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-black text-xl text-text-dark uppercase tracking-tight mb-2">No Menu Found</h1>
          <p className="text-sm text-text-dark/60 mb-6">
            The restaurant &quot;{slug}&quot; does not have any menu items configured.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/api/seed"
              className="block bg-cta text-text-dark font-bold text-sm py-3 rounded-xl uppercase tracking-wide text-center active:scale-[0.97] transition-transform"
            >
              Seed Database
            </Link>
            <Link
              href="/admin/login"
              className="block bg-primary text-white font-bold text-sm py-3 rounded-xl uppercase tracking-wide text-center active:scale-[0.97] transition-transform"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MenuList
      initialItems={menuItems}
      restaurantName={restaurantName}
      restaurantId={slug}
      table={table}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
      welcomeMessage={welcomeMessage}
      upsellData={upsellDataResult ? {
        pairingRules: upsellDataResult.pairingRules,
        computedAffinity: upsellDataResult.computedAffinity,
        completedCount: upsellDataResult.completedCount,
        menuItems: upsellDataResult.menuItems
      } : undefined}
    />
  );
}
