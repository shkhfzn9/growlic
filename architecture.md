# Growlic Frontend Architecture Documentation & Walkthrough

Welcome to the official, master-level Growlic Frontend Architecture Guide! This document is designed to serve as the official onboarding manual, technical reference, and architectural blueprint for the Growlic platform. 

Whether you are a junior developer, a newly joined senior engineer, or a product manager trying to understand how our engineering systems scale, this guide explains every single layout, file structure, pattern, and design choice from first principles.

---

# PART 1 — High Level Overview

## 1. What Architecture Pattern Does Growlic Follow?
Growlic is built using a **Feature-First (Modular) Architecture** combined with the **Next.js App Router** framework. 

In standard React projects, developers group files by technical role (e.g. putting all components in `components/`, all state managers in `redux/`, all helper scripts in `utils/`). As applications grow, this approach turns into a "spaghetti codebase" where a developer must modify 10 different files scattered across 10 folders to build a single feature.

Under the **Feature-First** model, Growlic groups code around **Business Domains** (or features) like `menu`, `order`, `customer`, `auth`, and `analytics`. Each feature folder is a self-contained "micro-application" that contains its own UI components, business logic, schemas, and type declarations.

```
+-------------------------------------------------------------+
|                       Next.js App Router                    |
|                (Thin routing wrapper in src/app/)           |
+------------------------------+------------------------------+
                               |
        +----------------------+----------------------+
        |                      |                      |
+-------v-------+      +-------v-------+      +-------v-------+
|  menu feature |      | order feature |      | auth feature  |
|  components/  |      |  components/  |      |  components/  |
|   services/   |      |   services/   |      |   services/   |
|   schemas/    |      |   schemas/    |      |   schemas/    |
|    types/     |      |    types/     |      |    types/     |
+---------------+      +---------------+      +---------------+
```

## 2. Why Was This Architecture Chosen? (The SaaS Context)
Growlic is a **Multi-Tenant Software-as-a-Service (SaaS)** platform for restaurants. Multi-tenant means a single codebase runs the digital menu, payment flows, and dashboard panels for thousands of different restaurant outlets simultaneously. 

Each restaurant (tenant) requires isolation. However, they share the same base core logic. If the project's folder layout is not strictly structured, tenant leakages, slow rendering performance, and developer merge conflicts will halt business progress.

We chose this modular layout to support:
1.  **Strict Isolation:** A bug in the recommendations widget should never crash the order logging pipeline.
2.  **Autonomous Teams:** Team A can work on a Kitchen Display System (KDS) module while Team B refactors Menu Item settings, without ever touching the same files.
3.  **Low Friction Deletions:** If we decide to sunset our "Upsell Engine" module, we can delete the `features/menu/services/recommendationService.ts` and the associated components without breaking core menu operations.

---

## 3. The Restaurant Kitchen Analogy

Let's translate these software concepts into the daily operations of a professional restaurant kitchen:

```
[THE MONOLITH TABLE KITCHEN - OLD WAY]
+-----------------------------------------------------------+
| Pastry Chef  -  Grill Cook  -  Dishwasher  -  Prep Cook  |
| (All working on the SAME table, sharing one cutting board)|
+-----------------------------------------------------------+
  * Spilled flour ruins the soup.
  * Chefs constantly bump into each other.
  * If one tool breaks, the entire assembly line stops.

[SPECIALIZED STATIONS KITCHEN - NEW WAY]
+-------------------+   +-------------------+   +-------------------+
|   Grill Station   |   |   Salad Station   |   |  Dessert Station  |
| (Order Feature)   |   |  (Menu Feature)   |   |  (Promo Feature)  |
| - Spatulas/Meats  |   | - Chopping Boards |   | - Mixer/Flour     |
+---------+---------+   +---------+---------+   +---------+---------+
          |                       |                       |
          +-----------------------+-----------------------+
                                  |
                                  ▼
                   +-----------------------------+
                   |     The Passer Counter      |
                   |      (App Router Shell)     |
                   +-----------------------------+
```

### The Old Flat Monolith: The Single-Table Kitchen
Imagine a restaurant kitchen with only **one giant wooden table** in the middle. The grill chef, the prep cook, the pastry chef, the dishwasher, and the cashier all stand around this single table to perform their duties.
*   **The Spill Effect:** The pastry chef spills flour. It blows across the table, covering the fresh greens prepared by the salad cook. In code, this represents a change in a global utility helper that inadvertently breaks an unrelated dashboard panel.
*   **The Waiter Block:** The dishwasher blocks the sink. The dessert cook can't wash the mixing bowl, which slows down the grill cook waiting for clean plates. The entire kitchen halts.

### The New Modular Architecture: Specialized Kitchen Stations
In our new model, the kitchen is divided into independent, specialized **Stations**:
*   **The Salad Station (Menu Feature):** Contains its own greens, dressing containers, and knives. No flour is allowed here.
*   **The Grill Station (Order Feature):** Has its own grill surfaces, spatulas, and seasoning shakers.
*   **The Passer Counter (App Router / Shell):** An expeditor stands at the counter. The expeditor doesn't cook; they simply receive completed plates from the stations and hand them to the waiters (customers).

If the dessert oven breaks down, the kitchen can still serve burgers and Caesar salads. Developers work on their own "stations" without interfering with others.

---

# PART 2 — Before vs After

Let's contrast the architecture before and after the refactoring pass to understand the specific benefits achieved.

## 1. Directory Tree Comparison

### The Old Directory Structure
```
src/
├── components/
│   ├── admin/
│   │   ├── EditItemForm.tsx
│   │   ├── ui/
│   │   │   ├── AdminButton.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBadge.tsx
│   ├── menu/
│   │   ├── MenuList.tsx
│   │   ├── OrderTracker.tsx
│   │   └── CustomerNavbar.tsx
├── actions/
│   ├── auth.ts
│   ├── menu.ts
│   └── orders.ts
```

