---
phase: 06-case-management
plan: 07
subsystem: investigations
tags: [checklist, progress-tracking, prisma, nestjs]

# Dependency graph
requires:
  - phase: 06-01
    provides: InvestigationTemplate model with sections JSON schema
provides:
  - InvestigationChecklistProgress Prisma model for per-investigation tracking
  - InvestigationChecklistService with complete progress management
  - REST controller at /api/v1/investigation-checklists
  - hasActiveInstances() for template versioning support
affects: [06-08, 06-09, investigations-ui, investigation-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Template version snapshot at creation (immutable)
    - JSON state tracking (itemStates, sectionStates)
    - Custom item addition pattern
    - Skip with reason pattern (N/A handling)
    - Progress metrics denormalization

key-files:
  created:
    - apps/backend/prisma/schema.prisma (InvestigationChecklistProgress model)
    - apps/backend/src/modules/investigations/checklists/checklist.service.ts
    - apps/backend/src/modules/investigations/checklists/checklist.controller.ts
    - apps/backend/src/modules/investigations/checklists/dto/checklist.dto.ts
    - apps/backend/src/modules/investigations/checklists/index.ts
  modified:
    - apps/backend/src/modules/investigations/investigations.module.ts

key-decisions:
  - "Template version captured at apply time - in-flight checklists continue on original version"
  - "Item completion supports notes, attachments, and linked interviews"
  - "Custom items can be added to any section"
  - "Required items cannot be skipped - validation enforced"
  - "Progress percentage excludes skipped items from denominator"
  - "Section state tracks both completed count and status (pending/in_progress/completed)"

patterns-established:
  - "ChecklistItemState interface for item tracking with completion metadata"
  - "CustomItem interface for investigator-added items"
  - "SkippedItem interface with mandatory reason"
  - "Progress metrics denormalization for efficient queries"

# Metrics
duration: 32min
completed: 2026-02-03
---

# Phase 6 Plan 7: Investigation Checklist Progress Summary

**Per-investigation checklist tracking with template version snapshot, item completion states, custom items, and progress metrics**

## Performance

- **Duration:** 32 min
- **Started:** 2026-02-03T23:23:50Z
- **Completed:** 2026-02-03T23:55:39Z
- **Tasks:** 3
- **Files created:** 5
- **Files modified:** 1

## Accomplishments

- InvestigationChecklistProgress Prisma model with template version snapshot
- Complete item state tracking with notes, attachments, and interview links
- Custom item addition and skip with reason (N/A) support
- Progress metrics denormalized for efficient UI queries
- REST controller with full CRUD operations

## Task Commits

Each task was committed atomically:

1. **Task 1: Add InvestigationChecklistProgress model** - `6dc589f` (feat)
2. **Task 2: Create Checklist DTOs and Service** - `361a5f1` (feat)
3. **Task 3: Create Controller and Wire Module** - `c1ffe91` (feat)

## Files Created/Modified

- `apps/backend/prisma/schema.prisma` - InvestigationChecklistProgress model with relations
- `apps/backend/src/modules/investigations/checklists/dto/checklist.dto.ts` - Type definitions and DTOs
- `apps/backend/src/modules/investigations/checklists/checklist.service.ts` - Complete progress management
- `apps/backend/src/modules/investigations/checklists/checklist.controller.ts` - REST endpoints
- `apps/backend/src/modules/investigations/checklists/index.ts` - Module exports
- `apps/backend/src/modules/investigations/investigations.module.ts` - Service and controller wiring

## Decisions Made

1. **Template version immutability** - templateVersion is captured at apply time and never changes, ensuring investigators complete their checklist as it was when started, even if template is updated
2. **Progress calculation excludes skipped** - progressPercent = completedItems / (totalItems - skippedCount), so skipping items doesn't artificially inflate progress
3. **Section state tracking** - Each section tracks its own completedItems and totalItems, with status derived (pending -> in_progress -> completed)
4. **Custom items belong to sections** - Custom items are added to a specific section and appear after the template items in order

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **Prisma generate Windows file lock** - The `prisma generate` command failed with EPERM due to Windows file locking on the query engine DLL. This is a known issue when another process has the file open. The database sync completed successfully, and the Prisma client will regenerate on next successful attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Checklist progress tracking is fully functional
- hasActiveInstances() method available for template service to implement version-on-publish pattern
- Ready for UI integration and investigation workflow integration
- Suggestion: Plan 06-08 (Evidence Management) may want to link attachments to checklist items

---
*Phase: 06-case-management*
*Completed: 2026-02-03*
