---
phase: 10
plan: 02
subsystem: policy-management
tags: [nestjs, service, controller, crud, versioning, events]
dependency-graph:
  requires: [10-01]
  provides: [PoliciesService, PoliciesController, Policy events, Policy CRUD endpoints]
  affects: [10-03, 10-04, 10-05, 10-06, 10-07, 10-08, 10-09, 10-10, 10-11]
tech-stack:
  added: []
  patterns: [version-on-publish, draft-management, slug-generation, event-driven]
key-files:
  created:
    - apps/backend/src/modules/policies/policies.controller.ts
    - apps/backend/src/modules/policies/events/policy.events.ts
  modified:
    - apps/backend/src/modules/policies/policies.service.ts
    - apps/backend/src/modules/policies/policies.module.ts
    - apps/backend/src/modules/policies/index.ts
    - apps/backend/src/app.module.ts
    - apps/backend/src/modules/policies/listeners/workflow.listener.ts
decisions:
  - title: "No updatedById on Policy model"
    choice: "Rely on Prisma's @updatedAt for timestamp tracking"
    rationale: "Policy model uses createdById only; updatedAt is auto-managed by Prisma"
  - title: "SYSTEM category for workflow actions"
    choice: "Use AuditActionCategory.SYSTEM instead of non-existent WORKFLOW"
    rationale: "WORKFLOW category doesn't exist in enum; SYSTEM is appropriate for automated workflow events"
metrics:
  duration: 28 min
  completed: 2026-02-05
---

# Phase 10 Plan 02: Policy Service CRUD Summary

PoliciesService with version-on-publish pattern, draft management, and REST API endpoints for complete policy lifecycle management.

## Objective Achieved

Created the core policy management service with:
- CRUD operations for policies with draft/published lifecycle
- Version-on-publish pattern creating immutable PolicyVersions
- Slug generation for URL-friendly identifiers
- Event emission for all mutations
- REST controller with role-based access control

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Policy events and PoliciesService | (pre-existing) | policy.events.ts, policies.service.ts, workflow.listener.ts |
| 2 | Create PoliciesController with REST endpoints | ea186ef | policies.controller.ts |
| 3 | Register PoliciesModule in app | 1ae13b5 | policies.module.ts, index.ts, app.module.ts |

## Implementation Details

### Events Created (policy.events.ts)

Five event classes extending BaseEvent:
- **PolicyCreatedEvent**: policyId, title, ownerId
- **PolicyUpdatedEvent**: policyId, changes (record of old/new values)
- **PolicyPublishedEvent**: policyId, policyVersionId, version number
- **PolicyRetiredEvent**: policyId
- **PolicyStatusChangedEvent**: policyId, fromStatus, toStatus

### Service Methods (policies.service.ts)

**CRUD Operations:**
- `create(dto, userId, orgId)`: Creates DRAFT policy with slug generation
- `findById(id, orgId)`: Returns policy with latest version, null if not found
- `findByIdOrFail(id, orgId)`: Returns policy or throws NotFoundException
- `findAll(query, orgId)`: Paginated list with filters (status, policyType, ownerId, search)
- `updateDraft(policyId, dto, userId, orgId)`: Updates draft, blocks if PENDING_APPROVAL

**Publishing:**
- `publish(policyId, dto, userId, orgId)`: Creates immutable PolicyVersion in transaction
  - Marks previous versions as isLatest=false
  - Extracts plainText from HTML for search indexing
  - Clears draftContent after publish
  - Increments currentVersion

**Lifecycle:**
- `retire(policyId, userId, orgId)`: Sets status to RETIRED with retiredAt timestamp
- `getVersions(policyId, orgId)`: Returns all versions ordered by version DESC
- `getVersion(versionId, orgId)`: Returns specific version with policy relation

**Helpers:**
- `generateSlug(title, orgId, excludeId?)`: Unique slug with counter suffix if needed
- `extractPlainText(html)`: Strips HTML tags, decodes entities, collapses whitespace
- `emitEvent(name, event)`: Safe event emission with error logging

### Controller Endpoints (policies.controller.ts)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | /policies | ADMIN, COMPLIANCE, AUTHOR | Create policy |
| GET | /policies | All authenticated | List with filtering |
| GET | /policies/:id | All authenticated | Get single policy |
| PUT | /policies/:id | ADMIN, COMPLIANCE, AUTHOR | Update draft |
| POST | /policies/:id/publish | ADMIN, COMPLIANCE | Publish as new version |
| POST | /policies/:id/retire | ADMIN, COMPLIANCE | Retire policy |
| GET | /policies/:id/versions | All authenticated | Get version history |
| GET | /policies/versions/:versionId | All authenticated | Get specific version |

### Module Configuration

```typescript
@Module({
  imports: [PrismaModule, ActivityModule, WorkflowModule],
  controllers: [PoliciesController, PolicyApprovalController],
  providers: [PoliciesService, PolicyApprovalService, PolicyWorkflowListener],
  exports: [PoliciesService, PolicyApprovalService],
})
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed AuditActionCategory.WORKFLOW reference**
- **Found during:** Task 1
- **Issue:** workflow.listener.ts used non-existent `AuditActionCategory.WORKFLOW`
- **Fix:** Changed to `AuditActionCategory.SYSTEM` with comment
- **Files modified:** workflow.listener.ts
- **Commit:** (part of Task 1 verification)

**2. [Rule 1 - Bug] Removed updatedById field references**
- **Found during:** Task 1
- **Issue:** Policy model doesn't have updatedById field (uses auto @updatedAt)
- **Fix:** Removed updatedById from all Prisma update operations
- **Files modified:** policies.service.ts

## Verification Results

- `npm run build` succeeds (excluding unrelated untracked analytics files)
- PoliciesService has all required methods: create, findById, findAll, updateDraft, publish, retire, getVersions, getVersion
- Controller has all endpoints with proper role guards
- Events emitted on create, update, publish, retire
- PoliciesModule registered in AppModule and exports PoliciesService

## Next Phase Readiness

Phase 10-03 (Policy Approval Workflow) can proceed:
- PoliciesService available for approval workflow integration
- PolicyStatusChangedEvent ready for workflow listeners
- PENDING_APPROVAL status check in updateDraft prevents concurrent edits
- PolicyApprovalService and PolicyApprovalController already exist and are wired
