# Requirements: v2.0 PRD Feature Parity & Intelligence Layer

**Defined:** 2026-02-24
**Core Value:** Users can manage their entire compliance workflow in one AI-assisted platform
**Source:** Comprehensive PRD gap analysis + 4-dimension research (Stack, Features, Architecture, Pitfalls)

## v2.0 Requirements

Requirements for closing all PRD gaps. Each maps to roadmap phases starting at Phase 40.

### Rules & Automation Engine

- [x] **RULE-01**: Admin can create routing rules that auto-assign new cases to users/teams based on location, category, or severity
- [x] **RULE-02**: Admin can configure round-robin assignment distribution across a team
- [x] **RULE-03**: System monitors case SLAs and sends warning notification at 80% of target duration
- [x] **RULE-04**: System sends breach notification when case SLA is exceeded
- [x] **RULE-05**: Admin can configure escalation triggers (e.g., "if HIGH severity and unassigned >4hrs, escalate to CCO")
- [x] **RULE-06**: Case status auto-derives from investigation states (e.g., all investigations closed = case moves to review)
- [x] **RULE-07**: Admin can preview/test rules against historical data before activating
- [x] **RULE-08**: System logs all rule executions with outcome for audit trail
- [x] **RULE-09**: Admin can configure auto-routing by severity with manual override capability

### Anonymous Communication Relay

- [x] **RELAY-01**: Investigator can send message to anonymous reporter via Chinese Wall relay (PII stripped)
- [x] **RELAY-02**: Anonymous reporter can reply to investigator messages via ethics portal using access code
- [x] **RELAY-03**: System sends email notification to reporter (if email provided) when new message available, with random 1-6hr delay to prevent timing attacks
- [x] **RELAY-04**: Access code is emailed to reporter on RIU creation (if email provided)
- [x] **RELAY-05**: Admin can configure reporter visibility levels per tenant (Minimal, Standard, Detailed, Transparent)
- [x] **RELAY-06**: Message thread displays in ethics portal status page with read receipts
- [x] **RELAY-07**: All relay messages logged to audit trail with sender/receiver roles (not identities for anonymous)

### AI Intelligence Layer — RAG Foundation

- [ ] **RAG-01**: pgvector extension enabled with separate DocumentEmbedding table (explicit organizationId, not RLS-dependent for vector queries)
- [ ] **RAG-02**: Admin can upload knowledge base documents (PDF, DOCX, TXT) that are chunked and embedded
- [ ] **RAG-03**: Policy documents auto-embed on publish (chunked by section)
- [ ] **RAG-04**: Semantic search returns relevant document chunks with similarity scores, filtered by tenant
- [ ] **RAG-05**: Embedding model abstraction layer supports swapping providers without re-indexing schema changes

### AI Intelligence Layer — Chatbot

- [ ] **CHAT-01**: Floating chatbot widget available on Ethics Portal (no login required)
- [ ] **CHAT-02**: Floating chatbot widget available on Employee Portal (authenticated)
- [ ] **CHAT-03**: Chatbot answers policy questions with specific section citations and links
- [ ] **CHAT-04**: High confidence responses (>85%) show direct answer with source
- [ ] **CHAT-05**: Medium confidence responses (50-85%) show clarifying questions with confidence indicator
- [ ] **CHAT-06**: Low confidence responses (<50%) offer one-click escalation to compliance team
- [ ] **CHAT-07**: Chatbot can check case status via access code (anonymous reporters)
- [ ] **CHAT-08**: Consent capture before first chatbot interaction per session
- [ ] **CHAT-09**: Full chatbot transcript stored for audit with conversation entity linkage
- [ ] **CHAT-10**: FAQ database with curated answers that chatbot references before RAG fallback

### AI Intelligence Layer — Enhanced AI Features

- [ ] **AIEX-01**: Note cleanup tool shows before/after preview (bullet points to formal narrative)
- [ ] **AIEX-02**: Cross-case pattern detection alerts when same subject appears in 3+ cases
- [ ] **AIEX-03**: Pattern-based escalation combines rules engine with detection (e.g., "5+ cases in 90 days = auto-escalate")
- [ ] **AIEX-04**: AI trend identification surfaces statistical changes (e.g., "Harassment reports up 40% in Manufacturing")
- [ ] **AIEX-05**: One-click escalation from chatbot creates async inquiry for compliance team

