---
phase: 06-case-management
plan: 10
subsystem: search
tags: [elasticsearch, unified-search, custom-properties, multi-entity]

# Dependency graph
requires:
  - phase: 06-05
    provides: Custom property definitions for entity types
  - phase: 01-06
    provides: Base SearchService and IndexingService infrastructure
provides:
  - UnifiedSearchService for cross-entity search
  - Investigation and Person ES index mappings
  - Custom fields support in all index mappings
  - GET /api/v1/search/unified endpoint
affects: [07-analytics-reporting, 08-employee-chatbot, 14-search-discovery]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Parallel search execution per entity type
    - Dynamic ES mapping for custom fields
    - Entity-type-specific search field weighting

key-files:
  created:
    - apps/backend/src/modules/search/unified-search.service.ts
    - apps/backend/src/modules/search/indexing/index-mappings/investigation.mapping.ts
    - apps/backend/src/modules/search/indexing/index-mappings/person.mapping.ts
  modified:
    - apps/backend/src/modules/search/search.controller.ts
    - apps/backend/src/modules/search/search.module.ts
    - apps/backend/src/modules/search/indexing/indexing.service.ts
    - apps/backend/src/modules/search/indexing/index-mappings/case.mapping.ts
    - apps/backend/src/modules/search/indexing/index-mappings/riu.mapping.ts
    - apps/backend/src/modules/search/indexing/index-mappings/index.ts
    - apps/backend/src/modules/search/index.ts

key-decisions:
  - "Parallel search execution for all entity types in single call"
  - "Custom fields use dynamic ES mapping with type conversion"
  - "Results grouped by entity type with 10 hits per type default"
  - "Entity-specific search field weights (e.g., referenceNumber^10)"

patterns-established:
  - "UnifiedSearchService pattern for cross-entity search"
  - "ES field type mapping from CustomPropertyDefinition data types"
  - "Graceful degradation when indices don't exist"

# Metrics
duration: 17min
completed: 2026-02-04
---

# Phase 6 Plan 10: Unified Search Service Summary

**Cross-entity search service enabling single API call to search Cases, RIUs, Investigations, and Persons with custom field support and permission filtering**

## Performance

- **Duration:** 17 min
- **Started:** 2026-02-04T00:04:36Z
- **Completed:** 2026-02-04T00:21:04Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Created UnifiedSearchService for cross-entity search with parallel execution
- Added Investigation and Person ES index mappings with compliance analyzers
- Added customFields dynamic object to all entity index mappings
- Created GET /api/v1/search/unified endpoint with entity type filtering
- Added updateCustomFieldMapping() for runtime mapping updates

## Task Commits

Each task was committed atomically:

1. **Task 1: Create UnifiedSearchService** - `fd7c7c9` (feat)
2. **Task 2: Add Custom Fields to ES Index Mappings** - `0a77774` (feat)
3. **Task 3: Add Unified Search Endpoint** - `039ec58` (feat)

## Files Created/Modified

**Created:**
- `apps/backend/src/modules/search/unified-search.service.ts` - Cross-entity search service with parallel execution
- `apps/backend/src/modules/search/indexing/index-mappings/investigation.mapping.ts` - ES mapping for Investigation documents
- `apps/backend/src/modules/search/indexing/index-mappings/person.mapping.ts` - ES mapping for Person documents

**Modified:**
- `apps/backend/src/modules/search/search.controller.ts` - Added unified search endpoint
- `apps/backend/src/modules/search/search.module.ts` - Registered UnifiedSearchService
- `apps/backend/src/modules/search/indexing/indexing.service.ts` - Added new mappings and custom field support
- `apps/backend/src/modules/search/indexing/index-mappings/case.mapping.ts` - Added customFields property
- `apps/backend/src/modules/search/indexing/index-mappings/riu.mapping.ts` - Added customFields property
- `apps/backend/src/modules/search/indexing/index-mappings/index.ts` - Export new mappings
- `apps/backend/src/modules/search/index.ts` - Export UnifiedSearchService and types

## Decisions Made

1. **Parallel search execution**: All entity type searches run in parallel using Promise.all() for optimal performance
2. **Custom fields use dynamic mapping**: ES dynamic object type allows any custom property structure without pre-defining schema
3. **Entity-specific field weights**: Each entity type has tailored search field weights (e.g., referenceNumber^10 for exact matches)
4. **Graceful index handling**: Missing indices return empty results rather than errors (tenant may not have data yet)
5. **Default 10 results per type**: Balances response size with useful results; configurable via limit param

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Unified search service ready for frontend integration
- Custom property values will be searchable once indexed
- Investigation and Person indexing handlers needed (separate plan)
- Permission filtering for Investigation/Person entities may need enhancement

---
*Phase: 06-case-management*
*Completed: 2026-02-04*
