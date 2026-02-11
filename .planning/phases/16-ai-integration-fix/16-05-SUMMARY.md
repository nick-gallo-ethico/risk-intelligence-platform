---
phase: 16-ai-integration-fix
plan: 05
subsystem: frontend-ai-components
tags: [ai-actions, preview-execute, frontend, hooks, components]
dependency-graph:
  requires: [16-02]
  provides: [useAiActions-hook, AiActionPreview-component]
  affects: [AI panel consumers, case detail page]
tech-stack:
  added: []
  patterns: [preview-then-execute, React hooks, shadcn/ui AlertDialog]
key-files:
  created:
    - apps/frontend/src/hooks/useAiActions.ts
    - apps/frontend/src/components/ai/ai-action-preview.tsx
  modified: []
decisions:
  - decision: Skip Task 3 (AI panel integration)
    rationale: Phase 15 built ai-chat-panel.tsx with WebSocket-based action execution, not REST preview/execute flow
    alternative: Could refactor Phase 15 component but out of scope
metrics:
  duration: 15m
  completed: 2026-02-11
---

# Phase 16 Plan 05: AI Action Frontend Components Summary

**One-liner:** Frontend hooks and components for AI action preview-then-execute pattern with field-level change display and undo window info.

## Completed Tasks

| Task | Name                            | Commit           | Files                                                 |
| ---- | ------------------------------- | ---------------- | ----------------------------------------------------- |
| 1    | Create useAiActions hook        | a479070, d0849e2 | apps/frontend/src/hooks/useAiActions.ts               |
| 2    | Create AI action preview dialog | 67986f1, 821d2c7 | apps/frontend/src/components/ai/ai-action-preview.tsx |
| 3    | Integrate into AI panel         | SKIPPED          | -                                                     |

**Note:** Tasks 1 and 2 were committed as part of plan 16-04 execution due to lint-staged staging behavior. The artifacts are complete and verified.

## Task 3 Skip Rationale

Task 3 was skipped per execution notes. Phase 15 built `ai-chat-panel.tsx` with a different architecture:

- Phase 15 uses **WebSocket events** for action execution
- Plan 16-05 Task 3 assumes **REST preview/execute flow**
- Integration would require refactoring Phase 15's component
- Actions can still be triggered via the useAiActions hook from other contexts

## What Was Built

### useAiActions Hook (`apps/frontend/src/hooks/useAiActions.ts`)

React hook implementing the preview-then-execute pattern for AI actions.

**Functions:**

- `listActions(entityType?)` - List available actions for an entity type
- `preview(actionId, params)` - Preview changes before execution
- `execute(actionId, params)` - Execute action after preview
- `undo(actionRecordId, params)` - Undo within undo window
- `canUndo(actionRecordId, entityType, entityId)` - Check undo availability

**State:**

- `isLoading` - Loading state
- `error` - Error message
- `currentPreview` - Preview result for display
- `lastResult` - Last execution result for undo tracking
- `clearPreview()` - Clear preview state

**Endpoints Called:**

- GET `/ai/actions?entityType=` - List actions
- POST `/ai/actions/:id/preview` - Preview
- POST `/ai/actions/:id/execute` - Execute
- POST `/ai/actions/:id/undo` - Undo
- GET `/ai/actions/:id/can-undo` - Check undo

### AiActionPreview Component (`apps/frontend/src/components/ai/ai-action-preview.tsx`)

Confirmation dialog for the preview-then-execute pattern.

**Features:**

- Field-level before/after value display
- Undo window information (e.g., "Undo available for 5 minutes")
- Warning display from preview
- Visual distinction for non-undoable actions (amber button)
- Loading state during execution
- Uses shadcn/ui AlertDialog primitives

**Props:**

- `actionId` - Action being previewed
- `preview` - Preview data from backend
- `isOpen` - Dialog open state
- `isLoading` - Execution loading state
- `undoWindowSeconds` - Undo window (0 = not undoable)
- `onConfirm` - Confirm callback
- `onCancel` - Cancel callback

## Usage Example

```tsx
import { useAiActions } from "@/hooks/useAiActions";
import { AiActionPreview } from "@/components/ai/ai-action-preview";

function CaseActions({ caseId }: { caseId: string }) {
  const { preview, execute, currentPreview, isLoading, clearPreview } =
    useAiActions();
  const [showPreview, setShowPreview] = useState(false);

  const handleChangeStatus = async () => {
    const previewResult = await preview("change-status", {
      input: { newStatus: "CLOSED" },
      entityType: "case",
      entityId: caseId,
    });
    if (previewResult) {
      setShowPreview(true);
    }
  };

  const handleConfirm = async () => {
    await execute("change-status", {
      input: { newStatus: "CLOSED" },
      entityType: "case",
      entityId: caseId,
    });
    setShowPreview(false);
  };

  return (
    <>
      <Button onClick={handleChangeStatus}>Close Case</Button>
      {currentPreview && (
        <AiActionPreview
          actionId="change-status"
          preview={currentPreview}
          isOpen={showPreview}
          isLoading={isLoading}
          undoWindowSeconds={300}
          onConfirm={handleConfirm}
          onCancel={() => {
            clearPreview();
            setShowPreview(false);
          }}
        />
      )}
    </>
  );
}
```

## Deviations from Plan

### Task 3 Skipped - Phase 15 Overlap

**Reason:** Phase 15 built the AI chat panel with WebSocket-based action execution, making REST integration incompatible without refactoring.

**Impact:** None for this plan. Actions are available via hook for use in other components.

## Verification

- [x] useAiActions.ts provides preview/execute/undo functions
- [x] AiActionPreview shows changes with before/after values
- [x] TypeScript compiles: `cd apps/frontend && npx tsc --noEmit`
- [x] Files tracked in git

## Files Created

| File                                                    | Purpose                                         |
| ------------------------------------------------------- | ----------------------------------------------- |
| `apps/frontend/src/hooks/useAiActions.ts`               | Hook for preview-then-execute AI action pattern |
| `apps/frontend/src/components/ai/ai-action-preview.tsx` | Confirmation dialog showing action changes      |

## Next Steps

1. **Plan 16-06** - If exists, continue with next AI integration tasks
2. **Future:** Consider adding action buttons to case detail page using useAiActions
3. **Future:** Add undo toast notification using lastResult from hook
