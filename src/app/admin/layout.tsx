'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { logout } from '@/redux/authSlice';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);
  const [menuOpen, setMenuOpen] = useState(false);

  // Auto-close menu when path changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // If login page, don't show admin layout wrapper
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

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

  const navLinks = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/orders', label: 'Orders' },
    { href: '/admin/menu', label: 'Menu' },
    { href: '/admin/customers', label: 'Customers' },
    { href: '/admin/settings', label: 'Settings & QR' },
    { href: '/admin/upsell', label: 'Upsell & Rules' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white text-black font-mono-custom">
      {/* Mobile Top Navigation Header */}
      <header className="md:hidden flex justify-between items-center p-4 border-b border-black bg-white sticky top-0 z-30">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-tight">Growlic Admin</h2>
          {auth.restaurantName && (
            <span className="text-[9px] uppercase block mt-0.5 font-bold bg-black text-white px-1.5 py-0.2 w-fit">
              {auth.restaurantName}
            </span>
          )}
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="border border-black px-2.5 py-1 text-xs font-bold uppercase bg-white hover:bg-black hover:text-white transition-all cursor-pointer"
        >
          {menuOpen ? '[ CLOSE ]' : '[ MENU ]'}
        </button>
      </header>

      {/* Mobile Nav Overlay Menu */}
      {menuOpen && (
        <div className="md:hidden fixed top-[57px] inset-x-0 bottom-0 bg-white z-20 border-b border-black p-6 flex flex-col justify-between overflow-y-auto">
          <div className="flex flex-col gap-6">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-xs uppercase border border-black px-3 py-2 font-bold cursor-pointer transition-colors block text-left ${
                      isActive ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-col gap-3 mt-8 pt-4 border-t border-black">
            <div className="text-[10px] text-zinc-500 uppercase">
              Role: Admin
              <br />
              {auth.email}
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-xs font-bold uppercase border border-black px-3 py-2 bg-white text-black hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              [ LOGOUT ]
            </button>
          </div>
        </div>
      )}

      {/* Sidebar / Left Column Nav (Desktop) */}
      <aside className="hidden md:flex w-full md:w-64 border-b md:border-b-0 md:border-r border-black p-6 flex-col justify-between shrink-0">
        <div className="flex flex-col gap-6">
          {/* Logo / Header */}
          <div className="border-b-2 border-black pb-4">
            <h2 className="text-xl font-bold uppercase tracking-tight">Growlic Admin</h2>
            {auth.restaurantName && (
              <span className="text-[10px] uppercase block mt-1 font-bold bg-black text-white px-2 py-0.5 w-fit">
                {auth.restaurantName}
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs uppercase border border-black px-3 py-2 font-bold cursor-pointer transition-colors block text-left ${
                    isActive ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Info & Logout */}
        <div className="flex flex-col gap-3 mt-8 pt-4 border-t border-black">
          <div className="text-[10px] text-zinc-500 uppercase overflow-hidden text-ellipsis">
            Role: Admin
            <br />
            {auth.email}
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-xs font-bold uppercase border border-black px-3 py-2 bg-white text-black hover:bg-black hover:text-white transition-colors cursor-pointer"
          >
            [ LOGOUT ]
          </button>
        </div>
      </aside>

      {/* Main content right pane */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
