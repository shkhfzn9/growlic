# Growlic Project Map & Architecture Guide

Welcome to the Growlic codebase documentation. This file serves as a human-readable guide mapping out the entire system, its tech stack, architecture boundaries, core feature implementations, and decision history. It is designed to get any developer up to speed without reading code line-by-line.

---

## 1. Overview
**Growlic** is a premium, multi-tenant QR-code self-ordering system specifically implemented for the **Tokyo Momos** restaurant chain. The application's core purpose is to digitize and optimize the in-restaurant dining experience. By scanning a table-specific QR code, customers browse a rich menu with detailed nutritional data, ingredients, prep times, and cross-sell suggestions. Diners can construct carts, check out, track order preparation in real-time, while owners access a secure admin panel and analytical dashboard containing visual revenue reports, traffic heatmaps, and menu friction insights.

---

## 2. Tech Stack
The application relies on a modern, unified JavaScript/TypeScript stack:
* **Next.js 16.2.9 (App Router)**: Core framework choice. Utilizes server-side rendering for optimal load speeds, dynamic routing for table-specific menus, and type-safe Server Actions for secure database transactions.
* **React 19.2.4**: Client UI library powering the dynamic menus, interactive cart drawer, and analytical dashboard.
* **MongoDB & Mongoose 9.7.1**: Document database. Selected because menu items, upsell rules, and completion logs benefit from document schema flexibility (e.g. varying nutritional values, optional discount scopes, and flexible list arrays).
* **Redux Toolkit 2.12.0 & React-Redux 9.3.0**: Client-side state container managing persistent user cart state, quantity additions, and active restaurant context.
* **Tailwind CSS 4**: Utility-first CSS styling engine, delivering a responsive layout, premium dark modes, glassmorphism, and micro-animations.
* **TypeScript 5**: Formulates strict type interfaces across services and repository layers.
* **ESLint 9 (Flat Config) & eslint-plugin-import-x**: Compile-time boundary rule engine enforcing the modular feature-based layered structure rules.

---

## 3. Architecture Overview
The codebase is structured using a **Modular Feature-Based Layered Architecture**. The application is divided into self-contained feature directories under `src/features/`. Each feature encapsulates its own models, repositories, services, calculations, validations, and types. This increases cohesion and enforces clear boundaries using explicit entry points (`index.ts`).

```
  Browser/Client / Components / Pages
        │
        │ (Must only import from Feature Root `@/features/<feature>` / Entrypoint,
        │  and cannot deep-import internal files or access database/models directly)
        ▼
   Feature Root Entrypoint (`src/features/<feature>/index.ts`)
        │
   API Route Controller / Server Action (`src/actions/` or `src/app/api/`)
        │ (Parses payloads, checks admin session/auth cookies, validates inputs)
        ▼
   Feature Service Layer (`src/features/<feature>/service.ts` or `services/`)
        │ (Houses business rules, calculations, recommendations, analytics scoring)
        ▼
   Feature Repository Layer (`src/features/<feature>/repository.ts` or `repositories/`)
        │ (Abstracts database queries, connects cached Mongoose pools, normalizes schemas)
        ▼
   Mongoose Model (`src/features/<feature>/model.ts`)
```

### Layer Responsibilities:
1. **Model (`model.ts`)**: Defines strict Mongoose schema interfaces. Contains zero database queries.
2. **Repository (`repository.ts` / `repositories/`)**: The **only** file/subfolder allowed to import Mongoose models directly. Normalizes raw BSON document shapes into clean TypeScript interfaces (e.g., converting ObjectIds to strings) before returning data.
3. **Service (`service.ts` / `services/`)**: Contains pure business logic. Decoupled from HTTP details, Mongoose structures, and Next.js server APIs.
4. **Calculations (`calculations.ts` / optional)**: Isolates pure, state-free mathematical or formatting computations (e.g., matrix co-occurrence rules or conversions) from database and database-adjacent layers.
5. **Validation (`validation.ts`)**: Checks parameter constraints before database insertion or service processing.
6. **Entry Point (`index.ts`)**: The public interface of the feature. Exposes only selected services, types, and functions to the rest of the codebase.

