# Growlic — DB & Server Call Efficiency Audit

This audit investigates the Next.js + MongoDB (Mongoose) codebase of Growlic for unnecessary database calls, unnecessary server actions, and query/render optimization bottlenecks.

---

## 1. Database Connection Management

### 1.1 — Cached/Global Mongoose Connection
**Verdict:** OPTIMAL
**Evidence:** [src/lib/mongodb.ts:14-54](file:///f:/Myprojects/growlic/src/lib/mongodb.ts#L14-L54)
```typescript
interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCached: GlobalMongoose;
}

let cached = global.mongooseCached;

if (!cached) {
  cached = global.mongooseCached = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }
  // ...
}
```
**Details:** Mongoose connections are cached in a global variable `global.mongooseCached` to prevent exponential connection growth across serverless function/hot-reload cycles.

---

### 1.2 — Database Connection Reuse
**Verdict:** OPTIMAL
**Evidence:**
- [src/features/order/repository.ts:1](file:///f:/Myprojects/growlic/src/features/order/repository.ts#L1): `import dbConnect from '@/lib/mongodb';`
- [src/features/auth/repository.ts:1](file:///f:/Myprojects/growlic/src/features/auth/repository.ts#L1): `import dbConnect from '@/lib/mongodb';`
- [src/features/menu/repositories/menuRepository.ts:1](file:///f:/Myprojects/growlic/src/features/menu/repositories/menuRepository.ts#L1): `import dbConnect from '@/lib/mongodb';`
- [src/repositories/superAdminRepository.ts:1](file:///f:/Myprojects/growlic/src/repositories/superAdminRepository.ts#L1): `import dbConnect from '@/lib/mongodb';`

**Details:** All database queries are executed inside repositories or seed scripts. Every repository function (e.g., `findAll`, `findById`, `create`) begins with `await dbConnect()`. No queries bypass the connection cache or call `mongoose.connect()` directly.

---

### 1.3 — Configuration of `maxPoolSize`
**Verdict:** NEEDS FIX
**Evidence:** [src/lib/mongodb.ts:35-38](file:///f:/Myprojects/growlic/src/lib/mongodb.ts#L35-L38)
```typescript
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => { ... });
```
**Fix:** Set an explicit, lower `maxPoolSize` in the Mongoose connection options suitable for serverless execution (e.g., 5 or 10 instead of defaulting to the MongoDB driver's default of 100):
```typescript
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    };
```
**Cost impact if unfixed:** HIGH. In serverless environments, each instance creates a pool of up to 100 connections. High concurrent requests can quickly exhaust MongoDB connection limits (e.g., MongoDB Atlas tier limits).

---

### 1.4 — Database Connection Logs/Errors
**Verdict:** OPTIMAL
**Evidence:** Checked `dev.log` and codebase.
**Details:** No errors related to `MongoServerSelectionError`, `connection pool`, or `too many connections` were found. These terms only exist in documentation files (like `docs/polling.md` and `growlicInfo.md`) discussing hypothetical scaling risks.

---

## 2. Query & Index Efficiency

### 2.1 — Index Definitions in Mongoose Models
**Verdict:** OPTIMAL
**Evidence:**
- **`Order` and `StaffCall` Models** ([src/features/order/model.ts](file:///f:/Myprojects/growlic/src/features/order/model.ts)):
  - `OrderSchema` fields: `restaurantId` (index: true), `customerPhone` (index: true), `status` (index: true).
  - Compound indexes: `{ restaurantId: 1, createdAt: -1 }` (line 61), `{ restaurantId: 1, status: 1, createdAt: -1 }` (line 62).
  - `StaffCallSchema` fields: `restaurantId` (index: true), `status` (index: true) (lines 83-85).
- **`Menu` and Upsell Models** ([src/features/menu/model.ts](file:///f:/Myprojects/growlic/src/features/menu/model.ts)):
  - `MenuSchema` fields: `restaurantId` (index: true), `category` (index: true).
  - Compound index: `{ restaurantId: 1, category: 1 }` (line 59).
  - `ComboRuleSchema` / `DiscountTierSchema` / `PairingRuleSchema` / `BannerSchema` fields: `restaurantId` (index: true).
  - `PairingRuleSchema` field: `triggerCategory` (index: true) (line 131).
- **`Customer` Model** ([src/features/customer/model.ts](file:///f:/Myprojects/growlic/src/features/customer/model.ts)):
  - `CustomerSchema` fields: `restaurantId` (index: true), `phone` (index: true).
  - Compound index: `{ restaurantId: 1, phone: 1 }` (line 30).
- **`Event` Model** ([src/features/analytics/model.ts](file:///f:/Myprojects/growlic/src/features/analytics/model.ts)):
  - `EventSchema` fields: `restaurantId` (index: true), `type` (index: true), `createdAt` (index: true).
  - Compound indexes: `{ restaurantId: 1, createdAt: -1 }` (line 21), `{ restaurantId: 1, type: 1, itemId: 1, createdAt: -1 }` (line 22).
- **`AuditLog` Model** ([src/features/audit/model.ts](file:///f:/Myprojects/growlic/src/features/audit/model.ts)):
  - Compound index: `{ restaurantId: 1, createdAt: -1 }` (line 26).

---

### 2.2 — Compound Index for `getOrderById(orderId, restaurantId)`
**Verdict:** OPTIMAL
**Evidence:** [src/features/order/repository.ts:106-116](file:///f:/Myprojects/growlic/src/features/order/repository.ts#L106-L116)
```typescript
export async function findById(restaurantId: string | undefined, id: string): Promise<IOrder | null> {
  await dbConnect();
  const query: any = { _id: id };
  if (restaurantId) {
    query.restaurantId = restaurantId.toLowerCase();
  }
  // ...
  const doc = await Order.findOne(query);
  return doc ? normalizeOrder(doc) : null;
}
```
**Details:** The query filters on `_id` and `restaurantId`. Because `_id` is automatically indexed as the unique primary key, MongoDB will use the single-key `_id` index. A compound index on `{ _id, restaurantId }` would be redundant and waste memory.

---

### 2.3 — Index Coverage for Order Status/ETA Updates
**Verdict:** OPTIMAL
**Evidence:**
- [src/features/order/repository.ts:161-168](file:///f:/Myprojects/growlic/src/features/order/repository.ts#L161-L168) (`updateStatus` filters on `{ _id: id, restaurantId }`)
- [src/features/order/repository.ts:180-192](file:///f:/Myprojects/growlic/src/features/order/repository.ts#L180-L192) (`updateEstimatedTime` filters on `{ _id: id, restaurantId }`)
- **Details:** The query uses the unique primary key `_id` index to locate and update the document. The 400ms-900ms latency observed in dev logs is due to network roundtrips, session validation, and secondary database updates (e.g. stamp earning hooks on order completion), not query execution times.

---

### 2.4 — Date Range Aggregation Caching in `getDashboardMetrics`
**Verdict:** NEEDS FIX
**Evidence:** [src/features/analytics/repository.ts:20-41](file:///f:/Myprojects/growlic/src/features/analytics/repository.ts#L20-L41)
```typescript
export async function fetchRawDashboardData(restaurantId: string, start: Date, end: Date) {
  await dbConnect();
  const [
    eventAggregation,
    orderAggregation,
    // ...
  ] = await Promise.all([
    Event.aggregate([
      {
        $match: {
          restaurantId,
          createdAt: { $gte: start, $lte: end }
        }
      },
      // ...
```
**Details:** The dashboard polls `getDashboardMetrics` every 10 seconds. Each invocation scans the `orders` and `events` collections over a 30-day range and computes complex aggregation pipelines (facets, group sums, averages) with **zero caching**. Although `createdAt` is covered by the compound indexes `{ restaurantId: 1, createdAt: -1 }`, re-executing this heavy pipeline every 10 seconds creates severe database pressure.
**Fix:** Apply caching using Next.js `unstable_cache` with a short TTL (e.g., 10 seconds matching the dashboard poll interval):
```typescript
import { unstable_cache } from 'next/cache';

export const getCachedDashboardMetrics = unstable_cache(
  async (restaurantId: string, startDateStr?: string, endDateStr?: string) => {
    return getDashboardMetrics(restaurantId, startDateStr, endDateStr);
  },
  ['dashboard-metrics'],
  { revalidate: 10 }
);
```
**Cost impact if unfixed:** HIGH. Multiple active admin tabs will flood the database with CPU-intensive aggregation queries, leading to elevated database cost and throttling.

---

### 2.5 — Status Index and Pagination in `getAdminOrders`
**Verdict:** OPTIMAL (indexes present) but NEEDS FIX (pagination efficiency)
**Evidence:** [src/features/order/repository.ts:139-146](file:///f:/Myprojects/growlic/src/features/order/repository.ts#L139-L146)
```typescript
  const totalCount = await Order.countDocuments(query);
  const findQuery = Order.find(query).sort({ createdAt: -1 });
  if (skip !== undefined) {
    findQuery.skip(skip);
  }
  if (limit !== undefined) {
    findQuery.limit(limit);
  }
```
**Fix:** The pagination uses `.skip()` and `.limit()`. As the offset grows, `.skip()` scans all preceding keys, degrading query performance. For production scaling, switch to cursor-based pagination (e.g. using `createdAt` or `_id` of the last fetched order).
**Cost impact if unfixed:** MEDIUM. Only degrades when admin orders grow into thousands of historical entries and users navigate deep into paginated history.

---

### 2.6 — Populate N+1 Query Patterns
**Verdict:** OPTIMAL
**Evidence:** No matches for `.populate` were found in the codebase.
**Details:** Growlic avoids N+1 queries by denormalizing menu item fields directly inside the `items` array of the `Order` schema (e.g., name, price, quantity are embedded).

---

## 3. Server Action / Route Duplication

### 3.1 — Dashboard Request Coalescing
**Verdict:** NEEDS FIX
**Evidence:**
- [src/features/analytics/components/DashboardPage.tsx:247-251](file:///f:/Myprojects/growlic/src/features/analytics/components/DashboardPage.tsx#L247-L251) (polls `getDashboardMetrics` every 10 seconds)
- [src/components/providers/OrderNotificationProvider.tsx:252-255](file:///f:/Myprojects/growlic/src/components/providers/OrderNotificationProvider.tsx#L252-L255) (polls `getAdminOrders` and `getPendingStaffCallsAction` in parallel every 5 seconds)
```typescript
        const [ordersResult, staffCallsResult] = await Promise.all([
          getAdminOrders(50, 0, 'received'),
          getPendingStaffCallsAction(auth.restaurantId || ''),
        ]);
```
**Details:** When an admin is on `/admin/dashboard`, these two loops run independently, triggering 3 separate server action POST requests across the network per cycle. They also run 3 redundant admin auth/session checks (`checkAdminAuth()` doing `Session.findOne` and `Admin.findOne` on each call).
**Fix:** Combine notifications and dashboard metrics into a single unified polling endpoint or server action (e.g. `getAdminDashboardHeartbeat`) to execute all queries in a single database transaction and return them in one HTTP payload.
**Cost impact if unfixed:** HIGH. Triples HTTP request volume and database auth check overhead for active dashboard tabs.

---

### 3.2 — Server-side vs. Client-side Fetch Duplication
**Verdict:** NEEDS FIX
**Evidence:**
- [src/app/menu/[slug]/page.tsx:53](file:///f:/Myprojects/growlic/src/app/menu/%5Bslug%5D/page.tsx#L53): `const context = await getRestaurantMenuContext(slug);` (Fetched server-side on initial render)
- [src/components/layout/CustomerNavbar.tsx:60-70](file:///f:/Myprojects/growlic/src/components/layout/CustomerNavbar.tsx#L60-L70) (Fetches `getRestaurantMenuContext(slug)` client-side inside `useEffect` on mount)
**Details:** When a customer visits `/menu/[slug]`, the server fetches the heavy menu context (which includes categories, active rules, banners, and upsell calculations). Immediately after mounting, the `CustomerNavbar` client component performs the exact same call again.
**Fix:** Pass down the fetched `context` or configuration parameters from the page to the Navbar component via props, Redux state, or React Context, instead of refetching it in the Navbar's local state.
**Cost impact if unfixed:** HIGH. Doubles the database read load and serverless runtime for every customer menu visit.

---

### 3.3 — Redundant Menu Context Fetches
**Verdict:** NEEDS FIX
**Evidence:** [src/app/cart/page.tsx:159-172](file:///f:/Myprojects/growlic/src/app/cart/page.tsx#L159-L172)
```typescript
  useEffect(() => {
    if (resolvedRestId) {
      setOffersLoading(true);
      getRestaurantMenuContext(resolvedRestId)
        .then((context) => { ... })
```
**Details:** The app does not cache or share the `getRestaurantMenuContext` payload globally. Moving from `/menu/[slug]` to `/cart` triggers a fresh server action execution.
**Fix:** Cache the menu context in Redux state (`redux/menuSlice.ts` or similar) on the initial load and reuse it across pages, only re-fetching if the restaurant context changes.
**Cost impact if unfixed:** MEDIUM. Triggers redundant DB fetches on client navigation.

---

## 4. Caching Layers

### 4.1 — Caching Policies
**Verdict:** NEEDS FIX
**Evidence:** No caching libraries (`unstable_cache`, `lru-cache`, `Redis`) are integrated into data fetch layers.
**Fix:** Implement caching for static/slow-moving datasets:
1. `getRestaurantMenuContext`: Apply `unstable_cache` with a 30-second TTL. Add tag revalidation triggered on menu updates.
2. `getDashboardMetrics`: Apply `unstable_cache` with a 10-second TTL.
3. `getCustomerLoyaltyInfo`: Apply `unstable_cache` with a 5-second TTL.
**Cost impact if unfixed:** HIGH. Every customer session navigation and admin poll directly hits MongoDB, generating massive read volume on static data.

---

## 5. Polling & Invocation Volume

### 5.1 — Polling System Audit
**Verdict:** OPTIMAL
**Evidence:**
- **Admin Alert Loop:** [OrderNotificationProvider.tsx:273-285](file:///f:/Myprojects/growlic/src/components/providers/OrderNotificationProvider.tsx#L273-L285) clears the interval when active alerts hit zero. It wakes up based on user `focus` or `click` event listeners on the `window` object.
- **Customer Loop:** [OrderTracker.tsx:80-82](file:///f:/Myprojects/growlic/src/features/order/components/OrderTracker.tsx#L80-L82) returns early and avoids scheduling `setInterval` if the order status is terminal (`completed` or `cancelled`).
- **Intervals:** Both loops run on a 5-second interval when active.

---

### 5.2 — Database Round-Trip Estimation (1 Admin & 1 Customer)
**Verdict:** NEEDS FIX

#### Active Admin Dashboard Session (1 hour):
- **Alert Loop (every 5s):** 720 polls/hour.
  - Each poll does `Promise.all` containing `getAdminOrders` and `getPendingStaffCallsAction`.
  - Auth checks: 2 actions $\times$ (1 `Session.findOne` + 1 `Admin.findOne`) = 4 DB queries.
  - Query checks: 1 `Order.countDocuments` + 1 `Order.find` + 1 `StaffCall.find` = 3 DB queries.
  - Total alert queries = 7 DB queries $\times$ 720 = **5,040 DB queries/hour**.
- **Metrics Loop (every 10s):** 360 polls/hour.
  - Auth checks: 1 `Session.findOne` + 1 `Admin.findOne` = 2 DB queries.
  - Aggregation queries: `Event.aggregate`, `Order.aggregate`, `Order.find` (recent completed), `Order.countDocuments` (pending count), `Customer.countDocuments` (total count), `MenuItem.find` (all items), `PairingRule.find`, `ComboRule.find`, `DiscountTier.find` = 9 DB queries.
  - Repeating Customer Lookup: `Customer.find` = 1 DB query.
  - Total metrics queries = 12 DB queries $\times$ 360 = **4,320 DB queries/hour**.
- **Grand Total for 1 Admin Session:** **9,360 DB queries per hour**!

#### Customer Tracker Session (25-minute lifecycle):
- **Order Polls (every 5s):** 300 polls.
  - Each poll does 1 DB query (`Order.findOne` via `getOrderById`).
  - Total tracker queries = **300 DB queries**.
- **Loyalty Call (on load):** 1 call.
  - Triggers 2 DB queries (`Customer.findOne` + `Admin.findOne`).
- **Total Customer Queries:** **302 DB queries**.

---

### 5.3 — Tab De-duplication
**Verdict:** NEEDS FIX
**Evidence:** Both components use local React state with standard `setInterval`. There is no cross-tab de-duplication. If an admin opens 3 browser tabs of the dashboard, the queries will triple (hitting ~28,000 DB queries/hour).
**Fix:** Implement a `BroadcastChannel` or `SharedWorker` to elect a "leader" tab that runs the polling loops and broadcasts data to other tabs.
**Cost impact if unfixed:** MEDIUM. Occurs when users open multiple browser tabs.

---

## 6. `proxy.ts` / Middleware Overhead

### 6.1 — Full Contents of `proxy.ts`
**Verdict:** NEEDS FIX (File completely bypassed by Next.js due to incorrect path/naming!)
**Evidence:** [src/proxy.ts:1-105](file:///f:/Myprojects/growlic/src/proxy.ts#L1-L105)
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'growlic_secret_key_12345';

async function verifyTokenEdge(token: string, secret: string): Promise<any | null> {
  // ... Cryptographic base64 decode and crypto.subtle.verify signature checks
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('admin_token')?.value;

  if (pathname.startsWith('/super-admin')) { ... }
  if (pathname.startsWith('/admin') && !isAuthPage) { ... }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*'],
};
```
**Fix:** Next.js expects the middleware file to be named `middleware.ts` (or `.js`) in the root or `src/` directory, exporting a function named `middleware` (or default). Currently, it is named `src/proxy.ts` and exports `proxy`.
1. Rename `src/proxy.ts` to `src/middleware.ts`.
2. Rename the exported function `proxy` to `middleware`:
```typescript
export async function middleware(request: NextRequest) {
  // ...
}
```
**Cost impact if unfixed:** HIGH. Since the middleware is bypassed, there is no edge-level route protection. Unauthenticated clients can load admin route files (though API operations will fail due to action-level checks).

---

### 6.2 — Middleware Spikes
**Verdict:** OPTIMAL
**Evidence:**
- Spikes of 900ms-2.3s inside Next.js dev logs are due to dev-only module compilation. The edge-native `crypto.subtle` operations are extremely fast and will run under 10ms in production.
- No database queries or external network requests are made in `proxy.ts`.

---

### 6.3 — Session Verification Caching
**Verdict:** NEEDS FIX
**Evidence:** [src/actions/orders.ts:19-42](file:///f:/Myprojects/growlic/src/actions/orders.ts#L19-L42)
```typescript
async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  // ...
  const decoded = verifyToken(token);
  const isValid = await validateSession(decoded.restaurantId, token); // DB check
  const admin = await getAdminByRestaurantId(decoded.restaurantId); // DB check
  return { ...decoded, token, userId: admin._id };
}
```
**Details:** Every Server Action independently runs `checkAdminAuth`, which executes two queries against MongoDB (`Session` and `Admin`). Because parallel actions execute in separate HTTP requests, they duplicate this auth lookup.
**Fix:** Apply React `cache` to the `checkAdminAuth` helper (or cache the repository lookup functions `validateSession` and `getAdminByRestaurantId` for the request duration) to deduplicate session lookups during concurrent page fetches.
**Cost impact if unfixed:** HIGH. Multiplies database authentication queries on every server invocation.

---

## 7. Client-Side Re-renders

### 7.1 — Inline Callback Props
**Verdict:** NEEDS FIX
**Evidence:** [src/components/providers/OrderNotificationProvider.tsx:366-373](file:///f:/Myprojects/growlic/src/components/providers/OrderNotificationProvider.tsx#L366-L373)
```typescript
  return (
    <OrderNotificationContext.Provider
      value={{
        activeAlertOrders,
        acknowledgeOrder,
        stopAllAlerts,
        audioUnlocked,
      }}
    >
```
**Details:** The context `value` is created as an inline object. The callbacks `acknowledgeOrder` and `stopAllAlerts` are not memoized. Any state update in the provider causes all consumers of `useOrderNotification` to re-render.
**Fix:** Wrap the callbacks in `useCallback` and the value object in `useMemo`:
```typescript
  const acknowledgeOrder = useCallback((orderId: string) => {
    // ...
  }, [acknowledgedIds]);

  const stopAllAlerts = useCallback(() => {
    // ...
  }, [activeAlertOrders, acknowledgedIds]);

  const contextValue = useMemo(() => ({
    activeAlertOrders,
    acknowledgeOrder,
    stopAllAlerts,
    audioUnlocked,
  }), [activeAlertOrders, acknowledgeOrder, stopAllAlerts, audioUnlocked]);

  return (
    <OrderNotificationContext.Provider value={contextValue}>
      {children}
    </OrderNotificationContext.Provider>
  );
```
**Cost impact if unfixed:** LOW. Causes minor CPU churn on clients during poll ticks.

---

### 7.2 — Subtree Memoization
**Verdict:** NEEDS FIX
**Evidence:** [src/features/analytics/components/DashboardPage.tsx](file:///f:/Myprojects/growlic/src/features/analytics/components/DashboardPage.tsx) is a single, massive 1114-line component without internal subcomponent splitting or `React.memo` wrappers.
**Fix:** Split the dashboard into functional child components (e.g., `HeatmapTable`, `OrdersTable`, `MetricsGrid`) and wrap them in `React.memo` to prevent full layout re-renders on poll updates if the metric values remain identical.
**Cost impact if unfixed:** MEDIUM. Higher client CPU overhead on slower devices during dashboard updates.

---

## 8. Environment / Deployment Config

### 8.1 — Vercel Plan and Fluid Compute
**Verdict:** UNKNOWN
**Evidence:** These deployment parameters are configured directly in the Vercel console dashboard and are not defined inside the project's repository source files.

---

### 8.2 — Edge vs. Node.js Runtime
**Verdict:** OPTIMAL
**Evidence:** Checked routes in `src/app`. No route file defines `export const runtime = 'edge'`.
**Details:** All DB-calling routes default to Node.js. This is appropriate as Mongoose requires Node.js sockets to connect to MongoDB, which is unsupported on the Edge runtime without special proxies.

---

### 8.3 — Scope Isolation of Environment Variables
**Verdict:** OPTIMAL
**Evidence:** [f:\Myprojects\growlic\.env.local](file:///f:/Myprojects/growlic/.env.local) defines local connection parameters:
```
MONGODB_URI=mongodb://localhost:27017/growlic
JWT_SECRET=growlic_super_secret_jwt_key_98765
```
**Details:** Local database connections are isolated to a localhost MongoDB instance and separate JWT secrets, preventing dev/production collision.

---

## PRIORITIZED FIX LIST

1. **Rename proxy to middleware**
   - **Cost impact:** HIGH
   - **Ease of fix:** VERY EASY
   - **Target:** Rename `src/proxy.ts` to `src/middleware.ts` and change export name to `middleware`.

2. **Add Caching for Menu Context & Dashboard Aggregations**
   - **Cost impact:** HIGH
   - **Ease of fix:** EASY
   - **Target:** Wrap `getRestaurantMenuContext` and `getDashboardMetrics` in Next.js `unstable_cache`.

3. **Coalesce Dashboard & Notification Queries**
   - **Cost impact:** HIGH
   - **Ease of fix:** MEDIUM
   - **Target:** Combine notification fetching and metrics fetching into a single unified action or REST endpoint.

4. **Deduplicate Server Action Session Verification**
   - **Cost impact:** HIGH
   - **Ease of fix:** MEDIUM
   - **Target:** Apply React `cache` to database lookup helpers inside `checkAdminAuth`.

5. **Eliminate Customer Menu Context Fetch Duplication**
   - **Cost impact:** HIGH
   - **Ease of fix:** MEDIUM
   - **Target:** Pass menu context from Server component page down to `CustomerNavbar` client component.

6. **Set Explicit Mongoose maxPoolSize**
   - **Cost impact:** HIGH
   - **Ease of fix:** VERY EASY
   - **Target:** Set `maxPoolSize: 10` inside `src/lib/mongodb.ts`.

7. **Memoize Context Value and Provider Callbacks**
   - **Cost impact:** MEDIUM
   - **Ease of fix:** EASY
   - **Target:** Wrap context functions in `useCallback` and the value object in `useMemo` in `OrderNotificationProvider.tsx`.

8. **De-duplicate Polling Across Open Tabs**
   - **Cost impact:** MEDIUM
   - **Ease of fix:** HARD
   - **Target:** Use a `BroadcastChannel` in `OrderNotificationProvider.tsx` to prevent parallel requests from multiple open tabs.
