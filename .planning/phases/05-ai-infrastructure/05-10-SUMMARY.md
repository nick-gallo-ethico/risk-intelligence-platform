---
phase: 05-ai-infrastructure
plan: 10
subsystem: ai
tags: [actions, undo, prisma, mutations]
depends_on:
  requires: ["05-09"]
  provides: ["action-system", "undo-support", "ai-mutations"]
  affects: ["06-case-management", "07-investigations"]
tech-stack:
  added: []
  patterns: ["factory-pattern", "state-machine", "event-driven"]
key-files:
  created:
    - apps/backend/src/modules/ai/actions/action.types.ts
    - apps/backend/src/modules/ai/actions/actions/add-note.action.ts
    - apps/backend/src/modules/ai/actions/actions/change-status.action.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/ai/actions/action.catalog.ts
    - apps/backend/src/modules/ai/actions/action-executor.service.ts
    - apps/backend/src/modules/ai/actions/index.ts
    - apps/backend/src/modules/ai/index.ts
decisions:
  - "05-10-01: Actions use factory pattern for Prisma DI"
  - "05-10-02: Undo windows per CONTEXT.md (30s/5min/30min/24h)"
  - "05-10-03: add-note supports investigation only (CaseNote model TBD)"
  - "05-10-04: Status transitions validated via state machine pattern"
metrics:
  duration: 12 min
  completed: 2026-02-03
---

# Phase 5 Plan 10: Action System Summary

Action system with AiAction database model, ActionCatalog for registration, ActionExecutorService for preview/execute/undo, and initial add-note and change-status actions using factory pattern for Prisma injection.

## What Was Built

### 1. AiAction Database Model
- Added `AiActionStatus` enum (PENDING, EXECUTING, COMPLETED, FAILED, UNDONE)
- Added `AiAction` model with full action tracking:
  - Organization/user/conversation scoping
  - Action type, entity type/ID, input/result/previousState JSON
  - Status tracking with error field
  - Undo configuration (undoWindowSeconds, undoExpiresAt)
  - Timestamp tracking (created, executed, completed, undone)
- Indexed for efficient queries by org, entity, user, conversation, status

### 2. Action Type System
- `ActionCategory` enum: QUICK, STANDARD, CRITICAL, EXTERNAL
- `ActionContext`: org, user, role, permissions, entity
- `ActionPreview`: description, changes array, warnings
- `ActionResult`: success, message, previousState, newState
- `ActionDefinition<TInput>`: full action interface with Zod schema
- `UNDO_WINDOWS` constants: 30s, 5min, 30min, 24h, 0

### 3. ActionCatalog
- Injects PrismaService for action factories
- Registers built-in actions during onModuleInit
- `registerAction()` for custom action registration
- `getAvailableActions()` with entity type and permission filtering
- `requiresPreview()` returns true for STANDARD/CRITICAL/EXTERNAL
- `isUndoable()` and `getUndoWindow()` helpers

### 4. ActionExecutorService
- `preview()`: Validate permissions, input, canExecute, generate preview
- `execute()`: Full execution with AiAction database tracking
  - Creates record in EXECUTING state
  - Updates to COMPLETED/FAILED on result
  - Emits `ai.action.completed` event
- `undo()`: Reverse action if within window
  - Validates undo window not expired
  - Calls action's undo function
  - Updates status to UNDONE
  - Emits `ai.action.undone` event
- `getActionHistory()`: Query actions by org/entity
- `canUndo()`: Check undo availability with remaining seconds

### 5. Built-in Actions

**add-note** (QUICK, 30s undo)
- Entity types: investigation only (CaseNote model TBD)
- Permissions: investigations:notes:create
- Creates InvestigationNote with author denormalization
- Undo deletes the created note

**change-status** (STANDARD, 5min undo)
- Entity types: case, investigation
- Permissions: cases:update:status, investigations:update:status
- Validates status transitions via state machine
- Case: NEW -> OPEN/CLOSED, OPEN -> NEW/CLOSED, CLOSED -> OPEN
- Investigation: NEW -> ASSIGNED/CLOSED/ON_HOLD, etc.
- Undo reverts to previous status

## Commits

| Hash | Description |
|------|-------------|
| fb827f0 | Add AiAction model and action types |
| 1cf50db | Create ActionCatalog and ActionExecutorService |
| a76e77b | Create initial actions with full Prisma integration |

## Technical Decisions

1. **Factory pattern for Prisma DI**: Actions are plain objects but need database access. Factory functions receive PrismaService and return ActionDefinition with closures over the dependency.

2. **Undo windows per CONTEXT.md**: Quick=30s, Standard=5min, Significant=30min, Extended=24h, External=0. Actions declare their window; executor enforces it.

3. **State machine for status transitions**: Each entity type has a transition map defining valid next states from current state. Invalid transitions are blocked in canExecute.

4. **Event emission for activity feed**: Completed and undone actions emit events for audit trail and real-time UI updates.

## Dependencies Installed

- @nestjs/websockets@10
- @nestjs/platform-socket.io@10
- socket.io@4

(Required for existing AiGateway that was blocking build)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing WebSocket dependencies**
- **Found during:** Task 2
- **Issue:** Build failed due to missing @nestjs/websockets, socket.io
- **Fix:** Installed compatible versions (@10 for NestJS, @4 for socket.io)
- **Files modified:** package.json, package-lock.json
- **Commit:** 1cf50db

**2. [Rule 2 - Missing Critical] CaseNote model doesn't exist**
- **Found during:** Task 3
- **Issue:** Plan specified add-note for case and investigation, but CaseNote model doesn't exist in schema
- **Fix:** Scoped add-note to investigation only with comment noting CaseNote support TBD
- **Files modified:** add-note.action.ts
- **Commit:** a76e77b

## Verification Results

- [x] `npm run build` passes
- [x] `npx prisma migrate status` shows database in sync
- [x] AiAction model exists in schema
- [x] ActionCatalog registers add-note and change-status
- [x] ActionExecutorService has preview, execute, undo methods
- [x] Actions emit events for activity feed
- [x] Actions use Prisma for database operations

## Next Phase Readiness

**Ready for:**
- 05-11: AI API Layer (AiController, AiGateway) - COMPLETE (executed in parallel)
- Phase 6: Case Management can leverage change-status action
- Phase 7: Investigation module can leverage add-note, change-status actions

**Blockers:** None

**Notes:**
- CaseNote model needed for full add-note support on cases
- Additional actions (assign, close, merge) can be added following same factory pattern
