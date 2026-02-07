---
phase: 13-hubspot-style-saved-views-system
plan: 11
subsystem: frontend-views
tags:
  - react
  - saved-views
  - cases
  - data-table
  - board-view
dependency-graph:
  requires:
    - 13-01 (types and constants)
    - 13-03 (SavedViewProvider)
    - 13-04 (ViewToolbar)
    - 13-05 (AdvancedFiltersPanel)
    - 13-06 (ColumnSelectionModal)
    - 13-07 (QuickFiltersRow)
    - 13-08 (BoardView components)
    - 13-09 (DataTable)
    - 13-10 (BoardView)
  provides:
    - Cases view configuration
    - useCasesView hook
    - Cases page with saved views integration
  affects:
    - 13-12 (RIUs module integration)
    - 13-13 (Investigations module integration)
tech-stack:
  added: []
  patterns:
    - Module view configuration pattern
    - Module-specific data hook pattern
    - SavedViewProvider integration pattern
file-tracking:
  created:
    - apps/frontend/src/lib/views/configs/cases.config.ts
    - apps/frontend/src/hooks/views/useCasesView.ts
  modified:
    - apps/frontend/src/app/(authenticated)/cases/page.tsx
    - apps/frontend/src/components/views/index.ts
    - apps/frontend/src/components/views/ViewToolbar.tsx
    - apps/frontend/src/hooks/views/index.ts
decisions:
  - decision: "Case type extends Record<string, unknown>"
    rationale: "Required for DataTable and BoardView generic constraints"
    alternatives: "Modify component generics (would affect all modules)"
  - decision: "ViewToolbar accepts optional actions prop"
    rationale: "Allows module-specific action buttons (New Case, etc.)"
    alternatives: "Hardcode actions per module (less flexible)"
metrics:
  duration: 7 min
  completed: 2026-02-07
---

# Phase 13 Plan 11: Cases Module Integration Summary

Cases module integrated with HubSpot-style saved views system as template for other modules.

## One-Liner

Cases page now uses SavedViewProvider with DataTable/BoardView, serving as reference pattern for 13-12 and 13-13.

## What Was Done

### Task 1: Cases View Configuration (2c1fae1)

Created `CASES_VIEW_CONFIG` in `apps/frontend/src/lib/views/configs/cases.config.ts`:

- **19 columns** across 7 property groups:
  - Core: caseNumber, title, status, priority, category
  - Assignment: assignee, team
  - Dates: createdAt, updatedAt, dueDate, closedAt
  - Source: sourceChannel
  - Organization: businessUnit, location
  - Investigation: investigationsCount, hasOpenInvestigation
  - AI: aiSummary, aiRiskScore

- **4 default system views**:
  - All Cases (default sort by createdAt desc)
  - My Cases (filtered by currentUserId)
  - Open Cases (open + in_progress statuses)
  - High Priority (high + critical priority)

- **5 bulk actions**: Assign, Change Status, Set Priority, Export Selected, Delete

- **Board configuration**: Status lanes with drag-and-drop

### Task 2: useCasesView Hook (5605bf0)

Created hook in `apps/frontend/src/hooks/views/useCasesView.ts`:

- Fetches cases from API using view state (filters, sort, search, pagination)
- Converts filter groups to API-compatible format
- Provides bulk action handlers:
  - `handleBulkAction(actionId, selectedIds)` for toolbar actions
  - `handleStatusChange(caseId, newStatus)` for board drag-and-drop
- Exposes mutations for status, priority, assign, and delete operations
- Uses TanStack Query with 30s stale time

### Task 3: Cases Page Integration (3aa319e)

Replaced legacy Cases page with saved views system:

- Wrapped content in `SavedViewProvider` with `CASES_VIEW_CONFIG`
- Added zone-based layout:
  - Zone 1: ViewTabsBar (view tabs with drag-to-reorder)
  - Zone 2: ViewToolbar (search, columns, filter, sort, export, save)
  - Zone 3: QuickFiltersRow (conditional on filter toggle)
  - Zone 4: DataTable or BoardView (based on viewMode)
