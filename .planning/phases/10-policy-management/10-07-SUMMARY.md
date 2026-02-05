---
phase: 10-policy-management
plan: 07
subsystem: search
tags: [elasticsearch, indexing, policies, search]

dependency-graph:
  requires:
    - "10-02: Policy Schema and CRUD"
  provides:
    - "Policy Elasticsearch indexing"
    - "Policy search integration"
    - "Event-driven policy re-indexing"
  affects:
    - "10-08: Policy Dashboard" # will use policy search
    - "11-*: Analytics" # policy search for compliance analytics

tech-stack:
  added: []
  patterns:
    - "Event-driven ES indexing via @OnEvent handlers"
    - "PolicyIndexer service pattern for entity-specific indexing"
    - "Per-tenant index naming: org_{orgId}_policies"

key-files:
  created:
    - "apps/backend/src/modules/search/indexing/index-mappings/policy.mapping.ts"
    - "apps/backend/src/modules/policies/listeners/search-index.listener.ts"
  modified:
    - "apps/backend/src/modules/search/indexing/index-mappings/index.ts"
    - "apps/backend/src/modules/policies/listeners/index.ts"
    - "apps/backend/src/modules/policies/policies.module.ts"
  prior:
    - "apps/backend/src/modules/search/indexing/indexers/policy.indexer.ts (10-06)"
    - "apps/backend/src/modules/search/indexing/indexing.service.ts (10-06)"
    - "apps/backend/src/modules/search/search.module.ts (10-06)"

decisions:
  - id: 10-07-01
    decision: "Compliance synonyms in ES analyzer for policy-specific terminology"
    rationale: "Improves search relevance for compliance queries (policy/procedure/guideline)"
  - id: 10-07-02
    decision: "Multilingual analyzer for translated content uses asciifolding"
    rationale: "Supports accented characters in translations without requiring ICU plugin"
  - id: 10-07-03
    decision: "PolicyIndexer already created in 10-06 as dependency"
    rationale: "Parallel execution created indexer as part of PolicyCaseAssociation implementation"
  - id: 10-07-04
    decision: "Event-driven re-indexing for all policy mutations"
    rationale: "Ensures search index stays in sync with policy changes automatically"

metrics:
  duration: 12 min
  completed: 2026-02-05
---

# Phase 10 Plan 07: Policy Search Indexing Summary

Policy Elasticsearch indexing with per-tenant indices, compliance synonyms, and event-driven re-indexing on publish/update/translation changes.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create policy ES mapping | ff598d6 | policy.mapping.ts, index.ts |
| 2 | Create PolicyIndexer (pre-existing) | 14a5453 | policy.indexer.ts (10-06) |
| 3 | Create PolicySearchIndexListener | 1a5ea80 | search-index.listener.ts, policies.module.ts |

## Implementation Details

### Policy Index Mapping

The POLICY_INDEX_MAPPING defines Elasticsearch structure for policy search:

**Searchable text fields:**
- `title` - Policy title with compliance_analyzer
- `content` - Rich HTML content
- `plainText` - Extracted plain text for cleaner search
- `summary` - Policy summary
- `translatedContent` - Combined translated text with multilingual_analyzer

**Keyword fields:**
- `policyType`, `category`, `status` - Faceting and filtering
- `translationLanguages[]` - Array of available translation codes
- `approvalStatus`, `workflowInstanceId` - Workflow tracking

**Compliance synonyms include:**
- policy, procedure, guideline, standard
- code of conduct, coc, employee handbook
- conflict of interest, coi, dual interest
- harassment, bullying, discrimination
- bribery, corruption, kickback

### PolicyIndexer

Service handles building complete policy documents with:
- Policy metadata (title, type, category, status)
- Latest version content and summary
- Owner information (name, email)
- Translations (language codes, combined plain text)
- Case association count
- Workflow instance status (for pending approvals)

### Event-Driven Re-indexing

PolicySearchIndexListener handles events:
- `policy.created` - Index new policy
- `policy.updated` - Re-index on draft changes
- `policy.published` - Re-index with new version content
- `policy.retired` - Re-index with retired status
- `policy.translation.created` - Re-index with new translation
- `policy.translation.updated` - Re-index with updated translation
- `policy.case.linked` - Re-index with updated case count
- `policy.case.unlinked` - Re-index with updated case count

All handlers are async with error catching - failures are logged but don't block other listeners.

## Verification Results

- POLICY_INDEX_MAPPING includes all required fields
- PolicyIndexer fetches policy with all relations
- Event handlers trigger re-indexing on all policy mutations
- Index follows per-tenant naming: `org_{orgId}_policies`
- TypeScript compilation passes

## Deviations from Plan

### Task 2: PolicyIndexer Already Created

**Found during:** Task 2 execution

**Issue:** PolicyIndexer was already created as part of 10-06 (PolicyCaseAssociationService) by parallel execution.

**Resolution:** Verified existing implementation matches requirements, no additional changes needed.

**Commit:** 14a5453 (part of 10-06)

## Next Phase Readiness

Ready for 10-08 (Policy Dashboard) which will use policy search for:
- Policy list with full-text search
- Status-based filtering
- Owner-based views
- Translation coverage reports
