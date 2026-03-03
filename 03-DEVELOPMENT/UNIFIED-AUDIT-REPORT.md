# Unified Platform Audit Report

**Project:** Ethico Risk Intelligence Platform
**Date:** 2026-02-13
**Sources:** Code Review Report (Principal Engineer simulation) + Silent Failure Audit (Static Analysis)
**Commit:** `9ac072f` on `main` branch

---

## Executive Summary

Two independent reviews of the Risk Intelligence Platform identified **42 unique findings** across security, reliability, code quality, performance, testing, and production readiness. After deduplication (6 overlapping findings merged), **36 distinct issues** remain.

**Overall Grade: C-**

The platform has strong architectural foundations -- multi-tenant RLS, modular NestJS (42 modules, 127 Prisma models, 447 indexes), DataLoader N+1 prevention, event-driven design, and a well-designed CI/CD pipeline. However, it has critical gaps that would fail a SOC 2 Type II audit, professional penetration test, or CTO due diligence review.

The single most dangerous finding is a **tenant data isolation vulnerability** where a database failure during RLS bypass cleanup can leave a connection in an unscoped state, potentially leaking data across tenants (a HIPAA-level risk for a healthcare compliance platform). Combined with near-zero test coverage (~2.5%), no Dockerfile, and 133 bare `throw new Error` statements that bypass exception filters, the platform is not production-ready.

### Risk Snapshot

| Severity     | Count | Key Theme                                                                          |
| ------------ | ----- | ---------------------------------------------------------------------------------- |
| **Critical** | 8     | Tenant isolation, credential exposure, silent service failures, zero test coverage |
| **High**     | 12    | CORS wildcards, monolithic services, audit trail gaps, data orphaning              |
| **Medium**   | 13    | Missing middleware, silent UI failures, hardcoded URLs, type safety                |
| **Low**      | 3     | Configuration tuning, logging gaps                                                 |

### What's Working Well

- Helmet security headers, Swagger disabled in production
- ValidationPipe with whitelist + forbidNonWhitelisted
- Rate limiting via ThrottlerModule with Redis backend (100 req/min)
- RLS enforcement via TenantMiddleware with parameterized queries
- MFA (TOTP), SSO (Azure AD, Google, SAML), JWT 15min/7day tokens
- Sentry integration with sensitive field sanitization
- DataLoader N+1 prevention (9 instances)
- Pagination enforced (default 20, max 100)
- 447 database indexes with multi-tenant composite design
- BullMQ job queues for async processing
- CI/CD pipeline: 7-stage GitHub Actions with tenant isolation gate
- Clean decorator usage (@Roles, @UseGuards, @TenantId, @CurrentUser)
- Interface abstractions at genuine extension points (AIProvider, StorageInterface)
- Event-driven design with BaseEvent enforcing tenant context

---

## Critical Issues (8)

Issues that pose immediate security risk, data integrity risk, or would fail compliance audits.

### C1. Tenant Data Isolation Vulnerability -- RLS Bypass Stuck Open

**Sources:** Silent Failure #4
**Location:** `apps/backend/src/modules/prisma/prisma.service.ts:53-60`

`withBypassRLS()` uses a `finally` block to call `disableBypassRLS()`. If `disableBypassRLS()` fails (connection drop, pool exhaustion, transaction timeout), the PostgreSQL session variable `app.bypass_rls` remains `'true'`. If that connection is returned to the pool, **all subsequent requests on that connection bypass Row-Level Security**, allowing cross-tenant data access.

For a healthcare compliance platform, this is a potential HIPAA violation.

**Fix:** Wrap `disableBypassRLS()` in its own try-catch; on failure, `$disconnect()` to destroy the tainted connection rather than returning it to the pool. Log as SECURITY alert.

---

### C2. Exposed Anthropic API Key

**Sources:** Code Review S1
**Location:** `apps/backend/.env:42`

A live `sk-ant-api03-*` key exists in the local `.env` file. While `.gitignore` prevents commit to remote, the key should be rotated immediately as a precaution.

**Fix:** Rotate the key in the Anthropic dashboard now. Implement Azure Key Vault integration (see C8).

