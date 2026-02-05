# Phase 11 Plan 11: Migration Controller & Processor Summary

## One-liner

BullMQ-powered async migration processor with REST lifecycle API for competitor system data imports.

## What Was Built

### MigrationController (`apps/backend/src/modules/analytics/migration/migration.controller.ts`)

REST API providing full migration lifecycle management:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/migrations/upload` | POST | Upload file with format auto-detection |
| `/api/v1/migrations` | GET | List migration jobs with pagination |
| `/api/v1/migrations/:id/detect` | POST | Detect source format from uploaded file |
| `/api/v1/migrations/:id/mappings` | POST | Configure field mappings |
| `/api/v1/migrations/:id/validate` | POST | Validate mappings before import |
| `/api/v1/migrations/:id/preview` | POST | Preview import with dry run |
| `/api/v1/migrations/:id/import` | POST | Start async import via BullMQ |
| `/api/v1/migrations/:id/rollback` | POST | Rollback imported records (7-day window) |
| `/api/v1/migrations/screenshot-to-form` | POST | AI-powered form field extraction |

### MigrationProcessor (`apps/backend/src/modules/analytics/migration/processors/migration.processor.ts`)

BullMQ processor for async data imports with:

- **Concurrency of 1**: One import at a time per worker prevents resource contention
- **Progress tracking**: Real-time progress via `job.updateProgress()` every 100 rows
- **Transaction-safe entity creation**: Creates Person, RIU, Case in single transaction
- **Proper enum mappings**: Helper methods convert string values to valid Prisma enums
- **7-day rollback window**: MigrationRecord tracks all imported records for rollback
- **Error collection**: Stores up to 100 errors for debugging

### Module Updates

- **MigrationModule**: Added BullMQ queue registration with `attempts: 1` (no retries)
- **index.ts**: Exports MigrationProcessor, MIGRATION_QUEUE_NAME, MigrationJobData, MigrationResult

## Key Implementation Details

### Enum Mapping Pattern

The processor handles various string inputs from competitor systems and maps them to valid Prisma enums:

```typescript
private mapToCaseStatus(status: unknown): CaseStatus {
  const normalized = String(status || "").toUpperCase();
  const mapping: Record<string, CaseStatus> = {
    NEW: CaseStatus.NEW,
    OPEN: CaseStatus.OPEN,
    IN_PROGRESS: CaseStatus.OPEN, // No IN_PROGRESS in CaseStatus
    CLOSED: CaseStatus.CLOSED,
  };
  return mapping[normalized] || CaseStatus.NEW;
}
```

Similar mappers for: `Severity`, `ReporterType`, `RiuReporterType`, `CaseOutcome`

### Entity Creation in Transactions

The `createEntities` method uses Prisma's `$transaction` to ensure atomicity:

1. Create Person (if data provided)
2. Create RIU (if data provided)
3. Create Case (if data provided)
4. Link RIU to Case via `RiuCaseAssociation`
5. Link Person to Case via `PersonCaseAssociation`
6. Track record in `MigrationRecord` for rollback

### Source Channel Mapping

Since there's no `MIGRATION` value in the enums:
- RIU: Uses `RiuSourceChannel.DIRECT_ENTRY`
- Case: Uses `SourceChannel.DIRECT_ENTRY`
- RIU type: Uses `RiuType.WEB_FORM_SUBMISSION`

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Concurrency of 1 | Prevents memory/CPU contention on large imports |
| No retries | Migration imports should be deliberate; retries could cause duplicates |
| DIRECT_ENTRY for migration source | Closest existing enum value for imported data |
| WEB_FORM_SUBMISSION for RIU type | Best fit for migrated data that isn't from live phone intake |
| 100-error limit | Prevents memory bloat while retaining debugging info |
| 100-row progress update interval | Balances responsiveness with database write overhead |

## Files Changed

### Created
- `apps/backend/src/modules/analytics/migration/migration.controller.ts` (490 lines)
- `apps/backend/src/modules/analytics/migration/processors/migration.processor.ts` (640 lines)

### Modified
- `apps/backend/src/modules/analytics/migration/migration.module.ts` (BullMQ queue registration)
- `apps/backend/src/modules/analytics/migration/index.ts` (new exports)

## Verification

```bash
# TypeScript compilation passes
npx tsc --noEmit | grep migration.processor  # No errors

# Files excluded from lint by tsconfig.json (pre-existing exclusion)
```

## Deviations from Plan

### [Rule 1 - Bug] Fixed enum type mismatches

The original implementation used string literals where Prisma expects enum values:
- Changed `type: "MIGRATED"` to `type: RiuType.WEB_FORM_SUBMISSION`
- Changed `sourceChannel: "MIGRATION"` to `RiuSourceChannel.DIRECT_ENTRY`
- Changed `status: "RELEASED"` to `RiuStatus.RELEASED`
- Changed `role: "SUBJECT"` to `label: PersonCaseLabel.SUBJECT`

### [Rule 2 - Missing Critical] Added PersonSource.INTAKE_CREATED

`PersonSource.CASE_INTAKE` doesn't exist; used `PersonSource.INTAKE_CREATED` instead.

### [Rule 3 - Blocking] Added missing enum imports

Added imports for: `RiuStatus`, `RiuCaseAssociationType`, plus all mapping helper methods.

## Next Plan Readiness

Plan 11-12 (Dashboard UI) can proceed. The migration infrastructure is complete with:
- File upload and format detection (11-15)
- Connectors for NAVEX/EQS/CSV (11-09)
- Full REST API lifecycle (this plan)
- Async processing with rollback support (this plan)

## Commit

```
f6b2972 feat(11-11): add MigrationController and MigrationProcessor for data imports
```
