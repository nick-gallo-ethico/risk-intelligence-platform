# Slice 1: Core Case Flow - GitHub Issues

**Slice Goal:** Create, view, and manage cases with basic workflow
**Total Estimated Hours:** 60-80 hours
**Issue Count:** 25

---

## Backend Issues

### Issue #1: Project Setup & Configuration
**Labels:** `backend`, `setup`, `priority:critical`
**Estimate:** 2 hours

**Description:**
Initialize NestJS backend project with core configuration.

**Tasks:**
- [ ] Create NestJS project structure in `apps/backend/`
- [ ] Configure TypeScript strict mode
- [ ] Set up environment variables (.env.example)
- [ ] Configure Prisma with PostgreSQL connection
- [ ] Add ESLint + Prettier configuration
- [ ] Create docker-compose.yml for local PostgreSQL

**Acceptance Criteria:**
- `npm run start:dev` starts backend without errors
- Prisma can connect to local PostgreSQL
- TypeScript compiles with strict mode

**Verification:**
```bash
cd apps/backend
npm run start:dev
npm run lint
npx prisma db push --dry-run
```

---

### Issue #2: Multi-Tenancy Foundation - Database Setup
**Labels:** `backend`, `database`, `security`, `priority:critical`
**Estimate:** 3 hours

**Description:**
Set up PostgreSQL Row-Level Security for multi-tenancy.

**Tasks:**
- [ ] Create Organization table
- [ ] Create RLS policy for organization_id
- [ ] Create database function to get current tenant
- [ ] Test RLS isolation

**Acceptance Criteria:**
- RLS policies prevent cross-tenant data access
- SQL function `current_setting('app.current_organization')` works
- Migration creates all security policies

**Verification:**
```bash
npx prisma migrate dev
# Then in psql:
SET LOCAL app.current_organization = 'org-1';
SELECT * FROM organization; -- Should only return org-1
```

**Prisma Schema:**
```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

### Issue #3: User & Auth Module - JWT Authentication
**Labels:** `backend`, `auth`, `priority:critical`
**Estimate:** 4 hours

**Description:**
Implement JWT-based authentication with organization context.

**Tasks:**
- [ ] Create User entity with organization relationship
- [ ] Implement login endpoint (email/password)
- [ ] Generate JWT with organization_id claim
- [ ] Create JwtAuthGuard
- [ ] Implement refresh token rotation

**Acceptance Criteria:**
- POST /api/v1/auth/login returns JWT on valid credentials
- JWT contains userId, organizationId, role claims
- Protected routes reject invalid/expired tokens

**Verification:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
# Returns: { "accessToken": "...", "refreshToken": "..." }
```

**Test Required:**
```typescript
describe('AuthController', () => {
  it('should return JWT with organization context', async () => {
    const result = await authService.login({ email, password });
    const decoded = jwt.decode(result.accessToken);
    expect(decoded.org).toBe(user.organizationId);
  });
});
```

---

### Issue #4: Tenant Middleware
**Labels:** `backend`, `middleware`, `security`, `priority:critical`
**Estimate:** 2 hours

**Description:**
Create middleware that sets PostgreSQL tenant context from JWT.

**Tasks:**
- [ ] Create TenantMiddleware
- [ ] Extract organization_id from JWT
- [ ] Execute `SET LOCAL app.current_organization = $1`
- [ ] Apply middleware to all routes except /auth

**Acceptance Criteria:**
- All requests set tenant context before hitting controllers
- Requests without JWT get 401 (except auth routes)
- Tenant context is isolated per request

**Verification:**
```typescript
// Integration test
it('sets tenant context from JWT', async () => {
  const response = await request(app.getHttpServer())
    .get('/api/v1/cases')
    .set('Authorization', `Bearer ${orgAToken}`)
    .expect(200);

  // Verify only org A cases returned
  expect(response.body.every(c => c.organizationId === orgAId)).toBe(true);
});
```

---

### Issue #5: Tenant Isolation Tests Infrastructure
**Labels:** `backend`, `testing`, `security`, `priority:critical`
**Estimate:** 2 hours

**Description:**
Create test utilities and fixtures for tenant isolation testing.

**Tasks:**
- [ ] Create test database seeder with 2 organizations
- [ ] Create test JWT generator for each org
- [ ] Create tenant isolation test helper
- [ ] Add tenant isolation test to CI pipeline

**Acceptance Criteria:**
- Test helper can generate tokens for different orgs
- Isolation test pattern is documented
- CI fails if isolation test fails

**Test Pattern:**
```typescript
describe('Tenant Isolation', () => {
  it('org A cannot see org B cases', async () => {
    // Create case in org B
    await createCase({ organizationId: orgB.id });

    // Query as org A
    const cases = await request(app)
      .get('/api/v1/cases')
      .set('Authorization', `Bearer ${orgAToken}`);

    // Should not contain org B case
    expect(cases.body.some(c => c.organizationId === orgB.id)).toBe(false);
  });
});
```

