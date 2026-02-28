# Phase 46: Disclosure Automation Foundation - Research

**Researched:** 2026-02-28
**Domain:** Disclosure campaign automation, HRIS-triggered workflows, bulk operations, approval workflows
**Confidence:** HIGH

## Summary

Phase 46 extends the existing disclosure and campaign infrastructure (Phase 9) with automation capabilities. The codebase already has solid foundations:

- **Campaigns Module**: Full campaign lifecycle with scheduling, waves, reminders, assignments, blackout dates
- **Disclosures Module**: Disclosure forms, threshold evaluation with json-rules-engine, conflict detection, AI triage
- **Rules Engine (Phase 40)**: json-rules-engine v7.3.1 with tenant-isolated evaluation, action executors, execution logging
- **HRIS Sync**: Merge.dev integration with `hris.sync.completed` event emission
- **Workflow Engine**: Multi-stage workflows with pause/resume, stage gates, SLA tracking

The key work is **connecting these existing systems** rather than building from scratch. Rolling campaigns listen for HRIS events, auto-clear/reject rules leverage the existing rules engine pattern, bulk operations extend assignment service, and multi-stage approval reuses workflow engine concepts.

**Primary recommendation:** Build RollingCampaignService as an event listener coordinating existing CampaignsService, SegmentService, and CampaignAssignmentService. Extend ThresholdService pattern for auto-clear/reject rule configuration. Use existing BullMQ patterns for async processing.

## Standard Stack

### Core (Already in Codebase)

| Library               | Version | Purpose                               | Why Standard                                             |
| --------------------- | ------- | ------------------------------------- | -------------------------------------------------------- |
| json-rules-engine     | ^7.3.1  | Rule evaluation for auto-clear/reject | Already used for ThresholdService and RulesEngineService |
| BullMQ                | ^5.25.7 | Async job processing                  | Already used for campaign scheduling, email, exports     |
| @nestjs/event-emitter | ^2.0.4  | Event-driven architecture             | Already used for HRIS sync events, disclosure events     |
| @nestjs/schedule      | ^4.0.0  | Scheduled jobs (reminders)            | Already used for SLA tracking, reminder processing       |
| Prisma                | ^5.x    | Database ORM                          | Core data layer with RLS support                         |

### Supporting

| Library  | Version | Purpose                | When to Use                                         |
| -------- | ------- | ---------------------- | --------------------------------------------------- |
| date-fns | ^3.x    | Date manipulation      | Calculating reminder schedules, due date extensions |
| lodash   | ^4.x    | Array/object utilities | Chunking bulk operations, data manipulation         |

### No New Dependencies Needed

All required functionality can be built with existing stack. No new libraries required.

## Architecture Patterns

### Recommended Service Structure

```
apps/backend/src/modules/campaigns/
├── rolling/                          # NEW: Rolling campaign services
│   ├── rolling-campaign.service.ts   # Rolling campaign CRUD + event handling
│   ├── rolling-campaign.listener.ts  # @OnEvent('hris.sync.completed')
│   └── dto/
│       └── rolling-campaign.dto.ts
├── automation/                       # NEW: Auto-clear/reject rules
│   ├── disclosure-automation.service.ts
│   ├── auto-clear-rule.service.ts    # Rule config CRUD
│   └── auto-reject-rule.service.ts
├── bulk/                             # NEW: Bulk operations
│   └── bulk-disclosure.service.ts
└── pause/                            # NEW: Campaign pause/resume
    └── campaign-pause.service.ts

apps/backend/src/modules/disclosures/
├── approval/                         # NEW: Multi-stage approval
│   ├── disclosure-approval-workflow.service.ts
│   └── dto/
│       └── approval-stage.dto.ts
└── proxy/                            # NEW: Proxy delegation
    ├── proxy-delegation.service.ts
    └── dto/
        └── proxy-delegation.dto.ts
```

### Pattern 1: Rolling Campaign via HRIS Event Listener

**What:** Listen for `hris.sync.completed` events and trigger rolling campaign assignments for eligible employees.

