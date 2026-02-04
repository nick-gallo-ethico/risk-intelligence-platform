---
phase: 08-portals
plan: 09
subsystem: operator-console
tags: [frontend, operator, layout, react-query, split-screen]
dependency-graph:
  requires: [08-03, 08-07]
  provides: [operator-console-layout, call-controls, context-tabs, useClientProfile-hook]
  affects: [08-10, 08-11]
tech-stack:
  added: ["@tanstack/react-query@^5.62.0"]
  patterns: [split-screen-layout, abort-controller-pattern, tabbed-interface]
key-files:
  created:
    - apps/frontend/src/app/operator/layout.tsx
    - apps/frontend/src/app/operator/page.tsx
    - apps/frontend/src/components/operator/operator-console-layout.tsx
    - apps/frontend/src/components/operator/call-controls.tsx
    - apps/frontend/src/components/operator/call-timer.tsx
    - apps/frontend/src/components/operator/context-tabs.tsx
    - apps/frontend/src/components/operator/directives-panel.tsx
    - apps/frontend/src/components/operator/hris-lookup-panel.tsx
    - apps/frontend/src/components/operator/caller-history-panel.tsx
    - apps/frontend/src/hooks/useClientProfile.ts
    - apps/frontend/src/services/operator-api.ts
    - apps/frontend/src/types/operator.types.ts
  modified:
    - apps/frontend/src/types/auth.ts
    - apps/frontend/src/types/user.ts
    - apps/frontend/src/app/providers.tsx
    - apps/frontend/package.json
decisions:
  - key: react-query-added
    value: Added @tanstack/react-query for data fetching with caching
    rationale: Required for efficient caching and AbortController support in useClientProfile
  - key: operator-role-added
    value: Added OPERATOR and MANAGER roles to frontend type definitions
    rationale: Backend already has these roles; frontend types needed sync
  - key: abort-controller-pattern
    value: useClientProfile uses AbortController to cancel stale lookups
    rationale: Per RESEARCH.md pitfall #5 - prevents race conditions when operators quickly switch calls
metrics:
  duration: 14 min
  completed: 2026-02-04
---

# Phase 8 Plan 9: Operator Console Layout Summary

**One-liner:** HubSpot-inspired split-screen Operator Console with call controls, context tabs, and client profile lookup using AbortController pattern.

## What Was Built

### Operator Console Layout Structure
- Full-screen layout at `/operator` with OPERATOR role requirement
- Split-screen design: 60% left (intake form area), 40% right (context tabs)
- Top bar (h-14) with call controls section

### CallControls Component
- Left section: Client name badge, hotline number badge
- Center section: Phone number input with search button for manual lookup
- Right section (when call active): Timer, Mute, Hold, Transfer, End Call buttons
- CallTimer component displaying MM:SS format with hold indicator

### Context Tabs (3 tabs)
1. **Script/Guide (DirectivesPanel)**
   - Fetches directives from `/operator/clients/:clientId/directives/call`
   - Groups by stage: Opening, Intake, Category-Specific, Closing
   - Highlights current stage with pulsing indicator
   - Read-aloud prompts styled with blue background and speaker icon
   - Collapsible sections with auto-expand on current stage

2. **HRIS Lookup (HrisLookupPanel)**
   - Search input with 300ms debounce
   - Results display: name, job title, department, location, email
   - Selected employee shows manager hierarchy
   - Click to select as subject (emits callback)

3. **History (CallerHistoryPanel)**
   - Lists previous RIUs from same phone number
   - Shows: reference number, date, category, status, summary
   - Click to view details in modal dialog

### useClientProfile Hook
- Manages client profile state with react-query
- `lookupByPhone(phone)` - Looks up client by phone number, handles 404 gracefully
- `loadClient(clientId)` - Direct load by ID
- `clearClient()` - Reset state
- **AbortController pattern** cancels stale requests when new lookup starts
- 5-minute cache stale time

### Type Definitions
- ClientProfile, HotlineNumber, QaConfig, CategoryInfo, BrandingInfo
- CallDirectives with stage-based Directive arrays
- HrisResult for employee search
- CallerHistoryItem for previous RIUs
- QaQueueItem and PaginatedQaQueueResult for QA queue

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Added @tanstack/react-query | Required for efficient caching and AbortController support in useClientProfile |
| Added OPERATOR/MANAGER to frontend types | Backend already has these roles; needed sync for role-based layout guard |
| AbortController in useClientProfile | Per RESEARCH.md pitfall #5 - prevents race conditions when operators quickly switch calls |
| Placeholder for intake form | IntakeForm component will be built in 08-10; layout ready to receive it via slot |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @tanstack/react-query dependency**
- **Found during:** Task 2 build verification
- **Issue:** Build failed - useQuery and useQueryClient imports missing
- **Fix:** Installed @tanstack/react-query@^5.62.0 and added QueryClientProvider to providers.tsx
- **Files modified:** apps/frontend/package.json, apps/frontend/src/app/providers.tsx
- **Commit:** 4b3e454

**2. [Rule 1 - Bug] Added OPERATOR and MANAGER roles to frontend types**
- **Found during:** Build verification after react-query fix
- **Issue:** TypeScript error - ROLE_LABELS missing OPERATOR and MANAGER keys
- **Fix:** Updated auth.ts UserRole and user.ts USER_ROLES/ROLE_LABELS
- **Files modified:** apps/frontend/src/types/auth.ts, apps/frontend/src/types/user.ts
- **Commit:** 4b3e454

## Verification Results

1. `npm run build -- --filter=frontend` - PASSED
2. Split-screen layout structure verified in build output - /operator route at 12.1 kB
3. All components compile without errors
4. Type definitions complete and consistent

## Next Phase Readiness

Ready for 08-10 (Intake Form):
- OperatorConsoleLayout accepts `intakeFormSlot` prop for form injection
- CallControls provides phone lookup trigger
- Context tabs ready to display category-specific directives when category selected
- useClientProfile hook available for intake form to access client data

## Commits

| Hash | Message |
|------|---------|
| 4b3e454 | feat(08-09): add Operator Console layout and base components |
