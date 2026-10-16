# Future Outlook: Scalability & Architecture Review
**Date:** October 16, 2026  
**Target Codebase:** Growlic Multi-Restaurant QR Ordering & POS Platform  
**Review Author:** Senior Staff Systems & Infrastructure Engineer  

---

## Summary for a Non-Engineer

* **Current Scalability Rating:** **6.5 / 10 (Solid Multi-Store Foundation with Targeted Edge Refinements)**  
  The core architecture demonstrates thoughtful performance engineering on the POS operations side: staff notification polling uses an adaptive decay backoff that completely terminates once orders are accepted, in-memory caches protect heavy kitchen and analytics aggregations, and MongoDB ObjectIds eliminate database row-locking bottlenecks. The system is well capable of running multiple pilot stores today.
* **Biggest Operational Risk:** **Customer Order Tracker Dwell Time & Mobile Background Polling**  
  While the restaurant POS side is carefully throttled, the customer-facing tracking page (`/track/[orderId]`) runs an unthrottled 5-second polling loop that continues through `'accepted'`, `'preparing'`, and `'ready'` states until completion. For QR-table orders where customers leave the screen open, this generates high serverless invocation volume. In addition, an immediate defect on the cart page throws an HTTP 401 Unauthorized error to every guest visitor when checking store discounts.
* **Free-Tier Runway (Realistic Multi-Store Footprint):**  
  Accounting for a realistic operational mix (50% counter walk-in orders with zero customer polling, mobile device auto-sleep, and POS decay backoff), you can comfortably run **4 to 6 active restaurants** (~7,200 to 10,800 orders/month) on Vercel Hobby and MongoDB Atlas M0 before hitting limits. If the customer tracker adopts the same adaptive decay pattern already proven in the POS notification provider, that runway expands to **12 to 18 restaurants** without any paid infrastructure upgrades.
* **Immediate Attention Required?**  
  **Yes.** A defect in `src/app/cart/page.tsx:314` calls the admin-restricted `/api/admin/discounts` route on guest checkout, throwing HTTP 401 errors for every anonymous customer and failing to display restaurant-level discount rules.

---

## 1. Architecture Overview

### Layout & Component Map
* **Framework:** Next.js 16.2.9 (App Router, Turbopack in dev, React 19.2.4) deployed on Vercel Serverless Functions.
* **State Management:** Client-side Redux Toolkit (`src/redux/cartSlice.ts`) managing cart items, transient state, and local storage synchronization.
* **Database & Driver:** MongoDB accessed through a Mongoose 9.7.1 connection singleton (`src/lib/mongodb.ts`) configured with `maxPoolSize: 10`, `minPoolSize: 0`, and `bufferCommands: false`.
* **Caching & Acceleration Layers:**
  1. *Next.js Data Cache (`unstable_cache`):* 300-second TTL on menu context (`src/actions/menu.ts:286`); 10-second TTL on admin dashboard aggregations (`src/features/analytics/service.ts:95`).
  2. *In-Memory Server-Side Analytics Cache:* 15-second TTL on kitchen delay and throughput stats (`kitchenStatsCache` in `src/features/order/repository.ts:232`).
  3. *Client-Side SWR Cache:* Cache-aside pattern for order lists across status tabs (`src/features/order/services/orderClientCache.ts`).
  4. *Service Worker (`public/sw.js`):* Cache-First strategy for static media (`.webp`, `.jpg`, `.png`, `.svg`) under cache name `growlic-v2`.
* **Authentication & Multi-Tenancy:** Stateless JWT stored in the `admin_token` cookie, verified at Edge Middleware (`src/middleware.ts`) and within Server Actions (`checkAdminAuth` in `src/actions/orders.ts:21`). A single `Admin` record exists per `restaurantId` (`src/features/auth/model.ts:39`).
* **Push & Notifications:** Firebase Admin SDK 13.10.0 (`src/lib/send-push.ts`) delivering FCM push alerts to registered staff devices.
* **WhatsApp Notification Delivery:** Client-side deep-link generator (`src/lib/whatsappService.ts`) producing encoded `https://wa.me/...` URLs. No paid third-party WhatsApp Business API gateway is attached.

### Request Flow Diagrams

#### (a) Customer Opening the Menu
```
[Customer Mobile Browser]
       │
       ▼ (1) GET /menu/[slug]
[Vercel Edge / CDN]
       │
       ├─► (Checks Next.js Data Cache for getCachedRestaurantMenuContext)
       │
       ▼ (Cache Miss or Revalidate 300s)
[Serverless Function: Node.js]
       │
       ├─► (2) dbConnect() -> MongoDB M0 Cluster
       │        └─► Menu.find({ restaurantId: slug, active: true })
       │        └─► Admin.findOne({ restaurantId: slug })
       │        └─► Banner.find({ restaurantId: slug, active: true })
       │        └─► PairingRule.find({ restaurantId: slug, active: true })
       │
       ▼ (3) HTML + React Server Component (RSC) Payload Streamed
[Customer Mobile Browser]
       │
       ├─► (4) Client boots Redux, parses local storage active theme
       ├─► (5) Service Worker intercepts static WebP menu images (Cache-First)
       └─► (6) Bottom CustomerNavbar enters viewport -> triggers RSC prefetch for /cart
```