### The New Directory Structure
```
src/
├── app/
│   ├── admin/
│   │   ├── menu/
│   │   │   └── page.tsx      <-- Thin Routing Wrapper
│   │   └── orders/
│   │       └── page.tsx      <-- Thin Routing Wrapper
├── components/
│   ├── ui/                   <-- Shared Stateless Components Only
│   │   ├── AdminButton.tsx
│   │   └── StatusBadge.tsx
│   ├── layout/               <-- Global Page Shell Components
│   │   ├── Sidebar.tsx
│   │   └── CustomerNavbar.tsx
│   └── providers/            <-- Global Client Providers
│       └── ReduxProvider.tsx
├── features/                 <-- Business Domains
│   ├── menu/
│   │   ├── components/
│   │   │   ├── MenuPage.tsx
│   │   │   └── EditItemForm.tsx
│   │   └── services/
│   │       └── menuService.ts
│   └── order/
│       ├── components/
│       │   ├── OrdersPage.tsx
│       │   └── OrderTracker.tsx
│       └── services/
│           └── orderService.ts
```

---

## 2. Refactoring Comparison Table

The table below traces the structural changes across all major files in the repository:

| Old File Location | New File Location | Technical and Architectural Benefit |
| :--- | :--- | :--- |
| `src/components/menu/MenuList.tsx` | `src/features/menu/components/MenuList.tsx` | Colocates the customer-facing menu list grid next to menu services, local state hooks, and categories. |
| `src/components/admin/EditItemForm.tsx` | `src/features/menu/components/EditItemForm.tsx` | Ensures that restaurant-side menu item updates stay inside the Menu feature module. |
| `src/components/menu/OrderTracker.tsx` | `src/features/order/components/OrderTracker.tsx` | Relocates the live status tracker to the Order feature. It reads the specific order schema types cleanly. |
| `src/components/menu/CustomerNavbar.tsx` | `src/components/layout/CustomerNavbar.tsx` | Global layout headers belong in `components/layout/` since they display branding shell properties across multiple routes. |
| `src/components/admin/ui/AdminButton.tsx` | `src/components/ui/AdminButton.tsx` | Promoted to a global atomic UI primitive because it has zero dependency on business features. |
| `src/app/admin/menu/page.tsx` (Contains full view states) | `src/app/admin/menu/page.tsx` (Renders `<MenuPage />`) | Next.js app pages are kept clean. They focus on loading boundaries and routing parameters, passing render execution to the feature module. |

---

# PART 3 — Folder By Folder Explanation

Let's explain every directory in detail, outlining their specific purposes, boundaries, and communication APIs.

```
                              src/
                               │
       +-----------------------+-----------------------+
       │                                               │
   [Routing & Pages]                              [Codebase Core]
   src/app/                                        src/components/
                                                   src/features/
                                                   src/hooks/
                                                   src/redux/
                                                   src/shared/
```

---

## 1. `src/app/`
*   **Purpose:** Enforces directory-based routing paths in the Next.js App Router framework.
*   **Responsibilities:** Extracts routing slugs (e.g. `[id]`, `[slug]`), maps search params, coordinates layouts, and declares declarative loading (`loading.tsx`) and error fallback views (`error.tsx`).
*   **What belongs here:** `page.tsx`, `layout.tsx`, `route.ts` API endpoints, next metadata headers.
*   **What must NEVER go here:** Core database queries, inline styling classes for custom grids, complex interactive form validations.
*   **When to add new files:** When a new user-accessible route is needed (e.g., adding `/admin/loyalty/` needs `src/app/admin/loyalty/page.tsx`).
*   **When NOT to add new files:** When modifying a modal's buttons or design features.
*   **Communication Protocol:** Passes routing parameters down to feature pages via React properties (props).
    ```
    src/app/admin/menu/page.tsx ──(Props)──> src/features/menu/components/MenuPage.tsx
    ```

---

## 2. `src/features/`
*   **Purpose:** Houses all domain-specific feature modules of the platform.
*   **Responsibilities:** Manages features, local states, forms, data services, input transformations, and TypeScript interfaces.
*   **What belongs here:** `menu/`, `order/`, `customer/`, `auth/`, `analytics/`.
*   **What must NEVER go here:** Truly global UI primitives (like standard input boxes or basic spinners).
*   **When to add new files:** When introducing new domain capabilities (e.g. CRM, loyalty programs).
*   **When NOT to add new files:** When tweaking basic buttons or layouts that are used globally.
*   **Communication Protocol:** Interacts strictly through the feature's barrel file (`index.ts`). No cross-feature deep imports are allowed.

---

## 3. `src/components/ui/`
*   **Purpose:** Hosts the atomic design system of Growlic.
*   **Responsibilities:** Renders generic UI elements that are completely stateless and independent of business logic.
*   **What belongs here:** `AdminButton.tsx`, `StatusBadge.tsx`, `EmptyState.tsx`, generic input fields, card components.
*   **What must NEVER go here:** Calls to server actions, references to Redux store parameters, or feature-specific code.
*   **When to add new files:** When adding a new reusable UI component (like a custom dropdown select) that is stateless and feature-agnostic.
*   **When NOT to add new files:** When building a component that reads data from the database.
*   **Communication Protocol:** Imported by components inside the `features/` directory. Must never import from `features/`.
    ```
    src/features/menu/components/MenuList.tsx ──(Imports)──> src/components/ui/AdminButton.tsx
    ```

---

## 4. `src/components/layout/`
*   **Purpose:** Structures the structural shells of the Growlic user interfaces.
*   **Responsibilities:** Renders the main dashboard layouts, sidebar navigations, headers, and footers.
*   **What belongs here:** `Sidebar.tsx`, `MobileHeader.tsx`, `CustomerNavbar.tsx`.
*   **What must NEVER go here:** Page-specific components or data-fetching logic.
*   **When to add new files:** When creating a new page layout (e.g., a special double-column sidebar layout for tablets).
*   **When NOT to add new files:** When adding a specific settings form.
*   **Communication Protocol:** Used in `app/` layout files to wrap page children.

---

## 5. `src/components/providers/`
*   **Purpose:** Initializes client-side wrappers for App Router rendering.
*   **Responsibilities:** Configures React Contexts, injects Redux stores, and sets up notifications or toast libraries.
*   **What belongs here:** `ReduxProvider.tsx`.
*   **What must NEVER go here:** Layout styling grids or business models.
*   **When to add new files:** When integrating a new global library (like React-Query or a theme provider).
*   **When NOT to add new files:** When managing local component state.
*   **Communication Protocol:** Wraps the entire children tree inside the root `layout.tsx`.

---

