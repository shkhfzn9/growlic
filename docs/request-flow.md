# Customer & Order Request Lifecycle Flow

This document details the step-by-step technical lifecycle of a customer ordering journey from scanning a QR code to kitchen preparation and final fulfillment.

---

## Request Flow Diagram

```
[QR Scan / URL Open] 
        │ 
        ▼
[GET /menu/tokyo-momos?table=5] ────► [Load Restaurant & Branding Configurations]
        │ 
        ▼
[Parallel API Fetch] ───────────────► 1. Menu Items List (getMenuItems)
        │                             2. Active Banners (getActiveBanners)
        │                             3. Upsell Rules (getUpsellConfig)
        ▼
[Customer Interaction] ─────────────► View Item Modal ──► Log event ('modal_open')
        │
        ▼
[Add Items to Cart] ────────────────► Dispatch Redux Cart Slice (Calculate Tiers)
        │
        ▼
[Submit Checkout] ──────────────────► Call Server Action: createOrder(payload)
        │                             │
        │                             ▼
        │                      [1. Customer Profile Lookup] (phone search)
        │                      [2. Apply Combo & Discount Rules] (Calculations)
        │                      [3. Write Order Document] (Order.create)
        │                      [4. Next.js Revalidation] (revalidatePath)
        ▼
[Kitchen Display / Orders Page] ────► Live Refresh Polls (every 10s via loadOrders)
        │
        ▼
[Admin Action: Accept] ─────────────► Call Server Action: updateOrderStatus('accepted')
        │                             & updateOrderEstimatedTime(minutes)
        │                             Write Audit Log ('ORDER_STATUS_CHANGED')
        ▼
[Order Status Updates] ─────────────► Transition order state to 'preparing', 'completed'
                                      Or 'cancelled'.
```

---

## Step-by-Step Lifecycle Analysis

### 1. Customer Scans QR Code
*   **Action**: Customer scans a QR code mapped to a URL like `/menu/tokyo-momos?table=5`.
*   **Component**: `src/app/menu/[slug]/page.tsx`
*   **API / Server Actions**: Renders server-side initially, verifying the `slug` is a valid restaurant tenant ID.
*   **Database Queries**:
    *   Query: `Admin.findOne({ restaurantId: "tokyo-momos" })`
    *   Collection: `admins`
    *   Index Used: `{ restaurantId: 1 }`
*   **Data Transferred**: ~1KB (Restaurant details, name, logo, custom color palette).
*   **Latency**: ~15ms.

### 2. Digital Menu Rendering
*   **Action**: The customer UI mounts the `<MenuList />` component and loads category tabs, item listings, and sliders.
*   **Server Actions / Fetches (Executed in Parallel)**:
    *   `getMenuItems("tokyo-momos")`
        *   DB Query: `MenuItem.find({ restaurantId: "tokyo-momos", available: true })`
        *   Index Used: `{ restaurantId: 1 }` (or compound indexing)
    *   `getActiveBanners("tokyo-momos")`
        *   DB Query: `Banner.find({ restaurantId: "tokyo-momos", active: true })`
    *   `getUpsellConfig("tokyo-momos")`
        *   DB Queries (Promise.all):
            1.  `PairingRule.find({ restaurantId: "tokyo-momos", active: true })`
            2.  `DiscountTier.find({ restaurantId: "tokyo-momos", active: true })`
            3.  `ComboRule.find({ restaurantId: "tokyo-momos", active: true })`
*   **Network Requests**: 3 concurrent Server Action fetch invocations.
*   **Caching**: No server-side HTTP caching. Fetched dynamically on every page load.
*   **Latency**: ~45ms.

### 3. Clickstream Event Logging
*   **Action**: Customer clicks on an item card to view ingredients or nutritional macros.
*   **Component**: `<MenuItemModal />`
*   **Server Action**: `logEvent("tokyo-momos", "modal_open", itemId)`
*   **Database Queries**:
    *   Query: `Event.create({ restaurantId, type: "modal_open", itemId })`
    *   Collection: `events`
*   **Execution Mode**: Runs asynchronously (fire-and-forget from the client), but is a blocking server-side await during execution.
*   **Latency**: ~10ms.

### 4. Cart Additions & Recommendations Calculations
*   **Action**: Customer adds items to their basket.
*   **Component**: `<CartDrawer />`
*   **Processing Layer**: Local Redux Toolkit slice (`redux/cartSlice.ts`) updates values locally. In-cart recommendation calculations run in-memory inside client components using the configurations returned by `getUpsellConfig`:
    *   *Threshold Discount*: Compares current subtotal with the nearest minimum spend goal (`minSpend`).
    *   *Combo Rules*: Evaluates categories to check if "Buy 2 Get 1 Free" or similar rules are satisfied.
    *   *Association Cross-Sells*: Recommends matching pairing categories.
*   **Network Requests**: 0 (Fully local processing).

### 5. Order Placement & Checkout
*   **Action**: Customer clicks "Place Order" and enters their name and phone number.
*   **Component**: `<CheckoutModal />`
*   **Server Action**: `createOrder(payload)`
*   **Database Queries**:
    *   Query 1: `Customer.findOne({ restaurantId, phone })` to locate profile.
    *   Query 2: `Customer.create` (if new customer) or `Customer.findOneAndUpdate` (using `$inc` to update spending).
    *   Query 3: `Order.create(payload)`
*   **Paths Revalidated**: `/admin/dashboard` and `/admin/orders` (Next.js clears caches for these pages so they load fresh data).
*   **Network Requests**: 1 POST request.
*   **Latency**: ~120ms (due to multiple sequential DB operations).

### 6. Admin Panel Order Reception
*   **Action**: Admin dashboard receives the order in real-time.
*   **Component**: `src/features/order/components/OrdersPage.tsx`
*   **Flow**: The page runs a background polling interval every 10 seconds.
*   **API / Server Actions**: `getAdminOrders(limit, skip, filter)`
*   **Database Queries**:
    *   Query 1: `Order.countDocuments({ restaurantId })`
    *   Query 2: `Order.find({ restaurantId }).sort({ createdAt: -1 }).skip(skip).limit(limit)`
*   **Network Requests**: 1 poll request every 10 seconds.
*   **Latency**: ~30ms.

### 7. Kitchen Status Transitions
*   **Action**: Kitchen Staff click "Accept Order" or update status to "Preparing", "Ready", or "Completed".
*   **Component**: `<OrdersPage />` Detail View.
*   **Server Actions**: `updateOrderStatus(orderId, nextStatus)` and `updateOrderEstimatedTime(orderId, minutes)`.
*   **Database Queries**:
    *   Query 1: `Order.findOneAndUpdate({ _id, restaurantId }, { status, estimatedTime })`
    *   Query 2: `AuditLog.create(...)`
*   **Paths Revalidated**: `/admin/dashboard`, `/admin/orders`.
*   **Latency**: ~50ms.
