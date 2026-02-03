---
phase: 05-ai-infrastructure
plan: 06
subsystem: ai
tags: [context, hierarchy, caching, claude-md]

dependency_graph:
  requires: [05-01, 05-04, 05-05]
  provides: [context-loader-service, ai-context-file-model, context-hierarchy]
  affects: [05-07, 05-08, 05-09, 05-10, 05-11]

tech_stack:
  added:
    - "@nestjs/cache-manager@2"
    - "cache-manager@5"
  patterns:
    - "Hierarchical context assembly"
    - "CLAUDE.md-like context files"
    - "Multi-level caching with TTLs"
    - "Entity-specific context loaders"

key_files:
  created:
    - apps/backend/src/modules/ai/services/context-loader.service.ts
    - apps/backend/src/modules/ai/dto/context.dto.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/ai/ai.module.ts
    - apps/backend/src/modules/ai/dto/index.ts
    - apps/backend/src/modules/ai/index.ts
    - apps/backend/package.json

decisions:
  - key: "context-hierarchy-levels"
    value: "platform -> org -> team -> user -> entity"
    why: "Matches CONTEXT.md requirements for CLAUDE.md-like context files with granular customization"
  - key: "cache-ttls"
    value: "platform: 1hr, org: 5min, user: 5min, entity: 1min"
    why: "Entities change more frequently than org/user settings, balance freshness vs performance"
  - key: "system-prompt-building"
    value: "Built inline without PromptService dependency"
    why: "ContextLoaderService can work independently, PromptService integration can be added later"

metrics:
  duration: 14 min
  completed: 2026-02-03
---

# Phase 5 Plan 6: Context Hierarchy Loading Summary

Hierarchical context assembly from platform/org/team/user/entity levels with CLAUDE.md-like context files and caching.

## What Was Built

### AiContextFile Model
Added Prisma model for storing CLAUDE.md-like context files:
- Supports organization, team, and user scoped context
- Markdown content for brand voice, terminology, custom rules
- Unique constraint on org+user+name for easy lookup
- Indexed for efficient retrieval by scope and active status

### Context DTOs
Created comprehensive type definitions:
- `ContextScope` enum: PLATFORM, ORG, TEAM, USER, ENTITY
- `PlatformContext`: Static capabilities and guidelines
- `OrganizationContext`: Org settings, terminology, categories, context file
- `TeamContext`: Team-specific focus and context file
- `UserContext`: User preferences and personal context file
- `EntityContext`: Dynamic entity data (case/investigation/campaign)
- `AIContext`: Complete assembled context for AI calls
- `LoadContextDto` and `SaveContextFileDto` for service APIs

### ContextLoaderService (619 lines)
Complete hierarchical context loading with:

**Context Loading:**
- `loadContext()` - Parallel loading from all hierarchy levels
- Platform context loaded once at module init
- Entity-specific loaders for case, investigation, campaign

**System Prompt Building:**
- `buildSystemPrompt()` - Assembles context into system prompt
- Agent-type specific instructions (investigation, case, compliance-manager, campaign)
- Formats org settings, terminology, entity details

**Context File Management:**
- `saveContextFile()` - Create/update CLAUDE.md-like files
- `getContextFile()` - Retrieve for editing
- `listContextFiles()` - List by scope/org/team/user
- `deleteContextFile()` - Soft delete (sets isActive=false)

**Caching:**
- Uses @nestjs/cache-manager with different TTLs per level
- `invalidateCache()` - Manual cache invalidation
- Cache keys: `ai:context:{level}:{id}`

## Technical Decisions

1. **Cache TTLs by Level**: Platform (1hr), Org/Team (5min), User (5min), Entity (1min). Entities change more frequently during active work.

2. **Inline System Prompt Building**: Built system prompt assembly directly in ContextLoaderService rather than depending on PromptService. This allows the service to work independently.

3. **Entity Context Loaders**: Separate methods for case, investigation, campaign to handle different data models. Each extracts relevant context fields.

4. **Null to Undefined Conversion**: Category paths converted from null to undefined to match DTO interface types.

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `services/context-loader.service.ts` | Hierarchical context assembly | 619 |
| `dto/context.dto.ts` | Context type definitions | 156 |
| `prisma/schema.prisma` | AiContextFile model | +33 |

## Commits

| Hash | Message |
|------|---------|
| `6f376ec` | feat(05-06): add AiContextFile model for context hierarchy |
| `9e3afa8` | feat(05-06): add context DTOs for hierarchy loading |
| `2b85d7d` | feat(05-06): add ContextLoaderService for hierarchical context |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] cache-manager dependency conflict**
- **Found during:** Task 3
- **Issue:** @nestjs/cache-manager@3 required cache-manager@6, conflicting with existing cache-manager@3 from passport-azure-ad
- **Fix:** Used @nestjs/cache-manager@2 with cache-manager@5 and --legacy-peer-deps
- **Files modified:** package.json, package-lock.json

**2. [Rule 1 - Bug] Type incompatibility for category path**
- **Found during:** Task 3 build
- **Issue:** Prisma returns `path: string | null` but DTO expects `path?: string`
- **Fix:** Added `.then()` transform to convert null to undefined
- **Files modified:** context-loader.service.ts

## Usage Example

```typescript
// Load complete context for AI call
const context = await contextLoaderService.loadContext({
  organizationId: 'org-123',
  userId: 'user-456',
  teamId: 'team-789', // optional
  entityType: 'investigation',
  entityId: 'inv-001',
});

// Build system prompt for agent
const systemPrompt = await contextLoaderService.buildSystemPrompt(
  context,
  'investigation',
);

// Use with AiClientService
const response = await aiClientService.createChat({
  organizationId: context.organization.id,
  systemPrompt,
  message: 'Summarize this investigation',
});
```

## Next Phase Readiness

**Required for 05-07 (Skills Registry):**
- ContextLoaderService provides context for skill execution
- Agent type instructions can be enhanced with skill-specific prompts

**Required for 05-08 (Action Catalog):**
- Entity context used for action targeting (which case/investigation)
- User context determines permissions for actions

**Dependencies satisfied:**
- Context hierarchy ready for all AI features
- Caching prevents repeated database queries
- System prompt building ready for agent use
