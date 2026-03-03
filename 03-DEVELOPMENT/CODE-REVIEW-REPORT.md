# Pre-Series A Code Review Report

**Date:** 2026-02-13
**Reviewer:** Claude (Principal Engineer simulation)
**Codebase:** Ethico Risk Intelligence Platform
**Branch:** `main` (commit `9ac072f`)

---

## Executive Summary

**Overall Grade: C-**

The Risk Intelligence Platform has **strong architectural foundations** — multi-tenant RLS, modular NestJS structure, comprehensive Prisma schema (127 models, 447 indexes), and solid infrastructure patterns (DataLoaders, event-driven design, Sentry integration). However, it has **critical gaps** that would fail a SOC 2 Type II audit, professional penetration test, or CTO due diligence review in its current state.

### Codebase At a Glance

| Metric                    | Value               |
| ------------------------- | ------------------- |
| Backend modules           | 42                  |
| Prisma models             | 127                 |
| Database indexes          | 447                 |
| Services                  | 159                 |
| Controllers               | 76                  |
| Frontend source files     | 546                 |
| Backend unit test files   | 7                   |
| Backend E2E test files    | 15                  |
| Frontend test files       | 10                  |
| Unit test coverage (est.) | ~2.5%               |
| Bare `throw new Error`    | 133 across 37 files |
| Nullable `organizationId` | 7 models            |
| WebSocket CORS wildcards  | 3 gateways          |

### Dimension Grades

| #   | Dimension                   | Grade  | Critical Issues                                                         |
| --- | --------------------------- | ------ | ----------------------------------------------------------------------- |
| 1   | Security & SOC 2 Readiness  | **C+** | Exposed API key, CORS wildcards, nullable tenant IDs                    |
| 2   | AI Code Slop Detection      | **D+** | 133 bare errors, large monolithic services, boilerplate duplication     |
| 3   | Performance & Scalability   | **B**  | DB pool=10, no compression, no Redis caching layer                      |
| 4   | Code Quality & Architecture | **C+** | Controller business logic, 1800-line services, missing error boundaries |
| 5   | Test Coverage               | **F**  | 2.5% unit coverage vs 80% target, zero controller tests                 |
| 6   | Production Readiness        | **D+** | No Dockerfile, no graceful shutdown, static health check                |

---

## Dimension 1: Security & SOC 2 Readiness — Grade: C+

### Findings

| #   | Severity     | Finding                                                                                                | File                                       | Line(s)                                  |
| --- | ------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ---------------------------------------- |
| S1  | **CRITICAL** | Exposed Anthropic API key in `.env`                                                                    | `apps/backend/.env`                        | 42                                       |
| S2  | **HIGH**     | WebSocket CORS wildcard fallback (`origin: process.env.CORS_ORIGIN \|\| "*"`) in 3 gateways            | See below                                  | —                                        |
| S3  | **HIGH**     | 7 models with nullable `organizationId String?` bypass RLS                                             | `apps/backend/prisma/schema.prisma`        | 1134, 1906, 1951, 3308, 3752, 3810, 5428 |
| S4  | **MEDIUM**   | No CSRF protection middleware                                                                          | `apps/backend/src/main.ts`                 | —                                        |
| S5  | **MEDIUM**   | JWT secret has no rotation mechanism; defaults to HS256                                                | `apps/backend/src/config/configuration.ts` | 17-30                                    |
| S6  | **MEDIUM**   | Global exception filters exist but are NOT registered via `useGlobalFilters()` — stack traces may leak | `apps/backend/src/main.ts`                 | —                                        |
| S7  | **MEDIUM**   | No body size limits configured                                                                         | `apps/backend/src/main.ts`                 | —                                        |
| S8  | **LOW**      | Secrets management designed in Terraform but not implemented in application code                       | `apps/backend/src/config/configuration.ts` | —                                        |

#### S1: Exposed API Key (CRITICAL)

```
# apps/backend/.env line 42
ANTHROPIC_API_KEY=sk-ant-api03-REDACTED
```

**Mitigation:** `.env` is in `.gitignore` (line 19), so this is not committed to the remote repo. However, it exists in the local repo and the key should be rotated immediately as a precaution.

**Action:** Rotate the key in the Anthropic dashboard now.

#### S2: WebSocket CORS Wildcard (HIGH)

All three gateways fall back to `"*"` when `CORS_ORIGIN` is unset, combined with `credentials: true`:

