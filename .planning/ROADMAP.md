# Roadmap: Ethico Risk Intelligence Platform

## Overview

This roadmap delivers a unified, AI-native compliance management platform ("HubSpot for Compliance") through 11 dependency-ordered phases. The architecture follows the RIU-Case pattern (immutable inputs to mutable work containers), with AI infrastructure built early so all features can leverage it. Foundation infrastructure (event bus, queues, audit) comes first, followed by demo tenant creation to serve as a continuous test bed, then core entities, portals, and advanced features. Every phase produces observable user value and maintains the demo tenant as living proof of capability.

## Demo Data Strategy ("Lived-in Home")

**Principle**: Acme Co. grows with each feature release; modules add their 3-year historical data + active items.

**Enforcement**: Each phase's final plan (verification checkpoint) MUST include:

```markdown
### Demo Data Checkpoint

- [ ] New entity types have 3-year Acme Co. history seeded
- [ ] New entities connected to existing data (cases link to investigations, etc.)
- [ ] Fresh items in queues (unread, pending approval, open conflicts)
- [ ] npm run seed:acme-phase-XX (cumulative seed script)
```

**Script Naming**: `apps/backend/prisma/seeds/acme-phase-XX.ts`
**Orchestration**: `prisma/seeds/index.ts` imports all phase seeds in order

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation Infrastructure** - Event bus, job queues, audit logging, search infrastructure
- [x] **Phase 2: Demo Tenant & Seed Data** - "Acme Co." demo with 3 years of realistic data as test bed
- [x] **Phase 3: Authentication & SSO** - Multi-provider SSO, domain verification, MFA
- [x] **Phase 4: Core Entities** - Person, RIU, Case, Campaign, Associations (HubSpot pattern)
- [x] **Phase 5: AI Infrastructure** - Claude API integration, context hierarchy, skills registry, agents
- [x] **Phase 6: Case Management** - Investigation workflows, templates, subjects, anonymous communication
- [x] **Phase 7: Notifications & Email** - Event-driven notifications, templates, user preferences
- [x] **Phase 8: Portals** - Ethics (anonymous), Employee (self-service), Operator Console
- [x] **Phase 9: Campaigns & Disclosures** - COI, gifts, outside employment, attestations
- [x] **Phase 10: Policy Management** - Documents, versioning, approval workflows, AI translation
- [x] **Phase 11: Analytics & Reporting** - Dashboards, custom reports, natural language queries
- [x] **Phase 11.1: Frontend Navigation and UI Fixes** - Main sidebar, mobile nav, case tab fixes (INSERTED)
- [x] **Phase 12: Internal Operations Portal** - Support console, implementation tools, hotline ops, client success
- [x] **Phase 13: HubSpot-Style Saved Views** - Reusable view tabs, column selection, advanced filters, board views across all modules
- [x] **Phase 13.1: Saved Views Fixes** - Board view, investigations endpoint, search vector, export endpoints (INSERTED)
- [x] **Phase 14: Critical Bug Fixes & Navigation** - Route 404s, broken buttons, Select.Item error, search, user menu, nav styling
- [ ] **Phase 14.1: Data & Config Fixes** - Notifications seed data, search indexing, category dropdowns, task aggregation fixes (INSERTED)
- [ ] **Phase 14.2: Case Creation & Search Fixes** - Category/subcategory dropdowns in case creation, unified search fix (INSERTED)
- [x] **Phase 15: Case Detail Page Overhaul** - Three-column layout, activity feed, action buttons, AI panel, connected entities (gap closure complete)
- [ ] **Phase 16: AI Integration Fix** - Debug and fix non-functional AI, wire AI panel, enable AI actions on cases
- [ ] **Phase 17: Campaigns Hub** - Centralized campaigns area, form creation, campaign lifecycle management
- [ ] **Phase 18: Reports & Data Management** - Report designer UI, field availability, export from views
- [x] **Phase 19: Workflow Engine UI** - Visual workflow builder, workflow management section, apply to cases/approvals/disclosures
- [ ] **Phase 20: Settings Overhaul (HubSpot-Style)** - Preferences, account management, data management, properties, permission sets
- [x] **Phase 21: Project Management (Monday.com-Style)** - Kanban boards, task views, timelines, project tracking
- [ ] **Phase 22: Dark Mode & Theme** - Dark mode toggle, consistent nav theming, theme system
- [x] **Phase 23: Help & Support System** - Knowledge base, in-platform ticket filing, real-time support
- [ ] **Phase 24: Policy Content & Seed Data** - Populate policies with properly formatted text, improve case seed data
- [ ] **Phase 25: Case & Investigation Page Redesign** - HubSpot three-column record pattern for case and investigation detail pages

## Phase Details

### Phase 1: Foundation Infrastructure

**Goal**: Establish the platform's nervous system - event-driven communication, background job processing, unified audit logging, and search infrastructure that all subsequent modules depend on.
**Depends on**: Nothing (first phase); builds on existing ~15% codebase (auth, basic Case/Investigation CRUD)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-06, FOUND-07, FOUND-08, FOUND-09, FOUND-10, FOUND-11, FOUND-12
**Success Criteria** (what must be TRUE):

1. Events emitted from service layer are consumed by async handlers without blocking the request
2. Background jobs (AI processing, email sends, report generation) execute with retry logic and dead-letter handling
3. All mutations across the platform log to AUDIT_LOG with natural language descriptions queryable by entity
4. Search queries against Elasticsearch return results from indexed entities within 500ms
5. Workflow engine can transition entity states according to configurable pipeline definitions
   **Plans**: 9 plans in 4 waves

Plans:

- [x] 01-01-PLAN.md (Wave 1) - Event bus setup with @nestjs/event-emitter
- [x] 01-02-PLAN.md (Wave 2) - BullMQ job queue infrastructure with Redis
- [x] 01-03-PLAN.md (Wave 2) - Unified AUDIT_LOG service with natural language descriptions
- [x] 01-04-PLAN.md (Wave 3) - Workflow engine with pipeline/stage/transition models
- [x] 01-05-PLAN.md (Wave 4) - SLA tracking and assignment rules engine
- [x] 01-06-PLAN.md (Wave 3) - Elasticsearch indexing pipeline and search service
- [x] 01-07-PLAN.md (Wave 3) - Form/schema engine for dynamic forms
- [x] 01-08-PLAN.md (Wave 3) - Reporting engine with query builder framework
- [x] 01-09-PLAN.md (Wave 2) - File storage service with Azure Blob integration

### Phase 2: Demo Tenant & Seed Data

**Goal**: Create "Acme Co." demo tenant with 3 years of realistic compliance data - the living test bed that proves features work and enables sales demonstrations.
**Depends on**: Phase 1 (needs audit logging, workflow engine for realistic data)
**Requirements**: FOUND-04, FOUND-05, DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05, DEMO-06, DEMO-07, DEMO-08
**Success Criteria** (what must be TRUE):

1. Demo tenant "Acme Co." exists with complete organizational structure (business units, locations, 500+ employees)
2. Demo contains 3 years of historical data: 2,000+ RIUs, 1,500+ Cases, multiple completed campaigns
3. Cases exist in all investigation stages with realistic progression timestamps
4. Multiple user accounts with different roles can log in and see appropriate data
5. Demo can be reset to fresh state with single command (for repeated sales demos)
   **Plans**: 7 plans

Plans:

- [x] 02-01: Demo tenant provisioning service and "Acme Co." organization
- [x] 02-02: Seed data generator for employees, business units, locations
- [x] 02-03: Historical RIU generator (all types, all sources, 3-year spread)
- [x] 02-04: Historical Case generator with realistic investigation progression
- [x] 02-05: Historical Campaign generator (disclosures, attestations)
- [x] 02-06: Demo user accounts with role variety
- [x] 02-07: Demo reset command and verification

### Phase 3: Authentication & SSO

**Goal**: Enable enterprise customers to use their identity providers (Azure AD, Google, SAML) with just-in-time provisioning, domain verification, and multi-factor authentication.
**Depends on**: Phase 1 (needs audit logging for auth events); can partially parallelize with Phase 2
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):

1. User can log in via Azure AD SSO and be automatically provisioned in correct tenant based on email domain
2. User can log in via Google OAuth with domain-based tenant routing
3. Enterprise customers can configure SAML 2.0 with their IdP
4. Organization admins can verify domain ownership and configure SSO settings
5. Users can enable TOTP-based MFA on their accounts
   **Plans**: 8 plans in 4 waves

Plans:

- [x] 03-01-PLAN.md (Wave 1) - Database schema: TenantDomain, TenantSsoConfig, User SSO/MFA fields
- [x] 03-02-PLAN.md (Wave 1) - Rate limiting infrastructure with @nestjs/throttler
- [x] 03-03-PLAN.md (Wave 2) - Domain verification service with DNS TXT validation
- [x] 03-04-PLAN.md (Wave 2) - SSO service core with JIT user provisioning
- [x] 03-05-PLAN.md (Wave 3) - Azure AD SSO strategy with passport-azure-ad
- [x] 03-06-PLAN.md (Wave 3) - Google OAuth SSO strategy with passport-google-oauth20
- [x] 03-07-PLAN.md (Wave 3) - SAML 2.0 multi-tenant strategy with @node-saml/passport-saml
- [x] 03-08-PLAN.md (Wave 4) - MFA/TOTP implementation with recovery codes

