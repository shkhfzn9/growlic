# Growlic API & Server Actions Documentation

This document provides a comprehensive reference of all API endpoints and Next.js Server Actions used in the Growlic multi-tenant QR-code ordering and loyalty application.

---

## Architecture Overview

Growlic uses a hybrid backend communication design:
1. **REST API Endpoints (`/api/*`):** Used for stateless operations, platform-level configurations (seeding), and administrative actions requiring custom headers or rate-limiting.
2. **Next.js Server Actions (`'use server'`):** Used for component-level client-server transactions (Checkout, Order Updates, Menu Management, Analytics, Loyalty).

---

## Authentication & Sessions

* **Admin Session Cookie:** Admin authentication sets an `httpOnly`, `secure`, `sameSite: "lax"` cookie named `admin_token` containing a signed JWT.
* **Route Protection:** Server actions and super-admin routes read and verify this cookie automatically using helper validation functions.
* **Role-Based Access Control (RBAC):** Admin profiles support `role` scopes (`staff`, `manager`, `owner`, `super_admin`) which are enforced using `can(action, token, restaurantId)` helpers before executing sensitive mutation logic.

---

## 1. REST API Endpoints

### Admin Authentication

#### `POST /api/auth`
* **Description:** Authenticates an admin and sets the session cookie.
* **Rate Limiting:** Limited to 5 requests per minute per IP address (returns HTTP 429 if exceeded).
* **Payload:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePassword123"
}
```
* **Response (Success - HTTP 200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "restaurantId": "tokyo-momos",
  "restaurantName": "Tokyo Momos",
  "email": "admin@example.com",
  "role": "owner"
}
```

---

