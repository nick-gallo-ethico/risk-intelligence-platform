# Domain Pitfalls: Adding Intelligence/Automation to Existing Compliance Platform

**Domain:** Compliance platform intelligence layer (v2.0)
**Researched:** 2026-02-24
**Confidence:** HIGH (based on existing codebase analysis + industry research)
**Context:** Adding ~70 intelligence/automation capabilities to existing 42-module NestJS platform

---

## Executive Summary

This document supplements the original v1.0 pitfalls with specific risks for adding intelligence/automation features to the **existing** Ethico platform. The existing codebase has 42 NestJS modules, 127 Prisma models, PostgreSQL RLS multi-tenancy, existing AI chat with Claude streaming, and event-driven architecture. Adding significant new functionality creates specific integration risks not covered in the initial platform pitfalls.

**Key Risk Categories:**
1. pgvector + RLS interaction (vector search performance collapse)
2. GDPR + immutable RIU conflict (legal compliance)
3. Event handler race conditions (data corruption)
4. Materialized views in multi-tenant context (analytics blocking)
5. Anonymous relay metadata leakage (whistleblower protection)

---

## Critical Pitfalls

Mistakes that cause rewrites, data breaches, or major architectural issues.

### CRIT-01: pgvector + RLS Performance Collapse

**What goes wrong:** Adding pgvector embeddings to existing RLS-protected tables causes catastrophic query performance degradation. Vector similarity searches with `<->` operator combined with RLS policies that use non-LEAKPROOF functions force PostgreSQL to apply row filtering BEFORE index scans, eliminating the benefit of HNSW/IVFFlat indexes.

**Why it happens:** The existing schema uses `organizationId` filtering via RLS policies. When adding vector columns to tables like `Case`, `RiskIntelligenceUnit`, or `Policy`, the query planner cannot use vector indexes effectively because RLS filtering must happen first.

**Consequences:**
- RAG queries that should take 50ms take 5+ seconds
- Vector search becomes unusable at scale (10K+ embeddings per tenant)
- Fallback to sequential scans across entire vector store

**Warning signs:**
- `EXPLAIN ANALYZE` shows `Seq Scan` instead of `Index Scan` on vector columns
- Query times increase linearly with table size instead of logarithmically
- Memory spikes during vector queries

**Prevention:**
1. Create **separate embedding tables** with explicit `organizationId` column and composite indexes:
   ```sql
   CREATE TABLE case_embeddings (
     id UUID PRIMARY KEY,
     organization_id UUID NOT NULL,
     case_id UUID NOT NULL REFERENCES cases(id),
     embedding vector(1536),
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE INDEX ON case_embeddings USING hnsw (embedding vector_cosine_ops);
   CREATE INDEX ON case_embeddings (organization_id);
   ```
2. Query pattern: Filter by `organization_id` in WHERE clause BEFORE vector similarity
3. Use `SET LOCAL` tenant context in application layer, not RLS for embedding tables
4. Benchmark with realistic data volumes (100K+ embeddings) before production

**Detection:** Add query performance monitoring in Wave 1. Alert if any vector query exceeds 500ms.

**Wave assignment:** Wave 1 (RAG Infrastructure) - must be solved before any embedding work.

**Severity:** CRITICAL

