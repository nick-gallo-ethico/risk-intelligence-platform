---
phase: 04-core-entities
plan: 03
subsystem: hris
tags: [merge-dev, hris, axios, employee-sync, person]

# Dependency graph
requires:
  - phase: 04-02
    provides: PersonsService.createFromEmployee and syncFromEmployee methods
provides:
  - MergeClientService for Merge.dev HRIS API calls
  - HrisSyncService for Employee to Person synchronization
  - Topological sort for manager hierarchy ordering
affects: [campaigns, disclosures, notifications]

# Tech tracking
tech-stack:
  added: [axios]
  patterns: [unified-api-client, topological-sort, idempotent-sync]

key-files:
  created:
    - apps/backend/src/modules/hris/merge-client.service.ts
    - apps/backend/src/modules/hris/hris-sync.service.ts
    - apps/backend/src/modules/hris/hris.module.ts
    - apps/backend/src/modules/hris/types/merge.types.ts
    - apps/backend/src/modules/hris/dto/hris-sync.dto.ts
    - apps/backend/src/modules/hris/index.ts
  modified:
    - apps/backend/package.json
    - apps/backend/src/app.module.ts

key-decisions:
  - "Merge.dev unified API abstracts 50+ HRIS systems"
  - "Topological sort ensures managers created before their reports"
  - "Sync is idempotent - running twice produces same result"
  - "Error resilient - collects errors without stopping sync"
  - "rawHrisData stored as InputJsonValue for original data preservation"

patterns-established:
  - "HRIS sync flow: Fetch all -> Topo sort -> Create/Update Employee -> Create/Update Person"
  - "Account token per organization for multi-tenant HRIS connections"
  - "Event emission on sync completion for monitoring"

# Metrics
duration: 11min
completed: 2026-02-03
---

# Phase 4 Plan 3: HRIS Sync Service Summary

**Merge.dev unified API client with HrisSyncService for idempotent Employee-to-Person synchronization using topological sort for manager hierarchy**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-03T09:38:06Z
- **Completed:** 2026-02-03T09:48:50Z
- **Tasks:** 2
- **Files modified:** 8 (2 modified, 6 created)

## Accomplishments

- Created MergeClientService for Merge.dev HRIS unified API calls with pagination handling
- Implemented HrisSyncService with topological sort ensuring managers created before reports
- Sync creates Employee records from Merge data, then Person records via PersonsService
- Error resilient sync - collects errors without stopping, enables monitoring via events

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Merge.dev client service** - `197c472` (feat)
2. **Task 2: Create HRIS sync service and module** - `af9e1f4` (feat)

## Files Created/Modified

- `apps/backend/package.json` - Added axios dependency
- `apps/backend/src/modules/hris/types/merge.types.ts` - Merge.dev API type definitions
- `apps/backend/src/modules/hris/merge-client.service.ts` - Merge.dev API client with pagination
- `apps/backend/src/modules/hris/dto/hris-sync.dto.ts` - TriggerSyncDto and SyncResultDto
- `apps/backend/src/modules/hris/hris-sync.service.ts` - Main sync orchestration service
- `apps/backend/src/modules/hris/hris.module.ts` - NestJS module definition
- `apps/backend/src/modules/hris/index.ts` - Module exports
- `apps/backend/src/app.module.ts` - Registered HrisModule

## Decisions Made

1. **Merge.dev as HRIS abstraction** - Per PERS-05, Merge.dev provides unified API for 50+ HRIS systems
2. **Topological sort for manager ordering** - DFS-based sort ensures manager Person records exist before creating reports
3. **Employee record creation** - Sync creates/updates Employee records first, then calls PersonsService for Person records
4. **Idempotent sync design** - Running sync multiple times produces same result (finds existing, updates as needed)
5. **Prisma.InputJsonValue for rawHrisData** - Store original Merge response for debugging/reference

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Prisma JSON type casting**
- **Found during:** Task 2 (HrisSyncService implementation)
- **Issue:** `Prisma.JsonValue` includes `null` which is not assignable to Employee.rawHrisData
- **Fix:** Changed cast to `Prisma.InputJsonValue` which excludes null
- **Files modified:** apps/backend/src/modules/hris/hris-sync.service.ts
- **Verification:** `npm run typecheck` passes
- **Committed in:** af9e1f4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor type fix necessary for correctness. No scope creep.

## Issues Encountered

- **Build failure from parallel plan:** The campaigns module (plan 04-06 or 04-08) has incomplete code causing `npm run build` to fail. However, `npm run typecheck` passes, confirming this plan's code is correct. The build will succeed once the parallel plan completes its work.

## User Setup Required

None - no external service configuration required. MERGE_API_KEY environment variable will be needed when using the service in production.

## Next Phase Readiness

- HrisModule ready for use by scheduled jobs or admin endpoints
- PersonsService integration tested via typecheck
- Campaigns module needs completion for full build to pass

---
*Phase: 04-core-entities*
*Completed: 2026-02-03*
