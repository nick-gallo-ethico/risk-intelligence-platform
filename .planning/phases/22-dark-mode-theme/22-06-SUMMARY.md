# Phase 22 Plan 06: Case Detail Components Dark Mode Summary

## One-liner

Complete dark mode coverage for case management sub-components including investigation cards, linked RIUs, remediation tabs, messages, files, and activity filters.

## Commits

| Task | Commit  | Description                                                                                                                                               |
| ---- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 3ba1cd0 | Task 1 files themed in 22-08 (case-properties-panel, case-investigations-panel, case-activity-timeline, activity-entry, editable-field, property-section) |
| 1    | f35bb89 | feat(22-06): theme activity filters for dark mode                                                                                                         |
| 2    | a5e31f9 | feat(22-06): theme case sub-components for dark mode                                                                                                      |

## Files Modified

### Task 1: Theme case panels, activity timeline, and forms

- `apps/frontend/src/components/cases/activity-filters.tsx` - Dark variants for tab active/inactive states

Note: Most Task 1 files were themed in commit 3ba1cd0 as part of plan 22-08.

### Task 2: Theme case sub-components

- `apps/frontend/src/components/cases/investigation-card.tsx` - STATUS_COLORS, SLA_COLORS with dark variants
- `apps/frontend/src/components/cases/linked-riu-list.tsx` - ASSOCIATION_CONFIG, SEVERITY_COLORS with dark variants
- `apps/frontend/src/components/cases/messages-tab.tsx` - Message bubbles, email cards, section tabs
- `apps/frontend/src/components/cases/remediation-tab.tsx` - getPlanStatusBadge with dark variants
- `apps/frontend/src/components/cases/remediation-step-card.tsx` - getStatusBadge with dark variants
- `apps/frontend/src/components/cases/files-tab.tsx` - File cards, drop zone, preview dialog

## Technical Approach

Applied consistent dark mode theming pattern across all case sub-components:

### Color Mapping Pattern

- Status/severity badges: `bg-{color}-100 dark:bg-{color}-900/30`, `text-{color}-700 dark:text-{color}-300`
- Card backgrounds: `bg-white` -> `bg-card`
- Muted backgrounds: `bg-gray-100` -> `bg-muted`
- Text colors: `text-gray-900` -> `text-foreground`, `text-gray-500` -> `text-muted-foreground`
- Borders: `border-gray-200` -> `border-border`
- Hover states: `hover:bg-gray-100` -> `hover:bg-muted`

### Component-Specific Patterns

**Investigation Card:**

- STATUS_COLORS record with dark variants for all 6 investigation statuses
- SLA_COLORS record with dark variants for ON_TRACK, WARNING, OVERDUE

**Linked RIU List:**

- ASSOCIATION_CONFIG for PRIMARY, RELATED, MERGED_FROM with dark borders
- SEVERITY_COLORS for LOW, MEDIUM, HIGH with dark backgrounds

**Messages Tab:**

- Message bubbles: outbound blue stays blue, inbound uses semantic bg-muted
- Email cards: bg-card with proper border contrast
- Section tabs: semantic foreground/muted-foreground states

**Files Tab:**

- Drop zone: `border-border` default, `dark:bg-blue-900/20` for drag state
- File cards: `bg-card`, `bg-muted` for thumbnail area
- Evidence badge: amber with dark variant

## Deviations from Plan

### Discovery: Task 1 Files Already Themed

- **Found during:** Task 1 execution
- **Issue:** Most Task 1 files (case-properties-panel, case-investigations-panel, case-activity-timeline, activity-entry, editable-field, property-section) were already themed in commit 3ba1cd0 as part of 22-08
- **Resolution:** Only activity-filters.tsx needed additional updates
- **Impact:** Reduced scope for Task 1, plan executed correctly

## Verification

- TypeScript compilation: `npx tsc --noEmit` passes
- All case sub-components render correctly in dark mode
- Investigation cards show proper status/SLA color contrast
- Linked RIUs display with correct association badges
- Remediation steps and plans are readable in both modes
- Files tab with drop zone and preview dialog works in dark mode

## Duration

~25 minutes

## Decisions Made

| Decision                                  | Rationale                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| Skip re-theming already-themed files      | 3ba1cd0 already applied dark mode to 6 of 8 Task 1 files                    |
| Use `dark:bg-{color}-900/30` pattern      | Consistent with other components, provides 30% opacity for visual hierarchy |
| Keep hover states explicit                | `dark:hover:bg-{color}-900/30` ensures hover feedback in dark mode          |
| Use semantic tokens for non-status colors | `bg-card`, `text-foreground` auto-adapt via CSS variables                   |

## Next Phase Readiness

Ready to continue with remaining Phase 22 plans (22-07, 22-09, etc.)
