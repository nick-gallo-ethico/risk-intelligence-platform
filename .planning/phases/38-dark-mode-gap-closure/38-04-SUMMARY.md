---
phase: 38-dark-mode-gap-closure
plan: 04
subsystem: ui
tags: [dark-mode, semantic-tokens, tailwind, cases]

# Dependency graph
requires:
  - phase: 22-dark-mode-theme
    provides: Theme infrastructure and semantic token definitions
provides:
  - 6 high-impact case components using semantic tokens
  - Dark mode compatible merge modal, form answers, summary tab
affects: [case-detail-page, investigations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "bg-muted for collapsible triggers and empty states"
    - "text-foreground for primary text in form displays"
    - "dark: variants for semantic colors (blue, green, purple)"

key-files:
  created: []
  modified:
    - apps/frontend/src/components/cases/merge-modal.tsx
    - apps/frontend/src/components/cases/assign-modal.tsx
    - apps/frontend/src/components/cases/linked-riu-form-answers.tsx
    - apps/frontend/src/components/cases/summary-tab.tsx
    - apps/frontend/src/components/cases/case-info-summary.tsx
    - apps/frontend/src/components/cases/case-properties-panel.tsx

key-decisions:
  - "CLOSED status uses bg-muted text-muted-foreground (semantic gray)"
  - "Boolean badges: Yes=green with dark variant, No=muted (semantic)"
  - "AI badge: purple with dark:bg-purple-900/30 dark:text-purple-300"
  - "Summary card: bg-blue-50/50 dark:bg-blue-900/20 for blue tint"

patterns-established:
  - "CollapsibleTrigger: bg-muted hover:bg-accent"
  - "Field labels: text-muted-foreground uppercase tracking-wide"
  - "Field values: text-foreground"
  - "Empty/placeholder text: text-muted-foreground italic"

# Metrics
duration: 22min
completed: 2026-02-19
---

# Phase 38 Plan 04: Case Components Dark Mode Summary

**6 high-impact case components migrated to semantic tokens for full dark mode support**

## Performance

- **Duration:** 22 min
- **Started:** 2026-02-20T00:00:54Z
- **Completed:** 2026-02-20T00:22:31Z
- **Tasks:** 3 (Task 1 previously completed)
- **Files modified:** 6

## Accomplishments

- Migrated merge-modal.tsx and assign-modal.tsx (Task 1 - done by 805118b prior execution)
- Migrated linked-riu-form-answers.tsx with collapsible sections, field displays, boolean badges
- Migrated summary-tab.tsx with AI badge, summary cards, empty states
- Migrated case-info-summary.tsx CLOSED status to semantic tokens
- Migrated case-properties-panel.tsx RISK_LEVEL fallback to semantic tokens

## Task Commits

Each task was committed atomically:

1. **Task 1: merge-modal and assign-modal** - `805118b` (feat - prior execution)
2. **Task 2: linked-riu-form-answers and summary-tab** - `b33c81c` (feat)
3. **Task 3: case-info-summary and case-properties-panel** - `d905425` (feat - parallel execution)

Note: Tasks 1 and 3 were completed by parallel plan executions (38-05, 38-06) that included these files.

## Files Created/Modified

- `apps/frontend/src/components/cases/merge-modal.tsx` - Case merge modal with search, preview, status badges
- `apps/frontend/src/components/cases/assign-modal.tsx` - Investigator assignment modal with user list
- `apps/frontend/src/components/cases/linked-riu-form-answers.tsx` - RIU form data display with collapsible sections
- `apps/frontend/src/components/cases/summary-tab.tsx` - AI/manual summary display with badges
- `apps/frontend/src/components/cases/case-info-summary.tsx` - Compact case info card
- `apps/frontend/src/components/cases/case-properties-panel.tsx` - Property cards with inline editing

## Decisions Made

- CLOSED status uses `bg-muted text-muted-foreground` for consistent semantic gray
- Boolean field badges: Yes=green with dark variant, No=muted semantic
- AI-generated badge: purple-100/purple-700 with dark:bg-purple-900/30 dark:text-purple-300
- Summary cards use blue tint: bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800
- Collapsible triggers: bg-muted hover:bg-accent for interactive sections
- Field display pattern: labels=text-muted-foreground, values=text-foreground

## Deviations from Plan

### Overlap with Parallel Executions

Task 1 (merge-modal, assign-modal) and Task 3 (case-info-summary, case-properties-panel) were already migrated by commits 805118b (38-05) and d905425 (38-06) respectively during parallel plan executions.

This plan's primary contribution was Task 2 (linked-riu-form-answers, summary-tab) in commit b33c81c.

---

**Total deviations:** 0 auto-fixed
**Impact on plan:** Work distributed across parallel executions. All 6 files now use semantic tokens.

## Issues Encountered

- Git gc error during commit (non-blocking, repository continued to function)
- Parallel plan executions (38-05, 38-06) completed some Task 1 and Task 3 files

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 6 high-impact case components now dark mode ready
- Case detail page fully themed with semantic tokens
- Ready for remaining plans 38-07 through 38-10

---

_Phase: 38-dark-mode-gap-closure_
_Completed: 2026-02-19_