| Gateway              | File                                                                      | Line    |
| -------------------- | ------------------------------------------------------------------------- | ------- |
| AI Gateway           | `apps/backend/src/modules/ai/ai.gateway.ts`                               | 75-81   |
| Project Gateway      | `apps/backend/src/modules/projects/gateways/project.gateway.ts`           | 108-114 |
| Notification Gateway | `apps/backend/src/modules/notifications/gateways/notification.gateway.ts` | 74-80   |

**Fix:** Replace `"*"` fallback with an explicit throw or deny:

```typescript
origin: process.env.CORS_ORIGIN ||
  (() => {
    throw new Error("CORS_ORIGIN required");
  })();
```

#### S3: Nullable organizationId (HIGH)

These 7 models can exist without tenant assignment, potentially bypassing RLS:

| Model                | Line in schema.prisma |
| -------------------- | --------------------- |
| ReportTemplate       | 1134                  |
| AiContextFile        | 1906                  |
| PromptTemplate       | 1951                  |
| ProjectTemplate      | 3308                  |
| QuizAttempt          | 3752                  |
| Certificate          | 3810                  |
| KnowledgeBaseArticle | 5428                  |

**Note:** Some may be intentionally nullable for "system" templates. If so, document the reasoning and add application-level checks to prevent tenant data from being stored without `organizationId`.

### What's Working Well

- Helmet security headers enabled (`main.ts:39`)
- Swagger disabled in production (`main.ts:67`)
- `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` (`main.ts:42-51`)
- Rate limiting via `ThrottlerModule` with Redis backend (`app.module.ts:62-77`, 100 req/min)
- RLS enforcement via `TenantMiddleware` with parameterized queries
- MFA (TOTP) and SSO (Azure AD, Google, SAML) support
- JWT with 15min access / 7day refresh token expiry
- Sentry integration with sensitive field sanitization
- `.env` properly in `.gitignore`

---

## Dimension 2: AI Code Slop Detection — Grade: D+

### Findings

| #   | Severity     | Finding                                                                              | Scope                   |
| --- | ------------ | ------------------------------------------------------------------------------------ | ----------------------- |
| A1  | **CRITICAL** | 133 bare `throw new Error()` across 37 files bypass NestJS exception filters         | Backend-wide            |
| A2  | **HIGH**     | 10+ services exceed 500 LOC (largest: 1838 lines) — single responsibility violations | Backend services        |
| A3  | **HIGH**     | 4 nearly-identical association services with duplicated CRUD logic                   | `modules/associations/` |
| A4  | **MEDIUM**   | 4+ controllers contain business logic (largest: 1085 lines)                          | Backend controllers     |
| A5  | **MEDIUM**   | 5 DTOs with 30+ fields that should be split                                          | Various modules         |
| A6  | **MEDIUM**   | 19+ frontend files with hardcoded `localhost` fallback URLs                          | Frontend components     |
| A7  | **LOW**      | Module-level socket singleton in component (non-standard pattern)                    | `ai-chat-panel.tsx`     |
| A8  | **LOW**      | Circular dependencies mitigated with `forwardRef` (2 cases)                          | `jobs.module.ts`        |

#### A1: Bare `throw new Error()` — 133 instances (CRITICAL)

These errors bypass the `HttpExceptionFilter` and `SentryExceptionFilter`, resulting in unstructured 500 responses with potential stack trace exposure.

**Top offenders:**

| File                                                               | Count |
| ------------------------------------------------------------------ | ----- |
| `modules/projects/events/project.events.ts`                        | 18    |
| `modules/events/events/sla.events.ts`                              | 15    |
| `modules/policies/events/policy.events.ts`                         | 12    |
| `modules/events/events/case.events.ts`                             | 11    |
| `modules/events/events/investigation.events.ts`                    | 10    |
| `modules/analytics/migration/processors/migration.processor.ts`    | 9     |
| `modules/policies/associations/policy-case-association.service.ts` | 7     |
| `modules/notifications/services/email-template.service.ts`         | 5     |
| Others (29 files)                                                  | 46    |

**Fix:** Replace with appropriate NestJS exceptions (`BadRequestException`, `NotFoundException`, `InternalServerErrorException`, etc.) and register the global exception filter:

```typescript
// main.ts
app.useGlobalFilters(new HttpExceptionFilter(), new SentryExceptionFilter());
```

