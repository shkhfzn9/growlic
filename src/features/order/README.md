# Order Feature Module

This module governs the order creation pipeline, customer-side order tracking, and restaurant admin-side real-time order status management and ETAs.

## Folder Responsibilities

*   `components/`: UI presentation views for order tracker log and live customer order dashboard.
*   `services/`: Server action integrations for placing orders and status transitions.
*   `schemas/`: Data validation schemas for checking order parameters.
*   `types/`: Type definitions and interfaces for order records, payments, and checkout items.

## Import Guidelines

Always consume this module via its public barrel API:
```typescript
import { OrdersPage, OrderTracker } from '@/features/order';
```
Do not import from deep nested files inside the feature.
