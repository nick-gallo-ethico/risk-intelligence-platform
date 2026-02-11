---
phase: 15-case-detail-page-overhaul
plan: 10
status: complete
gap_closure: true
commits:
  - hash: 49e9253
    message: "feat(15-10): add AI case note action for case activity feed"
  - hash: a699b44
    message: "fix(15-10): add parameter descriptions to AI action schemas"
  - hash: 1572f82
    message: "fix(ai): fix zodToJsonSchema for Zod 4.x compatibility"
---

## What was done

### Task 1: Create add-case-note AI action (49e9253)

- Created `add-case-note.action.ts` with factory pattern matching existing actions
- Registers in ActionCatalog alongside add-note (investigations) and change-status
- Logs notes as AuditLog entries with `action: "note_added"` for Activity tab visibility

### Task 2: Human verification checkpoint

Both AI actions tested end-to-end in the running application:

**change-status**: User asked "Change the status of this case to OPEN" → AI called action_change-status with `{newStatus: "OPEN"}` → Status changed from NEW to OPEN, audit log created.

**add-case-note**: User asked "Add a note saying 'This case requires immediate attention'" → AI called action_add-case-note → Note added to case activity feed.

## Critical Bug Fix: Zod 4.x Compatibility (1572f82)

During human verification, change-status consistently failed with:

```
Invalid input: expected string, received undefined (path: newStatus)
```

**Root cause**: The `zodToJsonSchema()` function in `skill.types.ts` was written for Zod 3.x but the project uses Zod 4.3.6. In Zod 4:

- `_def.typeName` is `undefined` (Zod 3 used `"ZodObject"`, `"ZodString"`, etc.)
- `_def.type` returns lowercase strings: `"object"`, `"string"`, `"optional"`, etc.

The function checked `def.type` before `constructor.name`, getting `"object"` instead of `"ZodObject"`. Since `"object" !== "ZodObject"`, it fell through and returned `{"type": "object"}` with **zero properties**. Claude received empty tool schemas and never knew what parameters to pass.

**Fix**: Updated `getZodTypeName()` to normalize Zod 4's lowercase `_def.type` to PascalCase `"ZodXxx"` format. Also fixed array element access and description propagation through optional/default wrappers.

## Deviations

- a699b44 added `.describe()` to Zod schema fields (necessary but insufficient alone)
- 1572f82 was the actual fix - the zodToJsonSchema converter was fundamentally broken for Zod 4.x
- The Zod 4 bug affected ALL AI tool schemas (skills and actions), not just change-status

## Files modified

- `apps/backend/src/modules/ai/actions/actions/add-case-note.action.ts` (new)
- `apps/backend/src/modules/ai/actions/actions/change-status.action.ts` (descriptions added)
- `apps/backend/src/modules/ai/actions/action.catalog.ts` (registration)
- `apps/backend/src/modules/ai/skills/skill.types.ts` (Zod 4 compatibility fix)
