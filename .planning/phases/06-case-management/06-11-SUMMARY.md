---
phase: 06-case-management
plan: 11
subsystem: api
tags: [activity, timeline, audit, aggregation]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: AuditLog model and audit logging infrastructure
provides:
  - Activity timeline aggregation from audit logs
  - Related entity timeline inclusion (Case -> Investigation)
  - User's recent activity retrieval
affects: [07-notifications-email, 09-analytics-reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Related entity lookup for timeline aggregation
    - Paginated timeline with hasMore indicator

key-files:
  created:
    - apps/backend/src/modules/activity/activity-timeline.service.ts
    - apps/backend/src/modules/activity/activity-timeline.controller.ts
    - apps/backend/src/modules/activity/activity.module.ts
    - apps/backend/src/modules/activity/dto/timeline-query.dto.ts
    - apps/backend/src/modules/activity/dto/timeline-response.dto.ts
    - apps/backend/src/modules/activity/dto/index.ts
    - apps/backend/src/modules/activity/index.ts
  modified:
    - apps/backend/src/app.module.ts

key-decisions:
  - "Separate ActivityTimelineModule from common ActivityModule for timeline aggregation"
  - "Related entity lookup uses ENTITY_RELATIONSHIPS map for flexible configuration"
  - "Paginated responses include hasMore boolean for efficient UI pagination"

patterns-established:
  - "Timeline aggregation: Query multiple entity types and merge results chronologically"
  - "Related entity inclusion: Case timelines automatically include Investigation activities"

# Metrics
duration: 20min
completed: 2026-02-04
---

# Phase 6 Plan 11: Activity Timeline Summary

**Activity timeline service aggregating audit events into unified timelines with related entity inclusion for Cases and Investigations**

## Performance

- **Duration:** 20 min
- **Started:** 2026-02-04T00:01:29Z
- **Completed:** 2026-02-04T00:21:29Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- ActivityTimelineService for unified entity timelines from AuditLog
- Related entity inclusion (Case timeline includes Investigation activities)
- User's recent activity endpoint for "My Work" panels
- REST endpoints at /api/v1/activity with pagination and date filtering

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ActivityTimelineService** - `a1bb892` (feat)
2. **Task 2: Create Activity Controller and Module** - `7836ee7` (feat)

## Files Created/Modified

- `apps/backend/src/modules/activity/activity-timeline.service.ts` - Timeline aggregation from audit logs with related entity inclusion
- `apps/backend/src/modules/activity/activity-timeline.controller.ts` - REST endpoints for timeline retrieval
- `apps/backend/src/modules/activity/activity.module.ts` - Module registration
- `apps/backend/src/modules/activity/dto/timeline-query.dto.ts` - Query parameters for pagination and filtering
- `apps/backend/src/modules/activity/dto/timeline-response.dto.ts` - Response DTOs for timeline entries
- `apps/backend/src/modules/activity/dto/index.ts` - DTO exports
- `apps/backend/src/modules/activity/index.ts` - Module exports
- `apps/backend/src/app.module.ts` - Added ActivityTimelineModule import

## Decisions Made

1. **Separate module from common ActivityModule** - The common ActivityModule handles activity logging (writes), while ActivityTimelineModule handles timeline retrieval (reads). This separation follows single responsibility principle.

2. **ENTITY_RELATIONSHIPS partial map** - Using Partial<Record> instead of full Record to avoid having to enumerate every AuditEntityType. Only entity types with relationships need entries.

3. **hasMore pagination indicator** - Using boolean hasMore instead of calculating nextPage URL for simpler client-side pagination logic.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None during activity module implementation.

Note: An unrelated build error exists in the notifications module (`email-template.service.ts`), but this does not affect the activity timeline module which compiles correctly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Activity timeline service ready for use in Case and Investigation detail views
- Ready for integration with frontend activity panels
- Related entity lookup pattern can be extended for other entity relationships

---
*Phase: 06-case-management*
*Completed: 2026-02-04*
