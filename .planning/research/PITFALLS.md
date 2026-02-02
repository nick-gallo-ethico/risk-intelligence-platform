# Domain Pitfalls: Enterprise Compliance Management Platform

**Domain:** Healthcare-focused multi-tenant compliance SaaS
**Researched:** February 2, 2026
**Context:** Ethico Risk Intelligence Platform - 1,500+ customer migration with Q1 deadline
**Overall Confidence:** HIGH (multiple authoritative sources, relevant CVEs verified)

---

## Executive Summary

Building an enterprise compliance platform under deadline pressure combines several high-risk domains: multi-tenant data isolation, AI/LLM integration, legacy system migration, and healthcare regulatory compliance (HIPAA). Each domain has well-documented failure modes that have caused significant breaches and project failures in 2024-2025.

The Q1 deadline creates compounding risk - deadline pressure is the #1 cause of technical debt that leads to security vulnerabilities. This document catalogs pitfalls specific to this project context, with detection strategies and prevention approaches.

---

## Critical Pitfalls

Mistakes that cause rewrites, security breaches, or regulatory violations.

### Pitfall 1: Row-Level Security (RLS) False Confidence

**What goes wrong:** Teams implement PostgreSQL RLS, test with superuser accounts (which bypass RLS by default), and ship to production believing data is isolated. CVE-2024-10976 demonstrated that even properly configured RLS can fail when queries are reused across role changes in subqueries, WITH clauses, or security invoker views.

**Why it happens:**
- PostgreSQL superusers and table owners bypass RLS by default
- Testing environments often use elevated privileges for convenience
- RLS policies aren't applied consistently across all query patterns (subqueries, CTEs, partitioned tables)
- Connection pooling can contaminate tenant context if session variables aren't reset per request

**Consequences:**
- Cross-tenant data leakage (catastrophic for compliance platform)
- Regulatory violations (HIPAA breach notification required)
- Customer trust destruction
- Average cost: $4.44M globally, $10.22M in US (IBM 2025)

**Warning signs:**
- Tests pass in development but fail in staging/production
- "Works on my machine" with developer credentials
- No dedicated tenant isolation test suite
- Connection pool exhaustion under load

**Prevention:**
1. **Never test RLS with superuser accounts** - Create dedicated test users per tenant with exact production role hierarchy
2. **Defense in depth** - Application-layer tenant filtering + RLS, not RLS alone
3. **Dedicated tenant isolation E2E tests** - Every entity needs "Org B cannot access Org A data" tests (template exists in SECURITY-GUARDRAILS.md)
4. **Connection pool tenant context reset** - Call `SET LOCAL app.current_organization = $1` on EVERY request, verify with middleware
5. **Audit query plans** - Use `EXPLAIN` to verify RLS policies are applied in complex queries
6. **Monitor CVEs** - PostgreSQL RLS vulnerabilities (CVE-2024-10976, optimizer statistics leaks) require version updates

**Phase mapping:** Foundation phase - must be correct from day one. Cannot be retrofitted.

**Confidence:** HIGH - CVE-2024-10976 documented by PostgreSQL, bypass patterns confirmed by Bytebase and multiple security researchers.

