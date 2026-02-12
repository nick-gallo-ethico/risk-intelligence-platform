# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Users can manage their entire compliance workflow - from anonymous report intake to investigation closure to board reporting - in one AI-assisted platform, with every task unified into a single "My Work" view.
**Current focus:** Phase 19 COMPLETE - ready for Phase 20

## Current Position

Phase: 20 of 24 (Settings Overhaul)
Plan: 1 of 6 in current phase
Status: Phase 20 IN PROGRESS - Settings hub pages
Last activity: 2026-02-12 - Completed 20-01 (settings hub restructure and profile page)

Progress: [=========================================================--------------] ~89% (~231 of ~260 estimated total plans)

### Phase 20 Settings Overhaul IN PROGRESS (2026-02-12)

- 20-01: Settings hub restructure and user profile page (COMPLETE - b1f74b8, 160c8d8, 1259464, 48874ac)
  - Settings hub restructured with 4 HubSpot-style sections
  - Your Preferences, Account Management, Data Management, Tools
  - /settings/profile with Profile/Security/Task Defaults tabs
  - Profile tab: display name, title, timezone, language
  - Security tab: change password form, MFA toggle, active sessions
  - Task Defaults: default reminder, assignment mode, auto-accept
  - Navigation updated with Properties and AI Settings links
- 20-02: User notification preferences page (COMPLETE - b1f74b8, 160c8d8)
  - /settings/notifications with HubSpot-style toggle-to-save pattern
  - Categories grouped: Urgent (assignments, deadlines, escalations), Activity (status, comments), Collaboration (mentions)
  - Email and In-App columns with per-category toggles
  - Quiet hours with time pickers and timezone select
  - Out of office with return date and backup user delegation
  - Enforced categories shown with lock icon (cannot disable)
  - React Query hooks with optimistic updates

### Phase 17 Campaigns Hub IN PROGRESS (2026-02-11)

- 17-01: Wire backend dashboard endpoints and navigation (COMPLETE - 00d0bb3)
  - GET /campaigns/dashboard/stats, /dashboard/overdue, /dashboard/upcoming
  - POST /campaigns/:id/remind for manual reminder triggering
  - Added Campaigns and Forms to sidebar navigation
  - Created /campaigns/new page with CampaignBuilder wizard
- 17-02: Campaign detail page with tabbed layout (COMPLETE - 4733750, df2118c)
  - CampaignDetail component (580 lines) with Overview/Assignments/Settings tabs
  - Lifecycle action buttons: Launch (DRAFT), Pause/Cancel/Remind (ACTIVE), Resume/Cancel (PAUSED)
  - Assignment table with employee snapshot and status badges
  - AlertDialog confirmations for Launch and Cancel operations
  - API extensions: getAssignments, getOverdueCampaigns, getUpcomingDeadlines, sendReminders
  - Hooks: useCampaignAssignments, useOverdueCampaigns, useUpcomingDeadlines, useSendReminders
- 17-03: Forms hub with list, create, and edit pages (COMPLETE - 58ba8ad)
  - /forms page with type filters and quick links to disclosures/intake-forms
  - /forms/new page with type selector and FormBuilder integration
  - /forms/[id] page for editing with publish/clone actions
  - FormsList component with type filtering tabs and status badges
  - Forms API client (forms-api.ts) and React Query hooks (use-forms.ts)

### Phase 18 Reports & Data Management IN PROGRESS (2026-02-11)

- 18-01: Reports Data Foundation (COMPLETE - 58ba8ad, bed1c0c)
  - SavedReport Prisma model with full configuration persistence
  - ReportFieldRegistryService with 30-50 fields per entity type
  - Dynamic custom property inclusion per tenant
  - Report DTOs with class-validator decorators
  - Decision: Static field registries (not Prisma introspection) for comprehensive catalogs
- 18-02: Report execution and CRUD services (COMPLETE - 72eee7d, 17bf85f)
  - ReportExecutionService for running reports against database
  - ReportService for SavedReport CRUD operations
  - Support for 7 entity types with tenant isolation
  - Filter operators, grouped aggregation, relationship fields
