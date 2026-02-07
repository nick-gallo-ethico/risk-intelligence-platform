# Phase 13: HubSpot-Style Saved Views System - Research

**Researched:** 2026-02-06
**Domain:** Data table infrastructure, drag-and-drop, filter persistence, column management, view sharing
**Confidence:** HIGH

## Summary

Phase 13 builds a comprehensive HubSpot-style saved views system on top of existing Phase 6 infrastructure. The codebase already has SavedView model and basic service/controller with filter persistence, shared views, and usage tracking. The primary new implementations are: (1) TanStack Table integration for advanced data tables with column visibility, sorting, and resizing; (2) dnd-kit horizontal tabs for draggable view reordering; (3) Sheet-based Advanced Filters slide-out panel with AND/OR group logic; (4) Board/Kanban view using existing dnd-kit for card dragging between lanes; and (5) URL state synchronization via nuqs or custom hooks.

The system must be built as **reusable shared components** that work across all pillar modules (Cases, Investigations, Disclosures, Intake Forms, Policies). Each module defines its available columns, filter properties, quick filters, bulk actions, and board view grouping options through a configuration object passed to generic view components.

**Primary recommendation:** Install @tanstack/react-table for headless data table with column visibility and sorting. Use existing @dnd-kit packages for tab reordering and board view. Extend the existing SavedView model with new fields for frozenColumnCount, viewMode, boardGroupBy, and recordCount. Build a `SavedViewProvider` React context that manages view state and exposes components.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Codebase)

| Library               | Version | Purpose            | Why Standard                                     |
| --------------------- | ------- | ------------------ | ------------------------------------------------ |
| @dnd-kit/core         | 6.3.1   | Drag and drop core | Already installed, accessibility-focused         |
| @dnd-kit/sortable     | 10.0.0  | Sortable presets   | Already installed, horizontal list support       |
| @dnd-kit/utilities    | 3.2.2   | DnD utilities      | Already installed                                |
| @tanstack/react-query | 5.90.20 | Data fetching      | Already installed, caching built-in              |
| shadcn/ui             | Current | UI components      | Already installed (Dialog, Sheet, Popover, etc.) |
| lucide-react          | 0.312.0 | Icons              | Already installed                                |
| date-fns              | 4.1.0   | Date handling      | Already installed                                |
| zod                   | 4.3.6   | Schema validation  | Already installed                                |

### New for Phase 13

| Library               | Version | Purpose        | When to Use                                      |
| --------------------- | ------- | -------------- | ------------------------------------------------ |
| @tanstack/react-table | 8.x     | Headless table | Column visibility, sorting, resizing, pagination |
| nuqs (optional)       | 2.x     | URL state sync | Bookmarkable view links with query params        |

### Alternatives Considered

| Instead of            | Could Use         | Tradeoff                                                      |
| --------------------- | ----------------- | ------------------------------------------------------------- |
| @tanstack/react-table | Keep manual Table | More code, less features, harder column management            |
| nuqs                  | useSearchParams   | nuqs has better batching, throttling; useSearchParams simpler |
| @hello-pangea/dnd     | @dnd-kit          | @dnd-kit already installed, maintained fork                   |

**Installation:**

```bash
npm install @tanstack/react-table
# Optional for URL state:
npm install nuqs
```

## Architecture Patterns

### Recommended Component Structure

```
apps/frontend/src/
├── components/
│   └── views/                      # Reusable view system components
│       ├── SavedViewProvider.tsx   # Context provider for view state
│       ├── ViewTabsBar.tsx         # Zone 1: Draggable view tabs
│       ├── ViewToolbar.tsx         # Zone 2: Search, buttons, actions
│       ├── QuickFiltersRow.tsx     # Zone 3: Quick filter dropdowns
│       ├── ColumnSelectionModal.tsx # Edit Columns popup
│       ├── AdvancedFiltersPanel.tsx # Right slide-out filter panel
│       ├── FilterConditionRow.tsx  # Single filter condition
│       ├── FilterGroupCard.tsx     # AND group container
│       ├── PropertyPicker.tsx      # Searchable property selector
│       ├── DataTable.tsx           # Zone 4: TanStack Table wrapper
│       ├── BoardView.tsx           # Kanban board alternative
│       ├── BulkActionsBar.tsx      # Appears when rows selected
│       └── PaginationBar.tsx       # Page navigation
├── hooks/
│   └── views/
│       ├── useSavedViewContext.ts  # Access SavedViewProvider context
│       ├── useViewFilters.ts       # Filter state management
│       ├── useViewColumns.ts       # Column selection state
│       ├── useDataTable.ts         # TanStack table hook wrapper
│       └── useExport.ts            # Export functionality
├── lib/
│   └── views/
│       ├── types.ts                # Shared type definitions
│       ├── operators.ts            # Filter operator definitions
│       └── constants.ts            # Operator labels, defaults
└── types/
    └── view-config.ts              # Module configuration types
```

