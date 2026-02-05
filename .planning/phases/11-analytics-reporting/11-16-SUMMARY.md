---
phase: 11-analytics-reporting
plan: 16
subsystem: migration
tags: [ai, vision, claude, migration, form-extraction]
tech-stack:
  added: []
  patterns: [vision-api, competitor-detection, confidence-scoring]
dependency-graph:
  requires: ["11-04", "11-08"]
  provides: ["screenshot-to-form-service", "form-field-extraction"]
  affects: ["form-builder", "migration-workflow"]
key-files:
  created:
    - apps/backend/src/modules/analytics/migration/dto/screenshot.dto.ts
    - apps/backend/src/modules/analytics/migration/screenshot-to-form.service.ts
  modified:
    - apps/backend/src/modules/analytics/migration/index.ts
    - apps/backend/src/modules/analytics/migration/migration.module.ts
decisions:
  - id: "11-16-01"
    decision: "Use FORM entity type for audit logging"
    rationale: "Screenshot analysis produces form definitions; FORM is the closest existing entity type"
  - id: "11-16-02"
    decision: "Use AI action category for audit"
    rationale: "This is an AI-powered feature using Claude vision API"
metrics:
  duration: 17 min
  completed: 2026-02-05
---

# Phase 11 Plan 16: Screenshot-to-Form AI Service Summary

**One-liner:** Claude vision API integration for extracting form field definitions from competitor screenshots with competitor-specific pattern matching.

## What Was Built

### 1. Screenshot DTOs (`screenshot.dto.ts`)

Comprehensive type definitions for the screenshot analysis feature:

- **ScreenshotContext enum**: `MIGRATION` | `FORM_BUILDER` - context-aware prompting
- **CompetitorHint enum**: `NAVEX` | `EQS` | `ONETRUST` | `STAR` | `UNKNOWN`
- **ExtractedFieldType enum**: 15 field types (text, textarea, select, date, etc.)
- **ValidationRule interface**: Captures min/max/pattern rules from screenshots
- **ExtractedField class**: Complete field definition with confidence scores
- **ExtractedSection class**: Form section/grouping information
- **ScreenshotAnalysisResult class**: Full analysis result with warnings
- **COMPETITOR_FIELD_PATTERNS**: Type hints for known competitor systems

### 2. ScreenshotToFormService (`screenshot-to-form.service.ts`)

AI-powered service with ~640 lines implementing:

| Method | Purpose |
|--------|---------|
| `analyzeScreenshot()` | Main entry point - validates, uploads, analyzes, returns results |
| `validateFile()` | MIME type and size validation (PNG, JPEG, WebP, GIF; 20MB max) |
| `uploadScreenshot()` | Stores screenshot for audit trail |
| `callVisionApi()` | Claude API integration with multimodal message |
| `buildAnalysisPrompt()` | Context-aware prompt with competitor hints |
| `parseAiResponse()` | JSON extraction and field processing |
| `mapFieldType()` | Normalizes AI-detected types to ExtractedFieldType |
| `sanitizeFieldName()` | Converts labels to camelCase identifiers |
| `detectCompetitor()` | Pattern matching to identify source system |
| `logAudit()` | Records analysis for compliance |

### Key Features

1. **Competitor-Specific Hints**: Known field patterns for NAVEX, EQS, OneTrust, STAR improve type detection
2. **Confidence Scoring**: Each field has 0-100 confidence; low-confidence fields generate warnings
3. **Context-Aware Prompts**: Migration context focuses on case/incident fields; form builder focuses on clean definitions
4. **Existing Field Deduplication**: Avoids name conflicts with existing form fields
5. **Automatic Competitor Detection**: Identifies source system from extracted field patterns
6. **Audit Trail**: All analyses logged with context, results, and screenshot path

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Direct Anthropic SDK usage | Vision API requires multimodal message format not in existing AIProvider interface |
| Store screenshots in storage | Audit trail requirement; enables debugging and review |
| FORM entity type for audit | Closest match for form extraction output |
| AI action category for audit | Feature uses AI for core functionality |
| Confidence threshold 50% | Fields below 50% flagged for manual review |
| Minimum 2 pattern matches | Required for competitor auto-detection |

## Verification

```bash
# Lint passed with only pre-existing warnings
npm run lint -- --fix

# Typecheck passed for new files (pre-existing errors in other migration files)
npm run typecheck
```

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

| File | Change |
|------|--------|
| `dto/screenshot.dto.ts` | Created - 207 lines of DTOs and type definitions |
| `screenshot-to-form.service.ts` | Created - 637 lines of service implementation |
| `index.ts` | Modified - Added exports for new files |
| `migration.module.ts` | Modified - Added ScreenshotToFormService to providers/exports |

## Commit

- `9d12f5c`: feat(11-16): Add screenshot-to-form AI service for form extraction

## Success Criteria Met

- [x] Screenshot analysis extracts field names, types, and validation rules
- [x] Competitor-specific hints improve extraction accuracy for NAVEX, EQS, OneTrust, STAR
- [x] Both migration and form builder contexts supported
- [x] Results include confidence scores and warnings
- [x] Audit trail tracks all screenshot analyses

## Next Steps

- **11-17**: Build legacy format parsers and connectors
- **Integration**: Wire up to migration controller for end-to-end workflow
- **Frontend**: Build UI for screenshot upload and result review
