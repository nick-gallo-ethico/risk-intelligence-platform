# Phase 15: Case Detail Page Overhaul - Research

**Researched:** 2026-02-07
**Domain:** Frontend page rebuild (React/Next.js) with backend API integration
**Confidence:** HIGH

## Summary

The case detail page overhaul transforms the existing two-panel layout (left sidebar + tabbed content) into a three-column layout (left 1x, center 2x, right 1x) that serves as the primary workspace for investigators. The existing codebase has substantial infrastructure already built: the backend has complete case CRUD, activity timeline, case merge, person-case associations, AI WebSocket streaming, and anonymous messaging. The frontend has working tab navigation, properties panel, activity timeline component, investigation panel, files tab, messages tab, and remediation tab.

The core work involves: (1) restructuring the page layout from 2-column to 3-column, (2) redistributing existing components into the new column structure, (3) wiring up the non-functional buttons (Assign, Status, Merge) to backend APIs that already exist, (4) building the AI slide-out panel using the existing WebSocket gateway, (5) adding action buttons (Note, Interview, Document, Task, Email) to the left column, and (6) enhancing seed data for longer case details and summaries.

**Primary recommendation:** Rebuild `page.tsx` with a CSS Grid 3-column layout (1fr 2fr 1fr), redistribute existing components into the columns, and wire up existing backend services through new frontend modals. Use the existing shadcn/ui Sheet component for the AI slide-out panel.

## Standard Stack

The project already uses an established stack. No new libraries are needed for this phase.

### Core (Already Installed)

| Library                         | Purpose                | Why Standard                                                     |
| ------------------------------- | ---------------------- | ---------------------------------------------------------------- |
| React 18 + Next.js (App Router) | Frontend framework     | Already in use                                                   |
| shadcn/ui (Radix primitives)    | Component library      | Already provides: Sheet, Dialog, Tabs, Card, Badge, Select, etc. |
| Tailwind CSS                    | Styling                | Already in use, CSS Grid for 3-column layout                     |
| Lucide React                    | Icons                  | Already used across all case components                          |
| socket.io-client                | WebSocket for AI panel | Needed for real-time AI streaming (already a project dependency) |

### Supporting (Already Installed)

| Library                  | Purpose               | When to Use                                         |
| ------------------------ | --------------------- | --------------------------------------------------- |
| @tanstack/react-query    | Data fetching/caching | Used by hooks (useCaseMessages, useCaseFiles, etc.) |
| class-variance-authority | Variant styling       | Used in shadcn/ui components                        |

### No New Dependencies Needed

This phase is entirely about restructuring existing components and wiring up existing backend APIs. No new npm packages required.

## Architecture Patterns

### Recommended Page Structure (New Three-Column Layout)

```
cases/[id]/page.tsx (rebuilt)
  +-- CaseDetailHeader (existing, kept as-is)
  +-- Three-Column Grid Container (NEW - CSS Grid: 1fr 2fr 1fr)
      |
      +-- LEFT COLUMN (1fr)
      |   +-- CaseInfoCard (case #, status, pipeline, days open)
      |   +-- ActionButtonRow (Note, Interview, Document, Task, Email)
      |   +-- RIU-specific form answers (PropertySection components)
      |
      +-- CENTER COLUMN (2fr) - Tabbed
      |   +-- CaseTabs (existing, modified tab list)
      |       +-- Overview tab (lifecycle info, recent/upcoming activities)
      |       +-- Activities tab (full descending feed)
      |       +-- Summary tab (AI/manual summary + write-up)
      |       +-- Investigations tab (existing)
      |       +-- Messages tab (existing)
      |       +-- Files tab (existing)
      |       +-- Remediation tab (existing)
      |
      +-- RIGHT COLUMN (1fr)
          +-- ConnectedDocumentsCard (with Add button)
          +-- ConnectedPeopleCard (witness, subject - with Add button)
          +-- AI Panel Trigger Button
          +-- [AI SlideOut Panel] (Sheet overlaying right column)
```

### Pattern 1: Three-Column CSS Grid Layout

**What:** Use CSS Grid with `grid-template-columns: 1fr 2fr 1fr` for the main content area.
**When to use:** Desktop viewports. On mobile/tablet, collapse to single column or stacked.
**Example:**

