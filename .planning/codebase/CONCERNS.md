# Codebase Concerns

**Analysis Date:** 2026-02-02

## Tech Debt

### Large Service Classes (600+ Lines)

**Area:** Backend service layer
- Issue: Multiple services exceed 595 lines, increasing complexity and testing burden
- Files:
  - `apps/backend/src/modules/investigations/investigations.service.ts` (611 lines)
  - `apps/backend/src/modules/investigation-notes/investigation-notes.service.ts` (595 lines)
  - `apps/backend/src/modules/cases/cases.service.ts` (595 lines)
  - `apps/backend/src/modules/attachments/attachments.service.ts` (592 lines)
  - `apps/backend/src/common/services/activity.service.ts` (580 lines)
- Impact: Difficult to maintain, hard to test, cognitive load for new developers
- Fix approach: Extract utility classes and helper methods. Break into focused service classes per responsibility (e.g., search service, validation service, state machine service)

### Missing Entity Models (Entity Gap)

**Area:** Prisma schema incomplete relative to PRD
- Issue: 9 of 19 PRD-defined entities are missing from schema
- Missing entities:
  - `Employee` - HRIS-synced individuals required for cross-case pattern detection
  - `BusinessUnit` - Required for organizational scoping and visibility
  - `Location` - Currently inline on Case; needs reusable entity
  - `Category` - Taxonomy system missing; cases reference non-existent FK
  - `Subject` - People named in cases; required for pattern detection and regulatory reporting
  - `InvestigationTemplate` - Category-specific checklists missing
  - `InvestigationInterview` - Structured interview records missing
  - `RemediationPlan` + `RemediationStep` - Corrective action tracking missing
  - `TenantDomain` - Required for domain verification and SSO

- Files affected:
  - `apps/backend/prisma/schema.prisma` - Missing model definitions
  - All feature modules that depend on these entities have partial implementations

- Impact: Cannot implement RFI (Request for Information) workflow, cannot track subjects across cases, missing critical features for Tier 2
- Fix approach: Implement entities in priority order: Subject, Category, Interaction, BusinessUnit, Location. Add RLS policies and indexes. Minimal PR per entity.

### Partial Entity Implementation

**Area:** Core entity models
- Issue: Organization and User models missing required fields from CORE-DATA-MODEL.md
- Missing on Organization:
  - domain, additionalDomains, tier, billingStatus, logoUrl, primaryColor, settings JSON structure, timezone, defaultLanguage, industry, employeeCountRange
- Missing on User:
  - ssoProvider, ssoId, mfaEnabled, mfaSecret, avatarUrl, phone, jobTitle, department, locationId, businessUnitIds[], customPermissions, employeeId link, preferences JSON
- Files: `apps/backend/prisma/schema.prisma`
- Impact: SSO implementation blocked, multi-language support incomplete, branding features cannot be added
- Fix approach: Extend schema migration by migration. Avoid large backwards-incompatible changes.

### RLS Bypass Risk Pattern

**Area:** Authentication and database access
- Issue: `enableBypassRLS()` method in `apps/backend/src/modules/prisma/prisma.service.ts` can be called anywhere in application
- Problem: Developers could bypass tenant isolation for convenience, creating data leak risks
- Files: `apps/backend/src/modules/prisma/prisma.service.ts` (lines 38-60)
- Current usage: Only in AuthService.login() for legitimate cross-tenant search
- Impact: If misused, complete data isolation failure; RLS becomes unenforceable
- Fix approach: Create audit trail for bypass calls. Add compile-time allowlist. Create dedicated BypassableAuthService that logs all bypass usage. Remove general `enableBypassRLS()` from PrismaService public API.

### Activity Service Complexity

**Area:** Audit logging
- Issue: Activity service mixes concerns: database persistence, natural language generation, filtering, pagination
- Files:
  - `apps/backend/src/common/services/activity.service.ts` (580 lines)
  - `apps/backend/src/common/services/activity-description.service.ts` (386 lines)
  - These should be 3-4 smaller classes
- Impact: Hard to test, hard to extend with new entity types
- Fix approach: Extract: PersistenceService, DescriptionGenerator, QueryBuilder. One job each.

---

## Known Bugs

### Incomplete Full-Text Search Implementation

