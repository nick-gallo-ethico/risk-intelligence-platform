# Ethico Risk Intelligence Platform
## PRD-006: Disclosures Management

**Document ID:** PRD-006
**Version:** 2.0 (RIU - Risk Intelligence Unit)
**Priority:** P0 - Critical (Core Module)
**Development Phase:** Phase 1 (Core) Weeks 5-8, Extended through Phase 4
**Last Updated:** February 2026

> **Architecture Reference:** This PRD implements the RIU->Case architecture defined in `00-PLATFORM/01-PLATFORM-VISION.md v3.2`. When employees complete disclosure forms, the system creates a **Risk Intelligence Unit (RIU)** of type `disclosure_response`. Cases are created **conditionally** based on configurable thresholds (e.g., gift amount, relationship type, flagged responses).

---

## 1. Executive Summary

The Disclosures module enables organizations to collect, review, and manage employee disclosures including Conflicts of Interest, Gifts & Entertainment, Outside Employment, and other compliance-related declarations. Unlike static form submissions, disclosures are treated as **living artifacts** with lifecycle management, versioning, and decision tracking.

### RIU->Case Architecture

When an employee completes a disclosure form (via campaign or ad-hoc):
1. **Campaign Assignment** is updated to `completed`
2. **RIU** (Risk Intelligence Unit) is created with type `disclosure_response`
3. **Case** is created **only if thresholds are met** (configurable per disclosure type)

This separation enables:
- Tracking all disclosure responses (RIUs) regardless of whether they require action
- Creating Cases only when compliance review or follow-up is needed
- Linking multiple related disclosures to a single Case if needed
- Clear analytics: "X disclosures submitted" vs "Y cases requiring review"

**This module reuses patterns established in Case Management (PRD-005):**
- Form Builder (shared with PRD-004 Web Form Builder)
- Approval workflows (similar to investigation workflows)
- Activity timeline (standard audit trail component)
- HRIS integration (employee data snapshot)
- Reporting patterns (saved views, dashboards)
- AI translation (same pattern as case translation)
- RIU->Case linking (same association pattern as hotline reports)

### Module Scope

| In Scope | Out of Scope (Other PRDs) |
|----------|---------------------------|
| Disclosure Form templates | Ethics Portal branding (PRD-003) |
| Campaign engine | Web Form Builder core (PRD-004) |
| RIU creation (type: disclosure_response) | Analytics dashboards (PRD-007) |
| Conditional Case creation (thresholds) | HRIS integration core (see `01-SHARED-INFRASTRUCTURE/TECH-SPEC-HRIS-INTEGRATION.md`) |
| Disclosure lifecycle | Case Management core (PRD-005) |
| Approval workflows | |
| Conditions tracking | |
| Versioning & history | |
| GT&E thresholds | |
| Employee Portal (disclosure views) | |

---

## 2. User Stories

### Client Admin

**Create disclosure form**
As a **Compliance Officer**, I want to create custom disclosure forms
so that I can collect the specific information our policies require.

Key behaviors:
- Use form builder to add questions
- Configure triggers (which answers require review)
- Set auto-clear rules for low-risk disclosures
- Preview form before publishing
- Activity logged: "Compliance Officer {name} created disclosure form"

---

**Launch disclosure campaign**
As a **Compliance Officer**, I want to launch an annual disclosure campaign
so that all employees certify their conflicts of interest.

Key behaviors:
- Target employees by HRIS attributes (department, location, role)
- Set campaign dates and reminder schedule
- Configure exception rules (honor prior completion, exclude terminated)
- Preview target list before launch
- Activity logged: "Compliance Officer {name} launched campaign {campaign_name}"

---

**Monitor campaign progress**
As a **Compliance Officer**, I want to monitor campaign completion progress
so that I can intervene when completion rates are low.

Key behaviors:
- Dashboard shows: total assigned, completed, pending, overdue
- Drill down by department, location, manager
- Send reminder to non-completers
- Export progress report
- Activity logged: "Compliance Officer {name} sent campaign reminder"

---

**Review disclosure submission**
As a **Compliance Officer**, I want to review flagged disclosures
so that I can assess potential conflicts and apply conditions.

Key behaviors:
- Review queue shows disclosures requiring attention
- Full submission details with HRIS context
- Actions: approve, reject, approve with conditions
- Add reviewer notes (internal or employee-visible)
- Activity logged: "Compliance Officer {name} reviewed disclosure with decision {decision}"

---

**Add conditions to disclosure**
As a **Compliance Officer**, I want to add management conditions to approved disclosures
so that conflicts are properly mitigated.

Key behaviors:
- Predefined condition types (recusal, divestiture, management plan)
- Free-text conditions supported
- Conditions assigned to employee with due date
- Employee notified of conditions
- Activity logged: "Compliance Officer {name} added condition to disclosure"

---

**Grant disclosure exception**
As a **Compliance Officer**, I want to grant exceptions for campaign assignments
so that employees with valid reasons aren't marked as non-compliant.

Key behaviors:
- Exception reasons: terminated, role change, prior completion, manual
- Exception requires justification text
- Exception removes from pending count
- Audit trail preserved
- Activity logged: "Compliance Officer {name} granted exception for {employee}"

---

**Configure auto-clear rules**
As a **System Admin**, I want to configure auto-approval rules for low-risk disclosures
so that simple disclosures don't burden reviewers.

Key behaviors:
- Rule builder: if gift_value < $50 AND not government_official → auto-clear
- Multiple rules can stack
- Test rules against historical data
- Rules versioned and auditable
- Activity logged: "System Admin {name} updated auto-clear rules"

---

**Link disclosure RIU to existing case**
As a **Compliance Officer**, I want to link a disclosure RIU to an existing case
so that related compliance matters are tracked together.

Key behaviors:
- Disclosure RIU can be linked to existing Case via `riu_case_associations`
- Search for case by reference number
- Association type set to 'related'
- Link appears on both disclosure RIU and case
- Notes on relationship captured
- Cross-reference visible in investigation
- Activity logged: "Compliance Officer {name} linked disclosure RIU to case {case_ref}"

---

### End User

**Complete assigned disclosure**
As an **Employee**, I want to complete my assigned disclosure form
so that I remain compliant with company policy.

Key behaviors:
- Assignment visible in Employee Portal
- Due date clearly shown
- Save draft and resume later
- Confirmation on submission
- Activity logged: "Employee {name} submitted disclosure"

---

**Submit ad-hoc disclosure**
As an **Employee**, I want to submit a disclosure outside of a campaign
so that I can report new conflicts as they arise.

Key behaviors:
- Select disclosure type (COI, gift received, outside employment)
- Complete relevant form
- Goes to review queue
- Visible in "My Disclosures" history
- Activity logged: "Employee {name} submitted ad-hoc disclosure"

---

**View disclosure history**
As an **Employee**, I want to view my disclosure history
so that I can see what I've previously disclosed and any conditions.

Key behaviors:
- List of all submitted disclosures
- Status: approved, pending, conditions
- Active conditions clearly shown
- Can update/renew expired disclosures
- organizationId enforced by RLS

---

**Complete disclosure condition**
As an **Employee**, I want to mark a condition as complete
so that I can demonstrate I've mitigated the conflict.

Key behaviors:
- Active conditions shown prominently
- Mark complete with evidence (notes/files)
- Reviewer notified for verification
- Condition status updated on approval
- Activity logged: "Employee {name} completed condition {condition}"

---

**Receive gift and report it**
As an **Employee**, I want to quickly report a received gift
so that I stay compliant with gifts & entertainment policy.

Key behaviors:
- Simple "Report a Gift" form
- Capture: giver, value, date, business justification
- Auto-clear if below threshold
- Manager notified if above threshold
- Activity logged: "Employee {name} reported gift from {giver}"

---

## 3. Entity Model

> **Architecture Note:** This module implements the RIU->Case architecture defined in `00-PLATFORM/01-PLATFORM-VISION.md`. When employees complete disclosure forms, the system creates a **Risk Intelligence Unit (RIU)** of type `disclosure_response`. Cases are created **conditionally** based on configurable thresholds.

### 3.0 RIU->Case Flow for Disclosures

```
Employee Completes Disclosure Form
         │
         ▼
┌─────────────────────────────────┐
│  UPDATE Campaign Assignment     │
│  status: completed              │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  CREATE RIU                     │
│  type: disclosure_response      │
│  Links to campaign_assignment_id│
│  Contains form responses (JSONB)│
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  EVALUATE THRESHOLDS (auto_case_rules)          │
│  - Gift amount > configured threshold?          │
│  - Relationship type flagged?                   │
│  - Government official involved?                │
│  - Manual review required by form config?       │
│  - Auto-clear rules matched?                    │
└─────────────────────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 No Case   CREATE CASE
 (RIU only  (COI Review,
  stored)   Gift Approval, etc.)
```

