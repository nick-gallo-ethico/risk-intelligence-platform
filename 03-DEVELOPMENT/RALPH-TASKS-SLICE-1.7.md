# Ralph-Ready Tasks: Slice 1.7 - Remaining Foundation Features

**Purpose:** Complete missing foundation features from original Slice 1 scope.
**Slice Goal:** Case creation form, PostgreSQL full-text search, case list refinements.
**GitHub Issues:** #12 (Full-Text Search), #23 (Case Creation Form), #16 (Filters & Pagination)
**Reference:** [docs/SLICE-1-ISSUES.md](../docs/SLICE-1-ISSUES.md)

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

## Prerequisites

This slice assumes Slice 1.6 is complete:
- TenantGuard and RolesGuard in place
- Swagger documentation added
- E2E tests passing

---

## BACKEND TASKS

---

## Task 1.7.1: PostgreSQL Full-Text Search for Cases

**GitHub Issue:** #12
**Estimate:** 2 hours

### Prompt for AI
```
Implement PostgreSQL full-text search for cases following:
- `docs/SLICE-1-ISSUES.md` - Issue #12 requirements
- PostgreSQL tsvector/GIN index best practices

Steps:
1. Add tsvector column to Case table in Prisma schema:
   - searchVector: Unsupported("tsvector")?

2. Create migration that:
   - Adds search_vector column to cases table
   - Creates GIN index on search_vector
   - Creates trigger to auto-update search_vector on insert/update
   - Populates existing rows

SQL for migration:
```sql
-- Add tsvector column
ALTER TABLE cases ADD COLUMN search_vector tsvector;

-- Create GIN index
CREATE INDEX cases_search_idx ON cases USING GIN(search_vector);

-- Create trigger function
CREATE OR REPLACE FUNCTION cases_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.reference_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.details, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.reporter_name, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER cases_search_trigger
  BEFORE INSERT OR UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION cases_search_update();

