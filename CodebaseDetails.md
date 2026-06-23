# Growlic Codebase Technical Reference & Architectural Audit

This document serves as the authoritative technical reference and architectural audit of the Growlic multi-tenant QR self-ordering and menu/analytics management system. It has been prepared for future developers, technical leads, and system architects to guide development, scaling, and architectural decisions.

---

## 1. Executive Summary

### Overview
**Growlic** is a production-ready, multi-tenant QR-code self-ordering system built specifically for restaurant environments (such as the *Tokyo Momos* chain). The application addresses critical restaurant operational bottlenecks:
1. **Dine-In Digitization**: Dynamically displays table-scoped digital menus with allergen indicators, spice ratings, preparation times, and nutritional macro tracking.
2. **Order Flow & Checkout**: Enables diners to construct carts, apply complex promotions, check out, and follow real-time order status tracking.
3. **Advanced Upselling**: Maximizes average order value (AOV) using a three-tier recommendation engine that suggests cross-sell items, combo deals, and target spend discount nudges.
4. **Operations & Analytics**: Provides owners and managers with a secure administrative dashboard containing revenue charts, hour/day traffic heatmaps, and menu friction metrics (high-view, low-checkout items).

### Architectural Style
Growlic uses a **Modular Feature-Based Layered Architecture**. The codebase is structured into self-contained vertical feature directories (e.g. `src/features/menu/`, `src/features/order/`) containing their own models, repositories, business logic services, validation rules, calculations, and explicit entrypoints (`index.ts`). These architectural boundaries are mechanically validated and enforced at compile time using strict ESLint Flat Config import constraints.

### Architectural Maturity & Ratings
The codebase has reached a high maturity level, transitioning successfully from a global MVC layout into a highly decoupled, hardened multi-tenant SaaS architecture.

| Category | Rating | Rationale |
| :--- | :---: | :--- |
| **Architecture** | **9.5 / 10** | Strict separation of concerns. UI actions only communicate with feature entrypoints; services handle pure business logic; and direct Mongoose model access is 100% isolated inside repositories. ESLint boundary rules prevent architectural decay. |
| **Code Organization** | **9.8 / 10** | Vertical feature slicing ensures that files related to a specific domain (e.g., schemas, queries, validation) sit together. Folders like `src/actions/` and `src/app/` act as lightweight controller/routing entrypoints. |
| **Scalability** | **8.5 / 10** | Decoupled feature modules allow database collections or logic layers to scale independently. However, high concurrent loads (100+ active tenants) will require introducing a cache layer (Redis) and moving statistical analytics generation to background queues (BullMQ). |
| **Security** | **9.2 / 10** | Multi-tenant isolation is enforced structurally across all database queries. Stateful session verification uses SHA256 hashes of JWT tokens stored in MongoDB, enabling instant invalidation on logout. Granular role-based permissions (`owner`, `manager`, `staff`) restrict dashboard activities. |
| **Maintainability** | **9.5 / 10** | Code is modular and highly typed. A developer can add or remove an entire feature without touching unrelated files. Shared components and infrastructure utilities are cleanly isolated. |

---

## 2. Complete Architecture Explanation

### Request and Data Flow Diagram

```
[ Dine-in Client / Web UI ]
            │
            │ (Http Requests / Server Actions / Form Submissions)
            ▼
[ Controller Layer: Actions & API Routes ]  <─── (Validates JWT Cookie & Stateful Session)
            │
            │ (Invokes Domain Service via public index.ts exports)
            ▼
[ Service Layer: Business Logic & Rules ]   <─── (Performs Calculations & Validations)
            │
            │ (Requests data using plain TypeScript Interfaces)
            ▼
[ Repository Layer: Data Access & Mapping ] <─── (Connects to cached Mongoose Pool)
            │
            │ (Executes raw Mongoose queries)
            ▼
[ Model Layer: Mongoose Schema ]
            │
            ▼
[ MongoDB Database ]
```

### Detailed Flow Descriptions

#### A. Request & Controller Flow
All client interactions land either in Next.js Server Actions (`src/actions/`) or API Routes (`src/app/api/`). These controllers are thin wrappers responsible for:
1. Extracting the authentication cookie (`admin_token`).
2. Performing stateful DB validation on the session hash.
3. Checking user permissions (`can('permission')`) against the roles database.
4. Parsing incoming HTTP payloads or parameters and invoking feature services.