**When to use:** Automatic disclosure campaigns triggered by employee lifecycle events.

**Example:**

```typescript
// Source: Existing hris-sync.service.ts emitEvent pattern
@Injectable()
export class RollingCampaignListener {
  constructor(
    private readonly rollingCampaignService: RollingCampaignService,
    private readonly segmentService: SegmentService,
  ) {}

  @OnEvent("hris.sync.completed")
  async handleHrisSyncCompleted(event: {
    organizationId: string;
    userId: string;
    result: {
      created: number;
      updated: number;
      skipped: number;
      errorCount: number;
    };
  }) {
    // Only process if there were changes
    if (event.result.created === 0 && event.result.updated === 0) {
      return;
    }

    // Find active rolling campaigns for this org
    const rollingCampaigns =
      await this.rollingCampaignService.findActiveRolling(event.organizationId);

    for (const campaign of rollingCampaigns) {
      await this.rollingCampaignService.evaluateAndAssign(
        campaign.id,
        event.organizationId,
      );
    }
  }
}
```

### Pattern 2: HRIS Sync Fence for Race Condition Prevention

**What:** Ensure HRIS sync completion is processed only once, preventing duplicate campaign triggers.

**When to use:** When multiple workers could process the same HRIS sync event.

**Example:**

```typescript
// Source: Pattern derived from existing campaign processor idempotency
@Injectable()
export class HrisSyncFenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Acquire fence for HRIS sync processing.
   * Returns true if caller should process, false if already processed.
   */
  async acquireFence(
    organizationId: string,
    syncId: string,
    ttlSeconds: number = 300,
  ): Promise<boolean> {
    const key = `hris:sync:fence:${organizationId}:${syncId}`;
    const acquired = await this.redis.set(key, "1", "NX", "EX", ttlSeconds);
    return acquired === "OK";
  }

  /**
   * Release fence after processing (for manual release if needed).
   */
  async releaseFence(organizationId: string, syncId: string): Promise<void> {
    const key = `hris:sync:fence:${organizationId}:${syncId}`;
    await this.redis.del(key);
  }
}
```

### Pattern 3: Auto-Clear/Reject Rules Using json-rules-engine

**What:** Configure rules that auto-approve or auto-reject disclosures based on answer patterns.

**When to use:** "Nothing to disclose" auto-clears, specific answer combinations trigger rejection.

**Example:**

```typescript
// Source: Existing ThresholdService and RulesEngineService patterns
interface AutoClearRule {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  disclosureTypes: DisclosureType[];
  conditions: {
    // json-rules-engine format
    all?: RuleCondition[];
    any?: RuleCondition[];
  };
  action: "AUTO_CLEAR" | "AUTO_REJECT";
  requiresReview: boolean; // If true, mark for human review instead of auto-complete
  priority: number;
  isActive: boolean;
}

// Example: Auto-clear "nothing to disclose"
const nothingToDiscloseRule: AutoClearRule = {
  id: "uuid",
  organizationId: "org-uuid",
  name: "Nothing to Disclose Auto-Clear",
  disclosureTypes: ["COI", "GIFT", "OUTSIDE_EMPLOYMENT"],
  conditions: {
    all: [
      { fact: "hasItemsToDisclose", operator: "equal", value: false },
      { fact: "confirmNoDisclosure", operator: "equal", value: true },
    ],
  },
  action: "AUTO_CLEAR",
  requiresReview: false,
  priority: 100,
  isActive: true,
};
```

### Pattern 4: Bulk Operations with Chunked Processing

**What:** Process up to 100 disclosures in a single operation with chunking for database efficiency.

**When to use:** Compliance officer bulk approve/reject workflows.

**Example:**

