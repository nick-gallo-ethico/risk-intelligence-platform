---
phase: 02-demo-tenant-seed-data
plan: 05
subsystem: seed-data
tags: [cases, investigations, patterns, demo-data, seeding]

dependency-graph:
  requires:
    - 02-03 (employees with manager hierarchy)
    - 02-04 (RIUs for case creation)
  provides:
    - Case seeder with RIU linkage
    - Investigation seeder with outcomes
    - Pattern generators for realistic data
    - Flagship cases for demos
  affects:
    - 02-07 (dashboard metrics rely on case/investigation data)
    - Demo environment readiness

tech-stack:
  added: []
  patterns:
    - Pattern injection for realistic data distribution
    - Batch insert for performance
    - Deterministic seeding with faker.seed()

key-files:
  created:
    - apps/backend/prisma/seeders/case.seeder.ts
    - apps/backend/prisma/seeders/investigation.seeder.ts
    - apps/backend/prisma/seeders/patterns/repeat-subjects.ts
    - apps/backend/prisma/seeders/patterns/manager-hotspots.ts
    - apps/backend/prisma/seeders/patterns/retaliation.ts
    - apps/backend/prisma/seeders/patterns/flagship-cases.ts
    - apps/backend/prisma/seeders/patterns/index.ts
  modified:
    - apps/backend/prisma/seed.ts

decisions:
  - id: 02-05-01
    title: Pattern injection approach
    choice: Generate patterns first, inject during case creation
    rationale: Allows deterministic pattern distribution across cases
  - id: 02-05-02
    title: Case-RIU ratio
    choice: 90% RIU-to-Case ratio (4,500 cases from 5,000 RIUs)
    rationale: Some RIUs don't create cases, some cases consolidate multiple RIUs
  - id: 02-05-03
    title: Investigation outcome distribution
    choice: 60% substantiation rate
    rationale: Per CONTEXT.md requirements, realistic for compliance investigations

metrics:
  duration: 12 min
  completed: 2026-02-03
---

# Phase 2 Plan 5: Case and Investigation Seeder Summary

Case and Investigation seeders create 4,500 Cases from RIUs with 10%/90% open/closed distribution, ~5,000 Investigations with 60% substantiation rate, and pattern generators for repeat subjects, manager hotspots, retaliation chains, and flagship cases.

## What Was Built

### 1. Pattern Generators (`apps/backend/prisma/seeders/patterns/`)

**repeat-subjects.ts** - Generates ~50 employees who appear in 2-5 cases each
- Enables "repeat offender" analytics demos
- Category preferences for realistic distribution
- 10% of cases involve repeat subjects

**manager-hotspots.ts** - Generates ~15 managers with 2x-3x team case rates
- Concentrated in harassment/discrimination categories
- Demo notes for sales walkthrough narratives
- Enables "department risk analysis" demos

**retaliation.ts** - Generates ~50 follow-up retaliation reports
- Links to original closed cases
- 30-90 days after original case closure
- Various retaliation types (performance review, schedule change, etc.)

**flagship-cases.ts** - 10 named memorable cases for sales demos
- "The Chicago Warehouse Incident"
- "Q3 Financial Irregularities"
- "Executive Expense Report"
- "Manufacturing Safety Incident"
- "Healthcare Data Breach"
- "Systematic Discrimination Pattern"
- "Vendor Kickback Scheme"
- "Workplace Violence Threat"
- "COI Disclosure - Board Member"
- "Retaliation After Safety Report"

Each flagship case includes:
- Rich narrative for walkthrough
- Pre-written AI summary
- Risk score and demo points
- CCO escalation and external party involvement

### 2. Case Seeder (`apps/backend/prisma/seeders/case.seeder.ts`)

Creates 4,500 Cases from ~5,000 RIUs:
- **Status**: 10% open (NEW/OPEN), 90% closed
- **Priority**: 2% critical, 8% high, 30% medium, 60% low
- **Complexity**: 60% simple (2-4d), 30% medium (1-3w), 10% complex (1-3m)
- **RIU linkage**: Primary and related associations via RiuCaseAssociation
- **Case consolidation**: 10% have multiple linked RIUs
- **AI enrichment**: Auto-generated summaries and risk scores
- **Pattern injection**: Repeat subjects, manager hotspots, flagship cases

