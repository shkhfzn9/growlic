import React from 'react';
import { getMenuItemById } from '@/actions/menu';
import { EditItemForm } from '@/features/menu';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMenuItemPage({ params }: PageProps) {
  // Await async page params in Next.js 16
  const { id } = await params;

  let item = null;
  let hasError = false;

  try {
    item = await getMenuItemById(id);
  } catch (error) {
    console.error('Error loading edit menu page:', error);
    hasError = true;
  }

  if (hasError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-mono-custom text-center">
        <div className="border border-black p-8 max-w-sm">
          <h1 className="text-xl font-bold uppercase mb-4">System Error</h1>
          <p className="text-xs text-zinc-600 mb-6">
            Failed to retrieve menu item. Make sure the ID is correct.
          </p>
          <Link
            href="/admin/menu"
            className="w-full inline-block border border-black px-4 py-2 text-xs font-bold uppercase bg-black text-white hover:bg-white hover:text-black transition-all"
          >
            [ GO TO MENU MANAGEMENT ]
          </Link>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-mono-custom text-center">
        <div className="border border-black p-8 max-w-sm">
          <h1 className="text-xl font-bold uppercase mb-4">Item Not Found</h1>
          <p className="text-xs text-zinc-600 mb-6">
            Menu item not found in database.
          </p>
          <Link
            href="/admin/menu"
            className="w-full inline-block border border-black px-4 py-2 text-xs font-bold uppercase bg-black text-white hover:bg-white hover:text-black transition-all"
          >
            [ GO TO MENU MANAGEMENT ]
          </Link>
        </div>
      </div>
    );
  }

  return <EditItemForm item={item} />;
}
