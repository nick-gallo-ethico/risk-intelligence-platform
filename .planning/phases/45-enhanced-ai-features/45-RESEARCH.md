# Phase 45: Enhanced AI Features - Research

**Researched:** 2026-02-28
**Domain:** AI-powered note cleanup with preview, cross-case pattern detection, trend identification, pattern-based escalation
**Confidence:** HIGH

## Summary

This phase delivers advanced AI capabilities building on existing infrastructure. The codebase already has substantial foundations:

1. **Note cleanup skill exists** (`note-cleanup.skill.ts`) with light/full styles, but lacks before/after diff preview
2. **PatternDetectionService exists** (`pattern-detection.service.ts`) with `findRepeatInvolvements()` that already finds persons in 3+ cases - needs alerting layer
3. **Rules engine exists** (Phase 40 complete) with json-rules-engine, action executors, and execution logging - needs pattern-based trigger
4. **Notification infrastructure exists** with WebSocket gateway and in-app notifications - ready for pattern alerts
5. **AiNoteCleanup component exists** in frontend with side-by-side comparison - needs word-level diff enhancement

The standard approach is to:

1. Enhance the existing `AiNoteCleanup` component with word-level diff (using existing `diff` library from policy-version-diff.tsx)
2. Create `PatternAlert` model and `PatternAlertService` that uses existing `PatternDetectionService`
3. Add nightly BullMQ job (per-tenant, following existing `ai.processor.ts` pattern) to run pattern detection
4. Add real-time alert on case creation via `case.created` event listener
5. Create pattern-based rule triggers that combine rules engine with pattern detection
6. Build trend analysis service that queries aggregated case data by category/time period
7. Connect escalation from chatbot (Phase 44 dependency) with one-click inquiry creation

**Primary recommendation:** Leverage existing infrastructure heavily - PatternDetectionService for detection, NotificationGateway for real-time alerts, RulesEngine for escalation rules, diff library for preview UI.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)

| Library               | Version | Purpose                        | Why Standard                            |
| --------------------- | ------- | ------------------------------ | --------------------------------------- |
| json-rules-engine     | 7.3.1   | Pattern-based escalation rules | Already installed, Phase 40 foundation  |
| diff                  | 4.0.4   | Word-level text comparison     | Already used in policy-version-diff.tsx |
| @nestjs/bullmq        | 10.x    | Nightly pattern detection jobs | Existing job processor pattern          |
| @nestjs/event-emitter | 3.0.1   | Real-time pattern alerts       | Existing event-driven architecture      |
| socket.io             | 4.x     | WebSocket delivery of alerts   | Existing NotificationGateway            |

### Supporting (Already Installed)

| Library               | Version | Purpose                     | When to Use                         |
| --------------------- | ------- | --------------------------- | ----------------------------------- |
| @nestjs/elasticsearch | 10.x    | Pattern aggregation queries | Existing in PatternDetectionService |
| class-validator       | 0.14.1  | DTO validation              | Existing pattern                    |
| zod                   | 3.x     | Skill input validation      | Existing in note-cleanup.skill.ts   |

### No New Dependencies Needed

All required functionality can be built on existing dependencies. No new npm packages required.

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/modules/
├── associations/pattern-detection/
│   ├── pattern-detection.service.ts     # EXISTS - findRepeatInvolvements()
│   ├── pattern-alert.service.ts         # NEW - alert creation + delivery
│   ├── dto/
│   │   └── pattern-alert.dto.ts         # NEW
│   └── entities/
│       └── pattern-alert.entity.ts      # NEW - Prisma model reference
├── rules/
│   ├── listeners/
│   │   ├── case-routing.listener.ts     # EXISTS
│   │   └── pattern-escalation.listener.ts # NEW - combines rules + patterns
│   └── engine/
│       ├── operators/
│       │   └── pattern.operator.ts      # NEW - repeat_subject_count operator
│       └── actions/
│           └── escalate.action.ts       # NEW - escalation action executor
├── ai/
│   ├── skills/platform/
│   │   └── note-cleanup.skill.ts        # EXISTS - needs diff enhancement
│   └── trend-analysis/
│       └── trend-analysis.service.ts    # NEW
├── jobs/processors/
│   ├── ai.processor.ts                  # EXISTS - add pattern-detection job
│   └── pattern-detection.processor.ts   # NEW - dedicated processor
└── notifications/
    └── services/
        └── notification.service.ts      # EXISTS - add pattern alert type

