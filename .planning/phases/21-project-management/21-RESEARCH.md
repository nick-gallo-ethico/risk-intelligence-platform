# Phase 21 Research: Project Management (Monday.com-Style)

> Researched: 2026-02-08
> Sources: 4 parallel research agents (backend infrastructure, frontend patterns, module conventions, Monday.com features)

## RESEARCH COMPLETE

---

## 1. Existing Infrastructure

### 1.1 Database Models Already Built

**Milestone Model** (Prisma schema):

- `id`, `organizationId`, `name`, `description`, `category` (MilestoneCategory enum), `targetDate`, `completedAt`, `status` (MilestoneStatus enum), `totalItems`, `completedItems`, `progressPercent` (0-100), `ownerId`, `notes`, `lastStatusUpdate`, `createdById`
- Indexes: [organizationId, status], [organizationId, targetDate], [ownerId]

**MilestoneItem Model**:

- `id`, `organizationId`, `milestoneId`, `entityType` (MilestoneItemType enum), `entityId`, `customTitle`, `isCompleted`, `completedAt`, `dueDate`, `weight` (1-10), `sortOrder`
- Indexes: [milestoneId], [entityType, entityId], [organizationId]

**Enums**:

- `MilestoneCategory`: AUDIT, INVESTIGATION, CAMPAIGN, PROJECT, TRAINING, REMEDIATION, OTHER
- `MilestoneStatus`: NOT_STARTED, IN_PROGRESS, AT_RISK, COMPLETED, CANCELLED
- `MilestoneItemType`: CASE, INVESTIGATION, CAMPAIGN, TASK, CUSTOM

**NOTE**: No standalone `Task` model exists. Tasks are either MilestoneItems or runtime UnifiedTasks from TaskAggregatorService.

### 1.2 Backend Services Already Built

**ProjectsModule** at `apps/backend/src/modules/projects/`:

- `projects.module.ts` - Imports PrismaModule, provides/exports MilestoneService
- `projects.controller.ts` - REST at `/api/v1/projects` with CRUD endpoints
- `milestone.service.ts` - Full CRUD, weighted progress calculation, entity sync, audit logging
- `dto/milestone.dto.ts` - Create, Update, Query, Response DTOs

**Controller Routes**:

- `POST /projects` - Create (COMPLIANCE_OFFICER, MANAGER, SYSTEM_ADMIN)
- `GET /projects` - List with filters/pagination
- `GET /projects/:id` - Get by ID
- `PUT /projects/:id` - Update
- `DELETE /projects/:id` - Delete
- `POST /projects/:id/items` - Add item
- `PUT /projects/:id/items/:itemId` - Update item
- `DELETE /projects/:id/items/:itemId` - Remove item

**MilestoneService features**:

- `recalculateProgress()` - Weighted progress, auto-status updates
- `syncEntityCompletion()` - Syncs linked entity completion
- Auto-status: COMPLETED at 100%, AT_RISK if past target, IN_PROGRESS if >0%

### 1.3 Frontend Components Already Built

**Projects Page** (`apps/frontend/src/app/(authenticated)/projects/page.tsx`):

- Basic card listing with name, status, progress bar, dates
- Uses direct `api.get('/projects')` (not React Query hooks)
- "New Project" button exists but not wired to modal

**GanttChart** (`apps/frontend/src/components/projects/GanttChart.tsx`):

- Custom-built (no external library)
- Timeline zoom: week/month/quarter
- Progress bars, status colors, today line, tooltips
- Uses `gantt-utils.ts` for calculations

**MilestoneTimeline** (`apps/frontend/src/components/projects/MilestoneTimeline.tsx`):

- Vertical timeline list view
- Status icons, progress bars, days remaining badges

**React Query Hooks** (`apps/frontend/src/hooks/use-milestones.ts`):

- Full CRUD hooks exist but call `/milestones` endpoint (mismatch with `/projects` controller)

**Frontend Types** (`apps/frontend/src/types/milestone.ts`):

- MilestoneCategory values DIFFER from backend (frontend: IMPLEMENTATION, INTEGRATION, TRAINING, GO_LIVE, MIGRATION, CUSTOM)

**Navigation**: Projects in sidebar with FolderKanban icon at `/projects`

### 1.4 Known Issues/Gaps

1. **API endpoint mismatch**: Frontend hooks call `/milestones` but controller is at `/projects`
2. **Category enum mismatch**: Frontend has different category values than backend
3. **Projects page doesn't use React Query hooks** - Uses raw `api.get()`
4. **GanttChart and MilestoneTimeline exist but aren't integrated** into projects page
5. **No Kanban/Board view for projects** yet
6. **No standalone Task model** - Only MilestoneItems with TASK/CUSTOM types