-- Populate existing rows
UPDATE cases SET search_vector =
  setweight(to_tsvector('english', coalesce(reference_number, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(summary, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(details, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(reporter_name, '')), 'C');
```

3. Update CasesService.findAll() to use full-text search:
   - If `search` query param provided, use plainto_tsquery()
   - Use ts_rank() for relevance scoring
   - Combine with existing filters (status, severity, etc.)

4. Update CaseQueryDto to add search parameter:
   - search?: string (optional)

Search should be:
- Case-insensitive
- Match across: reference_number, summary, details, reporter_name
- Support partial word matching with :* suffix
- Respect tenant isolation (organizationId filter still applies)
```

### Input Files (READ FIRST)
- `docs/SLICE-1-ISSUES.md` - Issue #12 details
- `apps/backend/prisma/schema.prisma` - Current Case model
- `apps/backend/src/modules/cases/cases.service.ts` - Current findAll
- `apps/backend/src/modules/cases/dto/case-query.dto.ts` - Current query DTO

### Output Files
- `apps/backend/prisma/migrations/YYYYMMDD_add_case_search_vector/migration.sql`
- Update `apps/backend/prisma/schema.prisma` (add searchVector field annotation)
- Update `apps/backend/src/modules/cases/cases.service.ts` (search logic)
- Update `apps/backend/src/modules/cases/dto/case-query.dto.ts` (search param)

### Verification (ALL MUST PASS)
```bash
# Migration applies
cd apps/backend && npx prisma migrate dev --name add_case_search_vector

# TypeScript compiles
cd apps/backend && npm run typecheck

# Unit tests pass
cd apps/backend && npm test

# Manual test: search works
curl "http://localhost:3000/api/v1/cases?search=harassment" \
  -H "Authorization: Bearer $TOKEN"
# Should return cases with "harassment" in searchable fields
```

### Stop Condition
- Full-text search working on cases
- Search respects tenant isolation
- GIN index created for performance
- All verification commands pass
- OR document blockers

### Dependencies
- None (standalone feature)

---

## Task 1.7.2: Case Query Filters Enhancement

**GitHub Issue:** #16 (Part 1)
**Estimate:** 1 hour

### Prompt for AI
```
Enhance case query filters to support more filtering options.

Current filters in CaseQueryDto:
- status, severity, search, page, limit

Add new filters:
1. sourceChannel: SourceChannel enum filter
2. caseType: CaseType enum filter
3. createdById: UUID (filter by creator)
4. assignedToId: UUID (filter by assignee) - if assignee field exists
5. fromDate: ISO date string (created after)
6. toDate: ISO date string (created before)
7. sortBy: enum ('createdAt' | 'updatedAt' | 'referenceNumber' | 'severity')
8. sortOrder: enum ('asc' | 'desc')

Update CasesService.findAll() to:
- Apply all filters with AND logic
- Handle date range filtering
- Support sorting by multiple fields

Add validation:
- fromDate must be before toDate if both provided
- Dates must be valid ISO 8601 format
- UUIDs must be valid format

Update Swagger documentation for new query params.
```

### Input Files (READ FIRST)
- `apps/backend/src/modules/cases/dto/case-query.dto.ts` - Current DTO
- `apps/backend/src/modules/cases/cases.service.ts` - Current findAll
- `apps/backend/examples/dto-pattern.ts` - Query DTO patterns

### Output Files
- Update `apps/backend/src/modules/cases/dto/case-query.dto.ts`
- Update `apps/backend/src/modules/cases/cases.service.ts`

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Lint passes
cd apps/backend && npm run lint

# Unit tests pass
cd apps/backend && npm test

# Manual test: filters work
curl "http://localhost:3000/api/v1/cases?status=OPEN&severity=HIGH&fromDate=2026-01-01" \
  -H "Authorization: Bearer $TOKEN"
```

### Stop Condition
- All new filters working
- Date range filtering working
- Sorting working
- Swagger docs updated
- All verification commands pass
- OR document blockers

### Dependencies
- Task 1.7.1 (search filter added)

---

## FRONTEND TASKS

---

## Task 1.7.3: Case Creation Form - Basic Structure

**GitHub Issue:** #23
**Estimate:** 2 hours

### Prompt for AI
```
Build the case creation form page following:
- `docs/SLICE-1-ISSUES.md` - Issue #23 requirements
- `apps/frontend/src/app/cases/[id]/page.tsx` - Case detail patterns
- `apps/frontend/src/components/ui/` - shadcn/ui components

Create /cases/new route with multi-section form:

Section 1: Basic Information
- Source Channel: Select (DIRECT_ENTRY, WEB_FORM, etc.)
- Case Type: Select (ETHICS_CONCERN, POLICY_VIOLATION, etc.)
- Severity: Select (LOW, MEDIUM, HIGH, CRITICAL)

Section 2: Details
- Summary: Textarea (max 500 chars)
- Details: Rich text editor (use Tiptap from 1.5.7)
- Category: Select (from API or hardcoded for now)

Section 3: Reporter Information (optional)
- Reporter Type: Select (EMPLOYEE, THIRD_PARTY, ANONYMOUS)
- Reporter Name: Input (optional)
- Reporter Email: Input (optional, validate format)
- Reporter Phone: Input (optional)

Section 4: Location
- Incident Country: Select (country list)
- Incident Region: Input (optional)
- Incident Location: Input (optional)

Form features:
- Client-side validation with react-hook-form + zod
- Show validation errors inline
- Disable submit until required fields filled
- Loading state on submit
- Error toast on failure
- Redirect to case detail on success

Layout:
- Use Card components for sections
- Responsive: single column on mobile, 2 columns on desktop
- Sticky "Create Case" button at bottom
```

### Input Files (READ FIRST)
- `docs/SLICE-1-ISSUES.md` - Issue #23 requirements
- `apps/frontend/src/app/cases/[id]/page.tsx` - Case patterns
- `apps/frontend/src/components/ui/` - shadcn/ui components
- `apps/frontend/src/lib/api.ts` - API client
- `apps/backend/src/modules/cases/dto/create-case.dto.ts` - Required fields

### Output Files
- `apps/frontend/src/app/cases/new/page.tsx`
- `apps/frontend/src/components/cases/case-creation-form.tsx`
- `apps/frontend/src/components/cases/form-sections/basic-info-section.tsx`
- `apps/frontend/src/components/cases/form-sections/details-section.tsx`
- `apps/frontend/src/components/cases/form-sections/reporter-section.tsx`
- `apps/frontend/src/components/cases/form-sections/location-section.tsx`
- `apps/frontend/src/lib/validations/case-schema.ts` (zod schema)

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/frontend && npm run typecheck

# Lint passes
cd apps/frontend && npm run lint

# Manual verification:
# 1. Navigate to /cases/new
# 2. Verify all form sections render
# 3. Test validation (submit with empty required fields)
# 4. Fill form and submit
# 5. Verify redirect to case detail
```

### Stop Condition
- Form renders with all sections
- Validation working
- Submit creates case via API
- Redirect to case detail works
- OR document blockers

### Dependencies
- Case CRUD endpoints from Slice 1.2

---

## Task 1.7.4: Case Creation Form - API Integration

**GitHub Issue:** #23
**Estimate:** 1 hour

### Prompt for AI
```
Complete API integration for case creation form.

Tasks:
1. Create API client function for case creation:
   - POST /api/v1/cases
   - Handle validation errors (400)
   - Handle auth errors (401)
   - Return created case data

2. Integrate with react-query or SWR for:
   - Mutation handling
   - Loading state
   - Error state
   - Success callback

3. Add success handling:
   - Show success toast with reference number
   - Redirect to /cases/:id
   - Clear form state

4. Add error handling:
   - Show error toast with message
   - Map API validation errors to form fields
   - Keep form state on error

5. Add "Save Draft" functionality (localStorage):
   - Auto-save every 30 seconds
   - Restore draft on page load
   - Clear draft on successful submit
   - Show "Draft saved" indicator

API payload should match CreateCaseDto:
```typescript
interface CreateCasePayload {
  sourceChannel: SourceChannel;
  caseType: CaseType;
  severity: Severity;
  summary: string;
  details: string;
  category?: string;
  reporterType?: ReporterType;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  incidentCountry?: string;
  incidentRegion?: string;
  incidentLocation?: string;
}
```
```

### Input Files (READ FIRST)
- `apps/frontend/src/lib/api.ts` - Existing API client
- `apps/frontend/src/components/cases/case-creation-form.tsx` - Form from 1.7.3
- `apps/backend/src/modules/cases/dto/create-case.dto.ts` - DTO definition

### Output Files
- `apps/frontend/src/lib/cases-api.ts` (add createCase function)
- Update `apps/frontend/src/components/cases/case-creation-form.tsx`
- `apps/frontend/src/hooks/use-case-form-draft.ts` (draft persistence hook)

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/frontend && npm run typecheck

# Lint passes
cd apps/frontend && npm run lint

# Manual verification:
# 1. Fill and submit form
# 2. Verify case created in backend
# 3. Verify redirect to new case
# 4. Test draft save/restore
# 5. Test validation error display
```

### Stop Condition
- Form submits to API successfully
- Validation errors displayed correctly
- Draft persistence working
- Success redirect working
- All verification commands pass
- OR document blockers

### Dependencies
- Task 1.7.3 (form structure)

---

## Task 1.7.5: Case List - Enhanced Filters UI

**GitHub Issue:** #16 (Part 2)
**Estimate:** 1.5 hours

### Prompt for AI
```
Enhance case list page with better filter UI.

Current state: Basic filters exist
Target: Full filter bar with all new backend filters

Features:
1. Filter bar (horizontal, collapsible on mobile):
   - Status: Multi-select dropdown
   - Severity: Multi-select dropdown
   - Source Channel: Dropdown
   - Case Type: Dropdown
   - Date Range: Date picker (from/to)
   - Clear All button

2. Active filters display:
   - Show chips for active filters below filter bar
   - Click chip to remove filter
   - Show count: "12 results"

3. Search enhancement:
   - Debounced search input (300ms)
   - Search icon and clear button
   - Full-text search (uses backend)

4. Sort controls:
   - Sort by dropdown (Created, Updated, Reference, Severity)
   - Sort order toggle (asc/desc)

5. URL state:
   - Persist all filters in URL query params
   - Shareable URLs with filters
   - Browser back/forward works

6. Pagination improvements:
   - Show "Showing 1-20 of 156"
   - Page size selector (10, 20, 50, 100)
   - Page navigation

Components to create/update:
- CaseListFilters (filter bar component)
- FilterChips (active filters display)
- SearchInput (debounced search)
- Pagination (page controls)

Use shadcn/ui:
- Select for dropdowns
- Popover + Calendar for date range
- Badge for chips
- Input for search
```

### Input Files (READ FIRST)
- `apps/frontend/src/app/cases/page.tsx` - Current case list
- `apps/frontend/src/components/ui/` - shadcn/ui components
- `apps/frontend/src/lib/cases-api.ts` - API functions

### Output Files
- `apps/frontend/src/components/cases/case-list-filters.tsx`
- `apps/frontend/src/components/cases/filter-chips.tsx`
- `apps/frontend/src/components/cases/search-input.tsx`
- Update `apps/frontend/src/app/cases/page.tsx`
- `apps/frontend/src/hooks/use-case-filters.ts` (URL state hook)

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/frontend && npm run typecheck

# Lint passes
cd apps/frontend && npm run lint

# Manual verification:
# 1. Test each filter type
# 2. Test filter combinations
# 3. Test URL persistence
# 4. Test search debounce
# 5. Test pagination
# 6. Test mobile responsive
```

### Stop Condition
- All filters working
- URL state persisted
- Search debounced
- Pagination complete
- Mobile responsive
- All verification commands pass
- OR document blockers

### Dependencies
- Task 1.7.2 (backend filters)

---

## Task 1.7.6: Dashboard Quick Actions

**Estimate:** 1 hour

### Prompt for AI
```
Add quick action buttons and stats to dashboard.

Current state: Basic dashboard exists
Target: Dashboard with actions and key metrics

Features:
1. Quick Actions section:
   - "Create Case" button (links to /cases/new)
   - "My Open Cases" button (filtered view)
   - "Recent Activity" link

2. Stats cards row:
   - Total Cases (this month)
   - Open Cases
   - In Progress
   - Average Resolution Time (days)

3. Recent Cases table:
   - Show 5 most recent cases
   - Quick status badge
   - Click to navigate to detail

4. My Assignments section:
   - Cases/investigations assigned to current user
   - Due date indicators
   - Quick status update

API endpoints to use:
- GET /api/v1/cases?limit=5&sortBy=createdAt&sortOrder=desc (recent)
- GET /api/v1/cases?assignedToId=me (assignments)
- Stats can be derived from list response metadata

Layout:
- Cards for stats
- Table for recent cases
- List for assignments
```

### Input Files (READ FIRST)
- `apps/frontend/src/app/dashboard/page.tsx` - Current dashboard
- `apps/frontend/src/components/ui/` - shadcn/ui components

### Output Files
- Update `apps/frontend/src/app/dashboard/page.tsx`
- `apps/frontend/src/components/dashboard/stats-cards.tsx`
- `apps/frontend/src/components/dashboard/recent-cases.tsx`
- `apps/frontend/src/components/dashboard/my-assignments.tsx`
- `apps/frontend/src/components/dashboard/quick-actions.tsx`

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/frontend && npm run typecheck

# Lint passes
cd apps/frontend && npm run lint

# Manual verification:
# 1. Dashboard loads with all sections
# 2. Stats display correctly
# 3. Recent cases clickable
# 4. Quick actions work
```

### Stop Condition
- Dashboard displays stats
- Quick actions work
- Recent cases load
- Assignments section works
- All verification commands pass
- OR document blockers

### Dependencies
- Task 1.7.4 (case creation exists)

---

## Task 1.7.7: E2E Tests for New Features

**Estimate:** 1.5 hours

### Prompt for AI
```
Add E2E tests for the new features in Slice 1.7.

Test scenarios:

1. Case Creation Form:
   - Navigate to /cases/new
   - Fill all required fields
   - Submit form
   - Verify redirect to case detail
   - Verify reference number generated
   - Test validation errors

2. Full-Text Search:
   - Create case with specific text
   - Navigate to case list
   - Search for that text
   - Verify case appears in results
   - Search for non-existent text
   - Verify no results

3. Filters:
   - Apply status filter
   - Verify filtered results
   - Apply date range filter
   - Verify filtered results
   - Clear filters
   - Verify all cases shown

4. Dashboard:
   - Navigate to dashboard
   - Verify stats load
   - Click "Create Case"
   - Verify navigation to /cases/new
   - Click recent case
   - Verify navigation to case detail

Add to existing Playwright tests.
```

### Input Files (READ FIRST)
- `apps/frontend/e2e/tests/smoke.spec.ts` - Existing tests
- `apps/frontend/e2e/pages/` - Page objects

### Output Files
- `apps/frontend/e2e/tests/case-creation.spec.ts`
- `apps/frontend/e2e/tests/search-filters.spec.ts`
- `apps/frontend/e2e/pages/case-new.page.ts`
- Update `apps/frontend/e2e/pages/case-list.page.ts` (add filter methods)

### Verification (ALL MUST PASS)
```bash
# E2E tests pass
cd apps/frontend && npm run e2e
```

### Stop Condition
- All E2E tests pass
- New features covered
- OR document blockers

### Dependencies
- All previous tasks in this slice

---

## Task Dependency Graph

```
BACKEND:

Task 1.7.1 (Full-Text Search)
     │
     v
Task 1.7.2 (Query Filters)


FRONTEND:

Task 1.7.3 (Form Structure)
     │
     v
Task 1.7.4 (API Integration)


Task 1.7.2 ───────────────────► Task 1.7.5 (Filters UI)


Task 1.7.4 ───────────────────► Task 1.7.6 (Dashboard)


E2E TESTING:

All Tasks ────────────────────► Task 1.7.7 (E2E Tests)
```

---

## Parallel Execution Opportunities

**Phase 1 (can run in parallel):**
- Backend: 1.7.1 (Search) → 1.7.2 (Filters)
- Frontend: 1.7.3 (Form) → 1.7.4 (API)

**Phase 2 (after Phase 1):**
- 1.7.5 (Filters UI) - needs 1.7.2
- 1.7.6 (Dashboard) - needs 1.7.4

**Phase 3 (after all):**
- 1.7.7 (E2E Tests)

---

## Success Criteria for Slice 1.7

### Backend
- [ ] Full-text search working on cases
- [ ] GIN index created for performance
- [ ] All query filters implemented
- [ ] Date range filtering working
- [ ] Sorting by multiple fields

### Frontend - Case Creation
- [ ] /cases/new route created
- [ ] Multi-section form renders
- [ ] Client-side validation working
- [ ] API integration complete
- [ ] Draft persistence working
- [ ] Success redirect with toast

### Frontend - Case List
- [ ] All filter types in UI
- [ ] Filter chips display
- [ ] Search with debounce
- [ ] URL state persistence
- [ ] Pagination controls

### Dashboard
- [ ] Stats cards display
- [ ] Recent cases load
- [ ] Quick actions work
- [ ] My assignments section

### Testing
- [ ] E2E tests for case creation
- [ ] E2E tests for search/filters
- [ ] All existing tests still pass

### Verification Commands (All Must Pass)
```bash
cd apps/backend && npm run typecheck
cd apps/backend && npm run lint
cd apps/backend && npm test
cd apps/backend && npm run test:e2e
cd apps/frontend && npm run typecheck
cd apps/frontend && npm run lint
cd apps/frontend && npm run e2e
```

---

*End of Ralph-Ready Tasks for Slice 1.7*
