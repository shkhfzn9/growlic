# Growlic Multi-Tenant Overlap Corrections & Isolation Analysis

## Executive Summary

Growlic is an advanced multi-tenant operating platform supporting diverse business verticals:
- **Food & Beverage / Restaurant** (e.g., Momos, Dine-in, Takeaway, Delivery)
- **Salon & Spa** (e.g., Hair styling, Grooming, Scheduled appointments, Stylist allocation)
- **Auto Detailing** (e.g., Ceramic coating, Detailing bays, Wash packages)
- **Retail / Services** (e.g., Direct checkout, Counter sales)

When multi-tenant systems share core data models (`Order`, `Cart`, `AdminNavigation`, `POS`), cross-vertical leakage occurs if components make assumptions tailored to restaurants (such as assuming every business has a kitchen, tables, waiters, and kitchen preparation stopwatches). 

This document provides a comprehensive audit of all cross-tenant overlaps identified across the codebase, categorizes them strictly into **Immediate (P0 - Prod-Ready)** versus **Deferred (P1/P2 - Non-Urgent)**, documents the fixes implemented, and specifies the architectural guardrails to prevent regressions.

---

## Issue Classification Matrix

| ID | Issue Description | Area | Severity | Status |
|---|---|---|---|---|
| **P0-1** | "Kitchen Prep Performance" & positive elapsed stopwatch appearing in Salon orders | Admin Orders | **P0 (Immediate)** | **RESOLVED** |
| **P0-2** | Salon customers flashing restaurant layout (Dine-in / Takeaway / Table #) on Cart page | Customer Checkout | **P0 (Immediate)** | **RESOLVED** |
| **P0-3** | Order Tracker missing appointment details & flashing restaurant countdown | Customer Tracking | **P0 (Immediate)** | **RESOLVED** |
| **P0-4** | Salon Admin forced into restaurant action buttons ("Set Preparation Time") | Admin Orders | **P0 (Immediate)** | **RESOLVED** |
| **P0-5** | "Bookings & Schedule" nav link appearing at top of Restaurant Admin sidebar | Navigation Shell | **P0 (Immediate)** | **RESOLVED** |
| **P0-6** | Walk-in POS Form defaulting to "Kitchen / Chef Notes" and restaurant order types | Admin Counter POS | **P0 (Immediate)** | **RESOLVED** |
| **P0-7** | "Call Staff" dialog calling "waiter to Table" with hardcoded tenant fallback | Customer Navbar | **P0 (Immediate)** | **RESOLVED** |
| **P1-1** | Settings Page displaying "Table QR Codes" instead of Stations / Bays | Admin Settings | **P1 (Deferred)** | Catalogued |
| **P1-2** | SOP Staff Tracker defaulting task templates to "Kitchen Staff" | Admin SOP | **P1 (Deferred)** | Catalogued |
| **P1-3** | Expense Tracker preset categories tailored to F&B (Raw Groceries, Gas) | Admin Expense | **P1 (Deferred)** | Catalogued |
| **P2-1** | Service Duration & Multi-specialist Cart Conflict Resolution | Engine / Cart | **P2 (Long-term)** | Catalogued |
| **P2-2** | Centralized Tenant Context Provider (SSR Hydration) | Architecture | **P2 (Long-term)** | Catalogued |

---

## Immediate / P0 Issues (Production-Ready Fixes)

### 1. P0-1: Kitchen Prep Performance & Stopwatch Timer Leakage into Non-Restaurant Businesses
* **Symptom:** Salon orders displayed "Kitchen Prep Performance", "Prep Duration (1m 41s)", "On-Time", and positive elapsed timers (`+608m 01s`).
* **Root Cause:** In `src/features/order/components/OrdersPage.tsx`, the prep stopwatch and completion metric cards were rendered solely based on `selectedOrder.status` without verifying `businessCategory === 'restaurant'`.
* **Resolution Implemented:**
  - Added strict guardrails in `OrdersPage.tsx`:
    ```tsx
    // Guard rail: Salons, detailing, and retail do NOT have kitchen prep metrics
    if (businessCategory !== 'restaurant') {
      return null;
    }
    ```
  - Guarded list item stopwatch badges in `OrderListItem`:
    ```tsx
    {effectiveCategory === 'restaurant' && timerInfo?.type === 'running' && (...)}
    {effectiveCategory === 'restaurant' && timerInfo?.type === 'completed' && (...)}
    ```
  - Added dedicated salon badge in the order list:
    ```tsx
    {(order.appointmentDetails || effectiveCategory === 'salon') && (
      <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
        <span>📅 {order.appointmentDetails?.bookingDate || 'Booking'} {order.appointmentDetails?.bookingTime ? `• ${order.appointmentDetails.bookingTime}` : ''}</span>
      </span>
    )}
    ```
  - Added a dedicated Salon Appointment Details card in the detail panel showing Booking Date, Time Slot, Specialist Name, and Service Status.

---

### 2. P0-2: Cart Layout Flash (Salon Customer Flashing Restaurant Controls First)
* **Symptom:** When a salon customer added a haircut or facial and navigated to `/cart`, the page briefly flashed restaurant Dine-in / Takeaway toggle buttons, table number inputs, and chef notes before fetching the salon theme and switching.
* **Root Cause:**
  1. `cartSlice.ts` did not persist `businessCategory` in Redux or `localStorage`.
  2. `CartPage.tsx` defaulted state to `businessCategory = 'restaurant'` and only updated after an asynchronous `getRestaurantMenuContext(cart.restaurantId)` network call resolved.
* **Resolution Implemented:**
  - Updated `CartState` in `src/redux/cartSlice.ts` to store `businessCategory?: string`.
  - Updated `addItem` action in `cartSlice.ts` to accept and persist `businessCategory` into `localStorage`.
  - Updated `MenuList.tsx` to dispatch `businessCategory: menuContext?.admin?.businessCategory || 'restaurant'` when adding any item to the cart.
  - Updated `CartPage.tsx` to synchronously initialize state from Redux and `localStorage` on initial render:
    ```tsx
    const [businessCategory, setBusinessCategory] = useState<string>(() => {
      if (cart.businessCategory) return cart.businessCategory;
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('cart_business_category');
        if (stored) return stored;
      }
      return 'restaurant';
    });
    ```
  - Result: Zero layout flashing; salon cart UI renders instantly on first paint.

---

### 3. P0-3: Public Order Tracker Payload Omission & Restaurant Countdown Flash
* **Symptom:** When a customer visited `/track/[token]`, the page flashed food prep countdown timers ("Order Placed", "Preparing in Kitchen") and lacked appointment details.
* **Root Cause:**
  - The backend method `getPublicOrderTrackInfo` in `src/features/order/service.ts` omitted `businessCategory` and `appointmentDetails` from the public payload projection.
  - `OrderTracker.tsx` defaulted `businessCategory` to `'restaurant'`.
* **Resolution Implemented:**
  - Enriched `getPublicOrderTrackInfo` to return `businessCategory` and `appointmentDetails` directly in the initial payload.
  - Updated `OrderTracker.tsx` to initialize `businessCategory` directly from `initialOrder.businessCategory`.
  - Integrated `getVocabulary(businessCategory)` for dynamic stepper titles ("Appointment Confirmed", "Service In-Progress", "Service Completed").
  - Added Reserved Appointment Details card with specialist name, date, and slot.

---

### 4. P0-4: Admin Orders Detail Actions Mismatch
* **Symptom:** Salon administrators viewing a received booking were prompted with "Set Preparation Time" with kitchen prep buttons (15m, 20m, 30m, 45m, 60m) and "Start Preparing".
* **Root Cause:** `OrdersPage.tsx` had a single hardcoded restaurant workflow for status transitions.
* **Resolution Implemented:**
  - Created a dedicated action workflow for `businessCategory === 'salon'`:
    - **Received:** "Accept & Confirm Booking", "Start Service", "Decline Booking"
    - **Accepted:** "Start Service", "Mark Completed", "Cancel Booking"
    - **Preparing:** "Mark Completed", "Cancel Booking"
    - **Ready:** "Complete Service"
  - Restaurants retain their standard prep-time estimation and kitchen dispatch buttons.

---

### 5. P0-5: Sidebar & Mobile Navigation Bleed
* **Symptom:** Restaurant managers saw "Bookings & Schedule" as the very first link in their sidebar navigation; Salons saw "Menu" with fork/knife icons.
* **Root Cause:** `Sidebar.tsx` and `MobileHeader.tsx` had a static `navLinks` array without category filtering.
* **Resolution Implemented:**
  - Added dynamic filtering:
    ```tsx
    const filteredNavLinks = navLinks.filter((link) => {
      if (link.href === '/admin/appointments' && businessCategory === 'restaurant') {
        return false;
      }
      return true;
    });
    ```
  - Dynamic vocabulary mapping:
    - Salons see: "Bookings & Schedule", "Services" (instead of Menu), "Appointments & Station QR".
    - Restaurants see: "Orders", "Menu", "Settings & Table QR".

---

### 6. P0-6: POS Walk-in Counter Form Cross-Tenant Leakage
* **Symptom:** In `/admin/orders/new-counter`, salon desk staff were prompted with "Kitchen / Chef Notes" and "Table Number", and search placeholder said "Search menu items or food categories...".
* **Root Cause:** `CounterOrderForm.tsx` had hardcoded F&B terms and did not query `businessCategory`.
* **Resolution Implemented:**
  - Hydrated `businessCategory` from `getRestaurantDetails()`.
  - Integrated `getVocabulary(businessCategory)`.
  - Dynamically switched order types:
    - Salon: "💇 Walk-in / In-Salon", "📅 Scheduled Slot", "🏡 Home Service".
    - Restaurant: "🥡 Takeaway", "🍽️ Dine In", "🛵 Delivery".
  - Switched labels to "Station Number" and "Stylist / Service Notes".
  - **Small-Screen & Mobile Responsiveness:** Fixed issue where customer details form and order ticket were hidden or jumped/disappeared when item count was high:
    - Added high-visibility Mobile Segmented Tab Controller (`1. Items` vs `2. Customer & Ticket`) on screens `< lg`.
    - Added Fixed Floating Bottom Cart Bar on mobile showing live count & subtotal (`₹{total}`) with 1-tap jump to Customer Details & Ticket.
    - Added Mobile Quick-Return Banner in Ticket View (`← + Add More Items`) to toggle seamlessly back to menu items.
    - Guarded `sticky` positioning to `lg:sticky lg:top-6`, eliminating mobile viewport scroll-clipping and flickering.
    - Auto-switches to Customer & Ticket tab if phone validation fails on submit, keeping error in direct focus.

---

### 7. P0-7: Customer Call Staff Cross-Tenant Leakage & Hardcoded Tenant Fallback
* **Symptom:** In `CustomerNavbar.tsx`, clicking "Call Staff" displayed: "Ring the service alert to call a waiter to Table {tableId}?", and fell back to `tokyo-momos`.
* **Root Cause:** Hardcoded strings in the confirmation modal and hardcoded fallback restaurant ID.
* **Resolution Implemented:**
  - Replaced hardcoded waiter copy with:
    `Ring the service alert to request assistance at {vocab.tableNoun} {cart.tableId || (businessCategory === 'salon' ? 'Station' : 'Takeaway')}?`
  - Removed `'tokyo-momos'` fallback; staff call is strictly bounded to the active tenant.
  - Dynamic navbar icon: `Sparkles` and `vocab.itemsNoun` (Services) for salons vs `UtensilsCrossed` for restaurants.

---

## Deferred Issues (P1 & P2 - Scheduled Roadmap)

These issues do not block production release or corrupt tenant customer workflows, but should be addressed in subsequent sprints.

### 1. P1-1: Settings Page Table QR Code Generation UI
* **Location:** `src/features/auth/components/SettingsPage.tsx`
* **Issue:** The QR code generation section reads "Table QR Codes" with inputs for "Number of Tables". For a salon or detailing shop, this should read "Styling Station QR Codes" or "Detailing Bay QR Codes".
* **Urgency:** P1 (Pre-Launch Polish).
* **Fix Plan:** Wrap the QR section in `vocab.tableNoun` helpers:
  - If Salon: "Generate Station / Chair QR Codes"
  - If Detailing: "Generate Bay QR Codes"

### 2. P1-2: SOP Staff Tracker Task Templates
* **Location:** `src/features/sop/repository.ts` and `src/models/SopTask.ts`
* **Issue:** Default seed tasks and role dropdowns in SOP tracker default to "Kitchen Staff" with tasks like "Sweep and mop kitchen & dining floor" and "Check raw inventory".
* **Urgency:** P1 (Admin Operational Polish).
* **Fix Plan:** Introduce category-specific SOP seeding:
  - Salon: "Sterilize shears & clippers", "Replenish shampoo & color bowls", "Wash salon towels".
  - Detailing: "Clean foam cannons", "Inspect microfiber towels", "Calibrate paint depth gauges".

### 3. P1-3: Expense Tracker Preset Categories
* **Location:** `src/features/expense/components/ExpenseTracker.tsx`
* **Issue:** Expense category dropdown presents "Raw Groceries", "Gas / Cylinder", "Packaging".
* **Urgency:** P1 (Financial Reporting Polish).
* **Fix Plan:** Add domain-aware presets:
  - Salon: "Hair Products & Dye", "Cosmetics", "Laundry / Towel Service", "Equipment Maintenance".
  - Detailing: "Ceramic Coatings", "Soaps & Solvents", "Water & Electricity".

### 4. P2-1: Service Duration & Multi-specialist Cart Conflict Resolution
* **Location:** `src/features/order/service.ts` & Cart checkout
* **Issue:** Currently, if a customer selects two services with different specialists in one order, the booking engine stores the primary slot and specialist.
* **Urgency:** P2 (Advanced Feature).
* **Fix Plan:** Support compound appointments where multiple services calculate cumulative duration (e.g., 45m haircut + 30m beard trim = 75m slot booking).

### 5. P2-2: Centralized Tenant Context Provider (SSR Hydration)
* **Location:** Global application layout (`src/app/layout.tsx` / `CustomerLayout.tsx`)
* **Issue:** Individual pages currently call `getRestaurantDetails()` or `getRestaurantMenuContext()` independently.
* **Urgency:** P2 (Architecture Optimization).
* **Fix Plan:** Introduce a single root `TenantProvider` in the app layout that resolves tenant identity, theme, business vertical, and vocabulary on the server and provides them via React Context.

---

## Architectural Guardrails Against Cross-Tenant Regressions

To ensure no future developer reintroduces cross-tenant leakage:

1. **Mandatory `businessCategory` on Orders & Carts:**
   - The database model `Order` strictly requires `businessCategory: { type: String, enum: ['restaurant', 'salon', 'detailing', 'retail'], default: 'restaurant' }`.
   - Every cart state and dispatched order payload MUST carry `businessCategory`.

2. **Vocabulary Utility (`src/config/businessVocabulary.ts`):**
   - Never hardcode "Table", "Chef", "Kitchen", "Menu", or "Waiter" in UI markup.
   - Always invoke `getVocabulary(businessCategory)` to get `vocab.tableNoun`, `vocab.kitchenNoun`, `vocab.itemsNoun`, `vocab.ordersNoun`.

3. **No Fallback to Specific Tenant IDs:**
   - Hardcoded strings like `'tokyo-momos'` are strictly forbidden in client and server code. If a tenant ID is missing from URL, query, or state, render a clean tenant selection or return an explicit 404/empty state.

4. **Zero-Lag State Hydration:**
   - Never default multi-tenant customer views to `'restaurant'` while awaiting an async fetch. Persist the category in `localStorage` and Redux so the correct vertical renders on frame 1.

---

## Verification & Test Results

* **TypeScript Typecheck:** `npx tsc --noEmit` exited with **0 errors**.
* **Unit Test Suite:** `npx vitest run src/` passed **100%** (23 tests across order repository, tenant isolation, analytics, and recommendation service).
* **Regression Verification:** Concurrency locking, active slot key unique indexing, and multi-tenant isolation tests passed.
