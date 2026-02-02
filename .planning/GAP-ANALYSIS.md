# Gap Analysis: Specification vs Implementation
Version: 1.0
Generated: 2026-02-02
Status: Discovery/Scaffolding Phase → Implementation Phase

## Executive Summary

**Implementation Status:** ~15% of platform built (foundational infrastructure)
**Critical Gaps Blocking Production:** 27 major features, 9 core entities missing
**Key Wins in Place:** Multi-tenancy (RLS), authentication (JWT), activity logging, investigation workflow, frontend-backend integration

### Platform Maturity by Layer

| Layer | % Complete | Status |
|-------|-----------|--------|
| **Infrastructure** | 70% | Tenant isolation, auth, logging complete; SSO, rate limiting, email missing |
| **Core Entities** | 45% | Case, Investigation, User exist; RIU, Employee, Category, Subject missing |
| **Backend Modules** | 20% | Cases + Investigations working; 13 modules not started |
| **Frontend Components** | 15% | Case management UI built; 14 modules not started |
| **AI Integration** | 5% | Architecture ready, no Claude API calls implemented |
| **Production Readiness** | 10% | Local dev works; monitoring, scaling, deployment missing |

### Recommended Tier 1 Implementation Order

1. **Phase 1 (Weeks 1-4):** Complete core entity gap (Employee, Category, BusinessUnit, Location, RIU)
2. **Phase 2 (Weeks 5-8):** SSO + Email + RIU creation workflows
3. **Phase 3 (Weeks 9-12):** AI integration (note cleanup, summaries, translations)
4. **Phase 4 (Weeks 13-16):** Ethics Portal (anonymous reporting) + Disclosures
5. **Phase 5 (Weeks 17-20):** Policy Management + Attestations

---

## Module-by-Module Gap Analysis

### PRD-002: Operator Console

**Specified:** Internal tool for Ethico operators to handle hotline intake, create RIUs (Risk Intelligence Units), perform AI-assisted note cleanup, and QA review workflow before releasing RIUs to clients.

**Implemented:** None (0%)

**Gap:**
- **Backend:**
  - No `RiskIntelligenceUnit` model in Prisma schema
  - No `riu_hotline_details` extension table
  - No `Interaction` model for follow-ups
  - No operator-specific routes or controllers
  - No QA workflow endpoints
  - No client profile management endpoints
  - No directives system
- **Frontend:**
  - No Operator Console UI
  - No hotline intake form
  - No real-time AI assistance panel
  - No QA review queue
  - No client profile switcher
- **AI:**
  - No note cleanup integration
  - No real-time category suggestion
  - No escalation keyword detection

**Priority:** P1 (Tier 2 - required for full hotline capability)

**Estimated Effort:** XL (6-8 weeks)
- Week 1-2: RIU entity + backend CRUD
- Week 3-4: Operator Console UI + intake workflow
- Week 5-6: AI integration (note cleanup, category suggestion)
- Week 7-8: QA workflow + client profile management

**Dependencies:** RIU entity model, Claude API integration, Category entity

**Blocking:** Anonymous hotline reporting capability, QA review process

---

### PRD-003: Ethics Portal (Employee Portal)

**Specified:** Public-facing employee portal with three sub-portals:
- **Anonymous Portal:** Submit reports, check status via access code (no login)
- **Employee Portal:** My reports, disclosures, attestations (SSO required)
- **Manager Portal:** Proxy reporting, team dashboard (SSO + manager role)

**Implemented:** None (0%)

**Gap:**
- **Backend:**
  - No anonymous reporting endpoint (creates RIU without auth)
  - No access code generation/validation
  - No proxy reporting endpoints
  - No campaign assignment endpoints for employee view
  - No portal branding configuration
- **Frontend:**
  - No public anonymous portal
  - No employee self-service portal
  - No manager proxy reporting UI
  - No access code status checker
  - No white-label theming system
- **Infrastructure:**
  - No custom domain routing
  - No PWA manifest for mobile installation

**Priority:** P0 (Tier 1 - required for production)

**Estimated Effort:** XL (6-8 weeks)
- Week 1-2: Anonymous reporting flow (RIU creation + access codes)
- Week 3-4: Employee portal UI (my reports, my tasks)
- Week 5-6: Manager portal (proxy reporting, team view)
- Week 7-8: White-label branding + PWA

**Dependencies:** RIU entity, Campaign entity, Policy entity, SSO

**Blocking:** Production deployment, employee self-service, anonymous reporting

---

### PRD-004: Web Form Configuration

**Specified:** Drag-and-drop form builder for custom intake forms, incident forms, and disclosure forms. Forms create RIUs with type `web_form_submission` or `incident_form`.

**Implemented:** None (0%)

**Gap:**
- **Backend:**
  - No `FormTemplate` model
  - No `FormSubmission` model (links to RIU)
  - No form builder endpoints (CRUD)
  - No form rendering/validation engine
  - No conditional logic engine
- **Frontend:**
  - No form builder UI
  - No drag-and-drop canvas
  - No form preview
  - No public form rendering engine
  - No conditional field logic
- **RIU Integration:**
  - No `riu_form_details` extension table
  - No form-to-RIU mapping

**Priority:** P1 (Tier 2)

**Estimated Effort:** L (4-6 weeks)

**Dependencies:** RIU entity, Category entity

**Blocking:** Custom intake forms, incident reporting

---

### PRD-005: Case Management & Investigations

**Specified:** Complete case lifecycle management:
- Case entity with RIU associations (many-to-many)
- Investigation workflows with templates
- Subject tracking for pattern detection
- Remediation plans with step tracking
- Two-way anonymous communication
- AI features (summaries, risk scoring, pattern detection)

**Implemented:** Partial (40%)

