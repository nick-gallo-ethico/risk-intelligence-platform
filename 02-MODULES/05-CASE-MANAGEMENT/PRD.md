# Ethico Risk Intelligence Platform
## PRD-005: Case Management & Investigations

**Document ID:** PRD-005
**Version:** 3.1 (RIU - Risk Intelligence Unit)
**Priority:** P0 - Critical (Foundation Module)
**Development Phase:** Weeks 3-4 (Core), Extended through Week 12
**Last Updated:** February 2026

> **Architecture Reference:** This PRD implements the RIU→Case architecture defined in `00-PLATFORM/01-PLATFORM-VISION.md v3.1`. Cases are **mutable work containers** that link to **immutable RIUs** (Risk Intelligence Units). Intake information lives on RIUs, not Cases.

---

## 1. Executive Summary

The Case Management module is the foundational component of the Ethico Risk Intelligence Platform. It manages the complete lifecycle of ethics and compliance reports—from intake through investigation, findings, and remediation.

**This module establishes patterns used throughout the platform:**
- Entity relationships (Case → Investigations → Remediation)
- Workflow engine (reused by Disclosures, Corrective Actions)
- Permission model (base RBAC for entire platform)
- Activity timeline (standard audit trail component)
- List/detail UI patterns (template for all modules)
- AI integration patterns (standard for all AI features)

### Module Scope

| In Scope | Out of Scope (Other PRDs) |
|----------|---------------------------|
| Case entity & lifecycle | Operator Console UI (PRD-002) |
| Investigation management | Web Form Builder (PRD-004) |
| Findings & outcomes | Disclosure Management (PRD-006) |
| Remediation plans | Analytics & Reporting (PRD-007) |
| Subject tracking | Policy Management (PRD-009) |
| Two-way communication | Employee Portal (PRD-003) |
| Follow-up handling | |
| AI features (case-level) | |

---

## 2. User Stories

### Ethico Staff

**Create RIU from phone intake (Operator Console creates RIU, system creates Case)**
As an **Operator**, I want to capture a hotline report
so that the reporter's concern is recorded and routed to the appropriate client.

Key behaviors:
- Operator creates **RIU** (type: hotline_report), not Case directly
- RIU created with status 'pending_qa' until QA review
- Required fields on RIU: category, severity, description, reporter contact method
- Reporter information encrypted if identified, stored on RIU
- Anonymous reporter receives access code (stored on RIU)
- After QA releases RIU → System automatically creates **Case** and links RIU as 'primary'
- Activity logged: "Operator {name} created RIU from phone intake"
- Activity logged: "System created Case from released RIU"

> **Note:** See PRD-002 (Operator Console) for the full intake workflow. This module receives Cases after RIU release.

---

**Handle follow-up call**
As an **Operator**, I want to link new information from a follow-up call to an existing case
so that investigators see updates without creating duplicate cases.

Key behaviors:
- Lookup case by access code (anonymous) or reporter info (identified)
- New information added as Interaction, not new case
- Original case context displayed during capture
- Assignee notified of new information
- Activity logged: "Operator {name} added follow-up information"

---

**Review case before release**
As a **QA Reviewer**, I want to review and edit operator-submitted cases
so that only quality-checked cases reach client platforms.

Key behaviors:
- QA queue sorted by severity (high first), then age
- All case fields editable during review
- QA notes visible only to Ethico staff
- Can reject back to operator with feedback
- Activity logged: "QA Reviewer {name} released case to {client}"

---

### Client Admin

**View case list with filters**
As a **Compliance Officer**, I want to view all cases in my organization with filtering
so that I can monitor the compliance program and find specific cases.

Key behaviors:
- List shows cases for authenticated user's organization only
- Filterable by status, category, severity, date range, assignee
- Saved views persist user's preferred filters
- Pagination for large result sets
- organizationId enforced by RLS

---

**View case details**
As a **Compliance Officer**, I want to view complete case details including linked RIUs and investigations
so that I can understand the full context of a report.

Key behaviors:
- Case header: reference number, status, severity, category
- **Linked RIUs section** showing all associated Risk Intelligence Units
  - Primary RIU displayed prominently with full intake details
  - Related RIUs listed with association type and date
- Intake information pulled from primary RIU (respecting anonymity)
- Linked investigations with their statuses
- Activity timeline showing all actions across Case and linked RIUs
- organizationId enforced by RLS

---

**Link additional RIU to existing Case**
As a **Triage Lead**, I want to link a new report (RIU) to an existing Case
so that related reports are tracked together.

Key behaviors:
- Search for existing Cases by reference number, category, or subject
- Link RIU to selected Case with association_type 'related'
- Original Case's primary RIU remains unchanged
- Activity logged: "Triage Lead {name} linked RIU {riu_id} to Case {case_number}"
- Notification sent to Case assignee

---

**Merge Cases**
As a **Compliance Officer**, I want to merge two Cases into one
so that duplicate or related reports are consolidated.

Key behaviors:
- Select primary Case (will remain) and secondary Case (will be merged)
- All RIU associations from secondary move to primary (association_type: 'merged_from')
- All investigations from secondary move to primary
- Secondary Case marked as merged, read-only tombstone
- Accessing merged Case redirects to primary
- Activity logged on both Cases
- Requires merge permission (configurable per client)

---

**Assign case to investigator**
As a **Triage Lead**, I want to assign cases to investigators
so that reports are handled by the appropriate team members.

Key behaviors:
- Select investigator(s) from organization's user list
- Set primary investigator if multiple assignees
- Optional due date and priority
- Assignee receives notification
- Activity logged: "Triage Lead {name} assigned case to {investigator}"

---

**Create investigation on case**
As an **Investigator**, I want to create an investigation for an assigned case
so that I can formally track my work.

