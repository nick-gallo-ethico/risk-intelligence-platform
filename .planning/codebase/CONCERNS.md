# Codebase Concerns

**Analysis Date:** 2026-01-30

## Tech Debt

**Email Notification System (Stubbed):**
- Issue: Welcome email functionality is stubbed with TODO comment
- Files: `apps/backend/src/modules/users/users.service.ts:99`
- Impact: Users are created but not notified via email; no onboarding communication sent
- Fix approach: Implement email service module (integration with SendGrid or Azure Email Service), add email templates for welcome and password reset, queue async email jobs to prevent blocking request

**Add Note Modal Implementation (Frontend Placeholder):**
- Issue: Add note functionality in case activity timeline has placeholder implementation
- Files: `apps/frontend/src/components/cases/case-activity-timeline.tsx:108`
- Impact: Users cannot add notes directly from activity timeline; feature is incomplete
- Fix approach: Complete modal component, wire to investigation notes API endpoint (`POST /api/v1/investigations/:id/notes`), add form validation and error handling

**Entity Fields Pending Department/Business Unit Relations:**
- Issue: Multiple service files have comments indicating departmentId and businessUnitId fields will be added later
- Files: `apps/backend/src/modules/users/users.service.ts:84,401` | `apps/backend/src/modules/cases/cases.service.ts` (multiple locations)
- Impact: User management and case filtering by organizational unit incomplete; organizational hierarchy not enforced
- Fix approach: Create Department and BusinessUnit entities, add relationships, update User and Case schemas, add migration, implement filtering by organizational unit in queries

---

## Known Bugs

**Activity Fallback on Fetch Failure:**
- Symptoms: When activity list fails to load, frontend creates synthetic fallback activity entry
- Files: `apps/frontend/src/components/cases/case-activity-timeline.tsx:45-62`
- Trigger: Any API error when fetching activities for a case; user sees "Failed to load activities" toast but timeline still displays
- Workaround: The fallback activity shows only case creation; user can refresh page to retry API call
- Root cause: Defensive programming that masks underlying API failure rather than surfacing it clearly
- Recommendation: Remove fallback synthetic activity; show empty state with retry button instead; investigate why activity endpoint fails

**Search Vector Not Auto-Populated:**
- Symptoms: Full-text search on cases may return incomplete results or fail silently
- Files: `apps/backend/prisma/schema.prisma:286` | `apps/backend/src/modules/cases/cases.service.ts:228-255`
- Trigger: New cases created or updated; search_vector tsvector field not maintained automatically
- Root cause: Schema comment indicates auto-population by database trigger, but trigger not found in migrations
- Impact: Search feature degraded; some recent cases unfindable by keyword
- Fix approach: Verify trigger exists in PostgreSQL; if missing, create trigger on Case insert/update to populate search_vector from details, summary, reference_number fields

---

## Security Considerations

**RLS Bypass Mechanism (Medium Risk):**
- Risk: PrismaService has `withBypassRLS()` method that disables Row-Level Security for cross-tenant operations
- Files: `apps/backend/src/modules/prisma/prisma.service.ts:53-60` | `apps/backend/src/modules/auth/auth.service.ts:44`
- Current mitigation: Used only in AuthService for login (legitimate); has try-finally to ensure re-enable; no other service uses it currently
- Recommendations:
  - Document all uses of `withBypassRLS()` in code comments
  - Implement audit logging when bypass is used
  - Add unit tests verifying RLS is re-enabled even on exceptions
  - Consider alternative: separate read-only query for login without bypassing RLS

**Tenant Context Isolation in Middleware (Medium Risk):**
- Risk: TenantMiddleware sets PostgreSQL session variable, but doesn't verify token is valid before setting context
- Files: `apps/backend/src/common/middleware/tenant.middleware.ts:78-81`
- Current mitigation: Exceptions during token verification are silently caught; routes/guards validate JWT later
- Scenarios where this could fail:
  - Middleware executes successfully and sets invalid organization context
  - Invalid token skips middleware but reaches unprotected route
  - Timing: RLS context set before guard validates JWT