### Disclosure & Campaign Automation

- [ ] **DISC-01**: Rolling campaigns auto-trigger on HRIS events (NEW_HIRE, ROLE_CHANGE, PROMOTION, ANNUAL_ANNIVERSARY)
- [ ] **DISC-02**: Admin can configure auto-clear rules (e.g., "nothing to disclose" auto-completes without review)
- [ ] **DISC-03**: Admin can configure auto-reject rules based on answer patterns
- [ ] **DISC-04**: Compliance officer can bulk approve/reject up to 100 disclosures at once
- [ ] **DISC-05**: System sends condition reminders at 14, 7, 3, and 1 day before due date
- [ ] **DISC-06**: Admin can configure multi-stage approval workflows for disclosures (up to 4 stages)
- [ ] **DISC-07**: Admin can set up proxy delegation (delegate authority with scope and validity period)
- [ ] **DISC-08**: Campaign can be paused and resumed by admin
- [ ] **DISC-09**: External party entity with type, risk rating, aliases, tax ID, government/sanctioned flags
- [ ] **DISC-10**: GT&E transactions aggregate across gifts from same external party for threshold enforcement
- [ ] **DISC-11**: Currency conversion with daily exchange rates for multi-currency GT&E
- [ ] **DISC-12**: Location-specific disclosure rules (state/country thresholds for government officials)

### Portal Completeness — Employee Portal

- [ ] **EMPL-01**: Manager sees Team Compliance Dashboard with outstanding disclosures/attestations per direct report
- [ ] **EMPL-02**: Manager can submit proxy report on behalf of employee with proper attribution
- [ ] **EMPL-03**: Manager can send bulk reminders to non-compliant team members
- [ ] **EMPL-04**: Employee sees "My Reports" with combined RIU + linked Case timeline
- [ ] **EMPL-05**: Employee can mark disclosure conditions as complete with supporting evidence upload
- [ ] **EMPL-06**: Employee can export their disclosure history
- [ ] **EMPL-07**: Session idle timeout warning modal (configurable countdown before auto-logout)

### Portal Completeness — Operator Console

- [ ] **OPER-01**: Operator sees AI-suggested follow-up questions during intake based on category
- [ ] **OPER-02**: Mandatory directive acknowledgment gate blocks RIU submission until directives reviewed
- [ ] **OPER-03**: QA manager sees operator quality metrics dashboard (QA return rate, average review time)
- [ ] **OPER-04**: Category selection dynamically loads category-specific intake questions
- [ ] **OPER-05**: Opening/closing statement management for operator scripts

### Portal Completeness — Ethics Portal

- [ ] **ETHP-01**: Crisis escalation banner displayed prominently (configurable per tenant, not dismissible)
- [ ] **ETHP-02**: Emergency hotline phone number configurable per tenant and displayed on landing
- [ ] **ETHP-03**: Multi-language auto-detection (URL param > user preference > browser header > HRIS > default)
- [ ] **ETHP-04**: Program transparency display with anonymized statistics (configurable by admin)

### Infrastructure — PWA

- [ ] **PWA-01**: Ethics portal installable as PWA (manifest.json, service worker, icons)
- [ ] **PWA-02**: Push notifications for case status updates, campaign reminders, SLA warnings
- [ ] **PWA-03**: Offline form submission queuing (submits when connectivity restored)
- [ ] **PWA-04**: Tenant-scoped service worker caches (no cross-tenant data leakage)

### Infrastructure — Analytics & Reporting

- [ ] **ANAL-01**: Fact tables (FACT_RIU_DAILY, FACT_CASE_DAILY, FACT_CAMPAIGN_DAILY) with incremental aggregation
- [ ] **ANAL-02**: Dashboard drag-and-drop widget builder with configurable layouts
- [ ] **ANAL-03**: Scheduled report delivery via email (daily, weekly, monthly cron)
- [ ] **ANAL-04**: Peer benchmarking data pipeline (anonymized cross-tenant aggregation)

### Infrastructure — Data & Compliance

