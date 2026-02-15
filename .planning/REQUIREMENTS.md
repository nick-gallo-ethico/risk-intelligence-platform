# Requirements: v1.2 Production Hardening & Feature Completion

## Overview

Dual-track milestone: (1) Remediate all findings from pre-Series A code review across 6 dimensions, targeting B+ overall grade; (2) Complete 3 unfinished v1.0 feature phases.

**Source:** `.planning/CODE-REVIEW-v1.2.md` (pre-Series A code review, 2026-02-15)

---

## Track 1: Code Review Remediation

### Security & SOC 2 (Grade: D+ → Target: B+)

- [ ] **SEC-01**: Fix 7 unauthenticated controllers — replace hardcoded TEMP_ORG_ID/TEMP_USER_ID/stub-org-id with @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard) + @Roles decorators on migration, conflict, attestation, campaigns, policy-approval, checklist controllers
- [ ] **SEC-02**: Fix WebSocket auth bypass — AI gateway extractContext() must verify JWT instead of trusting client-provided organizationId/userId/userRole from handshake
- [ ] **SEC-03**: Pin JWT algorithm to RS256 only — remove HS256 from algorithms array in auth.module.ts to prevent algorithm confusion attack (CVE-2015-9235)
- [ ] **SEC-04**: Validate JWT_REFRESH_SECRET on startup — fail startup if undefined instead of signing tokens with undefined secret
- [ ] **SEC-05**: Remove organizationId from ChatMessage DTO — derive from @TenantId() instead of accepting from request body
- [ ] **SEC-06**: Fix hardcoded demo password — generate unique random passwords per demo account instead of Password123!
- [ ] **SEC-07**: Add @MaxLength() validation on login DTO — prevent CPU exhaustion via 1MB+ strings during bcrypt
- [ ] **SEC-08**: Replace @IsString() with @IsUUID() on all ID fields across DTOs
- [ ] **SEC-09**: Persist MFA verification in JWT payload — add mfaVerified boolean to AccessTokenPayload, issue new token post-MFA
- [ ] **SEC-10**: Fix tenant middleware JWT verification — use JwtKeyService.getVerificationKey() with algorithm detection instead of HS256-only
- [ ] **SEC-11**: Add audit logging to messaging relay service — SOC 2 requires all mutation paths logged
- [ ] **SEC-12**: Narrow Operations module TenantMiddleware exemption — restrict to specific endpoints instead of blanket api/v1/operations/(.\*)
- [ ] **SEC-13**: Minimize PII in logs — log user ID instead of email in MFA service, review Sentry body logging

### AI Code Slop Cleanup (Grade: C- → Target: B+)

