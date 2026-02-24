# Architecture Integration Research: v2.0 Intelligence Layer

**Project:** Risk Intelligence Platform v2.0
**Researched:** 2026-02-24
**Scope:** Integration of v2.0 intelligence layer capabilities with existing 42-module architecture
**Confidence:** HIGH (based on direct codebase analysis)

---

## Executive Summary

The existing Risk Intelligence Platform has a well-structured, event-driven architecture with 42 NestJS modules, 127+ Prisma models, and established patterns for AI, workflows, campaigns, and real-time communication. The v2.0 intelligence layer capabilities can integrate through clear extension points rather than rewrites.

**Key Finding:** The platform's existing event-driven architecture (`@nestjs/event-emitter`), job queue system (`BullMQ`), and AI module (`AiGateway`, `AgentRegistry`, `SkillRegistry`) provide natural integration points for all v2.0 capabilities.

---

## 1. Existing Architecture Inventory

### 1.1 Module Organization (42 modules)

```
apps/backend/src/modules/
├── ai/                    # AI infrastructure (gateway, agents, skills, actions)
├── analytics/             # Dashboards, reports, exports, migration, my-work
├── attachments/           # File upload/storage
├── audit/                 # Activity logging
├── auth/                  # JWT, SSO, MFA, guards
├── branding/              # Tenant branding
├── campaigns/             # Disclosure/attestation campaigns, targeting, waves
├── cases/                 # Case CRUD, pipeline, merge, export
├── custom-properties/     # Dynamic field definitions
├── demo/                  # Demo environment isolation
├── disclosures/           # Disclosure forms, threshold rules, conflict detection
├── events/                # Global event emitter configuration
├── feature-flags/         # Feature toggles
├── forms/                 # Dynamic form builder
├── health/                # Health checks
├── help/                  # Knowledge base, support tickets
├── hris/                  # Merge.dev HRIS integration
├── investigation-notes/   # Note CRUD
├── investigations/        # Investigation CRUD, checklists, interviews
├── jobs/                  # BullMQ queues and processors
├── messaging/             # Anonymous relay service
├── metrics/               # Prometheus metrics
├── notifications/         # Email, in-app, WebSocket, digests
├── operations/            # Internal ops (client success, hotline, impersonation)
├── organization/          # Org settings
├── persons/               # Person records for pattern detection
├── policies/              # Policy management, versions, translations
├── portals/               # Ethics portal, employee portal, operator portal
├── prisma/                # Database service
├── projects/              # Implementation project management
├── remediation/           # Remediation plans
├── reporting/             # Report templates, execution
├── rius/                  # Risk Intelligence Units (immutable intake)
├── saved-views/           # HubSpot-style saved views
├── search/                # Elasticsearch with permission filters
├── sentry/                # Error tracking
├── storage/               # Azure Blob storage
├── tables/                # Data table configurations
├── users/                 # User management
└── workflow/              # Workflow engine, SLA, assignment strategies
```

### 1.2 Key Infrastructure Services

| Service | Module | Purpose | Existing Events |
|---------|--------|---------|-----------------|
| `EventEmitter2` | `events/` | Global event bus (wildcard patterns) | `case.*`, `investigation.*`, `sla.*`, `workflow.*` |
| `BullMQ` | `jobs/` | Job queues | `email`, `ai`, `indexing`, `exports`, `campaigns` |
| `AiGateway` | `ai/` | WebSocket streaming (`/ai` namespace) | `chat`, `skill_execute`, `action_execute` |
| `NotificationGateway` | `notifications/` | Real-time notifications | `notification_push` |
| `WorkflowEngineService` | `workflow/` | State machine with transitions | `workflow.transitioned`, `workflow.completed` |
| `AssignmentRulesService` | `workflow/` | Pluggable assignment (round-robin, least-loaded, geographic) | N/A |
| `HrisSyncService` | `hris/` | Merge.dev employee sync | `hris.sync.completed` |
| `SearchService` | `search/` | Elasticsearch per-tenant indices | N/A |
| `MessageRelayService` | `messaging/` | Anonymous reporter communication | N/A |
| `ConflictDetectionService` | `disclosures/` | Disclosure conflict matching | N/A |

### 1.3 Existing AI Module Structure

