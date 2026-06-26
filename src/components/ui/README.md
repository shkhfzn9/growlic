# Reusable Design System UI Components

This folder contains global atomic UI components that follow Growlic's styling, colors, and accessibility tokens.

## Reusable Components

*   `AdminButton`: Standard button component supporting loading states, icons, and variants.
*   `DataTable`: Standardized data grid display with sorting and filters.
*   `EmptyState`: A visual fallback block rendering icons, titles, and CTA actions for empty screens.
*   `PageHeader`: Component providing title and action wrappers at the top of admin pages.
*   `StatCard`: Card layout for analytics and overview counts.
*   `StatusBadge`: Unified color badge representing status states (success, warning, info, error).

## Extension Rules

To keep the UI consistent and avoid code duplication:
- All buttons must use `AdminButton`.
- Do not create custom tables; use `DataTable` or reuse table styles defined here.
- Centralize any new global component under `src/components/ui/` with a clean barrel export in `index.ts`.
