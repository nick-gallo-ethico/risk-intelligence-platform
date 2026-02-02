# Phase 1: Foundation Infrastructure - Research

**Researched:** 2026-02-02
**Domain:** Event-driven architecture, job queues, audit logging, workflow engine, search infrastructure, form engine, file storage
**Confidence:** HIGH

## Summary

Phase 1 establishes the platform's nervous system - foundational infrastructure that all subsequent modules depend on. This research covers nine interconnected subsystems: event bus, job queues, audit logging, workflow engine, SLA tracking, assignment rules, search infrastructure, form/schema engine, reporting engine, and file storage.

The NestJS ecosystem provides mature, well-integrated solutions for all components. The key finding is that **everything should be event-driven** - the event bus ties all components together, enabling loose coupling between modules while maintaining comprehensive audit trails.

**Primary recommendation:** Use @nestjs/event-emitter for in-process events (synchronous within request), BullMQ for background jobs (asynchronous, durable), and a unified AUDIT_LOG service that subscribes to both.

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/event-emitter | ^3.0.1 | In-process event bus | Official NestJS module, built on eventemitter2 |
| @nestjs/bullmq | ^11.0.4 | Job queue integration | Official NestJS BullMQ wrapper with decorators |
| bullmq | ^5.x | Redis-backed job queue | Modern Bull successor, TypeScript native |
| @nestjs/elasticsearch | ^11.1.0 | Search integration | Official wrapper for @elastic/elasticsearch |
| @elastic/elasticsearch | ^9.x | Elasticsearch client | Official Elastic client |
| @azure/storage-blob | ^12.x | Azure Blob Storage | Official Azure SDK for Node.js |
| class-validator | ^0.14.x | DTO validation | NestJS standard for request validation |
| class-transformer | ^0.5.x | DTO transformation | Companion to class-validator |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bull-board | ^6.x | Queue monitoring UI | Admin dashboard for job visibility |
| node-cron | ^3.x | Scheduled jobs | SLA check scheduling, reminder triggers |
| ioredis | ^5.x | Redis client | BullMQ dependency, also for caching |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BullMQ | Agenda.js | Agenda uses MongoDB; BullMQ better for Redis-first stack |
| BullMQ | pg-boss | pg-boss uses PostgreSQL; BullMQ has richer features, better NestJS integration |
| @nestjs/event-emitter | RxJS Subjects | RxJS more complex; event-emitter simpler for domain events |
| Elasticsearch | PostgreSQL FTS | ES better for complex queries, faceting, per-tenant indices |
| Azure Blob | S3 | Azure Blob native to Azure stack; S3 requires additional Azure-AWS bridging |

**Installation:**
```bash
npm install @nestjs/event-emitter @nestjs/bullmq bullmq ioredis
npm install @nestjs/elasticsearch @elastic/elasticsearch
npm install @azure/storage-blob @azure/identity
npm install node-cron @types/node-cron
npm install bull-board @bull-board/express @bull-board/api
npm install class-validator class-transformer
```

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/
├── modules/
│   ├── events/                    # Event bus setup
│   │   ├── events.module.ts
│   │   ├── events/                # Event definitions
│   │   │   ├── case-created.event.ts
│   │   │   ├── workflow-step-completed.event.ts
│   │   │   └── index.ts
│   │   └── handlers/              # Cross-cutting handlers
│   │       └── audit-log.handler.ts
│   ├── jobs/                      # Background job infrastructure
│   │   ├── jobs.module.ts
│   │   ├── queues/                # Queue definitions
│   │   │   ├── ai.queue.ts
│   │   │   ├── email.queue.ts
│   │   │   └── indexing.queue.ts
│   │   ├── processors/            # Job processors
│   │   │   ├── ai.processor.ts
│   │   │   ├── email.processor.ts
│   │   │   └── indexing.processor.ts
│   │   └── admin/                 # Bull Board admin
│   │       └── bull-board.controller.ts
│   ├── audit/                     # Audit log service
│   │   ├── audit.module.ts
│   │   ├── audit.service.ts
│   │   ├── audit-log.entity.ts    # Prisma model wrapper
│   │   └── decorators/
│   │       └── auditable.decorator.ts
│   ├── workflow/                  # Workflow engine (existing spec)
│   │   ├── workflow.module.ts
│   │   ├── engine/
│   │   │   ├── workflow-engine.service.ts
│   │   │   ├── step-executor.service.ts
│   │   │   └── assignee-resolver.service.ts
│   │   ├── sla/
│   │   │   ├── sla-tracker.service.ts
│   │   │   └── sla-scheduler.service.ts
│   │   └── assignment/
│   │       ├── assignment-rules.service.ts
│   │       └── strategies/
│   │           ├── round-robin.strategy.ts
│   │           ├── least-loaded.strategy.ts
│   │           └── geographic.strategy.ts
│   ├── search/                    # Elasticsearch integration
│   │   ├── search.module.ts
│   │   ├── search.service.ts
│   │   ├── indexing/
│   │   │   ├── indexing.service.ts
│   │   │   └── index-mappings/
│   │   │       ├── case.mapping.ts
│   │   │       └── policy.mapping.ts
│   │   └── query/
│   │       ├── query-builder.service.ts
│   │       └── permission-filter.service.ts
│   ├── forms/                     # Dynamic form engine
│   │   ├── forms.module.ts
│   │   ├── form-schema.service.ts
│   │   ├── form-validation.service.ts
│   │   └── form-renderer.dto.ts
│   ├── reporting/                 # Reporting engine
│   │   ├── reporting.module.ts
│   │   ├── query-builder.service.ts
│   │   ├── export.service.ts
│   │   └── templates/
│   │       └── report-template.entity.ts
│   └── storage/                   # File storage
│       ├── storage.module.ts
│       ├── storage.service.ts
│       ├── providers/
│       │   └── azure-blob.provider.ts
│       └── document-processing.service.ts
└── common/
    ├── interceptors/
    │   └── audit.interceptor.ts
    └── decorators/
        └── tenant-context.decorator.ts
