---
phase: 25-case-investigation-page-redesign
plan: 05
subsystem: ui
tags: [react, typescript, next.js, activity-timeline, investigation, tabs]

# Dependency graph
requires:
  - phase: 25-01
    provides: [CaseActivityTimeline component, date-utils, activity-entry]
  - phase: 25-04
    provides: [investigation three-column layout]
provides:
  - InvestigationActivityTimeline component with search/filter/upcoming
  - InvestigationInterviewsTab component with interview list
  - InvestigationFilesTab component with grid/list views
  - Activities as default investigation tab
affects: [25-06, investigation-page]

# Tech tracking
tech-stack:
  added: []
  patterns: [investigation-tab-pattern, api-graceful-fallback]

key-files:
  created:
    - apps/frontend/src/components/investigations/investigation-activity-timeline.tsx
    - apps/frontend/src/components/investigations/investigation-interviews-tab.tsx
    - apps/frontend/src/components/investigations/investigation-files-tab.tsx
  modified:
    - apps/frontend/src/app/(authenticated)/investigations/[id]/page.tsx

key-decisions:
  - "Reused ActivityEntry and groupByDate from case timeline for consistency"
  - "Activities tab is default (most-used view for investigators)"
  - "API graceful fallback - empty state if endpoint not yet implemented"
  - "Grid/List toggle for files tab (same pattern as documents elsewhere)"

patterns-established:
  - "investigation-tab-pattern: Tab components fetch their own data via useCallback + useEffect"
  - "api-graceful-fallback: Try API call, catch and show empty state gracefully"

# Metrics
duration: 11min
completed: 2026-02-13
---

# Phase 25 Plan 05: Investigation Activity Timeline and Tabs Summary

**Investigation activity timeline with search/filters/upcoming section, real interviews tab, and files tab with grid/list toggle**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-13T18:39:06Z
- **Completed:** 2026-02-13T18:50:09Z
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- Created InvestigationActivityTimeline with search, filter tabs, user dropdown, upcoming section, and date grouping
- Made Activities the default tab when opening investigation (was Checklist)
- Replaced placeholder interviews tab with real InvestigationInterviewsTab component
- Replaced placeholder files tab with real InvestigationFilesTab component with grid/list toggle

## Task Commits

Each task was committed atomically:

1. **Task 1: Create investigation activity timeline and set Activities as default** - `1444634` (feat)
2. **Task 2: Implement Interviews tab** - `66b87ab` (feat)
3. **Task 3: Implement Files tab** - `b4ab7d2` (feat)

## Files Created/Modified

- `apps/frontend/src/components/investigations/investigation-activity-timeline.tsx` - Activity timeline with search, filters, upcoming, date grouping
- `apps/frontend/src/components/investigations/investigation-interviews-tab.tsx` - Interview list with status badges, actions, empty state
- `apps/frontend/src/components/investigations/investigation-files-tab.tsx` - File management with grid/list views, type badges
- `apps/frontend/src/app/(authenticated)/investigations/[id]/page.tsx` - Updated tab order, default, and tab content

## Decisions Made

- Reused ActivityEntry component and groupByDate utility from case timeline for visual consistency
- Activities is now default tab (aligns with case page pattern from 25-01)
- API calls gracefully fallback to empty state if endpoints not yet implemented
- Files tab has grid/list toggle (reusable pattern for evidence/documents)
- Filter types adjusted for investigation context: "Evidence" instead of "Files"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation passed on all tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Investigation center column complete with activity timeline and functional tabs
- Ready for 25-06: Right column association cards (linked case, subjects, related RIUs)
- All API endpoints use graceful fallback, so backend implementation can proceed independently

---

_Phase: 25-case-investigation-page-redesign_
_Completed: 2026-02-13_
