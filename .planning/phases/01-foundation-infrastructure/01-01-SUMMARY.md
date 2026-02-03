---
phase: 01-foundation-infrastructure
plan: 01
subsystem: events
tags: [nestjs, event-emitter, events, event-driven, async]

# Dependency graph
requires: []
provides:
  - Global EventsModule with EventEmitterModule.forRoot()
  - BaseEvent class with organizationId for tenant isolation
  - Case domain events (created, updated, status_changed, assigned)
  - Investigation domain events (created, status_changed, assigned)
  - Pattern for event emission in service layer
affects:
  - 01-02 (audit logging module will subscribe to events)
  - 01-03 (search indexing will subscribe to events)
  - 01-04 (notifications will subscribe to events)
  - All future modules needing event-driven integration

# Tech tracking
tech-stack:
  added:
    - "@nestjs/event-emitter@^3.0.1"
  patterns:
    - Event-driven architecture with dot-notation event names
    - BaseEvent class with mandatory organizationId
    - Fire-and-forget event emission with error resilience

key-files:
  created:
    - apps/backend/src/modules/events/events.module.ts
    - apps/backend/src/modules/events/events/base.event.ts
    - apps/backend/src/modules/events/events/case.events.ts
    - apps/backend/src/modules/events/events/investigation.events.ts
    - apps/backend/src/modules/events/events/index.ts
  modified:
    - apps/backend/src/app.module.ts
    - apps/backend/src/modules/cases/cases.service.ts
    - apps/backend/package.json

key-decisions:
  - "EventsModule is @Global() so EventEmitter2 is injectable everywhere without re-importing"
  - "Dot-notation event names (case.created) enable wildcard subscriptions (case.*)"
  - "BaseEvent requires organizationId - enforces tenant isolation at event level"
  - "Event emission wrapped in try-catch - request success independent of event delivery"

patterns-established:
  - "Event naming: domain.action (e.g., case.created, investigation.assigned)"
  - "Event classes extend BaseEvent with static readonly eventName"
  - "emitEvent() helper wraps emission with error handling and logging"
  - "Events emitted AFTER successful DB write, not before"

# Metrics
duration: 8min
completed: 2026-02-03
---

# Phase 1 Plan 01: Event Bus Infrastructure Summary

**Global event bus with @nestjs/event-emitter enabling loose coupling between modules through typed domain events**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-03T00:56:32Z
- **Completed:** 2026-02-03T01:04:27Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Installed @nestjs/event-emitter with wildcard support and dot-notation delimiters
- Created BaseEvent class enforcing tenant isolation (organizationId required)
- Defined 7 domain events: 4 Case events + 3 Investigation events
- Integrated event emission into CasesService with fire-and-forget pattern
- Established error-resilient emission pattern that never crashes request handling

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @nestjs/event-emitter and create EventsModule** - `44970d2` (feat)
2. **Task 2: Create base event class and domain events** - `1db3f1b` (feat)
3. **Task 3: Register EventsModule and add event emission to CasesService** - `d426541` (feat)

## Files Created/Modified

**Created:**
- `apps/backend/src/modules/events/events.module.ts` - Global module with EventEmitterModule.forRoot()
- `apps/backend/src/modules/events/events/base.event.ts` - Base class with organizationId, actorUserId, actorType, timestamp, correlationId
- `apps/backend/src/modules/events/events/case.events.ts` - CaseCreatedEvent, CaseUpdatedEvent, CaseStatusChangedEvent, CaseAssignedEvent
- `apps/backend/src/modules/events/events/investigation.events.ts` - InvestigationCreatedEvent, InvestigationStatusChangedEvent, InvestigationAssignedEvent
- `apps/backend/src/modules/events/events/index.ts` - Barrel export for all events

**Modified:**
- `apps/backend/src/app.module.ts` - Registered EventsModule as first module after ConfigModule
- `apps/backend/src/modules/cases/cases.service.ts` - Added EventEmitter2 injection and event emission on create/update/status_change
- `apps/backend/package.json` - Added @nestjs/event-emitter dependency

## Decisions Made

1. **@Global() module** - EventsModule is global so EventEmitter2 can be injected anywhere without explicit imports
2. **Dot-notation event names** - Using 'case.created' format enables wildcard subscriptions like 'case.*'
3. **BaseEvent with required organizationId** - Enforces tenant isolation at the event level, not just service level
4. **ActorType enum** - Distinguishes USER, SYSTEM, AI, INTEGRATION, ANONYMOUS for audit clarity
5. **Fire-and-forget with try-catch** - Event emission never blocks or fails the HTTP request

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Audit logging module (01-02) can subscribe to all domain events
- Search indexing module can subscribe for re-indexing on changes
- Notifications module can subscribe for user alerts
- Workflow engine can subscribe for status transitions

**Pattern established for other services:**
```typescript
// Inject EventEmitter2
constructor(private readonly eventEmitter: EventEmitter2) {}

// Emit after successful DB write
this.emitEvent(CaseCreatedEvent.eventName, new CaseCreatedEvent({
  organizationId,
  actorUserId,
  actorType: 'USER',
  caseId,
  // ... domain-specific fields
}));
```

---
*Phase: 01-foundation-infrastructure*
*Completed: 2026-02-03*
