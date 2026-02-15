# Phase 34: Performance & Scalability - Research

**Researched:** 2026-02-15
**Domain:** NestJS performance optimization, PostgreSQL connection pooling, Redis caching, N+1 resolution
**Confidence:** HIGH

## Summary

This phase addresses 11 performance and scalability issues identified in the pre-Series A code review (graded C in Performance dimension). The codebase has solid foundations (proper pagination patterns, good index coverage) but lacks production-scale optimizations for 10K+ concurrent users.

The issues fall into four categories:

1. **Unbounded queries** (PERF-01, PERF-07, PERF-10) - Queries without limits that load entire tables into memory
2. **Missing Redis caching** (PERF-02, PERF-08) - Hot paths hit database on every request instead of caching
3. **N+1 query patterns** (PERF-03, PERF-04, PERF-05) - Sequential queries in loops instead of batch operations
4. **Connection/resource management** (PERF-06, PERF-09, PERF-11) - Pool configuration, bulk operations, memory bounds

**Primary recommendation:** Implement cursor-based pagination for unbounded queries, Redis caching for hot paths, batch fetching patterns for N+1 issues, and proper connection pool configuration. All patterns exist in the codebase already - this phase applies them consistently.

## Standard Stack

### Core (Already in Use)

| Library                     | Version | Purpose                       | Why Standard                                          |
| --------------------------- | ------- | ----------------------------- | ----------------------------------------------------- |
| `@nestjs/cache-manager`     | ^2.x    | Cache abstraction layer       | NestJS-native, supports multiple stores               |
| `cache-manager`             | ^5.x    | Cache driver interface        | Works with NestJS CacheModule                         |
| `cache-manager-ioredis-yet` | ^2.x    | Redis store for cache-manager | ioredis-based, TypeScript support, connection pooling |
| `ioredis`                   | ^5.x    | Redis client                  | Already used by BullMQ, supports clustering           |
| `@prisma/client`            | ^5.x    | Database ORM                  | Already in use, supports batch operations             |
| `bullmq`                    | ^5.x    | Job queue                     | Already in use, has addBulk() method                  |

### Supporting (Already Available)

| Library            | Version | Purpose             | When to Use                                  |
| ------------------ | ------- | ------------------- | -------------------------------------------- |
| `lru-cache`        | ^10.x   | In-memory LRU cache | For Maps that need eviction policies         |
| Prisma `$queryRaw` | N/A     | Raw SQL queries     | For recursive CTEs not expressible in Prisma |

### No Additional Dependencies Needed

All required libraries are already installed. This phase is about **using existing capabilities correctly**, not adding new dependencies.

## Architecture Patterns

### Pattern 1: Cursor-Based Pagination for Background Jobs

**What:** Process large datasets in batches using cursor (last ID) instead of offset/limit.
**When to use:** Scheduled jobs, reminder processing, any unbounded findMany() in background tasks.
**Example:**

```typescript
// Source: Existing pattern in codebase - cursor-based batch processing
async processAllAssignments(): Promise<void> {
  let cursor: string | undefined;
  const batchSize = 100;

  while (true) {
    const assignments = await this.prisma.campaignAssignment.findMany({
      where: {
        status: { in: ['PENDING', 'NOTIFIED', 'IN_PROGRESS'] },
        campaign: { status: 'ACTIVE' },
      },
      take: batchSize,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: 'asc' },
      select: { id: true, ...otherFields },
    });

    if (assignments.length === 0) break;

    await this.processBatch(assignments);
    cursor = assignments[assignments.length - 1].id;
  }
}
```

### Pattern 2: Redis-Backed CacheModule

**What:** Configure CacheModule with Redis store instead of in-memory store.
**When to use:** Any cached data that must be shared across multiple app instances (production deployment).
**Example:**

```typescript
// Source: https://www.tomray.dev/nestjs-caching-redis
import { CacheModule } from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-ioredis-yet";

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: false, // Per-module for isolation
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          host: configService.get("redis.host"),
          port: configService.get("redis.port"),
          password: configService.get("redis.password"),
          ttl: 300, // 5 minutes default
        }),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DashboardModule {}
```

### Pattern 3: Batch Relation Fetching (N+1 Resolution)

**What:** Fetch all related records in a single query before processing, instead of per-record queries.
**When to use:** Any loop that queries for related data inside the loop body.
**Example:**

