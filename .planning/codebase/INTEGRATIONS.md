# External Integrations

**Analysis Date:** 2026-01-30

## APIs & External Services

**AI Services (Not yet implemented - placeholder):**
- Anthropic Claude API - Planned for case summarization, note cleanup, translation
  - Env var: `ANTHROPIC_API_KEY` (commented in `.env.example`)
  - Model: `claude-3-opus-20240229` (placeholder, newer versions available)
  - Not integrated in source code yet (feature layer pending)
  - Design pattern defined in Prisma schema: `aiSummary`, `aiModelVersion`, `aiConfidenceScore` fields on Case and InvestigationNote entities

**Azure Services (Planned - not yet integrated):**
- Azure Blob Storage - File uploads and document storage
  - Connection string env: `AZURE_STORAGE_CONNECTION_STRING`
  - Container prefix: `AZURE_STORAGE_CONTAINER` (default: uploads)
  - Storage adapter pattern: `apps/backend/src/common/services/storage.interface.ts` defines `StorageAdapter`
  - Implementation: `LocalStorageAdapter` (dev), AzureBlobAdapter (planned for prod)
  - Location: `apps/backend/src/common/services/`
  - File storage strategy: Metadata in PostgreSQL (`Attachment` table), actual files in blob storage

- Azure Cognitive Search - Not yet integrated; Elasticsearch used instead
  - Placeholder in configuration for future migration

## Data Storage

**Primary Database:**
- PostgreSQL 15+
  - Connection: `DATABASE_URL` environment variable
  - Client: Prisma ORM
  - Schema: `apps/backend/prisma/schema.prisma`
  - Features:
    - Row-Level Security (RLS) - Multi-tenancy enforcement via session variables
    - JSONB columns for flexible data (customFields, customQuestions, templateResponses, assignmentHistory, activityContext)
    - Full-text search vector support (`tsvector` on Case table, via database triggers)
    - Enums (UserRole, CaseStatus, SourceChannel, etc.)
  - Key tables: Organization, User, Session, Case, Investigation, InvestigationNote, AuditLog, Attachment

**Cache:**
- Redis 7
  - Connection: `REDIS_URL` environment variable
  - Purpose: Not explicitly integrated in current codebase (infrastructure ready)
  - Default: `redis://localhost:6379`
  - Docker service: ethico-redis (container name)
  - Design consideration: Cache keys must prefix with `org:{organizationId}:` to prevent cross-tenant leakage

**Search Engine:**
- Elasticsearch 8.11.0
  - Connection: `ELASTICSEARCH_URL` environment variable
  - Default: `http://localhost:9200`
  - Not yet integrated in source code (infrastructure ready)
  - Docker service: ethico-elasticsearch
  - Design pattern (per CLAUDE.md): Index names should use `org_{organizationId}_{type}` for tenant isolation
  - Single-node configuration for development

**File Storage:**
- Local filesystem (development)
  - Path: `STORAGE_PATH` environment variable (default: `./uploads`)
  - Maximum file size: `MAX_FILE_SIZE` (default: 10MB)
  - Allowed types: `ALLOWED_MIME_TYPES` (images, PDF, text, Office documents)
  - Adapter: `LocalStorageAdapter` at `apps/backend/src/common/services/local-storage.adapter.ts`

- Azure Blob Storage (production - planned)
  - Connection string: `AZURE_STORAGE_CONNECTION_STRING`
  - Container naming: `tenant-{organizationId}` per tenant isolation design
  - Adapter: `AzureBlobAdapter` (to be implemented)

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `apps/backend/src/modules/auth/auth.service.ts`
  - JWT strategy: `apps/backend/src/modules/auth/strategies/jwt.strategy.ts`
  - Libraries: `passport-jwt` 4.0.1, `@nestjs/jwt` 10.2.0, `@nestjs/passport` 10.0.3

