---
phase: 04-core-entities
plan: 07
subsystem: cases
tags: [prisma, pipeline, merge, case-management, workflow]

# Dependency graph
requires:
  - phase: 04-01
    provides: Person entity with anonymous placeholder pattern
provides:
  - Case pipeline stage management
  - Case outcome tracking (SUBSTANTIATED, UNSUBSTANTIATED, etc.)
  - Case merge with tombstone pattern
  - Classification correction tracking (distinct from RIU)
affects: [04-08, 04-09, case-management, investigations, workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Tombstone pattern for merged cases (isMerged flag)
    - Classification correction tracking (Case differs from RIU)
    - Pipeline stage audit trail

key-files:
  created:
    - apps/backend/src/modules/cases/case-pipeline.service.ts
    - apps/backend/src/modules/cases/case-merge.service.ts
    - apps/backend/src/modules/cases/dto/merge-case.dto.ts
    - apps/backend/prisma/migrations/20260203092755_add_case_pipeline_and_merge/migration.sql
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/cases/cases.module.ts
    - apps/backend/src/modules/cases/dto/index.ts

key-decisions:
  - "CaseOutcome enum: SUBSTANTIATED, UNSUBSTANTIATED, INCONCLUSIVE, POLICY_VIOLATION, NO_VIOLATION"
  - "Classification on Case can differ from RIU - corrections tracked with notes, timestamp, user"
  - "Merged cases become tombstones with isMerged=true, CLOSED status, mergedIntoCaseId pointer"
  - "RIU associations change to MERGED_FROM type when merged"
  - "Pipeline stages are tenant-configurable strings (pipelineStage field)"

patterns-established:
  - "Tombstone pattern: Merged entities are never deleted, marked with isMerged flag"
  - "Correction tracking: Changes from source record tracked with notes, timestamp, user"
  - "Atomic merge: All associations moved in single transaction"

# Metrics
duration: 14min
completed: 2026-02-03
---

# Phase 4 Plan 07: Case Pipeline and Merge Support Summary

**Case workflow stages with configurable pipeline, outcome tracking, and atomic merge operations with tombstone pattern**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-03T09:17:34Z
- **Completed:** 2026-02-03T09:31:01Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- CaseOutcome enum for standard investigation outcomes
- CasePipelineService for stage management, outcomes, and classification corrections
- CaseMergeService with atomic merge and tombstone pattern
- Full audit trail for all pipeline and merge operations

## Task Commits

Each task was committed atomically:

1. **Task 1: Add pipeline and merge fields to Case model** - `8c4e574` (feat)
2. **Task 2: Create CasePipelineService and CaseMergeService** - `12d2836` (feat)
3. **Task 3: Run migration for Case enhancements** - `3c1b3a0` (chore)

## Files Created/Modified

- `apps/backend/prisma/schema.prisma` - CaseOutcome enum, pipeline fields, merge fields, new indexes
- `apps/backend/src/modules/cases/case-pipeline.service.ts` - Stage management, outcome setting, classification updates
- `apps/backend/src/modules/cases/case-merge.service.ts` - Atomic merge, merge history, primary case resolution
- `apps/backend/src/modules/cases/dto/merge-case.dto.ts` - MergeCaseDto, MergeResultDto, MergeHistoryDto
- `apps/backend/src/modules/cases/cases.module.ts` - Register new services
- `apps/backend/src/modules/cases/dto/index.ts` - Export new DTOs
- `apps/backend/prisma/migrations/20260203092755_add_case_pipeline_and_merge/migration.sql` - Database migration

## Decisions Made

1. **CaseOutcome values**: SUBSTANTIATED, UNSUBSTANTIATED, INCONCLUSIVE, POLICY_VIOLATION, NO_VIOLATION - covers standard investigation outcomes
2. **Classification correction pattern**: Case classification can differ from RIU; corrections tracked with classificationNotes, classificationChangedAt, classificationChangedById
3. **Tombstone pattern for merges**: Merged cases are never deleted - isMerged=true, status=CLOSED, mergedIntoCaseId points to primary
4. **RIU association type change**: When merged, RIU associations change to MERGED_FROM type
5. **Pipeline stages as strings**: Tenant-configurable via pipelineStage string field (not enum) for flexibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Migration failed initially because columns already existed in database (from parallel execution)
- Resolved by marking migration as applied since schema was already current

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Case pipeline and merge support complete
- Ready for Case-Person linking (04-08) and workflow integration
- CasePipelineService exported for use by other modules
- CaseMergeService handles full audit trail for compliance

---
*Phase: 04-core-entities*
*Completed: 2026-02-03*
