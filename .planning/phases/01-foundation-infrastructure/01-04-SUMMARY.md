---
phase: 01-foundation-infrastructure
plan: 04
subsystem: workflow
tags: [workflow, state-machine, dag, sla, transitions, versioning]

# Dependency graph
requires:
  - phase: 01-01
    provides: EventEmitter2 for workflow events
  - phase: 01-02
    provides: Job queue infrastructure (future SLA jobs)
  - phase: 01-03
    provides: AuditService for workflow audit logging
provides:
  - WorkflowTemplate model with versioned pipeline definitions
  - WorkflowInstance model tracking entity progress
  - WorkflowEngineService for transition logic
  - REST API for template CRUD and instance management
  - Workflow events (created, transitioned, completed, cancelled, paused, resumed)
affects: [cases, investigations, disclosures, policies, campaigns]

# Tech tracking
tech-stack:
  added: []
  patterns: [version-on-publish, stage-gates, event-driven-workflow]

key-files:
  created:
    - apps/backend/prisma/migrations/20260203020618_add_workflow_models/migration.sql
    - apps/backend/src/modules/workflow/workflow.module.ts
    - apps/backend/src/modules/workflow/workflow.service.ts
    - apps/backend/src/modules/workflow/workflow.controller.ts
    - apps/backend/src/modules/workflow/engine/workflow-engine.service.ts
    - apps/backend/src/modules/workflow/types/workflow.types.ts
    - apps/backend/src/modules/workflow/events/workflow.events.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/app.module.ts

key-decisions:
  - "Instances locked to template VERSION - in-flight items complete on their version"
  - "Event-driven architecture - workflow emits events for audit and notification integration"
  - "Stage gates placeholder implementation - full validation in future iteration"
  - "Versioning on publish - creates new version if active instances exist"

patterns-established:
  - "Version-on-publish: When template with active instances is updated, new version created, old deactivated"
  - "Event emission pattern: Try-catch wrapped, failures logged not thrown"
  - "Stage gate pattern: Validate before transition, block with error message"
  - "Polymorphic entity reference: entityType + entityId for any workflow-enabled entity"

# Metrics
duration: 24min
completed: 2026-02-03
---

# Phase 1 Plan 4: Workflow Engine Summary

**Configurable workflow engine with versioned templates, stage transitions, SLA tracking, and event-driven architecture**

## Performance

- **Duration:** 24 min
- **Started:** 2026-02-03T02:01:53Z
- **Completed:** 2026-02-03T02:25:28Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- WorkflowTemplate model supporting versioned pipeline definitions with stages, transitions, and SLA configuration
- WorkflowInstance model tracking entity progress through pipelines, locked to specific template version
- WorkflowEngineService with startWorkflow, transition, complete, cancel, pause, resume operations
- Full REST API for template CRUD and instance lifecycle management
- Event emission on all workflow state changes for audit and notification integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Workflow Prisma models** - `61b1bac` (feat)
2. **Task 2: Create WorkflowEngineService with transition logic** - `e23d9cc` (feat)
3. **Task 3: Create WorkflowModule and Controller** - `332c8a5` (feat)

## Files Created/Modified

- `apps/backend/prisma/schema.prisma` - Added WorkflowTemplate, WorkflowInstance, enums
- `apps/backend/prisma/migrations/20260203020618_add_workflow_models/migration.sql` - Database migration
- `apps/backend/src/modules/workflow/workflow.module.ts` - Module exporting engine and service
- `apps/backend/src/modules/workflow/workflow.service.ts` - Template CRUD with versioning
- `apps/backend/src/modules/workflow/workflow.controller.ts` - REST API endpoints
- `apps/backend/src/modules/workflow/engine/workflow-engine.service.ts` - Core transition logic
- `apps/backend/src/modules/workflow/types/workflow.types.ts` - TypeScript interfaces
- `apps/backend/src/modules/workflow/events/workflow.events.ts` - Event classes
- `apps/backend/src/modules/workflow/dto/*.ts` - Validation DTOs
- `apps/backend/src/app.module.ts` - Registered WorkflowModule

## Decisions Made

1. **Instances locked to template VERSION** - When workflow starts, it locks to current template version. Template updates create new versions; in-flight instances complete on their original version.

2. **Event-driven architecture** - Workflow emits events (workflow.instance_created, workflow.transitioned, workflow.completed, etc.) enabling loose coupling with audit, notifications, and analytics.

3. **Stage gates placeholder** - Gate validation (required_fields, approval, condition, time) has placeholder implementation. Full validation logic deferred to feature modules.

4. **SLA tracking at instance level** - Each instance has dueDate and slaStatus. Stage-level SLAs update due date on transition.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **Migration conflict** - Previous migration (add_attachment_rls) had already applied RLS policies but was not marked complete. Resolved by running `prisma migrate resolve --applied`.

2. **Pre-existing build errors** - Build fails due to unrelated errors in search.service.ts and jobs.module.ts from previous development. Workflow module compiles correctly (verified via tsc --noEmit).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Workflow engine ready for integration with Cases, Investigations, Disclosures, Policies
- Domain modules can start workflows on entity creation
- Template library (Ethico best practices) can be seeded in Phase 2
- SLA breach detection and escalation jobs ready to implement in future plans

---
*Phase: 01-foundation-infrastructure*
*Completed: 2026-02-03*
