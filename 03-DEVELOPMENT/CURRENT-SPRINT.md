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

## Completed

### Slice 1.2 - Core Case Flow ✅

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
- [x] **Issue #15:** Case list page (frontend) ✅
  - `/cases` route with paginated table
  - Filter by status, severity, search text
  - Navigation from Dashboard card click
  - shadcn/ui components: Table, Badge, Select

---

## Completed

### Slice 1.3 - Core Entities & Activity Logging ✅

- [x] **Task 1.3.1:** AuditLog entity with Prisma schema ✅
  - AuditLog model with entityType, entityId, action, changes JSON
  - Natural language `actionDescription` field for AI-first design
- [x] **Task 1.3.2:** AuditLog RLS policies ✅
  - Row-Level Security on audit_log table
  - Tenant isolation enforced at database level
- [x] **Task 1.3.3:** Activity Service DTOs ✅
  - CreateActivityDto, ActivityQueryDto, ActivityResponseDto
  - Validation decorators and Swagger documentation
- [x] **Task 1.3.4:** Natural Language Description Generator ✅
  - ActivityDescriptionGenerator service
  - Template-based descriptions for all entity actions
- [x] **Task 1.3.5:** Unified ActivityService implementation ✅
  - `log()` method for recording activities
  - `getEntityTimeline()` for retrieving activity history
  - Full tenant isolation
- [x] **Task 1.3.6:** Activity Controller & Module ✅
  - GET `/api/v1/activity` - List activities with filters
  - GET `/api/v1/activity/entity/:type/:id` - Entity timeline
  - ActivityModule as global module
- [x] **Task 1.3.7:** Activity Timeline E2E Tests ✅
  - Tenant isolation tests for activity logs
  - Timeline retrieval tests
- [x] **Task 1.3.8:** Integrate ActivityService with Case Module ✅
  - CaseService now uses unified ActivityService
  - Natural language descriptions for all case mutations
  - Full test suite passing

---

## Completed

### Slice 1.4 - Investigation & Case Detail UI ✅

**Backend (Tasks 1.4.1-1.4.6):**
- [x] **Task 1.4.1:** Investigation Prisma Schema ✅
  - Investigation model with status workflow, assignments, findings
  - Enums: InvestigationStatus, InvestigationType, InvestigationDepartment, InvestigationOutcome, SlaStatus
- [x] **Task 1.4.2:** Investigation RLS Policies ✅
  - Row-Level Security on investigations table
  - Tenant isolation enforced at database level
- [x] **Task 1.4.3:** Investigation DTOs ✅
  - CreateInvestigationDto, UpdateInvestigationDto, AssignInvestigationDto
  - TransitionInvestigationDto, InvestigationFindingsDto, InvestigationQueryDto
- [x] **Task 1.4.4:** Investigation Service ✅
  - Full CRUD with status workflow validation
  - Assignment history tracking
  - Findings and closure workflow
