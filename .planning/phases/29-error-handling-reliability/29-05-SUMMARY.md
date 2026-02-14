# Phase 29 Plan 05: NestJS HTTP Exceptions Summary

## Metadata

```yaml
phase: 29
plan: 05
completed: 2026-02-14
duration: ~15 minutes (verification only - implementation pre-existing)
subsystem: error-handling
tags: [nestjs, exceptions, http-status, error-codes, ERR-01]

dependency-graph:
  requires: []
  provides:
    - Typed NestJS HTTP exceptions in service/controller files
    - Proper HTTP status codes via global exception filter
  affects:
    - API response codes
    - Client error handling

tech-stack:
  patterns:
    - NestJS HTTP exception classes
    - Global exception filter integration

key-files:
  modified:
    - apps/backend/src/modules/notifications/services/email-template.service.ts
    - apps/backend/src/modules/reporting/report-template.service.ts
    - apps/backend/src/modules/ai/services/prompt.service.ts
    - apps/backend/src/modules/messaging/messaging.controller.ts
    - apps/backend/src/modules/tables/user-table.controller.ts
    - apps/backend/src/modules/analytics/ai-query/ai-query.service.ts
    - apps/backend/src/modules/analytics/exports/pdf-generator.service.ts
    - apps/backend/src/modules/portals/employee/manager-proxy.service.ts
    - apps/backend/src/modules/rius/riu-access.service.ts
    - apps/backend/src/modules/notifications/services/notification.service.ts

decisions:
  - id: "exception-mapping"
    context: "Map error contexts to appropriate HTTP status codes"
    chosen: "Context-specific mapping"
    rationale: "404 for not found, 400 for validation, 403 for forbidden, 500 for internal, 503 for unavailable"
  - id: "event-class-exceptions"
    context: "Event class constructor throws"
    chosen: "Retain bare throws"
    rationale: "Internal validation, not HTTP requests - covered by handler try-catch in plan 29-02"

metrics:
  files_modified: 10
  bare_throws_replaced: 17
```

## One-liner

Replaced bare `throw new Error()` with NestJS HTTP exceptions across 10 service/controller files for proper HTTP status codes.

## Summary

This plan addresses ERR-01 from the code review audit: bare `throw new Error()` bypasses NestJS exception filters, returning generic 500 errors instead of semantic HTTP status codes.

**Note:** The implementation was completed during plan 29-04 execution as a deviation (proactive fix). This summary documents the completed work.

### Exception Mapping Applied

| Error Context            | NestJS Exception               | HTTP Status |
| ------------------------ | ------------------------------ | ----------- |
| Resource not found       | `NotFoundException`            | 404         |
| Invalid input/validation | `BadRequestException`          | 400         |
| Permission denied        | `ForbiddenException`           | 403         |
| Service unavailable      | `ServiceUnavailableException`  | 503         |
| Internal/unexpected      | `InternalServerErrorException` | 500         |

### Files Modified

1. **email-template.service.ts** (5 instances)
   - `NotFoundException` for missing templates
   - `BadRequestException` for invalid MJML

2. **report-template.service.ts** (4 instances)
   - `ForbiddenException` for system/cross-org template modification
   - Uses existing `NotFoundException`

3. **prompt.service.ts** (3 instances)
   - `NotFoundException` for missing templates and versions

4. **messaging.controller.ts** (2 instances)
   - `BadRequestException` for invalid access code format

5. **user-table.controller.ts** (1 instance)
   - `InternalServerErrorException` for export content failure

6. **ai-query.service.ts** (1 instance)
   - `BadRequestException` for invalid entity type

7. **pdf-generator.service.ts** (1 instance)
   - `ServiceUnavailableException` for Puppeteer not initialized

8. **manager-proxy.service.ts** (1 instance)
   - `InternalServerErrorException` for access code generation failure

9. **riu-access.service.ts** (1 instance)
   - `InternalServerErrorException` for access code generation failure

10. **notification.service.ts** (1 instance)
    - `NotFoundException` for notification not found

### Intentionally Unchanged

**policy-case-association.service.ts** has 7 `throw new Error()` statements in event class constructors (`PolicyLinkedToCaseEvent`, `PolicyUnlinkedFromCaseEvent`). These are **intentional** for internal validation and are not HTTP requests. Handler-level try-catch (plan 29-02) covers these cases.

## Verification Results

```bash
# All service/controller files have 0 bare throws
grep -c "throw new Error" email-template.service.ts  # 0
grep -c "throw new Error" report-template.service.ts  # 0
grep -c "throw new Error" prompt.service.ts           # 0
grep -c "throw new Error" messaging.controller.ts     # 0
grep -c "throw new Error" user-table.controller.ts    # 0
grep -c "throw new Error" ai-query.service.ts         # 0
grep -c "throw new Error" pdf-generator.service.ts    # 0
grep -c "throw new Error" manager-proxy.service.ts    # 0
grep -c "throw new Error" riu-access.service.ts       # 0
grep -c "throw new Error" notification.service.ts     # 0

# Event class constructors retain bare throws (intentional)
grep -c "throw new Error" policy-case-association.service.ts  # 7 (all in event classes)

# TypeScript compiles
npx tsc --noEmit  # Success
```

## Commits

Implementation was done during plan 29-04 execution:

- `8d24ec4`: Primary implementation (messaging.controller.ts and others)
- `520bc35`: Additional implementation (prompt.service.ts and others)

## Deviations from Plan

**Deviation (Rule 3 - Blocking):** Implementation was completed during plan 29-04 execution as a proactive fix. This plan execution was verification-only with summary creation.

## Next Phase Readiness

Phase 29 (Error Handling & Reliability) is now complete with all 5 plans executed:

- 29-01: Service-level reliability improvements
- 29-02: Event handler error boundaries
- 29-03: Frontend error boundaries
- 29-04: Frontend error surfacing
- 29-05: NestJS HTTP exceptions (this plan)

Ready for Phase 30 (Test Coverage Foundation).