**Key Points:**
- Every disclosure submission creates an RIU (immutable record of what was disclosed)
- Cases are created ONLY when thresholds trigger review
- RIUs link to Cases via `riu_case_associations` (same pattern as hotline reports)
- One Case can have multiple linked disclosure RIUs (e.g., related family disclosures)
- "Disclosure" entity below represents the **business workflow layer** on top of the RIU

### 3.1 Disclosure Form (Template)

The Disclosure Form defines what questions are asked and how submissions are routed:

```
DISCLOSURE_FORM
├── Core Fields
│   ├── id (UUID)
│   ├── organization_id (tenant)
│   ├── name (e.g., "Conflicts of Interest Form v2")
│   ├── description
│   ├── disclosure_type (COI, GIFT_RECEIVED, GIFT_GIVEN, OUTSIDE_EMPLOYMENT,
│   │                    PERSONAL_RELATIONSHIP, POLITICAL_CONTRIBUTION,
│   │                    TRAVEL_HOSPITALITY, SPEAKING_ENGAGEMENT, CUSTOM)
│   ├── form_code (short code for URLs, e.g., "coi-2026")
│   ├── version (1, 2, 3...)
│   ├── status (DRAFT, PUBLISHED, ARCHIVED)
│   └── is_template_library (boolean - from standard library?)
│
├── Questions[]
│   ├── id (UUID)
│   ├── question_text
│   ├── question_type (TEXT, TEXTAREA, YES_NO, DATE, DROPDOWN,
│   │                  MULTI_SELECT, NUMBER, CURRENCY, FILE_UPLOAD,
│   │                  EMPLOYEE_LOOKUP, EXTERNAL_PARTY_LOOKUP)
│   ├── options[] (for dropdowns/multi-select)
│   ├── is_required (boolean)
│   ├── triggers_review (boolean - if answered YES/specific value → requires approval)
│   ├── trigger_values[] (which values trigger review)
│   ├── help_text
│   ├── placeholder_text
│   ├── validation_rules (JSONB - min/max, regex, etc.)
│   ├── conditional_display (JSONB - show if other question = value)
│   └── order (display sequence)
│
├── Workflow Configuration
│   ├── default_workflow_id (FK to Workflow)
│   ├── auto_clear_rules (JSONB)
│   │   └── [{ condition: "gift_value < 50", action: "AUTO_CLEAR" }]
│   ├── auto_reject_rules (JSONB)
│   │   └── [{ condition: "government_official = true AND gift_value > 0", action: "AUTO_REJECT" }]
│   ├── conditional_routing_rules (JSONB)
│   │   └── [{ condition: "department = 'SALES'", route_to: "sales_compliance_team" }]
│   └── escalation_rules (JSONB)
│
├── Settings
│   ├── requires_login (boolean)
│   ├── require_employee_id (boolean - if no login)
│   ├── require_email (boolean - if no login)
│   ├── allow_proxy_submission (boolean)
│   ├── allow_delegate_proxy (boolean)
│   ├── allow_updates (boolean - can employee update after submission?)
│   ├── renewal_period_days (null = no auto-expiry)
│   ├── reminder_days_before_expiry[]
│   ├── inactive_triggers (EMPLOYEE, REVIEWER, TIME, ALL)
│   └── translations_enabled (boolean)
│
├── Localization
│   ├── default_language
│   ├── available_languages[]
│   └── translations (JSONB - question text per language)
│
└── Metadata
    ├── created_at, updated_at
    ├── created_by, updated_by
    ├── published_at
    └── archived_at
```

### 3.2 Campaign

Campaigns wrap Disclosure Forms and target employees:

```
CAMPAIGN
├── Core Fields
│   ├── id (UUID)
│   ├── organization_id
│   ├── business_unit_id (FK, nullable - for scoping campaigns to BU)
│   ├── name (e.g., "Annual COI Certification 2026")
│   ├── description
│   ├── disclosure_form_id (FK)
│   ├── campaign_type (POINT_IN_TIME, ROLLING)
│   └── status (DRAFT, SCHEDULED, ACTIVE, COMPLETED, CANCELLED)
│
├── Targeting (HRIS Rules)
│   ├── include_rules (JSONB)
│   │   └── [{ field: "department", operator: "in", values: ["Sales", "Marketing"] }]
│   ├── exclude_rules (JSONB)
│   │   └── [{ field: "employment_type", operator: "equals", value: "CONTRACTOR" }]
│   ├── snapshot_date (for point-in-time - when employee list was captured)
│   └── target_count (calculated at launch)
│
├── Schedule
│   ├── start_date
│   ├── end_date
│   ├── reminder_schedule[] (days before deadline)
│   │   └── [30, 14, 7, 3, 1]
│   ├── grace_period_days
│   └── escalation_after_days (escalate non-completion to manager)
│
├── Rolling Campaign Settings (if campaign_type = ROLLING)
│   ├── trigger_event (NEW_HIRE, ROLE_CHANGE, PROMOTION, ANNUAL_ANNIVERSARY)
│   ├── days_after_trigger
│   ├── recurrence_months (null = one-time per trigger)
│   └── is_perpetual (boolean - continues indefinitely)
│
├── Exception Settings
│   ├── honor_prior_completion (boolean)
│   ├── prior_completion_days (within X days)
│   ├── auto_exception_terminated (boolean)
│   └── auto_exception_role_change (boolean)
│
├── Statistics (updated in real-time)
│   ├── total_assigned
│   ├── completed_count
│   ├── pending_count
│   ├── exception_count
│   └── overdue_count
│
└── Metadata
    ├── created_at, created_by
    ├── updated_at, updated_by
    ├── launched_at, launched_by
    └── completed_at
```

### 3.3 Campaign Assignment

Individual employee assignments within a campaign. When completed, creates an RIU (Risk Intelligence Unit).

```
CAMPAIGN_ASSIGNMENT
├── id (UUID)
├── campaign_id (FK)
├── organization_id
│
├── Employee Info (snapshot at assignment)
│   ├── employee_id (from HRIS)
│   ├── employee_email
│   ├── employee_name
│   ├── employee_department
│   ├── employee_location
│   ├── employee_manager_id
│   ├── employee_manager_email
│   └── hris_snapshot (JSONB - full HRIS data at assignment time)
│
├── Status
│   ├── status (PENDING, IN_PROGRESS, COMPLETED, EXCEPTION)
│   ├── exception_reason (PRIOR_COMPLETION, TERMINATED, ROLE_CHANGE, MANUAL)
│   ├── exception_notes
│   ├── exception_by
│   └── exception_at
│
├── Notifications
│   ├── invited_at
│   ├── invite_email_sent (boolean)
│   ├── reminders_sent[] (timestamps)
│   ├── escalated_to_manager_at
│   └── last_notification_at
│
├── Due Date
│   ├── original_due_date
│   ├── extended_due_date (if granted extension)
│   ├── extension_reason
│   └── extended_by
│
├── Completion (RIU Link)
│   ├── started_at
│   ├── completed_at
│   ├── riu_id (FK to RISK_INTELLIGENCE_UNIT - the disclosure_response RIU)
│   └── disclosure_id (FK - business workflow entity on top of RIU)
│
└── Metadata
    ├── created_at
    └── updated_at
```

**Key Behavior:** When status transitions to COMPLETED, the system:
1. Creates an RIU (type: `disclosure_response`) with the form responses
2. Stores the `riu_id` on this assignment
3. Evaluates threshold rules to determine if a Case should be created
4. If thresholds met, creates Case and links RIU via `riu_case_associations`

### 3.4 Risk Intelligence Unit (RIU) - Disclosure Response

When an employee completes a disclosure form, the system creates an **immutable RIU** that preserves exactly what was disclosed. The full RIU schema is defined in the Platform Vision document. Key points for Disclosures:

```
RISK_INTELLIGENCE_UNIT (immutable input - type: disclosure_response)
├── id (UUID)
├── organization_id
├── type = 'disclosure_response'
├── source_channel (CAMPAIGN, AD_HOC_AUTHENTICATED, AD_HOC_UNAUTHENTICATED, PROXY)
├── received_at (timestamp)
│
├── Reporter/Submitter Info
│   ├── reporter_employee_id (FK to Employee)
│   ├── reporter_type = 'identified' (disclosures are never anonymous)
│   └── proxy_submitter_id (if proxy submission)
│
├── Content
│   ├── form_responses (JSONB - answers to form questions)
│   ├── attachments[] (file references)
│   └── original_language
│
├── Campaign Link
│   ├── campaign_id (FK, null if ad-hoc)
│   └── campaign_assignment_id (FK, null if ad-hoc)
│
├── AI Enrichment
│   ├── ai_summary
│   ├── ai_risk_score
│   ├── ai_generated_at
│   └── ai_model_version
│
├── Migration Support
│   ├── source_system
│   ├── source_record_id
│   └── migrated_at
│
└── created_at, created_by
```

