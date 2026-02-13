# Phase 9: Campaigns & Disclosures - Complete Specification

**Version:** 1.0
**Last Updated:** February 2026
**Status:** Ready for GSD Planning
**Dependencies:** Phase 4 (entities), Phase 7 (notifications), Phase 8 (Employee Portal)

This document consolidates all RS decisions (RS.22-RS.58) for the Campaigns & Disclosures module. GSD must use this spec when creating Phase 9 plans.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Form Builder](#2-form-builder) (RS.22-RS.34)
3. [Case Creation Rules](#3-case-creation-rules) (RS.35-RS.39)
4. [Routing & AI Triage](#4-routing--ai-triage) (RS.40, RS.47-RS.48)
5. [Conflict Detection](#5-conflict-detection) (RS.41-RS.45, RS.49)
6. [Conflict Resolution](#6-conflict-resolution) (RS.46)
7. [Campaign Management](#7-campaign-management) (RS.50-RS.55)
8. [Disclosure Review](#8-disclosure-review) (RS.56-RS.58)
9. [Build Phases](#9-build-phases)
10. [API Endpoints](#10-api-endpoints)
11. [Data Models](#11-data-models)

---

## 1. Overview

### What This Module Delivers

1. **Disclosure Forms** - COI, gifts, outside employment, custom
2. **Campaign Engine** - Target employees, send reminders, track completion
3. **Conflict Detection** - Cross-system matching, auto-flagging
4. **Threshold Rules** - Auto-create cases when limits exceeded
5. **Approval Workflows** - Route disclosures through review chains
6. **AI Triage** - Natural language bulk processing of approvals
7. **Analytics** - Campaign dashboards, completion tracking

### Key Architecture Decisions

| Decision           | Choice                                                |
| ------------------ | ----------------------------------------------------- |
| Form builder       | Full expression engine with nested repeaters          |
| Translations       | Parent-child model (master + localized children)      |
| Routing            | Configurable rules via workflow engine                |
| Conflict detection | Cross-system (disclosure + vendor + HRIS + cases)     |
| AI triage          | Natural language → table preview → confirm → execute  |
| Approval channels  | Web, mobile swipe, email links, email reply, AI voice |

---

## 2. Form Builder (RS.22-RS.34)

### RS.22: Form Builder Location

**Decision:** Integrated builder (forms built within disclosure/campaign module)

### RS.23: Field Types

**Decision:** Full compliance field set

```
FIELD TYPES:
├── Basic: text, number, date, dropdown, checkbox, radio
├── Compliance-specific:
│   ├── Relationship mapper (entity → person relationships)
│   ├── Dollar threshold (currency with threshold checking)
│   ├── Recurring date (annual, quarterly tracking)
│   ├── Entity lookup (search vendor master, HRIS)
│   └── Signature capture
├── Advanced:
│   ├── File upload (with evidence chain)
│   ├── Calculated fields (SUM, IF, LOOKUP, date math)
│   └── Conditional visibility
```

### RS.24: Drafts

**Decision:** Auto-save drafts with resume capability

- Save progress automatically every 30 seconds
- Resume from any device
- Draft expiration configurable (default: 30 days)

### RS.25: Attachments

**Decision:** Evidence chain attachments

- Version tracking on attachments
- Audit trail (who uploaded, when, modifications)
- Virus scanning before storage
- Link attachments to specific form fields

### RS.26: Routing

**Decision:** Configurable routing rules (reuse workflow engine)

- Route based on any field value or combination
- Dynamic assignee (submitter's manager, regional director, etc.)
- Supports parallel approvers

### RS.27: Validation

**Decision:** Full validation engine

- Required fields
- Format validation (email, phone, currency)
- Cross-field validation (end date > start date)
- Threshold warnings (soft) vs. blocks (hard)

### RS.28: Calculated Fields

**Decision:** Full expression engine

```
SUPPORTED EXPRESSIONS:
├── Arithmetic: +, -, *, /, ()
├── Functions: SUM(), AVG(), COUNT(), MIN(), MAX()
├── Conditionals: IF(condition, then, else)
├── Lookups: LOOKUP(field, table, column)
├── Date math: DATEDIFF(), DATEADD(), TODAY()
├── Text: CONCAT(), LEFT(), RIGHT(), UPPER()
└── Aggregates: Can reference repeating section values
```

### RS.29: Repeating Sections

**Decision:** Nested repeaters with aggregation

```
EXAMPLE: COI Disclosure
├── Entities[] (repeater)
│   ├── Entity name
│   ├── Relationship type
│   ├── Ownership %
│   └── Relationships[] (nested repeater)
│       ├── Related person
│       ├── Relationship type
│       └── Since date
└── TOTAL_ENTITIES: COUNT(Entities)
```

### RS.30: Dropdowns

**Decision:** Configurable cascades

- Admin-defined dropdown chains
- Parent selection filters child options
- Supports "Other" with free text

### RS.31: Analytics

**Decision:** Full form analytics

- Completion rates by field
- Drop-off analysis
- Average completion time
- Field-level error rates

### RS.32: Versioning

**Decision:** Full versioning with migration

```
VERSIONING BEHAVIOR:
├── Published form = immutable snapshot
├── New version = copy + modifications
├── In-progress submissions:
│   ├── Continue on version they started
│   ├── Option to migrate to new version
│   └── Admin can force migration
└── Historical submissions: Always show version they used
```

### RS.33: Translation Model

**Decision:** Parent-child architecture

```
MASTER FORM (Source of Truth)
├── Language: English (or org's canonical language)
├── Version: 1.3
└── CHILD TRANSLATIONS
    ├── Spanish (es) - Based on Master v1.3 ✓
    ├── French (fr) - Based on Master v1.2 ⚠️ (stale)
    └── German (de) - Based on Master v1.3 ✓

STALE FLAG: If parent updated, children show warning
EMPLOYEE VIEW: Auto-select based on HRIS preferred language
```

### RS.34: Export

**Decision:** Full export capability

- PDF (individual submission)
- Excel (bulk export with all fields)
- CSV (data only)
- Audit report (submission + all approvals + attachments)

---

## 3. Case Creation Rules (RS.35-RS.39)

### RS.35: Auto-Case Creation

**Decision:** Multi-trigger pattern system

```
TRIGGER PATTERNS:

1. RIU TYPE DEFAULT
   RIU Type: Hotline Report → Create case = YES (always)
   EXCEPTIONS:
   ├── Category = "Request for Information" → No case
   └── Category = "Wrong Number" → No case

2. SINGLE FIELD VALUE
   RIU Type: Gift Disclosure
   IF gift_category = "Travel" → Create case

3. AGGREGATE THRESHOLD
   RIU Type: Gift Disclosure
   IF YTD_aggregate_from_same_source > $500 → Create case

4. KEYWORD DETECTION
   RIU Type: Employee Feedback
   HIGH RISK keywords: "harassment", "discrimination", "retaliation"
   MEDIUM RISK keywords: "bullying", "hostile", "unsafe"
   → Create case with appropriate severity
```

### RS.36: Case Linking

**Decision:** Full context bundle

```
WHEN CASE CREATED FROM DISCLOSURE:
├── Link to source RIU
├── Link related RIUs (same person, same entity)
├── Include person history (prior disclosures, cases)
├── Pattern flags (repeat offender, aggregate threshold)
└── Recommended actions based on rules
```

### RS.37: In-Flight Threshold Changes

**Decision:** Grandfather existing + prospective new rules

- Submissions in progress: Original rules apply
- Retroactive flag: Option to flag historical items (no auto-case)
- Audit trail: Log threshold change and when it took effect

### RS.38: Aggregate Calculations

**Decision:** Multi-dimensional rolling windows

```
AGGREGATE DIMENSIONS:
├── Source (same giver/entity)
├── Category (gifts, meals, entertainment)
├── Relationship type (vendor, customer, government)
├── Time window (rolling 12 months, not calendar year)
└── Org hierarchy (roll up to cost center, BU, region)

ROLLING WINDOW: Catches threshold manipulation
├── Dec 15: $400 gift
├── Jan 5: $400 gift
├── Rolling total: $800 (exceeds $500 threshold)
└── Calendar year would show: $400 each year ✗
```

### RS.39: Threshold Exceptions

**Decision:** Pre-approval + post-hoc exceptions

```
V1 SCOPE:
├── Pre-approval workflow: Request → Approve/Deny → Link to disclosure
├── Post-hoc exception flag: Mark case as "exception granted" with reason
└── Basic audit trail (who granted, when, why)

DEFERRED TO V2:
├── Exception categories
├── Validity periods
├── Recurring exceptions
└── Exception budgets
```

---

## 4. Routing & AI Triage (RS.40, RS.47-RS.48)

### RS.40: Flexible Routing Rules

**Decision:** Configurable rules via workflow engine (not hardcoded tiers)

```
ROUTING RULE EXAMPLE:
Rule: "High-Value APAC Gifts"
├── Conditions: Region = APAC AND Value > $500
├── Route to: Sarah Chen (APAC Compliance Director)
└── Requires: Director approval for closure

REGIONAL QUEUE ASSIGNMENT:
├── APAC: Sarah Chen
├── EMEA: Marcus Weber
├── LATAM: Ana Rodriguez
└── NA: James Mitchell
Auto-route based on submitter's region from HRIS
```

### RS.47: AI-Assisted Bulk Triage

**Decision:** Natural language → preview table → confirm → execute

```
FLOW:
1. User: "Approve all under $100 where manager approved"
2. AI generates table IN CHAT (no action yet)
3. User scrolls/reviews table
4. User clicks [Confirm & Approve All]
5. Action executes, logged as evidence

SAFEGUARDS:
├── No blind bulk actions
├── Table always shown first
├── Explicit confirmation with count
├── Undo window (5 min)
└── Full audit trail
```

### RS.48: User-Created Data Tables

**Decision:** Dual-path table creation

```
PATH 1: Manual "New Table" Builder
├── Select data sources
├── Drag/drop columns
├── Add filters, grouping, aggregates
└── Save

PATH 2: AI-Generated
├── "Show me conflicts by region with totals"
├── AI generates table
└── Same save options

ANY TABLE CAN BE:
├── Saved as view/tab
├── Pinned to dashboard (live or snapshot)
├── Exported (CSV, Excel, PDF)
├── Added to report
├── Shared with team
└── Scheduled for email delivery
```

---

## 5. Conflict Detection (RS.41-RS.45, RS.49)

### RS.41: Conflict Detection Scope

**Decision:** Cross-system integration (not just disclosure-based)

```
DATA SOURCES:
├── Disclosures (what employees tell us)
├── Vendor Master (who we do business with)
├── HRIS (org structure, roles, departments)
├── AP/Procurement (who approves what spend)
└── Case History (prior issues with this person)
```

### RS.42: Conflict Surfacing

**Decision:** Contextual alerts + simple queue view

```
INLINE ALERT ON DISCLOSURE:
┌─────────────────────────────────────────┐
│ ⚠️ CONFLICT DETECTED (Severity: High)   │
│                                         │
│ "Acme Consulting LLC" matches:          │
│ • Vendor: Acme Consulting (V-4521)      │
│ • Annual spend: $847,000                │
│ • John approved 6 POs totaling $234K    │
│                                         │
│ [View Vendor] [View POs] [Dismiss]      │
└─────────────────────────────────────────┘

QUEUE VIEW: Saved filter "has_conflict = true"
```

### RS.43: False Positive Dismissals

**Decision:** Categorized dismissal + exclusion list

```
DISMISSAL CATEGORIES:
├── False match - different entity
├── False match - name collision
├── Already reviewed (link case)
├── Pre-approved exception
├── Below threshold after review
└── Other (requires notes)

EXCLUSION LIST:
☑ Don't flag this match again
→ Creates exclusion: employee + entity + conflict type
→ Future matches auto-suppressed
```

### RS.44: Entity Matching

**Decision:** Fuzzy matching + address normalization

```
MATCHING TECHNIQUES:
├── Normalization (case, punctuation, whitespace)
├── Abbreviation expansion (Corp ↔ Corporation)
├── Levenshtein distance
├── Jaro-Winkler similarity
├── Phonetic matching (Soundex/Metaphone)
├── Token overlap
└── Address normalization

CONFIGURABLE THRESHOLDS:
├── Name match: 0.85 (default)
├── Address match: 0.90 (default)
└── TIN match boost: +0.3 when TINs match
```

### RS.45: Conflict Types (Out of Box)

**Decision:** Extended set

```
V1 CONFLICT TYPES:
├── Vendor match (disclosed entity = vendor)
├── Approval authority (can approve spend to entity)
├── Prior case history (repeat COI issues)
├── HRIS match (disclosed person works here / nepotism)
├── Gift aggregates (rolling total from same source)
└── Relationship patterns (multiple employees → same entity)

V2 ADD-ONS:
├── FCPA module (government relationships)
├── Competitor module
└── M&A module
```

### RS.49: Conflict History

**Decision:** Entity timeline

```
ENTITY: "Acme Corp"

Timeline:
├── 2024-03: J. Smith disclosed vendor relationship → Approved
├── 2024-08: M. Chen disclosed gift ($200) → Approved
├── 2025-01: T. Wong disclosed consulting work → Mitigated
├── 2025-06: R. Patel disclosed family member employed → Under review
└── 2026-01: J. Smith disclosed gift ($150) → Pending

Shows all conflicts involving entity across all employees/time
```

---

## 6. Conflict Resolution (RS.46)

### RS.46: Conflict Resolution Workflow

**Decision:** Structured workflow on shared engine + multi-channel approval

```
WORKFLOW ENGINE: Same as policies, campaigns, cases
├── Simple conflicts → simple workflow (1-2 steps)
├── Complex conflicts → multi-step with checklists
└── Configurable per conflict type + severity

V1 APPROVAL CHANNELS (ALL):
├── Web (desktop)
├── Mobile app (swipe interface)
├── Email magic links
├── Email reply parsing
└── AI voice/text commands

EVIDENCE: All channels create identical evidence records
```

### Mobile Swipe UX

```
┌─────────────────────────────────────────┐
│  ← REJECT          APPROVE →            │
│  ┌─────────────────────────────────┐    │
│  │  John Smith                     │    │
│  │  Gift: Business dinner          │    │
│  │  Value: $275                    │    │
│  │  From: Acme Corp (Vendor)       │    │
│  │  Manager: ✓ Approved            │    │
│  └─────────────────────────────────┘    │
│         Swipe or tap arrows             │
└─────────────────────────────────────────┘
```

### Email Approval

```
V1: Magic links (one-click signed URLs)
V1: Email reply parsing ("APPROVE" in reply body)

Both create evidence record with:
├── Timestamp
├── Approver verification
├── Raw email/click logged
└── Audit trail
```

---

## 7. Campaign Management (RS.50-RS.55)

### RS.50: Campaign Targeting

**Decision:** Segment builder with "mom test" UX

```
SIMPLE MODE (default):
├── Department picker (checkboxes)
├── Location picker (checkboxes)
├── "Include their teams" toggle
└── Preview count + list

ADVANCED (hidden until needed):
├── Role / job title
├── Manager hierarchy depth
├── Tenure / hire date
├── Custom attributes
├── Previous campaign responses
├── Exclusion rules

ALWAYS VISIBLE:
"Everyone in Finance and Procurement, at US locations,
 who has been here more than 90 days"
 183 people                    [Preview List]
```

### RS.51: Reminder Escalation

**Decision:** Configurable sequence + repeat non-responder flag

```
REMINDER SEQUENCE:
├── Reminder 1: Day 5 → Employee only
├── Reminder 2: Day 10 → Employee + Manager
├── Reminder 3: Day 13 → Employee + Manager + HR
└── Deadline: Day 14 → Create non-compliance case

SMART FLAG:
☑ Auto-escalate repeat non-responders
"If 2+ late responses in 12 months, CC manager on FIRST reminder"
```

### RS.52: Campaign Translations

**Decision:** Parent-child model (same as RS.33)

- Master campaign in base language
- Child translations per language
- Employee sees their preferred language (from HRIS)
- Stale translation warnings

### RS.53: Campaign Scheduling

**Decision:** Scheduled + staggered rollout + blackout dates

```
SCHEDULING:
├── Immediate or scheduled (date/time/timezone)
├── Staggered rollout in waves
│   ├── Wave 1: Feb 15 - Finance (pilot)
│   ├── Wave 2: Feb 17 - All US
│   └── Wave 3: Feb 19 - International
└── Blackout dates (holidays, year-end, events)

BLACKOUT: Auto-warn if scheduled during blackout period
```

### RS.54: A/B Testing

**Decision:** None for V1

- Compliance campaigns are mandatory
- Optimization has diminishing returns
- Manager CC drives completion, not subject lines

### RS.55: Campaign Dashboard

**Decision:** All three levels as flexible widgets

```
WIDGET LIBRARY:
├── Campaign Status: Progress bars, completion %, overdue
├── Compliance View: Department breakdown, trends, at-risk
├── Executive: Board metrics, benchmarks, audit exports

FLEXIBILITY:
├── Drag-and-drop layout
├── User-created table widgets (RS.48)
├── AI-generated tables pinnable
├── Role-based defaults
├── Scheduled report delivery
```

---

## 8. Disclosure Review (RS.56-RS.58)

### RS.56: Disclosure Review Routing

**Decision:** Configurable rules (reuse workflow engine)

```
EXAMPLE RULES:

Rule: "No Conflicts Declared"
├── Condition: All answers = "No"
└── Action: Auto-approve

Rule: "Low Value Gifts"
├── Condition: Value < $100 AND no flags
└── Action: Route to manager

Rule: "Vendor Conflict Detected"
├── Condition: Conflict alert triggered
└── Action: Route to Compliance + Legal
```

### RS.57: Disclosure Review Escalation

**Decision:** Reminders only (simple)

```
WHEN REVIEW STALLS:
├── Day 3: Reminder email to reviewer
├── Day 7: Second reminder
├── Day 14: Final reminder
└── Optional: CC compliance after X days

NOT BUILDING: Auto-escalation chains
(If reviewer not doing reviews, that's a management conversation)
```

### RS.58: Escalation Configuration

**Decision:** Workflow engine powers all escalation

```
ONE ENGINE FOR ALL:
├── Policy approvals
├── Campaign workflows
├── Case assignments
├── Conflict resolution
├── Disclosure routing
├── Disclosure review escalation
└── Any future workflow

"Simple chain" is just a simple workflow config
Don't build two systems
```

---

## 9. Build Phases

### Phase 9A: Backend Foundation (Can parallel with Phase 8)

```
09-A1: Disclosure form schema engine
       - Field types, validation, calculated fields
       - Repeating sections with nesting
       - Version control

09-A2: Form template CRUD
       - Create, clone, publish workflow
       - Parent-child translation links

09-A3: Threshold configuration engine
       - Rule builder for auto-case creation
       - Aggregate calculation service
       - Rolling window calculations

09-A4: Conflict detection service
       - Cross-system matching (vendor, HRIS, cases)
       - Fuzzy matching algorithms
       - Conflict alert generation

09-A5: Conflict surfacing & dismissal
       - Contextual alert API
       - Dismissal categories
       - Exclusion list management

09-A6: Approval workflow integration
       - Disclosure routing rules
       - Multi-channel approval handlers
       - Evidence logging
```

### Phase 9B: Campaign Engine (Can parallel with Phase 8)

```
09-B1: Campaign targeting service
       - Segment builder backend
       - HRIS integration for attributes
       - Audience preview

09-B2: Campaign scheduling service
       - Scheduled sends
       - Wave-based rollout
       - Blackout date enforcement

09-B3: Reminder sequence engine
       - Configurable reminder schedules
       - Manager CC logic
       - Repeat non-responder detection

09-B4: Campaign translation service
       - Parent-child linking
       - Stale translation detection
       - Language preference routing
```

### Phase 9C: AI & Tables (Requires Phase 5 complete)

```
09-C1: AI triage service
       - Natural language → filter interpretation
       - Bulk action preview generation
       - Confirmation + execution flow

09-C2: User-created tables
       - Table builder API
       - Save destinations (dashboard, view, report)
       - Scheduled delivery

09-C3: AI skills for disclosures
       - /triage skill
       - /save-table skill
       - Conflict explanation skill
```

### Phase 9D: Frontend (Requires Phase 8 Employee Portal)

```
09-D1: Form builder UI
       - Visual form designer
       - Field configuration panels
       - Preview mode

09-D2: Campaign builder UI
       - Targeting interface (mom-test UX)
       - Scheduling interface
       - Reminder configuration

09-D3: Disclosure submission UI
       - Employee form completion
       - Draft save/resume
       - Attachment upload

09-D4: Conflict review UI
       - Contextual alerts display
       - Dismissal flow
       - Entity timeline view

09-D5: Approval interfaces
       - Web approval queue
       - Mobile swipe interface
       - Email link handlers

09-D6: Campaign dashboard
       - Widget library
       - Flexible layout
       - Export/scheduling
```

### Phase 9E: Integration & Polish

```
09-E1: Browser extension MVP
       - Chrome extension for evidence capture
       - Screenshot + selection
       - Link to case/investigation

09-E2: Email approval integration
       - Magic link generation
       - Reply parsing service
       - Inbound email handler

09-E3: Full integration testing
       - End-to-end disclosure flow
       - Conflict detection accuracy
       - Multi-channel approval testing
```

---

## 10. API Endpoints

### Forms

```
POST   /api/forms                     Create form template
GET    /api/forms                     List form templates
GET    /api/forms/:id                 Get form with fields
PUT    /api/forms/:id                 Update form (draft)
POST   /api/forms/:id/publish         Publish form version
GET    /api/forms/:id/versions        List form versions
POST   /api/forms/:id/translations    Create translation child
```

### Disclosures

```
POST   /api/disclosures               Submit disclosure
GET    /api/disclosures               List disclosures (filtered)
GET    /api/disclosures/:id           Get disclosure details
PUT    /api/disclosures/:id           Update draft disclosure
POST   /api/disclosures/:id/submit    Submit final
GET    /api/disclosures/:id/conflicts Get detected conflicts
POST   /api/disclosures/:id/approve   Approve disclosure
POST   /api/disclosures/:id/reject    Reject disclosure
```

### Conflicts

```
GET    /api/conflicts                 List conflicts (queue)
GET    /api/conflicts/:id             Get conflict details
POST   /api/conflicts/:id/dismiss     Dismiss with category
POST   /api/conflicts/:id/escalate    Escalate conflict
GET    /api/conflicts/entity/:name    Entity timeline
POST   /api/conflicts/exclusions      Create exclusion rule
GET    /api/conflicts/exclusions      List exclusions
```

### Campaigns

```
POST   /api/campaigns                 Create campaign
GET    /api/campaigns                 List campaigns
GET    /api/campaigns/:id             Get campaign details
PUT    /api/campaigns/:id             Update campaign (draft)
POST   /api/campaigns/:id/launch      Launch campaign
GET    /api/campaigns/:id/progress    Get completion stats
POST   /api/campaigns/:id/remind      Send reminders
GET    /api/campaigns/:id/audience    Preview audience
```

### AI Triage

```
POST   /api/triage/interpret          Parse natural language → filter
POST   /api/triage/preview            Preview matching items (no action)
POST   /api/triage/execute            Execute bulk action (after confirm)
```

### Tables

```
POST   /api/tables                    Save user-created table
GET    /api/tables                    List saved tables
GET    /api/tables/:id                Get table definition
PUT    /api/tables/:id                Update table config
DELETE /api/tables/:id                Delete table
POST   /api/tables/:id/refresh        Refresh live table data
POST   /api/tables/:id/export         Export table data
```

### Approvals (Multi-Channel)

```
POST   /api/approvals/:id/web         Web approval
POST   /api/approvals/:id/mobile      Mobile approval
GET    /api/approvals/link/:token     Magic link approval
POST   /api/approvals/email           Inbound email handler
```

---

## 11. Data Models

### Core Entities

```typescript
// Form Template
interface FormTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: "coi" | "gift" | "outside_employment" | "attestation" | "custom";

  // Versioning
  version: number;
  status: "draft" | "published" | "archived";
  publishedAt?: DateTime;

  // Translation
  parentFormId?: string; // If translation child
  language: string;

  // Schema
  fields: FormField[];
  sections: FormSection[];
  validationRules: ValidationRule[];
  calculatedFields: CalculatedField[];

  // Metadata
  createdBy: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}

// Disclosure Submission
interface Disclosure {
  id: string;
  organizationId: string;
  formTemplateId: string;
  formVersion: number;

  // Submitter
  submittedBy: string; // Person ID
  submittedAt?: DateTime;

  // Status
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";

  // Data
  responses: Record<string, any>; // Field ID → value
  attachments: Attachment[];

  // Workflow
  currentWorkflowStepId?: string;
  assignedTo?: string;

  // Conflict detection
  conflicts: ConflictAlert[];

  // Audit
  createdAt: DateTime;
  updatedAt: DateTime;
}

// Conflict Alert
interface ConflictAlert {
  id: string;
  organizationId: string;
  disclosureId: string;

  // Detection
  conflictType:
    | "vendor_match"
    | "approval_authority"
    | "prior_case"
    | "hris_match"
    | "gift_aggregate"
    | "relationship_pattern";
  severity: "low" | "medium" | "high" | "critical";

  // Context
  summary: string;
  relatedEntities: RelatedEntity[];
  severityFactors: SeverityFactor[];

  // Resolution
  status: "open" | "dismissed" | "escalated" | "resolved";
  dismissedCategory?: string;
  dismissedReason?: string;
  dismissedBy?: string;
  dismissedAt?: DateTime;

  // Exclusion
  excludeFromFuture: boolean;
  exclusionId?: string;

  createdAt: DateTime;
}

// Campaign
interface Campaign {
  id: string;
  organizationId: string;
  name: string;
  description?: string;

  // Type
  type: "disclosure" | "attestation" | "survey";
  formTemplateId: string;

  // Targeting
  targetingRules: TargetingRule[];
  audienceCount: number;

  // Scheduling
  status: "draft" | "scheduled" | "active" | "completed" | "cancelled";
  scheduledLaunch?: DateTime;
  deadline: DateTime;
  waves?: CampaignWave[];

  // Reminders
  reminderSequence: ReminderStep[];

  // Translation
  parentCampaignId?: string;
  language: string;

  // Metrics
  completedCount: number;
  overdueCount: number;

  createdBy: string;
  createdAt: DateTime;
}

// Campaign Assignment
interface CampaignAssignment {
  id: string;
  organizationId: string;
  campaignId: string;
  personId: string;

  // Status
  status: "pending" | "in_progress" | "completed" | "overdue";
  dueDate: DateTime;

  // Completion
  disclosureId?: string; // Link to submitted disclosure
  completedAt?: DateTime;

  // Reminders
  remindersSent: number;
  lastReminderAt?: DateTime;
  managerNotified: boolean;

  createdAt: DateTime;
}

// Threshold Rule
interface ThresholdRule {
  id: string;
  organizationId: string;
  name: string;

  // Applies to
  formTemplateIds: string[];

  // Conditions
  conditions: RuleCondition[];
  aggregateConfig?: AggregateConfig;

  // Actions
  action: "create_case" | "flag_review" | "notify";
  caseTemplate?: string;
  notifyUsers?: string[];

  isActive: boolean;
  createdAt: DateTime;
}

// Conflict Exclusion
interface ConflictExclusion {
  id: string;
  organizationId: string;

  // Scope
  employeeId: string;
  matchedEntity: string;
  conflictType: string;

  // Source
  createdFromDismissalId: string;
  reason: string;
  notes?: string;

  // Validity
  scope: "permanent" | "time_limited";
  expiresAt?: DateTime;
  isActive: boolean;

  createdBy: string;
  createdAt: DateTime;
}

// User-Created Table
interface UserDataTable {
  id: string;
  organizationId: string;
  createdBy: string;

  name: string;
  createdVia: "builder" | "ai_generated" | "import";
  aiPrompt?: string;

  // Definition
  dataSources: string[];
  columns: TableColumn[];
  filters: FilterCriteria[];
  groupBy?: string[];
  aggregates?: AggregateDefinition[];

  // Destinations
  destinations: TableDestination[];

  // Sharing
  visibility: "private" | "team" | "org";

  // Scheduling
  schedule?: ScheduleConfig;

  createdAt: DateTime;
  updatedAt: DateTime;
}
```

---

## Summary

This specification captures all RS.22-RS.58 decisions for Phase 9: Campaigns & Disclosures.

**Key Themes:**

1. **Reuse workflow engine** - Same engine powers all routing and approval
2. **Parent-child translations** - Master content with localized children
3. **Cross-system conflict detection** - Not just disclosure data
4. **AI-assisted triage** - Natural language bulk processing with review step
5. **Multi-channel approvals** - Web, mobile, email, AI voice
6. **Flexible dashboards** - User-created tables, AI-generated reports
7. **Mom-test UX** - Power under hood, simplicity on surface

**GSD should use this spec to create detailed plans for Phase 9.**
