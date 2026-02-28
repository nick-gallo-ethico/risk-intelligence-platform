# Roadmap: Ethico Risk Intelligence Platform

## Overview

This roadmap delivers a unified, AI-native compliance management platform ("HubSpot for Compliance") through 51 dependency-ordered phases across 4 milestones. The architecture follows the RIU-Case pattern (immutable inputs to mutable work containers), with AI infrastructure built early so all features can leverage it. Foundation infrastructure (event bus, queues, audit) comes first, followed by demo tenant creation to serve as a continuous test bed, then core entities, portals, and advanced features. Every phase produces observable user value and maintains the demo tenant as living proof of capability.

## Milestones

- **v1.0 Feature Build** - Phases 1-25.1, 242+ plans (shipped 2026-02-13)
- **v1.1 Code Review Remediation** - Phases 26-31, 43 plans (shipped 2026-02-15)
- **v1.2 Production Hardening & Features** - Phases 32-39, 57 plans (shipped 2026-02-20)
- **v2.0 PRD Feature Parity & Intelligence Layer** - Phases 40-51 (in progress)

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

<details>
<summary>v1.0 Feature Build (Phases 1-25.1) - SHIPPED 2026-02-13</summary>

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
- [x] **Phase 14.1: Data & Config Fixes** - Notifications seed data, search indexing, category dropdowns, task aggregation fixes (INSERTED)
- [x] **Phase 14.2: Case Creation & Search Fixes** - Category/subcategory dropdowns in case creation, unified search fix (INSERTED)
- [x] **Phase 15: Case Detail Page Overhaul** - Three-column layout, activity feed, action buttons, AI panel, connected entities (gap closure complete)
- [x] **Phase 16: AI Integration Fix** - Debug and fix non-functional AI, wire AI panel, enable AI actions on cases
- [x] **Phase 17: Campaigns Hub** - Centralized campaigns area, form creation, campaign lifecycle management
- [x] **Phase 18: Reports & Data Management** - Report designer UI, field availability, export from views
- [x] **Phase 19: Workflow Engine UI** - Visual workflow builder, workflow management section, apply to cases/approvals/disclosures
- [x] **Phase 20: Settings Overhaul (HubSpot-Style)** - Preferences, account management, data management, properties, permission sets
- [x] **Phase 21: Project Management (Monday.com-Style)** - Kanban boards, task views, timelines, project tracking
- [x] **Phase 24: Policy Content & Seed Data** - Populate policies with properly formatted text, improve case seed data
- [x] **Phase 25: Case & Investigation Page Redesign** - HubSpot three-column record pattern for case and investigation detail pages
- [x] **Phase 25.1: Case Detail Page Vision Revision** - Rebuild case detail page to match revised HubSpot-style spec with pipeline bar, collapsible property cards, Activities tab pattern, and config-driven architecture

</details>

<details>
<summary>v1.1 Code Review Remediation (Phases 26-31) - SHIPPED 2026-02-15</summary>

- [x] **Phase 26: Emergency Fixes** - Critical import errors blocking startup
- [x] **Phase 27: Security Hardening** - Auth guards, session management, CORS, body limits
- [x] **Phase 28: Production Readiness** - Container, health checks, Key Vault, graceful shutdown
- [x] **Phase 29: Error Handling & Reliability** - NestJS exceptions, error boundaries, toast notifications
- [x] **Phase 30: Test Coverage Foundation** - Auth, core entities, campaigns/policies, frontend MSW
- [x] **Phase 31: Code Quality & Performance** - Service decomposition, JWT RS256, Elasticsearch circuit breaker

</details>

<details>
<summary>v1.2 Production Hardening & Features (Phases 32-39) - SHIPPED 2026-02-20</summary>