```

### Pattern 1: Event-Driven Architecture

**What:** All domain operations emit events; interested modules subscribe without tight coupling.

**When to use:** Any state change that other modules might care about.

**Example:**
```typescript
// Source: NestJS Events documentation pattern
// apps/backend/src/modules/cases/case.service.ts

import { EventEmitter2 } from '@nestjs/event-emitter';
import { CaseCreatedEvent } from '../events/events/case-created.event';

@Injectable()
export class CaseService {
  constructor(
    private eventEmitter: EventEmitter2,
    private prisma: PrismaService,
  ) {}

  async createCase(dto: CreateCaseDto, userId: string, orgId: string): Promise<Case> {
    const caseEntity = await this.prisma.case.create({
      data: {
        ...dto,
        organizationId: orgId,
        createdById: userId,
      },
    });

    // Emit event - audit log, search indexing, notifications all subscribe
    this.eventEmitter.emit(
      'case.created',
      new CaseCreatedEvent({
        caseId: caseEntity.id,
        organizationId: orgId,
        actorUserId: userId,
        category: caseEntity.categoryId,
        severity: caseEntity.severity,
      }),
    );

    return caseEntity;
  }
}
```

### Pattern 2: BullMQ Job with Retry Configuration

**What:** Background jobs with type-specific retry policies and dead-letter handling.

**When to use:** Any operation that shouldn't block the request (AI calls, emails, indexing).

**Example:**
```typescript
// Source: BullMQ documentation + NestJS BullMQ patterns
// apps/backend/src/modules/jobs/queues/ai.queue.ts

import { BullModule } from '@nestjs/bullmq';

export const AI_QUEUE_NAME = 'ai-processing';

export const AiQueueModule = BullModule.registerQueue({
  name: AI_QUEUE_NAME,
  defaultJobOptions: {
    attempts: 5,  // AI calls get more retries
    backoff: {
      type: 'exponential',
      delay: 2000,  // Start at 2s, then 4s, 8s, 16s, 32s
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 60 * 60,  // 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 60 * 60,  // 7 days for investigation
    },
  },
});

// apps/backend/src/modules/jobs/processors/ai.processor.ts

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor(AI_QUEUE_NAME, {
  concurrency: 5,  // Parallel AI calls per worker
})
export class AiProcessor extends WorkerHost {
  constructor(
    private aiService: AiService,
    private logger: Logger,
  ) {
    super();
  }

