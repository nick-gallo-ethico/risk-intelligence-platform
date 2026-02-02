# Ethico Risk Intelligence Platform
## Platform Vision & Architecture

**Document ID:** PRD-001
**Version:** 3.2 (RIU - Risk Intelligence Unit)
**Last Updated:** February 2026 (Added: RIU Creation by Module, Ethics Portal, Analytics Framework, Schema entities)

---

## Executive Summary

The Ethico Risk Intelligence Platform is a next-generation compliance management system designed as **"HubSpot for Compliance."** It consolidates ethics hotline intake, case management, investigations, disclosures, policy management, and analytics into a unified, AI-native platform.

### Vision Statement

> Enable organizations to transform fragmented compliance activities into unified risk intelligence—providing real-time visibility, AI-assisted workflows, and actionable insights that demonstrate program effectiveness and protect organizational integrity.

### Why Now?

1. **Legacy Fragmentation:** Competitors like NAVEX have grown through acquisition, resulting in disconnected modules and inconsistent experiences
2. **AI Opportunity:** Modern AI capabilities enable summarization, translation, risk scoring, and intelligent assistance that weren't possible before
3. **User Expectations:** Today's users expect HubSpot/Salesforce-quality UX, not 2010-era enterprise software
4. **Compliance Complexity:** Growing regulatory requirements demand better tools for managing and demonstrating compliance

### Strategic Goals

1. **Unified Platform:** Consolidate fragmented compliance activities into one system
2. **AI-Native:** AI capabilities embedded throughout, not bolted on
3. **HubSpot-Quality UX:** Modern, intuitive interface that compliance professionals want to use
4. **Configurability:** Flexible enough to handle diverse compliance program structures
5. **Speed to Value:** Fast implementation, easy historical data migration
6. **Product-Led Growth:** Enable self-service onboarding and upgrades

---

## Multi-Product Architecture

**Decision: Single codebase, permission-based views**

Everyone logs into the same application but sees different interfaces based on role:

| User Type | Interface | Purpose |
|-----------|-----------|---------|
| Ethico Operators | Operator Console | Hotline intake, QA workflow |
| Ethico Sales | Demo Environment | On-demand "Acme Co." demos |
| Ethico Professional Services | Implementation Portal | Migration, setup, training |
| Ethico Client Success | Client Health Dashboard | Usage metrics, deal health |
| Client Users | Client Platform | Case management, investigations, etc. |

### Demo Environment

**Decision: On-demand demo tenant provisioning**

Each salesperson can spin up their own "lived in" Acme Co. demo environment with historical data demonstrating all platform features. Fallback to shared demo tenant if on-demand proves too complex.

### Client Success Metrics

The Client Success view shows:
- Client usage by user
- Login frequency and patterns
- Feature adoption metrics
- Activity levels (cases created, reports run, etc.)
- Deal health indicators

### Professional Services Portal

**Migration scope includes:**
- Migrations from current Ethico platform to new platform
- Migrations from competitors (NAVEX, Case IQ, EQS)
- New clients with no prior system (Excel/paper-based)

**Data types requiring migration support:**
- Cases/investigations with attachments
- Disclosures
- Policies
- User accounts and permissions (quick setup via replication)
- Legacy reports (ability to replicate)
- Audit logs (optional)

---

## Core Entity Model: The HubSpot Parallel

### The Fundamental Insight

The platform uses a clear separation between **immutable inputs** and **mutable work containers**, mirroring HubSpot's architecture:

**HubSpot Architecture:**
| HubSpot Concept | What It Does |
|-----------------|--------------|
| Contact | The person/entity being tracked. Immutable origin point. |
| Deal | A work container with stages, pipeline, assignee. Mutable. |
| Association | Links contacts to deals (many-to-many) |
| Pipeline | Defines workflow stages for deals |
| Properties | Custom fields on any object |

**Ethico's Parallel Architecture:**
| Ethico Concept | Parallel To | What It Does |
|----------------|-------------|--------------|
| Risk Intelligence Unit (RIU) | Contact | Immutable input - something happened. A report was filed, a form submitted, a disclosure made. |
| Case | Deal | Mutable work container. Has status, assignee, investigations, outcomes. Represents "what we're doing about it." |
| Association | Association | Links RIUs to Cases. Many RIUs can link to one Case. |
| Pipeline/Workflow | Pipeline | Defines stages and required actions for different case types |
| Custom Fields | Properties | Tenant-configurable fields on any entity |

### The Critical Separation: Input vs. Response

**Risk Intelligence Items are immutable inputs.**
They represent facts: "On Jan 15, an anonymous caller reported X" or "Employee Jane Doe disclosed a financial interest in Vendor ABC." The RIU doesn't change - it's the record of what was received.

**Cases are mutable work containers.**
They represent the organization's response: "We investigated, found it substantiated, and implemented remediation." Cases have status, assignees, due dates, outcomes.

### RIU Types

| RIU Type | Source | Description |
|----------|--------|-------------|
| Hotline Report | Phone call | Called into call center, operator-entered |
| Web Form Submission | Employee portal | Employee self-service submission |
| Proxy Report | Manager portal | Manager submits on behalf of employee |
| Disclosure Response | Campaign | COI, outside employment, gift, etc. |
| Attestation Response | Campaign | Policy acknowledgment |
| Incident Form | Various | HIPAA breach, slip and fall, etc. |
| Chatbot Transcript | Employee portal | AI-guided intake conversation |
| Survey Response | Campaign | Compliance surveys |

### RIU → Case Creation Rules

**Decision: Configurable per RIU type**

| RIU Type | Default Behavior | Configurable? |
|----------|------------------|---------------|
| Hotline Report | Always creates Case | Yes |
| Web Form | Always creates Case | Yes |
| Proxy Report | Always creates Case | Yes |
| Disclosure Response | Case only if threshold met or flagged | Yes |
| Attestation Response | Case only on failure | Yes |
| Incident Form | Configurable by form type | Yes |
| Chatbot Transcript | Depends on outcome | Yes |
| Survey Response | Case only if flagged response | Yes |

### Many-to-One: RIUs to Cases

**Critical requirement:** Multiple RIUs can be linked to a single Case.

Example: Three hotline calls about the same issue should combine into one Case:
```
RIU #1: Hotline Report (Jan 10) ──┐
RIU #2: Hotline Report (Jan 12) ──┼──► CASE #100: "Warehouse Safety Investigation"
RIU #3: Hotline Report (Jan 15) ──┘         ├── Investigation A (Safety)
                                            ├── Investigation B (Retaliation)
                                            └── Remediation Plan
```

Each RIU maintains its integrity (original report, timestamp, reporter). The Case aggregates them and tracks the response.

### Case Hierarchy

```
CASE (work container)
├── Basic Info (number, category, severity, status)
├── Pipeline Stage (workflow position)
├── Assignment (user and/or team)
├── Linked RIUs (source reports - many allowed)
├── Related Subjects (people involved)
├── Related Policies (if violation)
├── Investigations (children - one to many)
│   ├── Investigation A
│   │   ├── Type, Status, Investigator
│   │   ├── Interviews, Notes, Evidence
│   │   ├── Findings
│   │   └── Remediation Plan (investigation-level)
│   └── Investigation B
│       └── ...
├── Remediation Plan (case-level, if no investigations but substantiated)
├── Communications (two-way with reporter via anonymized relay)
├── Outcomes & Findings
├── Custom Fields
└── Activity Log / Audit Trail
```

### Case Merging

**Decision: Support both linking RIUs to existing Cases AND merging Cases**