```typescript
// Source: Existing CampaignAssignmentService.generateAssignments pattern
@Injectable()
export class BulkDisclosureService {
  private readonly CHUNK_SIZE = 50; // Database batch size

  async bulkApprove(
    disclosureIds: string[],
    dto: BulkApproveDto,
    organizationId: string,
    userId: string,
  ): Promise<BulkOperationResult> {
    if (disclosureIds.length > 100) {
      throw new BadRequestException(
        "Maximum 100 disclosures per bulk operation",
      );
    }

    const results: BulkOperationItem[] = [];

    // Process in chunks for database efficiency
    for (let i = 0; i < disclosureIds.length; i += this.CHUNK_SIZE) {
      const chunk = disclosureIds.slice(i, i + this.CHUNK_SIZE);

      const chunkResults = await this.prisma.$transaction(async (tx) => {
        return Promise.all(
          chunk.map(async (id) => {
            try {
              await tx.riskIntelligenceUnit.update({
                where: { id, organizationId },
                data: {
                  status: RiuStatus.COMPLETED,
                  statusChangedAt: new Date(),
                  statusChangedById: userId,
                },
              });
              return { id, success: true };
            } catch (error) {
              return { id, success: false, error: error.message };
            }
          }),
        );
      });

      results.push(...chunkResults);
    }

    // Audit log the bulk operation
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.DISCLOSURE,
      entityId: "bulk",
      action: "bulk_approved",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Bulk approved ${results.filter((r) => r.success).length} disclosures`,
      actorUserId: userId,
      actorType: ActorType.USER,
      changes: { disclosureIds, results },
    });

    return {
      total: disclosureIds.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }
}
```

### Pattern 5: Multi-Stage Approval Workflow

**What:** Configure up to 4-stage approval workflows for disclosures using existing WorkflowEngine concepts.

**When to use:** Complex disclosure types requiring multiple approvers.

**Example:**

```typescript
// Source: Existing WorkflowEngineService pattern
interface DisclosureApprovalConfig {
  id: string;
  organizationId: string;
  name: string;
  disclosureTypes: DisclosureType[];
  stages: ApprovalStage[]; // Max 4
  isActive: boolean;
}

interface ApprovalStage {
  stageNumber: number; // 1-4
  name: string;
  approverType:
    | "SPECIFIC_USER"
    | "ROLE"
    | "MANAGER_OF_DISCLOSER"
    | "MANAGER_CHAIN";
  approverConfig: {
    userId?: string;
    roleId?: string;
    managerLevel?: number; // 1 = direct manager, 2 = skip-level, etc.
  };
  slaDays?: number;
  isRequired: boolean;
  canSkip: boolean;
  skipConditions?: RuleCondition[]; // Auto-skip if conditions met
}
```

### Pattern 6: Campaign Pause/Resume

**What:** Pause active campaigns (stop reminders, freeze deadlines) and resume later.

**When to use:** Business continuity events, holidays, or investigation holds.

**Example:**

```typescript
// Source: Existing WorkflowEngineService.pause/resume pattern
@Injectable()
export class CampaignPauseService {
  async pauseCampaign(
    campaignId: string,
    reason: string,
    userId: string,
    organizationId: string,
  ): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId, status: CampaignStatus.ACTIVE },
    });

    if (!campaign) {
      throw new NotFoundException("Active campaign not found");
    }

    // Record pause state for deadline restoration
    const pauseState = {
      pausedAt: new Date(),
      pausedBy: userId,
      originalDueDate: campaign.dueDate,
      reason,
    };

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.PAUSED,
        statusNote: reason,
        pauseState: pauseState as Prisma.InputJsonValue,
      },
    });

    // Cancel pending reminder jobs
    await this.campaignQueue.removeJobs(`reminder-*-${campaignId}-*`);

    // Emit event
    this.eventEmitter.emit("campaign.paused", {
      organizationId,
      campaignId,
      reason,
      userId,
    });

    return updated;
  }

  async resumeCampaign(
    campaignId: string,
    extendDeadlineDays: number,
    userId: string,
    organizationId: string,
  ): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId, status: CampaignStatus.PAUSED },
    });

    if (!campaign) {
      throw new NotFoundException("Paused campaign not found");
    }

    const pauseState = campaign.pauseState as {
      pausedAt: string;
      originalDueDate: string;
    } | null;
    const pauseDuration = pauseState
      ? Date.now() - new Date(pauseState.pausedAt).getTime()
      : 0;

    // Extend deadline by pause duration + optional additional days
    const newDueDate = new Date(
      campaign.dueDate.getTime() +
        pauseDuration +
        extendDeadlineDays * 24 * 60 * 60 * 1000,
    );

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.ACTIVE,
        statusNote: null,
        dueDate: newDueDate,
        pauseState: Prisma.JsonNull,
      },
    });

    // Extend assignment deadlines
    await this.prisma.campaignAssignment.updateMany({
      where: { campaignId, organizationId },
      data: { dueDate: newDueDate },
    });

    // Re-schedule reminder jobs
    await this.reminderService.scheduleRemindersForCampaign(
      campaignId,
      organizationId,
    );

    this.eventEmitter.emit("campaign.resumed", {
      organizationId,
      campaignId,
      newDueDate,
      userId,
    });

    return updated;
  }
}
```

### Pattern 7: Proxy Delegation

**What:** Allow users to delegate approval authority to another user with scope and validity period.

**When to use:** Vacation coverage, temporary authority transfer.

**Example:**

```typescript
// New Prisma model needed
interface ProxyDelegation {
  id: string;
  organizationId: string;
  delegatorId: string; // User delegating authority
  delegateId: string; // User receiving authority
  scope: ProxyScope;
  scopeConfig?: {
    disclosureTypes?: DisclosureType[];
    approvalStages?: number[];
    maxValue?: number;
  };
  validFrom: Date;
  validUntil: Date;
  reason: string;
  isActive: boolean;
  createdAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revokeReason?: string;
}

