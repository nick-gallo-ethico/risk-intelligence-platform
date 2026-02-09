---
status: resolved
trigger: "Investigate why clicking bulk action buttons (in the BulkActionsBar) only deselects items and hides the bar instead of performing actions."
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:10:00Z
---

## Current Focus

hypothesis: Bulk action handlers are not properly connected to onClick events
test: Examining DataTable.tsx, BulkActionsBar component, and SavedViewProvider
expecting: Find missing or incorrect onClick handler wiring
next_action: Read DataTable.tsx to see how BulkActionsBar is implemented

## Symptoms

expected: Clicking bulk action buttons should perform actions (e.g., delete, archive, assign)
actual: Clicking bulk action buttons only deselects items and hides the bar
errors: None reported
reproduction: Click checkbox(es) to select items, then click any bulk action button
started: Unknown - current behavior

## Eliminated

## Evidence

- timestamp: 2026-02-08T00:05:00Z
  checked: DataTable.tsx lines 333-339
  found: handleBulkAction calls onBulkAction prop and then handleClearSelection
  implication: DataTable properly wires bulk action to callback

- timestamp: 2026-02-08T00:06:00Z
  checked: BulkActionsBar.tsx lines 75-108
  found: handleAction and handleConfirmedAction both call onAction prop with (actionId, selectedIds)
  implication: BulkActionsBar properly calls parent handler

- timestamp: 2026-02-08T00:07:00Z
  checked: cases/page.tsx line 144
  found: onBulkAction={handleBulkAction} is passed to DataTable
  implication: The handler is properly wired from page → DataTable

- timestamp: 2026-02-08T00:08:00Z
  checked: useCasesView.ts lines 259-307
  found: handleBulkAction implementation handles various action IDs
  implication: The actual business logic exists

## Resolution

root_cause: **FOUND** - The issue is in DataTable.tsx line 336. After calling onBulkAction, it immediately calls handleClearSelection(), which clears the selection and hides the bar. This happens SYNCHRONOUSLY before the onBulkAction can complete, creating the appearance that nothing happened except deselection.

The sequence is:
1. User clicks bulk action button
2. BulkActionsBar calls onAction (handleBulkAction from DataTable)
3. DataTable.handleBulkAction calls onBulkAction?.(actionId, ids) - this is async
4. DataTable.handleBulkAction IMMEDIATELY calls handleClearSelection() - doesn't wait
5. Selection clears, bar disappears before the actual action completes
6. User sees only the deselection, not the action result

fix: Make handleBulkAction await the onBulkAction promise before clearing selection:
```typescript
const handleBulkAction = useCallback(
  async (actionId: string, ids: string[]) => {
    await onBulkAction?.(actionId, ids);  // Add await
    handleClearSelection();
  },
  [onBulkAction, handleClearSelection],
);
```

verification: After fix, clicking bulk actions should show "Processing..." state, perform the action, show success toast, then clear selection
files_changed: []
