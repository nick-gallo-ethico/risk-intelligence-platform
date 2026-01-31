# Architecture

**Analysis Date:** 2026-01-30

## Pattern Overview

**Overall:** Multi-tenant SaaS with modular NestJS backend and Next.js frontend. Implements **shared database with PostgreSQL Row-Level Security (RLS)** for tenant isolation (HubSpot/Salesforce pattern).

**Key Characteristics:**
- **Tenant context enforcement**: JWT token contains `organizationId`, extracted by middleware, enforced at database level via PostgreSQL session variables
- **Modular service architecture**: Feature-based modules (Cases, Investigations, Users, Auth) with dependency injection
- **Activity-first logging**: All mutations log to unified `AuditLog` table with natural language descriptions for AI context
- **API-first design**: RESTful backend with Swagger documentation; frontend consumes exclusively via API

## Layers

**Presentation Layer (Frontend):**
- Purpose: Next.js React application serving end users
- Location: `apps/frontend/src`
- Contains: Pages (route handlers), components, hooks, API client, type definitions
- Depends on: Axios client with JWT handling, localStorage for auth tokens
- Used by: Browser clients (operators, compliance officers, investigators)

**API Layer (Controller):**
- Purpose: HTTP request routing and validation
- Location: `apps/backend/src/modules/*/[name].controller.ts`
- Contains: Route definitions with Swagger decorators, guard/decorator application, parameter validation
- Depends on: Service layer, DTOs, custom guards/decorators
- Used by: HTTP clients (frontend, third-party integrations)
- Pattern: Controllers use `@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)` for multi-layer security

**Business Logic Layer (Service):**
- Purpose: Core domain logic, database operations, audit logging
- Location: `apps/backend/src/modules/*/[name].service.ts`
- Contains: CRUD operations, validation, activity logging, state transitions
- Depends on: PrismaService (ORM), ActivityService (logging)
- Used by: Controllers, other services
- Pattern: All queries explicitly filter by `organizationId`; all mutations log activity with `actionDescription`

**Data Access Layer (Prisma ORM):**
- Purpose: Database abstraction and query building
- Location: `apps/backend/src/modules/prisma/` and `apps/backend/prisma/schema.prisma`
- Contains: Prisma client, migrations, schema definitions
- Depends on: PostgreSQL driver
- Used by: All services
- Pattern: All tables include `organizationId` column; RLS policies enforce filtering

**Cross-Cutting Infrastructure:**
- **Middleware**: `apps/backend/src/common/middleware/tenant.middleware.ts` - extracts organizationId from JWT and sets PostgreSQL session variable
- **Guards**: `apps/backend/src/common/guards/` - JWT validation (JwtAuthGuard), tenant verification (TenantGuard), role-based access (RolesGuard)
- **Decorators**: `apps/backend/src/common/decorators/` - @CurrentUser, @TenantId, @Roles for endpoint metadata
- **Activity Service**: `apps/backend/src/common/services/activity.service.ts` - centralized audit logging with natural language descriptions

## Data Flow

**Case Creation Flow:**

1. Frontend form submission → `POST /api/v1/cases` (with JWT token in Authorization header)
2. **Middleware** (TenantMiddleware) extracts `organizationId` from JWT, sets PostgreSQL session variable `SET LOCAL app.current_organization = $1`
3. **Controller** (CasesController.create) receives request, guards validate JWT + tenant + role
4. **Service** (CasesService.create) builds Prisma input, creates Case record with auto-generated reference number (ETH-YYYY-NNNNN)
5. **Service** calls ActivityService.log() to record "Created case ETH-2026-00001" in AuditLog table
6. Response returned with Case object
7. Frontend receives response, updates local state

**Investigation Assignment Flow:**

1. Frontend triggers assignment → `PATCH /api/v1/investigations/:id/assign`
2. **Controller** validates request, extracts current user and organization
3. **Service** (InvestigationsService.assign) validates status transition, updates assignee list, records assignment history in JSON field
4. **Service** calls ActivityService.log() with natural language description: "Sarah assigned investigation to John"
5. **Service** returns updated Investigation
6. Frontend updates UI, displays updated assignee

**Search with Full-Text Query:**

1. Frontend sends search request → `GET /api/v1/cases?search=urgent+fraud`
2. **Service** (CasesService.findAll) detects search query, routes to findAllWithFullTextSearch()
3. **Service** builds PostgreSQL tsvector query with:
   - Full-text search condition: `c.search_vector @@ to_tsquery('english', 'urgent:* & fraud:*')`
   - Filter conditions: AND organizationId, status, severity, etc. (all parameterized)
4. Executes raw SQL with parameterized inputs (RLS enforced at middleware level)
5. Returns ranked results ordered by relevance
6. Frontend displays results

**Activity Timeline Retrieval:**

1. Frontend requests case activity → `GET /api/v1/cases/:id/activity`
2. **Controller** verifies case exists (confirms access via RLS)
3. **Service** (ActivityService.getEntityTimeline) queries AuditLog filtered by:
   - organizationId (tenant isolation)
   - entityType = CASE
   - entityId = case.id
4. Returns paginated list of activity records with denormalized actor names, actionDescription
5. Frontend displays timeline for audit trail

**State Management:**
- **Backend state**: Database is source of truth; all mutations are immediately persisted
- **Frontend state**: React component state for forms, React Query/SWR for API caching (not yet implemented)
- **Session state**: JWT tokens stored in localStorage with refresh token rotation pattern (401 → refresh → retry)

## Key Abstractions

**Module:**
- Purpose: Feature container grouping controller, service, DTOs, and related logic
- Examples: `CasesModule`, `InvestigationsModule`, `UsersModule` in `apps/backend/src/modules/*/[name].module.ts`
- Pattern: Exports service for use by other modules; imports PrismaModule for database access