Key behaviors:
- Investigation linked to parent case
- Category may differ from case category
- Status starts as 'new', transitions to 'assigned' when investigator set
- Investigation template optionally applied
- Activity logged: "Investigator {name} created investigation"

---

**Add notes to investigation**
As an **Investigator**, I want to add notes and document interviews
so that my investigation work is recorded.

Key behaviors:
- Multiple note types: general, interview, research, policy reference
- Rich text content with file attachments
- Notes filterable by type
- Visibility controls (private, team, all)
- Activity logged: "Investigator {name} added {note_type} note"

---

**Record findings and close investigation**
As an **Investigator**, I want to record findings and close the investigation
so that the case can progress to remediation.

Key behaviors:
- Findings summary required before closure
- Outcome selection: substantiated, unsubstantiated, inconclusive, etc.
- Optional: root cause, lessons learned
- Approval workflow if configured
- Activity logged: "Investigator {name} closed investigation with outcome {outcome}"

---

**Send message to reporter**
As an **Investigator**, I want to send messages to anonymous reporters
so that I can request additional information.

Key behaviors:
- Message sent via Ethico relay (reporter address hidden)
- Reporter notified via email or portal
- Messages appear on case timeline
- Read receipt tracked when reporter views
- Activity logged: "Investigator {name} sent message to reporter"

---

**Override case status**
As a **Compliance Officer**, I want to override the derived case status
so that I can handle edge cases where automatic derivation doesn't apply.

Key behaviors:
- Status normally derived from investigation states
- Override requires rationale text
- Override badge visible on case
- Previous derived status preserved in history
- Activity logged: "Compliance Officer {name} overrode status to {status}: {rationale}"

---

**Configure investigation template**
As a **System Admin**, I want to create investigation templates with checklists
so that investigators follow consistent procedures.

Key behaviors:
- Template linked to categories
- Checklist questions with various types (text, yes/no, date)
- Required vs optional questions
- Template versioning
- Activity logged: "System Admin {name} created template {template_name}"

---

**Attach remediation plan**
As an **Investigator**, I want to attach a remediation plan after closing an investigation
so that corrective actions are tracked.

Key behaviors:
- Select template from remediation library
- Steps assigned to users or email addresses
- Non-users receive email with completion link
- Progress tracked, overdue steps flagged
- Activity logged: "Investigator {name} attached remediation plan"

---

### End User

**Submit anonymous report**
As an **Anonymous Reporter**, I want to submit a report without identifying myself
so that I can raise concerns without fear of retaliation.

Key behaviors:
- No login required
- Access code generated for status checks
- Reporter information not stored or stored encrypted
- Confirmation page with access code displayed prominently
- Activity logged: "Anonymous reporter submitted case"

---

**Check case status**
As an **Anonymous Reporter**, I want to check the status of my submitted case
so that I know my concern is being addressed.

Key behaviors:
- Enter access code on portal
- View case status and any messages from investigators
- No identifying information exposed
- Can submit follow-up information
- No activity logged for status checks (privacy)

---

**Reply to investigator message**
As an **Anonymous Reporter**, I want to reply to messages from investigators
so that I can provide additional information they request.

Key behaviors:
- Reply via portal (not direct email)
- Message delivered through Ethico relay
- Reporter identity remains protected
- Investigator sees reply on case timeline
- Activity logged: "Reporter replied to message"

---

**Submit identified report**
As an **Employee**, I want to submit a report with my identity
so that investigators can contact me directly for follow-up.

Key behaviors:
- Login required (SSO or magic link)
- Contact information captured and stored encrypted
- Can choose to remain anonymous to investigators (Ethico knows identity)
- Visible in "My Cases" after submission
- Activity logged: "Employee {name} submitted case"

---

## 3. Entity Model

> **Architecture Note:** This module implements the RIU→Case architecture defined in `00-PLATFORM/01-PLATFORM-VISION.md`. Risk Intelligence Units (RIUs) are **immutable inputs** created by intake channels. Cases are **mutable work containers** that track the organization's response. Cases link to RIUs via `riu_case_associations` (many-to-many).

### 3.1 Risk Intelligence Unit (RIU) - Reference

RIUs are created by intake channels (Operator Console, Web Forms, Chatbot, etc.) and are **immutable after creation**. The full RIU schema is defined in the Platform Vision document. Key points for Case Management:

```
RISK_INTELLIGENCE_ITEM (immutable input - see Vision doc for full schema)
├── id, organization_id, type
├── source_channel, received_at
├── Reporter info (anonymous_access_code, reporter_type, contact info)
├── Location info (captured at intake)
├── Content (details, narrative, addendum)
├── AI enrichment (ai_summary, ai_risk_score, ai_translation)
├── status (pending_qa, released, etc.)
└── created_at, created_by
```

**This module does NOT create RIUs directly.** RIUs are created by:
- Operator Console (hotline_report) - see PRD-002
- Web Forms (web_form_submission) - see PRD-004
- Employee Chatbot (chatbot_transcript) - see PRD-008
- Disclosures (disclosure_response) - see PRD-006

### 3.2 Case Entity

The Case is a **mutable work container** that tracks the organization's response to one or more RIUs. Cases do NOT contain intake information - that lives on the linked RIUs.