### ESLint Architecture Boundaries:
The folder boundaries are mechanically enforced in `eslint.config.mjs`:
* **Controllers** (`src/actions/**` and `src/app/api/**`) cannot import `mongoose`, repositories, or models directly. They may only import from the feature root entry point or services.
* **Services** (`src/features/**/service.ts`) cannot import `mongoose`, route-specific Next.js types (`next/server`, `next/headers`, `next/cache`), controllers, or models directly. They may only import from their feature's repositories, validation, calculations, and types.
* **External Code** (e.g., components, pages, redux) cannot deep-import feature sub-files (e.g., importing `@/features/menu/model` is forbidden). They must import solely from the feature root (e.g., `@/features/menu`).
* **Only repositories and models** or designated exceptions (such as `src/lib/mongodb.ts` or the seeding utility `src/shared/seedService.ts`) are allowed to import Mongoose.

---

## 4. Folder Structure
```
f:\Myprojects\growlic
├── public/                  # Public static assets, icons, and illustrations.
└── src/                     # Core application source code.
    ├── actions/             # Server Actions functioning as API controllers.
    ├── app/                 # Next.js App Router (Views, API endpoints, styling, dashboard).
    │   ├── admin/           # Admin pages (dashboard, customers log, menu manager, settings).
    │   ├── api/             # REST endpoints (auth routes, database seeding).
    │   ├── cart/            # Client cart layout.
    │   ├── menu/            # Dynamic digital menu page matching table QR parameters.
    │   └── track/           # Real-time order preparation tracker.
    ├── components/          # Reusable React components.
    │   ├── admin/           # Admin forms, dashboard layout elements.
    │   └── menu/            # MenuItem cards, cart drawers, trackers, item detail modals.
    ├── features/            # Self-contained modular features.
        ├── audit/           # Stateful audit logging of administrative changes.
    │   ├── analytics/       # Heatmaps, conversions, event logging, metrics.
    │   ├── auth/            # Authenticated admin credentials and restaurant settings.
    │   ├── customer/        # Customer metrics, phone lookup, spending logs.
    │   ├── menu/            # Menu items, combo rules, discount tiers, and category recommendations.
    │   └── order/           # Order placement, validation, checkout calculations.
    ├── lib/                 # Core infrastructure helpers.
    │   ├── auth.ts          # JWT signatures and bcrypt password hashing.
    │   └── mongodb.ts       # Shared connection caching helper for Mongoose pool connection.
    ├── redux/               # Client-side redux storage (store and cart state slices).
    └── shared/              # Globally shared code and utilities.
        ├── errors.ts        # Centralized custom error definitions and route handlers.
        ├── seedService.ts   # Multi-tenant data seed generator scripts.
        └── types.ts         # Globally shared TypeScript interfaces.
```

---

## 5. Core Features

### A. Menu & Item Detail Modal
A rich interactive card list which parses item detail views. Clicking an item renders a modal displaying:
* **Spice levels** (0 to 3 scale mapped to pepper icons).
* **Portion sizes** (e.g., "Good for 1", "Shareable starter for 2-3").
* **Estimated prep times** (min-max ranges).
* **Nutritional macro bars** (color-coded progress indicators mapping calories, protein, carbs, fats).
* **Allergen highlighting**: Highlights matching allergens (e.g., wheat, soy, dairy, egg, peanuts) inside the ingredients text automatically.
* **Goes-Well-With suggestions**: Surfaces matching items belonging to rules established by the restaurant owner.
* **Social Proof**: Displays order count milestones or highlights items flagged as "Most Loved" or "Friction Free" dynamically.

### B. Cart & Checkout Flow
Managed via Redux. Items added build a state payload containing restaurant identification and selected quantities. Clicking checkout invokes `orderService.createOrder` which verifies category availability, registers a `Customer` index to log cumulative restaurant spending, calculates combo rule discounts, subtracts promotions, inserts a completed `Order` document, and triggers tracker alerts.

