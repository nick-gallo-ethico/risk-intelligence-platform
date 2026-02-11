---
phase: 15
plan: 05
subsystem: frontend-ui
tags:
  [case-detail, right-column, connected-entities, people, documents, ai-panel]
requires:
  - "15-01 (backend REST endpoints)"
  - "15-02 (three-column layout)"
provides:
  - "ConnectedPeopleCard component with evidentiary label grouping"
  - "ConnectedDocumentsCard component with file type icons"
  - "AddPersonModal for associating people to cases"
  - "Right column populated with real components"
  - "AI panel trigger button state"
affects:
  - "15-06 (AI panel Sheet implementation)"
tech-stack:
  added: []
  patterns:
    - "HubSpot V4 Associations pattern for person-case links"
    - "Evidentiary label grouping (SUBJECT, REPORTER, WITNESS)"
    - "Role label grouping (INVESTIGATOR, LEGAL_COUNSEL, etc.)"
    - "Debounced search pattern for person lookup"
key-files:
  created:
    - "apps/frontend/src/components/cases/connected-people-card.tsx"
    - "apps/frontend/src/components/cases/connected-documents-card.tsx"
    - "apps/frontend/src/components/cases/add-person-modal.tsx"
  modified:
    - "apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx"
decisions:
  - id: D-1505-01
    title: "Person grouping by evidentiary vs role labels"
    choice: "Group evidentiary labels first (SUBJECT, REPORTER, WITNESS), then role labels"
    rationale: "Evidentiary associations are primary investigation focus; role assignments secondary"
  - id: D-1505-02
    title: "AddPersonModal manages own state internally"
    choice: "Modal state managed by ConnectedPeopleCard, not page.tsx"
    rationale: "Keeps page.tsx clean; ConnectedPeopleCard is self-contained"
  - id: D-1505-03
    title: "Document card shows first 5 attachments"
    choice: "Limit sidebar display to 5 files with link to Files tab"
    rationale: "Right column is summary view; full list accessible via tabs"
metrics:
  duration: ~25 minutes
  completed: 2026-02-11
---

# Phase 15 Plan 05: Right Column Connected Entities Summary

**One-liner:** Right column now displays connected people with evidentiary labels, attached documents with type icons, and AI assistant trigger button.

## What Was Built

### Task 1: ConnectedPeopleCard and AddPersonModal

**ConnectedPeopleCard (`connected-people-card.tsx`):**

- Fetches connected people from `GET /cases/:id/persons` API
- Groups people by label with section headers:
  - Evidentiary: Subjects, Reporters, Witnesses
  - Role: Investigators, Legal Counsel, Approvers, Reviewers, Managers, Stakeholders
- Each person row shows:
  - Avatar with initials fallback
  - Full name (bold)
  - Evidentiary/role badge with distinct colors:
    - SUBJECT: red
    - REPORTER: blue
    - WITNESS: amber
    - ASSIGNED_INVESTIGATOR: green
    - LEGAL_COUNSEL: violet
  - Job title and department (muted text)
- "Add Person" button opens AddPersonModal
- Loading skeleton and error states
- Person count badge in header

**AddPersonModal (`add-person-modal.tsx`):**

- Two modes: search existing and create new
- **Search mode:**
  - Input with debounced search (300ms)
  - Calls `GET /persons?search=query`
  - Selectable result rows with avatar
- **Create mode:**
  - Form: firstName, lastName, email (optional), phone (optional)
  - Creates person via `POST /persons` then associates
- Label selection:
  - Evidentiary: REPORTER, SUBJECT, WITNESS
  - Role: INVESTIGATOR, LEGAL_COUNSEL, APPROVER, REVIEWER, MANAGER_OF_SUBJECT, STAKEHOLDER
- Optional notes textarea
- Calls `POST /cases/:id/persons` to create association
- Validation and error handling

### Task 2: ConnectedDocumentsCard and Right Column Population

**ConnectedDocumentsCard (`connected-documents-card.tsx`):**

- Fetches from `GET /attachments?entityType=CASE&entityId=xxx&limit=5`
- Each document row shows:
  - File type icon (FileText, FileImage, FileSpreadsheet, FileVideo, FileAudio)
  - Truncated filename with tooltip
  - File size (formatted: "2.4 MB")
  - Upload date (short format)
  - Evidence badge if marked
- Download button on hover
- "Attach Document" button
- Loading skeleton and error states
- Document count badge in header

**Page.tsx Right Column:**

- Replaced placeholder with real components:
  ```tsx
  <aside className="border-l overflow-y-auto bg-gray-50/50 hidden lg:block">
    <div className="p-4 space-y-4">
      <ConnectedPeopleCard caseId={caseData.id} />
      <ConnectedDocumentsCard caseId={caseData.id} />
      <Button onClick={() => setAiPanelOpen(true)}>
        <Sparkles /> Ask AI Assistant
      </Button>
    </div>
  </aside>
  ```
- Added `aiPanelOpen` state for Plan 06
- Updated skeleton loader for right column

## Technical Details

### API Integration

| Component              | API Endpoint                       | Method |
| ---------------------- | ---------------------------------- | ------ |
| ConnectedPeopleCard    | `/cases/:id/persons`               | GET    |
| AddPersonModal search  | `/persons?search=query`            | GET    |
| AddPersonModal create  | `/persons` + `/cases/:id/persons`  | POST   |
| ConnectedDocumentsCard | `/attachments?entityType=CASE&...` | GET    |

### Label Color Scheme

| Label                 | Background    | Text            | Border            |
| --------------------- | ------------- | --------------- | ----------------- |
| REPORTER              | bg-blue-100   | text-blue-800   | border-blue-200   |
| SUBJECT               | bg-red-100    | text-red-800    | border-red-200    |
| WITNESS               | bg-amber-100  | text-amber-800  | border-amber-200  |
| ASSIGNED_INVESTIGATOR | bg-green-100  | text-green-800  | border-green-200  |
| LEGAL_COUNSEL         | bg-violet-100 | text-violet-800 | border-violet-200 |

### File Icon Mapping

| MIME Type Pattern | Icon            |
| ----------------- | --------------- |
| image/\*          | FileImage       |
| video/\*          | FileVideo       |
| audio/\*          | FileAudio       |
| spreadsheet/excel | FileSpreadsheet |
| document/word/pdf | FileText        |
| default           | File            |

## Commits

| Hash    | Type | Description                                          |
| ------- | ---- | ---------------------------------------------------- |
| b06e9e1 | feat | Add ConnectedPeopleCard and AddPersonModal           |
| 33dcce8 | feat | Add ConnectedDocumentsCard and populate right column |

## Verification Results

| Check                            | Status |
| -------------------------------- | ------ |
| TypeScript compilation           | PASS   |
| ConnectedPeopleCard exists       | PASS   |
| ConnectedDocumentsCard exists    | PASS   |
| AddPersonModal exists            | PASS   |
| Fetches from /cases/:id/persons  | PASS   |
| Right column has real components | PASS   |
| AI trigger button exists         | PASS   |
| aiPanelOpen state added          | PASS   |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for:**

- 15-06: AI panel Sheet implementation (aiPanelOpen state exists)

**No blockers identified.**