apps/frontend/src/components/
├── operator/
│   └── ai-note-cleanup.tsx              # EXISTS - needs diff view enhancement
├── ai/
│   └── note-cleanup-diff.tsx            # NEW - word-level diff component
└── alerts/
    └── pattern-alert-banner.tsx         # NEW - inline alert display
```

### Pattern 1: Enhanced Note Cleanup with Diff Preview (AIEX-01)

**What:** Add word-level diff to existing AiNoteCleanup using the diff library pattern from policy-version-diff.tsx
**When to use:** Before/after preview for note cleanup
**Example:**

```typescript
// Source: Existing policy-version-diff.tsx pattern
import { diffWords, type Change } from 'diff';

interface NoteCleanupDiffProps {
  originalContent: string;
  cleanedContent: string;
}

export function NoteCleanupDiff({ originalContent, cleanedContent }: NoteCleanupDiffProps) {
  const differences = useMemo(() => {
    return diffWords(originalContent, cleanedContent);
  }, [originalContent, cleanedContent]);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {differences.map((part, index) => (
        <DiffSegment key={index} part={part} />
      ))}
    </div>
  );
}

// Reuse exact DiffSegment pattern from policy-version-diff.tsx
function DiffSegment({ part }: { part: Change }) {
  if (part.added) {
    return <span className="bg-green-100 dark:bg-green-900/30 rounded-sm px-0.5">{part.value}</span>;
  }
  if (part.removed) {
    return <span className="bg-red-100 dark:bg-red-900/30 line-through rounded-sm px-0.5">{part.value}</span>;
  }
  return <span>{part.value}</span>;
}
```

### Pattern 2: Pattern Alert Model and Service (AIEX-02)

**What:** Prisma model for pattern alerts with notification delivery
**When to use:** Storing and delivering cross-case pattern detection alerts
**Example:**

```prisma
// Source: Domain requirements + existing notification pattern
model PatternAlert {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")
  patternType     String   @map("pattern_type") // 'repeat_subject', 'velocity', 'category_spike'
  entityType      String   @map("entity_type")  // 'PERSON', 'CATEGORY', 'LOCATION'
  entityId        String   @map("entity_id")
  threshold       Int      // e.g., 3 for "3+ cases"
  actualCount     Int      @map("actual_count")
  caseIds         String[] @map("case_ids")     // Cases involved in pattern
  severity        String   @default("MEDIUM")   // LOW, MEDIUM, HIGH
  status          String   @default("ACTIVE")   // ACTIVE, ACKNOWLEDGED, DISMISSED
  acknowledgedAt  DateTime? @map("acknowledged_at")
  acknowledgedById String?  @map("acknowledged_by_id")
  createdAt       DateTime @default(now()) @map("created_at")

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, status])
  @@index([organizationId, patternType])
  @@index([organizationId, entityId])
  @@map("pattern_alerts")
}
```

### Pattern 3: Nightly Pattern Detection Job (AIEX-02, AIEX-03)

**What:** BullMQ job that runs pattern detection per tenant, following existing processor pattern
**When to use:** Scheduled pattern detection (nightly per tenant)
**Example:**

```typescript
// Source: Existing ai.processor.ts pattern
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

export const PATTERN_DETECTION_QUEUE = "pattern-detection";

interface PatternDetectionJobData {
  organizationId: string;
  patternTypes: ("repeat_subject" | "velocity" | "category_spike")[];
  thresholds: {
    repeatSubjectMin: number; // Default: 3
    velocityDays: number; // Default: 90
    velocityCases: number; // Default: 5
  };
}

@Processor(PATTERN_DETECTION_QUEUE, { concurrency: 2 })
export class PatternDetectionProcessor extends WorkerHost {
  constructor(
    private readonly patternDetection: PatternDetectionService,
    private readonly alertService: PatternAlertService,
  ) {
    super();
  }

