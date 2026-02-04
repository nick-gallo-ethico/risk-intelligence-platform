---
phase: 07-notifications-email
plan: 06
subsystem: notifications
tags: [digest, scheduling, email-batching, cron]
requires: ["07-04"]
provides:
  - DigestService with hourly scheduler
  - Smart notification aggregation
  - Daily digest email template
affects: ["07-07", "07-08"]
tech-stack:
  added: ["@nestjs/schedule"]
  patterns: ["cron-scheduling", "notification-batching", "smart-aggregation"]
key-files:
  created:
    - apps/backend/src/modules/notifications/services/digest.service.ts
    - apps/backend/src/modules/notifications/templates/digest/daily-digest.mjml.hbs
  modified:
    - apps/backend/src/modules/notifications/notifications.module.ts
    - apps/backend/src/modules/notifications/services/index.ts
    - apps/backend/src/modules/notifications/templates/_subjects.json
    - apps/backend/src/modules/notifications/services/delivery-tracker.service.ts
decisions:
  - key: hourly-cron-pattern
    value: "Every hour on the hour, check each org's digest time"
    rationale: "Simpler than per-org scheduling, minimal overhead with groupBy query"
  - key: smart-aggregation
    value: "Group by type + entityType + entityId for deduplication"
    rationale: "Prevents '5 comments' showing as 5 separate items"
  - key: digest-priority
    value: "Priority 3 (lower than urgent notifications)"
    rationale: "Digests are not time-sensitive, shouldn't block urgent emails"
metrics:
  duration: 19 min
  completed: 2026-02-04
---

# Phase 07 Plan 06: Daily Digest Service Summary

DigestService with hourly scheduling and smart aggregation for batching low-priority notifications into daily digest emails.

## What Was Built

### DigestService (615 lines)
Core digest compilation service with scheduling:

- **queueItem()**: Add notification to digest queue
- **processDigestsHourly()**: Cron job running every hour on the hour
- **processOrgDigest()**: Process all users in an organization
- **compileDigest()**: Aggregate and format notifications
- **sendDigest()**: Render template and queue email

### Smart Aggregation
Groups similar notifications to prevent inbox clutter:

```typescript
// Before aggregation: 5 separate notifications
// After aggregation: "3 new comments on Case #CASE-2026-00123"

const groups = groupItems(items);  // Groups by type + entityType + entityId
for (const group of groups) {
  group.summary = getDigestSummary(group);  // Human-readable summary
  group.entityReference = await getEntityReference(...)  // Case/Investigation ref
}
```

### Hourly Scheduler Pattern
```typescript
@Cron(CronExpression.EVERY_HOUR)
async processDigestsHourly(): Promise<void> {
  // Get all orgs with pending items
  const orgsWithPending = await this.prisma.digestQueue.groupBy({
    by: ['organizationId'],
    where: { processed: false },
  });

  // Check each org's configured digest time
  for (const { organizationId } of orgsWithPending) {
    const settings = await this.orgSettingsService.getSettings(organizationId);
    if (digestHour === currentHour) {
      await this.processOrgDigest(organizationId);
    }
  }
}
```

### Daily Digest Template
MJML template with grouped notifications:

- Header with date and count
- Grouped items with icons by type (comment, status, completion)
- Entity links for quick navigation
- "View All Notifications" CTA
- Preference management link in footer

## Key Design Decisions

### 1. Hourly Cron vs Per-Org Scheduling
**Decision**: Single hourly cron that checks all orgs
**Rationale**: Simpler architecture, no need for dynamic scheduling per tenant. The groupBy query is efficient and only processes orgs with pending items.

### 2. Smart Aggregation by Entity
**Decision**: Group by `type + entityType + entityId`
**Rationale**: Users care about "what entity had activity" not individual events. "3 comments on Case #X" is more useful than three separate notifications.

### 3. Preference-Aware Processing
**Decision**: Check `isDigestEnabledForUser()` before compiling
**Rationale**: Don't waste resources compiling digests for users who have email disabled. Items still get marked processed to prevent queue buildup.

### 4. Lower Priority Queue
**Decision**: Priority 3 for digest emails (vs 1-2 for urgent)
**Rationale**: Digests are batch summaries, not time-sensitive. Should never block SLA breach or assignment notifications.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] AuditEntityType import in DeliveryTrackerService**
- **Found during**: Task 2 compilation
- **Issue**: `entityType: 'NOTIFICATION'` used string literal instead of Prisma enum
- **Fix**: Import `AuditEntityType, AuditActionCategory, ActorType` from `@prisma/client`
- **Files modified**: delivery-tracker.service.ts
- **Commit**: 9845228

**2. [Rule 1 - Bug] Investigation reference lookup**
- **Found during**: Task 2 implementation
- **Issue**: Investigation model doesn't have `referenceNumber` field
- **Fix**: Query `investigationNumber` and related case's `referenceNumber`
- **Files modified**: digest.service.ts
- **Commit**: 9845228

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `services/digest.service.ts` | Created | 615 |
| `templates/digest/daily-digest.mjml.hbs` | Created | 109 |
| `templates/_subjects.json` | Modified | +1 |
| `services/index.ts` | Modified | +10 |
| `notifications.module.ts` | Modified | +6 |
| `services/delivery-tracker.service.ts` | Modified | +8 |

## Integration Points

### Input Events
- **notify()** in NotificationService routes to digest for non-urgent categories
- **queueForDigest()** accepts direct queuing from other services

### Output Events
- **email.permanent_failure** emitted for monitoring (via DeliveryTrackerService)
- Digest emails queued to EMAIL_QUEUE with priority 3

### Dependencies Used
- `@nestjs/schedule`: Cron scheduling for hourly processing
- `PreferenceService`: Check user digest preferences
- `OrgNotificationSettingsService`: Get org digest time
- `EmailTemplateService`: Render digest email
- `EMAIL_QUEUE_NAME`: Queue for email delivery

## Verification Results

- [x] DigestQueueItem model stores pending notifications (from 07-04)
- [x] Hourly scheduler checks each org's digest time
- [x] Smart aggregation groups similar events
- [x] Respects user preferences (only digest-enabled users receive)
- [x] Template shows grouped notifications with action links
- [x] Items marked as processed after digest sent
- [x] TypeScript compiles without errors
- [x] Prisma schema valid
- [x] DigestService > 150 lines (615 lines)
- [x] Template contains `<mj-section>`

## Next Phase Readiness

Ready for:
- **07-07**: DeliveryTrackerService (partially exists, needs WebhookController)
- **07-08**: NotificationController and PreferenceController

## Commits

| Hash | Description |
|------|-------------|
| 9845228 | feat(07-06): add DigestService with hourly scheduler |
| 25f6b50 | feat(07-06): add daily digest email template |
