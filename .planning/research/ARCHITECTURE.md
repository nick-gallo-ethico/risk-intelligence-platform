# Architecture Patterns

**Domain:** Enterprise Compliance SaaS - Multi-tenant workflow automation with AI integration
**Researched:** 2026-02-02
**Focus:** Adding AI integration layer, multi-provider SSO, unified notifications, cross-module task aggregation, event-driven workflows to existing NestJS/PostgreSQL RLS architecture

---

## Executive Summary

This research focuses on architecture patterns for the components being added to an **existing platform** that already has:
- NestJS modular backend with TypeScript
- PostgreSQL with Row-Level Security (RLS) for multi-tenancy
- RIU (Risk Intelligence Unit) to Case pattern (immutable inputs to mutable work containers)
- Activity logging with natural language descriptions
- Prisma ORM

The platform needs to add five architectural capabilities:
1. **AI Integration Layer** - Scoped agents, skills registry, action framework
2. **Multi-Provider SSO** - Azure AD, Google, SAML with JIT provisioning
3. **Unified Notification System** - Event-driven, multi-channel delivery
4. **Cross-Module Task Aggregation** - "My Work" unified queue
5. **Event-Driven Workflows** - Shared workflow engine across modules

---

## Recommended Architecture

### Overall System Architecture

```
                                 ┌──────────────────────────────────────┐
                                 │           FRONTEND LAYER              │
                                 │  Next.js 14+ / shadcn/ui / Tailwind   │
                                 │                                        │
                                 │  ┌────────────┐  ┌────────────────┐   │
                                 │  │ AI Drawer  │  │ "My Work" View │   │
                                 │  │ (Slide-out)│  │  (Aggregated)  │   │
                                 │  └────────────┘  └────────────────┘   │
                                 └──────────────────┬─────────────────────┘
                                                    │
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  JWT Auth    │  │ Rate Limiter │  │ Tenant       │  │ Request      │       │
│  │  Guard       │  │ (Redis)      │  │ Middleware   │  │ Logging      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
└────────────────────────────────────────┬───────────────────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
         ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
         │  DOMAIN MODULES  │  │   AI MODULE      │  │ WORKFLOW ENGINE  │
         │                  │  │                  │  │                  │
         │ • Cases          │  │ • Context Loader │  │ • State Machine  │
         │ • Investigations │  │ • Skills Registry│  │ • Assignment     │
         │ • Disclosures    │  │ • Action Catalog │  │ • SLA Tracking   │
         │ • Policies       │  │ • Model Router   │  │ • Escalation     │
         │ • Campaigns      │  │ • Scoped Agents  │  │                  │
         └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
                  │                     │                     │
                  └─────────────────────┼─────────────────────┘
                                        │
                                        ▼
         ┌──────────────────────────────────────────────────────────────┐
         │                        EVENT BUS                             │
         │              @nestjs/event-emitter + BullMQ                  │
         │                                                              │
         │  Events: case.created, investigation.assigned, sla.breached  │
         └────────────────────────────┬─────────────────────────────────┘
                                      │
                  ┌───────────────────┼───────────────────┐
                  │                   │                   │
                  ▼                   ▼                   ▼
       ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
       │ NOTIFICATION SVC │ │  TASK AGG. SVC   │ │  AUDIT SVC       │
       │                  │ │                  │ │                  │
       │ • Email/In-app   │ │ • "My Work" view │ │ • AUDIT_LOG      │
       │ • User prefs     │ │ • Due dates      │ │ • Field-level    │
       │ • Digest mode    │ │ • Priority       │ │ • Immutable      │
       └──────────────────┘ └──────────────────┘ └──────────────────┘
                                      │
                                      ▼
         ┌──────────────────────────────────────────────────────────────┐
         │                     DATA LAYER                               │
         │                                                              │
         │  PostgreSQL 15+        Redis 7           Azure Blob         │
         │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
         │  │ + RLS        │   │ + BullMQ     │   │ + Per-tenant │     │
         │  │ + pgvector   │   │ + Sessions   │   │   containers │     │
         │  │ + Full-text  │   │ + Cache      │   │              │     │
         │  └──────────────┘   └──────────────┘   └──────────────┘     │
         └──────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### Component 1: AI Integration Layer

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **ContextLoaderService** | Loads hierarchical context (platform -> org -> team -> user -> entity) for AI requests | Prisma, SkillsRegistry, ActionCatalog |
| **SkillsRegistryService** | Stores and retrieves reusable AI "skills" (like slash commands) | Prisma, permission guards |
| **ActionCatalogService** | Static registry of AI-executable actions, filtered by permissions | Domain modules (register handlers) |
| **ModelRouterService** | Selects appropriate AI model (Haiku/Sonnet/Opus) based on task type and plan | AI providers |
| **AgentSelectorService** | Picks scoped agent (Investigation, Case, Compliance Manager, etc.) based on view | ContextLoader, SkillsRegistry |
| **AIProviderManager** | Factory for Claude/Azure OpenAI/self-hosted providers | External APIs |

**Data Flow:**
```
User initiates AI request
         │
         ▼
