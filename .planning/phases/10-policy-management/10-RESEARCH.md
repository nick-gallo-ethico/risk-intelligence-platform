# Phase 10: Policy Management - Research

**Researched:** 2026-02-04
**Domain:** Policy lifecycle management, document versioning, approval workflows, attestation campaigns, AI translation, full-text search
**Confidence:** HIGH (extensive existing infrastructure from prior phases)

## Summary

Phase 10 implements the complete policy lifecycle - from document creation through approval, publishing, translation, and employee attestation. The research reveals that **substantial infrastructure already exists** from prior phases: workflow engine (Phase 1), Campaign/CampaignAssignment entities (Phase 4), AI translation skill (Phase 5), notification system (Phase 7), and the same disclosure campaign patterns (Phase 9).

The primary implementation work involves:
1. **Policy entity with versioning** - Rich text content with immutable published versions (follows Investigation Template version-on-publish pattern)
2. **PolicyTranslation entity** - Linked translations preserving original, using existing translate skill from Phase 5
3. **Approval workflow integration** - Using existing WorkflowTemplate/WorkflowInstance with `entityType: POLICY`
4. **Attestation campaigns** - Extending existing Campaign infrastructure with `type: ATTESTATION`
5. **Policy-to-Case linking** - Association entity connecting policies (specific versions) to Cases for violation tracking
6. **Full-text search** - Adding policy mapping to existing Elasticsearch indexing infrastructure

**Primary recommendation:** Build Policy as a new entity following the version-on-publish pattern from InvestigationTemplate. Use existing Campaign infrastructure for attestations (adding `policyVersionId` to link). Leverage existing translate skill for AI translation. Reuse existing workflow engine, notification system, and Elasticsearch patterns.

## Standard Stack

The project already has the established stack. Phase 10 uses existing infrastructure:

### Core (Already Exists - Use As-Is)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 10.x | Backend framework | Already in use, provides DI, modules |
| Prisma | 5.x | ORM | Already in use, handles RLS |
| Tiptap | 2.x | Rich text editor | Already in use for investigation notes (rich-text-editor.tsx) |
| @tiptap/starter-kit | 2.x | Tiptap extensions | Bold, italic, lists, headings already configured |
| Next.js | 14.x | Frontend framework | Already in use with App Router |
| shadcn/ui | latest | UI components | Already in use, consistent styling |

### Supporting (May Need for Phase 10)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| diff | 7.x | Version comparison | Generate diff between policy versions (already in package.json) |
| html-to-text | 9.x | Extract text from HTML | For search indexing of rich text content |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tiptap (existing) | ProseMirror direct | Tiptap already configured with draft persistence; switching adds complexity |
| Version-on-publish | Git-style branching | Simple linear versioning matches compliance needs; branching is overkill |
| PolicyVersion table | JSON history field | Separate table enables efficient queries, foreign keys, indexing |

**Installation:**
```bash
npm install html-to-text  # Only if not already present
# All other dependencies already installed
```

## Architecture Patterns

### Recommended Module Structure
```
apps/backend/src/modules/
├── policies/                       # NEW: Policy module
│   ├── policies.module.ts
│   ├── policies.controller.ts
│   ├── policies.service.ts
│   ├── dto/
│   │   ├── create-policy.dto.ts
│   │   ├── update-policy.dto.ts
│   │   ├── publish-policy.dto.ts
│   │   └── policy-query.dto.ts
│   ├── translations/               # Sub-module for translations
│   │   ├── policy-translation.service.ts
│   │   └── dto/
│   └── events/
│       └── policy.events.ts
├── campaigns/                      # Existing - extend for attestation
│   ├── attestation/                # NEW: Attestation sub-module
│   │   ├── attestation-campaign.service.ts
│   │   └── attestation-response.service.ts
│   └── ...existing...
├── associations/                   # Existing - add policy-case
│   ├── policy-case/                # NEW: Policy-Case associations
│   │   ├── policy-case-association.service.ts
│   │   └── policy-case-association.controller.ts
│   └── ...existing...
└── search/
    └── indexing/
        └── index-mappings/
            └── policy.mapping.ts   # NEW: Policy ES mapping
```

### Pattern 1: Policy Version-on-Publish Pattern

**What:** Policy drafts are mutable until published. Publishing creates an immutable PolicyVersion and increments the version number. Subsequent edits create a new draft based on the latest version.

**When to use:** All policy lifecycle operations.