```typescript
// In page.tsx
<div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-0 flex-1 overflow-hidden">
  <aside className="border-r overflow-y-auto bg-white">
    {/* Left column */}
  </aside>
  <main className="overflow-hidden">
    {/* Center column - tabs */}
  </main>
  <aside className="border-l overflow-y-auto bg-gray-50">
    {/* Right column */}
  </aside>
</div>
```

### Pattern 2: Modal-Based Actions (Assign, Status, Merge)

**What:** Each action button opens a Dialog (shadcn/ui) with form content. On submit, calls existing backend API.
**When to use:** For Assign, Status Change, and Merge workflows.
**Example:**

```typescript
// Assign Modal - calls existing backend
const handleAssign = async (userId: string) => {
  await apiClient.patch(`/cases/${caseId}`, {
    assignedInvestigatorIds: [...currentIds, userId],
  });
  // Refresh case data
};

// Status Modal - calls existing PATCH /cases/:id/status
const handleStatusChange = async (status: string, rationale: string) => {
  await casesApi.updateStatus(caseId, status, rationale);
  // Activity feed auto-updates from backend logging
};

// Merge Modal - needs new controller endpoint (POST /cases/:id/merge)
// Backend CaseMergeService exists but no controller route yet
```

### Pattern 3: AI Slide-Out Panel (Sheet Component)

**What:** Use shadcn/ui `Sheet` (side="right") to overlay the right column. Connect to WebSocket `/ai` namespace for streaming chat.
**When to use:** When user clicks "AI" button in the right column.
**Example:**

```typescript
<Sheet open={aiPanelOpen} onOpenChange={setAiPanelOpen}>
  <SheetContent side="right" className="w-[400px]">
    <AiChatPanel
      entityType="case"
      entityId={caseId}
      onActionComplete={() => refreshCaseData()}
    />
  </SheetContent>
</Sheet>
```

### Pattern 4: Activity Feed with Real-Time Updates

**What:** The activity timeline fetches from `/activity/CASE/:id` endpoint (ActivityTimelineController). When user performs actions (status change, note, etc.), refetch the timeline.
**When to use:** Activities tab shows ALL interactions in descending order.
**Key:** The backend `ActivityTimelineService.getTimeline()` already includes related entity activities (Investigations) when `includeRelated=true` (default).

### Pattern 5: Connected People via PersonCaseAssociation

**What:** Right column shows people cards using `PersonCaseAssociationService.findByCase()`. "Add Person" uses a dialog that searches persons or allows free-form entry.
**When to use:** Right column Connected People section.
**Key labels:** REPORTER, SUBJECT, WITNESS (evidentiary), ASSIGNED_INVESTIGATOR, LEGAL_COUNSEL, etc. (role).

### Anti-Patterns to Avoid

- **Don't rebuild the activity service** - Two activity services exist (ActivityService for logging, ActivityTimelineService for retrieval). Use both as-is.
- **Don't inline modals in the page component** - Extract each modal (Assign, Status, Merge, AddNote, AddPerson) into its own component file.
- **Don't create a new email service for Phase 15** - Email compose/send from the case page is about logging activities. The existing messaging module is for anonymous reporter communication, NOT general email. The "Email" action button should log an activity entry (external email logged to feed), not actually send emails through the platform.
- **Don't duplicate tab content** - The existing `CaseTabs` component already has working URL-synced navigation. Modify it, don't rebuild from scratch.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                        | Don't Build                          | Use Instead                                                        | Why                                                        |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| Slide-out panel for AI         | Custom positioned div                | shadcn/ui `Sheet` component                                        | Handles focus trapping, animation, backdrop, accessibility |
| Activity timeline aggregation  | Custom query joining multiple tables | `ActivityTimelineService.getTimeline()` with `includeRelated=true` | Already aggregates Case + Investigation activities         |
| Tab URL sync                   | Custom URL parameter handling        | Existing `CaseTabs` implementation using `useSearchParams`         | Already working, just needs tab list changes               |
| Person search/create           | Custom search UI                     | Dialog with existing `PersonsController` endpoints                 | Backend already has person CRUD and search                 |
| Case merge workflow            | Custom merge logic                   | `CaseMergeService.merge()`                                         | Already handles atomic merge with audit trail              |
| Action button activity logging | Custom logging                       | `ActivityService.log()`                                            | Non-blocking, auto-generates descriptions                  |