  async process(job: Job<PatternDetectionJobData>): Promise<void> {
    const { organizationId, thresholds } = job.data;

    // Use existing findRepeatInvolvements from PatternDetectionService
    const repeatSubjects = await this.patternDetection.findRepeatInvolvements(
      PersonCaseLabel.SUBJECT,
      thresholds.repeatSubjectMin,
      organizationId,
    );

    // Create alerts for new patterns (dedupe against existing active alerts)
    for (const subject of repeatSubjects) {
      await this.alertService.createOrUpdateAlert({
        organizationId,
        patternType: "repeat_subject",
        entityType: "PERSON",
        entityId: subject.personId,
        threshold: thresholds.repeatSubjectMin,
        actualCount: subject.caseCount,
      });
    }
  }
}
```

### Pattern 4: Real-time Alert on Case Creation (AIEX-02)

**What:** Event listener that checks for repeat subjects when case is created
**When to use:** Instant pattern detection without waiting for nightly job
**Example:**

```typescript
// Source: Existing case-routing.listener.ts pattern
@Injectable()
export class PatternAlertListener {
  @OnEvent(CaseCreatedEvent.eventName, { async: true })
  async handleCaseCreated(event: CaseCreatedEvent): Promise<void> {
    // Get person associations for this case
    const associations = await this.prisma.personCaseAssociation.findMany({
      where: { caseId: event.caseId, organizationId: event.organizationId },
      select: { personId: true, label: true },
    });

    // Check each SUBJECT for repeat involvement
    for (const assoc of associations.filter((a) => a.label === "SUBJECT")) {
      const summary = await this.patternDetection.getPersonInvolvementSummary(
        assoc.personId,
        event.organizationId,
      );

      // Threshold check (configurable per org)
      if (summary.totalCases >= 3) {
        await this.alertService.createRealTimeAlert({
          organizationId: event.organizationId,
          patternType: "repeat_subject",
          entityId: assoc.personId,
          triggerCaseId: event.caseId,
          totalCases: summary.totalCases,
        });
      }
    }
  }
}
```

### Pattern 5: Pattern-Based Escalation Rule (AIEX-03)

**What:** Custom rule operator and action for pattern-based escalation
**When to use:** "5+ cases in 90 days = auto-escalate" rules
**Example:**

```typescript
// Custom operator for pattern conditions
// Source: Existing operators pattern in rules/engine/operators/
export function registerPatternOperator(engine: Engine): void {
  engine.addOperator('repeatSubjectCountGte', async (factValue, jsonValue, almanac) => {
    // factValue: personId from case.subjects array
    // jsonValue: threshold (e.g., 5)
    const organizationId = await almanac.factValue('organizationId');
    const summary = await patternDetectionService.getPersonInvolvementSummary(
      factValue,
      organizationId,
    );
    return summary.totalCases >= jsonValue;
  });
}

// Rule definition example
{
  name: "Escalate Repeat Subjects",
  conditions: {
    all: [
      { fact: "subjects", operator: "notEmpty", value: true },
      {
        fact: "subjects",
        operator: "repeatSubjectCountGte",
        value: 5,
        params: { withinDays: 90 }
      }
    ]
  },
  actions: [
    { type: "escalate", params: { level: "CCO", reason: "Repeat subject threshold exceeded" } }
  ]
}
```

### Pattern 6: Trend Analysis Service (AIEX-04)

**What:** Service that computes statistical trends by category/location over time
**When to use:** "Harassment reports up 40% in Manufacturing"
**Example:**

```typescript
// Source: Domain requirements + existing WidgetCaseDataService pattern
@Injectable()
export class TrendAnalysisService {
  interface TrendResult {
    category: string;
    currentPeriodCount: number;
    previousPeriodCount: number;
    percentChange: number;
    direction: 'up' | 'down' | 'stable';
    significance: 'notable' | 'significant' | 'critical';
  }

