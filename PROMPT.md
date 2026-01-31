# Ralph Loop Coordinator - Continuing Session

You are the **Ralph Loop Coordinator** for the Risk Intelligence Platform project.

## Current State (as of 2026-01-30)

**Completed Slices:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7 ✅
**Current Slice:** 1.8 - File Attachments & User Management
**Current Task:** 1.8.8 (ready to start)

## Recent Accomplishments

### Slice 1.8 Progress
- Task 1.8.1: File Attachment Prisma Schema ✅
- Task 1.8.2: File Storage Service ✅
- Task 1.8.3: Attachment DTOs and Service ✅
- Task 1.8.4: Attachment Controller & Module ✅
- Task 1.8.5: User Management DTOs and Service ✅
- Task 1.8.6: User Management Controller & Module ✅
- Task 1.8.7: File Upload Component (Frontend) ✅

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
   - [ ] 1.8.8 - User Management UI (Frontend) (READY)
   - [ ] 1.8.9 - E2E Tests for Slice 1.8

## Next Task to Execute

### Task 1.8.8: User Management UI

**Estimate:** 2 hours

**Input Files:**
- `apps/frontend/src/app/cases/page.tsx` - Table patterns
- `apps/frontend/src/components/ui/` - shadcn components
- `apps/backend/src/modules/users/dto/` - DTO shapes

**Task:** Create user management page for admins.

**Page:** `apps/frontend/src/app/settings/users/page.tsx`

**Features:**
1. User list table:
   - Columns: Name, Email, Role, Status, Last Login, Actions
   - Sortable by name, email, last login
   - Filterable by role, status
   - Search by name or email
   - Pagination

2. Create user dialog:
   - Form with validation
   - Role selection dropdown
   - Optional password (or generate invite link)
   - Success toast with next steps

3. Edit user dialog:
   - Pre-filled form
   - Cannot edit own role
   - Cannot deactivate self
   - Success toast

4. Deactivate confirmation:
   - Confirm dialog
   - Warning about access removal
   - Success toast

5. User detail view (optional):
   - Click row to see full details
   - Activity history for user

**Navigation:**
- Add "Settings" section to sidebar
- Add "Users" link under Settings
- Visible only to SYSTEM_ADMIN role

**Components:**
- UsersTable
- CreateUserDialog
- EditUserDialog
- UserFilters

**Output Files:**
- `apps/frontend/src/app/settings/users/page.tsx`
- `apps/frontend/src/components/users/users-table.tsx`
- `apps/frontend/src/components/users/create-user-dialog.tsx`
- `apps/frontend/src/components/users/edit-user-dialog.tsx`
- `apps/frontend/src/components/users/user-filters.tsx`
- `apps/frontend/src/lib/users-api.ts`
- Update sidebar navigation

**Verification:**
```bash
cd apps/frontend && npm run typecheck
cd apps/frontend && npm run lint
```

**Manual verification:**
1. Login as admin
2. Navigate to Settings > Users
3. Create new user
4. Edit user
5. Deactivate user
6. Verify non-admin cannot access

**Stop Condition:**
- User list displays
- CRUD operations work
- Role restrictions enforced
- OR document blockers

**When Complete:** Reply **TASK 1.8.8 COMPLETE**

---

## When Execution Chat Reports Complete

1. Read the task file to get next task details
2. Update PROMPT.md with next task (use same format)
3. Update CURRENT-SPRINT.md to mark task complete
4. Commit changes following git best practices
5. Reply with confirmation and next task number

Start by confirming you understand the current state, then wait for task completion signals.
