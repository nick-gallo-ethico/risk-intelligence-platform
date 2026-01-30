# Ralph-Ready Tasks: Slice 1.2 - Core Case Flow

**Purpose:** Detailed, AI-executable task breakdown for autonomous development.
**Slice Goal:** Create, view, and manage cases with basic workflow.
**Reference:** [docs/BUILD-SEQUENCE.md](../docs/BUILD-SEQUENCE.md), [docs/SLICE-1-ISSUES.md](../docs/SLICE-1-ISSUES.md)

---

## Task Format Explanation

Each task follows this structure:
- **Prompt:** What to tell the AI
- **Input Files:** Files AI must read first
- **Output Files:** Files AI will create/modify
- **Verification:** Commands that must ALL pass
- **Stop Condition:** When to stop or ask for help
- **Dependencies:** What must be complete first

---

## Task 1.2.1: Tenant Isolation Test Infrastructure

**GitHub Issue:** #5
**Estimate:** 2 hours

### Prompt for AI
```
Create test utilities for tenant isolation testing. Following the patterns in:
- `apps/backend/examples/e2e-test-pattern.spec.ts`

Create:
1. A test database seeder that creates 2 test organizations (Org A, Org B)
2. A test JWT generator that creates tokens for users in each org
3. A tenant isolation test helper with reusable assertions
4. Add tenant isolation tests to the e2e test config

The test helper should make it easy to verify that User A cannot access Org B resources.
```

### Input Files (READ FIRST)
- `apps/backend/examples/e2e-test-pattern.spec.ts` - Pattern to follow
- `apps/backend/prisma/schema.prisma` - Current schema
- `apps/backend/src/modules/auth/` - Auth implementation
- `03-DEVELOPMENT/SECURITY-GUARDRAILS.md` - Security requirements

### Output Files
- `apps/backend/test/utils/test-db-seeder.ts`
- `apps/backend/test/utils/test-token-generator.ts`
- `apps/backend/test/utils/tenant-isolation-helper.ts`
- `apps/backend/test/tenant-isolation/tenant-isolation.e2e-spec.ts`
- Update `apps/backend/test/jest-e2e.json` if needed

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# E2E tests pass (requires running database)
cd apps/backend && npm run test:e2e -- --testPathPattern="tenant-isolation"

# Output should show:
# - "Org B cannot list Org A entities" - PASS
# - "Org B cannot access Org A entity by ID" - PASS
# - "Org B cannot update Org A entity" - PASS
# - "Org B cannot delete Org A entity" - PASS
```

### Stop Condition
- All verification commands pass
- OR if blocked, document in BLOCKERS.md and ask human

### Dependencies
- Slice 1.1 complete (Auth, RLS policies exist)

### Notes
- Test database must be running (docker-compose up -d)
- Tests should clean up after themselves

---

## Task 1.2.2: Case Entity - Prisma Schema

**GitHub Issue:** #6
**Estimate:** 2 hours

### Prompt for AI
```
Create the Case entity in Prisma schema following:
- `apps/backend/examples/entity-pattern.prisma` - Entity structure
- `02-MODULES/05-CASE-MANAGEMENT/PRD.md` Section 2.1 - Required fields

Include:
1. Core fields (id, organizationId, timestamps, createdById)
2. Business fields (referenceNumber, status, sourceChannel, details, summary)
3. AI enrichment fields (aiSummary, aiSummaryGeneratedAt, aiModelVersion)
4. Migration support fields (sourceSystem, sourceRecordId, migratedAt)
5. Proper indexes on organizationId, status, createdAt
6. CaseStatus enum with appropriate values
7. SourceChannel enum

Also create the CaseActivity model for activity logging.
```

### Input Files (READ FIRST)
- `apps/backend/examples/entity-pattern.prisma` - MUST follow this structure
- `02-MODULES/05-CASE-MANAGEMENT/PRD.md` - Field requirements
- `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` - Shared entity patterns
- `apps/backend/prisma/schema.prisma` - Current schema to extend

### Output Files
- `apps/backend/prisma/schema.prisma` (add Case, CaseActivity, enums)
- `apps/backend/prisma/migrations/YYYYMMDD_add_case_entity/migration.sql` (generated)

### Verification (ALL MUST PASS)
```bash
# Prisma schema is valid
cd apps/backend && npx prisma validate

# Migration generates and applies
cd apps/backend && npx prisma migrate dev --name add_case_entity

# Prisma client generates
cd apps/backend && npx prisma generate

