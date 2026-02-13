# RS.40: Flexible Routing & AI-Assisted Triage

**Decision ID:** RS.40
**Status:** APPROVED
**Date:** February 2026
**Category:** Disclosures Module - Escalation & Routing
**References:** WORKING-DECISIONS.md Section 8, TECH-SPEC-AI-AGENT.md

---

## Executive Summary

Replace rigid escalation tiers with **configurable routing rules** and **AI-assisted bulk triage**. Instead of hardcoded "low/medium/high" tiers, admins define flexible routing rules based on any combination of conditions. Regional compliance directors receive items in their queues and use AI natural language commands to efficiently process approvals at scale.

---

## 1. Problem Statement

The original options presented:

- **Option A (Single Tier):** All violations to same queue - treats $275 gift same as $50,000 payment
- **Option B (Value-Based Tiers):** Low/Medium/High by dollar amount only
- **Option C (Risk-Based Tiers):** Multi-factor but requires complex rule engine

**None of these are flexible enough.** Real compliance teams have:

- Regional structures (APAC, EMEA, LATAM, NA directors)
- Custom routing needs per disclosure type
- Volume that requires AI assistance, not manual review of every item
- Need for bulk operations with intelligent filtering

---

## 2. Solution Architecture

### 2.1 Configurable Routing Rules

Admins build routing rules using a condition builder (reuse from workflow engine).

```
ROUTING RULE SCHEMA:
┌─────────────────────────────────────────────────────────────┐
│ Rule: "High-Value APAC Gifts"                               │
├─────────────────────────────────────────────────────────────┤
│ WHEN (all conditions must match):                           │
│   ├── RIU Type = "Gift Disclosure"                          │
│   ├── Submitter Region = "APAC"                             │
│   └── Gift Value > $500                                     │
│                                                             │
│ THEN:                                                       │
│   ├── Route to: Sarah Chen (APAC Compliance Director)       │
│   ├── Priority: High                                        │
│   └── Requires: Director approval for closure               │
└─────────────────────────────────────────────────────────────┘
```

#### Rule Builder Data Model

```typescript
interface RoutingRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number; // Higher priority rules evaluated first

  // Conditions (reuse ConditionGroup from workflow engine)
  conditions: ConditionGroup;

  // Actions when conditions match
  actions: {
    routeTo: RoutingTarget;
    priority: "low" | "medium" | "high" | "critical";
    requiresApproval?: ApprovalRequirement;
    notifications?: NotificationConfig[];
    tags?: string[]; // Auto-apply tags
  };

  // Scope
  appliesTo: {
    riuTypes: string[]; // Which RIU types this rule applies to
    forms?: string[]; // Specific forms (optional)
  };

  createdAt: DateTime;
  updatedAt: DateTime;
  createdBy: string;
}

interface RoutingTarget {
  type: "user" | "team" | "role" | "dynamic";

  // For type = 'user' | 'team'
  targetId?: string;

  // For type = 'role'
  role?: string; // e.g., 'regional_compliance_director'

  // For type = 'dynamic'
  dynamicField?: string; // e.g., 'submitter.region.compliance_director'
}

interface ApprovalRequirement {
  level: "manager" | "director" | "legal" | "cco";
  type: "any" | "all"; // Any one of these OR all of these
  forClosure: boolean; // Required to close the case
}
```

#### Example Routing Rules

```yaml
rules:
  - name: "Government Official - Any Amount"
    conditions:
      all:
        - field: "giver.type"
          operator: "equals"
          value: "Government Official"
    actions:
      routeTo:
        type: "team"
        targetId: "legal-compliance-team"
      priority: "critical"
      requiresApproval:
        level: "legal"
        forClosure: true
      notifications:
        - type: "email"
          to: "cco@company.com"
          template: "government-official-disclosure"

  - name: "Regional Routing - APAC"
    conditions:
      all:
        - field: "submitter.region"
          operator: "equals"
          value: "APAC"
        - field: "value"
          operator: "greaterThan"
          value: 100
    actions:
      routeTo:
        type: "user"
        targetId: "sarah.chen@company.com"
      priority: "medium"
      requiresApproval:
        level: "director"
        forClosure: true

  - name: "Low Value - Manager Only"
    conditions:
      all:
        - field: "value"
          operator: "lessThanOrEqual"
          value: 100
    actions:
      routeTo:
        type: "dynamic"
        dynamicField: "submitter.manager"
      priority: "low"
      requiresApproval:
        level: "manager"
        forClosure: true
```

