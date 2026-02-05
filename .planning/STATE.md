# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Users can manage their entire compliance workflow - from anonymous report intake to investigation closure to board reporting - in one AI-assisted platform, with every task unified into a single "My Work" view.
**Current focus:** Phase 11 - Analytics & Reporting

## Current Position

Phase: 11 of 12 (Analytics & Reporting)
Plan: 21 of 21 in current phase (11-01 through 11-12, 11-15, 11-16, 11-17, 11-18 complete)
Status: **In Progress** - Executing Phase 11 plans
Last activity: 2026-02-05 - Completed 11-18-PLAN.md (EQS Connector - work already done in 11-09)
**Next Phase:** Phase 12: Internal Operations Portal (after Phase 11)

Progress: [===============================================================----] 96% (150 of ~156 total plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 103
- Average duration: 15 min
- Total execution time: 26.37 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 9 | 123 min | 14 min |
| 02-demo-tenant-seed-data | 7 | 84 min | 12 min |
| 03-authentication-sso | 8 | 69 min | 9 min |
| 04-core-entities | 10 | 112 min | 11 min |
| 05-ai-infrastructure | 11 | 143 min | 13 min |
| 06-case-management | 11 | ~211 min | ~19 min |
| 07-notifications-email | 8 | ~112 min | ~14 min |
| 08-portals | 19 | 253 min | 13 min |
| 09-campaigns-disclosures | 17 | ~261 min | ~15 min |

**Recent Trend:**
- Last 5 plans: 11-12 (26 min), 11-15 (16 min), 11-16 (17 min), 11-10 (7 min), 11-06 (32 min)
- Trend: Phase 11 Analytics - Scheduled export delivery with cron-based processing and email delivery.

*Updated after each plan completion*

## Accumulated Context

### Roadmap Evolution

- Phase 12 added (2026-02-05): Internal Operations Portal - Support Console, Implementation Portal, Hotline Operations, Client Success Dashboard, Tech Debt items

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
- 05-09: Agents are both entity-scoped AND role-scoped per CONTEXT.md
- 05-09: Agent instances cached by context key (agent:org:user:entityType:entityId)
- 05-09: BaseAgent uses async generators for streaming chat responses
- 05-09: Three specialized agents: Investigation, Case, ComplianceManager
- 05-08: JSON response parsing uses regex extraction to handle AI explanatory text
- 05-08: Risk score confidence derived from evidence factor (lower evidence = lower confidence)
- 05-08: Translation language detection uses first 500 chars to minimize tokens
- 05-07: Skill factory pattern with dependency injection for providerRegistry, rateLimiter, promptService
- 05-07: zodToJsonSchema helper converts Zod schemas to JSON Schema for Claude tools
- 05-07: Skills check rate limits before execution and record usage after completion
- 05-10: Actions use factory pattern for Prisma dependency injection
- 05-10: Undo windows per CONTEXT.md: QUICK 30s, STANDARD 5min, SIGNIFICANT 30min, EXTENDED 24h
- 05-10: add-note action supports investigation only (CaseNote model TBD)
- 05-10: Status transitions validated via state machine pattern in canExecute
- 05-10: AiAction model tracks all AI mutations for audit and undo
- 05-11: WebSocket gateway at /ai namespace for streaming chat
- 05-11: Auth context extracted from handshake (organizationId, userId, userRole, permissions)
- 05-11: Action categories: QUICK (30s), STANDARD (5m), CRITICAL (30m), EXTERNAL (no undo)
- 05-11: REST endpoints at /api/v1/ai/* for skills, actions, conversations, agents, usage
- 06-04: ViewEntityType enum: CASES, RIUS, INVESTIGATIONS, PERSONS, CAMPAIGNS, REMEDIATION_PLANS
- 06-04: Filter validation against current enum values at create/update/apply time
- 06-04: Invalid filters returned in array instead of throwing errors on apply (graceful degradation)
- 06-04: Default view management: one default per (user, entityType) with auto-deselection
- 06-05: CustomPropertyEntityType enum: CASE, INVESTIGATION, PERSON, RIU
- 06-05: PropertyDataType enum: TEXT, NUMBER, DATE, DATETIME, SELECT, MULTI_SELECT, BOOLEAN, URL, EMAIL, PHONE
- 06-05: Key format enforced: must start with letter, alphanumeric + underscore only
- 06-05: Soft delete pattern: isActive flag instead of hard delete for existing value preservation
- 06-05: Unknown keys in validation preserved but not validated (backward compatible)
- 06-03: DAG dependency validation uses DFS cycle detection for step ordering
- 06-03: External assignees use email + name fields for non-user step assignments
- 06-03: requiresCoApproval flag enables secondary approval workflow for compliance-critical steps
- 06-03: Denormalized step counts (total, completed, overdue) on plan for query performance
- 06-01: InvestigationTemplate uses JSON sections field for flexible checklist schema
- 06-01: TemplateTier enum (OFFICIAL, TEAM, PERSONAL) controls template visibility
- 06-01: Version-on-publish pattern preserves in-flight checklists on original version
- 06-01: Events emitted for all template mutations (audit integration)
- 06-02: IntervieweeType enum: PERSON, EXTERNAL, ANONYMOUS for flexible interviewee tracking
- 06-02: Interview lifecycle: SCHEDULED -> IN_PROGRESS -> COMPLETED (or CANCELLED)
- 06-02: Template questions copied to interview at creation (copy-on-use pattern)
- 06-02: Person-linked interviews enable cross-case pattern detection
- 06-06: TemplateRequirement enum: REQUIRED, RECOMMENDED, OPTIONAL for mapping flexibility
- 06-06: CategoryTemplateMapping priority field enables multiple templates per category
- 06-06: Parent category inheritance for template recommendations when no direct mapping
- 06-06: isTemplateRequired() check validates template presence on investigation creation
- 06-09: PII detection warns but doesn't block - investigator can acknowledge and send
- 06-09: Reporter notifications don't include message content - only status check link
- 06-09: Outbound messages marked as read when reporter retrieves (not when sent)
- 06-09: Inbound messages marked as read when investigator retrieves
- 06-09: Chinese Wall pattern: Reporter contact on RIU only accessed for notification, never exposed to investigator
- 06-08: Default reminder config: pre-due [3, 1] days, overdue [3, 7] days, escalation 7 days
- 06-08: Processor in remediation module for domain co-location (not jobs module)
- 06-08: forwardRef for circular dependency between processor and notification service
- 06-08: REMEDIATION_PLAN and REMEDIATION_STEP added to AuditEntityType enum
- 06-07: Template version captured at apply time - in-flight checklists continue on original version
- 06-07: Progress percentage excludes skipped items: completedItems / (totalItems - skippedCount)
- 06-07: Required items cannot be skipped - validation enforced at service layer
- 06-07: Custom items added to sections with generated IDs, appear after template items
- 06-11: ActivityTimelineModule separate from common ActivityModule - logging vs retrieval separation
- 06-11: ENTITY_RELATIONSHIPS uses Partial<Record> for flexible related entity configuration
- 06-11: hasMore boolean pagination indicator for efficient UI pagination
- 06-10: Parallel search execution for all entity types in UnifiedSearchService
- 06-10: Custom fields use dynamic ES mapping with type conversion via getEsFieldTypeForCustomProperty()
- 06-10: Entity-specific search field weights (e.g., referenceNumber^10 for exact match priority)
- 06-10: Graceful handling when indices don't exist (returns empty results for new tenants)
- 07-01: Notification enums as const objects (not Prisma re-exports) for compilation independence
- 07-01: Default preferences per CONTEXT.md: urgent events (assignments, deadlines, mentions, approvals, interviews) get email+inApp; FYI events (status, comments, completions) get inApp only
- 07-01: REAL_TIME_CATEGORIES and DIGEST_CATEGORIES arrays define batching behavior
- 07-02: Follow PromptService pattern for email template management (file + database overrides)
- 07-02: MJML compilation happens after Handlebars rendering for dynamic content
- 07-02: EmailTemplate model stores per-org overrides with version history
- 07-02: Templates exclude sensitive info (names, allegations, findings) per CONTEXT.md
- 07-03: 5-minute cache TTL for preferences balances performance and freshness
- 07-03: Default enforced categories: ASSIGNMENT, DEADLINE per CONTEXT.md
- 07-03: Quiet hours wraparound supports overnight schedules (e.g., 22:00-06:00)
- 07-03: OOO backup delegation validates user exists, active, and different from self
- 06-12: SavedViewSelector uses shadcn/ui Popover (not Material-UI Menu) per project standards
- 06-12: Auto-apply default view disabled on CaseListPage since filters are URL-param driven
- 06-12: Filter conversion helpers (filtersToViewData/viewDataToFilters) exported for reuse
- 06-14: Template selector groups by tier (OFFICIAL, TEAM, PERSONAL) for clear organization
- 06-14: ChecklistItem always shows completion dialog for notes even when not evidence-required
- 06-14: Dependency locking prevents completing items with incomplete prerequisites
- 06-14: InvestigationDetailPage uses tabbed interface matching existing Case detail pattern
- 06-13: RIU associations displayed with PRIMARY highlighted by distinct border and star icon
- 06-13: Tab navigation synced to URL for shareable deep links
- 06-13: Case detail layout: header + collapsible sidebar + tabbed content
- 07-04: ESCALATION added to NotificationCategory for SLA breach notifications
- 07-04: All event listeners use { async: true } to prevent blocking requests
- 07-04: DigestQueue model stores pending notifications for daily batch processing
- 07-04: Pre-render email templates before queueing (per RESEARCH.md pitfall)
- 06-15: react-hotkeys-hook for cross-platform keyboard handling (mod+key for Cmd/Ctrl)
- 06-15: ShortcutsProvider at app level manages command palette and help dialog state
- 06-15: Recent items stored in localStorage for command palette persistence
- 06-15: enableOnFormTags: false by default - shortcuts disabled in form inputs
- 06-15: useListNavigation, useGlobalShortcuts, useTabNavigation patterns established
- 07-05: WebSocket gateway at /notifications namespace for real-time in-app delivery
- 07-05: Room key format org:{orgId}:user:{userId} for tenant isolation
- 07-05: JWT verification on WebSocket handshake via JwtService
- 07-05: get_recent handler for background tab polling (60s interval)
- 07-05: @OnEvent('notification.in_app.created') for event-driven delivery
- 07-06: Hourly cron checks each org's configured digest time (not per-org dynamic scheduling)
- 07-06: Smart aggregation groups by type + entityType + entityId for deduplication
- 07-06: Digest priority 3 (lower than urgent notifications which use 1-2)
- 07-06: isDigestEnabledForUser() checks any DIGEST_CATEGORIES category has email enabled
- 07-07: nodemailer via @nestjs-modules/mailer for SMTP transport with connection pooling
- 07-07: Webhook normalization pattern for multiple providers (SendGrid, SES)
- 07-07: Optional signature verification for webhooks (security without breaking dev)
- 07-07: recordPermanentFailure() logs to AuditLog with NOTIFICATION entity type
- 07-07: EmailProcessor uses forwardRef for circular dependency with DeliveryTrackerService
- 07-08: Preferences response includes enforcedCategories from org settings for UI display
- 07-08: Effective quiet hours computed from user prefs + org defaults
- 07-08: Org settings update requires SYSTEM_ADMIN role via RolesGuard
- 08-01: Use const objects for BrandingMode and ThemeMode enums (not Prisma re-exports)
- 08-01: CSS custom properties use HSL format without hsl() wrapper for Tailwind compatibility
- 08-01: 1-hour cache TTL with both branding config and CSS output caching
- 08-01: Public CSS endpoint at /api/v1/public/branding/:tenantSlug/css requires no auth
- 08-01: FULL_WHITE_LABEL mode requires colorPalette to be configured
- 08-02: Four directive stages: OPENING, INTAKE, CATEGORY_SPECIFIC, CLOSING matching call flow
- 08-02: CallDirectives grouped structure returns all directives for a call in one query
- 08-02: Category relation for category-specific directives via FK, nullable for other stages
- 08-02: Soft delete pattern (isActive=false) preserves directive history
- 08-02: isReadAloud flag indicates verbatim reading requirement
- 08-03: prisma.withBypassRLS() for all operator phone lookup operations (cross-tenant access)
- 08-03: All phone numbers normalized to E.164 format (+1XXXXXXXXXX) for consistent storage
- 08-03: QA mode evaluation order: category overrides -> keyword triggers -> default mode
- 08-03: Math.random() for SAMPLE mode QA selection (statistically valid percentage-based)
- 08-04: User-Employee link via email lookup (Employee model has no userId FK)
- 08-04: Task IDs encode source type for routing: {sourceType}-{sourceId}
- 08-04: NOT clause for pending tasks due check (includes null due dates)
- 08-04: PortalsModule aggregates EmployeePortalModule and OperatorPortalModule
- 08-05: Cache-based draft and temp attachment storage (CacheModule, Redis in production)
- 08-05: System user (system@ethico.com) per org for public submission createdById
- 08-05: Category form schema via moduleConfig.formSchemaId JSON field
- 08-05: Separate EthicsAccessController for access-code-scoped endpoints (/public/access/:code)
- 08-05: Rate limits: config/categories 30/min, reports 5/min, attachments 10/min, messages 5/min
- 08-06: Person ID lookup via User email match (User->Person link via email)
- 08-06: Transitive manager check walks hierarchy with maxDepth=10
- 08-06: Proxy submissions store metadata in customFields JSON (proxySubmitterId, reason)
- 08-06: Compliance score: attestations 60%, disclosures 40% weighted average
- 08-06: Access code generated for employee (not manager) on proxy reports
- 08-07: RiuTypeFromCall (REPORT, REQUEST_FOR_INFO, WRONG_NUMBER) all map to HOTLINE_REPORT RiuType
- 08-07: TRIAGE_LEAD role used for QA reviewers (no QA_REVIEWER in UserRole enum)
- 08-07: Follow-up call notes stored as Interaction records (not InvestigationNote)
- 08-07: qaClaimedAt returns null (schema lacks field; use qaReviewerId presence)
- 08-07: QA queue sorts by severity DESC (HIGH first), then createdAt ASC (oldest first)
- 08-08: @ducanh2912/next-pwa with Workbox for service worker generation (maintained App Router fork)
- 08-08: Device-specific XOR encryption for IndexedDB drafts (casual protection, true security via server)
- 08-08: react-i18next with namespace-based lazy loading for efficient translation delivery
- 08-08: 8 supported languages including RTL (Arabic, Hebrew) with document.dir updates
- 08-08: Auto-save debounce at 1 second, draft expiration at 7 days
- 08-09: @tanstack/react-query added for efficient data fetching with caching
- 08-09: useClientProfile hook uses AbortController to cancel stale phone lookups
- 08-09: Split-screen layout: 60% left (intake form), 40% right (context tabs)
- 08-09: DirectivesPanel groups by stage (opening, intake, category-specific, closing)
- 08-09: Read-aloud directives styled distinctly with blue background and speaker icon
- 08-15: Notes textarea always visible in intake form per CONTEXT.md HubSpot pattern
- 08-15: AI cleanup placed below notes as non-intrusive post-call option
- 08-15: "Subject Unknown" toggle for unidentified subjects during intake
- 08-16: QA queue auto-refreshes every 30 seconds via React Query refetchInterval
- 08-16: Split-view layout: 40% list with filters, 60% detail with edit/review
- 08-16: Keyboard shortcuts (R=release, E=edit, Esc=close) for QA reviewer efficiency
- 08-16: Edit notes required when making changes (validation prevents save without notes)
- 09-07: Three targeting modes: ALL (everyone), SIMPLE (checkboxes), ADVANCED (rules)
- 09-07: includeSubordinates walks org hierarchy recursively (max 10 levels)
- 09-07: buildCriteriaDescription() generates natural language summary for UI
- 09-07: validateCriteria() checks references exist, warns on 0 matches
- 09-07: getAvailableAttributes() provides HRIS attributes for dynamic UI population
- 09-08: CampaignWaveStatus enum: PENDING, LAUNCHED, CANCELLED
- 09-08: CampaignRolloutStrategy enum: IMMEDIATE, STAGGERED, PILOT_FIRST
- 09-08: CampaignSchedulingService for scheduled launches and blackout management
- 09-08: CampaignSchedulingProcessor handles launch-campaign and launch-wave jobs
- 09-08: Wave distribution by shuffle + slice for fair randomization
- 09-08: Blackout recurrence: YEARLY, QUARTERLY, MONTHLY patterns
- 09-08: Campaign queue with 3 retries, exponential backoff (5s, 10s, 20s)
- 08-13: EmployeeContext extracted to separate file for Next.js App Router type compatibility
- 08-13: useAuthenticatedCategories hook for Employee Portal (vs public tenant API with tenantSlug)
- 08-13: Role-conditional rendering: isManager flag determines My Team tab visibility
- 08-13: Tab navigation synced with URL query params (?tab=tasks)
- 08-13: Compliance scoring UI: green >= 80%, amber >= 50%, red < 50%
- 08-13: CSV export via client-side Blob generation for team compliance reports
- 09-04: Levenshtein distance for fuzzy matching with thresholds 60/75/90/100
- 09-04: Seven conflict types: VENDOR_MATCH, APPROVAL_AUTHORITY, PRIOR_CASE_HISTORY, HRIS_MATCH, GIFT_AGGREGATE, RELATIONSHIP_PATTERN, SELF_DEALING
- 09-04: Exclusion scopes: PERMANENT, TIME_LIMITED, ONE_TIME per RS.44
- 09-04: Dismissal categories: FALSE_MATCH_DIFFERENT_ENTITY, FALSE_MATCH_NAME_COLLISION, ALREADY_REVIEWED, PRE_APPROVED_EXCEPTION, BELOW_THRESHOLD, OTHER
- 09-04: Use DISCLOSURE entity type for audit logging (no CONFLICT_ALERT in AuditEntityType)
- 09-04: Entity timeline aggregation combines disclosures, conflicts, and case subjects
- 09-03: ThresholdRule model with conditions JSON, aggregateConfig JSON, action enum
- 09-03: ThresholdAction enum: FLAG_REVIEW, CREATE_CASE, REQUIRE_APPROVAL, NOTIFY
- 09-03: ThresholdApplyMode enum: FORWARD_ONLY, RETROACTIVE, RETROACTIVE_DATE
- 09-03: json-rules-engine for rule evaluation with operator mapping (eq→equal, gte→greaterThanInclusive)
- 09-03: Rolling window aggregates support days/months/years with SUM/COUNT/AVG/MAX functions
- 09-03: ThresholdTriggerLog for audit trail of rule activations
- 09-03: Event threshold.triggered emitted for downstream case creation
- 09-17: Seven conflict types displayed: VENDOR_MATCH, APPROVAL_AUTHORITY, PRIOR_CASE_HISTORY, HRIS_MATCH, GIFT_AGGREGATE, RELATIONSHIP_PATTERN, SELF_DEALING
- 09-17: Six dismissal categories per RS.44: FALSE_MATCH_DIFFERENT_ENTITY, FALSE_MATCH_NAME_COLLISION, ALREADY_REVIEWED, PRE_APPROVED_EXCEPTION, BELOW_THRESHOLD, OTHER
- 09-17: Three exclusion scopes: PERMANENT, TIME_LIMITED, ONE_TIME
- 09-17: Mobile-first responsive design for conflict review - timeline slides in as Sheet on mobile
- 09-17: Phase 9 demo data includes 3 years of COI campaigns, gift disclosures, conflicts, exclusions, and entity timeline for "Acme Consulting LLC"
- 10-03: PolicyApprovalService delegates to WorkflowEngineService - no custom approval logic
- 10-03: PolicyWorkflowListener syncs workflow.completed/cancelled events to policy status
- 10-03: PENDING_APPROVAL status on submit, APPROVED on workflow completion, DRAFT on cancellation
- 10-05: AI translation via SkillRegistry.executeSkill('translate', ...) - reuses Phase 5 infrastructure
- 10-05: TranslationStaleListener marks previous version translations stale on new version publish
- 10-05: Translation review workflow: PENDING_REVIEW -> APPROVED/NEEDS_REVISION -> PUBLISHED
- 10-05: 13 supported languages: en, es, fr, de, zh, ja, ko, pt, it, nl, ru, ar, hi
- 10-06: PolicyCaseAssociation links policies (specific versions) to cases
- 10-06: Three link types: VIOLATION, REFERENCE, GOVERNING for different use cases
- 10-06: Activity logged on BOTH policy and case when linked/unlinked
- 10-06: getViolationStats() aggregates violations by policy for compliance dashboards
- 10-06: Bidirectional queries: findByPolicy() and findByCase()
- 10-07: PolicySearchIndexListener handles policy.created, .updated, .published, .retired events
- 10-07: Translation events (created/updated) trigger policy re-indexing
- 10-07: Policy case link/unlink events update linkedCaseCount in ES
- 10-07: Compliance synonyms in policy mapping (policy/procedure/guideline, coc/handbook, etc.)
- 10-09: Inline diff as default mode per CONTEXT.md - green additions, red strikethrough deletions
- 10-09: Tab navigation synced with URL query parameter for shareable deep links
- 10-09: Approval status card shows current step and pending reviewers in yellow card
- 11-01: react-grid-layout format for responsive dashboard layouts (lg/md/sm/xs breakpoints)
- 11-01: UserDashboardConfig separate from Dashboard for user-specific overrides without duplication
- 11-01: Role-based default dashboards (CCO, INVESTIGATOR, CAMPAIGN_MANAGER) with isSystem=true protection
- 11-01: Events emitted for all dashboard mutations (dashboard.created, dashboard.updated, etc.)
- 11-08: Security-first field whitelisting per entity type prevents SQL injection and data exposure
- 11-08: Fallback pattern-based parser when Claude unavailable for basic query functionality
- 11-08: Auto-visualization selection based on query intent and result shape (KPI, TABLE, LINE/BAR/PIE_CHART)
- 11-08: AiQueryHistory model for query analytics and debugging
- 11-08: Period comparison in COUNT queries calculates change % from previous time range
- 11-07: Two Excel generation modes: streaming (>10k rows) via WorkbookWriter, buffer (<10k rows) for rich formatting
- 11-07: Prisma.CaseGetPayload<> pattern for type-safe complex query includes
- 11-07: Batch processing with setImmediate yield every 1000 rows for event loop responsiveness
- 11-07: Export files stored in Azure Blob with 7-day signed URL expiration
- 11-07: BullMQ export queue with concurrency: 2, 3 retries, exponential backoff (5s, 10s, 20s)
- 11-09: Strategy pattern for migration connectors - base class + NAVEX/EQS/CSV implementations
- 11-09: Levenshtein distance fuzzy matching for generic CSV field mapping
- 11-09: FIELD_ALIASES with 100+ variations for common compliance field names
- 11-09: csv-parser package for streaming large file imports
- 11-11: MigrationProcessor concurrency of 1 prevents resource contention on large imports
- 11-11: No retries for migration imports - deliberate operation, retries could cause duplicates
- 11-11: DIRECT_ENTRY for migration source channel (closest existing enum value)
- 11-11: WEB_FORM_SUBMISSION for migrated RIU type (best fit for imported data)
- 11-11: Enum mapping helpers convert string values to valid Prisma enums with fallback defaults
- 11-11: Transaction-safe entity creation (Person, RIU, Case) with MigrationRecord tracking
- 10-10: UserStatus type (ACTIVE, PENDING_INVITE, INACTIVE, SUSPENDED) for nuanced status display
- 10-10: ROLE_DESCRIPTIONS constant provides context for role selection in invite form
- 10-10: RolePermissionsTable uses visual matrix (check/minus/x icons) for scannable permissions

### Pending Todos

**AI Infrastructure Polish (Phase 6):**
- WebSocket /ai namespace needs integration testing with real client
- Skills/Actions endpoints return [] without auth - consider adding demo mode or public skill list
- AiGateway authentication flow needs E2E testing

### Blockers/Concerns

- Q1 deadline pressure may require scope adjustment - monitor velocity after Phase 1
- Anthropic BAA for healthcare needs verification before Phase 5 AI integration
- Existing codebase (~15%) needs integration verification during Phase 1

## Session Continuity

Last session: 2026-02-05T03:55:00Z
Stopped at: Completed 11-18-PLAN.md (EQS Connector - verified existing implementation)
Resume file: None

**Phase 11 Status: IN PROGRESS**
Plans completed: 11-01 through 11-11, 11-15, 11-16, 11-17, 11-18
- 11-18: EQS Connector (verified existing implementation from 11-09 meets all requirements)
- 11-17: NAVEX Connector (verified existing implementation from 11-09 meets all requirements)
- 11-11: Migration Controller & Processor (BullMQ async imports, REST lifecycle API, rollback support)
- 11-10: Dashboard REST Controller (widget data endpoints, ScheduledRefreshService, cron-based cache refresh)
- 11-09: Migration Connectors (NavexConnector, EqsConnector, CsvConnector, fuzzy matching)
- 11-07: Excel Streaming Export (ExcelExportService, FlatExportProcessor, ExportsController)
