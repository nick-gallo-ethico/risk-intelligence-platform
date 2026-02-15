# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-13)

**Core value:** Users can manage their entire compliance workflow - from anonymous report intake to investigation closure to board reporting - in one AI-assisted platform, with every task unified into a single "My Work" view.
**Current focus:** Milestone v1.1 Code Review Remediation — 6 phases (26-31), 36 requirements

## Current Position

Phase: 31 of 31 (Code Quality & Performance) — Gap Closure
Plan: 11 of 11 (gap closure plans 31-09 through 31-11)
Status: Gap closure complete
Last activity: 2026-02-15 — Completed 31-09-PLAN.md (CasesService decomposition)

Progress: [██████████] 100% (All v1.1 remediation plans complete)

## Milestone v1.1: Code Review Remediation

**Source:** `03-DEVELOPMENT/UNIFIED-AUDIT-REPORT.md`
**Findings:** 36 (8 Critical, 12 High, 13 Medium, 3 Low)
**Overall Grade:** C- → Target: B+ after remediation

| Phase | Name                         | Requirements              | Status   |
| ----- | ---------------------------- | ------------------------- | -------- |
| 26    | Emergency Fixes              | EMER-01, EMER-02, EMER-03 | Complete |
| 27    | Security Hardening           | SEC-01 to SEC-06          | Complete |
| 28    | Production Readiness         | PROD-01 to PROD-07        | Complete |
| 29    | Error Handling & Reliability | ERR-01 to ERR-09          | Complete |
| 30    | Test Coverage Foundation     | TEST-01 to TEST-04        | Complete |
| 31    | Code Quality & Performance   | QUAL-01 to QUAL-08        | Complete |

## Milestone Targets

| Milestone          | Phases       | Outcome                                        |
| ------------------ | ------------ | ---------------------------------------------- |
| Pen-test ready     | 26 + 27      | Security layer hardened and tested             |
| Deploy ready       | 26 + 27 + 28 | Containerized, health-checked, secrets-vaulted |
| CTO-presentable    | 26-29        | Clean error handling, no silent failures       |
| SOC 2 prep         | 26-30        | Auditable test coverage, complete audit trail  |
| Production quality | 26-31        | Maintainable, performant, fully tested         |

## Phase 29 Plans

| Plan  | Wave | Objective                                      | Autonomous | Status   |
| ----- | ---- | ---------------------------------------------- | ---------- | -------- |
| 29-01 | 1    | ERR-03/04/08: Critical services error handling | Yes        | Complete |
| 29-02 | 1    | ERR-09: Event handler error boundaries         | Yes        | Complete |
| 29-03 | 1    | ERR-06/07: Frontend error boundaries           | Yes        | Complete |
| 29-04 | 2    | ERR-04/06/07: Frontend error surfacing         | Yes        | Complete |
| 29-05 | 2    | ERR-01: NestJS HTTP exceptions in services     | Yes        | Complete |

## Phase 28 Plans

| Plan  | Wave | Objective                                          | Autonomous | Status   |
| ----- | ---- | -------------------------------------------------- | ---------- | -------- |
| 28-01 | 1    | PROD-01: Env validation, Prisma retry, shutdown    | Yes        | Complete |
| 28-02 | 1    | PROD-02: Storage provider fail-fast initialization | Yes        | Complete |
| 28-03 | 1    | PROD-03: Azure Key Vault integration               | Yes        | Complete |
| 28-04 | 2    | PROD-04: Health checks and readiness probes        | Yes        | Complete |
| 28-05 | 2    | PROD-05: Docker containerization                   | Yes        | Complete |

## Phase 27 Plans

| Plan  | Wave | Objective                                           | Autonomous | Status   |
| ----- | ---- | --------------------------------------------------- | ---------- | -------- |
| 27-01 | 1    | SEC-01: Security guard and middleware tests         | Yes        | Complete |
| 27-02 | 1    | SEC-02: CORS wildcard removal in WebSocket gateways | Yes        | Complete |
| 27-03 | 2    | SEC-04 CSRF + SEC-05 body size limits               | Yes        | Complete |
| 27-04 | 2    | SEC-03: System-wide entity documentation            | Yes        | Complete |

