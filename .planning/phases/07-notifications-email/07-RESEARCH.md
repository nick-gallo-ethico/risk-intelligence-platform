# Phase 7: Notifications & Email - Research

**Researched:** 2026-02-03
**Domain:** Event-driven notifications, email delivery, real-time in-app notifications
**Confidence:** HIGH

## Summary

This phase implements a comprehensive notification system with email and in-app channels, leveraging the existing EventEmitter2 infrastructure (Phase 1) and BullMQ email queue. The codebase already has placeholder email processor, event patterns, and Handlebars templating from Phase 5 that this phase will extend.

The recommended approach uses:
- **@nestjs-modules/mailer** with Handlebars and MJML for responsive email templates
- **BullMQ** (already configured) for email job processing with delivery tracking
- **Socket.io** (existing infrastructure from real-time collaboration spec) for in-app notifications
- **PostgreSQL JSONB** for user preferences and notification metadata

**Primary recommendation:** Extend existing infrastructure rather than adding new dependencies. Use the established Handlebars pattern from Phase 5 for email templates, leverage the existing email queue, and add a WebSocket namespace for notifications using the established gateway pattern.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs-modules/mailer | ^2.0.2 | Email abstraction for NestJS | Official Nest module, integrates with ConfigService, supports templates |
| nodemailer | ^6.9.x | SMTP transport | Industry standard Node.js email, peer dependency of @nestjs-modules/mailer |
| handlebars | ^4.7.x | Template engine | Already used in Phase 5 for prompts, consistent templating |
| mjml | ^4.15.x | Responsive email HTML | Produces email-client-compatible HTML from simple markup |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nestjs/bullmq | (existing) | Job queue processing | Already configured - email queue at priority 2 |
| @nestjs/websockets | (existing) | Real-time delivery | Already in project per collaboration spec |
| socket.io | (existing) | WebSocket transport | Already in project per collaboration spec |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MJML | foundation-emails | MJML has better documentation, simpler syntax |
| Handlebars | EJS/Pug | Handlebars already in use, consistency wins |
| SMTP | SendGrid/Postmark API | SMTP more portable, provider-agnostic |

**Installation:**
```bash
npm install @nestjs-modules/mailer nodemailer mjml
npm install --save-dev @types/nodemailer
```

## Architecture Patterns

### Recommended Module Structure
```
apps/backend/src/modules/notifications/
├── notifications.module.ts        # Module definition
├── notifications.controller.ts    # REST API for preferences, history
├── services/
│   ├── notification.service.ts    # Core notification dispatch
│   ├── preference.service.ts      # User preference management
│   ├── delivery-tracker.service.ts # Email delivery status tracking
│   ├── digest.service.ts          # Daily digest compilation
│   └── escalation.service.ts      # SLA escalation notifications
├── processors/
│   └── email.processor.ts         # Replace placeholder from Phase 1
├── listeners/
│   ├── case.listener.ts           # Handle case.* events
│   ├── workflow.listener.ts       # Handle workflow.* events
│   └── sla.listener.ts            # Handle SLA warning/breach events
├── gateways/
│   └── notification.gateway.ts    # WebSocket for real-time in-app
├── templates/
│   ├── base.mjml.hbs              # Base email layout
│   ├── assignment/                # Assignment notification templates
│   ├── deadline/                  # Deadline/SLA templates
│   └── ...                        # ~40 templates by category
├── dto/
│   ├── notification-preference.dto.ts
│   ├── create-notification.dto.ts
│   └── delivery-status.dto.ts
└── entities/
    └── notification.types.ts      # Type definitions
```

### Pattern 1: Event-Driven Notification Dispatch

