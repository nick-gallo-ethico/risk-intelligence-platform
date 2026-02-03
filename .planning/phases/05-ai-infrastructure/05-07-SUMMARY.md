---
phase: "05"
plan: "07"
name: "Skill Registry and Platform Skills"
completed: "2026-02-03"
duration: "14 min"
subsystem: "ai"
tags: ["skills", "ai", "note-cleanup", "summarize", "zod"]

dependencies:
  requires: ["05-02", "05-03", "05-04", "05-06"]
  provides: ["skill-registry", "note-cleanup-skill", "summarize-skill"]
  affects: ["05-08", "05-09", "05-10"]

tech-stack:
  added: ["zod"]
  patterns: ["skill-factory", "zod-validation", "rate-limit-integration"]

key-files:
  created:
    - "apps/backend/src/modules/ai/skills/skill.types.ts"
    - "apps/backend/src/modules/ai/skills/skill.registry.ts"
    - "apps/backend/src/modules/ai/skills/index.ts"
    - "apps/backend/src/modules/ai/skills/platform/note-cleanup.skill.ts"
    - "apps/backend/src/modules/ai/skills/platform/summarize.skill.ts"
  modified:
    - "apps/backend/src/modules/ai/ai.module.ts"
    - "apps/backend/src/modules/ai/index.ts"

decisions:
  - id: "05-07-01"
    area: "ai"
    decision: "Skill factory pattern with dependency injection"
    context: "Skills need access to provider registry, rate limiter, and prompt service"
    alternatives: ["Class-based skills", "Singleton skills"]

  - id: "05-07-02"
    area: "validation"
    decision: "zodToJsonSchema helper for Claude tool conversion"
    context: "Skills need to expose input schemas as Claude tools for function calling"
    alternatives: ["zod-to-json-schema library", "manual schema definition"]

  - id: "05-07-03"
    area: "ai"
    decision: "Skills check rate limits before execution and record usage after"
    context: "Per-tenant rate limiting and billing analytics require integration at skill level"
    alternatives: ["Middleware approach", "Provider-level tracking only"]
---

# Phase 5 Plan 7: Skill Registry and Platform Skills Summary

**One-liner:** Skill registry with note-cleanup and summarize skills using Zod validation, rate limiting, and usage analytics.

## What Was Built

### Skill Infrastructure

Created a complete skill system enabling reusable AI capabilities:

1. **Skill Types (`skill.types.ts`)**
   - `SkillScope` enum: PLATFORM, ORG, TEAM, USER for visibility control
   - `SkillContext` interface: organizationId, userId, entityType, entityId, permissions
   - `SkillResult` interface: success/error with metadata (tokens, duration, model)
   - `SkillDefinition` interface: id, name, description, scope, permissions, inputSchema, execute
   - `zodToJsonSchema` helper: Converts Zod schemas to JSON Schema for Claude tools

2. **Skill Registry (`skill.registry.ts`)**
   - `registerSkill()`: Register skills at runtime
   - `getSkill()`: Lookup by ID
   - `getAvailableSkills()`: Filter by scope, entity type, and permissions
   - `executeSkill()`: Validate input, check permissions, run skill
   - `toClaudeTools()`: Convert skills to Claude tool format
   - `listSkills()`: Get all registered skill IDs

### Platform Skills

Implemented two foundational AI skills per CONTEXT.md:

1. **Note Cleanup Skill**
   - Input: content (1-50K chars), style (light/full), optional context
   - Light style: Preserves voice, fixes grammar and clarity
   - Full style: Complete rewrite into formal prose
   - Output: cleanedContent, changes breakdown, length comparison
   - Respects rate limits and records usage for billing

2. **Summarize Skill**
   - Input: content (1-100K chars), style (brief/comprehensive), entityType, additionalContext
   - Brief style: 1-2 paragraphs (512 max tokens)
   - Comprehensive style: Structured sections (2048 max tokens)
   - Output: summary, wordCount, keyPoints (comprehensive), confidence (if < 0.8)
   - Includes confidence scoring based on compression ratio and term overlap

### Module Integration

- SkillRegistry registered as provider in AiModule
- SkillRegistry exported from AiModule for use by other modules
- Skills exported from ai/index.ts for external imports

## Verification Checklist

- [x] `npm run build` passes without errors
- [x] SkillRegistry has note-cleanup and summarize skills registered
- [x] Skills validate input with Zod schemas
- [x] Skills check rate limits before AI calls
- [x] Skills record usage after successful execution

## Key Implementation Details

### Skill Factory Pattern

```typescript
export function noteCleanupSkill(
  providerRegistry: ProviderRegistryService,
  rateLimiter: AiRateLimiterService,
  promptService: PromptService,
): SkillDefinition<NoteCleanupInput, NoteCleanupOutput> {
  return {
    id: "note-cleanup",
    // ... skill definition
    async execute(input, context) {
      // Check rate limit
      const rateLimitResult = await rateLimiter.checkAndConsume({...});
      if (!rateLimitResult.allowed) return error;

      // Execute AI call
      const response = await provider.createMessage({...});

      // Record usage
      await rateLimiter.recordUsage({...});

      return { success: true, data: {...} };
    },
  };
}
```

### Permission Model

Skills declare required permissions in their definition:
- `ai:skills:note-cleanup` for note cleanup
- `ai:skills:summarize` for summarization

The registry checks these against the user's permissions before execution.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed zodToJsonSchema type errors for Zod 4.x**
- **Found during:** Task 1 build verification
- **Issue:** Zod 4.x has different internal type definitions than Zod 3.x
- **Fix:** Used `any` type casting with eslint-disable comments for internal _def access
- **Files modified:** apps/backend/src/modules/ai/skills/skill.types.ts
- **Commit:** 37f0721

## Files Changed

| File | Action | Lines | Purpose |
|------|--------|-------|---------|
| `skills/skill.types.ts` | Created | 184 | Skill type definitions and zodToJsonSchema helper |
| `skills/skill.registry.ts` | Created | 277 | Skill registration, lookup, and execution |
| `skills/index.ts` | Created | 4 | Barrel exports |
| `skills/platform/note-cleanup.skill.ts` | Created | 208 | Note cleanup skill implementation |
| `skills/platform/summarize.skill.ts` | Created | 253 | Summarize skill implementation |

## Commits

| Hash | Message |
|------|---------|
| 37f0721 | feat(05-07): add skill registry and skill type infrastructure |

## Next Phase Readiness

All dependent plans can proceed:
- **05-08**: Can add additional platform skills (risk-score, translate, category-suggest)
- **05-09**: Can use SkillRegistry for agent skill access
- **05-10**: Can build AI panel controller using skills

## Performance Metrics

- **Duration:** 14 minutes
- **Build time:** ~5 seconds
- **Files created:** 5
- **Lines of code:** ~926
