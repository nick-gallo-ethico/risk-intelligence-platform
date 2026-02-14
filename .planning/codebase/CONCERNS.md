# Codebase Concerns

**Analysis Date:** 2026-02-13

## Tech Debt

**Large Service Files:**

- Issue: Several service files exceed 1,000 lines, indicating high complexity and potential SRP violations
- Files:
  - `apps/backend/src/modules/analytics/reports/report-field-registry.service.ts` (1,838 lines)
  - `apps/backend/src/modules/rius/rius.service.ts` (1,410 lines)
  - `apps/backend/src/modules/disclosures/conflict-detection.service.ts` (1,402 lines)
  - `apps/backend/src/modules/disclosures/disclosure-submission.service.ts` (1,328 lines)
  - `apps/backend/src/modules/analytics/dashboard/widget-data.service.ts` (1,240 lines)
  - `apps/backend/src/modules/analytics/exports/board-report.service.ts` (1,189 lines)
  - `apps/backend/src/modules/analytics/migration/migration.service.ts` (1,159 lines)
  - `apps/backend/src/modules/analytics/my-work/task-aggregator.service.ts` (1,099 lines)
- Impact: Reduced maintainability, harder to test, increased cognitive load for developers, higher bug risk
- Fix approach: Extract domain logic into smaller, focused services; apply strategy pattern for complex conditionals; introduce service composition

**Massive Prisma Schema:**

- Issue: Single schema.prisma file contains 5,470 lines with entire data model
- Files: `apps/backend/prisma/schema.prisma`
- Impact: Difficult to navigate, slow IDE performance, merge conflicts likely in team development
- Fix approach: Cannot split Prisma schema across files (Prisma limitation), but can add better organization comments; consider multi-schema approach for future modularization

**Stub Implementations:**

- Issue: 50+ files contain placeholder implementations (`return null`, `return []`, `throw new Error('Not implemented')`)
- Files: Pattern detected across:
  - `apps/backend/src/modules/portals/employee/employee-tasks.service.ts`
  - `apps/backend/src/modules/policies/approval/policy-approval.service.ts`
  - `apps/backend/src/modules/portals/employee/employee-history.service.ts`
  - `apps/backend/src/modules/operations/implementation/go-live.service.ts`
  - `apps/backend/src/modules/notifications/services/notification.service.ts`
  - `apps/backend/src/modules/workflow/sla/sla-tracker.service.ts`
  - `apps/backend/src/modules/workflow/assignment/assignment-rules.service.ts`
  - `apps/backend/src/modules/search/search.service.ts`
  - And 40+ more files
- Impact: Incomplete functionality, potential runtime errors if stub methods are called, unclear what's production-ready
- Fix approach: Mark stubs with clear comments indicating implementation status; create tracking issues for each stub; add runtime warnings in dev mode

**Insufficient Test Coverage:**

- Issue: Only 7 unit test files (`.spec.ts`) found across entire backend codebase with 158 service classes
- Files: Test coverage < 5% of service classes
  - `apps/backend/src/common/services/storage.service.spec.ts` (426 lines)
  - `apps/backend/src/modules/investigation-notes/investigation-notes.service.spec.ts` (674 lines)
  - `apps/backend/src/modules/investigations/investigations.service.spec.ts` (753 lines)
  - `apps/backend/src/modules/metrics/metrics.service.spec.ts` (259 lines)
  - Plus 3 more small test files (total 4,784 lines tests vs ~37,000+ lines source)
- Impact: Cannot refactor safely, regressions undetected, unclear if features work as intended
- Fix approach: Implement test pyramid strategy; prioritize core business logic (RIU immutability, tenant isolation, conflict detection); aim for 80% coverage on services; add integration tests for critical flows

**E2E Test Coverage:**

