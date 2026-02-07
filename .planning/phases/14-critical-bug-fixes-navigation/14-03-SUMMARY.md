---
phase: 14-critical-bug-fixes-navigation
plan: 03
subsystem: navigation-and-forms
tags: [search, profile, radix-ui, select, navigation, bug-fix]

dependency-graph:
  requires: []
  provides:
    - /search page with unified search results
    - /profile page with redirect to /settings
    - Fixed Radix Select components in case creation form
  affects:
    - top-nav.tsx global search functionality
    - case creation workflow

tech-stack:
  added: []
  patterns:
    - value || undefined pattern for Radix Select to avoid empty string errors
    - useQuery with useSearchParams for URL-driven search pages
    - Server-side redirect for profile page

key-files:
  created:
    - apps/frontend/src/app/(authenticated)/search/page.tsx
    - apps/frontend/src/app/(authenticated)/profile/page.tsx
  modified:
    - apps/frontend/src/components/cases/form-sections/basic-info-section.tsx
    - apps/frontend/src/components/cases/form-sections/reporter-section.tsx
    - apps/frontend/src/components/cases/form-sections/location-section.tsx

decisions:
  - id: radix-select-undefined
    title: Use undefined instead of sentinel for empty Select values
    context: Radix UI Select throws error when value="" and no SelectItem has value=""
    choice: Use value={x || undefined} to show placeholder instead of sentinel value
    rationale: Simpler than __none__ sentinel pattern, no bidirectional conversion needed
    alternatives_considered:
      - __none__ sentinel value with bidirectional conversion
      - Adding SelectItem value="" to all selects

metrics:
  duration: ~25 minutes
  completed: 2026-02-07
---

# Phase 14 Plan 03: Search Results Page and SelectItem Fix Summary

**One-liner:** Created /search results page calling unified search API, /profile redirect, and fixed Radix Select empty string errors in case creation form.

## What Was Done

### Task 1: Create /search results page and /profile redirect

Created two new pages in the authenticated route group:

**Search Results Page (`/search`)**
- Reads `?q=` query parameter using Next.js `useSearchParams()`
- Calls `GET /api/v1/search/unified` with query term
- Displays results grouped by entity type (Cases, RIUs, Investigations, People)
- Each group shows count and clickable result cards
- Results include entity type badge, title, and highlighted excerpt
- Search input at top allows refining search without navigating back
- Empty state for no query and no results
- Loading skeleton while fetching

**Profile Page (`/profile`)**
- Server-side redirect to `/settings` using Next.js `redirect()`
- No client-side component needed
- Fixes 404 when clicking "My Profile" in user dropdown

### Task 2: Fix SelectItem empty string values in case creation form

Fixed Radix UI Select runtime error caused by empty string values:

**Problem:** When form values are null/undefined, the code used `value={x ?? ''}` which passes empty string to Radix Select. Radix requires all `value` props to be non-empty strings or undefined.

**Solution:** Changed to `value={x || undefined}`:
- When value is empty/null/undefined, passes `undefined` to Select
- Radix Select shows placeholder text when value is undefined
- No need for sentinel values or bidirectional conversion

**Files Fixed:**
- `basic-info-section.tsx`: caseType, severity selects
- `reporter-section.tsx`: reporterType select
- `location-section.tsx`: locationCountry select

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| `6a3e1df` | feat | Add search results page and profile redirect |
| `a21cd28` | fix | Fix Radix Select empty string value error in case form |

## Verification

- [x] `/search` page exists and displays grouped search results
- [x] `/profile` page redirects to `/settings`
- [x] No `SelectItem value=""` patterns remain
- [x] TypeScript compilation passes: `npx tsc --noEmit`
- [x] All 4 Select components use `|| undefined` pattern

## Deviations from Plan

### Decision Change: Sentinel vs Undefined

**Plan specified:** Use `"__none__"` sentinel value with bidirectional conversion in onValueChange/value props.

**Actual implementation:** Used `value={x || undefined}` pattern instead.

**Reason:** The original files did not have explicit "None" SelectItem options. The error was caused by passing empty string to Radix Select when no selection was made. Using `undefined` is simpler and cleaner - Radix Select simply shows the placeholder when value is undefined. No sentinel conversion logic needed.

## Next Phase Readiness

- Search functionality now works end-to-end from top-nav
- Profile link no longer 404s
- Case creation form opens without runtime errors
- Ready for Phase 14-04: My Work Page and Navigation Corrections
