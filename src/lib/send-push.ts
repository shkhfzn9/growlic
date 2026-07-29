import { fcm } from './firebase-admin';

/**
 * Sends a high-priority FCM v1 notification to kitchen staff for a new customer order.
 * Wakes up the app, sounds the 'alarm' audio channel, and triggers fast polling.
 * 
 * @param fcmToken The registration token of the target device.
 * @param orderDetails Order information containing table ID, total amount, and ID.
 */
export async function sendNewOrderPush(fcmToken: string, orderDetails: any) {
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
    console.error('[FCM-SEND] Error dispatching new order push:', error);
    throw error;
  }
}

/**
 * Sends a high-priority FCM v1 notification to kitchen staff when a table calls for assistance.
 * Wakes up the app and triggers the 'staff-calls' notification channel.
 * 
 * @param fcmToken The registration token of the target device.
 * @param tableDetails Table information containing table ID.
 */
export async function sendStaffCallPush(fcmToken: string, tableDetails: any) {
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
    console.error('[FCM-SEND] Error dispatching staff call push:', error);
    throw error;
  }
}
