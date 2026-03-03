# PRE-SERIES A CODE REVIEW: RISK INTELLIGENCE PLATFORM

**Reviewer:** Principal Engineer (CTO-grade review)
**Date:** 2026-02-15
**Target:** 10K+ daily users, 1K+ cases/day, SOC 2 Type II, penetration-test ready

---

## 1. SECURITY & SOC 2 READINESS

**Grade: D+**

| #   | Severity | File                                                      | Line    | Finding                                                                                                                                                                             | Recommendation                                                                                                                           |
| --- | -------- | --------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CRITICAL | modules/analytics/migration/migration.controller.ts       | 87-88   | Complete auth bypass — hardcoded TEMP_ORG_ID/TEMP_USER_ID on 22 endpoints. Any unauthenticated user can upload files, trigger migrations, modify data.                              | Add @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard) + @Roles(SYSTEM_ADMIN). Replace hardcoded IDs with @TenantId() and @CurrentUser(). |
| 2   | CRITICAL | modules/ai/ai.gateway.ts                                  | 415-434 | WebSocket auth bypass — extractContext() trusts client-provided organizationId, userId, userRole from handshake without JWT verification. Attacker can impersonate any user/tenant. | Implement JwtService.verify() in handleConnection(). Extract identity from verified JWT, not client auth object.                         |
| 3   | CRITICAL | modules/disclosures/conflict.controller.ts                | 42-43   | Auth bypass — same TEMP_ORG_ID/TEMP_USER_ID pattern, no guards.                                                                                                                     | Same as #1.                                                                                                                              |
| 4   | CRITICAL | modules/campaigns/attestation/attestation.controller.ts   | 35-37   | Auth bypass — TEMP_ORG_ID, TEMP_USER_ID, plus TEMP_EMPLOYEE_ID.                                                                                                                     | Same as #1.                                                                                                                              |
| 5   | CRITICAL | modules/campaigns/campaigns.controller.ts                 | 44-45   | Auth bypass — TEMP_ORG_ID/TEMP_USER_ID, no guards.                                                                                                                                  | Same as #1.                                                                                                                              |
| 6   | CRITICAL | modules/policies/approval/policy-approval.controller.ts   | 41-42   | Auth bypass — TEMP_ORG_ID/TEMP_USER_ID, no guards.                                                                                                                                  | Same as #1.                                                                                                                              |
| 7   | CRITICAL | modules/investigations/checklists/checklist.controller.ts | 51-53   | Auth bypass — hardcoded "stub-org-id"/"stub-user-id" strings (non-UUID). Even worse — will fail RLS silently.                                                                       | Same as #1.                                                                                                                              |
| 8   | HIGH     | modules/auth/auth.module.ts                               | 46      | JWT algorithm confusion — algorithms: ["RS256", "HS256"] accepts both. Attacker could forge tokens using HS256 with public key as secret (CVE-2015-9235).                           | Pin to ["RS256"] only in production.                                                                                                     |
| 9   | HIGH     | modules/auth/services/token-refresh.service.ts            | 88-89   | JWT_REFRESH_SECRET falls back to undefined if not set. Tokens could be signed with undefined as secret.                                                                             | Validate JWT_REFRESH_SECRET in onModuleInit(). Fail startup if missing.                                                                  |
| 10  | HIGH     | modules/ai/dto/chat-message.dto.ts                        | 24-25   | organizationId accepted from request body — allows clients to specify arbitrary tenant. Bypasses JWT context.                                                                       | Remove organizationId from DTO. Derive from @TenantId().                                                                                 |
| 11  | HIGH     | modules/demo/demo.service.ts                              | 38      | Hardcoded password — DEMO_PASSWORD = "Password123!" visible in source.                                                                                                              | Generate unique random passwords per demo account.                                                                                       |
| 12  | MEDIUM   | modules/auth/dto/login.dto.ts                             | 9-19    | No @MaxLength() on email/password. 1MB+ strings → CPU exhaustion during bcrypt.                                                                                                     | Add @MaxLength(255) email, @MaxLength(128) password.                                                                                     |
| 13  | MEDIUM   | Multiple DTOs                                             | Various | UUID fields use @IsString() instead of @IsUUID() — audit-log-query.dto.ts:22, websocket.dto.ts:76, others.                                                                          | Replace with @IsUUID() on all ID fields.                                                                                                 |
| 14  | MEDIUM   | modules/auth/guards/mfa.guard.ts                          | 44-47   | MFA verified state not persisted in JWT payload. mfaVerified flag missing from AccessTokenPayload.                                                                                  | Add mfaVerified: boolean to JWT payload. Issue new token post-MFA.                                                                       |
| 15  | MEDIUM   | common/middleware/tenant.middleware.ts                    | 61-64   | HS256-only in tenant middleware. Will break when RS256 is enabled. jwt.verify(token, secret!) — secret could be undefined.                                                          | Use JwtKeyService.getVerificationKey() with algorithm detection.                                                                         |
| 16  | MEDIUM   | modules/messaging/relay.service.ts                        | 185-197 | Message creation missing activityService.log(). SOC 2 audit gap.                                                                                                                    | Add audit logging for message send/receive.                                                                                              |
| 17  | MEDIUM   | app.module.ts                                             | 140-141 | Operations module excluded from TenantMiddleware wholesale — api/v1/operations/(.\*).                                                                                               | Narrow exemption to specific endpoints that need cross-tenant access.                                                                    |
| 18  | LOW      | modules/auth/mfa/mfa.service.ts                           | 88-89   | MFA logs user email (PII). SOC 2 recommends minimizing PII in logs.                                                                                                                 | Log user ID instead.                                                                                                                     |
| 19  | LOW      | common/filters/sentry-exception.filter.ts                 | 60      | Request body sent to Sentry even with sanitization. May miss custom sensitive fields.                                                                                               | Consider opt-in body logging rather than opt-out.                                                                                        |