# TypeScript compiles (new types available)
cd apps/backend && npm run typecheck
```

### Stop Condition
- All verification commands pass
- Schema includes all fields from PRD Section 2.1
- OR if unclear about field types/requirements, document in BLOCKERS.md

### Dependencies
- Task 1.2.1 (test infrastructure) - for verifying isolation later

### Notes
- Case.referenceNumber should be unique per organization
- Status enum should match workflow states from PRD
- Remember RLS policy will need to be added in next task

---

## Task 1.2.3: Case RLS Policies

**GitHub Issue:** Part of #6
**Estimate:** 30 minutes

### Prompt for AI
```
Add PostgreSQL Row-Level Security policies for the Case and CaseActivity tables.

Follow the pattern in:
- `apps/backend/prisma/migrations/20260129221829_add_rls_policies/migration.sql`

Create policies that:
1. Enable RLS on case and case_activity tables
2. Filter reads by current_setting('app.current_organization')
3. Restrict writes to same organization
4. Allow bypass when app.bypass_rls = 'true'
```

### Input Files (READ FIRST)
- `apps/backend/prisma/migrations/20260129221829_add_rls_policies/migration.sql` - Existing RLS pattern
- `apps/backend/prisma/schema.prisma` - Current schema with Case entity

### Output Files
- `apps/backend/prisma/migrations/YYYYMMDD_add_case_rls/migration.sql`

### Verification (ALL MUST PASS)
```bash
# Migration applies
cd apps/backend && npx prisma migrate dev --name add_case_rls

# RLS policies exist (check in database)
# Run this SQL: SELECT * FROM pg_policies WHERE tablename IN ('case', 'case_activity');
# Should return rows for each table
```

### Stop Condition
- Migration applies successfully
- RLS policies visible in pg_policies view
- OR document issues in BLOCKERS.md

### Dependencies
- Task 1.2.2 (Case entity exists)

---

## Task 1.2.4: Case DTOs

**GitHub Issue:** Part of #7
**Estimate:** 1 hour

### Prompt for AI
```
Create DTOs for Case entity following:
- `apps/backend/examples/dto-pattern.ts` - DTO structure

Create:
1. CreateCaseDto - for creating new cases
2. UpdateCaseDto - for updating cases (partial)
3. CaseQueryDto - for list filtering and pagination
4. ChangeStatusDto - for status transitions with rationale
5. CaseResponseDto - for API responses

Remember:
- NEVER include organizationId in Create/Update DTOs
- All fields must have class-validator decorators
- Add Swagger decorators for documentation
```

### Input Files (READ FIRST)
- `apps/backend/examples/dto-pattern.ts` - MUST follow this structure
- `apps/backend/prisma/schema.prisma` - Case field definitions
- `02-MODULES/05-CASE-MANAGEMENT/PRD.md` - Business requirements

### Output Files
- `apps/backend/src/modules/cases/dto/create-case.dto.ts`
- `apps/backend/src/modules/cases/dto/update-case.dto.ts`
- `apps/backend/src/modules/cases/dto/case-query.dto.ts`
- `apps/backend/src/modules/cases/dto/change-status.dto.ts`
- `apps/backend/src/modules/cases/dto/case-response.dto.ts`
- `apps/backend/src/modules/cases/dto/index.ts`

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Lint passes
cd apps/backend && npm run lint
```

### Stop Condition
- All verification commands pass
- DTOs cover all required fields from PRD
- OR document unclear requirements in BLOCKERS.md

### Dependencies
- Task 1.2.2 (Case entity/types exist)

---

## Task 1.2.5: Case Service

**GitHub Issue:** #7
**Estimate:** 3 hours

### Prompt for AI
```
Create CaseService following:
- `apps/backend/examples/service-pattern.ts` - Service structure

Implement:
1. create() - Create case with auto-generated reference number
2. findAll() - Paginated list with filters (status, search)
3. findOne() - Get single case with organization filter
4. update() - Update case with activity logging
5. changeStatus() - Status transition with rationale
6. remove() - Soft delete (set status to CLOSED or DELETED)

Requirements:
- ALL queries filter by organizationId
- ALL mutations log to ActivityService (natural language descriptions)
- Reference number format: CASE-YYYY-XXXXX (year + sequence)
- Status transitions validated (state machine)
```

### Input Files (READ FIRST)
- `apps/backend/examples/service-pattern.ts` - MUST follow this structure
- `apps/backend/src/modules/cases/dto/` - DTOs from previous task
- `02-MODULES/05-CASE-MANAGEMENT/PRD.md` - Business rules
- `03-DEVELOPMENT/SECURITY-GUARDRAILS.md` - Security requirements

### Output Files
- `apps/backend/src/modules/cases/cases.service.ts`
- `apps/backend/src/modules/cases/cases.service.spec.ts` (unit tests)

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Unit tests pass
cd apps/backend && npm test -- --testPathPattern="cases.service"