**What:** Listen to domain events and dispatch notifications based on user preferences
**When to use:** All notification triggers should come from events, not direct service calls
**Example:**
```typescript
// Source: Codebase pattern from events module + CONTEXT.md decisions
@Injectable()
export class CaseEventListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferenceService: PreferenceService,
  ) {}

  @OnEvent('case.assigned')
  async handleCaseAssigned(event: CaseAssignedEvent): Promise<void> {
    // Get recipient preferences
    const prefs = await this.preferenceService.getPreferences(
      event.newAssigneeId,
      event.organizationId,
    );

    // Check if user wants assignment notifications
    if (prefs.assignments.email) {
      await this.notificationService.queueEmail({
        organizationId: event.organizationId,
        templateId: 'case-assignment',
        recipientUserId: event.newAssigneeId,
        context: {
          caseId: event.caseId,
          assignedBy: event.actorUserId,
        },
        priority: 'urgent', // Per CONTEXT.md - assignments are real-time
      });
    }

    if (prefs.assignments.inApp) {
      await this.notificationService.sendInApp({
        organizationId: event.organizationId,
        recipientUserId: event.newAssigneeId,
        type: 'ASSIGNMENT',
        title: 'New case assigned',
        entityType: 'case',
        entityId: event.caseId,
      });
    }
  }

  // Wildcard listener for status changes (batched/digest eligible)
  @OnEvent('case.status_changed')
  async handleStatusChanged(event: CaseStatusChangedEvent): Promise<void> {
    // Status changes go to daily digest per CONTEXT.md
    await this.notificationService.queueForDigest({
      organizationId: event.organizationId,
      type: 'STATUS_UPDATE',
      entityType: 'case',
      entityId: event.caseId,
      metadata: {
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
      },
    });
  }
}
```

### Pattern 2: User Preference Storage (JSONB)

**What:** Store notification preferences as JSONB for flexibility with enforced minimums
**When to use:** User-specific channel preferences per event category
**Example:**
```typescript
// Source: CONTEXT.md decisions + database design research
// Prisma schema
model NotificationPreference {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")
  userId          String   @map("user_id")

  // JSONB preferences structure
  preferences     Json     @default("{}")
  // Example: {
  //   "assignments": { "email": true, "inApp": true },
  //   "deadlines": { "email": true, "inApp": true },
  //   "mentions": { "email": true, "inApp": true },
  //   "statusUpdates": { "email": false, "inApp": true },
  //   "comments": { "email": false, "inApp": true },
  //   "digest": { "enabled": true, "time": "17:00" }
  // }

  // Quiet hours
  quietHoursStart String?  @map("quiet_hours_start") // "22:00"
  quietHoursEnd   String?  @map("quiet_hours_end")   // "07:00"
  timezone        String   @default("UTC")

  // OOO delegation
  backupUserId    String?  @map("backup_user_id")
  oooUntil        DateTime? @map("ooo_until")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  organization    Organization @relation(fields: [organizationId], references: [id])
  user            User @relation(fields: [userId], references: [id])
  backupUser      User? @relation("BackupNotifications", fields: [backupUserId], references: [id])

  @@unique([organizationId, userId])
  @@map("notification_preferences")
}
```

### Pattern 3: In-App Notification with Real-Time Delivery

**What:** WebSocket gateway for instant notification delivery with fallback polling
**When to use:** All in-app notifications use this for real-time delivery
**Example:**
```typescript
// Source: Existing collaboration gateway pattern + CONTEXT.md
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth.token;
    const payload = this.jwtService.verifyAccessToken(token);

    // Map user to socket
    const sockets = this.userSockets.get(payload.sub) ?? new Set();
    sockets.add(client.id);
    this.userSockets.set(payload.sub, sockets);

    // Join user-specific room
    await client.join(`user:${payload.sub}`);

    // Send unread count on connect
    const unreadCount = await this.notificationService.getUnreadCount(
      payload.organizationId,
      payload.sub,
    );
    client.emit('notification:unread_count', { count: unreadCount });
  }

  // Called by NotificationService when creating in-app notification
  async sendToUser(userId: string, notification: InAppNotification): Promise<void> {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }
}
```

### Pattern 4: Email Template with MJML + Handlebars

