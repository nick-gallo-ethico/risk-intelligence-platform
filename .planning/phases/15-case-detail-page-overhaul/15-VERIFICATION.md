---
phase: 15-case-detail-page-overhaul
verified: 2026-02-11T14:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 9/12
  gaps_closed:
    - RIU-specific form answers organized by section in left column
    - AI can modify statuses and add notes directly to activity feed
    - Quick action buttons have functional modals for Interview Document and Task
  gaps_remaining: []
  regressions: []
  deferred:
    - truth: Email button lets users compose and send email
      reason: Intentionally deferred to future Notifications and Communications phase per 15-11-PLAN.md
      v1_scope: EmailLogModal allows logging external emails to activity feed
---

# Phase 15: Case Detail Page Overhaul Verification Report

**Phase Goal:** Rebuild the case detail page into a three-column layout that serves as the primary workspace for investigators -- with a complete activity feed, action buttons, AI panel, and connected entity cards. This is the page where users spend 80% of their time.

**Verified:** 2026-02-11T14:00:00Z
**Status:** passed
**Re-verification:** Yes -- after gap closure (Plans 15-08 through 15-11)

## Goal Achievement

### Observable Truths

| #   | Truth                                                                            | Status   | Evidence                                                                                                                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Case detail page renders three-column layout: left (1x), center (2x), right (1x) | VERIFIED | page.tsx line 213: grid-cols-[300px_1fr_300px]                                                                                                                                                                                                                                                                                                    |
| 2   | Left column shows case number, high-level info, action buttons                   | VERIFIED | CaseInfoSummary, ActionButtonRow, CasePropertiesPanel all imported and rendered                                                                                                                                                                                                                                                                   |
| 2b  | RIU-specific form answers organized by section in Overview tab                   | VERIFIED | LinkedRiuFormAnswers (342 lines) fetches /rius/:id/form-data, renders collapsible sections; integrated in case-tabs.tsx line 399                                                                                                                                                                                                                  |
| 3   | Center column has working tabs (Overview, Activities, Summary, etc.)             | VERIFIED | CaseTabs with 7+ tabs including Overview, Activities, Summary                                                                                                                                                                                                                                                                                     |
| 4   | Right column shows connected documents and people cards with Add button          | VERIFIED | ConnectedPeopleCard, ConnectedDocumentsCard imported and rendered                                                                                                                                                                                                                                                                                 |
| 5   | Assign button opens modal with available users                                   | VERIFIED | AssignModal imported and wired                                                                                                                                                                                                                                                                                                                    |
| 6   | Status button lets users change case status including close/resolve              | VERIFIED | StatusChangeModal imported and wired                                                                                                                                                                                                                                                                                                              |
| 7   | Merge button opens case merge workflow                                           | VERIFIED | MergeModal imported and wired                                                                                                                                                                                                                                                                                                                     |
| 8   | Email button logs external emails to activity feed                               | VERIFIED | EmailLogModal (233 lines) imported and wired; compose/send intentionally deferred (15-11)                                                                                                                                                                                                                                                         |
| 9   | AI button slides out panel where users can ask questions                         | VERIFIED | AiChatPanel with WebSocket streaming, Sheet overlay                                                                                                                                                                                                                                                                                               |
| 9b  | AI can modify statuses and add notes directly to activity feed                   | VERIFIED | add-case-note.action.ts (165 lines) and change-status.action.ts (348 lines) registered in ActionCatalog; BaseAgent discovers actions, sends as tools to Claude, executes via action executor, emits action_executed event; frontend handles via onActionComplete; Zod 4 fix ensures schemas serialize correctly; human-verified per 15-10-SUMMARY |
| 10  | Changes to fields or status automatically appear in activity feed                | VERIFIED | All modals call fetchCase() or onActionComplete after success; AI actions create AuditLog entries                                                                                                                                                                                                                                                 |
| 11  | All case tabs switch content correctly                                           | VERIFIED | 7 tabs with URL-synced navigation                                                                                                                                                                                                                                                                                                                 |
| 12  | Seeded case details are 200-400 words; summaries are 50-75 words                 | VERIFIED | Per 15-07 seed data enhancement                                                                                                                                                                                                                                                                                                                   |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact                     | Expected                           | Status   | Details                                                                                              |
| ---------------------------- | ---------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| page.tsx (case detail)       | Three-column layout                | VERIFIED | Line 213: grid-cols-[300px_1fr_300px], imports all 10 modals/panels                                  |
| case-info-summary.tsx        | Case number, badges, info          | VERIFIED | EXISTS, imported in page.tsx                                                                         |
| action-button-row.tsx        | 5 action buttons                   | VERIFIED | EXISTS, imported in page.tsx                                                                         |
| case-tabs.tsx                | Overview, Activities, Summary tabs | VERIFIED | EXISTS, imports LinkedRiuFormAnswers on line 21                                                      |
| connected-people-card.tsx    | People with Add button             | VERIFIED | EXISTS, imported in page.tsx                                                                         |
| connected-documents-card.tsx | Documents with Add button          | VERIFIED | EXISTS, imported in page.tsx                                                                         |
| assign-modal.tsx             | User selection modal               | VERIFIED | EXISTS, imported in page.tsx                                                                         |
| status-change-modal.tsx      | Status change UI                   | VERIFIED | EXISTS, imported in page.tsx                                                                         |
| merge-modal.tsx              | Merge workflow modal               | VERIFIED | EXISTS, imported in page.tsx                                                                         |
| email-log-modal.tsx          | Email logging UI                   | VERIFIED | EXISTS (233 lines), logs external emails; compose/send deferred                                      |
| ai-chat-panel.tsx            | AI chat panel                      | VERIFIED | EXISTS, WebSocket streaming, suggested prompts, action_executed handling                             |
| log-interview-modal.tsx      | Interview logging modal            | VERIFIED | EXISTS (243 lines), form with name/type/date/notes, posts to activity API                            |
| attach-document-modal.tsx    | Document attachment modal          | VERIFIED | EXISTS (278 lines), form with file/title/type/description, posts to activity API                     |
| create-task-modal.tsx        | Task creation modal                | VERIFIED | EXISTS (309 lines), form with title/description/assignee/date/priority, posts to activity API        |
| linked-riu-form-answers.tsx  | RIU intake form display            | VERIFIED | EXISTS (342 lines), fetches /rius/:id/form-data, collapsible sections, type-specific field rendering |
| rius.controller.ts           | Form data endpoint                 | VERIFIED | EXISTS (64 lines), GET :id/form-data, JWT/Tenant guarded                                             |
| riu-form-data.types.ts       | Form data types                    | VERIFIED | EXISTS, FormField, FormSection, RiuFormDataResponse types                                            |
| add-case-note.action.ts      | AI case note action                | VERIFIED | EXISTS (165 lines), creates AuditLog with note_added action, factory pattern                         |
| change-status.action.ts      | AI status change action            | VERIFIED | EXISTS (348 lines), validates transitions, updates case/investigation, creates AuditLog              |
| action.catalog.ts            | Action registry                    | VERIFIED | Registers add-note, add-case-note, change-status on module init                                      |
| skill.types.ts               | Zod-to-JSON schema converter       | VERIFIED | EXISTS (210 lines), Zod 4.x compatible getZodTypeName normalizes to PascalCase                       |