```typescript
// Source: Prisma N+1 documentation - batch fetching pattern
async createFromEmployees(employees: Employee[], userId: string, orgId: string): Promise<Person[]> {
  // Step 1: Collect all IDs we'll need
  const managerIds = employees.map(e => e.managerId).filter(Boolean);
  const businessUnitIds = employees.map(e => e.businessUnitId).filter(Boolean);
  const locationIds = employees.map(e => e.locationId).filter(Boolean);

  // Step 2: Batch fetch all relations in parallel
  const [managers, businessUnits, locations] = await Promise.all([
    managerIds.length > 0
      ? this.prisma.employee.findMany({
          where: { id: { in: managerIds }, organizationId: orgId },
          select: { id: true, firstName: true, lastName: true },
        })
      : [],
    businessUnitIds.length > 0
      ? this.prisma.businessUnit.findMany({
          where: { id: { in: businessUnitIds } },
          select: { id: true, name: true },
        })
      : [],
    locationIds.length > 0
      ? this.prisma.location.findMany({
          where: { id: { in: locationIds } },
          select: { id: true, name: true },
        })
      : [],
  ]);

  // Step 3: Create lookup maps for O(1) access
  const managerMap = new Map(managers.map(m => [m.id, m]));
  const buMap = new Map(businessUnits.map(b => [b.id, b]));
  const locMap = new Map(locations.map(l => [l.id, l]));

  // Step 4: Process with O(1) lookups instead of O(n) queries
  return employees.map(employee => ({
    ...employee,
    managerName: managerMap.get(employee.managerId)?.firstName + ' ' + managerMap.get(employee.managerId)?.lastName,
    businessUnitName: buMap.get(employee.businessUnitId)?.name,
    locationName: locMap.get(employee.locationId)?.name,
  }));
}
```

### Pattern 4: Recursive CTE for Manager Chain

**What:** Use PostgreSQL recursive CTE to fetch entire manager chain in a single query.
**When to use:** Any hierarchical traversal (manager chain, org tree, category trees).
**Example:**

```typescript
// Source: PostgreSQL documentation - recursive CTE
async getManagerChain(personId: string, orgId: string, maxDepth: number = 10): Promise<Person[]> {
  const chain = await this.prisma.$queryRaw<Person[]>`
    WITH RECURSIVE manager_chain AS (
      -- Base case: start with the person's direct manager
      SELECT p.*, 1 AS depth
      FROM "Person" p
      WHERE p.id = (
        SELECT "managerId" FROM "Person" WHERE id = ${personId}
      )
      AND p."organizationId" = ${orgId}

      UNION ALL

      -- Recursive case: get each manager's manager
      SELECT p.*, mc.depth + 1
      FROM "Person" p
      INNER JOIN manager_chain mc ON p.id = mc."managerId"
      WHERE mc.depth < ${maxDepth}
      AND p."organizationId" = ${orgId}
    )
    SELECT * FROM manager_chain
    ORDER BY depth ASC
  `;

  return chain;
}
```

### Pattern 5: Prisma Aggregate for Statistics

**What:** Use database-level aggregation instead of loading all records to JavaScript.
**When to use:** Computing averages, counts, sums over large datasets.
**Example:**

```typescript
// Source: Prisma aggregate documentation
async getComplianceStatistics(organizationId: string): Promise<ComplianceStats> {
  const [aggregates, repeatNonResponderCount] = await Promise.all([
    // Database-level aggregation
    this.prisma.employeeComplianceProfile.aggregate({
      where: { organizationId },
      _count: { _all: true },
      _avg: { averageResponseDays: true },
    }),
    // Separate count for filtered data
    this.prisma.employeeComplianceProfile.count({
      where: { organizationId, isRepeatNonResponder: true },
    }),
  ]);

  // For completion rate, use raw SQL if Prisma aggregate doesn't support division
  const completionRate = await this.prisma.$queryRaw<[{ rate: number }]>`
    SELECT AVG(
      CASE WHEN "campaignsAssigned" > 0
      THEN "campaignsCompleted"::float / "campaignsAssigned"
      ELSE 0 END
    ) as rate
    FROM "EmployeeComplianceProfile"
    WHERE "organizationId" = ${organizationId}
  `;

  return {
    totalEmployees: aggregates._count._all,
    repeatNonResponders: repeatNonResponderCount,
    averageResponseDays: aggregates._avg.averageResponseDays ?? 0,
    averageCompletionRate: completionRate[0].rate ?? 0,
  };
}
```

### Pattern 6: BullMQ addBulk for Batch Job Creation

**What:** Use addBulk() instead of individual add() calls in a loop.
**When to use:** Queueing 10+ jobs at once.
**Example:**

