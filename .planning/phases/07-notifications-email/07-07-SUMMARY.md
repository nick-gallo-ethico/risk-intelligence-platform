---
phase: 07-notifications-email
plan: 07
subsystem: notifications
tags: [email, nodemailer, smtp, webhooks, delivery-tracking]
dependency-graph:
  requires: [07-01, 07-02, 07-03, 07-04]
  provides:
    - EmailProcessor with real email sending
    - DeliveryTrackerService for status tracking
    - WebhookController for provider callbacks
  affects: [07-08]
tech-stack:
  added: ["@nestjs-modules/mailer", "nodemailer"]
  patterns: ["webhook-normalization", "delivery-tracking", "exponential-backoff"]
key-files:
  created:
    - apps/backend/src/modules/notifications/mailer.config.ts
  modified:
    - apps/backend/src/modules/jobs/processors/email.processor.ts
    - apps/backend/src/modules/notifications/services/delivery-tracker.service.ts
    - apps/backend/src/modules/notifications/controllers/webhook.controller.ts
    - apps/backend/src/modules/notifications/notifications.module.ts
    - apps/backend/src/modules/jobs/jobs.module.ts
    - apps/backend/prisma/schema.prisma
    - apps/backend/package.json
    - .env.example
decisions:
  - id: "07-07-01"
    choice: "nodemailer via @nestjs-modules/mailer for SMTP transport"
    rationale: "Official NestJS integration, connection pooling, async config support"
  - id: "07-07-02"
    choice: "Webhook normalization pattern for multiple providers"
    rationale: "SendGrid and SES have different payloads - normalize to WebhookEvent"
  - id: "07-07-03"
    choice: "Optional signature verification for webhooks"
    rationale: "Security-conscious but doesn't break dev/staging without keys"
metrics:
  duration: "23 min"
  completed: "2026-02-04"
---

# Phase 7 Plan 07: Email Delivery & Tracking Summary

**One-liner:** Replace email processor placeholder with real nodemailer sending, comprehensive delivery tracking via DeliveryTrackerService, and webhook endpoints for SendGrid/SES callbacks.

## What Was Built

### 1. MailerModule Configuration

Created `mailer.config.ts` with:
- SMTP transport configuration via environment variables
- Connection pooling (5 connections, 100 messages)
- Timeout settings (10s connection, 60s socket)
- Support for Mailhog in dev, SendGrid/SES in production

Key config:
```typescript
transport: {
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
}
```

### 2. DeliveryTrackerService (588 lines)

Comprehensive email delivery status tracking:

| Method | Purpose |
|--------|---------|
| `recordSent(notificationId, messageId)` | Track successful send to provider |
| `recordDelivered(notificationId, messageId)` | Track delivery confirmation |
| `recordBounced(notificationId, messageId, reason, bounceType)` | Track bounce events |
| `recordFailed(notificationId, reason)` | Track send failures |
| `recordPermanentFailure(notificationId, reason)` | Compliance audit logging |
| `processWebhookEvent(event)` | Route webhook events |
| `getDeliveryStatus(notificationId)` | Query single delivery |
| `getFailedDeliveries(organizationId, since)` | Compliance reporting |
| `getDeliveryStats(organizationId, since)` | Dashboard metrics |

Permanent failures logged to AuditLog with NOTIFICATION entity type for compliance audit trail.

### 3. EmailProcessor Replacement (219 lines)

Replaced Phase 1 placeholder with real implementation:

```typescript
async process(job: Job<ProcessedEmailJobData>) {
  // Send via MailerService
  const result = await this.mailerService.sendMail({ to, subject, html });

  // Track delivery status
  await this.deliveryTracker.recordSent(notificationId, result.messageId);

  return { messageId };
}
```

Event handlers:
- `onCompleted`: Log successful delivery
- `onFailed`: Track failure, record permanent failure after max attempts
- `onActive`: Debug logging for retry tracking
- `onStalled`: Warning for stuck jobs

### 4. WebhookController (336 lines)

Two webhook endpoints for email provider callbacks:

**POST /webhooks/email-events** (SendGrid):
- Processes: delivered, bounce, dropped, deferred, open, click, spam_report
- Optional signature verification via HMAC-SHA256
- Rate limited: 100 events/minute

