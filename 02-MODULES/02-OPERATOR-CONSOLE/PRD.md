# Ethico Risk Intelligence Platform
## PRD-002: Operator Console

**Document ID:** PRD-002
**Version:** 2.0 (Complete Specification)
**Priority:** P1 - High (Core Module)
**Development Phase:** Phase 1
**Last Updated:** January 2026

**Cross-References:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md`
- Working Decisions: `00-PLATFORM/WORKING-DECISIONS.md` (Section 4: Operator Console)
- Case Management: `02-MODULES/05-CASE-MANAGEMENT/PRD.md`
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

The Operator Console is Ethico's internal tool for hotline operators and QA staff to handle incoming calls, capture intake information, perform AI-assisted note cleanup, and manage the QA review workflow before releasing cases to clients.

### Target Users

| Role | Responsibilities |
|------|------------------|
| **Hotline Operator** | Answer calls, capture intake data, cleanup notes, submit to QA |
| **QA Reviewer** | Review cases, ensure quality, release to client |
| **QA Manager** | Monitor queue, manage team, override QA decisions |
| **Operator Manager** | Training, performance monitoring, directive management |

### Key Capabilities

1. **Client Profile Loading** - Automatic profile loading via phone number lookup
2. **Guided Intake Flow** - Structured call workflow with real-time AI assistance
3. **Directives System** - Client-specific scripts, escalation procedures, and guidance
4. **AI Note Cleanup** - Convert bullet notes to formal narratives, generate summaries
5. **QA Review** - Quality review queue with edit capabilities and release workflow
6. **Follow-up Management** - Link follow-up calls to existing cases
7. **Multi-Client Context** - Operators work across multiple client profiles

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
- Recent activity summary visible
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

**Capture intake information during call**
As an **Operator**, I want a structured form to capture intake information
so that I don't miss critical data during the live call.

Key behaviors:
- Form sections: Reporter Info, Location, Category, Details, Subjects
- Required fields enforced before submission
- Auto-save every 30 seconds
- Progress indicator shows completion percentage
- Activity logged: "Operator {name} captured intake for {client}"

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
- Activity logged: "AI cleaned up notes for case"

---

**Generate summary with AI**
As an **Operator**, I want AI to generate a case summary
so that investigators can quickly understand the report.

Key behaviors:
- One-click "Generate Summary" button
- Summary is 2-3 sentences capturing key points
- Excludes PII and identifying details
- Summary editable before saving
- Marked as "AI-generated" in the case
- Activity logged: "AI generated summary for case"

---

**Submit case to QA queue**
As an **Operator**, I want to submit a completed case to the QA queue
so that it can be reviewed before release to the client.

Key behaviors:
- Validation ensures all required fields complete
- Case status changes to 'pending_qa'
- Appears in QA queue immediately
- Operator can continue to next call
- Activity logged: "Operator {name} submitted case to QA"

---

**View QA queue**
As a **QA Reviewer**, I want to see all cases pending review
so that I can process them efficiently.

Key behaviors:
- Queue sorted by severity (high first), then by age
- Shows: Case #, Client, Category, Severity, Operator, Wait Time
- Filterable by client, severity, operator
- Click to claim case for review
- Activity logged: "QA Reviewer {name} claimed case for review"

---

**Review and edit case**
As a **QA Reviewer**, I want to review and edit case details
so that I can correct any issues before release.

Key behaviors:
- Full case details displayed in editable form
- All fields editable (changes tracked)
- QA notes field (visible only to Ethico staff)
- Can request clarification from operator
- Can reject back to operator with reason
- Activity logged: "QA Reviewer {name} edited case"

---

**Release case to client**
As a **QA Reviewer**, I want to release a reviewed case to the client
so that they can begin their investigation.

Key behaviors:
- Confirmation dialog shows routing destination
- Release triggers notifications per client configuration
- Case status changes to 'new' (client-visible)
- Release timestamp and QA reviewer recorded
- Activity logged: "QA Reviewer {name} released case to {client}"

---

**Identify follow-up call**
As an **Operator**, I want to identify when a caller is following up on an existing case
so that I can link new information to the right case.

Key behaviors:
- Prompt for access code (anonymous) or name/email (identified)
- Search returns matching case(s)
- Case summary displayed for verification
- Confirm correct case before capturing new info
- Activity logged: "Operator {name} identified follow-up for case {reference}"

---

**Capture follow-up information**
As an **Operator**, I want to capture new information from a follow-up call
so that investigators see the updates without creating duplicate cases.

Key behaviors:
- New information added as Interaction (not new case)
- Original case context visible during capture
- Can add new subjects if mentioned
- Can escalate severity if warranted
- Notification sent to case assignee
- Activity logged: "Operator {name} added follow-up to case {reference}"

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
- My recent cases with status
- Cases returned for clarification
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

### F2: Hotline Intake Workflow

**Description:**
Structured workflow for capturing intake information during a live call.

**Workflow Stages:**

```
1. CALL ARRIVES
   └── System loads client profile from phone number

