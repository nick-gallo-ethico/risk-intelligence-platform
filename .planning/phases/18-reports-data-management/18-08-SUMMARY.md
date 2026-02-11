---
phase: 18
plan: 08
subsystem: frontend-reports
tags: [ai-reports, natural-language, export, ui-components]
requires: ["18-03"]
provides:
  - "AiReportGenerator dialog component"
  - "Backend export integration for ExportButton"
affects: ["18-09"]
tech-stack:
  added: []
  patterns:
    - "AI natural language report generation"
    - "Export job polling with timeout"
    - "Client-side vs backend export strategy"
key-files:
  created:
    - "apps/frontend/src/components/reports/AiReportGenerator.tsx"
  modified:
    - "apps/frontend/src/components/views/ExportButton.tsx"
decisions:
  - id: "18-08-001"
    title: "Small dataset threshold for client-side export"
    choice: "100 rows threshold"
    rationale: "Client-side export is faster for small datasets; backend needed for larger ones"
  - id: "18-08-002"
    title: "Export polling interval and timeout"
    choice: "3 second interval, 5 minute timeout"
    rationale: "Balance between responsiveness and server load"
metrics:
  duration: "~5 minutes"
  completed: "2026-02-11"
---

# Phase 18 Plan 08: AI Report Generator and Export Integration Summary

AI natural language report generation dialog and backend export infrastructure integration for saved views.

## Completed Tasks

| Task | Name                                               | Commit  | Files                 |
| ---- | -------------------------------------------------- | ------- | --------------------- |
| 1    | AiReportGenerator dialog component                 | 2b032ff | AiReportGenerator.tsx |
| 2    | Wire ExportButton to backend export infrastructure | e4db332 | ExportButton.tsx      |

## What Was Built

### Task 1: AiReportGenerator Dialog Component

Created a comprehensive dialog component for AI-powered report generation from natural language queries.

**Features:**

- Natural language textarea input for report queries
- 5 clickable example queries for quick start
- Loading state with animated spinner
- AI interpretation display showing how the query was understood
- Results preview table with column/row truncation for large datasets
- Report configuration summary (entity type, field count, filter count, visualization)
- "Save as Report" action to persist the generated report
- "Refine" action to edit and regenerate
- Error handling for:
  - AI unavailable (503)
  - Rate limits (429)
  - Empty results
  - Generic errors

**Example Queries Provided:**

1. "Show me all harassment cases from Q4 2025"
2. "What are the top 5 categories by case volume this year?"
3. "How many cases are overdue by severity level?"
4. "Compare disclosure completion rates across business units"
5. "Monthly trend of new cases over the last 12 months"

### Task 2: ExportButton Backend Integration

Enhanced the ExportButton component to support the backend flat-file export infrastructure.

**Features:**

- Added PDF export format option
- Smart export strategy:
  - Small datasets (<100 rows): Client-side export for speed
  - Large datasets (>=100 rows): Backend export job with polling
- Export job polling every 3 seconds
- 5 minute timeout with user-friendly error message
- Loading state shows format indicator ("Exporting XLSX...")
- Entity type mapping to backend ExportType enum
- Toast notifications for:
  - Export started
  - Export ready (download triggered)
  - Export failed
  - Export timeout

**Entity Type Mapping:**

- cases -> CASES
- investigations -> INVESTIGATIONS
- rius -> RIUS
- policies -> POLICIES
- campaigns -> CAMPAIGNS
- disclosures -> DISCLOSURES
- persons -> PERSONS
- employees -> EMPLOYEES

## Deviations from Plan

None - plan executed exactly as written.

## API Integration

### Reports API

- `reportsApi.aiGenerate(query)` - Generate report from natural language

### Exports API

- `POST /exports/flat-file` - Create export job
- `GET /exports/{jobId}` - Poll job status
- `GET /exports/{jobId}/download` - Download completed export

## Files Changed

```
apps/frontend/src/components/
  reports/
    AiReportGenerator.tsx     [+441 lines] NEW
  views/
    ExportButton.tsx          [+267 lines] MODIFIED
```

## Technical Notes

1. **AiReportGenerator** uses shadcn/ui Dialog components with proper accessibility
2. **ExportButton** maintains backward compatibility with existing client-side export
3. Polling cleanup on component unmount prevents memory leaks
4. Error type detection uses HTTP status codes and message content

## Next Phase Readiness

This plan completes Wave 4 frontend components. Ready for:

- Plan 18-09: Report scheduling UI integration

## Verification

- TypeScript compiles without errors (for new files)
- AiReportGenerator exports as named export
- ExportButton handles both small and large dataset exports
