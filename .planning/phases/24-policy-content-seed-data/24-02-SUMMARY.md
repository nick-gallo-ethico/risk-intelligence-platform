---
phase: 24
plan: 02
subsystem: seed-data
tags: [flagship-cases, narratives, ai-summaries, content-generation]
dependency-graph:
  requires: [24-01]
  provides:
    [
      expanded-flagship-cases,
      enhanced-narrative-generation,
      improved-ai-summaries,
    ]
  affects: [demo-walkthroughs, case-detail-pages]
tech-stack:
  added: []
  patterns: [template-conclusion-pattern, category-specific-analysis]
key-files:
  created: []
  modified:
    - apps/backend/prisma/seeders/patterns/flagship-cases.ts
    - apps/backend/prisma/seeders/case.seeder.ts
    - apps/backend/prisma/seeders/data/narrative-templates.ts
decisions: []
metrics:
  duration: "15 minutes"
  completed: "2026-02-12"
---

# Phase 24 Plan 02: Case Content Enhancement Summary

Expanded flagship case narratives to 200-400 words and AI summaries to 50-75 words for demo walkthroughs. Enhanced regular case content generation for consistent quality.

## Changes Made

### Task 1: Flagship Case Narratives and Summaries (0e5e5e7)

**Flagship Narratives Expanded (10 cases):**
All 10 flagship cases expanded from 130-172 words to 250-350 words each:

| Case                              | Previous | Updated | Content Added                                                                 |
| --------------------------------- | -------- | ------- | ----------------------------------------------------------------------------- |
| The Chicago Warehouse Incident    | 130      | 284     | Prior complaint history, turnover data, written incident log                  |
| Q3 Financial Irregularities       | 165      | 323     | Forensic review details, submission pattern analysis, geographic data         |
| Executive Expense Report          | 140      | 321     | Documentary evidence details, specific dollar amounts, retaliation concerns   |
| Manufacturing Safety Incident     | 168      | 321     | OSHA notification timeline, production metrics correlation, systemic failures |
| Healthcare Data Breach            | 152      | 348     | EHR access patterns, employment correlation, regulatory notifications         |
| Systematic Discrimination Pattern | 172      | 329     | Statistical analysis, promotion matrix, witness corroboration                 |
| Vendor Kickback Scheme            | 155      | 343     | Forensic accounting, undisclosed relationship, backdated approvals            |
| Workplace Violence Threat         | 148      | 327     | Six witness statements, threat assessment activation, security measures       |
| COI Disclosure - Board Member     | 142      | 312     | Conflict touchpoints, recusal framework, governance committee review          |
| Retaliation After Safety Report   | 156      | 323     | Adverse actions timeline, direct supervisor statement, OSHA exposure          |

**AI Summaries Expanded (10 cases):**
All 10 AI summaries expanded from 24-35 words to 50-75 words:

- Added specific risk factors and quantitative details
- Included recommended investigation approaches
- Referenced relevant policy violations
- Added urgency indicators and escalation pathways

### Task 2: Regular Case Content Generation (14ca112)

**Enhanced generateAiSummary Function:**

- Extended from 3 short sentence arrays to comprehensive 50-75 word output
- Added category-specific analysis sentences for 10 compliance categories:
  - harassment, discrimination, retaliation, financial_misconduct
  - fraud, safety, conflict_of_interest, data_privacy
  - policy_violation, workplace_violence
- Extended severity prefixes (15-20 words each)
- Added recommended action statements (15-20 words each)

**Enhanced Narrative Templates:**

- Added `conclusion` field to NarrativeTemplate interface
- Added template-specific conclusions to 5 categories:
  - harassment (5 templates with conclusions)
  - retaliation (4 templates with conclusions)
  - discrimination (4 templates with conclusions)
  - financial_misconduct (5 templates with conclusions)
  - safety (5 templates with conclusions)
- Added GENERIC_CLOSING_PARAGRAPHS array with 6 closing statements (40-60 words each)
- Updated generateNarrative to always include closing paragraph
- Ensures all regular case narratives reach 200+ words

## Technical Details

### Files Modified

1. **flagship-cases.ts** (61 insertions, 116 deletions)
   - Expanded `narrative` field for all 10 FLAGSHIP_CASES
   - Expanded `aiSummary` field for all 10 FLAGSHIP_CASES
   - No changes to other fields (name, category, severity, status, etc.)

2. **case.seeder.ts** (485 insertions, 230 deletions - includes linter changes)
   - Restructured generateAiSummary function
   - Added categoryDetails record with category-specific sentences
   - Extended summaryPrefixes and recommendedActions arrays

3. **narrative-templates.ts**
   - Extended NarrativeTemplate interface with optional `conclusion` field
   - Added conclusion text to 23 templates across 5 categories
   - Added GENERIC_CLOSING_PARAGRAPHS constant
   - Updated generateNarrative function logic

## Verification

- TypeScript compilation: Passed (specific files compile without errors)
- Flagship narratives: All 10 cases 200-400 words
- Flagship AI summaries: All 10 cases 50-75 words
- generateAiSummary: Produces 50-75 word output via category-specific templates
- generateNarrative: Includes closing paragraph ensuring 200+ word output

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash    | Type | Description                                                   |
| ------- | ---- | ------------------------------------------------------------- |
| 0e5e5e7 | feat | Expand flagship case narratives and AI summaries              |
| 14ca112 | feat | Enhance AI summary and narrative generation for regular cases |

## Next Steps

Plan 24-03: Policy content enhancement (policy descriptions, version history, attestation content)
