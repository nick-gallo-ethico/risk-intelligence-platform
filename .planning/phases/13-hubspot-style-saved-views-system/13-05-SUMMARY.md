---
phase: 13
plan: 05
subsystem: views-ui
tags: ["toolbar", "search", "export", "shadcn"]
dependencies:
  requires: ["13-03"]
  provides: ["ViewToolbar", "ViewModeToggle", "SaveButton", "SortButton", "ExportButton"]
  affects: ["13-08", "13-09"]
tech-stack:
  added: []
  patterns: ["debounce-hook", "toolbar-layout"]
key-files:
  created:
    - apps/frontend/src/components/views/ViewToolbar.tsx
    - apps/frontend/src/components/views/ViewModeToggle.tsx
    - apps/frontend/src/components/views/SaveButton.tsx
    - apps/frontend/src/components/views/SortButton.tsx
    - apps/frontend/src/components/views/ExportButton.tsx
    - apps/frontend/src/hooks/useDebounce.ts
  modified:
    - apps/frontend/src/components/views/index.ts
metrics:
  duration: 10 min
  completed: 2026-02-07
---

# Phase 13 Plan 05: ViewToolbar Component Summary

**One-liner:** Horizontal toolbar with debounced search, view mode toggle, column/filter/sort/export buttons, and save dropdown.

## What Was Built

### ViewToolbar Component
The main toolbar (Zone 2) providing quick access to all view controls:
- **Search box** with debounced input (300ms delay)
- **View mode toggle** (only shows when board view configured)
- **Settings gear** placeholder for future configuration
- **Edit columns button** triggers column picker callback
- **Filter button** with active filter count badge
- **Sort button** popover with column selection
- **Export button** dropdown with Excel/CSV options
- **Duplicate button** for cloning active view
- **Save button** with save-as option

### Supporting Components

1. **ViewModeToggle** - Select dropdown for Table/Board view switching with lucide icons
2. **SaveButton** - Dropdown with "Save changes" and "Save as new view" options; highlights when unsaved changes exist
3. **SortButton** - Popover with column selection, ascending/descending toggle, and clear option
4. **ExportButton** - Dropdown for Excel (.xlsx) and CSV (.csv) export with blob download

### useDebounce Hook
Simple debounce hook for input fields:
```typescript
useDebounce(
  () => setSearchQuery(localSearch),
  300,
  [localSearch]
);
```

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Debounce delay | 300ms | Standard UX for search (responsive but not too aggressive) |
| Save button styling | Variant changes on dirty | Visual feedback for unsaved changes |
| Export format | Blob download | Works offline, no server streaming required |
| Sort popover | Full column select | More discoverable than header click |

## Component Props

### ViewToolbar
```typescript
interface ViewToolbarProps {
  onEditColumnsClick: () => void;  // Opens column picker
  onFilterClick: () => void;       // Toggles filter panel
  filterCount: number;             // Active filter count for badge
  showFilters: boolean;            // Whether filter panel is visible
}
```

## Integration Points

- Uses `useSavedViewContext` for all state management
- Consumes `config.columns` for sortable column list
- Calls `config.endpoints.export` for export functionality
- References `CreateViewDialog` for save-as workflow

## Commits

| Hash | Description |
|------|-------------|
| 06dea09 | feat(13-05): add ViewModeToggle component |
| c6cc1c4 | feat(13-07): create MultiSelectFilter (included SaveButton, SortButton, ExportButton) |
| a2ec393 | feat(13-05): add ViewToolbar component and useDebounce hook |

## Deviations from Plan

**Note:** SaveButton, SortButton, and ExportButton were previously committed in plan 13-07 (commit c6cc1c4). This appears to be a cross-plan artifact - the components were created earlier but logically belong to plan 13-05. No rewriting was needed as the implementations matched the plan specification.

## Next Phase Readiness

- ViewToolbar ready for integration with ViewShell (13-08)
- All toolbar buttons functional and connected to context
- Export requires backend endpoint implementation (out of scope for this plan)

## Files Changed

| File | Change Type |
|------|-------------|
| `apps/frontend/src/components/views/ViewToolbar.tsx` | Created |
| `apps/frontend/src/components/views/ViewModeToggle.tsx` | Created |
| `apps/frontend/src/components/views/SaveButton.tsx` | Created (earlier) |
| `apps/frontend/src/components/views/SortButton.tsx` | Created (earlier) |
| `apps/frontend/src/components/views/ExportButton.tsx` | Created (earlier) |
| `apps/frontend/src/hooks/useDebounce.ts` | Created |
| `apps/frontend/src/components/views/index.ts` | Updated exports |
