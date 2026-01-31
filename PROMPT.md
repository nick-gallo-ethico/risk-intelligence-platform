# Ralph Loop Coordinator - Continuing Session

You are the **Ralph Loop Coordinator** for the Risk Intelligence Platform project.

## Current State (as of 2026-01-30)

**Completed Slices:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7 ✅
**Current Slice:** 1.8 - File Attachments & User Management
**Current Task:** 1.8.7 (ready to start)

## Recent Accomplishments

### Slice 1.8 Progress
- Task 1.8.1: File Attachment Prisma Schema ✅
- Task 1.8.2: File Storage Service ✅
- Task 1.8.3: Attachment DTOs and Service ✅
- Task 1.8.4: Attachment Controller & Module ✅
- Task 1.8.5: User Management DTOs and Service ✅
- Task 1.8.6: User Management Controller & Module ✅

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
   - [x] 1.8.4 - Attachment Controller & Module ✅
   - [x] 1.8.5 - User Management DTOs and Service ✅
   - [x] 1.8.6 - User Management Controller & Module ✅
   - [ ] 1.8.7 - File Upload Component (Frontend) (READY)
   - [ ] 1.8.8 - User Management UI (Frontend)
   - [ ] 1.8.9 - E2E Tests for Slice 1.8

## Next Task to Execute

### Task 1.8.7: File Upload Component (Frontend)

**Estimate:** 1.5 hours

**Input Files:**
- `apps/frontend/src/components/ui/` - shadcn components
- `apps/frontend/src/lib/api.ts` - API client
- `apps/frontend/src/app/cases/[id]/page.tsx` - Case detail page

**Task:** Create reusable file upload component for case/investigation attachments.

**Component:** `apps/frontend/src/components/files/file-upload.tsx`

**Features:**
- Drag and drop zone
- Click to browse files
- Multiple file selection
- File type validation (show allowed types)
- File size validation (show max size)
- Upload progress indicator
- Preview for images
- Remove file before upload
- Error display per file

**Props:**
- entityType: 'CASE' | 'INVESTIGATION' | 'INVESTIGATION_NOTE'
- entityId: string
- onUploadComplete?: (attachment: Attachment) => void
- maxFiles?: number (default 10)
- accept?: string (mime types)
- maxSize?: number (bytes, default 10MB)

**API integration:**
- POST /api/v1/attachments with multipart/form-data
- Handle upload errors
- Show success toast

**Use shadcn/ui components:**
- Card for drop zone
- Progress for upload
- Button for actions
- Badge for file type

**Add to case detail page:**
- Attachments section in properties panel
- List existing attachments
- Upload button

**Output Files:**
- `apps/frontend/src/components/files/file-upload.tsx`
- `apps/frontend/src/components/files/file-list.tsx`
- `apps/frontend/src/components/files/file-preview.tsx`
- `apps/frontend/src/lib/attachments-api.ts`
- Update `apps/frontend/src/app/cases/[id]/page.tsx`

**Verification:**
```bash
cd apps/frontend && npm run typecheck
cd apps/frontend && npm run lint
```

**Manual verification:**
1. Navigate to case detail
2. Upload file via drag and drop
3. Upload file via click
4. Verify file appears in list
5. Download file
6. Delete file

**Stop Condition:**
- File upload working
- File list displays
- Download works
- Delete works
- OR document blockers

**When Complete:** Reply **TASK 1.8.7 COMPLETE**

---

## When Execution Chat Reports Complete

1. Read the task file to get next task details
2. Update PROMPT.md with next task (use same format)
3. Update CURRENT-SPRINT.md to mark task complete
4. Commit changes following git best practices
5. Reply with confirmation and next task number

Start by confirming you understand the current state, then wait for task completion signals.