#### A2: Oversized Services (HIGH)

| Service                            | Lines | Module              |
| ---------------------------------- | ----- | ------------------- |
| `report-field-registry.service.ts` | 1838  | analytics/reports   |
| `rius.service.ts`                  | 1410  | rius                |
| `conflict-detection.service.ts`    | 1402  | disclosures         |
| `disclosure-submission.service.ts` | 1328  | disclosures         |
| `widget-data.service.ts`           | 1240  | analytics/dashboard |
| `board-report.service.ts`          | 1189  | analytics/exports   |
| `migration.service.ts`             | 1159  | analytics/migration |
| `task-aggregator.service.ts`       | 1099  | analytics/my-work   |
| `ai-triage.service.ts`             | 990   | disclosures         |
| `campaign-targeting.service.ts`    | 971   | campaigns           |

These indicate AI-generated code that was not decomposed after generation. Target: <300 LOC per service.

#### A3: Duplicated Association Services (HIGH)

All four services in `modules/associations/` share near-identical patterns:

- `person-case-association.service.ts`
- `person-person-association.service.ts`
- `person-riu-association.service.ts`
- `case-case-association.service.ts`

Each duplicates: PrismaService injection, label checking helpers (`isEvidentiaryLabel`, `isDirectionalLabel`), CRUD operations, event emission, and audit logging. Should extract a `BaseAssociationService<T>` generic.

### AI Slop Assessment

**Estimated AI Slop Level: 30-40% of codebase**

| Indicator                                                | Present?        | Severity |
| -------------------------------------------------------- | --------------- | -------- |
| Bare `throw new Error()` instead of framework exceptions | Yes (133x)      | Critical |
| Monolithic 1000+ LOC services                            | Yes (10+)       | High     |
| Copy-paste duplication without abstraction               | Yes (4 files)   | High     |
| Hardcoded localhost fallbacks                            | Yes (19+ files) | Medium   |
| Module-level singletons in React components              | Yes             | Low      |
| Trivial restatement comments                             | Minimal         | Low      |

---

## Dimension 3: Performance & Scalability — Grade: B

### Findings

| #   | Severity   | Finding                                             | File                           | Detail                            |
| --- | ---------- | --------------------------------------------------- | ------------------------------ | --------------------------------- |
| P1  | **HIGH**   | DB connection pool default = 10                     | `config/database.config.ts:5`  | Too low for 10K+ users            |
| P2  | **MEDIUM** | No response compression (gzip/brotli)               | `main.ts`                      | Missing middleware                |
| P3  | **MEDIUM** | No dedicated Redis caching layer                    | —                              | Redis used only for rate limiting |
| P4  | **LOW**    | Elasticsearch timeout = 30s (target <500ms)         | `config/configuration.ts:51`   | Timeout too generous              |
| P5  | **LOW**    | PgBouncer support exists but not enabled by default | `config/database.config.ts:16` | Needs activation in prod          |

### What's Working Well

- **DataLoader N+1 prevention**: 9 DataLoader instances with per-request batching and caching (`common/dataloader/dataloader.factory.ts:69-345`)
- **Pagination enforced**: Default 20, Max 100, validated with `@Min(1) @Max(100)` (`cases/dto/case-query.dto.ts:49-73`)
- **447 database indexes** with multi-tenant composite design (org + status, org + date, etc.)
- **Event emitter memory leak safeguards**: `maxListeners: 20`, `verboseMemoryLeak: true` (`events/events.module.ts:20-28`)
- **BullMQ job queues** for async processing (AI, Email, Export, Indexing)
- **PrismaService cleanup** via `OnModuleDestroy` (`prisma/prisma.service.ts:13-15`)

### Scaling Recommendations for 10K+ Users

| Action           | Current              | Recommended                                  | Effort   |
| ---------------- | -------------------- | -------------------------------------------- | -------- |
| DB pool size     | 10                   | 50-100 with PgBouncer                        | 1 hour   |
| Add compression  | None                 | `compression` middleware                     | 30 min   |
| Redis caching    | Rate limiting only   | Cache hot queries (cases list, user lookups) | 1-2 days |
| Enable PgBouncer | Configured, disabled | Enable in production                         | 2 hours  |
| ES timeout       | 30s                  | 5s with circuit breaker                      | 2 hours  |

---

## Dimension 4: Code Quality & Architecture — Grade: C+

