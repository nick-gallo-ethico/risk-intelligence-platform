---
phase: 22-dark-mode-theme
plan: 15
subsystem: ui
tags: [react, tanstack-table, css, data-table, column-width, responsive]

# Dependency graph
requires:
  - phase: 22-07
    provides: DataTable frozen column shadows and dark mode styling
provides:
  - Flexible column width behavior for DataTable component
  - Column headers determine minimum width (no rigid constraints)
  - Columns can expand and shrink naturally with content and viewport
affects: [cases-page, disclosures-page, saved-views, any-datatable-consumer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use whitespace-nowrap on table headers for natural minimum width"
    - "Remove explicit width from th/td elements for flexible column sizing"
    - "Only apply minWidth to fixed-width columns (select/actions)"

key-files:
  created: []
  modified:
    - apps/frontend/src/components/views/DataTable.tsx

key-decisions:
  - "Remove width style from th elements - let content determine width"
  - "Remove width style from td elements - inherit natural column sizing"
  - "Add whitespace-nowrap to headers so header text sets minimum width"
  - "Only select and actions columns retain minWidth (fixed controls)"

patterns-established:
  - "Flexible table layout: columns expand/shrink based on content, not config widths"

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 22 Plan 15: DataTable Column Width Flexibility Summary

**Removed rigid column width constraints from DataTable, allowing columns to expand and shrink naturally based on content and viewport size**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T15:56:00Z
- **Completed:** 2026-02-19T16:00:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Removed explicit `width` styles from `<th>` elements that forced rigid column widths
- Removed explicit `width` styles from `<td>` elements that prevented flexible sizing
- Added `whitespace-nowrap` to header cells so header text determines minimum column width
- Preserved fixed widths only for select checkbox and actions columns (UI controls)
- Columns now adapt fluidly to viewport size and content

## Task Commits

Each task was committed atomically:

1. **Task 1: Analyze and fix DataTable column width constraints** - `c8ad854` (fix)

## Files Created/Modified

- `apps/frontend/src/components/views/DataTable.tsx` - Removed rigid width constraints, added flexible column sizing

## Decisions Made

- **Remove width from data columns:** Data columns (Summary, Case #, Status, etc.) no longer have fixed widths. The browser's table layout algorithm determines optimal widths based on content.
- **Keep minWidth for control columns:** Select checkbox (40px) and actions menu (50px) columns retain their minWidth to ensure consistent UI control sizing.
- **Use whitespace-nowrap for headers:** Header text with sort chevrons determines the minimum shrink width, preventing headers from becoming unreadable.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - the root cause was straightforward (explicit `width` styles forcing rigid sizing).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DataTable now provides flexible column widths for all saved views pages
- Future column configuration can still suggest widths via config, but they won't be enforced as rigid constraints
- Plan 22-14 (remaining dark mode plan) can proceed independently

---

_Phase: 22-dark-mode-theme_
_Completed: 2026-02-19_