## Phase 26 Plans

| Plan  | Wave | Objective                                                          | Autonomous | Status   |
| ----- | ---- | ------------------------------------------------------------------ | ---------- | -------- |
| 26-01 | 1    | RLS bypass safety, global exception filters, non-Error logging     | Yes        | Complete |
| 26-02 | 1    | Anthropic API key rotation (human action required) and .env update | No         | Complete |

## Previous Milestone (v1.0 Feature Build)

Completed 2026-02-13. 25+ phases, 242+ plans executed, 149 requirements delivered.

Key outcomes:

- Full platform feature build (Phases 1-25.1)
- 42 NestJS modules, 127 Prisma models, 447 database indexes
- All portals built (Client, Employee, Ethics, Operator, Implementation)
- HubSpot-style saved views, case detail page, project management
- AI infrastructure, campaigns, disclosures, policies, analytics

## Accumulated Context

### Key Decisions (v1.1)

- All 5 remediation phases in scope (full hardening, not incremental)
- Phase numbering continues from v1.0 (26-31)
- Source of truth: UNIFIED-AUDIT-REPORT.md (not re-research)

### Key Decisions (26-01)

- Pool destruction via $disconnect() on RLS bypass cleanup failure (Prisma lacks single-connection termination)
- Re-throw error after pool destruction so callers know operation failed critically
- Non-Error exceptions logged with type and value before generic 500 response

### Key Decisions (27-01)

- Test RLS $executeRaw calls by verifying organizationId is passed to Prisma
- Mock Reflector.getAllAndOverride for testing @Public and @Roles decorators
- Use jsonwebtoken library directly in tests to create valid/expired test tokens

### Key Decisions (27-02)

- Use safeStringify helper in HttpExceptionFilter to handle circular references
- Throw Error on missing CORS_ORIGIN (fail-fast) rather than wildcard fallback
- All 3 WebSocket gateways use identical validation pattern and error message

### Key Decisions (27-03)

- CSRF mitigated by JWT architecture (Authorization header not cookies)
- 10MB body limit for JSON/form data; Multer handles file uploads separately
- body-parser types via @types/express; no additional package needed

### Key Decisions (27-04)

- Three access control patterns for nullable organizationId: isSystem flag, userId scope, NULL = public
- AiContextFile uses hierarchical pattern (platform/org/user)
- Comprehensive documentation (428 lines) explaining RLS interaction

### Key Decisions (28-01)

- Use Zod for env validation over class-validator (simpler, type-safe inference)
- 3 retries with 1s/2s/4s delays balances startup speed vs resilience
- enableShutdownHooks() ensures OnApplicationShutdown hooks fire on SIGTERM

### Key Decisions (28-02)

- Check storage.provider config first; skip initialization if not active provider
- AzureBlobProvider verifies connectivity via getProperties() call
- LocalStorageProvider verifies write permissions via test file write/delete
- Error messages include actionable guidance (env var names, alternatives)

### Key Decisions (28-03)

- Key Vault only active in production mode (NODE_ENV=production)
- Pre-load critical secrets (database-url, jwt-secret, etc.) on startup
- Fail fast in production if Key Vault configured but unavailable
- Kebab-case secret naming (database-url) maps to env vars (DATABASE_URL)

### Key Decisions (28-04)

- Use @nestjs/terminus for standardized health check infrastructure
- Optional dependencies (Redis, ES) return 'not_configured' status for graceful degradation
- Separate liveness (heartbeat) from readiness (database) probes per Kubernetes best practices
- ElasticsearchHealthIndicator treats 'yellow' as healthy (normal for single-node)
- PrismaHealthIndicator uses SELECT 1 for minimal database check

### Key Decisions (28-05)

- Node.js fetch() for HEALTHCHECK (built-in, no curl dependency needed)
- Three-stage Dockerfile: deps, build, production for minimal image size
- dumb-init as ENTRYPOINT for proper SIGTERM forwarding to Node.js

### Key Decisions (29-01)