**Immutability:** RIUs are immutable after creation. The Disclosure entity (below) handles mutable workflow state.

### 3.5 Disclosure (Business Workflow Layer)

The Disclosure entity provides a **mutable business workflow layer** on top of the immutable RIU. It tracks review status, conditions, and versioning.

```
DISCLOSURE
├── Core Fields
│   ├── id (UUID)
│   ├── organization_id
│   ├── business_unit_id (FK, nullable - for within-tenant scoping)
│   ├── reference_number (DIS-2026-00001)
│   ├── disclosure_form_id (FK)
│   ├── campaign_assignment_id (FK, null if ad-hoc)
│   ├── disclosure_type (denormalized from form)
│   │
│   ├── RIU Link (immutable source)
│   │   └── riu_id (FK to RISK_INTELLIGENCE_UNIT - the disclosure_response RIU)
│   │
│   └── Case Link (if threshold triggered Case creation)
│       ├── linked_case_id (FK to Case, via riu_case_associations)
│       ├── case_created_automatically (boolean)
│       └── threshold_rule_matched (which rule triggered Case creation)
│
├── Submitter Information
│   ├── employee_id
│   ├── employee_email
│   ├── employee_name
│   ├── employee_department
│   ├── employee_location
│   ├── employee_title
│   ├── employee_manager_id
│   ├── employee_manager_name
│   ├── hris_snapshot (JSONB - captured at submission)
│   ├── submitted_via (CAMPAIGN, AD_HOC_AUTHENTICATED, AD_HOC_UNAUTHENTICATED, PROXY)
│   ├── proxy_submitter_id (FK to User, if proxy)
│   ├── proxy_submitter_name
│   └── delegate_proxy_id (FK to ProxyDelegation, if delegated)
│
├── Versioning
│   ├── version_number (1, 2, 3...)
│   ├── parent_disclosure_id (FK - previous version in chain)
│   ├── is_current_version (boolean)
│   ├── version_reason (INITIAL, UPDATE, RENEWAL, CORRECTION)
│   └── version_notes
│
├── Content
│   ├── responses (JSONB - answers to form questions)
│   │   └── { "question_id": "value", ... }
│   ├── attachments[] (file references)
│   ├── submitted_at
│   ├── original_language
│   ├── translated_responses (JSONB - if translated)
│   └── translation_language
│
├── Status
│   ├── status (DRAFT, SUBMITTED, PENDING_REVIEW, CLEARED, REJECTED,
│   │          WITH_CONDITIONS, ESCALATED, WITHDRAWN)
│   ├── status_rationale (text - why status was set, captures reviewer reasoning)
│   ├── status_changed_at
│   ├── status_changed_by
│   ├── is_active (boolean)
│   ├── inactive_reason (EMPLOYEE_MARKED, REVIEWER_MARKED, EXPIRED, SUPERSEDED, WITHDRAWN)
│   ├── inactive_at
│   ├── inactive_by
│   └── inactive_notes
│
├── Review
│   ├── workflow_id (FK to Workflow)
│   ├── current_workflow_step
│   ├── workflow_step_history (JSONB)
│   ├── assigned_reviewer_id
│   ├── assigned_reviewer_name
│   ├── assigned_at
│   ├── review_started_at
│   ├── decision_notes
│   ├── decision_by
│   ├── decision_at
│   ├── reviewer_visible_to_employee (boolean, default false)
│   └── auto_decision (boolean - was this auto-cleared/rejected?)
│
├── Conditions[] (embedded, if status = WITH_CONDITIONS)
│   ├── id (UUID)
│   ├── description
│   ├── due_date
│   ├── status (PENDING, IN_PROGRESS, COMPLETED, OVERDUE, WAIVED)
│   ├── assigned_to_id (FK to User, null if employee)
│   ├── assigned_to_name
│   ├── completion_notes
│   ├── completed_at
│   ├── completed_by
│   ├── waived_reason
│   ├── waived_by
│   ├── reminder_sent_at[]
│   └── created_at, created_by
│
├── Risk (rules-based scoring)
│   ├── risk_score (0-100)
│   ├── risk_level (LOW, MEDIUM, HIGH)
│   ├── risk_factors[] (what triggered the score)
│   │   └── [{ factor: "Government official involved", points: 30 }]
│   ├── risk_calculated_at
│   └── risk_override (manual adjustment with reason)
│
├── External Parties[] (for cross-disclosure linking)
│   ├── external_party_id (FK)
│   ├── relationship (VENDOR, CUSTOMER, FAMILY_MEMBER, etc.)
│   └── added_at
│
├── Case Link (created via RIU association, or manual escalation)
│   ├── linked_case_id (FK to Case - denormalized from riu_case_associations)
│   ├── case_creation_trigger (AUTO_THRESHOLD, MANUAL_ESCALATION, MANUAL_LINK)
│   ├── threshold_rule_matched (which auto_case_rule triggered, if AUTO_THRESHOLD)
│   ├── linked_at
│   ├── linked_by
│   └── link_reason
│
├── Related Disclosures[] (explicit links)
│   ├── related_disclosure_id (FK)
│   ├── relationship_type (RELATED, SUPERSEDES, UPDATES)
│   └── linked_at, linked_by
│
├── AI Enrichment
│   ├── ai_summary (AI-generated summary of disclosure for quick review)
│   ├── ai_summary_generated_at (when AI generated the summary)
│   ├── ai_model_version (e.g., "claude-3-opus")
│   ├── ai_risk_assessment (AI-suggested risk factors)
│   └── ai_confidence_score (0-100)
│
├── Migration Support (for imported data)
│   ├── source_system (e.g., 'NAVEX', 'EQS', 'CONVERCENT', 'MANUAL')
│   ├── source_record_id (original disclosure ID from source system)
│   └── migrated_at (when imported, null for native records)
│
└── Metadata
    ├── created_at, updated_at
    ├── created_by, updated_by
    ├── expires_at (if time-based expiry)
    └── renewal_reminder_sent_at
```

### 3.6 External Party

For tracking vendors, companies, and individuals across disclosures and cases:

```
EXTERNAL_PARTY
├── id (UUID)
├── organization_id
│
├── Identity
│   ├── name (company or individual name)
│   ├── party_type (COMPANY, INDIVIDUAL, GOVERNMENT_ENTITY, NON_PROFIT)
│   ├── aliases[] (alternate names)
│   └── identifiers (JSONB)
│       └── { "tax_id": "...", "duns": "...", "website": "..." }
│
├── Contact
│   ├── primary_contact_name
│   ├── primary_contact_email
│   ├── address
│   ├── city, state, country
│   └── phone
│
├── Classification
│   ├── industry
│   ├── is_government (boolean)
│   ├── is_competitor (boolean)
│   ├── is_sanctioned (boolean)
│   └── risk_rating (LOW, MEDIUM, HIGH)
│
├── Linked Records (auto-populated)
│   ├── linked_disclosures[] (FK references)
│   ├── linked_cases[] (FK references)
│   └── disclosure_count, case_count (denormalized)
│
├── Notes
│   ├── compliance_notes
│   └── risk_notes
│
└── Metadata
    ├── created_at, created_by
    ├── updated_at, updated_by
    └── last_activity_at
```

### 3.8 Proxy Delegation

Admin-configured relationships for delegate submission:

```
PROXY_DELEGATION
├── id (UUID)
├── organization_id
│
├── Parties
│   ├── delegator_id (FK to User - the executive)
│   ├── delegator_name
│   ├── delegator_email
│   ├── delegate_id (FK to User - the EA/proxy)
│   ├── delegate_name
│   └── delegate_email
│
├── Scope
│   ├── scope_type (ALL_DISCLOSURES, SPECIFIC_TYPES, SPECIFIC_CAMPAIGNS)
│   ├── disclosure_types[] (if SPECIFIC_TYPES)
│   └── campaign_ids[] (if SPECIFIC_CAMPAIGNS)
│
├── Validity
│   ├── start_date
│   ├── end_date (null = indefinite)
│   ├── is_active (boolean)
│   ├── revoked_at
│   └── revoked_by
│
├── Notifications
│   ├── notify_delegator_on_submission (boolean)
│   └── notify_delegator_on_decision (boolean)
│
└── Metadata
    ├── created_at
    ├── created_by (admin who set this up)
    └── updated_at
```