**Example:**
```typescript
// Prisma schema - Policy and PolicyVersion
model Policy {
  id              String @id @default(uuid())
  organizationId  String @map("organization_id")

  // Identity
  title           String
  slug            String    // URL-friendly identifier
  policyType      PolicyType @map("policy_type")  // CODE_OF_CONDUCT, ANTI_HARASSMENT, etc.
  category        String?   // Tenant-configurable category

  // Current state
  status          PolicyStatus @default(DRAFT)
  currentVersion  Int       @default(0) @map("current_version")  // 0 = never published

  // Draft content (mutable until publish)
  draftContent    String?   @map("draft_content")  // HTML from Tiptap
  draftUpdatedAt  DateTime? @map("draft_updated_at")
  draftUpdatedById String?  @map("draft_updated_by_id")

  // Ownership
  ownerId         String    @map("owner_id")

  // Metadata
  effectiveDate   DateTime? @map("effective_date")
  reviewDate      DateTime? @map("review_date")  // Next review due
  retiredAt       DateTime? @map("retired_at")

  // Audit
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  createdById     String    @map("created_by_id")

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  owner           User         @relation("PolicyOwner", fields: [ownerId], references: [id])
  versions        PolicyVersion[]
  translations    PolicyTranslation[]
  caseAssociations PolicyCaseAssociation[]

  @@unique([organizationId, slug])
  @@index([organizationId])
  @@index([organizationId, status])
  @@index([organizationId, policyType])
  @@map("policies")
}

model PolicyVersion {
  id              String @id @default(uuid())
  organizationId  String @map("organization_id")
  policyId        String @map("policy_id")

  // Version identity
  version         Int       // 1, 2, 3, ...
  versionLabel    String?   @map("version_label")  // "v1.0", "2026 Update", etc.

  // Immutable content (frozen at publish time)
  content         String    // HTML from Tiptap
  plainText       String    @map("plain_text")  // For search indexing

  // Summary
  summary         String?   // AI or manual summary
  changeNotes     String?   @map("change_notes")  // What changed from previous

  // Publishing metadata
  publishedAt     DateTime  @map("published_at")
  publishedById   String    @map("published_by_id")
  effectiveDate   DateTime  @map("effective_date")

  // Status within this version
  isLatest        Boolean   @default(true) @map("is_latest")

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  policy          Policy       @relation(fields: [policyId], references: [id], onDelete: Cascade)
  publishedBy     User         @relation(fields: [publishedById], references: [id])
  translations    PolicyVersionTranslation[]
  attestationCampaigns Campaign[] @relation("PolicyVersionCampaigns")

  @@unique([policyId, version])
  @@index([organizationId])
  @@index([organizationId, policyId])
  @@index([organizationId, isLatest])
  @@map("policy_versions")
}

enum PolicyType {
  CODE_OF_CONDUCT
  ANTI_HARASSMENT
  ANTI_BRIBERY
  DATA_PRIVACY
  INFORMATION_SECURITY
  GIFT_ENTERTAINMENT
  CONFLICTS_OF_INTEREST
  TRAVEL_EXPENSE
  WHISTLEBLOWER
  SOCIAL_MEDIA
  ACCEPTABLE_USE
  OTHER

  @@map("policy_type")
}

enum PolicyStatus {
  DRAFT           // Being edited, not yet submitted
  PENDING_APPROVAL // In approval workflow
  APPROVED        // Approved, ready to publish
  PUBLISHED       // Live and visible to employees
  RETIRED         // No longer active, kept for historical reference

  @@map("policy_status")
}
```

### Pattern 2: Policy Translation with Original Preserved

**What:** Translations are linked to specific PolicyVersions. Original content is always preserved. Translations can be AI-generated (using existing translate skill) and then human-reviewed.

**When to use:** Multi-language policy distribution.

