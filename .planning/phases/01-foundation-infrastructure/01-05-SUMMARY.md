---
phase: 01-foundation-infrastructure
plan: 05
subsystem: workflow
tags: [sla, assignment, scheduling, strategies]
dependency-graph:
  requires: [01-04-workflow-engine]
  provides:
    - SLA tracking with status calculation
    - SLA scheduler (5-minute checks)
    - Assignment rules engine
    - Pluggable assignment strategies
  affects: [notifications, case-management, investigations]
tech-stack:
  added: ["@nestjs/schedule"]
  patterns: ["strategy-pattern", "cron-scheduling", "event-driven"]
key-files:
  created:
    - apps/backend/src/modules/workflow/sla/sla.types.ts
    - apps/backend/src/modules/workflow/sla/sla-tracker.service.ts
    - apps/backend/src/modules/workflow/sla/sla-scheduler.service.ts
    - apps/backend/src/modules/workflow/assignment/strategies/base.strategy.ts
    - apps/backend/src/modules/workflow/assignment/strategies/round-robin.strategy.ts
    - apps/backend/src/modules/workflow/assignment/strategies/least-loaded.strategy.ts
    - apps/backend/src/modules/workflow/assignment/strategies/geographic.strategy.ts
    - apps/backend/src/modules/workflow/assignment/assignment-rules.service.ts
  modified:
    - apps/backend/src/modules/workflow/events/workflow.events.ts
    - apps/backend/src/modules/workflow/workflow.module.ts
decisions:
  - key: sla-status-levels
    choice: "Four levels: on_track, warning (80%), breached, critical (24h+)"
    rationale: "Matches CONTEXT.md SLA action thresholds"
  - key: scheduler-interval
    choice: "5 minutes via @Cron decorator"
    rationale: "Per CONTEXT.md requirement"
  - key: strategy-pattern
    choice: "Abstract AssignmentStrategy with registerStrategy() for extensibility"
    rationale: "Domain modules can add custom strategies without modifying core"
metrics:
  duration: 12 min
  completed: 2026-02-03
---

# Phase 01 Plan 05: SLA Tracking and Assignment Rules Summary

SLA tracking with 5-minute checks, warning/breach events, and pluggable assignment strategies (round-robin, least-loaded, geographic) for auto-routing.

## What Was Built

### SLA Tracking System

**SlaTrackerService** (`apps/backend/src/modules/workflow/sla/sla-tracker.service.ts`):
- Calculates SLA status from due date and elapsed time
- Four status levels: `on_track`, `warning` (80%+ used), `breached` (past due), `critical` (24h+ overdue)
- Batch updates all active workflow instances
- Emits events on status transitions for notification integration

**SlaSchedulerService** (`apps/backend/src/modules/workflow/sla/sla-scheduler.service.ts`):
- Runs SLA checks every 5 minutes via `@Cron(EVERY_5_MINUTES)`
- Prevents concurrent runs with `isRunning` flag
- Provides `runNow()` for manual testing/admin use

**SLA Events**:
- `WorkflowSlaWarningEvent`: Emitted when instance reaches 80% threshold
- `WorkflowSlaBreachEvent`: Emitted when instance breaches (with `hoursOverdue`)

### Assignment Rules Engine

**AssignmentRulesService** (`apps/backend/src/modules/workflow/assignment/assignment-rules.service.ts`):
- Resolves assignees based on category routing rules
- Falls back to round-robin among investigators
- Supports `registerStrategy()` for custom strategies

**Built-in Strategies**:

| Strategy | File | Logic |
|----------|------|-------|
| `round_robin` | `round-robin.strategy.ts` | Fair distribution; tracks last assignment via audit log |
| `least_loaded` | `least-loaded.strategy.ts` | Assigns to user with fewest open investigations |
| `geographic` | `geographic.strategy.ts` | Location mapping (country/region to user) |

## Key Design Decisions

1. **SLA Thresholds from CONTEXT.md**:
   - At Risk (80%): `workflow.sla_warning` event
   - Breached: `workflow.sla_breach` event with `breachLevel: 'breached'`
   - Critical (24h+): `workflow.sla_breach` event with `breachLevel: 'critical'`

2. **Strategy Pattern for Extensibility**: Domain modules can register custom strategies (e.g., `manager_of`, `skill_based`) via `registerStrategy()` without modifying core code.

3. **Category-Based Routing**: Categories can specify `defaultAssigneeId` or `routingRules` JSON with strategy type and config.

## Deviations from Plan

None - plan executed exactly as written.

## API Reference

```typescript
// SLA Tracker
slaTrackerService.calculateSlaStatus(dueDate: Date, startDate?: Date, config?: SlaConfig): SlaCalculation
slaTrackerService.updateAllSlaStatuses(): Promise<SlaCheckResult>
slaTrackerService.checkInstance(instanceId: string): Promise<SlaCalculation | null>

// SLA Scheduler
slaSchedulerService.runNow(): Promise<SlaCheckResult>  // Manual trigger

// Assignment Rules
assignmentRulesService.resolveAssignee(context: AssignmentContext): Promise<AssignmentResult | null>
assignmentRulesService.registerStrategy(strategy: AssignmentStrategy): void
assignmentRulesService.getRegisteredStrategies(): string[]
```

## Commits

| Hash | Description |
|------|-------------|
| 44da5fb | feat(01-05): create SLA Tracker Service |
| 538ea8f | feat(01-05): create SLA Scheduler Service |
| d751324 | feat(01-05): create Assignment Rules Engine with strategies |

## Integration Points

**Events Emitted**:
- `workflow.sla_warning`: For notification service to alert assignee
- `workflow.sla_breach`: For escalation to manager/executives

**Module Exports**:
- `SlaTrackerService`: For on-demand SLA calculations
- `AssignmentRulesService`: For auto-assignment during case/investigation creation

## Next Phase Readiness

Phase 1 Wave 4 now complete. SLA and assignment infrastructure ready for:
- Case management module to use `AssignmentRulesService.resolveAssignee()`
- Notification module to subscribe to SLA events
- Dashboard to display SLA status (on_track/warning/overdue)

No blockers for proceeding to next phase.