- [x] **Phase 22: Dark Mode & Theme** - Dark mode toggle, consistent nav theming, theme system
- [x] **Phase 23: Help & Support System** - Knowledge base, in-platform ticket filing, real-time support
- [x] **Phase 32: Security & SOC 2 Fixes** - Auth bypass fixes, JWT algorithm pinning, WebSocket auth, MFA persistence
- [x] **Phase 33: Slop Cleanup & Production Readiness** - Orphaned modules, dead code, MIME validation, placeholder removal
- [x] **Phase 34: Performance & Scalability** - Unbounded queries, Redis caching, connection pooling, N+1 fixes
- [x] **Phase 35: Code Quality & Architecture** - Fat service splits, any type replacement, strict mode, null safety
- [x] **Phase 36: Test Coverage Expansion** - Auth guards/strategies, impersonation, E2E isolation, 26.4% backend coverage (3.3x from 7.9%)
- [x] **Phase 37: Critical Integration Fixes** - RedisCacheModule registration, batch reminder wiring, JwtWsGuard cleanup
- [x] **Phase 38: Dark Mode Gap Closure** - Migrate 323 hardcoded colors, settings toggle, DataTable/modal dark variants
- [x] **Phase 39: Frontend Test Repair** - Fix 56 case-detail test failures from Phase 25.1 refactor

</details>

### v2.0 PRD Feature Parity & Intelligence Layer (In Progress)

**Milestone Goal:** Close all gaps between PRD specifications and the built platform across 6 waves, transforming it from a solid CRUD system into the "AI-first HubSpot for Compliance" described in the PRDs.

- [ ] **Phase 40: Rules Engine Foundation** - Auto-routing rules, round-robin assignment, status auto-derivation, rule testing
- [ ] **Phase 41: SLA Monitoring & Escalation** - SLA warnings/breaches, escalation triggers, configurable timeouts
- [ ] **Phase 42: Anonymous Communication Relay** - Chinese Wall messaging, access codes, reporter visibility levels
- [ ] **Phase 43: RAG Infrastructure** - pgvector embeddings, document chunking, semantic search, embedding abstraction
- [ ] **Phase 44: Employee Chatbot** - Floating widget, policy Q&A with citations, confidence tiers, FAQ database
- [ ] **Phase 45: Enhanced AI Features** - Note cleanup preview, pattern detection alerts, trend identification
- [ ] **Phase 46: Disclosure Automation Foundation** - Rolling campaigns, auto-clear/reject rules, bulk operations, proxy delegation
- [ ] **Phase 47: External Parties & GT&E** - External party entity, gift aggregation, currency conversion, location rules
- [ ] **Phase 48: Portal Completeness** - Manager dashboard, employee timeline, operator AI suggestions, ethics portal enhancements
- [ ] **Phase 49: PWA & Push Notifications** - Service worker, offline forms, push notifications, tenant-scoped caching
- [ ] **Phase 50: Analytics & Data Compliance** - Fact tables, dashboard builder, scheduled reports, GDPR deletion, virus scan
- [ ] **Phase 51: Enterprise Branding & Deployment** - Custom domains, fonts, email domains, Terraform IaC

## Phase Details

### Phase 40: Rules Engine Foundation

**Goal**: Enable admins to create routing rules that auto-assign cases and configure rule testing against historical data, establishing the foundation for all automation features.
**Depends on**: Phase 1 (json-rules-engine already installed), Phase 4 (Case entity), Phase 5 (Event-driven architecture)
**Requirements**: RULE-01, RULE-02, RULE-06, RULE-07, RULE-08, RULE-09
**Success Criteria** (what must be TRUE):

1. Admin can create routing rules with conditions (location, category, severity) and actions (assign to user/team)
2. Admin can configure round-robin assignment distribution across a team
3. Case status auto-derives from investigation states (all investigations closed = case moves to review)
4. Admin can preview/test rules against historical cases before activating
5. System logs all rule executions with outcome for audit trail

**Plans:** 8 plans in 4 waves

Plans:

- [ ] 40-01-PLAN.md - RuleDefinition + RuleExecutionLog Prisma models, RulesModule, DTOs
- [ ] 40-02-PLAN.md - RulesEngineService with json-rules-engine integration, condition/action types
- [ ] 40-03-PLAN.md - Routing rule evaluation on case.created event, assignment actions
- [ ] 40-04-PLAN.md - Round-robin assignment strategy with team distribution tracking
- [ ] 40-05-PLAN.md - Case status auto-derivation from investigation states via event listeners
- [ ] 40-06-PLAN.md - Rule preview/testing service with historical data simulation
- [ ] 40-07-PLAN.md - Rules management UI (list, create, edit, test, activate)
- [ ] 40-08-PLAN.md - Verification checkpoint with demo data

