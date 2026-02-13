---
phase: 25-case-investigation-page-redesign
plan: 04
subsystem: ui
tags: [react, next.js, tailwind, three-column-layout, investigation-detail]

# Dependency graph
requires:
  - phase: 25-01
    provides: Activity timeline with search, filters, date grouping
  - phase: 25-02
    provides: QuickActionGrid shared component
  - phase: 25-03
    provides: AssociationCard wrapper component
provides:
  - Three-column investigation detail page layout
  - InvestigationHeader with breadcrumbs, badges, pipeline
  - InvestigationInfoSummary milestone checklist card
  - InvestigationActionButtons using QuickActionGrid
  - InvestigationPropertiesPanel with collapsible sections
affects: [25-05, 25-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Three-column layout: grid-cols-[300px_1fr_300px]
    - Milestone checklist pattern for progress visualization
    - Collapsible property sections with chevron and gear icons

key-files:
  created:
    - apps/frontend/src/components/investigations/investigation-info-summary.tsx
    - apps/frontend/src/components/investigations/investigation-action-buttons.tsx
    - apps/frontend/src/components/investigations/investigation-properties-panel.tsx
  modified:
    - apps/frontend/src/app/(authenticated)/investigations/[id]/page.tsx
    - apps/frontend/src/components/investigations/investigation-header.tsx
    - apps/frontend/src/types/investigation.ts

key-decisions:
  - "Investigation header follows case header pattern with 5-stage pipeline (New, Assigned, Investigating, Review, Closed)"
  - "Milestone checklist shows 5 progress items: assigned, template, checklist%, interviews, findings"
  - "InvestigationActionButtons uses 3-column QuickActionGrid (5 actions vs case 6)"
  - "Properties panel has 5 sections, findings section conditional on PENDING_REVIEW/CLOSED"

patterns-established:
  - "Sticky left sidebar pattern for record detail pages"
  - "Milestone checklist with checkmarks for progress visualization"

# Metrics
duration: 15min
completed: 2026-02-13
---

# Phase 25 Plan 04: Investigation Three-Column Layout Summary

**Three-column investigation detail page with header breadcrumbs, pipeline progress, milestone checklist, and collapsible properties panel matching case detail pattern**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-13
- **Completed:** 2026-02-13
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Converted investigation page from single-column to three-column layout matching case detail
- Enhanced header with breadcrumbs (Cases > {caseRef} > Investigation #N), status/type/SLA badges, and 5-stage pipeline
- Created InvestigationInfoSummary with milestone checklist (assigned, template, checklist%, interviews, findings)
- Created InvestigationActionButtons using shared QuickActionGrid component (5 actions, 3 columns)
- Created InvestigationPropertiesPanel with 5 collapsible sections and gear icons

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert investigation page to three-column layout** - `91b6344` (feat)
2. **Task 2: Enhance investigation header with breadcrumbs and badges** - `a0df8f0` (feat)
3. **Task 3: Create left sidebar components** - `169bcd8` (feat)

## Files Created/Modified

- `apps/frontend/src/app/(authenticated)/investigations/[id]/page.tsx` - Three-column layout with header, left sidebar, center tabs, right placeholder
- `apps/frontend/src/components/investigations/investigation-header.tsx` - Breadcrumbs, badges, pipeline, avatars, meta info
- `apps/frontend/src/components/investigations/investigation-info-summary.tsx` - Milestone checklist with checkmarks
- `apps/frontend/src/components/investigations/investigation-action-buttons.tsx` - QuickActionGrid with 5 actions
- `apps/frontend/src/components/investigations/investigation-properties-panel.tsx` - 5 collapsible sections
- `apps/frontend/src/types/investigation.ts` - Extended Investigation type with category, case, investigators, template fields

## Decisions Made

- Investigation header mirrors case header pattern for consistent UX
- Pipeline stages mapped from investigation status: NEW=0, ASSIGNED=1, INVESTIGATING=2, PENDING_REVIEW=3, CLOSED=4
- ON_HOLD status shown at investigating stage with slate color
- Properties panel sections: Status & Classification, Assignment, Timeline, Template & Checklist, Findings (conditional)
- Findings section only shown for PENDING_REVIEW and CLOSED status

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all components created successfully, TypeScript compilation passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Three-column layout foundation complete
- Plan 05 ready: Investigation tabs reorder with Activities first and enhanced activity timeline
- Plan 06 ready: Right sidebar association cards (similar to case pattern from 25-03)
- Quick action modals for investigation (note, interview, evidence, task) can be added in future plans

---

_Phase: 25-case-investigation-page-redesign_
_Plan: 04_
_Completed: 2026-02-13_
