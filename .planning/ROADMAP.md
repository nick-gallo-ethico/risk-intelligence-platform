# Roadmap: Ethico Risk Intelligence Platform

## Overview

This roadmap delivers a unified, AI-native compliance management platform ("HubSpot for Compliance") through 11 dependency-ordered phases. The architecture follows the RIU-Case pattern (immutable inputs to mutable work containers), with AI infrastructure built early so all features can leverage it. Foundation infrastructure (event bus, queues, audit) comes first, followed by demo tenant creation to serve as a continuous test bed, then core entities, portals, and advanced features. Every phase produces observable user value and maintains the demo tenant as living proof of capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation Infrastructure** - Event bus, job queues, audit logging, search infrastructure
- [ ] **Phase 2: Demo Tenant & Seed Data** - "Acme Co." demo with 3 years of realistic data as test bed
- [ ] **Phase 3: Authentication & SSO** - Multi-provider SSO, domain verification, MFA
- [ ] **Phase 4: Core Entities** - Person, RIU, Case, Campaign, Associations (HubSpot pattern)
- [ ] **Phase 5: AI Infrastructure** - Claude API integration, context hierarchy, skills registry, agents
- [ ] **Phase 6: Case Management** - Investigation workflows, templates, subjects, anonymous communication
- [ ] **Phase 7: Notifications & Email** - Event-driven notifications, templates, user preferences
- [ ] **Phase 8: Portals** - Ethics (anonymous), Employee (self-service), Operator Console
- [ ] **Phase 9: Campaigns & Disclosures** - COI, gifts, outside employment, attestations
- [ ] **Phase 10: Policy Management** - Documents, versioning, approval workflows, AI translation
- [ ] **Phase 11: Analytics & Reporting** - Dashboards, custom reports, natural language queries

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
**Plans**: TBD

Plans:
- [ ] 01-01: Event bus setup with @nestjs/event-emitter
- [ ] 01-02: BullMQ job queue infrastructure with Redis
- [ ] 01-03: Unified AUDIT_LOG service with natural language descriptions
- [ ] 01-04: Workflow engine with pipeline/stage/transition models
- [ ] 01-05: SLA tracking and assignment rules engine
- [ ] 01-06: Elasticsearch indexing pipeline and search service
- [ ] 01-07: Form/schema engine for dynamic forms
- [ ] 01-08: Reporting engine with query builder framework
- [ ] 01-09: File storage service with Azure Blob integration

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
**Plans**: TBD

Plans:
- [ ] 02-01: Demo tenant provisioning service and "Acme Co." organization
- [ ] 02-02: Seed data generator for employees, business units, locations
- [ ] 02-03: Historical RIU generator (all types, all sources, 3-year spread)
- [ ] 02-04: Historical Case generator with realistic investigation progression
- [ ] 02-05: Historical Campaign generator (disclosures, attestations)
- [ ] 02-06: Demo user accounts with role variety
- [ ] 02-07: Demo reset command and verification

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
**Plans**: TBD

Plans:
- [ ] 03-01: Azure AD passport strategy with JIT provisioning
- [ ] 03-02: Google OAuth passport strategy
- [ ] 03-03: SAML 2.0 generic strategy with IdP metadata
- [ ] 03-04: TenantDomain model and domain verification workflow
- [ ] 03-05: MFA/TOTP implementation with recovery codes
- [ ] 03-06: Rate limiting on auth endpoints
- [ ] 03-07: RLS policy verification for all new entities

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
**Plans**: TBD

Plans:
- [ ] 04-01: Person entity with types and sources
- [ ] 04-02: Employee fields and manager hierarchy
- [ ] 04-03: HRIS sync service with Merge.dev integration
- [ ] 04-04: RIU entity with immutability enforcement
- [ ] 04-05: RIU type-specific extension tables
- [ ] 04-06: RIU access code generation and status checking
- [ ] 04-07: Case entity enhancements (pipeline, merge support)
- [ ] 04-08: Campaign and CampaignAssignment entities
- [ ] 04-09: Association entities with role labels
- [ ] 04-10: Pattern detection queries and APIs

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
**Plans**: TBD

