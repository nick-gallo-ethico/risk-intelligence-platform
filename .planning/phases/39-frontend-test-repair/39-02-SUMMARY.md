# Phase 39 Plan 02: CaseActivityTimeline Test Repair Summary

**Updated 24 CaseActivityTimeline tests to use renderWithProviders and match redesigned HubSpot-style component**

## Accomplishments

- Fixed QueryClient context errors by using renderWithProviders wrapper
- Rewrote tests to match the redesigned HubSpot-style activity timeline component
- Updated mock response format from ActivityListResponse to TimelineResponse
- Updated API endpoint expectations from old to new format
- Added tests for new features: search filtering, select all types, user/team dropdowns

## Task Commits

1. **Task 1: Replace render with renderWithProviders and update for redesigned component** - `ff1b44f` (fix)
2. **Task 2: Update CSS token assertions** - No changes needed (no hardcoded color assertions)

## Files Created/Modified

- `apps/frontend/src/components/cases/__tests__/case-activity-timeline.test.tsx` - Comprehensive test rewrite for redesigned component

## Test Count Change

- **Original:** 27 tests (for old tab-based component)
- **Updated:** 24 tests (for new checkbox-filter component)
- **Reason:** Old component had 3 modal-related tests; new component has no modal. New tests added for search, select all, and dropdowns.

## Key Changes

### Import Updates

- Removed `render` from @testing-library/react
- Added `renderWithProviders` from '@/test/renderWithProviders'
- Added `delete` to apiClient mock
- Added sonner toast mock

### API Endpoint Update

- Old: `/activity/entity/CASE/${id}`
- New: `/activity/CASE/${id}?includeRelated=true&limit=100`

### Mock Response Format Update

- Old: `{ data: Activity[], total, limit, offset }` (ActivityListResponse)
- New: `{ entries: TimelineEntry[], total, hasMore, page, limit }` (TimelineResponse)

### Test Strategy Changes

- Removed tab-based filter tests (role="tab")
- Added checkbox-based filter tests (getByLabelText)
- Removed modal open/close tests (component no longer has modal)
- Added search query filtering test
- Added select all/deselect all tests
- Added user filter dropdown test

## Decisions Made

- **Test adaptation over preservation:** Tests were completely rewritten to match the redesigned component rather than trying to force old test patterns onto new behavior
- **Test count reduction acceptable:** 24 tests adequately cover the new component's functionality; the 3 removed tests were for features that no longer exist
- **Mock toast:** Added sonner toast mock since ActivityEntry uses toast.success/info for actions

## Deviations from Plan

### Unplanned Changes

**1. Complete test rewrite instead of simple render replacement**

- **Reason:** Component was completely redesigned between original test creation and now
- **Old component:** Tab-based filters, modal for Add Note
- **New component:** Checkbox-based filters (HubSpot style), no modal (console.log placeholder)
- **Impact:** Tests now accurately reflect current component behavior

## Technical Notes

- CaseActivityTimelineSkeleton does not require QueryClient (no hooks) but renderWithProviders works fine for it
- The filter bar skeleton expects 8 checkbox skeletons (one per activity type)
- localStorage.clear() added to beforeEach/afterEach for pinned activities isolation

## Next Phase Readiness

No blockers. Plan 39-02 complete with all tests passing.
