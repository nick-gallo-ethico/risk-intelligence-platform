---
phase: 12-internal-operations-portal
plan: 14
status: complete
duration: 14min
completed: 2026-02-06
subsystem: implementation-portal-ui
tags: [implementation, portal, dashboard, checklist, go-live, ui, frontend]

dependency-graph:
  requires: [12-07, 12-09, 12-13]
  provides: [ImplementationDashboard, ProjectDetail, GoLiveReadiness, ChecklistPanel, BlockerCard, GoLiveChecklist]
  affects: [12-18, 12-19]

tech-stack:
  added: []
  patterns: [react-query-mutations, expandable-panels, progress-bars, sign-off-workflow]

key-files:
  created:
    - apps/frontend/src/components/layouts/InternalLayout.tsx
    - apps/frontend/src/app/internal/implementation/layout.tsx
    - apps/frontend/src/app/internal/implementation/page.tsx
    - apps/frontend/src/app/internal/implementation/[projectId]/page.tsx
    - apps/frontend/src/app/internal/implementation/[projectId]/go-live/page.tsx
    - apps/frontend/src/components/implementation/ProjectCard.tsx
    - apps/frontend/src/components/implementation/ChecklistPanel.tsx
    - apps/frontend/src/components/implementation/BlockerCard.tsx
    - apps/frontend/src/components/implementation/GoLiveChecklist.tsx
  modified: []

decisions:
  - id: internal-layout-location
    description: "Created InternalLayout in frontend app at /internal/* route rather than separate ops-console app"
    rationale: "Plan referenced non-existent ops-console app; adapted to existing frontend structure"
  - id: task-toggle-pattern
    description: "Tasks toggle between COMPLETED and PENDING on click, disabled for BLOCKED tasks"
    rationale: "Simple UX for quick task completion while preventing blocked task manipulation"
  - id: health-score-colors
    description: "Green (>=80%), Yellow (60-79%), Red (<60%) for health scores"
    rationale: "Standard traffic-light pattern for at-a-glance status"
  - id: gate-pass-assumption
    description: "Gates assumed to pass in order up to passedGates count for display"
    rationale: "Simple display logic; actual gate status comes from API"

metrics:
  tasks: 3
  commits: 3
  lines-added: ~1400
---

# Phase 12 Plan 14: Implementation Portal UI Summary

Implementation portal frontend with project dashboard, checklist tracker, blocker display, and go-live readiness view.

## One-Liner

Implementation Portal UI with dashboard (status filters, 5 stat cards, project grid), project detail (checklist by phase, blocker cards with escalation), and go-live readiness (4 hard gates, score bar with threshold marker, client sign-off form).

## What Was Built

### 1. InternalLayout Component (InternalLayout.tsx)

Shared layout for internal operations tools:
- Top navigation bar with Ethico branding
- Navigation tabs: Support, Implementation, Client Health, Admin
- Active route highlighting
- User menu with sign-out

### 2. Implementation Dashboard (page.tsx - 177 lines)

Project list page with:
- Status filter buttons (All, Not Started, In Progress, At Risk, On Hold, Completed)
- 5 statistics cards (Total, In Progress, At Risk, Completed, Avg Health)
- Project grid with ProjectCard components
- Empty state with create CTA
- React Query integration for data fetching

### 3. ProjectCard Component (ProjectCard.tsx)

Individual project card displaying:
- Organization name and implementation type
- Status badge with color coding per status
- Health score percentage with progress bar
- Target go-live date
- Current phase indicator
- Hover effects and navigation

### 4. Project Detail Page ([projectId]/page.tsx - 273 lines)

Project overview and checklist:
- Back navigation and project header
- 4 info cards (Status, Phase, Target Date, Health Score)
- Two-column layout: checklist (2/3) + blockers (1/3)
- Tasks grouped by phase in ChecklistPanel components
- Link to go-live readiness page
- Mutation for task status updates

### 5. ChecklistPanel Component (ChecklistPanel.tsx - 160 lines)

Expandable phase section with:
- Collapsible header with phase name
- Completion count (X/Y complete)
- Progress bar per phase
- Task list with icons (Circle, CheckCircle, AlertCircle, Clock)
- Toggle completion on click
- Required task indicators (*required)
- Due dates and notes display
- Blocked task visual treatment (red background)