---

## 2. Monday.com Features Analysis

### 2.1 Essential Features to Replicate

**Board Structure** (Monday.com's core concept):

- A "board" = a project workspace
- "Groups" = sections within a board (e.g., "To Do", "In Progress", "Done" or by sprint/phase)
- "Items" = tasks/work items within groups
- "Subitems" = subtasks under items
- "Columns" = customizable fields per item (status, person, date, priority, text, number, timeline)

**Views** (multiple views of the same data):

1. **Table View** (default) - Spreadsheet-like with inline editing, column reordering, grouping
2. **Kanban View** - Cards grouped by status column with drag-to-move
3. **Timeline/Gantt View** - Bar chart of item start/end dates with dependencies
4. **Calendar View** - Items plotted on calendar by date fields

**Status Column** (Monday.com's signature feature):

- Color-coded labels (green=done, orange=working, red=stuck, gray=not started)
- Customizable label names per status
- Status changes trigger automations and progress updates

**Core Interactions**:

- Inline editing (click any cell to edit)
- Drag-and-drop items between groups
- Drag-and-drop groups to reorder
- Column add/remove/reorder
- Item detail modal (click item opens side panel with all fields, activity, updates)
- @mentions in item updates
- File attachments on items

### 2.2 Features to Skip for V1

- **Automations engine** (too complex - use manual workflows)
- **Integrations marketplace** (not needed)
- **Formulas/calculated columns** (defer)
- **Charts/dashboards within boards** (use existing analytics module)
- **Workdocs** (use existing policy/document tools)
- **Calendar view** (defer - Gantt covers timeline needs)
- **Dependencies arrows on Gantt** (complex - defer to V2)
- **Time tracking** (not needed for compliance)

### 2.3 Compliance-Specific Project Templates

1. **New Client Implementation** - Phases: kickoff, configuration, data migration, testing, training, go-live
2. **Annual Policy Review** - Steps: identify policies, assign reviewers, collect feedback, update, approve, distribute
3. **Compliance Audit Preparation** - Phases: scope, evidence collection, internal review, remediation, auditor submission
4. **Investigation Project** - Steps: intake, assign, investigate, document, remediation, close
5. **Training Rollout** - Phases: content development, audience targeting, launch, tracking, completion report
6. **Disclosure Campaign** - Steps: form design, audience selection, launch, monitoring, follow-up, reporting

### 2.4 Recommended Data Model

**Project** (extends/replaces current Milestone):

- All existing Milestone fields
- New: `templateId`, `color`, `viewSettings` (JSON), `defaultGroupBy`

**ProjectGroup** (new - sections within a project):

- `id`, `organizationId`, `projectId`, `name`, `color`, `sortOrder`, `isCollapsed`

**ProjectTask** (new - replaces MilestoneItem with richer model):

- `id`, `organizationId`, `projectId`, `groupId`, `title`, `description`
- `status` (customizable per project), `priority`, `assigneeId`, `dueDate`, `startDate`
- `sortOrder`, `parentTaskId` (for subtasks), `customFields` (JSON for extensibility)
- `completedAt`, `createdById`

**ProjectColumn** (new - customizable columns per project):

- `id`, `organizationId`, `projectId`, `name`, `type` (STATUS, PERSON, DATE, TEXT, NUMBER, TIMELINE, PRIORITY, LABEL)
- `settings` (JSON - options for status/label columns), `sortOrder`, `width`, `isRequired`

**ProjectTemplate** (new):

- `id`, `organizationId`, `name`, `description`, `category`
- `templateData` (JSON - groups, columns, sample tasks)
- `isSystem` (built-in vs custom)

### 2.5 Recommended NPM Packages

- **@dnd-kit** (already installed) - Drag-and-drop for Kanban and reordering
- **@tanstack/react-table** (already installed) - Table view with inline editing
- **GanttChart** - Already custom-built, extend it
- **date-fns** (already installed) - Date calculations
- **No new packages needed** - Existing libraries cover all requirements

---

## 3. Frontend Architecture

### 3.1 Tech Stack (Established)

- Next.js 14 App Router + React 18 + TypeScript
- shadcn/ui (Radix UI primitives + Tailwind CSS)
- @tanstack/react-table for data tables
- @tanstack/react-query for server state
- @dnd-kit for drag-and-drop
- lucide-react for icons
- date-fns for dates
- sonner for toasts
- react-hook-form + zod for forms

### 3.2 Page Structure Pattern

Every list page follows:

```
<SavedViewProvider config={MODULE_CONFIG}>
  <ViewTabsBar />
  <ViewToolbar />
  <QuickFiltersRow />
  <DataTable /> or <BoardView />
  <ColumnSelectionModal />
  <AdvancedFiltersPanel />
</SavedViewProvider>
```

To add project list page:

1. Config: `src/lib/views/configs/projects.config.ts`
2. Hook: `src/hooks/views/useProjectsView.ts`
3. Page: `src/app/(authenticated)/projects/page.tsx` (rewrite existing)

### 3.3 Board/Kanban Already Built

`BoardView<T>` component exists with:

- @dnd-kit DndContext with closestCorners collision
- GroupBy configurable field
- DragOverlay for drag feedback
- BoardColumn with useDroppable, BoardCard with useDraggable
- Configurable card fields via BoardCardConfig

### 3.4 View Modes Available

Current: "table" | "board"
Need to add: "timeline" (Gantt) and potentially "calendar" later

### 3.5 Project Detail Page Pattern

Should follow case detail page pattern:

- Three-column or two-column layout
- Left: project info, settings
- Center: task table/board with group headers
- Right: milestones, connected entities, activity

---

## 4. Backend Conventions

### 4.1 Module Structure

```
modules/projects/
  projects.module.ts        # Extend existing
  projects.controller.ts    # Extend existing
  milestone.service.ts      # Keep for backward compat
  project.service.ts        # New - project CRUD
  project-task.service.ts   # New - task CRUD
  project-group.service.ts  # New - group CRUD
  project-template.service.ts # New - templates
  dto/
    project.dto.ts          # New DTOs
    project-task.dto.ts
    project-group.dto.ts
    project-template.dto.ts
    milestone.dto.ts        # Keep existing
  events/
    project.events.ts       # New events
```

### 4.2 Key Conventions

- Guards: `@UseGuards(JwtAuthGuard, TenantGuard)` class-level, `@Roles()` + `@UseGuards(RolesGuard)` method-level
- Decorators: `@CurrentUser()`, `@TenantId()` (NOT hardcoded IDs)
- All queries include `organizationId`
- Audit via `AuditService.log()` with `AuditEntityType`
- Events extend `BaseEvent` with `organizationId` required
- Paginated: `Promise.all([findMany, count])`
- DTOs: class-validator + Swagger decorators

### 4.3 Integration Points

| System                  | Integration Needed                               |
| ----------------------- | ------------------------------------------------ |
| ViewEntityType enum     | Add `PROJECTS` value                             |
| WorkflowEntityType enum | Add `PROJECT` value (optional for V1)            |
| TaskAggregatorService   | Add project tasks to "My Work" queue             |
| AuditEntityType enum    | Already has `MILESTONE`, may need `PROJECT_TASK` |
| Navigation              | Already present, update to use new page          |
| Saved Views             | Use existing system with projects config         |

---

## 5. Implementation Strategy

### 5.1 Build vs Extend Decision

**Recommendation: Extend existing Milestone model + add new models**

The existing Milestone/MilestoneItem models cover ~30% of needs. Rather than replacing them:

1. Add new `ProjectGroup`, `ProjectTask`, `ProjectColumn`, `ProjectTemplate` models
2. Keep Milestone as the "project" entity (rename in UI only, keep model name for backward compat)
3. ProjectTask replaces MilestoneItem for rich task management
4. Keep MilestoneItem for backward compat with existing entity-linked milestones

### 5.2 Suggested Wave Structure

- **Wave 1**: Backend - Prisma models, DTOs, services, controller endpoints
- **Wave 2**: Frontend - Project list page (table + board views) with saved views integration
- **Wave 3**: Frontend - Project detail page with task table, group management, inline editing
- **Wave 4**: Frontend - Gantt/timeline view integration, project templates
- **Wave 5**: Integration - My Work queue, demo data, verification

### 5.3 Risk Areas

1. **Scope creep** - Monday.com is enormous. Must strictly limit to table/board/Gantt views
2. **Custom columns** - JSON customFields is simpler than full column infrastructure for V1
3. **Inline editing** - Complex to build well. Consider click-to-edit cells vs modal editing
4. **Gantt dependencies** - Skip for V1, too complex
5. **Frontend type mismatches** - Must fix existing enum mismatches before building on top
