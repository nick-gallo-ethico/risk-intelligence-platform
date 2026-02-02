# Ethico Risk Intelligence Platform
## PRD-003: Employee Portal & Ethics Portal

**Document ID:** PRD-003
**Version:** 2.0 (RIU - Risk Intelligence Unit Architecture)
**Priority:** P0 - Critical (Core Module)
**Development Phase:** Phase 1 (Core) Weeks 5-8, Extended through Phase 3
**Last Updated:** February 2026

> **Architecture Reference:** This PRD implements the RIU→Case architecture defined in `00-PLATFORM/01-PLATFORM-VISION.md v3.2`. The Employee Portal creates **Risk Intelligence Units (RIUs)** - immutable inputs. Cases are mutable work containers created by the system when business rules require one. Employees see "My Reports" (their submitted RIUs), which may or may not have linked Cases.

---

## 1. Executive Summary

The Employee Portal is the self-service interface for employees, managers, and anonymous reporters to interact with the Ethico Risk Intelligence Platform. It works in conjunction with the public-facing Ethics Portal to provide a complete employee experience for compliance activities.

**This module creates Risk Intelligence Units (RIUs):**
- `web_form_submission` - Employee/anonymous speak-up reports
- `proxy_report` - Manager submits on behalf of employee
- `disclosure_response` - Campaign disclosure completions (via Disclosures PRD-006)
- `attestation_response` - Policy attestations (via Policy PRD-009)
- `chatbot_transcript` - AI chatbot conversations that result in intake

**RIU→Case Flow:**
- RIUs are **immutable inputs** created when employees submit reports
- The system creates **Cases** (mutable work containers) based on business rules
- Employees see "My Reports" showing their RIUs with status derived from linked Case (if any)

### Two-Portal Architecture

| Portal | Access | Purpose |
|--------|--------|---------|
| **Ethics Portal** (Public) | No login required | Landing page, anonymous reporting, crisis resources, access code status checks |
| **Employee Portal** (Authenticated) | SSO / Email link / Access code | Full self-service: reports (RIUs), disclosures, policies, messaging, manager dashboard |

### Module Scope

