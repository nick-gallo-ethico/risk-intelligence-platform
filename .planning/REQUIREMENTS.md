# Requirements: Ethico Risk Intelligence Platform

**Defined:** 2026-02-02
**Core Value:** Users can manage their entire compliance workflow—from anonymous report intake to investigation closure to board reporting—in one AI-assisted platform, with every task unified into a single "My Work" view.

## v1 Requirements

Requirements for Q1 2026 release. Organized by HubSpot-inspired architecture with AI-first capabilities.

### Foundation Infrastructure

- [ ] **FOUND-01**: Event bus with @nestjs/event-emitter for async operations
- [ ] **FOUND-02**: BullMQ job queue with Redis for background processing
- [ ] **FOUND-03**: Unified AUDIT_LOG table capturing all mutations with natural language descriptions
- [ ] **FOUND-04**: Demo tenant ("Acme Co.") with 3 years of realistic seed data
- [ ] **FOUND-05**: Seed data generator covering all RIU types, categories, and sources
- [ ] **FOUND-06**: Workflow engine with configurable pipelines and stages
- [ ] **FOUND-07**: SLA tracking with due dates and escalation triggers
- [ ] **FOUND-08**: Assignment rules engine (auto-routing by category, location, etc.)
- [ ] **FOUND-09**: Search infrastructure with Elasticsearch indexing pipeline
- [ ] **FOUND-10**: Form/schema engine for dynamic form creation
- [ ] **FOUND-11**: Reporting engine with query builder and export framework
- [ ] **FOUND-12**: File storage with Azure Blob and document processing

### Authentication & Multi-tenancy

- [ ] **AUTH-01**: Azure AD SSO with JIT user provisioning
- [ ] **AUTH-02**: Google OAuth SSO integration
- [ ] **AUTH-03**: SAML 2.0 SSO for enterprise customers
- [ ] **AUTH-04**: Domain verification for SSO tenant mapping
- [ ] **AUTH-05**: Multi-factor authentication (TOTP)
- [ ] **AUTH-06**: Rate limiting on authentication endpoints
- [ ] **AUTH-07**: RLS policies enforced on all new entities

### Core Entities (HubSpot Pattern)

#### Person (Contact equivalent)

- [ ] **PERS-01**: Person entity for employees and external contacts
- [ ] **PERS-02**: Person types: 'employee', 'external_contact'
- [ ] **PERS-03**: Person sources: 'hris_sync', 'manual', 'intake_created'
- [ ] **PERS-04**: Employee fields: business_unit_id, manager_id, job_title, status
- [ ] **PERS-05**: HRIS sync via Merge.dev for 50+ systems
- [ ] **PERS-06**: Manager hierarchy for org charts and routing

#### RIU - Risk Intelligence Unit (Ticket equivalent)

- [ ] **RIU-01**: RIU entity with immutability enforcement (no updatedAt)
- [ ] **RIU-02**: RIU types: hotline_report, web_form_submission, disclosure_response, attestation_response, incident_form, proxy_report, chatbot_transcript
- [ ] **RIU-03**: Source channels: phone, web_form, chatbot, email, proxy
- [ ] **RIU-04**: RIU content is frozen at intake (corrections go on Case)
- [ ] **RIU-05**: AI enrichment fields: ai_summary, ai_risk_score, ai_category_suggestion
- [ ] **RIU-06**: Anonymous access code generation for status checking
- [ ] **RIU-07**: Type-specific extension tables (riu_hotline_details, riu_disclosure_details, etc.)

#### Case (Deal equivalent)

- [ ] **CASE-01**: Case entity with mutable status and classification
- [ ] **CASE-02**: Pipeline stages configurable per tenant
- [ ] **CASE-03**: Case classification may differ from RIU (corrected values)
- [ ] **CASE-04**: Case merge with full audit trail (merged case becomes read-only tombstone)
- [ ] **CASE-05**: Two-way anonymous communication relay
- [ ] **CASE-06**: Case outcomes: Substantiated, Unsubstantiated, Inconclusive

#### Campaign (Sequence equivalent)

- [ ] **CAMP-01**: Campaign entity for outbound requests
- [ ] **CAMP-02**: Campaign types: disclosure, attestation, survey
- [ ] **CAMP-03**: Target audience builder (by business unit, location, role, etc.)
- [ ] **CAMP-04**: Due dates and reminder schedules
- [ ] **CAMP-05**: Campaign assignment generation for target employees
- [ ] **CAMP-06**: Auto-case creation rules (thresholds, flagged responses)

#### Associations (HubSpot Association Labels)

