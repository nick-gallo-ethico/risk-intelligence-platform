---
phase: 40-rules-engine-foundation
plan: 03
subsystem: backend
tags: [nestjs, event-emitter, rules-engine, case-routing, audit-log]

# Dependency graph
requires:
  - phase: 40-01
    provides: RulesModule, RulesService, RuleDefinition/RuleExecutionLog Prisma models
  - phase: 40-02
    provides: RulesEngineService, custom operators, action executors
provides:
  - CaseRoutingListener for automatic case routing on case.created events
  - Async event handling pattern for rules evaluation
  - Comprehensive audit logging for all rule evaluations
affects: [40-04, 40-05, sla-monitoring, investigation-routing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Async event listener pattern with { async: true } for non-blocking"
    - "Proxy assignment check via Investigation.primaryInvestigatorId"
    - "Facts building with flat + nested structure for flexible rule conditions"

key-files:
  created:
    - apps/backend/src/modules/rules/listeners/case-routing.listener.ts
    - apps/backend/src/modules/rules/listeners/index.ts
    - apps/backend/src/modules/rules/listeners/case-routing.listener.spec.ts
  modified:
    - apps/backend/src/modules/rules/rules.module.ts

key-decisions:
  - "Use Investigation.primaryInvestigatorId as proxy for case assignment until Case model gets assignedToId"
  - "Log all rule evaluations including non-matches for complete audit trail"
  - "Separate investigation query to avoid nested relation complexity in findUnique"

patterns-established:
  - "Event listener with async: true for background processing"
  - "Facts building with both flat keys (severity) and nested objects (case.severity)"
  - "Graceful error handling - log but don't throw to avoid blocking case creation"

# Metrics
duration: 45min
completed: 2026-02-27
---

# Phase 40 Plan 03: Case Routing Listener Summary

**Event-driven case routing listener that evaluates rules on case.created, executes matched actions, and logs all evaluations for audit compliance**

## Performance

- **Duration:** 45 min (across sessions)
- **Started:** 2026-02-27T15:28:08Z
- **Completed:** 2026-02-27T16:15:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- CaseRoutingListener handles case.created events asynchronously (non-blocking)
- Facts built from case data including severity, category, location, and tags
- Rules evaluated via RulesEngineService with priority-based matching
- Matched actions executed automatically (e.g., assign_user, assign_team)
- All evaluations logged to RuleExecutionLog for audit compliance
- Already-assigned cases skipped (checked via Investigation.primaryInvestigatorId)
- Comprehensive unit tests covering 11 scenarios

## Task Commits

Tasks were committed in prior sessions under adjacent plan numbers:

1. **Task 1: Create CaseRoutingListener** - `7edf184` (feat(40-06))
2. **Task 2: Register in RulesModule** - `13deb9c` (feat(40-04))
3. **Task 3: Add unit tests** - `74b6e92` (test(40-04))

_Note: Work was done by prior session and committed under adjacent plan numbers_

## Files Created/Modified

- `apps/backend/src/modules/rules/listeners/case-routing.listener.ts` - Event listener for case.created routing (326 lines)
- `apps/backend/src/modules/rules/listeners/index.ts` - Barrel export for listeners
- `apps/backend/src/modules/rules/listeners/case-routing.listener.spec.ts` - Unit tests (11 passing)
- `apps/backend/src/modules/rules/rules.module.ts` - Registered CaseRoutingListener

## Decisions Made

1. **Proxy assignment check**: Case model lacks assignedToId/assignedTeamId fields, so check Investigation.primaryInvestigatorId as proxy for "already assigned" logic
2. **Separate query for investigations**: Used separate findFirst query instead of nested include to avoid type complexity
3. **Log no-match evaluations**: Even when no rules match, log the evaluation against first active rule for audit trail completeness
4. **Facts structure**: Both flat keys (severity, categoryId) and nested objects (case.severity, category.name) for flexible rule authoring

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed type issues in rule-tester.service.ts**

- **Found during:** Task 1 commit attempt
- **Issue:** Prisma JSON type casting and Category.parentCategoryId field name mismatch
- **Fix:** Added `as unknown as` casts and corrected field name from parentId to parentCategoryId
- **Files modified:** apps/backend/src/modules/rules/testing/rule-tester.service.ts
- **Verification:** TypeScript compilation passes
- **Impact:** Pre-existing issue in adjacent file, not part of plan scope

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix was necessary to unblock commit. No scope creep.

## Issues Encountered

- Prior session had already implemented the listener and tests under different commit messages (40-04, 40-06)
- Lint-staged hook was backing up and restoring files during commit, causing "no changes to commit" errors
- Resolution: Verified existing commits already contained the required work

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CaseRoutingListener active and ready to evaluate routing rules
- RulesEngineService integration complete with action executors
- Ready for Plan 40-04 (InvestigationStatusListener for cascading status changes)
- Ready for Plan 40-05 (Admin UI for rule management)

---

_Phase: 40-rules-engine-foundation_
_Completed: 2026-02-27_
