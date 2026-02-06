---
phase: 12-internal-operations-portal
plan: 10
title: "Hotline Operations Services"
subsystem: hotline-ops
tags: [directives, qa-queue, operator-status, bulk-actions, cross-tenant]

# Dependency Graph
requires: [12-01]
provides:
  - DirectiveAdminService
  - BulkQaService
  - OperatorStatusService
  - HotlineOpsModule
affects: [12-11, 12-12]

# Tech Stack
tech-stack:
  patterns:
    - Cross-tenant service pattern
    - Cache-based real-time status
    - Bulk action with error collection

# Files
key-files:
  created:
    - apps/backend/src/modules/operations/hotline-ops/dto/hotline-ops.dto.ts
    - apps/backend/src/modules/operations/hotline-ops/types/operator-status.types.ts
    - apps/backend/src/modules/operations/hotline-ops/directive-admin.service.ts
    - apps/backend/src/modules/operations/hotline-ops/bulk-qa.service.ts
    - apps/backend/src/modules/operations/hotline-ops/operator-status.service.ts
    - apps/backend/src/modules/operations/hotline-ops/hotline-ops.controller.ts
    - apps/backend/src/modules/operations/hotline-ops/hotline-ops.module.ts
    - apps/backend/src/modules/operations/hotline-ops/index.ts
  modified:
    - apps/backend/src/modules/operations/operations.module.ts
    - apps/backend/src/modules/operations/index.ts

# Metrics
metrics:
  duration: "22 min"
  completed: "2026-02-06"
---

# Phase 12 Plan 10: Hotline Operations Services Summary

Hotline operations services for directive management, bulk QA, and real-time operator status tracking with cross-tenant capabilities.

## What Was Built

### DirectiveAdminService
Cross-tenant directive management for internal Ethico staff:
- **createDirective**: Create directives with optional draft mode for client-submitted scripts
- **updateDirective**: Update with version tracking and audit logging
- **deleteDirective**: Soft delete (isActive = false)
- **listAllDirectives**: Global view across all tenants with filtering
- **getPendingDrafts**: Queue of client drafts awaiting Ethico approval
- **approveAndPublish** flag enables Ethico to publish client drafts

### BulkQaService
Bulk QA operations on hotline RIUs:
- **getGlobalQaQueue**: Fetches across all tenants, sorted by age (FIFO)
- **performBulkAction**: APPROVE, REJECT, REASSIGN, CHANGE_PRIORITY
  - APPROVE: Sets qaStatus to APPROVED, emits event for case creation
  - REJECT: Requires reason, sets qaStatus to REJECTED
  - REASSIGN: Changes qaReviewerId, sets status to IN_REVIEW
  - CHANGE_PRIORITY: Not supported (schema lacks priority field)
- **getReviewerMetrics**: Throughput by reviewer for date range
- **getQueueStats**: Counts by QA status for dashboard

### OperatorStatusService
Cache-based real-time operator status:
- **updateStatus**: Store status with language skills in cache
- **getStatusBoard**: Returns counts by status + full operator list
- **getOperatorsByLanguage**: For skill-based call routing
- **setAvailable/setOnCall/setOffline**: Convenience methods
- 5-minute TTL with automatic stale entry cleanup

### HotlineOpsController
Internal API at `/api/v1/internal/hotline-ops`:
- `/directives`: CRUD endpoints with versioning
- `/directives/pending-drafts`: Approval queue
- `/qa-queue`: Global queue, bulk actions, stats
- `/qa-queue/reviewer-metrics`: Throughput reporting
- `/operator-status`: Real-time status board
- `/operator-status/by-language/:language`: Skill-based routing

## Commits

| Hash | Message |
|------|---------|
| 4e6e3e0 | feat(12-10): add hotline ops DTOs and operator status types |
| 6683e2c | feat(12-10): add directive admin and bulk QA services |
| 14b1579 | feat(12-10): add operator status service, controller, and module |

## Technical Decisions

### Cross-Tenant Pattern
- Services operate without tenant context (no organizationId filter)
- All operations logged to audit service with actorType: 'USER'
- Used RIU as entityType since DIRECTIVE not in AuditEntityType enum

### QA Status on RiuHotlineExtension
- QA workflow fields (qaStatus, qaReviewerId, qaReviewedAt) are on RiuHotlineExtension, not base RIU
- BulkQaService queries RiuHotlineExtension and joins to RIU for display

### Event-Driven Processing
- riu.qa.approved emitted after bulk approve for downstream case creation
- riu.qa.rejected emitted with reason for notifications

### Cache-Based Status
- OperatorStatusService uses @nestjs/cache-manager
- 5-minute TTL ensures stale statuses are cleaned up
- No database persistence for operator status (volatile by design)

## Deviations from Plan

### CHANGE_PRIORITY Not Supported
- Plan specified CHANGE_PRIORITY action for bulk QA
- RIU/RiuHotlineExtension schema lacks priority field
- Action returns error: "Priority change not supported for hotline RIUs"
- Could be added in future schema migration

## Verification Results

- [x] TypeScript compiles without errors
- [x] No lint errors in hotline-ops files
- [x] HotlineOpsModule exported from OperationsModule
- [x] DirectiveAdminService creates/updates with audit logging
- [x] approveAndPublish flag enables client draft publishing
- [x] BulkQaService performs APPROVE, REJECT, REASSIGN
- [x] Global QA queue fetches across all tenants (FIFO)
- [x] OperatorStatusService tracks real-time status in cache
- [x] getStatusBoard returns counts by status + operator list

## Next Steps

- 12-11: Add InternalUser authentication guards to controller endpoints
- 12-12: Integrate with WebSocket for real-time operator status updates
- Future: Add priority field to RIU schema to enable CHANGE_PRIORITY action
