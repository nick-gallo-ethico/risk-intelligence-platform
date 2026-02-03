---
phase: 01-foundation-infrastructure
plan: 03
subsystem: audit
tags: [nestjs, prisma, event-emitter, audit-log, compliance, natural-language]

# Dependency graph
requires:
  - phase: 01-01
    provides: EventsModule with domain events for Case and Investigation
provides:
  - Unified AUDIT_LOG service with natural language descriptions
  - Event handlers for Case and Investigation mutations
  - Query API for audit log access
  - Role-based access control for audit endpoints
affects: [case-management, investigation, compliance-reporting, ai-context]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Event handler pattern with @OnEvent decorator"
    - "Natural language description builder for audit context"
    - "Async event handlers to avoid blocking main requests"
    - "Audit failures caught and logged, never crash main operations"

key-files:
  created:
    - apps/backend/src/modules/audit/audit.service.ts
    - apps/backend/src/modules/audit/audit-description.service.ts
    - apps/backend/src/modules/audit/handlers/case-audit.handler.ts
    - apps/backend/src/modules/audit/handlers/investigation-audit.handler.ts
    - apps/backend/src/modules/audit/audit.controller.ts
    - apps/backend/src/modules/audit/dto/audit-log-query.dto.ts
    - apps/backend/src/modules/audit/dto/audit-log-response.dto.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/app.module.ts

key-decisions:
  - "AuditModule is @Global() - AuditService injectable everywhere without explicit imports"
  - "Audit failures are caught and logged, never thrown - audit should never crash operations"
  - "Natural language descriptions built from user lookups for human-readable context"
  - "Role-based access: System Admin and Compliance Officer for general queries, Investigator for entity timelines"

patterns-established:
  - "Event handler pattern: Subscribe with @OnEvent, build description, call AuditService.log()"
  - "Description service pattern: Centralized natural language generation with actor name resolution"
  - "Audit log query pattern: Filter by entityType, entityId, actorUserId, actionCategory, date range"

# Metrics
duration: 4min
completed: 2026-02-03
---

# Phase 01 Plan 03: Unified Audit Logging Summary

**Unified AUDIT_LOG service with natural language descriptions, event handlers for Case/Investigation mutations, and role-based query API**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-03T01:50:54Z
- **Completed:** 2026-02-03T01:54:42Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- AuditLog schema with partitioning documentation and required indexes for compliance queries
- AuditService with description builder generating human-readable audit context
- Event handlers automatically capturing Case and Investigation mutations
- Query API with role-based access control for System Admin, Compliance Officer, and Investigator roles

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance AuditLog schema with partitioning indexes** - `523f4af` (chore)
2. **Task 2: Create AuditService with description builder** - `e24761e` (feat)
3. **Task 3: Create event handlers and controller** - `4b08219` (feat) + `5e7aaaf` (chore)

## Files Created/Modified

- `apps/backend/prisma/schema.prisma` - AuditLog model with partitioning docs, retention notes, and indexes
- `apps/backend/src/modules/audit/audit.module.ts` - @Global module exporting AuditService and AuditDescriptionService
- `apps/backend/src/modules/audit/audit.service.ts` - Core audit logging with create and query methods
- `apps/backend/src/modules/audit/audit-description.service.ts` - Natural language description builders
- `apps/backend/src/modules/audit/handlers/case-audit.handler.ts` - Case event handlers (created, updated, status_changed, assigned)
- `apps/backend/src/modules/audit/handlers/investigation-audit.handler.ts` - Investigation event handlers (created, status_changed, assigned)
- `apps/backend/src/modules/audit/audit.controller.ts` - Query endpoints with role-based guards
- `apps/backend/src/modules/audit/dto/audit-log-query.dto.ts` - Query parameters with validation
- `apps/backend/src/modules/audit/dto/audit-log-response.dto.ts` - Response DTOs
- `apps/backend/src/app.module.ts` - AuditModule registration

## Decisions Made

- **AuditModule is @Global():** Like EventsModule, AuditService is needed across all modules without explicit imports
- **Audit failures non-blocking:** Errors are caught and logged but never thrown - audit should never crash main operations
- **Async event handlers:** All @OnEvent handlers run with `{ async: true }` to avoid blocking request processing
- **Actor name denormalization:** Natural language descriptions resolve user IDs to names for human readability
- **Role-based query access:** General audit queries restricted to System Admin and Compliance Officer; entity timelines also available to Investigators viewing their assigned cases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AuditModule fully operational and subscribing to domain events
- Ready for additional event handlers as new entity types are implemented
- Foundation for compliance reporting and AI context building established
- Query API ready for integration with admin dashboards

---
*Phase: 01-foundation-infrastructure*
*Completed: 2026-02-03*
