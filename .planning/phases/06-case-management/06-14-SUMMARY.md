---
phase: 06-case-management
plan: 14
subsystem: ui, investigations
tags: [react, checklist, templates, nextjs, radix-ui]

# Dependency graph
requires:
  - phase: 06-01
    provides: Investigation template backend service
  - phase: 06-07
    provides: Checklist progress backend service
provides:
  - Investigation detail page with checklist workflow
  - ChecklistPanel component with sections and progress
  - ChecklistItem component with completion actions
  - TemplateSelector for choosing investigation templates
  - Template-tier organization (Official/Team/Personal)
affects: [08-portals, investigations-ui]

# Tech tracking
tech-stack:
  added: ["@radix-ui/react-dropdown-menu"]
  patterns: [checklist-panel, tier-grouped-selector]

key-files:
  created:
    - apps/frontend/src/lib/checklist-api.ts
    - apps/frontend/src/lib/templates-api.ts
    - apps/frontend/src/components/investigations/checklist-item.tsx
    - apps/frontend/src/components/investigations/checklist-panel.tsx
    - apps/frontend/src/components/investigations/template-selector.tsx
    - apps/frontend/src/components/ui/dropdown-menu.tsx
    - apps/frontend/src/app/investigations/[id]/page.tsx
  modified:
    - apps/frontend/src/components/investigations/index.ts

key-decisions:
  - "Template selector groups by tier (OFFICIAL, TEAM, PERSONAL) for clear organization"
  - "ChecklistItem always shows completion dialog for notes even when not evidence-required"
  - "Dependency locking prevents completing items with incomplete prerequisites"
  - "InvestigationDetailPage uses tabbed interface matching existing Case detail pattern"

patterns-established:
  - "Tier-grouped selector: Group items by visibility tier with collapsible sections"
  - "Checklist panel: Collapsible sections with individual and overall progress bars"
  - "Item completion dialog: Always available for notes, required for evidence items"

# Metrics
duration: 27min
completed: 2026-02-04
---

# Phase 06 Plan 14: Investigation Checklist UI Summary

**Investigation detail page with checklist panel, template selector, and item completion workflow for guided investigations**

## Performance

- **Duration:** 27 min
- **Started:** 2026-02-04T00:36:35Z
- **Completed:** 2026-02-04T01:03:21Z
- **Tasks:** 3
- **Files modified:** 8 (7 created, 1 modified)

## Accomplishments

- Created checklist-api.ts and templates-api.ts for frontend API interactions
- Built ChecklistItem component with completion, skip, and undo actions
- Built ChecklistPanel with collapsible sections and progress indicators
- Created TemplateSelector with tier-based grouping and preview
- Added InvestigationDetailPage at /investigations/[id] route
- Added dropdown-menu UI component for template actions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Checklist Service** - `31115fa` (feat)
2. **Task 2: Create ChecklistItem and ChecklistPanel Components** - `3557b64` (feat)
3. **Task 3: Create Template Selector and Integrate into Detail Page** - `8466ffa` (feat)

## Files Created/Modified

- `apps/frontend/src/lib/checklist-api.ts` - API client for checklist operations (progress, complete, skip, custom items)
- `apps/frontend/src/lib/templates-api.ts` - API client for template listing and recommendations
- `apps/frontend/src/components/investigations/checklist-item.tsx` - Individual checklist item with actions
- `apps/frontend/src/components/investigations/checklist-panel.tsx` - Main panel with sections and progress
- `apps/frontend/src/components/investigations/template-selector.tsx` - Template picker with tier grouping
- `apps/frontend/src/components/ui/dropdown-menu.tsx` - Radix-based dropdown menu component
- `apps/frontend/src/app/investigations/[id]/page.tsx` - Investigation detail page with tabs
- `apps/frontend/src/components/investigations/index.ts` - Updated exports

## Decisions Made

1. **Always show completion dialog** - Even for non-evidence items, dialog allows adding notes for audit trail
2. **Tier grouping pattern** - Templates organized as Official > Team > Personal for clear hierarchy
3. **Dependency locking** - Items with unmet dependencies show lock icon and are non-interactive
4. **Tab structure** - Investigation page uses Checklist, Notes, Interviews, Files, Activity, Findings tabs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added dropdown-menu UI component**
- **Found during:** Task 2 (ChecklistPanel)
- **Issue:** ChecklistPanel needed dropdown menu for template actions, component didn't exist
- **Fix:** Created dropdown-menu.tsx based on Radix primitives, installed @radix-ui/react-dropdown-menu
- **Files modified:** apps/frontend/src/components/ui/dropdown-menu.tsx, apps/frontend/package.json
- **Verification:** Build passes
- **Committed in:** Part of Task 2 commit (component was previously staged)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor addition of missing UI primitive. No scope creep.

## Issues Encountered

- ChecklistItem was previously created in commit 76137c1 (plan 06-13) as part of a lint fix. No duplicate work was done.
- Task 1 commit appeared in history but was not at HEAD - verified commit exists and files are in place.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Investigation checklist UI complete and functional
- Ready for interviews panel implementation (placeholder in place)
- Ready for file management integration (placeholder in place)
- Activity timeline placeholder ready for real implementation

---
*Phase: 06-case-management*
*Completed: 2026-02-04*