---

### C3. 133 Bare `throw new Error()` Bypass Exception Filters

**Sources:** Code Review A1 + Silent Failure #1 (deduplicated -- both identify unhandled exception paths)
**Location:** 37 backend files (top offenders: `project.events.ts` 18x, `sla.events.ts` 15x, `policy.events.ts` 12x, `case.events.ts` 11x)

Bare `throw new Error()` bypasses NestJS `HttpExceptionFilter` and `SentryExceptionFilter`, producing unstructured 500 responses with potential stack trace exposure. The global exception filters exist but are **not registered** via `useGlobalFilters()` in `main.ts`.

Additionally, the `HttpExceptionFilter`'s non-Error `else` branch (line 70-74) drops exceptions without any logging -- completely losing the error.

**Fix:**

1. Register global exception filters in `main.ts`: `app.useGlobalFilters(new HttpExceptionFilter(), new SentryExceptionFilter())`
2. Add logging to the non-Error else branch in the filter
3. Replace bare `throw new Error()` with NestJS exceptions (`BadRequestException`, `NotFoundException`, etc.) starting with the top 10 files

---

### C4. ~2.5% Backend Unit Test Coverage (Target: 80%)

**Sources:** Code Review T1, T2, T3
**Location:** 7 spec files covering 7 of 159 services; 0 of 76 controllers tested

The testing strategy document targets 85% line coverage. Actual coverage is ~2.5%. Zero security guards/middleware have tests. Zero controllers have tests. Auth module (8 services) is completely untested.

**Fix:** See remediation roadmap Phase 1 -- prioritize security layer tests, then core business logic.

---

### C5. Security Guards and Middleware Completely Untested

**Sources:** Code Review T3
**Location:** `jwt-auth.guard.ts`, `roles.guard.ts`, `tenant.guard.ts`, `tenant.middleware.ts` -- all zero tests

These are the gatekeepers for authentication, authorization, and tenant isolation. Without tests, there is no proof that multi-tenancy works correctly, and any regression would go undetected.

**Fix:** Write unit tests for all 4 guards/middleware. Test: valid token accepted, expired token rejected, missing tenant rejected, wrong-tenant-access rejected, role enforcement, RLS session variable set correctly.

---

### C6. Storage Providers Silently Enter Non-Functional State

**Sources:** Silent Failure #2 + Silent Failure #3
**Locations:**

- `apps/backend/src/common/services/local-storage.adapter.ts:192-201`
- `apps/backend/src/modules/storage/providers/azure-blob.provider.ts:57-81`

Both storage providers catch initialization failures and continue running in a broken state. `LocalStorageAdapter.ensureBaseDirectoryExists()` logs the error but does not throw, leaving the service "healthy" but unable to handle any file operation. `AzureBlobProvider.onModuleInit()` sets `isInitialized = false` when credentials are missing or invalid, producing a generic error message on all subsequent operations.

**Fix:** Fail fast on initialization -- throw from both methods so NestJS refuses to start with broken storage.

---

### C7. No Dockerfile for Containerized Deployment

**Sources:** Code Review R1
**Location:** Project root (missing)

The application cannot be containerized. No production deployment is possible without a Dockerfile. Docker Compose exists for local dev services but not for the application itself.

**Fix:** Create a multi-stage Dockerfile (build + runtime) with Node.js 20 Alpine, non-root user, health check instruction, and `SIGTERM` handler.

---

### C8. Secrets in Plaintext -- No Azure Key Vault Integration

**Sources:** Code Review R2
**Location:** `apps/backend/src/config/configuration.ts`

All secrets (JWT_SECRET, ANTHROPIC_API_KEY, Azure credentials) are read from environment variables with no vault integration. Terraform designed Key Vault infrastructure, but application code does not use it.

**Fix:** Implement `@azure/keyvault-secrets` integration for production environment, falling back to env vars for local dev.

---

## High Priority Issues (12)

Issues that affect reliability, data integrity, or would be flagged in a professional review.

### H1. WebSocket CORS Wildcard Fallback in 3 Gateways

**Sources:** Code Review S2
**Locations:**

