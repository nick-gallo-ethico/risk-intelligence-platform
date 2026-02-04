---
phase: 09-campaigns-disclosures
plan: 12
subsystem: reporting
tags: [user-tables, custom-reports, scheduling, export]
dependency-graph:
  requires: ["09-11"]
  provides: ["user-data-tables", "table-scheduling", "table-export"]
  affects: ["10-dashboards", "14-analytics"]
tech-stack:
  added: []
  patterns: ["query-builder", "scheduled-jobs", "soft-delete"]
key-files:
  created:
    - apps/backend/prisma/schema.prisma (UserDataTable model)
    - apps/backend/src/modules/tables/user-table.service.ts
    - apps/backend/src/modules/tables/user-table.controller.ts
    - apps/backend/src/modules/tables/tables.module.ts
    - apps/backend/src/modules/tables/dto/create-table.dto.ts
    - apps/backend/src/modules/tables/types/table.types.ts
  modified:
    - apps/backend/src/app.module.ts
decisions:
  - decision: "Use string_contains for JSON array filter on destinations"
    rationale: "Prisma path filtering complex; string match sufficient for basic use"
    alternatives: ["Custom raw SQL", "Normalized junction table"]
  - decision: "Soft delete pattern for tables"
    rationale: "Allow recovery; audit trail preservation"
  - decision: "BullMQ repeatable jobs for scheduled delivery"
    rationale: "Consistent with existing job infrastructure"
metrics:
  duration: 19 min
  completed: 2026-02-04
---

# Phase 9 Plan 12: User-Created Tables Summary

User-created custom data tables with dual-path creation, scheduled delivery, and visibility controls (RS.48)

## What Was Built

### 1. UserDataTable Prisma Model

**File:** `apps/backend/prisma/schema.prisma`

New model supporting:
- Dual-path creation: BUILDER, AI_GENERATED, IMPORT
- Multi-source data queries with columns, filters, groupBy, aggregates
- Destinations for dashboard pinning
- Visibility controls: PRIVATE, TEAM, ORG
- Schedule configuration with frequency, recipients, format
- Cached results with expiration
- Soft delete support

New enums:
- `TableCreationMethod` - How table was created
- `TableVisibility` - Sharing scope

### 2. UserTableService

**File:** `apps/backend/src/modules/tables/user-table.service.ts`

Full CRUD plus execution:
- `create()` - Create table with optional AI prompt
- `update()` - Update definition, invalidates cache
- `execute()` - Run query with Prisma dynamic model access
- `refresh()` - Re-execute and cache results
- `export()` - Generate CSV/Excel (PDF falls back to Excel)
- `schedule()` - Configure BullMQ repeatable job
- `share()` - Update visibility and share targets
- `clone()` - Duplicate table with new name
- `findMany()` - List with visibility filtering
- `delete()` - Soft delete

Key features:
- Dynamic Prisma model access via dataSourceModelMap
- Filter building matches QueryBuilderService pattern
- Permission checking: creator has full access, others by visibility
- Excel generation with headers, formatting, auto-filter
- CSV generation with proper escaping
- Cron pattern generation from schedule config

### 3. UserTableController

**File:** `apps/backend/src/modules/tables/user-table.controller.ts`

REST API endpoints:
```
POST   /api/v1/tables           - Create table
GET    /api/v1/tables           - List tables
GET    /api/v1/tables/:id       - Get table
PUT    /api/v1/tables/:id       - Update table
DELETE /api/v1/tables/:id       - Delete table
POST   /api/v1/tables/:id/execute   - Execute query
POST   /api/v1/tables/:id/refresh   - Refresh cache
POST   /api/v1/tables/:id/export    - Export CSV/Excel/PDF
POST   /api/v1/tables/:id/schedule  - Configure delivery
POST   /api/v1/tables/:id/share     - Update sharing
POST   /api/v1/tables/:id/clone     - Clone table
```

Guards: JwtAuthGuard, TenantGuard, RolesGuard
Roles: SYSTEM_ADMIN, COMPLIANCE_OFFICER, TRIAGE_LEAD, INVESTIGATOR, POLICY_AUTHOR (EMPLOYEE for read-only)

### 4. TablesModule

**File:** `apps/backend/src/modules/tables/tables.module.ts`

- Imports ReportingModule for export infrastructure
- Registers TABLE_DELIVERY_QUEUE for scheduled delivery
- Exports UserTableService for cross-module use

## Key Implementation Details

### Data Source Mapping

```typescript
dataSourceModelMap: Record<TableDataSource, string> = {
  cases: "case",
  investigations: "investigation",
  rius: "riskIntelligenceUnit",
  campaigns: "campaign",
  campaign_assignments: "campaignAssignment",
  disclosures: "formSubmission",
  employees: "employee",
  persons: "person",
  users: "user",
  audit_logs: "auditLog",
};
```

### Schedule Cron Generation

```typescript
// Daily at 8:00 AM
pattern = "0 0 8 * * *"

// Weekly Monday at 8:00 AM
pattern = "0 0 8 * * 1"

// Monthly 1st at 8:00 AM
pattern = "0 0 8 1 * *"
```

### Visibility Permission Logic

1. Creator always has full access
2. PRIVATE: Only creator
3. TEAM: Creator + sharedWithUsers + sharedWithTeams members
4. ORG: All organization users

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Commit | Description |
|--------|-------------|
| 38eb4fc | Add UserDataTable model with scheduling and sharing |
| 382ae31 | Add UserTableService with CRUD, execution, export, scheduling |
| eb3cdab | Add UserTableController and TablesModule with REST endpoints |

## Verification Results

- Prisma schema validates successfully
- TypeScript compiles without errors
- All endpoints properly guarded with roles

## Next Phase Readiness

**Dependencies Satisfied:**
- Schema introspection (09-11) not directly used yet - can be integrated for AI table generation
- Export service from ReportingModule available

**Ready for:**
- Dashboard pinning integration
- AI-generated table creation via natural language prompts
- Scheduled delivery processor implementation

## Files Created/Modified

**Created:**
- `apps/backend/src/modules/tables/user-table.service.ts`
- `apps/backend/src/modules/tables/user-table.controller.ts`
- `apps/backend/src/modules/tables/tables.module.ts`
- `apps/backend/src/modules/tables/dto/create-table.dto.ts`
- `apps/backend/src/modules/tables/dto/index.ts`
- `apps/backend/src/modules/tables/types/table.types.ts`
- `apps/backend/src/modules/tables/types/index.ts`
- `apps/backend/src/modules/tables/index.ts`

**Modified:**
- `apps/backend/prisma/schema.prisma` - Added UserDataTable model, enums, relations
- `apps/backend/src/app.module.ts` - Registered TablesModule
