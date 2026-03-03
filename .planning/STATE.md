# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** Users can manage their entire compliance workflow in one AI-assisted platform
**Current focus:** Phase 43 - RAG Infrastructure (v2.0)

## Current Position

Phase: 43 of 51 (RAG Infrastructure)
Plan: 7 of 8 complete
Status: In progress
Last activity: 2026-03-03 - Completed 43-07-PLAN.md (Hybrid Search Service)

Progress: [======================........] 82% (42/51 phases complete across all milestones)

## Shipped Milestones

| Milestone                            | Phases | Plans | Requirements | Shipped    |
| ------------------------------------ | ------ | ----- | ------------ | ---------- |
| v1.0 Feature Build                   | 1-25.1 | 242+  | 149          | 2026-02-13 |
| v1.1 Code Review Remediation         | 26-31  | 43    | 36           | 2026-02-15 |
| v1.2 Production Hardening & Features | 32-39  | 57    | 77           | 2026-02-20 |

## v2.0 Milestone Overview

**Goal:** Close all 83 PRD gaps across 6 waves. Transform from CRUD to intelligent platform.
**Phases:** 40-51 (12 phases, 106 planned plans)
**Status:** Phases 40-42 complete, starting Phase 43

**Wave Summary:**

| Wave                      | Phases | Focus                                | Status      |
| ------------------------- | ------ | ------------------------------------ | ----------- |
| 1 - Rules & Automation    | 40-41  | Auto-routing, SLA, escalation        | Complete    |
| 2 - Anonymous Relay       | 42     | Chinese Wall messaging               | Complete    |
| 3 - AI Intelligence       | 43-45  | RAG, chatbot, pattern detection      | In progress |
| 4 - Disclosure Automation | 46-47  | Rolling campaigns, external parties  | Not started |
| 5 - Portal Completeness   | 48     | Manager, employee, operator features | Not started |
| 6 - Infrastructure        | 49-51  | PWA, analytics, branding             | Not started |

## Accumulated Context

### Key Decisions

