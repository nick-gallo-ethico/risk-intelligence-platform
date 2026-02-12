---
phase: 21-project-management
plan: 01
subsystem: api
tags: [nestjs, prisma, project-management, monday-style, templates]

# Dependency graph
requires:
  - phase: none
    provides: Existing Milestone model and MilestoneService
provides:
  - ProjectGroup, ProjectTask, ProjectColumn, ProjectTemplate Prisma models
  - ProjectService with extended project CRUD
  - ProjectTaskService with task management
  - ProjectGroupService with group/section management
  - ProjectTemplateService with 6 built-in compliance templates
affects: [21-project-management, project-controllers, frontend-boards]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Monday.com-style project boards with groups and tasks
    - Template-based project creation
    - Subtask support via self-referencing ProjectTask
    - Custom columns per project

key-files:
  created:
    - apps/backend/prisma/schema.prisma (models: ProjectGroup, ProjectTask, ProjectColumn, ProjectTemplate)
    - apps/backend/src/modules/projects/project.service.ts
    - apps/backend/src/modules/projects/project-task.service.ts
    - apps/backend/src/modules/projects/project-group.service.ts
    - apps/backend/src/modules/projects/project-template.service.ts
    - apps/backend/src/modules/projects/events/project.events.ts
    - apps/backend/src/modules/projects/dto/project.dto.ts
    - apps/backend/src/modules/projects/dto/project-task.dto.ts
    - apps/backend/src/modules/projects/dto/project-group.dto.ts
    - apps/backend/src/modules/projects/dto/project-template.dto.ts
  modified:
    - apps/backend/src/modules/projects/projects.module.ts
    - apps/backend/src/modules/projects/dto/index.ts
    - apps/backend/src/modules/projects/index.ts

key-decisions:
  - "ProjectTask replaces MilestoneItem for project-specific tasks with richer metadata"
  - "Groups are optional - tasks can be ungrouped (groupId=null)"
  - "6 system templates cover common compliance project types"
  - "Progress recalculation uses ProjectTask completion, not MilestoneItem"

patterns-established:
  - "Template data structure: groups[], columns[], tasks[] with relative due dates"
  - "Subtask support via parentTaskId self-reference"
  - "Bulk task operations for drag-drop UI support"
  - "Group reordering via orderedIds array"

# Metrics
duration: 19min
completed: 2026-02-12
---

# Phase 21 Plan 01: Project Management Backend Data Model Summary

**Monday.com-style project boards with Prisma models for ProjectGroup, ProjectTask, ProjectColumn, ProjectTemplate plus 4 services with full CRUD operations and 6 built-in compliance templates**

## Performance

- **Duration:** 19 min
- **Started:** 2026-02-12T19:00:41Z
- **Completed:** 2026-02-12T19:19:50Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Added 4 new Prisma models (ProjectGroup, ProjectTask, ProjectColumn, ProjectTemplate) with proper relations and indexes
- Created ProjectService, ProjectTaskService, ProjectGroupService, ProjectTemplateService with full CRUD
- Implemented 6 built-in compliance project templates (New Client Implementation, Annual Policy Review, Compliance Audit Prep, Investigation Project, Training Rollout, Disclosure Campaign)
- Added 3 new enums (ProjectTaskStatus, ProjectTaskPriority, ProjectColumnType)
- Updated AuditEntityType and ViewEntityType enums

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Prisma models and enums for project management** - `7a99bc5` (feat)
2. **Task 2: Create DTOs, services, and events for project management** - `6341561` (feat)

## Files Created/Modified

**Created:**

- `apps/backend/prisma/schema.prisma` - Added ProjectGroup, ProjectTask, ProjectColumn, ProjectTemplate models + enums
- `apps/backend/src/modules/projects/project.service.ts` - Extended project CRUD with groups and task counts
- `apps/backend/src/modules/projects/project-task.service.ts` - Task CRUD with subtask support, bulk operations
- `apps/backend/src/modules/projects/project-group.service.ts` - Group CRUD with reordering
- `apps/backend/src/modules/projects/project-template.service.ts` - Template CRUD with apply functionality
- `apps/backend/src/modules/projects/events/project.events.ts` - Task and group domain events
- `apps/backend/src/modules/projects/dto/project.dto.ts` - Project detail and query DTOs
- `apps/backend/src/modules/projects/dto/project-task.dto.ts` - Task CRUD, bulk update, reorder DTOs
- `apps/backend/src/modules/projects/dto/project-group.dto.ts` - Group CRUD DTOs
- `apps/backend/src/modules/projects/dto/project-template.dto.ts` - Template CRUD and apply DTOs

**Modified:**

- `apps/backend/src/modules/projects/projects.module.ts` - Added new service providers and exports
- `apps/backend/src/modules/projects/dto/index.ts` - Re-export new DTOs
- `apps/backend/src/modules/projects/index.ts` - Export new services and events

## Decisions Made

1. **ProjectTask vs MilestoneItem**: ProjectTask provides richer task management (status, priority, assignee, subtasks, custom fields) while MilestoneItem remains for linking to external entities (cases, investigations, campaigns)
2. **Template structure**: Templates store groups, columns, and tasks as JSON with relative due dates (days from project start date)
3. **Progress calculation**: Project progress uses ProjectTask completion counts rather than MilestoneItem for board-style projects
4. **Group deletion**: When a group is deleted, its tasks are moved to ungrouped (groupId=null) rather than being deleted

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **Prisma migration shadow database error**: Used `prisma db push` instead of `prisma migrate dev` due to existing enum conflict in shadow database. Schema was successfully pushed and client regenerated.
2. **updateMany relation update**: Bulk task updates with assigneeId required individual updates due to Prisma's updateMany limitation with relation fields.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend data layer complete with all models and services
- Ready for Plan 02: Project Management Controllers API
- Services emit events for audit logging integration
- All services enforce organizationId tenant isolation

---

_Phase: 21-project-management_
_Completed: 2026-02-12_