```typescript
// Source: https://docs.bullmq.io/guide/queues/adding-bulks
async queueReminders(reminders: PendingReminder[]): Promise<void> {
  // Batch into chunks of 100 to avoid issues with very large batches
  const batchSize = 100;

  for (let i = 0; i < reminders.length; i += batchSize) {
    const batch = reminders.slice(i, i + batchSize);

    await this.campaignQueue.addBulk(
      batch.map(reminder => ({
        name: 'send-reminder',
        data: reminder,
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      }))
    );
  }

  this.logger.log(`Queued ${reminders.length} reminders in ${Math.ceil(reminders.length / batchSize)} batches`);
}
```

### Pattern 7: LRU Cache with TTL for In-Memory Maps

**What:** Replace unbounded Maps with LRU caches that evict old entries.
**When to use:** Any Map that grows based on user/entity count without cleanup.
**Example:**

```typescript
// Source: https://github.com/isaacs/node-lru-cache
import { LRUCache } from "lru-cache";

@Injectable()
export class AgentRegistry implements OnModuleInit {
  // Replace: private readonly agentInstances = new Map<string, BaseAgent>();
  private readonly agentInstances: LRUCache<string, BaseAgent>;

  constructor() {
    this.agentInstances = new LRUCache({
      max: 1000, // Maximum number of agent instances
      ttl: 1000 * 60 * 30, // 30-minute TTL
      updateAgeOnGet: true, // Reset TTL on access
      allowStale: false, // Don't return stale items
    });
  }
}
```

### Anti-Patterns to Avoid

- **Unbounded findMany() in background jobs:** Always add cursor-based pagination or explicit limits.
- **In-memory CacheModule with multi-instance deployment:** Use Redis store for production.
- **Queries inside loops:** Batch-fetch before the loop, use Maps for O(1) lookup.
- **Loading all records for aggregation:** Use Prisma aggregate() or raw SQL.
- **Individual queue.add() in loops:** Use addBulk() for batch operations.
- **Plain Maps for caching:** Use LRU cache with TTL/max to prevent memory leaks.

## Don't Hand-Roll

| Problem                     | Don't Build              | Use Instead                                  | Why                                                |
| --------------------------- | ------------------------ | -------------------------------------------- | -------------------------------------------------- |
| Cache invalidation          | Custom pub/sub           | Redis keyspace notifications + CacheManager  | Race conditions, TTL edge cases                    |
| Connection pooling          | Manual pool              | Prisma's built-in pool + DATABASE_URL params | Prisma optimizes for its query patterns            |
| Recursive hierarchy queries | While loops with queries | PostgreSQL recursive CTEs                    | Single DB roundtrip, index optimization            |
| Job batching                | Custom batch accumulator | BullMQ addBulk()                             | Atomic add-all-or-none, optimized Redis pipelining |
| LRU eviction                | Custom Map cleanup       | lru-cache package                            | Memory overhead tracking, configurable eviction    |

**Key insight:** All performance optimizations in this phase use existing libraries and built-in features. The issue is not missing capabilities - it's inconsistent application of best practices.

## Common Pitfalls

### Pitfall 1: Forgetting cursor for offset-based pagination

**What goes wrong:** Using skip/take without cursor causes performance degradation at high offsets (Postgres must scan all skipped rows).
**Why it happens:** Offset pagination is simpler to implement and works fine for small datasets.
**How to avoid:** Always use cursor-based pagination for background jobs processing large datasets.
**Warning signs:** Jobs getting slower over time, high memory usage during batch processing.

### Pitfall 2: Cache key collisions with multi-tenancy

**What goes wrong:** Cache entries from different tenants overwrite each other if keys don't include organizationId.
**Why it happens:** Forgetting tenant isolation in cache layer even when enforced at DB level.
**How to avoid:** Always prefix cache keys with `org:${organizationId}:` pattern.
**Warning signs:** Users seeing data from other organizations, inconsistent data after cache hits.

### Pitfall 3: Redis connection per CacheModule instance

**What goes wrong:** Each module creates its own Redis connection, exhausting connection pool.
**Why it happens:** Using `CacheModule.register()` in each module instead of sharing connection.
**How to avoid:** Use `CacheModule.registerAsync()` with shared ioredis client or configure at app level.
**Warning signs:** Redis connection errors, "too many connections" warnings.

### Pitfall 4: Recursive CTE without depth limit