- v2.0 full PRD parity: all 83 requirements in scope
- pgvector + RLS: MUST use separate DocumentEmbedding table (CRIT-01)
- GDPR vs immutable RIUs: cryptographic shredding pattern (CRIT-02)
- Event handlers: idempotency keys + transactional outbox (CRIT-03)
- Phase numbering: continues from 40 (v1.2 ended at Phase 39)
- json-rules-engine conditions format: {all: [...], any: [...]} structure for rule conditions (40-01)
- Rules with execution logs soft-deleted: preserve audit trail by deactivating instead of deleting (40-01)
- Fresh engine per evaluation: RulesEngineService creates new Engine instance per evaluate() for tenant isolation (40-02)
- Forward-compatible actions: AssignUserAction/AssignTeamAction emit events without direct schema update since Case lacks assignedToId/assignedTeamId (40-02)
- Team membership via Employee: RoundRobinTeamAction matches User email to Employee.teamId for team membership since User lacks teamId (40-04)
- Round-robin tracking via RuleExecutionLog: No separate state table; leverage existing audit trail for last-assigned tracking (40-04)
- Investigation status derivation flags for review: CaseStatus lacks PENDING_REVIEW, so InvestigationStatusListener emits event + audit log instead of changing status (40-05)
- Only CLOSED investigation status triggers derivation: InvestigationStatus enum has CLOSED as only terminal status (40-05)
- Proxy assignment check via Investigation: CaseRoutingListener checks Investigation.primaryInvestigatorId since Case lacks assignedToId (40-03)
- Facts structure dual format: Both flat keys (severity) and nested objects (case.severity) for flexible rule authoring (40-03)
- Test results persisted in rule: RuleTesterService stores results in rule.testResults JSON field for later retrieval without re-running (40-06)
- Sample collection limits: First 10 matched + first 10 unmatched cases, capped at 20 total samples (40-06)
- Condition builder single level: UI supports ALL/ANY toggle at top level, not nested conditions (40-07)
- Action params inline: Action parameters rendered inline in ActionSelector component (40-07)
- SLA config stored in Organization.caseSlaConfig JSON field: simpler than separate table, can migrate later if reporting needs grow (41-01)
- Case SLA deduplication via CaseSlaState: track lastStatus and lastNotifiedAt in Case.slaState to prevent notification spam (41-01)
- Category overrides take precedence over severity overrides in SLA calculation (41-01)
- SLA warning events only on status transitions: CaseSlaTrackerService only emits sla.warning when on_track -> warning (41-02)
- Case filtering uses isMerged flag: CaseStatus enum lacks MERGED value, use status != CLOSED AND isMerged = false (41-02)
- Supervisor lookup via User-Employee email matching: No direct User->Employee relation, so match User.email to Employee.email then follow Employee.manager (41-03)
- Critical events require CCO: silently skip if no COMPLIANCE_OFFICER role user found in org (41-03)
- Escalation rules stored as RuleDefinitions: reuse existing rule infrastructure with SLA trigger events (41-04)
- EscalateToRoleAction emits event: Case lacks escalatedTo field, so emit case.escalated for downstream handling (41-04)
- SLA settings placed in Account Management section of settings navigation (41-05)
- Escalation rules managed via Rules Engine link rather than separate UI (41-05)
- Reporter templates use existing MJML partial pattern (card sections, mj-class styles) (42-02)
- Message notification intentionally excludes all content for privacy (42-02)
- Template ID constants exported via templates/index.ts for type-safe usage (42-02)
- crypto.randomInt for secure random delays: Use Node.js crypto module, not Math.random, for timing attack prevention (42-01)
- Relay settings stored in Organization.settings JSON: consistent with SLA config pattern (42-01)
- Default reporter visibility STANDARD: messages visible but no investigator names (42-01)
- RIU event includes tenantSlug fetched at emit time: avoid duplicate DB call in listener (42-03)
- Email failure isolation: notification failures logged but not rethrown to avoid failing RIU creation (42-03)
- Only outbound direction messages trigger reporter notification (42-04)
- Notification failures logged but don't crash message send (42-04)
- readAt dual format in visibility filtering: STANDARD returns "read" string, DETAILED+ returns Date (42-05)
- Investigator name only exposed for OUTBOUND messages at TRANSPARENT level (42-05)
- Per-warning PII acknowledgment: Each PII warning requires individual checkbox before send allowed (42-06)
- Compact sidebar messaging format: InvestigatorComposer uses card format for right sidebar placement (42-06)
- canMessage logic: case.status !== CLOSED AND (has reporterEmail OR reporterAnonymous) (42-06)
- RelaySettingsSection manages own data via react-query: self-contained component pattern for settings sections (42-07)
- NO RLS on document_embeddings table: pgvector similarity queries don't work reliably with RLS, explicit WHERE required (43-01)
- vector(1024) dimensions for Voyage AI voyage-3 model (43-01)
- HNSW index parameters: m=16, ef_construction=64 for production quality (43-01)
- TEXT type for IDs in document_embeddings to match existing schema patterns (43-01)
- Default chunk size 1500 chars (~400 tokens) for optimal embedding quality (43-03)
- 10% overlap (150 chars) for context continuity across chunks (43-03)
- Multiple header detection patterns for section-based chunking (43-03)
- pgvector toSql() for vector serialization in Prisma raw queries (43-04)
- Cosine distance to similarity: similarity = 1 - (distance / 2) maps [0,2] to [0,1] (43-04)
- Atomic upsert via delete+insert: ensures no orphaned chunks during re-embedding (43-04)
- Direct StorageProvider injection for knowledge base: avoid Attachment records by using STORAGE_PROVIDER token directly (43-05)
- BullMQ embedding queue registered in both EmbeddingsModule and JobsModule: allows service to add jobs and processor to consume them (43-05)
- 50MB file limit for knowledge base uploads (43-05)
- PolicyEmbeddingListener uses async: true to not block publish flow (43-06)
- Embedding failures logged but not propagated: publish always succeeds (43-06)
- Policy metadata (title, category, version) enriched into chunk metadata (43-06)
- reEmbedAllPolicies() skips RETIRED policies to avoid unnecessary work (43-06)
- RRF K=60: Standard value for reciprocal rank fusion smoothing (43-07)
- Parallel execution: Keyword and semantic searches run concurrently via Promise.all (43-07)
- Method indicator: Hybrid search results marked as keyword, semantic, or both (43-07)
- Configurable weights: keywordWeight and semanticWeight for tuning hybrid search (43-07)

### Blockers

None currently.

### Research Flags

Phases needing deeper research during planning:

- Phase 43 (RAG): HNSW index tuning, chunking overlap strategy
- Phase 44 (Chatbot): Confidence threshold tuning, escalation UX
- Phase 50 (Analytics): Fact table granularity, reconciliation scheduling

### Schema Gaps Identified

- Case model needs `assignedToId` and `assignedTeamId` fields for full action executor functionality (discovered in 40-02)

## Session Continuity

Last session: 2026-03-03
Stopped at: Completed 43-07-PLAN.md (Hybrid Search Service)
Resume file: None
Next action: Execute 43-08-PLAN.md (RAG Service Integration)
