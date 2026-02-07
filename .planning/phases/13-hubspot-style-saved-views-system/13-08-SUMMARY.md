---
phase: 13-hubspot-style-saved-views-system
plan: 08
subsystem: views
tags:
  - frontend
  - filters
  - react
  - shadcn
dependency_graph:
  requires:
    - 13-02 (View system types and constants)
    - 13-03 (SavedViewProvider)
  provides:
    - AdvancedFiltersPanel slide-out component
    - FilterGroupCard with AND-joined conditions
    - FilterConditionRow with type-specific value inputs
  affects:
    - 13-09 (TableView with filters integration)
    - Any page needing advanced filtering
tech-stack:
  patterns:
    - Sheet slide-out for panel
    - Compound component pattern for filter hierarchy
    - Type-mapped operator selection
key-files:
  created:
    - apps/frontend/src/components/views/FilterConditionRow.tsx
    - apps/frontend/src/components/views/FilterGroupCard.tsx
    - apps/frontend/src/components/views/AdvancedFiltersPanel.tsx
  modified:
    - apps/frontend/src/lib/views/operators.ts
    - apps/frontend/src/lib/utils.ts
    - apps/frontend/src/components/views/index.ts
decisions:
  - Use ColumnDefinition from view-config.ts (not ColumnConfig from types.ts) for richer column metadata
  - Map ColumnType to PropertyType for operator lookup (datetime->date, users->user, currency->number)
  - Max 2 filter groups (OR) with max 20 conditions per group (AND)
metrics:
  duration: 21 min
  completed: 2026-02-07
---

# Phase 13 Plan 08: Advanced Filters Panel Summary

Advanced filter slide-out panel with AND/OR filter groups supporting complex filter expressions.

## One-liner

Sheet slide-out with OR-joined filter groups containing AND-joined conditions with type-specific value inputs.

## What Was Built

### FilterConditionRow Component

Single filter condition row providing:

- Property selector dropdown (from filterable columns)
- Operator dropdown (varies by property type)
- Type-specific value inputs:
  - **Text**: Single input or comma-separated for is_any_of/is_none_of
  - **Number**: Number input with min/max for is_between
  - **Date**: Calendar picker for single date, dual calendars for is_between, number+unit for relative dates
  - **Enum/Status/User**: Multi-select dropdown with checkbox list
  - **Boolean**: No value input (operators are is_true/is_false)
- Remove condition button

### FilterGroupCard Component

Card wrapper for a group of conditions:

- Group header with index label
- Conditions rendered with AND separator between them
- Add filter button (up to 20 conditions per group)
- Duplicate and delete group actions

### AdvancedFiltersPanel Component

Sheet slide-out from right side:

- Header with title and clear all button
- Empty state with add group prompt
- Filter groups with OR separator between them
- Add filter group button (up to 2 groups)
- Footer with real-time application notice

### Supporting Changes

- **operators.ts**: Added `getOperatorsForType()` function and `OPERATOR_LABELS` map
- **utils.ts**: Added `generateId()` utility function
- **index.ts**: Exported new components

## Technical Decisions

### Type Mapping for Operators

ColumnType from view-config.ts includes additional types not in PropertyType. Created mapping function:

```typescript
function getPropertyTypeFromColumnType(columnType: ColumnType): string {
  switch (columnType) {
    case "datetime":
      return "date";
    case "users":
    case "link":
      return "user";
    case "currency":
      return "number";
    default:
      return columnType;
  }
}
```

### Filter Group Limits

Per HubSpot pattern:

- Maximum 2 filter groups (OR logic)
- Maximum 20 conditions per group (AND logic)
- Visual OR separator (amber badge) between groups
- Visual AND separator (muted text) between conditions

## Commits

| Hash    | Type | Description                                  |
| ------- | ---- | -------------------------------------------- |
| 648c00f | feat | FilterConditionRow with type-specific inputs |
| fe5bc7f | feat | FilterGroupCard with AND conditions          |
| 26b0ea5 | feat | AdvancedFiltersPanel (bundled with 13-10)    |

## Deviations from Plan

### 1. AdvancedFiltersPanel Committed with 13-10

The AdvancedFiltersPanel component was committed as part of commit 26b0ea5 (labeled feat(13-10)) due to execution order overlap. The component is complete and correct.

**Rule Applied**: None - this was execution order variance, not a code issue.

## Verification

```bash
cd apps/frontend
npm run typecheck  # Pass
npx eslint src/components/views/AdvancedFiltersPanel.tsx \
  src/components/views/FilterGroupCard.tsx \
  src/components/views/FilterConditionRow.tsx  # Pass
```

## Success Criteria Status

- [x] Panel slides in from right side using shadcn Sheet
- [x] Filter groups display with OR separator (max 2 groups)
- [x] Conditions within group show AND separator (max 20)
- [x] Each condition has property, operator, value inputs
- [x] Operators change based on property type
- [x] Date conditions offer specific and relative options
- [x] Multi-select conditions use searchable checkbox dropdown
- [x] Filters apply immediately via setFilters
- [x] Clear all button removes all filters
- [x] Duplicate group copies with new IDs

## Next Phase Readiness

Ready for:

- 13-09: TableView integration with filters
- 13-10: BoardView integration (already executed)
- Any consumer needing advanced filter UI

## Files for Reference

- `apps/frontend/src/components/views/AdvancedFiltersPanel.tsx` - Main panel
- `apps/frontend/src/components/views/FilterGroupCard.tsx` - Group container
- `apps/frontend/src/components/views/FilterConditionRow.tsx` - Condition row
