---
phase: 13-hubspot-style-saved-views-system
plan: 10
subsystem: frontend-views
tags: [board-view, kanban, dnd-kit, drag-drop, react]
dependencies:
  requires:
    - "13-02" # View system types and constants
    - "13-03" # SavedViewProvider context
  provides:
    - BoardView component with Kanban-style card layout
    - BoardColumn droppable lane component
    - BoardCard draggable card component
    - Drag-and-drop status change handling
  affects:
    - "13-11" # Table/Board view integration
tech-stack:
  added: []
  patterns:
    - "@dnd-kit drag-and-drop with DndContext"
    - "useDraggable and useDroppable hooks"
    - "DragOverlay for smooth drag feedback"
key-files:
  created:
    - apps/frontend/src/components/views/BoardCard.tsx
    - apps/frontend/src/components/views/BoardColumn.tsx
    - apps/frontend/src/components/views/BoardView.tsx
  modified:
    - apps/frontend/src/lib/views/types.ts
    - apps/frontend/src/types/view-config.ts
    - apps/frontend/src/components/views/index.ts
decisions:
  - id: board-card-drag-handle
    choice: "Separate drag handle button with GripVertical icon"
    rationale: "Allows card click for navigation while preserving drag from handle"
  - id: board-grouping
    choice: "Group records by boardGroupBy field or defaultGroupBy from config"
    rationale: "Flexible grouping that can be changed per-view"
  - id: board-column-colors
    choice: "Color accent via left border on column header"
    rationale: "Subtle visual distinction without overwhelming the UI"
metrics:
  duration: 21 min
  completed: 2026-02-07
---

# Phase 13 Plan 10: BoardView Component Summary

Kanban-style board view with draggable cards organized in status lanes.

## One-Liner

BoardView with @dnd-kit drag-and-drop between columns for visual workflow status changes.

## What Was Built

### BoardCard Component

- **Draggable card** using `useDraggable` hook from @dnd-kit
- **GripVertical drag handle** - separate from card click area
- **Summary display**: title, subtitle, priority badge, owner avatar, date
- **Custom display fields** with optional icons and type-specific formatting
- **Priority color coding**: high/critical (red), medium (yellow), low (green)
- **Transform styles** for smooth drag animation
- **isDragging visual feedback** with opacity and ring

### BoardColumn Component

- **Droppable lane** using `useDroppable` hook
- **Header with color accent** via left border (from column config)
- **Record count badge** in header
- **SortableContext** for vertical card sorting within column
- **Empty state** placeholder when no records in column
- **Footer** with record count summary
- **isOver visual feedback** with ring highlight

### BoardView Component

- **DndContext** coordinating all drag-and-drop operations
- **PointerSensor** with 8px activation distance (prevents accidental drags)
- **KeyboardSensor** for accessibility
- **closestCorners** collision detection algorithm
- **Dynamic grouping** by boardGroupBy field from context
- **onStatusChange callback** when card dropped on new column
- **DragOverlay** showing floating card during drag
- **Loading skeleton** with column outlines
- **Empty state** with filter suggestion message
- **Horizontal scroll** for many columns

### Type Additions

Added to `lib/views/types.ts`:

- `BoardCardDisplayField` - field with optional icon and type
- `BoardCardConfig` - title, subtitle, priority, owner, date, displayFields
- `BoardColumnConfig` - id, label, color

Updated `types/view-config.ts`:

- `BoardConfig.columns` - lane configurations
- `BoardConfig.cardConfig` - card display configuration

## Implementation Details

### Drag Flow

1. User grabs card by drag handle
2. `handleDragStart` captures active record
3. `DragOverlay` renders floating card copy
4. User drags to new column
5. `handleDragEnd` compares source/target columns
6. If different, calls `onStatusChange(recordId, newStatus)`
7. Parent component handles API update

### Grouping Logic

```typescript
const groupField = boardGroupBy || boardConfig?.defaultGroupBy;
// Initialize all columns with empty arrays
// Then group records by their field value
```

### Config Requirements

BoardView requires `boardConfig` with both `columns` and `cardConfig` set.
Shows "not configured" message if missing.

## Files Changed

| File                               | Change                                          |
| ---------------------------------- | ----------------------------------------------- |
| `components/views/BoardCard.tsx`   | Created - draggable card component              |
| `components/views/BoardColumn.tsx` | Created - droppable lane component              |
| `components/views/BoardView.tsx`   | Created - main board with DndContext            |
| `lib/views/types.ts`               | Added BoardCardConfig, BoardColumnConfig types  |
| `types/view-config.ts`             | Extended BoardConfig with columns, cardConfig   |
| `components/views/index.ts`        | Added BoardView, BoardColumn, BoardCard exports |

## Commits

| Hash    | Message                                                            |
| ------- | ------------------------------------------------------------------ |
| 648c00f | feat(13-08): add FilterConditionRow component (included BoardCard) |
| 26b0ea5 | feat(13-10): add BoardColumn with droppable area and card list     |
| b6f4863 | feat(13-10): add BoardView with drag-and-drop between status lanes |

## Verification

```bash
npm run typecheck  # Passes
npm run lint       # Passes (no new warnings)
```

## Success Criteria Met

- [x] BoardView displays records as cards in vertical status lanes
- [x] Cards show title, subtitle, priority badge, owner, and date
- [x] Cards are draggable between lanes using @dnd-kit
- [x] Dropping a card on a different lane triggers onStatusChange callback
- [x] Columns show record count badge in header
- [x] DragOverlay provides smooth visual feedback during drag
- [x] Empty columns show "No records" placeholder
- [x] Loading state shows skeleton columns
- [x] Board respects the same filters as table view (via context)

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for:

- Plan 13-11: DataTable component (table view counterpart to board)
- Integration with view mode toggle to switch between table/board
- Module-specific board configurations (Cases, Investigations, etc.)
