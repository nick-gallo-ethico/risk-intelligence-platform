# Phase 1: Foundation Infrastructure - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the platform's nervous system - event bus, job queues, audit logging, workflow engine, search infrastructure, form engine, reporting framework, and file storage. All subsequent modules depend on this foundation. This is infrastructure that systems RUN, not something users directly SEE.

</domain>

<decisions>
## Implementation Decisions

### Job Processing Behavior

**Retry Strategy:**
- Job-type specific retry configurations (not one-size-fits-all)
- AI calls get more retries than transient operations
- Exponential backoff pattern

**Dead-Letter Queue:**
- Dashboard counter for DLQ monitoring
- Email alerts to ops team when DLQ has unprocessed items (daily digest)

**Priority Queues:**
- Three-tier priority: High / Normal / Low
- SLA breach checks run High, bulk reports run Low, user-facing requests run Normal

**Tenant Fairness:**
- Per-tenant rate limiting to prevent one noisy tenant from starving others
- Each tenant gets fair share of queue capacity

**Scheduling:**
- Tenant-configurable schedules for recurring jobs (within limits)
- Sensible defaults per job type (e.g., SLA checks every 5min, reminders daily at 9am)

**Admin Capabilities:**
- Replay UI for admins - view failed jobs, see payload, click to retry/dismiss
- Claude decides UX details for the replay interface

**Dedicated Queues:**
- Separate AI queue with its own workers/capacity
- AI jobs don't compete with general job processing

**AI Fallback:**
- Try backup providers (Azure OpenAI) after Claude failures
- Graceful degradation if all providers fail ("AI unavailable" - feature works without AI)

**Claude's Discretion:**
- Timeout strategy per job type (checkpoint vs generous timeout)
- Real-time progress display decisions (progress for imports, status for quick jobs)
- Job cancellation UX (user-cancelable for their own requests)

### Audit Log Granularity

**Change Detail:**
- Full diff: store old_value and new_value for each changed field
- Enables full reconstruction for forensics

**Read Logging:**
- Mutations + sensitive reads (compliance industry standard)
- Sensitive reads scoped to: Case views, RIU views, Person/Employee data views, Report exports, Search queries that return results

**Natural Language Format:**
- Rich context: "John Smith assigned Case #123 (Harassment - Chicago Office) to Sarah Jones"
- Store both natural language description AND structured fields for querying:
  ```
  actionDescription: "John Smith assigned Case #123 (Harassment - Chicago Office) to Sarah Jones"
  actorUserId: "user_abc"
  entityType: "CASE"
  entityId: "case_123"
  action: "assigned"
  changes: { assignedTo: { old: null, new: "user_xyz" } }
  ```

**Retention:**
- 7 years (industry standard for compliance)

**Tamper Evidence:**
- Hash chain with pragmatic implementation (periodic checkpoint hashes or database-level immutability)
- Goal is demonstrable integrity to auditors, not blockchain-level paranoia

**Log Structure:**
- Unified AUDIT_LOG table with entity_type column
- Partition by created_at (time-based queries most common)
- Indexes: [organizationId, createdAt], [organizationId, entityType, entityId], [organizationId, actorUserId]

**Access Control:**
- Role-based audit access:
  - System Admin: Full query across org
  - CCO/Compliance Officer: Full query across org
  - Investigator: Audit trail for assigned cases only
  - Other users: Activity tab on entities they can view

**Access Context:**
- Full context captured: IP address, user agent, session ID, optional geo-location (derived from IP at write time)
- GDPR handling: 2-3 year retention for access context, then anonymize/purge

### Workflow Engine Design

**Configuration Interfaces:**
Three interfaces editing the same underlying workflow:
1. Visual drag-drop builder (Compliance Officers)
2. AI chat - describe in plain English, AI generates rules (Anyone)
3. Template library for quick setup

**Transition Rules:**
- Full expression engine with tiered interfaces:
  1. AI chat for non-technical users
  2. Visual builder with simple conditions
  3. Expression editor for full boolean logic, functions, nested conditions

**Approval Timeouts:**
- Org-wide defaults for timeout and escalation
- Individual steps can override

**Parallel Execution:**
- Full DAG support - steps can fork/join
- Example: notify legal AND HR simultaneously, continue when both complete

**Versioning:**
- Version on publish
- In-flight items complete on their version, new items use updated workflow

**Manual Overrides:**
- Admins can override any workflow step
- Action logged with reason to audit trail

**SLA Tracking:**
- Both stage-level and workflow-level SLAs
- Stage SLAs roll up, but workflow SLA is independent
- Example: Pass all stages but still breach overall

