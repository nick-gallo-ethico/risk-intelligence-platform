---
phase: 25
plan: 02
subsystem: frontend-ui
tags: [quick-actions, hubspot-pattern, modal, properties-panel]

dependency-graph:
  requires: [25-01]
  provides: [QuickActionGrid, LogCallModal, enhanced-PropertySection]
  affects: [25-03, 25-04]

tech-stack:
  added: []
  patterns: [horizontal-icon-grid, overflow-dropdown, animated-chevron]

key-files:
  created:
    - apps/frontend/src/components/shared/quick-action-grid.tsx
    - apps/frontend/src/components/cases/log-call-modal.tsx
  modified:
    - apps/frontend/src/components/cases/action-button-row.tsx
    - apps/frontend/src/components/cases/property-section.tsx
    - apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx

decisions:
  - id: quick-action-layout
    choice: "4-column grid with icons above labels"
    rationale: "HubSpot pattern - compact, scannable, fits more actions"
  - id: overflow-handling
    choice: "More dropdown for overflow actions"
    rationale: "Allows unlimited actions while keeping grid compact"
  - id: chevron-direction
    choice: "ChevronRight with 90deg rotation on expand"
    rationale: "Standard HubSpot/modern UI pattern for collapsible sections"

metrics:
  duration: "~8 minutes"
  completed: 2026-02-13
---

# Phase 25 Plan 02: Quick Actions Grid & Properties Panel Summary

**One-liner:** HubSpot-style horizontal icon+label grid for quick actions, LogCallModal for phone call logging, and animated chevron/gear icons for properties panel.

## What Was Built

### 1. QuickActionGrid Component (shared)
Reusable component at `apps/frontend/src/components/shared/quick-action-grid.tsx`:
- Horizontal grid layout (3 or 4 columns configurable)
- Icons displayed above labels in each button
- Overflow actions in "More" dropdown menu
- Clean, compact design matching HubSpot pattern

### 2. LogCallModal
New modal at `apps/frontend/src/components/cases/log-call-modal.tsx`:
- Direction selection (Inbound/Outbound)
- Outcome selection (Connected, Voicemail, No Answer, Busy, Wrong Number)
- Contact name and phone number fields
- Duration input (minutes)
- Required notes field
- Submits to case activity API

### 3. ActionButtonRow Refactor
Updated `apps/frontend/src/components/cases/action-button-row.tsx`:
- Replaced vertical ghost button stack with QuickActionGrid
- Added "call" action type
- 6 actions total: Note, Email, Call, Interview, Document, Task
- Visual layout changed from vertical list to 4-column grid

### 4. PropertySection Enhancements
Updated `apps/frontend/src/components/cases/property-section.tsx`:
- Changed ChevronDown to ChevronRight with 90-degree rotation on expand
- Added Settings2 gear icon on right side of each section header
- Gear icon click is separate from collapse toggle (stopPropagation)
- Added `showSettings` and `onSettingsClick` props for future customization
- Smooth CSS transition on chevron rotation

## Technical Details

### Component API

**QuickActionGrid:**
```typescript
interface QuickActionGridProps {
  actions: QuickAction[];
  columns?: 3 | 4;
  className?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  overflow?: boolean;
}
```

**PropertySection new props:**
```typescript
showSettings?: boolean;        // default: true
onSettingsClick?: () => void;  // future: open customization dialog
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| ef03540 | feat | Create shared QuickActionGrid component |
| dd95da5 | feat | Create LogCallModal and refactor ActionButtonRow |
| c691f11 | feat | Add gear icons and chevron toggles to property sections |

## Verification Results

- [x] Quick action buttons appear as 4-column grid with icons above labels
- [x] 6 actions visible: Note, Email, Call, Interview, Document, Task
- [x] Call action opens LogCallModal
- [x] LogCallModal has direction, outcome, contact, duration, notes fields
- [x] Properties panel sections have ChevronRight that rotates 90deg on expand
- [x] Properties panel sections have gear icon (Settings2) on right
- [x] Gear icon click does not collapse section (stopPropagation)
- [x] QuickActionGrid component exports correctly
- [x] LogCallModal min_lines: 214 (requirement: 80)
- [x] QuickActionGrid min_lines: 97 (requirement: 40)

## Deviations from Plan

None - plan executed exactly as written.

## Pre-existing Issues Noted

TypeScript errors in `case-activity-timeline.tsx` (unrelated to this plan):
- ActivityAction type comparisons with task/sla actions
- isUpcoming prop not in ActivityEntryProps interface

These errors existed before plan execution and were not introduced by this work.

## Next Phase Readiness

Ready for 25-03: Case Overview Tab Redesign
- QuickActionGrid component available for reuse
- PropertySection now has visual polish matching HubSpot
- Action modal patterns established (LogCallModal follows existing modal patterns)
