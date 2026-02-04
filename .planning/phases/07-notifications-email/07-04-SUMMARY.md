---
phase: 07-notifications-email
plan: 04
subsystem: notifications
tags: [notifications, events, email, in-app, sla, workflow]

dependency-graph:
  requires: [07-01, 07-02, 07-03]
  provides: [NotificationService, event-listeners, sla-events]
  affects: [07-05, 07-06, 07-07, 07-08]

tech-stack:
  added: []
  patterns: [event-driven-dispatch, preference-aware-routing, digest-batching]

key-files:
  created:
    - apps/backend/src/modules/notifications/services/notification.service.ts
    - apps/backend/src/modules/notifications/listeners/case.listener.ts
    - apps/backend/src/modules/notifications/listeners/sla.listener.ts
    - apps/backend/src/modules/notifications/listeners/workflow.listener.ts
    - apps/backend/src/modules/notifications/listeners/index.ts
    - apps/backend/src/modules/events/events/sla.events.ts
  modified:
    - apps/backend/src/modules/events/events/index.ts
    - apps/backend/src/modules/notifications/notifications.module.ts
    - apps/backend/src/modules/notifications/entities/notification.types.ts
    - apps/backend/src/modules/notifications/services/index.ts
    - apps/backend/prisma/schema.prisma

decisions:
  - key: escalation-category
    choice: Added ESCALATION to NotificationCategory
    why: SLA breaches need distinct category for enforcement and routing

metrics:
  duration: 12 min
  completed: 2026-02-04
---

# Phase 7 Plan 4: NotificationService & Event Listeners Summary

**One-liner:** Central notification dispatch with event-driven listeners for case, SLA, and workflow events.

## What Was Built

### NotificationService Core (Task 1)
Central service for all notification dispatch with 7 key methods:

| Method | Purpose |
|--------|---------|
| `queueEmail()` | Queue email with pre-rendered template |
| `sendInApp()` | Send immediate in-app notification |
| `queueForDigest()` | Queue for daily digest batch |
| `notify()` | High-level dispatch checking preferences |
| `getNotifications()` | Paginated notification query |
| `markAsRead()` | Update read status with event emit |
| `archiveRead()` | Archive old read notifications |

Key features:
- Checks user preferences before sending
- Handles OOO backup delegation for urgent notifications
- Respects quiet hours (urgent notifications bypass)
- Pre-renders email templates before queueing (per RESEARCH.md pitfall)
- Emits events for WebSocket delivery integration

### Event Listeners (Task 2)

**CaseEventListener:**
- `case.assigned` -> Urgent notification to new assignee
- `case.status_changed` -> Queued for daily digest

**SlaEventListener:**
- `sla.warning` -> Urgent notification to assignee
- `sla.breached` -> Urgent to assignee + supervisor
- `sla.critical` -> Escalation to compliance officer + assignee

**WorkflowEventListener:**
- `workflow.step_completed` -> Notify next assignee
- `workflow.approval_needed` -> Urgent to approver
- `workflow.approval_granted` -> In-app to requester
- `workflow.approval_rejected` -> Both email and in-app

All listeners use `{ async: true }` per RESEARCH.md to prevent blocking.

### SLA Events (Task 3)

New event types in `apps/backend/src/modules/events/events/sla.events.ts`:
- `SlaWarningEvent` - Approaching deadline (72h, 24h thresholds)
- `SlaBreachedEvent` - Past deadline with supervisor escalation
- `SlaCriticalEvent` - 48h+ overdue with compliance escalation

### Schema Addition

**DigestQueue model** for batching low-priority notifications:
```prisma
model DigestQueue {
  id             String @id
  organizationId String
  userId         String
  type           String
  entityType     String?
  entityId       String?
  metadata       Json
  processed      Boolean @default(false)
  processedAt    DateTime?
  createdAt      DateTime
}
```

## Technical Details

### Notification Flow

```
Domain Event (case.assigned)
      |
      v
Event Listener (@OnEvent, async: true)
      |
      v
NotificationService.notify()
      |
      +---> Check preferences (PreferenceService)
      |     - OOO backup delegation
      |     - Quiet hours check
      |     - Org enforcement
      |
      +---> Route by urgency
            |
            +---> URGENT: queueEmail() + sendInApp()
            |           - Pre-render template
            |           - Create Notification record
            |           - Queue BullMQ job
            |
            +---> NOT URGENT: queueForDigest()
                              - Store in DigestQueue
                              - Process by DigestService (07-06)
```

### Category Updates

Added ESCALATION to notification categories:
- Added to `NotificationCategory` type
- Added to `DEFAULT_PREFERENCES` with email=true, inApp=true
- Added to `REAL_TIME_CATEGORIES` (never batched)

## Verification

All checks pass:
- TypeScript compiles without errors
- All event listeners use `{ async: true }`
- SLA events exported from events module
- All listeners registered in NotificationsModule
- NotificationService has required methods (665 lines)
- CaseEventListener created (91 lines)

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Description |
|------|-------------|
| `6cfb236` | NotificationService core with queueEmail, sendInApp, queueForDigest |
| `0323dfe` | Event listeners for case, SLA, and workflow events |
| `05df9d4` | SLA events and NotificationsModule update |

## Next Phase Readiness

**Ready for 07-05 (In-App Notifications):**
- NotificationService.sendInApp() emits `notification.in_app.created` event
- Gateway can subscribe to this event for WebSocket delivery
- Unread count events emitted on markAsRead()

**Ready for 07-06 (Digest Service):**
- DigestQueue model in schema
- queueForDigest() method populates queue
- Metadata stored for digest compilation

**Ready for 07-07 (Delivery Tracking):**
- Notification records created with QUEUED status
- notificationId passed in email job data
- NotificationDelivery model ready for tracking