enum ProxyScope {
  FULL = "FULL", // All delegator's authority
  DISCLOSURE_TYPE = "DISCLOSURE_TYPE", // Specific disclosure types
  VALUE_THRESHOLD = "VALUE_THRESHOLD", // Up to certain value
  APPROVAL_STAGE = "APPROVAL_STAGE", // Specific approval stages only
}
```

### Anti-Patterns to Avoid

- **Direct database mutations without audit logging:** Always use AuditService for compliance tracking
- **Blocking HRIS sync with synchronous campaign processing:** Use async event handling
- **Processing unlimited disclosures in bulk:** Enforce 100-item maximum per RS requirements
- **Hardcoding reminder intervals:** Use configurable ReminderStep pattern from existing service
- **Missing tenant isolation in rules engine:** Always create fresh engine instance per evaluation

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem               | Don't Build             | Use Instead                                | Why                                            |
| --------------------- | ----------------------- | ------------------------------------------ | ---------------------------------------------- |
| Rule evaluation       | Custom condition parser | json-rules-engine                          | Already integrated, handles complex conditions |
| Job scheduling        | setTimeout/cron         | BullMQ                                     | Persistence, retry, distributed processing     |
| Event handling        | Custom pub/sub          | @nestjs/event-emitter                      | Already used, testable, typed events           |
| Deadline calculations | Manual date math        | date-fns + existing BlackoutManagerService | Handles edge cases, holidays, timezone         |
| Bulk DB operations    | Raw SQL                 | Prisma $transaction with chunking          | Type safety, tenant isolation via RLS          |
| Workflow state        | Custom state machine    | Extend existing WorkflowEngineService      | Already handles transitions, gates, events     |

**Key insight:** The codebase already has sophisticated patterns for campaigns, rules, workflows, and async processing. Phase 46 is about connecting and extending, not building from scratch.

## Common Pitfalls

### Pitfall 1: Race Conditions on HRIS Sync Events

**What goes wrong:** Multiple workers process the same HRIS sync event, creating duplicate campaign assignments.

**Why it happens:** BullMQ jobs or event listeners may run concurrently across multiple instances.

**How to avoid:** Implement sync fence pattern with Redis locks before processing. Use unique job IDs based on sync batch ID.

**Warning signs:** Duplicate campaign assignments for same employee, assignments created with identical timestamps.

### Pitfall 2: Blocking HRIS Sync with Synchronous Processing

**What goes wrong:** HRIS sync takes too long because campaign evaluation runs synchronously.

**Why it happens:** Processing rolling campaigns inline with sync completion.

**How to avoid:** Use @OnEvent with async handler, queue campaign evaluation jobs instead of processing immediately.

**Warning signs:** HRIS sync timeout errors, slow sync performance.

### Pitfall 3: Missing Pause State Restoration

**What goes wrong:** Resuming paused campaign loses original deadline information.

**Why it happens:** Not storing pause state with original due date.

**How to avoid:** Store pauseState JSON with pausedAt timestamp and originalDueDate when pausing.

**Warning signs:** Incorrect deadline calculations after resume, compliance audit failures.

### Pitfall 4: Auto-Clear Rules Bypassing Audit Trail

**What goes wrong:** Disclosures auto-cleared without proper audit logging.

**Why it happens:** Skipping AuditService calls for automated actions.

**How to avoid:** Always call AuditService with actorType: ActorType.SYSTEM for automated actions.

**Warning signs:** Missing audit entries for auto-cleared disclosures, compliance audit failures.

### Pitfall 5: Proxy Delegation Without Expiration Enforcement

**What goes wrong:** Expired proxy delegations still allow actions.

**Why it happens:** Not checking validUntil in approval authorization.

**How to avoid:** Check isActive AND validFrom <= now <= validUntil in every proxy-aware authorization check.

**Warning signs:** Actions taken after delegation expiration, unauthorized approvals.

### Pitfall 6: Bulk Operations Without Transaction Safety

**What goes wrong:** Partial bulk operation leaves inconsistent state.

**Why it happens:** Processing items individually without transaction boundaries.

**How to avoid:** Use Prisma $transaction with chunked batches. Return detailed results for each item.

**Warning signs:** Some disclosures approved but not others, missing audit records.

## Code Examples

Verified patterns from existing codebase:

### HRIS Sync Event Emission (Existing)

```typescript
// Source: apps/backend/src/modules/hris/hris-sync.service.ts:135-145
this.emitEvent("hris.sync.completed", {
  organizationId,
  userId,
  result: {
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    errorCount: result.errors.length,
    durationMs: result.durationMs,
  },
});
```

### BullMQ Processor Pattern (Existing)

```typescript
// Source: apps/backend/src/modules/campaigns/campaign-scheduling.processor.ts
@Processor(CAMPAIGN_QUEUE_NAME, { concurrency: 3 })
export class CampaignSchedulingProcessor extends WorkerHost {
  async process(job: Job<LaunchCampaignJobData>): Promise<unknown> {
    switch (job.name) {
      case "launch-campaign":
        return this.handleLaunch(job);
      case "launch-wave":
        return this.handleWaveLaunch(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }
}
```

### Rules Engine Evaluation (Existing)

```typescript
// Source: apps/backend/src/modules/rules/engine/rules-engine.service.ts:96-124
async evaluate(
  organizationId: string,
  triggerEvent: string,
  facts: Record<string, unknown>,
): Promise<RuleEvaluationResult> {
  const rules = await this.prisma.ruleDefinition.findMany({
    where: { organizationId, triggerEvent, isActive: true },
    orderBy: { priority: "asc" },
  });

  // Create fresh engine instance (CRITICAL: tenant isolation)
  const engine = new Engine();
  registerAllOperators(engine);

  for (const rule of rules) {
    engine.addRule(new Rule({
      name: rule.id,
      conditions: rule.conditions as unknown as TopLevelCondition,
      event: { type: rule.id, params: { ruleId: rule.id, actions } },
      priority: rule.priority,
    }));
  }

  const { events } = await engine.run(facts);
  // First matching rule wins (priority-ordered)
  return events[0] ? { matched: true, ... } : { matched: false, ... };
}
```

### Campaign Assignment Generation (Existing)

```typescript
// Source: apps/backend/src/modules/campaigns/assignments/campaign-assignment.service.ts:45-130
async generateAssignments(
  campaignId: string,
  employeeIds: string[],
  dueDate: Date,
  organizationId: string,
  userId: string,
): Promise<CampaignAssignment[]> {
  const employees = await this.prisma.employee.findMany({
    where: { id: { in: employeeIds }, organizationId },
    include: { locationAssignment: { select: { name: true } } },
  });

  const assignmentData: Prisma.CampaignAssignmentCreateManyInput[] = [];

  for (const employeeId of employeeIds) {
    const employee = employeeMap.get(employeeId);
    const snapshot: EmployeeSnapshot = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      // ... other fields
    };

    assignmentData.push({
      organizationId,
      campaignId,
      employeeId,
      status: AssignmentStatus.PENDING,
      dueDate,
      employeeSnapshot: snapshot as Prisma.InputJsonValue,
    });
  }

  await this.prisma.campaignAssignment.createMany({
    data: assignmentData,
    skipDuplicates: true,
  });
}
```

### Reminder Scheduling (Existing)

```typescript
// Source: apps/backend/src/modules/campaigns/campaign-reminder.service.ts:31-36
export const DEFAULT_REMINDER_SEQUENCE: ReminderStep[] = [
  { daysFromDue: -5, ccManager: false },
  { daysFromDue: -1, ccManager: false },
  { daysFromDue: 3, ccManager: true },
  { daysFromDue: 7, ccManager: true, ccHR: true },
];
```

## State of the Art

| Old Approach                     | Current Approach                | When Changed | Impact                             |
| -------------------------------- | ------------------------------- | ------------ | ---------------------------------- |
| Manual campaign triggering       | Event-driven rolling campaigns  | Phase 46     | Automatic onboarding compliance    |
| Single-stage approval            | Multi-stage approval workflows  | Phase 46     | Enterprise compliance requirements |
| Individual disclosure processing | Bulk operations (up to 100)     | Phase 46     | Efficiency for compliance officers |
| Fixed reminder schedules         | Configurable reminder sequences | Phase 9      | Already implemented, reuse         |

**Current in codebase:**

- json-rules-engine v7.3.1 (Phase 40)
- BullMQ v5.25.7 for async processing
- Event-driven architecture with @nestjs/event-emitter
- Workflow engine with pause/resume

## Open Questions

### 1. HRIS Event Granularity

**What we know:** HRIS sync emits `hris.sync.completed` with aggregate counts (created, updated, skipped).

**What's unclear:** Do we need per-employee change events (NEW_HIRE, ROLE_CHANGE, PROMOTION) or can we detect changes by comparing current vs. previous state?

**Recommendation:** Extend HRIS sync to emit per-employee change events for precise rolling campaign triggering. Add `hris.employee.changed` event with `{ employeeId, changeType, previousState, newState }`.

### 2. Annual Anniversary Calculation

**What we know:** DISC-01 requires ANNUAL_ANNIVERSARY trigger for rolling campaigns.

**What's unclear:** How to efficiently detect anniversary dates across large employee populations.

**Recommendation:** Add scheduled daily job that queries employees by hire date month/day match, then triggers assignments. Use existing ScheduleModule pattern.

### 3. Condition Reminder Intervals

**What we know:** DISC-05 requires reminders at 14, 7, 3, 1 days before due date.

**What's unclear:** Whether this is separate from existing reminder system or extends it.

**Recommendation:** Reuse existing ReminderStep pattern but with different default sequence. Allow per-campaign override:

```typescript
const CONDITION_REMINDER_SEQUENCE: ReminderStep[] = [
  { daysFromDue: -14, ccManager: false },
  { daysFromDue: -7, ccManager: false },
  { daysFromDue: -3, ccManager: false },
  { daysFromDue: -1, ccManager: true },
];
```

## Required Schema Changes

### New Models

```prisma
model RollingCampaignConfig {
  id                  String   @id @default(uuid())
  organizationId      String   @map("organization_id")
  name                String
  description         String?
  campaignTemplateId  String   @map("campaign_template_id")  // Template to use
  triggerEvents       String[] // NEW_HIRE, ROLE_CHANGE, PROMOTION, ANNUAL_ANNIVERSARY
  segmentId           String?  @map("segment_id")  // Optional additional filtering
  isActive            Boolean  @default(true) @map("is_active")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")
  createdById         String   @map("created_by_id")

  organization        Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId, isActive])
  @@map("rolling_campaign_configs")
}

