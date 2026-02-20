# Phase 38: Dark Mode Gap Closure - Verification Results

**Date:** 2026-02-20
**Verifier:** Automated + Human spot-check pending

## THEME-01: Theme Toggle Accessibility

**Status:** PASSED

Theme toggle exists in both required locations:

1. **User dropdown (top-nav.tsx):**
   - `ThemeToggleItems` component imported (line 40) and rendered (line 398)
   - Available from user menu in top navigation bar

2. **Settings profile page:**
   - `AppearanceTab` component with `useTheme`/`setTheme` from next-themes
   - Three options: Light, Dark, System
   - Tab labeled "Appearance" in profile settings

## THEME-02: Zero Hardcoded Colors

**Status:** PASSED

Comprehensive grep results across all source files:

| Pattern                        | components/ (\*.tsx) | app/ (\*.tsx) | Total |
| ------------------------------ | -------------------- | ------------- | ----- |
| `bg-white` (standalone)        | 0                    | 0             | 0     |
| `bg-gray-*` (standalone)       | 0                    | 0             | 0     |
| `text-gray-*` (standalone)     | 0                    | 0             | 0     |
| `border-gray-*` (standalone)   | 0                    | 0             | 0     |
| `hover:bg-gray-*` (standalone) | 0                    | 0             | 0     |

**Exclusions (correct behavior):**

- Test files (`__tests__/`, `.spec.`, `.test.`) excluded from count
- Lines containing `dark:` variants excluded (these are paired light+dark, which is correct)
- `white/opacity` patterns in top-nav.tsx (`bg-white/5`, `text-white/70`, etc.) are intentional for the dark navigation bar that stays dark in both modes (HubSpot pattern)

## THEME-06: DataTable and Modals

**Status:** PASSED

1. **DataTable fallback badges (DataTable.tsx):**
   - Status fallback: `bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700`
   - Severity fallback: Same paired light+dark pattern
   - Both use proper paired light/dark variants (not standalone hardcoded)

2. **Modal components:**
   - `merge-modal.tsx`: 0 hardcoded colors
   - `assign-modal.tsx`: 0 hardcoded colors
   - `status-change-modal.tsx`: 0 hardcoded colors

## Visual Spot-Check (PENDING - Requires Human Verification)

The following 5 high-impact pages/components need visual verification in dark mode:

### How to Verify

1. Start the development server: `cd apps/frontend && npm run dev`
2. Navigate to the application at http://localhost:3000
3. Toggle dark mode using the theme toggle in the user menu (top-right)

### Files to Verify

**a) Investigation Properties Panel** (`/cases/[id]` -> click an investigation)

- Check: property labels readable, values have good contrast, collapsible sections work

**b) Merge Modal** (`/cases/[id]` -> Actions -> Merge Cases)

- Check: search input visible, results have proper hover states, preview section readable

**c) Investigation Files Tab** (`/investigations/[id]` -> Files tab)

- Check: file list items visible, empty state text readable, file cards have proper backgrounds

**d) Investigation Interviews Tab** (`/investigations/[id]` -> Interviews tab)

- Check: interview cards visible, labels/values have good contrast, hover states work

**e) Linked RIU Form Answers** (`/cases/[id]` -> Overview -> RIU section)

- Check: collapsible triggers visible, form field labels/values readable, section backgrounds appropriate

### Additional Quick Scans

- Project board view (`/projects/[id]`)
- Settings pages (`/settings`)
- Search results (`/search`)
- DataTable in any list view

### Look For

- Unreadable text (low contrast)
- White backgrounds in dark mode
- Missing hover states
- Badge/status colors that don't work

## Summary

| Requirement                              | Method             | Result  |
| ---------------------------------------- | ------------------ | ------- |
| THEME-01: Theme toggle in both locations | Code grep          | PASSED  |
| THEME-02: Zero hardcoded colors          | Comprehensive grep | PASSED  |
| THEME-06: DataTable/modals dark mode     | Code grep          | PASSED  |
| Visual spot-check top 5 files            | Human verification | PENDING |

**Automated verification: 3/3 PASSED**
**Human verification: 0/1 PENDING**
