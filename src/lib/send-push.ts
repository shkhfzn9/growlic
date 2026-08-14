import { fcm } from './firebase-admin';
import { removeStaleFcmToken } from '@/features/auth/repository';

/** Firebase error codes that mean the token is permanently invalid and must be cleared. */
const STALE_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered', // Uninstall / data clear / token rotation
  'messaging/invalid-registration-token',        // Malformed token
  'messaging/invalid-argument',                  // Token format rejected by FCM
]);

/**
 * Removes a dead FCM token from the database so future pushes skip it cleanly
 * instead of repeatedly failing with NotRegistered errors.
 */
async function clearStaleToken(restaurantId: string, staleToken: string): Promise<void> {
  try {
    await removeStaleFcmToken(restaurantId, staleToken);
    console.log(`[FCM-SEND] Stale token "${staleToken.substring(0, 15)}..." removed for restaurant "${restaurantId}".`);
  } catch (err) {
    console.error('[FCM-SEND] Failed to clear stale token from DB:', err);
  }
}

/**
 * Returns true if the FCM error code indicates a permanently dead token.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isStaleTokenError(error: any): boolean {
  return STALE_TOKEN_CODES.has(error?.errorInfo?.code);
}

/**
 * Sends a high-priority FCM v1 notification to kitchen staff for a new customer order.
 * Wakes up all active devices, sounds the 'alarm' audio channel, and triggers fast polling.
 *
 * @param fcmTokenInput Single token string or array of tokens registered for the restaurant.
 * @param orderDetails  Order information containing table ID, total amount, and ID.
 * @param restaurantId  The restaurant slug — used to clear stale tokens from DB.
 */
export async function sendNewOrderPush(
  fcmTokenInput: string | string[],
  orderDetails: any,
  restaurantId?: string
) {
  const rawTokens = Array.isArray(fcmTokenInput) ? fcmTokenInput : [fcmTokenInput];
  const tokens = Array.from(new Set(rawTokens.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)));

  if (tokens.length === 0) {
    console.warn('[FCM-SEND] sendNewOrderPush aborted: No valid FCM tokens provided.');
    return null;
  }

  const results = await Promise.allSettled(
    tokens.map(async (token) => {
      const message = {
        token,
        notification: {
          title: 'New Order Received! 🍽️',
          body: `Table ${orderDetails.tableId || 'N/A'} placed an order for ₹${orderDetails.total || 0}`,
        },
        android: {
          priority: 'high' as const,
          ttl: 0, // Deliver immediately, do not cache stale order alerts
          notification: {
            channelId: 'orders',
            sound: 'alarm',
          },
        },
        data: {
          channelId: 'orders',
          type: 'new_order',
          orderId: String(orderDetails._id || ''),
        },
      };

      try {
        const response = await fcm.send(message);
        console.log(`[FCM-SEND] Successfully sent new order push to token (${token.substring(0, 15)}...):`, response);
        return response;
      } catch (error) {
        if (isStaleTokenError(error)) {
          console.warn(`[FCM-SEND] NotRegistered — token (${token.substring(0, 15)}...) is stale. Clearing from DB.`);
          if (restaurantId) await clearStaleToken(restaurantId, token);
          return null;
        }
        console.error(`[FCM-SEND] Error dispatching new order push to token (${token.substring(0, 15)}...):`, error);
        throw error;
      }
    })
  );

  return results;
}

/**
 * Sends a high-priority FCM v1 notification to kitchen staff when a table calls for assistance.
 * Wakes up all active devices and triggers the 'staff-calls' notification channel.
 *
 * @param fcmTokenInput Single token string or array of tokens registered for the restaurant.
 * @param tableDetails  Table information containing table ID.
 * @param restaurantId  The restaurant slug — used to clear stale tokens from DB.
 */
export async function sendStaffCallPush(
  fcmTokenInput: string | string[],
  tableDetails: any,
  restaurantId?: string
) {
  const rawTokens = Array.isArray(fcmTokenInput) ? fcmTokenInput : [fcmTokenInput];
  const tokens = Array.from(new Set(rawTokens.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)));

  if (tokens.length === 0) {
    console.warn('[FCM-SEND] sendStaffCallPush aborted: No valid FCM tokens provided.');
    return null;
  }

  const results = await Promise.allSettled(
    tokens.map(async (token) => {
      const message = {
        token,
        notification: {
          title: 'Staff Call Requested! 🔔',
          body: `Table ${tableDetails.tableId || 'N/A'} needs assistance`,
        },
        android: {
          priority: 'high' as const,
          ttl: 0,
          notification: {
            channelId: 'staff-calls',
            sound: 'default',
          },
        },
        data: {
          channelId: 'staff-calls',
          type: 'staff_call',
          tableId: String(tableDetails.tableId || ''),
        },
      };

      try {
        const response = await fcm.send(message);
        console.log(`[FCM-SEND] Successfully sent staff call push to token (${token.substring(0, 15)}...):`, response);
        return response;
      } catch (error) {
        if (isStaleTokenError(error)) {
          console.warn(`[FCM-SEND] NotRegistered — token (${token.substring(0, 15)}...) is stale. Clearing from DB.`);
          if (restaurantId) await clearStaleToken(restaurantId, token);
          return null;
        }
        console.error(`[FCM-SEND] Error dispatching staff call push to token (${token.substring(0, 15)}...):`, error);
        throw error;
      }
    })
  );

  return results;
}
