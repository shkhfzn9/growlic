import React from 'react';
import { getOrderById } from '@/actions/orders';
import OrderTracker from '@/components/menu/OrderTracker';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ restaurantId?: string }>;
}

export default async function TrackPage({ params, searchParams }: PageProps) {
  // Await async page params in Next.js 16
  const { orderId } = await params;
  const { restaurantId } = await searchParams;

  let order = null;
  let hasError = false;

  try {
    order = await getOrderById(orderId, restaurantId);
  } catch (error) {
    console.error('Error loading track page:', error);
    hasError = true;
  }

  if (hasError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-mono-custom text-center">
        <div className="border border-black p-8 max-w-sm">
          <h1 className="text-xl font-bold uppercase mb-4">System Error</h1>
          <p className="text-xs text-zinc-600 mb-6">
            Failed to load order. Make sure the ID is correct.
          </p>
          <Link
            href="/"
            className="w-full inline-block border border-black px-4 py-2 text-xs font-bold uppercase bg-black text-white hover:bg-white hover:text-black transition-all"
          >
            [ GO TO MENU ]
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-mono-custom text-center">
        <div className="border border-black p-8 max-w-sm">
          <h1 className="text-xl font-bold uppercase mb-4">Order Not Found</h1>
          <p className="text-xs text-zinc-600 mb-6">
            We couldn&apos;t find an order with ID: &quot;{orderId}&quot;.
          </p>
          <Link
            href="/"
            className="w-full inline-block border border-black px-4 py-2 text-xs font-bold uppercase bg-black text-white hover:bg-white hover:text-black transition-all"
          >
            [ GO TO MENU ]
          </Link>
        </div>
      </div>
    );
  }

  return <OrderTracker initialOrder={order} orderId={orderId} />;
}
