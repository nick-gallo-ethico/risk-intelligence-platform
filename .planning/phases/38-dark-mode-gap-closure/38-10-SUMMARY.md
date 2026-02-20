---
phase: 38-dark-mode-gap-closure
plan: 10
subsystem: ui
tags: [dark-mode, tailwind, semantic-tokens, theming, datatable]

# Dependency graph
requires:
  - phase: 22-dark-mode-theme
    provides: Theme infrastructure, semantic token system
  - phase: 38-01 through 38-08
    provides: Prior dark mode gap closure migrations
provides:
  - DataTable fallback badges with dark mode (THEME-06 satisfied)
  - Settings/users/conflicts/implementation/help/auth/ui components with semantic tokens
  - Complete dark mode coverage for remaining component domains
affects: [any-future-ui-work, component-library-updates]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Semantic gray fallback: bg-muted text-muted-foreground"
    - "Colored badge dark variants: dark:bg-color-900/30 dark:text-color-300"

key-files:
  created: []
  modified:
    - apps/frontend/src/components/settings/user-list.tsx
    - apps/frontend/src/components/help/ticket-list.tsx
    - apps/frontend/src/components/auth/mfa-setup.tsx
    - apps/frontend/src/components/ui/association-card.tsx

key-decisions:
  - "THEME-06 verified: DataTable fallback badges already had dark variants"
  - "Task 2 files (conflicts/implementation) already themed from prior executions"
  - "Use bg-muted text-muted-foreground for gray/neutral semantic badges"

patterns-established:
  - "Gray fallback badge: bg-muted text-muted-foreground (semantic)"
  - "QR code container: bg-background for visibility in both modes"

# Metrics
duration: 8min
completed: 2026-02-20
---

# Phase 38 Plan 10: Remaining Miscellaneous Components Summary

**Migrated 4 files to dark mode, verified 12 files already themed - THEME-06 DataTable fallback requirement satisfied**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-20T00:42:53Z
- **Completed:** 2026-02-20T00:51:00Z
- **Tasks:** 3 (Task 2 was no-op - files already themed)
- **Files modified:** 4

## Accomplishments

- Verified DataTable.tsx already has dark: variants on fallback badges (THEME-06 satisfied)
- Migrated ticket-list.tsx STATUS_COLORS and PRIORITY_COLORS with dark variants
- Fixed mfa-setup.tsx QR code container bg-white -> bg-background
- Migrated association-card.tsx hardcoded gray colors to semantic tokens
- Verified 12 files in conflicts/implementation/operator/ethics/analytics already themed

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix DataTable fallbacks and migrate users/settings** - `96fce7d` (feat)
   - DataTable.tsx already had dark variants (verified)
   - users-table.tsx already had dark variants (verified)
   - role-permissions-table.tsx already had dark variants (verified)
   - user-list.tsx: Fixed ROLE_COLORS fallback to use semantic bg-muted text-muted-foreground

2. **Task 2: Migrate conflicts and implementation components** - No commit (already themed)
   - ConflictAlert.tsx: Already has dark variants
   - EntityTimeline.tsx: Already has dark variants
   - BlockerCard.tsx: Already has dark variants
   - ChecklistPanel.tsx: Already has dark variants
   - GoLiveChecklist.tsx: Already has dark variants
   - ProjectCard.tsx: Already has dark variants

3. **Task 3: Migrate remaining miscellaneous components** - `a4a9b33` (feat)
   - ticket-list.tsx: Added dark variants to STATUS_COLORS and PRIORITY_COLORS
   - mfa-setup.tsx: Changed bg-white to bg-background
   - association-card.tsx: Changed 5 gray colors to semantic tokens
   - riu-type-selector.tsx: Already has dark variants (verified)
   - status-badge.tsx: Already has dark variants (verified)
   - dashboard-template-picker.tsx: Already has dark variants (verified)

## Files Created/Modified

- `apps/frontend/src/components/settings/user-list.tsx` - Fixed role badge fallback to use semantic tokens
- `apps/frontend/src/components/help/ticket-list.tsx` - Added dark variants to status/priority badges
- `apps/frontend/src/components/auth/mfa-setup.tsx` - Fixed QR code container background
- `apps/frontend/src/components/ui/association-card.tsx` - Migrated hardcoded grays to semantic tokens

## Decisions Made

- **THEME-06 verified satisfied**: DataTable.tsx lines 216 and 240 already include `dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700`
- **Gray badge pattern**: Use `bg-muted text-muted-foreground` for neutral/gray semantic badges (CLOSED, LOW priority)
- **QR code containers**: Use `bg-background` not `bg-white` for proper dark mode visibility

## Deviations from Plan

None - plan executed as specified. 12 of 16 files were already themed from prior Phase 22/38 work.

## Issues Encountered

None - most files were already properly themed from earlier dark mode work.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 38 Dark Mode Gap Closure is now complete (10/10 plans)
- All remaining component domains have semantic tokens or explicit dark: variants
- DataTable THEME-06 requirement verified satisfied
- Ready for Phase 39 (Frontend Test Repair)

---

_Phase: 38-dark-mode-gap-closure_
_Completed: 2026-02-20_