**What EXISTS:**
- ✅ Case model with core fields (status, category, severity, assignment)
- ✅ Investigation model with status tracking
- ✅ InvestigationNote model
- ✅ Attachment model with file storage
- ✅ Case CRUD endpoints (GET, POST, PUT)
- ✅ Investigation CRUD endpoints
- ✅ Frontend Case list + detail views
- ✅ Frontend Investigation detail view
- ✅ Activity logging for cases and investigations
- ✅ Full-text search implementation (needs index optimization)

**Gap:**
- **Backend:**
  - ❌ `RiskIntelligenceUnit` model (foundational entity missing)
  - ❌ `riu_case_associations` table for many-to-many linking
  - ❌ `Subject` model for tracking people involved in cases
  - ❌ `Interaction` model for follow-ups without new RIUs
  - ❌ `InvestigationTemplate` model for category-specific checklists
  - ❌ `InvestigationInterview` model for structured interviews
  - ❌ `RemediationPlan` + `RemediationStep` models
  - ❌ `CaseMessage` model for two-way reporter communication
  - ❌ Case merge endpoints (merge Cases, move RIU associations)
  - ❌ Link RIU to Case endpoints
  - ❌ Anonymous communication relay service
  - ❌ Investigation template endpoints
  - ❌ AI integration: summaries, risk scoring, pattern detection
- **Frontend:**
  - ❌ RIU list/detail views
  - ❌ Link RIU to Case UI workflow
  - ❌ Case merge workflow UI
  - ❌ Subject management UI
  - ❌ Investigation template builder
  - ❌ Remediation plan tracking UI
  - ❌ Anonymous messaging interface
  - ❌ AI-powered case Q&A panel
  - ❌ Cross-case pattern detection view

**Priority:** P0 (Tier 1 - foundational module)

**Estimated Effort:** L (4-6 weeks to complete)
- Week 1: RIU entity + associations + CRUD
- Week 2: Subject model + pattern detection queries
- Week 3: Investigation templates + interviews
- Week 4: Remediation plans
- Week 5: Anonymous communication relay
- Week 6: AI integration (summaries, risk scoring)

**Dependencies:** RIU entity (critical), Claude API integration, Email service

**Blocking:** RIU creation by any module, case merging, pattern detection, compliance reporting

---

### PRD-006: Disclosures (COI, Gifts, Outside Employment)

**Specified:** Campaign-driven disclosure management:
- Campaign creation (target audience, due dates, reminders)
- Campaign assignments to employees
- Disclosure forms (COI, gifts, outside employment)
- RIU creation on form submission (type: `disclosure_response`)
- Auto-case creation based on thresholds
- Conflict detection across disclosures

**Implemented:** None (0%)

**Gap:**
- **Backend:**
  - ❌ `Campaign` model
  - ❌ `CampaignAssignment` model
  - ❌ `riu_disclosure_details` extension table
  - ❌ Campaign CRUD endpoints
  - ❌ Assignment generation logic (target audience → employees)
  - ❌ Disclosure form submission endpoint
  - ❌ Threshold evaluation engine (auto-case creation)
  - ❌ Conflict detection service (relationships, values)
  - ❌ Reminder scheduling service
- **Frontend:**
  - ❌ Campaign builder UI
  - ❌ Disclosure form rendering
  - ❌ Campaign dashboard (completion tracking)
  - ❌ Admin view (assignment status)
  - ❌ Employee view (my disclosures)

**Priority:** P0 (Tier 1 - core compliance feature)

**Estimated Effort:** L (5-6 weeks)

**Dependencies:** RIU entity, Campaign entity, Employee entity, HRIS sync

**Blocking:** COI disclosures, gift tracking, outside employment monitoring

---

### PRD-007: Analytics & Reporting

**Specified:** HubSpot-style customizable dashboards and reports:
- Pre-built dashboards (RIU dashboard, Case dashboard, Campaign dashboard)
- Custom dashboard builder (drag-drop widgets)
- Fact tables for performance (FACT_RIU_DAILY, FACT_CASE_DAILY, FACT_CAMPAIGN_DAILY)
- Natural language queries via AI
- Scheduled report generation
- Board report templates

**Implemented:** None (0%)

**Gap:**
- **Backend:**
  - ❌ `Dashboard` model
  - ❌ `DashboardWidget` model
  - ❌ `SavedReport` model
  - ❌ Fact table schema (no analytics tables)
  - ❌ Fact table ETL jobs
  - ❌ Dashboard query engine
  - ❌ Widget data endpoints
  - ❌ AI natural language query endpoint
  - ❌ Report generation service (PDF/Excel)
  - ❌ Scheduled report job queue
- **Frontend:**
  - ❌ Dashboard builder UI
  - ❌ Widget library (chart types)
  - ❌ Report builder UI
  - ❌ AI query interface
  - ❌ Pre-built dashboard templates

**Priority:** P1 (Tier 2)

**Estimated Effort:** XL (6-8 weeks)

**Dependencies:** All entity models completed, Claude API integration

**Blocking:** Board reporting, trend analysis, KPI tracking

---

### PRD-008: Employee Chatbot

**Specified:** AI-powered conversational interface for:
- Report intake (creates RIU type: `chatbot_transcript`)
- Policy Q&A with tiered responses
- Case status checks via access code
- Disclosure assistance
- Compliance inquiries (async escalation)
- Knowledge base search

**Implemented:** None (0%)

**Gap:**
- **Backend:**
  - ❌ `ChatbotConversation` model
  - ❌ `ChatbotMessage` model
  - ❌ `riu_chatbot_details` extension table
  - ❌ Chatbot conversation endpoints
  - ❌ Claude API integration for policy Q&A
  - ❌ Tiered response logic (direct answer, guidance, escalation)
  - ❌ Intake flow detection (when to create RIU)
  - ❌ Knowledge base vector search integration