**What:** MJML for responsive structure, Handlebars for dynamic content
**When to use:** All email templates
**Example:**
```handlebars
{{!-- templates/assignment/case-assigned.mjml.hbs --}}
<mjml>
  <mj-head>
    {{> email/head }}
    <mj-title>New Case Assignment</mj-title>
  </mj-head>
  <mj-body>
    {{> email/header branding=org.branding }}

    <mj-section>
      <mj-column>
        <mj-text font-size="18px" font-weight="bold">
          Case #{{case.referenceNumber}} Assigned to You
        </mj-text>
        <mj-text>
          {{assignedBy.name}} has assigned you a new case requiring your attention.
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#f4f4f4" border-radius="8px">
      <mj-column>
        <mj-text font-size="14px">
          <strong>Category:</strong> {{case.category}}<br/>
          <strong>Priority:</strong> {{case.severity}}<br/>
          <strong>Due Date:</strong> {{formatDate case.dueDate}}<br/>
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section>
      <mj-column>
        <mj-button href="{{appUrl}}/cases/{{case.id}}">
          View Case Details
        </mj-button>
      </mj-column>
    </mj-section>

    {{> email/footer org=org isTransactional=true }}
  </mj-body>
</mjml>
```

### Pattern 5: Delivery Tracking with Webhook Receiver

**What:** Receive delivery status webhooks from email provider
**When to use:** Track delivered, bounced, failed status
**Example:**
```typescript
// Source: SendGrid webhook documentation + research
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly deliveryTracker: DeliveryTrackerService) {}

  @Post('email-events')
  @HttpCode(200)
  async handleEmailEvents(@Body() events: SendGridEvent[]): Promise<void> {
    for (const event of events) {
      await this.deliveryTracker.processEvent({
        messageId: event.sg_message_id,
        status: this.mapEventToStatus(event.event),
        timestamp: new Date(event.timestamp * 1000),
        reason: event.reason,
        bounceType: event.type, // 'bounce' or 'blocked'
      });
    }
  }

  private mapEventToStatus(event: string): DeliveryStatus {
    switch (event) {
      case 'delivered': return 'DELIVERED';
      case 'bounce': return 'BOUNCED';
      case 'dropped': return 'FAILED';
      case 'deferred': return 'DEFERRED';
      default: return 'UNKNOWN';
    }
  }
}
```

### Anti-Patterns to Avoid

- **Direct notification calls from services:** Always emit events, let listeners dispatch notifications. This maintains loose coupling and allows preference checking.
- **Storing HTML in templates:** Store MJML/Handlebars source, render at send time for personalization and branding.
- **Polling-only for in-app:** Use WebSocket with polling fallback, not polling-only.
- **Ignoring quiet hours for all notifications:** Per CONTEXT.md, urgent notifications (SLA breach, critical assignments) may bypass quiet hours.
- **Per-notification preference queries:** Cache user preferences with 5-minute TTL, don't query database per notification.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive email HTML | Custom HTML/CSS | MJML | Email client compatibility is nightmare, MJML solves it |
| Email queue retry | Custom retry loop | BullMQ exponential backoff | Already configured, handles edge cases |
| Rate limiting | Custom counters | Existing throttle guards + provider limits | SendGrid/Postmark handle rate limiting |
| Template compilation | Runtime Handlebars.compile() | Precompile on startup | Performance - compile once, execute many |
| WebSocket auth | Custom token validation | Reuse JWT verification from gateway pattern | Consistency with collaboration gateway |
| Bounce handling | Custom email parsing | Provider webhooks | Providers detect bounces reliably |

**Key insight:** This phase builds ON existing infrastructure. The EventsModule, JobsModule (BullMQ), PromptService (Handlebars), and collaboration gateway (Socket.io) are already in place. The work is extending these, not building from scratch.

## Common Pitfalls

### Pitfall 1: Event Loss During Startup
**What goes wrong:** Notifications triggered before listeners are registered are lost
**Why it happens:** NestJS EventEmitter2 listeners register during module initialization
**How to avoid:** Use `EventEmitterReadinessWatcher.waitUntilReady()` for any startup event emission, or emit events only after `onApplicationBootstrap`
**Warning signs:** Missing notifications for actions that happen immediately at startup

