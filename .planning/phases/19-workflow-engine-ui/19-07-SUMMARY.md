---
phase: 19-workflow-engine-ui
plan: 07
subsystem: ui
tags: [workflow, react, workflow-status, entity-detail, seed-data, demo]

# Dependency graph
requires:
  - phase: 19-05
    provides: Workflow builder property panels and pages
  - phase: 19-06
    provides: Workflow progress indicator component and instances page
provides:
  - WorkflowStatusCard component for entity detail pages
  - CaseWorkflowPanel wrapper for case detail integration
  - PolicyWorkflowPanel wrapper for policy detail integration
  - 3 workflow templates (Case, Policy, Disclosure)
  - 6 demo workflow instances in various states
affects: [20-notifications, demo-environment, sales-demos]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Entity detail page workflow integration pattern"
    - "Workflow seed data with realistic stages and transitions"

key-files:
  created:
    - apps/frontend/src/components/workflows/workflow-status-card.tsx
    - apps/frontend/src/components/cases/case-workflow-panel.tsx
    - apps/frontend/src/components/policies/policy-workflow-panel.tsx
    - apps/backend/prisma/seeders/acme-phase-19.ts
  modified:
    - apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx
    - apps/frontend/src/app/(authenticated)/policies/[id]/page.tsx
    - apps/backend/prisma/seed.ts

key-decisions:
  - "Place workflow card at top of right column in case detail page for visibility"
  - "Place workflow panel alongside header in policy detail page using flex layout"
  - "Use sonner toast for notifications instead of custom useToast hook"

patterns-established:
  - "WorkflowStatusCard as reusable component taking entityType and entityId props"
  - "Wrapper panel components for entity-specific integration"

# Metrics
duration: 12min
completed: 2026-02-11
---

# Phase 19 Plan 07: Entity Detail Integration & Demo Seed Summary

**Workflow status card integrated into case and policy detail pages, plus 3 demo templates and 6 instances seeded for Acme Co.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-02-11T23:04:52Z
- **Completed:** 2026-02-11T23:17:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- WorkflowStatusCard component showing progress indicator, SLA status, and transition buttons
- Case detail page shows workflow panel in right column alongside connected entities
- Policy detail page shows workflow panel next to header when in approval workflow
- 3 realistic workflow templates: Case Investigation Pipeline (5 stages), Policy Approval (4 stages), Disclosure Review (4 stages)
- 6 workflow instances: 3 ACTIVE, 1 COMPLETED, 1 PAUSED, 1 disclosure ACTIVE

## Task Commits

Each task was committed atomically:

1. **Task 1: Create workflow status card and entity detail integrations** - `f6a17d1` (feat)
2. **Task 2: Seed Acme Co. workflow templates and instances** - `7e58e0a` (feat)

## Files Created/Modified

**Created:**

- `apps/frontend/src/components/workflows/workflow-status-card.tsx` - Reusable card with progress indicator, SLA badge, transition buttons, pause/resume controls
- `apps/frontend/src/components/cases/case-workflow-panel.tsx` - Case-specific wrapper component
- `apps/frontend/src/components/policies/policy-workflow-panel.tsx` - Policy-specific wrapper component
- `apps/backend/prisma/seeders/acme-phase-19.ts` - Phase 19 demo seeder with templates and instances

**Modified:**

- `apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx` - Added CaseWorkflowPanel to right column
- `apps/frontend/src/app/(authenticated)/policies/[id]/page.tsx` - Added PolicyWorkflowPanel next to header
- `apps/backend/prisma/seed.ts` - Added Phase 19 seeder to orchestrator

## Decisions Made

1. **Workflow card placement on case page:** Added at top of right column, before connected people/documents. Workflow status is high-priority information users need immediately.

2. **Policy page layout:** Used flex layout to place workflow panel next to header rather than a separate column. Policy pages have simpler layout than cases.

3. **Toast notifications:** Used sonner directly instead of custom useToast hook, matching existing codebase patterns.

4. **Template structure:** Created templates with realistic stages, steps, SLA configurations, and approval gates matching how Ethico customers actually use workflows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed toast import**

- **Found during:** Task 1 (WorkflowStatusCard implementation)
- **Issue:** Plan referenced `@/hooks/use-toast` which doesn't exist; codebase uses sonner directly
- **Fix:** Changed import to `import { toast } from "sonner"` and updated toast calls to sonner API
- **Files modified:** apps/frontend/src/components/workflows/workflow-status-card.tsx
- **Verification:** TypeScript compiles, toast notifications work
- **Committed in:** f6a17d1 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Minor fix required for correct toast library usage. No scope creep.

## Issues Encountered

None - both tasks completed smoothly after fixing the toast import issue.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Phase 19 Complete:**

- All 7 plans executed successfully
- Workflow engine UI fully functional:
  - Workflow management page at /settings/workflows
  - Visual workflow builder with canvas, stage palette, property panels
  - Workflow instances page with status tracking
  - Workflow status integration on case and policy detail pages
  - Demo data seeded for sales demonstrations

**Ready for Phase 20 (Notifications):**

- Workflow transitions could trigger notifications
- SLA warnings could generate alerts
- All workflow infrastructure in place

---

_Phase: 19-workflow-engine-ui_
_Completed: 2026-02-11_
