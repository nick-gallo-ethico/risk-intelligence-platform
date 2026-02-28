# Phase 41: SLA Monitoring & Escalation - Research

**Researched:** 2026-02-28
**Domain:** SLA monitoring, escalation automation, scheduled job processing, notification triggers
**Confidence:** HIGH

## Summary

This phase extends the existing SLA infrastructure (from Phase 7's notifications and Phase 40's rules engine) to provide case-level SLA monitoring with configurable warning thresholds, breach detection, and admin-configurable escalation rules. The codebase already has:

1. **SlaTrackerService** and **SlaSchedulerService** for workflow-level SLA monitoring (every 5 minutes via `@Cron`)
2. **SLA events** (`sla.warning`, `sla.breached`, `sla.critical`) with listener integration
3. **NotificationService** with routing, email queueing, and in-app notifications
4. **RulesEngineService** with json-rules-engine for evaluating conditions and executing actions
5. **BullMQ** job infrastructure for background processing

The primary work is:

1. Adding case-level SLA configuration (either per-category or per-workflow template)
2. Extending the SLA scheduler to monitor cases directly (not just workflow instances)
3. Creating an `EscalationRule` model that integrates with the existing rules engine
4. Building an admin UI for SLA configuration and escalation rule management

**Primary recommendation:** Extend existing `SlaTrackerService` to support direct case SLA monitoring, and create escalation rules as a specialized `RuleDefinition` with `triggerEvent: 'sla.warning'` or `triggerEvent: 'sla.breached'`.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library               | Version | Purpose         | Why Standard                                      |
| --------------------- | ------- | --------------- | ------------------------------------------------- |
| @nestjs/schedule      | 4.0.1   | Cron scheduling | Already configured for SLA checks every 5 minutes |
| @nestjs/bullmq        | 10.3.1  | Job queuing     | Already used for email, export, AI jobs           |
| json-rules-engine     | 7.3.1   | Rule evaluation | Already installed for Phase 40 routing rules      |
| @nestjs/event-emitter | 3.0.1   | Event dispatch  | Already powers all SLA events                     |

### Supporting

| Library         | Version | Purpose           | When to Use                                |
| --------------- | ------- | ----------------- | ------------------------------------------ |
| class-validator | 0.14.1  | DTO validation    | Validating SLA config and escalation rules |
| date-fns        | 2.30.0  | Date calculations | SLA due date calculations (already used)   |

### Alternatives Considered

| Instead of            | Could Use                     | Tradeoff                                                                                         |
| --------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| @nestjs/schedule Cron | BullMQ repeatable jobs        | Cron simpler for single-server; BullMQ better for distributed but adds complexity                |
| Polling every 5 min   | Event-driven (on case update) | Polling catches all cases including stale ones; event-driven misses cases with no activity       |
| Extend RuleDefinition | Separate EscalationRule model | Using RuleDefinition keeps one rule engine; separate model cleaner but duplicates infrastructure |

**Installation:**
No additional packages needed - all required packages already installed.

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/modules/
├── workflow/sla/                     # EXISTING - extend for case SLA
│   ├── sla-scheduler.service.ts      # Add case SLA check job
│   ├── sla-tracker.service.ts        # Add case SLA calculation
│   ├── sla-config.service.ts         # NEW: Per-org SLA configuration
│   └── sla.types.ts                  # Extend with CaseSlaConfig
├── rules/
│   ├── escalation/                   # NEW: Escalation rule specialization
│   │   ├── escalation.service.ts     # Escalation rule CRUD
│   │   ├── escalation-trigger.listener.ts  # Listen to sla.* events
│   │   └── escalation.types.ts       # Escalation-specific types
│   └── engine/actions/
│       ├── escalate-to-user.action.ts  # NEW: Assign + notify
│       └── escalate-to-role.action.ts  # NEW: Find user by role, assign
├── notifications/listeners/
│   └── sla.listener.ts               # EXISTING - enhance with escalation
```

### Pattern 1: Case-Level SLA Configuration

**What:** Store SLA settings at organization or category level, apply to cases
**When to use:** RULE-03 - configurable warning threshold (default 80%)
**Example:**

```typescript
// Extend existing sla.types.ts
export interface CaseSlaConfig {
  /** Default SLA days for cases (overridable by category) */
  defaultDays: number;