  async process(job: Job<AiJobData>): Promise<AiJobResult> {
    switch (job.name) {
      case 'generate-summary':
        return this.generateSummary(job.data);
      case 'translate':
        return this.translate(job.data);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`AI job ${job.id} failed after ${job.attemptsMade} attempts`, error);
    // Dead letter queue is automatic - job stays in "failed" state
  }
}
```

### Pattern 3: Unified Audit Log Service

**What:** Single service that captures all mutations with natural language descriptions.

**When to use:** Every state change across the platform.

**Example:**
```typescript
// apps/backend/src/modules/audit/audit.service.ts

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  @OnEvent('case.created')
  async handleCaseCreated(event: CaseCreatedEvent) {
    await this.log({
      entityType: 'CASE',
      entityId: event.caseId,
      organizationId: event.organizationId,
      action: 'created',
      actionCategory: 'CREATE',
      actionDescription: await this.buildDescription('case.created', event),
      actorUserId: event.actorUserId,
      actorType: 'USER',
      context: event,  // Full event for AI context
    });
  }

  @OnEvent('case.assigned')
  async handleCaseAssigned(event: CaseAssignedEvent) {
    await this.log({
      entityType: 'CASE',
      entityId: event.caseId,
      organizationId: event.organizationId,
      action: 'assigned',
      actionCategory: 'UPDATE',
      actionDescription: await this.buildDescription('case.assigned', event),
      actorUserId: event.actorUserId,
      actorType: 'USER',
      changes: {
        assignedTo: {
          old: event.previousAssigneeId,
          new: event.newAssigneeId,
        },
      },
      context: event,
    });
  }

  private async buildDescription(eventType: string, event: any): Promise<string> {
    // Fetch user names for natural language description
    const actor = await this.prisma.user.findUnique({
      where: { id: event.actorUserId },
      select: { firstName: true, lastName: true },
    });

    switch (eventType) {
      case 'case.created':
        return `${actor.firstName} ${actor.lastName} created a new case`;
      case 'case.assigned':
        const assignee = await this.prisma.user.findUnique({
          where: { id: event.newAssigneeId },
          select: { firstName: true, lastName: true },
        });
        return `${actor.firstName} ${actor.lastName} assigned the case to ${assignee.firstName} ${assignee.lastName}`;
      // ... more cases
    }
  }

  private async log(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        ...entry,
        ipAddress: this.requestContext.ipAddress,
        userAgent: this.requestContext.userAgent,
        requestId: this.requestContext.requestId,
      },
    });
  }
}
```

### Pattern 4: Per-Tenant Elasticsearch Indices

**What:** Separate indices per tenant for security isolation and performance.

**When to use:** All searchable entities.

**Example:**
```typescript
// apps/backend/src/modules/search/indexing/indexing.service.ts

import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class IndexingService {
  constructor(
    private esService: ElasticsearchService,
    @InjectQueue('indexing') private indexingQueue: Queue,
  ) {}

  getIndexName(organizationId: string, entityType: string): string {
    return `org_${organizationId}_${entityType}`.toLowerCase();
  }

  @OnEvent('case.created')
  async handleCaseCreated(event: CaseCreatedEvent) {
    // Queue for async indexing (eventual consistency)
    await this.indexingQueue.add('index-entity', {
      entityType: 'case',
      entityId: event.caseId,
      organizationId: event.organizationId,
      operation: 'create',
    });
  }

  async indexCase(caseId: string, orgId: string): Promise<void> {
    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        category: true,
        assignedTo: true,
        rius: { select: { details: true, aiSummary: true } },
      },
    });

    await this.esService.index({
      index: this.getIndexName(orgId, 'cases'),
      id: caseId,
      body: {
        caseNumber: caseData.caseNumber,
        category: caseData.category.name,
        severity: caseData.severity,
        status: caseData.status,
        assignedTo: caseData.assignedTo?.email,
        description: caseData.rius.map(r => r.details).join(' '),
        aiSummary: caseData.rius[0]?.aiSummary,
        createdAt: caseData.createdAt,
        // Denormalized for fast filtering
        businessUnitId: caseData.businessUnitId,
        locationId: caseData.locationId,
      },
    });
  }
}
```

### Pattern 5: JSON Schema Form Engine

**What:** Dynamic forms defined by JSON Schema, validated at runtime.

**When to use:** Intake forms, disclosure forms, workflow task forms.

**Example:**
```typescript
// apps/backend/src/modules/forms/form-schema.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

