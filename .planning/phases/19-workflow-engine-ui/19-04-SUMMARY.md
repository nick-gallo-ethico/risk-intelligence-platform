---
phase: 19-workflow-engine-ui
plan: 04
subsystem: ui
tags: [react, xyflow, react-flow, workflow-builder, drag-drop, visual-editor]

# Dependency graph
requires:
  - phase: 19-02
    provides: "@xyflow/react package, workflow types, API service"
provides:
  - "Visual workflow builder canvas with React Flow"
  - "Custom stage nodes with color bars, badges, step counts"
  - "Custom transition edges with labels, condition indicators"
  - "Drag-from-palette to add new stages"
  - "Connect-by-handle to create transitions"
  - "Delete key removes selected elements"
  - "Minimap and zoom controls"
affects: [19-05, 19-06, 19-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Node/edge types defined outside component to prevent re-renders"
    - "HTML5 drag-drop with JSON dataTransfer"
    - "useNodesState/useEdgesState for React Flow state"
    - "nanoid for unique stage IDs"

key-files:
  created:
    - "apps/frontend/src/components/workflows/builder/stage-node.tsx"
    - "apps/frontend/src/components/workflows/builder/transition-edge.tsx"
    - "apps/frontend/src/components/workflows/builder/use-workflow-builder.ts"
    - "apps/frontend/src/components/workflows/builder/stage-palette.tsx"
    - "apps/frontend/src/components/workflows/builder/workflow-canvas.tsx"
    - "apps/frontend/src/components/workflows/builder/workflow-builder.tsx"
    - "apps/frontend/src/components/workflows/builder/index.ts"
  modified: []

key-decisions:
  - "Stage node types defined outside component to prevent React Flow infinite re-renders"
  - "StageNodeData extends Record<string,unknown> for React Flow v12 type compatibility"
  - "Four stage presets: standard (blue), approval (amber), terminal (red), notification (green)"
  - "Property panel placeholder included - full implementation in Plan 05"

patterns-established:
  - "Custom React Flow nodes with Handle components for connections"
  - "Custom React Flow edges with EdgeLabelRenderer for labels"
  - "Palette items with HTML5 draggable and JSON dataTransfer"
  - "screenToFlowPosition for converting drop coordinates"

# Metrics
duration: 18min
completed: 2026-02-11
---

# Phase 19 Plan 04: Visual Workflow Builder Summary

**Built complete visual workflow builder canvas with custom stage nodes, transition edges, drag-from-palette, and React Flow controls**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-11T22:40:00Z
- **Completed:** 2026-02-11T22:58:00Z
- **Tasks:** 2
- **Files created:** 7

## Accomplishments

- Created custom StageNode component with color bar, name, Start/End badges, step count, gates, SLA info
- Created custom TransitionEdge component with label pill, condition (filter) and reason (message) icons, hover animation
- Built useWorkflowBuilder hook with full state management, converters, and actions
- Created StagePalette with 4 draggable presets (standard, approval, terminal, notification)
- Built WorkflowCanvas with React Flow, drag-drop, keyboard delete, minimap, controls
- Assembled WorkflowBuilder with three-column layout (palette | canvas | properties placeholder)

## Task Commits

Each task was committed atomically:

1. **Task 1: Custom stage node and transition edge** - `858a93b`
2. **Task 2: Canvas, palette, hook, builder layout** - `c953530`

## Files Created

### Components

- `stage-node.tsx` - Custom React Flow node for workflow stages (~130 lines)
- `transition-edge.tsx` - Custom React Flow edge for transitions (~130 lines)
- `stage-palette.tsx` - Draggable stage type palette (~130 lines)
- `workflow-canvas.tsx` - React Flow canvas with controls (~200 lines)
- `workflow-builder.tsx` - Main builder layout (~140 lines)
- `use-workflow-builder.ts` - State management hook (~380 lines)
- `index.ts` - Barrel exports

## Component Features

### StageNode

- Top color bar from stage.display?.color
- Stage name (bold, truncated)
- "Start" badge (green) for initial stage
- "End" badge (red) for terminal stages
- Step count with Layers icon
- Gate count with Lock icon
- SLA days with Clock icon
- Selected state with blue ring
- Source handle (bottom) and target handle (top)

### TransitionEdge

- Bezier path with BaseEdge
- Label pill at midpoint
- Filter icon if conditions exist
- MessageSquare icon if requiresReason
- Animated dashed line on hover/selection
- Invisible wider path for easier interaction

### StagePalette

| Preset        | Color  | Description                  |
| ------------- | ------ | ---------------------------- |
| Standard      | Blue   | Basic workflow stage         |
| Approval Gate | Amber  | Pre-configured approval gate |
| Terminal      | Red    | End stage (isTerminal: true) |
| Notification  | Green  | Pre-configured notification  |

### WorkflowCanvas

- ReactFlow with custom nodeTypes and edgeTypes
- Background with dots pattern
- MiniMap at bottom-right (shows stage colors)
- Controls at bottom-left (zoom in/out, fit view)
- onDragOver/onDrop for palette drops
- onConnect for handle connections
- Delete/Backspace key removes selected

### useWorkflowBuilder Hook

| Function          | Description                                |
| ----------------- | ------------------------------------------ |
| loadTemplate      | Convert template to nodes/edges            |
| addStage          | Create new stage from preset at position   |
| removeSelected    | Delete selected nodes and connected edges  |
| setInitialStage   | Mark a stage as the start stage            |
| nodesToStages     | Export nodes back to WorkflowStage[]       |
| edgesToTransitions| Export edges back to WorkflowTransition[]  |

## Decisions Made

1. **Type extensions for React Flow v12**: StageNodeData and TransitionEdgeData extend `Record<string, unknown>` to satisfy React Flow's generic constraints

2. **nodeTypes/edgeTypes outside component**: Must be defined outside the component or memoized to prevent infinite re-renders (React Flow requirement)

3. **nanoid for IDs**: Used nanoid(8) for generating unique stage IDs

4. **Property panel placeholder**: Three-column layout includes right panel placeholder for Plan 05 implementation

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- React Flow v12 type constraints required `extends Record<string, unknown>` on custom data types
- Resolved with type updates to StageNodeData and TransitionEdgeData

## Next Phase Readiness

- Visual builder canvas is functional and ready for integration
- Plan 05 will add:
  - Stage properties panel (edit name, SLA, gates, steps)
  - Transition properties panel (edit label, conditions, actions)
  - Save/load integration with API
  - Validation before save

---

_Phase: 19-workflow-engine-ui_
_Plan: 04_
_Completed: 2026-02-11_