### Phase 41: SLA Monitoring & Escalation

**Goal**: Enable proactive case management through SLA warnings, breach notifications, and configurable escalation triggers.
**Depends on**: Phase 40 (rules engine foundation), Phase 7 (notification infrastructure)
**Requirements**: RULE-03, RULE-04, RULE-05
**Success Criteria** (what must be TRUE):

1. System monitors case SLAs and sends warning notification at 80% of target duration
2. System sends breach notification when case SLA is exceeded
3. Admin can configure escalation triggers (e.g., "if HIGH severity and unassigned >4hrs, escalate to CCO")
4. Escalation rules integrate with existing rules engine and notification system

**Plans:** 6 plans in 5 waves

Plans:

- [ ] 41-01-PLAN.md - SLA configuration model, CaseSlaConfig type, SlaConfigService
- [ ] 41-02-PLAN.md - CaseSlaTrackerService with warning notifications at 80% threshold
- [ ] 41-03-PLAN.md - SLA breach and critical detection with escalation notifications
- [ ] 41-04-PLAN.md - EscalationService, EscalationTriggerListener, EscalateToRoleAction
- [ ] 41-05-PLAN.md - Admin UI for SLA thresholds and escalation rules link
- [ ] 41-06-PLAN.md - Verification checkpoint with demo data and E2E testing

### Phase 42: Anonymous Communication Relay

**Goal**: Enable two-way communication between investigators and anonymous reporters via a Chinese Wall relay that protects reporter identity.
**Depends on**: Phase 6 (case management), Phase 7 (email notifications), Phase 8 (ethics portal)
**Requirements**: RELAY-01, RELAY-02, RELAY-03, RELAY-04, RELAY-05, RELAY-06, RELAY-07
**Success Criteria** (what must be TRUE):

1. Investigator can send message to anonymous reporter via relay (PII stripped from investigator message)
2. Anonymous reporter can reply to investigator messages via ethics portal using access code
3. System sends email notification to reporter (if email provided) with random 1-6hr delay to prevent timing attacks
4. Access code is emailed to reporter on RIU creation (if email provided)
5. Admin can configure reporter visibility levels per tenant (Minimal, Standard, Detailed, Transparent)
6. Message thread displays in ethics portal status page with read receipts
7. All relay messages logged to audit trail with sender/receiver roles (not identities for anonymous)

**Plans**: TBD

Plans:

- [ ] 42-01: RelayMessage model, ReporterVisibilityLevel tenant config, relay DTOs
- [ ] 42-02: MessageRelayService with PII detection and stripping
- [ ] 42-03: Access code email delivery on RIU creation
- [ ] 42-04: Delayed notification batching (1-6hr random delay) via BullMQ
- [ ] 42-05: Ethics portal message thread UI with read receipts
- [ ] 42-06: Investigator message composition UI in case detail
- [ ] 42-07: Reporter visibility level configuration UI
- [ ] 42-08: Relay audit logging and verification checkpoint

### Phase 43: RAG Infrastructure

**Goal**: Build the vector search foundation that powers all AI intelligence features - document embeddings, semantic search, and embedding model abstraction.
**Depends on**: Phase 5 (AI infrastructure), Phase 10 (policy documents)
**Requirements**: RAG-01, RAG-02, RAG-03, RAG-04, RAG-05
**Success Criteria** (what must be TRUE):

1. pgvector extension enabled with separate DocumentEmbedding table (explicit organizationId, not RLS-dependent for vector queries)
2. Admin can upload knowledge base documents (PDF, DOCX, TXT) that are chunked and embedded
3. Policy documents auto-embed on publish (chunked by section)
4. Semantic search returns relevant document chunks with similarity scores, filtered by tenant
5. Embedding model abstraction layer supports swapping providers without re-indexing schema changes

**Plans**: 8 plans in 4 waves

Plans:

