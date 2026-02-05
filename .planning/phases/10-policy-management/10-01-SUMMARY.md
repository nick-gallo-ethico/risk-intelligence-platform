---
phase: 10
plan: 01
subsystem: policy-management
tags: [prisma, schema, dto, policy, versioning, translation]
dependency-graph:
  requires: []
  provides: [Policy model, PolicyVersion model, PolicyVersionTranslation model, PolicyCaseAssociation model, Policy DTOs]
  affects: [10-02, 10-03, 10-04, 10-05, 10-06, 10-07, 10-08, 10-09, 10-10, 10-11]
tech-stack:
  added: []
  patterns: [version-on-publish, immutable-versions, draft-published-lifecycle, translation-review-workflow]
key-files:
  created:
    - apps/backend/src/modules/policies/dto/policy.dto.ts
    - apps/backend/src/modules/policies/dto/index.ts
  modified:
    - apps/backend/prisma/schema.prisma (committed separately in 23ff023)
decisions:
  - title: "Version-on-Publish Pattern"
    choice: "Each publish creates immutable PolicyVersion snapshot"
    rationale: "Preserves audit trail, supports rollback, enables version-specific attestations"
  - title: "Draft Content on Policy"
    choice: "Mutable draftContent field on Policy model"
    rationale: "Allows editing without creating versions, versions only created on explicit publish"
  - title: "Translation Review Workflow"
    choice: "Four-state review status with staleness tracking"
    rationale: "PENDING_REVIEW -> APPROVED/NEEDS_REVISION -> PUBLISHED with isStale flag for source changes"
metrics:
  duration: 8 min
  completed: 2026-02-04
---

# Phase 10 Plan 01: Policy Database Schema Summary

Policy models with draft/published lifecycle, immutable versioning, multi-language translation support, and case association for violation tracking.

## Objective Achieved

Created the foundational Prisma models and TypeScript DTOs for the Policy Management module. All subsequent plans in Phase 10 depend on these models.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Policy models to Prisma schema | 23ff023 (prior commit) | prisma/schema.prisma |
| 2 | Generate migration and client | N/A (db push sync) | Prisma client regenerated |
| 3 | Create Policy DTOs | aa2898a | policies/dto/policy.dto.ts, policies/dto/index.ts |

## Implementation Details

### Prisma Models Created

**Policy** - Core policy entity with draft/published lifecycle:
- Identity: id, organizationId, title, slug (unique per org), policyType, category
- Status: status (DRAFT/PENDING_APPROVAL/APPROVED/PUBLISHED/RETIRED), currentVersion
- Draft: draftContent (HTML), draftUpdatedAt, draftUpdatedById
- Ownership: ownerId (FK to User)
- Dates: effectiveDate, reviewDate, retiredAt, createdAt, updatedAt
- Relations: organization, owner, versions[], caseAssociations[]

**PolicyVersion** - Immutable published snapshots:
- Identity: id, organizationId, policyId, version (sequential int), versionLabel
- Content: content (HTML), plainText (for search), summary, changeNotes
- Publishing: publishedAt, publishedById, effectiveDate, isLatest
- Relations: organization, policy, publishedBy, translations[], caseAssociations[]
- Unique: [policyId, version]

**PolicyVersionTranslation** - Multi-language support:
- Identity: id, organizationId, policyVersionId, languageCode (ISO 639-1), languageName
- Content: title (translated), content (HTML), plainText
- Source: translatedBy (AI/HUMAN/IMPORT), aiModel
- Review: reviewStatus, reviewedAt, reviewedById, reviewNotes, isStale
- Relations: organization, policyVersion, reviewedBy
- Unique: [policyVersionId, languageCode]

**PolicyCaseAssociation** - Policy-case linking:
- Identity: id, organizationId, policyId, policyVersionId (optional), caseId
- Link: linkType (VIOLATION/REFERENCE/GOVERNING), linkReason, violationDate
- Audit: createdAt, createdById
- Relations: organization, policy, policyVersion, case, createdBy
- Unique: [policyId, caseId]

### Enums Added

- PolicyType: CODE_OF_CONDUCT, ANTI_HARASSMENT, ANTI_BRIBERY, DATA_PRIVACY, etc.
- PolicyStatus: DRAFT, PENDING_APPROVAL, APPROVED, PUBLISHED, RETIRED
- TranslationSource: AI, HUMAN, IMPORT
- TranslationReviewStatus: PENDING_REVIEW, APPROVED, NEEDS_REVISION, PUBLISHED
- PolicyCaseLinkType: VIOLATION, REFERENCE, GOVERNING

### DTOs Created

- **CreatePolicyDto**: title, policyType, category, content, ownerId, effectiveDate, reviewDate
- **UpdatePolicyDto**: Partial updates to draft policy
- **PublishPolicyDto**: versionLabel, summary, changeNotes, effectiveDate, requireReAttestation
- **PolicyQueryDto**: page, limit, status, policyType, ownerId, search, sortBy, sortOrder
- **CreateTranslationDto**: policyVersionId, languageCode, languageName, content
- **LinkPolicyToCaseDto**: policyId, policyVersionId, caseId, linkType, linkReason, violationDate

## Deviations from Plan

None - plan executed as written. Note: Prisma models were already committed in a prior session (23ff023), so Task 1 was verification only.

## Verification Results

- `npx prisma validate`: Schema valid
- `npx prisma generate`: Client generated with Policy types
- `npx tsc --noEmit`: DTOs compile successfully
- All required fields present on models
- All enums created with correct values

## Next Phase Readiness

Phase 10-02 (Policy Service CRUD) can proceed:
- Policy model available in Prisma client
- CreatePolicyDto and UpdatePolicyDto ready
- PolicyQueryDto ready for list/search operations
- Slug generation will be implemented in service layer
