# Architecture

**Analysis Date:** 2026-02-02

## Pattern Overview

**Overall:** Layered monolith with modular NestJS backend and Next.js frontend, enforcing multi-tenancy at the database layer through PostgreSQL Row-Level Security (RLS).

**Key Characteristics:**
- **Multi-tenant isolation:** Shared database with RLS policies enforcing per-organization data segregation
- **Modular backend:** Feature modules (auth, cases, investigations, users) with shared infrastructure
- **Middleware-driven tenant context:** All requests scoped to organization via middleware before route handlers
- **Activity-driven audit logging:** All mutations logged with natural language descriptions for compliance
- **Service-oriented data access:** Prisma ORM with transaction support for complex operations

## Layers

**Request/Presentation Layer:**
- Purpose: Handle HTTP requests, validate inputs, enforce authentication/authorization
- Location: `apps/backend/src/modules/*/controllers/`, `apps/frontend/src/app/`, `apps/frontend/src/components/`
- Contains: NestJS controllers, Next.js pages/layouts, React components, UI logic
- Depends on: Services (business logic), DTOs (validation), guards/decorators (auth)
- Used by: Client applications (browser, mobile)

**Business Logic Layer (Services):**
- Purpose: Implement core business operations, coordinate across data and infrastructure
- Location: `apps/backend/src/modules/*/services/`, `apps/backend/src/common/services/`
- Contains: CasesService, InvestigationsService, AuthService, ActivityService, StorageService
- Depends on: PrismaService (data access), configuration, external APIs
- Used by: Controllers, other services

**Data Access Layer (Prisma + RLS):**
- Purpose: Abstract database queries, enforce multi-tenant isolation at database level
- Location: `apps/backend/src/modules/prisma/`, `apps/backend/prisma/schema.prisma`
- Contains: PrismaService (connection + RLS control), schema definitions, migrations
- Depends on: PostgreSQL configuration, environment variables
- Used by: All services

**Infrastructure/Cross-Cutting Layer:**
- Purpose: Provide shared utilities, security, logging, authentication
- Location: `apps/backend/src/common/`
- Contains: Guards (auth/tenant/roles), middleware, decorators, filters, Activity service
- Depends on: Prisma, configuration
- Used by: All modules

**Storage Layer:**
- Purpose: Abstract file storage operations (local or Azure Blob)
- Location: `apps/backend/src/common/services/storage.service.ts`
- Contains: StorageService, adapters (LocalStorageAdapter, AzureStorageAdapter)
- Depends on: Configuration, file system or Azure SDK
- Used by: AttachmentsService, attachment endpoints

## Data Flow

**Request Inbound - Case Creation:**

1. Client sends POST `/api/v1/cases` with Bearer token
2. **TenantMiddleware** (runs BEFORE guards):
   - Extracts `organizationId` from JWT payload
   - Sets PostgreSQL session var: `SET LOCAL app.current_organization = {organizationId}`
   - Stores in `req.organizationId` and `req.userId`
3. **JwtAuthGuard** validates token is valid/not expired
4. **TenantGuard** verifies request has valid organization context
5. **RolesGuard** checks user has COMPLIANCE_OFFICER or INVESTIGATOR role
6. **Controller handler** receives validated request
7. **CasesService.create()** called with organizationId from request
   - Generates unique reference number
   - Creates Case record via Prisma
   - All Prisma queries automatically filtered by organization via RLS
8. **ActivityService.log()** called to record action with natural language description
9. **Response** returned as JSON with 201 Created

**Database Query (RLS Enforcement):**

```
SELECT * FROM cases
WHERE organization_id = current_setting('app.current_organization')
  AND is_active = true;
```

Every query automatically includes the RLS filter at the database level - even if app code forgets to filter by organization_id, the database enforces isolation.

**State Management (Frontend):**

1. AuthContext stores tokens in localStorage + state
2. API client (axios instance) auto-injects Bearer token in Authorization header
3. Response interceptor handles 401 with token refresh
4. Hooks (useCaseFilters, useCaseFormDraft) manage component state
5. Components render with fetched data scoped to current organization

## Key Abstractions

**RiskIntelligenceUnit (RIU):**
- Purpose: Immutable intake record - a report filed, form submitted, disclosure made
- Examples: `apps/backend/src/modules/cases/` (RIU created from cases), schema definitions in prisma/schema.prisma
- Pattern: Created once, never updated; content is immutable; Case tracks corrections

