import { NextResponse } from 'next/server';
import { seedDatabase } from '@/services/seedService';
import { handleRouteError } from '@/lib/errors';

/**
 * REST API Endpoint to clear the database rules/transactions and insert a default seeded dataset.
 * Delegates executing seeding logic to seedService and response serialization errors to handleRouteError.
 * 
 * @returns JSON Response containing details and document counts of seeded schemas.
 */
export async function GET() {
  try {
    const result = await seedDatabase();
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