**Strengths:** Helmet enabled, Swagger disabled in prod, global ThrottlerGuard (100/min), AI rate limiting per-org, whitelist: true + forbidNonWhitelisted: true on ValidationPipe, bcrypt at 12 rounds, stack traces suppressed, 404-not-403 pattern for tenant-scoped resources.

---

## 2. AI CODE SLOP DETECTION

**Grade: C-**

| #   | Severity | File                                                         | Line      | Finding                                                                                                                                                                  | Recommendation                                                            |
| --- | -------- | ------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 1   | CRITICAL | 7 controllers                                                | See Sec 1 | 7 controllers with hardcoded TEMP/stub IDs — clear "wire it up later" code that was never wired up. Classic AI-generated-then-abandoned pattern.                         | Fix all auth bypasses (same as Security findings).                        |
| 2   | HIGH     | modules/feature-flags/feature-flags.module.ts                | 35-41     | Orphaned module — exists with full implementation but never imported in app.module.ts. Dead code.                                                                        | Import in AppModule or delete entirely.                                   |
| 3   | HIGH     | modules/metrics/metrics.module.ts                            | 27-33     | Orphaned module — 214 lines of Prometheus metrics never initialized.                                                                                                     | Same as above.                                                            |
| 4   | HIGH     | modules/sentry/sentry.module.ts                              | 19-77     | Orphaned module — full Sentry configuration that never runs.                                                                                                             | Same as above.                                                            |
| 5   | HIGH     | modules/storage/document-processing.service.ts               | 145-200   | 4 stub implementations — PDF, Office, RTF, OpenDocument extraction all return { success: false, error: "not yet implemented" }. Users uploading PDFs get silent failure. | Implement or disable upload for unsupported types.                        |
| 6   | HIGH     | modules/operations/client-health/usage-metrics.service.ts    | 268-280   | Support ticket count always returns 0 — feeds 15% of health score calculation. All tenants get perfect support scores.                                                   | Implement integration or remove from score.                               |
| 7   | MEDIUM   | 84 files                                                     | Various   | 384 section-separator comments (// ====...) — strong AI-generation signal. No human writes 384 identical formatting patterns.                                            | Strip all section separators. Use file splitting instead.                 |
| 8   | MEDIUM   | modules/ai/interfaces/ai-provider.interface.ts               | 129-170   | Single-implementation interface — AIProvider has only ClaudeProvider.                                                                                                    | Acceptable if multi-provider is on near-term roadmap. Otherwise simplify. |
| 9   | MEDIUM   | 38 TODOs across codebase                                     | Various   | 38 TODO comments — 12 are auth-related ("add guards when auth integrated"), indicating features marked done that aren't.                                                 | Triage into backlog. Auth TODOs are security-blocking.                    |
| 10  | MEDIUM   | modules/operations/implementation/escalation.processor.ts    | 185-250   | 3 empty notification methods — escalations trigger but no actual notifications are sent.                                                                                 | Implement or remove escalation feature.                                   |
| 11  | MEDIUM   | modules/ai/actions/actions/                                  | Multiple  | Multiple "Placeholder" action definitions — execute returns { success: false, message: 'Placeholder' }.                                                                  | Implement or remove from action registry.                                 |
| 12  | LOW      | modules/tables/user-table.service.ts                         | 343-354   | PDF export silently returns Excel — logs warning but user gets wrong format.                                                                                             | Implement PDF or return error explaining unavailability.                  |
| 13  | LOW      | modules/cases/pipeline.service.ts + case-pipeline.service.ts | 1-14      | Duplicate service files — both in same directory with identical banner comments.                                                                                         | Delete the non-canonical one.                                             |
| 14  | LOW      | Pervasive                                                    | Various   | Restating JSDoc — /\*_ Delete a feature flag. _/ async deleteFlag(). Adds noise, no value.                                                                               | Strip JSDoc that restates method names.                                   |
| 15  | LOW      | 9 DTO files                                                  | Various   | Bloated DTOs — report.dto.ts (683 lines, 11 DTOs), conflict.dto.ts (605 lines).                                                                                          | Split by concern.                                                         |

---

## 3. PERFORMANCE & SCALABILITY

**Grade: C**

| #   | Severity | File                                                  | Line      | Finding                                                                                                                                                             | Recommendation                                                                            |
| --- | -------- | ----------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | CRITICAL | modules/campaigns/campaign-reminder.service.ts        | 163-191   | Unbounded query — fetches ALL assignments needing reminders with no pagination. At 10K users × multiple campaigns = 50K+ records in memory.                         | Add cursor-based batch processing.                                                        |
| 2   | CRITICAL | Various                                               | N/A       | No application-level Redis caching — Redis only used for rate limiting and BullMQ. Zero caching for user permissions, reference data, org settings, dashboard data. | Implement Redis caching for hot paths: permissions, categories, business units, branding. |
| 3   | HIGH     | modules/persons/persons.service.ts                    | 357-392   | N+1 in createFromEmployee — sequential single-record queries for manager, businessUnit, location per employee during HRIS sync.                                     | Batch-fetch all relations before processing.                                              |
| 4   | HIGH     | modules/persons/persons.service.ts                    | 596-623   | N+1 in getManagerChain — one DB query per manager level in while loop. O(depth) queries.                                                                            | Replace with recursive CTE or batch fetch.                                                |
| 5   | HIGH     | modules/campaigns/campaign-reminder.service.ts        | 477-479   | All compliance profiles loaded to JS — fetches every profile to compute averages in application code.                                                               | Use Prisma aggregate() or raw SQL for statistics.                                         |
| 6   | HIGH     | modules/prisma/prisma.service.ts                      | 10-14     | No connection pool config — Prisma defaults (2×CPU+1). At 10K users, default pool insufficient.                                                                     | Configure pool: ?connection_limit=50&pool_timeout=30 in DATABASE_URL.                     |
| 7   | HIGH     | modules/campaigns/campaign-reminder.service.ts        | 448-454   | Unbounded query — all repeat non-responders without pagination.                                                                                                     | Add take/skip.                                                                            |
| 8   | MEDIUM   | modules/analytics/dashboard/widget-data.service.ts    | 38, 87-97 | Dashboard cache uses in-memory store — won't work with multiple app instances.                                                                                      | Configure cache-manager to use Redis store.                                               |
| 9   | MEDIUM   | modules/campaigns/campaign-reminder.service.ts        | 240-252   | Loop-based reminder queueing — for...of with individual queue.add().                                                                                                | Use BullMQ addBulk().                                                                     |
| 10  | MEDIUM   | modules/analytics/exports/scheduled-export.service.ts | 487-503   | Unbounded scheduled export query — no limit on due schedules.                                                                                                       | Add take limit, process in batches.                                                       |
| 11  | MEDIUM   | modules/persons/persons.service.ts                    | 633-645   | getDirectReports unbounded — CEO could have thousands of reports.                                                                                                   | Add pagination parameters.                                                                |
| 12  | MEDIUM   | modules/ai/agents/agent.registry.ts                   | 68        | Agent instance Map may grow unbounded — no TTL or eviction.                                                                                                         | Add LRU eviction or TTL cleanup.                                                          |

**Strengths:** Good pagination patterns in most list endpoints (parallel count queries), proper Elasticsearch circuit breaker with 5s timeout, createMany for batch inserts in campaign assignments, good index coverage in Prisma schema.

---

## 4. CODE QUALITY & ARCHITECTURE

**Grade: C+**

| #   | Severity | File                              | Line    | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                             | Recommendation                                                                                                 |
| --- | -------- | --------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | HIGH     | 12 services                       | Various | Fat services (800+ lines): ai-triage.service.ts (1000), mapping-suggestion.service.ts (957), query-to-prisma.service.ts (956), user-table.service.ts (952), project-template.service.ts (929), context-loader.service.ts (925), ai-query.service.ts (914), migration-parser.service.ts (887), policy-case-association.service.ts (878), notification.service.ts (868), campaign-scheduling.service.ts (856), schema-introspection.service.ts (843). | Split by responsibility. E.g., ai-triage.service.ts → triage-interpretation, triage-execution, triage-preview. |
| 2   | HIGH     | 90+ instances                     | Various | Excessive any usage — ai-triage.service.ts (8 instances), threshold.service.ts (5), ai-query.service.ts (9), auth.controller.ts (3 — req.user as any), workflow.service.ts (4), create-workflow-template.dto.ts (4 — any[] arrays).                                                                                                                                                                                                                 | Create proper interfaces. For dynamic Prisma access, use generated types.                                      |
| 3   | MEDIUM   | apps/backend/tsconfig.json        | —       | Missing strict: true — individual strict flags set but not comprehensive strict mode.                                                                                                                                                                                                                                                                                                                                                               | Add "strict": true.                                                                                            |
| 4   | MEDIUM   | 50+ instances                     | Various | Non-null assertions hiding bugs — tenant.middleware.ts:64 (secret!), keyvault.service.ts:98 (this.client!), claude.provider.ts:77,102 (this.client!), impersonation.middleware.ts:107 (req.impersonation!).                                                                                                                                                                                                                                         | Add proper null checks or optional chaining with fallbacks.                                                    |
| 5   | MEDIUM   | modules/forms/forms.controller.ts | 62, 103 | as any cast bypassing validation — dto as any passed to service, defeating type safety.                                                                                                                                                                                                                                                                                                                                                             | Fix DTO types to match service signatures.                                                                     |
| 6   | LOW      | modules/demo/demo.controller.ts   | 149     | Single @ts-expect-error for Prisma include typing.                                                                                                                                                                                                                                                                                                                                                                                                  | Fix return type or use proper type guard.                                                                      |

**Strengths:** Proper DI usage (only 1 manual new), clean barrel exports, no circular dependencies detected, good frontend patterns (centralized API client, service layer), excellent Prisma schema consistency (camelCase → snake_case @map, consistent organizationId, createdAt/updatedAt on all models, AI-first fields present).

---

## 5. TEST COVERAGE GAPS

**Grade: F**

| #   | Severity | Area               | Finding                                                                                                                                                                                   | Recommendation                                            |
| --- | -------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | CRITICAL | Overall            | 7.9% backend service test coverage — 19 spec files out of ~190 services. SOC 2 auditors will flag this immediately.                                                                       | Target 60% minimum. Estimated 160-200 dev hours.          |
| 2   | CRITICAL | Auth Guards        | 0% coverage on all 6 guards — jwt-auth.guard.ts, roles.guard.ts, tenant.guard.ts, jwt-ws.guard.ts, mfa.guard.ts, throttle-behind-proxy.guard.ts. These are the SOC 2 compliance backbone. | Write guard tests first (12h total).                      |
| 3   | CRITICAL | Auth Strategies    | 0% coverage on all 4 strategies — jwt.strategy.ts, azure-ad.strategy.ts, google.strategy.ts, saml.strategy.ts.                                                                            | Test payload validation, token verification (8h).         |
| 4   | CRITICAL | Impersonation      | 0% coverage — impersonation.service.ts, impersonation.middleware.ts, impersonation.guard.ts. Privilege escalation path with no tests.                                                     | Test restrictions, audit logging (6h).                    |
| 5   | CRITICAL | Tenant Isolation   | Only 3 of 15+ modules have tenant isolation E2E tests. Missing: auth/SSO, campaigns, disclosures, policies, reporting, AI, forms, notifications, HRIS, workflow.                          | Add isolation tests for all modules (40h).                |
| 6   | CRITICAL | Case Merge         | 0% coverage on case-merge.service.ts — data integrity during atomic merge operations.                                                                                                     | Test merge, rollback, association transfer (4h).          |
| 7   | CRITICAL | Conflict Detection | 0% coverage on conflict-detection.service.ts + 3 related services — core compliance feature.                                                                                              | Test all 6 conflict types (8h).                           |
| 8   | HIGH     | AI Services        | 0% coverage on all 7 AI services — ai-client, ai-orchestration, context-loader, conversation, prompt, rate-limiter, action-executor.                                                      | Test error handling, rate limits, tenant isolation (12h). |
| 9   | HIGH     | Workflow Engine    | 0% coverage — assignment strategies, state transitions.                                                                                                                                   | Test each strategy, state machine (8h).                   |
| 10  | HIGH     | Frontend           | 13% coverage — 13 test files for ~100+ components. Zero coverage on auth, portal forms, settings, workflow builder.                                                                       | Prioritize auth pages, form submission flows (40h).       |

**Existing tests that ARE good:** activity.service.spec.ts (783 lines), investigation-notes.service.spec.ts (675 lines), cases.service.spec.ts (comprehensive CRUD). The test infrastructure (Jest config, E2E setup, MSW handlers) is solid — the gap is volume.

---

## 6. PRODUCTION READINESS

**Grade: B-**

| #   | Severity | File                                                   | Line    | Finding                                                                                                                                       | Recommendation                                        |
| --- | -------- | ------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | CRITICAL | common/services/storage.service.ts                     | 196-217 | MIME validation trusts client header only — file.mimetype is client-provided. Attacker can upload malicious executable with image/png header. | Add magic-byte validation with file-type npm package. |
| 2   | CRITICAL | modules/attachments/attachments.module.ts              | 31-37   | No file type filter at Multer level — accepts any file type before validation.                                                                | Add fileFilter to reject dangerous extensions.        |
| 3   | HIGH     | modules/projects/gateways/project.gateway.ts           | 530     | Direct process.env.JWT_SECRET instead of ConfigService. Bypasses env validation.                                                              | Use ConfigService.get().                              |
| 4   | HIGH     | modules/notifications/gateways/notification.gateway.ts | 458     | Direct process.env.JWT_SECRET — same issue.                                                                                                   | Use ConfigService.get().                              |
| 5   | MEDIUM   | apps/backend/package.json                              | 44      | @faker-js/faker in production deps — test library shipped to production.                                                                      | Move to devDependencies.                              |
| 6   | MEDIUM   | docker-compose.yml                                     | 11-13   | Hardcoded passwords — ethico_dev for DB. Fine for dev but document as dev-only.                                                               | Add .env.example noting dev-only credentials.         |
| 7   | LOW      | modules/storage/storage.module.ts                      | 51      | console.error instead of NestJS Logger.                                                                                                       | Use this.logger.error().                              |

**Strengths:** Health checks verify DB+Redis+ES connectivity, graceful shutdown with enableShutdownHooks() + dumb-init, Pino structured logging, sensitive field redaction in Sentry, Dockerfile runs as non-root with multi-stage build, Zod-based env validation, Azure Key Vault integration, no destructive migrations found, 50MB file size limit enforced, API versioned at /api/v1.

---

## EXECUTIVE SUMMARY

### Overall Grade: D+

The codebase has solid architectural bones — Prisma schema is excellent, module structure is clean, auth patterns are well-designed where actually implemented. But the **7 unauthenticated controllers**, **7.9% test coverage**, and **client-trusted WebSocket auth** make this unshippable in current state.

### Top 5 Items to Fix Before Showing to CTO

| #   | Finding                                                                                                          | Effort |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Fix 7 unauthenticated controllers — hardcoded TEMP_ORG_ID/stub-org-id bypassing all auth                         | 8h     |
| 2   | Fix WebSocket auth bypass — AI gateway trusts client-provided identity                                           | 4h     |
| 3   | Delete 3 orphaned modules or wire them into AppModule                                                            | 2h     |
| 4   | Remove/implement stubs — document processing returns fake data, health score uses zero, PDF export returns Excel | 16h    |
| 5   | Add test coverage for auth guards and strategies — the 10 files protecting every endpoint have 0% coverage       | 20h    |

### Top 5 Items to Fix Before SOC 2 Audit

| #   | Finding                                                                                                   | Effort |
| --- | --------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Test coverage to 60%+ — current 7.9% is an automatic audit failure                                        | 160h   |
| 2   | Tenant isolation E2E tests for all 15+ modules (only 3 covered)                                           | 40h    |
| 3   | Audit logging on all mutation paths — messaging module missing, migration controller has none             | 8h     |
| 4   | MFA verification persistence in JWT — current implementation doesn't actually enforce MFA across requests | 4h     |
| 5   | PII removal from logs — user emails logged in MFA service, request bodies sent to Sentry                  | 4h     |

### Top 5 Items to Fix Before Pen Test

| #   | Finding                                                                           | Effort |
| --- | --------------------------------------------------------------------------------- | ------ |
| 1   | 7 unauthenticated controllers — first thing any pen tester will find              | 8h     |
| 2   | JWT algorithm confusion — accepting both RS256 and HS256 is a known attack vector | 2h     |
| 3   | File upload magic-byte validation — MIME type spoofing to upload executables      | 4h     |
| 4   | WebSocket identity spoofing — AI gateway trusts client-provided role/tenant       | 4h     |
| 5   | organizationId in request body — ChatMessage DTO allows tenant impersonation      | 1h     |

### The 72-Hour Fix List (before showing to any CTO)

| Priority  | Fix                                             | Hours    |
| --------- | ----------------------------------------------- | -------- |
| 1         | Wire auth guards onto 7 unprotected controllers | 8h       |
| 2         | Fix WebSocket JWT verification in AI gateway    | 4h       |
| 3         | Pin JWT algorithm to RS256 only                 | 2h       |
| 4         | Add file-type magic-byte validation             | 4h       |
| 5         | Remove organizationId from ChatMessage DTO      | 1h       |
| 6         | Register or delete 3 orphaned modules           | 2h       |
| 7         | Add auth guard + strategy tests (10 files)      | 20h      |
| 8         | Add tenant isolation E2E for top 5 modules      | 20h      |
| **Total** |                                                 | **~61h** |

The architectural foundation (Prisma schema, module structure, RLS pattern, ValidationPipe config, Helmet/CORS/rate-limiting) is genuinely solid. The problems are all execution gaps — unfinished wiring, missing tests, and stubs that were never completed. A focused 2-week sprint addressing the items above would move this from D+ to B territory.