**POST /webhooks/ses-events** (AWS SES via SNS):
- Handles: Bounce, Complaint, Delivery notifications
- SNS subscription confirmation support
- Normalizes SES notification format

Event normalization maps provider-specific payloads to common `WebhookEvent`:
```typescript
interface WebhookEvent {
  eventType: WebhookEventType;
  messageId: string;
  email?: string;
  timestamp: Date;
  reason?: string;
  bounceType?: BounceType;
}
```

## Architecture Decisions

### Decision 07-07-01: nodemailer via @nestjs-modules/mailer

**Choice:** Use @nestjs-modules/mailer wrapper for nodemailer

**Alternatives considered:**
- Direct nodemailer (more control, less integration)
- SendGrid SDK (vendor lock-in)

**Rationale:** Official NestJS integration provides async configuration, dependency injection, and connection pooling out of the box.

### Decision 07-07-02: Webhook normalization pattern

**Choice:** Normalize all provider webhooks to common WebhookEvent format

**Rationale:** Decouples delivery tracking from provider specifics. Adding new providers (Postmark, Mailgun) requires only a new normalization function.

### Decision 07-07-03: Optional signature verification

**Choice:** Verify webhook signatures only when SENDGRID_WEBHOOK_SIGNING_KEY is set

**Rationale:** Enables secure production without breaking development/staging environments that may not have keys configured.

## Technical Notes

### BullMQ Retry Integration

EmailProcessor leverages BullMQ's built-in retry mechanism:
- 3 attempts with exponential backoff (1s, 2s, 4s)
- `recordFailed()` called on each failure
- `recordPermanentFailure()` called only when `attemptsMade >= maxAttempts`

### Circular Dependency Resolution

EmailProcessor uses `forwardRef()` to resolve circular dependency:
```typescript
@Inject(forwardRef(() => DeliveryTrackerService))
private readonly deliveryTracker: DeliveryTrackerService,
```

JobsModule imports NotificationsModule via forwardRef for MailerService and DeliveryTrackerService access.

### Audit Logging for Compliance

Permanent failures create AuditLog entries with:
- Entity type: NOTIFICATION (new enum value)
- Action: email.permanent_failure
- Description: Natural language failure description
- Changes: Structured failure details

## Environment Variables

New/updated variables in .env.example:

```env
# SMTP Configuration
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@ethico.local

# Webhook Security (optional)
# SENDGRID_WEBHOOK_SIGNING_KEY=your-key
# SES_WEBHOOK_VERIFY=false
```

## Commits

| Hash | Description |
|------|-------------|
| 510b053 | feat(07-07): install nodemailer and configure MailerModule |
| 72d126a | feat(07-07): create DeliveryTrackerService for email delivery tracking |
| d477618 | feat(07-07): replace EmailProcessor placeholder and add WebhookController |

## Verification Checklist

- [x] MailerModule configured with SMTP transport
- [x] EmailProcessor sends real emails via nodemailer
- [x] Failed sends retry via BullMQ exponential backoff
- [x] Permanent failures logged after all retries exhausted
- [x] Webhook endpoint receives SendGrid delivery events
- [x] Webhook endpoint receives SES delivery events
- [x] Delivery status stored in NotificationDelivery model
- [x] TypeScript compiles without errors

## Next Phase Readiness

**07-08 Dependencies Met:**
- DeliveryTrackerService exported for status queries
- Webhook endpoints ready for production provider configuration
- Email sending fully functional for notification delivery

**Outstanding Items:**
- Production SMTP credentials need configuration
- SendGrid/SES webhook URLs need registration
- Prisma migration needed for NOTIFICATION enum (run `prisma migrate dev`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added NOTIFICATION to AuditEntityType enum**
- **Found during:** Task 2 - DeliveryTrackerService creation
- **Issue:** AuditLog.entityType didn't include NOTIFICATION
- **Fix:** Added NOTIFICATION to AuditEntityType enum in schema.prisma
- **Files modified:** apps/backend/prisma/schema.prisma
- **Commit:** 72d126a

**2. [Rule 3 - Blocking] Added MailerModule export**
- **Found during:** Task 3 - EmailProcessor creation
- **Issue:** EmailProcessor needed MailerService from NotificationsModule
- **Fix:** Export MailerModule from NotificationsModule, import NotificationsModule in JobsModule
- **Files modified:** notifications.module.ts, jobs.module.ts
- **Commit:** 510b053, d477618
