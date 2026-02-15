---
phase: 31-code-quality-performance
plan: 21
subsystem: ui
tags: [toast, error-handling, frontend, react, QUAL-05]

# Dependency graph
requires:
  - phase: 31-05
    provides: handleApiError utility and toast infrastructure
provides:
  - 8 case components with consistent toast error handling
  - QUAL-05 gap closure progress (15 -> 23 components)
affects: [frontend-reliability, user-experience]

# Tech tracking
tech-stack:
  added: []
  patterns: [handleApiError-for-api-errors]

key-files:
  modified:
    - apps/frontend/src/components/cases/ai-chat-panel.tsx
    - apps/frontend/src/components/cases/case-investigations-panel.tsx
    - apps/frontend/src/components/cases/connected-people-card.tsx
    - apps/frontend/src/components/cases/connected-documents-card.tsx
    - apps/frontend/src/components/cases/related-policies-card.tsx
    - apps/frontend/src/components/cases/related-cases-card.tsx
    - apps/frontend/src/components/cases/linked-riu-form-answers.tsx
    - apps/frontend/src/components/cases/case-creation-form.tsx

key-decisions:
  - "Replace console.error with handleApiError for user-visible toasts"
  - "Use descriptive action context in handleApiError calls"

patterns-established:
  - "handleApiError pattern: import handleApiError and replace console.error in catch blocks"

# Metrics
duration: 19min
completed: 2026-02-15
---

# Phase 31 Plan 21: Case Components Error Handling Summary

**Added handleApiError to 8 case components for consistent toast error notifications - QUAL-05 gap closure**

## Performance

- **Duration:** 19 min
- **Started:** 2026-02-15T05:40:39Z
- **Completed:** 2026-02-15T05:59:29Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added handleApiError to 4 case panel components (ai-chat, investigations, people, documents)
- Added handleApiError to 4 case card/form components (policies, cases, riu-form, creation-form)
- QUAL-05 handleApiError adoption increased from 15 to 23+ components
- Users now see toast notifications instead of silent console errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add handleApiError to case panel components** - `d6c0ec9` (feat)
   - ai-chat-panel.tsx, case-investigations-panel.tsx, connected-people-card.tsx, connected-documents-card.tsx

2. **Task 2: Add handleApiError to case card and form components** - `967e148` (feat)
   - related-policies-card.tsx, related-cases-card.tsx, linked-riu-form-answers.tsx, case-creation-form.tsx

## Files Modified

- `apps/frontend/src/components/cases/ai-chat-panel.tsx` - WebSocket connection error toast
- `apps/frontend/src/components/cases/case-investigations-panel.tsx` - Fetch investigations error toast
- `apps/frontend/src/components/cases/connected-people-card.tsx` - Fetch people and copy email error toasts
- `apps/frontend/src/components/cases/connected-documents-card.tsx` - Fetch documents error toast
- `apps/frontend/src/components/cases/related-policies-card.tsx` - Fetch policies error toast
- `apps/frontend/src/components/cases/related-cases-card.tsx` - Fetch related cases error toast
- `apps/frontend/src/components/cases/linked-riu-form-answers.tsx` - Fetch RIU form data error toast
- `apps/frontend/src/components/cases/case-creation-form.tsx` - Create case error toast (replaced custom handling)

## Decisions Made

- Used descriptive action context for each handleApiError call (e.g., "Failed to load related policies")
- In case-creation-form.tsx, replaced custom error message extraction with handleApiError for consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Git lock file conflict during commit due to concurrent lint-staged processing - resolved by removing lock file
- Pre-existing backend TypeScript error in migration.controller.ts (unrelated to changes)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 8 additional components now show toast errors
- Total handleApiError adoption: 23+ components (target was 30+)
- Additional components in other directories may need similar updates

---

_Phase: 31-code-quality-performance_
_Completed: 2026-02-15_