### Phase 4: Core Entities

**Goal**: Implement the HubSpot-inspired data model - Person (Contact), RIU (Ticket), Case (Deal), Campaign (Sequence), and labeled Associations that enable pattern detection and unified workflows.
**Depends on**: Phase 1 (needs workflow engine, audit logging), Phase 3 (needs auth for user-entity links)
**Requirements**: PERS-01, PERS-02, PERS-03, PERS-04, PERS-05, PERS-06, RIU-01, RIU-02, RIU-03, RIU-04, RIU-05, RIU-06, RIU-07, CASE-01, CASE-02, CASE-03, CASE-04, CASE-05, CASE-06, CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CAMP-06, ASSOC-01, ASSOC-02, ASSOC-03, ASSOC-04
**Success Criteria** (what must be TRUE):

1. Person records can be created from HRIS sync, manual entry, or intake with correct type/source tracking
2. RIUs are immutable after creation - intake content cannot be modified, corrections go on linked Case
3. Cases can have multiple RIUs linked with association types (primary, related, merged_from)
4. Campaigns can target audiences by business unit, location, role and generate assignments for each employee
5. Pattern detection queries can find all Cases involving the same Person across different roles (reporter, subject, witness)
   **Plans**: 10 plans in 4 waves

Plans:

- [x] 04-01-PLAN.md (Wave 1) - Person entity with types and sources
- [x] 04-02-PLAN.md (Wave 2) - Employee fields and manager hierarchy
- [x] 04-03-PLAN.md (Wave 3) - HRIS sync service with Merge.dev integration
- [x] 04-04-PLAN.md (Wave 1) - RIU immutability enforcement and expanded status
- [x] 04-05-PLAN.md (Wave 2) - RIU type-specific extension tables
- [x] 04-06-PLAN.md (Wave 3) - RIU access code generation and status checking
- [x] 04-07-PLAN.md (Wave 2) - Case pipeline stages and merge support
- [x] 04-08-PLAN.md (Wave 3) - Campaign and CampaignAssignment entities with segment targeting
- [x] 04-09-PLAN.md (Wave 4) - Association entities with role labels (Person-Case, Person-RIU, Case-Case, Person-Person)
- [x] 04-10-PLAN.md (Wave 4) - Pattern detection queries and Elasticsearch denormalization

### Phase 5: AI Infrastructure

**Goal**: Build the AI integration layer that all features consume - Claude API client, context hierarchy loading, skills registry, action catalog, and scoped agents per view.
**Depends on**: Phase 4 (needs entities to provide context to AI)
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08, AI-09, AI-10, AI-11, AI-12, AI-13, AI-14, AI-15, AI-16, AI-17, AI-18, AI-19, AI-20, AI-21, AI-22
**Success Criteria** (what must be TRUE):

1. AI service calls Claude API with tenant-isolated context (never mixes data from multiple organizations)
2. Note cleanup transforms bullet points into formal narrative within 5 seconds
3. Case and investigation summaries generate automatically with confidence scores
4. AI panel (slide-over drawer) is available on Case and Investigation detail pages
5. Scoped agents (Investigation Agent, Case Agent) have different skills and action permissions
   **Plans**: 11 plans in 4 waves

Plans:

- [x] 05-01-PLAN.md (Wave 1) - Claude API integration with @anthropic-ai/sdk
- [x] 05-02-PLAN.md (Wave 2) - AIProvider abstraction for multi-LLM support
- [x] 05-03-PLAN.md (Wave 2) - Per-tenant rate limiting with Redis sorted sets
- [x] 05-04-PLAN.md (Wave 2) - Prompt versioning and template management with Handlebars
- [x] 05-05-PLAN.md (Wave 1) - AI conversation logging (AiConversation, AiMessage tables)
- [x] 05-06-PLAN.md (Wave 2) - Context hierarchy loading (platform/org/team/user/entity)
- [x] 05-07-PLAN.md (Wave 3) - Skills registry with note-cleanup and summarize skills
- [x] 05-08-PLAN.md (Wave 3) - Additional skills: category-suggest, risk-score, translate
- [x] 05-09-PLAN.md (Wave 3) - Scoped agents (Investigation, Case, ComplianceManager)
- [x] 05-10-PLAN.md (Wave 4) - Action catalog with preview-then-execute pattern
- [x] 05-11-PLAN.md (Wave 4) - WebSocket gateway and REST controller for AI API

### Phase 6: Case Management

**Goal**: Complete the Case lifecycle - investigation workflows with templates, structured interviews, remediation plans, subject tracking, and two-way anonymous communication.
**Depends on**: Phase 4 (needs Case/RIU entities), Phase 5 (needs AI for summaries)
**Requirements**: INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, INV-07, INV-08, CLIENT-01, CLIENT-02, CLIENT-03, UX-01, UX-02, UX-03, UX-04, UX-05, UX-06
**Success Criteria** (what must be TRUE):

1. Investigators can use category-specific templates with pre-populated checklists
2. Structured interviews can be recorded with template questions and linked to investigations
3. Remediation plans track steps with assignees, due dates, and completion status
4. Two-way anonymous communication works via relay without revealing reporter identity
5. Users can create and save custom filtered views across Cases and RIUs
   **Demo Data Checkpoint** (Acme Co. additions):

- Investigation templates for each category (Harassment, Fraud, Ethics Violation, etc.)
- Sample structured interviews linked to active investigations
- Remediation plans with steps at various completion states
- Anonymous messages in relay queue awaiting response
- 5+ saved views demonstrating filter combinations
  **Plans**: 17 plans in 5 waves

Plans:

- [ ] 06-01-PLAN.md (Wave 1) - Investigation template model and service with versioning
- [ ] 06-02-PLAN.md (Wave 1) - Structured interview model and service
- [ ] 06-03-PLAN.md (Wave 1) - Remediation plan and step models with DAG validation
- [ ] 06-04-PLAN.md (Wave 1) - Saved views infrastructure with filter persistence
- [ ] 06-05-PLAN.md (Wave 1) - Custom properties infrastructure for tenant-configurable fields
- [ ] 06-06-PLAN.md (Wave 2) - Template assignment by category with recommendation logic
- [ ] 06-07-PLAN.md (Wave 2) - Checklist progress tracking with item completion
- [ ] 06-08-PLAN.md (Wave 2) - Remediation step assignment and notifications
- [ ] 06-09-PLAN.md (Wave 2) - Anonymous message relay with PII detection
- [ ] 06-10-PLAN.md (Wave 3) - Unified search enhancement with custom properties
- [ ] 06-11-PLAN.md (Wave 3) - Activity timeline service and component
- [ ] 06-12-PLAN.md (Wave 3) - AI infrastructure polish (WebSocket E2E, auth integration)
- [ ] 06-13-PLAN.md (Wave 4) - Case list page with advanced filtering and saved views
- [ ] 06-14-PLAN.md (Wave 4) - Case detail page with linked RIUs and tabs
- [ ] 06-15-PLAN.md (Wave 4) - Investigation detail page with checklist panel
- [ ] 06-16-PLAN.md (Wave 5) - Keyboard shortcuts and command palette
- [ ] 06-17-PLAN.md (Wave 5) - Final integration and human verification checkpoint

### Phase 7: Notifications & Email

**Goal**: Deliver event-driven notifications through multiple channels (email, in-app) with user preferences, template management, and delivery tracking.
**Depends on**: Phase 1 (needs event bus, job queues), Phase 4 (needs entities to notify about)
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05
**Success Criteria** (what must be TRUE):

1. Users receive email notifications for case assignments, status changes, and SLA breaches
2. In-app notification center shows unread count and allows mark-as-read
3. Users can configure notification preferences per event type (email, in-app, none)
4. Failed email deliveries retry with exponential backoff and log to delivery tracking
5. Notification templates support entity context rendering (case title, due date, assignee)
   **Demo Data Checkpoint** (Acme Co. additions):

- Notification history for demo users (mix of read/unread)
- Email delivery records with various statuses (sent, bounced, opened)
- Configured notification preferences for different demo users
- Daily digest configurations demonstrating aggregation
  **Plans**: 8 plans in 4 waves

Plans:

- [x] 07-01-PLAN.md (Wave 1) - Database schema: Notification, NotificationPreference, NotificationDelivery, OrgNotificationSettings models
- [x] 07-02-PLAN.md (Wave 1) - Email template service with MJML and Handlebars integration
- [x] 07-03-PLAN.md (Wave 2) - Notification preference service with 5-min cache and org enforcement
- [x] 07-04-PLAN.md (Wave 2) - NotificationService core and event listeners (case, SLA, workflow)
- [x] 07-05-PLAN.md (Wave 3) - In-app notification WebSocket gateway with tenant-isolated rooms
- [x] 07-06-PLAN.md (Wave 3) - Daily digest service with smart aggregation and scheduling
- [x] 07-07-PLAN.md (Wave 3) - Delivery tracking service and email processor (replaces Phase 1 placeholder)
- [x] 07-08-PLAN.md (Wave 4) - REST API controllers for notifications and preferences

### Phase 8: Portals