```
CASE (mutable work container)
├── Core Fields
│   ├── id (UUID)
│   ├── reference_number (ETH-2026-00001)
│   ├── organization_id (tenant)
│   ├── business_unit_id (FK, nullable - for within-tenant scoping)
│   ├── status (derived from investigations, overridable)
│   ├── status_rationale (text - why status was set/overridden)
│   ├── created_at, updated_at
│   └── created_by, updated_by
│
├── Linked RIUs (via riu_case_associations)
│   └── One or more RIUs linked to this Case
│       ├── primary RIU (first/main report)
│       └── related RIUs (follow-ups, additional reports on same issue)
│
├── Classification (may differ from original RIU if corrected)
│   ├── primary_category_id
│   ├── secondary_category_id
│   ├── severity (HIGH, MEDIUM, LOW)
│   ├── severity_reason
│   └── tags[]
│
├── Pipeline/Workflow
│   ├── pipeline_id (FK to workflow definition)
│   ├── stage (current pipeline stage)
│   ├── due_date
│   └── sla_status (ON_TRACK, WARNING, OVERDUE)
│
├── Assignment
│   ├── assigned_to (FK to User)
│   ├── assigned_team_id (FK to Team)
│   ├── assigned_at
│   └── assigned_by
│
├── Investigations[] (children - one to many)
│   └── (see Investigation entity below)
│
├── Subjects[] (people involved)
│   └── (see Subject entity below)
│
├── Related Policies[] (if policy violation)
│   └── policy_id, policy_version_id
│
├── Outcomes & Findings
│   ├── substantiated (boolean, null until determined)
│   ├── finding_summary (text)
│   ├── outcome (SUBSTANTIATED, UNSUBSTANTIATED, INCONCLUSIVE, etc.)
│   └── outcome_rationale
│
├── AI Enrichment (Case-level, aggregates from RIUs)
│   ├── ai_case_summary (AI summary of all linked RIUs + investigations)
│   ├── ai_recommended_actions
│   ├── ai_risk_score (Case-level risk assessment)
│   ├── ai_generated_at
│   └── ai_model_version
│
├── Merge Tracking
│   ├── merged_into_case_id (FK, if this case was merged into another)
│   ├── is_merged (boolean)
│   └── merged_at, merged_by
│
├── Custom Fields (JSONB)
│   └── (client-configured Case-level fields)
│
├── Migration Support (for imported data)
│   ├── source_system (e.g., 'NAVEX', 'EQS', 'CONVERCENT', 'MANUAL')
│   ├── source_record_id (original ID from source system)
│   └── migrated_at (when imported, null for native records)
│
└── Metadata
    ├── parent_case_id (if split from another case)
    ├── is_split (boolean)
    └── created_from_riu_id (the RIU that triggered Case creation)
```

### 3.3 RIU-Case Association

Links RIUs to Cases (many-to-many relationship):

```
RIU_CASE_ASSOCIATION
├── id (UUID)
├── riu_id (FK to risk_intelligence_items)
├── case_id (FK to cases)
├── association_type
│   ├── 'primary' - The first/main RIU that created this Case
│   ├── 'related' - Additional RIU linked by investigator
│   └── 'merged_from' - RIU that came from a merged Case
├── associated_at (timestamp)
├── associated_by (FK to User)
└── notes (optional context for why linked)

UNIQUE(riu_id, case_id)
```

**Key Behaviors:**
- When an RIU is created that requires a Case, the system creates the Case AND the association
- Investigators can link additional RIUs to an existing Case ("related")
- When Cases are merged, RIU associations move to the primary Case ("merged_from")
- One RIU can only be linked to one Case (but one Case can have many RIUs)

### 3.4 Investigation Entity

Investigations are child records of Cases (unchanged from before):

```
INVESTIGATION
├── id (UUID)
├── case_id (FK to Case)
├── organization_id (denormalized for RLS)
├── business_unit_id (denormalized from Case)
├── investigation_number (1, 2, 3... within case)
│
├── Classification
│   ├── category_id (may differ from case category)
│   ├── investigation_type (FULL, LIMITED, INQUIRY)
│   └── department (HR, LEGAL, SAFETY, etc.)
│
├── Assignment
│   ├── assigned_to[] (array of user IDs)
│   ├── primary_investigator_id
│   ├── assigned_at
│   ├── assigned_by
│   └── assignment_history (JSONB)
│
├── Workflow
│   ├── status (NEW, ASSIGNED, INVESTIGATING, PENDING_REVIEW, CLOSED, ON_HOLD)
│   ├── status_rationale (text - why status changed, captures reasoning)
│   ├── status_changed_at
│   ├── workflow_id (FK to workflow definition)
│   ├── due_date
│   └── sla_status (ON_TRACK, WARNING, OVERDUE)
│
├── Findings
│   ├── findings_summary
│   ├── findings_detail
│   ├── outcome (SUBSTANTIATED, UNSUBSTANTIATED, INCONCLUSIVE, POLICY_VIOLATION, NO_VIOLATION, INSUFFICIENT_EVIDENCE)
│   ├── root_cause
│   ├── lessons_learned
│   └── findings_date
│
├── Closure
│   ├── closed_at
│   ├── closed_by
│   ├── closure_approved_by (if approval required)
│   ├── closure_approved_at
│   └── closure_notes
│
├── Template
│   ├── template_id (FK to investigation template)
│   ├── template_responses (JSONB - checklist answers)
│   └── template_completed (boolean)
│
├── Migration Support
│   ├── source_system
│   ├── source_record_id
│   └── migrated_at
│
└── Metadata
    ├── created_at, updated_at
    └── created_by, updated_by
```

**AI-First Design Notes:**
- `ai_case_summary` aggregates information from all linked RIUs
- `source_system` enables migration tracking and data lineage
- `status_rationale` captures human reasoning for AI context
- All activity logged to unified `AUDIT_LOG`
- Category/severity on Case may differ from RIU (corrections go on Case, RIU is immutable)

### 2.2 Investigation Entity

Investigations are child records of Cases:

```
INVESTIGATION
├── id (UUID)
├── case_id (FK to Case)
├── organization_id (denormalized for RLS)
├── business_unit_id (denormalized from Case)
├── investigation_number (1, 2, 3... within case)
│
├── Classification
│   ├── category_id (may differ from case category)
│   ├── investigation_type (FULL, LIMITED, INQUIRY)
│   └── department (HR, LEGAL, SAFETY, etc.)
│
├── Assignment
│   ├── assigned_to[] (array of user IDs)
│   ├── primary_investigator_id
│   ├── assigned_at
│   ├── assigned_by
│   └── assignment_history (JSONB)
│
├── Workflow
│   ├── status (NEW, ASSIGNED, INVESTIGATING, PENDING_REVIEW, CLOSED, ON_HOLD)
│   ├── status_rationale (text - why status changed, captures reasoning)
│   ├── status_changed_at
│   ├── workflow_id (FK to workflow definition)
│   ├── due_date
│   └── sla_status (ON_TRACK, WARNING, OVERDUE)
│
├── Findings
│   ├── findings_summary
│   ├── findings_detail
│   ├── outcome (SUBSTANTIATED, UNSUBSTANTIATED, INCONCLUSIVE, POLICY_VIOLATION, NO_VIOLATION, INSUFFICIENT_EVIDENCE)
│   ├── root_cause
│   ├── lessons_learned
│   └── findings_date
│
├── Closure
│   ├── closed_at
│   ├── closed_by
│   ├── closure_approved_by (if approval required)
│   ├── closure_approved_at
│   └── closure_notes
│
├── Template
│   ├── template_id (FK to investigation template)
│   ├── template_responses (JSONB - checklist answers)
│   └── template_completed (boolean)
│
├── Migration Support (for imported investigations)
│   ├── source_system (e.g., 'NAVEX', 'EQS', 'CONVERCENT')
│   ├── source_record_id (original investigation ID from source)
│   └── migrated_at (when imported, null for native records)
│
└── Metadata
    ├── created_at, updated_at
    └── created_by, updated_by
```

### 3.5 Supporting Entities

#### Interaction (Follow-ups and Status Checks)

Interactions track contacts on existing Cases. If substantive new information is provided, a new RIU may also be created and linked.

```
INTERACTION
├── id (UUID)
├── case_id (FK)
├── riu_id (FK, nullable - links to new RIU if new info creates one)
├── organization_id
├── interaction_type (FOLLOW_UP, STATUS_CHECK)
├── channel (HOTLINE, WEB_PORTAL, EMAIL, SMS)
├── timestamp
├── operator_id (if hotline)
│
├── Content
│   ├── notes
│   ├── summary
│   └── addendum
│
├── New Information
│   ├── new_info_added (boolean)
│   ├── created_new_rii (boolean - did this create a linked RIU?)
│   └── additional_details (appended narrative)
│
├── QA (for hotline follow-ups)
│   ├── qa_required (boolean)
│   ├── qa_status (PENDING, APPROVED, RELEASED)
│   ├── qa_reviewed_by
│   └── qa_reviewed_at
│
└── Metadata
    └── created_at, created_by
```

**Key Behaviors:**
- Status checks create Interaction only (no RIU)
- Follow-ups with new substantive information MAY create a new RIU linked to the Case
- The `riu_id` field links to any RIU created from this interaction

#### Subject (People Named in Cases)

```
SUBJECT
├── id (UUID)
├── case_id (FK)
├── organization_id
│
├── Identity
│   ├── hris_employee_id (if linked from HRIS)
│   ├── name
│   ├── email
│   ├── phone
│   ├── employee_id
│   └── is_from_hris (boolean)
│
├── Context
│   ├── subject_type (ACCUSED, WITNESS, VICTIM, OTHER)
│   ├── relationship (EMPLOYEE, MANAGER, VENDOR, etc.)
│   ├── department
│   ├── location
│   ├── manager_name
│   ├── manager_email
│   └── tenure
│
├── HRIS Metadata (JSONB)
│   └── (client-configured fields from HRIS feed)
│
├── Notes
│   └── notes (text - context about subject's involvement, e.g., "Manager of department where incident occurred")
│
└── Metadata
    └── created_at, created_by
```

#### Investigation Note

```
INVESTIGATION_NOTE
├── id (UUID)
├── investigation_id (FK)
├── organization_id
├── note_type (GENERAL, INTERVIEW, RESEARCH, PHONE_CALL, EMAIL, POLICY_REFERENCE)
├── content (rich text)
├── is_internal (boolean - hidden from some roles?)
├── visibility (PRIVATE, TEAM, ALL)
├── created_at, created_by
└── updated_at, updated_by
```

#### Investigation Interview

```
INVESTIGATION_INTERVIEW
├── id (UUID)
├── investigation_id (FK)
├── organization_id
│
├── Interview Details
│   ├── interviewee_name
│   ├── interviewee_role
│   ├── interviewee_subject_id (FK to Subject, if applicable)
│   ├── interview_date
│   ├── interview_type (IN_PERSON, VIDEO, PHONE, WRITTEN)
│   ├── location
│   ├── duration_minutes
│   └── interviewer_id (FK to User)
│
├── Content
│   ├── summary
│   ├── full_notes
│   └── witness_statement_obtained (boolean)
│
├── Attachments[]
│   └── (linked documents)
│
└── Metadata
    └── created_at, created_by
```

#### Investigation Attachment

```
INVESTIGATION_ATTACHMENT
├── id (UUID)
├── investigation_id (FK)
├── organization_id
├── file_name
├── file_type (MIME type)
├── file_size
├── storage_path (S3)
├── attachment_type (DOCUMENT, IMAGE, VIDEO, EMAIL, OTHER)
├── description
├── is_evidence (boolean)
├── uploaded_at
├── uploaded_by
└── virus_scan_status
```

#### Remediation Plan