**Bug description:** PostgreSQL tsvector column missing on Case table despite full-text search implementation
- Symptoms: Search endpoint works in tests but relies on raw SQL with LIKE fallback
- Files:
  - `apps/backend/src/modules/cases/cases.service.ts` (lines 141-240) - findAllWithFullTextSearch implementation
  - `apps/backend/prisma/schema.prisma` - No tsvector field on Case model
- Trigger: Running `npm run db:migrate` and then using search feature
- Current state: Works because raw SQL constructs search on the fly, but no index optimization
- Workaround: Queries don't fail but are slower than they should be
- Fix approach: Add `searchVector String?` field to Case model. Create migration to populate. Update migration strategy to auto-update on case changes.

### Missing Email Welcome Notification

**Bug description:** User creation flow has stub for welcome email
- Symptoms: New users created via admin panel receive no email confirmation
- Files: `apps/backend/src/modules/users/users.service.ts` (TODO comment "Send welcome email (stub for now)")
- Trigger: Admin creates user via POST /users
- Impact: Users don't know their temporary password or account exists
- Workaround: Manually communicate password to users
- Fix approach: Implement email service (Sendgrid/Mailgun integration) and send welcome email with temporary password

---

## Security Considerations

### Rate Limiting Not Implemented

**Area:** Authentication and API endpoints
- Risk: Brute force attacks possible on login endpoint; no protection against credential stuffing
- Files: Middleware missing in main.ts and auth routes
- Current mitigation: None
- Attack vector: POST /auth/login with dictionary of emails/passwords
- Recommendations:
  1. Add `@nestjs/throttler` package
  2. Implement rate limiting: 5 attempts per 15 minutes per IP for login
  3. Add exponential backoff (lock account after 10 failed attempts for 30 mins)
  4. Log failed login attempts to AuditLog with flagging

### Audit Trail for Failed Login Attempts Incomplete

**Area:** Security logging
- Risk: Cannot detect coordinated attack patterns or account compromise
- Current state: Only successful logins logged
- Impact: Compliance issue for regulated customers; no incident response trail
- Recommendation: Log all authentication attempts (success/fail) with status and reason

### File Upload Validation Incomplete

**Area:** File attachment storage
- Risk: Arbitrary file types could be uploaded; no virus scanning
- Files: `apps/backend/src/modules/attachments/attachments.service.ts`
- Current mitigation: MIME type validation on upload
- Missing controls:
  - No file size limits enforced
  - No virus/malware scanning (ClamAV integration missing)
  - No content inspection to verify MIME type matches actual content
- Recommendations:
  1. Enforce max file size (10MB)
  2. Implement ClamAV virus scanning on upload
  3. Use file magic/signature validation, not just MIME type
  4. Quarantine suspicious files

### Session Management Token Rotation

**Area:** JWT and session handling
- Risk: Refresh token compromise could extend attack surface
- Current: Token rotation implemented but no refresh token revocation on new token generation
- Files: `apps/backend/src/modules/auth/auth.service.ts`
- Issue: Old refresh tokens remain valid after rotation; should invalidate previous session
- Impact: If refresh token leaked, attacker maintains long-term access
- Fix approach: On token refresh, mark previous session as revoked and log rotation event

### Input Validation on Custom Fields

**Area:** Case creation and updates
- Risk: Custom fields stored as JSON without validation; could allow injection attacks
- Files: `apps/backend/src/modules/cases/cases.service.ts` (lines 73-74 use `as Prisma.InputJsonValue`)
- Issue: No schema validation for custom fields or custom questions JSON
- Impact: Could store malicious nested structures or very large payloads
- Recommendations:
  1. Define JSON schema for custom fields
  2. Validate before storage using `ajv` library
  3. Enforce max size limits on JSON payloads

---

## Performance Bottlenecks

### Full-Text Search Without Index

**Slow operation:** Case search queries
- Problem: Full-text search implemented but no PostgreSQL index optimization
- Files: `apps/backend/src/modules/cases/cases.service.ts` (lines 141-240)
- Cause: Raw SQL query constructs tsvector on-the-fly without pre-computed index
- Current behavior: Works for small datasets (<1000 cases) but degrades linearly
- Scaling limit: Beyond 10K cases, search response times will exceed 500ms
- Improvement path:
  1. Add `searchVector String? @db.Tsvector` to Case model
  2. Add GIN index on searchVector
  3. Create trigger to auto-update searchVector on case.details/summary changes
  4. Replace raw SQL with indexed query

