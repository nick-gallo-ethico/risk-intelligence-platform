---
phase: 13-hubspot-style-saved-views-system
plan: 12
subsystem: ui
tags: [react, saved-views, investigations, policies, tanstack-query, board-view]

# Dependency graph
requires:
  - phase: 13-11
    provides: SavedViewProvider, view components, Cases integration pattern
provides:
  - Investigations module saved views integration
  - Policies module saved views integration
  - useInvestigationsView hook with bulk actions
  - usePoliciesView hook with bulk actions
  - Module-specific board configurations
affects: [13-13, 13-14, 13-15]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Module view configs follow Cases pattern
    - Board groupBy field matches primary workflow axis (stage/status)

key-files:
  created:
    - apps/frontend/src/lib/views/configs/investigations.config.ts
    - apps/frontend/src/lib/views/configs/policies.config.ts
    - apps/frontend/src/hooks/views/useInvestigationsView.ts
    - apps/frontend/src/hooks/views/usePoliciesView.ts
  modified:
    - apps/frontend/src/app/(authenticated)/investigations/page.tsx
    - apps/frontend/src/app/(authenticated)/policies/page.tsx
    - apps/frontend/src/hooks/views/index.ts

key-decisions:
  - "Investigations board groups by stage (7 stages: planning through closed)"
  - "Policies board groups by status (6 statuses: draft through archived)"
  - "Both modules support merge bulk action for deduplication workflows"

patterns-established:
  - "View hooks follow consistent pattern: config, data, mutations, handlers"
  - "Board cardConfig uses module-specific icons (FileText, Shield, AlertCircle)"

# Metrics
duration: 7min
completed: 2026-02-07
---

# Phase 13 Plan 12: Investigations and Policies Module Integration Summary

**Investigations and Policies pages integrated with HubSpot-style saved views - table/board toggle, column customization, quick filters, bulk actions**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-07T15:17:13Z
- **Completed:** 2026-02-07T15:24:01Z
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments

- Created INVESTIGATIONS_VIEW_CONFIG with 7 investigation stages and 16 columns
- Created POLICIES_VIEW_CONFIG with 6 policy statuses and 16 columns
- Replaced legacy Investigations page with SavedViewProvider wrapper
- Replaced legacy Policies page with SavedViewProvider wrapper
- Added useInvestigationsView hook with assign, stage, merge, delete bulk actions
- Added usePoliciesView hook with assign, status, publish, archive, delete bulk actions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Investigations view configuration** - `0775c97` (feat)
2. **Task 2: Create Policies view configuration** - `116a2f2` (feat)
3. **Task 3: Integrate Investigations page with saved views** - `582d0ac` (feat)
4. **Task 4: Integrate Policies page with saved views** - `b1cb465` (feat)

## Files Created/Modified

- `apps/frontend/src/lib/views/configs/investigations.config.ts` - Investigation stages, columns, default views, board config
- `apps/frontend/src/lib/views/configs/policies.config.ts` - Policy statuses, columns, default views, board config
- `apps/frontend/src/hooks/views/useInvestigationsView.ts` - Data fetching, bulk actions for investigations
- `apps/frontend/src/hooks/views/usePoliciesView.ts` - Data fetching, bulk actions for policies
- `apps/frontend/src/app/(authenticated)/investigations/page.tsx` - Replaced with SavedViewProvider
- `apps/frontend/src/app/(authenticated)/policies/page.tsx` - Replaced with SavedViewProvider
- `apps/frontend/src/hooks/views/index.ts` - Export new hooks

## Decisions Made

- Investigations board groups by stage (primary workflow axis for investigation lifecycle)
- Policies board groups by status (primary workflow axis for policy approval workflow)
- Added merge action to Investigations for consolidating related investigations
- Added publish/archive shortcuts to Policies for common workflow actions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Investigations and Policies modules fully integrated with saved views
- Ready for Plan 13-13: RIUs module integration
- Pattern well-established for remaining modules (Persons, Campaigns, etc.)

---

_Phase: 13-hubspot-style-saved-views-system_
_Completed: 2026-02-07_
