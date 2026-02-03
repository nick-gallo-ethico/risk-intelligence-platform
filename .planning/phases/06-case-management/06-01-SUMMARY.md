---
phase: 06-case-management
plan: 01
subsystem: investigations
tags: [templates, checklists, versioning, json-schema, prisma, nestjs]
status: complete

dependency_graph:
  requires: []
  provides: [investigation-template-model, template-service, template-controller]
  affects: [06-07-investigation-checklist-progress]

tech_stack:
  added: []
  patterns: [version-on-publish, json-schema-sections, template-tiers]

key_files:
  created:
    - apps/backend/src/modules/investigations/templates/template.service.ts
    - apps/backend/src/modules/investigations/templates/template.controller.ts
    - apps/backend/src/modules/investigations/templates/dto/template.dto.ts
    - apps/backend/src/modules/investigations/templates/index.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/investigations/investigations.module.ts

decisions:
  - id: TEMPLATE-01
    summary: "InvestigationTemplate model uses JSON sections field for checklist schema"
    rationale: "Flexible structure for sections/items without separate tables"
  - id: TEMPLATE-02
    summary: "TemplateTier enum (OFFICIAL, TEAM, PERSONAL) controls template visibility"
    rationale: "Matches tiered access pattern from workflow templates"
  - id: TEMPLATE-03
    summary: "Version-on-publish pattern preserves in-flight checklists"
    rationale: "Existing investigations continue on original template version"

metrics:
  duration: 44 min
  completed: 2026-02-03
---

# Phase 6 Plan 1: Investigation Templates Summary

InvestigationTemplate Prisma model and NestJS service/controller for defining reusable investigation checklists with sections, items, conditional rules, and versioning.

## What Was Built

### 1. Prisma Schema Additions

**TemplateTier enum:**
- `OFFICIAL`: Admin-created, org-wide templates
- `TEAM`: Shared with specific team
- `PERSONAL`: Creator-only, typically saved from cases

**InvestigationTemplate model:**
- Identity: name, description, categoryId binding
- Tier: tier, createdById, sharedWithTeamId
- Versioning: version, isActive, isArchived, isDefault
- Schema: sections JSON, suggestedDurations, conditionalRules
- Import/export: isSystemTemplate, sourceTemplateId
- Analytics: usageCount

### 2. TypeScript Interfaces (template.dto.ts)

**ChecklistItem:**
```typescript
interface ChecklistItem {
  id: string;
  text: string;
  order: number;
  required: boolean;
  evidenceRequired: boolean;
  guidance?: string;
  dependencies?: string[];
}
```

**ChecklistSection:**
```typescript
interface ChecklistSection {
  id: string;
  name: string;
  order: number;
  suggestedDays?: number;
  sectionDependencies?: string[];
  items: ChecklistItem[];
}
```

**ConditionalRule:**
```typescript
interface ConditionalRule {
  targetId: string;
  targetType: 'section' | 'item';
  condition: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'in';
    value: string | string[];
  };
  action: 'show' | 'hide' | 'require';
}
```

### 3. InvestigationTemplateService

**CRUD Operations:**
- `create()`: Validate sections, emit event
- `findById()`: Organization-scoped lookup
- `findAll()`: Tier-based access control, pagination
- `update()`: Permission checks, validation

**Versioning:**
- `publish()`: Version-on-publish pattern
- `archive()`: Soft delete, remains visible
- `unarchive()`: Restore archived

**Sharing:**
- `duplicate()`: Copy as PERSONAL tier
- `exportTemplate()`: JSON export without org data
- `importTemplate()`: Regenerate IDs, create new

**Analytics:**
- `incrementUsageCount()`: Track template usage
- `getDefaultForCategory()`: Find default by category

### 4. InvestigationTemplateController

**REST Endpoints:**
| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/` | ADMIN, CO, INV | Create template |
| GET | `/` | ADMIN, CO, INV | List templates |
| GET | `/:id` | ADMIN, CO, INV | Get single |
| PUT | `/:id` | ADMIN, CO, INV | Update |
| POST | `/:id/publish` | ADMIN, CO | Publish/version |
| POST | `/:id/archive` | ADMIN, CO | Archive |
| POST | `/:id/unarchive` | ADMIN, CO | Unarchive |
| POST | `/:id/duplicate` | ADMIN, CO, INV | Duplicate |
| GET | `/:id/export` | ADMIN, CO | Export JSON |
| POST | `/import` | ADMIN, CO | Import JSON |

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| TEMPLATE-01 | JSON sections field for checklist schema | Flexible structure without separate tables |
| TEMPLATE-02 | TemplateTier enum for visibility | Matches tiered access from workflow templates |
| TEMPLATE-03 | Version-on-publish preserves in-flight | Existing investigations use original version |

## Events Emitted

- `investigation.template.created`
- `investigation.template.updated`
- `investigation.template.published`
- `investigation.template.archived`
- `investigation.template.duplicated`
- `investigation.template.imported`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `npx prisma validate` passes
- [x] `npm run build` succeeds
- [x] InvestigationTemplate model has sections JSON field
- [x] TemplateTier enum has OFFICIAL, TEAM, PERSONAL values
- [x] Service supports CRUD, versioning, duplicate, export/import
- [x] Controller endpoints require appropriate roles

## Next Phase Readiness

**Ready for:**
- 06-07: InvestigationChecklistProgress model that links templates to investigations

**Dependencies provided:**
- `InvestigationTemplateService` exported from module
- Template versioning for checklist progress tracking

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 645bf94 | feat | Add Template DTOs and InvestigationTemplateService |
| 2de73fd | feat | Add InvestigationTemplateController and wire module |

Note: Schema model (InvestigationTemplate) existed from previous phase preparation.
