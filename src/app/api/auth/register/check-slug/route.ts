import { NextResponse } from 'next/server';
import { getAdminByRestaurantId } from '@/features/auth';
import { handleRouteError, ValidationError } from '@/shared/errors';

/**
 * REST API Endpoint to check if a restaurant URL slug ID is available for registration.
 * 
 * @param req Standard Next.js Request object containing search parameters.
 * @returns JSON Response indicating availability.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug')?.trim();

    if (!slug) {
      throw new ValidationError('Slug query parameter is required');
    }

    // Enforce slug character constraints strictly
    const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    if (sanitizedSlug !== slug.toLowerCase()) {
      return NextResponse.json({
        success: true,
        available: false,
        message: 'Invalid slug characters. Only alphanumeric characters and hyphens are allowed.',
      });
    }

    const admin = await getAdminByRestaurantId(sanitizedSlug);

    return NextResponse.json({
      success: true,
      available: !admin,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