- Recommendations:
  - Add logging when token verification fails
  - Consider moving RLS context-setting to AuthGuard (after validation)
  - Test tenant context isolation with invalid/modified JWT tokens

**Raw SQL Queries in Full-Text Search (Medium Risk):**
- Risk: `findAllWithFullTextSearch()` builds SQL with parameterized queries, but manually constructs WHERE clause
- Files: `apps/backend/src/modules/cases/cases.service.ts:141-256`
- Current mitigation: Uses parameterized queries ($1, $2, etc.); special characters stripped from search terms; organizationId always first condition
- Potential issues:
  - Manual condition building could introduce logic errors
  - Enum filter values passed as parameters but not validated against Prisma enums
  - `$queryRawUnsafe` used (should be `$queryRaw` with template literals for compile-time safety)
- Recommendations:
  - Replace `$queryRawUnsafe` with `$queryRaw` and template literals
  - Validate enum filter values against known enum values
  - Add integration tests for edge cases (special characters, injection attempts)

**Reporter PII Fields Not Encrypted:**
- Risk: Reporter name, email, phone stored in plain text in database
- Files: `apps/backend/prisma/schema.prisma:213-215` (comments indicate Encrypted but not implemented)
- Impact: Data breach could expose PII of anonymous reporters; GDPR/CCPA violation risk
- Recommendations:
  - Implement field-level encryption using pgcrypto or application-level encryption
  - Add migration to encrypt existing data
  - Create accessor methods in CasesService to decrypt transparently
  - Log access to encrypted fields

**Anonymous Access Code Not Rate-Limited:**
- Risk: `anonymousAccessCode` field exists for anonymous reporter follow-up, but no rate limiting on endpoint that uses it
- Files: `apps/backend/prisma/schema.prisma:217` | No implementation yet
- Impact: Brute-force attack possible to guess anonymous access codes
- Recommendations:
  - Implement rate limiting by IP address for anonymous access
  - Add failed attempt logging and alerting
  - Use cryptographically secure random generation for codes

---

## Performance Bottlenecks

**Full-Text Search Without Index Hints:**
- Problem: `findAllWithFullTextSearch()` queries without specifying GIN index usage
- Files: `apps/backend/src/modules/cases/cases.service.ts:220`
- Cause: PostgreSQL may choose suboptimal execution plan; search_vector GIN index not explicitly hinted
- Current impact: Large case tables (>100k rows) will have slow queries
- Improvement path:
  - Add index hint: `USING GIN` after search_vector column reference
  - Benchmark before/after with EXPLAIN ANALYZE
  - Consider adding `search_rank` as secondary sort (already done, good)

**N+1 Query Risk in Case Details:**
- Problem: Including related users (createdBy, updatedBy, intakeOperator) on case loads extra queries
- Files: `apps/backend/src/modules/cases/cases.service.ts:268-278`
- Current impact: Listing cases with findMany includes relations; select limits to id, firstName, lastName, email (efficient)
- Risk: If more relations added (e.g., investigations), query cost grows linearly
- Improvement path:
  - Continue selective use of `include` with `select` on relations
  - Add service-level caching for frequently accessed users
  - Profile with slow query logs

**Activity Log Query Performance:**
- Problem: No indexes on frequently queried fields in AuditLog
- Files: `apps/backend/prisma/schema.prisma:340-343`
- Existing indexes: [organizationId, createdAt], [organizationId, entityType, entityId, createdAt], [organizationId, actorUserId, createdAt], [organizationId, actionCategory, createdAt]
- Current indexes look adequate; watch for:
  - Queries filtering by multiple fields not in composite indexes
  - Pagination beyond 1000 pages (offset performance degrades)
- Improvement path:
  - Monitor slow queries in production
  - Consider materialized views for dashboard queries
  - Add cursor-based pagination for large datasets

---

## Fragile Areas

