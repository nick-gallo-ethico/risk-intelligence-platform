---
phase: 04-core-entities
plan: 06
subsystem: api
tags: [nestjs, rius, anonymous-access, access-code, nanoid, rate-limiting, public-api]

# Dependency graph
requires:
  - phase: 04-05
    provides: RIU extension services (HotlineRiuService, DisclosureRiuService, WebFormRiuService)
provides:
  - RiuAccessService for access code generation and anonymous status lookup
  - RiuAccessController with public endpoints for status check and messaging
  - 12-character secure access codes using nanoid with custom alphabet
  - Anonymous relay messaging capability via access code
affects: [05-ai-infrastructure, 06-operator-console, 07-ethics-portal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Public controller pattern (no auth required, access code as authorization)
    - Nanoid custom alphabet for access code generation
    - Rate limiting per endpoint with @Throttle decorator

key-files:
  created:
    - apps/backend/src/modules/rius/riu-access.service.ts
    - apps/backend/src/modules/rius/riu-access.controller.ts
    - apps/backend/src/modules/rius/dto/access-code.dto.ts
  modified:
    - apps/backend/src/modules/rius/rius.module.ts
    - apps/backend/src/modules/rius/dto/index.ts
    - apps/backend/src/modules/rius/index.ts

key-decisions:
  - "Access codes use custom nanoid alphabet excluding confusing chars (0/O, 1/I/L)"
  - "Public endpoints at /api/v1/public/access require no authentication"
  - "Rate limits: status 10/min, messages 20/min, send 5/min"
  - "Outbound messages (TO reporter) marked as read when retrieved"
  - "Event emitted on message send for notification integration"

patterns-established:
  - "Public controller pattern: access code IS the authorization token"
  - "Anonymous relay: getMessages marks outbound as read automatically"

# Metrics
duration: 9min
completed: 2026-02-03
---

# Phase 4 Plan 6: Anonymous Access Code Operations Summary

**RiuAccessService with nanoid-generated 12-character access codes and public controller for anonymous status checking and relay messaging**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-03T09:36:55Z
- **Completed:** 2026-02-03T09:46:05Z
- **Tasks:** 2
- **Files created:** 3
- **Files modified:** 3

## Accomplishments
- Created RiuAccessService with secure access code generation using nanoid
- Implemented public endpoints for anonymous reporters to check status and communicate
- Added rate limiting to prevent brute-force attacks on access codes
- Integrated event emission for case.message.received notifications

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RiuAccessService for code generation and lookup** - `a512e30` (feat)
2. **Task 2: Create public controller for access code operations** - `3afbd40` (feat)

## Files Created/Modified

**Created:**
- `apps/backend/src/modules/rius/dto/access-code.dto.ts` - DTOs for access code validation and responses
- `apps/backend/src/modules/rius/riu-access.service.ts` - Service for code generation, status check, messaging
- `apps/backend/src/modules/rius/riu-access.controller.ts` - Public controller with rate-limited endpoints

**Modified:**
- `apps/backend/src/modules/rius/rius.module.ts` - Added RiuAccessService and RiuAccessController
- `apps/backend/src/modules/rius/dto/index.ts` - Exported new DTOs
- `apps/backend/src/modules/rius/index.ts` - Exported new service and controller

## Decisions Made

1. **Access code format:** 12-character uppercase alphanumeric using custom alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (excludes 0/O, 1/I/L to avoid confusion)
2. **Rate limits:** Tiered by endpoint sensitivity - status check (10/min), messages (20/min), send (5/min)
3. **Message read tracking:** Outbound messages (TO reporter) automatically marked as read when reporter retrieves them
4. **Error messages:** Generic "Invalid access code" to prevent enumeration attacks
5. **Event emission:** `case.message.received` event emitted on anonymous message send for notification integration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Pre-existing build error:** Parallel work in 04-08 (campaigns module) has incomplete code causing build failures. This is unrelated to 04-06 - verified my code compiles correctly in isolation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Anonymous access code system complete and ready for integration
- Operator console (Phase 6) can use RiuAccessService.generateAccessCode() when creating anonymous RIUs
- Ethics portal (Phase 7) can use public endpoints for reporter status check UI
- Access code format validation available via isValidFormat() for client-side checks

---
*Phase: 04-core-entities*
*Completed: 2026-02-03*