Plans:
- [ ] 05-01: Claude API integration with @anthropic-ai/sdk
- [ ] 05-02: AIProvider abstraction for multi-LLM support
- [ ] 05-03: Rate limiting per tenant with token bucket
- [ ] 05-04: Prompt versioning and template management
- [ ] 05-05: AI conversation logging (AI_CONVERSATION table)
- [ ] 05-06: Context hierarchy loading (platform/org/team/user/entity)
- [ ] 05-07: Note cleanup service
- [ ] 05-08: Summary generation service (case, investigation)
- [ ] 05-09: Category suggestion service (real-time)
- [ ] 05-10: Risk scoring service
- [ ] 05-11: Translation service with original preserved
- [ ] 05-12: Natural language query service
- [ ] 05-13: AI panel frontend component
- [ ] 05-14: Scoped agents and skills registry
- [ ] 05-15: Action catalog with permission validation
- [ ] 05-16: Preview-then-execute pattern
- [ ] 05-17: AI-triggered workflow actions (emails, stage changes)
- [ ] 05-18: Undo trail for reversible actions

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
**Plans**: TBD

Plans:
- [ ] 06-01: Investigation template model and builder
- [ ] 06-02: Category-specific template assignment
- [ ] 06-03: Structured interview model and UI
- [ ] 06-04: Remediation plan and step models
- [ ] 06-05: Remediation step assignment (users and non-users)
- [ ] 06-06: Subject model for pattern detection
- [ ] 06-07: Anonymous communication relay service
- [ ] 06-08: CaseMessage model and API
- [ ] 06-09: Client platform Case list with advanced filtering
- [ ] 06-10: Case detail view with linked RIUs
- [ ] 06-11: Investigation management UI enhancements
- [ ] 06-12: Saved views infrastructure
- [ ] 06-13: Custom properties (tenant-configurable fields)
- [ ] 06-14: Unified search across entities
- [ ] 06-15: Activity timeline component
- [ ] 06-16: Keyboard shortcuts

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
**Plans**: TBD

Plans:
- [ ] 07-01: Email service with Resend integration
- [ ] 07-02: Email template service with Handlebars
- [ ] 07-03: NotificationPreference model per user/event type
- [ ] 07-04: Event-driven notification triggers
- [ ] 07-05: In-app notification service with Socket.IO push
- [ ] 07-06: Notification center UI component
- [ ] 07-07: Delivery tracking and retry logic

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
**Plans**: TBD

Plans:
- [ ] 08-01: Anonymous report submission endpoint and UI
- [ ] 08-02: Access code generation and validation
- [ ] 08-03: Anonymous status checker and messaging
- [ ] 08-04: White-label branding configuration
- [ ] 08-05: PWA manifest and service worker
- [ ] 08-06: Multi-language support for Ethics Portal
- [ ] 08-07: Employee Portal SSO login with tenant routing
- [ ] 08-08: My reports view
- [ ] 08-09: My disclosures view
- [ ] 08-10: My attestations view
- [ ] 08-11: My tasks view
- [ ] 08-12: Manager proxy reporting UI
- [ ] 08-13: Operator phone-to-client lookup
- [ ] 08-14: Hotline intake form
- [ ] 08-15: Directives system (opening/closing statements)
- [ ] 08-16: Category-specific question triggering
- [ ] 08-17: Subject search (HRIS lookup + manual)
- [ ] 08-18: QA review queue and workflow
- [ ] 08-19: Follow-up handling via access code

### Phase 9: Campaigns & Disclosures
**Goal**: Enable outbound compliance campaigns - COI disclosures, gift tracking, outside employment, attestations - with threshold-based auto-case creation and conflict detection.
**Depends on**: Phase 4 (needs Campaign entity), Phase 7 (needs notifications for reminders), Phase 8 (needs Employee Portal for submission)
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07
**Success Criteria** (what must be TRUE):
  1. Compliance officers can create campaigns targeting employees by business unit, location, or role
  2. Employees receive campaign assignments and can complete disclosure forms
  3. Gift disclosures exceeding configured thresholds automatically create Cases for review
  4. Conflict detection flags potential issues across a person's disclosure history
  5. Campaign dashboards show completion rates, overdue counts, and send reminders
**Plans**: TBD