- `modules/ai/ai.gateway.ts:75-81`
- `modules/projects/gateways/project.gateway.ts:108-114`
- `modules/notifications/gateways/notification.gateway.ts:74-80`

All three gateways use `origin: process.env.CORS_ORIGIN || "*"` with `credentials: true`. A wildcard origin with credentials is an exploitable CORS misconfiguration.

**Fix:** Replace `"*"` fallback with a throw requiring explicit configuration.

---

### H2. 7 Models with Nullable `organizationId` Bypass RLS

**Sources:** Code Review S3
**Location:** `apps/backend/prisma/schema.prisma` -- ReportTemplate (1134), AiContextFile (1906), PromptTemplate (1951), ProjectTemplate (3308), QuizAttempt (3752), Certificate (3810), KnowledgeBaseArticle (5428)

These models can exist without tenant assignment, potentially bypassing Row-Level Security policies.

**Fix:** Make `organizationId` required on all 7 models. If some are intentionally system-wide templates, document the reasoning and add application-level access control.

---

### H3. No Graceful Shutdown Hooks

**Sources:** Code Review R3
**Location:** `apps/backend/src/main.ts`

`enableShutdownHooks()` is not called. No SIGTERM/SIGINT handlers exist. In-flight requests are dropped on deployment, and database connections are not cleanly closed.

**Fix:** Call `app.enableShutdownHooks()` in `main.ts`. Add SIGTERM handler that drains connections.

---

### H4. Static Health Check -- No Dependency Probes

**Sources:** Code Review R4
**Location:** `apps/backend/src/health/health.controller.ts`

Returns `{ status: "ok" }` unconditionally without checking database, Redis, or Elasticsearch connectivity. Load balancers will route traffic to unhealthy instances.

**Fix:** Implement `@nestjs/terminus` with DB, Redis, and ES health indicators.

---

### H5. 10+ Services Exceed 500 LOC (Largest: 1838 Lines)

**Sources:** Code Review A2
**Location:** `report-field-registry.service.ts` (1838), `rius.service.ts` (1410), `conflict-detection.service.ts` (1402), `disclosure-submission.service.ts` (1328), and 6 more

These monolithic services violate single responsibility and are difficult to test, review, and maintain.

**Fix:** Decompose into focused sub-services. Target <300 LOC per service.

---

### H6. 4 Duplicated Association Services

**Sources:** Code Review A3
**Location:** `modules/associations/` -- person-case, person-person, person-riu, case-case association services

Near-identical CRUD logic, label checking helpers, event emission, and audit logging duplicated across all four.

**Fix:** Extract a `BaseAssociationService<T>` generic base class.

---

### H7. AuditService Swallows All Errors Without Alerting

**Sources:** Silent Failure #5
**Location:** `apps/backend/src/modules/audit/audit.service.ts:52-83`

Audit log write failures are caught and logged but never escalated. For a compliance platform, silent gaps in the audit trail are a regulatory violation.

**Fix:** Add failure counting with threshold-based alerting. After 5 consecutive failures, emit a monitoring alert.

---

### H8. Attachment Deletion Creates Orphaned Files

**Sources:** Silent Failure #8
**Location:** `apps/backend/src/modules/attachments/attachments.service.ts:379-393`

When storage deletion fails, the database record is still deleted. This creates orphaned files in cloud storage that are untracked, continue incurring costs, and may contain sensitive data that should be deleted per retention policies.

**Fix:** Only delete the DB record if storage deletion succeeded or the file was already missing (NotFoundException).

---

### H9. Offline Draft Decryption Failure Returns Empty Data

**Sources:** Silent Failure #9
**Location:** `apps/frontend/src/lib/ethics-offline-db.ts:204-222`

When draft decryption fails (key changed, data corrupted), the user's saved ethics report is silently replaced with `{}` and `[]`. No error shown, no indication of data loss.

**Fix:** Surface a `_decryptionFailed` flag and display a user-visible message.

---

### H10. Auth Logout Doesn't Verify Server-Side Session Invalidation

**Sources:** Silent Failure #6
**Location:** `apps/frontend/src/contexts/auth-context.tsx:64-96`

