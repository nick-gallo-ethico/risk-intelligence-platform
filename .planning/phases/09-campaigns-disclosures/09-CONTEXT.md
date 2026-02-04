# Phase 9: Campaigns & Disclosures - Context Document

**Created**: 2026-02-04
**Source**: /gsd:discuss-phase 9 conversation
**Decisions**: RS.22 - RS.60

---

## Overview

Phase 9 enables outbound compliance campaigns - COI disclosures, gift tracking, outside employment, attestations - with threshold-based auto-case creation and conflict detection.

**Dependencies**: Phase 4 (Campaign entity), Phase 7 (notifications), Phase 8 (Employee Portal)

**Success Criteria**:
1. Compliance officers can create campaigns targeting employees by business unit, location, or role
2. Employees receive campaign assignments and can complete disclosure forms
3. Gift disclosures exceeding configured thresholds automatically create Cases for review
4. Conflict detection flags potential issues across a person's disclosure history
5. Campaign dashboards show completion rates, overdue counts, and send reminders

---

## Decision Records

### Disclosure Forms & Form Builder

#### RS.22: Disclosure Form Fields
**Decision**: Full compliance kit - comprehensive field set for all disclosure types

**Fields**:
- **Relationship party**: Who is the relationship with (name, org, title)
- **Relationship type**: Enum (family, friend, former colleague, investor, board member, vendor, customer, government)
- **Nature of relationship**: Detailed description
- **Relationship dates**: Start date, end date (or ongoing)
- **Financial interest**: Amount, percentage, value ranges
- **Disclosure category**: Gift, entertainment, travel, outside employment, investment, family relationship
- **Conflict assessment**: Does employee believe this creates a conflict? Free text explanation
- **Mitigation proposed**: How employee proposes to handle it
- **Attachments**: Supporting documents, contracts, gift receipts

#### RS.23: Nested Repeaters
**Decision**: Support nested repeaters with depth limit

**Structure**:
```
Gift Disclosure
├── Gift (repeater)
│   ├── Description
│   ├── Value
│   ├── Date
│   └── Recipients (nested repeater)
│       ├── Name
│       ├── Title
│       └── Relationship
```

**Implementation**:
- Maximum 2 levels of nesting
- No nesting inside nesting (prevents infinite recursion)
- Each level stores as JSON array
- UI shows collapsible sections

#### RS.24: Expression Engine
**Decision**: Full expression engine with calculated fields

**Capabilities**:
- LOOKUP, SUM, IF, DATEDIFF, CONCAT functions
- Cross-field references
- Conditional logic
- Rolling calculations

**Storage**:
- Calculate on change (client-side preview)
- Recalculate on submit (server authoritative)
- Store final values, not formulas

#### RS.25: Attachment Evidence Chain
**Decision**: Full evidence chain for compliance-grade attachments

**Implementation**:
- SHA-256 hash on upload
- Version tracking (replace creates new version, old preserved)
- Audit trail (who uploaded, when, from where)
- Tamper detection (hash mismatch = flag)
- Retention policy (keep forever for compliance, configurable per org)

**Storage**:
- Azure Blob with immutable storage tier
- Metadata in database (hash, version, uploader, timestamp)
- Soft delete only (compliance requirement)

#### RS.26: Form Translation Model
**Decision**: Parent-child model for translations

**Structure**:
```
Master Form (English) ─────────────────────────────
    │                                              │
    ├── Child: Spanish Translation                 │
    │   └── Links to Master v3                     │
    │                                              │
    ├── Child: French Translation                  │
    │   └── Links to Master v3                     │
    │                                              │
    └── Child: German Translation                  │
        └── Links to Master v2 (stale!)            │
```

**Behavior**:
- Master form is source of truth
- Translations link to specific master version
- Stale detection: translation.masterVersion < master.currentVersion
- Update workflow: flag stale → AI re-translate → human review → publish

#### RS.27: Migration Support
**Decision**: Full migration support with legacy field mapping

**Approach**:
- Import legacy forms with unmapped fields preserved
- Map legacy fields to new schema where possible
- "Other" bucket for fields that don't map
- Audit trail of original import

#### RS.28: Archive Export
**Decision**: Full archive export with all metadata

**Export Package**:
- Form definition (JSON schema)
- All responses (with submission metadata)
- Attachments (with evidence chain)
- Audit trail
- Translations
- Threshold configurations

