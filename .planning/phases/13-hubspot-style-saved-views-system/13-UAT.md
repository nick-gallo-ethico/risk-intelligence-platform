---
status: diagnosed
phase: 13-hubspot-style-saved-views-system
source: 13-01-SUMMARY.md through 13-15-SUMMARY.md
started: 2026-02-07T08:30:00Z
updated: 2026-02-09T02:30:00Z
---

## Current Test

[diagnosed - ready for fix planning]

## Tests

### 1. View Tabs Display

expected: View tabs appear at top of Cases list page showing saved views. Active tab is visually highlighted.
result: pass

### 2. Cases Page Load

expected: Cases list page loads within 2 seconds with data table visible showing case records.
result: pass (re-test)
note: Fixed by changing limit/offset params in view hooks

### 3. Add View Button

expected: Plus button visible next to view tabs. Clicking it opens a create view dialog.
result: pass (re-test)
note: Fixed by removing @IsObject() validation

### 4. Toolbar Elements

expected: Toolbar shows Search box, Edit Columns button, Filter button, Sort button, Export button.
result: issue
reported: "Table view/board view button text cut off - can't see last letter of 'view'"
severity: cosmetic

### 5. Data Table Display

expected: Data table shows case records with columns: Number, Title, Status, Priority, Category, etc.
result: issue
reported: "Summary field only shows 27 characters regardless of column width"
severity: minor

### 6. Column Selection Modal

expected: Clicking "Edit Columns" opens modal with two-panel layout for available/selected columns.
result: pass

### 7. Quick Filters Row

expected: Filter button toggles visibility of quick filters row with date range and multi-select filters.
result: pass

### 8. Pagination Controls

expected: Bottom of table shows pagination with page numbers, Previous/Next buttons, and page size dropdown.
result: pass (re-test)

### 9. Checkbox Selection

expected: First column has checkboxes. Selecting rows shows bulk actions bar.
result: issue
reported: "Bulk actions bar appears but clicking buttons only deselects items and hides bar - no actual action performed"
severity: major

### 10. View Mode Toggle

expected: If supported, toolbar shows Table/Board view toggle. Switching changes display mode.
result: pass

### 11. Board View Cards

expected: In Board view, cards display with title, priority badge, and owner avatar in status lanes.
result: issue
reported: "Board view cards missing priority badge and owner avatar in lanes. Cards too wide. Drag-and-drop doesn't persist status change - card returns to original lane. Priority badge only visible when dragging."
severity: major

### 12. Investigations Page Views

expected: Investigations page shows view tabs with default views like "All Investigations", "Active Investigations".
result: issue
reported: "View tabs visible but no investigations data loading"
severity: major

### 13. Policies Page Views

expected: Policies page shows view tabs with default views like "All Policies", "Published Policies".
result: pass
note: View tabs visible but no policies loaded (data issue)

### 14. Disclosures Page Views

expected: Disclosures page shows view tabs with default views including risk-based filtering.
result: pass
note: View tabs visible but no disclosures loaded - shows "No disclosures match your current filters"

### 15. URL State Sync

expected: View ID and filters appear in URL. Refreshing page maintains the same state.
result: pass (re-test)
note: Fixed by adding Array.isArray defensive checks

### 16. Sort Functionality

expected: Clicking column header sorts table. Sort indicator (chevron) shows direction.
result: pass (re-test)

### 17. Search Box Filtering

expected: Typing in search box filters table results after 300ms debounce.
result: issue
reported: "Typing in search box causes all table contents to disappear instead of filtering"
severity: major

### 18. Export Button

expected: Export button dropdown shows Excel and CSV options. Clicking downloads file.
result: issue
reported: "Export dropdown shows Excel/CSV options but clicking does nothing - file doesn't download"
severity: major

### 19. Tab Context Menu

expected: Three-dot menu on view tabs shows Rename, Clone, Manage Sharing, Delete options.
result: issue
reported: "Sharing dialog works but alignment issue - Private/My Team options are centered in the box instead of properly aligned"
severity: cosmetic

### 20. Create View Dialog

expected: Create view dialog has Name field and Visibility selector (Private/Team/Everyone).
result: pass
note: Fixed by removing @IsObject() validation

## Summary

total: 20
passed: 12
issues: 8
pending: 0
skipped: 0

## Gaps

- truth: "Toolbar buttons should not have text cut off"
  status: failed
  reason: "User reported: Table view/board view button text cut off - can't see last letter of 'view'"
  severity: cosmetic
  test: 4
  root_cause: "SelectTrigger has fixed w-[130px] which is too narrow; line-clamp-1 truncates text"
  artifacts:
    - path: "apps/frontend/src/components/views/ViewModeToggle.tsx"
      issue: "Line 31: w-[130px] too narrow"
  missing:
    - "Change w-[130px] to w-[145px] in ViewModeToggle.tsx line 31"
  debug_session: ".planning/debug/viewmodetoggle-text-cutoff.md"

