import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { handleRouteError } from '@/lib/errors';

/**
 * REST API Endpoint to clear the active admin's cookie session ('admin_token').
 * 
 * @returns JSON Response indicating success status or error message.
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('admin_token');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