**Merge behavior:**
- Merged case becomes read-only tombstone (can still view history)
- All RIUs, investigations, and content move to primary case
- Merged case redirects to primary if accessed
- Full audit trail of merge action

**Merge permissions:** Configurable (case owner, admin, or by permission)

---

## RIU Creation & Consumption by Module

This section explicitly defines how each platform module creates and consumes Risk Intelligence Items. **This is the authoritative reference for PRD alignment.**

### RIU Creation Matrix

Every input into the platform creates a Risk Intelligence Item. This matrix shows the source and rules for each RIU type:

| Module | RIU Type Created | Trigger | Auto-Creates Case? |
|--------|------------------|---------|-------------------|
| **Operator Console** | `hotline_report` | Operator completes intake form | Yes (after QA release) |
| **Employee Portal** | `web_form_submission` | Employee submits report form | Yes (immediate) |
| **Employee Portal** | `proxy_report` | Manager submits on behalf of employee | Yes (immediate) |
| **Disclosures Module** | `disclosure_response` | Employee completes campaign disclosure form | If threshold met or flagged |
| **Policy Module** | `attestation_response` | Employee attests or refuses policy | If failure or refusal (configurable) |
| **Web Forms** | `incident_form` | Employee submits incident form | Configurable per form type |
| **Employee Chatbot** | `chatbot_transcript` | Chatbot session completes | If escalation triggered or intake completed |
| **Campaigns (Survey)** | `survey_response` | Employee completes survey | If flagged response detected |

### RIU→Case Flow Diagrams

**Hotline Flow (QA Required):**

```
Phone Call Received
         │
         ▼
┌─────────────────────────────┐
│  OPERATOR CREATES RIU       │
│  type: hotline_report       │
│  status: pending_qa         │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  QA REVIEW                  │
│  QA reviewer edits/approves │
│  status: released           │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  SYSTEM CREATES CASE        │
│  status: new                │
│  Links RIU as 'primary'     │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  ROUTING & ASSIGNMENT       │
│  Based on client rules      │
└─────────────────────────────┘
```

**Web Form / Self-Service Flow (No QA):**

```
Employee Submits Report
         │
         ▼
┌─────────────────────────────┐
│  SYSTEM CREATES RIU         │
│  type: web_form_submission  │
│  status: received           │
└─────────────────────────────┘
         │ (immediate)
         ▼
┌─────────────────────────────┐
│  SYSTEM CREATES CASE        │
│  status: new                │
│  Links RIU as 'primary'     │
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
│  Links to campaign_id       │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  EVALUATE THRESHOLDS (auto_case_rules)      │
│  - Gift amount > configured threshold?      │
│  - Relationship type flagged?               │
│  - Manual review required by form config?   │
└─────────────────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 No Case   CREATE CASE
 (RIU only) (COI Review)
```

**Chatbot Flow (Outcome-Based):**

```
Chatbot Conversation Completes
         │
         ▼
┌─────────────────────────────┐
│  CREATE RIU                 │
│  type: chatbot_transcript   │
│  Full conversation stored   │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  EVALUATE OUTCOME                           │
│  - User requested escalation to human?      │
│  - AI flagged concern for human review?     │
│  - Intake completed (report submitted)?     │
│  - Policy Q&A only (no action needed)?      │
└─────────────────────────────────────────────┘
         │
    ┌────┴────┬────────────┐
    │         │            │
    ▼         ▼            ▼
 No Case   Inquiry      CREATE CASE
 (Q&A only) Created     (Escalation/Report)
```

### Linking Multiple RIUs to One Case

When related RIUs are identified (same issue reported multiple times), they link to a single Case via `riu_case_associations`:

```
RIU #1: Hotline Report (Jan 10) ──┐  association_type: 'primary'
      "Warehouse safety concern"  │
                                  │
RIU #2: Web Form (Jan 12) ────────┼──► CASE #100
      "Unsafe equipment"          │     "Warehouse Safety Investigation"
      association_type: 'related' │
                                  │
RIU #3: Follow-up Call (Jan 15) ──┘  association_type: 'related'
      "Update from original caller"
```

**Association Type Rules:**
- `primary` - First RIU that created the Case
- `related` - Subsequent RIUs manually linked by investigator
- `merged_from` - RIUs that came from a merged Case

### RIU Immutability Rules

**RIUs are immutable after creation.** This preserves the factual record of what was reported.

| Field Category | Mutable? | Who Can Change | When |
|----------------|----------|----------------|------|
| Core content (details, narrative) | **No** | - | Never - original preserved |
| Reporter information | **No** | - | Never - as captured at intake |
| Category/Severity (as captured) | **No** | - | Never - corrections go on Case |
| AI enrichment fields | Yes | System | On-demand regeneration |
| Status (pending_qa → released) | Yes | QA Reviewer | During QA workflow only |
| Translation fields | Yes | System | When translation requested |

**Key Principle:** If an operator made a categorization error during intake, the **Case** category is corrected (not the RIU). The RIU preserves exactly what was captured at the moment of intake. This maintains audit integrity and allows "what was reported" vs "what it actually was" analysis.

### Follow-Up Handling

Follow-ups do **not** create new Cases. They either:
1. Create a new RIU linked to the existing Case (if substantive new information)
2. Create an Interaction record on the Case (for status checks)

```
Follow-up Call Received
         │
         ▼
┌─────────────────────────────┐
│  LOOKUP EXISTING CASE       │
│  Via access code (anonymous)│
│  or reporter info (identified)
└─────────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
New Info    Status Check
    │           │
    ▼           ▼
CREATE RIU   CREATE INTERACTION
(linked to    (no RIU created)
existing Case)
```

---

## Campaign Model

### The Problem

Outbound requests (annual COI disclosure, policy attestation) need different handling than inbound reports. You need to track:
- Who was asked to do something
- Who has/hasn't responded
- What they responded with
- Whether their response requires action

### Campaign Entity Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CAMPAIGNS                                │
│              [Outbound requests for information/action]             │
├─────────────────────────────────────────────────────────────────────┤
│  • Campaign Type (disclosure, attestation, certification, survey)   │
│  • Target Audience (all employees, department, role, individual)    │
│  • Form/Template to complete                                        │
│  • Due Date & Reminder Schedule                                     │
│  • Status (draft, active, closed)                                   │
│  • Thresholds for auto-case creation                                │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            │ Creates (one per target employee)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       CAMPAIGN ASSIGNMENTS                          │
│                [Individual employee obligations]                    │
├─────────────────────────────────────────────────────────────────────┤
│  • Employee (from HRIS)                                             │
│  • Status: pending | completed | overdue | exempted                 │
│  • Assigned Date, Due Date                                          │
│  • Reminder History                                                 │
│  • Completion Date (if completed)                                   │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            │ When Employee Completes
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RISK INTELLIGENCE ITEM                           │
│                    [The actual response]                            │
├─────────────────────────────────────────────────────────────────────┤
│  • Type: 'disclosure_response' | 'attestation_response' | etc.      │
│  • Links back to Campaign Assignment                                │
│  • Contains the actual form data submitted                          │
│  • Immutable record of what employee attested/disclosed             │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            │ If threshold met / review needed
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                             CASE                                    │
│                    [If action required]                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Campaign Scenarios

| Scenario | Campaign Assignment | RIU | Case |
|----------|---------------------|-----|------|
| Employee hasn't responded yet | ✓ Pending | ✗ Not yet | ✗ No |
| Employee responds "No conflicts" | ✓ Completed | ✓ Created (clean) | ✗ No |
| Employee discloses $50 gift | ✓ Completed | ✓ Created | ✗ Below threshold |
| Employee discloses $500 gift | ✓ Completed | ✓ Created | ✓ Needs review |
| Employee discloses family at vendor | ✓ Completed | ✓ Created | ✓ COI review case |
| Employee never responds | ✓ Overdue | ✗ No response | ✓ Non-compliance case (if configured) |

