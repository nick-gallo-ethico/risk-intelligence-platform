# Architecture

**Analysis Date:** 2026-02-13

## Pattern Overview

**Overall:** Modular Monolith with Multi-Tenant SaaS Architecture

**Key Characteristics:**

- NestJS backend with feature-based module organization (40+ domain modules)
- Next.js 14+ frontend with App Router and server-side rendering
- PostgreSQL with Row-Level Security (RLS) for tenant isolation
- Event-driven architecture using EventEmitter2 for cross-module communication
- AI-first design with Claude API integration throughout

## Layers

**Presentation Layer (Frontend):**

- Purpose: User interface and client-side state management
- Location: `apps/frontend/src/`
- Contains: Next.js pages, React components, API clients, hooks
- Depends on: Backend REST API via axios client with JWT auth
- Used by: End users (CCOs, investigators, employees, operators)

**API Gateway Layer:**

- Purpose: HTTP request handling, routing, validation, authentication
- Location: `apps/backend/src/modules/*/controllers/`
- Contains: NestJS controllers with OpenAPI/Swagger decorators
- Depends on: Service layer, Guards (JwtAuthGuard, TenantGuard, RolesGuard)
- Used by: Frontend via REST endpoints at `/api/v1/*`

**Application Service Layer:**

- Purpose: Business logic orchestration, domain operations
- Location: `apps/backend/src/modules/*/services/`
- Contains: NestJS services with transaction management, event emission
- Depends on: Data access layer (PrismaService), ActivityService, EventEmitter2
- Used by: Controllers, other services (via dependency injection)

**Cross-Cutting Infrastructure Layer:**

- Purpose: Shared capabilities across all modules
- Location: `apps/backend/src/common/`
- Contains: Guards, decorators, middleware, interceptors, filters, base services
- Depends on: Prisma, ConfigService, JWT library
- Used by: All modules via NestJS dependency injection

**Data Access Layer:**

- Purpose: Database operations with multi-tenancy enforcement
- Location: `apps/backend/src/modules/prisma/`
- Contains: PrismaService (singleton), generated Prisma Client
- Depends on: PostgreSQL database with RLS policies
- Used by: All service classes

**External Integration Layer:**

- Purpose: Third-party service integrations
- Location: `apps/backend/src/modules/ai/`, `apps/backend/src/modules/hris/`, `apps/backend/src/modules/storage/`
- Contains: Provider abstractions, API clients (Anthropic Claude, Azure Blob, Elasticsearch)
- Depends on: External APIs, SDK packages
- Used by: Service layer for AI operations, file storage, employee sync

## Data Flow

**Authenticated Request Flow:**

1. **Frontend initiates request** - User action triggers API call via `apps/frontend/src/lib/api.ts` with JWT in Authorization header
2. **TenantMiddleware extracts context** - `apps/backend/src/common/middleware/tenant.middleware.ts` decodes JWT, sets PostgreSQL session variable `app.current_organization`
3. **Guards validate authorization** - JwtAuthGuard validates token, TenantGuard ensures organizationId present, RolesGuard checks RBAC permissions
4. **Controller receives typed DTO** - NestJS ValidationPipe transforms and validates request body against class-validator decorated DTOs
5. **Service executes business logic** - Service methods perform CRUD operations via Prisma (auto-filtered by RLS), emit domain events
6. **ActivityService logs action** - All mutations logged to AUDIT_LOG with natural language description
7. **Domain events processed** - EventEmitter2 broadcasts events to subscribers (e.g., notifications, search indexing)
8. **Response returned** - Controller serializes response (Prisma entities or DTOs) back to frontend

**State Management:**

- Frontend: React Query (@tanstack/react-query) for server state caching, React hooks for local UI state
- Backend: Stateless services, session context stored in JWT, transient state in Redis (rate limiting, job queues)

## Key Abstractions

**RIU (Risk Intelligence Unit):**

- Purpose: Immutable intake record representing "something happened" (hotline report, disclosure, web form)
- Examples: `apps/backend/src/modules/rius/rius.service.ts`, `apps/backend/prisma/schema.prisma` (RiskIntelligenceUnit model)
- Pattern: Created once, never updated (except system fields like aiSummary). Corrections go on associated Case.

**Case:**

- Purpose: Mutable work container for investigation workflow, status tracking, assignment
- Examples: `apps/backend/src/modules/cases/cases.service.ts`, `apps/backend/src/modules/investigations/investigations.service.ts`
- Pattern: HubSpot Deal model - has pipeline stages, assignees, activities. Links to one or more RIUs via `riu_case_associations`.

**Activity Timeline:**

- Purpose: Natural language audit trail for all entity changes
- Examples: `apps/backend/src/common/services/activity.service.ts`, `apps/backend/src/modules/audit/audit.service.ts`
- Pattern: Every service mutation calls `activityService.log()` with actionDescription like "John assigned case ETH-2026-00123 to Sarah"

**Workflow Engine:**