#### B. Business Logic Flow
Feature Services (e.g., `src/features/order/service.ts`) execute the core business rules. They are deliberately kept pure and decoupled from HTTP layers, Next.js page caching modules, and Mongoose document shapes. If mathematical transformations or heavy string filtering are required, services delegate them to pure mathematical helper functions inside `calculations.ts` (e.g., calculating cart subtotals or statistical affinity index scores).

#### C. Database & Repository Flow
Repositories (e.g., `src/features/menu/repositories/menuRepository.ts`) are the exclusive gateways to MongoDB. The repositories:
1. Connect to the cached Mongoose connection pool.
2. Formulate and run database queries, structurally injecting the tenant isolation key `{ restaurantId }`.
3. Normalize raw MongoDB BSON documents into clean, plain TypeScript objects before returning them to the service layer. No raw Mongoose documents ever leak outside the repository.

#### D. Authentication and Session Validation Flow
1. **Login**: The admin POSTs credentials to `/api/auth`. The auth service validates the email/password, signs a JWT token containing admin metadata, hashes the token with SHA256, and writes a stateful `Session` document to MongoDB. The signed token is returned in a secure, `httpOnly` cookie.
2. **Validation**: For every request, `checkAdminAuth()` extracts the cookie, decodes the JWT, hashes it, and queries the database to verify that the session exists, is not expired, and has not been explicitly revoked.
3. **Logout**: A POST to `/api/auth/logout` retrieves the token, hashes it, marks the stateful database session as `revoked: true`, and clears the cookie.

#### E. Order Creation Flow
1. The customer carts up items and triggers checkout.
2. The checkout action calls `orderService.createOrder(data)`.
3. The order validation step maps inputs and verifies pricing.
4. The service fetches the customer's phone history via the customer repository. If it is a new user, it registers a new `Customer` profile; otherwise, it updates their `totalSpent`, `orderCount`, and `lastOrderDate`.
5. Active combo rules, discount tiers, and pairing suggestions are calculated to output the final totals.
6. The repository inserts the normalized `Order` document, and page paths are revalidated to update the admin dashboard.

#### F. Analytics & Recommendation Engine Flow
- **Analytics**: Raw events (`modal_open`, `cart_create`, `nudge_show`) are written to the `events` collection. When an admin requests metrics, the analytics service executes complex Mongoose aggregation pipelines (`$group`, `$sort`, `$project`) to return time intelligence matrices and menu item friction logs.
- **Recommendations**: The recommendation engine balances cold-starts and maturity:
  - If the database contains $< 50$ orders, it relies on manual `PairingRule` mappings.
  - If completed orders exceed $\ge 50$, the service initiates a statistical association rule mining calculation, calculating support ($\ge 20$ occurrences) and confidence ($\ge 0.2$) for co-occurring cart items on-the-fly.

---

## 3. Current Folder Structure

```
f:\Myprojects\growlic
├── public/                 # Static assets (SVGs, icons, placeholder images)
└── src/                    # Primary source code
    ├── actions/            # Server Actions (UI controllers, boundary checks)
    ├── app/                # Next.js App Router folders (Routing & Views)
    │   ├── admin/          # Management interface pages (dashboard, menus, settings)
    │   ├── api/            # REST API endpoints (auth, seeding)
    │   └── menu/           # Dynamic consumer menu views
    ├── components/         # Reusable React components (UI only, zero DB imports)
    ├── features/           # Self-contained modular domains
    │   ├── audit/          # Admin action audit tracking
    │   ├── analytics/      # Analytical aggregation calculations
    │   ├── auth/           # Authentication state, settings, and sessions
    │   ├── customer/       # Customer profiles and purchase history
    │   ├── menu/           # Menu items, BOGOs, and discount rules
    │   └── order/          # Order placement, validation, and status tracking
    ├── lib/                # Core infrastructure utilities
    │   ├── auth.ts         # JWT handling and password hashing
    │   ├── mongodb.ts      # Shared cached Mongoose pool utility
    │   └── tenant.ts       # Tenant parsing and isolation validators
    ├── redux/              # Client state managers (cart slices, stores)
    └── shared/             # Shared constants, errors, and seeding scripts
```

### Detailed Features Subfolder Specifications

Each folder under `src/features/<feature>/` adheres strictly to the following layer boundaries:

1. **`model.ts`**
   - **Purpose**: Declares schemas, validation rules, Mongoose indexes, and exports the Mongoose model.
   - **Constraint**: Must never contain database queries or business operations.
2. **`repository.ts`**
   - **Purpose**: Runs queries (`find`, `create`, `update`, `aggregate`) against MongoDB.
   - **Constraint**: Must normalize raw Mongoose documents into plain types. Only this file (and model) may import Mongoose.
3. **`service.ts`**
   - **Purpose**: Executes business operations, manages transaction flows, and calls repositories.
   - **Constraint**: No direct mongoose imports. No access to HTTP objects or Next.js headers/cookies.
4. **`validation.ts`**
   - **Purpose**: Screens input parameters prior to database writes.
5. **`calculations.ts`**
   - **Purpose**: Pure, state-free mathematical functions (e.g. calculating sums, computing confidence matrices).
6. **`types.ts`**
   - **Purpose**: Houses domain-specific interface declarations.
7. **`index.ts`**
   - **Purpose**: The public entry point. Only functions/types explicitly exported here can be imported externally.

---

## 4. Architectural Patterns Used

### 1. Feature-Based Architecture
By grouping all logic by vertical domains (e.g., `menu`, `order`) instead of horizontal layers (all models in one directory, all services in another), features are modularized. If the menu system needs refactoring, changes are confined inside the `src/features/menu/` directory.

### 2. Layered Architecture with Dependency Inversion
Code flows unidirectionally from the UI down to the database. The presentation layer (actions/components) does not know how the database is structured; it relies on plain objects returned by services, which in turn query repositories.

### 3. Repository and Data Normalization Pattern
Repositories shield the application from the database technology. If Growlic migrates from MongoDB to a SQL database in the future, services and components remain completely unaffected, as they only consume normalized plain TypeScript objects returned by repository interfaces.

### 4. Stateful Session Verification Pattern
By checking SHA256 session token hashes in the database on every authenticated call, Growlic protects the application against leaked JWT tokens. If a token is compromised, logging out instantly invalidates it by setting `revoked: true` on the database session record.

### 5. Multi-Tenancy (Tenant Isolation) Pattern
Accidental data leakage is prevented by enforcing:
1. `requireTenant()` check in routing context.
2. Structuring every MongoDB repository query to strictly require a `restaurantId` filter. Even global administrative queries structure a fallback (`{ restaurantId: { $exists: true } }`) to maintain tenant isolation constraints.

---

## 5. Code Standards Followed

### 1. TypeScript Usage
- Strict typing must be enforced. The `any` type should not be used.
- All service and repository parameters/return types must be fully declared (e.g. `Promise<IMenuItem[]>`).
- Cast MongoDB records to clean TS types during normalization (e.g., converting `_id` from `ObjectId` to `string`).

### 2. Import Rules & Boundaries
- All imports must use absolute paths mapping to the `@/` root prefix (e.g., `import { can } from '@/features/auth'`).
- Feature deep-imports are strictly forbidden. You must only import from the public index (e.g. `@/features/menu`), not the internal sub-files (e.g., `@/features/menu/model` is blocked by ESLint).

### 3. Error Handling & Validation
- Throw specialized, descriptive errors from `@/shared/errors` (e.g. `NotFoundError`, `ConflictError`, `ValidationError`).
- Controllers and API routes must catch exceptions using `handleRouteError(error)` to return standardized, user-friendly JSON payloads with appropriate HTTP status codes.

### 4. Database Access Constraints
- Direct Mongoose imports and Mongoose model compilation are restricted to `src/features/*/model.ts` and `src/features/*/repository.ts` (with exceptions for infrastructure connections and seeds).
- Keep MongoDB connections alive by returning a cached Mongoose pool connection inside `src/lib/mongodb.ts`.

---

## 6. Database Architecture

Growlic's data models are designed for high-performance retrieval and robust tenant isolation.