**Investigation Status Workflow:**
- Files: `apps/backend/src/modules/investigations/investigations.service.ts:47-76`
- Why fragile: validTransitions map is hardcoded; if new status added, map must be manually updated
- Safe modification:
  - Add test for all status transitions
  - Use `as const` for status values
  - Test that adding new status without adding transition rule breaks test
- Test coverage: Likely has basic coverage but may lack exhaustive transition testing

**Case Reference Number Generation (Race Condition):**
- Files: `apps/backend/src/modules/cases/cases.service.ts:31` (calls `generateReferenceNumber()`)
- Issue: Reference numbers generated by querying max value and incrementing; no database-level uniqueness constraint shown in retrieved code
- Why fragile: Race condition possible if two requests generate simultaneously; unique constraint exists in schema but auto-increment logic is application-level
- Safe modification:
  - Use PostgreSQL sequence or stored procedure for generation
  - Test concurrent case creation
- Test coverage: Likely missing concurrent creation tests

**Prisma Schema with Unsupported tsvector Type:**
- Files: `apps/backend/prisma/schema.prisma:286`
- Why fragile: `Unsupported("tsvector")` not handled by Prisma client; any attempt to access searchVector from ORM will fail
- Impact: Full-text search works only via raw SQL; cannot use searchVector in Prisma queries
- Safe modification:
  - Keep searchVector raw-SQL-only (current approach)
  - Document that searchVector is database-managed only
  - Add comment explaining why Unsupported is used

**Exception Handling in Middleware:**
- Files: `apps/backend/src/common/middleware/tenant.middleware.ts:78-81`
- Why fragile: Silently catches and ignores all exceptions during token verification
- Safe modification:
  - Log caught exceptions with debug level
  - Add metrics/observability for how many tokens fail verification
  - Test that invalid tokens don't cause crashes downstream

---

## Scaling Limits

**PostgreSQL Row-Level Security Scalability:**
- Current capacity: RLS works efficiently up to millions of rows per organization
- Limit: Each query adds `WHERE organization_id = $1` overhead; with thousands of concurrent users, connection pool saturation risk
- Impact: Performance degrades linearly as organizations grow
- Scaling path:
  - Implement connection pooling (PgBouncer)
  - Use read replicas for analytics queries
  - Consider query result caching (Redis)
  - Monitor connection pool usage

**Activity Log Table Growth:**
- Current capacity: Append-only table will grow indefinitely
- Limit: After ~100M rows, queries slow significantly; disk space becomes issue
- Impact: Audit trail queries slow down; backup times increase
- Scaling path:
  - Implement table partitioning by organization_id and createdAt
  - Archive old logs (>1 year) to cold storage
  - Create materialized views for common dashboard queries
  - Monitor table size weekly

**Search Vector Index Growth:**
- Current capacity: GIN index efficient for ~1M documents per organization
- Limit: As case count grows, index size and insert performance degrade
- Impact: Adding new cases becomes slower
- Scaling path:
  - Use partial GIN index (only index active cases)
  - Consider denormalized search_summary field instead of full tsvector
  - Implement Elasticsearch for full-text search at scale

---

## Dependencies at Risk

**bcrypt Hashing (Medium Risk):**
- Risk: `bcrypt` is CPU-intensive; 12 salt rounds is standard but may cause 500ms+ delays during peak load
- Current impact: User creation/password change endpoints can timeout under load
- Files: `apps/backend/src/modules/users/users.service.ts:29,71` | `apps/backend/src/modules/auth/auth.service.ts:68`
- Mitigation: Consider async bcrypt or background job for password hashing
- Alternative: Argon2 library (more resistant to GPU attacks; still slower)

**jsonwebtoken Library (Low Risk):**
- Risk: Older JWT library; security advisories possible
- Current status: Used for token generation and verification
- Files: `apps/backend/src/common/middleware/tenant.middleware.ts:4` | `apps/backend/src/modules/auth/auth.service.ts`
- Migration path: NestJS already provides JwtModule (uses jsonwebtoken under hood); no action needed unless advisories appear

