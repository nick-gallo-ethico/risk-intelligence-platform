# External Integrations

**Analysis Date:** 2026-02-02

## APIs & External Services

**Anthropic Claude API (Planned):**
- Service: AI content generation and summarization
- What it's used for: Policy generation, note cleanup, case summarization (planned in scope)
- SDK/Client: Not yet integrated (referenced in `.env.example` as optional)
- Auth: Environment variable `ANTHROPIC_API_KEY`
- Status: Planned for AI module implementation

## Data Storage

**Databases:**
- PostgreSQL 15+
  - Connection: `DATABASE_URL` environment variable
  - Client: Prisma ORM (`@prisma/client 5.8.0`)
  - Multi-tenancy: Row-Level Security with `organization_id` isolation
  - Location: Local Docker container or Azure Database for PostgreSQL

**File Storage:**
- Local filesystem (development)
  - Type: `STORAGE_TYPE=local`
  - Path: `STORAGE_PATH` (default: `./uploads`)
  - Max file size: `MAX_FILE_SIZE` (default: 10 MB)
  - Allowed MIME types: Configurable via `ALLOWED_MIME_TYPES`

- Azure Blob Storage (production, planned)
  - Type: `STORAGE_TYPE=azure`
  - Connection: `AZURE_STORAGE_CONNECTION_STRING`
  - Container: `AZURE_STORAGE_CONTAINER` (default: `uploads`)
  - Per-tenant isolation: Container per organization (planned pattern)

**Caching:**
- Redis 7
  - Connection: `REDIS_URL` environment variable (default: `redis://localhost:6379`)
  - Purpose: Session caching, request deduplication, real-time collaboration state
  - Local Docker container or managed Redis instance

**Search:**
- Elasticsearch 8.11.0
  - Endpoint: `ELASTICSEARCH_URL` environment variable (default: `http://localhost:9200`)
  - Purpose: Full-text search over cases, RIUs, investigations
  - Per-tenant indices: `org_{organizationId}_{type}` pattern (planned)
  - Development: Single-node with security disabled

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication (self-hosted)
  - Implementation: NestJS + Passport + JWT strategy
  - Location: `apps/backend/src/modules/auth/`

**JWT Configuration:**
- Secret: `JWT_SECRET` environment variable (required in production)
- Access token expiry: `JWT_ACCESS_TOKEN_EXPIRY` (default: `15m`)
- Refresh token expiry: `JWT_REFRESH_TOKEN_EXPIRY` (default: `7d`)
- Token rotation: Implemented on refresh (old session revoked)

**Password Security:**
- Hashing: bcrypt 5.1.1 with salting
- Verification: `bcrypt.compare()` on login

**Session Management:**
- Session storage: PostgreSQL `Session` table
- Session tracking: User agent, IP address, revocation support
- Multi-device support: Multiple concurrent sessions per user
- Logout modes: Single device (revoke session) or all devices (revoke all sessions)

**Authentication Flows Implemented:**
- Email/password login with RLS bypass during authentication
- Token refresh with session rotation
- Session revocation (single or all devices)

**Future Auth Methods (Planned, not yet integrated):**
- Azure AD/SSO (referenced in CLAUDE.md)
- Google OAuth (referenced in CLAUDE.md)
- SAML (referenced in CLAUDE.md)

## Monitoring & Observability

**Error Tracking:**
- Not yet integrated (no Sentry, DataDog, or similar)
- Application logs via Pino structured logging

**Logs:**
- Backend: Pino 8.17.2 (structured JSON logs)
- Frontend: Browser console (development), would need monitoring service in production
- HTTP requests: pino-http middleware on all requests
- Log level: Configurable via `LOG_LEVEL` environment variable

**API Documentation:**
- Swagger/OpenAPI 2.0 via @nestjs/swagger 7.4.2
- Endpoint: `/api/docs` (auto-generated from NestJS decorators)
- JWT bearer auth documented in Swagger

## Email

**Provider:** SMTP (local Mailhog for development, production TBD)

**Configuration:**
- Host: `SMTP_HOST` (default: `localhost`)
- Port: `SMTP_PORT` (default: `1025` for Mailhog)
- Username: `SMTP_USER` (empty for local)
- Password: `SMTP_PASS` (empty for local)
- From address: `EMAIL_FROM` (default: `noreply@ethico.local`)

**Development:**
- Mailhog container (Docker) - local SMTP server
- Web UI: `http://localhost:8025` for viewing test emails
- No actual email sending during development

**Production:**
- TBD - requires SMTP_HOST, SMTP_USER, SMTP_PASS configuration
- Planned: Transactional email service (SendGrid, AWS SES, Azure Communication Services)

