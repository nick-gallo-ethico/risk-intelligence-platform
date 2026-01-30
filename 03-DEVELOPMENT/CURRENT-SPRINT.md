# Current Sprint

**Focus:** Tier 1 - Foundation
**Slice:** 1.1 Authentication & Multi-Tenancy → 1.2 Core Case Flow
**Started:** 2026-01-29

---

## Completed

### Slice 1.1 - Authentication & Multi-Tenancy ✅

- [x] Create Prisma schema for User, Organization, Session
- [x] Run database migration (`20260129213317_init`)
- [x] Seed test data (Acme Corp org + 4 test users)
- [x] Verify backend health endpoint works
- [x] Create AuthModule with JWT strategy
  - `src/modules/auth/` - Complete auth module
  - Login, refresh, logout endpoints working
  - JWT contains organizationId for tenant context
- [x] Add RLS policies to PostgreSQL
  - Migration: `20260129221829_add_rls_policies`
  - Policies on users, sessions tables
  - `app.current_organization` and `app.bypass_rls` settings
- [x] Update TenantMiddleware to set RLS context from JWT
- [x] Create frontend login page with API integration
  - `src/app/login/page.tsx` - Login form
  - `src/app/dashboard/page.tsx` - Protected dashboard
  - `src/contexts/auth-context.tsx` - Auth state management
  - `src/lib/api.ts` - Token refresh queue
- [x] Implement logout functionality on frontend

**Commits:**
- `ca1f3b8` - Initial scaffold
- `040228d` - feat(auth): Add complete authentication module with JWT
- `ea153a1` - feat(security): Add PostgreSQL Row-Level Security for tenant isolation
- `98f2c38` - feat(frontend): Add login page with auth context and token management

---

## In Progress

### Slice 1.2 - Core Case Flow

- [x] **Issue #5:** Tenant isolation test infrastructure ✅
  - `test/helpers/test-setup.ts` - Creates 2 test orgs with real JWT tokens
  - `test/tenant-isolation.e2e-spec.ts` - E2E tests for RLS verification
- [x] **Issue #6:** Case entity Prisma schema ✅
  - Added Case model with 50+ fields (intake, reporter, location, AI enrichment)
  - Enums: CaseStatus, SourceChannel, CaseType, ReporterType, Severity
  - Migration: `20260130_add_case_entity`
- [x] **Issue #7:** Case CRUD endpoints ✅
  - Full REST API: create, list, get, update, status change, close
  - Auto-generated reference numbers (ETH-YYYY-NNNNN)
  - Pagination, filtering, search support
  - All endpoints tenant-isolated via organizationId
- [ ] **Issue #15:** Case list page (frontend)

---

## Up Next

- [ ] **Issue #8-9:** Investigation entity + CRUD
- [ ] **Issue #11:** Case activity log
- [ ] **Issue #17-20:** Case detail page with 3-column layout
- [ ] **Issue #25:** End-to-end smoke test

---

## Blocked

(none)

---

## Context for This Sprint

**Reference files:**
- Entity pattern: `CLAUDE.md` → Development Patterns section
- Auth spec: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md`
- Core data model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
- Case PRD: `02-MODULES/05-CASE-MANAGEMENT/PRD.md`

**Test credentials:**
- `admin@acme.local` / `Password123!` / SYSTEM_ADMIN
- `compliance@acme.local` / `Password123!` / COMPLIANCE_OFFICER
- `investigator@acme.local` / `Password123!` / INVESTIGATOR
- `employee@acme.local` / `Password123!` / EMPLOYEE

---

## GitHub Issues

Created from `docs/SLICE-1-ISSUES.md`:
- See: https://github.com/nick-gallo-ethico/risk-intelligence-platform/issues

---

## History

| Date | What | Commit |
|------|------|--------|
| 2026-01-29 | Sprint initialized with Slice 1.1 | — |
| 2026-01-29 | Infrastructure verified: Docker, DB migration, seed | — |
| 2026-01-29 | AuthModule complete: login, refresh, logout, JWT | `040228d` |
| 2026-01-29 | RLS policies added for tenant isolation | `ea153a1` |
| 2026-01-29 | Frontend login page complete | `98f2c38` |
| 2026-01-29 | Slice 1.1 COMPLETE - Starting Slice 1.2 | — |
| 2026-01-30 | Case entity schema + tenant isolation tests | `3ede126` |
| 2026-01-30 | Case CRUD endpoints (create, list, get, update, close) | `f9b3ce2` |
