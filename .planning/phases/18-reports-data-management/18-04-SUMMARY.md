---
phase: 18-reports-data-management
plan: 04
subsystem: database
tags: [prisma, seeder, reports, templates, demo-data]

# Dependency graph
requires:
  - phase: 18-01
    provides: SavedReport Prisma model with full configuration fields
provides:
  - 10 pre-built report templates for common compliance reporting
  - 5 sample user reports for demo CCO
  - Idempotent seeder pattern for report templates
affects: [18-05, 18-06, demo-environment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase seeder pattern with faker.seed() for reproducibility"
    - "Prisma.JsonNull for nullable JSON fields in create"

key-files:
  created:
    - apps/backend/prisma/seeders/acme-phase-18.ts

key-decisions:
  - "10 templates across 3 categories: compliance (6), operations (3), executive (1)"
  - "Template configs include complete visualization settings for immediate use"
  - "Idempotent seeder uses findFirst check before create"

patterns-established:
  - "Report template structure: entityType + columns + filters + groupBy + aggregation + visualization"
  - "Template categories: compliance, operations, executive"

# Metrics
duration: 15min
completed: 2026-02-11
---

# Phase 18 Plan 04: Report Templates Seeder Summary

**10 pre-built compliance report templates and 5 sample user reports seeded for Acme Co. demo tenant**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-11T20:40:02Z
- **Completed:** 2026-02-11T20:55:00Z
- **Tasks:** 1
- **Files created:** 1

## Accomplishments

- Created acme-phase-18.ts seeder with 10 pre-built report templates
- Templates cover all common compliance reporting needs (case volume, SLA, trends, workload)
- Added 5 sample user reports for demo CCO to demonstrate personal saved reports
- Idempotent seeder pattern prevents duplicate records on re-runs

## Task Commits

Task was committed as part of prior 18-06 work:

1. **Task 1: Pre-built report templates seeder** - `0d940af` (feat)

## Files Created

- `apps/backend/prisma/seeders/acme-phase-18.ts` - Phase 18 seeder with report templates and sample reports

## Report Templates Created

### Compliance Category (6 templates)

1. **Case Volume by Category** - Bar chart showing case distribution across categories
2. **Time-to-Close Trends** - Line chart tracking monthly case closure time
3. **SLA Compliance Rate** - KPI showing percentage meeting SLA targets
4. **Disclosure Completion Rates** - Stacked bar of campaign completion status
5. **Anonymous vs Named Reports** - Pie chart of reporter type distribution
6. **RIU Intake Trends** - Line chart of monthly intake volume

### Operations Category (3 templates)

7. **Open Cases by Priority** - Bar chart of open cases by severity
8. **Cases by Location/Region** - Bar chart of cases by business unit
9. **Investigator Workload** - Bar chart of active investigations per assignee

### Executive Category (1 template)

10. **Quarterly Board Summary** - Comprehensive table for board presentations

## Sample User Reports (5)

1. **My Open Cases** - Table of open cases for quick status review
2. **Q4 2025 Harassment Cases** - Filtered harassment cases for trend analysis
3. **Monthly RIU Volume** - Line chart of intake volume
4. **Top 10 Repeat Subjects** - Table identifying pattern individuals
5. **Campaign Compliance Score** - Bar chart of campaign completion rates

## Decisions Made

- **Template Categories:** Used compliance/operations/executive for clear organization
- **Complete Configurations:** Each template includes full visualization config (colors, axes, legends) for immediate use
- **Idempotent Pattern:** findFirst check before create prevents duplicates

## Deviations from Plan

None - plan executed exactly as written. The seeder file was created following the established acme-phase-17.ts pattern.

Note: Task was completed as part of commit 0d940af (18-06) which bundled multiple Phase 18 tasks together.

## Issues Encountered

None - seeder created without issues. Backend TypeScript compiles cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Report templates seeded and ready for demo
- Frontend report designer can use templates as starting points
- Demo CCO user has sample reports to demonstrate personal report feature

---

_Phase: 18-reports-data-management_
_Completed: 2026-02-11_
