---
status: diagnosed
trigger: "Investigate the alignment issue in the sharing dialog - the Private/My Team radio button options are centered instead of properly aligned."
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:00:00Z
---

## Current Focus

hypothesis: DialogHeader has center alignment on mobile that's affecting the entire dialog
test: confirmed DialogHeader styling in dialog.tsx
expecting: found text-center class causing centering
next_action: document root cause and fix

## Symptoms

expected: Private/My Team radio button options should be left-aligned in sharing dialog
actual: Radio button options are centered in the dialog
errors: none reported
reproduction: open sharing dialog from view tab context menu
started: unknown

## Eliminated

- hypothesis: Select component has center alignment
  evidence: SelectItem uses standard left alignment with `pl-8 pr-2` padding
  timestamp: 2026-02-08T00:00:00Z

- hypothesis: Dialog content has center alignment
  evidence: DialogContent only centers the dialog itself on screen, not its content
  timestamp: 2026-02-08T00:00:00Z

## Evidence

- timestamp: 2026-02-08T00:00:00Z
  checked: ViewTabContextMenu.tsx lines 166-219 (sharing dialog)
  found: Dialog uses standard DialogHeader, DialogContent structure with Select dropdown
  implication: Issue must be in the base UI components

- timestamp: 2026-02-08T00:00:00Z
  checked: dialog.tsx lines 56-67 (DialogHeader component)
  found: DialogHeader has className: `'flex flex-col space-y-1.5 text-center sm:text-left'`
  implication: On small screens, text-center is applied which centers ALL content in the dialog, not just the header

- timestamp: 2026-02-08T00:00:00Z
  checked: select.tsx entire file
  found: Select components use standard left-aligned layout with proper padding
  implication: The Select is being overridden by the DialogHeader's text-center class which cascades down

## Resolution

root_cause: DialogHeader component in apps/frontend/src/components/ui/dialog.tsx has `text-center` class on line 62 that applies center alignment on mobile viewports. This class cascades to child elements within the dialog, causing the Select dropdown content to appear centered instead of left-aligned.

fix: The DialogHeader's `text-center` class should only apply to the header content itself (DialogTitle and DialogDescription), not cascade to the dialog body. The fix is to remove `text-center` from DialogHeader since it's intended only for the title/description text, or add a wrapper div with `text-left` around the Select in the sharing dialog to override the inherited centering.

Recommended fix: Add `className="text-left"` to the div wrapping the Select in ViewTabContextMenu.tsx (line 175) to override the inherited center alignment:
```tsx
<div className="py-4 text-left">
  <Label>Visibility</Label>
  <Select...>
```

verification: Open sharing dialog on mobile/narrow viewport and verify Private/My Team/Everyone options are left-aligned
files_changed: ['apps/frontend/src/components/views/ViewTabContextMenu.tsx']