---

## Policy Management Integration

### How Policies Connect to the Core Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                           POLICIES                                  │
│                    [Documents & Versions]                           │
└───────────┬─────────────────────────────────────────┬───────────────┘
            │                                         │
            │ Attestation                             │ Violation
            │ Campaigns                               │ Reference
            ▼                                         │
┌───────────────────────┐                             │
│      CAMPAIGNS        │                             │
│  (attestation, COI,   │                             │
│   disclosure, survey) │                             │
└───────────┬───────────┘                             │
            │                                         │
            │ Responses                               │
            ▼                                         │
┌───────────────────────────────────────────────────────────────────────┐
│                    RISK INTELLIGENCE ITEMS                            │
│  Hotline │ Web Form │ Disclosure │ Attestation │ Incident │ Chatbot  │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    │ Creates / Links To
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                              CASES                                    │
│  ├── Category (can be "Policy Violation")◄────────────────────────────┘
│  ├── Related Policies (links to violated policies)
│  ├── Related RIUs (source reports)
│  ├── Investigations
│  └── Remediation (can include "Update Policy X")
└───────────────────────────────────────────────────────────────────────┘
```

### Policy-Case Connections

| Policy Management Need | How It Maps |
|------------------------|-------------|
| Send policy for acknowledgment | Create Campaign (type: policy_attestation) |
| Track who hasn't signed | Campaign Assignments with status = pending |
| Record signature | RIU created when they attest |
| Flag refusals or quiz failures | RIU → Case (configurable threshold) |
| Policy violation found in investigation | Case → Related Policy link |
| Update policy based on findings | Case outcome can trigger policy review workflow |

---

## Core Identity Entities

These foundational entities are referenced throughout all modules. See `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` for complete schema definitions.

### User vs Employee: Key Distinction

| Entity | Source | Purpose | Who Has One |
|--------|--------|---------|-------------|
| **User** | Created on platform | Authentication, authorization | Platform users (CCO, investigators, admins) |
| **Employee** | Synced from HRIS | Represent all people in organization | Everyone in HRIS (~100% of workforce) |

**Critical Insight:** Most employees will never have a User record. An organization with 10,000 employees might have only 50 Users (compliance team, investigators, HR partners). Employees are the population for attestations, disclosures, and case subjects.

### User Entity

Users are platform login identities with authentication and role-based access.

```
USER
├── id: uuid
├── organization_id: uuid (FK)
├── email: string (unique within org)
├── first_name, last_name: string
├── password_hash: string? (nullable for SSO-only)
├── role: enum (see RBAC section)
├── sso_provider: string? ('AZURE_AD', 'GOOGLE', 'SAML')
├── sso_id: string? (external identity)
├── avatar_url: string?
├── department: string?
├── location_id: uuid? (FK)
├── business_unit_id: uuid? (FK)
├── is_active: boolean
├── last_login_at: timestamp?
├── employee_id: uuid? (FK to Employee, if HRIS-linked)
├── created_at, updated_at: timestamp
└── created_by_id, updated_by_id: uuid (FK)
```

**User References:**
- Case assignees → User
- Investigation assignees → User
- Policy owners → User
- Workflow approvers → User
- Audit log actors → User

### Employee Entity

Employees represent all individuals in an organization, synced from HRIS systems.

```
EMPLOYEE
├── id: uuid
├── organization_id: uuid (FK)
├── hris_employee_id: string (unique within org)
├── email: string?
├── first_name, last_name: string
├── job_title: string?
├── department: string?
├── location_id: uuid? (FK)
├── business_unit_id: uuid? (FK)
├── manager_id: uuid? (FK to Employee)
├── hire_date: date?
├── termination_date: date?
├── employment_status: enum ('ACTIVE', 'TERMINATED', 'LEAVE')
├── custom_fields: json (HRIS-specific metadata)
├── user_id: uuid? (FK to User, if platform user)
├── synced_at: timestamp (last HRIS sync)
├── source_system: string ('WORKDAY', 'BAMBOOHR', etc.)
├── created_at, updated_at: timestamp
└── Unique constraint: (organization_id, hris_employee_id)
```

**Employee References:**
- Case subjects → Employee
- Attestation recipients → Employee
- Disclosure submitters → Employee
- Campaign assignment targets → Employee
- HRIS-driven routing rules → Employee attributes

### Organization Entity

Organizations are the top-level tenant containers.

```
ORGANIZATION
├── id: uuid
├── name: string
├── slug: string (unique, URL-safe)
├── domain: string? (for SSO domain matching)
├── tier: enum ('FREE', 'PREMIUM', 'ENTERPRISE')
├── settings: json (feature flags, limits, preferences)
├── billing_status: enum
├── logo_url: string?
├── primary_contact_id: uuid? (FK to User)
├── created_at, updated_at: timestamp
└── Unique constraint: slug
```

### JWT Token Structure

Access tokens contain:

```json
{
  "sub": "user_id",
  "org": "organization_id",
  "role": "COMPLIANCE_OFFICER",
  "bus": ["bu_1", "bu_2"],
  "emp": "employee_id",
  "isOp": false,
  "iat": 1706400000,
  "exp": 1706400900
}
```

| Claim | Description |
|-------|-------------|
| `sub` | User ID |
| `org` | Organization ID (tenant) |
| `role` | User's role for RBAC |
| `bus` | Business unit IDs user can access |
| `emp` | Linked Employee ID (if any) |
| `isOp` | Is Ethico operator (cross-tenant access) |

---

## Source Channels

| Channel | Who Enters | Interface | QA Required | Creates RIU Type |
|---------|------------|-----------|-------------|------------------|
| **Hotline** | Ethico Operator | Operator Console | Yes | hotline_report |
| **Web Form** | Employee/Reporter | Employee Portal | No | web_form_submission |
| **Proxy Report** | Manager | Manager Portal | No | proxy_report |
| **Direct Entry** | Compliance Officer | Client Platform | No | direct_entry |
| **Chatbot** | Employee/Reporter | Employee Portal | No | chatbot_transcript |
| **Campaign Response** | Employee | Employee Portal | No | disclosure_response / attestation_response |
| **Follow-up (hotline)** | Ethico Operator | Operator Console | Yes | (updates existing RIU) |
| **Follow-up (web)** | Reporter | Employee Portal | No | (updates existing RIU) |

---

## Platform Modules

### Core Modules (Client-Facing)

1. **Case Management & Investigations** - Core work container and investigation workflows
2. **Disclosures** - COI, gifts, outside employment campaigns
3. **Policy Management** - Document lifecycle, attestations, distribution
4. **Analytics & Dashboards** - HubSpot-style customizable reporting
5. **Employee Portal** - Employee's view of compliance obligations
6. **Employee Chatbot** - AI-guided intake and policy Q&A
7. **Web Forms** - Configurable forms for various intake types
8. **Project Management / Monday Board** - Task aggregation and program planning

### Ethico Internal Modules

1. **Operator Console** - Hotline intake, QA workflow, client profile management
2. **Sales Demo Environment** - Lived-in Acme Co. demonstration
3. **Professional Services Portal** - Implementation and migration tools
4. **Client Success Dashboard** - Client health and usage metrics

### Employee Chatbot - Detailed Scope

The Employee Chatbot is a comprehensive AI assistant serving as the primary self-service channel:

| Capability | Description |
|------------|-------------|
| **Report Intake** | Guided speak-up reporting with one question at a time, anonymous capable |
| **Policy Q&A** | Tiered AI responses: direct answers with citations (Tier 1), situational guidance (Tier 2), async escalation (Tier 3) |
| **Case Status** | Check report status and two-way messaging via access code |
| **Disclosure Assistance** | Conversational completion of COI, gifts, and other disclosures |
| **Compliance Inquiries** | Submit questions to compliance team with async response |
| **Knowledge Base** | Search custom uploaded documents beyond published policies |

**Access Points:**
- Ethics Portal floating widget (anonymous)
- Employee Portal embedded (authenticated)
- Standalone page (deep-linkable)

**Key Design Principles:**
- Tiered AI with confidence transparency
- One-click escalation to human always available
- Async over live (matches compliance team staffing reality)
- Full audit trail with consent capture

### Ethics Portal: Unified Employee Experience

The Ethics Portal is the unified employee-facing experience layer that orchestrates capabilities from multiple modules. It serves as a **presentation layer** - owning UX/UI while delegating business logic and RIU creation to domain modules.

**Portal Architecture:**

```
                    ┌─────────────────────────────────────┐
                    │         ETHICS PORTAL               │
                    │     (Public Landing Page)           │
                    │   Branded per client (white-label)  │
                    └─────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  ANONYMOUS PORTAL   │  │  EMPLOYEE PORTAL    │  │  MANAGER PORTAL     │
