# Database & Query Performance Analysis (explain & $indexStats)

**Database Target:** `mongodb://localhost:27017/growlic_perf_test`  
**Tenant Evaluated:** `perf_rest_001` (20,000 orders, 3,000 customers, 200 menu items)

---

## 1. Query Execution Statistics (explain("executionStats"))

| Query Description | Collection | Index Used | Keys Examined | Docs Examined | Returned | Exec Time (ms) | COLLSCAN? | In-Memory SORT? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Kitchen Orders: All Statuses (Recent first)** | `orders` | `restaurantId_1_createdAt_-1` | 25 | 25 | 25 | 79 ms | NO | NO |
| **Kitchen Orders: Status Received** | `orders` | `restaurantId_1_status_1_createdAt_-1` | 25 | 25 | 25 | 60 ms | NO | NO |
| **Kitchen Orders: Counter Orders Tab** | `orders` | `restaurantId_1_source_1_createdAt_-1` | 25 | 25 | 25 | 10 ms | NO | NO |
| **Kitchen Orders: QR Scan Tab ($ne filter)** | `orders` | `restaurantId_1_createdAt_-1` | 25 | 25 | 25 | 13 ms | NO | NO |
| **Kitchen Orders: Delayed Orders Tab** | `orders` | `restaurantId_1_isDelayed_1_createdAt_-1` | 25 | 25 | 25 | 11 ms | NO | NO |
| **Kitchen Orders: Today Filter** | `orders` | `restaurantId_1_createdAt_-1` | 25 | 25 | 25 | 7 ms | NO | NO |
| **Customer List & VIP Threshold (Unbounded Query)** | `customers` | `restaurantId_1_totalSpent_-1` | 3000 | 3000 | 3000 | 34 ms | NO | NO |
| **Customer Lookup by Phone** | `customers` | `restaurantId_1_phone_1` | 1 | 1 | 1 | 1 ms | NO | NO |
| **Menu Items List (Unbounded by category)** | `menus` | `restaurantId_1` | 200 | 200 | 200 | 11 ms | NO | NO |
| **Admin Auth Lookup by Email** | `admins` | `email_1` | 1 | 1 | 1 | 1 ms | NO | NO |
| **Session Token Validation** | `sessions` | `tokenHash_1` | 0 | 0 | 0 | 0 ms | NO | NO |
| **Analytics Orders (Past 185 Days Aggregation Match)** | `orders` | `restaurantId_1_createdAt_-1` | 20000 | 20000 | 19800 | 166 ms | NO | NO |

---

## 2. Document Size Distributions & Storage Growth Projections

| Document Type | Sample Count | Avg Doc Size | Min Doc Size | Max Doc Size | Projected Docs / Year (150/day) | Projected Data Size / Year |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Orders** | 1,000 | **1202 bytes** | 976 bytes | 1442 bytes | 54,750 orders | **62.76 MB / year** |
| **Customers** | 1,000 | **480 bytes** | 471 bytes | 491 bytes | ~3,000 customers | **1.37 MB / year** |
| **Total Per Restaurant** | — | — | — | — | — | **~64.13 MB / year** |

> [!NOTE]
> Including standard MongoDB index overhead (~35–45% of data size on Atlas WiredTiger), one restaurant generates **~89.8 MB** of combined disk and index footprint per year.
> On **MongoDB Atlas M0 (512 MB free tier)**, storage capacity will support ~3–4 restaurants for 1 year before hitting disk quotas.

---

## 3. Existing Index Usage ($indexStats) & Unused Indexes

