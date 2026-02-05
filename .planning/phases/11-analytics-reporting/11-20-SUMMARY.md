# Phase 11 Plan 20: Import Preview, Execution, and Rollback Summary

**One-liner:** BullMQ-based migration processor with queue actions for validate, preview, import, and rollback with 7-day rollback window and modified-record skip tracking.

---

## What Was Built

### MigrationProcessor Enhancement (apps/backend/src/modules/analytics/migration/processors/migration.processor.ts)

Expanded the existing MigrationProcessor to support four queue actions:

1. **validate** - Streams all rows through connector validation, collects errors (max 100), updates job with validRows/errorRows counts
2. **preview** - Generates preview of first 20 rows with source data, transformed data, and issues
3. **import** - Full import with batch progress tracking, entity creation in transactions, MigrationRecord tracking for rollback
4. **rollback** - Removes imported records in reverse dependency order (Case -> RIU -> Person), skips modified records with reasons

Key features:
- MigrationAction type export for type-safe action handling
- Result interfaces for each action (ValidationResult, PreviewResult, MigrationResult, RollbackResult)
- 7-day rollback window enforcement via rollbackAvailableUntil
- Progress updates via job.updateProgress() every 100 rows
- Audit logging for completed imports and rollbacks
- Entity creation includes Person, RIU, Case with proper associations

### MigrationController Updates (apps/backend/src/modules/analytics/migration/migration.controller.ts)

Updated controller to use queue-based operations:

1. **POST /:id/validate** - Queue validation job, returns queueJobId
2. **POST /:id/preview** - Queue preview generation, returns queueJobId
3. **GET /:id/preview** - Retrieve preview data after job completes
4. **POST /:id/rollback** - Queue rollback with ROLLBACK confirmation
5. **GET /:id/mappings/suggestions** - Get AI-suggested field mappings via MappingSuggestionService
6. **GET /templates/list** - List saved mapping templates

All queue operations return consistent QueuedJobResponse:
```typescript
{
  queued: boolean;
  queueJobId: string;
  action: MigrationAction;
}
```

---

## Implementation Details

### Queue Job Data Structure
```typescript
interface MigrationJobData {
  jobId: string;
  organizationId: string;
  userId: string;
  action: 'validate' | 'preview' | 'import' | 'rollback';
}
```

### Rollback Logic
- Records deleted in dependency order: Case -> RIU -> Person -> Investigation
- Associations deleted before entities (riuCaseAssociation, personCaseAssociation)
- Modified records skipped with detailed reasons stored
- Rollback only available for COMPLETED jobs within 7-day window

### Progress Tracking
- Validation: Progress based on row count
- Preview: Progress based on 20-row preview limit
- Import: Progress based on totalRows (if known) or row count
- Rollback: Progress based on total MigrationRecords

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Queue-based validation and preview | Large files may take time; async prevents API timeouts |
| 20-row preview limit | Balance between preview comprehensiveness and response size |
| Max 100 stored errors | Prevent bloating job record; most useful errors are early ones |
| Dependency-order deletion for rollback | Ensures referential integrity when deleting imported data |
| Modified record tracking via MigrationRecord.modifiedAfterImport | Prevents data loss when records have been edited |

---

## Files Changed

| File | Change Type | Lines |
|------|-------------|-------|
| apps/backend/src/modules/analytics/migration/processors/migration.processor.ts | Modified | ~1063 |
| apps/backend/src/modules/analytics/migration/migration.controller.ts | Modified | ~747 |

---

## Verification

```bash
# Lint passed
npm run lint -- --fix src/modules/analytics/migration/processors/migration.processor.ts src/modules/analytics/migration/migration.controller.ts

# TypeScript passed
npx tsc --noEmit
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/migrations/:id/validate | Queue validation job |
| POST | /api/v1/migrations/:id/preview | Queue preview generation |
| GET | /api/v1/migrations/:id/preview | Get preview data |
| POST | /api/v1/migrations/:id/import | Start import (with confirmation) |
| GET | /api/v1/migrations/:id/rollback-status | Check rollback availability |
| POST | /api/v1/migrations/:id/rollback | Queue rollback (with ROLLBACK confirmation) |
| GET | /api/v1/migrations/:id/mappings/suggestions | Get AI-suggested mappings |
| GET | /api/v1/migrations/templates/list | List saved mapping templates |

---

## Next Phase Readiness

**Ready for:** Phase 11-21 (Demo Data for Analytics)

**Dependencies satisfied:**
- Migration import/export fully functional
- Queue-based processing for all migration operations
- Rollback capability with modified-record protection

---

## Commits

| Hash | Message |
|------|---------|
| 28bec48 | feat(11-20): enhance MigrationProcessor with validate, preview, and rollback actions |
| aa38187 | feat(11-20): update MigrationController with queue-based operations |

---

*Completed: 2026-02-05*
*Duration: ~6 minutes*
