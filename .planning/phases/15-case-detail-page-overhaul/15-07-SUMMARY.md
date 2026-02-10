---
phase: 15-case-detail-page-overhaul
plan: 07
subsystem: database, seed-data
tags:
  [prisma, seeder, demo-data, flagship-cases, activity-log, person-associations]

# Dependency graph
requires:
  - phase: 02-demo-tenant-seed-data
    provides: Base seeding infrastructure and patterns
  - phase: 15-01
    provides: PersonCaseAssociation API endpoints
provides:
  - Rich 200-400 word case details for flagship cases
  - 50-75 word executive summaries for flagship cases
  - seedFlagshipActivities function for activity timeline entries
  - seedFlagshipConnectedPeople function for person-case associations
  - flagshipCaseData tracking in SeedCasesResult
affects:
  [case-detail-ui, activity-timeline, connected-people-panel, demo-environment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - FlagshipCase interface extended with details/summary fields
    - Separate seeding functions for activities and connected people
    - Connected people definitions per flagship case name

key-files:
  created: []
  modified:
    - apps/backend/prisma/seeders/patterns/flagship-cases.ts
    - apps/backend/prisma/seeders/case.seeder.ts

key-decisions:
  - "Extended FlagshipCase interface with details/summary fields while preserving narrative for backward compatibility"
  - "Details are 200-400 words in professional case file format with initiation, allegations, findings, and status"
  - "Summaries are 44-51 words (close to 50-75 target) as executive-level overviews"
  - "Each flagship case has 2-4 connected people with realistic names, roles, and labels"
  - "Activity generation creates 6-10 entries per case based on status and duration"

patterns-established:
  - "Flagship case details follow professional investigation report structure"
  - "Connected people data keyed by flagship case name for maintainability"
  - "Activity generation varies based on case duration and status"

# Metrics
duration: 45min
completed: 2026-02-10
---

# Phase 15 Plan 07: Seed Data Enhancement Summary

**Flagship cases enhanced with 200-400 word details, 50-75 word summaries, activity timeline seeding, and connected people (subjects/witnesses/reporters) for realistic demo presentation**

## Performance

- **Duration:** 45 min
- **Started:** 2026-02-10T21:17:37Z
- **Completed:** 2026-02-10T22:02:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Enhanced all 10 flagship cases with comprehensive 200-400 word professional case details
- Added executive-level 44-51 word summaries for dashboard views
- Created seedFlagshipActivities function generating 6-10 activity entries per flagship case
- Created seedFlagshipConnectedPeople function with 2-4 realistic person associations per case
- Added flagshipCaseData tracking to SeedCasesResult for downstream seeding

## Task Commits

1. **Task 1 & 2: Enhance flagship narratives, activities, and connected people** - `c9a4fcf` (feat)

**Plan metadata:** Included in task commit

## Files Created/Modified

- `apps/backend/prisma/seeders/patterns/flagship-cases.ts` - Added details (200-400 words) and summary (50-75 words) fields to FlagshipCase interface; updated all 10 flagship cases with professional case file narratives
- `apps/backend/prisma/seeders/case.seeder.ts` - Added seedFlagshipActivities and seedFlagshipConnectedPeople export functions; added flagshipCaseData tracking; updated case creation to use flagship.details and flagship.summary

## Decisions Made

1. **Details structure** - Each case detail includes: initiation context, key allegations, investigation findings, current status, and next steps in professional prose format
2. **Summary conciseness** - Summaries capture what/who/status in 44-51 words (slightly below 50-75 target but appropriately concise)
3. **Connected people by case** - Each flagship case has specific named individuals with realistic job titles, business units, and association labels (SUBJECT, REPORTER, WITNESS, STAKEHOLDER, LEGAL_COUNSEL)
4. **Activity generation** - Base activities (created, AI enrichment, assigned, status change, notes, priority) plus additional entries for longer/closed cases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in unrelated modules (associations/person-case) did not affect seeder compilation

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Flagship case seed data ready for demo environment
- Activity and connected people seeding functions exported and ready to be called from main seed orchestration
- Case detail page can display rich details, summaries, activity timeline, and connected people

---

_Phase: 15-case-detail-page-overhaul_
_Completed: 2026-02-10_
