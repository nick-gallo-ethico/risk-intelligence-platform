#!/bin/bash
# Run this after authenticating: gh auth login
# Usage: bash scripts/create-github-issues.sh

set -e

echo "Creating GitHub issues for Slice 1..."

# Issue 5: Tenant Isolation Tests
gh issue create --title "Tenant Isolation Tests Infrastructure" \
  --label "backend,testing,security,priority:critical" \
  --body "## Description
Create test utilities and fixtures for tenant isolation testing.

## Tasks
- [ ] Create test database seeder with 2 organizations
- [ ] Create test JWT generator for each org
- [ ] Create tenant isolation test helper
- [ ] Add tenant isolation test to CI pipeline

## Acceptance Criteria
- Test helper can generate tokens for different orgs
- Isolation test pattern is documented
- CI fails if isolation test fails

**Estimate:** 2 hours"

# Issue 6: Case Entity Schema
gh issue create --title "Case Entity - Prisma Schema" \
  --label "backend,database,priority:high" \
  --body "## Description
Create Case entity with core fields.

## Tasks
- [ ] Define Case model in Prisma schema
- [ ] Add organization relationship
- [ ] Add source tracking fields (source_system, source_record_id, migrated_at)
- [ ] Add AI enrichment fields (ai_summary, ai_generated_at, ai_model_version)
- [ ] Add business_unit_id (nullable)
- [ ] Create migration

## Acceptance Criteria
- Case table has all fields from PRD-005 Section 2.1
- organization_id is required with foreign key
- Indexes on organization_id and status

**Estimate:** 2 hours"

# Issue 7: Case CRUD Endpoints
gh issue create --title "Case CRUD Endpoints" \
  --label "backend,api,priority:high" \
  --body "## Description
Implement Case CRUD operations.

## Tasks
- [ ] Create CasesModule
- [ ] Implement CasesService with CRUD methods
- [ ] Implement CasesController with REST endpoints
- [ ] Add validation DTOs
- [ ] Add organization scoping to all queries

## Acceptance Criteria
- GET /api/v1/cases returns paginated list
- POST /api/v1/cases creates case with auto-generated reference number
- GET /api/v1/cases/:id returns single case (404 if wrong org)
- PUT /api/v1/cases/:id updates case
- All queries include organization_id filter

**Estimate:** 3 hours"

# Issue 8: Investigation Entity Schema
gh issue create --title "Investigation Entity - Prisma Schema" \
  --label "backend,database,priority:high" \
  --body "## Description
Create Investigation entity linked to Case.

## Tasks
- [ ] Define Investigation model
- [ ] Add case relationship
- [ ] Add assignment fields
- [ ] Add status workflow fields
- [ ] Add findings fields
- [ ] Create migration

## Acceptance Criteria
- Investigation has foreign key to Case
- Investigation can have multiple assignees
- Status field supports workflow transitions

**Estimate:** 2 hours"

# Issue 9: Investigation CRUD Endpoints
gh issue create --title "Investigation CRUD Endpoints" \
  --label "backend,api,priority:high" \
  --body "## Description
Implement Investigation CRUD operations.

## Tasks
- [ ] Create InvestigationsModule
- [ ] Implement InvestigationsService
- [ ] Implement nested endpoints under cases
- [ ] Add assignment logic
- [ ] Add status transition validation

## Acceptance Criteria
- GET /api/v1/cases/:caseId/investigations lists investigations
- POST /api/v1/cases/:caseId/investigations creates investigation
- PUT /api/v1/investigations/:id updates investigation
- PUT /api/v1/investigations/:id/status changes status with validation

**Estimate:** 3 hours"

# Issue 10: Investigation Notes
gh issue create --title "Investigation Note Entity & Endpoints" \
  --label "backend,api,priority:medium" \
  --body "## Description
Create Investigation Note entity for investigator documentation.

## Tasks
- [ ] Define InvestigationNote model
- [ ] Implement note CRUD endpoints
- [ ] Support rich text content
- [ ] Add visibility field (PRIVATE, TEAM, ALL)

## Acceptance Criteria
- POST /api/v1/investigations/:id/notes creates note
- GET /api/v1/investigations/:id/notes lists notes
- Notes support markdown/rich text content

**Estimate:** 2 hours"

# Issue 11: Case Activity Log
gh issue create --title "Case Activity Log" \
  --label "backend,priority:high" \
  --body "## Description
Implement immutable activity log for cases.

## Tasks
- [ ] Create CaseActivity model (append-only)
- [ ] Create activity logging service
- [ ] Hook into case/investigation changes
- [ ] Store old_value/new_value for changes
- [ ] Add natural language descriptions

## Acceptance Criteria
- All case changes create activity entries
- Activity log is append-only (no updates/deletes)
- GET /api/v1/cases/:id/activity returns timeline
- Descriptions are human-readable

**Estimate:** 3 hours"

# Issue 12: PostgreSQL Full-Text Search
gh issue create --title "PostgreSQL Full-Text Search for Cases" \
  --label "backend,priority:medium" \
  --body "## Description
Implement basic search using PostgreSQL full-text search.

## Tasks
- [ ] Add tsvector column to Case
- [ ] Create GIN index
- [ ] Implement search endpoint
- [ ] Search across details, summary, reference number

## Acceptance Criteria
- GET /api/v1/cases?search=keyword returns matching cases
- Search is case-insensitive
- Search works across multiple fields

**Estimate:** 2 hours"

# Issue 15: Case List Page
gh issue create --title "Case List Page - Basic Grid" \
  --label "frontend,ui,priority:high" \
  --body "## Description
Create case list page with data table.

