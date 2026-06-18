import React from 'react';
import dbConnect from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { getMenuItems } from '@/actions/menu';
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
}

export default async function MenuPage({ params }: PageProps) {
  // Await the async route params in Next.js 16
  const { slug } = await params;

  let menuItems: MenuItem[] = [];
  let restaurantName = 'Tokyo Momos';
  let hasError = false;

  try {
    await dbConnect();
    const admin = await Admin.findOne({ restaurantId: slug });
    menuItems = await getMenuItems(slug);
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
    />
  );
}