│  (No login)         │  │  (SSO Required)     │  │  (SSO + Manager Role│
│                     │  │                     │  │                     │
│  • Submit report    │  │  • My Reports (RIUs)│  │  • Team Dashboard   │
│  • Check status     │  │  • My Disclosures   │  │  • Proxy Reporting  │
│  • Chat (limited)   │  │  • My Policies      │  │  • Team Completion  │
│                     │  │  • Attestations     │  │    Status           │
│  Creates RIUs:      │  │  • Chat (full)      │  │                     │
│  • web_form_submission│ │                     │  │  Creates RIUs:      │
│  • chatbot_transcript│ │  Creates RIUs:      │  │  • proxy_report     │
└─────────────────────┘  │  • web_form_submission│ └─────────────────────┘
                         │  • disclosure_response│
                         │  • attestation_response
                         │  • chatbot_transcript │
                         └─────────────────────┘
```

**RIU Creation by Portal Section:**

| Portal Section | Action | RIU Type Created |
|----------------|--------|------------------|
| Anonymous → Submit Report | Web form submission | `web_form_submission` |
| Anonymous → Chatbot | Conversation | `chatbot_transcript` |
| Employee → Submit Report | Web form submission | `web_form_submission` |
| Employee → Complete Disclosure | Campaign response | `disclosure_response` |
| Employee → Attest to Policy | Campaign response | `attestation_response` |
| Employee → Chatbot | Conversation | `chatbot_transcript` |
| Manager → Proxy Report | On behalf of employee | `proxy_report` |

**Key Design Decisions:**
- Full white-label (custom domain, logo, colors, fonts, imagery)
- Client-configurable channels (enable/disable: web form, hotline info, chatbot, proxy)
- PWA for mobile (installable, offline-capable, push notifications)
- Multi-language (auto-detect + HRIS-driven + user override)
- Access code system for anonymous reporter status checks

See `02-MODULES/03-ETHICS-PORTAL/PRD.md` for full specification.

---

## Custom Fields

**Available on ALL entity types:**
- Risk Intelligence Items (base level)
- RIU Type Extensions (hotline-specific, disclosure-specific, etc.)
- Cases
- Investigations (children of Cases)
- Campaign Assignments
- Policies
- Subjects (people involved in cases)

**Field types needed:**
- Text (short and long)
- Number
- Date
- Dropdown (single select)
- Multi-select
- User lookup
- File attachment
- Calculated (TBD)

**Custom fields must be:**
- Reportable in analytics
- Filterable in views
- Searchable

---

## AI Architecture

The platform AI is not just a chatbot - it is an **action agent** that can execute operations on behalf of users, similar to how Claude Code operates for developers. This section provides a high-level overview; see `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-AGENT.md` for full technical specification.

### Confirmed AI Features

| Feature | When | Description |
|---------|------|-------------|
| **Note Cleanup** | Post-call | Convert bullet notes to formal narrative |
| **Summary Generation** | Post-call | Generate case summary from details |
| **Real-time Assist** | During call | Suggested questions, category hints, escalation flags |
| **Translation** | Auto | Translate reports; preserve original |
| **Portal Localization** | Auto | Forms/portals in employee's language |
| **Case Q&A** | On-demand | Ask questions about specific case |
| **Cross-Case Analytics** | On-demand | Query patterns across cases |
| **Subject Summary** | On-demand | All cases involving a subject |
| **Document Analysis** | On-demand | Find references in uploaded documents |
| **Board Reports** | On-demand | Generate presentations from data |
| **Risk Scoring** | Auto | AI-assessed risk level per RIU/Case |
| **Pattern Detection** | On-demand | Identify patterns across cases |

**AI Action Capabilities:**
| Category | Examples | Confirmation Required? |
|----------|----------|------------------------|
| **Read/Summarize** | "Summarize this case", "Show overdue tasks" | No |
| **Draft/Propose** | "Draft follow-up emails", "Suggest remediation steps" | Preview only |
| **Execute (Low Risk)** | "Add a note to this case", "Create a task for myself" | Yes (single click) |
| **Execute (High Risk)** | "Send emails to 15 managers", "Close this investigation" | Yes (explicit confirm + preview) |
| **Modify Settings** | "Update the approval workflow", "Change notification rules" | Yes (admin only, full preview) |

### AI Design Principles

1. **Assist, don't replace** - Human judgment always final
2. **Non-intrusive** - Optional panels, not blocking workflows
3. **Transparent** - Clear when content is AI-generated
4. **Editable** - All AI outputs can be modified
5. **Auditable** - Track AI usage and edits
6. **Permission-scoped** - AI cannot do anything the user couldn't do manually

### Context Hierarchy Model

Context loads in layers, with later layers overriding earlier ones (similar to CLAUDE.md in Claude Code):

```
Context Loading Order:
1. Platform Context     → Built-in platform knowledge, entity schemas, action catalog
2. Organization Context → Org-level CONTEXT.md (terminology, policies, standards)
3. Team Context         → Team-level CONTEXT.md (team workflows, preferences)
4. User Context         → User-level CONTEXT.md (personal style, shortcuts)
5. Entity Context       → Current case/investigation data + conversation history
```

**Example Organization Context:**
- Terminology ("Associate" not "Employee", "Incident" not "Case" externally)
- Writing standards (3 paragraphs max, active voice, PII handling rules)
- Escalation rules (retaliation cases auto-flag Legal, VP+ cases notify CCO)

This enables organizations, teams, and individuals to customize AI behavior without code changes.

### Scoped Agents by View

Instead of one AI that dynamically adjusts scope, the platform uses **specialized agents** for different views. Each agent has its own context scope, default behaviors, and available skills.

| Agent | Scope | Loads | Best For |
|-------|-------|-------|----------|
| **Investigation Agent** | Single investigation | Investigation details, interviews, findings, evidence | Deep work on one investigation |
| **Case Agent** | Case + linked entities | Case data, all RIUs, all investigations (summarized), timeline | Case management, full picture |
| **RIU Agent** | Single RIU | RIU details, linked case (if any), reporter communications | Intake review, QA work |
| **Compliance Manager** | Program-wide | Recent activity, assigned items, trends, cross-entity patterns | Dashboard, oversight, reporting |
| **Policy Agent** | Policy lifecycle | Policy content, versions, approval workflow, attestation status | Policy work |

**Agent Switching:** Agents load automatically based on the current view. When the Compliance Manager surfaces an entity, users can "zoom in" and the system smoothly hands off to the appropriate entity-scoped agent.

**Benefits:**
- Right context, right scope (no wasted tokens on irrelevant data)
- Specialized expertise (each agent is "expert" in its domain)
- Clear user mental model ("I'm talking to the Investigation Assistant")
- Smooth handoffs (agents summarize for each other)

### Skills System

Skills are reusable, composable AI actions (like Claude Code slash commands):

```
Skill Hierarchy:
─────────────────
Platform Skills (built-in, all orgs)
├── /summarize - Generate entity summary
├── /timeline - Create chronological narrative
├── /find - Search across entities
├── /assign - Assign entity to user
├── /status - Change entity status
├── /remind - Set reminder/follow-up
├── /export - Generate report/export
└── /template - Apply response template

Organization Skills (org-defined)
├── /summarize-hipaa - HIPAA-specific summary with required fields
├── /escalate-legal - Standard legal escalation workflow
└── /weekly-report - Generate weekly case summary

Team Skills (team-defined)
├── /peer-review - Request peer review with checklist
└── /interview-prep - Generate interview questions for case type

User Skills (personal shortcuts)
├── /my-summary-style - Apply preferred summary format
└── /quick-close - Standard closure notes
```

**Skill Lifecycle:** Skills progress from personal use to community sharing:
- Create (personal) → Test (draft) → Use (active) → Share (team/org) → Publish (community marketplace)

Quality signals include ratings, reviews, install counts, and curated "Featured" collections. See TECH-SPEC-AI-AGENT.md for skill schema and marketplace details.

### Action Framework

AI executes actions through a registered **Action Catalog** - not by calling APIs directly. This ensures:
- **Auditable:** All possible actions documented in static catalog
- **Permission-scoped:** Actions filtered by user role, org features, and entity context
- **Safe:** AI can only invoke actions in the filtered catalog
- **Extensible:** Custom workflows can register custom actions

**Runtime Filtering:**
```
User asks: "What can I do with this case?"
AI sees: [assign, add_note, request_investigation, send_reminder, close]
AI does NOT see: [delete, change_org_settings, bulk_export] (no permission)
```

**Confirm-Before-Action UX:** Tiered confirmation based on action risk. For multi-step actions, AI uses the **Preview-then-Execute** pattern - preparing everything invisibly, presenting an editable preview, then executing on single confirmation.

**Guardrails (NEVER auto-execute):**
- Delete/archive operations
- External communications (email, SMS)
- Permission changes
- Workflow modifications
- Bulk operations (>5 items)
- Financial/sensitive data export

### Tiered Interaction Model

AI assistance scales from minimal to full conversation based on task complexity:

**Tier 1 - Inline (Ghost Text)**
- Trigger: Auto-appears while typing in text fields
- UX: Ghost text suggestions (smart compose style)
- Accept: Tab to accept, Escape to dismiss
- Use cases: Note completion, email templates, standard phrases

**Tier 2 - Contextual (Selection/Field Actions)**
- Trigger: Text selection, right-click, sparkle icon on AI-enabled fields
- UX: Floating toolbar or popover with action buttons
- Actions: "Summarize", "Improve", "Translate", "Ask AI..."
- Use cases: Summarize selected notes, improve draft text, create form from screenshot

**Tier 3 - Slide-over Drawer (Extended Conversation)**
- Trigger: Cmd+J (Mac) / Ctrl+J (Win), header AI icon, escalation from Tier 2
- UX: Right-side drawer slides in (like Claude Code terminal)
- Default: Closed - opens on demand, can be pinned open
- Use cases: Multi-turn conversations, complex queries, bulk action workflows

**Escalation Flow:**
```
Tier 1 (Inline) → User wants more control → Tier 2 (Contextual)
                                                     ↓
                               Task requires multi-turn → Tier 3 (Drawer)
```

**Key Principle:** AI is non-intrusive by default. Contextual assistance appears where you're working, not in a persistent panel consuming screen space.

### AI-First Data Architecture

The platform is designed **AI-first from the ground up**. This affects every schema and data structure:

#### Schema Patterns for AI

**1. Narrative Context Fields**
Every major entity includes prose fields that AI can understand:
```
CASE
├── summary: text              # AI-readable case summary
├── description: text          # Detailed narrative
├── intake_narrative: text     # Original reporter story
└── resolution_rationale: text # Why case was closed this way
```

**2. Structured + Rationale Pattern**
Store both the decision AND the reasoning:
```
status: 'CLOSED_SUBSTANTIATED'
status_rationale: 'Investigation confirmed policy violation based on witness interviews and document evidence'
```

**3. AI Enrichment Fields**
Key entities include AI-generated content with attribution:
```
├── ai_summary: text?           # AI-generated summary
├── ai_risk_score: number?      # AI-assessed risk level
├── ai_generated_at: timestamp? # When AI content was created
├── ai_model_version: string?   # Which model (claude-3-opus)
├── ai_confidence: number?      # AI confidence score (0-1)
```

**4. Activity Logs with Natural Language**
Not just structured data, but human-readable descriptions:
```
AUDIT_LOG
├── action: 'status_changed'
├── action_description: 'Sarah Chen changed case status from Open to Under Investigation after initial triage review'
├── context: json  # Full context AI would need
└── changes: json  # { old_value, new_value, fields_changed[] }
```

**5. Migration-Ready Schemas**
All entities support data import from competitor systems:
```
├── source_system: string?      # 'NAVEX', 'EQS', 'MANUAL'
├── source_record_id: string?   # Original ID in source
├── migrated_at: timestamp?     # When imported
```

#### Chat Interaction Examples

Every feature should be accessible via natural language. Examples:

| User Query | System Action |
|------------|---------------|
| "Show me all open cases assigned to my team" | Filter cases, return list |
| "Summarize the harassment cases from last quarter" | Query + AI summary |
| "What's the status of case 2024-001?" | Lookup + formatted response |
| "Assign this case to Jennifer" | Execute assignment action |
| "Create a board report for Q4 ethics metrics" | Generate presentation |
| "What policies cover retaliation?" | Policy search + excerpts |

#### Unified Audit Trail

The platform uses a single `AUDIT_LOG` table (not module-specific activity tables):

```
AUDIT_LOG (unified across all modules)
├── entity_type: 'CASE' | 'RIU' | 'DISCLOSURE' | 'POLICY' | 'USER' | ...
├── entity_id: uuid
├── action: standardized enum
├── action_description: text (natural language)
├── actor_id: uuid (User who performed action)
├── actor_type: 'USER' | 'SYSTEM' | 'AI'
├── context: json (full context for AI understanding)
├── changes: json (field-level before/after)
├── ip_address, user_agent
└── created_at (immutable)
```

This enables cross-entity queries like "Show me all actions by this user" or "What happened to this case?"

---

## Analytics & RIU Framework

### Reporting on Inputs vs. Responses

The RIU→Case separation enables distinct analytics perspectives that were impossible with monolithic case models:

| Metric Type | Data Source | Example Metrics |
|-------------|-------------|-----------------|
| **Input Volume** | RIUs | Reports received by channel, disclosure completion rates, geographic distribution |
| **Response Metrics** | Cases | Time to assignment, investigation duration, substantiation rates, outcomes |
| **Conversion Rates** | RIU→Case links | % of disclosures requiring review, escalation rates by category |
| **Cross-Pillar Intelligence** | Entity relationships | Cases linked to policy violations, subjects appearing across modules |

### Standard Dashboard Views

**RIU Dashboard (Input Analysis):**
- Reports by channel (hotline, web, chatbot, proxy) over time
- Reports by category with trend analysis
- Geographic distribution of reports
- Anonymous vs. identified ratio
- Campaign completion rates (disclosure, attestation)
- Average time from RIU creation to Case creation

**Case Dashboard (Response Analysis):**
- Open cases by status and pipeline stage
- Average days to close by category
- Outcomes distribution (substantiated, unsubstantiated, inconclusive)
- SLA compliance rates
- Investigator workload distribution
- Remediation completion rates

**Cross-Pillar Intelligence Dashboard:**
- Subjects appearing in multiple cases (pattern detection)
- Categories trending up/down over time
- Correlation: policy changes → case volume changes
- Remediation effectiveness by category
- Hotspot analysis by location/business unit

### Analytics Fact Tables

The analytics layer uses pre-aggregated fact tables for dashboard performance:

```
FACT_RIU_DAILY (Input metrics)
├── date_id
├── organization_id
├── rii_type
├── source_channel
├── category_id
├── severity
├── location_id
├── business_unit_id
├── is_anonymous (boolean)
├── created_case (boolean)
└── count

FACT_CASE_DAILY (Response metrics)
├── date_id
├── organization_id
├── status
├── outcome
├── category_id
├── assigned_to_id
├── severity
├── pipeline_stage
├── avg_days_open
├── sla_status
└── count

FACT_CAMPAIGN_DAILY (Campaign metrics)
├── date_id
├── organization_id
├── campaign_id
├── campaign_type
├── assignments_total
├── assignments_completed
├── assignments_overdue
├── cases_created
└── completion_rate
```

### AI-Powered Analytics Queries

Natural language queries leverage the RIU→Case structure:

| User Query | Data Sources | Response |
|------------|--------------|----------|
| "How many reports did we receive last quarter?" | FACT_RIU_DAILY | Count of RIUs by period |
| "What's our case closure rate?" | FACT_CASE_DAILY | Cases closed / total cases |
| "Show harassment cases from EMEA" | Cases + RIUs | Filtered case list with source RIUs |
| "Which locations have the most reports?" | RIUs by location | Ranked location list |
| "Compare disclosure completion: Q3 vs Q4" | FACT_CAMPAIGN_DAILY | Completion rate comparison |
| "Find patterns in retaliation cases" | Cases + AI analysis | AI-generated pattern summary |

---

## Permissions Model

### Role Hierarchy

| Role | See Cases | Assign | Investigate | Close | Configure |
|------|-----------|--------|-------------|-------|-----------|
| **System Admin** | All | Yes | Yes | Yes | Yes |
| **CCO/Compliance** | All | Yes | Optional | Yes | Yes |
| **Triage Lead** | Scoped | Yes | Yes | Configurable | Limited |
| **Investigator** | Assigned only | Configurable | Yes | Configurable | No |
| **Manager** (proxy) | Own submissions | No | No | No | No |
| **Employee** | Own cases | No | No | No | No |
| **Oversight** (Audit Committee) | Specific (view only) | No | No | No | No |

### Visibility Scoping

Beyond role permissions, visibility can be restricted by:
- Geographic region
- Business unit
- Case category
- Sensitivity level

### Configurable Permissions

These settings are adjustable per client:
- Can investigators assign cases? (default: No)
- Can investigators close cases? (default: No, requires supervisor)
- Is supervisor approval required before closure? (default: No)
- Can oversight roles add comments? (default: No, view only)
- Who can merge cases? (configurable: case owner, admin, or by permission)

---

## Views & Navigation (HubSpot Model)

### Saved Views Concept

Users can create personalized views (tabs) showing filtered data:
- Up to 25-50 saved views per user
- Each view = custom columns + filters + sort
- Can span entity types in "My Views"
- Examples:
  - "My Open Investigations"
  - "Unassigned Cases - EMEA"
  - "High Severity Last 30 Days"
  - "Pending Remediation Steps"

### Navigation Structure

```
LEFT NAV:
├── Dashboard (customizable)
├── My Workspace (cross-pillar aggregation)
├── Cases
├── RIUs (Risk Intelligence Items)
├── Investigations
├── Disclosures
├── Campaigns
├── Policies
├── Remediation
├── Analytics
├── Employee Portal (admin)
└── Settings
```

### "My Workspace" (Personal Dashboard)

- User-customizable aggregation from multiple pillars
- Example: User responsible for both Policies and Investigations sees unified task list
- Cross-pillar "next actions" visible in one place

### Module Dashboards

- Each module has its own customizable dashboard
- Widgets can be added, removed, rearranged (~50 dashboards allowed, each with multiple widgets)
- Drill-down from dashboard to detail views

---

## Routing & Escalation

### Assignment Models (Client Configurable)

| Model | Description |
|-------|-------------|
| **Manual Triage** | Unassigned queue → triage team assigns |
| **Auto by Location** | Route to location-specific HR/investigator |
| **Auto by Category** | Route to department (HR, Legal, Safety) |
| **Auto by Severity** | High severity → specific team |
| **Round Robin** | Distribute evenly across team |
| **Hybrid** | Combination rules |

### Escalation Triggers

- Specific categories (configurable list)
- Keywords in report content (configurable list)
- Severity level
- Combinations of above

### Escalation Actions

- Email notification to escalation contacts
- Phone call by operator (for immediate escalation)
- Route to specific individuals (CCO, Legal, Audit Committee)
- SLA timer activation

---

## Anonymous Communication

### The "Chinese Wall" Model

Ethico acts as a relay protecting reporter identity:

```
REPORTER                    ETHICO                     CLIENT
                              │
[email/phone] ──────────────► │ ◄─────────────── [messages]
   (stored,                   │                    (can send,
    hidden)                   │                    can't see
                              │                    contact info)
              ◄───────────────┤
              [forwarded      │
               messages]      │
```

### Anonymous Contact Methods

| Method | Status | Description |
|--------|--------|-------------|
| Access Code | Current | Reporter checks status via code |
| Email Relay | Current | Messages forwarded, address hidden |
| SMS Relay | Future | Text messages, number hidden |
| Web Portal | Future | Check status, leave messages online |

---

## Schema Sketch

### Core Tables

```sql
-- Base table for all risk intelligence inputs
CREATE TABLE risk_intelligence_units (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'hotline_report', 'disclosure', 'attestation', etc.

    -- Common fields
    source_channel VARCHAR(50),  -- 'phone', 'web_form', 'chatbot', 'email', 'proxy'
    received_at TIMESTAMP NOT NULL,
    reporter_type VARCHAR(20),   -- 'anonymous', 'confidential', 'identified'
    reporter_employee_id UUID,   -- nullable, links to HRIS

    -- Status (for RIUs that don't auto-create cases)
    status VARCHAR(30) DEFAULT 'pending_review',
    reviewed_by UUID,
    reviewed_at TIMESTAMP,

    -- AI enrichment
    ai_summary TEXT,
    ai_language_detected VARCHAR(10),
    ai_translation TEXT,
    ai_risk_score DECIMAL(3,2),

    -- Migration support
    source_system VARCHAR(50),
    source_record_id VARCHAR(255),
    migrated_at TIMESTAMP,

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,

    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Type-specific extension tables
CREATE TABLE riu_hotline_details (
    riu_id UUID PRIMARY KEY REFERENCES risk_intelligence_units(id),
    operator_id UUID,
    call_duration_seconds INT,
    callback_number VARCHAR(50),
    callback_times TEXT,
    anonymity_preference VARCHAR(20),
    original_transcript TEXT
);

CREATE TABLE riu_disclosure_details (
    riu_id UUID PRIMARY KEY REFERENCES risk_intelligence_units(id),
    disclosure_type VARCHAR(50),  -- 'conflict_of_interest', 'outside_employment', 'gift'
    campaign_id UUID,
    related_party_name VARCHAR(255),
    related_party_type VARCHAR(50),
    financial_value DECIMAL(15,2),
    relationship_description TEXT,
    employee_attestation BOOLEAN
);

-- Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    campaign_type VARCHAR(50),  -- 'disclosure', 'attestation', 'survey'
    name VARCHAR(255),
    description TEXT,
    form_template_id UUID,

    target_audience JSONB,  -- rules for who receives

    start_date DATE,
    due_date DATE,
    reminder_schedule JSONB,

    -- Thresholds for auto-case creation
    auto_case_rules JSONB,

    status VARCHAR(30),  -- 'draft', 'active', 'closed'

    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

CREATE TABLE campaign_assignments (
    id UUID PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id),
    employee_id UUID,  -- from HRIS

    status VARCHAR(30),  -- 'pending', 'completed', 'overdue', 'exempted'
    assigned_at TIMESTAMP,
    due_date DATE,
    completed_at TIMESTAMP,

    riu_id UUID REFERENCES risk_intelligence_units(id),  -- links to response when completed

    reminder_history JSONB
);

-- Cases: the work containers
CREATE TABLE cases (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    case_number VARCHAR(50) UNIQUE,

    -- Classification
    category_id UUID,
    subcategory_id UUID,
    severity VARCHAR(20),

    -- Pipeline/Workflow
    pipeline_id UUID,
    stage VARCHAR(50),
    status VARCHAR(30),  -- 'open', 'in_progress', 'pending_review', 'closed', 'merged'
    status_rationale TEXT,

    -- Assignment
    assigned_to UUID,
    assigned_team_id UUID,

    -- Merge tracking
    merged_into_case_id UUID REFERENCES cases(id),

    -- Outcomes
    substantiated BOOLEAN,
    finding_summary TEXT,
    outcome VARCHAR(50),

    -- AI enrichment
    ai_case_summary TEXT,
    ai_recommended_actions TEXT,
    ai_risk_score DECIMAL(3,2),
    ai_generated_at TIMESTAMP,
    ai_model_version VARCHAR(50),

    -- Migration support
    source_system VARCHAR(50),
    source_record_id VARCHAR(255),
    migrated_at TIMESTAMP,

    -- Dates
    opened_at TIMESTAMP DEFAULT NOW(),
    due_date DATE,
    closed_at TIMESTAMP,

    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- Association: RIUs to Cases (many-to-many)
CREATE TABLE riu_case_associations (
    id UUID PRIMARY KEY,
    riu_id UUID NOT NULL REFERENCES risk_intelligence_units(id),
    case_id UUID NOT NULL REFERENCES cases(id),
    association_type VARCHAR(30),  -- 'primary', 'related', 'merged_from'
    associated_at TIMESTAMP DEFAULT NOW(),
    associated_by UUID,

    UNIQUE(riu_id, case_id)
);

-- Investigations: children of cases
CREATE TABLE investigations (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id),
    organization_id UUID NOT NULL,
    investigation_type VARCHAR(50),

    status VARCHAR(30),
    investigator_id UUID,

    started_at TIMESTAMP,
    due_date DATE,
    completed_at TIMESTAMP,

    findings TEXT,
    substantiated BOOLEAN,

    -- AI enrichment
    ai_summary TEXT,
    ai_generated_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Custom fields (universal)
CREATE TABLE custom_field_definitions (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    entity_type VARCHAR(50),  -- 'rii', 'case', 'investigation', etc.
    entity_subtype VARCHAR(50),  -- optional: 'hotline_report', 'disclosure'

    field_name VARCHAR(100),
    field_label VARCHAR(255),
    field_type VARCHAR(30),  -- 'text', 'number', 'date', 'dropdown', 'multi_select', 'user', 'file'
    field_options JSONB,
    is_required BOOLEAN DEFAULT FALSE,
    is_reportable BOOLEAN DEFAULT TRUE,
    display_order INT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE custom_field_values (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    field_definition_id UUID REFERENCES custom_field_definitions(id),
    entity_type VARCHAR(50),
    entity_id UUID,

    value_text TEXT,
    value_number DECIMAL(20,6),
    value_date DATE,
    value_json JSONB,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,

    UNIQUE(field_definition_id, entity_id)
);

-- Related items (cross-pillar linking)
CREATE TABLE entity_relationships (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,

    source_entity_type VARCHAR(50),
    source_entity_id UUID,

    target_entity_type VARCHAR(50),
    target_entity_id UUID,

    relationship_type VARCHAR(50),  -- 'related_to', 'violation_of', 'spawned_from'

    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

-- Interactions: Follow-ups and additional contacts on a Case
CREATE TABLE interactions (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id),
    riu_id UUID REFERENCES risk_intelligence_units(id), -- links to follow-up RIU if new info creates one
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

    -- Operator info (for hotline)
    operator_id UUID,

    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

-- Subjects: People named in Cases (for cross-case pattern detection)
CREATE TABLE subjects (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id),
    organization_id UUID NOT NULL,

    -- Identity (from HRIS or manual entry)
    employee_id UUID, -- FK to employees table if linked from HRIS
    external_name VARCHAR(255), -- if not in HRIS
    email VARCHAR(255),
    phone VARCHAR(50),

    -- Context
    subject_type VARCHAR(30) NOT NULL, -- 'accused', 'witness', 'victim', 'reporter', 'other'
    relationship VARCHAR(50), -- 'employee', 'manager', 'vendor', 'contractor', 'customer'
    department VARCHAR(100),
    location VARCHAR(255),
    job_title VARCHAR(100),
    manager_name VARCHAR(255),
    manager_email VARCHAR(255),

    -- HRIS snapshot (captured at time of case creation for historical accuracy)
    hris_snapshot JSONB,

    -- Notes
    notes TEXT, -- context about subject's involvement

    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

-- Indexes for cross-case subject pattern detection
CREATE INDEX idx_subjects_employee ON subjects(organization_id, employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_subjects_name ON subjects(organization_id, LOWER(external_name)) WHERE external_name IS NOT NULL;
CREATE INDEX idx_subjects_email ON subjects(organization_id, LOWER(email)) WHERE email IS NOT NULL;
```

---

## Technical Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js 20.x with NestJS, TypeScript |
| **Database** | PostgreSQL 15+ with pgvector |
| **Search** | Elasticsearch 8+ |
| **Cache** | Redis 7 |
| **AI** | Anthropic Claude API |
| **Storage** | Azure Blob Storage |
| **Infrastructure** | Azure (App Service, Kubernetes) |

### Multi-Tenancy

- Shared database with row-level security (RLS)
- `organization_id` on all tables
- Tenant context set at authentication via JWT
- Data isolation enforced at query level AND application layer (defense in depth)
- Business unit scoping within tenants (`business_unit_id`)

### Key Technical Decisions

See `00-PLATFORM/WORKING-DECISIONS.md` for full details.

| Decision | Resolution |
|----------|------------|
| HRIS integration | Merge.dev unified API + SFTP fallback |
| Notification system | Unified event-driven service; Email at launch, SMS later |
| File storage | Azure Blob Storage, per-tenant containers, AES-256 encryption |
| Audit log architecture | Unified `AUDIT_LOG` table with natural language |
| Search indexing | Hybrid: PostgreSQL FTS primary, Elasticsearch for complex, pgvector for semantic |
| User vs Employee | Separate entities; Users for auth, Employees for HRIS |
| Analytics architecture | Fact tables with incremental refresh |
| UI Framework | shadcn/ui + Tailwind CSS (Radix primitives) |
| Background jobs | BullMQ with Redis |
| Real-time features | Socket.io + Y.js for collaborative editing |

### Supporting Technical Documents

| Document | Purpose |
|----------|---------|
| `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` | User, Employee, Organization, Category, AuditLog schemas |
| `01-SHARED-INFRASTRUCTURE/ANALYTICS-DATA-MODEL.md` | Fact tables, dashboard/report persistence |
| `01-SHARED-INFRASTRUCTURE/TECH-SPEC-HRIS-INTEGRATION.md` | Merge.dev integration, employee sync |
| `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md` | SSO, JWT, RLS, RBAC details |
| `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-INTEGRATION.md` | Claude API patterns, prompts |
| `00-PLATFORM/WORKING-DECISIONS.md` | All architectural decisions |
| `00-PLATFORM/AI-FIRST-CHECKLIST.md` | Design validation checklist |

---

## Competitive Differentiation

### AI-First Platform Advantage

Unlike competitors who bolt AI features onto legacy architectures, Ethico's platform is **AI-first from the data model up**:

| Aspect | Competitors | Ethico Platform |
|--------|-------------|-----------------|
| **Data Design** | Structured fields only | Narrative + structured + AI enrichment |
| **Audit Trails** | Action codes | Natural language descriptions |
| **Search** | Keyword matching | Semantic understanding (pgvector) |
| **Migration** | Manual data entry | AI-assisted import with context preservation |
| **Reporting** | Fixed dashboards | Natural language queries |
| **Summaries** | Manual writing | AI-generated with human edit |

**What This Enables:**
- "Show me cases similar to this one" (semantic search)
- "Summarize all harassment cases from EMEA this quarter" (natural language)
- "What patterns do you see across our retaliation cases?" (cross-case AI)
- Automatic board report generation from data
- AI that understands context because data was designed for AI

### vs. NAVEX / EQS / Case IQ

| Capability | Competitors | Ethico Platform |
|------------|-------------|-----------------|
| Platform Unity | Fragmented acquisitions | Native unified build |
| AI Features | Limited / add-on | Native throughout (AI-first architecture) |
| Analytics | Basic dashboards | HubSpot-style self-service + AI queries |
| Configurability | Rigid | Flexible views, fields, workflows |
| Custom Fields | Limited, not reportable | Unlimited, fully reportable |
| Investigation Templates | None/basic | Category-specific checklists |
| Remediation Tracking | Separate system | Integrated with library |
| User Experience | Legacy (2010s) | Modern (2026) |
| Time to Value | Weeks/months | Hours/days |
| Data Migration | Painful, lossy | AI-assisted, context-preserving |

### Magic Features (Switching Triggers)

1. Legacy data ingestion from competitor systems
2. Configurable views per user (HubSpot-style)
3. Intuitive board reporting without Power BI
4. AI translation (real-time, bidirectional)
5. AI case summaries and document analysis
6. Remediation plan library with reporting
7. Investigation templates by category
8. Gap detection ("these cases missing resolution dates")

---

## Resolved Decisions (Q12-Q16)

### Q12: Campaign Non-Response Handling ✓

**Decision: Configurable per campaign**

Each campaign can define its own non-response behavior:
- Auto-create Case for non-compliance
- Escalate to manager (notification only)
- Escalate to manager AND create Case
- Just flag as overdue, no auto-action

This allows critical campaigns (annual COI) to have stricter handling than routine ones.

### Q13: Policy Violation Tracking ✓

**Decision: Link to specific Policy Version**

When a Case is categorized as a policy violation, it links to the **specific version** of the policy that was violated. This provides legal defensibility: "Employee violated Code of Conduct v2.1, effective Jan 2024."

### Q14: Policy-to-Case Triggers ✓

| Policy Event | Auto-Create Case? | Rationale |
|--------------|-------------------|-----------|
| Attestation refusal (refuses to sign) | **No** - Flag only | Track as failed attestation; manager can escalate if needed |
| Attestation quiz failure | **No** - Remediation | Failed quiz = re-take training, not a compliance case |
| Policy expired without renewal | **Configurable** | Critical policies (Code of Conduct) yes; minor policies no |
| Policy review overdue | **No** - Workflow task | Policy review is an internal workflow, not a case |
| Employee disputes policy | **Yes** - Always | Disputes require formal review, response tracking, and resolution |

### Q15: Merge Permissions ✓

**Decision: Configurable permission**

Each client can define who has case merge rights. Options include:
- Case owner only
- Case owner or admin
- Anyone with edit access to both cases
- Specific role(s)

### Q16: Custom Field Inheritance ✓

**Decision: Smart inheritance with no-overwrite**

Custom fields follow these rules:
1. **Auto-match by field name**: When an RIU has a custom field, and a Case has a field with the same name, the value copies automatically
2. **No overwrite**: If the Case field already has data, RIU data does not replace it
3. **Explicit configuration**: Admins can set up additional inheritance rules beyond name-matching

---

## Future Topics to Specify

- Pipeline stage definitions and workflow engine
- Auto-assignment rules
- Approval workflows
- SLA and escalation triggers
- Notification rules
- Dataset builder specifications
- Dashboard widget types
- Board report templates
- Monday Board / Project Management integration
- HRIS sync patterns and employee lifecycle

---

## Success Metrics

### Platform Health

| Metric | Target |
|--------|--------|
| Page load time | < 2 seconds |
| API response (p95) | < 500ms |
| Uptime | > 99.5% |
| AI summary generation | < 10 seconds |

### Business Outcomes

| Metric | Target |
|--------|--------|
| Time to first assignment | < 4 hours |
| Average case resolution | < 20 days |
| Investigation completeness | > 95% |
| User adoption rate | > 90% |
| Free tier conversion | > 5% |

---

## Key Principles

These principles guide all platform decisions:

1. **HubSpot Parallel:** RIUs are like Contacts (immutable inputs), Cases are like Deals (mutable work containers)

2. **Separation of Concerns:** Campaigns track obligations, RIUs track responses, Cases track actions

3. **Flexibility Over Rigidity:** Make things configurable rather than hard-coded where compliance programs vary

4. **AI-Native:** Every entity should have AI-generated fields (summaries, translations, risk scores)

5. **Cross-Pillar Intelligence:** The value is in connecting information across modules, not siloing it

6. **Audit Everything:** Detailed audit logs for all fields and actions

7. **Speed to Value:** Design for fast implementation and historical data migration

---

## Appendix: Glossary

| Term | Definition |
|------|------------|
| **RIU** | Risk Intelligence Item - immutable input representing something that happened |
| **Case** | Mutable work container for tracking the organization's response to RIUs |
| **Campaign** | Outbound request for information (disclosure, attestation, survey) |
| **Campaign Assignment** | Individual employee's obligation to respond to a campaign |
| **Investigation** | Workstream within a Case with own assignee, status, findings |
| **Interaction** | Any touch point on a Case (initial intake, follow-ups) |
| **Directive** | Client-specific guidance/script for operators |
| **Subject** | Person named in a Case (accused, witness, etc.) |
| **Remediation Plan** | Checklist of corrective actions post-investigation |
| **Proxy Report** | RIU submitted by manager on behalf of employee |
| **Pipeline** | Workflow stages for case progression |

---

*End of Platform Vision Document*
