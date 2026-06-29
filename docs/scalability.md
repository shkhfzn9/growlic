# High-Load Scalability Audit

This document evaluates the system's capacity to handle concurrent users, outlining database, CPU, memory, and network bottlenecks at scale.

---

## 1. Scale Benchmarking Analysis

The table below outlines the system's performance limits at different usage levels:

| Daily Active Users (DAU) | Target scale | System Status | Core Bottlenecks | Required Infrastructure Upgrades |
| :--- | :--- | :--- | :--- | :--- |
| **100** | 1 Restaurant | **Optimal** | None. Latencies remain <30ms. | Single-container Node.js + MongoDB Atlas Free Tier. |
| **1,000** | 10 Restaurants | **Stable** | In-memory analytics calculations cause minor CPU spikes. | Upgrade to MongoDB Atlas M10 tier. |
| **10,000** | 100 Restaurants | **Degraded** | Database connection pool exhaustion on serverless containers. | 1. Implement connection limits.<br>2. Add Redis caching for menus. |
| **100,000** | 1,000 Restaurants | **Unstable** | Statistical recommendation calculations block the Node.js event loop. | 1. Offload analytics to ClickHouse.<br>2. Move recommendation engine calculations to BullMQ. |
| **1,000,000** | 10,000 Restaurants | **Critical Failure** | Write conflicts on MongoDB. Session lookup overhead saturates primary DB. | 1. Deploy MongoDB Read Replicas.<br>2. Implement Redis-backed sessions. |

---

## 2. Infrastructure Scaling Strategy

```
                          [Route 53 / DNS]
                                 │
                         [CloudFront CDN] (Caches Menu Assets / Static HTML)
                                 │
                      [Application Load Balancer]
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
            [Next.js Server]            [Next.js Server]
            (Container Node)            (Container Node)
                   │                           │
         ┌─────────┴─────────┐       ┌─────────┴─────────┐
         ▼                   ▼       ▼                   ▼
    [Redis Cache]        [BullMQ] [Primary MongoDB] [Read Replica]
 (Sessions/Menu data)   (Event logs) (Write transactions) (Read queries)
```

### 1. Redis Caching
To support 100k+ concurrent users, static data must be offloaded from the database:
*   **Cached Entities**: Menu listings, branding configurations, pairing rules, and active promo settings.
*   **Invalidation Strategy**: Set a TTL of 1 hour, and invalidate the cache when an admin updates the menu or settings.
*   **Result**: Database read traffic is reduced by up to 90%, preventing connection pool exhaustion.

### 2. Event Log Buffering (BullMQ)
Rather than writing behavioral tracking events directly to MongoDB on every request, write them to a Redis-backed queue:
*   **Queue**: Buffers clickstream events (`modal_open`, `cart_create`).
*   **Background Worker**: Processes the queue, batch-writing events to MongoDB in chunks of 500.
*   **Result**: Isolates checkout transactions from clickstream logging operations, preventing write write congestion.
