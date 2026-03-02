---
phase: 41-sla-monitoring-escalation
plan: 01
subsystem: workflow
tags: [sla, case-management, prisma, dto, nestjs, configuration]

# Dependency graph
requires:
  - phase: 07-notifications-email
    provides: SLA events and notification infrastructure
  - phase: 40-rules-engine-foundation
    provides: Rules engine patterns for future escalation rules
provides:
  - Case.slaState and Case.slaDueDate schema fields
  - Organization.caseSlaConfig for org-level SLA settings
  - CaseSlaConfig interface with severity/category overrides
  - CaseSlaState interface for deduplication tracking
  - DEFAULT_CASE_SLA_CONFIG constant with standard defaults
  - SlaConfigService with getConfig, updateConfig, resetConfig, calculateDueDate
  - UpdateCaseSlaConfigDto with class-validator decorators
affects: [41-02, 41-03, 41-04, 41-05, 41-06, case-management, escalation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSON config stored in Organization model for tenant-specific settings"
    - "Service pattern for reading/merging JSON configuration"

key-files:
  created:
    - apps/backend/src/modules/workflow/sla/sla-config.service.ts
    - apps/backend/src/modules/workflow/sla/dto/sla-config.dto.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/workflow/sla/sla.types.ts
    - apps/backend/src/modules/workflow/sla/index.ts
    - apps/backend/src/modules/workflow/workflow.module.ts

key-decisions:
  - "SLA config stored in Organization.caseSlaConfig JSON field (not separate table)"
  - "Case.slaState used for deduplication tracking to prevent notification spam"
  - "Default SLA: HIGH=7d, MEDIUM=14d, LOW=30d with 80% warning threshold"
  - "Category overrides take precedence over severity overrides"

patterns-established:
  - "CaseSlaConfig: org-level configuration with severity/category overrides"
  - "CaseSlaState: per-entity tracking for notification deduplication"

# Metrics
duration: 15min
completed: 2026-03-02
---

# Phase 41 Plan 01: Case SLA Configuration Model and Service Summary

**CaseSlaConfig type and SlaConfigService for organization-level case SLA settings with severity/category override support**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-02T15:14:12Z
- **Completed:** 2026-03-02T15:29:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Schema extended with Case.slaState and Case.slaDueDate for SLA tracking
- Organization.caseSlaConfig field for per-org SLA configuration
- CaseSlaConfig and CaseSlaState types for type-safe configuration
- SlaConfigService with full CRUD and SLA due date calculation
- UpdateCaseSlaConfigDto with comprehensive validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend schema with Case SLA fields** - `5f3a07a7` (feat)
2. **Task 2: Create CaseSlaConfig type and DTO** - `58692c60` (feat)
3. **Task 3: Create SlaConfigService** - `e595ee34` (feat)

## Files Created/Modified

- `apps/backend/prisma/schema.prisma` - Added slaState, slaDueDate to Case; caseSlaConfig to Organization
- `apps/backend/src/modules/workflow/sla/sla.types.ts` - Added CaseSlaConfig, CaseSlaState, DEFAULT_CASE_SLA_CONFIG
- `apps/backend/src/modules/workflow/sla/dto/sla-config.dto.ts` - Created UpdateCaseSlaConfigDto with validation
- `apps/backend/src/modules/workflow/sla/sla-config.service.ts` - Created SlaConfigService
- `apps/backend/src/modules/workflow/sla/index.ts` - Export new service and DTO
- `apps/backend/src/modules/workflow/workflow.module.ts` - Register SlaConfigService

## Decisions Made

- **JSON field vs separate table:** Used Organization.caseSlaConfig JSON field for simplicity; can migrate to table later if reporting needs grow
- **Deduplication via CaseSlaState:** Track lastStatus and lastNotifiedAt per case to prevent notification spam on 5-minute checks
- **Override precedence:** Category overrides > Severity overrides > Default days
- **Default thresholds:** 80% warning (RULE-03), 48h critical escalation per research recommendations

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed test mocks for new caseSlaConfig field**

- **Found during:** Task 3 (TypeScript compilation)
- **Issue:** After Prisma generate, test files with mock Organization objects failed TypeScript because caseSlaConfig field was missing
- **Fix:** Added `caseSlaConfig: null` to mock Organization objects in 3 test files
- **Files modified:** azure-ad.strategy.spec.ts, google.strategy.spec.ts, saml.strategy.spec.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** e595ee34 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix required due to schema change propagation to Prisma client types. No scope creep.

## Issues Encountered

- Prisma client needed regeneration after schema changes - resolved with `npx prisma generate`
- Nullable JSON fields in Prisma appear as required in some TypeScript contexts - resolved by explicitly setting null in mocks

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SLA configuration infrastructure ready for 41-02 (CaseSlaTrackerService)
- Schema fields ready for SLA tracking data
- Service ready for admin UI integration in 41-06
- No blockers for continuing Phase 41

---

_Phase: 41-sla-monitoring-escalation_
_Completed: 2026-03-02_