**Example:**
```typescript
// Prisma schema - PolicyVersionTranslation
model PolicyVersionTranslation {
  id                String @id @default(uuid())
  organizationId    String @map("organization_id")
  policyVersionId   String @map("policy_version_id")

  // Language
  languageCode      String @map("language_code")  // ISO 639-1: en, es, fr, de, zh, etc.
  languageName      String @map("language_name")  // English, Spanish, French, etc.

  // Translated content
  title             String
  content           String    // HTML
  plainText         String    @map("plain_text")  // For search

  // Generation metadata
  translatedBy      TranslationSource @map("translated_by")  // AI or HUMAN
  aiModel           String?   @map("ai_model")  // claude-sonnet-4-5, etc.

  // Review status
  reviewStatus      TranslationReviewStatus @default(PENDING_REVIEW) @map("review_status")
  reviewedAt        DateTime? @map("reviewed_at")
  reviewedById      String?   @map("reviewed_by_id")
  reviewNotes       String?   @map("review_notes")

  // Freshness tracking
  isStale           Boolean   @default(false) @map("is_stale")  // Set true when source updated

  // Audit
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  // Relations
  organization      Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  policyVersion     PolicyVersion @relation(fields: [policyVersionId], references: [id], onDelete: Cascade)
  reviewer          User?         @relation(fields: [reviewedById], references: [id])

  @@unique([policyVersionId, languageCode])
  @@index([organizationId])
  @@index([organizationId, languageCode])
  @@index([organizationId, reviewStatus])
  @@map("policy_version_translations")
}

enum TranslationSource {
  AI      // Generated by AI translate skill
  HUMAN   // Manually created or imported
  IMPORT  // Imported from external source

  @@map("translation_source")
}

enum TranslationReviewStatus {
  PENDING_REVIEW  // AI-generated, needs human review
  APPROVED        // Human-reviewed and approved
  NEEDS_REVISION  // Reviewer requested changes
  PUBLISHED       // Finalized and available to employees

  @@map("translation_review_status")
}
```

**Integration with existing translate skill:**
```typescript
// apps/backend/src/modules/policies/translations/policy-translation.service.ts

@Injectable()
export class PolicyTranslationService {
  constructor(
    private prisma: PrismaService,
    private skillRegistry: SkillRegistry,
    private eventEmitter: EventEmitter2,
  ) {}

  async translatePolicy(
    policyVersionId: string,
    targetLanguage: string,
    organizationId: string,
    userId: string,
  ): Promise<PolicyVersionTranslation> {
    const policyVersion = await this.prisma.policyVersion.findUnique({
      where: { id: policyVersionId },
      include: { policy: true },
    });

    // Use existing translate skill from Phase 5
    const translationResult = await this.skillRegistry.executeSkill('translate', {
      content: policyVersion.content,
      targetLanguage,
      preserveFormatting: true,
    }, {
      organizationId,
      userId,
      entityType: 'POLICY_VERSION',
      entityId: policyVersionId,
    });

    // Create translation record
    const translation = await this.prisma.policyVersionTranslation.create({
      data: {
        organizationId,
        policyVersionId,
        languageCode: targetLanguage,
        languageName: this.getLanguageName(targetLanguage),
        title: translationResult.data.translatedTitle || policyVersion.policy.title,
        content: translationResult.data.translatedContent,
        plainText: this.extractPlainText(translationResult.data.translatedContent),
        translatedBy: 'AI',
        aiModel: 'claude-sonnet-4-5',
        reviewStatus: 'PENDING_REVIEW',
      },
    });

    this.eventEmitter.emit('policy.translation.created', {
      policyVersionId,
      translationId: translation.id,
      languageCode: targetLanguage,
      organizationId,
    });

    return translation;
  }
}
```

### Pattern 3: Policy Approval Workflow Integration

**What:** Policy approval uses the existing WorkflowTemplate/WorkflowInstance infrastructure with `entityType: POLICY`.

**When to use:** When a policy is submitted for approval before publishing.