### C. Recommendation Engine
Combines three distinct heuristics into a unified API response:
1. **Cross-Sell (Affinity)**: Recommends items based on active items in cart. If less than 50 completed orders exist, it falls back to manually configured rules (e.g. Rice goes with Rolls). Once completion history reaches $\ge 50$ orders, it automatically switches to an association rule mining engine calculating item co-occurrences (frequency threshold $\ge 20$, confidence $\ge 0.2$).
2. **Threshold Discount**: Prompts the user to add small items to hit higher discount tiers (e.g., ₹399/₹599/₹899).
3. **Combo rules**: Scans cart for "Buy 2 momos, get 1 soup free" or "Get 15% off snacks above ₹350" conditions, auto-calculating free items or discounts.

### D. Admin Panel
Provides restaurant managers control over menu items and layout settings. Supports adding items, toggling live availability, adjusting pricing, configuring category pairings, defining discount levels, and specifying combo configurations. Seeding data populated via `/api/seed` provides managers with a fully formed storefront to model active restaurant actions.

### E. Analytics Dashboard
Translates raw order events into operational decisions:
* **Time Intelligence Map**: Plots an hourly/daily heat matrix indicating completed order volume, allowing managers to schedule kitchen staff.
* **Revenue Trends**: Line graphs mapping margins, total orders, average order values, and conversion trajectories.
* **Menu Intelligence**: Identifies friction rates (items with high click rates but low checkout conversions) so owners can reprice, rephoto, or redesign underperforming meals.
* **Upsell performance**: Measures discount tiers achievement rates and co-occurrence suggestions success ratios.

### F. Tenant Isolation Hardening
Enforces strict multi-tenant boundaries at the database query level to prevent accidental cross-tenant data leaks:
* **Contextual Helpers**: `src/lib/tenant.ts` provides `requireTenant()` to ensure a `restaurantId` is always extracted from the path/context.
* **Repository Validation**: Every repository query strictly accepts and filters by a validated `restaurantId`. Global lookups utilize fallback structures like `{ restaurantId: { $exists: true } }` so queries are structurally forced to contain the tenant key.
* **Compound Indexes**: Applied database indexes like `{ restaurantId: 1, createdAt: -1 }` on `Order` and `Event` schemas to optimize tenant-isolated sorting.

### G. Authentication Hardening (Sessions & RBAC)
Establishes a database-backed stateful session verification system alongside role-based access control:
* **Session Collection**: Stores active login state (`userId`, `restaurantId`, `tokenHash`, `expiresAt`, `revoked`). On login, token hashes are recorded; on logout or session check, token hashes are validated/revoked.
* **Role Hierarchy**: Maps permissions dynamically:
  - `owner`: full capabilities (`manage_users`, `change_pricing`, `view_analytics`, `edit_menu`, `manage_orders`, `update_order_status`).
  - `manager`: menu and order adjustments (`edit_menu`, `manage_orders`, `update_order_status`).
  - `staff`: order handling (`update_order_status`).
* **Access Checks**: Server Actions validate credentials on each request using `validateSession` and checking permissions via the `can(permission)` context helper.

### H. Audit Logging
Tracks administrative actions to ensure accountability and structural logging:
* **Audit Feature**: Dedicated modular folder `src/features/audit/` housing the Mongoose schema, repository layer, and logging service.
* **Triggers**: Logs operations like `MENU_PRICE_CHANGED`, `MENU_UPDATED`, `LOGIN_SUCCESS`, `LOGIN_FAILED`, and `ORDER_STATUS_CHANGED` with `before` and `after` states.

