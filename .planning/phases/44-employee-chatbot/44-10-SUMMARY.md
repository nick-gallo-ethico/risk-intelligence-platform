---
phase: 44-employee-chatbot
plan: 10
subsystem: api
tags: [nestjs, controller, faq, chatbot, seed-data, rest-api, swagger]

# Dependency graph
requires:
  - phase: 44-02
    provides: FaqService and EscalationService with CRUD operations
  - phase: 44-05
    provides: CaseStatusService for rate-limited access code lookups
  - phase: 44-09
    provides: Portal widget integration and ChatbotModule foundation
provides:
  - ChatbotController with FAQ CRUD REST endpoints
  - ChatbotController with inquiry management endpoints
  - Inquiry DTOs (AssignInquiryDto, ResolveInquiryDto, ListInquiriesDto)
  - Phase 44 demo seed data (6 FAQ entries for Acme Corp)
affects: [phase-45, future-admin-ui, chatbot-admin-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ChatbotController follows policies controller pattern with class-level JwtAuthGuard + TenantGuard"
    - "Inquiry DTOs use Prisma enums directly for type safety"
    - "Phase seeder follows acme-phase-43 standalone pattern with deterministic IDs"

key-files:
  created:
    - apps/backend/src/modules/chatbot/chatbot.controller.ts
    - apps/backend/src/modules/chatbot/dto/inquiry.dto.ts
    - apps/backend/prisma/seeders/acme-phase-44.ts
  modified:
    - apps/backend/src/modules/chatbot/dto/index.ts
    - apps/backend/src/modules/chatbot/chatbot.module.ts
    - apps/backend/prisma/seed.ts

key-decisions:
  - "Controller path 'chatbot' relies on api/v1 global prefix for /api/v1/chatbot/* routes"
  - "FAQ helpful endpoint does not require COMPLIANCE_OFFICER role (allows any authenticated user)"
  - "Inquiry DTOs import enums from @prisma/client for single source of truth"
  - "Seed orchestrator is seed.ts (not a separate seed.orchestrator.ts file)"

patterns-established:
  - "Chatbot admin endpoints: COMPLIANCE_OFFICER + SYSTEM_ADMIN role gating"
  - "Phase seeder with deterministic UUID: 00000044-faq0-4000-8000-{hash}"

# Metrics
duration: 19min
completed: 2026-03-04
---

# Phase 44 Plan 10: FAQ Management Endpoints & Demo Seed Data Summary

**ChatbotController with FAQ CRUD + inquiry management REST endpoints, inquiry DTOs, and 6 Acme Corp FAQ seed entries**

## Performance

- **Duration:** 19 min
- **Started:** 2026-03-04T12:58:37Z
- **Completed:** 2026-03-04T13:17:27Z
- **Tasks:** 4/4
- **Files modified:** 6

## Accomplishments

- ChatbotController with 10 REST endpoints (6 FAQ + 4 inquiry management)
- All admin endpoints protected by COMPLIANCE_OFFICER or SYSTEM_ADMIN role guard
- Full Swagger/OpenAPI annotations on every endpoint
- 6 curated FAQ entries seeded for Acme Corp covering key compliance topics
- Seed script registered in main seed orchestrator (seed.ts)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create inquiry DTOs** - `0f45e88a` (feat)
2. **Task 2: Create ChatbotController** - `68aaaa7e` (feat)
3. **Task 3: Register controller in ChatbotModule** - `5292a283` (feat)
4. **Task 4: Create Phase 44 seed script** - `0a0a2663` (chore)

## Files Created/Modified

- `apps/backend/src/modules/chatbot/dto/inquiry.dto.ts` - AssignInquiryDto, ResolveInquiryDto, ListInquiriesDto
- `apps/backend/src/modules/chatbot/dto/index.ts` - Barrel export updated with inquiry DTOs
- `apps/backend/src/modules/chatbot/chatbot.controller.ts` - ChatbotController with FAQ and inquiry REST endpoints
- `apps/backend/src/modules/chatbot/chatbot.module.ts` - Controller registered, module docstring updated
- `apps/backend/prisma/seeders/acme-phase-44.ts` - Phase 44 FAQ seed data (6 entries)
- `apps/backend/prisma/seed.ts` - Phase 44 seeder registered after Phase 42

## Decisions Made

- **Controller path:** Uses `@Controller("chatbot")` with `api/v1` global prefix, resulting in `/api/v1/chatbot/*` routes
- **FAQ helpful endpoint auth:** The `POST /faq/:id/helpful` endpoint does not require COMPLIANCE_OFFICER role, allowing any authenticated user to provide feedback (all other endpoints are role-restricted)
- **Inquiry DTO enums:** Import `InquiryStatus` and `InquiryPriority` directly from `@prisma/client` rather than re-declaring entity enums
- **Seed orchestrator:** The plan referenced `seed.orchestrator.ts` which does not exist; the actual orchestrator is `seed.ts` in the prisma directory. Registered Phase 44 seeder there.
- **GetInquiry endpoint added:** Added `GET /inquiries/:id` endpoint not explicitly in the plan but implied by the service having `getInquiry()` method - needed for complete CRUD

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Seed orchestrator path correction**

- **Found during:** Task 4 (Create Phase 44 seed script)
- **Issue:** Plan referenced `seed.orchestrator.ts` which does not exist. The actual seed orchestrator is `prisma/seed.ts`.
- **Fix:** Registered the Phase 44 seeder in `seed.ts` instead, following the same pattern as phases 40-42.
- **Files modified:** `apps/backend/prisma/seed.ts`
- **Verification:** TypeScript compiles, seeder import resolves
- **Committed in:** `0a0a2663` (Task 4 commit)

**2. [Rule 1 - Bug] Set spread compatibility fix**

- **Found during:** Task 4 (Create Phase 44 seed script)
- **Issue:** `[...new Set()]` syntax failed TypeScript check in standalone mode due to `downlevelIteration` flag not set for seeder files.
- **Fix:** Changed to `Array.from(new Set())` which works without the flag.
- **Files modified:** `apps/backend/prisma/seeders/acme-phase-44.ts`
- **Verification:** TypeScript compiles clean
- **Committed in:** `0a0a2663` (Task 4 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Minor adaptations for codebase reality. No scope creep.

## Issues Encountered

- Git index lock file left by background commit process required manual cleanup before Task 2 commit. Resolved by removing `.git/index.lock`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 44 (Employee Chatbot) is now COMPLETE with all 10 plans executed
- All chatbot infrastructure in place: schema, services, skills, agent, gateway, widget, controller, seed data
- Ready for Phase 45 (Pattern Detection / AI Intelligence wave continuation)
- No blockers

---

_Phase: 44-employee-chatbot_
_Completed: 2026-03-04_
