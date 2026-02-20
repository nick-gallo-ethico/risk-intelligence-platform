# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Users can manage their entire compliance workflow - from anonymous report intake to investigation closure to board reporting - in one AI-assisted platform, with every task unified into a single "My Work" view.
**Current focus:** v1.2 Production Hardening & Feature Completion

## Current Position

Phase: 38 of v1.2 (Dark Mode Gap Closure)
Plan: 5 of 10 complete (38-01, 38-02, 38-03, 38-04, 38-05)
Status: In progress
Last activity: 2026-02-20 - Completed 38-05-PLAN.md (case sidebar cards migrated)

Progress: v1.0 + v1.1 complete. v1.2 Phase 32 COMPLETE, Phase 33 COMPLETE (10/10 plans), Phase 34 COMPLETE (5/5 plans), Phase 35 COMPLETE (6/6 plans), Phase 36 COMPLETE (13/13 plans), Phase 25.1 COMPLETE (10/10 plans), Phase 22 COMPLETE (15/15 plans), Phase 23 COMPLETE (5/5 plans), Phase 37 COMPLETE (1/1 plans), Phase 38 IN PROGRESS (5/10 plans).

## Shipped Milestones

| Milestone                    | Phases | Plans | Requirements | Shipped    |
| ---------------------------- | ------ | ----- | ------------ | ---------- |
| v1.0 Feature Build           | 1-25.1 | 242+  | 149          | 2026-02-13 |
| v1.1 Code Review Remediation | 26-31  | 43    | 36           | 2026-02-15 |

## v1.2 Milestone Overview

**Phases:** 11 total (5 remediation + 3 continued feature + 3 gap closure)
**Requirements:** 77 (55 Track 1 + 22 Track 2)
**Target:** D+ to B+ overall code quality grade

| Track                | Phases             | Requirements | Focus                                |
| -------------------- | ------------------ | ------------ | ------------------------------------ |
| Track 1: Remediation | 32, 33, 34, 35, 36 | 55           | Security, slop, perf, quality, tests |
| Track 2: Features    | 22, 23, 25.1       | 22           | Dark mode, help system, case detail  |

**Execution Order:**

1. Phase 32: Security & SOC 2 (CRITICAL) - 13 requirements [COMPLETE - 8/8 plans]
2. Phase 33: Slop Cleanup + Production - 16 requirements [COMPLETE - 10/10 plans, verified]
3. Phase 34: Performance & Scalability - 11 requirements [COMPLETE - 5/5 plans]
4. Phase 35: Code Quality & Architecture - 5 requirements [COMPLETE - 6/6 plans]
5. Phase 36: Test Coverage Expansion - 10 requirements [COMPLETE - 13/13 plans]
6. Phase 22: Dark Mode & Theme - 7 requirements [COMPLETE - 15/15 plans]
7. Phase 23: Help & Support System - 5 requirements [COMPLETE - 5/5 plans, verified]
8. Phase 25.1: Case Detail Vision - 10 requirements [COMPLETE - 10/10 plans, verified]
9. Phase 37: Critical Integration Fixes - 3 integration gaps [COMPLETE - 1/1 plans, verified]
10. Phase 38: Dark Mode Gap Closure - 3 requirements [IN PROGRESS - 5/10 plans]
11. Phase 39: Frontend Test Repair - 50 test failures [NOT STARTED - gap closure]

## Accumulated Context

### Key Decisions