model AutoClearRejectRule {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")
  name            String
  description     String?
  disclosureTypes DisclosureType[]
  conditions      Json     // json-rules-engine format
  action          AutoClearRejectAction
  requiresReview  Boolean  @default(false) @map("requires_review")
  priority        Int      @default(100)
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  createdById     String   @map("created_by_id")

  organization    Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId, isActive])
  @@map("auto_clear_reject_rules")
}

enum AutoClearRejectAction {
  AUTO_CLEAR
  AUTO_REJECT

  @@map("auto_clear_reject_action")
}

model ProxyDelegation {
  id              String     @id @default(uuid())
  organizationId  String     @map("organization_id")
  delegatorId     String     @map("delegator_id")
  delegateId      String     @map("delegate_id")
  scope           ProxyScope
  scopeConfig     Json?      @map("scope_config")
  validFrom       DateTime   @map("valid_from")
  validUntil      DateTime   @map("valid_until")
  reason          String
  isActive        Boolean    @default(true) @map("is_active")
  createdAt       DateTime   @default(now()) @map("created_at")
  revokedAt       DateTime?  @map("revoked_at")
  revokedBy       String?    @map("revoked_by")
  revokeReason    String?    @map("revoke_reason")

  organization    Organization @relation(fields: [organizationId], references: [id])
  delegator       User         @relation("ProxyDelegator", fields: [delegatorId], references: [id])
  delegate        User         @relation("ProxyDelegate", fields: [delegateId], references: [id])

  @@index([organizationId, isActive])
  @@index([delegatorId, isActive])
  @@index([delegateId, isActive])
  @@map("proxy_delegations")
}