#### `POST /api/auth/logout`
* **Description:** Revokes the admin token in the database and deletes the `admin_token` session cookie.
* **Payload:** None (reads session cookie).
* **Response (Success - HTTP 200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### `POST /api/auth/register`
* **Description:** Registers a new restaurant tenant and seeds default menu/upsell starter datasets.
* **Payload:**
```json
{
  "restaurantName": "Tokyo Momos",
  "restaurantId": "tokyo-momos",
  "email": "owner@tokyomomos.com",
  "password": "Password123",
  "phone": "9876543210",
  "designation": "Owner"
}
```
* **Response (Success - HTTP 200):**
```json
{
  "success": true,
  "message": "Restaurant registered and default starter menu seeded successfully!",
  "restaurantId": "tokyo-momos"
}
```

---

### Platform Seeding & Testing

#### `GET /api/seed`
* **Description:** Clears existing transactional logs/rules and inserts platform-wide test datasets.
* **Payload:** None.
* **Response (Success - HTTP 200):**
```json
{
  "message": "Database seeded successfully!",
  "adminsCreated": 2,
  "menuItemsCreated": 18,
  "pairingRulesCreated": 3,
  "discountTiersCreated": 2
}
```

---

### Super Admin Operations

#### `GET /api/super-admin/overview`
* **Description:** Retrieves platform-wide operations metrics and transaction anomalies.
* **Access Control:** Requires a logged-in session with `role: "super_admin"`.
* **Query Parameters:**
  * `startDate` *(Optional)*: YYYY-MM-DD format.
  * `endDate` *(Optional)*: YYYY-MM-DD format.
* **Response (Success - HTTP 200):**
```json
{
  "success": true,
  "overview": {
    "totalRevenue": 48250,
    "totalOrders": 124,
    "activeRestaurants": 12,
    "averageOrderValue": 389.11
  },
  "anomalies": [
    {
      "restaurantId": "tokyo-momos",
      "type": "abnormal_order_volume",
      "description": "Tokyo Momos exceeded 50 orders in an hour",
      "severity": "medium"
    }
  ]
}
```

---

#### `GET /api/super-admin/restaurants`
* **Description:** Fetches list of registered restaurant tenants.
* **Access Control:** Requires `role: "super_admin"`.
* **Query Parameters:**
  * `startDate` *(Optional)*: onboarding filter start date.
  * `endDate` *(Optional)*: onboarding filter end date.
  * `status` *(Optional)*: `'all' | 'active' | 'inactive'` (Default: `'all'`).
* **Response (Success - HTTP 200):**
```json
{
  "success": true,
  "restaurants": [
    {
      "_id": "6a43c460...",
      "restaurantName": "Tokyo Momos",
      "restaurantId": "tokyo-momos",
      "email": "owner@tokyomomos.com",
      "active": true,
      "createdAt": "2026-06-30T09:43:18.000Z"
    }
  ]
}
```

---

## 2. Next.js Server Actions

All Server Actions are imported from action namespaces (`@/actions/*`).

### Administrative Config Actions (`@/actions/auth`)

#### `saveRestaurantBranding`
* **Description:** Updates the branding, styling theme, and loyalty program settings for the authenticated restaurant.
* **Payload:**
```typescript
{
  logoUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  loyaltyEnabled?: boolean;
  stampsRequired?: number;
  discountPercentage?: number;
}
```
* **Response (Success):** Serialized `IAdmin` record reflecting updated settings.

---

### Order Transactions Actions (`@/actions/orders`)

#### `createOrder`
* **Description:** Places a new checkout order. If the customer edited their details at checkout, this action automatically merges/renames their existing profile and past orders to prevent duplicate database profiles.
* **Payload:**
```typescript
{
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  customerOldPhone?: string; // Original phone cached in customer localstorage
  tableId?: string;
  items: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  subtotal: number;
  total: number;
}
```
* **Response (Success):** Standardized, serialized `IOrder` object.

---

#### `getOrderById`
* **Description:** Retrieves details for a specific order.
* **Payload:** `(id: string, restaurantId?: string)`
* **Response (Success):** Normalized `IOrder` record or `null`.

---

#### `getOrdersByCustomerPhone`
* **Description:** Fetches order history list for a customer's phone number.
* **Payload:** `(phone: string, restaurantId?: string)`
* **Response (Success):** Array of serialized `IOrder` records.

---

#### `getAdminOrders`
* **Description:** Returns orders page data for the logged-in admin's restaurant.
* **Payload:** `(limit: number, skip: number, status?: 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled')`
* **Response (Success):**
```json
{
  "orders": [ ... ],
  "totalCount": 42
}
```

---

#### `updateOrderStatus`
* **Description:** Modifies the status of an order. Setting an order to `'completed'` automatically triggers the restaurant's active loyalty stamp earning checks.
* **Payload:** `(id: string, status: 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled')`
* **Response (Success):** Serialized updated `IOrder` object.

---

#### `updateOrderEstimatedTime`
* **Description:** Set preparation ETA minutes for an accepted order.
* **Payload:** `(id: string, minutes: number)`
* **Response (Success):** Serialized updated `IOrder` object.

---

#### `getCustomerLoyaltyInfo`
* **Description:** Retrieves the active customer's stamp details and loyalty settings for a restaurant.
* **Payload:** `(phone: string, restaurantId: string)`
* **Response (Success):**
```json
{
  "customer": {
    "stampCount": 4,
    "hasPendingDiscount": false,
    "totalRedemptions": 1
  },
  "loyaltyEnabled": true,
  "stampsRequired": 8,
  "discountPercentage": 20
}
```

---

#### `redeemLoyaltyReward`
* **Description:** Redeems collected stamps for a pending discount reward. Increments the `totalRedemptions` database counter.
* **Payload:** `(phone: string, restaurantId: string)`
* **Response (Success):** Serialized, updated `ICustomer` record.

---

#### `getCustomerLoyaltySummary`
* **Description:** Fetches stamp metrics across all restaurants where the customer's phone number has checked in.
* **Payload:** `(phone: string)`
* **Response (Success):** Array of `LoyaltySummary` objects.

---

#### `logEvent`
* **Description:** Registers customer behavioral events (e.g. nudges shown, upsells clicked) for recommendation engine analytics.
* **Payload:**
```typescript
{
  restaurantId: string;
  eventType: 'nudge_shown' | 'nudge_accepted' | 'checkout_completed';
  payload: Record<string, any>;
}
```
* **Response (Success):** `{ success: true }`

---

### Menu Management Actions (`@/actions/menu`)

#### `getMenuItems`
* **Description:** Fetches list of all menu items inside a restaurant.
* **Payload:** `(restaurantId: string)`
* **Response (Success):** Array of serialized menu item records.

---

#### `createMenuItem`
* **Description:** Registers a new menu item.
* **Payload:**
```typescript
{
  category: string;
  name: string;
  description: string;
  image: string;
  price: number;
  available?: boolean;
  images?: string[];
  preparation?: string;
  ingredients?: string[];
  nutrition?: { calories: number; protein: number; carbs: number; fat: number };
  spiceLevel?: number;
  portionSize?: string;
  prepTimeMin?: number;
  prepTimeMax?: number;
  chefNote?: string;
}
```
* **Response (Success):** Serialized new menu item object.

---

#### `updateMenuItem`
* **Description:** Modifies configuration properties of an existing menu item.
* **Payload:** `(id: string, data: same as createMenuItem schema)`
* **Response (Success):** Serialized updated menu item object.

---

#### `toggleMenuItemAvailability`
* **Description:** Toggles availability state (`available: true/false`) of a menu item.
* **Payload:** `(id: string, available: boolean)`
* **Response (Success):** Serialized updated menu item object.

---

#### `deleteMenuItem`
* **Description:** Removes a menu item from the restaurant catalog.
* **Payload:** `(id: string)`
* **Response (Success):** `{ success: true }`

---

#### `getRestaurantMenuContext`
* **Description:** Batches menu assets, active banners, and recommendation configurations in a single trip for fast client-side check-in rendering.
* **Payload:** `(restaurantId: string)`
* **Response (Success):**
```json
{
  "admin": { ... },
  "banners": [ ... ],
  "upsellConfig": {
    "menuItems": [ ... ],
    "pairingRules": [ ... ],
    "discountTiers": [ ... ]
  }
}
```

---

### Analytics Reporting Actions (`@/actions/orders` - Analytics namespace)

#### `getDashboardMetrics`
* **Description:** Fetches analytics dashboard summary values and performance charts.
* **Payload:**
```typescript
{
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}
```
* **Response (Success):**
```json
{
  "summary": {
    "revenue": 14500,
    "orders": 64,
    "customers": 28,
    "completedRate": 92.5
  },
  "revenueChart": [
    { "date": "2026-06-29", "amount": 4200 },
    { "date": "2026-06-30", "amount": 10300 }
  ],
  "topItems": [
    { "name": "Steamed Veg Momo", "quantity": 38, "revenue": 5700 }
  ]
}
```