**Format**: ZIP with manifest.json

### Threshold Rules & Auto-Case Creation

#### RS.35: Threshold-Based Automation
**Decision**: Policy-driven automation (not immediate pop-ups)

**Flow**:
```
Employee submits disclosure
    ↓
Threshold engine evaluates (async)
    ↓
Rules fire based on configuration:
├── Auto-approve (below threshold)
├── Route to manager (medium)
├── Route to compliance (high)
└── Create case (critical threshold breached)
    ↓
Notifications sent per routing
```

**NOT**: Pop-up alerts during form completion (disruptive UX)

#### RS.36: Multi-Dimensional Aggregates
**Decision**: Aggregate across multiple dimensions

**Dimensions**:
- **Source**: Single person, department, business unit, global
- **Category**: Gifts only, all financial, all disclosures
- **Relationship**: Per vendor, per government entity, per individual
- **Time**: Rolling 30/90/365 days, calendar year, fiscal year
- **Org hierarchy**: Roll up to manager, director, VP totals

**Example Rules**:
```
Rule: "Individual Gift Limit"
├── Aggregate: Per person, per vendor, rolling 365 days
├── Threshold: $500
└── Action: Create case

Rule: "Department Travel Budget"
├── Aggregate: Per department, travel category, calendar year
├── Threshold: $50,000
└── Action: Alert compliance (no case)

Rule: "Government Official Gifts"
├── Aggregate: Per person, government relationships, all time
├── Threshold: $50
└── Action: Create case + legal review
```

#### RS.37: Retroactive vs Forward Application
**Decision**: Configurable per rule

**Options**:
- **Forward only**: Rule applies to new disclosures only
- **Retroactive**: Re-evaluate all historical disclosures against new rule
- **Retroactive with date range**: Re-evaluate disclosures from X date forward

**Default**: Forward only (safer)

**Retroactive safeguards**:
- Preview mode: show what WOULD trigger before applying
- Batch processing: don't overwhelm case queue
- Audit trail: "case created by retroactive rule application"

#### RS.38: Full Context Bundle
**Decision**: Link all context to auto-created cases

**Context Bundle**:
- Triggering disclosure(s)
- Threshold rule that fired
- Aggregate calculation breakdown
- Related disclosures in aggregate
- Person profile
- Relationship entity details

**Case Creation**:
```typescript
createCase({
  title: `Gift threshold exceeded: ${person.name}`,
  type: 'DISCLOSURE_REVIEW',
  subjects: [person],
  linkedDisclosures: [triggering, ...related],
  thresholdContext: {
    rule: ruleId,
    threshold: 500,
    actual: 750,
    aggregateBreakdown: [...],
  },
  autoCreated: true,
  autoCreatedReason: 'THRESHOLD_BREACH',
});
```

### Conflict Detection

#### RS.41: Cross-System Detection
**Decision**: Six-way conflict detection across systems

**Detection Types**:
1. **Disclosure ↔ Disclosure**: Person's own disclosure history (e.g., multiple gifts from same vendor)
2. **Disclosure ↔ Vendor Master**: Disclosed company matches approved vendor
3. **Disclosure ↔ HRIS**: Disclosed person matches employee (family employment)
4. **Disclosure ↔ Procurement**: Disclosed party is in active procurement process
5. **Disclosure ↔ Case**: Similar disclosure already under investigation
6. **Disclosure ↔ Person relationships**: Known relationships from Person entity

**Architecture**:
```
ConflictDetectionService
├── DisclosureConflictDetector (internal)
├── VendorConflictDetector (external)
├── HRISConflictDetector (external)
├── ProcurementConflictDetector (external)
├── CaseConflictDetector (internal)
└── RelationshipConflictDetector (internal)
```

#### RS.42: Fuzzy Entity Matching
**Decision**: Multi-algorithm fuzzy matching

**Algorithms**:
- Levenshtein distance (typos)
- Jaro-Winkler (name variations)
- Phonetic matching (sounds-like)
- Token overlap (word reordering)

**Thresholds**:
- Exact match: 100%
- High confidence: 90%+
- Medium confidence: 75-90%
- Low confidence: 60-75% (flag for review)
- Below 60%: No match

**Configuration**: Per-org sensitivity settings

#### RS.43: Contextual Alert Presentation
**Decision**: Show conflicts with full context

