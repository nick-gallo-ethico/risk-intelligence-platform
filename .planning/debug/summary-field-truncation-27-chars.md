---
status: resolved
trigger: "Investigate why the Summary field in the DataTable only shows 27 characters regardless of column width."
created: 2026-02-08T10:30:00Z
updated: 2026-02-08T10:45:00Z
---

## Current Focus

hypothesis: Fixed-width max-w CSS class causing truncation regardless of column width
test: Found hardcoded max-w-[200px] in default cell renderer
expecting: This limits all text cells to 200px (~27 characters)
next_action: Diagnosis complete

## Symptoms

expected: Summary field should expand to fill the configured column width (300px from config)
actual: Summary field truncates at exactly 27 characters regardless of column width setting
errors: None - visual display issue only
reproduction:
1. Open Cases table
2. Observe Summary column
3. Text truncates at ~27 characters even when column is wider
started: Reported by user

## Evidence

- timestamp: 2026-02-08T10:32:00Z
  checked: DataTable.tsx renderCell function lines 279-289
  found: Default text rendering case has hardcoded `max-w-[200px]` class
  implication: This overrides the column width set by TanStack Table

- timestamp: 2026-02-08T10:35:00Z
  checked: cases.config.ts summary column definition
  found: Summary column configured with width: 300 (line 95)
  implication: Column width setting is correct but being overridden by CSS

- timestamp: 2026-02-08T10:40:00Z
  checked: DataTable.tsx cell rendering (lines 434-448)
  found: TD element correctly applies `width: cell.column.getSize()` inline style
  implication: Table structure respects column width, but cell content has hardcoded max-width

## Resolution

root_cause: |
  The default cell renderer in DataTable.tsx (lines 279-289) applies a hardcoded
  `max-w-[200px]` Tailwind class to text content longer than 50 characters.

  Code location: apps/frontend/src/components/views/DataTable.tsx:283
  ```typescript
  default: {
    const strValue = String(value);
    if (strValue.length > 50) {
      return (
        <span title={strValue} className="truncate block max-w-[200px]">
          {strValue}
        </span>
      );
    }
    return strValue;
  }
  ```

  The max-w-[200px] class (200 pixels ≈ 27 characters) overrides the column's
  configured width from the table configuration. While the TD element correctly
  respects the column width (300px for summary), the inner span restricts content
  to 200px.

fix: |
  Remove the hardcoded max-w-[200px] and let the cell inherit the column width.
  The parent TD already has the correct width from TanStack Table's column sizing.

  Change line 283 from:
  <span title={strValue} className="truncate block max-w-[200px]">

  To:
  <span title={strValue} className="truncate block">

  The truncate class will still work but will respect the column's width instead
  of being artificially limited to 200px.

verification: |
  1. Remove max-w-[200px] from DataTable.tsx line 283
  2. Reload Cases table
  3. Verify Summary column text fills the full 300px width
  4. Verify text still truncates with ellipsis when exceeding column width
  5. Verify title attribute still shows full text on hover

files_changed:
  - apps/frontend/src/components/views/DataTable.tsx