### Pitfall 2: N+1 Queries for Recipient Preferences
**What goes wrong:** Each notification checks database for user preferences individually
**Why it happens:** Natural to query preferences when processing each notification
**How to avoid:** Batch preference lookups when processing multiple notifications, cache with 5-min TTL
**Warning signs:** High database load during notification bursts

### Pitfall 3: Email Template Rendering in Queue Worker
**What goes wrong:** Template errors cause job failures, clogging the queue
**Why it happens:** MJML/Handlebars rendering done in processor
**How to avoid:** Pre-render HTML when queueing job, store in job data. Queue processor only sends.
**Warning signs:** High job failure rate, queue backing up

### Pitfall 4: Missing Tenant Isolation in WebSocket Rooms
**What goes wrong:** User in org A receives notifications for org B
**Why it happens:** Room names based only on userId without organizationId
**How to avoid:** Room naming: `org:${organizationId}:user:${userId}`
**Warning signs:** Cross-tenant notification leaks (critical security issue)

### Pitfall 5: Synchronous Event Handlers Blocking Request
**What goes wrong:** API response slow because notification dispatch waits
**Why it happens:** @OnEvent handlers are synchronous by default
**How to avoid:** Use `@OnEvent(..., { async: true })` or queue work to BullMQ immediately
**Warning signs:** Slow API responses after events that trigger many notifications

