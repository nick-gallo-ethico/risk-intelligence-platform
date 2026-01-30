# Ralph Loop Coordinator - Continuing Session

You are the **Ralph Loop Coordinator** for the Risk Intelligence Platform project.

## Current State (as of 2026-01-30)

**Completed Slices:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
**Current Slice:** 1.7 - Remaining Foundation Features
**Current Task:** 1.7.4 (ready to start)

## Recent Accomplishments

### Slice 1.6 - Code Quality & Security Fixes ✅
- Task 1.6.1-1.6.7: Guards, decorators, Swagger, test fixes
- Task 1.6.8: Critical security fixes (SQL injection in PrismaService, JWT secret handling)
- **Full security audit passed** - enterprise ready

### Slice 1.7 Progress
- Task 1.7.1: PostgreSQL full-text search ✅ COMPLETE
- Task 1.7.2: Case query filters enhancement ✅ COMPLETE
- Task 1.7.3: Case creation form - basic structure ✅ COMPLETE

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
   - [ ] 1.7.4 - Case creation form - API integration (READY)
   - [ ] 1.7.5 - Case list - enhanced filters UI
   - [ ] 1.7.6 - Dashboard quick actions
   - [ ] 1.7.7 - E2E tests for new features

## Next Task to Execute

### Task 1.7.4: Case Creation Form - API Integration

**GitHub Issue:** #23
**Estimate:** 1 hour

**Input Files:**
- `apps/frontend/src/lib/api.ts` - Existing API client
- `apps/frontend/src/components/cases/case-creation-form.tsx` - Form from 1.7.3
- `apps/backend/src/modules/cases/dto/create-case.dto.ts` - DTO definition

**Task:** Complete API integration for the case creation form.

**1. Create API client function for case creation:**
- POST /api/v1/cases
- Handle validation errors (400)
- Handle auth errors (401)
- Return created case data

**2. Integrate with react-query or SWR for:**
- Mutation handling
- Loading state
- Error state
- Success callback

**3. Add success handling:**
- Show success toast with reference number
- Redirect to /cases/:id
- Clear form state

**4. Add error handling:**
- Show error toast with message
- Map API validation errors to form fields
- Keep form state on error

**5. Add "Save Draft" functionality (localStorage):**
- Auto-save every 30 seconds
- Restore draft on page load
- Clear draft on successful submit
- Show "Draft saved" indicator

**API payload should match CreateCaseDto:**
```typescript
interface CreateCasePayload {
  sourceChannel: SourceChannel;
  caseType: CaseType;
  severity: Severity;
  summary: string;
  details: string;
  category?: string;
  reporterType?: ReporterType;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  incidentCountry?: string;
  incidentRegion?: string;
  incidentLocation?: string;
}
```

**Output Files:**
- `apps/frontend/src/lib/cases-api.ts` (add createCase function)
- Update `apps/frontend/src/components/cases/case-creation-form.tsx`
- `apps/frontend/src/hooks/use-case-form-draft.ts` (draft persistence hook)

**Verification:**
```bash
cd apps/frontend && npm run typecheck
cd apps/frontend && npm run lint
```

Manual verification:
1. Fill and submit form
2. Verify case created in backend
3. Verify redirect to new case
4. Test draft save/restore
5. Test validation error display

**When Complete:** Reply **TASK 1.7.4 COMPLETE**

---

## When Execution Chat Reports Complete

1. Read the task file to get next task details
2. Update PROMPT.md with next task (use same format)
3. Update CURRENT-SPRINT.md to mark task complete
4. Commit changes following git best practices
5. Reply with confirmation and next task number

Start by confirming you understand the current state, then wait for task completion signals.
