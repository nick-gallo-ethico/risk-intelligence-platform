# Ralph Loop Coordinator - Continuing Session

You are the **Ralph Loop Coordinator** for the Risk Intelligence Platform project.

## Current State (as of 2026-01-30)

**Completed Slices:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7 ✅
**Current Slice:** 1.8 - File Attachments & User Management
**Current Task:** 1.8.9 (ready to start) - FINAL TASK OF SLICE

## Recent Accomplishments

### Slice 1.8 Progress
- Task 1.8.1: File Attachment Prisma Schema ✅
- Task 1.8.2: File Storage Service ✅
- Task 1.8.3: Attachment DTOs and Service ✅
- Task 1.8.4: Attachment Controller & Module ✅
- Task 1.8.5: User Management DTOs and Service ✅
- Task 1.8.6: User Management Controller & Module ✅
- Task 1.8.7: File Upload Component (Frontend) ✅
- Task 1.8.8: User Management UI (Frontend) ✅

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
   - [x] 1.8.7 - File Upload Component (Frontend) ✅
   - [x] 1.8.8 - User Management UI (Frontend) ✅
   - [ ] 1.8.9 - E2E Tests for Slice 1.8 (READY - FINAL TASK)

## Next Task to Execute

### Task 1.8.9: E2E Tests for Slice 1.8

**Estimate:** 1.5 hours

**Input Files:**
- `apps/frontend/e2e/tests/` - Existing tests
- `apps/frontend/e2e/pages/` - Page objects

**Task:** Add E2E tests for file attachments and user management.

**Test Scenarios:**

1. **File Attachments:**
   - Upload file to case
   - Verify file appears in attachments list
   - Download file
   - Delete file
   - Upload to investigation
   - Test file type validation
   - Test file size validation

2. **User Management (admin only):**
   - Navigate to users page
   - Create new user
   - Verify user appears in list
   - Edit user role
   - Deactivate user
   - Verify deactivated user cannot login
   - Test non-admin cannot access users page

3. **Permission Tests:**
   - Investigator can upload files
   - Employee cannot upload files
   - Only admin can manage users

**Output Files:**
- `apps/frontend/e2e/tests/attachments.spec.ts`
- `apps/frontend/e2e/tests/user-management.spec.ts`
- `apps/frontend/e2e/pages/users.page.ts`
- Update `apps/frontend/e2e/pages/case-detail.page.ts` (add attachment methods)

**Verification:**
```bash
cd apps/frontend && npm run e2e
```

**Stop Condition:**
- All E2E tests pass
- File upload tested
- User management tested
- OR document blockers

**When Complete:** Reply **TASK 1.8.9 COMPLETE**

---

## When Slice 1.8.9 Complete

This is the **FINAL TASK** of Slice 1.8. When complete:
1. Mark task complete in CURRENT-SPRINT.md
2. Move Slice 1.8 section to "Completed" in CURRENT-SPRINT.md
3. Update PROMPT.md to prepare for Slice 1.9 planning
4. Commit and push all changes
5. Celebrate - Slice 1.8 complete!

---

## Slice 1.8 Success Criteria (for verification)

### File Attachments
- [ ] Attachment entity with RLS
- [ ] Local file storage working
- [ ] Upload/download/delete endpoints
- [ ] File type and size validation
- [ ] Attachments on case detail page
- [ ] Drag and drop upload UI

### User Management
- [ ] User CRUD endpoints (admin only)
- [ ] User list page with filters
- [ ] Create/edit/deactivate dialogs
- [ ] Role-based access enforced
- [ ] Settings navigation added

### Testing
- [ ] E2E tests for attachments
- [ ] E2E tests for user management
- [ ] Permission tests pass
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