**Key insight:** ~80% of the backend work for this phase is already done. The phase is primarily a frontend layout restructure with modal wiring.

## Common Pitfalls

### Pitfall 1: Merge Endpoint Missing from Controller

**What goes wrong:** The `CaseMergeService` exists with full merge logic, but `CasesController` has NO merge endpoint. Attempting to call merge from frontend will 404.
**Why it happens:** Service was built in Phase 4 but the REST endpoint was never exposed.
**How to avoid:** Add `POST /cases/:id/merge` endpoint to `CasesController` before building the frontend merge modal. Also add `GET /cases/:id/merge-history` and `GET /cases/:id/can-merge/:targetId`.
**Warning signs:** 404 when testing merge button.

### Pitfall 2: Activity Feed API Mismatch

**What goes wrong:** The frontend `CaseActivityTimeline` currently calls `/activity/entity/CASE/${caseId}` but the backend `ActivityTimelineController` serves at `/activity/CASE/${entityId}` (no "entity" in path). The existing code has a fallback that creates a fake activity entry when the API call fails.
**Why it happens:** The frontend was built against a different API shape than what ActivityTimelineController provides.
**How to avoid:** Verify the actual API path. The `ActivityTimelineController` is at `/activity/:entityType/:entityId`. The `CasesController` also has `GET /cases/:id/activity` which calls `ActivityService.getEntityTimeline()` (different from `ActivityTimelineService.getTimeline()`). Use the one that includes related entities (`/activity/CASE/:id` from ActivityTimelineController).
**Warning signs:** Activity feed shows "Failed to load activities" and only shows case creation entry.

### Pitfall 3: Right Column vs AI Panel Interaction

**What goes wrong:** AI panel is supposed to "slide out OVER the right column." If implemented as a full-page Sheet, it covers everything. If implemented as a panel within the right column, it needs careful z-index management.
**Why it happens:** Sheet component defaults to full-height slide-in from right edge of viewport.
**How to avoid:** Use Sheet with `side="right"` and constrain its width to match or slightly exceed the right column width (~300-400px). Alternatively, use a conditional render that replaces the right column content with the AI chat when active.
**Warning signs:** AI panel covers the entire page or pushes layout around.

### Pitfall 4: Email Button Misinterpretation

**What goes wrong:** Building a full email sending system when the requirement is to (a) log external emails sent from inbox and (b) optionally compose simple emails.
**Why it happens:** The existing `messaging` module handles anonymous reporter relay, which is different from general email.
**How to avoid:** The "Email" button should open a form that either (1) logs an external email activity entry (user sent email from their inbox, logs it here) or (2) opens a compose form that creates an activity entry. This is NOT building an email server - it's logging email interactions to the case timeline.
**Warning signs:** Spending time on SMTP integration or email delivery when it's really about activity logging.

### Pitfall 5: Seed Data Word Count

