---
status: resolved
trigger: "Investigate why the ViewModeToggle button text is getting cut off. The user reports they can't see the last letter of 'view' in the 'Table view' / 'Board view' button."
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:00:00Z
---

## Current Focus

hypothesis: SelectTrigger width constraint combined with padding and chevron icon causes text overflow
test: analyzed component code and CSS classes
expecting: width calculation doesn't account for all content
next_action: root cause confirmed

## Symptoms

expected: Full text "Table view" or "Board view" visible in button
actual: Last letter "w" in "view" is cut off
errors: None - visual rendering issue
reproduction: View any page with ViewModeToggle component
started: User reported issue

## Eliminated

N/A - root cause found immediately

## Evidence

- timestamp: 2026-02-08T00:00:00Z
  checked: ViewModeToggle.tsx line 31
  found: SelectTrigger has className="w-[130px] h-9"
  implication: Fixed width of 130px may be too narrow

- timestamp: 2026-02-08T00:00:00Z
  checked: select.tsx lines 18-33 (SelectTrigger component)
  found: SelectTrigger has className with "px-3 py-2" padding and "[&>span]:line-clamp-1"
  implication: line-clamp-1 truncates text to single line with ellipsis

- timestamp: 2026-02-08T00:00:00Z
  checked: ViewModeToggle.tsx SelectValue usage
  found: SelectValue renders icon + text: "<Table2 icon> Table view"
  implication: Icon (16px) + gap (8px) + text width must fit in 130px minus padding and chevron

- timestamp: 2026-02-08T00:00:00Z
  checked: Calculated total width requirements
  found: 130px total - 12px left padding - 12px right padding - 16px chevron - 8px gap = ~82px for icon + text
  implication: Icon (16px) + gap (8px) + "Board view" (~58px) = ~82px, very tight fit

## Resolution

root_cause: |
  SelectTrigger has fixed width of 130px (w-[130px]), which is insufficient for the content.

  The trigger contains:
  - Left padding: 12px (px-3 = 0.75rem)
  - Icon: 16px (h-4 w-4)
  - Gap: 8px (gap-2)
  - Text: "Board view" (~58px) or "Table view" (~55px)
  - Chevron icon: 16px (h-4 w-4)
  - Right padding: 12px (px-3)
  - Additional spacing for justify-between layout

  Total minimum needed: ~122-125px of actual content space, but the container is only 130px including padding.
  The [&>span]:line-clamp-1 utility in SelectTrigger causes the text to truncate with ellipsis when it overflows.

  The width calculation is too tight and doesn't properly account for all spacing.

fix: |
  Increase SelectTrigger width from w-[130px] to w-[140px] or w-[145px] in ViewModeToggle.tsx line 31.

  Change:
  <SelectTrigger className="w-[130px] h-9">

  To:
  <SelectTrigger className="w-[145px] h-9">

verification: |
  Visual inspection in browser:
  1. Load page with ViewModeToggle
  2. Verify "Table view" shows all letters including final "w"
  3. Verify "Board view" shows all letters including final "w"
  4. Verify button doesn't look too wide/awkward
  5. Test both selected states

files_changed:
  - apps/frontend/src/components/views/ViewModeToggle.tsx
