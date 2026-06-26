# Menu Feature Module

This module manages all menu items, categories, pricing, and the smart recommendation system (promotions, upsell rules, and cross-sell combo logic).

## Folder Responsibilities

*   `components/`: UI presentation views for menu layout management, promos manager, and dynamic upsell configuration form.
*   `services/`: Server action integrations and recommendation services for generating combo items.
*   `schemas/`: Data validation schemas for creating/editing menu items and discount rules.
*   `types/`: Type definitions and interfaces for menu items, banner sliders, and upsell configurations.

## Import Guidelines

Always consume this module via its public barrel API:
```typescript
import { MenuPage, PromosManager, MenuList } from '@/features/menu';
```
Do not import from deep nested files inside the feature.