```
modules/ai/
├── ai.module.ts           # Module definition, exports
├── ai.gateway.ts          # WebSocket gateway (/ai namespace)
├── ai.controller.ts       # REST endpoints
├── agents/
│   ├── agent.registry.ts  # Registry of available agents
│   ├── base.agent.ts      # Base agent class
│   ├── case.agent.ts      # Case-specific agent
│   ├── investigation.agent.ts
│   └── compliance-manager.agent.ts
├── skills/
│   ├── skill.registry.ts  # Registry of skills
│   ├── skill.types.ts
│   └── platform/
│       ├── summarize.skill.ts
│       ├── note-cleanup.skill.ts
│       ├── category-suggest.skill.ts
│       ├── risk-score.skill.ts
│       └── translate.skill.ts
├── actions/
│   ├── action.catalog.ts  # Static action registry
│   ├── action-executor.service.ts
│   └── actions/
│       ├── add-note.action.ts
│       ├── change-status.action.ts
│       ├── assign-case.action.ts
│       └── update-case.action.ts
├── services/
│   ├── ai-client.service.ts      # Claude API wrapper
│   ├── conversation.service.ts   # Conversation persistence
│   ├── context-loader.service.ts # Entity context loading
│   ├── context-cache.service.ts
│   ├── hierarchy-loader.service.ts
│   ├── prompt-builder.service.ts
│   ├── prompt.service.ts
│   └── rate-limiter.service.ts
└── providers/
    └── claude.provider.ts  # Claude AI provider
```

### 1.4 Database Model Patterns

**Tenant Isolation:**
- Every model has `organizationId` field
- Row-Level Security via PostgreSQL policies
- Index pattern: `@@index([organizationId, ...])`

**AI-First Fields (existing on Case, RIU, Investigation):**
```prisma
aiSummary            String?   @map("ai_summary")
aiSummaryGeneratedAt DateTime? @map("ai_summary_generated_at")
aiModelVersion       String?   @map("ai_model_version")
aiCategorySuggestion String?   @map("ai_category_suggestion")
aiSeveritySuggestion Severity? @map("ai_severity_suggestion")
aiConfidenceScore    Int?      @map("ai_confidence_score")
```

**Extension Table Pattern:**
- `RiuHotlineExtension`, `RiuDisclosureExtension`, `RiuWebFormExtension`
- Type-specific data stored in separate tables linked 1:1 to base RIU

---

## 2. Integration Analysis by Capability

### 2.1 Rules Engine

**Goal:** Configurable business rules for case routing, auto-assignment, SLA triggers, approval gates

#### Existing Integration Points

| Component | Location | How to Extend |
|-----------|----------|---------------|
| `WorkflowEngineService` | `workflow/engine/` | Add `RulesEvaluatorService` hook at `transition()` method |
| `validateGates()` | `workflow/engine/` | Currently placeholder - implement with rules engine |
| `AssignmentRulesService` | `workflow/assignment/` | Strategy pattern exists; add `rules-based.strategy.ts` |
| `SlaSchedulerService` | `workflow/sla/` | Hook for dynamic SLA rules |
| Event listeners | `events/events/case.events.ts` | Add `case.created` listener for auto-routing |

#### New Components Needed

```
modules/rules/
├── rules.module.ts
├── entities/
│   ├── rule-definition.entity.ts    # Rule configuration storage
│   └── rule-execution-log.entity.ts # Audit trail
├── services/
│   ├── rule-parser.service.ts       # Parse rule DSL/JSON
│   ├── rule-evaluator.service.ts    # Evaluate conditions against entity
│   └── rule-executor.service.ts     # Execute actions when conditions met
├── strategies/
│   └── rules-based.strategy.ts      # For workflow assignment
├── listeners/
│   ├── case-rule.listener.ts        # Listen to case.* events
│   └── workflow-rule.listener.ts    # Listen to workflow.* events
└── dto/
    ├── create-rule.dto.ts
    └── rule-execution.dto.ts
```

#### Database Changes

```prisma
model RuleDefinition {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  name           String
  description    String?
  triggerEvent   String   @map("trigger_event")    // 'case.created', 'workflow.transitioned'
  triggerEntity  String   @map("trigger_entity")   // 'case', 'investigation'
  conditions     Json                               // Rule conditions JSON
  actions        Json                               // Actions to execute
  priority       Int      @default(0)               // Higher = earlier evaluation
  isActive       Boolean  @default(true) @map("is_active")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  createdById    String?  @map("created_by_id")

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  executions     RuleExecutionLog[]

  @@index([organizationId])
  @@index([organizationId, triggerEvent, isActive])
  @@map("rule_definitions")
}

model RuleExecutionLog {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  ruleId         String   @map("rule_id")
  entityType     String   @map("entity_type")
  entityId       String   @map("entity_id")
  triggerEvent   String   @map("trigger_event")
  conditionsMet  Boolean  @map("conditions_met")
  actionsResult  Json?    @map("actions_result")
  executionTime  Int      @map("execution_time")   // milliseconds
  error          String?
  createdAt      DateTime @default(now()) @map("created_at")

  rule           RuleDefinition @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, ruleId])
  @@index([organizationId, entityType, entityId])
  @@index([createdAt])
  @@map("rule_execution_logs")
}
```

#### Integration Code Pattern

