---
phase: 07-notifications-email
plan: 01
subsystem: notifications
tags: [prisma, types, module-skeleton, notifications, email]
dependency-graph:
  requires: [01-foundation-infrastructure]
  provides: [Notification, NotificationDelivery, NotificationPreference, OrgNotificationSettings, NotificationsModule]
  affects: [07-02, 07-03, 07-04, 07-05, 07-06, 07-07, 07-08]
tech-stack:
  added: []
  patterns: [const-enum-pattern, barrel-exports]
key-files:
  created:
    - apps/backend/prisma/schema.prisma (models added)
    - apps/backend/src/modules/notifications/entities/notification.types.ts
    - apps/backend/src/modules/notifications/dto/notification.dto.ts
    - apps/backend/src/modules/notifications/notifications.module.ts
    - apps/backend/src/modules/notifications/index.ts
  modified:
    - apps/backend/src/modules/jobs/types/job-data.types.ts
decisions:
  - id: notif-enum-pattern
    choice: const-enum-pattern
    rationale: Define enums as const objects to avoid Prisma client dependency during TypeScript compilation
metrics:
  duration: 16 min
  completed: 2026-02-04
---

# Phase 7 Plan 1: Notification Database Schema & Types Summary

**One-liner:** Prisma models for notifications (Notification, NotificationDelivery, NotificationPreference, OrgNotificationSettings), TypeScript enums/interfaces, DTOs, and skeleton NotificationsModule.

## What Was Built

### Prisma Models
1. **Notification** - Core notification record
   - Supports EMAIL and IN_APP channels
   - 10 notification types: ASSIGNMENT, DEADLINE, APPROVAL, MENTION, INTERVIEW, STATUS_UPDATE, COMMENT, COMPLETION, ESCALATION, DIGEST
   - Entity navigation via entityType/entityId
   - Read tracking for in-app notifications

2. **NotificationDelivery** - Email delivery tracking
   - One-to-one with Notification (for EMAIL channel)
   - Tracks messageId, status, attempts, errors
   - Delivery statuses: PENDING, SENT, DELIVERED, BOUNCED, FAILED, DEFERRED

3. **NotificationPreference** - User preferences
   - JSON preferences field for per-category settings
   - Quiet hours (start/end times with timezone)
   - OOO handling (backup user, OOO until date)
   - One preference record per user

4. **OrgNotificationSettings** - Organization defaults
   - Enforced categories (users cannot disable)
   - Default quiet hours
   - Digest time configuration

### TypeScript Types
- Enums defined as const objects (NotificationChannel, NotificationType, NotificationStatus, DeliveryStatus)
- NotificationCategory type for user-facing categories
- PreferenceSettings interface for JSON structure
- DEFAULT_PREFERENCES with balanced defaults per CONTEXT.md
- REAL_TIME_CATEGORIES and DIGEST_CATEGORIES arrays
- Service interfaces: QueueEmailParams, SendInAppParams, InAppNotification

### DTOs
- CreateNotificationDto
- UpdatePreferencesDto
- NotificationQueryDto
- MarkReadDto, ArchiveNotificationsDto
- UpdateOrgNotificationSettingsDto
- Response DTOs for API endpoints

### Module Structure
- NotificationsModule with PrismaModule and BullModule imports
- Barrel export (index.ts) for all types and DTOs
- Service placeholders documented for 07-02 through 07-07

## Commits

| Hash | Description |
|------|-------------|
| c9a0829 | add Prisma models for notification system |
| 3722438 | add TypeScript types and DTOs for notifications |
| a33396d | create skeleton NotificationsModule |

## Key Files

```
apps/backend/prisma/schema.prisma          # Notification models (4) and enums (4)
apps/backend/src/modules/notifications/
  entities/notification.types.ts           # Enums, interfaces, defaults
  dto/notification.dto.ts                  # API DTOs with validation
  notifications.module.ts                  # Module skeleton
  index.ts                                 # Barrel exports
apps/backend/src/modules/jobs/types/
  job-data.types.ts                        # Extended EmailJobData
```

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Enum pattern | const objects instead of Prisma re-exports | Avoids compilation errors when Prisma client not generated; provides same type safety |
| Default preferences | Per CONTEXT.md balanced defaults | Urgent events (assignments, deadlines, mentions, approvals, interviews) get email+inApp; FYI events (status, comments, completions) get inApp only |

## Next Phase Readiness

**Ready for 07-02 through 07-08:**
- All models defined and validated
- Types exported via barrel file
- Module skeleton ready for service injection
- EmailJobData extended for delivery tracking

**Dependencies resolved:**
- PrismaModule available
- BullModule registered for email queue
- Organization and User relations added