- Added ColumnSelectionModal and AdvancedFiltersPanel modals
- Added "New Case" button via new `actions` prop on ViewToolbar

### Additional Changes

- Added `actions` prop to ViewToolbar for module-specific buttons
- Exported BoardView from components/views index
- Exported useCasesView and Case type from hooks/views index

## Key Code Patterns

### Module Configuration Pattern

```typescript
export const CASES_VIEW_CONFIG: ModuleViewConfig = {
  moduleType: "CASES",
  entityName: { singular: "Case", plural: "Cases" },
  primaryColumnId: "caseNumber",
  endpoints: { list: "/cases", export: "/cases/export", bulk: "/cases/bulk" },
  columns: [...],
  quickFilterProperties: [...],
  bulkActions: [...],
  defaultViews: [...],
  boardConfig: { defaultGroupBy: "status", columns: [...] },
};
```

### Module Hook Pattern

```typescript
export function useCasesView() {
  const { filters, quickFilters, searchQuery, sortBy, sortOrder, page, pageSize } = useSavedViewContext();

  const queryParams = useMemo(() => buildParams(...), [deps]);
  const { data, isLoading } = useQuery({ queryKey: ["cases", queryParams], ... });

  return { cases: data?.data || [], totalRecords: data?.total || 0, handleBulkAction, handleStatusChange };
}
```

### Page Integration Pattern

```tsx
export default function CasesPage() {
  return (
    <SavedViewProvider config={CASES_VIEW_CONFIG}>
      <CasesPageContent />
    </SavedViewProvider>
  );
}
```

## Deviations from Plan

### [Rule 2 - Missing Critical] Added actions prop to ViewToolbar

- **Found during:** Task 3
- **Issue:** ViewToolbar had no way to add module-specific action buttons
- **Fix:** Added optional `actions?: React.ReactNode` prop with divider
- **Files modified:** apps/frontend/src/components/views/ViewToolbar.tsx
- **Commit:** 3aa319e

### [Rule 1 - Bug] Fixed Case type constraint

- **Found during:** Task 3
- **Issue:** Case interface didn't satisfy `Record<string, unknown>` constraint
- **Fix:** Made Case extend `Record<string, unknown>`
- **Files modified:** apps/frontend/src/hooks/views/useCasesView.ts
- **Commit:** 3aa319e

## Verification

- TypeScript compilation: PASSED
- ESLint (plan files): PASSED (pre-existing errors in top-nav.tsx unrelated)

## Next Phase Readiness

This plan establishes the template pattern for:

- **13-12**: RIUs module integration (copy pattern with RIU-specific config)
- **13-13**: Investigations module integration (copy pattern with investigation-specific config)

All shared view components are now proven working with real module data.

## Files Changed

| File                                                   | Change                          |
| ------------------------------------------------------ | ------------------------------- |
| `apps/frontend/src/lib/views/configs/cases.config.ts`  | Created - CASES_VIEW_CONFIG     |
| `apps/frontend/src/hooks/views/useCasesView.ts`        | Created - Cases data hook       |
| `apps/frontend/src/app/(authenticated)/cases/page.tsx` | Replaced - Now uses saved views |
| `apps/frontend/src/components/views/ViewToolbar.tsx`   | Modified - Added actions prop   |
| `apps/frontend/src/components/views/index.ts`          | Modified - Export BoardView     |
| `apps/frontend/src/hooks/views/index.ts`               | Modified - Export useCasesView  |

## Commits

| Hash    | Message                                                               |
| ------- | --------------------------------------------------------------------- |
| 2c1fae1 | feat(13-11): add Cases module view configuration                      |
| 5605bf0 | feat(13-11): add useCasesView hook for data fetching and bulk actions |
| 3aa319e | feat(13-11): integrate Cases page with saved views system             |