### Orders Collection
| Index Name | Accesses (Ops) | Since | Status |
| :--- | :--- | :--- | :--- |
| `source_1` | 0 | Thu Oct 22 2026 17:37:00 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `restaurantId_1_status_1_createdAt_-1` | 0 | Thu Oct 22 2026 17:37:03 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `restaurantId_1_source_1_status_1_createdAt_-1` | 0 | Thu Oct 22 2026 17:37:03 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `restaurantId_1_source_1_createdAt_-1` | 0 | Thu Oct 22 2026 17:37:03 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `restaurantId_1_source_1_isDelayed_1_createdAt_-1` | 0 | Thu Oct 22 2026 17:37:03 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `restaurantId_1_isDelayed_1_createdAt_-1` | 0 | Thu Oct 22 2026 17:37:03 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `restaurantId_1` | 1 | Thu Oct 22 2026 17:37:00 GMT+0530 (India Standard Time) | Active |
| `_id_` | 0 | Thu Oct 22 2026 17:37:00 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `restaurantId_1_customerPhone_1_createdAt_-1` | 0 | Thu Oct 22 2026 17:37:03 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `customerPhone_1` | 0 | Thu Oct 22 2026 17:37:00 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `restaurantId_1_createdAt_-1` | 0 | Thu Oct 22 2026 17:37:03 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `status_1` | 0 | Thu Oct 22 2026 17:37:00 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `trackingToken_1` | 0 | Thu Oct 22 2026 17:37:03 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `isDelayed_1` | 0 | Thu Oct 22 2026 17:37:01 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `restaurantId_1_customerPhone_1_status_1_createdAt_-1` | 0 | Thu Oct 22 2026 17:37:03 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |

### Customers Collection
| Index Name | Accesses (Ops) | Since | Status |
| :--- | :--- | :--- | :--- |
| `restaurantId_1_totalSpent_-1` | 0 | Thu Oct 22 2026 17:37:00 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `restaurantId_1` | 1 | Thu Oct 22 2026 17:37:00 GMT+0530 (India Standard Time) | Active |
| `restaurantId_1_lastOrderDate_-1` | 0 | Thu Oct 22 2026 17:37:01 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `restaurantId_1_createdAt_-1` | 0 | Thu Oct 22 2026 17:37:01 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `restaurantId_1_phone_1` | 0 | Thu Oct 22 2026 17:37:00 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `phone_1` | 0 | Thu Oct 22 2026 17:37:00 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |
| `_id_` | 0 | Thu Oct 22 2026 17:37:00 GMT+0530 (India Standard Time) | ⚠️ Unused in current run |

---

## 4. Proposed Database Index Definitions (Text-Only / Not Applied)

To eliminate the detected COLLSCANs and In-Memory Sorts, the following indexes are proposed:

### 1. Kitchen QR Tab ($ne Optimization)
```javascript
// Current query uses { source: { $ne: 'admin_counter' } }
// Proposal: Store source as exact enum ('qr_scan') and query with equality:
// db.orders.createIndex({ restaurantId: 1, source: 1, status: 1, createdAt: -1 });
```

### 2. Multi-Period Analytics 185-Day Query
```javascript
// Supports: { restaurantId: 1, createdAt: { $gte: ... }, status: { $ne: 'cancelled' } }
// Proposal:
// db.orders.createIndex({ restaurantId: 1, createdAt: -1, status: 1 });
```

### 3. Customer Analytics Spend & Order Traversal
```javascript
// Supports: { restaurantId: 1, totalSpent: -1, lastOrderDate: -1 }
// Proposal:
// db.customers.createIndex({ restaurantId: 1, totalSpent: -1, lastOrderDate: -1 });
```

---

## 5. Mongoose Connection Settings Review

- `maxPoolSize`: **25** (Default in `src/lib/mongodb.ts`). In a serverless Vercel environment with 50 concurrent function instances, maximum simultaneous DB connections = `50 * 25 = 1,250 connections` (Exceeds Atlas M0/M2/M5 limit of 500!).
- `minPoolSize`: **2**. Can cause connection hoarding in serverless containers that stay warm briefly. Recommended: `minPoolSize: 0` or `1` for serverless.
- `serverSelectionTimeoutMS`: **5,000 ms** (Acceptable).
- `bufferCommands`: **false** (Correct for serverless fast-fail).
- `retryWrites`: Defaults to `true` in driver.
- `w=majority`: Default in modern MongoDB replica sets.
- **Connection Caching Pattern:** `global.mongooseCached` works across hot reloads in a persistent Node process, but on Vercel each Lambda container manages its own isolated pool.