### Findings

| #   | Severity   | Finding                                               | Detail                                                                                                                                                                        |
| --- | ---------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | **HIGH**   | Controllers with business logic                       | `report.controller.ts` (1085 LOC), `projects.controller.ts` (885 LOC), `cases.controller.ts` (614 LOC), `ai.controller.ts` (580 LOC)                                          |
| Q2  | **HIGH**   | Only 1 error boundary in entire frontend              | `cases/[id]/error.tsx` — 545 other files have none                                                                                                                            |
| Q3  | **MEDIUM** | Large DTOs (30+ fields)                               | `report.dto.ts` (683 LOC), `conflict.dto.ts` (605 LOC), `organization-settings.dto.ts` (535 LOC), `threshold-rule.dto.ts` (533 LOC), `disclosure-submission.dto.ts` (467 LOC) |
| Q4  | **MEDIUM** | 3 association services exported without controllers   | `PersonRiuAssociation`, `CaseCaseAssociation`, `PersonPersonAssociation` have services but no REST endpoints                                                                  |
| Q5  | **LOW**    | 2 circular dependencies (mitigated with `forwardRef`) | `JobsModule` ↔ `SearchModule`, `JobsModule` ↔ `NotificationsModule`                                                                                                           |

### What's Working Well

- Clean NestJS modular architecture with 42 feature modules
- Well-designed entity pattern with `organizationId`, `createdById`, `updatedById`, audit fields
- Proper use of decorators (`@Roles`, `@UseGuards`, `@TenantId`, `@CurrentUser`)
- Interface abstractions at genuine extension points (`AIProvider`, `StorageInterface`)
- Event-driven design with typed events requiring `organizationId`
- `BaseEvent` class enforcing tenant context on all events

---

## Dimension 5: Test Coverage — Grade: F

### Findings

| #   | Severity     | Finding                                              | Detail                                                                                                 |
| --- | ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| T1  | **CRITICAL** | ~2.5% backend unit test coverage                     | 7 spec files / 159 services + 76 controllers                                                           |
| T2  | **CRITICAL** | Zero controller spec files                           | 0 / 76 controllers                                                                                     |
| T3  | **CRITICAL** | Security guards/middleware have zero unit tests      | `jwt-auth.guard`, `roles.guard`, `tenant.guard`, `tenant.middleware` — all untested                    |
| T4  | **HIGH**     | Auth module completely untested                      | 8 services (auth, SSO, MFA, domain, token-refresh) — zero tests                                        |
| T5  | **HIGH**     | Core business modules untested                       | Cases (4 services), RIUs (5 services), AI (9 services), Campaigns (10 services), Policies (5 services) |
| T6  | **HIGH**     | Frontend: 10 test files / 546 source files (~1.8%)   | Only `cases` components tested                                                                         |
| T7  | **MEDIUM**   | No MSW (Mock Service Worker) configured for frontend | API responses not mocked in tests                                                                      |
| T8  | **LOW**      | Testing strategy doc targets 85% line coverage       | Current: ~2.5% — massive gap                                                                           |

### Test File Inventory

**Backend Unit Tests (7 files):**
| File | Module |
|------|--------|
| `activity.service.spec.ts` | common/services |
| `activity-description.service.spec.ts` | common/services |
| `storage.service.spec.ts` | common/services |
| `local-storage.adapter.spec.ts` | common/services |
| `investigation-notes.service.spec.ts` | investigation-notes |
| `investigations.service.spec.ts` | investigations |
| `metrics.service.spec.ts` | metrics |

**Backend E2E Tests (15 files):**
| Category | Count | Files |
|----------|-------|-------|
| Smoke tests | 5 | auth-flow, case-flow, investigation-flow, activity-timeline, tenant-isolation |
| Feature E2E | 7 | investigations (2), investigation-notes (2), activity (2), app |
| Integration E2E | 2 | websocket, ai-gateway |
| Tenant isolation | 1 | tenant-isolation |

**Frontend Unit Tests (10 files):**
All in `components/cases/__tests__/`: activity-entry, activity-filters, case-activity-timeline, case-header, case-investigations-panel, case-properties-panel, create-investigation-dialog, editable-field, investigation-card, property-section.

**Frontend E2E Tests (7 files):**
smoke, case-creation, search-filters, user-management, attachments, tenant-isolation, phase-11.1-navigation.

### Priority Test Gaps

