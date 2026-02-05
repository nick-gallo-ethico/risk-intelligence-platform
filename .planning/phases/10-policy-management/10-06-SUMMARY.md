---
phase: 10
plan: 06
subsystem: policy-management
tags: [policy, case, associations, violation-tracking, governance]

dependency-graph:
  requires: [10-02]
  provides: [PolicyCaseAssociationService, policy-case-linking]
  affects: [10-07, case-detail-views]

tech-stack:
  added: []
  patterns:
    - Bidirectional association queries
    - Violation statistics aggregation
    - Cross-entity activity logging

file-tracking:
  created:
    - apps/backend/src/modules/policies/associations/dto/association.dto.ts
    - apps/backend/src/modules/policies/associations/policy-case-association.service.ts
    - apps/backend/src/modules/policies/associations/policy-case-association.controller.ts
    - apps/backend/src/modules/policies/associations/index.ts
  modified:
    - apps/backend/src/modules/policies/policies.module.ts

decisions:
  - id: policy-case-link-types
    choice: "Three link types: VIOLATION, REFERENCE, GOVERNING"
    rationale: "Distinguishes policy violations from informational references and governance mappings"

metrics:
  duration: 14 min
  completed: 2026-02-05
---

# Phase 10 Plan 06: Policy-Case Associations Summary

Policy-case linking for violation tracking, reference documentation, and governance mapping with bidirectional queries and violation statistics.

## What Was Built

### DTOs (association.dto.ts)

- **CreatePolicyCaseAssociationDto**: policyId, policyVersionId (optional), caseId, linkType, linkReason, violationDate
- **UpdatePolicyCaseAssociationDto**: linkType, linkReason, violationDate updates
- **PolicyCaseQueryDto**: Filtering by policy, case, linkType with pagination
- **ViolationStatsQueryDto**: Date range and policy type filtering for stats

### PolicyCaseAssociationService

Core methods:
- `create()` - Links policy (specific version) to case with duplicate prevention
- `update()` - Updates link type, reason, or violation date
- `delete()` - Removes policy-case link with audit trail
- `findByPolicy()` - Returns all cases linked to a policy
- `findByCase()` - Returns all policies linked to a case (violations first)
- `findById()` - Single association lookup
- `findAll()` - Paginated query with filtering
- `getViolationStats()` - Aggregated violation counts by policy

Key features:
- Verifies both policy and case belong to organization before linking
- Defaults to latest published version if policyVersionId not specified
- Prevents duplicate links via unique constraint check
- Logs activity on BOTH policy and case when linked/unlinked
- Emits PolicyLinkedToCaseEvent and PolicyUnlinkedFromCaseEvent

### PolicyCaseAssociationController

REST endpoints at `/policy-case-associations`:
- `POST /` - Create link (SYSTEM_ADMIN, COMPLIANCE_OFFICER, INVESTIGATOR)
- `GET /` - Query with filtering (+ POLICY_AUTHOR, POLICY_REVIEWER)
- `GET /:id` - Get single association
- `PUT /:id` - Update association
- `DELETE /:id` - Delete association (returns 204)
- `GET /by-policy/:policyId` - Get all cases for a policy
- `GET /by-case/:caseId` - Get all policies for a case
- `GET /violation-stats` - Aggregated stats (SYSTEM_ADMIN, COMPLIANCE_OFFICER only)

## Link Types

| Type | Purpose | Use Case |
|------|---------|----------|
| VIOLATION | Policy was violated | Investigation found Code of Conduct breach |
| REFERENCE | Case references policy | Policy cited during investigation |
| GOVERNING | Policy governs situation | Anti-harassment policy applies to this case |

## Technical Implementation

### Tenant Isolation
- All queries filter by organizationId
- Policy and case ownership verified before linking
- Cross-organization links impossible

### Activity Logging
When linking:
- Case activity: "Policy linked: {policyTitle} (VIOLATION)"
- Policy activity: "Linked to case: {caseReference} (VIOLATION)"

When unlinking:
- Case activity: "Policy unlinked: {policyTitle}"
- Policy activity: "Unlinked from case: {caseReference}"

### Violation Statistics
```typescript
// Returns: { policyId, policyTitle, policyType, violationCount }[]
const stats = await service.getViolationStats(orgId, {
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-12-31'),
  policyType: PolicyType.CODE_OF_CONDUCT
});
```

## Verification Results

| Criterion | Status |
|-----------|--------|
| Build succeeds | PASS |
| create() verifies ownership | PASS |
| Unique constraint prevents duplicates | PASS |
| Bidirectional queries work | PASS |
| Activity logged on both entities | PASS |
| Violation stats aggregation | PASS |
| Role guards applied | PASS |

## Deviations from Plan

None - plan executed exactly as written.

## Files

| File | Lines | Purpose |
|------|-------|---------|
| dto/association.dto.ts | ~180 | DTOs for association CRUD and queries |
| policy-case-association.service.ts | ~800 | Core service with CRUD and stats |
| policy-case-association.controller.ts | ~290 | REST API endpoints |
| index.ts | ~3 | Module exports |

## Next Phase Readiness

- PolicyCaseAssociationService exported from PoliciesModule
- Ready for integration with case detail views
- Violation stats endpoint available for compliance dashboards
