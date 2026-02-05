---
phase: 11-analytics-reporting
plan: 15
subsystem: migration
tags: [file-upload, format-detection, csv-parsing, xlsx, competitor-migration]
completed: 2026-02-05
duration: 16min

dependency-graph:
  requires: ["11-04"]
  provides:
    - migration-file-upload-service
    - format-auto-detection
    - csv-xlsx-parsing
  affects: ["11-16", "11-17"]

tech-stack:
  added:
    - csv-parse: "^5.x"
    - xlsx: "^0.18.x"
  patterns:
    - multipart-file-upload
    - format-detection-with-confidence
    - streaming-file-download

key-files:
  created:
    - apps/backend/src/modules/analytics/migration/dto/upload.dto.ts
    - apps/backend/src/modules/analytics/migration/migration-upload.service.ts
    - apps/backend/src/modules/analytics/migration/migration-upload.controller.ts
  modified:
    - apps/backend/src/modules/analytics/migration/migration.module.ts
    - apps/backend/package.json

metrics:
  tasks-completed: 3
  tasks-total: 3
  lines-added: ~751
---

# Phase 11 Plan 15: Migration File Upload Summary

**One-liner:** File upload service with auto-detection for NAVEX, EQS, Legacy Ethico, OneTrust, and STAR competitor formats.

## What Was Built

### Migration Upload Service
- `uploadFile()` - Validates file (size, type), uploads to blob storage, detects format, creates MigrationJob
- `detectFormat()` - Parses file and determines source type from column headers
- `parseCsv()` - Delimiter auto-detection (comma, semicolon, tab, pipe) and CSV parsing
- `parseExcel()` - XLSX and XLS parsing using xlsx library
- `detectSourceType()` - Matches headers against known patterns for competitor systems
- `calculatePatternMatch()` - Scores headers against SOURCE_FIELD_PATTERNS
- `getSampleData()` - Retrieves sample rows for preview before mapping

### Upload Controller
- `POST /api/v1/migrations/upload` - Upload migration file (multipart, 100MB max)
- `GET /api/v1/migrations/upload/:jobId/sample` - Get sample data from uploaded file
- `POST /api/v1/migrations/upload/:jobId/redetect` - Re-detect format with different hint

### Format Detection
- **NAVEX**: case_number, case_id, incident_type, incident_date, reporter_type, etc.
- **EQS**: report_id, report_date, category, subcategory, reporter_relationship, etc.
- **Legacy Ethico**: call_id, call_date, hotline_type, caller_type, incident_summary, etc.
- **OneTrust**: incident_id, created_at, type, severity, department, submitted_by, etc.
- **STAR**: matter_id, matter_type, report_date, category, business_area, etc.
- **GENERIC_CSV**: Falls back when no pattern matches (100% confidence)

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Use csv-parse library | Streaming parser with delimiter detection, handles large files |
| Use xlsx library | Supports both XLSX and XLS formats, widely used |
| Confidence threshold at 30% | Low threshold allows hint to override; <50% shows warning |
| 100MB max file size | Reasonable limit for enterprise migration files |
| Pattern matching on normalized headers | Tolerates variations in column naming conventions |

## Commits

| Hash | Description |
|------|-------------|
| 94f0eb9 | feat(11-15): migration file upload with format auto-detection |

## Dependencies Added

- `csv-parse` - CSV parsing with streaming support
- `xlsx` - Excel file parsing (XLSX and XLS)

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for:**
- 11-16: Field mapping UI (uses getSampleData for preview)
- 11-17: Import execution (uses MigrationJob created by upload)

**Blockers:** None

## Verification Results

```
npm run lint -- --fix: PASS (warnings only in unrelated files)
npm run typecheck: PASS for new files (pre-existing errors in other files)
```
