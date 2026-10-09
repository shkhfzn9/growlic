import { NextRequest, NextResponse } from 'next/server';
import { seedDatabase } from '@/shared/seedService';
import { handleRouteError, AuthenticationError } from '@/shared/errors';
import { getAuthFromRequest } from '@/lib/auth';

/**
 * REST API Endpoint to clear the database rules/transactions and insert a default seeded dataset.
 * Requires super-admin session and is disabled in production mode.
 * 
 * @returns JSON Response containing details and document counts of seeded schemas.
 */
export async function GET(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production' || req.headers.get('x-test-node-env') === 'production') {
      return NextResponse.json(
        { success: false, error: 'Seeding route is disabled in production' },
        { status: 403 }
      );
    }

    const auth = getAuthFromRequest(req);
    if (!auth || auth.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Requires super-admin session' },
        { status: 401 }
      );
    }

    const result = await seedDatabase();
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

