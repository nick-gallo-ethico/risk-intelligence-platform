---
phase: 42-anonymous-communication-relay
plan: 04
subsystem: notifications
tags: [event-listener, delayed-notification, anonymous-communication, bullmq]

# Dependency graph
requires:
  - phase: 42-01
    provides: DelayedNotificationService with queueDelayedNotification method
  - phase: 42-02
    provides: REPORTER_MESSAGE_NOTIFICATION_TEMPLATE constant
provides:
  - CaseMessageSentListener event listener for case.message.sent events
  - Wiring between MessageRelayService and DelayedNotificationService
affects: [42-05, 42-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Event-driven notification dispatch pattern

key-files:
  created:
    - apps/backend/src/modules/notifications/listeners/case-message.listener.ts
  modified:
    - apps/backend/src/modules/notifications/listeners/index.ts
    - apps/backend/src/modules/notifications/notifications.module.ts

key-decisions:
  - "Listener checks autoNotifyOnMessage tenant setting before queuing"
  - "Notification failures are logged but don't crash message send"
  - "Only outbound direction messages trigger reporter notification"

patterns-established:
  - "Privacy-preserving notification: never include message content in email"
  - "Graceful degradation: skip notification if no reporter email"

# Metrics
duration: 12min
completed: 2026-03-02
---

# Phase 42 Plan 04: Notification Delivery Wiring Summary

**Event listener wiring to trigger delayed reporter notifications when investigators send messages**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-02T21:33:28Z
- **Completed:** 2026-03-02T21:45:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created CaseMessageSentListener for case.message.sent events
- Wired listener to DelayedNotificationService for delayed email delivery
- Verified MessageRelayService already emits correct event payload

## Task Commits

Each task was committed atomically:

1. **Task 1: Create case message sent listener for reporter notification** - `c5e21917` (feat)
2. **Task 2: Verify relay service emits case.message.sent event** - N/A (verification only, no code changes needed)

**Plan metadata:** (pending)

## Files Created/Modified

- `apps/backend/src/modules/notifications/listeners/case-message.listener.ts` - Event listener for case.message.sent events, queues delayed notification
- `apps/backend/src/modules/notifications/listeners/index.ts` - Added barrel export for CaseMessageSentListener
- `apps/backend/src/modules/notifications/notifications.module.ts` - Registered CaseMessageSentListener provider

## Decisions Made

- **Listener checks tenant settings:** Respects autoNotifyOnMessage flag before sending
- **Graceful error handling:** Notification failures are caught and logged, don't affect message send
- **Direction filtering:** Only processes outbound (investigator -> reporter) messages
- **No code changes needed for relay service:** Already emits case.message.sent with correct payload

## Deviations from Plan

None - plan executed exactly as written. Task 2 was verification-only as the relay service already emitted the correct event.

## Issues Encountered

- Pre-existing TypeScript errors in messaging.controller.ts and ethics-portal.service.ts (unrelated to this plan)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Notification delivery wiring complete
- Ready for message panel UI integration (plan 42-05)
- CaseMessageSentListener triggers delayed notifications automatically

---

_Phase: 42-anonymous-communication-relay_
_Completed: 2026-03-02_
