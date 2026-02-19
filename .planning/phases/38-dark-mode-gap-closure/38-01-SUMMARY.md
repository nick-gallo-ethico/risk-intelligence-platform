---
phase: 38-dark-mode-gap-closure
plan: 01
subsystem: ui
tags: [dark-mode, tailwind, semantic-tokens, investigations]

# Dependency graph
requires:
  - phase: 22-dark-mode-theme
    provides: Theme infrastructure, semantic token CSS variables
provides:
  - Investigation components with semantic token dark mode support
  - Consistent text/background contrast in both light and dark modes
affects: [38-02-PLAN, 38-03-PLAN, frontend-dark-mode]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dark mode badge pairs: bg-color-100 text-color-800 dark:bg-color-900/30 dark:text-color-300"
    - "Semantic tokens: text-muted-foreground, text-foreground, bg-muted, bg-card"
    - "Neutral states use bg-muted text-muted-foreground (no light/dark variants needed)"

key-files:
  modified:
    - apps/frontend/src/components/investigations/investigation-properties-panel.tsx
    - apps/frontend/src/components/investigations/investigation-files-tab.tsx
    - apps/frontend/src/components/investigations/investigation-interviews-tab.tsx
    - apps/frontend/src/components/investigations/investigation-info-summary.tsx
    - apps/frontend/src/components/investigations/investigation-header.tsx
    - apps/frontend/src/components/investigations/investigation-activity-timeline.tsx

key-decisions:
  - "STATUS_COLORS use dark: variants for colored states, bg-muted for neutral states"
  - "FILE_TYPE_COLORS use dark:bg-color-900/30 dark:text-color-300 pattern"
  - "Progress bars use bg-secondary (track) and bg-primary (fill) semantic tokens"
  - "Icon colors use dark: variants for semantic colors (green, yellow) but text-muted-foreground for neutral"

patterns-established:
  - "Dark mode badge pattern: bg-color-100 text-color-800 dark:bg-color-900/30 dark:text-color-300"
  - "Neutral state pattern: bg-muted text-muted-foreground (auto-adapts via CSS variables)"
  - "Icon semantic colors: Add dark: variant for green-500, yellow-500 when used for status indicators"

# Metrics
duration: 14min
completed: 2026-02-19
---

# Phase 38 Plan 01: Investigation Components Dark Mode Summary

**Migrated 6 high-impact investigation components from hardcoded gray/white Tailwind classes to semantic tokens with dark mode support**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-19T21:44:53Z
- **Completed:** 2026-02-19T21:58:35Z
- **Tasks:** 3/3
- **Files modified:** 6

## Accomplishments

- Migrated ~82 hardcoded color occurrences across 6 investigation components
- Added dark mode variants to STATUS_COLORS, FILE_TYPE_COLORS in each component
- Consistent contrast in both light and dark modes for property labels, values, badges
- Progress bars now use semantic tokens (bg-secondary track, bg-primary fill)

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate investigation-properties-panel.tsx** - `9412be3` (feat)
2. **Task 2: Migrate files-tab and interviews-tab** - `cec8526` (feat)
3. **Task 3: Migrate remaining 3 components** - `a165fd8` (feat)

## Files Modified

- `apps/frontend/src/components/investigations/investigation-properties-panel.tsx` - Property labels/values, progress bar, hover states
- `apps/frontend/src/components/investigations/investigation-files-tab.tsx` - FILE_TYPE_COLORS, empty state, file cards, table cells
- `apps/frontend/src/components/investigations/investigation-interviews-tab.tsx` - STATUS_COLORS, interview cards, empty state
- `apps/frontend/src/components/investigations/investigation-info-summary.tsx` - STATUS_COLORS, milestone icons, created info
- `apps/frontend/src/components/investigations/investigation-header.tsx` - CLOSED/INQUIRY states to semantic tokens
- `apps/frontend/src/components/investigations/investigation-activity-timeline.tsx` - Search icon, filter count, section headers

## Decisions Made

- Used `bg-muted text-muted-foreground` for neutral states (CLOSED, CANCELLED, OTHER) instead of explicit light/dark variants - cleaner and auto-adapts
- Progress bar track: `bg-secondary` instead of `bg-gray-200` for theme adaptation
- Progress bar fill: `bg-primary` instead of `bg-blue-500` for theme consistency
- Status icons (green checkmark, yellow alert): Added explicit dark: variants since CSS variables don't apply to these semantic colors

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Investigation components fully dark-mode ready
- Plan 38-02 can proceed with remaining investigation components (checklist-item, evidence-card, findings, note-card, parent-case-card)
- Established patterns can be reused: badge pairs, neutral states, icon dark variants

---

_Phase: 38-dark-mode-gap-closure_
_Plan: 01_
_Completed: 2026-02-19_
