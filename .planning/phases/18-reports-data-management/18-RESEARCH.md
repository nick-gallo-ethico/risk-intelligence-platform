# Phase 18: Reports & Data Management - Research

**Researched:** 2026-02-07
**Domain:** Report Designer UI, Field Registry, Export Integration, AI Query Integration
**Confidence:** HIGH (existing backend complete), HIGH (frontend patterns established)

## Summary

Phase 18 builds a report designer UI on top of extensive existing backend infrastructure from Phase 11 (analytics/reporting engine, AI queries, Excel/CSV/PDF export, scheduled delivery) and frontend patterns from Phase 13 (saved views, DataTable, column selection, filters). The primary work is:

1. **Report Designer UI** — wizard-style report builder (data source → fields → filters → visualization → save)
2. **Field Registry Service** — expose ALL entity fields as reportable/filterable dimensions
3. **Report List/Management Page** — saved reports, pre-built templates, run history
4. **Export from Views** — connect saved views export to the existing export infrastructure
5. **AI Query Integration** — natural language report generation from the existing AiQueryService
6. **Pre-built Report Templates** — compliance-standard report templates seeded for demo

## Existing Infrastructure (Built)

### Backend (Phase 11 — All Complete)

| Service | File | Purpose |
|---------|------|---------|
| DashboardConfigService | `modules/analytics/dashboard/dashboard-config.service.ts` | Dashboard CRUD, widget management, user config |
| WidgetDataService | `modules/analytics/dashboard/widget-data.service.ts` | Pre-built widget data (CCO, Investigator, Campaign Manager) |
| AiQueryService | `modules/analytics/ai-query/ai-query.service.ts` | Natural language → structured query → results |
| QueryToPrismaService | `modules/analytics/ai-query/query-to-prisma.service.ts` | AI output → safe Prisma queries with field whitelisting |
| ExcelExportService | `modules/analytics/exports/excel-export.service.ts` | Streaming Excel (>10k rows) and buffer (small) exports |
| FlatFileService | `modules/analytics/exports/flat-file.service.ts` | Flat file export with tagged fields |
| FlatExportProcessor | `modules/analytics/exports/processors/flat-export.processor.ts` | Async BullMQ export job processing |
| ExportsController | `modules/analytics/exports/exports.controller.ts` | REST endpoints for tags and export jobs |
| ScheduledExportService | `modules/analytics/exports/scheduled-export.service.ts` | Schedule CRUD, next-run calculation |
| ScheduledExportProcessor | `modules/analytics/exports/processors/scheduled-export.processor.ts` | Cron-based scheduled export execution and email delivery |
| BoardReportService | `modules/analytics/reports/board-report.service.ts` | PDF (Puppeteer) and PPTX generation |
| TaskAggregatorService | `modules/analytics/my-work/task-aggregator.service.ts` | Unified "My Work" task queue |

### Backend Models (Prisma)

- `Dashboard`, `DashboardWidget`, `UserDashboardConfig` — dashboard layout storage
- `ExportJob` — async export tracking (status, progress, file URL)
- `ScheduledExport`, `ScheduledExportRun` — recurring export scheduling
- `ReportFieldTag` — tagged export fields for flat file
- `AiQueryHistory` — AI query audit trail

### Frontend (Phase 13 — All Complete)

| Component | File | Purpose |
|-----------|------|---------|
| SavedViewProvider | `components/views/SavedViewProvider.tsx` | Context for view state management |
| DataTable | `components/views/DataTable.tsx` | TanStack Table with sort, freeze, resize, pagination |
| ColumnSelectionModal | `components/views/ColumnSelectionModal.tsx` | Searchable column picker with drag-reorder |
| AdvancedFiltersPanel | `components/views/AdvancedFiltersPanel.tsx` | AND/OR filter groups |
| ViewTabsBar | `components/views/ViewTabsBar.tsx` | Draggable view tabs |
| BoardView | `components/views/BoardView.tsx` | Kanban board with dnd-kit |
| PaginationBar | `components/views/PaginationBar.tsx` | Page numbers, size selector |
| BulkActionsBar | `components/views/BulkActionsBar.tsx` | Bulk action toolbar |
| ExportButton | `components/views/ViewToolbar.tsx` | Export trigger in view toolbar |