@Injectable()
export class FormSchemaService {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, coerceTypes: true });
    addFormats(this.ajv);
  }

  async validateSubmission(
    formDefinitionId: string,
    submission: Record<string, unknown>,
  ): Promise<ValidationResult> {
    const formDef = await this.prisma.formDefinition.findUnique({
      where: { id: formDefinitionId },
    });

    const validate = this.ajv.compile(formDef.jsonSchema);
    const valid = validate(submission);

    if (!valid) {
      return {
        valid: false,
        errors: validate.errors.map(e => ({
          field: e.instancePath.replace('/', ''),
          message: e.message,
        })),
      };
    }

    // Additional business rule validation
    const businessErrors = await this.validateBusinessRules(formDef, submission);

    return {
      valid: businessErrors.length === 0,
      errors: businessErrors,
    };
  }
}
```

### Anti-Patterns to Avoid

- **Synchronous external calls in request:** Never call AI/email/external APIs synchronously. Always queue for background processing.

- **Direct database writes without events:** Every mutation should emit an event, even if no handlers exist yet. This enables future extension.

- **Global Redis keys without tenant prefix:** Always prefix cache keys with `org:{organizationId}:` to prevent cross-tenant data leakage.

- **Storing PII in audit log descriptions:** Anonymize or reference by ID; don't embed SSNs, addresses, etc. in action descriptions.

- **Blocking SLA checks in request path:** SLA calculations should run on schedule, not on every request.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job retry with backoff | Custom retry loops | BullMQ backoff config | Edge cases (jitter, max attempts, DLQ) are complex |
| Event bus | Custom pub/sub | @nestjs/event-emitter | Memory leaks, typing, wildcards all handled |
| Search indexing | Synchronous ES writes | Queue-based async indexing | ES can be slow; don't block requests |
| Form validation | Custom validation logic | Ajv + class-validator | JSON Schema is a standard; don't reinvent |
| Hash chain for audit | Custom crypto | Database sequence + periodic hash | Simpler and auditor-acceptable |
| Priority queues | Custom sorting | BullMQ priority option | Redis ZADD is already optimized |
| Rate limiting | Custom counters | bull-limiter or Redis INCR | Distributed rate limiting is hard |

**Key insight:** The NestJS ecosystem is mature. Every infrastructure component has a well-tested solution. Hand-rolling creates maintenance burden and security risks.

## Common Pitfalls

### Pitfall 1: Event Handler Exceptions Crashing Requests

**What goes wrong:** An exception in an event listener propagates up and fails the HTTP request that emitted the event.

**Why it happens:** @nestjs/event-emitter handlers are synchronous by default; errors bubble up.

**How to avoid:** Wrap all event handlers in try-catch, or use async handlers that run after the request completes:
```typescript
@OnEvent('case.created', { async: true })
async handleCaseCreated(event: CaseCreatedEvent) {
  try {
    await this.doWork(event);
  } catch (error) {
    this.logger.error('Event handler failed', error);
    // Don't rethrow - log and continue
  }
}
```

**Warning signs:** HTTP 500 errors when the main operation succeeded; intermittent failures.

### Pitfall 2: Queue Job IDs Colliding Across Tenants

**What goes wrong:** Two tenants submit jobs with the same entity ID; one overwrites the other.

**Why it happens:** Using entity ID as job ID without tenant prefix.

**How to avoid:** Always include organizationId in job ID:
```typescript
await this.queue.add('process', data, {
  jobId: `${orgId}:${entityId}:${Date.now()}`,
});
```

**Warning signs:** Missing jobs, jobs processed for wrong tenant, duplicate processing.

### Pitfall 3: Elasticsearch Index Explosion

**What goes wrong:** Creating per-tenant indices leads to thousands of indices, degrading cluster performance.

**Why it happens:** Each ES index has overhead regardless of document count.

**How to avoid:** For tenants with low volume, consider shared indices with tenant field + document-level security. For high-volume tenants, dedicated indices. The CONTEXT.md specifies per-tenant indices, so monitor shard counts carefully.

**Warning signs:** ES cluster state too large, slow index operations, memory pressure.

### Pitfall 4: Audit Log Growth Without Partitioning

**What goes wrong:** Audit log table grows to billions of rows; queries become slow.

**Why it happens:** No partition strategy; single table for all history.

**How to avoid:** Partition by `created_at` from the start:
```sql
CREATE TABLE audit_logs (...) PARTITION BY RANGE (created_at);
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

**Warning signs:** Slow audit queries, long VACUUM times, table size in hundreds of GB.

