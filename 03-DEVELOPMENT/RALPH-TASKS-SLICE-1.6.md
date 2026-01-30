# Ralph-Ready Tasks: Slice 1.6 - Code Quality & Security Fixes

**Purpose:** Address technical debt, security issues, and pattern compliance from code review.
**Slice Goal:** Fix security vulnerabilities, add missing guards, improve test reliability.
**Reference:** Code review findings from 2026-01-30

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

## Prerequisites

This slice assumes Slice 1.5 is complete:
- InvestigationNote entity and endpoints working
- Investigation detail panel on frontend
- E2E tests infrastructure in place

---

## BACKEND TASKS: Security & Guards

---

## Task 1.6.1: Add TenantGuard to All Controllers

**Estimate:** 1 hour

### Prompt for AI
```
Add TenantGuard to all controllers following the pattern in:
- `apps/backend/examples/controller-pattern.ts` - Shows @UseGuards(JwtAuthGuard, TenantGuard)

The TenantGuard should already exist at:
- `apps/backend/src/common/guards/tenant.guard.ts` (create if missing)

TenantGuard should:
1. Verify that req.organizationId was set by TenantMiddleware
2. Throw UnauthorizedException if organizationId is missing
3. Be used alongside JwtAuthGuard on all protected controllers

Update ALL controllers to use:
@UseGuards(JwtAuthGuard, TenantGuard)

Controllers to update:
- src/modules/cases/cases.controller.ts
- src/modules/investigations/investigations.controller.ts
- src/modules/investigation-notes/investigation-notes.controller.ts
- src/common/controllers/activity.controller.ts

If TenantGuard doesn't exist, create it following NestJS guard patterns.
```

### Input Files (READ FIRST)
- `apps/backend/examples/controller-pattern.ts` - Pattern reference
- `apps/backend/src/common/guards/` - Existing guards
- `apps/backend/src/modules/cases/cases.controller.ts` - Current state
- `apps/backend/src/modules/investigations/investigations.controller.ts`
- `apps/backend/src/modules/investigation-notes/investigation-notes.controller.ts`

### Output Files
- `apps/backend/src/common/guards/tenant.guard.ts` (create if missing)
- `apps/backend/src/common/guards/index.ts` (export TenantGuard)
- Update all controllers listed above

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Lint passes
cd apps/backend && npm run lint

# Unit tests pass
cd apps/backend && npm test

# E2E tests still pass (tenant isolation)
cd apps/backend && npm run test:e2e -- --testPathPattern="tenant-isolation"
```

### Stop Condition
- All controllers have TenantGuard applied
- TenantGuard validates organizationId presence
- All verification commands pass
- OR document blockers

### Dependencies
- None (standalone security fix)

---

## Task 1.6.2: Add @TenantId Decorator to Controllers

**Estimate:** 45 minutes

### Prompt for AI
```
Update all controllers to use @TenantId() decorator instead of extracting
organizationId from @CurrentUser().

Pattern from `apps/backend/examples/controller-pattern.ts`:
```typescript
@TenantId() organizationId: string,  // Org from JWT - NEVER from body
```

The @TenantId() decorator should already exist at:
- `apps/backend/src/common/decorators/tenant-id.decorator.ts`

If it doesn't exist, create it following the pattern:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.organizationId;
  },
);
```

Update controllers to use @TenantId() instead of user.organizationId:

BEFORE:
```typescript
async create(@CurrentUser() user: RequestUser) {
  return this.service.create(dto, user.id, user.organizationId);
}
```

AFTER:
```typescript
async create(
  @CurrentUser() user: RequestUser,
  @TenantId() organizationId: string,
) {
  return this.service.create(dto, user.id, organizationId);
}
```

Controllers to update:
- src/modules/cases/cases.controller.ts
- src/modules/investigations/investigations.controller.ts
- src/modules/investigation-notes/investigation-notes.controller.ts
- src/common/controllers/activity.controller.ts
```

### Input Files (READ FIRST)
- `apps/backend/examples/controller-pattern.ts` - Pattern reference
- `apps/backend/src/common/decorators/tenant-id.decorator.ts` - Current decorator
- `apps/backend/src/modules/cases/cases.controller.ts` - Current pattern

### Output Files
- Update `apps/backend/src/common/decorators/tenant-id.decorator.ts` (if needed)
- Update all controllers listed above

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Lint passes
cd apps/backend && npm run lint

# Unit tests pass
cd apps/backend && npm test
```

### Stop Condition
- All controllers use @TenantId() decorator
- organizationId never comes from user object
- All verification commands pass
- OR document blockers

### Dependencies
- Task 1.6.1 (TenantGuard added)

---

## Task 1.6.3: Create ChangeStatusDto for Status Endpoints

**Estimate:** 30 minutes

### Prompt for AI
```
Create dedicated DTOs for status change endpoints following:
- `apps/backend/examples/dto-pattern.ts` - DTO structure (especially lines 123-144)