---

### Issue #6: Case Entity - Prisma Schema
**Labels:** `backend`, `database`, `priority:high`
**Estimate:** 2 hours

**Description:**
Create Case entity with core fields.

**Tasks:**
- [ ] Define Case model in Prisma schema
- [ ] Add organization relationship
- [ ] Add source tracking fields (source_system, source_record_id, migrated_at)
- [ ] Add AI enrichment fields (ai_summary, ai_generated_at, ai_model_version)
- [ ] Add business_unit_id (nullable)
- [ ] Create migration

**Acceptance Criteria:**
- Case table has all fields from PRD-005 Section 2.1
- organization_id is required with foreign key
- Indexes on organization_id and status

**Prisma Schema:**
```prisma
model Case {
  id              String    @id @default(uuid())
  referenceNumber String    @unique
  organizationId  String
  businessUnitId  String?
  status          CaseStatus @default(NEW)

  // Intake
  sourceChannel   SourceChannel
  details         String
  summary         String?
  addendum        String?

  // AI enrichment
  aiSummary           String?
  aiSummaryGeneratedAt DateTime?
  aiModelVersion      String?

  // Migration support
  sourceSystem    String?
  sourceRecordId  String?
  migratedAt      DateTime?

  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  createdById     String

  organization    Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId])
  @@index([status])
}
```

---

### Issue #7: Case CRUD Endpoints
**Labels:** `backend`, `api`, `priority:high`
**Estimate:** 3 hours

**Description:**
Implement Case CRUD operations.

**Tasks:**
- [ ] Create CasesModule
- [ ] Implement CasesService with CRUD methods
- [ ] Implement CasesController with REST endpoints
- [ ] Add validation DTOs
- [ ] Add organization scoping to all queries

**Acceptance Criteria:**
- GET /api/v1/cases returns paginated list
- POST /api/v1/cases creates case with auto-generated reference number
- GET /api/v1/cases/:id returns single case (404 if wrong org)
- PUT /api/v1/cases/:id updates case
- All queries include organization_id filter

**Verification:**
```bash
# Create case
curl -X POST http://localhost:3000/api/v1/cases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sourceChannel":"DIRECT_ENTRY","details":"Test case"}'

# List cases
curl http://localhost:3000/api/v1/cases \
  -H "Authorization: Bearer $TOKEN"
```

---

### Issue #8: Investigation Entity - Prisma Schema
**Labels:** `backend`, `database`, `priority:high`
**Estimate:** 2 hours

**Description:**
Create Investigation entity linked to Case.

**Tasks:**
- [ ] Define Investigation model
- [ ] Add case relationship
- [ ] Add assignment fields
- [ ] Add status workflow fields
- [ ] Add findings fields
- [ ] Create migration

**Acceptance Criteria:**
- Investigation has foreign key to Case
- Investigation can have multiple assignees
- Status field supports workflow transitions

---

### Issue #9: Investigation CRUD Endpoints
**Labels:** `backend`, `api`, `priority:high`
**Estimate:** 3 hours

**Description:**
Implement Investigation CRUD operations.

**Tasks:**
- [ ] Create InvestigationsModule
- [ ] Implement InvestigationsService
- [ ] Implement nested endpoints under cases
- [ ] Add assignment logic
- [ ] Add status transition validation

**Acceptance Criteria:**
- GET /api/v1/cases/:caseId/investigations lists investigations
- POST /api/v1/cases/:caseId/investigations creates investigation
- PUT /api/v1/investigations/:id updates investigation
- PUT /api/v1/investigations/:id/status changes status with validation

---

### Issue #10: Investigation Note Entity & Endpoints
**Labels:** `backend`, `api`, `priority:medium`
**Estimate:** 2 hours

**Description:**
Create Investigation Note entity for investigator documentation.

**Tasks:**
- [ ] Define InvestigationNote model
- [ ] Implement note CRUD endpoints
- [ ] Support rich text content
- [ ] Add visibility field (PRIVATE, TEAM, ALL)

**Acceptance Criteria:**
- POST /api/v1/investigations/:id/notes creates note
- GET /api/v1/investigations/:id/notes lists notes
- Notes support markdown/rich text content

---

### Issue #11: Case Activity Log
**Labels:** `backend`, `audit`, `priority:high`
**Estimate:** 3 hours

**Description:**
Implement immutable activity log for cases.

**Tasks:**
- [ ] Create CaseActivity model (append-only)
- [ ] Create activity logging service
- [ ] Hook into case/investigation changes
- [ ] Store old_value/new_value for changes
- [ ] Add natural language descriptions