### 3.7 Disclosure Activity Log

Immutable audit trail. Activity is logged to the **unified AUDIT_LOG** (not a module-specific table) for cross-entity queries.

```
AUDIT_LOG (unified across all modules - see Platform Vision)
├── entity_type = 'DISCLOSURE' or 'RIU'
├── entity_id (disclosure_id or riu_id)
├── organization_id
│
├── Activity
│   ├── action (CREATED, SUBMITTED, ASSIGNED, REASSIGNED,
│   │          STATUS_CHANGE, CONDITION_ADDED, CONDITION_COMPLETED,
│   │          CONDITION_WAIVED, VERSION_CREATED, MARKED_INACTIVE,
│   │          CASE_LINKED, CASE_CREATED, REMINDER_SENT, VIEWED, EXPORTED,
│   │          COMMENT_ADDED, ATTACHMENT_ADDED, BULK_ACTION)
│   ├── action_description (natural language, e.g., "Compliance Officer Jane cleared disclosure with no conditions")
│   └── context (JSONB - additional context for AI understanding)
│
├── Actor
│   ├── actor_id (FK to User, null if system/employee)
│   ├── actor_type (USER, SYSTEM, EMPLOYEE, AI)
│   └── (name/email denormalized for display)
│
├── Changes
│   ├── changes (JSONB - { old_value, new_value, fields_changed[] })
│
├── Context
│   ├── ip_address
│   └── user_agent
│
└── created_at (immutable)

-- This table is APPEND-ONLY (no updates or deletes)
-- Enables queries like "Show all actions on this disclosure AND its linked RIU AND any linked Case"
```

**RIU vs Disclosure Activity:**
- RIU activity: creation, AI enrichment, translation
- Disclosure activity: workflow state changes, assignments, conditions, Case linking

**AI-First Design Notes:**
- `action_description` uses natural language for AI context
- `context` JSONB enables rich querying and AI understanding
- `source_system` on RIU enables migration tracking from competitor systems
- `status_rationale` on Disclosure captures human reasoning for AI context

### 3.9 GT&E Threshold Configuration

For Gifts & Entertainment with threshold-based routing:

```
GTE_THRESHOLD
├── id (UUID)
├── organization_id
│
├── Classification
│   ├── threshold_type (GIFT_RECEIVED, GIFT_GIVEN, ENTERTAINMENT_RECEIVED,
│   │                   ENTERTAINMENT_GIVEN, TRAVEL, HOSPITALITY, MEAL)
│   ├── context (GOVERNMENT, VENDOR, CUSTOMER, COMPETITOR, INTERNAL, ANY)
│   └── description
│
├── Location Rules
│   ├── applies_to_countries[]
│   ├── applies_to_states[] (for US state-specific rules)
│   └── is_global (boolean)
│
├── Threshold
│   ├── currency (USD, EUR, GBP, etc.)
│   ├── amount
│   ├── aggregation_period_days (for cumulative thresholds)
│   ├── aggregation_type (PER_TRANSACTION, PER_PARTY_PERIOD, PER_EMPLOYEE_PERIOD)
│   └── aggregation_resets_at (monthly, quarterly, annually)
│
├── Action
│   ├── action (AUTO_APPROVE, MANAGER_REVIEW, COMPLIANCE_REVIEW,
│   │          LEGAL_REVIEW, AUTO_REJECT)
│   ├── notify_roles[] (additional notifications)
│   └── escalation_threshold (if > X, escalate further)
│
├── Priority
│   └── priority (lower = evaluated first)
│
└── Metadata
    ├── is_active (boolean)
    ├── created_at, created_by
    └── updated_at, updated_by
```

### 3.10 Workflow Definition

Reusable approval workflow definitions:

```
DISCLOSURE_WORKFLOW
├── id (UUID)
├── organization_id
├── name (e.g., "Standard COI Review")
├── description
├── is_active (boolean)
│
├── Stages[] (up to 4)
│   ├── stage_number (1-4)
│   ├── stage_name (e.g., "Manager Review", "Compliance Review")
│   ├── reviewer_type (MANAGER, DEPARTMENT_HEAD, ROLE, SPECIFIC_USER, QUEUE)
│   ├── reviewer_role (if ROLE - e.g., "COMPLIANCE_OFFICER")
│   ├── reviewer_user_id (if SPECIFIC_USER)
│   ├── reviewer_queue_id (if QUEUE)
│   ├── sla_hours (time to complete this stage)
│   ├── can_approve (boolean)
│   ├── can_reject (boolean)
│   ├── can_add_conditions (boolean)
│   ├── can_escalate (boolean)
│   ├── reviewer_anonymous (boolean - hide identity from employee)
│   └── skip_if_auto_cleared (boolean)
│
├── Escalation
│   ├── escalation_after_hours
│   ├── escalate_to_role
│   └── notify_on_escalation[]
│
└── Metadata
    ├── created_at, created_by
    └── updated_at, updated_by
```

---

## 3. Disclosure Workflow

### 3.1 Submission Paths

| Path | Login | Identifier | Triggers Review | Notes |
|------|-------|------------|-----------------|-------|
| Campaign (authenticated) | SSO | Employee ID from session | Based on form rules | Preferred path |
| Campaign (unauthenticated) | No | Employee ID or email required | Based on form rules | For distributed workforce |
| Ad-hoc (authenticated) | SSO | Employee ID from session | Based on form rules | Self-service |
| Ad-hoc (unauthenticated) | No | Employee ID or email required | Based on form rules | Via Ethics Portal |
| Proxy (basic) | SSO | Manager submits for direct report | Yes - always | Manager identified |
| Proxy (delegated) | SSO | EA submits for executive | Based on form rules | Via delegation config |

### 3.2 Status Lifecycle

```
┌──────────┐
│  DRAFT   │ ─── Employee saves but doesn't submit
└────┬─────┘
     │
     ▼
┌──────────┐
│SUBMITTED │ ─── Employee clicks Submit
└────┬─────┘
     │
     ├─────────────────────┐
     │                     │
     ▼                     ▼
┌──────────────┐    ┌────────────┐
│ AUTO_CLEARED │    │PENDING_    │
│ (if rules    │    │REVIEW      │
│  match)      │    └─────┬──────┘
└──────────────┘          │
                          │
     ┌────────────────────┼────────────────────┬────────────────┐
     │                    │                    │                │
     ▼                    ▼                    ▼                ▼
┌─────────┐       ┌────────────┐      ┌───────────┐     ┌──────────┐
│ CLEARED │       │ WITH_      │      │ REJECTED  │     │ESCALATED │
│         │       │ CONDITIONS │      │           │     │ (→ Case) │
└─────────┘       └────────────┘      └───────────┘     └──────────┘

At any point before decision:
┌───────────┐
│ WITHDRAWN │ ─── Employee withdraws submission
└───────────┘
```

### 3.3 Status Definitions

| Status | Description | Next Actions |
|--------|-------------|--------------|
| **DRAFT** | Employee started but not submitted | Submit, Delete |
| **SUBMITTED** | Awaiting assignment to reviewer | Assign, Auto-process |
| **PENDING_REVIEW** | Assigned to reviewer | Clear, Reject, Add Conditions, Escalate |
| **CLEARED** | Approved, no issues | Mark Inactive, Create New Version |
| **REJECTED** | Not approved | Appeal (future), Create New Version |
| **WITH_CONDITIONS** | Approved with requirements | Complete Conditions, Mark Inactive |
| **ESCALATED** | Sent to Case Management | Case handles further |
| **WITHDRAWN** | Employee withdrew | Resubmit (new disclosure) |

### 3.4 Approval Workflow Engine

**Workflow Stages (up to 4):**

```
Stage 1: Manager Review
    ↓
Stage 2: Department Head Review (if Stage 1 escalates)
    ↓
Stage 3: Compliance Review (if policy requires)
    ↓
Stage 4: Legal Review (if specific conditions)
```

**Conditional Routing:**

```javascript
// Example routing rules
{
  "rules": [
    {
      "condition": "disclosure_type = 'COI' AND involves_government = true",
      "route_to": "legal_team",
      "skip_stages": [1, 2]
    },
    {
      "condition": "gift_value > 500",
      "route_to": "compliance_team",
      "add_stage": 3
    },
    {
      "condition": "employee_level >= 'VP'",
      "route_to": "cco_direct"
    }
  ]
}
```

