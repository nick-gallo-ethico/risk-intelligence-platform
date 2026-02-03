# Phase 7: Notifications & Email - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver event-driven notifications through multiple channels (email, in-app) with user preferences, template management, and delivery tracking. Users receive notifications for case assignments, status changes, SLA breaches, and other workflow events. In-app notification center shows unread count and allows mark-as-read. Users can configure notification preferences per event type.

**Not in scope:** SMS notifications, push notifications, Slack/Teams integrations, smart email routing (auto-parsing replies to create comments).

</domain>

<decisions>
## Implementation Decisions

### Notification Events

**Categorization approach:**
- Categorize by action type (not entity type or urgency): Assignments, Deadlines, Mentions, Status Updates, Escalations
- Action types answer "what do I need to DO?" and naturally separate actionable from informational

**Event scope:**
- Comprehensive events: Core workflow events + comments, interview scheduling, remediation updates, campaign completions, approvals
- Excludes pure audit events (entity creation, view events)

**SLA escalation:**
- Role-based escalation with configurable thresholds
- Tiered warnings: 72h → 24h → breach → critical (configurable)
- At breach: notify assignee + supervisor
- At critical threshold (default 48h overdue): escalate to compliance officer
- Matches remediation escalation pattern for consistency

**Delivery timing:**
- Smart batching: urgent events (assignments, SLA warnings, mentions, approvals) real-time; lower-priority events (status changes, comments, completions) batched into daily digest
- In-app notifications always real-time
- Email batching prevents inbox overload

**Event aggregation:**
- Smart aggregation: similar low-priority events (comments, status changes, progress) grouped within time window
- Never aggregate: assignments, SLA warnings, mentions, approvals, escalations always individual

**Quiet hours:**
- Org-defined default quiet hours with user override capability

**OOO handling:**
- Delegate to backup: OOO users designate backup contact who receives urgent notifications
- Non-urgent notifications queue for return summary
- Deactivated users have work permanently reassigned

**Role-based defaults:**
- Defaults based on role (what notification types) AND team membership (which entities)
- CO sees org-wide; Investigator sees team cases; Employee sees personal tasks

### Email Templates

**Branding:**
- White-label with tenant branding: tenant configures logo, name, contact email, primary color
- Ethico controls template structure, copy validation, and deliverability

**Entity context:**
- Actionable summary: include case number, category, priority, deadline, assigned by
- Never include: names of complainants/subjects, allegation details, sensitive findings
- Enables triage without exposing confidential information

**Copy customization:**
- Full copy control: tenants can edit all email text, subject to validation

**Template organization:**
- One template per event (~40 templates organized by category)
- Categories: Case/Investigation, Interviews, Remediation, Approvals/Workflow, Campaigns/Attestations, Account/System
- Shared base template for consistent branding

**Reply handling:**
- Team inbox: reply-to set to tenant's compliance team email
- Manual handling of replies
- Smart routing deferred to future phase

**Multi-language:**
- Recipient language preference: emails sent in recipient's language from user profile

**Delivery tracking:**
- Delivery tracking only: track delivered, bounced, failed
- No open/click tracking for privacy
- Essential for compliance defensibility

**Email classification:**
- Categorize by purpose: transactional vs promotional
- Transactional (no unsubscribe): assignments, deadlines, required actions, approvals
- Promotional (unsubscribe available): digests, summaries, progress updates

### In-App Notification UX

**Notification center placement:**
- Header bell icon with dropdown panel (standard SaaS pattern)
- "View all" links to full page for bulk management

**Notification grouping:**
- Grouped by time: Today, Yesterday, This Week sections
- Entity grouping available on full page as alternate view

**Actions:**
- Hover actions: clean UI by default, hover reveals Mark Read and Archive
- Click notification navigates to entity and auto-marks read
- Full page can have inline actions

**Real-time delivery:**
- Hybrid approach: WebSocket for active tabs (instant), poll fallback for background tabs (60s)
- Immediate poll on tab focus to catch up on missed notifications
- Leverages existing Socket.io infrastructure

### User Preferences

**Granularity:**
- Event type level: 8-10 event categories with per-channel toggles
- Categories: Assignments, Deadlines, Approvals, Mentions, Interviews, Status Updates, Comments, Completions, Digests
- ~18 manageable toggles total

**Default preferences:**
- Balanced defaults: urgent events (assignments, deadlines, mentions, approvals, interviews) on for both channels
- FYI events (status updates, comments, completions) in-app only, email off by default
- Daily digest enabled by default
- Works well out of box, users can customize

**Org control:**
- Org-enforced minimums: organizations can require critical notifications (SLA warnings, assignments, escalations) that users cannot disable
- Non-critical preferences remain user-controlled
- Provides regulatory defensibility while respecting user autonomy

### Claude's Discretion

- Email template HTML/CSS implementation
- Specific retry intervals for failed deliveries
- WebSocket reconnection strategy details
- Notification persistence/cleanup policy
- Animation and transition effects in UI

</decisions>

<specifics>
## Specific Ideas

- "Action type categorization answers 'what do I need to DO?' not 'what entity is this about?'"
- Daily digest batches lower-priority updates into single end-of-day email
- Smart aggregation groups comments like "3 new comments on Case #0912" but never hides assignments
- Backup contact receives clear notification: "[BACKUP] Case assigned to Jane (OOO until Jan 22)"
- Email footer shows "Required by your organization" for enforced notifications user cannot disable
- Notification dropdown shows time sections for quick "what's new since yesterday" scanning

</specifics>

<deferred>
## Deferred Ideas

- Smart email routing (auto-parse replies to create case comments) - future enhancement after V1
- SMS notifications - separate phase if needed
- Mobile push notifications - separate phase
- Slack/Teams integrations - separate phase
- Snooze functionality for notifications - V2 feature

</deferred>

---

*Phase: 07-notifications-email*
*Context gathered: 2026-02-03*
