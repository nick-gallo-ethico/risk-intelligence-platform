---
phase: 40-rules-engine-foundation
plan: 04
subsystem: rules-engine
tags: [round-robin, team-assignment, action-executor, distribution]
dependency-graph:
  requires: [40-01, 40-02]
  provides: [RoundRobinTeamAction]
  affects: [40-05, 40-06]
tech-stack:
  added: []
  patterns: [round-robin-distribution, execution-log-tracking]
key-files:
  created:
    - apps/backend/src/modules/rules/engine/actions/round-robin-team.action.ts
    - apps/backend/src/modules/rules/engine/actions/round-robin-team.action.spec.ts
  modified:
    - apps/backend/src/modules/rules/engine/actions/index.ts
    - apps/backend/src/modules/rules/rules.module.ts
decisions:
  - key: team-membership-via-employee
    choice: Match User email to Employee.teamId for team membership
    rationale: User model lacks teamId; Employee model tracks team via HRIS sync
  - key: round-robin-tracking-via-log
    choice: Track last assigned user per team via RuleExecutionLog query
    rationale: No separate state table needed; leverage existing execution audit trail
  - key: consistent-ordering
    choice: Order eligible members by User.createdAt ascending
    rationale: Deterministic ordering ensures predictable round-robin sequence
metrics:
  duration: ~27min
  completed: 2026-02-27
---

# Phase 40 Plan 04: Round-Robin Team Action Summary

RoundRobinTeamAction distributes case assignments fairly across team members by tracking the last assigned user per team and assigning to the next eligible member in sequence.

## What Was Built

### RoundRobinTeamAction (Task 1)

Created the round_robin action executor implementing fair case distribution:

**Key Features:**

- Distributes cases across team members using round-robin sequence
- Tracks last assigned user per team via RuleExecutionLog lookup
- Skips inactive users automatically
- Wraps around to first member after last
- Emits CaseAssignedEvent for downstream processing

**Algorithm:**

1. Get all active users who are team members (via Employee.teamId + email match)
2. Order by User.createdAt for consistent ordering
3. Find last successful round_robin execution for this team via RuleExecutionLog
4. Parse the userId from that log's actionsTaken
5. Assign to next user in sequence (wrapping around at end)

**Validation:**

- Fails if teamId missing
- Fails if team not found in organization
- Fails if no eligible team members
- Fails if case not found

### Module Registration (Task 2)

Integrated RoundRobinTeamAction into RulesModule:

- Exported from `actions/index.ts`
- Added as provider in RulesModule
- Added to constructor for DI
- Registered with RulesEngineService in `onModuleInit()`

### Unit Tests (Task 3)

Created comprehensive test suite covering:

**Validation tests:**

- Missing teamId parameter
- Team not found in organization
- No eligible team members
- Case not found

**Round-robin logic tests:**

- Assign to first member when no prior assignments
- Assign to next member in sequence
- Wrap around to first member after last
- Start with first if last assignee no longer eligible

**Event emission:**

- CaseAssignedEvent emitted on success with correct payload

**Eligibility filtering:**

- Only ACTIVE employees included
- Only active users included
- Email matching case-insensitive

## Technical Details

### Team Membership Resolution

Since User model lacks teamId, membership is determined by:

```typescript
// 1. Get employees in team with ACTIVE status
const teamEmployees = await this.prisma.employee.findMany({
  where: {
    organizationId,
    teamId,
    employmentStatus: "ACTIVE",
  },
  select: { email: true },
});

// 2. Match to active users by email
const users = await this.prisma.user.findMany({
  where: {
    organizationId,
    isActive: true,
    email: { in: employeeEmails, mode: "insensitive" },
  },
  orderBy: { createdAt: "asc" },
});
```

### Round-Robin State Tracking

Last assignment tracked via RuleExecutionLog query:

```typescript
const lastExecution = await this.prisma.ruleExecutionLog.findFirst({
  where: {
    organizationId,
    matched: true,
    actionsTaken: {
      path: ["$"],
      array_contains: [{ actionType: "round_robin", teamId }],
    },
  },
  orderBy: { executedAt: "desc" },
});
```

### Forward Compatibility

Case model doesn't have assignedToId/assignedTeamId yet. Action is forward-compatible:

- Emits CaseAssignedEvent for downstream processing
- Logs assignment intent with full details
- Ready to update case directly once schema fields added

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash    | Message                                              |
| ------- | ---------------------------------------------------- |
| 7edf184 | feat(40-06): add RuleTesterService (includes action) |
| 13deb9c | feat(40-04): register RoundRobinTeamAction in module |
| 74b6e92 | test(40-04): add unit tests for RoundRobinTeamAction |

Note: The initial RoundRobinTeamAction implementation was committed as part of 7edf184 (40-06 work done in parallel). Task 2-3 commits are specific to this plan.

## Next Phase Readiness

RoundRobinTeamAction is ready for:

- Use in rule definitions with `type: "round_robin"` and `params: { teamId: "..." }`
- Testing via RuleTesterService (40-05/40-06)
- Integration with case routing listener

**Usage Example:**

```json
{
  "conditions": {
    "all": [
      { "fact": "severity", "operator": "severityAtLeast", "value": "HIGH" }
    ]
  },
  "actions": [
    { "type": "round_robin", "params": { "teamId": "compliance-team-id" } }
  ]
}
```

**Outstanding schema work:**

- Case model needs `assignedToId` and `assignedTeamId` fields for full action execution