**Auto-Clear Rules:**

```javascript
// Disclosures auto-cleared without human review
{
  "auto_clear": [
    {
      "condition": "disclosure_type = 'GIFT_RECEIVED' AND gift_value < 50 AND !is_government",
      "action": "CLEAR",
      "note": "Auto-cleared: Gift under $50 threshold, non-government"
    }
  ]
}
```

**Auto-Reject Rules:**

```javascript
// Disclosures auto-rejected as policy violations
{
  "auto_reject": [
    {
      "condition": "is_government = true AND gift_type = 'CASH'",
      "action": "REJECT",
      "note": "Auto-rejected: Cash gifts to government officials prohibited"
    }
  ]
}
```

### 3.5 Conditions Tracking

When disclosure approved "With Conditions":

1. **Reviewer adds conditions** with:
   - Description (what employee must do)
   - Due date
   - Optional assignee (if not the employee)

2. **Employee notified** via email + Employee Portal

3. **Reminders sent** at configured intervals:
   - Default: 14 days, 7 days, 3 days, 1 day before due

4. **Completion tracking**:
   - Employee or assignee marks complete
   - Completion notes captured
   - Reviewer can verify or waive

5. **Overdue handling**:
   - Status changes to OVERDUE
   - Escalation to manager (configurable)
   - Tracked in compliance dashboards

---

## 4. Campaign Engine

### 4.1 Campaign Types

| Type | Description | Use Case | Targeting |
|------|-------------|----------|-----------|
| **Point-in-Time** | Fixed employee list at launch | Annual COI | Snapshot at launch date |
| **Rolling** | Triggered by HRIS events | New hire onboarding | Continuous monitoring |

### 4.2 HRIS-Driven Targeting

**Inclusion Rules:**
```javascript
{
  "include": [
    { "field": "department", "operator": "in", "values": ["Sales", "Marketing", "BD"] },
    { "field": "job_level", "operator": ">=", "value": "Manager" },
    { "field": "location_country", "operator": "in", "values": ["US", "UK", "DE"] }
  ],
  "operator": "AND"  // or "OR"
}
```

**Exclusion Rules:**
```javascript
{
  "exclude": [
    { "field": "employment_type", "operator": "=", "value": "CONTRACTOR" },
    { "field": "termination_date", "operator": "is_not_null" }
  ]
}
```

**Rolling Campaign Triggers:**
| Trigger Event | Description | Days After |
|---------------|-------------|------------|
| NEW_HIRE | Employee start date | 7-30 days |
| ROLE_CHANGE | Promotion or transfer | 7 days |
| PROMOTION | Specific promotion event | 7 days |
| ANNUAL_ANNIVERSARY | Yearly from start date | 0 days |

### 4.3 Campaign Exceptions

| Exception | Trigger | Logged | Reversible |
|-----------|---------|--------|------------|
| **Prior Completion** | Already submitted this form within X days | Auto | No |
| **Terminated** | Employee no longer active in HRIS | Auto | No |
| **Role Change** | Employee moved to excluded role | Auto | Yes |
| **Leave of Absence** | Employee on extended leave | Manual | Yes |
| **Manual Override** | Admin marks as exception | Manual + reason | Yes |

### 4.4 Completion Tracking

**Dashboard Metrics:**
- Total assigned
- Completed (count + %)
- In Progress (started, not submitted)
- Pending (not started)
- Overdue (past due date)
- Exceptions

**Notifications Schedule:**
```
Day 0: Campaign launches → Initial invitation email
Day X-30: First reminder
Day X-14: Second reminder
Day X-7: Third reminder (urgency increases)
Day X-3: Fourth reminder
Day X-1: Final reminder
Day X+1: Overdue notification → Employee + Manager
Day X+3: Escalation to Compliance
```

---

## 5. Ethics Portal & Employee Portal

### 5.1 Ethics Portal (Public Landing Page)

**Characteristics:**
- Public-facing URL (e.g., `ethics.company.com`)
- Google-searchable (SEO enabled)
- Client-branded (logo, colors, messaging)
- No login required to view

**Content (Client-Configurable):**
- Welcome message / video
- Company values statement
- Available forms and resources
- Contact information
- Links to Code of Conduct, policies

**Actions Without Login:**
| Action | Identifier Required |
|--------|---------------------|
| Submit speak-up report | None (anonymous allowed) |
| Submit ad-hoc disclosure | Employee ID or email |
| Access campaign disclosure | Employee ID or email + campaign code |
| Check case status | Access code (for anonymous reporters) |

**Login Flow:**
- SSO login button → redirects to Employee Portal
- Company SSO (SAML/OIDC) integration

### 5.2 Employee Portal (Authenticated)

**Access:** SSO login required

**Sections:**

**1. My Disclosures**
- Outstanding disclosures requiring action (from campaigns)
- Draft disclosures (saved but not submitted)
- Submitted disclosures (pending review)
- Past disclosures (cleared, rejected, with conditions)
- Disclosure history with version timeline

**2. Conditions & Follow-ups**
- Open conditions to complete
- Overdue conditions (highlighted)
- Completed conditions history

**3. My Cases** (from Case Management module)
- Cases I submitted (status, correspondence)
- Follow-up capability
- Messages from Compliance

**4. Policies** (from Policy Management module)
- Policies relevant to my role
- Attestation status
- Training requirements

**5. Submit New**
- Ad-hoc disclosure submission
- Speak-up report submission

### 5.3 Employee Portal - Disclosure View

**Disclosure Card:**
```
┌─────────────────────────────────────────────────────────────┐
│ DIS-2026-00042                                    CLEARED   │
│ Conflicts of Interest                                       │
├─────────────────────────────────────────────────────────────┤
│ Submitted: Jan 15, 2026                                     │
│ Reviewed: Jan 18, 2026                                      │
│ Decision: Cleared                                           │
│                                                             │
│ [View Details]  [Create Update]                             │
└─────────────────────────────────────────────────────────────┘
```

**Disclosure Detail (Employee View):**
- All submitted responses (read-only)
- Status and timeline
- Decision (if made) - but NOT reviewer identity if anonymous
- Conditions (if any) with status
- Attachments
- Version history

---

## 6. Integration with Case Management

> **Architecture:** Disclosures follow the same RIU->Case architecture as hotline reports. The disclosure RIU links to Cases via `riu_case_associations`.

### 6.1 Automatic Case Creation (Threshold-Based)

**Trigger:** Disclosure form responses match configured `auto_case_rules`

**Threshold Examples:**
```javascript
{
  "auto_case_rules": [
    {
      "condition": "gift_value > 100",
      "action": "CREATE_CASE",
      "case_category": "Gifts & Entertainment Review",
      "severity": "MEDIUM"
    },
    {
      "condition": "relationship_type = 'GOVERNMENT_OFFICIAL'",
      "action": "CREATE_CASE",
      "case_category": "Government COI Review",
      "severity": "HIGH"
    },
    {
      "condition": "conflict_type = 'FAMILY_AT_VENDOR' AND vendor_contract_value > 50000",
      "action": "CREATE_CASE",
      "case_category": "Vendor COI Review",
      "severity": "MEDIUM"
    }
  ]
}
```

**Process:**
1. Employee submits disclosure form
2. System creates RIU (type: `disclosure_response`) - immutable record
3. System evaluates `auto_case_rules` against form responses
4. If threshold matched:
   - System creates Case
   - Links RIU to Case via `riu_case_associations` (association_type: 'primary')
   - Disclosure entity updated with `case_creation_trigger: 'AUTO_THRESHOLD'`
   - Case follows normal Case Management workflow
5. If no threshold matched:
   - RIU stored (disclosure record preserved)
   - Disclosure entity created but no Case
   - Can be manually escalated later if needed

### 6.2 Manual Case Creation (Escalation)

**Trigger:** Reviewer clicks "Escalate to Case" or "Create Case"

**Process:**
1. System creates Case in Case Management module
2. Links disclosure RIU to Case via `riu_case_associations` (association_type: 'primary')
3. Case pre-populated with:
   - Source channel from RIU
   - Disclosure reference number
   - Employee as Subject (DISCLOSER or OTHER based on context)
   - AI-generated summary from RIU as case narrative
   - All attachments linked (not copied)
4. Disclosure status -> ESCALATED
5. Disclosure updated with `case_creation_trigger: 'MANUAL_ESCALATION'`
6. Activity logged on both RIU, Disclosure, and Case