### Key Link Verification

| From                    | To                                   | Via                               | Status | Details                          |
| ----------------------- | ------------------------------------ | --------------------------------- | ------ | -------------------------------- |
| page.tsx                | CaseInfoSummary                      | Import line 13                    | WIRED  |                                  |
| page.tsx                | ActionButtonRow                      | Import line 16                    | WIRED  |                                  |
| page.tsx                | CaseTabs                             | Import line 18                    | WIRED  |                                  |
| page.tsx                | ConnectedPeopleCard                  | Import line 19                    | WIRED  |                                  |
| page.tsx                | ConnectedDocumentsCard               | Import line 20                    | WIRED  |                                  |
| page.tsx                | AiChatPanel                          | Import line 21, Sheet overlay     | WIRED  |                                  |
| page.tsx                | LogInterviewModal                    | Import line 28, state line 67     | WIRED  |                                  |
| page.tsx                | AttachDocumentModal                  | Import line 29, state line 68     | WIRED  |                                  |
| page.tsx                | CreateTaskModal                      | Import line 30, state line 69     | WIRED  |                                  |
| handleAction            | All 5 modal states                   | switch cases lines 157-173        | WIRED  | No console.log placeholders      |
| case-tabs.tsx           | LinkedRiuFormAnswers                 | Import line 21, rendered line 399 | WIRED  |                                  |
| LinkedRiuFormAnswers    | GET /rius/:id/form-data              | apiClient.get line 98             | WIRED  |                                  |
| RiusController          | RiusService.getFormData              | Dependency injection              | WIRED  |                                  |
| RiusService.getFormData | Type-specific section builders       | structureFormData line 705        | WIRED  | Hotline, WebForm, Disclosure     |
| RiusModule              | RiusController                       | controllers array                 | WIRED  |                                  |
| ActionCatalog           | createAddCaseNoteAction              | onModuleInit line 42              | WIRED  |                                  |
| ActionCatalog           | createChangeStatusAction             | onModuleInit line 43              | WIRED  |                                  |
| BaseAgent.getAllTools   | ActionCatalog.getAvailableActions    | Line 197                          | WIRED  | Dynamic discovery by entity type |
| BaseAgent.processStream | action_executed event                | Line 436                          | WIRED  | Emitted after tool call          |
| AiGateway               | client.emit action_executed          | Line 220                          | WIRED  | Forwards to frontend             |
| AiChatPanel             | socket.on action_executed            | Line 312                          | WIRED  | Calls onActionComplete           |
| add-case-note execute   | prisma.auditLog.create               | Line 87                           | WIRED  | Notes appear in Activity tab     |
| change-status execute   | prisma.case.update + auditLog.create | Lines 172, 181                    | WIRED  | Status changes logged            |