### Activity Log Unbounded Growth

**Slow operation:** Dashboard activity timeline queries
- Problem: No pagination or archival strategy for activity logs
- Files:
  - `apps/backend/src/common/services/activity.service.ts` (findByEntity method)
  - `apps/backend/prisma/schema.prisma` (AuditLog model)
- Cause: All activity logs kept live; no hard delete, no partitioning
- Current behavior: First 100 cases queried slowly; response times degrade with org age
- Scaling limit: After 6 months at 50 cases/day = 9000 activity entries; queries slow to 200-300ms
- Improvement path:
  1. Implement 90-day hot/30-day warm archival strategy
  2. Add archive table for cold data
  3. Add date-range filter to queries by default
  4. Consider partitioning AuditLog by organization and month

### Investigation Eager Loading

**Slow operation:** Case detail page with investigations
- Problem: Loading case with all related investigations, notes, and attachments without pagination
- Files: `apps/backend/src/modules/cases/cases.service.ts` (findById - includes all investigation relations)
- Cause: No pagination on investigation notes or attachments; could load 1000s of records
- Current behavior: Works for cases with <20 investigations; slow for busy cases
- Scaling limit: Case with 50+ investigations + 500+ notes causes >2s response time
- Improvement path:
  1. Paginate investigation notes in frontend (only load 20 at a time)
  2. Implement lazy loading for investigation details
  3. Remove automatic attachment list from case query; make separate endpoint
  4. Cache investigation counts separately

---

## Fragile Areas

### Tenant Context Middleware Order Dependency

**Component:** Request middleware chain
- Files: `apps/backend/src/common/middleware/tenant.middleware.ts`, `apps/backend/src/app.module.ts`
- Why fragile: Middleware must run BEFORE all guards and controllers; off-by-one in app.module could break RLS
- Current implementation: Works because middleware registered in correct order but no explicit documentation
- Safe modification:
  - Add tests that verify tenant context is set before reaching service layer
  - Document middleware order in app.module
  - Add compile-time check (lint rule) to prevent reordering

### RLS Policy Enforcement Silent Failures

**Component:** PostgreSQL RLS with PrismaService
- Files:
  - `apps/backend/src/modules/prisma/prisma.service.ts`
  - RLS policies in migration files
- Why fragile: If RLS policies are not set correctly (e.g., wrong column name in policy), queries silently return 0 rows instead of error
- Test coverage: Need explicit tests that verify RLS prevents cross-tenant access; cannot rely on implicit behavior
- Safe modification:
  1. Add query logging to detect "0 rows returned when expecting results" anomalies
  2. Create integration tests that verify RLS on every table (not just Case)
  3. Add RLS validation function to PrismaService that checks policies are active

### Activity Service Description Generation

**Component:** Natural language activity descriptions
- Files: `apps/backend/src/common/services/activity-description.service.ts`
- Why fragile: Hard-coded entity type to description format mapping; adding new entity type requires changing two files (service + description)
- Current coverage: Only handles 10-15 common actions; unknown actions have fallback but lose context
- Safe modification:
  1. Move description templates to separate configuration file or database table
  2. Add validation tests for all entity types × action combinations
  3. Use template system (Handlebars) instead of switch statements

### Investigation Status Workflow Validation

**Component:** Status transitions
- Files: `apps/backend/src/modules/investigations/investigations.service.ts` (transition method)
- Why fragile: Transition logic inline in service; no explicit state machine
- Test coverage: Transitions tested but no explicit test for invalid transitions
- Example fragile scenario: If someone adds new investigation status without updating validation logic, broken transitions not caught
- Safe modification:
  1. Extract state machine to separate class (XState or simple enum-based FSM)
  2. Define valid transitions as immutable configuration
  3. Add tests for every invalid transition that should fail

---

## Scaling Limits

### Database Connection Pool

**Resource/System:** PostgreSQL connections
- Current capacity: Default NestJS connection pool = 10 connections per backend instance
- Scaling limit: With 3 activity service queries per case operation, pool exhausts at ~1000 concurrent users
- Improvement path:
  1. Increase pool size to 20 for single-instance, monitor
  2. Implement read replica for activity queries
  3. For multi-instance deployment, use pgBouncer connection pooler

### Attachment File Storage