| In Scope | Out of Scope (Other PRDs) |
|----------|---------------------------|
| Ethics Portal (public landing page) | Case investigation workflow (PRD-005) |
| Employee Portal (authenticated) | Disclosure review workflow (PRD-006) |
| Anonymous reporter experience | Policy creation/management (PRD-009) |
| **RIU creation** (web_form_submission, proxy_report, chatbot_transcript) | HRIS integration core (see `01-SHARED-INFRASTRUCTURE/TECH-SPEC-HRIS-INTEGRATION.md`) |
| Two-way messaging (employee side) | Operator Console (PRD-002) |
| **My Reports view** (employee's submitted RIUs) | |
| Disclosure campaign completion (creates disclosure_response RIUs) | |
| Policy viewing & attestation (creates attestation_response RIUs) | |
| Manager team dashboard | |
| Policy Q&A chatbot (MVP) | |
| Program transparency stats | |
| PWA mobile experience | |

---

## 2. User Personas & Access Patterns

### 2.1 User Personas

| Persona | Authentication | Primary Activities |
|---------|----------------|-------------------|
| **Employee (SSO)** | Corporate SSO (SAML/OIDC) | Submit reports, complete disclosures, attest to policies, message investigators |
| **Employee (Magic Link)** | Email magic link | Same as SSO - for contractors/distributed workforce without SSO |
| **Anonymous Reporter** | Access code | Check case status, submit follow-ups, exchange messages |
| **Manager** | SSO | All employee activities + team compliance dashboard + proxy submission |
| **Contractor** | Email magic link | Limited: relevant disclosures and policies only |

### 2.2 Access Patterns

```
ETHICS PORTAL (PUBLIC)
│
├── [No Login] View company ethics message
├── [No Login] Access "Need Immediate Help?" crisis resources
├── [No Login] Submit anonymous speak-up report → Creates RIU (web_form_submission)
├── [Access Code] Check report status (RIU status OR linked Case status)
├── [Access Code] Submit follow-up to existing report
├── [Access Code] Exchange messages with investigators
│
└── [Login Button] → Redirect to Employee Portal
                     ↓
EMPLOYEE PORTAL (AUTHENTICATED)
│
├── My Reports (RIUs submitted by this user)
│   ├── View submitted RIUs with status
│   │   └── Status from: linked Case (if exists) OR RIU status (if no Case)
│   ├── Submit new speak-up report → Creates RIU (web_form_submission)
│   ├── Submit follow-ups
│   └── Exchange messages with investigators
│
├── My Disclosures
│   ├── Complete outstanding campaigns → Creates RIU (disclosure_response)
│   ├── Submit ad-hoc disclosures → Creates RIU (disclosure_response)
│   ├── View disclosure history
│   └── Complete conditions
│
├── Policies
│   ├── Browse policy library
│   ├── Complete attestations → Creates RIU (attestation_response)
│   ├── View attestation history
│   └── Ask policy questions (AI chatbot) → May create RIU (chatbot_transcript)
│
├── Notifications
│   └── View notification inbox
│
└── [Manager Only] Team Dashboard
    ├── Team compliance overview
    ├── Outstanding items by team member
    └── Proxy submission → Creates RIU (proxy_report)
```

---

## 2.3 RIU→Case Architecture Summary

> **Reference:** See `00-PLATFORM/01-PLATFORM-VISION.md v3.2` for the complete RIU→Case architecture.

### Key Concepts

**Risk Intelligence Unit (RIU):** Immutable input created when something is reported or submitted. Contains the original data exactly as captured. Never modified after creation.

**Case:** Mutable work container tracking the organization's response. Has status, assignees, investigations, outcomes. Linked to one or more RIUs.

### RIU Types Created by This Module

| RIU Type | Created When | Auto-Creates Case? |
|----------|--------------|-------------------|
| `web_form_submission` | Employee/anonymous submits speak-up report | Yes (immediate) |
| `proxy_report` | Manager submits on behalf of employee | Yes (immediate) |
| `disclosure_response` | Employee completes disclosure form | If threshold/flag |
| `attestation_response` | Employee attests to policy | If failure/refusal |
| `chatbot_transcript` | Chatbot session with escalation | If escalation triggered |

### Status Display Logic

Employees see "My Reports" which displays their submitted RIUs. The status shown is:
1. **If RIU has linked Case:** Display Case status (Open, Under Review, Closed, etc.)
2. **If RIU has no linked Case:** Display RIU status (Received, Pending Review, etc.)

### Data Storage

| Data Type | Stored On | Why |
|-----------|-----------|-----|
| Original submission content | RIU | Immutable audit trail |
| Access code | RIU | Links anonymous reporter to their submission |
| Reporter contact info | RIU | Original capture, used for relay |
| Status, assignment, investigations | Case | Mutable work tracking |
| Messages | Case | Related to response workflow |
| Category/severity (corrected) | Case | Corrections go on Case, RIU preserves original |

---

## 3. User Stories

### End User

**Submit anonymous report via portal**
As an **Anonymous Reporter**, I want to submit a concern without identifying myself
so that I can report wrongdoing without fear of retaliation.

Key behaviors:
- No login required
- Confidentiality statement shown before form
- All required intake fields available
- **System creates RIU** (type: `web_form_submission`, reporter_type: `anonymous`)
- **System creates Case** (immediate, linked to RIU as 'primary')
- Access code generated for status checks (stored on RIU, prominently displayed)
- Optional email for update notifications
- Activity logged: "Anonymous report submitted via portal - RIU created"

---

**Check report status with access code**
As an **Anonymous Reporter**, I want to check the status of my submitted report
so that I know my concern is being addressed.

Key behaviors:
- Enter access code on portal (access code stored on RIU)
- **Status displayed from linked Case** (if Case exists) OR **RIU status** (if no Case yet)
- View current status and updates
- See any messages from investigators
- Can submit follow-up information
- No personal information required or exposed

---

**Reply to investigator message**
As an **Anonymous Reporter**, I want to reply to messages from investigators
so that I can provide additional information they request.

Key behaviors:
- Messages visible on status check page
- Reply form available for each message
- Reply goes through Ethico relay (identity protected)
- Can attach files to reply
- Activity logged: "Reporter replied to investigator message"

---

**Submit identified report**
As an **Employee**, I want to submit a report with my contact information
so that investigators can reach me directly for follow-up.

Key behaviors:
- SSO or magic link authentication
- Contact info captured and encrypted (stored on RIU)
- **System creates RIU** (type: `web_form_submission`, reporter_type: `identified`)
- **System creates Case** (immediate, linked to RIU as 'primary')
- Can view RIU in "My Reports" after submission with linked Case status
- Direct messaging with investigators
- Activity logged: "Employee {name} submitted identified report - RIU created"

---

**View my submitted reports**
As an **Employee**, I want to see all reports (RIUs) I've submitted
so that I can track their progress.

Key behaviors:
- List of submitted RIUs with status
- **Status derived from**: linked Case status (if Case exists) OR RIU status (if no Case)
- Click to view report details and messages
- Submit follow-up information
- View activity timeline (RIU + linked Case activities)
- organizationId enforced by RLS
- Only shows RIUs where `reporter_employee_id` matches logged-in user

---

**Complete outstanding disclosures**
As an **Employee**, I want to complete disclosure forms assigned to me
so that I remain compliant with company policy.

Key behaviors:
- "My Disclosures" shows pending items
- Due date and campaign context visible
- Save draft and resume later
- Confirmation on submission
- Activity logged: "Employee {name} completed disclosure"

---

**View and attest to policies**
As an **Employee**, I want to view assigned policies and record my acknowledgment
so that I demonstrate understanding of company standards.

Key behaviors:
- "Policies" section shows assigned attestations
- Full policy content viewable
- Checkbox or signature for attestation
- Attestation timestamp recorded
- Activity logged: "Employee {name} attested to policy {policy_name}"

---

**Ask policy questions via chatbot**
As an **Employee**, I want to ask questions about company policies
so that I can get quick answers without searching documents.

Key behaviors:
- Chatbot accessible from portal
- Natural language questions accepted
- Answers cite relevant policy sections
- Option to escalate to compliance team
- Conversation logged for audit

---

### Client Admin

**Configure ethics portal branding**
As a **System Admin**, I want to customize the portal appearance
so that it matches our company branding.

Key behaviors:
- Upload logo and set colors
- Configure welcome message
- Set crisis escalation contact info
- Preview changes before publishing
- Activity logged: "System Admin {name} updated portal branding"

---

**Configure crisis escalation banner**
As a **Compliance Officer**, I want to configure the crisis escalation banner
so that employees in danger know how to get immediate help.

Key behaviors:
- Toggle banner visibility
- Set hotline phone number
- Add crisis resource links
- Custom messaging supported
- Activity logged: "Compliance Officer {name} updated crisis banner"

---

**View manager team dashboard**
As a **Manager**, I want to see my team's compliance status
so that I can follow up with team members who have outstanding items.

Key behaviors:
- Outstanding disclosures by team member
- Outstanding attestations by team member
- Team-level completion rates
- Click to send reminder
- organizationId and reporting hierarchy enforced

---

**Submit proxy report for team member**
As a **Manager**, I want to submit a report on behalf of a team member
so that I can help them when they're unable to submit directly.

Key behaviors:
- Select team member from dropdown
- Capture proxy submitter info
- Note reason for proxy submission
- **System creates RIU** (type: `proxy_report`)
- **System creates Case** (immediate, linked to RIU as 'primary')
- RIU linked to both employee and proxy submitter
- Activity logged: "Manager {name} submitted proxy report for {employee} - RIU created"

---

## 4. Ethics Portal (Public Landing Page)

### 3.1 Overview

The Ethics Portal is the public-facing entry point for the organization's ethics and compliance program. It is designed to be:
- **Accessible:** No login required for core functions
- **Discoverable:** SEO-optimized, easily found via search
- **Trustworthy:** Clear messaging about confidentiality and non-retaliation
- **Branded:** Client-customizable look and feel

### 3.2 Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ [Company Logo]                              [Language ▼] [Login]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🚨 NEED IMMEDIATE HELP?                                │   │
│  │  If you're in danger or witnessing an emergency,        │   │
│  │  [Call Hotline: 1-800-XXX-XXXX]  [Crisis Resources]     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │                     │  │                     │              │
│  │  📝 SUBMIT A        │  │  🔍 CHECK STATUS    │              │
│  │     REPORT          │  │                     │              │
│  │                     │  │  Enter your access  │              │
│  │  Share your concern │  │  code to check on   │              │
│  │  confidentially     │  │  an existing report │              │
│  │                     │  │                     │              │
│  │  [Start Report]     │  │  [Enter Code]       │              │
│  │                     │  │                     │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
│  ───────────────────────────────────────────────────────────── │
│                                                                 │
│  Our Commitment                                                 │
│  [Client-configurable message about ethics, confidentiality,   │
│   non-retaliation policy, etc.]                                │
│                                                                 │
│  ───────────────────────────────────────────────────────────── │
│                                                                 │
│  Resources                                                      │
│  • Code of Conduct                                              │
│  • Speak-Up Policy                                              │
│  • FAQs                                                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Footer: Contact | Privacy | Terms | Powered by Ethico          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Crisis Escalation (Prominent)

**Purpose:** Provide immediate help for urgent situations

**Display:**
- Prominent banner at top of page (not dismissible)
- Always visible, not hidden behind scroll
- Client-configurable content

**Default Content:**
```
🚨 NEED IMMEDIATE HELP?
If you are in immediate danger or witnessing an emergency, please contact:
• Emergency Services: 911 (or local equivalent)
• Company Hotline: [Client Hotline Number]
• [Optional: Client-specific crisis resources]
```

**Configuration Options:**
- Toggle visibility (on/off)
- Hotline phone number
- Additional crisis resources (EAP, mental health, etc.)
- Custom messaging

### 3.4 Anonymous Report Submission

**Flow:**
1. Click "Submit a Report"
2. View confidentiality statement
3. Choose: "Report Anonymously" or "Provide My Identity"
4. Complete intake form (same fields as operator intake)
5. **System creates RIU** (type: `web_form_submission`)
6. **System creates Case** (linked to RIU as 'primary')
7. Receive access code for status checks (stored on RIU)
8. Confirmation page with access code displayed prominently

**RIU Creation Details:**
- RIU type: `web_form_submission`
- RIU status: `received` (no QA required for web submissions)
- reporter_type: `anonymous` or `confidential`
- Access code generated and stored on RIU

**Form Fields:** (Same as PRD-005 Case Management intake)
- Report details (narrative) → stored on RIU
- Category selection → stored on RIU (copied to Case)
- Location (optional) → stored on RIU
- Subjects (optional) → stored on RIU
- Custom questions (client-configured) → stored on RIU
- File attachments (up to 25MB per file) → stored on RIU
- Severity indicator (optional self-assessment) → stored on RIU

**Access Code:**
- 8-character alphanumeric
- **Stored on RIU** (not Case)
- Displayed prominently on confirmation
- Option to email code (if email provided)
- Printed version available

### 3.5 Status Check (Access Code)

**Flow:**
1. Enter access code (stored on RIU)
2. System looks up RIU by access code
3. **Status displayed from**: linked Case (if exists) OR RIU status (if no Case)
4. View messages from investigators
5. Submit follow-up information
6. Send messages to investigators

**Status Resolution Logic:**
```
IF RIU has linked Case:
  Display Case status (Open, Under Review, Closed, etc.)
ELSE:
  Display RIU status (Received, Pending Review, etc.)
```

**Display Options (Client Configurable):**

| Visibility Level | What Reporter Sees |
|-----------------|-------------------|
| **Minimal** | Status only (Open, Under Review, Closed) |
| **Standard** | Status + department handling + last activity date |
| **Detailed** | Status + timeline of major events + messages |
| **Transparent** | Above + findings summary (when closed) |

### 3.6 Ethics Portal Entity

```
ETHICS_PORTAL_CONFIG
├── Core Fields
│   ├── id (UUID)
│   ├── organization_id (tenant)
│   ├── subdomain (e.g., "acme" → acme.ethics.ethico.com)
│   ├── custom_domain (e.g., "ethics.acmecorp.com")
│   ├── is_active (boolean)
│
├── Content
│   ├── welcome_title
│   ├── welcome_message (rich text)
│   ├── confidentiality_statement (rich text)
│   ├── commitment_message (rich text)
│   ├── footer_text
│
├── Crisis Section
│   ├── crisis_enabled (boolean)
│   ├── crisis_title
│   ├── crisis_message
│   ├── crisis_hotline_number
│   ├── crisis_resources[] (JSONB - links and labels)
│
├── Resources
│   ├── resources[] (JSONB)
│       ├── label
│       ├── url
│       ├── is_external (boolean)
│
├── Branding (Tiered)
│   ├── logo_url
│   ├── favicon_url
│   ├── primary_color
│   ├── secondary_color
│   ├── accent_color
│   ├── font_family (Enterprise tier)
│   ├── hero_image_url (Enterprise tier)
│   ├── custom_css (Enterprise tier)
│
├── Localization
│   ├── default_language
│   ├── available_languages[]
│   ├── translations (JSONB - per language)
│
├── Visibility Settings
│   ├── reporter_visibility_level (MINIMAL, STANDARD, DETAILED, TRANSPARENT)
│   ├── show_status_check (boolean)
│   ├── allow_anonymous_reports (boolean)
│   ├── require_category (boolean)
│
├── Metadata
    ├── created_at, updated_at
    ├── created_by, updated_by
```

---

## 4. Employee Portal (Authenticated)

### 4.1 Overview

The Employee Portal is the authenticated self-service interface where employees:
- Track their submitted reports (RIUs) with status from linked Cases
- Complete disclosure requirements (creates RIUs)
- Access and attest to policies (creates RIUs)
- Communicate with compliance team
- (Managers) View team compliance status

**RIU Creation in Employee Portal:**
| Action | RIU Type Created | Auto-Creates Case? |
|--------|------------------|-------------------|
| Submit speak-up report | `web_form_submission` | Yes (immediate) |
| Complete disclosure campaign | `disclosure_response` | If threshold met or flagged |
| Submit ad-hoc disclosure | `disclosure_response` | If threshold met or flagged |
| Attest to policy | `attestation_response` | If failure/refusal (configurable) |
| Chatbot escalation | `chatbot_transcript` | If escalation triggered |

### 4.2 Navigation Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ [Company Logo]  My Reports  Disclosures  Policies   [🔔] [👤]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LEFT SIDEBAR (collapsible)              MAIN CONTENT AREA     │
│  ┌───────────────┐                      ┌───────────────────┐  │
│  │ Dashboard     │                      │                   │  │
│  │ My Reports    │ ← RIUs submitted     │   (Context-       │  │
│  │ My Disclosures│   by this user       │    dependent)     │  │
│  │ Policies      │                      │                   │  │
│  │ Notifications │                      │                   │  │
│  │               │                      │                   │  │
│  │ [Manager Only]│                      │                   │  │
│  │ Team Dashboard│                      │                   │  │
│  │               │                      │                   │  │
│  │ ───────────── │                      │                   │  │
│  │ Submit New    │                      │                   │  │
│  │   • Report    │ → Creates RIU        │                   │  │
│  │   • Disclosure│ → Creates RIU        │                   │  │
│  │               │                      │                   │  │
│  │ ───────────── │                      │                   │  │
│  │ Help / FAQ    │                      │                   │  │
│  │ Settings      │                      │                   │  │
│  └───────────────┘                      └───────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 💬 Policy Assistant                           [Minimize]│   │
│  │ Ask questions about company policies...                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Dashboard (Home)

**Purpose:** Personalized landing page showing items requiring attention

**Sections:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Welcome, [First Name]                                          │
│                                                                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐│
│  │ 📋 2            │ │ 📝 1            │ │ ✅ 3            ││
│  │ Pending Reports │ │ Disclosure Due  │ │ Attestations Due ││
│  └──────────────────┘ └──────────────────┘ └──────────────────┘│
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ACTION REQUIRED                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📝 Annual Conflict of Interest Disclosure    Due: Jan 31│   │
│  │    Complete your annual COI certification               │   │
│  │    [Complete Now]                                        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ✅ Information Security Policy Attestation   Due: Feb 15│   │
│  │    Acknowledge the updated security policy              │   │
│  │    [Review & Attest]                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  RECENT ACTIVITY                                                │
│  • Report #RIU-2026-00042 status changed to "Under Review"     │
│  • New message on Report #RIU-2026-00038                        │
│  • Condition completed on Disclosure DIS-2026-00015             │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [Optional: Program Transparency - client configurable]        │
│  This Year: 342 reports received | Avg resolution: 28 days     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. My Reports

### 5.1 Report List View

**Purpose:** Show all RIUs (Risk Intelligence Units) submitted by the employee

> **Architecture Note:** "My Reports" displays RIUs, not Cases. Status is derived from the linked Case (if one exists) or from the RIU status (if no Case has been created yet).

**Display:**
```
┌─────────────────────────────────────────────────────────────────┐
│  My Reports                                  [+ Submit Report]  │
│                                                                 │
│  Filter: [All ▼]  [Date Range ▼]  [Search...]                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ RIU-2026-00042              Under Review      Jan 15    │   │
│  │ Workplace Safety Concern     (Case: ETH-2026-00042)     │   │
│  │ 💬 1 unread message                                      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ RIU-2026-00038              Closed - Resolved Jan 8     │   │
│  │ Policy Clarification Request (Case: ETH-2026-00038)     │   │
│  │                                                          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ RIU-2025-01892              Closed - No Action Dec 12   │   │
│  │ Expense Report Question      (Case: ETH-2025-01892)     │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Showing 3 of 3 reports                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Status Display Logic:**
```
FOR each RIU in employee's submitted reports:
  IF RIU has linked Case (via riu_case_associations):
    Display Case status (Under Review, Investigating, Closed, etc.)
    Show Case reference number
  ELSE:
    Display RIU status (Received, Pending Review, etc.)
    Show "Pending Case Assignment" indicator
```

**Visibility Rule:** Employees see ONLY RIUs they personally submitted (`reporter_employee_id` = current user). They do NOT see Cases where they are a subject or witness.

### 5.2 Report Detail View (Configurable)

**Visibility Levels (Client Configurable):**

| Level | Employee Sees |
|-------|--------------|
| **Status Only** | Reference number, category, status badge, submit date |
| **Standard** | Above + assigned department (not names), last activity date |
| **Detailed** | Above + timeline of major events, ability to message |
| **Transparent** | Above + findings summary when case is closed |

**Default:** Standard

**Data Sources:**
- **YOUR SUBMISSION section**: Pulled from RIU (immutable)
- **Status/Assignment**: Pulled from linked Case (if exists)
- **Timeline**: Combined from RIU creation + Case activities
- **Messages**: Stored on Case, linked via RIU

**Detail View Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to My Reports                                           │
│                                                                 │
│  Report: RIU-2026-00042                                         │
│  Workplace Safety Concern                                       │
│                                                                 │
│  Status: Under Review (from linked Case)                        │
│  Submitted: January 15, 2026                                    │
│  Assigned to: Human Resources                                   │
│  Last Activity: January 18, 2026                                │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  YOUR SUBMISSION (from RIU - read only)                         │
│  [Original narrative and details - immutable]                   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  TIMELINE (if visibility >= Detailed)                           │
│  ● Jan 18 - Case status changed to "Under Review"              │
│  ● Jan 16 - Case assigned to Human Resources                   │
│  ● Jan 15 - Case created from your report                      │
│  ● Jan 15 - Report submitted (RIU created)                     │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  MESSAGES                                              [+ New]  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ From: Compliance Team              Jan 18, 2:30 PM      │   │
│  │ Thank you for your report. We have assigned this to     │   │
│  │ the appropriate team and will follow up within 5 days.  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ From: You                          Jan 18, 3:15 PM      │   │
│  │ Thank you. I forgot to mention that this happened in    │   │
│  │ Building C, not Building A.                             │   │
│  │ 📎 photo.jpg (1.2 MB)                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [Add Follow-Up Information]                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Submit New Report

**Flow:**
1. Click "Submit Report"
2. Choose: "Submit with my identity" or "Submit anonymously"
3. View confidentiality statement
4. Complete intake form
5. Review and submit
6. **System creates RIU** (type: `web_form_submission`)
7. **System creates Case** (linked to RIU as 'primary')
8. Confirmation with RIU reference number (and access code if anonymous)

**RIU Creation:**
- RIU type: `web_form_submission`
- RIU status: `received`
- All form data stored on RIU (immutable)
- Case created immediately, linked to RIU

**Form (Same fields as Ethics Portal, with pre-filled employee data):**
- Employee info (pre-filled from HRIS, read-only) → stored on RIU
- Report details (narrative) - session-only draft → stored on RIU
- Category selection → stored on RIU (copied to Case)
- Location → stored on RIU
- Subjects → stored on RIU (copied to Case)
- Custom questions → stored on RIU
- File attachments (up to 25MB per file) → stored on RIU
- Severity self-assessment (optional) → stored on RIU (copied to Case)

**Session-Only Drafts:**
- Draft saved automatically as user types
- Warning if navigating away with unsaved draft
- Draft cleared when browser closes
- No persistent drafts (encourages completion)

### 5.4 Follow-Up Submission

**Purpose:** Add new information to an existing report/case

**Flow:**
1. From report detail, click "Add Follow-Up Information"
2. Enter additional details
3. Optionally attach files (up to 25MB)
4. Submit

**Result:**
- Creates new Interaction record (type: FOLLOW_UP) on linked Case
- **May create new RIU** if substantive new information (linked to same Case)
- Notification sent to case assignee
- Appears in combined timeline (RIU + Case)
- Does NOT create a new Case

**RIU Handling:**
- If follow-up contains substantive new information, a new RIU may be created
- New RIU linked to same Case with association_type: 'related'
- Original RIU remains unchanged (immutable)

### 5.5 Two-Way Messaging

**Purpose:** Secure communication between reporter and investigators

**Employee Experience:**
- View messages in portal inbox (messages stored on linked Case)
- Receive email notification when new message arrives
- Reply via portal or email (relay)
- Attach files to messages (up to 25MB)

**Anonymous Reporter Experience:**
- Same messaging capability via access code (stored on RIU)
- Access code lookup finds RIU → linked Case → messages
- Email relay preserves anonymity
- Reply via portal or email relay

**Architecture Note:**
- Messages are stored on the **Case** entity (not the RIU)
- Reporter contact info stored on **RIU** (used for relay)
- Access code stored on **RIU** (used for anonymous lookup)

**Message Entity:**
```
CASE_MESSAGE (stored on Case, accessed via RIU link)
├── id (UUID)
├── case_id (FK to Case)
├── organization_id
├── direction (TO_REPORTER, FROM_REPORTER)
├── content (text)
├── attachments[] (JSONB)
│   ├── file_name
│   ├── file_size
│   ├── storage_path
│   ├── mime_type
├── is_read (boolean)
├── read_at
├── sent_at
├── sent_by_user_id (null if from employee/reporter)
├── sent_by_name (displayed name - may be "Compliance Team")
├── delivered_via (PORTAL, EMAIL)
├── email_sent_at (if email notification sent)
├── created_at
```

---

## 6. My Disclosures

### 6.1 Disclosures Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  My Disclosures                              [+ New Disclosure] │
│                                                                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐│
│  │ 📋 1            │ │ ⏳ 2            │ │ ✅ 5            ││
│  │ Outstanding     │ │ Pending Review  │ │ Cleared         ││
│  └──────────────────┘ └──────────────────┘ └──────────────────┘│
│                                                                 │
│  ACTION REQUIRED                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📝 Annual COI Certification 2026            Due: Jan 31 │   │
│  │    Campaign: Annual Conflict of Interest                │   │
│  │    [Complete Now]                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  PENDING REVIEW                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ DIS-2026-00042    Outside Employment     Submitted Jan 5│   │
│  │ Status: Pending Manager Review                          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ DIS-2026-00038    Gift Received          Submitted Jan 3│   │
│  │ Status: With Conditions (1 pending)                     │   │
│  │ ⚠️ Condition due: Jan 20                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  PAST DISCLOSURES                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ DIS-2025-00892    COI - Family          Cleared  Dec 15 │   │
│  │ DIS-2025-00756    Gift Received         Cleared  Nov 22 │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [View Full History]                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Disclosure Completion Flow

**Campaign Disclosure:**
1. Employee sees outstanding campaign in dashboard
2. Click "Complete Now"
3. View disclosure form (pre-filled employee data)
4. Answer questions, attach documents
5. Review and submit
6. Confirmation with disclosure number

**Ad-Hoc Disclosure:**
1. Click "+ New Disclosure"
2. Select disclosure type
3. Complete form
4. Submit

### 6.3 Disclosure Detail View

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Disclosures                                          │
│                                                                 │
│  DIS-2026-00038                                                 │
│  Gift Received - Business Dinner                                │
│                                                                 │
│  Status: With Conditions                                        │
│  Submitted: January 3, 2026                                     │
│  Reviewed: January 5, 2026                                      │
│  Decision: Cleared with Conditions                              │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  YOUR SUBMISSION                                                │
│  Gift Type: Business Dinner                                     │
│  Estimated Value: $150                                          │
│  External Party: ABC Vendor Inc.                                │
│  Date: December 28, 2025                                        │
│  Business Purpose: Contract negotiation dinner                  │
│  [View Full Submission]                                         │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  CONDITIONS                                              [1/1]  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚠️ PENDING                           Due: January 20    │   │
│  │ Submit receipts for the dinner expense                  │   │
│  │                                                          │   │
│  │ [Upload Receipt]  [Mark Complete]                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  TIMELINE                                                       │
│  ● Jan 5  - Cleared with conditions                            │
│  ● Jan 3  - Submitted                                          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [Create Update] (submit new version)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Condition Completion

**Flow:**
1. View condition in disclosure detail
2. Add completion notes
3. Optionally upload supporting documents
4. Click "Mark Complete"
5. Condition moves to "Completed" status
6. Reviewer notified for verification (if configured)

**Condition Statuses (Employee View):**
- Pending
- Completed (awaiting verification)
- Verified ✓
- Overdue ⚠️

---

## 7. Policies

### 7.1 Policy Library

```
┌─────────────────────────────────────────────────────────────────┐
│  Policies                                                       │
│                                                                 │
│  [Search policies...]                      [Category ▼]        │
│                                                                 │
│  REQUIRING YOUR ATTENTION                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ Information Security Policy          Due: Feb 15     │   │
│  │    Updated January 2026 - Review and attest             │   │
│  │    [Review & Attest]                                     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ✅ Code of Conduct 2026                 Due: Jan 31     │   │
│  │    Annual acknowledgment required                        │   │
│  │    [Review & Attest]                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ALL POLICIES                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📄 Anti-Bribery & Corruption Policy          ✓ Attested │   │
│  │ 📄 Code of Conduct                           ⏳ Due Jan 31│   │
│  │ 📄 Conflict of Interest Policy               ✓ Attested │   │
│  │ 📄 Data Privacy Policy                       ✓ Attested │   │
│  │ 📄 Expense Reimbursement Policy              ✓ Attested │   │
│  │ 📄 Information Security Policy               ⏳ Due Feb 15│   │
│  │ 📄 Remote Work Policy                        ✓ Attested │   │
│  │ 📄 Social Media Policy                       ✓ Attested │   │
│  │ 📄 Workplace Safety Policy                   ✓ Attested │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [View Attestation History]                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Policy Detail & Attestation

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Policies                                             │
│                                                                 │
│  Information Security Policy                                    │
│  Version 3.2 | Effective: January 15, 2026                     │
│  Category: IT & Security                                        │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [Full policy content displayed here - rich text]               │
│                                                                 │
│  ...                                                            │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ATTESTATION REQUIRED                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☐ I have read and understand this policy               │   │
│  │ ☐ I agree to comply with this policy                   │   │
│  │                                                          │   │
│  │ [Submit Attestation]                      Due: Feb 15   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  PREVIOUS ATTESTATIONS                                          │
│  • v3.1 attested on December 1, 2025                           │
│  • v3.0 attested on June 15, 2025                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Attestation History

```
┌─────────────────────────────────────────────────────────────────┐
│  My Attestation History                                         │
│                                                                 │
│  Filter: [All Policies ▼]  [Year: 2026 ▼]                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Policy                    Version   Attested    Status  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Code of Conduct           v2026     -           Pending │   │
│  │ Information Security      v3.2      -           Pending │   │
│  │ Anti-Bribery              v2.1      Dec 15      ✓       │   │
│  │ Data Privacy              v4.0      Nov 30      ✓       │   │
│  │ Remote Work               v1.3      Nov 15      ✓       │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Export to PDF]                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Policy Q&A Chatbot (MVP)

### 8.1 Overview

An AI-powered assistant that answers questions about company policies using the policy content as context.

**Scope (MVP):**
- Policy Q&A only
- References specific policy sections in answers
- Does NOT handle speak-up intake (Phase 2)

### 8.2 UI Integration

**Location:** Floating widget in bottom-right corner of Employee Portal

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                           [Main Portal Content]                  │
│                                                                 │
│                                                                 │
│                                          ┌───────────────────┐  │
│                                          │ 💬 Policy         │  │
│                                          │    Assistant      │  │
│                                          └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Expanded State:**
```
┌───────────────────────────────────────┐
│ 💬 Policy Assistant            [—] [×]│
├───────────────────────────────────────┤
│                                       │
│ 👤 Can I accept a $100 gift from a   │
│    vendor?                            │
│                                       │
│ 🤖 According to the Gifts & Business │
│    Courtesies Policy (Section 4.2),  │
│    gifts from vendors valued at $75  │
│    or more require pre-approval from │
│    your manager and must be logged   │
│    in the disclosure system.         │
│                                       │
│    Since this gift exceeds $75, you  │
│    should:                           │
│    1. Get manager approval           │
│    2. Submit a gift disclosure       │
│                                       │
│    📄 View Gifts Policy              │
│    📝 Submit Gift Disclosure         │
│                                       │
├───────────────────────────────────────┤
│ [Type your question...]        [Send] │
└───────────────────────────────────────┘
```

### 8.3 Chatbot Features

**Capabilities:**
- Natural language policy questions
- References specific policy sections
- Provides actionable guidance
- Links to relevant policies
- Links to relevant actions (submit disclosure, etc.)
- Multi-turn conversation

**Guardrails:**
- Only answers based on published policy content
- Clearly states when a question is outside policy scope
- Recommends contacting compliance for complex situations
- Does NOT provide legal advice
- Maintains conversation history within session only

### 8.4 Chatbot Entity

```
CHATBOT_CONVERSATION
├── id (UUID)
├── organization_id
├── employee_id (FK)
├── session_id
├── started_at
├── last_message_at
├── message_count
├── is_active (boolean)

CHATBOT_MESSAGE
├── id (UUID)
├── conversation_id (FK)
├── organization_id
├── role (USER, ASSISTANT)
├── content
├── referenced_policies[] (FK to Policy)
├── suggested_actions[] (JSONB)
│   ├── action_type (VIEW_POLICY, SUBMIT_DISCLOSURE, CONTACT_COMPLIANCE)
│   ├── label
│   ├── url
├── created_at
├── response_time_ms (for assistant messages)
```

---

## 9. Notifications

### 9.1 Notification Inbox

```
┌─────────────────────────────────────────────────────────────────┐
│  Notifications                              [Mark All Read]     │
│                                                                 │
│  TODAY                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔵 New message on Report #RIU-2026-00042     2:30 PM    │   │
│  │    The compliance team has responded to your report     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 🔵 Disclosure condition due soon             10:00 AM   │   │
│  │    Submit receipts for DIS-2026-00038 by Jan 20         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  YESTERDAY                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │    Report status updated                     4:15 PM    │   │
│  │    Report #RIU-2026-00042 is now "Under Review"         │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │    Disclosure reviewed                       11:30 AM   │   │
│  │    DIS-2026-00038 has been cleared with conditions      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  EARLIER THIS WEEK                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │    New policy requires attestation           Mon        │   │
│  │    Information Security Policy v3.2 - due Feb 15        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Load More]                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Notification Events