  /** Warning threshold percentage (default 80%) */
  warningThresholdPercent: number;

  /** Hours after breach to trigger critical escalation (default 48) */
  criticalThresholdHours: number;

  /** Per-severity overrides */
  severityOverrides?: {
    [severity: string]: number; // Days
  };

  /** Per-category overrides */
  categoryOverrides?: {
    [categoryId: string]: number; // Days
  };
}

// Store in Organization.settings JSON or new OrgSlaConfig model
```

### Pattern 2: Extend SLA Scheduler for Cases

**What:** Add case monitoring to the existing 5-minute SLA check
**When to use:** RULE-03, RULE-04 - monitor case SLAs continuously
**Example:**

```typescript
// Extend existing SlaSchedulerService
@Cron(CronExpression.EVERY_5_MINUTES)
async handleSlaCheck(): Promise<void> {
  if (this.isRunning) return;

  this.isRunning = true;
  try {
    // Existing: workflow instances
    const workflowResult = await this.slaTracker.updateAllSlaStatuses();

    // NEW: case-level SLA
    const caseResult = await this.caseSlaTracker.checkAllCaseSlas();

    this.logger.log(
      `SLA check: workflows=${workflowResult.checked}, cases=${caseResult.checked}`
    );
  } finally {
    this.isRunning = false;
  }
}
```

### Pattern 3: Case SLA Tracker Service

**What:** Calculate and emit SLA events for cases based on creation time and org config
**When to use:** All case SLA checks
**Example:**

```typescript
@Injectable()
export class CaseSlaTrackerService {
  async checkAllCaseSlas(): Promise<SlaCheckResult> {
    // Get all orgs with SLA config
    const orgs = await this.getOrgsWithSlaConfig();

    let totalChecked = 0,
      warnings = 0,
      breaches = 0;

    for (const org of orgs) {
      const config = org.slaConfig as CaseSlaConfig;

      // Find cases that are open and have SLA tracking
      const cases = await this.prisma.case.findMany({
        where: {
          organizationId: org.id,
          status: { notIn: ["CLOSED", "MERGED"] },
        },
        include: { primaryCategory: true },
      });

      for (const caseRecord of cases) {
        const dueDate = this.calculateDueDate(caseRecord, config);
        const calc = this.calculateSlaStatus(
          dueDate,
          caseRecord.createdAt,
          config,
        );

        // Emit events on status transitions
        if (this.shouldEmitWarning(caseRecord, calc)) {
          this.emitSlaWarning(caseRecord, calc);
          warnings++;
        }
        if (this.shouldEmitBreach(caseRecord, calc)) {
          this.emitSlaBreach(caseRecord, calc);
          breaches++;
        }

        totalChecked++;
      }
    }

    return { checked: totalChecked, warnings, breaches };
  }
}
```

### Pattern 4: Escalation Rules as RuleDefinitions

**What:** Reuse existing rules engine for escalation triggers
**When to use:** RULE-05 - configurable escalation triggers
**Example:**

```typescript
// Escalation rule stored as RuleDefinition with special triggerEvent
const escalationRule: RuleDefinition = {
  name: "High Severity Unassigned Escalation",
  triggerEvent: "escalation.check", // Custom trigger event
  conditions: {
    all: [
      { fact: "case.severity", operator: "equal", value: "HIGH" },
      { fact: "case.hoursUnassigned", operator: "greaterThan", value: 4 },
    ],
  },
  actions: [
    {
      type: "escalate_to_role",
      params: { role: "COMPLIANCE_OFFICER", notifyOriginalAssignee: true },
    },
  ],
};