  async detectCategoryTrends(
    organizationId: string,
    periodDays: number = 30,
    minChangePercent: number = 25,
  ): Promise<TrendResult[]> {
    const now = new Date();
    const periodStart = subDays(now, periodDays);
    const previousStart = subDays(periodStart, periodDays);

    // Aggregate by category for current period
    const currentCounts = await this.prisma.case.groupBy({
      by: ['primaryCategoryId'],
      where: {
        organizationId,
        createdAt: { gte: periodStart },
      },
      _count: true,
    });

    // Aggregate by category for previous period
    const previousCounts = await this.prisma.case.groupBy({
      by: ['primaryCategoryId'],
      where: {
        organizationId,
        createdAt: { gte: previousStart, lt: periodStart },
      },
      _count: true,
    });

    // Calculate trends
    return this.calculateTrends(currentCounts, previousCounts, minChangePercent);
  }
}
```

### Anti-Patterns to Avoid

- **Running pattern detection synchronously in request path:** Always use async event handlers or background jobs
- **Querying all organizations in one pattern detection run:** Process per-tenant for isolation and performance
- **Skipping deduplication of alerts:** Check for existing active alerts before creating new ones
- **Hardcoding thresholds:** Make thresholds configurable per organization
- **Using AI for simple counting:** Pattern detection is aggregation, not AI - save AI for summarization

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                   | Don't Build               | Use Instead                      | Why                                            |
| ------------------------- | ------------------------- | -------------------------------- | ---------------------------------------------- |
| Text diff                 | Custom string comparison  | `diff` library                   | Already used in codebase, handles edge cases   |
| Pattern detection queries | Raw SQL aggregation       | Existing PatternDetectionService | Already has Elasticsearch aggregation logic    |
| Real-time alerts          | Custom WebSocket handling | NotificationGateway              | Already has tenant-isolated rooms              |
| Rule evaluation           | Custom IF/ELSE            | json-rules-engine                | Phase 40 foundation, supports custom operators |
| Scheduled jobs            | setInterval/cron          | BullMQ per-tenant queues         | Existing processor pattern, handles failures   |

**Key insight:** Phase 45 is largely about CONNECTING existing pieces - PatternDetectionService, RulesEngine, NotificationGateway, diff library - rather than building from scratch.

## Common Pitfalls

### Pitfall 1: Tenant Data Leak in Pattern Detection

**What goes wrong:** Pattern detection queries cross tenant boundaries
**Why it happens:** Missing organizationId filter in aggregation queries
**How to avoid:**

- PatternDetectionService already filters by tenant via ES index naming (`org_{tenantId}_cases`)
- Prisma queries MUST include organizationId in WHERE clause
- Pattern alerts MUST have organizationId field
  **Warning signs:** Alerts showing cases from wrong organizations

### Pitfall 2: Alert Spam

**What goes wrong:** Same pattern generates multiple alerts
**Why it happens:** No deduplication - both nightly job and real-time listener create alerts
**How to avoid:**

- Check for existing active alert before creating
- Use upsert pattern: `createOrUpdateAlert()`
- Increment `actualCount` on existing alert rather than creating duplicate
  **Warning signs:** Users seeing duplicate "John Smith in 3 cases" alerts

### Pitfall 3: Performance Issues with Eager AI Analysis

**What goes wrong:** AI trend analysis runs on every page load
**Why it happens:** Calling AI for what should be cached aggregation
**How to avoid:**

- Trend analysis is NOT AI - it's database aggregation
- AI should only summarize/narrate the trends, not compute them
- Cache trend results for 1 hour (or until new case created)
  **Warning signs:** Slow dashboard loads, high AI API costs

### Pitfall 4: Missing Escalation Audit Trail

**What goes wrong:** No record of why case was escalated
**Why it happens:** Escalation action doesn't log rationale
**How to avoid:**

- Use existing RuleExecutionLog pattern from Phase 40
- Include pattern data in facts snapshot
- Activity log entry with "Escalated due to: 5 cases involving John Smith in 90 days"
  **Warning signs:** CCO asks "why was this escalated?" with no answer

### Pitfall 5: Blocking Case Creation with Pattern Checks

**What goes wrong:** Case creation API times out due to pattern detection
**Why it happens:** Synchronous pattern check in request path
**How to avoid:**

- Pattern detection listener MUST use `{ async: true }`
- Alert creation is fire-and-forget from case creation perspective
- Pattern checks use existing indexed data (ES), not real-time computation
  **Warning signs:** Slow case creation, 504 errors

## Code Examples

Verified patterns from existing codebase:

### Existing PatternDetectionService Usage

```typescript
// Source: apps/backend/src/modules/associations/pattern-detection/pattern-detection.service.ts

// Find persons appearing in 3+ cases as SUBJECT
const repeats = await patternDetection.findRepeatInvolvements(
  PersonCaseLabel.SUBJECT,
  3, // minCount
  organizationId,
);
// Returns: [{ personId, personName, caseCount }]

// Get full involvement summary for a person
const summary = await patternDetection.getPersonInvolvementSummary(
  personId,
  organizationId,
);
// Returns: { personId, personName, totalCases, byRole: [{ label, count, byStatus }] }
```

### Existing Diff Library Usage

```typescript
// Source: apps/frontend/src/components/policies/policy-version-diff.tsx
import { diffWords, type Change } from "diff";

const differences = useMemo(() => {
  return diffWords(oldText, newText);
}, [oldText, newText]);

