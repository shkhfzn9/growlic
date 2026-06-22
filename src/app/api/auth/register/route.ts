import { NextResponse } from 'next/server';
import { registerRestaurant } from '@/features/auth';
import { handleRouteError } from '@/shared/errors';

/**
 * REST API Endpoint to register a new restaurant owner profile.
 * Automatically triggers onboarding seeding for menu, discounts, pairings, and combos.
 * Delegates errors to handleRouteError.
 * 
 * @param req Standard Request object containing JSON registration parameters.
 * @returns JSON Response indicating success status.
 */
export async function POST(req: Request) {
  try {
    const { restaurantName, restaurantId, email, password, phone, designation } = await req.json();

    const newAdmin = await registerRestaurant({
      restaurantName,
      restaurantId,
      email,
      password,
      phone,
      designation,
    });

    return NextResponse.json({
      success: true,
      message: 'Restaurant registered and default starter menu seeded successfully!',
      restaurantId: newAdmin.restaurantId,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
