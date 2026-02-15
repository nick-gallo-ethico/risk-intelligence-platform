---
phase: 31-code-quality-performance
plan: 09
subsystem: api
tags: [nestjs, service-decomposition, refactoring, cases, thin-coordinator]

# Dependency graph
requires:
  - phase: 31-07
    provides: Service decomposition patterns (ConflictDetectionService, DisclosuresService)
provides:
  - CaseQueryService for case query operations
  - CaseStatusService for status transitions
  - Thin coordinator pattern for CasesService
affects: [cases, case-management]

# Tech tracking
tech-stack:
  added: []
  patterns: [thin-coordinator-pattern, service-extraction, dependency-injection]

key-files:
  created:
    - apps/backend/src/modules/cases/services/case-query.service.ts
    - apps/backend/src/modules/cases/services/case-status.service.ts
  modified:
    - apps/backend/src/modules/cases/cases.service.ts
    - apps/backend/src/modules/cases/cases.module.ts
    - apps/backend/src/modules/cases/cases.service.spec.ts

key-decisions:
  - "CasesService retains create/update operations (core business logic)"
  - "Query delegation: findAll, findOne, findByReferenceNumber to CaseQueryService"
  - "Status delegation: updateStatus, close to CaseStatusService"
  - "Preserved all public API signatures - no breaking changes"

patterns-established:
  - "Thin coordinator pattern: Main service delegates to specialized sub-services"
  - "Sub-service naming: {Entity}{Operation}Service (e.g., CaseQueryService, CaseStatusService)"

# Metrics
duration: 20min
completed: 2026-02-15
---

# Phase 31 Plan 09: CasesService Decomposition Summary

**Decomposed CasesService (795 LOC) into thin coordinator (363 LOC) with CaseQueryService (405 LOC) and CaseStatusService (173 LOC)**

## Performance

- **Duration:** 20 min
- **Started:** 2026-02-15T02:53:41Z
- **Completed:** 2026-02-15T03:13:26Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Extracted query operations (findAll, findOne, findByReferenceNumber, full-text search) to CaseQueryService
- Extracted status operations (updateStatus, close, validateStatusTransition) to CaseStatusService
- Refactored CasesService as thin coordinator delegating to sub-services
- Updated all 32 unit tests to mock sub-services - all tests pass
- Reduced CasesService LOC by 54% (795 -> 363)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract CaseQueryService** - `170430a` (feat)
2. **Task 2: Extract CaseStatusService and refactor CasesService** - `ee94682` (feat)

## Files Created/Modified

- `apps/backend/src/modules/cases/services/case-query.service.ts` - Query operations with PostgreSQL full-text search
- `apps/backend/src/modules/cases/services/case-status.service.ts` - Status transitions and case closure
- `apps/backend/src/modules/cases/cases.service.ts` - Thin coordinator delegating to sub-services
- `apps/backend/src/modules/cases/cases.module.ts` - Added new services to providers and exports
- `apps/backend/src/modules/cases/cases.service.spec.ts` - Updated tests to mock sub-services
- `apps/backend/src/modules/rius/rius.service.ts` - Fixed missing imports (deviation)

## Decisions Made

- **CasesService retains create/update operations:** These are core business logic that coordinates multiple concerns (reference number generation, activity logging, event emission)
- **Query logic fully extracted:** All query methods including full-text search, HubSpot-style filter parsing, and orderBy clause building moved to CaseQueryService
- **Status logic fully extracted:** Status validation, transition handling, and closure moved to CaseStatusService
- **Preserved public API:** All method signatures unchanged - no breaking changes for consumers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed missing imports in rius.service.ts**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** rius.service.ts missing imports for `BadRequestException` and `getImmutableFieldsInObject`
- **Fix:** Added missing imports from `@nestjs/common` and `./types/riu.types`
- **Files modified:** apps/backend/src/modules/rius/rius.service.ts
- **Verification:** npm run typecheck passes
- **Committed in:** ee94682 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Pre-existing issue unrelated to CasesService refactoring. Fixed to unblock TypeScript compilation.

## Issues Encountered

- **CasesService final LOC (363) slightly above 300 target:** The update() method contains extensive field mapping logic (35+ conditional assignments). This is acceptable as the logic belongs in the coordinator and doesn't warrant further extraction.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gap closure plan 31-09 complete
- CasesService now follows thin coordinator pattern like RiusService and DisclosuresService
- Remaining gap closure plans: 31-10, 31-11 (if any)

---
*Phase: 31-code-quality-performance*
*Plan: 09*
*Completed: 2026-02-15*
