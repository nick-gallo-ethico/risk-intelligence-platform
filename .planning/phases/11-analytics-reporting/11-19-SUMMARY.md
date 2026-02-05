---
phase: 11
plan: 19
type: summary
subsystem: analytics-migration
tags: [csv-import, field-mapping, migration, fuzzy-matching]
depends_on: ["11-04", "11-15", "11-17"]
provides:
  - MappingSuggestionService for intelligent field mapping suggestions
  - Enhanced CsvConnector with generic value mappings
affects: ["11-20", "11-21"]
tech-stack:
  patterns:
    - Fuzzy matching with Levenshtein distance
    - Synonym-based field mapping
    - Template pattern for reusable configurations
key-files:
  created:
    - apps/backend/src/modules/analytics/migration/mapping-suggestion.service.ts
  modified:
    - apps/backend/src/modules/analytics/migration/connectors/csv.connector.ts
    - apps/backend/src/modules/analytics/migration/migration.module.ts
    - apps/backend/src/modules/analytics/migration/index.ts
decisions:
  - decision: "Use comprehensive synonym dictionaries for field matching"
    rationale: "Covers common field naming conventions across different systems"
metrics:
  duration: 8 min
  completed: 2026-02-05
---

# Phase 11 Plan 19: CSV Connector + Mapping Suggestions Summary

Intelligent field mapping with confidence scoring and generic CSV import with comprehensive value mappings.

## One-Liner

MappingSuggestionService with fuzzy matching using synonyms/Levenshtein distance, plus CsvConnector with generic status/category/severity mappings.

## What Was Built

### MappingSuggestionService (926 lines)

Intelligent field mapping service that suggests mappings based on:

1. **Exact Synonym Match (95% confidence)**
   - Comprehensive synonym dictionaries for 30+ target fields
   - Covers Case, RIU, Person, and Investigation entities

2. **Partial/Substring Match (75% confidence)**
   - Detects when field names contain known synonyms
   - Minimum 3-character overlap required

3. **Fuzzy Match via Levenshtein Distance (variable confidence)**
   - Calculates edit distance between strings
   - Threshold of 70% similarity for matches
   - Includes substring containment boost

4. **Data Type Inference (40-60% confidence)**
   - Detects dates, emails, phone numbers from sample values
   - Long text detection for description fields

5. **Template System**
   - Save mapping configurations for reuse
   - Load templates by name
   - List all templates for organization
   - Delete templates

### Enhanced CsvConnector (1074 lines)

Extended with comprehensive value mapping capabilities:

1. **Status Mappings** - 25+ common status values:
   - Open variants: new, open, active, pending
   - In Progress variants: investigating, assigned, working, review
   - Closed variants: closed, resolved, completed, dismissed

2. **Category Mappings** - 40+ category values:
   - Harassment, Discrimination, Fraud, Theft
   - Safety, Policy Violation, Ethics Violation
   - Conflict of Interest, Retaliation, Data Privacy, Substance Abuse

3. **Severity Mappings** - 15+ severity values:
   - Critical/High/Medium/Low with variants
   - Numeric scale support (1-5)

4. **Row ID Generation**
   - Hash-based deterministic IDs for records without identifiers
   - Format: `CSV-{HASH}-R{rowNumber}`

5. **Enhanced Validation**
   - Lenient CSV validation (checks for data presence)
   - Email format validation (warnings)
   - Date format detection (warnings)

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Synonym dictionaries over ML | Deterministic, fast, no model dependency |
| Levenshtein for fuzzy match | Well-understood algorithm, good accuracy |
| Confidence scoring | Helps users prioritize review effort |
| Template persistence | Enables reuse across imports |
| Generic value mappings | Covers most competitor system values |

## Commits

| Hash | Description |
|------|-------------|
| e8f60d0 | feat(11-19): add MappingSuggestionService for intelligent field mapping |
| e0e876e | feat(11-19): enhance CsvConnector with generic value mappings |

## Files Changed

### Created
- `apps/backend/src/modules/analytics/migration/mapping-suggestion.service.ts` (926 lines)
  - Field synonym dictionaries
  - Target field metadata
  - Fuzzy matching algorithms
  - Template CRUD operations

### Modified
- `apps/backend/src/modules/analytics/migration/connectors/csv.connector.ts` (+443 lines)
  - Generic status/category/severity mappings
  - Row ID generation
  - Enhanced validation and transformation

- `apps/backend/src/modules/analytics/migration/migration.module.ts`
  - Registered MappingSuggestionService

- `apps/backend/src/modules/analytics/migration/index.ts`
  - Exported MappingSuggestionService

## Success Criteria Verification

| Criteria | Status |
|----------|--------|
| MappingSuggestionService suggests mappings with confidence scores | PASS - 4 confidence tiers (95/75/variable/40-60) |
| CsvConnector handles any CSV structure based on user mappings | PASS - Flexible mapping with value transforms |
| Mapping templates can be saved and reused | PASS - Full CRUD via saveTemplate/loadTemplate/listTemplates/deleteTemplate |
| Generic category and status mappings cover common values | PASS - 25+ statuses, 40+ categories |
| Row IDs generated for records without identifiers | PASS - Hash-based generateRowId() |

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

### With MigrationUploadService
```typescript
// Suggest mappings when file uploaded
const suggestions = await mappingSuggestionService.suggestMappings(
  orgId,
  headers,
  sampleRows,
  savedTemplateName,
);
```

### With CsvConnector
```typescript
// Transform row with generic value mappings
const transformed = csvConnector.transformRow(row, mappings);
// Status, category, severity automatically mapped
```

## Usage Examples

### Suggesting Mappings
```typescript
const suggestions = await mappingSuggestionService.suggestMappings(
  'org-123',
  ['Case ID', 'Description', 'Status', 'Created Date'],
  [{ 'Case ID': 'C001', 'Description': 'Employee reported...', 'Status': 'Open' }],
);

// Returns:
// [
//   { sourceField: 'Case ID', targetField: 'sourceRecordId', confidence: 95, ... },
//   { sourceField: 'Description', targetField: 'details', confidence: 95, ... },
//   { sourceField: 'Status', targetField: 'status', confidence: 95, ... },
//   ...
// ]
```

### Value Mapping
```typescript
csvConnector.mapStatus('In Progress');      // Returns: 'IN_PROGRESS'
csvConnector.mapStatus('investigating');    // Returns: 'IN_PROGRESS'
csvConnector.mapCategory('workplace harassment'); // Returns: 'HARASSMENT'
csvConnector.mapSeverity('2');              // Returns: 'HIGH'
```

## Next Phase Readiness

**Ready for 11-20 (Import Execution Engine):**
- MappingSuggestionService provides field mappings
- CsvConnector handles value transformation
- Row ID generation ensures all records have identifiers

**Ready for 11-21 (Rollback Mechanism):**
- MigrationRecord model tracks imported entities
- Source data preserved for rollback reference