AgentSelectorService.selectAgent(viewType, entityType)
         │
         ▼
ContextLoaderService.loadContextHierarchy(org, user, team, entity)
         │
         ▼
ActionCatalogService.getAvailableActions(permissions, features, entityType)
         │
         ▼
ModelRouterService.selectModel(taskType, plan, context)
         │
         ▼
AIProviderManager.getProvider(selectedModel).complete(request)
         │
         ▼
Response with suggestedActions[] or executed action result
```

### Component 2: Multi-Provider SSO

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **AuthModule** | Coordinates authentication strategies | Passport.js strategies |
| **AzureADStrategy** | Microsoft SSO via OIDC | Azure AD endpoints |
| **GoogleStrategy** | Google OAuth 2.0 | Google OAuth endpoints |
| **SAMLStrategy** | SAML 2.0 for enterprise IdPs | IdP metadata endpoints |
| **TenantService** | Resolves tenant from email domain for JIT provisioning | Prisma (TenantDomain table) |
| **JwtService** | Token generation, validation, refresh | Redis (revocation list) |

**Data Flow:**
```
User clicks SSO login
         │
         ▼
Passport redirects to IdP (Azure AD, Google, etc.)
         │
         ▼
IdP authenticates, returns callback with code/token
         │
         ▼
Strategy validates, extracts profile
         │
         ▼
TenantService.findByEmailDomain(email) -> tenant resolution
         │
         ▼
AuthService.findOrCreateSSOUser() -> JIT provisioning
         │
         ▼
JwtService.generateTokens(user) -> access (15m) + refresh (7d)
         │
         ▼
Set HTTP-only cookies, redirect to app
```

### Component 3: Unified Notification System

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **NotificationModule** | Event consumers, preference management | Event bus, Prisma |
| **NotificationPreferenceService** | User-level channel preferences per event type | Prisma |
| **EmailAdapter** | SendGrid/SES delivery | External email APIs |
| **InAppAdapter** | WebSocket push notifications | Socket.io server |
| **DigestService** | Aggregates notifications for daily/weekly digest | BullMQ scheduled jobs |
| **TemplateService** | Renders notification templates with entity context | Prisma (entity data) |

**Data Flow:**
```
Domain module emits event (case.assigned)
         │
         ▼
Event bus routes to NotificationModule listener
         │
         ▼
NotificationPreferenceService.getUserPreferences(userId, eventType)
         │
         ▼
Filter by preferences (in-app, email, both, none)
         │
         ▼
For each enabled channel:
  ├── Email: Queue to BullMQ notifications queue
  └── In-app: Push via Socket.io + persist to notifications table
         │
         ▼
