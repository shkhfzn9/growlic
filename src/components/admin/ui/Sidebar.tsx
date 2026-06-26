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
  PanelLeftClose,
  PanelLeftOpen,
  Megaphone,
} from 'lucide-react';

interface SidebarProps {
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

export default function Sidebar({ restaurantName, email, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden md:flex flex-col justify-between bg-[#1C2333] text-white sticky top-0 h-screen transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Brand */}
        <div className={`flex items-center px-4 h-16 border-b border-white/10 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-white truncate">Growlic</h2>
              {restaurantName && (
                <span className="text-[11px] text-white/50 font-medium block truncate">{restaurantName}</span>
              )}
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-[#2A3347] text-white/60 hover:text-white transition-colors flex-shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-3 mt-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : undefined}
                className={`flex items-center gap-3 rounded-lg transition-colors relative group ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-[#C0181A] text-white font-semibold'
                    : 'text-white/70 hover:bg-[#2A3347] hover:text-white'
                }`}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span className="text-[14px] font-medium">{link.label}</span>}
                {collapsed && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-[#111827] text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                    {link.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className={`border-t border-white/10 p-3 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {!collapsed && email && (
          <div className="text-[11px] text-white/40 truncate mb-2 px-1">{email}</div>
        )}
        <button
          onClick={onLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`flex items-center gap-2 rounded-lg text-white/60 hover:bg-[#2A3347] hover:text-white transition-colors w-full ${
            collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
          }`}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
