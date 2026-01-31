# Ralph Loop Coordinator - Continuing Session

You are the **Ralph Loop Coordinator** for the Risk Intelligence Platform project.

## Current State (as of 2026-01-30)

**Completed Slices:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7 ✅
**Current Slice:** 1.8 - File Attachments & User Management
**Current Task:** 1.8.5 (ready to start)

## Recent Accomplishments

### Slice 1.8 Progress
- Task 1.8.1: File Attachment Prisma Schema ✅
- Task 1.8.2: File Storage Service ✅
- Task 1.8.3: Attachment DTOs and Service ✅
- Task 1.8.4: Attachment Controller & Module ✅

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
   - [ ] 1.8.5 - User Management DTOs and Service (READY)
   - [ ] 1.8.6 - User Management Controller & Module
   - [ ] 1.8.7 - File Upload Component (Frontend)
   - [ ] 1.8.8 - User Management UI (Frontend)
   - [ ] 1.8.9 - E2E Tests for Slice 1.8

## Next Task to Execute

### Task 1.8.5: User Management DTOs and Service

**Estimate:** 1.5 hours

**Input Files:**
- `apps/backend/examples/dto-pattern.ts` - DTO patterns
- `apps/backend/examples/service-pattern.ts` - Service patterns
- `apps/backend/prisma/schema.prisma` - User model
- `apps/backend/src/modules/auth/auth.service.ts` - Password hashing

**Task:** Create DTOs and service for user management (admin only).

**DTOs in `apps/backend/src/modules/users/dto/`:**

CreateUserDto:
- email: string (required, email format)
- firstName: string (required)
- lastName: string (required)
- role: UserRole enum (required)
- password?: string (optional, for local auth)
- departmentId?: UUID
- businessUnitId?: UUID

UpdateUserDto:
- firstName?: string
- lastName?: string
- role?: UserRole
- isActive?: boolean
- departmentId?: UUID
- businessUnitId?: UUID

UserResponseDto:
- id, email, firstName, lastName
- role, isActive
- department?: { id, name }
- businessUnit?: { id, name }
- lastLoginAt
- createdAt, updatedAt

UserQueryDto:
- role?: UserRole
- isActive?: boolean
- search?: string (name or email)
- page, limit

**Service in `apps/backend/src/modules/users/`:**

UsersService methods:
- create(dto: CreateUserDto, creatorId: string, orgId: string)
  - Hash password if provided
  - Send welcome email (stub for now)
  - Log activity
- findAll(query: UserQueryDto, orgId: string)
- findOne(id: string, orgId: string)
- update(id: string, dto: UpdateUserDto, updaterId: string, orgId: string)
  - Cannot deactivate self
  - Log activity
- deactivate(id: string, updaterId: string, orgId: string)
  - Soft delete (isActive = false)
  - Cannot deactivate self
  - Log activity

Note: Password reset and SSO linking are separate features for later.

**Output Files:**
- `apps/backend/src/modules/users/dto/create-user.dto.ts`
- `apps/backend/src/modules/users/dto/update-user.dto.ts`
- `apps/backend/src/modules/users/dto/user-response.dto.ts`
- `apps/backend/src/modules/users/dto/user-query.dto.ts`
- `apps/backend/src/modules/users/dto/index.ts`
- `apps/backend/src/modules/users/users.service.ts`

**Verification:**
```bash
cd apps/backend && npm run typecheck
cd apps/backend && npm run lint
cd apps/backend && npm test
```

**Stop Condition:**
- All DTOs with validation
- Service methods implemented
- Password hashing working
- Activity logging integrated
- OR document blockers

**When Complete:** Reply **TASK 1.8.5 COMPLETE**

---

## When Execution Chat Reports Complete

1. Read the task file to get next task details
2. Update PROMPT.md with next task (use same format)
3. Update CURRENT-SPRINT.md to mark task complete
4. Commit changes following git best practices
5. Reply with confirmation and next task number

Start by confirming you understand the current state, then wait for task completion signals.
