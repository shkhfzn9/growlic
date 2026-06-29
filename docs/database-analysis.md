# Database Architecture & Analytics

This document analyzes the MongoDB collections, schemas, indexes, query patterns, and performance optimizations.

---

## 1. Collection Specifications

Growlic has 10 database collections, summarized below:

| Collection | Model Name | Primary Use | Multi-Tenant Key | Primary Indexes |
| :--- | :--- | :--- | :--- | :--- |
| `admins` | `Admin` | Restaurant owner profiles, roles, branding settings. | `restaurantId` (Unique) | `{ email: 1 }`, `{ restaurantId: 1 }` |
| `sessions` | `Session` | STATEFUL JWT verification logs. | `restaurantId` | `{ restaurantId: 1, tokenHash: 1 }`, `{ userId: 1, revoked: 1 }` |
| `menuitems` | `MenuItem` | Dishes, ingredients, allergens, prices, categories. | `restaurantId` | `{ restaurantId: 1, category: 1 }` |
| `orders` | `Order` | Client transactions and checkout subdocuments. | `restaurantId` | `{ restaurantId: 1, createdAt: -1 }` |
| `customers` | `Customer` | Customer spend aggregates, orders count, phone lookup. | `restaurantId` | `{ restaurantId: 1, phone: 1 }` |
| `pairingrules` | `PairingRule` | Manual cross-sell category mappings. | `restaurantId` | `{ restaurantId: 1 }` |
| `discounttiers` | `DiscountTier` | Spend threshold discount configurations. | `restaurantId` | `{ restaurantId: 1 }` |
| `comborules` | `ComboRule` | Promotional rules (e.g. BOGO freebies). | `restaurantId` | `{ restaurantId: 1 }` |
| `events` | `Event` | Clickstream analytics views, cart opens, clicks. | `restaurantId` | `{ restaurantId: 1, createdAt: -1 }` |
| `auditlogs` | `AuditLog` | Compliance logs of admin state transitions. | `restaurantId` | `{ restaurantId: 1, createdAt: -1 }` |

---

## 2. Indexes and Missing Indexes Analysis

### Current Indexes
*   **Tenant Scoping**: Most collections include compound indexes starting with `restaurantId` (e.g., `{ restaurantId: 1, createdAt: -1 }`). This ensures that queries scoped to a single restaurant perform index scans rather than collection scans.

### Missing Indexes & Slow Query Hazards
1.  **Event Aggregation scan**:
    *   *Hazard*: The analytics service queries `Event` items by `type` and `itemId` in background dashboards:
        ```typescript
        Event.find({ restaurantId, type: 'modal_open', itemId: "XYZ" })
        ```
    *   *Index*: Currently, the index is `{ restaurantId: 1, createdAt: -1 }`. MongoDB must perform an index scan for all restaurant events, then filter by `type` and `itemId` in-memory.
    *   *Fix*: Add a compound index on `Event`:
        ```javascript
        EventSchema.index({ restaurantId: 1, type: 1, itemId: 1, createdAt: -1 });
        ```
2.  **Order Status Filtering**:
    *   *Hazard*: The admin panel filters orders by status (e.g., received, accepted, completed):
        ```typescript
        Order.find({ restaurantId, status: "received" }).sort({ createdAt: -1 })
        ```
    *   *Index*: The current index is `{ restaurantId: 1, createdAt: -1 }`. Filtering by status requires scanning all order keys for that restaurant.
    *   *Fix*: Add a compound index on `Order`:
        ```javascript
        OrderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
        ```

---

## 3. Query Patterns & N+1 Analysis

### Denormalization Success
The database design avoids the N+1 query problem by denormalizing menu items inside the `items` array of the `Order` collection:
```json
{
  "_id": "603f7e1b9b1d",
  "restaurantId": "tokyo-momos",
  "items": [
    {
      "menuItemId": "507f1f77bcf86cd799439011",
      "name": "Peri Peri Momos",
      "price": 180,
      "quantity": 2
    }
  ],
  "total": 360
}
```
Because the name, price, and quantities are embedded as subdocuments, rendering the Admin Orders list or Customer Tracker does not require fetching items from the `menuitems` collection. This reduces database lookups.

---

## 4. Heavy Aggregation Bottlenecks

### 1. In-Memory Dashboard Calculation
*   **Problem**: In `src/features/analytics/repository.ts`, the database returns raw orders and raw clickstream events to Node.js, which iterates and aggregates them in JavaScript.
*   **Risk**: Under load, this causes high memory usage and blocks the main thread.
*   **Fix**: Offload aggregates to MongoDB using pipeline structures (`$group`, `$facet`):
    ```typescript
    Order.aggregate([
      { $match: { restaurantId, createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          ordersCount: { $sum: 1 },
          averageOrderValue: { $avg: "$total" }
        }
      }
    ])
    ```