## CI/CD & Deployment

**Hosting:**
- Planned: Azure App Service (per CLAUDE.md)
- Not yet deployed (codebase in specification/scaffolding phase)

**CI Pipeline:**
- Not yet configured
- Planned: GitHub Actions or Azure DevOps (per INFRASTRUCTURE-SPEC.md)

**Build Artifacts:**
- Backend: `npm run build` produces `dist/` directory
- Frontend: `npm run build` produces Next.js `.next/` directory

## Environment Configuration

**Required env vars (Development):**
```
NODE_ENV=development
DATABASE_URL=postgresql://ethico:ethico_dev@localhost:5432/ethico_dev?schema=public
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

**Required env vars (Production):**
```
NODE_ENV=production
DATABASE_URL=<Azure PostgreSQL connection string>
REDIS_URL=<Managed Redis endpoint>
ELASTICSEARCH_URL=<Elasticsearch endpoint>
JWT_SECRET=<secure-random-string>
AZURE_STORAGE_CONNECTION_STRING=<Azure Blob Storage>
AZURE_STORAGE_CONTAINER=<tenant-specific>
CORS_ORIGIN=https://your-domain.com
```

**Optional env vars:**
```
ANTHROPIC_API_KEY=<API key for Claude API>
STORAGE_TYPE=azure (default: local)
STORAGE_PATH=./uploads (local only)
MAX_FILE_SIZE=10485760 (in bytes, default 10MB)
ALLOWED_MIME_TYPES=image/*,application/pdf,...
LOG_LEVEL=debug (default)
PORT=3000 (backend)
HOST=0.0.0.0 (backend)
NEXT_PUBLIC_API_URL=http://localhost:3000 (frontend)
```

**Secrets location:**
- Development: `.env` file (git-ignored)
- Production: Managed secrets (Azure Key Vault planned, environment variables on App Service)

## Webhooks & Callbacks

**Incoming:**
- Not yet implemented
- Planned: Case status change webhooks for external systems

**Outgoing:**
- Not yet implemented
- Planned: HRIS integration for employee sync (Workday, BambooHR, etc. per CLAUDE.md)

## Frontend HTTP Client

**Library:** Axios 1.6.5

**Configuration:**
- Base URL: `NEXT_PUBLIC_API_URL` environment variable (default: `http://localhost:3000`)
- API prefix: `/api/v1`
- Timeout: 30 seconds
- CORS: Credentials enabled

**Features:**
- Request interceptor: Automatically adds Bearer token to all requests
- Response interceptor: Handles 401 errors with token refresh
- Token refresh queue: Prevents multiple concurrent refresh requests
- Automatic redirect to login on refresh failure
- Type-safe API helpers: `apiClient.get()`, `post()`, `put()`, `patch()`, `delete()`

**Client Location:**
- `apps/frontend/src/lib/api.ts` - Core Axios instance with interceptors
- `apps/frontend/src/lib/*-api.ts` - Domain-specific API clients (cases-api, investigations-api, etc.)
- `apps/frontend/src/lib/auth-storage.ts` - Token persistence in localStorage

**Token Storage:**
- Medium: Browser localStorage
- Keys: `accessToken`, `refreshToken`, `user` (JSON)

**Error Handling:**
- Typed `ApiError` interface with statusCode, message, error, timestamp, path
- HTTP interceptors handle 401 with automatic refresh
- Failed requests queued during refresh to prevent data loss

## Cross-Origin (CORS)

**Frontend to Backend:**
- Origin: `CORS_ORIGIN` environment variable (default: `http://localhost:5173`)
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers: Content-Type, Authorization, X-Requested-With
- Credentials: Enabled

## Multi-Tenancy Data Isolation

**Strategy:** PostgreSQL Row-Level Security (RLS) with shared database

**Tenant Context Flow:**
1. JWT token contains `organizationId`
2. Backend TenantMiddleware extracts organizationId from token
3. Middleware calls `PrismaService.setTenantContext(organizationId)`
4. Prisma sets Postgres session variable: `SET app.current_organization = $1`
5. RLS policies on all tables filter by `organization_id`
6. Database enforces isolation - no cross-tenant data leakage possible

**Implementation:**
- Location: `apps/backend/src/common/middleware/tenant.middleware.ts`
- Applied to: All routes except `/health` and `/auth/*`
- Prisma integration: `apps/backend/src/modules/prisma/prisma.service.ts`

**Cache Isolation:**
- Key pattern: `org:{organizationId}:*` (must be enforced in code)

**Search Isolation:**
- Index pattern: `org_{organizationId}_{type}` (Elasticsearch)

---

*Integration audit: 2026-02-02*