**Priority 1 — Security (would fail pen test):**

- `tenant.guard.ts` — multi-tenancy enforcement
- `tenant.middleware.ts` — RLS session variable setting
- `jwt-auth.guard.ts` — JWT validation
- `roles.guard.ts` — RBAC enforcement
- `auth.service.ts` — authentication flows

**Priority 2 — Core Business Logic (would fail CTO review):**

- `cases.service.ts` — case CRUD and lifecycle
- `rius.service.ts` — RIU creation and immutability
- `investigations.service.ts` — investigation workflows
- `campaigns.service.ts` — campaign lifecycle
- `policies.service.ts` — policy CRUD and versioning

**Priority 3 — Data Integrity:**

- All 4 association services
- `activity.service.ts` — audit logging
- `search.service.ts` — Elasticsearch queries
- `notification.service.ts` — delivery tracking

---

## Dimension 6: Production Readiness — Grade: D+

### Findings

| #   | Severity     | Finding                                                              | File                          | Detail                                                                  |
| --- | ------------ | -------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| R1  | **CRITICAL** | No Dockerfile                                                        | —                             | Cannot containerize for deployment                                      |
| R2  | **CRITICAL** | Secrets in plaintext `.env` — no Azure Key Vault integration in code | `config/configuration.ts`     | Terraform designed but not implemented                                  |
| R3  | **HIGH**     | No graceful shutdown hooks                                           | `main.ts`                     | `enableShutdownHooks()` not called; no SIGTERM/SIGINT handlers          |
| R4  | **HIGH**     | Static health check — no DB/Redis/ES connectivity probes             | `health/health.controller.ts` | Returns `{ status: "ok" }` unconditionally                              |
| R5  | **HIGH**     | Global exception filters not registered                              | `main.ts`                     | `HttpExceptionFilter` and `SentryExceptionFilter` exist but not applied |
| R6  | **MEDIUM**   | No environment validation schema                                     | `config/configuration.ts`     | Only JWT_SECRET validated for production                                |
| R7  | **MEDIUM**   | No OpenTelemetry/APM instrumentation                                 | —                             | Sentry has basic tracing, not distributed                               |
| R8  | **LOW**      | Backup/DR documented in Terraform spec but not automated in code     | `INFRASTRUCTURE-SPEC.md`      | RPO: 1hr, RTO: 4hr (documented)                                         |

### What's Working Well

- **CI/CD pipeline** via GitHub Actions (`.github/workflows/ci.yml`, 283 lines, 7 stages)
- **Structured logging** with Pino (JSON in production, pretty in dev)
- **Sentry error tracking** with sampling, profiling, and sensitive field redaction
- **API versioning** with `/api/v1` prefix
- **Docker Compose** for local dev (PostgreSQL 15, Redis 7, Elasticsearch 8.11, Mailhog)
- **Rate limiting** with Redis-backed ThrottlerModule

### CI/CD Pipeline Stages

1. Lint & Type Check
2. Backend Unit Tests (with coverage artifacts)
3. Backend Integration Tests (PostgreSQL + Redis services)
4. Tenant Isolation Tests (security gate)
5. Security Audit (`npm audit` with critical failure gate)
6. Frontend Tests
7. Build Verification

---

## Prioritized Fix Lists

### Before CTO Due Diligence (Top 5)

| #   | Fix                                                                                       | Effort    | Impact                                          |
| --- | ----------------------------------------------------------------------------------------- | --------- | ----------------------------------------------- |
| 1   | **Rotate exposed API key** immediately                                                    | 15 min    | Eliminates credential exposure                  |
| 2   | **Register global exception filters** + replace bare `throw new Error` in top 10 files    | 4-6 hours | Prevents stack trace leaks, standardizes errors |
| 3   | **Add unit tests for security layer** (4 guards/middleware)                               | 1-2 days  | Proves tenant isolation works                   |
| 4   | **Add unit tests for top 5 core services** (cases, rius, investigations, auth, campaigns) | 3-5 days  | Demonstrates code quality                       |
| 5   | **Create Dockerfile + graceful shutdown**                                                 | 4 hours   | Shows production readiness                      |

### Before SOC 2 Type II Audit (Top 5)

