# Phase 42: Anonymous Communication Relay - Research

**Researched:** 2026-02-28
**Domain:** Anonymous whistleblower communication, Chinese Wall relay, timing attack prevention
**Confidence:** HIGH

## Summary

Phase 42 implements two-way anonymous communication between investigators and reporters via a Chinese Wall relay. Research reveals that **significant infrastructure already exists** in the codebase:

- **PiiDetectionService** - Full PII detection with detect(), sanitize(), and containsType() methods
- **MessageRelayService** - Complete relay implementation with CaseMessage, PII warnings, audit logging
- **RiuAccessService** - Access code generation and validation (12-char alphanumeric)
- **Ethics Portal UI** - MessageThread and MessageComposer components exist
- **BullMQ infrastructure** - Email queue with delayed job support

The primary work is **enhancing existing infrastructure**, not building from scratch:

1. Add delayed notification batching (1-6hr random delay) for timing attack prevention
2. Add ReporterVisibilityLevel tenant configuration
3. Send access code email on RIU creation (new template)
4. Extend ethics portal with messaging UI (components exist, need integration)
5. Add investigator message composition UI in case detail

**Primary recommendation:** Leverage existing MessageRelayService and PiiDetectionService; focus new work on delayed notification batching, tenant config, and UI integration.

## Standard Stack

The established libraries/tools for this domain (all already in use):

### Core

| Library                | Version | Purpose                     | Why Standard                                                  |
| ---------------------- | ------- | --------------------------- | ------------------------------------------------------------- |
| BullMQ                 | 5.x     | Job queue with delayed jobs | Already in use for email queue, supports `delay` option in ms |
| nanoid                 | 5.x     | Access code generation      | Already used with custom alphabet (customAlphabet)            |
| @nestjs-modules/mailer | 2.x     | Email delivery              | Already configured with SMTP transport                        |
| class-validator        | 0.14.x  | DTO validation              | Standard NestJS validation                                    |

### Supporting

| Library               | Version  | Purpose                    | When to Use                        |
| --------------------- | -------- | -------------------------- | ---------------------------------- |
| handlebars            | 4.x      | Email templates (via MJML) | All email templates use .mjml.hbs  |
| @nestjs/event-emitter | 2.x      | Internal events            | Event-driven notification triggers |
| crypto                | built-in | Cryptographic randomness   | Delay jitter generation            |

### Alternatives Considered

| Instead of   | Could Use          | Tradeoff                                                                 |
| ------------ | ------------------ | ------------------------------------------------------------------------ |
| BullMQ delay | setTimeout         | BullMQ persists through restarts, setTimeout doesn't                     |
| Custom PII   | Microsoft Presidio | Existing regex-based solution is sufficient, Presidio adds ML complexity |

**No additional npm install needed** - all libraries already present.

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/modules/
├── messaging/                      # EXISTING - enhance
│   ├── pii-detection.service.ts    # EXISTS - full PII detection
│   ├── relay.service.ts            # EXISTS - relay logic
│   ├── messaging.controller.ts     # EXISTS - endpoints
│   └── dto/                        # EXTEND - visibility level types
├── rius/                           # EXISTING - enhance
│   ├── riu-access.service.ts       # EXISTS - access code generation
│   └── events/                     # NEW - access code email event
├── notifications/                  # EXISTING - enhance
│   ├── services/
│   │   └── delayed-notification.service.ts  # NEW - batching logic
│   ├── templates/
│   │   └── reporter/
│   │       ├── access-code.mjml.hbs         # NEW
│   │       └── message-notification.mjml.hbs # NEW
│   └── listeners/
│       └── riu.listener.ts                  # NEW - access code email trigger
├── organization/                   # EXISTING - enhance
│   └── dto/
│       └── organization-settings.dto.ts    # EXTEND - add visibility level
└── jobs/
    └── types/
        └── job-data.types.ts               # EXTEND - delayed notification type

