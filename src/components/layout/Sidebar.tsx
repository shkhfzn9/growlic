'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { getRestaurantDetails } from '@/actions/auth';
import { getVocabulary } from '@/config/businessVocabulary';
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
  Code2,
  ClipboardList,
  Wallet,
  Percent,
  Calendar,
  Boxes,
  BarChart3,
} from 'lucide-react';

interface SidebarProps {
  restaurantName?: string;
  email?: string;
  onLogout: () => void;
}

const navLinks = [
  { href: '/admin/appointments', label: 'Bookings & Schedule', icon: Calendar },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/pnl', label: 'Profit & Loss', icon: BarChart3 },
  { href: '/admin/inventory', label: 'Inventory & Analytics', icon: Boxes },
  { href: '/admin/expense', label: 'Expense Tracker', icon: Wallet },
  { href: '/admin/discounts', label: 'Discounts & Offers', icon: Percent },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/sop-tracker', label: 'SOP & Staff', icon: ClipboardList },
  { href: '/admin/settings', label: 'Settings & QR', icon: Settings },
  { href: '/admin/upsell', label: 'Upsell & Rules', icon: TrendingUp },
  { href: '/admin/promos', label: 'Promos & Ads', icon: Megaphone },
  { href: '/admin/developer-promo', label: 'Developer Promo', icon: Code2 },
];

export default function Sidebar({ restaurantName, email, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const auth = useSelector((state: RootState) => state.auth);
  const navRef = useRef<HTMLElement>(null);

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [businessCategory, setBusinessCategory] = useState<string>(() => {
    return auth.businessCategory || 'restaurant';
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('growlic_sidebar_collapsed');
      if (saved !== null) {
        setCollapsed(saved === 'true');
      }
    }
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('growlic_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        const details = await getRestaurantDetails();
        if (details?.businessCategory) {
          setBusinessCategory(details.businessCategory);
        } else if (details?.themePreset === 'rose_quartz' || details?.themePreset === 'velvet_noir') {
          setBusinessCategory('salon');
        } else if (details?.themePreset === 'carbon_crimson' || details?.themePreset === 'cyber_cyan') {
          setBusinessCategory('detailing');
        }
      } catch (err) {
        // Quiet fallback
      }
    };

    fetchBusinessInfo();
  }, []);

  const vocab = getVocabulary(businessCategory);

  const filteredNavLinks = navLinks.filter((link) => {
    if (link.href === '/admin/appointments' && businessCategory === 'restaurant') {
      return false;
    }
    return true;
  });

  const getLinkLabel = (link: { href: string; label: string }) => {
    if (link.href === '/admin/menu') return vocab.itemsNoun;
    if (link.href === '/admin/orders') return vocab.ordersNoun;
    if (link.href === '/admin/settings') return `Settings & ${vocab.tableNoun.split(' ')[0] || 'QR'}`;
    return link.label;
  };

  // Identify the primary operational hub (Orders / Appointments)
  const primaryHref = businessCategory === 'salon' ? '/admin/appointments' : '/admin/orders';
  const primaryLink = filteredNavLinks.find((l) => l.href === primaryHref) || filteredNavLinks[0];
  const secondaryNavLinks = filteredNavLinks.filter((l) => l.href !== primaryLink?.href);

  const isPrimaryActive =
    primaryLink &&
    (pathname === primaryLink.href || pathname.startsWith(`${primaryLink.href}/`));
  const primaryLabel = primaryLink ? getLinkLabel(primaryLink) : 'Orders';
  const PrimaryIcon = primaryLink ? primaryLink.icon : ShoppingCart;

  return (
    <aside
      className={`hidden md:flex flex-col justify-between bg-[#1C2333] text-white sticky top-0 h-screen transition-all duration-200 z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand */}
        <div className={`flex items-center px-4 h-16 border-b border-white/10 ${collapsed ? 'justify-center' : 'justify-between'} shrink-0`}>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold tracking-tight text-white truncate">Growlic</h2>
                <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none shrink-0">Beta</span>
              </div>
              {mounted && restaurantName && (
                <span className="text-[11px] text-white/50 font-medium block truncate">{restaurantName}</span>
              )}
            </div>
          )}
          <button
            onClick={handleToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-[#2A3347] text-white/60 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Pinned Primary Operational Hub (Orders & Kitchen Analytics) - NEVER scrolls out of view */}
        {primaryLink && (
          <div className="p-3 pb-2 shrink-0 border-b border-white/10">
            <Link
              href={primaryLink.href}
              title={collapsed ? primaryLabel : undefined}
              className={`flex items-center gap-3 rounded-lg transition-colors relative group ${
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
              } ${
                isPrimaryActive
                  ? 'bg-[#C0181A] text-white font-semibold shadow-xs'
                  : 'text-white/80 hover:bg-[#2A3347] hover:text-white'
              }`}
            >
              <PrimaryIcon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && (
                <span className="text-[14px] font-semibold tracking-tight truncate">
                  {primaryLabel}
                </span>
              )}
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-[#111827] text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                  {primaryLabel}
                </span>
              )}
            </Link>
          </div>
        )}

        {/* Secondary Management Navigation - Scrollable */}
        <nav
          ref={navRef}
          className="flex flex-col gap-1 p-3 mt-1 overflow-y-auto flex-1 min-h-0 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]"
        >
          {secondaryNavLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;
            const label = getLinkLabel(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-lg transition-colors relative group ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-[#C0181A] text-white font-semibold'
                    : 'text-white/70 hover:bg-[#2A3347] hover:text-white'
                }`}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span className="text-[14px] font-medium">{label}</span>}
                {collapsed && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-[#111827] text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className={`border-t border-white/10 p-3 shrink-0 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {!collapsed && email && (
          <div className="text-[11px] text-white/40 truncate mb-2 px-1">{email}</div>
        )}
        <button
          onClick={onLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`flex items-center gap-2 rounded-lg text-white/60 hover:bg-[#2A3347] hover:text-white transition-colors w-full cursor-pointer ${
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