- [ ] 43-01-PLAN.md — pgvector extension, DocumentEmbedding table with explicit organizationId
- [ ] 43-02-PLAN.md — EmbeddingService abstraction with Voyage AI provider
- [ ] 43-03-PLAN.md — Document chunking strategies (section-based for policies, activity-based for cases)
- [ ] 43-04-PLAN.md — VectorStoreService with similarity search and tenant filtering
- [ ] 43-05-PLAN.md — Knowledge base document upload with chunk/embed pipeline
- [ ] 43-06-PLAN.md — Policy auto-embedding on publish via event listener
- [ ] 43-07-PLAN.md — Hybrid search combining Elasticsearch keyword + pgvector semantic
- [ ] 43-08-PLAN.md — Verification checkpoint with performance benchmarks

### Phase 44: Employee Chatbot

**Goal**: Deploy an AI chatbot that answers policy questions with citations, handles case status checks, and escalates appropriately.
**Depends on**: Phase 43 (RAG infrastructure), Phase 8 (portals)
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-08, CHAT-09, CHAT-10
**Success Criteria** (what must be TRUE):

1. Floating chatbot widget available on Ethics Portal (no login required)
2. Floating chatbot widget available on Employee Portal (authenticated)
3. Chatbot answers policy questions with specific section citations and links
4. High confidence responses (>85%) show direct answer with source
5. Medium confidence responses (50-85%) show clarifying questions with confidence indicator
6. Low confidence responses (<50%) offer one-click escalation to compliance team
7. Chatbot can check case status via access code (anonymous reporters)
8. Consent capture before first chatbot interaction per session
9. Full chatbot transcript stored for audit with conversation entity linkage
10. FAQ database with curated answers that chatbot references before RAG fallback

**Plans**: TBD

Plans:

- [ ] 44-01: EmployeeChatbotAgent with PolicySearchSkill, CaseStatusSkill, DisclosureGuideSkill
- [ ] 44-02: FAQ model and FAQ management service with priority over RAG
- [ ] 44-03: Confidence-tiered response formatting (High/Medium/Low)
- [ ] 44-04: One-click escalation to compliance team (creates async inquiry)
- [ ] 44-05: Consent capture modal and session tracking
- [ ] 44-06: Case status lookup via access code (anonymous-safe)
- [ ] 44-07: Floating chatbot widget component for Ethics Portal
- [ ] 44-08: Floating chatbot widget for Employee Portal (authenticated context)
- [ ] 44-09: Chatbot transcript storage with conversation entity linkage
- [ ] 44-10: FAQ management UI and verification checkpoint

### Phase 45: Enhanced AI Features

**Goal**: Deliver advanced AI capabilities - note cleanup with preview, cross-case pattern detection, trend identification, and pattern-based escalation.
**Depends on**: Phase 43 (RAG), Phase 40 (rules engine), Phase 44 (chatbot escalation)
**Requirements**: AIEX-01, AIEX-02, AIEX-03, AIEX-04, AIEX-05
**Success Criteria** (what must be TRUE):

1. Note cleanup tool shows before/after preview (bullet points to formal narrative)
2. Cross-case pattern detection alerts when same subject appears in 3+ cases
3. Pattern-based escalation combines rules engine with detection (e.g., "5+ cases in 90 days = auto-escalate")
4. AI trend identification surfaces statistical changes (e.g., "Harassment reports up 40% in Manufacturing")
5. One-click escalation from chatbot creates async inquiry for compliance team

**Plans:** 9 plans in 5 waves

Plans:

- [ ] 45-01-PLAN.md - Note cleanup diff component with word-level before/after view
- [ ] 45-02-PLAN.md - PatternAlert model and PatternAlertService with deduplication
- [ ] 45-03-PLAN.md - Nightly pattern detection BullMQ processor per tenant
- [ ] 45-04-PLAN.md - Real-time pattern alert listener on case creation
- [ ] 45-05-PLAN.md - Pattern-based escalation rule operators and action
- [ ] 45-06-PLAN.md - TrendAnalysisService with period-over-period statistics
- [ ] 45-07-PLAN.md - Trend dashboard widget with visual indicators
- [ ] 45-08-PLAN.md - Pattern alert dashboard with acknowledge/dismiss workflow
- [ ] 45-09-PLAN.md - Verification checkpoint with demo data

