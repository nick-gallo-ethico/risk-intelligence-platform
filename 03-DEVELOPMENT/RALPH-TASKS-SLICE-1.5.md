# Ralph-Ready Tasks: Slice 1.5 - Investigation Notes & E2E Testing

**Purpose:** Detailed, AI-executable task breakdown for autonomous development.
**Slice Goal:** Investigation notes backend + Investigation detail UI + Rich text editor + E2E smoke test.
**GitHub Issues:** #10 (Investigation Notes), #21 (Investigation Detail Modal), #22 (Rich Text Editor), #25 (E2E Smoke Test)
**Reference:** [02-MODULES/05-CASE-MANAGEMENT/PRD.md](../02-MODULES/05-CASE-MANAGEMENT/PRD.md) Section 2.3 Investigation Notes

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

This slice assumes Slice 1.4 is complete:
- Investigation entity exists in Prisma schema
- Investigation CRUD endpoints working
- Case detail page with 3-column layout
- Investigations panel on case detail page

---

## BACKEND TASKS: Investigation Notes (Issue #10)

---

## Task 1.5.1: InvestigationNote Entity - Prisma Schema

**GitHub Issue:** #10 (Part 1)
**Estimate:** 1.5 hours

### Prompt for AI
```
Create the InvestigationNote entity in Prisma schema following:
- `02-MODULES/05-CASE-MANAGEMENT/PRD.md` - Investigation Note requirements
- `apps/backend/examples/entity-pattern.prisma` - Entity structure
- `apps/backend/prisma/schema.prisma` - Existing patterns (Case, AuditLog)

Include:
1. Core fields: id, investigationId (FK), organizationId (denormalized for RLS)
2. Content: content (rich text), contentPlainText (for search), noteType enum
3. Visibility: visibility enum (PRIVATE, TEAM, ALL)
4. Author: authorId, authorName (denormalized for display)
5. Edit tracking: isEdited, editedAt, editCount
6. Attachments: attachments (JSON array of file references)
7. AI enrichment: aiSummary, aiSummaryGeneratedAt, aiModelVersion
8. Migration: sourceSystem, sourceRecordId, migratedAt
9. Audit: createdAt, updatedAt

Create enums:
- NoteType: GENERAL, INTERVIEW, EVIDENCE, FINDING, RECOMMENDATION, FOLLOW_UP
- NoteVisibility: PRIVATE (author only), TEAM (assigned investigators), ALL (org users with case access)

Add proper indexes for query patterns (org+investigation, org+author, createdAt).
Add relation to Investigation entity.

IMPORTANT: organizationId is denormalized from Investigation for RLS efficiency.
```

### Input Files (READ FIRST)
- `02-MODULES/05-CASE-MANAGEMENT/PRD.md` - Note requirements
- `apps/backend/examples/entity-pattern.prisma` - Pattern structure
- `apps/backend/prisma/schema.prisma` - Current schema with Investigation entity

### Output Files
- `apps/backend/prisma/schema.prisma` (add InvestigationNote model, enums)
- `apps/backend/prisma/migrations/YYYYMMDD_add_investigation_note/migration.sql` (generated)

### Verification (ALL MUST PASS)
```bash
# Prisma schema is valid
cd apps/backend && npx prisma validate

# Migration generates and applies
cd apps/backend && npx prisma migrate dev --name add_investigation_note

# Prisma client generates
cd apps/backend && npx prisma generate

# TypeScript compiles (new types available)
cd apps/backend && npm run typecheck
```

### Stop Condition
- All verification commands pass
- Schema includes all required fields
- Relation to Investigation established
- Enums for NoteType and NoteVisibility created
- OR if unclear about field types or enums, document in BLOCKERS.md

### Dependencies
- Slice 1.4 complete (Investigation entity exists)

### Notes
- organizationId is denormalized from Investigation for RLS efficiency
- contentPlainText is auto-generated from content for full-text search
- Attachments is JSON array: `[{ id, filename, url, size, mimeType }]`
- Do NOT create the files/attachment storage service yet (future task)

---

## Task 1.5.2: InvestigationNote RLS Policies

**GitHub Issue:** #10 (Part 2)
**Estimate:** 30 minutes

