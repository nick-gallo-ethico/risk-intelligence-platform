---
phase: 39-frontend-test-repair
plan: 01
subsystem: testing
tags: [react-query, testing-library, vitest, test-utilities]

# Dependency graph
requires:
  - phase: 25.1-case-detail-vision
    provides: useActivities hook with React Query dependency
provides:
  - renderWithProviders test utility with QueryClientProvider wrapper
  - createTestQueryClient factory for isolated test QueryClient instances
  - Re-exported @testing-library/react for convenient single import
affects: [39-02, 39-03, 39-04, 39-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Test render wrapper pattern for React Query components"
    - "Fresh QueryClient per render to prevent cache pollution"
    - "Re-export pattern for testing library convenience"

key-files:
  created:
    - apps/frontend/src/test/renderWithProviders.tsx
  modified: []

key-decisions:
  - "retry: false to prevent test flakiness from query retries"
  - "gcTime: 0 to prevent cache pollution between tests"
  - "Re-export all RTL exports for single import convenience"

patterns-established:
  - "renderWithProviders for all React Query components: import { renderWithProviders, screen } from '@/test/renderWithProviders'"
  - "createTestQueryClient factory for direct QueryClient access in edge cases"

# Metrics
duration: 5min
completed: 2026-02-20
---

# Phase 39 Plan 01: renderWithProviders Test Utility Summary

**QueryClientProvider wrapper utility for testing React Query components with isolated cache per render**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-20T17:09:41Z
- **Completed:** 2026-02-20T17:14:19Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Created reusable test wrapper utility for React Query components
- Configured QueryClient for test environment (no retries, no cache pollution)
- Established import pattern for all affected tests in subsequent plans

## Task Commits

Each task was committed atomically:

1. **Task 1: Create renderWithProviders test utility** - `27a9b6a` (feat)
2. **Task 2: Verify utility works with TypeScript** - verified in Task 1 commit (no additional changes)

## Files Created/Modified

- `apps/frontend/src/test/renderWithProviders.tsx` - Test utility with QueryClientProvider wrapper, createTestQueryClient factory, and RTL re-exports

## Decisions Made

- **retry: false** - Prevents test flakiness from query retries during failure scenarios
- **gcTime: 0** - Ensures no cache pollution between tests (formerly cacheTime in React Query v4)
- **Re-export pattern** - All @testing-library/react exports re-exported so tests only need one import

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- renderWithProviders utility ready for use by all 38 failing test files
- Plan 39-02 can begin updating common test files (mocks, setup)
- Plans 39-03 through 39-05 will update individual test suites to import renderWithProviders

---

_Phase: 39-frontend-test-repair_
_Completed: 2026-02-20_
