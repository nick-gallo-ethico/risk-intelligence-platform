---
phase: 44-employee-chatbot
plan: 09
subsystem: ui
tags: [chatbot, react, next.js, portal, layout, frontend]

# Dependency graph
requires:
  - phase: 44-08
    provides: ChatbotWidget component and useChatbot hook
  - phase: 44-07
    provides: ChatbotGateway WebSocket server
provides:
  - ChatbotWidget integrated into Ethics Portal layout (anonymous mode)
  - ChatbotWidget integrated into Employee Portal layout (authenticated mode)
  - Conditional rendering based on tenant chatbot feature flag
affects: [44-10, portal-testing, end-to-end-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional widget rendering based on feature flags"
    - "Auth token passthrough to client components"

key-files:
  created:
    - apps/frontend/src/components/chatbot/chatbot-widget.tsx
    - apps/frontend/src/components/chatbot/index.ts
  modified:
    - apps/frontend/src/app/ethics/[tenant]/layout.tsx
    - apps/frontend/src/app/employee/layout.tsx

key-decisions:
  - "Stub ChatbotWidget created for TypeScript compilation while 44-08 runs in parallel"
  - "Ethics Portal chatbot controlled by config.features.chatbotEnabled flag"
  - "EmployeeChatbotWrapper created to bridge auth context to ChatbotWidget"

patterns-established:
  - "Feature-flagged widget: Conditionally render based on tenant config"
  - "Auth wrapper pattern: Create dedicated component to get token for client widgets"

# Metrics
duration: 11min
completed: 2026-03-04
---

# Phase 44 Plan 09: Portal Widget Integration Summary

**ChatbotWidget integrated into Ethics Portal (anonymous) and Employee Portal (authenticated) layouts with feature flag control**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-04T12:30:48Z
- **Completed:** 2026-03-04T12:42:02Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Ethics Portal layout now includes ChatbotWidget with tenant slug for anonymous chatbot
- Employee Portal layout now includes ChatbotWidget with JWT token for authenticated chatbot
- Chatbot visibility controlled by `config.features.chatbotEnabled` flag
- Stub ChatbotWidget created for compilation (full impl in 44-08)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ChatbotWidget to Ethics Portal layout** - `b0a244f0` (feat)
2. **Task 2: Add ChatbotWidget to Employee Portal layout** - `ed43d39d` (feat)

## Files Created/Modified

- `apps/frontend/src/app/ethics/[tenant]/layout.tsx` - Added ChatbotWidget import and conditional rendering
- `apps/frontend/src/app/employee/layout.tsx` - Added ChatbotWidget import, EmployeeChatbotWrapper, and integration
- `apps/frontend/src/components/chatbot/chatbot-widget.tsx` - Stub widget component (placeholder for 44-08)
- `apps/frontend/src/components/chatbot/index.ts` - Component exports

## Decisions Made

1. **Created stub ChatbotWidget** - Since 44-08 runs in parallel and hadn't finished, created a stub component to allow TypeScript compilation to pass. The stub will be replaced by the full implementation from 44-08.

2. **Feature flag control for Ethics Portal** - ChatbotWidget only renders when `config.features.chatbotEnabled` is true, allowing per-tenant chatbot enablement.

3. **EmployeeChatbotWrapper pattern** - Created a dedicated wrapper component that uses `useAuth()` to get the access token and passes it to ChatbotWidget. This bridges the auth context to the widget.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created stub ChatbotWidget component**

- **Found during:** Task 1 (Ethics Portal integration)
- **Issue:** ChatbotWidget component from 44-08 didn't exist yet (parallel execution)
- **Fix:** Created stub chatbot-widget.tsx and index.ts with minimal implementation
- **Files modified:** apps/frontend/src/components/chatbot/chatbot-widget.tsx, apps/frontend/src/components/chatbot/index.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** b0a244f0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Stub necessary to unblock compilation. Will be replaced by 44-08's full implementation.

## Issues Encountered

- **Parallel execution dependency:** Plan 44-08 (ChatbotWidget frontend) hadn't completed when this plan started. Created stub components to allow compilation. The full implementation from 44-08 will overwrite the stub.

- **Next.js lint path issue:** The `npm run lint` command with subdirectory paths failed due to monorepo configuration. Used direct eslint invocation instead - linting passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both portal layouts now include the chatbot widget
- Once 44-08 completes with full ChatbotWidget implementation, chatbot will be fully functional
- Ready for 44-10 (if any) or end-to-end testing

---

_Phase: 44-employee-chatbot_
_Completed: 2026-03-04_