```typescript
// In existing CasesService.create()
async create(dto: CreateCaseDto, userId: string, orgId: string) {
  const case = await this.prisma.case.create({ ... });

  // Existing event emission - rules engine listens to this
  this.eventEmitter.emit('case.created', new CaseCreatedEvent({
    organizationId: orgId,
    caseId: case.id,
    categoryId: case.primaryCategoryId,
    severity: case.severity,
    sourceChannel: case.sourceChannel,
  }));

  return case;
}

// New listener in rules module
@OnEvent('case.created')
async onCaseCreated(event: CaseCreatedEvent) {
  const rules = await this.ruleDefinitionService.findByTrigger(
    event.organizationId,
    'case.created'
  );

  for (const rule of rules.sort((a, b) => b.priority - a.priority)) {
    const result = await this.ruleEvaluator.evaluate(rule, event);
    await this.logExecution(rule, event, result);

    if (result.conditionsMet) {
      await this.ruleExecutor.execute(rule.actions, event);
    }
  }
}
```

---

### 2.2 Anonymous Relay Enhancement

**Goal:** Two-way anonymous communication between reporters and investigators via access code with email delivery

#### Existing Integration Points

| Component | Location | Current State | Extension Needed |
|-----------|----------|---------------|------------------|
| `CaseMessage` | Prisma schema | Has `direction`, `deliveryStatus` | Add email tracking fields |
| `MessageRelayService` | `messaging/relay.service.ts` | Basic implementation | Add email delivery trigger |
| `RiuAccessService` | `rius/riu-access.service.ts` | Generates/validates codes | Already functional |
| `EthicsPortalService` | `portals/ethics/` | Has `getMessages()`, `sendMessage()` | Add notification trigger |
| `NotificationService` | `notifications/` | Email infrastructure exists | Hook for relay notifications |
| `EmailTemplateService` | `notifications/` | Template rendering | Add relay templates |

#### New Components Needed

```
modules/messaging/
├── (existing files)
├── services/
│   └── relay-notification.service.ts  # Email notifications for messages
├── listeners/
│   └── case-message.listener.ts       # React to message events
└── dto/
    └── relay-notification.dto.ts
```

**New email templates:**
```
modules/notifications/templates/relay/
├── reporter-new-message.hbs      # When investigator sends message
├── investigator-new-message.hbs  # When reporter sends message
└── reporter-status-update.hbs    # When case status changes
```

#### Database Changes

```prisma
// Extend CaseMessage - add to existing model
model CaseMessage {
  // ... existing fields ...

  // New fields for email tracking
  emailSentAt      DateTime? @map("email_sent_at")
  emailDeliveredAt DateTime? @map("email_delivered_at")
  emailBouncedAt   DateTime? @map("email_bounced_at")
  notificationId   String?   @map("notification_id")  // Link to Notification record
}
```

#### Integration Data Flow

```
Reporter submits message via Ethics Portal
    │
    └─▶ EthicsPortalService.sendMessage(accessCode, content)
            │
            └─▶ MessageRelayService.receiveFromReporter()
                    │
                    ├─▶ Creates CaseMessage (direction: FROM_REPORTER)
                    │
                    └─▶ Emits 'case.message.received' event
                            │
                            └─▶ CaseMessageListener.onMessageReceived()
                                    │
                                    └─▶ NotificationService.notifyInvestigator()

Investigator replies via Case Detail page
    │
    └─▶ CasesController.sendMessage(caseId, content)
            │
            └─▶ MessageRelayService.sendToReporter()
                    │
                    ├─▶ Creates CaseMessage (direction: TO_REPORTER)
                    │
                    ├─▶ If reporter has email:
                    │       └─▶ Queue email with access code link
                    │
                    └─▶ Emits 'case.message.sent' event
```

---

### 2.3 pgvector RAG for Policy/Knowledge Search

**Goal:** Semantic search over policies and knowledge base using vector embeddings

#### Existing Integration Points

| Component | Location | How to Extend |
|-----------|----------|---------------|
| `SearchService` | `search/search.service.ts` | Add semantic search as alternative path |
| `IndexingService` | `search/indexing/` | Add embedding generation step |
| `PolicyIndexer` | `search/indexing/indexers/` | Extend for embeddings |
| `AiClientService` | `ai/services/` | Add embedding API calls |
| `UnifiedSearchService` | `search/unified-search.service.ts` | Add hybrid search mode |

#### New Components Needed

```
modules/search/
├── (existing files)
├── semantic/
│   ├── embedding.service.ts         # Generate embeddings via API
│   ├── vector-store.service.ts      # pgvector operations
│   └── hybrid-search.service.ts     # Combine keyword + semantic
├── indexing/
│   └── embedding-indexer.service.ts # Batch embedding generation
└── dto/
    └── semantic-search.dto.ts
```

#### Database Changes

```prisma
model DocumentEmbedding {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  entityType     String   @map("entity_type")   // 'policy', 'article', 'case'
  entityId       String   @map("entity_id")
  chunkIndex     Int      @default(0) @map("chunk_index")  // For chunked docs
  chunkText      String   @map("chunk_text")    // The text that was embedded
  embedding      Bytes    @db.ByteA             // Binary storage for vector
  metadata       Json?
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, entityType, entityId, chunkIndex])
  @@index([organizationId, entityType])
  @@map("document_embeddings")
}
```