- Issue: Only 15 E2E test files, but good tenant isolation coverage
- Files: `apps/backend/test/` contains basic smoke tests and dedicated tenant isolation tests
  - Good: `test/tenant-isolation.e2e-spec.ts`, `test/activity/activity-tenant-isolation.e2e-spec.ts`, `test/investigations/investigations-tenant-isolation.e2e-spec.ts`
  - Good: Smoke tests for critical flows (auth, investigation, case, activity)
  - Gap: Missing E2E tests for disclosures, campaigns, policies, remediation modules
- Impact: No automated validation of complex user flows across modules
- Fix approach: Add E2E tests for disclosure conflict detection, campaign targeting, policy approval workflows, AI-assisted triage

**Direct process.env Access:**

- Issue: 9 files access process.env directly instead of using ConfigService
- Files:
  - `apps/backend/src/modules/notifications/services/notification.service.ts`
  - `apps/backend/src/modules/notifications/services/digest.service.ts`
  - `apps/backend/src/modules/notifications/services/email-template.service.ts`
  - `apps/backend/src/modules/notifications/gateways/notification.gateway.ts`
  - `apps/backend/src/modules/health/health.controller.ts`
  - `apps/backend/src/modules/projects/gateways/project.gateway.ts`
  - `apps/backend/src/config/configuration.ts` (acceptable - config source)
  - `apps/backend/src/modules/ai/ai.gateway.ts`
  - `apps/backend/src/config/database.config.ts` (acceptable - config source)
- Impact: Harder to test, inconsistent config access pattern, potential runtime errors if env vars missing
- Fix approach: Refactor to inject ConfigService; validate required config at startup; centralize all config access

**ESLint Warning-Only Rules:**

- Issue: TypeScript strict rules are set to 'warn' instead of 'error'
- Files: `apps/backend/.eslintrc.js`
  - `'@typescript-eslint/no-explicit-any': 'warn'` (should be 'error')
  - `'@typescript-eslint/no-unused-vars': ['warn', ...]` (should be 'error')
- Impact: Code quality issues accumulate, `any` types bypass type safety
- Fix approach: Gradually fix existing violations, then escalate to errors; add automated check to pre-commit hook

**Missing RLS Policy Enforcement:**

- Issue: Tenant middleware sets RLS context, but no verification that RLS policies exist in database
- Files: `apps/backend/src/common/middleware/tenant.middleware.ts`, `apps/backend/src/modules/prisma/prisma.service.ts`
- Impact: Relies on middleware for tenant scoping, but no database-level enforcement confirmed
- Fix approach: Create SQL migration to add RLS policies on all tenant-scoped tables; document RLS policy verification in deployment checklist

## Known Bugs

**Invalid JWT Defaults to Null UUID:**

- Symptoms: When JWT is invalid, tenant context is set to `00000000-0000-0000-0000-000000000000`
- Files: `apps/backend/src/common/middleware/tenant.middleware.ts:93`
- Trigger: Any request with expired or malformed JWT token
- Workaround: Relies on downstream guards to reject unauthenticated requests
- Risk: If a guard is missed, queries will execute with null tenant ID (likely returning no data, but still a leak risk)
- Fix approach: Throw exception immediately on invalid JWT instead of setting null tenant; ensure all routes have guards

**Test Files Ignored by ESLint:**

- Symptoms: Test files are excluded from linting
- Files: `apps/backend/.eslintrc.js:18` - `ignorePatterns: [..., 'test/**/*']`
- Trigger: All test files bypass quality checks
- Impact: Test code quality degrades, test bugs go unnoticed
- Fix approach: Remove test directory from ignore patterns; apply same linting rules to test files

## Security Considerations

**Dependency Vulnerabilities (HIGH Priority):**

- Risk: Multiple high-severity npm vulnerabilities detected
- Files: `package-lock.json` (1.1 MB)
- Current mitigation: Pre-commit hook runs `npm audit --audit-level=critical` but doesn't block commits
- Specific vulnerabilities:
  - **axios <=1.13.4** - High severity: Denial of Service via `__proto__` key in mergeConfig
  - **glob 10.2.0 - 10.4.5** - High severity: Command injection via CLI
  - **@nestjs-modules/mailer >=1.7.0** - High severity: Via vulnerable glob and mjml dependencies
  - **@nestjs/cli 2.0.0-rc.1 - 11.0.14** - High severity: Multiple vulnerable dependencies
  - **esbuild <=0.24.2** - Moderate: Dev server CORS bypass