| Event | Email | In-App | Push (PWA) |
|-------|-------|--------|------------|
| New message on report (via linked Case) | ✓ | ✓ | ✓ |
| Report status changed (Case status) | ✓ | ✓ | |
| New disclosure campaign | ✓ | ✓ | ✓ |
| Disclosure decision | ✓ | ✓ | |
| Condition reminder | ✓ | ✓ | ✓ |
| Condition overdue | ✓ | ✓ | ✓ |
| Policy attestation required | ✓ | ✓ | |
| Policy attestation reminder | ✓ | ✓ | |

### 9.3 Notification Preferences

```
┌─────────────────────────────────────────────────────────────────┐
│  Notification Settings                                          │
│                                                                 │
│  EMAIL NOTIFICATIONS                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Case Updates                              [On ▼]        │   │
│  │ Disclosure Reminders                      [On ▼]        │   │
│  │ Policy Attestation Reminders              [On ▼]        │   │
│  │ Condition Due Reminders                   [On ▼]        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  IN-APP NOTIFICATIONS                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ All notifications                         [On ▼]        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Note: Some notifications are mandatory and cannot be disabled. │
│                                                                 │
│  [Save Preferences]                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 9.4 Notification Entity

```
EMPLOYEE_NOTIFICATION
├── id (UUID)
├── organization_id
├── employee_id (FK)
├── notification_type
├── title
├── message
├── link_url (deep link into portal)
├── related_entity_type (RIU, CASE, DISCLOSURE, POLICY, CONDITION)
├── related_entity_id (FK)
├── is_read (boolean)
├── read_at
├── email_sent_at
├── push_sent_at
├── created_at
├── expires_at (optional - auto-dismiss after date)
```

**Note:** For report-related notifications, `related_entity_type` is `RIU` (the employee's view), but status information is pulled from the linked Case.

---

## 10. Manager Dashboard

### 10.1 Overview

Managers see an enhanced view with team compliance information.

**Visibility:** Managers see data for their direct reports only (from HRIS).

### 10.2 Dashboard View

```
┌─────────────────────────────────────────────────────────────────┐
│  Team Compliance Dashboard                                      │
│  Your Team: 12 direct reports                                   │
│                                                                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐│
│  │ 📋 2            │ │ 📝 3            │ │ ✅ 8            ││
│  │ Disclosures     │ │ Attestations    │ │ Fully Compliant ││
│  │ Outstanding     │ │ Outstanding     │ │                 ││
│  └──────────────────┘ └──────────────────┘ └──────────────────┘│
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  OUTSTANDING ITEMS BY TEAM MEMBER                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Employee           Disclosures  Attestations  Status    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Jane Smith         1            2             ⚠️ Action │   │
│  │ Bob Johnson        1            0             ⚠️ Action │   │
│  │ Alice Chen         0            1             ⚠️ Action │   │
│  │ Carlos Rodriguez   0            0             ✓ Complete│   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  QUICK ACTIONS                                                  │
│  [Send Reminder to Team]  [Submit Proxy Report]                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.3 Proxy Submission