**Acceptance Criteria:**
- All case changes create activity entries
- Activity log is append-only (no updates/deletes)
- GET /api/v1/cases/:id/activity returns timeline
- Descriptions are human-readable

**Test:**
```typescript
it('logs activity on case update', async () => {
  await casesService.update(caseId, { status: 'OPEN' });
  const activities = await activityService.findByCase(caseId);
  expect(activities[0].description).toBe('Case status changed from NEW to OPEN');
});
```

---

### Issue #12: PostgreSQL Full-Text Search
**Labels:** `backend`, `search`, `priority:medium`
**Estimate:** 2 hours

**Description:**
Implement basic search using PostgreSQL full-text search.

**Tasks:**
- [ ] Add tsvector column to Case
- [ ] Create GIN index
- [ ] Implement search endpoint
- [ ] Search across details, summary, reference number

**Acceptance Criteria:**
- GET /api/v1/cases?search=keyword returns matching cases
- Search is case-insensitive
- Search works across multiple fields

---

## Frontend Issues

### Issue #13: Frontend Project Setup
**Labels:** `frontend`, `setup`, `priority:critical`
**Estimate:** 2 hours

**Description:**
Initialize Next.js frontend project with shadcn/ui.

**Tasks:**
- [ ] Create Next.js 14 project in `apps/frontend/`
- [ ] Install and configure Tailwind CSS
- [ ] Install shadcn/ui CLI and initialize
- [ ] Set up project structure (app router)
- [ ] Configure API client (axios/fetch)

**Acceptance Criteria:**
- `npm run dev` starts frontend at localhost:3001
- shadcn/ui components available
- Tailwind styles working

**Verification:**
```bash
cd apps/frontend
npm run dev
npm run lint
```

---

### Issue #14: Authentication UI - Login Page
**Labels:** `frontend`, `auth`, `priority:critical`
**Estimate:** 2 hours

**Description:**
Create login page with email/password form.

**Tasks:**
- [ ] Create /login route
- [ ] Build login form with shadcn/ui
- [ ] Implement auth service (API calls)
- [ ] Store JWT in secure cookie/storage
- [ ] Redirect to /cases on success

**Acceptance Criteria:**
- Login form validates email format
- Shows error message on invalid credentials
- Stores token and redirects on success
- Auth middleware protects /cases route

---

### Issue #15: Case List Page - Basic Grid
**Labels:** `frontend`, `ui`, `priority:high`
**Estimate:** 3 hours

**Description:**
Create case list page with data table.

**Tasks:**
- [ ] Create /cases route
- [ ] Implement data table using shadcn/ui
- [ ] Add columns: Reference, Status, Source, Created
- [ ] Fetch cases from API
- [ ] Add loading state

**Acceptance Criteria:**
- /cases displays case list
- Table is sortable by columns
- Shows loading skeleton while fetching
- Empty state when no cases

---

### Issue #16: Case List - Filters & Pagination
**Labels:** `frontend`, `ui`, `priority:medium`
**Estimate:** 2 hours

**Description:**
Add filtering and pagination to case list.

**Tasks:**
- [ ] Add status filter dropdown
- [ ] Add date range filter
- [ ] Implement pagination component
- [ ] Persist filters in URL params

**Acceptance Criteria:**
- Filter by status works
- Pagination shows page numbers
- Filters persist on page refresh (URL state)

---

### Issue #17: Case Detail Page - 3-Column Layout
**Labels:** `frontend`, `ui`, `priority:high`
**Estimate:** 4 hours

**Description:**
Create case detail page with HubSpot-style 3-column layout.

**Tasks:**
- [ ] Create /cases/[id] route
- [ ] Build 3-column layout:
  - Left: Case properties panel
  - Center: Activity timeline
  - Right: Investigations + AI panel
- [ ] Fetch case data with relationships
- [ ] Implement responsive collapse behavior

**Acceptance Criteria:**
- Case detail loads at /cases/:id
- Left panel shows editable properties
- Center shows activity timeline
- Right shows investigations list
- Layout collapses on mobile

---

### Issue #18: Case Properties Panel
**Labels:** `frontend`, `ui`, `priority:high`
**Estimate:** 2 hours

**Description:**
Build left-side properties panel for case detail.

**Tasks:**
- [ ] Create collapsible sections
- [ ] Display all case fields (status, source, category, etc.)
- [ ] Add inline edit capability
- [ ] Add "Add Field" quick action

**Acceptance Criteria:**
- All case properties visible
- Can edit properties inline
- Changes save to API
- Shows save confirmation

---

### Issue #19: Activity Timeline Component
**Labels:** `frontend`, `ui`, `priority:high`
**Estimate:** 3 hours

**Description:**
Build center activity timeline component.

**Tasks:**
- [ ] Create timeline component
- [ ] Display activity entries chronologically
- [ ] Add activity type icons
- [ ] Implement filter tabs (All, Notes, Status Changes)
- [ ] Add "Add Note" quick action