**Example:**
```typescript
// apps/backend/src/modules/policies/policies.service.ts

@Injectable()
export class PoliciesService {
  constructor(
    private prisma: PrismaService,
    private workflowEngineService: WorkflowEngineService,
    private eventEmitter: EventEmitter2,
    private activityService: ActivityService,
  ) {}

  async submitForApproval(
    policyId: string,
    workflowTemplateId: string | null,  // null = use default
    userId: string,
    organizationId: string,
  ): Promise<Policy> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (policy.status !== 'DRAFT') {
      throw new BadRequestException('Only draft policies can be submitted for approval');
    }

    if (!policy.draftContent) {
      throw new BadRequestException('Policy has no content to submit');
    }

    // Get workflow template (default or specified)
    const templateId = workflowTemplateId || await this.getDefaultWorkflowTemplate(organizationId);

    // Start workflow instance using existing engine
    const workflowInstance = await this.workflowEngineService.startWorkflow({
      templateId,
      entityType: 'POLICY',
      entityId: policyId,
      startedById: userId,
      organizationId,
    });

    // Update policy status
    const updatedPolicy = await this.prisma.policy.update({
      where: { id: policyId },
      data: { status: 'PENDING_APPROVAL' },
    });

    // Log activity
    await this.activityService.log({
      organizationId,
      entityType: 'POLICY',
      entityId: policyId,
      action: 'submitted_for_approval',
      actionDescription: `Policy "${policy.title}" submitted for approval`,
      actorUserId: userId,
      context: { workflowInstanceId: workflowInstance.id },
    });

    return updatedPolicy;
  }

  async publish(
    policyId: string,
    publishOptions: PublishPolicyDto,
    userId: string,
    organizationId: string,
  ): Promise<PolicyVersion> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });

    // Can publish from APPROVED (workflow complete) or DRAFT (if no workflow required)
    if (!['APPROVED', 'DRAFT'].includes(policy.status)) {
      throw new BadRequestException('Policy must be approved or in draft to publish');
    }

    return this.prisma.$transaction(async (tx) => {
      // Mark previous versions as not latest
      await tx.policyVersion.updateMany({
        where: { policyId, isLatest: true },
        data: { isLatest: false },
      });

      // Create new version
      const newVersion = policy.currentVersion + 1;
      const plainText = this.extractPlainText(policy.draftContent);

      const policyVersion = await tx.policyVersion.create({
        data: {
          organizationId,
          policyId,
          version: newVersion,
          versionLabel: publishOptions.versionLabel || `v${newVersion}`,
          content: policy.draftContent,
          plainText,
          summary: publishOptions.summary,
          changeNotes: publishOptions.changeNotes,
          publishedAt: new Date(),
          publishedById: userId,
          effectiveDate: publishOptions.effectiveDate || new Date(),
          isLatest: true,
        },
      });

      // Update policy
      await tx.policy.update({
        where: { id: policyId },
        data: {
          status: 'PUBLISHED',
          currentVersion: newVersion,
          effectiveDate: publishOptions.effectiveDate || new Date(),
          draftContent: null,  // Clear draft
          draftUpdatedAt: null,
          draftUpdatedById: null,
        },
      });

      // Index in Elasticsearch
      this.eventEmitter.emit('policy.published', {
        policyId,
        policyVersionId: policyVersion.id,
        organizationId,
      });

      return policyVersion;
    });
  }
}
```

### Pattern 4: Attestation Campaign Integration

**What:** Attestation campaigns use the existing Campaign infrastructure with `type: ATTESTATION` and link to a specific PolicyVersion.

**When to use:** Distributing policies to employees for acknowledgment.

**Example:**
```typescript
// Extension to existing Campaign model (add fields)
// In schema.prisma - extend Campaign for attestation

model Campaign {
  // ...existing fields...

  // Policy attestation specific (when type = ATTESTATION)
  policyId          String?   @map("policy_id")
  policyVersionId   String?   @map("policy_version_id")

  // Attestation configuration
  attestationType   AttestationType?   @map("attestation_type")  // CHECKBOX, SIGNATURE, QUIZ
  quizId            String?   @map("quiz_id")
  quizPassingScore  Int?      @map("quiz_passing_score")
  quizMaxAttempts   Int?      @default(3) @map("quiz_max_attempts")

  // Relations
  policy            Policy?        @relation(fields: [policyId], references: [id])
  policyVersion     PolicyVersion? @relation("PolicyVersionCampaigns", fields: [policyVersionId], references: [id])
}

enum AttestationType {
  CHECKBOX    // Simple acknowledge checkbox
  SIGNATURE   // Electronic signature capture
  QUIZ        // Must pass quiz to attest

  @@map("attestation_type")
}
```

