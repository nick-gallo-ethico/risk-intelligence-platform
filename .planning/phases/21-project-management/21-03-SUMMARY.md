---
phase: 21
plan: 03
subsystem: frontend
tags: [projects, saved-views, frontend, react, typescript]
requires: [21-02]
provides: [frontend-project-list-page, projects-saved-views]
affects: [21-04, 21-05]
tech-stack:
  added: []
  patterns: [saved-views-pattern, module-view-config]
key-files:
  created:
    - apps/frontend/src/types/project.ts
    - apps/frontend/src/lib/views/configs/projects.config.ts
    - apps/frontend/src/hooks/views/useProjectsView.ts
  modified:
    - apps/frontend/src/lib/views/configs/index.ts
    - apps/frontend/src/hooks/views/index.ts
    - apps/frontend/src/hooks/use-milestones.ts
    - apps/frontend/src/app/(authenticated)/projects/page.tsx
decisions:
  - id: project-view-config
    choice: "Use PROJECTS moduleType with cast to ViewEntityType"
    rationale: "ViewEntityType enum doesn't include PROJECTS yet; cast allows config to work without schema changes"
  - id: board-groupby-status
    choice: "Default board groupBy is 'status' with 5 status columns"
    rationale: "Matches MilestoneStatus enum: NOT_STARTED, IN_PROGRESS, AT_RISK, COMPLETED, CANCELLED"
  - id: template-creation-tab
    choice: "CreateProjectDialog has Blank and Template tabs"
    rationale: "Users can either start fresh or leverage pre-built compliance templates"
metrics:
  duration: ~7 minutes
  completed: 2026-02-12
---

# Phase 21 Plan 03: Frontend Project List Page Summary

**One-liner:** Complete rewrite of projects page with HubSpot-style saved views system, table/board views, and create dialog with template support.

## What Was Built

### Task 1: TypeScript Types and View Config (041783e)

**Types created in `types/project.ts`:**

- `ProjectStatus` - 5 statuses matching MilestoneStatus enum
- `ProjectCategory` - 7 categories matching MilestoneCategory enum
- `ProjectTaskStatus` - 5 statuses for project tasks
- `ProjectTaskPriority` - 4 priority levels (LOW, MEDIUM, HIGH, CRITICAL)
- `Project` interface with all fields from backend model
- `ProjectGroup`, `ProjectTask`, `ProjectColumn`, `ProjectTemplate` interfaces
- DTOs: `CreateProjectDto`, `UpdateProjectDto`, `ProjectQueryDto`
- `ProjectsResponse` for paginated list results

**View config in `projects.config.ts`:**

- moduleType: "PROJECTS"
- 12 columns across 4 property groups (core, progress, dates, assignment)
- Board config with 5 status columns (NOT_STARTED through CANCELLED)
- 4 quick filter properties (status, category, owner, targetDate)
- 4 bulk actions (Change Status, Change Owner, Export, Delete)
- 4 default views (All Projects, Active Projects, My Projects, At Risk)

**Endpoint fix in `use-milestones.ts`:**

- Changed all `/milestones` endpoints to `/projects`
- Aligns with backend ProjectsController route

### Task 2: useProjectsView Hook and Page Rewrite (a773cc6)

**Hook in `useProjectsView.ts`:**

- Fetches projects from `/projects` with filters, sort, pagination
- buildFilterParams converts SavedViewContext state to API params
- Bulk mutations: status change, owner assignment, delete
- Single status mutation for board drag-drop
- Returns: projects, totalRecords, isLoading, handleBulkAction, handleStatusChange

**Rewritten `projects/page.tsx`:**

- SavedViewProvider wrapper with PROJECTS_VIEW_CONFIG
- ViewTabsBar for saved view tabs
- ViewToolbar with New Project button and filter toggle
- QuickFiltersRow (conditional)
- DataTable for table view mode
- BoardView for board/Kanban view mode
- ColumnSelectionModal and AdvancedFiltersPanel

**CreateProjectDialog component:**

- Tabs: "Blank Project" and "From Template"
- Blank tab: name, description, category, targetDate, owner
- Template tab: template selector, name, description, targetDate, owner
- Fetches templates from `/project-templates`
- Fetches users from `/users` for owner dropdown
- Posts to `/projects` (blank) or `/project-templates/:id/apply` (template)

## Files Changed

| File                                    | Change Type | Purpose                                    |
| --------------------------------------- | ----------- | ------------------------------------------ |
| `types/project.ts`                      | Created     | TypeScript types for projects module       |
| `lib/views/configs/projects.config.ts`  | Created     | Module view configuration                  |
| `lib/views/configs/index.ts`            | Modified    | Export PROJECTS_VIEW_CONFIG                |
| `hooks/views/useProjectsView.ts`        | Created     | Data fetching hook                         |
| `hooks/views/index.ts`                  | Modified    | Export useProjectsView                     |
| `hooks/use-milestones.ts`               | Modified    | Fix endpoint from /milestones to /projects |
| `app/(authenticated)/projects/page.tsx` | Rewritten   | Full saved views implementation            |

## Technical Decisions

1. **View Config Typing**: Cast moduleType to "CASES" since ViewEntityType doesn't include "PROJECTS" yet. This allows the config to work without modifying the shared types schema.

2. **Board Column Colors**: Used semantic colors - gray (NOT_STARTED), blue (IN_PROGRESS), amber (AT_RISK), green (COMPLETED), red (CANCELLED).

3. **Default View Sort**: "All Projects" sorted by targetDate ascending (upcoming deadlines first).

4. **Pagination**: Uses offset/limit pattern matching backend ProjectsController.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit` passes from apps/frontend
- PROJECTS_VIEW_CONFIG properly exported
- Pre-commit hooks pass (lint, typecheck, security audit)

## Next Phase Readiness

Ready for 21-04 (Project Detail Page) which will:

- Create the project detail page at `/projects/[id]`
- Show project header, groups, tasks in Monday.com-style board
- Enable task CRUD within project context
- Use the Project types created in this plan

## Commits

| Hash    | Description                                                     |
| ------- | --------------------------------------------------------------- |
| 041783e | feat(21-03): add TypeScript types and view config for projects  |
| a773cc6 | feat(21-03): add useProjectsView hook and rewrite projects page |
