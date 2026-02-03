---
phase: 02-demo-tenant-seed-data
plan: 01
subsystem: database
tags: [faker, date-fns, seeding, cli-progress, deterministic]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: NestJS backend structure, Prisma schema
provides:
  - SEED_CONFIG with volumes, distributions, and organization structure
  - Temporal utilities for historical date generation
  - Weighted random selection utilities
  - CLI progress tracking for long-running seed operations
  - Seeder orchestrator scaffold
affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07, demo-data]

# Tech tracking
tech-stack:
  added: [@faker-js/faker, date-fns, cli-progress, chalk]
  patterns: [deterministic-seeding, exponential-date-distribution, weighted-selection]

key-files:
  created:
    - apps/backend/prisma/seeders/config.ts
    - apps/backend/prisma/seeders/utils/temporal.ts
    - apps/backend/prisma/seeders/utils/weighted-random.ts
    - apps/backend/prisma/seeders/utils/progress.ts
    - apps/backend/prisma/seeders/utils/index.ts
    - apps/backend/prisma/seeders/index.ts
  modified:
    - apps/backend/package.json

key-decisions:
  - "Master seed 20260202 ensures fully reproducible demo data"
  - "Reference date 2026-02-02 anchors all historical calculations"
  - "Exponential distribution with 0.3 recency bias for realistic date patterns"
  - "10 categories with varying anonymity rates (30-80%) based on sensitivity"

patterns-established:
  - "faker.seed(masterSeed) at seeder start for determinism"
  - "SEED_CONFIG as single source of truth for all seeders"
  - "BatchProgress class for consistent CLI feedback"
  - "generateCaseTimeline() for realistic case progression"

# Metrics
duration: 8min
completed: 2026-02-03
---

# Phase 02 Plan 01: Seed Infrastructure & Configuration Summary

**Deterministic seed utilities with @faker-js/faker, date-fns for temporal distribution, and SEED_CONFIG defining 20k employees, 5k RIUs, 4.5k cases across 4 divisions and 50+ locations**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-03T06:46:00Z
- **Completed:** 2026-02-03T06:54:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Installed seed data dependencies: @faker-js/faker, date-fns, cli-progress, chalk
- Created comprehensive SEED_CONFIG with volume targets, organization structure, and distribution weights
- Built temporal utilities with recency-biased historical date generation
- Implemented weighted random selection for probability-based data distribution
- Created seeder orchestrator scaffold with determinism verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Install seed data dependencies** - `09fbd8f` (chore)
2. **Task 2: Create seed configuration and utility functions** - `30a901d` (feat)
3. **Task 3: Create seeder orchestrator scaffold** - `dcfec83` (feat)

## Files Created/Modified

- `apps/backend/package.json` - Added @faker-js/faker, date-fns, cli-progress, chalk dependencies
- `apps/backend/prisma/seeders/config.ts` - Master configuration with volumes, distributions, org structure
- `apps/backend/prisma/seeders/utils/temporal.ts` - Date generation with recency bias, case timelines
- `apps/backend/prisma/seeders/utils/weighted-random.ts` - Weighted selection, chance(), randomInt()
- `apps/backend/prisma/seeders/utils/progress.ts` - BatchProgress class, logging utilities
- `apps/backend/prisma/seeders/utils/index.ts` - Barrel export for all utilities
- `apps/backend/prisma/seeders/index.ts` - Orchestrator with determinism verification

## Decisions Made

- **Master seed value 20260202** - Matches current date pattern for easy identification
- **Reference date 2026-02-02T00:00:00Z** - Fixed point in time for all historical calculations
- **Recency bias 0.3** - Moderate bias creates realistic exponential distribution
- **Category anonymity rates** - Sensitive categories (harassment 70%, retaliation 80%) have higher anonymous rates
- **Case timing split** - Simple cases 2-4 days, complex 1-3 months, targeting 22-day average

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed chalk ESM import error**
- **Found during:** Task 2 (utility creation)
- **Issue:** `import chalk from 'chalk'` fails with "esModuleInterop" error
- **Fix:** Changed to `import * as chalk from 'chalk'` for CommonJS compatibility
- **Files modified:** apps/backend/prisma/seeders/utils/progress.ts
- **Verification:** TypeScript compilation succeeds
- **Committed in:** 30a901d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor import style adjustment required for TypeScript compatibility. No scope creep.

## Issues Encountered

None - TypeScript compilation and dependency installation completed without issues after the import fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 02 Plan 02-07:**
- SEED_CONFIG provides all volume targets and distributions
- Temporal utilities ready for historical date generation
- Weighted random utilities ready for probability-based selection
- Orchestrator scaffold ready to integrate individual seeders

**Future plans will add:**
- Organization structure seeder (02-02)
- Employee seeder (02-03)
- Demo user seeder (02-04)
- Policy seeder (02-05)
- RIU and case seeders (02-06)
- Campaign seeder (02-07)

---
*Phase: 02-demo-tenant-seed-data*
*Completed: 2026-02-03*
