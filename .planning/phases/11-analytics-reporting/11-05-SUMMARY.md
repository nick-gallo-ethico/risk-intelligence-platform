---
phase: 11-analytics-reporting
plan: 05
subsystem: analytics
tags: [dashboard, widgets, data-fetching, caching, recharts]

# Dependency graph
requires:
  - phase: 11-01
    provides: Dashboard, DashboardWidget Prisma models
provides:
  - WidgetDataService for fetching dashboard widget data
  - Pre-built widget definitions for CCO, Investigator, Campaign Manager
  - Widget data caching with configurable TTL
  - Batch widget data fetching for performance
affects: [11-06, 11-07, 11-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Widget data caching with per-type TTL
    - Recharts-compatible chart data format
    - Pre-built widget definitions with role-based defaults

key-files:
  created:
    - apps/backend/src/modules/analytics/dashboard/widget-data.service.ts
    - apps/backend/src/modules/analytics/dashboard/dto/widget-data.dto.ts
    - apps/backend/src/modules/analytics/dashboard/prebuilt/prebuilt-widgets.ts
  modified:
    - apps/backend/src/modules/analytics/dashboard/dashboard.module.ts
    - apps/backend/src/modules/analytics/dashboard/dto/index.ts
    - apps/backend/src/modules/analytics/dashboard/index.ts

key-decisions:
  - "Cache TTL varies by widget type - KPI cards 60s, charts 300s, static widgets 1hr"
  - "Case assignment tracked via Investigation relation (Case doesn't have direct assignedTo)"
  - "Pre-built widgets defined as configuration objects for seeding default dashboards"

patterns-established:
  - "Widget data response includes fromCache flag and nextRefreshAt for client refresh"
  - "Batch widget fetch uses Promise.all for parallel performance"
  - "Chart data uses Recharts-compatible format with series/categories structure"

# Metrics
duration: 36min
completed: 2026-02-05
---

# Phase 11 Plan 05: Widget Data Service Summary

**Widget data service with pre-built dashboard widgets for CCO, Investigator, and Campaign Manager roles with configurable caching**

## Performance

- **Duration:** 36 min
- **Started:** 2026-02-05T02:19:32Z
- **Completed:** 2026-02-05T02:55:05Z
- **Tasks:** 3
- **Files created:** 3
- **Files modified:** 3

## Accomplishments

- Pre-built widget definitions for 10+ CCO widgets, 9+ Investigator widgets, 12+ Campaign Manager widgets
- WidgetDataService with data fetchers for cases, RIUs, campaigns, disclosures, investigations
- Widget data caching with configurable TTL (KPI: 60s, charts: 300s, tables: 120s)
- Batch widget data fetching with parallel execution for dashboard load performance
- Compliance health score computation (weighted average of case, SLA, campaign metrics)
- Recharts-compatible chart data format with series/categories structure

## Task Commits

1. **Task 1-3: Pre-built widgets and WidgetDataService** - `68d5b2e` (feat)
   - Created prebuilt-widgets.ts with CCO, INVESTIGATOR, CAMPAIGN_MANAGER widget definitions
   - Created widget-data.dto.ts with request/response types for all widget data types
   - Created widget-data.service.ts with data fetchers and caching logic
   - Updated module exports and imports

## Files Created/Modified

### Created
- `apps/backend/src/modules/analytics/dashboard/prebuilt/prebuilt-widgets.ts` - Pre-built widget definitions with WIDGET_CACHE_TTL and DASHBOARD_DEFAULTS exports
- `apps/backend/src/modules/analytics/dashboard/dto/widget-data.dto.ts` - DTOs for widget data requests and responses
- `apps/backend/src/modules/analytics/dashboard/widget-data.service.ts` - Data fetching service with caching (~1100 lines)

### Modified
- `apps/backend/src/modules/analytics/dashboard/dashboard.module.ts` - Added CacheModule and WidgetDataService
- `apps/backend/src/modules/analytics/dashboard/dto/index.ts` - Export widget-data types
- `apps/backend/src/modules/analytics/dashboard/index.ts` - Export WidgetDataService and prebuilt widgets

## Decisions Made

1. **Cache TTL per widget type** - More volatile data (KPI cards showing counts) refreshes every 60s, while charts refresh every 5 minutes and static widgets (quick actions) refresh hourly

2. **Case assignment model** - Cases don't have direct `assignedTo` field; assignment is through Investigation model. Widget fetches use Investigation relation for "my cases" queries

3. **Compliance health score formula** - Weighted average: case closure rate (30%), SLA compliance (40%), campaign completion (30%)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] DateRangePreset enum values**
- **Found during:** Task 2 (DTO creation)
- **Issue:** Used THIS_MONTH, THIS_QUARTER, THIS_YEAR which don't exist in schema
- **Fix:** Updated to use YEAR_TO_DATE and removed non-existent values
- **Files modified:** widget-data.dto.ts
- **Committed in:** 68d5b2e

**2. [Rule 3 - Blocking] WidgetType enum mismatch**
- **Found during:** Task 1 (prebuilt widgets)
- **Issue:** Used CALENDAR and TEXT which don't exist; missing SPARKLINE
- **Fix:** Removed CALENDAR/TEXT, added SPARKLINE to WIDGET_CACHE_TTL
- **Files modified:** prebuilt-widgets.ts
- **Committed in:** 68d5b2e

**3. [Rule 1 - Bug] Case assignedTo field doesn't exist**
- **Found during:** Task 3 (service implementation)
- **Issue:** Case model doesn't have assignedTo field - assignment is via Investigation
- **Fix:** Changed "my cases" query to filter by Investigation.assignedTo, display investigation count instead
- **Files modified:** widget-data.service.ts
- **Committed in:** 68d5b2e

**4. [Rule 3 - Blocking] DateRangeDto field name mismatch**
- **Found during:** Task 2 (DTO creation)
- **Issue:** Used startDate/endDate but dashboard.dto uses start/end
- **Fix:** Updated resolveDateRange to use dto.start and dto.end
- **Files modified:** widget-data.dto.ts
- **Committed in:** 68d5b2e

---

**Total deviations:** 4 auto-fixed (all blocking/bug)
**Impact on plan:** All fixes necessary for TypeScript compilation and correct behavior. No scope creep.

## Pre-built Widget Summary

| Dashboard | Widget Count | Key Widgets |
|-----------|-------------|-------------|
| CCO | 10 | Compliance Health, RIU Trends, Case Pipeline, Campaign Completion |
| Investigator | 9 | My Assignments, SLA Alerts, Case Age Distribution, Unassigned Queue |
| Campaign Manager | 12 | Active Campaigns, Disclosure Trends, Non-Responders, Conflict Alerts |

## Issues Encountered

- None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Widget data service ready for frontend dashboard components
- Pre-built widget definitions can be used to seed default dashboards
- Caching infrastructure in place for production performance

---
*Phase: 11-analytics-reporting*
*Completed: 2026-02-05*