- 5 consecutive failures threshold for audit alerting (balances sensitivity vs noise)
- Abort DB deletion on storage failure to prevent orphaned attachment records
- Capture provider name before try block for error context in AI provider logging
- EventEmitter2 pattern for monitoring.alert events (decoupled from monitoring infra)

### Key Decisions (29-02)

- Error type guard pattern: error instanceof Error for safe message/stack access
- Keep debug log inside try block so it appears before potential error
- Error messages include full event name and entity ID for debugging
- Fire-and-forget preserved: errors logged but not rethrown

### Key Decisions (29-04)

- \_decryptionFailed flag vs exception: Return object with flag for UI partial rendering
- console.warn for logout failures: Local logout succeeds, only server-side invalidation fails
- Clear corrupted localStorage entries on detection to prevent repeated parse errors

### Key Decisions (29-05)

- Exception mapping: NotFoundException (404), BadRequestException (400), ForbiddenException (403), ServiceUnavailableException (503), InternalServerErrorException (500)
- Event class constructors retain bare throws: Internal validation, not HTTP requests - covered by handler try-catch
- Implementation done during 29-04: Code changes attributed to 29-04 docs commit, summary documents completed work

### Key Decisions (30-02)

- Mock DNS module with jest.mock('dns') for DomainVerificationService tests
- Use UnauthorizedException with full message in assertions (not string substring)
- SSO tests verify security guardrails: block SYSTEM_ADMIN and COMPLIANCE_OFFICER from JIT provisioning

### Key Decisions (30-03)

- Use CaseType.REPORT and CaseType.RFI (not COMPLAINT/FRAUD) per actual Prisma enum values
- Test immutability via BadRequestException with guidance message about linked Case
- Verify event emission via eventEmitter.emit mock with objectContaining matchers
- Organize update tests into separate describe blocks for MUTABLE vs IMMUTABLE fields

### Key Decisions (30-01)

- Mock bcrypt at module level with jest.mock for password comparison
- Use mockTotpInstance pattern for otplib TOTP class mocking (v13 class-based API)
- Verify RLS bypass calls rather than actual RLS behavior (unit test scope)
- withBypassRLS mock pattern: jest.fn((callback) => callback())

### Key Decisions (30-04)

- AuditService used for CampaignsService (not ActivityService) - matches actual service implementation
- Transaction mocking via callback execution for version-on-publish tests
- Tenant isolation verified via organizationId filtering in all CRUD operations

### Key Decisions (30-05)

- Use wildcard URL patterns (\*/api/v1/...) in MSW handlers to match axios full URLs
- Add localStorage mock to test setup for auth-storage compatibility
- ErrorBoundary uses class component pattern as required by React error boundary API
- ApiErrorBoundary uses render props pattern for react-query integration

### Key Decisions (31-01)

- 1KB compression threshold: Compressing small payloads has overhead exceeding benefit
- Compression level 6: Default zlib level balances CPU usage vs ratio
- 50-connection pool default: Supports 10K+ users while within PostgreSQL defaults

### Key Decisions (31-02)

- Named alias for config import: Used `envConfig` in useEthicsPortalConfig.ts to avoid collision with local `config` state variable
- Development environment display conditional on `config.isDevelopment`
- Default port standardized to localhost:3001 (matching backend .env)

### Key Decisions (31-03)

- Type aliases `EsSearchParams` and `EsSearchResponse` for cleaner opossum generic inference
- Fail-fast for suggest: Check `opened` state before attempting call to reduce noise
- Timeout alignment: ES timeout and circuit breaker timeout both 5s
- Circuit opens after 50% error rate with 5+ requests (volumeThreshold)

### Key Decisions (31-04)

- Template Method pattern for shared CRUD with customization points via abstract methods
- Generic BaseAssociationService<TCreateDto, TEntity, TLabel> for type safety across services
- Dynamic Prisma model access via config.prismaModelName to avoid repetitive model references
- All existing public method signatures preserved - API unchanged

### Key Decisions (31-05)