**Prisma ORM (Low Risk):**
- Risk: Prisma client generated code can be large and may have performance implications
- Current status: No known issues; widely used in production
- Mitigation: Monitor Prisma updates; test major version upgrades in staging

---

## Missing Critical Features

**Email Notification System:**
- Problem: No email service implemented
- Blocks: User onboarding, password reset, case status notifications, investigation assignments
- Priority: HIGH - Core workflow depends on notifications
- See also: Tech Debt section - Email Notification System

**Case Status Derived vs. Admin Override:**
- Problem: Schema comment indicates status is derived from investigations but admin-overridable; no logic found
- Blocks: Cannot close case independently of investigations; status management unclear
- Files: CLAUDE.md mentions this design decision
- Needed: Clarify status transition rules and implement override logic

**Encryption for Sensitive Fields:**
- Problem: Reporter PII (name, email, phone) stored plain text
- Blocks: Compliance features; GDPR compliance
- Priority: CRITICAL - Data protection requirement
- See also: Security Considerations section - Reporter PII Fields Not Encrypted

---

## Test Coverage Gaps

**Tenant Isolation E2E Tests (Medium Priority):**
- What's not tested: Cross-tenant data access attempts; verifying RLS prevents data leakage
- Files: `apps/frontend/e2e/tests/tenant-isolation.spec.ts` exists but scope unknown
- Risk: Core security feature untested leads to silent data leaks
- Recommendation:
  - Ensure tests create data in Organization A, attempt access from Organization B token
  - Test all endpoints (list, get, update, delete)
  - Test nested relationships (investigation under case from different org)

**Activity Log Entries Verification:**
- What's not tested: Whether all mutations create corresponding activity entries
- Files: `apps/backend/src/common/services/activity.service.spec.ts` (unit test exists; integration gaps likely)
- Risk: Audit trail incomplete for compliance; untracked changes
- Recommendation:
  - Add tests for every mutation endpoint
  - Verify activity entry created after each operation
  - Test activity description accuracy

**Error Handling in RLS Bypass:**
- What's not tested: Behavior when RLS bypass fails to re-enable
- Files: `apps/backend/src/modules/prisma/prisma.service.ts:53-60`
- Risk: Silent security failure; subsequent requests execute without RLS protection
- Recommendation:
  - Add test that verifies RLS is re-enabled even after callback exception
  - Add test that confirms bypass actually works (query results differ with/without bypass)

**Full-Text Search Edge Cases:**
- What's not tested: SQL injection attempts; special character handling; empty search terms
- Files: `apps/backend/src/modules/cases/cases.service.ts:141-256`
- Risk: Search endpoint vulnerable to injection; crashes on edge cases
- Recommendation:
  - Add parameterized query test
  - Test search with SQL keywords (';--', 'DROP TABLE', etc.)
  - Test with unicode, emoji, very long strings

**Frontend API Error Handling:**
- What's not tested: What happens when API returns 401, 403, 500; token refresh flow
- Files: `apps/frontend/src/lib/api.ts` (not fully reviewed)
- Risk: User experience breaks silently; auth state becomes invalid
- Recommendation:
  - Test 401 response triggers logout
  - Test token refresh flow
  - Test 403 shows appropriate error message

---

## Data Model Concerns

**Case Can Have ParentCase (Self-Reference):**
- Issue: Recursive relationship for case splitting implemented, but no validation preventing circular references
- Files: `apps/backend/prisma/schema.prisma:262,281-282`
- Impact: Data corruption possible; query performance degraded with circular references
- Fix approach: Add CHECK constraint in migration: `parentCaseId != id`; implement validation in service

**Investigation Has Manual History vs. Activity Log:**
- Issue: Assignment history stored as JSON in `assignmentHistory` field; same data also in AuditLog
- Files: `apps/backend/src/modules/investigations/investigations.service.ts:28-33` (interface)
- Impact: Duplication; risk of inconsistency; two sources of truth
- Fix approach: Consolidate - use AuditLog as source of truth; remove assignmentHistory JSON field; query audit log for history

