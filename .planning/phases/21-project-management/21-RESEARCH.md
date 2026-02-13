# Phase 21 Research: Project Management (Monday.com-Style)

> Researched: 2026-02-08 (initial), 2026-02-12 (expanded with deep Monday.com analysis)
> Sources: 4 parallel research agents (initial) + 3 web research agents + infrastructure audit (expanded)

## RESEARCH COMPLETE — EXPANDED

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

### 1.5 Reusable Platform Infrastructure (NEW — from Feb 12 audit)

| Component                | Status    | Key File                                                   | Reuse Strategy                                                                                |
| ------------------------ | --------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Notification Service** | Complete  | `modules/notifications/services/notification.service.ts`   | Use `notify()` for dual-channel (in-app + email). NotificationType.MENTION already exists.    |
| **WebSocket Gateway**    | Complete  | `modules/notifications/gateways/notification.gateway.ts`   | JWT auth, tenant rooms, real-time push. Add project room support.                             |
| **File Attachments**     | Complete  | `modules/attachments/attachments.service.ts`               | Extend `AttachmentEntityType` to add PROJECT_TASK. Same upload/download/signed-URL pattern.   |
| **Activity/Audit Log**   | Complete  | `common/services/activity.service.ts`                      | Non-blocking logger. AuditEntityType already has MILESTONE. Add PROJECT_TASK, PROJECT_UPDATE. |
| **Email Templates**      | Complete  | `modules/notifications/services/email-template.service.ts` | Add templates for task assignment, @mention, status change.                                   |
| **Comments System**      | NOT BUILT | N/A                                                        | Build from scratch as ProjectUpdate model with threaded replies.                              |
| **@Mention Detection**   | Partial   | NotificationType.MENTION exists                            | Build mention extraction logic (parse content for `@user` patterns).                          |

---

## 2. Monday.com Deep Analysis (Expanded Feb 12)

### 2.1 Core Data Model

Monday.com's architecture:

| Monday.com Concept | Our Equivalent             | Notes                                             |
| ------------------ | -------------------------- | ------------------------------------------------- |
| **Workspace**      | Organization               | Tenant-level container                            |
| **Board**          | Project (Milestone)        | Single project workspace                          |
| **Group**          | ProjectGroup               | Collapsible sections within a board               |
| **Item**           | ProjectTask                | Tasks/work items within groups                    |
| **Subitem**        | ProjectTask (parentTaskId) | Subtasks (supports multiple levels in Monday.com) |
| **Column**         | ProjectColumn              | Customizable fields per board                     |
| **Update**         | ProjectUpdate              | Conversation thread per item                      |
| **Subscriber**     | ProjectTaskSubscriber      | Watch/follow items and boards                     |

### 2.2 Monday.com Column Types (36+ types)

