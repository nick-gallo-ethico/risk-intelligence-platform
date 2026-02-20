---
phase: 38-dark-mode-gap-closure
plan: 09
subsystem: ui
tags:
  [
    dark-mode,
    tailwind,
    semantic-tokens,
    ai-components,
    workflows,
    exports,
    policies,
  ]

# Dependency graph
requires:
  - phase: 22-dark-mode-theme
    provides: "CSS variables and semantic token definitions"
  - phase: 38-08
    provides: "Project components dark mode migration"
provides:
  - AI components (ai-category-suggest, ai-risk-score, ai-summary-button) use semantic tokens
  - Workflow components (stage-properties, workflow-list-table, workflow-progress-indicator) use semantic tokens
  - Export components (FlatExportBuilder, TaggedFieldConfig) use semantic tokens
  - Policy components (policy-attestations-panel, policy-cases-panel, policy-detail-header, policy-list) use semantic tokens
affects: [38-10, future-dark-mode-maintenance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "bg-muted text-muted-foreground for semantic gray badges"
    - "dark:bg-color-900/30 dark:text-color-300 for colored badge dark variants"

key-files:
  modified:
    - apps/frontend/src/components/ai/ai-category-suggest.tsx
    - apps/frontend/src/components/ai/ai-risk-score.tsx
    - apps/frontend/src/components/ai/ai-summary-button.tsx
    - apps/frontend/src/components/workflows/builder/stage-properties.tsx
    - apps/frontend/src/components/workflows/workflow-list-table.tsx
    - apps/frontend/src/components/workflows/workflow-progress-indicator.tsx
    - apps/frontend/src/components/exports/FlatExportBuilder.tsx
    - apps/frontend/src/components/exports/TaggedFieldConfig.tsx
    - apps/frontend/src/components/policies/policy-attestations-panel.tsx
    - apps/frontend/src/components/policies/policy-cases-panel.tsx
    - apps/frontend/src/components/policies/policy-detail-header.tsx
    - apps/frontend/src/components/policies/policy-list.tsx

key-decisions:
  - "Gray badges (DRAFT, MIGRATION, GOVERNING) use bg-muted text-muted-foreground (semantic)"
  - "Unselected tag states use bg-muted/50 text-muted-foreground hover:bg-muted"
  - "STEP_TYPE_COLORS and ENTITY_TYPE_COLORS use explicit dark: variants for colored badges"

patterns-established:
  - "Semantic gray pattern: bg-muted text-muted-foreground border-border"
  - "Unselected/inactive state pattern: bg-muted/50 text-muted-foreground hover:bg-muted"

# Metrics
duration: 18min
completed: 2026-02-20
---

# Phase 38 Plan 09: AI, Workflows, Exports, Policies Dark Mode Summary

**Migrated 12 components across AI, workflows, exports, and policies to semantic tokens for full dark mode support**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-20T00:42:20Z
- **Completed:** 2026-02-20T01:00:20Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- All AI components (category suggest, risk score, summary button) render correctly in dark mode
- Workflow builder components (stage properties, list table, progress indicator) have proper contrast
- Export configuration components (FlatExportBuilder, TaggedFieldConfig) are readable in dark mode
- Policy management components (attestations, cases, header, list) use semantic tokens consistently

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate AI components (3 files)** - `96fce7d` (feat)
2. **Task 2: Migrate workflow components (3 files)** - `3f18fd0` (feat)
3. **Task 3: Migrate exports and policies components (6 files)** - `206e36d` (feat)

## Files Modified

- `apps/frontend/src/components/ai/ai-category-suggest.tsx` - Dark variants for error/warning cards, semantic text colors
- `apps/frontend/src/components/ai/ai-risk-score.tsx` - Dark variants for cards, semantic text/background colors
- `apps/frontend/src/components/ai/ai-summary-button.tsx` - Semantic text colors for dropdown hints
- `apps/frontend/src/components/workflows/builder/stage-properties.tsx` - STEP_TYPE_COLORS with dark variants, semantic gate styling
- `apps/frontend/src/components/workflows/workflow-list-table.tsx` - ENTITY_TYPE_COLORS with dark variants, semantic inactive badge
- `apps/frontend/src/components/workflows/workflow-progress-indicator.tsx` - Semantic border and background tokens
- `apps/frontend/src/components/exports/FlatExportBuilder.tsx` - Semantic MIGRATION tag and unselected badge states
- `apps/frontend/src/components/exports/TaggedFieldConfig.tsx` - Semantic MIGRATION tag and unselected badge states
- `apps/frontend/src/components/policies/policy-attestations-panel.tsx` - Semantic DRAFT status badge
- `apps/frontend/src/components/policies/policy-cases-panel.tsx` - Semantic GOVERNING link type badge
- `apps/frontend/src/components/policies/policy-detail-header.tsx` - Semantic DRAFT status badge
- `apps/frontend/src/components/policies/policy-list.tsx` - Semantic DRAFT status badge

## Decisions Made

- Gray badges (DRAFT, MIGRATION, GOVERNING, etc.) use `bg-muted text-muted-foreground border-border` for semantic gray
- Unselected/inactive tag states use `bg-muted/50 text-muted-foreground hover:bg-muted` for consistent disabled appearance
- Colored badge configs (STEP_TYPE_COLORS, ENTITY_TYPE_COLORS) get explicit `dark:bg-color-900/30 dark:text-color-300` variants

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four directories (ai, workflows, exports, policies) are completely clean of hardcoded gray/white colors
- Ready for Phase 38 Plan 10 (final dark mode gap closure)

---

_Phase: 38-dark-mode-gap-closure_
_Completed: 2026-02-20_