- [ ] **ASSOC-01**: PersonRiuAssociation with role labels (reporter, subject, witness, mentioned)
- [ ] **ASSOC-02**: PersonCaseAssociation with role labels (subject, witness, investigator, approver)
- [ ] **ASSOC-03**: RiuCaseAssociation with types (primary, related, merged_from)
- [ ] **ASSOC-04**: Pattern detection via role-based queries (same person across multiple cases)

### Investigation Module

- [ ] **INV-01**: Investigation entity tied to Cases
- [ ] **INV-02**: Investigation templates by category (checklists)
- [ ] **INV-03**: Structured interviews with InvestigationInterview model
- [ ] **INV-04**: Investigation notes with rich text
- [ ] **INV-05**: Evidence/document attachment
- [ ] **INV-06**: Findings documentation
- [ ] **INV-07**: Remediation plans with step tracking
- [ ] **INV-08**: Remediation step assignment to users or non-users (email)

### Disclosures & COI

- [ ] **DISC-01**: COI disclosure forms
- [ ] **DISC-02**: Gifts & entertainment tracking
- [ ] **DISC-03**: Outside employment disclosure
- [ ] **DISC-04**: Threshold-based auto-case creation
- [ ] **DISC-05**: Conflict detection across disclosures
- [ ] **DISC-06**: Approval workflows for flagged disclosures
- [ ] **DISC-07**: Disclosure history per Person

### Policy Management

- [ ] **POL-01**: Policy entity with rich text content
- [ ] **POL-02**: Policy version control and history
- [ ] **POL-03**: Approval workflows with multi-step review
- [ ] **POL-04**: Attestation campaigns (creates RIUs when employees respond)
- [ ] **POL-05**: AI-powered translation with original preserved
- [ ] **POL-06**: Policy-to-case linking for violations
- [ ] **POL-07**: Policy search with full-text indexing

### Operator Console (Ethico Internal)

- [ ] **OPER-01**: Phone number → client profile loading
- [ ] **OPER-02**: Hotline intake form with all metadata fields
- [ ] **OPER-03**: Directives system (opening/closing statements, guidance)
- [ ] **OPER-04**: Category-specific question triggering
- [ ] **OPER-05**: Subject search (HRIS lookup or manual entry)
- [ ] **OPER-06**: QA review queue (high severity first)
- [ ] **OPER-07**: QA edit capabilities and release workflow
- [ ] **OPER-08**: Follow-up handling via access code

### Ethics Portal (Anonymous Reporting)

- [ ] **ETHIC-01**: Public anonymous report submission
- [ ] **ETHIC-02**: Access code generation for status checking
- [ ] **ETHIC-03**: Two-way anonymous messaging
- [ ] **ETHIC-04**: White-label branding per tenant
- [ ] **ETHIC-05**: PWA for mobile installation
- [ ] **ETHIC-06**: Multi-language support

### Employee Portal (Authenticated Self-Service)

- [ ] **EMP-01**: SSO login with tenant routing
- [ ] **EMP-02**: My reports view (submitted RIUs)
- [ ] **EMP-03**: My disclosures view (completed campaigns)
- [ ] **EMP-04**: My attestations view (pending/completed)
- [ ] **EMP-05**: My tasks view (assigned items)
- [ ] **EMP-06**: Manager proxy reporting

### Client Platform (Main Work Interface)

- [ ] **CLIENT-01**: Case list with filtering and sorting
- [ ] **CLIENT-02**: Case detail view with linked RIUs
- [ ] **CLIENT-03**: Investigation management UI
- [ ] **CLIENT-04**: Campaign builder and dashboard
- [ ] **CLIENT-05**: Policy management UI
- [ ] **CLIENT-06**: User management and RBAC
- [ ] **CLIENT-07**: Organization settings

### Sales Demo Environment

- [ ] **DEMO-01**: "Acme Co." demo tenant provisioning
- [ ] **DEMO-02**: Pre-populated with 3 years of historical data
- [ ] **DEMO-03**: Multiple user accounts with different roles
- [ ] **DEMO-04**: Hundreds of cases from various sources
- [ ] **DEMO-05**: Multiple completed disclosure campaigns
- [ ] **DEMO-06**: Cases in various investigation stages
- [ ] **DEMO-07**: Resettable demo environment
- [ ] **DEMO-08**: Sales rep personal demo instance creation

### Project Management & Unified Tasks

- [ ] **PROJ-01**: Unified "My Work" queue across all modules
- [ ] **PROJ-02**: Task aggregation from Cases, Investigations, Disclosures, Policies
- [ ] **PROJ-03**: Priority-based ordering with due dates
- [ ] **PROJ-04**: Project milestones and tracking
- [ ] **PROJ-05**: Cross-module task dependencies
- [ ] **PROJ-06**: Gantt chart visualization

### AI Integration (Core Differentiator)

#### AI Infrastructure