### Phase 46: Disclosure Automation Foundation

**Goal**: Automate disclosure workflows with rolling campaigns, auto-clear/reject rules, bulk operations, and enhanced approval workflows.
**Depends on**: Phase 9 (campaigns & disclosures), Phase 40 (rules engine), Phase 4 (HRIS sync)
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08
**Success Criteria** (what must be TRUE):

1. Rolling campaigns auto-trigger on HRIS events (NEW_HIRE, ROLE_CHANGE, PROMOTION, ANNUAL_ANNIVERSARY)
2. Admin can configure auto-clear rules (e.g., "nothing to disclose" auto-completes without review)
3. Admin can configure auto-reject rules based on answer patterns
4. Compliance officer can bulk approve/reject up to 100 disclosures at once
5. System sends condition reminders at 14, 7, 3, and 1 day before due date
6. Admin can configure multi-stage approval workflows for disclosures (up to 4 stages)
7. Admin can set up proxy delegation (delegate authority with scope and validity period)
8. Campaign can be paused and resumed by admin

**Plans**: TBD

Plans:

- [ ] 46-01: RollingCampaignService with HRIS event triggers via hris.sync.completed listener
- [ ] 46-02: HRIS sync completion fence to prevent race conditions
- [ ] 46-03: Auto-clear and auto-reject rule configuration and evaluation
- [ ] 46-04: Bulk disclosure operations (approve/reject up to 100)
- [ ] 46-05: Condition reminder scheduling at 14/7/3/1 days
- [ ] 46-06: Multi-stage approval workflow for disclosures (up to 4 stages)
- [ ] 46-07: Proxy delegation model and service with scope and validity
- [ ] 46-08: Campaign pause/resume functionality
- [ ] 46-09: Rolling campaign UI and configuration
- [ ] 46-10: Verification checkpoint

### Phase 47: External Parties & GT&E

**Goal**: Complete gift and entertainment tracking with external party management, aggregation, currency conversion, and location-specific rules.
**Depends on**: Phase 46 (disclosure automation), Phase 9 (existing disclosure infrastructure)
**Requirements**: DISC-09, DISC-10, DISC-11, DISC-12
**Success Criteria** (what must be TRUE):

1. External party entity with type, risk rating, aliases, tax ID, government/sanctioned flags
2. GT&E transactions aggregate across gifts from same external party for threshold enforcement
3. Currency conversion with daily exchange rates for multi-currency GT&E
4. Location-specific disclosure rules (state/country thresholds for government officials)

**Plans**: TBD

Plans:

- [ ] 47-01: ExternalParty model with type, risk rating, aliases, government flags
- [ ] 47-02: GT&E aggregation service for same-party threshold enforcement
- [ ] 47-03: Currency conversion service with daily exchange rate refresh
- [ ] 47-04: Location-specific rule configuration for government official thresholds
- [ ] 47-05: External party management UI
- [ ] 47-06: GT&E reporting with aggregated views
- [ ] 47-07: Verification checkpoint

### Phase 48: Portal Completeness

**Goal**: Complete all three portals with manager dashboards, employee timelines, operator AI suggestions, and ethics portal enhancements.
**Depends on**: Phase 8 (portals exist), Phase 44 (chatbot), Phase 40 (rules for suggestions)
**Requirements**: EMPL-01 through EMPL-07, OPER-01 through OPER-05, ETHP-01 through ETHP-04
**Success Criteria** (what must be TRUE):

**Employee Portal:**

1. Manager sees Team Compliance Dashboard with outstanding disclosures/attestations per direct report
2. Manager can submit proxy report on behalf of employee with proper attribution
3. Manager can send bulk reminders to non-compliant team members
4. Employee sees "My Reports" with combined RIU + linked Case timeline
5. Employee can mark disclosure conditions as complete with supporting evidence upload
6. Employee can export their disclosure history
7. Session idle timeout warning modal (configurable countdown before auto-logout)

**Operator Console:** 8. Operator sees AI-suggested follow-up questions during intake based on category 9. Mandatory directive acknowledgment gate blocks RIU submission until directives reviewed 10. QA manager sees operator quality metrics dashboard (QA return rate, average review time) 11. Category selection dynamically loads category-specific intake questions 12. Opening/closing statement management for operator scripts