```
REMEDIATION_PLAN
├── id (UUID)
├── investigation_id (FK, nullable)
├── case_id (FK - used if no investigation)
├── organization_id
├── template_id (FK to remediation template)
├── name
├── description
├── status (NOT_STARTED, IN_PROGRESS, COMPLETED, OVERDUE)
├── due_date
├── created_at, created_by
└── completed_at, completed_by

REMEDIATION_STEP
├── id (UUID)
├── remediation_plan_id (FK)
├── organization_id
├── step_number
├── description
├── assigned_to_user_id (FK, nullable)
├── assigned_to_email (for non-users)
├── assigned_to_name (for non-users)
├── due_date
├── status (PENDING, IN_PROGRESS, COMPLETED, SKIPPED)
├── completion_notes
├── completed_at
├── completed_by
└── notification_sent_at
```

#### Case Message (Two-Way Communication)

```
CASE_MESSAGE
├── id (UUID)
├── case_id (FK)
├── organization_id
├── direction (TO_REPORTER, FROM_REPORTER)
├── channel (EMAIL, SMS, WEB_PORTAL)
├── content
├── attachments[]
├── is_read (boolean)
├── read_at
├── sent_at
├── sent_by (null if from reporter)
└── delivered_at
```

#### Activity Log (Immutable Audit Trail)

```
CASE_ACTIVITY
├── id (UUID)
├── case_id (FK)
├── investigation_id (FK, nullable)
├── organization_id
├── activity_type (CREATED, STATUS_CHANGE, ASSIGNED, NOTE_ADDED, FILE_UPLOADED, FINDING_RECORDED, CLOSED, MESSAGE_SENT, FOLLOW_UP_ADDED, etc.)
├── description
├── actor_id (FK to User, null if system)
├── actor_type (USER, SYSTEM, REPORTER)
├── old_value (JSONB)
├── new_value (JSONB)
├── metadata (JSONB)
├── ip_address
└── created_at (immutable)

-- This table is APPEND-ONLY (no updates or deletes)
```

---

## 3. Case Status & Workflow

### 3.1 Case Status (Derived)

Case status is automatically derived from child investigations:

| Case Status | Condition |
|-------------|-----------|
| **New** | No investigations created yet |
| **Open** | At least one investigation not closed |
| **Closed** | All investigations closed (or no investigations and manually closed) |

Admins/supervisors can override the derived status.

### 3.2 Investigation Status (Configurable Workflow)

Default investigation workflow:

```
┌─────────┐     ┌──────────┐     ┌───────────────┐     ┌─────────────────┐
│   NEW   │────▶│ ASSIGNED │────▶│ INVESTIGATING │────▶│ PENDING_REVIEW  │
└─────────┘     └──────────┘     └───────────────┘     └─────────────────┘
     │               │                   │                      │
     │               │                   │                      ▼
     │               │                   │              ┌──────────────┐
     │               │                   └─────────────▶│    CLOSED    │
     │               │                                  └──────────────┘
     │               │                                         ▲
     │               ▼                                         │
     │         ┌──────────┐                                    │
     └────────▶│ ON_HOLD  │────────────────────────────────────┘
               └──────────┘
```

**Clients can add custom statuses** (e.g., "Legal Review", "External Investigation", "Awaiting HR Response")

### 3.3 Status Transitions

| From | To | Requirements | Triggered Actions |
|------|----|--------------|--------------------|
| New | Assigned | Assignee selected | Notify assignee, start SLA |
| Assigned | Investigating | Manual trigger | Log timestamp |
| Investigating | Pending Review | Findings documented | Notify supervisor (if configured) |
| Pending Review | Closed | Outcome selected, approval (if required) | Prompt for remediation |
| Any | On Hold | Reason provided | Pause SLA |
| On Hold | Previous | Manual trigger | Resume SLA |

---

## 4. Intake Form Fields

### 4.1 Standard Fields (All Channels)

**General:**
- Case type (Report / RFI / Follow-up)
- First time caller? (Yes/No)
- Awareness source (configurable list: Poster, Web Portal, Manager, Code of Conduct, etc.)

**Reporter Information:**
- Anonymous? (Yes/No)
- Name (if not anonymous)
- Email (optional, encrypted)
- Phone (optional, encrypted)
- Relationship (configurable: Employee, Vendor, Contractor, Related Party, Witness, etc.)
- Interpreter used? (Yes/No)

**Location:**
- Location lookup (from client location list) OR manual entry
- Fields: Name, Address, City, State, Zip, Country

**Report Details:**
- Details (rich text - main narrative)
- Summary (AI-generated or manual)
- Addendum (operator notes on caller state, context)

**Classification:**
- Primary category (from client category list)
- Secondary category (optional)
- Severity (High / Medium / Low) with definitions:
  - High: Serious imminent threat to person, property, or environment
  - Medium: Serious allegation not currently happening, or subject not at work
  - Low: Everything else

**Subjects:**
- Multiple subjects per case
- Each subject: Name, Type, Relationship, HRIS lookup or manual entry

**Custom Questions:**
- General questions (apply to all intakes for this client)
- Category-specific questions (triggered when category selected)

### 4.2 Proxy Report Additional Fields

When case_type = PROXY:
- Proxy submitter name (auto-filled from logged-in manager)
- Proxy submitter email
- Proxy submitter department
- Original reporter relationship to proxy

---

## 5. Investigation Workflow

### 5.1 Investigation Actions

Once assigned, investigators can:

| Action | Description |
|--------|-------------|
| **Add Notes** | General notes, research findings, policy references |
| **Document Interviews** | Structured interview records with interviewee info |
| **Upload Files** | Documents, images, videos, emails (up to 50MB) |
| **Apply Template** | Use category-specific investigation checklist |
| **Update Status** | Progress through workflow |
| **Record Findings** | Document conclusions and outcome |
| **Request Approval** | Send to supervisor for review (if configured) |
| **Close Investigation** | Finalize with outcome |
| **Attach Remediation** | Select plan from library |

