# Ralph-Ready Tasks: Slice 1.3 - Core Entities & Activity Logging

**Purpose:** Detailed, AI-executable task breakdown for autonomous development.
**Slice Goal:** Unified audit logging with natural language descriptions and activity timeline.
**Reference:** [01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md](../01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md) Section 7 - Unified Audit Log

---

## Task Format Explanation

Each task follows this structure:
- **Prompt:** What to tell the AI
- **Input Files:** Files AI must read first
- **Output Files:** Files AI will create/modify
- **Verification:** Commands that must ALL pass
- **Stop Condition:** When to stop or ask for help
- **Dependencies:** What must be complete first

---

## Task 1.3.1: AuditLog Entity - Prisma Schema

**GitHub Issue:** #TBD
**Estimate:** 1.5 hours

### Prompt for AI
```
Create the AuditLog entity in Prisma schema following:
- `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` Section 7 - Unified Audit Log schema
- `apps/backend/examples/entity-pattern.prisma` - Entity structure

Include:
1. Core fields: id, organizationId, createdAt
2. Entity reference (polymorphic): entityType enum, entityId
3. Action fields: action, actionCategory enum, actionDescription (natural language)
4. Actor fields: actorUserId, actorType enum, actorName (denormalized)
5. Change tracking: changes JSON, context JSON
6. Request metadata: ipAddress, userAgent, requestId
7. AuditEntityType enum (CASE, INVESTIGATION, DISCLOSURE, POLICY, USER, etc.)
8. AuditActionCategory enum (CREATE, UPDATE, DELETE, ACCESS, SYSTEM, SECURITY, AI)
9. ActorType enum (USER, SYSTEM, AI, INTEGRATION, ANONYMOUS)
10. Proper indexes for query patterns (org+time, org+entity+time, org+actor+time)

Note: AuditLog is append-only - no updatedAt field, no soft deletes.
```

### Input Files (READ FIRST)
- `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` - Section 7 for exact schema
- `apps/backend/examples/entity-pattern.prisma` - Pattern structure
- `apps/backend/prisma/schema.prisma` - Current schema to extend

### Output Files
- `apps/backend/prisma/schema.prisma` (add AuditLog, enums)
- `apps/backend/prisma/migrations/YYYYMMDD_add_audit_log/migration.sql` (generated)

### Verification (ALL MUST PASS)
```bash
# Prisma schema is valid
cd apps/backend && npx prisma validate

# Migration generates and applies
cd apps/backend && npx prisma migrate dev --name add_audit_log

# Prisma client generates
cd apps/backend && npx prisma generate

# TypeScript compiles (new types available)
cd apps/backend && npm run typecheck
```

### Stop Condition
- All verification commands pass
- Schema matches CORE-DATA-MODEL.md Section 7
- OR if unclear about enum values, document in BLOCKERS.md

### Dependencies
- Slice 1.1 complete (base schema exists)

### Notes
- AuditLog is immutable - no update operations needed
- actionDescription MUST be a natural language sentence
- changes JSON stores { field: { old, new } } format
- Denormalize actorName for display without joins

---

## Task 1.3.2: AuditLog RLS Policies

**GitHub Issue:** Part of #TBD
**Estimate:** 30 minutes

### Prompt for AI
```
Add PostgreSQL Row-Level Security policies for the AuditLog table.

Follow the pattern in:
- `apps/backend/prisma/migrations/20260129221829_add_rls_policies/migration.sql`

Create policies that:
1. Enable RLS on audit_log table
2. Filter reads by current_setting('app.current_organization')
3. Restrict inserts to same organization
4. NO update or delete policies (audit logs are immutable)
5. Allow bypass when app.bypass_rls = 'true'

IMPORTANT: Audit logs should never be updated or deleted.
```

### Input Files (READ FIRST)
- `apps/backend/prisma/migrations/20260129221829_add_rls_policies/migration.sql` - Existing RLS pattern
- `apps/backend/prisma/schema.prisma` - Current schema with AuditLog entity

