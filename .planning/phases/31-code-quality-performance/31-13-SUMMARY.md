---
phase: 31
plan: 13
subsystem: analytics
tags: [decomposition, widget-data, thin-coordinator, service-extraction]
depends_on:
  requires: [31-07]
  provides: [WidgetCaseDataService, WidgetCampaignDataService, WidgetMetricsDataService]
  affects: []
tech-stack:
  added: []
  patterns: [thin-coordinator, domain-specific-sub-services]
key-files:
  created:
    - apps/backend/src/modules/analytics/dashboard/services/widget-case-data.service.ts
    - apps/backend/src/modules/analytics/dashboard/services/widget-campaign-data.service.ts
    - apps/backend/src/modules/analytics/dashboard/services/widget-metrics-data.service.ts
  modified:
    - apps/backend/src/modules/analytics/dashboard/widget-data.service.ts
    - apps/backend/src/modules/analytics/dashboard/dashboard.module.ts
decisions:
  - id: WIDGET-DATA-DECOMPOSITION
    description: Split widget-data.service into three domain-specific sub-services
    rationale: 1240 LOC monolith handling 11 data sources violates single responsibility
metrics:
  duration: PT12M
  completed: 2026-02-15
---

# Phase 31 Plan 13: WidgetDataService Decomposition Summary

**One-liner:** Decomposed 1240 LOC widget-data.service into thin coordinator (277 LOC) + three domain sub-services (549+431+316 LOC)

## Objective

Decompose widget-data.service.ts (1240 LOC) into focused sub-services following the thin coordinator pattern, leaving WidgetDataService as a router that delegates to domain-specific sub-services.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extract WidgetCaseDataService | 4dff844 | services/widget-case-data.service.ts |
| 2 | Extract WidgetCampaignDataService + WidgetMetricsDataService | 52b1f72 | services/widget-campaign-data.service.ts, services/widget-metrics-data.service.ts |
| 3 | Refactor WidgetDataService to thin coordinator | dfd28f4 | widget-data.service.ts, dashboard.module.ts |

## Changes Made

### New Services Created

1. **WidgetCaseDataService (549 LOC)**
   - `fetchCaseData()` - Routes to KPI/Table/List/Chart
   - `fetchMyCases()` - User-assigned cases
   - `fetchCaseKpi()` - Case count with trend
   - `fetchCaseTable()` - Case list table
   - `fetchCaseList()` - Case list widget
   - `fetchCaseChart()` - Case chart by status/severity
   - `fetchRiuData()` - RIU KPI and charts
   - `fetchInvestigationData()` - Investigation progress KPI
   - Helper methods: `buildCaseWhereClause()`, `getSeverityColor()`, `groupByWeek()`

2. **WidgetCampaignDataService (431 LOC)**
   - `fetchCampaignData()` - Campaign KPI/Table/Chart
   - `fetchCampaignAssignmentData()` - Assignment KPI/Chart
   - `fetchDisclosureData()` - Disclosure KPI/List/Chart
   - Helper methods: `buildSimpleFilter()`, `getSeverityColor()`, `groupByWeek()`

3. **WidgetMetricsDataService (316 LOC)**
   - `computeComplianceHealth()` - Weighted health score
   - `fetchSlaMetrics()` - SLA alert count
   - `fetchActivityData()` - Recent activity list
   - `getQuickActions()` - Role-appropriate quick actions
   - Helper method: `getActivityIcon()`

### Refactored WidgetDataService (277 LOC)

- Removed all data fetching logic
- Injected three domain sub-services
- Kept: `getWidgetData()`, `getBatchWidgetData()`, `invalidateWidget()`
- Kept: `fetchWidgetData()` (router), `buildCacheKey()`, `getCacheTtl()`
- Router delegates to appropriate sub-service based on dataSource

### Module Update

Updated `dashboard.module.ts` to register all three new services as providers.

## LOC Metrics

| Service | Before | After |
|---------|--------|-------|
| WidgetDataService | 1240 | 277 |
| WidgetCaseDataService | 0 | 549 |
| WidgetCampaignDataService | 0 | 431 |
| WidgetMetricsDataService | 0 | 316 |
| **Total** | **1240** | **1573** |

While total LOC increased by 27%, the code is now:
- **Focused:** Each service handles one domain
- **Testable:** Sub-services can be unit tested in isolation
- **Maintainable:** Changes to case data don't affect campaign logic
- **Readable:** Coordinator is <300 LOC, easy to understand routing

## Deviations from Plan

None - plan executed exactly as written.

## Verification

```bash
# LOC under 400 target
wc -l apps/backend/src/modules/analytics/dashboard/widget-data.service.ts
# 277

# All services exist
ls apps/backend/src/modules/analytics/dashboard/services/
# widget-campaign-data.service.ts
# widget-case-data.service.ts
# widget-metrics-data.service.ts

# TypeScript compiles
npm run typecheck  # Pass

# Lint passes
npm run lint  # Pass (pre-existing warnings only)
```

## Success Criteria

- [x] WidgetDataService is under 400 LOC (277 LOC - 78% reduction)
- [x] WidgetCaseDataService extracts case/RIU/investigation logic (549 LOC)
- [x] WidgetCampaignDataService extracts campaign/disclosure logic (431 LOC)
- [x] WidgetMetricsDataService extracts metrics/SLA/activity logic (316 LOC)
- [x] All existing public API signatures preserved
- [x] No runtime errors (TypeScript + lint pass)

## Next Phase Readiness

All must-haves verified. Plan 31-13 complete.
