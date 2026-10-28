# Static Code Inventory & Query Audit

**Method:** Read-only AST and source code analysis across Next.js Server Actions, API routes, middleware, service worker, Redux/SWR client caches, and Mongoose models.  
**Target Architecture:** Next.js 16 (App Router) + Mongoose 9.7 + MongoDB Atlas / Local + Vercel Serverless.

---

## 1. Summary of Identified Architectural Bottlenecks & Code Smells

| Category | Finding | Affected Endpoints / Files | Impact |
| :--- | :--- | :--- | :--- |
| **Unbounded Query** | `Customer.find({ restaurantId }).lean()` without `limit` or DB pagination | `src/features/customer/services/customerAnalyticsService.ts` (`getCustomerListWithSegments`, `calculateVipLtvThreshold`, `getCustomerAnalytics`) | Pulls all 3,000–50,000 customer records into Node.js heap; filters, sorts, and slices in memory. |
| **Unbounded Query** | `Order.find({ restaurantId, createdAt: { $gte: 185_days_ago } })` | `src/features/analytics/repository.ts` (`fetchRawDashboardData`) | Queries up to 6 months of historical orders (~20,000–100,000 records) to compute daily multi-period delta. |
| **Heavy Aggregation on Hot Path** | 11 concurrent DB operations via `Promise.all` ($facet, 8-pipeline groups, 185-day match) | `src/features/analytics/repository.ts` (`fetchRawDashboardData`) | High CPU spike, executes multiple unindexed unwinds (`$unwind: '$items'`) and group operations. |
| **Repeated Auth Overhead** | Every single Server Action calls `checkAdminAuth()`, issuing 2 DB round-trips (`validateSession` + `getAdminByRestaurantId`) | `src/actions/orders.ts`, `src/actions/auth.ts`, `src/actions/menu.ts`, `src/actions/expense.ts`, `src/actions/inventory.ts` | 2 additional DB queries per user action. While session validation has a 30s in-memory cache, on Vercel cold instances it misses. |
| **Duplicated DB Fetch** | `getRestaurantDetails()` calls `checkAdminAuth()` (which queries `Admin`) and then immediately queries `Admin` a 2nd time | `src/actions/auth.ts:86-98` | 100% redundant database query for the identical document on the same tick. |
| **Missing Index / Non-Optimal Index** | `{ source: { $ne: 'admin_counter' } }` used for QR scan orders filter | `src/features/order/repository.ts:401` | `$ne` operator cannot utilize equality B-tree index lookup; forces partial or multi-key index scan. |
| **Unindexed Sub-document Search** | `{ 'items.originatedFromNudge': true, 'items.nudgeRuleId': { $ne: null } }` | `src/features/analytics/repository.ts:170` | Sub-document array element match has no supporting compound index. |
| **N+1 Pattern Risk** | Loyalty stamp checks loop and fetch customer record on completion | `src/features/order/service.ts:358-375` | On batch status updates, individual `findByPhone` calls occur in a non-bulk manner. |

---

## 2. Server Actions Inventory (`src/actions/*`)

