---
phase: 15
plan: 02
subsystem: frontend-ui
tags: [case-detail, layout, grid, components]
requires:
  - "15-01 (backend REST endpoints)"
  - "15-07 (seed data)"
provides:
  - "Three-column CSS Grid layout for case detail page"
  - "CaseInfoSummary component for case metadata display"
  - "ActionButtonRow component for quick actions"
affects:
  - "15-03 (tabs refactor - center column)"
  - "15-04 (modals - action buttons)"
  - "15-05 (connected entities - right column)"
tech-stack:
  added: []
  patterns:
    - "CSS Grid three-column layout with fixed sidebars"
    - "Responsive layout with hidden columns on mobile"
key-files:
  created:
    - "apps/frontend/src/components/cases/case-info-summary.tsx"
    - "apps/frontend/src/components/cases/action-button-row.tsx"
  modified:
    - "apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx"
decisions:
  - id: D-1502-01
    title: "Fixed-width columns for left/right sidebars"
    choice: "300px fixed width for both sidebars"
    rationale: "Provides consistent layout and enough room for case metadata and quick actions"
  - id: D-1502-02
    title: "Sidebar visibility on desktop only"
    choice: "hidden lg:block for sidebars"
    rationale: "Mobile users get full-width tabs, desktop users get all three columns"
metrics:
  duration: ~10 minutes
  completed: 2026-02-10
---

# Phase 15 Plan 02: Three-Column Layout and Left Column Components Summary

**One-liner:** Three-column CSS Grid layout with CaseInfoSummary and ActionButtonRow components for case detail page restructure.

## What Was Built

### Task 1: CaseInfoSummary and ActionButtonRow Components

**CaseInfoSummary (`case-info-summary.tsx`):**

- Compact card displaying case metadata at top of left column
- Shows: reference number, status badge, severity badge, pipeline stage, days open, created date, SLA status
- Uses STATUS_CONFIG, SEVERITY_CONFIG, and SLA_CONFIG patterns consistent with case-detail-header.tsx
- Includes loading skeleton for data fetch states
- Uses Lucide icons: Calendar, Clock, Shield, AlertTriangle, Check, AlertCircle

**ActionButtonRow (`action-button-row.tsx`):**

- Vertical stack of 5 quick action buttons styled like a sidebar menu
- Buttons: Add Note (StickyNote), Log Interview (Mic), Attach Document (FileText), Create Task (CheckSquare), Log Email (Mail)
- Uses ghost variant buttons with left-aligned text and icons
- Exports `ActionType` type for type-safe action handling
- Calls `onAction(action)` callback with action type string

### Task 2: Three-Column Grid Layout

**Page restructure (`page.tsx`):**

- Replaced two-column flex layout with CSS Grid: `grid-cols-1 lg:grid-cols-[300px_1fr_300px]`
- Left column (300px): CaseInfoSummary + ActionButtonRow + CasePropertiesPanel
- Center column (1fr): CaseTabs (unchanged)
- Right column (300px): Placeholder for connected entities (Plan 05)
- Removed sidebar toggle button (left column always visible on desktop)
- Added `handleAction` callback for quick action buttons (logs to console, wired to modals in Plan 04)
- Updated skeleton loader to match three-column layout

## Technical Details

### Layout Structure

```
+------------------+--------------------+------------------+
|   LEFT (300px)   |   CENTER (1fr)     |  RIGHT (300px)   |
+------------------+--------------------+------------------+
| CaseInfoSummary  |                    |                  |
| ActionButtonRow  |    CaseTabs        |   Placeholder    |
| CaseProperties   |                    |  (Plan 05)       |
+------------------+--------------------+------------------+
```

### Responsive Behavior

- Desktop (lg+): All three columns visible
- Mobile/Tablet: Only center column (tabs) visible

### Key Changes from Previous Layout

1. Removed `sidebarOpen` state and toggle mechanism
2. Changed from flex to CSS Grid
3. Added third column for connected entities
4. Moved CasePropertiesPanel below new summary components

## Commits

| Hash    | Type | Description                                            |
| ------- | ---- | ------------------------------------------------------ |
| 0beb4fc | feat | Add CaseInfoSummary and ActionButtonRow components     |
| ebc5733 | feat | Rebuild case detail page with three-column grid layout |

## Verification Results

| Check                         | Status                                   |
| ----------------------------- | ---------------------------------------- |
| TypeScript compilation        | PASS                                     |
| Grid layout present           | PASS (2 occurrences - layout + skeleton) |
| CaseInfoSummary exists        | PASS                                     |
| ActionButtonRow has 5 buttons | PASS                                     |
| Left column order correct     | PASS                                     |
| Right column exists           | PASS                                     |
| No sidebar toggle             | PASS                                     |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for:**

- 15-03: Tabs refactor (center column already contains CaseTabs)
- 15-04: Quick action modals (ActionButtonRow already calls handleAction)
- 15-05: Connected entities (right column placeholder exists)

**No blockers identified.**