- Recommendations:
  - Run `npm audit fix` immediately to patch axios
  - Upgrade @nestjs/cli to 11.0.16+
  - Upgrade @nestjs-modules/mailer to 1.8.1+
  - Review all vitest/esbuild vulnerabilities (dev dependencies, lower priority)
  - Change pre-commit hook to block commits on high-severity vulnerabilities

**Missing Rate Limiting on Critical Endpoints:**

- Risk: AI endpoints and auth endpoints vulnerable to abuse
- Files: Rate limiting partially implemented but not universal
  - Good: `@Throttle` decorator used on some AI skills and auth endpoints
  - Gap: Not all endpoints have rate limiting
  - Gap: No rate limiting on case creation, RIU creation, or disclosure submission
- Current mitigation: ThrottlerGuard configured in `apps/backend/src/app.module.ts` (global), but some endpoints may bypass
- Recommendations:
  - Audit all controllers for missing `@Throttle` decorators
  - Set aggressive rate limits on anonymous endpoints (RIU creation, disclosure forms)
  - Implement tenant-level rate limiting (not just IP-based)
  - Add rate limit metrics to monitoring

**Hardcoded JWT Default Secret:**

- Risk: Development JWT secret is weak
- Files: `apps/backend/src/config/configuration.ts:26` - `"dev-only-secret-key-do-not-use-in-production"`
- Current mitigation: Throws error in production if JWT_SECRET not set (line 21-24)
- Trigger: Running in development without .env file
- Recommendations:
  - Good: Production check exists
  - Improvement: Generate random secret on startup in dev mode instead of hardcoded value
  - Add warning log when using dev secret

**CORS Configuration Too Permissive:**

- Risk: CORS allows credentials with wildcard potential
- Files: `apps/backend/src/main.ts:54-59`
- Current mitigation: `origin` is configured from env var, not wildcard
- Recommendations:
  - Good: Credentials enabled only with specific origin
  - Improvement: Validate CORS_ORIGIN format at startup
  - Add separate CORS config for production (stricter headers)

**SQL Injection Risk in Raw Queries:**

- Risk: While Prisma protects most queries, some raw SQL exists
- Files: Pattern found in tenant middleware and RLS setup
  - `apps/backend/src/common/middleware/tenant.middleware.ts:79` - Uses parameterized query (SAFE)
  - `apps/backend/src/modules/prisma/prisma.service.ts:24` - Uses parameterized query (SAFE)
- Current mitigation: All raw queries use `$executeRaw` with template literals (parameterized)
- Recommendations:
  - Good: No unsafe raw SQL detected
  - Maintain code review requirement for any new `$executeRawUnsafe` usage

**Swagger Exposed in Non-Production:**

- Risk: API documentation reveals internal structure
- Files: `apps/backend/src/main.ts:67-96`
- Current mitigation: Swagger disabled in production (line 67: `if (nodeEnv !== "production")`)
- Recommendations:
  - Good: Production check exists
  - Improvement: Consider disabling in staging environments as well
  - Add authentication requirement for Swagger in non-prod environments

## Performance Bottlenecks

**Large Prisma Schema File:**

- Problem: 5,470-line schema.prisma causes slow Prisma Client generation
- Files: `apps/backend/prisma/schema.prisma`
- Cause: 100+ models with extensive relations in single file
- Impact: `prisma generate` takes significant time; IDE autocomplete slow; migrations take longer
- Improvement path: No immediate fix (Prisma limitation); monitor Prisma roadmap for multi-schema support; consider caching generated client in CI/CD

**No Database Connection Pooling Configured:**

- Problem: PrismaService connects without explicit pool configuration
- Files: `apps/backend/src/modules/prisma/prisma.service.ts`
- Cause: Relies on Prisma's default connection pool settings
- Impact: May not scale efficiently under high load
- Improvement path: Add explicit connection pool configuration in DATABASE_URL or Prisma constructor; tune based on deployment environment (Azure PostgreSQL typically needs 10-20 connections per instance)

