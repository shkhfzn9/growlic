# Growlic Technical Audit & Optimization Summary

This document consolidates the key metrics, performance findings, and prioritized execution checklist for the Growlic platform.

---

## 1. Core Platform Technical KPIs

*   **Total REST API Endpoints**: 6
*   **Total Server Actions**: 30
*   **Total Database Collections**: 10
*   **Total Database Queries (Single Customer Order)**: 3 queries
    1.  `Customer.findOne` (profile verification)
    2.  `Customer.findOneAndUpdate` (spend accumulation)
    3.  `Order.create` (order document write)
*   **Total Database Queries (Admin Order Lifecycle)**: 4 queries
    1.  `Session.findOne` (auth session verification)
    2.  `Order.findOne` (read existing status)
    3.  `Order.findOneAndUpdate` (write state transition)
    4.  `AuditLog.create` (save compliance tracking)
*   **Total HTTP Requests (Single Customer Journey)**: 6 network requests
*   **Total HTTP Requests (Single Admin Order Workflow)**: 5 network requests
*   **Slowest Operations**:
    *   `recommendationService.ts`: Affinity co-occurrence association mining (loads unbounded orders history).
    *   `getDashboardMetrics`: Analytics compilation (performs in-memory scans of raw events in JavaScript).
*   **Largest Payloads**: Raw events logging datasets loaded over-the-wire for dashboard renders.
*   **Missing Indexes**:
    *   `Order`: `{ restaurantId: 1, status: 1, createdAt: -1 }` (compound index for status filtering).
    *   `Event`: `{ restaurantId: 1, type: 1, itemId: 1, createdAt: -1 }` (compound index for analytics).
*   **Missing Cache Opportunities**: Redis caching of static menus, restaurant configurations, and active upsell rules.
*   **Estimated Performance Improvement**: Up to **85%** reduction in database read saturation and frontend page load latencies.

---

## 2. Priority Checklist of Recommended Tasks

### 🚨 Tier 1: Critical (Must fix before production)
- [x] **Limit Affinity Mining Scope**: Modify `recommendationService.ts` to fetch only the last 1,000 completed orders instead of the entire history using a `limit(1000)` query.
- [x] **Database Analytics Aggregations**: Rewrite `fetchRawDashboardData` and in-memory calculations in `calculations.ts` to execute computations on MongoDB using aggregation pipelines.
- [ ] **Secure Seeding Endpoints**: Restrict or disable `/api/seed` in production environments.

### 🔥 Tier 2: High Priority (Implement in next sprint)
- [x] **Order Status Index**: Add a compound index on `{ restaurantId: 1, status: 1, createdAt: -1 }` to the `Order` collection.
- [x] **Analytics Events Index**: Add a compound index on `{ restaurantId: 1, type: 1, itemId: 1, createdAt: -1 }` to the `Event` collection.
- [x] **API Merging (Batch Fetch)**: Combine `getMenuItems`, `getActiveBanners`, and `getUpsellConfig` into a single batch network fetch `getRestaurantMenuContext` to reduce client roundtrips.
- [x] **Admin Login Rate Limiting**: Add rate-limiting middleware to `/api/auth` login paths.

### ✅ Tier 3: Nice to Have
- [ ] **Redis Menu Cache**: Integrate Redis to cache static menu structures and branding settings.
- [ ] **Async Event Logging**: Implement BullMQ with Redis to process clickstream event logs asynchronously.
- [ ] **Mongoose Projections**: Update menu list queries to select only visible fields, reducing payload size.
