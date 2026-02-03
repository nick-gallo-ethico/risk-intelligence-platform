---
phase: 06-case-management
plan: 03
subsystem: remediation
tags: [remediation, plan, step, template, workflow, assignment]

dependency-graph:
  requires:
    - 06-01 (Investigation models and services)
  provides:
    - RemediationPlan Prisma model
    - RemediationStep Prisma model
    - RemediationTemplate Prisma model
    - RemediationService for plan CRUD
    - RemediationStepService for step management
    - RemediationController REST endpoints
  affects:
    - 06-04 (may use remediation in saved views)
    - 07-xx (notifications for remediation assignments/due dates)

tech-stack:
  added: []
  patterns:
    - DAG dependency validation for step ordering
    - User OR email assignment for external contacts
    - Step approval workflow for compliance-critical steps
    - Template-based plan instantiation
    - Denormalized step counts for query performance

key-files:
  created:
    - apps/backend/prisma/schema.prisma (RemediationPlan, RemediationStep, RemediationTemplate models)
    - apps/backend/src/modules/remediation/dto/remediation.dto.ts
    - apps/backend/src/modules/remediation/remediation.service.ts
    - apps/backend/src/modules/remediation/remediation-step.service.ts
    - apps/backend/src/modules/remediation/remediation.controller.ts
    - apps/backend/src/modules/remediation/remediation.module.ts
    - apps/backend/src/modules/remediation/index.ts
  modified:
    - apps/backend/src/app.module.ts (added RemediationModule import)

decisions:
  - id: dep-validation
    choice: "DFS cycle detection for DAG validation"
    rationale: "Simple and effective for step dependency validation"
  - id: external-assignees
    choice: "Email + name fields for non-user assignees"
    rationale: "Allows assigning steps to external contacts without user accounts"
  - id: step-approval
    choice: "requiresCoApproval flag with separate approval workflow"
    rationale: "Compliance-critical steps need secondary verification"

metrics:
  duration: "39 minutes"
  completed: "2026-02-03"
---

# Phase 6 Plan 03: Remediation Management Summary

**One-liner:** RemediationPlan/Step models with DAG dependencies, user/email assignment, and approval workflow for post-investigation remediation tracking.

## What Was Built

### Prisma Models

**RemediationStatus enum:**
- DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED

**StepStatus enum:**
- PENDING, IN_PROGRESS, COMPLETED, SKIPPED, BLOCKED

**RemediationPlan model:**
- Links to Case with optional finding reference
- Template support for reusable plans
- Denormalized step counts (total, completed, overdue)
- Owner and due date tracking

**RemediationStep model:**
- User assignment OR external email/name assignment
- DAG dependencies via dependsOnStepIds array
- Completion evidence (attachment IDs, links as JSON)
- Co-approval workflow (requiresCoApproval flag)
- Notification tracking (reminderSentAt, escalatedAt)

**RemediationTemplate model:**
- Reusable plan configurations
- Step templates with role slugs and due day offsets
- Category-scoped templates

### Services

**RemediationService:**
- Plan CRUD operations
- Template application during creation
- Status lifecycle (activate, complete, cancel)
- Step count aggregation
- Template management

**RemediationStepService:**
- Step CRUD with DAG validation
- Dependency satisfaction checking
- Complete, approve, skip workflows
- Step reordering
- Assignee-based step lookup

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/remediation/plans | Create plan |
| GET | /api/v1/remediation/plans | List plans |
| GET | /api/v1/remediation/plans/:id | Get plan |
| GET | /api/v1/remediation/plans/by-case/:caseId | Get plans by case |
| PUT | /api/v1/remediation/plans/:id | Update plan |
| POST | /api/v1/remediation/plans/:id/activate | Activate plan |
| POST | /api/v1/remediation/plans/:id/complete | Complete plan |
| POST | /api/v1/remediation/plans/:id/cancel | Cancel plan |
| POST | /api/v1/remediation/steps | Create step |
| GET | /api/v1/remediation/steps/:id | Get step |
| PUT | /api/v1/remediation/steps/:id | Update step |
| POST | /api/v1/remediation/steps/:id/complete | Complete step |
| POST | /api/v1/remediation/steps/:id/approve | Approve step |
| POST | /api/v1/remediation/steps/:id/skip | Skip step |
| DELETE | /api/v1/remediation/steps/:id | Delete step |
| PUT | /api/v1/remediation/plans/:planId/steps/reorder | Reorder steps |
| GET | /api/v1/remediation/my-steps | Get user's assigned steps |
| POST | /api/v1/remediation/templates | Create template |
| GET | /api/v1/remediation/templates | List templates |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed investigation template controller imports**
- **Found during:** Task 3 build verification
- **Issue:** Pre-existing import path errors in investigations/templates/template.controller.ts
- **Fix:** Updated imports to use common/guards and common/decorators
- **Files modified:** apps/backend/src/modules/investigations/templates/template.controller.ts

## Verification

- [x] `npx prisma validate` passes
- [x] `npm run build` succeeds
- [x] RemediationPlan model has status enum and step counts
- [x] RemediationStep model supports user and email assignees
- [x] Step dependencies validated as DAG (no cycles)
- [x] Plans track completion independently of case status

## Commits

| Hash | Message |
|------|---------|
| 9720cf2 | feat(06-03): add Remediation DTOs and Services |
| 0b8252c | feat(06-03): add RemediationController and RemediationModule |

## Next Phase Readiness

**Ready for:**
- Notification integration (step assignment, due date reminders)
- Integration with investigation findings
- Dashboard widgets showing remediation progress
- Saved views for remediation plans

**Blockers:** None