- **Frontend:**
  - ❌ Chatbot widget (floating)
  - ❌ Chatbot standalone page
  - ❌ Conversation history UI
  - ❌ Policy Q&A interface
  - ❌ Escalation prompt

**Priority:** P2 (Tier 3 - differentiation feature)

**Estimated Effort:** XL (7-9 weeks)

**Dependencies:** RIU entity, Policy entity, Claude API integration, pgvector setup

**Blocking:** AI-guided reporting, self-service policy Q&A

---

### PRD-009: Policy Management

**Specified:** Complete policy lifecycle:
- Policy document management with versioning
- Approval workflows
- Attestation campaigns (creates RIU type: `attestation_response`)
- AI-powered translation (preserve originals)
- Distribution tracking
- Policy-to-case linking (violations)

**Implemented:** None (0%)

**Gap:**
- **Backend:**
  - ❌ `Policy` model
  - ❌ `PolicyVersion` model
  - ❌ `PolicyTranslation` model
  - ❌ `PolicyApprovalWorkflow` model
  - ❌ `riu_attestation_details` extension table
  - ❌ Policy CRUD endpoints
  - ❌ Version control logic
  - ❌ Approval workflow engine
  - ❌ Attestation campaign integration
  - ❌ AI translation service (Claude API)
  - ❌ Policy search indexing (Elasticsearch)
- **Frontend:**
  - ❌ Policy list/detail views
  - ❌ Policy editor (rich text)
  - ❌ Version history UI
  - ❌ Approval workflow UI
  - ❌ Attestation campaign builder
  - ❌ Translation management UI

**Priority:** P0 (Tier 1 - core compliance feature)

**Estimated Effort:** L (5-6 weeks)

**Dependencies:** RIU entity, Campaign entity, Claude API integration

**Blocking:** Policy attestations, compliance documentation, policy violation tracking

---

### PRD-010: Implementation Portal

**Specified:** Professional services tool for customer onboarding:
- Project management (implementation phases)
- Data migration tools (NAVEX, EQS, Case IQ → Ethico)
- Training tracking
- Go-live checklist
- Customer health scoring

**Implemented:** None (0%)

**Gap:**
- All features (0% implemented)

**Priority:** P3 (Internal tool, not blocking customer usage)

**Estimated Effort:** L (4-5 weeks)

**Dependencies:** Migration entity models, Project entity

**Blocking:** Professional services efficiency, migration automation

---

### PRD-011: Sales Demo

**Specified:** On-demand demo environment provisioning:
- "Acme Co." demo tenant with historical data
- Pre-populated cases, investigations, policies, disclosures
- Sales rep can spin up personal demo instance
- Demo data generator

**Implemented:** None (0%)

**Gap:**
- All features (0% implemented)

**Priority:** P2 (Sales enablement)

**Estimated Effort:** M (2-3 weeks)

**Dependencies:** Core entities complete, seed data scripts

**Blocking:** Sales demonstrations, proof-of-concept deployments

---

### PRD-012: Project Management

**Specified:** Monday.com-style project board:
- Task aggregation across modules
- Project milestones
- Resource allocation
- Gantt charts
- Cross-module task dependencies

**Implemented:** None (0%)

**Gap:**
- All features (0% implemented)

**Priority:** P3 (Nice-to-have)

**Estimated Effort:** L (4-5 weeks)

**Dependencies:** All module entities

**Blocking:** None (complementary feature)

---

### PRD-013: Notifications & Email

**Specified:** Unified notification system:
- Multi-channel (email, SMS, in-app, push)
- Template management
- Event-driven triggers
- User preferences
- Delivery tracking

**Implemented:** Partial (10%)

**What EXISTS:**
- ✅ SMTP configuration in `.env`
- ✅ Mailhog local development setup

**Gap:**
- **Backend:**
  - ❌ `NotificationTemplate` model
  - ❌ `NotificationDelivery` model
  - ❌ Email service implementation (no actual sending)
  - ❌ Template rendering engine
  - ❌ Event subscription system
  - ❌ User notification preferences
  - ❌ Delivery retry logic
  - ❌ SMS integration (Twilio)
  - ❌ Push notification service
- **Frontend:**
  - ❌ In-app notification center
  - ❌ Notification preferences UI
  - ❌ Toast notification system (partially exists via `sonner`)

**Priority:** P0 (Tier 1 - required for production)

**Estimated Effort:** M (3-4 weeks)
- Week 1: Email service implementation + templates
- Week 2: Event-driven triggers + user preferences
- Week 3: In-app notifications + delivery tracking
- Week 4: SMS integration (optional for Tier 1)

**Dependencies:** None (standalone infrastructure)

**Blocking:** User notifications, case assignments, campaign reminders, anonymous reporter communication

---

### PRD-014: Search & Discovery

**Specified:** Platform-wide semantic search:
- Elasticsearch indexing across entities
- pgvector for semantic search
- Saved searches
- AI-powered query understanding
- Cross-entity search results

**Implemented:** Partial (30%)

**What EXISTS:**
- ✅ PostgreSQL full-text search in `apps/backend/src/modules/cases/cases.service.ts`
- ✅ Elasticsearch Docker container configured
- ✅ Search query DTO with pagination

**Gap:**
- **Backend:**
  - ❌ Elasticsearch indexing service (configured but not used)
  - ❌ pgvector extension setup
  - ❌ Semantic search implementation
  - ❌ Cross-entity search aggregation
  - ❌ AI query understanding (Claude API)
  - ❌ Search analytics tracking
  - ❌ Saved search model
- **Frontend:**
  - ❌ Global search bar
  - ❌ Search results page (cross-entity)
  - ❌ Saved searches UI
  - ❌ AI query refinement

**Priority:** P1 (Tier 2)

**Estimated Effort:** M (3-4 weeks)

**Dependencies:** All entity models, Claude API integration, pgvector setup

