# Phase 40: Rules Engine Foundation - Research

**Researched:** 2026-02-24
**Domain:** Business rules engine, case routing automation, event-driven rule execution
**Confidence:** HIGH

## Summary

This phase implements a rules engine foundation for automating case routing and assignment using json-rules-engine (v7.3.1, already installed). The codebase already has a robust event-driven architecture with NestJS EventEmitter, and an existing assignment system with pluggable strategies (round-robin, least-loaded, geographic) in `apps/backend/src/modules/workflow/assignment/`.

The standard approach is to:

1. Create `RuleDefinition` and `RuleExecutionLog` Prisma models for persisting rules and audit trails
2. Build a `RulesEngineService` that wraps json-rules-engine with typed conditions and actions
3. Listen to `case.created` events and evaluate routing rules
4. Integrate with existing `AssignmentRulesService` for execution
5. Add a rule preview/testing service that simulates rules against historical cases
6. Build admin UI for rule management

**Primary recommendation:** Use json-rules-engine v7.3.1 (already installed) with custom operators for domain-specific conditions (category, severity, location), and leverage existing assignment strategies for rule actions.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library               | Version | Purpose               | Why Standard                                                                |
| --------------------- | ------- | --------------------- | --------------------------------------------------------------------------- |
| json-rules-engine     | 7.3.1   | Rule evaluation       | Already installed, lightweight (17kb), JSON-based rules, async fact support |
| @nestjs/event-emitter | 3.0.1   | Event-driven triggers | Already configured with wildcard support, powers existing event handlers    |
| @prisma/client        | 5.8.0   | Rule persistence      | Existing ORM, tenant isolation via RLS                                      |

### Supporting

| Library           | Version | Purpose                | When to Use                                              |
| ----------------- | ------- | ---------------------- | -------------------------------------------------------- |
| class-validator   | 0.14.1  | DTO validation         | Validating rule conditions/actions in DTOs               |
| class-transformer | 0.5.1   | JSON transformation    | Transforming rule JSON to typed objects                  |
| ajv               | 8.12.0  | JSON Schema validation | Already installed, validate rule structure before saving |

### Alternatives Considered

| Instead of            | Could Use           | Tradeoff                                                         |
| --------------------- | ------------------- | ---------------------------------------------------------------- |
| json-rules-engine     | nools, node-rules   | json-rules-engine already installed, simpler JSON format         |
| Custom rule evaluator | Hand-rolled IF/ELSE | Don't - json-rules-engine handles edge cases, operators, caching |

**Installation:**
No additional packages needed - json-rules-engine v7.3.1 already in package.json.

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/modules/rules/
├── rules.module.ts              # Module definition
├── rules.controller.ts          # CRUD endpoints for rule management
├── rules.service.ts             # Rule CRUD operations
├── dto/
│   ├── create-rule.dto.ts       # Rule creation DTO
│   ├── update-rule.dto.ts       # Rule update DTO
│   └── test-rule.dto.ts         # Rule testing DTO
├── engine/
│   ├── rules-engine.service.ts  # Core wrapper around json-rules-engine
│   ├── operators/               # Custom operators
│   │   ├── category.operator.ts
│   │   ├── severity.operator.ts
│   │   └── location.operator.ts
│   └── actions/                 # Rule action executors
│       ├── assign-user.action.ts
│       ├── assign-team.action.ts
│       └── round-robin.action.ts
├── listeners/
│   ├── case-routing.listener.ts # Listens to case.created, evaluates rules
│   └── investigation-status.listener.ts # Derives case status from investigations
├── testing/
│   └── rule-tester.service.ts   # Historical data simulation
└── types/
    └── rule.types.ts            # Type definitions
```

### Pattern 1: Rule Definition Schema

**What:** JSON structure for persisting rules compatible with json-rules-engine
**When to use:** Storing rules in database, admin UI rule builder
**Example:**

```typescript
// Source: json-rules-engine docs + domain adaptation
interface RuleDefinition {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  priority: number; // Lower = higher priority
  isActive: boolean;
  triggerEvent:
    | "case.created"
    | "case.updated"
    | "investigation.status_changed";

  // json-rules-engine compatible structure
  conditions: {
    all?: ConditionBlock[];
    any?: ConditionBlock[];
  };