### Pitfall 5: Workflow Versioning Without Instance Tracking

**What goes wrong:** Updating a workflow definition breaks in-flight instances.

**Why it happens:** Instances reference the template without version locking.

**How to avoid:** Store workflow_template_version_id on each workflow_instance. In-flight instances complete on their version.

**Warning signs:** Workflow steps appearing/disappearing mid-execution, invalid state transitions.

## Code Examples

### Complete Event Bus Setup

```typescript
// apps/backend/src/modules/events/events.module.ts
// Source: NestJS documentation pattern

import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,              // Enable 'case.*' patterns
      delimiter: '.',              // Event namespacing
      newListener: false,          // Disable 'newListener' events
      removeListener: false,       // Disable 'removeListener' events
      maxListeners: 20,            // Warn if >20 listeners
      verboseMemoryLeak: true,     // Show listener names in leak warnings
      ignoreErrors: false,         // Don't ignore errors (we handle in handlers)
    }),
  ],
})
export class EventsModule {}
```

### Complete BullMQ Module Setup

```typescript
// apps/backend/src/modules/jobs/jobs.module.ts
// Source: NestJS BullMQ documentation + BullMQ best practices

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
        prefix: 'ethico',  // Namespace all queues
      }),
      inject: [ConfigService],
    }),
    // Register queues with different configurations
    BullModule.registerQueue({
      name: 'ai-processing',
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
      },
    }),
    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        priority: 2,  // Higher priority
      },
    }),
    BullModule.registerQueue({
      name: 'indexing',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 5000 },
        priority: 5,  // Lower priority (bulk operations)
      },
    }),
    // Bull Board admin UI
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'ai-processing',
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'email',
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'indexing',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [AiProcessor, EmailProcessor, IndexingProcessor],
})
export class JobsModule {}
```

### Search Query with Permission Filtering

```typescript
// apps/backend/src/modules/search/query/query-builder.service.ts
// Source: Elasticsearch documentation + multi-tenancy patterns

import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class QueryBuilderService {
  constructor(
    private esService: ElasticsearchService,
    private permissionService: PermissionService,
  ) {}

  async search(
    orgId: string,
    userId: string,
    query: SearchQueryDto,
  ): Promise<SearchResult> {
    // Get user's permission filters
    const permissionFilter = await this.permissionService.buildEsFilter(userId, orgId);

    const indices = query.entityTypes.map(t =>
      `org_${orgId}_${t}`.toLowerCase()
    );

    const result = await this.esService.search({
      index: indices,
      body: {
        query: {
          bool: {
            must: [
              // User's search query
              query.text ? {
                multi_match: {
                  query: query.text,
                  fields: ['*'],
                  fuzziness: 'AUTO',
                },
              } : { match_all: {} },
            ],
            filter: [
              // Permission filter (CRITICAL for security)
              ...permissionFilter,
              // User's explicit filters
              ...this.buildFilters(query.filters),
            ],
          },
        },
        highlight: {
          fields: {
            '*': { pre_tags: ['<mark>'], post_tags: ['</mark>'] },
          },
        },
        aggs: {
          by_type: { terms: { field: '_index' } },
          by_status: { terms: { field: 'status.keyword' } },
          by_category: { terms: { field: 'category.keyword' } },
        },
        from: query.offset || 0,
        size: query.limit || 25,
      },
    });

    return this.transformResults(result);
  }
}
```

### Azure Blob Storage Service

