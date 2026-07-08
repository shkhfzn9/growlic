'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UtensilsCrossed, ShoppingBag, Receipt, Award, Bell, Loader2 } from 'lucide-react';
import { callStaffAction } from '@/actions/orders';
import { getRestaurantMenuContext } from '@/actions/menu';

interface CustomerNavbarProps {
  restaurantId?: string;
  menuContext?: any;
}

export default function CustomerNavbar({ restaurantId, menuContext }: CustomerNavbarProps) {
  const pathname = usePathname();
  const cart = useSelector((state: RootState) => state.cart);
  
  const [lastOrder, setLastOrder] = useState<{ id: string; restaurantId: string } | null>(null);
  const [hasPhone, setHasPhone] = useState(false);

  const [callStaffAllowed, setCallStaffAllowed] = useState(() => {
    if (menuContext && menuContext.admin) {
      return menuContext.admin.callStaffEnabled !== false;
    }
    return true;
  });
  const [calling, setCalling] = useState(false);
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const [callSuccess, setCallSuccess] = useState(false);

  // Load last order details and check phone cache from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('last_order_id');
      const restId = localStorage.getItem('last_order_restaurant_id');
      if (id) {
        setLastOrder({ id, restaurantId: restId || '' });
      }
      const phone = localStorage.getItem('customer_phone');
      setHasPhone(!!phone);
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

  // Hydrate Call Staff allowance config
  useEffect(() => {
    if (menuContext) {
      if (menuContext.admin) {
        setCallStaffAllowed(menuContext.admin.callStaffEnabled !== false);
      }
      return;
    }

    if (currentRestaurantId) {
      getRestaurantMenuContext(currentRestaurantId)
        .then((context) => {
          if (context && context.admin) {
            setCallStaffAllowed(context.admin.callStaffEnabled !== false);
          }
        })
        .catch((err) => console.error('Error fetching navbar call settings:', err));
    }
  }, [currentRestaurantId, menuContext]);

  // Active state flags
  const isMenuActive = pathname.startsWith('/menu/');
  const isCartActive = pathname === '/cart';
  const isStampsActive = pathname === '/stamps';
  const isOrdersActive = pathname === '/orders';

  return (
    <>
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

        {/* Stamps Link */}
        {(lastOrder || hasPhone) && (
          <Link
            href="/stamps"
            className={`flex flex-col items-center gap-0.5 transition-all duration-200 active:scale-95 ${
              isStampsActive ? 'text-[#F5C518]' : 'text-white/60 hover:text-white'
            }`}
          >
            <Award className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Stamps</span>
            <span className={`w-1 h-1 rounded-full bg-[#F5C518] transition-all duration-300 ${
              isStampsActive ? 'scale-100 opacity-100 mt-0.5' : 'scale-0 opacity-0 h-0 mt-0'
            }`} />
          </Link>
        )}

        {/* Orders Link (visible if there's a recent order or they are logged in with phone) */}
        {(lastOrder || hasPhone) && (
          <Link
            href={`/orders?restaurantId=${currentRestaurantId}`}
            className={`flex flex-col items-center gap-0.5 transition-all duration-200 active:scale-95 ${
              isOrdersActive ? 'text-[#F5C518]' : 'text-white/60 hover:text-white'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
            <span className={`w-1 h-1 rounded-full bg-[#F5C518] transition-all duration-300 ${
              isOrdersActive ? 'scale-100 opacity-100 mt-0.5' : 'scale-0 opacity-0 h-0 mt-0'
            }`} />
          </Link>
        )}

        {/* Call Staff Action */}
        {callStaffAllowed && (
          <button
            onClick={() => setShowCallConfirm(true)}
            className="flex flex-col items-center gap-0.5 transition-all duration-200 active:scale-95 text-white/60 hover:text-white"
          >
            <Bell className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Call Staff</span>
          </button>
        )}
      </div>

      {/* Call Confirmation Dialog */}
      {showCallConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-50 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-7 h-7 text-[#C0181A]" />
            </div>
            <h3 className="font-extrabold text-lg text-gray-900 uppercase tracking-tight">Call Staff?</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Ring the service alert to call a waiter to Table <span className="font-black text-[#C0181A]">{cart.tableId || 'Takeaway'}</span>?
            </p>
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setShowCallConfirm(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl active:scale-95 transition-all hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                disabled={calling}
                onClick={async () => {
                  setCalling(true);
                  try {
                    await callStaffAction(currentRestaurantId || 'tokyo-momos', cart.tableId || 'Takeaway');
                    setCallSuccess(true);
                    setShowCallConfirm(false);
                    setTimeout(() => setCallSuccess(false), 3000);
                  } catch (e) {
                    console.error(e);
                    alert('Failed to call staff. Please try again.');
                  } finally {
                    setCalling(false);
                  }
                }}
                className="flex-1 py-2.5 bg-[#C0181A] text-white text-xs font-bold rounded-xl active:scale-95 transition-all hover:bg-[#A01012] flex items-center justify-center gap-1.5"
              >
                {calling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {callSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#16A34A] text-white text-xs font-black px-5 py-3.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <span>🔔</span> Staff Called successfully!
        </div>
      )}
    </>
  );
}
