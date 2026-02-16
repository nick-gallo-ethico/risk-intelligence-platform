---
phase: 33-slop-cleanup-production-readiness
plan: 09
subsystem: code-quality
tags: [todo-triage, slop-cleanup, code-review, technical-debt]

# Dependency graph
requires:
  - phase: 33-06
    provides: Initial TODO triage with AUTH-TODO and STUB-TODO prefixes
provides:
  - Complete verification of TODO triage (SLOP-05 gap closure)
  - Documented categorization of all 37 TODOs
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AUTH-TODO prefix for internal operations auth"
    - "STUB-TODO prefix for integration stubs"
    - "Plain TODO for future enhancements"

key-files:
  created: []
  modified: []

key-decisions:
  - "Plan 33-06 already completed TODO triage - no additional changes needed"
  - "12 plain TODOs retained as valid future enhancements with good context"

patterns-established:
  - "TODO categorization: AUTH-TODO (23), STUB-TODO (2), Plain TODO (12)"
  - "All auth TODOs in operations modules marked for InternalAuthGuard implementation"

# Metrics
duration: 5min
completed: 2026-02-16
---

# Phase 33 Plan 09: TODO Triage Gap Closure Summary

**Verified SLOP-05 complete: all 37 TODOs properly categorized (23 AUTH-TODO, 2 STUB-TODO, 12 future enhancements)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-16T14:04:16Z
- **Completed:** 2026-02-16T14:09:00Z
- **Tasks:** 2 (verification only - no code changes needed)
- **Files modified:** 0

## Accomplishments

- Verified Plan 33-06 already completed TODO triage correctly
- Inventoried all 37 TODOs with full categorization
- Confirmed all success criteria met without additional changes
- SLOP-05 gap closure complete

## TODO Inventory

**Category 1: AUTH-TODO (23 instances)**
Internal operations auth requiring InternalAuthGuard:

- `client-success.controller.ts` (1)
- `hotline-ops.controller.ts` (8)
- `impersonation.controller.ts` (3)
- `go-live.controller.ts` (3)
- `implementation.controller.ts` (8)

**Category 2: STUB-TODO (2 instances)**

- `ethics-portal.service.ts:534` - Message attachments
- `users.service.ts:99` - Welcome email service

**Category 3: Future Enhancements - Plain TODO (12 instances)**
Valid items with clear context retained as-is:

1. `skill.registry.ts:22` - Register triage skill when disclosures module ready
2. `my-work.controller.ts:269` - Store snooze in user_task_preferences table
3. `pipeline.service.ts:141` - Tenant-specific pipeline configs
4. `pipeline.service.ts:163` - Check tenant-specific pipeline first
5. `pipeline.service.ts:197` - Persist to database for tenant customization
6. `forms.controller.ts:279` - Resolve organization by slug
7. `template.service.ts:93` - Implement team membership check
8. `template.service.ts:109` - Filter by actual team membership
9. `qa-queue.service.ts:590` - KEYWORD_TRIGGER and HIGH_RISK_CATEGORY flags
10. `policy.indexer.ts:88` - Attestation campaigns integration
11. `policy.indexer.ts:89` - Attestation tracking calculation
12. `user-table.service.ts:667` - Team membership check

## Task Commits

No code changes required - Plan 33-06 already completed the triage.

1. **Task 1: Inventory and categorize TODOs** - Verification only (no commit)
2. **Task 2: Process each TODO** - Confirmed already processed (no commit)

**Plan metadata:** Created summary only

## Files Created/Modified

None - verification plan only.

## Decisions Made

- **No changes needed:** Plan 33-06 already triaged all 54 original TODOs correctly. The 37 remaining were intentionally kept as:
  - 23 AUTH-TODO (internal auth)
  - 2 STUB-TODO (integration stubs)
  - 12 future enhancements

- **Plain TODOs retained:** All 12 plain TODOs are valid future enhancements with clear context. Converting them to a different format would not add value.

## Deviations from Plan

None - plan executed exactly as written. Verification confirmed no additional processing needed.

## Issues Encountered

None - the TODO triage was already complete from Plan 33-06.

## Verification Results

| Success Criteria                   | Status                  |
| ---------------------------------- | ----------------------- |
| Zero unmarked auth TODOs           | PASS (0 found)          |
| Integration stubs marked STUB-TODO | PASS (2 marked)         |
| Completed work TODOs removed       | PASS (removed in 33-06) |
| Future enhancements retained       | PASS (12 kept)          |
| TypeScript compilation             | PASS                    |
| SLOP-05 gap closed                 | PASS                    |

## Next Phase Readiness

- SLOP-05 (TODO cleanup) requirement fully satisfied
- Phase 33 complete with all 7 plans + 2 gap closure plans
- Ready for Phase 34 continuation

---

_Phase: 33-slop-cleanup-production-readiness_
_Completed: 2026-02-16_
