---
phase: 04-core-entities
plan: 08
subsystem: campaigns
tags: [campaign, segment, assignment, disclosure, attestation, survey, query-builder]

# Dependency graph
requires:
  - phase: 04-02
    provides: Person-Employee linkage for targeting
provides:
  - Campaign, Segment, CampaignAssignment models
  - SegmentQueryBuilder for JSON criteria to Prisma conversion
  - CampaignsModule with full CRUD and lifecycle management
  - Assignment generation with employee snapshots
affects: [05-ai-infrastructure, 06-disclosures, 07-policy-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Query builder pattern for segment criteria
    - Employee snapshot pattern for audit trail
    - Campaign lifecycle state machine

key-files:
  created:
    - apps/backend/src/modules/campaigns/campaigns.module.ts
    - apps/backend/src/modules/campaigns/campaigns.service.ts
    - apps/backend/src/modules/campaigns/campaigns.controller.ts
    - apps/backend/src/modules/campaigns/targeting/segment-query.builder.ts
    - apps/backend/src/modules/campaigns/targeting/segment.service.ts
    - apps/backend/src/modules/campaigns/assignments/campaign-assignment.service.ts
    - apps/backend/src/modules/campaigns/dto/segment-criteria.dto.ts
    - apps/backend/src/modules/campaigns/dto/create-campaign.dto.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/app.module.ts

key-decisions:
  - "Query builder converts JSON criteria to Prisma where clauses for segment targeting"
  - "Employee snapshots captured at assignment time for audit trail integrity"
  - "Campaign statistics denormalized for performance (total/completed/overdue counts)"

patterns-established:
  - "Segment criteria: nested AND/OR conditions with field/operator/value structure"
  - "Campaign lifecycle: DRAFT -> SCHEDULED/ACTIVE -> PAUSED -> COMPLETED/CANCELLED"
  - "Assignment status flow: PENDING -> NOTIFIED -> IN_PROGRESS -> COMPLETED/OVERDUE/SKIPPED"

# Metrics
duration: 14min
completed: 2026-02-03
---

# Phase 4 Plan 8: Campaign and Segment-Based Targeting Summary

**Campaign entities with segment query builder for outbound compliance requests (disclosures, attestations, surveys)**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-03T09:38:03Z
- **Completed:** 2026-02-03T09:51:49Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Campaign, Segment, CampaignAssignment models with full enum support
- SegmentQueryBuilder converts JSON criteria to Prisma where clauses with nested AND/OR support
- Campaign lifecycle management (draft, launch, pause, resume, cancel, complete)
- Assignment generation captures employee snapshots for historical accuracy

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Campaign, Segment, CampaignAssignment models to Prisma** - `a5dd2fb` (feat)
2. **Task 2: Create segment query builder and services** - `2dda043` (feat)
3. **Task 3: Create CampaignsModule with assignment service** - `b39ac34` (feat)

## Files Created/Modified

- `apps/backend/prisma/schema.prisma` - Campaign, Segment, CampaignAssignment models with enums
- `apps/backend/src/modules/campaigns/targeting/segment-query.builder.ts` - JSON criteria to Prisma converter
- `apps/backend/src/modules/campaigns/targeting/segment.service.ts` - Segment CRUD with audience preview
- `apps/backend/src/modules/campaigns/assignments/campaign-assignment.service.ts` - Assignment lifecycle
- `apps/backend/src/modules/campaigns/campaigns.service.ts` - Campaign CRUD and launch logic
- `apps/backend/src/modules/campaigns/campaigns.controller.ts` - REST endpoints
- `apps/backend/src/modules/campaigns/campaigns.module.ts` - Module definition
- `apps/backend/src/modules/campaigns/dto/segment-criteria.dto.ts` - Segment criteria DTOs
- `apps/backend/src/modules/campaigns/dto/create-campaign.dto.ts` - Campaign DTOs
- `apps/backend/src/app.module.ts` - Register CampaignsModule

## Decisions Made

1. **Query builder pattern for segments** - SegmentQueryBuilder converts JSON criteria to Prisma where clauses, supporting nested AND/OR groups with 16+ operators
2. **Employee snapshot at assignment** - CampaignAssignment stores employeeSnapshot JSON capturing employee state at assignment time for audit trail integrity
3. **Denormalized campaign statistics** - totalAssignments, completedAssignments, overdueAssignments, completionPercentage stored on Campaign for performance
4. **Three audience modes** - SEGMENT (query builder), MANUAL (explicit IDs), ALL (all active employees)
5. **Added audit entity types** - SEGMENT, CAMPAIGN, CAMPAIGN_ASSIGNMENT added to AuditEntityType enum

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Campaign infrastructure ready for disclosure/attestation module integration
- Segment query builder enables dynamic audience targeting
- Assignment tracking provides foundation for reminder scheduling and notification delivery

---
*Phase: 04-core-entities*
*Completed: 2026-02-03*