**Goal**: Launch the three user-facing portals - Ethics Portal (anonymous reporting), Employee Portal (self-service), and Operator Console (hotline intake with AI assistance).
**Depends on**: Phase 4 (needs RIU/Case/Campaign entities), Phase 5 (needs AI for note cleanup), Phase 7 (needs notifications)
**Requirements**: ETHIC-01, ETHIC-02, ETHIC-03, ETHIC-04, ETHIC-05, ETHIC-06, EMP-01, EMP-02, EMP-03, EMP-04, EMP-05, EMP-06, OPER-01, OPER-02, OPER-03, OPER-04, OPER-05, OPER-06, OPER-07, OPER-08
**Success Criteria** (what must be TRUE):

1. Anonymous reporters can submit reports and receive access codes without logging in
2. Anonymous reporters can check status and exchange messages using only their access code
3. Employees can log in via SSO and see their reports, disclosures, attestations, and tasks
4. Managers can submit proxy reports on behalf of employees
5. Operators can load client profiles by phone number and create RIUs with AI-assisted note cleanup
   **Demo Data Checkpoint** (Acme Co. additions):

- Hotline-sourced RIUs with operator notes and AI-cleaned narratives
- QA queue items at various review states
- Employee self-service report history for demo employees
- Manager proxy reports demonstrating escalation flow
  **Plans**: 17 plans in 7 waves

Plans:

- [x] 08-01-PLAN.md (Wave 1) - White-label branding service with CSS custom properties
- [x] 08-02-PLAN.md (Wave 1) - Directives service for client-specific operator scripts
- [x] 08-03-PLAN.md (Wave 1) - Client profile service with phone lookup and QA config
- [x] 08-04-PLAN.md (Wave 1) - Employee tasks aggregation service
- [x] 08-05-PLAN.md (Wave 2) - Ethics Portal API endpoints for public report submission
- [x] 08-06-PLAN.md (Wave 2) - Employee Portal history views and manager proxy
- [x] 08-07-PLAN.md (Wave 2) - Operator Console intake and QA queue APIs
- [x] 08-08-PLAN.md (Wave 3) - Ethics Portal PWA setup with offline storage and i18n
- [x] 08-09-PLAN.md (Wave 3) - Operator Console layout and client lookup UI
- [x] 08-10-PLAN.md (Wave 4) - Anonymous report submission UI
- [x] 08-11-PLAN.md (Wave 4) - Status check and messaging UI
- [x] 08-12-PLAN.md (Wave 4) - White-label theming integration and home page
- [x] 08-13-PLAN.md (Wave 5) - Employee dashboard with role-aware tabs
- [x] 08-14-PLAN.md (Wave 5) - Manager proxy reporting UI
- [x] 08-15-PLAN.md (Wave 6) - Hotline intake form with AI note cleanup
- [x] 08-16-PLAN.md (Wave 6) - QA queue and review UI
- [x] 08-17-PLAN.md (Wave 7) - Final integration and verification checkpoint

### Phase 9: Campaigns & Disclosures

**Goal**: Enable outbound compliance campaigns - COI disclosures, gift tracking, outside employment, attestations - with threshold-based auto-case creation and conflict detection.
**Depends on**: Phase 4 (needs Campaign entity), Phase 7 (needs notifications for reminders), Phase 8 (needs Employee Portal for submission)
**Requirements**: RS.22-RS.60 (Disclosure Forms, Thresholds, Conflicts, Campaign Engine, AI Triage)
**Success Criteria** (what must be TRUE):

1. Compliance officers can create campaigns targeting employees by business unit, location, or role
2. Employees receive campaign assignments and can complete disclosure forms
3. Gift disclosures exceeding configured thresholds automatically create Cases for review
4. Conflict detection flags potential issues across a person's disclosure history
5. Campaign dashboards show completion rates, overdue counts, and send reminders
   **Demo Data Checkpoint** (Acme Co. additions):

- 3 years of COI disclosure campaigns with 85% completion rates
- Gift disclosures including threshold breaches that created Cases
- Outside employment disclosures with conflict flags
- Repeat non-responders and late completers for reminder demos
- Flagged conflicts awaiting review
  **Plans**: 17 plans in 5 waves

Plans:

- [x] 09-01-PLAN.md (Wave 1) - Disclosure form schema engine (Prisma models, field types, DTOs)
- [x] 09-02-PLAN.md (Wave 2) - Form template CRUD service with version-on-publish
- [x] 09-03-PLAN.md (Wave 1) - Threshold configuration engine with json-rules-engine
- [x] 09-04-PLAN.md (Wave 1) - Conflict detection service with fuzzy matching
- [x] 09-05-PLAN.md (Wave 2) - Conflict surfacing and dismissal API
- [x] 09-06-PLAN.md (Wave 2) - Disclosure submission service orchestrating all services
- [x] 09-07-PLAN.md (Wave 1) - Campaign targeting service (mom-test UX)
- [x] 09-08-PLAN.md (Wave 1) - Campaign scheduling with waves and blackouts
- [x] 09-09-PLAN.md (Wave 2) - Reminder sequence engine with repeat non-responder tracking
- [x] 09-10-PLAN.md (Wave 2) - Campaign translation service with stale detection
- [x] 09-11-PLAN.md (Wave 3) - SchemaIntrospectionService + AI triage with preview-then-execute
- [x] 09-12-PLAN.md (Wave 3) - User-created tables feature
- [x] 09-13-PLAN.md (Wave 2) - Campaign enhanced controller and dashboard service
- [x] 09-14-PLAN.md (Wave 4) - Form builder UI with drag-drop sections
- [x] 09-15-PLAN.md (Wave 4) - Campaign builder UI with segment builder
- [x] 09-16-PLAN.md (Wave 4) - Disclosure submission UI with auto-save
- [x] 09-17-PLAN.md (Wave 5) - Conflict review UI with entity timeline

### Phase 10: Policy Management

**Goal**: Complete policy lifecycle - document management with versioning, approval workflows, attestation campaigns, and AI-powered translation.
**Depends on**: Phase 4 (needs Campaign entity for attestations), Phase 5 (needs AI for translation), Phase 9 (shares Campaign infrastructure)
**Requirements**: POL-01, POL-02, POL-03, POL-04, POL-05, POL-06, POL-07, CLIENT-04, CLIENT-05, CLIENT-06, CLIENT-07
**Success Criteria** (what must be TRUE):

1. Compliance officers can create policies with rich text content and publish versions
2. Approval workflows route policy changes through configured reviewers before publishing
3. Attestation campaigns distribute policies to employees and track read/acknowledge status
4. AI translation preserves the original while creating localized versions
5. Policy violations can be linked to Cases for tracking
   **Demo Data Checkpoint** (Acme Co. additions):

- 50+ policies with version history (Code of Conduct, Anti-Harassment, Gift Policy, etc.)
- Policies in approval workflow at various stages
- Completed attestation campaigns with read/acknowledge tracking
- Policy-linked Cases showing violation tracking
- Multi-language policy translations (Spanish, French, German, Mandarin)
  **Plans**: 11 plans in 5 waves

Plans:

- [x] 10-01-PLAN.md (Wave 1) - Policy database schema with versioning infrastructure
- [x] 10-02-PLAN.md (Wave 2) - Policy service with version-on-publish pattern
- [x] 10-03-PLAN.md (Wave 2) - Approval workflow integration using WorkflowEngine
- [x] 10-04-PLAN.md (Wave 3) - Attestation campaigns from published policies
- [x] 10-05-PLAN.md (Wave 3) - AI-powered policy translation service
- [x] 10-06-PLAN.md (Wave 3) - Policy-to-case linking for violation tracking
- [x] 10-07-PLAN.md (Wave 3) - Policy search with Elasticsearch indexing
- [x] 10-08-PLAN.md (Wave 4) - Policy management UI (list, editor)
- [x] 10-09-PLAN.md (Wave 4) - Policy detail page with version history and translations
- [x] 10-10-PLAN.md (Wave 5) - User management and RBAC UI
- [x] 10-11-PLAN.md (Wave 5) - Organization settings UI

### Phase 11: Analytics & Reporting

**Goal**: Deliver data-driven insights - pre-built dashboards, custom dashboard builder, board reports, AI natural language queries, flat file exports, and scheduled report delivery.
**Depends on**: All previous phases (needs data volume), Phase 5 (needs AI for NL queries)
**Requirements**: ANAL-01, ANAL-02, ANAL-03, ANAL-04, ANAL-05, ANAL-06, ANAL-07, ANAL-08, PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, PROJ-06, MIG-01, MIG-02, MIG-03, MIG-04, MIG-05, MIG-06, MIG-07, FLAT-01
**Success Criteria** (what must be TRUE):

1. Pre-built dashboards show KPIs for RIUs, Cases, Campaigns, and overall compliance health
2. Users can build custom dashboards by dragging and configuring widgets
3. AI responds to natural language queries like "show me harassment cases from Q4 in EMEA"
4. Board reports generate as PDFs with executive summaries and trend charts
5. "My Work" unified queue aggregates tasks from Cases, Investigations, Disclosures, and Policies
6. Flat file export produces denormalized "everything" file with configurable tagged fields
   **Demo Data Checkpoint** (Acme Co. additions):

- Sample dashboards with realistic KPIs and trend charts
- Scheduled reports configured for weekly delivery
- Board report templates with executive summaries
- Tagged field configurations for flat file exports
- Sample AI-generated tables saved to dashboards
  **Plans**: 21 plans

Plans:

- [x] 11-01-PLAN.md (Wave 1) - Dashboard configuration infrastructure: Prisma models, DashboardConfigService
- [x] 11-02-PLAN.md (Wave 1) - My Work unified task queue: TaskAggregatorService, MyWorkController
- [x] 11-03-PLAN.md (Wave 1) - Flat file export infrastructure: ExportJob, ReportFieldTag, FlatFileService
- [x] 11-04-PLAN.md (Wave 1) - Migration infrastructure: MigrationJob, MigrationFieldTemplate, MigrationService
- [x] 11-05-PLAN.md (Wave 2) - Widget data service and pre-built widgets: CCO, Investigator, Campaign Manager dashboards
- [x] 11-06-PLAN.md (Wave 2) - PDF and PPTX generation: Puppeteer, pptxgenjs, BoardReportService
- [x] 11-07-PLAN.md (Wave 2) - Excel streaming export: ExcelExportService, FlatExportProcessor
- [x] 11-08-PLAN.md (Wave 2) - AI natural language queries: AiQueryService, QueryToPrismaService with field whitelisting
- [x] 11-09-PLAN.md (Wave 2) - Migration connectors base: BaseMigrationConnector abstract class
- [x] 11-10-PLAN.md (Wave 3) - Dashboard controller: CRUD, scheduled refresh, DashboardGrid component
- [x] 11-11-PLAN.md (Wave 3) - Migration controller and processor: MigrationController, MigrationProcessor
- [x] 11-12-PLAN.md (Wave 3) - Scheduled exports: ScheduledExport model, ScheduledExportService, cron processor
- [x] 11-13-PLAN.md (Wave 4) - Project milestones: Milestone, MilestoneItem models, MilestoneService
- [x] 11-14-PLAN.md (Wave 4) - Gantt chart visualization: GanttChart component, timeline utilities
- [x] 11-15-PLAN.md (Wave 3) - Migration file upload: MigrationUploadService with format auto-detection
- [x] 11-16-PLAN.md (Wave 3) - Screenshot-to-form AI: ScreenshotToFormService using Claude vision API
- [x] 11-17-PLAN.md (Wave 4) - NAVEX import connector: NavexConnector with NAVEX-specific mappings
- [x] 11-18-PLAN.md (Wave 4) - EQS/Conversant import connector: EqsConnector with EQS-specific mappings
- [x] 11-19-PLAN.md (Wave 4) - Generic CSV import: CsvConnector, MappingSuggestionService
- [x] 11-20-PLAN.md (Wave 5) - Import preview and rollback: MigrationProcessor with validate/preview/import/rollback
- [x] 11-21-PLAN.md (Wave 5) - Flat file export with tagged fields: TaggedFieldService, FlatExportBuilder UI

### Phase 11.1: Frontend Navigation and UI Fixes (INSERTED)

**Goal**: Add main navigation sidebar and fix broken case detail tabs so the demo environment is fully navigable and functional.
**Depends on**: Phase 11 (uses existing frontend infrastructure)
**Requirements**: URGENT - Demo environment needs navigation for sales demos
**Success Criteria** (what must be TRUE):

1. Main navigation sidebar visible on all authenticated pages with links to all modules
2. Mobile bottom navigation bar on small screens
3. Case detail Messages, Files, and Remediation tabs display real data (not placeholders)
4. /campaigns page shows campaign list with filters
5. /analytics page shows stats dashboard
   **Plans**: 6 plans in 3 waves

Plans:

- [x] 11.1-01-PLAN.md (Wave 1) - shadcn/ui Sidebar infrastructure and authenticated layout
- [x] 11.1-02-PLAN.md (Wave 1) - Mobile bottom navigation and AI panel shell
- [x] 11.1-03-PLAN.md (Wave 2) - Case tab data wiring: Messages and Files
- [x] 11.1-04-PLAN.md (Wave 2) - Case tab data wiring: Remediation with drag-reorder
- [x] 11.1-05-PLAN.md (Wave 3) - Campaigns list page with filters and table
- [x] 11.1-06-PLAN.md (Wave 3) - Analytics page with Dashboards/Reports tabs

### Phase 12: Internal Operations Portal

**Goal**: Build the internal tooling for Ethico teams - Support Console for issue diagnosis and client access, Implementation Portal for onboarding and migrations, Hotline Operations for directive management and QA, and Client Success Dashboard for health monitoring.
**Depends on**: Phase 11 (needs analytics infrastructure), Phase 8 (needs existing portal patterns)
**Requirements**: OPS-01 (Support Console), OPS-02 (Implementation Portal), OPS-03 (Hotline Operations), OPS-04 (Client Success), TECH-DEBT (accumulated items)
**Success Criteria** (what must be TRUE):

1. Support team can impersonate client accounts with full audit trail
2. Implementation specialists can run data migrations with validation, preview, and 7-day rollback
3. Hotline team can edit directives, bulk-manage QA queue, and reassign cases
4. Client Success can view tenant health scores, usage metrics, and adoption tracking
5. All cross-tenant operations require elevated permissions and produce audit logs
   **Demo Data Checkpoint** (Acme Co. additions):

- Sample implementation project with checklist tracking
- Migration job history with various statuses
- Directive configurations for multiple categories
- Client health metrics and usage trends
  **Plans**: 19 plans in 5 waves

Plans:

- [x] 12-01-PLAN.md (Wave 1) - Cross-tenant access infrastructure: ImpersonationService, ElevatedAccessGuard, audit logging
- [x] 12-02-PLAN.md (Wave 1) - Implementation project models: ImplementationProject, ImplementationTask, ImplementationBlocker
- [x] 12-03-PLAN.md (Wave 1) - Client health metrics: TenantHealthScore, UsageMetric, FeatureAdoption models
- [x] 12-04-PLAN.md (Wave 2) - Support Console service: cross-tenant search, error log viewer, config inspector
- [x] 12-05-PLAN.md (Wave 2) - Implementation checklist service: templates, task tracking, phase milestones
- [x] 12-06-PLAN.md (Wave 2) - Migration wizard service: file upload, AI field mapping, validation, preview
- [x] 12-07-PLAN.md (Wave 2) - Hotline operations service: directive CRUD, bulk QA actions, case reassignment
- [x] 12-08-PLAN.md (Wave 3) - Client success service: health calculation, usage aggregation, renewal risk
- [x] 12-09-PLAN.md (Wave 3) - Training administration: certification tracks, progress tracking, exam management
- [x] 12-10-PLAN.md (Wave 3) - Go-live readiness: checklist engine, readiness score, sign-off workflow
- [x] 12-11-PLAN.md (Wave 4) - Support Console UI: tenant switcher, error viewer, config browser
- [x] 12-12-PLAN.md (Wave 4) - Implementation Portal UI: project dashboard, checklist tracker, blocker board
- [x] 12-13-PLAN.md (Wave 4) - Migration Wizard UI: upload, mapping, preview, import, verify steps
- [x] 12-14-PLAN.md (Wave 4) - Hotline Operations UI: directive editor, QA dashboard, assignment tools
- [x] 12-15-PLAN.md (Wave 5) - Client Success UI: health dashboard, usage charts, adoption metrics
- [x] 12-16-PLAN.md (Wave 5) - Training Portal UI: course catalog, certification status, exam interface
- [x] 12-17-PLAN.md (Wave 5) - Internal admin settings: feature flags, tenant config, system health
- [x] 12-18-PLAN.md (Tech Debt) - Backend tech debt: WebSocket E2E, auth edge cases, query optimization
- [x] 12-19-PLAN.md (Tech Debt) - Frontend tech debt: bundle splitting, lazy loading, accessibility audit

### Phase 13: HubSpot-Style Saved Views System

**Goal**: Implement a reusable HubSpot-style Saved Views system across all pillar modules (Cases, Investigations, Disclosures, Intake Forms, Policies) with view tabs, column selection, advanced filters, table/board views, and sharing capabilities.
**Depends on**: Phase 12 (builds on existing module pages), Phase 6 (saved views infrastructure exists)
**Requirements**: Full specification in `.planning/hubspot-view-system-spec.md`
**Success Criteria** (what must be TRUE):

1. Users can create up to 50 saved views per module with custom columns, filters, and sort
2. View tabs are draggable to reorder, with context menu for rename/clone/share/delete
3. Column Selection Modal with searchable grouped columns, drag-to-reorder, frozen column support
4. Advanced Filters slide-out with AND conditions within groups, OR between groups (max 2 groups, 20 conditions each)
5. Real-time filter application updates table live as conditions change
6. Table view with sortable/resizable columns, checkbox selection, bulk actions, pagination (25/50/100)
7. Board/Kanban view toggle with drag-to-move cards between status lanes
8. Export to Excel/CSV respecting current filters and column selection
9. View sharing with private/team/everyone visibility scopes
10. URL state sync for bookmarkable/shareable view links
    **Demo Data Checkpoint** (Acme Co. additions):

- Pre-built default views for each module (All Records, My Records, Recently Created, etc.)
- Sample saved views demonstrating filter combinations
- Team-shared views for compliance team
  **Plans**: 16 plans in 5 waves

Plans:

- [x] 13-01-PLAN.md (Wave 1) - Extend SavedView Prisma model with frozenColumnCount, viewMode, boardGroupBy, recordCount fields
- [x] 13-02-PLAN.md (Wave 1) - Install @tanstack/react-table, create types.ts, operators.ts, constants.ts, view-config.ts
- [x] 13-03-PLAN.md (Wave 1) - Create SavedViewProvider context, useSavedViewContext hook, useSavedViewsApi hooks
- [x] 13-04-PLAN.md (Wave 2) - Create ViewTabsBar, SortableViewTab, ViewTabContextMenu, AddViewButton, CreateViewDialog
- [x] 13-05-PLAN.md (Wave 2) - Create ViewToolbar, ViewModeToggle, SaveButton, SortButton, ExportButton
- [x] 13-06-PLAN.md (Wave 2) - Create ColumnSelectionModal with PropertyPicker and SelectedColumnsList
- [x] 13-07-PLAN.md (Wave 2) - Create QuickFiltersRow with DateRangeFilter, MultiSelectFilter, QuickFilterDropdown
- [x] 13-08-PLAN.md (Wave 3) - Create AdvancedFiltersPanel slide-out with FilterGroupCard and FilterConditionRow
- [x] 13-09-PLAN.md (Wave 3) - Create DataTable with TanStack Table, PaginationBar, BulkActionsBar
- [x] 13-10-PLAN.md (Wave 3) - Create BoardView with BoardColumn and BoardCard (drag-drop with @dnd-kit)
- [x] 13-11-PLAN.md (Wave 4) - Cases module integration: config, hook, and page update
- [x] 13-12-PLAN.md (Wave 4) - Investigations and Policies module integration
- [x] 13-13-PLAN.md (Wave 4) - Disclosures and Intake Forms module integration
- [x] 13-14-PLAN.md (Wave 5) - URL state sync with useViewUrlState hook, enhanced BulkActionsBar
- [x] 13-15-PLAN.md (Wave 5) - Demo data seeder for saved views, verification checkpoint

### Phase 13.1: Saved Views Fixes (INSERTED)

**Goal**: Fix UAT issues discovered during Phase 13 verification - board view functionality, investigations endpoint, search, and export.
**Depends on**: Phase 13 (HubSpot-Style Saved Views)
**Requirements**: UAT gaps documented in `.planning/phases/13-hubspot-style-saved-views-system/13-UAT.md`
**Success Criteria** (what must be TRUE):

1. Board view cards display priority badge and owner avatar in lanes
2. Board view drag-and-drop persists status changes to database
3. Investigations page loads investigation data in table
4. Search box filters cases without hiding all data
5. Export button downloads Excel and CSV files respecting current filters
   **Plans**: 1 plan

Plans:

- [x] 13.1-01-PLAN.md (Wave 1) - Board view fixes, investigations endpoint, search vector population, export endpoints

### Phase 14: Critical Bug Fixes & Navigation

**Goal**: Fix all broken routes (404s), non-functional UI elements (buttons, menus, search), runtime errors, and visual inconsistencies that make the application appear unfinished. These are the quick wins that immediately improve demo-readiness.
**Depends on**: Phase 11.1 (frontend navigation infrastructure), Phase 12 (all backend services exist)
**Requirements**: Issues documented in `.planning/V1-ISSUES-AND-GAPS.md` Phase 14 section
**Success Criteria** (what must be TRUE):

1. Audit Log link navigates to a working audit log page (not 404)
2. Notifications "View All" navigates to a working notifications list page (not 404)
3. Dashboard "View All Tasks" navigates to the tasks page (not 404)
4. Clicking a case in "My Tasks" or "My Active Cases" navigates to the correct case detail page
5. Dashboard "Create Case" quick action opens a working case creation form without Select.Item errors
6. Global search bar returns results and navigates to them
7. User dropdown menu links (Profile, Settings, Logout) all function correctly
8. User display name in top-right updates correctly per logged-in session
9. Top navigation bar matches side navigation bar styling (both dark)
10. Ethico "E" logo displays in the top-left corner (not generic placeholder)
11. Dashboard "My Active Cases" loads within 2 seconds (not hanging)
    **Plans**: 5 plans in 2 waves

Plans:

- [x] 14-01-PLAN.md (Wave 1) — Top nav & sidebar overhaul: auth context, logout, Ethico SVG logo, dark nav theme
- [x] 14-02-PLAN.md (Wave 1) — Create /notifications and /my-work pages (fix 404s)
- [x] 14-03-PLAN.md (Wave 1) — Create /search and /profile pages, fix SelectItem empty string error
- [x] 14-04-PLAN.md (Wave 1) — Dashboard performance (reduce fetch limit), task navigation, audit log verification
- [x] 14-05-PLAN.md (Wave 2) — Verification checkpoint: automated checks + human verification of all 11 fixes

### Phase 14.1: Data & Config Fixes (INSERTED)

**Goal**: Address data seeding and configuration issues discovered during Phase 14 verification — notifications, search indexing, category dropdowns, task aggregation, and audit log access. These are not code bugs but missing data/infrastructure setup.
**Depends on**: Phase 14 (code fixes complete)
**Requirements**: Issues identified in Phase 14-05 verification
**Success Criteria** (what must be TRUE):

1. Notifications page shows seeded notification records (not empty)
2. Search returns results for seeded cases, policies, investigations
3. Category dropdowns in case creation form are populated
4. My Tasks shows tasks for logged-in demo user (task aggregation queries work)
5. Audit log is accessible for demo admin user

**Plans**: 4 plans in 2 waves

Plans:

- [x] 14.1-01-PLAN.md (Wave 1) — Notification seeder for demo users (50-100 per user, diverse types)
- [x] 14.1-02-PLAN.md (Wave 1) — Wire activity.seeder.ts into seed.ts (audit log data)
- [x] 14.1-03-PLAN.md (Wave 1) — Demo user case ownership for My Tasks (createdById assignment)
- [x] 14.1-04-PLAN.md (Wave 2) — Verification checkpoint: re-seed and human verification of all 5 fixes

### Phase 14.2: Case Creation & Search Fixes (INSERTED)

**Goal**: Add missing Category/Subcategory dropdowns to case creation form and fix unified search returning empty results.
**Depends on**: Phase 14.1 (pagination fixes complete)
**Requirements**: Issues identified in Phase 14.1 human verification
**Success Criteria** (what must be TRUE):

1. Case creation form shows Category dropdown with all level-0 categories
2. Subcategory dropdown populates based on selected category (level-1 categories)
3. Created cases have correct primaryCategoryId and secondaryCategoryId
4. Unified search returns results for case content (e.g., "harassment")
5. Unified search returns results for case numbers (e.g., "CASE-2025")

**Plans**: 3 plans in 2 waves

Plans:

- [x] 14.2-01-PLAN.md (Wave 1) — Categories API endpoint and frontend integration
- [x] 14.2-02-PLAN.md (Wave 1) — PostgreSQL FTS fallback for unified search
- [x] 14.2-03-PLAN.md (Wave 2) — Verification checkpoint

### Phase 15: Case Detail Page Overhaul

**Goal**: Rebuild the case detail page into a three-column layout that serves as the primary workspace for investigators — with a complete activity feed, action buttons, AI panel, and connected entity cards. This is the page where users spend 80% of their time.
**Depends on**: Phase 14 (routes must work), Phase 6 (case entities, activity timeline), Phase 4 (person/RIU associations)
**Requirements**: Issues documented in `.planning/V1-ISSUES-AND-GAPS.md` Phase 15 section
**Success Criteria** (what must be TRUE):

1. Case detail page renders a three-column layout: left (1x), center (2x), right (1x)
2. Left column shows case number, high-level info (date created, status, pipeline, days open), action buttons (Note, Interview, Document, Task, Email), and RIU-specific form answers organized by section
3. Center column has working tabs: Overview (lifecycle info, recent/upcoming activities), Activities (descending feed of ALL interactions — tasks, notes, meetings, emails, calls, documents), Summary (AI-written or manual summary + full write-up)
4. Right column shows cards for connected documents and connected people (witness, subject) with "Add" button that pulls from HRIS or free-form
5. "Assign" button opens a modal with available users to assign the case to
6. "Status" button lets users change case status including close/resolve
7. "Merge" button opens case merge workflow
8. Email button lets users compose and send an email from the case page, logging it to the activity feed; users can also log external emails (sent from inbox) to the case
9. AI button slides out a panel over the right column where users can ask questions and AI can modify statuses/add notes directly to the activity feed
10. Any change to fields or status automatically appears in the activity feed
11. All case tabs (Overview, Investigations, Messages, Files, Activities, Remediation) switch content correctly
12. Seeded Acme Co. case details are 200-400 words; summaries are 50-75 words
    **Demo Data Checkpoint** (Acme Co. additions):

- Updated case seed data with 200-400 word details and 50-75 word summaries
- Activity feed entries (notes, status changes, assignments) on flagship cases
- Connected people and documents on flagship cases
  **Plans**: 11 plans in 4 waves (7 original + 4 gap closure)

Plans:

- [x] 15-01-PLAN.md (Wave 1) — Backend API gaps: merge endpoints, person-case association controller
- [x] 15-07-PLAN.md (Wave 1) — Seed data enhancement: 200-400 word details, 50-75 word summaries, activities
- [x] 15-02-PLAN.md (Wave 2) — Three-column grid layout + left column (CaseInfoSummary, ActionButtonRow)
- [x] 15-03-PLAN.md (Wave 2) — Center column tabs: fix activity API path, add Summary tab, enhance Overview
- [x] 15-04-PLAN.md (Wave 3) — Action modals: Assign, Status, Merge, AddNote, EmailLog wired to APIs
- [x] 15-05-PLAN.md (Wave 3) — Right column: ConnectedPeople, ConnectedDocuments, AddPerson modal
- [x] 15-06-PLAN.md (Wave 4) — AI slide-out panel with WebSocket streaming chat
- [x] 15-08-PLAN.md (Gap Closure Wave 1) — Quick action modals: Interview, Document, Task
- [x] 15-09-PLAN.md (Gap Closure Wave 1) — RIU form answers display in Overview tab
- [x] 15-10-PLAN.md (Gap Closure Wave 1) — AI case note action and human verification checkpoint
- [x] 15-11-PLAN.md (Gap Closure) — Email compose/send deferral documentation

### Phase 16: AI Integration Fix

**Goal**: Debug and fix the non-functional AI system end-to-end — from API connectivity to frontend panel. AI is a core differentiator; it must work reliably for demos.
**Depends on**: Phase 5 (AI infrastructure — backend services, skills, agents, WebSocket gateway), Phase 14 (navigation working so AI panel is reachable)
**Requirements**: Issues documented in `.planning/V1-ISSUES-AND-GAPS.md` Phase 16 section
**Success Criteria** (what must be TRUE):

1. Claude API calls succeed from the backend (ANTHROPIC_API_KEY configured and working)
2. AI panel slide-out opens on case detail page and accepts user queries
3. AI responds to natural language questions about case data within 5 seconds
4. AI can execute actions: update case status, add notes to activity feed, generate summaries
5. AI note cleanup (bullet → narrative) works on case and investigation notes
6. AI category suggestion works on new RIU intake
7. AI risk scoring returns confidence-scored assessments
8. WebSocket /ai namespace connects successfully from frontend
9. AI conversations are persisted and can be resumed
10. AI features degrade gracefully when API key is missing or rate-limited
    **Plans**: 8 plans in 5 waves (6 original + 2 gap closure/verification)

**Important:** See `.planning/phases/16-ai-integration-fix/16-EXECUTION-NOTES.md` for Phase 15 overlap guidance.

Plans:

- [ ] 16-01-PLAN.md (Wave 1) — Backend REST chat endpoint, auth guard, context-loader fallback
- [ ] 16-02-PLAN.md (Wave 2) — **SKIP** - Phase 15 built ai-chat-panel.tsx
- [ ] 16-03-PLAN.md (Wave 2) — **SKIP** - Phase 15 installed socket.io-client and WebSocket
- [ ] 16-04-PLAN.md (Wave 3) — AI skill components (summarize, category-suggest, risk-score)
- [ ] 16-05-PLAN.md (Wave 3) — AI action preview components (Tasks 1-2 only)
- [ ] 16-06-PLAN.md (Wave 4) — AI health check endpoint (Task 1 only)
- [ ] 16-07-PLAN.md (Wave 1) — Execution notes documenting Phase 15 overlap
- [ ] 16-08-PLAN.md (Wave 5) — End-to-end verification checkpoint

### Phase 17: Campaigns Hub

**Goal**: Build a centralized campaigns area where all outbound compliance campaigns (disclosures, attestations, stay interviews, distributed forms) live, can be edited, released, and tracked. Includes a link to view/manage all form types.
**Depends on**: Phase 9 (campaign backend — targeting, scheduling, reminders, disclosures), Phase 14 (routes working), Phase 1 (form/schema engine)
**Requirements**: Issues documented in `.planning/V1-ISSUES-AND-GAPS.md` Phase 17 section
**Success Criteria** (what must be TRUE):

1. Centralized /campaigns page shows all campaigns across types (disclosures, attestations, stay interviews, other forms) with filters and status
2. Users can create new campaigns from the hub with type selection
3. Campaign detail page allows editing all aspects: audience, schedule, form content, reminders
4. Campaigns can be released/published from the detail page and status tracked
5. Users can create new forms (form builder accessible from campaigns hub)
6. Dedicated "Forms" section accessible from sidebar showing all RIU types: disclosures, hotline intake, surveys, proxy forms, web intake
7. Campaign dashboard shows completion rates, overdue counts, and allows sending reminders
8. Form builder supports creating/editing custom disclosure and attestation forms
   **Demo Data Checkpoint** (Acme Co. additions):

- Active and completed campaigns visible in hub
- Draft campaign ready for editing demonstration
- Multiple form types available in Forms section
  **Plans**: 4 plans in 2 waves

Plans:

- [ ] 17-01-PLAN.md (Wave 1) — Backend dashboard endpoints + sidebar navigation + /campaigns/new page
- [ ] 17-02-PLAN.md (Wave 1) — Campaign detail page with overview, assignments, lifecycle actions
- [ ] 17-03-PLAN.md (Wave 1) — Forms hub with list, create, and edit pages wrapping existing FormBuilder
- [ ] 17-04-PLAN.md (Wave 2) — Demo data seeding and verification checkpoint

### Phase 18: Reports & Data Management

**Goal**: Build a report designer UI so users can create custom reports from all platform data, with AI-assisted natural language report generation, pre-built templates, and scheduled delivery.
**Depends on**: Phase 11 (reporting engine backend — QueryBuilder, Excel export, PDF generation), Phase 13 (saved views for column selection patterns), Phase 4 (core entities provide the data)
**Requirements**: Issues documented in `.planning/V1-ISSUES-AND-GAPS.md` Phase 18 section
**Success Criteria** (what must be TRUE):

1. Report designer page allows users to create custom reports by selecting data source, columns, filters, grouping, and chart type
2. All case fields (including custom properties) are available as report columns and filter/sort dimensions
3. All RIU fields, person fields, campaign fields, and policy fields are reportable
4. Reports can be saved with a name and re-run on demand
5. Reports can be exported to Excel/CSV/PDF
6. Pre-built report templates exist for common compliance reports (case volume by category, time-to-close trends, disclosure completion rates)
7. Scheduled report delivery works (email on schedule)
8. AI natural language queries generate reports from questions like "show me harassment cases from Q4 in EMEA"
   **Plans**: 9 plans in 5 waves

Plans:

- [x] 18-01-PLAN.md (Wave 1) — SavedReport Prisma model, ReportFieldRegistryService, DTOs
- [x] 18-02-PLAN.md (Wave 1) — ReportExecutionService and ReportService CRUD
- [x] 18-03-PLAN.md (Wave 2) — ReportController REST API and ReportModule wiring
- [x] 18-04-PLAN.md (Wave 2) — Pre-built report templates and demo data seeder
- [x] 18-05-PLAN.md (Wave 3) — Report list page, TypeScript types, API client
- [x] 18-06-PLAN.md (Wave 3) — Report designer wizard (5-step: data source, fields, filters, visualization, save)
- [x] 18-07-PLAN.md (Wave 4) — Report detail page with chart/table/KPI visualizations (recharts)
- [x] 18-08-PLAN.md (Wave 4) — AI report generation dialog and ExportButton backend wiring
- [x] 18-09-PLAN.md (Wave 5) — Scheduled report delivery UI and backend schedule endpoints

### Phase 19: Workflow Engine UI

**Goal**: Build the visual workflow builder and management area. The workflow engine (Phase 1 backend) powers case assignments, approval routing, and disclosure approvals — but currently there is no UI to create, edit, or apply workflows. This is critical operational infrastructure.
**Depends on**: Phase 1 (workflow engine backend — pipeline/stage/transition models), Phase 14 (routes working), Phase 6 (case management workflows), Phase 10 (policy approval workflows)
**Requirements**: Issues documented in `.planning/V1-ISSUES-AND-GAPS.md` Phase 19 section
**Success Criteria** (what must be TRUE):

1. Dedicated Workflows section accessible from sidebar/settings
2. Workflow list page shows all workflows with type, status, and where applied
3. Visual workflow builder allows creating workflows with stages, transitions, conditions, and actions
4. Workflow builder supports: sequential stages, parallel branches, conditional routing, approval gates
5. Workflows can be applied to: case assignment/routing, approval routing, disclosure approval routing, policy approval routing
6. Existing workflow templates (case investigation pipeline, policy approval) are editable
7. Workflow execution shows current state and progress on case/policy detail pages
8. Changes to workflow definitions handle in-flight instances correctly (version-on-publish pattern per Phase 1 decisions)
   **Plans**: 7 plans in 4 waves

Plans:

- [x] 19-01-PLAN.md (Wave 1) — Backend API gaps: list instances, clone template, version history, instance count enrichment
- [x] 19-02-PLAN.md (Wave 1) — Frontend foundation: install @xyflow/react, TypeScript types, API service, React Query hooks, navigation
- [x] 19-03-PLAN.md (Wave 2) — Workflow list page with table, filters, row actions, create dialog
- [x] 19-04-PLAN.md (Wave 2) — Visual workflow builder canvas with React Flow: custom stage nodes, transition edges, drag-from-palette
- [x] 19-05-PLAN.md (Wave 3) — Property panels, toolbar, save/publish, create/edit page routes
- [x] 19-06-PLAN.md (Wave 3) — Workflow instances page with table, bulk actions, detail dialog, progress indicator
- [x] 19-07-PLAN.md (Wave 4) — Entity detail integration (case/policy workflow cards) and Acme Co. demo seed data

### Phase 20: Settings Overhaul (HubSpot-Style)

