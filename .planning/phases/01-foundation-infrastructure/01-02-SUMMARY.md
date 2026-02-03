---
phase: 01-foundation-infrastructure
plan: 02
subsystem: infra
tags: [bullmq, redis, job-queue, background-processing, bull-board]

# Dependency graph
requires:
  - phase: 01-01
    provides: EventsModule for domain event subscription (jobs may be triggered by events)
provides:
  - BullMQ job queue infrastructure with Redis backend
  - Three specialized queues (AI, Email, Indexing) with different retry strategies
  - Bull Board admin UI at /admin/queues for ops monitoring
  - Job data types with tenant isolation (BaseJobData.organizationId)
affects: [ai-infrastructure, notifications, search-indexing, any-background-processing]

# Tech tracking
tech-stack:
  added: ["@nestjs/bullmq@^11.0.4", "bullmq@^5.67.2", "ioredis@^5.9.2", "@bull-board/nestjs@^6.16.4", "@bull-board/api@^6.16.4", "@bull-board/express@^6.16.4"]
  patterns: [queue-specific-retry-config, exponential-backoff, job-data-interfaces, processor-workerhost]

key-files:
  created:
    - apps/backend/src/modules/jobs/jobs.module.ts
    - apps/backend/src/modules/jobs/queues/ai.queue.ts
    - apps/backend/src/modules/jobs/queues/email.queue.ts
    - apps/backend/src/modules/jobs/queues/indexing.queue.ts
    - apps/backend/src/modules/jobs/processors/ai.processor.ts
    - apps/backend/src/modules/jobs/processors/email.processor.ts
    - apps/backend/src/modules/jobs/processors/indexing.processor.ts
    - apps/backend/src/modules/jobs/types/job-data.types.ts
  modified:
    - apps/backend/package.json
    - apps/backend/src/config/configuration.ts
    - docker-compose.yml
    - apps/backend/.env.example

key-decisions:
  - "AI queue gets 5 retries with exponential backoff (2s base) for rate limiting resilience"
  - "Email queue priority 2 (higher) with 3 retries for time-sensitive delivery"
  - "Indexing queue priority 5 (lower) with fixed 5s delay for bulk background ops"
  - "All job data requires organizationId for multi-tenant isolation"
  - "Queue prefix 'ethico' for multi-app Redis sharing"

patterns-established:
  - "Queue config pattern: separate file per queue with name + options constants"
  - "Processor pattern: extend WorkerHost, use @OnWorkerEvent for lifecycle hooks"
  - "Job data pattern: interface extends BaseJobData with organizationId required"
  - "Admin UI pattern: Bull Board mounted at /admin/queues excluded from tenant middleware"

# Metrics
duration: 8min
completed: 2026-02-02
---

# Phase 1 Plan 2: Job Queue Infrastructure Summary

**BullMQ job queue with three specialized queues (AI/Email/Indexing), each with tailored retry strategies, plus Bull Board admin UI at /admin/queues**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-02T20:11:00Z
- **Completed:** 2026-02-02T20:16:00Z
- **Tasks:** 3 (all completed in 2 commits)
- **Files modified:** 17

## Accomplishments

- Installed BullMQ, ioredis, and Bull Board packages with proper version pinning
- Created JobsModule with Redis connection via ConfigService
- Configured three queues with job-type-specific retry strategies per CONTEXT.md requirements
- Created processor placeholders for AI, Email, and Indexing (actual implementation in later phases)
- Mounted Bull Board admin UI at /admin/queues for operational monitoring
- Defined job data types enforcing organizationId for tenant isolation

## Task Commits

Each task was committed atomically:

1. **Task 1: Install BullMQ packages and configure Redis** - `06ceef1` (chore)
2. **Task 2 + 3: Create JobsModule with queue registrations and processors** - `243cb4f` (feat)

## Files Created/Modified

### Created
- `apps/backend/src/modules/jobs/jobs.module.ts` - BullMQ module with Redis connection and Bull Board
- `apps/backend/src/modules/jobs/queues/ai.queue.ts` - AI queue config: 5 retries, exponential 2s
- `apps/backend/src/modules/jobs/queues/email.queue.ts` - Email queue config: 3 retries, priority 2
- `apps/backend/src/modules/jobs/queues/indexing.queue.ts` - Indexing queue: 3 retries, fixed 5s, priority 5
- `apps/backend/src/modules/jobs/queues/index.ts` - Barrel export for queues
- `apps/backend/src/modules/jobs/processors/ai.processor.ts` - AI job processor with summary/translate/categorize/note-cleanup
- `apps/backend/src/modules/jobs/processors/email.processor.ts` - Email delivery processor placeholder
- `apps/backend/src/modules/jobs/processors/indexing.processor.ts` - Search indexing processor placeholder
- `apps/backend/src/modules/jobs/processors/index.ts` - Barrel export for processors
- `apps/backend/src/modules/jobs/types/job-data.types.ts` - Job data interfaces with BaseJobData
- `apps/backend/src/modules/jobs/types/index.ts` - Barrel export for types
- `apps/backend/src/modules/jobs/index.ts` - Module barrel export

### Modified
- `apps/backend/package.json` - Added BullMQ and Bull Board dependencies
- `apps/backend/src/config/configuration.ts` - Added redis.host/port/password config
- `apps/backend/.env.example` - Added REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- `docker-compose.yml` - Added Redis AOF persistence (appendonly yes)
- `apps/backend/src/app.module.ts` - Already had JobsModule imported

## Decisions Made

1. **Queue-specific retry configurations** - AI queue gets more retries (5) with longer exponential backoff because API rate limiting is common. Email gets fewer retries (3) but higher priority (2). Indexing gets lowest priority (5) with fixed delay since these are bulk operations.

2. **Processor concurrency settings** - AI: 5 (API rate limits), Email: 10 (fast delivery), Indexing: 20 (bulk throughput)

3. **Job retention policies** - AI: 24h complete/7d failed (investigation), Email: 12h/3d, Indexing: 6h/24h (less important to keep)

4. **Queue prefix 'ethico'** - Allows sharing Redis with other apps in development

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully.

## User Setup Required

None - Redis is configured via docker-compose and works out of the box with `docker-compose up -d redis`.

## Verification

All verification criteria passed:
- [x] Packages in package.json: bullmq, @nestjs/bullmq, @bull-board/* present
- [x] Redis in docker-compose with persistence
- [x] docker-compose config validates
- [x] TypeScript compiles without errors
- [x] Build succeeds
- [x] Three queues registered with different configurations
- [x] Bull Board mounted at /admin/queues

## Next Phase Readiness

**Ready for:**
- Plan 01-03 (Audit Logging) - can use job queue for async audit writes if needed
- Plan 01-06 (Search Infrastructure) - indexing processor ready for Elasticsearch integration
- Phase 5 (AI Infrastructure) - AI processor ready for Claude API integration
- Phase 7 (Notifications) - email processor ready for email service integration

**Processors are placeholders:** The three processors log job activity but don't perform real work. Actual implementations will be added in:
- AI processor: Phase 5 (AI Infrastructure)
- Email processor: Phase 7 (Notifications & Email)
- Indexing processor: Plan 01-06 (Search Infrastructure)

---
*Phase: 01-foundation-infrastructure*
*Plan: 02*
*Completed: 2026-02-02*