**Purpose:** Allow managers to submit speak-up reports on behalf of employees who cannot or prefer not to submit directly.

**Flow:**
1. Manager clicks "Submit Proxy Report"
2. Selects employee from direct reports list
3. Captures the report on their behalf
4. **System creates RIU** (type: `proxy_report`)
5. **System creates Case** (linked to RIU as 'primary')
6. RIU tagged as proxy submission with manager info
7. Manager identified as submitter on RIU
8. Employee notified (optional, configurable)

**Use Cases:**
- Employee uncomfortable with technology
- Employee on leave
- Verbal report to manager needs documentation
- Emergency situation

**Entity Additions (on RIU, not Case):**
```
RIU (for type: proxy_report)
├── is_proxy_submission (boolean) = true
├── proxy_submitter_id (FK to User - the manager)
├── proxy_submitter_name
├── proxy_for_employee_id (FK to Employee)
├── proxy_for_employee_name
├── proxy_employee_notified (boolean)
├── proxy_reason (TECH_DIFFICULTY, ON_LEAVE, VERBAL_REPORT, EMERGENCY, OTHER)
```

**Note:** Proxy information is stored on the RIU (immutable record of how report was submitted), not on the Case.

---

## 11. Authentication & Session Management

### 11.1 Authentication Methods