- 18-03: ReportController REST API (COMPLETE - b5519e1, 0ba4718)
  - 12 REST endpoints at /api/v1/reports/\*
  - GET /fields/:entityType for report designer field picker
  - CRUD endpoints (GET/POST/PUT/DELETE /reports)
  - Execution endpoint POST /reports/:id/run
  - Actions: duplicate, favorite, export
  - AI generation POST /reports/ai-generate
  - ReportModule and AiQueryModule wired into AnalyticsModule
- 18-04: Report templates seeder (COMPLETE - 0d940af)
  - 10 pre-built report templates (compliance, operations, executive categories)
  - 5 sample user reports for demo CCO
  - Templates: Case Volume, Time-to-Close, SLA Rate, Disclosure Completion,
    Open Cases by Priority, Anonymous vs Named, Cases by Location,
    Investigator Workload, RIU Intake Trends, Quarterly Board Summary
  - Idempotent seeder with findFirst check before create
- 18-05: Report list page at /reports (COMPLETE - 62b3592, 5b69516)
  - TypeScript types (SavedReport, ReportField, ReportResult, etc.)
  - API client (reportsApi) for all 12 backend endpoints
  - /reports page with My Reports, Shared Reports, Templates tabs
  - Template gallery with card grid layout
  - AI query dialog for natural language report generation
  - Search filtering, favorite toggle, duplicate, delete actions
- 18-06: Report designer wizard (COMPLETE - 0d940af, 18dd5fe)
  - 5-step wizard: Data Source, Fields, Filters, Visualization, Save
  - DataSourceSelector with 7 entity type cards
  - ReportFieldPicker with search, groups, drag-reorder using @dnd-kit
  - ReportFilterBuilder with type-aware operators and value inputs
  - /reports/new page with template pre-population support
  - RadioGroup UI component for visibility selection
- 18-07: Report detail page with chart components (COMPLETE - 321631c, a9018c1)
  - ReportChart renders bar/line/pie/stacked_bar/funnel using recharts
  - ReportKpi displays single metrics with change indicators
  - ReportResultsViewer with table pagination, chart/kpi rendering
  - /reports/[id] page with auto-run, edit/duplicate/delete actions
  - Added exportReport API method
- 18-08: AI report generator and export integration (COMPLETE - 2b032ff, e4db332)
  - AiReportGenerator dialog for natural language report queries
  - Example queries, AI interpretation display, results preview
  - ExportButton wired to backend /exports/flat-file API
  - Client-side export fallback for small datasets (<100 rows)
  - Job polling with 3s interval, 5 minute timeout
  - PDF export format added
- 18-09: Scheduled report delivery (COMPLETE - 2be6be2, 7d7e216, c779863)
  - ScheduleReportDialog for daily/weekly/monthly schedule configuration
  - 7 schedule endpoints on ReportController: create, get, update, delete, pause, resume, run-now
  - Report detail page shows schedule status badge with pause/resume toggle
  - Schedule linked to SavedReport via scheduledExportId field

### Phase 19 Workflow Engine UI IN PROGRESS (2026-02-11)

- 19-01: Backend UI support endpoints (COMPLETE - 9db917d)
  - GET /workflows/instances: List instances with filters (templateId, status, entityType) and pagination
  - POST /workflows/templates/:id/clone: Clone template with "(Copy)" suffix, draft state
  - GET /workflows/templates/:id/versions: Get version history ordered by version desc
  - GET /workflows/templates: Enriched with \_instanceCount for each template
- 19-02: Frontend foundation (COMPLETE - 4bc3a7b, 9db917d)
  - Installed @xyflow/react@12.10.0 for workflow canvas
  - TypeScript types (620+ lines): WorkflowTemplate, WorkflowInstance, stages, steps, transitions
  - API service (workflowsApi) covering all 18 workflow endpoints
  - React Query hooks (18 hooks): templates/instances CRUD, transitions, lifecycle mutations
  - Workflows navigation entry in admin sidebar for SYSTEM_ADMIN/COMPLIANCE_OFFICER
- 19-03: Workflow list page (COMPLETE - 2ec4331)
  - /settings/workflows page with header, create button, and table
  - WorkflowListFilters: Entity type dropdown, status toggle (All/Active/Inactive)
  - WorkflowListTable: 7 columns (Name, Entity Type, Version, Status, Default, Instances, Updated)
  - Row actions: Edit, Clone, View Instances, Set/Unset Default, Delete (with confirmation)
  - CreateWorkflowDialog: Name validation, entity type selection, creates minimal template