From [Monday.com API Reference](https://developer.monday.com/api-reference/reference/column-types-reference):

**Essential (our V1 scope):**

- `status` → STATUS (color-coded labels, customizable)
- `people` → PERSON (assign one or multiple users)
- `date` → DATE (single date)
- `timeline` → TIMELINE (date range: start + end)
- `text` → TEXT (short text)
- `long_text` → TEXT (long text / rich text)
- `numbers` → NUMBER
- `dropdown` → DROPDOWN (custom options)
- `checkbox` → CHECKBOX
- `link` → LINK (URL)
- `tags` → TAGS (cross-board labels)
- `file` → FILES (attachments)
- `dependency` → DEPENDENCY (task-to-task links)
- `board_relation` → CONNECTED_ENTITY (link to other entities)
- `mirror` → (deferred — reflects data from connected items)

**Calculated (read-only):**

- `auto_number` — auto-incrementing ID
- `progress` — progress tracking
- `creation_log` — created date
- `last_updated` — last modified date

**Deferred to V2:**

- `formula` — calculated columns
- `rating`, `vote` — team voting/rating
- `color_picker`, `country`, `location`, `world_clock` — specialized types
- `hour`, `week` — time-specific types
- `phone`, `email` — contact types
- `doc` — Monday.com Docs
- `button` — action triggers
- `time_tracking` — time logging

### 2.3 Monday.com Views

From [Monday.com Board Views](https://support.monday.com/hc/en-us/articles/360001267945-The-board-views):

| View                    | Our Plan                       | Priority       |
| ----------------------- | ------------------------------ | -------------- |
| **Table** (default)     | Plan 21-04                     | V1 - Core      |
| **Kanban**              | Plan 21-05                     | V1 - Core      |
| **Gantt/Timeline**      | Plan 21-05                     | V1 - Core      |
| **Workload**            | Plan 21-09                     | V1 - Important |
| **Dashboard** (widgets) | Plan 21-09                     | V1 - Important |
| Calendar                | Deferred                       | V2             |
| Files Gallery           | Deferred                       | V2             |
| Cards/Gallery           | Deferred                       | V2             |
| Chart                   | Deferred (use Reports module)  | V2             |
| Map                     | Deferred                       | V2             |
| Form                    | Deferred (use Campaigns/Forms) | V2             |

### 2.4 Monday.com Item Detail (Updates Section)

From [Monday.com Updates Section](https://support.monday.com/hc/en-us/articles/115005900249-The-Updates-Section):

The item detail view is Monday.com's #1 collaboration differentiator. Key features:

- **Conversation thread**: Social media-style updates per item
- **@mentions**: Tag any person, team, or "@everyone" subscribed to the item
- **Rich text**: Bold, italic, bulleted lists, links, inline images
- **File attachments**: Upload directly in updates
- **Checklists**: Add to-do checklists within updates
- **Reactions**: Thumbs up / emoji reactions
- **Threaded replies**: Reply to specific updates
- **Activity Log**: Every field change tracked with who/when ([Activity Log](https://support.monday.com/hc/en-us/articles/115005310745-The-Activity-Log))
- **Pinned updates**: Pin important updates to top

### 2.5 Monday.com Collaboration System

From [Monday.com Notifications](https://support.monday.com/hc/en-us/articles/360001292545-Notifications-explained):

- **Board subscribers**: Follow a board for all updates
- **Item subscribers**: Follow specific items
- **Auto-subscription**: Assigned users auto-subscribed
- **@mention notifications**: Triggers bell notification + email
- **Notification preferences**: Per-board mute, personal notification settings, quiet hours
- **Update Feed (Inbox)**: Centralized notification center

### 2.6 Monday.com Automations

From [Monday.com Automations](https://support.monday.com/hc/en-us/articles/360001222900-Get-started-with-monday-automations):

- Trigger → Condition → Action recipes
- Pre-built: "When status changes to Done, notify channel"
- Custom: user-built recipes
- **Our approach**: Defer automations engine. Leverage Phase 19 workflow engine for automation-like behavior. Basic status-change notifications handled by event listener.

### 2.7 Monday.com Dependencies

From [Monday.com Dependencies](https://support.monday.com/hc/en-us/articles/360007402599-Dependencies-on-monday-com):

- Dependency column links tasks with finish-to-start relationships
- Dependencies show as arrows on Gantt chart
- Batch dependencies for quick sequential setup
- Dependency types: Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish

### 2.8 Monday.com Connected Boards

From [Monday.com Connect Boards](https://support.monday.com/hc/en-us/articles/360000635139-The-Connect-Boards-Column):

- Link items across boards (in our case: link project tasks to Cases, Investigations, Policies)
- Mirror Column reflects data from connected items
- **Our approach**: CONNECTED_ENTITY column type links to platform entities. Mirror deferred to V2.

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

### 3.3 Board/Kanban Already Built

`BoardView<T>` component exists with @dnd-kit DndContext, GroupBy field, DragOverlay, and configurable card fields.

### 3.4 View Modes

V1 scope: "table" | "board" | "timeline" | "workload" | "dashboard"
V2: "calendar" | "files" | "cards"

---

## 4. Backend Conventions

### 4.1 Module Structure

```
modules/projects/
  projects.module.ts             # Extend existing
  projects.controller.ts         # Extend existing (tasks, groups, columns, files, subscribers, deps)
  project-template.controller.ts # New - template CRUD + apply
  project-update.controller.ts   # New - task conversation endpoints
  milestone.service.ts           # Keep for backward compat
  services/
    project.service.ts           # New - project CRUD + stats
    project-task.service.ts      # New - task CRUD + bulk + reorder
    project-group.service.ts     # New - group CRUD
    project-template.service.ts  # New - templates
    project-update.service.ts    # New - conversation + @mentions
  listeners/
    project-event.listener.ts    # New - notification dispatch
  dto/
    project-task.dto.ts
    project-group.dto.ts
    project-column.dto.ts
    project-template.dto.ts
    project-update.dto.ts
    milestone.dto.ts             # Keep existing
  events/
    project.events.ts            # New events
```

### 4.2 Key Conventions

- Guards: `@UseGuards(JwtAuthGuard, TenantGuard)` class-level, `@Roles()` + `@UseGuards(RolesGuard)` method-level
- Decorators: `@CurrentUser()`, `@TenantId()` (NOT hardcoded IDs)
- All queries include `organizationId`
- Audit via `ActivityService.log()` — non-blocking, never throws
- Events via `EventEmitter2` with `@OnEvent()` listeners
- Notifications via `NotificationService.notify()` — dual-channel, preference-aware
- File uploads via `AttachmentsService` — storage adapter pattern
- Paginated: `Promise.all([findMany, count])`
- DTOs: class-validator + Swagger decorators

### 4.3 Integration Points

| System                | Integration                                   | Plan         |
| --------------------- | --------------------------------------------- | ------------ |
| ViewEntityType enum   | Add `PROJECTS` value                          | 21-03        |
| TaskAggregatorService | Add project tasks to "My Work" queue          | 21-02        |
| AuditEntityType enum  | Add `PROJECT_TASK`, `PROJECT_UPDATE`          | 21-01        |
| AttachmentEntityType  | Add `PROJECT_TASK`                            | 21-01        |
| NotificationService   | Dispatch for assignments, @mentions, comments | 21-02, 21-08 |
| WebSocket Gateway     | Real-time project room for live collaboration | 21-08        |
| Navigation            | Already present, update to use new page       | 21-03        |
| Saved Views           | Use existing system with projects config      | 21-03        |

---

## 5. Implementation Strategy

### 5.1 Build vs Extend Decision

**Recommendation: Extend existing Milestone model + add 7 new models**

1. Keep Milestone as the "project" entity (rename in UI only)
2. Add: ProjectGroup, ProjectTask, ProjectColumn, ProjectTemplate, ProjectUpdate, ProjectTaskSubscriber, ProjectTaskDependency
3. Keep MilestoneItem for backward compat with existing entity-linked milestones
4. Leverage existing: NotificationService, AttachmentsService, ActivityService, WebSocket Gateway

### 5.2 Wave Structure (10 plans, 8 waves)

| Wave | Plans        | Focus                                                        |
| ---- | ------------ | ------------------------------------------------------------ |
| 1    | 21-01        | Backend Prisma models, DTOs, services (7 new models)         |
| 2    | 21-02        | Backend controllers (~30 endpoints), event listener, My Work |
| 3    | 21-03        | Frontend project list with saved views                       |
| 4    | 21-04        | Frontend project detail: grouped table, inline editing       |
| 5    | 21-05        | Board view, timeline view with dependency arrows             |
| 6    | 21-06, 21-07 | Rich task detail panel + Column configuration UI (parallel)  |
| 7    | 21-08, 21-09 | @Mention notifications + Workload/Dashboard views (parallel) |
| 8    | 21-10        | Demo data seeder + human verification checkpoint             |

### 5.3 Risk Areas

1. **Scope**: Monday.com is enormous. V1 covers 5 views, 15 column types, conversations, @mentions, dependencies. Automations, formulas, calendar, mirror columns deferred to V2.
2. **@Mention parsing**: Extracting mentions from rich text requires careful HTML parsing. Use data attributes on mention spans.
3. **Column flexibility**: Dynamic columns mean task table must render cells based on column type — more complex than hardcoded columns.
4. **Gantt dependencies**: SVG arrow rendering on the Gantt chart requires coordinate calculations for connected task bars.
5. **Real-time**: WebSocket project rooms need proper join/leave lifecycle management.

### 5.4 Features Explicitly Deferred to V2

- Calendar view
- Files Gallery view
- Cards/Gallery view
- Formula columns
- Mirror columns (reflect connected entity data)
- Automation recipes engine
- Multiple subitem levels (V1 supports 1 level)
- Time tracking
- Rating/Vote columns
- Board-level subscribers (V1 has item-level only)
- Chart view within projects (use Reports module)