## 6. `src/hooks/`
*   **Purpose:** Houses global React hooks that are not tied to any business feature.
*   **Responsibilities:** Manages generic browser activities (e.g. tracking screen size, handling local storage, monitoring scroll positions).
*   **What belongs here:** `useWindowSize.ts`, `useLocalStorage.ts`, `useOnClickOutside.ts`.
*   **What must NEVER go here:** Hooks that fetch menu items or manage cart item arrays.
*   **When to add new files:** When creating a reusable hook for browser operations.
*   **When NOT to add new files:** When creating a hook to fetch orders.
*   **Communication Protocol:** Imported globally by components.

---

## 7. `src/redux/`
*   **Purpose:** The single source of truth for global client-side state.
*   **Responsibilities:** Manages global state variables like user sessions, carts, and notification alerts.
*   **What belongs here:** `store.ts`, `authSlice.ts`, `cartSlice.ts`.
*   **What must NEVER go here:** Local component states or database queries.
*   **When to add new files:** When adding a new global client-side feature (like a global audio notification manager).
*   **When NOT to add new files:** When tracking a simple dropdown's open/close state.
*   **Communication Protocol:** Connects to client components using the `useSelector` and `useDispatch` hooks.

---

## 8. `src/lib/`
*   **Purpose:** Houses third-party library initializations and clients.
*   **Responsibilities:** Establishes database pools and configures external API clients.
*   **What belongs here:** `mongodb.ts` (database connection pools).
*   **What must NEVER go here:** Custom styling sheets or business features.
*   **When to add new files:** When introducing a new external client library (like Stripe or Redis).
*   **When NOT to add new files:** When building custom utility helpers.
*   **Communication Protocol:** Imported by server action services to query databases.

---

## 9. `src/shared/`
*   **Purpose:** Holds global constants, errors, and utility functions used across the application.
*   **Responsibilities:** Declares standard application error classes and generic helper methods.
*   **What belongs here:** `errors.ts` (e.g. `ValidationError`, `NotFoundError`), global utility functions.
*   **What must NEVER go here:** UI components or server actions.
*   **When to add new files:** When defining a global class or utility that is completely feature-agnostic.
*   **When NOT to add new files:** When defining types that belong to a single feature.
*   **Communication Protocol:** Can be imported anywhere in the codebase.

---

## 10. `src/styles/`
*   **Purpose:** Configures global stylesheets and styling tokens.
*   **Responsibilities:** Configures Tailwind directives, global typography rules, font imports, and base layouts.
*   **What belongs here:** `globals.css`.
*   **What must NEVER go here:** Component-specific CSS classes or scripts.
*   **When to add new files:** When creating custom theme layers.
*   **When NOT to add new files:** When writing styling rules for a single specific button.
*   **Communication Protocol:** Imported once at the root `layout.tsx` file.

---

# PART 4 — Deep Dive Into Features

Let's look at the internal directory structure of a feature module:

```
src/features/menu/
├── components/           # Presentation layer
│   ├── MenuPage.tsx      # Core feature view
│   └── EditItemForm.tsx  # Feature forms
├── hooks/                # Local custom hooks
│   └── useMenuFilter.ts  # Filtering logic
├── services/             # API and Actions integration
│   └── menuService.ts    # Server Action wrappers
├── schemas/              # Input schemas
│   └── menu.schema.ts    # Validation rules
├── types/                # TypeScript interfaces
│   └── menu.types.ts     # Interface keys
├── index.ts              # Feature Entry Barrel
└── README.md             # Guide documentation
```

### Why does a feature own all these subfolders?
By grouping these files within the feature directory, the feature becomes a self-contained module. Everything related to `menu` lives in `features/menu/`, making it highly cohesive and easy to maintain.

---

## Scenario A: Implementing the "Loyalty" Feature

Here is how you would structure the new `loyalty/` feature folder:

```
src/features/loyalty/
├── components/
│   ├── LoyaltyDashboard.tsx   # Dashboard displaying user points
│   └── PointsRedemption.tsx   # Dialog to redeem loyalty points
├── hooks/
│   └── useLoyaltyPoints.ts    # Manages points calculations
├── services/
│   └── loyaltyService.ts      # Server actions to deduct/add points in DB
├── schemas/
│   └── loyalty.schema.ts      # Validates point limits and exclusions
├── types/
│   └── loyalty.types.ts       # TypeScript interface keys
├── index.ts                   # Public barrel API
└── README.md                  # Loyalty program README
```

---

## Scenario B: Implementing the "Coupons" Feature

```
src/features/coupons/
├── components/
│   ├── CouponCodeInput.tsx    # Customer coupon apply button
│   └── CouponListTable.tsx    # Admin coupon log dashboard
├── services/
│   └── couponService.ts       # Server actions to check coupon codes
├── schemas/
│   └── coupon.schema.ts       # Validation schema for new coupons
├── types/
│   └── coupon.types.ts        # TypeScript coupon interface keys
├── index.ts                   # Public barrel API
└── README.md                  # Coupons module developer guide
```

---

## Scenario C: Implementing the "Inventory" Feature

```
src/features/inventory/
├── components/
│   ├── InventoryTracker.tsx   # Live stock list tracking grid
│   └── StockAdjustmentForm.tsx# Form to log ingredient changes
├── hooks/
│   └── useStockAlerts.ts      # Hook to warn if stock is below threshold
├── services/
│   └── inventoryService.ts    # Server actions to update stock levels in DB
├── schemas/
│   └── inventory.schema.ts    # Validates input amounts
├── types/
│   └── inventory.types.ts     # TypeScript stock interface keys
├── index.ts                   # Public barrel API
└── README.md                  # Inventory module developer guide
```

---

## Target Structures for other future features:
-   **CRM Feature (`src/features/crm/`):** Houses profile components, notes logs, schemas to validate phone formats, and services to fetch historical order frequency.
-   **Reservations Feature (`src/features/reservations/`):** Houses seating grid views, calendar hooks, booking schemas, and server actions to check table availability.
-   **Kitchen Display Feature (`src/features/kds/`):** Houses the active orders board view, polling hooks for real-time tickets, and services to update order status.
-   **AI Recommendations Feature (`src/features/menu/`):** Reuses the Menu feature service wrappers to match combos and threshold discount rules.
-   **Marketing Automation (`src/features/marketing/`):** Houses campaigns logs, newsletter schemas, and campaign statistics dashboards.
-   **Delivery Integration (`src/features/delivery/`):** Houses tracking components, distance validation schemas, and services to call external courier APIs (e.g. Dunzo, Shadowfax).
-   **Payments Feature (`src/features/order/`):** Uses payment modal components, checksum validation schemas, and payment service functions to call gateway APIs (e.g. Razorpay, Stripe).

