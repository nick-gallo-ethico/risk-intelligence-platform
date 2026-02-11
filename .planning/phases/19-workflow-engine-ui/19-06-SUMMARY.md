---
phase: 19-workflow-engine-ui
plan: 06
subsystem: ui
tags: [react, workflow, instances, progress-indicator, table, bulk-actions]

# Dependency graph
requires:
  - phase: 19-01
    provides: Backend UI support endpoints (listInstances, pause, resume, cancel)
  - phase: 19-02
    provides: TypeScript types, API service, React Query hooks
provides:
  - Workflow instances list page at /settings/workflows/[id]/instances
  - InstanceListTable with status filters, bulk actions, pagination
  - InstanceDetailDialog showing full instance state
  - WorkflowProgressIndicator reusable component for stage pipeline visualization
affects:
  [19-07-workflow-entity-integration, case-detail-page, policy-detail-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Horizontal stage pipeline with completed/current/future states
    - Bulk selection with checkbox and bulk actions bar
    - Status filter tabs using ToggleGroup

key-files:
  created:
    - apps/frontend/src/app/(authenticated)/settings/workflows/[id]/instances/page.tsx
    - apps/frontend/src/components/workflows/instance-list-table.tsx
    - apps/frontend/src/components/workflows/instance-detail-dialog.tsx
    - apps/frontend/src/components/workflows/workflow-progress-indicator.tsx
  modified: []

key-decisions:
  - "Progress indicator uses sort order from stage.display.sortOrder"
  - "Completed stages determined by position before current stage in array"
  - "Bulk actions validate status before enabling Pause/Resume/Cancel"

patterns-established:
  - "WorkflowProgressIndicator is reusable with compact prop for embedding in cards"
  - "Instance row selection with bulk actions bar pattern"

# Metrics
duration: 18min
completed: 2026-02-11
---

# Phase 19 Plan 06: Workflow Instances Page Summary

**Instances list page with filtering, bulk actions, detail dialog, and reusable progress indicator component**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-11T18:00:00Z
- **Completed:** 2026-02-11T18:18:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created /settings/workflows/[id]/instances page with status filter tabs
- Built InstanceListTable with entity, stage, status, SLA columns and bulk Pause/Resume/Cancel
- Implemented InstanceDetailDialog with step states table and action buttons
- Created WorkflowProgressIndicator reusable component for horizontal stage pipeline visualization

## Task Commits

Each task was committed atomically:

1. **Task 1: Instances list page with table and bulk actions** - `9141038` (feat)
2. **Task 2: Instance detail dialog and progress indicator** - `ef702fe` (feat)

## Files Created/Modified

- `apps/frontend/src/app/(authenticated)/settings/workflows/[id]/instances/page.tsx` - Instances page with status filter tabs
- `apps/frontend/src/components/workflows/instance-list-table.tsx` - Table with selection, bulk actions, pagination
- `apps/frontend/src/components/workflows/instance-detail-dialog.tsx` - Full instance details with step states
- `apps/frontend/src/components/workflows/workflow-progress-indicator.tsx` - Reusable horizontal stage pipeline

## Decisions Made

- Progress indicator sorts stages by display.sortOrder for consistent ordering
- Completed stages determined by position before current stage (simple linear progression)
- Bulk actions are state-aware: Pause only for ACTIVE, Resume only for PAUSED, Cancel for both
- AlertDialog confirmation required for bulk cancel to prevent accidental cancellation
- Progress indicator supports compact mode for embedding in cards (Plan 07 will use this)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation passed cleanly on both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Instances management page complete for workflow templates
- WorkflowProgressIndicator ready for integration into case/policy detail pages (Plan 07)
- All workflow management features now have UI: list, create, edit, clone, instances

---

_Phase: 19-workflow-engine-ui_
_Completed: 2026-02-11_