**Campaign creation for attestation:**
```typescript
// apps/backend/src/modules/campaigns/attestation/attestation-campaign.service.ts

@Injectable()
export class AttestationCampaignService {
  constructor(
    private prisma: PrismaService,
    private campaignService: CampaignsService,
    private notificationService: NotificationService,
  ) {}

  async createAttestationCampaign(
    dto: CreateAttestationCampaignDto,
    userId: string,
    organizationId: string,
  ): Promise<Campaign> {
    // Validate policy version exists and is published
    const policyVersion = await this.prisma.policyVersion.findUnique({
      where: { id: dto.policyVersionId },
      include: { policy: true },
    });

    if (!policyVersion) {
      throw new NotFoundException('Policy version not found');
    }

    // Create campaign using existing infrastructure
    return this.campaignService.create({
      name: dto.name || `${policyVersion.policy.title} Attestation`,
      description: dto.description,
      type: 'ATTESTATION',
      audienceMode: dto.audienceMode || 'SEGMENT',
      segmentId: dto.segmentId,
      manualIds: dto.manualIds,
      dueDate: dto.dueDate,
      reminderDays: dto.reminderDays || [7, 3, 1],
      // Attestation-specific fields
      policyId: policyVersion.policyId,
      policyVersionId: dto.policyVersionId,
      attestationType: dto.attestationType || 'CHECKBOX',
      quizId: dto.quizId,
      quizPassingScore: dto.quizPassingScore,
      // Auto-case rules for non-compliance
      autoCreateCase: dto.autoCreateCase || false,
      caseCreationThreshold: dto.caseCreationThreshold,
    }, userId, organizationId);
  }
}
```

### Pattern 5: Policy-to-Case Linking

**What:** Association entity connecting policies (specific versions) to Cases, enabling violation tracking.

**When to use:** When a Case involves a policy violation.

**Example:**
```typescript
// Prisma schema - PolicyCaseAssociation
model PolicyCaseAssociation {
  id              String @id @default(uuid())
  organizationId  String @map("organization_id")
  policyId        String @map("policy_id")
  policyVersionId String @map("policy_version_id")
  caseId          String @map("case_id")

  // Link type
  linkType        PolicyCaseLinkType @map("link_type")

  // Context
  linkReason      String?   @map("link_reason")  // Why this policy is relevant
  violationDate   DateTime? @map("violation_date")  // When the violation occurred

  // Audit
  createdAt       DateTime  @default(now()) @map("created_at")
  createdById     String    @map("created_by_id")

  // Relations
  organization    Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  policy          Policy        @relation(fields: [policyId], references: [id])
  policyVersion   PolicyVersion @relation(fields: [policyVersionId], references: [id])
  case            Case          @relation(fields: [caseId], references: [id], onDelete: Cascade)
  createdBy       User          @relation(fields: [createdById], references: [id])

  @@unique([policyId, caseId])  // One link per policy-case pair
  @@index([organizationId])
  @@index([organizationId, policyId])
  @@index([organizationId, caseId])
  @@map("policy_case_associations")
}

enum PolicyCaseLinkType {
  VIOLATION   // Case involves violation of this policy
  REFERENCE   // Policy referenced in case (not violated)
  GOVERNING   // Policy governs how this type of case is handled

  @@map("policy_case_link_type")
}
```

### Pattern 6: Policy Search Indexing

**What:** Elasticsearch index for policies following the per-tenant pattern from Phase 1.

**When to use:** Full-text search across policy content.

**Example:**
```typescript
// apps/backend/src/modules/search/indexing/index-mappings/policy.mapping.ts

export const POLICY_INDEX_MAPPING = {
  mappings: {
    properties: {
      // Core fields
      id: { type: 'keyword' },
      organizationId: { type: 'keyword' },
      title: {
        type: 'text',
        analyzer: 'compliance_analyzer',
        fields: { keyword: { type: 'keyword' } },
      },
      slug: { type: 'keyword' },
      policyType: { type: 'keyword' },
      category: { type: 'keyword' },
      status: { type: 'keyword' },

      // Content (searchable)
      content: {
        type: 'text',
        analyzer: 'compliance_analyzer',
      },
      plainText: {
        type: 'text',
        analyzer: 'compliance_analyzer',
      },
      summary: {
        type: 'text',
        analyzer: 'compliance_analyzer',
      },

      // Version info
      currentVersion: { type: 'integer' },
      versionLabel: { type: 'keyword' },

      // Dates
      effectiveDate: { type: 'date' },
      reviewDate: { type: 'date' },
      publishedAt: { type: 'date' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },

      // Owner
      ownerId: { type: 'keyword' },
      ownerName: { type: 'text', fields: { keyword: { type: 'keyword' } } },

      // Translations available
      translationLanguages: { type: 'keyword' },  // Array of language codes

      // Denormalized for faceting
      hasActiveAttestationCampaign: { type: 'boolean' },
      linkedCaseCount: { type: 'integer' },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        compliance_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'compliance_synonyms', 'english_stemmer'],
        },
      },
      filter: {
        compliance_synonyms: {
          type: 'synonym',
          synonyms: [
            'policy,procedure,guideline',
            'conduct,behavior,behaviour',
            'harassment,bullying,discrimination',
            'bribery,corruption,kickback',
            'privacy,confidentiality,data protection',
          ],
        },
        english_stemmer: {
          type: 'stemmer',
          language: 'english',
        },
      },
    },
  },
};
```