### 6. BlockerCard Component (BlockerCard.tsx - 100 lines)

Individual blocker display:
- Title and description
- Category badge
- Time since creation (formatDistanceToNow)
- Escalation indicators (Manager, Director)
- Color coding: yellow (unescalated), orange (manager), red (director), gray (resolved)
- Resolved state with strikethrough

### 7. Go-Live Readiness Page (go-live/page.tsx - 130 lines)

Go-live status overview:
- Summary card (Ready/Not Ready with icon)
- Blockers list in card
- GoLiveChecklist component integration
- Launch button (when canGoLive true)

### 8. GoLiveChecklist Component (GoLiveChecklist.tsx - 402 lines)

Three-section go-live readiness per CONTEXT.md:

**Hard Gates Section:**
- 4 gates displayed (auth, admin trained, terms signed, contact designated)
- Pass/fail icons and status badges
- Gate descriptions
- Count display (X/4 passed)

**Readiness Score Section:**
- Large score display (4xl font)
- Progress bar with fill
- Threshold marker at recommended score (85%)
- Below-threshold warning message

**Sign-off Section:**
- Conditional display (gates passed, below threshold, no existing signoff)
- Sign-off form with:
  - Client signer name/email
  - Risk acknowledgment checkboxes (2 required)
  - Sign-off statement textarea
  - Submit/Cancel buttons
  - Loading and error states
- Sign-off complete indicator when hasSignoff true

## API Integration

All pages integrate with the backend API at `/api/v1/internal/implementations`:

| Page | Query Key | Endpoint |
|------|-----------|----------|
| Dashboard | `['implementations', statusFilter]` | `GET /api/v1/internal/implementations` |
| Project Detail | `['implementation', projectId]` | `GET /api/v1/internal/implementations/:id` |
| Task Update | mutation | `PATCH /api/v1/internal/implementations/:id/tasks/:taskId` |
| Go-Live Status | `['go-live-status', projectId]` | `GET /api/v1/internal/implementations/:id/go-live/status` |
| Client Sign-off | mutation | `POST /api/v1/internal/implementations/:id/go-live/signoff/client` |

## Commits

| Hash | Description |
|------|-------------|
| d87dc82 | feat(12-14): create implementation dashboard with project list and filters |
| c1f8bd3 | feat(12-15): add ops-console app with hotline ops layout and QA queue (included Task 2 files) |
| ccc9d84 | feat(12-17): add Track Detail and Certification Progress pages (included Task 3 files) |

Note: Some files were committed as part of later plans due to parallel execution context.

## Deviations from Plan

### Adapted Path Structure

**Issue:** Plan referenced `apps/ops-console/` which doesn't exist.

**Resolution:** Created pages under `apps/frontend/src/app/internal/implementation/` to work with existing frontend app structure.

**Files affected:** All page.tsx and layout.tsx files

**Rationale:** Maintains single frontend app architecture while providing internal routes.

## Verification Results

- [x] TypeScript compiles without errors in implementation files
- [x] `implementation/page.tsx` exceeds 100 lines (177 lines)
- [x] `GoLiveChecklist.tsx` exceeds 100 lines (402 lines)
- [x] Dashboard shows project cards with status/health
- [x] Status filter buttons implemented
- [x] Project detail shows checklist grouped by phase
- [x] Tasks can be toggled complete/pending
- [x] Blockers displayed with escalation status
- [x] Go-live page shows hard gates
- [x] Readiness score shown with progress bar and threshold marker
- [x] Sign-off form appears when gates pass but score below threshold

## Next Phase Readiness

Ready for:
- 12-18: Backend Tech Debt (can reference these UI patterns)
- 12-19: Frontend Tech Debt (can include these components in audit)

### Usage Notes

**Accessing Implementation Portal:**
Navigate to `/internal/implementation` to view dashboard.

**Project Flow:**
1. Dashboard lists all projects with filtering
2. Click project card to view detail
3. Toggle tasks complete/pending in checklist
4. Click "Go-Live Readiness" to check status
5. Complete sign-off if below threshold

**Component Reuse:**
- `InternalLayout` can be used for other internal routes
- `ChecklistPanel` pattern can be reused for other checklists
- `BlockerCard` can display any blocker-type entity