// Each Change has: { added: boolean, removed: boolean, value: string }
```

### Existing Note Cleanup Skill

```typescript
// Source: apps/backend/src/modules/ai/skills/platform/note-cleanup.skill.ts
export function noteCleanupSkill(
  providerRegistry: ProviderRegistryService,
  rateLimiter: AiRateLimiterService,
  promptService: PromptService,
): SkillDefinition<NoteCleanupInput, NoteCleanupOutput> {
  return {
    id: "note-cleanup",
    name: "Clean Up Notes",
    inputSchema: noteCleanupInputSchema,
    async execute(input, context): Promise<SkillResult<NoteCleanupOutput>> {
      // Already returns cleanedContent, changes array, lengths
    },
  };
}
```

### Existing Rules Engine Pattern

```typescript
// Source: apps/backend/src/modules/rules/engine/rules-engine.service.ts
const result = await this.rulesEngine.evaluate(
  organizationId,
  "case.created",
  facts,
);

if (result.matched) {
  const actionResults = await this.rulesEngine.executeActions(
    result.triggeredActions,
    context,
  );
  await this.rulesEngine.logExecution(
    organizationId,
    ruleId,
    entityType,
    entityId,
    result,
    actionResults.actions,
  );
}
```

## State of the Art

| Old Approach          | Current Approach               | When Changed | Impact               |
| --------------------- | ------------------------------ | ------------ | -------------------- |
| Manual pattern review | Automated detection + alerts   | This phase   | Proactive compliance |
| Raw notes in record   | AI-cleaned narrative with diff | This phase   | Better documentation |
| Static dashboards     | AI-identified trends           | This phase   | Actionable insights  |
| Manual escalation     | Pattern-based auto-escalation  | This phase   | Faster response      |

**Dependencies on future phases:**

- AIEX-05 (chatbot escalation) depends on Phase 44 (Employee Chatbot) being complete
- RAG-based trend summarization depends on Phase 43 (RAG Infrastructure) being complete

## Open Questions

Things that couldn't be fully resolved:

1. **Pattern detection thresholds - per-org or global defaults?**
   - What we know: Different orgs may have different case volumes
   - What's unclear: Should thresholds be configurable per org?
   - Recommendation: Start with global defaults (3 cases, 90 days), add org config in Phase 51

2. **Trend analysis time periods**
   - What we know: Need to compare current vs previous period
   - What's unclear: What periods are meaningful? (30 days? quarters?)
   - Recommendation: Start with 30-day rolling comparison, add configurable periods later

3. **Alert dismissal workflow**
   - What we know: Users need to acknowledge/dismiss alerts
   - What's unclear: Who can dismiss? Does dismissal expire?
   - Recommendation: Allow any viewer to acknowledge, but only admins to dismiss permanently

4. **Chatbot escalation handoff (AIEX-05)**
   - What we know: Needs Phase 44 (chatbot) to be implemented
   - What's unclear: Exact handoff mechanism from chat to inquiry
   - Recommendation: Design API now, implement when Phase 44 is complete

## Sources

### Primary (HIGH confidence)

- Existing codebase: `apps/backend/src/modules/associations/pattern-detection/pattern-detection.service.ts` - full implementation reviewed
- Existing codebase: `apps/frontend/src/components/policies/policy-version-diff.tsx` - diff library usage pattern
- Existing codebase: `apps/frontend/src/components/operator/ai-note-cleanup.tsx` - current UI for note cleanup
- Existing codebase: `apps/backend/src/modules/ai/skills/platform/note-cleanup.skill.ts` - skill implementation
- Existing codebase: `apps/backend/src/modules/rules/engine/rules-engine.service.ts` - rules engine wrapper
- Existing codebase: `apps/backend/src/modules/rules/listeners/case-routing.listener.ts` - event listener pattern
- Existing codebase: `apps/backend/src/modules/notifications/gateways/notification.gateway.ts` - WebSocket delivery
- Phase 40 Research: `.planning/phases/40-rules-engine-foundation/40-RESEARCH.md` - rules engine foundation

### Secondary (MEDIUM confidence)

- diff library: https://github.com/kpdecker/jsdiff - npm, 10M weekly downloads, stable API
- json-rules-engine: https://github.com/CacheControl/json-rules-engine - custom operator pattern

### Tertiary (LOW confidence)

- None - all patterns derive from existing codebase

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - all libraries already installed and in use
- Architecture: HIGH - extends existing patterns from rules engine and pattern detection
- Pitfalls: HIGH - based on existing codebase patterns and multi-tenant requirements
- Dependencies: MEDIUM - Phases 43/44 not yet implemented, exact integration TBD

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (30 days - stable domain, building on existing infrastructure)