```typescript
// apps/backend/src/modules/storage/providers/azure-blob.provider.ts
// Source: Azure SDK documentation + multi-tenancy patterns

import { Injectable } from '@nestjs/common';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

@Injectable()
export class AzureBlobProvider {
  private blobServiceClient: BlobServiceClient;

  constructor(private configService: ConfigService) {
    // Use Azure Identity for authentication (recommended)
    const credential = new DefaultAzureCredential();
    const accountUrl = this.configService.get('AZURE_STORAGE_ACCOUNT_URL');
    this.blobServiceClient = new BlobServiceClient(accountUrl, credential);
  }

  private getContainerName(organizationId: string): string {
    // Per-tenant containers for isolation
    return `org-${organizationId}`.toLowerCase();
  }

  private async getContainer(organizationId: string): Promise<ContainerClient> {
    const containerName = this.getContainerName(organizationId);
    const container = this.blobServiceClient.getContainerClient(containerName);

    // Create if doesn't exist
    await container.createIfNotExists({
      access: 'private',  // Never public
    });

    return container;
  }

  async uploadFile(
    organizationId: string,
    path: string,
    content: Buffer,
    contentType: string,
  ): Promise<string> {
    const container = await this.getContainer(organizationId);
    const blob = container.getBlockBlobClient(path);

    await blob.upload(content, content.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    });

    return blob.url;
  }

  async generateSasUrl(
    organizationId: string,
    path: string,
    expiresInMinutes: number = 15,
  ): Promise<string> {
    const container = await this.getContainer(organizationId);
    const blob = container.getBlockBlobClient(path);

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000);

    return blob.generateSasUrl({
      permissions: BlobSASPermissions.parse('r'),
      startsOn,
      expiresOn,
    });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bull (bull package) | BullMQ | 2021 | Native TypeScript, flows, better patterns |
| Custom event buses | @nestjs/event-emitter | 2020 | Official support, decorators, typing |
| Elasticsearch 7 | Elasticsearch 8/9 | 2022-2025 | New security model, better performance |
| azure-storage | @azure/storage-blob | 2019 | Modern SDK, async/await, identity integration |
| Manual job retries | BullMQ backoff config | BullMQ 1.0 | Declarative, battle-tested |

**Deprecated/outdated:**
- `bull` package: Replaced by `bullmq`. Both work but BullMQ is actively developed.
- `elasticsearch` (old client): Use `@elastic/elasticsearch` v8/9.
- `azure-storage` (legacy): Use `@azure/storage-blob` v12+.

## Open Questions

1. **Hash Chain Implementation Details**
   - What we know: CONTEXT.md specifies hash chain with "pragmatic implementation"
   - What's unclear: Exact algorithm (SHA-256?), checkpoint frequency, verification UI
   - Recommendation: Start with database sequence + daily checkpoint hashes stored in separate tamper-evident table; can enhance later

2. **AI Fallback Provider Integration**
   - What we know: Fall back to Azure OpenAI after Claude failures
   - What's unclear: How failure is detected (timeout? error codes?), circuit breaker pattern
   - Recommendation: Research in AI integration phase; for now, build abstract provider interface

3. **Elasticsearch Cluster Sizing**
   - What we know: Per-tenant indices, async indexing
   - What's unclear: Initial cluster size, when to split indices, shard strategy
   - Recommendation: Start with 3-node cluster; monitor and adjust based on actual data volume

## Sources

### Primary (HIGH confidence)
- [NestJS Events Documentation](https://docs.nestjs.com/techniques/events) - Event emitter setup
- [BullMQ Official Documentation](https://docs.bullmq.io/) - Queue patterns, retry configuration
- [BullMQ NestJS Guide](https://docs.bullmq.io/guide/nestjs) - NestJS integration specifics
- [Azure Storage Blob SDK](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-javascript-get-started) - Blob storage patterns
- [@nestjs/event-emitter npm](https://www.npmjs.com/package/@nestjs/event-emitter) - Version 3.0.1 confirmed
- [@nestjs/bullmq npm](https://www.npmjs.com/package/@nestjs/bullmq) - Version 11.0.4 confirmed
- [@nestjs/elasticsearch npm](https://www.npmjs.com/package/@nestjs/elasticsearch) - Version 11.1.0 confirmed

### Secondary (MEDIUM confidence)
- [Elasticsearch Multi-Tenancy Blog](https://www.elastic.co/blog/found-multi-tenancy) - Per-tenant index patterns
- [PostgreSQL Audit Log Best Practices](https://medium.com/@sehban.alam/lets-build-production-ready-audit-logs-in-postgresql-7125481713d8) - Hash chain patterns
- [BullMQ Retry Patterns](https://dev.to/woovi/how-to-effectively-use-retry-policies-with-bulljsbullmq-45h9) - Exponential backoff details

### Tertiary (LOW confidence - needs validation during implementation)
- @jescrich/nestjs-workflow - Community workflow engine (may provide patterns, but use existing TECH-SPEC-WORKFLOW-ENGINE.md)
- react-jsonschema-form - Frontend form rendering (will need to verify compatibility with Next.js 14)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via npm, official documentation consulted
- Architecture: HIGH - Patterns derived from official NestJS docs and existing project specs
- Pitfalls: MEDIUM - Based on community experience and general best practices

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable ecosystem)