### MongoDB Schema Directory & Indexing Map

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              tokyo-momos                                   │
│                                                                            │
│  ┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐  │
│  │      Admin      │ ◄───  │     Session     │       │     AuditLog     │  │
│  └─────────────────┘       └─────────────────┘       └──────────────────┘  │
│                                                                            │
│  ┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐  │
│  │    MenuItem     │ ◄───  │      Order      │ ────► │     Customer     │  │
│  └─────────────────┘       └─────────────────┘       └──────────────────┘  │
│                                                                            │
│  ┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐  │
│  │   ComboRules    │       │  DiscountTiers  │       │  AnalyticsEvent  │  │
│  └─────────────────┘       └─────────────────┘       └──────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 1. Admin (`src/features/auth/model.ts`)
- **Purpose**: Credentials, restaurant metadata, and role definition.
- **Key Fields**: `email` (String, required, unique), `password` (String, hashed), `restaurantId` (String, required, unique index), `role` (`'owner' | 'manager' | 'staff'`).
- **Indexes**: `{ email: 1 }`, `{ restaurantId: 1 }`

#### 2. Session (`src/features/auth/model.ts`)
- **Purpose**: Stateful verification of active admin login tokens.
- **Key Fields**: `userId` (String, required), `restaurantId` (String, required), `tokenHash` (String, required, unique), `expiresAt` (Date, required), `revoked` (Boolean, default `false`).
- **Indexes**: `{ restaurantId: 1, tokenHash: 1 }`, `{ userId: 1, revoked: 1 }`

#### 3. MenuItem (`src/features/menu/model.ts`)
- **Purpose**: Food menu item configurations.
- **Key Fields**: `restaurantId` (String, required), `category` (String, required), `name` (String, required), `price` (Number, required), `available` (Boolean), `nutrition` (Calories, protein, carbs, fat).
- **Indexes**: `{ restaurantId: 1, category: 1 }`

#### 4. Order (`src/features/order/model.ts`)
- **Purpose**: Individual client transactions and item details.
- **Key Fields**: `restaurantId` (String, required), `customerName` (String), `customerPhone` (String), `items` (Array of subdocuments: name, price, quantity), `total` (Number), `status` (Received, preparing, ready, completed).
- **Indexes**: `{ restaurantId: 1, createdAt: -1 }`

#### 5. Customer (`src/features/customer/model.ts`)
- **Purpose**: Tracks dining history and aggregates total spending metrics.
- **Key Fields**: `restaurantId` (String, required), `phone` (String, required), `name` (String), `totalSpent` (Number), `orderCount` (Number).
- **Indexes**: `{ restaurantId: 1, phone: 1 }`

#### 6. PairingRule (`src/features/menu/model.ts`)
- **Purpose**: Relates category suggestions for upsells.
- **Key Fields**: `restaurantId` (String, required), `triggerCategory` (String), `suggestCategories` (String[]).

#### 7. DiscountTier (`src/features/menu/model.ts`)
- **Purpose**: Configures purchase value discount levels.
- **Key Fields**: `restaurantId` (String, required), `minSpend` (Number), `percentOff` (Number).

#### 8. ComboRule (`src/features/menu/model.ts`)
- **Purpose**: Complex promotional settings (e.g. buy items, get discounts on beverages).
- **Key Fields**: `restaurantId` (String, required), `conditionCategory` (String), `rewardType` (String), `rewardTarget` (String).

#### 9. Event (`src/features/analytics/model.ts`)
- **Purpose**: Tracks page views, clicks, and cart interactions.
- **Key Fields**: `restaurantId` (String, required), `type` (`modal_open` | `cart_create` | `nudge_show`), `itemId` (String), `createdAt` (Date).
- **Indexes**: `{ restaurantId: 1, createdAt: -1 }`

#### 10. AuditLog (`src/features/audit/model.ts`)
- **Purpose**: Tracks admin actions for compliance.
- **Key Fields**: `restaurantId` (String, required), `userId` (String), `action` (String), `before` (Mixed), `after` (Mixed), `createdAt` (Date).
- **Indexes**: `{ restaurantId: 1, createdAt: -1 }`

---

## 7. Feature Addition Guide

To add a new modular domain feature (for example, a **Reservation** feature):

### Step 1: Create the Feature Directory
Create the folder `src/features/reservation/` under the features root.

### Step 2: Establish the Module Files
1. **`types.ts`**: Declare public interfaces:
   ```typescript
   export interface IReservation {
     _id: string;
     restaurantId: string;
     customerName: string;
     partySize: number;
     reservationTime: string;
   }
   ```