### I. Multi-Tenant Onboarding & Brand Customization
Allows independent businesses to self-onboard:
* **URL Slug Verification**: REST endpoint checks uniqueness of the restaurant slug dynamically using debounced frontend queries during registration.
* **Dynamic Brand Customization**: Admin Settings offers customization parameters (logoUrl, primaryColor, welcomeMessage) and printing of table-scoped QR codes.
* **Table Scoped Dining**: Client-side cart tracks `tableId` and maps orders to the specific table, which are then rendered as labels in the admin panel and order logging dashboard. The digital menu dynamically applies the restaurant logo, welcome message, and chosen brand color theme dynamically using inline styles.

---


## 6. Database Schema Summary

MongoDB handles relations implicitly using references:

| Model | Schema Location | Field / Type | Description / Relationships |
| :--- | :--- | :--- | :--- |
| **Admin** | `src/features/auth/model.ts` | `email` (String)<br>`password` (String)<br>`restaurantId` (String)<br>`restaurantName` (String)<br>`phone` (String)<br>`designation` (String)<br>`logoUrl` (String/optional)<br>`primaryColor` (String/optional)<br>`welcomeMessage` (String/optional) | Represents tenant credentials and profile details. `restaurantId` acts as a unique slug parameter. Custom branding variables stored here are dynamically applied to consumer views. |
| **Menu** | `src/features/menu/model.ts` | `restaurantId` (String)<br>`category` (String)<br>`name` (String)<br>`price` (Number)<br>`available` (Boolean)<br>`pairsWithCategories` (String[])<br>`nutrition` (Subdocument)<br>`spiceLevel` (Number)<br>`prepTimeMin`/`prepTimeMax` (Number) | Individual menu items. `restaurantId` relates items to an Admin profile. |
| **Order** | `src/features/order/model.ts` | `restaurantId` (String)<br>`customerName`/`customerPhone` (String)<br>`tableId` (String/optional)<br>`items` (Subdocument[])<br>`subtotal`/`total` (Number)<br>`status` (String)<br>`estimatedTime` (Number) | Individual transactions. Subdocument `items.menuItemId` references `Menu._id`. `items.nudgeRuleId` references `PairingRule._id` or `ComboRule._id`. `tableId` maps transactions to restaurant tables. |
| **Customer** | `src/features/customer/model.ts` | `restaurantId` (String)<br>`phone` (String)<br>`name` (String)<br>`totalSpent` (Number)<br>`orderCount` (Number)<br>`lastOrderDate` (Date) | Tracks diner profiles across orders. Uniquely identified by `restaurantId` + `phone`. |
| **PairingRule** | `src/features/menu/model.ts` | `restaurantId` (String)<br>`triggerCategory` (String)<br>`suggestCategories` (String[])<br>`active` (Boolean)<br>`triggerCount` (Number) | Rule-based cross-sell configurations. `triggerCategory` and `suggestCategories` correspond to `Menu.category` strings. |
| **DiscountTier** | `src/features/menu/model.ts` | `restaurantId` (String)<br>`minSpend` (Number)<br>`percentOff` (Number)<br>`categoryScope` (String/null)<br>`active` (Boolean) | Configures threshold-based discounts. `categoryScope` optionally restricts the discount to a specific `Menu.category` string. |
| **ComboRule** | `src/features/menu/model.ts` | `restaurantId` (String)<br>`conditionCategory` (String)<br>`conditionExcludeCategory` (String)<br>`rewardType` (String)<br>`rewardTarget` (String)<br>`customerMessage` (String)<br>`active` (Boolean) | Configures complex promotions (e.g. BOGO). `rewardTarget` references a category string, specific item name, or value percent. |
| **Event** | `src/features/analytics/model.ts` | `restaurantId` (String)<br>`type` (String)<br>`itemId` (String)<br>`nudgeType` (String)<br>`createdAt` (Date) | Analytical log tracking client-side events (`cart_create`, `nudge_show`, `modal_open`) for metric calculation. |
| **Session** | `src/features/auth/model.ts` | `userId` (String)<br>`restaurantId` (String)<br>`tokenHash` (String)<br>`createdAt` (Date)<br>`expiresAt` (Date)<br>`revoked` (Boolean) | Represents active admin login sessions. Compound indexed on `{ restaurantId: 1, tokenHash: 1 }` and `{ userId: 1, revoked: 1 }`. |
| **AuditLog** | `src/features/audit/model.ts` | `restaurantId` (String)<br>`userId` (String/null)<br>`action` (String)<br>`before` (Mixed/null)<br>`after` (Mixed/null)<br>`createdAt` (Date) | Tracks critical administrative actions (`MENU_PRICE_CHANGED`, `MENU_UPDATED`, `LOGIN_SUCCESS`, `LOGIN_FAILED`, `ORDER_STATUS_CHANGED`). |