**Ethics Portal:** 13. Crisis escalation banner displayed prominently (configurable per tenant, not dismissible) 14. Emergency hotline phone number configurable per tenant and displayed on landing 15. Multi-language auto-detection (URL param > user preference > browser header > HRIS > default) 16. Program transparency display with anonymized statistics (configurable by admin)

**Plans**: TBD

Plans:

- [ ] 48-01: Manager Team Compliance Dashboard with direct report metrics
- [ ] 48-02: Manager proxy report and bulk reminder functionality
- [ ] 48-03: Employee "My Reports" combined RIU + Case timeline
- [ ] 48-04: Disclosure condition completion with evidence upload
- [ ] 48-05: Employee disclosure history export
- [ ] 48-06: Session idle timeout warning modal
- [ ] 48-07: Operator AI-suggested follow-up questions
- [ ] 48-08: Directive acknowledgment gate for RIU submission
- [ ] 48-09: QA manager quality metrics dashboard
- [ ] 48-10: Category-specific intake questions
- [ ] 48-11: Opening/closing statement management
- [ ] 48-12: Ethics portal crisis banner and emergency phone
- [ ] 48-13: Multi-language auto-detection
- [ ] 48-14: Program transparency display
- [ ] 48-15: Verification checkpoint

### Phase 49: PWA & Push Notifications

**Goal**: Make the ethics portal installable as a PWA with offline form submission and push notifications for key events.
**Depends on**: Phase 8 (ethics portal), Phase 7 (notifications), Phase 41 (SLA alerts)
**Requirements**: PWA-01, PWA-02, PWA-03, PWA-04
**Success Criteria** (what must be TRUE):

1. Ethics portal installable as PWA (manifest.json, service worker, icons)
2. Push notifications for case status updates, campaign reminders, SLA warnings
3. Offline form submission queuing (submits when connectivity restored)
4. Tenant-scoped service worker caches (no cross-tenant data leakage)

**Plans**: 7 plans

Plans:

- [ ] 49-01-PLAN.md - Add PushSubscription model and PUSH channel to schema
- [ ] 49-02-PLAN.md - WebPushService and PushSubscription API (backend)
- [ ] 49-03-PLAN.md - Push subscription client library and React hook (frontend)
- [ ] 49-04-PLAN.md - Push notification triggers for case status, SLA, campaigns
- [ ] 49-05-PLAN.md - Custom service worker with push handling and tenant caching
- [ ] 49-06-PLAN.md - Auth integration and notification settings UI
- [ ] 49-07-PLAN.md - Database migration, tests, and verification checkpoint

### Phase 50: Analytics & Data Compliance

**Goal**: Build fact tables for fast analytics, dashboard widget builder, scheduled reports, and GDPR-compliant data deletion.
**Depends on**: Phase 11 (analytics foundation), Phase 1 (BullMQ for scheduled jobs)
**Requirements**: ANAL-01, ANAL-02, ANAL-03, ANAL-04, DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):

1. Fact tables (FACT_RIU_DAILY, FACT_CASE_DAILY, FACT_CAMPAIGN_DAILY) with incremental aggregation
2. Dashboard drag-and-drop widget builder with configurable layouts
3. Scheduled report delivery via email (daily, weekly, monthly cron)
4. Peer benchmarking data pipeline (anonymized cross-tenant aggregation)
5. GDPR data deletion workflow using cryptographic shredding (encrypt PII per record, delete keys on erasure)
6. Configurable data retention policies (auto-archive after N days/months/years)
7. Document/attachment virus scan integration (ClamAV or Azure Defender)

**Plans**: TBD

Plans:

- [ ] 50-01: Fact table models (FACT_RIU_DAILY, FACT_CASE_DAILY, FACT_CAMPAIGN_DAILY)
- [ ] 50-02: Event-driven incremental aggregation + nightly reconciliation jobs
- [ ] 50-03: Dashboard widget builder with drag-and-drop layouts
- [ ] 50-04: Scheduled report delivery service with email cron
- [ ] 50-05: Peer benchmarking pipeline (anonymized aggregation)
- [ ] 50-06: GDPR cryptographic shredding service (piiEncryptionKeyId, purge workflow)
- [ ] 50-07: Data retention policy configuration and auto-archive jobs
- [ ] 50-08: Virus scan integration for document uploads
- [ ] 50-09: Verification checkpoint