### Frontend Libraries

- `@tanstack/react-table` — headless table
- `recharts` — charting (Line, Bar, Pie, Area, etc.)
- `react-grid-layout` — dashboard layout
- `@dnd-kit/core` — drag and drop
- `shadcn/ui` — UI component library
- `date-fns` — date manipulation

## What's Missing (Phase 18 Scope)

### 1. Report Designer UI (Primary Gap)

No UI exists to create custom reports. Users need:
- **Report Builder Wizard**: Step-by-step flow (data source → fields → filters → visualization → save)
- **Data source selector**: Cases, RIUs, Persons, Campaigns, Policies, Disclosures
- **Field picker**: All fields from selected entity, including custom properties, related entity fields
- **Filter builder**: Reuse AdvancedFiltersPanel pattern from Phase 13
- **Visualization picker**: Table, Bar, Line, Pie, KPI, Funnel
- **Preview**: Live preview as user builds the report
- **Save**: Name, description, add to dashboard option

### 2. Field Registry Service (Backend Gap)

QueryToPrismaService has a hardcoded `ALLOWED_FIELDS` whitelist. Need:
- **ReportFieldRegistryService**: Dynamic field discovery from Prisma schema + custom properties
- **Field metadata**: label, type, group, filterable, sortable, aggregatable
- **Relationship traversal**: case.category.name, case.assignee.email, etc.
- **Custom property inclusion**: Per-tenant custom fields surfaced as report dimensions
- **API endpoint**: `GET /api/v1/reports/fields/:entityType` returns available fields

### 3. Report Management Page (Frontend Gap)

No `/reports` page exists. Need:
- **Report list page**: My Reports, Shared Reports, Templates tabs
- **Report detail page**: View results, edit, re-run, schedule, export
- **Template gallery**: Pre-built compliance report templates
- **Run history**: When was each report last run, results

### 4. Pre-built Report Templates (Data Gap)

Need compliance-standard templates seeded:
- Case Volume by Category (bar chart, monthly)
- Time-to-Close Trends (line chart, by category)
- SLA Compliance Rate (KPI + gauge)
- Disclosure Completion Rates (by campaign)
- Open Cases by Priority/Status (stacked bar)
- Anonymous vs. Named Reports (pie chart)
- Cases by Location/Region (heatmap or bar)
- Investigator Workload (bar chart, by assignee)
- Remediation Plan Progress (funnel)
- Quarterly Board Report (multi-widget)

### 5. Export from Views Integration (Frontend Gap)

Phase 13's ExportButton exists but may not be fully wired to the backend ExportsController. Need:
- Wire "Export" button in saved views to create ExportJob
- Show export progress/download notification
- Respect current view filters and column selection in export

### 6. AI Report Generation (Frontend Gap)

AiQueryService exists on backend but no dedicated UI path from report designer. Need:
- "Ask AI" option in report designer to generate report from natural language
- AI-generated reports saved as regular saved reports
- Suggestion refinement ("Did you mean...?")

## Architecture Recommendations

### Report Designer UX Flow (HubSpot Pattern)

```
1. SELECT DATA SOURCE
   └─ Entity type: Cases, RIUs, Persons, Campaigns, Policies, Disclosures

2. CHOOSE FIELDS (columns)
   └─ Reuse ColumnSelectionModal from Phase 13
   └─ Group by entity sections (Case Fields, Category, Assignee, Location, etc.)
   └─ Include custom properties

3. SET FILTERS
   └─ Reuse AdvancedFiltersPanel from Phase 13
   └─ Date range mandatory
   └─ Quick filters for common dimensions

4. CONFIGURE VISUALIZATION
   └─ Table (default), Bar, Line, Pie, KPI, Funnel, Stacked Bar
   └─ Aggregation: Group by + Sum/Count/Avg
   └─ Sort order

5. PREVIEW & SAVE
   └─ Live preview panel
   └─ Name, description
   └─ Sharing: Private / Team / Everyone
   └─ Optional: Add to dashboard, Schedule delivery
```

