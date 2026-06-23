import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { handleRouteError } from '@/shared/errors';
import { verifyToken } from '@/lib/auth';
import { revokeSession } from '@/features/auth';

/**
 * REST API Endpoint to clear the active admin's cookie session ('admin_token') and revoke in DB.
 * 
 * @returns JSON Response indicating success status or error message.
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        await revokeSession(decoded.restaurantId, token);
      }
    }

    cookieStore.delete('admin_token');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
