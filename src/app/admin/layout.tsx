'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { logout } from '@/redux/authSlice';
import { Sidebar, MobileHeader } from '@/components/admin/ui';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);

  if (pathname === '/admin/login' || pathname === '/admin/register') {
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F4F6F9]">
      <MobileHeader
        restaurantName={auth.restaurantName || undefined}
        email={auth.email || undefined}
        onLogout={handleLogout}
      />
      <Sidebar
        restaurantName={auth.restaurantName || undefined}
        email={auth.email || undefined}
        onLogout={handleLogout}
      />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto min-h-screen">
        <div className="max-w-[1200px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