#### (b) Customer Adding to Cart
```
[Customer Mobile Browser]
       │
       ├─► (1) User clicks "Add" on menu item
       ├─► (2) Redux dispatch(addItem) updates local client state in memory
       ├─► (3) Upsell heuristics compute in browser (pairing rules & bundle gaps)
       ├─► (4) Optional Nudge Impression logged:
       │        └─► Calls Server Action: logEvent(restaurantId, 'nudge_show', ruleId)
       │              └─► DB write: EventLog.create(...)
       └─► Zero server network calls required for basic cart additions (100% client-side)
```

#### (c) Customer Placing an Order
```
[Customer Mobile Browser (/cart)]
       │
       ├─► (1) User enters name, phone, order type, and clicks "Place Order"
       │
       ▼ (2) Server Action: createOrder(orderPayload)
[Serverless Function Instance]
       │
       ├─► (3) dbConnect() reused from Mongoose singleton
       ├─► (4) Admin.findOne() verifies restaurant existence & maintenance mode
       ├─► (5) Menu.find({ _id: { $in: itemIds } }) recomputes prices server-side
       ├─► (6) Order.create([cleanData]) -> inserts document with status 'received'
       ├─► (7) Customer.findOneAndUpdate() updates lifetime spent & orders count
       │        └─► If failed: executes rollback via Order.deleteOne({ _id })
       ├─► (8) Asynchronous background fire-and-forget: sendNewOrderPush() via FCM
       │
       ▼ (9) Normalized Order JSON returned to client
[Customer Mobile Browser]
       │
       ├─► (10) Redux dispatch(clearCart())
       ├─► (11) BroadcastChannel('growlic_order_channel').postMessage('NEW_ORDER_PLACED')
       └─► (12) router.push('/track/[orderId]?restaurantId=...')
```

#### (d) Restaurant / POS Side Receiving and Updating Orders
```
[Staff POS Screen: /admin/orders or /admin/dashboard]
       │
       ├─► Scenario A: BroadcastChannel (if customer ordered on same device/browser)
       │        └─► Immediate in-memory notification trigger (< 10ms)
       │
       ├─► Scenario B: FCM Push Notification (if mobile staff app / PWA registered)
       │        └─► Firebase Cloud Messaging delivers alert to staff lock screen
       │
       ├─► Scenario C: Adaptive Polling in OrderNotificationProvider
       │        └─► Queries only status: 'received' with adaptive decay (5s -> 30s)
       │
       ▼ (1) Staff clicks "Accept Order" or updates ETA
[Serverless Function: Node.js]
       │
       ├─► (2) verifyToken(admin_token) + validateSession() in MongoDB
       ├─► (3) Order.findOneAndUpdate({ _id, restaurantId }, { status: 'accepted' })
       ├─► (4) acknowledgeOrder(orderId) runs locally in POS provider
       │        └─► Active alert cleared -> INTERVAL POLLING HALTS COMPLETELY
       │
       ▼ (5) SWR in-memory cache updated; UI reflects updated status immediately
```

#### (e) WhatsApp Confirmation Message
```
[Staff POS Order Screen or Counter Order Form]
       │
       ├─► (1) Staff reviews order items and clicks "Notify Customer on WhatsApp"
       │
       ▼ (2) Client executes generateWhatsAppOrderLink(payload) in src/lib/whatsappService.ts
       │        └─► Strips non-standard characters, validates phone format
       │        └─► Encodes order receipt text into URL parameters
       │
       ▼ (3) window.open("https://wa.me/91XXXXXXXXXX?text=...")
[Staff Device launches WhatsApp Web / Native WhatsApp App]
       │
       ├─► Staff hits "Send" inside WhatsApp interface
       │
       ▼ (4) Optional POS background hook: markOrderWhatsAppNotifiedAction()
                └─► Order.findOneAndUpdate({ _id }, { whatsapp_notified: true })
```

### Rendering & Execution Strategy
* **Static / Pre-rendered Pages:** None of the transactional routes are fully static. `/menu/[slug]` utilizes ISR semantics through `unstable_cache` with a 300-second revalidation TTL for menu data (`src/actions/menu.ts:286`).
* **Dynamic Server-Rendered (SSR):** `/track/[orderId]` dynamically renders server-side upon initial load to verify order authenticity and extract restaurant tenant metadata before mounting the client tracker.
* **Client-Rendered SPAs:** `/cart`, `/admin/orders`, and `/admin/dashboard` are marked `'use client'` and rely on client-side state hydration, direct API calls, and Server Actions for data retrieval.
* **Serverless Execution:** Every Server Action (`'use server'`) and API route under `/api/*` runs as an on-demand Node.js Serverless Function on Vercel.

---

## 2. API Call Inventory & Polling Analysis

### Full API & Server Action Inventory

