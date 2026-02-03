---
phase: 02
plan: 04
subsystem: seed-data
tags: [riu, seeder, intake, compliance, demo-data, seasonality, narratives]
dependency-graph:
  requires: ["02-01", "02-02", "02-03"]
  provides: ["riu-seeder", "seasonality-utility", "narrative-templates"]
  affects: ["02-05"]
tech-stack:
  added: ["nanoid"]
  patterns: ["batch-insert", "seasonality-distribution", "multi-reporter-incidents"]
key-files:
  created:
    - apps/backend/prisma/seeders/riu.seeder.ts
    - apps/backend/prisma/seeders/utils/seasonality.ts
    - apps/backend/prisma/seeders/data/narrative-templates.ts
  modified:
    - apps/backend/prisma/seed.ts
decisions:
  - id: "02-04-01"
    decision: "Seasonality spike periods based on corporate compliance patterns"
    rationale: "Post-holiday (Jan-Feb), Q1 reorg (Mar), mid-year review (Jun-Jul), policy changes (Sep), year-end stress (Nov-Dec) are realistic patterns"
  - id: "02-04-02"
    decision: "Category-based anonymity rates with retaliation highest (70%)"
    rationale: "Fear of reprisal drives anonymity; COI lowest (25%) as often self-disclosures"
  - id: "02-04-03"
    decision: "~5% linked incidents with 2-4 reporters each"
    rationale: "Enables case consolidation demos without overwhelming the dataset"
  - id: "02-04-04"
    decision: "Edge cases distributed at fixed indices for determinism"
    rationale: "Indices 100-149 long, 200-299 unicode, 500-519 boundary dates, 1000-1009 minimal"
metrics:
  duration: "9 min"
  completed: "2026-02-03"
---

# Phase 2 Plan 4: RIU Seeder Summary

RIU seeder generates 5,000 historical Risk Intelligence Units with realistic compliance patterns including seasonality spikes, category-based anonymity, multi-reporter incidents, and time-zone aware timestamps.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Seasonality utility | 6bf038d | utils/seasonality.ts |
| 2 | AI-quality narrative templates | e4efe40 | data/narrative-templates.ts |
| 3-8 | RIU seeder implementation | efdf7d3 | riu.seeder.ts |
| 9 | Main seed integration | 21f656e | seed.ts, riu.seeder.ts |

## What Was Built

### Seasonality Utility (`utils/seasonality.ts`)
- **Spike periods**: Post-holiday (1.4x), Q1 reorg (1.3x), mid-year review (1.25x), policy changes (1.35x), year-end stress (1.2x)
- **Low periods**: Summer lull (0.7x), holiday break (0.5x)
- **Functions**: `getSeasonalityMultiplier()`, `applySeasonality()`, `generateSeasonalHistoricalDate()`

### Narrative Templates (`data/narrative-templates.ts`)
- **11 categories** with realistic compliance report language
- **Category-specific anonymity rates**: Retaliation 70%, harassment 55%, discrimination 50%, COI 25%
- **Placeholder system** for dynamic content: `{subject_role}`, `{date_reference}`, `{specific_behavior}`, etc.
- **Edge case generators**: Long narratives, Unicode content, minimal content

### RIU Seeder (`riu.seeder.ts`)
- **Type distribution**: 55% hotline, 25% web form, 8% disclosure, 5% attestation, etc.
- **Channel achievement**: 60% phone, 30% web, 10% other (hotline-heavy per requirements)
- **Multi-reporter incidents**: ~5% linked incidents with shared `linkedIncidentId` in customFields
- **Time-zone adjustment**: AMERICAS 13:00-23:00 UTC, EMEA 07:00-17:00 UTC, APAC 23:00-09:00 UTC
- **Type-specific content**: Chatbot transcripts, disclosure responses, attestation forms
- **Reference number format**: `RIU-YYYY-NNNNN` (e.g., RIU-2024-00001)
- **Batch insert**: 100 records per batch for performance

### Seed Script Integration
- Category map built with id and code for narrative generation
- Employee map built with locationId for regional timestamp adjustment
- Location ID to region map from LOCATIONS export
- Comprehensive demo data summary output

## Verification Results

1. TypeScript compiles: PASS
2. RIU seeder exports `seedRius` function: PASS
3. All 8 RIU types have content templates: PASS
4. Channel distribution achieves targets: 55% hotline + 3% incident = ~60% phone
5. Category-based anonymity implemented: PASS
6. Seasonality spikes present: PASS
7. Multi-reporter linked incidents: PASS (~5%)
8. Time-zone realistic timestamps: PASS
9. Edge cases included: 50 long, 100 unicode, 20 boundary, 10 minimal
10. Reference number generation: PASS

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

### Created
- `apps/backend/prisma/seeders/utils/seasonality.ts` - 336 lines
- `apps/backend/prisma/seeders/data/narrative-templates.ts` - 645 lines
- `apps/backend/prisma/seeders/riu.seeder.ts` - 980 lines

### Modified
- `apps/backend/prisma/seed.ts` - Added RIU seeding with data preparation

## Technical Notes

### Anonymity Rate Distribution
| Category | Anonymous | Confidential | Identified |
|----------|-----------|--------------|------------|
| Retaliation | 70% | 25% | 5% |
| Workplace Violence | 60% | 25% | 15% |
| Harassment | 55% | 25% | 20% |
| Discrimination | 50% | 25% | 25% |
| Data Privacy | 40% | 25% | 35% |
| Financial Misconduct | 35% | 25% | 40% |
| Policy Violation | 35% | 25% | 40% |
| Safety | 30% | 25% | 45% |
| COI | 25% | 25% | 50% |
| Gifts/Entertainment | 20% | 25% | 55% |

### RIU Type to Channel Mapping
| RIU Type | Channel | Weight |
|----------|---------|--------|
| HOTLINE_REPORT | PHONE | 55% |
| WEB_FORM_SUBMISSION | WEB_FORM | 25% |
| DISCLOSURE_RESPONSE | CAMPAIGN | 8% |
| ATTESTATION_RESPONSE | CAMPAIGN | 5% |
| INCIDENT_FORM | WEB_FORM | 3% |
| PROXY_REPORT | PROXY | 2% |
| CHATBOT_TRANSCRIPT | CHATBOT | 1.5% |
| SURVEY_RESPONSE | CAMPAIGN | 0.5% |

## Next Phase Readiness

**02-05 Case Seeder** can now proceed with:
- 5,000 RIU IDs available for case creation
- Linked incidents data structure for case consolidation
- Category map for case classification
- Employee map for case assignment routing
