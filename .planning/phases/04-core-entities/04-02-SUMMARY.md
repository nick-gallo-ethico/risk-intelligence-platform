---
phase: 04-core-entities
plan: 02
subsystem: database
tags: [prisma, postgres, person, employee, hris, manager-hierarchy]

# Dependency graph
requires:
  - phase: 04-core-entities
    provides: Person model, PersonsService, PersonType enums
  - phase: 02-demo-tenant-seed-data
    provides: Employee model with manager self-reference
provides:
  - Person-Employee linkage via employeeId FK
  - Denormalized Employee fields on Person for filtering
  - Manager hierarchy navigation (PersonManager self-reference)
  - createFromEmployee with recursive manager chain creation
  - syncFromEmployee for HRIS updates
affects: [hris-integration, case-management, org-chart-views, reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Denormalized fields for filtering without joins"
    - "Recursive manager chain creation"
    - "Self-referential relation for org hierarchy"

key-files:
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/persons/persons.service.ts
    - apps/backend/src/modules/persons/dto/create-person.dto.ts
    - apps/backend/src/modules/persons/dto/update-person.dto.ts

key-decisions:
  - "Denormalize key Employee fields to Person for filtering/display performance"
  - "Manager Person ID stored (not Employee ID) for org chart navigation at Person level"
  - "createFromEmployee recursively creates manager chain if missing"
  - "syncFromEmployee updates denormalized fields but preserves type/source immutability"
  - "maxDepth=10 protects against infinite loops in getManagerChain"

patterns-established:
  - "HRIS sync pattern: createFromEmployee() with recursive manager resolution"
  - "Denormalized name fields for display without joins (managerName, businessUnitName, locationName)"

# Metrics
duration: 10min
completed: 2026-02-03
---

# Phase 4 Plan 02: Person-Employee Linkage Summary

**Person-Employee linkage with denormalized fields for HRIS sync and org chart navigation**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-03T09:18:37Z
- **Completed:** 2026-02-03T09:28:51Z
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments
- Person model enhanced with Employee relation and denormalized fields
- Manager self-reference enables org chart traversal at Person level
- createFromEmployee method with recursive manager chain creation
- syncFromEmployee method for HRIS change propagation
- getManagerChain and getDirectReports for hierarchy navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Employee-related fields to Person model** - `4645056` (feat)
2. **Task 2: Update PersonsService with Employee linkage methods** - `9ea4c13` (feat)
3. **Task 3: Run migration for Employee linkage fields** - (db push, Prisma client regenerated)

## Files Created/Modified

### Modified
- `apps/backend/prisma/schema.prisma` - Added Employee relation to Person, denormalized fields (businessUnitId/Name, jobTitle, employmentStatus, locationId/Name, managerId/Name), PersonManager self-reference, personRecords relation on Employee
- `apps/backend/src/modules/persons/persons.service.ts` - Added createFromEmployee, syncFromEmployee, findByEmployeeId, getManagerChain, getDirectReports methods
- `apps/backend/src/modules/persons/dto/create-person.dto.ts` - Added optional denormalized Employee fields
- `apps/backend/src/modules/persons/dto/update-person.dto.ts` - Added optional denormalized Employee fields

## Decisions Made

- **Denormalized fields:** businessUnitId/Name, jobTitle, employmentStatus, locationId/Name, managerId/Name copied from Employee for filtering and display without joins
- **Manager ID type:** managerId on Person references another Person ID (not Employee ID) to enable org chart navigation purely at the Person level
- **Recursive creation:** createFromEmployee recursively ensures manager's Person exists before creating the employee's Person
- **Sync boundary:** syncFromEmployee updates denormalized fields but cannot change type or source (they remain EMPLOYEE/HRIS_SYNC)
- **Loop protection:** getManagerChain has maxDepth=10 to prevent infinite recursion in circular hierarchies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in case-merge.service.ts (unrelated to this plan) - confirmed persons module compiles correctly
- Prisma migrate dev fails in non-interactive mode - used `db push` for development which successfully synced schema

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Person-Employee linkage complete and ready for HRIS integration
- Org chart navigation available via getManagerChain/getDirectReports
- Denormalized fields enable efficient filtering by business unit, location, etc.
- Foundation ready for case subject linking and pattern detection

---
*Phase: 04-core-entities*
*Completed: 2026-02-03*
