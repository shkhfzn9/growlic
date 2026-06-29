import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authenticateAdmin } from '@/features/auth';
import { handleRouteError } from '@/shared/errors';

// Simple in-memory rate limiting store
const rateLimitMap = new Map<string, { attempts: number; resetTime: number }>();
const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, { attempts: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (now > record.resetTime) {
    rateLimitMap.set(ip, { attempts: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  record.attempts += 1;
  return record.attempts > RATE_LIMIT_ATTEMPTS;
}

/**
 * REST API Endpoint to authenticate an admin using email/password.
 * Sets the 'admin_token' httpOnly session cookie and returns admin metadata.
 * Delegates errors to handleRouteError.
 * 
 * @param req Standard Request object containing JSON payload with email and password.
 * @returns JSON Response indicating success status or error message.
 */
export async function POST(req: Request) {
  try {
    // 1. Enforce IP-based rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const { email, password } = await req.json();

    const { admin, token } = await authenticateAdmin(email, password);

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
