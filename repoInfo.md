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
* **ESLint 9 (Flat Config) & eslint-plugin-import-x**: Compile-time boundary rule engine enforcing the layered structure rules.

---

## 3. Architecture Overview
The backend adheres to a strict, layered **Next.js MVC-style** architecture. Layers are completely isolated from one another to maximize code reuse, facilitate unit testing, and decouple transport layers from database logic:

```
  Browser/Client
       │
  API Route Controller / Server Action
       │ (Parses payloads, checks admin session/auth cookies, validates inputs)
       ▼
  Service Layer
       │ (Houses business rules, calculations, recommendations, analytics scoring)
       ▼
  Repository Layer
       │ (Abstracts database queries, connects cached Mongoose pools, normalizes schemas)
       ▼
  MongoDB (via Mongoose Models)
```

### Layer Responsibilities:
1. **Model Layer (`src/models/`)**: Defines strict Mongoose mongoose-schema interfaces. Contains zero database queries.
2. **Repository Layer (`src/repositories/`)**: The **only** layer allowed to import Mongoose models directly. Normalizes raw BSON document shapes into clean TypeScript interfaces (e.g., converting ObjectIds to strings) before returning data.
3. **Service Layer (`src/services/`)**: Contains pure business logic. Decoupled from HTTP details and Mongoose structures. For instance, the recommendation service can be triggered by the cart checkout route and the admin metrics dashboard interchangeably.
4. **Controller Layer (`src/actions/` & `src/app/api/`)**: Translates HTTP requests / form payloads into service function calls and serializes output. Collects error objects and handles routing logic.

### ESLint Boundaries:
The folder boundaries are mechanically enforced in `eslint.config.mjs`:
* **Controllers** cannot import `mongoose`, repositories, or models directly. They may only import from **Services**.
* **Services** cannot import `mongoose`, route-specific Next.js types (`next/server`, `next/headers`, `next/cache`), controllers, or models directly. They may only import from **Repositories**.
* **Other files** (e.g. components, pages, redux) cannot import `mongoose` or models. Only repositories, models, and the connection helper `src/lib/mongodb.ts` are permitted database-level access.

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
    ├── lib/                 # Global utility helper modules.
    │   ├── auth.ts          # JWT signatures and bcrypt password hashing.
    │   ├── errors.ts        # Centralized custom error definitions and route handlers.
    │   └── mongodb.ts       # Shared connection caching helper for Mongoose pool connection.
    ├── models/              # Schemas and models configuration.
    ├── redux/               # Client-side redux storage (store and cart state slices).
    ├── repositories/        # Database abstraction layer (Repository layer).
    ├── services/            # Pure business logic execution layer (Service layer).
    └── types/               # Globally accessible TypeScript interface contracts.
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

---

## 6. Database Schema Summary

MongoDB handles relations implicitly using references:

| Model | Schema File | Field / Type | Description / Relationships |
| :--- | :--- | :--- | :--- |
| **Admin** | `src/models/Admin.ts` | `email` (String)<br>`password` (String)<br>`restaurantId` (String)<br>`restaurantName` (String)<br>`phone` (String)<br>`designation` (String) | Represents tenant credentials and profile details. `restaurantId` acts as a unique slug parameter. |
| **Menu** | `src/models/Menu.ts` | `restaurantId` (String)<br>`category` (String)<br>`name` (String)<br>`price` (Number)<br>`available` (Boolean)<br>`pairsWithCategories` (String[])<br>`nutrition` (Subdocument)<br>`spiceLevel` (Number)<br>`prepTimeMin`/`prepTimeMax` (Number) | Individual menu items. `restaurantId` relates items to an Admin profile. |
| **Order** | `src/models/Order.ts` | `restaurantId` (String)<br>`customerName`/`customerPhone` (String)<br>`items` (Subdocument[])<br>`subtotal`/`total` (Number)<br>`status` (String)<br>`estimatedTime` (Number) | Individual transactions. Subdocument `items.menuItemId` references `Menu._id`. `items.nudgeRuleId` references `PairingRule._id` or `ComboRule._id`. |
| **Customer** | `src/models/Customer.ts` | `restaurantId` (String)<br>`phone` (String)<br>`name` (String)<br>`totalSpent` (Number)<br>`orderCount` (Number)<br>`lastOrderDate` (Date) | Tracks diner profiles across orders. Uniquely identified by `restaurantId` + `phone`. |
| **PairingRule** | `src/models/PairingRule.ts` | `restaurantId` (String)<br>`triggerCategory` (String)<br>`suggestCategories` (String[])<br>`active` (Boolean)<br>`triggerCount` (Number) | Rule-based cross-sell configurations. `triggerCategory` and `suggestCategories` correspond to `Menu.category` strings. |
| **DiscountTier** | `src/models/DiscountTier.ts` | `restaurantId` (String)<br>`minSpend` (Number)<br>`percentOff` (Number)<br>`categoryScope` (String/null)<br>`active` (Boolean) | Configures threshold-based discounts. `categoryScope` optionally restricts the discount to a specific `Menu.category` string. |
| **ComboRule** | `src/models/ComboRule.ts` | `restaurantId` (String)<br>`conditionCategory` (String)<br>`conditionExcludeCategory` (String)<br>`rewardType` (String)<br>`rewardTarget` (String)<br>`customerMessage` (String)<br>`active` (Boolean) | Configures complex promotions (e.g. BOGO). `rewardTarget` references a category string, specific item name, or value percent. |
| **Event** | `src/models/Event.ts` | `restaurantId` (String)<br>`type` (String)<br>`itemId` (String)<br>`nudgeType` (String)<br>`createdAt` (Date) | Analytical log tracking client-side events (`cart_create`, `nudge_show`, `modal_open`) for metric calculation. |

