import { fcm } from './firebase-admin';
import { updatePushTokens } from '@/features/auth/repository';

/** Firebase error codes that mean the token is permanently invalid and must be cleared. */
const STALE_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered', // Uninstall / data clear / token rotation
  'messaging/invalid-registration-token',        // Malformed token
  'messaging/invalid-argument',                  // Token format rejected by FCM
]);

/**
 * Clears a dead FCM token from the database so future pushes are skipped cleanly
 * instead of repeatedly failing with NotRegistered errors.
 */
async function clearStaleToken(restaurantId: string): Promise<void> {
  try {
    await updatePushTokens(restaurantId, null, null);
    console.log(`[FCM-SEND] Stale token cleared for restaurant "${restaurantId}". App must re-login to re-register.`);
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
 * Wakes up the app, sounds the 'alarm' audio channel, and triggers fast polling.
 *
 * If FCM responds with NotRegistered, the dead token is automatically removed from the DB.
 *
 * @param fcmToken      The registration token of the target device.
 * @param orderDetails  Order information containing table ID, total amount, and ID.
 * @param restaurantId  The restaurant slug — used to clear stale tokens from DB.
 */
export async function sendNewOrderPush(fcmToken: string, orderDetails: any, restaurantId?: string) {
  if (!fcmToken) {
    console.warn('[FCM-SEND] sendNewOrderPush aborted: Empty FCM token.');
    return null;
  }

  const message = {
    token: fcmToken,
    android: {
      priority: 'high' as const,
      ttl: 0, // Deliver immediately, do not cache stale order alerts
    },
    data: {
      channelId: 'orders',
      type: 'new_order',
      orderId: String(orderDetails._id || ''),
      title: 'New Order Received! 🍽️',
      body: `Table ${orderDetails.tableId || 'N/A'} placed an order for ₹${orderDetails.total || 0}`,
    },
  };

  try {
    const response = await fcm.send(message);
    console.log('[FCM-SEND] Successfully sent new order push:', response);
    return response;
  } catch (error) {
    if (isStaleTokenError(error)) {
      console.warn('[FCM-SEND] NotRegistered — token is stale. Clearing from DB.');
      if (restaurantId) await clearStaleToken(restaurantId);
      return null; // Silently handled — not a system error
    }
    console.error('[FCM-SEND] Error dispatching new order push:', error);
    throw error;
  }
}

/**
 * Sends a high-priority FCM v1 notification to kitchen staff when a table calls for assistance.
 * Wakes up the app and triggers the 'staff-calls' notification channel.
 *
 * If FCM responds with NotRegistered, the dead token is automatically removed from the DB.
 *
 * @param fcmToken      The registration token of the target device.
 * @param tableDetails  Table information containing table ID.
 * @param restaurantId  The restaurant slug — used to clear stale tokens from DB.
 */
export async function sendStaffCallPush(fcmToken: string, tableDetails: any, restaurantId?: string) {
  if (!fcmToken) {
    console.warn('[FCM-SEND] sendStaffCallPush aborted: Empty FCM token.');
    return null;
  }

  const message = {
    token: fcmToken,
    android: {
      priority: 'high' as const,
      ttl: 0,
    },
    data: {
      channelId: 'staff-calls',
      type: 'staff_call',
      tableId: String(tableDetails.tableId || ''),
      title: 'Staff Call Requested! 🔔',
      body: `Table ${tableDetails.tableId || 'N/A'} needs assistance`,
    },
  };

  try {
    const response = await fcm.send(message);
    console.log('[FCM-SEND] Successfully sent staff call push:', response);
    return response;
  } catch (error) {
    if (isStaleTokenError(error)) {
      console.warn('[FCM-SEND] NotRegistered — token is stale. Clearing from DB.');
      if (restaurantId) await clearStaleToken(restaurantId);
      return null; // Silently handled — not a system error
    }
    console.error('[FCM-SEND] Error dispatching staff call push:', error);
    throw error;
  }
}
