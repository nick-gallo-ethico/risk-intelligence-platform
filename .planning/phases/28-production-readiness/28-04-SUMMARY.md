---
phase: 28-production-readiness
plan: 04
subsystem: infra
tags:
  [
    nestjs,
    terminus,
    health-checks,
    kubernetes,
    load-balancer,
    prisma,
    redis,
    elasticsearch,
  ]

# Dependency graph
requires:
  - phase: 28-01
    provides: PrismaService with connection retry logic
provides:
  - Deep health checks for all dependencies (database, Redis, Elasticsearch)
  - Liveness probe endpoint for Kubernetes
  - Readiness probe endpoint for traffic routing
  - Custom health indicators using @nestjs/terminus
affects: [deployment, kubernetes, load-balancer-config, monitoring]

# Tech tracking
tech-stack:
  added: ["@nestjs/terminus"]
  patterns:
    [
      "HealthIndicator pattern for dependency checks",
      "Optional dependency handling for graceful degradation",
    ]

key-files:
  created:
    - apps/backend/src/modules/health/indicators/prisma.health.ts
    - apps/backend/src/modules/health/indicators/redis.health.ts
    - apps/backend/src/modules/health/indicators/elasticsearch.health.ts
    - apps/backend/src/modules/health/indicators/index.ts
  modified:
    - apps/backend/src/modules/health/health.module.ts
    - apps/backend/src/modules/health/health.controller.ts
    - apps/backend/src/modules/health/index.ts
    - apps/backend/package.json

key-decisions:
  - "Use @nestjs/terminus for standardized health check infrastructure"
  - "Optional dependencies (Redis, ES) return 'not_configured' status instead of failing"
  - "Separate liveness (heartbeat) from readiness (database) probes per Kubernetes best practices"
  - "PrismaHealthIndicator uses SELECT 1 for minimal database check"
  - "ElasticsearchHealthIndicator treats 'yellow' as healthy (normal for single-node)"

patterns-established:
  - "HealthIndicator pattern: Extend HealthIndicator, implement isHealthy(), use getStatus() and HealthCheckError"
  - "Optional service injection: Use @Optional() decorator for services that may not be configured"
  - "Graceful degradation: Return healthy with status='not_configured' when optional service unavailable"

# Metrics
duration: 4min
completed: 2026-02-14
---

# Phase 28 Plan 04: Health Checks Summary

**Deep health checks with @nestjs/terminus for database, Redis, and Elasticsearch, enabling load balancer traffic routing**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-14T19:03:01Z
- **Completed:** 2026-02-14T19:07:24Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Installed @nestjs/terminus for standardized health check infrastructure
- Created PrismaHealthIndicator verifying database connectivity via SELECT 1
- Created RedisHealthIndicator verifying cache via PING command
- Created ElasticsearchHealthIndicator checking cluster health status
- Implemented deep health check at GET /health for all dependencies
- Added liveness probe at GET /health/liveness for Kubernetes
- Added readiness probe at GET /health/readiness for traffic routing
- Returns HTTP 503 when any dependency is unhealthy

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @nestjs/terminus and create health indicators** - `3ed39e5` (feat)
2. **Task 2: Update HealthModule and HealthController with terminus integration** - `371dad8` (feat)

## Files Created/Modified

**Created:**

- `apps/backend/src/modules/health/indicators/prisma.health.ts` - PostgreSQL health check via SELECT 1
- `apps/backend/src/modules/health/indicators/redis.health.ts` - Redis health check via PING
- `apps/backend/src/modules/health/indicators/elasticsearch.health.ts` - ES cluster health check
- `apps/backend/src/modules/health/indicators/index.ts` - Barrel export for indicators

**Modified:**

- `apps/backend/src/modules/health/health.module.ts` - Import TerminusModule and register providers
- `apps/backend/src/modules/health/health.controller.ts` - Add deep health, liveness, readiness endpoints
- `apps/backend/src/modules/health/index.ts` - Export indicators
- `apps/backend/package.json` - Add @nestjs/terminus dependency

## Decisions Made

1. **@nestjs/terminus for health infrastructure** - Industry standard for NestJS health checks, provides HealthCheckService, standardized response format, and HTTP 503 on failure
2. **Optional dependency handling** - Redis and Elasticsearch return `{ status: "not_configured" }` when not injected, allowing app to run in reduced-functionality mode
3. **Separate liveness from readiness** - Liveness is a simple heartbeat (process alive), readiness checks database only (can serve requests). Per Kubernetes best practices.
4. **Elasticsearch yellow = healthy** - Yellow status is normal for single-node clusters or during shard allocation, only red indicates failure
5. **SELECT 1 for database check** - Minimal query to verify connectivity without putting load on database

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Health check infrastructure complete
- Ready for Phase 28-05 (logging and monitoring)
- Load balancers can now route traffic based on /health endpoint
- Kubernetes can use /health/liveness and /health/readiness for pod lifecycle

---

_Phase: 28-production-readiness_
_Plan: 04_
_Completed: 2026-02-14_