**Elasticsearch Index Per Tenant:**

- Problem: Each tenant gets separate Elasticsearch index
- Files: Pattern mentioned in `apps/backend/src/modules/search/search.service.ts` (stub implementation)
- Cause: Security requirement for tenant isolation
- Impact: With 1,500 customers, this creates 1,500+ indices, impacting cluster performance
- Improvement path: Consider multi-tenant index with tenant filter; benchmark performance vs. security trade-off; implement index lifecycle policies to prune old data

**AI Service Rate Limiter Not Tenant-Aware:**

- Problem: Rate limiting appears IP-based, not tenant-based
- Files: `apps/backend/src/modules/ai/services/rate-limiter.service.ts`
- Cause: Standard ThrottlerGuard uses IP address
- Impact: One tenant can consume all AI quota; whale customers blocked by IP limits
- Improvement path: Implement custom throttler that keys by organizationId; set per-tenant quotas in organization settings

**Missing Query Result Caching:**

- Problem: No Redis caching layer detected for frequently-accessed data
- Files: Cache manager imported in `apps/backend/package.json` but limited usage found
- Cause: Early development phase, caching not yet implemented
- Impact: Repeated database queries for categories, employees, organization settings
- Improvement path: Implement cache-aside pattern for read-heavy entities; use Redis for session storage; add cache invalidation on mutations

## Fragile Areas

**RIU Immutability Enforcement:**

- Files: `apps/backend/src/modules/rius/rius.service.ts:42-47`
- Why fragile: Business rule (RIU content is immutable) enforced in service layer only, no database constraint
- Safe modification: Any changes to RIU update logic must validate against `IMMUTABLE_RIU_FIELDS` constant; add database check constraints for immutable fields
- Test coverage: No dedicated test for immutability enforcement detected
- Risk: Developer unfamiliar with business rule could add update logic that modifies immutable fields
- Improvement: Add database-level constraints; add integration test that attempts to modify immutable fields and expects failure

**Tenant Context Middleware Order:**

- Files: `apps/backend/src/common/middleware/tenant.middleware.ts`, `apps/backend/src/app.module.ts`
- Why fragile: Tenant middleware must run before all route handlers, but middleware order is implicit
- Safe modification: Any middleware changes must maintain TenantMiddleware as first in chain
- Test coverage: Tenant isolation E2E tests exist (good)
- Risk: Adding new middleware could inadvertently skip tenant context setup
- Improvement: Add startup validation that verifies middleware order; document middleware dependencies

**Prisma Client Extensions for RLS:**

- Files: `apps/backend/src/modules/prisma/prisma.service.ts:22-47`
- Why fragile: RLS context managed via PostgreSQL session variables, easy to forget in background jobs
- Safe modification: Always use `withBypassRLS()` wrapper for system operations; never call `enableBypassRLS()` directly
- Test coverage: Tenant isolation tests cover request-scoped RLS (good)
- Risk: Background job could run without tenant context and see all data
- Improvement: Add runtime assertion that throws if query executed without tenant context (except when bypass enabled); add background job test template

**Complex Service Dependencies:**

- Files: Multiple services with 5+ constructor dependencies
  - `apps/backend/src/modules/rius/rius.service.ts` - 5 dependencies
  - `apps/backend/src/modules/disclosures/conflict-detection.service.ts` - Multiple service dependencies
- Why fragile: High coupling makes refactoring risky; circular dependency risk
- Safe modification: Use dependency injection carefully; consider facade pattern to simplify
- Test coverage: Minimal mocking in existing tests
- Improvement: Draw dependency graph; identify circular dependencies; refactor to reduce coupling

**AI Conversation Logging:**