---

# PART 5 — Request Lifecycle

Let's trace what happens when a customer scans a table QR code (e.g., `/menu/tokyo-momos?table=5`):

```
+-----------------------------------------------------------------------+
| 1. Browser: Customer opens URL "/menu/tokyo-momos?table=5"            |
+----------------------------------+------------------------------------+
                                   | (HTTP Request)
                                   ▼
+-----------------------------------------------------------------------+
| 2. Next.js Routing: Matches path "src/app/menu/[slug]/page.tsx"       |
+----------------------------------+------------------------------------+
                                   | (Props Compilation)
                                   ▼
+-----------------------------------------------------------------------+
| 3. Thin Page Container: Awaits parameters, renders <MenuList />       |
+----------------------------------+------------------------------------+
                                   | (Import Mounting)
                                   ▼
+-----------------------------------------------------------------------+
| 4. Feature Component: Mounts <MenuList /> from "@/features/menu"       |
+----------------------------------+------------------------------------+
                                   | (Hook Trigger)
                                   ▼
+-----------------------------------------------------------------------+
| 5. Hook: useRecommendation() filters promo logic                     |
+----------------------------------+------------------------------------+
                                   | (Action Dispatch)
                                   ▼
+-----------------------------------------------------------------------+
| 6. Service Layer: Calls getUpsellConfig() Server Action                |
+----------------------------------+------------------------------------+
| 7. Validation: Checks restaurant ID and parameters                    |
+----------------------------------+------------------------------------+
| 8. Database Repository: Queries MongoDB database                      |
+----------------------------------+------------------------------------+
                                   | (Data Flow Back Up)
                                   ▼
+-----------------------------------------------------------------------+
| 9. UI Hydration: UI updates, primary brand colors apply               |
+-----------------------------------------------------------------------+
```

### Why we have this multi-layered separation:
-   **Security:** Validation happens at the entry point of the server action. This blocks unauthorized requests before they ever query the database.
-   **Multi-Tenant Isolation:** The service layer injects the restaurant's `restaurantId` into all database queries, preventing data leakages between restaurants.
-   **Maintainability:** Each layer has a single responsibility, making code easy to read, test, and debug.

---

# PART 6 — Component Architecture

We divide our components into distinct categories to maintain clear separation of concerns.

```
                                +-------------------+
                                | Global Containers |
                                +---------+---------+
                                          |
                +-------------------------+-------------------------+
                |                                                   |
      +---------v---------+                               +---------v---------+
      |  Global Elements  |                               | Feature Components|
      |   (Stateless)     |                               | (Business Logic)  |
      +---------+---------+                               +---------+---------+
                |                                                   |
        +-------+-------+                                   +-------+-------+
        |               |                                   |               |
   +----v----+     +----v----+                         +----v----+     +----v----+
   |   UI    |     | Layout  |                         |  Pages  |     | Widgets |
   | (Button)|     |(Sidebar)|                         | (Menu)  |     |(RowCard)|
   +---------+     +---------+                         +---------+     +---------+
```

### 1. Global UI Components (`src/components/ui/`)
Stateless, reusable UI primitives.
*   **Examples:** `AdminButton`, `StatusBadge`, `EmptyState`.
*   **Rules:** They do not connect to the database, dispatch server actions, or read from the Redux store.

### 2. Global Layout Components (`src/components/layout/`)
Provide the structural shell of the application.
*   **Examples:** `Sidebar`, `MobileHeader`, `CustomerNavbar`.
*   **Rules:** They manage the grid layout and display branding variables, but they are not page-specific.

### 3. Feature Components (`src/features/*/components/`)
Feature-specific components that contain business logic.
*   **Examples:** `MenuList` (handles categories and carts) or `OrdersPage` (manages order logs and status updates).
*   **Rules:** They can read Redux state, dispatch actions, and handle feature-specific states.

### 4. Server Components (Next.js default)
*   Render on the server to optimize loading speed and SEO.
*   **Rule:** Keep all components as Server Components by default.

### 5. Client Components (`'use client';`)
*   Enable client-side interactions, hooks, and event listeners.
*   **Rule:** Move client components as deep down the tree as possible to reduce the client-side JavaScript bundle size.

---

# PART 7 — State Management

In a SaaS application, state should live in the most restricted scope possible. Do not put everything in Redux!

```
                                  Is the state needed globally?
                                       (e.g., auth, cart)
                                            /       \
                                         Yes         No
                                         /             \
                                   [Redux]      Does it need to survive page refreshes?
                                                        /       \
                                                     Yes         No
                                                     /             \
                                              [URL State]      [Local React State]
```

### 1. Local React State (`useState`)
*   **When to use:** For UI-only toggles, dropdown open states, current form fields.
*   **Example:** `const [customCategory, setCustomCategory] = useState('')` in the `EditItemForm`.

### 2. URL State (`searchParams` & `useSearchParams`)
*   **When to use:** For filtering lists, page numbers, sorting options, or highlighted IDs.
*   **Example:** Storing the active table ID (`?table=5`) or highlighted order ID (`?highlight=123`) in the URL. This allows users to bookmark or share links directly.

### 3. Global Client State (Redux Slices)
*   **When to use:** Only for data that multiple unrelated sections of the application must access simultaneously.
*   **Example:** The customer **Cart** (needed in the menu page, floating buttons, and checkout dialogs) and **Authentication Status** (needed in sidebars, navigation bars, and headers).

### 4. Server State (MongoDB + Next.js Cache)
*   **When to use:** For actual business records.
*   **Example:** List of active orders, menu items, or client logs. These do not belong in client-side state. They should be fetched fresh from the server and cached where appropriate.

---

# PART 8 — Data Flow

Data in Growlic flows in a single direction (unidirectional data flow) to ensure predictable updates.

```
+-------------------------------------------------------------+
|                        User Action                          |
|         (Admin clicks 'Accept' button on Orders page)       |
+------------------------------+------------------------------+
                               |
                               ▼
+-------------------------------------------------------------+
|                     Component State Event                   |
|           (Triggers click handler: handleStatusChange)      |
+------------------------------+------------------------------+
                               |
                               ▼
+-------------------------------------------------------------+
|                      Feature Service API                    |
|             (Calls updateOrderStatus server action)         |
+------------------------------+------------------------------+
                               |
                               ▼
+-------------------------------------------------------------+
|                      Database / MongoDB                     |
|           (Updates order status and returns new record)     |
+------------------------------+------------------------------+
                               |
                               ▼
+-------------------------------------------------------------+
|                         React Update                        |
|        (Server state updates; UI rerenders clean list)       |
+-------------------------------------------------------------+
```

