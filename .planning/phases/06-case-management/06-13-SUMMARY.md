---
phase: 06-case-management
plan: 13
subsystem: ui
tags: [react, nextjs, tabs, case-detail, riu-associations, shadcn-ui, tailwind]

# Dependency graph
requires:
  - phase: 04-core-entities
    provides: Case and RIU entity types, associations
  - phase: 06-case-management
    provides: Case activity timeline, investigations panel, properties panel
provides:
  - CaseDetailHeader with comprehensive case metadata display
  - LinkedRiuList component for RIU association visualization
  - CaseTabs tabbed interface for case sections
  - Enhanced CaseDetailPage with header, sidebar, and tabs layout
affects: [07-notifications-email, 08-portals, remediation-plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - URL-synced tab navigation via searchParams
    - Collapsible content with Radix primitives
    - Primary entity highlighting pattern (distinct border)

key-files:
  created:
    - apps/frontend/src/components/cases/case-detail-header.tsx
    - apps/frontend/src/components/cases/linked-riu-list.tsx
    - apps/frontend/src/components/cases/case-tabs.tsx
  modified:
    - apps/frontend/src/types/case.ts
    - apps/frontend/src/app/cases/[id]/page.tsx

key-decisions:
  - "RIU associations displayed with PRIMARY highlighted by distinct border and star icon"
  - "Tab navigation synced to URL for shareable deep links"
  - "Case detail layout: header + collapsible sidebar + tabbed content"
  - "Pipeline stage shown as progress bar percentage"

patterns-established:
  - "RIU-Case association display: Primary entity first, related entities below divider"
  - "Tab counts via badge indicators, unread highlighted in red"
  - "Expandable inline content pattern for linked entities"

# Metrics
duration: 23min
completed: 2026-02-04
---

# Phase 06-13: Case Detail with Linked RIUs Summary

**Case detail page with enhanced header, linked RIU display with expand/collapse, and tabbed content organization**

## Performance

- **Duration:** 23 min
- **Started:** 2026-02-04T00:42:02Z
- **Completed:** 2026-02-04T01:05:27Z
- **Tasks:** 3
- **Files modified:** 5 created/modified

## Accomplishments

- Enhanced CaseDetailHeader with reference number copy, status/severity badges, pipeline progress, SLA indicator, and quick actions
- LinkedRiuList component showing RIU associations with expandable details and primary RIU highlighting
- CaseTabs providing tabbed navigation for Overview, Investigations, Messages, Files, Activity, and Remediation
- Updated CaseDetailPage layout with header, collapsible sidebar, and main tabbed content area

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Case Detail Header Component** - `76137c1` (feat)
2. **Task 2: Create Linked RIU List Component** - `54b1c8a` (feat)
3. **Task 3: Create Case Tabs and Detail Page** - `c006290` (feat)

## Files Created/Modified

- `apps/frontend/src/components/cases/case-detail-header.tsx` - Enhanced header with copy button, badges, pipeline progress, SLA, assigned investigators
- `apps/frontend/src/components/cases/linked-riu-list.tsx` - RIU association display with expand/collapse, primary highlighting
- `apps/frontend/src/components/cases/case-tabs.tsx` - Tabbed interface with 6 sections, URL-synced navigation
- `apps/frontend/src/types/case.ts` - Extended with RiuAssociation, SlaStatus, RiuType, CaseCategory types
- `apps/frontend/src/app/cases/[id]/page.tsx` - Updated layout with header + sidebar + tabs

## Decisions Made

1. **RIU association display** - Primary RIU shown first with distinct blue border and star icon, others grouped below "Related Reports" divider
2. **Tab URL sync** - Tab state persisted in URL via searchParams for shareable deep links
3. **Expandable content** - RIU details expandable inline without navigation, showing summary and truncated details
4. **Badge counts** - Tabs show count badges, with unread messages in red for attention
5. **Pipeline progress** - Shown as percentage bar with current stage label

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed missing @radix-ui/react-dropdown-menu dependency**
- **Found during:** Task 1 (build verification)
- **Issue:** checklist-panel.tsx imported dropdown-menu but package not in dependencies
- **Fix:** Installed @radix-ui/react-dropdown-menu via npm
- **Files modified:** apps/frontend/package.json, package-lock.json
- **Committed in:** 76137c1 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed unescaped entities in checklist-item.tsx**
- **Found during:** Task 1 (build verification)
- **Issue:** Lint error for unescaped quotes in JSX
- **Fix:** Changed `"..."` to `&ldquo;...&rdquo;`
- **Files modified:** apps/frontend/src/components/investigations/checklist-item.tsx
- **Committed in:** 76137c1 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for build to pass. No scope creep.

## Issues Encountered

- Next.js build cache artifact error during verification - resolved by clearing .next directory

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Case detail UI complete with linked RIUs, tabbed sections, and enhanced header
- Messages and Files tabs show placeholder content - implementation deferred to messaging and attachment features
- Remediation tab ready for remediation plan integration
- Activity tab uses existing CaseActivityTimeline component

---
*Phase: 06-case-management*
*Completed: 2026-02-04*