**Alert Structure**:
```
POTENTIAL CONFLICT DETECTED

Your disclosure:
  Company: "Acme Corp"
  Relationship: Vendor

Matched against:
  Approved Vendor: "ACME Corporation" (92% match)
  Active since: 2024-01-15
  Your department's spend: $125,000/year

Why this matters:
  Disclosing a gift from an approved vendor may require
  additional review per Policy XYZ.

Actions:
  [This is the same entity] [Different entity] [I'm not sure]
```

#### RS.44: Dismissal Categories
**Decision**: Categorized dismissals with exclusion list

**Dismissal Types**:
- **Same entity**: Confirm match, link entities
- **Different entity**: Reject match, add to exclusion list
- **Not sure**: Escalate to compliance for determination
- **Known exception**: Pre-approved relationship (e.g., disclosed annually)

**Exclusion List**:
- "Acme Corp" ≠ "Acme Corporation" (for this person)
- Prevents repeat false positives
- Reviewable by compliance

#### RS.45: Entity Timeline
**Decision**: Full entity timeline history

**Timeline Includes**:
- All disclosures mentioning entity
- All matches/dismissals
- All conflicts detected
- All cases created
- All reviews/approvals

**View**:
```
ENTITY: Acme Corporation

Timeline:
├── 2024-01-15: Approved as vendor
├── 2024-03-20: John Smith disclosed gift ($50)
│   └── Auto-approved (below threshold)
├── 2024-06-15: John Smith disclosed gift ($200)
│   └── Routed to manager, approved
├── 2024-09-01: Jane Doe disclosed entertainment ($400)
│   └── Case created (cumulative threshold)
└── 2024-09-15: Case resolved (approved with conditions)
```

#### RS.46: AI Batch Triage
**Decision**: AI-assisted bulk processing with mandatory human review

**Flow**:
1. Select multiple pending conflicts
2. AI analyzes patterns and suggests actions
3. **Table preview**: Shows AI recommendation per item
4. Human reviews table, adjusts as needed
5. **Confirm**: Execute all actions
6. Audit trail: "AI suggested, human confirmed"

**NOT**: Auto-execute AI recommendations

### Campaign Delivery & Translations

#### RS.50: Segment Builder
**Decision**: "Mom test" friendly segment builder

**Approach**:
- Natural language-like conditions
- Visual segment builder (not raw queries)
- Preview count before sending
- Save segments for reuse

**Example UI**:
```
Send to employees where:
  [Department] [is] [Engineering]
  AND
  [Location] [is one of] [US, Canada]
  AND
  [Hire Date] [is before] [2024-01-01]

Preview: 247 employees match
```

#### RS.51: Reminder Strategy
**Decision**: Configurable reminders + repeat non-responder flag

**Configuration**:
- Reminder schedule: Day 3, Day 7, Day 14 (configurable)
- Escalation: Manager notified on Day 7
- Past due: Daily reminders until complete
- Repeat non-responder: Flag employees who consistently miss deadlines

**Non-Responder Tracking**:
```
EmployeeComplianceProfile
├── campaignsAssigned: 10
├── campaignsCompleted: 7
├── campaignsMissedDeadline: 3
├── averageResponseTime: 4.2 days
└── repeatNonResponder: true (3+ misses in 12 months)
```

#### RS.52: Localization
**Decision**: Full localization - content + UI

**Localized Elements**:
- Form questions and labels
- Help text and instructions
- Email notifications
- Reminder messages
- Error messages
- UI chrome (buttons, headers)

**Delivery**:
- Employee's preferred language (from profile)
- Fallback to org default
- Fallback to English

#### RS.53: Staggered Rollout
**Decision**: Configurable staggered rollout

**Options**:
- **Immediate**: All recipients at once
- **Staggered**: X% per day/hour
- **Pilot first**: Specific group first, then expand

**Stagger Configuration**:
```
Rollout Strategy:
├── Day 1: 10% (pilot group)
├── Day 2: 25%
├── Day 3: 50%
└── Day 4: 100%

OR

├── 100 per hour until complete
```

#### RS.54: Blackout Dates
**Decision**: Org-configurable blackout dates

**Configuration**:
- Company holidays
- Fiscal year-end periods
- Custom blackout ranges
- Per-region/location blackouts

**Behavior**:
- Campaigns cannot be scheduled to launch during blackout
- Reminders suppressed during blackout
- Deadlines auto-extend if they fall in blackout