### 5.2 Investigation Templates

Templates are category-specific checklists:

```
INVESTIGATION_TEMPLATE
├── id
├── organization_id
├── name (e.g., "HIPAA Breach Investigation")
├── description
├── applicable_categories[] (which categories trigger this template)
├── is_required (boolean - must complete before closing?)
│
└── questions[]
    ├── question_number
    ├── question_text
    ├── question_type (TEXT, YES_NO, MULTIPLE_CHOICE, DATE, NUMBER)
    ├── options[] (for multiple choice)
    ├── is_required
    └── help_text
```

### 5.3 Findings & Outcomes

**Required before closure:**
- Findings summary (text)
- Outcome (from list)

**Standard Outcomes:**
- Substantiated
- Unsubstantiated  
- Inconclusive
- Policy Violation Confirmed
- No Violation Found
- Insufficient Evidence

Clients can add custom outcomes.

**Optional Fields:**
- Root cause
- Lessons learned
- Recommendations

### 5.4 Approval Workflow (Optional)

If client enables approval:
1. Investigator completes investigation, clicks "Submit for Review"
2. Status → Pending Review
3. Supervisor notified
4. Supervisor reviews findings
5. Supervisor approves → Closed OR returns → Investigating

---

## 6. Remediation Plans

### 6.1 Remediation Library

Clients can create a library of remediation templates:

```
REMEDIATION_TEMPLATE
├── id
├── organization_id
├── name (e.g., "Standard Harassment Remediation")
├── description
├── applicable_categories[]
├── applicable_outcomes[] (e.g., only show if SUBSTANTIATED)
│
└── default_steps[]
    ├── step_number
    ├── description
    ├── default_assignee_role (HR, LEGAL, MANAGER, etc.)
    ├── default_days_to_complete
    └── is_required
```

### 6.2 Remediation Workflow

1. Investigation closed with outcome requiring remediation
2. System prompts: "Attach remediation plan?"
3. Investigator selects template from library (filtered by category/outcome)
4. Steps populated from template (can be customized)
5. Steps assigned to users OR non-users (email addresses)
6. Non-users receive email with link to simple completion form
7. Progress tracked, overdue steps flagged
8. All completion data reportable

---

## 7. Follow-Up Handling

### 7.1 Follow-Up Types

| Type | Channel | QA Required |
|------|---------|-------------|
| Status check (no new info) | Hotline | Yes |
| Status check (no new info) | Web Portal | No |
| New information provided | Hotline | Yes |
| New information provided | Web Portal | No |

### 7.2 Follow-Up Workflow (Hotline)

1. Operator selects "Follow-up" as call type
2. System prompts for case lookup:
   - Identified: Search by name/email/phone
   - Anonymous: Enter access code
3. Operator sees case summary
4. Operator captures notes from caller
5. If new information:
   - Operator updates relevant case fields
   - Operator adds to "Additional Information" section
   - System flags `new_info_added = true`
6. Interaction logged on case timeline
7. Notification sent to assignee if new info added
8. Goes through QA

### 7.3 Follow-Up Display

New information appears in dedicated "Additional Information" section:
- Timestamped
- Shows which fields were updated
- Clearly distinguished from original intake

---

## 8. Two-Way Communication

### 8.1 Anonymous Communication Model

```
REPORTER                    ETHICO                     CLIENT INVESTIGATOR
                              │
[real email] ────────────────►│◄──────────────────── [sends message]
   (stored,                   │                    
    encrypted,                │                    
    hidden)                   │                    
                              │
              ◄───────────────┤
              [message        │
               forwarded]     │
                              │
[reply] ─────────────────────►│───────────────────► [sees reply in app]
```

### 8.2 Communication Channels

| Channel | Status | Notes |
|---------|--------|-------|
| Email relay | MVP | Ethico relays, reporter address hidden |
| Web portal | MVP | Reporter checks status via access code |
| SMS relay | Post-MVP | Same relay model as email |

### 8.3 Message Notifications

- Reporter receives email when investigator sends message
- Investigator sees notification when reporter replies
- All messages logged in case timeline

---

## 9. Permissions

### 9.1 Case Permissions Matrix

| Permission | CCO | Triage Lead | Investigator | Oversight | Reporter |
|------------|-----|-------------|--------------|-----------|----------|
| View all cases | ✓ | Scoped | Assigned only | Specific cases | Own only |
| View linked RIUs | ✓ | ✓ | ✓ (assigned cases) | ✓ | Own only |
| Link RIU to Case | ✓ | ✓ | ✗ | ✗ | ✗ |
| Merge Cases | ✓ | Configurable | ✗ | ✗ | ✗ |
| Assign investigation | ✓ | ✓ | Configurable | ✗ | ✗ |
| Add notes | ✓ | ✓ | ✓ | ✗ | ✗ |
| Upload files | ✓ | ✓ | ✓ | ✗ | Initial only |
| Record findings | ✓ | ✓ | ✓ | ✗ | ✗ |
| Close investigation | ✓ | Configurable | Configurable | ✗ | ✗ |
| Approve closure | ✓ | ✓ | ✗ | ✗ | ✗ |
| View reporter identity | ✓ | Configurable | Configurable | ✗ | Own |
| Send messages | ✓ | ✓ | ✓ | ✗ | ✓ |
| Configure workflows | ✓ | ✗ | ✗ | ✗ | ✗ |
| Ask AI questions | ✓ | ✓ | ✓ | ✓ | ✗ |

