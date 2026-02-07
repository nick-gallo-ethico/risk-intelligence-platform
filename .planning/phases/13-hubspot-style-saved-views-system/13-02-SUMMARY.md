---
phase: 13
plan: 02
subsystem: frontend-views
tags: [tanstack-table, typescript, types, filter-system, saved-views]
dependency-graph:
  requires: []
  provides:
    - "@tanstack/react-table installation"
    - "View system type definitions"
    - "Filter operator mappings"
    - "Module view configuration types"
  affects:
    - 13-03 (ViewsPanel component)
    - 13-04 (Filter builder)
    - 13-05 (Column manager)
    - All view-related plans
tech-stack:
  added:
    - "@tanstack/react-table@8.21.3"
  patterns:
    - "Type-first view system design"
    - "Operator-by-property-type mapping"
key-files:
  created:
    - apps/frontend/src/lib/views/types.ts
    - apps/frontend/src/lib/views/operators.ts
    - apps/frontend/src/lib/views/constants.ts
    - apps/frontend/src/lib/views/index.ts
    - apps/frontend/src/types/view-config.ts
  modified:
    - apps/frontend/package.json
    - package-lock.json
decisions:
  - key: filter-operator-organization
    decision: Operators grouped by PropertyType (text, number, date, boolean, enum, user, status, severity)
    rationale: Enables type-safe filter building and consistent UX across modules
  - key: view-entity-types
    decision: Support 7 entity types - CASES, INVESTIGATIONS, DISCLOSURES, INTAKE_FORMS, POLICIES, PERSONS, RIUS
    rationale: These are the primary list views in the platform
  - key: column-type-system
    decision: ColumnType includes text, number, date, datetime, boolean, enum, status, severity, user, users, link, currency
    rationale: Comprehensive coverage of data types displayed in tables
metrics:
  duration: 12 min
  completed: 2026-02-07
---

# Phase 13 Plan 02: Frontend Type System & TanStack Table

TanStack Table v8.21.3 installed with comprehensive TypeScript types for HubSpot-style saved views system.

## One-liner

TanStack Table installed with type system for filters (22 operators by 8 property types), saved views, and module configuration.

## Commits

| Hash    | Description                                                  |
| ------- | ------------------------------------------------------------ |
| 40494cc | feat(13-02): add view system types and @tanstack/react-table |

## What Was Built

### 1. TanStack Table Installation

- Installed @tanstack/react-table@8.21.3
- Provides headless table functionality for column visibility, sorting, resizing, row selection

### 2. Core View Types (`apps/frontend/src/lib/views/types.ts`)

- **ViewEntityType**: 7 supported entity types (CASES, INVESTIGATIONS, etc.)
- **FilterGroup/FilterCondition**: AND-within-group, OR-between-groups filter logic
- **FilterOperator**: 22 operators organized by operator category (text, number, date, boolean, enum)
- **SavedView**: Complete saved view entity matching backend schema
- **ColumnConfig**: Column visibility, order, and width
- **QuickFilterConfig**: Quick filter state management

### 3. Filter Operators (`apps/frontend/src/lib/views/operators.ts`)

- **OPERATORS_BY_TYPE**: Maps each PropertyType to available operators
- **getOperatorsForPropertyType()**: Helper to get operators for a property type
- **getOperatorLabel()**: Human-readable labels for operators
- **operatorRequiresValue()**: Whether operator needs a value input

Property types supported:

- text: is, is_not, contains, does_not_contain, starts_with, ends_with, is_known, is_unknown
- number: is_equal_to, is_not_equal_to, comparisons, is_between, is_known, is_unknown
- date: is, is_before, is_after, is_between, relative date operators
- boolean: is_true, is_false, is_known, is_unknown
- enum/user/status/severity: is_any_of, is_none_of, is_known, is_unknown

### 4. Constants (`apps/frontend/src/lib/views/constants.ts`)

- Pagination: DEFAULT_PAGE_SIZE=25, PAGE_SIZE_OPTIONS=[25,50,100]
- Columns: DEFAULT_FROZEN_COLUMNS=1, MAX_FROZEN_COLUMNS=3
- Filters: MAX_FILTER_GROUPS=2, MAX_CONDITIONS_PER_GROUP=20
- Debounce: FILTER_DEBOUNCE_MS=300, SEARCH_DEBOUNCE_MS=300
- DATE_RANGE_PRESETS: today, yesterday, this_week, etc.
- VISIBILITY_OPTIONS: private, team, everyone

### 5. Module Configuration Types (`apps/frontend/src/types/view-config.ts`)

- **ColumnDefinition**: Column config with id, header, accessorKey, group, type, sortable, filterable
- **ModuleViewConfig**: Complete module configuration including columns, quickFilters, defaultViews, bulkActions
- **BulkActionConfig**: Bulk action definition with confirmation support
- **BoardConfig**: Kanban board view configuration

## Deviations from Plan

None - plan executed exactly as written.

## Verification

```bash
npm list @tanstack/react-table  # Shows v8.21.3
npm run typecheck               # Passes
npm run lint                    # New files pass (existing issues unrelated)
```

## Next Phase Readiness

Ready for 13-03: ViewsPanel component can now use these types for:

- Building filter conditions with proper operators
- Displaying saved views with correct types
- Module-specific column configurations