- Files: Referenced in Prisma schema (`AiMessage`, `AI_CONVERSATION` tables)
- Why fragile: AI logging is critical for audit and billing, but easy to skip in new AI features
- Safe modification: All AI service calls must log conversation to database
- Test coverage: Unknown - no AI conversation test found
- Risk: New AI feature forgets to log, losing audit trail
- Improvement: Create abstract AISkillBase class that enforces logging; add test helper that verifies logging occurred

## Scaling Limits

**Prisma Connection Pool (Azure PostgreSQL):**

- Current capacity: Default Prisma connection pool (typically 5-10 connections per instance)
- Limit: Azure Database for PostgreSQL Basic tier supports max 50 connections; General Purpose tier supports 100-500 connections
- Impact: With 3-5 backend instances, could exceed connection limit under load
- Scaling path: Configure explicit connection pool size per environment; use PgBouncer or Azure connection pooler; migrate to General Purpose tier for production

**Elasticsearch Cluster (Tenant-Per-Index):**

- Current capacity: Development single-node cluster
- Limit: 1,500 tenants = 1,500+ indices; Elasticsearch recommends <1000 shards per node
- Impact: Search performance degrades; cluster stability at risk
- Scaling path: Consolidate to multi-tenant indices with tenant filters; implement index lifecycle management; scale to multi-node cluster

**Redis Cache (Session Storage):**

- Current capacity: Single Redis instance (no persistence configuration in docker-compose.yml except appendonly)
- Limit: With 1,500 organizations and average 50 active users per org = 75,000 sessions in memory
- Impact: Memory exhausted; session loss on restart
- Scaling path: Use Redis Cluster for horizontal scaling; implement session eviction policy; persist sessions to database as backup

**File Storage (Azure Blob):**

- Current capacity: Configured for tenant-per-container pattern
- Limit: Azure Blob Storage supports max 5,000 containers per storage account
- Impact: At 1,500 tenants, headroom exists but growth limited
- Scaling path: Shard across multiple storage accounts; use tenant-folder pattern instead of container-per-tenant

**Background Job Processing:**

- Current capacity: BullMQ configured (detected in package.json) but unknown concurrency
- Limit: Single Redis instance for queue; unknown worker count
- Impact: Job processing bottleneck for campaigns, migrations, exports
- Scaling path: Horizontal scaling of workers; separate queues for priority jobs; implement job prioritization

## Dependencies at Risk

**axios <=1.13.4:**

- Risk: High-severity DoS vulnerability (see Security section)
- Impact: All HTTP requests to external services vulnerable
- Migration plan: Run `npm audit fix` to upgrade to patched version

**@nestjs/cli (DevDependency):**

- Risk: High-severity vulnerabilities in build tooling
- Impact: Developer machines at risk; build process could be compromised
- Migration plan: Upgrade to @nestjs/cli 11.0.16+

**Prisma 5.8.0:**

- Risk: Not a vulnerability, but Prisma 6.x has breaking changes coming
- Impact: Will need migration effort when Prisma 6.x becomes stable
- Migration plan: Monitor Prisma changelog; test with Prisma 6.x beta; allocate sprint for migration

**Next.js 14.1.0:**

- Risk: Not latest; Next.js 15.x is released
- Impact: Missing performance improvements and security patches
- Migration plan: Upgrade to Next.js 15.x; test App Router compatibility; review breaking changes

**socket.io 4.8.3:**

- Risk: WebSocket library used for real-time features
- Impact: Security vulnerabilities in socket.io could expose tenant data
- Migration plan: Keep updated; monitor CVEs; consider migrating to native WebSockets if simpler

## Missing Critical Features

**No Database Backup Strategy:**

- Problem: No automated backup configuration detected
- Blocks: Disaster recovery, compliance requirements
- Impact: Data loss risk; RTO/RPO undefined
- Priority: High
- Fix approach: Configure Azure PostgreSQL automated backups; test restore procedure; document RTO/RPO in operations manual

**No Observability/Monitoring:**

- Problem: Pino logging configured, but no APM or error tracking integration detected
- Blocks: Production debugging, performance monitoring, alerting
- Impact: Cannot diagnose production issues; no SLA monitoring
- Priority: High
- Fix approach: Integrate Sentry or Azure Application Insights; add custom metrics for tenant-scoped operations; create alerting rules