**Acceptance Criteria:**
- Timeline shows all case activity
- Different icons for activity types
- Filter tabs work
- New activities appear without refresh

---

### Issue #20: Investigation Panel
**Labels:** `frontend`, `ui`, `priority:high`
**Estimate:** 3 hours

**Description:**
Build right-side investigation panel.

**Tasks:**
- [ ] Create investigation list in right panel
- [ ] Display investigation status badges
- [ ] Add "Create Investigation" button
- [ ] Click to expand investigation details
- [ ] Show assignees with avatars

**Acceptance Criteria:**
- Investigations visible in right panel
- Status badges color-coded
- Can create new investigation
- Can expand to see details

---

### Issue #21: Investigation Detail Modal/Panel
**Labels:** `frontend`, `ui`, `priority:medium`
**Estimate:** 3 hours

**Description:**
Build investigation detail view (modal or slide-over).

**Tasks:**
- [ ] Create investigation detail component
- [ ] Display all investigation fields
- [ ] Show notes list
- [ ] Add note creation form
- [ ] Implement status change workflow buttons

**Acceptance Criteria:**
- Investigation detail opens from right panel
- All fields editable
- Can add notes
- Status workflow buttons work

---

### Issue #22: Rich Text Note Editor
**Labels:** `frontend`, `ui`, `priority:medium`
**Estimate:** 2 hours

**Description:**
Implement rich text editor for notes.

**Tasks:**
- [ ] Install tiptap or similar editor
- [ ] Create note editor component
- [ ] Support basic formatting (bold, italic, lists)
- [ ] Support file attachments (image embed)
- [ ] Auto-save draft

**Acceptance Criteria:**
- Rich text editor renders in note form
- Formatting buttons work
- Content saves as HTML/markdown

---

### Issue #23: Case Creation Form
**Labels:** `frontend`, `ui`, `priority:high`
**Estimate:** 3 hours

**Description:**
Build case creation form for direct entry.

**Tasks:**
- [ ] Create /cases/new route
- [ ] Build multi-section form
- [ ] Add validation with error messages
- [ ] Implement category selector
- [ ] Add rich text for details field
- [ ] Submit to API and redirect

**Acceptance Criteria:**
- Form validates required fields
- Category dropdown populated from API
- Submits and redirects to new case
- Shows error toast on failure

---

## Integration Issues

### Issue #24: API Client Configuration
**Labels:** `frontend`, `integration`, `priority:high`
**Estimate:** 2 hours

**Description:**
Configure frontend API client with auth handling.

**Tasks:**
- [ ] Create API client wrapper (axios/fetch)
- [ ] Add auth header interceptor
- [ ] Implement token refresh logic
- [ ] Add error handling for 401/403
- [ ] Create typed API methods

**Acceptance Criteria:**
- API calls include Authorization header
- 401 triggers token refresh or redirect to login
- TypeScript types for all API responses

---

### Issue #25: End-to-End Smoke Test
**Labels:** `testing`, `e2e`, `priority:high`
**Estimate:** 2 hours

**Description:**
Create E2E test for core case flow.

**Tasks:**
- [ ] Set up Playwright/Cypress
- [ ] Test: Login → Create Case → View Case → Add Note → Change Status
- [ ] Add to CI pipeline
- [ ] Test tenant isolation (can't see other org's cases)

**Acceptance Criteria:**
- E2E test passes on CI
- Tests complete user journey
- Tenant isolation verified

**Test Script:**
```typescript
test('core case flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');

  // Create case
  await page.click('text=New Case');
  await page.fill('[name=details]', 'Test case details');
  await page.click('button:has-text("Create")');

  // Verify on detail page
  await expect(page).toHaveURL(/\/cases\/[a-z0-9-]+/);
  await expect(page.locator('.case-status')).toHaveText('New');

  // Add note
  await page.click('text=Add Note');
  await page.fill('[name=content]', 'Investigation note');
  await page.click('button:has-text("Save")');

  // Verify in timeline
  await expect(page.locator('.activity-timeline')).toContainText('Investigation note');
});
```

---

## Summary

| Category | Issues | Hours |
|----------|--------|-------|
| Backend - Setup & Security | #1-5 | 13 |
| Backend - Case & Investigation | #6-12 | 17 |
| Frontend - Setup & Auth | #13-14 | 4 |
| Frontend - Case UI | #15-23 | 25 |
| Integration & Testing | #24-25 | 4 |
| **Total** | **25** | **63 hours** |

---

## Issue Creation Commands

```bash
# Create all issues (example using gh CLI)
gh issue create --title "Project Setup & Configuration" \
  --body "$(cat issue-1.md)" \
  --label "backend,setup,priority:critical"

# Or use GitHub API bulk create
```

---

*End of Slice 1 Issues*