### Anti-Patterns to Avoid

- **Mutable published content:** NEVER modify PolicyVersion content after publishing. Create a new version instead.

- **Separate Policy table from workflow:** Don't create a custom approval system. Use existing WorkflowTemplate/WorkflowInstance with `entityType: POLICY`.

- **Separate campaign type for attestations:** Don't create a new entity for attestation campaigns. Extend existing Campaign with attestation-specific fields.

- **Storing translations inline:** Don't store translations as JSON on PolicyVersion. Separate table enables indexing, status tracking, and efficient queries.

- **Plain-text extraction at query time:** Extract and store plainText at publish time, not during search. Expensive HTML parsing on every query hurts performance.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich text editing | Custom editor | Tiptap (already implemented in rich-text-editor.tsx) | Already configured with draft persistence |
| Approval workflows | Custom state machine | WorkflowEngineService (Phase 1) | Supports versioning, parallel steps, escalation |
| AI translation | Custom LLM calls | translate skill (Phase 5-08) | Already handles formatting, language detection |
| Campaign targeting | Custom employee filtering | SegmentQueryBuilder (Phase 4) | Handles nested AND/OR, tested |
| Notifications | Custom email sending | NotificationService (Phase 7) | Templates, preferences, delivery tracking |
| Full-text search | Custom SQL LIKE | IndexingService + SearchService (Phase 1) | Per-tenant indices, permission filtering |
| Version diff display | Custom diffing | diff library (already in package.json) | Handles HTML diff rendering |

**Key insight:** Phase 10 is primarily about orchestrating existing infrastructure for policy-specific workflows, not building new foundational components.

## Common Pitfalls

### Pitfall 1: Version Confusion During Edit

**What goes wrong:** User edits a policy, expecting to modify the published version, but creates a new draft.

**Why it happens:** UI doesn't clearly distinguish draft from published state.

**How to avoid:**
- Clear visual indication of draft vs. published state
- Show version number prominently: "Editing Draft (based on v2)"
- Require explicit "Create New Draft" action if editing published policy

**Warning signs:** Users asking "where did my changes go?"

### Pitfall 2: Translation Staleness

**What goes wrong:** Source policy is updated but translations aren't marked stale.

**Why it happens:** No event listener updating translation status on new version publish.

**How to avoid:**
- On policy.published event, mark all translations for that policy as `isStale: true`
- Show stale indicator in UI with option to re-translate

**Warning signs:** Employees reading outdated translations.

### Pitfall 3: Attestation Campaign Linked to Wrong Version

**What goes wrong:** Campaign links to policy (not specific version), so employees attest to wrong content.

**Why it happens:** Using policyId instead of policyVersionId.

**How to avoid:**
- ALWAYS link attestation campaigns to `policyVersionId`, not just `policyId`
- Validate version is published before campaign launch
- Lock version on campaign - if policy is updated, campaign still refers to original version

**Warning signs:** Compliance audit finds employees attested to different content than expected.

### Pitfall 4: Workflow State Desync

**What goes wrong:** Policy status says "PENDING_APPROVAL" but workflow instance was completed or cancelled.

**Why it happens:** Not listening to workflow events to update policy status.

**How to avoid:**
- Event handler for workflow.completed updates policy status to APPROVED
- Event handler for workflow.cancelled updates policy status back to DRAFT

**Warning signs:** "Stuck" policies in approval that can't be published.

### Pitfall 5: Missing Permission Check on Case Linking

**What goes wrong:** Users can link policies to cases they shouldn't see.

**Why it happens:** Policy-case link endpoint doesn't verify user has access to BOTH entities.

