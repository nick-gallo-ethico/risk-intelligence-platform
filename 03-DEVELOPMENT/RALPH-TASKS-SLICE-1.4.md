# Ralph-Ready Tasks: Slice 1.4 - Investigation Entity & Case Detail Page

**Purpose:** Detailed, AI-executable task breakdown for autonomous development.
**Slice Goal:** Investigation backend CRUD + Case detail page frontend with 3-column layout.
**GitHub Issues:** #8-9 (Investigation backend), #17-20 (Case detail frontend)
**Reference:** [02-MODULES/05-CASE-MANAGEMENT/PRD.md](../02-MODULES/05-CASE-MANAGEMENT/PRD.md) Section 2.2 Investigation Entity

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

## BACKEND TASKS: Investigation Entity (Issues #8-9)

---

## Task 1.4.1: Investigation Entity - Prisma Schema

**GitHub Issue:** #8 (Part 1)
**Estimate:** 2 hours

### Prompt for AI
```
Create the Investigation entity in Prisma schema following:
- `02-MODULES/05-CASE-MANAGEMENT/PRD.md` Section 2.2 - Investigation Entity schema
- `apps/backend/examples/entity-pattern.prisma` - Entity structure
- `apps/backend/prisma/schema.prisma` - Existing Case entity pattern

Include:
1. Core fields: id, caseId (FK), organizationId (denormalized for RLS), investigationNumber
2. Classification: categoryId, investigationType enum, department enum
3. Assignment: assignedTo (array), primaryInvestigatorId, assignedAt, assignedById, assignmentHistory (JSON)
4. Workflow: status enum, statusRationale, statusChangedAt, dueDate, slaStatus enum
5. Findings: findingsSummary, findingsDetail, outcome enum, rootCause, lessonsLearned, findingsDate
6. Closure: closedAt, closedById, closureApprovedById, closureApprovedAt, closureNotes
7. Template: templateId, templateResponses (JSON), templateCompleted
8. Migration: sourceSystem, sourceRecordId, migratedAt
9. Audit: createdAt, updatedAt, createdById, updatedById

Create enums:
- InvestigationStatus: NEW, ASSIGNED, INVESTIGATING, PENDING_REVIEW, CLOSED, ON_HOLD
- InvestigationType: FULL, LIMITED, INQUIRY
- InvestigationDepartment: HR, LEGAL, SAFETY, COMPLIANCE, OTHER
- InvestigationOutcome: SUBSTANTIATED, UNSUBSTANTIATED, INCONCLUSIVE, POLICY_VIOLATION, NO_VIOLATION, INSUFFICIENT_EVIDENCE
- SlaStatus: ON_TRACK, WARNING, OVERDUE

Add proper indexes for query patterns (org+case, org+status, org+assignee).
Add relation to Case entity (case can have multiple investigations).
```

### Input Files (READ FIRST)
- `02-MODULES/05-CASE-MANAGEMENT/PRD.md` - Section 2.2 for exact schema
- `apps/backend/examples/entity-pattern.prisma` - Pattern structure
- `apps/backend/prisma/schema.prisma` - Current schema with Case entity

### Output Files
- `apps/backend/prisma/schema.prisma` (add Investigation model, enums)
- `apps/backend/prisma/migrations/YYYYMMDD_add_investigation/migration.sql` (generated)

### Verification (ALL MUST PASS)
```bash
# Prisma schema is valid
cd apps/backend && npx prisma validate

# Migration generates and applies
cd apps/backend && npx prisma migrate dev --name add_investigation

# Prisma client generates
cd apps/backend && npx prisma generate

# TypeScript compiles (new types available)
cd apps/backend && npm run typecheck
```

### Stop Condition
- All verification commands pass
- Schema matches PRD Section 2.2
- Relation to Case established
- OR if unclear about enum values or fields, document in BLOCKERS.md

### Dependencies
- Slice 1.2 complete (Case entity exists)