DigestService (cron): Aggregate queued items, send digest
```

### Component 4: Cross-Module Task Aggregation ("My Work")

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **TaskAggregationService** | Queries pending items across modules | Domain modules via typed queries |
| **TaskSource** interface | Contract for modules to expose their task items | Implemented by Cases, Investigations, etc. |
| **PriorityCalculator** | Scores tasks by SLA urgency, severity, age | Business rules configuration |
| **MyWorkController** | API endpoint for unified task view | TaskAggregationService |

**Design Pattern: Polymorphic Task Query**

Each domain module implements a `TaskSource` interface:

```typescript
interface TaskSource {
  getTasksForUser(userId: string, orgId: string): Promise<TaskItem[]>;
}

interface TaskItem {
  id: string;
  entityType: 'case' | 'investigation' | 'disclosure_review' | 'attestation' | 'approval';
  entityId: string;
  title: string;
  description: string;
  dueDate?: Date;
  slaStatus: 'ok' | 'warning' | 'breached';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  url: string; // Deep link to entity
}
```

**Data Flow:**
```
User loads "My Work" view
         │
         ▼
TaskAggregationService.getTasksForUser(userId, orgId)
         │
         ├── CasesModule.getTasksForUser() -> assigned cases
         ├── InvestigationsModule.getTasksForUser() -> assigned investigations
         ├── DisclosuresModule.getTasksForUser() -> disclosures pending review
         ├── WorkflowModule.getTasksForUser() -> pending approvals
         └── CampaignModule.getTasksForUser() -> overdue attestations
         │
         ▼
Merge all TaskItem[] arrays
         │
         ▼
PriorityCalculator.sortByPriority(tasks)
         │
         ▼
Return unified, sorted task list
```

### Component 5: Event-Driven Workflow Engine

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **WorkflowEngine** | Manages state machine transitions | Prisma, Event bus |
| **WorkflowDefinition** | Configuration for a workflow (steps, transitions, SLAs) | Stored in database per org |
| **WorkflowInstance** | Runtime state of a workflow on an entity | Prisma |
| **AssignmentService** | Auto-assignment based on rules (round robin, location, category) | Employee/User services |
| **SLATrackerService** | Monitors deadlines, triggers escalation events | BullMQ scheduled jobs |
| **EscalationService** | Executes escalation actions (reassign, notify, auto-approve) | NotificationService, AssignmentService |

**Data Flow:**
```
Entity created or status changed
         │
         ▼
WorkflowEngine.evaluateTransitions(entityType, entityId, newStatus)
         │
         ▼
Find applicable WorkflowDefinition for (org, entityType, category)
         │
         ▼
WorkflowInstance.currentStep -> evaluate conditions for next step
         │
         ├── Auto-assignment rule?
         │   └── AssignmentService.assign()
         │
         ├── SLA timer needed?
         │   └── SLATrackerService.createTimer(deadline)
         │
         └── Notification rule?
             └── Emit event for NotificationModule
         │
         ▼
Update WorkflowInstance.currentStep, record in AUDIT_LOG
```

---

## Patterns to Follow

### Pattern 1: Context Hierarchy for AI

**What:** Load AI context in layers (platform -> org -> team -> user -> entity) with override capability.

**When:** Every AI request that needs organizational or entity context.

**Why:** Enables organizations to customize AI behavior without code changes (like CLAUDE.md in Claude Code).

**Example:**
```typescript
// Context hierarchy stored in Organization table
const orgContext = await prisma.organization.findUnique({
  where: { id: organizationId },
  select: {
    aiContextDocument: true,  // Org's CONTEXT.md equivalent
    terminology: true,        // {"Employee": "Associate", "Case": "Matter"}
    styleGuide: true,         // "Use formal tone, 3 paragraphs max"
    businessRules: true,      // ["Retaliation cases always notify Legal"]
  },
});