> **Note:** RIUs are created by intake modules (Operator Console, Web Forms, Chatbot). This module manages Cases and their RIU associations.

### 9.2 Configurable Permissions (Per Client)

- Can investigators assign cases? (Default: No)
- Can investigators close without approval? (Default: No)
- Can triage leads close without approval? (Default: Yes)
- Is reporter identity visible to investigators? (Default: Yes for identified, No for anonymous)
- Blocking for mandatory directives? (Default: No)

---

## 10. AI Features

### 10.1 Case-Level AI

| Feature | Trigger | Input | Output |
|---------|---------|-------|--------|
| **Note Cleanup** | Button click (post-call) | Bullet notes | Formatted narrative |
| **Summary Generation** | Button click (post-call) | Details, custom fields | 2-3 paragraph summary |
| **Translation** | Auto (language detected) | Report in foreign language | English translation + original preserved |
| **Risk Scoring** | Auto (case creation) | Report content, category | Risk score 0-100 with factors |
| **Case Q&A** | On-demand chat | User question + case context | AI response about the case |
| **Subject Summary** | On-demand | Subject name | Summary of all cases involving subject |

### 10.2 Real-Time AI Assist (Operator Console)

During intake calls:
- Suggested follow-up questions based on narrative
- Category suggestions based on content
- Escalation flag if trigger words detected

Non-intrusive: displayed in collapsible panel, does not block workflow.

### 10.3 Document Analysis

- Upload documents to case
- AI indexes content
- Ask questions: "Find references to [subject]" or "What policies are mentioned?"

---

## 11. Routing & Assignment

### 11.1 Assignment Models

Clients configure how cases are assigned:

| Model | Trigger | Result |
|-------|---------|--------|
| Manual Triage | Default | Case lands in Unassigned queue |
| Auto by Location | Location matches rule | Route to location's investigator |
| Auto by Category | Category matches rule | Route to department (HR, Legal) |
| Auto by Severity | Severity = High | Route to senior team + escalate |
| Round Robin | Default for team | Distribute evenly across investigators |

### 11.2 Escalation Rules

Configured per client:
- Trigger categories (e.g., "Executive Misconduct" → escalate)
- Trigger keywords (e.g., "suicide", "weapon" → immediate escalate)
- Trigger severity (High → escalate)
- Escalation actions: email contacts, phone call (operator-initiated), route to Audit Committee

---

## 12. Views & Search

### 12.1 Saved Views (HubSpot Model)

Users can create saved views as tabs:
- Define columns to display
- Define filters (status, category, assignee, date range, severity, etc.)
- Define sort order
- Save with custom name
- Up to 25-50 views per user

Example views:
- "My Open Investigations"
- "Unassigned Cases"
- "High Severity - Last 30 Days"
- "EMEA Region"
- "Overdue Cases"

### 12.2 Search Capabilities

| Search Type | Scope | Features |
|-------------|-------|----------|
| Global | All entities user can access | Full-text across cases, notes, interviews |
| Case List | Current filtered view | Quick search within list |
| Within Case | Single case | Search notes, attachments, interviews |
| Subject Search | All cases | Find all cases involving a subject |

---

## 13. Notifications

### 13.1 Notification Events

| Event | Recipients | Channels |
|-------|------------|----------|
| Case created | Based on routing rules | Email, In-app |
| Case assigned | Assignee(s) | Email, In-app |
| Status changed | Assignees, watchers | In-app |
| High severity created | Escalation contacts | Email, Phone (operator) |
| SLA warning (80%) | Assignee | Email, In-app |
| SLA breach | Assignee + manager | Email, In-app |
| New message from reporter | Assignee(s) | Email, In-app |
| Message sent to reporter | Reporter | Email |
| Follow-up with new info | Assignee(s) | Email, In-app |
| Investigation closed | Watchers | In-app |
| Remediation step due | Step assignee | Email |
| Remediation step overdue | Step assignee + plan owner | Email |

### 13.2 Notification Preferences

- Users can configure preferences (per event type)
- Organization admin sets defaults and required notifications

---

## 14. API Endpoints

### 14.1 Case Endpoints

```
GET     /api/v1/cases                    # List cases (filtered, paginated)
POST    /api/v1/cases                    # Create case (usually system-triggered from RIU)
GET     /api/v1/cases/{id}               # Get case detail (includes linked RIUs)
PATCH   /api/v1/cases/{id}               # Update case
DELETE  /api/v1/cases/{id}               # Soft delete (admin only)

# RIU Associations
GET     /api/v1/cases/{id}/riis          # Get linked RIUs
POST    /api/v1/cases/{id}/riis          # Link RIU to case (association_type: 'related')
DELETE  /api/v1/cases/{id}/riis/{riu_id} # Unlink RIU from case

# Case Merge
POST    /api/v1/cases/{id}/merge         # Merge another case into this one
                                         # Body: { sourceCase Id, mergeOptions }

GET     /api/v1/cases/{id}/timeline      # Get activity timeline (Case + linked RIUs)
GET     /api/v1/cases/{id}/interactions  # Get all interactions
POST    /api/v1/cases/{id}/interactions  # Add follow-up interaction

GET     /api/v1/cases/{id}/messages      # Get communication thread
POST    /api/v1/cases/{id}/messages      # Send message to reporter (via RIU contact)

GET     /api/v1/cases/{id}/subjects      # Get subjects
POST    /api/v1/cases/{id}/subjects      # Add subject
DELETE  /api/v1/cases/{id}/subjects/{sid} # Remove subject
```

> **Note:** Cases are typically created by the system when an RIU is released (hotline) or submitted (web form). Direct POST to /cases is for admin/migration use.

### 14.2 Investigation Endpoints