### 2.2 Regional Queue Assignment

Auto-assign based on HRIS org structure:

```
REGIONAL DIRECTORS:
├── APAC: Sarah Chen
├── EMEA: Marcus Weber
├── LATAM: Ana Rodriguez
└── NA: James Mitchell

Routing logic:
1. Get submitter's region from HRIS data
2. Lookup regional_compliance_director for that region
3. Route to their queue
```

```typescript
interface RegionalAssignment {
  region: string;
  complianceDirector: string; // User ID
  backupDirector?: string; // Fallback if primary unavailable

  // Optional: sub-regions
  subRegions?: {
    name: string;
    assignee: string;
  }[];
}
```

### 2.3 AI-Assisted Bulk Triage (THE KILLER FEATURE)

Regional directors open their queue and use natural language to process items efficiently.

#### Natural Language Commands

```
USER: "Show me all pending approvals over $100 where manager already
       approved. Auto-approve the rest. Give me the exceptions in a table."

AI INTERPRETS:
├── Filter: status = 'pending_approval' AND value > 100 AND manager_approved = true
├── Action: Auto-approve items NOT matching filter (value <= 100 AND manager_approved)
└── Output: Table of remaining items requiring manual review
```

#### AI Response Format

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ✨ Compliance Manager AI                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ I found 47 pending approvals in your queue.                             │
│                                                                         │
│ **Auto-approved (35 items):**                                           │
│ All items under $100 where manager approved - no flags detected.        │
│                                                                         │
│ **Require your review (12 items):**                                     │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Employee    │ Amount │ Gift From        │ Mgr │ Flags              │ │
│ ├─────────────┼────────┼──────────────────┼─────┼────────────────────┤ │
│ │ J. Smith    │ $450   │ Vendor ABC       │ ✓   │ Repeat (3x Q1)     │ │
│ │ T. Wong     │ $275   │ Gov't contractor │ ✓   │ Gov relationship   │ │
│ │ R. Patel    │ $180   │ Client dinner    │ ✓   │ Near threshold     │ │
│ │ M. Johnson  │ $320   │ Conference       │ ✓   │ Travel category    │ │
│ │ ...         │        │                  │     │                    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Save as Report] [Add to Dashboard] [Export] [Review Selected]          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### AI Triage Capabilities

| Capability          | Example Command                     | AI Action                       |
| ------------------- | ----------------------------------- | ------------------------------- |
| **Filter**          | "Show me only government officials" | Apply filter, display table     |
| **Bulk Approve**    | "Auto-approve everything under $50" | Execute with confirmation       |
| **Flag Detection**  | "Which ones are repeat offenders?"  | Query history, flag items       |
| **Aggregate Check** | "Anyone over YTD threshold?"        | Calculate aggregates, highlight |
| **Prioritize**      | "Sort by risk, highest first"       | Multi-factor risk scoring       |
| **Explain**         | "Why is Smith flagged?"             | Show prior disclosures, pattern |

#### Bulk Action Execution

```typescript
interface BulkTriageAction {
  id: string;
  tenantId: string;
  userId: string;

  // What was requested
  naturalLanguageCommand: string;
  interpretedFilter: FilterCriteria;
  interpretedAction: "approve" | "reject" | "flag" | "assign" | "export";

  // Items affected
  matchedItems: string[]; // Case/RIU IDs

  // Execution
  status: "pending_confirmation" | "executing" | "completed" | "failed";
  requiresConfirmation: boolean;

  // Audit
  executedAt?: DateTime;
  auditLog: {
    itemId: string;
    action: string;
    previousState: any;
    newState: any;
  }[];
}
```

---

## 3. AI-Generated Tables → Saveable Artifacts

**Critical Feature:** Any table generated by AI in chat should be saveable to multiple destinations.

### 3.1 Table Generation

When AI generates a table in response to a query, it includes metadata:

```typescript
interface AIGeneratedTable {
  id: string;
  sessionId: string;

  // Display
  title: string;
  columns: TableColumn[];
  rows: TableRow[];

  // Source query (for refresh)
  sourceQuery: {
    naturalLanguage: string;
    interpretedFilter: FilterCriteria;
    entityType: string;
  };

  // Refresh settings
  isLive: boolean; // If true, data refreshes; if false, snapshot
  refreshInterval?: number; // Seconds

  // Timestamps
  generatedAt: DateTime;
  dataAsOf: DateTime;
}

interface TableColumn {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "currency" | "badge" | "link";
  sortable: boolean;
  filterable: boolean;
}
```