Plans:
- [ ] 09-01: COI disclosure form template
- [ ] 09-02: Gifts & entertainment tracking form
- [ ] 09-03: Outside employment disclosure form
- [ ] 09-04: Threshold configuration and auto-case rules
- [ ] 09-05: Conflict detection service
- [ ] 09-06: Approval workflow for flagged disclosures
- [ ] 09-07: Disclosure history per Person
- [ ] 09-08: Campaign builder UI enhancements
- [ ] 09-09: Campaign dashboard with completion tracking

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
**Plans**: TBD

Plans:
- [ ] 10-01: Policy entity with rich text content
- [ ] 10-02: Policy version control and history
- [ ] 10-03: Approval workflow integration
- [ ] 10-04: Attestation campaign creation from policy
- [ ] 10-05: AI translation service integration
- [ ] 10-06: Policy-to-case linking
- [ ] 10-07: Policy search with Elasticsearch
- [ ] 10-08: Policy management UI (list, editor, history)
- [ ] 10-09: User management and RBAC UI
- [ ] 10-10: Organization settings UI

### Phase 11: Analytics & Reporting
**Goal**: Deliver data-driven insights - pre-built dashboards, custom dashboard builder, board reports, AI natural language queries, and scheduled report delivery.
**Depends on**: All previous phases (needs data volume), Phase 5 (needs AI for NL queries)
**Requirements**: ANAL-01, ANAL-02, ANAL-03, ANAL-04, ANAL-05, ANAL-06, ANAL-07, ANAL-08, PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, PROJ-06, MIG-01, MIG-02, MIG-03, MIG-04, MIG-05, MIG-06, MIG-07
**Success Criteria** (what must be TRUE):
  1. Pre-built dashboards show KPIs for RIUs, Cases, Campaigns, and overall compliance health
  2. Users can build custom dashboards by dragging and configuring widgets
  3. AI responds to natural language queries like "show me harassment cases from Q4 in EMEA"
  4. Board reports generate as PDFs with executive summaries and trend charts
  5. "My Work" unified queue aggregates tasks from Cases, Investigations, Disclosures, and Policies
**Plans**: TBD

Plans:
- [ ] 11-01: Pre-built dashboards (RIU, Case, Campaign, Compliance)
- [ ] 11-02: Custom dashboard builder infrastructure
- [ ] 11-03: Widget library (charts, tables, KPIs)
- [ ] 11-04: Robust dataset builder for custom queries
- [ ] 11-05: PDF report generation with Puppeteer
- [ ] 11-06: Excel export with streaming (ExcelJS)
- [ ] 11-07: Board report templates
- [ ] 11-08: AI natural language query endpoint
- [ ] 11-09: Scheduled report delivery
- [ ] 11-10: Unified "My Work" queue service
- [ ] 11-11: Task aggregation from all modules
- [ ] 11-12: Priority-based ordering with due dates
- [ ] 11-13: Project milestones and tracking
- [ ] 11-14: Gantt chart visualization
- [ ] 11-15: Migration file upload service
- [ ] 11-16: Screenshot-to-form AI assistant
- [ ] 11-17: NAVEX import connector
- [ ] 11-18: EQS/Conversant import connector
- [ ] 11-19: Generic CSV import with field mapping
- [ ] 11-20: Import preview and rollback

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation Infrastructure | 0/9 | Not started | - |
| 2. Demo Tenant & Seed Data | 0/7 | Not started | - |
| 3. Authentication & SSO | 0/7 | Not started | - |
| 4. Core Entities | 0/10 | Not started | - |
| 5. AI Infrastructure | 0/18 | Not started | - |
| 6. Case Management | 0/16 | Not started | - |
| 7. Notifications & Email | 0/7 | Not started | - |
| 8. Portals | 0/19 | Not started | - |
| 9. Campaigns & Disclosures | 0/9 | Not started | - |
| 10. Policy Management | 0/10 | Not started | - |
| 11. Analytics & Reporting | 0/20 | Not started | - |

---
*Roadmap created: 2026-02-02*
*Depth: Comprehensive (8-12 phases)*
*Total phases: 11*
*Total plans: 132 (estimated)*
*Total v1 requirements: 149*
