---
phase: 38-dark-mode-gap-closure
plan: 05
subsystem: ui
tags: [dark-mode, semantic-tokens, tailwind, case-sidebar, cards]

# Dependency graph
requires:
  - phase: 22-dark-mode-theme
    provides: Theme infrastructure, semantic token definitions, ThemeProvider
provides:
  - Case sidebar card components with dark mode support
  - Investigation card with semantic tokens
  - Connected entity cards (people, RIUs, cases, policies) themed
affects: [case-detail-page, investigation-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "bg-muted for gray-100/50 backgrounds"
    - "text-muted-foreground for gray-400/500/600 text"
    - "STATUS_COLORS with dark: variants for status badges"

key-files:
  modified:
    - apps/frontend/src/components/cases/investigation-card.tsx
    - apps/frontend/src/components/cases/case-investigations-panel.tsx
    - apps/frontend/src/components/cases/connected-people-card.tsx
    - apps/frontend/src/components/cases/linked-rius-card.tsx
    - apps/frontend/src/components/cases/related-cases-card.tsx
    - apps/frontend/src/components/cases/related-policies-card.tsx
    - apps/frontend/src/components/cases/linked-riu-list.tsx
    - apps/frontend/src/components/cases/remediation-status-card.tsx

key-decisions:
  - "STAKEHOLDER badge uses bg-muted text-muted-foreground (semantic gray)"
  - "CLOSED status badge uses bg-muted text-muted-foreground (semantic gray)"
  - "RELATED association type uses bg-muted text-muted-foreground border-border (semantic)"

patterns-established:
  - "Gray badges (neutral status) use bg-muted text-muted-foreground instead of hardcoded gray"
  - "Primary RIU highlight gets dark:border-blue-800 dark:bg-blue-900/20 variants"
  - "Association type colors use semantic tokens for neutral (RELATED) types"

# Metrics
duration: 14min
completed: 2026-02-20
---

# Phase 38 Plan 05: Case Sidebar Cards Summary

**8 case sidebar/association card components migrated to semantic tokens for dark mode compatibility**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-20T00:01:39Z
- **Completed:** 2026-02-20T00:15:10Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Investigation card and panel now render correctly in dark mode
- All 4 connected entity cards (people, RIUs, cases, policies) themed
- Linked RIU list and remediation status card use semantic tokens
- STATUS_COLORS and ASSOCIATION_CONFIG use dark mode variants

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate investigation-card.tsx and case-investigations-panel.tsx** - `805118b` (feat)
2. **Task 2: Migrate connected entity cards (4 files)** - `6e0ff9d` (feat)
3. **Task 3: Migrate linked-riu-list.tsx and remediation-status-card.tsx** - `ee127d9` (feat)

## Files Modified

- `apps/frontend/src/components/cases/investigation-card.tsx` - Investigation card with semantic STATUS_COLORS
- `apps/frontend/src/components/cases/case-investigations-panel.tsx` - Panel with semantic status colors
- `apps/frontend/src/components/cases/connected-people-card.tsx` - People card with semantic tokens
- `apps/frontend/src/components/cases/linked-rius-card.tsx` - RIU card with dark mode variants
- `apps/frontend/src/components/cases/related-cases-card.tsx` - Cases card with STATUS_COLORS dark variants
- `apps/frontend/src/components/cases/related-policies-card.tsx` - Policies card with semantic tokens
- `apps/frontend/src/components/cases/linked-riu-list.tsx` - RIU list with semantic ASSOCIATION_CONFIG
- `apps/frontend/src/components/cases/remediation-status-card.tsx` - Status card with semantic header

## Decisions Made

- **STAKEHOLDER label color:** Changed from `bg-gray-100 text-gray-800 border-gray-200` to `bg-muted text-muted-foreground border-border` for semantic dark mode support
- **CLOSED status:** Uses `bg-muted text-muted-foreground` instead of hardcoded gray
- **RELATED association:** Uses semantic tokens instead of explicit dark: variants for gray
- **Primary RIU highlight:** Added `dark:border-blue-800 dark:bg-blue-900/20` to existing blue highlight

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all files contained straightforward hardcoded colors that mapped directly to semantic tokens.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All case sidebar card components now support dark mode
- Pattern established: gray/neutral badges use `bg-muted text-muted-foreground`
- Ready to continue with remaining dark mode gap closure plans

---

_Phase: 38-dark-mode-gap-closure_
_Completed: 2026-02-20_