### Prompt for AI
```
Add PostgreSQL Row-Level Security policies for the InvestigationNote table.

Follow the pattern in:
- `apps/backend/prisma/migrations/20260129221829_add_rls_policies/migration.sql`
- `apps/backend/prisma/migrations/*_add_audit_log_rls/migration.sql` (if exists)

Create policies that:
1. Enable RLS on investigation_notes table
2. Filter reads by current_setting('app.current_organization')
3. Restrict inserts to same organization as the parent investigation
4. Restrict updates/deletes to same organization AND (author = current user OR higher role)
5. Allow bypass when app.bypass_rls = 'true'

The organizationId on InvestigationNote is denormalized, so RLS can filter directly.

NOTE: Visibility-based filtering (PRIVATE/TEAM/ALL) should be handled at the
application layer, not RLS. RLS only enforces tenant isolation.
```

### Input Files (READ FIRST)
- `apps/backend/prisma/migrations/20260129221829_add_rls_policies/migration.sql` - Existing RLS pattern
- `apps/backend/prisma/schema.prisma` - Current schema with InvestigationNote entity

### Output Files
- `apps/backend/prisma/migrations/YYYYMMDD_add_investigation_note_rls/migration.sql`

### Verification (ALL MUST PASS)
```bash
# Migration applies
cd apps/backend && npx prisma migrate dev --name add_investigation_note_rls

# RLS policies exist (check in database)
# Run this SQL: SELECT * FROM pg_policies WHERE tablename = 'investigation_notes';
# Should return rows for select, insert, update, delete policies
```

### Stop Condition
- Migration applies successfully
- RLS policies visible in pg_policies view
- OR document issues in BLOCKERS.md

### Dependencies
- Task 1.5.1 (InvestigationNote entity exists)

---

## Task 1.5.3: InvestigationNote DTOs

**GitHub Issue:** #10 (Part 3)
**Estimate:** 1 hour

### Prompt for AI
```
Create DTOs for InvestigationNote following:
- `apps/backend/examples/dto-pattern.ts` - DTO structure
- `apps/backend/src/modules/cases/dto/` - Case DTO patterns for reference
- `apps/backend/src/modules/investigations/dto/` - Investigation DTOs (from 1.4)

Create:
1. CreateInvestigationNoteDto
   - content: string (required, rich text HTML/markdown)
   - noteType: NoteType (required)
   - visibility: NoteVisibility (default: TEAM)
   - attachments?: AttachmentDto[] (optional)

2. UpdateInvestigationNoteDto
   - content?: string
   - noteType?: NoteType
   - visibility?: NoteVisibility
   - attachments?: AttachmentDto[]

3. InvestigationNoteQueryDto (for list endpoint)
   - noteType?: NoteType
   - visibility?: NoteVisibility
   - authorId?: string
   - page?: number
   - limit?: number
   - sortBy?: string ('createdAt' default)
   - sortOrder?: 'asc' | 'desc'

4. AttachmentDto (nested)
   - id: string (required)
   - filename: string (required)
   - url: string (required)
   - size: number (bytes)
   - mimeType: string

5. InvestigationNoteResponseDto
   - All fields from entity
   - author: { id, name, email }
   - investigation: { id, investigationNumber }

Remember:
- NEVER include organizationId or investigationId in create DTO (set from context/route)
- Use class-validator decorators (@IsString, @IsEnum, @IsOptional, etc.)
- Use @MaxLength for content field (e.g., 50000 chars)
- Sanitize HTML content in service layer (not DTO)
```

### Input Files (READ FIRST)
- `apps/backend/examples/dto-pattern.ts` - MUST follow this structure
- `apps/backend/src/modules/cases/dto/` - Case DTO examples
- `apps/backend/src/modules/investigations/dto/` - Investigation DTO reference
- `apps/backend/prisma/schema.prisma` - InvestigationNote field definitions

### Output Files
- `apps/backend/src/modules/investigation-notes/dto/create-investigation-note.dto.ts`
- `apps/backend/src/modules/investigation-notes/dto/update-investigation-note.dto.ts`
- `apps/backend/src/modules/investigation-notes/dto/investigation-note-query.dto.ts`
- `apps/backend/src/modules/investigation-notes/dto/attachment.dto.ts`
- `apps/backend/src/modules/investigation-notes/dto/investigation-note-response.dto.ts`
- `apps/backend/src/modules/investigation-notes/dto/index.ts`

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Lint passes
cd apps/backend && npm run lint
```

### Stop Condition
- All verification commands pass
- DTOs cover all CRUD operations
- Response DTO includes nested author/investigation
- OR document unclear requirements in BLOCKERS.md

### Dependencies
- Task 1.5.1 (InvestigationNote types exist from Prisma)

---

## Task 1.5.4: InvestigationNote Service with Activity Logging

**GitHub Issue:** #10 (Part 4)
**Estimate:** 2.5 hours

### Prompt for AI
```
Create InvestigationNoteService following:
- `apps/backend/examples/service-pattern.ts` - Service structure
- `apps/backend/src/modules/cases/cases.service.ts` - Case service patterns
- `apps/backend/src/common/services/activity.service.ts` - Activity logging pattern

Implement:
1. create(dto, investigationId, userId, orgId) - Create note
   - Verify investigation exists and belongs to org
   - Strip/sanitize HTML content (use sanitize-html or similar)
   - Generate contentPlainText from content (strip tags)
   - Set authorId and authorName (denormalized)
   - Log activity: "User added a note to Investigation #X"
   - Return created note

2. findAllForInvestigation(investigationId, query, userId, orgId) - List notes
   - Filter by investigationId and organizationId (CRITICAL)
   - Apply visibility filter based on userId and role:
     - PRIVATE: only author can see
     - TEAM: only assigned investigators on this investigation
     - ALL: anyone with case access
   - Support pagination and sorting
   - Return with author details

3. findOne(id, userId, orgId) - Get single note
   - Include investigation relation
   - Check visibility permissions
   - Throw NotFoundException if not found or no access

4. update(id, dto, userId, orgId) - Update note
   - Verify exists and belongs to org
   - Check author = userId OR user has higher role (COMPLIANCE_OFFICER+)
   - Mark isEdited = true, increment editCount
   - Update editedAt timestamp
   - Regenerate contentPlainText if content changed
   - Log activity: "User edited note on Investigation #X"

5. delete(id, userId, orgId) - Soft delete or hard delete
   - Verify exists and belongs to org
   - Check author = userId OR user has higher role
   - Log activity: "User deleted note from Investigation #X"

6. stripHtml(html: string) - Helper to generate plain text
   - Remove HTML tags
   - Decode HTML entities
   - Trim and collapse whitespace

ALL queries must filter by organizationId. RLS provides backup, but code must still filter.
Use ActivityService.log() for all mutations with natural language descriptions.
```

### Input Files (READ FIRST)
- `apps/backend/examples/service-pattern.ts` - MUST follow this structure
- `apps/backend/src/modules/cases/cases.service.ts` - Case service reference
- `apps/backend/src/common/services/activity.service.ts` - Activity logging
- `apps/backend/src/modules/investigation-notes/dto/` - DTOs from previous task

### Output Files
- `apps/backend/src/modules/investigation-notes/investigation-notes.service.ts`
- `apps/backend/src/modules/investigation-notes/investigation-notes.service.spec.ts` (unit tests)

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Unit tests pass
cd apps/backend && npm test -- --testPathPattern="investigation-notes.service"

# Tests should include:
# - "should create note with correct organization"
# - "should strip HTML to generate plain text"
# - "should log activity on note creation"
# - "should not find note from different org"
# - "should filter by visibility permissions"
# - "should mark note as edited on update"
# - "should only allow author or admin to update"
```

### Stop Condition
- All verification commands pass
- Unit tests cover key scenarios
- All queries filter by organizationId
- Activity logging integrated
- OR document blockers

### Dependencies
- Task 1.5.3 (DTOs exist)
- ActivityService available (from Slice 1.3)
- InvestigationsService available (from Slice 1.4) for investigation lookup

---

## Task 1.5.5: InvestigationNote Controller & Module

**GitHub Issue:** #10 (Part 5)
**Estimate:** 1.5 hours

### Prompt for AI
```
Create InvestigationNoteController and InvestigationNotesModule following:
- `apps/backend/examples/controller-pattern.ts` - Controller structure
- `apps/backend/src/modules/cases/cases.controller.ts` - Case controller reference
- `apps/backend/src/modules/investigations/investigations.controller.ts` - Investigation controller

Implement endpoints (nested under investigations):

POST /api/v1/investigations/:investigationId/notes - Create note
GET /api/v1/investigations/:investigationId/notes - List notes for investigation
GET /api/v1/investigations/:investigationId/notes/:id - Get single note
PATCH /api/v1/investigations/:investigationId/notes/:id - Update note
DELETE /api/v1/investigations/:investigationId/notes/:id - Delete note

All routes:
- Protected by JwtAuthGuard
- Use @CurrentUser() decorator for user context
- Use @TenantId() decorator for organization context
- Validate UUIDs with ParseUUIDPipe

Role requirements:
- Create: Any user with investigation access (INVESTIGATOR+)
- View: Based on visibility setting and user role
- Update: Author only OR COMPLIANCE_OFFICER+
- Delete: Author only OR COMPLIANCE_OFFICER+

Create InvestigationNotesModule that:
- Imports InvestigationsModule (for investigation lookup)
- Imports ActivityModule (for activity logging)
- Provides InvestigationNotesService
- Exports InvestigationNotesService

Update AppModule to import InvestigationNotesModule.
```

### Input Files (READ FIRST)
- `apps/backend/examples/controller-pattern.ts` - MUST follow this structure
- `apps/backend/src/modules/cases/cases.controller.ts` - Reference
- `apps/backend/src/modules/investigations/investigations.controller.ts` - Reference
- `apps/backend/src/modules/investigation-notes/investigation-notes.service.ts` - Service

### Output Files
- `apps/backend/src/modules/investigation-notes/investigation-notes.controller.ts`
- `apps/backend/src/modules/investigation-notes/investigation-notes.module.ts`
- `apps/backend/src/modules/investigation-notes/index.ts`
- Update `apps/backend/src/app.module.ts` to import InvestigationNotesModule

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
curl -X POST "http://localhost:3000/api/v1/investigations/{INVESTIGATION_ID}/notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"<p>Test note content</p>","noteType":"GENERAL","visibility":"TEAM"}'
```

### Stop Condition
- All verification commands pass
- All endpoints respond correctly with auth
- Visibility filtering works
- OR document blockers

### Dependencies
- Task 1.5.4 (Service exists)

---

## Task 1.5.6: InvestigationNote E2E Tests

**GitHub Issue:** #10 (Part 6)
**Estimate:** 2 hours

### Prompt for AI
```
Create E2E tests for InvestigationNote endpoints following:
- `apps/backend/examples/e2e-test-pattern.spec.ts`
- `apps/backend/test/cases/cases.e2e-spec.ts` - Existing case E2E tests
- `apps/backend/test/investigations/investigations.e2e-spec.ts` - Investigation E2E tests (from 1.4)

Test scenarios:
1. Tenant Isolation:
   - Org B cannot see Org A's investigation notes
   - Cannot create note on Org A's investigation as Org B user
   - Note list filtered by current organization

2. CRUD Operations:
   - Create note on existing investigation
   - List notes for an investigation (paginated)
   - Get single note with author details
   - Update note content
   - Delete note

3. Visibility Filtering:
   - PRIVATE notes only visible to author
   - TEAM notes visible to assigned investigators
   - ALL notes visible to org users with case access
   - Visibility respected on list and get endpoints

4. Edit Tracking:
   - Update sets isEdited = true
   - editCount increments on each update
   - editedAt updated on change

5. Permission Enforcement:
   - Non-author cannot update note (unless admin)
   - Non-author cannot delete note (unless admin)
   - COMPLIANCE_OFFICER can update/delete any note

6. Content Handling:
   - HTML content stored correctly
   - Plain text extracted from HTML
   - Large content (10KB) handled
```

### Input Files (READ FIRST)
- `apps/backend/examples/e2e-test-pattern.spec.ts` - Test structure
- `apps/backend/test/cases/cases.e2e-spec.ts` - Case E2E reference
- `apps/backend/test/investigations/investigations.e2e-spec.ts` - Investigation E2E reference
- `apps/backend/test/helpers/` - Test utilities
- `apps/backend/src/modules/investigation-notes/` - Implementation

### Output Files
- `apps/backend/test/investigation-notes/investigation-notes.e2e-spec.ts`
- `apps/backend/test/investigation-notes/investigation-notes-visibility.e2e-spec.ts`

### Verification (ALL MUST PASS)
```bash
# E2E tests pass
cd apps/backend && npm run test:e2e -- --testPathPattern="investigation-notes"

# Tenant isolation tests pass
cd apps/backend && npm run test:tenant-isolation
```

### Stop Condition
- All E2E tests pass
- Tenant isolation verified
- Visibility filtering verified
- OR document any test failures in BLOCKERS.md

### Dependencies
- Task 1.5.5 (Controller exists)
- Test utilities from Slice 1.2

---

## FRONTEND TASKS: Investigation Notes UI (Issues #21, #22)

---

## Task 1.5.7: Rich Text Note Editor Component

**GitHub Issue:** #22
**Estimate:** 2.5 hours

### Prompt for AI
```
Implement rich text editor for investigation notes using Tiptap.

Follow existing patterns in:
- `apps/frontend/src/components/ui/` - shadcn/ui components
- `apps/frontend/src/components/cases/` - Case component patterns

Features:
1. Editor with toolbar:
   - Bold, Italic, Underline
   - Bullet list, Numbered list
   - Quote block
   - Link insertion
   - Image embed (from URL or future upload)
   - Code block (for evidence snippets)

2. Editor modes:
   - Edit mode: Full editing capabilities
   - Read-only mode: Display rendered content
   - Preview mode: Toggle between edit and preview

3. Auto-save draft:
   - Store draft in localStorage keyed by investigationId
   - Recover draft on reload
   - Clear draft on successful save

4. Character/word count:
   - Show character count
   - Warn at 45000 chars
   - Block at 50000 chars

5. Placeholder text:
   - "Add your investigation notes here..."

Install dependencies:
- @tiptap/react
- @tiptap/starter-kit
- @tiptap/extension-link
- @tiptap/extension-image
- @tiptap/extension-placeholder
- @tiptap/extension-character-count

Components to create:
- RichTextEditor (main component)
- EditorToolbar (formatting buttons)
- EditorContent (wrapper around Tiptap)
- CharacterCount (display component)
```

### Input Files (READ FIRST)
- `apps/frontend/src/components/ui/` - shadcn/ui components
- `apps/frontend/src/components/cases/` - Existing patterns
- `apps/frontend/package.json` - Check existing dependencies

### Output Files
- `apps/frontend/src/components/rich-text/rich-text-editor.tsx`
- `apps/frontend/src/components/rich-text/editor-toolbar.tsx`
- `apps/frontend/src/components/rich-text/character-count.tsx`
- `apps/frontend/src/components/rich-text/index.ts`
- `apps/frontend/src/hooks/use-draft.ts` (localStorage draft hook)

### Verification (ALL MUST PASS)
```bash
# Install Tiptap dependencies
cd apps/frontend && npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-placeholder @tiptap/extension-character-count

# TypeScript compiles
cd apps/frontend && npm run typecheck

# Lint passes
cd apps/frontend && npm run lint

# Manual verification:
# 1. Create test page that renders RichTextEditor
# 2. Test all toolbar buttons work
# 3. Test character count updates
# 4. Test draft save/restore
```

### Stop Condition
- All verification commands pass
- Editor renders with toolbar
- Formatting buttons work
- Draft persistence works
- OR document blockers

### Dependencies
- Frontend setup from Slice 1.2

### Notes
- Use shadcn/ui Button and Tooltip for toolbar
- Style toolbar to match existing UI
- Export HTML content via editor.getHTML()
- Consider accessibility (keyboard shortcuts, ARIA labels)

---

## Task 1.5.8: Investigation Detail Modal/Panel

**GitHub Issue:** #21
**Estimate:** 3 hours

### Prompt for AI
```
Build Investigation detail slide-over panel with notes management.

Follow existing patterns in:
- `apps/frontend/src/app/cases/[id]/page.tsx` - Case detail page
- `apps/frontend/src/components/cases/` - Case components
- `apps/frontend/src/components/ui/` - shadcn/ui components

Features:
1. Slide-over panel (from right):
   - Opens when clicking investigation card in case detail
   - 600px wide on desktop, full-width on mobile
   - Close button and click-outside-to-close

2. Investigation header:
   - Investigation number (#1, #2, etc.)
   - Status badge (color-coded)
   - Type badge (FULL, LIMITED, INQUIRY)
   - Department badge
   - Due date with SLA indicator

3. Tabs within panel:
   - Overview (investigation properties)
   - Notes (timeline of notes)
   - Findings (if status is PENDING_REVIEW or CLOSED)

4. Overview tab:
   - Editable fields (status, due date, category)
   - Assignment section (add/remove investigators)
   - SLA status indicator

5. Notes tab:
   - Timeline of notes (newest first)
   - Note card: author avatar, content preview, timestamp, note type badge
   - "Add Note" button opens note editor modal
   - Filter by note type
   - Visibility indicator (lock icon for PRIVATE)

6. Add Note modal:
   - Uses RichTextEditor from Task 1.5.7
   - Note type selector
   - Visibility selector
   - Save/Cancel buttons
   - POST to /api/v1/investigations/:id/notes

7. Findings tab (if applicable):
   - Findings summary (editable)
   - Outcome dropdown
   - Root cause field
   - Lessons learned field

Fetch from:
- GET /api/v1/investigations/:id
- GET /api/v1/investigations/:id/notes

Components to create:
- InvestigationDetailPanel (main slide-over)
- InvestigationHeader (status, type, dates)
- InvestigationOverview (editable properties)
- InvestigationNotes (notes timeline)
- NoteCard (single note display)
- AddNoteModal (note creation form)
- InvestigationFindings (findings form)
```

### Input Files (READ FIRST)
- `apps/frontend/src/app/cases/[id]/page.tsx` - Case detail patterns
- `apps/frontend/src/components/cases/case-investigations-panel.tsx` - Investigations list
- `apps/frontend/src/components/rich-text/` - Rich text editor (from Task 1.5.7)
- `apps/frontend/src/components/ui/` - shadcn/ui components

### Output Files
- `apps/frontend/src/components/investigations/investigation-detail-panel.tsx`
- `apps/frontend/src/components/investigations/investigation-header.tsx`
- `apps/frontend/src/components/investigations/investigation-overview.tsx`
- `apps/frontend/src/components/investigations/investigation-notes.tsx`
- `apps/frontend/src/components/investigations/note-card.tsx`
- `apps/frontend/src/components/investigations/add-note-modal.tsx`
- `apps/frontend/src/components/investigations/investigation-findings.tsx`
- `apps/frontend/src/components/investigations/index.ts`
- `apps/frontend/src/lib/investigation-notes-api.ts` (API client functions)

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/frontend && npm run typecheck

# Lint passes
cd apps/frontend && npm run lint

# Manual verification:
# 1. Navigate to /cases/:id
# 2. Click on an investigation card
# 3. Verify slide-over panel opens
# 4. Switch between tabs
# 5. Click "Add Note" and create a note
# 6. Verify note appears in timeline
# 7. Test visibility filtering
```

### Stop Condition
- All verification commands pass
- Slide-over panel opens/closes correctly
- Notes load and display
- Can create new notes
- OR document blockers

### Dependencies
- Task 1.5.5 (Notes API exists)
- Task 1.5.7 (Rich text editor exists)
- Slice 1.4 complete (Investigation endpoints, case detail page)

### Notes
- Use shadcn/ui Sheet component for slide-over
- Use shadcn/ui Tabs for tab navigation
- Use shadcn/ui Dialog for Add Note modal
- Optimistically update UI after note creation

---

## Task 1.5.9: End-to-End Smoke Test (Playwright)

**GitHub Issue:** #25
**Estimate:** 3 hours

### Prompt for AI
```
Create comprehensive E2E smoke test using Playwright for the core case flow.

Following:
- `02-MODULES/05-CASE-MANAGEMENT/PRD.md` - User flows
- Playwright best practices

Test the complete user journey:
1. Login → Case List → Create Case → View Case → Add Investigation → Add Note → Change Status

Setup:
1. Install Playwright in frontend project
2. Configure Playwright for both frontend and backend URLs
3. Set up test database seeding/cleanup

Test scenarios:

Scenario 1: Login Flow
- Navigate to /login
- Enter valid credentials (compliance@acme.local / Password123!)
- Verify redirect to /dashboard
- Verify user name displayed in header

Scenario 2: Case Creation
- From dashboard, click "New Case" (or navigate to /cases/new)
- Fill required fields:
  - Source: DIRECT_ENTRY
  - Details: "Test case details - E2E test"
  - Category: Select first available
- Submit and verify redirect to case detail page
- Verify reference number generated (ETH-YYYY-XXXXX format)

Scenario 3: Case List & Navigation
- Navigate to /cases
- Verify newly created case appears in list
- Use search to find case by reference number
- Click case row to open detail page

Scenario 4: Investigation Creation
- From case detail, click "Create Investigation"
- Fill form: type = FULL, department = COMPLIANCE
- Submit and verify investigation appears in panel
- Verify investigation number is #1

Scenario 5: Add Investigation Note
- Click investigation card to open detail panel
- Switch to Notes tab
- Click "Add Note"
- Enter note content with formatting
- Select note type: EVIDENCE
- Save and verify note appears in timeline

Scenario 6: Status Changes
- Change case status from NEW to OPEN
- Verify activity logged in timeline
- Change investigation status to INVESTIGATING
- Verify status badge updates

Scenario 7: Tenant Isolation (Critical)
- Create second test user in different org
- Login as second user
- Navigate to /cases
- Verify first org's case is NOT visible
- Attempt direct URL access to first org's case
- Verify 404 or access denied

Project structure:
e2e/
├── playwright.config.ts
├── fixtures/
│   └── auth.ts (login helper)
├── pages/
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   ├── case-list.page.ts
│   └── case-detail.page.ts
└── tests/
    ├── smoke.spec.ts (full journey)
    └── tenant-isolation.spec.ts
```

### Input Files (READ FIRST)
- `apps/frontend/package.json` - Check test framework setup
- `apps/backend/test/helpers/test-setup.ts` - Backend test patterns
- `docs/SLICE-1-ISSUES.md` - Issue #25 requirements

### Output Files
- `apps/frontend/e2e/playwright.config.ts`
- `apps/frontend/e2e/fixtures/auth.ts`
- `apps/frontend/e2e/pages/login.page.ts`
- `apps/frontend/e2e/pages/dashboard.page.ts`
- `apps/frontend/e2e/pages/case-list.page.ts`
- `apps/frontend/e2e/pages/case-detail.page.ts`
- `apps/frontend/e2e/tests/smoke.spec.ts`
- `apps/frontend/e2e/tests/tenant-isolation.spec.ts`
- Update `apps/frontend/package.json` with Playwright scripts

### Verification (ALL MUST PASS)
```bash
# Install Playwright
cd apps/frontend && npm init playwright@latest -- --quiet

# Update package.json scripts
# "e2e": "playwright test"
# "e2e:ui": "playwright test --ui"

# Run E2E tests (requires backend and frontend running)
cd apps/frontend && npm run e2e

# Tests should pass:
# - smoke.spec.ts: Login → Create Case → Create Investigation → Add Note
# - tenant-isolation.spec.ts: Cross-org access denied
```

### Stop Condition
- All E2E tests pass
- Smoke test completes full user journey
- Tenant isolation verified
- Tests run in CI (or documented how to run)
- OR document blockers

### Dependencies
- All previous tasks complete
- Backend running with seeded test data
- Frontend running

### Notes
- Use Page Object pattern for maintainability
- Set reasonable timeouts (10s for operations, 30s for page loads)
- Take screenshots on failure for debugging
- Consider headless vs headed mode for CI vs local
- Test credentials: compliance@acme.local / Password123!

---

## Task Dependency Graph

```
BACKEND (Issue #10):

Task 1.5.1 (Note Schema)
     │
     v
Task 1.5.2 (Note RLS)
     │
     v
Task 1.5.3 (Note DTOs)
     │
     v
Task 1.5.4 (Note Service)
     │
     v
Task 1.5.5 (Note Controller)
     │
     v
Task 1.5.6 (Note E2E Tests)


FRONTEND (Issues #21, #22):

Task 1.5.7 (Rich Text Editor)
     │
     └────────┐
              v
         Task 1.5.8 (Investigation Detail Panel)


E2E TESTING (Issue #25):

All Backend Tasks ───┐
                     ├──► Task 1.5.9 (E2E Smoke Test)
All Frontend Tasks ──┘


CROSS-DEPENDENCIES:

Task 1.5.5 ─────────────────────────────────► Task 1.5.8
(Notes API)                                   (Frontend needs API)

Task 1.5.7 ─────────────────────────────────► Task 1.5.8
(Rich Text Editor)                            (Notes modal needs editor)
```

---

## Parallel Execution Opportunities

**Backend parallelization:**
- Tasks 1.5.1 through 1.5.6 are sequential (each depends on previous)

**Frontend parallelization:**
- Task 1.5.7 (Rich Text Editor) - Can start independently
- Task 1.5.8 (Investigation Detail Panel) - Needs 1.5.5 (API) and 1.5.7 (Editor)

**Recommended execution order:**

1. **Phase 1 (parallel start):**
   - Start Backend: 1.5.1 → 1.5.2 → 1.5.3 → 1.5.4 → 1.5.5 → 1.5.6
   - Start Frontend: 1.5.7 (Rich Text Editor - no backend dependency)

2. **Phase 2 (after 1.5.5 and 1.5.7 complete):**
   - Run 1.5.8 (Investigation Detail Panel)

3. **Phase 3 (after all features complete):**
   - Run 1.5.9 (E2E Smoke Test)

---

## Success Criteria for Slice 1.5

### Backend
- [ ] InvestigationNote entity created in Prisma with all required fields
- [ ] RLS policies enforce tenant isolation on investigation notes
- [ ] All DTOs created with proper validation
- [ ] InvestigationNotesService implements all CRUD operations
- [ ] Visibility filtering (PRIVATE/TEAM/ALL) works correctly
- [ ] Activity logging integrated for all mutations
- [ ] Edit tracking (isEdited, editCount, editedAt) works
- [ ] All endpoints working: create, list, get, update, delete
- [ ] E2E tests pass including tenant isolation
- [ ] No breaking changes to existing functionality

### Frontend
- [ ] Rich text editor renders with full toolbar
- [ ] Formatting (bold, italic, lists, links) works
- [ ] Character count and limit enforced
- [ ] Draft auto-save and recovery works
- [ ] Investigation detail panel opens from card click
- [ ] Panel shows tabs: Overview, Notes, Findings
- [ ] Notes timeline displays correctly
- [ ] Can create new note with rich text editor
- [ ] Visibility filtering applied to notes list
- [ ] Responsive layout works on mobile/tablet

### E2E Testing
- [ ] Playwright configured and running
- [ ] Smoke test covers: Login → Create Case → Create Investigation → Add Note
- [ ] Tenant isolation E2E test passes
- [ ] Page objects created for maintainability
- [ ] Tests run in CI pipeline (or documented)

### Integration
- [ ] Frontend can create notes via backend API
- [ ] Notes list updates after creation
- [ ] Investigation detail syncs with backend
- [ ] Activity timeline shows note creation events
- [ ] Navigation between all views works smoothly

---

## Note Types Reference

| Type | Description | Use Case |
|------|-------------|----------|
| `GENERAL` | General investigation notes | Default, catch-all |
| `INTERVIEW` | Interview summary/transcript | Documenting witness interviews |
| `EVIDENCE` | Evidence documentation | Photos, documents, data |
| `FINDING` | Investigation finding | Specific discovered facts |
| `RECOMMENDATION` | Action recommendation | Suggested remediation |
| `FOLLOW_UP` | Follow-up required | Pending tasks or questions |

---

## Visibility Reference

| Visibility | Who Can See | Use Case |
|------------|-------------|----------|
| `PRIVATE` | Author only | Personal notes, drafts |
| `TEAM` | Assigned investigators | Shared within investigation team |
| `ALL` | Anyone with case access | Official investigation record |

---

*End of Ralph-Ready Tasks for Slice 1.5*