- 19-04: Visual workflow builder canvas (COMPLETE - 858a93b, c953530)
  - StageNode: Custom React Flow node with color bar, badges, step/gate/SLA info
  - TransitionEdge: Custom edge with label pill, condition/reason icons, hover animation
  - StagePalette: 4 draggable presets (standard, approval, terminal, notification)
  - WorkflowCanvas: React Flow canvas with drag-drop, delete key, minimap, controls
  - WorkflowBuilder: Three-column layout (palette | canvas | properties placeholder)
  - useWorkflowBuilder hook: State management with nodes/edges converters and actions
- 19-05: Workflow builder properties and pages (COMPLETE - 9141038, ef5d13a)
  - PropertyPanel: Right sidebar switching between stage/transition properties
  - StageProperties: Edit name, description, color, SLA, terminal toggle, steps, gates
  - TransitionProperties: Edit label, roles, conditions, actions
  - StepEditor: Inline form for step editing with assignee strategies
  - WorkflowToolbar: Name editing, entity type badge, version, save/publish with version-on-publish warning
  - Page routes: /settings/workflows/new and /settings/workflows/[id]
  - Unsaved changes warning via beforeunload event
- 19-06: Workflow instances page and progress indicator (COMPLETE - 9141038, ef702fe)
  - /settings/workflows/[id]/instances page with status filter tabs (All, Active, Completed, Cancelled, Paused)
  - InstanceListTable: Entity, Stage, Status, SLA Status, Started, Due Date columns
  - Row selection with checkboxes and bulk Pause/Resume/Cancel actions
  - InstanceDetailDialog: Full instance state, step states table, action buttons
  - WorkflowProgressIndicator: Reusable horizontal stage pipeline component
    - Completed stages green with checkmark, current blue pulsing, future gray
    - Compact mode for embedding in cards (Plan 07)

### Phase 18 COMPLETE (2026-02-11)

Phase 18 delivered a complete reports system:

- Report designer wizard with 7 entity types, field picker, filter builder
- 12 REST endpoints for report CRUD and execution
- Chart visualizations (bar, line, pie, funnel, stacked_bar) and KPI cards
- AI-powered natural language report generation
- Export to Excel/CSV/PDF with async job processing
- Scheduled report delivery with email recipients

### Phase 14 Critical Bug Fixes & Navigation COMPLETE (2026-02-09)

All 5 plans executed and verified:

- 14-01: Top nav & sidebar overhaul (auth context, logout, SVG logo, dark theme)
- 14-02: Create /notifications and /my-work pages (fix 404s)
- 14-03: Create /search and /profile pages, fix SelectItem error
- 14-04: Dashboard performance (reduced fetch limit), task navigation
- 14-05: Verification checkpoint (all 11 success criteria verified)

### Phase 14.1 Data & Config Fixes PARTIAL (2026-02-09)

Plans 01-03 complete, human verification revealed additional issues:

- 14.1-01: Notification seeder for demo data (COMPLETE)
- 14.1-02: Activity seeder wiring for audit log (COMPLETE)
- 14.1-03: Fix demo user case ownership for My Tasks (COMPLETE)
- 14.1-04: Verification checkpoint (PARTIAL - fixes committed, new issues found)

**Fixes committed in 14.1 (commit 33043f8):**

- Notifications page: Fixed page→offset pagination (96 notifications now display)
- My Work page: Fixed page→offset pagination (70 tasks now display)
- Audit Log page: Fixed page→offset pagination (35,094 entries now display)

**Issues moved to Phase 14.2:**

- Category/Subcategory dropdowns missing from case creation form
- Unified search returning empty results despite populated search vectors

### Phase 15 Case Detail Page Overhaul COMPLETE (2026-02-11)

Three-column case detail page with activity feed, AI panel, and merge operations.

Plans:

- 15-01: Backend REST endpoints for case merge and person-case associations (COMPLETE - 418105e)
  - POST /cases/:id/merge, GET /cases/:id/merge-history, GET /cases/:id/can-merge/:targetId
  - GET/POST/DELETE /cases/:caseId/persons for person-case associations
