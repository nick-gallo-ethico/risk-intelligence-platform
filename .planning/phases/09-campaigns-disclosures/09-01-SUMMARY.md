---
phase: 09-campaigns-disclosures
plan: 01
completed: 2026-02-04
duration: 9 min
subsystem: disclosures
tags: [prisma, schema, form-engine, typescript, compliance-fields]

dependency-graph:
  requires: []
  provides:
    - DisclosureFormTemplate Prisma model
    - Compliance field type definitions
    - Form template DTOs
  affects:
    - 09-02 (Form Template CRUD Service)
    - 09-03 (Form Template Controller)
    - 09-04 (Form Validation Engine)

tech-stack:
  added: []
  patterns:
    - "JSON schema storage for flexible form definitions"
    - "Self-referential relation for translations (parent-child)"
    - "Version + status workflow for form publishing"

key-files:
  created:
    - apps/backend/src/modules/disclosures/entities/form-field.types.ts
    - apps/backend/src/modules/disclosures/entities/index.ts
    - apps/backend/src/modules/disclosures/dto/form-template.dto.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/disclosures/dto/index.ts
    - apps/backend/src/modules/disclosures/index.ts

decisions:
  - context: "Form schema storage approach"
    decision: "JSON columns for fields, sections, validationRules, calculatedFields"
    rationale: "Flexible schema evolution without migrations; frontend-driven rendering"
  - context: "Translation model"
    decision: "Parent-child self-referential relation on DisclosureFormTemplate"
    rationale: "Supports per-field translations while tracking staleness vs parent"
  - context: "Compliance field types"
    decision: "Separate BasicFieldType and ComplianceFieldType enums, union as FormFieldType"
    rationale: "Clear separation of generic vs compliance-specific fields; extensible"

metrics:
  lines_added: ~800
  files_created: 3
  files_modified: 4
  test_coverage: N/A (schema/types only)
---

# Phase 9 Plan 01: Disclosure Form Schema Engine Summary

**One-liner:** Disclosure form template schema with 8 compliance field types, 2-level nested repeaters, and version/translation support.

## What Was Built

### 1. Prisma Schema Additions

**DisclosureFormTemplate model** with:
- Versioning fields: `version`, `status` (DRAFT/PUBLISHED/ARCHIVED), `publishedAt`, `publishedBy`
- Translation support: `parentTemplateId`, `language` (self-referential relation)
- JSON schema fields: `fields`, `sections`, `validationRules`, `calculatedFields`, `uiSchema`
- Relations to `Organization`, `User`, `RiuDisclosureExtension`, `Campaign`

**Enums:**
- `DisclosureFormType`: COI, GIFT, OUTSIDE_EMPLOYMENT, ATTESTATION, POLITICAL, CHARITABLE, TRAVEL, CUSTOM
- `FormTemplateStatus`: DRAFT, PUBLISHED, ARCHIVED

**Relation updates:**
- `RiuDisclosureExtension`: Added `formTemplateId`, `formVersion` for submission tracking
- `Campaign`: Added `disclosureFormTemplateId` for campaign-form linkage

### 2. Compliance Field Type Definitions (RS.23)

**BasicFieldType enum:**
TEXT, TEXTAREA, NUMBER, DATE, DATETIME, DROPDOWN, MULTI_SELECT, CHECKBOX, RADIO, FILE_UPLOAD

**ComplianceFieldType enum:**
- `RELATIONSHIP_MAPPER`: Entity-to-person relationship mapping
- `DOLLAR_THRESHOLD`: Currency with soft warning and hard block thresholds
- `RECURRING_DATE`: Annual/quarterly/monthly tracking
- `ENTITY_LOOKUP`: Search vendor master, HRIS, or other entities
- `SIGNATURE_CAPTURE`: Digital signature with timestamp
- `ATTESTATION`: Required acknowledgment checkbox
- `CURRENCY`: Multi-currency with ISO 4217
- `PERCENTAGE`: 0-100 with validation

**Supporting interfaces:**
- `FormField`: Complete field definition with validation, conditionals, config
- `FieldConditional`: Dynamic show/hide/require logic (RS.27)
- `FormSection`: Field grouping with repeater support
- `RepeaterConfig`: Supports 2 levels of nesting (RS.29)
- `CalculatedField`: Expression engine for computed values (RS.28)
- `ValidationRule`: Cross-field validation with error/warning severity

### 3. Form Template DTOs

- `CreateFormTemplateDto`: Validated creation with required fields/sections
- `UpdateFormTemplateDto`: Partial updates
- `PublishFormTemplateDto`: Version publish control
- `CloneFormTemplateDto`: Copy with optional translation linking
- `FormTemplateQueryDto`: Filtered queries by type/status/language
- `FormTemplateResponseDto`: Full response with computed fields
- `FormTemplateListItemDto`: Lightweight list view

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| Prisma validates | Pass |
| TypeScript compiles | Pass |
| 8 DisclosureFormType enum values | Pass |
| ComplianceFieldType has RS.23 types | Pass |
| RepeaterConfig supports 2-level nesting | Pass |
| CalculatedField has expression/dependencies | Pass |

## Next Phase Readiness

**Ready for 09-02:** Form Template CRUD Service
- Prisma model ready for service implementation
- DTOs ready for controller parameter validation
- Types ready for form submission processing

**Dependencies satisfied:**
- Schema can be migrated when ready
- Types can be imported by frontend for form rendering