### Output Files
- `apps/backend/prisma/migrations/YYYYMMDD_add_audit_log_rls/migration.sql`

### Verification (ALL MUST PASS)
```bash
# Migration applies
cd apps/backend && npx prisma migrate dev --name add_audit_log_rls

# RLS policies exist (check in database)
# Run this SQL: SELECT * FROM pg_policies WHERE tablename = 'audit_log';
# Should return rows for select and insert policies only
```

### Stop Condition
- Migration applies successfully
- RLS policies visible in pg_policies view
- No UPDATE or DELETE policies exist
- OR document issues in BLOCKERS.md

### Dependencies
- Task 1.3.1 (AuditLog entity exists)

---

## Task 1.3.3: Activity Service DTOs

**GitHub Issue:** Part of #TBD
**Estimate:** 1 hour

### Prompt for AI
```
Create DTOs for ActivityService following:
- `apps/backend/examples/dto-pattern.ts` - DTO structure

Create:
1. CreateActivityDto - for logging new activity
   - entityType: AuditEntityType (required)
   - entityId: string (required)
   - action: string (required)
   - actionDescription: string (required, human-readable)
   - actionCategory?: AuditActionCategory
   - changes?: { oldValue: any, newValue: any }
   - context?: object
   - metadata?: object

2. ActivityQueryDto - for querying activity timeline
   - entityType?: AuditEntityType
   - entityId?: string
   - actorUserId?: string
   - actionCategory?: AuditActionCategory
   - startDate?: Date
   - endDate?: Date
   - page?: number
   - limit?: number

3. ActivityResponseDto - for API responses
   - All AuditLog fields
   - actorUser?: { id, name, email } (expanded relation)

Remember:
- NEVER include organizationId in CreateActivityDto (set from context)
- actorUserId can be null for system actions
- actionDescription MUST be validated as non-empty string
```

### Input Files (READ FIRST)
- `apps/backend/examples/dto-pattern.ts` - MUST follow this structure
- `apps/backend/prisma/schema.prisma` - AuditLog field definitions
- `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` - Standard action types

### Output Files
- `apps/backend/src/common/dto/create-activity.dto.ts`
- `apps/backend/src/common/dto/activity-query.dto.ts`
- `apps/backend/src/common/dto/activity-response.dto.ts`
- `apps/backend/src/common/dto/index.ts`

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Lint passes
cd apps/backend && npm run lint
```

### Stop Condition
- All verification commands pass
- DTOs cover all standard action patterns from CORE-DATA-MODEL.md
- OR document unclear requirements in BLOCKERS.md

### Dependencies
- Task 1.3.1 (AuditLog types exist)

---

## Task 1.3.4: Natural Language Description Generator

**GitHub Issue:** #TBD
**Estimate:** 2 hours

### Prompt for AI
```
Create a utility service for generating natural language action descriptions.

Following the standard action types from:
- `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` - Section on Standard Action Types

Create ActivityDescriptionGenerator service that:

1. Provides template-based description generation:
   - created: "{Actor} created {entityType}" -> "John created Case"
   - updated: "{Actor} updated {fields} on {entityType}" -> "John updated status, assignee on Case"
   - deleted: "{Actor} deleted {entityType}" -> "John deleted Case"
   - status_changed: "{Actor} changed status from {old} to {new}" -> "John changed status from OPEN to IN_PROGRESS"
   - assigned: "{Actor} assigned {entityType} to {assignee}" -> "John assigned Case to Sarah"
   - commented: "{Actor} added comment on {entityType}" -> "John added comment on Case"
   - approved: "{Actor} approved {entityType}" -> "John approved Policy"
   - ai_generated: "AI generated {contentType} for {entityType}" -> "AI generated summary for Case"

2. Handles special cases:
   - System actions (no actor): "System updated {entityType}"
   - AI actions: "AI {action} {entityType}"
   - Anonymous actions: "Anonymous reporter {action}"
   - Bulk changes: "{Actor} updated {count} fields on {entityType}"

