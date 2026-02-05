---
phase: 10
plan: 05
subsystem: policy-translation
tags: [ai, translation, policy, multi-language]
depends_on:
  requires: [10-02]
  provides: [PolicyTranslationService, TranslationStaleListener]
  affects: [notifications, attestation-campaigns]
tech-stack:
  added: []
  patterns: [skill-registry, event-driven-staleness]
key-files:
  created:
    - apps/backend/src/modules/policies/translations/dto/translation.dto.ts
    - apps/backend/src/modules/policies/translations/dto/index.ts
    - apps/backend/src/modules/policies/translations/policy-translation.service.ts
    - apps/backend/src/modules/policies/translations/policy-translation.controller.ts
    - apps/backend/src/modules/policies/translations/index.ts
    - apps/backend/src/modules/policies/listeners/translation-stale.listener.ts
  modified:
    - apps/backend/src/modules/policies/listeners/index.ts
    - apps/backend/src/modules/policies/policies.module.ts
decisions:
  - title: AI translation via existing skill
    context: Needed AI translation for policies
    decision: Use SkillRegistry.executeSkill('translate', ...) from Phase 5
    rationale: Reuse existing infrastructure, consistent rate limiting, usage tracking
  - title: Staleness on previous version
    context: When new version publishes, translations become stale
    decision: Mark previous version's translations, not create new stale records
    rationale: Translations are version-specific, keeps data clean
  - title: Review workflow states
    context: Needed review process for translations
    decision: PENDING_REVIEW -> APPROVED/NEEDS_REVISION -> PUBLISHED
    rationale: Matches policy workflow pattern, clear progression
metrics:
  duration: 16 min
  completed: 2026-02-05
---

# Phase 10 Plan 05: Policy Translation Summary

AI-powered policy translation via existing translate skill with staleness tracking on version publish.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create translation DTOs and PolicyTranslationService | 6829274 | translations/dto/translation.dto.ts, policy-translation.service.ts |
| 2 | Create translation staleness listener | d174a1d | listeners/translation-stale.listener.ts |
| 3 | Create translation controller and update module | 3033fa3 | policy-translation.controller.ts, policies.module.ts |

## What Was Built

### PolicyTranslationService

Core translation management with AI integration:

```typescript
// AI translation using existing skill
const contentResult = await this.skillRegistry.executeSkill(
  "translate",
  {
    content: policyVersion.content,
    targetLanguage: dto.languageCode,
    preserveFormatting: true,
  },
  skillContext,
);
```

**Methods:**
- `translate()` - Create AI or manual translation for policy version
- `updateTranslation()` - Edit translation (converts AI to HUMAN source)
- `reviewTranslation()` - Change review status (PENDING/APPROVED/NEEDS_REVISION/PUBLISHED)
- `refreshStaleTranslation()` - Re-translate stale content with AI
- `findByVersion()` - Get all translations for a version
- `findStale()` - Get all stale translations org-wide
- `getAvailableLanguages()` - Return supported languages

**Supported Languages (13):**
- en, es, fr, de, zh, ja, ko, pt, it, nl, ru, ar, hi

### TranslationStaleListener

Event-driven staleness marking on policy publish:

```typescript
@OnEvent(PolicyPublishedEvent.eventName, { async: true })
async onPolicyPublished(event: PolicyPublishedEvent): Promise<void> {
  // Only mark stale if there IS a previous version
  if (newVersion.version <= 1) return;

  // Mark previous version translations as stale
  await this.prisma.policyVersionTranslation.updateMany({
    where: {
      policyVersionId: previousVersion.id,
      isStale: false,
    },
    data: { isStale: true },
  });

  // Emit event for notification integration
  this.eventEmitter.emit('translations.marked_stale', ...);
}
```

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /versions/:versionId/translations | Create AI or manual translation |
| GET | /versions/:versionId/translations | Get all translations for version |
| PUT | /translations/:id | Update translation content |
| POST | /translations/:id/review | Change review status |
| POST | /translations/:id/refresh | Re-translate stale content |
| GET | /translations/stale | Get all stale translations |
| GET | /translations/languages | Get available languages |

### Module Integration

PoliciesModule now imports AiModule for SkillRegistry access:

```typescript
@Module({
  imports: [
    PrismaModule,
    ActivityModule,
    WorkflowModule,
    AiModule, // For SkillRegistry (translation skill)
  ],
  // ...
})
```

## Decisions Made

### AI Translation via Existing Skill
Used Phase 5's translate skill via SkillRegistry rather than direct LLM calls. This provides:
- Consistent rate limiting
- Usage tracking
- Token counting
- Error handling

### Staleness on Previous Version
When a new policy version is published, we mark the *previous version's* translations as stale. We don't create new translation records for the new version - translators must explicitly create/refresh translations.

### Review Workflow
Four states for translation review:
1. **PENDING_REVIEW** - Initial state after AI or manual creation
2. **APPROVED** - Reviewer verified translation accuracy
3. **NEEDS_REVISION** - Reviewer found issues
4. **PUBLISHED** - Translation is live for distribution

### Human Edit Tracking
When a human edits an AI translation:
- `translatedBy` changes from `AI` to `HUMAN`
- `isStale` resets to `false` (human verified current)

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

### Translation vs PolicyVersion Relationship
- Translations are linked to specific PolicyVersion (immutable)
- When source policy updates, old translations become stale
- New version requires new translations (not auto-migrated)

### Side-by-Side Editing
The design supports side-by-side editing:
- Original content accessible via policyVersion relation
- Translation content editable via updateTranslation()
- Review status tracks human verification

### Events Emitted
- `policy.translation.created` - When translation created
- `policy.translation.reviewed` - When review status changed
- `translations.marked_stale` - When publish marks translations stale

## Next Phase Readiness

**Ready for:**
- Plan 10-06 (if any): Full translation capability available
- Notification integration: Events emitted for staleness alerts
- Attestation campaigns: Translations available for multi-language distribution

**Dependencies satisfied:**
- SkillRegistry from AiModule
- PolicyVersion from 10-02
- Event system from Phase 1