2. **`model.ts`**: Set up the schema, apply tenant compound indexes, and compile the model:
   ```typescript
   import mongoose, { Schema, Document } from 'mongoose';
   const ReservationSchema = new Schema({
     restaurantId: { type: String, required: true },
     customerName: { type: String, required: true },
     partySize: { type: Number, required: true },
     reservationTime: { type: Date, required: true }
   });
   ReservationSchema.index({ restaurantId: 1, reservationTime: -1 });
   export default mongoose.models.Reservation || mongoose.model('Reservation', ReservationSchema);
   ```
3. **`repository.ts`**: Handles MongoDB actions:
   ```typescript
   import Reservation from './model';
   import { IReservation } from './types';
   export async function createReservation(restaurantId: string, data: Partial<IReservation>): Promise<IReservation> {
     const doc = await Reservation.create({ ...data, restaurantId: restaurantId.toLowerCase() });
     return doc.toObject(); // Normalization
   }
   ```
4. **`service.ts`**: Implements business rules (no direct mongoose imports):
   ```typescript
   import * as reservationRepo from './repository';
   import { IReservation } from './types';
   export async function reserveTable(restaurantId: string, data: Partial<IReservation>) {
     // Run checks or trigger SMS notifications
     return reservationRepo.createReservation(restaurantId, data);
   }
   ```
5. **`validation.ts`**: Screening logic to guard input parameters.
6. **`index.ts`**: Exposes the public API:
   ```typescript
   export { reserveTable } from './service';
   export type { IReservation } from './types';
   ```

### Step 3: Call via Action Controller
Import the service *solely* via the feature root import:
```typescript
import { reserveTable } from '@/features/reservation';
```

### Step 4: Run Static Checks
Validate compile boundaries:
```bash
npm run lint
npm run build
```

---

## 8. Feature Removal Guide

To completely remove a feature (for example, removing the `customer` module):

1. **Scan Imports**: Run a repository-wide check to identify all external files importing from `@/features/customer`.
2. **Clean UI Components**: Remove customer views, dashboard columns, or settings interfaces from the `src/app/` and `src/components/` folders.
3. **Delete Domain Directory**: Delete the `src/features/customer/` folder.
4. **Clean Seed Scripts**: Remove seeding functions referencing customer repositories inside `src/shared/seedService.ts`.
5. **Verify Compilation**: Execute `npm run lint` and `npm run build` to confirm no residual imports or broken types remain.

---

## 9. Current Codebase Strengths

1. **Compile-Time Boundary Enforcement**: The ESLint configuration blocks architectural drift. Developers cannot write quick hacks like querying Mongoose schemas inside React files.
2. **Data Normalization**: Repositories act as clear boundaries. Services only deal with plain TypeScript types, preventing Mongoose query states from leaking.
3. **Hardened Multi-Tenancy**: The database layers structurally require `restaurantId`, making data leaks between different restaurants virtually impossible.
4. **Stateful Session Revocation**: Sessions can be revoked instantly. If a user logs out, the JWT token hash is deleted, immediately blocking subsequent access.

---

## 10. Weak Spots and Risks

### 1. Analytics Aggregation Overhead
- **Problem**: Time intelligence heatmaps and cohort metrics execute heavy MongoDB aggregates on-the-fly.
- **Risk**: As event counts grow from thousands to millions, aggregation queries will block database threads, slowing down the dashboard.
- **Mitigation**: Introduce a cron worker to calculate hourly dashboard metrics and save them to a `DashboardMetrics` summary collection.

### 2. On-the-fly Affinity Calculation
- **Problem**: When completed orders exceed $\ge 50$, the recommendation engine processes all orders on-the-fly to calculate support and confidence.
- **Risk**: Checkout operations will experience high latency once order histories grow large.
- **Mitigation**: Move the association rules calculation to an offline cron job that runs every midnight and saves computed recommendation pairs to a cache.

### 3. Lack of Caching
- **Problem**: Every menu page view or detail modal query connects directly to MongoDB.
- **Risk**: Heavy traffic spikes will overwhelm database connection pools.
- **Mitigation**: Cache menu configurations in Redis, invalidating the cache only when the admin changes menu items or prices.

---

## 11. Scalability Roadmap

### Stage 1 (0 to 10 Restaurants)
- **Current Setup**: Simple MongoDB instance, Next.js Dev/Prod server.
- **Status**: Completely fine. No changes needed. Seeding takes $< 2$ seconds.

