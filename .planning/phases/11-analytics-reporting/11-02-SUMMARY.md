---
phase: 11
plan: 02
subsystem: analytics
tags:
  - my-work
  - task-aggregation
  - unified-queue
  - rest-api

dependency_graph:
  requires:
    - "04 (Core Entities - Cases, Investigations)"
    - "06 (Case Management - Remediation)"
    - "09 (Campaigns & Disclosures - ConflictAlert)"
  provides:
    - "Unified My Work task queue API"
    - "Priority-weighted task sorting"
    - "Task counts by type for dashboard widgets"
  affects:
    - "11-03 (Dashboard builder - may embed My Work widget)"
    - "11-04 (AI Query - task-related queries)"

tech_stack:
  added: []
  patterns:
    - "Task aggregation via parallel fetch with Promise.all"
    - "Composite task IDs (type-entityId)"
    - "Priority-weighted due date sorting"

file_tracking:
  created:
    - "apps/backend/src/modules/analytics/my-work/entities/unified-task.entity.ts"
    - "apps/backend/src/modules/analytics/my-work/dto/my-work.dto.ts"
    - "apps/backend/src/modules/analytics/my-work/dto/index.ts"
    - "apps/backend/src/modules/analytics/my-work/entities/index.ts"
    - "apps/backend/src/modules/analytics/my-work/task-aggregator.service.ts"
    - "apps/backend/src/modules/analytics/my-work/my-work.controller.ts"
    - "apps/backend/src/modules/analytics/my-work/my-work.module.ts"
    - "apps/backend/src/modules/analytics/my-work/index.ts"
    - "apps/backend/src/modules/analytics/analytics.module.ts"
    - "apps/backend/src/modules/analytics/index.ts"
  modified: []

decisions:
  - id: "11-02-D1"
    decision: "Composite task IDs use format {type}-{entityId} for uniqueness"
    rationale: "Allows parsing task type for routing while maintaining unique identifiers"
  - id: "11-02-D2"
    decision: "Snooze functionality logged but not persisted yet"
    rationale: "Full implementation requires user_task_preferences table; deferred to future plan"
  - id: "11-02-D3"
    decision: "Claim only supports cases initially"
    rationale: "Cases have clear unassigned state (NEW); other entities need more complex assignment logic"

metrics:
  duration: "25 min"
  completed: "2026-02-05"
---

# Phase 11 Plan 02: My Work Task Aggregation Summary

**One-liner:** TaskAggregatorService unifies tasks from Cases, Investigations, Remediation, Disclosures, Campaigns into priority-weighted sortable queue.

## What Was Built

### UnifiedTask Entity (160 lines)
- `TaskType` enum: case_assignment, investigation_step, remediation_task, disclosure_review, campaign_response, approval_request
- `TaskPriority` enum with PRIORITY_WEIGHTS constant for sorting algorithm
- `TaskStatus` enum: pending, in_progress, overdue
- `UnifiedTask` interface with full task representation including metadata, navigation URL, and context fields

### My Work DTOs (310 lines)
- `MyWorkQueryDto`: pagination, type/priority/status filters, date range, sort/group options
- `TaskFiltersDto`: reusable filter structure for service layer
- Action DTOs: `MarkCompleteDto`, `SnoozeTaskDto`, `ReassignTaskDto`
- Response DTOs: `MyWorkResponseDto`, `TaskCountsResponseDto`, `UnifiedTaskResponseDto`

### TaskAggregatorService (945 lines)
- **getMyTasks()**: Fetches from 6 entity types in parallel using Promise.all
  - Cases (assigned to user)
  - Investigations (primary investigator)
  - Remediation steps (assignee)
  - Conflict alerts (org-level disclosure reviews)
  - Campaign assignments (employee)
  - Workflow instances (approvals)
- **getAvailableTasks()**: Unassigned cases user can claim
- **getTaskCounts()**: Counts per type for dashboard widgets
- **sortByPriorityDueDate()**: Overdue first, then priority-weighted score (time_until_due / priority_weight)
- Transform methods convert each entity type to UnifiedTask format

### MyWorkController (446 lines)
- `GET /api/v1/my-work` - Returns sections: My Tasks + Available
- `GET /api/v1/my-work/counts` - Task counts by type
- `POST /api/v1/my-work/:taskId/complete` - Routes to appropriate service
- `POST /api/v1/my-work/:taskId/snooze` - Logs action (TODO: persist)
- `POST /api/v1/my-work/:taskId/claim` - Claims unassigned cases
- parseTaskId() helper extracts type and entityId from composite ID

## Implementation Details

### Priority-Weighted Sorting Algorithm
```typescript
// Overdue items always first
// Then: score = (time_until_due) / priority_weight
// Lower score = more urgent
const priorityWeight = { high: 3, medium: 2, low: 1 };
const score = dueDate
  ? (dueDate.getTime() - now.getTime()) / PRIORITY_WEIGHTS[priority]
  : Infinity;
```

This means a HIGH priority task due in 3 days (score = 3 days / 3 = 1) beats a LOW priority task due in 1 day (score = 1 day / 1 = 1) - they're equal, so HIGH priority wins the tie-breaker.

### Entity to Task Mapping
| Entity | Task Type | Priority Source | Due Date Source |
|--------|-----------|-----------------|-----------------|
| Case | case_assignment | severity | null (no SLA yet) |
| Investigation | investigation_step | slaStatus | dueDate |
| RemediationStep | remediation_task | MEDIUM (fixed) | dueDate |
| ConflictAlert | disclosure_review | severity | null |
| CampaignAssignment | campaign_response | MEDIUM | dueDate |
| WorkflowInstance | approval_request | slaStatus | dueDate |

## Verification

- [x] TypeScript compiles without errors in my-work module
- [x] ESLint passes (0 errors, warnings from pre-existing code)
- [x] TaskAggregatorService fetches from all 6 entity types
- [x] Priority-weighted sorting implemented per CONTEXT.md spec
- [x] MyWorkController exposes all endpoints

## Commits

| Hash | Message |
|------|---------|
| 2c3e294 | feat(11-02): add UnifiedTask entity and My Work DTOs |
| c0d5564 | feat(11-02): implement TaskAggregatorService |
| 9aa1213 | feat(11-02): add MyWorkController and AnalyticsModule |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for:**
- Dashboard builder can embed My Work widget
- AI Query can query task data
- Frontend can consume /api/v1/my-work endpoints

**Note:** AnalyticsModule needs to be registered in AppModule to expose endpoints. This should be done as part of 11-01 (Dashboard Infrastructure) or a subsequent integration plan.
