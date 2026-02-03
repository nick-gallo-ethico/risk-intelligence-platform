---
phase: 05-ai-infrastructure
plan: 03
subsystem: ai-rate-limiting
tags: [redis, rate-limiting, multi-tenant, billing, analytics]

# Dependency Graph
dependency_graph:
  requires: ["05-01"]
  provides: ["per-tenant-rate-limiting", "ai-usage-tracking", "billing-analytics"]
  affects: ["05-04", "05-07", "05-08"]

# Tech Stack Changes
tech_stack:
  added:
    - ioredis (Redis sorted sets for sliding window)
  patterns:
    - Sliding window rate limiting via Redis sorted sets
    - Per-tenant limit caching with TTL
    - Optimistic quota consumption with rollback

# File Tracking
key_files:
  created:
    - apps/backend/src/modules/ai/services/rate-limiter.service.ts
    - apps/backend/src/modules/ai/dto/rate-limit.dto.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/ai/ai.module.ts
    - apps/backend/src/modules/ai/dto/index.ts
    - apps/backend/src/modules/ai/index.ts
    - apps/backend/.env.example

# Key Decisions
decisions:
  - id: "05-03-01"
    title: "Redis sorted sets for sliding window"
    rationale: "Sorted sets enable precise sliding window rate limiting vs fixed time windows"
    alternatives_considered: ["Fixed window counters", "Leaky bucket", "Token bucket"]
  - id: "05-03-02"
    title: "1-minute limit cache TTL"
    rationale: "Balance between freshness and reducing DB queries for high-traffic scenarios"
  - id: "05-03-03"
    title: "25-hour daily counter expiry"
    rationale: "Survives timezone edge cases where midnight varies across regions"

# Metrics
metrics:
  duration: "12 min"
  completed: "2026-02-03"
---

# Phase 5 Plan 3: Per-Tenant AI Rate Limiting Summary

Per-tenant AI rate limiting using Redis sorted sets for accurate sliding window tracking, with usage recording for billing and analytics.

## What Was Built

### AiRateLimiterService (466 lines)

Core service providing per-tenant AI rate limiting:

**Rate Limiting Features:**
- Sliding window rate limiting for RPM (requests per minute)
- Sliding window rate limiting for TPM (tokens per minute)
- Daily request and token limits
- Organization-specific limit configuration
- Graceful handling with retry-after duration

**Usage Tracking Features:**
- Record actual token usage after API calls
- Usage statistics by period (day/week/month)
- Breakdown by feature type for analytics
- Support for billing integration

**Key Methods:**
- `checkAndConsume(params)` - Pre-request limit check with quota consumption
- `recordUsage(params)` - Post-request usage recording for analytics
- `getUsageStats(orgId, period)` - Usage reporting by time period
- `getRateLimitStatus(orgId)` - Current capacity display for UI
- `updateOrgLimits(orgId, limits)` - Admin tier configuration

### Prisma Models

**AiUsage** - Token consumption tracking:
- Per-organization and per-user tracking
- Input/output/cache token counts
- Model, provider, feature type, entity context
- Request duration tracking

**AiRateLimit** - Per-organization configuration:
- Requests per minute (default: 60)
- Tokens per minute (default: 100,000)
- Requests per day (default: 10,000)
- Tokens per day (default: 5,000,000)

## Implementation Details

### Redis Key Structure

```
ai:ratelimit:{orgId}:rpm           # Sorted set for RPM tracking
ai:ratelimit:{orgId}:tpm           # Sorted set for TPM tracking (member includes token count)
ai:ratelimit:{orgId}:daily-rpm:{date}  # Simple counter for daily requests
ai:ratelimit:{orgId}:daily-tpm:{date}  # Simple counter for daily tokens
```

### Sliding Window Algorithm

1. Remove expired entries from sorted set (older than 60 seconds)
2. Count current entries (RPM) or sum token values (TPM)
3. Check against configured limits
4. If allowed, add new entry with current timestamp as score
5. Set 120-second TTL on keys for automatic cleanup

### Cache Strategy

- Organization limits cached for 1 minute in-memory
- Reduces DB queries for high-traffic scenarios
- Cache invalidated on limit updates

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `apps/backend/prisma/schema.prisma` | Modified | AiUsage and AiRateLimit models (already existed from previous plan) |
| `apps/backend/src/modules/ai/services/rate-limiter.service.ts` | Created | Core rate limiting service (466 lines) |
| `apps/backend/src/modules/ai/dto/rate-limit.dto.ts` | Created | DTO interfaces for rate limiting |
| `apps/backend/src/modules/ai/ai.module.ts` | Modified | Export AiRateLimiterService |
| `apps/backend/src/modules/ai/dto/index.ts` | Modified | Export rate-limit.dto |
| `apps/backend/src/modules/ai/index.ts` | Modified | Export rate-limiter.service |
| `apps/backend/.env.example` | Modified | Add rate limiting env variables |
| `apps/backend/src/modules/ai/services/context-loader.service.ts` | Modified | Fix type issue (blocking fix) |

## Verification Results

All verification criteria passed:
- [x] `npm run build` passes
- [x] AiUsage and AiRateLimit models exist in schema
- [x] checkAndConsume, recordUsage, getUsageStats methods implemented
- [x] Redis sorted sets used (zadd, zremrangebyscore, zcard)
- [x] prisma.aiUsage used for billing analytics
- [x] Redis keys use proper per-organization namespacing

## Success Criteria Met

- [x] Per-tenant rate limits using Redis sorted sets
- [x] Sliding window algorithm for accurate RPM/TPM tracking
- [x] Daily limits tracked separately
- [x] Usage recorded to database for billing analytics
- [x] Organization-specific limit configuration supported
- [x] Graceful handling when limits exceeded (returns retry-after)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed type error in context-loader.service.ts**
- **Found during:** Build verification
- **Issue:** `path: string | null` not assignable to `path?: string` in category mapping
- **Fix:** Added explicit type cast after null-to-undefined conversion
- **Files modified:** `apps/backend/src/modules/ai/services/context-loader.service.ts`
- **Commit:** Included in Task 2 commit

**2. [Rule 1 - Bug] Pre-existing AiUsage/AiRateLimit models**
- **Found during:** Task 1
- **Issue:** Models already existed in schema from previous plan execution
- **Action:** Verified existing models match requirements, skipped duplicate work
- **Impact:** None - models were correctly implemented

## Next Phase Readiness

Ready for:
- 05-04: AI usage can now be tracked and limited per organization
- 05-07: Rate limiting provides foundation for AI agents
- 05-08: Usage analytics available for billing dashboard

No blockers identified.
