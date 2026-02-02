# Ethico Risk Intelligence Platform - Working Decisions Document

**Document Purpose:** This document captures all product decisions made during discovery sessions. Load this into a new Claude chat to continue where we left off.

**Last Updated:** February 2026
**Session Coverage:** Platform architecture, RIU→Case entity model, Campaigns, Operator Console, Client Platform investigation workflow, permissions, remediation plans, Employee Chatbot, Ethics Portal, Q12-Q16 decisions, Platform Harmonization (workflow engine, navigation, AI experience, audit, integrations, custom fields, API design, saved views, templates, campaigns, imports, notifications, reporting, bulk operations, permissions, localization, MFA, session management)

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
13. [Architectural Decisions (January 2026)](#13-architectural-decisions-january-2026)
14. [Resolved Decisions Q12-Q16 (February 2026)](#14-resolved-decisions-q12-q16-february-2026)
15. [Platform Harmonization Decisions (February 2026)](#15-platform-harmonization-decisions-february-2026)
16. [Extended Platform Decisions (February 2026)](#16-extended-platform-decisions-february-2026)
17. [Security & Localization Decisions (February 2026)](#17-security--localization-decisions-february-2026)

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

## 2. Entity Model: The HubSpot Parallel (February 2026 Update)

### The Fundamental Insight

The platform uses a clear separation between **immutable inputs** and **mutable work containers**, mirroring HubSpot's architecture:

| HubSpot Concept | Ethico Concept | What It Does |
|-----------------|----------------|--------------|
| Contact | Risk Intelligence Item (RIU) | Immutable input - something happened. A report was filed, a form submitted, a disclosure made. |
| Deal | Case | Mutable work container. Has status, assignee, investigations, outcomes. Represents "what we're doing about it." |
| Association | RIU-Case Link | Links RIUs to Cases. Many RIUs can link to one Case. |
| Pipeline | Pipeline/Workflow | Defines stages and required actions for different case types |
| Properties | Custom Fields | Tenant-configurable fields on any entity |

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

Example: Three hotline calls about the same issue combine into one Case:
```
RIU #1: Hotline Report (Jan 10) ──┐
RIU #2: Hotline Report (Jan 12) ──┼──► CASE #100: "Warehouse Safety Investigation"
RIU #3: Hotline Report (Jan 15) ──┘         ├── Investigation A (Safety)
                                            ├── Investigation B (Retaliation)
                                            └── Remediation Plan
```

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

### Key Entity Decisions

| Decision | Choice |
|----------|--------|
| RIU vs. Case | Separate: RIU is immutable input, Case is mutable work container |
| RIU-to-Case relationship | Many-to-one (multiple RIUs can link to one Case) |
| Case status | Derived from child investigations (open until all closed), but overridable by admin |
| Subjects | Linked at Case level, searchable across all cases |
| Follow-ups | Stored as Interactions, linked to parent Case, don't appear as separate cases |
| Categories | Client-configurable with primary/secondary, standard starting list provided |
| Custom fields | Unlimited, reportable, can be tied to templates |

---

## 2.1 Campaign Model (February 2026)

### Campaign Entity Model

Outbound requests (annual COI disclosure, policy attestation) follow this flow:

```
CAMPAIGN (outbound request)
    │
    │ Creates (one per target employee)
    ▼
CAMPAIGN ASSIGNMENT (individual obligation)
    │
    │ When Employee Completes
    ▼
RISK INTELLIGENCE ITEM (the actual response - immutable)
    │
    │ If threshold met / review needed
    ▼
CASE (if action required)
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

## 14. Resolved Decisions Q12-Q16 (February 2026)

These questions were resolved in the February 2026 session during RIU→Case architecture refinement.

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

## Glossary

| Term | Definition |
|------|------------|
| **RIU** | Risk Intelligence Item - immutable input representing something that happened (hotline report, disclosure, attestation, etc.) |
| **Case** | Mutable work container for tracking the organization's response to one or more RIUs |
| **Campaign** | Outbound request for information (disclosure, attestation, survey) sent to employees |
| **Campaign Assignment** | Individual employee's obligation to respond to a campaign |
| **Chatbot Conversation** | A conversational session with the AI assistant |
| **Chatbot Inquiry** | A question escalated to compliance team when AI cannot answer confidently |
| **Investigation** | A workstream within a Case with its own assignee, status, findings |
| **Interaction** | Any touch point on a Case (initial, follow-up) |
| **Knowledge Base** | Collection of policies, FAQs, and documents that power AI answers |
| **RFI** | Request for Information - logged inquiry, not a case |
| **Directive** | Client-specific guidance/script for operators |
| **Subject** | A person named in a Case (from HRIS or manual) |
| **Remediation Plan** | Checklist of corrective action steps post-investigation |
| **Proxy Report** | RIU submitted by a manager on behalf of an employee |
| **Pipeline** | Workflow stages for case progression |
| **Tier 1/2/3** | AI response confidence levels determining direct answer vs. escalation |
| **Ethics Portal** | Unified employee-facing experience layer (public landing, employee portal, manager portal) |
| **Access Code** | Unique code given to anonymous reporters to check status and communicate |
| **Proxy Delegation** | Self-service configuration allowing executives to delegate submissions to EAs |
| **PWA** | Progressive Web App - installable, offline-capable mobile experience |

---

## 15. Platform Harmonization Decisions (February 2026)

These decisions were finalized during the platform harmonization session to ensure architectural consistency across all modules.

---

### G. Workflow Architecture

#### G.1 Unified Workflow Engine

**Decision:** Parallel + Sequential workflow engine (unified for all workflow types)

**Scope:** Single workflow engine for:
- Approval workflows (policies, disclosures, case closures)
- Assignment workflows (case routing, escalation)
- Review workflows (QA, editing cycles)
- Remediation workflows (action tracking, verification)

**Step Types:**
| Type | Behavior |
|------|----------|
| Sequential | Must complete before next starts |
| Parallel-All (AND gate) | All assignees must complete |
| Parallel-Any (OR gate) | Any one assignee can complete |

**Conditional Routing:** Simple rules that add/skip steps, not full branching

**Rationale:** Avoids duplicating workflow logic across Cases, Disclosures, Policies, and Remediation. One engine, many configurations.

#### G.2 Approver Model

**Decision:** Hybrid (role-based default, named override when needed)

**Behavior:**
- Default: Approver defined by role (e.g., "Department Manager")
- Override: Specific named user when needed (e.g., "John Smith for this step")
- Dynamic: Role resolves to actual user at execution time based on context

#### G.3 Rejection Flow

**Decision:** Default back to submitter with optional target specification

**Options:**
- Default: Rejection returns to original submitter
- Rejector override: Can specify target (previous step, specific step, or specific user)
- Configuration: Per-workflow-step settings for allowed rejection targets

#### G.4 Delegation

**Decision:** Both temporary AND permanent delegation supported

| Type | Use Case | Behavior |
|------|----------|----------|
| Temporary | Vacation coverage | Time-bounded, auto-reverts |
| Permanent | Role reassignment | Explicit transfer of responsibility |

**Audit:** Both types logged with full audit trail

#### G.5 SLA Escalation

**Decision:** Configurable per step

**Configuration Options:**
- Timeout duration (hours, days)
- Warning threshold (e.g., 80% of timeout)
- Escalation action (notify manager, reassign, auto-approve, auto-reject)
- Escalation chain (who to notify at each level)

**Deferred for Future:**
- Cross-entity workflows
- Complex branching (full decision trees)
- Sub-workflows (nested workflow execution)

---

### H. Navigation & AI Experience

#### H.1 Navigation Architecture

**Decision:** Three-mode navigation (AI-forward)

| Mode | Description | Primary Users |
|------|-------------|---------------|
| **Unified Inbox/Dashboard** | Clean dashboard as primary view for all pending tasks | All users |
| **Role-Filtered Views** | Customizable per role - hide irrelevant modules | Power users |
| **AI Chat Overlay** | Slide-out chat on any screen for insights, next steps, and actions | All users |

Users can switch between all three modes based on preference.

#### H.2 AI Chat Actions

**Decision:** Confirm-before-write with risk-tiered friction

| Action Type | Behavior | Example |
|-------------|----------|---------|
| Read-only (search, summarize) | Execute immediately | "Show me open cases" |
| Low-risk writes (add comment, set reminder) | Inline confirm | "Add this note?" [Yes/No] |
| High-risk writes (close case, change assignment) | Explicit action preview | Full preview modal with details |
| Bulk operations | Always require explicit confirmation + preview count | "This will update 47 cases. Proceed?" |

**Rationale:** Compliance data is consequential. AI assists, humans decide.

#### H.3 AI Presence Configuration

**Decision:** Tenant-configurable (required/available/hidden per feature)

Each organization decides where AI features are:

| Setting | Behavior |
|---------|----------|
| Required | Must use before certain actions (e.g., AI summary required before case closure) |
| Available | Optional panels/tools visible but not required |
| Hidden | Disabled entirely for that feature |

**Granularity:** Per-feature, per-module settings (e.g., AI suggestions required in Operator Console but optional in Case Management)

---

### I. Entity & Relationship Decisions

#### I.1 Subject Tracking

**Decision:** Linked to Employee records

Subjects (people involved in cases/investigations) are Employee entities from HRIS.

**Benefits:**
- Automatic cross-case pattern detection: "This person was subject of 3 cases in 2 years"
- Consistent identity across modules (Cases, Disclosures, Policies)
- Rich context from HRIS data (title, department, manager, tenure)

**Manual Entry:** When subject is not in HRIS (e.g., vendor, external party), create as non-employee subject with manual metadata.

#### I.2 Category Taxonomy

**Decision:** Shared Core + Module Extensions

| Layer | Scope | Example |
|-------|-------|---------|
| Core | Shared across all modules | "Conflict of Interest", "Harassment", "Fraud" |
| Module Extension | Specific to one module | Case: "Retaliation", Disclosure: "Gift > $500" |

**Benefit:** "Conflict of Interest" means the same thing in Cases, Policies, and Disclosures. Enables cross-module reporting.

**Schema Reference:** Uses `concept_key` from `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md#category`

#### I.3 Cross-Entity Relationships

**Decision:** Typed relationships with configurable contextual cards

**Relationship Types:**
| Type | Description |
|------|-------------|
| `violates_policy` | Case violates specific policy version |
| `related_to` | General relationship between entities |
| `parent_of` | Hierarchical relationship |
| `derived_from` | Entity created from another (e.g., Case from RIU) |
| `mentions` | Entity references another |

**Contextual Cards Sidebar:**
Right-hand panel on entity detail views showing:
- Related cases (by subject, policy, category)
- Related policies (if violation)
- Attestations by subjects
- Disclosures by subjects
- Employee contact information
- Case history for reporter (if identified)

**Configuration:** Full custom cards - tenants can define entirely new card types with custom fields and queries.

---

### J. Communication & Notification Decisions

#### J.1 Watch/Follow Notifications

**Decision:** Full model with multiple triggers

| Trigger | Behavior |
|---------|----------|
| Explicit watch | Users manually add entities to their watch list |
| Auto-watch on interaction | Comment, approve, or touch = auto-added to watch list |
| Assignment-based | Assignees and workflow participants automatically watch |

**Opt-out:** Users can unwatch any entity at any time, regardless of how they were added.

#### J.2 Anonymous Communication

**Decision:** Platform-mediated + optional email relay

| Channel | Description | Use Case |
|---------|-------------|----------|
| Platform primary | All communication through platform messaging; reporter uses access code | Default for all anonymous reporters |
| Email relay (optional) | Anonymized relay to reporter's email if provided | Reporter preference |

**Implementation:**
- Access code grants read/write to case messages
- Email relay anonymizes sender (Ethico as intermediary)
- All messages logged regardless of channel
- Reporter can switch channels at any time

---

### K. Audit & Security Decisions

#### K.1 Audit Trail Visibility

**Decision:** Tiered visibility model

| Tier | Events | Visibility |
|------|--------|------------|
| ACTIVITY | Status changes, assignments, comments, edits | Within entity scope (all with view access) |
| SENSITIVE | View events, access attempts, exports, downloads | Compliance + Admin only |
| SYSTEM | Permission changes, configuration changes | System Admin only |
| META_AUDIT | Audit queries, audit exports, audit access | System Admin only |

**Special Rules:**
- **Self-visibility:** Users can always see their own SENSITIVE tier events
- **View events:** Aggregated counts for non-admin roles (e.g., "5 viewers" instead of "John, Sarah, Mike viewed")
- **Immutability:** No updates or deletes on audit entries
- **Tamper detection:** Checksum chain for detecting tampering

---

### L. Content & Integration Decisions

#### L.1 Language Support

**Decision:** Stored AI translations

| Approach | Description |
|----------|-------------|
| AI translation | AI generates translations, stored alongside original |
| Human review | Human can review and edit AI translations |
| Version control | Translations linked to content version |

**Benefits:**
- One-time AI cost per translation
- Faster access (no real-time translation delay)
- Human verification possible before publishing

#### L.2 Document Attachments

**Decision:** Versioned + Immutable

**Behavior:**
- Every file upload creates a new version
- Old versions preserved forever (never deleted)
- Delete marks as "deleted" but retains for recovery
- Full audit trail of all versions

**Rationale:** Critical for legal discovery. Must be able to prove what document existed at what time.

#### L.3 Data Retention

**Decision:** Tenant-configurable policies

| Configuration | Options |
|---------------|---------|
| Retention period | 5, 7, 10, 15 years, or indefinite |
| Action at expiry | Archive (move to cold storage), Anonymize (remove PII), Delete |
| Per-category override | Different retention for different case categories |
| Legal hold | Override retention for ongoing litigation |

**Rationale:** Different clients have different regulatory requirements (GDPR, HIPAA, SOX, etc.).

#### L.4 External Integrations

**Decision:** OAuth 2.0 + Webhooks

**Pattern:**
- Outbound: OAuth 2.0 for authenticated API calls
- Inbound: Webhooks for real-time event reception
- Fallback: Polling for systems that don't support webhooks

**Supported Integration Types:**
- HRIS (Workday, BambooHR, ADP)
- ITSM (ServiceNow, Jira)
- GRC Tools (ServiceNow GRC, Archer)
- Communication (Slack, Teams)

#### L.5 Mobile Experience

**Decision:** Approvals + Notifications focused

**Optimized for Mobile:**
- Approving workflow items (quick approve/reject)
- Viewing notifications
- Quick status checks
- Case summary view

**Desktop-Only:**
- Full editing of cases/investigations
- Report building
- Form configuration
- Administrative settings

**Implementation:** PWA with responsive design (see PRD-003 Ethics Portal)

---

### Decision Log Summary (Platform Harmonization)

| ID | Area | Decision | Status |
|----|------|----------|--------|
| G.1 | Workflow | Unified parallel + sequential engine | Confirmed |
| G.2 | Workflow | Hybrid approver model | Confirmed |
| G.3 | Workflow | Rejection back to submitter with override | Confirmed |
| G.4 | Workflow | Temporary + permanent delegation | Confirmed |
| G.5 | Workflow | Per-step SLA escalation | Confirmed |
| H.1 | Navigation | Three-mode AI-forward navigation | Confirmed |
| H.2 | AI | Risk-tiered confirm-before-write | Confirmed |
| H.3 | AI | Tenant-configurable AI presence | Confirmed |
| I.1 | Entity | Subjects linked to Employee | Confirmed |
| I.2 | Entity | Shared core + module extension categories | Confirmed |
| I.3 | Entity | Typed relationships + contextual cards | Confirmed |
| J.1 | Notification | Full watch/follow model | Confirmed |
| J.2 | Communication | Platform-mediated + optional email relay | Confirmed |
| K.1 | Audit | Tiered visibility model | Confirmed |
| L.1 | Content | Stored AI translations | Confirmed |
| L.2 | Content | Versioned immutable attachments | Confirmed |
| L.3 | Content | Tenant-configurable retention | Confirmed |
| L.4 | Integration | OAuth 2.0 + webhooks | Confirmed |
| L.5 | Mobile | Approvals + notifications focus | Confirmed |

---

## 16. Extended Platform Decisions (February 2026)

These decisions were finalized during the extended platform harmonization session covering custom fields, API design, saved views, investigation templates, campaign tracking, data imports, notifications, reporting, bulk operations, and permission scoping.

---

### M. Custom Fields Architecture

#### M.1 Schema Extension Model

**Decision:** HubSpot-inspired schema extension

**Structure:**
| Table | Purpose |
|-------|---------|
| CustomFieldDefinition | Tenant-defined field metadata (type, validation, display) |
| CustomFieldValue | Actual values linked to entities (separate table, typed indexes) |

**Supported Field Types:**
- TEXT, TEXTAREA, RICH_TEXT
- NUMBER, CURRENCY
- DATE, DATETIME
- BOOLEAN
- SELECT, MULTISELECT
- USER, USER_MULTI
- EMAIL, URL, PHONE

#### M.2 Custom Field Features

**Decision:** Full HubSpot-style capabilities

| Feature | Description |
|---------|-------------|
| Conditional display | Show field X if field Y = value |
| Field groups | Logical grouping for UI organization |
| Validation rules | Required, min/max, pattern, unique |
| Reporting integration | Custom fields appear in report builder |
| Filtering/querying | Typed indexes for efficient queries |
| Full-text search | Optional per field |

#### M.3 Custom Field API Pattern

**Decision:** Embedded in entity response with dedicated definition endpoint

**Patterns:**
```
// Custom fields embedded in entity response
case.customFields.internal_case_number

// Field definitions endpoint
GET /custom-fields?entityType=CASE

// Filter syntax
?customFields.estimated_exposure[gt]=100000
```

#### M.4 Custom Field Deletion

**Decision:** Soft delete (hide, preserve data)

Deleting a field definition hides it from UI but preserves all historical data for:
- Audit trail integrity
- Historical report accuracy
- Legal discovery requirements

#### M.5 Custom Field Performance

**Decision:** Typed value columns with separate indexes

**Implementation:**
- Typed value columns (textValue, numberValue, dateValue) for efficient queries
- Field definitions cached per organization
- Denormalized entityType on values for query efficiency

---

### N. API Design

#### N.1 API Style

**Decision:** REST + OpenAPI

**Why not GraphQL:**
- Enterprise integrators expect REST
- Standard compliance integrations are simple CRUD
- Better tooling for rate limiting, caching, API gateways
- Lower learning curve for customer IT teams

#### N.2 API Versioning

**Decision:** URL-based with 12-month deprecation policy

**Pattern:** `/api/v1/`

**Deprecation Policy:**
- 12 months notice before version sunset
- Migration guides provided
- Deprecation headers on old versions

#### N.3 API Documentation

**Decision:** OpenAPI 3.1 with auto-generated resources

**Components:**
- OpenAPI 3.1 specification
- Auto-generated docs site (Redoc/Stoplight)
- Auto-generated SDKs (TypeScript, Python)

#### N.4 API Response Patterns

**Decision:** Consistent response envelope

| Type | Format |
|------|--------|
| Single resource | `{ data: {...}, meta: {...} }` |
| List | `{ data: [...], meta: { totalCount, pageInfo } }` |
| Error | `{ error: { code, message, details, requestId } }` |

#### N.5 API Pagination

**Decision:** Cursor-based (not offset)

**Rationale:** Consistency with large datasets; offset pagination breaks when data changes between requests.

#### N.6 Webhooks

**Decision:** Event subscription via API

**Features:**
| Feature | Description |
|---------|-------------|
| Subscribe via API | Register webhook endpoints programmatically |
| HMAC signature verification | Secure payload validation |
| Retry with exponential backoff | Reliable delivery |
| Event types | case.*, disclosure.*, policy.*, investigation.* |

---

### O. API Rate Limiting & Quotas

#### O.1 Rate Limit Tiers

**Decision:** Tiered by subscription plan

| Plan | Reads/min | Daily Quota |
|------|-----------|-------------|
| Starter | 100 | 10K calls |
| Professional | 500 | 100K calls |
| Enterprise | 2,000 | 1M calls |
| Unlimited | Custom | Negotiated |

#### O.2 Rate Limit Categories

**Decision:** Weighted by operation cost

| Category | Cost | Examples |
|----------|------|----------|
| Standard reads | Low | GET single entity, list queries |
| Standard writes | Moderate | POST, PUT (triggers events) |
| Bulk operations | High | Batch updates, mass assignments |
| Report execution | Very high | Aggregations, complex queries |
| File operations | Bandwidth | Upload, download |

#### O.3 Rate Limit Enforcement

**Decision:** Redis-based sliding window

**Mechanisms:**
- Per-minute rate limits (burst protection)
- Daily quotas (usage caps)
- Redis-based tracking with sliding windows

#### O.4 Rate Limit Headers

**Decision:** Standard response headers

**Headers:**
- X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- X-Quota-Limit-Day, X-Quota-Remaining-Day

#### O.5 Customer Visibility

**Decision:** Full usage transparency

**Features:**
- Usage dashboard in settings
- Configurable alerts at 80%, 95% thresholds
- Usage history and exportable reports

#### O.6 Enterprise Flexibility

**Decision:** Admin-configurable overrides

- Custom limit overrides per organization
- Tied to contract reference
- Admin UI for sales to configure limits

#### O.7 Graceful Degradation

**Decision:** Priority-based throttling

- Prioritize critical operations when near limits
- Low-priority requests (background sync) deprioritized first

---

### P. Saved Views Architecture

#### P.1 View Hierarchy

**Decision:** Personal + Shared + System views

| Level | Created By | Visibility | Editable |
|-------|------------|------------|----------|
| System | Platform | All users | No |
| Organization | Admin | Entire org | Admin only |
| Team | Team lead | Specific team/role | Creator + admins |
| Personal | User | Private | Owner only |

#### P.2 View Configuration

**Decision:** Full HubSpot-style configuration

**Includes:**
- Filters (with relative date support)
- Columns (selection, order, width, frozen)
- Sort order
- Optional grouping
- Display density

#### P.3 Special Filter Operators

**Decision:** Dynamic context-aware operators

| Operator | Description |
|----------|-------------|
| `isMe` | Current user (for "My Cases" views) |
| `isMyTeam` | Current user's team |
| `today` | Relative date: today |
| `thisWeek` | Relative date: current week |
| `thisMonth` | Relative date: current month |
| `thisQuarter` | Relative date: current quarter |

#### P.4 View Features

**Decision:** Full self-service view management

| Feature | Description |
|---------|-------------|
| Pin to sidebar | Quick access to favorite views |
| Set default | Default view per entity type |
| Duplicate | Create personal copy of any view |
| Share | Promote personal → team → org |
| Quick filters | Ephemeral, URL-based, not persisted |
| Column customization | Per-user overrides within shared views |

#### P.5 Default System Views

**Decision:** Pre-built views per entity type

**Cases:** All Open, My Assigned, Overdue, Recently Closed

**Disclosures:** Pending My Review, Conflicts Identified

**Policies:** Pending Approval, Due for Review

**Investigations:** My Active, Pending Findings

---

### Q. Investigation Templates & Checklists

#### Q.1 Template Trigger

**Decision:** Category-driven auto-application

Templates are automatically applied when a case is assigned to a category (at intake or later).

#### Q.2 Template Contents

**Decision:** Comprehensive investigation guidance

| Component | Description |
|-----------|-------------|
| Intake fields | Required before investigation starts |
| Investigation fields | Required during investigation |
| Findings fields | Required before closing |
| Checklist items | Phases and dependencies |
| Suggested interviews | Roles and reasons |
| Required documentation | Evidence checklist |
| Guidelines | Escalation criteria |

#### Q.3 Conditional Fields

**Decision:** HubSpot-style dependent fields

Fields can show/hide based on other field values (e.g., show "Retaliation Details" only if "Retaliation Alleged" = Yes).

#### Q.4 Template Stacking

**Decision:** Union of multiple templates

Multiple templates can apply (based on multiple categories). Fields and checklist items are combined; duplicates merged.

#### Q.5 Category Change Handling

**Decision:** Additive only

New template fields ADDED when category changes. Existing data is never removed or lost.

#### Q.6 Investigator Customization

**Decision:** Limited ad-hoc modifications

| Allowed | Not Allowed |
|---------|-------------|
| Add ad-hoc checklist items | Delete required template items |
| Mark items N/A (with reason) | Skip required fields |
| Add notes to any item | Remove template fields |

#### Q.7 Pre-built Templates

**Decision:** Industry-standard starting templates

**Included:** HIPAA, Discrimination, Fraud, Retaliation, COI, Safety, GDPR/CCPA

#### Q.8 Intake Integration

**Decision:** Template fields surface at appropriate phases

Template fields marked as "INTAKE" phase surface during intake data collection, not just during investigation. This enables category-specific intake questions.

---

### R. Campaign Response Tracking & Reminders

#### R.1 Automated Cadence

**Decision:** Configurable reminder schedule with escalation

**Default Schedule:** 14d, 7d, 3d, 1d, 0d, overdue

**Escalation Chain:**
| Trigger | Action |
|---------|--------|
| 3d overdue | Notify manager |
| 7d overdue | Notify skip-level |
| 14d overdue | Notify compliance |

#### R.2 Reminder Channels

**Decision:** Multi-channel delivery

- Email
- In-app notification
- Or both (configurable per campaign)

Escalation notifications include non-responder list.

#### R.3 Manual Follow-up

**Decision:** Full campaign owner control

| Action | Description |
|--------|-------------|
| Ad-hoc reminders | Individual or filtered group |
| Log offline follow-ups | Record phone, in-person contact |
| Grant extensions | Individual extensions with reason |
| Manual escalation | Override automated escalation |

#### R.4 Response Status Tracking

**Decision:** Full lifecycle tracking

**Statuses:** Pending → Viewed → In Progress → Completed

**Tracked Timestamps:** Sent, Viewed, Started, Completed

**Logged Events:** All reminders and escalations per user

#### R.5 Campaign Dashboard

**Decision:** Real-time operational visibility

| Widget | Description |
|--------|-------------|
| Completion percentage | Real-time progress |
| Breakdown | By department, location |
| Non-responder list | With context and history |
| One-click actions | Remind, escalate, export |

#### R.6 Manager Visibility

**Decision:** Team-level transparency

- Managers see their direct reports' completion status
- Can nudge their own reports directly

#### R.7 Decline Handling (Disclosures)

**Decision:** Optional decline with audit

- Optional "decline" option with required reason
- Decline notification to manager/compliance (configurable per campaign)

---

### S. Data Import/Migration Architecture

#### S.1 Self-Service Import UI

**Decision:** Visual upload and mapping for simple imports

**Suitable For:** Disclosures, policies, employee lists, basic cases

**Flow:** Upload CSV/JSON/XLSX → Column mapping UI → Validation preview → Import

**Features:**
- Pre-built templates for NAVEX, EQS, Convercent
- Value mapping for enums (status, category)

#### S.2 Migration API

**Decision:** Full API for complex migrations

**Suitable For:** Full case history, attachments, relationships, audit trail

**Features:**
| Feature | Description |
|---------|-------------|
| Professional services scripts | Custom migration code |
| Batch endpoints | Bulk operations |
| Dry-run mode | Validate without committing |
| Staged import | Rollback capability |
| Relationship resolution | Post-import entity linking |

#### S.3 Source Tracking

**Decision:** REQUIRED on all imported records

| Field | Purpose |
|-------|---------|
| sourceSystem | 'NAVEX', 'EQS', 'CSV_MANUAL', etc. |
| sourceRecordId | Original ID from source |
| migratedAt | Import timestamp |
| importSessionId | Link to import session |

#### S.4 Historical Audit Import

**Decision:** Preserve original context

- Preserve original timestamps and actors
- Mark as isHistorical: true
- Match actors by email to platform users (when possible)

#### S.5 Attachment Migration

**Decision:** Pre-signed URL workflow

**Flow:** Register → Pre-signed upload URL → Upload → Confirm

Original upload metadata (filename, timestamp, uploader) preserved.

#### S.6 Duplicate Detection

**Decision:** Configurable matching with multiple resolution options

**Match Configuration:** Configurable fields and threshold

**Resolution Options:**
- Skip duplicate
- Update existing
- Create anyway
- Flag for manual review

#### S.7 Migration Dashboard

**Decision:** Full operational visibility

| Feature | Description |
|---------|-------------|
| Real-time progress | By entity type |
| Failed record viewer | Error details and retry |
| Rollback capability | For staged imports |

---

### T. Notification Preferences

#### T.1 Preference Structure

**Decision:** Granular per event type per channel

**Matrix:** Event type × Channel (in-app, email, SMS)

Users enable/disable each combination independently.

#### T.2 Preset Profiles

**Decision:** Quick-start configurations

| Profile | Description |
|---------|-------------|
| Real-time | All events, all channels |
| Daily Digest | Batched email, critical only real-time |
| Critical Only | Only SLA breaches, escalations, urgent items |

#### T.3 Role Defaults

**Decision:** Sensible role-based starting points

| Role | Default Configuration |
|------|----------------------|
| Investigator | Case events for assigned cases |
| Compliance Officer | All org events |
| Employee | Own case updates only |

#### T.4 Do Not Disturb

**Decision:** Schedule-based quiet hours with override

- Configurable quiet hours (e.g., 6pm-8am)
- Critical events override (SLA breach still notifies)

---

### U. Reporting & Analytics Architecture

#### U.1 Three-Layer Model

**Decision:** HubSpot-inspired analytics architecture

| Layer | Purpose | Users |
|-------|---------|-------|
| Datasets | Reusable data source definitions | Power users, admins |
| Reports | Visualizations built on datasets | All users |
| Dashboards | Collections of reports/widgets | All users |

#### U.2 Dataset Builder

**Decision:** Visual data source definition

Power users can define:
- Base entity + joins
- Pre-filters
- Calculated fields
- Aggregations

Datasets are reusable across multiple reports.

#### U.3 Report Builder

**Decision:** No-SQL visual builder

- Drag-and-drop field selection
- Chart type picker
- Filter builder
- Grouping and sorting
- Date range selection

#### U.4 Dashboard Features

**Decision:** Flexible dashboard composition

| Feature | Description |
|---------|-------------|
| Personal dashboards | User-created, private |
| Shared dashboards | Team or org level |
| Role-based defaults | Pre-built per role |
| Drag-drop layout | Responsive grid |
| Pre-built templates | Common compliance reports |

#### U.5 Personal Dashboard Integration

**Decision:** Unified home experience

| Widget | Description |
|--------|-------------|
| My Tasks | Approvals, assignments, reminders |
| Pinned reports | Quick access metrics |
| Customizable layout | User-arranged home screen |

#### U.6 Compliance-Specific Features

**Decision:** Built-in compliance measures

- All queries tenant-scoped (RLS enforced)
- Permission-aware results (only accessible data shown)
- Compliance measures built-in (SLA %, attestation rates, risk scores)
- Report access logged (SENSITIVE audit tier)

---

### V. Bulk Operations

#### V.1 Dual-Mode Approach

**Decision:** Visual selection + Query-based

| Mode | Use Case | Max Items |
|------|----------|-----------|
| Visual selection | Small batches | ≤100 items |
| Query-based | Large batches | Unlimited |

#### V.2 Visual Selection Flow

Select in UI → Preview affected items → Confirm → Execute

#### V.3 Query-Based Flow

Define criteria → Preview count + sample → Explicit confirmation → Async execution with progress tracking

#### V.4 Safety Guardrails

**Decision:** Tiered confirmation by impact

| Count | Confirmation |
|-------|--------------|
| ≤10 | Simple click |
| ≤100 | Preview required |
| 1000+ | Type "CONFIRM" |

**Additional safeguards:**
- Async execution with progress tracking for large batches
- Restricted actions require elevated permissions
- 24hr delay option for very large destructive operations

#### V.5 Bulk Operation Audit

**Decision:** Full traceability

| Record | Purpose |
|--------|---------|
| BulkOperation | Master record for the batch |
| Individual entries | Per-affected item audit |
| Cross-reference | "closed via bulk operation [id]" |

#### V.6 Undo Support

**Decision:** Where possible

Supported for: Reassign, reopen, restore soft-deleted

Not supported for: Hard deletes, external notifications sent

---

### W. Permission Scoping

#### W.1 Role + Scope Model

**Decision:** Roles grant capabilities; Scopes limit visibility

**Roles (what you CAN do):**
- SYSTEM_ADMIN
- COMPLIANCE_OFFICER
- TRIAGE_LEAD
- INVESTIGATOR
- EMPLOYEE

**Scope Dimensions (what you CAN SEE):**
- Region (APAC, EMEA, Americas)
- Business Unit
- Category (HIPAA, Discrimination, Fraud)
- Sensitivity Level (Standard, Sensitive, Highly Sensitive)

#### W.2 Composable Permissions

**Decision:** Mix and match

Example: "Investigator for APAC + Discrimination cases only"

User can have multiple scope combinations attached to their role.

#### W.3 Scope Hierarchy

**Decision:** Parent/child inheritance

Scope dimensions can have hierarchy (e.g., APAC → Japan, Korea, China).

Access to parent grants access to all children unless explicitly restricted.

---

### Decision Log Summary (Extended Platform Decisions)

| ID | Area | Decision | Status |
|----|------|----------|--------|
| M.1 | Custom Fields | Schema extension model | Confirmed |
| M.2 | Custom Fields | Full HubSpot-style features | Confirmed |
| M.3 | Custom Fields | Embedded API pattern | Confirmed |
| M.4 | Custom Fields | Soft delete preservation | Confirmed |
| M.5 | Custom Fields | Typed value columns | Confirmed |
| N.1 | API | REST + OpenAPI | Confirmed |
| N.2 | API | URL versioning, 12-month deprecation | Confirmed |
| N.3 | API | OpenAPI 3.1 + auto-gen SDKs | Confirmed |
| N.4 | API | Consistent response envelope | Confirmed |
| N.5 | API | Cursor-based pagination | Confirmed |
| N.6 | API | Event webhooks with HMAC | Confirmed |
| O.1 | Rate Limiting | Tiered by plan | Confirmed |
| O.2 | Rate Limiting | Weighted by operation cost | Confirmed |
| O.3 | Rate Limiting | Redis sliding window | Confirmed |
| O.4 | Rate Limiting | Standard headers | Confirmed |
| O.5 | Rate Limiting | Customer visibility dashboard | Confirmed |
| O.6 | Rate Limiting | Admin-configurable overrides | Confirmed |
| O.7 | Rate Limiting | Priority-based throttling | Confirmed |
| P.1 | Saved Views | Four-level hierarchy | Confirmed |
| P.2 | Saved Views | Full configuration options | Confirmed |
| P.3 | Saved Views | Dynamic filter operators | Confirmed |
| P.4 | Saved Views | Self-service management | Confirmed |
| P.5 | Saved Views | Pre-built system views | Confirmed |
| Q.1 | Templates | Category-driven trigger | Confirmed |
| Q.2 | Templates | Comprehensive contents | Confirmed |
| Q.3 | Templates | Conditional fields | Confirmed |
| Q.4 | Templates | Template stacking (union) | Confirmed |
| Q.5 | Templates | Additive category changes | Confirmed |
| Q.6 | Templates | Limited investigator customization | Confirmed |
| Q.7 | Templates | Pre-built industry templates | Confirmed |
| Q.8 | Templates | Intake phase integration | Confirmed |
| R.1 | Campaigns | Automated escalation cadence | Confirmed |
| R.2 | Campaigns | Multi-channel reminders | Confirmed |
| R.3 | Campaigns | Full manual override | Confirmed |
| R.4 | Campaigns | Lifecycle status tracking | Confirmed |
| R.5 | Campaigns | Real-time dashboard | Confirmed |
| R.6 | Campaigns | Manager team visibility | Confirmed |
| R.7 | Campaigns | Optional decline with audit | Confirmed |
| S.1 | Import | Self-service UI for simple imports | Confirmed |
| S.2 | Import | Migration API for complex imports | Confirmed |
| S.3 | Import | Required source tracking | Confirmed |
| S.4 | Import | Historical audit preservation | Confirmed |
| S.5 | Import | Pre-signed URL attachments | Confirmed |
| S.6 | Import | Configurable duplicate detection | Confirmed |
| S.7 | Import | Migration dashboard | Confirmed |
| T.1 | Notifications | Granular event × channel matrix | Confirmed |
| T.2 | Notifications | Preset profiles | Confirmed |
| T.3 | Notifications | Role-based defaults | Confirmed |
| T.4 | Notifications | DND with critical override | Confirmed |
| U.1 | Reporting | Three-layer analytics model | Confirmed |
| U.2 | Reporting | Visual dataset builder | Confirmed |
| U.3 | Reporting | No-SQL report builder | Confirmed |
| U.4 | Reporting | Flexible dashboard composition | Confirmed |
| U.5 | Reporting | Personal dashboard integration | Confirmed |
| U.6 | Reporting | Compliance-specific measures | Confirmed |
| V.1 | Bulk Ops | Dual-mode approach | Confirmed |
| V.2 | Bulk Ops | Visual selection flow | Confirmed |
| V.3 | Bulk Ops | Query-based flow | Confirmed |
| V.4 | Bulk Ops | Tiered safety guardrails | Confirmed |
| V.5 | Bulk Ops | Full audit traceability | Confirmed |
| V.6 | Bulk Ops | Undo where possible | Confirmed |
| W.1 | Permissions | Role + scope model | Confirmed |
| W.2 | Permissions | Composable combinations | Confirmed |
| W.3 | Permissions | Scope hierarchy | Confirmed |

---

## 17. Security & Localization Decisions (February 2026)

These decisions were finalized during the final platform harmonization session covering localization/i18n, multi-factor authentication, and session management.

---

### X. Localization / Internationalization (i18n)

#### X.1 Launch Languages

**Decision:** English + Major European languages at launch

| Language | Code | Status |
|----------|------|--------|
| English | en | Default |
| Spanish | es | Launch |
| French | fr | Launch |
| German | de | Launch |
| Portuguese | pt | Launch |

**Phase 2 (Demand-Driven):**
- Italian (it)
- Dutch (nl)
- Japanese (ja)
- Chinese Simplified (zh-CN)
- Korean (ko)

#### X.2 What's Localized

**Decision:** Platform UI and system content only

**Localized:**
- UI strings (buttons, labels, menus, messages)
- System email templates
- Error messages
- Report labels and headers
- Help documentation (key guides)

**Not Localized (User Content):**
- Case descriptions
- Policy content
- Comments and notes
- Investigation details

**Note:** Policy translation is a separate AI-assisted feature (see L.1 Stored AI Translations).

#### X.3 RTL Support

**Decision:** No RTL support at this time

Latin scripts only. RTL languages (Arabic, Hebrew) deferred to future phase based on market demand.

#### X.4 Technical Implementation

**Decision:** Standard i18n libraries with type safety

| Layer | Technology |
|-------|------------|
| Frontend | next-intl (Next.js) |
| Backend | Custom i18n service |
| Formatting | Intl APIs (date, number, currency) |
| Keys | Type-safe translation keys |

#### X.5 User Locale Preferences

**Decision:** User-level preference with org defaults

**User Settings:**
| Setting | Description |
|---------|-------------|
| preferredLocale | UI language |
| preferredTimezone | For date/time display |
| preferredDateFormat | DD/MM/YYYY vs MM/DD/YYYY |

**Organization Settings:**
| Setting | Description |
|---------|-------------|
| defaultLocale | Default for new users |
| supportedLocales | Which languages are enabled |

#### X.6 Email Template Localization

**Decision:** Per-language variants with fallback chain

**Behavior:**
1. Check user's preferredLocale
2. Fall back to organization's defaultLocale
3. Fall back to system English

All system emails have separate templates per supported language.

---

### Y. Multi-Factor Authentication (MFA)

#### Y.1 MFA Strategy

**Decision:** Hybrid IdP + Platform MFA

| User Type | MFA Source |
|-----------|------------|
| SSO users (Okta, Azure AD, etc.) | Trust IdP MFA assertion |
| Local accounts | Platform-managed MFA |

#### Y.2 SSO MFA Handling

**Decision:** Trust IdP with optional enforcement

**Behavior:**
- Check `amr` (Authentication Methods References) claim in SAML/OIDC response
- Platform setting: "Require MFA from IdP"
- If enabled, reject SSO without MFA claim

#### Y.3 Local Account MFA Methods

**Decision:** TOTP primary, SMS fallback, recovery codes

| Method | Priority | Description |
|--------|----------|-------------|
| TOTP | Primary | Google Authenticator, Authy, etc. |
| SMS | Fallback | Text message codes |
| Email | Recovery only | Not for regular MFA |
| Recovery codes | Backup | 10 one-time codes generated at setup |

#### Y.4 Admin MFA Policy Controls

**Decision:** Granular organizational controls

| Setting | Description |
|---------|-------------|
| Require MFA for roles | Specific roles (ADMIN, COMPLIANCE_OFFICER) |
| Require MFA for all | Organization-wide requirement |
| Grace period | Days allowed before MFA required (default: 7) |
| Allowed methods | Which MFA methods are permitted |

#### Y.5 Service Account Authentication

**Decision:** API keys + IP allowlist

Service accounts do not use MFA. Instead:
- API key authentication
- IP allowlist for additional security
- Separate audit trail

---

### Z. Session Management

#### Z.1 Session Policy Configuration

**Decision:** Configurable per-tenant session policies

| Setting | Default | Description |
|---------|---------|-------------|
| Session timeout (absolute) | 8 hours | Max session duration |
| Idle timeout | 30 minutes | Inactivity threshold |
| Max concurrent sessions | 3 per user | Simultaneous login limit |
| Concurrent session action | WARN | WARN, BLOCK, or TERMINATE_OLDEST |
| Remember me | Allowed | Whether "remember me" is permitted |
| Remember me duration | 30 days | How long remembered sessions last |
| IP binding | Disabled | Strict mode: invalidate on IP change |
| Device fingerprint binding | Enabled | Tie session to device |
| Force logout on browser close | Disabled | Optional strict security |

#### Z.2 Session Storage

**Decision:** Hashed refresh tokens with activity tracking

**Storage Pattern:**
- Refresh tokens stored hashed in UserSession table
- Last activity timestamp tracked for idle timeout
- Full audit trail of session events

#### Z.3 Re-authentication for Sensitive Actions

**Decision:** Optional per-action re-auth requirement

**Configuration:**
- Configurable timeout (e.g., require re-auth every 15 minutes for case closure)
- Per-action settings for high-risk operations
- Applies to: case closure, bulk operations, admin settings

#### Z.4 Rationale

Healthcare clients (HIPAA) require 15-minute idle timeouts; retail can allow 8 hours. Enterprise compliance platform must respect customer security policies. Configurable session management enables compliance with diverse regulatory requirements.

---

### Decision Log Summary (Security & Localization)

| ID | Area | Decision | Status |
|----|------|----------|--------|
| X.1 | i18n | English + 4 European languages at launch | Confirmed |
| X.2 | i18n | UI/system content localized, user content not | Confirmed |
| X.3 | i18n | No RTL support (Latin scripts only) | Confirmed |
| X.4 | i18n | next-intl + Intl APIs | Confirmed |
| X.5 | i18n | User + org locale preferences | Confirmed |
| X.6 | i18n | Per-language email templates with fallback | Confirmed |
| Y.1 | MFA | Hybrid IdP + Platform MFA | Confirmed |
| Y.2 | MFA | Trust IdP MFA with optional enforcement | Confirmed |
| Y.3 | MFA | TOTP primary, SMS fallback, recovery codes | Confirmed |
| Y.4 | MFA | Admin policy controls for MFA requirements | Confirmed |
| Y.5 | MFA | API keys + IP allowlist for service accounts | Confirmed |
| Z.1 | Sessions | Configurable per-tenant policies | Confirmed |
| Z.2 | Sessions | Hashed tokens with activity tracking | Confirmed |
| Z.3 | Sessions | Optional re-auth for sensitive actions | Confirmed |

---

## 18. AI Agent Architecture (February 2026)

### AA: AI as Action Agent ("Claude Code for Compliance")

The platform AI is not just a chatbot - it's an **action agent** that can execute operations on behalf of users, similar to how Claude Code operates for developers.

#### AA.1 Core Capability

**Decision:** AI can take real actions in the platform, not just answer questions

**Action Categories:**
| Category | Examples | Confirm Required? |
|----------|----------|-------------------|
| **Read/Summarize** | "Summarize this case", "Show overdue tasks" | No |
| **Draft/Propose** | "Draft follow-up emails to managers", "Suggest remediation steps" | Preview only |
| **Execute (Low Risk)** | "Add a note to this case", "Create a task for myself" | Yes (single click) |
| **Execute (High Risk)** | "Send emails to 15 managers", "Close this investigation" | Yes (explicit confirm + preview) |
| **Modify Settings** | "Update the approval workflow", "Change notification rules" | Yes (admin only, full preview) |

#### AA.2 Context Awareness

**Decision:** AI context adapts based on what user is viewing

**Context Scopes:**
| Scope | User Is Looking At | AI Can Act On |
|-------|-------------------|---------------|
| **Program (Bird's Eye)** | Dashboard, analytics | Cross-entity queries, bulk operations, program-wide insights |
| **Entity List** | Cases list, campaign list | Filter/search, bulk actions on visible items |
| **Entity Detail** | Specific case, investigation | That entity and its children (notes, tasks, messages) |
| **Workflow** | Approval queue, task board | Items in that workflow context |

**Context is passed to AI with every interaction:**
- Current page/view
- Selected entity (if any)
- User's role and permissions
- Organization settings

#### AA.3 Confirm-Before-Action UX

**Decision:** Tiered confirmation based on action risk

**UX Pattern:**
1. User requests action via chat
2. AI proposes action with full preview (who will receive what, what will change)
3. User reviews and clicks "Confirm" or "Edit"
4. AI executes and reports result
5. All actions logged with AI attribution

**Example Flow:**
```
User: "Send follow-up emails to all managers whose approval is needed for pending COI disclosures"

AI: "I found 12 managers with pending approvals. Here's the proposed email:

To: [Manager Name]
Subject: Action Required: COI Disclosure Awaiting Your Approval
Body: [Preview...]

Recipients: Sarah Chen, Mike Rodriguez, ... [+10 more]

[Preview All] [Edit Template] [Confirm & Send] [Cancel]"
```

#### AA.4 Permission Model

**Decision:** AI actions respect user's existing permissions

**Rules:**
- AI cannot do anything the user couldn't do manually
- AI cannot escalate privileges
- Admin-only actions require admin role
- Bulk actions may have additional limits (e.g., max 50 emails per request)

#### AA.5 Audit Trail

**Decision:** All AI-initiated actions are logged with full attribution

**Audit Record:**
```
{
  action: "email_sent",
  actor_type: "ai",
  actor_user_id: "user_123",  // User who authorized
  ai_conversation_id: "conv_456",
  ai_prompt: "Send follow-up emails to managers...",
  affected_entities: ["user_789", "user_012", ...],
  timestamp: "2026-02-02T10:30:00Z"
}
```

#### AA.6 Guardrails

**Decision:** Certain actions ALWAYS require human confirmation

**Never Auto-Execute:**
- Delete/archive operations
- External communications (email, SMS)
- Permission changes
- Workflow modifications
- Bulk operations (>5 items)
- Financial/sensitive data export

#### AA.7 Required Spec

**Action:** Create `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-AGENT.md` to detail:
- Complete action catalog by module
- Context passing architecture
- Confirmation UX patterns
- Permission inheritance rules
- Conversation storage and resumption
- Error handling and rollback

---

### Decision Log Summary (AI Agent)

| ID | Area | Decision | Status |
|----|------|----------|--------|
| AA.1 | AI Agent | AI can execute real actions, not just answer questions | Confirmed |
| AA.2 | AI Agent | Context adapts to user's current view (program/entity/workflow) | Confirmed |
| AA.3 | AI Agent | Tiered confirmation UX based on action risk | Confirmed |
| AA.4 | AI Agent | AI respects user's existing permissions | Confirmed |
| AA.5 | AI Agent | Full audit trail with AI attribution | Confirmed |
| AA.6 | AI Agent | Guardrails prevent auto-execution of risky actions | Confirmed |
| AA.7 | AI Agent | TECH-SPEC-AI-AGENT.md needed for full specification | Pending |
| AA.8 | AI Agent | Tiered interaction model (Inline → Contextual → Drawer) | Confirmed |
| AA.9 | AI Agent | Hybrid action catalog with dynamic filtering | Confirmed |
| AA.10 | AI Agent | Preview-then-Execute pattern for multi-step actions | Confirmed |
| AA.11 | AI Agent | User-owned narratives with AI assistance modes | Confirmed |
| AA.12 | AI Agent | Claude Code-style context hierarchy and skills system | Confirmed |
| AA.13 | AI Agent | Selective persistence with pause/resume pattern | Confirmed |
| AA.14 | AI Agent | Partial success with retry + time-limited undo trail | Confirmed |
| AA.15 | AI Agent | Visible context usage with compact/clear/fresh actions | Confirmed |
| AA.16 | AI Agent | Skill lifecycle from personal to community marketplace | Confirmed |
| AA.17 | AI Agent | Scoped agents per view (Investigation, Case, Compliance Manager, etc.) | Confirmed |

#### AA.8 AI Interaction Model

**Decision:** Tiered interaction model - AI doesn't consume screen real estate until invoked

**Tier 1 - Inline (Ghost Text)**
| Aspect | Detail |
|--------|--------|
| **Trigger** | Auto-appears while typing in text fields |
| **UX** | Ghost text suggestions (smart compose style) |
| **Accept** | Tab to accept |
| **Dismiss** | Escape or keep typing |
| **Use Cases** | Note completion, email templates, standard phrases |

**Tier 2 - Contextual (Selection/Field Actions)**
| Aspect | Detail |
|--------|--------|
| **Trigger** | Text selection, right-click, ✨ icon on AI-enabled fields |
| **UX** | Floating toolbar or popover with action buttons |
| **Actions** | "Summarize", "Improve", "Translate", "Ask AI..." |
| **Special** | Screenshot drop zones for "create form from image" workflows |
| **Use Cases** | Summarize selected notes, improve draft text, create form from screenshot |

**Tier 3 - Slide-over Drawer (Extended Conversation)**
| Aspect | Detail |
|--------|--------|
| **Trigger** | Cmd+J (Mac) / Ctrl+J (Win), header AI icon, escalation from Tier 2 |
| **UX** | Right-side drawer slides in (like Claude Code terminal) |
| **Default** | Closed - opens on demand |
| **Option** | Can be pinned open by users who prefer persistent chat |
| **Use Cases** | Multi-turn conversations, complex queries, bulk action workflows |

**Escalation Flow:**
```
Tier 1 (Inline)
    │ User wants more control/options
    ▼
Tier 2 (Contextual)
    │ Task requires multi-turn conversation
    ▼
Tier 3 (Drawer)
```

**Key Principle:** AI is non-intrusive by default. Contextual assistance appears where you're working, not in a persistent panel consuming screen space.

#### AA.9 AI Action Discovery

**Decision:** Hybrid approach - Static action catalog with dynamic runtime filtering

**Action Registration Pattern:**
```typescript
// Each module registers its AI-invokable actions
const caseActions: AIAction[] = [
  {
    id: 'case.send_reminder',
    label: 'Send reminder to assignee',
    requiredPermissions: ['case.update', 'email.send'],
    requiredFeatures: ['email_integration'],
    contextRequirements: {
      entityType: 'case',
      conditions: ['status != closed', 'has_assignee']
    },
    parameters: [{ name: 'message', type: 'string', optional: true }]
  }
]
```

**Runtime Filtering Layers:**
| Layer | Filter Logic |
|-------|-------------|
| **Permission Filter** | User must have all `requiredPermissions` |
| **Feature Filter** | Organization must have all `requiredFeatures` enabled |
| **Context Filter** | Current entity must match `contextRequirements` |
| **Workflow Filter** | Custom workflows may add/remove actions dynamically |

**What AI Receives:**
```
User asks: "What can I do with this case?"
AI sees: [assign, add_note, request_investigation, send_reminder, close]
AI does NOT see: [delete, change_org_settings, bulk_export] (no permission)
```

**Benefits:**
- **Auditable:** All possible actions documented in static catalog
- **Adaptive:** Respects permissions, org config, custom workflows at runtime
- **Safe:** AI can only invoke actions in the filtered catalog
- **Extensible:** Custom workflows register custom actions

**Anti-Pattern:** AI must NEVER directly call API endpoints. All AI actions route through the action catalog with permission validation.

#### AA.10 AI Multi-Step Actions

**Decision:** Preview-then-Execute pattern - AI prepares everything invisibly, presents editable preview, user confirms once

**UX Pattern:**
```
User: "Send follow-up emails to all managers with pending COI approvals"

AI: [Does work invisibly - queries, generates, prepares]

AI Response:
┌─────────────────────────────────────────────────────────┐
│ 📧 Ready to send 12 follow-up emails                    │
│                                                         │
│ Recipients: 12 managers with pending approvals          │
│ [View List] [Edit Recipients]                           │
│                                                         │
│ Template Preview:                                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Subject: Action Required: Pending COI Approval      │ │
│ │                                                     │ │
│ │ Hi {manager_name},                                  │ │
│ │ You have {count} pending COI disclosures awaiting...│ │
│ └─────────────────────────────────────────────────────┘ │
│ [Edit Template]                                         │
│                                                         │
│ ⚠️ This will send 12 emails immediately                 │
│                                                         │
│ [Cancel]                     [Send All]                 │
└─────────────────────────────────────────────────────────┘
```

**Key Principles:**
| Principle | Implementation |
|-----------|----------------|
| **Prep Invisibly** | User doesn't see "Step 1 of 5" wizard |
| **Smart Defaults** | AI makes reasonable choices (user can adjust) |
| **Everything Editable** | Recipients, template, timing all changeable from preview |
| **Single Confirmation** | One "Send All" button, not confirm-confirm-confirm |
| **Clear Consequences** | "This will send 12 emails" shown explicitly |

**Escalation to Conversation:**
If AI cannot make a confident choice, it asks ONE clarifying question before preparing preview:
```
AI: "Should I include managers on leave, or only active managers?
     (3 are currently on leave)"
User: "Only active"
AI: [Prepares preview with 9 recipients]
```

**Anti-Patterns:**
- ❌ Wizard fatigue: "Step 1 of 6: Select recipients..."
- ❌ Surprise actions: Sending without preview
- ❌ Over-asking: "Are you sure?" at every step

#### AA.11 AI Summary & Narrative Ownership

**Decision:** Every Case and Investigation has an owned narrative that persists and evolves. User controls it; AI assists.

**Ownership Model:**
```typescript
interface EntityNarrative {
  // The "owned" summary - persists on the entity
  summary: string;              // 2-3 paragraph executive summary
  summaryLastEditedBy: 'user' | 'ai';
  summaryLastEditedAt: DateTime;

  // Optional detailed write-up
  detailedWriteup?: string;     // Full chronological narrative
  writeupLastEditedBy: 'user' | 'ai';

  // AI can always regenerate from raw data
  // but user edits are preserved until explicitly replaced
}
```

**Three AI Assistance Modes:**
| Mode | User Action | AI Behavior |
|------|-------------|-------------|
| **Generate** | "Write me a summary" | AI creates full summary from entity data, user edits before accepting |
| **Suggest** | "What should I add?" | AI proposes additions based on recent activity, user cherry-picks |
| **Augment** | "Update with latest findings" | AI drafts additions, user reviews diff before merging |

**Edit-Before-Accept Pattern (Always):**
```
┌─────────────────────────────────────────────────────────┐
│ AI has drafted a summary update                         │
│                                                         │
│ Current Summary:                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ On Jan 15, employee reported witnessing...          │ │
│ │ Investigation assigned to Sarah Chen on Jan 16...   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Suggested Addition:                      [Edit ✏️]      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ On Jan 20, interview with department manager        │ │
│ │ revealed that similar incidents occurred in Q3...   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [Discard]    [Replace Full Summary]    [Append to End] │
└─────────────────────────────────────────────────────────┘
```

**Conversation Accumulation Mental Model:**
Each workflow step adds to a conversation record that AI can read:
```
Case #1234 Conversation Timeline:
─────────────────────────────────
[RIU Created] "Employee called hotline reporting HIPAA concern..."
     ↓
[Triage Note] "Categorized as Privacy violation, assigned to..."
     ↓
[Investigation Started] "Investigation opened, template: HIPAA Breach"
     ↓
[Interview Logged] "Spoke with department manager who confirmed..."
     ↓
[Finding Added] "Root cause: Inadequate access controls on..."
     ↓
[AI Summary Request] → AI reads full conversation → drafts summary
     ↓
[User Edits] "Added context about prior training completion"
     ↓
[Summary Saved] → Owned narrative updated
```

**AI Context Access:**
- AI always has access to full conversation timeline (raw data)
- AI can materialize this into narrative form on demand
- User's owned summary is separate from raw data - it's their curated view
- Regenerating summary doesn't delete user edits unless explicitly chosen

**Key Principle:** The owned narrative is the user's artifact. AI helps create and update it, but user always has final edit authority.

#### AA.12 AI Architecture: Context, Skills, and Actions

**Decision:** Platform AI follows Claude Code patterns - hierarchical context loading, native skills system, and action capabilities.

**1. Context Hierarchy (like CLAUDE.md)**

Context loads in order, later overrides earlier:
```
Context Loading Order:
─────────────────────────────────────────────────────────
1. Platform Context     → Built-in platform knowledge, entity schemas, action catalog
2. Organization Context → Org-level CONTEXT.md (terminology, policies, standards)
3. Team Context         → Team-level CONTEXT.md (team workflows, preferences)
4. User Context         → User-level CONTEXT.md (personal style, shortcuts)
5. Entity Context       → Current case/investigation data + conversation history
```

**Organization Context Example:**
```markdown
# Acme Corp AI Context

## Terminology
- "Associate" not "Employee"
- "Incident" not "Case" in external communications
- HIPAA cases always require Legal review before closing

## Writing Standards
- Summaries: 3 paragraphs max, executive-friendly
- Use active voice
- Never include SSNs or full names in AI-generated summaries

## Escalation Rules
- Any case mentioning "retaliation" → auto-flag for Legal
- Cases involving VP+ → CCO notification required
```

**Team Context Example:**
```markdown
# HIPAA Investigation Team Context

## Our Workflow
- Always check prior training records before interview
- Standard interview questions in /templates/hipaa-interview.md
- Final reports require peer review

## Preferred Tools
- Use /summarize-hipaa for breach summaries (includes required fields)
```

**2. AI Action Capabilities**

AI executes actions via Action Catalog, not just generates text:
```
User: "Mark this case as under investigation and assign to Sarah"

AI: [Executes via Action Catalog]
┌─────────────────────────────────────────────────────────┐
│ ✓ Done. I've made these changes to Case #1234:         │
│                                                         │
│   • Status: Open → Under Investigation                  │
│   • Assignee: Unassigned → Sarah Chen                   │
│   • Activity logged: "AI assigned case per user request"│
│                                                         │
│   [View Case #1234](/cases/1234)                        │
└─────────────────────────────────────────────────────────┘
```

**Deep Linking Pattern:**
```typescript
// AI responses include entity references that render as clickable links
interface AIEntityReference {
  entityType: 'case' | 'investigation' | 'riu' | 'policy' | 'user';
  entityId: string;
  displayText: string;  // "Case #1234" or "Sarah Chen"
}
```

**3. Native Skills System**

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
├── /close-investigation - Org's closure checklist
└── /weekly-report - Generate weekly case summary

Team Skills (team-defined)
├── /peer-review - Request peer review with checklist
└── /interview-prep - Generate interview questions for case type

User Skills (personal shortcuts)
├── /my-summary-style - Apply my preferred summary format
└── /quick-close - My standard closure notes
```

**Skill Definition Schema:**
```typescript
interface Skill {
  id: string;                    // 'summarize-hipaa'
  name: string;                  // 'HIPAA Summary'
  scope: 'platform' | 'organization' | 'team' | 'user';
  description: string;           // Shown in skill picker

  // What the skill does
  promptTemplate: string;        // AI instructions with {{variables}}
  requiredContext: string[];     // ['case', 'investigation']

  // Permissions
  requiredPermissions: string[];
  requiredFeatures: string[];

  // Parameters user can provide
  parameters?: SkillParameter[];

  // Actions the skill can take
  allowedActions: string[];      // From Action Catalog
}
```

**Skill Invocation Example:**
```
User: /summarize-hipaa

AI: [Loads skill, applies org context, generates]
┌─────────────────────────────────────────────────────────┐
│ HIPAA Breach Summary - Case #1234                       │
│                                                         │
│ **Breach Type:** Unauthorized Access                    │
│ **PHI Involved:** Yes - 3 patient records               │
│ **Discovery Date:** January 15, 2026                    │
│ **Notification Deadline:** March 15, 2026 (60 days)     │
│                                                         │
│ **Summary:**                                            │
│ An employee accessed patient records outside their      │
│ authorized scope...                                     │
│                                                         │
│ [Edit] [Add to Case Summary] [Export as PDF]            │
└─────────────────────────────────────────────────────────┘
```

**4. Skills Library Architecture**
```
┌─────────────────────────────────────────────────────────┐
│                    Skills Registry                       │
├─────────────────────────────────────────────────────────┤
│ Platform Skills (code-deployed, version-controlled)     │
│ └── Maintained by Ethico, available to all              │
├─────────────────────────────────────────────────────────┤
│ Org Skill Library (admin-configured)                    │
│ ├── Custom skills created by org admins                 │
│ ├── Can reference platform skills                       │
│ └── Org Context automatically injected                  │
├─────────────────────────────────────────────────────────┤
│ Team Skills (team lead-configured)                      │
│ └── Team-specific workflows and shortcuts               │
├─────────────────────────────────────────────────────────┤
│ User Skills (personal)                                  │
│ └── Personal shortcuts and preferences                  │
└─────────────────────────────────────────────────────────┘
```

**5. Context + Skills + Actions Integration**
```
User opens Case #1234, types: "close this with standard findings"

AI Processing:
1. Load Context: Platform → Org → Team → User → Case #1234
2. Interpret Intent: "close" + "standard findings" → /close-investigation skill
3. Load Skill: Org's close-investigation skill definition
4. Check Permissions: User has case.close permission? ✓
5. Execute Skill: Generate closure summary using org template
6. Prepare Actions: [update_status, add_summary, log_activity]
7. Preview: Show user what will happen
8. On Confirm: Execute actions via Action Catalog
```

**Key Architecture Decisions:**
| Decision | Choice |
|----------|--------|
| Context storage | Per-scope files (org, team, user) - editable via settings UI |
| Skills storage | Data in DB, not code - admins can create without deploys |
| Action routing | All skill actions go through Action Catalog - permission-checked |
| Entity context | AI always has entity context when in drawer - no re-explaining needed |

#### AA.13 AI Conversation Persistence: Pause/Resume Pattern

**Decision:** Selective Persistence - Chat transcripts are ephemeral. What persists is structured context: decisions, session notes, drafts, and entity data.

**Persistence Layers:**
| Layer | Persists | Example |
|-------|----------|---------|
| Entity data | Always | Status changes, assignments, findings |
| Owned narrative | Always | User's curated summary |
| Activity log | Always | All actions taken |
| Session notes | When saved | "Waiting for Legal before closing" |
| Drafts | Until accepted/discarded | In-progress summary |
| Raw chat | Never | The actual back-and-forth |

**The Pause Pattern:**
When user leaves mid-work (closes drawer, navigates away, or explicitly `/pause`):
```
AI detects unsaved work or important decisions

AI:
┌─────────────────────────────────────────────────────────┐
│ 📌 Save session context before leaving?                 │
│                                                         │
│ **Decisions:**                                          │
│ • Waiting for Legal review before closing               │
│                                                         │
│ **Draft in progress:**                                  │
│ • Investigation summary (not yet saved)                 │
│   [Preview draft]                                       │
│                                                         │
│ **Next steps identified:**                              │
│ • Follow up after Legal responds                        │
│                                                         │
│ [Save Context]  [Save Draft Only]  [Discard]            │
└─────────────────────────────────────────────────────────┘
```

**Session Note Schema:**
```typescript
interface SessionNote {
  id: string;
  entityType: 'case' | 'investigation';
  entityId: string;
  createdAt: DateTime;
  createdBy: string;

  // Structured content (not raw transcript)
  decisions: string[];           // Key decisions made
  pendingActions: string[];      // What's waiting
  draftContent?: string;         // Any unsaved draft
  contextSummary: string;        // AI-generated summary of session

  // Lifecycle
  status: 'active' | 'resolved' | 'archived';
  resolvedAt?: DateTime;         // When pending items completed
}
```

**The Resume Pattern:**
When user returns to entity and opens AI drawer:
```
AI loads: Entity data + Owned narrative + Active session notes + Recent activity

AI:
┌─────────────────────────────────────────────────────────┐
│ 👋 Welcome back to Case #1234                           │
│                                                         │
│ **From your last session (2 days ago):**                │
│ • Waiting for Legal review                              │
│ • Draft summary saved                                   │
│                                                         │
│ **Since then:**                                         │
│ • ✓ Legal review completed - Approved to close          │
│ • 2 new comments added                                  │
│                                                         │
│ Ready to finalize that summary?                         │
│                                                         │
│ [Continue draft]  [Show what changed]  [Start fresh]    │
└─────────────────────────────────────────────────────────┘
```

**Auto-Resolution of Session Notes:**
When pending items complete, session notes auto-resolve:
```
Session note: "Waiting for Legal review"
     ↓
Legal adds approval comment
     ↓
System detects: Legal review completed
     ↓
Session note status: active → resolved
     ↓
Next session: AI mentions "Legal review you were waiting for is complete"
```

**Pinning Mid-Conversation:**
User can explicitly pin important context without pausing:
```
User: "Remember that the reporter mentioned they have documentation at home"

AI: "Got it. Want me to add this as a case note so it's captured?"
    [Add as Case Note]  [Just for this session]

If "Add as Case Note":
→ Adds to entity: "Reporter has additional documentation at home (not yet collected)"
→ Visible in case timeline
→ AI will reference in future sessions
```

**What This Enables:**
- No repeat context - "I already told you" never happens
- No stale transcripts - Structured notes stay relevant
- Smart resume - AI knows what changed since you left
- Clean entity timeline - Decisions captured, not chat noise
- Draft safety - Work-in-progress survives session boundaries

**Anti-Patterns Avoided:**
- ❌ Storing months of chat transcripts
- ❌ AI referencing outdated conversation context
- ❌ User manually re-explaining every session
- ❌ Lost work when browser closes

#### AA.14 AI Error Handling & Undo

**Decision:** Partial success with retry offer for failures; time-limited undo trail for reversible actions.

**Scenario 1: Partial Failure**
Successful actions preserved, failed actions reported with retry option:
```
AI: "Done: Case assigned to Sarah ✓
     ⚠️ Failed: Email notification (server timeout)

     [Retry Notification]  [Skip]  [Undo Assignment]"
```

**Scenario 2: Wrong Action / Wrong Entity**
Undo trail with time limit and reversibility classification.

**Action Classification:**
```typescript
interface AIAction {
  id: string;
  // ... other fields

  reversibility: 'full' | 'soft' | 'none';
  // full: Can undo completely (status change, assignment)
  // soft: Can restore within grace period (delete → trash)
  // none: Cannot undo (send email, external API call)

  undoAction?: string;  // Action ID to reverse this
  undoWindowMinutes?: number;  // How long undo available (default: 5)
}
```

**Reversibility by Action Type:**
| Action Type | Reversibility | Example |
|-------------|---------------|---------|
| Status change | Full | Open → Closed → Open |
| Assignment | Full | Assign → Reassign |
| Add note/summary | Full | Add → Remove |
| Send notification | None | Can't unsend email |
| External integration | None | Sent to Legal system |
| Delete | Soft | Trash → Restore (30 days) |

**Undo UX Pattern:**
After every action, show result with undo option:
```
┌─────────────────────────────────────────────────────────┐
│ ✓ Done                                                  │
│                                                         │
│ Changes to Case #1234:                                  │
│   • Status: Open → Closed                               │
│   • Outcome: Substantiated                              │
│   • Closed by: You (via AI)                             │
│                                                         │
│ [Undo] ← available for 5 min     [View Case #1234]      │
└─────────────────────────────────────────────────────────┘
```

**Multi-Action Undo:**
```
User: "Assign to Sarah, set priority high, add note about deadline"

AI executes 3 actions, shows:
┌─────────────────────────────────────────────────────────┐
│ ✓ 3 changes made to Case #1234                          │
│                                                         │
│   • Assigned to Sarah Chen                              │
│   • Priority: Normal → High                             │
│   • Note added: "Deadline: Feb 10 per client request"   │
│                                                         │
│ [Undo All]  [Undo specific...]  [View Case]             │
└─────────────────────────────────────────────────────────┘

If [Undo specific...]:
┌─────────────────────────────────────────────────────────┐
│ Select changes to undo:                                 │
│                                                         │
│ ☐ Assigned to Sarah Chen                                │
│ ☐ Priority: Normal → High                               │
│ ☐ Note added: "Deadline: Feb 10..."                     │
│                                                         │
│ [Undo Selected]  [Cancel]                               │
└─────────────────────────────────────────────────────────┘
```

**Irreversible Action Warning:**
Before executing irreversible actions, require explicit confirmation:
```
User: "Close this and notify the reporter"

AI:
┌─────────────────────────────────────────────────────────┐
│ ⚠️ This includes actions that cannot be undone          │
│                                                         │
│ Reversible:                                             │
│   • Close Case #1234                                    │
│                                                         │
│ ⚠️ NOT reversible:                                       │
│   • Send closure notification to reporter               │
│     (email cannot be unsent)                            │
│                                                         │
│ [Confirm All]  [Close Only]  [Cancel]                   │
└─────────────────────────────────────────────────────────┘
```

**Undo Record Schema:**
```typescript
interface UndoRecord {
  id: string;
  actionId: string;
  entityType: string;
  entityId: string;

  // What changed
  previousState: Record<string, any>;  // Snapshot of changed fields
  newState: Record<string, any>;

  // Timing
  executedAt: DateTime;
  undoExpiresAt: DateTime;  // executedAt + undoWindowMinutes

  // Status
  status: 'available' | 'executed' | 'expired';
  undoneAt?: DateTime;

  userId: string;
  organizationId: string;
}
```

**Activity Log Shows Full Trail:**
```
Case #1234 Activity:
─────────────────────
[Feb 2, 2:30 PM] Status changed: Open → Closed (by AI, user: John)
[Feb 2, 2:31 PM] Status changed: Closed → Open (Undo by AI, user: John)
                 Reason: User initiated undo
```

**Prevention: Entity Confirmation in Preview**
For significant actions, preview shows entity clearly:
```
┌─────────────────────────────────────────────────────────┐
│ About to close:                                         │
│                                                         │
│ Case #1234                                              │
│ "ABC Corp - Harassment Allegation"                      │
│ Created: Jan 15, 2026 | Assignee: Sarah Chen            │
│                                                         │
│ Is this the right case?                                 │
│                                                         │
│ [Yes, Close It]  [No, Wrong Case]                       │
└─────────────────────────────────────────────────────────┘
```

**Key Principles:**
- Always show what changed (diff view)
- Undo available for reversible actions (5 min default)
- Irreversible actions require explicit confirmation with warning
- Activity log records all actions AND undos
- Preview confirms entity identity before action

---

#### AA.15 AI Context Window Management

**Decision:** Like Claude Code, users see and control their context consumption.

**Context Visibility UI:**
```
┌─────────────────────────────────────────────────────────┐
│ AI Chat                                    [≡] [⟳] [×]  │
├─────────────────────────────────────────────────────────┤
│ Context: ████████░░░░░░░░ 52% used                      │
│ [View breakdown ▼]                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ (conversation content)                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Expanded Breakdown:**
```
┌─────────────────────────────────────────────────────────┐
│ Context Breakdown                              52%      │
│─────────────────────────────────────────────────────────│
│ Entity data (Case #1234)           ████░░░░    18%      │
│ Activity timeline (47 events)      ███░░░░░    12%      │
│ Context files (org + user)         ██░░░░░░     8%      │
│ Session notes (2 active)           █░░░░░░░     4%      │
│ Current conversation               ███░░░░░    10%      │
│─────────────────────────────────────────────────────────│
│ Available                          ████████    48%      │
│                                                         │
│ [Compact Conversation]  [Clear Chat]  [Start Fresh]     │
└─────────────────────────────────────────────────────────┘
```

**Context Actions:**
| Action | What It Does |
|--------|--------------|
| **Compact** | AI summarizes conversation so far, replaces raw history with summary. Preserves meaning, reduces tokens. |
| **Clear Chat** | Clears conversation history, keeps entity context + context files. Like starting new chat on same case. |
| **Start Fresh** | Clears everything except base entity data. Reloads context files fresh. |

**Compact Flow:**
```
User clicks [Compact Conversation]

AI:
┌─────────────────────────────────────────────────────────┐
│ Compacting conversation...                              │
│                                                         │
│ Summary of conversation so far:                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ User asked about case status and next steps.        │ │
│ │ Discussed waiting for Legal review. Drafted         │ │
│ │ partial summary (saved). Identified 3 pending       │ │
│ │ interviews to schedule.                             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ This will reduce context from 52% → ~35%                │
│                                                         │
│ [Compact]  [Cancel]                                     │
└─────────────────────────────────────────────────────────┘
```

**Key Principle:** Users should never be surprised by context limits. Visibility enables informed decisions about when to compact or start fresh.

---

#### AA.16 AI Skills: Creation & Community Marketplace

**Decision:** Skills progress from personal use to community sharing, with marketplace features for discovery and quality signals.

**Skill Lifecycle:**
```
┌─────────────────────────────────────────────────────────┐
│ SKILL LIFECYCLE                                         │
│                                                         │
│  [Create] → [Test] → [Use] → [Share] → [Publish]        │
│     │         │        │        │          │            │
│     ▼         ▼        ▼        ▼          ▼            │
│  Personal   Draft    Active   Team/Org  Community       │
│   Skill    Version   Skill    Shared    Marketplace     │
└─────────────────────────────────────────────────────────┘
```

**Extended Skill Schema (for sharing):**
```typescript
interface Skill {
  id: string;
  name: string;
  description: string;

  // Ownership & Scope
  createdBy: string;
  scope: 'personal' | 'team' | 'organization' | 'community';
  visibility: 'private' | 'shared' | 'published';

  // The actual skill
  promptTemplate: string;
  requiredContext: string[];
  allowedActions: string[];
  parameters: SkillParameter[];

  // Versioning
  version: string;              // semver
  changelog: string;
  previousVersions: string[];

  // Community metadata (when published)
  publishedAt?: DateTime;
  category: string;             // 'investigations', 'reporting', 'hipaa', etc.
  tags: string[];

  // Ratings & usage
  installCount?: number;
  rating?: number;              // 1-5 stars
  reviewCount?: number;

  // Compatibility
  minPlatformVersion: string;
  requiredFeatures: string[];
}
```

**Skill Builder UI:**
```
┌─────────────────────────────────────────────────────────┐
│ Create New Skill                                        │
├─────────────────────────────────────────────────────────┤
│ Name: ___HIPAA Breach Summary_______________            │
│                                                         │
│ Description:                                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Generates a HIPAA-compliant breach summary with     │ │
│ │ all required fields for HHS notification.           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ When to use: [Case] [Investigation] ☑️                  │
│ Category: [Healthcare / HIPAA ▼]                        │
│                                                         │
│ Prompt Template:                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Generate a HIPAA breach summary for this case.      │ │
│ │ Include:                                            │ │
│ │ - Breach type and description                       │ │
│ │ - PHI types involved                                │ │
│ │ - Number of individuals affected                    │ │
│ │ - Discovery date and notification deadline          │ │
│ │ - Root cause analysis                               │ │
│ │ {{#if org.hipaa_additional_fields}}                 │ │
│ │ Also include: {{org.hipaa_additional_fields}}       │ │
│ │ {{/if}}                                             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Actions this skill can take:                            │
│ ☑️ Read case data    ☑️ Generate text                   │
│ ☐ Update fields      ☐ Send notifications              │
│                                                         │
│ [Test Skill]  [Save as Draft]  [Save & Activate]        │
└─────────────────────────────────────────────────────────┘
```

**Skill Marketplace:**
```
┌─────────────────────────────────────────────────────────┐
│ Skill Marketplace                      [My Skills]      │
├─────────────────────────────────────────────────────────┤
│ 🔍 Search skills...                [Filter ▼]           │
│                                                         │
│ Categories: [All] [Investigations] [HIPAA] [SOX]        │
│             [Reporting] [Interviews] [Closures]         │
├─────────────────────────────────────────────────────────┤
│ ⭐ Featured                                              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📋 HIPAA Breach Summary Pro          ⭐ 4.8 (127)    │ │
│ │ Complete HHS-ready breach documentation             │ │
│ │ By: ComplianceExpert42 | 1.2k installs              │ │
│ │ [Preview]  [Install]                                │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔍 Investigation Interview Prep      ⭐ 4.6 (89)     │ │
│ │ Generates tailored interview questions by case type │ │
│ │ By: InvestigatorPro | 890 installs                  │ │
│ │ [Preview]  [Install]                                │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**User Skill Profile & Progression:**
```typescript
interface UserSkillProfile {
  userId: string;

  // Usage stats
  skillsCreated: number;
  skillsPublished: number;
  totalSkillUses: number;

  // Recognition
  badges: Badge[];              // 'Skill Creator', 'Top Contributor', etc.
  reputation: number;

  // Published skill stats
  totalInstalls: number;
  averageRating: number;

  // Progression
  level: 'Novice' | 'Practitioner' | 'Expert' | 'Master';
  experiencePoints: number;
}

interface Badge {
  id: string;
  name: string;                 // 'First Skill Published'
  description: string;
  earnedAt: DateTime;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}
```

**Skill Profile UI:**
```
┌─────────────────────────────────────────────────────────┐
│ Your AI Skill Profile                                   │
├─────────────────────────────────────────────────────────┤
│ Level: Expert                    XP: 2,450 / 5,000      │
│ ████████████████░░░░░░░░                                │
│                                                         │
│ 🏆 Badges                                               │
│ [🌟 First Skill] [📤 Publisher] [⭐ 5-Star Creator]     │
│ [🔥 Trending] [💯 100 Installs]                         │
│                                                         │
│ 📊 Your Stats                                           │
│ • Skills created: 12                                    │
│ • Skills published: 4                                   │
│ • Total installs: 347                                   │
│ • Average rating: 4.6 ⭐                                 │
│                                                         │
│ 🎯 Next Badge: "Community Champion" (500 installs)      │
│    Progress: 347/500 ████████████████░░░                │
└─────────────────────────────────────────────────────────┘
```

**Community Features:**
- **Skill Challenges:** "Create the best SOX audit skill this month"
- **Leaderboards:** Top skill creators, most helpful skills
- **Skill Forking:** "Based on HIPAA Summary Pro by @ComplianceExpert42"
- **Collaboration:** Co-author skills with team members
- **Certification Paths:** "Ethico Certified Skill Developer"

**Key Principles:**
- Low barrier to create (personal skills = just save a prompt)
- Progressive sharing (personal → team → org → community)
- Quality signals (ratings, reviews, install counts)
- Recognition & progression (badges, levels, leaderboards)
- Safe marketplace (skills reviewed before community publish)

---

#### AA.17 AI Agent Architecture: Scoped Agents by View

**Decision:** Instead of one AI that dynamically adjusts scope, use specialized agents for different views. Each agent has its own context scope, default behaviors, and available skills.

**Agent Types:**
| Agent | Scope | Loads | Best For |
|-------|-------|-------|----------|
| Investigation Agent | Single investigation | Investigation details, interviews, findings, evidence | Deep work on one investigation |
| Case Agent | Case + linked entities | Case data, all RIUs, all investigations (summarized), timeline, communications | Case management, seeing full picture |
| RIU Agent | Single RIU | RIU details, linked case (if any), reporter communications | Intake review, QA work |
| Compliance Manager | Program-wide | Recent activity, assigned items, trends, cross-entity patterns | Dashboard, oversight, reporting |
| Policy Agent | Policy lifecycle | Policy content, versions, approval workflow, attestation status | Policy work |

**Context Loading by Agent:**

Investigation Agent (viewing Investigation #456):
```
┌─────────────────────────────────────────────────────────┐
│ Context Breakdown                              48%      │
│─────────────────────────────────────────────────────────│
│ Investigation #456 details         ██████░░    25%      │
│ ├─ Interviews (3)                                       │
│ ├─ Findings draft                                       │
│ ├─ Evidence/documents                                   │
│ └─ Activity timeline                                    │
│ Parent Case #123 (summary only)    ██░░░░░░     8%      │
│ Context files (org + user)         ██░░░░░░     8%      │
│ Session notes                      █░░░░░░░     3%      │
│ Conversation                       █░░░░░░░     4%      │
│─────────────────────────────────────────────────────────│
│ Available                          █████████   52%      │
└─────────────────────────────────────────────────────────┘
```

Case Agent (viewing Case #123):
```
┌─────────────────────────────────────────────────────────┐
│ Context Breakdown                              62%      │
│─────────────────────────────────────────────────────────│
│ Case #123 details                  █████░░░    20%      │
│ Linked RIUs (2)                    ███░░░░░    12%      │
│ Investigations (3, summarized)     ████░░░░    15%      │
│ Activity timeline                  ██░░░░░░     7%      │
│ Context files (org + user)         ██░░░░░░     8%      │
│─────────────────────────────────────────────────────────│
│ Available                          ███████░    38%      │
└─────────────────────────────────────────────────────────┘
```

Compliance Manager (dashboard view):
```
┌─────────────────────────────────────────────────────────┐
│ Context Breakdown                              35%      │
│─────────────────────────────────────────────────────────│
│ Your assigned items (12)           ████░░░░    15%      │
│ Recent activity (org-wide)         ██░░░░░░     6%      │
│ Dashboard state/filters            █░░░░░░░     2%      │
│ Context files (org + user)         ██░░░░░░     8%      │
│ Conversation                       █░░░░░░░     4%      │
│─────────────────────────────────────────────────────────│
│ Available for queries              █████████   65%      │
│ (more headroom for cross-entity searches)               │
└─────────────────────────────────────────────────────────┘
```

**Agent Type Schema:**
```typescript
interface AgentType {
  id: string;
  name: string;
  scope: 'entity' | 'program';

  // What it loads automatically
  contextLoading: {
    primaryEntity: boolean;
    linkedEntities: 'full' | 'summary' | 'none';
    activityDepth: number;
    programData?: {
      assignedItems: boolean;
      recentActivity: boolean;
      trends: boolean;
    };
  };

  // Behavioral defaults
  persona: {
    description: string;
    defaultTone: string;       // "analytical", "supportive", "executive"
    thinkingStyle: string;
  };

  // Skill availability
  availableSkillCategories: string[];
  defaultSkills: string[];
}
```

**Agent Definitions:**
```typescript
const investigationAgent: AgentType = {
  id: 'investigation',
  name: 'Investigation Assistant',
  scope: 'entity',
  contextLoading: {
    primaryEntity: true,
    linkedEntities: 'summary',
    activityDepth: 100,
  },
  persona: {
    description: "I help you conduct thorough investigations with proper documentation.",
    defaultTone: 'analytical',
    thinkingStyle: 'Focuses on evidence, interviews, findings, and defensible conclusions',
  },
  availableSkillCategories: ['investigation', 'interviews', 'documentation'],
  defaultSkills: ['/interview-prep', '/summarize-findings', '/evidence-checklist'],
};

const complianceManagerAgent: AgentType = {
  id: 'compliance-manager',
  name: 'Compliance Manager',
  scope: 'program',
  contextLoading: {
    primaryEntity: false,
    linkedEntities: 'none',
    activityDepth: 20,
    programData: {
      assignedItems: true,
      recentActivity: true,
      trends: true,
    },
  },
  persona: {
    description: "I help you oversee your compliance program and spot patterns.",
    defaultTone: 'executive',
    thinkingStyle: 'Focuses on trends, risks, overdue items, and strategic insights',
  },
  availableSkillCategories: ['reporting', 'analytics', 'oversight'],
  defaultSkills: ['/weekly-summary', '/overdue-items', '/trend-analysis'],
};
```

**Agent Switching UX:**
Agents load automatically based on view. User sees which agent they're talking to:
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Investigation Assistant          [Context: 48%]     │
│ Investigation #456                                      │
├─────────────────────────────────────────────────────────┤
│ User: "What questions should I ask the department head?"│
│                                                         │
│ AI: Based on the evidence collected and witness         │
│ statements so far, here are targeted questions...       │
│                                                         │
│ [/interview-prep] [/evidence-checklist] [+ Skills]      │
└─────────────────────────────────────────────────────────┘
```

When user navigates to dashboard:
```
┌─────────────────────────────────────────────────────────┐
│ 📊 Compliance Manager               [Context: 35%]      │
│ Program Overview                                        │
├─────────────────────────────────────────────────────────┤
│ AI: Good morning! You have 12 items assigned to you,    │
│ 3 are overdue. I also noticed a spike in harassment     │
│ reports this month (up 40% from last month). Want me    │
│ to dig into that trend?                                 │
│                                                         │
│ [/overdue-items] [/weekly-summary] [/trends] [+ Skills] │
└─────────────────────────────────────────────────────────┘
```

**Cross-Agent Handoff:**
When Compliance Manager surfaces an entity, user can "zoom in":
```
User (to Compliance Manager): "Show me the overdue cases"

AI: You have 3 overdue cases:

    1. Case #789 - "Manufacturing Safety Concern"
       Due: Jan 28 (5 days overdue)
       [Open Case →]
    ...

User clicks [Open Case →]

→ Navigates to Case #789
→ Case Manager agent loads
→ Context shifts to Case #789 data
→ AI: "I've loaded Case #789. This case is 5 days overdue.
   The investigation is waiting on an interview. Want me
   to help draft a follow-up?"
```

**Shared Across All Agents:**
- User context file (personal preferences, style)
- Org context file (terminology, standards)
- Team context file (workflows)
- Session notes (when navigating between entities)

**Agent-Specific:**
- Context loading rules
- Default skills shown
- Persona and tone
- Thinking patterns

**Benefits:**
- **Right context, right scope** - No wasted tokens on irrelevant data
- **Specialized expertise** - Each agent is "expert" in its domain
- **Clear user mental model** - "I'm talking to the Investigation Assistant"
- **Smooth handoffs** - Agents know how to summarize for each other
- **Skill targeting** - Investigation skills for investigations, not dashboards

---

*End of Working Decisions Document*
