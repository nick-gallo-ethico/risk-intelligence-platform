---
phase: 25-case-investigation-page-redesign
plan: 06
subsystem: ui
tags: [investigation, sidebar, association-cards, ai-assistant, react, next.js]

# Dependency graph
requires:
  - phase: 25-03
    provides: AssociationCard reusable wrapper component
  - phase: 25-04
    provides: Investigation three-column layout
  - phase: 25-05
    provides: Investigation activity timeline and tabs
provides:
  - Investigation right sidebar with Connected People card
  - ParentCaseCard component with clickable link to parent case
  - InvestigationEvidenceCard with file count and type badges
  - AI Assistant button opening investigation-scoped AI panel
  - ConnectedPeopleCard adapted to support investigationId
affects: [investigation-detail, ai-integration, future-person-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Entity-agnostic association card pattern (caseId OR investigationId)
    - AI panel reuse across entity types

key-files:
  created:
    - apps/frontend/src/components/investigations/parent-case-card.tsx
    - apps/frontend/src/components/investigations/investigation-evidence-card.tsx
  modified:
    - apps/frontend/src/components/cases/connected-people-card.tsx
    - apps/frontend/src/app/(authenticated)/investigations/[id]/page.tsx
    - apps/frontend/src/types/investigation.ts

key-decisions:
  - "ConnectedPeopleCard accepts either caseId OR investigationId for entity-agnostic reuse"
  - "ParentCaseCard displays case reference, status, severity, category, and summary with clickable link"
  - "InvestigationEvidenceCard fetches from /investigations/:id/files endpoint with graceful fallback"
  - "AI Assistant button uses gradient styling to match AiChatPanel header"

patterns-established:
  - "Entity-agnostic association cards: accept caseId | investigationId prop, determine endpoint dynamically"
  - "Right sidebar order: People, Parent Case, Evidence, AI button"

# Metrics
duration: 12min
completed: 2026-02-13
---

# Phase 25 Plan 06: Investigation Right Sidebar Summary

**Investigation right sidebar complete with Connected People, Parent Case, Evidence cards and AI Assistant button**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-13
- **Completed:** 2026-02-13
- **Tasks:** 3 automated + 1 checkpoint
- **Files modified:** 5

## Accomplishments

- Created ParentCaseCard showing parent case with reference, status, severity, summary, and clickable link
- Created InvestigationEvidenceCard with file type badges and count, fetching from investigation files API
- Adapted ConnectedPeopleCard to accept investigationId prop for entity-agnostic reuse
- Wired right sidebar with all 4 components: People, Parent Case, Evidence, AI button
- Integrated AiChatPanel Sheet for investigation-scoped AI assistance

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ParentCaseCard** - `770a99c` (feat)
2. **Task 2: Create InvestigationEvidenceCard** - `ea2d9b3` (feat)
3. **Task 3: Wire right sidebar and adapt ConnectedPeopleCard** - `45310f8` (feat)

**Plan metadata:** [pending checkpoint verification]

## Files Created/Modified

- `apps/frontend/src/components/investigations/parent-case-card.tsx` - Parent case association card with clickable link
- `apps/frontend/src/components/investigations/investigation-evidence-card.tsx` - Evidence files card with type badges
- `apps/frontend/src/components/cases/connected-people-card.tsx` - Adapted to accept investigationId prop
- `apps/frontend/src/app/(authenticated)/investigations/[id]/page.tsx` - Wired right sidebar with all cards
- `apps/frontend/src/types/investigation.ts` - Extended InvestigationCase type with status/severity/summary fields

## Decisions Made

- ConnectedPeopleCard accepts either caseId OR investigationId for maximum reuse
- InvestigationEvidenceCard gracefully handles missing API endpoint (returns empty state)
- ParentCaseCard uses AssociationCard wrapper with collapsible=false for single-item display
- AI button styled with purple-blue gradient to match AiChatPanel header

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Investigation detail page complete with full three-column layout
- Both Case and Investigation pages now follow HubSpot pattern
- Phase 25 Case & Investigation Page Redesign complete after human verification
- Ready for future enhancements: person management modals for investigations, evidence file upload

---

_Phase: 25-case-investigation-page-redesign_
_Completed: 2026-02-13_