  // Custom action definition
  actions: RuleAction[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  lastTestedAt?: Date;
  testResults?: TestResult;
}

interface ConditionBlock {
  fact: string; // 'case.category', 'case.severity', 'case.location'
  operator: string; // 'equal', 'in', 'contains', 'greaterThan'
  value: unknown; // Target value
  path?: string; // JSON path for nested facts
}

interface RuleAction {
  type: "assign_user" | "assign_team" | "round_robin" | "set_priority";
  params: Record<string, unknown>;
}
```

### Pattern 2: Event-Triggered Rule Evaluation

**What:** Listener that evaluates rules when domain events fire
**When to use:** Automatic routing on case.created
**Example:**

```typescript
// Source: Existing case.listener.ts pattern + json-rules-engine
@Injectable()
export class CaseRoutingListener {
  private readonly logger = new Logger(CaseRoutingListener.name);

  constructor(
    private readonly rulesEngine: RulesEngineService,
    private readonly auditService: AuditService,
  ) {}

  @OnEvent("case.created", { async: true })
  async handleCaseCreated(event: CaseCreatedEvent): Promise<void> {
    this.logger.debug(`Evaluating routing rules for case ${event.caseId}`);

    try {
      // Build facts from event
      const facts = {
        case: {
          id: event.caseId,
          categoryId: event.categoryId,
          severity: event.severity,
          sourceChannel: event.sourceChannel,
        },
      };

      // Evaluate all active routing rules
      const result = await this.rulesEngine.evaluate(
        event.organizationId,
        "case.created",
        facts,
      );

      // Log execution for audit trail (RULE-08)
      await this.rulesEngine.logExecution(result);

      // Execute winning actions
      if (result.triggeredActions.length > 0) {
        await this.rulesEngine.executeActions(result.triggeredActions, event);
      }
    } catch (error) {
      this.logger.error(`Rule evaluation failed: ${getErrorMessage(error)}`);
    }
  }
}
```

### Pattern 3: Round-Robin with Team Distribution Tracking

**What:** Enhanced round-robin that tracks per-team assignment distribution
**When to use:** RULE-02 team-based fair distribution
**Example:**

```typescript
// Source: Existing round-robin.strategy.ts + team enhancement
@Injectable()
export class TeamRoundRobinAction implements RuleActionExecutor {
  async execute(
    params: { teamId: string },
    context: ActionContext,
  ): Promise<ActionResult> {
    // Get team members
    const members = await this.prisma.user.findMany({
      where: {
        organizationId: context.organizationId,
        teamId: params.teamId,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Find last assignment within this team
    const lastAssignment = await this.prisma.ruleExecutionLog.findFirst({
      where: {
        organizationId: context.organizationId,
        actionType: "assign_team",
        actionParams: { path: ["teamId"], equals: params.teamId },
      },
      orderBy: { executedAt: "desc" },
    });

    // Calculate next assignee (existing round-robin logic)
    const nextIndex = this.calculateNextIndex(members, lastAssignment);

    return {
      userId: members[nextIndex].id,
      reason: `Round-robin team assignment (${members[nextIndex].firstName})`,
    };
  }
}
```

### Pattern 4: Case Status Auto-Derivation

**What:** Listener that updates case status based on investigation states
**When to use:** RULE-06 - all investigations closed = case moves to review
**Example:**

```typescript
// Source: Event pattern + domain logic
@Injectable()
export class InvestigationStatusListener {
  @OnEvent("investigation.status_changed", { async: true })
  async handleStatusChanged(
    event: InvestigationStatusChangedEvent,
  ): Promise<void> {
    // Only process when investigation closes
    if (event.newStatus !== "CLOSED") return;

    // Get all investigations for this case
    const investigations = await this.prisma.investigation.findMany({
      where: {
        caseId: event.caseId,
        organizationId: event.organizationId,
      },
      select: { status: true },
    });

    // Check if ALL investigations are closed
    const allClosed = investigations.every((inv) => inv.status === "CLOSED");

    if (allClosed) {
      // Auto-derive case status to "review" stage
      await this.casesService.updateStatus(
        event.caseId,
        "PENDING_REVIEW", // Or appropriate pipeline stage
        {
          rationale: "All investigations completed",
          actorType: "SYSTEM",
          organizationId: event.organizationId,
        },
      );
    }
  }
}
```

### Pattern 5: Rule Preview/Testing Service

**What:** Simulate rules against historical cases without execution
**When to use:** RULE-07 - test before activating
**Example:**

```typescript
// Source: Domain pattern for rule testing
@Injectable()
export class RuleTesterService {
  async testRule(
    ruleDefinition: RuleDefinition,
    options: { limit?: number; dateFrom?: Date } = {},
  ): Promise<TestResult> {
    // Get historical cases for simulation
    const historicalCases = await this.prisma.case.findMany({
      where: {
        organizationId: ruleDefinition.organizationId,
        createdAt: options.dateFrom ? { gte: options.dateFrom } : undefined,
      },
      take: options.limit || 100,
      include: { primaryCategory: true },
    });

    const results: CaseTestResult[] = [];

    for (const caseRecord of historicalCases) {
      // Build facts from historical case
      const facts = this.buildFactsFromCase(caseRecord);

      // Evaluate rule WITHOUT executing actions
      const wouldMatch = await this.rulesEngine.evaluateRule(
        ruleDefinition,
        facts,
        { dryRun: true },
      );

      results.push({
        caseId: caseRecord.id,
        referenceNumber: caseRecord.referenceNumber,
        wouldMatch,
        currentAssignee: caseRecord.assignedToId,
        predictedAssignee: wouldMatch
          ? this.predictAssignee(ruleDefinition.actions)
          : null,
      });
    }

    return {
      totalCases: results.length,
      matchedCases: results.filter((r) => r.wouldMatch).length,
      matchRate:
        (results.filter((r) => r.wouldMatch).length / results.length) * 100,
      samples: results.slice(0, 10),
    };
  }
}
```

### Anti-Patterns to Avoid

- **Evaluating rules synchronously in request path:** Always use `{ async: true }` on @OnEvent handlers
- **Storing rule engine instance globally:** Create per-evaluation to avoid fact cache pollution between tenants
- **Hard-coding rule conditions:** Use JSON-based conditions stored in database
- **Skipping audit logging:** Every rule execution MUST be logged (RULE-08)
- **Executing rules without tenant context:** Always filter rules by organizationId

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                | Don't Build           | Use Instead                   | Why                                                   |
| ---------------------- | --------------------- | ----------------------------- | ----------------------------------------------------- |
| Rule evaluation logic  | Custom IF/ELSE chains | json-rules-engine             | Handles complex nested conditions, operators, caching |
| Round-robin assignment | Simple counter        | Existing `RoundRobinStrategy` | Already handles edge cases, audit log lookup          |
| Event listening        | Manual polling        | `@nestjs/event-emitter`       | Already configured, wildcard support, async handlers  |
| JSON validation        | Manual field checks   | ajv (installed)               | Schema validation, detailed errors                    |
| Rule priority sorting  | Array.sort            | json-rules-engine priority    | Engine handles priority natively                      |

**Key insight:** The codebase already has the assignment infrastructure in `workflow/assignment/`. The rules engine adds the "when" (conditions) layer on top of the existing "how" (strategies).

## Common Pitfalls

### Pitfall 1: Tenant Data Leak in Rule Evaluation

**What goes wrong:** Rules from one tenant accidentally evaluated against another tenant's cases
**Why it happens:** Caching facts or rule instances across requests
**How to avoid:**

- Always filter rules by organizationId before evaluation
- Create fresh engine instance per evaluation (or use tenant-scoped engine pools)
- Include organizationId in every rule execution log
  **Warning signs:** Rule matches showing unexpected case IDs

### Pitfall 2: Infinite Event Loops

**What goes wrong:** Rule execution triggers event that triggers same rule again
**Why it happens:** Rule listens to `case.updated`, action updates case, triggers `case.updated`
**How to avoid:**

- Add idempotency check: "if already processed by rule X, skip"
- Use separate event types for rule-triggered updates vs user updates
- Track rule execution in case metadata: `lastRuleExecutionId`
  **Warning signs:** Case gets assigned repeatedly, CPU spikes

### Pitfall 3: Missing Rule Execution Audit

**What goes wrong:** No audit trail when rules execute, compliance failure
**Why it happens:** Logging only on success, missing error cases
**How to avoid:**

- Log BEFORE evaluation with "evaluating" status
- Update log AFTER with outcome (matched/not matched/error)
- Include full facts snapshot for replay/debugging
  **Warning signs:** Audit gaps, "ghost" assignments with no trace

### Pitfall 4: Race Condition in Round-Robin

**What goes wrong:** Two concurrent case.created events both assign to same user
**Why it happens:** Reading "last assigned" and writing "new assigned" not atomic
**How to avoid:**

- Use database-level locking on assignment counter
- Or track assignment in dedicated counter table with `UPDATE ... RETURNING`
- Or use Redis atomic increment for distributed coordination
  **Warning signs:** Uneven distribution despite round-robin config

### Pitfall 5: Blocking Event Handlers

**What goes wrong:** Rule evaluation blocks case creation response
**Why it happens:** Not using `{ async: true }` on @OnEvent decorator
**How to avoid:**

- ALWAYS use `@OnEvent('case.created', { async: true })`
- Move heavy operations to BullMQ job if needed
- Set reasonable timeouts on rule evaluation
  **Warning signs:** Slow case creation API, timeout errors

## Code Examples

Verified patterns from official sources and existing codebase:

### json-rules-engine Basic Setup

```typescript
// Source: json-rules-engine GitHub README + npm
import { Engine, Rule } from "json-rules-engine";

const engine = new Engine();

// Add custom operator for "in array" check
engine.addOperator("inArray", (factValue, jsonValue) => {
  return Array.isArray(jsonValue) && jsonValue.includes(factValue);
});

// Add rule from JSON (database-stored format)
const rule = new Rule({
  conditions: {
    all: [
      {
        fact: "severity",
        operator: "equal",
        value: "HIGH",
      },
      {
        fact: "categoryId",
        operator: "inArray",
        value: ["cat-fraud", "cat-harassment"],
      },
    ],
  },
  event: {
    type: "route-to-cco",
    params: { userId: "user-cco" },
  },
  priority: 1, // Lower number = higher priority
});

engine.addRule(rule);

// Run with facts
const facts = {
  severity: "HIGH",
  categoryId: "cat-fraud",
};

const { events } = await engine.run(facts);
// events = [{ type: 'route-to-cco', params: { userId: 'user-cco' } }]
```

### Prisma Model for RuleDefinition

```prisma
// Source: Domain requirements + existing Prisma patterns
model RuleDefinition {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")
  name            String
  description     String?
  priority        Int      @default(100)
  isActive        Boolean  @default(false) @map("is_active")
  triggerEvent    String   @map("trigger_event")
  conditions      Json     // json-rules-engine format
  actions         Json     // Array of {type, params}
  lastTestedAt    DateTime? @map("last_tested_at")
  testResults     Json?    @map("test_results")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  createdById     String   @map("created_by_id")

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy       User         @relation(fields: [createdById], references: [id])
  executionLogs   RuleExecutionLog[]

  @@index([organizationId, isActive])
  @@index([organizationId, triggerEvent])
  @@map("rule_definitions")
}

model RuleExecutionLog {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")
  ruleId          String   @map("rule_id")
  entityType      String   @map("entity_type")
  entityId        String   @map("entity_id")
  facts           Json     // Snapshot of facts at evaluation time
  matched         Boolean
  actionsTaken    Json?    @map("actions_taken")
  executionTimeMs Int      @map("execution_time_ms")
  errorMessage    String?  @map("error_message")
  executedAt      DateTime @default(now()) @map("executed_at")

  organization    Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  rule            RuleDefinition @relation(fields: [ruleId], references: [id], onDelete: Cascade)

  @@index([organizationId, executedAt])
  @@index([organizationId, ruleId])
  @@index([organizationId, entityType, entityId])
  @@map("rule_execution_logs")
}
```

### RulesEngineService Wrapper

```typescript
// Source: Existing service patterns + json-rules-engine
@Injectable()
export class RulesEngineService {
  private readonly logger = new Logger(RulesEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly actionRegistry: RuleActionRegistry,
  ) {}

  async evaluate(
    organizationId: string,
    triggerEvent: string,
    facts: Record<string, unknown>,
  ): Promise<RuleEvaluationResult> {
    const startTime = Date.now();

    // Get active rules for this event (tenant-scoped)
    const rules = await this.prisma.ruleDefinition.findMany({
      where: {
        organizationId,
        triggerEvent,
        isActive: true,
      },
      orderBy: { priority: "asc" },
    });

    if (rules.length === 0) {
      return { matched: false, triggeredActions: [] };
    }

    // Create fresh engine instance (tenant isolation)
    const engine = new Engine();
    this.registerCustomOperators(engine);

    // Add rules to engine
    for (const rule of rules) {
      engine.addRule(
        new Rule({
          name: rule.id,
          conditions: rule.conditions as any,
          event: { type: rule.id, params: { actions: rule.actions } },
          priority: rule.priority,
        }),
      );
    }

    // Evaluate
    const { events } = await engine.run(facts);
    const executionTimeMs = Date.now() - startTime;

    // Take first matching rule (highest priority wins)
    const matchedRule = events[0];

    return {
      matched: events.length > 0,
      matchedRuleId: matchedRule?.type,
      triggeredActions: matchedRule?.params?.actions || [],
      executionTimeMs,
      facts, // For audit logging
    };
  }

  private registerCustomOperators(engine: Engine): void {
    engine.addOperator(
      "inArray",
      (factValue, jsonValue) =>
        Array.isArray(jsonValue) && jsonValue.includes(factValue),
    );

    engine.addOperator(
      "containsAny",
      (factValue, jsonValue) =>
        Array.isArray(factValue) &&
        Array.isArray(jsonValue) &&
        jsonValue.some((v) => factValue.includes(v)),
    );
  }
}
```

## State of the Art

| Old Approach                | Current Approach              | When Changed         | Impact                                 |
| --------------------------- | ----------------------------- | -------------------- | -------------------------------------- |
| Hard-coded routing IF/ELSE  | JSON-based rules engine       | 2020+                | Admins can modify without code changes |
| Per-request rule evaluation | Event-driven async evaluation | 2022+                | Non-blocking, scalable                 |
| Manual audit logging        | Automatic execution logging   | Always required      | SOC2 compliance                        |
| Static assignment           | Configurable strategies       | Existing in codebase | Already implemented                    |

**Deprecated/outdated:**

- json-rules-engine v6 (current is v7.3.1): v7 has performance improvements, some API changes
- Synchronous rule evaluation: Always use async for scalability

## Open Questions

Things that couldn't be fully resolved:

1. **Round-robin persistence across restarts**
   - What we know: Current implementation uses audit log lookup
   - What's unclear: Should we use dedicated counter table for atomicity?
   - Recommendation: Start with audit log approach (existing pattern), add counter table if race conditions observed

2. **Rule version control**
   - What we know: Rules need history for compliance
   - What's unclear: Full version history or just "active" vs "draft"?
   - Recommendation: Start with isActive flag + audit log of changes, add full versioning in Phase 41 if needed

3. **Complex condition UI builder**
   - What we know: Need admin UI for rule creation
   - What's unclear: How complex should the visual builder be?
   - Recommendation: Start with JSON editor for power users, add visual builder incrementally

## Sources

### Primary (HIGH confidence)

- json-rules-engine GitHub: https://github.com/CacheControl/json-rules-engine - README, docs/rules.md
- Existing codebase: `apps/backend/src/modules/workflow/assignment/` - AssignmentRulesService, strategies
- Existing codebase: `apps/backend/src/modules/events/` - Event patterns, listeners
- Existing codebase: `apps/backend/package.json` - json-rules-engine v7.3.1 installed

### Secondary (MEDIUM confidence)

- Business rules engine best practices: https://www.nected.ai/blog/rules-engine-design-pattern
- Audit trail patterns: https://martinfowler.com/eaaDev/AuditLog.html
- NestJS EventEmitter: https://docs.nestjs.com/techniques/events

### Tertiary (LOW confidence)

- json-rules-engine v7 breaking changes: GitHub Issue #408 (documentation incomplete)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - json-rules-engine already installed, well-documented
- Architecture: HIGH - Follows existing codebase patterns (events, services, strategies)
- Pitfalls: HIGH - Based on common distributed system patterns and existing codebase analysis
- Rule testing: MEDIUM - Design pattern extrapolated from requirements, not from external source

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (30 days - stable domain)