### Pattern 1: Module Configuration Object

**What:** Each module (Cases, Investigations, etc.) defines its available columns, filters, and bulk actions
**When to use:** Module pages that render the view system
**Example:**

```typescript
// Source: Specification requirements
interface ModuleViewConfig {
  moduleType: ViewEntityType; // 'CASES' | 'INVESTIGATIONS' | etc.

  // Column definitions
  columns: ColumnDefinition[];

  // Quick filter defaults (which properties appear in quick filter row)
  quickFilterProperties: string[];

  // Default views (seeded for new orgs)
  defaultViews: DefaultViewConfig[];

  // Bulk actions available for this module
  bulkActions: BulkActionConfig[];

  // Board view options
  boardConfig?: {
    groupByOptions: { propertyId: string; label: string }[];
    defaultGroupBy: string;
  };

  // API endpoints
  endpoints: {
    list: string; // GET /api/v1/cases
    export: string; // POST /api/v1/cases/export
    bulk: string; // POST /api/v1/cases/bulk
  };
}

interface ColumnDefinition {
  id: string; // Unique column ID
  header: string; // Display name
  accessorKey: string; // Property path (e.g., 'status', 'createdBy.name')
  group: string; // Group name for organization in column picker
  type: ColumnType; // 'text' | 'number' | 'date' | 'user' | 'status' | 'severity' | 'boolean'
  sortable?: boolean;
  filterable?: boolean;
  defaultVisible?: boolean;
  width?: number;
  minWidth?: number;
  cell?: React.FC<CellContext>; // Custom cell renderer
}

// Usage in Cases module
const casesViewConfig: ModuleViewConfig = {
  moduleType: "CASES",
  columns: [
    {
      id: "referenceNumber",
      header: "Reference",
      accessorKey: "referenceNumber",
      group: "Case Details",
      type: "text",
      sortable: true,
      defaultVisible: true,
      width: 120,
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      group: "Case Details",
      type: "status",
      sortable: true,
      filterable: true,
      defaultVisible: true,
    },
    {
      id: "severity",
      header: "Severity",
      accessorKey: "severity",
      group: "Case Details",
      type: "severity",
      sortable: true,
      filterable: true,
      defaultVisible: true,
    },
    {
      id: "summary",
      header: "Summary",
      accessorKey: "summary",
      group: "Case Details",
      type: "text",
      defaultVisible: true,
      width: 300,
    },
    {
      id: "createdAt",
      header: "Created",
      accessorKey: "createdAt",
      group: "Dates",
      type: "date",
      sortable: true,
      filterable: true,
      defaultVisible: true,
    },
    {
      id: "assignedTo",
      header: "Assigned To",
      accessorKey: "assignedUser.name",
      group: "Assignment",
      type: "user",
      filterable: true,
      defaultVisible: true,
    },
    // ... more columns
  ],
  quickFilterProperties: ["status", "severity", "assignedTo", "createdAt"],
  defaultViews: [
    { name: "All Cases", isSystem: true },
    {
      name: "My Cases",
      filters: { assignedTo: "CURRENT_USER" },
      isSystem: true,
    },
    {
      name: "Open Cases",
      filters: { status: ["NEW", "OPEN"] },
      isSystem: true,
    },
  ],
  bulkActions: [
    { id: "assign", label: "Assign", icon: "UserPlus" },
    { id: "changeStatus", label: "Change Status", icon: "RefreshCw" },
    { id: "export", label: "Export Selected", icon: "Download" },
    { id: "delete", label: "Delete", icon: "Trash2", destructive: true },
  ],
  boardConfig: {
    groupByOptions: [
      { propertyId: "status", label: "Status" },
      { propertyId: "pipelineStage", label: "Pipeline Stage" },
    ],
    defaultGroupBy: "status",
  },
  endpoints: {
    list: "/api/v1/cases",
    export: "/api/v1/cases/export",
    bulk: "/api/v1/cases/bulk",
  },
};
```

