---
phase: 42-anonymous-communication-relay
plan: 01
subsystem: notifications
tags: [crypto, randomInt, privacy, delayed-notification, organization-settings]

# Dependency graph
requires:
  - phase: 07-notifications-email
    provides: email queue infrastructure, notification module
  - phase: 20-settings-overhaul
    provides: organization service and settings pattern
provides:
  - DelayedNotificationService with crypto.randomInt for timing attack prevention
  - ReporterVisibilityLevel enum (MINIMAL, STANDARD, DETAILED, TRANSPARENT)
  - Relay settings stored in Organization.settings JSON
  - getRelaySettings() and updateRelaySettings() OrganizationService methods
affects: [42-02, 42-03, 42-04, ethics-portal, messaging]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "crypto.randomInt for secure random delays"
    - "Organization.settings JSON for relay config"

key-files:
  created:
    - apps/backend/src/modules/notifications/services/delayed-notification.service.ts
    - apps/backend/src/modules/notifications/dto/reporter-notification.dto.ts
    - apps/backend/src/modules/organization/dto/relay-settings.dto.ts
  modified:
    - apps/backend/src/modules/notifications/notifications.module.ts
    - apps/backend/src/modules/notifications/services/index.ts
    - apps/backend/src/modules/organization/organization.service.ts
    - apps/backend/src/modules/organization/dto/index.ts

key-decisions:
  - "Use crypto.randomInt instead of Math.random for cryptographically secure delay generation"
  - "Store relay settings in Organization.settings JSON (consistent with existing settings pattern)"
  - "Default visibility level STANDARD - messages visible but no investigator names"
  - "Default notification delay 1-6 hours for timing attack protection"

patterns-established:
  - "DelayedNotification: Queue email jobs with random delay for privacy protection"
  - "ReporterVisibilityLevel: Enum-controlled information disclosure to anonymous reporters"

# Metrics
duration: 22min
completed: 2026-03-02
---

# Phase 42 Plan 01: Delayed Notification Service & Relay Settings Summary

**DelayedNotificationService with crypto.randomInt for 1-6hr random delays, ReporterVisibilityLevel enum with 4 disclosure levels, and Organization.settings-based relay configuration**

## Performance

- **Duration:** 22 min
- **Started:** 2026-03-02T21:06:03Z
- **Completed:** 2026-03-02T21:28:32Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- DelayedNotificationService using Node.js crypto.randomInt for cryptographically secure random delays
- ReporterVisibilityLevel enum controlling information disclosure (MINIMAL, STANDARD, DETAILED, TRANSPARENT)
- OrganizationService getRelaySettings() and updateRelaySettings() for tenant configuration
- Privacy-preserving notification queueing with PII-safe logging (job IDs only)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DelayedNotificationService with random delay** - `014a0b0a` (feat)
2. **Task 2: Create ReporterVisibilityLevel enum and relay settings DTOs** - `7edda34f` (feat, from prior session)
3. **Task 3: Add relay settings to Organization service** - `b1286d1d` (feat)

## Files Created/Modified

- `apps/backend/src/modules/notifications/services/delayed-notification.service.ts` - Random delay notification queueing with crypto.randomInt
- `apps/backend/src/modules/notifications/dto/reporter-notification.dto.ts` - ReporterNotificationData interface
- `apps/backend/src/modules/organization/dto/relay-settings.dto.ts` - ReporterVisibilityLevel enum and settings DTOs
- `apps/backend/src/modules/notifications/notifications.module.ts` - Registered DelayedNotificationService
- `apps/backend/src/modules/notifications/services/index.ts` - Exported new service
- `apps/backend/src/modules/organization/organization.service.ts` - Added getRelaySettings/updateRelaySettings methods
- `apps/backend/src/modules/organization/dto/index.ts` - Exported relay settings DTOs

## Decisions Made

- **crypto.randomInt over Math.random:** Node.js crypto module provides cryptographically secure random numbers essential for timing attack prevention
- **Organization.settings JSON storage:** Consistent with existing SLA config pattern, avoids additional migration
- **Default STANDARD visibility:** Balances reporter information needs with investigator privacy
- **1-6 hour default delay range:** Provides meaningful timing obfuscation without excessive notification latency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Task 2 (ReporterVisibilityLevel enum) was already committed in a prior session as part of 42-02 work; detected and skipped re-committing

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DelayedNotificationService ready for integration with messaging relay
- ReporterVisibilityLevel available for ethics portal display logic
- Organization settings API ready for admin UI in 42-05

---

_Phase: 42-anonymous-communication-relay_
_Completed: 2026-03-02_
