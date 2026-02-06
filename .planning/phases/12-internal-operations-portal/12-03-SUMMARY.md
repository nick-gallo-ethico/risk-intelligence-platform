---
phase: 12
plan: 03
subsystem: operations
tags: [health-metrics, tenant-health, benchmarks, feature-adoption, prisma]
requires: [12-01]
provides: [TenantHealthScore, UsageMetric, FeatureAdoption, PeerBenchmark]
affects: [12-04, 12-05, 12-08]
tech-stack:
  added: []
  patterns: [weighted-scoring, benchmark-aggregation, privacy-thresholds]
key-files:
  created:
    - apps/backend/src/modules/operations/types/health-metrics.types.ts
    - apps/backend/src/modules/operations/entities/tenant-health-score.entity.ts
    - apps/backend/src/modules/operations/entities/usage-metric.entity.ts
    - apps/backend/src/modules/operations/entities/feature-adoption.entity.ts
    - apps/backend/src/modules/operations/entities/peer-benchmark.entity.ts
  modified:
    - apps/backend/prisma/schema.prisma
decisions:
  - id: health-weights
    summary: Use RESEARCH.md weights - login 20%, case 25%, campaign 25%, features 15%, tickets 15%
  - id: min-peer-count
    summary: Set MIN_PEER_COUNT=5 for privacy protection in benchmark display
  - id: feature-tracking
    summary: Track 14 features across 4 categories (core, advanced, campaigns, integrations)
metrics:
  duration: 27 min
  completed: 2026-02-06
---

# Phase 12 Plan 03: Health Metrics Models Summary

**One-liner:** Prisma models for tenant health scoring with blended component weights, daily usage metrics, feature adoption tracking, and peer benchmark aggregates.

## What Was Built

### 1. Health Metrics Types (`health-metrics.types.ts`)

Created comprehensive type definitions for health scoring:

- **HEALTH_WEIGHTS**: Constant with documented weight distribution (login 20%, case resolution 25%, campaign completion 25%, feature adoption 15%, support tickets 15%)
- **RiskLevel**: LOW/MEDIUM/HIGH classification with threshold logic
- **HealthTrend**: IMPROVING/STABLE/DECLINING based on score delta (>+5, -5 to +5, <-5)
- **AlertLevel**: NONE/DASHBOARD_ONLY/PROACTIVE for account-specific alerting
- **TrackedFeature**: 14 features across 4 categories
- **Helper functions**: `calculateRiskLevel()`, `calculateTrend()`, `calculateOverallScore()`
- **MIN_PEER_COUNT**: 5 (privacy protection for benchmark display)

### 2. TenantHealthScore Model

Prisma model storing blended health scores per tenant:

```prisma
model TenantHealthScore {
  // 5 component scores (0-100 each)
  loginScore, caseResolutionScore, campaignCompletionScore,
  featureAdoptionScore, supportTicketScore

  // Weighted overall (0-100)
  overallScore

  // Classification
  trend: HealthTrend
  riskLevel: RiskLevel
  previousScore: Int?  // For delta calculation
  alertLevel: AlertLevel
}
```

### 3. UsageMetric Model

Daily aggregated statistics per tenant:

```prisma
model UsageMetric {
  // Login metrics
  activeUsers, totalUsers

  // Case metrics
  casesCreated, casesClosed, casesOnTime, casesOverdue

  // Campaign metrics
  campaignsActive, assignmentsTotal, assignmentsCompleted

  // Support metrics
  supportTickets
}
```

### 4. FeatureAdoption Model

Binary adoption flags per tenant per feature:

```prisma
model FeatureAdoption {
  featureKey: String     // TrackedFeature enum value
  firstUsedAt: DateTime
  lastUsedAt: DateTime
  usageCount: Int
}
```

### 5. PeerBenchmark Model

Nightly cached aggregates for peer comparison:

```prisma
model PeerBenchmark {
  metricName: String
  industrySector: String?  // Filter by industry
  employeeMin/Max: Int?    // Filter by company size

  // Aggregates (only shown when peerCount >= 5)
  peerCount, p25, median, p75, mean, minValue, maxValue
}
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Weight distribution | Per RESEARCH.md | Case resolution and campaigns weighted highest (25% each) as primary outcome metrics |
| Risk thresholds | 40/60/70 | <40 always HIGH, <60+declining HIGH, >=70 LOW |
| Trend thresholds | +/-5 | Prevents noise from minor fluctuations |
| Privacy threshold | 5 peers minimum | Prevents identification in small cohorts |
| Feature tracking | 14 features | Covers core, advanced, campaigns, and integrations |

## Commits

| Hash | Message |
|------|---------|
| b93a8af | feat(12-03): add health metrics types and weights |
| 0084b6f | feat(12-03): add TenantHealthScore and UsageMetric models |
| 1d6f2cb | feat(12-03): add FeatureAdoption and PeerBenchmark models |

## Verification Results

- [x] `npx prisma validate` - Schema is valid
- [x] `npx tsc --noEmit` - TypeScript compiles
- [x] All 4 tables mapped: tenant_health_scores, usage_metrics, feature_adoptions, peer_benchmarks
- [x] Organization relations: healthScores, usageMetrics, featureAdoptions

## Deviations from Plan

None - plan executed exactly as written.

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| health-metrics.types.ts | 277 | Constants, enums, interfaces, helper functions |
| tenant-health-score.entity.ts | 127 | TenantHealthScore interfaces and DTOs |
| usage-metric.entity.ts | 155 | UsageMetric interfaces and DTOs |
| feature-adoption.entity.ts | 113 | FeatureAdoption interfaces and DTOs |
| peer-benchmark.entity.ts | 197 | PeerBenchmark interfaces, toBenchmarkDisplay() |
| schema.prisma (additions) | ~160 | 3 enums, 4 models with indexes |

## Next Phase Readiness

**Ready for:**
- 12-04: Health calculation service can use these models
- 12-05: CSM dashboard can query TenantHealthScore with filters
- 12-08: Background job can calculate and cache PeerBenchmark data