**Goal**: Rebuild the settings area to match HubSpot's organization and depth — four major sections (Preferences, Account Management, Data Management, Tools) each with sub-pages and tabs. Includes critical permission set management.
**Depends on**: Phase 14 (route fixes), Phase 19 (workflow settings), Phase 7 (notification preferences backend), Phase 3 (auth/security settings), Phase 12 (audit log backend)
**Requirements**: Issues documented in `.planning/V1-ISSUES-AND-GAPS.md` Phase 20 section. Reference HubSpot knowledge base for UX patterns.
**Success Criteria** (what must be TRUE):

1. Settings area has four top-level sections: Your Preferences, Account Management, Data Management, Tools
2. **Your Preferences > General**: Profile editing, email connection (link inbox to system, manage signatures), security (password reset, passkey setup, account deletion), task settings
3. **Your Preferences > Notifications**: Per-event-type control of email and desktop notifications (matching HubSpot's notification settings pattern)
4. **Account Management > Account Defaults**: Org-wide default settings
5. **Account Management > Audit Log**: Working audit log page (not 404) with filterable event history
6. **Account Management > Users & Teams**: Super admin can manage users, seats, teams, and **permission sets** with role-based templates (research HubSpot permission sets — templates for different roles with granular permissions)
7. **Account Management > Integrations**: Integration configuration page (HRIS, email, etc.)
8. **Account Management > Approvals**: Approval workflow configuration
9. **Account Management > AI Settings**: AI feature toggles, API key management, usage limits
10. **Data Management > Properties**: Users can add/edit custom properties on objects and groups (HubSpot-style property management with field types, groups, required/optional)
11. **Data Management > Objects**: View and configure platform objects (Forms, Cases, Investigations, Policies, Tickets, Disclosures, RIUs)
12. Each sub-page has tabs for different components of that section
    **Plans**: 6 plans in 4 waves

Plans:

- [x] 20-01-PLAN.md (Wave 1) — Settings hub restructure & user profile page
- [x] 20-02-PLAN.md (Wave 1) — User notification preferences page
- [x] 20-03-PLAN.md (Wave 2) — Account management pages (defaults, approvals, permission sets)
- [x] 20-04-PLAN.md (Wave 2) — Integrations & AI settings pages
- [x] 20-05-PLAN.md (Wave 3) — Data management: properties & objects pages
- [x] 20-06-PLAN.md (Wave 4) — Settings navigation polish & verification

### Phase 21: Project Management (Monday.com-Style)

**Goal**: Build a comprehensive Monday.com-style project management module with Kanban boards, Gantt timelines with dependency arrows, conversation threads with @mentions, 15 custom column types, workload views, project dashboards, file attachments, subscriber notifications, and real-time WebSocket collaboration. This is a full reproduction of Monday.com's core experience within the Risk Intelligence Platform.
**Depends on**: Phase 11 (project milestones backend exists from plans 11-13/11-14 — Milestone, MilestoneItem models, GanttChart component), Phase 14 (routes working)
**Requirements**: Issues documented in `.planning/V1-ISSUES-AND-GAPS.md` Phase 21 section. Research in `.planning/phases/21-project-management/21-RESEARCH.md`.
**Success Criteria** (what must be TRUE):

1. Projects section accessible from sidebar with project list (saved views, table + board)
2. Kanban board view with drag-to-move cards between status columns
3. Table/list view with sortable columns, inline editing, and group management
4. Timeline/Gantt view showing task scheduling with dependency arrows
5. Workload view showing team member capacity with overload indicators
6. Project dashboard with KPI cards, status charts, completion trends
7. Task detail panel with 4 tabs: Details, Updates (conversation thread), Activity, Files
8. @mention support in task conversations with user autocomplete
9. Threaded replies on task updates (one level deep)
10. File attachments with drag-and-drop upload on tasks
11. Subscriber/watcher system controlling notification delivery
12. 15 custom column types (status, people, date, timeline, text, numbers, dropdown, etc.)
13. Column center for adding/configuring/reordering columns per project
14. 5 event types dispatch preference-aware notifications (assignment, @mention, comment, status change, completion)
15. WebSocket real-time updates for project collaborators
16. Project tasks appear in My Work unified task queue
17. 6 system project templates for common compliance projects
18. Project templates with pre-populated groups and tasks
    **Demo Data Checkpoint** (Acme Co. additions):

- 5 projects at various stages (NOT_STARTED, IN_PROGRESS, AT_RISK, COMPLETED)
- Tasks distributed across team members with realistic compliance scenarios
- Conversation threads with @mentions and threaded replies
- Task dependencies creating realistic chains
- Custom columns demonstrating column flexibility
- File attachments and subscriber records
  **Plans**: 10 plans in 8 waves

Plans:

- [x] 21-01-PLAN.md (Wave 1) — Backend Prisma models: 4 new models (ProjectGroup, ProjectTask, ProjectColumn, ProjectTemplate), 15 column types, DTOs, 4 services
- [x] 21-02-PLAN.md (Wave 2) — Backend controllers: 13+ REST endpoints for tasks and groups, ProjectTemplateController with 5 endpoints, My Work integration
- [x] 21-03-PLAN.md (Wave 3) — Frontend project list page with saved views system (table + board), TypeScript types, view config, create dialog with template selector
- [x] 21-04-PLAN.md (Wave 4) — Frontend project detail: grouped task table with inline editing, group management, add-task row, basic task detail panel, 12 React Query hooks
- [x] 21-05-PLAN.md (Wave 5) — Frontend board view (drag-to-move between status columns) and timeline view (Gantt chart with SVG dependency arrows), view switching with URL persistence
- [x] 21-06-PLAN.md (Wave 6) — Rich task detail panel: 4 tabs (Details, Updates, Activity, Files), MentionInput with @mention autocomplete, TaskUpdateThread with threaded replies, TaskActivityLog, TaskFileList, TaskSubscriberList, TaskDependencyList
- [x] 21-07-PLAN.md (Wave 6) — Column configuration UI: ColumnCenterDialog with 15 column types, ColumnConfigPanel with type-specific settings, DynamicColumnCell rendering, drag-to-reorder headers, column resize
- [x] 21-08-PLAN.md (Wave 7) — @Mentions & notifications: MentionService extraction, 5 event handlers with preference-aware NotificationService dispatch, WebSocket project rooms for real-time collaboration, MentionInput accessibility
- [x] 21-09-PLAN.md (Wave 7) — Workload view (team capacity bars) and project dashboard (KPI cards, status chart, completion trend, group progress), backend stats endpoint, all 5 view modes integrated
- [x] 21-10-PLAN.md (Wave 8) — Demo data seeder (5 projects with custom columns; 6 templates). Note: conversation/dependency/subscriber seeding skipped (missing Prisma models)

### Phase 22: Dark Mode & Theme

**Goal**: Implement a working dark mode toggle and ensure consistent theming across the entire application. User explicitly flagged this as required for V1.
**Depends on**: Phase 14 (nav color fixes), Phase 20 (settings area for theme toggle placement)
**Requirements**: Issues documented in `.planning/V1-ISSUES-AND-GAPS.md` Phase 22 section
**Success Criteria** (what must be TRUE):

1. Dark mode toggle accessible from user menu and settings
2. All pages render correctly in dark mode (no unreadable text, broken contrast, missing backgrounds)
3. Dark mode preference persists across sessions (stored in user preferences)
4. System preference detection: auto-detect OS dark mode setting as default
5. Top navigation bar and side navigation bar are visually consistent in both light and dark modes
6. Charts, tables, modals, and form elements all respect the active theme
7. Theme transition is smooth (no flash of wrong theme on page load)
   **Plans**: 15 plans in 5 waves

Plans:

- [ ] 22-01-PLAN.md (Wave 1) — Install next-themes, wire ThemeProvider, suppressHydrationWarning, Sonner toast theme
- [ ] 22-02-PLAN.md (Wave 1) — ThemeToggle component in user menu, create lib/theme-colors.ts status color utility
- [ ] 22-03-PLAN.md (Wave 2) — Migrate status-badge + severity-badge to theme-colors.ts, fix UI primitive hardcoded colors
- [ ] 22-04-PLAN.md (Wave 2) — Theme navigation (top-nav, sidebar, mobile), layouts, and common components
- [ ] 22-05-PLAN.md (Wave 3) — Theme dashboard components and case layout/header/tabs/filters
- [ ] 22-06-PLAN.md (Wave 3) — Theme remaining case components (panels, timeline, forms, investigation-card)
- [ ] 22-07-PLAN.md (Wave 3) — Theme investigation components, DataTable frozen column shadows, board/view components
- [ ] 22-08-PLAN.md (Wave 3) — Theme policy components, analytics, Gantt chart hex colors, rich text editor
- [ ] 22-09-PLAN.md (Wave 4) — Theme ethics portal (20 components), tenant branding coordination, conflict review
- [ ] 22-10-PLAN.md (Wave 4) — Theme operator console (17 components, split-screen layout, QA queue)
- [ ] 22-11-PLAN.md (Wave 4) — Theme employee portal, campaigns, disclosure form builder/preview
- [ ] 22-12-PLAN.md (Wave 4) — Theme settings, users, implementation, exports, files, remaining views
- [ ] 22-13-PLAN.md (Wave 4) — Sweep all 43 page.tsx files for page-level hardcoded colors
- [ ] 22-14-PLAN.md (Wave 5) — Verification checkpoint: TypeScript compilation, all 7 success criteria verified
- [ ] 22-15-PLAN.md (Wave 5) — Fix DataTable column width flexibility (allow columns to expand and shrink dynamically)

### Phase 23: Help & Support System

**Goal**: Build a help and support system so users can access a knowledge base and file support tickets directly from the platform.
**Depends on**: Phase 14 (routes working for Help & Support navigation)
**Requirements**: Issues documented in `.planning/V1-ISSUES-AND-GAPS.md` Phase 23 section
**Success Criteria** (what must be TRUE):

1. Help & Support accessible from sidebar and user menu
2. Knowledge base with searchable articles organized by category (Getting Started, Cases, Campaigns, Reports, Settings, etc.)
3. Users can file support tickets from within the platform with subject, description, priority, and screenshots
4. Support ticket submission sends confirmation email and creates ticket in support system
5. Users can view their open tickets and status from the Help section
6. Contextual help links from relevant pages (e.g., case detail page links to "Working with Cases" articles)
   **Plans**: 5 plans in 4 waves

Plans:

- [ ] 23-01-PLAN.md (Wave 1) — Backend: Prisma models (KnowledgeBaseArticle, SupportTicket), NestJS help module with controllers, services, DTOs, event listener
- [ ] 23-02-PLAN.md (Wave 2) — Frontend: Help API service, sidebar footer link, top nav help dropdown
- [ ] 23-03-PLAN.md (Wave 2) — Frontend: Help center landing page, category grid, article search, article detail page
- [ ] 23-04-PLAN.md (Wave 3) — Frontend: Ticket submission form, my tickets list, email confirmation template
- [ ] 23-05-PLAN.md (Wave 4) — Seed data: 15+ knowledge base articles, contextual help link component, verification checkpoint

### Phase 24: Policy Content & Seed Data

**Goal**: Populate all seeded policies with properly formatted, realistic policy text. Update case seed data to meet content length requirements.
**Depends on**: Phase 10 (policy management — documents, rich text), Phase 2 (seed data infrastructure)
**Requirements**: Issues documented in `.planning/V1-ISSUES-AND-GAPS.md` Phase 24 section
**Success Criteria** (what must be TRUE):

1. All seeded policies (Code of Conduct, Anti-Harassment, Gift Policy, Whistleblower, etc.) contain properly formatted text with sections, headers, numbered lists, and definitions
2. Policy content reads like real enterprise compliance policies (professional language, legal-style formatting)
3. Policies have appropriate metadata: effective dates, review dates, owner, department
4. Case detail seed data: case descriptions are 200-400 words, case summaries are 50-75 words
5. Seed script is idempotent — running it again updates content without duplicating records
   **Plans:** 3 plans

Plans:

- [x] 24-01-PLAN.md — Replace 26 boilerplate policies with substantial unique content, expand ADDITIONAL policies, add status/date variety
- [x] 24-02-PLAN.md — Expand flagship case narratives to 200-400 words, fix AI summary generation to 50-75 words, enhance narrative templates
- [x] 24-03-PLAN.md — Enable policy seeder in orchestrator, add Phase 24 verification checks for content quality and lengths

### Phase 25: Case & Investigation Page Redesign

**Goal**: Restructure the Case Detail and Investigation Detail pages to follow HubSpot's three-column record pattern — answering "What is this?" (left), "What happened?" (center), and "Who/what is connected?" (right). The case page needs activity-first defaults, enhanced timeline, and new association cards. The investigation page needs a complete three-column conversion from its current single-column layout.
**Depends on**: Phase 15 (case detail page exists), Phase 6 (investigation detail page exists)
**Requirements**: Full specification in `docs/CASE-INVESTIGATION-PAGE-REDESIGN.md`
**Success Criteria** (what must be TRUE):

1. Case detail Activities tab is the default tab (not Overview)
2. Activity timeline has search bar, upcoming section (tasks/SLA pinned), date-grouped history (Today/Yesterday/This Week/etc.), and user/team filters
3. Quick action buttons use horizontal icon+label grid layout (not vertical ghost stack)
4. Right sidebar has association cards with count badges, gear icons, and "View all" links: Connected People, Linked RIUs, Related Cases, Related Policies, Connected Documents
5. Investigation page uses three-column layout matching case detail
6. Investigation has left sidebar with summary card, quick actions, and editable properties panel
7. Investigation has right sidebar with Connected People, Parent Case, Evidence cards
8. Investigation Activity tab is default, with real activity timeline (not placeholder)
9. Investigation Interviews and Files tabs are implemented (not placeholders)
10. Reusable shared components extracted: AssociationCard, ActivityTimeline, QuickActionGrid
    **Plans**: 6 plans in 5 waves

Plans:

- [ ] 25-01-PLAN.md (Wave 1) — Case tabs/activity timeline enhancement: reorder tabs, Activities default, search bar, upcoming section, date grouping, user/team filters
- [ ] 25-02-PLAN.md (Wave 1) — Quick actions grid and properties polish: QuickActionGrid shared component, LogCallModal, gear icons and chevron toggles
- [ ] 25-03-PLAN.md (Wave 2) — Right sidebar association cards: AssociationCard wrapper, RelatedCasesCard, RelatedPoliciesCard, LinkedRiusCard, refactor ConnectedPeopleCard/ConnectedDocumentsCard
- [ ] 25-04-PLAN.md (Wave 3) — Investigation three-column layout conversion: grid layout, header with breadcrumbs/badges, InvestigationInfoSummary, InvestigationActionButtons, InvestigationPropertiesPanel
- [ ] 25-05-PLAN.md (Wave 4) — Investigation activity timeline and tabs: InvestigationActivityTimeline, Activities default tab, InvestigationInterviewsTab, InvestigationFilesTab
- [ ] 25-06-PLAN.md (Wave 5) — Investigation right sidebar with human verification: ParentCaseCard, InvestigationEvidenceCard, ConnectedPeopleCard adaptation, AI Assistant button

---

## Progress

**Execution Order:**
Phases execute in dependency order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 11.1 → 12 → 13 → 13.1 → 14 → 14.1 → 14.2 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 25

> **Note on order**: Phase 13.1 fixes UAT gaps from Phase 13. Phase 14.1 fixes data seeding gaps from Phase 14. Phase 15 gap closure plans address verification failures.

| Phase                                   | Plans Complete | Status   | Completed  |
| --------------------------------------- | -------------- | -------- | ---------- |
| 1. Foundation Infrastructure            | 9/9            | Complete | 2026-02-02 |
| 2. Demo Tenant & Seed Data              | 7/7            | Complete | 2026-02-03 |
| 3. Authentication & SSO                 | 8/8            | Complete | 2026-02-03 |
| 4. Core Entities                        | 10/10          | Complete | 2026-02-03 |
| 5. AI Infrastructure                    | 11/11          | Complete | 2026-02-03 |
| 6. Case Management                      | 11/17          | Complete | 2026-02-04 |
| 7. Notifications & Email                | 8/8            | Complete | 2026-02-04 |
| 8. Portals                              | 17/17          | Complete | 2026-02-04 |
| 9. Campaigns & Disclosures              | 17/17          | Complete | 2026-02-04 |
| 10. Policy Management                   | 11/11          | Complete | 2026-02-05 |
| 11. Analytics & Reporting               | 21/21          | Complete | 2026-02-05 |
| 11.1. Frontend Navigation (INSERTED)    | 6/6            | Complete | 2026-02-05 |
| 12. Internal Operations Portal          | 19/19          | Complete | 2026-02-06 |
| 13. HubSpot-Style Saved Views           | 15/15          | Complete | 2026-02-07 |
| 13.1. Saved Views Fixes (INSERTED)      | 1/1            | Verified | 2026-02-09 |
| 14. Critical Bug Fixes & Navigation     | 5/5            | Complete | 2026-02-09 |
| 14.1. Data & Config Fixes (INSERTED)    | 4/4            | Complete | 2026-02-09 |
| 14.2. Case Creation & Search (INSERTED) | 3/3            | Complete | 2026-02-10 |
| 15. Case Detail Page Overhaul           | 11/11          | Verified | 2026-02-11 |
| 16. AI Integration Fix                  | 8/8            | Complete | 2026-02-11 |
| 17. Campaigns Hub                       | 4/4            | Complete | 2026-02-11 |
| 18. Reports & Data Management           | 9/9            | Complete | 2026-02-11 |
| 19. Workflow Engine UI                  | 7/7            | Complete | 2026-02-11 |
| 20. Settings Overhaul (HubSpot)         | 6/6            | Complete | 2026-02-12 |
| 21. Project Management (Monday.com)     | 10/10          | Complete | 2026-02-12 |
| 22. Dark Mode & Theme                   | 0/14           | Planned  | -          |
| 23. Help & Support System               | 0/5            | Planned  | -          |
| 24. Policy Content & Seed Data          | 3/3            | Complete | 2026-02-12 |
| 25. Case & Investigation Redesign       | 0/6            | Planned  | -          |

---

_Roadmap created: 2026-02-02_
_Updated: 2026-02-13 (Phase 25 planned — 6 plans in 5 waves)_
_Depth: Comprehensive_
_Total phases: 25 (+ 11.1 and decimal insertions)_
_Total plans: 242+ completed, ~25-35 estimated remaining_
_Total v1 requirements: 149 + QA punch list items_
_Issues reference: .planning/V1-ISSUES-AND-GAPS.md_
