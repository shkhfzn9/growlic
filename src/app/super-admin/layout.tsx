'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { logout, hydrateAuth } from '@/redux/authSlice';
import Link from 'next/link';
import {
  LayoutDashboard,
  Store,
  Users,
  HeartPulse,
  FileSpreadsheet,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu as MenuIcon,
  X
} from 'lucide-react';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);
  
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    dispatch(hydrateAuth());
  }, [dispatch]);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        dispatch(logout());
        router.push('/admin/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const menuItems = [
    { href: '/super-admin', label: 'Overview', icon: LayoutDashboard, active: true },
    { href: '/super-admin/restaurants', label: 'Restaurants', icon: Store, active: true },
    { href: '#', label: 'Customers', icon: Users, active: false, tooltip: 'Customers: Coming in Phase 3' },
    { href: '#', label: 'Platform Health', icon: HeartPulse, active: false, tooltip: 'Platform Health: Coming in Phase 3' },
    { href: '#', label: 'Audit Log', icon: FileSpreadsheet, active: false, tooltip: 'Audit Log: Coming in Phase 3' },
    { href: '#', label: 'Settings', icon: Settings, active: false, tooltip: 'Settings: Coming in Phase 3' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F4F6F9]">
      {/* Mobile Header */}
      <header className="flex md:hidden items-center justify-between px-4 h-16 bg-[#1C2333] border-b border-white/10 text-white z-40">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight">Growlic</h1>
          <span className="bg-[#C0181A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
            Super Admin
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1 rounded-lg hover:bg-[#2A3347] transition-colors"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-[#1C2333] text-white z-35 flex flex-col justify-between p-4">
          <nav className="flex flex-col gap-1 mt-2">
            {menuItems.map((item, idx) => {
              const Icon = item.icon;
              const isActivePage = pathname === item.href || (item.href !== '/super-admin' && pathname.startsWith(item.href));

              if (!item.active) {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/40 cursor-not-allowed relative group"
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    <span className="text-[14px] font-medium">{item.label}</span>
                    <span className="ml-auto text-[10px] bg-[#2A3347] px-1.5 py-0.5 rounded text-white/50">Coming soon</span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActivePage
                      ? 'bg-[#C0181A] text-white font-semibold'
                      : 'text-white/70 hover:bg-[#2A3347] hover:text-white'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span className="text-[14px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 pt-4 flex flex-col gap-2">
            {auth.email && <div className="text-xs text-white/40 px-3">{auth.email}</div>}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg text-white/60 hover:bg-[#2A3347] hover:text-white transition-colors w-full px-3 py-2.5"
            >
              <LogOut className="w-[18px] h-[18px]" />
              <span className="text-[13px] font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between bg-[#1C2333] text-white sticky top-0 h-screen transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Brand & Role Badge */}
          <div className={`flex items-center px-4 h-16 border-b border-white/10 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
              <div className="min-w-0 flex flex-col">
                <h2 className="text-base font-bold tracking-tight text-white truncate flex items-center gap-2">
                  Growlic
                  <span className="bg-[#C0181A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    SA
                  </span>
                </h2>
                <span className="text-[10px] text-[#C0181A] font-semibold block truncate">Super Admin Portal</span>
              </div>
            )}
            {collapsed && (
              <span className="bg-[#C0181A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                SA
              </span>
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
            {menuItems.map((item, idx) => {
              const Icon = item.icon;
              const isActivePage = item.active && (pathname === item.href || (item.href !== '/super-admin' && pathname.startsWith(item.href)));

              if (!item.active) {
                return (
                  <div
                    key={idx}
                    title={collapsed ? item.tooltip : undefined}
                    className={`flex items-center gap-3 rounded-lg text-white/40 cursor-not-allowed relative group ${
                      collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                    {!collapsed && <span className="text-[14px] font-medium">{item.label}</span>}
                    
                    {/* Tooltip on Hover for disabled items */}
                    {!collapsed && (
                      <span className="absolute left-full ml-2 px-2 py-1 bg-[#111827] text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                        Coming soon
                      </span>
                    )}
                    {collapsed && (
                      <span className="absolute left-full ml-2 px-2 py-1 bg-[#111827] text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                        {item.tooltip}
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-lg transition-colors relative group ${
                    collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                  } ${
                    isActivePage
                      ? 'bg-[#C0181A] text-white font-semibold'
                      : 'text-white/70 hover:bg-[#2A3347] hover:text-white'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {!collapsed && <span className="text-[14px] font-medium">{item.label}</span>}
                  {collapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 bg-[#111827] text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className={`border-t border-white/10 p-3 ${collapsed ? 'flex flex-col items-center' : ''}`}>
          {!collapsed && auth.email && (
            <div className="text-[11px] text-white/40 truncate mb-2 px-1">{auth.email}</div>
          )}
          <button
            onClick={handleLogout}
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

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto min-h-screen">
        <div className="max-w-[1200px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