---

## 7. Decision Log

### A. Architectural Choice: MVC Layered Architecture Refactoring
* **Built/Changed**: Extracted inline business calculations, Mongoose schemas, and routes logic into dedicated `/services` and `/repositories` layers.
* **Why**: The recommendation engine and analytics calculations were duplicated or coupled to API transport details. Moving them to the service layer makes them universally callable across the cart API route, the analytics page, and mock scripts.
* **Improvement vs. Before**: Previously, queries to Mongoose were dropped inline inside routes. Now they pass through repositories, which enforce standardized document serialization, error formatting, and cached connection setup.
* **Tradeoff**: Increases structural indirection. Adding a database query requires modifying both the repository definition and the service handler before it reaches the API route.

### B. Architectural Choice: ESLint Boundary Rules Enforcement
* **Built/Changed**: Installed `eslint-plugin-import-x` and added folder-scoped path rules to `eslint.config.mjs` matching controller, service, and repository paths.
* **Why**: The layered MVC boundary rules relied on developer memory during code reviews. Automated enforcement at lint-time prevents future shortcuts (e.g., dropping raw Mongoose queries directly in server actions or API endpoints).
* **Improvement vs. Before**: Prevents silent architectural drift. Build actions and local runs immediately fail if boundaries are violated.
* **Tradeoff**: Restricts flexibility. A utility seeding script (`src/app/api/seed/route.ts`) that previously performed raw database cleanup had to be entirely refactored to use repository/service actions to bypass boundary failures.

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

---

## 8. What's Working Well
* **Layer Segregation**: 100% compliant with the boundary rules. Running `npm run lint` generates zero boundary import violations.
* **Centralized Error Validation**: Uniform error handlers (`handleRouteError` inside `lib/errors.ts`) map cast and validation errors to clean client messages.
* **Redux State Management**: Cart storage is robust and survives browser reloads seamlessly.
* **TypeScript Type Safety**: All repository and service layers compile cleanly.

---

## 9. What Needs Attention / Open Items
* **Menu Category Gaps**: The seeded default database menu does not contain a dedicated "Drinks & Beverages" category. It uses soups and side snacks as combos instead, leaving a gap for standard drink upsells.
* **Discount Tier Estimates**: The ₹399/₹599/₹899 milestones are estimates based on average order sizes. These thresholds should be revised using empirical order distribution data after the system operates live.
* **Missing Analytics Tracking**: Cart-abandonment events and item modal views are only partially tracked or mocked. Full integration of checkout abandonments is required for reliable conversions.
* **Pre-existing Code Warnings**: There are ~63 non-boundary lint warnings in components/pages (e.g. `no-explicit-any` usage, react-hook state calls inside effects, and unescaped quotes). These do not break compilation but need cleanup.

---

## 10. How to Add a New Feature
To add a new feature (e.g., adding "Table Reservation" or a new "Allergen Management" module):

1. **Define the Database Schema (`src/models/`)**:
   Create a new file `src/models/Reservation.ts` specifying the Mongoose model parameters.
2. **Define the Repository (`src/repositories/`)**:
   Create `src/repositories/reservationRepository.ts`. This file connects to Mongoose, executes the db actions, normalizes the return documents, and is the only file allowed to import your model.
3. **Define the Service Layer (`src/services/`)**:
   Create `src/services/reservationService.ts`. Handle business validations, calculations, and call your repository methods. Keep this file database- and Next.js-agnostic.
4. **Create the Controller / Server Action (`src/actions/` or `src/app/api/`)**:
   Create a server action or route handler. Parse inputs, call the service layer inside a `try-catch` block, and handle responses or call `handleRouteError` for API routes.
5. **Run Lint Checks (`npm run lint`)**:
   Ensure no layer boundaries are violated (e.g., you did not import the model directly into the controller). The build will fail if layers are crossed.