enum ProxyScope {
  FULL
  DISCLOSURE_TYPE
  VALUE_THRESHOLD
  APPROVAL_STAGE

  @@map("proxy_scope")
}

model DisclosureApprovalConfig {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")
  name            String
  disclosureTypes DisclosureType[]
  stages          Json     // ApprovalStage[]
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  createdById     String   @map("created_by_id")

  organization    Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId, isActive])
  @@map("disclosure_approval_configs")
}
```

### Campaign Model Extensions

```prisma
// Add to existing Campaign model:
model Campaign {
  // ... existing fields ...

  isRolling        Boolean  @default(false) @map("is_rolling")
  rollingConfigId  String?  @map("rolling_config_id")
  pauseState       Json?    @map("pause_state")  // { pausedAt, pausedBy, originalDueDate, reason }
}
```

## Sources

### Primary (HIGH confidence)

- Codebase review: `apps/backend/src/modules/campaigns/` (complete module inspection)
- Codebase review: `apps/backend/src/modules/disclosures/` (complete module inspection)
- Codebase review: `apps/backend/src/modules/rules/` (Phase 40 rules engine)
- Codebase review: `apps/backend/src/modules/hris/` (HRIS sync patterns)
- Codebase review: `apps/backend/src/modules/workflow/` (workflow engine patterns)
- Codebase review: `apps/backend/prisma/schema.prisma` (data model)

### Secondary (MEDIUM confidence)

- Phase 9 decision records RS.35-RS.60 (referenced in disclosures module comments)
- Phase 40 rules engine implementation (json-rules-engine patterns)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already in codebase, no new dependencies
- Architecture: HIGH - Patterns derived from existing services
- Pitfalls: HIGH - Identified from codebase patterns and common async processing issues

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (30 days - stable domain)
