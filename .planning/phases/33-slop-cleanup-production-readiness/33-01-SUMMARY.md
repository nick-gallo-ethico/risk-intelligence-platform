---
phase: 33-slop-cleanup-production-readiness
plan: 01
subsystem: infra
tags: [nestjs, modules, configservice, logging, devdependencies]

# Dependency graph
requires:
  - phase: 32-security-soc2-fixes
    provides: Security foundation and JWT patterns
provides:
  - FeatureFlagsModule registered in AppModule (feature flag management)
  - MetricsModule registered in AppModule (Prometheus metrics)
  - SentryModule registered in AppModule (error tracking)
  - ConfigService-based JWT secret access in WebSocket gateways
  - NestJS Logger usage in storage module
  - Production bundle optimization (faker in devDeps)
affects: [performance, production-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ConfigService.getOrThrow for required config values
    - Module-level Logger for factory initialization logging

key-files:
  created: []
  modified:
    - apps/backend/src/app.module.ts
    - apps/backend/src/modules/notifications/gateways/notification.gateway.ts
    - apps/backend/src/modules/projects/gateways/project.gateway.ts
    - apps/backend/src/modules/storage/storage.module.ts
    - apps/backend/package.json

key-decisions:
  - "Use ConfigService.getOrThrow (not get) for JWT_SECRET to fail fast on missing config"
  - "Use module-level Logger instance for useFactory initialization logging"

patterns-established:
  - "ConfigService.getOrThrow pattern: Use getOrThrow for required config, get for optional with defaults"
  - "Module-level Logger: For logging in useFactory, create const logger outside @Module decorator"

# Metrics
duration: 12min
completed: 2026-02-15
---

# Phase 33 Plan 01: Module Registration and Production Config Summary

**Register 3 orphaned infrastructure modules, replace direct process.env access with ConfigService, and optimize production bundle**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-16T00:21:38Z
- **Completed:** 2026-02-16T00:33:40Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- FeatureFlagsModule, MetricsModule, and SentryModule now registered in AppModule (SLOP-01)
- WebSocket gateways use ConfigService.getOrThrow for JWT_SECRET instead of process.env (PROD-03)
- storage.module.ts uses NestJS Logger instead of console.error (PROD-05)
- @faker-js/faker moved to devDependencies for ~5MB production bundle reduction (PROD-04)

## Task Commits

Each task was committed atomically:

1. **Task 1: Register orphaned modules in AppModule** - `395612b` (feat)
2. **Task 2: Replace process.env.JWT_SECRET with ConfigService** - `ff50b6d` (fix)
3. **Task 3: Replace console.error and move faker** - `b7b43f3` (fix)

## Files Created/Modified

- `apps/backend/src/app.module.ts` - Added imports for FeatureFlagsModule, MetricsModule, SentryModule
- `apps/backend/src/modules/notifications/gateways/notification.gateway.ts` - Inject ConfigService, use getOrThrow for JWT_SECRET
- `apps/backend/src/modules/projects/gateways/project.gateway.ts` - Inject ConfigService, use getOrThrow for JWT_SECRET
- `apps/backend/src/modules/storage/storage.module.ts` - Use NestJS Logger instead of console.error
- `apps/backend/package.json` - Move @faker-js/faker to devDependencies

## Decisions Made

- **ConfigService.getOrThrow for JWT_SECRET:** Use getOrThrow (not get) to fail fast if JWT_SECRET is missing - this is a required configuration value
- **Module-level Logger:** For logging in useFactory, create a const logger outside the @Module decorator since there's no class instance to inject into

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pdf-parse import in document-processing.service.ts**

- **Found during:** Task 2 (pre-commit hook failure)
- **Issue:** Pre-existing TypeScript error: `import * as pdfParse from "pdf-parse"` caused "no call signatures" error
- **Fix:** Changed to `const pdfParse = require("pdf-parse")` with eslint-disable comment
- **Files modified:** apps/backend/src/modules/storage/document-processing.service.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** ff50b6d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary to unblock commit. Pre-existing issue in codebase, not introduced by this plan.

## Issues Encountered

- Pre-existing TypeScript error in document-processing.service.ts blocked commit hooks - fixed inline per Rule 3

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Infrastructure modules now properly registered and available globally
- WebSocket gateways follow production config patterns
- Ready for Phase 33-02 (Service Architecture Cleanup)

---

_Phase: 33-slop-cleanup-production-readiness_
_Completed: 2026-02-15_