- [ ] **DATA-01**: GDPR data deletion workflow using cryptographic shredding (encrypt PII per record, delete keys on erasure)
- [ ] **DATA-02**: Configurable data retention policies (auto-archive after N days/months/years)
- [ ] **DATA-03**: Document/attachment virus scan integration (ClamAV or Azure Defender)

### Infrastructure — Branding & Enterprise

- [ ] **BRAND-01**: Custom domain SSL routing for enterprise tenants
- [ ] **BRAND-02**: Custom font family upload and selection
- [ ] **BRAND-03**: Hero image upload for ethics portal landing
- [ ] **BRAND-04**: Custom email sender domain per tenant
- [ ] **BRAND-05**: "Powered by Ethico" removal option
- [ ] **BRAND-06**: Footer HTML customization
- [ ] **BRAND-07**: Custom CSS injection for enterprise branding

### Infrastructure — Deployment

- [ ] **DEPL-01**: Terraform IaC for Azure infrastructure (App Service, PostgreSQL, Redis, Blob Storage, Search)

---

## Summary

| Category                  | Requirements                  | Priority | Phase |
| ------------------------- | ----------------------------- | -------- | ----- |
| Rules & Automation Engine | 9 (RULE-01 through RULE-09)   | CRITICAL | 40-41 |
| Anonymous Communication   | 7 (RELAY-01 through RELAY-07) | CRITICAL | 42    |
| RAG Foundation            | 5 (RAG-01 through RAG-05)     | HIGH     | 43    |
| Chatbot                   | 10 (CHAT-01 through CHAT-10)  | HIGH     | 44    |
| Enhanced AI Features      | 5 (AIEX-01 through AIEX-05)   | HIGH     | 45    |
| Disclosure Automation     | 12 (DISC-01 through DISC-12)  | HIGH     | 46-47 |
| Employee Portal           | 7 (EMPL-01 through EMPL-07)   | MEDIUM   | 48    |
| Operator Console          | 5 (OPER-01 through OPER-05)   | MEDIUM   | 48    |
| Ethics Portal             | 4 (ETHP-01 through ETHP-04)   | MEDIUM   | 48    |
| PWA                       | 4 (PWA-01 through PWA-04)     | MEDIUM   | 49    |
| Analytics & Reporting     | 4 (ANAL-01 through ANAL-04)   | MEDIUM   | 50    |
| Data & Compliance         | 3 (DATA-01 through DATA-03)   | HIGH     | 50    |
| Branding & Enterprise     | 7 (BRAND-01 through BRAND-07) | LOW      | 51    |
| Deployment                | 1 (DEPL-01)                   | LOW      | 51    |
| **Total**                 | **83**                        |          |       |

## Future Requirements (v2.1+)