#### RS.55: Campaign Dashboard
**Decision**: Flexible widget dashboard

**Widget Types**:
- Completion rate (overall, by department, by location)
- Overdue count with drill-down
- Response timeline (submissions per day)
- Non-responder list
- Conflict summary
- Threshold breach summary

**Flexibility**:
- Drag-and-drop widget arrangement
- Resize widgets
- Save dashboard layouts
- Share dashboard configurations

### Campaign Workflow & Approvals

#### RS.56: Campaign Approval Workflow
**Decision**: Configurable per org + role-based creation

**Campaign Creators**:
- Role-based permission: `can_create_campaigns`
- Assignable to any role (compliance officers, department admins, etc.)

**Approval**:
- Org setting: approval required / not required
- When required, approvers configurable:
  - Any compliance officer (not creator)
  - Designated campaign approvers
  - Manager chain

#### RS.57: Mid-Flight Campaign Modifications

**Adding Recipients**:
- Creates a new wave
- Wave has its own deadline
- Original recipients unaffected
- Reporting shows wave breakdown

**Form Changes**:
- Hot-swap to latest version
- New respondents: get latest form
- Existing respondents with no draft: get latest form
- Existing respondents with draft in progress: complete on their draft version
- Completed responses: stay on submitted version

#### RS.58: Disclosure Review Routing
**Decision**: Configurable rules (reuse workflow engine)

**Example Rules**:
```
Rule: "No Conflicts Declared"
├── Condition: All answers = "No" / "None"
├── Action: Auto-approve
└── No human review needed

Rule: "Low Value Gifts"
├── Condition: Gift value < $100 AND no flags
├── Action: Route to manager
└── Manager can approve

Rule: "High Value / Government"
├── Condition: Value > $500 OR relationship = "Government"
├── Action: Route to Compliance
└── Compliance review required

Rule: "Vendor Conflict Detected"
├── Condition: Conflict alert triggered
├── Action: Route to Compliance + Legal
└── Multi-party review
```

**Same Engine As**:
- Policy approval workflows
- Case assignment
- Campaign workflows
- Conflict resolution

**Default Templates**:
- "All to Compliance" (simple)
- "Manager First" (delegation)
- "Risk-Based" (auto-approve low, escalate high)
- Custom

#### RS.59: Unified Workflow Engine for Escalation
**Decision**: One engine powers all escalation

**Unified Engine Powers**:
- Policy approvals
- Campaign workflows
- Case assignments
- Conflict resolution
- Disclosure routing
- Disclosure review escalation

**Simple Chains = Simple Workflows**:
```
"Level 1 → Level 2 → Level 3" is just:

Step 1: Assign to Level 1
├── Timeout: 3 days
└── On timeout: → Step 2

Step 2: Assign to Level 2
├── Timeout: 3 days
└── On timeout: → Step 3

Step 3: Assign to Level 3
└── No timeout (final)
```

**Benefits**:
- Admins learn one system
- Consistency across all workflows
- Build once, use everywhere
- Full power available when needed

#### RS.60: Employee Disclosure Notifications
**Decision**: Minimal notifications

**Employees Receive**:
- Campaign assigned
- Deadline reminder (per schedule)
- Past due notice

**Employees Do NOT Receive**:
- "Under review" status
- "Approved" / "Flagged" status
- Reviewer information

**Rationale**: Compliance review is internal process; reduces noise

---

## Technical Constraints

### Must Integrate With
- Phase 4 Campaign entity (already exists)
- Phase 7 notification system (for reminders)
- Phase 8 Employee Portal (for disclosure submission)
- Existing workflow engine (for routing/approval)
- Existing AI infrastructure (for conflict detection, translations)

### Multi-Tenancy
- All form definitions tenant-scoped
- All disclosures tenant-scoped
- Conflict detection tenant-isolated
- Threshold rules tenant-configurable

### Performance
- Threshold evaluation async (not blocking submission)
- Conflict detection parallel (multiple detectors run concurrently)
- Campaign delivery staggered (don't overwhelm notification system)

---

## Open Questions (Resolved in Discussion)

All questions resolved. See decision records above.

---

## Next Steps

1. Run `/gsd:plan-phase 9` to create detailed execution plans
2. Plans will be organized into waves based on dependencies
3. Implementation follows wave order with parallel execution within waves
