# Ethico Risk Intelligence Platform
## PRD-002: Operator Console

**Document ID:** PRD-002
**Version:** 3.0 (RIU - Risk Intelligence Unit Architecture)
**Priority:** P1 - High (Core Module)
**Development Phase:** Phase 1
**Last Updated:** February 2026

> **Architecture Reference:** This PRD implements the RIU→Case architecture defined in `00-PLATFORM/01-PLATFORM-VISION.md v3.2`. Operators create **RIUs** (Risk Intelligence Units), which are **immutable inputs**. After QA release, the **system** automatically creates Cases (mutable work containers) and links RIUs via `riu_case_associations`.

**Cross-References:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md` (v3.2 - authoritative RIU→Case architecture)
- Working Decisions: `00-PLATFORM/WORKING-DECISIONS.md` (Section 4: Operator Console)
- Case Management: `02-MODULES/05-CASE-MANAGEMENT/PRD.md` (v3.1 - Case entity model)
- Core Data Model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`

> **Tech Stack:** NestJS (backend) + Next.js (frontend) + shadcn/ui + Tailwind CSS.
> See `01-SHARED-INFRASTRUCTURE/` docs for implementation patterns and standards.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [AI-First Considerations](#ai-first-considerations)
3. [User Stories](#user-stories)
4. [Feature Specifications](#feature-specifications)
   - F1: Client Profile Management
   - F2: Hotline Intake Workflow
   - F3: Directives System
   - F4: AI-Assisted Note Cleanup
   - F5: QA Review Workflow
   - F6: Follow-up Handling
   - F7: Operator Dashboard
   - F8: Multi-Client Management
5. [Data Model](#data-model)
6. [API Specifications](#api-specifications)
7. [UI/UX Specifications](#uiux-specifications)
8. [Non-Functional Requirements](#non-functional-requirements)

---

## Executive Summary

### Purpose

The Operator Console is Ethico's internal tool for hotline operators and QA staff to handle incoming calls, capture intake information as **Risk Intelligence Units (RIUs)**, perform AI-assisted note cleanup, and manage the QA review workflow before releasing RIUs to clients. After QA release, the system automatically creates Cases from RIUs.

### Target Users

| Role | Responsibilities |
|------|------------------|
| **Hotline Operator** | Answer calls, capture intake data, cleanup notes, submit to QA |
| **QA Reviewer** | Review cases, ensure quality, release to client |
| **QA Manager** | Monitor queue, manage team, override QA decisions |
| **Operator Manager** | Training, performance monitoring, directive management |

### Key Capabilities

1. **Client Profile Loading** - Automatic profile loading via phone number lookup
2. **Guided Intake Flow** - Structured call workflow with real-time AI assistance; creates RIUs (not Cases)
3. **Directives System** - Client-specific scripts, escalation procedures, and guidance
4. **AI Note Cleanup** - Convert bullet notes to formal narratives, generate summaries
5. **QA Review** - Quality review queue with edit capabilities and RIU release workflow
6. **Follow-up Management** - Link follow-up calls to existing Cases via new RIUs or Interactions
7. **Multi-Client Context** - Operators work across multiple client profiles

### RIU→Case Architecture

**Critical Concept:** Operators create **RIUs** (Risk Intelligence Units), not Cases directly.

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

**Why this matters:**
- **RIUs are immutable** - The intake record cannot be changed after creation (preserves audit integrity)
- **Cases are mutable** - Work containers that can be updated, assigned, closed
- **Corrections** - If categorization was wrong, the Case is corrected, not the RIU
- **Multiple RIUs** - One Case can link to multiple RIUs (same issue reported multiple times)

### Two-Tier User Model

```
Operator Console Users        Client Platform Users
─────────────────────────     ─────────────────────
Ethico Staff                  Customer Users
- isOperator: true            - isOperator: false
- Cross-tenant access         - Single-tenant access
- See all client profiles     - See only their org data
```

---

## AI-First Considerations

### Conversational Interface

Operators can interact with AI during and after calls:

| Situation | Example Prompt | AI Response |
|-----------|----------------|-------------|
| Question help | "What should I ask about retaliation?" | Suggested follow-up questions |
| Category assist | "What category fits this?" | Category suggestions with confidence |
| Note cleanup | "Clean up these notes" | Formal narrative from bullets |
| Summary request | "Summarize this call" | Executive summary |
| Directive lookup | "Show escalation procedure" | Relevant directive content |

**Example Conversation (During Call):**
```
AI: Based on the content, this appears to be a harassment allegation (85% confidence).
    Consider asking:
    - When did this behavior start?
    - Were there any witnesses?
    - Has the caller reported this before?

Operator: [Clicks to ask questions]

AI: Keywords detected: "threatened my job" - This may indicate retaliation.
    Check directive: Retaliation Escalation Procedure
```

### AI Assistance Points

| Feature | AI Capability |
|---------|---------------|
| Real-time category suggestion | Analyze transcript, suggest categories |
| Follow-up question prompts | Suggest relevant questions based on content |
| Keyword detection | Flag escalation triggers automatically |
| Note cleanup | Convert bullets to formal narrative |
| Summary generation | Create executive summary from details |
| Translation detection | Detect language, offer translation |
| Sentiment analysis | Flag caller distress indicators |

### Data Requirements for AI Context

**During Call:**
- Client profile and directives
- Current transcript/notes
- Selected category
- Historical patterns for this category

**Post-Call:**
- Complete call notes
- Category and severity
- Subject information
- Related directives

---

## User Stories

### Ethico Staff

**Auto-load client profile from phone number**
As an **Operator**, I want the client profile to load automatically when I receive a call
so that I'm prepared with the right context before greeting the caller.

Key behaviors:
- Phone number lookup triggers profile load in <2 seconds
- Displays client name, logo, branding colors
- Shows applicable directives for this client
- Recent RIU activity summary visible
- Activity logged: "Operator {name} loaded profile for {client}"

---

**Search for client profile manually**
As an **Operator**, I want to search for a client profile when the phone number doesn't match
so that I can find the correct client for the call.

Key behaviors:
- Search by client name, domain, or phone number
- Recent profiles shown for quick access
- Clear handling for "No profile found" scenario
- Activity logged: "Operator {name} searched for client profile"

---

**Capture intake information during call (creates RIU)**
As an **Operator**, I want a structured form to capture intake information as an RIU
so that I don't miss critical data during the live call.

Key behaviors:
- Form sections: Reporter Info, Location, Category, Details, Subjects
- Required fields enforced before submission
- Auto-save every 30 seconds (draft RIU)
- Progress indicator shows completion percentage
- Submitting creates RIU (type: hotline_report) with status 'pending_qa'
- Activity logged: "Operator {name} created RIU from phone intake for {client}"

---

**Add subjects with HRIS lookup**
As an **Operator**, I want to add accused individuals with HRIS lookup
so that we capture accurate employee information.

Key behaviors:
- Search client's HRIS by name or email
- Show employee details on match (title, department, manager)
- Allow manual entry if not in HRIS
- Multiple subjects supported per case
- Subject type selection: accused, witness, victim, other

---

**Get AI category suggestions during call**
As an **Operator**, I want AI to suggest categories based on my notes
so that I can categorize accurately while focusing on the caller.

Key behaviors:
- AI panel shows suggested categories with confidence scores
- Suggestions update as notes are typed
- One-click to accept suggestion
- AI explains reasoning for suggestion
- Suggestions logged to AI_CONVERSATION for audit

---

**Clean up notes with AI post-call**
As an **Operator**, I want AI to convert my bullet notes to formal narrative
so that the report is professional and readable.

Key behaviors:
- One-click "Clean Up Notes" button
- Converts bullets to professional paragraphs
- Fixes spelling and grammar
- Preserves all factual content (no additions)
- Shows before/after for review and editing
- Activity logged: "AI cleaned up notes for RIU"

---

**Generate summary with AI**
As an **Operator**, I want AI to generate an RIU summary
so that investigators can quickly understand the report.

Key behaviors:
- One-click "Generate Summary" button
- Summary is 2-3 sentences capturing key points
- Excludes PII and identifying details
- Summary editable before saving
- Marked as "AI-generated" on the RIU
- Activity logged: "AI generated summary for RIU"

---

**Submit RIU to QA queue**
As an **Operator**, I want to submit a completed RIU to the QA queue
so that it can be reviewed before release to the client.

Key behaviors:
- Validation ensures all required fields complete
- RIU status changes to 'pending_qa'
- Appears in QA queue immediately
- Operator can continue to next call
- Activity logged: "Operator {name} submitted RIU to QA"

---

**View QA queue**
As a **QA Reviewer**, I want to see all RIUs pending review
so that I can process them efficiently.

Key behaviors:
- Queue sorted by severity (high first), then by age
- Shows: RIU #, Client, Category, Severity, Operator, Wait Time
- Filterable by client, severity, operator
- Click to claim RIU for review
- Activity logged: "QA Reviewer {name} claimed RIU for review"

---

**Review and edit RIU**
As a **QA Reviewer**, I want to review and edit RIU details
so that I can correct any issues before release.

Key behaviors:
- Full RIU details displayed in editable form
- Fields editable during QA (before release) - changes tracked
- QA notes field (visible only to Ethico staff)
- Can request clarification from operator
- Can reject back to operator with reason
- Activity logged: "QA Reviewer {name} edited RIU"

**Important:** RIU becomes immutable after release. Any post-release corrections must be made on the Case that is created from the RIU.

---

**Release RIU to client (triggers Case creation)**
As a **QA Reviewer**, I want to release a reviewed RIU to the client
so that they can begin their investigation.

Key behaviors:
- Confirmation dialog shows routing destination
- RIU status changes to 'released' and becomes **immutable**
- **System automatically creates Case** from RIU with status 'new'
- RIU linked to Case via `riu_case_associations` with type 'primary'
- Release triggers notifications per client configuration
- Release timestamp and QA reviewer recorded on RIU
- Activity logged: "QA Reviewer {name} released RIU to {client}"
- Activity logged: "System created Case from released RIU"

---

**Identify follow-up call**
As an **Operator**, I want to identify when a caller is following up on an existing Case
so that I can link new information to the right Case.

Key behaviors:
- Prompt for access code (anonymous) or name/email (identified)
- Search returns matching Case(s) via linked RIUs
- Case summary (with primary RIU details) displayed for verification
- Confirm correct Case before capturing new info
- Activity logged: "Operator {name} identified follow-up for Case {reference}"

---

**Capture follow-up information**
As an **Operator**, I want to capture new information from a follow-up call
so that investigators see the updates without creating duplicate Cases.

Key behaviors:
- **Substantive new information**: Creates new RIU linked to existing Case (association_type: 'related')
- **Status check only**: Creates Interaction on Case (no new RIU created)
- Original Case context visible during capture
- Can add new subjects if mentioned
- Can escalate severity if warranted (on Case)
- Notification sent to Case assignee
- Activity logged: "Operator {name} added follow-up to Case {reference}"

**Follow-up Decision Flow:**
```
Follow-up Call
     │
     ▼
New Substantive Info? ─── YES ──► Create RIU (linked to Case)
     │                               └── QA required if configured
     NO
     │
     ▼
Create Interaction on Case (no RIU)
```

---

**View client directives during call**
As an **Operator**, I want to see client-specific directives during the call
so that I follow the correct procedures for each client.

Key behaviors:
- Opening/closing statements displayed at appropriate times
- Category-specific scripts appear when category selected
- Escalation procedures highlighted for high-severity
- Mandatory directives require acknowledgment
- Directive acknowledgments logged

---

**View operator dashboard**
As an **Operator**, I want a dashboard showing my workload and metrics
so that I can track my performance and pending items.

Key behaviors:
- My recent RIUs with status (pending_qa, in_qa_review, released)
- RIUs returned for clarification
- Calls today / average duration
- QA return rate (quality metric)
- Team queue status (if manager)

---

## Feature Specifications

### F1: Client Profile Management

**Description:**
Client profiles contain all configuration needed to handle calls for a specific organization.

**Profile Components:**

1. **Basic Information**
   - Client name, logo, branding colors
   - Phone numbers (for lookup)
   - Domain (for SSO matching)
   - Timezone
   - Primary contact

2. **Directives**
   - Opening/closing statements
   - Escalation procedures
   - Category-specific scripts
   - Special handling instructions

3. **Custom Questions**
   - General questions (all calls)
   - Category-triggered questions
   - Required vs. optional

4. **Categories**
   - Primary category list
   - Secondary categories
   - Severity guidance

5. **Locations**
   - Location hierarchy
   - HRIS location mapping

6. **HRIS Configuration**
   - Integration status
   - Field mapping
   - Last sync time

**Profile Loading Flow:**
```
Incoming Call
     │
     ▼
Phone Number Lookup ──► Match Found? ──► YES ──► Load Profile
     │                      │
     │                      NO
     │                      │
     │                      ▼
     │              Manual Search
     │                      │
     ▼                      │
Profile Not Found ◄────────┘
     │
     ▼
Create RFI or Route to Manager
```

---

### F2: Hotline Intake Workflow (RIU Creation)

**Description:**
Structured workflow for capturing intake information as an RIU during a live call.

**Workflow Stages:**

```
1. CALL ARRIVES
   └── System loads client profile from phone number

2. OPENING
   ├── Display opening statement directive
   └── Operator reads to caller

3. CALL TYPE DETERMINATION
   ├── New Report → Creates new RIU
   ├── Follow-up (existing Case) → Creates RIU linked to Case OR Interaction
   └── RFI (Request for Information) → May not create RIU

4. REPORTER INFORMATION
   ├── Anonymous? (Y/N)
   ├── Contact info (if not anonymous) - stored on RIU
   ├── Relationship (Employee, Vendor, etc.)
   └── Interpreter used?

5. LOCATION
   ├── HRIS location lookup
   └── Manual entry if needed

6. DETAILS & CATEGORY
   ├── Capture detail notes (real-time) - stored on RIU
   ├── AI suggests categories
   ├── Operator selects category - stored on RIU
   └── Custom questions appear based on category

7. SUBJECTS
   ├── HRIS employee lookup
   └── Manual entry option

8. SEVERITY ASSESSMENT
   ├── High: Imminent threat
   ├── Medium: Serious but not immediate
   └── Low: Standard concern

9. CLOSING
   ├── Read closing statement
   ├── Provide access code (if anonymous) - stored on RIU
   └── Offer survey (if applicable)

10. POST-CALL CLEANUP
    ├── AI-assisted note cleanup
    ├── AI-generated summary (stored on RIU)
    ├── Addendum (caller demeanor)
    └── Submit RIU to QA (status: pending_qa)
```

**RIU Created With:**
- `type: hotline_report`
- `status: pending_qa`
- All intake information captured during call
- Access code for anonymous reporters
- AI-generated fields (summary, category suggestions)

**RIU Intake Form Fields:**

| Section | Field | Type | Required | Stored On |
|---------|-------|------|----------|-----------|
| **Call Info** | Call Type | Select (Report, RFI, Follow-up) | Yes | RIU |
| | First Time Caller | Boolean | Yes | RIU |
| | Awareness Source | Select | No | RIU |
| **Reporter** | Anonymous | Boolean | Yes | RIU |
| | Email | Email | If not anonymous | RIU (encrypted) |
| | Phone | Phone | No | RIU (encrypted) |
| | Relationship | Select | Yes | RIU |
| | Interpreter Used | Boolean | Yes | RIU |
| **Location** | Location | Location Picker | Yes | RIU |
| | Manual Address | Text | If no HRIS match | RIU |
| **Details** | Detail Notes | Rich Text | Yes | RIU |
| | AI Summary | Text | Auto-generated | RIU |
| | Addendum | Text | No | RIU |
| **Category** | Primary Category | Select | Yes | RIU |
| | Secondary Category | Select | No | RIU |
| | Severity | Select (H/M/L) | Yes | RIU |
| **Subjects** | Subjects | Subject List | No | RIU→Case (after creation) |
| **Custom** | [Client Questions] | Various | Per config | RIU |

**Note:** Subject associations are stored on the Case entity after creation, not directly on the RIU. The RIU captures subject information in its narrative but the formal Subject records are created on the Case.

---

### F3: Directives System

**Description:**
Client-specific knowledge base of scripts, procedures, and guidance for operators.

**Directive Types:**

| Type | When Shown | Purpose |
|------|------------|---------|
| Opening Statement | Call start | Read to caller |
| Closing Statement | Call end | Read to caller |
| Anonymous Caller | If caller anonymous | Special handling |
| Category-Specific | When category selected | Relevant procedures |
| Escalation | High severity or keywords | Contact procedures |
| No Location | If location unavailable | Alternative steps |
| Special Instructions | Always visible | Client preferences |

**Directive Schema:**

```prisma
model Directive {
  id                    String   @id @default(uuid())
  client_profile_id     String
  client_profile        ClientProfile @relation(...)

  // Identity
  title                 String
  directive_type        DirectiveType
  content               String                    // Rich text content

  // Triggers
  trigger_categories    String[]                  // Show for these categories
  trigger_keywords      String[]                  // Show if keywords detected
  trigger_severity      SeverityLevel[]           // Show for these severities

  // Display
  is_mandatory          Boolean  @default(false) // Must acknowledge
  is_blocking           Boolean  @default(false) // Cannot proceed without
  display_order         Int      @default(0)
  icon                  String?

  // Versioning
  version               Int      @default(1)
  effective_date        DateTime @default(now())
  superseded_by_id      String?

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
}

enum DirectiveType {
  OPENING_STATEMENT
  CLOSING_STATEMENT
  ANONYMOUS_CALLER
  CATEGORY_SPECIFIC
  ESCALATION
  NO_LOCATION
  SPECIAL_INSTRUCTIONS
  CUSTOM
}
```

**Directive UI Pattern:**

```
┌─────────────────────────────────────────────────┐
│ 📋 DIRECTIVES                            [Hide] │
├─────────────────────────────────────────────────┤
│ ▼ Opening Statement (Required)                  │
│   "Thank you for calling the Ethics Hotline.    │
│    Your call may be recorded for quality..."    │
│   [✓ I have read this statement]                │
├─────────────────────────────────────────────────┤
│ ► Harassment Escalation (Triggered by category) │
├─────────────────────────────────────────────────┤
│ ► Anonymous Caller Guidance                     │
├─────────────────────────────────────────────────┤
│ ► Special Instructions                          │
│   • Client prefers "concern" not "complaint"    │
│   • Always ask about prior reporting            │
└─────────────────────────────────────────────────┘
```

---

### F4: AI-Assisted Note Cleanup

**Description:**
Post-call AI processing to convert operator notes into professional narratives.

**Capabilities:**

1. **Bullet to Narrative**
   - Input: Rough bullet points
   - Output: Professional paragraphs
   - Preserves all factual content
   - Fixes grammar and spelling

2. **Summary Generation**
   - 2-3 sentence executive summary
   - Excludes identifying information
   - Focuses on allegation and concern type

3. **Translation Detection**
   - Auto-detect non-English content
   - Offer to translate while preserving original
   - Note interpreter use

4. **PII Redaction Suggestions**
   - Flag potentially identifying information
   - Suggest appropriate redaction

**Example:**

Before (Operator Notes):
```
- caller says boss yelled at her in meeting
- happened last tuesday
- other ppl were there
- she felt embarrased
- worried about retaliation
- wants to remain anon
```

After (AI Cleaned):
```
The caller reports that their supervisor yelled at them during a meeting
last Tuesday. The incident occurred in front of other colleagues, causing
the caller embarrassment. The caller expressed concern about potential
retaliation and wishes to remain anonymous.
```

AI Summary:
```
An anonymous caller reports being yelled at by their supervisor during
a meeting, causing embarrassment. The caller fears retaliation.
```

---

### F5: QA Review Workflow

**Description:**
Quality assurance process before RIUs are released to clients and Cases are created.

**QA Queue:**

| Column | Description |
|--------|-------------|
| RIU # | Internal RIU reference number |
| Client | Client organization name |
| Category | Primary category |
| Severity | H/M/L badge |
| Operator | Who took the call |
| Submitted | When submitted to QA |
| Wait Time | Time in queue |
| Status | Pending QA, In Review, Released |

**Queue Sorting:**
1. High severity first
2. Then by wait time (oldest first)
3. Then by client priority (configurable)

**QA Actions:**

| Action | Description | Result |
|--------|-------------|--------|
| Claim | Lock RIU for review | Status → in_qa_review |
| Edit | Modify any field | Changes tracked (last edit before immutability) |
| Comment | Add internal QA note | Visible to Ethico staff only |
| Request Clarification | Send back with questions | Notification to operator |
| Reject | Return to operator | Status → rejected |
| Release | Approve for client | Status → released, RIU becomes immutable, **System creates Case** |

**Release Checklist (Configurable):**
- [ ] Category is appropriate
- [ ] Severity is accurate
- [ ] Required directives acknowledged
- [ ] Summary is clear and complete
- [ ] No PII in summary (if anonymous)
- [ ] Subject information captured

**Post-Release Flow:**
1. RIU status set to 'released' and becomes **immutable**
2. System automatically creates Case with status 'new'
3. Case linked to RIU via `riu_case_associations` (association_type: 'primary')
4. Subject records created on Case from RIU intake data
5. Routing rules applied to determine Case assignment
6. Notifications sent per client configuration

---

### F6: Follow-up Handling

**Description:**
Process for linking follow-up calls to existing Cases. Follow-ups do NOT create new Cases.

**Follow-up Flow:**

```
Caller Indicates Follow-up
          │
          ▼
    Access Code? ─── YES ──► Lookup Case via RIU access_code
          │                       │
          NO                      ▼
          │                 Case Found?
          ▼                       │
    Name/Email Search            YES
    (via linked RIUs)             │
          │                       ▼
          ▼                 Verify Correct Case
    Case(s) Found? ──► YES ─────────┐
          │                         │
          NO                        ▼
          │            New Substantive Info?
          ▼                    │
    Create New RIU        ┌────┴────┐
    (new report)          │         │
                         YES        NO
                          │         │
                          ▼         ▼
                    Create RIU    Create Interaction
                    (linked to    (status check only)
                     Case)              │
                          │             ▼
                          ▼        Notify Assignee
                    QA Review?
                          │
                    ┌─────┴─────┐
                   YES         NO
                    │           │
                    ▼           ▼
                QA Queue   Link to Case
                    │      immediately
                    ▼           │
             After Release      │
                    └─────┬─────┘
                          ▼
                   Link RIU to Case
                   (association_type: 'related')
                          │
                          ▼
                   Notify Assignee
```

**Key Decision: RIU vs Interaction**

| Scenario | Create | Rationale |
|----------|--------|-----------|
| Caller provides new substantive details | New RIU (linked to Case) | New immutable record of additional information |
| Caller checks status only | Interaction | No new reportable information |
| Caller provides minor clarification | Interaction | Not significant enough for separate RIU |
| Caller escalates severity | New RIU + update Case severity | New report with impact on Case |

**Interaction Entity (for status checks):**

```prisma
model Interaction {
  id                    String   @id @default(uuid())
  case_id               String
  case                  Case     @relation(...)
  riu_id                String?                   // Links to follow-up RIU if one was created
  organization_id       String

  // Type
  interaction_type      InteractionType
  channel               Channel

  // Content
  notes                 String                    // New information
  summary               String?                   // Brief summary
  addendum              String?                   // Operator notes on caller

  // Operator (for hotline)
  operator_id           String?
  operator              User?    @relation(...)

  // QA (if configured for follow-ups)
  qa_required           Boolean  @default(false)
  qa_status             QAStatus?
  qa_reviewed_by        String?
  qa_reviewed_at        DateTime?

  // Timestamps
  created_at            DateTime @default(now())
  created_by            String
}

enum InteractionType {
  INITIAL_INTAKE        // First contact (references primary RIU)
  FOLLOW_UP_HOTLINE     // Follow-up via phone
  FOLLOW_UP_WEB         // Follow-up via web portal
  STATUS_CHECK          // Reporter checking status
  INTERNAL_NOTE         // Investigator/compliance note
}

enum Channel {
  HOTLINE
  WEB_PORTAL
  EMAIL
  SMS
}

enum QAStatus {
  PENDING
  IN_REVIEW
  APPROVED
  REJECTED
}
```

---

### F7: Operator Dashboard

**Description:**
Landing page for operators showing their workload and key metrics.

**Dashboard Widgets:**

1. **Active Call** (if on call)
   - Client name
   - Call duration
   - Quick actions

2. **My Recent RIUs**
   - Last 10 RIUs submitted
   - Status of each (pending_qa, in_qa_review, released, rejected)
   - Quick link to view
   - Case number shown for released RIUs

3. **QA Status**
   - RIUs pending QA
   - RIUs returned for clarification
   - RIUs released today (with Case numbers)

4. **Personal Metrics**
   - Calls today
   - Avg call duration
   - QA return rate

5. **Team Queue** (if manager)
   - Total calls waiting
   - Longest wait
   - Team availability

---

### F8: Multi-Client Management

**Description:**
Support for operators working across multiple client organizations.

**Features:**

1. **Client Switching**
   - Quick switch between profiles
   - Recent clients list
   - Search all clients

2. **Cross-Client Search**
   - Search RIUs and Cases across all clients
   - Search for follow-ups by access code (looks up via RIU)
   - Results show client name

3. **Client-Specific Settings**
   - Branding per client
   - Form customizations
   - Directive libraries

4. **Operator Permissions**
   - `isOperator: true` grants cross-tenant access
   - Specific clients can be restricted
   - Audit log tracks client context

---

## Data Model

### Core Entities

#### RIU (Risk Intelligence Unit) - Hotline Extension

The core RIU entity is defined in `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`. This module extends it with hotline-specific fields:

```prisma
// Core RIU (from shared data model)
model RiskIntelligenceUnit {
  id                    String   @id @default(uuid())
  organization_id       String
  type                  RIUType                   // 'hotline_report' for this module

  // Common fields
  source_channel        SourceChannel             // 'hotline' for this module
  received_at           DateTime
  reporter_type         ReporterType              // 'anonymous', 'confidential', 'identified'

  // Status (for QA workflow)
  status                RIUStatus                 // 'pending_qa', 'in_qa_review', 'released', 'rejected'
  released_by           String?
  released_at           DateTime?

  // Content
  category_id           String?
  severity              Severity?
  details               String                    // Main narrative
  ai_summary            String?

  // Reporter contact (encrypted for non-anonymous)
  reporter_email        String?
  reporter_phone        String?
  access_code           String?                   // For anonymous follow-ups

  // AI enrichment
  ai_generated_at       DateTime?
  ai_model_version      String?
  ai_confidence         Float?

  // Immutability
  locked_at             DateTime?                 // Set when released (becomes immutable)

  // Timestamps
  created_at            DateTime @default(now())
  created_by            String                    // Operator who created
  updated_at            DateTime @updatedAt

  // Relations
  hotline_details       RIUHotlineDetails?
  case_associations     RIUCaseAssociation[]
}

// Extension table for hotline-specific fields
model RIUHotlineDetails {
  riu_id                String   @id
  riu                   RiskIntelligenceUnit @relation(...)

  // Operator info
  operator_id           String
  operator              User     @relation(...)

  // Call info
  call_duration_seconds Int?
  callback_number       String?
  callback_times        String?

  // Content
  original_transcript   String?                   // Raw operator notes
  addendum              String?                   // Caller demeanor notes

  // QA
  qa_notes              String?                   // Internal QA notes (Ethico only)
  qa_reviewer_id        String?
  qa_reviewed_at        DateTime?
}

// Association table linking RIUs to Cases
model RIUCaseAssociation {
  id                    String   @id @default(uuid())
  riu_id                String
  riu                   RiskIntelligenceUnit @relation(...)
  case_id               String
  case                  Case     @relation(...)

  association_type      AssociationType           // 'primary', 'related', 'merged_from'
  associated_at         DateTime @default(now())
  associated_by         String?                   // User or 'SYSTEM'

  @@unique([riu_id, case_id])
}

enum RIUType {
  HOTLINE_REPORT
  WEB_FORM_SUBMISSION
  PROXY_REPORT
  DISCLOSURE_RESPONSE
  ATTESTATION_RESPONSE
  CHATBOT_TRANSCRIPT
  INCIDENT_FORM
}

enum RIUStatus {
  DRAFT                                          // Operator still working
  PENDING_QA                                     // Submitted, awaiting QA
  IN_QA_REVIEW                                   // QA reviewer claimed
  REJECTED                                       // Returned to operator
  RELEASED                                       // Approved, Case created
}

enum AssociationType {
  PRIMARY                                        // First RIU that created the Case
  RELATED                                        // Additional RIU linked later
  MERGED_FROM                                    // RIU from a merged Case
}
```

#### ClientProfile

```prisma
model ClientProfile {
  id                    String   @id @default(uuid())
  organization_id       String   @unique
  organization          Organization @relation(...)

  // Identity
  display_name          String                    // Friendly name
  logo_url              String?
  branding              Json?                     // Colors, fonts

  // Phone Numbers
  phone_numbers         String[]                  // For caller ID lookup

  // Configuration
  settings              Json                      // Feature flags
  custom_questions      Json                      // Question definitions
  category_config       Json                      // Category customization
  qa_required_for_followups Boolean @default(false)  // Require QA for follow-up RIUs

  // HRIS
  hris_integration_id   String?

  // Status
  is_active             Boolean  @default(true)

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Relations
  directives            Directive[]
}
```

#### OperatorSession

```prisma
model OperatorSession {
  id                    String   @id @default(uuid())
  operator_id           String
  operator              User     @relation(...)

  // Call Context
  client_profile_id     String?
  client_profile        ClientProfile? @relation(...)
  phone_number          String?

  // Session
  started_at            DateTime @default(now())
  ended_at              DateTime?
  status                SessionStatus

  // Outcome
  riu_id                String?                   // RIU created (if new report)
  case_id               String?                   // Case if follow-up (RIU links to this)
  interaction_id        String?                   // If status-check follow-up (no new RIU)

  // Metrics
  duration_seconds      Int?
}

enum SessionStatus {
  ACTIVE
  COMPLETED
  ABANDONED
}
```

---

## API Specifications

### Client Profile Endpoints

```
# Profile Management
GET    /api/v1/operator/profiles                  # List all profiles
GET    /api/v1/operator/profiles/:id              # Get profile details
GET    /api/v1/operator/profiles/lookup           # Lookup by phone number
GET    /api/v1/operator/profiles/search           # Search profiles

# Directives
GET    /api/v1/operator/profiles/:id/directives   # Get profile directives
GET    /api/v1/operator/directives/:id            # Get directive content
```

### RIU Intake Endpoints

```
# Session Management
POST   /api/v1/operator/sessions                  # Start operator session
PUT    /api/v1/operator/sessions/:id              # Update session
POST   /api/v1/operator/sessions/:id/end          # End session

# RIU Creation
POST   /api/v1/operator/rius                      # Create RIU (submit to QA)
POST   /api/v1/operator/rius/draft                # Save draft RIU
GET    /api/v1/operator/rius/drafts               # Get my draft RIUs
GET    /api/v1/operator/rius/:id                  # Get RIU details
PUT    /api/v1/operator/rius/:id                  # Update draft RIU

# Follow-up
GET    /api/v1/operator/cases/lookup              # Lookup Case by access code (via RIU)
POST   /api/v1/operator/cases/:id/rius            # Create follow-up RIU linked to Case
POST   /api/v1/operator/cases/:id/interactions    # Create status-check Interaction (no RIU)
```

### QA Endpoints

```
# Queue Management
GET    /api/v1/qa/queue                           # Get QA queue (pending RIUs)
POST   /api/v1/qa/rius/:id/claim                  # Claim RIU for review
POST   /api/v1/qa/rius/:id/unclaim                # Release claim

# Review Actions
PUT    /api/v1/qa/rius/:id                        # Edit RIU (before release)
POST   /api/v1/qa/rius/:id/comments               # Add QA comment
POST   /api/v1/qa/rius/:id/clarify                # Request clarification
POST   /api/v1/qa/rius/:id/reject                 # Reject to operator
POST   /api/v1/qa/rius/:id/release                # Release to client (creates Case)
```

**Release Endpoint Response:**
```json
{
  "riu": {
    "id": "riu_123",
    "status": "released",
    "locked_at": "2026-02-01T10:30:00Z"
  },
  "case": {
    "id": "case_456",
    "case_number": "AC-2026-0142",
    "status": "new",
    "created_at": "2026-02-01T10:30:00Z"
  },
  "association": {
    "id": "assoc_789",
    "association_type": "primary"
  }
}
```

### AI Endpoints

```
# AI Assistance
POST   /api/v1/operator/ai/suggest-category       # Get category suggestions
POST   /api/v1/operator/ai/suggest-questions      # Get follow-up questions
POST   /api/v1/operator/ai/cleanup-notes          # Clean up notes
POST   /api/v1/operator/ai/generate-summary       # Generate summary
POST   /api/v1/operator/ai/detect-keywords        # Detect escalation keywords
```

---

## UI/UX Specifications

### Intake Screen Layout (RIU Creation)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◉ LIVE CALL  00:12:34    [Acme Corp]                    [End Call] [Escalate]│
├───────────────────────────────────┬─────────────────────────────────────────┤
│                                   │                                         │
│ NEW RIU - INTAKE FORM             │ AI ASSISTANT                            │
│ ═════════════════════             │ ════════════                            │
│                                   │                                         │
│ Call Type: ● Report ○ RFI ○ FU    │ Suggested Category                      │
│                                   │    Harassment (87%)                     │
│ Reporter Info                     │    Retaliation (45%)                    │
│   Anonymous: ● Yes ○ No           │    [Use Harassment]                     │
│   Relationship: [Employee]        │                                         │
│   Interpreter: ○ Yes ● No         │ ─────────────────────                   │
│                                   │                                         │
│ Location                          │ Suggested Questions                     │
│   [Search locations...]           │    - When did this start?               │
│   City, State: [          ]       │    - Were there witnesses?              │
│                                   │    - Documented anywhere?               │
│ Details                           │                                         │
│   ┌─────────────────────────────┐ │ ─────────────────────                   │
│   │ - boss yelled in meeting    │ │                                         │
│   │ - last tuesday              │ │ KEYWORD ALERT                           │
│   │ - worried about retaliation │ │    "retaliation" detected               │
│   │ |                           │ │    [View Escalation Directive]          │
│   └─────────────────────────────┘ │                                         │
│   [Clean Up Notes with AI]        │                                         │
│                                   │                                         │
│ Category & Severity               │                                         │
│   Primary: [Harassment]           │                                         │
│   Secondary: [            ]       │                                         │
│   Severity: ○ High ● Med ○ Low    │                                         │
│                                   │                                         │
│ Subjects                          │                                         │
│   [+ Add Subject]                 │                                         │
│   - John Smith (Manager, Acme)    │                                         │
│                                   │                                         │
├───────────────────────────────────┴─────────────────────────────────────────┤
│ DIRECTIVES  [Show All]                                                      │
│ [x] Opening Statement  |  [!] Harassment Escalation  |  [>] Anonymous Guide │
├─────────────────────────────────────────────────────────────────────────────┤
│                                          Progress: [=========---] 75%       │
│ [Save Draft]                                     [Submit RIU to QA]         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### QA Queue Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ QA Review Queue (Pending RIUs)                       [Search] [Filters]     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Filters: [All Clients] [All Severities] [All Operators]                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ | RIU #  | Client    | Category    | Sev | Operator | Submitted  | Wait  | │
│ |--------|-----------|-------------|-----|----------|------------|-------|  │
│ | RIU-01 | Acme Corp | Harassment  | H   | J. Smith | 2 min ago  | 2m    |  │
│ | RIU-02 | Beta Inc  | Fraud       | M   | M. Jones | 15 min ago | 15m   |  │
│ | RIU-03 | Gamma LLC | Safety      | L   | A. Wong  | 1 hr ago   | 1h    |  │
│ | RIU-04 | Delta Co  | Retaliation | H   | S. Patel | 2 hrs ago  | 2h    |  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Summary: 4 pending RIUs  -  2 high severity  -  Avg wait: 58 min            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### QA Review Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ QA Review: RIU #RIU-2026-0142                        [Back] [Release RIU]   │
├───────────────────────────────────┬─────────────────────────────────────────┤
│                                   │                                         │
│ RIU DETAILS                       │ QA CHECKLIST                            │
│ ═══════════                       │ ════════════                            │
│                                   │                                         │
│ Client: Acme Corp                 │ [x] Category appropriate                │
│ Submitted: Jan 28, 2026 10:15 AM  │ [x] Severity accurate                   │
│ Operator: John Smith              │ [x] Required directives acknowledged    │
│ Status: pending_qa                │ [x] Summary clear and complete          │
│                                   │ [ ] No PII in summary                   │
│ Reporter                          │ [ ] Subject info captured               │
│   Anonymous: Yes                  │                                         │
│   Relationship: Employee          │ ─────────────────────                   │
│                                   │                                         │
│ Location                          │ QA NOTES (Ethico Internal)              │
│   Main Office, Chicago, IL        │ ─────────────────────                   │
│                                   │ [Add note...]                           │
│ Summary                           │                                         │
│   ┌─────────────────────────────┐ │ ─────────────────────                   │
│   │ An anonymous employee       │ │                                         │
│   │ reports their supervisor    │ │ AFTER RELEASE                           │
│   │ yelled at them during a     │ │ ─────────────────────                   │
│   │ meeting, causing...  [Edit] │ │ System will create Case:                │
│   └─────────────────────────────┘ │ - Case # assigned                       │
│                                   │ - RIU linked as 'primary'               │
│ Details [Full Notes]              │ - Subjects created on Case              │
│                                   │ - RIU becomes immutable                 │
│ Category & Severity               │                                         │
│   Harassment - Medium             │ ROUTING PREVIEW                         │
│                                   │ ─────────────────────                   │
│ Subjects (captured)               │ Case will route to:                     │
│   John Smith (Manager)            │ > HR Department                         │
│                                   │ > Sarah Chen (Primary)                  │
│                                   │                                         │
├───────────────────────────────────┴─────────────────────────────────────────┤
│ [Request Clarification]  [Reject to Operator]           [Release to Client] │
│                                                                             │
│ Note: Releasing creates Case and makes RIU immutable. Edit before release.  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Profile load | < 2 seconds |
| Form auto-save | < 500ms |
| AI suggestions | < 3 seconds |
| Note cleanup | < 5 seconds |
| QA queue load | < 1 second |

### Availability

- 99.9% uptime during business hours
- Graceful degradation if AI unavailable
- Offline mode for draft saving

### Security

- Operators authenticate with MFA
- All actions logged to audit trail
- Client data isolated despite cross-tenant access
- PII redaction in logs

### Scalability

- Support 100+ concurrent operators
- 10,000+ cases per day
- 1,000+ client profiles
- Queue performance stable with 500+ pending cases

---

## Checklist Verification

### RIU→Case Architecture Compliance

**Entity Model:**
- [x] Operators create RIUs, not Cases directly
- [x] RIUs are immutable after QA release
- [x] Cases created by system after RIU release
- [x] RIU→Case linked via `riu_case_associations` with association_type
- [x] Follow-ups create new RIUs (linked to existing Case) or Interactions
- [x] Access code stored on RIU for anonymous follow-up lookup

**QA Workflow:**
- [x] QA queue shows pending RIUs (not Cases)
- [x] QA edits RIU before release (last chance for changes)
- [x] Release triggers Case creation and RIU immutability
- [x] Corrections after release must be made on Case

**API Design:**
- [x] `/rius` endpoints for RIU CRUD
- [x] `/qa/rius` endpoints for QA workflow
- [x] Release endpoint returns both RIU and created Case
- [x] Follow-up endpoints distinguish RIU vs Interaction creation

### AI-First Checklist Compliance

**Schema Design:**
- [x] RIU schema with semantic fields
- [x] AI enrichment fields on RIU (ai_summary, ai_generated_at, ai_model_version)
- [x] Interaction entity for status-check follow-ups
- [x] Activity logging on all operator actions
- [x] AI-generated content attribution

**Feature Design:**
- [x] Real-time AI assistance during calls
- [x] Post-call AI cleanup and summarization (stored on RIU)
- [x] Keyword detection for escalation triggers

**API Design:**
- [x] AI endpoints for suggestions and cleanup
- [x] Context-rich responses for operators

**UI Design:**
- [x] AI assistant panel during intake
- [x] One-click AI actions (cleanup, summarize)
- [x] Clear indication of RIU creation (not Case)
- [x] QA screen shows "Release creates Case" warning

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | January 2026 | Complete specification |
| 3.0 | February 2026 | Updated for RIU→Case architecture per Vision v3.2. Operators create RIUs, not Cases. QA reviews/releases RIUs. System creates Cases after release. Follow-ups create new RIUs linked to Cases or Interactions. |

---

*End of Operator Console PRD*