**SLA Actions:**
- Full configurable automation:
  - At Risk (80%): Notify assignee, optionally notify manager
  - Breached: Notify both, escalate visibility (CCO dashboard flag), optional auto-reassign
  - Critically Breached (24h+): Executive notification, optional auto-reassign to manager
- Auto-reassignment is opt-in per workflow

**Composability:**
- Sub-workflows supported - define "Approval Chain" once, reuse across workflows

**Cross-Workflow Communication:**
- Events only (not direct triggers)
- Loose coupling via event bus
- UI shows relationships ("this Case was created because Disclosure #456 exceeded threshold")

**Simulation/Testing:**
- Full simulation with mock data
- Step through execution, preview notifications, show SLA timeline
- AI chat can simulate conversationally

**Scheduled Triggers:**
- Events only - scheduler emits events, workflows react
- UI abstracts this: user sees "Trigger: Every Monday 9am"

**Assignment Strategies:**
All supported:
- Specific user (specialist routing)
- Round-robin (fair distribution)
- Least-loaded (capacity-aware)
- Manager-of (reporter's manager for disclosures)
- Team queue (claim from pool)
- Skill-based (match attributes to certifications)
- Geographic (location/timezone)

**Step Failure:**
- Configurable per step with sensible defaults:
  - Critical steps (approvals, assignments): pause on failure
  - Non-critical steps (notifications, logging): skip after retries
  - Options: retry → pause | skip | compensate

**Stage Gates:**
- Configurable validation before stage transitions:
  - Required fields
  - Field conditions
  - Approval complete
  - Related entities exist
  - Time-based (minimum time in stage)
  - Custom rules
- UX shows clear blockers with action buttons

**Template Sharing:**
- Ethico library: Best-practice templates managed by Ethico (HIPAA, SOX, etc.)
- Tenant custom: Clone from Ethico or create from scratch
- Template metadata: version, regulatory basis, industry, complexity

**Human Tasks:**
- Embedded forms for workflow steps
- Same Form Builder system used for intake, disclosures, and workflow tasks
- Forms act as gates before workflow proceeds

**Analytics:**
- Event-based (external)
- Workflow emits events, analytics service consumes
- Engine tracks minimal internal state for SLA enforcement only

### Search Infrastructure

**Indexed Entities:**
Everything queryable with tiered strategy:
- Primary (full-text, real-time): Cases, RIUs, Persons, Policies, Investigations
- Secondary (full-text, near real-time): Comments, Disclosures, Campaigns
- Filtered only (PostgreSQL): Audit logs, Activities

**Index Structure:**
- Per-tenant indices: `org_{tenantId}_cases`, `org_{tenantId}_rius`, etc.

**Index Timing:**
- Async queue (not real-time sync)
- DB Write → Event → Index job queued → ES updated (2-5s)
- Writes stay fast, search eventually consistent

**Result Format:**
- Unified with type tag as default (single ranked list)
- API supports groupBy parameter for grouped display
- Includes facets for entity type counts

**Saved Searches & Alerts:**
- Both supported
- Saved searches for quick access
- Alerts when new results match (immediate, daily digest, weekly options)
- Ties into event bus and notification service

**Query Syntax:**
- Three interfaces, one engine:
  1. AI chat: "Find cases about retaliation from last quarter"
  2. Filter panels: Click Category, Date, etc.
  3. Full Lucene syntax for power users
- AI translates natural language to structured queries

**Highlighting:**
- Yes, with surrounding context
- Matched keywords highlighted

**Fuzzy Matching:**
- Yes, auto-correct with typo tolerance
- "Did you mean..." suggestions

**Synonyms:**
- Both Ethico-provided base synonyms AND tenant-configurable
- Curated compliance term synonyms

**Reindexing:**
- Automatic on schema changes
- Admin-triggered with multiple scopes: full, tenant, entity type, date range, single record
- Rate-limited, runs on job queue

**Search Permissions:**
- Filtered at query time (non-negotiable)
- Permission filters injected into ES query
- Only authorized results returned
- Counts reflect authorized results only

### Claude's Discretion

- Job timeout strategies per job type
- Real-time progress display decisions
- Job cancellation UX patterns
- Replay UI implementation details

</decisions>

<specifics>
## Specific Ideas

- "Mom test" for all configuration: Visual builder + AI chat for non-technical users, full capability underneath for power users
- Workflow simulation with AI chat: "What would happen if a harassment case came in from NYC?" → AI simulates and explains
- Event-driven architecture throughout: loose coupling, multiple reactions to single event, cleaner audit trails
- Ethico workflow template library as competitive differentiator and onboarding accelerator
- Audit log pattern: both human-readable description AND structured fields for every entry
- Search permission filtering at query time - never return unauthorized data even to filter client-side

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-infrastructure*
*Context gathered: 2026-02-02*
