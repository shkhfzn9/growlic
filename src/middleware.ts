import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'growlic_secret_key_12345';

async function verifyTokenEdge(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const keyData = encoder.encode(secret);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert base64url to Uint8Array signature
    const padSig = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const sigBinary = atob(padSig);
    const sigBytes = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) {
      sigBytes[i] = sigBinary.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      data
    );

    if (!isValid) return null;

    const padPayload = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(padPayload);
    const payload = JSON.parse(payloadJson);

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('admin_token')?.value;

  // 1. Super Admin Route Protection: /super-admin/**
  if (pathname.startsWith('/super-admin')) {
    if (!token) {
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    const decoded = await verifyTokenEdge(token, JWT_SECRET);
    if (!decoded || decoded.role !== 'super_admin') {
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // 2. Restaurant Admin Route Protection: /admin/** (excluding login, register)
  const isAuthPage = pathname === '/admin/login' || pathname === '/admin/register';
  if (pathname.startsWith('/admin') && !isAuthPage) {
    if (!token) {
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    const decoded = await verifyTokenEdge(token, JWT_SECRET);
    if (!decoded) {
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // A super admin is NOT allowed to access individual restaurant admin routes
    if (decoded.role === 'super_admin') {
      return NextResponse.redirect(new URL('/super-admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*'],
};