| Method | Use Case | Implementation |
|--------|----------|----------------|
| **SSO (SAML/OIDC)** | Primary for employees | Standard enterprise SSO integration |
| **Email Magic Link** | Contractors, distributed workforce | Passwordless link sent to verified email |
| **Access Code** | Anonymous reporters | 8-char alphanumeric, entered on Ethics Portal or Employee Portal |

### 11.2 SSO Flow

```
1. User clicks "Login" on Ethics Portal
2. Redirect to organization's IdP
3. User authenticates with corporate credentials
4. IdP returns SAML assertion / OIDC token
5. Platform validates token, extracts:
   - Employee ID
   - Email
   - Name
   - Department
   - Manager
   - Groups/roles
6. Session created
7. Redirect to Employee Portal dashboard
```

### 11.3 Email Magic Link Flow

```
1. User enters email address
2. System validates email domain is allowed
3. Magic link sent to email (valid 15 minutes)
4. User clicks link
5. Session created
6. Limited functionality based on contractor permissions
```

### 11.4 Access Code Flow

```
1. User enters 8-character access code
2. System looks up RIU by access code (access_code stored on RIU)
3. System finds linked Case (if any) via riu_case_associations
4. Limited session created (RIU-specific only)
5. User can:
   - View report status (from linked Case or RIU status)
   - Submit follow-ups
   - Exchange messages (via linked Case)
6. User cannot:
   - Access other portal features
   - See other reports
```