**Case Pre-Population (from RIU):**
```javascript
{
  "source_channel": "DISCLOSURE",
  "riu_id": "uuid-of-disclosure-rii",
  "source_reference": "DIS-2026-00042",
  "summary": "Escalated from disclosure: Undisclosed conflict of interest...",
  "subjects": [
    {
      "name": "John Smith",
      "employee_id": "EMP123",
      "subject_type": "DISCLOSER",
      "relationship": "EMPLOYEE"
    }
  ],
  "category": "Conflicts of Interest",
  "severity": "MEDIUM",  // Reviewer can adjust
  "linked_disclosure_id": "uuid-of-disclosure"
}
```

### 6.3 Linking Disclosure RIU to Existing Case

**Trigger:** Compliance Officer identifies related disclosure during review

**Process:**
1. Search for existing Case by reference number or category
2. Link disclosure RIU to Case via `riu_case_associations` (association_type: 'related')
3. Disclosure updated with `case_creation_trigger: 'MANUAL_LINK'`
4. Activity logged on both entities

**Use Case:** Multiple family members at the same vendor - link all disclosure RIUs to a single "Vendor Relationship Review" Case.

### 6.4 Cross-Reference Visibility

**In Case Detail:**
- "Linked RIUs" section shows all associated RIUs (including disclosure_response type)
- Filter by RIU type to see only disclosures
- Click-through to disclosure (if user has permission)
- Association type shown (primary, related)

**In Disclosure Detail:**
- "Related Case" section shows linked case (if any)
- Shows how case was created (AUTO_THRESHOLD, MANUAL_ESCALATION, MANUAL_LINK)
- Click-through to case (if user has permission)

---

## 7. Gifts & Entertainment (GT&E) - MVP

### 7.1 GT&E-Specific Features

**Scope (Phase 3):**
- Transactional disclosures only (one-time submissions)
- No updates to submitted GT&E (submit new for each transaction)
- Currency support with conversion
- Threshold-based routing
- Proxy delegation for executives
- Aggregated reporting

**GT&E Form Fields:**

| Field | Type | Required |
|-------|------|----------|
| Transaction Type | Dropdown (Received/Given) | Yes |
| Gift Type | Dropdown (Gift, Meal, Entertainment, Travel, Other) | Yes |
| Description | Text | Yes |
| Estimated Value | Currency | Yes |
| Currency | Dropdown | Yes |
| Date of Transaction | Date | Yes |
| External Party | Lookup/Text | Yes |
| Party Type | Dropdown (Vendor, Customer, Government, Other) | Yes |
| Business Purpose | Text | Yes |
| Other Attendees | Multi-employee lookup | No |
| Reciprocated | Yes/No | No |
| Receipt/Documentation | File Upload | Conditional |

### 7.2 Threshold Engine

**Evaluation Order:**
1. Check location-specific rules first (state/country)
2. Check context-specific rules (government, competitor)
3. Check general threshold rules
4. Apply aggregation if configured

**Aggregation Example:**
```
Rule: Gifts from same vendor > $100 per quarter → Compliance Review

Employee receives:
  - Jan 15: $40 gift from Acme Corp
  - Feb 20: $45 gift from Acme Corp
  - Mar 10: $30 gift from Acme Corp

Total: $115 → Exceeds threshold → Routes to Compliance
```

### 7.3 Currency Handling

- All thresholds stored in USD
- Conversion at submission using daily rates
- Original currency preserved for audit
- Display in employee's local currency

---

## 8. Standard Disclosure Library

Pre-built templates (clients can customize or create new):

| Type | Description | Default Workflow | Typical Fields |
|------|-------------|------------------|----------------|
| **Conflicts of Interest** | Financial interests, board positions, family | Manager → Compliance | Relationship type, Entity, Role, Financial interest |
| **Gifts & Entertainment** | Items received/given | Threshold-based | Value, Party, Date, Purpose |
| **Outside Employment** | Second jobs, consulting | Manager → Compliance | Employer, Hours, Compensation, Conflict assessment |
| **Personal Relationships** | Relatives, romantic | HR → Compliance | Relationship type, Employee name, Reporting relationship |
| **Political Contributions** | Donations, campaigns | Legal → Compliance | Amount, Recipient, Date, Personal/Corporate |
| **Travel & Hospitality** | Sponsored travel | Manager | Sponsor, Destination, Dates, Value |
| **Speaking Engagements** | External presentations | Manager | Event, Date, Honorarium, Topic |

---

## 9. Localization

### 9.1 Multi-Language Support

**Employee Experience:**
- Form displayed in employee's preferred language
- Response submitted in employee's language
- Confirmation in employee's language

**Reviewer Experience:**
- Responses auto-translated to reviewer's language
- Original response preserved and visible
- Translation indicator shown

### 9.2 Translation Implementation