// Escalation listener triggers rule evaluation
@Injectable()
export class EscalationTriggerListener {
  @OnEvent("sla.warning", { async: true })
  @OnEvent("sla.breached", { async: true })
  async handleSlaEvent(
    event: SlaWarningEvent | SlaBreachedEvent,
  ): Promise<void> {
    // Load case with all facts needed for escalation rules
    const caseData = await this.loadCaseWithFacts(event.caseId);

    // Evaluate escalation rules
    const result = await this.rulesEngine.evaluate(
      event.organizationId,
      "escalation.check",
      { case: caseData, slaEvent: event },
    );

    if (result.matched) {
      await this.rulesEngine.executeActions(result.triggeredActions, {
        organizationId: event.organizationId,
        entityType: "CASE",
        entityId: event.caseId,
        triggeredByRuleId: result.matchedRuleId,
      });
    }
  }
}
```

### Pattern 5: Escalate-To-Role Action

**What:** Action that finds user by role and assigns + notifies
**When to use:** RULE-05 - escalate to CCO
**Example:**

```typescript
@Injectable()
export class EscalateToRoleAction implements RuleActionExecutor {
  readonly type = "escalate_to_role";

  async execute(
    params: { role: string; notifyOriginalAssignee?: boolean },
    context: ActionContext,
  ): Promise<ActionResult> {
    // Find user with specified role in org
    const targetUser = await this.prisma.user.findFirst({
      where: {
        organizationId: context.organizationId,
        role: params.role as UserRole,
        isActive: true,
      },
    });

    if (!targetUser) {
      return {
        success: false,
        actionType: this.type,
        error: `No active user found with role ${params.role}`,
      };
    }

    // Get case for context
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: context.entityId },
      include: { investigations: { include: { primaryInvestigator: true } } },
    });

    // Emit escalation event (picked up by NotificationService)
    this.eventEmitter.emit(
      "case.escalated",
      new CaseEscalatedEvent({
        organizationId: context.organizationId,
        caseId: context.entityId,
        escalatedToUserId: targetUser.id,
        escalatedFromUserId:
          caseRecord?.investigations[0]?.primaryInvestigatorId,
        reason: `Escalated by rule: ${context.triggeredByRuleId}`,
        ruleId: context.triggeredByRuleId,
      }),
    );

    return {
      success: true,
      actionType: this.type,
      details: {
        escalatedTo: targetUser.id,
        role: params.role,
      },
    };
  }
}
```

### Anti-Patterns to Avoid

- **Polling too frequently:** 5-minute intervals are sufficient; more frequent adds load without benefit
- **Sending duplicate notifications:** Track last notification sent (per case+type) to avoid spam
- **Hardcoding escalation paths:** All escalation logic should be configurable via rules
- **Blocking SLA checks:** Always run asynchronously; use `{ async: true }` on event handlers
- **Skipping audit logging:** Every escalation must be logged for compliance

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                   | Don't Build                   | Use Instead                                       | Why                                       |
| ------------------------- | ----------------------------- | ------------------------------------------------- | ----------------------------------------- |
| Scheduled job execution   | Custom setTimeout/setInterval | @nestjs/schedule with Cron                        | Handles app restarts, provides monitoring |
| Rule evaluation           | Custom IF/ELSE chains         | json-rules-engine via RulesEngineService          | Already integrated, tested, audited       |
| Email delivery            | Direct SMTP calls             | NotificationService + BullMQ queue                | Handles retries, tracking, preferences    |
| Date calculations         | Manual math                   | date-fns (already used)                           | Handles timezones, edge cases             |
| Concurrent job protection | Manual flags                  | Existing isRunning pattern in SlaSchedulerService | Already tested                            |

**Key insight:** Most of the infrastructure exists. Phase 41 is primarily about:

1. Extending SLA tracking from workflows to cases
2. Creating escalation rules as a new RuleDefinition type
3. Adding configuration UI for SLA thresholds and escalation rules

## Common Pitfalls

### Pitfall 1: Notification Spam on Repeated SLA Checks

**What goes wrong:** Same warning/breach notification sent every 5 minutes
**Why it happens:** Not tracking which notifications have been sent
**How to avoid:**

- Track `lastSlaNotifiedAt` and `lastSlaNotificationType` on Case
- Only emit events when transitioning to NEW status (not on every check)
- Use the existing pattern from SlaTrackerService: check previousStatus !== newStatus
  **Warning signs:** Users report receiving same notification repeatedly

### Pitfall 2: Escalation Without Audit Trail

**What goes wrong:** Escalations happen but no record of why
**Why it happens:** Skipping RuleExecutionLog for escalation rules
**How to avoid:**

- All escalation rule executions MUST be logged via RuleExecutionLog
- Add `case.escalated` event with full context
- Log both successful and failed escalation attempts
  **Warning signs:** Compliance audits fail, "who escalated this?" questions

### Pitfall 3: Timezone Confusion in SLA Calculations

**What goes wrong:** SLA breaches at wrong time of day
**Why it happens:** Mixing server timezone with user/org timezone
**How to avoid:**

- Store all dates in UTC
- Apply org timezone only for display and notification timing
- Use date-fns-tz for timezone-aware calculations if needed
  **Warning signs:** SLA warnings at midnight, inconsistent breach times

### Pitfall 4: Missing Escalation Target

**What goes wrong:** "Escalate to CCO" fails because no CCO exists
**Why it happens:** Rule assumes role exists, no fallback
**How to avoid:**

- Validate escalation targets when saving rules (warn if no user with role)
- Add fallback: if target role not found, notify org admin
- Log failed escalation attempts prominently
  **Warning signs:** Silent escalation failures, cases stuck without action

### Pitfall 5: Race Condition Between SLA Check and Case Update

**What goes wrong:** SLA check runs while case is being closed, sends breach notification
**Why it happens:** Case status check uses stale data
**How to avoid:**

- Filter out cases with status CLOSED/MERGED in SLA query
- Use optimistic locking if needed
- Accept that occasional edge-case notifications are acceptable (better than missing real breaches)
  **Warning signs:** Breach notifications for already-closed cases

## Code Examples

Verified patterns from existing codebase and official sources:

### Extend SlaConfig for Cases

```typescript
// Source: Existing sla.types.ts pattern
export interface CaseSlaConfig extends SlaConfig {
  /** Whether case SLA monitoring is enabled */
  enabled: boolean;

