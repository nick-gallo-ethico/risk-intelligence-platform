# Requirements: Ethico Risk Intelligence Platform

**Defined:** 2026-01-31
**Core Value:** Investigators can track cases from intake through investigation, findings, and remediation in a unified, AI-native platform.

## v1.0 Requirements

Requirements for platform v1.0 release, organized by tier/phase.

### Tier 1.5 - Foundation Completion

Entities and features missing from Tier 1 that are required for downstream modules.

- [ ] **ENT-01**: Subject entity with case linkage, HRIS lookup, cross-case pattern detection
- [ ] **ENT-02**: Category entity with unified taxonomy across modules (CASE, DISCLOSURE, POLICY)
- [ ] **ENT-03**: Location entity with hierarchy, address fields, HRIS mapping
- [ ] **ENT-04**: BusinessUnit entity with hierarchy, organizational scoping
- [ ] **ENT-05**: Employee entity with HRIS sync, manager hierarchy, employment status
- [ ] **ENT-06**: Interaction entity for follow-up calls/contacts with QA workflow
- [ ] **ENT-07**: CaseMessage entity for two-way anonymous communication
- [ ] **ENT-08**: RemediationPlan and RemediationStep entities for corrective actions
- [ ] **ENT-09**: InvestigationTemplate entity for category-specific checklists
- [ ] **AUTH-05**: Azure AD SSO strategy with JIT user provisioning
- [ ] **AUTH-06**: Google OAuth 2.0 strategy with JIT user provisioning
- [ ] **AUTH-07**: TenantDomain entity for domain verification
- [ ] **ORG-01**: Organization model enhancement (domain, branding, settings JSON, tier)
- [ ] **USER-01**: User model enhancement (ssoProvider, ssoId, mfaEnabled, preferences)
- [ ] **CASE-01**: Case soft delete endpoint with archival

### Tier 2 - Operator Console

Ethico internal tool for hotline operators and QA staff.

- [ ] **OPC-01**: ClientProfile entity with phone numbers, branding, directives
- [ ] **OPC-02**: Directive entity with types, triggers, versioning
- [ ] **OPC-03**: OperatorSession entity for call tracking
- [ ] **OPC-04**: Client profile auto-load from phone number lookup
- [ ] **OPC-05**: Client profile manual search
- [ ] **OPC-06**: Hotline intake workflow with structured form sections
- [ ] **OPC-07**: Subject addition with HRIS employee lookup
- [ ] **OPC-08**: Directives panel with contextual display (opening/closing, category-specific)
- [ ] **OPC-09**: QA queue with severity/age sorting, claim/unclaim
- [ ] **OPC-10**: QA review screen with edit capabilities, checklist
- [ ] **OPC-11**: Case release to client with routing preview
- [ ] **OPC-12**: Follow-up call identification (access code or name lookup)
- [ ] **OPC-13**: Follow-up capture as Interaction (not new case)
- [ ] **OPC-14**: Operator dashboard with recent cases, metrics
- [ ] **AI-01**: AI category suggestions during intake
- [ ] **AI-02**: AI note cleanup (bullets to formal narrative)
- [ ] **AI-03**: AI summary generation (2-3 sentences)
- [ ] **AI-04**: AI keyword detection for escalation triggers

### Tier 2 - Ethics Portal (Public)

Public-facing landing page for anonymous and identified reporting.

- [ ] **EPL-01**: EthicsPortalConfig entity with branding, content, settings
- [ ] **EPL-02**: Public landing page with client branding
- [ ] **EPL-03**: Crisis escalation section (prominent, non-dismissible)
- [ ] **EPL-04**: Anonymous report submission without login
- [ ] **EPL-05**: Access code generation and display
- [ ] **EPL-06**: Status check via access code
- [ ] **EPL-07**: Follow-up submission via access code
- [ ] **EPL-08**: Two-way messaging via portal (anonymous relay)
- [ ] **EPL-09**: Confidentiality statement display before form
- [ ] **EPL-10**: Configurable reporter visibility levels

### Tier 2 - Employee Portal (Authenticated)

Self-service interface for employees.

- [ ] **EMP-01**: SSO authentication (SAML/OIDC) flow
- [ ] **EMP-02**: Email magic link authentication
- [ ] **EMP-03**: Dashboard with action items, recent activity
- [ ] **EMP-04**: My Cases list (submitted cases only)
- [ ] **EMP-05**: Case detail view with configurable visibility
- [ ] **EMP-06**: Follow-up submission on existing case
- [ ] **EMP-07**: Two-way messaging with investigators
- [ ] **EMP-08**: File attachments on messages (up to 25MB)
- [ ] **EMP-09**: Notification inbox (in-app)
- [ ] **EMP-10**: Manager team dashboard (direct reports compliance)
- [ ] **EMP-11**: Proxy report submission by manager