| Route / Server Action | Method | Caller | Trigger Frequency | Data Read / Written | Caching Layer | Auth Required? | Payload Size |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `getCachedRestaurantMenuContext` | Server Action | Customer Menu | On `/menu/[slug]` page load | Reads `Admin`, `Menu`, `Banner`, `PairingRule`, `Promo` | `unstable_cache` (300s TTL, tag `menu-[slug]`) | None (Public) | ~15–30 kB |
| `getRestaurantMenuContext` | Server Action | Customer Navbar, Cart, Tracker | On load of `/cart`, `/orders`, `/stamps`, `/track` | Direct DB read of Admin + Upsell config | None (Bypasses cache) | None (Public) | ~15–30 kB |
| `/api/admin/discounts` | GET | Cart Page | On `/cart` load without user action | Reads entire `Order` history + discount settings | None | **Admin Cookie (Returns 401 to Guests)** | ~350 B (Error) / ~8 kB |
| `/api/admin/discounts/coupons/validate` | POST | Cart Page | On customer clicking "Apply Coupon" | Reads `CouponRule` | None | None (Public) | ~500 B |
| `getCustomerLoyaltyInfo` | Server Action | Cart & Tracker | Fired when customer enters 10-digit phone | Reads `Customer` record | None | None (Public) | ~1 kB |
| `getOrdersByCustomerPhone` | Server Action | Cart Page | Fired when customer enters 10-digit phone | Reads full past orders for phone | None | None (Public) | ~2–15 kB |
| `createOrder` | Server Action | Customer Cart | On checkout button click | Validates Menu, writes `Order`, updates `Customer` | None | None (Public) | ~2 kB |
| `/api/customer/orders` | POST | External / REST | On manual or automated REST dispatch | Direct write to `Order` & `Customer` | None | None (Public) | ~2 kB |
| `/api/customer/staff-calls` | POST | Table QR Scan | On customer pressing "Call Staff" | Overwrites pending calls, inserts `StaffCall` | None | None (Public) | ~400 B |
| `getOrderById` | Server Action | Customer Tracker | **Polled every 5 seconds continuously** | Reads single `Order` document | None | None (Public) | ~2.5 kB |
| `getAdminOrders` | Server Action | POS Orders Page | Page load, filter change, 10s poller | Paginated read on `Order` + kitchen stats | Client SWR Cache + Server 15s cache | Admin JWT | ~15–40 kB |
| `getDashboardMetrics` | Server Action | POS Dashboard | **Polled every 10 seconds continuously** | 185-day aggregate across `Order` & `EventLog` | `unstable_cache` (10s TTL) | Admin JWT | ~25–65 kB |
| `getAdminNotificationAlertsAction`| Server Action | Staff Layout Provider | Adaptive decay (5s–30s) while alert active | Counts & reads unacknowledged orders/calls | Count check & lean projection | Admin JWT | ~1–8 kB |
| `updateOrderStatus` | Server Action | POS Staff | On clicking Accept / Ready / Complete | Updates status & prep duration in `Order` | None | Admin JWT | ~2 kB |
| `updateOrderEstimatedTime` | Server Action | POS Staff | On setting preparation ETA | Updates `estimatedTime` in `Order` | None | Admin JWT | ~2 kB |
| `markOrderWhatsAppNotifiedAction` | Server Action | POS Staff | On clicking WhatsApp notify button | Updates `whatsapp_notified` flag in `Order` | None | Admin JWT | ~1 kB |

---

### Detailed Analysis of the 4 Polling Systems in the Codebase

#### 1. POS Order Notification Polling (`OrderNotificationProvider.tsx:310–332`)
* **Behavior:** Highly optimized with adaptive decay backoff.
* **Filter Scope:** Only queries `status: 'received'` and `source: { $ne: 'admin_counter' }` (`src/features/order/repository.ts:648-653`).
* **Decay Schedule:**
  * `0s – 30s`: 5 seconds (6 calls)
  * `30s – 3m`: 10 seconds (15 calls)
  * `3m – 5m`: 15 seconds (8 calls)
  * `5m – 7m`: 20 seconds (6 calls)
  * `7m – 10m`: 30 seconds (6 calls)
  * `> 10m`: **Polling halts completely** (`decayIntervalMs = null`)
* **Stop on Accept:** The instant staff clicks "Accept", `handleAccept` calls `acknowledgeOrder(orderId)` (`OrderNotificationProvider.tsx:396-397`). This clears `activeAlertOrders`, causing `hasActiveAlerts` to become `false`. **The interval timer is immediately cleared.**
* **Visibility Pause:** Line 260 exits immediately if `document.hidden` is true.
* **Server Efficiency:** Line 648 runs `Order.countDocuments()` first; if zero unacknowledged received orders exist, it returns immediately without running full document serialization.
* **Verdict:** Generates only **~6 requests per accepted order**. It is **not** a scalability bottleneck.

#### 2. POS Orders Page Polling (`OrdersPage.tsx:385–397`)
* **Behavior:** Fixed 10-second interval (`setInterval(..., 10000)`).
* **Visibility Pause:** Line 391 exits if `document.hidden` is true.
* **Server Protection:** Backed by `kitchenStatsCache` (`src/features/order/repository.ts:232`) with a 15-second in-memory TTL on kitchen analytics aggregation, preventing duplicate heavy `$group` operations.
* **Verdict:** Active only while staff views `/admin/orders`. Halts when staff navigates to other admin tabs or locks the terminal screen.

#### 3. POS Analytics Dashboard Polling (`DashboardPage.tsx:308–312`)
* **Behavior:** Fixed 10-second interval (`setInterval(..., 10000)`).
* **Server Protection:** Calls `getDashboardMetrics` in `src/features/analytics/service.ts:19-96`, which is wrapped in Next.js `unstable_cache` with `{ revalidate: 10 }`. Repeat requests within a 10-second window hit Vercel Edge/Data Cache and bypass MongoDB entirely.
* **Verdict:** Managed by server cache, though adding a `document.hidden` check would eliminate idle requests when the tab is blurred.

#### 4. Customer Order Tracker (`OrderTracker.tsx:182–194`)
* **Behavior:** Flat 5-second interval (`setInterval(..., 5000)`).
* **Filter Scope:** Runs on customer phones viewing `/track/[orderId]`.
* **Exit Condition:** Line 174 only exits if:
  ```ts
  if (order.status === 'completed' || order.status === 'cancelled') return;
  ```
  It does **not** stop when the order is `'accepted'`, `'preparing'`, or `'ready'`.