**What goes wrong:** Case details are currently sourced from RIU narratives which may be short. AI summaries are ~25-30 words (3 sentences from template), not the required 50-75 words.
**Why it happens:** `case.seeder.ts` line 529: `details = primaryRiu.details` (passes through RIU text as-is). Summary line 574: `summary: details.length > 200 ? details.substring(0, 197) + '...' : null` (truncates, doesn't generate new content).
**How to avoid:** Enhance `case.seeder.ts` to generate longer case details (200-400 words) by combining RIU details with additional investigator notes, timeline facts, and findings. Enhance `generateAiSummary()` to produce 50-75 word summaries.
**Warning signs:** Case detail page looks sparse with short text blocks.

## Code Examples

### Three-Column Layout (Core Page Structure)

```typescript
// apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx
<div className="min-h-screen bg-gray-50 flex flex-col">
  <CaseDetailHeader
    caseData={caseData}
    isLoading={loading}
    onAssign={handleAssign}
    onChangeStatus={handleChangeStatus}
    onMerge={handleMerge}
  />

  <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] overflow-hidden">
    {/* Left Column */}
    <aside className="border-r overflow-y-auto bg-white hidden lg:block">
      <CaseInfoSummary caseData={caseData} />
      <ActionButtonRow caseId={caseData.id} onAction={handleAction} />
      <CasePropertiesPanel caseData={caseData} isLoading={loading} />
    </aside>

    {/* Center Column - Tabbed Content */}
    <main className="overflow-hidden bg-white">
      <CaseTabs caseData={caseData} isLoading={loading} defaultTab="overview" />
    </main>

    {/* Right Column */}
    <aside className="border-l overflow-y-auto bg-gray-50 hidden lg:block">
      <ConnectedDocuments caseId={caseData.id} />
      <ConnectedPeople caseId={caseData.id} organizationId={caseData.organizationId} />
      <AiPanelTrigger onClick={() => setAiPanelOpen(true)} />
    </aside>
  </div>

  {/* AI Slide-out Panel */}
  <Sheet open={aiPanelOpen} onOpenChange={setAiPanelOpen}>
    <SheetContent side="right" className="w-[400px] sm:w-[540px]">
      <AiChatPanel entityType="case" entityId={caseData.id} />
    </SheetContent>
  </Sheet>
</div>
```

### Assign Modal

```typescript
// apps/frontend/src/components/cases/assign-modal.tsx
export function AssignModal({ caseId, currentAssignees, open, onOpenChange, onAssigned }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Fetch available users from /users endpoint
    apiClient.get('/users?role=INVESTIGATOR').then(setUsers);
  }, []);

  const handleAssign = async () => {
    await casesApi.update(caseId, {
      // Backend handles adding to assigned investigators
    });
    onAssigned();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Case</DialogTitle>
        </DialogHeader>
        {/* User selection list */}
        <DialogFooter>
          <Button onClick={handleAssign}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### AI Chat Panel (WebSocket Connection)

```typescript
// apps/frontend/src/components/ai/ai-chat-panel.tsx
import { io, Socket } from "socket.io-client";

export function AiChatPanel({ entityType, entityId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io("/ai", {
      auth: { token: getAuthToken() },
    });

    socket.on("text_delta", (event) => {
      setMessages((prev) => {
        // Append text to last assistant message
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          last.content += event.text;
        }
        return updated;
      });
    });

    socket.on("message_complete", () => setStreaming(false));
    socket.on("tool_use", (event) => {
      // Show tool use indicator (e.g., "Updating case status...")
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);

  const sendMessage = () => {
    socketRef.current?.emit("chat", {
      message: input,
      entityType,
      entityId,
    });
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setStreaming(true);
    setInput("");
  };
}
```

### Merge Modal (Needs Backend Endpoint First)

```typescript
// Backend: Add to cases.controller.ts
@Post(':id/merge')
@Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
@UseGuards(RolesGuard)
async mergeCases(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: MergeCaseDto,
  @CurrentUser() user: RequestUser,
  @TenantId() organizationId: string,
): Promise<MergeResultDto> {
  return this.caseMergeService.merge(
    { sourceCaseId: dto.sourceCaseId, targetCaseId: id, reason: dto.reason },
    user.id,
    organizationId,
  );
}

@Get(':id/merge-history')
async getMergeHistory(
  @Param('id', ParseUUIDPipe) id: string,
  @TenantId() organizationId: string,
) {
  return this.caseMergeService.getMergeHistory(id, organizationId);
}
```

## State of the Art

| Old Approach (Current)                                | New Approach (Phase 15)                                            | Impact                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| 2-column layout (sidebar + tabs)                      | 3-column grid (1fr 2fr 1fr)                                        | Better use of screen real estate, HubSpot-style workspace |
| Properties in left sidebar only                       | Left: info + actions, Right: associations + AI                     | Connected entities visible at all times                   |
| Action buttons (Assign, Status, Merge) log to console | Functional modals calling real APIs                                | Investigators can actually work from the page             |
| No AI panel                                           | Sheet slide-out with WebSocket streaming                           | AI assistant embedded in workflow                         |
| Activity feed calls wrong endpoint                    | Activity feed using ActivityTimelineController with includeRelated | Full activity history including investigation activities  |
| Static tab list                                       | Modified tabs (Overview, Activities, Summary + existing)           | Better organization matching investigator workflow        |

## Existing Code Inventory

### Backend APIs Ready to Use (No Changes Needed)

| Endpoint                             | Method | Purpose                                 | Status  |
| ------------------------------------ | ------ | --------------------------------------- | ------- |
| `GET /cases/:id`                     | GET    | Fetch case detail                       | Working |
| `PATCH /cases/:id`                   | PATCH  | Update case fields                      | Working |
| `PATCH /cases/:id/status`            | PATCH  | Change status with rationale            | Working |
| `POST /cases/:id/close`              | POST   | Close case                              | Working |
| `GET /activity/CASE/:id`             | GET    | Activity timeline with related entities | Working |
| `GET /activity/CASE/:id/summary`     | GET    | Activity summary stats                  | Working |
| WebSocket `/ai` namespace            | WS     | AI chat streaming                       | Working |
| `GET /ai/agents/:type/suggestions`   | GET    | AI suggested prompts                    | Working |
| `POST /ai/skills/:skillId/execute`   | POST   | Execute AI skill                        | Working |
| `POST /ai/actions/:actionId/execute` | POST   | Execute AI action                       | Working |

### Backend APIs Needing New Endpoints

| Endpoint                             | Method | Purpose                 | Existing Service                          |
| ------------------------------------ | ------ | ----------------------- | ----------------------------------------- |
| `POST /cases/:id/merge`              | POST   | Merge cases             | CaseMergeService.merge()                  |
| `GET /cases/:id/merge-history`       | GET    | Get merge history       | CaseMergeService.getMergeHistory()        |
| `GET /cases/:id/can-merge/:targetId` | GET    | Check merge feasibility | CaseMergeService.canMerge()               |
| `GET /cases/:id/persons`             | GET    | Get connected people    | PersonCaseAssociationService.findByCase() |
| `POST /cases/:id/persons`            | POST   | Add person to case      | PersonCaseAssociationService.create()     |
| `GET /cases/:id/documents`           | GET    | Get connected documents | (May already exist via attachments)       |

### Frontend Components Ready to Reuse

| Component               | File                            | Reuse Strategy                                      |
| ----------------------- | ------------------------------- | --------------------------------------------------- |
| CaseDetailHeader        | `case-detail-header.tsx`        | Keep as-is, already has Assign/Status/Merge buttons |
| CasePropertiesPanel     | `case-properties-panel.tsx`     | Move to left column, remove attachments section     |
| CaseTabs                | `case-tabs.tsx`                 | Modify tab list, add Summary tab                    |
| CaseActivityTimeline    | `case-activity-timeline.tsx`    | Fix API endpoint, enhance filters                   |
| CaseInvestigationsPanel | `case-investigations-panel.tsx` | Move to Investigations tab content                  |
| MessagesTab             | `messages-tab.tsx`              | Keep in center column tabs                          |
| FilesTab                | `files-tab.tsx`                 | Keep in center column tabs                          |
| RemediationTab          | `remediation-tab.tsx`           | Keep in center column tabs                          |
| LinkedRiuList           | `linked-riu-list.tsx`           | Move to Overview tab or left column                 |
| ActivityEntry           | `activity-entry.tsx`            | Keep as-is for activity feed                        |
| ActivityFilters         | `activity-filters.tsx`          | Enhance with more filter types                      |
| EditableField           | `editable-field.tsx`            | Keep for inline editing                             |
| PropertySection         | `property-section.tsx`          | Keep for collapsible sections                       |

### Frontend Components to Create

| Component                | Purpose                                                  |
| ------------------------ | -------------------------------------------------------- |
| `CaseInfoSummary`        | Top of left column - case #, status, pipeline, days open |
| `ActionButtonRow`        | Note, Interview, Document, Task, Email action buttons    |
| `ConnectedPeopleCard`    | Right column - people with labels                        |
| `ConnectedDocumentsCard` | Right column - linked documents                          |
| `AssignModal`            | Assign case to investigator                              |
| `StatusChangeModal`      | Change case status with rationale                        |
| `MergeModal`             | Case merge workflow with case search                     |
| `AddNoteModal`           | Add note to case activity                                |
| `AddPersonModal`         | Add person to case (search or free-form)                 |
| `EmailLogModal`          | Log external email or compose                            |
| `AiChatPanel`            | AI slide-out chat interface                              |
| `SummaryTab`             | AI/manual summary + write-up display                     |

### UI Components Available (shadcn/ui)

All needed primitives are installed:

- `Sheet` - For AI slide-out panel
- `Dialog` - For modals (Assign, Status, Merge, etc.)
- `Tabs` - For center column tab navigation
- `Card` - For right column entity cards
- `Badge` - For status/severity indicators
- `Select` - For dropdowns in forms
- `Input` / `Textarea` - For form fields
- `Button` - Action buttons
- `Collapsible` - For expandable sections
- `Avatar` - For people cards
- `Skeleton` - For loading states
- `Tooltip` - For action button hints

## Seed Data Enhancement

### Current State

- Case details: Pass-through from RIU details (variable length, often 100-200 words)
- Case summary: Truncation of details to 200 chars, or null
- AI summary: Template-generated, ~25-30 words (3 short sentences)

### Required

- Case details: 200-400 words
- Case summaries: 50-75 words

### Enhancement Strategy

1. Modify `case.seeder.ts` to enhance `details` field by appending investigator notes, timeline context, and preliminary findings to the RIU narrative
2. Generate proper `summary` field (50-75 words) that actually summarizes the case, not just truncates
3. Enhance `generateAiSummary()` to produce 50-75 word summaries with more context
4. Focus enhancement on the ~10 flagship cases that will be demonstrated

## Open Questions

Things that couldn't be fully resolved:

1. **Merge endpoint exposure**
   - What we know: CaseMergeService is fully implemented. CasesController does NOT have merge endpoints.
   - What's unclear: Should merge get its own controller or be added to CasesController?
   - Recommendation: Add to CasesController since merge is a case operation. Add `POST /cases/:id/merge`, `GET /cases/:id/merge-history`, `GET /cases/:id/can-merge/:targetId`.

2. **Person-case association frontend API**
   - What we know: PersonCaseAssociationService has full CRUD. No dedicated controller found for these association endpoints.
   - What's unclear: Are associations exposed via an existing API route or does a new one need to be created?
   - Recommendation: Check if associations module has controllers. If not, add endpoints to CasesController or create a dedicated route.

3. **Email compose vs email logging**
   - What we know: The requirement says "compose and send an email from the case page" AND "log external emails." The platform has a notifications module with email delivery but no general-purpose email compose/send API.
   - What's unclear: Does "compose and send" mean actually sending emails through the platform, or logging the act of sending an email externally?
   - Recommendation: For V1, implement email LOGGING (user records that they sent/received an email), not actual email sending. This creates an activity entry. Actual email compose/send would require SMTP integration which is out of scope.

4. **Interview and Task action buttons**
   - What we know: Requirements mention "Interview" and "Task" buttons. The codebase has an investigations module but no explicit "interview" entity.
   - What's unclear: What entity model should interviews use? Are they just a type of activity/note on the case?
   - Recommendation: Interviews should be activity log entries with type "interview" (just like notes are "commented"). Tasks may connect to the investigation module. For V1, both can be logged as activity entries with distinct action types.

## Sources

### Primary (HIGH confidence)

- Codebase inspection: `apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx` - Current page structure
- Codebase inspection: `apps/frontend/src/components/cases/case-tabs.tsx` - Existing tab system with URL sync
- Codebase inspection: `apps/backend/src/modules/cases/cases.controller.ts` - Available REST endpoints
- Codebase inspection: `apps/backend/src/modules/cases/case-merge.service.ts` - Full merge logic
- Codebase inspection: `apps/backend/src/modules/activity/activity-timeline.service.ts` - Timeline aggregation with related entities
- Codebase inspection: `apps/backend/src/modules/ai/ai.gateway.ts` - WebSocket streaming chat
- Codebase inspection: `apps/backend/src/modules/associations/person-case/person-case-association.service.ts` - Person associations
- Codebase inspection: `apps/backend/src/common/services/activity.service.ts` - Core activity logging
- Codebase inspection: `apps/backend/prisma/schema.prisma` - Case model with all fields
- Codebase inspection: `apps/frontend/src/components/ui/sheet.tsx` - Sheet component for slide-out

### Secondary (MEDIUM confidence)

- shadcn/ui component inventory from `apps/frontend/src/components/ui/` directory listing
- Seed data patterns from `apps/backend/prisma/seeders/case.seeder.ts` and `patterns/flagship-cases.ts`

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already installed and in use
- Architecture: HIGH - Based on direct codebase inspection of existing patterns
- Pitfalls: HIGH - Identified from actual code inspection (wrong API paths, missing endpoints)
- Backend APIs: HIGH - Read actual controller and service files
- Seed data: MEDIUM - Read seeder structure but didn't verify actual word counts of generated content

**Research date:** 2026-02-07
**Valid until:** 2026-03-09 (30 days - stable codebase)