### Stage 2 (10 to 100 Restaurants)
- **Bottleneck**: Database connection pool exhausting, analytics queries slowing down.
- **Additions**:
  - Deploy **Redis** to cache menu items, combo rules, and recommendations.
  - Implement basic index fine-tuning on MongoDB.
  - Set up monitoring tools (Sentry).

### Stage 3 (100 to 1,000 Restaurants)
- **Bottleneck**: Analytics aggregates and affinity recommendations block database transactions.
- **Additions**:
  - Introduce **BullMQ** with Redis to handle analytical events and statistics generation asynchronously.
  - Set up a read-replica MongoDB instance to isolate analytical queries from transactional operations.

### Stage 4 (Enterprise SaaS Scale - 1,000+ Tenants)
- **Architecture Upgrades**:
  - Offload analytics collection entirely to a clickstream database (e.g. ClickHouse or Google BigQuery).
  - Migrate core features to microservices (e.g., keeping Menu and Ordering separate) *only if* team scaling requires independent deployments. Keep the codebase modularly unified for as long as possible.

---

## 12. Performance Bottleneck Analysis

| Operation | Current Risk | Future Risk | Solution |
| :--- | :--- | :--- | :--- |
| **Menu Query** | Low (Quick index fetch) | Medium (High database connections) | Cache menu arrays in Redis. |
| **Analytics Aggregation** | Low (Seeded with 472 events) | **High** (Aggregate table scans) | Pre-compute aggregates using a background worker. |
| **Affinity Recommendation** | Low ($< 100$ orders) | **High** (CPU-heavy co-occurrence) | Run affinity calculations offline via cron. |
| **Redux State** | Low (Manages basic cart) | Low (Client memory footprint) | Keep cart payload flat and minimal. |
| **Image Loading** | Low (Small SVGs) | Medium (High network transfer) | Optimize images using Next.js `Image` or a CDN. |

---

## 13. Security Review

### Rated Security Status: **9.2 / 10**

- **Authentication**: JWT token verification coupled with stateful database hashing is highly secure.
- **Authorization**: Granular RBAC (`owner`, `manager`, `staff`) restricts access to critical server actions.
- **Tenant Isolation**: Structurally secure due to enforced repository parameters.
- **Input Validation**: All payloads undergo validation layers prior to processing.
- **Audit Logs**: State transitions (`before` / `after`) are logged for compliance.

*Improvement Area*: Implement rate limiting at Next.js middleware levels to prevent brute-force attacks on admin authentication routes.

---

## 14. Background Processing Architecture

Currently, Growlic executes operations synchronously. To support high scales, tasks should be categorized:

### Operations to Keep Synchronous
- **Order Placement**: Must be processed synchronously to guarantee invoice accuracy and check real-time item availability.
- **Session Verification**: Required synchronously to check request authorization on the fly.

### Operations to Offload Asynchronously (BullMQ)
- **Audit Logs**: Writing compliance records should be offloaded to a queue.
- **Analytics Event Logging**: Writing view event logs should not block customer menu requests.
- **Affinity Recommendations**: CPU-heavy association mining should be calculated asynchronously.

---

## 15. Deployment & Operations

For production deployments:
1. **Environment Variables**: Store sensitive keys (`MONGODB_URI`, `JWT_SECRET`) securely in production vaults.
2. **Monitoring**: Integrate Sentry for error tracking and Datadog/Prometheus for server performance monitoring.
3. **Backups**: Set up automated hourly database backups (e.g. using MongoDB Atlas).
4. **CI/CD**: Enforce automated testing, ESLint boundary checks, and TypeScript builds on every push to the main branch.

---

## 16. Final Architect Review

### What is Great and Should Not Change
The **Modular Feature-Based Layered Architecture** and **ESLint boundary controls** are the bedrock of this codebase. They protect code structure, facilitate onboarding, and ensure that refactoring remains clean and self-contained.

### What to Change Only When Scale Requires It
- Avoid splitting the modular monolith into microservices prematurely.
- Introduce background job processors (BullMQ) and analytics databases (ClickHouse) only when active concurrent tenants exceed 100.

### Current Verdict
Growlic has an exceptionally clean, robust, and highly disciplined codebase. The separation of concerns, secure multi-tenant isolation, stateful token revocation, and strict coding standards provide an excellent foundation for scaling the system into a high-throughput, multi-tenant SaaS platform.