```
GET     /api/v1/cases/{id}/investigations           # List investigations
POST    /api/v1/cases/{id}/investigations           # Create investigation
GET     /api/v1/investigations/{id}                  # Get investigation detail
PATCH   /api/v1/investigations/{id}                  # Update investigation
POST    /api/v1/investigations/{id}/assign           # Assign investigators
POST    /api/v1/investigations/{id}/transition       # Change status

GET     /api/v1/investigations/{id}/notes            # List notes
POST    /api/v1/investigations/{id}/notes            # Add note
PATCH   /api/v1/investigations/{id}/notes/{nid}      # Update note

GET     /api/v1/investigations/{id}/interviews       # List interviews
POST    /api/v1/investigations/{id}/interviews       # Add interview

GET     /api/v1/investigations/{id}/attachments      # List attachments
POST    /api/v1/investigations/{id}/attachments      # Upload file
DELETE  /api/v1/investigations/{id}/attachments/{aid} # Delete file

POST    /api/v1/investigations/{id}/findings         # Record findings
POST    /api/v1/investigations/{id}/close            # Close investigation
```

### 14.3 Remediation Endpoints

```
GET     /api/v1/investigations/{id}/remediation      # Get remediation plan
POST    /api/v1/investigations/{id}/remediation      # Attach remediation plan
PATCH   /api/v1/remediation/{id}                     # Update plan
GET     /api/v1/remediation/{id}/steps               # Get steps
PATCH   /api/v1/remediation/{id}/steps/{sid}         # Update step (mark complete)
```

### 14.4 AI Endpoints

```
POST    /api/v1/cases/{id}/ai/summarize              # Generate summary
POST    /api/v1/cases/{id}/ai/cleanup-notes          # Clean up bullet notes
POST    /api/v1/cases/{id}/ai/translate              # Translate content
POST    /api/v1/cases/{id}/ai/risk-score             # Calculate risk score
POST    /api/v1/cases/{id}/ai/chat                   # Ask question about case
POST    /api/v1/ai/subject-summary                   # Summary of subject across cases
```

---

## 15. Acceptance Criteria

### 15.1 Functional Acceptance

| ID | Criterion | Priority |
|----|-----------|----------|
| AC-01 | Cases are created from released RIUs (system-triggered) | P0 |
| AC-02 | Case displays linked RIUs with intake details from primary RIU | P0 |
| AC-03 | Additional RIUs can be linked to existing Case | P0 |
| AC-04 | Cases can be merged, moving all RIU associations | P0 |
| AC-05 | Anonymous reporter receives access code (on RIU) | P0 |
| AC-06 | Case status auto-derives from investigations | P0 |
| AC-07 | Investigator can only see assigned cases | P0 |
| AC-08 | Notes, interviews, files can be added to investigation | P0 |
| AC-09 | Investigation template can be applied and completed | P0 |
| AC-10 | Findings required before investigation closure | P0 |
| AC-11 | Approval workflow works when configured | P1 |
| AC-12 | Remediation plan can be attached and tracked | P0 |
| AC-13 | Follow-ups create Interactions, may create linked RIUs | P0 |
| AC-14 | New info from follow-up triggers notification | P0 |
| AC-15 | Two-way messaging works via RIU contact info | P0 |
| AC-16 | Activity log records all actions immutably | P0 |
| AC-17 | Saved views work with custom columns/filters | P0 |
| AC-18 | AI summary aggregates from all linked RIUs | P0 |
| AC-16 | Translation works for non-English reports | P0 |
| AC-17 | Subject search shows all related cases | P1 |

### 15.2 Performance Targets

| Metric | Target |
|--------|--------|
| Case list load (25 items) | < 1 second |
| Case detail load | < 500ms |
| Full-text search | < 2 seconds |
| AI summary generation | < 10 seconds |
| File upload (10MB) | < 5 seconds |
| Concurrent users | > 100 without degradation |

---

## 16. MVP Scope

### 16.1 MVP (Weeks 3-6)

**Included:**
- Case CRUD with all intake fields
- Investigation CRUD with status workflow
- Notes, interviews, attachments
- Basic remediation tracking
- Follow-up as interaction (not new case)
- Two-way messaging (email)
- Activity timeline
- Role-based permissions (basic)
- AI summary generation
- AI translation
- Saved views with filters
- Search (cases, subjects)
- Email notifications (core events)
- Export to CSV

**Not Included (Post-MVP):**
- Custom workflow builder UI
- Advanced automation rules
- Investigation templates UI builder
- SMS communication
- Document AI analysis
- Real-time AI assist during calls
- Bulk actions
- Duplicate detection
- Slack/Teams notifications
- Advanced analytics

---

## Appendix A: Default Categories

Starting category list (clients can customize):

**Primary Categories:**
- Harassment & Discrimination
- Fraud & Financial
- Conflicts of Interest
- Safety & Environment
- Theft & Misappropriation
- Substance Abuse
- Policy Violations
- Retaliation
- Data Privacy & Security
- Workplace Violence
- Other

**Each primary has subcategories.** Example for "Harassment & Discrimination":
- Sexual Harassment
- Racial Discrimination
- Age Discrimination
- Disability Discrimination
- Hostile Work Environment
- Bullying
- Other

---

## Appendix B: Default Severity Definitions

| Severity | Definition | SLA |
|----------|------------|-----|
| **High** | Serious imminent threat or action to person, property, or environment. Active situation requiring immediate response. | 4 hours to assign, 24 hours to contact reporter |
| **Medium** | Serious allegation of misconduct not currently happening, or subject not currently at work. No immediate danger. | 24 hours to assign, 72 hours to begin investigation |
| **Low** | General concerns, policy questions, minor issues. | 48 hours to assign, 5 business days to respond |

---

*End of Case Management PRD*
