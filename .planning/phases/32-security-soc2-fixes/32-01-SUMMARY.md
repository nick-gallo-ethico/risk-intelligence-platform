---
phase: 32-security-soc2-fixes
plan: 01
subsystem: authentication
tags: [security, jwt, guards, controllers, authentication]
dependency-graph:
  requires: []
  provides:
    - Secured campaigns controller
    - Secured attestation controller
    - Secured conflict controller
    - Secured checklist controller
  affects: [all API consumers]
tech-stack:
  added: []
  patterns: [JWT authentication, RBAC roles, tenant isolation]
key-files:
  created: []
  modified:
    - apps/backend/src/modules/campaigns/campaigns.controller.ts
    - apps/backend/src/modules/campaigns/attestation/attestation.controller.ts
    - apps/backend/src/modules/disclosures/conflict.controller.ts
    - apps/backend/src/modules/investigations/checklists/checklist.controller.ts
decisions:
  - Employee-facing attestation endpoints allow all authenticated roles
  - Investigator role included for conflict and checklist read access
  - userName derived from user.firstName + user.lastName in checklist controller
metrics:
  duration: 12 minutes
  completed: 2026-02-15
---

# Phase 32 Plan 01: Secure 4 Unauthenticated Controllers Summary

**One-liner:** Added JWT authentication guards and replaced hardcoded tenant/user IDs with decorator injection on 4 controllers (campaigns, attestation, conflict, checklist).

## What Was Built

Secured 4 controllers that previously bypassed authentication by using hardcoded `TEMP_ORG_ID` and `TEMP_USER_ID` values, allowing unauthenticated access to demo tenant data.

### Files Modified

| File | Changes |
|------|---------|
| `campaigns.controller.ts` | Added guards, replaced 25+ hardcoded ID usages |
| `attestation.controller.ts` | Added guards, replaced 10+ hardcoded ID usages |
| `conflict.controller.ts` | Added guards, replaced 10+ hardcoded ID usages |
| `checklist.controller.ts` | Added guards, replaced 8 stub ID usages |

### Security Pattern Applied

Each controller now has:
1. **Class-level guards:** `@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)`
2. **Bearer auth docs:** `@ApiBearerAuth()` for Swagger
3. **Role requirements:** `@Roles()` decorator on each endpoint
4. **Proper injection:** `@TenantId()` and `@CurrentUser()` decorators

### Role Assignments

| Controller | Admin Operations | Read Operations | Employee Operations |
|------------|-----------------|-----------------|---------------------|
| CampaignsController | SYSTEM_ADMIN, COMPLIANCE_OFFICER | +TRIAGE_LEAD | N/A |
| AttestationController | SYSTEM_ADMIN, COMPLIANCE_OFFICER | +POLICY_AUTHOR | All roles |
| ConflictController | SYSTEM_ADMIN, COMPLIANCE_OFFICER | +INVESTIGATOR | N/A |
| ChecklistController | SYSTEM_ADMIN, COMPLIANCE_OFFICER | +INVESTIGATOR, TRIAGE_LEAD | N/A |

## Task Execution

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Secure CampaignsController | bc22caa | Complete |
| 2 | Secure AttestationController | 6820ced | Complete |
| 3 | Secure ConflictController and ChecklistController | 0cc6812 | Complete |

## Verification Results

- **TypeScript:** No type errors in modified files
- **Hardcoded IDs:** All removed from 4 files
- **Guards:** All 4 controllers have `@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)`
- **Lint:** No lint errors in modified files (pre-existing error in unrelated file)

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

1. **Employee endpoints in AttestationController:** These endpoints (my-pending, my-history, submit, assignment) allow all authenticated roles since any employee can submit attestations.

2. **userName in ChecklistController:** Derived from `user.firstName + user.lastName` with fallback to `user.email`.

3. **employeeId in AttestationController:** Service layer should handle employee lookup from user.id since employeeId is not on RequestUser interface.

## Next Phase Readiness

This plan secures 4 of the authentication bypass issues. Additional controllers may need similar treatment - check other controllers for TEMP_ORG_ID patterns.

Related plans in this phase:
- 32-02: Additional controller security
- 32-03: Rate limiting
- 32-04: JWT algorithm pinning
