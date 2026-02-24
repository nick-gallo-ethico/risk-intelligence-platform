# Project Research Summary: v2.0 Intelligence & Automation Layer

**Project:** Ethico Risk Intelligence Platform - v2.0 Intelligence Layer
**Domain:** Enterprise Compliance SaaS - Adding Intelligence/Automation to Existing Platform
**Researched:** 2026-02-24
**Confidence:** HIGH

## Executive Summary

This v2.0 milestone adds intelligence and automation capabilities to the **existing** 42-module Risk Intelligence Platform. The platform has mature foundation (NestJS, PostgreSQL with RLS, Claude AI streaming, event-driven architecture) and proven patterns. The research focused on integrating ~70 new capabilities without disrupting the stable base.

**Key Finding:** The platform's existing event-driven architecture (`EventEmitter2` with 100+ handlers), job queue system (`BullMQ` with 5 queues), and AI module infrastructure provide natural extension points. The recommended approach is **extension, not replacement** - leverage existing patterns rather than introduce competing abstractions. The critical risk is **pgvector + RLS performance collapse** which must be solved in Phase 1 before any RAG work.

**Recommended Approach:** Build intelligence features as event listeners and processors rather than inline in CRUD operations. Use the existing rules engine package (`json-rules-engine` already installed) rather than building custom DSL. Implement RAG through **separate embedding tables** to avoid RLS performance issues. Add fact tables for analytics through **incremental aggregation** rather than materialized views to prevent multi-tenant blocking.

The research identified 6 critical pitfalls that require architectural decisions before implementation, 6 high-severity risks requiring careful design, and clear integration points across all 42 existing modules. All recommended stack additions (pgvector, voyageai, llamaindex, serwist, web-push) have TypeScript SDKs and integrate cleanly with NestJS.

## Key Findings

### Recommended Stack

The existing stack (NestJS, PostgreSQL 15+, Prisma, Claude API, BullMQ, Elasticsearch) is production-ready. v2.0 adds focused capabilities rather than replacing foundations.

**New packages for v2.0:**

