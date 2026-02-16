---
phase: 36-test-coverage-expansion
plan: 01
subsystem: testing
tags: [jest, nestjs, guards, auth, websocket, mfa, throttle]

# Dependency graph
requires:
  - phase: 32
    provides: Security hardening of auth guards
provides:
  - Complete unit test coverage for all 6 auth guards (jwt-auth, roles, tenant, jwt-ws, mfa, throttle-behind-proxy)
  - Test patterns for WebSocket guards and async guards
affects: [36-02, 36-03, 36-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TestableGuard subclass pattern for protected method testing
    - jest.mock() for ESM module isolation

key-files:
  created:
    - apps/backend/src/modules/auth/guards/jwt-ws.guard.spec.ts
    - apps/backend/src/modules/auth/guards/mfa.guard.spec.ts
    - apps/backend/src/modules/auth/guards/throttle-behind-proxy.guard.spec.ts
  modified: []

key-decisions:
  - "Use jest.mock() for MfaService to avoid ESM import issues with otplib"
  - "Use TestableGuard subclass to expose protected methods for ThrottlerGuard testing"

patterns-established:
  - "WebSocket guard testing: mock ExecutionContext.switchToWs() with Socket having handshake.auth/headers/query"
  - "Async guard testing: await expect(guard.canActivate(ctx)).rejects.toThrow() pattern"
  - "Protected method testing: TestableGuard subclass with public wrapper methods"

# Metrics
duration: 22min
completed: 2026-02-16
---

# Phase 36 Plan 01: Auth Guards Unit Tests Summary

**57 new test cases across 3 guard spec files covering jwt-ws, mfa, and throttle-behind-proxy guards for 90%+ auth guard coverage**

## Performance

- **Duration:** 22 min
- **Started:** 2026-02-16T19:52:57Z
- **Completed:** 2026-02-16T20:15:05Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created jwt-ws.guard.spec.ts with 23 test cases covering WebSocket token extraction, error handling, and user data attachment
- Created mfa.guard.spec.ts with 15 test cases covering async MFA verification flow
- Created throttle-behind-proxy.guard.spec.ts with 19 test cases covering IP extraction and rate limit key generation
- All 105 guard tests pass (7 guard spec files total)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create jwt-ws.guard.spec.ts** - `37f0492` (test)
2. **Task 2: Create mfa.guard.spec.ts** - `46f5dbe` (test)
3. **Task 3: Create throttle-behind-proxy.guard.spec.ts** - `2edd357` (test)

## Files Created/Modified

- `apps/backend/src/modules/auth/guards/jwt-ws.guard.spec.ts` - WebSocket JWT guard tests (23 cases)
- `apps/backend/src/modules/auth/guards/mfa.guard.spec.ts` - MFA guard tests (15 cases)
- `apps/backend/src/modules/auth/guards/throttle-behind-proxy.guard.spec.ts` - Throttle guard tests (19 cases)

## Decisions Made

1. **jest.mock() for MfaService** - The MfaService imports otplib which uses ESM modules that Jest cannot transform. Using jest.mock() before the import avoids the ESM parsing error.

2. **TestableGuard subclass** - The ThrottlerGuard from @nestjs/throttler requires THROTTLER:MODULE_OPTIONS injection token which is complex to mock. Creating a TestableThrottleBehindProxyGuard subclass that exposes protected methods as public methods allows testing without NestJS DI complexity.

## Deviations from Plan

None - plan executed exactly as written. The jwt-ws.guard.spec.ts already existed from a previous incomplete run but was uncommitted.

## Issues Encountered

1. **ESM module import error with otplib** - MfaService imports otplib which uses @scure/base with `export` syntax that Jest couldn't parse. Resolved by using jest.mock() to mock the entire MfaService module before import.

2. **ThrottlerGuard DI complexity** - The parent ThrottlerGuard class requires THROTTLER:MODULE_OPTIONS injection token. Rather than mocking the entire NestJS throttler module, used a TestableGuard subclass pattern to expose protected methods directly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auth guards fully tested with 105 test cases across 7 spec files
- Ready for 36-02: Auth strategies unit tests (jwt, azure-ad, google)
- Testing patterns established for guards can be applied to strategy testing

---

_Phase: 36-test-coverage-expansion_
_Completed: 2026-02-16_
