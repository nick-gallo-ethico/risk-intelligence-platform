---
phase: 15-case-detail-page-overhaul
plan: 04
subsystem: frontend/cases
tags: [modals, dialogs, case-actions, shadcn-ui]
dependency-graph:
  requires: ["15-01", "15-02"]
  provides:
    [
      "action-modals",
      "case-assignment",
      "status-change",
      "case-merge",
      "notes",
      "email-logging",
    ]
  affects: ["15-05", "15-06"]
tech-stack:
  added: []
  patterns:
    ["controlled-dialog", "two-step-modal", "debounced-search", "api-fallback"]
key-files:
  created:
    - apps/frontend/src/components/cases/assign-modal.tsx
    - apps/frontend/src/components/cases/status-change-modal.tsx
    - apps/frontend/src/components/cases/merge-modal.tsx
    - apps/frontend/src/components/cases/add-note-modal.tsx
    - apps/frontend/src/components/cases/email-log-modal.tsx
  modified:
    - apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx
decisions:
  - id: "modal-separation"
    summary: "Each modal is a separate component file, not inlined in page.tsx"
  - id: "api-fallback"
    summary: "Activity endpoints with fallback to notes/communications endpoints"
  - id: "debounced-search"
    summary: "MergeModal uses 300ms debounce for case search"
  - id: "two-step-merge"
    summary: "Merge flow requires search then confirmation with reason"
metrics:
  duration: "~15 minutes"
  completed: "2026-02-10"
---

# Phase 15 Plan 04: Action Modals Summary

**One-liner:** Five action modals (Assign, Status, Merge, Note, Email) wired to case detail header and action buttons with API integration.

## What Was Built

### Task 1: Header Action Modals (AssignModal, StatusChangeModal, MergeModal)

**AssignModal** (`assign-modal.tsx`)

- Fetches available users via `usersApi.list({ isActive: true })`
- Filters to investigator-capable roles (SYSTEM_ADMIN, CCO, COMPLIANCE_OFFICER, TRIAGE_LEAD, INVESTIGATOR, HR_PARTNER, LEGAL_COUNSEL)
- Multi-select with checkboxes, highlights currently assigned users
- Submits via PATCH `/cases/:id` with `assignedInvestigatorIds`
- Loading state with spinner while fetching users

**StatusChangeModal** (`status-change-modal.tsx`)

- Dropdown with NEW, OPEN, CLOSED statuses
- Current status excluded from options
- Requires rationale (min 10 characters)
- Yellow warning alert when closing a case
- Submits via `casesApi.updateStatus()` (PATCH `/cases/:id/status`)

**MergeModal** (`merge-modal.tsx`)

- Two-step flow:
  1. Search for target case (debounced 300ms, min 2 characters)
  2. Confirm merge with reason (min 10 characters)
- Displays source -> target visual with reference numbers
- Red warning about irreversibility
- Submits via POST `/cases/:id/merge` to target case
- On success, redirects to target case via `router.push()`

### Task 2: Action Button Modals and Wiring

**AddNoteModal** (`add-note-modal.tsx`)

- Simple textarea for note content (min 5 characters)
- Posts to `/cases/:id/activity` with action='commented'
- Fallback to `/cases/:id/notes` if activity endpoint fails

**EmailLogModal** (`email-log-modal.tsx`)

- Direction: Sent/Received dropdown
- To/From email address field
- Subject line
- Summary textarea (min 5 characters)
- Date picker (defaults to today)
- Posts to `/cases/:id/activity` with action='emailed' and metadata
- Fallback to `/cases/:id/communications`

**page.tsx Updates**

- Added 5 modal open states
- Wired header buttons (Assign, Status, Merge) to open modals
- Wired action buttons (Note, Email) via switch statement
- Interview, Document, Task log "coming soon" to console
- All modals call `fetchCase()` on success to refresh data
- MergeModal success handler redirects to target case

## Commit History

| Commit  | Description                                                                           |
| ------- | ------------------------------------------------------------------------------------- |
| 68f1bb5 | AssignModal, StatusChangeModal, MergeModal (committed in overlapping 15-05 execution) |
| 316c502 | AddNoteModal, EmailLogModal, page.tsx modal wiring                                    |

## Verification Results

1. `npx tsc --noEmit` - Passes
2. All 5 modal component files exist in `apps/frontend/src/components/cases/`
3. `page.tsx` imports and renders all 5 modals with open/close state
4. Header button handlers open respective modals
5. Action button handlers open Note/Email modals, log "coming soon" for others

## Deviations from Plan

None - plan executed exactly as written.

## Next Steps

- **15-05:** Connected entities in right column (people, documents)
- **15-06:** AI assistant panel
- Integration testing with running backend to verify API calls

## Key Patterns Established

### Controlled Dialog Pattern

```tsx
<AssignModal
  caseId={caseData.id}
  open={assignModalOpen}
  onOpenChange={setAssignModalOpen}
  onAssigned={fetchCase}
/>
```

### API Fallback Pattern

```tsx
try {
  await apiClient.post(`/cases/${caseId}/activity`, { ... });
} catch (err) {
  // Fallback to alternative endpoint
  await apiClient.post(`/cases/${caseId}/notes`, { ... });
}
```

### Two-Step Modal Pattern

```tsx
const [step, setStep] = useState<"search" | "confirm">("search");
// Step 1: Search/select
// Step 2: Confirm with additional data
```
