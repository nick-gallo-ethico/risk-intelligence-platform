---
phase: 22-dark-mode-theme
plan: 03
subsystem: ui
tags: [dark-mode, tailwind, shadcn-ui, theming, css-variables]

# Dependency graph
requires:
  - phase: 22-01
    provides: Theme infrastructure foundation with CSS variables and ThemeProvider
  - phase: 22-02
    provides: Centralized theme-colors.ts utility with getStatusColor/getSeverityColor
provides:
  - Dark-mode-compatible shadcn/ui primitives
  - Status badges using centralized theme colors
  - Severity badges using centralized theme colors
  - Dialog/dropdown/progress with semantic Tailwind classes
affects:
  - 22-04 (data table dark mode audit)
  - 22-05 (navigation/layout dark mode)
  - All future UI components using shadcn primitives

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Use bg-background instead of bg-white
    - Use bg-popover/text-popover-foreground for dropdown menus
    - Use bg-accent/text-accent-foreground for hover states
    - Use bg-secondary for progress track
    - Use bg-border for separators
    - Use text-muted-foreground for description text
    - Use ring-offset-background and ring-ring for focus states

key-files:
  created: []
  modified:
    - apps/frontend/src/components/ui/status-badge.tsx
    - apps/frontend/src/components/ui/severity-badge.tsx
    - apps/frontend/src/components/ui/progress.tsx
    - apps/frontend/src/components/ui/dialog.tsx
    - apps/frontend/src/components/ui/dropdown-menu.tsx

key-decisions:
  - "Use centralized theme-colors utility for status/severity badges for consistency"
  - "bg-secondary for progress track - auto-adapts via CSS variables"
  - "bg-popover semantic token for dropdown menus (not bg-white)"
  - "bg-accent for focus/hover states in menus (not bg-gray-100)"

patterns-established:
  - "Semantic token replacement: bg-white -> bg-background, text-gray-* -> text-muted-foreground"
  - "Re-export color mappings for backward compatibility when migrating to centralized utility"
  - "Use accent/accent-foreground for interactive hover states"

# Metrics
duration: 12min
completed: 2026-02-19
---

# Phase 22 Plan 03: UI Primitives Dark Mode Summary

**Migrated status-badge and severity-badge to centralized theme-colors utility and fixed hardcoded colors in dialog, dropdown-menu, and progress components**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-19
- **Completed:** 2026-02-19
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Status-badge and severity-badge now use centralized theme-colors.ts, getting automatic dark mode variants
- Dialog component uses semantic tokens (bg-background, ring-offset-background, text-muted-foreground)
- Dropdown menu uses bg-popover/text-popover-foreground and bg-accent for hover states
- Progress bar track uses bg-secondary instead of hardcoded bg-gray-200
- All targeted UI primitives verified to have no hardcoded colors without dark variants

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate status-badge and severity-badge to theme-colors utility** - `b820c80` (feat)
2. **Task 2: Fix remaining UI primitive hardcoded colors** - `5ea5aa1` (feat)

## Files Created/Modified

- `apps/frontend/src/components/ui/status-badge.tsx` - Now uses getStatusColor() from theme-colors
- `apps/frontend/src/components/ui/severity-badge.tsx` - Now uses getSeverityColor() from theme-colors
- `apps/frontend/src/components/ui/progress.tsx` - Track uses bg-secondary (was bg-gray-200)
- `apps/frontend/src/components/ui/dialog.tsx` - Content uses bg-background, close button uses semantic tokens
- `apps/frontend/src/components/ui/dropdown-menu.tsx` - Uses bg-popover, text-popover-foreground, bg-accent, bg-border

## Decisions Made

- Re-exported statusColors and severityColors for backward compatibility in case external code imports STATUS_COLORS/SEVERITY_COLORS directly
- Used bg-secondary for progress track since it maps to a CSS variable that auto-adapts to dark mode
- Used bg-popover (not bg-card or bg-background) for dropdown menus following shadcn/ui convention
- Used bg-accent/text-accent-foreground for hover/focus states in dropdown items

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all changes applied cleanly and TypeScript compilation passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 7 targeted UI primitive files are now dark-mode-compatible
- Sheet, badge, skeleton, and alert were already dark-mode-compatible (verified)
- Ready for Plan 22-04 (data tables) and Plan 22-05 (navigation/layout)

---

_Phase: 22-dark-mode-theme_
_Completed: 2026-02-19_