apps/frontend/src/
├── components/
│   ├── ethics/
│   │   ├── message-thread.tsx      # EXISTS - reusable
│   │   └── message-composer.tsx    # EXISTS - reusable
│   └── cases/
│       └── case-messaging/         # NEW
│           └── investigator-composer.tsx   # NEW
├── app/(authenticated)/
│   └── settings/
│       └── organization/
│           └── reporter-visibility.tsx     # NEW - admin config
└── app/ethics/[tenant]/
    └── status/[code]/
        └── page.tsx                # EXISTS - integrate messaging
```

### Pattern 1: Delayed Notification Batching

**What:** Random 1-6 hour delay before sending reporter notifications to prevent timing correlation attacks
**When to use:** Any email to anonymous reporter that could leak timing information
**Example:**

```typescript
// Source: BullMQ docs + codebase pattern
import { Queue } from "bullmq";
import { randomInt } from "crypto";

// Generate random delay between 1-6 hours (in milliseconds)
function getRandomDelay(): number {
  const minDelay = 1 * 60 * 60 * 1000; // 1 hour
  const maxDelay = 6 * 60 * 60 * 1000; // 6 hours
  return randomInt(minDelay, maxDelay);
}

// Queue with delay
await this.emailQueue.add("reporter-notification", jobData, {
  delay: getRandomDelay(),
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
});
```

### Pattern 2: Reporter Visibility Levels

**What:** Tenant-configurable levels of information shown to reporters
**When to use:** Status page, message content filtering, case information exposure
**Example:**

```typescript
// Source: Codebase organization settings pattern
export enum ReporterVisibilityLevel {
  MINIMAL = "MINIMAL", // Status only: "In Progress", no details
  STANDARD = "STANDARD", // Status + messages, no investigator names
  DETAILED = "DETAILED", // Status + messages + estimated timeline
  TRANSPARENT = "TRANSPARENT", // Full status with investigator first name
}