- [x] **Task 1.4.5:** Investigation Controller & Module ✅
  - Nested routes: POST/GET /api/v1/cases/:caseId/investigations
  - Standalone routes: GET/PATCH/POST /api/v1/investigations/:id/*
- [x] **Task 1.4.6:** Investigation E2E Tests ✅
  - Tenant isolation tests
  - Status transition tests
  - Assignment workflow tests

**Frontend (Tasks 1.4.7-1.4.10):**
- [x] **Task 1.4.7:** Case Detail 3-Column Layout ✅
  - HubSpot-style layout with resizable panels
  - Left: Properties, Center: Activity, Right: Investigations
- [x] **Task 1.4.8:** Case Properties Panel ✅
  - Collapsible sections (Status, Intake, Reporter, Location)
  - Inline editing with PATCH API
  - Status and Severity badges
- [x] **Task 1.4.9:** Activity Timeline Component ✅
  - Vertical timeline with date grouping
  - Activity type icons and natural language descriptions
  - Filter tabs (All, Notes, Status Changes, Files)
- [x] **Task 1.4.10:** Investigation Panel ✅
  - Investigation cards with status badges and SLA indicators
  - Create Investigation dialog
  - Expandable card details

---

## Completed

### Slice 1.5 - Investigation Notes & E2E Testing ✅

- [x] **Task 1.5.1:** InvestigationNote Prisma Schema ✅
  - InvestigationNote model with all required fields
  - Enums: NoteType, NoteVisibility
  - Relations to Investigation and User
  - Indexes for query patterns
  - Commit: `4e68f41`
- [x] **Task 1.5.2:** InvestigationNote RLS Policies ✅
  - RLS policies for tenant isolation on investigation_notes table
  - SELECT, INSERT, UPDATE, DELETE policies
  - Bypass support for admin operations
- [x] **Task 1.5.3:** InvestigationNote DTOs ✅
  - Create, Update, Query, Response DTOs
  - AttachmentDto for file references
  - Full validation decorators
- [x] **Task 1.5.4:** InvestigationNote Service ✅
  - Full CRUD with activity logging
  - Visibility filtering (PRIVATE/TEAM/ALL)
  - HTML sanitization and plain text extraction
  - Edit tracking (isEdited, editCount)
- [x] **Task 1.5.5:** InvestigationNote Controller & Module ✅
  - All 5 REST endpoints implemented
  - Nested under /api/v1/investigations/:id/notes
  - Module registered in AppModule
- [x] **Task 1.5.6:** InvestigationNote E2E Tests ✅
  - Tenant isolation tests
  - CRUD operation tests
  - Visibility filtering tests
  - Permission enforcement tests
- [x] **Task 1.5.7:** Rich Text Note Editor (Frontend) ✅
  - Tiptap-based rich text editor
  - Toolbar with formatting options
  - Character count with limits
  - Draft auto-save hook
- [x] **Task 1.5.8:** Investigation Detail Modal (Frontend) ✅
  - Slide-over panel with tabs
  - Notes timeline with CRUD
  - Add Note modal with rich text
  - Integration with case detail page
- [x] **Task 1.5.9:** E2E Smoke Test with Playwright ✅
  - Playwright test infrastructure with Page Object pattern
  - Smoke tests: login, dashboard, cases list, case detail, investigations
  - Tenant isolation tests: cross-org access prevention, session security
  - Test fixtures for authentication

---

## Completed

### Issue #25 - Backend E2E Smoke Tests ✅

- [x] **Issue #25:** End-to-end smoke tests for backend
  - Auth flow tests (login, JWT tokens, refresh, logout)
  - Case management flow tests
  - Investigation flow tests
  - Tenant isolation tests (critical)
  - Activity timeline tests
  - Commit: `9015921`

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
| 2026-01-30 | Case list page (frontend) with filters | `d0d9482` |
| 2026-01-30 | Slice 1.2 COMPLETE - Starting Slice 1.3 | — |
| 2026-01-30 | Slice 1.3 COMPLETE - Activity logging infrastructure | pushed |
| 2026-01-30 | Slice 1.4 COMPLETE - Investigation backend + Case detail UI | pushed |
| 2026-01-30 | Slice 1.5 COMPLETE - Investigation Notes & E2E Testing | pushed |
| 2026-01-30 | Code review + SQL injection fix + Slice 1.6/1.7 planning | — |
| 2026-01-30 | Slice 1.7 COMPLETE - E2E tests (70 total tests) | — |

---

## Completed

### Slice 1.6 - Code Quality & Security Fixes ✅

- [x] **Task 1.6.1:** Add TenantGuard to all controllers ✅
  - TenantGuard validates organizationId presence
  - Applied to all protected controllers
- [x] **Task 1.6.2:** Add @TenantId decorator to controllers ✅
  - Consistent tenant context extraction
  - Replace user.organizationId pattern
- [x] **Task 1.6.3:** Create ChangeStatusDto for status endpoints ✅
  - Proper validation for status changes
  - Required rationale field
- [x] **Task 1.6.4:** Add RolesGuard and role decorators ✅
  - Role-based access control enforcement
  - @Roles() decorators on endpoints
- [x] **Task 1.6.5:** Add Swagger decorators to controllers ✅
  - Full API documentation
  - @ApiProperty on DTOs
- [x] **Task 1.6.6:** Fix E2E test failures - Activity endpoint ✅
  - Debug activity timeline tests
  - Fix cascading test failures
- [x] **Task 1.6.7:** SQL injection fix verified
  - Parameterized query in tenant middleware
  - Security audit passed
- [x] **Task 1.6.8:** Fix critical security issues from code review ✅
  - SQL injection in PrismaService.setTenantContext
  - Hardcoded JWT secret fallback
  - RLS bypass methods using $executeRawUnsafe

---

## Completed

### Slice 1.7 - Remaining Foundation Features ✅

- [x] **Task 1.7.1:** PostgreSQL full-text search for cases (Issue #12) ✅
- [x] **Task 1.7.2:** Case query filters enhancement (Issue #16) ✅
- [x] **Task 1.7.3:** Case creation form - basic structure (Issue #23) ✅
- [x] **Task 1.7.4:** Case creation form - API integration ✅
- [x] **Task 1.7.5:** Case list - enhanced filters UI ✅
- [x] **Task 1.7.6:** Dashboard quick actions ✅
- [x] **Task 1.7.7:** E2E tests for new features ✅
  - Created case-creation.spec.ts (13 tests)
  - Created search-filters.spec.ts (28 tests)
  - Created case-new.page.ts page object
  - Updated case-list.page.ts with filter methods
  - Updated dashboard.page.ts with quick action methods
  - Total E2E tests: 70 across 4 files

---

## In Progress

### Slice 1.8 - File Attachments & User Management

**Backend Tasks:**
- [ ] **Task 1.8.1:** File Attachment Prisma Schema
- [ ] **Task 1.8.2:** File Storage Service
- [ ] **Task 1.8.3:** Attachment DTOs and Service
- [ ] **Task 1.8.4:** Attachment Controller & Module
- [ ] **Task 1.8.5:** User Management DTOs and Service
- [ ] **Task 1.8.6:** User Management Controller & Module

**Frontend Tasks:**
- [ ] **Task 1.8.7:** File Upload Component
- [ ] **Task 1.8.8:** User Management UI

**Testing:**
- [ ] **Task 1.8.9:** E2E Tests for Slice 1.8