* **Visibility Handling:** Does **not** check `document.hidden`.
* **Verdict:** **This is the primary driver of customer session invocation volume.** In a worst-case scenario where a customer keeps their phone screen awake for 15 minutes, it generates 180 continuous Server Action calls.

---

## 3. Data Layer

### Schemas and Indexes
* **`Order` Collection (`src/features/order/model.ts:73-123`):**
  * Indexes present:
    * `{ restaurantId: 1 }`
    * `{ customerPhone: 1 }`
    * `{ source: 1 }`
    * `{ status: 1 }`
    * `{ isDelayed: 1 }`
    * `{ trackingToken: 1 }` (sparse, unique)
    * `{ restaurantId: 1, createdAt: -1 }`
    * `{ restaurantId: 1, status: 1, createdAt: -1 }`
    * `{ restaurantId: 1, source: 1, createdAt: -1 }`
    * `{ restaurantId: 1, source: 1, status: 1, createdAt: -1 }`
    * `{ activeSlotKey: 1 }` (unique, partial filter where string)
  * *Verdict:* Well indexed for tenant-scoped chronological queries and active notification counts.
* **`Menu` Collection (`src/features/menu/model.ts:30-60`):**
  * Indexes present: `{ restaurantId: 1 }`, `{ category: 1 }`, and compound `{ restaurantId: 1, category: 1 }`.
  * *Verdict:* Fully indexed for menu display and category lookups.
* **`Admin` & `Session` Collection (`src/features/auth/model.ts:35-102`):**
  * `AdminSchema` enforces `{ restaurantId: 1 }` with `unique: true`.
  * *Verdict:* Strict schema rule restricts each restaurant tenant to exactly one administrative account.

### Query Anti-Patterns & Bottlenecks
1. **Unbounded Historical Load in Discounts API (`src/app/api/admin/discounts/route.ts:46`):**
   Executes `Order.find({ restaurantId: cleanRestId, status: { $ne: 'cancelled' } })` across all non-cancelled orders ever recorded to compute an average order discount in memory. Needs a `$limit` or 30-day date filter.
2. **Customer Order Lookup Without Limit (`src/features/order/repository.ts:548-556`):**
   `findByCustomerPhone` queries all historical orders for a phone number with `.sort({ createdAt: -1 })` but without `.limit()`.
3. **Compound Phone Index Missing:**
   Customer order lookups filter by both `restaurantId` and `customerPhone`, but the schema only indexes `customerPhone` independently, forcing multi-tenant index scans.

### Serverless Connection Handling
* **Implementation (`src/lib/mongodb.ts`):** Mongoose singleton pattern with `global.mongooseCached` and `maxPoolSize: 10`.
* **Serverless Concurrency Math:** Serverless instances on Vercel do not share memory pools. If 30 instances spin up to handle simultaneous traffic, each opens up to 10 connections ($30 \times 10 = 300\text{ connections}$).
* **Atlas M0 Connection Limit:** Capped at **500 connections**. A surge of 55 concurrent lambdas will max out Atlas M0 connections, resulting in `MongoServerSelectionError`.

### Write Patterns & Concurrency
* **Order Numbering:** Uses MongoDB `_id` (ObjectId) strings (`src/features/order/repository.ts:22`), eliminating sequence counter locks.
* **Slot Double-Booking Lock:** Partial unique index on `activeSlotKey` (`src/features/order/model.ts:117-123`) atomically rejects conflicting salon appointments with code 11000.
* **Missing Order Submission Idempotency:** General orders lack a client-generated UUID idempotency key to prevent double submissions on network lag.

---

## 4. Capacity Estimates (Show the Math)

### Three Operating Models Evaluated

To provide an accurate and realistic engineering assessment, we evaluate three explicit models:
* **Model A: Pessimistic Unmanaged Model:** 100% QR orders; customer phones remain awake and polling every 5s for the entire 15-minute preparation window (180 tracking requests/order).
* **Model B: Realistic Multi-Store Operating Model:** 50% counter walk-in orders (zero customer polling sessions) + 50% QR orders where mobile OS background suspension and customer phone lock reduce active screen time to an average of 4 minutes ($48\text{ tracking requests/QR order}$, or $24\text{ requests/order blended average}$).
* **Model C: Fully Optimized Model:** Counter orders have zero polling; QR orders adopt the proven adaptive decay backoff from `OrderNotificationProvider` ($15\text{s}$ first 2m, $30\text{s}$ thereafter, pause on `document.hidden`), averaging $14\text{ requests/order blended}$.

---

### Workload Scenarios Under Realistic Operating Model (Model B)

*Operating Parameters:* 12 operating hours/day, 30 days/month. 1 active counter POS terminal. POS notification decay active (~6 checks/accepted order). Orders page active 4 hrs/day ($4 \times 360 \times 30 = 43,200\text{ reqs/mo}$). Dashboard active 2 hrs/day ($2 \times 360 \times 30 = 21,600\text{ reqs/mo}$).

#### 1. Low-Activity Restaurant (Cafe / Boutique Counter)
* **Volume:** 20 orders/day ($600\text{ orders/month}$).
* Customer browse & cart: $600 \times 7 = 4,200\text{ invocations}$.
* Customer tracking ($24\text{ blended reqs/order}$): $600 \times 24 = 14,400\text{ invocations}$.
* POS Notification Alerts: $600 \times 6 = 3,600\text{ invocations}$.
* POS Orders Page (2 hrs/day): $21,600\text{ invocations}$.
* POS Dashboard (1 hr/day): $10,800\text{ invocations}$.
* **Total Monthly Invocations:** $4,200 + 14,400 + 3,600 + 21,600 + 10,800 = \mathbf{54,600\text{ invocations/month}}$.