| File & Action | What It Calls (Internal Repos / Services) | DB Collections | Query Filter & Sort | Cached? | Flags / Performance Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/actions/auth.ts`<br>`getRestaurantDetails()` | `checkAdminAuth()`, `getAdminByRestaurantId()` | `sessions`, `admins` | `findSessionByTokenHash({ restaurantId, tokenHash })`<br>`Admin.findOne({ restaurantId })` (Called TWICE) | In-memory session cache (30s) | **Duplicated Fetch:** Queries `Admin` collection twice in same action call. |
| `src/actions/auth.ts`<br>`saveRestaurantBranding()` | `checkAdminAuth()`, `can()`, `updateRestaurantBranding()` | `sessions`, `admins` | `Admin.findOneAndUpdate({ restaurantId }, ...)` | Path revalidation: `/admin/settings`, `/menu/[id]`, `/cart` | Auth overhead: 2 DB queries before mutation. |
| `src/actions/auth.ts`<br>`getPublicRestaurantSettings()` | `getAdminByRestaurantId()` | `admins` | `Admin.findOne({ restaurantId })` | None | Public action, no cache header. Atlas roundtrip on every public QR menu load. |
| `src/actions/orders.ts`<br>`createOrder()` | `checkAndIncrementRateLimit()`, `customerRepo.upsertCustomer()`, `orderService.createOrder()`, `logAction()`, WebSocket/Push | `rate_limits`, `customers`, `orders`, `audit_logs` | `Customer.findOneAndUpdate({ restaurantId, phone })`<br>`Order.create(...)`<br>`AuditLog.create(...)` | In-memory client cache (`orderClientCache.prependOrderToCache`) | Multi-collection transaction without MongoDB session; 3 writes per order. |
| `src/actions/orders.ts`<br>`getAdminOrders()` | `checkAdminAuth()`, `orderService.getAdminOrders()`, `getKitchenStats()` | `sessions`, `admins`, `orders` | `Order.find({ restaurantId, status, source, createdAt }).sort({ createdAt: -1 }).skip().limit()`<br>`Order.countDocuments(...)`<br>`Order.aggregate([$group KitchenStats])` | SWR Client cache (30s TTL in `orderClientCache.ts`), Server-side kitchen stats (30s) | **$ne filter:** QR tab uses `{ source: { $ne: 'admin_counter' } }`. High concurrency contention. |
| `src/actions/orders.ts`<br>`updateOrderStatus()` | `checkAdminAuth()`, `orderService.updateOrderStatus()`, `customerRepo.findByPhone()` (if completed) | `sessions`, `admins`, `orders`, `customers` | `Order.findOne({ restaurantId, _id })`<br>`Order.findOneAndUpdate(...)`<br>`Customer.findOne(...)` | Client cache updated via `updateOrderInCache` | Executes 4 sequential DB calls on completion (auth + find order + update + loyalty check). |
| `src/actions/menu.ts`<br>`getMenuItems()` | `menuService.getMenuItems(restaurantId)` | `menus` | `Menu.find({ restaurantId, active: true })` | Public Next.js `revalidateTag` (`menu-[id]`) | **Unbounded Query:** Returns all menu items without pagination. (Acceptable for small menus ~200 items, but increases payload size). |
| `src/actions/menu.ts`<br>`createMenuItem()` | `checkAdminAuth()`, `menuService.createMenuItem()`, `logAction()` | `sessions`, `admins`, `menus`, `audit_logs` | `Menu.create(...)` | Tags invalidated | Auth check overhead. |
| `src/actions/menu.ts`<br>`updateMenuItem()` | `checkAdminAuth()`, `menuService.updateMenuItem()` | `sessions`, `admins`, `menus` | `Menu.findOneAndUpdate({ _id, restaurantId })` | Tags invalidated | Supported by index. |
| `src/actions/customers.ts`<br>`getCustomersWithSegmentsAction()` | `checkAdminAuth()`, `getCustomerListWithSegments()` | `sessions`, `customers` | `Customer.find({ restaurantId }).lean()` (ALL RECORDS) | None | **Critical Unbounded Query:** Slices and filters thousands of customer records in JS memory. |
| `src/actions/customers.ts`<br>`getCustomerDetailAction()` | `checkAdminAuth()`, `getCustomerDetail()` | `sessions`, `customers`, `orders` | `Customer.findOne({ restaurantId, phone })`<br>`Order.find({ restaurantId, customerPhone, status: { $nin: [...] } })` | None | Fetches all order history for single customer into JS memory to compute RFM insights. |
| `src/actions/customers.ts`<br>`getCustomerVisitHistoryAction()` | `checkAdminAuth()`, `getCustomerVisitHistory()` | `sessions`, `orders` | `Order.countDocuments(...)`<br>`Order.find(...).sort({ createdAt: -1 }).skip().limit()` | None | Supported by `{ restaurantId: 1, customerPhone: 1, createdAt: -1 }`. |
| `src/actions/customers.ts`<br>`getCustomerAnalyticsAction()` | `checkAdminAuth()`, `getCustomerAnalytics()` | `sessions`, `customers`, `orders` | `Customer.find({ restaurantId }).lean()`<br>`Order.find({ restaurantId, status: { $nin: [...] } })` | In-memory cache (60s TTL) | **Critical Unbounded Query & Aggregation:** Fetches all historical orders and customers. Memory spike. |
| `src/actions/expense.ts`<br>`getExpenseSummaryAction()` | `checkAdminAuth()`, `expenseService.getSummary()` | `sessions`, `admins`, `expenses` | `Expense.aggregate([$match, $group])` | None | Aggregation across selected date bounds. |

---

## 3. REST API Routes (`src/app/api/*`)

| Route | Method | DB Collections | Query / Action | Middleware / Auth | Caching |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth` / `/api/auth/login` | POST | `rate_limits`, `admins`, `sessions` | `Admin.findOne({ email })`, `Session.create(...)`, `bcrypt.compare` | Rate limited: 5 attempts/min in Mongo TTL | No HTTP cache, sets `httpOnly` `admin_token` |
| `/api/admin/orders` | GET | `admins`, `orders` | `can(...)`, `orderService.getAdminOrders(...)` | Header JWT or Cookie + permission check | None |
| `/api/customer/orders` | POST | `customers`, `orders` | `orderService.createOrder(...)` | Open to customer QR guests | None |
| `/api/manifest` | GET | `admins` | `Admin.findOne({ restaurantId })` | Public | Cache-Control: `public, max-age=3600` |
| `/api/admin/staff-calls` | GET / PATCH | `staff_calls` | `StaffCall.find({ restaurantId, status })` | Auth check via JWT | None |

---

## 4. Middleware & Service Worker Audit

### A. Next.js Middleware (`src/middleware.ts`)
- **Execution Target:** Edge Runtime (Vercel Edge Network).
- **Matching Routes:** `/`, `/admin`, `/admin/:path*`, `/super-admin/:path*`, `/api/:path*`.
- **Logic:**
  - Performs root redirect `/` -> `/menu/tokyo-momos`.
  - Verifies JWT in Edge Web Crypto via HMAC SHA-256 (`verifyTokenEdge`).
  - **Server Action Bypass:** Explicitly checks `request.headers.has('next-action') || request.headers.has('x-action-id')` and immediately returns `NextResponse.next()`. Thus, Server Actions bypass Edge middleware token decode and rely on internal Node runtime `checkAdminAuth()`.

### B. Service Worker (`public/sw.js` & `src/components/providers/PwaProvider.tsx`)
- **Active in Dev:** **YES.** `PwaProvider.tsx:29` does not check `process.env.NODE_ENV !== 'production'`. It registers `/sw.js` on `window.addEventListener('load')` in both development and production.
- **Admin Pages & Server Actions Interception:**
  - `sw.js:60-74`: Intercepts `fetch` events. If `event.request.method !== 'GET'` or URL starts with `/api` or includes `text/html` accept header:
    ```js
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    ```
  - **Intercepted:** YES (The fetch event is routed through the Service Worker thread).
  - **Cached:** **NO.** Server Action POSTs (`method === 'POST'`) and Admin HTML pages are handled via **Network-First** and are **never written** to `caches.open(CACHE_NAME)` upon success. Only static assets (`.js`, `.css`, fonts, images) are cached via Cache-First (`sw.js:89-118`).
  - **Worker Thread Overhead:** Intercepting dynamic POSTs without caching introduces an IPC hop between browser UI thread, service worker context, and browser networking stack.

---

## 5. Client & Server Polling, Timers, and Caches

| Name / Component | Mechanism | Frequency / TTL | Network Impact | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `OrdersPage.tsx` prep stopwatch | `setInterval` | 1,000 ms (1s) | **0 network calls** (pure local state calculation) | Live display of elapsed minutes/seconds on kitchen cards. Auto-clears at 60 mins. |
| `orderClientCache.ts` (`ordersCache`) | In-memory `Map<string, CachedOrdersData>` | 30,000 ms (30s) TTL | **Eliminates redundant network requests** on rapid tab switching (QR <-> Counter). | Client-side tab cache for SWR navigation. |
| `orderClientCache.ts` (`posMenuCache`) | In-memory `CachedPosMenu` | 180,000 ms (3m) TTL | **Prefetches POS items** on mount; suppresses duplicate hover requests if < 120s old. | Instant opening of New Counter Order modal. |
| `customerAnalyticsService.ts` (`vipThresholdCache`) | Server-side in-memory `Map` | 300,000 ms (5m) TTL | Suppresses repeated `Customer.find()` runs on the same server instance. | VIP percentile threshold calculation. |
| `customerAnalyticsService.ts` (`analyticsCache`) | Server-side in-memory `Map` | 60,000 ms (60s) TTL | Caches heavy cohort and Pareto aggregations for 1 minute per process. | Customer Analytics dashboard. |
| `OrderNotificationProvider.tsx` | WebSocket (`ws://` / Pusher) + FCM | Push on-demand | Real-time push, eliminates continuous HTTP polling loops. | Instant kitchen order ringing and badge notification. |
| `OrderTracker.tsx` customer tracker | `setInterval` | 5,000 ms (5s) | Periodic check of local time remaining on customer order tracker screen. | Progress bar animation. |

---

## 6. Question Diagnostic: Why Hovering "+ New Counter Order" Does Not Trigger Prefetch POST

- **Location:** `src/features/order/components/OrdersPage.tsx:1701 & 1834`
  ```tsx
  <Link
    href="/admin/orders/new"
    onMouseEnter={() => { if (restaurantId) prefetchPosMenu(restaurantId); }}
    ...
  >
  ```
- **Underlying Function:** `src/features/order/services/orderClientCache.ts:122-144`
  ```ts
  export async function prefetchPosMenu(restaurantId: string): Promise<void> {
    if (!restaurantId) return;
    if (posMenuCache && Date.now() - posMenuCache.timestamp < 120000) {
      return; // Line 125: CACHE CONSIDERED FRESH!
    }
    ...
  }
  ```
- **Root Cause Determination:**
  1. **Cache Considered Fresh:** When `OrdersPage.tsx` initially mounts, its `useEffect` (`OrdersPage.tsx:1034 & 1049`) automatically executes `prefetchPosMenu(restaurantId)` in the background as soon as `restaurantId` resolves.
  2. This initial fetch successfully sets `posMenuCache` with `timestamp: Date.now()`.
  3. When the user subsequently hovers over "+ New Counter Order", the `onMouseEnter` handler fires correctly, but line 125 checks `Date.now() - posMenuCache.timestamp < 120000`. Because the cache was already seeded seconds earlier on page mount, it immediately returns early without issuing any HTTP POST request.
  4. Next.js `<Link>` component on hover only prefetches the Next.js RSC payload / JS route chunk (`GET /admin/orders/new?_rsc=...`), not Server Action POSTs.
  5. **Click Behavior:** When the user clicks the link and navigates to `/admin/orders/new`, `CounterOrderForm.tsx` mounts. In `CounterOrderForm.tsx:110-130`, the `useEffect` runs unconditionally on mount:
     ```ts
     Promise.all([
       getMenuItems(auth.restaurantId),
       getRestaurantDetails(),
     ])
     ```
     Even though `getCachedPosMenu()` is read at line 56, the `useEffect` does NOT guard against `cachedPos` and unconditionally executes the two Server Actions, **firing two HTTP POST requests to the backend upon click navigation!**
