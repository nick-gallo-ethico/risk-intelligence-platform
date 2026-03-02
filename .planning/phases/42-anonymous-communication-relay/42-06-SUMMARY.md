---
phase: 42-anonymous-communication-relay
plan: 06
title: "Investigator Message Composition UI"
status: complete
subsystem: frontend
tags: [react, messaging, pii-detection, case-detail, ui-components]

dependency_graph:
  requires:
    - 42-05 (visibility level filtering)
  provides:
    - PiiWarningDialog component
    - InvestigatorComposer component
    - Case detail page messaging integration
  affects:
    - 42-07 (relay settings admin UI - if any)
    - Future phases needing PII warning patterns

tech_stack:
  added: []
  patterns:
    - Per-warning acknowledgment dialog pattern
    - Compact sidebar messaging card
    - Reusable PII warning component

key_files:
  created:
    - apps/frontend/src/components/cases/case-messaging/pii-warning-dialog.tsx
    - apps/frontend/src/components/cases/case-messaging/investigator-composer.tsx
    - apps/frontend/src/components/cases/case-messaging/index.ts
  modified:
    - apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx

decisions:
  - id: per-warning-acknowledgment
    description: "Each PII warning requires individual checkbox acknowledgment before send allowed"
    rationale: "Ensures investigators consciously review each privacy risk"
  - id: compact-sidebar-format
    description: "InvestigatorComposer uses card format for right sidebar placement"
    rationale: "Consistent with other sidebar cards (Tasks, Remediation, etc.)"
  - id: reuse-message-thread
    description: "InvestigatorComposer reuses MessageThread component from ethics portal"
    rationale: "Code reuse and consistent message display"
  - id: can-message-logic
    description: "canMessage derived from case.status !== CLOSED AND (has email OR is anonymous)"
    rationale: "Anonymous reporters have access codes for messaging"

metrics:
  duration: "~15 minutes"
  completed: "2026-03-02"
---

# Phase 42 Plan 06: Investigator Message Composition UI Summary

## One-liner

PiiWarningDialog with per-warning acknowledgment plus InvestigatorComposer compact card integrated into case detail right sidebar.

## What Was Built

### 1. PiiWarningDialog Component

Created a reusable alert dialog for PII detection warnings:

**Key Features:**

- Per-warning acknowledgment checkboxes
- "Send Anyway" button disabled until all warnings acknowledged
- Reset state when dialog opens
- Amber color theme consistent with PII warning patterns
- "Edit Message" cancel option to return to composer

**Component:** `apps/frontend/src/components/cases/case-messaging/pii-warning-dialog.tsx`

### 2. InvestigatorComposer Component

Created a compact messaging card for the case detail right sidebar:

**Key Features:**

- Displays message thread using existing MessageThread component
- Message composition textarea with Ctrl+Enter shortcut
- PII check on submit using useCheckPii hook
- Integration with PiiWarningDialog for warnings
- Loading states for sending and PII checking
- Disabled state when messaging not available
- "New" badge for unread inbound messages

**Component:** `apps/frontend/src/components/cases/case-messaging/investigator-composer.tsx`

### 3. Case Detail Page Integration

Added InvestigatorComposer to the right sidebar:

**Position:** After Connected Documents (6), before Tasks (8)
**canMessage Logic:** `case.status !== "CLOSED" && (has reporterEmail OR reporterAnonymous)`
**Callback:** `onMessageSent={fetchCase}` for data refresh

## Implementation Details

### PII Warning Flow

1. User types message in InvestigatorComposer
2. On submit, calls `checkPiiMutation.mutateAsync(content)`
3. If PII detected (hasPii && warnings.length > 0):
   - Shows PiiWarningDialog with warnings
   - User must check each warning checkbox
   - Once all acknowledged, "Send Anyway" enabled
4. On proceed, sends message with `acknowledgedPiiWarnings` parameter
5. If no PII, sends directly

### Component Hierarchy

```
InvestigatorComposer (card)
├── CardHeader (title + unread badge)
├── CardContent
│   ├── MessageThread (reused from ethics portal)
│   └── Composer form (textarea + send button)
└── PiiWarningDialog (portal/modal)
```

### CSS/Styling

- Uses existing shadcn/ui components (Card, Button, Textarea, AlertDialog)
- Amber color theme for PII warnings (`text-amber-600`, `bg-amber-50`)
- Dark mode support via Tailwind dark: prefixes
- Compact height (max-h-200px for message thread)

## Commits

| Hash     | Message                                                           |
| -------- | ----------------------------------------------------------------- |
| 83a4619f | feat(42-06): add PII warning dialog component                     |
| a920a9f8 | feat(42-06): add InvestigatorComposer component                   |
| 2abccdf6 | feat(42-06): integrate InvestigatorComposer into case detail page |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] PiiWarningDialog requires acknowledgment of each warning
- [x] InvestigatorComposer checks for PII before sending
- [x] PII warnings are displayed from API response
- [x] Message thread shows conversation history
- [x] Component disabled when messaging not available
- [x] Integration into case detail follows existing layout patterns

## Next Phase Readiness

Phase 42 is now complete. All anonymous communication relay infrastructure is in place:

1. **Plans 01-02:** Backend messaging service, delayed notifications, relay settings
2. **Plans 03-04:** Event listeners for access code and message notifications
3. **Plan 05:** Visibility level filtering
4. **Plan 06:** Frontend investigator composition UI

The anonymous relay system is ready for end-to-end testing.