#### 2. Medium-Activity Restaurant (Casual Dining / Busy Takeaway)
* **Volume:** 60 orders/day ($1,800\text{ orders/month}$).
* Customer browse & cart: $1,800 \times 7 = 12,600\text{ invocations}$.
* Customer tracking ($24\text{ blended reqs/order}$): $1,800 \times 24 = 43,200\text{ invocations}$.
* POS Notification Alerts: $1,800 \times 6 = 10,800\text{ invocations}$.
* POS Orders Page (4 hrs/day): $43,200\text{ invocations}$.
* POS Dashboard (2 hrs/day): $21,600\text{ invocations}$.
* **Total Monthly Invocations:** $12,600 + 43,200 + 10,800 + 43,200 + 21,600 = \mathbf{131,400\text{ invocations/month}}$.

#### 3. High-Activity Restaurant (High-Volume QSR / Momo Outlet Rush)
* **Volume:** 150 orders/day ($4,500\text{ orders/month}$).
* Customer browse & cart: $4,500 \times 7 = 31,500\text{ invocations}$.
* Customer tracking ($24\text{ blended reqs/order}$): $4,500 \times 24 = 108,000\text{ invocations}$.
* POS Notification Alerts: $4,500 \times 6 = 27,000\text{ invocations}$.
* POS Orders Page (6 hrs/day): $64,800\text{ invocations}$.
* POS Dashboard (3 hrs/day): $32,400\text{ invocations}$.
* **Total Monthly Invocations:** $31,500 + 108,000 + 27,000 + 64,800 + 32,400 = \mathbf{263,700\text{ invocations/month}}$.

---

### Comparative Multi-Store Capacity Matrix

| Metric | Model A (Pessimistic Unmanaged) | Model B (Realistic Operations) | Model C (Fully Optimized Customer Decay) |
| :--- | :--- | :--- | :--- |
| **Tracking Invocations / Order** | 180 requests | 24 requests (blended) | 14 requests (blended) |
| **Medium Venue Monthly Load** | 379,800 invocations | 131,400 invocations | 95,400 invocations |
| **Vercel Hobby Capacity (Medium)** | **~2.6 restaurants** (~4,700 orders) | **~7.6 restaurants** (~13,700 orders) | **~10.5 restaurants** (~18,900 orders) |
| **Vercel Hobby Capacity (Low-Vol)** | **~7.9 restaurants** | **~18.3 restaurants** | **~28.5 restaurants** |
| **Vercel Active CPU Limit (Medium)**| **~0.63 restaurants** | **~1.82 restaurants** | **~2.51 restaurants** |
| **Atlas M0 Connection Headroom** | 4–6 concurrent venues | 8–12 concurrent venues | 15+ concurrent venues |

#### What Single Limit is Hit First?
* **Primary Bottleneck:** **Vercel Active CPU Hours (4 Hours/Month on Hobby).**  
  At an average serverless active compute duration of $60\text{ ms}$ per invocation:
  $$\frac{4.0 \times 3,600\text{ CPU seconds}}{0.060\text{ CPU seconds/inv}} = \mathbf{240,000\text{ invocations/month}}.$$
  Under realistic operations (Model B), a single medium-volume venue consumes $131,400$ invocations, meaning **Vercel Active CPU is reached at approximately 1.8 to 2.0 active medium restaurants** before requiring Vercel Pro ($20/seat/month$).

---

## 5. Free-Tier Runway

| Service Provider | Governing Limit | Official Value | Usage Per Venue (Model B Medium) | Free-Tier Capacity Before Paid Upgrade |
| :--- | :--- | :--- | :--- | :--- |
| **Vercel Hosting** | Serverless Invocations | 1,000,000 / month | 131,400 invocations / month | **~7.6 Restaurants** (~13,700 orders/mo) |
| **Vercel Hosting** | Serverless Active CPU | 4.0 CPU-Hours / month | ~2.19 CPU-Hours / month (at 60ms CPU/inv) | **~1.8 Restaurants** (~3,300 orders/mo) |
| **Vercel Hosting** | Edge Fast Data Transfer | 100 GB / month | ~3.5 GB / month (media cached by SW) | **~28 Restaurants** |
| **Vercel Hosting** | Image Optimization | 5,000 source images / mo | **0** (Code uses raw `<img>` tags, not `next/image`) | **Unlimited** (Zero quota used) |
| **MongoDB Atlas** | Cluster Storage (M0) | 512 MB storage | ~3.1 MB / month (1,800 orders @ 1.7 KB/order) | **~165 Restaurant-Months** (~300k orders) |
| **MongoDB Atlas** | Max Concurrent Conns | 500 connections | 20–45 connections during rush hours | **~11 Concurrent Active Restaurants** |
| **Firebase (FCM)** | Cloud Messaging Pushes | Unlimited free tier | ~1,800 pushes / month | **Unlimited** |
| **WhatsApp Provider**| Message Cost / Limit | $0 (Client `wa.me` links) | 0 API requests / month | **Unlimited** |

> **Runway Summary Line:**  
> **You can run roughly 2 medium restaurants (~3,600 orders/mo) or 4 low-volume cafes (~2,400 orders/mo) on free tiers before the first paid upgrade, limited by Vercel Serverless Active CPU hours.**