### Why we split components from service actions:
-   **Predictable UI Updates:** The UI only updates when the database successfully confirms the action.
-   **Cleaner Components:** Page components focus purely on rendering the UI, leaving API requests and database queries to the service layer.

---

# PART 9 — Import Rules

To prevent code entanglement, we enforce strict module import rules.

## 1. No Deep Relative Imports
*   **Bad:** `import Button from "../../../../../components/ui/AdminButton";`
*   **Good:** `import { AdminButton } from "@/components/ui";`

Path aliases (`@/*`) point directly to the `src` directory, making imports clean, clean, and safe from folder move breaking changes.

## 2. Public API Barrel Exports (`index.ts`)
Each feature module has an `index.ts` file that acts as the public interface. 

```typescript
// src/features/menu/index.ts
export * from './services/menuService';
export * from './types';
export { default as MenuPage } from './components/MenuPage';
export { default as MenuList } from './components/MenuList';
```

### The Golden Rule of Feature Imports:
> You may import from another feature's barrel file (`@/features/menu`), but you must **NEVER** import from a deep nested file inside another feature (e.g., `@/features/menu/components/EditItemForm`).

---

# PART 10 — Validation

Validation rules sit inside central feature schemas (`schemas/`) to enforce consistent data validation.

```typescript
// src/features/menu/schemas/menu.schema.ts
import { ValidationError } from '@/shared/errors';

export const menuSchemas = {
  createMenuItem: (restaurantId: string, data: { name?: string; price?: number }) => {
    if (!restaurantId) throw new ValidationError('Restaurant ID is required');
    if (!data.name) throw new ValidationError('Item name is required');
    if (data.price === undefined || data.price < 0) {
      throw new ValidationError('Price must be a positive number');
    }
  }
};
```

### Why we do this:
-   **No Duplicate Code:** The exact same validation rules are used on the client form to show validation errors, and on the server to block malformed requests.
-   **Security:** Enforces strict parameters before any database insertions can happen.

---

# PART 11 — Loading & Error Boundaries

Next.js App Router allows us to implement loaders and error recovery screens declaratively.

```
                  +-----------------------------------+
                  |           Route Layout            |
                  |  (Shared Header, Sidebar Shell)  |
                  +-----------------+-----------------+
                                    |
                                    ▼
                  +-----------------------------------+
                  |           Error Boundary          |
                  |     (src/app/admin/error.tsx)     |
                  +-----------------+-----------------+
                                    |
                                    ▼
                  +-----------------------------------+
                  |          Suspense Fallback        |
                  |    (src/app/admin/loading.tsx)    |
                  +-----------------+-----------------+
                                    |
                                    ▼
                  +-----------------------------------+
                  |             Page View             |
                  |       (Rendering Completed)       |
                  +-----------------------------------+
```

### 1. `loading.tsx`
*   **How it works:** When a route is loading, Next.js displays the closest `loading.tsx` file automatically.
*   **Growlic Pattern:** We use custom loading pages with layout skeleton blocks to match the structure of our pages, avoiding layout shifts.

### 2. `error.tsx`
*   **How it works:** If a rendering error happens inside a route, Next.js catches it and renders the nearest client-side `error.tsx` component.
*   **Growlic Pattern:** By nesting `error.tsx` inside `/admin` and `/super-admin`, we ensure that if a dashboard widget fails, the rest of the application remains functional.

---

# PART 12 — Performance

Growlic is built with SaaS scale performance in mind:

1.  **Dynamic Component Loading (`next/dynamic`):**
    Large interactive views like the `MenuList`, `OrdersPage`, or charts are loaded dynamically on the client:
    ```typescript
    const OrdersPage = dynamic(() => import('@/features/order/components/OrdersPage'), {
      ssr: false,
      loading: () => <OrdersLoadingSkeleton />,
    });
    ```
    This reduces the initial bundle size, allowing the app to load instantly.
2.  **Server Components by Default:**
    All pages compile to pure HTML on the server. No React code or hydration runtime is loaded in the customer's browser for static content.
3.  **Strict Hydration Boundaries:**
    We only load client-side JavaScript where interaction is required (e.g. adding items to the cart).
4.  **Tree Shaking:**
    We structure imports using ES Modules, allowing build engines to remove unused code automatically.

---

# PART 13 — How To Add A New Feature

Suppose you are tasked to build the new **Inventory Module**. Here is your step-by-step developer guide:

### Step 1: Create the Feature Directory
Create the folder structure inside `src/features/`:
```bash
src/features/inventory/
├── components/
│   └── StockManager.tsx
├── schemas/
│   └── stock.schema.ts
├── services/
│   └── stock.service.ts
├── types/
│   └── stock.types.ts
├── index.ts
└── README.md
```

### Step 2: Define Types & Schemas
Define the stock models and schema checks:
```typescript
// src/features/inventory/types/stock.types.ts
export interface StockItem {
  _id: string;
  name: string;
  quantity: number;
  unit: string;
}
```
```typescript
// src/features/inventory/schemas/stock.schema.ts
import { ValidationError } from '@/shared/errors';

export const stockSchema = {
  validateStockUpdate: (quantity: number) => {
    if (quantity < 0) throw new ValidationError('Stock quantity cannot be negative');
  }
};
```

### Step 3: Implement Database & Service Actions
Write a service wrapper that updates stocks in MongoDB securely.

### Step 4: Build UI Components
Build `<StockManager />` as a component that displays items and calls your services.

### Step 5: Export public interface via `index.ts`
```typescript
// src/features/inventory/index.ts
export { default as StockManager } from './components/StockManager';
```

### Step 6: Create Route wrapper in App Router
Create `src/app/admin/inventory/page.tsx`:
```typescript
'use client';
import dynamic from 'next/dynamic';

const StockManager = dynamic(() => import('@/features/inventory/components/StockManager'), {
  ssr: false,
});

export default function InventoryPage() {
  return <StockManager />;
}
```

---

# PART 14 — How To Modify Existing Features

When modifying an existing feature, look at its specific module folders:

*   **To add a new database field to Menu Items:**
    1.  Update `MenuItem` interface in [src/features/menu/types/menu.types.ts](file:///f:/Myprojects/growlic/src/features/menu/types/menu.types.ts).
    2.  Update the MongoDB Mongoose schema in [src/features/menu/model.ts](file:///f:/Myprojects/growlic/src/features/menu/model.ts).
    3.  Update the forms inside [src/features/menu/components/EditItemForm.tsx](file:///f:/Myprojects/growlic/src/features/menu/components/EditItemForm.tsx) to render inputs for the field.
*   **To change customer checkout actions:**
    1.  Modify [src/features/order/validation.ts](file:///f:/Myprojects/growlic/src/features/order/validation.ts) and [order.schema.ts](file:///f:/Myprojects/growlic/src/features/order/schemas/order.schema.ts) to validate the new payload details.
    2.  Update [src/features/order/service.ts](file:///f:/Myprojects/growlic/src/features/order/service.ts) to handle the new steps.

---

# PART 15 — How To Remove Features

One of the main benefits of our modular architecture is how easy it is to remove code without causing unintended bugs.

### Example: Removing the "Upsell" feature
If we decide that Growlic no longer wants an upsell recommendations engine, we only need to follow these clean steps:

1.  **Delete the upsell page entry point:** Delete `src/app/admin/upsell/`.
2.  **Delete files in features:** Delete the upsell services inside `src/features/menu/services/recommendationService.ts` and components.
3.  **Cleanup the Sidebars:** Remove the links pointing to `/admin/upsell` in the Sidebar menu list.
4.  **Done!** Since the feature was self-contained, deleting these files won't break the Menu management or Order tracking.

---

# PART 16 — Scaling To 100 Restaurants

Growlic is built to support SaaS growth from 10 to 10,000 restaurants:

1.  **Logical Tenant Isolation:**
    Every MongoDB model includes `restaurantId` (e.g. `tokyo-momos`). Services automatically enforce tenant queries to ensure data security.
2.  **Code Scalability (100+ Developers):**
    Developers can own specific features. Developer A can refactor `features/menu/` while Developer B writes code in `features/order/` without causing Git merge conflicts.
3.  **Future Infrastructure Upgrades:**
    If database queries become slow at scale, we can split MongoDB collections into separate database clusters per restaurant without altering the UI layers.

---

# PART 17 — Future Roadmap

As Growlic expands, we recommend introducing the following patterns:

1.  **Feature Flags:**
    Use feature flags (e.g. LaunchDarkly) to toggling premium features (like loyalty programs or delivery integrations) per restaurant tier.
2.  **Role-Based Access Control (RBAC):**
    Enforce permission checks inside the service layer (e.g., checking if a user has "owner" or "kitchen-staff" role before calling status update actions).
3.  **Real-Time Subscriptions:**
    Implement WebSockets or Server-Sent Events (SSE) to push new order tickets to the Kitchen Display System (KDS) instantly.

---

# PART 18 — Beginner Decision Guide

Use these simple charts to determine where to create new files in the codebase.

### 1. I am creating a new component. Where should it go?
```
Is this component used across multiple features?
     ├── Yes: Does it have business/SaaS logic?
     │          ├── Yes: Create it inside a core feature module.
     │          └── No: Put it in src/components/ui/ or src/components/layout/.
     │
     └── No: Keep it inside src/features/<my-feature>/components/.
```

### 2. I need to store state. Should I use Redux?
```
Is this state accessed by 3 or more unrelated features?
     ├── Yes: Does the state need to survive page reloads?
     │          ├── Yes: Store in MongoDB or URL query params.
     │          └── No: Add a slice in src/redux/.
     │
     └── No: Use local React state (useState).
```

---

# PART 19 — Common Mistakes

Here are 50 common mistakes beginners make in this architecture, why they are bad, and how to write them correctly.

### 1. Deep relative imports from other features
*   **Incorrect:** `import { someHelper } from '../../menu/utils/helpers';`
*   **Why it is bad:** Breaks the public API contract of features and makes paths fragile when folders are moved.
*   **Correct:** `import { someHelper } from '@/features/menu';` (Exported in the barrel file).

### 2. Direct database connection imports in client components
*   **Incorrect:** `import dbConnect from '@/lib/mongodb';` inside a `'use client';` file.
*   **Why it is bad:** Database connection pools can only execute on the server.
*   **Correct:** Create a server action inside `services/` and fetch the data asynchronously.

### 3. Adding `'use client'` on all files
*   **Incorrect:** Placing `'use client';` at the top of every new component.
*   **Why it is bad:** Disables Server Component optimizations, increasing bundle sizes.
*   **Correct:** Default to Server Components. Add client tags only when hooks or browser event listeners are required.

### 4. Storing local component open states in Redux
*   **Incorrect:** Storing a simple popup boolean in the global Redux store.
*   **Why it is bad:** Creates unnecessary global renders and clutters the Redux store.
*   **Correct:** Use standard local React state `const [isOpen, setIsOpen] = useState(false)`.

### 5. Deeply nested feature subdirectories
*   **Incorrect:** `src/features/menu/components/edit/form/fields/buttons/MyButton.tsx`.
*   **Why it is bad:** Makes folder browsing difficult and hard to trace.
*   **Correct:** Keep files flat under `components/` inside the feature.

### 6. Overwriting styles in `globals.css` instead of Tailwind utilities
*   **Incorrect:** Writing raw CSS selectors like `button { background: red; }` in `globals.css`.
*   **Why it is bad:** Pollutes global styles, causing style clashes across different components.
*   **Correct:** Use Tailwind classes `bg-red-500` or local CSS modules.

### 7. Hardcoding route parameters
*   **Incorrect:** `const slug = "tokyo-momos";` hardcoded inside a component.
*   **Why it is bad:** Breaks multi-tenant routing support.
*   **Correct:** Read parameters dynamically via Next.js props: `const { slug } = params;`.

### 8. Fetching data in client components on mount without loading skeletons
*   **Incorrect:** Fetching API logs inside `useEffect` and rendering a blank page while loading.
*   **Why it is bad:** Leads to bad user experience and layout shifts.
*   **Correct:** Use Next.js loading boundaries or render skeleton placeholders.

### 9. Hardcoding categories in menu filters
*   **Incorrect:** `const categories = ["Momo", "Drinks", "Rice"];` defined inside the client.
*   **Why it is bad:** Admins cannot add custom categories without code changes.
*   **Correct:** Fetch categories dynamically from the database.

### 10. Direct file mutations in Redux slices
*   **Incorrect:** Mutating Redux state directly in reducers.
*   **Why it is bad:** Violates Redux's immutability rule, leading to state update bugs.
*   **Correct:** Use Redux Toolkit reducers which handle immutability under the hood.

### 11. Putting database logic inside App Router `page.tsx`
*   **Incorrect:** Executing MongoDB aggregates directly in `src/app/admin/menu/page.tsx`.
*   **Why it is bad:** Mixes routing configuration with data query logic.
*   **Correct:** Implement queries inside `features/menu/services/menuService.ts` and call it from the page component.

### 12. Importing client components without dynamic loading
*   **Incorrect:** Direct import of large chart sheets at the top of the dashboard.
*   **Why it is bad:** Increases initial bundle size, slowing down page loads.
*   **Correct:** Use `dynamic()` wrapper to load charts on demand.

### 13. Hardcoding error messages
*   **Incorrect:** `alert('Something went wrong')` inside event catch statements.
*   **Why it is bad:** Hard to debug and provides no context to the user.
*   **Correct:** Render contextual fallback states or use error logging.

### 14. Creating duplicate button components
*   **Incorrect:** Writing a custom `<button className="px-4 bg-red-600 ...">` inside a feature component.
*   **Why it is bad:** Breaks UI design consistency.
*   **Correct:** Reuse the global `<AdminButton />` from `@/components/ui`.

### 15. Storing raw database IDs in local storage
*   **Incorrect:** Storing passwords or user credentials in `localStorage`.
*   **Why it is bad:** Security vulnerability.
*   **Correct:** Manage authentication securely via HTTP-Only session cookies.

### 16. Missing TypeScript interfaces for server action inputs
*   **Incorrect:** `async function updateItem(data: any)` without type declarations.
*   **Why it is bad:** Bypasses TypeScript's compiler checks, leading to runtime errors.
*   **Correct:** Define and export strict TypeScript interfaces in `types/`.

### 17. Creating circular dependencies between features
*   **Incorrect:** Feature A importing from Feature B, and Feature B importing from Feature A.
*   **Why it is bad:** Causes compilation errors and tight coupling.
*   **Correct:** Move shared logic to a parent service or standard `shared/` utils.

### 18. Putting business logic in components instead of services
*   **Incorrect:** Writing currency conversions or tax calculations directly in a React component.
*   **Why it is bad:** Prevents code reuse and makes testing difficult.
*   **Correct:** Extract logic to service helpers or utility modules.

### 19. Using hardcoded secrets in the code
*   **Incorrect:** `const key = "mongodb+srv://..."` declared directly in code files.
*   **Why it is bad:** Security risk.
*   **Correct:** Use environmental variables `process.env.MONGODB_URI`.

### 20. Storing massive binary images in the project repo
*   **Incorrect:** Putting a 10MB promo banner inside `public/`.
*   **Why it is bad:** Increases Git repository size and slows down compilation.
*   **Correct:** Upload assets to an external CDN and load image URLs.

### 21. Writing raw MongoDB queries inside repository wrappers without tenant filtering
*   **Incorrect:** `Order.find({ status: 'received' })` without checking `restaurantId`.
*   **Why it is bad:** Exposes other tenants' data, violating multi-tenant isolation rules.
*   **Correct:** Always query with tenant constraints: `Order.find({ restaurantId, status: 'received' })`.

### 22. Not handling database transaction failures
*   **Incorrect:** Executing writes without wrapping operations in `try-catch` structures.
*   **Why it is bad:** Unhandled errors will crash the server action execution.
*   **Correct:** Always handle database transaction exceptions gracefully.

### 23. Direct DOM mutations inside React components
*   **Incorrect:** Using `document.getElementById('momo-card').style.color = 'red'`.
*   **Why it is bad:** Bypasses React's virtual DOM reconciliation, leading to state conflicts.
*   **Correct:** Update element colors dynamically using React props or state.

### 24. Forgetting `key` props in map lists
*   **Incorrect:** `{items.map(item => <div>{item.name}</div>)}` without key attributes.
*   **Why it is bad:** Slows down React rendering and causes bugs during list updates.
*   **Correct:** Use unique keys: `{items.map(item => <div key={item._id}>{item.name}</div>)}`.

### 25. Placing layout spacing CSS inside atomic UI components
*   **Incorrect:** Adding `margin-top: 20px` styles directly inside the `<AdminButton />` base component.
*   **Why it is bad:** Prevents the component from being reused in different layout contexts.
*   **Correct:** Apply spacing class parameters from the parent grid layout.

### 26. Importing CSS files inside feature folders
*   **Incorrect:** `import './styles.css'` inside a feature component.
*   **Why it is bad:** Next.js restricts global style imports to the root level.
*   **Correct:** Style components using Tailwind classes or local CSS modules.

### 27. Using `window` variables in server components
*   **Incorrect:** Using `window.location.href` in code that runs on the server.
*   **Why it is bad:** The `window` object is only available in the browser.
*   **Correct:** Wrap browser-specific code in `useEffect` or check `typeof window !== 'undefined'`.

### 28. Creating global state slices for static configurations
*   **Incorrect:** Initializing Redux slices to store static menu category names.
*   **Why it is bad:** Redux should only store dynamic client-side state.
*   **Correct:** Store static configurations in a config file or constants helper.

### 29. Bypassing schema checks during manual database inserts
*   **Incorrect:** Creating database records directly without validating input fields.
*   **Why it is bad:** Can write corrupt or invalid data to the database.
*   **Correct:** Always run validation schema checks before database writes.

### 30. Duplicating type interfaces across different features
*   **Incorrect:** Declaring the `MenuItem` type in both the `menu` and `order` features.
*   **Why it is bad:** Creates a maintenance headache when the type changes.
*   **Correct:** Import types from the owner feature's barrel file: `import { MenuItem } from '@/features/menu'`.

### 31. Calling server actions directly inside hooks without loading state tracking
*   **Incorrect:** Dispatching API updates without checking if a previous request is still pending.
*   **Why it is bad:** Can cause race conditions and multiple duplicate writes.
*   **Correct:** Track request states using a loading indicator boolean.

### 32. Using `next/navigation` router inside server actions
*   **Incorrect:** Importing `useRouter` in a server action.
*   **Why it is bad:** Routing hooks only work inside client components.
*   **Correct:** Return response objects from actions and handle navigation on the client.

### 33. Mixing business domains inside a single service file
*   **Incorrect:** Creating a `superService.ts` that manages both menu items and order updates.
*   **Why it is bad:** Tight coupling makes code hard to test and maintain.
*   **Correct:** Keep services focused on their respective domains.

### 34. Storing date values as raw local strings in database records
*   **Incorrect:** Writing dates as `26th June` to the database.
*   **Why it is bad:** Prevents date sorting and search queries.
*   **Correct:** Store dates in standard ISO formats.

### 35. Forgetting to clean up intervals inside `useEffect`
*   **Incorrect:** Running `setInterval` without returning a cleanup function.
*   **Why it is bad:** Causes memory leaks as users navigate between pages.
*   **Correct:** Always return a cleanup function: `return () => clearInterval(interval);`.

### 36. Not using absolute path aliases
*   **Incorrect:** `import { AdminButton } from '../../../../../components/ui/AdminButton'`.
*   **Why it is bad:** Makes import paths fragile and hard to read.
*   **Correct:** Use path aliases: `import { AdminButton } from '@/components/ui'`.

### 37. Hardcoding API endpoints
*   **Incorrect:** `fetch('http://localhost:3000/api/menu')` in fetch code.
*   **Why it is bad:** Breaks routing when deploying to staging or production environments.
*   **Correct:** Use relative paths `fetch('/api/menu')`.

### 38. Bypassing database schema validations
*   **Incorrect:** Disabling mongoose validations to bypass check constraints.
*   **Why it is bad:** Compromises data integrity.
*   **Correct:** Define and enforce strict schema constraints.

### 39. Using unoptimized image tags
*   **Incorrect:** Using `<img src="..." />` directly for large external images.
*   **Why it is bad:** Increases page load times and layout shifts.
*   **Correct:** Use Next.js `<Image />` component for automatic optimization.

### 40. Writing styles in inline objects
*   **Incorrect:** `style={{ color: 'red', marginTop: '20px' }}` in JSX code.
*   **Why it is bad:** Prevents code customization and breaks design consistency.
*   **Correct:** Use Tailwind classes `text-red-600 mt-5`.

### 41. Storing massive text files in git repositories
*   **Incorrect:** Committing huge database dumps directly to the repository.
*   **Why it is bad:** Bloats the repository size.
*   **Correct:** Store large files in cloud storage.

### 42. Over-using React context providers
*   **Incorrect:** Nesting 15 context providers at the root layout level.
*   **Why it is bad:** Slows down app performance due to unnecessary rerenders.
*   **Correct:** Use context providers only when truly necessary.

### 43. Using generic type assertions
*   **Incorrect:** `const item = data as any;` in TypeScript.
*   **Why it is bad:** Disables TypeScript's type safety checks.
*   **Correct:** Define and apply explicit type declarations.

### 44. Hardcoding layout heights
*   **Incorrect:** Using `h-[600px]` for main page layouts.
*   **Why it is bad:** Breaks responsiveness on smaller screens.
*   **Correct:** Use responsive styling classes like `min-h-screen`.

### 45. Inconsistent naming conventions
*   **Incorrect:** Mixing kebab-case and camelCase in file naming.
*   **Why it is bad:** Makes project navigation confusing for developers.
*   **Correct:** Enforce a strict naming convention (e.g. kebab-case for directories, PascalCase for components).

### 46. Placing database configurations inside server actions
*   **Incorrect:** Re-establishing MongoDB connection pools inside every server action call.
*   **Why it is bad:** Exhausts database connections quickly under load.
*   **Correct:** Re-use database connections globally.

### 47. Neglecting accessibility attributes
*   **Incorrect:** Building custom icon buttons without screen-reader descriptors.
*   **Why it is bad:** Excludes visually impaired users from using the application.
*   **Correct:** Add `aria-label` or `sr-only` tags to interactive elements.

### 48. Not using error boundaries
*   **Incorrect:** Rendering complex charts directly without wrapping them in an error boundary.
*   **Why it is bad:** A single chart failure can crash the entire dashboard page.
*   **Correct:** Wrap views in error boundaries to isolate failures.

### 49. Direct state mutations inside components
*   **Incorrect:** `items.push(newItem)` followed by `setItems(items)`.
*   **Why it is bad:** React won't detect the state change, preventing UI updates.
*   **Correct:** Treat state as immutable: `setItems([...items, newItem])`.

### 50. Missing loading states
*   **Incorrect:** Rendering blank screens during async operations.
*   **Why it is bad:** Confuses users, leading to multiple form submissions.
*   **Correct:** Always render loading spinners or skeletons during async calls.

---

# PART 20 — Architecture Cheat Sheet

Here is a quick-reference guide to help you build clean and consistent code in Growlic.

### 1. Folder Responsibilities

```
src/
├── app/                  # Routing paths (Thin page wrappers only)
├── components/
│   ├── ui/               # Stateless global UI primitives
│   └── layout/           # Shared app layouts (Sidebar, Nav)
└── features/
    └── <feature>/
        ├── components/   # Feature-specific UI components
        ├── services/     # Server action API wrappers
        ├── schemas/      # Validation schemas
        └── types/        # TypeScript interfaces
```

### 2. File Naming Conventions
*   **Components:** PascalCase (`AdminButton.tsx`, `MenuList.tsx`).
*   **Files / Services:** camelCase (`menuService.ts`, `auth.schema.ts`).
*   **Directories:** lowercase / kebab-case (`menu`, `super-admin`).

### 3. State Management Decision Matrix

| State Type | Scope | Example | Target State Manager |
| :--- | :--- | :--- | :--- |
| **Global Client State** | Cross-feature | Shopping Cart, Auth status | Redux Slices |
| **Route State** | URL-based | Active tab, Selected item ID | URL query parameters |
| **Local View State** | Single component | Modal visibility toggle | `useState` |
| **Server State** | Persistence | Orders database | MongoDB |

### 4. Code Quality & Performance Checklist
- [ ] Keep client components small.
- [ ] Lazy-load heavy pages using `next/dynamic`.
- [ ] Add `loading.tsx` to handle loading states smoothly.
- [ ] Avoid putting large static images inside code bundles (use CDN or `/public`).
- [ ] Always check type safety using `npx tsc --noEmit` before opening pull requests.