- User-initiated actions get toasts (save, submit, delete) - background operations keep console.error only
- handleApiError both logs to console AND shows toast for debugging + UX
- Error message extraction handles Axios responses, Error objects, and unknown types
- Toaster mounted in root layout.tsx for app-wide availability

### Key Decisions (31-06)

- projects.controller.ts already thin (885 LOC but methods delegate to services) - no extraction needed
- Separate ActionContextStrict interface for action endpoints requiring entityType/entityId
- buildAgentContext vs buildActionContext methods for optional vs required entity fields
- <200 LOC target difficult with Swagger decorators, but business logic IS extracted to services

### Key Decisions (31-07)

- Thin coordinator pattern: Main services become delegation layers, preserving public API
- Domain-based extraction: Sub-services split by responsibility (query, draft, matching, exclusion)
- Skipped cases.service.ts decomposition: Actual LOC (795) below 1000+ threshold
- Some services remain >300 LOC but significantly reduced (e.g., conflict-detection 1431->806)

### Key Decisions (31-08)

- RS256 auto-generated in development, env-configured in production
- 7-day key overlap period matches refresh token lifetime
- Dual RS256/HS256 support during migration (existing tokens valid)
- secretOrKeyProvider pattern for dynamic key resolution by kid

### Key Decisions (31-10)

- Toast component filename is toaster.tsx (shadcn convention), not sonner.tsx (library name)
- Phase 31 now has 5/8 success criteria verified (up from 4/8)
- Gap 3 (toast component) is fully resolved, not partial

### Key Decisions (31-09)

- CasesService retains create/update operations (core business logic)
- Query delegation: findAll, findOne, findByReferenceNumber to CaseQueryService
- Status delegation: updateStatus, close to CaseStatusService
- Preserved all public API signatures - no breaking changes
- LOC reduction: CasesService 795 -> 363 (54% reduction)

### Blockers

None currently.

## Phase 31 Plans

| Plan  | Wave | Objective                                        | Autonomous | Status   |
| ----- | ---- | ------------------------------------------------ | ---------- | -------- |
| 31-01 | 1    | QUAL-01: Response compression and DB pool size   | Yes        | Complete |
| 31-02 | 1    | QUAL-02: Frontend environment URL centralization | Yes        | Complete |
| 31-03 | 1    | QUAL-03: Elasticsearch circuit breaker           | Yes        | Complete |
| 31-04 | 2    | QUAL-04: BaseAssociationService extraction       | Yes        | Complete |
| 31-05 | 2    | QUAL-05: Frontend toast notifications            | Yes        | Complete |
| 31-06 | 3    | QUAL-06: Controller logic extraction             | Yes        | Complete |
| 31-07 | 4    | QUAL-07: Service decomposition (1000+ LOC)       | Yes        | Complete |
| 31-08 | 5    | QUAL-08: JWT RS256 with key rotation             | Yes        | Complete |
| 31-09 | -    | Gap closure: cases.service.ts decomposition      | Yes        | Complete |
| 31-10 | -    | Gap closure: VERIFICATION.md false positive fix  | Yes        | Complete |
| 31-11 | -    | Gap closure: (reserved)                          | Yes        | N/A      |

## Phase 30 Plans

| Plan  | Wave | Objective                                                                                     | Autonomous | Status   |
| ----- | ---- | --------------------------------------------------------------------------------------------- | ---------- | -------- |
| 30-01 | 1    | Auth services unit tests (AuthService, MfaService, TokenRefreshService, RecoveryCodesService) | Yes        | Complete |
| 30-02 | 1    | Domain services unit tests (DomainService, DomainVerificationService)                         | Yes        | Complete |
| 30-03 | 1    | Cases service tests (RIUs, Cases)                                                             | Yes        | Complete |
| 30-04 | 1    | Campaigns/Policies service tests                                                              | Yes        | Complete |
| 30-05 | 2    | Frontend tests (React Testing Library + MSW)                                                  | Yes        | Complete |

## Session Continuity

Last session: 2026-02-15 — Completed 31-09-PLAN.md (CasesService decomposition)
Stopped at: All gap closure plans complete
Resume file: None
Next action: Milestone v1.1 Code Review Remediation complete. Ready for production deployment.
