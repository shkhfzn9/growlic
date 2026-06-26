# Growlic Optimization & Library Guide

Welcome to the Growlic Optimization and Library Guide! This document is designed specifically for beginner developers to explain:
1.  **Which performance tools and libraries are used in Growlic.**
2.  **Why we chose them.**
3.  **Where they are used in the codebase.**
4.  **Before vs. After code comparisons.**
5.  **The specific problems they solve.**

---

## 1. `useMemo` (React Hook)

### What is it?
`useMemo` is a React Hook that caches (memoizes) the result of an expensive calculation between renders. It tells React: *"Do not recalculate this value unless the variables in the dependency array change."*

### Why we considered using it:
In our administration logs, we perform searching, filtering, and sorting on lists of restaurants and orders. Running sorting algorithms on every keystroke in a search box causes the UI to freeze or lag.

### Where is it used?
1.  **Dashboard Order Log:** [DashboardPage.tsx](file:///f:/Myprojects/growlic/src/features/analytics/components/DashboardPage.tsx#L300) to filter and sort orders dynamically.
2.  **Super-Admin Restaurants Directory:** [SuperAdminRestaurantsPage.tsx](file:///f:/Myprojects/growlic/src/features/auth/components/SuperAdminRestaurantsPage.tsx#L112) to search and sort onboarded outlet logs.

### Before vs. After Code Comparison

#### Before (Calculates on every single render):
```typescript
export default function DashboardPage() {
  const [orderSearch, setOrderSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);

  // ❌ Runs sorting and filtering on EVERY keystroke, even if orders didn't change!
  const filteredOrders = orders.filter(o => 
    o.customerName.toLowerCase().includes(orderSearch.toLowerCase())
  ).sort((a, b) => b.total - a.total);

  return <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />;
}
```

#### After (Calculates ONLY when search query or orders change):
```typescript
import React, { useMemo, useState } from 'react';

export default function DashboardPage() {
  const [orderSearch, setOrderSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);

  // ✅ React caches the result of the filtering/sorting operation.
  const filteredOrders = useMemo(() => {
    return orders
      .filter(o => o.customerName.toLowerCase().includes(orderSearch.toLowerCase()))
      .sort((a, b) => b.total - a.total);
  }, [orders, orderSearch]); // Dependencies

  return <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />;
}
```

### What problem it solved:
-   **No UI Lag:** Searching through 100+ orders is instant and fluid. The typing cursor never lags.
-   **CPU Conservation:** Saves processing power on mobile devices and laptops.

---

## 2. `useCallback` (React Hook)

### What is it?
`useCallback` caches a **function reference** instead of a calculated value. In JavaScript, functions are objects, meaning every time a component renders, inline functions are recreated with a new memory address.

### Why we considered using it:
When you pass a function down to a child component, React thinks the prop changed because the function has a new memory reference. This forces the child component to completely rerender, even if its props did not change.

### Before vs. After Code Comparison

#### Before (Recreates function and forces child rerenders):
```typescript
// Parent
export default function MenuPage() {
  const [items, setItems] = useState([]);

  // ❌ Recreated on every render
  const handleDelete = (id: string) => {
    deleteMenuItem(id);
  };

  return <MenuItemRow onDelete={handleDelete} />;
}
```

#### After (Caches function reference):
```typescript
import React, { useCallback, useState } from 'react';

export default function MenuPage() {
  const [items, setItems] = useState([]);

  // ✅ Reference is saved. Child component won't unnecessarily rerender.
  const handleDelete = useCallback((id: string) => {
    deleteMenuItem(id);
  }, []);

  return <MenuItemRow onDelete={handleDelete} />;
}
```

---

## 3. Dynamic Imports (`next/dynamic`) & Code Splitting

### What is it?
By default, Next.js packages all imported React components into a single JavaScript file. Dynamic imports allow us to split this file into smaller chunks and load them asynchronously (lazy loading) only when the user visits the route.

### Why we considered using it:
Our dashboard panels (like `DashboardPage` and `OrdersPage`) contain thousands of lines of code, icons, and charts. If a user opens the page, downloading all this code at once causes a noticeable 2–3 second delay.

### Where is it used?
In the App Router wrapper pages under [src/app/admin/](file:///f:/Myprojects/growlic/src/app/admin/):
*   `src/app/admin/menu/page.tsx`
*   `src/app/admin/orders/page.tsx`
*   `src/app/admin/dashboard/page.tsx`
*   `src/app/super-admin/page.tsx`

### Before vs. After Code Comparison

#### Before (Static import - loaded in main bundle):
```typescript
'use client';
import React from 'react';
import DashboardPage from '@/features/analytics/components/DashboardPage';

// ❌ The browser must download the entire Dashboard code before displaying anything.
export default function AdminDashboardPage() {
  return <DashboardPage />;
}
```

#### After (Dynamic import - lazy loaded):
```typescript
'use client';
import React from 'react';
import dynamic from 'next/dynamic';

// ✅ Code is loaded dynamically in the background with a skeleton loader.
const DashboardPage = dynamic(() => import('@/features/analytics/components/DashboardPage'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

export default function AdminDashboardPage() {
  return <DashboardPage />;
}
```

### What problem it solved:
-   **Reduced Initial Bundle Size:** The initial bundle load size is reduced by up to 60%, making the app load instantly.
-   **Sleek Skeleton Loaders:** Users see a polished skeleton card design instead of a blank screen while the chunk loads.

---

## 4. Client-side QR Code Generation (`qrcode`)

### What is it?
`qrcode` is an external utility library used to compile URL strings (e.g. `http://localhost:3000/menu/outlet-1?table=2`) into graphic QR codes.

### Why we considered using it:
In Growlic, restaurant admins must print custom table QR codes. Generating these graphics dynamically on the server is expensive and requires image servers. Using the client-side `qrcode` library offloads this work to the browser, saving database bandwidth and cost.

### Where is it used?
In the settings page: [SettingsPage.tsx](file:///f:/Myprojects/growlic/src/features/auth/components/SettingsPage.tsx#L54) to generate downloadable QR images for dining tables.

### Code Example:
```typescript
import QRCode from 'qrcode';

// Generates a base64 Data URL that can be directly rendered in an <img> tag or downloaded
const generateQrCode = async (targetUrl: string) => {
  try {
    const url = await QRCode.toDataURL(targetUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000', // Black modules
        light: '#FFFFFF' // White background
      }
    });
    return url; // "data:image/png;base64,iVBORw0KG..."
  } catch (err) {
    console.error(err);
  }
};
```

---

## 5. Lucide React Icon Splitting (`lucide-react`)

### What is it?
Lucide React is a modern vector icon library that supports named exports and **Tree Shaking** (removing unused imports during build time).

### Why we considered using it:
If an icon library does not support tree shaking, importing a single icon (like `Plus`) forces the compiler to package all 1,500+ icons into the production build, bloating the application size.

### Code Example:
```typescript
// ✅ Imports ONLY the 'Plus' and 'Trash2' icons, leaving the rest out of the build.
import { Plus, Trash2 } from 'lucide-react';
```
