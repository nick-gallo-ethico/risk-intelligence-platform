# Requirements: Code Review Remediation (v1.1)

**Defined:** 2026-02-13
**Core Value:** Harden the platform for production deployment by resolving all 36 findings from the unified code review and silent failure audit.
**Source:** `03-DEVELOPMENT/UNIFIED-AUDIT-REPORT.md` (2026-02-13, commit `9ac072f`)

## v1.1 Requirements

Requirements for production readiness. Organized by severity and remediation phase from the unified audit report.

### Emergency Fixes

- [x] **EMER-01**: RLS bypass cleanup failure destroys tainted connection instead of returning to pool (C1)
- [x] **EMER-02**: Anthropic API key rotated and removed from local .env (C2)
- [x] **EMER-03**: Global exception filters registered in main.ts via useGlobalFilters() (C3 partial)

### Security Hardening

- [x] **SEC-01**: Unit tests for tenant.guard, tenant.middleware, jwt-auth.guard, roles.guard (C5)
- [x] **SEC-02**: WebSocket CORS wildcard fallback replaced with explicit config in 3 gateways (H1)
- [x] **SEC-03**: All 7 nullable organizationId fields made required or documented as system-wide (H2)
- [x] **SEC-04**: CSRF protection mitigated by architecture (JWT in Authorization header) and documented (M1)
- [x] **SEC-05**: Request body size limits configured in main.ts (M4)
- [x] **SEC-06**: Non-Error exception logging added to HttpExceptionFilter else branch (C3 partial)

### Production Readiness

- [x] **PROD-01**: Multi-stage Dockerfile created with Node.js 20 Alpine, non-root user, health check (C7)
- [x] **PROD-02**: Deep health check with DB, Redis, and Elasticsearch probes via @nestjs/terminus (H4)
- [x] **PROD-03**: Storage providers fail fast on initialization — throw on broken state (C6)
- [x] **PROD-04**: Azure Key Vault integration for production secrets with env var fallback for dev (C8)
- [x] **PROD-05**: Environment validation schema (Joi or Zod) for required config (C8 partial)
- [x] **PROD-06**: PrismaService connection retry with exponential backoff (M13)
- [x] **PROD-07**: Graceful shutdown hooks enabled — app.enableShutdownHooks() with SIGTERM handler (H3)

### Error Handling & Reliability

- [x] **ERR-01**: Replace bare throw new Error() with NestJS exceptions in top 10 files (100 of 133 instances) (C3)
- [x] **ERR-02**: AuditService failure counting with threshold-based alerting (5 consecutive = alert) (H7)
- [x] **ERR-03**: Attachment deletion aborts on storage failure — no orphaned files (H8)
- [x] **ERR-04**: Offline draft decryption surfaces \_decryptionFailed flag to UI (H9, M10)
- [x] **ERR-05**: Frontend error boundary components added to route segments (M6)
- [x] **ERR-06**: Auth logout logs server-side session invalidation failures (H10)
- [x] **ERR-07**: Auth storage logs and clears corrupted localStorage entries (H11)
- [x] **ERR-08**: AI provider registry tryGetProvider() logs errors with provider name (H12)
- [x] **ERR-09**: Async event handler error boundaries added (M11, M12)

### Test Coverage Foundation

- [x] **TEST-01**: Unit tests for auth module — 8 services covering login, registration, token refresh, SSO, MFA (C4)
- [x] **TEST-02**: Unit tests for core services — cases, rius, investigations (C4)
- [x] **TEST-03**: Unit tests for campaigns and policies services (C4)
- [x] **TEST-04**: Frontend error boundaries, MSW mocking setup, component tests for critical paths (C4, M8)

### Code Quality & Performance

- [x] **QUAL-01**: Decompose top 5 monolithic services to <300 LOC each (H5)
- [x] **QUAL-02**: Extract BaseAssociationService generic base class for 4 association services (H6)
- [x] **QUAL-03**: Extract business logic from 4 oversized controllers into services (M5)
- [x] **QUAL-04**: Replace hardcoded localhost URLs with environment config in 19+ frontend files (M7)
- [x] **QUAL-05**: Frontend toast notification system for API errors replacing console.error in 30+ components (M8, M9)
- [x] **QUAL-06**: DB connection pool increased to 50-100, PgBouncer enabled, response compression added (L1, L2)
- [x] **QUAL-07**: Elasticsearch timeout reduced to 5s with circuit breaker pattern (L3)
- [x] **QUAL-08**: JWT rotation mechanism with RS256 migration (M2)

## Out of Scope

Explicitly excluded from v1.1 remediation.

| Feature                                  | Reason                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| New feature development                  | Remediation milestone — hardening only, no new capabilities               |
| Full 80% test coverage                   | Foundation phase targets auth + core services; remaining coverage in v1.2 |
| Complete refactor of all 133 bare throws | Top 10 files (100 instances) first; remaining 33 in v1.2                  |
| Y.js real-time collaboration security    | Deferred to v2 (feature itself is out of scope)                           |
| Public API security review               | No public API in v1                                                       |

## Traceability

Which phases cover which requirements. Maps to ROADMAP.md phases.

| Requirement | Phase    | Status   |
| ----------- | -------- | -------- |
| EMER-01     | Phase 26 | Complete |
| EMER-02     | Phase 26 | Complete |
| EMER-03     | Phase 26 | Complete |
| SEC-01      | Phase 27 | Complete |
| SEC-02      | Phase 27 | Complete |
| SEC-03      | Phase 27 | Complete |
| SEC-04      | Phase 27 | Complete |
| SEC-05      | Phase 27 | Complete |
| SEC-06      | Phase 27 | Complete |
| PROD-01     | Phase 28 | Complete |
| PROD-02     | Phase 28 | Complete |
| PROD-03     | Phase 28 | Complete |
| PROD-04     | Phase 28 | Complete |
| PROD-05     | Phase 28 | Complete |
| PROD-06     | Phase 28 | Complete |
| PROD-07     | Phase 28 | Complete |
| ERR-01      | Phase 29 | Complete |
| ERR-02      | Phase 29 | Complete |
| ERR-03      | Phase 29 | Complete |
| ERR-04      | Phase 29 | Complete |
| ERR-05      | Phase 29 | Complete |
| ERR-06      | Phase 29 | Complete |
| ERR-07      | Phase 29 | Complete |
| ERR-08      | Phase 29 | Complete |
| ERR-09      | Phase 29 | Complete |
| TEST-01     | Phase 30 | Complete |
| TEST-02     | Phase 30 | Complete |
| TEST-03     | Phase 30 | Complete |
| TEST-04     | Phase 30 | Complete |
| QUAL-01     | Phase 31 | Complete |
| QUAL-02     | Phase 31 | Complete |
| QUAL-03     | Phase 31 | Complete |
| QUAL-04     | Phase 31 | Complete |
| QUAL-05     | Phase 31 | Complete |
| QUAL-06     | Phase 31 | Complete |
| QUAL-07     | Phase 31 | Complete |
| QUAL-08     | Phase 31 | Complete |

**Coverage:**

- v1.1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0

---

_Requirements defined: 2026-02-13_
_Source: 03-DEVELOPMENT/UNIFIED-AUDIT-REPORT.md_
