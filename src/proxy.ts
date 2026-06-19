import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;
  const { pathname } = request.nextUrl;

  // Protect all /admin routes except login and register pages
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && pathname !== '/admin/register') {
    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      // Optional: Redirect back after login
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Ensure the proxy runs only on /admin pages
export const config = {
  matcher: ['/admin/:path*'],
};