The pattern shows ChangeStatusDto should have:
- status: enum (required)
- rationale: string (required, with min/max length)

Currently, status change endpoints use inline body types:
```typescript
@Body() body: { status: CaseStatus; rationale?: string }
```

Create proper DTOs:
1. ChangeCaseStatusDto (for cases.controller.ts)
2. ChangeInvestigationStatusDto (for investigations.controller.ts)

Each DTO should have:
- @IsEnum() for status field
- @IsString() @MinLength(10) @MaxLength(500) for rationale
- @ApiProperty() decorators for Swagger
- Rationale should be REQUIRED (not optional) for status changes

Update the controllers to use these DTOs instead of inline body types.
```

### Input Files (READ FIRST)
- `apps/backend/examples/dto-pattern.ts` - DTO pattern (lines 123-144)
- `apps/backend/src/modules/cases/cases.controller.ts` - Status endpoint
- `apps/backend/src/modules/investigations/investigations.controller.ts` - Status endpoint

### Output Files
- `apps/backend/src/modules/cases/dto/change-case-status.dto.ts`
- `apps/backend/src/modules/investigations/dto/change-investigation-status.dto.ts`
- Update `apps/backend/src/modules/cases/dto/index.ts` (export new DTO)
- Update `apps/backend/src/modules/investigations/dto/index.ts` (export new DTO)
- Update controller files to use new DTOs

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Lint passes
cd apps/backend && npm run lint

# Test status endpoint validates rationale
# POST /api/v1/cases/:id/status without rationale should return 400
```

### Stop Condition
- Status DTOs created with validation
- Controllers use new DTOs
- Rationale is required for status changes
- All verification commands pass
- OR document blockers

### Dependencies
- None (standalone improvement)

---

## Task 1.6.4: Add RolesGuard and Role Decorators

**Estimate:** 1.5 hours

### Prompt for AI
```
Implement role-based access control on controllers following:
- `apps/backend/examples/controller-pattern.ts` - Shows @Roles() and RolesGuard pattern

The RolesGuard should already exist at:
- `apps/backend/src/common/guards/roles.guard.ts`

If missing or incomplete, create/update it to:
1. Read required roles from @Roles() decorator metadata
2. Extract user's role from request (set by JWT/middleware)
3. Check if user's role matches any required role
4. Throw ForbiddenException if role doesn't match

Add @Roles() decorator to endpoints with appropriate restrictions:

CasesController:
- create: @Roles(Role.COMPLIANCE_OFFICER, Role.INVESTIGATOR, Role.SYSTEM_ADMIN)
- findAll: Any authenticated user
- findOne: Any authenticated user
- update: @Roles(Role.COMPLIANCE_OFFICER, Role.INVESTIGATOR, Role.SYSTEM_ADMIN)
- changeStatus: @Roles(Role.COMPLIANCE_OFFICER, Role.SYSTEM_ADMIN)
- close: @Roles(Role.COMPLIANCE_OFFICER, Role.SYSTEM_ADMIN)

InvestigationsController:
- create: @Roles(Role.COMPLIANCE_OFFICER, Role.INVESTIGATOR, Role.SYSTEM_ADMIN)
- findAll: Any authenticated user
- findOne: Any authenticated user
- update: @Roles(Role.COMPLIANCE_OFFICER, Role.INVESTIGATOR, Role.SYSTEM_ADMIN)
- changeStatus: @Roles(Role.COMPLIANCE_OFFICER, Role.INVESTIGATOR, Role.SYSTEM_ADMIN)
- assign: @Roles(Role.COMPLIANCE_OFFICER, Role.SYSTEM_ADMIN)
- addFindings: @Roles(Role.COMPLIANCE_OFFICER, Role.INVESTIGATOR, Role.SYSTEM_ADMIN)

InvestigationNotesController:
- create: @Roles(Role.INVESTIGATOR, Role.COMPLIANCE_OFFICER, Role.SYSTEM_ADMIN)
- findAll: Any authenticated user with investigation access
- findOne: Any authenticated user with investigation access
- update: Author only OR @Roles(Role.COMPLIANCE_OFFICER, Role.SYSTEM_ADMIN)
- delete: Author only OR @Roles(Role.COMPLIANCE_OFFICER, Role.SYSTEM_ADMIN)

Note: Author-only checks should remain in the service layer.
```