interface RelaySettings {
  reporterVisibilityLevel: ReporterVisibilityLevel;
  enableMessaging: boolean; // Toggle two-way messaging
  autoNotifyOnMessage: boolean; // Email reporter when new message
  notificationDelayMinHours: number; // Default: 1
  notificationDelayMaxHours: number; // Default: 6
}
```

### Pattern 3: PII Detection with Warning Flow

**What:** Detect PII in investigator messages, warn before sending, require acknowledgment
**When to use:** All investigator-to-reporter messages
**Example:**

```typescript
// Source: apps/backend/src/modules/messaging/relay.service.ts (existing)
async sendToReporter(dto: SendToReporterDto, userId: string, orgId: string) {
  // Check for PII if not explicitly skipped
  if (!dto.skipPiiCheck) {
    const piiResult = this.piiDetectionService.detect(dto.content);
    if (piiResult.hasPii) {
      if (!dto.acknowledgedPiiWarnings?.length) {
        throw new BadRequestException({
          message: 'Message contains potentially identifying information',
          hasPii: true,
          warnings: piiResult.warnings,
          requiresAcknowledgment: true,
        });
      }
    }
  }
  // ... continue with send
}
```

### Pattern 4: Access Code Email on RIU Creation

**What:** Automatically email access code when RIU created with reporter email
**When to use:** Ethics portal submissions, hotline intakes with email
**Example:**

```typescript
// Source: Event listener pattern from codebase
@OnEvent('riu.created')
async handleRiuCreated(event: RiuCreatedEvent) {
  if (!event.reporterEmail || !event.anonymousAccessCode) {
    return; // No email to send
  }

  // Queue with random delay to prevent timing attacks
  await this.delayedNotificationService.queueAccessCodeEmail({
    organizationId: event.organizationId,
    to: event.reporterEmail,
    accessCode: event.anonymousAccessCode,
    referenceNumber: event.referenceNumber,
    portalUrl: event.portalUrl,
  });
}
```

### Anti-Patterns to Avoid

- **Immediate notification delivery:** NEVER send reporter notifications immediately - always use random delay
- **Exposing investigator identity:** NEVER include investigator name, email, or phone in messages to anonymous reporters
- **Logging reporter email in message context:** NEVER include PII in audit logs
- **Blocking on PII detection:** WARN but don't block - investigator can acknowledge and proceed

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                | Don't Build      | Use Instead                             | Why                                         |
| ---------------------- | ---------------- | --------------------------------------- | ------------------------------------------- |
| PII Detection          | Regex patterns   | `PiiDetectionService`                   | Already handles email, phone, SSN, IP, etc. |
| Access Code Generation | Random strings   | `RiuAccessService.generateAccessCode()` | Handles uniqueness, avoids confusing chars  |
| Email Templating       | HTML strings     | MJML templates in `/templates/`         | Consistent branding, responsive design      |
| Job Scheduling         | setTimeout/cron  | BullMQ `delay` option                   | Persists through restarts, built-in retry   |
| Message Threading      | Custom component | `MessageThread` component               | Already handles read receipts, attachments  |

**Key insight:** 80% of the relay infrastructure exists. The phase is primarily about integration, delayed batching, and configuration - not building new services.

## Common Pitfalls

### Pitfall 1: Timing Attacks via Notification Delivery

**What goes wrong:** Attacker monitors when notification emails arrive to correlate reporter identity
**Why it happens:** Immediate or predictable notification timing leaks when investigator sent message
**How to avoid:**

- Always use random delay (1-6 hours)
- Batch multiple notifications into single delayed send
- Use cryptographically secure randomness for delay
  **Warning signs:** No delay in email queue calls, hardcoded delay values

### Pitfall 2: PII Leakage in Audit Logs

**What goes wrong:** Reporter email or content logged in audit trail
**Why it happens:** Developers copy-paste logging patterns without sanitizing
**How to avoid:**

- Audit logs include `caseId`, `direction`, `messageId` - NOT content or email
- Review all `auditService.log()` calls for PII
  **Warning signs:** Audit context includes `reporterEmail`, `content`, or `to` field

### Pitfall 3: Exposing Access Code Format

**What goes wrong:** Error messages reveal access code format, enabling brute force
**Why it happens:** Specific validation error messages
**How to avoid:**

- Always return generic "Invalid access code" error
- Rate limit access code lookups (already at 20/min)
- No format-specific error messages
  **Warning signs:** Error says "Access code must be 12 characters"

### Pitfall 4: Missing Tenant Isolation in Messages

**What goes wrong:** Cross-tenant message leakage
**Why it happens:** Queries missing organizationId filter
**How to avoid:**

- All CaseMessage queries include `organizationId`
- RLS policies as backstop
- E2E tests verify tenant isolation
  **Warning signs:** Queries without `where: { organizationId }`

### Pitfall 5: Read Receipts Exposing Investigator Activity

**What goes wrong:** Reporter sees exactly when investigator read message
**Why it happens:** Detailed timestamp displayed
**How to avoid:**

- Show relative time ("read") not exact timestamp
- Apply visibility level to read receipt display
  **Warning signs:** UI shows `readAt` timestamp directly

## Code Examples

Verified patterns from official sources and existing codebase:

### Delayed Job with BullMQ

```typescript
// Source: https://docs.bullmq.io/guide/jobs/delayed
import { Queue } from "bullmq";
import { randomInt } from "crypto";

@Injectable()
export class DelayedNotificationService {
  constructor(
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
  ) {}