  /** Per-severity SLA days override */
  severityOverrides?: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };

  /** Per-category SLA days override (categoryId -> days) */
  categoryOverrides?: Record<string, number>;
}

// Default config
const DEFAULT_CASE_SLA_CONFIG: CaseSlaConfig = {
  enabled: true,
  defaultDays: 14,
  warningThresholdPercent: 80, // RULE-03: 80% threshold
  criticalThresholdHours: 48,
  severityOverrides: {
    HIGH: 7,
    MEDIUM: 14,
    LOW: 30,
  },
};
```

### SLA Check Deduplication

```typescript
// Source: Pattern from existing SlaTrackerService + deduplication
interface CaseSlaState {
  lastStatus: 'on_track' | 'warning' | 'breached' | 'critical';
  lastNotifiedAt: Date | null;
}

// Store in Case.slaState JSON field or separate tracking table
async shouldEmitSlaEvent(
  caseRecord: Case,
  newCalc: SlaCalculation,
): Promise<boolean> {
  const currentState = caseRecord.slaState as CaseSlaState | null;

  // First time seeing this case - emit if not on_track
  if (!currentState) {
    return newCalc.status !== 'on_track';
  }

  // Only emit on STATUS TRANSITION (not every 5 minutes)
  if (currentState.lastStatus !== newCalc.status) {
    return true;
  }

  // For critical, re-emit every 24 hours as a reminder
  if (newCalc.status === 'critical' && currentState.lastNotifiedAt) {
    const hoursSinceLastNotification =
      (Date.now() - currentState.lastNotifiedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastNotification >= 24;
  }

  return false;
}
```

### Escalation Rule Trigger Events

```typescript
// Source: Pattern from existing rule.types.ts
export type EscalationTriggerEvent =
  | "sla.warning" // Case approaching SLA
  | "sla.breached" // Case past SLA
  | "sla.critical" // Case 48h+ past SLA
  | "escalation.check"; // Manual trigger for unassigned checks

// Extend existing RuleTriggerEvent
export type RuleTriggerEvent =
  | "case.created"
  | "case.updated"
  | "case.status_changed"
  | "investigation.created"
  | "investigation.status_changed"
  | "riu.released"
  // NEW: Escalation triggers
  | EscalationTriggerEvent;
```

### Admin SLA Configuration DTO

```typescript
// Source: Pattern from existing CreateRuleDto
export class UpdateOrgSlaConfigDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  defaultDays?: number;

  @IsInt()
  @Min(50)
  @Max(99)
  @IsOptional()
  warningThresholdPercent?: number;

  @IsInt()
  @Min(1)
  @Max(168) // Max 1 week
  @IsOptional()
  criticalThresholdHours?: number;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  severityOverrides?: Record<string, number>;

  @IsObject()
  @IsOptional()
  categoryOverrides?: Record<string, number>;
}
```

## State of the Art

| Old Approach                   | Current Approach                       | When Changed  | Impact                            |
| ------------------------------ | -------------------------------------- | ------------- | --------------------------------- |
| Hard-coded SLA (e.g., 14 days) | Per-org, per-category configurable     | Best practice | Admins can customize without code |
| Manual escalation              | Rule-based automatic escalation        | 2023+         | Proactive case management         |
| Email-only notifications       | Multi-channel (email, in-app, webhook) | Existing      | Already implemented               |
| Workflow-only SLA              | Entity-level SLA (case, investigation) | This phase    | More granular control             |

**Deprecated/outdated:**

- BullMQ v4 repeatable job API: Use v5+ Job Schedulers for repeatable jobs if migrating from cron
- Single-channel notifications: Always support preferences and multiple channels

## Open Questions

Things that couldn't be fully resolved:

1. **Schema decision: Case.slaState field vs. separate tracking table**
   - What we know: Need to track last SLA status and last notification time per case
   - What's unclear: JSON field on Case simpler but harder to query; separate table cleaner for reporting
   - Recommendation: Start with JSON field (`slaState Json?`), migrate to table if reporting needs grow

2. **Business hours SLA calculation**
   - What we know: Requirements don't specify business hours
   - What's unclear: Should SLA exclude weekends/holidays?
   - Recommendation: Start with calendar days; add business hours as future enhancement if requested

3. **Escalation rule UI complexity**
   - What we know: Need admin UI for escalation rules
   - What's unclear: Full rule builder vs. simplified templates
   - Recommendation: Start with JSON editor (like Phase 40 rules UI), add templates for common patterns

4. **SLA per-stage vs. per-case**
   - What we know: WorkflowInstance already has per-stage SLA via slaConfig
   - What's unclear: Should case SLA be total duration or per-stage?
   - Recommendation: Case SLA = total from creation to close; stage SLA stays in workflow

## Sources

### Primary (HIGH confidence)

- Existing codebase: `apps/backend/src/modules/workflow/sla/` - SlaSchedulerService, SlaTrackerService
- Existing codebase: `apps/backend/src/modules/notifications/listeners/sla.listener.ts` - Event handling pattern
- Existing codebase: `apps/backend/src/modules/rules/` - RulesEngineService, action executors
- Existing codebase: `apps/backend/src/modules/events/events/sla.events.ts` - Event definitions
- [BullMQ Repeatable Jobs](https://docs.bullmq.io/guide/jobs/repeatable) - Official documentation
- [BullMQ Job Schedulers](https://docs.bullmq.io/guide/job-schedulers) - Modern approach for scheduled jobs

### Secondary (MEDIUM confidence)

- [SLA-Aware Escalation Workflows](https://unito.io/blog/sla-aware-ticket-escalation-workflows/) - Workflow patterns
- [Zendesk Escalation Automations](https://www.eesel.ai/blog/zendesk-escalation-automations-by-sla) - Industry patterns
- [BullMQ with NestJS](https://betterstack.com/community/guides/scaling-nodejs/bullmq-scheduled-tasks/) - Integration patterns

### Tertiary (LOW confidence)

- [Predictive SLA Analytics](https://www.sirion.ai/library/contract-insights/automated-sla-breach-alerts-telecom-predictive-analytics/) - Future enhancement ideas

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All packages already installed and in use
- Architecture: HIGH - Extends existing patterns from sla/, rules/, notifications/
- Pitfalls: HIGH - Based on existing codebase patterns and known issues
- Escalation integration: MEDIUM - Reusing rules engine is proven, but escalation-specific actions are new

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (30 days - stable domain)