Both `logout` and `logoutAll` swallow all errors from the server-side logout API call. If the call fails, tokens remain valid server-side while the user believes they've logged out.

**Fix:** Log the failure. Consider showing a warning that the session may still be active.

---

### H11. Auth Storage Silently Returns Null on Corruption

**Sources:** Silent Failure #10
**Location:** `apps/frontend/src/lib/auth-storage.ts:37-41`

`getUser()` returns `null` on JSON parse failure without logging. The caller treats `null` as "not authenticated," causing unexplained random logouts.

**Fix:** Log the corruption, clean up the invalid localStorage entry.

---

### H12. AI Provider Registry Silently Returns Null on Failure

**Sources:** Silent Failure #11
**Location:** `apps/backend/src/modules/ai/services/provider-registry.service.ts:111-117`

`tryGetProvider()` catches all errors and returns `null` with no logging. All AI features silently degrade with no distinction between "not configured" and "provider crashed."

**Fix:** Log the error with the provider name and failure reason.

---

## Medium Priority Issues (13)

Issues that affect maintainability, developer experience, or user experience under failure conditions.

### M1. No CSRF Protection Middleware

**Sources:** Code Review S4
**Location:** `apps/backend/src/main.ts`

No CSRF protection is configured. While JWT-based auth mitigates some CSRF risk, cookie-based refresh tokens may still be vulnerable.

### M2. JWT Secret Has No Rotation Mechanism

**Sources:** Code Review S5
**Location:** `apps/backend/src/config/configuration.ts:17-30`

Static HS256 with no key rotation. Consider RS256 with key rotation for stronger security.

### M3. Global Exception Filters Not Registered

**Sources:** Code Review S6 (merged with C3 above for the filter registration; this entry covers stack trace leakage risk)
**Location:** `apps/backend/src/main.ts`

Without global filter registration, unhandled exceptions may expose stack traces in HTTP responses.

### M4. No Body Size Limits Configured

**Sources:** Code Review S7
**Location:** `apps/backend/src/main.ts`

Missing request body size limits allow payload abuse (large JSON/file uploads that exhaust memory).

### M5. Controllers Contain Business Logic (4 Controllers, Largest 1085 LOC)

**Sources:** Code Review Q1
**Location:** `report.controller.ts` (1085), `projects.controller.ts` (885), `cases.controller.ts` (614), `ai.controller.ts` (580)

Business logic should live in services, not controllers.

### M6. Only 1 Frontend Error Boundary (545 Components Unprotected)

**Sources:** Code Review Q2
**Location:** `apps/frontend/src/app/cases/[id]/error.tsx`

A single error boundary exists. Any unhandled React error in 545 other files crashes the entire application.

### M7. 19+ Frontend Files with Hardcoded `localhost` Fallback URLs

**Sources:** Code Review A6
**Location:** Various frontend components

Hardcoded `localhost` URLs will silently fail in production or connect to wrong endpoints.

### M8. 30+ Frontend Components Use console.error with No User Feedback

**Sources:** Silent Failure #17
**Location:** Multiple components (SegmentBuilder, ScheduleConfig, case panels, dashboard, etc.)

API errors logged only to browser console. Users see loading spinners that never resolve or empty panels.

### M9. Auto-Save Draft Init Failure Silently Disables Offline Features

**Sources:** Silent Failure #12
**Location:** `apps/frontend/src/hooks/useAutoSaveDraft.ts:100-123`

When IndexedDB initialization fails, `isReady` stays false and all save/load operations silently no-op. Users lose report drafts without any indication.

### M10. Device Encryption Key Regeneration Destroys Existing Drafts

**Sources:** Silent Failure #13
**Location:** `apps/frontend/src/lib/ethics-offline-db.ts:81-88`

When localStorage read fails for the encryption key, a new key is silently generated, making all existing encrypted drafts permanently unrecoverable.

### M11. Async Event Handlers Have No Error Boundary

**Sources:** Silent Failure #18
**Location:** `apps/backend/src/modules/audit/handlers/case-audit.handler.ts:34-63`

`@OnEvent("case.*", { async: true })` handlers run fire-and-forget. Errors in description building drop audit entries silently.