**Migration for pgvector:**
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column (1536 dimensions for text-embedding-3-small)
ALTER TABLE document_embeddings
ADD COLUMN embedding_vector vector(1536);

-- Create index for similarity search
CREATE INDEX document_embeddings_vector_idx
ON document_embeddings
USING hnsw (embedding_vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

#### Integration with AI Module

```typescript
// Extend AiClientService
@Injectable()
export class AiClientService {
  // ... existing methods ...

  async generateEmbedding(text: string): Promise<number[]> {
    // Option 1: Use OpenAI embeddings (recommended for RAG)
    const response = await this.openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;

    // Option 2: Use Claude embeddings (if available)
    // Note: Claude's embeddings may not be available via API
  }
}

// New VectorStoreService
@Injectable()
export class VectorStoreService {
  async similaritySearch(
    orgId: string,
    entityType: string,
    queryEmbedding: number[],
    limit: number = 10
  ): Promise<SearchResult[]> {
    return this.prisma.$queryRaw`
      SELECT entity_id, chunk_text,
             1 - (embedding_vector <=> ${queryEmbedding}::vector) as similarity
      FROM document_embeddings
      WHERE organization_id = ${orgId}
        AND entity_type = ${entityType}
      ORDER BY embedding_vector <=> ${queryEmbedding}::vector
      LIMIT ${limit}
    `;
  }
}
```

---

### 2.4 Employee-Facing Chatbot

**Goal:** AI chatbot for policy questions, case status checks, disclosure guidance

#### Existing Integration Points

| Component | Location | Current State | Extension Needed |
|-----------|----------|---------------|------------------|
| `AiGateway` | `ai/ai.gateway.ts` | Streaming WebSocket | Works as-is |
| `AgentRegistry` | `ai/agents/agent.registry.ts` | Entity-scoped agents | Add `employee-chatbot` agent |
| `SkillRegistry` | `ai/skills/skill.registry.ts` | Platform skills | Add employee-specific skills |
| `ConversationService` | `ai/services/conversation.service.ts` | Conversation persistence | Works as-is |
| `ContextLoaderService` | `ai/services/context-loader.service.ts` | Entity context | Add employee context |

#### New Components Needed

```
modules/ai/
├── agents/
│   └── employee-chatbot.agent.ts     # New agent for employee portal
├── skills/
│   └── employee/
│       ├── policy-search.skill.ts    # RAG-powered policy lookup
│       ├── case-status.skill.ts      # Check case status by access code
│       ├── disclosure-guide.skill.ts # Guide through disclosure forms
│       ├── faq-answer.skill.ts       # Answer common questions
│       └── escalate-human.skill.ts   # Escalate to human support
```

#### Agent Implementation

```typescript
// employee-chatbot.agent.ts
@Injectable()
export class EmployeeChatbotAgent extends BaseAgent {
  static readonly agentType = 'employee-chatbot';

  constructor(
    private readonly policySearchSkill: PolicySearchSkill,
    private readonly caseStatusSkill: CaseStatusSkill,
    private readonly disclosureGuideSkill: DisclosureGuideSkill,
    private readonly faqSkill: FaqAnswerSkill,
    private readonly vectorStore: VectorStoreService,
  ) {
    super();
  }

  async initialize(context: AgentContext): Promise<void> {
    this.context = context;
    // Load employee-specific context
    this.employeeProfile = await this.loadEmployeeProfile(context.userId);
  }

  async *chat(message: string, context: AgentContext): AsyncGenerator<StreamEvent> {
    // Classify intent
    const intent = await this.classifyIntent(message);

    switch (intent.type) {
      case 'policy_question':
        yield* this.policySearchSkill.execute(message, context);
        break;
      case 'case_status':
        yield* this.caseStatusSkill.execute(intent.accessCode, context);
        break;
      case 'disclosure_help':
        yield* this.disclosureGuideSkill.execute(message, context);
        break;
      case 'general_question':
        yield* this.faqSkill.execute(message, context);
        break;
      default:
        yield* this.handleGeneralChat(message, context);
    }
  }
}
```

**No database changes required** - leverages existing AI conversation infrastructure.

---

### 2.5 Rolling Disclosure Campaigns (HRIS-Triggered)

**Goal:** Auto-assign disclosures when employees change roles or join company

#### Existing Integration Points

| Component | Location | Current State | Extension Needed |
|-----------|----------|---------------|------------------|
| `HrisSyncService` | `hris/hris-sync.service.ts` | Emits `hris.sync.completed` | Already functional |
| `CampaignsService` | `campaigns/campaigns.service.ts` | Has `launchCampaign()` | Works as-is |
| `CampaignAssignmentService` | `campaigns/assignments/` | Creates assignments | Works as-is |
| `SegmentService` | `campaigns/targeting/segment.service.ts` | Builds audience | Works as-is |
| `WaveSchedulerService` | `campaigns/services/wave-scheduler.service.ts` | Staggered rollout | Works as-is |

#### New Components Needed

```
modules/campaigns/
├── (existing files)
├── rolling/
│   ├── rolling-campaign.service.ts   # Manages rolling campaign logic
│   ├── rolling-campaign.types.ts     # Type definitions
│   └── hris-trigger.listener.ts      # Reacts to HRIS sync events
```

#### Database Changes

```prisma
// Extend Campaign model - add to existing
model Campaign {
  // ... existing fields ...

  // Rolling campaign support
  isRolling           Boolean   @default(false) @map("is_rolling")
  rollingTriggerType  String?   @map("rolling_trigger_type")   // 'new_hire', 'role_change', 'location_change', 'manager_change'
  rollingTriggerConfig Json?    @map("rolling_trigger_config") // Trigger conditions
  rollingLastProcessed DateTime? @map("rolling_last_processed")
}
```

#### Integration Event Flow

```typescript
// hris-trigger.listener.ts
@Injectable()
export class HrisTriggerListener {
  @OnEvent('hris.sync.completed')
  async onHrisSyncCompleted(event: HrisSyncCompletedEvent) {
    // Get all rolling campaigns for this org
    const rollingCampaigns = await this.campaignService.findRolling(
      event.organizationId
    );

    // Get employee changes from sync
    const changes = await this.getEmployeeChanges(event);

    for (const campaign of rollingCampaigns) {
      const matchingEmployees = this.filterByTrigger(
        changes,
        campaign.rollingTriggerType,
        campaign.rollingTriggerConfig
      );

      for (const employee of matchingEmployees) {
        // Check if already assigned
        const existing = await this.assignmentService.findByEmployee(
          campaign.id,
          employee.id
        );

        if (!existing) {
          await this.assignmentService.createAssignment(campaign.id, employee.id);
          await this.notificationService.notifyEmployee(employee, campaign);
        }
      }
    }
  }

  private filterByTrigger(
    changes: EmployeeChange[],
    triggerType: string,
    config: RollingTriggerConfig
  ): Employee[] {
    switch (triggerType) {
      case 'new_hire':
        return changes.filter(c => c.type === 'created').map(c => c.employee);
      case 'role_change':
        return changes.filter(c =>
          c.type === 'updated' &&
          c.changedFields.includes('jobTitle')
        ).map(c => c.employee);
      case 'location_change':
        return changes.filter(c =>
          c.type === 'updated' &&
          c.changedFields.includes('locationId')
        ).map(c => c.employee);
      // ... other trigger types
    }
  }
}
```

---

### 2.6 Pattern Detection Enhancement

**Goal:** Detect repeat subjects, related cases, emerging patterns

#### Existing Integration Points

| Component | Location | Current State | Extension Needed |
|-----------|----------|---------------|------------------|
| `PersonCaseAssociation` | Prisma schema | Links persons to cases | Works as-is |
| `PersonPersonAssociation` | Prisma schema | Tracks relationships | Works as-is |
| `Subject` | Prisma schema | Named people in cases | Works as-is |
| `ConflictMatchingService` | `disclosures/services/` | Fuzzy name matching | Reuse for patterns |
| `Person` | Prisma schema | Foundation for pattern detection | Works as-is |

#### New Components Needed

```
modules/associations/
├── pattern-detection/
│   ├── pattern-detection.module.ts
│   ├── services/
│   │   ├── pattern-detection.service.ts   # Core orchestration
│   │   ├── repeat-subject.detector.ts     # Find repeat subjects
│   │   ├── case-cluster.detector.ts       # Group related cases
│   │   ├── trend-analyzer.service.ts      # Time-based analysis
│   │   └── pattern-alert.service.ts       # Generate alerts
│   ├── processors/
│   │   └── pattern-detection.processor.ts # BullMQ processor
│   └── dto/
│       └── pattern-alert.dto.ts
```

#### Database Changes

```prisma
model PatternAlert {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  patternType    String   @map("pattern_type")   // 'repeat_subject', 'cluster', 'trend', 'anomaly'
  severity       String                           // 'low', 'medium', 'high', 'critical'
  title          String
  description    String
  entityIds      String[] @map("entity_ids")     // Related case/person IDs
  metadata       Json?                            // Pattern-specific data
  status         String   @default("new")        // 'new', 'reviewed', 'dismissed', 'actioned'
  reviewedById   String?  @map("reviewed_by_id")
  reviewedAt     DateTime? @map("reviewed_at")
  reviewNotes    String?  @map("review_notes")
  createdAt      DateTime @default(now()) @map("created_at")

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([organizationId, patternType])
  @@index([organizationId, status])
  @@index([createdAt])
  @@map("pattern_alerts")
}
```

#### Detection Implementation

```typescript
// repeat-subject.detector.ts
@Injectable()
export class RepeatSubjectDetector {
  async detect(organizationId: string): Promise<PatternMatch[]> {
    // Find persons appearing in multiple cases
    const repeats = await this.prisma.$queryRaw`
      SELECT p.id as person_id, p.first_name, p.last_name,
             COUNT(DISTINCT pca.case_id) as case_count,
             ARRAY_AGG(DISTINCT pca.case_id) as case_ids
      FROM persons p
      JOIN person_case_associations pca ON p.id = pca.person_id
      WHERE p.organization_id = ${organizationId}
        AND pca.created_at > NOW() - INTERVAL '90 days'
      GROUP BY p.id
      HAVING COUNT(DISTINCT pca.case_id) >= 3
    `;

    return repeats.map(r => ({
      patternType: 'repeat_subject',
      severity: r.case_count >= 5 ? 'high' : 'medium',
      title: `Repeat subject: ${r.first_name} ${r.last_name}`,
      description: `This person appears in ${r.case_count} cases in the last 90 days`,
      entityIds: r.case_ids,
      metadata: { personId: r.person_id, caseCount: r.case_count }
    }));
  }
}

// Scheduled job
@Injectable()
export class PatternDetectionScheduler {
  @Cron('0 3 * * *')  // 3 AM daily
  async runDetection() {
    const orgs = await this.prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true }
    });

    for (const org of orgs) {
      await this.patternDetectionQueue.add('detect', {
        organizationId: org.id
      });
    }
  }
}
```

---

### 2.7 PWA (Progressive Web App)

**Goal:** Offline-capable mobile experience for investigators

#### Existing Integration Points

| Component | Location | How to Extend |
|-----------|----------|---------------|
| Next.js frontend | `apps/frontend/` | Add PWA manifest, service worker |
| API endpoints | REST + WebSocket | Add offline-first patterns |
| `NotificationGateway` | `notifications/` | Add web push |

#### Frontend Changes

```
apps/frontend/
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker
│   └── icons/                     # App icons (192x192, 512x512)
├── src/
│   └── lib/
│       ├── offline/
│       │   ├── sync-queue.ts      # Queue mutations when offline
│       │   ├── cache-strategy.ts  # Cache-first patterns
│       │   └── conflict-resolver.ts
│       └── push/
│           └── subscription.ts    # Web push subscription
```

#### Backend Changes

```
modules/notifications/
├── (existing files)
├── push/
│   ├── web-push.service.ts        # Web Push API
│   ├── subscription.service.ts    # Manage subscriptions
│   └── push.controller.ts         # Subscribe/unsubscribe endpoints
```

#### Database Changes

```prisma
model PushSubscription {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  userId         String   @map("user_id")
  endpoint       String
  p256dh         String                           // Public key
  auth           String                           // Auth secret
  userAgent      String?  @map("user_agent")
  deviceType     String?  @map("device_type")    // 'mobile', 'desktop', 'tablet'
  createdAt      DateTime @default(now()) @map("created_at")
  lastUsedAt     DateTime? @map("last_used_at")

  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, endpoint])
  @@index([organizationId])
  @@index([userId])
  @@map("push_subscriptions")
}
```

---

### 2.8 Fact Tables for Analytics

**Goal:** Pre-aggregated data for fast dashboard queries

#### Existing Integration Points

| Component | Location | How to Extend |
|-----------|----------|---------------|
| `DashboardModule` | `analytics/dashboard/` | Query fact tables |
| `WidgetDataService` | `analytics/dashboard/` | Use fact queries |
| `WidgetCaseDataService` | `analytics/dashboard/services/` | Replace with fact queries |
| `ScheduledRefreshService` | `analytics/dashboard/` | Trigger fact updates |
| Event listeners | Various | Update facts incrementally |

#### New Components Needed

```
modules/analytics/
├── (existing files)
├── fact-tables/
│   ├── fact-tables.module.ts
│   ├── services/
│   │   ├── case-fact.service.ts           # Case metrics
│   │   ├── campaign-fact.service.ts       # Campaign metrics
│   │   ├── investigation-fact.service.ts  # Investigation metrics
│   │   └── fact-refresh.service.ts        # Refresh orchestration
│   ├── processors/
│   │   └── fact-update.processor.ts       # BullMQ processor
│   └── schedulers/
│       └── fact-refresh.scheduler.ts      # Nightly refresh
```

#### Database Changes

```prisma
// Daily case metrics fact table
model FactCaseDaily {
  id                  String   @id @default(uuid())
  organizationId      String   @map("organization_id")
  date                DateTime @db.Date
  categoryId          String?  @map("category_id")
  businessUnitId      String?  @map("business_unit_id")
  locationId          String?  @map("location_id")
  sourceChannel       String?  @map("source_channel")

  // Measures
  casesCreated        Int      @default(0) @map("cases_created")
  casesResolved       Int      @default(0) @map("cases_resolved")
  casesClosed         Int      @default(0) @map("cases_closed")
  casesEscalated      Int      @default(0) @map("cases_escalated")
  avgResolutionDays   Float?   @map("avg_resolution_days")
  slaBreaches         Int      @default(0) @map("sla_breaches")

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  organization        Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, date, categoryId, businessUnitId, locationId, sourceChannel])
  @@index([organizationId, date])
  @@map("fact_case_daily")
}

model FactCampaignDaily {
  id                  String   @id @default(uuid())
  organizationId      String   @map("organization_id")
  campaignId          String   @map("campaign_id")
  date                DateTime @db.Date

  // Measures
  assigned            Int      @default(0)
  completed           Int      @default(0)
  overdue             Int      @default(0)
  inProgress          Int      @default(0) @map("in_progress")
  responseRate        Float?   @map("response_rate")
  avgCompletionDays   Float?   @map("avg_completion_days")

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  organization        Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  campaign            Campaign     @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@unique([organizationId, campaignId, date])
  @@index([organizationId, date])
  @@map("fact_campaign_daily")
}
```

#### Hybrid Update Strategy

```typescript
// Incremental updates via events
@OnEvent('case.created')
async onCaseCreated(event: CaseCreatedEvent) {
  await this.factUpdateQueue.add('increment', {
    organizationId: event.organizationId,
    date: new Date().toISOString().split('T')[0],
    metric: 'casesCreated',
    dimensions: {
      categoryId: event.categoryId,
      businessUnitId: event.businessUnitId,
      sourceChannel: event.sourceChannel,
    }
  });
}

// Nightly full reconciliation
@Cron('0 2 * * *')  // 2 AM daily
async nightlyReconciliation() {
  const orgs = await this.prisma.organization.findMany({
    where: { isActive: true }
  });

  for (const org of orgs) {
    // Recalculate yesterday's facts from source data
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await this.factRefreshService.refreshDate(org.id, yesterday);
  }
}
```

---

## 3. Suggested Build Order

Based on dependencies and foundational requirements:

### Phase 1: Foundation (Weeks 1-3)

**1a. Rules Engine** - Many features depend on configurable automation
- `RuleDefinition` and `RuleExecutionLog` models
- `RulesModule` with parser, evaluator, executor
- Event listeners for `case.*`, `workflow.*`
- Integration with `WorkflowEngineService.validateGates()`

**1b. Fact Tables** - Independent, can parallel with rules
- Fact table schemas
- `FactTablesModule` with refresh services
- Event-based incremental updates
- Nightly reconciliation job

**Rationale:** Rules engine enables automation backbone. Fact tables are isolated with clear boundaries.

### Phase 2: Communication (Weeks 4-5)

**2. Anonymous Relay Enhancement**
- Email tracking fields on `CaseMessage`
- `RelayNotificationService`
- Email templates for relay messages
- Event listeners for message flow

**Rationale:** Small, well-contained enhancement with clear integration points. Builds on existing `MessageRelayService`.

### Phase 3: Intelligence (Weeks 6-9)

**3a. pgvector RAG**
- pgvector extension setup
- `DocumentEmbedding` model
- `EmbeddingService` for generation
- `VectorStoreService` for search
- `HybridSearchService` combining keyword + semantic

**3b. Employee Chatbot** (depends on 3a)
- `EmployeeChatbotAgent`
- Employee-specific skills (policy search, status check)
- Integration with employee portal
- RAG-powered policy answering

**Rationale:** RAG must exist before chatbot can answer policy questions.

### Phase 4: Automation (Weeks 10-12)

**4a. Rolling Campaigns**
- Campaign model extensions
- `RollingCampaignService`
- HRIS trigger listener
- Assignment automation

**4b. Pattern Detection**
- `PatternAlert` model
- Detector services (repeat subject, clusters, trends)
- BullMQ processor for background detection
- Alert notification integration

**Rationale:** Both leverage rules engine maturity. Rolling campaigns builds on existing campaign infrastructure.

### Phase 5: Experience (Weeks 13-14)

**5. PWA**
- Manifest and service worker
- Offline sync queue
- Web push subscriptions
- Push notification backend

**Rationale:** Frontend-focused, can be done after API stability.

### Dependency Graph

```
Week 1-3:  [Rules Engine] ─────────────────┐
           [Fact Tables]  ─────────────────┤ (parallel)
                                           │
Week 4-5:  [Anonymous Relay] ──────────────┤
                                           │
Week 6-9:  [pgvector RAG] ─────────────────┤
              │                            │
              └──▶ [Employee Chatbot] ─────┤
                                           │
Week 10-12: [Rolling Campaigns] ───────────┤ (depends on rules)
            [Pattern Detection] ───────────┤ (depends on rules)
                                           │
Week 13-14: [PWA] ─────────────────────────┘ (independent)
```

---

## 4. New Events Summary

| Event | Emitter | Consumers | Phase |
|-------|---------|-----------|-------|
| `rule.evaluated` | RulesModule | AuditModule | 1 |
| `rule.action.executed` | RulesModule | AuditModule, NotificationsModule | 1 |
| `case.message.received` | MessagingModule | NotificationsModule | 2 |
| `case.message.sent` | MessagingModule | NotificationsModule | 2 |
| `embedding.generated` | SearchModule | AnalyticsModule | 3 |
| `pattern.detected` | AssociationsModule | NotificationsModule | 4 |
| `campaign.rolling.assigned` | CampaignsModule | NotificationsModule | 4 |
| `fact.updated` | AnalyticsModule | DashboardModule | 1 |

---

## 5. Migration Summary

### New Tables

| Table | Purpose | Phase |
|-------|---------|-------|
| `rule_definitions` | Business rule configurations | 1 |
| `rule_execution_logs` | Rule execution audit | 1 |
| `document_embeddings` | Vector embeddings for RAG | 3 |
| `pattern_alerts` | Detected pattern alerts | 4 |
| `push_subscriptions` | Web push subscriptions | 5 |
| `fact_case_daily` | Pre-aggregated case metrics | 1 |
| `fact_campaign_daily` | Pre-aggregated campaign metrics | 1 |

### Existing Table Modifications

| Table | Changes | Phase |
|-------|---------|-------|
| `case_messages` | Add `emailSentAt`, `emailDeliveredAt`, `emailBouncedAt`, `notificationId` | 2 |
| `campaigns` | Add `isRolling`, `rollingTriggerType`, `rollingTriggerConfig`, `rollingLastProcessed` | 4 |
| `organizations` | Add relation to fact tables | 1 |

### Database Extensions

| Extension | Purpose | Phase |
|-----------|---------|-------|
| `pgvector` | Vector similarity search | 3 |

---

## 6. API Changes Summary

### New REST Endpoints

| Endpoint | Method | Purpose | Phase |
|----------|--------|---------|-------|
| `/api/v1/rules` | GET, POST | List/create rules | 1 |
| `/api/v1/rules/:id` | GET, PATCH, DELETE | Rule CRUD | 1 |
| `/api/v1/rules/:id/test` | POST | Test rule against sample | 1 |
| `/api/v1/rules/:id/logs` | GET | Rule execution history | 1 |
| `/api/v1/search/semantic` | POST | Semantic search | 3 |
| `/api/v1/patterns` | GET | List pattern alerts | 4 |
| `/api/v1/patterns/:id` | GET | Get pattern detail | 4 |
| `/api/v1/patterns/:id/review` | POST | Review/action pattern | 4 |
| `/api/v1/campaigns/:id/rolling` | GET | Rolling campaign status | 4 |
| `/api/v1/push/subscribe` | POST | Subscribe to push | 5 |
| `/api/v1/push/unsubscribe` | POST | Unsubscribe | 5 |

### New WebSocket Events (on `/ai` namespace)

| Event | Direction | Purpose | Phase |
|-------|-----------|---------|-------|
| `chatbot_intent` | Server→Client | Intent classification | 3 |
| `policy_result` | Server→Client | RAG search result | 3 |

### New WebSocket Events (on `/notifications` namespace)

| Event | Direction | Purpose | Phase |
|-------|-----------|---------|-------|
| `pattern_alert` | Server→Client | Real-time pattern alert | 4 |

---

## 7. Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| pgvector performance with large doc sets | HIGH | MEDIUM | HNSW index tuning, chunking strategy, caching |
| Rules engine DSL complexity | MEDIUM | MEDIUM | Start simple, iterate; JSON-based conditions |
| Fact table staleness | MEDIUM | LOW | Hybrid approach (event + nightly reconciliation) |
| PWA offline conflicts | MEDIUM | MEDIUM | Last-write-wins with conflict UI, user notification |
| Pattern detection false positives | LOW | MEDIUM | Configurable thresholds, human review required |
| Embedding API rate limits | MEDIUM | LOW | Batch processing, queue-based generation |

---

## 8. Quality Gate Checklist

- [x] Integration points identified with existing module names
- [x] New vs modified components explicit
- [x] Build order considers existing dependencies
- [x] Prisma schema changes outlined
- [x] Event/queue additions specified
- [x] API changes documented
- [x] Migration strategy clear

---

## Sources

- Direct codebase analysis: `apps/backend/src/modules/` (42 modules)
- Prisma schema: `apps/backend/prisma/schema.prisma` (127+ models)
- Event configuration: `modules/events/events.module.ts`
- AI module: `modules/ai/*.ts` (55+ files)
- Workflow module: `modules/workflow/*.ts` (30+ files)
- Campaigns module: `modules/campaigns/*.ts` (50+ files)

**Confidence Level:** HIGH - Based on direct code review of existing implementation.