### Tier 3 - Disclosures Module (MVP)

Core disclosure management capabilities.

- [ ] **DIS-01**: DisclosureForm entity with questions, triggers, settings
- [ ] **DIS-02**: Standard disclosure library (7 types: COI, Gift, Outside Employment, etc.)
- [ ] **DIS-03**: Disclosure entity with versioning, status, conditions
- [ ] **DIS-04**: Ad-hoc disclosure submission (authenticated)
- [ ] **DIS-05**: Ad-hoc disclosure submission (unauthenticated with employee ID)
- [ ] **DIS-06**: Single-stage approval workflow
- [ ] **DIS-07**: Reviewer decision (clear, reject, approve with conditions)
- [ ] **DIS-08**: Condition entity with due dates, reminders
- [ ] **DIS-09**: Employee condition completion flow
- [ ] **DIS-10**: Employee Portal: My Disclosures view
- [ ] **DIS-11**: Disclosure → Case escalation
- [ ] **DIS-12**: ExternalParty entity for cross-disclosure linking
- [ ] **DIS-13**: Disclosure activity timeline

### Tier 3 - Disclosures Campaign Engine

Campaign-driven disclosure collection.

- [ ] **CMP-01**: Campaign entity (point-in-time and rolling)
- [ ] **CMP-02**: CampaignAssignment entity with HRIS snapshot
- [ ] **CMP-03**: HRIS-driven targeting (include/exclude rules)
- [ ] **CMP-04**: Campaign launch with target preview
- [ ] **CMP-05**: Campaign progress dashboard
- [ ] **CMP-06**: Reminder schedule (configurable intervals)
- [ ] **CMP-07**: Campaign exceptions (prior completion, terminated, manual)
- [ ] **CMP-08**: Multi-stage approval workflow (up to 4 stages)
- [ ] **CMP-09**: Conditional routing rules
- [ ] **CMP-10**: Auto-clear and auto-reject rules

### Tier 4 - AI Features

AI-powered assistance throughout platform.

- [ ] **AI-05**: AI translation with original preservation
- [ ] **AI-06**: AI risk scoring for cases
- [ ] **AI-07**: Case Q&A (ask questions about specific case)
- [ ] **AI-08**: Subject summary across cases
- [ ] **AI-09**: Policy Q&A chatbot (Employee Portal)

### Tier 5 - Analytics & Notifications

Dashboards, reporting, and communication.

- [ ] **RPT-01**: Case operational dashboard
- [ ] **RPT-02**: Campaign completion dashboard
- [ ] **RPT-03**: Disclosure metrics dashboard
- [ ] **RPT-04**: Saved views with custom columns/filters
- [ ] **RPT-05**: Export to CSV
- [ ] **NTF-01**: Email notifications (case assigned, status change, messages)
- [ ] **NTF-02**: Email notifications (campaign invite, reminders, overdue)
- [ ] **NTF-03**: In-app notification preferences
- [ ] **NTF-04**: Manager notifications (team member overdue)

## v2.0 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Policy Management

- **POL-01**: Policy entity with versioning, approval workflows
- **POL-02**: Policy distribution campaigns
- **POL-03**: Attestation tracking
- **POL-04**: Policy translation

### Advanced Features

- **ADV-01**: Real-time AI assist during calls
- **ADV-02**: Document AI analysis (vector search)
- **ADV-03**: SMS communication relay
- **ADV-04**: Slack/Teams notifications
- **ADV-05**: PWA offline mode
- **ADV-06**: Advanced duplicate detection

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mobile native apps | Web-first strategy, PWA for mobile |
| Video calling | Outside core compliance workflow |
| Custom workflow builder UI | Admin-configured workflows sufficient |
| Real-time chat | Async messaging matches compliance staffing |
| Blockchain audit trail | Overkill for compliance use case |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENT-01 to ENT-09 | Phase 1 | Pending |
| AUTH-05 to AUTH-07 | Phase 1 | Pending |
| ORG-01, USER-01, CASE-01 | Phase 1 | Pending |
| OPC-01 to OPC-14 | Phase 2 | Pending |
| AI-01 to AI-04 | Phase 2 | Pending |
| EPL-01 to EPL-10 | Phase 3 | Pending |
| EMP-01 to EMP-11 | Phase 3 | Pending |
| DIS-01 to DIS-13 | Phase 4 | Pending |
| CMP-01 to CMP-10 | Phase 5 | Pending |
| AI-05 to AI-09 | Phase 6 | Pending |
| RPT-01 to RPT-05 | Phase 7 | Pending |
| NTF-01 to NTF-04 | Phase 7 | Pending |

**Coverage:**
- v1.0 requirements: 73 total
- Mapped to phases: 73
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 after extraction from PRDs*