**What goes wrong:** Infinite loop or stack overflow if data has cycles.
**Why it happens:** Manager chain data might have circular references from data migration issues.
**How to avoid:** Always include depth limit in recursive CTEs (WHERE depth < maxDepth).
**Warning signs:** Query never completes, high CPU usage, out of memory.

### Pitfall 5: BullMQ addBulk() with 10K+ jobs

**What goes wrong:** Performance degradation with very large bulk operations.
**Why it happens:** Each job still requires field computation, creating latency.
**How to avoid:** Chunk bulk operations into batches of 100-500 jobs.
**Warning signs:** addBulk() taking seconds to complete, Redis memory spikes.

## Code Examples

### Example 1: Fix Unbounded Campaign Reminder Query (PERF-01)

```typescript
// campaign-reminder.service.ts - findAssignmentsNeedingReminders
async processRemindersInBatches(organizationId?: string): Promise<number> {
  const batchSize = 100;
  let cursor: string | undefined;
  let totalProcessed = 0;

  while (true) {
    const where: Prisma.CampaignAssignmentWhereInput = {
      status: { in: [AssignmentStatus.PENDING, AssignmentStatus.NOTIFIED, AssignmentStatus.IN_PROGRESS] },
      campaign: { status: CampaignStatus.ACTIVE },
      ...(organizationId && { organizationId }),
    };

    const assignments = await this.prisma.campaignAssignment.findMany({
      where,
      take: batchSize,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        campaignId: true,
        employeeId: true,
        reminderCount: true,
        campaign: { select: { id: true, name: true, dueDate: true, reminderConfig: true } },
        employee: { select: { id: true, managerId: true, manager: { select: { id: true, email: true } } } },
      },
    });

    if (assignments.length === 0) break;

    const pendingReminders = this.filterAssignmentsNeedingReminders(assignments);
    if (pendingReminders.length > 0) {
      await this.queueRemindersBulk(pendingReminders);
    }

    totalProcessed += assignments.length;
    cursor = assignments[assignments.length - 1].id;
  }

  return totalProcessed;
}
```

### Example 2: Redis CacheModule Configuration (PERF-02, PERF-08)

```typescript
// dashboard.module.ts - switch from in-memory to Redis
import { CacheModule } from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-ioredis-yet";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          host: configService.get("redis.host", "localhost"),
          port: configService.get<number>("redis.port", 6379),
          password: configService.get("redis.password"),
          ttl: 300, // 5 minutes
        }),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
  ],
  // ... rest of module
})
export class DashboardModule {}
```

### Example 3: Prisma Connection Pool Configuration (PERF-06)

```bash
# .env - add connection pool parameters to DATABASE_URL
DATABASE_URL=postgresql://ethico:password@localhost:5432/ethico?schema=public&connection_limit=50&pool_timeout=30

# Environment variables for documentation
DB_POOL_SIZE=50           # Max connections per instance
DB_CONNECT_TIMEOUT=10000  # 10s connection timeout
DB_IDLE_TIMEOUT=60000     # 60s idle timeout
DB_STATEMENT_TIMEOUT=30000 # 30s query timeout
```

### Example 4: Batch Fetch for createFromEmployee (PERF-03)