- [ ] **AI-01**: Claude API integration with @anthropic-ai/sdk
- [ ] **AI-02**: Provider abstraction for multi-LLM support
- [ ] **AI-03**: Rate limiting per tenant with visibility dashboard
- [ ] **AI-04**: Prompt versioning and template management
- [ ] **AI-05**: AI conversation logging (AI_CONVERSATION table)
- [ ] **AI-06**: Context hierarchy loading (platform → org → team → user → entity)

#### AI Features

- [ ] **AI-07**: Note cleanup (bullet notes → formal narrative)
- [ ] **AI-08**: Case/investigation summary generation
- [ ] **AI-09**: Real-time category suggestion during intake
- [ ] **AI-10**: AI risk scoring
- [ ] **AI-11**: Translation service with original preserved
- [ ] **AI-12**: Natural language queries for dashboards

#### AI Agent Capabilities (Claude Code Pattern)

- [ ] **AI-13**: AI panel (slide-over drawer) on all entity pages
- [ ] **AI-14**: Scoped agents per view (Investigation Agent, Case Agent, Compliance Manager Agent)
- [ ] **AI-15**: Skills registry with platform/org/team/user levels
- [ ] **AI-16**: Action catalog with permission validation
- [ ] **AI-17**: Preview-then-execute pattern for multi-step actions
- [ ] **AI-18**: AI can create summaries/documents and add to activity feed
- [ ] **AI-19**: AI can send emails (disclosure reminders, approval requests)
- [ ] **AI-20**: AI can move cases/policies through workflow stages
- [ ] **AI-21**: AI can suggest workflow/approval changes
- [ ] **AI-22**: Undo trail for reversible AI actions

### Analytics & Reporting (Differentiator)

- [ ] **ANAL-01**: Pre-built dashboards (RIU, Case, Campaign, Compliance)
- [ ] **ANAL-02**: Custom dashboard builder with drag-drop widgets
- [ ] **ANAL-03**: Robust dataset builder for custom queries
- [ ] **ANAL-04**: PDF report generation (Puppeteer)
- [ ] **ANAL-05**: Excel export with streaming (ExcelJS)
- [ ] **ANAL-06**: Board report templates
- [ ] **ANAL-07**: AI natural language queries ("show me harassment cases from Q4")
- [ ] **ANAL-08**: Scheduled report delivery

### HubSpot-Style UX (Differentiator)

- [ ] **UX-01**: Saved views (user-created filtered views across entities)
- [ ] **UX-02**: Custom properties (tenant-configurable fields on entities)
- [ ] **UX-03**: Unified search across all entities
- [ ] **UX-04**: Activity timeline on all entities
- [ ] **UX-05**: Inline editing where appropriate
- [ ] **UX-06**: Keyboard shortcuts

### Notifications

- [ ] **NOTIF-01**: Email notifications with templates
- [ ] **NOTIF-02**: In-app notification center
- [ ] **NOTIF-03**: User notification preferences
- [ ] **NOTIF-04**: Event-driven notification triggers
- [ ] **NOTIF-05**: Delivery tracking and retry logic

### Data Migration & Import

- [ ] **MIG-01**: File upload for historical data import
- [ ] **MIG-02**: Screenshot/image upload for form recreation (AI-assisted draft)
- [ ] **MIG-03**: NAVEX import connector
- [ ] **MIG-04**: EQS/Conversant import connector
- [ ] **MIG-05**: Generic CSV import with field mapping
- [ ] **MIG-06**: Preview before import
- [ ] **MIG-07**: Migration rollback capability

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Real-Time Collaboration

- **COLLAB-01**: Y.js CRDT for collaborative document editing
- **COLLAB-02**: Live cursors on shared documents
- **COLLAB-03**: Presence indicators (who's viewing)

### Employee Chatbot

- **CHAT-01**: Chatbot widget for policy Q&A
- **CHAT-02**: AI-guided intake conversation
- **CHAT-03**: Escalation to human when needed

### Client Success Dashboard (Ethico Internal)

- **CS-01**: Customer health scoring
- **CS-02**: Usage metrics per client
- **CS-03**: Churn risk indicators

### Support Portal (Ethico Internal)

- **SUPP-01**: Ticket management for customer issues
- **SUPP-02**: Knowledge base integration

## Out of Scope

Explicitly excluded from v1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Video attachments | Storage/bandwidth costs, processing complexity |
| Mobile native apps | PWA sufficient for v1 |
| SMS notifications | Email + in-app sufficient for v1; add in v1.x |
| Slack/Teams integration | Not core workflow; defer to v2 |
| API for third-party integrations | Internal use first; public API in v2 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (To be filled by roadmapper) | | |

**Coverage:**
- v1 requirements: ~120 total
- Mapped to phases: (pending)
- Unmapped: (pending)

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after stakeholder scoping*
