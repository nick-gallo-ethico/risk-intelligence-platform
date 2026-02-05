---
phase: 10-policy-management
plan: 03
subsystem: policy-approval
tags: [workflow, approval, policy, events, NestJS]

dependency-graph:
  requires: [10-01]
  provides: [policy-approval-service, policy-workflow-listener, policy-approval-endpoints]
  affects: [10-04, 10-05]

tech-stack:
  added: []
  patterns: [event-driven-workflow-integration, workflow-delegation]

key-files:
  created:
    - apps/backend/src/modules/policies/approval/policy-approval.service.ts
    - apps/backend/src/modules/policies/approval/policy-approval.controller.ts
    - apps/backend/src/modules/policies/approval/dto/approval.dto.ts
    - apps/backend/src/modules/policies/listeners/workflow.listener.ts
    - apps/backend/src/modules/policies/policies.module.ts
    - apps/backend/src/modules/policies/index.ts
  modified: []

decisions:
  - id: no-custom-approval-logic
    choice: Delegate all approval logic to WorkflowEngine
    rationale: Reuse existing Phase 1 workflow infrastructure rather than building policy-specific approval system

metrics:
  duration: 18 min
  completed: 2026-02-05
---

# Phase 10 Plan 03: Policy Approval Workflow Integration Summary

**One-liner:** Policy approval workflows integrated with WorkflowEngine - submit, cancel, status tracking via event-driven architecture.

## What Was Built

### 1. PolicyApprovalService (approval/policy-approval.service.ts)

Service that integrates policy approval with the existing WorkflowEngine:

- **submitForApproval()**: Validates policy is DRAFT with content, starts workflow instance, updates status to PENDING_APPROVAL
- **cancelApproval()**: Finds active workflow, cancels via WorkflowEngine, returns policy to DRAFT
- **getApprovalStatus()**: Returns workflow instance state, current stage, reviewers from stepStates
- **getDefaultWorkflowTemplate()**: Finds default POLICY workflow template
- **getAvailableWorkflowTemplates()**: Lists all active POLICY workflow templates

Key design: All workflow operations delegate to WorkflowEngineService - no custom approval logic.

### 2. PolicyWorkflowListener (listeners/workflow.listener.ts)

Event listener that syncs workflow events to policy status:

- **onWorkflowCompleted**: Updates policy status to APPROVED when workflow completes
- **onWorkflowCancelled**: Returns policy to DRAFT when workflow is cancelled
- **onWorkflowTransitioned**: Logs approval progress activity

All handlers:
- Check `entityType === 'POLICY'` before processing
- Wrapped in try-catch (errors logged, not thrown)
- Emit policy-specific events for downstream consumers

### 3. PolicyApprovalController (approval/policy-approval.controller.ts)

REST endpoints for approval operations:

| Endpoint | Method | Roles | Description |
|----------|--------|-------|-------------|
| `/:id/submit-for-approval` | POST | ADMIN, CCO, AUTHOR | Submit policy for approval |
| `/:id/cancel-approval` | POST | ADMIN, CCO | Cancel active approval |
| `/:id/approval-status` | GET | ADMIN, CCO, AUTHOR, REVIEWER | Get approval status |
| `/workflow-templates` | GET | ADMIN, CCO, AUTHOR | List available templates |

### 4. PoliciesModule (policies.module.ts)

Module configuration:
- Imports WorkflowModule for WorkflowEngineService access
- Provides: PoliciesService, PolicyApprovalService, PolicyWorkflowListener
- Exports: PoliciesService, PolicyApprovalService

## Event Flow

```
User submits policy for approval
         |
         v
PolicyApprovalService.submitForApproval()
         |
         v
WorkflowEngineService.startWorkflow() ---> Emits workflow.instance_created
         |
         v
Policy status = PENDING_APPROVAL
         |
         v
PolicySubmittedForApprovalEvent emitted
         .
         . (Reviewers interact via workflow)
         .
Workflow completes ---> Emits workflow.completed
         |
         v
PolicyWorkflowListener.onWorkflowCompleted()
         |
         v
Policy status = APPROVED
         |
         v
PolicyApprovedEvent emitted
```

## Verification Completed

- [x] `npm run build` succeeds
- [x] submitForApproval() calls WorkflowEngineService.startWorkflow()
- [x] Policy status changes to PENDING_APPROVAL on submit
- [x] workflow.completed event updates policy to APPROVED (via listener)
- [x] workflow.cancelled event returns policy to DRAFT (via listener)
- [x] Controller endpoints have proper role guards
- [x] Module imports WorkflowModule

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AuditActionCategory.WORKFLOW does not exist**
- **Found during:** Task 1 build verification
- **Issue:** Plan specified WORKFLOW category, but enum only has CREATE, UPDATE, DELETE, ACCESS, SYSTEM, SECURITY, AI
- **Fix:** Changed to AuditActionCategory.UPDATE for user-initiated workflow actions, AuditActionCategory.SYSTEM for event-driven actions
- **Files modified:** policy-approval.service.ts, workflow.listener.ts
- **Commit:** Included in task commits

## Commits

| Hash | Message |
|------|---------|
| 3ed95af | feat(10-03): add PolicyApprovalService for workflow integration |
| 746f887 | feat(10-03): add PolicyWorkflowListener for status synchronization |
| 9399a73 | feat(10-03): add PolicyApprovalController and PoliciesModule |

## Next Phase Readiness

**Ready for 10-04 (Policy Editor):**
- PoliciesService available for draft editing
- PolicyApprovalService exports available for UI integration
- Status transitions (DRAFT -> PENDING_APPROVAL -> APPROVED) working

**Dependencies for 10-05 (Publishing):**
- APPROVED status indicates policy is ready for publishing
- PolicyPublishedEvent already defined in events (from PoliciesService)
