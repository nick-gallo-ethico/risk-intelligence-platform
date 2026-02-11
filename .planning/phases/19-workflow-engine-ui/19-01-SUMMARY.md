---
phase: 19-workflow-engine-ui
plan: 01
subsystem: api
tags: [nestjs, workflow, rest-api, pagination]

# Dependency graph
requires:
  - phase: 01-foundation-infrastructure
    provides: NestJS backend structure, guards, decorators
  - phase: 05-ai-infrastructure
    provides: Workflow template CRUD and instance lifecycle
provides:
  - GET /workflows/instances with filters (templateId, status, entityType) and pagination
  - POST /workflows/templates/:id/clone for template duplication
  - GET /workflows/templates/:id/versions for version history
  - GET /workflows/templates with _instanceCount enrichment
affects: [19-workflow-engine-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Paginated list endpoint pattern with DTO validation
    - Template clone pattern (copy with draft state)
    - Version history via name matching
    - Count enrichment using Prisma groupBy

key-files:
  created:
    - apps/backend/src/modules/workflow/dto/list-instances.dto.ts
  modified:
    - apps/backend/src/modules/workflow/dto/index.ts
    - apps/backend/src/modules/workflow/workflow.service.ts
    - apps/backend/src/modules/workflow/workflow.controller.ts

key-decisions:
  - "Instance list uses simple where filters, not Elasticsearch (small dataset per org)"
  - "Clone sets isActive=false to create draft requiring explicit publish"
  - "Version history matches by template name (same name = same workflow family)"
  - "Instance counts only include ACTIVE status (not COMPLETED/CANCELLED)"

patterns-established:
  - "Paginated response pattern: { data, total, page, limit }"
  - "Clone pattern: copy with (Copy) suffix, reset version, set draft state"

# Metrics
duration: 14min
completed: 2026-02-11
---

# Phase 19 Plan 01: Workflow UI Backend Endpoints Summary

**Four new REST endpoints added to WorkflowController: list instances with filters/pagination, clone template, version history, and template list with instance counts**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-11T22:08:27Z
- **Completed:** 2026-02-11T22:23:20Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- GET /workflows/instances endpoint with optional filters (templateId, status, entityType) and pagination
- POST /workflows/templates/:id/clone creates draft copy with "(Copy)" suffix
- GET /workflows/templates/:id/versions returns all versions ordered by version desc
- GET /workflows/templates now includes \_instanceCount for each template

## Task Commits

Each task was committed atomically:

1. **Task 1: Add list instances, clone, and version history endpoints** - `9db917d` (feat)

**Plan metadata:** See docs commit below

## Files Created/Modified

- `apps/backend/src/modules/workflow/dto/list-instances.dto.ts` - New DTO for instance list query params
- `apps/backend/src/modules/workflow/dto/index.ts` - Export new DTO
- `apps/backend/src/modules/workflow/workflow.service.ts` - listInstances(), clone(), findVersions(), findAllWithCounts() methods
- `apps/backend/src/modules/workflow/workflow.controller.ts` - Four new endpoints with proper route ordering

## Decisions Made

- **Instance list filtering:** Used simple Prisma where clause rather than Elasticsearch - workflow instances are scoped to organization and typically small dataset
- **Clone behavior:** New template starts as draft (isActive=false) requiring explicit publish
- **Version matching:** Versions identified by same template name within organization
- **Count filtering:** Only ACTIVE instances counted (completed/cancelled excluded from count)
- **Route ordering:** Placed `/versions` and `/instances` endpoints before `:id` routes to avoid NestJS route conflicts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-commit hooks with lint-staged caused stash restore to include unrelated files. Resolved by restoring workflow files from HEAD after commit verification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend endpoints ready for UI consumption in plans 02-07
- All four must-haves verified:
  - GET /workflows/instances returns paginated list
  - POST /templates/:id/clone creates copy with "(Copy)" name
  - GET /templates/:id/versions returns version history
  - GET /templates includes \_instanceCount

---

_Phase: 19-workflow-engine-ui_
_Completed: 2026-02-11_
