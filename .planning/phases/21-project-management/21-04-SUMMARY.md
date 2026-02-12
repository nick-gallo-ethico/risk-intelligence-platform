---
phase: 21-project-management
plan: 04
subsystem: frontend
tags: [react, nextjs, project-management, monday-style, inline-editing, dnd-kit]

# Dependency graph
requires:
  - phase: 21-02
    provides: REST API endpoints for tasks and groups
  - phase: 21-03
    provides: TypeScript types and project list page
provides:
  - Project detail page with grouped task table
  - 12 React Query hooks for project detail operations
  - 6 project components (ProjectTaskTable, ProjectGroupHeader, TaskRow, AddTaskRow, TaskDetailPanel)
affects: [21-05 (board and timeline views), 21-06 (template editor)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Monday.com-style grouped task table"
    - "Inline editing with Popover/Select components"
    - "@dnd-kit for drag-to-reorder tasks within groups"
    - "Optimistic updates for immediate UI feedback"
    - "Sheet component for slide-out task detail panel"

key-files:
  created:
    - apps/frontend/src/hooks/use-project-detail.ts
    - apps/frontend/src/app/(authenticated)/projects/[id]/page.tsx
    - apps/frontend/src/components/projects/ProjectTaskTable.tsx
    - apps/frontend/src/components/projects/ProjectGroupHeader.tsx
    - apps/frontend/src/components/projects/AddTaskRow.tsx
    - apps/frontend/src/components/projects/TaskDetailPanel.tsx
    - apps/frontend/src/components/projects/TaskRow.tsx
    - apps/frontend/src/components/projects/index.ts

key-decisions:
  - "Combined Task 1 and Task 2 into single commit since components are required imports for page"
  - "Use page type for recent items tracking since project type not in RecentItem interface"
  - "Convert null to undefined in optimistic updates for type compatibility"
  - "Use &quot; entity for quote escaping to satisfy ESLint react/no-unescaped-entities"

patterns-established:
  - "ProjectTaskTable uses DndContext + SortableContext for drag-and-drop"
  - "TaskRow with inline editing pattern: click -> Popover -> Select/Calendar"
  - "AddTaskRow for rapid task entry with Enter to create, input stays focused"
  - "TaskDetailPanel as Sheet slide-out from right with full editing"

# Metrics
duration: 10min
completed: 2026-02-12
---

# Phase 21 Plan 04: Project Detail Page Summary

**Monday.com-style project detail page with grouped task table, inline editing, task panel, and drag-to-reorder**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-12T19:50:10Z
- **Completed:** 2026-02-12T20:00:37Z
- **Tasks:** 2 (combined into 1 commit)
- **Files created:** 8

## Accomplishments

- Created use-project-detail.ts with 12 React Query hooks for all project detail operations
- Built projects/[id]/page.tsx with header, view mode tabs, and content area
- Implemented ProjectTaskTable with grouped tasks, column headers, and DnD reordering
- Built TaskRow with inline editing for status, priority, assignee, and due date
- Created ProjectGroupHeader with collapse toggle, rename, color picker, and delete
- Added AddTaskRow for rapid task creation at bottom of each group
- Implemented TaskDetailPanel as slide-out Sheet with full task editing

## Task Commits

Both tasks completed in single commit due to component dependencies:

1. **Tasks 1 & 2: Project detail hooks, page, and components** - `c2d159c` (feat)

## Files Created

| File                                                           | Purpose                                       |
| -------------------------------------------------------------- | --------------------------------------------- |
| `apps/frontend/src/hooks/use-project-detail.ts`                | 12 React Query hooks with optimistic updates  |
| `apps/frontend/src/app/(authenticated)/projects/[id]/page.tsx` | Project detail page with header and view tabs |
| `apps/frontend/src/components/projects/ProjectTaskTable.tsx`   | Grouped task table with DnD reordering        |
| `apps/frontend/src/components/projects/ProjectGroupHeader.tsx` | Group header with collapse/rename/delete      |
| `apps/frontend/src/components/projects/TaskRow.tsx`            | Task row with inline editing                  |
| `apps/frontend/src/components/projects/AddTaskRow.tsx`         | Rapid task entry row                          |
| `apps/frontend/src/components/projects/TaskDetailPanel.tsx`    | Slide-out sheet with full task editing        |
| `apps/frontend/src/components/projects/index.ts`               | Component exports                             |

## Key Features

### Project Header

- Editable project name (click to edit)
- Status badge with dropdown to change status
- Progress bar showing completed/total tasks
- Owner avatar with change owner dropdown
- Target date with date picker

### Grouped Task Table

- Tasks organized by group with colored left border
- Column headers: Task, Status, Priority, Assignee, Due Date, Subtasks
- Each group has collapse/expand toggle
- Ungrouped section for tasks without a group

### Inline Editing

- Status: Popover dropdown with colored badges
- Priority: Popover dropdown with icons (Low/Medium/High/Critical)
- Assignee: Popover with user search/select
- Due Date: Popover with Calendar component
- Title: Double-click to edit, Enter to save, Escape to cancel

### Task Detail Panel

- Slides in from right as Sheet component
- Full task editing: title, description, status, priority, group, assignee, dates
- Delete task with confirmation dialog
- Metadata display: created, updated, completed dates

### Drag and Drop

- @dnd-kit for drag-to-reorder tasks within a group
- PointerSensor with 8px activation distance
- KeyboardSensor for accessibility
- useReorderTasks mutation on drag end

## Deviations from Plan

None - plan executed as written. Tasks 1 and 2 were combined into a single commit since the components (Task 2) are required imports for the page (Task 1).

## Issues Encountered

1. **RecentItem type compatibility** - RecentItem only allows "case", "investigation", or "page" types. Used "page" with "Project: {name}" label prefix.

2. **Optimistic update type mismatch** - UpdateTaskDto allows `null` for groupId/assigneeId but ProjectTask expects `undefined`. Fixed by converting nulls to undefined in optimistic update logic.

3. **ESLint unescaped entities** - Quotes in confirmation dialogs needed to be escaped as `&quot;`.

## API Hooks Created

| Hook                 | Endpoint                         | Purpose                                   |
| -------------------- | -------------------------------- | ----------------------------------------- |
| `useProjectDetail`   | GET /projects/:id                | Fetch project with groups, tasks, columns |
| `useProjectTasks`    | GET /projects/:id/tasks          | Fetch tasks with filters                  |
| `useUpdateProject`   | PATCH /projects/:id              | Update project properties                 |
| `useCreateTask`      | POST /projects/:id/tasks         | Create new task                           |
| `useUpdateTask`      | PUT /projects/:id/tasks/:id      | Update task (with optimistic update)      |
| `useDeleteTask`      | DELETE /projects/:id/tasks/:id   | Delete task                               |
| `useBulkUpdateTasks` | PUT /projects/:id/tasks/bulk     | Bulk update tasks                         |
| `useReorderTasks`    | PUT /projects/:id/tasks/reorder  | Reorder tasks                             |
| `useCreateGroup`     | POST /projects/:id/groups        | Create new group                          |
| `useUpdateGroup`     | PUT /projects/:id/groups/:id     | Update group                              |
| `useDeleteGroup`     | DELETE /projects/:id/groups/:id  | Delete group                              |
| `useReorderGroups`   | PUT /projects/:id/groups/reorder | Reorder groups                            |

## Next Phase Readiness

- Project detail page ready for user testing
- Board view placeholder ready for Plan 05 implementation
- Timeline view placeholder ready for Plan 05 implementation
- All inline editing patterns established for reuse

---

_Phase: 21-project-management_
_Completed: 2026-02-12_