- **voyageai ^0.1.0**: Embedding generation (Anthropic's recommended partner) — 1,024-dimension vectors, 35% better retrieval than alternatives
- **llamaindex ^0.12.1**: RAG pipeline orchestration — retrieval-first architecture (vs LangChain's orchestration-first), 40% faster document retrieval
- **pgvector extension 0.8.x**: Semantic search via PostgreSQL — keeps vectors under same RLS as other data, HNSW indexing for fast similarity search
- **@serwist/next ^9.x**: PWA service worker (replaces @ducanh2912/next-pwa) — actively maintained Workbox fork with Next.js 14 support
- **web-push ^3.x**: Push notifications backend — complements WebSocket for offline users
- **open-exchange-rates + money**: Currency conversion for GT&E thresholds — free tier sufficient for daily refresh

**Already installed (use as-is):**

- **json-rules-engine 7.3.1**: Configurable business rules — already in package.json, no eval(), stores rules in JSON
- **@nestjs/schedule + bullmq**: Scheduled report delivery — prevents duplicate jobs in multi-instance deployment
- **puppeteer + exceljs**: PDF/Excel generation — already in stack for exports
- **@anthropic-ai/sdk**: Claude API for RAG responses — extend existing AI module

**Critical decision: Embedding model abstraction** — Must implement before first embedding to avoid lock-in (different models = different dimensions = migration pain).

### Expected Features

Research analyzed 8 intelligence/automation capabilities against NAVEX, EQS Integrity, Case IQ, and HR Acuity. The competitive landscape shows:

**Table stakes (must have for v2.0):**

- **Routing rules engine** — All competitors offer if/then assignment based on category/severity/location; manual override essential
- **SLA enforcement with visual indicators** — Color-coded countdown timers (green/yellow/red); email alerts on breach
- **Anonymous two-way messaging** — Chinese Wall relay model with access codes; EU Whistleblowing Directive requires follow-up capability
- **Auto-clear rules for disclosures** — Nothing-to-disclose responses auto-complete without review; threshold-based case creation
- **HRIS-triggered campaign enrollment** — New hire/role change/termination triggers auto-assignment to active campaigns
- **Repeat subject alerts** — When person appears in 3+ cases, alert investigator in real-time

**Differentiators (competitive edge):**

- **RAG-powered policy chatbot** — NAVEX launched AI Assistant late 2025; Ethena has Policy Bot; confidence-tier responses (High/Medium/Low)
- **Rule preview/testing** — Test rules against historical data before activation; competitors require "go live to see"
- **Pattern-based escalation** — Combine rules engine with pattern detection (e.g., "if subject has 5+ cases in 90 days, auto-escalate to CCO")
- **PWA offline form submission** — Very few competitors offer; critical for field workers with poor connectivity
- **Manager compliance dashboards** — HR Acuity leads here; team-level visibility with proxy actions
- **AI trend identification** — "Harassment reports up 40% in Manufacturing" without manual querying

**Defer to future (not v2.0):**

- **External party sanctions screening** — Specialized for financial services/healthcare; integrate with vendors (Moody's, LSEG) when customer need emerges
- **Cross-organization benchmarking** — HR Acuity differentiator; requires anonymized aggregate data pipeline
- **Voice message transcription** — No competitor offers; complex to implement correctly
- **Natural language rule builder** — High complexity; simple if/then UI sufficient for v2.0

**Build order recommendation:** Phase 1 (Routing + SLA), Phase 2 (RAG chatbot + HRIS triggers), Phase 3 (Pattern detection + PWA), Phase 4 (Manager dashboards + advanced analytics).

### Architecture Approach

The existing architecture is event-driven with clear module boundaries. The integration strategy is **extend through event listeners rather than modify existing services**.

**Major integration points:**

1. **Rules Engine Module** — New module that listens to `case.created`, `workflow.transitioned`, `disclosure.submitted` events; evaluates conditions; executes actions via existing services (CasesService, NotificationService, WorkflowEngineService). Database storage: `RuleDefinition` + `RuleExecutionLog` tables. Uses existing `json-rules-engine` package.

2. **RAG Search Enhancement** — Extend existing `SearchModule` with semantic search capabilities. **Critical: Separate `DocumentEmbedding` table** with explicit `organizationId` column to avoid RLS performance collapse. Integration with `PolicyModule` for ingestion, `AiModule` for embeddings, new `VectorStoreService` for similarity queries.

3. **Pattern Detection Module** — Background jobs (BullMQ) run nightly per tenant, query `PersonCaseAssociation` for patterns, create `PatternAlert` records. Reuses existing `ConflictMatchingService` fuzzy matching logic. Dashboard widgets consume alerts.

4. **Rolling Campaign Enhancement** — Extend `CampaignsModule` with `RollingCampaignService` that listens to `hris.sync.completed` event; filters employees by trigger type (new_hire, role_change); creates `CampaignAssignment` via existing services. Schema: add `isRolling`, `rollingTriggerType`, `rollingTriggerConfig` to `Campaign` model.

5. **Fact Tables for Analytics** — New `FactTablesModule` with dual update strategy: (1) Event listeners increment metrics in real-time (`case.created` → increment `casesCreated` counter), (2) Nightly reconciliation job recalculates from source data. Avoids materialized view blocking. Dashboard queries use fact tables instead of live aggregation.

6. **Anonymous Relay Enhancement** — Extend existing `MessageRelayService` with email notification batching (1-6 hour random delay to prevent timing attacks). Add `emailSentAt`, `emailDeliveredAt` tracking to `CaseMessage` model. New email templates in `notifications/templates/relay/`.

7. **Employee Chatbot Agent** — New agent in existing `ai/agents/` using established `BaseAgent` pattern. Skills: `PolicySearchSkill` (RAG-powered), `CaseStatusSkill` (access code lookup), `DisclosureGuideSkill` (form help). Connects to employee portal via existing `AiGateway` WebSocket.

8. **PWA Capabilities** — Frontend service worker with tenant-scoped cache names (`ethico-${orgId}-v${buildId}`). Backend: `PushSubscription` model + `WebPushService` for notifications. Network-first strategy for authenticated routes; cache only static assets.

**Dependency chain:** Phase 1 must solve pgvector+RLS before RAG. Rules engine must exist before automation features. HRIS sync fence must exist before rolling campaigns.

### Critical Pitfalls

**Top 5 must-solve-before-implementation:**

1. **pgvector + RLS performance collapse** — Vector similarity searches with `<->` operator combined with RLS policies force sequential scans instead of index scans. Queries go from 50ms to 5+ seconds. **Solution:** Create **separate embedding tables** (`case_embeddings`, `policy_embeddings`) with explicit `organizationId` column and composite indexes. Query pattern: filter by org BEFORE vector similarity. Benchmark with 100K+ embeddings in Phase 1.

2. **GDPR Article 17 vs Immutable RIU conflict** — RIUs are designed as immutable (no `updatedAt` field) for audit integrity. GDPR requires data deletion. **Solution:** Cryptographic shredding via per-record encryption keys. On deletion: destroy key (makes data unrecoverable), replace PII with `[REDACTED - GDPR Request #X]`, keep structural fields for analytics. Add `piiEncryptionKeyId`, `piiPurgedAt`, `piiPurgedReason` fields.

3. **Event handler race conditions** — Current `EventEmitter2` system (100+ handlers) processes events asynchronously without ordering guarantees. Multiple rules firing on same event can create duplicate cases, evaluate against stale data, or leak tenant data. **Solution:** (1) Idempotency keys on all automation triggers (`${entityId}-${ruleId}`), (2) Transactional outbox pattern for critical automations, (3) Explicit tenant validation in every handler, (4) Use existing BullMQ with job deduplication.

4. **Embedding model lock-in** — pgvector requires dimension declaration (`vector(1536)`) at table creation. Changing models requires dropping columns, re-embedding entire corpus. **Solution:** (1) Embedding abstraction layer with `EmbeddingService` interface, (2) Store model metadata with every embedding (`modelId`, `modelVersion`, `embeddingDimension`), (3) Lazy migration strategy (re-compute on access), (4) Separate tables per model generation.

5. **Materialized view refresh blocking** — Adding materialized views for analytics causes `REFRESH` operations to block reads (exclusive lock) or consume excessive resources. Multi-tenant refresh updates all orgs when only one changed. **Solution:** **Incremental aggregation tables** instead of materialized views. Dual strategy: (1) Event-driven incremental updates (`INSERT ON CONFLICT`), (2) Nightly reconciliation per tenant. Stagger refresh jobs during off-hours via BullMQ.

**High-severity risks (careful design required):**

- **Rules engine evaluation order** — Multiple rules on same event need explicit priority + first-match-wins for mutually exclusive actions
- **Cross-case pattern detection false positives** — Fuzzy matching without context generates alert fatigue; need confidence thresholds + feedback loop
- **Rolling campaign + HRIS sync race** — Campaign evaluation during partial sync creates wrong assignments; need completion fence
- **PWA service worker cache invalidation** — Stale data, hydration errors, tenant data leakage; need tenant-scoped cache names + forced update on logout
- **Anonymous relay metadata leakage** — Email timing, IP logs, browser fingerprints can compromise anonymity; need notification batching + metadata stripping

## Implications for Roadmap

Based on research, the v2.0 intelligence layer should be built in **6 waves** with clear dependencies:

### Wave 1: RAG Infrastructure (Foundation)

**Rationale:** All intelligence features depend on semantic search and embeddings. Must solve pgvector+RLS performance issue (CRIT-01) before any RAG work. Embedding model lock-in (CRIT-04) requires abstraction layer before first embedding generated.

**Delivers:**
- pgvector extension enabled on PostgreSQL with HNSW indexes
- Separate `DocumentEmbedding` table with explicit tenant isolation
- `EmbeddingService` abstraction (supports multiple providers: Voyage AI primary, fallback architecture)
- `VectorStoreService` for similarity search with performance benchmarks (100K+ embeddings)
- Document chunking strategy per entity type (policies: section-based, cases: activity-based)
- `HybridSearchService` combining Elasticsearch keyword + pgvector semantic

**Addresses features:**
- Foundation for RAG-powered policy chatbot (Phase 2)
- Semantic case search capability
- Similar case detection infrastructure

**Avoids pitfalls:**
- CRIT-01: pgvector+RLS collapse via separate tables
- CRIT-04: Embedding lock-in via abstraction layer
- MED-01: RAG chunking misalignment via structure-aware chunking
- MED-03: Embedding regeneration thundering herd via rate limiting
- MED-06: Context loader performance via token budgeting

**Stack:**
- pgvector 0.8.1 (PostgreSQL extension)
- voyageai ^0.1.0 (embeddings)
- llamaindex ^0.12.1 (RAG orchestration)
- pgvector npm ^0.2.1 (Node.js utilities)

**Research flags:**
- Performance tuning required for HNSW index parameters (m, ef_construction)
- Embedding dimension selection (1024 vs 1536 vs 3072)
- Chunking overlap strategy needs experimentation

---

### Wave 2: Data Integrity & Privacy

**Rationale:** GDPR compliance (CRIT-02) is non-negotiable for EU customers. Anonymous relay metadata leakage (HIGH-06) is legal liability risk. Must be solved before any EU deployment.

**Delivers:**
- Cryptographic shredding implementation for GDPR Article 17
- `piiEncryptionKeyId`, `piiPurgedAt`, `piiPurgedReason` fields on RIU
- `GdprDeletionRequest` workflow with 30-day grace period
- Anonymous relay notification batching (1-6 hour random delay)
- Metadata stripping on all anonymous endpoints (IP logs, timing obfuscation)
- Email tracking on `CaseMessage` (`emailSentAt`, `emailDeliveredAt`)

**Addresses features:**
- Anonymous two-way messaging enhancement (table stakes)
- GDPR compliance for EU Whistleblowing Directive
- Reporter trust through metadata protection

**Avoids pitfalls:**
- CRIT-02: GDPR vs immutable RIU via cryptographic shredding
- HIGH-06: Anonymous relay metadata leakage via timing obfuscation

**Stack:**
- Node.js crypto module (AES-256-GCM)
- Existing email infrastructure (Resend/nodemailer)
- Existing BullMQ for delayed notification jobs

**Research flags:**
- Key rotation strategy needs legal review
- Data residency requirements per jurisdiction
- Anonymization vs pseudonymization distinction

---

### Wave 3: Automation Engine

**Rationale:** Rules engine is foundation for automation features. Must solve event handler race conditions (CRIT-03) before any rule execution. Many downstream features (rolling campaigns, pattern escalation) depend on rules engine.

**Delivers:**
- `RulesModule` with `RuleDefinition` + `RuleExecutionLog` models
- Integration with `json-rules-engine` (already installed)
- Event listeners for `case.created`, `workflow.transitioned`, `disclosure.submitted`
- Idempotency keys on all automation triggers
- Transactional outbox pattern for critical automations
- Explicit rule execution phases (VALIDATION → ENRICHMENT → ACTION → NOTIFICATION)
- Basic routing rules UI (if/then conditions, action selection)
- SLA enforcement with visual countdown timers (green/yellow/red)
- Auto-clear rules for disclosures (threshold-based case creation)

**Addresses features:**
- Routing rules engine (table stakes)
- SLA enforcement (table stakes)
- Auto-clear rules (table stakes)
- Foundation for pattern-based escalation (Phase 4)

**Avoids pitfalls:**
- CRIT-03: Event handler race conditions via idempotency + outbox
- HIGH-02: Rule evaluation order via explicit phases + priority
- MED-02: AI action undo complexity via scope boundaries

**Stack:**
- json-rules-engine 7.3.1 (already installed)
- Existing EventEmitter2 infrastructure
- Existing BullMQ for job deduplication

**Research flags:**
- Rule conflict detection at save time (multiple rules same trigger)
- Dry-run/preview mode implementation complexity
- Rule versioning strategy

---

### Wave 4: Rolling Campaigns & HRIS Automation

**Rationale:** Builds on rules engine from Wave 3. HRIS-triggered campaigns are key differentiator. Must solve HRIS sync race condition (HIGH-04) before deployment.

**Delivers:**
- Campaign model extensions (`isRolling`, `rollingTriggerType`, `rollingTriggerConfig`)
- `RollingCampaignService` with trigger evaluation logic
- HRIS sync completion fence (prevents race conditions)
- Event listener for `hris.sync.completed`
- Trigger types: new_hire, role_change, location_change, manager_change, termination
- Auto-assignment to active campaigns based on employee changes
- Campaign dashboard showing rolling enrollment metrics

**Addresses features:**
- HRIS-triggered campaign enrollment (differentiator)
- Auto-assignment on hire/promotion (table stakes extension)
- Manager delegation for approvals (differentiator)

**Avoids pitfalls:**
- HIGH-04: Rolling campaign + HRIS sync race via completion fence
- MED-03 (partial): Thundering herd via staggered processing

**Stack:**
- Existing HrisSyncService
- Existing CampaignsModule infrastructure
- Existing BullMQ for background processing

**Research flags:**
- Trigger configuration UI design
- Retroactive enrollment rules (backfill for existing employees)

---

### Wave 5: Intelligence Layer (RAG + Chatbot + Patterns)

**Rationale:** Depends on RAG infrastructure (Wave 1) and rules engine (Wave 3). Combines semantic search with automation for intelligent features.

**Delivers:**
- `EmployeeChatbotAgent` in existing AI module
- Employee-specific skills: `PolicySearchSkill` (RAG), `CaseStatusSkill`, `DisclosureGuideSkill`
- Confidence-tier responses (High/Medium/Low) with source citations
- Integration with employee portal via existing `AiGateway` WebSocket
- `PatternDetectionModule` with repeat subject, case cluster, trend detectors
- `PatternAlert` model with review workflow
- Nightly pattern detection job (BullMQ) per tenant
- Real-time repeat subject alert on case creation
- Fuzzy name matching with confidence thresholds

**Addresses features:**
- RAG-powered policy chatbot (differentiator)
- Repeat subject alerts (table stakes)
- AI trend identification (differentiator)
- Pattern-based escalation (differentiator - combines with rules)

**Avoids pitfalls:**
- HIGH-03: Pattern detection false positives via confidence thresholds + feedback loop
- MED-01 (from Wave 1): Chunking misalignment via structure-aware strategy
- MED-06 (from Wave 1): Context loader performance via token budgeting

**Stack:**
- llamaindex ^0.12.1 (RAG pipeline)
- voyageai ^0.1.0 (embeddings from Wave 1)
- Existing ConflictMatchingService for fuzzy matching
- Existing AI module infrastructure

**Research flags:**
- Confidence threshold tuning per pattern type
- Employee chatbot escalation UX (when to hand off to human)

---

### Wave 6: Analytics & Fact Tables

**Rationale:** Independent of other waves; can proceed in parallel with Wave 4-5. Must solve materialized view blocking (HIGH-01) before dashboard optimization.

**Delivers:**
- `FactCaseDaily` + `FactCampaignDaily` aggregation tables
- Dual update strategy: event-driven incremental + nightly reconciliation
- Event listeners for `case.created`, `case.resolved`, `campaign.assignment.completed`
- Nightly reconciliation job (BullMQ) per tenant, staggered during off-hours
- Dashboard widgets consuming fact tables (faster queries)
- Manager compliance dashboard (team metrics, proxy actions)
- Pattern alert dashboard with accept/dismiss tracking

**Addresses features:**
- Manager compliance dashboards (differentiator)
- Fast analytics for large datasets (performance)
- Scheduled report delivery (uses existing puppeteer/exceljs)

**Avoids pitfalls:**
- HIGH-01: Materialized view blocking via incremental aggregation
- MED-04: Dashboard widget N+1 via DataLoader pattern (already in codebase)

**Stack:**
- Existing @nestjs/schedule + BullMQ
- Existing puppeteer + exceljs for reports
- Existing DataLoader pattern

**Research flags:**
- Fact table granularity (daily vs hourly)
- Reconciliation job scheduling (avoid peak hours)

---

### Wave 7: User Experience (PWA)

**Rationale:** Frontend-focused; can proceed after API stability in Waves 1-6. PWA cache invalidation (HIGH-05) requires careful design.

**Delivers:**
- Service worker with tenant-scoped cache names
- PWA manifest for installable app
- `PushSubscription` model + `WebPushService`
- Offline form submission queue (IndexedDB via existing dexie)
- Network-first strategy for authenticated routes
- Cache clearing on logout (security)
- Push notifications for SLA alerts, assignment, messages

**Addresses features:**
- PWA offline form submission (differentiator)
- Push notifications (differentiator)
- Home screen installable (table stakes for mobile)

**Avoids pitfalls:**
- HIGH-05: PWA cache invalidation via tenant-scoped names + forced update

**Stack:**
- @serwist/next ^9.x (replaces @ducanh2912/next-pwa)
- web-push ^3.x (backend)
- Existing dexie + dexie-encrypted for offline storage

**Research flags:**
- Service worker scope and cache boundaries
- Push notification opt-in UX

---

### Phase Ordering Rationale

**Wave 1 must be first** because RAG infrastructure is foundational and pgvector+RLS performance issue is blocking. Embedding model abstraction must exist before any embeddings generated (cannot change later without full re-embedding).

**Wave 2 (privacy) is independent** and can parallel with Wave 1, but must complete before any EU customer onboarding. GDPR deletion without downtime requires careful design.

**Wave 3 (automation) must precede Wave 4** because rolling campaigns depend on rules engine. Event handler race conditions must be solved before any automation rules fire.

**Wave 5 (intelligence) depends on Waves 1+3** — RAG chatbot needs embeddings (Wave 1), pattern-based escalation needs rules engine (Wave 3). Can parallel with Wave 4.

**Wave 6 (analytics) is independent** — fact tables don't depend on other waves. Can proceed in parallel with Waves 4-5. Nightly jobs require tenant-specific scheduling to avoid blocking.

**Wave 7 (PWA) is last** — frontend enhancement after API stability. Service worker cache invalidation is frontend-only risk.

**Dependency graph:**
```
Wave 1 (RAG) ─────────────────┐
                              │
Wave 2 (Privacy) ─────────────┤ (parallel)
                              │
Wave 3 (Automation) ──────────┤ (depends on completed infrastructure)
   │                          │
   ├──▶ Wave 4 (Rolling) ─────┤
   │                          │
   └──▶ Wave 5 (Intelligence)─┤ (depends on Wave 1 + 3)
                              │
Wave 6 (Analytics) ───────────┤ (parallel)
                              │
Wave 7 (PWA) ─────────────────┘ (frontend-focused, last)
```

### Research Flags

**Waves needing deeper research during planning:**

- **Wave 1 (RAG Infrastructure):** HNSW index tuning (m, ef_construction parameters), chunking overlap strategy, embedding dimension selection. Benchmark required with realistic data volumes (100K+ embeddings per tenant).

- **Wave 2 (Privacy):** Key rotation strategy needs legal review. GDPR data residency requirements vary by jurisdiction. Anonymization vs pseudonymization distinction affects compliance.

- **Wave 3 (Automation):** Rule conflict detection complexity (when do rules overlap?). Dry-run mode implementation (show what would happen without executing). Rule versioning strategy for audit trail.

- **Wave 5 (Intelligence):** Confidence threshold tuning per pattern type (repeat subject vs cluster vs trend). Employee chatbot escalation UX (when to hand off to human). False positive feedback loop design.

**Waves with standard patterns (skip deep research):**

- **Wave 4 (Rolling Campaigns):** Well-documented pattern (event listener + database trigger). Similar to existing campaign infrastructure. Trigger configuration UI is CRUD.

- **Wave 6 (Analytics):** Fact table pattern is standard data warehousing. Existing BullMQ infrastructure handles scheduling. Dashboard widgets extend existing patterns.

- **Wave 7 (PWA):** Service worker patterns are well-documented. Serwist (Workbox fork) has clear Next.js integration guide. Push notifications via web-push package is standard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | All recommended packages have official TypeScript SDKs, verified npm install, and NestJS integration examples. pgvector verified on Azure PostgreSQL. voyageai is Anthropic's official partner. llamaindex has active TypeScript port. |
| Features | **HIGH** | Analyzed 4 major competitors (NAVEX, EQS, Case IQ, HR Acuity) with official documentation. Table stakes vs differentiators validated across multiple sources. Build order recommendation based on competitor implementation patterns. |
| Architecture | **HIGH** | Based on direct codebase analysis (42 modules, 127 Prisma models). Integration points verified in existing event system (100+ handlers). Extension patterns match established codebase style. |
| Pitfalls | **HIGH** | 6 critical pitfalls verified via official PostgreSQL docs, GDPR legal sources, and production architecture case studies. pgvector+RLS issue documented in multiple independent sources. Event race conditions based on existing EventEmitter2 analysis. |

**Overall confidence:** **HIGH**

### Gaps to Address

**Performance benchmarks needed (Wave 1):**
- HNSW index parameter tuning (m, ef_construction) requires load testing with realistic data volumes
- Vector similarity query performance with 100K+ embeddings per tenant
- Chunking strategy effectiveness measured by retrieval accuracy
- **Mitigation:** Dedicated performance testing phase in Wave 1 before RAG deployment

**Legal review required (Wave 2):**
- GDPR cryptographic shredding implementation needs legal sign-off
- Data residency requirements vary by jurisdiction (EU vs US vs other)
- Anonymization vs pseudonymization distinction affects compliance obligations
- **Mitigation:** Engage legal counsel during Wave 2 planning; block EU deployment until approved

**Threshold tuning needed (Waves 3, 5):**
- Rule priority conflict detection algorithm (when do rules overlap?)
- Pattern detection confidence thresholds per match type
- False positive acceptance rates (target: 80%+ pattern alerts actionable)
- **Mitigation:** Implement feedback loop dashboard; iterate thresholds based on production data

**Multi-tenant scaling unknowns:**
- Fact table reconciliation job scheduling across 100+ tenants
- Pattern detection nightly job resource consumption per tenant
- Embedding regeneration cost when model changes
- **Mitigation:** Stagger jobs during off-hours; monitor resource usage per tenant; implement rate limiting

**Integration testing complexity:**
- Event handler race conditions require concurrent test scenarios
- Idempotency testing across multiple handlers
- HRIS sync + rolling campaign race condition scenarios
- **Mitigation:** Dedicated integration test suite in Wave 3; use existing BullMQ test infrastructure

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [Anthropic SDK](https://www.npmjs.com/package/@anthropic-ai/sdk) — Claude API integration, streaming, tool use
- [Anthropic Embeddings Docs](https://platform.claude.com/docs/en/build-with-claude/embeddings) — Voyage AI partnership
- [NestJS Queues](https://docs.nestjs.com/techniques/queues) — BullMQ integration patterns
- [BullMQ NestJS Guide](https://docs.bullmq.io/guide/nestjs) — Official NestJS module usage
- [pgvector GitHub](https://github.com/pgvector/pgvector) — PostgreSQL vector extension
- [pgvector-node](https://github.com/pgvector/pgvector-node) — Node.js utilities
- [Azure PostgreSQL pgvector](https://learn.microsoft.com/en-us/azure/postgresql/extensions/how-to-use-pgvector) — Azure-specific implementation
- [Serwist Docs](https://serwist.pages.dev/docs/next/getting-started) — Next.js PWA integration
- [LlamaIndex TypeScript](https://developers.llamaindex.ai/typescript/framework/) — RAG framework
- [Voyage AI npm](https://www.npmjs.com/package/voyageai) — Embeddings API

**Competitor Analysis:**
- [NAVEX AI Assistant](https://www.navex.com/en-us/platform/employee-compliance/ai-assistant/) — AI features launch
- [Case IQ Platform](https://www.caseiq.com/platform) — Workflow automation
- [HR Acuity Benchmarking](https://www.hracuity.com/blog/best-whistleblower-hotline-2026/) — Pattern detection
- [EQS vs NAVEX Comparison](https://www.eqs.com/navex-vs-eqs-compliance-software-comparison/) — Feature matrix
- [Gartner Peer Insights](https://www.gartner.com/reviews/market/corporate-compliance-and-oversight-solutions/compare/eqs-group-vs-navex) — User reviews

**PostgreSQL & Architecture:**
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) — Row-level security
- [PostgreSQL RLS Footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/) — Common pitfalls
- [RLS in Vector DBs](https://medium.com/@michael.hannecke/implementing-row-level-security-in-vector-dbs-for-rag-applications-fdbccb63d464) — pgvector+RLS performance
- [NestJS EventEmitter](https://docs.nestjs.com/techniques/events) — Event-driven patterns

### Secondary (MEDIUM confidence)

**Industry Best Practices:**
- [RAG Guide 2025](https://medium.com/@illyism/chatgpt-rag-guide-2025-build-reliable-ai-with-retrieval-0f881a4714af) — RAG architecture patterns
- [LlamaIndex vs LangChain](https://latenode.com/blog/platform-comparisons-alternatives/automation-platform-comparisons/langchain-vs-llamaindex-2025-complete-rag-framework-comparison) — Framework comparison
- [Enterprise RAG Stack AI](https://www.stack-ai.com/blog/enterprise-rag-what-it-is-and-how-to-use-this-technology) — Production RAG patterns
- [Next.js PWA 2026](https://blog.logrocket.com/nextjs-16-pwa-offline-support/) — PWA implementation
- [Building Production Notifications NestJS](https://medium.com/@marufpulok98/building-a-production-ready-real-time-notification-system-in-nestjs-websockets-redis-offline-6cc2f1bd0b05) — Real-time patterns

**Compliance & Privacy:**
- [Right to be Forgotten vs Audit Trail](https://axiom.co/blog/the-right-to-be-forgotten-vs-audit-trail-mandates) — GDPR vs SOC2
- [Immutable Ledgers and GDPR](https://www.serverion.com/uncategorized/how-immutable-ledgers-impact-gdpr-compliance/) — Compliance conflicts
- [GDPR Data Deletion Best Practices](https://www.reform.app/blog/best-practices-gdpr-compliant-data-deletion) — Implementation guide
- [Anonymous Whistleblower Best Practices](https://www.v-comply.com/blog/anonymous-whistleblower/) — Metadata protection

**Automation & Rules:**
- [Business Rules Engines](https://www.supportbench.com/what-are-business-rules-engines-in-automation/) — Rule engine patterns
- [SLA Software Guide](https://monday.com/blog/service/sla-software/) — SLA implementation
- [Salesforce Case Assignment](https://www.saasguru.co/salesforce-case-assignment-rules/) — Routing patterns

### Tertiary (LOW confidence - validate during implementation)

- [AML Case Management](https://www.sanctionscanner.com/blog/what-is-aml-case-management-for-compliance-1294) — Pattern detection context
- [ExcelJS Streaming 2026](https://copyprogramming.com/howto/stream-huge-excel-file-using-exceljs-in-node) — Large file export
- [PostgreSQL Anonymization](https://severalnines.com/blog/postgresql-anonymization-on-demand/) — Data anonymization techniques

**Codebase Analysis:**
- Direct review of 42 NestJS modules in `apps/backend/src/modules/`
- Prisma schema analysis: 127+ models across `apps/backend/prisma/schema.prisma`
- Event system mapping: 100+ `@OnEvent` handlers and `emit()` calls
- AI module structure: 55+ files in `modules/ai/`

---

**Research completed:** 2026-02-24
**Ready for roadmap:** Yes

**Next steps:**
1. Create Wave 1-7 roadmap phases with granular task breakdowns
2. Define success metrics per wave (performance benchmarks, test coverage)
3. Identify external dependencies (legal review Wave 2, load testing Wave 1)
4. Estimate effort per wave (complexity × integration risk)
5. Plan parallel execution where dependencies allow (Waves 2, 6 can parallel)