**Blocking:** Platform-wide search, semantic case matching, AI-powered queries

---

### PRD-015: Client Success Dashboard

**Specified:** Ethico internal view for customer health:
- Usage metrics per client
- Login frequency, feature adoption
- Case volume trends
- Deal health indicators
- Churn risk scoring

**Implemented:** None (0%)

**Gap:**
- All features (0% implemented)

**Priority:** P3 (Internal tool)

**Estimated Effort:** M (2-3 weeks)

**Dependencies:** Analytics fact tables, Activity logs

**Blocking:** None (internal operations)

---

### PRD-016: Migration & Import

**Specified:** Data import from competitor systems:
- NAVEX import connector
- EQS/Conversant import
- Case IQ import
- Generic CSV import
- AI-assisted mapping
- Field mapping UI
- Preview before import
- Rollback capability

**Implemented:** None (0%)

**Gap:**
- All features (0% implemented)

**Priority:** P1 (Tier 2 - required for customer migrations)

**Estimated Effort:** L (4-6 weeks)

**Dependencies:** All core entities, Claude API for mapping assistance

**Blocking:** Customer migrations from competitors, historical data import

---

## Infrastructure Gaps

### Authentication & Multi-tenancy

**Specified (from TECH-SPEC-AUTH-MULTITENANCY.md):**
- JWT with access + refresh tokens ✅ (IMPLEMENTED)
- Session tracking with multi-device support ✅ (IMPLEMENTED)
- Row-Level Security (RLS) enforcement ✅ (IMPLEMENTED)
- SSO: Azure AD, Google OAuth, SAML
- Domain verification for SSO
- Two-factor authentication (TOTP)
- Magic link authentication

**Implemented:**
- ✅ JWT authentication with access + refresh tokens
- ✅ Session model with device tracking
- ✅ RLS policies on all tables (enforced via `app.current_organization`)
- ✅ TenantMiddleware extracting organizationId from JWT
- ✅ Password-based authentication with bcrypt

**Gap:**
- ❌ SSO providers (Azure AD, Google, SAML)
- ❌ `TenantDomain` model for domain verification
- ❌ Two-factor authentication (MFA) implementation
- ❌ Magic link authentication
- ❌ JIT (Just-In-Time) user provisioning for SSO
- ❌ Rate limiting on authentication endpoints (security risk)
- ❌ Failed login attempt tracking in AuditLog

**Priority:** P0 (SSO required for enterprise customers)

**Estimated Effort:** M (3-4 weeks)
- Week 1: Azure AD SSO implementation
- Week 2: Google OAuth + domain verification
- Week 3: SAML integration
- Week 4: 2FA/TOTP implementation

**Blocking:** Enterprise customer onboarding, security compliance

---

### AI Integration

**Specified (from TECH-SPEC-AI-INTEGRATION.md):**
- Claude API integration (Anthropic)
- Note cleanup (bullet notes → formal narrative)
- Summary generation (case, investigation, board reports)
- Translation (multi-language support)
- Real-time assist (category suggestions, escalation flags)
- Risk scoring (AI-assessed risk levels)
- Pattern detection (cross-case analysis)
- Natural language queries
- Action framework (AI can execute actions with confirmation)
- Tiered interaction model (inline, contextual, drawer)

**Implemented:**
- ✅ `ANTHROPIC_API_KEY` in `.env.example`
- ✅ AI enrichment fields on entities (ai_summary, ai_risk_score, ai_generated_at)

**Gap:**
- ❌ Anthropic SDK integration (no actual API calls)
- ❌ Note cleanup service
- ❌ Summary generation service
- ❌ Translation service
- ❌ Real-time category suggestion
- ❌ Risk scoring algorithm
- ❌ Pattern detection queries
- ❌ Natural language query parser
- ❌ Action catalog (permitted actions per role/context)
- ❌ AI confirmation UX
- ❌ Frontend AI panel (slide-over drawer)
- ❌ Inline AI suggestions (ghost text)

**Priority:** P0 (Tier 1 - core differentiation)

**Estimated Effort:** XL (6-8 weeks)
- Week 1: Claude API integration + note cleanup
- Week 2: Summary generation service
- Week 3: Translation service
- Week 4: Real-time category suggestion
- Week 5: Risk scoring + pattern detection
- Week 6: Natural language query parser
- Week 7-8: Frontend AI panel + inline suggestions

**Dependencies:** All core entities complete

**Blocking:** AI-powered features across platform, competitive differentiation

---

### HRIS Integration

**Specified (from TECH-SPEC-HRIS-INTEGRATION.md):**
- Merge.dev unified API integration
- Employee sync from Workday, BambooHR, ADP, UKG, etc.
- Incremental sync (detect changes)
- SFTP fallback for systems without APIs
- Manager hierarchy sync
- Department/location sync
- Sync conflict resolution

**Implemented:** None (0%)

**Gap:**
- ❌ `Employee` model (critical foundational entity)
- ❌ Merge.dev SDK integration
- ❌ HRIS sync service
- ❌ Incremental sync logic
- ❌ Sync conflict resolution
- ❌ SFTP connector
- ❌ Manual CSV import as fallback
- ❌ Sync logs and error handling

**Priority:** P0 (Tier 1 - required for campaign targeting)

**Estimated Effort:** L (4-5 weeks)
- Week 1: Employee model + schema migration
- Week 2: Merge.dev integration + initial sync
- Week 3: Incremental sync + conflict resolution
- Week 4: SFTP connector + CSV import
- Week 5: Admin UI for sync management

**Dependencies:** Employee entity model, BusinessUnit entity, Location entity

**Blocking:** Campaign targeting, disclosure assignments, manager proxy reporting

---

### Real-Time Collaboration

