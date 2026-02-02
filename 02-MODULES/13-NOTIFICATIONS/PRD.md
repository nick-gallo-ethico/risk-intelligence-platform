# Ethico Risk Intelligence Platform
## PRD-013: Notifications & Email Module

**Document ID:** PRD-013
**Version:** 1.0
**Priority:** P0 - Critical (Cross-Cutting Infrastructure)
**Development Phase:** Phase 1 (Core Platform)
**Last Updated:** February 2026

**Cross-References:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md`
- Core Data Model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
- Authentication & Multi-tenancy: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md`
- AI Integration Patterns: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-INTEGRATION.md`
- Working Decisions: `00-PLATFORM/WORKING-DECISIONS.md` (Sections D.3, J.1, J.2, T.1-T.4)
- Case Management PRD: `02-MODULES/05-CASE-MANAGEMENT/PRD.md`
- Infrastructure Spec: `01-SHARED-INFRASTRUCTURE/INFRASTRUCTURE-SPEC.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [AI-First Considerations](#2-ai-first-considerations)
3. [User Personas](#3-user-personas)
4. [User Stories](#4-user-stories)
5. [Feature Specifications](#5-feature-specifications)
6. [Data Model](#6-data-model)
7. [API Specifications](#7-api-specifications)
8. [UI/UX Specifications](#8-uiux-specifications)
9. [Migration Considerations](#9-migration-considerations)
10. [Integration Points](#10-integration-points)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Checklist Verification](#12-checklist-verification)
13. [Appendix](#13-appendix)

---

## 1. Executive Summary

### Purpose

The Notifications & Email Module is a cross-cutting infrastructure component that manages all platform communications. It provides a unified, event-driven notification system that routes platform events to users through multiple channels (in-app, email, SMS future), respects user preferences, supports digest scheduling, and maintains a complete audit trail of all communications.

This module is foundational to the platform experience, enabling timely awareness of compliance events while respecting user preferences and regulatory requirements for communication.

### Target Users

| Role | Primary Use Cases |
|------|-------------------|
| All Platform Users | Receive notifications, manage preferences, view notification center |
| System Admin | Configure organization-wide notification rules, manage templates, set mandatory notifications |
| Compliance Officer | Set required notifications for compliance events, configure escalation alerts |
| Investigator | Receive case assignments, deadline reminders, reporter messages |
| Employee | Receive attestation reminders, disclosure deadlines, chatbot follow-ups |
| Anonymous Reporter | Receive anonymized communication via access code relay |

### Key Differentiators

| Capability | Competitors | Ethico Platform |
|------------|-------------|-----------------|
| **Channel Flexibility** | Email-only or siloed | Unified multi-channel with user preference |
| **Digest Intelligence** | Fixed daily emails | AI-prioritized digests with smart grouping |
| **Anonymous Communication** | Separate system | Integrated relay with full case context |
| **Template Management** | Static templates | Dynamic templates with AI draft assistance |
| **Preference Granularity** | All-or-nothing | Per-event-type per-channel matrix |
| **Multi-Language** | Manual translation | AI-powered template localization |
| **Audit Trail** | Limited | Full delivery tracking with bounce handling |

---

## 2. AI-First Considerations

### Conversational Interface

How users might interact with this module via natural language chat:

| User Intent | Example Phrases | AI Response |
|-------------|-----------------|-------------|
| Check notifications | "Show me my unread notifications", "What did I miss?" | Summarized notification list with priorities |
| Configure preferences | "Turn off email notifications for case updates" | Execute preference change with confirmation |
| Draft message | "Help me write a message to the reporter on case 2024-001" | AI drafts professional, compliant message |
| Summarize digest | "Summarize my weekly compliance activity" | AI-generated activity summary |
| Find notification | "Show me all notifications about harassment cases" | Filtered notification list |

**Example Conversations:**

```
User: "What notifications did I get about case ETH-2024-00123?"
AI: "I found 4 notifications for case ETH-2024-00123:
     - Jan 15: Case assigned to you by Sarah Chen
     - Jan 16: Reporter sent a new message
     - Jan 18: SLA warning - 2 days until deadline
     - Jan 20: Reminder - Follow-up interview scheduled
     Would you like me to open the case or mark these as read?"

User: "Draft a message to the reporter asking for more details about the incident date"
AI: "Here's a draft message:

     Dear Reporter,

     Thank you for bringing this matter to our attention. To assist our investigation,
     could you please clarify the approximate date when this incident occurred? Any
     additional context about the timeline would be helpful.

     Your identity remains protected, and you can reply through this secure channel.

     Best regards,
     [Investigator Name]

     Shall I send this message or would you like to edit it?"
```

### AI Assistance Points

| User Action | AI Can Help By | Confidence Level |
|-------------|----------------|------------------|
| Drafting emails/messages | Generate professional, compliant drafts | High |
| Summarizing digest content | Prioritize and summarize key items | High |
| Writing template content | Suggest template text for event types | Medium |
| Configuring preferences | Recommend settings based on role | Medium |
| Translating messages | Translate to reporter's language | High |
| Identifying notification gaps | Flag missing escalation rules | Medium |

### Data Requirements for AI Context

**Minimum Context:**
- Notification type and event details
- Recipient role and preferences
- Organization notification policies
- Related entity context (case, policy, campaign)

**Enhanced Context (Improves Quality):**
- Historical communication with same recipient
- Similar messages sent to other users
- Reporter's communication history (for relay)
- Organization's communication tone/style guidelines

**Cross-Module Context:**
- Case details for case-related notifications
- Policy content for attestation reminders
- Campaign context for disclosure deadlines
- User's current workload for priority scoring

---

## 3. User Personas

### Ethico Staff (Operator Console)
- **Hotline Operator** - Sends notifications when releasing RIUs, manages escalation calls
- **QA Reviewer** - Receives QA queue notifications, sends release notifications
- **Implementation Specialist** - Configures notification templates during tenant setup

### Client Admin (Client Platform)
- **CCO / Compliance Officer** - Configures mandatory notifications, reviews escalation rules
- **Investigator** - Receives case assignments, deadline alerts, reporter messages
- **Triage Lead** - Receives high-volume notifications, needs intelligent digest
- **System Admin** - Manages templates, configures organization defaults, handles bounce issues
- **HR Manager** - Receives disclosure-related notifications, campaign status alerts

### End User (Ethics Portal, Self-Service)
- **Employee** - Receives attestation reminders, disclosure deadlines, completion confirmations
- **Anonymous Reporter** - Receives anonymized case updates via relay system
- **Manager** - Receives team compliance notifications, proxy report confirmations

---

## 4. User Stories

### Epic 1: In-App Notifications

#### Ethico Staff Stories

**US-NOT-001: View notification center**

As an Operator, I want to view all my notifications in a centralized notification center so that I can stay informed about QA queue status and urgent escalations.

**Acceptance Criteria:**
- [ ] Notification bell icon shows unread count badge
- [ ] Clicking bell opens notification panel/drawer
- [ ] Notifications grouped by date (Today, Yesterday, This Week, Older)
- [ ] Each notification shows: icon, title, preview, timestamp, read/unread state
- [ ] Click notification navigates to relevant entity
- [ ] "Mark all as read" action available
- [ ] Infinite scroll for older notifications

**AI Enhancement:**
- AI can summarize "You have 15 unread notifications: 3 high-priority case assignments, 8 SLA warnings, 4 routine updates"

**Ralph Task Readiness:**
- [ ] Entry: Create `NotificationCenter` component in `apps/frontend/src/components/notifications/`
- [ ] Pattern: Follow HubSpot notification panel design
- [ ] Test: Component renders notifications, handles mark-as-read, navigates correctly

---

**US-NOT-002: Receive real-time notifications**

As an Operator, I want to receive notifications in real-time without refreshing so that I can respond immediately to urgent escalations.

**Acceptance Criteria:**
- [ ] WebSocket connection established on login
- [ ] New notifications appear in bell without refresh
- [ ] Badge count updates in real-time
- [ ] Toast/snackbar appears for high-priority notifications
- [ ] Sound notification option (user-configurable)
- [ ] Connection status indicator shows if disconnected

**AI Enhancement:**
- AI determines notification priority for toast display decisions

---

#### Client Admin Stories

**US-NOT-010: Configure notification preferences**

As a Compliance Officer, I want to configure my notification preferences so that I receive important alerts while avoiding notification fatigue.

**Acceptance Criteria:**
- [ ] Preferences page shows event types in categories
- [ ] Each event type has toggles for: in-app, email, SMS (future)
- [ ] Preset profiles available: Real-time, Daily Digest, Critical Only
- [ ] Custom quiet hours with timezone support
- [ ] Critical notifications override quiet hours (configurable)
- [ ] Changes save immediately with confirmation toast
- [ ] Preview option shows example notification

**AI Enhancement:**
- AI suggests optimal preferences based on role and typical workload

---

**US-NOT-011: Set mandatory notifications**

As a System Admin, I want to set certain notifications as mandatory so that compliance-critical alerts cannot be disabled by users.

**Acceptance Criteria:**
- [ ] Admin UI to mark event types as mandatory
- [ ] Mandatory notifications show lock icon in user preferences
- [ ] Users cannot disable mandatory notification channels
- [ ] Admin can set mandatory at organization level
- [ ] Audit log records mandatory notification configuration changes

---

**US-NOT-012: Filter and search notifications**

As an Investigator, I want to filter and search my notifications so that I can find specific alerts quickly.

**Acceptance Criteria:**
- [ ] Filter by: read/unread, event type, date range, related entity
- [ ] Search by keyword in notification title/content
- [ ] Filters persist during session
- [ ] Clear filters action
- [ ] Results count displayed

---

#### End User Stories

**US-NOT-020: Receive attestation reminders**

As an Employee, I want to receive reminders about pending policy attestations so that I complete them before deadlines.

**Acceptance Criteria:**
- [ ] Reminder notification sent at configured intervals before due date
- [ ] Notification includes: policy name, due date, direct link to attest
- [ ] Escalating reminders (1 week, 3 days, 1 day, overdue)
- [ ] Reminder stops after completion
- [ ] Notification in employee's preferred language

---

### Epic 2: Email Notifications

#### Client Admin Stories

**US-NOT-030: Receive email notifications**

As an Investigator, I want to receive email notifications for important events so that I stay informed even when not logged in.

**Acceptance Criteria:**
- [ ] Email sent within 5 minutes of event (non-digest)
- [ ] Email includes: branded header, event details, action links
- [ ] Links use secure tokens for authentication (magic link pattern)
- [ ] Unsubscribe link for non-mandatory notifications
- [ ] Email renders correctly on major clients (Gmail, Outlook, Apple Mail)

---

**US-NOT-031: Manage email templates**

As a System Admin, I want to manage email templates so that communications match our organization's brand and tone.

**Acceptance Criteria:**
- [ ] Template editor with WYSIWYG and source view
- [ ] Variables available: {{recipient_name}}, {{case_number}}, {{due_date}}, etc.
- [ ] Preview with sample data
- [ ] Templates organized by event type
- [ ] Version history for templates
- [ ] Default templates provided, customizable per tenant
- [ ] Multi-language template variants

**AI Enhancement:**
- AI can draft initial template content based on event type and tone guidelines

---

**US-NOT-032: Configure digest emails**

As a Triage Lead, I want to receive digest emails instead of individual notifications so that I can review activity summaries at scheduled times.

**Acceptance Criteria:**
- [ ] Digest frequency options: daily, weekly
- [ ] Configurable delivery time (in user's timezone)
- [ ] Digest groups notifications by category/type
- [ ] Priority items highlighted at top
- [ ] "Nothing to report" email skipped (configurable)
- [ ] Digest includes link to full notification center

**AI Enhancement:**
- AI summarizes digest with key insights: "This week: 12 new cases assigned, 3 SLA breaches, 2 escalations"

---

**US-NOT-033: Track email delivery**

As a System Admin, I want to track email delivery status so that I can troubleshoot delivery issues.

**Acceptance Criteria:**
- [ ] Email log shows: sent, delivered, opened, clicked, bounced, failed
- [ ] Filter log by recipient, status, date range
- [ ] Bounce details with reason code
- [ ] Auto-disable notifications for hard bounces
- [ ] Alert admin when bounce rate exceeds threshold
- [ ] Retry logic for soft bounces

---

### Epic 3: Anonymous Communication Relay

#### Client Admin Stories

**US-NOT-040: Send message to anonymous reporter**

As an Investigator, I want to send messages to anonymous reporters through a secure relay so that I can request additional information without compromising their identity.

**Acceptance Criteria:**
- [ ] Compose message from case detail page
- [ ] No reporter identity visible to investigator
- [ ] Message delivered via platform messaging (access code check) AND email relay (if provided)
- [ ] All messages logged in case timeline
- [ ] Character limit with counter
- [ ] Attachment support (configurable)

**AI Enhancement:**
- AI can draft professional, non-leading questions for investigators

---

**US-NOT-041: Receive reporter reply**

As an Investigator, I want to receive notifications when a reporter replies so that I can continue the dialogue promptly.

**Acceptance Criteria:**
- [ ] In-app notification when reporter replies
- [ ] Email notification (based on preferences)
- [ ] Reply appears in case message thread
- [ ] Notification links directly to message
- [ ] Read receipt tracked when investigator views

---

#### End User Stories

**US-NOT-050: Check case status via access code**

As an Anonymous Reporter, I want to check my case status using my access code so that I know my concern is being addressed.

**Acceptance Criteria:**
- [ ] Enter access code on Ethics Portal status page
- [ ] View case status (general) and any messages from investigators
- [ ] Reply capability with text field
- [ ] No identifying information exposed
- [ ] Session expires after inactivity
- [ ] Access code lockout after failed attempts

---

**US-NOT-051: Receive anonymized email updates**

As an Anonymous Reporter who provided an email, I want to receive updates at an anonymized relay address so that my real email is protected.

**Acceptance Criteria:**
- [ ] Email sent to reporter's real address FROM anonymized Ethico address
- [ ] Reply-to routes back through relay
- [ ] Investigator sees only relay address
- [ ] Reporter can switch to platform-only at any time
- [ ] All relay communications logged

---

### Epic 4: Notification Rules & Escalation

#### Client Admin Stories

**US-NOT-060: Configure escalation notifications**

As a Compliance Officer, I want to configure escalation notifications so that critical issues get immediate attention.

**Acceptance Criteria:**
- [ ] Define escalation rules by: category, severity, keywords, SLA status
- [ ] Actions: notify specific users/roles, notify escalation contacts, phone call (operator)
- [ ] Multiple escalation levels (immediate, after 4 hours, after 24 hours)
- [ ] Test escalation rule with sample data
- [ ] Audit log for escalation rule changes

---

**US-NOT-061: Configure watch/follow notifications**

As a Compliance Officer, I want to watch specific cases so that I receive all updates without being assigned.

**Acceptance Criteria:**
- [ ] "Watch" action on case detail page
- [ ] Watch options: all updates, status changes only, messages only
- [ ] Watched cases list in user settings
- [ ] Unwatch action available
- [ ] Notification indicates "watched case" vs "assigned case"

---

**US-NOT-062: Configure SLA notifications**

As a System Admin, I want to configure SLA-based notifications so that approaching deadlines trigger appropriate alerts.

**Acceptance Criteria:**
- [ ] Warning threshold (e.g., 80% of SLA elapsed)
- [ ] Breach notification at SLA expiry
- [ ] Recipients: assignee, manager, compliance officer (configurable)
- [ ] Escalation on continued breach (after 24h, 48h, etc.)
- [ ] SLA pause during "On Hold" status

---

### Epic 5: Template Management & Localization

#### Client Admin Stories

**US-NOT-070: Create notification templates**

As a System Admin, I want to create and manage notification templates so that messages are consistent and professional.

**Acceptance Criteria:**
- [ ] Template types: email, in-app, SMS (future)
- [ ] Rich text editor for email body
- [ ] Variable insertion with validation
- [ ] Conditional sections (if/then blocks)
- [ ] Test send to self
- [ ] Template categories matching event types

---

**US-NOT-071: Localize templates**

As a System Admin, I want to create localized versions of templates so that users receive notifications in their language.

**Acceptance Criteria:**
- [ ] Per-language variants of each template
- [ ] Fallback chain: user language -> org default -> system English
- [ ] AI translation assistance for creating variants
- [ ] Variable names remain in English (values translated)
- [ ] Preview in each language

---

---

## 5. Feature Specifications

### F1: Notification Event System

**Description:**
A unified, event-driven notification system that captures events from all platform modules and routes them to appropriate recipients through configured channels.

**Architecture:**
```
Module Event → Event Bus → Notification Service → Queue → Channel Adapters
                              ↓
                    User Preferences Filter
                              ↓
                    Digest Aggregator (if applicable)
```

**Event Types:**

| Category | Event Type | Default Channels | Mandatory |
|----------|------------|------------------|-----------|
| **Case** | case_created | in-app, email | No |
| **Case** | case_assigned | in-app, email | No |
| **Case** | case_status_changed | in-app | No |
| **Case** | case_sla_warning | in-app, email | Configurable |
| **Case** | case_sla_breach | in-app, email | Yes |
| **Case** | case_escalated | in-app, email | Yes |
| **Case** | reporter_message_received | in-app, email | No |
| **Investigation** | investigation_assigned | in-app, email | No |
| **Investigation** | investigation_closed | in-app | No |
| **Investigation** | investigation_approval_needed | in-app, email | No |
| **Campaign** | attestation_reminder | in-app, email | Yes |
| **Campaign** | attestation_overdue | in-app, email | Yes |
| **Campaign** | disclosure_due | in-app, email | No |
| **Campaign** | disclosure_overdue | in-app, email | Configurable |
| **Task** | task_assigned | in-app, email | No |
| **Task** | task_due_soon | in-app, email | No |
| **Task** | task_overdue | in-app, email | No |
| **Remediation** | remediation_step_assigned | in-app, email | No |
| **Remediation** | remediation_step_overdue | in-app, email | No |
| **Policy** | policy_published | in-app | No |
| **Policy** | policy_review_needed | in-app, email | No |
| **Auth** | password_reset | email | Yes |
| **Auth** | login_new_device | email | Yes |
| **Auth** | mfa_setup_reminder | email | Configurable |
| **System** | export_ready | in-app, email | No |
| **System** | import_complete | in-app, email | No |

**User Flow:**
1. Module emits event to event bus
2. Notification service receives event
3. Service identifies recipients based on event type and context
4. For each recipient, check preferences
5. If digest mode, queue for aggregation
6. If immediate, dispatch to channel adapters
7. Track delivery status
8. Log to audit trail

**Business Rules:**
- Mandatory notifications bypass user preferences (except channel availability)
- Quiet hours apply to non-critical notifications only
- Bounced email addresses auto-disabled after 3 hard bounces
- Duplicate notifications within 5 minutes are suppressed
- Notifications reference the tenant's branding and locale settings

**AI Integration:**
- AI can determine notification priority based on context
- AI can generate summary text for complex events
- AI can suggest recipients for ambiguous routing

**Error Handling:**
| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| Email delivery failed | (none - retry silently) | Retry up to 3 times, then mark failed |
| Invalid email address | "Email could not be delivered" | Disable email for user, alert admin |
| WebSocket disconnected | Offline indicator in UI | Queue notifications, deliver on reconnect |
| Template missing | (none - use fallback) | Use system default template, alert admin |

---

### F2: Notification Preferences

**Description:**
User-configurable preferences controlling which notifications are received through which channels.

**Preference Matrix:**

```
Event Type          | In-App | Email | SMS (Future)
--------------------|--------|-------|-------------
case_assigned       |  [x]   |  [x]  |    [ ]
case_sla_warning    |  [x]   |  [ ]  |    [ ]
case_sla_breach     |  [x]   |  [x]  |    [x]    <- Mandatory
attestation_reminder|  [x]   |  [x]  |    [ ]    <- Mandatory
...
```

**Preset Profiles:**

| Profile | Description |
|---------|-------------|
| Real-time | All events, all channels enabled |
| Daily Digest | Non-critical batched to daily email, critical only real-time |
| Critical Only | Only SLA breaches, escalations, security alerts |
| Custom | User-defined combination |

**Quiet Hours:**
- Start/end time with timezone
- Days of week selection
- Critical override toggle
- Multiple quiet hour windows supported

---

### F3: Digest System

**Description:**
Aggregates notifications into periodic summary emails for users who prefer batch communication.

**Digest Workflow:**
1. Notifications flagged for digest queued to user's digest bucket
2. At scheduled time, aggregate all pending notifications
3. Group by category/entity type
4. Sort by priority within groups
5. Generate digest email using template
6. Mark notifications as "sent via digest"

**Digest Content:**
- Executive summary (AI-generated)
- High-priority items section
- Grouped notifications by category
- Action links for each item
- "View all in notification center" link

**Configuration:**
- Frequency: Daily, Weekly
- Delivery time: User's local timezone
- Minimum threshold: Skip digest if fewer than N items
- Include read items: Option to include items already seen in-app

---

### F4: Email Template Engine

**Description:**
A template system for generating consistent, branded email communications.

**Template Structure:**
```
TEMPLATE
├── Header (organization logo, branding)
├── Body (dynamic content with variables)
├── Call-to-Action (button/link)
├── Footer (unsubscribe, contact info)
└── Metadata (subject line, preview text)
```

**Variables Available:**

| Variable | Description | Example |
|----------|-------------|---------|
| `{{recipient_name}}` | User's display name | "Sarah Chen" |
| `{{recipient_first_name}}` | User's first name | "Sarah" |
| `{{organization_name}}` | Tenant name | "Acme Corp" |
| `{{case_number}}` | Case reference | "ETH-2024-00123" |
| `{{case_summary}}` | Brief case description | "Harassment complaint in..." |
| `{{due_date}}` | Formatted due date | "January 25, 2026" |
| `{{days_until_due}}` | Days remaining | "3 days" |
| `{{assignee_name}}` | Person assigned | "John Smith" |
| `{{action_url}}` | Deep link to action | Secure URL with token |
| `{{current_date}}` | Today's date | "January 22, 2026" |

**Conditional Blocks:**
```handlebars
{{#if is_high_priority}}
  <div class="urgent-banner">URGENT: Immediate attention required</div>
{{/if}}

{{#if has_deadline}}
  <p>This action is due by {{due_date}}.</p>
{{/if}}
```

---

### F5: Anonymous Communication Relay

**Description:**
A secure relay system that enables two-way communication between investigators and anonymous reporters without revealing reporter identity.

**Relay Architecture:**
```
REPORTER                    ETHICO PLATFORM                 INVESTIGATOR
                                   │
[Real email] ─────────────────────►│◄──────────────────── [Sends message]
   (stored encrypted,              │
    never shown to client)         │
                                   │
              ◄────────────────────┤ [Forwards message]
              [Message via relay   │
               OR access code]     │
                                   │
[Reply] ──────────────────────────►│───────────────────► [Sees reply in app]
              (via relay email     │
               OR access code)     │
```

**Communication Channels:**

| Channel | Description | Use Case |
|---------|-------------|----------|
| Platform (Access Code) | Reporter checks messages via access code on Ethics Portal | Default for all anonymous |
| Email Relay | Anonymized relay to reporter's email if provided | Reporter preference |

**Relay Email Pattern:**
- From: `noreply@ethico-relay.com`
- Reply-To: `case-{hash}@ethico-relay.com`
- Reporter sees only relay addresses
- Investigator sees only relay addresses
- Real email stored encrypted, never exposed

**Access Code System:**
- 12-character alphanumeric code
- Generated at RIU creation for anonymous reports
- Code displayed on confirmation page
- Lockout after 5 failed attempts
- Optional email reminder with code (if email provided)

---

### F6: Notification Center UI

**Description:**
A centralized UI component for viewing and managing notifications.

**Components:**
- Bell icon with unread badge (header)
- Notification panel (slide-out drawer)
- Full notification center page
- Notification settings page

**Panel Features:**
- Recent notifications (last 20)
- Quick actions (mark read, dismiss, navigate)
- "View all" link to full center
- Filter tabs (All, Unread, Cases, Tasks, etc.)

**Full Center Features:**
- Paginated notification list
- Advanced filters (type, date, entity)
- Search functionality
- Bulk actions (mark read, dismiss)
- Export notification history

---

## 6. Data Model

### Entities

#### Notification

**Purpose:** Represents a single notification delivered to a user.

```prisma
model Notification {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Recipient
  recipient_user_id     String
  recipient_user        User @relation(fields: [recipient_user_id], references: [id])

  // Event Reference
  event_type            NotificationEventType
  event_id              String?                   // External event correlation ID

  // Entity Reference (polymorphic)
  entity_type           String?                   // 'CASE', 'INVESTIGATION', 'POLICY', etc.
  entity_id             String?                   // ID of related entity
  entity_display        String?                   // Cached display text (e.g., "Case ETH-2024-00123")

  // Content
  title                 String                    // Short title for display
  body                  String?                   // Longer description/preview
  body_html             String?                   // Rich HTML content (for email)

  // Priority
  priority              NotificationPriority @default(NORMAL)
  is_mandatory          Boolean @default(false)   // Cannot be disabled by user

  // Delivery
  channels_requested    NotificationChannel[]     // Channels requested for this notification
  channels_delivered    NotificationChannel[]     // Channels actually delivered

  // Status
  status                NotificationStatus @default(PENDING)
  is_read               Boolean @default(false)
  read_at               DateTime?
  is_dismissed          Boolean @default(false)
  dismissed_at          DateTime?

  // Digest
  digest_mode           Boolean @default(false)   // Queued for digest
  digest_sent_at        DateTime?                 // When sent in digest

  // Action
  action_url            String?                   // Deep link to action
  action_label          String?                   // Button text (e.g., "View Case")

  // Metadata
  metadata              Json?                     // Additional context
  expires_at            DateTime?                 // Auto-dismiss after this time

  // Audit
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Indexes
  @@index([organization_id, recipient_user_id, is_read, created_at])
  @@index([organization_id, recipient_user_id, event_type, created_at])
  @@index([organization_id, entity_type, entity_id])
  @@index([organization_id, status, created_at])
  @@index([organization_id, digest_mode, digest_sent_at])
}

enum NotificationEventType {
  // Case Events
  CASE_CREATED
  CASE_ASSIGNED
  CASE_STATUS_CHANGED
  CASE_SLA_WARNING
  CASE_SLA_BREACH
  CASE_ESCALATED
  CASE_MERGED
  REPORTER_MESSAGE_RECEIVED

  // Investigation Events
  INVESTIGATION_ASSIGNED
  INVESTIGATION_STATUS_CHANGED
  INVESTIGATION_CLOSED
  INVESTIGATION_APPROVAL_NEEDED
  INVESTIGATION_APPROVED
  INVESTIGATION_REJECTED

  // Campaign Events
  ATTESTATION_ASSIGNED
  ATTESTATION_REMINDER
  ATTESTATION_OVERDUE
  ATTESTATION_COMPLETED
  DISCLOSURE_ASSIGNED
  DISCLOSURE_REMINDER
  DISCLOSURE_OVERDUE
  DISCLOSURE_SUBMITTED

  // Task Events
  TASK_ASSIGNED
  TASK_DUE_SOON
  TASK_OVERDUE
  TASK_COMPLETED

  // Remediation Events
  REMEDIATION_STEP_ASSIGNED
  REMEDIATION_STEP_DUE_SOON
  REMEDIATION_STEP_OVERDUE
  REMEDIATION_STEP_COMPLETED

  // Policy Events
  POLICY_PUBLISHED
  POLICY_REVIEW_NEEDED
  POLICY_EXPIRING

  // Auth Events
  PASSWORD_RESET_REQUESTED
  PASSWORD_CHANGED
  LOGIN_NEW_DEVICE
  MFA_ENABLED
  MFA_DISABLED
  ACCOUNT_LOCKED

  // System Events
  EXPORT_READY
  IMPORT_COMPLETE
  REPORT_SCHEDULED
  SYSTEM_MAINTENANCE

  // Watch/Follow Events
  WATCHED_CASE_UPDATED
  FOLLOWED_POLICY_UPDATED
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum NotificationStatus {
  PENDING
  QUEUED
  DELIVERED
  FAILED
  EXPIRED
}

enum NotificationChannel {
  IN_APP
  EMAIL
  SMS
  PUSH
}
```

**Status Values:**
| Status | Description | Transitions From | Transitions To |
|--------|-------------|------------------|----------------|
| PENDING | Just created, awaiting processing | - | QUEUED, FAILED |
| QUEUED | In delivery queue | PENDING | DELIVERED, FAILED |
| DELIVERED | Successfully delivered (at least one channel) | QUEUED | EXPIRED |
| FAILED | All delivery attempts failed | PENDING, QUEUED | - |
| EXPIRED | Auto-expired after expires_at | DELIVERED | - |

---

#### NotificationTemplate

**Purpose:** Customizable templates for notification content by event type.

```prisma
model NotificationTemplate {
  id                    String   @id @default(uuid())
  organization_id       String?                   // Null for system defaults
  organization          Organization? @relation(fields: [organization_id], references: [id])

  // Identity
  event_type            NotificationEventType
  channel               NotificationChannel
  language              String @default("en")     // BCP 47 language tag
  name                  String                    // Admin display name

  // Content
  subject               String?                   // Email subject line
  title_template        String                    // Title with {{variables}}
  body_template         String                    // Body with {{variables}}
  body_html_template    String?                   // Rich HTML body (email)

  // Action
  action_url_template   String?                   // URL with {{variables}}
  action_label          String?                   // Button text

  // Configuration
  is_active             Boolean @default(true)
  is_default            Boolean @default(false)   // System default template

  // AI Assistance
  ai_generated          Boolean @default(false)
  ai_generated_at       DateTime?
  ai_model_version      String?

  // Versioning
  version               Int @default(1)
  previous_version_id   String?

  // Audit
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String?
  updated_by_id         String?

  // Unique constraint
  @@unique([organization_id, event_type, channel, language])

  // Indexes
  @@index([organization_id, event_type])
  @@index([organization_id, is_active])
}
```

---

#### NotificationPreference

**Purpose:** User-specific notification preferences per event type and channel.

```prisma
model NotificationPreference {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  user_id               String
  user                  User @relation(fields: [user_id], references: [id])

  // Event Configuration
  event_type            NotificationEventType

  // Channel Preferences (null = use default)
  in_app_enabled        Boolean?
  email_enabled         Boolean?
  sms_enabled           Boolean?
  push_enabled          Boolean?

  // Digest Preference
  digest_mode           Boolean @default(false)   // Include in digest instead of immediate

  // Audit
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Unique constraint
  @@unique([user_id, event_type])

  // Indexes
  @@index([organization_id, user_id])
}
```

---

#### NotificationPreferenceDefault

**Purpose:** Organization-level default preferences and mandatory settings.

```prisma
model NotificationPreferenceDefault {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Event Configuration
  event_type            NotificationEventType

  // Default Settings
  in_app_default        Boolean @default(true)
  email_default         Boolean @default(true)
  sms_default           Boolean @default(false)
  push_default          Boolean @default(false)

  // Mandatory Settings (user cannot disable)
  in_app_mandatory      Boolean @default(false)
  email_mandatory       Boolean @default(false)
  sms_mandatory         Boolean @default(false)

  // Audit
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  updated_by_id         String?

  // Unique constraint
  @@unique([organization_id, event_type])
}
```

---

#### NotificationQuietHours

**Purpose:** User-specific quiet hours configuration.

```prisma
model NotificationQuietHours {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  user_id               String
  user                  User @relation(fields: [user_id], references: [id])

  // Schedule
  is_enabled            Boolean @default(false)
  start_time            String                    // "22:00" (24-hour format)
  end_time              String                    // "07:00"
  timezone              String                    // "America/New_York"
  days_of_week          Int[]                     // [0,1,2,3,4,5,6] (Sun=0)

  // Override
  allow_urgent          Boolean @default(true)    // Allow URGENT priority during quiet hours

  // Audit
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Unique constraint
  @@unique([user_id])
}
```

---

#### NotificationDigestSchedule

**Purpose:** User-specific digest email scheduling.

```prisma
model NotificationDigestSchedule {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  user_id               String
  user                  User @relation(fields: [user_id], references: [id])

  // Schedule
  is_enabled            Boolean @default(false)
  frequency             DigestFrequency @default(DAILY)
  delivery_time         String                    // "09:00" (24-hour format)
  timezone              String                    // "America/New_York"
  day_of_week           Int?                      // For weekly: 1=Monday, 7=Sunday

  // Options
  skip_if_empty         Boolean @default(true)    // Don't send if no notifications
  include_read          Boolean @default(false)   // Include already-read notifications

  // Last Run
  last_sent_at          DateTime?
  next_scheduled_at     DateTime?

  // Audit
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Unique constraint
  @@unique([user_id])
}

enum DigestFrequency {
  DAILY
  WEEKLY
}
```

---

#### EmailLog

**Purpose:** Tracks all email communications for delivery status and auditing.

```prisma
model EmailLog {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Recipient
  recipient_user_id     String?                   // Null for external recipients
  recipient_email       String                    // Actual email address
  recipient_name        String?

  // Notification Link
  notification_id       String?                   // If triggered by notification
  notification          Notification? @relation(fields: [notification_id], references: [id])

  // Email Details
  email_type            EmailType
  subject               String
  body_text             String?                   // Plain text version
  body_html             String?                   // HTML version
  template_id           String?                   // Template used

  // Delivery
  provider              EmailProvider
  provider_message_id   String?                   // ID from email provider

  // Status
  status                EmailStatus @default(QUEUED)
  status_updated_at     DateTime?

  // Tracking
  sent_at               DateTime?
  delivered_at          DateTime?
  opened_at             DateTime?
  clicked_at            DateTime?

  // Errors
  bounce_type           BounceType?               // HARD, SOFT
  bounce_reason         String?
  error_message         String?
  retry_count           Int @default(0)
  next_retry_at         DateTime?

  // Audit
  created_at            DateTime @default(now())

  // Indexes
  @@index([organization_id, recipient_email, created_at])
  @@index([organization_id, status, created_at])
  @@index([organization_id, email_type, created_at])
  @@index([notification_id])
}

enum EmailType {
  NOTIFICATION
  DIGEST
  RELAY_TO_REPORTER
  RELAY_FROM_REPORTER
  PASSWORD_RESET
  MAGIC_LINK
  WELCOME
  SYSTEM
}

enum EmailProvider {
  SENDGRID
  SES
  MAILGUN
  SMTP
  LOCAL  // Development
}

enum EmailStatus {
  QUEUED
  SENDING
  SENT
  DELIVERED
  OPENED
  CLICKED
  BOUNCED
  FAILED
  SUPPRESSED  // User on suppression list
}

enum BounceType {
  HARD    // Permanent failure (invalid address)
  SOFT    // Temporary failure (mailbox full)
}
```

---

#### EmailSuppression

**Purpose:** Tracks email addresses that should not receive emails (bounces, unsubscribes).

```prisma
model EmailSuppression {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Email
  email                 String

  // Reason
  suppression_type      SuppressionType
  reason                String?

  // Source
  email_log_id          String?                   // If from bounce

  // Status
  is_active             Boolean @default(true)
  reactivated_at        DateTime?
  reactivated_by_id     String?

  // Audit
  created_at            DateTime @default(now())

  // Unique constraint
  @@unique([organization_id, email])

  // Indexes
  @@index([organization_id, is_active])
}

enum SuppressionType {
  HARD_BOUNCE
  SOFT_BOUNCE_REPEATED  // After 3 soft bounces
  UNSUBSCRIBE
  COMPLAINT             // Marked as spam
  MANUAL                // Admin suppressed
}
```

---

#### CaseMessage

**Purpose:** Messages between investigators and reporters (including anonymous relay).

```prisma
model CaseMessage {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  case_id               String
  case                  Case @relation(fields: [case_id], references: [id])

  // Direction
  direction             MessageDirection

  // Sender (for TO_REPORTER)
  sender_user_id        String?
  sender_user           User? @relation(fields: [sender_user_id], references: [id])

  // Content
  subject               String?
  content               String
  content_html          String?

  // Attachments
  has_attachments       Boolean @default(false)

  // Delivery
  delivery_channel      MessageDeliveryChannel[]  // How it was/will be delivered

  // Status
  is_read               Boolean @default(false)
  read_at               DateTime?

  // Relay (for anonymous)
  relay_email_log_id    String?                   // Link to email log if sent via relay

  // AI Assistance
  ai_drafted            Boolean @default(false)
  ai_drafted_at         DateTime?
  ai_model_version      String?

  // Audit
  created_at            DateTime @default(now())

  // Indexes
  @@index([organization_id, case_id, created_at])
  @@index([organization_id, direction, is_read])
}

enum MessageDirection {
  TO_REPORTER
  FROM_REPORTER
}

enum MessageDeliveryChannel {
  PLATFORM              // Access code check on Ethics Portal
  EMAIL_RELAY           // Anonymized email relay
}
```

---

#### CaseMessageAttachment

**Purpose:** Attachments on case messages.

```prisma
model CaseMessageAttachment {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  message_id            String
  message               CaseMessage @relation(fields: [message_id], references: [id])

  // File Details
  file_name             String
  file_type             String                    // MIME type
  file_size             Int                       // Bytes
  storage_path          String                    // Cloud storage path

  // Scanning
  virus_scan_status     ScanStatus @default(PENDING)
  virus_scan_at         DateTime?

  // Audit
  created_at            DateTime @default(now())
  created_by_id         String?

  // Indexes
  @@index([organization_id, message_id])
}

enum ScanStatus {
  PENDING
  CLEAN
  INFECTED
  ERROR
}
```

---

#### AnonymousReporterSession

**Purpose:** Manages access codes and relay configuration for anonymous reporters.

```prisma
model AnonymousReporterSession {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // RIU Link
  riu_id                String @unique
  riu                   RiskIntelligenceUnit @relation(fields: [riu_id], references: [id])

  // Access Code
  access_code           String                    // 12-char alphanumeric
  access_code_hash      String                    // For lookup without exposing code

  // Relay Email (if provided)
  reporter_email        String?                   // Encrypted
  relay_email_address   String?                   // Generated relay address
  email_relay_enabled   Boolean @default(false)

  // Security
  failed_access_attempts Int @default(0)
  locked_at             DateTime?
  lock_expires_at       DateTime?

  // Session
  last_accessed_at      DateTime?
  access_count          Int @default(0)

  // Preferences
  preferred_channel     MessageDeliveryChannel @default(PLATFORM)

  // Audit
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Indexes
  @@index([organization_id, access_code_hash])
  @@index([organization_id, relay_email_address])
}
```

---

#### NotificationActivity (Activity Log Extension)

**Purpose:** Tracks notification-specific activities to the unified audit log.

```
Notification activities are logged to the unified AUDIT_LOG table with:
- entity_type: 'NOTIFICATION' | 'EMAIL' | 'MESSAGE'
- action: 'sent', 'delivered', 'opened', 'bounced', 'failed', etc.
- action_description: Natural language description
```

**Standard Notification Action Types:**
| Action | Description | Changes Captured |
|--------|-------------|------------------|
| `notification_created` | Notification generated | Event type, recipient |
| `notification_delivered` | Successfully delivered | Channels delivered |
| `notification_read` | User marked as read | Read timestamp |
| `notification_dismissed` | User dismissed | - |
| `email_sent` | Email sent to provider | Provider message ID |
| `email_delivered` | Email delivered | Delivery timestamp |
| `email_bounced` | Email bounced | Bounce type, reason |
| `email_opened` | Email opened (tracked) | Open timestamp |
| `message_sent` | Case message sent | Direction, channel |
| `message_read` | Case message read | Read timestamp |

---

### Entity Relationships Diagram

```
┌─────────────────────────────┐
│       Organization          │
└──────────────┬──────────────┘
               │
    ┌──────────┼──────────┬───────────────────┐
    │          │          │                   │
    ▼          ▼          ▼                   ▼
┌───────┐ ┌────────┐ ┌──────────────────┐ ┌──────────────────┐
│ User  │ │ Case   │ │ Notification     │ │ EmailLog         │
└───┬───┘ └────┬───┘ │ Template         │ └──────────────────┘
    │          │     └──────────────────┘
    │          │
    │          └────────────────────┐
    │                               │
    ▼                               ▼
┌──────────────────────────┐  ┌──────────────────┐
│ NotificationPreference   │  │ CaseMessage      │
│ NotificationQuietHours   │  │ (reporter comms) │
│ NotificationDigestSchedule│ └──────────────────┘
└──────────────────────────┘

Notification → User (recipient)
Notification → Entity (polymorphic via entity_type + entity_id)
EmailLog → Notification (optional link)
CaseMessage → Case
AnonymousReporterSession → RIU
```

---

## 7. API Specifications

### Endpoints

#### Notification Management

##### List Notifications
```
GET /api/v1/notifications

Query Parameters:
- page: integer (default: 1)
- limit: integer (default: 20, max: 100)
- is_read: boolean (filter)
- event_type: enum (filter)
- entity_type: string (filter)
- entity_id: string (filter)
- priority: enum (filter)
- from_date: ISO8601 (filter)
- to_date: ISO8601 (filter)
- sort: field name (default: created_at)
- order: asc|desc (default: desc)

Response (200):
{
  "data": [
    {
      "id": "uuid",
      "event_type": "CASE_ASSIGNED",
      "title": "Case ETH-2024-00123 assigned to you",
      "body": "A new harassment case has been assigned to you for investigation.",
      "priority": "HIGH",
      "is_read": false,
      "is_mandatory": false,
      "entity": {
        "type": "CASE",
        "id": "uuid",
        "display": "ETH-2024-00123"
      },
      "action": {
        "url": "/cases/uuid",
        "label": "View Case"
      },
      "created_at": "2026-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  },
  "summary": {
    "unread_count": 12,
    "high_priority_count": 3
  }
}

Errors:
- 401: Not authenticated
- 403: Insufficient permissions
```

##### Get Notification
```
GET /api/v1/notifications/:id

Response (200):
{
  "id": "uuid",
  "event_type": "CASE_ASSIGNED",
  "title": "Case ETH-2024-00123 assigned to you",
  "body": "A new harassment case has been assigned to you for investigation.",
  "body_html": "<p>A new harassment case...</p>",
  "priority": "HIGH",
  "is_read": false,
  "read_at": null,
  "is_mandatory": false,
  "channels_requested": ["IN_APP", "EMAIL"],
  "channels_delivered": ["IN_APP", "EMAIL"],
  "status": "DELIVERED",
  "entity": {
    "type": "CASE",
    "id": "uuid",
    "display": "ETH-2024-00123"
  },
  "action": {
    "url": "/cases/uuid",
    "label": "View Case"
  },
  "metadata": {
    "assignee_name": "Sarah Chen",
    "case_category": "Harassment"
  },
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-01-15T10:30:05Z"
}

Errors:
- 401: Not authenticated
- 403: Cannot view other user's notification
- 404: Notification not found
```

##### Mark Notification as Read
```
PATCH /api/v1/notifications/:id/read

Request: (empty body)

Response (200):
{
  "id": "uuid",
  "is_read": true,
  "read_at": "2026-01-15T11:00:00Z"
}

Errors:
- 401: Not authenticated
- 403: Cannot modify other user's notification
- 404: Notification not found
```

##### Mark All Notifications as Read
```
POST /api/v1/notifications/mark-all-read

Request:
{
  "event_types": ["CASE_ASSIGNED", "CASE_STATUS_CHANGED"],  // Optional filter
  "before_date": "2026-01-15T12:00:00Z"  // Optional filter
}

Response (200):
{
  "marked_count": 15
}
```

##### Dismiss Notification
```
DELETE /api/v1/notifications/:id

Response (204): No content

Errors:
- 401: Not authenticated
- 403: Cannot dismiss mandatory notification
- 404: Notification not found
```

##### Get Notification Count/Summary
```
GET /api/v1/notifications/summary

Response (200):
{
  "unread_total": 12,
  "by_priority": {
    "URGENT": 1,
    "HIGH": 3,
    "NORMAL": 6,
    "LOW": 2
  },
  "by_category": {
    "CASE": 5,
    "TASK": 4,
    "CAMPAIGN": 3
  }
}
```

---

#### Notification Preferences

##### Get My Preferences
```
GET /api/v1/notifications/preferences

Response (200):
{
  "profile": "CUSTOM",  // "REALTIME", "DAILY_DIGEST", "CRITICAL_ONLY", "CUSTOM"
  "preferences": [
    {
      "event_type": "CASE_ASSIGNED",
      "in_app": true,
      "email": true,
      "sms": false,
      "digest_mode": false,
      "is_mandatory": {
        "email": true  // Cannot be disabled
      }
    },
    {
      "event_type": "CASE_STATUS_CHANGED",
      "in_app": true,
      "email": false,
      "sms": false,
      "digest_mode": true
    }
  ],
  "quiet_hours": {
    "is_enabled": true,
    "start_time": "22:00",
    "end_time": "07:00",
    "timezone": "America/New_York",
    "days_of_week": [0, 1, 2, 3, 4, 5, 6],
    "allow_urgent": true
  },
  "digest": {
    "is_enabled": true,
    "frequency": "DAILY",
    "delivery_time": "09:00",
    "timezone": "America/New_York",
    "skip_if_empty": true
  }
}
```

##### Update My Preferences
```
PATCH /api/v1/notifications/preferences

Request:
{
  "preferences": [
    {
      "event_type": "CASE_STATUS_CHANGED",
      "email": false,
      "digest_mode": true
    }
  ]
}

Response (200):
{
  "updated_count": 1,
  "preferences": [...]  // Full preferences object
}

Errors:
- 400: Cannot disable mandatory notification
- 401: Not authenticated
```

##### Set Preference Profile
```
POST /api/v1/notifications/preferences/profile

Request:
{
  "profile": "DAILY_DIGEST"
}

Response (200):
{
  "profile": "DAILY_DIGEST",
  "preferences": [...]  // Full preferences after applying profile
}
```

##### Update Quiet Hours
```
PATCH /api/v1/notifications/preferences/quiet-hours

Request:
{
  "is_enabled": true,
  "start_time": "22:00",
  "end_time": "07:00",
  "timezone": "America/New_York",
  "days_of_week": [0, 1, 2, 3, 4, 5, 6],
  "allow_urgent": true
}

Response (200):
{
  "quiet_hours": {...}
}
```

##### Update Digest Schedule
```
PATCH /api/v1/notifications/preferences/digest

Request:
{
  "is_enabled": true,
  "frequency": "DAILY",
  "delivery_time": "09:00",
  "timezone": "America/New_York",
  "skip_if_empty": true
}

Response (200):
{
  "digest": {...}
}
```

---

#### Admin: Organization Notification Settings

##### Get Organization Defaults
```
GET /api/v1/admin/notifications/defaults

Response (200):
{
  "defaults": [
    {
      "event_type": "CASE_ASSIGNED",
      "in_app_default": true,
      "email_default": true,
      "sms_default": false,
      "in_app_mandatory": false,
      "email_mandatory": false,
      "sms_mandatory": false
    }
  ]
}

Requires: SYSTEM_ADMIN or COMPLIANCE_OFFICER role
```

##### Update Organization Defaults
```
PATCH /api/v1/admin/notifications/defaults

Request:
{
  "defaults": [
    {
      "event_type": "CASE_SLA_BREACH",
      "email_mandatory": true
    }
  ]
}

Response (200):
{
  "updated_count": 1,
  "defaults": [...]
}

Requires: SYSTEM_ADMIN role
```

---

#### Email Templates

##### List Templates
```
GET /api/v1/admin/notifications/templates

Query Parameters:
- event_type: enum (filter)
- channel: enum (filter)
- language: string (filter)
- is_active: boolean (filter)

Response (200):
{
  "data": [
    {
      "id": "uuid",
      "event_type": "CASE_ASSIGNED",
      "channel": "EMAIL",
      "language": "en",
      "name": "Case Assigned - English",
      "subject": "New Case Assigned: {{case_number}}",
      "is_active": true,
      "is_default": false,
      "version": 2,
      "updated_at": "2026-01-10T14:00:00Z"
    }
  ],
  "pagination": {...}
}

Requires: SYSTEM_ADMIN role
```

##### Get Template
```
GET /api/v1/admin/notifications/templates/:id

Response (200):
{
  "id": "uuid",
  "event_type": "CASE_ASSIGNED",
  "channel": "EMAIL",
  "language": "en",
  "name": "Case Assigned - English",
  "subject": "New Case Assigned: {{case_number}}",
  "title_template": "Case {{case_number}} assigned to you",
  "body_template": "Dear {{recipient_first_name}},\n\nA new case has been assigned to you...",
  "body_html_template": "<p>Dear {{recipient_first_name}},</p><p>A new case...</p>",
  "action_url_template": "{{base_url}}/cases/{{case_id}}",
  "action_label": "View Case",
  "is_active": true,
  "is_default": false,
  "version": 2,
  "variables": [
    {"name": "recipient_first_name", "description": "Recipient's first name"},
    {"name": "case_number", "description": "Case reference number"},
    {"name": "case_id", "description": "Case UUID for URLs"}
  ],
  "created_at": "2026-01-05T10:00:00Z",
  "updated_at": "2026-01-10T14:00:00Z"
}

Requires: SYSTEM_ADMIN role
```

##### Create Template
```
POST /api/v1/admin/notifications/templates

Request:
{
  "event_type": "CASE_ASSIGNED",
  "channel": "EMAIL",
  "language": "es",
  "name": "Case Assigned - Spanish",
  "subject": "Nuevo Caso Asignado: {{case_number}}",
  "title_template": "Caso {{case_number}} asignado a usted",
  "body_template": "Estimado/a {{recipient_first_name}},\n\nUn nuevo caso...",
  "body_html_template": "<p>Estimado/a {{recipient_first_name}},</p>...",
  "action_url_template": "{{base_url}}/cases/{{case_id}}",
  "action_label": "Ver Caso"
}

Response (201):
{
  "id": "uuid",
  ...full template...
}

Requires: SYSTEM_ADMIN role
```

##### Update Template
```
PATCH /api/v1/admin/notifications/templates/:id

Request:
{
  "subject": "Updated Subject: {{case_number}}",
  "body_template": "Updated body..."
}

Response (200):
{
  "id": "uuid",
  "version": 3,  // Incremented
  ...full template...
}

Requires: SYSTEM_ADMIN role
```

##### Preview Template
```
POST /api/v1/admin/notifications/templates/:id/preview

Request:
{
  "sample_data": {
    "recipient_first_name": "Sarah",
    "case_number": "ETH-2024-00123",
    "case_id": "uuid-example"
  }
}

Response (200):
{
  "subject": "New Case Assigned: ETH-2024-00123",
  "title": "Case ETH-2024-00123 assigned to you",
  "body_text": "Dear Sarah,\n\nA new case has been assigned...",
  "body_html": "<p>Dear Sarah,</p><p>A new case...</p>",
  "action_url": "https://app.ethico.com/cases/uuid-example"
}

Requires: SYSTEM_ADMIN role
```

##### Send Test Email
```
POST /api/v1/admin/notifications/templates/:id/test

Request:
{
  "recipient_email": "admin@example.com",
  "sample_data": {...}
}

Response (200):
{
  "sent": true,
  "email_log_id": "uuid"
}

Requires: SYSTEM_ADMIN role
```

##### AI Generate Template
```
POST /api/v1/admin/notifications/templates/ai-generate

Request:
{
  "event_type": "CASE_ASSIGNED",
  "channel": "EMAIL",
  "language": "fr",
  "tone": "professional",  // "professional", "friendly", "formal"
  "additional_instructions": "Include compliance deadline reminder"
}

Response (200):
{
  "subject": "Nouveau Dossier Assigné: {{case_number}}",
  "title_template": "Dossier {{case_number}} vous a été assigné",
  "body_template": "Cher/Chère {{recipient_first_name}},\n\n...",
  "body_html_template": "<p>Cher/Chère {{recipient_first_name}},</p>...",
  "ai_generated": true,
  "ai_model_version": "claude-3-opus"
}

Requires: SYSTEM_ADMIN role
```

---

#### Case Messages (Reporter Communication)

##### List Messages for Case
```
GET /api/v1/cases/:caseId/messages

Query Parameters:
- page: integer (default: 1)
- limit: integer (default: 50)
- direction: enum (TO_REPORTER, FROM_REPORTER)

Response (200):
{
  "data": [
    {
      "id": "uuid",
      "direction": "TO_REPORTER",
      "sender": {
        "id": "uuid",
        "name": "Sarah Chen"
      },
      "subject": "Additional Information Request",
      "content": "We would like to request additional details...",
      "content_html": "<p>We would like...</p>",
      "has_attachments": false,
      "delivery_channels": ["PLATFORM", "EMAIL_RELAY"],
      "is_read": true,
      "read_at": "2026-01-16T09:00:00Z",
      "created_at": "2026-01-15T14:00:00Z"
    },
    {
      "id": "uuid",
      "direction": "FROM_REPORTER",
      "sender": null,  // Anonymous
      "subject": null,
      "content": "Here is the additional information you requested...",
      "has_attachments": true,
      "delivery_channels": ["PLATFORM"],
      "is_read": false,
      "created_at": "2026-01-16T10:00:00Z"
    }
  ],
  "pagination": {...}
}

Requires: Case access permission
```

##### Send Message to Reporter
```
POST /api/v1/cases/:caseId/messages

Request:
{
  "subject": "Follow-up Question",
  "content": "Thank you for your report. We have a follow-up question...",
  "content_html": "<p>Thank you for your report...</p>",
  "delivery_channels": ["PLATFORM", "EMAIL_RELAY"]  // Optional, defaults based on reporter preference
}

Response (201):
{
  "id": "uuid",
  "direction": "TO_REPORTER",
  "sender": {
    "id": "uuid",
    "name": "Sarah Chen"
  },
  "content": "Thank you for your report...",
  "delivery_channels": ["PLATFORM", "EMAIL_RELAY"],
  "status": "SENT",
  "created_at": "2026-01-15T14:00:00Z"
}

Requires: Investigator permission on case
```

##### Mark Message as Read
```
PATCH /api/v1/cases/:caseId/messages/:messageId/read

Response (200):
{
  "id": "uuid",
  "is_read": true,
  "read_at": "2026-01-16T09:00:00Z"
}
```

##### AI Draft Message
```
POST /api/v1/cases/:caseId/messages/ai-draft

Request:
{
  "intent": "request_clarification",  // "request_clarification", "provide_update", "thank_reporter", "close_case"
  "specific_question": "What date did this incident occur?",
  "tone": "empathetic"  // "professional", "empathetic", "formal"
}

Response (200):
{
  "subject": "Request for Clarification",
  "content": "Dear Reporter,\n\nThank you for bringing this matter to our attention...",
  "content_html": "<p>Dear Reporter,</p>...",
  "ai_generated": true,
  "ai_model_version": "claude-3-opus"
}

Requires: Investigator permission on case
```

---

#### Anonymous Reporter Access (Ethics Portal)

##### Check Access Code
```
POST /api/v1/portal/reporter/access

Request:
{
  "access_code": "ABC123XYZ789"
}

Response (200):
{
  "session_token": "jwt-token",  // Short-lived token for subsequent requests
  "case_status": "UNDER_INVESTIGATION",
  "has_unread_messages": true,
  "unread_count": 2,
  "last_update": "2026-01-15T14:00:00Z"
}

Errors:
- 401: Invalid access code
- 429: Too many failed attempts (locked out)
```

##### Get Case Status (Anonymous)
```
GET /api/v1/portal/reporter/case

Headers:
- Authorization: Bearer {session_token}

Response (200):
{
  "reference_number": "ETH-2024-00123",
  "status": "UNDER_INVESTIGATION",
  "status_description": "Your report is currently being investigated.",
  "submitted_at": "2026-01-10T10:00:00Z",
  "last_update": "2026-01-15T14:00:00Z",
  "messages": [
    {
      "id": "uuid",
      "direction": "TO_REPORTER",
      "content": "We have received your report and will investigate...",
      "is_read": false,
      "created_at": "2026-01-12T11:00:00Z"
    }
  ]
}
```

##### Submit Reply (Anonymous)
```
POST /api/v1/portal/reporter/messages

Headers:
- Authorization: Bearer {session_token}

Request:
{
  "content": "Here is additional information..."
}

Response (201):
{
  "id": "uuid",
  "content": "Here is additional information...",
  "created_at": "2026-01-16T10:00:00Z"
}
```

##### Update Communication Preference (Anonymous)
```
PATCH /api/v1/portal/reporter/preferences

Headers:
- Authorization: Bearer {session_token}

Request:
{
  "preferred_channel": "PLATFORM",  // or "EMAIL_RELAY"
  "email": "reporter@example.com"  // Required if EMAIL_RELAY
}

Response (200):
{
  "preferred_channel": "EMAIL_RELAY",
  "email_relay_enabled": true
}
```

---

#### Email Logs (Admin)

##### List Email Logs
```
GET /api/v1/admin/notifications/email-logs

Query Parameters:
- page: integer (default: 1)
- limit: integer (default: 50)
- recipient_email: string (filter)
- status: enum (filter)
- email_type: enum (filter)
- from_date: ISO8601 (filter)
- to_date: ISO8601 (filter)

Response (200):
{
  "data": [
    {
      "id": "uuid",
      "recipient_email": "user@example.com",
      "email_type": "NOTIFICATION",
      "subject": "Case ETH-2024-00123 assigned to you",
      "status": "DELIVERED",
      "sent_at": "2026-01-15T10:30:00Z",
      "delivered_at": "2026-01-15T10:30:05Z",
      "opened_at": "2026-01-15T11:00:00Z"
    }
  ],
  "pagination": {...},
  "summary": {
    "total_sent": 1000,
    "delivered_rate": 98.5,
    "open_rate": 45.2,
    "bounce_rate": 1.2
  }
}

Requires: SYSTEM_ADMIN role
```

##### Get Email Log Detail
```
GET /api/v1/admin/notifications/email-logs/:id

Response (200):
{
  "id": "uuid",
  "recipient_email": "user@example.com",
  "recipient_name": "John Smith",
  "email_type": "NOTIFICATION",
  "subject": "Case ETH-2024-00123 assigned to you",
  "body_text": "...",
  "body_html": "...",
  "template_id": "uuid",
  "provider": "SENDGRID",
  "provider_message_id": "sg-msg-123",
  "status": "BOUNCED",
  "bounce_type": "HARD",
  "bounce_reason": "Invalid email address",
  "sent_at": "2026-01-15T10:30:00Z",
  "created_at": "2026-01-15T10:30:00Z"
}

Requires: SYSTEM_ADMIN role
```

##### List Suppressed Emails
```
GET /api/v1/admin/notifications/suppressions

Query Parameters:
- page: integer
- limit: integer
- suppression_type: enum (filter)
- is_active: boolean (filter)

Response (200):
{
  "data": [
    {
      "id": "uuid",
      "email": "bounced@example.com",
      "suppression_type": "HARD_BOUNCE",
      "reason": "Invalid email address",
      "is_active": true,
      "created_at": "2026-01-10T12:00:00Z"
    }
  ],
  "pagination": {...}
}

Requires: SYSTEM_ADMIN role
```

##### Reactivate Suppressed Email
```
POST /api/v1/admin/notifications/suppressions/:id/reactivate

Response (200):
{
  "id": "uuid",
  "email": "bounced@example.com",
  "is_active": false,
  "reactivated_at": "2026-01-16T10:00:00Z"
}

Requires: SYSTEM_ADMIN role
```

---

## 8. UI/UX Specifications

### Navigation Placement

The Notifications module is accessible from multiple locations:
- **Bell Icon (Header):** Notification panel on all pages
- **Settings > Notifications:** Preference configuration
- **Admin > Notifications:** Template and organization settings (admin only)

### Key Screens

#### Notification Center (Panel/Drawer)

**Purpose:** Quick access to recent notifications without leaving current context.

**Components:**
- Header with unread count and "Mark all read" action
- Tab filters: All, Unread, Cases, Tasks, Campaigns
- Notification list (virtualized for performance)
- Each item: icon, title, preview, timestamp, read indicator
- "View all" link to full center

**Interactions:**
- Click bell icon → opens panel
- Click notification → navigates to entity, marks read
- Hover notification → shows "Dismiss" action
- Click outside or press Escape → closes panel

**Design Notes:**
- Panel width: 400px
- Max height: 80vh with scroll
- Grouped by date (Today, Yesterday, This Week, Older)
- High-priority notifications have accent color border

---

#### Notification Center (Full Page)

**Purpose:** Comprehensive notification management with filtering and bulk actions.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Notifications                              [Mark All Read] [⚙️] │
├─────────────────────────────────────────────────────────────────┤
│  [All] [Unread] [Cases] [Tasks] [Campaigns] [System]            │
├────────────────────────────┬────────────────────────────────────┤
│                            │                                     │
│  🔍 Search notifications   │  Filters                           │
│                            │  □ Unread only                     │
│  ┌──────────────────────┐  │  Date: [Last 7 days ▼]             │
│  │ ⚠️ HIGH PRIORITY     │  │  Priority: [All ▼]                 │
│  │ Case ETH-2024-00123  │  │                                     │
│  │ assigned to you      │  │  [Apply] [Clear]                   │
│  │ 2 hours ago          │  │                                     │
│  └──────────────────────┘  │                                     │
│                            │                                     │
│  ┌──────────────────────┐  │                                     │
│  │ 📋 NORMAL            │  │                                     │
│  │ Investigation closed │  │                                     │
│  │ 5 hours ago          │  │                                     │
│  └──────────────────────┘  │                                     │
│                            │                                     │
│  [Load more...]            │                                     │
│                            │                                     │
└────────────────────────────┴────────────────────────────────────┘
```

---

#### Notification Preferences Page

**Purpose:** User configuration of notification preferences.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Notification Settings                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Quick Settings                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Profile: [Real-time ▼] [Daily Digest] [Critical Only] [Custom] │
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Quiet Hours                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [x] Enable quiet hours                                      ││
│  │     From: [22:00] To: [07:00] Timezone: [America/New_York ▼]││
│  │     Days: [M][T][W][T][F][S][S]                             ││
│  │     [x] Allow urgent notifications during quiet hours       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Digest Schedule                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [x] Send daily digest email                                 ││
│  │     Delivery time: [09:00] Timezone: [America/New_York ▼]   ││
│  │     [x] Skip if no notifications                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Notification Types                                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                          │ In-App │ Email │ Digest │        ││
│  │ ───────────────────────────────────────────────────         ││
│  │ Case Management                                              ││
│  │   Case Assigned          │  [x]   │ [x]🔒│  [ ]   │        ││
│  │   Case Status Changed    │  [x]   │  [ ] │  [x]   │        ││
│  │   SLA Warning            │  [x]   │  [x] │  [ ]   │        ││
│  │   SLA Breach             │  [x]🔒│ [x]🔒│  [ ]   │        ││
│  │                                                              ││
│  │ Campaigns                                                    ││
│  │   Attestation Reminder   │  [x]🔒│ [x]🔒│  [ ]   │        ││
│  │   ...                                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  🔒 = Mandatory (set by your organization)                      │
│                                                                 │
│  [Save Changes]                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

#### Template Editor (Admin)

**Purpose:** Create and edit notification templates.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Edit Template: Case Assigned - English              [Save] [×] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Event Type: Case Assigned                                      │
│  Channel: Email                                                 │
│  Language: English                                              │
│                                                                 │
│  Subject Line                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ New Case Assigned: {{case_number}}                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Body (HTML)                              Variables             │
│  ┌─────────────────────────────────┐      ┌───────────────────┐│
│  │ [B] [I] [U] [Link] [Variable ▼] │      │ {{recipient_name}}││
│  │                                 │      │ {{case_number}}   ││
│  │ Dear {{recipient_first_name}},  │      │ {{case_summary}}  ││
│  │                                 │      │ {{due_date}}      ││
│  │ A new case has been assigned... │      │ {{action_url}}    ││
│  │                                 │      │ ...               ││
│  │                                 │      └───────────────────┘│
│  └─────────────────────────────────┘                           │
│                                                                 │
│  Preview                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Subject: New Case Assigned: ETH-2024-00123                  ││
│  │                                                              ││
│  │ Dear Sarah,                                                  ││
│  │                                                              ││
│  │ A new case has been assigned to you for investigation.      ││
│  │ ...                                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [Send Test Email]  [🤖 AI Generate Translation]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

#### Case Message Thread

**Purpose:** View and compose messages with reporter from case detail page.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Reporter Communication                              [Expand ↗] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ To Reporter - Jan 15, 2026 2:00 PM                          ││
│  │ From: Sarah Chen                                             ││
│  │                                                              ││
│  │ "We would like to request additional details about the      ││
│  │ incident date..."                                            ││
│  │                                                              ││
│  │ ✓ Delivered via Platform & Email Relay                      ││
│  │ ✓ Read Jan 16, 2026 9:00 AM                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ From Reporter - Jan 16, 2026 10:00 AM                       ││
│  │                                                              ││
│  │ "Here is the additional information you requested..."       ││
│  │                                                              ││
│  │ 📎 supporting_document.pdf (1.2 MB)                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Compose Message                                    [🤖 AI] ││
│  │ ┌───────────────────────────────────────────────────────┐  ││
│  │ │                                                       │  ││
│  │ │ Type your message...                                  │  ││
│  │ │                                                       │  ││
│  │ └───────────────────────────────────────────────────────┘  ││
│  │ [📎 Attach] □ Send via email relay        [Send Message]   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

#### Anonymous Reporter Status Check (Ethics Portal)

**Purpose:** Allow anonymous reporters to check case status and respond to messages.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]                     Check Report Status                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Enter your access code to view your report status              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │    [ A ] [ B ] [ C ] [ 1 ] [ 2 ] [ 3 ] [ X ] ...            ││
│  │                                                              ││
│  │    Access Code: ABC-123-XYZ-789                             ││
│  │                                                              ││
│  │    [Check Status]                                            ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Your identity is protected. We cannot see who you are.         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

After successful access:

┌─────────────────────────────────────────────────────────────────┐
│  [Logo]                     Your Report Status                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Reference: ETH-2024-00123                                      │
│  Status: Under Investigation                                    │
│  Submitted: January 10, 2026                                    │
│  Last Update: January 15, 2026                                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Messages (2)                                      [+ Reply]  ││
│  │                                                              ││
│  │ 🔵 From Investigator - Jan 15                               ││
│  │ "We would like additional information..."                   ││
│  │ [View Full Message]                                          ││
│  │                                                              ││
│  │ ◯ From Investigator - Jan 12                                ││
│  │ "Thank you for your report. We are reviewing..."            ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [Log Out] (Session expires in 15 minutes)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### AI Panel Design

**Location:** Contextual AI assistance in template editor and message composer

**Content:**
- AI-generated draft suggestions
- Translation assistance
- Tone adjustment options
- Variable insertion suggestions

**User Controls:**
- Generate button
- Edit generated content
- Regenerate with different parameters
- Insert into editor

---

## 9. Migration Considerations

### Data Mapping from Competitor Systems

| Source System | Source Field | Target Field | Transformation |
|---------------|--------------|--------------|----------------|
| NAVEX | notification_settings | NotificationPreference | Map event types, extract channel prefs |
| NAVEX | email_templates | NotificationTemplate | Convert template syntax, extract variables |
| EQS | alert_config | NotificationPreferenceDefault | Map to event types |
| CSV Import | user_preferences | NotificationPreference | Parse preference columns |

### Handling Sparse Data

| Field | If Missing | Default/Fallback |
|-------|------------|------------------|
| User preferences | All null | Use organization defaults |
| Templates | None customized | Use system defaults |
| Quiet hours | Not configured | Disabled (24/7 notifications) |
| Digest schedule | Not configured | Disabled (immediate delivery) |

### Post-Migration AI Enrichment

After migration, AI can:
- [ ] Analyze notification patterns and suggest preference optimizations
- [ ] Review templates for tone consistency
- [ ] Identify redundant or conflicting notification rules
- [ ] Suggest template translations for missing languages

---

## 10. Integration Points

### Internal Module Integrations

| Module | Integration Type | Data Exchanged |
|--------|------------------|----------------|
| Case Management | Event Producer | case_created, case_assigned, case_status_changed, reporter_message |
| Investigations | Event Producer | investigation_assigned, investigation_closed, approval_needed |
| Campaigns | Event Producer | attestation_reminder, disclosure_due, campaign_complete |
| Tasks | Event Producer | task_assigned, task_due, task_overdue |
| Policies | Event Producer | policy_published, review_needed, attestation_required |
| Authentication | Event Producer | password_reset, login_alerts, mfa_events |
| Analytics | Feed | Notification delivery metrics, engagement rates |
| Audit Log | Feed | All notification activities logged |

### External System Integrations

| System | Integration Method | Purpose |
|--------|-------------------|---------|
| SendGrid | REST API | Primary email delivery |
| AWS SES | REST API | Backup email delivery |
| Twilio | REST API | SMS delivery (future) |
| Socket.io | WebSocket | Real-time in-app notifications |

### Event Bus Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐
│ Case Module │───▶│             │───▶│ Notification Service│
├─────────────┤    │  Event Bus  │    ├─────────────────────┤
│ Policy Module│───▶│  (BullMQ)   │───▶│ - Recipient Lookup  │
├─────────────┤    │             │    │ - Preference Check  │
│ Campaign Module│─▶│             │    │ - Template Render   │
└─────────────┘    └─────────────┘    │ - Channel Dispatch  │
                                       └─────────────────────┘
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        │                       │                       │
                        ▼                       ▼                       ▼
                 ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
                 │ In-App Queue │         │ Email Queue │         │ SMS Queue   │
                 │ (WebSocket)  │         │ (SendGrid)  │         │ (Twilio)    │
                 └─────────────┘         └─────────────┘         └─────────────┘
```

---

## 11. Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Notification creation to delivery (in-app) | < 500ms |
| Notification creation to email queued | < 1 second |
| Email delivery (95th percentile) | < 5 minutes |
| Notification center load time | < 1 second |
| Template render time | < 100ms |
| WebSocket message latency | < 100ms |

### Scalability

| Metric | Target |
|--------|--------|
| Notifications per tenant per day | 100,000+ |
| Concurrent WebSocket connections per tenant | 1,000+ |
| Email send rate | 10,000/hour |
| Digest processing (concurrent users) | 10,000+ |

### Reliability

| Metric | Target |
|--------|--------|
| Email delivery success rate | > 98% |
| Notification delivery guarantee | At-least-once |
| System availability | > 99.5% |
| Data retention (notifications) | 90 days active, 2 years archived |
| Data retention (email logs) | 1 year |

### Security

- All data filtered by organization_id (RLS enforced)
- Reporter email addresses encrypted at rest (AES-256)
- Access code hashed for storage
- Rate limiting on access code attempts (5 failed = lockout)
- Email content sanitized before rendering
- Secure tokens for email action links (expire after 24 hours)
- Audit trail for all notification activities

---

## 12. Checklist Verification

### AI-First Checklist Compliance

**Schema Design:**
- [x] Semantic field naming used throughout
- [x] Narrative fields (content, body, description) included
- [x] Activity log designed using unified AUDIT_LOG
- [x] Source tracking fields included (email provider, template version)
- [x] AI enrichment fields included (ai_drafted, ai_generated)
- [x] Graceful degradation for sparse data (defaults cascade)

**Feature Design:**
- [x] Chat interaction examples documented
- [x] AI assistance opportunities identified (draft messages, translate templates)
- [x] Conversation storage planned (AI interactions logged)
- [x] AI action audit designed (ai_drafted flag on messages)
- [x] Migration impact assessed
- [x] Structured + unstructured data captured

**API Design:**
- [x] AI-friendly responses with context
- [x] Bulk operations supported (mark all read)
- [x] Natural language search available (notification search)

**UI Design:**
- [x] AI panel space allocated (template editor, message composer)
- [x] Context preservation designed (notification links to entities)
- [x] Self-service configuration enabled (preferences page)

**Cross-Cutting:**
- [x] organization_id on all tables
- [x] business_unit_id where applicable (notifications scoped to user's BUs)
- [x] Audit trail complete (all activities logged)
- [x] PII handling documented (reporter email encrypted)

---

## 13. Appendix

### Glossary

| Term | Definition |
|------|------------|
| **Notification** | A platform alert delivered to a user about an event |
| **Channel** | Delivery method: in-app, email, SMS, push |
| **Digest** | Aggregated summary email sent on a schedule |
| **Template** | Reusable content structure with variables |
| **Relay** | Anonymizing intermediary for reporter communication |
| **Access Code** | Unique identifier for anonymous reporters to check status |
| **Suppression** | Email address blocked from receiving due to bounces/unsubscribe |
| **Quiet Hours** | Time period when non-urgent notifications are held |

### Event Type Definitions

| Event Type | Description | Default Priority |
|------------|-------------|------------------|
| CASE_CREATED | New case created in system | NORMAL |
| CASE_ASSIGNED | Case assigned to investigator | HIGH |
| CASE_STATUS_CHANGED | Case status transition | NORMAL |
| CASE_SLA_WARNING | 80% of SLA time elapsed | HIGH |
| CASE_SLA_BREACH | SLA deadline passed | URGENT |
| CASE_ESCALATED | Case escalated per rules | URGENT |
| REPORTER_MESSAGE_RECEIVED | Anonymous reporter sent message | HIGH |
| INVESTIGATION_ASSIGNED | Investigation assigned | HIGH |
| INVESTIGATION_APPROVAL_NEEDED | Findings need approval | HIGH |
| ATTESTATION_REMINDER | Policy attestation due soon | NORMAL |
| ATTESTATION_OVERDUE | Attestation deadline passed | HIGH |
| TASK_ASSIGNED | Task assigned to user | NORMAL |
| TASK_OVERDUE | Task deadline passed | HIGH |

### Template Variable Reference

| Variable | Context | Description |
|----------|---------|-------------|
| `{{recipient_name}}` | All | Full name of recipient |
| `{{recipient_first_name}}` | All | First name of recipient |
| `{{recipient_email}}` | All | Email address of recipient |
| `{{organization_name}}` | All | Tenant organization name |
| `{{organization_logo_url}}` | All | URL to organization logo |
| `{{base_url}}` | All | Platform base URL |
| `{{current_date}}` | All | Today's date (formatted) |
| `{{case_number}}` | Case events | Case reference number |
| `{{case_id}}` | Case events | Case UUID (for URLs) |
| `{{case_summary}}` | Case events | Brief case description |
| `{{case_status}}` | Case events | Current case status |
| `{{case_category}}` | Case events | Case category name |
| `{{assignee_name}}` | Assignment events | Person assigned |
| `{{due_date}}` | Deadline events | Formatted due date |
| `{{days_until_due}}` | Deadline events | Days remaining (number) |
| `{{policy_name}}` | Policy events | Policy title |
| `{{policy_version}}` | Policy events | Policy version number |
| `{{action_url}}` | All | Deep link to relevant action |

### Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | February 2026 | Initial draft | Claude |

---

*End of Notifications & Email Module PRD*
