# Ralph Loop Coordinator - Continuing Session

You are the **Ralph Loop Coordinator** for the Risk Intelligence Platform project.

## Current State (as of 2026-01-30)

**Completed Slices:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7 ✅
**Current Slice:** 1.8 - File Attachments & User Management
**Current Task:** 1.8.2 (ready to start)

## Recent Accomplishments

### Slice 1.8 Progress
- Task 1.8.1: File Attachment Prisma Schema ✅

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
   - [ ] 1.8.2 - File Storage Service (READY)
   - [ ] 1.8.3 - Attachment DTOs and Service
   - [ ] 1.8.4 - Attachment Controller & Module
   - [ ] 1.8.5 - User Management DTOs and Service
   - [ ] 1.8.6 - User Management Controller & Module
   - [ ] 1.8.7 - File Upload Component (Frontend)
   - [ ] 1.8.8 - User Management UI (Frontend)
   - [ ] 1.8.9 - E2E Tests for Slice 1.8

## Next Task to Execute

### Task 1.8.2: File Storage Service

**Estimate:** 1.5 hours

**Input Files:**
- `apps/backend/src/config/configuration.ts` - Current config
- `apps/backend/src/common/services/` - Existing services
- `apps/backend/examples/service-pattern.ts` - Service patterns

**Task:** Create file storage service with local filesystem backend (Azure Blob ready).

**Create StorageService in `apps/backend/src/common/services/`:**

**Interface:**
- `upload(file: Express.Multer.File, tenantId: string): Promise<{key: string, url: string}>`
- `download(key: string): Promise<{stream: Readable, mimeType: string}>`
- `delete(key: string): Promise<void>`
- `getSignedUrl(key: string, expiresIn?: number): Promise<string>`

**Implementation (LocalStorageAdapter for now):**
- Store files in `./uploads/{tenantId}/{uuid}/{filename}`
- Generate unique keys using UUID
- Return relative paths as URLs for local dev
- Validate file types (configurable allowlist)
- Validate file size (configurable max, default 10MB)
- Sanitize filenames (remove special characters)

**Configuration in config/configuration.ts:**
- STORAGE_TYPE: 'local' | 'azure' (default 'local')
- STORAGE_PATH: './uploads' (for local)
- MAX_FILE_SIZE: 10485760 (10MB)
- ALLOWED_MIME_TYPES: ['image/*', 'application/pdf', 'text/*', ...]

**Add to ConfigModule exports.**

Note: Azure Blob adapter will be added later - design interface to support both.

**Output Files:**
- `apps/backend/src/common/services/storage.service.ts`
- `apps/backend/src/common/services/storage.interface.ts`
- `apps/backend/src/common/services/local-storage.adapter.ts`
- Update `apps/backend/src/config/configuration.ts`
- Update `apps/backend/src/common/index.ts`

**Verification:**
```bash
cd apps/backend && npm run typecheck
cd apps/backend && npm run lint
cd apps/backend && npm test
```

**Stop Condition:**
- StorageService injectable
- Local file upload/download works
- File validation works
- OR document blockers

**When Complete:** Reply **TASK 1.8.2 COMPLETE**

---

## When Execution Chat Reports Complete

1. Read the task file to get next task details
2. Update PROMPT.md with next task (use same format)
3. Update CURRENT-SPRINT.md to mark task complete
4. Commit changes following git best practices
5. Reply with confirmation and next task number

Start by confirming you understand the current state, then wait for task completion signals.