  async queueDelayedNotification(
    data: ReporterNotificationData,
  ): Promise<void> {
    // Random delay between 1-6 hours (crypto.randomInt is cryptographically secure)
    const minMs = 1 * 60 * 60 * 1000; // 1 hour
    const maxMs = 6 * 60 * 60 * 1000; // 6 hours
    const delay = randomInt(minMs, maxMs);

    await this.emailQueue.add("reporter-notification", data, {
      delay,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { count: 100, age: 24 * 60 * 60 }, // 24 hours
    });
  }
}
```

### Access Code Email Template

```handlebars
{{!-- Source: Existing template patterns in /templates/ --}}
{{> layout}}
  <mj-section>
    <mj-column>
      <mj-text font-size="24px" font-weight="600">
        Your Report Access Code
      </mj-text>
      <mj-text>
        Thank you for submitting your report. Your reference number is
        <strong>{{referenceNumber}}</strong>.
      </mj-text>
      <mj-text>
        To check the status of your report or communicate with the investigator,
        use this access code:
      </mj-text>
      <mj-text font-size="32px" font-family="monospace" align="center" padding="20px">
        {{accessCode}}
      </mj-text>
      <mj-button href="{{portalUrl}}">
        Check Status
      </mj-button>
      <mj-text font-size="14px" color="#666666">
        Keep this code secure. Anyone with this code can view your report status.
      </mj-text>
    </mj-column>
  </mj-section>
{{/layout}}
```

### Reporter Visibility Level Configuration

```typescript
// Source: Codebase organization settings pattern
export class UpdateRelaySettingsDto {
  @ApiPropertyOptional({
    description: "Level of information shown to reporters",
    enum: ReporterVisibilityLevel,
    default: ReporterVisibilityLevel.STANDARD,
  })
  @IsOptional()
  @IsEnum(ReporterVisibilityLevel)
  reporterVisibilityLevel?: ReporterVisibilityLevel;

