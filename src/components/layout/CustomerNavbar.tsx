'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UtensilsCrossed, ShoppingBag, Receipt } from 'lucide-react';

interface CustomerNavbarProps {
  restaurantId?: string;
}

export default function CustomerNavbar({ restaurantId }: CustomerNavbarProps) {
  const pathname = usePathname();
  const cart = useSelector((state: RootState) => state.cart);
  
  const [lastOrder, setLastOrder] = useState<{ id: string; restaurantId: string } | null>(null);

  // Load last order details from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('last_order_id');
      const restId = localStorage.getItem('last_order_restaurant_id');
      if (id) {
        setLastOrder({ id, restaurantId: restId || '' });
      }
    }
  }, [pathname]); // Refresh on navigation/pathname changes

  // Compute total items count in cart
  const totalItemsCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  // Determine current active restaurant ID
  let currentRestaurantId = restaurantId;
  if (!currentRestaurantId) {
    const menuMatch = pathname.match(/\/menu\/([^/]+)/);
    if (menuMatch) {
      currentRestaurantId = menuMatch[1];
    } else if (cart.restaurantId) {
      currentRestaurantId = cart.restaurantId;
    } else if (lastOrder?.restaurantId) {
      currentRestaurantId = lastOrder.restaurantId;
    } else {
      currentRestaurantId = 'tokyo-momos'; // Default fallback
    }
  }

  // Active state flags
  const isMenuActive = pathname.startsWith('/menu/');
  const isCartActive = pathname === '/cart';
  const isOrderActive = pathname.startsWith('/track/');

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm bg-gradient-to-r from-[#8B0000]/95 via-[#7B0000]/95 to-[#6B0000]/95 border border-white/15 rounded-full py-2.5 px-6 flex items-center justify-around shadow-[0_12px_40px_rgba(107,0,0,0.5)] backdrop-blur-md">
      {/* Menu Link */}
      <Link
        href={`/menu/${currentRestaurantId}`}
        className={`flex flex-col items-center gap-0.5 transition-all duration-200 active:scale-95 ${
          isMenuActive ? 'text-[#F5C518]' : 'text-white/60 hover:text-white'
        }`}
      >
        <UtensilsCrossed className="w-5 h-5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Menu</span>
        <span className={`w-1 h-1 rounded-full bg-[#F5C518] transition-all duration-300 ${
          isMenuActive ? 'scale-100 opacity-100 mt-0.5' : 'scale-0 opacity-0 h-0 mt-0'
        }`} />
      </Link>

      {/* Cart Link */}
      <Link
        href="/cart"
        className={`flex flex-col items-center gap-0.5 transition-all duration-200 active:scale-95 relative ${
          isCartActive ? 'text-[#F5C518]' : 'text-white/60 hover:text-white'
        }`}
      >
        <div className="relative">
          <ShoppingBag className="w-5 h-5" />
          {totalItemsCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-[#F5C518] text-[#1A1A1A] text-[8px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-[#7B0000] shadow-sm animate-pulse">
              {totalItemsCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider">Cart</span>
        <span className={`w-1 h-1 rounded-full bg-[#F5C518] transition-all duration-300 ${
          isCartActive ? 'scale-100 opacity-100 mt-0.5' : 'scale-0 opacity-0 h-0 mt-0'
        }`} />
      </Link>

      {/* Track Order Link (visible only if there's a recent order) */}
      {lastOrder && (
        <Link
          href={`/track/${lastOrder.id}?restaurantId=${lastOrder.restaurantId}`}
          className={`flex flex-col items-center gap-0.5 transition-all duration-200 active:scale-95 ${
            isOrderActive ? 'text-[#F5C518]' : 'text-white/60 hover:text-white'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">My Order</span>
          <span className={`w-1 h-1 rounded-full bg-[#F5C518] transition-all duration-300 ${
            isOrderActive ? 'scale-100 opacity-100 mt-0.5' : 'scale-0 opacity-0 h-0 mt-0'
          }`} />
        </Link>
      )}
    </div>
  );
}
