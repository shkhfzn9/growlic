# Growlic Push Notifications & Adaptive Polling Integration Contract

This document acts as an explicit technical contract and developer guide for integrating push notifications (FCM V1) and the frontend polling system between the **React Native / Expo Mobile App** and the **Next.js Backend Server**.

---

## 1. System Architecture Overview

To minimize server load, database overhead, and mobile battery drain, the app operates on a hybrid **Push-Triggered Adaptive Polling** architecture.

```
                  +----------------------------------------------+
                  |  Customer Places Order / Triggers Staff Call |
                  +----------------------------------------------+
                                         |
                                         v
                            +--------------------------+
                            |     Next.js Backend      |
                            +--------------------------+
                                  /              \
         [FCM v1 Push Payload]   /                \  [HTTP Post]
                                v                  v
                   +------------------------+  +------------------------+
                   | Firebase Cloud Message |  |  Restaurant DB Update  |
                   +------------------------+  +------------------------+
                                |
                    [Heads-up Notification]
                                v
                   +------------------------+
                   |  Kitchen Staff Device  | <--- Wakes up & starts loop
                   +------------------------+
                                |
                                v [Active Polling Loop (5s Interval)]
                   +------------------------+
                   |  Next.js HTTP Orders   | <--- Polls while pending exist
                   +------------------------+
                                |
                    [All Orders Handled (0)]
                                v
                   +------------------------+
                   |  Loop Paused (0 load)  | <--- Standing by for next FCM
                   +------------------------+
```

---

## 2. Frontend Files & Responsibilities