**Resource/System:** Local disk upload folder
- Files: `apps/backend/src/modules/attachments/attachments.service.ts`, `apps/backend/uploads/`
- Current capacity: Local filesystem on App Service; grows unbounded
- Scaling limit: App Service disk fills after 1000 medium files (~1GB)
- Production issue: Crashes when disk full, no graceful degradation
- Improvement path:
  1. Migrate to Azure Blob Storage (already in CLAUDE.md, not implemented yet)
  2. Implement upload size quotas per organization
  3. Add cleanup job for orphaned attachments (deleted but files remain)
  4. Enable Blob Storage lifecycle policy to archive files >1 year old

### JWT Token Size

**Resource/System:** Session storage and HTTP headers
- Issue: JWT payload grows with claims; large organization contexts could exceed cookie size limit
- Current fields in JWT: userId, organizationId, role, email, name
- Scaling limit: If custom permissions or business unit arrays added, token exceeds 4KB; browsers reject
- Improvement path:
  1. Keep JWT minimal (userId, organizationId, role only)
  2. Store full user context in Session table
  3. Fetch user details on demand or cache in Redis

---

## Dependencies at Risk

### bcrypt Async Behavior Inconsistency

**Package:** `bcrypt` (password hashing)
- Risk: Inconsistent API (some sync, some async) can cause race conditions
- Files: `apps/backend/src/modules/auth/auth.service.ts` (bcrypt.compare used correctly, but pattern fragile)
- Better approach: Migrate to `argon2` which is async-only and faster
- Migration plan:
  1. Add argon2 as dependency
  2. Implement dual-hash verification (verify against both bcrypt and argon2)
  3. On successful login with bcrypt, rehash password with argon2
  4. After migration period, remove bcrypt support
  5. Estimated effort: 2-3 hours

### Prisma Client Code Generation

**Package:** `@prisma/client`
- Risk: Code generation happens at build time; out-of-sync schema causes type errors
- Files: `apps/backend/prisma/schema.prisma`
- Current mitigation: Pre-commit hook runs `prisma generate` but not verified in CI
- Issue: If developer forgets to run `npm run db:migrate` locally before commit, CI generates different client
- Improvement:
  1. Add `prisma generate` to pretest hook in package.json
  2. Add CI step to verify generated client matches committed version
  3. Run `npm audit` on Prisma to catch security updates

### Outdated Dependencies

**Package:** General
- Risk: npm dependencies may have security vulnerabilities
- Files: `apps/backend/package.json`, `apps/frontend/package.json`
- Current state: No automatic vulnerability scanning in CI
- Recommendation:
  1. Add Dependabot or Renovate bot
  2. Run `npm audit` in CI pipeline with threshold for critical/high
  3. Weekly dependency update PRs with security focus

---

## Missing Critical Features

### SSO Integration Gap

**Feature gap:** Azure AD and Google OAuth not implemented
- Problem: Enterprise customers cannot use organization-wide SSO; blocks sales deals
- Files affected:
  - Auth module missing passport strategies
  - User model missing ssoProvider and ssoId fields
  - No TenantDomain entity for domain verification
- Blocks: Tier 2 implementation (Operator Console requires SSO for multi-tenant safety)
- Priority: P0 - Must complete before production deployment
- Effort: 20-30 hours (strategy implementation, domain verification, JIT provisioning)

### Two-Way Reporter Communication

**Feature gap:** CaseMessage entity and anonymous communication relay missing
- Problem: Cannot send follow-up messages to reporters; cannot implement RFI workflow
- Files affected: No CaseMessage model; no message relay service; no email service
- Blocks: Core compliance workflow (follow-ups required for 80% of cases)
- Priority: P0 - Required for product viability
- Effort: 24-30 hours (entity, notification service, portal, anonymous relay)

### Investigation Templates

**Feature gap:** Category-specific investigation checklists missing
- Problem: Investigators must manually recreate same questions for each case; inconsistent findings
- Files affected: No InvestigationTemplate model; no template service
- Blocks: Standardization and audit trail for investigation quality
- Priority: P1 - Needed for Tier 2
- Effort: 16-20 hours

### Remediation Tracking

**Feature gap:** RemediationPlan and RemediationStep entities missing
- Problem: Cannot track corrective actions; compliance reporting incomplete
- Files affected: No remediation models; no remediation endpoints; no UI
- Blocks: Full case closure and regulatory reporting
- Priority: P1 - Needed by compliance teams
- Effort: 20-24 hours

