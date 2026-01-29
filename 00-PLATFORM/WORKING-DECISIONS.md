# Ethico Risk Intelligence Platform - Working Decisions Document

**Document Purpose:** This document captures all product decisions made during discovery sessions. Load this into a new Claude chat to continue where we left off.

**Last Updated:** January 2026
**Session Coverage:** Platform architecture, entity model, Operator Console, Client Platform investigation workflow, permissions, remediation plans, Employee Chatbot, Ethics Portal

---

## Table of Contents
1. [Platform Vision](#1-platform-vision)
2. [Entity Model](#2-entity-model)
3. [Source Channels](#3-source-channels)
4. [Operator Console](#4-operator-console)
5. [Client Platform](#5-client-platform)
6. [Permissions Model](#6-permissions-model)
7. [AI Features](#7-ai-features)
8. [Routing & Escalation](#8-routing--escalation)
9. [Views & Navigation](#9-views--navigation)
10. [Employee Chatbot](#10-employee-chatbot)
11. [Ethics Portal](#11-ethics-portal)
12. [Open Topics for Next Session](#12-open-topics-for-next-session)

---

## 1. Platform Vision

### Core Concept
"HubSpot for Compliance" - A unified, AI-native Risk Intelligence Platform that consolidates ethics and compliance workflows into a single system with product-led growth model.

### Two Products, One Platform

| Product | Users | Purpose |
|---------|-------|---------|
| **Operator Console** | Ethico staff (operators, QA) | Hotline intake, QA review, multi-client management |
| **Client Platform** | Customer users (CCO, investigators, managers) | Investigation management, dashboards, reporting |

### Key Differentiators vs. NAVEX/Competitors
- Native unified platform (not fragmented acquisitions)
- AI capabilities throughout (not limited/add-on)
- HubSpot-style self-service analytics and views
- Modern, configurable UX
- Flexible investigation templates
- Reportable custom fields
- Remediation plan library
- Real-time AI translation
- Multi-channel anonymous communication

---

## 2. Entity Model

### Core Hierarchy

```
CASE (primary entity - appears in case list)
│
├── Embedded: Intake Information
│   - Source channel (hotline, web, proxy, direct entry)
│   - Reporter info (anonymous flag, contact, relationship)
│   - Original narrative, summary, addendum
│   - Location, category, severity
│   - Subjects
│   - Custom questions/fields
│
├── Interactions (timeline of all touches)
│   ├── Initial Intake (type: INITIAL)
│   ├── Follow-up #1 (type: FOLLOW_UP) - may add new info
│   ├── Follow-up #2 (type: FOLLOW_UP)
│   └── ... (hotline or web portal follow-ups)
│
├── Investigations (0 to N per case)
│   ├── Investigation A (e.g., HR)
│   │   - Own assignee(s)
│   │   - Own status/workflow
│   │   - Own category
│   │   - Own findings
│   │   - Own template (if applicable)
│   │   - Own remediation plan (if substantiated)
│   │   - Notes, interviews, documents, evidence
│   │
│   └── Investigation B (e.g., Legal)
│       - Same structure as above
│
├── Communications (two-way with reporter)
│   - Messages via email (anonymized relay)
│   - Messages via SMS (future - anonymized)
│   - Web portal messages
│
└── Remediation Plan (if no investigations but case substantiated)
    - Checklist of steps
    - Assignees (users or non-users)
    - Tracked, reportable
```

### Key Entity Decisions

| Decision | Choice |
|----------|--------|
| Intake vs. Case | Combined into Case (with ability to split in rare cases) |
| Case status | Derived from child investigations (open until all closed), but overridable by admin |
| Subjects | Linked at Case level, searchable across all cases |
| Follow-ups | Stored as Interactions, linked to parent Case, don't appear as separate cases |
| Categories | Client-configurable with primary/secondary, standard starting list provided |
| Custom fields | Unlimited, reportable, can be tied to templates |

### Request for Information (RFI)
- Separate from Cases
- Logged and tracked for metrics
- Skips QA
- Does not generate investigations
- Form does not simplify (same fields captured)

### Interaction Types

| Type | QA Required | Appears in Case List |
|------|-------------|----------------------|
| Initial Intake | Yes | Yes (it IS the case) |
| Follow-up (hotline) | Yes | No (linked to parent) |
| Follow-up (web portal) | No | No (linked to parent) |
| RFI | No | Separate list |

### Follow-up Handling
- Caller identifies via access code (anonymous) or name/email (identified)
- Operator sees existing case summary
- New information captured → "Additional Information" section with timestamp
- Notification sent to assignee when new info added
- Follow-ups tracked for metrics (indicator of investigation health/velocity)

---

## 3. Source Channels

| Channel | Who Enters | Interface | QA Required | Notes |
|---------|------------|-----------|-------------|-------|
| Hotline | Ethico Operator | Operator Console | Yes | Phone number maps to client profile |
| Web Form | Employee/Reporter | Employee Portal | No | Self-service |
| Proxy Report | Manager | Manager Portal (simplified) | No | Captures manager as submitter |
| Direct Entry | Compliance Officer | Client Platform | No | Same fields as operator |
| Chatbot | Employee/Reporter | Employee Portal | No | AI-guided intake |
| Email | TBD | TBD | TBD | Future consideration |

---

## 4. Operator Console

### Client Profile Loading
- Phone number → database lookup → loads client profile
- Profile includes: directives, statements, custom questions, locations, HRIS data, categories

### Call Flow Workflow

```
1. CALL COMES IN
   └── System loads client profile based on phone number

2. OPENING
   └── Operator clicks opening statement directive (if applicable), reads to caller

3. METADATA CAPTURE
   ├── Case type: Report vs RFI vs Follow-up
   ├── First time caller? Awareness source?
   ├── Anonymous? Contact info? Relationship?
   ├── Interpreter used?
   └── Location (lookup from client list or manual entry)

4. INTERVIEW (real-time)
   ├── Detail notes captured (bullets or freeform)
   ├── Category selected → AUTO-SURFACE related directives
   ├── Subjects added (HRIS lookup or manual)
   ├── Custom questions answered (general + category-specific)
   ├── Severity assessed
   │
   └── [AI ASSIST PANEL - optional, non-intrusive]
       ├── Suggested follow-up questions
       ├── Category suggestions based on content
       └── Escalation flag if trigger words detected

5. CLOSING
   ├── Read closing statement (if applicable)
   ├── Offer survey (if applicable)
   └── Provide access code (if anonymous)

6. POST-CALL CLEANUP
   ├── Clean up detail notes
   ├── [AI BUTTON: Convert bullets → formal narrative]
   ├── [AI BUTTON: Generate summary]
   ├── Write addendum (caller demeanor notes)
   ├── Final review
   └── Click "SEND TO QA"

7. QA REVIEW
   ├── QA sees queue (high severity first)
   ├── Can edit everything
   ├── Fixes issues or asks operator for clarification
   ├── Checks mandatory directive compliance
   └── Click "RELEASE TO CLIENT"

8. CASE APPEARS IN CLIENT PLATFORM
   ├── Triggers routing/assignment rules
   ├── Triggers notifications
   └── Triggers escalation if applicable
```

### Intake Form Fields

**General:**
- First time calling?
- Awareness source (customizable list: poster, web portal, manager, code of conduct, etc.)

**Case Type:**
- Report / RFI / Follow-up

**Reporter Info:**
- Anonymous? (yes/no)
- Email address (optional, blinded if anonymous)
- Phone number (optional, for SMS - future)
- Relationship (customizable: employee, vendor, related party, witness, etc.)
- Interpreter used? (yes/no)

**Location:**
- Lookup from client location list OR manual entry
- Fields: Address, city, state, zip, country

**Report Details:**
- Details/Notes (expanded text field)
- Summary (AI-assisted generation)
- Addendum (caller demeanor, context for investigator)

**Category:**
- Primary category (from client list)
- Secondary category (optional)
- Severity:
  - High: Serious imminent threat or action to person, property, or environment
  - Medium: Serious allegation not currently happening or subject not at work
  - Low: Everything else

**Subjects:**
- Multiple allowed
- HRIS lookup or manual entry
- Type (accused, witness, etc.)
- Metadata from HRIS (configurable by client)

**Custom Questions:**
- General (apply to all calls for this client)
- Category-specific (triggered when category selected)

### Directives System
- Client-specific knowledge base / playbook
- Stored with headings, expandable to show details
- Types include:
  - Opening/closing statements
  - Anonymous caller treatment
  - No location provided guidance
  - Severity escalation procedures (phone numbers, emails)
  - Category-specific redirects (e.g., payroll → HR number)
  - IT support requests
  - Employment verification requests
  - Online reporting directives
- Auto-surface when related category selected
- Optional blocking for mandatory directives (client configurable)
- Should be versioned (new feature)

### QA Workflow
- QA team sees queue of completed cases pending review
- High severity cases appear first
- QA can edit everything
- QA fixes issues or asks operator clarifying questions
- "Release to Client" is the approval step
- RFIs skip QA

### Escalation (Operator-Initiated)
- For high severity cases, operators:
  - Make phone calls to escalation contacts
  - Send emails to escalation contacts
- Triggered by severity + category + keywords

---

## 5. Client Platform

### Case Lifecycle (Client Side)

```
CASE RELEASED FROM QA
        │
        ▼
┌─────────────────────────────┐
│  ROUTING & ASSIGNMENT       │
│  - Auto-route by rules OR   │
│  - Land in Unassigned queue │
│  - Notifications sent       │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  TRIAGE (if manual)         │
│  - Compliance officer views │
│  - Assigns to investigator  │
│  - May create investigation │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  INVESTIGATION              │
│  - Document interviews      │
│  - Add notes, research      │
│  - Upload documents/evidence│
│  - Apply templates/checklists│
│  - Track progress via status│
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  FINDINGS & CLOSURE         │
│  - Document findings        │
│  - Select outcome           │
│  - Supervisor approval (opt)│
│  - Close investigation      │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  REMEDIATION (if needed)    │
│  - Select from library      │
│  - Checklist of steps       │
│  - Assign to users/non-users│
│  - Track completion         │
└─────────────────────────────┘
```

### Investigation Features
- All investigative work done in-system
- Document: interviews, phone calls, research notes
- Upload: documents, pictures, videos, emails
- Apply: templates/checklists by category (e.g., HIPAA breach)
- Goal: standardize investigations across categories, investigators, locations

### Investigation Templates
- Tied to categories
- Checklist format
- Required questions/steps for that type of investigation
- Ensures quality control and completeness

### Findings & Outcomes
- Findings must be documented before closure
- Standard outcomes: Substantiated, Unsubstantiated, Inconclusive
- Additional outcomes configurable by client
- Approval step optional (configurable per client)

### Remediation Plans
- Library of templates tied to categories
- Applied at Investigation level
- If Case has no Investigation but is substantiated → attach at Case level
- Checklist format with steps
- Steps assigned to:
  - Users (in-app notification)
  - Non-users (email with simple form/link to complete)
- Fully reportable (% complete, overdue, by category, etc.)

---

## 6. Permissions Model

### Role Types

| Role | See Cases | Assign | Investigate | Close | Configure |
|------|-----------|--------|-------------|-------|-----------|
| **Oversight/Watcher** (Audit Committee) | Specific cases (view/summary) | No | No | No | No |
| **CCO / Top Compliance** | All | Yes | Optional | Yes | Yes |
| **Triage / Lead Investigator** | Scoped | Yes (configurable) | Yes | Configurable | No |
| **Investigator** | Assigned only | No (default, configurable) | Yes | Configurable | No |
| **Manager** (proxy reporter) | Own submissions | No | No | No | No |
| **Employee** (reporter) | Own cases (status) | No | No | No | No |

### Key Permission Decisions
- Investigator assignment permission: off by default, can enable at client level
- Case closure permission: configurable per client (investigator vs supervisor)
- Approval workflow: optional per client
- Multiple assignees: yes (primary + support)
- View-only access: yes (for oversight roles like Audit Committee)

### Watcher/Oversight Role Details
- Receives email summary when case routed to them
- Can log in and see cases in their scope
- Can view summary or details (based on permissions)
- Can ask questions via AI chat about the case
- Cannot add investigation notes or take actions

### Data Visibility Scoping
Beyond roles, visibility can be restricted by:
- Region/Location
- Business Unit
- Category type
- Sensitivity level

---

## 7. AI Features

### Confirmed AI Features

| Feature | Trigger | Description |
|---------|---------|-------------|
| **Case Summary** | Post-call button + on-demand | Generate summary from details, excluding anonymous identifiers |
| **Note Cleanup** | Post-call button | Convert bullet notes to formal narrative, fix grammar/spelling |
| **Real-time Assist** | During call (optional) | Suggested questions, category hints, escalation flags |
| **Translation** | Auto when language differs | Translate reports to investigator's language, preserve original |
| **Portal Translation** | Auto based on user locale | Translate forms/portals to employee's language |
| **Case Q&A Chat** | On-demand | Ask questions about a specific case |
| **Cross-Case Analytics** | On-demand | "How many cases was John Smith a subject in?" |
| **Subject Summary** | On-demand | AI summary of all cases involving a subject |
| **Report Generation** | On-demand | Generate board presentations from case data |
| **Document Analysis** | On-demand | Upload documents, find references to subjects/case |

### AI Design Principles
- Assist, not replace human judgment
- Non-intrusive during live calls
- All AI outputs editable by users
- Track when AI content is edited

---

## 8. Routing & Escalation

### Assignment Models (Client Configurable)

| Model | Description |
|-------|-------------|
| Manual Triage | Cases land in Unassigned queue, triage team assigns |
| Auto by Location | Route to investigator/HR manager at that location |
| Auto by Category | Route to specific department (HR, Legal, Safety) |
| Auto by Severity | High severity → specific team or escalation |
| Round Robin | Distribute evenly across investigation team |
| Hybrid | Combination of above |

### Escalation Triggers
- Specific categories (configurable)
- Specific keywords in report (configurable)
- Severity level
- Combination of above

### Escalation Actions
- Immediate notification (email)
- Phone call to escalation contacts (operator-initiated)
- Route to specific individuals (CCO, Legal, Audit Committee)

---

## 9. Views & Navigation

### HubSpot-Style Views
- Users can create saved views (tabs across top)
- Each view = filtered query of data
- Up to 25-50 saved views per user
- Views can span entity types in "My Views" section
- Example tabs:
  - "My Open Investigations"
  - "Unassigned Cases"
  - "Overdue Corrective Actions"
  - "EMEA Region Cases"
  - "High Severity This Month"

### View Configuration
- Select columns to display
- Define filters (status, category, location, assignee, date range, etc.)
- Set sort order
- Save with custom name

### Navigation Structure (Proposed)
```
LEFT NAV:
├── Dashboard (customizable widgets)
├── My Views (cross-entity saved views)
├── Cases
├── Investigations
├── Disclosures
├── Policies
├── Corrective Actions / Remediation
├── Analytics
├── Employee Portal (admin)
└── Settings / Configuration
```

### Default Landing
- User-configurable (choose default view on login)
- Could be Dashboard, or a specific saved view

---

## 10. Employee Chatbot

### Core Concept
AI-powered conversational interface for employee self-service across all compliance touchpoints.

### Primary Use Cases

| Use Case | Description | Authentication |
|----------|-------------|----------------|
| **Report Intake** | Guided speak-up reporting | Anonymous or SSO |
| **Policy Q&A** | AI-powered policy questions with citations | Either |
| **Case Status Check** | View status, messages, send replies | Access code or SSO |
| **Disclosure Assistance** | Conversational form completion | SSO required |
| **Compliance Inquiry** | Async questions to compliance team | Either |
| **Knowledge Base Search** | Search custom uploaded documents | Either |

### Tiered AI Response Model

| Tier | Confidence | Behavior | Example |
|------|------------|----------|---------|
| **Tier 1** | High (>85%) | Direct answer with citation | "Based on Policy 4.2, the gift limit is $100" |
| **Tier 2** | Medium (50-85%) | Ask clarifying questions, provide guidance with confidence indicator | "This depends on a few factors..." |
| **Tier 3** | Low (<50%) or user request | Create async inquiry for compliance team | "I've sent this to our compliance team" |

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Human handoff model | Async via inquiry + hotline offer | Compliance teams are 1-5 people, not call centers |
| Intake flow | Guided conversation, one question at a time | Matches web form data, feels more natural |
| QA workflow | Skip (like web forms) | Direct to client, no operator review needed |
| Language handling | Auto-detect, respond in user's language | Same as other modules |
| Resume capability | Auto-resume within 48 hours | Reduces abandonment |
| Knowledge base sources | Custom docs uploadable by client | Beyond just published policies |
| Consent capture | Required before conversation | AI use + data retention acknowledgment |

### Access Points

| Location | Characteristics |
|----------|-----------------|
| Ethics Portal Widget | Floating bubble, no login required, anonymous capable |
| Employee Portal Embedded | Full chat in authenticated experience, proactive prompts |
| Standalone Page | Dedicated URL, deep-linkable from notifications |

### Proactive Capabilities

| Type | When | Example |
|------|------|---------|
| Notification-triggered | Compliance event | "Your COI disclosure is due" → chatbot opens with context |
| Contextual prompt | High-value moment | Subtle "Need help?" on Ethics Portal homepage |
| Reactive (default) | User-initiated | Chat icon visible but dormant |

### Entities Introduced

- **CHATBOT_CONVERSATION** - Tracks conversation state, transcript, resulting entities
- **CHATBOT_INQUIRY** - Tier 3 escalations requiring human response
- **KNOWLEDGE_BASE_DOCUMENT** - Documents powering AI knowledge (with pgvector embeddings)
- **CHATBOT_CONSENT_LOG** - Immutable consent records
- **FAQ_ENTRY** - Pre-approved Q&A pairs

### Integration Points

| Module | Integration |
|--------|-------------|
| Case Management | Creates cases from intake |
| Disclosures | Creates disclosures from conversation |
| Policy Management | Sources knowledge base content |
| Operator Console | Draft handoff when caller mentions chatbot code |
| Notifications | Triggers proactive prompts |

### Compliance Requirements

- Full conversation transcript stored (original + translated)
- Consent captured before first interaction
- Data residency configurable per client
- Immutable audit trail

---

## 11. Ethics Portal

### Core Concept
The Ethics Portal is the unified employee-facing experience layer for the platform. It serves as a **presentation layer** that orchestrates capabilities from Case Management, Disclosures, and Policy Management—owning UX/UI but referencing domain PRDs for entity specs, status definitions, and business logic.

### Key Design Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **Architecture** | Unified portal with sub-portals (Employee, Manager, Anonymous) | Single entry point that branches based on user context |
| **Branding** | Full white-label (custom domain, logo, colors, fonts, imagery, video, CMS) | Enterprise requirement for brand consistency |
| **Channels** | Client-configurable (web form, hotline, chatbot, email, proxy) | Different clients have different needs |
| **Chatbot** | MVP feature, tiered by context | Anonymous users get intake/policy Q&A; authenticated users get full assistant |
| **Anonymous Flow** | Access code + anonymized email relay | Balances anonymity with communication capability |
| **Manager Portal** | Configurable features per client | Not all clients want managers to see team compliance |
| **Content Management** | CMS-like drag-and-drop page builder | Clients need to customize messaging without code |
| **Mobile** | Progressive Web App (PWA) | Installable, offline-capable, push notifications |
| **Languages** | Auto-detect + HRIS-driven + user override | Comprehensive language support |
| **Policy Access** | Integrated Policy Hub with attestations, search, AI Q&A | Full compliance resource center |
| **SSO** | SAML, OIDC, Google, Microsoft 365, magic link fallback | Support all enterprise auth patterns |
| **Accessibility** | WCAG 2.1 AA | Industry standard compliance |
| **Form Logic** | Templates with simple branching; advanced logic for premium | Balance simplicity with power |
| **Analytics** | Client-configurable tracking levels | Privacy flexibility (GDPR) |
| **Follow-ups** | Multi-channel (portal, email reply, hotline with access code) | All channels sync to same case |
| **Delegation** | Self-service (executives grant delegation to EAs) | Reduces admin burden |
| **Offboarding** | Client-configurable policy | Immediate, grace period, or manual |
| **Timeline** | 12-16 weeks comprehensive MVP | Phased delivery |

### Portal Architecture

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
│  • Check status     │  │  • My Cases         │  │  • Team Dashboard   │
│  • Chat (limited)   │  │  • My Disclosures   │  │  • Proxy Reporting  │
│                     │  │  • Policies         │  │  • Completion Status│
│  No login required  │  │  • Attestations     │  │                     │
│  Access code flow   │  │  • Notifications    │  │  Configurable per   │
│                     │  │  • Chat (full)      │  │  client             │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### Domain Ownership

| Employee Action | Portal Responsibility | Domain PRD Ownership |
|-----------------|----------------------|----------------------|
| Submit a concern | Form UX, intake flow, confirmation | Case Management (PRD-005) |
| File a disclosure | Form UX, contextual guidance, draft saving | Disclosures (PRD-006) |
| Attest to policy | Presentation, signature capture | Policy Management (PRD-009) |
| Check case status | Display status, show messages | Case Management (PRD-005) |
| Ask chatbot a question | Conversation UX | Policy/Case/Disclosure for domain knowledge |

### Portal-Specific Entities

| Entity | Purpose |
|--------|---------|
| **PortalConfiguration** | Per-tenant branding, channels, features, settings |
| **ContentBlock** | CMS content for drag-and-drop pages |
| **ContentPage** | CMS page definitions |
| **MediaAsset** | Uploaded images, videos, documents |
| **NotificationPreference** | User-level notification settings |
| **ProxyDelegation** | Executive-to-EA self-service delegation |
| **ChatSession** | Chatbot conversation tracking |
| **ChatMessage** | Individual chatbot messages with AI context |
| **AnonymousReporterSession** | Access code and relay email management |

### MVP Phasing

| Phase | Weeks | Focus |
|-------|-------|-------|
| **Phase 1** | 1-6 | Core portal, authentication, report submission |
| **Phase 2** | 7-10 | Employee Portal, Manager Portal, basic CMS |
| **Phase 3** | 11-14 | Chatbot, Policy Hub, advanced CMS |
| **Phase 4** | 15-16 | Polish, PWA optimization, analytics |

---

## 12. Open Topics for Next Session

### Modules Not Yet Discussed
1. ~~**Disclosures Module** - COI, gifts, outside activities~~ *(PRD-006 completed)*
2. **Policy Management** - Version control, attestations, distribution
3. **Analytics & Reporting** - Dashboard builder, board reports, data gaps
4. ~~**Web Forms Configuration** - Form builder, branching logic~~ *(Covered in PRD-003 Ethics Portal)*
5. ~~**Employee Portal** - Self-service reporting, status checks, policy access~~ *(PRD-003 completed)*

### Technical Decisions Pending
1. Technology stack confirmation
2. Multi-tenancy approach
3. HRIS integration patterns
4. File storage and document management
5. Notification system architecture
6. Search implementation (Elasticsearch?)
7. Audit logging approach

### Questions to Address
1. ~~How do Disclosures relate to Cases? (Can a disclosure spawn a case?)~~ *(Resolved: Yes, via escalation)*
2. ~~Policy attestation workflow details~~ *(Resolved: See PRD-009)*
3. ~~Dashboard widget library - what metrics matter most?~~ *(Resolved: See Analytics Data Model)*
4. Board report templates - what do they look like today?
5. ~~Employee chatbot conversation design~~ *(Resolved: See Section 10)*
6. ~~Mobile experience requirements~~ *(Resolved: PWA approach in PRD-003)*

---

## 13. Architectural Decisions (January 2026)

The following decisions were finalized during the platform planning session. These are canonical and should be referenced when implementing features.

### A. Core Data Model Decisions

#### A.1 User vs Employee Entities

**Decision:** Separate entities, linked via `employee_id` on User

| Entity | Source | Purpose | Typical Count |
|--------|--------|---------|---------------|
| **Employee** | HRIS-synced | Represent all people in org | 10,000+ |
| **User** | Platform-created | Authentication, authorization | 50-200 |

**Key References:**
- Case subjects → Employee
- Case assignees → User
- Attestation recipients → Employee
- Workflow approvers → User

**Rationale:** Most employees will never log in to the platform. Separating identities prevents confusion between "people in the organization" and "platform users."

**Schema Reference:** `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`

#### A.2 Unified Audit Trail

**Decision:** Field-level changes with old/new values in unified `AUDIT_LOG` table

**Replaces:** Three fragmented tables (Case Activity, Disclosure Activity, Chatbot Activity)

**Schema:**
```
AUDIT_LOG
├── entity_type (CASE, DISCLOSURE, POLICY, etc.)
├── entity_id
├── action (created, updated, status_changed, etc.)
├── action_description (natural language)
├── changes (JSON: { field: { old, new } })
├── actor_user_id, actor_type
├── created_at (immutable)
```

**Benefits:**
- Single query for "all activity related to X"
- Consistent schema for AI context extraction
- Cross-entity timeline views

**Schema Reference:** `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md#unified-audit-log`

#### A.3 Workflow Engine

**Decision:** Shared workflow engine with module-specific configurations

**Engine Handles:**
- State machine transitions
- Assignment and routing
- Notifications and reminders
- Escalation rules
- SLA tracking

**Modules Define:**
- Available states and valid transitions
- Routing rules
- SLA timelines
- Notification templates

**Rationale:** Avoids duplicating workflow logic across Cases, Disclosures, and Policies.

#### A.4 Category Taxonomy

**Decision:** Unified Category table with `concept_key` for cross-module correlation

```
CATEGORY
├── module (CASE, DISCLOSURE, POLICY, ALL)
├── concept_key (e.g., "harassment" - links related categories)
├── hierarchy (parent_id, path for tree structure)
├── module_config (JSON for module-specific settings)
```

**Benefits:**
- "Everything related to harassment" dashboards across Cases, Disclosures, Policies
- Single admin UI for category management
- Consistent reporting dimensions

**Schema Reference:** `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md#category`

---

### B. Infrastructure Decisions

#### B.1 Multi-Tenancy

**Decision:** RLS + Application layer + Business Unit layer (defense in depth)

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **1. RLS** | PostgreSQL Row-Level Security | Database-enforced, cannot bypass |
| **2. Application** | WHERE clause in queries | Explicit, debuggable |
| **3. Business Unit** | business_unit_id filter | Within-tenant subdivision |

**Implementation:**
1. JWT contains `organization_id` and `business_unit_ids[]`
2. Middleware sets `SET LOCAL app.current_organization = $1`
3. RLS policies filter automatically
4. Application code also includes WHERE for debugging

**Rationale:** Even if application code has bugs, RLS prevents data leaks.

#### B.2 File Storage

**Decision:** Azure Blob Storage with per-tenant containers

**Pattern:**
```
tenant-{organizationId}/
├── cases/{caseId}/
│   ├── {fileId}.pdf
│   └── {fileId}_thumb.jpg
├── policies/{policyId}/
└── disclosures/{disclosureId}/
```

**Access Control (5 layers):**
1. Container-level ACL (tenant isolation)
2. RLS on File metadata table
3. Entity-level permissions (can user see the case?)
4. Business unit filter
5. Time-limited SAS tokens for download

#### B.3 Analytics Architecture

**Decision:** Hybrid - real-time for operational, pre-aggregated for dashboards

| Query Type | Data Source | Refresh | Use Case |
|------------|-------------|---------|----------|
| Live workload | Source tables | Real-time | Queue counts, current assignments |
| Dashboard metrics | Fact tables | 5 minutes | KPI cards, charts |
| Complex reports | Fact tables | Hourly | Trend analysis, cross-module |
| Board reports | Materialized views | Daily | Executive summaries |

**Schema Reference:** `01-SHARED-INFRASTRUCTURE/ANALYTICS-DATA-MODEL.md`

#### B.4 Search Architecture

**Decision:** Hybrid - PostgreSQL primary, Elasticsearch for full-text, pgvector for semantic

| Phase | Technology | Capability |
|-------|------------|------------|
| MVP | PostgreSQL full-text | Basic search, trigram matching |
| Post-MVP | Elasticsearch | Advanced full-text, facets, highlighting |
| AI Features | pgvector | Semantic search, similar cases |

**Tenant Isolation:**
- Elasticsearch: Index per tenant (`org_{organizationId}_{type}`)
- pgvector: Filtered by organization_id in queries

---

### C. API & Integration Decisions

#### C.1 API Design

**Decision:** REST with OpenAPI specification

**Pattern:**
```
/api/v1/{module}/{resource}
/api/v1/{module}/{resource}/{id}
/api/v1/{module}/{resource}/{id}/{sub-resource}
```

**Versioning:** URI-based (`/api/v1/`, `/api/v2/`)

**Examples:**
```
GET  /api/v1/cases
POST /api/v1/cases
GET  /api/v1/cases/{id}
GET  /api/v1/cases/{id}/investigations
POST /api/v1/cases/{id}/investigations
```

#### C.2 JWT Token Structure

**Decision:** Short-lived rich access tokens + long-lived refresh tokens

| Token | Expiry | Contents |
|-------|--------|----------|
| Access | 15 minutes | userId, organizationId, role, businessUnits, isOperator |
| Refresh | 7 days | userId, tokenFamily (for rotation detection) |

**Security Features:**
- Refresh token rotation (new refresh on use)
- Reuse detection (invalidate family on reuse)
- Revocation list in Redis for immediate logout

**Token Claims:**
```json
{
  "sub": "user_id",
  "org": "organization_id",
  "role": "COMPLIANCE_OFFICER",
  "bus": ["bu_1", "bu_2"],
  "emp": "employee_id",
  "isOp": false
}
```

#### C.3 HRIS Integration

**Decision:** Integration platform (Merge.dev/Finch) as primary, SFTP fallback

| Approach | Use Case | Sync Method |
|----------|----------|-------------|
| Integration platform | Modern HRIS (Workday, BambooHR, etc.) | Webhooks + API |
| SFTP | Legacy systems | Daily file drop |
| CSV Import | One-time migration | Manual upload |

**Requirements:**
- Data current within 24 hours
- Webhooks preferred for real-time updates
- Manual import only for initial onboarding

**Schema Reference:** `01-SHARED-INFRASTRUCTURE/TECH-SPEC-HRIS-INTEGRATION.md`

---

### D. Operational Decisions

#### D.1 Background Jobs

**Decision:** BullMQ with Redis

**Queues:**
| Queue | Purpose | Concurrency |
|-------|---------|-------------|
| notifications | Email, SMS, in-app | 10 |
| reports | Report generation, exports | 3 |
| imports | HRIS sync, data imports | 2 |
| ai | AI API calls | 5 |
| documents | PDF generation, conversion | 3 |
| campaigns | Attestation campaigns | 2 |
| scheduled | Cron-triggered jobs | 1 |

**Pattern:** Jobs include `organizationId`, processors set tenant context before execution.

#### D.2 Caching Strategy

**Decision:** Minimal caching - only cache proven-necessary expensive/stable data

**Cache:**
- Category hierarchies (TTL: 1 hour)
- Workflow configurations (TTL: 1 hour)
- Feature flags (TTL: 5 minutes)
- User sessions (TTL: 15 minutes)

**Don't Cache:**
- Case data (changes frequently)
- Investigation details (changes frequently)
- User-specific data (privacy concerns)
- Search results (stale quickly)

**Rationale:** Over-caching causes more bugs than it solves performance issues.

#### D.3 Notification System

**Decision:** Unified event-driven service with async queue delivery

**Architecture:**
```
Module Event → Event Bus → Notification Service → Queue → Channel Adapters
                              ↓
                    User Preferences Filter
```

**Channels (Launch):**
- In-app notifications (WebSocket push)
- Email (SendGrid/SES)

**Channels (Future):**
- SMS (Twilio)
- Slack integration
- Microsoft Teams

**Features:**
- Digest mode (daily/weekly summaries)
- Quiet hours per user
- Channel preference per notification type

#### D.4 Real-Time Features

**Decision:** Socket.io for general real-time, Y.js for collaborative editing

| Technology | Use Case |
|------------|----------|
| Socket.io | Presence indicators, live notifications, list updates |
| Y.js (CRDT) | Collaborative document editing (investigation notes, policy drafts) |

**Rooms:**
- `org:{organizationId}` - Org-wide broadcasts
- `case:{caseId}` - Case-specific updates
- `doc:{documentId}` - Collaborative editing

---

### E. Quality & Testing Decisions

#### E.1 Error Handling

**Decision:** Structured logging + Error tracking + Frontend error boundaries

**Components:**
| Layer | Tool | Purpose |
|-------|------|---------|
| Logging | Pino (structured JSON) | Debugging, audit |
| Error Tracking | Sentry or AppInsights | Alerting, trends |
| Frontend | Error boundaries | Graceful degradation |

**Features:**
- Request ID correlation across services
- PII redaction in logs
- Standardized error response format

**Error Response Format:**
```json
{
  "error": {
    "code": "CASE_NOT_FOUND",
    "message": "Case with ID abc123 not found",
    "details": {},
    "request_id": "req_xyz789"
  }
}
```

#### E.2 Testing Strategy

**Decision:** Integration-heavy with mandatory tenant isolation tests

| Priority | Type | Focus |
|----------|------|-------|
| 1 | Tenant isolation | Every PR must pass isolation tests |
| 2 | Integration | API endpoints, database queries |
| 3 | Unit | Complex business logic only |
| 4 | E2E | Critical user flows |

**CI Requirement:** Tenant isolation tests must pass for every PR.

**Test Coverage Targets:**
- Line coverage: 80% minimum
- Branch coverage: 75% minimum
- Tenant isolation: 100% of data access paths

---

### F. Frontend Decisions

#### F.1 UI Framework

**Decision:** shadcn/ui + Tailwind CSS (with Radix primitives)

**Rationale:**
- Modern, accessible, customizable
- No heavy component library dependency
- Consistent with platform design goals

**Structure:**
```
ui/           # shadcn/ui components
common/       # Shared custom components
features/     # Module-specific components
```

**Forbidden:**
- Material-UI (MUI)
- @mui/* packages
- Any heavyweight component libraries

#### F.2 Internationalization

**Decision:** Admin UI English-only but i18n-ready; user content multi-language

| Content Type | Languages | Implementation |
|--------------|-----------|----------------|
| Admin UI | English only | next-i18next, externalized strings |
| Employee Portal | Multi-language | AI translation + manual override |
| Policies | Multi-language | AI translation with version control |
| Chatbot | Multi-language | Auto-detect, respond in user language |

**Rationale:** Admin UI internationalization is expensive; focus translation budget on employee-facing content.

---

### Decision Log Summary

| ID | Area | Decision | Status |
|----|------|----------|--------|
| A.1 | Data Model | User vs Employee separation | Confirmed |
| A.2 | Data Model | Unified AUDIT_LOG | Confirmed |
| A.3 | Data Model | Shared workflow engine | Confirmed |
| A.4 | Data Model | Unified Category with concept_key | Confirmed |
| B.1 | Infrastructure | RLS + App layer multi-tenancy | Confirmed |
| B.2 | Infrastructure | Azure Blob per-tenant containers | Confirmed |
| B.3 | Infrastructure | Hybrid analytics architecture | Confirmed |
| B.4 | Infrastructure | PostgreSQL → ES → pgvector phased | Confirmed |
| C.1 | API | REST with OpenAPI | Confirmed |
| C.2 | API | Short access + long refresh tokens | Confirmed |
| C.3 | API | Integration platform for HRIS | Confirmed |
| D.1 | Operations | BullMQ for background jobs | Confirmed |
| D.2 | Operations | Minimal caching strategy | Confirmed |
| D.3 | Operations | Event-driven notifications | Confirmed |
| D.4 | Operations | Socket.io + Y.js for real-time | Confirmed |
| E.1 | Quality | Structured logging + Sentry | Confirmed |
| E.2 | Quality | Tenant isolation test priority | Confirmed |
| F.1 | Frontend | shadcn/ui + Tailwind | Confirmed |
| F.2 | Frontend | English admin, multi-lang content | Confirmed |

---

## Glossary

| Term | Definition |
|------|------------|
| **Case** | Primary container for risk intelligence from an intake |
| **Chatbot Conversation** | A conversational session with the AI assistant |
| **Chatbot Inquiry** | A question escalated to compliance team when AI cannot answer confidently |
| **Investigation** | A workstream within a Case with its own assignee, status, findings |
| **Intake** | The initial capture of information (embedded in Case) |
| **Interaction** | Any touch point on a Case (initial, follow-up) |
| **Knowledge Base** | Collection of policies, FAQs, and documents that power AI answers |
| **RFI** | Request for Information - logged inquiry, not a case |
| **Directive** | Client-specific guidance/script for operators |
| **Subject** | A person named in a Case (from HRIS or manual) |
| **Remediation Plan** | Checklist of corrective action steps post-investigation |
| **Proxy Report** | Case submitted by a manager on behalf of an employee |
| **Tier 1/2/3** | AI response confidence levels determining direct answer vs. escalation |
| **Ethics Portal** | Unified employee-facing experience layer (public landing, employee portal, manager portal) |
| **Access Code** | Unique code given to anonymous reporters to check status and communicate |
| **Proxy Delegation** | Self-service configuration allowing executives to delegate submissions to EAs |
| **PWA** | Progressive Web App - installable, offline-capable mobile experience |

---

*End of Working Decisions Document*