# Tests should include:
# - "should create case with correct organization"
# - "should log activity on create"
# - "should throw NotFoundException for entity in different org"
# - "should generate unique reference number"
```

### Stop Condition
- All verification commands pass
- Unit tests cover tenant isolation
- Activity logging implemented
- OR document blockers

### Dependencies
- Task 1.2.4 (DTOs exist)
- ActivityService exists (create stub if not)

---

## Task 1.2.6: Case Controller

**GitHub Issue:** #7
**Estimate:** 2 hours

### Prompt for AI
```
Create CaseController following:
- `apps/backend/examples/controller-pattern.ts` - Controller structure

Implement endpoints:
- POST /api/v1/cases - Create case
- GET /api/v1/cases - List cases with pagination
- GET /api/v1/cases/:id - Get single case
- PUT /api/v1/cases/:id - Update case
- PUT /api/v1/cases/:id/status - Change status
- DELETE /api/v1/cases/:id - Soft delete
- GET /api/v1/cases/:id/activity - Get activity timeline

Requirements:
- All routes protected by JwtAuthGuard and TenantGuard
- All routes declare required roles
- TenantId and CurrentUser from decorators
- Swagger documentation
```

### Input Files (READ FIRST)
- `apps/backend/examples/controller-pattern.ts` - MUST follow this structure
- `apps/backend/src/modules/cases/cases.service.ts` - Service from previous task
- `apps/backend/src/modules/cases/dto/` - DTOs

### Output Files
- `apps/backend/src/modules/cases/cases.controller.ts`
- `apps/backend/src/modules/cases/cases.module.ts`

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Lint passes
cd apps/backend && npm run lint

# Backend starts without errors
cd apps/backend && timeout 15 npm run start:dev || true

# Endpoints accessible (with auth)
curl -X GET http://localhost:3000/api/v1/cases -H "Authorization: Bearer $TOKEN"
```

### Stop Condition
- All verification commands pass
- All endpoints respond correctly with auth
- OR document blockers

### Dependencies
- Task 1.2.5 (Service exists)

---

## Task 1.2.7: Case Tenant Isolation E2E Tests

**GitHub Issue:** Part of #5
**Estimate:** 1.5 hours

### Prompt for AI
```
Create E2E tests for Case tenant isolation following:
- `apps/backend/examples/e2e-test-pattern.spec.ts`
- Use the test utilities created in Task 1.2.1

Test scenarios:
1. Org B cannot list Org A cases
2. Org B cannot access Org A case by ID (returns 404)
3. Org B cannot update Org A case
4. Org B cannot delete Org A case
5. Org A CAN access their own cases
6. Created case has correct organizationId from JWT
```

### Input Files (READ FIRST)
- `apps/backend/examples/e2e-test-pattern.spec.ts` - Test structure
- `apps/backend/test/utils/` - Test utilities from Task 1.2.1
- `apps/backend/src/modules/cases/` - Case implementation

### Output Files
- `apps/backend/test/cases/cases.e2e-spec.ts`
- `apps/backend/test/cases/cases-tenant-isolation.e2e-spec.ts`

### Verification (ALL MUST PASS)
```bash
# E2E tests pass
cd apps/backend && npm run test:e2e -- --testPathPattern="cases"

# Tenant isolation tests pass
cd apps/backend && npm run test:tenant-isolation
```

### Stop Condition
- All E2E tests pass
- Tenant isolation verified
- OR document any test failures in BLOCKERS.md

### Dependencies
- Task 1.2.1 (test utilities)
- Task 1.2.6 (Case controller)

---

## Task Dependency Graph

```
Task 1.2.1 (Test Infrastructure)
     │
     ├─────────────────────────────────────────┐
     │                                          │
     v                                          │
Task 1.2.2 (Case Entity)                        │
     │                                          │
     v                                          │
Task 1.2.3 (Case RLS)                           │
     │                                          │
     v                                          │
Task 1.2.4 (Case DTOs)                          │
     │                                          │
     v                                          │
Task 1.2.5 (Case Service)                       │
     │                                          │
     v                                          │
Task 1.2.6 (Case Controller)                    │
     │                                          │
     v                                          v
Task 1.2.7 (Case E2E Tests) ◄───────────────────┘
```

---

## Parallel Execution Opportunities

After completing Task 1.2.2 (Case Entity), these can run in parallel:
- Task 1.2.3 (RLS) - Independent DB work
- Task 1.2.4 (DTOs) - Independent code work

After completing Task 1.2.6 (Controller):
- Frontend work (Issue #15) can begin

---

## Success Criteria for Slice 1.2

- [ ] All 7 tasks completed with passing verification
- [ ] Tenant isolation tests pass in CI
- [ ] `npm run test:tenant-isolation` passes
- [ ] Case CRUD works via API
- [ ] Activity log records all mutations
- [ ] Reference numbers generate correctly
- [ ] No cross-tenant data leaks

---

*End of Ralph-Ready Tasks for Slice 1.2*