**Case:**
- Purpose: Mutable work container for investigation and tracking
- Examples: `apps/backend/src/modules/cases/cases.service.ts`, `apps/backend/src/modules/cases/cases.controller.ts`
- Pattern: Can be updated, status tracked, linked to investigations

**Investigation:**
- Purpose: Structured investigation tied to a Case
- Examples: `apps/backend/src/modules/investigations/investigations.service.ts`
- Pattern: Contains notes, findings, status, primary investigator assignment

**Activity/AuditLog:**
- Purpose: Immutable ledger of all entity mutations for compliance
- Examples: `apps/backend/src/common/services/activity.service.ts`
- Pattern: Automatically logged on all creates/updates, includes actor ID, timestamp, natural language description, changes

**TenantContext:**
- Purpose: Organization isolation enforced at request boundary
- Examples: `apps/backend/src/common/middleware/tenant.middleware.ts`, `apps/backend/src/common/guards/tenant.guard.ts`
- Pattern: Extracted from JWT, set as PostgreSQL session variable, enforces RLS for all queries

## Entry Points

**Backend:**
- Location: `apps/backend/src/main.ts`
- Triggers: Application startup (npm run start:dev)
- Responsibilities: Bootstrap NestJS app, configure middleware, setup Swagger docs, listen on port

**Frontend:**
- Location: `apps/frontend/src/app/layout.tsx`, `apps/frontend/src/app/page.tsx`
- Triggers: Page navigation, initial load
- Responsibilities: Layout wrapper, page content, provider setup

**API Endpoints:**
- `POST /api/v1/auth/login` - User authentication (no tenant context required)
- `POST /api/v1/cases` - Create case (requires auth + organization context)
- `GET /api/v1/cases` - List cases (paginated, filtered by organization)
- `GET /api/v1/cases/{id}` - Get single case
- `PUT /api/v1/cases/{id}` - Update case
- `POST /api/v1/investigations` - Create investigation
- `GET /api/v1/investigations/{id}` - Get investigation details
- `POST /api/v1/investigations/{id}/notes` - Add investigation note
- `GET /api/v1/activity` - List audit log entries (filtered by organization)
- `GET /health` - Health check (public endpoint)

## Error Handling

**Strategy:** Global exception filter with standardized error responses, non-blocking activity logging

**Patterns:**

**HTTP Exceptions (NestJS):**
```typescript
// In controllers or services
throw new NotFoundException(`Case ${id} not found`);
throw new BadRequestException('Invalid case status transition');
throw new ForbiddenException('User lacks required role');
```

Response format standardized by `HttpExceptionFilter`:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/cases"
}
```

**Activity Logging (Non-Blocking):**
- Errors caught and logged but never thrown to caller
- Ensures failed activity logging doesn't fail the user's operation
- Log failures only logged to application logger, not exposed to client

**Tenant Isolation Errors:**
- TenantGuard verifies organization context exists
- Returns 403 Forbidden if missing
- TenantMiddleware gracefully skips public paths
- RLS enforces at database level - queries fail silently if filtering would return 0 rows

## Cross-Cutting Concerns

**Logging:**

Framework: Pino logger configured in `main.ts`
- Development: Pretty-printed output with colors
- Production: JSON format
- All modules use NestJS Logger service which integrates with Pino

**Validation:**

Framework: class-validator + ValidationPipe
- Configured globally in `main.ts` with whitelist mode (reject unknown fields)
- DTOs in each module's `dto/` directory use decorators (@IsString, @IsUUID, @IsEnum, etc.)
- Errors automatically formatted as validation error array

**Authentication:**

Framework: JWT via @nestjs/jwt + custom JwtAuthGuard
- Token verified in guard before route handler
- Payload extracted and passed to controller via @CurrentUser decorator
- Refresh token rotation implemented in auth service
- Session tracking for token revocation support

**Authorization:**

Framework: Role-Based Access Control (RBAC) via RolesGuard
- Roles defined in Prisma enum: `UserRole` (SYSTEM_ADMIN, COMPLIANCE_OFFICER, INVESTIGATOR, etc.)
- Applied via @Roles decorator on controller methods
- RolesGuard checks user.role against required roles

**Multi-Tenancy:**

Framework: PostgreSQL RLS + session variables
- Tenant context set per-request via middleware
- All queries filtered at database level
- No application-level filtering required (database enforces)
- Cache keys prefixed with organization_id (future implementation)

**Activity Audit:**

Framework: Custom ActivityService with audit log table
- All mutations trigger activity log entry
- Includes entity type, entity ID, action, actor, timestamp, changes
- Supports filtering by organization, entity type, date range
- Query endpoint at GET /api/v1/activity