  @ApiPropertyOptional({
    description: "Minimum delay for reporter notifications (hours)",
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  notificationDelayMinHours?: number;

  @ApiPropertyOptional({
    description: "Maximum delay for reporter notifications (hours)",
    default: 6,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(48)
  notificationDelayMaxHours?: number;
}
```

### Message View with Visibility Filtering

```typescript
// Source: Codebase relay.service.ts pattern
getMessageViewForReporter(
  message: CaseMessage,
  visibilityLevel: ReporterVisibilityLevel,
): FilteredMessageView {
  const baseView = {
    id: message.id,
    direction: message.direction.toLowerCase() as 'inbound' | 'outbound',
    content: message.content,
    createdAt: message.createdAt,
  };

  switch (visibilityLevel) {
    case ReporterVisibilityLevel.MINIMAL:
      return {
        ...baseView,
        // No read status, no timestamps, minimal info
        isRead: undefined,
        readAt: undefined,
      };
    case ReporterVisibilityLevel.STANDARD:
      return {
        ...baseView,
        isRead: message.isRead,
        // Relative time only, no exact timestamp
        readAt: message.readAt ? 'read' : undefined,
      };
    case ReporterVisibilityLevel.DETAILED:
    case ReporterVisibilityLevel.TRANSPARENT:
      return {
        ...baseView,
        isRead: message.isRead,
        readAt: message.readAt,
        // TRANSPARENT adds investigator first name - implement carefully
      };
  }
}
```

## State of the Art

| Old Approach                | Current Approach          | When Changed                            | Impact                                |
| --------------------------- | ------------------------- | --------------------------------------- | ------------------------------------- |
| Immediate email delivery    | Random-delayed batching   | Whistleblower protection best practices | Prevents timing correlation attacks   |
| Binary anonymous/identified | Visibility levels         | Modern compliance platforms             | Tenant-configurable transparency      |
| Block on PII detection      | Warn with acknowledgment  | UX improvement                          | Don't impede legitimate communication |
| Separate messaging system   | Integrated case messaging | Current architecture                    | Single source of truth                |

**Current in codebase:**

- CaseMessage model with MessageDirection enum (INBOUND/OUTBOUND)
- MessageSenderType enum (REPORTER/INVESTIGATOR)
- MessageDeliveryStatus for tracking

**Deprecated/outdated:**

- None identified - existing infrastructure is current

## Open Questions

Things that couldn't be fully resolved:

1. **Exact delay distribution**
   - What we know: 1-6 hour range per requirements
   - What's unclear: Uniform distribution vs. weighted toward longer delays?
   - Recommendation: Use uniform distribution (crypto.randomInt), admin can configure min/max

2. **Reporter notification batching strategy**
   - What we know: Random delay prevents timing attacks
   - What's unclear: Batch multiple messages into single notification?
   - Recommendation: Keep simple - one notification per message, all delayed independently

3. **Visibility level migration**
   - What we know: New tenant config field needed
   - What's unclear: Default for existing tenants?
   - Recommendation: Default to STANDARD, no migration needed (schema allows null with default)

## Sources

### Primary (HIGH confidence)

- `apps/backend/src/modules/messaging/pii-detection.service.ts` - Full PII detection implementation
- `apps/backend/src/modules/messaging/relay.service.ts` - Complete relay implementation
- `apps/backend/src/modules/rius/riu-access.service.ts` - Access code generation
- [BullMQ Delayed Jobs](https://docs.bullmq.io/guide/jobs/delayed) - Official documentation
- `apps/backend/src/modules/notifications/templates/` - Email template patterns

### Secondary (MEDIUM confidence)

- [HR Acuity Whistleblower Hotline 2026](https://www.hracuity.com/blog/best-whistleblower-hotline-2026/) - Industry best practices
- [Whistleblower Protection Best Practices](https://www.whistleblowers.gov/sites/default/files/2016-11/WPAC_BPR_42115.pdf) - Government guidance

### Tertiary (LOW confidence)

- None - all findings verified with codebase or official docs

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already in codebase
- Architecture: HIGH - Patterns verified against existing code
- Pitfalls: HIGH - Derived from security requirements and codebase review
- Existing infrastructure: HIGH - Code read directly

**Research date:** 2026-02-28
**Valid until:** 30 days (stable infrastructure)

## Existing Infrastructure Summary

### Already Implemented (HIGH confidence)

| Component           | Location                                     | What Exists                                                                   |
| ------------------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| PiiDetectionService | `modules/messaging/pii-detection.service.ts` | detect(), sanitize(), containsType(), getDetectedTypes()                      |
| MessageRelayService | `modules/messaging/relay.service.ts`         | sendToReporter(), receiveFromReporter(), getMessagesFor\*(), PII warning flow |
| CaseMessage model   | `prisma/schema.prisma`                       | direction, senderType, deliveryStatus, isRead, readAt                         |
| RiuAccessService    | `modules/rius/riu-access.service.ts`         | generateAccessCode(), checkStatus(), getMessages(), sendMessage()             |
| Email queue         | `modules/jobs/queues/email.queue.ts`         | EMAIL_QUEUE_NAME, 3 retries, exponential backoff                              |
| EmailProcessor      | `modules/jobs/processors/email.processor.ts` | Sends via MailerService, tracks delivery                                      |
| MessageThread UI    | `components/ethics/message-thread.tsx`       | Full messaging UI with read receipts                                          |
| MessageComposer UI  | `components/ethics/message-composer.tsx`     | Message input with attachments                                                |
| StatusView UI       | `components/ethics/status-view.tsx`          | Report status display                                                         |

### Needs Implementation (this phase)

| Component                      | Location                                     | What to Build                         |
| ------------------------------ | -------------------------------------------- | ------------------------------------- |
| DelayedNotificationService     | `modules/notifications/services/`            | Random delay batching (1-6hr)         |
| ReporterVisibilityLevel enum   | `modules/organization/dto/`                  | MINIMAL/STANDARD/DETAILED/TRANSPARENT |
| Access code email template     | `modules/notifications/templates/reporter/`  | access-code.mjml.hbs                  |
| Message notification template  | `modules/notifications/templates/reporter/`  | message-notification.mjml.hbs         |
| RIU created event listener     | `modules/notifications/listeners/`           | Trigger access code email             |
| Relay settings in Organization | `prisma/schema.prisma` or JSON settings      | reporterVisibilityLevel config        |
| Investigator composer UI       | `components/cases/case-messaging/`           | PII warning dialog, send interface    |
| Settings page UI               | `app/(authenticated)/settings/organization/` | Visibility level admin config         |
| Ethics portal integration      | `app/ethics/[tenant]/status/[code]/`         | Message thread in status page         |
