---
phase: 04-core-entities
plan: 09
subsystem: database
tags: [prisma, associations, hubspot-pattern, rls, nestjs]

# Dependency graph
requires:
  - phase: 04-01
    provides: Person entity model with type and source tracking
  - phase: 04-04
    provides: RIU entity model with status and immutability
  - phase: 04-07
    provides: Case entity model with pipeline and merge support
provides:
  - PersonCaseAssociation model with evidentiary status and validity periods
  - PersonRiuAssociation model for intake mentions
  - CaseCaseAssociation model for hierarchy/splits/merges
  - PersonPersonAssociation model for COI detection
  - AssociationsModule with all four services
affects: [05-ai-integration, 06-case-management, 07-search, 08-reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - First-class associations (HubSpot V4 pattern)
    - Evidentiary vs role association semantics
    - Bidirectional relationship handling

key-files:
  created:
    - apps/backend/src/modules/associations/associations.module.ts
    - apps/backend/src/modules/associations/person-case/person-case-association.service.ts
    - apps/backend/src/modules/associations/person-riu/person-riu-association.service.ts
    - apps/backend/src/modules/associations/case-case/case-case-association.service.ts
    - apps/backend/src/modules/associations/person-person/person-person-association.service.ts
    - apps/backend/prisma/migrations/20260203050829_add_association_entities/migration.sql
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/app.module.ts

key-decisions:
  - "Evidentiary labels (REPORTER, SUBJECT, WITNESS) use status field per CONTEXT.md"
  - "Role labels (INVESTIGATOR, COUNSEL) use validity periods (startedAt, endedAt)"
  - "PersonPersonAssociation normalizes symmetric relationships (personAId < personBId)"
  - "All associations have RLS policies for tenant isolation"

patterns-established:
  - "Evidentiary associations are permanent records with status outcomes, never 'end'"
  - "Role associations have explicit endedAt + endedReason for audit trail"
  - "Association services emit domain events for audit and notification integration"

# Metrics
duration: 13min
completed: 2026-02-03
---

# Phase 4 Plan 9: First-Class Association Entities Summary

**HubSpot V4 association pattern with PersonCaseAssociation, PersonRiuAssociation, CaseCaseAssociation, and PersonPersonAssociation models supporting evidentiary status and validity periods**

## Performance

- **Duration:** 13 min
- **Started:** 2026-02-03T09:56:57Z
- **Completed:** 2026-02-03T10:10:24Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- Four first-class association entity models in Prisma schema with proper enums
- Association services with distinct semantics for evidentiary vs role associations
- Migration with RLS policies for tenant isolation on all association tables
- COI detection support via PersonPersonAssociation with relationship sources

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Association models to Prisma schema** - `844eaa7` (feat)
2. **Task 2: Create Association services** - `32c4716` (feat)
3. **Task 3: Run migration for Association tables** - `6d8affc` (chore)

## Files Created/Modified
- `apps/backend/prisma/schema.prisma` - Added 6 enums and 4 association models with relations
- `apps/backend/src/modules/associations/associations.module.ts` - Module exporting all services
- `apps/backend/src/modules/associations/person-case/person-case-association.service.ts` - Person-Case CRUD with evidentiary/role semantics
- `apps/backend/src/modules/associations/person-riu/person-riu-association.service.ts` - Person-RIU mentions tracking
- `apps/backend/src/modules/associations/case-case/case-case-association.service.ts` - Case hierarchy and splits
- `apps/backend/src/modules/associations/person-person/person-person-association.service.ts` - Relationship management for COI detection
- `apps/backend/src/app.module.ts` - Registered AssociationsModule
- `apps/backend/prisma/migrations/20260203050829_add_association_entities/migration.sql` - Database migration with RLS

## Decisions Made
- Evidentiary labels (REPORTER, SUBJECT, WITNESS) use status field (ACTIVE, CLEARED, SUBSTANTIATED, WITHDRAWN) per CONTEXT.md decision
- Role labels (ASSIGNED_INVESTIGATOR, LEGAL_COUNSEL, etc.) use validity periods with endedAt timestamp
- PersonPersonAssociation normalizes symmetric relationships by sorting personAId < personBId alphabetically
- All services emit domain events for integration with audit and notification systems
- CaseCaseAssociation supports bidirectional labels (PARENT/CHILD, SPLIT_FROM/SPLIT_TO)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Prisma migrate dev requires interactive terminal - used `db push` then created migration manually
- Initial service code had invalid `OR2` Prisma syntax - linter auto-fixed to proper `AND` with nested `OR` structure

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Association entities ready for use in Case Management workflows
- PersonCaseAssociation integrates with investigation assignment
- PersonPersonAssociation ready for COI detection in disclosure workflows
- CaseCaseAssociation supports case merge and split operations from Plan 04-07

---
*Phase: 04-core-entities*
*Completed: 2026-02-03*
