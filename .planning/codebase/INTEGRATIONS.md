# External Integrations

**Analysis Date:** 2026-02-13

## APIs & External Services

**AI Services:**

- **Anthropic Claude API** - Primary AI provider for all AI features
  - SDK/Client: `@anthropic-ai/sdk` 0.72.1
  - Auth: `ANTHROPIC_API_KEY` (env var)
  - Models: claude-opus-4-6, claude-sonnet-4-5 (default: claude-sonnet-4-5-20250929), claude-3-5-haiku-latest
  - Features: Streaming, tool calling, vision, prompt caching
  - Implementation: `apps/backend/src/modules/ai/providers/claude.provider.ts`
  - Abstraction: `AIProvider` interface allows swapping to Azure OpenAI or self-hosted LLMs
  - Rate limiting: Configurable per organization (RPM, TPM, daily limits)
  - Default limits: 60 RPM, 100k TPM, 10k daily requests, 5M daily tokens

## Data Storage

**Databases:**

- **PostgreSQL 15+**
  - Connection: `DATABASE_URL` env var
  - Client: Prisma ORM 5.8.0
  - Schema: `apps/backend/prisma/schema.prisma`
  - Features: Row-Level Security (RLS) for multi-tenancy, pgvector extension (planned for AI embeddings)
  - Migrations: `npm run db:migrate` (Prisma Migrate)
  - Studio: `npm run db:studio` (Prisma Studio GUI)
  - Development: Docker container `ethico-postgres` on port 5432

**Search:**

- **Elasticsearch 8.11.0**
  - Connection: `ELASTICSEARCH_NODE` env var
  - Client: `@elastic/elasticsearch` 9.2.1 + `@nestjs/elasticsearch` 11.1.0
  - Indices: Per-tenant naming pattern `org_{organizationId}_{type}`
  - Implementation: `apps/backend/src/modules/search/indexing/indexing.service.ts`
  - Development: Docker container `ethico-elasticsearch` on ports 9200/9300
  - Production alternative: Azure Cognitive Search

**Caching:**

- **Redis 7**
  - Connection: `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` env vars
  - Client: ioredis 5.9.2
  - Uses: Session cache, job queue (BullMQ), rate limiting, general caching
  - Key naming: Tenant-prefixed `org:{organizationId}:...`
  - Implementation: `cache-manager` 5.7.6 + `@nestjs/cache-manager` 2.3.0
  - Job queue: BullMQ 5.67.2 + `@nestjs/bullmq` 11.0.4
  - Queue dashboard: Bull Board (`@bull-board/nestjs` 6.16.4)
  - Development: Docker container `ethico-redis` on port 6379

**File Storage:**

- **Provider abstraction:** `STORAGE_PROVIDER` env var
  - Development: `local` filesystem (`LOCAL_STORAGE_PATH=./uploads`)
  - Production: Azure Blob Storage
- **Azure Blob Storage** (production)
  - SDK: `@azure/storage-blob` 12.30.0 + `@azure/identity` 4.13.0
  - Auth: `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_ACCOUNT_NAME`, `AZURE_STORAGE_ACCOUNT_KEY`
  - Container naming: Per-tenant `tenant-{organizationId}` or prefix `AZURE_STORAGE_CONTAINER_PREFIX`
  - Max file size: `MAX_FILE_SIZE` env var (default: 52428800 bytes = 50MB)

## Authentication & Identity

**Auth Provider:**

- Custom JWT-based authentication + Multi-provider SSO
  - Implementation: `apps/backend/src/modules/auth/`
  - JWT Library: `@nestjs/jwt` 10.2.0 + `passport-jwt` 4.0.1
  - Token expiry: `JWT_ACCESS_TOKEN_EXPIRY=15m`, `JWT_REFRESH_TOKEN_EXPIRY=7d`
  - Secret: `JWT_SECRET` env var

**SSO Providers:**

- **Google OAuth 2.0**
  - Strategy: `apps/backend/src/modules/auth/strategies/google.strategy.ts`
  - SDK: `passport-google-oauth20` 2.0.0
  - Config: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `API_URL` env vars
  - Callback: `{API_URL}/api/v1/auth/google/callback`
  - Scopes: email, profile, openid
  - Domain routing: Verified domains route to organization

- **Azure AD / Microsoft Entra ID**
  - Strategy: `apps/backend/src/modules/auth/strategies/azure-ad.strategy.ts`
  - SDK: `passport-azure-ad` 4.3.5
  - Implementation: `apps/backend/src/modules/auth/sso/sso.service.ts`

- **SAML 2.0**
  - Strategy: `apps/backend/src/modules/auth/strategies/saml.strategy.ts`
  - SDK: `@node-saml/passport-saml` 5.1.0
  - Per-tenant configuration via `apps/backend/src/modules/auth/sso/sso-config.service.ts`

**Multi-Factor Authentication:**

- TOTP (Time-based One-Time Password)
  - Library: `otplib` 13.2.1
  - QR code generation: `qrcode` 1.5.4
  - Implementation: `apps/backend/src/modules/auth/mfa/mfa.service.ts`

## Monitoring & Observability

**Error Tracking:**

- Not yet integrated (configured for future integration)

**Logs:**

- Structured JSON logging via Pino
  - Library: `pino` 8.17.2 + `pino-http` 9.0.0
  - Development: Pretty output via `pino-pretty` 10.3.1
  - Level: `LOG_LEVEL` env var (default: debug in dev)
  - Audit logging: All mutations logged to `AuditLog` table with natural language descriptions

**Security:**

- **Helmet** 8.1.0 - Security headers middleware
- **Rate limiting** - `@nestjs/throttler` 6.5.0 with Redis storage
- **Sanitization** - `sanitize-html` 2.17.0 for user input
- **Password hashing** - bcrypt 5.1.1 (10 rounds)

