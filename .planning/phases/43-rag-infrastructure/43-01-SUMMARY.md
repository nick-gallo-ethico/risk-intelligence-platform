---
phase: 43-rag-infrastructure
plan: 01
subsystem: database
tags: [pgvector, embeddings, vector-search, prisma, postgresql]

# Dependency graph
requires:
  - phase: None (foundation)
    provides: PostgreSQL database via docker-compose
provides:
  - DocumentEmbedding Prisma model for vector storage
  - pgvector extension enabled in PostgreSQL
  - HNSW index for cosine similarity search
  - EmbeddingSourceType enum for document type tracking
affects:
  [43-02-embedding-service, 43-03-chunking, 43-04-vector-store, 44-chatbot]

# Tech tracking
tech-stack:
  added: [pgvector 0.8.2, pgvector/pgvector:pg15 docker image]
  patterns: [NO RLS on vector tables, explicit organizationId filtering]

key-files:
  created:
    - apps/backend/prisma/migrations/20260303140350_add_document_embeddings/migration.sql
  modified:
    - apps/backend/prisma/schema.prisma
    - docker-compose.yml

key-decisions:
  - "NO RLS on document_embeddings - pgvector similarity queries require explicit WHERE"
  - "vector(1024) dimensions for Voyage AI voyage-3 model"
  - "HNSW index with m=16, ef_construction=64 for production quality"
  - "TEXT type for IDs to match existing Prisma schema patterns"

patterns-established:
  - "Vector table queries MUST include explicit WHERE organization_id = $1"
  - "Embedding model version stored per chunk for migration support"

# Metrics
duration: 25min
completed: 2026-03-03
---

# Phase 43 Plan 01: DocumentEmbedding Schema Summary

**pgvector extension enabled with DocumentEmbedding table, HNSW index, and explicit tenant filtering (no RLS)**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-03T18:58:36Z
- **Completed:** 2026-03-03T19:21:36Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Enabled pgvector extension (v0.8.2) in PostgreSQL via pgvector/pgvector:pg15 docker image
- Created DocumentEmbedding Prisma model with Unsupported("vector(1024)") column
- Added HNSW index for fast cosine similarity search
- Established NO RLS pattern for vector tables (explicit organizationId filtering required)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add DocumentEmbedding model to Prisma schema** - `d9b686bb` (feat)
2. **Task 2: Create migration for pgvector extension and DocumentEmbedding table** - `d7fa5a97` (feat)
3. **Task 3: Verify pgvector installation and index** - No commit (verification only)

## Files Created/Modified

- `apps/backend/prisma/schema.prisma` - Added EmbeddingSourceType enum and DocumentEmbedding model
- `apps/backend/prisma/migrations/20260303140350_add_document_embeddings/migration.sql` - pgvector extension, table, and indexes
- `docker-compose.yml` - Updated postgres image to pgvector/pgvector:pg15

## Decisions Made

1. **NO RLS on document_embeddings table** - Per CRIT-01 in STATE.md, pgvector similarity queries don't work reliably with RLS. All queries MUST include explicit WHERE organization_id = $1 clause.

2. **TEXT type for IDs** - Matched existing schema pattern where all IDs are TEXT (not UUID), maintaining consistency with organizations, policies, cases tables.

3. **HNSW index parameters** - Used m=16 (graph degree) and ef_construction=64 (build quality) per RESEARCH.md recommendations for production-quality recall.

4. **vector(1024) dimensions** - Matched Voyage AI voyage-3 model output dimensions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Docker image change required for pgvector**

- **Found during:** Task 2 (Migration execution)
- **Issue:** Standard postgres:15 image doesn't include pgvector extension
- **Fix:** Updated docker-compose.yml to use pgvector/pgvector:pg15
- **Files modified:** docker-compose.yml
- **Verification:** Extension created successfully, indexes work
- **Committed in:** d7fa5a97 (Task 2 commit)

**2. [Rule 3 - Blocking] ID column types mismatch**

- **Found during:** Task 2 (Migration execution)
- **Issue:** Migration used UUID type but existing schema uses TEXT for all IDs
- **Fix:** Updated migration to use TEXT for id, organization_id, source_id
- **Files modified:** migration.sql
- **Verification:** Foreign key constraint created successfully
- **Committed in:** d7fa5a97 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for migration to succeed. No scope creep.

## Issues Encountered

- **Shadow database conflict** - Prisma migrate dev failed due to existing types in shadow database. Resolved by using `npx prisma db execute` with direct SQL.
- **Collation version mismatch warning** - PostgreSQL collation warning (2.41 vs 2.36) appears but doesn't affect functionality. Can be resolved with `ALTER DATABASE ethico_dev REFRESH COLLATION VERSION` if needed.

## User Setup Required

None - no external service configuration required for this plan. Voyage AI API key setup will be required in plan 43-02.

## Next Phase Readiness

- DocumentEmbedding table ready for vector storage
- HNSW index operational for similarity queries
- Ready for plan 43-02: Embedding Service Implementation
- Blocker: None

---

_Phase: 43-rag-infrastructure_
_Completed: 2026-03-03_
