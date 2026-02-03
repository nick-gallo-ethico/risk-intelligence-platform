---
phase: 06-case-management
plan: 09
subsystem: messaging
tags: [pii-detection, relay, anonymous-messaging, access-code, chinese-wall]

# Dependency graph
requires:
  - phase: 04-core-entities
    provides: CaseMessage model, RIU access codes
  - phase: 01-foundation
    provides: Email queue infrastructure
provides:
  - Identity-protecting message relay service
  - PII detection for content scanning
  - Authenticated messaging endpoints for investigators
  - Public messaging endpoints for anonymous reporters
affects: [06-case-management, investigation-workflow, reporter-communication]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Chinese Wall model for identity protection
    - Regex-based PII detection with categorized warnings
    - Access code authorization for public endpoints
    - Separate read status tracking per viewer type

key-files:
  created:
    - apps/backend/src/modules/messaging/pii-detection.service.ts
    - apps/backend/src/modules/messaging/relay.service.ts
    - apps/backend/src/modules/messaging/messaging.controller.ts
    - apps/backend/src/modules/messaging/messaging.module.ts
    - apps/backend/src/modules/messaging/dto/index.ts
    - apps/backend/src/modules/messaging/index.ts
  modified:
    - apps/backend/src/app.module.ts

key-decisions:
  - "PII detection warns but doesn't block - investigator can acknowledge and send"
  - "Reporter notifications don't include message content - only status check link"
  - "Outbound messages marked as read when reporter retrieves (not when sent)"
  - "Inbound messages marked as read when investigator retrieves"

patterns-established:
  - "Chinese Wall pattern: Reporter contact info on RIU only accessed for notification, never exposed to investigator"
  - "Dual read tracking: Each direction has separate read status tracking for appropriate viewer"
  - "Access code as authorization: Public endpoints use access code instead of JWT auth"

# Metrics
duration: 17min
completed: 2026-02-03
---

# Phase 6 Plan 9: Anonymous Messaging Relay Summary

**Identity-protecting message relay with PII detection for two-way anonymous reporter communication**

## Performance

- **Duration:** 17 min
- **Started:** 2026-02-03T23:27:17Z
- **Completed:** 2026-02-03T23:44:34Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- PII detection service identifies 9 types of PII (email, phone, SSN, credit cards, addresses, etc.)
- Message relay service implements Chinese Wall model protecting reporter identity
- Authenticated endpoints for investigators with PII pre-send warnings
- Public endpoints for anonymous reporters via access code authorization
- Separate read status tracking for investigator vs reporter views

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PII Detection Service** - `583d03f` (feat)
2. **Task 2: Create Message Relay Service** - `4435df9` (feat)
3. **Task 3: Create Messaging Controller and Module** - `243f2c7` (feat)

## Files Created/Modified

- `apps/backend/src/modules/messaging/pii-detection.service.ts` - PII pattern detection with 9 PII types
- `apps/backend/src/modules/messaging/relay.service.ts` - Identity-protecting message relay
- `apps/backend/src/modules/messaging/messaging.controller.ts` - Authenticated and public endpoints
- `apps/backend/src/modules/messaging/messaging.module.ts` - Module wiring with email queue
- `apps/backend/src/modules/messaging/dto/index.ts` - DTOs for messaging API
- `apps/backend/src/modules/messaging/index.ts` - Barrel export
- `apps/backend/src/app.module.ts` - Added MessagingModule import

## Decisions Made

1. **PII Detection Approach:** Regex-based detection with categorized warnings. Investigator receives warnings but can acknowledge and send - we inform, not block.

2. **Read Status Tracking:** Separate tracking per viewer type:
   - Outbound messages (TO reporter) marked read when reporter retrieves
   - Inbound messages (FROM reporter) marked read when investigator retrieves

3. **Reporter Notification Privacy:** Email notifications to reporters contain only a status check link, never message content. Content visible only via access code portal.

4. **Chinese Wall Enforcement:** Reporter contact info (email, phone) stored on RIU. MessageRelayService accesses this only for notification queuing, never exposes to investigator-facing responses.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **Import path mismatch:** Controller initially imported JwtAuthGuard from auth/guards but it was in common/guards. Fixed import paths.

2. **Pre-existing build errors:** Remediation module has unrelated TypeScript errors that pre-date this plan. Messaging module files compile correctly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Messaging infrastructure complete for case communication
- PII detection available for use in other modules (exported from MessagingModule)
- Ready for investigation workflow integration
- Email templates for reporter notifications need to be created (tracked separately)

---
*Phase: 06-case-management*
*Completed: 2026-02-03*