2. OPENING
   ├── Display opening statement directive
   └── Operator reads to caller

3. CALL TYPE DETERMINATION
   ├── New Report
   ├── Follow-up (existing case)
   └── RFI (Request for Information)

4. REPORTER INFORMATION
   ├── Anonymous? (Y/N)
   ├── Contact info (if not anonymous)
   ├── Relationship (Employee, Vendor, etc.)
   └── Interpreter used?

5. LOCATION
   ├── HRIS location lookup
   └── Manual entry if needed

6. DETAILS & CATEGORY
   ├── Capture detail notes (real-time)
   ├── AI suggests categories
   ├── Operator selects category
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
   ├── Provide access code (if anonymous)
   └── Offer survey (if applicable)

10. POST-CALL CLEANUP
    ├── AI-assisted note cleanup
    ├── AI-generated summary
    ├── Addendum (caller demeanor)
    └── Submit to QA
```

**Intake Form Fields:**

| Section | Field | Type | Required |
|---------|-------|------|----------|
| **Call Info** | Call Type | Select (Report, RFI, Follow-up) | Yes |
| | First Time Caller | Boolean | Yes |
| | Awareness Source | Select | No |
| **Reporter** | Anonymous | Boolean | Yes |
| | Email | Email | If not anonymous |
| | Phone | Phone | No |
| | Relationship | Select | Yes |
| | Interpreter Used | Boolean | Yes |
| **Location** | Location | Location Picker | Yes |
| | Manual Address | Text | If no HRIS match |
| **Details** | Detail Notes | Rich Text | Yes |
| | AI Summary | Text | Auto-generated |
| | Addendum | Text | No |
| **Category** | Primary Category | Select | Yes |
| | Secondary Category | Select | No |
| | Severity | Select (H/M/L) | Yes |
| **Subjects** | Subjects | Subject List | No |
| **Custom** | [Client Questions] | Various | Per config |

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
Quality assurance process before cases are released to clients.

**QA Queue:**

| Column | Description |
|--------|-------------|
| Case # | Internal case number |
| Client | Client organization name |
| Category | Primary category |
| Severity | H/M/L badge |
| Operator | Who took the call |
| Submitted | When submitted to QA |
| Wait Time | Time in queue |
| Status | Pending, In Review, Released |

**Queue Sorting:**
1. High severity first
2. Then by wait time (oldest first)
3. Then by client priority (configurable)

**QA Actions:**

| Action | Description | Result |
|--------|-------------|--------|
| Claim | Lock case for review | Status → In Review |
| Edit | Modify any field | Changes tracked |
| Comment | Add internal QA note | Visible to other QA only |
| Request Clarification | Send back with questions | Notification to operator |
| Reject | Return to operator | Status → Rejected |
| Release | Send to client | Status → Released |

**Release Checklist (Configurable):**
- [ ] Category is appropriate
- [ ] Severity is accurate
- [ ] Required directives acknowledged
- [ ] Summary is clear and complete
- [ ] No PII in summary (if anonymous)
- [ ] Subjects verified

---

### F6: Follow-up Handling

**Description:**
Process for linking follow-up calls to existing cases.

**Follow-up Flow:**

```
Caller Indicates Follow-up
          │
          ▼
    Access Code? ─── YES ──► Lookup by Code
          │                       │
          NO                      ▼
          │                 Case Found?
          ▼                       │
    Name/Email Search            YES
          │                       │
          ▼                       ▼
    Case(s) Found? ──► YES ──► Verify Correct Case
          │                       │
          NO                      ▼
          │                 Create Interaction
          ▼                       │
    Create New Case               ▼
                           Update Case Status
                                  │
                                  ▼
                           Notify Assignee