### Notes
- organizationId is denormalized from Case for RLS efficiency
- investigationNumber is auto-generated (1, 2, 3... per case)
- assignedTo is an array of user IDs (multiple investigators possible)
- Do NOT create InvestigationNote yet (that's a future task)

---

## Task 1.4.2: Investigation RLS Policies

**GitHub Issue:** #8 (Part 2)
**Estimate:** 30 minutes

### Prompt for AI
```
Add PostgreSQL Row-Level Security policies for the Investigation table.

Follow the pattern in:
- `apps/backend/prisma/migrations/20260129221829_add_rls_policies/migration.sql`

Create policies that:
1. Enable RLS on investigations table
2. Filter reads by current_setting('app.current_organization')
3. Restrict inserts to same organization as the parent case
4. Restrict updates/deletes to same organization
5. Allow bypass when app.bypass_rls = 'true'

The organizationId on Investigation is denormalized, so RLS can filter directly.
```

### Input Files (READ FIRST)
- `apps/backend/prisma/migrations/20260129221829_add_rls_policies/migration.sql` - Existing RLS pattern
- `apps/backend/prisma/schema.prisma` - Current schema with Investigation entity

### Output Files
- `apps/backend/prisma/migrations/YYYYMMDD_add_investigation_rls/migration.sql`

### Verification (ALL MUST PASS)
```bash
# Migration applies
cd apps/backend && npx prisma migrate dev --name add_investigation_rls

# RLS policies exist (check in database)
# Run this SQL: SELECT * FROM pg_policies WHERE tablename = 'investigations';
# Should return rows for select, insert, update, delete policies
```

### Stop Condition
- Migration applies successfully
- RLS policies visible in pg_policies view
- OR document issues in BLOCKERS.md

### Dependencies
- Task 1.4.1 (Investigation entity exists)

---

## Task 1.4.3: Investigation DTOs

**GitHub Issue:** #9 (Part 1)
**Estimate:** 1.5 hours

### Prompt for AI
```
Create DTOs for Investigation following:
- `apps/backend/examples/dto-pattern.ts` - DTO structure
- `apps/backend/src/modules/cases/dto/` - Case DTO patterns for reference

Create:
1. CreateInvestigationDto
   - categoryId?: string (optional, may differ from case)
   - investigationType: InvestigationType (required)
   - department?: InvestigationDepartment
   - dueDate?: Date
   - templateId?: string

2. UpdateInvestigationDto (extends PartialType of create)
   - All fields optional
   - Plus: statusRationale, findings fields

3. InvestigationQueryDto (for list endpoint)
   - status?: InvestigationStatus
   - assignedToId?: string (filter by investigator)
   - departent?: InvestigationDepartment
   - page?: number
   - limit?: number
   - sortBy?: string
   - sortOrder?: 'asc' | 'desc'

4. AssignInvestigationDto
   - assignedTo: string[] (array of user IDs, required)
   - primaryInvestigatorId: string (required)
   - notifyAssignees?: boolean (default true)

5. InvestigationFindingsDto
   - findingsSummary: string (required)
   - findingsDetail?: string
   - outcome: InvestigationOutcome (required)
   - rootCause?: string
   - lessonsLearned?: string

6. TransitionInvestigationDto
   - status: InvestigationStatus (required)
   - rationale: string (required)

Remember:
- NEVER include organizationId or caseId in create DTO (set from context/route)
- Use class-validator decorators (@IsString, @IsEnum, @IsOptional, etc.)
- Use class-transformer for type conversion (@Type)
```

### Input Files (READ FIRST)
- `apps/backend/examples/dto-pattern.ts` - MUST follow this structure
- `apps/backend/src/modules/cases/dto/` - Case DTO examples
- `apps/backend/prisma/schema.prisma` - Investigation field definitions

### Output Files
- `apps/backend/src/modules/investigations/dto/create-investigation.dto.ts`
- `apps/backend/src/modules/investigations/dto/update-investigation.dto.ts`
- `apps/backend/src/modules/investigations/dto/investigation-query.dto.ts`
- `apps/backend/src/modules/investigations/dto/assign-investigation.dto.ts`
- `apps/backend/src/modules/investigations/dto/investigation-findings.dto.ts`
- `apps/backend/src/modules/investigations/dto/transition-investigation.dto.ts`
- `apps/backend/src/modules/investigations/dto/index.ts`

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Lint passes
cd apps/backend && npm run lint
```

### Stop Condition
- All verification commands pass
- DTOs cover all CRUD and workflow operations
- OR document unclear requirements in BLOCKERS.md

### Dependencies
- Task 1.4.1 (Investigation types exist from Prisma)

---

## Task 1.4.4: Investigation Service

**GitHub Issue:** #9 (Part 2)
**Estimate:** 3 hours

### Prompt for AI
```
Create InvestigationsService following:
- `apps/backend/examples/service-pattern.ts` - Service structure
- `apps/backend/src/modules/cases/cases.service.ts` - Case service patterns

Implement:
1. create(dto, caseId, userId, orgId) - Create investigation
   - Verify case exists and belongs to org
   - Auto-generate investigationNumber (1, 2, 3... within case)
   - Set organizationId from case (denormalized)
   - Set status to NEW
   - Return created investigation

2. findAllForCase(caseId, query, orgId) - List investigations for a case
   - Filter by caseId and organizationId (CRITICAL)
   - Support pagination
   - Order by investigationNumber or createdAt

3. findOne(id, orgId) - Get single investigation
   - Include case relation (basic fields)
   - Include assignee users (id, name, email)
   - Throw NotFoundException if not found

4. update(id, dto, userId, orgId) - Update investigation
   - Verify exists and belongs to org
   - Track who updated

5. assign(id, dto, userId, orgId) - Assign investigators
   - Update assignedTo array and primaryInvestigatorId
   - Log assignment history (JSON append)
   - If status is NEW, transition to ASSIGNED
   - Set assignedAt, assignedById

6. transition(id, dto, userId, orgId) - Change status
   - Validate status transition (see workflow rules)
   - Record statusRationale and statusChangedAt
   - Handle special cases: CLOSED requires findings

7. recordFindings(id, dto, userId, orgId) - Record investigation findings
   - Set all findings fields
   - Set findingsDate to now

8. close(id, dto, userId, orgId) - Close investigation
   - Require findings summary and outcome
   - Set closedAt, closedById
   - Optionally handle approval workflow (if configured)

9. getInvestigationNumber(caseId, orgId) - Generate next number
   - Count existing investigations for case + 1

Status Transition Rules:
- NEW -> ASSIGNED (when assignee set)
- ASSIGNED -> INVESTIGATING (manual)
- INVESTIGATING -> PENDING_REVIEW (findings documented)
- PENDING_REVIEW -> CLOSED (approved)
- Any -> ON_HOLD (with reason)
- ON_HOLD -> Previous status

ALL queries must filter by organizationId. RLS provides backup, but code must still filter.
```

### Input Files (READ FIRST)
- `apps/backend/examples/service-pattern.ts` - MUST follow this structure
- `apps/backend/src/modules/cases/cases.service.ts` - Case service reference
- `apps/backend/src/modules/investigations/dto/` - DTOs from previous task
- `02-MODULES/05-CASE-MANAGEMENT/PRD.md` - Section 3 for status workflow

### Output Files
- `apps/backend/src/modules/investigations/investigations.service.ts`
- `apps/backend/src/modules/investigations/investigations.service.spec.ts` (unit tests)

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Unit tests pass
cd apps/backend && npm test -- --testPathPattern="investigations.service"

# Tests should include:
# - "should create investigation with correct organization"
# - "should auto-generate investigation number"
# - "should not find investigation from different org"
# - "should validate status transitions"
# - "should require findings before closing"
# - "should update assignment history on assign"
```

### Stop Condition
- All verification commands pass
- Unit tests cover key scenarios
- All queries filter by organizationId
- OR document blockers

### Dependencies
- Task 1.4.3 (DTOs exist)
- CasesService available for case lookup

---

## Task 1.4.5: Investigation Controller & Module

**GitHub Issue:** #9 (Part 3)
**Estimate:** 2 hours

### Prompt for AI
```
Create InvestigationsController and InvestigationsModule following:
- `apps/backend/examples/controller-pattern.ts` - Controller structure
- `apps/backend/src/modules/cases/cases.controller.ts` - Case controller reference

Implement endpoints (two patterns - nested under cases AND standalone):

Nested routes (for case context):
- POST /api/v1/cases/:caseId/investigations - Create investigation
- GET /api/v1/cases/:caseId/investigations - List investigations for case

Standalone routes (for direct access):
- GET /api/v1/investigations/:id - Get investigation detail
- PATCH /api/v1/investigations/:id - Update investigation
- POST /api/v1/investigations/:id/assign - Assign investigators
- POST /api/v1/investigations/:id/transition - Change status
- POST /api/v1/investigations/:id/findings - Record findings
- POST /api/v1/investigations/:id/close - Close investigation

All routes:
- Protected by JwtAuthGuard
- Use @CurrentUser() decorator for user context
- Validate UUIDs with ParseUUIDPipe

Role requirements:
- Create: COMPLIANCE_OFFICER, TRIAGE_LEAD, INVESTIGATOR
- View: Any authenticated user (filtered by org)
- Update/Assign: COMPLIANCE_OFFICER, TRIAGE_LEAD, or assigned investigator
- Close: Configurable (COMPLIANCE_OFFICER by default)

Create InvestigationsModule that:
- Imports CasesModule (for case lookup)
- Provides InvestigationsService
- Exports InvestigationsService

Update AppModule to import InvestigationsModule.
```

### Input Files (READ FIRST)
- `apps/backend/examples/controller-pattern.ts` - MUST follow this structure
- `apps/backend/src/modules/cases/cases.controller.ts` - Reference
- `apps/backend/src/modules/investigations/investigations.service.ts` - Service
- `apps/backend/src/modules/investigations/dto/` - DTOs

### Output Files
- `apps/backend/src/modules/investigations/investigations.controller.ts`
- `apps/backend/src/modules/investigations/investigations.module.ts`
- Update `apps/backend/src/app.module.ts` to import InvestigationsModule

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Lint passes
cd apps/backend && npm run lint

# Backend starts without errors
cd apps/backend && timeout 15 npm run start:dev || true

# Test endpoints work (with auth)
# After starting backend, test:
curl -X POST "http://localhost:3000/api/v1/cases/{CASE_ID}/investigations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"investigationType":"FULL"}'
```

### Stop Condition
- All verification commands pass
- All endpoints respond correctly with auth
- Nested and standalone routes both work
- OR document blockers

### Dependencies
- Task 1.4.4 (Service exists)

---

## Task 1.4.6: Investigation E2E Tests

**GitHub Issue:** #9 (Part 4)
**Estimate:** 2 hours

### Prompt for AI
```
Create E2E tests for Investigation endpoints following:
- `apps/backend/examples/e2e-test-pattern.spec.ts`
- `apps/backend/test/cases/cases.e2e-spec.ts` - Existing case E2E tests

Test scenarios:
1. Tenant Isolation:
   - Org B cannot see Org A's investigations
   - Cannot create investigation on Org A's case as Org B user
   - Investigation list filtered by current organization

2. CRUD Operations:
   - Create investigation on existing case
   - Investigation number auto-generates (1, 2, 3...)
   - List investigations for a case (paginated)
   - Get single investigation with relations
   - Update investigation fields

3. Assignment Workflow:
   - Assign investigator(s) to investigation
   - Assignment changes status from NEW to ASSIGNED
   - Assignment history tracked
   - Can reassign (history preserved)

4. Status Transitions:
   - Valid transitions work (NEW -> ASSIGNED -> INVESTIGATING -> CLOSED)
   - Invalid transitions rejected
   - Rationale required for transitions

5. Findings & Closure:
   - Can record findings
   - Cannot close without findings
   - Closure sets timestamp and closer

6. Access Control:
   - Investigators can only see assigned investigations
   - Compliance officer can see all org investigations
```

### Input Files (READ FIRST)
- `apps/backend/examples/e2e-test-pattern.spec.ts` - Test structure
- `apps/backend/test/cases/cases.e2e-spec.ts` - Case E2E reference
- `apps/backend/test/helpers/` - Test utilities
- `apps/backend/src/modules/investigations/` - Implementation

### Output Files
- `apps/backend/test/investigations/investigations.e2e-spec.ts`
- `apps/backend/test/investigations/investigations-tenant-isolation.e2e-spec.ts`

### Verification (ALL MUST PASS)
```bash
# E2E tests pass
cd apps/backend && npm run test:e2e -- --testPathPattern="investigations"

# Tenant isolation tests pass
cd apps/backend && npm run test:tenant-isolation
```

### Stop Condition
- All E2E tests pass
- Tenant isolation verified
- Workflow transitions verified
- OR document any test failures in BLOCKERS.md

### Dependencies
- Task 1.4.5 (Controller exists)
- Test utilities from Slice 1.2

---

## FRONTEND TASKS: Case Detail Page (Issues #17-20)

---

## Task 1.4.7: Case Detail Page - 3-Column Layout

**GitHub Issue:** #17
**Estimate:** 3 hours

### Prompt for AI
```
Create the Case detail page with HubSpot-style 3-column layout.

Follow existing patterns in:
- `apps/frontend/src/app/cases/page.tsx` - Case list page
- `apps/frontend/src/components/ui/` - shadcn/ui components

Create /cases/[id] route with layout:
1. Left Panel (collapsible, ~300px):
   - Case properties (key-value display)
   - Collapsible sections: Status, Classification, Reporter, Location

2. Center Panel (flexible width):
   - Activity timeline (placeholder for now - will use AuditLog from Slice 1.3)
   - "Add Note" button (placeholder)

3. Right Panel (collapsible, ~350px):
   - Investigations list (cards showing status, assignee)
   - "Create Investigation" button
   - AI Summary panel (placeholder)

Requirements:
- Fetch case data with GET /api/v1/cases/:id
- Loading skeleton while fetching
- Error state if case not found
- Responsive: panels collapse on mobile/tablet
- Use ResizablePanelGroup from shadcn/ui for panels

Components to create:
- CaseDetailPage (main page component)
- CasePropertiesPanel (left)
- CaseActivityTimeline (center - placeholder)
- CaseInvestigationsPanel (right)
- CaseHeader (reference number, status badge, breadcrumb)
```

### Input Files (READ FIRST)
- `apps/frontend/src/app/cases/page.tsx` - List page patterns
- `apps/frontend/src/lib/api.ts` - API client
- `apps/frontend/src/contexts/auth-context.tsx` - Auth context
- `02-MODULES/05-CASE-MANAGEMENT/PRD.md` - Section 17 for UI requirements

### Output Files
- `apps/frontend/src/app/cases/[id]/page.tsx`
- `apps/frontend/src/components/cases/case-detail-layout.tsx`
- `apps/frontend/src/components/cases/case-header.tsx`
- `apps/frontend/src/components/cases/case-properties-panel.tsx`
- `apps/frontend/src/components/cases/case-activity-timeline.tsx` (placeholder)
- `apps/frontend/src/components/cases/case-investigations-panel.tsx`

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/frontend && npm run typecheck

# Lint passes
cd apps/frontend && npm run lint

# Dev server starts
cd apps/frontend && npm run dev

# Manual verification:
# 1. Navigate to /cases
# 2. Click on a case row
# 3. Verify 3-column layout loads
# 4. Verify case data displays
# 5. Verify responsive collapse works
```

### Stop Condition
- All verification commands pass
- 3-column layout renders correctly
- Case data fetches and displays
- OR document blockers

### Dependencies
- Slice 1.2 complete (Case list page exists)
- Backend Case endpoint working

---

## Task 1.4.8: Case Properties Panel

**GitHub Issue:** #18
**Estimate:** 2 hours

### Prompt for AI
```
Build the left-side Case Properties Panel with inline editing.

Following:
- `apps/frontend/src/components/ui/` - shadcn/ui components

Features:
1. Collapsible sections:
   - Status & Classification (status badge, severity badge, category)
   - Intake Information (source channel, case type, timestamp)
   - Reporter Information (respecting anonymity - hide PII if anonymous)
   - Location (address display, or "Not specified")

2. Inline Edit:
   - Click field value to enter edit mode
   - Save on blur or Enter
   - Cancel on Escape
   - PATCH /api/v1/cases/:id on save
   - Show toast on success/error

3. Field types:
   - Text fields: summary, severity reason
   - Select fields: status, severity, source channel
   - Tags field: tags array

4. Read-only fields:
   - Reference number
   - Created at, Updated at
   - Created by, Updated by

Components to create/update:
- CasePropertiesPanel (main component)
- PropertySection (collapsible section)
- EditableField (inline edit wrapper)
- StatusBadge (color-coded by status)
- SeverityBadge (color-coded by severity)
```

### Input Files (READ FIRST)
- `apps/frontend/src/components/cases/case-properties-panel.tsx` - Stub from previous task
- `apps/frontend/src/lib/api.ts` - API client for PATCH
- `apps/frontend/src/components/ui/` - shadcn components

### Output Files
- `apps/frontend/src/components/cases/case-properties-panel.tsx` (update)
- `apps/frontend/src/components/cases/property-section.tsx`
- `apps/frontend/src/components/cases/editable-field.tsx`
- `apps/frontend/src/components/ui/status-badge.tsx`
- `apps/frontend/src/components/ui/severity-badge.tsx`

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/frontend && npm run typecheck

# Lint passes
cd apps/frontend && npm run lint

# Manual verification:
# 1. Navigate to /cases/:id
# 2. Verify all sections display
# 3. Click a field value - verify edit mode
# 4. Edit and save - verify API call and toast
# 5. Verify anonymous reporter hides PII
```

### Stop Condition
- All verification commands pass
- Inline editing works
- Changes persist to backend
- OR document blockers

### Dependencies
- Task 1.4.7 (Layout exists)

---

## Task 1.4.9: Activity Timeline Component

**GitHub Issue:** #19
**Estimate:** 2 hours

### Prompt for AI
```
Build the center Activity Timeline component.

Note: This will consume the AuditLog API from Slice 1.3 (Activity Logging).
If Slice 1.3 is not complete, create placeholder with mock data.

Features:
1. Timeline display:
   - Vertical timeline with icons
   - Chronological order (newest first)
   - Group by date (Today, Yesterday, Earlier this week, etc.)

2. Activity types with icons:
   - created (PlusCircle)
   - updated (Edit)
   - status_changed (ArrowRight)
   - assigned (UserPlus)
   - commented (MessageSquare)
   - file_uploaded (Paperclip)

3. Activity entry display:
   - Icon (by type)
   - Natural language description ("John changed status from NEW to OPEN")
   - Timestamp (relative: "2 hours ago")
   - Actor avatar/name

4. Filter tabs:
   - All
   - Notes
   - Status Changes
   - Files

5. Actions:
   - "Add Note" button (opens modal - placeholder)

Fetch from: GET /api/v1/activity/entity/CASE/:caseId
If API not ready, use mock data matching AuditLog structure.
```

### Input Files (READ FIRST)
- `apps/frontend/src/components/cases/case-activity-timeline.tsx` - Stub from Task 1.4.7
- `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` - Section 7 AuditLog structure
- `apps/frontend/src/components/ui/` - shadcn components

### Output Files
- `apps/frontend/src/components/cases/case-activity-timeline.tsx` (update)
- `apps/frontend/src/components/cases/activity-entry.tsx`
- `apps/frontend/src/components/cases/activity-filters.tsx`
- `apps/frontend/src/lib/activity-icons.tsx` (icon mapping)

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/frontend && npm run typecheck

# Lint passes
cd apps/frontend && npm run lint

# Manual verification:
# 1. Navigate to /cases/:id
# 2. Verify timeline displays in center panel
# 3. Verify activity entries render with icons
# 4. Verify filter tabs work (or show placeholder)
# 5. Verify "Add Note" button visible
```

### Stop Condition
- All verification commands pass
- Timeline renders (with real or mock data)
- Filter tabs functional
- OR document blockers

### Dependencies
- Task 1.4.7 (Layout exists)
- Slice 1.3 Activity API (optional - use mock if not ready)

---

## Task 1.4.10: Investigation Panel

**GitHub Issue:** #20
**Estimate:** 2.5 hours

### Prompt for AI
```
Build the right-side Investigation Panel with investigation cards.

Features:
1. Investigation list:
   - Cards for each investigation
   - Status badge (color-coded)
   - Investigation number (#1, #2)
   - Primary investigator avatar/name
   - Due date (if set)
   - SLA status indicator (green/yellow/red)

2. Create Investigation:
   - "Create Investigation" button
   - Opens modal/dialog
   - Form: investigationType (required), category, department, dueDate
   - POST /api/v1/cases/:caseId/investigations
   - Refresh list on success

3. Investigation click:
   - Expand card to show more details
   - OR navigate to investigation detail page (placeholder)
   - Show: all assignees, findings summary (if closed), notes count

4. Empty state:
   - "No investigations yet"
   - Prominent "Create Investigation" CTA

Fetch from: GET /api/v1/cases/:caseId/investigations
```

### Input Files (READ FIRST)
- `apps/frontend/src/components/cases/case-investigations-panel.tsx` - Stub from Task 1.4.7
- `apps/frontend/src/modules/investigations/dto/` - DTO structure for forms
- `apps/frontend/src/components/ui/` - shadcn components

### Output Files
- `apps/frontend/src/components/cases/case-investigations-panel.tsx` (update)
- `apps/frontend/src/components/cases/investigation-card.tsx`
- `apps/frontend/src/components/cases/create-investigation-dialog.tsx`
- `apps/frontend/src/lib/investigation-api.ts` (API client functions)

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/frontend && npm run typecheck

# Lint passes
cd apps/frontend && npm run lint

# Manual verification:
# 1. Navigate to /cases/:id
# 2. Verify investigations panel on right
# 3. Click "Create Investigation"
# 4. Fill form and submit
# 5. Verify new investigation appears in list
# 6. Click investigation card to expand
```

### Stop Condition
- All verification commands pass
- Investigation CRUD working from UI
- List updates after creation
- OR document blockers

### Dependencies
- Task 1.4.7 (Layout exists)
- Task 1.4.5 (Investigation API exists)

---

## Task Dependency Graph

```
BACKEND (Issues #8-9):

Task 1.4.1 (Investigation Schema)
     │
     v
Task 1.4.2 (Investigation RLS)
     │
     v
Task 1.4.3 (Investigation DTOs)
     │
     v
Task 1.4.4 (Investigation Service)
     │
     v
Task 1.4.5 (Investigation Controller)
     │
     v
Task 1.4.6 (Investigation E2E Tests)


FRONTEND (Issues #17-20):

Task 1.4.7 (3-Column Layout)
     │
     ├──────────────────┬──────────────────┐
     v                  v                  v
Task 1.4.8          Task 1.4.9         Task 1.4.10
(Properties)        (Timeline)         (Investigations)


CROSS-DEPENDENCIES:

Task 1.4.5 ─────────────────────────────────► Task 1.4.10
(Backend API)                                 (Frontend needs API)

Slice 1.3 Activity API ─────────────────────► Task 1.4.9
(Optional - can use mock)                     (Timeline display)
```

---

## Parallel Execution Opportunities

**Backend parallelization:**
- Tasks 1.4.1 through 1.4.6 are sequential (each depends on previous)

**Frontend parallelization (after Task 1.4.7):**
- Task 1.4.8 (Properties Panel) - Independent
- Task 1.4.9 (Activity Timeline) - Independent
- Task 1.4.10 (Investigations Panel) - Needs backend API from Task 1.4.5

**Recommended execution order:**
1. Start Backend: 1.4.1 → 1.4.2 → 1.4.3 → 1.4.4 → 1.4.5 → 1.4.6
2. Start Frontend (can overlap with backend): 1.4.7
3. After 1.4.7: Run 1.4.8 and 1.4.9 in parallel
4. After 1.4.5 complete: Run 1.4.10

---

## Success Criteria for Slice 1.4

### Backend
- [ ] Investigation entity created in Prisma with all required fields
- [ ] RLS policies enforce tenant isolation on investigations
- [ ] All DTOs created with proper validation
- [ ] InvestigationsService implements all CRUD operations
- [ ] Status transition validation enforced
- [ ] Findings required before closure
- [ ] All endpoints working: create, list, get, update, assign, transition, close
- [ ] E2E tests pass including tenant isolation
- [ ] No breaking changes to existing Case functionality

### Frontend
- [ ] Case detail page loads at /cases/:id
- [ ] 3-column layout renders correctly
- [ ] Left panel shows case properties with inline edit
- [ ] Center panel shows activity timeline (real or mock data)
- [ ] Right panel shows investigations list
- [ ] Can create new investigation from UI
- [ ] Investigation cards show status, assignee, due date
- [ ] Responsive layout works on mobile/tablet

### Integration
- [ ] Frontend can create investigations via backend API
- [ ] Investigation list updates after creation
- [ ] Inline edits persist to backend
- [ ] Navigation between cases list and detail works

---

## Investigation Status Workflow Reference

| Status | Description | Next Valid States |
|--------|-------------|-------------------|
| `NEW` | Just created | ASSIGNED, ON_HOLD |
| `ASSIGNED` | Investigator assigned | INVESTIGATING, ON_HOLD |
| `INVESTIGATING` | Active investigation | PENDING_REVIEW, ON_HOLD |
| `PENDING_REVIEW` | Findings documented, awaiting approval | CLOSED, INVESTIGATING, ON_HOLD |
| `CLOSED` | Investigation complete | (terminal) |
| `ON_HOLD` | Paused (requires reason) | Previous state |

---

## SLA Status Reference

| Status | Condition | Color |
|--------|-----------|-------|
| `ON_TRACK` | Due date > 3 days away or no due date | Green |
| `WARNING` | Due date within 3 days | Yellow |
| `OVERDUE` | Past due date | Red |

---

*End of Ralph-Ready Tasks for Slice 1.4*
