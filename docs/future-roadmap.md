# Future Architectural Scaling Roadmap

This document outlines the architectural roadmap as the system scales from a single restaurant to 10,000+ locations.

---

## 1. Phase 1: Modular Monolith (1 to 50 Restaurants)
*   **Architecture**: Keep the unified modular monolith. Avoid splitting the codebase into microservices prematurely.
*   **Caching**: Cache static menus and branding settings in Redis.
*   **Database**: Single MongoDB Atlas M10/M20 instance. Ensure compound indexes are set up on `{ restaurantId, createdAt }`.
*   **Analytics**: Keep using MongoDB aggregations, but rewrite them to compute calculations on the database server instead of in-memory.

---

## 2. Phase 2: Hybrid Monolith (50 to 500 Restaurants)
*   **Database Replication**: Deploy a MongoDB Read Replica cluster. Direct read-heavy analytics queries to the read replica to protect transactional order writes.
*   **Queue Worker Node**: Deploy background task workers using **BullMQ** and **Redis** to offload recommendation computations, event logging, and audit trail writes.
*   **CDN Caching**: Route consumer menu traffic through a CDN (e.g. CloudFront) to cache menu JSON responses, offloading application servers.

---

## 3. Phase 3: Distributed SaaS (500 to 5,000 Restaurants)
*   **Database Segregation**: Move behavioral tracking clickstream data from MongoDB to a dedicated column-oriented analytics database like **ClickHouse** or **BigQuery**.
*   **Dedicated Services**: Split off high-traffic, decoupled features (e.g., clickstream analytics logging) into independent microservices if needed to support development teams. Keep the core ordering system unified.
*   **Search Engine**: Implement **Elasticsearch** or **MongoDB Atlas Search** to power fast menu searches, auto-complete, and ingredient matching.
