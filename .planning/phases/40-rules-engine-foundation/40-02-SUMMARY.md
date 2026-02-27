---
phase: 40-rules-engine-foundation
plan: 02
subsystem: rules-engine
tags: [json-rules-engine, operators, actions, evaluation]
dependency-graph:
  requires: []
  provides: [RulesEngineService, custom-operators, action-executors]
  affects: [40-03, 40-04]
tech-stack:
  added: []
  patterns: [action-executor-pattern, fresh-engine-per-eval]
key-files:
  created:
    - apps/backend/src/modules/rules/engine/rules-engine.service.ts
    - apps/backend/src/modules/rules/engine/operators/category.operator.ts
    - apps/backend/src/modules/rules/engine/operators/severity.operator.ts
    - apps/backend/src/modules/rules/engine/operators/location.operator.ts
    - apps/backend/src/modules/rules/engine/operators/index.ts
    - apps/backend/src/modules/rules/engine/actions/base.action.ts
    - apps/backend/src/modules/rules/engine/actions/assign-user.action.ts
    - apps/backend/src/modules/rules/engine/actions/assign-team.action.ts
    - apps/backend/src/modules/rules/engine/actions/index.ts
    - apps/backend/src/modules/rules/engine/index.ts
  modified:
    - apps/backend/src/modules/rules/rules.module.ts
decisions:
  - key: fresh-engine-per-evaluation
    choice: Create new json-rules-engine Engine instance for each evaluate() call
    rationale: Critical for tenant isolation - prevents fact/rule cache pollution across orgs
  - key: action-executor-pattern
    choice: Injectable services registered with engine via OnModuleInit
    rationale: Allows DI for action dependencies (PrismaService, EventEmitter)
  - key: forward-compatible-actions
    choice: AssignUserAction and AssignTeamAction emit events without direct schema update
    rationale: Case model lacks assignedToId/assignedTeamId fields; actions are ready once schema is updated
metrics:
  duration: ~20min
  completed: 2026-02-27
---

# Phase 40 Plan 02: Rules Engine Core Summary

RulesEngineService wrapping json-rules-engine with custom operators for category/severity/location matching and action executors for assign_user/assign_team outcomes.

## What Was Built

### Custom Operators (Task 1)

Created domain-specific operators extending json-rules-engine:

**Category operators:**

- `categoryIn` - Check if categoryId is in a list
- `categoryEquals` - Exact category match
- `categoryInHierarchy` - Match category or parent

**Severity operators:**

- `severityAtLeast` - Check if severity >= threshold (uses numeric levels)
- `severityEquals` - Exact severity match (case-insensitive)
- `severityIn` - Severity in list

**Location operators:**

- `locationIn` - Check if location ID in list
- `locationEquals` - Exact location match
- `regionIn` - Region-based matching

**Generic utility operators:**

- `inArray` - Single value exists in array
- `containsAny` - Any element of fact array in target array
- `notEmpty` - Value is not null/undefined/empty

### Action Executors (Task 2)

Created action executor pattern for rule outcomes:

**Base interfaces:**

- `ActionContext` - org, entity type/id, rule id, actor type
- `ActionResult` - success, actionType, details, error
- `RuleActionExecutor` - interface for all action handlers

**AssignUserAction:**

- Verifies user exists and is active in same org
- Emits `CaseAssignedEvent` for downstream processing
- Note: Case.assignedToId field not yet in schema; action is forward-compatible

**AssignTeamAction:**

- Verifies team exists in same org
- Logs assignment intent
- Note: Case.assignedTeamId field not yet in schema; action is forward-compatible

### RulesEngineService (Task 3)

Core service wrapping json-rules-engine:

**Methods:**

- `evaluate(orgId, triggerEvent, facts)` - Load active rules, evaluate, return first match
- `evaluateRule(ruleDefinition, facts)` - Test single rule without DB persistence
- `executeActions(actions, context)` - Dispatch to registered executors
- `logExecution(...)` - Write to RuleExecutionLog for audit
- `registerActionExecutor(executor)` - Register handler for action type

**Key Design:**

- Fresh Engine instance per evaluate() call (tenant isolation)
- Lower priority number = higher priority
- First matching rule wins (stop on first match)
- Execution logging for compliance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Case model lacks assignedToId/assignedTeamId**

- **Found during:** Task 2
- **Issue:** Plan assumes Case has assignedToId and assignedTeamId fields, but schema doesn't have them
- **Fix:** Made action executors forward-compatible - they emit events and log intent, but don't update non-existent fields
- **Files modified:** assign-user.action.ts, assign-team.action.ts
- **Commit:** 58e3f26

**2. [Rule 3 - Blocking] Prisma JSON type compatibility**

- **Found during:** Task 3
- **Issue:** TypeScript errors for Prisma Json field assignments
- **Fix:** Added proper type casts using `Prisma.InputJsonValue` and `Prisma.JsonNull`
- **Files modified:** rules-engine.service.ts
- **Commit:** 656074d

## Technical Details

### Operator Registration Flow

```typescript
// Called per evaluation - CRITICAL for tenant isolation
const engine = new Engine();
registerAllOperators(engine);
```

### Action Executor Registration

```typescript
// In RulesModule.onModuleInit()
this.rulesEngine.registerActionExecutor(this.assignUserAction);
this.rulesEngine.registerActionExecutor(this.assignTeamAction);
```

### Type Compatibility

The json-rules-engine `TopLevelCondition` type requires `all` or `any` arrays. Our `RuleConditions` interface is structurally compatible but needs explicit cast:

```typescript
conditions: ruleDefinition.conditions as unknown as TopLevelCondition;
```

## Commits

| Hash    | Message                                                         |
| ------- | --------------------------------------------------------------- |
| a229be3 | feat(40-02): add custom operators for rules engine              |
| 58e3f26 | feat(40-02): add action executors for rules engine              |
| 656074d | feat(40-02): implement RulesEngineService with custom operators |

## Next Phase Readiness

The RulesEngineService is ready for:

- Event listeners to call evaluate() on case.created/updated events (40-03)
- Rule testing service to use evaluateRule() (40-04)
- Additional action executors (round_robin, set_priority, etc.)

**Outstanding schema work:**

- Case model needs `assignedToId` and `assignedTeamId` fields for full action execution
- This should be added when case assignment routing is fully designed
