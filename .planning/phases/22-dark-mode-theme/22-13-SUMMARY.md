# Phase 22 Plan 13: Page Files Dark Mode Sweep Summary

## One-liner

Swept all 35+ page.tsx files for hardcoded colors, themed 8 files that needed updates with semantic tokens and dark: variants.

## Commits

| Hash    | Type | Description                                        |
| ------- | ---- | -------------------------------------------------- |
| 82fa3fb | feat | theme authenticated page files for dark mode       |
| 6685ab9 | feat | theme internal operations page files for dark mode |

## What Was Built

### Task 1: Authenticated Page Files (4 files modified)

**cases/new/page.tsx:**

- Loading state: `text-gray-500` -> `text-muted-foreground`
- Page container: `bg-gray-50` -> `bg-background`
- Header: `bg-white` -> `bg-card`, `text-gray-900` -> `text-foreground`, `text-gray-500` -> `text-muted-foreground`

**cases/[id]/page.tsx:**

- Error state: semantic tokens for background and text
- Skeleton loader: `bg-white` -> `bg-card`, `bg-gray-50/50` -> `bg-muted/50`
- Badge placeholders: `text-gray-300` -> `text-muted-foreground/50`

**investigations/[id]/page.tsx:**

- Comprehensive theming: error state, main container, header sections
- Skeleton backgrounds: `bg-gray-50/50` -> `bg-muted/50`
- AI button: gradient with dark mode variants `dark:from-purple-950/30 dark:to-blue-950/30`
- Notes badge: semantic border and text colors

**search/page.tsx:**

- entityTypeConfig colors: Added dark: variants to all entity type badge colors
- Pattern: `bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`

### Task 2: Internal/Special Page Files (4 files modified)

**internal/page.tsx:**

- Module cards: Added dark: variants to colored backgrounds and borders
- Admin module: Changed to fully semantic `bg-muted text-muted-foreground border-border`
- Headers: `text-gray-900` -> `text-foreground`, `text-gray-600` -> `text-muted-foreground`

**internal/implementation/page.tsx:**

- Stats cards: `bg-white` -> `bg-card`, text to semantic tokens
- Filter buttons: semantic tokens with dark: active state
- Loading/error states: semantic tokens

**internal/implementation/[projectId]/page.tsx:**

- Info cards: `bg-white` -> `bg-card`, labels to `text-muted-foreground`
- Checklist header: semantic foreground colors
- Blockers section: `bg-gray-50` -> `bg-muted`, semantic text

**internal/implementation/[projectId]/go-live/page.tsx:**

- Status card: Added dark: variants for green/yellow backgrounds and borders
- Icons: Added dark: variants for status indicator colors
- Blockers list: `bg-white` -> `bg-card`, semantic text colors

### Files Verified (No Changes Needed)

The following page files were already properly themed and required no modifications:

- cases/page.tsx, investigations/page.tsx, policies/page.tsx, policies/[id]/page.tsx
- disclosures/page.tsx, intake-forms/page.tsx, campaigns/page.tsx
- analytics/page.tsx, analytics/dashboards/[id]/page.tsx, analytics/reports/[id]/page.tsx, analytics/reports/[id]/run/page.tsx
- projects/page.tsx, settings/page.tsx, settings/organization/page.tsx, settings/audit/page.tsx
- notifications/page.tsx, my-work/page.tsx, profile/page.tsx (redirect only)
- compliance/conflicts/page.tsx, ~offline/page.tsx
- settings/users/page.tsx, settings/users/[id]/page.tsx, settings/users/invite/page.tsx

## Key Patterns Applied

1. **Page backgrounds**: `bg-gray-50` / `bg-white` -> `bg-background`
2. **Card containers**: `bg-white` -> `bg-card`
3. **Primary text**: `text-gray-900` -> `text-foreground`
4. **Secondary text**: `text-gray-500/600` -> `text-muted-foreground`
5. **Borders**: `border-gray-200` -> `border-border`
6. **Colored badges**: Light color + dark: variant pair pattern
7. **Hover states**: `hover:bg-gray-100` -> `hover:bg-muted`
8. **Error states**: `text-red-500` -> `text-destructive`

## Decisions Made

| Decision                                         | Rationale                                                             |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| entityTypeConfig uses explicit dark: variants    | Search result badges need consistent coloring across light/dark modes |
| Internal module cards use dark:bg-{color}-950/30 | 30% opacity provides readable contrast in dark mode                   |
| Admin module uses fully semantic tokens          | Gray/neutral doesn't need colored variants                            |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compilation passes (`npx tsc --noEmit`)
- All edited files pass lint-staged checks
- Pre-commit hooks completed successfully

## Duration

~10 minutes

## Next Phase Readiness

All page-level dark mode theming complete. Remaining Phase 22 plans can proceed.
