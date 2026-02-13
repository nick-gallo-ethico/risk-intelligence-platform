---
phase: 25-case-investigation-page-redesign
plan: 01
subsystem: ui
tags: [react, next.js, tailwind, shadcn, activity-timeline, tabs]

# Dependency graph
requires:
  - phase: 05-case-management
    provides: Case detail page, CaseTabs component, activity timeline structure
provides:
  - Activities as default case tab
  - Activity search and filtering
  - Upcoming section for future tasks/SLA
  - Enhanced date grouping labels
  - User filter dropdown
affects: [25-02, 25-03, 25-04, 25-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Activity timeline with search, upcoming section, and date grouping
    - User filter dropdown pattern for activity filtering

key-files:
  created: []
  modified:
    - apps/frontend/src/components/cases/case-tabs.tsx
    - apps/frontend/src/components/cases/case-activity-timeline.tsx
    - apps/frontend/src/components/cases/activity-entry.tsx
    - apps/frontend/src/lib/date-utils.ts
    - apps/frontend/src/lib/activity-icons.tsx
    - apps/frontend/src/types/activity.ts
    - apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx

key-decisions:
  - "Activities tab is now the default tab when opening a case (HubSpot pattern)"
  - "Extended ActivityAction type to include task and SLA action types for upcoming section"
  - "Amber styling for upcoming items to visually distinguish from past activities"
  - "User filter uses actorUserId from activities for precise filtering"

patterns-established:
  - "Upcoming section pattern: Filter activities by future due dates, render above timeline"
  - "Date group labels: Today, Yesterday, This Week, Last Week, then month/year"
  - "Filter count indicator: 'Showing X of Y activities' below filters"

# Metrics
duration: 16min
completed: 2026-02-13
---

# Phase 25 Plan 01: Case Tabs and Activity Timeline Summary

**Reordered case tabs with Activities as default, added search bar, upcoming section, descriptive date grouping, and user filter to activity timeline**

## Performance

- **Duration:** 16 min
- **Started:** 2026-02-13T17:50:31Z
- **Completed:** 2026-02-13T18:06:50Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Activities tab is now the default tab when opening a case (investigators see recent activity first)
- Activity timeline has search bar to filter by description or actor name
- Upcoming section pinned above timeline for future tasks/SLA deadlines
- Date groups use descriptive labels (Today, Yesterday, This Week, Last Week)
- User filter dropdown allows filtering activities by specific actor
- Filter count indicator shows "Showing X of Y activities"

## Task Commits

Each task was committed atomically:

1. **Task 1: Reorder tabs and set Activities as default** - `ec291b9` (feat)
2. **Task 2: Add search bar and upcoming section to activity timeline** - `95d1355` (feat)
3. **Task 3: Enhance date grouping labels and add user/team filters** - `33713fd` (feat)

## Files Created/Modified

- `apps/frontend/src/components/cases/case-tabs.tsx` - Reordered TABS array, changed defaultTab to "activity", removed Recent Activity section from Overview
- `apps/frontend/src/components/cases/case-activity-timeline.tsx` - Added search input, upcoming section, user filter dropdown, filter count indicator
- `apps/frontend/src/components/cases/activity-entry.tsx` - Added isUpcoming prop for amber styling on upcoming items
- `apps/frontend/src/lib/date-utils.ts` - Updated getDateGroupLabel to use This Week/Last Week labels
- `apps/frontend/src/lib/activity-icons.tsx` - Added icons for task_created, task_assigned, task_completed, sla_warning, sla_updated, sla_breached
- `apps/frontend/src/types/activity.ts` - Extended ActivityAction with task and SLA action types
- `apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx` - Removed explicit defaultTab prop

## Decisions Made

- Extended ActivityAction type to include task_created, task_assigned, task_completed, sla_warning, sla_updated, sla_breached actions for proper upcoming section support
- Used amber color scheme (bg-amber-50, text-amber-600) for upcoming items to visually distinguish them
- Removed "Recent Activity" link section from Overview tab since Activities is now the default tab
- User filter extracts unique users from activities rather than requiring a separate API call

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added ActivityAction types for task and SLA actions**

- **Found during:** Task 2 (Upcoming section implementation)
- **Issue:** Plan referenced action types (task_created, task_assigned, sla_warning, sla_updated) that didn't exist in ActivityAction type
- **Fix:** Extended ActivityAction type with 6 new action types, added corresponding icon configs
- **Files modified:** apps/frontend/src/types/activity.ts, apps/frontend/src/lib/activity-icons.tsx
- **Verification:** TypeScript compilation passes
- **Committed in:** 95d1355 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix was necessary for TypeScript type safety. The plan assumed these action types existed but they needed to be added.

## Issues Encountered

None - plan executed as specified with one type extension needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Case tabs and activity timeline redesign complete
- Ready for 25-02 (Quick Actions Grid and Properties Panel)
- Upcoming section pattern can be reused in Investigation detail page

---

_Phase: 25-case-investigation-page-redesign_
_Completed: 2026-02-13_
