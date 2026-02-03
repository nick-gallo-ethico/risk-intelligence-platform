---
phase: 04-core-entities
plan: 01
subsystem: database
tags: [prisma, postgres, person, hris, pattern-detection]

# Dependency graph
requires:
  - phase: 01-foundation-infrastructure
    provides: PrismaModule, ActivityService, EventEmitter2
provides:
  - Person Prisma model with type, source, anonymity tier enums
  - PersonsModule with CRUD operations
  - Anonymous placeholder singleton pattern
  - Email-based person lookup for intake matching
affects: [04-core-entities, 05-ai-infrastructure, case-management, riu-intake]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HubSpot Contact equivalent for compliance platform"
    - "Anonymous placeholder singleton per organization"

key-files:
  created:
    - apps/backend/prisma/schema.prisma (Person model, enums)
    - apps/backend/src/modules/persons/persons.module.ts
    - apps/backend/src/modules/persons/persons.service.ts
    - apps/backend/src/modules/persons/persons.controller.ts
    - apps/backend/src/modules/persons/dto/create-person.dto.ts
    - apps/backend/src/modules/persons/dto/update-person.dto.ts
    - apps/backend/src/modules/persons/dto/person-query.dto.ts
    - apps/backend/src/modules/persons/types/person.types.ts
  modified:
    - apps/backend/src/app.module.ts

key-decisions:
  - "PersonType enum: EMPLOYEE, EXTERNAL_CONTACT, ANONYMOUS_PLACEHOLDER"
  - "PersonSource enum: HRIS_SYNC, MANUAL, INTAKE_CREATED"
  - "AnonymityTier enum: ANONYMOUS, CONFIDENTIAL, OPEN"
  - "Email unique constraint within organization (allows NULL)"
  - "type and source immutable after creation"

patterns-established:
  - "Anonymous placeholder singleton: getOrCreateAnonymousPlaceholder()"
  - "Email lookup pattern: findByEmail() returns null if not found"

# Metrics
duration: 9min
completed: 2026-02-03
---

# Phase 4 Plan 01: Person Entity Summary

**Person entity model with type/source/anonymity classification for people-based pattern detection (HubSpot Contact equivalent)**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-03T09:00:29Z
- **Completed:** 2026-02-03T09:10:01Z
- **Tasks:** 3/3
- **Files modified:** 10

## Accomplishments
- Person model with PersonType, PersonSource, AnonymityTier, PersonStatus enums
- PersonsModule providing CRUD operations with tenant isolation
- Anonymous placeholder singleton pattern for anonymous report pattern detection
- Email-based person lookup for intake matching

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Person model and enums to Prisma schema** - `ba45bd3` (feat)
2. **Task 2: Create PersonsModule with service and controller** - `4933fe2` (feat)
3. **Task 3: Run migration and generate Prisma client** - (db push, no code commit)

## Files Created/Modified

### Created
- `apps/backend/prisma/schema.prisma` - Added Person model with 4 enums and PERSON to AuditEntityType
- `apps/backend/src/modules/persons/persons.module.ts` - NestJS module exporting PersonsService
- `apps/backend/src/modules/persons/persons.service.ts` - CRUD operations, anonymous placeholder, email lookup
- `apps/backend/src/modules/persons/persons.controller.ts` - REST API endpoints for Person management
- `apps/backend/src/modules/persons/dto/create-person.dto.ts` - DTO with type, source, identity fields
- `apps/backend/src/modules/persons/dto/update-person.dto.ts` - Partial update (excludes immutable type/source)
- `apps/backend/src/modules/persons/dto/person-query.dto.ts` - Filtering and pagination parameters
- `apps/backend/src/modules/persons/types/person.types.ts` - TypeScript types for PersonWithRelations
- `apps/backend/src/modules/persons/dto/index.ts` - DTO exports
- `apps/backend/src/modules/persons/index.ts` - Module exports

### Modified
- `apps/backend/src/app.module.ts` - Registered PersonsModule

## Decisions Made

- **PersonType values:** EMPLOYEE (links to HRIS), EXTERNAL_CONTACT (vendors, contractors, customers), ANONYMOUS_PLACEHOLDER (singleton for pattern detection)
- **PersonSource values:** HRIS_SYNC (from integration), MANUAL (user created), INTAKE_CREATED (auto-created during RIU intake)
- **AnonymityTier values:** ANONYMOUS (no identity), CONFIDENTIAL (limited roles), OPEN (case team visible)
- **Immutable fields:** type and source cannot be changed after creation (like RIU immutability pattern)
- **Unique email constraint:** Email must be unique within organization (PostgreSQL allows multiple NULLs)
- **Role requirements:** Create requires COMPLIANCE_OFFICER, SYSTEM_ADMIN, or TRIAGE_LEAD; Update requires COMPLIANCE_OFFICER or SYSTEM_ADMIN

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Prisma migrate dev fails in non-interactive mode - used `db push` for development as recommended in plan verification section

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Person entity foundation complete
- Ready for RIU and Case integration to link persons
- Anonymous placeholder pattern available for anonymous report handling
- PersonsService exported for use by other modules

---
*Phase: 04-core-entities*
*Completed: 2026-02-03*