| #   | Fix                                                                             | Effort    | Impact                        |
| --- | ------------------------------------------------------------------------------- | --------- | ----------------------------- |
| 1   | **Make all 7 nullable `organizationId` fields required** or document exceptions | 2-4 hours | Closes tenant isolation gaps  |
| 2   | **Fix WebSocket CORS wildcards** in 3 gateway files                             | 30 min    | Eliminates origin bypass      |
| 3   | **Implement Azure Key Vault integration** for secrets                           | 1-2 days  | Secrets management compliance |
| 4   | **Add environment validation schema** (Joi/Zod for all env vars)                | 4 hours   | Configuration integrity       |
| 5   | **Add deep health check** (DB + Redis + ES connectivity)                        | 2 hours   | Service monitoring compliance |

### Before Penetration Test (Top 5)

| #   | Fix                                                   | Effort    | Impact                              |
| --- | ----------------------------------------------------- | --------- | ----------------------------------- |
| 1   | **Fix CORS wildcard + register global filters**       | 2 hours   | Eliminates 2 easy attack surfaces   |
| 2   | **Add CSRF protection**                               | 2-4 hours | Prevents cross-site request forgery |
| 3   | **Configure body size limits**                        | 30 min    | Prevents payload abuse              |
| 4   | **Add JWT key rotation** + switch to RS256            | 1-2 days  | Stronger token security             |
| 5   | **Tenant isolation E2E tests for all CRUD endpoints** | 3-5 days  | Proves no cross-tenant access       |

---

## Appendix A: Full File Inventory

### Backend Service Files Without Tests (152 of 159)

<details>
<summary>Click to expand full list</summary>

**Auth Module (8 services, 0 tests):**

- `modules/auth/auth.service.ts`
- `modules/auth/sso/sso.service.ts`
- `modules/auth/mfa/mfa.service.ts`
- `modules/auth/domain/domain.service.ts`
- `modules/auth/sso/sso-config.service.ts`
- `modules/auth/mfa/recovery-codes.service.ts`
- `modules/auth/domain/domain-verification.service.ts`
- `modules/auth/services/token-refresh.service.ts`

**Cases Module (4 services, 0 tests):**

- `modules/cases/cases.service.ts`
- `modules/cases/case-merge.service.ts`
- `modules/cases/case-pipeline.service.ts`
- `modules/cases/pipeline.service.ts`

**RIUs Module (5 services, 0 tests):**

- `modules/rius/rius.service.ts`
- `modules/rius/riu-access.service.ts`
- `modules/rius/extensions/hotline-riu.service.ts`
- `modules/rius/extensions/web-form-riu.service.ts`
- `modules/rius/extensions/disclosure-riu.service.ts`

**AI Module (9 services, 0 tests):**

- `modules/ai/services/ai-client.service.ts`
- `modules/ai/services/context-loader.service.ts`
- `modules/ai/services/conversation.service.ts`
- `modules/ai/services/prompt.service.ts`
- `modules/ai/services/rate-limiter.service.ts`
- `modules/ai/services/provider-registry.service.ts`
- `modules/ai/actions/action-executor.service.ts`
- `modules/ai/schema-introspection.service.ts`
- `modules/analytics/ai-query/ai-query.service.ts`

**Campaigns Module (10 services, 0 tests):**

- `modules/campaigns/campaigns.service.ts`
- `modules/campaigns/attestation/attestation-campaign.service.ts`
- `modules/campaigns/attestation/attestation-response.service.ts`
- `modules/campaigns/assignments/campaign-assignment.service.ts`
- `modules/campaigns/campaign-dashboard.service.ts`
- `modules/campaigns/campaign-reminder.service.ts`
- `modules/campaigns/campaign-scheduling.service.ts`
- `modules/campaigns/campaign-targeting.service.ts`
- `modules/campaigns/campaign-translation.service.ts`
- `modules/campaigns/targeting/segment.service.ts`

**Analytics Module (26 services, 0 tests):**

- `modules/analytics/reports/report.service.ts`
- `modules/analytics/exports/excel-export.service.ts`
- `modules/analytics/exports/pdf-generator.service.ts`
- `modules/analytics/exports/pptx-generator.service.ts`
- `modules/analytics/dashboard/dashboard-config.service.ts`
- `modules/analytics/dashboard/widget-data.service.ts`
- `modules/analytics/migration/migration.service.ts`
- And 19 more...

**Policies Module (5 services, 0 tests):**

