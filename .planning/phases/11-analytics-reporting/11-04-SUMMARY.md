---
phase: 11-analytics-reporting
plan: 04
subsystem: analytics
tags: [migration, data-import, etl, navex, eqs, prisma]
dependency-graph:
  requires: [01-foundation]
  provides: [migration-infrastructure]
  affects: [11-05-migration-processor]
tech-stack:
  added: []
  patterns: [transform-functions, field-mapping-hints, rollback-window]
key-files:
  created:
    - apps/backend/prisma/schema.prisma (migration models)
    - apps/backend/src/modules/analytics/migration/dto/migration.dto.ts
    - apps/backend/src/modules/analytics/migration/entities/migration.entity.ts
    - apps/backend/src/modules/analytics/migration/migration.service.ts
    - apps/backend/src/modules/analytics/migration/migration.module.ts
    - apps/backend/src/modules/analytics/migration/index.ts
  modified: []
decisions:
  - key: rollback-window
    choice: 7 days
    rationale: Balance between giving users time to verify import vs. preventing stale rollback data
  - key: transform-functions
    choice: Enum-based transform catalog
    rationale: Type-safe transforms with clear documentation
  - key: field-mapping-hints
    choice: Source-type-specific mapping dictionaries
    rationale: Enables auto-suggestion based on competitor export formats
metrics:
  duration: 28 min
  completed: 2026-02-05
---

# Phase 11 Plan 04: Migration Infrastructure Summary

Migration connectors foundation for importing data from competitor systems.

## What Was Built

### Prisma Models (apps/backend/prisma/schema.prisma)

**MigrationJob** - Tracks data import operations:
- Source configuration (type, file URL, size)
- Status tracking (PENDING -> VALIDATING -> MAPPING -> PREVIEW -> IMPORTING -> COMPLETED/FAILED/ROLLED_BACK)
- Progress percentage and current step
- Row counts (total, valid, error, imported)
- Field mappings snapshot
- Validation errors and preview data
- 7-day rollback window support
- Error details for failed imports

**MigrationFieldTemplate** - Reusable field mapping configurations:
- Scoped by organization and source type
- Stored as JSON mappings array
- Unique constraint on (org, sourceType, name)

**MigrationRecord** - Tracks imported records for rollback:
- Links entity type/ID to migration job
- Stores original source row data
- `modifiedAfterImport` flag prevents rollback of changed records

**Enums:**
- `MigrationSourceType`: NAVEX, EQS, LEGACY_ETHICO, GENERIC_CSV, ONETRUST, STAR
- `MigrationJobStatus`: Full lifecycle tracking

### Migration DTOs (apps/backend/src/modules/analytics/migration/dto/migration.dto.ts)

**Request DTOs:**
- `CreateMigrationJobDto` - Upload configuration
- `FieldMappingDto` - Source-to-target field mapping with transform
- `SaveFieldMappingsDto` - Save mappings with optional template creation
- `StartImportDto` - Confirmation to begin import
- `RollbackDto` - Confirmation text validation

**Response DTOs:**
- `MigrationJobResponseDto` - Job status and progress
- `FormatDetectionResponseDto` - Detected format and suggested mappings
- `RollbackCheckResponseDto` - Rollback availability and stats
- `RollbackResultResponseDto` - Rollback operation results

**Enums & Interfaces:**
- `TargetEntityType`: Case, RIU, Person, Investigation
- `TransformFunction`: 14 transform types (uppercase, parseDate, mapSeverity, etc.)
- `ValidationError` / `PreviewRow` interfaces

### Migration Entities (apps/backend/src/modules/analytics/migration/entities/migration.entity.ts)

**Field Mapping Hints:**
- `NAVEX_FIELD_MAPPINGS` - 30+ NAVEX-specific field suggestions
- `EQS_FIELD_MAPPINGS` - EQS/Conversant field suggestions
- `LEGACY_ETHICO_FIELD_MAPPINGS` - Legacy platform field suggestions
- `getFieldMappingHints()` - Helper to get hints by source type

**Target Field Catalog:**
- `TARGET_FIELDS` - Valid fields per entity type
- `TRANSFORM_DESCRIPTIONS` - Human-readable transform descriptions

### MigrationService (apps/backend/src/modules/analytics/migration/migration.service.ts)

**Job Management:**
- `createJob()` - Create new migration job
- `getJob()` - Get job by ID with RLS
- `listJobs()` - Paginated job listing with filters

**Format Detection:**
- `detectFormat()` - Detect file format and suggest mappings
- `generateSuggestedMappings()` - Create mapping suggestions from hints
- `fuzzyMatchField()` - Generic CSV field matching

**Field Mapping:**
- `getSuggestedMappings()` - Get existing or template mappings
- `saveMappings()` - Save mappings with optional template
- `loadTemplateMapping()` - Load saved template by source type
- `validateMappings()` - Ensure required fields mapped

**Validation & Preview:**
- `validate()` - Validate all rows against mappings
- `validateRow()` - Single row validation
- `validateTransform()` - Transform-specific validation
- `generatePreview()` - Generate transformed preview data
- `transformRow()` - Apply mappings to single row

**Transform Functions:**
- `applyTransform()` - Apply transform to value
- `parseDate()` - Parse dates in US/EU/ISO formats
- `mapSeverity()` - Map severity strings to enums
- `mapStatus()` - Map status strings to enums

**Import Execution:**
- `startImport()` - Begin import (stub for background processor)
- `cancelImport()` - Cancel in-progress import
- `completeImport()` - Mark import complete with rollback window
- `failImport()` - Mark import failed with error details

**Rollback:**
- `canRollback()` - Check rollback availability
- `rollback()` - Execute rollback (respects modified records)

## Key Design Decisions

1. **7-Day Rollback Window**: Balanced approach - enough time for verification without indefinite storage of rollback data.

2. **Transform Function Catalog**: Enum-based transforms provide type safety and clear documentation for mapping configuration.

3. **Source-Specific Field Hints**: Pre-built dictionaries for NAVEX, EQS, Legacy Ethico enable instant auto-suggestions based on competitor exports.

4. **Modified Record Protection**: Records modified after import are skipped during rollback to prevent data loss.

5. **Preview Before Import**: Mandatory preview step shows transformed data before committing changes.

## Commits

| Commit | Description |
|--------|-------------|
| 0fb5d61 | Add Migration Prisma models (MigrationJob, MigrationFieldTemplate, MigrationRecord) |
| e080ea7 | Add Migration DTOs and entity types |
| 7541bf8 | Implement MigrationService for data import |

## Deviations from Plan

None - plan executed exactly as written.

## Test Verification

- Prisma schema validated and client generated successfully
- ESLint passes with no errors
- TypeScript compiles without migration-related errors

## Next Steps

This infrastructure is ready for:
- 11-05: Migration processor (background job handling)
- Migration controller (REST API endpoints)
- Migration UI (upload wizard, field mapping interface)

---

*Plan: 11-04 | Duration: 28 min | Completed: 2026-02-05*