### Phase 51: Enterprise Branding & Deployment

**Goal**: Complete enterprise branding capabilities and infrastructure-as-code for production deployment.
**Depends on**: Phase 8 (branding service exists), All prior phases complete
**Requirements**: BRAND-01, BRAND-02, BRAND-03, BRAND-04, BRAND-05, BRAND-06, BRAND-07, DEPL-01
**Success Criteria** (what must be TRUE):

1. Custom domain SSL routing for enterprise tenants
2. Custom font family upload and selection
3. Hero image upload for ethics portal landing
4. Custom email sender domain per tenant
5. "Powered by Ethico" removal option
6. Footer HTML customization
7. Custom CSS injection for enterprise branding
8. Terraform IaC for Azure infrastructure (App Service, PostgreSQL, Redis, Blob Storage, Search)

**Plans**: TBD

Plans:

- [ ] 51-01: Custom domain SSL routing with Azure Front Door
- [ ] 51-02: Custom font upload and tenant font selection
- [ ] 51-03: Hero image upload for ethics portal
- [ ] 51-04: Custom email sender domain configuration (SPF, DKIM)
- [ ] 51-05: "Powered by Ethico" removal toggle
- [ ] 51-06: Footer HTML customization
- [ ] 51-07: Custom CSS injection with sanitization
- [ ] 51-08: Terraform modules for Azure infrastructure
- [ ] 51-09: Verification checkpoint and deployment guide

## Progress

**Execution Order:**
Phases execute in numeric order: 40 -> 41 -> 42 -> ... -> 51