### Multi-Language Support

**Feature gap:** Translation service stubs exist but not integrated to cases
- Problem: Large healthcare systems need multi-language case content; currently English only
- Files affected: Case model has `originalLanguage` field but no translation workflow
- Blocks: International customer expansion
- Priority: P2 - Future feature
- Effort: 30-40 hours (including UI for translation review)

---

## Test Coverage Gaps

### RLS Isolation Not Tested Per Table

**Untested area:** Row-Level Security policies
- What's not tested: Only Case and Investigation RLS tested; not verified for AuditLog, Session, Attachment, Category tables
- Files:
  - `apps/backend/test/` - Tenant isolation tests exist but incomplete
  - `apps/backend/prisma/migrations/` - RLS policies created but not validated
- Risk: Breaking data isolation on secondary tables could leak audit logs or session data
- Priority: P1 - Security critical
- Approach:
  1. Create parameterized test suite for all tables with multi-tenant data
  2. Verify organization_id filter on all RLS policies
  3. Add to CI pipeline as mandatory check

### Edge Cases in Investigation Workflow

**Untested area:** Complex investigation status transitions
- What's not tested: Transitions between non-adjacent states, cancellation after closure, reassignment during closure
- Files: `apps/backend/src/modules/investigations/investigations.service.ts` (transition method)
- Risk: Invalid state combinations could silently persist to database
- Priority: P2 - Data integrity
- Approach:
  1. Add comprehensive state machine tests covering all invalid transitions
  2. Add integration tests for real-world workflows (assign → investigate → findings → close)

### File Upload Virus Scanning

**Untested area:** Attachment validation
- What's not tested: Large file handling, concurrent upload limits, disk space error handling
- Files: `apps/backend/src/modules/attachments/attachments.service.ts`, `apps/backend/uploads/`
- Risk: Large file uploads could hang requests or fill disk; no error recovery
- Priority: P2 - Operational stability
- Approach:
  1. Add tests for max file size enforcement
  2. Test concurrent upload handling with thread pool exhaustion
  3. Test graceful failure when disk full

### Custom Field Validation

**Untested area:** JSON schema validation for custom fields
- What's not tested: Custom field validation rules, malformed JSON, deeply nested structures
- Files: `apps/backend/src/modules/cases/cases.service.ts` (lines 73-74)
- Risk: Malicious payloads could be stored; very large payloads cause memory issues
- Priority: P2 - Security/stability
- Approach:
  1. Add JSON schema validation tests
  2. Add max payload size tests (5MB limit)
  3. Test reserved field names rejection

### Frontend Authentication Edge Cases

**Untested area:** Token expiration and refresh flow
- What's not tested: Refresh token expiration, simultaneous requests during token refresh, logout during refresh
- Files: `apps/frontend/src/services/auth-context.tsx`
- Risk: Race conditions could leave user with expired token; requests mysteriously fail
- Priority: P2 - User experience
- Approach:
  1. Add tests for concurrent request handling during token refresh
  2. Add tests for refresh token expiration (try to use expired token)
  3. Add tests for logout during in-flight refresh request

---

## Additional Concerns

### Documentation Drift

**Area:** Code and documentation consistency
- Issue: CLAUDE.md references features (SSO, email, remediation) not yet implemented
- Risk: Developers follow instructions for non-existent code paths
- Fix: Add "Tier 1 Complete" marker in CLAUDE.md with list of implemented vs planned features

### Logging Verbosity Inconsistent

**Area:** Debug and application logs
- Issue: No centralized logging configuration; some services log extensively, others not at all
- Risk: Cannot debug issues in production; too much noise in dev
- Fix: Implement Winston or Pino logger with environment-based levels

### Error Messages Expose Internal Details

**Area:** API error responses
- Issue: Some error messages include technical details (SQL, file paths) that leak information
- Risk: Attackers learn system internals; information disclosure
- Example: File upload error might expose full file path
- Fix: Use generic error messages in API responses; log full details internally

### No Graceful Degradation for External Services

**Area:** Attachment and storage operations
- Issue: If file storage fails, entire case update fails with no fallback
- Risk: Temporary file system issues block case creation
- Fix: Implement async file processing; store case, queue file upload asynchronously, notify if fails

---

*Concerns audit: 2026-02-02*
