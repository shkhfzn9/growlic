import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authenticateAdmin } from '@/features/auth';
import { handleRouteError } from '@/shared/errors';

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
