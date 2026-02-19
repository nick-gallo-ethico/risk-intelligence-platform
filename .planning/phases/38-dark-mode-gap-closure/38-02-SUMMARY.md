---
phase: 38-dark-mode-gap-closure
plan: 02
subsystem: ui
tags: [dark-mode, tailwind, semantic-tokens, investigations, record-detail]

# Dependency graph
requires:
  - phase: 22-dark-mode-theme
    provides: Theme infrastructure and semantic token system
  - phase: 38-01
    provides: Initial dark mode migrations in 38-01
provides:
  - All 11 investigation components use semantic tokens
  - 3 record-detail shared components use semantic tokens
  - investigations/ directory is 100% dark mode ready
affects: [38-03, 38-10, case-detail-pages, investigation-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dark mode badge pattern: bg-color-100 text-color-800 dark:bg-color-900/30 dark:text-color-300"
    - "Semantic token replacements: bg-gray-* -> bg-muted, text-gray-* -> text-muted-foreground/text-foreground"
    - "AI button purple styling with explicit dark: variants"

key-files:
  modified:
    - apps/frontend/src/components/investigations/checklist-item.tsx
    - apps/frontend/src/components/investigations/investigation-evidence-card.tsx
    - apps/frontend/src/components/investigations/investigation-findings.tsx
    - apps/frontend/src/components/investigations/note-card.tsx
    - apps/frontend/src/components/investigations/parent-case-card.tsx
    - apps/frontend/src/components/record-detail/CollapsiblePropertyCard.tsx
    - apps/frontend/src/components/record-detail/DataHighlightsCard.tsx
    - apps/frontend/src/components/record-detail/EditableSummary.tsx

key-decisions:
  - "Gray badges (CLOSED, GENERAL, INSUFFICIENT_EVIDENCE) use bg-muted text-muted-foreground for consistency"
  - "Purple AI buttons get explicit dark: variants for purple-400/purple-800/purple-900 colors"
  - "BADGE_COLOR_MAP and STATUS_COLORS records get full dark: variant treatment"

patterns-established:
  - "Badge color record pattern: bg-color-100 text-color-800 border-color-200 dark:bg-color-900/30 dark:text-color-300 dark:border-color-800"
  - "Icon color pattern with dark variants: text-color-500 dark:text-color-400"

# Metrics
duration: 12min
completed: 2026-02-19
---

# Phase 38 Plan 02: Investigation + Record-Detail Components Summary

**Migrated 8 files to semantic tokens, completing investigations/ domain and starting record-detail shared components**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-19T21:46:08Z
- **Completed:** 2026-02-19T21:58:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- All 11 investigation component files now dark mode ready (directory 100% clean)
- DataHighlightsCard BADGE_COLOR_MAP and SLA_ICON_COLOR_MAP with dark: variants
- EditableSummary AI purple button styling with explicit dark mode support
- CollapsiblePropertyCard header/icon/text with semantic tokens

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate remaining 5 investigation components** - `a9c7160` (fix)
2. **Task 2: Migrate DataHighlightsCard and EditableSummary** - `d59d7bd` (fix)
3. **Task 3: Migrate CollapsiblePropertyCard** - `1ea0479` (fix)

## Files Modified

- `apps/frontend/src/components/investigations/checklist-item.tsx` - Fixed dark:text-gray-900 to dark:text-foreground
- `apps/frontend/src/components/investigations/investigation-evidence-card.tsx` - FILE_TYPE_COLORS with dark variants, semantic tokens
- `apps/frontend/src/components/investigations/investigation-findings.tsx` - INSUFFICIENT_EVIDENCE to semantic tokens
- `apps/frontend/src/components/investigations/note-card.tsx` - GENERAL note type to semantic tokens
- `apps/frontend/src/components/investigations/parent-case-card.tsx` - STATUS_COLORS/SEVERITY_COLORS with dark variants
- `apps/frontend/src/components/record-detail/CollapsiblePropertyCard.tsx` - Header, chevron, settings icon to semantic
- `apps/frontend/src/components/record-detail/DataHighlightsCard.tsx` - Badge and SLA color maps with dark variants
- `apps/frontend/src/components/record-detail/EditableSummary.tsx` - Title, AI buttons, text to semantic with dark variants

## Decisions Made

1. **Gray badge migration:** Changed `bg-gray-100 text-gray-700` patterns to `bg-muted text-muted-foreground` for semantic consistency
2. **Purple AI button styling:** Added explicit `dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-900/30` variants
3. **Link colors:** Changed `text-blue-600` to `text-primary` for theme-aware links

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- investigations/ directory is 100% dark mode ready (all 11 files clean)
- record-detail/ needs MobileSidebarDrawer, PipelineStageBar, RecordHeader, StatusHistoryTimeline (38-03)
- Ready for 38-03 to continue record-detail component migration

---

_Phase: 38-dark-mode-gap-closure_
_Completed: 2026-02-19_
