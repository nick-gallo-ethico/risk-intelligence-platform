# Project Research Summary

**Project:** Ethico Risk Intelligence Platform
**Domain:** Healthcare-focused Enterprise Compliance Management SaaS
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

The Ethico Risk Intelligence Platform is a multi-tenant compliance management system designed around a **HubSpot-inspired architecture** (immutable inputs → mutable work containers) with **AI-first capabilities** throughout. Research confirms this approach is sound and differentiated: competitors grew through acquisition (fragmented UX, legacy feel), while a natively unified platform with modern AI integration addresses an emerging market gap.

The recommended approach follows three architectural pillars: (1) **HubSpot data patterns** - RIU→Case architecture mimics Contact→Deal for clean separation of intake vs. work; saved views, pipelines, and property models for configurability; polymorphic task aggregation for "My Work" across modules. (2) **AI-first from ground up** - Context hierarchy (org→team→user→entity), scoped agents per view, action catalog with risk-tiered confirmation, skills registry for reusable prompts. (3) **PostgreSQL RLS multi-tenancy** - Database-enforced isolation with defense-in-depth application filtering, not bolt-on tenant checks.

Key risks center on **multi-tenant security** (RLS false confidence is the #1 pitfall—test with non-superuser accounts), **AI data isolation** (prompt injection and cross-tenant context leakage), and **deadline-driven shortcuts** (Q1 deadline with 1,500 customer migration creates pressure to skip security gates). Mitigation requires non-negotiable security guardrails, scope reduction over quality reduction, and AI-first design from day one (cannot retrofit tenant isolation into AI features).

## Key Findings

### Recommended Stack

The core stack (NestJS + Next.js 14 + PostgreSQL/Prisma + shadcn/ui) is already established. Research focused on additional components to complete the platform: AI integration (@anthropic-ai/sdk with official TypeScript SDK), background jobs (BullMQ—TypeScript rewrite of Bull with flow producers for AI pipelines), HRIS unified API (Merge.dev for 50+ providers), email (Resend for modern DX with nodemailer fallback), real-time (Socket.IO + Y.js for collaboration), hybrid search (Elasticsearch + pgvector for keyword + semantic), report generation (Puppeteer for PDF, ExcelJS for Excel), and multi-provider SSO (passport-saml + passport-azure-ad).

**Core technologies:**
- **@anthropic-ai/sdk** (AI) — Official Claude API client with streaming, tool use, MCP support; TypeScript-first
- **BullMQ + @nestjs/bullmq** (Background Jobs) — Flow producers for AI pipeline orchestration, Redis-backed queues with Bull Board admin UI
- **Merge.dev (@mergeapi/merge-hris-node)** (HRIS) — Single API for 50+ HRIS systems; SOC2 compliant, avoids maintaining individual adapters
- **Elasticsearch + pgvector** (Search) — Hybrid: keyword search + facets via Elasticsearch, semantic similarity + RAG via pgvector
- **Socket.IO + Y.js** (Real-time) — WebSocket gateway for notifications (Redis adapter for scaling), Y.js CRDT for policy co-editing
- **Puppeteer + ExcelJS** (Reports) — HTML-to-PDF with full CSS/React components; streaming Excel for 1M+ rows
- **passport-saml + passport-azure-ad** (SSO) — SAML 2.0 for any IdP + native Azure AD support; JIT provisioning with domain verification

### Expected Features

**Must have (table stakes):**
- **Case management core** — Multi-channel intake (phone, web, chatbot), investigation tracking with findings/outcomes, case assignment/routing with SLAs, audit trail (immutable, timestamped), document attachment with versioning
- **Anonymous reporting** — True anonymity (no IP tracking), access codes for status checks, two-way relay communication, EU Whistleblowing Directive compliance
- **Disclosures & COI** — Configurable forms (COI, gifts, outside employment), campaign distribution with completion tracking, threshold-based case creation (gift > $X triggers review)
- **Policy management** — Document repository with version control, attestation campaigns with tracking, policy search and access control
- **Analytics & reporting** — Dashboard with KPI cards, standard report library, PDF/Excel export, trend analysis with drill-down
- **Security baseline** — SSO (SAML, Azure AD, Google), RBAC with granular permissions, SOC 2 Type II certification path, HIPAA compliance (BAAs, encryption, PHI protection), MFA

**Should have (competitive differentiators):**
- **AI-powered features** (table stakes by late 2026) — Case summarization, AI note cleanup (operator bullets → formal narrative), compliance-trained translation (80+ languages), risk scoring for triage, natural language search ("show me harassment cases from EMEA"), policy Q&A chatbot
- **Modern UX patterns** — Saved views/custom filters (HubSpot-style), unified "My Work" queue (cross-module task aggregation), clean interface ("quieter, focused" 2026 trend), drag-and-drop dashboards, configurable columns, in-app notifications (not email-only)
- **Investigation excellence** — Category-specific templates with checklists, remediation plan library, subject tracking across cases (repeat offender detection), case merge, multi-investigator collaboration, structured interview capture
- **Healthcare-specific** — HIPAA workflows (breach notification, PHI handling), PHI detection/redaction (AI-assisted), healthcare taxonomy (EMTALA, Stark, kickback), sanction screening (OIG/SAM), BAA support

**Defer (v2+):**
- **Advanced AI** (pattern detection across cases, document analysis) — Needs data volume; complex to implement correctly
- **Mobile PWA** — Web works on mobile; nice-to-have for field access
- **Benchmarking against peers** (HR Acuity feature) — Needs multi-customer data volume
- **Live chat** — Async inquiry queue sufficient; compliance teams small (1-5 people)

### Architecture Approach

The platform extends an existing NestJS/PostgreSQL RLS foundation with five new architectural capabilities, designed around event-driven module communication and scoped AI agents. The AI integration layer uses context hierarchy (platform→org→team→user→entity) for Claude Code-style customization, action catalog with risk-tiered confirmation (compliance data is consequential), and model routing (Haiku/Sonnet/Opus) based on task type and plan tier. Multi-provider SSO with JIT provisioning resolves tenants by email domain. Unified notifications use event bus (@nestjs/event-emitter + BullMQ) with user preferences per event type (email, in-app, digest). Task aggregation implements polymorphic TaskSource interface across modules for "My Work" view. Workflow engine operates on entity state (doesn't duplicate), with rule-based assignment and SLA escalation.

**Major components:**
1. **AI Integration Layer** — ContextLoader (hierarchical), SkillsRegistry (reusable prompts), ActionCatalog (permission-filtered executable actions), ModelRouter (Haiku/Sonnet/Opus selection), AgentSelector (scoped by view), AIProviderManager (Claude primary, Azure OpenAI fallback)
2. **Event Bus + Workflow Engine** — @nestjs/event-emitter for module decoupling, BullMQ for async side effects, WorkflowEngine for state machine transitions with SLA tracking, AssignmentService with pluggable rules (round robin, category-based, location-based), EscalationService for deadline breaches
3. **Multi-Provider SSO** — Dynamic passport strategies (Azure AD, Google, SAML 2.0), TenantService for domain→org resolution with verification, JIT provisioning with role mapping, JWT with refresh rotation (15min access, 7d refresh), session revocation via Redis
4. **Unified Notification System** — NotificationPreferences per user/event type, multi-channel adapters (email via Resend, in-app via Socket.IO), DigestService for daily/weekly aggregation, TemplateService for entity context rendering
5. **Task Aggregation ("My Work")** — TaskSource interface implemented by each module (Cases, Investigations, Disclosures, Approvals), PriorityCalculator for SLA urgency scoring, TaskAggregationService for polymorphic query across sources

### Critical Pitfalls

1. **RLS False Confidence** — PostgreSQL RLS bypassed by superuser accounts (used in dev testing), contaminated by connection pooling, fails in complex queries (CVE-2024-10976 with subqueries/CTEs). **Avoid:** Test with non-superuser accounts matching production roles; defense-in-depth (application + RLS, not RLS alone); `SET LOCAL` on every request; dedicated tenant isolation E2E tests per entity; audit query plans with EXPLAIN.

2. **AI Cross-Tenant Data Leakage** — Prompt templates pull from multiple tenants, shared vector indices leak via semantic search, LLM caching creates side-channel (PROMPTPEEK attack). **Avoid:** Tenant filter (`organizationId`) in every AI data fetch; per-tenant vector indices (no shared pgvector/Pinecone); prompt sanitization; AI interaction logging for audit; rate limiting per tenant; output validation for unexpected entity references.

3. **Migration Data Corruption** — 1,500+ customer migration from legacy systems (Ethico legacy, NAVEX, Case IQ, EQS) causes lost audit trails, broken relationships, compliance gaps. 73% of migrations struggle; legacy format clashes cause 45% of failures. **Avoid:** Migration-ready schema (`source_system`, `source_record_id`, `migrated_at` on all entities); per-source-system adapters (not one-size-fits-all); validation framework comparing record counts and relationships; staged rollout (3-5 pilots, then batched); audit trail for migration operations.

4. **HIPAA as Afterthought** — PHI cached in logs, transmitted to vendors without BAAs, exposed through analytics integrations. 540+ organizations reported breaches in 2023 (112M people). **Avoid:** BAA before integration (verify Anthropic's healthcare BAA status); PHI inventory documenting all flows; no PHI in logs (use correlation IDs); minimum necessary access (no "admin just in case"); privacy-by-design from start; continuous compliance monitoring.

5. **Deadline-Driven Security Shortcuts** — Q1 deadline pressure leads to "we'll fix it later" for security. These shortcuts become permanent (technical debt compounds, 20-40% productivity loss per McKinsey). **Avoid:** Security as non-negotiable gate; scope reduction over quality reduction; automated security gates that block deployment; explicit debt tracking with remediation timeline; MVP security cannot be compromised.

## Implications for Roadmap

Based on research, suggested phase structure follows **dependency-driven order** (event infrastructure → workflow engine → domain modules → AI integration) rather than feature-driven. The HubSpot parallel guides entity modeling (RIU→Case mirrors Contact→Deal), while AI-first requirements shape every phase (context hierarchy, activity logs with natural language, AI enrichment fields on entities).

### Phase 1: Event Infrastructure Foundation
**Rationale:** All other components depend on event-driven communication. Unified audit trail required before any domain modules. This phase establishes the "nervous system" for the platform—modules communicate via events, not direct calls, enabling loose coupling and independent scaling.

**Delivers:**
- Event bus setup (@nestjs/event-emitter)
- BullMQ queue infrastructure with Redis
- Unified AUDIT_LOG table and service (natural language descriptions)
- Tenant middleware (SET LOCAL on every request)
- Connection pool testing suite

**Stack elements:** BullMQ + @nestjs/bullmq, Redis, PostgreSQL session variables

**Avoids Pitfall:** Connection pool tenant context contamination (Pitfall #6)—establish SET LOCAL pattern before domain modules use it

**Research needed:** None—standard NestJS patterns well-documented

---

### Phase 2: Workflow Engine Core
**Rationale:** Cases, Disclosures, and Campaigns all need workflow automation. Building this before domain modules enables consistent workflow patterns across the platform. Workflow engine operates on entity state (DDD principle), doesn't maintain separate state.

**Delivers:**
- WorkflowDefinition schema and CRUD
- WorkflowEngine state machine logic
- AssignmentService with pluggable rules (round robin, category, location)
- SLA tracking and escalation via BullMQ delayed jobs
- Workflow action hooks for domain modules

**Stack elements:** Prisma schema extensions, BullMQ delayed jobs

**Avoids Pitfall:** Hardcoded assignment rules (Anti-Pattern #5)—rules stored as data, interpreted at runtime

**Research needed:** Minimal—workflow patterns defined in WORKING-DECISIONS.md (G.1-G.5)

---

### Phase 3: Multi-Provider SSO & Authentication
**Rationale:** AI features and domain modules need authenticated users. Can run in parallel with Phase 2. SSO complexity front-loaded enables smooth onboarding for enterprise customers (1,500 customer migration requires self-service SSO setup).

**Delivers:**
- Passport.js strategies (Azure AD, Google, SAML 2.0)
- TenantService with email domain verification
- JIT provisioning with role mapping
- JWT token management (access + refresh with rotation)
- Session revocation via Redis
- MFA support

**Stack elements:** passport-saml, passport-azure-ad, passport-google-oauth20, @nestjs/passport

**Avoids Pitfall:** JWT token bloat (Pitfall #13)—minimal claims only (sub, organizationId, role, sessionId, exp)

**Research needed:** None—fully specified in TECH-SPEC-AUTH-MULTITENANCY.md

---

### Phase 4: Case Management Core (RIU→Case Architecture)
**Rationale:** Core domain module; other modules reference Cases. Establishes RIU (immutable input) → Case (mutable work container) pattern, the HubSpot Contact→Deal parallel. This phase proves the architecture works before expanding to other modules.

**Delivers:**
- RIU entity (Risk Intelligence Unit—immutable)
- Case entity (mutable work container)
- Investigation entity with findings/outcomes
- Subject tracking (for cross-case pattern detection)
- RIU-Case associations (many-to-many with type: primary/related/merged_from)
- Case assignment and routing
- Basic workflow integration (status transitions)
- Reporter communication (anonymous relay)

**Stack elements:** Prisma entities, workflow engine integration, event emission

**Avoids Pitfall:** RIU immutability violations (Pitfall #10)—no UPDATE endpoints for RIU content fields; corrections go on Case

**Features addressed:** Case management core (table stakes), anonymous reporting, investigation tracking

**Research needed:** Phase-specific research for anonymous relay implementation (encryption, access code generation, Chinese Wall model)

---

### Phase 5: Unified Notification System
**Rationale:** Workflows trigger notifications; depends on event bus. Enables real-time awareness and reduces email overload with user preferences. Notifications are infrastructure—all modules consume this service.

**Delivers:**
- NotificationPreference schema and service (per user, per event type)
- Email adapter (Resend with nodemailer fallback)
- In-app adapter (Socket.IO push with Redis adapter for scaling)
- DigestService for daily/weekly aggregation (BullMQ cron)
- TemplateService for entity context rendering
- Event listeners for case.created, investigation.assigned, sla.breached

**Stack elements:** Resend, @nestjs-modules/mailer, Socket.IO, @socket.io/redis-adapter

**Avoids Pitfall:** Email-only notifications (Anti-Feature)—in-app notification center + email as fallback

**Features addressed:** In-app notifications (differentiator vs. legacy competitors)

**Research needed:** None—notification patterns straightforward

---

### Phase 6: Web Form Intake (First RIU Source)
**Rationale:** Simpler than Operator Console (existing system); proves RIU creation flow. Configurable forms establish pattern for Disclosures module. Web form submissions create RIUs immediately (no QA review like operator console).

**Delivers:**
- FormDefinition schema (field types, validation rules, conditional logic)
- FormBuilder UI (drag-and-drop field configuration)
- Public form submission endpoint (anonymous + authenticated)
- RIU creation from submission
- Automatic Case creation with routing rules
- Form analytics (submission rates, completion time)

**Stack elements:** Prisma for form definitions, RIU entity from Phase 4

**Avoids Pitfall:** Over-complicated workflow builders (Anti-Feature)—pre-built templates with simple customization, not developer-grade complexity

**Features addressed:** Web form intake (table stakes), configurable forms (disclosures foundation)

**Research needed:** Phase-specific research for form builder patterns (JSON schema validation, conditional logic engines)

---

### Phase 7: Task Aggregation & "My Work"
**Rationale:** Requires domain modules (Cases, Investigations) to expose TaskSource implementations. Delivers HubSpot-style unified queue, major UX differentiator vs. legacy competitors' siloed views.

**Delivers:**
- TaskSource interface definition
- Module implementations (CasesTaskSource, InvestigationsTaskSource)
- TaskAggregationService (polymorphic query)
- PriorityCalculator (SLA urgency, severity, age scoring)
- My Work API endpoint and UI view
- Saved views/custom filters (HubSpot pattern)

**Stack elements:** TypeScript interfaces, Prisma aggregation queries

**Avoids Pitfall:** Monolithic AI service (Anti-Pattern #1)—scoped context per module via TaskSource interface

**Features addressed:** Unified "My Work" queue (differentiator), saved views (HubSpot pattern)

**Research needed:** Minimal—polymorphic query pattern standard

---

### Phase 8: AI Integration Layer
**Rationale:** AI layer consumes context from all other components. Must be designed in from start (cannot retrofit tenant isolation). Builds on entity data from Phases 4-7, uses workflow engine from Phase 2 for AI-triggered actions.

**Delivers:**
- ContextLoaderService (platform→org→team→user→entity hierarchy)
- SkillsRegistryService (platform + org-custom + user-personal skills)
- ActionCatalogService (static registry with permission filtering)
- ModelRouterService (Haiku/Sonnet/Opus selection based on task type and plan tier)
- AgentSelectorService (scoped agents: Investigation Agent, Case Agent, Compliance Manager Agent)
- AIProviderManager (Claude primary, Azure OpenAI fallback)
- AI interaction logging (audit trail)
- Rate limiting per tenant (token bucket algorithm)

**Stack elements:** @anthropic-ai/sdk, pgvector for embeddings, Redis for rate limiting

**Avoids Pitfalls:**
- **Cross-tenant AI leakage (Pitfall #2)** — Tenant filter in every data fetch for AI context; per-tenant vector indices
- **AI rate limit exhaustion (Pitfall #8)** — Prompt caching (5-10x throughput), request batching, graceful degradation
- **HIPAA violations (Pitfall #4)** — Verify Anthropic BAA before production; AI interaction logging; PHI inventory

**Features addressed:** AI summarization, note cleanup, translation, risk scoring, natural language search (all differentiators becoming table stakes)

**Research needed:** Phase-specific research for Claude Code skills patterns, prompt caching strategies, rate limit tier planning

---

### Phase 9: Disclosures & COI Module
**Rationale:** Builds on Web Form infrastructure (Phase 6) and Campaign engine. Separate module from Cases but shares workflow engine. Disclosures create RIUs, which create Cases if thresholds met.

**Delivers:**
- Disclosure form templates (COI, gifts & entertainment, outside employment)
- Campaign/distribution engine (target audience, due dates, reminders)
- CampaignAssignment tracking (who completed, who's overdue)
- Threshold-based case creation (gift > $X triggers RIU → Case)
- Completion tracking dashboard
- Disclosure history (year-over-year comparison)

**Stack elements:** Form definitions from Phase 6, workflow engine from Phase 2, notification system from Phase 5

**Avoids Pitfall:** Monolithic modules requiring all-or-nothing (Anti-Feature)—modular pricing, can adopt incrementally

**Features addressed:** Disclosures & COI (table stakes), campaign distribution (table stakes)

**Research needed:** Minimal—extends established patterns

---

### Phase 10: Policy Management Module
**Rationale:** Separate module; competitors have strong offerings (NAVEX PolicyTech is industry standard). Defer until core case management proven. Uses Campaign engine for attestation distribution.

**Delivers:**
- Policy document repository (versioning with parentPolicyId chains)
- Approval workflow integration
- Attestation campaigns (distribution + tracking)
- Policy translations (AI-powered with version control)
- Policy search (full-text via Elasticsearch)
- Policy-Case linking (for violation tracking)

**Stack elements:** Azure Blob Storage for documents, Elasticsearch for search, AI translation via Phase 8

**Avoids Pitfall:** Policy attestation forcing all-or-nothing (Anti-Feature)—policies can be published without attestation requirement

**Features addressed:** Policy management (table stakes), AI translation (differentiator)

**Research needed:** Phase-specific research for document versioning strategies, attestation workflow patterns

---

### Phase 11: Analytics & Reporting
**Rationale:** Depends on data-producing modules (Phases 4-10). Aggregates cross-module metrics. Analytics come late because they need data volume to be meaningful.

**Delivers:**
- Dashboard builder (drag-and-drop, HubSpot-style)
- Standard report library (case aging, completion rates, category distribution)
- Cross-module reporting (correlate policy attestations with case types)
- PDF/Excel report generation (Puppeteer + ExcelJS)
- AI-powered natural language queries ("show me Q4 harassment cases by region")
- Trend analysis with drill-down

**Stack elements:** Puppeteer, ExcelJS, Elasticsearch aggregations, AI query translation

**Avoids Pitfall:** Rigid reporting requiring IT (Anti-Feature)—self-service with drag-and-drop

**Features addressed:** Analytics & reporting (table stakes), AI natural language queries (differentiator)

**Research needed:** Phase-specific research for drag-and-drop dashboard libraries, Puppeteer Azure deployment (may need container-based)

---

### Phase 12: HRIS Integration & Employee Sync
**Rationale:** Supports auto-assignment rules (by location, department), distribution targeting (send to "all managers in EMEA"), and employee data accuracy. Uses Merge.dev to avoid maintaining 50+ individual integrations.

**Delivers:**
- HRIS connection management (OAuth, API key storage per tenant)
- Employee sync service (scheduled via BullMQ)
- Field mapping UI (HRIS fields → Employee entity)
- Sync conflict resolution
- Employee directory (searchable via Elasticsearch)
- Auto-assignment rule enhancements (location-based, role-based)

**Stack elements:** @mergeapi/merge-hris-node, BullMQ for scheduled sync, Elasticsearch for directory

**Avoids Pitfall:** Direct HRIS APIs (maintenance burden)—Merge.dev unified API handles 50+ providers

**Features addressed:** HRIS integration (differentiator for enterprise), employee data accuracy

**Research needed:** Phase-specific research for Merge.dev implementation patterns, sync conflict strategies

---

### Phase Ordering Rationale

- **Foundation first (Phases 1-3)** — Event bus, workflow, auth are prerequisites for all domain modules. These establish patterns that modules follow.
- **Prove core domain (Phase 4)** — Case management is the heart of the platform; RIU→Case architecture must work before expanding.
- **Infrastructure when needed (Phase 5)** — Notifications after workflows can trigger them.
- **Expand domain (Phases 6-10)** — Web forms → Task aggregation → AI → Disclosures → Policies. Each builds on previous; AI needs entity data to contextualize.
- **Analytics last (Phase 11)** — Needs data volume from domain modules.
- **Integration last (Phase 12)** — HRIS after core workflows proven; enhances rather than blocks.

**Dependency-driven not feature-driven:** This order follows technical dependencies (event bus before events, entities before AI context) rather than business priority. The HubSpot parallel reinforces this: you build the platform infrastructure (properties, associations, pipelines) before you build modules that use it.

**AI-first throughout:** Every phase includes AI considerations—audit logs with natural language (Phase 1), context hierarchy fields on entities (Phase 4), AI interaction patterns (Phase 8). Cannot retrofit AI-first design; must be baked in from foundation.

**Security non-negotiable:** Each phase includes tenant isolation tests, audit logging, permission checks. Security guardrails block phase completion if not met.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 4 (Case Management):** Anonymous relay implementation—encryption patterns, access code generation algorithms, Chinese Wall model for operator/client separation
- **Phase 6 (Web Forms):** Form builder patterns—JSON schema validation libraries, conditional logic engines (show Field B if Field A = X), best practices for complex form state
- **Phase 8 (AI Integration):** Claude Code skills patterns—how to structure reusable prompts, skills marketplace curation, prompt caching strategies for 5-10x throughput, rate limit tier planning (when to request enterprise tier)
- **Phase 10 (Policy Management):** Document versioning strategies—conflict resolution when multiple users edit, branch/merge patterns for policy variants, attestation workflow patterns (partial completion, delegation)
- **Phase 11 (Analytics):** Puppeteer Azure deployment—container requirements, Chrome binary packaging, memory considerations for concurrent PDF generation; drag-and-drop dashboard libraries (evaluate Tremor, Recharts, Victory for React)
- **Phase 12 (HRIS Integration):** Merge.dev implementation patterns—webhook vs. polling for real-time sync, sync conflict resolution strategies (source of truth determination), field mapping best practices

Phases with standard patterns (skip deep research):

- **Phase 1 (Event Infrastructure):** NestJS event emitter well-documented, BullMQ patterns established
- **Phase 2 (Workflow Engine):** State machine patterns defined in WORKING-DECISIONS.md (G.1-G.5)
- **Phase 3 (SSO):** Fully specified in TECH-SPEC-AUTH-MULTITENANCY.md
- **Phase 5 (Notifications):** Standard patterns, multiple reference implementations
- **Phase 7 (Task Aggregation):** Polymorphic query pattern straightforward
- **Phase 9 (Disclosures):** Extends Web Form patterns from Phase 6

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All components verified with official docs, npm packages confirmed mature (2.9k+ dependents for @anthropic-ai/sdk); versions specified; NestJS ecosystem compatibility checked |
| Features | MEDIUM-HIGH | Table stakes verified across 4+ competitors (NAVEX, EQS, Case IQ, HR Acuity); AI trends confirmed with late-2025 announcements; healthcare-specific features validated with HIPAA requirements; pricing low confidence (limited public data) |
| Architecture | HIGH | Detailed specs exist in TECH-SPEC-AI-INTEGRATION.md v3.0, TECH-SPEC-AUTH-MULTITENANCY.md; patterns verified with Microsoft Azure SaaS architecture docs, NestJS official guides; HubSpot parallel reinforced by existing platform vision |
| Pitfalls | HIGH | RLS vulnerability (CVE-2024-10976) documented by PostgreSQL; AI leakage patterns confirmed in research (PROMPTPEEK attack); migration failure rates (73%) from Gartner/Kanerika analysis; HIPAA breach statistics from HHS OCR; technical debt research from McKinsey |

**Overall confidence:** HIGH

### Gaps to Address

Research was thorough, but several areas need validation during implementation:

- **Anthropic BAA for healthcare:** Verify Anthropic has signed HIPAA Business Associate Agreement; if not, Azure OpenAI required for PHI-containing prompts. Critical for Phase 8 (AI Integration).
- **Merge.dev healthcare HRIS coverage:** Confirm Merge.dev supports healthcare-specific HRIS systems (e.g., Kronos, healthcare-focused vendors). May need direct integrations for niche systems. Affects Phase 12 (HRIS).
- **Elasticsearch sizing for multi-tenancy:** Per-tenant indices (`org_{organizationId}_{type}`) need capacity planning. At 1,500 customers, may require index lifecycle management (ILM) policies. Research during Phase 11 (Analytics).
- **Y.js persistence strategy:** If real-time policy collaboration needed (deferred from MVP), Y.js document storage requires research—database vs. Redis vs. separate Y.js server. Research if feature prioritized post-MVP.
- **Puppeteer on Azure App Service:** May require container-based deployment with Chrome binary; memory considerations for concurrent PDF generation. Research during Phase 11 (Analytics).
- **Cross-tenant AI benchmarking:** If "benchmarking against peers" feature (deferred to v2+) is prioritized, research anonymization strategies for cross-tenant pattern detection without PHI exposure. Research when/if feature prioritized.

**Migration data quality:** The 1,500 customer migration from legacy systems (current Ethico platform, NAVEX, Case IQ, EQS) is the highest business risk. Schema is migration-ready (`source_system`, `source_record_id`, `migrated_at`), but validation framework and per-source adapters need detailed design during migration phase. Consider hiring migration specialists or partnering with data migration firm for large-volume customers.

**Deadline pressure:** Q1 deadline creates elevated risk for security shortcuts. Mitigation requires organizational discipline—scope reduction over quality reduction, automated security gates that cannot be bypassed, explicit tracking of any technical debt with remediation timeline. Management must accept that some features may defer to Q2 if they conflict with security requirements.

## Sources

### Primary (HIGH confidence)
- Existing project specs: TECH-SPEC-AI-INTEGRATION.md v3.0, TECH-SPEC-AUTH-MULTITENANCY.md, WORKING-DECISIONS.md (architecture decisions), 00-PLATFORM/01-PLATFORM-VISION.md (RIU→Case model)
- Official vendor documentation: [Anthropic SDK npm](https://www.npmjs.com/package/@anthropic-ai/sdk), [NestJS Queues](https://docs.nestjs.com/techniques/queues), [BullMQ](https://docs.bullmq.io/guide/nestjs), [Merge.dev HRIS](https://docs.merge.dev/hris/), [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- PostgreSQL security: [CVE-2024-10976](https://www.postgresql.org/support/security/CVE-2024-10976/), [Bytebase RLS Footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- Competitor official sites: NAVEX Platform, EQS Integrity Line, Case IQ Features, HR Acuity Platform

### Secondary (MEDIUM confidence)
- Industry analysis: [Gartner Peer Insights - Whistleblowing Software](https://www.gartner.com/reviews/market/whistleblowing-software), [G2 Reviews (HR Acuity, Case IQ)](https://www.g2.com/), [NAVEX 2026 Compliance Trends](https://www.navex.com/en-us/blog/article/introducing-top-10-trends-risk-compliance-2026/)
- Migration research: [Kanerika: 500+ Enterprise Reviews on Migration Failures](https://medium.com/@kanerika/what-500-enterprise-software-reviews-reveal-about-data-migration-failures-5878a3b6624a) (73% struggle rate), [IT Convergence: Cloud Migration Risks 2025](https://www.itconvergence.com/blog/cloud-migration-risks-in-2025-turning-compliance-and-security-challenges-into-resilience)
- LLM security: [Sombra: LLM Security Risks 2026](https://sombrainc.com/blog/llm-security-risks-2026), [ClickIT: 4 Critical LLM Security Risks](https://www.clickittech.com/ai/llm-security/), [Medium: SaaS Security in AI-Driven World](https://medium.com/@jennyastor03/saas-security-in-an-ai-driven-world-pitfalls-solutions-for-2026-b13eb3501d51)
- HIPAA compliance: [HIPAA Journal: Software Development](https://www.hipaajournal.com/hipaa-compliance-for-software-development/), [Mobidev: HIPAA-Compliant Application Best Practices 2026](https://mobidev.biz/blog/hipaa-compliant-software-development-checklist)
- Technical debt: [McKinsey productivity loss data](https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/tech-debt-reclaiming-tech-equity), [VFunction: Managing Tech Debt 2025](https://vfunction.com/blog/how-to-manage-technical-debt/)

### Tertiary (LOW confidence)
- Market sizing: [Research and Markets: Compliance Management Software Market](https://www.researchandmarkets.com/report/compliance-management-software) ($31B to $70B projection—wide range, validate with analyst reports)
- UX trends: [UX Design Institute: Top UX Trends 2026](https://www.uxdesigninstitute.com/blog/the-top-ux-design-trends-in-2026/) ("quieter, focused interfaces" trend—general observation, not compliance-specific)
- Pricing: SelectHub NAVEX pricing ($2,600/mo)—single source, may be outdated; other competitors "contact sales" with no public pricing

---

*Research completed: 2026-02-02*
*Ready for roadmap: yes*