### 3.2 Save Destinations

```
┌──────────────────────────────────────────────────────────────┐
│ Save Table As...                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ○ Dashboard Widget                                           │
│   Add to: [Select Dashboard ▼]                               │
│   □ Live (auto-refresh) │ □ Snapshot                         │
│                                                              │
│ ○ Saved View / Tab                                           │
│   Create new view with this filter                           │
│   Name: [________________________]                           │
│                                                              │
│ ○ Report                                                     │
│   □ Add to existing report: [Select ▼]                       │
│   □ Create new report                                        │
│                                                              │
│ ○ Page Section                                               │
│   Add as embedded table on: [Select Page ▼]                  │
│                                                              │
│ ○ Export Only                                                │
│   Format: [CSV ▼] [Excel ▼] [PDF ▼]                          │
│                                                              │
│                              [Cancel]  [Save]                │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Table Artifact Schema

```typescript
interface SavedTableArtifact {
  id: string;
  tenantId: string;

  // Source
  sourceType: "ai_generated" | "manual" | "imported";
  sourceTableId?: string; // Link to AIGeneratedTable

  // Destination
  destinationType: "dashboard" | "view" | "report" | "page";
  destinationId: string;

  // Configuration
  config: {
    title: string;
    columns: string[]; // Which columns to show
    defaultSort?: { column: string; direction: "asc" | "desc" };
    pageSize: number;
    showFilters: boolean;
  };

  // Data source
  dataSource: {
    type: "live_query" | "snapshot";
    query?: FilterCriteria; // For live
    snapshotData?: any[]; // For snapshot
    refreshInterval?: number; // For live, in seconds
    lastRefreshed?: DateTime;
  };

  createdBy: string;
  createdAt: DateTime;
}
```

---

## 4. Browser Extension for Evidence Capture

**New Requirement:** Browser extension/add-in that allows capturing screenshots or highlighted text from any source and sending directly to a case/investigation.

### 4.1 Extension Capabilities

```
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ Ethico Evidence Capture                          [⚙️]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Capture:                                                    │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ 📷          │ │ 📝          │ │ 🌐          │            │
│ │ Screenshot  │ │ Selection   │ │ Full Page   │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                             │
│ Recent Cases:                                               │
│ ├── Case #1234 - Manufacturing Safety                       │
│ ├── Case #1189 - Vendor COI Review                          │
│ └── Case #1156 - Gift Threshold                             │
│                                                             │
│ [🔍 Search cases...]                                        │
│                                                             │
│ Quick Actions:                                              │
│ ├── Send to Activity Feed                                   │
│ ├── Attach to Case                                          │
│ └── Attach to Investigation                                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Capture Types

| Capture Type   | Description                             | Use Case                                        |
| -------------- | --------------------------------------- | ----------------------------------------------- |
| **Screenshot** | Capture visible area or selected region | Slack messages, internal systems, error screens |
| **Selection**  | Highlighted text + source URL           | Email content, document excerpts, chat logs     |
| **Full Page**  | Scroll-capture entire page              | Long documents, conversation threads            |
| **PDF Snap**   | Capture current PDF view                | Contracts, reports, attachments                 |

### 4.3 Evidence Capture Flow

```
USER ACTION                          SYSTEM RESPONSE
─────────────────────────────────────────────────────────────

1. User highlights text in email
   or takes screenshot of Slack

2. Clicks Ethico extension icon     → Extension popup opens

3. Selects capture type             → Captures content
   (Screenshot/Selection)

4. Chooses destination:             → Shows recent cases
   - Case #1234                        or search
   - Investigation #456
   - "New evidence (unlinked)"

5. Adds optional note:              → Text field
   "Email from vendor re: gift"

6. Clicks [Send]                    → Uploads to Azure Blob
                                    → Creates Evidence record
                                    → Links to Case/Investigation
                                    → Posts to Activity Feed
                                    → Shows confirmation
```

### 4.4 Evidence Data Model

