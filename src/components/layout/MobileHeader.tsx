'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  Users,
  Settings,
  TrendingUp,
  LogOut,
  Menu,
  X,
  Megaphone,
} from 'lucide-react';

interface MobileHeaderProps {
  restaurantName?: string;
  email?: string;
  onLogout: () => void;
}

const navLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/settings', label: 'Settings & QR', icon: Settings },
  { href: '/admin/upsell', label: 'Upsell & Rules', icon: TrendingUp },
  { href: '/admin/promos', label: 'Promos & Ads', icon: Megaphone },
];

export default function MobileHeader({ restaurantName, email, onLogout }: MobileHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="md:hidden flex justify-between items-center px-4 py-3 bg-[#1C2333] border-b border-white/10 sticky top-0 z-30">
        <div>
          <h2 className="text-sm font-bold text-white">Growlic</h2>
          {restaurantName && (
            <span className="text-[10px] text-white/50 font-medium block">{restaurantName}</span>
          )}
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-[#2A3347] transition-colors"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {menuOpen && (
        <div className="md:hidden fixed top-[53px] inset-x-0 bottom-0 bg-[#1C2333] z-20 p-4 flex flex-col justify-between overflow-y-auto">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#C0181A] text-white'
                      : 'text-white/70 hover:bg-[#2A3347] hover:text-white'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 pt-4 border-t border-white/10">
            {email && (
              <div className="text-xs text-white/40 mb-3 px-1">{email}</div>
            )}
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 bg-[#C0181A]/10 text-[#C0181A] font-medium text-sm py-3 rounded-lg hover:bg-[#C0181A]/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}
