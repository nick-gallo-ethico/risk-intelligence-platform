# Vision Document Revision Plan

**Purpose:** Document the specific changes needed to 01-PLATFORM-VISION.md to make it the canonical RIU framework reference.

**Date:** February 2026

---

## Executive Summary

The Vision Document (01-PLATFORM-VISION.md v3.0) and Mega Prompt are **92% aligned**. However, the PRDs diverge significantly - they implement "Case" as a monolithic entity rather than the RIU→Case separation described in the Vision. This plan addresses both the Vision Document gaps AND creates the foundation for updating all PRDs.

---

## SECTION 1: RIU Creation by Module (NEW SECTION TO ADD)

**Location:** After "Core Entity Model" section (insert around line 195)

**Purpose:** Explicitly show how each module creates and consumes RIUs - this is the missing piece that PRDs need to implement.

### Proposed Content:

```markdown
## RIU Creation & Consumption by Module

### RIU Creation Matrix

Every input into the platform creates a Risk Intelligence Unit. This matrix shows the source and rules for each RIU type:

| Module | RIU Type Created | Trigger | Auto-Creates Case? |
|--------|------------------|---------|-------------------|
| **Operator Console** | `hotline_report` | Operator completes intake form | Yes (default) |
| **Employee Portal** | `web_form_submission` | Employee submits report form | Yes (default) |
| **Employee Portal** | `proxy_report` | Manager submits on behalf of employee | Yes (default) |
| **Disclosures Module** | `disclosure_response` | Employee completes campaign form | If threshold met |
| **Policy Module** | `attestation_response` | Employee attests/refuses policy | If failure/refusal |
| **Web Forms** | `incident_form` | Employee submits incident form | Configurable |
| **Employee Chatbot** | `chatbot_transcript` | Chatbot session completes | If escalation triggered |
| **Campaigns (Survey)** | `survey_response` | Employee completes survey | If flagged response |

### RIU→Case Flow Diagrams

**Hotline/Web Form Flow (Always Creates Case):**

```
Phone Call / Web Form Submission
         │
         ▼
┌─────────────────────────────┐
│  CREATE RIU                 │
│  type: hotline_report       │
│  status: pending_review     │
└─────────────────────────────┘
         │ (for hotline: after QA release)
         │ (for web form: immediate)
         ▼
┌─────────────────────────────┐
│  CREATE CASE                │
│  status: new                │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  CREATE RIU_CASE_ASSOCIATION│
│  association_type: primary  │
└─────────────────────────────┘
```

**Disclosure/Campaign Flow (Conditional Case):**

```
Employee Completes Disclosure Form
         │
         ▼
┌─────────────────────────────┐
│  UPDATE Campaign Assignment │
│  status: completed          │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  CREATE RIU                 │
│  type: disclosure_response  │
│  → links to campaign_id     │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  EVALUATE THRESHOLDS                        │
│  - Gift amount > $X?                        │
│  - Relationship type flagged?               │
│  - Manual review required?                  │
└─────────────────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 No Case   CREATE CASE
 Needed    (COI Review)
```

**Chatbot Flow (Outcome-Based):**

```
Chatbot Conversation Completes
         │
         ▼
┌─────────────────────────────┐
│  CREATE RIU                 │
│  type: chatbot_transcript   │
│  → full conversation stored │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  EVALUATE OUTCOME                           │
│  - User requested escalation?               │
│  - AI flagged for human review?             │
│  - Intake completed (report submitted)?     │
└─────────────────────────────────────────────┘
         │
    ┌────┴────┬────────────┐
    │         │            │
    ▼         ▼            ▼
 No Case   Inquiry      CREATE CASE
 (Q&A only) Created     (Escalation)
```

### Linking Multiple RIUs to One Case

When related RIUs are identified (same issue reported multiple times), they link to a single Case:

```
RIU #1: Hotline Report (Jan 10) ──┐
      type: hotline_report        │
      subject: "Warehouse safety" │
                                  │
RIU #2: Web Form (Jan 12) ────────┼──► CASE #100
      type: web_form_submission   │    "Warehouse Safety Investigation"
      subject: "Unsafe conditions"│
                                  │
RIU #3: Follow-up Call (Jan 15) ──┘
      type: hotline_report
      subject: "Update on warehouse"
```

**Association Rules:**
- First RIU → `association_type: 'primary'`
- Subsequent RIUs → `association_type: 'related'`
- RIUs from merged cases → `association_type: 'merged_from'`

### RIU Immutability Rules

**RIUs are immutable after creation with these exceptions:**

| Field | Mutable? | Who | When |
|-------|----------|-----|------|
| Core content (details, reporter info) | No | - | Never |
| AI enrichment fields | Yes | System | On-demand regeneration |
| Status (for non-Case RIUs) | Yes | Reviewer | During review workflow |
| Translation | Yes | System | When translation requested |
| Category/Severity | No* | - | *Captured at intake, corrections go on Case |

**Corrections go on the Case, not the RIU.** If an operator made a categorization error, the Case category is updated (not the RIU). The RIU preserves the original intake exactly as received.
```