**Sources:**
- [PostgreSQL CVE-2024-10976](https://www.postgresql.org/support/security/CVE-2024-10976/)
- [Bytebase: Common Postgres RLS Footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- [Multi-Tenant Leakage: When RLS Fails](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)

---

### Pitfall 2: LLM Prompt Injection and Cross-Tenant Data Leakage

**What goes wrong:** AI features inadvertently include data from multiple tenants in prompts, or malicious users craft inputs that extract other tenants' data through prompt injection. In multi-tenant LLM serving, even caching can leak data across tenants ("PROMPTPEEK" attack).

**Why it happens:**
- AI features are often added late, bolted on without security review
- Prompt templates pull from multiple data sources without tenant filtering
- Shared LLM caches (for cost/performance) create side-channel leakage
- Developers focus on AI functionality, not AI security
- RAG systems index cross-tenant data without proper isolation

**Consequences:**
- Cross-tenant PHI exposure (HIPAA violation)
- Competitive intelligence leakage
- Regulatory fines (EU AI Act requires strict data governance, enforcement begins 2026)
- Model manipulation through injected instructions

**Warning signs:**
- AI prompts include `findMany()` without tenant filter
- Single vector database without tenant partitioning
- No prompt logging/audit trail
- AI responses reference entities user shouldn't access
- Shared embedding cache across tenants

**Prevention:**
1. **Tenant isolation in AI pipeline** - Every data fetch for AI context MUST include `organizationId` filter (already in SECURITY-GUARDRAILS.md)
2. **Per-tenant vector indices** - Don't share pgvector/Pinecone indices across tenants
3. **Prompt sanitization** - Strip or escape user input before inclusion in prompts
4. **AI interaction logging** - Log all prompts and responses (without raw PHI) for audit
5. **Rate limiting per tenant** - Prevent prompt injection enumeration attacks
6. **Output validation** - Check AI responses don't include unexpected entity references

**Phase mapping:** AI integration phase - must be designed in from the start of AI features, not retrofitted.

**Confidence:** HIGH - PROMPTPEEK attack documented in research, SaaS AI breaches widely reported in 2025.

**Sources:**
- [LLM Security Risks in 2026: Prompt Injection, RAG, and Shadow AI](https://sombrainc.com/blog/llm-security-risks-2026)
- [SaaS Security in an AI-Driven World](https://medium.com/@jennyastor03/saas-security-in-an-ai-driven-world-pitfalls-solutions-for-2026-b13eb3501d51)
- [LLM Security: 4 Critical Security Risks in 2026](https://www.clickittech.com/ai/llm-security/)

---

### Pitfall 3: Migration Data Corruption and Compliance Loss

**What goes wrong:** Migrating 1,500+ customers from legacy systems (current Ethico platform, NAVEX, Case IQ, EQS) results in data corruption, lost audit trails, or broken entity relationships. Customers lose access to historical compliance data needed for audits.

**Why it happens:**
- Legacy data formats clash with modern schemas (causes 45% of migration failures)
- Questionnaire-based discovery vs. engineering-led discovery (150% timeline overruns)
- Compliance requirements ignored during transformation
- One-size-fits-all migration scripts for diverse source systems
- Insufficient validation of migrated data integrity

**Consequences:**
- Audit failures (SOX, HIPAA compliance gaps)
- Lost case history (legal liability)
- Customer churn at critical moment
- 2-3x cost to remediate post-migration

**Warning signs:**
- Migration scripts don't preserve `source_system` and `source_record_id`
- No validation suite comparing source/target record counts
- Missing audit trail for migration operations
- Rushing migration testing to meet deadline
- Single pilot customer before mass migration

**Prevention:**
1. **Migration-ready schema from day one** - Every entity has `source_system`, `source_record_id`, `migrated_at` (already specified in platform vision)
2. **Per-source-system adapters** - Dedicated migration code for NAVEX, EQS, Case IQ, legacy Ethico
3. **Validation framework** - Automated comparison of record counts, relationship integrity, required fields
4. **Staged rollout** - 3-5 pilot customers, then batched rollout with rollback capability
5. **Audit trail for migration** - Log every transformation decision for compliance evidence
6. **GRC integration from start** - 93% of orgs fail to embed GRC strategy before migration

**Phase mapping:** Migration phase - but schema decisions in foundation phase affect migration success.

**Confidence:** HIGH - 73% of migrations struggle per Gartner/Kanerika analysis, healthcare-specific risks well documented.

**Sources:**
- [What 500+ Enterprise Reviews Reveal About Data Migration Failures](https://medium.com/@kanerika/what-500-enterprise-software-reviews-reveal-about-data-migration-failures-5878a3b6624a)
- [Governance Failures Disrupt Cloud Migration](https://betanews.com/article/governance-failures-disrupt-cloud-migration-plans/)
- [Cloud Migration Risks in 2025](https://www.itconvergence.com/blog/cloud-migration-risks-in-2025-turning-compliance-and-security-challenges-into-resilience)

---

### Pitfall 4: HIPAA Compliance as Afterthought

**What goes wrong:** Healthcare compliance platform builds features first, then tries to retrofit HIPAA compliance. PHI is cached in logs, transmitted to vendors without BAAs, or exposed through analytics/marketing integrations.

**Why it happens:**
- Developers treat HIPAA as checkbox, not continuous process
- BAA gaps with third-party services (LLM APIs, analytics, error tracking)
- PHI accidentally logged in error messages or debug output
- Access controls too permissive during development
- Minor integrations (analytics pixels) transmit PHI unintentionally

**Consequences:**
- Breach notification requirements (540+ organizations reported breaches in 2023 affecting 112M people)
- Fines ($750k example for missing BAA alone)
- Customer trust destruction
- Competitive disadvantage in healthcare market

**Warning signs:**
- AI/LLM vendor hasn't signed BAA
- Error logging includes request bodies with PHI
- "Admin" roles have access to all data "just in case"
- Analytics integration added without privacy review
- No PHI inventory documenting where PHI flows

**Prevention:**
1. **BAA before integration** - No vendor integration without signed BAA (especially Claude API - verify Anthropic's healthcare BAA status)
2. **PHI inventory** - Document every system/service that touches PHI
3. **No PHI in logs** - Sanitize all log output, use correlation IDs instead of PHI
4. **Minimum necessary access** - Role-based access with least privilege, no "admin just in case"
5. **Privacy-by-design** - Security and privacy integrated from development start
6. **Regular audits** - HIPAA compliance isn't one-time; continuous monitoring required

**Phase mapping:** Every phase - HIPAA compliance must be continuous, not a phase.

**Confidence:** HIGH - HIPAA requirements well-documented, breach statistics from HHS OCR.

**Sources:**
- [How to Build HIPAA-Compliant Application: Best Practices 2026](https://mobidev.biz/blog/hipaa-compliant-software-development-checklist)
- [HIPAA Journal: Compliance for Software Development](https://www.hipaajournal.com/hipaa-compliance-for-software-development/)
- [HIPAA Compliant AI Software Development](https://www.ninetwothree.co/blog/hipaa-compliant-ai-software-development)

---

### Pitfall 5: Deadline-Driven Security Shortcuts

**What goes wrong:** Q1 deadline pressure leads to deliberate technical debt in security areas - "we'll fix it after launch." These shortcuts become permanent, multiplying into systemic vulnerabilities.

**Why it happens:**
- Significant time pressure (Q1 deadline with 1,500 customer migration)
- Security testing perceived as slow
- "Quick and easy" solutions chosen over "first time right"
- Assumption that post-launch remediation is feasible

**Consequences:**
- Quick fixes become permanent (debt compounds)
- 20-40% productivity loss from accumulated debt (McKinsey)
- Security vulnerabilities in production
- Costlier remediation (2-3x vs. doing it right initially)

**Warning signs:**
- Skipping security tests to meet sprint deadline
- "TODO: add proper validation" comments in code
- Auth guards missing on new endpoints
- Tenant isolation tests commented out
- Pre-commit hooks disabled "temporarily"

**Prevention:**
1. **Security as non-negotiable** - Security guardrails aren't optional, even under pressure (SECURITY-GUARDRAILS.md is MANDATORY)
2. **Scope reduction over quality reduction** - Cut features, not security
3. **Automated security gates** - Pre-commit hooks, CI/CD security scans that block deployment
4. **Explicit debt tracking** - If debt is taken, document it with remediation timeline
5. **Phase-appropriate shortcuts** - Some debt is acceptable in MVP, security debt is not

**Phase mapping:** Every phase - deadline pressure affects all phases.

**Confidence:** HIGH - Well-documented pattern in software development literature.

**Sources:**
- [How to Manage Technical Debt in 2025](https://vfunction.com/blog/how-to-manage-technical-debt/)
- [The True Cost of Technical Debt 2025](https://www.stepsoftware.com/the-true-cost-of-technical-debt-and-how-it-leaders-are-tackling-it-in-2025/)
- [Kong: Roadmap for Reducing Technical Debt 2025](https://konghq.com/blog/learning-center/reducing-technical-debt)

---

## Moderate Pitfalls

Mistakes that cause delays, rework, or technical debt but are recoverable.

### Pitfall 6: Connection Pool Tenant Context Contamination

**What goes wrong:** Connection pooling (PgBouncer, Prisma pool) reuses connections without resetting tenant session variables. Tenant A's context persists into Tenant B's request.

**Why it happens:**
- Connection pooling is standard for performance
- Session variables don't automatically reset between pool checkouts
- Works correctly in single-tenant testing, fails in production

**Prevention:**
1. **Reset tenant context on every request** - Middleware sets `SET LOCAL app.current_organization` before any query
2. **Use `SET LOCAL` not `SET`** - `SET LOCAL` is transaction-scoped, safer than session-scoped `SET`
3. **Verify in integration tests** - Test rapid multi-tenant requests on same pool

**Phase mapping:** Foundation phase - must be in place before multi-tenant testing.

**Confidence:** HIGH - Documented connection pool contamination pattern.

**Sources:**
- [Multi-Tenant Leakage: When RLS Fails](https://instatunnel.my/blog/multi-tenant-leakage-when-row-level-security-fails-in-saas)

---

### Pitfall 7: Cache Key Pollution

**What goes wrong:** Cache keys don't include tenant ID, causing cross-tenant data exposure through Redis or in-memory caches.

**Why it happens:**
- Caching added for performance without security review
- Copy-paste of single-tenant caching patterns
- Works in development (single tenant), fails in production

**Prevention:**
1. **Tenant-prefixed cache keys always** - `org:{organizationId}:entity:{id}` pattern (specified in SECURITY-GUARDRAILS.md)
2. **Code review checklist item** - Every cache operation checked for tenant prefix
3. **Automated detection** - Static analysis for cache keys without tenant component

**Phase mapping:** Foundation phase - caching patterns established early.

**Confidence:** HIGH - Standard multi-tenant security pattern.

---

### Pitfall 8: AI Rate Limit Exhaustion Under Load

**What goes wrong:** Production load exceeds Anthropic API rate limits, causing degraded service or outages. Enterprise doesn't plan for scale or understand token-bucket vs. fixed-window rate limiting.

**Why it happens:**
- Development uses minimal API calls, production scales unexpectedly
- Misunderstanding of rate limit structure (RPM, TPM, daily quotas)
- No caching of repeated AI operations
- No graceful degradation when limits hit

**Prevention:**
1. **Understand rate limit tiers** - Anthropic uses token-bucket algorithm; plan capacity per tier
2. **Prompt caching** - Cached tokens don't count toward ITPM limits (5-10x throughput improvement)
3. **Request batching** - Combine related queries where possible
4. **Graceful degradation** - Queue AI requests, show loading state, don't block critical flows
5. **Monitor usage daily** - Track token consumption against limits
6. **Plan tier upgrades** - Request higher limits before peak periods (enterprise minimum ~$50k)

**Phase mapping:** AI integration phase - must be considered during AI feature design.

**Confidence:** HIGH - Anthropic documentation confirmed.

**Sources:**
- [Anthropic Rate Limits Documentation](https://platform.claude.com/docs/en/api/rate-limits)
- [Claude API Rate Limits for Enterprise](https://amitkoth.com/claude-api-rate-limits-enterprise/)

---

### Pitfall 9: Audit Trail Gaps

**What goes wrong:** Audit logging is inconsistent - some mutations logged, others not. Compliance auditors can't reconstruct what happened to a case, who accessed it, when.

**Why it happens:**
- Audit logging added incrementally, not systematically
- Performance concerns lead to selective logging
- Different developers implement logging differently
- System actions (cron jobs, AI) not logged like user actions

**Prevention:**
1. **Unified AUDIT_LOG table** - Single pattern for all mutations (already in platform vision)
2. **Natural language action descriptions** - "Sarah assigned case to John" not just action codes
3. **Mandatory logging decorator** - TypeScript decorator that enforces logging for all mutations
4. **Log system and AI actions** - Actor type includes 'USER', 'SYSTEM', 'AI'
5. **Test audit completeness** - E2E tests verify audit entries created for all operations

**Phase mapping:** Foundation phase - audit infrastructure must be in place before feature development.

**Confidence:** HIGH - Compliance requirement, pattern defined in platform docs.

---

### Pitfall 10: RIU Immutability Violations

**What goes wrong:** Risk Intelligence Units (RIUs) are supposed to be immutable records of what was reported. Developers add update endpoints or allow field changes, destroying audit integrity.

**Why it happens:**
- "Just let users fix typos" requests
- Confusion between RIU (immutable input) and Case (mutable work container)
- HubSpot Contact/Deal pattern not understood by all developers

**Prevention:**
1. **No UPDATE endpoint for RIU content fields** - API design enforces immutability
2. **Schema-level protection** - Database trigger prevents updates to immutable fields
3. **Corrections go on Case** - If intake categorization was wrong, Case has corrected value; RIU preserves original
4. **Team education** - Document the HubSpot parallel clearly (RIU=Contact, Case=Deal)

**Phase mapping:** Foundation phase - entity model decisions.

**Confidence:** HIGH - Core platform architecture decision.

---

## Minor Pitfalls

Mistakes that cause annoyance or minor rework but are easily fixable.

### Pitfall 11: Search Index Tenant Leakage

**What goes wrong:** Elasticsearch indices not properly scoped by tenant, search returns results from other organizations.

**Prevention:**
- Tenant-prefixed index names: `org_{organizationId}_{type}` (specified in SECURITY-GUARDRAILS.md)
- All search queries include tenant filter
- Index creation validates tenant scope

**Phase mapping:** Search feature phase.

---

### Pitfall 12: Inconsistent Error Messages Leaking Information

**What goes wrong:** Error messages reveal whether a resource exists (404 "Not found" vs. 403 "Forbidden"), enabling enumeration attacks.

**Prevention:**
- Always return 404 for resources user can't access (don't leak existence)
- Generic error messages in production, detailed in logs only
- Error message review in security checklist

**Phase mapping:** All phases - API design pattern.

---

### Pitfall 13: JWT Token Bloat

**What goes wrong:** Too much data in JWT tokens makes them large, slow, and exposes unnecessary information.

**Prevention:**
- Minimal claims: `sub`, `organizationId`, `role`, `sessionId`, `exp`
- No PII beyond what's strictly needed
- No internal system details
- Computed permissions, not full permission list

**Phase mapping:** Auth foundation phase.

---

### Pitfall 14: Operator vs. Client User Confusion

**What goes wrong:** System doesn't properly distinguish Ethico operators (multi-tenant access) from client users (single-tenant access), leading to permission errors or data exposure.

**Prevention:**
- `isOperator` flag in JWT token for Ethico staff
- Separate permission checks for operator context
- Clear UI distinction between operator and client views
- Audit logging distinguishes operator actions

**Phase mapping:** Auth/multi-tenancy phase.

---

## Healthcare-Specific Pitfalls

### Pitfall 15: PHI in AI Prompts Without Consent

**What goes wrong:** AI features process PHI without proper consent documentation, violating HIPAA's minimum necessary standard.

**Prevention:**
- Document what PHI is included in AI prompts
- Ensure BAA with AI provider covers this use
- Implement consent tracking for AI-assisted features
- Allow customers to disable AI features if needed

**Phase mapping:** AI integration phase.

---

### Pitfall 16: Breach Notification Timeline Failure

**What goes wrong:** Platform doesn't have infrastructure to detect breaches quickly, missing HIPAA's 60-day notification requirement.

**Prevention:**
- Real-time monitoring for anomalous access patterns
- Automated alerts for potential breaches
- Documented incident response procedure
- Breach notification feature in platform

**Phase mapping:** Security monitoring phase.

---

## Phase-Specific Warning Matrix

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Foundation/Auth | RLS false confidence | CRITICAL | Test with non-superuser accounts, defense in depth |
| Foundation/Auth | Connection pool contamination | MODERATE | SET LOCAL on every request |
| Foundation/Data Model | RIU immutability violations | MODERATE | No update endpoints, schema triggers |
| Foundation/Caching | Cache key pollution | MODERATE | Tenant-prefix all keys |
| AI Integration | Cross-tenant prompt data | CRITICAL | Tenant filter in all data fetches for AI |
| AI Integration | Rate limit exhaustion | MODERATE | Caching, batching, graceful degradation |
| AI Integration | Missing BAA with AI vendor | CRITICAL | Verify BAA before integration |
| Migration | Data corruption | CRITICAL | Validation framework, staged rollout |
| Migration | Lost audit trails | MODERATE | Preserve source_system, source_record_id |
| All Phases | Deadline-driven shortcuts | CRITICAL | Security as non-negotiable gate |
| All Phases | Audit trail gaps | MODERATE | Mandatory logging decorator |
| All Phases | HIPAA violations | CRITICAL | Privacy-by-design, continuous compliance |

---

## Q1 Deadline-Specific Risks

Given the Q1 deadline with 1,500 customer migration, these pitfalls have elevated probability:

1. **Security shortcuts "to be fixed later"** - Pre-commit hooks disabled, tests skipped
2. **Migration without adequate validation** - Rushing customer onboarding
3. **AI features without tenant isolation** - Adding differentiating features quickly
4. **Insufficient testing with real data volumes** - Works in dev, fails in production
5. **HIPAA compliance as checkbox** - Claiming compliance without continuous verification

**Recommended mitigations for deadline pressure:**
- Scope reduction over quality reduction
- Automated security gates that cannot be bypassed
- Phased customer migration (pilots first)
- MVP feature set that's secure over complete feature set that's vulnerable

---

## Verification Checklist for Development

Before any PR merge:

- [ ] Tenant isolation test added for new entities
- [ ] Cache keys include tenant prefix
- [ ] AI prompts verified single-tenant
- [ ] Audit logging for all mutations
- [ ] Error messages don't leak information
- [ ] RIU immutability preserved (no update to content fields)
- [ ] No PHI in logs or error messages
- [ ] Rate limiting on AI endpoints
- [ ] BAA verified for any new vendor integration

---

## Sources Summary

### Multi-Tenant Security
- [PostgreSQL CVE-2024-10976](https://www.postgresql.org/support/security/CVE-2024-10976/)
- [Bytebase: Postgres RLS Footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- [Multi-Tenant Leakage](https://instatunnel.my/blog/multi-tenant-leakage-when-row-level-security-fails-in-saas)
- [2025 Breaches Recap and 2026 Outlook](https://checkred.com/resources/blog/a-recap-of-2025-breaches-and-an-outlook-for-2026-security-priorities/)

### LLM/AI Security
- [LLM Security Risks 2026](https://sombrainc.com/blog/llm-security-risks-2026)
- [SaaS Security in AI-Driven World](https://medium.com/@jennyastor03/saas-security-in-an-ai-driven-world-pitfalls-solutions-for-2026-b13eb3501d51)
- [Anthropic Rate Limits](https://platform.claude.com/docs/en/api/rate-limits)

### Migration
- [500+ Enterprise Reviews on Migration Failures](https://medium.com/@kanerika/what-500-enterprise-software-reviews-reveal-about-data-migration-failures-5878a3b6624a)
- [Governance Failures in Migration](https://betanews.com/article/governance-failures-disrupt-cloud-migration-plans/)

### HIPAA/Healthcare
- [HIPAA-Compliant Application Development 2026](https://mobidev.biz/blog/hipaa-compliant-software-development-checklist)
- [HIPAA Journal: Software Development](https://www.hipaajournal.com/hipaa-compliance-for-software-development/)

### Technical Debt
- [Managing Technical Debt 2025](https://vfunction.com/blog/how-to-manage-technical-debt/)
- [True Cost of Technical Debt](https://www.stepsoftware.com/the-true-cost-of-technical-debt-and-how-it-leaders-are-tackling-it-in-2025/)

---

*End of Domain Pitfalls Document*
