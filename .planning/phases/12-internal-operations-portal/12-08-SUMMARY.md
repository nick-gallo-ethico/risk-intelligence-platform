---
phase: 12-internal-operations-portal
plan: 08
subsystem: operations
tags: [health-score, client-success, bullmq, metrics, tenant-health]

# Dependency graph
requires:
  - phase: 12-03
    provides: TenantHealthScore, UsageMetric, FeatureAdoption Prisma models
provides:
  - UsageMetricsService for daily metric collection
  - HealthScoreService for weighted score calculation
  - HealthScoreProcessor for nightly batch recalculation
  - ClientHealthController REST API endpoints
affects: [12-14, csm-dashboard, client-success-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [weighted-composite-scoring, rate-limited-batch-processing]

key-files:
  created:
    - apps/backend/src/modules/operations/client-health/usage-metrics.service.ts
    - apps/backend/src/modules/operations/client-health/health-score.service.ts
    - apps/backend/src/modules/operations/client-health/health-score.processor.ts
    - apps/backend/src/modules/operations/client-health/client-health.controller.ts
  modified:
    - apps/backend/src/modules/operations/client-health/client-health.module.ts
    - apps/backend/src/modules/operations/client-health/index.ts

key-decisions:
  - "Case on-time uses Investigation.slaStatus since Case model has no direct SLA field"
  - "Rate limit batch processing with 100ms delay per RESEARCH.md pitfall #2"
  - "Perfect score (100) for metrics with no data (e.g., no cases closed = no penalty)"

patterns-established:
  - "Composite health score: collect metrics, calculate components, apply weights, save result"
  - "BullMQ processor with progress tracking and inter-tenant delay for DB protection"

# Metrics
duration: 22min
completed: 2026-02-06
---

# Phase 12 Plan 08: Client Health Score Service Summary

**Weighted health score calculation with 5 components (login 20%, case 25%, campaign 25%, features 15%, tickets 15%), BullMQ nightly processor with rate limiting, and REST API for CSM dashboard.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-02-06T01:23:26Z
- **Completed:** 2026-02-06T01:45:11Z
- **Tasks:** 3
- **Files created:** 4
- **Files modified:** 2

## Accomplishments

- UsageMetricsService collecting login, case, campaign, and support ticket metrics
- HealthScoreService with 5 weighted components and risk level classification
- BullMQ processor with 100ms inter-tenant delay preventing database overload
- REST API endpoints for score retrieval, history, and manual calculation triggers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Usage Metrics Service** - `0e32c28` (feat)
2. **Task 2: Create Health Score Service** - `0c1e500` (feat)
3. **Task 3: Create Health Score Processor and Module** - `264c1a9` (feat)

## Files Created/Modified

| File | Lines | Purpose |
|------|-------|---------|
| usage-metrics.service.ts | 299 | Collects daily login, case, campaign, ticket metrics |
| health-score.service.ts | 271 | Calculates weighted composite score with trend/risk |
| health-score.processor.ts | 185 | BullMQ nightly batch calculation with rate limiting |
| client-health.controller.ts | 141 | REST endpoints for score retrieval and triggers |
| client-health.module.ts | 58 | Module integrating health and benchmark services |
| index.ts | 17 | Barrel exports for all health services |

## Key Implementation Details

### Health Score Components

| Component | Weight | Target for 100 | Data Source |
|-----------|--------|----------------|-------------|
| Login Score | 20% | 70% active users | User.lastLoginAt |
| Case Resolution | 25% | 90% on-time | Investigation.slaStatus |
| Campaign Completion | 25% | 85% completed | CampaignAssignment.status |
| Feature Adoption | 15% | 60% features used | FeatureAdoption records |
| Support Tickets | 15% | 0 tickets | External (placeholder) |

### Risk Level Logic

```
HIGH: score < 40 OR (score < 60 AND declining)
MEDIUM: score < 70 OR declining
LOW: score >= 70 AND NOT declining
```

### API Endpoints

- `GET /api/v1/internal/client-health/:orgId/score` - Latest score
- `GET /api/v1/internal/client-health/:orgId/history?days=30` - Score history
- `GET /api/v1/internal/client-health/:orgId/metrics?days=30` - Usage metrics
- `POST /api/v1/internal/client-health/:orgId/calculate` - Trigger recalculation
- `POST /api/v1/internal/client-health/calculate-all` - Batch recalculation
- `GET /api/v1/internal/client-health/high-risk` - All high-risk tenants
- `GET /api/v1/internal/client-health/jobs/:jobId` - Job status

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use Investigation.slaStatus for case on-time | Case model has no closedAt/slaStatus; Investigation tracks SLA |
| 100ms inter-tenant delay | RESEARCH.md pitfall #2: prevents database CPU spikes during batch |
| Perfect score for empty data | No campaigns/cases = not penalized; measures usage quality not volume |
| Reuse helper functions | calculateOverallScore, calculateTrend, calculateRiskLevel from types |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiles and lint passes without errors in new files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- 12-14: CSM Dashboard can query health scores via ClientHealthController
- Nightly scheduled job can be added to calculate-all tenants

**Integration notes:**
- Support ticket integration is placeholder (returns 0) - integrate with Zendesk/Intercom when ready
- BullMQ queue registered with name "health-scores" - add cron schedule in app startup

---
*Phase: 12-internal-operations-portal*
*Completed: 2026-02-06*