### 11.5 Session Management

**Configuration Options (Client-Configurable):**

| Setting | Default | Min | Max |
|---------|---------|-----|-----|
| Session idle timeout | 30 min | 5 min | 8 hours |
| Session absolute timeout | 8 hours | 1 hour | 24 hours |
| Warning before timeout | 5 min | 1 min | 10 min |

**Session Entity:**
```
EMPLOYEE_PORTAL_SESSION
├── id (UUID)
├── organization_id
├── employee_id (FK, null for access code sessions)
├── riu_id (FK, for access code sessions - links to the RIU being accessed)
├── access_code (for anonymous sessions - lookup key)
├── session_token (hashed)
├── authentication_method (SSO, MAGIC_LINK, ACCESS_CODE)
├── created_at
├── last_activity_at
├── expires_at
├── ip_address
├── user_agent
├── device_fingerprint
├── is_active (boolean)
├── terminated_at
├── terminated_reason (TIMEOUT, LOGOUT, ADMIN_REVOKE)
```

---

## 12. HRIS Integration (Employee Data)

### 12.1 Data Display Strategy

**Principle:** Show live HRIS data in UI, store snapshot with each submission for audit trail.

**Implementation:**
- Portal displays current HRIS data (name, department, manager, location)
- Each case/disclosure submission stores HRIS snapshot at submission time
- Historical accuracy preserved for investigations
- UI shows current data, but audit shows point-in-time data

### 12.2 Employee Data Fields

| Field | Source | Updateable | Stored with Submission |
|-------|--------|------------|------------------------|
| Employee ID | HRIS | No | Yes |
| Name | HRIS | No | Yes |
| Email | HRIS | No | Yes |
| Department | HRIS | No | Yes |
| Location | HRIS | No | Yes |
| Job Title | HRIS | No | Yes |
| Manager | HRIS | No | Yes |
| Start Date | HRIS | No | Yes |
| Employment Type | HRIS | No | Yes |

### 12.3 HRIS Snapshot Entity

```
HRIS_SNAPSHOT
├── id (UUID)
├── organization_id
├── employee_id
├── snapshot_type (CASE_SUBMISSION, DISCLOSURE_SUBMISSION, ATTESTATION)
├── related_entity_id (case_id or disclosure_id)
├── snapshot_data (JSONB - all HRIS fields at time of snapshot)
├── created_at
```

---

## 13. Localization

### 13.1 Language Detection Flow

```
1. Check URL parameter (?lang=es)
2. Check user preference (if authenticated, from profile)
3. Check browser Accept-Language header
4. Check HRIS locale field (if available)
5. Fall back to portal default language
```

### 13.2 Supported Languages (MVP)

| Language | Code | Status |
|----------|------|--------|
| English | en | Default |
| Spanish | es | Supported |
| French | fr | Supported |
| German | de | Supported |
| Portuguese | pt | Supported |
| Chinese (Simplified) | zh-CN | Supported |
| Japanese | ja | Supported |

### 13.3 Localization Scope

| Content Type | Translation Method |
|--------------|-------------------|
| Portal UI (static) | Pre-translated strings |
| Policy content | Client provides or AI-assisted |
| Form questions | Client provides or AI-assisted |
| User-generated content | AI translation on-demand |
| Chatbot responses | AI generates in user's language |

### 13.4 Language Preference Entity

```
EMPLOYEE_PREFERENCES
├── id (UUID)
├── organization_id
├── employee_id (FK)
├── preferred_language
├── timezone
├── date_format
├── notification_preferences (JSONB)
├── accessibility_settings (JSONB)
├── created_at
├── updated_at
```

---

## 14. Branding & Customization

### 14.1 Standard Tier

| Feature | Included |
|---------|----------|
| Company logo | ✓ |
| Primary color | ✓ |
| Secondary color | ✓ |
| Company name | ✓ |
| Welcome message | ✓ |
| Subdomain (acme.ethics.ethico.com) | ✓ |

### 14.2 Enterprise Tier (Full White-Label)

| Feature | Included |
|---------|----------|
| Everything in Standard | ✓ |
| Custom domain (ethics.acme.com) | ✓ |
| Custom fonts | ✓ |
| Hero images | ✓ |
| Custom favicon | ✓ |
| Custom email sender domain | ✓ |
| Footer customization | ✓ |
| Custom CSS injection | ✓ |
| Remove "Powered by Ethico" | ✓ |

### 14.3 Branding Configuration

