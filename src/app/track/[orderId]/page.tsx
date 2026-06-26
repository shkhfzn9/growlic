import React from 'react';
import { getOrderById } from '@/actions/orders';
import { OrderTracker } from '@/features/order';
import Link from 'next/link';
import { AlertTriangle, Search } from 'lucide-react';

interface PageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ restaurantId?: string }>;
}

export default async function TrackPage({ params, searchParams }: PageProps) {
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
      <div className="min-h-screen bg-gradient-to-br from-bg-dark to-bg-darker flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <svg className="absolute bottom-0 left-0 w-full h-[40%]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,154.7C672,149,768,171,864,186.7C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L0,320Z" fill="#C0181A" fillOpacity="0.15" />
        </svg>
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-8 max-w-sm w-full text-center relative z-10">
          <div className="bg-primary/10 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-black text-xl text-text-dark uppercase tracking-tight mb-2">System Error</h1>
          <p className="text-sm text-text-dark/60 mb-6">
            Failed to load order. Make sure the ID is correct.
          </p>
          <Link
            href="/"
            className="block bg-cta text-text-dark font-bold text-sm py-3 rounded-xl uppercase tracking-wide text-center active:scale-[0.97] transition-transform"
          >
            Go to Menu
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-dark to-bg-darker flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <svg className="absolute bottom-0 left-0 w-full h-[40%]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,154.7C672,149,768,171,864,186.7C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L0,320Z" fill="#C0181A" fillOpacity="0.15" />
        </svg>
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-8 max-w-sm w-full text-center relative z-10">
          <div className="bg-surface rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-black text-xl text-text-dark uppercase tracking-tight mb-2">Order Not Found</h1>
          <p className="text-sm text-text-dark/60 mb-6">
            We couldn&apos;t find an order with ID: &quot;{orderId}&quot;.
          </p>
          <Link
            href="/"
            className="block bg-cta text-text-dark font-bold text-sm py-3 rounded-xl uppercase tracking-wide text-center active:scale-[0.97] transition-transform"
          >
            Go to Menu
          </Link>
        </div>
      </div>
    );
  }

  return <OrderTracker initialOrder={order} orderId={orderId} />;
}
