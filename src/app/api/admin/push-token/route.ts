import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { updatePushTokens } from '@/features/auth';

/**
 * POST /api/admin/push-token
 * Registers or updates FCM and Expo Push tokens for the authenticated restaurant.
 * 
 * Headers:
 * - Authorization: Bearer <JWT_TOKEN>
 * 
 * Request Body:
 * {
 *   "pushToken": "ExponentPushToken[wJ5RtCDGjhDkZzUW_KvOSX]",
 *   "fcmToken": "cu7qpa6SS7aUX3CIhtiDdc:APA91bGnsOLuHqkGKosmh..."
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing or invalid token' },
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    const decoded = verifyToken(token);
    if (!decoded || !decoded.restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid session or token' },
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { pushToken, fcmToken } = body;

    // 3. Update the restaurant's tokens in the DB
    // (Note: In this tenant architecture, Admin represents the Restaurant configuration)
    const updatedAdmin = await updatePushTokens(
      decoded.restaurantId,
      pushToken || null,
      fcmToken || null
    );

    if (!updatedAdmin) {
      return NextResponse.json(
        { success: false, error: 'Restaurant configuration not found' },
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Push tokens successfully registered' },
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('[API_PUSH_TOKEN] Error registering push tokens:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