- `modules/policies/policies.service.ts`
- `modules/policies/approval/policy-approval.service.ts`
- `modules/policies/translations/policy-translation.service.ts`
- `modules/policies/associations/policy-case-association.service.ts`
- `modules/policies/events/policy.events.ts`

**Notifications Module (5 services, 0 tests):**

- `modules/notifications/services/notification.service.ts`
- `modules/notifications/services/preference.service.ts`
- `modules/notifications/services/email-template.service.ts`
- `modules/notifications/services/delivery-tracker.service.ts`
- `modules/notifications/services/digest.service.ts`

**Disclosures Module (4 services, 0 tests):**

- `modules/disclosures/disclosure-form.service.ts`
- `modules/disclosures/disclosure-submission.service.ts`
- `modules/disclosures/conflict-detection.service.ts`
- `modules/disclosures/ai-triage.service.ts`

**Plus 81 additional services across:** investigations, projects, search, users, persons, organization, operations, help, associations, storage, jobs, events, messaging, portals, remediation, tables, reporting, forms, subjects, interactions modules.

</details>

### Bare `throw new Error` — All 37 Files

<details>
<summary>Click to expand full list</summary>

| File                                                                 | Count |
| -------------------------------------------------------------------- | ----- |
| `config/configuration.ts`                                            | 1     |
| `common/services/local-storage.adapter.ts`                           | 1     |
| `modules/ai/skills/platform/risk-score.skill.ts`                     | 1     |
| `modules/ai/skills/platform/category-suggest.skill.ts`               | 1     |
| `modules/ai/agents/agent.registry.ts`                                | 1     |
| `modules/ai/services/provider-registry.service.ts`                   | 2     |
| `modules/ai/services/prompt.service.ts`                              | 3     |
| `modules/messaging/messaging.controller.ts`                          | 2     |
| `modules/ai/services/ai-client.service.ts`                           | 1     |
| `modules/ai/providers/claude.provider.ts`                            | 1     |
| `modules/ai/actions/actions/change-status.action.ts`                 | 2     |
| `modules/ai/actions/actions/add-note.action.ts`                      | 2     |
| `modules/ai/actions/actions/add-case-note.action.ts`                 | 2     |
| `modules/campaigns/campaign-scheduling.processor.ts`                 | 4     |
| `modules/analytics/exports/processors/scheduled-export.processor.ts` | 1     |
| `modules/analytics/exports/pdf-generator.service.ts`                 | 1     |
| `modules/notifications/services/notification.service.ts`             | 1     |
| `modules/notifications/services/email-template.service.ts`           | 5     |
| `modules/events/events/sla.events.ts`                                | 15    |
| `modules/events/events/investigation.events.ts`                      | 10    |
| `modules/analytics/migration/screenshot-to-form.service.ts`          | 1     |
| `modules/events/events/base.event.ts`                                | 1     |
| `modules/events/events/case.events.ts`                               | 11    |
| `modules/analytics/migration/processors/migration.processor.ts`      | 9     |
| `modules/analytics/ai-query/ai-query.service.ts`                     | 1     |
| `modules/jobs/processors/email.processor.ts`                         | 2     |
| `modules/jobs/processors/ai.processor.ts`                            | 1     |
| `modules/operations/client-health/health-score.processor.ts`         | 1     |
| `modules/policies/events/policy.events.ts`                           | 12    |
| `modules/policies/associations/policy-case-association.service.ts`   | 7     |
| `modules/portals/employee/manager-proxy.service.ts`                  | 1     |
| `modules/analytics/migration/connectors/base.connector.ts`           | 2     |
| `modules/projects/events/project.events.ts`                          | 18    |
| `modules/reporting/report-template.service.ts`                       | 4     |
| `modules/rius/riu-access.service.ts`                                 | 1     |
| `modules/tables/user-table.controller.ts`                            | 1     |
| `modules/storage/providers/azure-blob.provider.ts`                   | 3     |

**Total: 133 instances across 37 files**

</details>

---

## Appendix B: Methodology

This review was conducted by launching 6 parallel deep-analysis agents, each performing 30-50 tool operations across the codebase. Critical findings were independently verified by:

1. Reading source files directly to confirm code patterns
2. Running `grep` counts for quantitative metrics
3. Cross-referencing multiple agent findings for consistency

All file paths and line numbers were verified against the codebase at commit `9ac072f` on the `main` branch.

---

_Report generated 2026-02-13. Review performed on commit `9ac072f` (main branch)._
