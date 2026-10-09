import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authenticateAdmin } from '@/features/auth';
import { handleRouteError } from '@/shared/errors';
import { checkAndIncrementRateLimit, clearRateLimit } from '@/lib/rateLimiter';

/**
 * REST API Endpoint to authenticate an admin using email/password.
 * Performs throttling per IP and per account (email) using Mongo TTL store.
 * Sets the 'admin_token' httpOnly session cookie and returns admin metadata.
 * Delegates errors to handleRouteError.
 * 
 * @param req Standard Request object containing JSON payload with email and password.
 * @returns JSON Response indicating success status or error message.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').toString().toLowerCase().trim();
    const password = body.password;

    const ipHeader = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const ip = ipHeader.split(',')[0].trim();

    // 1. Enforce IP and Account rate limiting in Mongo TTL shared store
    const ipLimitKey = `login:ip:${ip}`;
    const accountLimitKey = email ? `login:account:${email}` : `login:account:empty`;

    // Max 5 login attempts per 60 seconds
    const ipLimit = await checkAndIncrementRateLimit(ipLimitKey, 5, 60);
    const accountLimit = email ? await checkAndIncrementRateLimit(accountLimitKey, 5, 60) : { allowed: true };

    if (!ipLimit.allowed || !accountLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { admin, token } = await authenticateAdmin(email, password);

    // Clear account rate limit on successful authentication
    if (email) {
      await clearRateLimit(accountLimitKey).catch(() => {});
    }

    const cookieStore = await cookies();
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      token,
      restaurantId: admin.restaurantId,
      restaurantName: admin.restaurantName,
      email: admin.email,
      role: admin.role,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