- 15-07: Enhanced seed data for flagship cases (COMPLETE - c9a4fcf)
  - 200-400 word details and 50-75 word summaries for all 10 flagship cases
  - Activity timeline seeding (6-10 entries per case)
  - Connected people seeding (2-4 person associations per case with SUBJECT/REPORTER/WITNESS labels)
- 15-02: Three-column layout and left column components (COMPLETE - ebc5733)
  - CSS Grid three-column layout (300px|1fr|300px)
  - CaseInfoSummary component (ref number, status, severity, pipeline, days open, SLA)
  - ActionButtonRow component (5 quick action buttons: Note, Interview, Document, Task, Email)
  - Right column placeholder for connected entities (Plan 05)
- 15-03: Center column tabs and activity feed (COMPLETE - eda86a2)
  - Fixed activity API path to /activity/CASE/:id (not /activity/entity/CASE/:id)
  - Added Summary tab with AI/manual summary and case details
  - 7 tabs: Overview, Activities, Summary, Investigations, Messages, Files, Remediation
  - Enhanced Overview with pipeline progress visualization and assignee display
- 15-04: Action modals for case operations (COMPLETE - 316c502)
  - AssignModal: multi-select investigators with role filtering
  - StatusChangeModal: dropdown with rationale, warning for closing
  - MergeModal: two-step search + confirm flow with redirect
  - AddNoteModal: simple note logging to activity feed
  - EmailLogModal: log external email communications
  - Wired all modals in page.tsx with open/close state management
- 15-05: Right column connected entities (COMPLETE - 33dcce8)
  - ConnectedPeopleCard with evidentiary label grouping (SUBJECT/REPORTER/WITNESS)
  - AddPersonModal with search and free-form creation modes
  - ConnectedDocumentsCard with file type icons
  - AI Assistant trigger button with aiPanelOpen state
- 15-06: AI panel Sheet implementation (COMPLETE - 4f5497d)
  - AiChatPanel component with socket.io-client WebSocket streaming
  - Sheet overlay slides from right (400-480px width)
  - Connection status indicator with retry on error
  - Suggested prompts, streaming cursor, stop button
  - Tool use indicators and action execution callbacks

**Gap Closure Plans (15-08 to 15-11):**

- 15-08: Quick action modals for Interview, Document, Task (addresses Gap 4) - COMPLETE (523464f, fba1c69, b193be5)
  - LogInterviewModal with interviewee name/type, scheduled date, pre-interview notes
  - AttachDocumentModal with file selection, title, type, description (metadata only for MVP)
  - CreateTaskModal with title, description, assignee, due date, priority
  - All modals log to activity feed via POST /cases/:id/activity
  - Removed console.log placeholders from handleAction switch
- 15-09: RIU intake form answers display (addresses Gap 1) - COMPLETE (cf78c36)
  - GET /rius/:id/form-data endpoint with type-specific section builders
  - LinkedRiuFormAnswers component with collapsible sections
  - Integrated in Overview tab showing primary RIU intake details
- 15-10: AI backend action verification (addresses Gap 3) - COMPLETE (49e9253, a699b44, 1572f82)
  - add-case-note action created, change-status verified end-to-end
  - Critical fix: zodToJsonSchema broken for Zod 4.x (empty tool schemas sent to Claude)
  - Human-verified: both change-status and add-case-note work in live app
- 15-11: Email compose/send deferral documentation (addresses Gap 2) - COMPLETE

**Documented Deferrals:**

- Email compose/send from platform deferred to future Notifications phase (V1 scope: log-only)

### Phase 16 AI Integration Fix COMPLETE (2026-02-11)

Plans 16-01 through 16-06 were created before Phase 15 completed. Phase 15 built the AI chat panel
and WebSocket infrastructure, causing overlap with plans 16-02 and 16-03.

**Execution notes created (16-07)** documenting:

- Plans 16-02 and 16-03: SKIPPED (Phase 15 built ai-chat-panel.tsx with WebSocket streaming)
- Plans 16-04 and 16-05: EXECUTE (skill components and action preview are additive)
- Plan 16-06: PARTIAL (only health check endpoint needed; case wiring done in Phase 15)

See: `.planning/phases/16-ai-integration-fix/16-EXECUTION-NOTES.md`

Plans:

- 16-01: Backend REST chat endpoint + auth guard + context-loader fallback (COMPLETE - bf41124, d5aae62)
  - POST /api/v1/ai/chat endpoint routing through agent system
  - OptionalJwtAuthGuard allows unauthenticated requests with "demo" fallback
  - ContextLoaderService returns fallback context instead of throwing on missing org/user
- 16-02: AI panel context + useAiChat hook (SKIPPED - Phase 15 built equivalent)
- 16-03: Socket.io client + WebSocket hooks (SKIPPED - Phase 15 built equivalent)
- 16-04: AI skill components (summarize, category-suggest, risk-score) (COMPLETE - a479070, d0849e2, 67986f1, 821d2c7, f70180b)
  - useAiSkills hook for generic skill execution via POST /ai/skills/:skillId/execute
  - AiSummaryButton with brief/comprehensive dropdown
  - AiCategorySuggest with confidence-scored suggestions
  - AiRiskScore with visual severity indicators and factor breakdown
  - Triage skill registration documented (deferred pending disclosures integration)
- 16-05: AI action preview components + useAiActions hook (COMPLETE - committed with 16-04)
  - useAiActions hook with preview/execute/undo pattern
  - AiActionPreview confirmation dialog with field-level changes
  - Task 3 skipped: Phase 15 ai-chat-panel uses WebSocket actions
- 16-06: Health check + case detail wiring (COMPLETE - a479070)
  - Task 1: GET /ai/health endpoint returning status, capabilities, model
  - Tasks 2-4: SKIPPED per execution notes (Phase 15 overlap)
- 16-07: Execution notes documenting Phase 15 overlap (COMPLETE - bf41124)
- 16-08: UAT verification (COMPLETE - 51bf313)
  - 17 tests: 15 passed, 2 issues found and fixed
  - Fix 1: AiRiskScore confidence color coding (cosmetic)
  - Fix 2: AiRiskScore auto-trigger useEffect (major - was non-functional)

### Phase 14.2 Case Creation & Search Fixes COMPLETE (2026-02-10)

Created to address issues found during 14.1 human verification:

1. **Category/Subcategory in Case Creation** - Backend supports it (CreateCaseDto has primaryCategoryId, secondaryCategoryId), but frontend form is missing the dropdowns
2. **Unified Search Fix** - COMPLETE (14.2-02): PostgreSQL FTS fallback added

Plans:

- 14.2-01: Categories API endpoint and frontend integration (COMPLETE - 9cde4bc)
- 14.2-02: PostgreSQL FTS fallback for unified search (COMPLETE - c5038c5)
- 14.2-03: Verification checkpoint (COMPLETE - enum alignment fixes committed)

### Phase 13.1 Saved Views Fixes Complete (2026-02-09)

Closed all 4 UAT gaps from Phase 13:

- Board view card config fixed (priority, assignee fields)
- Drag-drop status persistence using PATCH /cases/:id/status
- GET /investigations list endpoint added
- search_vector population in case seeder
- Export endpoints wired for Cases, Policies, Investigations

### Phase 13 Complete (2026-02-07)

HubSpot-Style Saved Views System fully implemented:

- 15 plans completed across 5 waves
- Backend: SavedView model, API endpoints, seeder
- Frontend: View tabs, toolbar, filters, table, board, column picker
- Modules: Cases, Investigations, Policies, Disclosures, Intake Forms
- URL state synchronization for deep linking
- 16 default views seeded for demo tenant
- Verification checklist created

### New Phases Added (2026-02-06)

From V1 QA testing punch list (`.planning/V1-ISSUES-AND-GAPS.md`):

