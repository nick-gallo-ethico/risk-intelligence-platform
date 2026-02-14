---
phase: 30-test-coverage-foundation
plan: 05
subsystem: testing
tags: [msw, vitest, react-testing-library, error-boundary, mocking]

# Dependency graph
requires:
  - phase: 30-01
    provides: MSW installation foundation
provides:
  - MSW v2 test infrastructure for frontend
  - API mocking handlers for cases, tasks, my-work, dashboard/stats, users/me
  - 3 error boundary components (ErrorBoundary, RouteErrorBoundary, ApiErrorBoundary)
  - Dashboard component tests (StatsCards, MyTasks)
affects: [frontend-testing, component-tests, integration-tests]

# Tech tracking
tech-stack:
  added: [msw@^2.12.10]
  patterns:
    [
      MSW handler pattern with wildcard URLs,
      ErrorBoundary class component pattern,
    ]

key-files:
  created:
    - apps/frontend/src/test/mocks/handlers.ts
    - apps/frontend/src/test/mocks/server.ts
    - apps/frontend/src/components/errors/error-boundary.tsx
    - apps/frontend/src/components/errors/route-error-boundary.tsx
    - apps/frontend/src/components/errors/api-error-boundary.tsx
    - apps/frontend/src/components/errors/index.ts
    - apps/frontend/src/components/errors/__tests__/error-boundary.test.tsx
    - apps/frontend/src/components/dashboard/__tests__/stats-cards.test.tsx
    - apps/frontend/src/components/dashboard/__tests__/my-tasks.test.tsx
  modified:
    - apps/frontend/package.json
    - apps/frontend/src/test/setup.ts

key-decisions:
  - "Use wildcard URL patterns (*/api/v1/...) in MSW handlers to match axios full URLs"
  - "Add localStorage mock to test setup for auth-storage compatibility"
  - "ErrorBoundary uses class component pattern as required by React error boundary API"
  - "ApiErrorBoundary uses render props pattern for react-query integration"

patterns-established:
  - "MSW handler pattern: Use API_BASE = '*/api/v1' prefix for all handlers"
  - "Test provider wrapper: QueryClientProvider with retry:false for deterministic tests"
  - "Error boundary pattern: ErrorBoundary for JS errors, ApiErrorBoundary for data loading"

# Metrics
duration: 35min
completed: 2026-02-14
---

# Phase 30 Plan 05: Frontend Test Infrastructure Summary

**MSW v2 API mocking with error boundary components and dashboard component tests**

## Performance

- **Duration:** 35 min
- **Started:** 2026-02-14T21:41:24Z
- **Completed:** 2026-02-14T22:16:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Installed MSW v2 and configured for Vitest with lifecycle hooks (beforeAll/afterEach/afterAll)
- Created 7 API handlers for cases, tasks, my-work, dashboard stats, users/me, and auth refresh
- Built 3 error boundary components: ErrorBoundary (class), RouteErrorBoundary (Next.js pages), ApiErrorBoundary (data loading)
- Created 13 comprehensive ErrorBoundary tests covering error catching, custom fallback, recovery, and logging
- Created 23 dashboard component tests for StatsCards (11) and MyTasks (12) with MSW mock data

## Task Commits

Each task was committed atomically:

1. **Task 1: Install MSW and configure test setup** - `0d4ac6b` (feat)
2. **Task 2: Create error boundary components with tests** - `b83122c` (feat)
3. **Task 3: Create dashboard component tests** - `c80c1d9` (test - included in batch commit)

## Files Created/Modified

### Created

- `apps/frontend/src/test/mocks/handlers.ts` (208 lines) - MSW request handlers with mock data
- `apps/frontend/src/test/mocks/server.ts` (15 lines) - MSW server setup for Node.js
- `apps/frontend/src/components/errors/error-boundary.tsx` (89 lines) - Generic error boundary with Try again
- `apps/frontend/src/components/errors/route-error-boundary.tsx` (50 lines) - Next.js error.tsx component
- `apps/frontend/src/components/errors/api-error-boundary.tsx` (71 lines) - Data loading error handler
- `apps/frontend/src/components/errors/index.ts` - Barrel export
- `apps/frontend/src/components/errors/__tests__/error-boundary.test.tsx` (249 lines) - 13 tests
- `apps/frontend/src/components/dashboard/__tests__/stats-cards.test.tsx` - 11 tests
- `apps/frontend/src/components/dashboard/__tests__/my-tasks.test.tsx` - 12 tests

### Modified

- `apps/frontend/package.json` - Added msw@^2 devDependency
- `apps/frontend/src/test/setup.ts` - Added MSW lifecycle, localStorage mock, matchMedia mock

## Decisions Made

1. **Wildcard URL patterns in MSW handlers** - Used `*/api/v1/...` pattern instead of `/api/v1/...` to match full URLs from axios baseURL configuration
2. **localStorage mock in setup** - Added global localStorage mock because auth-storage uses localStorage.getItem which fails in jsdom without it
3. **ReactNode return type for throwing components** - Added explicit return type annotations to satisfy TypeScript when components always throw
4. **getAllByText for multiple elements** - Used getAllByText instead of getByText when testing elements that appear multiple times (e.g., due dates)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] MSW handlers not intercepting axios requests**

- **Found during:** Task 3 (Dashboard tests)
- **Issue:** MSW handlers used `/api/v1/...` but axios uses full URL `http://localhost:3000/api/v1/...`
- **Fix:** Updated all handlers to use `${API_BASE}` with `API_BASE = '*/api/v1'` wildcard pattern
- **Files modified:** apps/frontend/src/test/mocks/handlers.ts
- **Verification:** MyTasks tests receive mock data correctly

**2. [Rule 3 - Blocking] localStorage not available in jsdom**

- **Found during:** Task 3 (MyTasks tests)
- **Issue:** MyTasks component uses auth-storage which calls localStorage.getItem, causing TypeError
- **Fix:** Added localStorage mock object to test setup.ts
- **Files modified:** apps/frontend/src/test/setup.ts
- **Verification:** Tests no longer fail with localStorage errors

**3. [Rule 1 - Bug] TypeScript error for throwing components**

- **Found during:** Task 2 (Pre-commit hook)
- **Issue:** ThrowingComponent function returns void, not valid JSX element type
- **Fix:** Added explicit `: ReactNode` return type annotation
- **Files modified:** apps/frontend/src/components/errors/**tests**/error-boundary.test.tsx
- **Verification:** TypeScript check passes

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All fixes necessary for tests to run correctly. No scope creep.

## Issues Encountered

- Pre-existing test failures (49 tests) in other frontend components unrelated to this plan - these existed before plan execution and remain unchanged

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MSW infrastructure ready for additional endpoint handlers
- Error boundary components available for app integration
- Dashboard test patterns established for other component tests
- Note: 49 pre-existing test failures should be addressed in a separate maintenance effort

---

_Phase: 30-test-coverage-foundation_
_Completed: 2026-02-14_
