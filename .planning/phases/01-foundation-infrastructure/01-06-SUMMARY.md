---
phase: 01-foundation-infrastructure
plan: 06
subsystem: search
tags: [elasticsearch, search, indexing, permissions, nestjs]

# Dependency graph
requires:
  - phase: 01-01
    provides: EventsModule for case.created/updated events
  - phase: 01-02
    provides: JobsModule with indexing queue
provides:
  - Elasticsearch integration with per-tenant indices
  - Async indexing pipeline via job queue
  - Permission-filtered search queries
  - Fuzzy matching with compliance synonyms
  - Highlighting and faceted aggregations
affects: [case-management, riu-intake, policy-management, analytics-reporting]

# Tech tracking
tech-stack:
  added: ["@nestjs/elasticsearch", "@elastic/elasticsearch"]
  patterns: ["per-tenant-indices", "permission-filter-at-query-time", "async-indexing"]

key-files:
  created:
    - apps/backend/src/modules/search/search.module.ts
    - apps/backend/src/modules/search/search.service.ts
    - apps/backend/src/modules/search/search.controller.ts
    - apps/backend/src/modules/search/indexing/indexing.service.ts
    - apps/backend/src/modules/search/query/permission-filter.service.ts
  modified:
    - apps/backend/src/app.module.ts
    - apps/backend/src/config/configuration.ts
    - apps/backend/src/modules/jobs/processors/indexing.processor.ts

key-decisions:
  - "Per-tenant index naming: org_{organizationId}_{entityType}"
  - "Permission filters injected at ES query time, not post-filtered"
  - "500ms search timeout per CONTEXT.md requirements"
  - "Compliance synonyms: harassment->bullying, fraud->deception, etc."

patterns-established:
  - "Per-tenant index pattern: getIndexName(orgId, entityType)"
  - "Permission filter pattern: buildPermissionFilter(ctx, entityType)"
  - "Async indexing: event -> queue -> processor -> ES"
  - "Role-based search visibility: admin=all, investigator=assigned, employee=own"

# Metrics
duration: 12min
completed: 2026-02-03
---

# Phase 01 Plan 06: Elasticsearch Integration Summary

**Per-tenant Elasticsearch indices with permission-filtered search, fuzzy matching, and async indexing via BullMQ queue**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-03T05:30:00Z
- **Completed:** 2026-02-03T05:42:00Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments
- Elasticsearch packages installed and configured in docker-compose
- Per-tenant indices with compliance synonyms analyzer (harassment, fraud, etc.)
- IndexingService with async queue integration for eventual consistency (2-5s)
- PermissionFilterService implementing role-based search (CRITICAL for security)
- SearchService with fuzzy matching, highlighting, and faceted aggregations
- Search API endpoint at GET /api/v1/search with 500ms timeout

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Elasticsearch packages and configure** - `11218c9` (feat)
2. **Task 2: Create IndexingService with per-tenant indices** - `825ca33` (feat - part of parallel session)
3. **Task 3: Create SearchService with permission filtering** - `210c344` (feat)

## Files Created/Modified
- `apps/backend/src/modules/search/search.module.ts` - SearchModule integrating all components
- `apps/backend/src/modules/search/search.service.ts` - Unified search with permission filtering
- `apps/backend/src/modules/search/search.controller.ts` - /api/v1/search endpoint
- `apps/backend/src/modules/search/indexing/indexing.service.ts` - Index management and document indexing
- `apps/backend/src/modules/search/indexing/index-mappings/case.mapping.ts` - Case document mapping
- `apps/backend/src/modules/search/indexing/index-mappings/riu.mapping.ts` - RIU document mapping
- `apps/backend/src/modules/search/query/permission-filter.service.ts` - Role-based ES filters
- `apps/backend/src/modules/search/handlers/case-indexing.handler.ts` - Event-to-queue bridge
- `apps/backend/src/modules/search/dto/search-query.dto.ts` - Search query parameters
- `apps/backend/src/modules/search/dto/search-result.dto.ts` - Search response with hits/aggs
- `apps/backend/src/modules/jobs/processors/indexing.processor.ts` - Actual ES indexing logic
- `apps/backend/src/config/configuration.ts` - Elasticsearch config
- `apps/backend/src/app.module.ts` - SearchModule registration

## Decisions Made
- Per-tenant index naming: `org_{organizationId}_{entityType}` - enables data isolation
- Permission filters at query time, not post-filtering - security non-negotiable
- 500ms timeout per CONTEXT.md requirements for responsive UX
- Compliance synonyms in analyzer for domain-specific search relevance
- Role-based visibility: SYSTEM_ADMIN/COMPLIANCE_OFFICER=all, INVESTIGATOR=assigned, EMPLOYEE=own

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- ES v9 SDK API changes: The `body` parameter was deprecated, requiring flattened params directly on search()
- Resolution: Updated search service to use ES v9 SDK format with proper types

## User Setup Required
None - Elasticsearch already configured in docker-compose.yml from previous work.

To verify:
```bash
docker-compose up -d elasticsearch
curl http://localhost:9200
# Should return ES cluster info
```

## Next Phase Readiness
- SearchModule ready for use by domain modules
- IndexingService can be called to index new entity types
- Search endpoint ready for frontend integration
- Permission filtering tested for all user roles

---
*Phase: 01-foundation-infrastructure*
*Plan: 06*
*Completed: 2026-02-03*