```typescript
// persons.service.ts - batch version
async createFromEmployeeBatch(
  employees: Employee[],
  userId: string,
  organizationId: string,
): Promise<Person[]> {
  // Collect all relation IDs
  const managerIds = [...new Set(employees.map(e => e.managerId).filter(Boolean))];
  const businessUnitIds = [...new Set(employees.map(e => e.businessUnitId).filter(Boolean))];
  const locationIds = [...new Set(employees.map(e => e.locationId).filter(Boolean))];

  // Check existing persons to avoid duplicates
  const existingPersons = await this.prisma.person.findMany({
    where: {
      organizationId,
      employeeId: { in: employees.map(e => e.id) },
      type: PersonType.EMPLOYEE,
    },
    select: { id: true, employeeId: true },
  });
  const existingEmployeeIds = new Set(existingPersons.map(p => p.employeeId));

  // Filter to only new employees
  const newEmployees = employees.filter(e => !existingEmployeeIds.has(e.id));
  if (newEmployees.length === 0) return [];

  // Batch fetch all relations in parallel
  const [managers, businessUnits, locations] = await Promise.all([
    managerIds.length > 0
      ? this.prisma.employee.findMany({
          where: { id: { in: managerIds }, organizationId },
          select: { id: true, firstName: true, lastName: true },
        })
      : [],
    businessUnitIds.length > 0
      ? this.prisma.businessUnit.findMany({
          where: { id: { in: businessUnitIds } },
          select: { id: true, name: true },
        })
      : [],
    locationIds.length > 0
      ? this.prisma.location.findMany({
          where: { id: { in: locationIds } },
          select: { id: true, name: true },
        })
      : [],
  ]);

  // Create lookup maps
  const managerMap = new Map(managers.map(m => [m.id, `${m.firstName} ${m.lastName}`]));
  const buMap = new Map(businessUnits.map(b => [b.id, b.name]));
  const locMap = new Map(locations.map(l => [l.id, l.name]));

  // Create all persons in a transaction
  const persons = await this.prisma.$transaction(
    newEmployees.map(employee =>
      this.prisma.person.create({
        data: {
          organizationId,
          type: PersonType.EMPLOYEE,
          source: PersonSource.HRIS_SYNC,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phone: employee.phone,
          employeeId: employee.id,
          businessUnitId: employee.businessUnitId,
          businessUnitName: buMap.get(employee.businessUnitId),
          jobTitle: employee.jobTitle,
          employmentStatus: employee.employmentStatus,
          locationId: employee.locationId,
          locationName: locMap.get(employee.locationId),
          managerId: employee.managerId, // Store employee managerId, not person managerId
          managerName: managerMap.get(employee.managerId),
          anonymityTier: AnonymityTier.OPEN,
          createdById: userId,
          updatedById: userId,
        },
      })
    )
  );

  return persons;
}
```

## State of the Art

| Old Approach                        | Current Approach                                | When Changed | Impact                               |
| ----------------------------------- | ----------------------------------------------- | ------------ | ------------------------------------ |
| cache-manager v4 with redis store   | cache-manager v5 with cache-manager-ioredis-yet | 2023         | New API, better TypeScript support   |
| Prisma connection pool via env vars | Prisma connection URL parameters                | Prisma 4.0+  | URL params preferred, cleaner config |
| Bull v3                             | BullMQ v5                                       | 2023         | addBulk() atomic, better TypeScript  |
| Custom recursive queries            | Prisma $queryRaw with CTEs                      | Always       | Single query, database-optimized     |

**Deprecated/outdated:**

- `cache-manager-redis-store`: Use `cache-manager-ioredis-yet` instead (ioredis-based, better clustering support)
- `bull`: Use `bullmq` (already in use in this codebase, has addBulk())
- Individual `CacheModule.register()` per module: Use shared Redis client or app-level registration

## Open Questions

1. **Multi-instance Redis client sharing**
   - What we know: Each CacheModule.register() can create a new connection
   - What's unclear: Best pattern for sharing ioredis client across modules in NestJS
   - Recommendation: Use global CacheModule registration at app level, or create shared ioredis module

2. **Manager chain circular reference handling**
   - What we know: Recursive CTEs need depth limits
   - What's unclear: Whether the data model allows circular manager references
   - Recommendation: Add depth limit anyway (defensive), add data validation in HRIS sync

3. **Agent instance eviction policy**
   - What we know: Need LRU cache with TTL
   - What's unclear: Optimal max size and TTL for agent instances
   - Recommendation: Start with max: 1000, ttl: 30 minutes, monitor and adjust

## Sources

### Primary (HIGH confidence)

- [Prisma Connection Pool Documentation](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool) - Pool size, timeout configuration
- [BullMQ addBulk Documentation](https://docs.bullmq.io/guide/queues/adding-bulks) - Atomic batch job creation
- [PostgreSQL Recursive CTEs](https://www.postgresql.org/docs/current/queries-with.html) - Hierarchical query patterns
- [lru-cache npm package](https://www.npmjs.com/package/lru-cache) - Memory-bounded Map replacement

### Secondary (MEDIUM confidence)

- [NestJS Caching with Redis Guide](https://www.tomray.dev/nestjs-caching-redis) - cache-manager-ioredis-yet configuration
- [Prisma N+1 Query Optimization](https://www.furkanbaytekin.dev/blogs/software/n1-query-problem-fixing-it-with-sql-and-prisma-orm) - Batch fetching patterns

### Tertiary (LOW confidence)

- WebSearch results on BullMQ addBulk performance issues with 1K+ jobs - needs validation in practice

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already installed and in use
- Architecture patterns: HIGH - Patterns match existing codebase conventions and official docs
- Pitfalls: MEDIUM - Based on general best practices, specific edge cases may vary
- Code examples: HIGH - Adapted from existing codebase patterns and official documentation

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - stable domain, minimal API changes expected)
