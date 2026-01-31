# Ralph Loop Coordinator - Continuing Session

You are the **Ralph Loop Coordinator** for the Risk Intelligence Platform project.

## Current State (as of 2026-01-30)

**Completed Slices:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7 ✅
**Current Slice:** 1.8 - File Attachments & User Management
**Current Task:** 1.8.3 (ready to start)

## Recent Accomplishments

### Slice 1.8 Progress
- Task 1.8.1: File Attachment Prisma Schema ✅
- Task 1.8.2: File Storage Service ✅

## Your Responsibilities

1. **Track Progress** - When execution chat reports "TASK X.X.X COMPLETE", update:
   - `PROMPT.md` with the next task from `03-DEVELOPMENT/RALPH-TASKS-SLICE-1.8.md`
   - `03-DEVELOPMENT/CURRENT-SPRINT.md` to mark task complete

2. **Maintain Context** - Key files to reference:
   - `PROMPT.md` - Current task for execution chats
   - `03-DEVELOPMENT/CURRENT-SPRINT.md` - Sprint status
   - `03-DEVELOPMENT/RALPH-TASKS-SLICE-1.8.md` - Task details for current slice

3. **Task Sequence for Slice 1.8:**
   - [x] 1.8.1 - File Attachment Prisma Schema ✅
   - [x] 1.8.2 - File Storage Service ✅
   - [ ] 1.8.3 - Attachment DTOs and Service (READY)
   - [ ] 1.8.4 - Attachment Controller & Module
   - [ ] 1.8.5 - User Management DTOs and Service
   - [ ] 1.8.6 - User Management Controller & Module
   - [ ] 1.8.7 - File Upload Component (Frontend)
   - [ ] 1.8.8 - User Management UI (Frontend)
   - [ ] 1.8.9 - E2E Tests for Slice 1.8

## Next Task to Execute

### Task 1.8.3: Attachment DTOs and Service

**Estimate:** 1.5 hours

**Input Files:**
- `apps/backend/examples/dto-pattern.ts` - DTO patterns
- `apps/backend/examples/service-pattern.ts` - Service patterns
- `apps/backend/src/modules/cases/cases.service.ts` - Service reference
- `apps/backend/src/common/services/storage.service.ts` - Storage service

**Task:** Create DTOs and service for file attachments.

**DTOs in `apps/backend/src/modules/attachments/dto/`:**

**CreateAttachmentDto:**
- entityType: AttachmentEntityType (required)
- entityId: UUID (required)
- description?: string (optional, max 500 chars)
- isEvidence?: boolean (optional, default false)
Note: File itself comes from multipart upload, not DTO

**AttachmentResponseDto:**
- id, organizationId, entityType, entityId
- fileName, mimeType, fileSize
- uploadedBy: { id, name, email }
- description, isEvidence
- downloadUrl: string (signed URL)
- createdAt

**AttachmentQueryDto:**
- entityType?: AttachmentEntityType
- entityId?: UUID
- isEvidence?: boolean
- page, limit (pagination)

**Service in `apps/backend/src/modules/attachments/`:**

**AttachmentService methods:**
- `create(file: Express.Multer.File, dto: CreateAttachmentDto, userId: string, orgId: string)`
  - Validate entity exists and belongs to org
  - Upload file via StorageService
  - Create attachment record
  - Log activity
- `findByEntity(entityType: string, entityId: string, orgId: string)`
- `findOne(id: string, orgId: string)`
- `delete(id: string, userId: string, orgId: string)`
  - Delete file from storage
  - Delete attachment record
  - Log activity

**Entity validation:**
- CASE: verify case exists in org
- INVESTIGATION: verify investigation exists in org
- INVESTIGATION_NOTE: verify note exists in org

**Output Files:**
- `apps/backend/src/modules/attachments/dto/create-attachment.dto.ts`
- `apps/backend/src/modules/attachments/dto/attachment-response.dto.ts`
- `apps/backend/src/modules/attachments/dto/attachment-query.dto.ts`
- `apps/backend/src/modules/attachments/dto/index.ts`
- `apps/backend/src/modules/attachments/attachments.service.ts`

**Verification:**
```bash
cd apps/backend && npm run typecheck
cd apps/backend && npm run lint
cd apps/backend && npm test
```

**Stop Condition:**
- All DTOs with validation
- Service methods implemented
- Activity logging integrated
- OR document blockers

**When Complete:** Reply **TASK 1.8.3 COMPLETE**

---

## When Execution Chat Reports Complete

1. Read the task file to get next task details
2. Update PROMPT.md with next task (use same format)
3. Update CURRENT-SPRINT.md to mark task complete
4. Commit changes following git best practices
5. Reply with confirmation and next task number

Start by confirming you understand the current state, then wait for task completion signals.
