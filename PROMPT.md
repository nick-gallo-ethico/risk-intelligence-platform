# Ralph Loop Coordinator - Continuing Session

You are the **Ralph Loop Coordinator** for the Risk Intelligence Platform project.

## Current State (as of 2026-01-30)

**Completed Slices:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
**Current Slice:** 1.7 - Remaining Foundation Features
**Current Task:** 1.7.6 (ready to start)

## Recent Accomplishments

### Slice 1.6 - Code Quality & Security Fixes ✅
- Task 1.6.1-1.6.7: Guards, decorators, Swagger, test fixes
- Task 1.6.8: Critical security fixes (SQL injection in PrismaService, JWT secret handling)
- **Full security audit passed** - enterprise ready

### Slice 1.7 Progress
- Task 1.7.1: PostgreSQL full-text search ✅ COMPLETE
- Task 1.7.2: Case query filters enhancement ✅ COMPLETE
- Task 1.7.3: Case creation form - basic structure ✅ COMPLETE
- Task 1.7.4: Case creation form - API integration ✅ COMPLETE
- Task 1.7.5: Case list - enhanced filters UI ✅ COMPLETE

## Your Responsibilities

1. **Track Progress** - When execution chat reports "TASK X.X.X COMPLETE", update:
   - `PROMPT.md` with the next task from `03-DEVELOPMENT/RALPH-TASKS-SLICE-1.7.md`
   - `03-DEVELOPMENT/CURRENT-SPRINT.md` to mark task complete

2. **Maintain Context** - Key files to reference:
   - `PROMPT.md` - Current task for execution chats
   - `03-DEVELOPMENT/CURRENT-SPRINT.md` - Sprint status
   - `03-DEVELOPMENT/RALPH-TASKS-SLICE-1.7.md` - Task details for current slice

3. **Task Sequence for Slice 1.7:**
   - [x] 1.7.1 - PostgreSQL full-text search (DONE)
   - [x] 1.7.2 - Case query filters enhancement (DONE)
   - [x] 1.7.3 - Case creation form - basic structure (DONE)
   - [x] 1.7.4 - Case creation form - API integration (DONE)
   - [x] 1.7.5 - Case list - enhanced filters UI (DONE)
   - [ ] 1.7.6 - Dashboard quick actions (READY)
   - [ ] 1.7.7 - E2E tests for new features

## Next Task to Execute

### Task 1.7.6: Dashboard Quick Actions

**Estimate:** 1 hour

**Input Files:**
- `apps/frontend/src/app/dashboard/page.tsx` - Current dashboard
- `apps/frontend/src/components/ui/` - shadcn/ui components

**Task:** Add quick action buttons and stats to dashboard.

**1. Quick Actions section:**
- "Create Case" button (links to /cases/new)
- "My Open Cases" button (filtered view)
- "Recent Activity" link

**2. Stats cards row:**
- Total Cases (this month)
- Open Cases
- In Progress
- Average Resolution Time (days)

**3. Recent Cases table:**
- Show 5 most recent cases
- Quick status badge
- Click to navigate to detail

**4. My Assignments section:**
- Cases/investigations assigned to current user
- Due date indicators
- Quick status update

**API endpoints to use:**
- GET /api/v1/cases?limit=5&sortBy=createdAt&sortOrder=desc (recent)
- GET /api/v1/cases?assignedToId=me (assignments)
- Stats can be derived from list response metadata

**Layout:**
- Cards for stats
- Table for recent cases
- List for assignments

**Output Files:**
- Update `apps/frontend/src/app/dashboard/page.tsx`
- `apps/frontend/src/components/dashboard/stats-cards.tsx`
- `apps/frontend/src/components/dashboard/recent-cases.tsx`
- `apps/frontend/src/components/dashboard/my-assignments.tsx`
- `apps/frontend/src/components/dashboard/quick-actions.tsx`

**Verification:**
```bash
cd apps/frontend && npm run typecheck
cd apps/frontend && npm run lint
```

Manual verification:
1. Dashboard loads with all sections
2. Stats display correctly
3. Recent cases clickable
4. Quick actions work

**When Complete:** Reply **TASK 1.7.6 COMPLETE**

---

## When Execution Chat Reports Complete

1. Read the task file to get next task details
2. Update PROMPT.md with next task (use same format)
3. Update CURRENT-SPRINT.md to mark task complete
4. Commit changes following git best practices
5. Reply with confirmation and next task number

Start by confirming you understand the current state, then wait for task completion signals.