```typescript
interface CapturedEvidence {
  id: string;
  tenantId: string;

  // Source
  captureType: "screenshot" | "selection" | "full_page" | "pdf_snap";
  sourceUrl: string;
  sourceTitle: string;
  capturedAt: DateTime;
  capturedBy: string;

  // Content
  content: {
    type: "image" | "text" | "pdf";
    blobUrl: string; // Azure Blob storage URL
    thumbnailUrl?: string;
    textContent?: string; // For selection captures
    metadata: {
      width?: number;
      height?: number;
      fileSize: number;
      mimeType: string;
    };
  };

  // User annotation
  note?: string;
  tags?: string[];

  // Linking
  linkedTo: {
    type: "case" | "investigation" | "riu" | "unlinked";
    entityId?: string;
  };

  // Activity feed entry created
  activityFeedEntryId?: string;

  // Audit
  accessLog: {
    userId: string;
    action: "view" | "download" | "link" | "unlink";
    timestamp: DateTime;
  }[];
}
```

### 4.5 Browser Extension Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER EXTENSION                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │ Popup UI         │    │ Background       │              │
│  │ (React)          │    │ Service Worker   │              │
│  │                  │    │                  │              │
│  │ - Case search    │    │ - Auth token     │              │
│  │ - Capture UI     │    │   management     │              │
│  │ - Recent cases   │    │ - API calls      │              │
│  │ - Status         │    │ - Upload queue   │              │
│  └────────┬─────────┘    └────────┬─────────┘              │
│           │                       │                         │
│           └───────────┬───────────┘                         │
│                       │                                     │
│           ┌───────────▼───────────┐                         │
│           │ Content Script        │                         │
│           │                       │                         │
│           │ - Screenshot capture  │                         │
│           │ - Text selection      │                         │
│           │ - Page scroll capture │                         │
│           └───────────┬───────────┘                         │
│                       │                                     │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │ Ethico API            │
            │                       │
            │ POST /evidence/upload │
            │ GET /cases/recent     │
            │ GET /cases/search     │
            └───────────────────────┘
```

### 4.6 Supported Browsers

| Browser | Extension Type        | Store            |
| ------- | --------------------- | ---------------- |
| Chrome  | Manifest V3 Extension | Chrome Web Store |
| Edge    | Manifest V3 Extension | Edge Add-ons     |
| Firefox | WebExtension          | Firefox Add-ons  |
| Safari  | Safari App Extension  | Mac App Store    |

**Build Approach:** Single codebase with browser-specific manifest files. Use WebExtension Polyfill for cross-browser compatibility.

---

## 5. Integration Points

### 5.1 With TECH-SPEC-AI-AGENT.md

Add new skill to Compliance Manager Agent:

```typescript
const triageSkill: Skill = {
  id: "bulk-triage",
  name: "/triage",
  description: "Process multiple approvals with AI assistance",
  category: "approval-workflow",

  parameters: [
    { name: "filter", type: "natural_language", required: false },
    {
      name: "action",
      type: "enum",
      values: ["approve", "reject", "flag", "export"],
    },
  ],

  examples: [
    '/triage "show all over $100 where manager approved"',
    '/triage "auto-approve under $50"',
    '/triage "flag repeat offenders"',
  ],

  requiresConfirmation: true, // Bulk actions need confirmation
  bulkCapable: true,
};
```

### 5.2 With WORKING-DECISIONS.md Section 8

Update Section 8 (Routing & Escalation) to reference RS.40:

```markdown
### Assignment Models (Client Configurable)

**Updated per RS.40:** Replace fixed assignment models with configurable routing rules.

See RS.40: Flexible Routing & AI-Assisted Triage for:

- Routing rule builder
- Regional queue assignment
- AI-assisted bulk triage
- Natural language queue processing
```

### 5.3 With Activity Feed

Evidence captured via browser extension posts to Activity Feed:

```typescript
interface ActivityFeedEntry {
  // ... existing fields ...

  // New: Evidence capture entry type
  type: "note" | "status_change" | "assignment" | "evidence_capture";