---

## SECTION 2: Missing Schema Entities (ADD TO SCHEMA)

**Location:** Add to Schema Sketch section (around line 1022)

### Proposed Content:

```sql
-- Interaction: Follow-ups and additional contacts on a Case
CREATE TABLE interactions (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id),
    riu_id UUID REFERENCES risk_intelligence_items(id), -- links to follow-up RIU if created
    organization_id UUID NOT NULL,

    interaction_type VARCHAR(30) NOT NULL, -- 'initial', 'follow_up', 'status_check'
    channel VARCHAR(30) NOT NULL, -- 'hotline', 'web_portal', 'email', 'sms'

    -- Content
    notes TEXT,
    summary TEXT,
    addendum TEXT, -- operator notes on caller demeanor

    -- New information tracking
    new_info_added BOOLEAN DEFAULT FALSE,
    fields_updated JSONB, -- which case fields were updated
    additional_details TEXT, -- appended narrative

    -- QA (for hotline follow-ups)
    qa_required BOOLEAN DEFAULT FALSE,
    qa_status VARCHAR(30), -- 'pending', 'approved', 'released'
    qa_reviewed_by UUID,
    qa_reviewed_at TIMESTAMP,

    -- Operator info
    operator_id UUID,

    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

-- Subject: People named in Cases (for cross-case tracking)
CREATE TABLE subjects (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id),
    organization_id UUID NOT NULL,

    -- Identity (from HRIS or manual)
    employee_id UUID REFERENCES employees(id), -- if linked from HRIS
    external_name VARCHAR(255), -- if not in HRIS
    email VARCHAR(255),
    phone VARCHAR(50),

    -- Context
    subject_type VARCHAR(30) NOT NULL, -- 'accused', 'witness', 'victim', 'other'
    relationship VARCHAR(50), -- 'employee', 'manager', 'vendor', 'contractor'
    department VARCHAR(100),
    location VARCHAR(255),
    manager_name VARCHAR(255),
    manager_email VARCHAR(255),

    -- HRIS snapshot (captured at time of case creation)
    hris_snapshot JSONB,

    -- Notes
    notes TEXT, -- context about involvement

    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

-- Subject cross-reference index for pattern detection
CREATE INDEX idx_subjects_employee ON subjects(organization_id, employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_subjects_name ON subjects(organization_id, external_name) WHERE external_name IS NOT NULL;
```

---

## SECTION 3: Ethics Portal Reference (ADD NEW SECTION)

**Location:** After "Platform Modules" section (around line 478)

### Proposed Content:

```markdown
### Ethics Portal: Unified Employee Experience

The Ethics Portal is the unified employee-facing experience layer that orchestrates capabilities from multiple modules. It serves as a **presentation layer** - owning UX/UI while delegating business logic to domain modules.

**Architecture:**

```
                    ┌─────────────────────────────────────┐
                    │         ETHICS PORTAL               │
                    │     (Public Landing Page)           │
                    └─────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  ANONYMOUS PORTAL   │  │  EMPLOYEE PORTAL    │  │  MANAGER PORTAL     │
│                     │  │  (SSO Required)     │  │  (SSO + Role)       │
│  • Submit report    │  │                     │  │                     │
│  • Check status     │  │  • My Reports/RIUs  │  │  • Team Dashboard   │
│  • Chat (limited)   │  │  • My Disclosures   │  │  • Proxy Reporting  │
│                     │  │  • Policies         │  │  • Completion Status│
│  Creates RIUs:      │  │  • Attestations     │  │                     │
│  - web_form         │  │  • Chat (full)      │  │  Creates RIUs:      │
│  - chatbot_transcript│ │                     │  │  - proxy_report     │
└─────────────────────┘  │  Creates RIUs:      │  └─────────────────────┘
                         │  - web_form         │
                         │  - disclosure_response
                         │  - attestation_response
                         │  - chatbot_transcript
                         └─────────────────────┘
```

**Key Design Decisions:**
- Full white-label (custom domain, logo, colors, fonts)
- Client-configurable channels (web form, hotline, chatbot, email, proxy)
- PWA for mobile (installable, offline-capable)
- Multi-language (auto-detect + HRIS-driven + user override)

See `02-MODULES/03-ETHICS-PORTAL/PRD.md` for full specification.
```

---

## SECTION 4: Analytics & RIU Integration (ADD NEW SECTION)

**Location:** After "AI Architecture" section (around line 643)

### Proposed Content:

```markdown
## Analytics & RIU Framework

### Reporting on Inputs vs. Responses

The RIU→Case separation enables distinct analytics views:

| Metric Type | Data Source | Example Metrics |
|-------------|-------------|-----------------|
| **Input Volume** | RIUs | Reports received, disclosure completion rate, channel mix |
| **Response Metrics** | Cases | Time to assignment, investigation duration, outcomes |
| **Conversion** | RIU→Case links | % of disclosures requiring review, escalation rates |
| **Cross-Pillar** | Entity relationships | Cases linked to policy violations, patterns across modules |

### Standard Dashboards

**RIU Dashboard (Input Analysis):**
- Reports by channel (hotline, web, chatbot, proxy)
- Reports by category over time
- Geographic distribution of reports
- Anonymous vs. identified ratio
- Disclosure completion rates by campaign

**Case Dashboard (Response Analysis):**
- Open cases by status
- Average time to close
- Outcomes distribution (substantiated, unsubstantiated, etc.)
- SLA compliance
- Investigator workload

**Cross-Pillar Intelligence:**
- Subjects appearing in multiple cases
- Categories trending over time
- Correlation: policy changes → case volume
- Remediation effectiveness

### Fact Tables for Analytics

```sql
FACT_RIU_DAILY
├── date_id
├── organization_id
├── rii_type
├── source_channel
├── category_id
├── severity
├── location_id
├── business_unit_id
├── count
└── is_anonymous

FACT_CASE_DAILY
├── date_id
├── organization_id
├── status
├── outcome
├── category_id
├── assigned_to_id
├── severity
├── avg_days_open
├── count
└── sla_status
```
```

---

## SECTION 5: PRD Revision Requirements

After Vision Document is updated, each PRD needs these changes:

### PRD-002 (Operator Console) - SIGNIFICANT REVISION
**Current State:** Creates "Case" directly during intake
**Required Change:** Creates "RIU (hotline_report)" → QA releases → System creates Case + Association

**Key Changes:**
1. Intake form creates RIU, not Case
2. QA workflow reviews/releases RIU
3. Post-QA: system creates Case and links via riu_case_associations
4. Follow-ups create new RIUs linked to existing Case

### PRD-003 (Employee Portal) - MODERATE REVISION
**Current State:** Shows "My Cases"
**Required Change:** Show "My Reports" (RIUs) which may or may not have linked Cases

**Key Changes:**
1. "My Reports" view shows RIUs submitted by user
2. Status display comes from linked Case (if exists) or RIU status
3. Clarify what employees see vs what they submitted

### PRD-004 (Web Form Configuration) - MODERATE REVISION
**Current State:** Creates "submissions" (vague entity)
**Required Change:** Explicitly creates RIUs with type based on form configuration

**Key Changes:**
1. Form configuration includes RIU type mapping
2. Form submission → RIU creation
3. RIU→Case rules configurable per form

### PRD-005 (Case Management) - MAJOR REVISION
**Current State:** Case entity with embedded intake information
**Required Change:** Case entity linked to RIUs via association table

**Key Changes:**
1. **Remove** intake fields from Case entity (move to RIU)
2. **Add** riu_case_associations references
3. **Add** "Link RIU to existing Case" workflow
4. **Add** "Merge Cases" workflow (moves RIU associations)
5. Case becomes purely the "work container" with no intake data

### PRD-006 (Disclosures) - MINOR REVISION
**Current State:** Uses Campaign model correctly
**Required Change:** Verify Campaign Assignment → RIU (disclosure_response) → Case flow

**Key Changes:**
1. Verify schema alignment with Vision
2. Ensure RIU creation is explicit (not just "response stored")
3. Add RIU type to disclosure response entity

### PRD-007 (Analytics) - MODERATE REVISION
**Current State:** Unknown (needs review)
**Required Change:** Ensure RIU vs Case metrics are clearly separated

**Key Changes:**
1. Add RIU fact tables
2. Distinguish input metrics (RIUs) vs response metrics (Cases)
3. Add RIU→Case conversion analytics

### PRD-008 (Employee Chatbot) - MODERATE REVISION
**Current State:** Creates Cases from intake conversations
**Required Change:** Creates RIU (chatbot_transcript) → conditionally creates Case

**Key Changes:**
1. Every conversation creates RIU (chatbot_transcript)
2. Outcome evaluation determines if Case created
3. Link chatbot RIU to Case via association

### PRD-009 (Policy Management) - MODERATE REVISION
**Current State:** Unknown (needs review)
**Required Change:** Attestation responses create RIUs, failures optionally create Cases

**Key Changes:**
1. Integrate with Campaign model for attestation campaigns
2. Attestation response = RIU (attestation_response)
3. Failure/refusal → optional Case creation (configurable)

---

## Implementation Order

1. **Vision Document** - Apply all changes from Sections 1-4
2. **PRD-005 Case Management** - Foundation for all others (biggest change)
3. **PRD-002 Operator Console** - Primary RIU creation point
4. **PRD-006 Disclosures** - Campaign→RIU flow verification
5. **PRD-003 Employee Portal** - User-facing RIU display
6. **PRD-004 Web Forms** - Form→RIU mapping
7. **PRD-008 Chatbot** - Conversation→RIU→Case flow
8. **PRD-009 Policy** - Attestation→RIU→Case flow
9. **PRD-007 Analytics** - RIU analytics integration

---

## Approval Checkpoint

Before proceeding with PRD updates, confirm:

- [ ] Vision Document changes approved
- [ ] RIU Creation Matrix is accurate
- [ ] Schema additions are complete
- [ ] PRD revision scope is understood

---

*End of Vision Revision Plan*
