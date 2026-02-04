---
phase: 09-campaigns-disclosures
plan: 03
subsystem: disclosures
tags: [threshold-rules, json-rules-engine, aggregates, automation]

# Dependency graph
requires:
  - phase: 04-core-entities
    provides: RiuDisclosureExtension model with value tracking
provides:
  - ThresholdRule Prisma model for rule configuration
  - ThresholdTriggerLog model for audit and analytics
  - ThresholdService with json-rules-engine integration
  - Rolling window aggregate calculations (days/months/years)
  - Multiple action types: FLAG_REVIEW, CREATE_CASE, REQUIRE_APPROVAL, NOTIFY
affects: [09-campaigns-disclosures-policy-automation, 09-04-conflict-detection]

# Tech tracking
tech-stack:
  added: [json-rules-engine@7.3.1]
  patterns: [json-rules-engine evaluation, rolling window aggregates, policy-driven automation]

key-files:
  created:
    - apps/backend/prisma/schema.prisma (ThresholdRule, ThresholdTriggerLog models)
    - apps/backend/src/modules/disclosures/dto/threshold-rule.dto.ts
    - apps/backend/src/modules/disclosures/threshold.service.ts
    - apps/backend/src/modules/disclosures/index.ts
  modified:
    - apps/backend/package.json (json-rules-engine dependency)
    - package-lock.json

key-decisions:
  - "Use json-rules-engine for flexible rule evaluation with condition chaining"
  - "Rolling windows support days, months, years with both rolling and calendar modes"
  - "Aggregate functions: SUM, COUNT, AVG, MAX for multi-dimensional calculations"
  - "Action priority: CREATE_CASE > REQUIRE_APPROVAL > FLAG_REVIEW > NOTIFY"
  - "Use DISCLOSURE entity type for audit logs (THRESHOLD_RULE not in enum)"
  - "Emit threshold.triggered event for downstream case creation handling"

patterns-established:
  - "ThresholdRule conditions stored as JSON with operator mapping to json-rules-engine"
  - "AggregateConfig JSON stores timeWindow, dimensions, groupBy, function settings"
  - "ThresholdTriggerLog captures full evaluation context for audit transparency"

# Metrics
duration: 26min
completed: 2026-02-04
---

# Phase 09 Plan 03: Threshold Configuration Engine Summary

**Threshold rule configuration engine with json-rules-engine for policy-driven auto-case creation based on multi-dimensional rolling window aggregates**

## Performance

- **Duration:** 26 min
- **Started:** 2026-02-04T07:10:44Z
- **Completed:** 2026-02-04T07:36:53Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- ThresholdRule Prisma model with conditions, aggregateConfig, action, and applyMode fields
- ThresholdService with full CRUD and evaluateDisclosure() for rule processing
- Rolling window aggregate calculations across person, entity, and category dimensions
- Event emission (threshold.triggered) for downstream case creation handling

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ThresholdRule model to Prisma schema** - `148a384` (feat)
2. **Task 2: Create threshold rule DTOs** - `3150645` (feat)
3. **Task 3: Create ThresholdService with json-rules-engine** - `d0785e6` (feat)

## Files Created/Modified
- `apps/backend/prisma/schema.prisma` - Added ThresholdRule, ThresholdTriggerLog models, ThresholdAction and ThresholdApplyMode enums
- `apps/backend/src/modules/disclosures/dto/threshold-rule.dto.ts` - DTOs for rule CRUD with validation
- `apps/backend/src/modules/disclosures/dto/index.ts` - Barrel export
- `apps/backend/src/modules/disclosures/threshold.service.ts` - Core service with json-rules-engine integration
- `apps/backend/src/modules/disclosures/index.ts` - Module exports
- `apps/backend/package.json` - Added json-rules-engine dependency

## Decisions Made
- **json-rules-engine operator mapping:** eq->equal, neq->notEqual, gte->greaterThanInclusive, etc.
- **Action priority escalation:** Highest priority action (CREATE_CASE) becomes recommendedAction when multiple rules trigger
- **Audit entity type:** Used DISCLOSURE for audit logs since THRESHOLD_RULE not in AuditEntityType enum
- **Aggregate default:** 12-month rolling window if no timeWindow config specified
- **JSON serialization:** Use JSON.parse(JSON.stringify()) for safe Prisma InputJsonValue conversion

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **Import paths:** Initial import paths used `../../common/` pattern but project uses `../` relative to modules root - fixed by checking existing service patterns
- **Prisma client regeneration:** ThresholdAction enum not found until `npx prisma generate` ran after schema update
- **Audit log interface:** Required actionCategory and actorType fields not initially included - added after checking CreateAuditLogDto interface

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Threshold rules can be configured via ThresholdService CRUD methods
- evaluateDisclosure() ready to be called from disclosure submission flow
- threshold.triggered event ready for listener to create cases
- Needs: Controller endpoints (future plan), UI for rule configuration (future plan)

---
*Phase: 09-campaigns-disclosures*
*Completed: 2026-02-04*