- [ ] **SLOP-01**: Register or delete 3 orphaned modules — feature-flags, metrics, sentry modules exist but are not imported in AppModule
- [ ] **SLOP-02**: Implement or disable document processing stubs — PDF, Office, RTF, OpenDocument extraction returning fake success:false
- [ ] **SLOP-03**: Fix usage metrics support ticket count — currently always returns 0, feeding 15% of health score calculation
- [ ] **SLOP-04**: Strip 384 section-separator comments (// ====...) across 84 files
- [ ] **SLOP-05**: Triage and resolve 38 TODO comments — 12 are auth-related security-blocking items
- [ ] **SLOP-06**: Implement or remove empty notification methods in escalation processor
- [ ] **SLOP-07**: Implement or remove placeholder AI actions returning { success: false, message: 'Placeholder' }
- [ ] **SLOP-08**: Fix PDF export silently returning Excel — implement PDF or return error explaining unavailability
- [ ] **SLOP-09**: Delete duplicate service file — pipeline.service.ts + case-pipeline.service.ts in same directory
- [ ] **SLOP-10**: Strip restating JSDoc comments that add no value (/\*_ Delete a feature flag. _/ async deleteFlag())
- [ ] **SLOP-11**: Split bloated DTO files — report.dto.ts (683 lines, 11 DTOs), conflict.dto.ts (605 lines)

### Performance & Scalability (Grade: C → Target: B+)

- [ ] **PERF-01**: Fix unbounded query in campaign-reminder.service.ts — add cursor-based batch processing instead of fetching all assignments
- [ ] **PERF-02**: Implement Redis caching for hot paths — user permissions, categories, business units, branding, org settings
- [ ] **PERF-03**: Fix N+1 in persons.service.ts createFromEmployee — batch-fetch manager, businessUnit, location relations
- [ ] **PERF-04**: Fix N+1 in persons.service.ts getManagerChain — replace per-level queries with recursive CTE or batch fetch
- [ ] **PERF-05**: Fix compliance profiles in-memory aggregation — use Prisma aggregate() or raw SQL instead of loading all profiles to JS
- [ ] **PERF-06**: Configure Prisma connection pool — add connection_limit=50&pool_timeout=30 to DATABASE_URL
- [ ] **PERF-07**: Fix unbounded repeat non-responder query — add take/skip pagination
- [ ] **PERF-08**: Switch dashboard cache from in-memory to Redis store — required for multi-instance deployment
- [ ] **PERF-09**: Use BullMQ addBulk() for reminder queueing instead of loop-based individual queue.add()
- [ ] **PERF-10**: Add batch limits to scheduled export and getDirectReports queries
- [ ] **PERF-11**: Add TTL/LRU eviction to agent instance Map to prevent unbounded growth

### Code Quality & Architecture (Grade: C+ → Target: B+)

- [ ] **QUAL-01**: Split 12 fat services (800+ LOC each) — ai-triage, mapping-suggestion, query-to-prisma, user-table, project-template, context-loader, ai-query, migration-parser, policy-case-association, notification, campaign-scheduling, schema-introspection
- [ ] **QUAL-02**: Replace 90+ `any` type usages with proper interfaces — ai-triage (8), ai-query (9), threshold (5), auth.controller (3), workflow (4), create-workflow-template.dto (4)
- [ ] **QUAL-03**: Enable strict: true in backend tsconfig.json
- [ ] **QUAL-04**: Replace non-null assertions with proper null checks — tenant.middleware, keyvault.service, claude.provider, impersonation.middleware
- [ ] **QUAL-05**: Fix `as any` casts bypassing validation in forms.controller.ts — match DTO types to service signatures

### Test Coverage (Grade: F → Target: B)

- [ ] **TEST-01**: Write unit tests for all 6 auth guards — jwt-auth, roles, tenant, jwt-ws, mfa, throttle-behind-proxy (0% → 90%+)
- [ ] **TEST-02**: Write unit tests for all 4 auth strategies — jwt, azure-ad, google, saml (0% → 90%+)
- [ ] **TEST-03**: Write unit tests for impersonation service, middleware, and guard (0% → 90%+)
- [ ] **TEST-04**: Add tenant isolation E2E tests for remaining 12+ modules — auth/SSO, campaigns, disclosures, policies, reporting, AI, forms, notifications, HRIS, workflow
- [ ] **TEST-05**: Write unit tests for case-merge.service.ts — merge, rollback, association transfer
- [ ] **TEST-06**: Write unit tests for conflict-detection.service.ts and 3 related services — all 6 conflict types
- [ ] **TEST-07**: Write unit tests for AI services — ai-client, ai-orchestration, context-loader, conversation, prompt, rate-limiter, action-executor
- [ ] **TEST-08**: Write unit tests for workflow engine — assignment strategies, state transitions
- [ ] **TEST-09**: Expand frontend test coverage — auth pages, portal forms, settings, workflow builder (13% → 40%+)
- [ ] **TEST-10**: Achieve 60%+ overall backend service test coverage (currently 7.9%)

### Production Readiness (Grade: B- → Target: A-)

- [ ] **PROD-01**: Add magic-byte file validation with file-type npm package — MIME validation currently trusts client header only
- [ ] **PROD-02**: Add fileFilter to Multer attachment upload — reject dangerous extensions before processing
- [ ] **PROD-03**: Replace direct process.env.JWT_SECRET with ConfigService.get() in project.gateway.ts and notification.gateway.ts
- [ ] **PROD-04**: Move @faker-js/faker from production deps to devDependencies
- [ ] **PROD-05**: Replace console.error with NestJS Logger in storage.module.ts

---

## Track 2: Unfinished v1.0 Feature Phases

### Dark Mode & Theme System (Phase 22 — 0/15 plans)

- [ ] **THEME-01**: User can toggle dark mode from user menu and settings
- [ ] **THEME-02**: All pages render correctly in dark mode with proper contrast
- [ ] **THEME-03**: Dark mode preference persists across sessions in user preferences
- [ ] **THEME-04**: System preference detection — auto-detect OS dark mode as default
- [ ] **THEME-05**: Navigation bars visually consistent in both light and dark modes
- [ ] **THEME-06**: Charts, tables, modals, and forms respect active theme
- [ ] **THEME-07**: Smooth theme transition with no flash of wrong theme on page load

### Help & Support System (Phase 23 — 0/5 plans)

- [ ] **HELP-01**: Help & Support accessible from sidebar and user menu
- [ ] **HELP-02**: Searchable knowledge base with articles organized by category
- [ ] **HELP-03**: Users can file support tickets with subject, description, priority, screenshots
- [ ] **HELP-04**: Users can view their open tickets and status
- [ ] **HELP-05**: Contextual help links from relevant pages to related articles

### Case Detail Vision Revision (Phase 25.1 — 0/10 plans)

- [ ] **CASE-01**: Sticky pipeline stage bar at top with click-to-advance
- [ ] **CASE-02**: Left sidebar Actions dropdown with 8 items (Assign, Change Status, Merge, Follow, View Properties, View History, Export, Delete)
- [ ] **CASE-03**: Left sidebar with 3 collapsible property cards (About, Intake, Classification)
- [ ] **CASE-04**: Classification card with dependent category/subcategory dropdowns
- [ ] **CASE-05**: Overview tab as default with lifecycle metrics, editable summary, status timeline
- [ ] **CASE-06**: Activities tab with exact HubSpot pattern — type checkboxes, user/team filter, search, pinning
- [ ] **CASE-07**: Six tabs total: Overview, Activities, Investigations, Messages, Files, Remediation
- [ ] **CASE-08**: Right sidebar with 9 cards (Workflow, People, RIUs, Cases, Policies, Documents, Tasks, Remediation Status, AI Assistant)
- [ ] **CASE-09**: Config-driven architecture using CASES_DETAIL_CONFIG module config pattern
- [ ] **CASE-10**: Tenant-configurable pipeline stages (default: New → Assigned → Active → Review → Closed → Remediation → Archived)

---

## Summary

| Category             | Requirements                  | Priority |
| -------------------- | ----------------------------- | -------- |
| Security & SOC 2     | 13 (SEC-01 through SEC-13)    | CRITICAL |
| AI Code Slop         | 11 (SLOP-01 through SLOP-11)  | HIGH     |
| Performance          | 11 (PERF-01 through PERF-11)  | HIGH     |
| Code Quality         | 5 (QUAL-01 through QUAL-05)   | MEDIUM   |
| Test Coverage        | 10 (TEST-01 through TEST-10)  | CRITICAL |
| Production Readiness | 5 (PROD-01 through PROD-05)   | HIGH     |
| Dark Mode & Theme    | 7 (THEME-01 through THEME-07) | MEDIUM   |
| Help & Support       | 5 (HELP-01 through HELP-05)   | MEDIUM   |
| Case Detail Vision   | 10 (CASE-01 through CASE-10)  | MEDIUM   |
| **Total**            | **77**                        |          |

---

## Traceability

| Requirement | Phase      | Status  |
| ----------- | ---------- | ------- |
| SEC-01      | Phase 32   | Pending |
| SEC-02      | Phase 32   | Pending |
| SEC-03      | Phase 32   | Pending |
| SEC-04      | Phase 32   | Pending |
| SEC-05      | Phase 32   | Pending |
| SEC-06      | Phase 32   | Pending |
| SEC-07      | Phase 32   | Pending |
| SEC-08      | Phase 32   | Pending |
| SEC-09      | Phase 32   | Pending |
| SEC-10      | Phase 32   | Pending |
| SEC-11      | Phase 32   | Pending |
| SEC-12      | Phase 32   | Pending |
| SEC-13      | Phase 32   | Pending |
| SLOP-01     | Phase 33   | Pending |
| SLOP-02     | Phase 33   | Pending |
| SLOP-03     | Phase 33   | Pending |
| SLOP-04     | Phase 33   | Pending |
| SLOP-05     | Phase 33   | Pending |
| SLOP-06     | Phase 33   | Pending |
| SLOP-07     | Phase 33   | Pending |
| SLOP-08     | Phase 33   | Pending |
| SLOP-09     | Phase 33   | Pending |
| SLOP-10     | Phase 33   | Pending |
| SLOP-11     | Phase 33   | Pending |
| PROD-01     | Phase 33   | Pending |
| PROD-02     | Phase 33   | Pending |
| PROD-03     | Phase 33   | Pending |
| PROD-04     | Phase 33   | Pending |
| PROD-05     | Phase 33   | Pending |
| PERF-01     | Phase 34   | Pending |
| PERF-02     | Phase 34   | Pending |
| PERF-03     | Phase 34   | Pending |
| PERF-04     | Phase 34   | Pending |
| PERF-05     | Phase 34   | Pending |
| PERF-06     | Phase 34   | Pending |
| PERF-07     | Phase 34   | Pending |
| PERF-08     | Phase 34   | Pending |
| PERF-09     | Phase 34   | Pending |
| PERF-10     | Phase 34   | Pending |
| PERF-11     | Phase 34   | Pending |
| QUAL-01     | Phase 35   | Pending |
| QUAL-02     | Phase 35   | Pending |
| QUAL-03     | Phase 35   | Pending |
| QUAL-04     | Phase 35   | Pending |
| QUAL-05     | Phase 35   | Pending |
| TEST-01     | Phase 36   | Pending |
| TEST-02     | Phase 36   | Pending |
| TEST-03     | Phase 36   | Pending |
| TEST-04     | Phase 36   | Pending |
| TEST-05     | Phase 36   | Pending |
| TEST-06     | Phase 36   | Pending |
| TEST-07     | Phase 36   | Pending |
| TEST-08     | Phase 36   | Pending |
| TEST-09     | Phase 36   | Pending |
| TEST-10     | Phase 36   | Pending |
| THEME-01    | Phase 22   | Pending |
| THEME-02    | Phase 22   | Pending |
| THEME-03    | Phase 22   | Pending |
| THEME-04    | Phase 22   | Pending |
| THEME-05    | Phase 22   | Pending |
| THEME-06    | Phase 22   | Pending |
| THEME-07    | Phase 22   | Pending |
| HELP-01     | Phase 23   | Pending |
| HELP-02     | Phase 23   | Pending |
| HELP-03     | Phase 23   | Pending |
| HELP-04     | Phase 23   | Pending |
| HELP-05     | Phase 23   | Pending |
| CASE-01     | Phase 25.1 | Pending |
| CASE-02     | Phase 25.1 | Pending |
| CASE-03     | Phase 25.1 | Pending |
| CASE-04     | Phase 25.1 | Pending |
| CASE-05     | Phase 25.1 | Pending |
| CASE-06     | Phase 25.1 | Pending |
| CASE-07     | Phase 25.1 | Pending |
| CASE-08     | Phase 25.1 | Pending |
| CASE-09     | Phase 25.1 | Pending |
| CASE-10     | Phase 25.1 | Pending |

---

## Future Requirements

- Real-time collaborative editing (Y.js) — deferred to v2
- Employee chatbot — deferred to v2
- Mobile native apps — PWA sufficient for v1
- Phase 6 remaining plans (06-01 through 06-17) — investigation templates, interviews, remediation plans not yet implemented
- Phase 25 plans (25-01 through 25-06) — case & investigation page redesign plans not yet implemented

## Out of Scope

- Video attachments — Storage costs, processing complexity
- Project management module enhancements — v1.0 already delivered Monday.com-style
- Client Success Dashboard — Internal tool, deferred to v2
- Sales Demo environment — Using seeded demo tenant
- Systematic LOC reduction on already-compliant files — address opportunistically
