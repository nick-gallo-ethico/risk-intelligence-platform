---
phase: 06-case-management
plan: 05
subsystem: custom-properties
tags: [prisma, custom-fields, validation, tenant-config]
dependency-graph:
  requires: [01-foundation, 06-01-schema]
  provides: [custom-property-definitions, value-validation]
  affects: [cases, investigations, persons, rius]
tech-stack:
  added: []
  patterns: [tenant-configurable-fields, json-schema-validation, soft-delete]
file-tracking:
  key-files:
    created:
      - apps/backend/prisma/schema.prisma (CustomPropertyDefinition model)
      - apps/backend/src/modules/custom-properties/custom-properties.module.ts
      - apps/backend/src/modules/custom-properties/custom-properties.service.ts
      - apps/backend/src/modules/custom-properties/custom-properties.controller.ts
      - apps/backend/src/modules/custom-properties/dto/custom-property.dto.ts
      - apps/backend/src/modules/custom-properties/index.ts
    modified:
      - apps/backend/src/app.module.ts
decisions:
  - Key format enforced: must start with letter, alphanumeric + underscore only
  - Soft delete pattern: isActive flag instead of hard delete for existing value preservation
  - Property definitions are tenant-scoped and entity-type-scoped
  - Unknown keys in validation preserved but not validated (backward compatible)
metrics:
  duration: 33 min
  completed: 2026-02-03
---

# Phase 6 Plan 5: Custom Properties Summary

**One-liner:** Tenant-configurable custom field definitions for Cases, Investigations, Persons, and RIUs with comprehensive validation for 10 data types.

## What Was Built

### Prisma Schema Additions

1. **CustomPropertyEntityType enum** - Entity types that support custom properties:
   - CASE, INVESTIGATION, PERSON, RIU

2. **PropertyDataType enum** - Supported data types:
   - TEXT, NUMBER, DATE, DATETIME, SELECT, MULTI_SELECT, BOOLEAN, URL, EMAIL, PHONE

3. **CustomPropertyDefinition model** - Property definition with:
   - Entity type targeting
   - Data type and validation rules
   - Options for SELECT/MULTI_SELECT types
   - Display configuration (order, grouping, visibility)
   - UI hints (placeholder, width, help text)
   - Required/optional with default values
   - Soft delete via isActive flag

### CustomPropertiesService

Core service providing:
- **CRUD operations** - Create, read, update, soft-delete property definitions
- **Key validation** - Enforces alphanumeric starting with letter
- **Options validation** - Requires options for SELECT/MULTI_SELECT
- **Reordering** - Batch update display order
- **Value validation** - Comprehensive per-type validation:
  - TEXT: minLength, maxLength, pattern (regex)
  - NUMBER: min, max, decimals
  - DATE/DATETIME: minDate, maxDate, allowFuture, allowPast
  - SELECT: single value from options
  - MULTI_SELECT: array of values from options
  - BOOLEAN: accepts true/false/'true'/'false'/1/0
  - URL: validates URL format
  - EMAIL: validates email format, normalizes to lowercase
  - PHONE: validates 7-15 digits with optional formatting
- **Default values** - Returns defaults for new entity creation

### CustomPropertiesController

REST endpoints at `/api/v1/custom-properties`:
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | POST | SYSTEM_ADMIN, COMPLIANCE_OFFICER | Create definition |
| `/` | GET | SYSTEM_ADMIN, COMPLIANCE_OFFICER, INVESTIGATOR | List all definitions |
| `/by-entity/:entityType` | GET | Any authenticated | List by entity type |
| `/defaults/:entityType` | GET | Any authenticated | Get default values |
| `/:id` | GET | SYSTEM_ADMIN, COMPLIANCE_OFFICER, INVESTIGATOR | Get single definition |
| `/:id` | PUT | SYSTEM_ADMIN, COMPLIANCE_OFFICER | Update definition |
| `/:id` | DELETE | SYSTEM_ADMIN, COMPLIANCE_OFFICER | Soft delete |
| `/reorder/:entityType` | PUT | SYSTEM_ADMIN, COMPLIANCE_OFFICER | Reorder display |
| `/validate/:entityType` | POST | Any authenticated | Validate values |

## Verification Results

- [x] `npx prisma validate` passes
- [x] CustomPropertyDefinition model has entityType and dataType
- [x] Validation supports all 10 data types
- [x] Options stored for SELECT/MULTI_SELECT types
- [x] Validation endpoint returns sanitized values and errors
- [x] Module wired into AppModule

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

### Key Format Enforcement
Property keys must match regex `/^[a-zA-Z][a-zA-Z0-9_]*$/`:
- Starts with letter (not number or underscore)
- Contains only alphanumeric and underscore
- Used as JSON key in entity's `customFields` column

### Validation Result Structure
```typescript
interface ValidationResult {
  valid: boolean;           // True if all validations passed
  errors: Array<{
    key: string;            // Property key that failed
    message: string;        // Human-readable error message
  }>;
  sanitized: Record<string, unknown>;  // Cleaned/normalized values
}
```

### Soft Delete Pattern
Instead of hard deleting property definitions:
- `isActive` set to false
- Existing values in entity `customFields` preserved
- Definition hidden from UI but data remains queryable
- Allows reactivation if needed

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 6a40aee | Add CustomPropertyDefinition model to Prisma schema |
| 2 | 95fbada | Add CustomProperties DTOs and Service |
| 3 | fbc50ac | Add CustomProperties Controller and Module |

## Next Phase Readiness

Custom properties infrastructure is complete. Future tasks can:
- Use `CustomPropertiesService.validateValues()` when saving entity customFields
- Use `CustomPropertiesService.getDefaultValues()` when creating new entities
- Render property forms dynamically from definitions