### Pattern 2: SavedViewProvider Context

**What:** React context that manages all view state including tabs, active view, filters, columns
**When to use:** Wrap module pages that use the view system
**Example:**

```typescript
// Source: React Context best practices
interface SavedViewContextValue {
  // View configuration
  config: ModuleViewConfig;

  // Active view state
  views: SavedView[];
  activeView: SavedView | null;
  activeViewId: string | null;

  // Dirty state (unsaved changes)
  hasUnsavedChanges: boolean;

  // Filter state
  filters: FilterGroup[];
  quickFilters: Record<string, unknown>;
  searchQuery: string;

  // Column state
  visibleColumns: string[];
  columnOrder: string[];
  frozenColumnCount: number;
  columnWidths: Record<string, number>;

  // Sort state
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';

  // View mode
  viewMode: 'table' | 'board';
  boardGroupBy: string | null;

  // Selection state
  selectedRowIds: Set<string>;

  // Pagination
  page: number;
  pageSize: number;
  total: number;

  // Actions
  setActiveView: (viewId: string | null) => void;
  saveView: () => Promise<void>;
  saveViewAs: (name: string, visibility: 'private' | 'team' | 'everyone') => Promise<void>;
  deleteView: (viewId: string) => Promise<void>;
  duplicateView: (viewId: string) => Promise<void>;
  renameView: (viewId: string, name: string) => Promise<void>;
  reorderTabs: (viewIds: string[]) => Promise<void>;

  setFilters: (filters: FilterGroup[]) => void;
  setQuickFilter: (propertyId: string, value: unknown) => void;
  clearFilters: () => void;

  setColumns: (columnIds: string[]) => void;
  setColumnOrder: (columnIds: string[]) => void;
  setFrozenColumns: (count: number) => void;
  resizeColumn: (columnId: string, width: number) => void;

  setSort: (column: string | null, order: 'asc' | 'desc') => void;
  setViewMode: (mode: 'table' | 'board') => void;
  setBoardGroupBy: (propertyId: string) => void;

  selectRow: (rowId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  refresh: () => void;
  exportData: (format: 'xlsx' | 'csv') => Promise<void>;
  bulkAction: (actionId: string) => Promise<void>;
}

// Provider implementation
export function SavedViewProvider({ config, children }: { config: ModuleViewConfig; children: React.ReactNode }) {
  // State management using useReducer or Zustand
  // Sync with URL for bookmarkable views
  // Auto-save draft state before navigation
  return (
    <SavedViewContext.Provider value={value}>
      {children}
    </SavedViewContext.Provider>
  );
}
```

### Pattern 3: TanStack Table Integration

**What:** Using TanStack Table for column visibility, sorting, and resizing
**When to use:** DataTable component rendering
**Example:**