```
Employee submits in Spanish:
┌─────────────────────────────────────┐
│ "Tengo una relación familiar con..." │
└─────────────────────────────────────┘
                ↓
            [AI Translation]
                ↓
Reviewer sees:
┌─────────────────────────────────────────────────────────────┐
│ "I have a family relationship with..."                      │
│                                                             │
│ 🌐 [View Original] ← click to see Spanish                   │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 Form Localization

- Question text stored per language
- Single form definition with translations
- Fallback to default language if translation missing
- Admin can manage translations or use AI-assisted

---

## 10. Bulk Actions

### 10.1 Bulk Approve/Reject

**Available to:** Compliance Officers, Admins

**Process:**
1. Filter disclosures by criteria (e.g., "Gift < $25, Non-government")
2. Select disclosures (up to 100 at a time)
3. Choose action: Bulk Approve or Bulk Reject
4. Add optional note (applies to all)
5. Confirm action

**Audit Trail:**
- Each disclosure logged individually
- Batch decision record links all affected
- Actor, timestamp, note recorded per disclosure

### 10.2 Bulk Assignment

**Process:**
1. Select pending disclosures
2. Choose assignee or queue
3. Confirm assignment

---

## 11. Reporting & Dashboards

### 11.1 Operational Metrics

| Metric | Description | Drill-down |
|--------|-------------|------------|
| Submitted | Total disclosures submitted | By type, department, period |
| Pending Review | Awaiting reviewer action | By age, reviewer, type |
| Cleared | Approved disclosures | By type, department |
| Rejected | Rejected disclosures | By type, reason |
| With Conditions | Approved with conditions | Conditions open/complete |
| Active | Currently active disclosures | By type, department |
| Inactive | Marked inactive | By reason |

### 11.2 Campaign Metrics

| Metric | Description |
|--------|-------------|
| Completion Rate | Completed / Assigned × 100% |
| On-Time Completion | Completed before due date |
| Overdue Rate | Overdue / Assigned |
| Time to Complete | Average days from invite to submission |
| Exception Rate | Exceptions / Assigned |

### 11.3 Risk Metrics

| Metric | Description |
|--------|-------------|
| High-Risk Disclosures | Count by risk level |
| Risk Distribution | By department, location, type |
| Escalation Rate | Disclosures → Cases |
| Repeat Disclosers | Employees with multiple disclosures |

### 11.4 Saved Views

Same pattern as Case Management:
- Custom columns
- Custom filters
- Custom sort
- Save with name
- Share with team (optional)

---

## 12. Permissions Matrix

### 12.1 Disclosure Permissions

| Permission | Employee | Manager | Compliance | Legal | Admin |
|------------|----------|---------|------------|-------|-------|
| Submit own disclosure | ✓ | ✓ | ✓ | ✓ | ✓ |
| View own disclosures | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit proxy (direct report) | ✗ | ✓ | ✓ | ✓ | ✓ |
| Submit delegate proxy | ✗ | ✗ | ✗ | ✗ | ✓ (configure) |
| Review assigned | ✗ | ✓ | ✓ | ✓ | ✓ |
| Review all (scoped) | ✗ | ✗ | ✓ | ✓ | ✓ |
| Approve/Reject | ✗ | ✓ | ✓ | ✓ | ✓ |
| Add conditions | ✗ | ✗ | ✓ | ✓ | ✓ |
| Escalate to Case | ✗ | ✗ | ✓ | ✓ | ✓ |
| Bulk actions | ✗ | ✗ | ✓ | ✓ | ✓ |
| View External Party | ✗ | ✗ | ✓ | ✓ | ✓ |
| Configure forms | ✗ | ✗ | ✓ | ✗ | ✓ |
| Configure campaigns | ✗ | ✗ | ✓ | ✗ | ✓ |
| Configure workflows | ✗ | ✗ | ✓ | ✗ | ✓ |
| Configure thresholds | ✗ | ✗ | ✗ | ✓ | ✓ |
| Set up delegations | ✗ | ✗ | ✗ | ✗ | ✓ |
| Export data | ✗ | ✗ | ✓ | ✓ | ✓ |

### 12.2 Visibility Scoping

Managers see disclosures from:
- Direct reports only (default)
- Extended team (configurable)

Compliance sees disclosures:
- All (default)
- Scoped by region/department (configurable)

---

## 13. Notifications

### 13.1 Employee Notifications

| Event | Channel | Content |
|-------|---------|---------|
| Campaign assigned | Email | "You have a new disclosure to complete" |
| Reminder (configurable) | Email | "Reminder: Disclosure due in X days" |
| Overdue | Email | "Your disclosure is overdue" |
| Decision made | Email + Portal | "Your disclosure has been reviewed" |
| Condition added | Email + Portal | "Action required on your disclosure" |
| Condition reminder | Email | "Reminder: Condition due in X days" |
| Condition overdue | Email | "Your condition is overdue" |

### 13.2 Reviewer Notifications

| Event | Channel | Content |
|-------|---------|---------|
| Assigned for review | Email + In-app | "New disclosure assigned for review" |
| SLA warning | Email + In-app | "Disclosure review due in X hours" |
| Escalation received | Email + In-app | "Disclosure escalated to you" |
| Condition completed | In-app | "Condition marked complete" |

### 13.3 Manager Notifications

| Event | Channel | Content |
|-------|---------|---------|
| Team member overdue | Email | "Team member has overdue disclosure" |
| Team member condition overdue | Email | "Team member has overdue condition" |
| Escalation (if configured) | Email | "Disclosure escalated for review" |

---

## 14. API Endpoints

### 14.1 Disclosure Form Endpoints

```
GET     /api/v1/disclosure-forms                      # List forms
POST    /api/v1/disclosure-forms                      # Create form
GET     /api/v1/disclosure-forms/{id}                 # Get form detail
PATCH   /api/v1/disclosure-forms/{id}                 # Update form
DELETE  /api/v1/disclosure-forms/{id}                 # Archive form
POST    /api/v1/disclosure-forms/{id}/publish         # Publish form
POST    /api/v1/disclosure-forms/{id}/clone           # Clone form
GET     /api/v1/disclosure-forms/{id}/versions        # Get version history
GET     /api/v1/disclosure-forms/library              # Get standard library
```

### 14.2 Campaign Endpoints

```
GET     /api/v1/campaigns                             # List campaigns
POST    /api/v1/campaigns                             # Create campaign
GET     /api/v1/campaigns/{id}                        # Get campaign detail
PATCH   /api/v1/campaigns/{id}                        # Update campaign
DELETE  /api/v1/campaigns/{id}                        # Cancel campaign
POST    /api/v1/campaigns/{id}/launch                 # Launch campaign
POST    /api/v1/campaigns/{id}/pause                  # Pause campaign
POST    /api/v1/campaigns/{id}/resume                 # Resume campaign
GET     /api/v1/campaigns/{id}/statistics             # Get completion stats
GET     /api/v1/campaigns/{id}/assignments            # List assignments
POST    /api/v1/campaigns/{id}/assignments/{aid}/exception  # Mark exception
POST    /api/v1/campaigns/{id}/assignments/{aid}/extend     # Extend due date
POST    /api/v1/campaigns/{id}/remind                 # Send bulk reminder
```

### 14.3 Disclosure Endpoints

```
GET     /api/v1/disclosures                           # List disclosures
POST    /api/v1/disclosures                           # Create disclosure (creates RIU + Disclosure)
GET     /api/v1/disclosures/{id}                      # Get disclosure detail (includes linked RIU)
PATCH   /api/v1/disclosures/{id}                      # Update disclosure workflow state (draft)
DELETE  /api/v1/disclosures/{id}                      # Delete draft (RIU not created until submit)
POST    /api/v1/disclosures/{id}/submit               # Submit disclosure (creates RIU, evaluates thresholds)
POST    /api/v1/disclosures/{id}/withdraw             # Withdraw disclosure
GET     /api/v1/disclosures/{id}/riu                  # Get the linked RIU (disclosure_response)
GET     /api/v1/disclosures/{id}/versions             # Get version history
GET     /api/v1/disclosures/{id}/timeline             # Get activity timeline (includes RIU activity)
POST    /api/v1/disclosures/{id}/version              # Create new version (new RIU created)
```

> **Note:** Submitting a disclosure creates an immutable RIU (type: `disclosure_response`). The RIU preserves what was disclosed. The Disclosure entity tracks mutable workflow state.

### 14.4 Review Endpoints

```
POST    /api/v1/disclosures/{id}/assign               # Assign reviewer
POST    /api/v1/disclosures/{id}/reassign             # Reassign to different reviewer
POST    /api/v1/disclosures/{id}/decide               # Make decision
        Body: { decision: "CLEARED"|"REJECTED"|"WITH_CONDITIONS", notes: "..." }
POST    /api/v1/disclosures/{id}/escalate             # Escalate to next stage
POST    /api/v1/disclosures/{id}/create-case          # Create Case, link RIU via riu_case_associations
        Body: { category_id, severity, notes, subject_type: "DISCLOSER"|"OTHER" }
POST    /api/v1/disclosures/{id}/link-to-case         # Link RIU to existing Case
        Body: { case_id, association_type: "related", notes }
POST    /api/v1/disclosures/bulk-decide               # Bulk decision
        Body: { disclosure_ids: [...], decision: "CLEARED", notes: "..." }
