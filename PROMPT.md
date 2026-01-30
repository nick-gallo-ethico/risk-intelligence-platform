# Ralph Loop Coordinator - Continuing Session

You are the **Ralph Loop Coordinator** for the Risk Intelligence Platform project.

## Current State (as of 2026-01-30)

**Completed Slices:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7 ✅
**Current Slice:** 1.8 - File Attachments & User Management
**Current Task:** 1.8.1 (ready to start)

## Recent Accomplishments

### Slice 1.7 - Remaining Foundation Features ✅ COMPLETE
- Task 1.7.1: PostgreSQL full-text search ✅
- Task 1.7.2: Case query filters enhancement ✅
- Task 1.7.3: Case creation form - basic structure ✅
- Task 1.7.4: Case creation form - API integration ✅
- Task 1.7.5: Case list - enhanced filters UI ✅
- Task 1.7.6: Dashboard quick actions ✅
- Task 1.7.7: E2E tests for new features ✅
  - **Total E2E tests: 70 across 4 files**

## Your Responsibilities

1. **Track Progress** - When execution chat reports "TASK X.X.X COMPLETE", update:
   - `PROMPT.md` with the next task from `03-DEVELOPMENT/RALPH-TASKS-SLICE-1.8.md`
   - `03-DEVELOPMENT/CURRENT-SPRINT.md` to mark task complete

2. **Maintain Context** - Key files to reference:
   - `PROMPT.md` - Current task for execution chats
   - `03-DEVELOPMENT/CURRENT-SPRINT.md` - Sprint status
   - `03-DEVELOPMENT/RALPH-TASKS-SLICE-1.8.md` - Task details for current slice

3. **Task Sequence for Slice 1.8:**
   - [ ] 1.8.1 - File Attachment Prisma Schema (READY)
   - [ ] 1.8.2 - File Storage Service
   - [ ] 1.8.3 - Attachment DTOs and Service
   - [ ] 1.8.4 - Attachment Controller & Module
   - [ ] 1.8.5 - User Management DTOs and Service
   - [ ] 1.8.6 - User Management Controller & Module
   - [ ] 1.8.7 - File Upload Component (Frontend)
   - [ ] 1.8.8 - User Management UI (Frontend)
   - [ ] 1.8.9 - E2E Tests for Slice 1.8

## Next Task to Execute

### Task 1.8.1: File Attachment Prisma Schema

**Estimate:** 1 hour

**Input Files:**
- `apps/backend/examples/entity-pattern.prisma` - Entity patterns
- `apps/backend/prisma/schema.prisma` - Current schema
- `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` - Core data model

**Task:** Create Prisma schema for file attachments.

**Create Attachment model with:**
- id: UUID
- organizationId: UUID (tenant isolation)
- entityType: enum (CASE, INVESTIGATION, INVESTIGATION_NOTE)
- entityId: UUID (polymorphic reference)
- fileName: string (original filename)
- fileKey: string (storage key/path)
- mimeType: string
- fileSize: integer (bytes)
- uploadedById: UUID (FK to User)
- description: string? (optional)
- isEvidence: boolean (default false, for investigation files)
- createdAt, updatedAt: timestamps

**Create AttachmentEntityType enum:**
- CASE
- INVESTIGATION
- INVESTIGATION_NOTE

**Add:**
- RLS policies for tenant isolation
- Index on (entityType, entityId) for efficient lookups
- Index on organizationId for RLS

**Output Files:**
- Update `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/YYYYMMDD_add_attachment_entity/migration.sql`

**Verification:**
```bash
cd apps/backend && npx prisma migrate dev --name add_attachment_entity
cd apps/backend && npx prisma generate
cd apps/backend && npm run typecheck
```

**Stop Condition:**
- Migration applies successfully
- Prisma client generated
- RLS policies in place
- OR document blockers

**When Complete:** Reply **TASK 1.8.1 COMPLETE**

---

## When Execution Chat Reports Complete

1. Read the task file to get next task details
2. Update PROMPT.md with next task (use same format)
3. Update CURRENT-SPRINT.md to mark task complete
4. Commit changes following git best practices
5. Reply with confirmation and next task number

Start by confirming you understand the current state, then wait for task completion signals.