```typescript
// Source: TanStack Table docs https://tanstack.com/table/v8/docs/guide/column-visibility
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';

export function DataTable<T>({ data, columns, config }: DataTableProps<T>) {
  const { visibleColumns, columnOrder, sortBy, sortOrder, frozenColumnCount } = useSavedViewContext();

  // Column visibility state derived from context
  const columnVisibility = useMemo(() => {
    return config.columns.reduce((acc, col) => {
      acc[col.id] = visibleColumns.includes(col.id);
      return acc;
    }, {} as Record<string, boolean>);
  }, [visibleColumns, config.columns]);

  // Sorting state
  const sorting = useMemo(() => {
    return sortBy ? [{ id: sortBy, desc: sortOrder === 'desc' }] : [];
  }, [sortBy, sortOrder]);

  const table = useReactTable({
    data,
    columns: tableColumns, // Mapped from config.columns
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      columnVisibility,
      columnOrder,
      sorting,
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      if (newSorting.length > 0) {
        setSort(newSorting[0].id, newSorting[0].desc ? 'desc' : 'asc');
      } else {
        setSort(null, 'asc');
      }
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  return (
    <div className="relative w-full overflow-auto">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {/* Checkbox column */}
              <th className="w-[40px] px-2">
                <Checkbox
                  checked={table.getIsAllRowsSelected()}
                  onCheckedChange={table.toggleAllRowsSelected}
                />
              </th>
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  className={cn(
                    'relative px-4 py-3 text-left',
                    index < frozenColumnCount && 'sticky left-0 bg-background z-10'
                  )}
                  style={{ width: header.getSize() }}
                >
                  <div
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    <SortIndicator column={header.column} />
                  </div>
                  {/* Resize handle */}
                  <div
                    onMouseDown={header.getResizeHandler()}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                  />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border-b hover:bg-muted/50">
              <td className="px-2">
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={row.toggleSelected}
                />
              </td>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Pattern 4: Draggable View Tabs with dnd-kit

**What:** Horizontal draggable tabs using @dnd-kit/sortable
**When to use:** ViewTabsBar component
**Example:**

```typescript
// Source: dnd-kit docs https://docs.dndkit.com/presets/sortable
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function ViewTabsBar() {
  const { views, activeViewId, setActiveView, reorderTabs } = useSavedViewContext();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = views.findIndex(v => v.id === active.id);
      const newIndex = views.findIndex(v => v.id === over.id);
      const newOrder = arrayMove(views.map(v => v.id), oldIndex, newIndex);
      reorderTabs(newOrder);
    }
  };

  return (
    <div className="flex items-center border-b bg-muted/50 overflow-x-auto">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={views.map(v => v.id)} strategy={horizontalListSortingStrategy}>
          {views.map(view => (
            <SortableViewTab
              key={view.id}
              view={view}
              isActive={view.id === activeViewId}
              onSelect={() => setActiveView(view.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <AddViewButton />
    </div>
  );
}

function SortableViewTab({ view, isActive, onSelect }: SortableViewTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: view.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-2 px-4 py-2 cursor-pointer border-b-2 transition-colors',
        isActive ? 'border-primary bg-background' : 'border-transparent hover:bg-accent'
      )}
      onClick={onSelect}
    >
      <span className="whitespace-nowrap">{view.name}</span>
      {view.recordCount !== undefined && (
        <Badge variant="secondary" className="ml-1">{view.recordCount.toLocaleString()}</Badge>
      )}
      <ViewTabContextMenu view={view} />
    </div>
  );
}
```

### Pattern 5: Advanced Filters Slide-Out

**What:** Right-side Sheet panel with filter groups (AND within, OR between)
**When to use:** AdvancedFiltersPanel component
**Example:**

```typescript
// Source: hubspot-view-system-spec.md
interface FilterGroup {
  id: string;
  conditions: FilterCondition[];  // AND-joined
}
// Groups are OR-joined

interface FilterCondition {
  id: string;
  propertyId: string;
  operator: FilterOperator;
  value?: unknown;
  secondaryValue?: unknown;  // For 'is_between'
  unit?: 'day' | 'week' | 'month';  // For relative dates
}

function AdvancedFiltersPanel() {
  const { filters, setFilters, config } = useSavedViewContext();
  const [open, setOpen] = useState(false);

  const addCondition = (groupId: string) => {
    setFilters(filters.map(group =>
      group.id === groupId
        ? { ...group, conditions: [...group.conditions, createEmptyCondition()] }
        : group
    ));
  };

  const addGroup = () => {
    if (filters.length >= 2) return; // Max 2 groups
    setFilters([...filters, { id: nanoid(), conditions: [] }]);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>Advanced Filters</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] pr-4">
          {filters.map((group, groupIndex) => (
            <div key={group.id}>
              {groupIndex > 0 && (
                <div className="flex items-center gap-2 py-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-sm text-muted-foreground font-medium">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <FilterGroupCard
                group={group}
                groupIndex={groupIndex}
                config={config}
                onAddCondition={() => addCondition(group.id)}
                onRemoveCondition={(conditionId) => removeCondition(group.id, conditionId)}
                onUpdateCondition={(conditionId, updates) => updateCondition(group.id, conditionId, updates)}
                onDuplicateGroup={() => duplicateGroup(group.id)}
                onRemoveGroup={() => removeGroup(group.id)}
              />
            </div>
          ))}

          {filters.length < 2 && (
            <Button variant="ghost" onClick={addGroup} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add filter group
            </Button>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

### Anti-Patterns to Avoid

- **Separate table implementation per module:** Use shared DataTable component with configuration; duplicated tables are maintenance nightmare
- **Client-side only view state:** Always persist to server; localStorage is supplementary (draft recovery) not primary storage
- **Blocking filter updates:** Apply filters in real-time as user types/selects; don't require "Apply" button
- **Mixing filter formats:** Standardize on FilterGroup/FilterCondition structure; don't allow inconsistent shapes
- **Hardcoded column definitions:** Use configuration objects; hardcoded columns prevent module customization
- **Separate API calls per filter:** Batch filter changes with debouncing; rapid API calls cause performance issues

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem            | Don't Build          | Use Instead                      | Why                                         |
| ------------------ | -------------------- | -------------------------------- | ------------------------------------------- |
| Column visibility  | Custom checkboxes    | TanStack Table columnVisibility  | Handles dependencies, nested columns        |
| Table sorting      | onClick handlers     | TanStack Table getSortedRowModel | Multi-column sort, sort direction cycling   |
| Column resizing    | Mouse event tracking | TanStack Table columnResizeMode  | Handles edge cases, touch support           |
| Drag-drop tabs     | HTML5 DnD            | @dnd-kit/sortable                | Accessibility, horizontal strategy built-in |
| Drag-drop cards    | HTML5 DnD            | @dnd-kit (existing)              | Already installed, consistent patterns      |
| URL state sync     | useSearchParams      | nuqs or custom hook              | Batching, throttling, type safety           |
| Date range filters | Custom inputs        | react-day-picker (existing)      | Already installed, locale support           |
| Property picker    | Custom dropdown      | Combobox with grouping           | shadcn Command pattern                      |
| Bulk action bar    | Fixed position div   | Floating overlay                 | Animation, dismissal behavior               |
| Export generation  | Frontend xlsx        | Backend endpoint                 | Large datasets, proper formatting           |

**Key insight:** Phase 13 is about **orchestrating existing UI components** into a cohesive view system, not building new low-level primitives.

## Common Pitfalls

### Pitfall 1: View State vs URL State Desync

**What goes wrong:** User shares URL but recipient sees different data than expected
**Why it happens:** View state stored in React only, not reflected in URL
**How to avoid:** Sync active view ID and filters to URL query params; on load, parse URL before initializing state
**Warning signs:** "I shared this link but they see different results"

### Pitfall 2: Filter Validation Lag

**What goes wrong:** User creates view with status "PENDING", admin removes that status option, view breaks
**Why it happens:** Filter values reference enum values that can change
**How to avoid:** Validate filters on apply (already implemented in existing service); show warning toast for invalid filters, gracefully exclude them
**Warning signs:** Empty results from previously working view; console errors on load

### Pitfall 3: Column Order Corruption

**What goes wrong:** User adds new column, existing column order scrambled
**Why it happens:** Column order array uses indices instead of IDs; new columns shift indices
**How to avoid:** Store column order as array of column IDs, not indices; append new columns to end
**Warning signs:** "Columns rearranged themselves after I added a new one"

### Pitfall 4: Bulk Action Race Conditions

**What goes wrong:** User selects rows, applies bulk action, rows update but selection stays on old IDs
**Why it happens:** Selection state not cleared after bulk action; deleted IDs still in set
**How to avoid:** Clear selection after bulk action completes; refresh data to get new state
**Warning signs:** Stale checkboxes; "row not found" errors on second action

### Pitfall 5: Infinite Re-render Loop

**What goes wrong:** Table component re-renders continuously, browser freezes
**Why it happens:** Column definitions created inline in render; TanStack Table treats as new reference
**How to avoid:** Memoize column definitions with useMemo; stable references for all table options
**Warning signs:** High CPU usage on list pages; "Maximum update depth exceeded"

### Pitfall 6: Filter Panel Performance

**What goes wrong:** Advanced filters panel laggy with many conditions
**Why it happens:** Each condition change triggers full data refetch; no debouncing
**How to avoid:** Debounce filter changes (300ms); batch multiple quick changes into single API call
**Warning signs:** User complains about lag when building complex filters

### Pitfall 7: Board View Drag Glitches

**What goes wrong:** Cards snap back to original position or jump to wrong lane
**Why it happens:** Optimistic UI update conflicts with server response; ID mismatch
**How to avoid:** Apply optimistic update immediately; on server error, revert to previous state
**Warning signs:** Flicker on drag completion; "move failed" with visual inconsistency

## Code Examples

Verified patterns from official sources:

### Column Selection Modal

```typescript
// Source: hubspot-view-system-spec.md Section 5.1
function ColumnSelectionModal({ open, onOpenChange }: ColumnSelectionModalProps) {
  const { config, visibleColumns, columnOrder, frozenColumnCount, setColumns, setColumnOrder, setFrozenColumns } = useSavedViewContext();
  const [searchQuery, setSearchQuery] = useState('');

  // Group columns by category
  const groupedColumns = useMemo(() => {
    const groups: Record<string, ColumnDefinition[]> = {};
    config.columns.forEach(col => {
      const group = col.group || 'Other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(col);
    });
    return groups;
  }, [config.columns]);

  // Filter by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupedColumns;
    const query = searchQuery.toLowerCase();
    const result: Record<string, ColumnDefinition[]> = {};
    Object.entries(groupedColumns).forEach(([group, cols]) => {
      const filtered = cols.filter(c => c.header.toLowerCase().includes(query));
      if (filtered.length > 0) result[group] = filtered;
    });
    return result;
  }, [groupedColumns, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choose which columns you see</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 h-[500px]">
          {/* Left: Available columns */}
          <div className="border rounded-lg p-4 overflow-y-auto">
            <div className="sticky top-0 bg-background pb-2">
              <Input
                placeholder="Search columns..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-4 mt-4">
              {Object.entries(filteredGroups).map(([group, cols]) => (
                <Collapsible key={group} defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 font-medium text-sm">
                    <ChevronDown className="h-4 w-4" />
                    {group}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 space-y-1 mt-2">
                    {cols.map(col => (
                      <div key={col.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={visibleColumns.includes(col.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setColumns([...visibleColumns, col.id]);
                            } else {
                              setColumns(visibleColumns.filter(id => id !== col.id));
                            }
                          }}
                        />
                        <span className="text-sm">{col.header}</span>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>

          {/* Right: Selected columns (draggable order) */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-sm">
                Selected Columns ({visibleColumns.length})
              </span>
              <Select
                value={String(frozenColumnCount)}
                onValueChange={v => setFrozenColumns(Number(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Frozen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Frozen: 0</SelectItem>
                  <SelectItem value="1">Frozen: 1</SelectItem>
                  <SelectItem value="2">Frozen: 2</SelectItem>
                  <SelectItem value="3">Frozen: 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DndContext onDragEnd={handleColumnReorder}>
              <SortableContext items={columnOrder}>
                {columnOrder.filter(id => visibleColumns.includes(id)).map((colId, index) => {
                  const col = config.columns.find(c => c.id === colId);
                  if (!col) return null;
                  return (
                    <SortableColumnItem
                      key={colId}
                      column={col}
                      isFirstColumn={index === 0}
                      onRemove={() => setColumns(visibleColumns.filter(id => id !== colId))}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setColumns([])}>
            Remove All Columns
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Filter Operators by Type

```typescript
// Source: hubspot-view-system-spec.md Section 5.2
type PropertyType = "text" | "number" | "date" | "boolean" | "enum" | "user";

const OPERATORS_BY_TYPE: Record<PropertyType, FilterOperator[]> = {
  text: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
    { value: "contains", label: "contains" },
    { value: "does_not_contain", label: "does not contain" },
    { value: "starts_with", label: "starts with" },
    { value: "ends_with", label: "ends with" },
    { value: "is_known", label: "is known" },
    { value: "is_unknown", label: "is unknown" },
  ],
  number: [
    { value: "is_equal_to", label: "is equal to" },
    { value: "is_not_equal_to", label: "is not equal to" },
    { value: "is_greater_than", label: "is greater than" },
    {
      value: "is_greater_than_or_equal_to",
      label: "is greater than or equal to",
    },
    { value: "is_less_than", label: "is less than" },
    { value: "is_less_than_or_equal_to", label: "is less than or equal to" },
    { value: "is_between", label: "is between" },
    { value: "is_known", label: "is known" },
    { value: "is_unknown", label: "is unknown" },
  ],
  date: [
    { value: "is", label: "is" },
    { value: "is_before", label: "is before" },
    { value: "is_after", label: "is after" },
    { value: "is_between", label: "is between" },
    { value: "is_less_than_n_ago", label: "is less than" },
    { value: "is_more_than_n_ago", label: "is more than" },
    { value: "is_known", label: "is known" },
    { value: "is_unknown", label: "is unknown" },
  ],
  boolean: [
    { value: "is_true", label: "is true" },
    { value: "is_false", label: "is false" },
    { value: "is_known", label: "is known" },
    { value: "is_unknown", label: "is unknown" },
  ],
  enum: [
    { value: "is_any_of", label: "is any of" },
    { value: "is_none_of", label: "is none of" },
    { value: "is_known", label: "is known" },
    { value: "is_unknown", label: "is unknown" },
  ],
  user: [
    { value: "is_any_of", label: "is any of" },
    { value: "is_none_of", label: "is none of" },
    { value: "is_known", label: "is known" },
    { value: "is_unknown", label: "is unknown" },
  ],
};

// Helper to get operators for a property
function getOperatorsForProperty(column: ColumnDefinition): FilterOperator[] {
  const typeMap: Record<string, PropertyType> = {
    text: "text",
    number: "number",
    date: "date",
    boolean: "boolean",
    status: "enum",
    severity: "enum",
    user: "user",
  };
  const type = typeMap[column.type] || "text";
  return OPERATORS_BY_TYPE[type];
}
```

### Board View Component

```typescript
// Source: dnd-kit docs + spec requirements
function BoardView({ data, config }: BoardViewProps) {
  const { boardGroupBy, setBoardGroupBy } = useSavedViewContext();
  const groupByProperty = config.boardConfig?.groupByOptions.find(o => o.propertyId === boardGroupBy);

  // Group data by the selected property
  const lanes = useMemo(() => {
    if (!groupByProperty) return [];

    const groups: Record<string, typeof data> = {};
    const propertyConfig = config.columns.find(c => c.id === groupByProperty.propertyId);

    // Get unique values from data
    data.forEach(item => {
      const value = getNestedValue(item, propertyConfig?.accessorKey || groupByProperty.propertyId);
      const key = String(value ?? 'None');
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return Object.entries(groups).map(([value, items]) => ({
      id: value,
      title: value,
      items,
    }));
  }, [data, groupByProperty, config.columns]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as string;
    const targetLaneId = over.id as string;
    const sourceLaneId = lanes.find(l => l.items.some(i => i.id === cardId))?.id;

    if (sourceLaneId && targetLaneId !== sourceLaneId) {
      // Update item's status/stage to match target lane
      await updateItemStatus(cardId, targetLaneId);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      <DndContext onDragEnd={handleDragEnd}>
        {lanes.map(lane => (
          <div key={lane.id} className="flex-shrink-0 w-[300px]">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{lane.title}</h3>
                <Badge variant="secondary">{lane.items.length}</Badge>
              </div>
              <SortableContext items={lane.items.map(i => i.id)}>
                <div className="space-y-2 min-h-[100px]">
                  {lane.items.map(item => (
                    <DraggableCard key={item.id} item={item} config={config} />
                  ))}
                </div>
              </SortableContext>
            </div>
          </div>
        ))}
      </DndContext>
    </div>
  );
}
```

## State of the Art

| Old Approach                | Current Approach          | When Changed | Impact                           |
| --------------------------- | ------------------------- | ------------ | -------------------------------- |
| Custom table implementation | TanStack Table (headless) | 2023+        | Standard for complex tables      |
| react-beautiful-dnd         | @dnd-kit                  | 2023+        | Better accessibility, maintained |
| Single filter conditions    | AND/OR filter groups      | 2024+        | HubSpot-style power users        |
| Fixed column order          | Draggable column reorder  | 2024+        | User customization               |
| Separate filters per page   | Saved views system        | 2024+        | Cross-session persistence        |
| Separate table/board UIs    | Toggle in same view       | 2024+        | Unified experience               |

**Deprecated/outdated:**

- **react-beautiful-dnd:** No longer maintained; use @dnd-kit instead
- **localStorage for filters:** Server-side saved views for sharing, team visibility
- **ag-grid (for simple tables):** TanStack Table is lighter weight, works with shadcn

## Open Questions

Things that couldn't be fully resolved:

1. **Record Count Badge Performance**
   - What we know: HubSpot shows record count on each view tab
   - What's unclear: Expensive to query count for all views on load; when to refresh?
   - Recommendation: Cache count in SavedView model; update on view apply with TTL; show stale indicator after 5 min

2. **View Sharing Permission Model**
   - What we know: Private/Team/Everyone visibility
   - What's unclear: Can non-owners edit shared views? What about delete?
   - Recommendation: Per existing Phase 6 decision - shared views are read-only; recipients can "Clone" to customize

3. **URL State Complexity**
   - What we know: Should sync viewId and filters to URL for bookmarkable links
   - What's unclear: Full filter state in URL can be very long; compress or simplify?
   - Recommendation: Store viewId in URL; if filters differ from saved view, show as "modified" state

4. **Custom Property Integration**
   - What we know: Custom properties exist on Case, Investigation, etc.
   - What's unclear: How to include custom properties in column selection and filters dynamically?
   - Recommendation: Fetch CustomPropertyDefinitions on config load; merge into columns array

## Sources

### Primary (HIGH confidence)

- [TanStack Table Column Visibility Guide](https://tanstack.com/table/v8/docs/guide/column-visibility) - Column visibility APIs
- [TanStack Table Sorting Guide](https://tanstack.com/table/v8/docs/guide/sorting) - Sorting implementation
- [TanStack Table Column Sizing Example](https://tanstack.com/table/v8/docs/framework/react/examples/column-sizing) - Column resizing
- [dnd-kit Sortable Documentation](https://docs.dndkit.com/presets/sortable) - Horizontal list sorting
- [dnd-kit Overview](https://docs.dndkit.com) - Core concepts
- Existing codebase: `apps/backend/src/modules/saved-views/` - SavedView model and service
- Existing codebase: `apps/frontend/src/components/common/saved-view-selector.tsx` - Basic view selector
- Existing codebase: `apps/frontend/src/components/ui/sheet.tsx` - Sheet component for slide-out panel

### Secondary (MEDIUM confidence)

- [nuqs Documentation](https://nuqs.dev/) - URL state management
- [Build a Kanban board with dnd kit and React](https://blog.logrocket.com/build-kanban-board-dnd-kit-react/) - Board view patterns
- [react-dnd-kit-tailwind-shadcn-ui GitHub](https://github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui) - shadcn integration example
- [Build a Kanban Board With Drag-and-Drop in React with Shadcn](https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html) - Recent 2026 example

### Tertiary (LOW confidence)

- WebSearch: React Excel export frontend - Multiple library options, backend preferred for large datasets
- WebSearch: Best practices 2026 - General ecosystem guidance

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Verified against existing codebase; libraries already installed
- Architecture: HIGH - Follows existing patterns in codebase; reusable component approach established
- TanStack Table integration: HIGH - Official documentation reviewed, examples verified
- dnd-kit patterns: HIGH - Already in codebase; documentation confirms approach
- URL state sync: MEDIUM - nuqs is option; could use simpler approach
- Board view: MEDIUM - Pattern extrapolated from dnd-kit docs and tutorials

**Research date:** 2026-02-06
**Valid until:** 30 days (stable domain, enterprise patterns)
