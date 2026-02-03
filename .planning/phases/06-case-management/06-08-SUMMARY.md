---
phase: 06-case-management
plan: 08
subsystem: notifications
tags: [bullmq, email, reminders, escalation, events, nestjs]

# Dependency graph
requires:
  - phase: 06-03
    provides: RemediationPlan and RemediationStep entities with DAG dependencies
provides:
  - RemediationNotificationService for assignment/reminder notifications
  - RemediationEventHandler for event-driven notification triggers
  - RemediationProcessor for scheduled reminder/escalation job processing
  - Pre-due reminders at 3 and 1 days before due
  - Overdue reminders at 3 and 7 days after due
  - Escalation to compliance officers at 7 days overdue
affects: [07-notifications-email, case-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Event-driven notification triggering via EventEmitter2
    - BullMQ delayed jobs for scheduled reminders
    - Domain-colocated processor pattern (processor in remediation module)

key-files:
  created:
    - apps/backend/src/modules/remediation/remediation-notification.service.ts
    - apps/backend/src/modules/remediation/remediation.processor.ts
    - apps/backend/src/modules/remediation/handlers/remediation-event.handler.ts
    - apps/backend/src/modules/remediation/handlers/index.ts
  modified:
    - apps/backend/src/modules/remediation/remediation.module.ts
    - apps/backend/src/modules/remediation/index.ts
    - apps/backend/prisma/schema.prisma

key-decisions:
  - "Processor in remediation module for domain co-location (not jobs module)"
  - "forwardRef for circular dependency between processor and notification service"
  - "Added REMEDIATION_PLAN and REMEDIATION_STEP to AuditEntityType enum"

patterns-established:
  - "Default reminder config: pre-due [3, 1] days, overdue [3, 7] days, escalation 7 days"
  - "Job scheduling via BullMQ delay with unique jobId for cancellation"
  - "Event handler catches errors to prevent notification failures from crashing operations"

# Metrics
duration: 27min
completed: 2026-02-03
---

# Phase 06 Plan 08: Remediation Notifications Summary

**Event-driven notification service with scheduled reminders for remediation step assignments, pre-due/overdue alerts, and compliance officer escalation**

## Performance

- **Duration:** 27 min
- **Started:** 2026-02-03T23:27:03Z
- **Completed:** 2026-02-03T23:54:16Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Notification service for all remediation notification scenarios
- Event handler wiring events to notifications automatically
- Job processor for scheduled reminder/escalation processing
- Configurable reminder intervals with sensible defaults

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RemediationNotificationService** - `4fe1f04` (feat)
2. **Task 2: Create Event Handler for Remediation Events** - `05b4c9a` (feat)
3. **Task 3: Create Remediation Job Processor** - `e6e40ac` (feat)

## Files Created/Modified
- `remediation-notification.service.ts` - Notification scheduling and sending
- `remediation.processor.ts` - BullMQ job processor for reminders/escalations
- `handlers/remediation-event.handler.ts` - Event-driven notification triggers
- `handlers/index.ts` - Barrel export for handlers
- `remediation.module.ts` - Added notification service, processor, event handler
- `index.ts` - Export new services
- `prisma/schema.prisma` - Added REMEDIATION_PLAN and REMEDIATION_STEP to AuditEntityType

## Decisions Made

1. **Processor in remediation module:** Located processor within remediation module rather than jobs module for domain co-location and easier dependency management.

2. **forwardRef for circular dependency:** Used NestJS forwardRef to resolve circular dependency between RemediationProcessor and RemediationNotificationService.

3. **AuditEntityType expansion:** Added REMEDIATION_PLAN and REMEDIATION_STEP enum values to support audit logging for remediation events.

4. **Plan owner notification:** Plan completion notification goes to plan owner (ownerId) rather than case assignee, as the plan owner is responsible for remediation oversight.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing AuditEntityType enum values**
- **Found during:** Task 2 (Event Handler creation)
- **Issue:** REMEDIATION_PLAN and REMEDIATION_STEP were not in AuditEntityType enum, causing TypeScript errors
- **Fix:** Added both values to enum in prisma/schema.prisma
- **Files modified:** apps/backend/prisma/schema.prisma
- **Verification:** TypeScript compiles, build succeeds
- **Committed in:** 05b4c9a (Task 2 commit)

**2. [Rule 1 - Bug] Fixed audit log DTO missing required fields**
- **Found during:** Task 2 (Event Handler creation)
- **Issue:** CreateAuditLogDto requires actionCategory and actorType; used metadata instead of context
- **Fix:** Added required fields to all audit.log() calls, changed metadata to context
- **Files modified:** handlers/remediation-event.handler.ts
- **Verification:** TypeScript compiles
- **Committed in:** 05b4c9a (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for code correctness. No scope creep.

## Issues Encountered
- Prisma generate failed due to Windows file locking on query_engine dll - worked around by proceeding with TypeScript check which succeeded

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Notification infrastructure ready for Phase 7 (Notifications & Email) email template integration
- Event-driven pattern established for other modules to follow
- Email templates (STEP_ASSIGNED, REMINDER_PRE_DUE, etc.) are placeholders - actual templates in Phase 7

---
*Phase: 06-case-management*
*Completed: 2026-02-03*
