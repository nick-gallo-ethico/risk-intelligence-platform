---
phase: 42-anonymous-communication-relay
plan: 03
subsystem: notifications
tags: [events, email, anonymous-reporting, privacy, delayed-notification]

# Dependency graph
requires:
  - phase: 42-01
    provides: DelayedNotificationService for privacy-preserving email delivery
  - phase: 42-02
    provides: REPORTER_ACCESS_CODE_TEMPLATE constant for template ID
provides:
  - RiuCreatedListener that queues access code email on RIU creation
  - Extended riu.created event with reporter fields for anonymous relay
affects: [42-04, 42-05, 42-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Event-driven notification dispatch via NestJS event-emitter
    - Delayed notification for timing attack prevention

key-files:
  created:
    - apps/backend/src/modules/notifications/listeners/riu.listener.ts
  modified:
    - apps/backend/src/modules/notifications/listeners/index.ts
    - apps/backend/src/modules/notifications/notifications.module.ts
    - apps/backend/src/modules/rius/rius.service.ts

key-decisions:
  - "RiuCreatedListener uses OrganizationService.getOrganization for org name (consistent with other notification patterns)"
  - "Event payload includes tenantSlug fetched at emit time to avoid extra DB call in listener"
  - "Email failures logged but not rethrown to prevent RIU creation failures"

patterns-established:
  - "RIU events include all context needed for downstream listeners (no re-fetching required)"

# Metrics
duration: 21min
completed: 2026-03-02
---

# Phase 42 Plan 03: Access Code Email Wiring Summary

**Event listener for RIU creation that queues access code email with configurable random delay using tenant relay settings**

## Performance

- **Duration:** 21 min
- **Started:** 2026-03-02T21:31:36Z
- **Completed:** 2026-03-02T21:52:42Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created RiuCreatedListener that responds to riu.created events
- Listener checks for both reporterEmail AND anonymousAccessCode before queueing email
- Uses DelayedNotificationService for privacy-preserving timing (1-6hr configurable delay)
- Extended riu.created event to include all fields needed for access code email (reporterEmail, anonymousAccessCode, reporterType, tenantSlug)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RIU created event listener for access code email** - `202eb54b` (feat)
2. **Task 2: Ensure RIU service emits riu.created event with all fields** - `b48e43ea` (feat)

## Files Created/Modified

- `apps/backend/src/modules/notifications/listeners/riu.listener.ts` - Event listener for RIU creation, queues access code email
- `apps/backend/src/modules/notifications/listeners/index.ts` - Barrel export for RiuCreatedListener
- `apps/backend/src/modules/notifications/notifications.module.ts` - Register listener and import OrganizationModule
- `apps/backend/src/modules/rius/rius.service.ts` - Extend riu.created event with reporter fields

## Decisions Made

- **OrganizationService.getOrganization for org name:** Used existing method rather than creating new one, maintains consistency with other notification listeners
- **tenantSlug fetched at emit time:** Fetching org slug in RiusService.create() before emitting event avoids duplicate DB call in listener
- **Email failure isolation:** Wrapped email queueing in try-catch to prevent notification failures from affecting RIU creation flow

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Access code email delivery is now wired up for RIU creation
- Ready for 42-04: Message notification wiring (when investigator sends message to reporter)
- Ready for 42-05: Anonymous messaging API endpoints
- Ready for 42-06: Reporter status portal UI

---
*Phase: 42-anonymous-communication-relay*
*Completed: 2026-03-02*