```
PORTAL_BRANDING
├── id (UUID)
├── organization_id
├── tier (STANDARD, ENTERPRISE)
│
├── Basic Branding
│   ├── logo_url
│   ├── favicon_url
│   ├── company_name
│   ├── primary_color (hex)
│   ├── secondary_color (hex)
│   ├── accent_color (hex)
│
├── Enterprise Branding
│   ├── custom_domain
│   ├── ssl_certificate_arn
│   ├── font_family
│   ├── hero_image_url
│   ├── custom_css
│   ├── email_sender_domain
│   ├── email_sender_name
│   ├── footer_html
│   ├── hide_powered_by (boolean)
│
├── Metadata
    ├── created_at, updated_at
    ├── created_by, updated_by
```

---

## 15. Program Transparency

### 15.1 Overview

Optional display of anonymized program statistics to build trust and demonstrate program effectiveness.

**Client Configuration:** Admins choose which stats to display (if any).

### 15.2 Available Statistics

| Metric | Description | Privacy Level |
|--------|-------------|---------------|
| Reports received (year) | Total reports this year | Safe |
| Average resolution time | Average days to close | Safe |
| Reports by category | Distribution pie chart | Safe |
| Substantiation rate | % of reports substantiated | Use with caution |
| Retaliation cases | Number of retaliation findings | Safe |

### 15.3 Display Configuration

```
TRANSPARENCY_CONFIG
├── id (UUID)
├── organization_id
├── is_enabled (boolean)
├── display_location (DASHBOARD, ETHICS_PORTAL, BOTH)
├── visible_metrics[]
│   ├── metric_key
│   ├── is_visible (boolean)
│   ├── display_label (custom label)
├── refresh_frequency (DAILY, WEEKLY, MONTHLY)
├── date_range (THIS_YEAR, ROLLING_12_MONTHS, ALL_TIME)
├── created_at, updated_at
```

### 15.4 Display Example

```
┌─────────────────────────────────────────────────────────────────┐
│  Program Transparency - 2026                                    │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    342       │  │    28        │  │    0         │          │
│  │  Reports     │  │  Avg Days    │  │  Retaliation │          │
│  │  Received    │  │  to Resolve  │  │  Cases       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  Your voice matters. Every report is taken seriously.          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 16. PWA Specification

### 16.1 Manifest Configuration

```json
{
  "name": "Ethico Employee Portal",
  "short_name": "Ethics",
  "description": "Report concerns and manage compliance",
  "start_url": "/portal",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a73e8",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192" },
    { "src": "/icons/icon-512.png", "sizes": "512x512" }
  ]
}
```

### 16.2 Offline Capabilities

| Feature | Offline Support |
|---------|----------------|
| View dashboard | ✓ (cached data) |
| View case list | ✓ (cached data) |
| View case details | ✓ (cached data) |
| Submit new report | Queued for sync |
| Submit message | Queued for sync |
| View policies | ✓ (cached) |
| Complete attestation | Queued for sync |
| Policy chatbot | ✗ (requires connection) |

### 16.3 Push Notifications

**Registration Flow:**
1. User opts in to push notifications
2. Browser requests permission
3. If granted, generate push subscription
4. Store subscription on server
5. Send push for eligible events

**Push Events:**
- New message on case
- Disclosure campaign assigned
- Condition due reminder
- Attestation due reminder

---

## 17. Accessibility (WCAG 2.1 AA)

### 17.1 Requirements

| Requirement | Implementation |
|-------------|----------------|
| Keyboard navigation | All interactive elements focusable and operable |
| Screen reader support | Proper ARIA labels and semantic HTML |
| Color contrast | Minimum 4.5:1 for text, 3:1 for UI components |
| Focus indicators | Visible focus rings on all interactive elements |
| Text resizing | Content readable at 200% zoom |
| Form labels | All inputs have associated labels |
| Error identification | Clear error messages with suggestions |
| Skip links | Skip to main content link |
| Alt text | All images have descriptive alt text |
| Captions | Video content has captions |

### 17.2 Testing Approach

- Automated testing with axe-core
- Manual testing with screen readers (NVDA, VoiceOver)
- Keyboard-only navigation testing
- Color contrast verification
- User testing with accessibility needs

---

## 18. API Endpoints

### 18.1 Authentication Endpoints

```
POST    /api/v1/auth/sso/callback              # SSO callback
POST    /api/v1/auth/magic-link/request        # Request magic link
POST    /api/v1/auth/magic-link/verify         # Verify magic link
POST    /api/v1/auth/access-code/verify        # Verify access code
POST    /api/v1/auth/logout                    # Logout
GET     /api/v1/auth/session                   # Get current session
```

### 18.2 Employee Report Endpoints (RIU-based)

```
# My Reports (RIUs submitted by employee)
GET     /api/v1/employee/reports               # List my RIUs with linked Case status
GET     /api/v1/employee/reports/{riu_id}      # Get RIU detail + linked Case info
POST    /api/v1/employee/reports               # Submit new report (creates RIU + Case)
POST    /api/v1/employee/reports/{riu_id}/follow-up  # Submit follow-up (on linked Case)
GET     /api/v1/employee/reports/{riu_id}/messages   # Get messages (from linked Case)
POST    /api/v1/employee/reports/{riu_id}/messages   # Send message (to linked Case)

# Response includes:
# - RIU details (immutable submission data)
# - Linked Case status (if Case exists)
# - Combined timeline (RIU + Case activities)
```

### 18.3 Employee Disclosure Endpoints

```
GET     /api/v1/employee/disclosures           # List my disclosures
GET     /api/v1/employee/disclosures/{id}      # Get disclosure detail
POST    /api/v1/employee/disclosures           # Submit new disclosure
GET     /api/v1/employee/campaigns             # List my pending campaigns
GET     /api/v1/employee/conditions            # List my open conditions
POST    /api/v1/employee/conditions/{id}/complete  # Complete condition
```

### 18.4 Policy Endpoints

```
GET     /api/v1/employee/policies              # List available policies
GET     /api/v1/employee/policies/{id}         # Get policy detail
POST    /api/v1/employee/policies/{id}/attest  # Submit attestation
GET     /api/v1/employee/attestations          # List my attestations
```

### 18.5 Notification Endpoints

```
GET     /api/v1/employee/notifications         # List notifications
PATCH   /api/v1/employee/notifications/{id}/read  # Mark as read
PATCH   /api/v1/employee/notifications/read-all   # Mark all as read
GET     /api/v1/employee/preferences           # Get preferences
PATCH   /api/v1/employee/preferences           # Update preferences
```

### 18.6 Chatbot Endpoints

```
POST    /api/v1/employee/chatbot/message       # Send message to chatbot
GET     /api/v1/employee/chatbot/history       # Get conversation history
DELETE  /api/v1/employee/chatbot/history       # Clear conversation
```

### 18.7 Manager Endpoints

```
GET     /api/v1/manager/team                   # Get team members
GET     /api/v1/manager/dashboard              # Get team compliance dashboard
GET     /api/v1/manager/team/{id}/compliance   # Get member compliance status
POST    /api/v1/manager/proxy-report           # Submit proxy report
POST    /api/v1/manager/remind                 # Send reminder to team
```

### 18.8 Anonymous Reporter Endpoints

```
# Access code stored on RIU - system resolves to linked Case
GET     /api/v1/anonymous/report               # Get RIU + linked Case status (by access code in session)
POST    /api/v1/anonymous/report/follow-up     # Submit follow-up (on linked Case)
GET     /api/v1/anonymous/report/messages      # Get messages (from linked Case)
POST    /api/v1/anonymous/report/messages      # Send message (to linked Case)

