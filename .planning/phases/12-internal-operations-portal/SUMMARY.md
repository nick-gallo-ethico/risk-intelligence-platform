# Phase 12: Internal Operations Portal - Summary

## What We're Building

Phase 12 delivers the **internal tooling** that enables Ethico teams to support, implement, and manage client tenants. This is LAUNCH-CRITICAL infrastructure.

## The Four Portals

### 1. Support Console (Plans 12-01, 12-04, 12-11)
**For:** Support Team (Tier 1, Tier 2, Admin)

| Feature | Description |
|---------|-------------|
| Tenant Switcher | Search & impersonate client accounts with audit trail |
| Cross-Tenant Search | Find cases, users, errors across all tenants |
| Error Log Viewer | Filter, correlate, and diagnose issues |
| Config Inspector | View (and override with approval) tenant settings |
| System Health | Platform-wide metrics and alerts |

### 2. Implementation Portal (Plans 12-02, 12-05, 12-06, 12-09, 12-10, 12-12, 12-13, 12-16)
**For:** Implementation Specialists & Managers

| Feature | Description |
|---------|-------------|
| Project Dashboard | All assigned implementations with health indicators |
| Checklist Tracker | Phase-based task tracking with templates |
| Migration Wizard | 7-step data import with validation & rollback |
| Blocker Board | Track and escalate client blockers |
| Training Admin | Certification tracking and exam management |
| Go-Live Readiness | Checklist, scoring, multi-party sign-off |

### 3. Hotline Operations (Plans 12-07, 12-14)
**For:** Hotline Supervisors

| Feature | Description |
|---------|-------------|
| Directive Editor | CRUD with versioning for call scripts |
| Bulk QA Actions | Approve/reject multiple items at once |
| Case Reassignment | Move cases between investigators |
| Analytics | Directive usage, QA throughput metrics |

### 4. Client Success Dashboard (Plans 12-03, 12-08, 12-15)
**For:** Customer Success Managers

| Feature | Description |
|---------|-------------|
| Health Dashboard | Composite scores for all assigned clients |
| Usage Metrics | Logins, cases, campaigns, reports over time |
| Feature Adoption | Which features used, training gaps |
| Renewal Risk | Predictive indicators for at-risk accounts |
| Engagement History | Timeline of CSM interactions |

## Tech Debt (Plans 12-18, 12-19)

### Backend (12-18)
- WebSocket E2E testing
- Auth edge cases (token refresh, SSO timeout)
- Query optimization (N+1 fixes)
- Index tuning
- Cache refinement
- Error standardization
- Batch operation limits

### Frontend (12-19)
- Bundle splitting (route-based code splitting)
- Lazy loading (charts, editors)
- Accessibility audit (WCAG 2.1 AA)
- Form state management consolidation
- Error boundaries
- Loading states
- Mobile responsive verification
- Test coverage

## Plan Structure

| Plan | Wave | Focus |
|------|------|-------|
| 12-01 | 1 | Cross-tenant access infrastructure |
| 12-02 | 1 | Implementation project models |
| 12-03 | 1 | Client health metrics models |
| 12-04 | 2 | Support Console service |
| 12-05 | 2 | Implementation checklist service |
| 12-06 | 2 | Migration wizard service |
| 12-07 | 2 | Hotline operations service |
| 12-08 | 3 | Client success service |
| 12-09 | 3 | Training administration |
| 12-10 | 3 | Go-live readiness |
| 12-11 | 4 | Support Console UI |
| 12-12 | 4 | Implementation Portal UI |
| 12-13 | 4 | Migration Wizard UI |
| 12-14 | 4 | Hotline Operations UI |
| 12-15 | 5 | Client Success UI |
| 12-16 | 5 | Training Portal UI |
| 12-17 | 5 | Internal admin settings |
| 12-18 | TD | Backend tech debt |
| 12-19 | TD | Frontend tech debt |

## Key Architecture Decisions

1. **Explicit Impersonation Sessions** - Cross-tenant access requires explicit session with reason, audit, and timeout
2. **Internal Roles Separate from Client Roles** - InternalRole enum for Ethico staff permissions
3. **Reuse Existing Infrastructure** - Builds on Phase 8 portals, Phase 11 migration & dashboard patterns
4. **Full Audit Trail** - Every cross-tenant action logged to ImpersonationAuditLog

## Dependencies

- **Phase 11** - Dashboard configuration (11-01), Migration infrastructure (11-04)
- **Phase 8** - Portal patterns, QA queue, directives service
- **Phase 1** - Audit logging, job queues

## Estimated Timeline

~3 weeks with focused execution:
- Wave 1-2: 5-7 days (infrastructure + core services)
- Wave 3: 2-3 days (advanced services)
- Wave 4-5: 8-10 days (UI + tech debt)

## Next Steps

1. Complete Phase 10 remaining plans (10-10, 10-11)
2. Complete Phase 11 remaining plans (11-02, 11-05 through 11-21)
3. Execute Phase 12 plans

**To start Phase 12:** `/gsd:plan-phase 12`
