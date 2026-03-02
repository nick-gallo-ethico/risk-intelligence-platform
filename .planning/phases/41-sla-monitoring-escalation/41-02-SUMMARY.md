---
phase: 41-sla-monitoring-escalation
plan: 02
subsystem: workflow
tags: [sla, case-management, scheduler, events, nestjs]

# Dependency graph
requires:
  - phase: 41-01
    provides: CaseSlaConfig types and SlaConfigService
  - phase: 07-notifications-email
    provides: SLA events and notification infrastructure
provides:
  - CaseSlaTrackerService for case-level SLA monitoring
  - SlaSchedulerService integration for combined workflow+case checks
  - sla.warning event emission on status transitions
affects: [41-03, 41-04, 41-05, 41-06, escalation, notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Batch processing by organization for efficient config loading"
    - "Status transition detection for deduplication (only emit on change)"
    - "Combined scheduler pattern for multiple SLA check types"

key-files:
  created:
    - apps/backend/src/modules/workflow/sla/case-sla-tracker.service.ts
  modified:
    - apps/backend/src/modules/workflow/sla/sla-scheduler.service.ts
    - apps/backend/src/modules/workflow/sla/index.ts
    - apps/backend/src/modules/workflow/workflow.module.ts

key-decisions:
  - "Warning events only emitted on on_track -> warning transition to prevent spam"
  - "Cases excluded by CLOSED status AND isMerged flag (no MERGED enum value)"
  - "Assignee determined from Investigation.primaryInvestigatorId (Case lacks assignedToId)"
  - "Due date calculated on first check if Case.slaDueDate is null"

patterns-established:
  - "CaseSlaTrackerService: batch by org, check all active cases, emit events on transitions"
  - "CombinedSlaCheckResult: separate metrics for workflows vs cases"

# Metrics
duration: 12min
completed: 2026-03-02
---

# Phase 41 Plan 02: Case SLA Tracker Service and Scheduler Integration Summary

**CaseSlaTrackerService monitors all active cases and emits sla.warning events when reaching 80% threshold, with deduplication via status transition detection**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-02T16:00:00Z
- **Completed:** 2026-03-02T16:12:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created CaseSlaTrackerService with checkAllCaseSlas() method
- Integrated case SLA checks into SlaSchedulerService (runs every 5 minutes)
- Status transition detection prevents duplicate warning notifications
- Separate logging metrics for workflow vs case SLA checks

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CaseSlaTrackerService** - `2fdf61e5` (feat)
2. **Task 2: Extend SlaSchedulerService for case monitoring** - `ca5591ab` (feat)

## Files Created/Modified

- `apps/backend/src/modules/workflow/sla/case-sla-tracker.service.ts` - New service for case SLA monitoring
- `apps/backend/src/modules/workflow/sla/sla-scheduler.service.ts` - Added case SLA checks alongside workflow checks
- `apps/backend/src/modules/workflow/sla/index.ts` - Export CaseSlaTrackerService
- `apps/backend/src/modules/workflow/workflow.module.ts` - Register and export CaseSlaTrackerService

## Decisions Made

- **Status transition detection:** Warning events only emitted when status changes from on_track to warning (prevents 5-minute notification spam)
- **Case filtering:** Uses `status != CLOSED AND isMerged = false` (CaseStatus enum lacks MERGED value)
- **Assignee lookup:** Uses Investigation.primaryInvestigatorId since Case model lacks assignedToId field (schema gap from 40-02)
- **Due date calculation:** If Case.slaDueDate is null, calculated on first check using SlaConfigService.calculateDueDate()

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CaseStatus enum reference**

- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Plan referenced `status: { notIn: ["CLOSED", "MERGED"] }` but CaseStatus enum has no MERGED value
- **Fix:** Changed to `status: { not: "CLOSED" }, isMerged: false`
- **Files modified:** case-sla-tracker.service.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** 2fdf61e5 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor query adjustment due to schema difference. No scope creep.

## Issues Encountered

- CaseStatus enum only has NEW, OPEN, CLOSED (no MERGED status) - resolved by using isMerged boolean flag

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Case SLA monitoring operational for 41-03 (SLA Breach Events)
- Scheduler runs both workflow and case checks every 5 minutes
- sla.warning events ready for notification listener integration
- No blockers for continuing Phase 41

---

_Phase: 41-sla-monitoring-escalation_
_Completed: 2026-03-02_
