---
phase: 15
plan: 01
subsystem: backend-api
tags: [case-merge, person-case-association, rest-api, nestjs]
requires:
  - phase-14.2 (case creation and search fixes)
provides:
  - REST endpoints for case merge operations
  - REST endpoints for person-case associations
affects:
  - phase-15-02 (frontend case detail page will use these endpoints)
tech-stack:
  added: []
  patterns: [controller-service-pattern, hubspot-v4-associations]
key-files:
  created:
    - apps/backend/src/modules/associations/person-case/person-case-association.controller.ts
    - apps/backend/src/modules/associations/person-case/dto/create-person-case-association.dto.ts
    - apps/backend/src/modules/associations/person-case/dto/index.ts
  modified:
    - apps/backend/src/modules/cases/cases.controller.ts
    - apps/backend/src/modules/associations/person-case/person-case-association.service.ts
    - apps/backend/src/modules/associations/associations.module.ts
    - apps/backend/src/modules/associations/person-case/index.ts
decisions:
  - name: "Use URL param for target case in merge endpoint"
    rationale: "POST /cases/:id/merge with target in URL, source in body - cleaner REST semantics"
  - name: "Add remove() method to PersonCaseAssociationService"
    rationale: "Required for DELETE endpoint; soft-delete via status update is alternative for audit trail"
metrics:
  duration: ~37 minutes
  completed: 2026-02-10
---

# Phase 15 Plan 01: Backend REST Endpoints for Case Merge and Person-Case Associations Summary

**One-liner:** Exposed case merge operations and person-case associations via REST controllers - 5 new endpoints delegating to existing services.

## Tasks Completed

| Task | Name                                    | Commit  | Files                                                               |
| ---- | --------------------------------------- | ------- | ------------------------------------------------------------------- |
| 1    | Add merge endpoints to CasesController  | 8cde903 | cases.controller.ts                                                 |
| 2    | Create PersonCaseAssociation controller | 418105e | person-case-association.controller.ts, associations.module.ts, dto/ |

## What Was Built

### Case Merge Endpoints (CasesController)

Three new endpoints added to `apps/backend/src/modules/cases/cases.controller.ts`:

1. **POST /cases/:id/merge** - Merges source case into target case
   - Target case ID in URL param, source case ID + reason in body
   - Requires COMPLIANCE_OFFICER or SYSTEM_ADMIN role
   - Returns MergeResultDto with counts of moved associations

2. **GET /cases/:id/merge-history** - Returns all cases merged into this case
   - Returns array of MergeHistoryDto with merge details
   - Shows merged case reference, reason, who merged, when

3. **GET /cases/:id/can-merge/:targetId** - Checks if merge is feasible
   - Returns { canMerge: boolean, reason?: string }
   - Validates both cases exist, neither is already merged

### Person-Case Association Endpoints (new controller)

New controller at `apps/backend/src/modules/associations/person-case/person-case-association.controller.ts`:

1. **GET /cases/:caseId/persons** - List all persons connected to a case
   - Returns associations with person details
   - Includes evidentiary roles (REPORTER, SUBJECT, WITNESS) and role assignments

2. **POST /cases/:caseId/persons** - Add a person to a case with label
   - Requires CreatePersonCaseAssociationDto (personId, label, notes, evidentiaryStatus)
   - Requires COMPLIANCE_OFFICER, INVESTIGATOR, or SYSTEM_ADMIN role

3. **DELETE /cases/:caseId/persons/:associationId** - Remove association
   - Requires COMPLIANCE_OFFICER, INVESTIGATOR, or SYSTEM_ADMIN role

## Technical Decisions

1. **Endpoint Structure:** Used nested routes `/cases/:id/...` for both merge and persons endpoints, following REST conventions
2. **Route Ordering:** Placed merge endpoints before generic `:id` route to avoid NestJS routing conflicts
3. **DTO Reuse:** Leveraged existing MergeCaseDto, MergeResultDto, MergeHistoryDto from case-merge.service.ts
4. **New DTO Class:** Created CreatePersonCaseAssociationDto with class-validator decorators for controller validation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added remove() method to PersonCaseAssociationService**

- **Found during:** Task 2
- **Issue:** Service had no delete method, but controller needed DELETE endpoint
- **Fix:** Added remove() method with proper audit logging and event emission
- **Files modified:** person-case-association.service.ts
- **Commit:** 418105e

**2. [Rule 1 - Bug] Fixed displayName property reference**

- **Found during:** Task 2
- **Issue:** Person model has firstName/lastName, not displayName
- **Fix:** Changed to `${person.firstName} ${person.lastName}` concatenation
- **Files modified:** person-case-association.service.ts
- **Commit:** 418105e

## Verification Results

- TypeScript compiles without errors (ignoring pre-existing flagship-cases.ts issues)
- Merge endpoints verified in cases.controller.ts: POST :id/merge, GET :id/merge-history, GET :id/can-merge/:targetId
- Person-case endpoints verified: GET :caseId/persons, POST :caseId/persons, DELETE :caseId/persons/:associationId
- All endpoints protected with JwtAuthGuard + TenantGuard
- Write operations require appropriate roles via RolesGuard

## Next Phase Readiness

**Phase 15-02 can proceed:** All backend endpoints needed for case detail page are now available:

- Case CRUD (existing)
- Activity timeline (existing: GET /cases/:id/activity)
- Case merge operations (new)
- Person-case associations (new)

**Frontend work can now call:**

- `POST /api/v1/cases/:id/merge` for case consolidation
- `GET /api/v1/cases/:id/merge-history` for merge audit display
- `GET /api/v1/cases/:caseId/persons` for connected people panel
- `POST /api/v1/cases/:caseId/persons` for adding subjects/witnesses