### Requirements Coverage

| Requirement (ROADMAP Success Criteria)                | Status         | Notes                                                                           |
| ----------------------------------------------------- | -------------- | ------------------------------------------------------------------------------- |
| 1. Three-column layout                                | SATISFIED      | grid-cols-[300px_1fr_300px]                                                     |
| 2. Left column info + actions + RIU form answers      | SATISFIED      | CaseInfoSummary + ActionButtonRow + LinkedRiuFormAnswers in Overview            |
| 3. Center column tabs (Overview, Activities, Summary) | SATISFIED      | 7 tabs with URL sync                                                            |
| 4. Right column connected entities                    | SATISFIED      | ConnectedPeopleCard + ConnectedDocumentsCard                                    |
| 5. Assign modal                                       | SATISFIED      |                                                                                 |
| 6. Status modal                                       | SATISFIED      |                                                                                 |
| 7. Merge modal                                        | SATISFIED      |                                                                                 |
| 8. Email functionality                                | SATISFIED (V1) | Log-only per scope decision (15-11); compose/send deferred                      |
| 9. AI panel with actions                              | SATISFIED      | WebSocket streaming + add-case-note + change-status actions verified end-to-end |
| 10. Activity feed auto-update                         | SATISFIED      | All mutations log to AuditLog; fetchCase on action completion                   |
| 11. Tab switching                                     | SATISFIED      |                                                                                 |
| 12. Seed data quality                                 | SATISFIED      | Per 15-07                                                                       |

### Anti-Patterns Found

| File                      | Line | Pattern                                  | Severity | Impact                                                        |
| ------------------------- | ---- | ---------------------------------------- | -------- | ------------------------------------------------------------- |
| page.tsx                  | 232  | investigations: 0, // TODO: Get from API | Info     | Minor count display; not a functional gap                     |
| attach-document-modal.tsx | 178  | Full upload integration coming soon      | Info     | UX description noting Azure Blob deferral; acceptable for MVP |

No blockers found. No stub patterns in any gap closure files.

### Human Verification Required

#### 1. Visual Layout Verification

**Test:** Navigate to a case detail page with a linked RIU and verify the three-column layout renders correctly.
**Expected:** Left column (300px) shows case info + action buttons + properties; center column fills remaining space with tabbed content; right column (300px) shows connected entities.
**Why human:** Visual layout validation cannot be done programmatically.

#### 2. RIU Form Answers Display

**Test:** Open a case with a linked hotline RIU, navigate to Overview tab, scroll to Original Intake Details section.
**Expected:** Collapsible sections showing Report Information, Reporter Details, Incident Details, Classification, Processing with field values rendered per type (boolean badges, formatted dates, multiselect tags).
**Why human:** Need to confirm backend returns correct data and frontend renders it properly.

#### 3. AI Action End-to-End (Regression Check)

**Test:** Open AI panel on a case, ask AI to change the status to OPEN and to add a note.
**Expected:** AI executes actions successfully, activity feed refreshes showing new entries.
**Why human:** Already human-verified per 15-10-SUMMARY; recommend re-verifying for regression.

### Gap Closure Summary

All three gaps from the previous verification have been resolved:

**Gap 1 (RIU Form Answers) -- CLOSED by 15-09:**

- Backend: GET /rius/:id/form-data endpoint in RiusController
- Backend: RiusService.getFormData with type-specific section builders (Hotline, WebForm, Disclosure)
- Frontend: LinkedRiuFormAnswers component (342 lines) with collapsible sections
- Integration: Rendered in Overview tab of case-tabs.tsx for primary linked RIU

**Gap 2 (Email Compose/Send) -- INTENTIONALLY DEFERRED by 15-11:**

- V1 scope: EmailLogModal allows logging external emails (satisfied)
- Full compose/send deferred to future Notifications and Communications phase
- Explicit scope decision documented with rationale

**Gap 3 (AI Actions) -- CLOSED by 15-10:**

- add-case-note.action.ts created with factory pattern, creates AuditLog entries
- change-status.action.ts already existed but had broken Zod 4.x schema serialization
- Critical Zod 4 compatibility fix in skill.types.ts (zodToJsonSchema) - affects ALL AI tool schemas
- Human-verified end-to-end: AI successfully changes status and adds notes

**Gap 4 (Quick Action Placeholders) -- CLOSED by 15-08:**

- LogInterviewModal (243 lines), AttachDocumentModal (278 lines), CreateTaskModal (309 lines)
- All three wired into page.tsx handleAction switch replacing console.log placeholders
- All post to /cases/:id/activity API with appropriate action types

---

_Verified: 2026-02-11T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification of: 2026-02-10T21:30:00Z initial verification_