| File Path | Component/Service | Responsibility |
| :--- | :--- | :--- |
| [notifications.ts](file:///f:/Myprojects/growlicApp/growlic_mobile/src/services/notifications.ts) | Core Push Service | Requests system permissions, retrieves native FCM & Expo push tokens, handles background/foreground notification events, and initializes native audio players. |
| [polling.ts](file:///f:/Myprojects/growlicApp/growlic_mobile/src/services/polling.ts) | Adaptive Polling | Manages the dynamic HTTP polling interval loop, starting and stopping fetches based on unhandled order status and incoming FCM signals. |
| [api.ts](file:///f:/Myprojects/growlicApp/growlic_mobile/src/services/api.ts) | Backend API Client | Standard HTTP client containing requests for logging in, fetching orders, updating order status, and registering device tokens. |
| [_layout.tsx](file:///f:/Myprojects/growlicApp/growlic_mobile/src/app/(tabs)/_layout.tsx) | App Core Layout | Mounts when the user logs in, synchronizes device tokens, listens for incoming push signals, and navigates staff members directly to the incoming order tab. |
| [index.tsx](file:///f:/Myprojects/growlicApp/growlic_mobile/src/app/(tabs)/index.tsx) | Orders Dashboard | Main UI for kitchen staff to accept/reject incoming orders. Triggers silence signals back to the polling client. |

---

## 3. Step-by-Step Execution Flow

### Step 1: User Logins & Permissions Check
When the user successfully logs into the app, the `TabsLayout` inside `src/app/(tabs)/_layout.tsx` mounts:
1. Calls `syncPushTokenWithBackend()` in `notifications.ts`.
2. Requests native system permissions via `requestPermissions()`.
3. If granted, fetches the Expo Push Token (`getExpoPushToken()`) and the native Android FCM Device Token (`getFCMToken()`).

### Step 2: Token Registration with Next.js Backend
The app sends a `POST` request to the backend registration route:
- **Endpoint**: `/api/admin/push-token`
- **Method**: `POST`
- **Headers**:
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer <JWT_TOKEN>"
  }
  ```
- **Payload**:
  ```json
  {
    "pushToken": "ExponentPushToken[wJ5RtCDGjhDkZzUW_KvOSX]",
    "fcmToken": "cu7qpa6SS7aUX3CIhtiDdc:APA91bGnsOLuHqkGKosmh..."
  }
  ```

### Step 3: Idle Standing-by & Polling Paused
If there are no pending orders, the polling loop in `polling.ts` remains **Paused** (`pollTimer = null`), making **0 network requests** to preserve mobile battery and backend server resources.

### Step 4: Incoming Order & FCM Send
When a customer places an order, the Next.js backend writes the order to the database and issues an **FCM V1 High-Priority Push Notification** to the admin user's registered tokens.

### Step 5: Waking Up & Active Polling Loop
1. The mobile device receives the push notification.
2. The notification listener callback inside `(tabs)/_layout.tsx` catches the event and triggers `triggerImmediatePoll()`.
3. The app fetches the new order, starts the ringing alarm, and starts a fast polling loop (`POLL_INTERVAL = 5000ms`).

### Step 6: Order Acceptance & Auto-Silence
When a kitchen staff member taps **Accept** or **Reject** in the UI:
1. The app posts the status update to `/api/admin/orders/:id`.
2. The app calls `silenceAlarm(remainingPendingCount)`.
3. If other pending orders exist, the alarm continues. If `remainingPendingCount === 0`, the alarm player stops and the polling loop is placed back to sleep.

---

## 4. Next.js Backend API Implementation Specifications

To support this architecture, the backend developer must implement the following three modules:

### A. Database Model Update (MongoDB / Mongoose Example)
Add fields to store Expo and FCM tokens on the `AdminUser` or `Restaurant` model:
```typescript
import mongoose from 'mongoose';

const RestaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  // Push Notification fields
  expoPushToken: { type: String, default: null },
  fcmToken: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now }
});

export const Restaurant = mongoose.models.Restaurant || mongoose.model('Restaurant', RestaurantSchema);
```

### B. Push Token Registration Route (`POST /api/admin/push-token`)
Ensure the response content type is strictly set to `application/json`.
```typescript
// src/app/api/admin/push-token/route.ts
import { NextResponse } from 'next/server';
import { Restaurant } from '@/models/Restaurant';
import { verifyAuthToken } from '@/lib/auth'; // Custom JWT validation helper

export async function POST(req: Request) {
  try {
    const authUser = await verifyAuthToken(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { pushToken, fcmToken } = await req.json();

    // Link FCM and Expo Push Tokens to the authenticated Restaurant Tenant
    await Restaurant.updateOne(
      { _id: authUser.restaurantId },
      { 
        $set: { 
          expoPushToken: pushToken, 
          fcmToken: fcmToken,
          updatedAt: new Date() 
        } 
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

### C. FCM V1 Server Push Dispatch Payload
When sending push messages from the Next.js server using the official Google FCM V1 HTTP API (`https://fcm.googleapis.com/v1/projects/growlic/messages:send`):

#### 1. Incoming Order Payload
```json
{
  "message": {
    "token": "<RESTAURANT_FCM_TOKEN>",
    "android": {
      "priority": "high",
      "ttl": "0s",
      "notification": {
        "title": "New Order Received! 🍽️",
        "body": "Table T-3 placed an order for ₹450",
        "channel_id": "orders",
        "sound": "alarm"
      }
    },
    "data": {
      "channelId": "orders",
      "type": "new_order"
    }
  }
}
```

#### 2. Staff Call Payload
```json
{
  "message": {
    "token": "<RESTAURANT_FCM_TOKEN>",
    "android": {
      "priority": "high",
      "ttl": "0s",
      "notification": {
        "title": "Staff Call Requested! 🔔",
        "body": "Table T-3 needs assistance",
        "channel_id": "staff-calls",
        "sound": "default"
      }
    },
    "data": {
      "channelId": "staff-calls",
      "type": "staff_call"
    }
  }
}
```

---

## 5. Critical Integration Rules (No-Clash Checklist)

1. **Strict Channel Mapping**: The backend MUST pass `"channel_id": "orders"` for orders and `"channel_id": "staff-calls"` for staff requests. The Android device relies on these exact IDs to bind the custom alarm audio (`alarm.wav`) and high importance screen wake options.
2. **Strict Sound Property**: In FCM payloads, set `"sound": "alarm"` (omit the `.wav` extension). Android resolves this to the compiled `alarm.wav` resource.
3. **Strict JSON Responses**: Every backend endpoint API response must set `headers: { 'Content-Type': 'application/json' }`. Returning raw HTML/text error pages on 404 or 500 causes frontend parsing crashes.

---

## 6. Android Auto-Open & Background Wake Specs (Swiggy / Zomato Behavior)

To force the device to wake up, ring continuously, and open the app instantly when a new order arrives (even if locked or not in the background), the following settings are pre-configured or require device-level approval:

### A. Android Manifest Permissions (Pre-Configured)
The app requests high-priority permissions in `app.json`:
- `USE_FULL_SCREEN_INTENT`: Enables notifications to display full-screen activities on top of the lock screen (essential for incoming orders).
- `WAKE_LOCK`: Allows the device CPU to wake up when receiving an FCM push notification.
- `FOREGROUND_SERVICE`: Ensures background audio playing remains active and uninterruptible.

### B. Device Setup Guide (Required for Physical Devices)
For the auto-open behavior to function reliably on Android 10+:
1. **Disable Battery Optimization**:
   - Go to app settings -> Battery -> Set to **Unrestricted** (prevents the OS from putting the app's background listener to sleep).
2. **Allow Display Over Other Apps (Draw Overlay)**:
   - Grant the **Draw over other apps** permission in Android system settings. This permits the app to launch into the foreground immediately upon notification receipt.
3. **Keep Notification Channel Active**:
   - Ensure the `orders` notification channel in Android Settings is set to **Highest Importance** with **Show as pop-up** enabled.