  evidenceCapture?: {
    captureType: string;
    sourceUrl: string;
    thumbnailUrl: string;
    note?: string;
  };
}
```

---

## 6. Build Scope

### 6.1 V1 (MVP)

| Component                                 | Effort | Priority |
| ----------------------------------------- | ------ | -------- |
| Routing rule builder UI                   | Medium | P0       |
| Rule evaluation engine                    | Medium | P0       |
| Regional queue assignment                 | Low    | P0       |
| Basic AI triage (filter + table)          | Medium | P0       |
| Bulk approve/reject actions               | Low    | P0       |
| Table save to dashboard                   | Medium | P1       |
| Chrome extension (screenshot + selection) | High   | P1       |

### 6.2 V2 (Enhancement)

| Component                      | Effort | Notes                                     |
| ------------------------------ | ------ | ----------------------------------------- |
| Natural language rule creation | High   | "Create rule for gov officials over $500" |
| Full multi-browser extension   | Medium | Firefox, Safari, Edge                     |
| Table save to reports/views    | Medium | Additional destinations                   |
| AI risk scoring                | High   | Multi-factor automatic risk calculation   |
| Voice commands for triage      | Low    | "Hey Ethico, approve all under fifty"     |

---

## 7. API Endpoints

### Routing Rules

```
POST   /api/routing-rules              Create rule
GET    /api/routing-rules              List rules
GET    /api/routing-rules/:id          Get rule
PUT    /api/routing-rules/:id          Update rule
DELETE /api/routing-rules/:id          Delete rule
POST   /api/routing-rules/evaluate     Test rule against sample data
PUT    /api/routing-rules/reorder      Change rule priority order
```

### AI Triage

```
POST   /api/triage/interpret           Parse natural language → filter
POST   /api/triage/execute             Execute bulk action
GET    /api/triage/preview             Preview what would be affected
POST   /api/triage/export              Export filtered results
```

### Evidence Capture

```
POST   /api/evidence/upload            Upload captured evidence
GET    /api/evidence/:id               Get evidence details
PUT    /api/evidence/:id/link          Link to case/investigation
DELETE /api/evidence/:id               Delete evidence
GET    /api/cases/recent               Recent cases for extension popup
GET    /api/cases/search               Search cases for linking
```

### Table Artifacts

```
POST   /api/tables                     Save AI-generated table
GET    /api/tables/:id                 Get saved table
PUT    /api/tables/:id                 Update table config
DELETE /api/tables/:id                 Delete saved table
POST   /api/tables/:id/refresh         Refresh live table data
```

---

## 8. File Updates Required

### Must Update

1. **WORKING-DECISIONS.md** (Section 8)
   - Add reference to RS.40
   - Update assignment models section

2. **TECH-SPEC-AI-AGENT.md** (Section 5 - Skills)
   - Add `/triage` skill definition
   - Add `/save-table` skill definition
   - Update Compliance Manager agent available skills

3. **TECH-SPEC-AI-INTEGRATION.md**
   - Add bulk triage action patterns
   - Add table artifact generation patterns

### New Files

1. **02-MODULES/BROWSER-EXTENSION-PRD.md**
   - Full PRD for evidence capture extension
   - Cross-browser requirements
   - Security considerations

2. **.planning/phases/XX-browser-extension/**
   - Implementation tasks for extension build

---

## 9. Decision Summary

| Decision          | Choice                     | Rationale                                   |
| ----------------- | -------------------------- | ------------------------------------------- |
| Escalation model  | Flexible routing rules     | Admin-configurable beats hardcoded tiers    |
| Triage approach   | AI natural language        | Directors process 100s of items efficiently |
| Regional routing  | HRIS-based auto-assignment | Leverage existing org structure             |
| Table persistence | Multi-destination save     | Tables useful in many contexts              |
| Evidence capture  | Browser extension          | Capture from any source, link to case       |

---

## Appendix: GSD Instructions

When implementing this specification:

1. **Phase the work:**
   - Phase A: Routing rule builder + evaluation engine
   - Phase B: Regional queue assignment
   - Phase C: AI triage (natural language → filter → table)
   - Phase D: Table save functionality
   - Phase E: Chrome extension MVP
   - Phase F: Multi-browser extension

2. **Reuse existing components:**
   - Condition builder from workflow engine
   - Table components from existing UI
   - Activity feed integration patterns

3. **Test scenarios:**
   - 4 regional directors, 500 pending items
   - Complex routing rules (10+ conditions)
   - Bulk approve 100 items in <5 seconds
   - Extension capture from Gmail, Slack, SharePoint

4. **Update these files after implementation:**
   - WORKING-DECISIONS.md Section 8
   - TECH-SPEC-AI-AGENT.md Section 5
   - Add browser extension to product roadmap