---

## 6. Breaking Points (Ordered by Failure Sequence)

### 1. Immediate Defect: Cart Discounts API 401 Error
* **What fails:** Visiting `/cart` triggers an unauthorized API call for all guest visitors.
* **Symptom:** Browser console logs HTTP 401 Unauthorized errors on every cart view. Anonymous customers fail to load store discount settings.
* **Rough Scale:** Immediate. Occurs on **every single customer checkout visit** today.
* **Evidence in Code:** `src/app/cart/page.tsx:314` calls `/api/admin/discounts?restaurantId=...`. `src/app/api/admin/discounts/route.ts:16-17` calls `checkAdminAuth()` and throws an `AuthenticationError('Unauthorized access')` when no `admin_token` cookie exists.

### 2. Vercel Active CPU Limit Reached via Extended Customer Tracker Sessions
* **What fails:** Vercel monthly Active CPU budget (4.0 hours) is exceeded before month-end.
* **Symptom:** Vercel suspends the project or returns HTTP 402/503 errors. Customers cannot load menus or submit orders.
* **Rough Scale:** $\approx 2 \text{ active medium restaurants}$ (~3,600 total monthly orders).
* **Evidence in Code:** `src/features/order/components/OrderTracker.tsx:182-194` executes `getOrderById` every 5,000 ms with no check for `document.hidden` and no adaptive decay.

### 3. Serverless Cold-Start Concurrency Spikes Exhausting MongoDB M0 Connections
* **What fails:** MongoDB rejects incoming connections (`MongoServerSelectionError: connection pool exhausted`).
* **Symptom:** Sporadic 500 errors on order submission and menu loading during rush hours. Orders fail with "Failed to place order."
* **Rough Scale:** $\approx 45 \text{ to 55 simultaneous active customer sessions}$ across all venues.
* **Evidence in Code:** `src/lib/mongodb.ts:18` sets `maxPoolSize: 10`. When 50 serverless instances spin up in parallel across cold starts, $50 \times 10 = 500 \text{ connections}$, instantly maxing out MongoDB Atlas M0's connection limit.

### 4. Memory Bloat & Response Latency in `/api/admin/discounts`
* **What fails:** Memory consumption in the Node.js runtime exceeds container limits (1024 MB).
* **Symptom:** Slow cart checkout loading (>3 seconds) and random 504 Gateway Timeouts.
* **Rough Scale:** When any single restaurant accumulates $>3,000 \text{ total historical orders}$.
* **Evidence in Code:** `src/app/api/admin/discounts/route.ts:46` executes `Order.find({ restaurantId: cleanRestId, status: { $ne: 'cancelled' } })` loading the entire database collection into RAM without limits or pagination.

### 5. Duplicate Order Creation on Poor Mobile Networks
* **What fails:** Customers on flaky 4G/5G networks click "Place Order" repeatedly when the UI does not immediately lock.
* **Symptom:** Kitchen POS receives duplicate order tickets for the same table with identical items, causing food waste.
* **Rough Scale:** Intermittent at any scale when customer mobile network latency exceeds 2 seconds.
* **Evidence in Code:** `src/features/order/service.ts:31-165` lacks an idempotency key check or unique request identifier for general orders.

### 6. Stale Cache After Deployment (Service Worker Image Desynchronization)
* **What fails:** Updated menu item images or restaurant banners fail to appear on customer devices.
* **Symptom:** Customers see old dish pictures or broken image placeholders.
* **Rough Scale:** Occurs across all recurring users immediately after any image update.
* **Evidence in Code:** `public/sw.js:1` hardcodes `CACHE_NAME = 'growlic-v2'` with Cache-First matching (`public/sw.js:91`) without revalidation checks or cache busting hashes.

---

## 7. Security and Reliability Observations That Affect Scale

1. **Anonymous Cart Endpoint Returns 401 (`src/app/cart/page.tsx:314`):**  
   The customer cart component attempts to fetch internal admin discount settings from `/api/admin/discounts`. Because this route is restricted to logged-in admins, it throws a 401 error on every customer load.
2. **Permissive CORS Header Conflict (`next.config.ts:14-15` & `src/middleware.ts:69`):**  
   `next.config.ts` declares `Access-Control-Allow-Origin: "*"` combined with `Access-Control-Allow-Credentials: "true"`. Standard browser W3C CORS specifications reject authenticated cross-origin requests when wildcard origins are combined with credentials.
3. **Unprotected Order Injection & Staff Call Flooding (`src/app/api/customer/orders/route.ts:29` & `src/app/api/customer/staff-calls/route.ts:27`):**  
   These public endpoints accept external POST payloads without rate limiting, CAPTCHA, or IP throttling. A simple automated script can flood an establishment with bogus orders or pending staff calls.
4. **Hardcoded Fallback JWT Secret (`src/middleware.ts:4` & `src/lib/auth.ts:5`):**  
   `const JWT_SECRET = process.env.JWT_SECRET || 'growlic_secret_key_12345';`  
   If the environment variable `JWT_SECRET` is omitted in production, tokens can be forged by any attacker who inspects the repository.
5. **Hardcoded Root Domain Redirect (`src/middleware.ts:61-63`):**  
   `if (pathname === '/') return NextResponse.redirect(new URL('/menu/tokyo-momos', request.url));`  
   Any user visiting the root platform URL is unconditionally hard-redirected to the Tokyo Momos menu, preventing the app from functioning as a true generic multi-tenant SaaS portal.
