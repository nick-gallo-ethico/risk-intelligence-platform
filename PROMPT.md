# Ralph Loop Coordinator - Continuing Session

You are the **Ralph Loop Coordinator** for the Risk Intelligence Platform project.

## Current State (as of 2026-01-30)

**Completed Slices:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7 ✅
**Current Slice:** 1.8 - File Attachments & User Management
**Current Task:** 1.8.4 (ready to start)

## Recent Accomplishments

### Slice 1.8 Progress
- Task 1.8.1: File Attachment Prisma Schema ✅
- Task 1.8.2: File Storage Service ✅
- Task 1.8.3: Attachment DTOs and Service ✅

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
   - [x] 1.8.3 - Attachment DTOs and Service ✅
   - [ ] 1.8.4 - Attachment Controller & Module (READY)
   - [ ] 1.8.5 - User Management DTOs and Service
   - [ ] 1.8.6 - User Management Controller & Module
   - [ ] 1.8.7 - File Upload Component (Frontend)
   - [ ] 1.8.8 - User Management UI (Frontend)
   - [ ] 1.8.9 - E2E Tests for Slice 1.8

## Next Task to Execute

### Task 1.8.4: Attachment Controller & Module

**Estimate:** 1 hour

**Input Files:**
- `apps/backend/examples/controller-pattern.ts` - Controller patterns
- `apps/backend/src/modules/cases/cases.controller.ts` - Reference controller
- `apps/backend/src/modules/attachments/attachments.service.ts` - Attachment service

**Task:** Create controller and module for file attachments.

**Controller endpoints:**
- POST /api/v1/attachments - Upload file
  - Use @UseInterceptors(FileInterceptor('file'))
  - Body: CreateAttachmentDto
  - Returns: AttachmentResponseDto
- GET /api/v1/attachments?entityType=CASE&entityId=xxx - List by entity
- GET /api/v1/attachments/:id - Get single attachment
- GET /api/v1/attachments/:id/download - Download file (redirect to signed URL)
- DELETE /api/v1/attachments/:id - Delete attachment

**Guards:**
- JwtAuthGuard on all endpoints
- TenantGuard for tenant isolation
- RolesGuard: SYSTEM_ADMIN, COMPLIANCE_OFFICER, INVESTIGATOR can upload/delete

**Swagger documentation:**
- @ApiTags('attachments')
- @ApiConsumes('multipart/form-data') for upload
- @ApiBody with file schema
- Response types documented

**Module:**
- Import MulterModule with file size limits
- Export AttachmentService for use by other modules
- Register in AppModule

**Output Files:**
- `apps/backend/src/modules/attachments/attachments.controller.ts`
- `apps/backend/src/modules/attachments/attachments.module.ts`
- Update `apps/backend/src/app.module.ts`

**Verification:**
```bash
cd apps/backend && npm run typecheck
cd apps/backend && npm run lint
cd apps/backend && npm test

# Manual test: upload file
curl -X POST "http://localhost:3000/api/v1/attachments" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "entityType=CASE" \
  -F "entityId=xxx"
```

**Stop Condition:**
- All endpoints working
- File upload/download functional
- Swagger docs complete
- OR document blockers

**When Complete:** Reply **TASK 1.8.4 COMPLETE**

---

## When Execution Chat Reports Complete

1. Read the task file to get next task details
2. Update PROMPT.md with next task (use same format)
3. Update CURRENT-SPRINT.md to mark task complete
4. Commit changes following git best practices
5. Reply with confirmation and next task number

Start by confirming you understand the current state, then wait for task completion signals.
