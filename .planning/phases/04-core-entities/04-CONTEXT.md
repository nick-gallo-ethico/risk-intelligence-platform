# Phase 4: Core Entities - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the HubSpot-inspired data model: Person (Contact), RIU (Ticket), Case (Deal), Campaign (Sequence), and labeled Associations that enable pattern detection and unified workflows. RIUs are standalone entities linked to Cases via associations (HubSpot ticket-to-deal pattern). Cases live in pipelines. This phase establishes the core entity relationships that Case Management, Campaigns, and Analytics build upon.

**Reference:** When in doubt, follow HubSpot patterns for entity relationships and association design.

</domain>

<decisions>
## Implementation Decisions

### Person Merge Behavior
- Suggest merge, user confirms (HubSpot pattern) — no auto-merge without explicit action
- User picks winning value per field when conflicts exist during merge
- HRIS + manual edits coexist: HRIS syncs core fields, manual edits preserved in separate fields
- Merge undo: Claude's discretion on whether to implement full undo vs. audit-only

### RIU Immutability Rules
- RIU content (original report/intake) is immutable
- RIU status IS mutable (New → Triaged → Linked → Closed patterns)
- Versioned corrections: create new RIU version with corrections, original preserved for audit
- RIU stays independent, linked to Case(s) via Association (can link to multiple Cases) — HubSpot pattern
- Anonymous RIUs create "Anonymous Person placeholder" record for pattern detection linkage
- Hard delete with approval for GDPR compliance — system admin can permanently delete with audit trail
- Extension tables for RIU types: base Riu table + type-specific tables (HotlineRiu, WebRiu, DisclosureRiu, etc.)
- Form engine from Phase 1 can add tenant-custom fields within each RIU type
- Access code view shows: status + messages (relay communication with investigator)
- Custom statuses per RIU type — different types have different status flows
- Triage behavior is tenant-configurable via rules engine (extends Phase 1 assignment rules)
  - Rules specify conditions (category, severity, source, combinations) and actions (auto-assign or manual queue)
  - SLA clock start is rule-configurable (on creation vs. on assignment)
- One RIU can spawn multiple Cases (each allegation gets its own investigation)
- Duplicate detection: after RIU submission, system flags potential duplicates for triage review
- RIU sources (first-class): Hotline, Web, Email, Walk-in, Disclosure, Manager Report, Third-party
- RIU-only lifecycle allowed: some RIUs close without creating a Case (HubSpot pattern)
- Rule-based priority scoring:
  - Category provides baseline
  - Additional rules boost/adjust based on keywords, source type, entity mentions, regulatory triggers
  - Investigator can override with documented reason
  - Same rules engine as triage rules
- Rich text content (HTML/Markdown) for RIU intake
- History alert: "3 previous reports from this person" badge visible in triage view
- Tiered anonymity: Anonymous / Confidential / Open
- Anonymity upgrade only: reporter can reveal more (Anon → Confidential → Open), never forced to less
- Language handling: auto-detect + optional reporter/investigator override
  - language_detected (auto), language_confirmed (manual), language_effective (confirmed ?? detected ?? default)

### Association Labels & Creation
- Person-to-Case roles: Extended built-in + tenant custom labels
  - Built-in: Reporter, Subject, Witness, Assigned Investigator, Approver, Stakeholder, Manager-of-Subject, Reviewer, Legal Counsel
  - Custom labels configurable per tenant
- Role-based permissions for Person-to-Case associations
  - Each association type has configurable create/modify/delete permissions by role
  - System auto-creates from intake (reporter, subject)
  - Manual modifications governed by role permissions
- RIU-to-Case directional labels with context:
  - Default: originated, escalated_to, merged_into, split_from, corroborates, related
  - Direction matters: RIU → Case
  - Labels are tenant-configurable
- Evidentiary associations (subject, witness, reporter) use STATUS field, not validity periods
  - Status values: active, cleared, substantiated, withdrawn
  - Association persists as permanent record — only outcome changes
  - Status includes changed_at, changed_by, reason for audit trail
- Role associations (counsel, investigator) use validity periods (ended_at) since those can actually end
- Workflow participants (approvers, reviewers) handled by workflow engine, not Person-to-RIU associations
- Case-to-Case associations: Yes, labeled with direction
  - Labels: parent/child, split_from/split_to, merged_into, escalated_to, supersedes, follow_up_to, related
  - Supports hierarchy (parent investigations with child sub-cases)
- Associations are first-class in Elasticsearch search
  - Case documents include denormalized association data
  - Global search finds cases by associated person name
  - Facets filter by association type, person attributes, status
  - Enables pattern detection queries
- Person-to-Person associations with relationship labels
  - Sources: HRIS (manager_of, reports_to), Disclosure forms (spouse, family, business_partner), Investigations (discovered)
  - Labels: manager_of, reports_to, spouse, domestic_partner, family_member (with subtypes), former_colleague, business_partner, close_personal_friend
  - COI detection engine queries these relationships
- Association audit: Both audit fields on record + separate AUDIT_LOG entries

### Campaign Targeting Logic
- Query builder for defining audience criteria (any employee attribute, nested AND/OR conditions)
- Saved as Dynamic segments with names that auto-update as HRIS changes
- Campaigns target segments; snapshot audience at launch for audit trail
- Segments are reusable across campaigns
- Manual overrides: both include and exclude specific individuals
- Mid-campaign joins: per-campaign configuration
  - Options: Open (auto-add), Closed (snapshot at launch), Open with review (queue for approval)
  - Additional settings for open: adjust deadline for late joins, skip if already completed equivalent
  - Smart defaults based on campaign type
- Audience preview: full list with export capability before launch

### Claude's Discretion
- Person merge undo implementation (full undo vs. audit-only)
- RIU attachment handling (append-only after creation vs. frozen at intake)

</decisions>

<specifics>
## Specific Ideas

- "When in doubt, reference HubSpot documentation" — entities follow HubSpot patterns (RIU=Ticket, Case=Deal in pipelines)
- Extension tables for RIU types chosen for auditability (database-level constraints), reporting efficiency, and demo data seeding
- Priority scoring formula: CategoryDefault + KeywordBoost + SourceBoost + EntityBoost + RegulatoryBoost → Critical/High/Medium/Low
- Association search is a "wow" moment in demos — pre-indexed for instant results
- "Person X was the subject of Case Y" is permanently true — evidentiary associations don't "end", they have outcomes
- COI detection requires knowing actual relationships (spouse, business partner) — HRIS hierarchy alone isn't enough
- Smart defaults: Open audience mode for company-wide compliance campaigns, Closed for targeted remediation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-core-entities*
*Context gathered: 2026-02-03*