### Input Files (READ FIRST)
- `apps/backend/examples/controller-pattern.ts` - Pattern reference
- `apps/backend/src/common/guards/roles.guard.ts` - Current guard
- `apps/backend/src/common/decorators/roles.decorator.ts` - Current decorator
- `apps/backend/src/modules/auth/interfaces/jwt-payload.interface.ts` - Role enum

### Output Files
- Update `apps/backend/src/common/guards/roles.guard.ts` (if needed)
- Update `apps/backend/src/common/decorators/roles.decorator.ts` (if needed)
- Update all controllers with @Roles() decorators

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Lint passes
cd apps/backend && npm run lint

# Unit tests pass
cd apps/backend && npm test

# Manual test: EMPLOYEE role should NOT be able to create case
# This should return 403 Forbidden
```

### Stop Condition
- RolesGuard working correctly
- All endpoints have appropriate role restrictions
- ForbiddenException thrown for unauthorized role access
- All verification commands pass
- OR document blockers

### Dependencies
- Task 1.6.1 (TenantGuard in place)

---

## Task 1.6.5: Add Swagger Decorators to Controllers

**Estimate:** 2 hours

### Prompt for AI
```
Add Swagger/OpenAPI decorators to all controllers following:
- `apps/backend/examples/dto-pattern.ts` - Shows @ApiProperty patterns
- `apps/backend/examples/controller-pattern.ts` - Shows controller decorators

Add to ALL controller files:

Class-level decorators:
- @ApiTags('tag-name') - Group endpoints (e.g., 'Cases', 'Investigations', 'Notes')
- @ApiBearerAuth() - Indicate JWT required

Method-level decorators:
- @ApiOperation({ summary: '...', description: '...' })
- @ApiResponse({ status: 200, description: '...', type: ResponseDto })
- @ApiResponse({ status: 400, description: 'Validation error' })
- @ApiResponse({ status: 401, description: 'Unauthorized' })
- @ApiResponse({ status: 403, description: 'Forbidden' })
- @ApiResponse({ status: 404, description: 'Not found' })
- @ApiParam() for path parameters
- @ApiQuery() for query parameters

Parameter decorators in DTOs:
- @ApiProperty() on all DTO fields with description and examples
- @ApiPropertyOptional() for optional fields

Also update main.ts to enable Swagger if not already done:
```typescript
const config = new DocumentBuilder()
  .setTitle('Risk Intelligence Platform API')
  .setDescription('API documentation for the Risk Intelligence Platform')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

Controllers to update:
- src/modules/cases/cases.controller.ts
- src/modules/investigations/investigations.controller.ts
- src/modules/investigation-notes/investigation-notes.controller.ts
- src/modules/auth/auth.controller.ts
- src/modules/health/health.controller.ts
- src/common/controllers/activity.controller.ts

DTOs to update (add @ApiProperty):
- All DTOs in src/modules/cases/dto/
- All DTOs in src/modules/investigations/dto/
- All DTOs in src/modules/investigation-notes/dto/
- All DTOs in src/modules/auth/dto/
- All DTOs in src/common/dto/
```

### Input Files (READ FIRST)
- `apps/backend/examples/dto-pattern.ts` - DTO decorators
- `apps/backend/examples/controller-pattern.ts` - Controller decorators
- `apps/backend/src/main.ts` - Current Swagger setup

### Output Files
- Update `apps/backend/src/main.ts` (Swagger setup)
- Update all controller files with Swagger decorators
- Update all DTO files with @ApiProperty decorators

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Lint passes
cd apps/backend && npm run lint

# Start backend and verify Swagger UI
cd apps/backend && npm run start:dev
# Navigate to http://localhost:3000/api/docs
# Verify all endpoints documented
```

### Stop Condition
- Swagger UI accessible at /api/docs
- All endpoints documented
- Request/response schemas visible
- All verification commands pass
- OR document blockers

### Dependencies
- Task 1.6.3 (Status DTOs created)

---

## Task 1.6.6: Fix E2E Test Failures - Activity Endpoint

**Estimate:** 1.5 hours

### Prompt for AI
```
Fix the E2E test failures related to activity timeline endpoints.

Issue analysis from test failures:
1. GET /api/v1/cases/:id/activity returns 404 when case doesn't exist
2. Activity filter endpoints returning 500 (internal server error)
3. Timeout issues on activity queries

Root causes to investigate:
1. Test dependencies - earlier test failures causing invalid IDs
2. Activity controller endpoint not properly wired
3. Date filtering validation issues

Steps:
1. Check activity controller routes are properly registered
2. Verify activity query DTO validation handles all filter params
3. Fix date range filtering (fromDate/toDate validation)
4. Ensure test isolation - each test should create its own data
5. Add proper error handling for invalid entity types/IDs