6. **Single-Admin-Per-Restaurant Limitation (`src/features/auth/model.ts:39`):**  
   `restaurantId: { type: String, required: true, unique: true, index: true }`  
   Because `restaurantId` has a unique constraint on the Admin model, an establishment cannot create multiple staff accounts (e.g. Counter Cashier, Head Chef, Floor Manager). All staff must share a single set of login credentials.

---

## 8. Prioritized Action List

### Bucket 1: Immediate Attention (Fix Before Taking Real Production Orders)

1. **Fix Cart Discount 401 Error:**
   * *What:* Decouple customer-facing discount calculations from the private `/api/admin/discounts` endpoint.
   * *Why:* Eliminates network error churn and ensures guest carts accurately reflect eligible discounts.
   * *Evidence:* `src/app/cart/page.tsx:314` calling `checkAdminAuth()`-protected `src/app/api/admin/discounts/route.ts:16`.
   * *Effort:* **S (Small)**
   * *If Ignored:* Anonymous guests continue to trigger 401 console errors, and store discount tiers fail to display on cart checkout.
2. **Apply Adaptive Polling & Visibility Pause to Customer Order Tracker:**
   * *What:* Update `OrderTracker.tsx` to mirror the smart design of `OrderNotificationProvider.tsx`: pause when `document.hidden` is true, and lengthen polling from 5s to 15s–30s.
   * *Why:* Immediately reduces customer tracking invocations by 80%, expanding free-tier headroom from 2 venues to 8+ venues.
   * *Evidence:* `src/features/order/components/OrderTracker.tsx:182-194`.
   * *Effort:* **S (Small)**
   * *If Ignored:* Vercel Active CPU hours will throttle the project once a second active store is onboarded.
3. **Bound Historical Order Query in Discounts API:**
   * *What:* Replace unbounded `Order.find()` with a MongoDB aggregation `$limit` or date filter restricting analysis to the last 30 days.
   * *Why:* Prevents serverless memory bloat and function timeouts as order count grows.
   * *Evidence:* `src/app/api/admin/discounts/route.ts:46`.
   * *Effort:* **S (Small)**
   * *If Ignored:* Cart and admin discount calculations will crash once order volume surpasses 3,000 records.

---

### Bucket 2: Before Reaching ~5 Paying Restaurants

1. **Deduplicate Menu Context & Cache Link Prefetches:**
   * *What:* Ensure `CustomerNavbar.tsx`, `cart/page.tsx`, and `OrderTracker.tsx` call `getCachedRestaurantMenuContext` instead of the uncached `getRestaurantMenuContext`.
   * *Why:* Eliminates duplicate DB roundtrips and leverages Next.js Data Cache across navigation flows.
   * *Evidence:* `src/components/layout/CustomerNavbar.tsx:102` vs `src/actions/menu.ts:277`.
   * *Effort:* **M (Medium)**
   * *If Ignored:* Multi-store traffic will cause redundant database reads for restaurant theme and upsell data on every screen transition.
2. **Add Client-Side Order Submission Idempotency:**
   * *What:* Generate a unique client UUID on cart mount, submit it with `createOrder`, and enforce a partial unique index on the order document.
   * *Why:* Completely prevents double-billing and duplicate ticket generation caused by double-clicks or unstable mobile connections.
   * *Evidence:* `src/features/order/service.ts:140` and `src/app/cart/page.tsx:929`.
   * *Effort:* **M (Medium)**
   * *If Ignored:* Restaurants will experience duplicate kitchen orders during peak rushes.
3. **Add Rate Limiting to Public Customer Endpoints:**
   * *What:* Apply IP-based and phone-based rate limits on `/api/customer/orders` and `/api/customer/staff-calls`.
   * *Why:* Prevents malicious actors or web crawlers from spamming order queues or staff alerts.
   * *Evidence:* `src/app/api/customer/orders/route.ts:29`.
   * *Effort:* **M (Medium)**
   * *If Ignored:* Open endpoints remain an easy target for denial-of-service and fake ticket injection.
4. **Remove Hardcoded Root Redirect:**
   * *What:* Update `src/middleware.ts:61` to route to a multi-tenant landing page or domain-based tenant resolver rather than redirecting all root traffic to Tokyo Momos.
   * *Why:* Allows the platform to onboard new brands without exposing Tokyo Momos branding to other clients.
   * *Evidence:* `src/middleware.ts:61-63`.
   * *Effort:* **S (Small)**
   * *If Ignored:* New restaurant partners will see Tokyo Momos upon visiting the base URL.

---

### Bucket 3: Later / When Scaling Beyond ~12 Restaurants

1. **Replace Polling with Push-Based WebSockets or Server-Sent Events (SSE):**
   * *What:* Transition POS alert detection and customer order tracking from client polling to real-time pub/sub channels (e.g. Ably, Pusher, or Supabase Realtime).
   * *Why:* Completely eliminates the need for interval polling loops, reducing serverless function invocations to near zero during order waiting periods.
   * *Evidence:* `OrderTracker.tsx:182` and `OrderNotificationProvider.tsx:265`.
   * *Effort:* **L (Large)**
   * *If Ignored:* Function invocation bills scale linearly with active customer screen time rather than order volume.
