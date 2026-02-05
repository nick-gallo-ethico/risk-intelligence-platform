---
phase: 11
plan: 08
subsystem: analytics
tags: [ai, natural-language, query, dashboard, claude]
dependency-graph:
  requires: [05-01, 05-04]
  provides: [ai-natural-language-query, query-to-prisma]
  affects: [11-09, 11-10]
tech-stack:
  added: []
  patterns: [structured-output-parsing, field-whitelisting, fallback-parser]
key-files:
  created:
    - apps/backend/src/modules/analytics/ai-query/dto/ai-query.dto.ts
    - apps/backend/src/modules/analytics/ai-query/query-to-prisma.service.ts
    - apps/backend/src/modules/analytics/ai-query/ai-query.service.ts
    - apps/backend/src/modules/analytics/ai-query/index.ts
  modified:
    - apps/backend/prisma/schema.prisma
decisions:
  - id: anal-ai-query-field-whitelist
    description: Security-first field whitelisting prevents SQL injection and data exposure
  - id: anal-ai-query-fallback
    description: Fallback parser when AI unavailable for basic query functionality
  - id: anal-ai-query-visualization
    description: Auto-select visualization based on query intent and result type
metrics:
  duration: 19 min
  completed: 2026-02-05
---

# Phase 11 Plan 08: AI Natural Language Query Service Summary

**One-liner:** AI-powered natural language query service enabling users to query compliance data using plain English with auto-visualization selection.

## What Was Built

### 1. AI Query DTOs (Task 1)

Created comprehensive DTO structure for AI query API:

- **AiQueryRequestDto**: Natural language query input with optional date range and context
- **AiQueryResponseDto**: Response with interpreted query, summary, visualization, and data
- **VisualizationType enum**: KPI, TABLE, LINE_CHART, BAR_CHART, PIE_CHART, TEXT
- **QueryIntent enum**: COUNT, LIST, AGGREGATE, TREND, DISTRIBUTION, COMPARISON
- **ParsedQuery interface**: Structured output from Claude for query interpretation
- **Result data types**: KpiResultData, TableResultData, ChartResultData, TextResultData

### 2. QueryToPrismaService (Task 2)

Security-focused query builder with field whitelisting:

- **ALLOWED_FIELDS whitelist**: Per-entity type field definitions with type info
  - Case: status, severity, outcome, createdAt, categoryId, businessUnitId, etc.
  - RIU: type, sourceChannel, reporterType, status, severity, categoryId, etc.
  - Campaign: type, status, launchAt, dueDate, audienceMode, etc.
  - Person: type, source, businessUnitName, jobTitle, locationName, etc.
  - Disclosure: type, status, riskLevel, submittedAt, reviewedAt, etc.
  - Investigation: status, assigneeId, outcome, startedAt, completedAt, etc.

- **buildWhereClause()**: Validates fields and converts to Prisma format with tenant isolation
- **buildOrderBy()**: Field validation for sorting
- **buildGroupBy()**: Field validation for aggregations
- **parseTimeRange()**: Preset support (today, last_7_days, this_month, this_quarter, etc.)
- **toPrismaCondition()**: Operator mapping (eq, neq, gt, contains, in, between, etc.)

### 3. AiQueryService (Task 3)

Main query execution service with Claude integration:

- **executeQuery()**: Main entry point with rate limiting and logging
- **parseQueryWithAi()**: Uses Claude structured output to parse natural language
- **executeQueryByIntent()**: Routes to appropriate query handler based on intent
  - executeCountQuery(): Returns KPI with period comparison
  - executeListQuery(): Returns paginated table
  - executeDistributionQuery(): Returns pie/bar chart for groupings
  - executeTrendQuery(): Returns line chart for time series
  - executeAggregateQuery(): Returns KPI for sum/avg/min/max
  - executeComparisonQuery(): Returns bar chart for comparisons
- **selectVisualization()**: Auto-selects chart type based on result shape
- **generateSummary()**: Human-readable result summary
- **generateSuggestions()**: Follow-up query recommendations
- **Fallback parser**: Pattern-based parsing when AI unavailable

### 4. AiQueryHistory Model

Added Prisma model for query analytics:

```prisma
model AiQueryHistory {
  id                String @id
  organizationId    String
  userId            String
  query             String @db.Text
  parsedQuery       Json
  visualizationType String
  resultSummary     String?
  processingTimeMs  Int
  inputTokens       Int?
  outputTokens      Int?
  createdAt         DateTime @default(now())
}
```

## Key Technical Decisions

### Decision 1: Field Whitelisting for Security

All queryable fields are explicitly whitelisted per entity type. This prevents:
- SQL injection via field names
- Access to sensitive fields (PII, internal data)
- Unintended joins exposing cross-tenant data

### Decision 2: Fallback Parser

When Claude is unavailable, a pattern-based fallback parser handles basic queries:
- Detects entity type from keywords (case, riu, campaign, person, disclosure)
- Detects intent from patterns ("how many", "trend", "by status")
- Returns lower confidence score (0.5 vs 0.95)

### Decision 3: Auto-Visualization Selection

Visualization is automatically selected based on query intent and result shape:
- COUNT -> KPI
- LIST -> TABLE
- DISTRIBUTION -> PIE (<=6 categories) or BAR (>6 categories)
- TREND -> LINE_CHART
- COMPARISON -> BAR_CHART

## Example Queries Supported

| Query | Intent | Visualization |
|-------|--------|---------------|
| "How many cases are open?" | COUNT | KPI |
| "Show me harassment cases from Q4" | LIST | TABLE |
| "Cases by status" | DISTRIBUTION | PIE_CHART |
| "Case trend over the last year" | TREND | LINE_CHART |
| "Compare cases by severity" | COMPARISON | BAR_CHART |
| "Average investigation duration" | AGGREGATE | KPI |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 25803d5 | feat | Add AI Query DTOs for natural language dashboard queries |
| d091c36 | feat | Add QueryToPrismaService with field whitelisting for security |
| f339156 | feat | Add AiQueryService for natural language dashboard queries |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

### For Plan 11-09 (Dashboard Controller)

- AiQueryService is exported and ready for controller integration
- DTOs define complete request/response contracts
- Rate limiting integrated for API endpoint protection

### Required Follow-up

1. Run `npx prisma generate` after schema changes
2. Create migration for AiQueryHistory table
3. Add AiQueryController for REST endpoints (Plan 11-09)
4. Integrate with dashboard frontend (Plan 11-10+)
