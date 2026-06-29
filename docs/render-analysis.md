# Rendering & Hydration Performance Audit

This document audits the rendering architecture, detailing the composition of Server and Client components, hydration cycles, and opportunities to eliminate unnecessary renders.

---

## 1. Next.js App Router Architecture

Growlic uses a hybrid rendering model:

```
               [App Router Root Layout] (Server Component)
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
    [Customer Menu Router]         [Admin Router Layout]
     (Server Component)             (Server Component)
             │                           │
     ┌───────┴───────┐           ┌───────┴───────┐
     ▼               ▼           ▼               ▼
[Static Shell]  [MenuList]   [Sidebar]    [DashboardPage]
(Server HTML)  (Client Side) (Server HTML) (Client Side)
                     │                           │
                     ▼                           ▼
                [Redux Cart]                [Memoized Grid]
                (Interactive)               (Charts/Logs)
```

*   **Server Components (Default)**: Renders static layout structures (e.g., sidebars, navigation wraps, tables grids) on the server. They connect to database instances directly, returning zero JavaScript to client browsers.
*   **Client Components (`'use client'`)**: Interactive sections (e.g. cart drawer, checkout modal, orders grid) require client-side JavaScript. They are hydrated dynamically in the customer's browser.

---

## 2. Component Composition and Hydration Analysis

### Customer Menu Page
*   **Structure**: `src/app/menu/[slug]/page.tsx` is a Server Component that loads the restaurant details. It wraps and renders the interactive client component `<MenuList />` from `@/features/menu`.
*   **Hydration**: When a customer scans a table QR code:
    1.  The server serves the static HTML layout.
    2.  The browser renders this layout immediately.
    3.  The browser downloads the client-side JavaScript bundle for `<MenuList />`.
    4.  React hydrates `<MenuList />`, enabling stateful filters, category tabs, and cart additions.

### Admin Dashboard / Orders Page
*   **Structure**: Admin pages use dynamic code splitting to optimize initial load times:
    ```typescript
    const OrdersPage = dynamic(() => import('@/features/order/components/OrdersPage'), {
      ssr: false,
      loading: () => <OrdersLoadingSkeleton />,
    });
    ```
*   **Hydration**: The initial admin page returns a light skeleton layout. The heavy analytical components, charts, and paginated tables are loaded asynchronously and hydrated on-demand, reducing the initial bundle size.

---

## 3. Expensive Components & Unnecessary Rerenders

1.  **Dashboard Orders list**:
    *   *Issue*: When order status changes, or when the 10-second polling interval triggers a reload, the entire orders list re-renders.
    *   *Fix*: Wrap individual order list cards in `React.memo` so they only re-render if their specific order status changes.
2.  **Redux Cart Updates**:
    *   *Issue*: Toggling quantities or adding items causes the entire `<MenuList />` to evaluate rule checks.
    *   *Fix*: Isolate cart logic inside a dedicated `<CartDrawer />` component. This prevents updates to individual food item cards when the cart state changes.
3.  **Search Filtering Input**:
    *   *Issue*: Typing inside the search bar on the Super-Admin panel or Analytics page triggers list sorting on every keystroke.
    *   *Fix*: The codebase uses `useMemo` to cache sorted datasets, preventing sorting operations from running on keystrokes:
        ```typescript
        const filteredRestaurants = useMemo(() => {
          return restaurants.filter(r => r.name.toLowerCase().includes(search));
        }, [restaurants, search]);
        ```
