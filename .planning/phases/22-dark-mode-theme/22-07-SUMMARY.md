---
phase: 22-dark-mode-theme
plan: 07
subsystem: ui
tags:
  [dark-mode, tailwind, semantic-tokens, investigations, data-table, board-view]

# Dependency graph
requires:
  - phase: 22-02
    provides: Theme toggle and status color utility
  - phase: 22-03
    provides: UI primitives with dark mode support
provides:
  - Investigation components with dark mode support
  - DataTable and BoardView with dark mode support
  - Status/severity badges with dark mode variants
affects: [cases, investigations, analytics, disclosures]

# Tech tracking
tech-stack:
  added: []
  patterns: [semantic-tokens-for-badges, dark-mode-color-pairs]

key-files:
  modified:
    - apps/frontend/src/components/views/SortableViewTab.tsx
    - apps/frontend/src/components/views/DataTable.tsx
    - apps/frontend/src/components/views/BoardCard.tsx

key-decisions:
  - "Investigation components were already themed in prior executions (no changes needed)"
  - "SortableViewTab inactive state: bg-muted text-muted-foreground for semantic dark mode support"
  - "Inline status/severity colors in DataTable get dark: variants for consistency"

patterns-established:
  - "Dark mode badge pairs: bg-color-100 text-color-800 dark:bg-color-900/30 dark:text-color-300"
  - "Semantic tab states: active=bg-card, inactive=bg-muted"

# Metrics
duration: 18min
completed: 2026-02-19
---

# Phase 22 Plan 07: Investigations and DataTable/BoardView Dark Mode Summary

**DataTable and BoardView view components themed with dark mode variants for status/severity badges, priority colors, and tab states**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-19T14:37:23Z
- **Completed:** 2026-02-19T14:55:00Z
- **Tasks:** 2 (Task 1 already complete, Task 2 executed)
- **Files modified:** 3

## Accomplishments

- Verified investigation components (10 files) were already dark-mode-compatible from prior executions
- Added dark mode variants to DataTable inline status/severity badge colors
- Added dark mode variants to BoardCard priority border/text colors
- Fixed SortableViewTab to use semantic tokens instead of hardcoded grays

## Task Commits

1. **Task 1: Theme investigation components** - Already complete (verified in HEAD)
2. **Task 2: Theme DataTable, BoardView, and related view components** - `9056aac` (feat)

**Plan metadata:** Pending

## Files Created/Modified

- `apps/frontend/src/components/views/DataTable.tsx` - Added dark mode variants to inline status/severity color maps
- `apps/frontend/src/components/views/BoardCard.tsx` - Added dark mode variants to getPriorityColor() function
- `apps/frontend/src/components/views/SortableViewTab.tsx` - Replaced bg-white/bg-gray with bg-card/bg-muted semantic tokens

## Decisions Made

- Investigation components (investigation-header.tsx, checklist-panel.tsx, etc.) were verified to already have dark mode support from prior Phase 22 executions - no changes needed
- DataTable inline color maps received dark: variants matching theme-colors.ts patterns rather than refactoring to use centralized utility (minimal change approach)
- SortableViewTab active tab uses bg-card for proper dark mode card background

## Deviations from Plan

### Task 1 Already Complete

The 10 investigation component files listed in Task 1 were already themed with semantic tokens and dark mode variants when examined in HEAD. This appears to have been done in a prior execution session. Verification confirmed:

- `bg-card`, `bg-muted/50`, `text-foreground`, `text-muted-foreground` tokens present
- Status/type badge colors include `dark:` variants
- No hardcoded `bg-white`, `bg-gray-50`, `text-gray-900` patterns remain

---

**Total deviations:** 1 (Task 1 found already complete)
**Impact on plan:** Reduced scope - only Task 2 needed execution

## Issues Encountered

- Initial commit attempt failed because lint-staged found no staged files (files were not modified from HEAD)
- Discovered investigation components were already themed in prior session(s)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All investigation components dark-mode-compatible
- DataTable and BoardView (used across Cases, Investigations, Policies, Disclosures) now fully themed
- Frozen column shadow handling not needed (no shadow-[rgba] patterns found in current DataTable)

---

_Phase: 22-dark-mode-theme_
_Completed: 2026-02-19_