### M12. Event Emission Catches Sync Errors But Misses Async

**Sources:** Silent Failure #19
**Location:** `apps/backend/src/modules/storage/storage.service.ts:150-166`

`try-catch` around synchronous `emit()` misses async handler rejections. Document indexing silently fails.

### M13. Database Connection Has No Retry Logic

**Sources:** Silent Failure #20
**Location:** `apps/backend/src/modules/prisma/prisma.service.ts:9-11`

Bare `$connect()` with no retry or diagnostic logging. Fails immediately if DB isn't ready (common in container orchestration).

---

## Low Priority Issues (3)

### L1. DB Connection Pool Size Default = 10

**Sources:** Code Review P1
**Location:** `config/database.config.ts:5`

Too low for 10K+ user target. Increase to 50-100 with PgBouncer enabled.

### L2. No Response Compression (gzip/brotli)

**Sources:** Code Review P2
**Location:** `apps/backend/src/main.ts`

Missing compression middleware increases bandwidth usage.

### L3. Elasticsearch Timeout = 30s (Target <500ms)

**Sources:** Code Review P4
**Location:** `config/configuration.ts:51`

Timeout too generous. Reduce to 5s with circuit breaker pattern.

---

## Deduplicated Findings

The following overlapping findings were merged to avoid double-counting:

| Unified ID | Code Review Finding                               | Silent Failure Finding                         | Merged As                                                 |
| ---------- | ------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| C3         | A1 (133 bare throw) + S6 (filters not registered) | #1 (filter drops non-Error)                    | Combined: exception handling is broken at multiple levels |
| C6         | --                                                | #2 (local storage init) + #3 (Azure blob init) | Combined: both storage providers silently break           |
| H5         | A2 (oversized services)                           | --                                             | Kept from code review                                     |
| H7         | --                                                | #5 (audit service)                             | Kept from silent failure audit                            |
| M3         | S6 (filters not registered)                       | --                                             | Partially merged with C3; stack trace risk kept separate  |
| M11        | --                                                | #18 (event handlers)                           | Kept from silent failure audit                            |

Findings **not carried forward** (covered elsewhere): Silent Failure #14 (`error: any` type) -- minor type safety issue, covered by general code quality; Code Review A7/A8 -- low-severity patterns, not actionable in remediation.

---

## Prioritized Remediation Roadmap

### Phase 0: Emergency (Day 1) -- 2 hours

| #   | Action                                                         | Effort | Addresses |
| --- | -------------------------------------------------------------- | ------ | --------- |
| 0.1 | Rotate Anthropic API key                                       | 15 min | C2        |
| 0.2 | Fix `withBypassRLS()` to destroy connection on disable failure | 1 hr   | C1        |
| 0.3 | Register global exception filters in `main.ts`                 | 30 min | C3, M3    |

### Phase 1: Security Hardening (Week 1) -- ~3 days

| #   | Action                                                                                    | Effort   | Addresses |
| --- | ----------------------------------------------------------------------------------------- | -------- | --------- |
| 1.1 | Write unit tests for `tenant.guard`, `tenant.middleware`, `jwt-auth.guard`, `roles.guard` | 1-2 days | C5        |
| 1.2 | Fix WebSocket CORS wildcards in 3 gateways                                                | 30 min   | H1        |
| 1.3 | Make all 7 nullable `organizationId` fields required (or document exceptions)             | 2-4 hrs  | H2        |
| 1.4 | Add CSRF protection middleware                                                            | 2-4 hrs  | M1        |
| 1.5 | Configure body size limits                                                                | 30 min   | M4        |
| 1.6 | Add non-Error exception logging to HttpExceptionFilter                                    | 30 min   | C3        |

### Phase 2: Production Readiness (Week 2) -- ~3 days