- Real-time collaborative editing (Y.js) for policy co-authoring
- Slack/Teams notification integration
- SMS notifications and SMS relay for anonymous reporters
- External party sanctions screening (Moody's, LSEG, Dow Jones integration)
- Cross-organization benchmarking (anonymized aggregate pipeline)
- Voice message transcription for hotline recordings
- Natural language rule builder ("route harassment cases to Sarah")
- Mobile native apps (iOS/Android)

## Out of Scope

| Feature                           | Reason                                                   |
| --------------------------------- | -------------------------------------------------------- |
| Y.js collaborative editing        | Complexity vs. value, defer to v3                        |
| Sanctions screening integration   | Specialized vendor selection needed per customer         |
| SMS relay for anonymous reporters | Requires Twilio/provider selection, regulatory review    |
| Cross-org benchmarking            | Needs anonymization pipeline, multi-customer data volume |
| Natural language rule builder     | Simple if/then UI sufficient for v2.0                    |
| Voice transcription               | Complex, no competitor offers it, low demand signal      |

## Traceability

| Requirement | Phase    | Status   |
| ----------- | -------- | -------- |
| RULE-01     | Phase 40 | Complete |
| RULE-02     | Phase 40 | Complete |
| RULE-03     | Phase 41 | Complete |
| RULE-04     | Phase 41 | Complete |
| RULE-05     | Phase 41 | Complete |
| RULE-06     | Phase 40 | Complete |
| RULE-07     | Phase 40 | Complete |
| RULE-08     | Phase 40 | Complete |
| RULE-09     | Phase 40 | Complete |
| RELAY-01    | Phase 42 | Complete |
| RELAY-02    | Phase 42 | Complete |
| RELAY-03    | Phase 42 | Complete |
| RELAY-04    | Phase 42 | Complete |
| RELAY-05    | Phase 42 | Complete |
| RELAY-06    | Phase 42 | Complete |
| RELAY-07    | Phase 42 | Complete |
| RAG-01      | Phase 43 | Pending  |
| RAG-02      | Phase 43 | Pending  |
| RAG-03      | Phase 43 | Pending  |
| RAG-04      | Phase 43 | Pending  |
| RAG-05      | Phase 43 | Pending  |
| CHAT-01     | Phase 44 | Pending  |
| CHAT-02     | Phase 44 | Pending  |
| CHAT-03     | Phase 44 | Pending  |
| CHAT-04     | Phase 44 | Pending  |
| CHAT-05     | Phase 44 | Pending  |
| CHAT-06     | Phase 44 | Pending  |
| CHAT-07     | Phase 44 | Pending  |
| CHAT-08     | Phase 44 | Pending  |
| CHAT-09     | Phase 44 | Pending  |
| CHAT-10     | Phase 44 | Pending  |
| AIEX-01     | Phase 45 | Pending  |
| AIEX-02     | Phase 45 | Pending  |
| AIEX-03     | Phase 45 | Pending  |
| AIEX-04     | Phase 45 | Pending  |
| AIEX-05     | Phase 45 | Pending  |
| DISC-01     | Phase 46 | Pending  |
| DISC-02     | Phase 46 | Pending  |
| DISC-03     | Phase 46 | Pending  |
| DISC-04     | Phase 46 | Pending  |
| DISC-05     | Phase 46 | Pending  |
| DISC-06     | Phase 46 | Pending  |
| DISC-07     | Phase 46 | Pending  |
| DISC-08     | Phase 46 | Pending  |
| DISC-09     | Phase 47 | Pending  |
| DISC-10     | Phase 47 | Pending  |
| DISC-11     | Phase 47 | Pending  |
| DISC-12     | Phase 47 | Pending  |
| EMPL-01     | Phase 48 | Pending  |
| EMPL-02     | Phase 48 | Pending  |
| EMPL-03     | Phase 48 | Pending  |
| EMPL-04     | Phase 48 | Pending  |
| EMPL-05     | Phase 48 | Pending  |
| EMPL-06     | Phase 48 | Pending  |
| EMPL-07     | Phase 48 | Pending  |
| OPER-01     | Phase 48 | Pending  |
| OPER-02     | Phase 48 | Pending  |
| OPER-03     | Phase 48 | Pending  |
| OPER-04     | Phase 48 | Pending  |
| OPER-05     | Phase 48 | Pending  |
| ETHP-01     | Phase 48 | Pending  |
| ETHP-02     | Phase 48 | Pending  |
| ETHP-03     | Phase 48 | Pending  |
| ETHP-04     | Phase 48 | Pending  |
| PWA-01      | Phase 49 | Pending  |
| PWA-02      | Phase 49 | Pending  |
| PWA-03      | Phase 49 | Pending  |
| PWA-04      | Phase 49 | Pending  |
| ANAL-01     | Phase 50 | Pending  |
| ANAL-02     | Phase 50 | Pending  |
| ANAL-03     | Phase 50 | Pending  |
| ANAL-04     | Phase 50 | Pending  |
| DATA-01     | Phase 50 | Pending  |
| DATA-02     | Phase 50 | Pending  |
| DATA-03     | Phase 50 | Pending  |
| BRAND-01    | Phase 51 | Pending  |
| BRAND-02    | Phase 51 | Pending  |
| BRAND-03    | Phase 51 | Pending  |
| BRAND-04    | Phase 51 | Pending  |
| BRAND-05    | Phase 51 | Pending  |
| BRAND-06    | Phase 51 | Pending  |
| BRAND-07    | Phase 51 | Pending  |
| DEPL-01     | Phase 51 | Pending  |

**Coverage:**

- v2.0 requirements: 83 total
- Mapped to phases: 83
- Unmapped: 0

---

_Requirements defined: 2026-02-24_
_Last updated: 2026-02-24 after roadmap creation_