POST    /api/v1/disclosures/bulk-assign               # Bulk assignment
```

> **Note:** `create-case` and `link-to-case` both operate on the disclosure's underlying RIU, creating entries in `riu_case_associations`.

### 14.5 Condition Endpoints

```
GET     /api/v1/disclosures/{id}/conditions           # List conditions
POST    /api/v1/disclosures/{id}/conditions           # Add condition
PATCH   /api/v1/disclosures/{id}/conditions/{cid}     # Update condition
POST    /api/v1/disclosures/{id}/conditions/{cid}/complete   # Mark complete
POST    /api/v1/disclosures/{id}/conditions/{cid}/waive      # Waive condition
```

### 14.6 External Party Endpoints

```
GET     /api/v1/external-parties                      # List parties
POST    /api/v1/external-parties                      # Create party
GET     /api/v1/external-parties/{id}                 # Get party detail
PATCH   /api/v1/external-parties/{id}                 # Update party
GET     /api/v1/external-parties/{id}/disclosures     # Get linked disclosures
GET     /api/v1/external-parties/{id}/cases           # Get linked cases
GET     /api/v1/external-parties/search               # Search parties
```

### 14.7 Proxy Delegation Endpoints

```
GET     /api/v1/proxy-delegations                     # List delegations
POST    /api/v1/proxy-delegations                     # Create delegation
GET     /api/v1/proxy-delegations/{id}                # Get delegation detail
PATCH   /api/v1/proxy-delegations/{id}                # Update delegation
DELETE  /api/v1/proxy-delegations/{id}                # Revoke delegation
GET     /api/v1/proxy-delegations/my-delegates        # Get my delegates
GET     /api/v1/proxy-delegations/my-delegators       # Get who I can submit for
```

### 14.8 Employee Portal Endpoints

```
GET     /api/v1/employee/disclosures                  # My disclosures
GET     /api/v1/employee/pending-actions              # My pending actions
GET     /api/v1/employee/conditions                   # My open conditions
GET     /api/v1/employee/disclosure-history           # My disclosure history
GET     /api/v1/employee/campaigns                    # Campaigns assigned to me
```

### 14.9 GT&E Threshold Endpoints

```
GET     /api/v1/gte-thresholds                        # List thresholds
POST    /api/v1/gte-thresholds                        # Create threshold
GET     /api/v1/gte-thresholds/{id}                   # Get threshold detail
PATCH   /api/v1/gte-thresholds/{id}                   # Update threshold
DELETE  /api/v1/gte-thresholds/{id}                   # Delete threshold
POST    /api/v1/gte-thresholds/evaluate               # Evaluate value against thresholds
```

### 14.10 Workflow Endpoints

```
GET     /api/v1/disclosure-workflows                  # List workflows
POST    /api/v1/disclosure-workflows                  # Create workflow
GET     /api/v1/disclosure-workflows/{id}             # Get workflow detail
PATCH   /api/v1/disclosure-workflows/{id}             # Update workflow
DELETE  /api/v1/disclosure-workflows/{id}             # Archive workflow
```

---

## 15. Acceptance Criteria

### 15.1 Functional Acceptance

| ID | Criterion | Priority |
|----|-----------|----------|
| AC-01 | Employee can submit ad-hoc disclosure via Ethics Portal (no login) | P0 |
| AC-02 | Employee can submit disclosure via campaign with SSO login | P0 |
| AC-03 | Submitting disclosure creates RIU (type: disclosure_response) | P0 |
| AC-04 | RIU is immutable; disclosure workflow state is mutable | P0 |
| AC-05 | Disclosure versions tracked; each version creates new RIU | P0 |
| AC-06 | Workflow routes disclosure to correct reviewer based on rules | P0 |
| AC-07 | Reviewer can clear, reject, or add conditions | P0 |
| AC-08 | Conditions have due dates and send automated reminders | P0 |
| AC-09 | Employee sees conditions in Employee Portal | P0 |
| AC-10 | Case created automatically when thresholds met (auto_case_rules) | P0 |
| AC-11 | Case links to disclosure RIU via riu_case_associations | P0 |
| AC-12 | Reviewer can manually escalate disclosure to new Case | P0 |
| AC-13 | Reviewer can link disclosure RIU to existing Case | P0 |
| AC-14 | Campaign assigns employees based on HRIS rules | P0 |
| AC-15 | Campaign Assignment links to created RIU on completion | P0 |
| AC-16 | Campaign sends reminders on schedule | P0 |
| AC-17 | Campaign tracks completion rate in real-time | P0 |
| AC-18 | Campaign handles exceptions (prior completion, terminated) | P1 |
| AC-19 | Multi-stage approval workflow works (up to 4 stages) | P1 |
| AC-20 | Auto-clear and auto-reject rules process correctly | P1 |
| AC-21 | External Party links disclosures automatically | P1 |
| AC-22 | Bulk approve/reject works with individual audit trail | P1 |
| AC-23 | Proxy submission works for managers | P0 |
| AC-24 | Delegate proxy submission works for configured EAs | P2 |
| AC-25 | GT&E thresholds route correctly based on value/context | P2 |
| AC-26 | Multi-language form submission works | P2 |
| AC-27 | Reviewer sees translated responses + original (from RIU) | P2 |
| AC-28 | Activity log records all actions immutably on both RIU and Disclosure | P0 |
| AC-29 | Saved views work with disclosure data | P0 |
| AC-30 | Export to CSV works for disclosures | P1 |

### 15.2 Performance Targets

| Metric | Target |
|--------|--------|
| Disclosure list load (25 items) | < 1 second |
| Disclosure detail load | < 500ms |
| Form submission | < 2 seconds |
| Campaign launch (1000 employees) | < 30 seconds |
| Bulk decision (100 disclosures) | < 10 seconds |
| Threshold evaluation | < 100ms |
| Full-text search | < 2 seconds |
| Concurrent users | > 100 without degradation |

---

## 16. MVP Scope

### 16.1 Phase 1 (MVP) - Weeks 5-8

**Included:**
- Disclosure Form entity with standard library (7 types)
- RIU creation (type: disclosure_response) on submission
- RIU->Case linking via riu_case_associations
- Basic threshold rules for auto Case creation
- Ad-hoc disclosure submission (authenticated and unauthenticated)
- Basic approval workflow (single-stage)
- Active/inactive status management
- Version tracking (new version creates new RIU)
- Conditions with due dates and reminders
- Integration: Create Case from disclosure (manual + threshold-based)
- Integration: Link disclosure RIU to existing Case
- Employee Portal: View own disclosures
- External Party entity (basic)
- Activity timeline (unified across RIU and Disclosure)
- Role-based permissions
- Basic reporting
- Email notifications
- Export to CSV

**Not Included:**
- Campaign engine
- Multi-stage workflows
- Advanced auto-clear/auto-reject rules
- GT&E thresholds with aggregation
- Bulk actions
- Localization
- Advanced reporting dashboards

### 16.2 Phase 2 - Weeks 9-12

**Added:**
- Campaign engine (point-in-time and rolling)
- Campaign Assignment -> RIU creation flow
- Campaign Assignment stores riu_id on completion
- HRIS-driven targeting
- Multi-stage approval workflows (up to 4 stages)
- Conditional routing
- Advanced auto-clear/auto-reject rules with threshold evaluation
- Campaign completion dashboards
- Campaign exception handling
- Bulk assignment

### 16.3 Phase 3 - Weeks 13-16

**Added:**
- GT&E MVP (thresholds, currency, aggregation)
- Proxy delegation (basic + delegate)
- Risk scoring (rules-based)
- External Party deep linking
- Bulk approve/reject
- Advanced reporting

### 16.4 Phase 4 - Weeks 17-20

**Added:**
- Workflow self-service UI (guardrailed)
- Localization (multi-language forms and translation)
- Redaction for GDPR
- Condition tracking enhancements
- Advanced risk indicators

---

## Appendix A: Standard Disclosure Form - COI

Example Conflicts of Interest form structure:

**Section 1: Personal Information**
- Name (auto-filled from SSO)
- Department (auto-filled from HRIS)
- Location (auto-filled from HRIS)
- Manager (auto-filled from HRIS)

**Section 2: Disclosure Statement**
- "Do you have any conflicts of interest to disclose?" (Yes/No)
  - If No → Positive confirmation, submit
  - If Yes → Continue to details

**Section 3: Conflict Details** (repeatable)
- Conflict Type (dropdown):
  - Financial Interest
  - Board/Advisory Position
  - Family Employment
  - Outside Business Ownership
  - Personal Relationship
  - Other
- Description of Conflict (text)
- External Party (lookup/text)
- Is this a government entity? (Yes/No)
- Estimated Financial Value (if applicable) (currency)
- Start Date (date)
- Is this conflict ongoing? (Yes/No)
- Supporting Documents (file upload)

**Section 4: Certification**
- "I certify that the information provided is accurate and complete" (checkbox, required)
- Electronic Signature (text)
- Date (auto-filled)

---

## Appendix B: Campaign Email Templates

### Campaign Invitation

```
Subject: Action Required: [Campaign Name]

Dear [Employee Name],

As part of our compliance program, you are required to complete the
[Disclosure Type] disclosure.

Due Date: [Due Date]

Click here to complete your disclosure: [Link]

If you have any questions, please contact [Compliance Email].

Thank you,
[Company] Compliance Team
```

### Reminder (7 Days)

```
Subject: Reminder: [Campaign Name] - Due in 7 Days

Dear [Employee Name],

This is a reminder that your [Disclosure Type] disclosure is due
in 7 days.

Due Date: [Due Date]

Click here to complete: [Link]

Thank you,
[Company] Compliance Team
```

### Overdue

```
Subject: OVERDUE: [Campaign Name] - Immediate Action Required

Dear [Employee Name],

Your [Disclosure Type] disclosure was due on [Due Date] and is
now overdue.

Please complete this immediately: [Link]

Your manager has been notified.

Thank you,
[Company] Compliance Team
```

---

## Appendix C: Risk Scoring Rules (Example)

Default risk scoring rules (clients can customize):

| Factor | Points | Condition |
|--------|--------|-----------|
| Government involvement | +30 | `is_government = true` |
| High financial value | +20 | `financial_value > 10000` |
| Competitor involvement | +25 | `is_competitor = true` |
| Board position | +15 | `conflict_type = 'BOARD_POSITION'` |
| Family employment | +10 | `conflict_type = 'FAMILY_EMPLOYMENT'` |
| Executive level | +10 | `employee_level >= 'VP'` |
| Multiple conflicts | +5 each | `conflict_count > 1` |
| Prior issues | +15 | `has_prior_issues = true` |

**Risk Levels:**
- 0-25: LOW
- 26-50: MEDIUM
- 51+: HIGH

---

## Appendix D: Glossary (RIU Architecture)

| Term | Definition |
|------|------------|
| **RIU** | Risk Intelligence Unit - immutable input representing something that happened (a disclosure was submitted, a report was filed). For disclosures, type is `disclosure_response`. |
| **Disclosure** | Mutable business workflow entity that sits on top of an RIU. Tracks review status, conditions, versioning. |
| **Campaign** | Outbound request for disclosures from a target population (annual COI, gifts review). |
| **Campaign Assignment** | Individual employee's obligation to complete a disclosure form. Links to the RIU created on completion. |
| **riu_case_associations** | Many-to-many link table connecting RIUs to Cases. Association types: `primary`, `related`, `merged_from`. |
| **auto_case_rules** | Configurable threshold rules that determine whether a disclosure RIU should automatically create a Case. |
| **disclosure_response** | The RIU type for all disclosure submissions. Immutable record of what was disclosed. |
| **threshold** | Configurable trigger (e.g., gift_value > $100, government_official = true) that determines whether a disclosure requires Case-level review. |

---

*End of Disclosures PRD*
