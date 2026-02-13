# Case & Investigation Record Page Redesign

## Design Reference: HubSpot Three-Column Record Pattern

This document specifies how the Case Detail and Investigation Detail pages in the Risk Intelligence Platform must be restructured to follow the HubSpot CRM record page pattern — a proven three-column layout that answers three questions simultaneously: **"What is this?"** (left), **"What happened?"** (center), and **"Who/what is connected?"** (right).

This document is authoritative. When implementing changes, follow the specifications here exactly. Do not invent additional features or deviate from the described patterns.

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Case Detail Page — Target Layout](#2-case-detail-page--target-layout)
3. [Investigation Detail Page — Target Layout](#3-investigation-detail-page--target-layout)
4. [Component-by-Component Specification](#4-component-by-component-specification)
5. [File Locations & What Changes](#5-file-locations--what-changes)
6. [Implementation Order](#6-implementation-order)

---

## 1. Current State Assessment

### Case Detail Page (`apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx`)

**Current layout**: Already uses a three-column grid (`grid-cols-[300px_1fr_300px]`).

| Column     | Current Content                                                                       | Gap vs. HubSpot                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Left**   | CaseInfoSummary, ActionButtonRow, CasePropertiesPanel                                 | Close to target. Quick actions are vertical ghost buttons — HubSpot uses a horizontal icon row with labels beneath. Missing: search/filter within properties.   |
| **Center** | CaseTabs: Overview, Activities, Summary, Investigations, Messages, Files, Remediation | Activity timeline exists but is buried in a tab. HubSpot pins Activities as the default/primary view. Overview tab duplicates some header info.                 |
| **Right**  | ConnectedPeopleCard, ConnectedDocumentsCard, AI Assistant button                      | Association cards exist but lack: search within card, sort, gear icon for property customization, "View all" expansion link, association count in header badge. |

**Key issues to fix on Case Detail:**

- The Activity tab should be the **default visible tab** (not Overview)
- Activity timeline needs **upcoming items pinned to top** (tasks due, SLA deadlines)
- Activity timeline needs **time-period grouping** (Upcoming, Today, Yesterday, This Week, January 2026, etc.)
- Quick action row should become a **horizontal icon+label row** like HubSpot (Note, Email, Call, Interview, Document, More), not a vertical ghost button stack
- Right sidebar association cards need **count badge in header**, **`+ Add` button**, **gear icon**, and **"View all associated X"** link
- Missing association cards: **Related Cases**, **Related Policies**, **Linked RIUs** (currently in Overview tab, should also appear as right sidebar card)
- ConnectedPeopleCard already groups by role — this is good and parallels HubSpot's association labels

### Investigation Detail Page (`apps/frontend/src/app/(authenticated)/investigations/[id]/page.tsx`)

**Current layout**: Single-column (`container mx-auto max-w-7xl`) with header + tabs. **No three-column layout.**

| Element           | Current State                                                 | Gap vs. HubSpot                                                                                                                     |
| ----------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Layout**        | Single column, no sidebars                                    | Must be restructured to three-column layout                                                                                         |
| **Header**        | InvestigationHeader with back link, status badge              | Missing: breadcrumb trail, pipeline progress, SLA status, assigned investigator avatars, quick action buttons                       |
| **Left sidebar**  | Does not exist                                                | Must add: Investigation summary card, quick actions, properties panel (type, department, assignment, dates, SLA)                    |
| **Center**        | Tabs: Checklist, Notes, Interviews, Files, Activity, Findings | Activity tab is placeholder. Interviews tab is placeholder. Files tab is placeholder. Needs real implementations.                   |
| **Right sidebar** | Does not exist                                                | Must add: Connected People (subjects, witnesses, investigators), Related Case card, Related Evidence/Documents, AI Assistant button |

**Key issues to fix on Investigation Detail:**

- Convert from single-column to **three-column layout** matching Case Detail
- Add **left sidebar** with investigation summary, quick actions, and editable properties
- Add **right sidebar** with association cards (people, case, evidence)
- Activity tab must be a **real implementation** pulling from `/activity/INVESTIGATION/{id}`
- Interviews and Files tabs must be implemented (not placeholders)
- Add **breadcrumb navigation**: Cases > {referenceNumber} > Investigation #{investigationNumber}

---

## 2. Case Detail Page — Target Layout

### 2.1 Global Header Bar (No Change Needed)

The app's top-level navigation bar is handled by the authenticated layout. No changes.

### 2.2 Record Header (`case-detail-header.tsx`)

The header spans the full width above the three-column layout. It currently contains most of what is needed. Changes required:

**Keep as-is:**

- Breadcrumb: `Cases / {referenceNumber}`
- Reference number with copy button (h1, monospace font)
- Status badge (NEW/OPEN/CLOSED with color coding)
- Severity badge (LOW/MEDIUM/HIGH)
- Category display
- Quick action buttons (Assign, Status, Merge) on the right
- Info row: Pipeline stage progress, created date + age, assigned investigators avatars, SLA status

**Add:**

- **Case summary** (one-line truncated) between the title row and info row — already implemented as `line-clamp-2`, keep as-is
- Nothing else. The header is already well-aligned with HubSpot's header pattern.

### 2.3 Left Column (300px) — Identity + Properties + Quick Actions

This column answers: **"What is this record and what are its key attributes?"**

#### 2.3a Record Summary Card (`case-info-summary.tsx`)

**Keep as-is.** Currently displays:

- Status & severity badges
- Reference number
- Quick facts checklist (anonymous reporter, source channel, etc.)
- Created by/date

This mirrors HubSpot's inline key properties at the top of the left sidebar.

#### 2.3b Quick Action Buttons (`action-button-row.tsx`)

**CHANGE REQUIRED.** Currently: vertical stack of ghost buttons with text labels.

**Target pattern (matches HubSpot):** A horizontal row of **icon buttons with labels beneath**, wrapped in a compact grid. Each button triggers a modal.

```
┌──────────────────────────────────────┐
│  QUICK ACTIONS                       │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │  📝 │ │  📧 │ │  📞 │ │  🎤 │   │
│  │ Note │ │Email│ │ Call │ │Intv.│   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │  📎 │ │  ✅ │ │ ··· │           │
│  │ Doc  │ │Task │ │More │           │
│  └─────┘ └─────┘ └─────┘           │
└──────────────────────────────────────┘
```

**Implementation:**

- Change from `space-y-1` vertical stack to `grid grid-cols-4 gap-2`
- Each button: `flex flex-col items-center` with icon on top (20x20), label beneath (text-xs)
- Use `variant="outline"` with subtle border, not `variant="ghost"`
- Keep the same action types: `note`, `email`, `call` (new), `interview`, `document`, `task`, plus `more` overflow
- Add `call` action type — HubSpot has this as a core quick action. Opens a LogCallModal.
- The `more` button opens a dropdown with less-common actions

**Modals triggered (no changes to existing modals):**

- Note → `AddNoteModal`
- Email → `EmailLogModal`
- Call → NEW: `LogCallModal` (create this)
- Interview → `LogInterviewModal`
- Document → `AttachDocumentModal`
- Task → `CreateTaskModal`

#### 2.3c Properties Panel (`case-properties-panel.tsx`)

**Keep mostly as-is.** This component already implements collapsible sections with inline editing:

- Status & Classification (status, severity, tags)
- Intake Information (source, case type)
- Reporter Information (conditionally shown)
- Location (city, state, country)
- Metadata (reference number, dates, created by)
- Attachments (upload + list)

**Changes needed:**

- Add a **gear icon** (⚙) to each section header, matching HubSpot's per-card settings pattern. For now this is cosmetic — it does not need to open a customization dialog yet, but the icon should be present for future use.
- Sections should use **chevron toggle** (▸/▾) for collapse/expand instead of relying on the section header click alone. Ensure the chevron icon rotates on toggle.

### 2.4 Center Column (1fr) — Activity Timeline + Tabs

This column answers: **"What has happened and what needs to happen next?"**

#### 2.4a Tab Bar (`case-tabs.tsx`)

**Current tabs:** Overview, Activities, Summary, Investigations, Messages, Files, Remediation

**Target tab order and changes:**

1. **Activities** — Make this the **default tab** (change `defaultTab` from `"overview"` to `"activity"`)
2. **Overview** — Keep, but second position
3. **Summary** — AI-generated summary, keep
4. **Investigations** — Keep
5. **Messages** — Keep
6. **Files** — Keep
7. **Remediation** — Keep

**Rationale:** HubSpot's Activities tab is the default because the timeline is the most frequently needed view. Compliance investigators check "what happened recently" first, not a static overview.

Update the `TABS` array in `case-tabs.tsx`:

```typescript
const TABS = [
  { id: "activity", label: "Activities", icon: Activity },
  { id: "overview", label: "Overview", icon: FileText },
  { id: "summary", label: "Summary", icon: ScrollText },
  { id: "investigations", label: "Investigations", icon: Search },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "files", label: "Files", icon: Paperclip },
  { id: "remediation", label: "Remediation", icon: ClipboardCheck },
] as const;
```

And update the default in `page.tsx`:

```typescript
defaultTab = "activity";
```

#### 2.4b Activity Timeline (`case-activity-timeline.tsx`)

**MAJOR CHANGES REQUIRED.** The current timeline works but doesn't match the HubSpot pattern.

**Target structure:**

```
┌──────────────────────────────────────────────────┐
│ 🔍 Search activities                              │
├──────────────────────────────────────────────────┤
│ All │ Notes │ Status │ Files │ Emails │ Interviews │
├──────────────────────────────────────────────────┤
│ Filter by: Filter activity (17/28) │ All users │  │
│                                    │ All teams │  │
├──────────────────────────────────────────────────┤
│                                                  │
│ ▼ UPCOMING                                       │
│ ┌──────────────────────────────────────────────┐ │
│ │ ⏰ Task assigned to Nick D.    Due: Feb 2    │ │
│ │    ☐ Complete subject interview              │ │
│ └──────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────┐ │
│ │ ⚠️ SLA Due                     Due: Feb 15   │ │
│ │    Investigation SLA approaching deadline    │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ ▼ TODAY                                          │
│   🔵 Nick Delarm added a note         2:30 PM   │
│   🟡 Status changed to OPEN           9:15 AM   │
│                                                  │
│ ▼ YESTERDAY                                      │
│   📎 Evidence document uploaded        4:22 PM   │
│   🔵 Interview with J. Smith logged   1:00 PM   │
│                                                  │
│ ▼ JANUARY 2026                                   │
│   🟢 Case created by System           Jan 28    │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Specific changes to `case-activity-timeline.tsx`:**

1. **Add search bar** at the top of the timeline — text input that filters `actionDescription` by keyword
2. **Move action buttons** (Add Note, Log Call, Send Email) **out of the timeline component** — these are redundant with the left sidebar quick actions. Remove the action bar at the top of the timeline. Activity creation happens via the left column quick actions and modals.
3. **Remove the "Case Details" card** from the activity timeline — case details belong in the Overview tab and left sidebar, not duplicated in the timeline.
4. **Add "Upcoming" section** — Query for tasks, SLA deadlines, and scheduled interviews that are future-dated. Pin these at the top of the timeline above the date-grouped history. Each upcoming item shows: icon, description, due date, and (for tasks) a completion checkbox.
5. **Add user/team filter dropdowns** — "All users" and "All teams" dropdown selects that filter activity by `actorUserId` or team membership.
6. **Add filter count indicator** — Show "Filter activity (X/Y)" where X = visible activity count and Y = total.
7. **Expand activity type filters** — Current filters: All, Notes, Status, Files. Add: Emails, Interviews, Tasks, Assignments.
8. **Ensure date grouping uses descriptive labels** — "Upcoming", "Today", "Yesterday", "This Week", "Last Week", then month/year for older entries. The current `groupByDate` utility may need enhancement.
9. **System events interleaved** — Stage changes, assignment changes, merge events, and creation events are system-generated timeline entries rendered inline with user-generated activities (notes, emails, calls).

#### 2.4c Overview Tab (Stays As-Is With Minor Tweaks)

The Overview tab currently contains:

- Lifecycle/pipeline visualization (numbered circles with connecting lines)
- Linked RIUs list
- Original Intake Details (form answers)
- Case Details (text)
- Key Dates grid
- Recent Activity link

**Changes:**

- Remove "Recent Activity" link section — Activities is now the default tab, so this is redundant
- Keep everything else as-is

### 2.5 Right Column (300px) — Associations & Connected Entities

This column answers: **"Who and what is connected to this record?"**

#### 2.5a Connected People Card (`connected-people-card.tsx`)

**Current state:** Already groups people by role (Subject, Reporter, Witness, Investigator, etc.) with color-coded badges and avatar initials. Has `+ Add` button (via `AddPersonModal`).

**Changes needed to match HubSpot:**

1. **Add count badge** in the card header — currently shows a Badge with `totalCount` in the header. Keep this.
2. **Add gear icon** (⚙) to card header — for future customization of visible properties per person. Place next to the `+ Add` button.
3. **Add "View all associated People"** link at the bottom — when there are more than 5 people, show first 5 with a `View all associated People →` link that opens a full-page or slide-out list.
4. **Add search** within the card — a small search input at the top that filters by name. Only show if count > 5.
5. **Add "Add association label"** action per person — A small text link below each person entry allowing the user to change or add a role label (e.g., from Witness to Subject). Currently, labels are assigned at creation via `AddPersonModal` but cannot be changed inline.
6. **Show email with copy icon** — For non-anonymous people, display email below the name with a clipboard copy icon, matching HubSpot's pattern.

#### 2.5b Connected Documents Card (`connected-documents-card.tsx`)

**Changes needed:**

1. **Add count badge** in header
2. **Add `+ Add` button** in header
3. **Add gear icon** in header
4. **Add "View all associated Documents"** link at bottom

#### 2.5c NEW: Related Cases Card

**Create new component: `related-cases-card.tsx`**

This card shows cases linked to the current case via `CaseCaseAssociation`. Mirrors HubSpot's associated records pattern.

```
┌──────────────────────────────────────┐
│ Related Cases (2)         + Add  ⚙  │
├──────────────────────────────────────┤
│ 📋 ETH-2024-0042          Open      │
│    Retaliation complaint             │
│    Association: Related              │
│                                      │
│ 📋 ETH-2024-0039          Closed    │
│    Original harassment report        │
│    Association: Merged From          │
│                                      │
│ View all associated Cases →          │
└──────────────────────────────────────┘
```

**Fields per related case:**

- Reference number (clickable link to that case)
- Status badge
- Summary (one-line truncated)
- Association type label (Related, Merged From)

**Data source:** `GET /cases/{id}/related-cases` (or `CaseCaseAssociation` table)

#### 2.5d NEW: Related Policies Card

**Create new component: `related-policies-card.tsx`**

Shows policies linked via `PolicyCaseAssociation`.

```
┌──────────────────────────────────────┐
│ Related Policies (1)      + Add  ⚙  │
├──────────────────────────────────────┤
│ 📄 Anti-Retaliation Policy           │
│    v2.1 · Published · HR            │
│    Add association label             │
│                                      │
│ View all associated Policies →       │
└──────────────────────────────────────┘
```

**Data source:** `GET /cases/{id}/policies` (or `PolicyCaseAssociation` table)

#### 2.5e NEW: Linked RIUs Card

**Create new component: `linked-rius-card.tsx`**

Currently, RIU information is buried in the Overview tab. It should ALSO appear as a right sidebar association card for quick access.

```
┌──────────────────────────────────────┐
│ Intake Records (1)        + Add  ⚙  │
├──────────────────────────────────────┤
│ 📞 HOTLINE-2024-0088      Primary   │
│    Hotline Report · Jan 28, 2026    │
│    Reporter: Anonymous              │
│                                      │
│ View all associated Records →        │
└──────────────────────────────────────┘
```

**Data source:** Already available via `caseData.riuAssociations`

#### 2.5f AI Assistant Button (No Change)

Keep the "Ask AI Assistant" button at the bottom of the right sidebar. Opens the `AiChatPanel` Sheet.

#### 2.5g Right Column Ordering

Top to bottom:

1. Connected People (highest priority — investigators need to see who is involved)
2. Linked Intake Records (RIUs)
3. Related Cases
4. Related Policies
5. Connected Documents
6. AI Assistant button

---

## 3. Investigation Detail Page — Target Layout

### 3.1 Convert to Three-Column Layout

**MAJOR CHANGE.** The investigation page must be converted from single-column to the same three-column layout as the Case Detail page.

**File:** `apps/frontend/src/app/(authenticated)/investigations/[id]/page.tsx`

**Target layout:**

```
grid-cols-1 lg:grid-cols-[300px_1fr_300px]
```

Replace the current `container mx-auto max-w-7xl` with the same `min-h-screen bg-gray-50 flex flex-col` + grid pattern from the case page.

### 3.2 Record Header (`investigation-header.tsx`)

**CHANGE REQUIRED.** Must match the case header pattern.

**Target content:**

```
┌────────────────────────────────────────────────────────────────────┐
│ Cases / ETH-2024-0042 / Investigation #1                          │
├────────────────────────────────────────────────────────────────────┤
│ Investigation #1            [INVESTIGATING] [Full] [On Track ✓]   │
│ Fraud & Financial Misconduct                                      │
│                                          [Assign] [Status ▾] [⋯] │
├────────────────────────────────────────────────────────────────────┤
│ Stage: ████████░░░░ Investigating    Jan 28, 2026 | 14d    👤👤   │
│                                      SLA Due: Feb 15, 2026        │
└────────────────────────────────────────────────────────────────────┘
```

**Elements:**

- **Breadcrumb**: `Cases / {case.referenceNumber} / Investigation #{investigationNumber}` — three levels deep, each segment clickable
- **Title**: `Investigation #{investigationNumber}` as h1
- **Badges row**: Status badge (color-coded), Type badge (FULL/LIMITED/INQUIRY), SLA badge (ON_TRACK/WARNING/OVERDUE)
- **Category**: Investigation category name (from case)
- **Quick action buttons** (right-aligned): Assign, Status dropdown, More (...)
- **Info row** (below, separated by border-t):
  - Pipeline stage progress bar: NEW → ASSIGNED → INVESTIGATING → PENDING_REVIEW → CLOSED
  - Created date + investigation age
  - Assigned investigator avatars (stacked, max 3 + overflow)
  - SLA due date with status color
  - Due date

### 3.3 Left Column — Investigation Summary + Properties + Quick Actions

#### 3.3a Investigation Summary Card (NEW: `investigation-info-summary.tsx`)

```
┌──────────────────────────────────────┐
│ Investigation #1                     │
│ [INVESTIGATING] [FULL]               │
│                                      │
│ ✓ Assigned to investigators          │
│ ✓ Template applied                   │
│ ☐ Checklist 45% complete             │
│ ☐ Interviews scheduled               │
│ ☐ Findings recorded                  │
│                                      │
│ Created: Jan 28, 2026                │
│ By: Nick Delarm                      │
└──────────────────────────────────────┘
```

A quick-glance progress checklist showing investigation milestones.

#### 3.3b Quick Action Buttons (NEW: `investigation-action-buttons.tsx`)

Same horizontal icon grid pattern as case quick actions:

| Icon | Label     | Modal                                                  |
| ---- | --------- | ------------------------------------------------------ |
| 📝   | Note      | Opens note creation for this investigation             |
| 🎤   | Interview | Opens interview scheduling/logging                     |
| 📎   | Evidence  | Opens evidence upload                                  |
| ✅   | Task      | Opens task creation                                    |
| 📋   | Checklist | Scrolls to/activates checklist tab                     |
| ···  | More      | Overflow menu: Apply Template, Record Findings, Export |

#### 3.3c Investigation Properties Panel (NEW: `investigation-properties-panel.tsx`)

Collapsible sections with inline editing, same pattern as `case-properties-panel.tsx`:

**Section 1: Status & Classification**

- Status (select: NEW, ASSIGNED, INVESTIGATING, PENDING_REVIEW, CLOSED, ON_HOLD)
- Status Rationale (text, shown when status changes)
- Type (select: FULL, LIMITED, INQUIRY)
- Department (select: HR, LEGAL, SAFETY, COMPLIANCE, OTHER)
- SLA Status (read-only, computed: ON_TRACK, WARNING, OVERDUE)

**Section 2: Assignment**

- Primary Investigator (user select)
- Additional Investigators (multi-user select)
- Assigned Date (read-only)
- Assigned By (read-only)

**Section 3: Timeline**

- Due Date (date picker, editable)
- Created (read-only)
- Last Updated (read-only)
- Closed Date (read-only, shown only if CLOSED)
- Closure Approved By (read-only, shown only if CLOSED)

**Section 4: Template & Checklist**

- Template Name (read-only, with "Change" link)
- Checklist Progress (progress bar + percentage, read-only)
- Template Completed (boolean, read-only)

**Section 5: Findings** (shown only if PENDING_REVIEW or CLOSED)

- Outcome (read-only)
- Root Cause (read-only)
- Findings Date (read-only)

### 3.4 Center Column — Tabs

#### 3.4a Tab Bar

**Target tab order:**

1. **Activities** — Default tab. Real activity timeline (not placeholder).
2. **Checklist** — Template-based investigation checklist. Already implemented.
3. **Notes** — Investigation notes with rich text. Already implemented.
4. **Interviews** — Interview records. Must be implemented (currently placeholder).
5. **Files** — Evidence/file management. Must be implemented (currently placeholder).
6. **Findings** — Conditional tab, visible when PENDING_REVIEW or CLOSED. Already implemented.

**Change from current:** Activities becomes the default tab instead of Checklist.

#### 3.4b Investigation Activity Timeline (NEW: `investigation-activity-timeline.tsx`)

Same pattern as `case-activity-timeline.tsx` but scoped to investigation:

**Data source:** `GET /activity/INVESTIGATION/{id}?includeRelated=true`

**Activity types to display:**

- Note added/edited
- Interview scheduled/completed
- Status changed
- Investigator assigned/removed
- Evidence uploaded
- Checklist item completed/skipped
- Findings recorded
- Template applied/changed
- SLA status changed

**Features (same as case timeline):**

- Search bar
- Filter tabs: All, Notes, Status Changes, Evidence, Interviews
- User filter dropdown
- Upcoming section (tasks due, interview schedules, SLA deadlines)
- Date-grouped history

#### 3.4c Interviews Tab (IMPLEMENT: `investigation-interviews-tab.tsx`)

Replace the current placeholder with a real implementation:

```
┌──────────────────────────────────────────────────────┐
│ [+ Schedule Interview]                               │
├──────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐ │
│ │ 👤 John Smith (Witness)                          │ │
│ │ Scheduled: Feb 5, 2026 at 10:00 AM              │ │
│ │ Status: Scheduled                                │ │
│ │ Conducted by: Nick Delarm                        │ │
│ │ [View Details] [Edit] [Cancel]                   │ │
│ └──────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 👤 Jane Doe (Subject)                            │ │
│ │ Completed: Jan 30, 2026 · Duration: 45 min      │ │
│ │ Status: Completed                                │ │
│ │ Summary: "Subject denied knowledge of..."        │ │
│ │ [View Transcript] [View Details]                 │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Data source:** `InvestigationInterview` entity. API: `GET /investigations/{id}/interviews`

**Per-interview fields to display:**

- Interviewee name + type badge (PERSON, EXTERNAL, ANONYMOUS)
- Scheduled date/time
- Status (Scheduled, Completed, Cancelled)
- Duration (if completed)
- Conducted by (investigator name)
- Summary excerpt (first line of notes)
- Actions: View Details, Edit, Cancel (for scheduled), View Transcript (for completed with transcript)

#### 3.4d Files Tab (IMPLEMENT: `investigation-files-tab.tsx`)

Replace the current placeholder with a real implementation:

**Data source:** Files attached to investigation notes (via `attachments` JSON), plus standalone investigation attachments.

**Display:** Grid or list of files with:

- File icon (based on type: PDF, DOC, image, etc.)
- Filename
- Upload date
- Uploaded by
- File size
- Type badge (Evidence, Supporting Document, Transcript, Photo)
- Actions: Download, Preview, Delete

### 3.5 Right Column — Associations

#### 3.5a Connected People Card (reuse `connected-people-card.tsx`)

Adapt the existing ConnectedPeopleCard to work for investigations by accepting an `investigationId` prop in addition to `caseId`.

People connected to the investigation:

- Subjects being investigated
- Witnesses interviewed
- Investigators assigned
- Legal counsel

**Data source:** People from the parent case who are relevant to this investigation, plus investigation-specific assignments.

#### 3.5b Parent Case Card (NEW: `parent-case-card.tsx`)

Every investigation belongs to a case. Show the parent case as an association card:

```
┌──────────────────────────────────────┐
│ Parent Case (1)                      │
├──────────────────────────────────────┤
│ 📋 ETH-2024-0042           Open     │
│    Fraud & Financial Misconduct      │
│    Severity: High                    │
│    Created: Jan 28, 2026             │
│                                      │
│ View case →                          │
└──────────────────────────────────────┘
```

Clicking navigates to `/cases/{caseId}`.

#### 3.5c Related Evidence Card (NEW: `investigation-evidence-card.tsx`)

Quick-glance list of evidence files attached to this investigation:

```
┌──────────────────────────────────────┐
│ Evidence (3)              + Add  ⚙  │
├──────────────────────────────────────┤
│ 📄 expense_report_2024.pdf          │
│    Evidence · Uploaded Jan 29        │
│                                      │
│ 🖼️ receipt_photo.jpg                 │
│    Photo · Uploaded Jan 30           │
│                                      │
│ 📄 interview_transcript.docx         │
│    Transcript · Uploaded Feb 1       │
│                                      │
│ View all files →                     │
└──────────────────────────────────────┘
```

#### 3.5d AI Assistant Button

Same pattern as case page: "Ask AI Assistant" button opening the `AiChatPanel` Sheet, scoped to `entityType="investigation"`.

#### 3.5e Right Column Ordering

Top to bottom:

1. Connected People
2. Parent Case
3. Evidence
4. AI Assistant button

---

## 4. Component-by-Component Specification

### 4.1 Association Card Pattern (Reusable)

All right-sidebar cards should follow a consistent pattern. Create a shared wrapper component:

**NEW: `components/ui/association-card.tsx`**

```typescript
interface AssociationCardProps {
  title: string; // e.g., "Connected People"
  count: number; // e.g., 3
  icon: LucideIcon; // e.g., Users
  onAdd?: () => void; // + Add button handler
  onSettings?: () => void; // Gear icon handler (optional, for future)
  viewAllHref?: string; // "View all associated X" link
  viewAllLabel?: string; // e.g., "View all associated People"
  searchable?: boolean; // Show search input when count > threshold
  searchPlaceholder?: string;
  children: React.ReactNode;
}
```

**Structure:**

```
┌──────────────────────────────────────┐
│ 👥 Title (count)          + Add  ⚙  │  ← CardHeader
│ 🔍 Search...                         │  ← Optional search
├──────────────────────────────────────┤
│ [children content]                   │  ← CardContent
├──────────────────────────────────────┤
│ View all associated X →              │  ← CardFooter link
└──────────────────────────────────────┘
```

Refactor `ConnectedPeopleCard` and `ConnectedDocumentsCard` to use this wrapper, and use it for all new association cards.

### 4.2 Activity Timeline Pattern (Reusable)

The activity timeline is used on both Case and Investigation detail pages. Extract shared logic:

**NEW: `components/shared/activity-timeline.tsx`**

```typescript
interface ActivityTimelineProps {
  entityType: "CASE" | "INVESTIGATION";
  entityId: string;
  showUpcoming?: boolean; // Show upcoming tasks/deadlines section
  showSearch?: boolean; // Show search bar
  showUserFilter?: boolean; // Show "All users" filter
}
```

This wraps the fetching, filtering, date grouping, and rendering logic. Both `CaseActivityTimeline` and `InvestigationActivityTimeline` use this shared component.

### 4.3 Properties Panel Pattern (Reusable)

Both case and investigation properties panels share the same pattern: collapsible sections with inline-editable fields.

The existing `CasePropertiesPanel` already implements this well. For the new `InvestigationPropertiesPanel`, follow the same patterns:

- Use `PropertySection` component for collapsible sections
- Use `EditableField` component for inline editing
- Sections have chevron + title + gear icon header
- Save on Enter/blur, Cancel on Escape
- Toast notifications for save success/failure

### 4.4 Quick Action Grid Pattern (Reusable)

Both case and investigation pages need the same quick action button grid. Extract:

**NEW: `components/shared/quick-action-grid.tsx`**

```typescript
interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface QuickActionGridProps {
  actions: QuickAction[];
  columns?: number; // default 4
}
```

Renders the horizontal icon+label grid layout described in section 2.3b.

---

## 5. File Locations & What Changes

### Files to MODIFY:

| File                                                                   | Change                                                                                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx`            | Change `defaultTab` to `"activity"`                                                                                       |
| `apps/frontend/src/app/(authenticated)/investigations/[id]/page.tsx`   | **Major rewrite**: Convert from single-column to three-column layout with left/right sidebars                             |
| `apps/frontend/src/components/cases/action-button-row.tsx`             | Change from vertical ghost stack to horizontal icon grid                                                                  |
| `apps/frontend/src/components/cases/case-tabs.tsx`                     | Reorder tabs: Activities first. Remove "Recent Activity" link from Overview.                                              |
| `apps/frontend/src/components/cases/case-activity-timeline.tsx`        | Remove duplicate action bar and case details card. Add search bar, upcoming section, enhanced filters, user/team filters. |
| `apps/frontend/src/components/cases/connected-people-card.tsx`         | Add gear icon, "View all" link, search, per-person email with copy, inline label editing                                  |
| `apps/frontend/src/components/cases/connected-documents-card.tsx`      | Add count badge, `+ Add` button, gear icon, "View all" link                                                               |
| `apps/frontend/src/components/cases/case-properties-panel.tsx`         | Add gear icon and chevron toggle to section headers                                                                       |
| `apps/frontend/src/components/investigations/investigation-header.tsx` | **Major rewrite**: Add breadcrumb, badges, pipeline progress, SLA, assigned avatars, quick actions                        |

### Files to CREATE:

| File                                                                              | Purpose                                     |
| --------------------------------------------------------------------------------- | ------------------------------------------- |
| `apps/frontend/src/components/ui/association-card.tsx`                            | Reusable association card wrapper           |
| `apps/frontend/src/components/shared/activity-timeline.tsx`                       | Reusable activity timeline core             |
| `apps/frontend/src/components/shared/quick-action-grid.tsx`                       | Reusable quick action button grid           |
| `apps/frontend/src/components/cases/related-cases-card.tsx`                       | Related cases right sidebar card            |
| `apps/frontend/src/components/cases/related-policies-card.tsx`                    | Related policies right sidebar card         |
| `apps/frontend/src/components/cases/linked-rius-card.tsx`                         | RIU association right sidebar card          |
| `apps/frontend/src/components/cases/log-call-modal.tsx`                           | Log Call modal (new quick action)           |
| `apps/frontend/src/components/investigations/investigation-info-summary.tsx`      | Investigation summary card for left sidebar |
| `apps/frontend/src/components/investigations/investigation-action-buttons.tsx`    | Investigation quick action buttons          |
| `apps/frontend/src/components/investigations/investigation-properties-panel.tsx`  | Investigation editable properties           |
| `apps/frontend/src/components/investigations/investigation-activity-timeline.tsx` | Investigation activity timeline             |
| `apps/frontend/src/components/investigations/investigation-interviews-tab.tsx`    | Real interview list/management              |
| `apps/frontend/src/components/investigations/investigation-files-tab.tsx`         | Real file/evidence management               |
| `apps/frontend/src/components/investigations/parent-case-card.tsx`                | Parent case right sidebar card              |
| `apps/frontend/src/components/investigations/investigation-evidence-card.tsx`     | Evidence right sidebar card                 |

### Files to NOT CHANGE:

- All backend files (no API changes needed — the data models and endpoints already support everything described here)
- All modal components (`assign-modal.tsx`, `status-change-modal.tsx`, `merge-modal.tsx`, `add-note-modal.tsx`, `email-log-modal.tsx`, `log-interview-modal.tsx`, `attach-document-modal.tsx`, `create-task-modal.tsx`) — keep as-is
- `case-info-summary.tsx` — keep as-is
- `case-detail-header.tsx` — keep as-is (already well-aligned)
- Prisma schema — no model changes
- All existing type definitions

---

## 6. Implementation Order

Execute these changes in phases. Each phase should be independently deployable.

### Phase 1: Case Page — Tab Reorder & Timeline Enhancement

1. Reorder tabs in `case-tabs.tsx` (Activities first)
2. Change `defaultTab` to `"activity"` in case page
3. Remove action bar and case details card from `case-activity-timeline.tsx`
4. Add search bar to activity timeline
5. Add upcoming section to activity timeline
6. Enhance date grouping labels (Today, Yesterday, This Week, etc.)

### Phase 2: Case Page — Quick Actions & Properties Polish

1. Create `quick-action-grid.tsx` shared component
2. Rewrite `action-button-row.tsx` to use horizontal icon grid
3. Add `call` action type and create `log-call-modal.tsx`
4. Add gear icons and chevron toggles to `case-properties-panel.tsx`

### Phase 3: Case Page — Right Sidebar Association Cards

1. Create `association-card.tsx` shared wrapper
2. Refactor `connected-people-card.tsx` to use wrapper, add enhancements
3. Refactor `connected-documents-card.tsx` to use wrapper
4. Create `related-cases-card.tsx`
5. Create `related-policies-card.tsx`
6. Create `linked-rius-card.tsx`
7. Add all new cards to case page right column

### Phase 4: Investigation Page — Three-Column Layout Conversion

1. Rewrite `investigations/[id]/page.tsx` to three-column layout
2. Rewrite `investigation-header.tsx` with breadcrumb, badges, pipeline, SLA, actions
3. Create `investigation-info-summary.tsx`
4. Create `investigation-action-buttons.tsx`
5. Create `investigation-properties-panel.tsx`

### Phase 5: Investigation Page — Activity Timeline & Tabs

1. Create `investigation-activity-timeline.tsx` (reusing shared component)
2. Make Activities the default tab
3. Implement `investigation-interviews-tab.tsx`
4. Implement `investigation-files-tab.tsx`

### Phase 6: Investigation Page — Right Sidebar

1. Create `parent-case-card.tsx`
2. Create `investigation-evidence-card.tsx`
3. Adapt `connected-people-card.tsx` to accept `investigationId`
4. Add AI Assistant button
5. Wire all cards into investigation page right column

---

## Appendix A: HubSpot Pattern Summary

The HubSpot three-column record page pattern that this redesign follows:

| Column            | Width        | Purpose                                        | User Question Answered               |
| ----------------- | ------------ | ---------------------------------------------- | ------------------------------------ |
| **Left Sidebar**  | Fixed 300px  | Record identity, key properties, quick actions | "What is this?" + "Do something now" |
| **Middle Column** | Flexible 1fr | Activity timeline (default), tabbed content    | "What happened?" + "What's next?"    |
| **Right Sidebar** | Fixed 300px  | Associated records, relationships              | "Who/what is connected?"             |

**Core UX principles applied:**

1. **Activity-first** — The timeline is the default view because "what happened" is the most common question
2. **Zero-navigation actions** — Quick actions, inline editing, copy icons, and checkboxes minimize page switches
3. **Association labels** — Every relationship has a typed label (Subject, Witness, Primary, Related)
4. **Collapsible property cards** — Themed groupings of fields with independent expand/collapse
5. **Count badges** — Every association card shows its count in the header
6. **Search within context** — Search bars in the timeline and within large association cards
7. **Upcoming items pinned** — Future-dated tasks and deadlines float above the historical timeline
8. **System + manual events interleaved** — Automated events (status changes, SLA warnings) appear alongside user-created activities

## Appendix B: Color-Coded Badge Reference

### Case Status

| Status | Background      | Text              |
| ------ | --------------- | ----------------- |
| NEW    | `bg-blue-100`   | `text-blue-800`   |
| OPEN   | `bg-yellow-100` | `text-yellow-800` |
| CLOSED | `bg-gray-100`   | `text-gray-800`   |

### Investigation Status

| Status         | Background      | Text              |
| -------------- | --------------- | ----------------- |
| NEW            | `bg-blue-100`   | `text-blue-800`   |
| ASSIGNED       | `bg-indigo-100` | `text-indigo-800` |
| INVESTIGATING  | `bg-yellow-100` | `text-yellow-800` |
| PENDING_REVIEW | `bg-orange-100` | `text-orange-800` |
| CLOSED         | `bg-gray-100`   | `text-gray-800`   |
| ON_HOLD        | `bg-slate-100`  | `text-slate-800`  |

### Severity

| Level  | Background      | Text              |
| ------ | --------------- | ----------------- |
| LOW    | `bg-green-100`  | `text-green-800`  |
| MEDIUM | `bg-yellow-100` | `text-yellow-800` |
| HIGH   | `bg-orange-100` | `text-orange-800` |

### SLA Status

| Status   | Background     | Text              |
| -------- | -------------- | ----------------- |
| ON_TRACK | `bg-green-50`  | `text-green-700`  |
| WARNING  | `bg-yellow-50` | `text-yellow-700` |
| OVERDUE  | `bg-red-50`    | `text-red-700`    |

### Person Association Labels

| Label                 | Background      | Text              |
| --------------------- | --------------- | ----------------- |
| REPORTER              | `bg-blue-100`   | `text-blue-800`   |
| SUBJECT               | `bg-red-100`    | `text-red-800`    |
| WITNESS               | `bg-amber-100`  | `text-amber-800`  |
| ASSIGNED_INVESTIGATOR | `bg-green-100`  | `text-green-800`  |
| APPROVER              | `bg-purple-100` | `text-purple-800` |
| STAKEHOLDER           | `bg-gray-100`   | `text-gray-800`   |
| MANAGER_OF_SUBJECT    | `bg-indigo-100` | `text-indigo-800` |
| REVIEWER              | `bg-teal-100`   | `text-teal-800`   |
| LEGAL_COUNSEL         | `bg-violet-100` | `text-violet-800` |