### Pitfall 6: Unbounded In-App Notification Storage
**What goes wrong:** Notification table grows indefinitely, queries slow down
**Why it happens:** No cleanup policy for old/read notifications
**How to avoid:** Archive read notifications after 30 days, delete archived after 90 days (per Claude's discretion area in CONTEXT.md)
**Warning signs:** Slow unread count queries, large table size

## Code Examples

### Email Processor (Replace Phase 1 Placeholder)
```typescript
// Source: Phase 1 placeholder + @nestjs-modules/mailer docs
@Processor(EMAIL_QUEUE_NAME, { concurrency: 10 })
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly deliveryTracker: DeliveryTrackerService,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<{ messageId: string }> {
    const { templateId, to, subject, html, organizationId, notificationId } = job.data;

    this.logger.log(`Processing email job ${job.id}: template=${templateId}`);

    try {
      const result = await this.mailerService.sendMail({
        to,
        subject,
        html, // Pre-rendered in notification service
      });

      // Track delivery initiation
      await this.deliveryTracker.recordSent(notificationId, result.messageId);

      return { messageId: result.messageId };
    } catch (error) {
      this.logger.error(`Email failed: ${error.message}`);

      // Track failure for delivery history
      await this.deliveryTracker.recordFailed(notificationId, error.message);

      throw error; // Let BullMQ handle retry
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<EmailJobData>, error: Error): Promise<void> {
    this.logger.error(
      `Email job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );

    // After max retries, mark as permanently failed
    if (job.attemptsMade >= job.opts.attempts) {
      await this.deliveryTracker.recordPermanentFailure(
        job.data.notificationId,
        error.message,
      );
    }
  }
}
```

### Notification Service Core
```typescript
// Source: CONTEXT.md decisions + research patterns
@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue(EMAIL_QUEUE_NAME) private emailQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly templateService: EmailTemplateService,
    private readonly gateway: NotificationGateway,
    private readonly preferenceService: PreferenceService,
  ) {}

  async queueEmail(params: QueueEmailParams): Promise<void> {
    const { organizationId, templateId, recipientUserId, context, priority } = params;

    // Load user for email address
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: recipientUserId },
      select: { email: true, firstName: true, lastName: true },
    });

    // Load org branding
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true, settings: true },
    });

    // Pre-render template (don't do this in queue worker)
    const { subject, html } = await this.templateService.render(templateId, {
      ...context,
      recipient: user,
      org,
      appUrl: process.env.FRONTEND_URL,
    });

    // Create notification record for tracking
    const notification = await this.prisma.notification.create({
      data: {
        organizationId,
        userId: recipientUserId,
        channel: 'EMAIL',
        type: params.notificationType,
        templateId,
        status: 'QUEUED',
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });

    // Queue with appropriate priority
    await this.emailQueue.add(
      'send-email',
      {
        organizationId,
        notificationId: notification.id,
        templateId,
        to: user.email,
        subject,
        html,
      },
      {
        priority: priority === 'urgent' ? 1 : 2,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }

  async sendInApp(params: SendInAppParams): Promise<void> {
    const { organizationId, recipientUserId, type, title, entityType, entityId } = params;

    // Create in-app notification record
    const notification = await this.prisma.notification.create({
      data: {
        organizationId,
        userId: recipientUserId,
        channel: 'IN_APP',
        type,
        title,
        body: params.body,
        entityType,
        entityId,
        status: 'DELIVERED',
        isRead: false,
      },
    });

    // Send via WebSocket immediately
    await this.gateway.sendToUser(recipientUserId, {
      id: notification.id,
      type,
      title,
      body: params.body,
      entityType,
      entityId,
      createdAt: notification.createdAt,
    });
  }

  async getUnreadCount(organizationId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        organizationId,
        userId,
        channel: 'IN_APP',
        isRead: false,
      },
    });
  }

  async markAsRead(organizationId: string, userId: string, notificationIds: string[]): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        organizationId,
        userId,
        id: { in: notificationIds },
      },
      data: { isRead: true, readAt: new Date() },
    });

    // Update unread count via WebSocket
    const count = await this.getUnreadCount(organizationId, userId);
    await this.gateway.sendToUser(userId, { type: 'unread_count', count });
  }
}
```

### Email Template Service (MJML + Handlebars)
```typescript
// Source: Phase 5 PromptService pattern + MJML docs
@Injectable()
export class EmailTemplateService implements OnModuleInit {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly compiledTemplates = new Map<string, Handlebars.TemplateDelegate>();
  private readonly templateDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.templateDir = path.join(__dirname, '..', 'templates');
  }

  async onModuleInit(): Promise<void> {
    await this.loadTemplates();
    this.registerHelpers();
    this.logger.log(`Loaded ${this.compiledTemplates.size} email templates`);
  }

  async render(
    templateName: string,
    context: Record<string, unknown>,
  ): Promise<{ subject: string; html: string }> {
    // Check for org-specific override
    const orgId = context.organizationId as string;
    if (orgId) {
      const dbTemplate = await this.prisma.emailTemplate.findFirst({
        where: { organizationId: orgId, name: templateName, isActive: true },
        orderBy: { version: 'desc' },
      });
      if (dbTemplate) {
        return this.compileAndRender(dbTemplate.mjmlContent, dbTemplate.subject, context);
      }
    }

    // Use file template
    const template = this.compiledTemplates.get(templateName);
    if (!template) {
      throw new Error(`Email template not found: ${templateName}`);
    }

    // Template returns MJML string, need to compile to HTML
    const mjmlSource = template(context);
    const { html, errors } = mjml(mjmlSource, { minify: true });

    if (errors?.length) {
      this.logger.warn(`MJML warnings for ${templateName}: ${JSON.stringify(errors)}`);
    }

    // Subject is in template metadata or context
    const subjectTemplate = Handlebars.compile(context.subjectTemplate as string || '');
    const subject = subjectTemplate(context);

    return { subject, html };
  }

  private async loadTemplates(): Promise<void> {
    await this.loadTemplatesFromDir(this.templateDir, '');
  }

  private async loadTemplatesFromDir(dir: string, prefix: string): Promise<void> {
    if (!fs.existsSync(dir)) {
      this.logger.warn(`Template directory not found: ${dir}`);
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const newPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
        await this.loadTemplatesFromDir(fullPath, newPrefix);
      } else if (entry.name.endsWith('.mjml.hbs')) {
        const templateName = prefix
          ? `${prefix}/${entry.name.replace('.mjml.hbs', '')}`
          : entry.name.replace('.mjml.hbs', '');

        const content = fs.readFileSync(fullPath, 'utf-8');
        const compiled = Handlebars.compile(content);
        this.compiledTemplates.set(templateName, compiled);

        // Register as partial for composition
        Handlebars.registerPartial(templateName, content);
      }
    }
  }

  private registerHelpers(): void {
    // Reuse helpers from PromptService (Phase 5)
    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    Handlebars.registerHelper('formatDateTime', (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    });

    // Email-specific helpers
    Handlebars.registerHelper('urgentBadge', (severity: string) => {
      if (severity === 'HIGH') {
        return new Handlebars.SafeString(
          '<span style="background:#ef4444;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">URGENT</span>'
        );
      }
      return '';
    });
  }

  private compileAndRender(
    mjmlContent: string,
    subjectTemplate: string,
    context: Record<string, unknown>,
  ): { subject: string; html: string } {
    const mjmlCompiled = Handlebars.compile(mjmlContent);
    const mjmlSource = mjmlCompiled(context);
    const { html } = mjml(mjmlSource, { minify: true });

    const subjectCompiled = Handlebars.compile(subjectTemplate);
    const subject = subjectCompiled(context);

    return { subject, html };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTML tables manually | MJML framework | 2020+ | Dramatically simpler responsive emails |
| Polling for real-time | WebSocket with polling fallback | 2022+ | Better UX, lower server load |
| Separate email/notification services | Unified notification service with channels | 2023+ | Consistent preference management |
| Open/click tracking pixels | Delivery tracking only (privacy) | 2023+ | GDPR compliance, user trust |

**Deprecated/outdated:**
- nodemailer-smtp-transport (merged into nodemailer core)
- Bull (replaced by BullMQ with better TypeScript support)
- passport-socketio (use JWT auth in handshake instead)

## Open Questions

1. **Email Provider Selection**
   - What we know: SMTP is configured, SendGrid/Postmark APIs available
   - What's unclear: Which provider will be used in production
   - Recommendation: Build with SMTP transport, add provider-specific adapters if needed

2. **Digest Delivery Time**
   - What we know: CONTEXT.md says "daily digest" for low-priority events
   - What's unclear: Default time (end of day? morning?)
   - Recommendation: Default to 17:00 user's timezone, make configurable

3. **Organization-Enforced Notification Minimums**
   - What we know: CONTEXT.md specifies "org-enforced minimums" for critical notifications
   - What's unclear: UI/UX for showing users which preferences are org-locked
   - Recommendation: Store locked preferences in org settings, UI shows "Required by your organization" badge

## Sources

### Primary (HIGH confidence)
- Codebase: `apps/backend/src/modules/events/` - EventEmitter2 patterns
- Codebase: `apps/backend/src/modules/jobs/` - BullMQ queue configuration
- Codebase: `apps/backend/src/modules/ai/services/prompt.service.ts` - Handlebars template pattern
- Codebase: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-REALTIME-COLLABORATION.md` - WebSocket gateway pattern
- [NestJS Events Documentation](https://docs.nestjs.com/techniques/events)
- [BullMQ Retrying Failing Jobs](https://docs.bullmq.io/guide/retrying-failing-jobs)
- [MJML Documentation](https://documentation.mjml.io)

### Secondary (MEDIUM confidence)
- [@nestjs-modules/mailer npm](https://www.npmjs.com/package/@nestjs-modules/mailer) - verified as maintained
- [SendGrid Event Webhook Reference](https://docs.sendgrid.com/for-developers/tracking-events/event)
- [NestJS WebSocket Gateways](https://docs.nestjs.com/websockets/gateways)

### Tertiary (LOW confidence)
- [Database schema for notification system](https://www.w3tutorials.net/blog/database-schema-for-notification-system-similar-to-facebooks/) - general patterns
- [Building Production-Ready Notification System](https://medium.com/@marufpulok98/building-a-production-ready-real-time-notification-system-in-nestjs-websockets-redis-offline-6cc2f1bd0b05) - architecture ideas

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing codebase patterns, well-documented libraries
- Architecture: HIGH - Extends established patterns from Phase 1 and Phase 5
- Pitfalls: MEDIUM - Based on general NestJS experience and research
- Email templates: HIGH - MJML is industry standard, Handlebars already in use

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable domain, established libraries)
