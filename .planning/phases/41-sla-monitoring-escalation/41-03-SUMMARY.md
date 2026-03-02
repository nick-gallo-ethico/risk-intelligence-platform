---
phase: 41-sla-monitoring-escalation
plan: 03
subsystem: workflow
tags: [sla, events, escalation, notifications, eventEmitter2]

# Dependency graph
requires:
  - phase: 41-01
    provides: SLA configuration types and event definitions
  - phase: 41-02
    provides: CaseSlaTrackerService base implementation
provides:
  - SLA breach event emission on status transition
  - SLA critical event emission (48h+ overdue)
  - Supervisor lookup via Employee.manager chain
  - Compliance officer lookup via User.role
  - Complete SLA escalation path (warning -> breach -> critical)
affects: [41-04, 41-05, 41-06, notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - User-Employee email matching for supervisor lookup
    - Status transition-based event emission for deduplication

key-files:
  created: []
  modified:
    - apps/backend/src/modules/workflow/sla/case-sla-tracker.service.ts
    - apps/backend/src/modules/workflow/sla/sla.types.ts

key-decisions:
  - "Supervisor lookup via User->Employee email match->Employee.manager->User email match"
  - "Critical events only emitted if compliance officer found (silent skip otherwise)"
  - "Breach events only for breached status, critical is separate event"

patterns-established:
  - "User-to-Employee linking via email for org hierarchy lookup"
  - "SLA escalation chain: warning (assignee) -> breach (assignee+supervisor) -> critical (assignee+supervisor+CCO)"

# Metrics
duration: 12min
completed: 2026-03-02
---

# Phase 41 Plan 03: SLA Breach Events and Escalation Summary

**SLA breach and critical event emission with supervisor/CCO escalation via Employee manager chain and User role lookup**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-02T15:51:32Z
- **Completed:** 2026-03-02T16:03:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended CaseSlaTrackerService to emit sla.breached events on breach transitions
- Added sla.critical event emission for cases 48+ hours overdue
- Implemented supervisor lookup via User->Employee->manager->User chain
- Implemented compliance officer lookup via User.role = COMPLIANCE_OFFICER
- Added criticals count to SlaCheckResult for complete metrics tracking

## Task Commits

Each task was committed atomically:

1. **Task 1: Add breach and critical detection to CaseSlaTrackerService** - `b968680f` (feat)
2. **Task 2: Update SlaCheckResult type for breaches** - `2e9fff01` (feat)

## Files Created/Modified

- `apps/backend/src/modules/workflow/sla/case-sla-tracker.service.ts` - Added breach/critical event emission, supervisor/CCO lookup methods
- `apps/backend/src/modules/workflow/sla/sla.types.ts` - Added criticals count to SlaCheckResult interface

## Decisions Made

1. **Supervisor lookup via email matching**: Since there's no direct User->Employee relation, we match User.email to Employee.email, then follow Employee.manager, then find the manager's User by email. This handles the common case where investigators have both User and Employee records.

2. **Critical events require CCO**: If no COMPLIANCE_OFFICER role user is found, critical events are silently skipped (no error). This prevents failures in orgs without a designated CCO.

3. **Breach vs Critical separation**: Breach events only fire for `breached` status, not for `critical`. Critical is a distinct escalation event, ensuring each level of escalation is properly notified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation matched plan requirements precisely. The Employee-User linking pattern was discovered during implementation by examining the Prisma schema, which showed Employee has a `manager` self-relation via `managerId`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Breach and critical events now properly emitted on status transitions
- SlaEventListener (already implemented in 41-01) handles all three event types
- Ready for Plan 41-04 (Investigation SLA Tracking) which will follow similar patterns

---

_Phase: 41-sla-monitoring-escalation_
_Completed: 2026-03-02_
