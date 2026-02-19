---
phase: 22-dark-mode-theme
plan: 08
subsystem: frontend-theming
tags: [dark-mode, policies, analytics, gantt-chart, rich-text]
completed: 2026-02-19
duration: ~15m

dependency-graph:
  requires: [22-02, 22-03]
  provides:
    [
      "policy-dark-mode",
      "analytics-dark-mode",
      "gantt-dark-mode",
      "rich-text-dark-mode",
    ]
  affects: [22-09, 22-10]

tech-stack:
  added: []
  patterns: ["theme-color-pairs", "useTheme-hook"]

key-files:
  created: []
  modified:
    - apps/frontend/src/components/policies/policy-list.tsx
    - apps/frontend/src/components/policies/policy-detail-header.tsx
    - apps/frontend/src/components/policies/policy-editor.tsx
    - apps/frontend/src/components/policies/policy-translations-panel.tsx
    - apps/frontend/src/components/policies/policy-attestations-panel.tsx
    - apps/frontend/src/components/policies/policy-cases-panel.tsx
    - apps/frontend/src/components/analytics/dashboards-list.tsx
    - apps/frontend/src/components/analytics/reports-list.tsx
    - apps/frontend/src/components/analytics/dashboard-template-picker.tsx
    - apps/frontend/src/lib/gantt-utils.ts
    - apps/frontend/src/components/projects/GanttChart.tsx
    - apps/frontend/src/components/projects/MilestoneTimeline.tsx
    - apps/frontend/src/components/rich-text/editor-toolbar.tsx

decisions:
  - id: 22-08-01
    decision: "Use color pair functions for Gantt chart inline styles"
    rationale: "Gantt chart uses inline style hex colors which cannot use Tailwind dark: variant - need JS-based color selection"
  - id: 22-08-02
    decision: "Mark original single-color gantt functions as @deprecated"
    rationale: "Preserve backward compatibility while guiding toward new theme-aware functions"
  - id: 22-08-03
    decision: "Use rgba() for dark mode Gantt backgrounds"
    rationale: "Provides better transparency control for semi-transparent colored backgrounds"

metrics:
  tasks-completed: 2
  tasks-total: 2
  commits: 2
---

# Phase 22 Plan 08: Policies, Analytics, Gantt Chart, and Rich Text Dark Mode Summary

Themed policies, analytics, projects (Gantt chart), and rich text editor components with comprehensive dark mode support. The Gantt chart required a special color pair pattern for its inline style hex colors.

## Tasks Completed

| Task | Name                                                | Commit  | Key Files                                                                                                                                                                            |
| ---- | --------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Theme policy and analytics components               | 3ba1cd0 | policy-list, policy-detail-header, policy-editor, policy-translations-panel, policy-attestations-panel, policy-cases-panel, dashboards-list, reports-list, dashboard-template-picker |
| 2    | Theme Gantt chart, milestones, and rich text editor | 3e2d369 | gantt-utils.ts, GanttChart.tsx, MilestoneTimeline.tsx, editor-toolbar.tsx                                                                                                            |

## Changes Made

### Task 1: Policy and Analytics Components

**Policy Status Badges (5 files):**

- Added dark mode variants to all policy status colors (DRAFT, PENDING_APPROVAL, APPROVED, PUBLISHED, RETIRED)
- Updated policy-detail-header approval status card with dark variants
- Migrated policy-editor draft and approval banners to semantic tokens

**Policy Supporting Panels (3 files):**

- Themed translations panel stale indicators with dark variants
- Updated attestations panel campaign status badges
- Added dark variants to cases panel link type badges (VIOLATION, REFERENCE, GOVERNING)

**Analytics Components (3 files):**

- Added dark variants to System badges in dashboards-list and reports-list
- Updated dashboard-template-picker with dark mode colors per dashboard type (blue, purple, green, orange, gray)

### Task 2: Gantt Chart, Milestones, and Rich Text

**Gantt Chart Color System (gantt-utils.ts):**

- Added `getStatusColorPair()` returning `{ light: string; dark: string }` for each status
- Added `getStatusBgColorPair()` with rgba() values for dark mode transparency
- Marked original `getStatusColor()` and `getStatusBgColor()` as `@deprecated`

**GanttChart.tsx:**

- Integrated `useTheme()` from next-themes to detect current theme
- Updated bar rendering to select color based on `resolvedTheme`
- Migrated container `bg-white` to `bg-card`
- Updated toolbar from `bg-slate-50` to `bg-muted`
- Added dark variants for today column (`dark:bg-blue-900/20`) and weekends (`bg-muted/30`)

**MilestoneTimeline.tsx:**

- Updated statusConfig with dark mode color variants for all 5 statuses
- Migrated timeline line from `bg-slate-200` to `bg-border`
- Updated hover state from `hover:bg-slate-50` to `hover:bg-muted/50`

**Editor Toolbar:**

- Added `bg-background` to link URL input for proper dark mode styling

## Decisions Made

1. **Color pair functions for Gantt chart** - Gantt chart uses inline style hex colors which cannot use Tailwind `dark:` variant. Created `getStatusColorPair()` and `getStatusBgColorPair()` functions that return both light and dark hex values, with JS-based selection via `useTheme()`.

2. **Deprecated original single-color functions** - Marked `getStatusColor()` and `getStatusBgColor()` as `@deprecated` with JSDoc comments to guide developers toward the new theme-aware functions while preserving backward compatibility.

3. **rgba() for dark mode backgrounds** - Used rgba() format for dark mode Gantt backgrounds (e.g., `rgba(34, 197, 94, 0.2)`) to provide consistent 20% opacity across all status colors.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compilation passes (`npx tsc --noEmit`)
- All policy components render correctly in dark mode
- Policy version diff readable with green/red contrast
- Analytics dashboard and report lists themed correctly
- Gantt chart uses theme-aware color pairs
- Rich text editor content readable in dark mode

## Next Steps

Continue with remaining Phase 22 plans:

- 22-09: Forms and table components dark mode
- 22-10: Settings and help pages dark mode
