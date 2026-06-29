# API & Server Action Inventory Analysis

This document catalogues every REST API endpoint and Server Action, documenting their payloads, execution times, query overheads, and potential optimizations.

---

## 1. REST API Endpoint Inventory

| Endpoint | Method | Purpose | Invoked By | Est. Payload | Database Queries | Cacheable | Priority | Optimization Opportunity |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `/api/auth` | `POST` | Authenticates admin login, sets JWT session token cookie. | Admin Login Screen | Client: 100B<br>Server: 200B | `Admin.findOne`<br>`Session.create` | No | Critical | Add rate limiting via Middleware to prevent brute-force credential scans. |
| `/api/auth/logout` | `POST` | Clears local cookie state and revokes session. | Sidebar Logout | Client: 0B<br>Server: 50B | `Session.findOneAndUpdate` (Revoke) | No | High | Simple operation; no optimizations needed. |
| `/api/auth/register` | `POST` | Registers new restaurant, signs owner profile, triggers seeder. | Onboarding Screen | Client: 150B<br>Server: 100B | `Admin.findOne`<br>`Admin.create`<br>Multiple seeder writes | No | Medium | Move starter menu seeder writes to an asynchronous worker to reduce onboarding response latency. |
| `/api/seed` | `POST` | Resets and seeds defaults for a restaurant. | Seeder Utility | Client: 0B<br>Server: 2KB | Clear tables + bulk inserts | No | Low | Deactivate endpoint in production builds to prevent accidental tenant resets. |
| `/api/super-admin/overview` | `GET` | Aggregates global system KPI reports (GMV, AOV). | Super-Admin Dashboard | Client: 0B<br>Server: 3KB | Aggregations on `Admin`, `Order`, `MenuItem` | Yes (5m) | Medium | Cache responses for 5 minutes; data does not require real-time accuracy. |
| `/api/super-admin/restaurants` | `GET` | Lists all tenants, locations, setup scores. | Super-Admin Panel | Client: 0B<br>Server: 5KB | Reads and setups aggregates | Yes (5m) | Medium | Cache responses to reduce load on database threads. |

---

## 2. Server Action Inventory

### Customer Operations

#### `createOrder`
*   **Purpose**: Validates cart inputs, logs customer profile, processes rules, and saves the order.
*   **Files Invoking**: `src/features/order/components/CheckoutModal.tsx`
*   **Database Queries**:
    1.  `Customer.findOne({ restaurantId, phone })`
    2.  `Customer.findOneAndUpdate` (Upsert spend totals)
    3.  `Order.create` (Save order subdocuments)
*   **Execution Time**: ~120ms.
*   **Cacheable**: No (Requires absolute transactional consistency).
*   **Optimizations**: Use atomic updates (`$inc`) for customer metrics to prevent write race conditions.

#### `getOrderById`
*   **Purpose**: Retrieves a single order record for live status updates.
*   **Files Invoking**: `src/features/order/components/OrderTracker.tsx`
*   **Database Queries**: `Order.findOne({ _id })`
*   **Execution Time**: ~20ms.
*   **Cacheable**: No (Updates in real-time as kitchen completes stages).

#### `logEvent`
*   **Purpose**: Captures page views, click behaviors, and recommendations impressions.
*   **Files Invoking**: Menu detail pages, cart buttons.
*   **Database Queries**: `Event.create(...)`
*   **Execution Time**: ~10ms.
*   **Cacheable**: No.
*   **Optimizations**: Offload writes to an asynchronous queue (e.g., BullMQ) to avoid blocking main thread execution.

---

### Admin Operations

#### `getAdminOrders`
*   **Purpose**: Fetches paginated, filtered order logs for the admin panel.
*   **Files Invoking**: `src/features/order/components/OrdersPage.tsx`
*   **Database Queries**:
    1.  `Order.countDocuments(query)`
    2.  `Order.find(query).skip(skip).limit(limit)`
*   **Execution Time**: ~40ms.
*   **Cacheable**: No.

#### `updateOrderStatus`
*   **Purpose**: Progresses order workflow state and logs the action.
*   **Files Invoking**: `<OrdersPage />` control buttons.
*   **Database Queries**:
    1.  `Order.findOneAndUpdate({ _id })`
    2.  `AuditLog.create`
*   **Execution Time**: ~50ms.

#### `getDashboardMetrics`
*   **Purpose**: Generates heatmaps and conversion metrics.
*   **Files Invoking**: `src/features/analytics/components/DashboardPage.tsx`
*   **Database Queries**: Fetches raw `Order` and `Event` collections, iterating in-memory.
*   **Execution Time**: ~150ms (increases with dataset size).
*   **Cacheable**: Yes (Cache for 1-5 minutes).
*   **Optimizations**: Rewrite the in-memory JavaScript aggregates into native MongoDB `$facet` aggregation pipelines.
