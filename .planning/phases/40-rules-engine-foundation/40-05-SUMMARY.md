---
phase: 40
plan: 05
subsystem: rules-engine
tags:
  [
    "rules-engine",
    "event-listener",
    "investigation",
    "case-status",
    "auto-derivation",
  ]
dependency-graph:
  requires: ["40-01"]
  provides: ["InvestigationStatusListener", "investigation-status-derivation"]
  affects: ["41-sla", "notifications"]
tech-stack:
  added: []
  patterns:
    [
      "event-listener",
      "async-event-handling",
      "audit-logging",
      "case-status-derivation",
    ]
key-files:
  created:
    - apps/backend/src/modules/rules/listeners/investigation-status.listener.ts
    - apps/backend/src/modules/rules/listeners/investigation-status.listener.spec.ts
  modified:
    - apps/backend/src/modules/rules/listeners/index.ts
    - apps/backend/src/modules/rules/rules.module.ts
decisions:
  - id: "inv-status-closed-only"
    decision: "Only CLOSED investigation status triggers derivation check"
    rationale: "InvestigationStatus enum only has CLOSED as terminal status, not COMPLETED or RESOLVED"
  - id: "flag-for-review-not-auto-close"
    decision: "Flag case for review via audit + event, not auto-close"
    rationale: "CaseStatus enum only has NEW/OPEN/CLOSED - no PENDING_REVIEW. Auto-closing would skip human review."
  - id: "emit-unchanged-status-event"
    decision: "Emit CaseStatusChangedEvent with same status but rationale indicating completion"
    rationale: "Allows downstream systems (notifications, SLA) to react without modifying case status"
metrics:
  duration: "25 minutes"
  completed: "2026-02-27"
---

# Phase 40 Plan 05: InvestigationStatusListener Summary

**One-liner:** Event listener that flags cases for review when all investigations close, using audit log + event emission instead of direct status change.

## What Was Done

### Task 1: Create InvestigationStatusListener (COMPLETE)

Created `apps/backend/src/modules/rules/listeners/investigation-status.listener.ts` (210 lines):

- Listens to `investigation.status_changed` events with `{ async: true }`
- Only processes when investigation moves to CLOSED status
- Checks if parent case is in derivable status (NEW, OPEN)
- Verifies ALL investigations for the case are CLOSED before flagging
- Creates audit log entry with `autoDerivation: true` flag
- Emits CaseStatusChangedEvent for downstream processing

**Schema Adaptation:**

- CaseStatus enum only has NEW/OPEN/CLOSED (not PENDING_REVIEW as plan assumed)
- Adapted to flag for review via audit + event instead of changing status
- This preserves human review step before case closure

### Task 2: Register Listener (COMPLETE)

Updated `apps/backend/src/modules/rules/listeners/index.ts`:

- Added export for InvestigationStatusListener

Updated `apps/backend/src/modules/rules/rules.module.ts`:

- Imported InvestigationStatusListener
- Added to providers array

### Task 3: Add Unit Tests (COMPLETE)

Created `apps/backend/src/modules/rules/listeners/investigation-status.listener.spec.ts` (375 lines):

17 comprehensive tests covering:

- Skip if new status is not closed (IN_PROGRESS, INVESTIGATING, ON_HOLD, NEW)
- Skip if case is already CLOSED or not found
- Not flag if some investigations still open
- Flag for review when all investigations CLOSED
- Emit CaseStatusChangedEvent after flagging
- Create audit log entry with autoDerivation flag
- Handle case-insensitive status comparison
- Handle errors gracefully without throwing
- Verify tenant isolation via organizationId filtering

## Deviations from Plan

### Schema Adaptation - CaseStatus PENDING_REVIEW

**Found during:** Task 1
**Issue:** Plan assumed CaseStatus has PENDING_REVIEW, but actual enum only has NEW, OPEN, CLOSED
**Fix:** Changed from auto-deriving case status to:

1. Creating audit log entry noting all investigations complete
2. Emitting CaseStatusChangedEvent with unchanged status but rationale indicating completion
   **Rationale:** Auto-closing case would skip human review. Flagging via event allows notifications/SLA to trigger without forcing status change.

### [Rule 3 - Blocking] Fixed rule-tester.service.ts type errors

**Found during:** Task 1 commit attempt
**Issue:** Type errors in parallel-created file blocking compilation
**Fix:** Updated Prisma query return type mapping for HistoricalCase interface
**Files modified:** apps/backend/src/modules/rules/testing/rule-tester.service.ts

### [Rule 3 - Blocking] Fixed round-robin-team.action.spec.ts mock types

**Found during:** Task 3 commit attempt
**Issue:** jest.Mock type assertions missing on Prisma mocks
**Fix:** Added `(... as jest.Mock).mockResolvedValue()` casts
**Files modified:** apps/backend/src/modules/rules/engine/actions/round-robin-team.action.spec.ts

## Verification

All verification criteria met:

1. `cd apps/backend && npx tsc --noEmit` - Compiles without errors
2. `cd apps/backend && npm test -- --testPathPattern="investigation-status.listener"` - 17/17 tests pass
3. InvestigationStatusListener receives investigation.status_changed events
4. Case flagged for review when all investigations CLOSED
5. Cases in terminal status (CLOSED) not processed
6. Audit log entry created with autoDerivation flag
7. CaseStatusChangedEvent emitted for downstream processing

## Key Artifacts

| File                                              | Purpose             | Lines |
| ------------------------------------------------- | ------------------- | ----- |
| `listeners/investigation-status.listener.ts`      | Main event listener | 210   |
| `listeners/investigation-status.listener.spec.ts` | Unit tests          | 375   |
| `listeners/index.ts`                              | Exports             | 8     |
| `rules.module.ts`                                 | Module registration | 76    |

## Technical Notes

### Event Flow

```
investigation.status_changed (CLOSED)
    -> InvestigationStatusListener.handleInvestigationStatusChanged()
        -> Check: Is new status CLOSED?
        -> Check: Is parent case in derivable status (NEW/OPEN)?
        -> Check: Are ALL investigations for case CLOSED?
        -> If yes: Create audit log + emit CaseStatusChangedEvent
```

### Tenant Isolation

All queries filter by `organizationId`:

- Case lookup: `prisma.case.findFirst({ where: { id, organizationId } })`
- Investigation lookup: `prisma.investigation.findMany({ where: { caseId, organizationId } })`
- Audit log: Includes `organizationId` field

### Closed Status Detection

Only `CLOSED` is treated as closed. The InvestigationStatus enum has:

- NEW, ASSIGNED, INVESTIGATING - not closed
- PENDING_REVIEW - not closed (investigation still being reviewed)
- CLOSED - terminal, closed
- ON_HOLD - paused, not closed

## Next Phase Readiness

**Ready for Phase 41 (SLA Monitoring):**

- CaseStatusChangedEvent emission enables SLA tracking to react
- Audit log provides timestamp for SLA calculations
- Event includes rationale for reporting/analytics

**Integration Points:**

- Notifications module can listen for events with "All investigations completed" rationale
- Dashboard can query audit logs for auto-derivation events
- SLA module can trigger review deadline when all investigations close
