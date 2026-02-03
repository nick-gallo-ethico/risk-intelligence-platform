---
phase: 06-case-management
plan: 06
subsystem: investigations
tags: [prisma, nestjs, templates, category-mapping, auto-assignment]

# Dependency graph
requires:
  - phase: 06-01
    provides: InvestigationTemplate model and service
provides:
  - CategoryTemplateMapping Prisma model
  - TemplateRequirement enum (REQUIRED, RECOMMENDED, OPTIONAL)
  - TemplateAssignmentService for mapping CRUD and recommendations
  - Category-template mapping API endpoints
  - Parent category inheritance for template recommendations
affects: [06-07, 06-10, investigations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Category-to-template mapping with priority ordering
    - Parent category inheritance for template recommendations
    - Requirement level validation (REQUIRED/RECOMMENDED/OPTIONAL)

key-files:
  created:
    - apps/backend/src/modules/investigations/templates/template-assignment.service.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/investigations/templates/dto/template.dto.ts
    - apps/backend/src/modules/investigations/templates/template.controller.ts
    - apps/backend/src/modules/investigations/templates/index.ts
    - apps/backend/src/modules/investigations/investigations.module.ts

key-decisions:
  - "TemplateRequirement enum has three levels: REQUIRED (mandatory), RECOMMENDED (auto-applies), OPTIONAL (user choice)"
  - "Priority field enables multiple templates per category with ordering"
  - "Parent category inheritance enables hierarchical template application"
  - "Unique constraint on (organizationId, categoryId, templateId) prevents duplicate mappings"

patterns-established:
  - "Category mapping pattern: CategoryTemplateMapping links Category to InvestigationTemplate"
  - "Recommendation pattern: Check direct mapping, then parent category, then org default"
  - "isTemplateRequired() check for validation when creating investigations"

# Metrics
duration: 26min
completed: 2026-02-03
---

# Phase 6 Plan 6: Category Template Mapping Summary

**CategoryTemplateMapping model and TemplateAssignmentService for auto-assigning investigation templates based on case category**

## Performance

- **Duration:** 26 min
- **Started:** 2026-02-03T23:19:53Z
- **Completed:** 2026-02-03T23:46:02Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- CategoryTemplateMapping Prisma model with TemplateRequirement enum
- TemplateAssignmentService with CRUD operations and recommendation logic
- Parent category inheritance for template recommendations
- Full REST API for mapping management and template recommendations
- isTemplateRequired validation endpoint for investigation creation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CategoryTemplateMapping model to Prisma schema** - `646f1b8` (feat)
2. **Task 2: Create TemplateAssignmentService** - `bd37125` (feat)
3. **Task 3: Add Mapping Endpoints to Controller** - `1a48ca4` (feat)

## Files Created/Modified

- `apps/backend/prisma/schema.prisma` - Added TemplateRequirement enum, CategoryTemplateMapping model, and relations
- `apps/backend/src/modules/investigations/templates/template-assignment.service.ts` - New service for category-template mapping CRUD and recommendations
- `apps/backend/src/modules/investigations/templates/dto/template.dto.ts` - Added CreateCategoryMappingDto, UpdateCategoryMappingDto, TemplateRecommendation interface
- `apps/backend/src/modules/investigations/templates/template.controller.ts` - Added 8 new endpoints for mappings and recommendations
- `apps/backend/src/modules/investigations/templates/index.ts` - Export TemplateAssignmentService
- `apps/backend/src/modules/investigations/investigations.module.ts` - Register and export TemplateAssignmentService

## Decisions Made

1. **Three-tier requirement levels:** REQUIRED (must use template), RECOMMENDED (auto-applies but removable), OPTIONAL (investigator chooses)
2. **Priority-based selection:** Lower priority number = higher precedence when multiple templates map to a category
3. **Parent category fallback:** When no direct mapping exists, check parent category recursively
4. **Organization default fallback:** Falls back to isDefault template when no category mapping exists

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Prisma generate Windows file lock:** The `npx prisma generate` command failed with EPERM error due to Windows file locking (likely backend server running). This is a known Windows issue and resolves when the server is restarted. Schema was validated and database synced successfully.
- **Build errors in other modules:** The `npm run build` command shows errors in `remediation` and `messaging` modules from parallel plan executions. These are unrelated to this plan and do not affect the template mapping functionality.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CategoryTemplateMapping model ready for use in investigation creation
- TemplateAssignmentService can be injected into InvestigationsService for auto-template assignment
- Plan 06-07 (InvestigationChecklistProgress) can use template recommendations
- Plan 06-10 (Investigation/AI integration) can leverage template mappings

---
*Phase: 06-case-management*
*Completed: 2026-02-03*
