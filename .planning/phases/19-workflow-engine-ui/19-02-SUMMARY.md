---
phase: 19-workflow-engine-ui
plan: 02
subsystem: ui
tags: [react, typescript, xyflow, react-query, tanstack-query, workflow]

# Dependency graph
requires:
  - phase: 19-01
    provides: Backend workflow UI support endpoints (clone, versions, list instances)
provides:
  - "@xyflow/react package installed for workflow canvas"
  - "Comprehensive TypeScript types for workflow entities"
  - "API service covering all workflow endpoints"
  - "React Query hooks for data fetching and mutations"
  - "Workflows navigation entry in admin sidebar"
affects: [19-03, 19-04, 19-05, 19-06, 19-07]

# Tech tracking
tech-stack:
  added: ["@xyflow/react@12.10.0"]
  patterns:
    - "Query key factory pattern for cache management"
    - "Service layer abstraction for API calls"
    - "React Query hooks wrapping service functions"

key-files:
  created:
    - "apps/frontend/src/types/workflow.ts"
  modified:
    - "apps/frontend/package.json"
    - "apps/frontend/src/services/workflows.ts"
    - "apps/frontend/src/hooks/use-workflows.ts"
    - "apps/frontend/src/lib/navigation.ts"

key-decisions:
  - "Used query key factory for organized cache invalidation"
  - "Stale time: 30s for templates, 15s for instances (more dynamic)"
  - "Added Workflows as first item in admin nav for visibility"

patterns-established:
  - "workflowQueryKeys factory for all workflow cache keys"
  - "Comprehensive mutation hooks with proper cache invalidation"

# Metrics
duration: 13min
completed: 2026-02-11
---

# Phase 19 Plan 02: Frontend Foundation Summary

**Installed @xyflow/react and created complete TypeScript types, API service, React Query hooks, and navigation entry for Workflow Engine UI**

## Performance

- **Duration:** 13 min
- **Started:** 2026-02-11T22:11:27Z
- **Completed:** 2026-02-11T22:24:05Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Installed @xyflow/react for workflow canvas (used in Plan 04)
- Created comprehensive TypeScript types matching backend models (WorkflowTemplate, WorkflowInstance, stages, steps, transitions)
- Built API service with all workflow endpoints (templates CRUD, instances lifecycle, transitions)
- Created React Query hooks for cached data fetching and mutations
- Added Workflows to admin sidebar navigation for SYSTEM_ADMIN and COMPLIANCE_OFFICER roles

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @xyflow/react and create TypeScript types** - `4bc3a7b` (feat)
2. **Task 2: API service, hooks, navigation** - `9db917d` (feat, from plan 19-01)

Note: Task 2 artifacts were pre-committed in plan 19-01 as part of backend endpoint work.

## Files Created/Modified

- `apps/frontend/package.json` - Added @xyflow/react dependency
- `apps/frontend/src/types/workflow.ts` - Complete workflow type definitions (620+ lines)
- `apps/frontend/src/services/workflows.ts` - API client for all workflow endpoints
- `apps/frontend/src/hooks/use-workflows.ts` - React Query hooks (18 hooks total)
- `apps/frontend/src/lib/navigation.ts` - Added Workflows nav item

## Types Created

### Enums/Unions
- `WorkflowEntityType`: CASE, INVESTIGATION, DISCLOSURE, POLICY, CAMPAIGN
- `WorkflowInstanceStatus`: ACTIVE, COMPLETED, CANCELLED, PAUSED
- `SlaStatus`: ON_TRACK, WARNING, OVERDUE
- `StepStatus`: pending, in_progress, completed, skipped, failed
- `AssigneeStrategy`: 7 assignment strategies (specific_user, round_robin, etc.)

