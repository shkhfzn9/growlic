import React from 'react';
import { getAdminByRestaurantId } from '@/features/auth';
import { getUpsellConfig } from '@/actions/upsell';
import MenuList from '@/components/menu/MenuList';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ slug: string }>;
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

export default async function MenuPage({ params }: PageProps) {
  // Await the async route params in Next.js 16
  const { slug } = await params;

  let menuItems: MenuItem[] = [];
  let restaurantName = 'Tokyo Momos';
  let hasError = false;
  let upsellDataResult: any = null;

  try {
    const admin = await getAdminByRestaurantId(slug);
    upsellDataResult = await getUpsellConfig(slug);
    menuItems = upsellDataResult.menuItems;
    restaurantName = admin ? admin.restaurantName : 'Tokyo Momos';
  } catch (error) {
    console.error('Error loading menu page:', error);
    hasError = true;
  }

  if (hasError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-mono-custom text-center">
        <div className="border border-black p-8 max-w-md">
          <h1 className="text-xl font-bold uppercase mb-4">System Error</h1>
          <p className="text-sm text-zinc-600 mb-6">
            Failed to connect to the database. Please verify your MongoDB connection.
          </p>
          <Link
            href="/api/seed"
            className="border border-black px-4 py-2 text-xs font-bold uppercase hover:bg-black hover:text-white"
          >
            [ Try to Re-Seed ]
          </Link>
        </div>
      </div>
    );
  }

  if (menuItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-mono-custom text-center">
        <div className="border border-black p-8 max-w-md">
          <h1 className="text-xl font-bold uppercase mb-4">Restaurant Not Found</h1>
          <p className="text-sm text-zinc-600 mb-6">
            The restaurant slug &quot;{slug}&quot; does not have any menu items configured.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/api/seed"
              className="border border-black px-4 py-2 text-xs font-bold uppercase hover:bg-black hover:text-white"
            >
              [ Click to Seed Database ]
            </Link>
            <Link
              href="/admin/login"
              className="border border-black px-4 py-2 text-xs font-bold uppercase hover:bg-black hover:text-white"
            >
              [ Go to Admin Login ]
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
      upsellData={upsellDataResult ? {
        pairingRules: upsellDataResult.pairingRules,
        computedAffinity: upsellDataResult.computedAffinity,
        completedCount: upsellDataResult.completedCount,
        menuItems: upsellDataResult.menuItems
      } : undefined}
    />
  );
}