// Build system prompt with hierarchy
const systemPrompt = `
${PLATFORM_CONTEXT}

## Organization Context
${orgContext.aiContextDocument}

## Terminology
${JSON.stringify(orgContext.terminology)}

## Style Guide
${orgContext.styleGuide}

## Business Rules
${orgContext.businessRules.join('\n')}

## Current Entity
${entitySummary}
`;
```

### Pattern 2: Action Catalog with Confirm Tiers

**What:** Static registry of AI-executable actions with risk-tiered confirmation.

**When:** AI needs to execute mutations, not just read data.

**Why:** Compliance data is consequential. AI assists, humans decide.

**Example:**
```typescript
// Action definition
const assignCaseAction: AIAction = {
  id: 'case.assign',
  label: 'Assign Case',
  module: 'cases',
  requiredPermissions: ['cases.assign'],
  confirmationLevel: 'single',  // One-click confirm
  isDestructive: false,
  isExternal: false,
  handler: 'caseService.assignCase',
};

// Runtime filtering
const availableActions = actionCatalog.getAvailableActions(
  user.permissions,
  org.enabledFeatures,
  'case',
  caseData,
);
// AI only sees actions user has permission to execute
```

### Pattern 3: Event-Driven Module Communication

**What:** Modules communicate via domain events, not direct service calls.

**When:** Cross-module side effects (case created -> notify assignee).

**Why:** Decoupling enables independent scaling and easier testing.

**Example:**
```typescript
// In CasesService
async createCase(dto: CreateCaseDto, userId: string, orgId: string) {
  const case = await this.prisma.case.create({ ... });

  // Emit event - don't call NotificationService directly
  this.eventEmitter.emit('case.created', {
    caseId: case.id,
    organizationId: orgId,
    assigneeId: case.assigneeId,
    severity: case.severity,
    category: case.categoryId,
  });

  return case;
}

// In NotificationModule - separate listener
@OnEvent('case.created')
async handleCaseCreated(payload: CaseCreatedEvent) {
  const preferences = await this.getPreferences(payload.assigneeId, 'case.created');
  if (preferences.email) {
    await this.queueEmail(payload);
  }
  if (preferences.inApp) {
    await this.pushInApp(payload);
  }
}
```

### Pattern 4: Polymorphic Task Sources

**What:** Each module implements a common TaskSource interface for "My Work" aggregation.

**When:** Building unified task views across modules.

**Why:** Enables adding new task sources without modifying the aggregator.

**Example:**
```typescript
// Each module registers as a task source
@Injectable()
export class CasesTaskSource implements TaskSource {
  async getTasksForUser(userId: string, orgId: string): Promise<TaskItem[]> {
    const cases = await this.prisma.case.findMany({
      where: {
        organizationId: orgId,
        assigneeId: userId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });

    return cases.map(c => ({
      id: `case:${c.id}`,
      entityType: 'case',
      entityId: c.id,
      title: c.title,
      dueDate: c.dueDate,
      slaStatus: this.calculateSlaStatus(c),
      priority: this.mapSeverity(c.severity),
      url: `/cases/${c.id}`,
    }));
  }
}

// Aggregator collects from all registered sources
@Injectable()
export class TaskAggregationService {
  constructor(
    @Inject('TASK_SOURCES') private sources: TaskSource[],
  ) {}