### New Prisma Model: SavedReport

```
model SavedReport {
  id              String   @id @default(uuid())
  organizationId  String
  name            String
  description     String?
  entityType      String        // cases, rius, persons, etc.
  columns         Json          // Selected field IDs
  filters         Json          // Filter conditions
  groupBy         Json?         // Aggregation grouping
  aggregation     Json?         // SUM, COUNT, AVG config
  visualization   String        // table, bar, line, pie, kpi
  chartConfig     Json?         // Colors, labels, formatting
  sortBy          String?
  sortOrder       String?       // asc, desc
  isTemplate      Boolean @default(false)
  templateCategory String?      // compliance, operations, executive
  visibility      String @default("PRIVATE") // PRIVATE, TEAM, EVERYONE
  lastRunAt       DateTime?
  lastRunDuration Int?          // milliseconds
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdById     String
  scheduledExportId String?     // Link to ScheduledExport if scheduled
}
```

### API Endpoints Needed

```
GET    /api/v1/reports/fields/:entityType    # Field registry
GET    /api/v1/reports                        # List saved reports
POST   /api/v1/reports                        # Create report
GET    /api/v1/reports/:id                    # Get report config
PUT    /api/v1/reports/:id                    # Update report
DELETE /api/v1/reports/:id                    # Delete report
POST   /api/v1/reports/:id/run               # Execute report (returns data)
POST   /api/v1/reports/:id/export            # Export report results
GET    /api/v1/reports/templates              # List pre-built templates
POST   /api/v1/reports/ai-generate           # AI natural language → report
POST   /api/v1/reports/:id/schedule          # Schedule recurring delivery
```

### Frontend Pages Needed

```
/reports                    # Report list (My Reports, Shared, Templates)
/reports/new                # Report designer wizard
/reports/:id                # Report detail / results viewer
/reports/:id/edit           # Edit report configuration
```

## Reuse Strategy

**Maximize reuse from Phase 13 saved views:**
- ColumnSelectionModal → field picker in report designer
- AdvancedFiltersPanel → filter builder in report designer
- DataTable → report results table view
- ExportButton → export from report results

**Maximize reuse from Phase 11 backend:**
- QueryToPrismaService → extend with dynamic field registry
- ExcelExportService → report export
- ScheduledExportService → scheduled report delivery
- AiQueryService → AI report generation
- BoardReportService → PDF report export

## Estimated Plans

| Plan | Wave | What it builds |
|------|------|----------------|
| 18-01 | 1 | SavedReport Prisma model, ReportFieldRegistryService, Report CRUD service |
| 18-02 | 1 | Report execution engine (extends QueryToPrisma with dynamic fields) |
| 18-03 | 2 | Report REST API controller with all endpoints |
| 18-04 | 2 | Pre-built report templates and demo data seeder |
| 18-05 | 3 | Report list page (/reports) with tabs for My Reports, Shared, Templates |
| 18-06 | 3 | Report designer wizard UI (data source → fields → filters → viz → save) |
| 18-07 | 4 | Report results viewer with chart rendering and export |
| 18-08 | 4 | AI report generation UI + export-from-views wiring |
| 18-09 | 5 | Scheduled report delivery UI + verification checkpoint |

## Pitfalls

1. **Field explosion**: Entity relationships create many fields. Group and paginate the field picker.
2. **Performance**: Complex reports with many joins. Use cursor-based pagination and streaming for large results.
3. **Custom properties**: Per-tenant custom fields must be dynamically discovered, not hardcoded.
4. **Visualization mismatch**: Not all data shapes work with all chart types. Validate compatibility.
5. **Export consistency**: Report export must match what's displayed on screen (same filters, columns, sort).

## RESEARCH COMPLETE
