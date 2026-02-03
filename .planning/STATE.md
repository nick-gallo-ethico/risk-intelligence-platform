# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Users can manage their entire compliance workflow - from anonymous report intake to investigation closure to board reporting - in one AI-assisted platform, with every task unified into a single "My Work" view.
**Current focus:** Phase 5 - AI Infrastructure

## Current Position

Phase: 5 of 11 (AI Infrastructure) - In progress
Plan: 8 of 11 in current phase
Status: Executing Wave 2
Last activity: 2026-02-03 - Completed 05-04-PLAN.md (Prompt Template Management)

Progress: [==========================================] 47% (50 of ~106 total plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 31
- Average duration: 13 min
- Total execution time: 6.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 9 | 123 min | 14 min |
| 02-demo-tenant-seed-data | 7 | 84 min | 12 min |
| 03-authentication-sso | 8 | 69 min | 9 min |
| 04-core-entities | 10 | 112 min | 11 min |

**Recent Trend:**
- Last 5 plans: 05-04 (18 min), 05-03 (12 min), 05-06 (14 min), 05-02 (8 min), 05-05 (12 min)
- Trend: Phase 5 AI Infrastructure progressing. Prompt templating complete.

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Demo tenant (Phase 2) built early to serve as continuous test bed
- Roadmap: AI infrastructure (Phase 5) before domain modules so features can leverage it
- Roadmap: 11 phases derived from 149 requirements with comprehensive depth setting
- 01-01: EventsModule is @Global() - EventEmitter2 injectable everywhere without explicit imports
- 01-01: Dot-notation event names (case.created) enable wildcard subscriptions (case.*)
- 01-01: BaseEvent requires organizationId - enforces tenant isolation at event level
- 01-01: Event emission wrapped in try-catch - request success independent of event delivery
- 01-02: AI queue gets 5 retries with exponential backoff (2s base) for rate limiting resilience
- 01-02: Email queue priority 2 (higher), Indexing queue priority 5 (lower) - time-sensitivity based
- 01-02: All job data requires organizationId for multi-tenant isolation via BaseJobData interface
- 01-02: Processors are placeholders - actual implementations in Phases 5 (AI), 7 (Email), Plan 06 (Indexing)
- 01-03: AuditModule is @Global() - AuditService injectable everywhere without explicit imports
- 01-03: Audit failures caught and logged, never thrown - audit should never crash operations
- 01-03: Natural language descriptions resolve user IDs to names for human-readable context
- 01-03: Role-based audit access: System Admin and Compliance Officer for general, Investigator for entity timelines
- 01-09: Two storage modules coexist: common/StorageModule (low-level) and modules/storage/ModuleStorageModule (high-level with Attachment tracking)
- 01-09: Per-tenant container isolation: {prefix}-org-{organizationId} for Azure, org-{organizationId} directories for local
- 01-09: Signed URLs default to 15-minute expiration
- 01-09: ModuleStorageService emits file.uploaded event for search indexing integration
- 01-07: Ajv with allErrors, coerceTypes, removeAdditional, useDefaults for flexible validation
- 01-07: Custom formats for compliance: phone, currency, ssn, employee-id
- 01-07: Form versioning creates new version on publish if submissions exist
- 01-07: Anonymous access codes generated with nanoid (12 chars)
- 01-07: Conditional rules support show/hide/require/unrequire with multiple operators
- 01-04: Instances locked to template VERSION - in-flight items complete on their version
- 01-04: Event-driven workflow - emits events for audit and notification integration
- 01-04: Version-on-publish pattern - creates new version if active instances exist
- 01-04: Stage gates placeholder - full validation deferred to domain modules
- 01-06: Per-tenant index naming: org_{organizationId}_{entityType}
- 01-06: Permission filters injected at ES query time (non-negotiable for security)
- 01-06: 500ms search timeout per CONTEXT.md requirements
- 01-06: Compliance synonyms in analyzer: harassment->bullying, fraud->deception, etc.
- 01-06: Role-based search: admin=all, investigator=assigned, employee=own
- 01-08: QueryBuilder uses dynamic Prisma delegate access via (prisma as any)[model] for flexible data source querying
- 01-08: Excel exports include formatting: bold headers, auto-filter, freeze pane, gray fill on header row
- 01-08: System templates (isSystem: true) are accessible to all organizations for compliance report sharing
- 01-08: Direct export capped at 10k rows (Excel) and 50k rows (CSV); larger reports use async queue
- 01-08: Export queue has 2 retries with 5s fixed delay for predictable behavior
- 01-05: SLA thresholds: on_track, warning (80%), breached, critical (24h+) per CONTEXT.md
- 01-05: SLA scheduler runs every 5 minutes via @Cron decorator
- 01-05: Assignment strategies use pluggable pattern - registerStrategy() for custom strategies
- 01-05: Category routingRules JSON can specify strategy type and config
- 02-01: Master seed 20260202 ensures fully reproducible demo data across runs
- 02-01: Reference date 2026-02-02 anchors all historical data calculations
- 02-01: SEED_CONFIG is single source of truth for volumes, distributions, organization structure
- 02-01: Exponential distribution with 0.3 recency bias for realistic historical date patterns
- 02-02: Children inherit parent severity/SLA defaults for consistency within category families
- 02-02: Materialized path format: /{parent-slug}/{child-slug} for human-readable hierarchy
- 02-02: Category codes use hierarchical prefix (e.g., HAR-SEX for Sexual Harassment under Harassment)
- 02-02: Seeder factory pattern returns Map<name, id> for dependent seeders to reference
- 02-06: Demo email pattern: demo-{role}@acme.local for sales reps, prospect-{uuid}@demo.local for prospects
- 02-06: Prospect accounts default to 14-day expiry (typical sales demo cycle)
- 02-06: Hourly cron job expires past-due prospect accounts
- 02-06: Sales rep identification via email pattern matching (demo-*@acme.local)
- 02-03: 52 locations (25 US, 15 EMEA, 12 APAC) with real cities and fictional addresses
- 02-03: 4-level org hierarchy: Division -> BusinessUnit -> Department -> Team
- 02-03: Named executive personas with memorable names for demo walkthroughs
- 02-03: Employee batch insert (500/batch) for 20K performance
- 02-03: Division work modes: Healthcare=onsite, Tech=remote, Retail/Energy=hybrid
- 02-03: Multi-language workforce: region-appropriate language distribution
- 02-04: Seasonality spikes: post-holiday (1.4x), Q1 reorg (1.3x), policy changes (1.35x)
- 02-04: Category-based anonymity: retaliation 70%, harassment 55%, COI 25%
- 02-04: ~5% linked incidents with 2-4 reporters for case consolidation demos
- 02-04: Edge cases at fixed indices: 100-149 long, 200-299 unicode, 500-519 boundary, 1000-1009 minimal
- 02-05: Pattern injection: repeat subjects, manager hotspots generated before case creation
- 02-05: 90% RIU-to-Case ratio: 4,500 cases from 5,000 RIUs (some consolidate, some don't create)
- 02-05: 60% substantiation rate on closed investigations per CONTEXT.md
- 02-05: 10 flagship cases with curated narratives for sales demo walkthroughs
- 03-01: DNS TXT record as primary domain verification method (industry standard)
- 03-01: One TenantSsoConfig per organization (unique constraint) for simplified management
- 03-01: TOTP secret stored encrypted, recovery codes stored as hashed array
- 03-02: Global rate limit: 100 requests/minute, configurable via THROTTLE_TTL and THROTTLE_LIMIT env vars
- 03-02: Auth endpoint tiered limits: login 5/min (strict), refresh 30/min (moderate), logout 10/min
- 03-02: Per-target throttling: login tracks by email, MFA tracks by user ID to prevent distributed attacks
- 03-02: Proxy IP extraction: X-Forwarded-For > X-Real-IP > direct IP for accurate rate limiting behind load balancers
- 03-03: DNS TXT record prefix _ethico-verify for domain verification
- 03-03: 32-byte (64 hex) cryptographically secure verification tokens
- 03-03: Rate limiting: 10 domain adds/hour, 20 verify attempts/hour
- 03-03: SYSTEM_ADMIN role required for domain modification, COMPLIANCE_OFFICER can view
- 03-03: findOrganizationByEmailDomain() pattern for SSO tenant routing
- 02-07: Copy-on-write pattern with demoUserSessionId field for session isolation
- 02-07: isBaseData boolean flag distinguishes immutable seed data from user changes
- 02-07: 24-hour undo window via DemoArchivedChange table
- 02-07: Confirmation token required for reset (CONFIRM_RESET)
- 02-07: FK-safe deletion order: children before parents
- 03-04: JIT provisioning blocks SYSTEM_ADMIN and COMPLIANCE_OFFICER roles (security guardrail)
- 03-04: SSO user lookup order: SSO ID first, then email, then JIT provision
- 03-04: Single SSO provider per user - prevents confusion about which SSO to use
- 03-04: SSO config endpoints require SYSTEM_ADMIN role
- 03-05: Use "common" endpoint for multi-tenant Azure AD (any tenant can authenticate)
- 03-05: Extract email from profile._json with fallback: email > preferred_username > upn
- 03-05: Use profile.oid as stable SSO ID (Azure object identifier)
- 03-05: passport-azure-ad deprecated but functional - MSAL migration tracked for future
- 03-05: createSsoSession() in AuthService shared by all SSO callback handlers
- 03-06: Graceful degradation: Google strategy registers but returns error if GOOGLE_CLIENT_ID/SECRET not set
- 03-06: GET callback (not POST): Google OAuth uses authorization code in query params
- 03-06: Same pattern as Azure AD: buildGoogleOptions helper for super() call
- 03-07: Use @node-saml/passport-saml v5+ (not deprecated passport-saml) for CVE-2022-39299 fix
- 03-07: Tenant slug in URL path for multi-tenant SAML routing (/saml/:tenant)
- 03-07: 60-second clock skew tolerance for IdP compatibility
- 03-07: getOrganizationBySlug() for SAML tenant verification after callback
- 03-08: otplib v13 with NobleCryptoPlugin and ScureBase32Plugin for TOTP
- 03-08: 10 recovery codes, 8 hex chars each, SHA-256 hashed for secure storage
- 03-08: verify(token, {secret}) 2-argument signature for otplib v13 API
- 03-08: Rate limits: 3/min for verify, 5-10/hour for setup operations
- 04-01: PersonType enum: EMPLOYEE, EXTERNAL_CONTACT, ANONYMOUS_PLACEHOLDER
- 04-01: PersonSource enum: HRIS_SYNC, MANUAL, INTAKE_CREATED
- 04-01: AnonymityTier enum: ANONYMOUS, CONFIDENTIAL, OPEN
- 04-01: type and source fields immutable after Person creation
- 04-01: Email unique within organization (PostgreSQL allows multiple NULLs)
- 04-01: Anonymous placeholder singleton per organization for pattern detection
- 04-04: IMMUTABLE_RIU_FIELDS const array defines fields frozen at intake
- 04-04: RiusService throws BadRequestException on immutable field update attempts
- 04-04: languageEffective computed: confirmed ?? detected ?? 'en'
- 04-04: RiuStatus expanded: QA_REJECTED, LINKED, CLOSED for full lifecycle
- 04-04: Status tracking: statusChangedAt and statusChangedById for audit
- 04-04: RIU reference number format: RIU-YYYY-NNNNN
- 04-02: Person-Employee linkage via employeeId FK with Employee relation
- 04-02: Denormalized Employee fields on Person: businessUnitId/Name, jobTitle, employmentStatus, locationId/Name
- 04-02: Manager hierarchy via PersonManager self-reference (managerId references another Person)
- 04-02: createFromEmployee recursively creates manager's Person if missing
- 04-02: syncFromEmployee updates denormalized fields without changing type/source
- 04-02: getManagerChain has maxDepth=10 to prevent infinite loops
- 04-05: Extension tables per RIU type for database-level constraints and efficient queries
- 04-05: RiuQaStatus enum: PENDING, IN_REVIEW, APPROVED, REJECTED, NEEDS_REVISION
- 04-05: DisclosureType enum: COI, GIFT, OUTSIDE_EMPLOYMENT, POLITICAL, CHARITABLE, TRAVEL
- 04-05: Decimal(12,2) for monetary disclosure values
- 04-05: QA status transitions validated via state machine pattern
- 04-05: HotlineRiuService manages QA workflow with pending queue retrieval
- 04-05: DisclosureRiuService provides threshold checking and conflict detection
- 04-05: WebFormRiuService tracks form version at submission time
- 04-07: CaseOutcome enum: SUBSTANTIATED, UNSUBSTANTIATED, INCONCLUSIVE, POLICY_VIOLATION, NO_VIOLATION
- 04-07: Classification on Case can differ from RIU - corrections tracked with notes, timestamp, user
- 04-07: Merged cases become tombstones: isMerged=true, CLOSED status, mergedIntoCaseId pointer
- 04-07: RIU associations change to MERGED_FROM type when merged
- 04-07: Pipeline stages as strings (tenant-configurable via pipelineStage field)
- 04-06: Access codes use custom nanoid alphabet (ABCDEFGHJKMNPQRSTUVWXYZ23456789) excluding confusing chars
- 04-06: Public endpoints at /api/v1/public/access require no authentication
- 04-06: Rate limits: status 10/min, messages 20/min, send 5/min
- 04-06: Outbound messages (TO reporter) marked as read when retrieved via getMessages()
- 04-06: Event case.message.received emitted on anonymous message send
- 04-03: Merge.dev unified API abstracts 50+ HRIS systems via MergeClientService
- 04-03: Topological sort ensures managers created before their reports
- 04-03: Sync is idempotent - running twice produces same result
- 04-03: Error resilient sync - collects errors without stopping, emits completion event
- 04-03: Account token per organization for multi-tenant HRIS connections
- 04-08: SegmentQueryBuilder converts JSON criteria to Prisma where clauses with nested AND/OR
- 04-08: Employee snapshots captured at CampaignAssignment time for audit trail integrity
- 04-08: Campaign statistics denormalized: totalAssignments, completedAssignments, overdueAssignments
- 04-08: Three audience modes: SEGMENT (query builder), MANUAL (explicit IDs), ALL (all active)
- 04-08: Campaign lifecycle: DRAFT -> SCHEDULED/ACTIVE -> PAUSED -> COMPLETED/CANCELLED
- 04-09: Evidentiary labels (REPORTER, SUBJECT, WITNESS) use status field per CONTEXT.md
- 04-09: Role labels (ASSIGNED_INVESTIGATOR, LEGAL_COUNSEL) use validity periods (startedAt, endedAt)
- 04-09: PersonPersonAssociation normalizes symmetric relationships (personAId < personBId)
- 04-09: All association tables have RLS policies for tenant isolation
- 04-09: Evidentiary associations are permanent records - never "end", only status changes
- 04-10: Nested ES type for associations.persons enables complex boolean queries (A as SUBJECT AND B as WITNESS)
- 04-10: Flattened arrays (personIds, subjectPersonIds) duplicate data for efficient faceting
- 04-10: History badge uses Prisma count query on PersonRiuAssociation (not ES)
- 04-10: Event-driven re-indexing via OnEvent handlers keeps ES in sync
- 05-01: claude-sonnet-4-5 as default model for good balance of speed/quality
- 05-01: AI features disabled gracefully when ANTHROPIC_API_KEY not set (warn, isConfigured()=false)
- 05-01: organizationId passed via CreateChatDto - callers enforce tenant isolation
- 05-01: Streaming via async generators with AbortController support
- 05-05: Conversations scoped to organization + user + optional entity (case, investigation)
- 05-05: AiConversationStatus enum: ACTIVE, PAUSED, ARCHIVED for lifecycle management
- 05-05: Token counts tracked at both message and conversation level for cost monitoring
- 05-05: getOrCreate pattern: Return existing active or create new conversation
- 05-05: Search uses Prisma contains with case-insensitive mode (not ES for conversation data)
- 05-02: AIProvider interface uses async iterables for streaming (not callbacks)
- 05-02: Provider registry resolves by name string for runtime configuration
- 05-02: tryGetProvider() returns null for graceful feature degradation
- 05-06: Context hierarchy: platform -> org -> team -> user -> entity
- 05-06: Cache TTLs by level: platform 1hr, org/team/user 5min, entity 1min
- 05-06: AiContextFile model for CLAUDE.md-like context files at org/team/user levels
- 05-06: Entity-specific context loaders for case, investigation, campaign
- 05-06: System prompt built from assembled context with agent-type instructions
- 05-03: Redis sorted sets for sliding window rate limiting (RPM/TPM)
- 05-03: Per-organization rate limit configuration with 1-minute cache
- 05-03: 25-hour daily counter expiry for timezone edge cases
- 05-03: AiUsage model for billing analytics with feature-type breakdown
- 05-04: Templates loaded from filesystem, database overrides for organizations
- 05-04: Register all templates as Handlebars partials for composition
- 05-04: Versioned templates with isActive flag for A/B testing and rollback
- 05-04: Handlebars helpers: eq, neq, gt, lt, and, or, json, formatDate, etc.

### Pending Todos

None yet.

### Blockers/Concerns

- Q1 deadline pressure may require scope adjustment - monitor velocity after Phase 1
- Anthropic BAA for healthcare needs verification before Phase 5 AI integration
- Existing codebase (~15%) needs integration verification during Phase 1

## Session Continuity

Last session: 2026-02-03T19:46:31Z
Stopped at: Completed 05-04-PLAN.md (Prompt Template Management)
Resume file: None