## CI/CD & Deployment

**Hosting:**

- Azure App Service (planned per documentation)
- Frontend: Next.js static export or SSR on App Service
- Backend: NestJS on App Service
- Ops Console: Separate Next.js deployment

**CI Pipeline:**

- Git hooks: Husky 9.0.0 + lint-staged 15.2.0
- Pre-commit: ESLint, Prettier, TypeScript type check
- Verification command: `npm run verify` (lint + typecheck + test)
- Security audit: `npm audit --audit-level=high`
- Not yet configured: GitHub Actions, Azure DevOps, or other CI provider

**Infrastructure as Code:**

- Terraform (planned per documentation)

## Environment Configuration

**Required env vars (Backend):**

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `ELASTICSEARCH_NODE` - Elasticsearch endpoint
- `JWT_SECRET` - Secret for JWT signing
- `ANTHROPIC_API_KEY` - Claude API key
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email delivery
- `EMAIL_FROM` - Default sender address
- `CORS_ORIGIN` - Allowed frontend origins

**Required env vars (Frontend):**

- `NEXT_PUBLIC_API_URL` - Backend API endpoint (default: http://localhost:3001)

**Optional/Production env vars:**

- `AZURE_STORAGE_CONNECTION_STRING` - Azure Blob Storage
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `NODE_ENV` - Environment (development/production)
- `PORT`, `HOST` - Server binding
- `AI_DEFAULT_MODEL`, `AI_MAX_TOKENS` - AI configuration overrides

**Secrets location:**

- Development: `.env` files (gitignored)
- Production: Azure Key Vault (planned), Azure App Service configuration

## Webhooks & Callbacks

**Incoming:**

- **SSO callbacks**
  - Google: `/api/v1/auth/google/callback`
  - Azure AD: `/api/v1/auth/azure/callback`
  - SAML: `/api/v1/auth/saml/callback`
- **Webhook endpoint** (planned)
  - Controller: `apps/backend/src/modules/notifications/controllers/webhook.controller.ts`
  - Purpose: External system notifications, HRIS sync, email delivery status

**Outgoing:**

- None currently implemented
- Planned: HRIS integration webhooks, third-party case management integrations

## Real-Time Communication

**WebSocket Server:**

- **Socket.io** 4.8.3 (server) + socket.io-client 4.8.3 (client)
- Namespaces:
  - `/notifications` - Real-time notification delivery
  - Project updates gateway exists (`apps/backend/src/modules/projects/gateways/project.gateway.ts`)
  - AI streaming gateway (`apps/backend/src/modules/ai/ai.gateway.ts`)
- Authentication: JWT auth on WebSocket handshake via `apps/backend/src/modules/auth/guards/jwt-ws.guard.ts`
- Room naming: Tenant-isolated `org:{organizationId}:user:{userId}`
- CORS: Configured via `CORS_ORIGIN` env var
- Implementation: `apps/backend/src/modules/notifications/gateways/notification.gateway.ts`

**Client features:**

- Event listeners: notification:new, notification:unread_count, notification:marked_read, error
- Event emitters: mark_read, get_unread_count, get_recent (poll fallback)
- Background sync: PWA background sync for offline form submissions
- Service Worker: `@ducanh2912/next-pwa` for offline support

## Email Delivery

**SMTP Transport:**

- Library: `@nestjs-modules/mailer` 2.0.2 + `nodemailer` 7.0.13
- Config: `apps/backend/src/modules/notifications/mailer.config.ts`
- Development: Mailhog (localhost:1025) - Docker container on ports 1025 (SMTP) / 8025 (Web UI)
- Production: SendGrid, SES, or SMTP relay
- Connection pool: Max 5 connections, 100 messages per connection
- Timeouts: 10s connection, 60s socket

**Email Templates:**

- Template engine: Handlebars 4.7.8
- Markup: MJML 4.18.0 (responsive email markup)
- Service: `apps/backend/src/modules/notifications/services/email-template.service.ts`
- Storage: Database-stored templates in `EmailTemplate` table
- Templates location: `apps/backend/src/modules/notifications/templates/`

**Delivery Tracking:**

- Service: `apps/backend/src/modules/notifications/services/delivery-tracker.service.ts`
- Table: `NotificationDelivery` (tracks delivery status, retries, failures)

## Job Queue & Background Processing

**Queue System:**

- BullMQ 5.67.2 (Redis-based job queue)
- NestJS integration: `@nestjs/bullmq` 11.0.4
- Dashboard: Bull Board UI (`@bull-board/express` + `@bull-board/api`)
- Queues detected:
  - Campaign scheduling: `apps/backend/src/modules/campaigns/campaign-scheduling.processor.ts`
  - Export jobs: `apps/backend/src/modules/reporting/export.service.ts`
  - Digest processing: `apps/backend/src/modules/notifications/services/digest.service.ts`
  - Email delivery: `apps/backend/src/modules/notifications/services/notification.service.ts`
  - Migration jobs: `apps/backend/src/modules/analytics/migration/migration.module.ts`
  - Search indexing: `apps/backend/src/modules/search/indexing/indexing.service.ts`

## Development Services (Docker Compose)

**Local services:** `docker-compose.yml` at project root

- **PostgreSQL 15** - `ethico-postgres` on port 5432
- **Redis 7** - `ethico-redis` on port 6379
- **Elasticsearch 8.11.0** - `ethico-elasticsearch` on ports 9200/9300
- **Mailhog** - `ethico-mailhog` on ports 1025 (SMTP) / 8025 (Web UI)

All services configured with health checks, auto-restart, and persistent volumes.

---

_Integration audit: 2026-02-13_