**Sources:**
- [PostgreSQL RLS Footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- [Implementing RLS in Vector DBs for RAG](https://medium.com/@michael.hannecke/implementing-row-level-security-in-vector-dbs-for-rag-applications-fdbccb63d464)

---

### CRIT-02: GDPR Article 17 vs Immutable RIU Conflict

**What goes wrong:** The existing `RiskIntelligenceUnit` model is explicitly designed as **immutable** (no `updatedAt` field, corrections go on Case). GDPR Article 17 "Right to Erasure" requires deletion of personal data. These requirements fundamentally conflict.

**Why it happens:** Compliance systems require immutable audit trails (SOC 2, HIPAA). Privacy regulations require data deletion. The current architecture prioritizes audit immutability without a deletion strategy.

**Existing code pattern:**
```prisma
/// RiskIntelligenceUnit represents an immutable intake record
/// RIUs are IMMUTABLE after creation - corrections go on the Case, not the RIU.
/// NO updatedAt field - emphasizes immutability of intake content.
model RiskIntelligenceUnit {
  id                   String   @id @default(uuid())
  // ...reporterEmail, reporterPhone, details - all PII fields
  // NO updatedAt - emphasizes immutability
}
```

**Consequences:**
- GDPR violation fines (up to 4% of global revenue)
- Legal liability for failure to process deletion requests
- Reputational damage

**Prevention - The CRAB Model (Cryptographic Shredding):**
1. **Never truly delete** the RIU record (maintains audit integrity)
2. Implement **cryptographic shredding**:
   - Encrypt PII fields (`reporterName`, `reporterEmail`, `reporterPhone`, `details`) with per-record keys
   - Store keys in separate key vault with tenant+RIU mapping
   - On deletion request: destroy the encryption key, making data unrecoverable
3. Add schema fields:
   ```prisma
   model RiskIntelligenceUnit {
     // Existing fields...
     piiEncryptionKeyId    String?   @map("pii_encryption_key_id")
     piiPurgedAt           DateTime? @map("pii_purged_at")
     piiPurgedReason       String?   @map("pii_purged_reason")
     // Structural fields (category, date, status) remain for analytics
   }
   ```
4. Purge replaces PII with `[REDACTED - GDPR Request #{id}]` maintaining record structure
5. Audit log captures: who requested, when processed, what was purged (not content)

**Detection:** Add GDPR compliance dashboard tracking:
- Pending deletion requests
- Average processing time
- Purged record count by month

**Wave assignment:** Wave 2 (Data Layer) - must be solved before any EU customer onboarding.

**Severity:** CRITICAL

**Sources:**
- [Right to be Forgotten vs Audit Trail](https://axiom.co/blog/the-right-to-be-forgotten-vs-audit-trail-mandates)
- [How Immutable Ledgers Impact GDPR](https://www.serverion.com/uncategorized/how-immutable-ledgers-impact-gdpr-compliance/)

---

### CRIT-03: Event Handler Race Conditions in Multi-Tenant Automation

**What goes wrong:** The existing `EventEmitter2` system (100+ event handlers across modules) processes events asynchronously without guaranteed ordering. When adding automation rules that react to events (e.g., "create case when disclosure threshold exceeded"), race conditions cause:
- Duplicate cases created from same disclosure
- Rules evaluated against stale data
- Tenant A's rule accidentally triggered by Tenant B's event

**Why it happens:** Current event emission pattern in codebase:
```typescript
// From relay.service.ts and dozens of other services
this.eventEmitter.emit('case.message.sent', {
  organizationId,
  caseId: dto.caseId,
  messageId: message.id,
  actorUserId: userId,
  direction: 'outbound',
});
```
Multiple handlers subscribe. No transaction boundary. No idempotency keys. No tenant isolation guarantee in handler execution.

**Existing handlers (100+ across modules):**
- `apps/backend/src/modules/notifications/listeners/case.listener.ts`
- `apps/backend/src/modules/audit/handlers/case-audit.handler.ts`
- `apps/backend/src/modules/search/handlers/case-indexing.handler.ts`
- `apps/backend/src/modules/workflow/engine/workflow-engine.service.ts`
- ...and 96 more files with `@OnEvent` or `emit(`

**Consequences:**
- Data corruption (duplicate records)
- Tenant data leakage (rule from Org A sees Org B data)
- Inconsistent state (case created but rule not logged)

**Warning signs:**
- Duplicate entries in `ThresholdTriggerLog`
- Cases created without corresponding disclosure
- Audit logs showing out-of-order operations

**Prevention:**
1. **Idempotency keys** on all automation triggers:
   ```typescript
   await this.prisma.thresholdTriggerLog.upsert({
     where: { idempotencyKey: `${disclosureId}-${ruleId}` },
     create: { /* ... */ },
     update: {} // No-op if exists
   });
   ```
2. **Transactional outbox pattern** for critical automations:
   - Write event to `automation_outbox` table in same transaction as source change
   - Background processor reads outbox and executes rules
   - Guarantees at-least-once delivery with ordering
3. **Explicit tenant context** in every event payload AND handler validation:
   ```typescript
   @OnEvent('disclosure.submitted')
   async handleDisclosure(event: DisclosureEvent) {
     // CRITICAL: Validate tenant context matches rule's tenant
     if (rule.organizationId !== event.organizationId) {
       this.logger.error(`Tenant mismatch: rule ${rule.id} vs event ${event.organizationId}`);
       return;
     }
   }
   ```
4. Use existing `@nestjs/bullmq` infrastructure (already in codebase at `jobs.module.ts`) with:
   - Job deduplication by `jobId: ${entityId}-${ruleType}`
   - Tenant-specific queues or job metadata

**Detection:** Add event tracing:
- Log correlation IDs through event chains
- Monitor for duplicate `jobId` attempts in BullMQ
- Alert on tenant mismatch in handlers

**Wave assignment:** Wave 3 (Automation Engine) - foundational before any rule execution.

**Severity:** CRITICAL

**Sources:**
- [Race Conditions in Event-Driven Architecture](https://event-driven.io/en/dealing_with_race_conditions_in_eda_using_read_models/)
- [NestJS Event-Driven Architecture](https://dev.to/geampiere/event-driven-architecture-in-nestjs-ccj)

---

### CRIT-04: Embedding Model Lock-in Without Migration Path

**What goes wrong:** Choosing an embedding model (e.g., `text-embedding-3-small` at 1536 dimensions) and storing vectors in pgvector creates a hard dependency. Changing models later requires:
- Dropping all vector columns/indexes
- Re-embedding entire corpus
- Coordinated downtime

**Why it happens:** pgvector requires dimension declaration at table creation:
```sql
embedding vector(1536)  -- Locked to this dimension forever
```
Different embedding models have different dimensions (OpenAI: 1536/3072, Cohere: 1024, local models: varies).

**Consequences:**
- Cannot adopt better models without migration
- Vendor lock-in to embedding provider
- Performance degradation from suboptimal model choice

**Prevention:**
1. **Embedding abstraction layer**:
   ```typescript
   interface EmbeddingService {
     embed(text: string): Promise<number[]>;
     getDimension(): number;
     getModelId(): string;
   }
   ```
2. **Store model metadata** with every embedding:
   ```prisma
   model CaseEmbedding {
     modelId           String   @map("model_id")
     modelVersion      String   @map("model_version")
     embeddingDimension Int     @map("embedding_dimension")
   }
   ```
3. **Lazy migration strategy**: When model changes, embeddings are re-computed on next access (stale embeddings flagged for background re-processing)
4. **Separate tables per model generation** with graceful fallback to old embeddings during migration

**Wave assignment:** Wave 1 (RAG Infrastructure) - design decision before first embedding.

**Severity:** CRITICAL

---

## High Severity Pitfalls

Mistakes that cause significant rework or service degradation.

### HIGH-01: Materialized View Refresh Blocking Multi-Tenant Analytics

**What goes wrong:** Adding materialized views for analytics dashboards (Case counts by category, SLA metrics, etc.) causes refresh operations to block reads or consume excessive resources during business hours.

**Why it happens:** PostgreSQL's `REFRESH MATERIALIZED VIEW`:
- Standard refresh: **Exclusive lock** - blocks all reads until complete
- Concurrent refresh: **Requires unique index**, slower, still resource-intensive
- Multi-tenant data: Refreshing for ALL tenants when only one changed

**Existing analytics infrastructure (from `analytics.module.ts`):**
- `MyWorkModule` - Unified task queue
- `DashboardModule` - Widget configuration
- `ReportModule` - Saved reports
- No materialized views currently, but adding fact tables will introduce this risk

**Consequences:**
- Dashboard timeouts during refresh
- Database CPU spikes affecting production queries
- User-visible latency during business hours

**Warning signs:**
- Dashboard queries timing out at specific times
- Lock wait events in pg_stat_activity
- Database CPU pegged during refresh jobs

**Prevention:**
1. **Tenant-scoped refresh triggers**: Only refresh views when tenant's data changes
2. **Incremental aggregation tables** instead of materialized views:
   ```sql
   -- Instead of REFRESH MATERIALIZED VIEW, use INSERT ON CONFLICT
   INSERT INTO case_daily_stats (organization_id, date, category_id, count)
   SELECT organization_id, DATE(created_at), primary_category_id, COUNT(*)
   FROM cases
   WHERE created_at >= $1 AND organization_id = $2
   GROUP BY 1, 2, 3
   ON CONFLICT (organization_id, date, category_id)
   DO UPDATE SET count = EXCLUDED.count;
   ```
3. **Stagger refresh by tenant** during off-hours with existing BullMQ infrastructure
4. **Real-time aggregation for small datasets** (< 10K records), materialized for large

**Detection:** Monitor refresh duration and lock wait times per view.

**Wave assignment:** Wave 4 (Analytics Intelligence) - before dashboard optimization.

**Severity:** HIGH

**Sources:**
- [PostgreSQL Materialized Views](https://stormatics.tech/blogs/postgresql-materialized-views-when-caching-your-query-results-makes-sense)
- [Refreshing Materialized Views](https://dohost.us/index.php/2025/10/26/refreshing-a-materialized-view-refresh-materialized-view-concurrently-vs-non-concurrently/)

---

### HIGH-02: Rules Engine Evaluation Order Unpredictability

**What goes wrong:** Adding a rules/automation engine to existing CRUD without explicit priority handling causes:
- Multiple rules firing on same event with conflicting actions
- Rule A depends on Rule B's output but executes first
- Same disclosure triggers 5 different case creation rules

**Why it happens:** Current `ThresholdRule` schema has `priority: Int` but no enforcement mechanism:
```prisma
model ThresholdRule {
  id              String                @id @default(uuid())
  organizationId  String                @map("organization_id")
  priority        Int                   @default(0)  // No enforcement!
  // ...
}
```
Rules evaluated in arbitrary order from database query.

**Consequences:**
- Unpredictable automation behavior
- Support tickets from confused users
- Data inconsistency from conflicting rule actions

**Prevention:**
1. **Explicit rule execution phases**:
   ```typescript
   enum RulePhase {
     VALIDATION = 1,   // Check conditions, block if invalid
     ENRICHMENT = 2,   // Add data, don't create entities
     ACTION = 3,       // Create cases, send notifications
     NOTIFICATION = 4  // Final alerts after all changes
   }
   ```
2. **First-match-wins for mutually exclusive actions**:
   ```typescript
   // Only first matching CREATE_CASE rule executes
   const createCaseRules = rules.filter(r => r.action === 'CREATE_CASE');
   const firstMatch = createCaseRules.find(r => evaluateConditions(r, disclosure));
   if (firstMatch) {
     await executeRule(firstMatch);
     // Skip remaining CREATE_CASE rules
   }
   ```
3. **Rule conflict detection** at save time - warn if rules overlap
4. **Dry-run mode** showing which rules WOULD fire before saving

**Detection:** Log all rule evaluations with sequence numbers. Alert on multiple CREATE_CASE rules firing for same disclosure.

**Wave assignment:** Wave 3 (Automation Engine).

**Severity:** HIGH

---

### HIGH-03: Cross-Case Pattern Detection False Positives

**What goes wrong:** Pattern detection (identifying repeat offenders, related cases) generates excessive false positives when:
- Fuzzy name matching too aggressive ("John Smith" matches 500 people)
- Organizational structure not considered (same department != same pattern)
- Time windows too wide (incident from 5 years ago surfaces)

**Why it happens:** Current `ConflictMatchingService` uses string similarity without context:
```typescript
// From conflict-detection.service.spec.ts
const mockSelfDealingConflict: DetectedConflict = {
  conflictType: ConflictType.SELF_DEALING,
  severity: ConflictSeverity.HIGH,
  summary: 'Prior disclosure to "Acme Corp" found (85% match)',
  matchConfidence: 85,
  // ...
};
```
No tuning for compliance-specific patterns.

**Consequences:**
- Alert fatigue - investigators ignore all pattern alerts
- Real patterns missed in noise
- Wasted investigation time on false leads

**Prevention:**
1. **Confidence thresholds by match type**:
   ```typescript
   const CONFIDENCE_THRESHOLDS = {
     EXACT_MATCH: 95,      // Name + email + employee ID
     STRONG_MATCH: 85,     // Name + department + time window
     WEAK_MATCH: 70,       // Name similarity only
     PATTERN_ALERT: 60     // Multiple weak signals
   };
   ```
2. **Time-decay weighting**: Recent matches score higher than old ones
3. **Exclusion management**: Already reviewed matches don't re-alert (existing `ConflictExclusionService`)
4. **Department/BU scoping**: Pattern only alerts within same org unit by default
5. **Feedback loop**: Track investigator accept/dismiss rates to tune thresholds

**Detection:** Dashboard showing:
- Pattern alert acceptance rate
- Average time to dismiss false positives
- Threshold hit distribution

**Wave assignment:** Wave 4 (Analytics Intelligence).

**Severity:** HIGH

**Sources:**
- [Compliance Case Management](https://www.sanctionscanner.com/blog/what-is-aml-case-management-for-compliance-1294)
- [Duplicate Detection Pitfalls](https://community.dynamics.com/blogs/post/?postid=142687c4-3102-4ebe-b24c-a923f24ab868)

---

### HIGH-04: Rolling Campaign Triggers + HRIS Sync Race

**What goes wrong:** Campaigns with rolling triggers (e.g., "send disclosure request on hire date anniversary") depend on HRIS sync events. When HRIS sync and campaign evaluation run concurrently:
- New employee gets campaign before Person record fully created
- Termination not reflected - terminated employee receives campaign
- Manager hierarchy incomplete - wrong approver notified

**Why it happens:** Current `HrisSyncService` emits `hris.sync.completed` AFTER all employees processed:
```typescript
// From hris-sync.service.ts
this.emitEvent('hris.sync.completed', {
  organizationId,
  userId,
  result: { /* ... */ },
});
```
But individual employee updates happen during sync. Campaign scheduler queries database during sync window.

**Consequences:**
- Campaigns sent to wrong people
- Compliance gaps (terminated employee disclosures not requested)
- Approval workflows broken

**Prevention:**
1. **Sync completion fence**: Campaign triggers wait for sync to fully complete
2. **Employee state machine**: Track sync status per employee
   ```prisma
   model Employee {
     syncState  EmployeeSyncState @default(PENDING)
     syncedAt   DateTime?
   }
   ```
3. **Campaign eligibility includes sync check**:
   ```typescript
   const eligibleEmployees = await prisma.employee.findMany({
     where: {
       organizationId,
       syncState: 'SYNCED',
       syncedAt: { gte: lastSyncStart }
     }
   });
   ```
4. **Idempotent campaign assignments**: Same employee can't be assigned twice to same campaign (existing `CampaignAssignment` unique constraint)

**Detection:** Alert if campaign assignment fails due to missing Person record.

**Wave assignment:** Wave 3 (Automation Engine) - tied to campaign automation work.

**Severity:** HIGH

---

### HIGH-05: PWA Service Worker Cache Invalidation

**What goes wrong:** Adding PWA/offline support to existing Next.js frontend with:
- Stale data served after backend updates
- Mixed cache versions causing hydration errors
- Confidential data persisted in browser cache inappropriately

**Why it happens:** Service worker lifecycle is independent of app deployment. Old service worker continues serving cached pages until all tabs closed. Multi-tenant data requires careful cache scoping.

**Consequences:**
- Users see outdated information (wrong case status)
- React hydration mismatches causing blank screens
- Security issue: Tenant A data in cache accessible after logout

**Prevention:**
1. **Tenant-scoped cache namespaces**:
   ```typescript
   const CACHE_NAME = `ethico-${organizationId}-v${BUILD_ID}`;
   ```
2. **API responses never cached** - only static assets
3. **Forced service worker update** on version change with user prompt
4. **Cache clearing on logout**:
   ```typescript
   async function logout() {
     await caches.delete(CACHE_NAME);
     await navigator.serviceWorker.getRegistrations()
       .then(regs => regs.forEach(r => r.unregister()));
   }
   ```
5. **Network-first strategy** for all authenticated routes

**Detection:** Monitor for hydration errors in error tracking. Alert on cache hit ratio anomalies.

**Wave assignment:** Wave 5 (User Experience).

**Severity:** HIGH

**Sources:**
- [Next.js 16 PWA with Offline Support](https://blog.logrocket.com/nextjs-16-pwa-offline-support/)
- [Next.js PWA Offline Capability](https://adropincalm.com/blog/nextjs-offline-service-worker/)

---

### HIGH-06: Anonymous Relay Metadata Leakage

**What goes wrong:** The existing `MessageRelayService` implements "Chinese Wall" isolation but metadata can leak identity:
- Email notification timing reveals message patterns
- IP addresses logged in access code lookups
- Browser fingerprinting in status check pages

**Why it happens:** Current implementation focuses on content isolation but not metadata:
```typescript
// From relay.service.ts - notification sent immediately
private async queueReporterNotification(
  organizationId: string,
  reporterEmail: string,
  accessCode: string | null,
  caseReference: string,
): Promise<void> {
  // Email queued immediately - reveals investigator activity timing
  await this.emailQueue.add('send-notification', jobData, { /* ... */ });
}
```

**Consequences:**
- Reporter anonymity compromised through side channels
- Legal liability for whistleblower retaliation
- Regulatory non-compliance (EU Whistleblowing Directive)

**Prevention:**
1. **Notification batching**: Don't send email immediately - batch notifications at random intervals (1-6 hours)
2. **IP address stripping**: Never log IP for anonymous access code lookups
3. **Consistent response timing**: All status check requests take same time (prevent timing attacks)
4. **Metadata stripping on uploads**: Remove EXIF, document properties from attachments
5. **TOR/VPN friendly**: Don't block common anonymization tools

**Detection:** Security audit of all anonymous endpoints for metadata leakage.

**Wave assignment:** Wave 2 (Data Layer) - during anonymous relay enhancement.

**Severity:** HIGH

**Sources:**
- [Security in Whistleblowing](https://www.navex.com/en-us/blog/article/security-in-whistleblowing-matters/)
- [Anonymous Whistleblower Best Practices](https://www.v-comply.com/blog/anonymous-whistleblower/)

---

## Medium Severity Pitfalls

Mistakes that cause delays, technical debt, or user friction.

### MED-01: RAG Chunking Strategy Misalignment

**What goes wrong:** Treating compliance documents same as general text causes:
- Legal clauses split across chunks (meaning lost)
- Section headers separated from content
- Cross-references broken

**Why it happens:** Default chunking (500 tokens, 50 overlap) ignores document structure.

**Prevention:**
1. **Structure-aware chunking** for policies:
   - Chunk by section/subsection
   - Include parent headers in each chunk
   - Preserve cross-reference context
2. **Entity-specific chunking**:
   - Cases: Chunk by activity/note, not token count
   - Investigations: Keep interview Q&A together
   - Policies: Section-based

**Wave assignment:** Wave 1 (RAG Infrastructure).

**Severity:** MEDIUM

**Sources:**
- [RAG Guide 2025](https://medium.com/@illyism/chatgpt-rag-guide-2025-build-reliable-ai-with-retrieval-0f881a4714af)

---

### MED-02: AI Action Undo State Explosion

**What goes wrong:** The existing `ActionExecutorService` supports undo, but complex multi-step automations create undo chains that:
- Require reverting multiple database changes
- Can't undo external side effects (emails sent)
- State explosion from branching undo paths

**Existing code (from `ai.module.ts`):**
```typescript
// Actions
ActionCatalog,
ActionExecutorService,  // Has undo capability
```

**Prevention:**
1. **Undo scope boundaries**: Only undo within single transaction
2. **No undo for external effects**: Clearly mark non-undoable actions
3. **Undo TTL**: Undo only available for 5 minutes after action
4. **Compensation actions** instead of rollback where possible

**Wave assignment:** Wave 3 (Automation Engine).

**Severity:** MEDIUM

---

### MED-03: Embedding Regeneration Thundering Herd

**What goes wrong:** When embedding model changes or documents updated in bulk, all embeddings regenerate simultaneously, causing:
- API rate limits hit
- Database write contention
- Memory exhaustion

**Prevention:**
1. **Staggered regeneration** with exponential backoff
2. **Priority queue**: Active cases before archived
3. **Rate limiting per tenant** at embedding service level
4. **Background job with progress tracking** using existing BullMQ infrastructure

**Wave assignment:** Wave 1 (RAG Infrastructure).

**Severity:** MEDIUM

---

### MED-04: Dashboard Widget Query N+1

**What goes wrong:** Adding AI-powered dashboard widgets that load multiple data sources causes:
- N+1 queries when loading widget grid
- Slow initial dashboard render
- Database connection pool exhaustion

**Existing infrastructure (from common/dataloader):**
```typescript
// DataLoader pattern already in codebase
```

**Prevention:**
1. **DataLoader pattern** (already in codebase at `common/dataloader`)
2. **Widget data prefetch** - single query loads all widget data
3. **Widget-level caching** with tenant-scoped keys
4. **Progressive loading** - critical widgets first, AI widgets lazy

**Wave assignment:** Wave 4 (Analytics Intelligence).

**Severity:** MEDIUM

---

### MED-05: Test Coverage Regression During Intelligence Features

**What goes wrong:** Adding 70 new capabilities without proportional test coverage causes:
- Regressions in existing functionality
- Untestable AI-dependent code
- Integration gaps between modules

**Current state:** Multiple test files exist but coverage may not be enforced at merge time.

**Prevention:**
1. **AI service mocking strategy**: Define mock responses for all AI operations
2. **Coverage gate in CI**: No merge if coverage drops below 80%
3. **Integration test for each automation rule**
4. **Snapshot testing for AI prompts**

**Wave assignment:** All waves - continuous enforcement.

**Severity:** MEDIUM

---

### MED-06: Context Loader Performance Degradation

**What goes wrong:** The existing `ContextLoaderService` loads hierarchical context (platform > org > team > user > entity). Adding RAG context compounds this:
- Multiple database queries per AI request
- Context too large for token limits
- Inconsistent context between requests

**Existing services (from `ai.module.ts`):**
```typescript
// Context sub-services
ContextCacheService,
HierarchyLoaderService,
PromptBuilderService,
ContextLoaderService,
```

**Prevention:**
1. **Context budget allocation**: Reserve tokens for each context level
2. **Smart context selection**: Only include relevant context, not everything
3. **Context caching with invalidation**: Use existing `ContextCacheService`
4. **Async context loading**: Don't block on full context assembly

**Wave assignment:** Wave 1 (RAG Infrastructure).

**Severity:** MEDIUM

---

## Phase-Specific Warning Summary

| Wave | Primary Pitfalls | Required Mitigation |
|------|-----------------|---------------------|
| Wave 1: RAG Infrastructure | CRIT-01 (pgvector+RLS), CRIT-04 (model lock-in), MED-01, MED-03, MED-06 | Separate embedding tables, model abstraction, performance benchmarks |
| Wave 2: Data Layer | CRIT-02 (GDPR+immutable), HIGH-06 (metadata leakage) | Cryptographic shredding design, metadata audit |
| Wave 3: Automation | CRIT-03 (race conditions), HIGH-02 (rule ordering), HIGH-04 (HRIS race), MED-02 | Idempotency keys, transactional outbox, rule phases |
| Wave 4: Analytics | HIGH-01 (materialized views), HIGH-03 (false positives), MED-04 | Incremental aggregation, confidence thresholds |
| Wave 5: UX | HIGH-05 (PWA cache) | Tenant-scoped caches, network-first strategy |
| Wave 6: Quality | MED-05 (test regression) | Coverage gates, AI mocking strategy |

---

## Integration Risk Matrix: Existing Modules

The existing 42 modules create specific integration risks when adding intelligence features:

| Existing Module | Intelligence Feature | Integration Risk | Mitigation |
|----------------|---------------------|------------------|------------|
| `ai.module.ts` | RAG pipeline | Context size explosion | Token budgeting |
| `events.module.ts` | Automation triggers | Race conditions | Idempotency + outbox |
| `workflow.module.ts` | AI-driven transitions | State machine conflicts | Lock + validate |
| `campaigns.module.ts` | Rolling triggers | HRIS sync race | Completion fence |
| `hris.module.ts` | Employee-based rules | Partial sync state | Sync state tracking |
| `messaging.module.ts` | AI-assisted replies | Metadata leakage | Timing obfuscation |
| `disclosures.module.ts` | Conflict detection | False positive flood | Threshold tuning |
| `analytics.module.ts` | AI dashboards | N+1 queries | DataLoader pattern |
| `search.module.ts` | Vector search | RLS performance | Separate tables |

---

## Quick Reference Checklist

Before starting each wave, verify:

**Wave 1 (RAG):**
- [ ] Embedding table schema separates vector from RLS-protected tables
- [ ] Embedding model abstraction in place
- [ ] Performance benchmarks with 100K+ embeddings defined
- [ ] Chunking strategy documented per entity type
- [ ] Context budget allocation defined

**Wave 2 (Data Layer):**
- [ ] GDPR deletion strategy documented and approved by legal
- [ ] Cryptographic shredding implementation planned
- [ ] Anonymous endpoint metadata audit complete
- [ ] Notification batching design approved

**Wave 3 (Automation):**
- [ ] Idempotency key pattern defined for all event handlers
- [ ] Rule execution phases documented
- [ ] HRIS sync fence mechanism designed
- [ ] Transactional outbox schema ready

**Wave 4 (Analytics):**
- [ ] Aggregation strategy chosen (incremental vs materialized)
- [ ] Pattern detection confidence thresholds defined
- [ ] Feedback loop mechanism for false positives designed
- [ ] Widget data loading strategy documented

**Wave 5 (UX):**
- [ ] Service worker cache invalidation strategy approved
- [ ] Tenant cache isolation verified
- [ ] Logout cache clearing tested
- [ ] Offline data scope defined (what CAN be cached)

**Wave 6 (Quality):**
- [ ] AI mock strategy documented
- [ ] Coverage thresholds enforced in CI
- [ ] Integration test for each automation rule
- [ ] Regression test suite for existing features

---

## Sources

### PostgreSQL & Vector Search
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Common Postgres RLS Footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- [Postgres RLS Implementation Guide](https://www.permit.io/blog/postgres-rls-implementation-guide)
- [RLS in Vector DBs for RAG](https://medium.com/@michael.hannecke/implementing-row-level-security-in-vector-dbs-for-rag-applications-fdbccb63d464)
- [RAG with Permissions (Supabase)](https://supabase.com/docs/guides/ai/rag-with-permissions)
- [PostgreSQL Materialized Views](https://stormatics.tech/blogs/postgresql-materialized-views-when-caching-your-query-results-makes-sense)

### GDPR & Compliance
- [Right to be Forgotten vs Audit Trail](https://axiom.co/blog/the-right-to-be-forgotten-vs-audit-trail-mandates)
- [Immutable Ledgers and GDPR](https://www.serverion.com/uncategorized/how-immutable-ledgers-impact-gdpr-compliance/)
- [GDPR Right to Erasure Guide](https://jetico.com/blog/how-right-erasure-applied-under-gdpr-complete-guide-organizational-compliance/)

### Event-Driven Architecture
- [Race Conditions in EDA](https://event-driven.io/en/dealing_with_race_conditions_in_eda_using_read_models/)
- [Event-Driven Architecture in NestJS](https://dev.to/geampiere/event-driven-architecture-in-nestjs-ccj)
- [NestJS EventEmitter Module](https://docs.nestjs.com/techniques/events)

### RAG & Embeddings
- [PostgreSQL + pgVector RAG Pipeline](https://medium.com/@lakshitagangola123/postgresql-pgvector-spring-ai-your-first-production-ready-rag-pipeline-2025-edition-5aa921bdfec6)
- [RAG Best Practices for Database Integration](https://blog.dreamfactory.com/rag-for-sql-server-mysql-postgres-best-practices-for-secure-ai-database-integration)
- [RAG Guide 2025](https://medium.com/@illyism/chatgpt-rag-guide-2025-build-reliable-ai-with-retrieval-0f881a4714af)

### PWA & Offline
- [Next.js 16 PWA with Offline Support](https://blog.logrocket.com/nextjs-16-pwa-offline-support/)
- [Next.js PWA Offline Capability](https://adropincalm.com/blog/nextjs-offline-service-worker/)
- [Building Offline-First Next.js Apps](https://github.com/vercel/next.js/discussions/82498)

### Whistleblower Systems
- [Security in Whistleblowing](https://www.navex.com/en-us/blog/article/security-in-whistleblowing-matters/)
- [Anonymous Whistleblower Best Practices](https://www.v-comply.com/blog/anonymous-whistleblower/)
- [Building Anonymous Disclosure Portals](https://riskonnect.com/governance-risk-compliance/building-a-discreet-online-portal-for-anonymous-disclosures-and-whistleblowing/)

### Case Management & Pattern Detection
- [Compliance Case Management](https://www.sanctionscanner.com/blog/what-is-aml-case-management-for-compliance-1294)
- [Duplicate Detection Challenges](https://community.dynamics.com/blogs/post/?postid=142687c4-3102-4ebe-b24c-a923f24ab868)

---

*End of Domain Pitfalls Document - v2.0 Intelligence Layer*
