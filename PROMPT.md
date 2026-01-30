# Ralph Loop Coordinator - Continuing Session

You are the **Ralph Loop Coordinator** for the Risk Intelligence Platform project.

## Current State (as of 2026-01-30)

**Completed Slices:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
**Current Slice:** 1.7 - Remaining Foundation Features
**Current Task:** 1.7.3 (ready to start)

## Recent Accomplishments

### Slice 1.6 - Code Quality & Security Fixes ✅
- Task 1.6.1-1.6.7: Guards, decorators, Swagger, test fixes
- Task 1.6.8: Critical security fixes (SQL injection in PrismaService, JWT secret handling)
- **Full security audit passed** - enterprise ready

### Slice 1.7 Progress
- Task 1.7.1: PostgreSQL full-text search ✅ COMPLETE
- Task 1.7.2: Case query filters enhancement ✅ COMPLETE

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
   - [ ] 1.7.3 - Case creation form - basic structure (READY)
   - [ ] 1.7.4 - Case creation form - API integration
   - [ ] 1.7.5 - Case list - enhanced filters UI
   - [ ] 1.7.6 - Dashboard quick actions
   - [ ] 1.7.7 - E2E tests for new features

## Next Task to Execute

### Task 1.7.3: Case Creation Form - Basic Structure

**GitHub Issue:** #23
**Estimate:** 2 hours

**Input Files:**
- `docs/SLICE-1-ISSUES.md` - Issue #23 requirements
- `apps/frontend/src/app/cases/[id]/page.tsx` - Case detail patterns
- `apps/frontend/src/components/ui/` - shadcn/ui components
- `apps/frontend/src/lib/api.ts` - API client
- `apps/backend/src/modules/cases/dto/create-case.dto.ts` - Required fields

**Task:** Build the case creation form page with multi-section layout.

Create /cases/new route with multi-section form:

**Section 1: Basic Information**
- Source Channel: Select (DIRECT_ENTRY, WEB_FORM, etc.)
- Case Type: Select (ETHICS_CONCERN, POLICY_VIOLATION, etc.)
- Severity: Select (LOW, MEDIUM, HIGH, CRITICAL)

**Section 2: Details**
- Summary: Textarea (max 500 chars)
- Details: Rich text editor (use Tiptap from 1.5.7)
- Category: Select (from API or hardcoded for now)

**Section 3: Reporter Information (optional)**
- Reporter Type: Select (EMPLOYEE, THIRD_PARTY, ANONYMOUS)
- Reporter Name: Input (optional)
- Reporter Email: Input (optional, validate format)
- Reporter Phone: Input (optional)

**Section 4: Location**
- Incident Country: Select (country list)
- Incident Region: Input (optional)
- Incident Location: Input (optional)

**Form Features:**
- Client-side validation with react-hook-form + zod
- Show validation errors inline
- Disable submit until required fields filled
- Loading state on submit
- Error toast on failure
- Redirect to case detail on success

**Layout:**
- Use Card components for sections
- Responsive: single column on mobile, 2 columns on desktop
- Sticky "Create Case" button at bottom

**Output Files:**
- `apps/frontend/src/app/cases/new/page.tsx`
- `apps/frontend/src/components/cases/case-creation-form.tsx`
- `apps/frontend/src/components/cases/form-sections/basic-info-section.tsx`
- `apps/frontend/src/components/cases/form-sections/details-section.tsx`
- `apps/frontend/src/components/cases/form-sections/reporter-section.tsx`
- `apps/frontend/src/components/cases/form-sections/location-section.tsx`
- `apps/frontend/src/lib/validations/case-schema.ts` (zod schema)

**Verification:**
```bash
cd apps/frontend && npm run typecheck
cd apps/frontend && npm run lint
```

Manual verification:
1. Navigate to /cases/new
2. Verify all form sections render
3. Test validation (submit with empty required fields)
4. Fill form and submit
5. Verify redirect to case detail

**When Complete:** Reply **TASK 1.7.3 COMPLETE**

---

## When Execution Chat Reports Complete

1. Read the task file to get next task details
2. Update PROMPT.md with next task (use same format)
3. Update CURRENT-SPRINT.md to mark task complete
4. Reply with confirmation and next task number

Start by confirming you understand the current state, then wait for task completion signals.