**Service:**
- Purpose: Encapsulate domain logic and persistence operations
- Examples: `CasesService`, `InvestigationsService` in `apps/backend/src/modules/*/[name].service.ts`
- Pattern: Constructor injects PrismaService and ActivityService; all public methods accept userId and organizationId

**DTO (Data Transfer Object):**
- Purpose: Define input/output contract and validation rules
- Examples: `CreateCaseDto`, `UpdateCaseDto`, `CaseQueryDto` in `apps/backend/src/modules/*/dto/`
- Pattern: Use class-validator decorators for automatic validation in ValidationPipe

**Entity:**
- Purpose: Database model representation
- Examples: Case, Investigation, InvestigationNote, Attachment in `apps/backend/prisma/schema.prisma`
- Pattern: All entities include organizationId, createdById, updatedById, createdAt, updatedAt; AI-enriched entities include aiSummary, aiModelVersion fields

**Guard:**
- Purpose: Enforce authentication and authorization rules
- Examples: JwtAuthGuard, TenantGuard, RolesGuard in `apps/backend/src/common/guards/`
- Pattern: Implement CanActivate interface; JwtAuthGuard wraps Passport JWT strategy

**Decorator:**
- Purpose: Attach metadata to route handlers and extract contextual values
- Examples: @CurrentUser(), @TenantId(), @Roles(...) in `apps/backend/src/common/decorators/`
- Pattern: Used with reflector-based guards to extract context

## Entry Points

**Backend Server:**
- Location: `apps/backend/src/main.ts`
- Triggers: `npm run start:dev` or deployment
- Responsibilities:
  - Bootstrap NestJS application with ConfigModule, ValidationPipe, CORS
  - Configure Swagger/OpenAPI documentation at `/api/docs`
  - Set global prefix to `/api/v1`
  - Start HTTP server on port 3000 (configurable)

**Frontend Application:**
- Location: `apps/frontend/src/app/layout.tsx` (root) and route-specific pages in `src/app/[route]/page.tsx`
- Triggers: User navigation or `npm run dev`
- Responsibilities:
  - Render HTML layout with providers (auth context, query client, theme)
  - Route-specific pages handle data loading and rendering
  - Login page handles auth flow

**API Endpoints (by module):**
- Auth: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`
- Cases: `POST /api/v1/cases`, `GET /api/v1/cases`, `GET /api/v1/cases/:id`, `PUT /api/v1/cases/:id`, `PATCH /api/v1/cases/:id/status`, `POST /api/v1/cases/:id/close`
- Investigations: `POST /api/v1/investigations`, `GET /api/v1/investigations`, `GET /api/v1/investigations/:id`, similar CRUD + workflow operations
- Investigation Notes: `POST /api/v1/investigation-notes`, `GET /api/v1/investigation-notes`
- Attachments: `POST /api/v1/attachments`, `GET /api/v1/attachments`
- Health: `GET /health`

## Error Handling

**Strategy:** Layered exception handling with global exception filter

**Patterns:**

1. **Service layer**: Throws NestJS exceptions
   ```typescript
   throw new NotFoundException(`Case with ID ${id} not found`);
   throw new BadRequestException(`Case is already in ${status} status`);
   ```

2. **Controller/Guard**: Exceptions bubble up to global filter
   ```typescript
   // JwtAuthGuard
   throw new UnauthorizedException("Invalid or expired token");
   ```

3. **Global Exception Filter** (`apps/backend/src/common/filters/http-exception.filter.ts`): Formats errors consistently
   ```json
   {
     "statusCode": 404,
     "message": "Case with ID abc123 not found",
     "error": "Not Found",
     "timestamp": "2026-01-30T12:00:00Z",
     "path": "/api/v1/cases/abc123"
   }
   ```

4. **Frontend**: Axios interceptors handle HTTP errors, redirect to login on 401

## Cross-Cutting Concerns

**Logging:**
- Backend: Pino logger with pretty-printing in development (via `src/main.ts` configuration)
- Frontend: Browser console (not yet structured; future: structured logging to backend)
- Pattern: All services log important operations; InvestigationsService uses Logger for debugging

**Validation:**
- Backend: Class-validator decorators on DTOs + global ValidationPipe (whitelist, forbid non-whitelisted, transform types)
- Frontend: Zod schemas on form inputs (e.g., `apps/frontend/src/lib/validations/case-schema.ts`)
- Pattern: All inputs validated before reaching service layer

**Authentication:**
- Strategy: JWT with refresh token rotation
- Token payload: `{ sub: userId, organizationId, type: 'access' | 'refresh' }`
- Extraction: TenantMiddleware decodes JWT and sets Postgres session variable
- Refresh: Axios interceptor detects 401, calls `/api/v1/auth/refresh`, retries request with new token
- Frontend storage: localStorage with `access_token`, `refresh_token` keys

**Tenant Isolation (CRITICAL):**
- Every table has `organizationId` column (denormalized on child entities for query efficiency)
- TenantMiddleware sets `SET LOCAL app.current_organization = $organizationId` for RLS enforcement
- Services explicitly filter by organizationId on all queries (defense in depth)
- Cache keys prefixed: `org:{organizationId}:...`
- Elasticsearch indices (future): `org_{organizationId}_{type}`

**Audit & Compliance:**
- Activity logging: All mutations call ActivityService.log() with natural language descriptions
- AuditLog table: Append-only (no updates/deletes), stores entity changes with context
- Immutable timestamp: createdAt only, no updatedAt on audit logs
- Denormalization: Actor names stored on AuditLog for display without joins

---

*Architecture analysis: 2026-01-30*
