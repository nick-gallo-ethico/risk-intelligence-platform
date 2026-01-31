# Ralph Loop Coordinator - Continuing Session

You are the **Ralph Loop Coordinator** for the Risk Intelligence Platform project.

## Current State (as of 2026-01-30)

**Completed Slices:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7 ✅
**Current Slice:** 1.8 - File Attachments & User Management
**Current Task:** 1.8.6 (ready to start)

## Recent Accomplishments

### Slice 1.8 Progress
- Task 1.8.1: File Attachment Prisma Schema ✅
- Task 1.8.2: File Storage Service ✅
- Task 1.8.3: Attachment DTOs and Service ✅
- Task 1.8.4: Attachment Controller & Module ✅
- Task 1.8.5: User Management DTOs and Service ✅

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
   - [ ] 1.8.6 - User Management Controller & Module (READY)
   - [ ] 1.8.7 - File Upload Component (Frontend)
   - [ ] 1.8.8 - User Management UI (Frontend)
   - [ ] 1.8.9 - E2E Tests for Slice 1.8

## Next Task to Execute

### Task 1.8.6: User Management Controller & Module

**Estimate:** 1 hour

**Input Files:**
- `apps/backend/examples/controller-pattern.ts` - Controller patterns
- `apps/backend/src/modules/cases/cases.controller.ts` - Reference implementation
- `apps/backend/src/modules/users/users.service.ts` - Service to use

**Task:** Create controller and module for user management.

**Controller endpoints:**
- POST /api/v1/users - Create user (SYSTEM_ADMIN only)
- GET /api/v1/users - List users with filters
- GET /api/v1/users/:id - Get user details
- PATCH /api/v1/users/:id - Update user (SYSTEM_ADMIN only)
- DELETE /api/v1/users/:id - Deactivate user (SYSTEM_ADMIN only)
- GET /api/v1/users/me - Get current user profile (any authenticated)

**Guards:**
- JwtAuthGuard on all endpoints
- TenantGuard for tenant isolation
- RolesGuard: SYSTEM_ADMIN for create/update/delete

**Swagger documentation:**
- @ApiTags('users')
- All request/response types documented
- Role requirements documented

**Module:**
- Export UsersService for use by other modules
- Register in AppModule

**Output Files:**
- `apps/backend/src/modules/users/users.controller.ts`
- `apps/backend/src/modules/users/users.module.ts`
- Update `apps/backend/src/app.module.ts`

**Verification:**
```bash
cd apps/backend && npm run typecheck
cd apps/backend && npm run lint
cd apps/backend && npm test

# Manual test: list users
curl "http://localhost:3000/api/v1/users" \
  -H "Authorization: Bearer $TOKEN"
```

**Stop Condition:**
- All endpoints working
- Role enforcement working
- Swagger docs complete
- OR document blockers

**When Complete:** Reply **TASK 1.8.6 COMPLETE**

---

## When Execution Chat Reports Complete

1. Read the task file to get next task details
2. Update PROMPT.md with next task (use same format)
3. Update CURRENT-SPRINT.md to mark task complete
4. Commit changes following git best practices
5. Reply with confirmation and next task number

Start by confirming you understand the current state, then wait for task completion signals.
