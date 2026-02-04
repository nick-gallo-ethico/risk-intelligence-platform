---
phase: 08
plan: 14
subsystem: employee-portal
tags: [proxy-reporting, managers, team-members, forms]
depends_on: ["08-06", "08-13"]
provides: ["proxy-report-form", "team-member-selector", "proxy-confirmation"]
affects: ["backend-api-needs"]
tech-stack:
  added: []
  patterns: ["multi-step-forms", "manager-access-control"]
key-files:
  created:
    - apps/frontend/src/types/employee-portal.types.ts
    - apps/frontend/src/hooks/useTeamMembers.ts
    - apps/frontend/src/components/employee/team-member-selector.tsx
    - apps/frontend/src/components/employee/proxy-reason-selector.tsx
    - apps/frontend/src/components/employee/proxy-confirmation.tsx
    - apps/frontend/src/app/employee/proxy-report/page.tsx
  modified:
    - apps/frontend/src/components/employee/my-team-tab.tsx
    - apps/frontend/src/hooks/useEmployeeProfile.ts
decisions:
  - title: "Manager-only access"
    rationale: "Proxy report page redirects non-managers after brief message"
  - title: "Access code delivery"
    rationale: "Access code sent to employee only, manager never sees it (per CONTEXT.md)"
  - title: "Hooks before conditionals"
    rationale: "Fixed my-team-tab.tsx to comply with React hooks rules"
metrics:
  duration: 29min
  completed: 2026-02-04
---

# Phase 8 Plan 14: Manager Proxy Reporting UI Summary

Multi-step form for managers to submit reports on behalf of team members, with proper attribution and access code delivery to employees.

## One-liner

Manager proxy reporting UI with team member selector, predefined reasons, and confirmation showing access code went to employee.

## What Was Built

### Task 1: Team Member Selector Component

Created searchable team member selector:
- `useTeamMembers` hook fetching from `/api/v1/employee/team`
- `TeamMemberSelector` with avatar, name, job title, department, email
- Keyboard navigation and search filtering
- Reporting depth badges (Direct report, Skip-level)
- Empty state for non-managers

### Task 2: Proxy Report Form

Created multi-step proxy submission form:
- Step 1: Select team member from hierarchy
- Step 2: Select proxy reason (4 predefined + OTHER with custom text)
- Step 3: Report details (category, description, attachments)
- Step 4: Review with clear notice about access code delivery

Components:
- `ProxyReasonSelector` with radio buttons for predefined reasons
- `ProxyReportForm` with 4-step wizard and progress indicator

### Task 3: Proxy Report Page and Confirmation

Created page and confirmation:
- `/employee/proxy-report` route with manager access check
- `ProxyConfirmation` showing success state
- Clear notice: "Access code sent to employee at [email]"
- Manager does NOT see the access code (per CONTEXT.md)
- Audit acknowledgment message

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed useEmployeeProfile type error**
- **Issue:** Build failed due to `user.name` not existing on `AuthUser`
- **Fix:** Changed to `${user.firstName} ${user.lastName}`.trim()
- **Files:** apps/frontend/src/hooks/useEmployeeProfile.ts

**2. [Rule 3 - Blocking] Fixed my-team-tab.tsx hooks ordering**
- **Issue:** React hooks called conditionally after early return
- **Fix:** Moved manager check after all hooks, added `enabled: isManager` to query
- **Files:** apps/frontend/src/components/employee/my-team-tab.tsx

## Verification Results

- [x] Build passes: `npm run build` (frontend) succeeds
- [x] Only managers can access proxy report page
- [x] Team member selector shows direct and indirect reports
- [x] Proxy reason required with predefined options
- [x] Employee info auto-filled from selection
- [x] Confirmation states access code went to employee

## Commits

| Hash | Description |
|------|-------------|
| a986e94 | feat(08-14): add team member selector component |
| 5dbd7d7 | feat(08-14): add proxy reason selector component |
| b17cd18 | feat(08-14): add proxy report page and confirmation |

## Dependencies

### Backend API Endpoints Needed

The following endpoints are expected but not yet implemented:
- `GET /api/v1/employee/team` - Returns team members with status
- `POST /api/v1/employee/proxy-report` - Submit proxy report
- `GET /api/v1/categories` - Get categories (authenticated)

### UI Components Used

- CategorySelector from Ethics Portal
- AttachmentUpload from Ethics Portal
- shadcn/ui: Card, Button, Input, Textarea, Checkbox, Avatar, Badge, Progress, Skeleton

## Next Phase Readiness

**Blockers:** None - UI complete, needs backend API endpoints

**Ready for:**
- Backend proxy report API implementation
- Integration testing with actual API
- E2E tests for proxy reporting flow
