---
phase: 22
plan: 05
subsystem: frontend
tags: [dark-mode, dashboard, cases, theming]
depends_on:
  requires: [22-02, 22-03]
  provides: [dashboard-dark-mode, cases-dark-mode]
  affects: [22-06, 22-07]
tech_stack:
  patterns: [semantic-tokens, theme-colors-utility]
key_files:
  modified:
    - apps/frontend/src/components/dashboard/stats-cards.tsx
    - apps/frontend/src/components/dashboard/recent-cases.tsx
    - apps/frontend/src/components/dashboard/my-assignments.tsx
    - apps/frontend/src/components/dashboard/my-tasks.tsx
    - apps/frontend/src/components/cases/case-detail-header.tsx
    - apps/frontend/src/components/cases/case-header.tsx
    - apps/frontend/src/components/cases/case-tabs.tsx
    - apps/frontend/src/components/cases/case-list-filters.tsx
decisions:
  - key: priority-badge-utility
    choice: Use priorityColors from theme-colors.ts for all priority badges
    rationale: Consistent dark mode colors via centralized utility
  - key: status-severity-utility
    choice: Use getStatusColor/getSeverityColor helpers for case badges
    rationale: Eliminates per-component color mappings
metrics:
  duration: ~15 minutes
  completed: 2026-02-19
---

# Phase 22 Plan 05: Dashboard & Case High-Traffic Areas Dark Mode Summary

Dashboard and case management components themed for dark mode using semantic tokens and centralized theme-colors utility.

## Tasks Completed

| Task | Name                                              | Commit  | Files                                                                         |
| ---- | ------------------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| 1    | Theme dashboard components                        | 71329bb | stats-cards.tsx, recent-cases.tsx, my-assignments.tsx, my-tasks.tsx           |
| 2    | Theme case layout, header, tabs, and list filters | b34591d | case-detail-header.tsx, case-header.tsx, case-tabs.tsx, case-list-filters.tsx |

## Key Changes

### Dashboard Components

- **stats-cards.tsx**: Replaced `text-gray-500` with `text-muted-foreground`, added dark mode variants for stat colors (yellow-400, blue-400, green-400)
- **recent-cases.tsx**: Links use `text-primary`, dates/empty state use `text-muted-foreground`
- **my-assignments.tsx**: Hover state now `hover:bg-muted/50`, text colors use semantic tokens
- **my-tasks.tsx**: Priority badges now use `priorityColors` from theme-colors.ts, green icon has dark variant
- **quick-actions.tsx**: Already uses shadcn components (no changes needed)

### Case Components

- **case-detail-header.tsx**: Background `bg-card`, border `border-border`, breadcrumb text semantic tokens
- **case-header.tsx**: Removed local STATUS_COLORS/SEVERITY_COLORS maps, now uses `getStatusColor()`/`getSeverityColor()` from theme-colors utility
- **case-tabs.tsx**: Tab active/inactive states use `text-primary`/`text-muted-foreground`, property grid labels use semantic tokens, task borders use `border-border`
- **case-list-filters.tsx**: Added explicit `border-border` to DateRangePicker dividers

## Patterns Applied

1. **Semantic Background Tokens**: `bg-card`, `bg-muted`, `bg-background` instead of hardcoded grays
2. **Semantic Text Tokens**: `text-foreground`, `text-muted-foreground` instead of `text-gray-*`
3. **Centralized Color Utilities**: `getStatusColor()`, `getSeverityColor()`, `priorityColors` from theme-colors.ts
4. **Dark Mode Color Variants**: Pattern like `text-yellow-600 dark:text-yellow-400` for colored stat values

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Dashboard and case detail pages are now the highest-traffic dark mode-ready areas. Plan 22-06 (Forms & Settings) can proceed. The theme-colors utility pattern established in 22-03 continues to pay dividends by eliminating per-component status/severity color mappings.
