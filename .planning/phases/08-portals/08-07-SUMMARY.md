---
phase: 08-portals
plan: 07
subsystem: operator-console
tags: [intake, qa-queue, hotline, operators, rius]
depends_on:
  requires: ["08-02", "08-03", "04-05"]
  provides: ["IntakeService", "QaQueueService", "IntakeController", "QaQueueController"]
  affects: ["08-08", "08-09"]
tech_stack:
  added: []
  patterns: ["cross-tenant-access", "qa-workflow", "event-driven"]
key_files:
  created:
    - apps/backend/src/modules/portals/operator/intake.service.ts
    - apps/backend/src/modules/portals/operator/intake.controller.ts
    - apps/backend/src/modules/portals/operator/qa-queue.service.ts
    - apps/backend/src/modules/portals/operator/qa-queue.controller.ts
    - apps/backend/src/modules/portals/operator/types/intake.types.ts
    - apps/backend/src/modules/portals/operator/types/qa-queue.types.ts
    - apps/backend/src/modules/portals/operator/dto/intake.dto.ts
  modified:
    - apps/backend/src/modules/portals/operator/operator-portal.module.ts
decisions:
  - key: "RiuTypeFromCall enum"
    choice: "REPORT, REQUEST_FOR_INFO, WRONG_NUMBER mapped to HOTLINE_REPORT RiuType"
    rationale: "All call types create HOTLINE_REPORT RIU; type distinction is for workflow/reporting"
  - key: "QA reviewer role"
    choice: "Use TRIAGE_LEAD instead of QA_REVIEWER"
    rationale: "QA_REVIEWER role doesn't exist in UserRole enum; TRIAGE_LEAD fits QA workflow"
  - key: "Follow-up notes storage"
    choice: "Use Interaction model instead of InvestigationNote"
    rationale: "Interaction model is designed for follow-up contacts; InvestigationNote requires investigation"
  - key: "qaClaimedAt field"
    choice: "Return null since schema lacks qaClaimedAt"
    rationale: "Schema only has qaReviewedAt; track claim via qaReviewerId being set"
metrics:
  duration: "17 min"
  completed: "2026-02-04"
---

# Phase 8 Plan 07: Hotline Intake & QA Queue Summary

Operator Console API for hotline intake workflow and QA review management with cross-tenant support.

## What Was Built

### IntakeService (apps/backend/src/modules/portals/operator/intake.service.ts)

Complete hotline intake workflow service:

1. **createHotlineRiu()** - Create RIU from phone call
   - Validates client via ClientProfileService
   - Maps RiuTypeFromCall to RiuType (all map to HOTLINE_REPORT)
   - Generates access code for anonymous reporters
   - Creates HotlineRiuExtension with call metadata
   - Checks QA requirements via ClientProfileService.requiresQaReview()
   - Auto-approves if QA not required

2. **updateIntake()** - Update in-progress intake
   - Only allowed for PENDING/IN_REVIEW status
   - Enforces same-operator restriction

3. **submitToQa()** - Submit to QA queue
   - Sets qaStatus to PENDING
   - Emits hotline.submitted_to_qa event

4. **getOperatorQueue()** - Operator's in-progress RIUs
   - Bypasses RLS for cross-client view
   - Returns RIUs with PENDING/IN_REVIEW/NEEDS_REVISION status

5. **lookupByAccessCode()** - Follow-up call support (OPER-08)
   - Validates access code format
   - Returns FollowUpContext with case/message info
   - Emits hotline.follow_up_accessed event

6. **addFollowUpNote()** - Add follow-up call note
   - Creates Interaction record (not InvestigationNote)
   - Tracks call duration and disposition

### QaQueueService (apps/backend/src/modules/portals/operator/qa-queue.service.ts)

QA review queue management:

1. **getQaQueue()** - Paginated queue with filters
   - Sorts by severity (HIGH first), then createdAt (oldest first)
   - Filters: clientId, severityMin, operatorId, dateRange
   - Computes priority flags (HIGH_SEVERITY, RESUBMISSION)

2. **claimForReview()** - Claim item for review
   - Changes qaStatus PENDING -> IN_REVIEW
   - Sets qaReviewerId
   - Emits qa.claimed event

3. **releaseFromQa()** - Approve and release
   - Applies optional edits (summary, categoryId, severity)
   - Changes qaStatus to APPROVED
   - Emits qa.released event for downstream Case creation

4. **rejectToOperator()** - Reject back to operator
   - Requires rejection reason
   - Changes qaStatus to REJECTED
   - Emits qa.rejected event

5. **getItemDetail()** - Full item detail for review
   - Includes RIU content, call metadata, operator notes
   - Fetches QA reviewer info and attachments

6. **abandonClaim()** - Return to queue
   - Resets qaStatus to PENDING
   - Clears qaReviewerId

### Controllers

**IntakeController** endpoints:
- POST /api/v1/operator/intake
- PUT /api/v1/operator/intake/:riuId
- POST /api/v1/operator/intake/:riuId/submit-qa
- GET /api/v1/operator/my-queue
- GET /api/v1/operator/follow-up/:accessCode (rate limited: 10/min)
- POST /api/v1/operator/follow-up/:riuId/note

**QaQueueController** endpoints:
- GET /api/v1/operator/qa-queue
- POST /api/v1/operator/qa-queue/:riuId/claim
- GET /api/v1/operator/qa-queue/:riuId
- POST /api/v1/operator/qa-queue/:riuId/release
- POST /api/v1/operator/qa-queue/:riuId/reject
- POST /api/v1/operator/qa-queue/:riuId/abandon

### Types & DTOs

**Intake Types:**
- RiuTypeFromCall: REPORT | REQUEST_FOR_INFO | WRONG_NUMBER
- IntakeResult: riuId, referenceNumber, accessCode, requiresQa, qaStatus
- IntakeSummary: queue item for operator
- FollowUpContext: context for follow-up calls
- FollowUpDisposition: CALLBACK_SCHEDULED | INFO_PROVIDED | ESCALATED | CLOSED

**QA Queue Types:**
- QaQueueFilters: pagination and filtering options
- QaQueueItem: queue list item
- QaItemDetail: full detail for review
- QaEditsDto: edits during release
- QaQueueFlag: HIGH_SEVERITY | RESUBMISSION | KEYWORD_TRIGGER | HIGH_RISK_CATEGORY

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| RIU type mapping | All call types -> HOTLINE_REPORT | Distinction for workflow, not entity type |
| QA reviewer role | TRIAGE_LEAD | No QA_REVIEWER in UserRole enum |
| Follow-up notes | Interaction model | Designed for contacts, not investigation-specific |
| qaClaimedAt field | Return null | Schema lacks field; use qaReviewerId presence |
| Severity order | HIGH -> MEDIUM -> LOW | Schema has 3 severities (no CRITICAL/INFO) |

## Dependencies

**Uses:**
- ClientProfileService.requiresQaReview() from 08-03
- ClientProfileService.getClientProfile() from 08-03
- RiusService from rius module
- RiuAccessService for access code generation
- HotlineRiuService for extension management

**Provides:**
- IntakeService and QaQueueService for downstream modules
- Events for qa.released triggering Case creation

## Events Emitted

- hotline.riu_created
- hotline.submitted_to_qa
- hotline.follow_up_accessed
- hotline.follow_up_note_added
- qa.claimed
- qa.released
- qa.rejected
- qa.abandoned

## Verification Results

- TypeScript compilation: PASS
- Build: PASS (npm run build -- --filter=backend)
- All services properly exported from module

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for:
- 08-08: Reporter messaging and status tracking
- 08-09: Ethics portal public submission flow
