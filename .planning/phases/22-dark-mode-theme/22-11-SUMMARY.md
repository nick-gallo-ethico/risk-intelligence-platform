---
phase: 22-dark-mode-theme
plan: 11
subsystem: frontend-theming
tags: [dark-mode, employee-portal, campaigns, disclosures, form-builder]
dependency-graph:
  requires: ["22-03", "22-04"]
  provides:
    [
      "employee-portal-dark-mode",
      "campaigns-dark-mode",
      "form-builder-dark-mode",
    ]
  affects: []
tech-stack:
  added: []
  patterns: ["semantic-color-tokens", "dark-variant-pattern"]
key-files:
  created: []
  modified:
    - apps/frontend/src/components/campaigns/CampaignBuilder.tsx
    - apps/frontend/src/components/campaigns/ScheduleConfig.tsx
    - apps/frontend/src/components/campaigns/campaigns-summary-cards.tsx
    - apps/frontend/src/components/disclosures/DraftIndicator.tsx
    - apps/frontend/src/components/disclosures/form-builder/FieldPalette.tsx
    - apps/frontend/src/components/disclosures/form-builder/FormBuilder.tsx
    - apps/frontend/src/components/disclosures/form-builder/FormPreview.tsx
decisions:
  - context: "Employee portal files already themed"
    choice: "No changes needed - verified existing dark mode support"
    rationale: "Files already used semantic tokens from prior Phase 22 execution"
metrics:
  duration: "15m"
  completed: "2026-02-19"
---

# Phase 22 Plan 11: Employee Portal, Campaigns, and Disclosure Form Builder Dark Mode Summary

Dark mode theming applied to campaign components and disclosure form builder (the highest color-count files in the codebase).

## What Was Done

### Task 1: Employee Portal + Campaign Components

**Employee Portal (11 components):**
All 11 employee portal components were already properly themed with semantic tokens from prior Phase 22 execution:

- employee-dashboard.tsx, employee-header.tsx, dashboard-tabs.tsx
- my-tasks-tab.tsx, my-team-tab.tsx, task-card.tsx
- team-member-row.tsx, team-member-selector.tsx
- proxy-report-form.tsx, proxy-confirmation.tsx, proxy-reason-selector.tsx
- employee/layout.tsx

No changes required - all files already used bg-card, text-foreground, text-muted-foreground, and border-border semantic tokens.

**Campaign Components (3 files needed updates):**

- `CampaignBuilder.tsx`: Added dark variants for amber warning messages (`dark:bg-amber-900/30 dark:text-amber-300`)
- `ScheduleConfig.tsx`: Added dark variants for blackout date warnings and calendar modifiers
- `campaigns-summary-cards.tsx`: Added dark variants for colored summary card backgrounds (`dark:bg-green-900/20`, etc.) and icons (`dark:text-green-400`, etc.)

Other campaign files (SegmentBuilder.tsx, campaigns-table.tsx, campaigns-filters.tsx) were already properly themed.

### Task 2: Disclosure Form Builder Components (Highest Color Counts)

**DraftIndicator.tsx:**

- Status colors: Added dark variants for saved (`dark:text-green-400`), unsaved (`dark:text-amber-400`), and version indicator
- File type icons: Added dark variants for image, PDF, and generic file icons
- Version badge: Added `dark:bg-amber-900/30 dark:text-amber-300`

**FieldPalette.tsx:**

- Replaced all hardcoded gray colors with semantic tokens
- Draggable field items: `bg-card`, `text-foreground`, `text-muted-foreground`
- Palette header: `bg-card`, `text-foreground`
- Search icon and empty state: `text-muted-foreground`
- Collapsed state: `bg-muted/50`, `text-muted-foreground`
- Group triggers: `text-muted-foreground hover:text-foreground`

**FormBuilder.tsx (~50 hardcoded colors fixed):**

- Sortable field cards: `bg-card`, `hover:border-muted-foreground/30`
- Grip handles and icons: `text-muted-foreground`
- Icon containers: `bg-muted`
- Delete buttons: `hover:bg-destructive/10 text-muted-foreground hover:text-destructive`
- Section headers: `bg-muted/50`, `text-foreground`
- Repeater badge: `dark:bg-purple-900/30 dark:text-purple-300`
- Empty drop zone: `border-border text-muted-foreground`
- Config panels (Field and Section): `bg-card`, `text-foreground`, `text-muted-foreground`
- Form canvas: `bg-muted/50`
- Save indicator: `text-muted-foreground`, `dark:text-green-400`
- Drag overlay: `bg-card`

**FormPreview.tsx (~54 hardcoded colors fixed):**

- Field inputs: `bg-background`
- Dropdown selects: `bg-background`
- Relationship mapper: `bg-background`, `text-muted-foreground`
- Dollar threshold: `text-muted-foreground`, `bg-background`
- Recurring date labels: `text-muted-foreground`
- Entity lookup: `bg-background`, `text-muted-foreground`
- Signature block: `bg-background`, `text-muted-foreground`, `border-border`
- File upload: `border-border bg-background text-muted-foreground`
- Calculated field: `bg-muted/50 text-muted-foreground`
- Radio buttons: `border-border`
- Field descriptions: `text-muted-foreground`
- Required asterisks: `text-destructive`
- Section renderer: `bg-card`, `bg-muted/50`, `text-foreground`, `text-muted-foreground`
- Repeater text: `dark:text-purple-400`
- Main preview container: `bg-muted/50`, `bg-card`
- Toolbar: `bg-card`, `text-muted-foreground`
- Viewport buttons: `dark:bg-blue-900/30 dark:text-blue-400`
- Form content area: `bg-muted/50`
- Empty state: `text-muted-foreground`
- Footer: `bg-card`
- Viewport indicator: `bg-card text-muted-foreground`

## Commits

| Task | Commit  | Description                                                                                |
| ---- | ------- | ------------------------------------------------------------------------------------------ |
| 1    | 9c382f8 | Campaign components dark mode (CampaignBuilder, ScheduleConfig, campaigns-summary-cards)   |
| 2    | 9759bc9 | Disclosure form builder dark mode (DraftIndicator, FieldPalette, FormBuilder, FormPreview) |

## Files Modified

| File                        | Changes                                            |
| --------------------------- | -------------------------------------------------- |
| CampaignBuilder.tsx         | 1 dark variant added                               |
| ScheduleConfig.tsx          | 4 dark variants added                              |
| campaigns-summary-cards.tsx | 8 dark variants added                              |
| DraftIndicator.tsx          | 6 dark variants added                              |
| FieldPalette.tsx            | ~20 semantic token replacements                    |
| FormBuilder.tsx             | ~50 hardcoded colors replaced with semantic tokens |
| FormPreview.tsx             | ~54 hardcoded colors replaced with semantic tokens |

## Deviations from Plan

### Finding: Employee Portal Already Themed

- **Found during:** Task 1 analysis
- **Issue:** Plan listed 11 employee portal files for theming, but all were already properly themed with semantic tokens
- **Resolution:** Verified existing theming and documented - no changes needed
- **Impact:** Reduced Task 1 scope to campaign files only

## Verification

- TypeScript compilation: PASSED (`npx tsc --noEmit`)
- All campaign components use semantic tokens for dark mode
- FormBuilder.tsx (50 colors) and FormPreview.tsx (54 colors) - the two highest color-count files - now fully themed

## Next Phase Readiness

Plan 22-11 complete. The two highest color-count files in the codebase (FormBuilder ~50, FormPreview ~54) are now fully dark-mode-compatible.