```

**Interaction Entity:**

```prisma
model CaseInteraction {
  id                    String   @id @default(uuid())
  case_id               String
  case                  Case     @relation(...)

  // Type
  interaction_type      InteractionType
  source_channel        SourceChannel

  // Content
  notes                 String                    // New information
  ai_summary            String?                   // AI summary of new info

  // Operator
  operator_id           String
  operator              User     @relation(...)

  // Status
  status                InteractionStatus
  qa_reviewer_id        String?
  released_at           DateTime?

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
}

enum InteractionType {
  INITIAL_INTAKE
  FOLLOW_UP_HOTLINE
  FOLLOW_UP_WEB
  INTERNAL_NOTE
}

enum InteractionStatus {
  DRAFT
  PENDING_QA
  IN_QA_REVIEW
  RELEASED
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

2. **My Recent Cases**
   - Last 10 cases submitted
   - Status of each
   - Quick link to view

3. **QA Status**
   - Cases pending QA
   - Cases returned for clarification
   - Cases released today

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
   - Search cases across all clients
   - Search for follow-ups by access code
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
  case_id               String?                   // Resulting case
  interaction_id        String?                   // If follow-up

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

### Intake Endpoints

```
# Session Management
POST   /api/v1/operator/sessions                  # Start operator session
PUT    /api/v1/operator/sessions/:id              # Update session
POST   /api/v1/operator/sessions/:id/end          # End session

# Case Creation
POST   /api/v1/operator/cases                     # Create case (submit to QA)
POST   /api/v1/operator/cases/draft               # Save draft
GET    /api/v1/operator/cases/drafts              # Get my drafts

# Follow-up
GET    /api/v1/operator/cases/lookup              # Lookup by access code
POST   /api/v1/operator/cases/:id/interactions    # Add follow-up interaction
```

### QA Endpoints

```
# Queue Management
GET    /api/v1/qa/queue                           # Get QA queue
POST   /api/v1/qa/cases/:id/claim                 # Claim case for review
POST   /api/v1/qa/cases/:id/unclaim               # Release claim

# Review Actions
PUT    /api/v1/qa/cases/:id                       # Edit case
POST   /api/v1/qa/cases/:id/comments              # Add QA comment
POST   /api/v1/qa/cases/:id/clarify               # Request clarification
POST   /api/v1/qa/cases/:id/reject                # Reject to operator
POST   /api/v1/qa/cases/:id/release               # Release to client
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

### Intake Screen Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◉ LIVE CALL  00:12:34    [Acme Corp]                    [End Call] [Escalate]│
├───────────────────────────────────┬─────────────────────────────────────────┤
│                                   │                                         │
│ INTAKE FORM                       │ AI ASSISTANT                            │
│ ═══════════                       │ ════════════                            │
│                                   │                                         │
│ Call Type: ● Report ○ RFI ○ FU    │ 💡 Suggested Category                   │
│                                   │    Harassment (87%)                     │
│ ▼ Reporter Info                   │    Retaliation (45%)                    │
│   Anonymous: ● Yes ○ No           │    [Use Harassment]                     │
│   Relationship: [Employee ▼]      │                                         │
│   Interpreter: ○ Yes ● No         │ ─────────────────────                   │
│                                   │                                         │
│ ▼ Location                        │ 📝 Suggested Questions                  │
│   [🔍 Search locations...]        │    • When did this start?               │
│   City, State: [          ]       │    • Were there witnesses?              │
│                                   │    • Documented anywhere?               │
│ ▼ Details                         │                                         │
│   ┌─────────────────────────────┐ │ ─────────────────────                   │
│   │ • boss yelled in meeting    │ │                                         │
│   │ • last tuesday              │ │ ⚠️ KEYWORD ALERT                        │
│   │ • worried about retaliation │ │    "retaliation" detected               │
│   │ │                           │ │    [View Escalation Directive]          │
│   └─────────────────────────────┘ │                                         │
│   [🤖 Clean Up Notes]             │                                         │
│                                   │                                         │
│ ▼ Category & Severity             │                                         │
│   Primary: [Harassment ▼]         │                                         │
│   Secondary: [            ▼]      │                                         │
│   Severity: ○ High ● Med ○ Low    │                                         │
│                                   │                                         │
│ ▼ Subjects                        │                                         │
│   [+ Add Subject]                 │                                         │
│   └ John Smith (Manager, Acme)    │                                         │
│                                   │                                         │
├───────────────────────────────────┴─────────────────────────────────────────┤
│ DIRECTIVES  [Show All]                                                      │
│ ✓ Opening Statement  |  ⚠ Harassment Escalation  |  ► Anonymous Guidance    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                          Progress: █████████░░░ 75%         │
│ [Save Draft]                                     [Submit to QA]             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### QA Queue Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ QA Review Queue                                    [🔍 Search] [⚙ Filters]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Filters: [All Clients ▼] [All Severities ▼] [All Operators ▼]               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ │ # │ Client    │ Category    │ Sev │ Operator │ Submitted  │ Wait  │ ◉    │
│ ├───┼───────────┼─────────────┼─────┼──────────┼────────────┼───────┼──────│
│ │ 1 │ Acme Corp │ Harassment  │ 🔴  │ J. Smith │ 2 min ago  │ 2m    │ ▶    │
│ │ 2 │ Beta Inc  │ Fraud       │ 🟡  │ M. Jones │ 15 min ago │ 15m   │ ▶    │
│ │ 3 │ Gamma LLC │ Safety      │ 🟢  │ A. Wong  │ 1 hr ago   │ 1h    │ ▶    │
│ │ 4 │ Delta Co  │ Retaliation │ 🔴  │ S. Patel │ 2 hrs ago  │ 2h    │ ▶    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Summary: 4 pending  •  2 high severity  •  Avg wait: 58 min                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### QA Review Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ QA Review: Case #AC-2026-0142                      [← Back] [Release ✓]     │
├───────────────────────────────────┬─────────────────────────────────────────┤
│                                   │                                         │
│ CASE DETAILS                      │ QA CHECKLIST                            │
│ ═══════════                       │ ════════════                            │
│                                   │                                         │
│ Client: Acme Corp                 │ ☑ Category appropriate                  │
│ Submitted: Jan 28, 2026 10:15 AM  │ ☑ Severity accurate                     │
│ Operator: John Smith              │ ☑ Required directives acknowledged      │
│                                   │ ☑ Summary clear and complete            │
│ ▼ Reporter                        │ ☐ No PII in summary                     │
│   Anonymous: Yes                  │ ☐ Subjects verified                     │
│   Relationship: Employee          │                                         │
│                                   │ ─────────────────────                   │
│ ▼ Location                        │                                         │
│   Main Office, Chicago, IL        │ QA NOTES (Internal)                     │
│                                   │ ─────────────────────                   │
│ ▼ Summary                         │ [Add note...]                           │
│   ┌─────────────────────────────┐ │                                         │
│   │ An anonymous employee       │ │ ─────────────────────                   │
│   │ reports their supervisor    │ │                                         │
│   │ yelled at them during a     │ │ ROUTING PREVIEW                         │
│   │ meeting, causing...  [Edit] │ │ ─────────────────────                   │
│   └─────────────────────────────┘ │ Will route to:                          │
│                                   │ → HR Department                         │
│ ▼ Details [Full Notes]            │ → Sarah Chen (Primary)                  │
│                                   │                                         │
│ ▼ Category & Severity             │                                         │
│   Harassment 🟡 Medium            │                                         │
│                                   │                                         │
│ ▼ Subjects                        │                                         │
│   John Smith (Manager)            │                                         │
│                                   │                                         │
├───────────────────────────────────┴─────────────────────────────────────────┤
│ [Request Clarification]  [Reject to Operator]          [Release to Client]  │
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

### AI-First Checklist Compliance

**Schema Design:**
- [x] Directive schema with semantic fields
- [x] Interaction entity for follow-up context
- [x] Activity logging on all operator actions
- [x] AI-generated content attribution

**Feature Design:**
- [x] Real-time AI assistance during calls
- [x] Post-call AI cleanup and summarization
- [x] Keyword detection for escalation triggers

**API Design:**
- [x] AI endpoints for suggestions and cleanup
- [x] Context-rich responses for operators

**UI Design:**
- [x] AI assistant panel during intake
- [x] One-click AI actions (cleanup, summarize)

---

*End of Operator Console PRD*