### Entities
- `WorkflowStage` - Stage with steps, gates, SLA
- `WorkflowStep` - Step configuration with type, config, assignee strategy
- `StageGate` - Transition gates (required_fields, approval, condition, time)
- `WorkflowTransition` - Stage transitions with conditions and actions
- `WorkflowTemplate` - Full template definition
- `WorkflowInstance` - Running workflow instance

### DTOs
- `CreateWorkflowTemplateDto`, `UpdateWorkflowTemplateDto`
- `StartWorkflowDto`, `TransitionDto`

### Display Helpers
- Labels and color classes for statuses, entity types, SLA

## API Endpoints Covered

### Templates
- `listTemplates(params?)` - GET /workflows/templates
- `getTemplate(id)` - GET /workflows/templates/:id
- `getDefaultTemplate(entityType)` - GET /workflows/templates/default/:entityType
- `createTemplate(dto)` - POST /workflows/templates
- `updateTemplate(id, dto)` - PATCH /workflows/templates/:id
- `deleteTemplate(id)` - DELETE /workflows/templates/:id
- `cloneTemplate(id)` - POST /workflows/templates/:id/clone
- `getTemplateVersions(id)` - GET /workflows/templates/:id/versions

### Instances
- `listInstances(params?)` - GET /workflows/instances
- `getInstance(id)` - GET /workflows/instances/:id
- `getInstanceByEntity(entityType, entityId)` - GET /workflows/entity/:entityType/:entityId
- `getAllowedTransitions(instanceId)` - GET /workflows/instances/:id/transitions
- `startWorkflow(dto)` - POST /workflows/instances
- `transitionInstance(id, dto)` - POST /workflows/instances/:id/transition
- `completeInstance(id, outcome?)` - POST /workflows/instances/:id/complete
- `cancelInstance(id, reason?)` - POST /workflows/instances/:id/cancel
- `pauseInstance(id, reason?)` - POST /workflows/instances/:id/pause
- `resumeInstance(id)` - POST /workflows/instances/:id/resume

## React Query Hooks

### Query Hooks
- `useWorkflowTemplates(params?)` - List templates
- `useWorkflowTemplate(id)` - Get single template
- `useDefaultWorkflowTemplate(entityType)` - Get default for entity type
- `useWorkflowTemplateVersions(id)` - Get version history
- `useWorkflowInstances(params?)` - List instances
- `useWorkflowInstance(id)` - Get single instance
- `useWorkflowInstanceByEntity(entityType, entityId)` - Get by entity
- `useAllowedTransitions(instanceId)` - Get available transitions

### Mutation Hooks
- `useCreateTemplate()` - Create new template
- `useUpdateTemplate()` - Update template
- `useDeleteTemplate()` - Delete template
- `useCloneTemplate()` - Clone template
- `useStartWorkflow()` - Start instance
- `useTransitionInstance()` - Transition stage
- `useCompleteInstance()` - Complete workflow
- `useCancelInstance()` - Cancel workflow
- `usePauseInstance()` - Pause workflow
- `useResumeInstance()` - Resume workflow

## Decisions Made

- **Query key factory pattern**: Using `workflowQueryKeys` object with methods for consistent cache key generation
- **Stale times**: 30s for templates (rarely change), 15s for instances (more dynamic)
- **Navigation placement**: Workflows added as first admin item for visibility
- **Type safety**: Full type coverage including display helpers for UI components

## Deviations from Plan

None - plan executed as written. Task 2 artifacts were pre-committed in plan 19-01 which handled backend endpoints.

## Issues Encountered

- Git lock file from interrupted lint-staged process - resolved by removing .git/index.lock
- Discovered Task 2 artifacts already committed in plan 19-01 - verified content matches requirements

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All frontend foundation pieces in place for Plans 03-07
- @xyflow/react ready for workflow builder canvas (Plan 04)
- Types, service, and hooks available for all UI components
- Navigation entry will show Workflows for admin users

---
*Phase: 19-workflow-engine-ui*
*Plan: 02*
*Completed: 2026-02-11*