---

## 7. Decision Log

### A. Architectural Choice: Feature-Based Modular Architecture Refactoring
* **Built/Changed**: Refactored the entire layered MVC design from global `models`, `repositories`, and `services` directories to self-contained feature folders under `src/features/*`.
* **Why**: Grouping code by domain features (like `customer`, `menu`, `order`, `auth`, `analytics`) isolates database models, validation rules, and specialized calculations, making it much easier to scale, refactor, or delete features cleanly without cascading side-effects.
* **Improvement vs. Before**: Code is organized around cohesive domains. The API boundary of each feature is explicitly controlled by its `index.ts` entry point, minimizing spaghetti imports.
* **Tradeoff**: Increases folder nesting. Navigating features requires opening specific feature-focused sub-directories.

### B. Architectural Choice: ESLint Boundary Rules Enforcement
* **Built/Changed**: Configured `eslint.config.mjs` to block deep-imports of feature sub-files (e.g., `@/features/menu/model`) and restrict direct mongoose/repository access to repository layers.
* **Why**: Automated static validation prevents code-drift and architecture decay without relying purely on developer discipline.
* **Improvement vs. Before**: Compilation and lint checks fail instantly if anyone attempts to import a Mongoose model directly inside a React component or Next.js route handler.
* **Tradeoff**: Rigid structural constraints. Utilities (like `seedService.ts`) require designated linter ignores or refactoring to conform to architectural boundaries.

### C. Feature Design: 3-Tier Threshold Discounting
* **Built/Changed**: Configured three spending thresholds (₹399, ₹599, ₹899) instead of a single flat discount level.
* **Why**: Tiered spent goals utilize the "decoy effect" and "anchoring" principles of behavioral economics. By showing multiple milestones, customers are psychologically incentivized to add minor sides (like momo sauces, soups, or extra snacks) to reach the next tier.
* **Improvement vs. Before**: Replaced basic discount calculations with modular, progressive incentive nudges in the UI.
* **Tradeoff**: Increases cart computation complexity on the client side since the engine must continuously evaluate the next nearest tier.

### D. Feature Design: Cold-Start to Data-Driven Affinity Upgrades
* **Built/Changed**: Integrated manual rules with association rule mining scoring once completed transactions reach $\ge 50$.
* **Why**: A purely statistical co-occurrence recommendation engine fails on day one (cold-start). A purely manual tagging engine requires continuous admin upkeep. Using a threshold-triggered upgrade paths combines early-stage usability with late-stage automation.
* **Improvement vs. Before**: Automates cross-sell suggestions dynamically as real transaction datasets grow.
* **Tradeoff**: Manual tags remain in the database even after the statistical engine takes over, creating small storage overhead.

### E. UI Design: Allergen Highlighting in Modal Views
* **Built/Changed**: Built a regex matching algorithm that scans ingredient strings against a static dictionary of allergens.
* **Why**: Enhances customer safety and menu trust. Auto-flagging allergens reduces visual clutter and prevents layout adjustments.
* **Tradeoff**: Relies on literal comma-separated text strings entered in the admin dashboard. Subtle spelling mistakes in menu descriptions could fail the auto-flagging check.

