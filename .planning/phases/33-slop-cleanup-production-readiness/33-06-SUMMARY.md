---
phase: 33-slop-cleanup-production-readiness
plan: 06
subsystem: code-quality
tags: [todo, jsdoc, code-cleanup, internal-auth]

requires:
  - phase: 33-04
    provides: Section separator cleanup batch 1
  - phase: 33-05
    provides: Section separator cleanup batch 2

provides:
  - Triaged all TODO comments with clear categorization
  - AUTH-TODO prefix for 22 internal auth-related TODOs
  - STUB-TODO prefix for 2 integration stub TODOs
  - Removed restating JSDoc from DTOs
  - 13 future enhancement TODOs retained with context

affects:
  - Any phase working on internal auth (InternalAuthGuard implementation)
  - Any phase adding email service (welcome email stub)
  - Any phase implementing message attachments

tech-stack:
  added: []
  patterns:
    - "AUTH-TODO prefix for internal auth TODOs tracked in SLOP-05"
    - "STUB-TODO prefix for integration stubs requiring library/service integration"
    - "JSDoc removal criteria: remove if only restating method/class name"

key-files:
  created: []
  modified:
    - apps/backend/src/modules/operations/impersonation/impersonation.controller.ts
    - apps/backend/src/modules/operations/implementation/implementation.controller.ts
    - apps/backend/src/modules/operations/implementation/go-live.controller.ts
    - apps/backend/src/modules/operations/hotline-ops/hotline-ops.controller.ts
    - apps/backend/src/modules/operations/client-success/client-success.controller.ts
    - apps/backend/src/modules/users/users.service.ts
    - apps/backend/src/modules/portals/ethics/ethics-portal.service.ts
    - apps/backend/src/modules/feature-flags/dto/feature-flag.dto.ts
    - apps/backend/src/modules/users/dto/user-response.dto.ts
    - apps/backend/src/modules/audit/dto/audit-log-query.dto.ts
    - apps/backend/src/modules/audit/dto/audit-log-response.dto.ts
    - apps/backend/src/modules/saved-views/dto/saved-view.dto.ts

key-decisions:
  - "AUTH-TODO prefix for internal operations auth TODOs (InternalAuthGuard, InternalUserGuard)"
  - "STUB-TODO prefix for integration stubs (email service, message attachments)"
  - "Conservative JSDoc removal - only remove if zero additional context beyond name"

patterns-established:
  - "AUTH-TODO: Track auth-related TODOs separately for InternalAuth implementation phase"
  - "STUB-TODO: Track integration stubs requiring external library/service"
  - "JSDoc retention: Keep if provides warnings, notes, throws, or usage examples"

duration: 25min
completed: 2026-02-16
---

# Phase 33 Plan 06: TODO Triage and JSDoc Cleanup Summary

**Systematic triage of 36 TODOs into AUTH-TODO (22), STUB-TODO (2), and future enhancement (13) categories; removed 12 restating JSDoc comments from DTOs**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-02-16T01:45:16Z
- **Completed:** 2026-02-16T02:10:00Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Converted 22 auth-related TODOs to AUTH-TODO prefix for internal operations controllers
- Marked 2 integration stubs with STUB-TODO prefix (email service, message attachments)
- Retained 13 legitimate future enhancement TODOs with clear context
- Removed 12 restating JSDoc comments that added no value beyond class/method names
- TypeScript compiles clean, lint passes with 0 errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Triage auth-related TODOs** - `98c7e03` (refactor)
2. **Task 2: Triage integration stubs** - Included in `09a645b` due to concurrent lint-staged execution
3. **Task 3: Remove restating JSDoc** - `c7968cd` (refactor)

## Files Modified

### Task 1 - Auth-related TODOs (5 files)

- `apps/backend/src/modules/operations/impersonation/impersonation.controller.ts` - Internal session management
- `apps/backend/src/modules/operations/implementation/implementation.controller.ts` - Implementation project API
- `apps/backend/src/modules/operations/implementation/go-live.controller.ts` - Go-live readiness API
- `apps/backend/src/modules/operations/hotline-ops/hotline-ops.controller.ts` - Hotline operations
- `apps/backend/src/modules/operations/client-success/client-success.controller.ts` - Client success dashboard

### Task 2 - Integration Stubs (2 files)

- `apps/backend/src/modules/users/users.service.ts` - Welcome email stub
- `apps/backend/src/modules/portals/ethics/ethics-portal.service.ts` - Message attachments stub

### Task 3 - JSDoc Removal (5 files)

- `apps/backend/src/modules/feature-flags/dto/feature-flag.dto.ts` - Removed 3 restating JSDoc
- `apps/backend/src/modules/users/dto/user-response.dto.ts` - Removed 3 restating JSDoc
- `apps/backend/src/modules/audit/dto/audit-log-query.dto.ts` - Removed 1 restating JSDoc
- `apps/backend/src/modules/audit/dto/audit-log-response.dto.ts` - Removed 2 restating JSDoc
- `apps/backend/src/modules/saved-views/dto/saved-view.dto.ts` - Removed 2 restating JSDoc

## TODO Categorization Summary

| Category           | Count  | Action                                        |
| ------------------ | ------ | --------------------------------------------- |
| AUTH-TODO          | 22     | Marked for internal auth implementation phase |
| STUB-TODO          | 2      | Marked for service integration                |
| Future enhancement | 13     | Retained with clear context                   |
| **Total**          | **37** | All triaged                                   |

### Future Enhancement TODOs Retained

- Pipeline: 3 (tenant-specific pipeline configs)
- Skill registry: 1 (triage skill integration)
- My Work: 1 (snooze preferences table)
- QA Queue: 1 (keyword trigger flags)
- Forms: 1 (organization slug resolution)
- User tables: 1 (team membership check)
- Templates: 2 (team membership filtering)
- Policy indexer: 2 (attestation campaign integration)

## Decisions Made

1. **AUTH-TODO prefix for internal operations** - All internal operations controllers (impersonation, implementation, hotline-ops, client-success) use InternalAuthGuard/InternalUserGuard which is not yet implemented. Using AUTH-TODO prefix makes them searchable and trackable for future implementation.

2. **STUB-TODO for integration stubs** - Two specific stubs (welcome email, message attachments) require external service integration. Using STUB-TODO prefix distinguishes them from future enhancements.

3. **Conservative JSDoc removal** - Only removed JSDoc that literally restated the class/method name with no additional context. Kept JSDoc with notes, warnings, @throws, or usage examples.

## Deviations from Plan

### Concurrent Execution Issue

Task 2 STUB-TODO changes were included in a parallel 33-07 commit (`09a645b`) due to lint-staged including staged files during concurrent execution. The changes were correctly applied but the commit attribution is mixed.

**Impact:** Changes are correct, only commit history is affected. No functional impact.

## Issues Encountered

- **Baseline mismatch**: Research estimated 54 TODOs, actual baseline was 36. Possibly reduced in earlier phases.
- **Concurrent execution**: Another plan (33-07) ran in parallel, causing lint-staged to include Task 2 changes in that commit.

## Next Phase Readiness

- All TODOs are now properly categorized and searchable
- AUTH-TODO markers ready for InternalAuth implementation phase
- STUB-TODO markers ready for service integration phases
- Code quality improved with less restating JSDoc noise

---

_Phase: 33-slop-cleanup-production-readiness_
_Completed: 2026-02-16_
