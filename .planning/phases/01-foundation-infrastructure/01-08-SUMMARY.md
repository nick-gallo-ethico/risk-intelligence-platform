---
phase: 01-foundation-infrastructure
plan: 08
subsystem: reporting
tags: [exceljs, reporting, query-builder, csv-export, excel-export, bullmq]

# Dependency graph
requires:
  - phase: 01-02
    provides: JobsModule with BullMQ job queue infrastructure
provides:
  - QueryBuilderService for dynamic Prisma query generation from report templates
  - ReportTemplateService for CRUD on reusable report configurations
  - ExportService with Excel (ExcelJS) and CSV export
  - ReportingController REST API at /api/v1/reports
  - Export queue for async large report generation
affects: [07-analytics-reporting, 02-demo-tenant-seed-data]

# Tech tracking
tech-stack:
  added: [exceljs, @types/exceljs]
  patterns: [dynamic-query-builder, streaming-export, report-template-system]

key-files:
  created:
    - apps/backend/src/modules/reporting/query-builder.service.ts
    - apps/backend/src/modules/reporting/report-template.service.ts
    - apps/backend/src/modules/reporting/export.service.ts
    - apps/backend/src/modules/reporting/reporting.controller.ts
    - apps/backend/src/modules/reporting/reporting.module.ts
    - apps/backend/src/modules/jobs/queues/export.queue.ts
    - apps/backend/src/modules/jobs/processors/export.processor.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/jobs/jobs.module.ts
    - apps/backend/src/app.module.ts

key-decisions:
  - "QueryBuilder uses dynamic Prisma delegate access via (prisma as any)[model] for flexible data source querying"
  - "Excel exports include formatting: bold headers, auto-filter, freeze pane, gray fill on header row"
  - "System templates (isSystem: true) are accessible to all organizations for compliance report sharing"
  - "Direct export capped at 10k rows (Excel) and 50k rows (CSV); larger reports use async queue"
  - "Export queue has 2 retries with 5s fixed delay for predictable behavior"

patterns-established:
  - "Report template pattern: JSON columns/filters/aggregations define reusable report configurations"
  - "Filter operator mapping: eq/neq/gt/gte/lt/lte/in/contains/between map to Prisma where clause"
  - "Execution tracking: ReportExecution table tracks async export status and download links"

# Metrics
duration: 31min
completed: 2026-02-03
---

# Phase 01 Plan 08: Reporting Engine Summary

**QueryBuilder framework for dynamic reports with Excel/CSV export using ExcelJS**

## Performance

- **Duration:** 31 min
- **Started:** 2026-02-03T02:02:33Z
- **Completed:** 2026-02-03T02:33:22Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- ReportTemplate and ReportExecution Prisma models for template storage and execution tracking
- QueryBuilderService that generates Prisma queries from column/filter/sort definitions
- ExportService with properly formatted Excel (headers, auto-filter, freeze pane) and CSV export
- Full REST API at /api/v1/reports with template CRUD, execution, and export endpoints
- Export queue integrated into JobsModule for async large report generation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ReportTemplate model and install ExcelJS** - `2b49281` (feat)
2. **Task 2: Create QueryBuilder and ReportTemplate services** - `32f6bc2` (feat)
3. **Task 3: Create export service and controller** - `4192418` (feat)

## Files Created/Modified

**Created:**
- `apps/backend/src/modules/reporting/query-builder.service.ts` - Dynamic Prisma query generation from report definitions
- `apps/backend/src/modules/reporting/report-template.service.ts` - CRUD for report templates with system/org templates
- `apps/backend/src/modules/reporting/export.service.ts` - Excel and CSV export with formatting
- `apps/backend/src/modules/reporting/reporting.controller.ts` - REST API endpoints
- `apps/backend/src/modules/reporting/reporting.module.ts` - Module registration
- `apps/backend/src/modules/reporting/types/report.types.ts` - Type definitions
- `apps/backend/src/modules/reporting/dto/*.ts` - Validation DTOs
- `apps/backend/src/modules/jobs/queues/export.queue.ts` - Export queue config
- `apps/backend/src/modules/jobs/processors/export.processor.ts` - Export job processor

**Modified:**
- `apps/backend/prisma/schema.prisma` - Added ReportTemplate, ReportExecution, ReportDataSource, ReportExecutionStatus
- `apps/backend/src/modules/jobs/jobs.module.ts` - Registered export queue
- `apps/backend/src/modules/jobs/types/job-data.types.ts` - Added ExportJobData
- `apps/backend/src/app.module.ts` - Imported ReportingModule

## Decisions Made

1. **Dynamic Prisma Access:** QueryBuilder uses `(prisma as any)[model]` to dynamically access Prisma delegates based on ReportDataSource enum. This enables one query builder to work with any entity type.

2. **Excel Formatting:** Added professional formatting to exports - bold gray headers, auto-filter, frozen header row. This provides a polished user experience out of the box.

3. **System Templates:** Templates with `isSystem: true` and `organizationId: null` are accessible to all tenants. Ethico can provide pre-built compliance reports.

4. **Export Row Limits:** Direct synchronous exports are capped at 10k (Excel) and 50k (CSV) rows. Larger reports must use the async queue to avoid blocking API threads.

5. **Export Queue Config:** 2 retries with 5-second fixed delay. Export jobs are CPU-intensive but not time-critical, so fixed delay is simpler than exponential backoff.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **TypeScript JSON casting:** Prisma's `InputJsonValue` type doesn't accept interface arrays directly. Fixed by using `JSON.parse(JSON.stringify())` to create proper JSON values.

2. **ExcelJS buffer type:** ExcelJS returns `ArrayBuffer` from `writeBuffer()`, needed `Buffer.from()` wrapper for Node.js Buffer type compatibility.

## Next Phase Readiness

- Reporting engine ready for use by analytics dashboards (Phase 7)
- Pre-built report templates can be seeded in demo tenant (Phase 2)
- Query builder can be extended for additional data sources as modules are built

---
*Phase: 01-foundation-infrastructure*
*Completed: 2026-02-03*