---

## Code Quality Observations

**Console.log in Production Code:**
- Files: `apps/frontend/src/components/cases/case-activity-timeline.tsx:109`
- Issue: TODO placeholder logs to console in production
- Fix: Remove console.log or replace with logger service

**Comment on Unimplemented Feature:**
- Files: `apps/backend/src/modules/users/users.service.ts:99-100` (TODO comment with logger.debug)
- Issue: Welcome email not implemented; logger statement is debugging aid
- Fix: Replace with actual email service call

---

## Monitoring & Observability Gaps

**Missing Structured Logging:**
- Issue: Most services use NestJS Logger with unstructured log messages
- Impact: Difficult to parse logs; can't filter by correlation ID
- Recommendation: Implement structured logging (Winston/Pino) with request ID propagation

**No Request Tracing:**
- Issue: HTTP requests don't have correlation IDs propagated through services
- Impact: Can't trace request across services; debugging distributed issues difficult
- Files: Error filter has support for `requestId` but middleware doesn't set it
- Recommendation: Add middleware to generate/propagate X-Request-ID header

**Missing Database Query Monitoring:**
- Issue: No slow query logging configured; Prisma doesn't expose query metrics
- Impact: Performance regressions not detected; N+1 queries silent
- Recommendation: Enable Prisma debug logging in development; use pg_stat_statements in production

**No Error Rate Monitoring:**
- Issue: No mention of error tracking (Sentry, DataDog)
- Impact: Production errors go unnoticed until users report
- Recommendation: Integrate Sentry for error tracking and performance monitoring

---

## Deployment & Infrastructure Concerns

**No Environment Variable Validation:**
- Issue: Configuration loads but doesn't validate required env vars at startup
- Files: `apps/backend/src/config/configuration.ts` (not fully reviewed)
- Impact: Missing credentials discovered at runtime during request
- Recommendation: Validate all required env vars in app bootstrap

**Database Migration Strategy Unclear:**
- Issue: Prisma migrations exist but deployment strategy not documented
- Impact: Blue-green deployment risky; migration rollback unclear
- Recommendation: Document migration approach; ensure migrations are idempotent; test rollback procedure

---

## Documentation Gaps

**No Architectural Decision Record (ADR) for Multi-Tenancy:**
- Issue: TenantMiddleware, RLS bypass pattern, tenant context setting scattered across files
- Impact: New developers may not understand tenant isolation strategy
- Files: Implemented in middleware, service, schema - hard to see holistically
- Recommendation: Create ADR documenting multi-tenancy approach, why RLS bypass needed, when allowed

**No API Documentation:**
- Issue: No OpenAPI/Swagger documentation generated
- Impact: Frontend developers must read controller code to understand API
- Recommendation: Add @nestjs/swagger decorators to controllers; generate OpenAPI spec

---

## Summary Table

| Category | Count | Severity | Notes |
|----------|-------|----------|-------|
| Tech Debt Items | 3 | MEDIUM | Email system, modal stub, pending relations |
| Known Bugs | 2 | MEDIUM | Activity fallback, search vector |
| Security Risks | 4 | MEDIUM | RLS bypass, tenant context, raw SQL, PII encryption |
| Performance Bottlenecks | 3 | MEDIUM | Search indexing, N+1 queries, activity log growth |
| Fragile Components | 5 | MEDIUM | Status workflow, reference number, tsvector, middleware, RLS |
| Scaling Limits | 3 | MEDIUM | RLS, activity log, search index |
| Dependency Risks | 3 | LOW-MEDIUM | bcrypt, jwt, prisma |
| Missing Features | 3 | HIGH | Email notifications, status override, encryption |
| Test Gaps | 6 | MEDIUM | Tenant isolation, activity logs, RLS bypass, search, errors, API |

---

*Concerns audit: 2026-01-30*
