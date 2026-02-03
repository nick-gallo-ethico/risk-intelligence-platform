---
phase: 05-ai-infrastructure
plan: 04
subsystem: ai
status: complete
tags: [handlebars, templates, prompts, versioning, ai]

dependency_graph:
  requires: ["05-01"]
  provides: ["PromptService", "PromptTemplate model", "Handlebars templates"]
  affects: ["05-07", "05-08", "05-09"]

tech_stack:
  added: ["handlebars"]
  patterns: ["Template rendering", "Version history", "Organization overrides"]

key_files:
  created:
    - apps/backend/src/modules/ai/services/prompt.service.ts
    - apps/backend/src/modules/ai/prompts/templates/system/base.hbs
    - apps/backend/src/modules/ai/prompts/templates/system/investigation-agent.hbs
    - apps/backend/src/modules/ai/prompts/templates/system/case-agent.hbs
    - apps/backend/src/modules/ai/prompts/templates/skills/summarize.hbs
    - apps/backend/src/modules/ai/prompts/templates/skills/note-cleanup.hbs
    - apps/backend/prisma/migrations/20260203192733_add_prompt_template/migration.sql
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/package.json

decisions:
  - decision: "Templates loaded from filesystem at startup, database overrides for orgs"
    rationale: "Default templates in code for version control, org customization via DB"
  - decision: "Register all templates as Handlebars partials"
    rationale: "Enables template composition via {{> system/base}} syntax"
  - decision: "Versioned templates with isActive flag"
    rationale: "Supports A/B testing, rollback, and audit trail"

metrics:
  duration: "18 min"
  completed: "2026-02-03"
---

# Phase 5 Plan 4: Prompt Template Management Summary

Versioned prompt templates using Handlebars for variable injection, enabling prompt iteration without code changes and organization-specific customization.

## Key Deliverables

### PromptService (451 lines)
- **Template loading**: Recursively loads `.hbs` files from `prompts/templates/` at startup
- **Database overrides**: Organization-specific templates stored in `prompt_templates` table
- **Version history**: Each save creates new version, deactivates previous
- **Rollback capability**: `revertToVersion()` reactivates any historical version
- **Handlebars helpers**: `eq`, `neq`, `gt`, `lt`, `and`, `or`, `json`, `formatDate`, `truncate`, `upper`, `lower`, `capitalize`, `default`, `length`, `join`

### Template Hierarchy
```
prompts/templates/
├── system/
│   ├── base.hbs              # Core system prompt with org context
│   ├── investigation-agent.hbs  # Extends base, investigation context
│   └── case-agent.hbs        # Extends base, case context
└── skills/
    ├── summarize.hbs         # Brief/comprehensive summary styles
    └── note-cleanup.hbs      # Light/full rewrite styles
```

### Prisma Model
```prisma
model PromptTemplate {
  id             String   @id @default(uuid())
  organizationId String?  // null = platform default
  name           String   // 'system/investigation-agent'
  version        Int      @default(1)
  content        String   @db.Text
  description    String?
  isActive       Boolean  @default(true)
  variables      Json?    // Expected variable schema

  @@unique([organizationId, name, version])
  @@index([organizationId, name, isActive])
}
```

## API Surface

```typescript
// Render template with context
await promptService.render('system/investigation-agent', {
  org: { name: 'Acme Corp' },
  user: { name: 'John', role: 'Investigator' },
  entity: { referenceNumber: 'INV-2026-0001', status: 'Open' }
}, organizationId);

// Get raw template
const { content, source, version } = await promptService.getTemplate('skills/summarize', orgId);

// Save custom version
const { id, version } = await promptService.saveTemplate({
  organizationId,
  name: 'system/base',
  content: customTemplate,
  description: 'Custom base prompt for Acme'
});

// Revert to previous
await promptService.revertToVersion('system/base', orgId, 2);

// List available
const templates = promptService.listTemplates();
// ['system/base', 'system/investigation-agent', 'system/case-agent', ...]
```

## Template Features

### Variable Injection
```handlebars
{{#if org}}
Organization: {{org.name}}
{{/if}}
Current date: {{currentDateTime}}
User: {{user.name}} ({{user.role}})
```

### Template Composition
```handlebars
{{!-- investigation-agent.hbs --}}
{{> system/base}}

## Investigation Agent Mode
You are assisting with Investigation #{{entity.referenceNumber}}.
```

### Conditional Content
```handlebars
{{#if (eq style "brief")}}
Provide a 1-2 paragraph summary.
{{else}}
Provide a comprehensive summary with sections.
{{/if}}
```

## Commits

| Hash | Description |
|------|-------------|
| d9bbe86 | Add Handlebars and PromptTemplate model |
| fbbc6bd | Create Handlebars prompt templates |
| 835681b | Add PromptService with template rendering |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] `npm run build` passes
- [x] `npx prisma migrate status` shows all migrations applied
- [x] PromptTemplate model exists in schema
- [x] Template files exist in prompts/templates directory
- [x] PromptService exported from AI module
- [x] Handlebars helpers registered

## Next Phase Readiness

**Dependencies provided for:**
- 05-07 (AI Summarization): Can use `skills/summarize` template
- 05-08 (Note Cleanup): Can use `skills/note-cleanup` template
- 05-09 (Categorization): Base infrastructure ready

**Integration notes:**
- PromptService injected via `AiModule` exports
- Templates auto-loaded on module initialization
- Organization context injected via `org` variable in all templates