### 3. Investigation Seeder (`apps/backend/prisma/seeders/investigation.seeder.ts`)

Creates ~5,000 Investigations:
- **Type**: FULL 55%, LIMITED 30%, INQUIRY 15%
- **Department**: HR 35%, Legal 25%, Compliance 20%, Safety 10%, Other 10%
- **Outcome**: 60% substantiation rate
- **Timeline**: Aligned with case complexity
- **Features**:
  - ~10% healthcare cases get regulatory investigations
  - ~10% show mid-investigation reassignment
  - Generated findings, root causes, lessons learned
  - SLA tracking with on-track/warning/overdue status

### 4. seed.ts Integration

Orchestrates complete seed flow:
1. Organization and categories
2. Locations and org structure
3. Employees with hierarchy
4. Demo users
5. RIUs (5,000)
6. Pattern generation
7. Cases (4,500)
8. Retaliation patterns
9. Investigations (~5,000)
10. Demo metrics summary

## Commits

| Hash | Description |
|------|-------------|
| e6099cb | feat(02-05): add pattern generators for realistic demo data |
| 844b861 | feat(02-05): add Case seeder with RIU linkage and patterns |
| 50bac7d | feat(02-05): add Investigation seeder with timelines and outcomes |
| d0b3362 | feat(02-05): integrate Case and Investigation seeders in seed.ts |

## Decisions Made

### 02-05-01: Pattern Injection Approach
**Choice:** Generate patterns first, inject during case creation
**Rationale:** Allows deterministic pattern distribution across cases while maintaining reproducibility through faker.seed()

### 02-05-02: Case-RIU Ratio
**Choice:** 90% RIU-to-Case ratio (4,500 cases from 5,000 RIUs)
**Rationale:** Reflects realistic scenarios where some RIUs don't create cases (campaign responses) and some cases consolidate multiple related RIUs

### 02-05-03: Investigation Outcome Distribution
**Choice:** 60% substantiation rate
**Rationale:** Per CONTEXT.md requirements, matches industry benchmarks for compliance investigations

### 02-05-04: Flagship Case Content
**Choice:** 10 curated cases with complete narratives
**Rationale:** Sales team needs memorable, walkthrough-ready cases for demos. Each case demonstrates different platform capabilities.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended FINDINGS_SUMMARIES**
- **Found during:** Task 4
- **Issue:** InvestigationOutcome enum has 6 values, but FINDINGS_SUMMARIES only had 3
- **Fix:** Added POLICY_VIOLATION, NO_VIOLATION, INSUFFICIENT_EVIDENCE summaries
- **Files modified:** investigation.seeder.ts
- **Commit:** d0b3362

## Verification Results

- TypeScript compiles (pattern generators, case seeder, investigation seeder)
- Pattern generators export correctly via index.ts barrel
- seed.ts orchestrates full seeding flow
- Demo metrics summary displays all targets

## Files Created/Modified

**Created:**
- `apps/backend/prisma/seeders/case.seeder.ts` (714 lines)
- `apps/backend/prisma/seeders/investigation.seeder.ts` (671 lines)
- `apps/backend/prisma/seeders/patterns/repeat-subjects.ts`
- `apps/backend/prisma/seeders/patterns/manager-hotspots.ts`
- `apps/backend/prisma/seeders/patterns/retaliation.ts`
- `apps/backend/prisma/seeders/patterns/flagship-cases.ts`
- `apps/backend/prisma/seeders/patterns/index.ts`

**Modified:**
- `apps/backend/prisma/seed.ts` (added Case/Investigation seeding, patterns, metrics)

## Next Phase Readiness

**Ready for 02-07 (Analytics & Dashboard Metrics):**
- Cases exist with status distribution
- Investigations exist with outcomes
- Pattern data available for analytics
- Flagship cases ready for demo walkthroughs

**Demo Environment Status:**
- 4,500 Cases (10% open, 90% closed)
- ~5,000 Investigations (60% substantiation)
- 50 repeat subjects, 15 hotspot managers
- 10 flagship cases for sales demos
- Recent unread cases for triage demo