# Flow: access_code → RIU lookup → riu_case_associations → Case
```

---

## 19. Permissions Matrix

### 19.1 Employee Permissions

| Action | Employee | Manager | Contractor | Anonymous |
|--------|----------|---------|------------|-----------|
| View own reports (RIUs) | ✓ | ✓ | ✓ | ✓ (one RIU via access code) |
| Submit report (creates RIU) | ✓ | ✓ | ✓ | ✓ |
| Submit follow-up | ✓ | ✓ | ✓ | ✓ |
| Send messages (via linked Case) | ✓ | ✓ | ✓ | ✓ |
| View disclosures | ✓ | ✓ | ✓ | ✗ |
| Submit disclosure (creates RIU) | ✓ | ✓ | ✓ | ✗ |
| Complete conditions | ✓ | ✓ | ✓ | ✗ |
| View policies | ✓ | ✓ | Limited | ✗ |
| Attest to policies (creates RIU) | ✓ | ✓ | Limited | ✗ |
| Use chatbot | ✓ | ✓ | ✓ | ✗ |
| View team dashboard | ✗ | ✓ | ✗ | ✗ |
| Submit proxy report (creates RIU) | ✗ | ✓ | ✗ | ✗ |

### 19.2 Client Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| Report visibility level | STANDARD | How much detail employees see about their RIUs/Cases |
| Allow anonymous from portal | Yes | Allow anonymous submissions (creates RIU + Case) |
| Show program transparency | No | Display anonymized stats |
| Manager proxy submission | Yes | Allow managers to submit proxy reports (creates RIU) |
| Chatbot enabled | Yes | Enable policy Q&A chatbot |
| Session timeout | 30 min | Idle timeout duration |
| Auto-create Case from web form | Yes | Always create Case when web_form_submission RIU created |

---

## 20. Acceptance Criteria

### 20.1 Functional Acceptance

| ID | Criterion | Priority |
|----|-----------|----------|
| AC-01 | Employee can submit speak-up report from Employee Portal (creates RIU + Case) | P0 |
| AC-02 | Anonymous reporter can submit report from Ethics Portal (creates RIU + Case) | P0 |
| AC-03 | Anonymous reporter can check status with access code (RIU lookup → Case status) | P0 |
| AC-04 | "My Reports" shows only RIUs submitted by logged-in employee | P0 |
| AC-05 | Report status derived from linked Case (if exists) OR RIU status (if no Case) | P0 |
| AC-06 | Report visibility level is configurable per client | P0 |
| AC-07 | Two-way messaging works via portal and email (messages on Case, accessed via RIU) | P0 |
| AC-08 | File attachments work on messages (up to 25MB) | P0 |
| AC-09 | Employee can complete disclosure campaigns (creates disclosure_response RIU) | P0 |
| AC-10 | Employee can submit ad-hoc disclosures (creates disclosure_response RIU) | P0 |
| AC-11 | Employee can complete conditions | P0 |
| AC-12 | Employee can view and attest to policies (creates attestation_response RIU) | P0 |
| AC-13 | Policy Q&A chatbot answers questions based on policy content | P1 |
| AC-14 | Manager sees team compliance dashboard | P1 |
| AC-15 | Manager can submit proxy reports (creates proxy_report RIU + Case) | P1 |
| AC-16 | SSO authentication works with SAML and OIDC | P0 |
| AC-17 | Email magic link authentication works | P1 |
| AC-18 | Access code authentication works (stored on RIU) | P0 |
| AC-19 | Session timeout is client-configurable | P1 |
| AC-20 | Notifications appear in-app and via email | P0 |
| AC-21 | PWA is installable and works offline (cached data) | P1 |
| AC-22 | Portal meets WCAG 2.1 AA accessibility | P0 |
| AC-23 | Language auto-detection works with manual override | P1 |
| AC-24 | Ethics Portal crisis section is prominent and configurable | P0 |
| AC-25 | Program transparency stats are configurable per client | P2 |
| AC-26 | HRIS snapshot is stored with each RIU submission | P0 |
| AC-27 | RIU data is immutable after creation | P0 |
| AC-28 | Follow-ups create Interactions on linked Case (may create related RIU) | P0 |

### 20.2 Performance Targets

| Metric | Target |
|--------|--------|
| Portal initial load | < 2 seconds |
| Page navigation | < 500ms |
| Report list load (25 RIUs with Case status) | < 1 second |
| Message send | < 1 second |
| Disclosure submission | < 2 seconds |
| Chatbot response | < 3 seconds |
| PWA offline load | < 1 second |
| Concurrent users | > 500 without degradation |

---

## 21. MVP Scope & Phasing

### 21.1 Phase 1 (MVP) - Weeks 5-8

**Ethics Portal:**
- Public landing page with branding
- Crisis section (prominent)
- Anonymous report submission
- Access code status check
- Two-way messaging

**Employee Portal:**
- SSO authentication
- Dashboard with action items
- My Reports (RIU list with linked Case status, configurable visibility)
- Report submission (creates RIU + Case)
- Follow-up submission (on linked Case)
- Two-way messaging with attachments (via linked Case)
- My Disclosures (from PRD-006, creates disclosure_response RIUs)
- Policies (view and attest, creates attestation_response RIUs)
- Notifications (in-app and email)
- Basic branding (Standard tier)

**Not Included:**
- Policy Q&A chatbot
- Manager dashboard
- Proxy submission (creates proxy_report RIU)
- Email magic link auth
- PWA offline mode
- Enterprise branding
- Program transparency

### 21.2 Phase 2 - Weeks 9-12

**Added:**
- Policy Q&A chatbot (MVP)
- Manager team dashboard
- Proxy submission
- Email magic link authentication
- Session timeout configuration
- PWA (installable, push notifications)
- Localization (auto-detect + manual)

### 21.3 Phase 3 - Weeks 13-16

**Added:**
- PWA offline mode
- Enterprise branding (white-label)
- Program transparency stats
- Advanced notification preferences
- Chatbot enhancement (more policies, better context)

---

## Appendix A: Email Templates

### Case Submitted Confirmation

```
Subject: Your report has been received - [Reference Number]

Dear [Name / "Anonymous Reporter"],

Thank you for submitting your report. We take all concerns seriously
and will review your submission promptly.

Report Reference: [RIU-2026-00042]
Case Reference: [ETH-2026-00042]
[If anonymous: Access Code: ABCD1234]

You can check the status of your report or add additional information at:
[Link to Ethics Portal / Employee Portal]

If you have questions, please contact our Ethics Hotline at [number].

Thank you,
[Company Name] Compliance Team
```

### New Message Notification

```
Subject: New message regarding your report [Reference Number]

Dear [Name / "Anonymous Reporter"],

The compliance team has sent you a message regarding your report.

To view and respond to this message, please visit:
[Link to portal]

Thank you,
[Company Name] Compliance Team
```

### Disclosure Campaign Invitation

```
Subject: Action Required: [Campaign Name]

Dear [Name],

As part of our compliance program, you are required to complete the
[Disclosure Type] disclosure.

Due Date: [Date]

Click here to complete: [Link]

If you have questions, please contact [Email].

Thank you,
[Company Name] Compliance Team
```

### Policy Attestation Required

```
Subject: Action Required: Policy Attestation - [Policy Name]

Dear [Name],

The [Policy Name] has been updated and requires your acknowledgment.

Due Date: [Date]

Please review the policy and complete your attestation:
[Link]

Thank you,
[Company Name] Compliance Team
```

---

## Appendix B: Chatbot Prompt Template

```
You are a helpful compliance assistant for [Company Name]. Your role is
to answer questions about company policies based on the policy content
provided to you.

Guidelines:
- Only answer based on the policy content provided
- Reference specific policy sections when answering
- If a question is outside the scope of available policies, say so
- Recommend contacting compliance@company.com for complex situations
- Never provide legal advice
- Be helpful, concise, and professional

Available policies for context:
[Policy content injected here]

User question: [User's question]
```

---

## Appendix C: Access Code Format

**Format:** 8 alphanumeric characters (uppercase letters and numbers)
**Pattern:** `[A-Z0-9]{8}`
**Examples:** `ABCD1234`, `XYZ98765`, `HELP2026`

**Excluded characters (to avoid confusion):**
- O (letter) - confused with 0 (zero)
- I (letter) - confused with 1 (one)
- L (letter) - confused with 1 (one)

**Generation:** Cryptographically random, checked for uniqueness

---

*End of Employee Portal PRD*