3. Provides a fallback for unknown actions:
   - "{Actor} performed {action} on {entityType}"

4. Is stateless and injectable as a NestJS service
```

### Input Files (READ FIRST)
- `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` - Standard Action Types table
- `apps/backend/examples/service-pattern.ts` - Service structure

### Output Files
- `apps/backend/src/common/services/activity-description.service.ts`
- `apps/backend/src/common/services/activity-description.service.spec.ts` (unit tests)

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Unit tests pass
cd apps/backend && npm test -- --testPathPattern="activity-description"

# Tests should cover:
# - "should generate description for create action"
# - "should generate description for status change with values"
# - "should generate description for system actions (no actor)"
# - "should generate description for AI actions"
# - "should handle unknown actions with fallback"
```

### Stop Condition
- All verification commands pass
- All standard action types from CORE-DATA-MODEL.md are supported
- Unit test coverage > 80%
- OR document edge cases in BLOCKERS.md

### Dependencies
- Task 1.3.3 (DTOs exist)

---

## Task 1.3.5: Activity Service Implementation

**GitHub Issue:** #TBD
**Estimate:** 3 hours

### Prompt for AI
```
Create ActivityService following:
- `apps/backend/examples/service-pattern.ts` - Service structure

Implement:
1. log() - Create audit log entry
   - Auto-set organizationId from context
   - Auto-set actorUserId from context (if available)
   - Denormalize actorName from User lookup
   - Set createdAt to now()
   - Generate actionDescription using ActivityDescriptionGenerator if not provided
   - Capture request metadata (IP, userAgent) if available

2. getEntityTimeline() - Get activity for specific entity
   - Filter by entityType and entityId
   - Filter by organizationId (CRITICAL)
   - Order by createdAt DESC
   - Paginate results
   - Include actor user details (expanded)

3. getOrganizationActivity() - Get recent activity for org
   - Filter by organizationId
   - Optional filter by actionCategory
   - Optional filter by date range
   - Order by createdAt DESC
   - Paginate results

4. getUserActivity() - Get activity by specific user
   - Filter by actorUserId and organizationId
   - Order by createdAt DESC
   - Paginate results

Requirements:
- ALL queries filter by organizationId (RLS provides backup)
- Service is async/await throughout
- Handle null actorUserId for system actions
- Log errors but don't throw (activity logging should not break main flow)
```

### Input Files (READ FIRST)
- `apps/backend/examples/service-pattern.ts` - MUST follow this structure
- `apps/backend/src/common/dto/` - DTOs from previous task
- `apps/backend/src/common/services/activity-description.service.ts` - Description generator
- `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` - AuditLog schema

### Output Files
- `apps/backend/src/common/services/activity.service.ts`
- `apps/backend/src/common/services/activity.service.spec.ts` (unit tests)

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Unit tests pass
cd apps/backend && npm test -- --testPathPattern="activity.service"

# Tests should include:
# - "should create activity log with correct organization"
# - "should denormalize actor name"
# - "should handle system actions (no actor)"
# - "should not throw when logging fails"
# - "should filter timeline by organization"
# - "should paginate results correctly"
```

### Stop Condition
- All verification commands pass
- Unit tests cover tenant isolation
- Activity logging is non-blocking (errors logged, not thrown)
- OR document blockers

### Dependencies
- Task 1.3.3 (DTOs exist)
- Task 1.3.4 (Description generator exists)

---

## Task 1.3.6: Activity Controller & Module

**GitHub Issue:** #TBD
**Estimate:** 2 hours

### Prompt for AI
```
Create ActivityController and ActivityModule following:
- `apps/backend/examples/controller-pattern.ts` - Controller structure

Implement endpoints:
- GET /api/v1/activity - Get organization-wide activity (paginated)
- GET /api/v1/activity/entity/:entityType/:entityId - Get entity timeline
- GET /api/v1/activity/user/:userId - Get user's activity history

Query parameters for all endpoints:
- page?: number (default 1)
- limit?: number (default 20, max 100)
- startDate?: ISO date string
- endDate?: ISO date string
- actionCategory?: AuditActionCategory