**JWT Configuration:**
- Secret: `JWT_SECRET` (required in production, dev fallback available)
- Access token expiry: `JWT_ACCESS_TOKEN_EXPIRY` (default: 15m)
- Refresh token expiry: `JWT_REFRESH_TOKEN_EXPIRY` (default: 7d)
- Token payload interface: `apps/backend/src/modules/auth/interfaces/jwt-payload.interface.ts`
- Token refresh: Frontend implements automatic refresh on 401 response via axios interceptor (`apps/frontend/src/lib/api.ts`)

**Password Management:**
- Hashing: bcrypt 5.1.1
- User model field: `passwordHash` (nullable for future SSO support)
- Storage: PostgreSQL `users.password_hash`

**Token Storage (Frontend):**
- Method: localStorage (via `apps/frontend/src/lib/auth-storage.ts`)
- Keys: Access token, refresh token
- Retrieval: Automatic via axios request interceptor

**Future SSO (Planned - not implemented):**
- Design consideration in CLAUDE.md mentions:
  - Azure AD
  - Google OAuth
  - SAML support
- Not yet integrated; passwordHash field is nullable for future implementation

## Monitoring & Observability

**Error Tracking:**
- None detected (not yet integrated)
- Opportunity: Sentry, DataDog, or similar for production

**Logs:**
- Pino 8.17.2 - Structured logging library
  - Configuration: `apps/backend/src/config/configuration.ts`
  - Log level: `LOG_LEVEL` environment variable (default: debug)
  - Formatters: `pino-pretty` 10.3.1 for development
  - HTTP logging: `pino-http` 9.0.0 middleware (not configured in current app.module.ts)
  - No centralized log aggregation yet (ELK stack, Application Insights ready)

**Health Checks:**
- Health module exists: `apps/backend/src/modules/health/health.module.ts`
- Endpoint: `/health` (excluded from TenantMiddleware per app.module.ts)

## CI/CD & Deployment

**Hosting:**
- Azure App Service (planned infrastructure per CLAUDE.md)
- Docker support ready: `docker-compose.yml` for local development

**CI Pipeline:**
- Not yet configured
- Pre-commit hooks configured:
  - ESLint + Prettier on staged files
  - TypeScript type checking
  - Security audit (npm audit, critical level)
  - Powered by Husky 9.0.0 + lint-staged 15.2.0
  - Config: `.husky/` directory (implicit), `lint-staged` in root `package.json`

**Build Artifacts:**
- Backend: `nest build` → `dist/` folder (Node.js executable)
- Frontend: `next build` → `.next/` folder (Node.js + static exports)
- Start commands:
  - Backend prod: `node dist/main`
  - Frontend prod: `next start`

**Database Migrations:**
- Tool: Prisma
- Commands:
  - Dev migrations: `npx prisma migrate dev`
  - Production deploy: `prisma migrate deploy`
  - Reset (dev only): `prisma migrate reset`
  - Seed: `ts-node prisma/seed.ts`
- Schema location: `apps/backend/prisma/schema.prisma`

## Environment Configuration

**Required Environment Variables:**
- Production-critical:
  - `DATABASE_URL` - PostgreSQL connection string
  - `JWT_SECRET` - JWT signing key (must be long, random string)
  - `AZURE_STORAGE_CONNECTION_STRING` - Azure Blob Storage (if using Azure)
  - `ANTHROPIC_API_KEY` - Claude API (when AI features enabled)

