---
phase: 18
plan: 02
subsystem: reports-engine
tags: [reports, analytics, prisma, crud, tenant-isolation]
dependency-graph:
  requires: [18-01]
  provides: [report-execution-service, report-crud-service]
  affects: [18-03, 18-04, 18-05, 18-06, 18-07]
tech-stack:
  added: []
  patterns: [prisma-dynamic-model-access, json-serialization-for-prisma, audit-logging]
key-files:
  created:
    - apps/backend/src/modules/analytics/reports/report-execution.service.ts
    - apps/backend/src/modules/analytics/reports/report.service.ts
  modified: []
decisions:
  - key: dynamic-model-access
    choice: Use (this.prisma as unknown)[modelName] pattern for dynamic model access
    rationale: Follows QueryToPrismaService pattern; allows executing reports against any entity type
  - key: json-serialization
    choice: Use JSON.parse(JSON.stringify()) for Prisma JSON fields
    rationale: Avoids TypeScript type errors with Prisma.JsonValue; ensures clean JSON input
  - key: filter-flattening
    choice: Flatten nested filter groups into flat array for execution
    rationale: ReportExecutionService works with flat filters; nested groups are a UI concern
metrics:
  duration: ~30 minutes
  completed: 2026-02-11
---

# Phase 18 Plan 02: Report Execution & CRUD Services Summary

Core backend services for the report designer: ReportExecutionService runs reports against the database, ReportService manages saved report CRUD.

## What Was Built

### Task 1: ReportExecutionService (commit 72eee7d)

Created `report-execution.service.ts` that translates report configurations into Prisma queries:

**Entity Type Support:**
- cases -> Case model
- rius -> RiskIntelligenceUnit model
- persons -> Person model
- campaigns -> Campaign model
- policies -> Policy model
- disclosures -> DisclosureSubmission model
- investigations -> Investigation model

**Filter Operators:**
- eq, neq, gt, gte, lt, lte, contains, in, notIn, isNull, isNotNull, between

**Query Types:**
1. **List Queries**: Standard findMany with pagination (default 1000, max 10000 rows)
2. **Grouped Aggregation**: Prisma groupBy with _count, _sum, _avg, _min, _max

**Features:**
- Tenant isolation via organizationId in all WHERE clauses
- Relationship field resolution (categoryName -> primaryCategory.name via includes)
- Computed fields (daysOpen calculated post-query)
- Slow query logging (>5s threshold)

### Task 2: ReportService (commit 17bf85f)

Created `report.service.ts` for SavedReport CRUD:

**CRUD Methods:**
- `create(orgId, userId, dto)` - Create report with entity type validation
- `findAll(orgId, userId, query)` - List with visibility filtering and pagination
- `findOne(orgId, reportId)` - Get single report
- `update(orgId, userId, reportId, dto, userRole)` - Update with permission check
- `delete(orgId, userId, reportId, userRole)` - Delete with permission check

**Additional Methods:**
- `run(orgId, reportId, options)` - Execute report, update lastRunAt/Duration/RowCount
- `duplicate(orgId, userId, reportId)` - Clone report as PRIVATE
- `toggleFavorite(orgId, userId, reportId)` - Toggle isFavorite
- `getTemplates(orgId)` - List templates (isTemplate=true)

**Visibility Rules:**
- PRIVATE: Only visible to creator
- TEAM: Visible to organization members
- EVERYONE: Visible to all in organization

**Permission Rules:**
- Only creator or SYSTEM_ADMIN can update/delete
- All users can create, read their own + shared, run, duplicate, favorite

## Key Patterns Established

### Dynamic Prisma Model Access
```typescript
const model = (this.prisma as unknown as Record<string, unknown>)[modelName] as {
  findMany: (args: unknown) => Promise<unknown[]>;
  count: (args: { where: Record<string, unknown> }) => Promise<number>;
};
```

### JSON Serialization for Prisma
```typescript
// Avoids TypeScript errors with Prisma.JsonValue
columns: JSON.parse(JSON.stringify(dto.columns)),
groupBy: dto.groupBy ? JSON.parse(JSON.stringify(dto.groupBy)) : Prisma.JsonNull,
```

### Audit Logging Pattern
```typescript
await this.auditService.log({
  organizationId,
  entityType: AuditEntityType.REPORT,
  entityId: report.id,
  action: "created",
  actionCategory: AuditActionCategory.CREATE,
  actionDescription: `Created report '${dto.name}' for ${dto.entityType}`,
  actorUserId: userId,
  actorType: ActorType.USER,
});
```

## Verification Results

- TypeScript compiles without errors
- ReportExecutionService exports runReport method
- ReportService exports all CRUD methods
- Both services enforce organizationId (tenant isolation)

## Deviations from Plan

None - plan executed exactly as written.

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| report-execution.service.ts | Execute report configs against database | ~590 |
| report.service.ts | SavedReport CRUD operations | ~740 |

## Next Phase Readiness

Ready for 18-03 (Report REST API controller) which will wire these services to HTTP endpoints.
