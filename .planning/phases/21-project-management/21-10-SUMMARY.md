---
phase: 21-project-management
plan: 10
subsystem: seed-data
tags: [demo-data, project-templates, seed, verification]

# Dependency graph
requires:
  - phase: 21-06
    provides: Task conversations, files, subscribers, dependencies components
  - phase: 21-07
    provides: Column configuration and custom column types
  - phase: 21-08
    provides: @Mentions and notification event handlers
  - phase: 21-09
    provides: Workload and dashboard views
provides:
  - 6 system project templates for compliance project types
  - 5 Acme Co. demo projects with groups, tasks, and custom columns
  - Seeder integrated into seed.ts orchestrator
affects: [demo-environment, phase-21-complete]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Phase seeder factory pattern (seedPhase21 export)
    - Idempotent seed with cleanup before create
    - System templates with isSystem=true, organizationId=null

key-files:
  created:
    - apps/backend/prisma/seeders/acme-phase-21.ts
  modified:
    - apps/backend/prisma/seed.ts

key-decisions:
  - "6 system templates cover common compliance project types"
  - "5 demo projects at various statuses (NOT_STARTED, IN_PROGRESS, AT_RISK, COMPLETED)"
  - "ProjectUpdate, ProjectTaskSubscriber, ProjectTaskDependency models not in schema - skipped conversation/dependency seeding"
  - "Custom columns seeded to demonstrate column flexibility"

patterns-established:
  - "Phase seeder follows existing acme-phase-N.ts naming convention"

# Metrics
duration: ~30min
completed: 2026-02-12
---

# Phase 21 Plan 10: Demo Data Seeder & Verification Summary

**Demo data seeder with 6 system templates and 5 Acme Co. projects. Conversation/subscriber/dependency seeding skipped due to missing Prisma models.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-02-12
- **Completed:** 2026-02-12
- **Tasks:** 1 of 2 (Task 2 was checkpoint)
- **Files modified:** 2

## Accomplishments

- 6 system project templates covering compliance project types (New Client Implementation, Annual Policy Review, Compliance Audit Preparation, Investigation Project, Training Rollout, Disclosure Campaign)
- 5 Acme Co. demo projects with realistic compliance scenarios at various stages
- Projects include groups with colored headers, tasks with varied statuses/priorities/assignees, and custom columns
- Seeder integrated into seed.ts orchestrator with idempotent cleanup

## Task Commits

1. **Task 1: Demo data seeder** - `432c9c4` (feat)
   - acme-phase-21.ts with 6 templates + 5 projects
   - Realistic task data with statuses, priorities, dates
   - Custom columns: Control ID, Risk Level, Department, etc.
   - Integrated into seed.ts

2. **Task 2: Human verification checkpoint** - Deferred
   - 75-step verification checklist prepared
   - Checkpoint pending user review

## Files Created/Modified

- `apps/backend/prisma/seeders/acme-phase-21.ts` - Demo data seeder (1631 lines)
- `apps/backend/prisma/seed.ts` - Added seedPhase21 import and call

## Decisions Made

- **Skipped conversation seeding:** ProjectUpdate model not in Prisma schema, so task conversations/threaded replies could not be seeded
- **Skipped subscriber seeding:** ProjectTaskSubscriber model not in Prisma schema
- **Skipped dependency seeding:** ProjectTaskDependency model not in Prisma schema
- **Custom columns demonstrate flexibility:** Text, Dropdown, Number, Status, Link column types used across projects

## Deviations from Plan

- **Major:** Task conversations with @mentions, threaded replies, subscribers, and task dependencies were NOT seeded because the corresponding Prisma models (ProjectUpdate, ProjectTaskSubscriber, ProjectTaskDependency) do not exist in the schema. These models were referenced in Plans 06-08 but were not added during Plan 01 (which only added ProjectGroup, ProjectTask, ProjectColumn, ProjectTemplate).

## Known Gaps

- **Missing Prisma models:** ProjectUpdate, ProjectTaskSubscriber, ProjectTaskDependency need to be added to schema.prisma for full conversation/collaboration features to work
- **Frontend components exist without backend:** TaskUpdateThread, TaskSubscriberList, TaskDependencyList, TaskActivityLog components exist but their API endpoints have no backing data models
- **Verification steps affected:** Steps 34-42 of the 75-step checklist (conversations, subscribers, dependencies, file uploads) may not fully work without these models

## Next Steps

- Add missing Prisma models (ProjectUpdate, ProjectTaskSubscriber, ProjectTaskDependency) as a gap closure phase
- Re-run demo data seeder after models are added to populate conversations and dependencies
- Complete human verification checkpoint after gaps are addressed

---

_Phase: 21-project-management_
_Completed: 2026-02-12_