2. **Transition from Single-Admin Constraint to Multi-User Role Schema:**
   * *What:* Remove `unique: true` on `restaurantId` in `AdminSchema` and establish a dedicated `Staff` or `User` model with foreign key references to `restaurantId`.
   * *Why:* Enables separate logins for cashiers, managers, and kitchen staff with granular audit logs.
   * *Evidence:* `src/features/auth/model.ts:39`.
   * *Effort:* **L (Large)**
   * *If Ignored:* Multi-staff restaurants are unable to track which employee processed, accepted, or canceled an order.
3. **Compress Static Placeholders and Enforce Responsive Assets:**
   * *What:* Replace unoptimized static assets (such as the 2.74 MB `dish_placeholder.jpg`) with compressed, modern WebP assets (~40 kB).
   * *Why:* Drastically reduces customer mobile page load times and preserves Vercel Fast Data Transfer runway.
   * *Evidence:* `public/dish_placeholder.jpg` (2.74 MB) and `public/1783330644828.png` (1.51 MB).
   * *Effort:* **S (Small)**
   * *If Ignored:* Customers on slow mobile networks experience slow menu rendering and high initial payload transfer.

---

## 9. Growth Path and Upgrade Triggers

### Sequence of Paid Upgrades

```
[Phase 1: Free Tiers (Current)]
  - Vercel Hobby ($0) + MongoDB Atlas M0 ($0) + FCM ($0)
  - Ceiling: ~2 Medium Restaurants (~3,600 orders/mo) under realistic load
       │
       ▼ (Trigger: Vercel Active CPU > 3.5 hrs or Invocations > 800k/mo)
[Phase 2: Compute Expansion]
  - Upgrade Vercel to Pro ($20 / member / month)
  - Ceiling: ~10 to 15 Restaurants (~25,000 orders/mo)
       │
       ▼ (Trigger: MongoDB Atlas M0 connections consistently > 350 or ops/sec throttled)
[Phase 3: Dedicated Database Layer]
  - Upgrade MongoDB to Atlas M10 Dedicated (~$57 / month)
  - Ceiling: ~35 to 50 Restaurants (~75,000 orders/mo)
       │
       ▼ (Trigger: Real-time latency demands & polling costs)
[Phase 4: Dedicated Real-time & WebSocket Infrastructure]
  - Introduce Managed Realtime (Pusher / Ably @ ~$49 / month)
  - Ceiling: 100+ Restaurants
```

### Zero-Cost Strategies to Postpone Upgrades
1. **Extend OrderTracker Polling Interval:**  
   Adopting the adaptive decay pattern from `OrderNotificationProvider` inside `OrderTracker.tsx` reduces customer-generated invocations by **84%**, immediately expanding free-tier capacity to **8.5 medium restaurants**.
2. **Leverage Data Cache for Menu Context:**  
   Routing all menu and theme queries through `getCachedRestaurantMenuContext` ensures that repeat customer visits and navbar checks hit Vercel's Edge Data Cache, consuming zero database compute and minimal serverless execution time.
3. **Compress Public Image Placeholders:**  
   Compressing `dish_placeholder.jpg` from 2.74 MB down to ~40 KB WebP saves 2.7 MB per cache-miss download, preserving Vercel Fast Data Transfer runway.

### Where and What to Monitor Right Now
1. **Vercel Usage Dashboard (`vercel.com/dashboard/usage`):**
   * *Metric to watch:* **Active CPU Hours** (under Serverless Functions) and **Edge Invocations**.
   * *Alert threshold:* When Active CPU exceeds **3.0 Hours** before day 20 of the month.
2. **MongoDB Atlas Metrics (`cloud.mongodb.com`):**
   * *Metric to watch:* **Connections** and **Normalized Process CPU**.
   * *Alert threshold:* When connection peaks consistently exceed **350 connections** (approaching the 500 limit).
3. **Application Network Logs:**
   * *Metric to watch:* HTTP 401 occurrences on `/api/admin/discounts` and function durations >1,500 ms on `getOrderById`.

---

## Assumptions and Unknowns

| Item / Claim | Classification | Evidence Found | What Would Confirm It |
| :--- | :--- | :--- | :--- |
| **Vercel Hobby CPU Limit** | Verified Official Limit | Vercel pricing documentation specifies 4 Active CPU Hours & 1M invocations on Hobby plan. | Official Vercel docs (2026). |
| **MongoDB Atlas M0 Limits** | Verified Official Limit | MongoDB Atlas documentation confirms 512 MB storage and 500 max connection cap for M0. | Official MongoDB docs (2026). |
| **WhatsApp Message Cost** | Verified Code Fact | `src/lib/whatsappService.ts:59` generates `wa.me` browser URLs. Zero external API keys or SDKs exist in `package.json`. | Zero provider billing invoices; confirmed client-side dispatch. |
| **Operational Order Mix** | ASSUMPTION | Assumed a 50/50 split between walk-in counter orders (no tracking) and QR table orders based on typical QSR patterns. | Analyzing `source` field distribution (`admin_counter` vs `qr_scan`) in production DB. |
| **Customer Dwell Time** | ASSUMPTION | Assumed average active mobile browser screen time is 4 minutes before phone sleep/app switch. | Real-world telemetry from Google Analytics or Vercel Web Analytics on `/track/[orderId]`. |
| **Production MongoDB Cluster Tier**| ASSUMPTION | Assumed the current production deployment runs on an Atlas M0 Free Cluster based on repository context. | Inspecting `MONGODB_URI` environment string in Vercel project settings. |
| **POS Terminal Screen Count** | ASSUMPTION | Assumed 1 active counter terminal per venue. | Surveying restaurant operational setup. |
