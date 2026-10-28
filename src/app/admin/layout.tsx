'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { logout } from '@/redux/authSlice';
import { Sidebar, MobileHeader } from '@/components/layout';
import { OrderNotificationProvider } from '@/components/providers';
import PwaInstallBanner from '@/components/pwa/PwaInstallBanner';
import { clearCustomerCache } from '@/features/order/services/customerPosCache';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname === '/admin/login' || pathname === '/admin/register') {
    return (
      <>
        <PwaInstallBanner
          appName="Growlic Admin"
          manifestPath="/api/manifest/admin"
          themeColor="#C0181A"
        />
        {children}
      </>
    );
  }

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        clearCustomerCache();
        dispatch(logout());
        router.push('/admin/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <OrderNotificationProvider>
      <PwaInstallBanner
        appName="Growlic Admin"
        manifestPath="/api/manifest/admin"
        themeColor="#C0181A"
      />
      <div className="flex flex-col md:flex-row min-h-screen bg-[#F4F6F9]">
        <MobileHeader
          restaurantName={mounted ? (auth.restaurantName || undefined) : undefined}
          email={mounted ? (auth.email || undefined) : undefined}
          onLogout={handleLogout}
        />
        <Sidebar
          restaurantName={mounted ? (auth.restaurantName || undefined) : undefined}
          email={mounted ? (auth.email || undefined) : undefined}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-3 sm:p-4 md:p-8 overflow-y-auto min-h-[calc(100vh-53px)] md:min-h-screen max-w-full overflow-x-hidden">
          <div className="max-w-[1200px] mx-auto w-full">{children}</div>
        </main>
      </div>
    </OrderNotificationProvider>
  );
}
