---
phase: 42-anonymous-communication-relay
plan: 05
subsystem: messaging
tags: [visibility-filtering, anonymous-relay, privacy, dto, nestjs]

# Dependency graph
requires:
  - phase: 42-01
    provides: RelaySettingsDto, ReporterVisibilityLevel enum, OrganizationService.getRelaySettings()
provides:
  - VisibilityFilteredMessageDto for message views
  - VisibilityFilteredStatusDto for status views
  - Visibility filtering in getMessagesForReporter()
  - getStatusForReporter() with visibility-aware status
affects: [ethics-portal, public-messaging, reporter-experience]

# Tech tracking
tech-stack:
  added: []
  patterns: [visibility-level-switch-pattern, conditional-field-exposure]

key-files:
  created:
    - apps/backend/src/modules/messaging/dto/visibility-filtered-message.dto.ts
  modified:
    - apps/backend/src/modules/messaging/relay.service.ts
    - apps/backend/src/modules/messaging/messaging.module.ts
    - apps/backend/src/modules/messaging/messaging.controller.ts
    - apps/backend/src/modules/rius/riu-access.service.ts
    - apps/backend/src/modules/rius/rius.module.ts
    - apps/backend/src/modules/portals/ethics/ethics-portal.service.ts

key-decisions:
  - "STANDARD level returns 'read' string for readAt, DETAILED+ returns Date"
  - "TRANSPARENT level only shows investigator first name for outbound messages"
  - "Use separate query for case association to avoid TypeScript inference issues"

patterns-established:
  - "Visibility filtering pattern: switch on ReporterVisibilityLevel, progressively add fields"
  - "readAt dual format: string 'read' for STANDARD, Date for DETAILED+"

# Metrics
duration: 36min
completed: 2026-03-02
---

# Phase 42 Plan 05: Visibility Level Filtering Summary

**Visibility-filtered message and status DTOs with MINIMAL/STANDARD/DETAILED/TRANSPARENT level support for reporter views**

## Performance

- **Duration:** 36 min
- **Started:** 2026-03-02T21:32:05Z
- **Completed:** 2026-03-02T22:08:15Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Created VisibilityFilteredMessageDto and VisibilityFilteredStatusDto with level-specific optional fields
- Updated getMessagesForReporter() to apply visibility filtering based on organization settings
- Added getStatusForReporter() method for visibility-filtered case status
- MINIMAL level shows only content/direction, TRANSPARENT shows investigator first name

## Task Commits

Each task was committed atomically:

1. **Task 1: Create visibility-filtered message DTO** - `ed8aac7f` (feat)
2. **Task 2: Add visibility filtering to relay service** - `fab49dd1` (feat)
3. **Task 3: Add visibility filtering to status endpoint** - `46179b10` (feat)

## Files Created/Modified

- `apps/backend/src/modules/messaging/dto/visibility-filtered-message.dto.ts` - DTO with level-specific fields
- `apps/backend/src/modules/messaging/relay.service.ts` - filterMessageByVisibility() method
- `apps/backend/src/modules/messaging/messaging.module.ts` - Import OrganizationModule
- `apps/backend/src/modules/messaging/messaging.controller.ts` - Updated return types
- `apps/backend/src/modules/rius/riu-access.service.ts` - getStatusForReporter() method
- `apps/backend/src/modules/rius/rius.module.ts` - Import OrganizationModule
- `apps/backend/src/modules/portals/ethics/ethics-portal.service.ts` - Handle string/Date readAt conversion

## Decisions Made

- **readAt dual format:** STANDARD returns "read" string, DETAILED+ returns Date object. Ethics portal service handles conversion.
- **investigator name exposure:** Only for OUTBOUND messages (from investigator to reporter) at TRANSPARENT level
- **separate queries:** Used separate query for case association to resolve TypeScript type inference issues with nested includes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript inference with nested Prisma includes**

- **Found during:** Task 3 (Status endpoint filtering)
- **Issue:** TypeScript couldn't infer caseAssociations type with nested include/select mix
- **Fix:** Refactored to use separate query for RIU and RiuCaseAssociation
- **Files modified:** apps/backend/src/modules/rius/riu-access.service.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** 46179b10 (Task 3 commit)

**2. [Rule 1 - Bug] Fixed invalid InvestigationStatus enum value**

- **Found during:** Task 3 (Status endpoint filtering)
- **Issue:** Plan referenced "ACTIVE" status which doesn't exist in InvestigationStatus enum
- **Fix:** Changed to query for investigations NOT in ["CLOSED", "ON_HOLD"]
- **Files modified:** apps/backend/src/modules/rius/riu-access.service.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** 46179b10 (Task 3 commit)

**3. [Rule 3 - Blocking] Fixed ethics portal service type mismatch**

- **Found during:** Task 2 (Relay service update)
- **Issue:** Message interface expects readAt: Date|null but VisibilityFilteredMessageDto returns string|Date|null
- **Fix:** Added conversion logic in ethics portal service to handle string "read" value
- **Files modified:** apps/backend/src/modules/portals/ethics/ethics-portal.service.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** fab49dd1 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes necessary for TypeScript compilation. No scope creep.

## Issues Encountered

None beyond auto-fixed deviations.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Visibility filtering foundation complete for both messages and status
- Ready for plan 42-06 to add frontend visibility-aware components
- Ethics portal service updated to handle new DTO format

---

_Phase: 42-anonymous-communication-relay_
_Plan: 05_
_Completed: 2026-03-02_