- truth: "Summary field should show full content or truncate with ellipsis based on column width"
  status: failed
  reason: "User reported: Summary field only shows 27 characters regardless of column width"
  severity: minor
  test: 5
  root_cause: "Default cell renderer has hardcoded max-w-[200px] that overrides column width"
  artifacts:
    - path: "apps/frontend/src/components/views/DataTable.tsx"
      issue: "Line 283: max-w-[200px] overrides configured column width"
  missing:
    - "Remove max-w-[200px] from line 283, keep only 'truncate block'"
  debug_session: ".planning/debug/summary-field-truncation-27-chars.md"

- truth: "Bulk actions bar buttons should perform their actions"
  status: failed
  reason: "User reported: Bulk actions bar appears but clicking buttons only deselects items and hides bar - no actual action performed"
  severity: major
  test: 9
  root_cause: "handleBulkAction doesn't await onBulkAction before calling handleClearSelection"
  artifacts:
    - path: "apps/frontend/src/components/views/DataTable.tsx"
      issue: "Lines 333-339: Missing async/await in handleBulkAction callback"
  missing:
    - "Add async keyword to callback and await onBulkAction before clearing selection"
  debug_session: ".planning/debug/resolved/bulk-actions-not-working.md"

- truth: "Board view cards should show priority badge, owner avatar, and drag-drop should persist status changes"
  status: failed
  reason: "User reported: Board view cards missing priority badge and owner avatar in lanes. Cards too wide. Drag-and-drop doesn't persist status change - card returns to original lane."
  severity: major
  test: 11
  root_cause: "Three issues: (1) Field name mismatches in cardConfig (severity vs priority, createdBy vs assignee), (2) Missing w-full class on card, (3) Frontend calls non-existent /cases/bulk endpoint"
  artifacts:
    - path: "apps/frontend/src/lib/views/configs/cases.config.ts"
      issue: "Lines 465-466: priorityField='severity' should be 'priority', ownerField='createdBy.firstName' should be 'assignee.name'"
    - path: "apps/frontend/src/components/views/BoardCard.tsx"
      issue: "Line 76: Missing w-full class"
    - path: "apps/frontend/src/hooks/views/useCasesView.ts"
      issue: "Lines 170-186: Calls non-existent /cases/bulk endpoint for status changes"
  missing:
    - "Fix cardConfig field names in cases.config.ts"
    - "Add w-full to BoardCard className"
    - "Change handleStatusChange to call PATCH /cases/:id/status instead of POST /cases/bulk"
  debug_session: ".planning/debug/board-view-visibility-drag-issues.md"

- truth: "Investigations page should load investigation data"
  status: failed
  reason: "User reported: View tabs visible but no investigations data loading"
  severity: major
  test: 12
  root_cause: "Backend missing GET /investigations endpoint and InvestigationsService.findAll() method"
  artifacts:
    - path: "apps/backend/src/modules/investigations/investigations.service.ts"
      issue: "Missing findAll() method - only has findAllForCase()"
    - path: "apps/backend/src/modules/investigations/investigations.controller.ts"
      issue: "Missing GET /investigations endpoint"
  missing:
    - "Add findAll() method to InvestigationsService"
    - "Add GET /investigations endpoint to InvestigationsController"
  debug_session: ".planning/debug/resolved/investigations-view-no-data.md"

- truth: "Search box should filter table results, not hide all data"
  status: failed
  reason: "User reported: Typing in search box causes all table contents to disappear instead of filtering"
  severity: major
  test: 17
  root_cause: "Seeded cases have null search_vector because prisma.case.createMany() bypasses PostgreSQL triggers"
  artifacts:
    - path: "apps/backend/prisma/seeders/case.seeder.ts"
      issue: "Line 653: createMany() bypasses triggers, search_vector stays null"
  missing:
    - "Add SQL UPDATE after createMany to populate search_vector for seeded cases"
  debug_session: ".planning/debug/resolved/search-box-clears-table.md"

- truth: "Export button should download Excel/CSV files"
  status: failed
  reason: "User reported: Export dropdown shows Excel/CSV options but clicking does nothing - file doesn't download"
  severity: major
  test: 18
  root_cause: "Backend controllers missing POST /{entity}/export endpoints"
  artifacts:
    - path: "apps/backend/src/modules/cases/cases.controller.ts"
      issue: "Missing POST /cases/export endpoint"
    - path: "apps/backend/src/modules/policies/policies.controller.ts"
      issue: "Missing POST /policies/export endpoint"
    - path: "apps/backend/src/modules/investigations/investigations.controller.ts"
      issue: "Missing POST /investigations/export endpoint"
  missing:
    - "Add POST /export endpoint to each affected controller using ExcelExportService"
  debug_session: ".planning/debug/resolved/excel-csv-export-not-working.md"

- truth: "Sharing dialog radio buttons should be properly aligned"
  status: failed
  reason: "User reported: Sharing dialog works but alignment issue - Private/My Team options are centered in the box instead of properly aligned"
  severity: cosmetic
  test: 19
  root_cause: "DialogHeader's text-center class cascades to dialog body, affecting Select dropdown"
  artifacts:
    - path: "apps/frontend/src/components/views/ViewTabContextMenu.tsx"
      issue: "Line 175: Needs explicit text-left class to override inherited centering"
  missing:
    - "Add text-left class to the div wrapper around the Select component"
  debug_session: ".planning/debug/resolved/sharing-dialog-alignment.md"
