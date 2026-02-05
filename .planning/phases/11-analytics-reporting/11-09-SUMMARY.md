---
phase: 11-analytics-reporting
plan: 09
subsystem: analytics
tags: [migration, connectors, navex, eqs, csv, data-import, competitor-migration]
dependency-graph:
  requires: [11-04]
  provides: [migration-connectors]
  affects: [11-10-migration-ui]
tech-stack:
  added: [csv-parser]
  patterns: [strategy-pattern, fuzzy-matching, levenshtein-distance, field-mapping]
key-files:
  created:
    - apps/backend/src/modules/analytics/migration/connectors/base.connector.ts
    - apps/backend/src/modules/analytics/migration/connectors/navex.connector.ts
    - apps/backend/src/modules/analytics/migration/connectors/eqs.connector.ts
    - apps/backend/src/modules/analytics/migration/connectors/csv.connector.ts
    - apps/backend/src/modules/analytics/migration/connectors/index.ts
    - apps/backend/src/types/csv-parser.d.ts
  modified:
    - apps/backend/src/modules/analytics/migration/migration.module.ts
    - apps/backend/src/modules/analytics/migration/index.ts
    - apps/backend/package.json
decisions:
  - key: connector-strategy-pattern
    choice: Abstract base class with concrete implementations
    rationale: Each connector (NAVEX, EQS, CSV) has unique column detection but shares transformation logic
  - key: fuzzy-matching-algorithm
    choice: Levenshtein distance with substring boost
    rationale: Handles common field name variations (case_number vs caseNumber vs CaseID)
  - key: field-mapping-approach
    choice: Pre-defined mappings for known systems, dynamic for generic CSV
    rationale: NAVEX/EQS have predictable exports; generic CSV needs auto-detection
metrics:
  duration: 18 min
  completed: 2026-02-05
---

# Phase 11 Plan 09: Migration Connectors Summary

Built migration connectors for NAVEX, EQS, and generic CSV imports with format detection and field mapping.

## What Was Built

### Base Connector Interface (apps/backend/src/modules/analytics/migration/connectors/base.connector.ts)

**BaseMigrationConnector** abstract class providing:
- `MigrationConnector` interface contract
- `FormatDetectionResult` with confidence scoring (0-1)
- `FieldTransform` union type for 12 transform types
- `ValidationResult` with errors/warnings separation
- `TransformedRow` with entity-specific outputs (Case, RIU, Person, Investigation)

**Common functionality:**
- `detectFormat()` - reads file headers, calculates confidence
- `getAvailableFields()` - extracts column headers
- `validateRow()` - validates row against mappings
- `transformRow()` - applies transforms and maps to entities
- `createRowStream()` - CSV streaming for large files
- `parseHeaders()` - handles quoted CSV headers
- `applyTransform()` - 12 transform functions
- `parseDate()` - US/EU/ISO date format support

### NAVEX Connector (apps/backend/src/modules/analytics/migration/connectors/navex.connector.ts)

**NavexConnector** for EthicsPoint exports:
- 37 known NAVEX column names for detection
- 45+ field mapping suggestions
- Category mappings (20+ EthicsPoint categories to platform categories)
- Status mappings (Open, Closed, Pending, etc.)
- Severity mappings (High, Medium, Low variants)
- US date format default (MM/dd/yyyy)

**Detection criteria:**
- Presence of "Case Number" or "Case ID" columns
- Combined with "Case Type" or "Incident Type"
- Column match count against known NAVEX columns

### EQS Connector (apps/backend/src/modules/analytics/migration/connectors/eqs.connector.ts)

**EqsConnector** for Conversant/Integrity Line exports:
- 35 known EQS column names for detection
- 40+ field mapping suggestions
- Category mappings (25+ EQS categories including GDPR, Environmental, Human Rights)
- Status mappings with EQS-specific states
- Severity mappings with risk level variants
- ISO date format default (yyyy-MM-dd)

**Detection criteria:**
- Presence of "Report ID" or "Report Number" columns
- Combined with "Report Type" or "Issue Category"
- Bonus for "whistleblower" terminology

### CSV Connector (apps/backend/src/modules/analytics/migration/connectors/csv.connector.ts)

**CsvConnector** for generic CSV with fuzzy matching:
- `FIELD_ALIASES` - 20+ target fields with 100+ variations
- `calculateSimilarity()` - Levenshtein distance algorithm
- `generateMappings()` - auto-generates mappings from headers
- `findBestMatch()` - returns best field match with score

**Fuzzy matching features:**
- Exact match returns 1.0 score
- Substring containment boosts score (0.7 + length ratio)
- Levenshtein distance for similar strings
- 0.75 threshold for fuzzy matches

**Field alias examples:**
| Target | Aliases |
|--------|---------|
| caseNumber | case_number, caseid, report_number, ticket_number, ref, etc. |
| status | status, case_status, current_status, state, workflow_status, etc. |
| description | description, details, narrative, summary, allegation, etc. |
| createdAt | created, date_created, date_reported, submitted, intake_date, etc. |

### Type Declarations (apps/backend/src/types/csv-parser.d.ts)

TypeScript declarations for csv-parser npm package:
- `CsvParserOptions` interface with all configuration options
- Supports headers transformation, value mapping, skip lines
- Compatible with Node.js Transform streams

## Key Design Decisions

1. **Strategy Pattern for Connectors**: Each connector implements the same interface but with system-specific detection and mapping logic. Easy to add new connectors (OneTrust, STAR, etc.).

2. **Fuzzy Matching with Levenshtein**: Generic CSV connector uses edit distance to handle field name variations (case_number, CaseNumber, case-number all match).

3. **Pre-defined vs Dynamic Mappings**: NAVEX and EQS have predictable exports so we provide pre-built mappings. Generic CSV generates mappings dynamically from detected headers.

4. **Confidence Scoring**: Each connector calculates how confident it is about the file format (0-1 scale). Higher than 0.5 considered valid.

5. **Streaming for Large Files**: csv-parser enables processing files row-by-row without loading entire file into memory.

## Commits

| Commit | Description |
|--------|-------------|
| 6c3716c | Add base migration connector interface |
| 18781ca | Add NAVEX and EQS migration connectors |
| 22ca0a9 | Add generic CSV migration connector with fuzzy matching |

## Deviations from Plan

None - plan executed exactly as written.

## Test Verification

- ESLint passes with no connector-specific errors
- TypeScript compiles connectors without errors
- Module registration verified in migration.module.ts

## Next Steps

This infrastructure is ready for:
- 11-10: Migration UI (upload wizard, field mapping interface)
- Integration with MigrationService for actual import processing
- Additional connectors (OneTrust, STAR) if needed

---

*Plan: 11-09 | Duration: 18 min | Completed: 2026-02-05*