## Tasks
- [ ] Create /cases route
- [ ] Implement data table using shadcn/ui
- [ ] Add columns: Reference, Status, Source, Created
- [ ] Fetch cases from API
- [ ] Add loading state

## Acceptance Criteria
- /cases displays case list
- Table is sortable by columns
- Shows loading skeleton while fetching
- Empty state when no cases

**Estimate:** 3 hours"

# Issue 16: Case List Filters
gh issue create --title "Case List - Filters & Pagination" \
  --label "frontend,ui,priority:medium" \
  --body "## Description
Add filtering and pagination to case list.

## Tasks
- [ ] Add status filter dropdown
- [ ] Add date range filter
- [ ] Implement pagination component
- [ ] Persist filters in URL params

## Acceptance Criteria
- Filter by status works
- Pagination shows page numbers
- Filters persist on page refresh (URL state)

**Estimate:** 2 hours"

# Issue 17: Case Detail Page
gh issue create --title "Case Detail Page - 3-Column Layout" \
  --label "frontend,ui,priority:high" \
  --body "## Description
Create case detail page with HubSpot-style 3-column layout.

## Tasks
- [ ] Create /cases/[id] route
- [ ] Build 3-column layout:
  - Left: Case properties panel
  - Center: Activity timeline
  - Right: Investigations + AI panel
- [ ] Fetch case data with relationships
- [ ] Implement responsive collapse behavior

## Acceptance Criteria
- Case detail loads at /cases/:id
- Left panel shows editable properties
- Center shows activity timeline
- Right shows investigations list
- Layout collapses on mobile

**Estimate:** 4 hours"

# Issue 18: Case Properties Panel
gh issue create --title "Case Properties Panel" \
  --label "frontend,ui,priority:high" \
  --body "## Description
Build left-side properties panel for case detail.

## Tasks
- [ ] Create collapsible sections
- [ ] Display all case fields (status, source, category, etc.)
- [ ] Add inline edit capability
- [ ] Add 'Add Field' quick action

## Acceptance Criteria
- All case properties visible
- Can edit properties inline
- Changes save to API
- Shows save confirmation

**Estimate:** 2 hours"

# Issue 19: Activity Timeline Component
gh issue create --title "Activity Timeline Component" \
  --label "frontend,ui,priority:high" \
  --body "## Description
Build center activity timeline component.

## Tasks
- [ ] Create timeline component
- [ ] Display activity entries chronologically
- [ ] Add activity type icons
- [ ] Implement filter tabs (All, Notes, Status Changes)
- [ ] Add 'Add Note' quick action

## Acceptance Criteria
- Timeline shows all case activity
- Different icons for activity types
- Filter tabs work
- New activities appear without refresh

**Estimate:** 3 hours"

# Issue 20: Investigation Panel
gh issue create --title "Investigation Panel" \
  --label "frontend,ui,priority:high" \
  --body "## Description
Build right-side investigation panel.

## Tasks
- [ ] Create investigation list in right panel
- [ ] Display investigation status badges
- [ ] Add 'Create Investigation' button
- [ ] Click to expand investigation details
- [ ] Show assignees with avatars

## Acceptance Criteria
- Investigations visible in right panel
- Status badges color-coded
- Can create new investigation
- Can expand to see details

**Estimate:** 3 hours"

# Issue 21: Investigation Detail Modal
gh issue create --title "Investigation Detail Modal/Panel" \
  --label "frontend,ui,priority:medium" \
  --body "## Description
Build investigation detail view (modal or slide-over).

## Tasks
- [ ] Create investigation detail component
- [ ] Display all investigation fields
- [ ] Show notes list
- [ ] Add note creation form
- [ ] Implement status change workflow buttons

## Acceptance Criteria
- Investigation detail opens from right panel
- All fields editable
- Can add notes
- Status workflow buttons work

**Estimate:** 3 hours"

# Issue 22: Rich Text Note Editor
gh issue create --title "Rich Text Note Editor" \
  --label "frontend,ui,priority:medium" \
  --body "## Description
Implement rich text editor for notes.

## Tasks
- [ ] Install tiptap or similar editor
- [ ] Create note editor component
- [ ] Support basic formatting (bold, italic, lists)
- [ ] Support file attachments (image embed)
- [ ] Auto-save draft

## Acceptance Criteria
- Rich text editor renders in note form
- Formatting buttons work
- Content saves as HTML/markdown

**Estimate:** 2 hours"

# Issue 23: Case Creation Form
gh issue create --title "Case Creation Form" \
  --label "frontend,ui,priority:high" \
  --body "## Description
Build case creation form for direct entry.

## Tasks
- [ ] Create /cases/new route
- [ ] Build multi-section form
- [ ] Add validation with error messages
- [ ] Implement category selector
- [ ] Add rich text for details field
- [ ] Submit to API and redirect

## Acceptance Criteria
- Form validates required fields
- Category dropdown populated from API
- Submits and redirects to new case
- Shows error toast on failure

**Estimate:** 3 hours"

# Issue 25: E2E Smoke Test
gh issue create --title "End-to-End Smoke Test" \
  --label "testing,priority:high" \
  --body "## Description
Create E2E test for core case flow.

## Tasks
- [ ] Set up Playwright
- [ ] Test: Login → Create Case → View Case → Add Note → Change Status
- [ ] Add to CI pipeline
- [ ] Test tenant isolation (can't see other org's cases)

## Acceptance Criteria
- E2E test passes on CI
- Tests complete user journey
- Tenant isolation verified

**Estimate:** 2 hours"

echo ""
echo "✅ All issues created!"
echo "View at: https://github.com/nick-gallo-ethico/risk-intelligence-platform/issues"
