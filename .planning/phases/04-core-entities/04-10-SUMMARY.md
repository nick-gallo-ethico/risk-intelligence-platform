---
phase: 04-core-entities
plan: 10
subsystem: search
tags: [elasticsearch, pattern-detection, associations, nested-queries]

# Dependency graph
requires:
  - phase: 04-09
    provides: Association entity models (PersonCaseAssociation, RiuCaseAssociation, CaseCaseAssociation)
  - phase: 01-06
    provides: Elasticsearch indexing infrastructure
provides:
  - PatternDetectionService for cross-case pattern queries
  - Case index mapping with nested associations
  - History badge API for triage view
  - Association change event handlers for re-indexing
affects: [05-ai-infrastructure, 06-case-management, analytics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ES nested queries for multi-field boolean matching
    - Denormalized associations for sub-second pattern queries
    - Event-driven re-indexing on association changes

key-files:
  created:
    - apps/backend/src/modules/associations/pattern-detection/pattern-detection.service.ts
    - apps/backend/src/modules/associations/pattern-detection/pattern-detection.controller.ts
    - apps/backend/src/modules/associations/pattern-detection/index.ts
  modified:
    - apps/backend/src/modules/search/indexing/index-mappings/case.mapping.ts
    - apps/backend/src/modules/search/indexing/index-mappings/index.ts
    - apps/backend/src/modules/search/indexing/indexing.service.ts

key-decisions:
  - "Nested ES type for associations.persons enables complex boolean queries"
  - "Flattened arrays (personIds, subjectPersonIds) duplicate data for efficient faceting"
  - "History badge uses Prisma count query on PersonRiuAssociation (not ES)"
  - "Event-driven re-indexing keeps ES in sync with association changes"

patterns-established:
  - "Pattern detection via ES nested queries: nested.*associations.persons"
  - "Denormalized associations in ES index for sub-second queries"
  - "OnEvent handlers for automatic re-indexing"

# Metrics
duration: 14min
completed: 2026-02-03
---

# Phase 04 Plan 10: Pattern Detection and Association Denormalization Summary

**PatternDetectionService with ES-based cross-case queries and Case index mapping with nested associations for "wow moment" demos**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-03T09:56:06Z
- **Completed:** 2026-02-03T10:10:13Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Case index mapping updated with nested associations (persons, rius, linkedCases) for pattern detection
- PatternDetectionService provides the "wow moment" queries per CONTEXT.md
- IndexingService enhanced to denormalize associations when indexing Cases
- Event handlers auto-re-index Cases when associations change

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Case index mapping with association denormalization** - `ed78895` (feat)
2. **Task 2: Create PatternDetectionService** - `b5d146c` (feat)
3. **Task 3: Update IndexingService to include associations when indexing Cases** - `096125b` (feat)

## Files Created/Modified

- `apps/backend/src/modules/search/indexing/index-mappings/case.mapping.ts` - Added nested associations.persons/rius/linkedCases and CaseDocument type
- `apps/backend/src/modules/associations/pattern-detection/pattern-detection.service.ts` - ES-based pattern detection queries
- `apps/backend/src/modules/associations/pattern-detection/pattern-detection.controller.ts` - REST endpoints for pattern queries
- `apps/backend/src/modules/search/indexing/indexing.service.ts` - Association denormalization and event handlers

## Decisions Made

1. **Nested ES type for associations** - Enables complex boolean queries like "Person A as SUBJECT AND Person B as WITNESS" where each condition evaluates within the same association record
2. **Duplicate data in flattened arrays** - personIds[], subjectPersonIds[], etc. allow simple term queries and efficient aggregations without nested query overhead
3. **History badge via Prisma** - getReporterHistory uses direct Prisma count query (faster than ES for simple counts, always current)
4. **Event-driven re-indexing** - OnEvent handlers for association changes queue re-index jobs rather than inline updates

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Prisma OR2 syntax error in person-person-association.service.ts**
- **Found during:** Task 2 (build verification)
- **Issue:** 04-09 agent used invalid `OR2:` syntax which doesn't exist in Prisma
- **Fix:** Changed to valid `AND: [{ OR: [...] }]` pattern for multiple OR conditions
- **Files modified:** apps/backend/src/modules/associations/person-person/person-person-association.service.ts
- **Verification:** Build passes
- **Committed in:** b5d146c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking issue from parallel plan)
**Impact on plan:** Necessary fix to unblock build. No scope creep.

## Issues Encountered

- ES v9 SDK uses flattened params (no `body:` wrapper) - adjusted search calls to match existing SearchService pattern

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Pattern detection foundation complete for AI-powered insights (Phase 5)
- Cross-case pattern queries ready for Case Management UI (Phase 6)
- Denormalized associations indexed for sub-second search response

---
*Phase: 04-core-entities*
*Completed: 2026-02-03*
