---
plan: 02-03
phase: 02-demo-tenant-seed-data
title: "Organization Structure Seeder"
completed: 2026-02-03
duration: 18 min
subsystem: seed-data
tags: [seed, organization, employees, locations, hierarchy]
---

# Phase 2 Plan 3: Organization Structure Seeder Summary

**One-liner:** 20K employee hierarchy across 52 global locations with 4-level org structure and named executive personas.

## What Was Built

### Prisma Schema Models (Task 1)

Added 6 new models and 5 enums to support organizational structure:

**Models:**
- `Location` - Physical offices with real cities and fictional addresses
- `Division` - Top-level business segments (Healthcare, Tech, Retail, Energy)
- `BusinessUnit` - Sub-segments within divisions
- `Department` - Functional areas within business units
- `Team` - Smallest organizational unit
- `Employee` - HRIS-synced employee records with full reporting chains

**Enums:**
- `JobLevel` - IC, MANAGER, DIRECTOR, VP, SVP, C_SUITE
- `WorkMode` - ONSITE, REMOTE, HYBRID
- `ComplianceRole` - CCO, INVESTIGATOR, HRBP, LEGAL_COUNSEL, ETHICS_COMMITTEE
- `EmploymentStatus` - ACTIVE, INACTIVE, ON_LEAVE, TERMINATED
- `EmploymentType` - FULL_TIME, PART_TIME, CONTRACTOR, TEMPORARY, INTERN

### Location Seeder (Task 2)

Created 52 global locations across 3 regions:
- **US (25):** NYC-HQ, Chicago, LA, SF, Boston, Dallas, Houston, Miami, Atlanta, Seattle, Denver, Phoenix, Philadelphia, Minneapolis, Detroit, Charlotte, Nashville, San Diego, Portland, Austin, Raleigh, Tampa, Indianapolis, Columbus, St. Louis
- **EMEA (15):** LON-HQ, Frankfurt, Paris, Amsterdam, Madrid, Milan, Dublin, Munich, Zurich, Stockholm, Copenhagen, Brussels, Vienna, Prague, Warsaw
- **APAC (12):** TYO-HQ, Singapore, Sydney, Melbourne, Shanghai, Beijing, Hong Kong, Seoul, Bangalore, Mumbai, Manila, Auckland

Each location has accurate timezone and fictional "Acme" addresses.

### Division Structure Seeder (Task 3)

Created 4-level hierarchy:
- **4 Divisions:** Healthcare (50%), Tech (20%), Retail (20%), Energy (10%)
- **~10 Business Units:** Hospital Services, Pharmaceuticals, Medical Devices, Software Products, Cloud Services, Store Operations, E-Commerce, Renewable Energy, Traditional Energy
- **~25 Departments:** Nursing, Clinical, R&D, Manufacturing, Development, Product, etc.
- **~60 Teams:** ICU, ER, Platform, Mobile, SRE, etc.

Division-specific work modes:
- Healthcare: 80% onsite, 15% hybrid, 5% remote
- Tech: 60% remote, 30% hybrid, 10% onsite
- Retail: 50% onsite, 40% hybrid, 10% remote
- Energy: 40% onsite, 40% hybrid, 20% remote

### Employee Seeder (Tasks 4-5)

Created 20,000 employees with full reporting chains:

**Named Executive Personas (memorable for demos):**
- C-Suite: Bob Chen (CEO), Sarah Mitchell (CFO), Michael Rodriguez (COO), Jennifer Park (CTO), Maggie Thompson (CCO), David Okonkwo (CLO), Elena Vasquez (CHRO)
- Division VPs: Bill Harrison (Healthcare), Priya Sharma (Tech), Jim O'Brien (Retail), Fatima Al-Hassan (Energy)
- Compliance Team: Tom Washington (Lead), Angela Martinez, Kevin Nguyen, Lisa Johnson, Marcus Williams
- Regional HRBPs: Rachel Foster (US), Hans Mueller (EMEA), Yuki Tanaka (APAC)

**Hierarchy Generation:**
1. C-Suite (7) - CEO has no manager, others report to CEO
2. Division VPs (4) - Report to COO
3. Compliance Team (~6) - Report to CCO
4. Regional HRBPs (3) - Report to CHRO
5. BU Heads (~10) - Report to Division VPs
6. Department Heads (~25) - Report to BU Heads
7. Team Leads (~60) - Report to Department Heads
8. Bulk Employees (~19,850) - Report to Team Leads

**Distribution:**
- By division weight: Healthcare 50%, others per CONTEXT.md
- By region: US 50%, EMEA 30%, APAC 20%
- Job levels: IC 85%, Manager 10%, Director 4%, VP 1%
- Employment status: Active 95%, On Leave 3%, Inactive 2%
- Tenure: 1-15 years, weighted toward 2-5 years

**Multi-language support:**
- US: 95% English, 5% Spanish
- EMEA: English, German, French, Spanish, Italian, Dutch, Polish, Swedish
- APAC: English, Japanese, Mandarin, Korean, Hindi, Tagalog

### Main Seed Script Integration (Task 6)

Updated `seed.ts` to orchestrate all seeders in correct order:
1. Create/upsert organization
2. Seed categories
3. Seed locations (52)
4. Seed divisions/BUs/departments/teams
5. Seed employees (20,000)
6. Seed demo users

## Commits

| Hash | Message |
|------|---------|
| 41974d0 | feat(02-03): add Location and organizational structure models to Prisma schema |
| ef4cd73 | feat(02-03): create location seeder with 52 global locations |
| a14ecdc | feat(02-03): create division/BU/department/team structure seeder |
| 6e18ba2 | feat(02-03): create employee seeder with 20K employees and named personas |
| c32fdbb | feat(02-03): integrate all seeders into main seed script |

## Key Files

**Created:**
- `apps/backend/prisma/seeders/location.seeder.ts` - 52 global locations
- `apps/backend/prisma/seeders/division.seeder.ts` - 4-level org hierarchy
- `apps/backend/prisma/seeders/employee.seeder.ts` - 20K employees with named personas

**Modified:**
- `apps/backend/prisma/schema.prisma` - Added Location, Division, BusinessUnit, Department, Team, Employee models
- `apps/backend/prisma/seed.ts` - Integrated all seeders

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 52 locations instead of 50+ | Added 2 extra to round out APAC coverage |
| Employee batch size of 500 | Balances memory usage and database performance |
| Named personas first approach | Ensures stable IDs for manager references |
| Deterministic seeding via faker.seed() | Reproducible data across runs |

## Verification Results

- [x] Prisma generates successfully
- [x] TypeScript compiles without errors
- [x] Location model has all fields (region, timezone, real cities)
- [x] Division/BU/Department/Team hierarchy correct (4 levels)
- [x] Employee model has job levels, work modes, compliance roles
- [x] Division weights respected in employee distribution
- [x] Named executives memorable with appropriate roles
- [x] Multi-language workforce matches geographic distribution
- [x] Work modes match division patterns

## Next Phase Readiness

Ready for:
- **02-04:** RIU seeder can now reference locations and employees
- **02-05:** Case seeder can use org structure for routing
- **Future:** Employee lookups for case subjects, HRBP assignment

## Technical Notes

- Employee seeder uses batch inserts (500 per batch) for performance
- Full 20K seed may take 2-5 minutes depending on database
- All IDs are UUIDs generated via faker for determinism
- Manager names are denormalized for display performance