- v1.2 dual-track: code review remediation (6 dimensions, B+ target) + unfinished feature phases
- Pre-Series A code review found D+ overall grade - security D+, tests F, performance C
- Track 2 phases (22, 23, 25.1) use existing plans from v1.0 - do NOT re-plan
- Phase ordering: Security FIRST, then cleanup, perf, quality, tests, then features
- ESLint max-lines guardrail (warn at 500 LOC) prevents service bloat
- 32-01: Employee attestation endpoints allow all authenticated roles
- 32-01: userName derived from user.firstName + user.lastName in checklist controller
- 32-03: WebSocket JWT verification extracts context from verified payload only (SEC-02)
- 32-03: Use JwtKeyService.getAlgorithm() for algorithm-aware verification
- 32-04: RS256 only for JWT - removed HS256 from all verification points (CVE-2015-9235)
- 32-04: Fail closed on unknown algorithm - no fallback to weaker algorithms
- 32-04: Startup validation throws error if JWT_REFRESH_SECRET undefined
- 32-02: MigrationController and PolicyApprovalController secured with JWT guards and proper decorators
- 32-02: Used optional type for decorator parameters in multipart upload endpoints
- 32-05: organizationId removed from CreateChatDto - must come from authenticated context
- 32-05: AiClientService accepts organizationId as separate parameter for logging
- 32-05: Permanent demo accounts use DEMO_ACCOUNT_PASSWORD environment variable with fallback
- 32-05: @MaxLength(72) on password fields to prevent bcrypt CPU exhaustion
- 32-07: MessageRelayService audit logs use AuditActionCategory.ACCESS
- 32-07: MFA logs use user.id instead of user.email (PII minimization)
- 32-07: Operations middleware exemptions are specific internal/\* routes
- 32-06: mfaVerified stored in both access and refresh tokens for session persistence
- 32-06: MfaGuard checks user.mfaVerified from RequestUser (JWT payload)
- 33-01: Use ConfigService.getOrThrow for required config values (fail fast pattern)
- 33-01: Module-level Logger for useFactory initialization logging
- 33-02: Downgraded pdf-parse to v1.1.1 for CommonJS compatibility (v2.x is ESM-only)
- 33-02: Dynamic ESM import pattern for file-type in CommonJS: await import('file-type')
- 33-02: Dual file validation: extension blocklist + magic byte verification for defense in depth
- 33-02: Text files (.txt, .csv, .json, etc.) bypass magic byte check since they have no magic bytes
- 33-03: Inject NotificationService into EscalationProcessor for real notifications
- 33-03: Return null for support ticket count when unavailable (vs hardcoded 0)
- 33-03: Neutral score (75) for null ticket count in health calculation
- 33-03: Throw NotImplementedException for uninitialized AI actions (factory pattern)
- 33-03: Throw BadRequestException for PDF in flat file exports (use Board Report instead)
- 33-06: AUTH-TODO prefix for internal operations auth TODOs (InternalAuthGuard, InternalUserGuard)
- 33-06: STUB-TODO prefix for integration stubs (email service, message attachments)
- 33-06: Conservative JSDoc removal - only remove if zero additional context beyond name
- 33-07: DTO splitting: group by concern (field metadata, filters, queries, responses)
- 33-07: Barrel re-exports maintain backward compatibility for existing imports
- 33-07: SLOP-09 resolved - PipelineService and CasePipelineService are complementary, not duplicates
- 33-08: SLOP-04 gap closure: 330 separators removed from 42 files (analytics, remediation, reporting, rius, search)
- 33-09: SLOP-05 gap closure verified: 37 TODOs (23 AUTH-TODO, 2 STUB-TODO, 12 future enhancements)
- 33-10: PROD-02 gap closure: Extension blocking added to attachments controller fileFilter (defense-in-depth)
- 34-01: Batch size of 100 for cursor-based pagination (memory vs round-trips balance)
- 34-01: BullMQ addBulk() chunks in batches of 100 jobs
- 34-01: Return { items, nextCursor } format for paginated iteration
- 34-01: Raw SQL for completion rate (Prisma aggregate() doesn't support division)
- 34-02: N+1 fix pattern: collect IDs -> batch fetch with Promise.all() -> Map for O(1) lookup
- 34-02: Recursive CTE for hierarchical data with depth limit to prevent infinite loops
- 34-02: Raw SQL uses snake_case column names from Prisma @@map mappings
- 34-03: Cache key format: org:{organizationId}:{namespace}:{key} for tenant isolation
- 34-03: Redis store via cache-manager-ioredis-yet for cache-manager v5 compatibility
- 34-03: Fail-open cache pattern: errors logged but don't break functionality
- 34-03: 5 minute default TTL for dashboard data
- 34-04: connection_limit=50, pool_timeout=30, connect_timeout=10 for Prisma pool
- 34-04: LRU cache max=1000, ttl=30min for agent instances with updateAgeOnGet
- 34-04: getCacheStats() method for cache monitoring
- 35-01: Thin Coordinator pattern - original service delegates to focused sub-services
- 35-01: Type re-exports from original file for backward compatibility
- 35-01: Services directory with index.ts barrel for sub-services
- 35-02: Three-stage pipeline for AI queries: parse -> execute -> format
- 35-02: FormatDetectorService groups all file format concerns (delimiter, encoding, source type)
- 35-02: MappingGeneratorService uses FieldMatcherService for fuzzy matching
- 35-02: Transform methods added to existing TransformApplierService (not new service)
- 35-03: Three-stage pipeline for triage: interpret -> preview -> execute
- 35-03: TableDeliveryService handles BullMQ job scheduling for email delivery
- 35-03: TemplateRegistryService contains static SYSTEM_TEMPLATES definitions
- 35-03: ContextCacheService uses @nestjs/cache-manager with per-context-type TTLs
- 35-03: HierarchyLoaderService provides fallback contexts for missing entities
- 35-03: PromptBuilderService includes agent-specific instructions by agent type
- 35-04: Type extraction to separate files reduces coordinator LOC
- 35-04: High-impact services (13+ dependents) preserve exact public API method signatures
- 35-04: notification.types.ts pattern for interface-heavy services
- 35-04: All 12 original fat services now under 400 LOC
- 35-05: getDynamicPrismaModel() wrapper for type-safe dynamic Prisma model access
- 35-05: as unknown as Type double-cast pattern for Prisma JSON fields
- 35-05: UserRole enum from @prisma/client instead of string literals for role typing
- 35-05: SsoAuthenticatedUser type for SSO callback handlers
- 35-06: strictPropertyInitialization: false for NestJS DTO pattern compatibility
- 35-06: getErrorMessage() and getErrorStack() utilities for unknown catch types
- 35-06: Type assertions for generic contravariant registries (ActionCatalog, SkillRegistry)
- 36-03: Fail-fast error propagation for impersonation middleware (security pattern, not fail-open)
- 36-03: Comprehensive InternalRole permission testing for cross-tenant impersonation
- 36-01: jest.mock() for MfaService to avoid ESM import issues with otplib
- 36-01: TestableGuard subclass pattern to expose protected methods for ThrottlerGuard testing
- 36-02: Use development NODE_ENV in tests to allow http redirectUrl for Azure AD
- 36-02: ConfigService.get() mock returns defaultValue when provided for unconfigured strategy checks
- 36-04: All cross-tenant access returns 404 (not 403) to prevent enumeration attacks
- 36-04: Database state verification after cross-tenant mutation attempts using RLS bypass
- 36-12: Mock @dnd-kit with proper DndContext, useDraggable, useDroppable patterns
- 36-12: Mock @xyflow/react with forwardRef ReactFlow and useNodesState/useEdgesState hooks
- 36-12: Mock @radix-ui/react-collapsible with Root, CollapsibleContent, CollapsibleTrigger exports
- 36-12: QueryClientProvider wrapper required for WorkflowBuilder tests (uses mutations)
- 36-11: Created MfaSetup component since plan referenced testing it but component didn't exist
- 36-11: Settings tests focus on logic/validation due to vitest ESM mock hoisting issues with useAuth
- 36-11: MSW wildcard URL patterns (\*/api/v1) for flexible API mocking across environments
- 36-05: AI context isolation tests verify no cross-tenant data leaks to AI prompts
- 36-05: 62 additional tenant isolation tests across reporting, AI, forms, notifications
- 36-06: HRIS tests verify Person/Employee records respect RLS tenant boundaries
- 36-06: Search tests verify results, suggestions, and unified search are tenant-scoped
- 36-06: Projects tests verify CRUD operations, tasks, groups, and stats are isolated
- 36-06: TEST-04 complete: 16 modules now have tenant isolation verification
- 36-08: Mock Anthropic SDK at top of test file with jest.mock('@anthropic-ai/sdk')
- 36-08: Mock sub-services (ContextCacheService, HierarchyLoaderService, PromptBuilderService) for context-loader tests
- 36-08: Fixed spread operator order in mockResolvedValue to avoid TS2783 error
- 36-07: Transaction mock pattern: $transaction: jest.fn(cb => cb(mockTx)) executes callback synchronously
- 36-07: Coordinator test pattern: mock delegated services (ConflictMatchingService, ConflictExclusionService) and verify calls
- 36-07: Single entity disclosure pattern: null unused fields for predictable conflict counts in tests
- 36-10: Mock pattern: Define mockService outside beforeEach for jest.fn() typing, use directly (not via module.get)
- 36-10: fs.Dirent type compatibility: Cast mockFs.readdirSync returns 'as any' for Node.js version changes
- 36-09: fs.Dirent mock uses 'any' type with eslint-disable for Node.js version compatibility in prompt tests
- 36-09: Handlebars join helper requires explicit separator argument: {{join tags ', '}}
- 36-09: ioredis mock requires \_\_esModule: true and both default/Redis exports for ES module compatibility
- 36-09: TPM token format is requestId:timestamp:tokenCount (3 colon-separated parts)
- 36-09: Mock interface pattern for Prisma methods avoids TypeScript jest.Mock type issues
- 22-01: Use class strategy (attribute='class') for ThemeProvider matching Tailwind darkMode config
- 22-01: System as default theme for OS preference detection
- 22-01: CSS variable classes (bg-background, text-foreground) for theme-aware styling
- 22-03: Use centralized theme-colors utility for status/severity badges for consistency
- 22-03: bg-secondary for progress track - auto-adapts via CSS variables
- 22-03: bg-popover semantic token for dropdown menus (not bg-white)
- 22-03: bg-accent for focus/hover states in menus (not bg-gray-100)
- 22-04: Navigation components (sidebar, mobile nav, ai-panel) already used semantic tokens - no changes needed
- 22-04: Top nav stays dark in both modes (HubSpot pattern) with subtle dark mode border differentiation
- 22-04: Kbd badge styling pattern: bg-muted border-border text-muted-foreground
- 22-04: Form error styling pattern: text-destructive bg-destructive/10 border-destructive/20
- 22-05: priorityColors from theme-colors.ts for all priority badges
- 22-05: getStatusColor/getSeverityColor helpers eliminate per-component color mappings
- 22-05: Pattern: hover:bg-muted/50 for interactive list items in dark mode
- 22-08: Color pair functions for Gantt chart inline styles (getStatusColorPair, getStatusBgColorPair)
- 22-08: Marked original single-color gantt functions as @deprecated for backward compatibility
- 22-08: rgba() for dark mode Gantt backgrounds for consistent 20% opacity
- 22-07: Investigation components verified already themed from prior Phase 22 executions
- 22-07: SortableViewTab inactive state: bg-muted text-muted-foreground for semantic dark mode support
- 22-07: DataTable inline status/severity colors get dark: variants for consistency
- 22-07: Dark mode badge pairs pattern: bg-color-100 text-color-800 dark:bg-color-900/30 dark:text-color-300
- 22-06: Task 1 files already themed in 3ba1cd0 (22-08) - only activity-filters.tsx needed updates
- 22-06: Files tab drop zone pattern: border-border default, dark:bg-blue-900/20 for drag state
- 22-06: Investigation card STATUS_COLORS and SLA_COLORS records with explicit dark variants
- 22-13: entityTypeConfig in search page uses dark: variants for badge colors
- 22-13: Internal module cards use dark:bg-{color}-950/30 for 30% opacity in dark mode
- 22-13: Admin module uses fully semantic tokens (no colored variants needed)
- 22-09: Most ethics components already had dark: variants - only theme-skeleton.tsx needed updates
- 22-09: SEVERITY_COLORS pattern: bg-color-100 text-color-800 dark:bg-color-900/30 dark:text-color-300
- 22-09: EVENT_TYPE_CONFIG pattern with color/bgColor dark variants for all 6 timeline event types
- 22-10: Use getSeverityColor() centralized utility for all severity badges in QA components
- 22-10: bg-muted/50 for WRONG_NUMBER type selector (semantic, auto-adapts)
- 22-10: Split-screen panels use bg-card (left) and bg-background (right)
- 22-11: Employee portal files already themed from prior Phase 22 executions - no changes needed
- 22-11: Campaign warning messages use dark:bg-amber-900/30 dark:text-amber-300 pattern
- 22-11: campaigns-summary-cards use dark:bg-{color}-900/20 for icon backgrounds
- 22-11: FormBuilder/FormPreview (104 combined hardcoded colors) migrated to semantic tokens
- 22-11: FieldPalette uses bg-card, bg-muted, text-foreground, text-muted-foreground
- 22-12: ROLE_COLORS in users-table.tsx uses dark:bg-color-900/30 dark:text-color-300 pattern
- 22-12: GoLiveChecklist gate states (passed/blocked/warning) with dark variants for visibility
- 22-12: tagColors in FlatExportBuilder/TaggedFieldConfig with 6 field tag dark variants
- 22-12: File components (upload, list, preview) use semantic tokens exclusively
- 22-12: View components (10 files) already dark mode ready via shadcn primitives
- 22-15: Remove width from th/td elements for flexible column sizing
- 22-15: Only select/actions columns retain minWidth (fixed UI controls)
- 22-15: whitespace-nowrap on headers so header text determines minimum width
- 22-14: Gap closure fixed 20 files not in prior plans (workflow builder, projects, record-detail, cases)
- 22-14: Workflow builder components used slate-\* colors (non-standard), migrated to semantic tokens
- 22-14: Status/severity/SLA configs now have dark: variants (bg-color-900/50, text-color-200 pattern)
- 38-02: Gray badges (CLOSED, GENERAL, INSUFFICIENT_EVIDENCE) use bg-muted text-muted-foreground
- 38-02: Purple AI buttons get explicit dark: variants for purple-400/purple-800/purple-900 colors
- 38-02: BADGE_COLOR_MAP and STATUS_COLORS records get full dark: variant treatment
- 38-03: top-nav.tsx uses white/opacity patterns intentionally for dark nav - no changes needed
- 38-03: STATUS_CONFIG and SEVERITY_CONFIG use dark:bg-color-900/30 dark:text-color-300 pattern
- 38-03: Gray fallback badges use bg-muted text-muted-foreground (semantic)
- 38-05: STAKEHOLDER badge uses bg-muted text-muted-foreground (semantic gray)
- 38-05: CLOSED status badge uses bg-muted text-muted-foreground (semantic)
- 38-05: RELATED association type uses bg-muted text-muted-foreground border-border (semantic)

### Blockers

None currently.

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 38-05-PLAN.md (case sidebar cards)
Resume file: None
Next action: Continue Phase 38 with 38-06-PLAN.md