**Specified (from TECH-SPEC-REALTIME-COLLABORATION.md):**
- Socket.io WebSocket server
- Y.js CRDT for collaborative editing
- Presence indicators (who's viewing)
- Live cursors on shared documents
- Comment threading with real-time updates

**Implemented:** None (0%)

**Gap:**
- All features (0% implemented)

**Priority:** P2 (Tier 3 - nice-to-have)

**Estimated Effort:** M (3-4 weeks)

**Dependencies:** Policy editor, Investigation notes

**Blocking:** None (collaboration is enhancement)

---

### Custom Fields

**Specified (from TECH-SPEC-CUSTOM-FIELDS.md):**
- `CustomFieldDefinition` model (org-scoped)
- `CustomFieldValue` model (entity-scoped)
- Support for: text, number, date, dropdown, multi-select, user, file
- Reportable in analytics
- Filterable in views
- Searchable

**Implemented:** None (0%)

**Gap:**
- ❌ `CustomFieldDefinition` model
- ❌ `CustomFieldValue` model
- ❌ Custom field CRUD endpoints
- ❌ Field type validation
- ❌ Custom field rendering in forms
- ❌ Custom field filtering in queries
- ❌ Custom field indexing for search

**Priority:** P1 (Tier 2)

**Estimated Effort:** M (2-3 weeks)

**Dependencies:** None (standalone feature)

**Blocking:** Client-specific field requirements, flexible data capture

---

### Workflow Engine

**Specified (from TECH-SPEC-WORKFLOW-ENGINE.md):**
- Pipeline definition (stages per entity type)
- Transition rules (valid state changes)
- Approval workflows
- SLA tracking
- Auto-assignment rules
- Escalation triggers

**Implemented:** Partial (20%)

**What EXISTS:**
- ✅ Case status enum
- ✅ Investigation status enum
- ✅ Status change tracking in activity logs

**Gap:**
- ❌ `Pipeline` model
- ❌ `WorkflowStage` model
- ❌ `ApprovalWorkflow` model
- ❌ Transition validation engine
- ❌ SLA timer service
- ❌ Auto-assignment rule engine
- ❌ Escalation service

**Priority:** P1 (Tier 2)

**Estimated Effort:** L (4-5 weeks)

**Dependencies:** All core entities

**Blocking:** Client-specific workflows, SLA compliance, auto-routing

---

## Database Schema Gaps

### Missing Core Entities

These entities are defined in PRDs but not in `apps/backend/prisma/schema.prisma`:

| Entity | PRD Reference | Priority | Impact |
|--------|---------------|----------|--------|
| **RiskIntelligenceUnit** | PRD-001, PRD-002, PRD-005 | P0 | Foundational architecture - all intake creates RIUs |
| **riu_hotline_details** | PRD-002 | P1 | Hotline-specific intake data |
| **riu_disclosure_details** | PRD-006 | P0 | Disclosure response data |
| **riu_attestation_details** | PRD-009 | P0 | Attestation response data |
| **riu_form_details** | PRD-004 | P1 | Web form submission data |
| **riu_chatbot_details** | PRD-008 | P2 | Chatbot conversation metadata |
| **riu_case_associations** | PRD-001, PRD-005 | P0 | Many-to-many RIU-Case linking |
| **Employee** | CORE-DATA-MODEL.md | P0 | HRIS-synced individuals for campaigns |
| **BusinessUnit** | CORE-DATA-MODEL.md | P0 | Organizational scoping |
| **Location** | CORE-DATA-MODEL.md | P0 | Geographic scoping |
| **Category** | CORE-DATA-MODEL.md | P0 | Taxonomy across platform |
| **Subject** | PRD-005 | P0 | People involved in cases (pattern detection) |
| **Interaction** | PRD-005 | P0 | Follow-ups without creating new RIUs |
| **Campaign** | PRD-001, PRD-006, PRD-009 | P0 | Disclosure/attestation campaigns |
| **CampaignAssignment** | PRD-001, PRD-006 | P0 | Individual employee obligations |
| **InvestigationTemplate** | PRD-005 | P1 | Category-specific checklists |
| **InvestigationInterview** | PRD-005 | P1 | Structured interview records |
| **RemediationPlan** | PRD-005 | P1 | Corrective action tracking |
| **RemediationStep** | PRD-005 | P1 | Individual remediation tasks |
| **CaseMessage** | PRD-005 | P0 | Two-way anonymous communication |
| **Policy** | PRD-009 | P0 | Policy documents |
| **PolicyVersion** | PRD-009 | P0 | Version control |
| **PolicyTranslation** | PRD-009 | P1 | Multi-language support |
| **CustomFieldDefinition** | TECH-SPEC-CUSTOM-FIELDS.md | P1 | Flexible data capture |
| **CustomFieldValue** | TECH-SPEC-CUSTOM-FIELDS.md | P1 | Entity-scoped custom data |
| **TenantDomain** | TECH-SPEC-AUTH-MULTITENANCY.md | P0 | Domain verification for SSO |

### Incomplete Entities

These entities exist but are missing required fields from CORE-DATA-MODEL.md:

**Organization:**
- ❌ Missing: `additional_domains`, `tier`, `billing_status`, `settings`, `timezone`, `default_language`, `industry`, `employee_count_range`
- Current: Basic fields only (id, name, slug)

**User:**
- ❌ Missing: `sso_provider`, `sso_id`, `mfa_enabled`, `mfa_secret`, `avatar_url`, `phone`, `job_title`, `department`, `location_id`, `business_unit_ids[]`, `custom_permissions`, `employee_id`, `preferences`
- Current: Authentication fields only

**Case:**
- ❌ Missing: `pipeline_id`, `stage`, `merged_into_case_id`, `substantiated`, `finding_summary`, `outcome`
- Current: Basic workflow fields exist

---

## Frontend Gaps

### Pages/Views Not Built

| Specified Page | Module | Priority | Effort |
|----------------|--------|----------|--------|
| Operator Console | PRD-002 | P1 | XL |
| Anonymous Portal | PRD-003 | P0 | L |
| Employee Portal | PRD-003 | P0 | L |
| Manager Portal | PRD-003 | P1 | M |
| Web Form Builder | PRD-004 | P1 | L |
| RIU List/Detail | PRD-005 | P0 | M |
| Subject Management | PRD-005 | P0 | M |
| Investigation Templates | PRD-005 | P1 | M |
| Remediation Tracking | PRD-005 | P1 | M |
| Campaign Builder | PRD-006, PRD-009 | P0 | L |
| Campaign Dashboard | PRD-006 | P0 | M |
| Disclosure Forms | PRD-006 | P0 | M |
| Analytics Dashboards | PRD-007 | P1 | XL |
| Dashboard Builder | PRD-007 | P1 | XL |
| Chatbot Widget | PRD-008 | P2 | L |
| Policy Editor | PRD-009 | P0 | L |
| Policy Version History | PRD-009 | P1 | M |
| Migration UI | PRD-016 | P1 | M |

### Components Needed

**High Priority (P0):**
- RIU card/list component
- Campaign assignment status table
- Anonymous access code checker
- Email notification preview
- Case merge workflow dialog
- Subject search/select
- AI panel (slide-over drawer)

**Medium Priority (P1):**
- Form builder canvas
- Investigation template builder
- Remediation step tracker
- Dashboard widget library
- Policy approval workflow visualizer

---

## Priority Matrix

| Gap | Module | Priority | Effort | Dependencies | Blocking |
|-----|--------|----------|--------|--------------|----------|
| **RIU Entity Model** | Core | P0 | M | None | All intake workflows |
| **Employee Entity** | Core | P0 | M | None | Campaigns, HRIS sync |
| **Category Entity** | Core | P0 | S | None | Case classification |
| **BusinessUnit Entity** | Core | P0 | S | None | Organizational scoping |
| **Location Entity** | Core | P0 | S | None | Geographic scoping |
| **Subject Entity** | Case Mgmt | P0 | M | Employee | Pattern detection |
| **Campaign Entity** | Disclosures | P0 | M | Employee | Disclosure campaigns |
| **Policy Entity** | Policy Mgmt | P0 | M | Campaign | Attestations |
| **SSO Integration** | Auth | P0 | M | TenantDomain | Enterprise customers |
| **Email Service** | Notifications | P0 | M | None | User notifications |
| **Anonymous Portal** | Ethics Portal | P0 | L | RIU, Email | Employee reporting |
| **Employee Portal** | Ethics Portal | P0 | L | RIU, Campaign, SSO | Self-service |
| **AI Note Cleanup** | Operator Console | P0 | M | Claude API | Hotline quality |
| **AI Summaries** | AI Integration | P0 | M | Claude API | Case summaries |
| **Two-Way Communication** | Case Mgmt | P0 | M | CaseMessage, Email | Reporter follow-up |
| **HRIS Sync** | HRIS Integration | P0 | L | Employee, Merge.dev | Campaign targeting |
| **Investigation Templates** | Case Mgmt | P1 | M | InvestigationTemplate | Investigation quality |
| **Remediation Plans** | Case Mgmt | P1 | M | RemediationPlan | Corrective actions |
| **Custom Fields** | Infrastructure | P1 | M | None | Client flexibility |
| **Form Builder** | Web Forms | P1 | L | RIU | Custom intake |
| **Analytics Dashboards** | Analytics | P1 | XL | All entities | Board reporting |
| **Migration Tools** | Migration | P1 | L | All entities | Competitor migrations |
| **Workflow Engine** | Infrastructure | P1 | L | All entities | Client workflows |
| **Search (Elasticsearch)** | Search | P1 | M | Elasticsearch | Platform search |
| **Chatbot** | Chatbot | P2 | XL | RIU, Claude API | AI-guided intake |
| **Real-Time Collaboration** | Infrastructure | P2 | M | Socket.io, Y.js | Collaboration |
| **Sales Demo** | Demo | P2 | M | All entities | Sales enablement |
| **Implementation Portal** | Prof Services | P3 | L | Project entity | PS efficiency |
| **Client Success Dashboard** | Internal | P3 | M | Analytics | Customer health |
| **Project Management** | Project Mgmt | P3 | L | All entities | Task aggregation |

---

## Recommended Implementation Order

### Phase 1: Core Entity Foundation (Weeks 1-4)

**Goal:** Complete foundational entity models to unblock all modules

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 1 | Entity schema design + migrations | RIU, Employee, Category, BusinessUnit, Location models |
| 2 | Backend CRUD endpoints | GET/POST/PUT/DELETE for all core entities |
| 3 | RLS policies + indexes | Security enforcement, performance optimization |
| 4 | Frontend entity components | RIU list/detail, Employee picker, Category selector |

**Success Criteria:**
- [ ] All 5 core entities in Prisma schema
- [ ] RLS policies applied to all tables
- [ ] CRUD endpoints with tenant isolation tests
- [ ] Basic UI components for each entity

---

### Phase 2: Authentication & Communication (Weeks 5-8)

**Goal:** Enable SSO and email notifications

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 5 | SSO integration (Azure AD) | Azure AD passport strategy, TenantDomain model, domain verification |
| 6 | Email service implementation | SMTP service, template rendering, notification triggers |
| 7 | Google OAuth + SAML | Multi-provider SSO, JIT provisioning |
| 8 | Rate limiting + MFA | Rate limiting middleware, TOTP 2FA |

**Success Criteria:**
- [ ] Users can login with Azure AD SSO
- [ ] Domain verification working
- [ ] Emails sent for case assignments
- [ ] Rate limiting active on auth endpoints

---

### Phase 3: RIU Workflows (Weeks 9-12)

**Goal:** Implement RIU creation from all sources

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 9 | RIU-Case associations | riu_case_associations table, link/unlink endpoints |
| 10 | Web form submission → RIU | Anonymous reporting endpoint, access code generation |
| 11 | Disclosure campaign → RIU | Campaign model, assignment logic, RIU creation on form submit |
| 12 | Interaction model | Follow-up handling without new RIUs |

**Success Criteria:**
- [ ] Anonymous reports create RIUs with access codes
- [ ] Disclosure campaigns create RIUs on completion
- [ ] Multiple RIUs can link to one Case
- [ ] Follow-ups tracked via Interactions

---

### Phase 4: AI Integration (Weeks 13-16)

**Goal:** Activate AI features across platform

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 13 | Claude API integration | Anthropic SDK setup, note cleanup service |
| 14 | Summary generation | Case summaries, investigation summaries |
| 15 | Risk scoring + translation | AI risk score calculation, multi-language translation |
| 16 | Frontend AI panel | Slide-over drawer, inline suggestions |

**Success Criteria:**
- [ ] Operators can cleanup notes with AI
- [ ] Cases have AI-generated summaries
- [ ] Reports translated to employee language
- [ ] AI panel accessible on all detail pages

---

### Phase 5: Ethics Portal (Weeks 17-20)

**Goal:** Launch anonymous and employee portals

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 17 | Anonymous portal UI | Public report form, access code checker |
| 18 | Employee portal UI | My reports, my disclosures, my attestations |
| 19 | Manager portal UI | Proxy reporting, team dashboard |
| 20 | White-label branding + PWA | Custom domain, theme config, mobile PWA |

**Success Criteria:**
- [ ] Employees can submit anonymous reports
- [ ] Employees can view their disclosures
- [ ] Managers can submit proxy reports
- [ ] Portal installable as mobile app

---

### Phase 6: Campaigns & Disclosures (Weeks 21-24)

**Goal:** Enable disclosure and attestation campaigns

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 21 | Campaign builder backend | Campaign CRUD, assignment generation |
| 22 | Campaign builder UI | Admin campaign creation, targeting rules |
| 23 | Disclosure forms | COI, gifts, outside employment forms |
| 24 | Threshold evaluation | Auto-case creation, conflict detection |

**Success Criteria:**
- [ ] Admins can create disclosure campaigns
- [ ] Employees receive campaign assignments
- [ ] Disclosures create RIUs
- [ ] High-value disclosures create Cases automatically

---

### Phase 7: Policy Management (Weeks 25-28)

**Goal:** Complete policy lifecycle management

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 25 | Policy model + CRUD | Policy, PolicyVersion, PolicyTranslation models |
| 26 | Policy editor UI | Rich text editor, version control |
| 27 | Approval workflows | Multi-step approval, reviewer assignment |
| 28 | Attestation campaigns | Policy attestation RIUs, campaign integration |

**Success Criteria:**
- [ ] Policies created with versions
- [ ] Approval workflows functional
- [ ] Attestation campaigns linked to policies
- [ ] Attestation RIUs create Cases on failure

---

### Phase 8: Investigations & Remediation (Weeks 29-32)

**Goal:** Complete investigation workflow

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 29 | Investigation templates | Template builder, category-specific checklists |
| 30 | Structured interviews | InvestigationInterview model, interview UI |
| 31 | Remediation plans | RemediationPlan model, step tracking |
| 32 | Subject management | Subject model, pattern detection queries |

**Success Criteria:**
- [ ] Investigators use templates
- [ ] Interviews structured and tracked
- [ ] Remediation plans assigned and tracked
- [ ] Subjects tracked for pattern detection

---

### Phase 9: Analytics & Reporting (Weeks 33-36)

**Goal:** Enable data-driven decision making

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 33 | Fact table schema + ETL | FACT_RIU_DAILY, FACT_CASE_DAILY, FACT_CAMPAIGN_DAILY |
| 34 | Pre-built dashboards | RIU dashboard, Case dashboard, Campaign dashboard |
| 35 | Custom dashboard builder | Widget library, drag-drop UI |
| 36 | AI natural language queries | Claude API query parser, dashboard generation |

**Success Criteria:**
- [ ] Dashboards show real-time metrics
- [ ] Admins can create custom dashboards
- [ ] AI can answer "show me harassment cases from Q4"
- [ ] Board reports generated on demand

---

### Phase 10: Advanced Features (Weeks 37-40)

**Goal:** Differentiation features

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 37 | Employee chatbot | Chatbot widget, policy Q&A, intake flow |
| 38 | HRIS sync | Merge.dev integration, incremental sync |
| 39 | Migration tools | NAVEX/EQS import, field mapping UI |
| 40 | Production hardening | Monitoring, scaling, deployment automation |

**Success Criteria:**
- [ ] Employees can ask policy questions via chatbot
- [ ] Employee data syncs from HRIS nightly
- [ ] Customer data migrated from competitor systems
- [ ] Platform deployed to Azure with monitoring

---

## Appendix: Gap Details

### Missing Endpoints (Backend)

**RIU Management:**
- `POST /api/v1/rius` - Create RIU (generic)
- `POST /api/v1/rius/hotline` - Create hotline RIU
- `POST /api/v1/rius/disclosure` - Create disclosure RIU
- `POST /api/v1/rius/attestation` - Create attestation RIU
- `POST /api/v1/rius/form` - Create web form RIU
- `POST /api/v1/rius/chatbot` - Create chatbot RIU
- `GET /api/v1/rius` - List RIUs (paginated, filtered)
- `GET /api/v1/rius/:id` - Get RIU details
- `POST /api/v1/rius/:id/link-case` - Link RIU to Case
- `POST /api/v1/rius/:id/release` - QA release RIU (creates Case)

**Case Management:**
- `POST /api/v1/cases/:id/merge` - Merge Cases
- `POST /api/v1/cases/:id/subjects` - Add subject to Case
- `GET /api/v1/cases/:id/subjects` - List subjects on Case
- `POST /api/v1/cases/:id/messages` - Send message to reporter
- `GET /api/v1/cases/:id/messages` - List case messages

**Subjects:**
- `POST /api/v1/subjects` - Create subject
- `GET /api/v1/subjects/:id/cases` - Get all cases involving subject
- `GET /api/v1/subjects/:id/pattern-analysis` - AI pattern detection

**Campaigns:**
- `POST /api/v1/campaigns` - Create campaign
- `GET /api/v1/campaigns` - List campaigns
- `GET /api/v1/campaigns/:id` - Get campaign details
- `POST /api/v1/campaigns/:id/generate-assignments` - Create assignments for target audience
- `GET /api/v1/campaigns/:id/assignments` - List campaign assignments
- `POST /api/v1/campaigns/:id/send-reminders` - Send reminder emails

**Policies:**
- `POST /api/v1/policies` - Create policy
- `GET /api/v1/policies` - List policies
- `GET /api/v1/policies/:id` - Get policy details
- `POST /api/v1/policies/:id/versions` - Create new version
- `GET /api/v1/policies/:id/versions` - List versions
- `POST /api/v1/policies/:id/translate` - AI translation
- `POST /api/v1/policies/:id/approve` - Workflow approval

**Notifications:**
- `POST /api/v1/notifications/send` - Send notification
- `GET /api/v1/notifications` - List user notifications
- `PUT /api/v1/notifications/:id/read` - Mark as read
- `GET /api/v1/notifications/preferences` - Get user preferences
- `PUT /api/v1/notifications/preferences` - Update preferences

**AI Integration:**
- `POST /api/v1/ai/cleanup-notes` - Convert bullet notes to narrative
- `POST /api/v1/ai/summarize-case` - Generate case summary
- `POST /api/v1/ai/score-risk` - Calculate risk score
- `POST /api/v1/ai/translate` - Translate content
- `POST /api/v1/ai/query` - Natural language query
- `POST /api/v1/ai/detect-patterns` - Cross-case pattern analysis

**HRIS:**
- `POST /api/v1/hris/sync` - Trigger HRIS sync
- `GET /api/v1/hris/sync-status` - Get sync status
- `GET /api/v1/employees` - List employees
- `GET /api/v1/employees/:id` - Get employee details

---

### Missing UI Components (Frontend)

**Core Components:**
- `RIUCard` - Display RIU summary
- `RIUDetail` - Full RIU view with associations
- `RIUList` - Paginated RIU list with filters
- `LinkRIUDialog` - Search and link RIU to Case
- `MergeCasesDialog` - Case merge workflow
- `SubjectPicker` - Search/select subjects
- `SubjectCard` - Display subject with case count
- `CampaignBuilder` - Create/edit campaigns
- `CampaignAssignmentTable` - Show assignment status
- `DisclosureForm` - Generic disclosure form renderer
- `PolicyEditor` - Rich text policy editor
- `PolicyVersionHistory` - Version comparison UI
- `AIPanel` - Slide-over drawer for AI interactions
- `ChatbotWidget` - Floating chatbot widget
- `DashboardBuilder` - Drag-drop dashboard creation
- `WidgetLibrary` - Available dashboard widgets
- `NotificationCenter` - In-app notification dropdown
- `EmailTemplatePreview` - Preview email before send
- `AccessCodeChecker` - Anonymous reporter status lookup

---

### Database Indexes Needed

**For Performance:**
```sql
-- RIU indexes
CREATE INDEX idx_rius_organization_type ON risk_intelligence_units(organization_id, type);
CREATE INDEX idx_rius_organization_status ON risk_intelligence_units(organization_id, status);
CREATE INDEX idx_rius_received_at ON risk_intelligence_units(organization_id, received_at DESC);
CREATE INDEX idx_riu_associations_case ON riu_case_associations(case_id);
CREATE INDEX idx_riu_associations_riu ON riu_case_associations(riu_id);

-- Subject pattern detection indexes
CREATE INDEX idx_subjects_employee ON subjects(organization_id, employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_subjects_name ON subjects(organization_id, LOWER(external_name)) WHERE external_name IS NOT NULL;
CREATE INDEX idx_subjects_email ON subjects(organization_id, LOWER(email)) WHERE email IS NOT NULL;

-- Campaign indexes
CREATE INDEX idx_campaigns_organization_status ON campaigns(organization_id, status);
CREATE INDEX idx_campaign_assignments_employee ON campaign_assignments(employee_id, status);
CREATE INDEX idx_campaign_assignments_due ON campaign_assignments(organization_id, due_date) WHERE status = 'pending';

-- Full-text search optimization
ALTER TABLE cases ADD COLUMN search_vector tsvector;
CREATE INDEX idx_cases_search ON cases USING GIN(search_vector);

-- Activity log performance
CREATE INDEX idx_audit_log_entity ON audit_logs(organization_id, entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_logs(organization_id, created_at DESC);
```

---

### Environment Variables Needed

**Production:**
```env
# SSO
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
SAML_ENTRY_POINT=
SAML_CERTIFICATE=

# Email
SENDGRID_API_KEY=
EMAIL_FROM_ADDRESS=
EMAIL_FROM_NAME=

# AI
ANTHROPIC_API_KEY=
AI_MODEL=claude-3-5-sonnet-20241022
AI_MAX_TOKENS=4096

# HRIS
MERGE_DEV_API_KEY=
MERGE_DEV_ACCOUNT_TOKEN=

# Storage
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER=

# Monitoring
SENTRY_DSN=
DATADOG_API_KEY=

# Search
ELASTICSEARCH_CLOUD_ID=
ELASTICSEARCH_API_KEY=
```

---

*End of Gap Analysis*