Files to review:
- `apps/backend/src/common/controllers/activity.controller.ts`
- `apps/backend/src/common/services/activity.service.ts`
- `apps/backend/src/common/dto/activity-query.dto.ts`
- `apps/backend/test/smoke/activity-timeline.e2e-spec.ts`
- `apps/backend/test/smoke/case-flow.e2e-spec.ts`

Key fixes needed:
1. Activity query should handle missing/invalid dates gracefully
2. Activity pagination should work correctly
3. Entity timeline endpoint should return 404 if entity not found
4. Tests should not depend on previous test state
```

### Input Files (READ FIRST)
- `apps/backend/src/common/controllers/activity.controller.ts` - Activity routes
- `apps/backend/src/common/services/activity.service.ts` - Activity service
- `apps/backend/src/common/dto/activity-query.dto.ts` - Query validation
- `apps/backend/test/smoke/activity-timeline.e2e-spec.ts` - Failing tests
- `apps/backend/test/smoke/case-flow.e2e-spec.ts` - Failing tests

### Output Files
- Update activity controller/service as needed
- Update activity query DTO validation
- Update E2E test files for proper isolation

### Verification (ALL MUST PASS)
```bash
# Unit tests pass
cd apps/backend && npm test

# E2E tests pass
cd apps/backend && npm run test:e2e -- --testPathPattern="activity"
cd apps/backend && npm run test:e2e -- --testPathPattern="case-flow"

# Smoke tests pass
cd apps/backend && npm run test:e2e -- --testPathPattern="smoke"
```

### Stop Condition
- Activity E2E tests pass
- Case flow E2E tests pass
- No 500 errors on activity endpoints
- All verification commands pass
- OR document specific blockers with error details

### Dependencies
- None (fix existing code)

---

## Task 1.6.7: Verify SQL Injection Fix

**Estimate:** 15 minutes

### Prompt for AI
```
Verify the SQL injection fix in tenant middleware is correct and add a test.

The fix was applied to:
- `apps/backend/src/common/middleware/tenant.middleware.ts`

BEFORE (vulnerable):
```typescript
await this.prisma.$executeRawUnsafe(
  `SELECT set_config('app.current_organization', '${payload.organizationId}', true)`,
);
```

AFTER (safe):
```typescript
await this.prisma.$executeRaw`SELECT set_config('app.current_organization', ${payload.organizationId}, true)`;
```

Tasks:
1. Verify the fix is in place
2. Add a unit test that verifies parameterized queries are used
3. Run security audit

The test should verify that special characters in organizationId are handled safely
(even though they shouldn't occur in a UUID, defense in depth).
```

### Input Files (READ FIRST)
- `apps/backend/src/common/middleware/tenant.middleware.ts` - Fixed code

### Output Files
- Add test in `apps/backend/src/common/middleware/tenant.middleware.spec.ts` (if needed)

### Verification (ALL MUST PASS)
```bash
# TypeScript compiles
cd apps/backend && npm run typecheck

# Security audit
npm audit --audit-level=high

# Unit tests pass
cd apps/backend && npm test
```

### Stop Condition
- SQL injection fix verified
- Test added for middleware
- Security audit passes
- OR document blockers

### Dependencies
- None (verification task)

---

## Task Dependency Graph

```
SECURITY FIXES:

Task 1.6.1 (TenantGuard)
     │
     v
Task 1.6.2 (@TenantId)
     │
     v
Task 1.6.4 (RolesGuard)


CODE QUALITY:

Task 1.6.3 (Status DTOs) ─────► Task 1.6.5 (Swagger)


TEST FIXES:

Task 1.6.6 (Activity E2E) ◄──── After guards are working


VERIFICATION:

Task 1.6.7 (SQL Injection) ◄─── Can run independently
```

---

## Success Criteria for Slice 1.6

### Security
- [ ] TenantGuard added to all controllers
- [ ] @TenantId() decorator used consistently
- [ ] RolesGuard enforces role-based access
- [ ] SQL injection fix verified with test

### Code Quality
- [ ] ChangeStatusDto created with required rationale
- [ ] Swagger documentation complete
- [ ] All DTOs have @ApiProperty decorators

### Testing
- [ ] Activity E2E tests passing
- [ ] Case flow E2E tests passing
- [ ] Tenant isolation tests passing
- [ ] All unit tests passing

### Verification Commands (All Must Pass)
```bash
cd apps/backend && npm run typecheck
cd apps/backend && npm run lint
cd apps/backend && npm test
cd apps/backend && npm run test:e2e
npm audit --audit-level=high
```

---

*End of Ralph-Ready Tasks for Slice 1.6*
