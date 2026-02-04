---
phase: 08-portals
plan: 06
subsystem: employee-portal
tags: [history, proxy-reporting, compliance-overview, manager-reports]
dependency-graph:
  requires: ["08-04"]
  provides: ["EmployeeHistoryService", "ManagerProxyService", "employee-history-endpoints", "proxy-report-endpoints"]
  affects: ["08-07", "09-attestation-ui"]
tech-stack:
  added: []
  patterns: ["paginated-history", "proxy-submission", "compliance-scoring", "manager-hierarchy-traversal"]
key-files:
  created:
    - apps/backend/src/modules/portals/employee/employee-history.service.ts
    - apps/backend/src/modules/portals/employee/manager-proxy.service.ts
    - apps/backend/src/modules/portals/employee/types/employee-history.types.ts
    - apps/backend/src/modules/portals/employee/dto/employee-views.dto.ts
    - apps/backend/src/modules/portals/employee/dto/proxy-report.dto.ts
  modified:
    - apps/backend/src/modules/portals/employee/employee-portal.controller.ts
    - apps/backend/src/modules/portals/employee/employee-portal.module.ts
    - apps/backend/src/modules/portals/employee/dto/index.ts
    - apps/backend/src/modules/portals/employee/index.ts
decisions: ["transitive-manager-check"]
metrics:
  duration: "16 min"
  completed: "2026-02-04"
---

# Phase 8 Plan 6: Employee History and Manager Proxy Summary

**One-liner:** Employee history views (reports, disclosures, attestations) with compliance score, plus manager proxy reporting with audit trail.

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create EmployeeHistoryService for my views | 9214d28 | employee-history.service.ts, employee-history.types.ts |
| 2 | Create ManagerProxyService for proxy reporting | f580bdb | manager-proxy.service.ts, proxy-report.dto.ts |
| 3 | Add Employee Portal history and proxy endpoints | d484ec2 | employee-portal.controller.ts, employee-portal.module.ts, employee-views.dto.ts |

## What Was Built

### EmployeeHistoryService

Provides history views for employees to see their compliance activity:

- **getMyReports()** - RIUs where employee is REPORTER, includes case status if linked
- **getMyDisclosures()** - Disclosure campaign assignments with type extraction
- **getMyAttestations()** - Attestation campaign assignments sorted pending-first
- **getComplianceOverview()** - Summary counts and weighted compliance score (60% attestations, 40% disclosures)

### ManagerProxyService

Enables managers to submit reports on behalf of their team:

- **getTeamMembers()** - Direct reports from Person hierarchy
- **canProxyFor()** - Validates manager-employee relationship (direct or transitive)
- **submitProxyReport()** - Creates RIU with proxy metadata, generates access code for employee
- **getProxySubmissions()** - History of reports submitted by this manager

Key features:
- Transitive manager check walks up hierarchy (max 10 levels)
- ProxyReason enum for audit trail (REQUESTED_BY_EMPLOYEE, LANGUAGE_BARRIER, TECHNICAL_DIFFICULTY, OTHER)
- Access code generated for employee (not manager) per CONTEXT.md

### New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/employee/reports` | GET | Employee's submitted RIUs |
| `/api/v1/employee/disclosures` | GET | Disclosure campaign history |
| `/api/v1/employee/attestations` | GET | Attestation history |
| `/api/v1/employee/overview` | GET | Compliance score and counts |
| `/api/v1/employee/team` | GET | Manager's direct reports |
| `/api/v1/employee/proxy-report` | POST | Submit proxy report |
| `/api/v1/employee/proxy-submissions` | GET | Manager's proxy history |

## Decisions Made

### Transitive Manager Check (transitive-manager-check)

**Decision:** Support skip-level managers for proxy reporting via hierarchy traversal.

**Rationale:** In large organizations, directors/VPs may need to submit proxy reports for employees several levels down. Walking up the manager chain enables this while maintaining audit trail.

**Implementation:** `checkTransitiveManagership()` recursively checks managerId chain with maxDepth=10 to prevent infinite loops.

## Deviations from Plan

None - plan executed exactly as written.

## Technical Patterns Established

1. **Person ID Lookup** - User->Person link via email match pattern established for all employee portal endpoints
2. **Proxy Metadata** - `customFields` JSON field stores proxy submission context (submitterId, reason, notes)
3. **Compliance Score** - Weighted average: attestations (60%) + disclosures (40%)
4. **Access Code Segregation** - Proxy reports generate access code for employee, not the manager who submitted

## Files Summary

```
apps/backend/src/modules/portals/employee/
  employee-history.service.ts    # 400 lines - history view queries
  manager-proxy.service.ts       # 450 lines - proxy validation and submission
  types/employee-history.types.ts # 90 lines - history response types
  dto/employee-views.dto.ts      # 95 lines - query DTOs
  dto/proxy-report.dto.ts        # 105 lines - proxy DTOs
  employee-portal.controller.ts  # 400 lines - 11 endpoints total
  employee-portal.module.ts      # 33 lines - updated providers
```

## Next Phase Readiness

Ready for:
- 08-07: Manager team compliance dashboard (builds on getTeamMembers)
- Attestation campaign UI (uses getMyAttestations endpoint)
- Disclosure workflow UI (uses getMyDisclosures endpoint)

## Testing Notes

- History endpoints return empty results (not errors) for users without Person record
- Proxy submission requires manager relationship - returns 403 if not authorized
- Access code generation uses retry loop (max 10 attempts) for uniqueness
