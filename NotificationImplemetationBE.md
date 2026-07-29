# Growlic Push Notifications Backend Implementation Documentation

This document describes the backend implementation for the FCM (Firebase Cloud Messaging) Push Notification and Adaptive Polling contract on the Next.js backend server.

---

## 1. Environment & Credentials Setup

A `.env.local` file has been configured at the project root with the location of the Google Service Account credentials:

```bash
GOOGLE_APPLICATION_CREDENTIALS="./credentials/growlic-firebase-adminsdk-fbsvc-5e6398731d.json"
```

The Firebase SDK `credential.applicationDefault()` automatically loads this variable to authenticate calls to the Firebase API.

---

## 2. Database Schema Updates

The Mongoose models have been updated to support storing token information for each restaurant tenant. Since Growlic implements a multi-tenant design where restaurant settings are scoped to the `Admin` model (with `role: 'owner'`), the following files were updated:

### 2.1 Interface & Types
- **[`src/features/auth/types.ts`](file:///f:/Myprojects/growlic/src/features/auth/types.ts)**:
  Added `expoPushToken` and `fcmToken` optional properties to the `IAdmin` interface:
  ```typescript
  export interface IAdmin {
    // ...
    expoPushToken?: string | null;
    fcmToken?: string | null;
  }
  ```

- **[`src/features/auth/model.ts`](file:///f:/Myprojects/growlic/src/features/auth/model.ts)**:
  Added fields to the `IAdminDocument` Mongoose model interface:
  ```typescript
  export interface IAdminDocument extends Document {
    // ...
    expoPushToken?: string | null;
    fcmToken?: string | null;
  }
  ```

### 2.2 Mongoose Schema Definitions
- **[`src/features/auth/model.ts`](file:///f:/Myprojects/growlic/src/features/auth/model.ts)**:
  Updated the `AdminSchema` definition:
  ```typescript
  expoPushToken: { type: String, default: null },
  fcmToken: { type: String, default: null },
  ```

### 2.3 Repository & Services Mapping
- **[`src/features/auth/repository.ts`](file:///f:/Myprojects/growlic/src/features/auth/repository.ts)**:
  - Updated the `normalizeAdmin` function to map `expoPushToken` and `fcmToken` from the document.
  - Implemented the database update helper:
    ```typescript
    export async function updatePushTokens(
      restaurantId: string,
      expoPushToken: string | null,
      fcmToken: string | null
    ): Promise<IAdmin | null> {
      await dbConnect();
      const doc = await Admin.findOneAndUpdate(
        { restaurantId: restaurantId.toLowerCase() },
        {
          $set: {
            expoPushToken: expoPushToken,
            fcmToken: fcmToken,
          }
        },
        { new: true }
      );
      return doc ? normalizeAdmin(doc) : null;
    }
    ```
- **[`src/features/auth/service.ts`](file:///f:/Myprojects/growlic/src/features/auth/service.ts)**:
  Created and exported `updatePushTokens(restaurantId, expoPushToken, fcmToken)` matching validations.
- **[`src/features/auth/index.ts`](file:///f:/Myprojects/growlic/src/features/auth/index.ts)**:
  Exposed `updatePushTokens` to ensure it is accessible in API controllers.

---

## 3. Firebase Admin SDK Initialization

We created **[`src/lib/firebase-admin.ts`](file:///f:/Myprojects/growlic/src/lib/firebase-admin.ts)** to initialize the Firebase Admin SDK using application-default credentials. It handles hot-reloading gracefully by checking if the SDK is already initialized:

```typescript
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

export const fcm = admin.messaging();
export default admin;
```

---

## 4. Token Registration Route

We implemented the token registration endpoint at **[`src/app/api/admin/push-token/route.ts`](file:///f:/Myprojects/growlic/src/app/api/admin/push-token/route.ts)**.

- **Endpoint**: `/api/admin/push-token`
- **Method**: `POST`
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <JWT_TOKEN>",
    "Content-Type": "application/json"
  }
  ```
- **Payload**:
  ```json
  {
    "pushToken": "ExponentPushToken[wJ5RtCDGjhDkZzUW_KvOSX]",
    "fcmToken": "cu7qpa6SS7aUX3CIhtiDdc:APA91bGnsOLuHqkGKosmh..."
  }
  ```
- **Response Headers**:
  `Content-Type: application/json` (guarantees zero frontend parsing crashes).

---

## 5. FCM Push Dispatch Utility

We implemented the push-sending library at **[`src/lib/send-push.ts`](file:///f:/Myprojects/growlic/src/lib/send-push.ts)**. It includes:

1. `sendNewOrderPush(fcmToken, orderDetails)`:
   - Dispatches message with high priority.
   - Configures `channelId: 'orders'` and `sound: 'alarm'` options.
   - Emits payload payload structure compatible with the Android application's custom audio binding.
2. `sendStaffCallPush(fcmToken, tableDetails)`:
   - Dispatches assistance message with high priority.
   - Configures `channelId: 'staff-calls'` and default sound.

---

## 6. Integration Hooks in Core Services

Instead of placing triggers inside the API routes, the FCM notifications have been integrated directly into the core service layer (**[`src/features/order/service.ts`](file:///f:/Myprojects/growlic/src/features/order/service.ts)**).

This architecture guarantees that **both** entry points:
1. **Next.js Server Actions** (used by the local web menu at `/menu/[restaurantId]`)
2. **Next.js HTTP API Routes** (used by Postman, external webhooks, or direct API integration)

will automatically and consistently trigger push alerts.

- **Order Creation (`createOrder`)**:
  Once a customer order is successfully stored, the service fetches the restaurant's admin profile to retrieve the registered `fcmToken`. If found, `sendNewOrderPush` is triggered asynchronously.
  
- **Staff Calls (`createStaffCall`)**:
  Immediately upon saving a new staff call assistance request to the database, `sendStaffCallPush` is triggered asynchronously.