**How to avoid:**
- Verify user permission on policy (read access)
- Verify user permission on case (update access - they're modifying case)
- Use existing RLS + guards pattern

**Warning signs:** Security audit finds cross-tenant data in associations.

### Pitfall 6: Search Index Not Updated on Translation

**What goes wrong:** Searching in Spanish doesn't find translated policies.

**Why it happens:** Only indexing the original English content.

**How to avoid:**
- Index translations separately OR
- Aggregate all translations into searchable fields on publish
- Include `translationLanguages` field for filtering

**Warning signs:** International users can't find policies in their language.

## Code Examples

### Policy Service Core Operations

```typescript
// apps/backend/src/modules/policies/policies.service.ts

@Injectable()
export class PoliciesService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreatePolicyDto,
    userId: string,
    organizationId: string,
  ): Promise<Policy> {
    const slug = this.generateSlug(dto.title);

    const policy = await this.prisma.policy.create({
      data: {
        organizationId,
        title: dto.title,
        slug,
        policyType: dto.policyType,
        category: dto.category,
        ownerId: dto.ownerId || userId,
        draftContent: dto.content || '',
        draftUpdatedAt: new Date(),
        draftUpdatedById: userId,
        createdById: userId,
      },
    });

    await this.activityService.log({
      organizationId,
      entityType: 'POLICY',
      entityId: policy.id,
      action: 'created',
      actionDescription: `Policy "${policy.title}" created as draft`,
      actorUserId: userId,
    });

    return policy;
  }

  async updateDraft(
    policyId: string,
    dto: UpdatePolicyDto,
    userId: string,
    organizationId: string,
  ): Promise<Policy> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy || policy.organizationId !== organizationId) {
      throw new NotFoundException('Policy not found');
    }

    // Can only update draft if not in approval workflow
    if (policy.status === 'PENDING_APPROVAL') {
      throw new BadRequestException('Cannot edit policy while in approval workflow');
    }

    // If policy is published and has no draft, copy content to draft
    if (policy.status === 'PUBLISHED' && !policy.draftContent) {
      const latestVersion = await this.prisma.policyVersion.findFirst({
        where: { policyId, isLatest: true },
      });
      policy.draftContent = latestVersion?.content || '';
    }

    return this.prisma.policy.update({
      where: { id: policyId },
      data: {
        title: dto.title ?? policy.title,
        policyType: dto.policyType ?? policy.policyType,
        category: dto.category ?? policy.category,
        draftContent: dto.content ?? policy.draftContent,
        draftUpdatedAt: new Date(),
        draftUpdatedById: userId,
      },
    });
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);
  }

  private extractPlainText(html: string): string {
    // Use html-to-text library or simple regex
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
```

### Attestation Response Handler

```typescript
// apps/backend/src/modules/campaigns/attestation/attestation-response.service.ts

@Injectable()
export class AttestationResponseService {
  constructor(
    private prisma: PrismaService,
    private riuService: RiusService,
    private campaignAssignmentService: CampaignAssignmentService,
    private eventEmitter: EventEmitter2,
  ) {}

  async submitAttestation(
    assignmentId: string,
    dto: SubmitAttestationDto,
    employeeId: string,
    organizationId: string,
  ): Promise<{ riu: Riu; assignment: CampaignAssignment }> {
    const assignment = await this.prisma.campaignAssignment.findUnique({
      where: { id: assignmentId },
      include: { campaign: { include: { policyVersion: true } } },
    });

    if (!assignment || assignment.organizationId !== organizationId) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.status === 'COMPLETED') {
      throw new BadRequestException('Assignment already completed');
    }

    // Determine attestation result
    let result: 'ATTESTED' | 'REFUSED' | 'QUIZ_FAILED' = 'ATTESTED';
    if (dto.refused) {
      result = 'REFUSED';
    } else if (assignment.campaign.attestationType === 'QUIZ' && !dto.quizPassed) {
      result = 'QUIZ_FAILED';
    }

    // Create RIU (immutable attestation record)
    const riu = await this.riuService.create({
      type: 'ATTESTATION_RESPONSE',
      sourceChannel: 'POLICY_ATTESTATION',
      reporterEmployeeId: employeeId,
      // Extension fields
      campaignAssignmentId: assignmentId,
      policyId: assignment.campaign.policyId,
      policyVersionId: assignment.campaign.policyVersionId,
      attestationType: assignment.campaign.attestationType,
      attestationResult: result,
      acknowledgedAt: new Date(),
      quizData: dto.quizData,
      signatureData: dto.signatureData,
      refusalData: dto.refusalData,
    }, organizationId);

    // Update assignment
    const updatedAssignment = await this.campaignAssignmentService.complete(
      assignmentId,
      riu.id,
      organizationId,
    );

    // Check for auto-case creation
    if (result !== 'ATTESTED' && assignment.campaign.autoCreateCase) {
      await this.evaluateAutoCaseCreation(assignment.campaign, riu, result);
    }

    return { riu, assignment: updatedAssignment };
  }

  private async evaluateAutoCaseCreation(
    campaign: Campaign,
    riu: Riu,
    result: string,
  ): Promise<void> {
    const rules = campaign.caseCreationThreshold as any;

    let shouldCreateCase = false;
    if (result === 'REFUSED' && rules?.createCaseOnRefusal) {
      shouldCreateCase = true;
    } else if (result === 'QUIZ_FAILED' && rules?.createCaseOnQuizFailure) {
      shouldCreateCase = true;
    }

    if (shouldCreateCase) {
      this.eventEmitter.emit('attestation.case.required', {
        riuId: riu.id,
        campaignId: campaign.id,
        policyId: campaign.policyId,
        reason: result,
      });
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| File check-out for editing | Real-time collaborative editing | 2020-2024 | No locks, multiple editors |
| Manual translation management | AI translation with human review | 2024-2025 | Faster, more languages |
| Separate approval system | Integrated workflow engine | 2024 | Unified audit trail, configurable |
| Annual attestation only | Continuous + triggered campaigns | 2024-2025 | More responsive compliance |
| PDF/Word document storage | Structured content with versioning | 2023-2025 | Better search, diff, translation |

**Current industry trends (2025-2026):**
- AI-assisted policy drafting from regulatory requirements
- Auto-tagging policies to compliance frameworks
- Just-in-time policy delivery (show relevant policy when risk detected)
- Policy effectiveness analytics (violations vs. awareness)
- Integration with LMS for training-policy alignment

**Deprecated/outdated:**
- File-based versioning (check-out/check-in): Replaced by structured content versioning
- Email-only attestation tracking: Replaced by integrated campaign management
- Manual translation workflows: Supplemented by AI with human review

## Open Questions

1. **Real-time Collaborative Editing**
   - What we know: PRD mentions Y.js for collaborative editing
   - What's unclear: Whether v1 requires multi-user simultaneous editing
   - Recommendation: Defer to v2. Single-user editing with draft persistence is sufficient for v1. Add Y.js collaboration in future iteration.

2. **Quiz Engine for Attestations**
   - What we know: PRD mentions quiz-based attestations
   - What's unclear: Whether quiz engine is built in Phase 10 or depends on another module
   - Recommendation: Use simple pass/fail quiz with JSON schema for questions. Full quiz builder can be Phase 11 or future work.

3. **Exception Management**
   - What we know: PRD has extensive exception lifecycle management
   - What's unclear: Priority vs. core policy management
   - Recommendation: Defer PolicyException entity to future iteration. Core versioning, approval, attestation are higher priority.

4. **Regulatory Framework Mapping**
   - What we know: PRD describes mapping policies to GDPR, HIPAA, SOX requirements
   - What's unclear: Whether this is v1 scope
   - Recommendation: Defer to Phase 11 or future. Policy metadata can include framework tags, but full mapping UI is complex.

## Sources

### Primary (HIGH confidence)
- Project Prisma schema - Campaign, WorkflowTemplate, WorkflowInstance models
- Existing services: WorkflowEngineService, CampaignsService, SkillRegistry (translate skill)
- Rich text editor: apps/frontend/src/components/rich-text/rich-text-editor.tsx (Tiptap implementation)
- Indexing infrastructure: apps/backend/src/modules/search/indexing/indexing.service.ts
- Phase 5 05-08-SUMMARY.md - Translation skill documentation

### Secondary (MEDIUM confidence)
- PRD: 02-MODULES/09-POLICY-MANAGEMENT/PRD.md - Feature specifications and data models
- Phase 4 04-RESEARCH.md - Campaign, CampaignAssignment patterns
- Phase 9 09-RESEARCH.md - Disclosure campaign patterns (similar to attestation)

### Tertiary (LOW confidence)
- Industry policy management practices based on PRD competitive analysis
- Document versioning patterns from general software engineering

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project infrastructure
- Architecture (Policy entity): HIGH - Following established version-on-publish pattern
- Architecture (Workflows): HIGH - Using existing WorkflowEngine
- Architecture (Attestations): HIGH - Extending existing Campaign infrastructure
- Architecture (Translations): HIGH - Using existing translate skill
- Architecture (Search): HIGH - Following existing Elasticsearch patterns
- Pitfalls: MEDIUM - Based on compliance domain experience and prior phase patterns

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - stable domain with established infrastructure)
