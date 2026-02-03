---
phase: 02-demo-tenant-seed-data
plan: 02
subsystem: database
tags: [prisma, faker, seeding, categories, taxonomy]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Prisma schema with Category model, CategoryModule enum, Severity enum
provides:
  - Category seeder with 32 compliance categories (7 parent, 25 child)
  - seedCategories function returning Map<categoryName, categoryId>
  - Hierarchical taxonomy with materialized paths
  - Severity defaults and SLA days per category type
affects: [02-03-RIU-seeder, 02-04-case-seeder, case-management, disclosures]

# Tech tracking
tech-stack:
  added: []
  patterns: [deterministic-faker-seeding, two-pass-hierarchy-insert, category-taxonomy]

key-files:
  created:
    - apps/backend/prisma/seeders/category.seeder.ts
  modified:
    - apps/backend/prisma/seed.ts

key-decisions:
  - "Children inherit parent severity/SLA defaults for consistency"
  - "Materialized path format: /{parent-slug}/{child-slug}"
  - "Category codes use parent prefix (e.g., HAR-SEX for Sexual Harassment under Harassment)"
  - "faker.seed() offset of +100 from master seed for category reproducibility"

patterns-established:
  - "Seeder factory pattern: async function returns Map for dependent seeders"
  - "Two-pass insert: parents first, then children with parentCategoryId references"
  - "Deterministic seeding: faker.seed(SEED_CONFIG.masterSeed + OFFSET)"

# Metrics
duration: 8min
completed: 2026-02-03
---

# Phase 2 Plan 2: Category Seeder Summary

**Hierarchical category taxonomy seeder with 32 compliance categories (7 parent, 25 child), each configured with severity defaults (HIGH/MEDIUM/LOW) and SLA days (7-30)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-03T06:42:09Z
- **Completed:** 2026-02-03T06:50:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created category seeder with 7 parent categories covering all major compliance areas
- Added 25 child categories with specific violation types under each parent
- Configured severity defaults: HIGH for harassment/fraud/safety, MEDIUM for conflicts/data, LOW for policy/RFI
- Set SLA days: 7 days for safety, 14 days for harassment/RFI, 21 days for fraud/data, 30 days for conflicts/policy
- Integrated seeder into main seed.ts execution order (org -> categories -> users)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create category seeder with compliance taxonomy** - `cac2cfb` (feat)
2. **Task 2: Integrate category seeder into main seed script** - `7c5a036` (feat)

## Files Created/Modified
- `apps/backend/prisma/seeders/category.seeder.ts` - Category seeder with hierarchical taxonomy
- `apps/backend/prisma/seed.ts` - Updated to import and call seedCategories

## Category Taxonomy Created

| Parent Category | Code | Severity | SLA Days | Children |
|-----------------|------|----------|----------|----------|
| Harassment | HAR | HIGH | 14 | Sexual, Discriminatory, Bullying, Retaliation |
| Fraud & Financial | FIN | HIGH | 21 | Financial, Expense, Vendor, Time & Attendance |
| Conflicts of Interest | COI | MEDIUM | 30 | Personal Relationships, Outside Business, Gifts, Board |
| Safety & Health | SAF | HIGH | 7 | Workplace Safety, Environmental, Product Safety, COVID-19 |
| Data & Privacy | DAT | MEDIUM | 21 | Data Breach, Unauthorized Access, HIPAA, Privacy |
| Policy Violations | POL | LOW | 30 | HR Policy, IT Policy, Travel & Expense, General Misconduct |
| Request for Information | RFI | LOW | 14 | General RFI |

## Decisions Made
- Children inherit parent's severity and SLA defaults to maintain consistency within category families
- Category codes use hierarchical format (e.g., HAR-SEX) for easy identification of parent relationship
- Materialized paths use slugified names (e.g., /harassment/sexual-harassment) for human-readable hierarchy
- RFI category has requiresInvestigation: false (only category type without investigation requirement)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Categories are ready for RIU and Case seeding
- seedCategories returns Map<string, string> for dependent seeders to reference category IDs
- Category seeder uses deterministic faker.seed() so re-runs produce identical data

---
*Phase: 02-demo-tenant-seed-data*
*Completed: 2026-02-03*