| Phase                                   | Milestone | Plans Complete | Status      | Completed  |
| --------------------------------------- | --------- | -------------- | ----------- | ---------- |
| 1. Foundation Infrastructure            | v1.0      | 9/9            | Complete    | 2026-02-02 |
| 2. Demo Tenant & Seed Data              | v1.0      | 7/7            | Complete    | 2026-02-03 |
| 3. Authentication & SSO                 | v1.0      | 8/8            | Complete    | 2026-02-03 |
| 4. Core Entities                        | v1.0      | 10/10          | Complete    | 2026-02-03 |
| 5. AI Infrastructure                    | v1.0      | 11/11          | Complete    | 2026-02-03 |
| 6. Case Management                      | v1.0      | 11/17          | Complete    | 2026-02-04 |
| 7. Notifications & Email                | v1.0      | 8/8            | Complete    | 2026-02-04 |
| 8. Portals                              | v1.0      | 17/17          | Complete    | 2026-02-04 |
| 9. Campaigns & Disclosures              | v1.0      | 17/17          | Complete    | 2026-02-04 |
| 10. Policy Management                   | v1.0      | 11/11          | Complete    | 2026-02-05 |
| 11. Analytics & Reporting               | v1.0      | 21/21          | Complete    | 2026-02-05 |
| 11.1. Frontend Navigation (INSERTED)    | v1.0      | 6/6            | Complete    | 2026-02-05 |
| 12. Internal Operations Portal          | v1.0      | 19/19          | Complete    | 2026-02-06 |
| 13. HubSpot-Style Saved Views           | v1.0      | 15/15          | Complete    | 2026-02-07 |
| 13.1. Saved Views Fixes (INSERTED)      | v1.0      | 1/1            | Complete    | 2026-02-09 |
| 14. Critical Bug Fixes & Navigation     | v1.0      | 5/5            | Complete    | 2026-02-09 |
| 14.1. Data & Config Fixes (INSERTED)    | v1.0      | 4/4            | Complete    | 2026-02-09 |
| 14.2. Case Creation & Search (INSERTED) | v1.0      | 3/3            | Complete    | 2026-02-10 |
| 15. Case Detail Page Overhaul           | v1.0      | 11/11          | Complete    | 2026-02-11 |
| 16. AI Integration Fix                  | v1.0      | 8/8            | Complete    | 2026-02-11 |
| 17. Campaigns Hub                       | v1.0      | 4/4            | Complete    | 2026-02-11 |
| 18. Reports & Data Management           | v1.0      | 9/9            | Complete    | 2026-02-11 |
| 19. Workflow Engine UI                  | v1.0      | 7/7            | Complete    | 2026-02-11 |
| 20. Settings Overhaul (HubSpot)         | v1.0      | 6/6            | Complete    | 2026-02-12 |
| 21. Project Management (Monday.com)     | v1.0      | 10/10          | Complete    | 2026-02-12 |
| 22. Dark Mode & Theme                   | v1.2      | 15/15          | Complete    | 2026-02-18 |
| 23. Help & Support System               | v1.2      | 5/5            | Complete    | 2026-02-13 |
| 24. Policy Content & Seed Data          | v1.0      | 3/3            | Complete    | 2026-02-12 |
| 25. Case & Investigation Redesign       | v1.0      | 6/6            | Complete    | 2026-02-13 |
| 25.1. Case Detail Vision Revision       | v1.2      | 10/10          | Complete    | 2026-02-17 |
| 26. Emergency Fixes                     | v1.1      | 2/2            | Complete    | 2026-02-14 |
| 27. Security Hardening                  | v1.1      | 4/4            | Complete    | 2026-02-14 |
| 28. Production Readiness                | v1.1      | 5/5            | Complete    | 2026-02-14 |
| 29. Error Handling & Reliability        | v1.1      | 5/5            | Complete    | 2026-02-14 |
| 30. Test Coverage Foundation            | v1.1      | 5/5            | Complete    | 2026-02-15 |
| 31. Code Quality & Performance          | v1.1      | 22/22          | Complete    | 2026-02-15 |
| 32. Security & SOC 2 Fixes              | v1.2      | 8/8            | Complete    | 2026-02-16 |
| 33. Slop Cleanup & Production Readiness | v1.2      | 10/10          | Complete    | 2026-02-17 |
| 34. Performance & Scalability           | v1.2      | 5/5            | Complete    | 2026-02-18 |
| 35. Code Quality & Architecture         | v1.2      | 6/6            | Complete    | 2026-02-18 |
| 36. Test Coverage Expansion             | v1.2      | 13/13          | Complete    | 2026-02-19 |
| 37. Critical Integration Fixes          | v1.2      | 1/1            | Complete    | 2026-02-19 |
| 38. Dark Mode Gap Closure               | v1.2      | 13/13          | Complete    | 2026-02-20 |
| 39. Frontend Test Repair                | v1.2      | 5/5            | Complete    | 2026-02-20 |
| 40. Rules Engine Foundation             | v2.0      | 0/8            | Planned     | -          |
| 41. SLA Monitoring & Escalation         | v2.0      | 0/6            | Not started | -          |
| 42. Anonymous Communication Relay       | v2.0      | 0/8            | Not started | -          |
| 43. RAG Infrastructure                  | v2.0      | 0/8            | Not started | -          |
| 44. Employee Chatbot                    | v2.0      | 0/10           | Not started | -          |
| 45. Enhanced AI Features                | v2.0      | 0/9            | Not started | -          |
| 46. Disclosure Automation Foundation    | v2.0      | 0/10           | Not started | -          |
| 47. External Parties & GT&E             | v2.0      | 0/7            | Not started | -          |
| 48. Portal Completeness                 | v2.0      | 0/15           | Not started | -          |
| 49. PWA & Push Notifications            | v2.0      | 0/7            | Not started | -          |
| 50. Analytics & Data Compliance         | v2.0      | 0/9            | Not started | -          |
| 51. Enterprise Branding & Deployment    | v2.0      | 0/9            | Not started | -          |

---

_Roadmap created: 2026-02-02_
_Updated: 2026-02-24 (Phase 40 planned with 8 plans)_
_Total phases: 51 (+ decimal insertions)_
_Total plans: 300+ completed across v1.0, v1.1, v1.2; 106 planned for v2.0_
_Total requirements: 262 (v1.0-v1.2) + 83 (v2.0) = 345_