- Phase 14: Critical Bug Fixes & Navigation (404s, broken buttons, styling)
- Phase 15: Case Detail Page Overhaul (three-column layout, activity feed, AI panel)
- Phase 16: AI Integration Fix (AI doesn't work at all — core differentiator)
- Phase 17: Campaigns Hub (centralized campaign management)
- Phase 18: Reports & Data Management (report designer, field availability)
- Phase 19: Workflow Engine UI (visual workflow builder — critical)
- Phase 20: Settings Overhaul (HubSpot-style — preferences, account mgmt, data mgmt)
- Phase 21: Project Management (Monday.com-style boards/timelines)
- Phase 22: Dark Mode & Theme (required for V1)
- Phase 23: Help & Support System (knowledge base, ticket filing)
- Phase 24: Policy Content & Seed Data (populate policies, improve case data)

## Performance Metrics

**Velocity:**

- Total plans completed: 123
- Average duration: 15 min
- Total execution time: 30.36 hours

**By Phase:**

| Phase                    | Plans | Total    | Avg/Plan |
| ------------------------ | ----- | -------- | -------- |
| 01-foundation            | 9     | 123 min  | 14 min   |
| 02-demo-tenant-seed-data | 7     | 84 min   | 12 min   |
| 03-authentication-sso    | 8     | 69 min   | 9 min    |
| 04-core-entities         | 10    | 112 min  | 11 min   |
| 05-ai-infrastructure     | 11    | 143 min  | 13 min   |
| 06-case-management       | 11    | ~211 min | ~19 min  |
| 07-notifications-email   | 8     | ~112 min | ~14 min  |
| 08-portals               | 19    | 253 min  | 13 min   |
| 09-campaigns-disclosures | 17    | ~261 min | ~15 min  |
| 13-saved-views           | 15    | ~195 min | ~13 min  |

**Recent Trend:**

- Last 5 plans: 13-15 (45 min), 13-14 (15 min), 13-13 (17 min), 13-12 (7 min), 13-11 (7 min)
- Trend: Phase 13 COMPLETE - Demo data seeder and verification checkpoint finished.

**Tech Debt (Phase 11.1):**

- TD-001: Next.js hydration issue (dev server 404s on JS chunks)
- TD-002: Playwright baseURL configuration needs fix

_Updated after each plan completion_

## Accumulated Context

### Roadmap Evolution

- Phase 13 added (2026-02-06): HubSpot-Style Saved Views System - Reusable view components across Cases, Investigations, Disclosures, Intake Forms, Policies
- Phase 12 added (2026-02-05): Internal Operations Portal - Support Console, Implementation Portal, Hotline Operations, Client Success Dashboard, Tech Debt items
- Phase 11.1 inserted after Phase 11 (2026-02-05): Frontend Navigation and UI Fixes - Main sidebar, mobile nav, case tab fixes (URGENT)

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Demo tenant (Phase 2) built early to serve as continuous test bed
- Roadmap: AI infrastructure (Phase 5) before domain modules so features can leverage it
- Roadmap: 11 phases derived from 149 requirements with comprehensive depth setting
- 01-01: EventsModule is @Global() - EventEmitter2 injectable everywhere without explicit imports
- 01-01: Dot-notation event names (case.created) enable wildcard subscriptions (case.\*)
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
- 01-06: Per-tenant index naming: org*{organizationId}*{entityType}
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
- 02-06: Sales rep identification via email pattern matching (demo-\*@acme.local)
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
- 03-03: DNS TXT record prefix \_ethico-verify for domain verification
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
- 03-05: Extract email from profile.\_json with fallback: email > preferred_username > upn
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
- 05-11: REST endpoints at /api/v1/ai/\* for skills, actions, conversations, agents, usage
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
- 11-integration: Person model uses source: PersonSource enum, not sourceSystem string
- 11-integration: RIU referenceNumber is required - generate if not provided from source
- 11-integration: RIU anonymity determined by reporterType field, not separate isAnonymous
- 11-integration: Case creation requires updatedById (createdById is not enough)
- 11-integration: Case incidentDate is on RIU entity, not Case entity
- 11-integration: RiuAssociationType enum (not RiuCaseAssociationType) for RIU-Case links
- 11-integration: tsconfig.json exclude removed for analytics/migration and analytics/exports folders
- 12-04: Certification pass threshold 80% per CONTEXT.md (Quiz.passingScore default)
- 12-04: Quiz questions stored as JSON array for flexibility without additional tables
- 12-04: Both userId (tenant) and internalUserId (Ethico staff) supported on quiz attempts
- 12-04: Certificate numbers use CERT-YYYY-NNNNN format (generateCertificateNumber helper)
- 12-04: Major version changes trigger certificate expiration via completedVersion tracking
- 12-05: HARD_GATES array defines 4 blocking requirements for go-live
- 12-05: READINESS_ITEMS array has 7 weighted items summing to 100
- 12-05: RECOMMENDED_SCORE = 85 is the minimum threshold for go-live without sign-off
- 12-05: GoLiveGate unique constraint (projectId, gateId) ensures one status per gate per project
- 12-05: ReadinessItem.percentComplete supports partial credit (0-100)
- 12-05: GoLiveSignoff captures acknowledgedRisks array for explicit risk acknowledgment
- 12-01: InternalUser model is separate from tenant User for SOC 2 compliance
- 12-01: 7 InternalRole types (SUPPORT_L1-L3, IMPLEMENTATION, HOTLINE_OPS, CLIENT_SUCCESS, ADMIN)
- 12-01: ImpersonationSession max 4 hours, reason required, ticket optional
- 12-01: ImpersonationAuditLog captures Who/What/When/Where/Why/Before-After
- 12-01: Operations endpoints excluded from TenantMiddleware (api/v1/operations/\*)
- 12-06: Uses Express request context (req.impersonation) instead of nestjs-cls since cls not installed
- 12-06: RLS override via SET LOCAL app.current_organization with parameterized query
- 12-06: Response headers X-Impersonation-Remaining and X-Impersonation-Org for client UI timer
- 12-06: ImpersonationMiddleware applied globally to all routes via forRoutes('\*')
- 13-03: useReducer pattern for SavedViewProvider - 17+ action types benefit from reducer predictability
- 13-03: URL sync via searchParams for shareable view links (viewId query param)
- 13-03: API hooks separated from context for flexibility (useSavedViewsApi.ts independent module)
- 14.1-03: Demo users assigned via round-robin to open cases (first 25 per user) via createdById
- 14.1-03: DEMO_CASE_OWNERS constant defines the 4 demo users for case ownership
- 14.1-03: Default fallback to random user when demo quotas are met
- 14.1-04: Raw SQL must use @@map table names (cases not Case) and snake_case column names
- 14.2-02: Use prefix matching (word:\*) in FTS for partial word searches ("harass" matches "harassment")
- 14.2-02: Try FTS fallback on both ES index-not-found AND ES 0-results for cases
- 15-06: socket.io-client for WebSocket AI chat (transports: websocket first, polling fallback)
- 15-06: Hardcoded suggested prompts for fast initial load (API endpoint available at /ai/agents/:type/suggestions)
- 15-06: Connection status badge in header with color-coded states (green/yellow/red)
- 15-11: Email compose/send deferred to future Notifications & Communications phase - V1 scope is log-only via EmailLogModal
- 15-11: EmailLogModal allows logging external emails (sent/received outside platform) to case activity feed
- 16-04: useAiSkills<T> generic hook for typed skill execution via POST /ai/skills/:skillId/execute
- 16-04: Triage skill registration deferred - requires AiTriageService from disclosures module (circular dependency concern)
- 16-04: AI skill components use collapsible cards for detailed insights (category suggestions, risk factors)

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

Last session: 2026-02-12
Stopped at: Phase 20 Plan 01 COMPLETE - Settings hub restructure and user profile page
Resume file: None

**Phase 20 Status: IN PROGRESS**
Plan 20-01 completed (settings hub 4 sections, profile page with tabs, navigation updates).
Remaining: 20-03 through 20-06 (account defaults, properties/objects, AI settings, import/export).

**Phase 14.2 Status: IN PROGRESS**
Plan 14.2-02 completed. Remaining:

1. 14.2-01: Add Category/Subcategory dropdowns to case creation form
2. 14.2-03: Verification checkpoint

**Phase 12 Status: COMPLETE**
All 19 plans executed successfully:

- 12-01 through 12-06: Backend foundation (InternalUser, Impersonation, Go-Live)
- 12-07 through 12-12: Backend services (Support, Implementation, Hotline, Training, Client Success)
- 12-13 through 12-17: Frontend UI (Support Console, Implementation Portal, Hotline Ops, Training Portal, Client Success Dashboard)
- 12-18: Backend tech debt (WebSocket E2E, DataLoader)
- 12-19: Frontend polish and demo data (ErrorBoundary, SkeletonLoaders, accessibility.css, acme-phase-12.ts)

**Phase 13 Queued**
Phase 13 (HubSpot-Style Saved Views System) added. Run /gsd:plan-phase 13 to create execution plans.