| #   | Action                                                              | Effort   | Addresses |
| --- | ------------------------------------------------------------------- | -------- | --------- |
| 2.1 | Create multi-stage Dockerfile with health check and SIGTERM handler | 4 hrs    | C7, H3    |
| 2.2 | Implement deep health check (DB + Redis + ES probes)                | 2 hrs    | H4        |
| 2.3 | Fail-fast storage initialization (both providers)                   | 2 hrs    | C6        |
| 2.4 | Implement Azure Key Vault integration for secrets                   | 1-2 days | C8        |
| 2.5 | Add environment validation schema (Joi/Zod)                         | 4 hrs    | C8        |
| 2.6 | Add PrismaService connection retry with exponential backoff         | 2 hrs    | M13       |
| 2.7 | Enable graceful shutdown hooks                                      | 1 hr     | H3        |

### Phase 3: Error Handling & Reliability (Week 3) -- ~5 days

| #   | Action                                                                                             | Effort   | Addresses |
| --- | -------------------------------------------------------------------------------------------------- | -------- | --------- |
| 3.1 | Replace bare `throw new Error()` with NestJS exceptions (top 10 files first, 100 of 133 instances) | 2-3 days | C3        |
| 3.2 | Add failure counting + alerting to AuditService                                                    | 4 hrs    | H7        |
| 3.3 | Fix attachment deletion to abort on storage failure                                                | 2 hrs    | H8        |
| 3.4 | Fix offline draft decryption to surface errors to UI                                               | 4 hrs    | H9, M10   |
| 3.5 | Add error boundary components to frontend route segments                                           | 4 hrs    | M6        |
| 3.6 | Fix auth logout to log server-side failures                                                        | 1 hr     | H10       |
| 3.7 | Fix auth storage to log/clear corrupted data                                                       | 1 hr     | H11       |
| 3.8 | Add logging to AI provider registry `tryGetProvider()`                                             | 30 min   | H12       |
| 3.9 | Fix async event handler error boundaries                                                           | 2 hrs    | M11, M12  |

### Phase 4: Test Coverage Foundation (Weeks 4-6) -- ~10 days

| #   | Action                                                       | Effort   | Addresses |
| --- | ------------------------------------------------------------ | -------- | --------- |
| 4.1 | Unit tests for auth module (8 services)                      | 2-3 days | C4        |
| 4.2 | Unit tests for core services: cases, rius, investigations    | 3-4 days | C4        |
| 4.3 | Unit tests for campaigns, policies                           | 2-3 days | C4        |
| 4.4 | Frontend: add error boundaries, MSW mocking, component tests | 2-3 days | C4, M8    |

### Phase 5: Code Quality & Performance (Weeks 7-8) -- ~8 days

| #   | Action                                                        | Effort   | Addresses |
| --- | ------------------------------------------------------------- | -------- | --------- |
| 5.1 | Decompose top 5 monolithic services (<300 LOC target)         | 3-4 days | H5        |
| 5.2 | Extract BaseAssociationService generic                        | 1-2 days | H6        |
| 5.3 | Extract business logic from controllers to services           | 2-3 days | M5        |
| 5.4 | Replace hardcoded localhost URLs with config                  | 2 hrs    | M7        |
| 5.5 | Implement frontend toast notification system for errors       | 1 day    | M8, M9    |
| 5.6 | Increase DB pool to 50-100, enable PgBouncer, add compression | 4 hrs    | L1, L2    |
| 5.7 | Reduce ES timeout to 5s with circuit breaker                  | 2 hrs    | L3        |
| 5.8 | JWT rotation mechanism + RS256 migration                      | 1-2 days | M2        |

---

## Milestone Targets

| Milestone              | Phases        | Outcome                                        | Timeline |
| ---------------------- | ------------- | ---------------------------------------------- | -------- |
| **Pen-test ready**     | 0 + 1         | Security layer hardened and tested             | Week 1   |
| **Deploy ready**       | 0 + 1 + 2     | Containerized, health-checked, secrets-vaulted | Week 2   |
| **CTO-presentable**    | 0 + 1 + 2 + 3 | Clean error handling, no silent failures       | Week 3   |
| **SOC 2 prep**         | 0-4           | Auditable test coverage, complete audit trail  | Week 6   |
| **Production quality** | 0-5           | Maintainable, performant, fully tested         | Week 8   |

---

_Report generated 2026-02-13 from Code Review Report and Silent Failure Audit Report. All findings verified against commit `9ac072f` (main branch)._