Requirements:
- All routes protected by JwtAuthGuard and TenantGuard
- GET /api/v1/activity requires COMPLIANCE_OFFICER or SYSTEM_ADMIN role
- GET /api/v1/activity/entity/* allows any authenticated user (filtered by org)
- GET /api/v1/activity/user/:userId only allowed for self or ADMIN roles
- Swagger documentation

Also create ActivityModule that:
- Exports ActivityService for use by other modules
- Provides ActivityDescriptionGenerator
- Registers as global module (available everywhere)
```

### Input Files (READ FIRST)
- `apps/backend/examples/controller-pattern.ts` - MUST follow this structure
- `apps/backend/src/common/services/activity.service.ts` - Service
- `apps/backend/src/common/dto/` - DTOs

### Output Files
- `apps/backend/src/common/controllers/activity.controller.ts`
- `apps/backend/src/common/activity.module.ts`
- Update `apps/backend/src/app.module.ts` to import ActivityModule

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Lint passes
cd apps/backend && npm run lint

# Backend starts without errors
cd apps/backend && timeout 15 npm run start:dev || true

# Endpoints accessible (with auth)
curl -X GET "http://localhost:3000/api/v1/activity?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Stop Condition
- All verification commands pass
- All endpoints respond correctly with auth
- OR document blockers

### Dependencies
- Task 1.3.5 (Service exists)

---

## Task 1.3.7: Activity Timeline E2E Tests

**GitHub Issue:** Part of #TBD
**Estimate:** 2 hours

### Prompt for AI
```
Create E2E tests for Activity timeline following:
- `apps/backend/examples/e2e-test-pattern.spec.ts`
- Use the test utilities created in Task 1.2.1

Test scenarios:
1. Tenant Isolation:
   - Org B cannot see Org A's activity logs
   - Activity logs filtered by current organization

2. Entity Timeline:
   - Creating entity generates activity log
   - Updating entity generates activity log
   - Status change generates activity log with old/new values
   - Timeline returns activities in descending order

3. Activity Query:
   - Can filter by date range
   - Can filter by action category
   - Pagination works correctly

4. Access Control:
   - Non-admin cannot access org-wide activity
   - User can access their own activity
   - User cannot access another user's activity (unless admin)

5. Natural Language Descriptions:
   - Created activity has human-readable description
   - Updated activity describes changed fields
   - Status changed activity includes old and new values
```

### Input Files (READ FIRST)
- `apps/backend/examples/e2e-test-pattern.spec.ts` - Test structure
- `apps/backend/test/utils/` - Test utilities
- `apps/backend/src/common/` - Activity implementation

### Output Files
- `apps/backend/test/activity/activity.e2e-spec.ts`
- `apps/backend/test/activity/activity-tenant-isolation.e2e-spec.ts`

### Verification (ALL MUST PASS)
```bash
# E2E tests pass
cd apps/backend && npm run test:e2e -- --testPathPattern="activity"

# Tenant isolation tests pass
cd apps/backend && npm run test:tenant-isolation
```

### Stop Condition
- All E2E tests pass
- Tenant isolation verified
- Natural language descriptions verified
- OR document any test failures in BLOCKERS.md

### Dependencies
- Task 1.3.6 (Controller exists)
- Task 1.2.1 (Test utilities from Slice 1.2)

---

## Task 1.3.8: Integrate ActivityService with Case Module

**GitHub Issue:** Part of #TBD
**Estimate:** 1 hour

### Prompt for AI
```
Update CaseService to use the new unified ActivityService instead of CaseActivity.

Changes:
1. Replace CaseActivity logging with ActivityService.log()
2. Update activity logging to use natural language descriptions
3. Remove CaseActivity-specific code (now using unified AuditLog)
4. Update Case controller's activity endpoint to use ActivityService.getEntityTimeline()

Ensure all Case mutations generate proper activity logs:
- Create: "Created case CASE-2024-00001"
- Update: "Updated summary, severity on case CASE-2024-00001"
- Status change: "Changed status from OPEN to IN_PROGRESS on case CASE-2024-00001"
- Assignment: "Assigned case CASE-2024-00001 to Sarah Chen"
- Comment: "Added comment on case CASE-2024-00001"
```

### Input Files (READ FIRST)
- `apps/backend/src/modules/cases/cases.service.ts` - Existing service
- `apps/backend/src/common/services/activity.service.ts` - New unified service
- `apps/backend/examples/service-pattern.ts` - Activity logging pattern

### Output Files
- `apps/backend/src/modules/cases/cases.service.ts` (updated)
- `apps/backend/src/modules/cases/cases.controller.ts` (update activity endpoint)
- `apps/backend/src/modules/cases/cases.module.ts` (import ActivityModule)

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Lint passes
cd apps/backend && npm run lint

# Existing Case tests still pass
cd apps/backend && npm test -- --testPathPattern="cases"

# E2E tests pass
cd apps/backend && npm run test:e2e -- --testPathPattern="cases"
```

### Stop Condition
- All verification commands pass
- Case activities now logged to unified AuditLog
- Activity timeline endpoint returns unified logs
- OR document blockers

### Dependencies
- Task 1.3.6 (ActivityModule exists)
- Task 1.2.5 (CaseService exists from Slice 1.2)

---

## Task Dependency Graph

```
Task 1.3.1 (AuditLog Entity)
     │
     v
Task 1.3.2 (AuditLog RLS)
     │
     v
Task 1.3.3 (Activity DTOs)
     │
     ├───────────────────────┐
     v                       v
Task 1.3.4 (Desc Generator)  │
     │                       │
     └───────────┬───────────┘
                 │
                 v
Task 1.3.5 (Activity Service)
     │
     v
Task 1.3.6 (Activity Controller)
     │
     ├───────────────────────┐
     v                       v
Task 1.3.7 (E2E Tests)   Task 1.3.8 (Case Integration)
```

---

## Parallel Execution Opportunities

After completing Task 1.3.3 (DTOs):
- Task 1.3.4 (Description Generator) can start immediately
- Both are independent code work

After completing Task 1.3.6 (Controller):
- Task 1.3.7 (E2E Tests) and Task 1.3.8 (Case Integration) can run in parallel

---

## Success Criteria for Slice 1.3

- [ ] All 8 tasks completed with passing verification
- [ ] AuditLog table created with proper indexes
- [ ] RLS policies enforce tenant isolation on audit logs
- [ ] ActivityService available as global module
- [ ] Natural language descriptions generated for all actions
- [ ] Activity timeline endpoint returns paginated results
- [ ] Case module integrated with unified ActivityService
- [ ] Tenant isolation verified (cross-org activity not visible)
- [ ] No breaking changes to existing Case functionality

---

## Standard Action Types Reference

| Action | Category | Description Template |
|--------|----------|---------------------|
| `created` | CREATE | "{Actor} created {entity_type}" |
| `updated` | UPDATE | "{Actor} updated {fields} on {entity_type}" |
| `deleted` | DELETE | "{Actor} deleted {entity_type}" |
| `archived` | UPDATE | "{Actor} archived {entity_type}" |
| `status_changed` | UPDATE | "{Actor} changed status from {old} to {new}" |
| `assigned` | UPDATE | "{Actor} assigned {entity_type} to {assignee}" |
| `unassigned` | UPDATE | "{Actor} unassigned {entity_type} from {assignee}" |
| `commented` | CREATE | "{Actor} added comment on {entity_type}" |
| `viewed` | ACCESS | "{Actor} viewed {entity_type}" |
| `exported` | ACCESS | "{Actor} exported {entity_type} to {format}" |
| `approved` | UPDATE | "{Actor} approved {entity_type}" |
| `rejected` | UPDATE | "{Actor} rejected {entity_type}: {reason}" |
| `ai_generated` | AI | "AI generated {content_type} for {entity_type}" |

---

*End of Ralph-Ready Tasks for Slice 1.3*