**No CI/CD Pipeline:**

- Problem: `.github/workflows` directory exists but no visible pipeline configuration
- Blocks: Automated deployments, consistent builds
- Impact: Manual deployments error-prone; no automated testing in CI
- Priority: Medium
- Fix approach: Create GitHub Actions workflow for: lint → test → build → deploy (staging → production); add automated security scanning

**No API Versioning Strategy:**

- Problem: All routes use `/api/v1` prefix but no actual versioning implementation
- Blocks: Breaking changes to API; backward compatibility
- Impact: Cannot evolve API without breaking existing clients
- Priority: Medium
- Fix approach: Document API versioning strategy; implement version negotiation; create deprecation policy

**No Automated Database Migration Testing:**

- Problem: 28 migrations exist but no automated rollback testing
- Blocks: Confidence in production deployments
- Impact: Migration failures in production could cause downtime
- Priority: Medium
- Fix approach: Add migration smoke tests to CI; test rollback procedure; create migration checklist

## Test Coverage Gaps

**Core Business Logic - RIU Immutability:**

- What's not tested: Enforcement of immutable fields on RIU updates
- Files: `apps/backend/src/modules/rius/rius.service.ts`
- Risk: Developer could accidentally allow modification of immutable fields (details, reporterInfo, etc.)
- Priority: High
- Fix approach: Add unit test that attempts to update each immutable field and expects rejection; add integration test for update endpoint

**Tenant Isolation - Cache Layer:**

- What's not tested: Redis cache key tenant scoping
- Files: Cache manager usage across services
- Risk: Cache pollution across tenants if keys not properly scoped
- Priority: High
- Fix approach: Add E2E test that verifies Tenant A cannot retrieve Tenant B's cached data; audit all cache key generation for `org:{organizationId}` prefix

**Tenant Isolation - Search Indices:**

- What's not tested: Elasticsearch tenant isolation
- Files: `apps/backend/src/modules/search/search.service.ts` (stub)
- Risk: Once implemented, search could leak cross-tenant data
- Priority: High
- Fix approach: Add E2E test for search tenant isolation before implementing search feature

**AI Services - Prompt Injection:**

- What's not tested: AI services handling of malicious prompts
- Files: `apps/backend/src/modules/ai/skills/` directory
- Risk: Prompt injection could bypass intent or leak system prompts
- Priority: Medium
- Fix approach: Add unit tests with adversarial prompts; validate output sanitization; test rate limiting

**Complex Workflows - Disclosure Conflict Detection:**

- What's not tested: Multi-algorithm fuzzy matching and conflict detection
- Files: `apps/backend/src/modules/disclosures/conflict-detection.service.ts` (1,402 lines, 0 tests found)
- Risk: Core feature with complex logic completely untested
- Priority: High
- Fix approach: Add unit tests for fuzzy matching thresholds; test six-way conflict detection scenarios; test dismissal workflows

**Background Jobs:**

- What's not tested: BullMQ job processors
- Files: `apps/backend/src/modules/jobs/processors/`, `apps/backend/src/modules/campaigns/campaign-scheduling.processor.ts`
- Risk: Job failures undetected; jobs run without tenant context
- Priority: Medium
- Fix approach: Add processor unit tests; verify tenant context in jobs; test job failure/retry logic

**WebSocket Real-Time Features:**

- What's not tested: Socket.io real-time updates
- Files: `apps/backend/test/e2e/websocket.e2e-spec.ts` exists (good)
- Risk: Tenant isolation in WebSocket rooms
- Priority: Medium
- Status: E2E test exists, verify it covers tenant isolation

**File Upload/Download:**

- What's not tested: Attachment service and storage provider
- Files: `apps/backend/src/common/services/storage.service.spec.ts` (426 lines - good, tests exist)
- Risk: Lower - storage service has test coverage
- Priority: Low
- Status: Good coverage exists

---

_Concerns audit: 2026-02-13_