- Service endpoints:
  - `REDIS_URL` - Redis connection (default: redis://localhost:6379)
  - `ELASTICSEARCH_URL` - Elasticsearch connection (default: http://localhost:9200)
  - `BACKEND_URL` - API server URL (default: http://localhost:3000)
  - `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)

- Email:
  - `SMTP_HOST`, `SMTP_PORT` - Email server (default: localhost:1025 for Mailhog)
  - `SMTP_USER`, `SMTP_PASS` - Credentials (empty for Mailhog)
  - `EMAIL_FROM` - Sender address (default: noreply@ethico.local)

- Token expiry:
  - `JWT_ACCESS_TOKEN_EXPIRY` - Default: 15m
  - `JWT_REFRESH_TOKEN_EXPIRY` - Default: 7d

- Storage:
  - `STORAGE_TYPE` - 'local' (dev) or 'azure' (prod)
  - `STORAGE_PATH` - Filesystem path (default: ./uploads)
  - `MAX_FILE_SIZE` - Bytes (default: 10MB)
  - `ALLOWED_MIME_TYPES` - Comma-separated list
  - `AZURE_STORAGE_CONTAINER` - Container name (default: uploads)

**Secrets Location:**
- Development: `.env` and `.env.local` (loaded in `app.module.ts` via ConfigModule)
- Production: Environment variables via deployment platform or secrets manager
- Committed: `.env.example` (template only, never commit actual secrets)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

**Future Planned (per CLAUDE.md):**
- HRIS integrations: Workday, BambooHR, ADP, UKG, SAP SuccessFactors, Oracle HCM, Namely, Rippling, Gusto, CSV import
  - Pattern: Adapter interface `HRISAdapter` for fetchEmployees(), testConnection()
  - Not yet implemented in source code

## Email Integration

**Provider:**
- Mailhog (development)
  - SMTP server: localhost:1025
  - Web UI: http://localhost:8025
  - Purpose: Testing email in development without external provider

- Production email provider: Not yet selected
  - Options: SendGrid, AWS SES, Azure Communication Services
  - Configuration: Ready via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS

**Email Service:**
- Not yet implemented in source code
- Infrastructure in place: Configuration at `apps/backend/src/config/configuration.ts` email section
- Future: Implement email module for:
  - User invitations
  - Case notifications
  - Attestation reminders
  - Authentication emails

## API Communication

**Frontend to Backend:**
- HTTP client: Axios 1.6.5
- Base URL: `NEXT_PUBLIC_API_URL` (default: http://localhost:3000)
- API prefix: `/api/v1`
- Authentication: Bearer token in Authorization header
- Timeout: 30 seconds
- Interceptors:
  - Request: Adds JWT access token
  - Response: Handles 401 with token refresh, queues failed requests during refresh
- Implementation: `apps/frontend/src/lib/api.ts`
- API client wrapper: `apiClient.get()`, `.post()`, `.patch()`, `.delete()` (type-safe helpers)

**API Module Organization:**
- Cases API: `apps/frontend/src/lib/cases-api.ts`
- Users API: `apps/frontend/src/lib/users-api.ts`
- Investigations API: `apps/frontend/src/lib/investigation-api.ts`
- Investigation Notes API: `apps/frontend/src/lib/investigation-notes-api.ts`
- Attachments API: `apps/frontend/src/lib/attachments-api.ts`
- Activity API: Used via `apiClient.get<ActivityListResponse>()` in `case-activity-timeline.tsx`

**Backend API Structure:**
- Modules: Auth, Users, Cases, Investigations, InvestigationNotes, Attachments, Health
- Controllers in each module handle HTTP requests
- Services handle business logic
- Decorators: `@Roles()`, `@UseGuards()` for authorization
- Error responses: Standardized error DTO with statusCode, message, error, timestamp, path

## Multi-Tenancy Architecture

**Tenant Isolation:**
- Column-based: Every table has `organization_id` (PostgreSQL RLS enforced)
- Session variable: `app.current_organization` set by TenantMiddleware
- Middleware location: `apps/backend/src/common/middleware/tenant.middleware.ts`
- Route exclusions: Health check, auth endpoints
- Database constraint: RLS policies filter all queries by tenant

**Cache Key Pattern:**
- Required prefix: `org:{organizationId}:` (per CLAUDE.md)
- Example: `org:uuid-123:case:case-id` (prevents cross-tenant data leaks)

**Search Index Pattern:**
- Naming: `org_{organizationId}_{type}` (e.g., `org_uuid123_cases`)
- Purpose: Elasticsearch index isolation per tenant

**File Storage Pattern:**
- Local: Filesystem path includes org ID (implicit in local adapter)
- Azure: Container naming `tenant-{organizationId}`
- RLS metadata: `Attachment.organization_id` enforced by database

---

*Integration audit: 2026-01-30*