  async getTasksForUser(userId: string, orgId: string): Promise<TaskItem[]> {
    const taskArrays = await Promise.all(
      this.sources.map(s => s.getTasksForUser(userId, orgId))
    );
    return this.priorityCalculator.sort(taskArrays.flat());
  }
}
```

### Pattern 5: Workflow Engine with External State

**What:** Workflow engine operates on domain entities, doesn't maintain its own state.

**When:** Implementing approval workflows, case progression, campaign assignment.

**Why:** Keeps state with the entity it belongs to (DDD principle).

**Example:**
```typescript
// Workflow operates on entity, doesn't duplicate state
async advanceWorkflow(entityType: string, entityId: string, action: string) {
  const entity = await this.loadEntity(entityType, entityId);
  const workflow = await this.getWorkflowDefinition(entity);

  const currentStep = workflow.steps.find(s => s.id === entity.workflowStepId);
  const nextStep = currentStep.transitions.find(t => t.action === action)?.targetStep;

  if (nextStep) {
    // Update entity, not workflow instance
    await this.updateEntityStep(entityType, entityId, nextStep.id);

    // Execute step entry actions
    for (const entryAction of nextStep.entryActions) {
      await this.executeAction(entryAction, entity);
    }
  }
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic AI Service

**What:** Single AI service that handles all AI operations with giant switch statements.

**Why bad:** Becomes unmaintainable, hard to test, impossible to customize per context.

**Instead:** Use scoped agents with specialized context loading and skills.

### Anti-Pattern 2: Direct Cross-Module Service Calls

**What:** CasesService directly calls NotificationService, AnalyticsService, etc.

**Why bad:** Creates tight coupling, makes testing hard, prevents independent deployment.

**Instead:** Emit domain events, let interested modules subscribe.

### Anti-Pattern 3: Global AI Context

**What:** Loading all organization data into every AI context.

**Why bad:** Token waste, slower responses, potential data leakage across entity boundaries.

**Instead:** Use scoped agents that load only relevant context for the current view.

### Anti-Pattern 4: Synchronous Workflow Processing

**What:** Workflow transitions block the request until all side effects complete.

**Why bad:** Slow response times, cascading failures if notifications fail.

**Instead:** Queue side effects via BullMQ, return immediately after state update.

### Anti-Pattern 5: Hardcoded Assignment Rules

**What:** Assignment logic embedded in service code with if/else chains.

**Why bad:** Requires code changes for each client, not configurable.

**Instead:** Store assignment rules as data (WorkflowDefinition.assignmentRules), interpret at runtime.

### Anti-Pattern 6: Separate Activity Tables per Module

**What:** CaseActivity, DisclosureActivity, PolicyActivity tables with different schemas.

**Why bad:** Impossible to query "all activity by this user" without UNION ALL across tables.

**Instead:** Unified AUDIT_LOG table with entity_type discriminator.

---

## Build Order Implications

Based on component dependencies, recommended build order:

### Phase 1: Event Infrastructure (Foundation)

**Build:**
- Event bus setup (@nestjs/event-emitter)
- BullMQ queue infrastructure
- Unified AUDIT_LOG table and service

**Why first:** All other components depend on event-driven communication.

**Dependencies:** None

### Phase 2: Workflow Engine (Core Automation)

**Build:**
- WorkflowDefinition schema and CRUD
- WorkflowEngine state machine logic
- AssignmentService with pluggable rules
- SLA tracking and escalation

**Why second:** Cases, Disclosures, and Campaigns all need workflow automation.

**Dependencies:** Event bus (Phase 1)

### Phase 3: Multi-Provider SSO (Authentication)

**Build:**
- Passport.js strategies (Azure AD, Google, SAML)
- TenantService with domain verification
- JIT provisioning logic
- JWT token management with refresh rotation

**Why third:** AI features need authenticated users; can run in parallel with Phase 2.

**Dependencies:** None (independent)

### Phase 4: Unified Notification System

**Build:**
- NotificationPreference schema and service
- Email adapter (SendGrid)
- In-app adapter (Socket.io push)
- Digest aggregation service

**Why fourth:** Workflows trigger notifications; depends on event bus.

**Dependencies:** Event bus (Phase 1), Workflow engine (Phase 2) for SLA notifications

### Phase 5: Task Aggregation ("My Work")

**Build:**
- TaskSource interface
- Module implementations (Cases, Investigations, Disclosures)
- TaskAggregationService
- PriorityCalculator
- My Work API endpoint

**Why fifth:** Requires domain modules to expose TaskSource implementations.

**Dependencies:** Domain modules must implement TaskSource interface

### Phase 6: AI Integration Layer

**Build:**
- ContextLoaderService (hierarchy loading)
- SkillsRegistryService (platform + org + user skills)
- ActionCatalogService (action registration, filtering)
- ModelRouterService (Haiku/Sonnet/Opus selection)
- AgentSelectorService (scoped agents)
- AI Provider abstraction (Claude primary)

**Why last:** AI layer consumes context from all other components.

**Dependencies:**
- Workflow engine (for workflow-related actions)
- Notifications (for AI-triggered notifications)
- AUDIT_LOG (for action execution logging)
- Domain modules (for action handlers)

### Dependency Graph

```
Phase 1: Event Bus + AUDIT_LOG
    │
    ├──────────────────┐
    │                  │
    ▼                  │
Phase 2: Workflow      │
    │                  │
    │                  │
    ▼                  ▼
Phase 4: Notifications Phase 3: SSO (parallel)
    │
    ▼
Phase 5: Task Aggregation
    │
    ▼
Phase 6: AI Integration
```

---

## Scalability Considerations

| Concern | At 100 Users | At 10K Users | At 1M Users |
|---------|--------------|--------------|-------------|
| **AI Rate Limiting** | Per-org limits in application | Redis sliding window | Tiered quotas by plan + burst allowance |
| **Event Processing** | In-process EventEmitter | BullMQ with Redis | Kafka partitioned by org_id |
| **Task Aggregation** | Single query per source | Cached per-user (5 min TTL) | Materialized view + incremental refresh |
| **Workflow SLA Checks** | Cron job every minute | BullMQ delayed jobs | Partitioned by org, distributed workers |
| **Notification Delivery** | Direct send | Queue with retry | Regional email services + failover |
| **Context Loading** | Load on demand | Cache org context (1 hour) | Pre-warm context on login |

---

## Sources

**HIGH Confidence (Official Documentation):**
- Existing project specs: TECH-SPEC-AI-INTEGRATION.md, TECH-SPEC-AUTH-MULTITENANCY.md, WORKING-DECISIONS.md (versions 2.0-3.0)
- Existing architecture: docs/ARCHITECTURE.md, 00-PLATFORM/01-PLATFORM-VISION.md

**MEDIUM Confidence (Industry Patterns):**
- [SaaS Multitenant Solution Architecture - Microsoft](https://learn.microsoft.com/en-us/azure/architecture/guide/saas-multitenant-solution-architecture/)
- [Architecting agent solutions - Microsoft Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/architecture/overview)
- [Event-Driven Architecture in NestJS](https://dev.to/geampiere/event-driven-architecture-in-nestjs-ccj)
- [NestJS Workflow Engine](https://github.com/jescrich/nestjs-workflow)
- [The Copilot Pattern - Vamsi Talks Tech](https://www.vamsitalkstech.com/ai/the-copilot-pattern-an-architectural-approach-to-ai-assisted-software/)

**LOW Confidence (General Ecosystem):**
- Multi-tenant SaaS best practices 2026 (web search)
- AI copilot integration patterns (web search)

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| AI Integration Layer | HIGH | Detailed spec exists in TECH-SPEC-AI-INTEGRATION.md v3.0 with code examples |
| Multi-Provider SSO | HIGH | Full implementation guide in TECH-SPEC-AUTH-MULTITENANCY.md |
| Notification System | MEDIUM | Architecture decided in WORKING-DECISIONS.md (D.3), implementation details to be defined |
| Task Aggregation | MEDIUM | Pattern clear, no existing spec - based on standard polymorphic query patterns |
| Workflow Engine | HIGH | Detailed decisions in WORKING-DECISIONS.md (G.1-G.5) |
| Build Order | MEDIUM | Based on dependency analysis, may need adjustment during implementation |

---

## Open Questions for Phase-Specific Research

1. **AI Skills Marketplace:** How should community-shared skills be curated, versioned, and installed?
2. **Cross-Tenant AI:** How do operators (Ethico staff) interact with AI across client tenants?
3. **Workflow Versioning:** When workflow definitions change, how do in-progress instances migrate?
4. **Task Aggregation Performance:** Should "My Work" use materialized views or live queries at scale?
5. **Notification Localization:** How to template notifications for multi-language support?

---

*End of Architecture Research*