### F. Feature Design: Event-Driven Local Analytics Dashboard
* **Built/Changed**: Implemented a local `Event` model and database tracking system paired with high-performance Mongoose aggregation pipelines to calculate hourly heatmaps, friction rates, and revenue metrics.
* **Why**: Keeps the multi-tenant architecture self-contained and avoids costly external SaaS subscriptions. Leveraging MongoDB aggregations allows querying tenant-specific analytics on-the-fly without complex synchronization logic.
* **Improvement vs. Before**: Replaced simple static counters with rich, contextual analytics (e.g., hourly activity heatmaps and menu item conversion/friction rates).
* **Tradeoff**: Puts higher load on the database for aggregate queries, requiring efficient indexing on `restaurantId`, `type`, and `createdAt` fields to avoid performance degradation.

### G. Architectural Choice: Multi-Tenant Dynamic Theme Injection
* **Built/Changed**: Implemented dynamic branding configurations (primaryColor, logoUrl, welcomeMessage) at runtime. The consumer menu page uses an injected style block to map custom colors into button borders, active states, backgrounds, and text styling dynamically.
* **Why**: Prevents code compiling overhead or spawning separate tenant containers. Using CSS variable-based dynamic injections renders custom theme overrides instantaneously at zero performance cost.
* **Tradeoff**: Restricts the tenant customizations to logo, banner, and primary brand color palette to preserve clean alignment and system design coherence.

---

## 8. What's Working Well
* **Feature Encapsulation**: Domain layers are 100% segregated. Deleting a feature is cleanly isolated within its `src/features/<name>` directory.
* **Compilation and Lint Cleanliness**: `npm run lint` yields zero architecture boundary violations, and the local compiler builds cleanly.
* **Centralized Error Routing**: Handlers utilize `@/shared/errors` to correctly convert validation exceptions to proper API responses.
* **Robust UI Rendering**: Next.js production server-renders dynamic menus and processes cart workflows with full type safety.

---

## 9. What Needs Attention / Open Items
* **Menu Category Gaps**: The seeded default database menu does not contain a dedicated "Drinks & Beverages" category. It uses soups and side snacks as combos instead, leaving a gap for standard drink upsells.
* **Discount Tier Estimates**: The ₹399/₹599/₹899 milestones are estimates based on average order sizes. These thresholds should be revised using empirical order distribution data after the system operates live.
* **Missing Analytics Tracking**: Cart-abandonment events and item modal views are only partially tracked or mocked. Full integration of checkout abandonments is required for reliable conversions.
* **Pre-existing UI Warnings**: Certain client-side warnings (such as unused icons or React 19 memoization warnings in `dashboard/page.tsx`) do not break compilation but deserve routine code cleaning.

---

## 10. How to Add a New Feature
To add a new modular feature (e.g., a "Reservation" or "Feedback" module):

1. **Create the Feature Folder**:
   Create a new directory: `src/features/reservation/`
2. **Define Feature Types (`src/features/reservation/types.ts`)**:
   Establish public interfaces like `IReservation`.
3. **Define the Database Schema (`src/features/reservation/model.ts`)**:
   Specify Mongoose schema setups and instantiate the model in this file.
4. **Implement the Repository (`src/features/reservation/repository.ts`)**:
   Establish the repository. This is the **only** file within the feature allowed to import the `Reservation` model.
5. **Implement the Service (`src/features/reservation/service.ts`)**:
   Establish business flow rules. Restrict imports to the repository, validation, and types (no mongoose imports).
6. **Implement Validations (`src/features/reservation/validation.ts`)**:
   Define checking logic to safeguard function params.
7. **Expose the Public API (`src/features/reservation/index.ts`)**:
   Export features cleanly:
   ```typescript
   export { reservationService } from './service';
   export type { IReservation } from './types';
   ```
8. **Call via Controller (`src/actions/` or `src/app/api/`)**:
   Import your service using the feature root path only:
   ```typescript
   import { reservationService } from '@/features/reservation';
   ```
9. **Run Lint Checks (`npm run lint`)**:
   Verify that boundary rules are fully respected.