- Purpose: Configurable state machines for case lifecycle, approval flows
- Examples: `apps/backend/src/modules/workflow/workflow.service.ts`, `apps/backend/src/modules/workflow/workflow-engine.service.ts`
- Pattern: JSON-configured workflows with step conditions, SLA tracking, auto-transitions

**Multi-Tenant Isolation:**

- Purpose: Complete data separation between organizations in shared database
- Examples: `apps/backend/src/common/middleware/tenant.middleware.ts`, PostgreSQL RLS policies
- Pattern: Every table has `organization_id`, RLS policies filter all queries, middleware sets session variable from JWT

**AI Provider Abstraction:**

- Purpose: Pluggable AI backends (Claude, Azure OpenAI, self-hosted)
- Examples: `apps/backend/src/modules/ai/providers/claude.provider.ts`, `apps/backend/src/modules/ai/ai.service.ts`
- Pattern: Interface-based dependency injection, streaming responses, prompt templates in `apps/backend/src/modules/ai/prompts/`

## Entry Points

**Backend API Server:**

- Location: `apps/backend/src/main.ts`
- Triggers: `npm run start:dev` (development) or `npm run start:prod` (production)
- Responsibilities: Bootstrap NestJS app, configure middleware (Helmet, CORS, ValidationPipe), mount Swagger docs at `/api/docs`, listen on port 3000

**Frontend Web Server:**

- Location: `apps/frontend/src/app/layout.tsx` (root), `apps/frontend/src/app/(authenticated)/layout.tsx` (authenticated shell)
- Triggers: `npm run dev` (development) or `npm run start` (production)
- Responsibilities: Next.js App Router, SSR/SSG rendering, React Query provider setup, auth token management

**Database Migrations:**

- Location: `apps/backend/prisma/migrations/`
- Triggers: `npm run db:migrate` (development) or `npm run db:migrate:prod` (production)
- Responsibilities: Apply schema changes, create RLS policies, seed lookup data

**Background Job Processor:**

- Location: `apps/backend/src/modules/jobs/jobs.service.ts` (BullMQ consumers)
- Triggers: Auto-started when backend initializes (event-driven)
- Responsibilities: Process async jobs (email delivery, report generation, data migration, AI summarization)

**Scheduled Tasks:**

- Location: `apps/backend/src/modules/notifications/digest.service.ts`, workflow SLA checks
- Triggers: Cron schedules via @nestjs/schedule
- Responsibilities: Send daily digests, mark overdue cases, trigger reminder emails

## Error Handling

**Strategy:** Centralized exception filters with typed error responses

**Patterns:**

- **Service Layer**: Throw NestJS exceptions (NotFoundException, BadRequestException, UnauthorizedException) with descriptive messages
- **Global Exception Filter**: `apps/backend/src/common/filters/http-exception.filter.ts` catches all exceptions, formats as `{ statusCode, message, error, timestamp, path }`
- **Frontend Error Boundary**: React error boundaries catch rendering errors, API client interceptor handles 401 (auto token refresh), 403 (permission denied), 500 (server error)
- **Validation Errors**: class-validator errors formatted as `{ statusCode: 400, message: ['field1 must be X', 'field2 must be Y'], error: 'Bad Request' }`

## Cross-Cutting Concerns

**Logging:** Pino logger with structured JSON output (pretty-print in dev), log level configurable via LOG_LEVEL env var. All services use `private readonly logger = new Logger(ServiceName.name);`

**Validation:** class-validator decorators on DTOs, global ValidationPipe with `whitelist: true` (strip unknown properties), `transform: true` (auto type coercion)

**Authentication:** JWT-based with access tokens (15min TTL) and refresh tokens (7 day TTL). Passport JWT strategy validates tokens, extracts user context. SSO via Azure AD and Google OAuth supported.

**Authorization:** RBAC via RolesGuard checking UserRole enum (SYSTEM_ADMIN, COMPLIANCE_OFFICER, INVESTIGATOR, etc.). Custom visibility scoping via business unit, region, sensitivity level.

**Rate Limiting:** Global throttle via ThrottlerGuard, Redis-backed for distributed rate limiting (100 req/min default per organization)

**Caching:** Redis cache for frequently accessed data (categories, templates, user profiles). Cache keys prefixed with `org:{organizationId}:` for tenant isolation.

**File Storage:** Azure Blob Storage with per-tenant containers (`tenant-{organizationId}`). Attachment metadata tracked in database, binary content in blob storage.

**Search:** Elasticsearch with per-tenant indices (`org_{organizationId}_cases`, `org_{organizationId}_rius`). Full-text search with permission filtering.

**Real-time:** Socket.IO WebSockets for live notifications, collaborative editing. Rooms scoped by organization and entity (`case-{caseId}`, `org-{organizationId}-notifications`).

**Background Jobs:** BullMQ with Redis for async job processing (email, exports, AI tasks). Job queues: `email-queue`, `export-queue`, `ai-queue`, `migration-queue`.

---

_Architecture analysis: 2026-02-13_
