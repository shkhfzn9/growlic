# Platform Optimization Roadmap

This document outlines the optimization roadmap across the database, APIs, Server Actions, and queuing systems.

---

## 1. Database Query Optimizations

### 1. Compound Index Allocations
*   **Order Status Indexing**: Add a compound index to support filtering and sorting by status:
    ```javascript
    OrderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
    ```
*   **Analytics Event Indexing**: Add a compound index to accelerate clickstream and modal views counts:
    ```javascript
    EventSchema.index({ restaurantId: 1, type: 1, itemId: 1, createdAt: -1 });
    ```

### 2. Projections implementation
*   **Avoid Selective Over-Fetching**: Currently, queries like `MenuItem.find({ restaurantId })` return all fields (description, nutritional macros, ingredients, image arrays).
*   **Optimization**: Implement Mongoose query projections to fetch only required fields in lists (e.g., hiding detailed nutritional macros until the item detail modal is explicitly clicked):
    ```typescript
    MenuItem.find({ restaurantId, available: true }).select('name price category image available');
    ```

---

## 2. API & Fetch Optimizations

### 1. Request Batching
*   **Problem**: In `MenuList.tsx`, three independent Server Actions are dispatched sequentially or as separate network roundtrips: `getMenuItems`, `getActiveBanners`, and `getUpsellConfig`.
*   **Optimization**: Merge these into a single consolidated request: `getRestaurantMenuContext(restaurantId)` which queries and returns menu items, active banners, and upsell configurations in a single roundtrip.
*   **Impact**: Reduces page-load network roundtrips from 3 to 1, lowering latency on slow mobile connections.

### 2. Compression & Payload Reduction
*   **Response Compression**: Enable Gzip/Brotli compression at the middleware/gateway level to reduce JSON transfer sizes.
*   **JSON Serialization**: Avoid repeating keys or serializing heavy nested objects (e.g. converting Mongoose documents to strings and parsing them back).

---

## 3. Server Action & Queue Optimizations

### 1. Asynchronous Writes via Queues
*   **Audit Logging & Events**: Offload `logAction` and `logEvent` writes from the main server threads to a background task queue powered by **BullMQ** and **Redis**:
    ```typescript
    // In server action:
    await eventQueue.add('logEvent', { restaurantId, type, itemId });
    ```
*   **Benefit**: Checkout and status change operations return immediately without waiting for disk writes to complete.

### 2. Optimistic UI Updates
*   **Admin status transitions**: When an admin marks an order as "Preparing" or "Ready", the dashboard should update the card's position in the UI immediately before the database write resolves.
*   **Revalidation**: If the database write fails, the UI rolls back the state transition and displays an error message.
