# Phase 12: Internal Operations Portal - Research

**Researched:** 2026-02-04
**Domain:** Cross-tenant access infrastructure, implementation tracking, client health metrics, internal operations tooling
**Confidence:** HIGH (cross-tenant patterns, existing infrastructure), MEDIUM (health score algorithms, implementation workflows)

## Summary

Phase 12 delivers the internal tooling that enables Ethico teams to operate the platform effectively: Support Console for cross-tenant debugging, Implementation Portal for onboarding management, Hotline Operations for directive management and QA, and Client Success Dashboard for health monitoring. This phase is CRITICAL for launch readiness as it provides the operational infrastructure that internal teams need to support customers.

The project has substantial existing infrastructure to leverage: nestjs-cls for continuation-local storage (tenant context management), established audit patterns, migration infrastructure from Phase 11, and operator console patterns from Phase 8. The primary additions are: ImpersonationSession management for cross-tenant access, InternalUser model separate from tenant users, health score calculation engine, and implementation project tracking.

**Primary recommendation:** Extend the existing nestjs-cls pattern for impersonation context overlay, reuse the audit service with ImpersonationAuditLog specialization, leverage the existing MigrationService for the wizard UI, and build health scores using a weighted composite of usage metrics with scheduled recalculation via BullMQ.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nestjs-cls | 5.x | Continuation-local storage for cross-tenant context | Already in use for tenant context; extends naturally for impersonation overlay |
| @nestjs/bullmq | 10.x | Background jobs for health score calculation | Already in use for jobs; scheduled recalculation fits queue pattern |
| recharts | 2.15.x | Health score visualizations, usage charts | Already in project from Phase 11; consistent chart patterns |
| react-grid-layout | 1.5.x | Dashboard layouts for internal tools | Already in project from Phase 11; responsive grid for dashboards |
| @mui/x-data-grid | 7.x | Data tables for support console, implementation lists | Professional data grid for admin interfaces with filtering, sorting |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 3.x | Date manipulation for metrics | Already in use; period comparisons, trend calculations |
| zod | 3.x | Schema validation for internal APIs | Already in use; validate impersonation requests, config changes |
| lodash | 4.x | Utility functions | Already in use; aggregations, grouping for metrics |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom impersonation | Auth0 Organizations | External dependency; less control over audit trail |
| MUI Data Grid | AG Grid | AG Grid more powerful but adds 30KB; MUI sufficient for internal tools |
| BullMQ scheduled | node-cron | node-cron simpler but BullMQ already set up, better monitoring |

**Installation:**
```bash
# Most libraries already installed; MUI Data Grid may be needed
npm install @mui/x-data-grid
```

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/modules/
├── operations/                      # NEW: Internal operations portal
│   ├── operations.module.ts         # Aggregates sub-modules
│   ├── impersonation/               # Cross-tenant access
│   │   ├── impersonation.service.ts
│   │   ├── impersonation.guard.ts
│   │   ├── impersonation.controller.ts
│   │   ├── dto/
│   │   └── types/
│   ├── support/                     # Support console
│   │   ├── support-console.service.ts
│   │   ├── support-console.controller.ts
│   │   └── dto/
│   ├── implementation/              # Implementation tracking
│   │   ├── implementation.service.ts
│   │   ├── checklist.service.ts
│   │   ├── implementation.controller.ts
│   │   └── dto/
│   ├── client-health/               # Health metrics
│   │   ├── health-score.service.ts
│   │   ├── usage-metrics.service.ts
│   │   ├── client-health.controller.ts
│   │   ├── health-score.processor.ts  # BullMQ job
│   │   └── dto/
│   ├── hotline-ops/                 # Directive management
│   │   ├── directive-admin.service.ts
│   │   ├── bulk-qa.service.ts
│   │   ├── hotline-ops.controller.ts
│   │   └── dto/
│   └── training-admin/              # Training administration
│       ├── training-admin.service.ts
│       └── training-admin.controller.ts
│
├── analytics/migration/             # EXTEND: Add wizard controller
│   ├── migration-wizard.controller.ts  # NEW
│   └── ...existing files
│
└── portals/operator/                # EXTEND: Add supervisor endpoints
    ├── directive-admin.controller.ts   # NEW: CRUD for directives
    └── ...existing files

apps/frontend/src/
├── pages/
│   └── internal/                    # Internal portal pages
│       ├── support/
│       │   ├── SupportConsole.tsx
│       │   ├── TenantSwitcher.tsx
│       │   └── ErrorLogViewer.tsx
│       ├── implementation/
│       │   ├── ProjectDashboard.tsx
│       │   ├── ChecklistTracker.tsx
│       │   └── MigrationWizard.tsx
│       ├── hotline/
│       │   ├── DirectiveEditor.tsx
│       │   ├── BulkQaDashboard.tsx
│       │   └── CaseReassignment.tsx
│       └── client-success/
│           ├── HealthDashboard.tsx
│           ├── UsageMetrics.tsx
│           └── AdoptionTracking.tsx
└── components/
    └── internal/                    # Shared internal components
        ├── InternalLayout.tsx
        ├── TenantContextBar.tsx
        └── ImpersonationTimer.tsx
```

### Pattern 1: Impersonation Context Overlay with nestjs-cls

**What:** Extend existing CLS pattern to overlay impersonation context without disrupting normal tenant context flow
**When to use:** All cross-tenant operations in internal tools
**Example:**
```typescript
// Source: nestjs-cls documentation + existing codebase pattern
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

interface ImpersonationContext {
  sessionId: string;
  operatorUserId: string;
  operatorRole: InternalRole;
  targetOrganizationId: string;
  reason: string;
  ticketId?: string;
  expiresAt: Date;
}

@Injectable()
export class ImpersonationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Start an impersonation session
   */
  async startSession(
    operatorUserId: string,
    targetOrganizationId: string,
    reason: string,
    ticketId?: string,
  ): Promise<ImpersonationSession> {
    // Validate operator has permission
    const operator = await this.prisma.internalUser.findUnique({
      where: { id: operatorUserId },
    });
    if (!operator || !this.canImpersonate(operator.role)) {
      throw new ForbiddenException('Insufficient permissions for impersonation');
    }

    // Create session (max 4 hours)
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const session = await this.prisma.impersonationSession.create({
      data: {
        operatorUserId,
        operatorRole: operator.role,
        targetOrganizationId,
        reason,
        ticketId,
        expiresAt,
      },
    });

    // Log session start
    await this.logImpersonationAction(session.id, 'SESSION_STARTED', null, null);

    return session;
  }

  /**
   * Get effective organization ID (impersonated or normal)
   */
  getEffectiveOrganizationId(): string {
    const impersonation = this.cls.get<ImpersonationContext>('impersonation');
    if (impersonation && new Date() < impersonation.expiresAt) {
      return impersonation.targetOrganizationId;
    }
    return this.cls.get('organizationId');
  }

  /**
   * Check if currently in impersonation mode
   */
  isImpersonating(): boolean {
    const impersonation = this.cls.get<ImpersonationContext>('impersonation');
    return !!impersonation && new Date() < impersonation.expiresAt;
  }

  /**
   * Log an action performed during impersonation
   */
  async logImpersonationAction(
    sessionId: string,
    action: string,
    entityType: string | null,
    entityId: string | null,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.impersonationAuditLog.create({
      data: {
        sessionId,
        action,
        entityType,
        entityId,
        details: details as Prisma.InputJsonValue,
      },
    });
  }
}

/**
 * Guard that requires active impersonation session
 */
@Injectable()
export class ImpersonationGuard implements CanActivate {
  constructor(
    private readonly cls: ClsService,
    private readonly impersonationService: ImpersonationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionId = request.headers['x-impersonation-session'];

    if (!sessionId) {
      throw new ForbiddenException('Impersonation session required');
    }

    const session = await this.impersonationService.validateSession(sessionId);
    if (!session) {
      throw new ForbiddenException('Invalid or expired impersonation session');
    }

    // Set impersonation context in CLS
    this.cls.set<ImpersonationContext>('impersonation', {
      sessionId: session.id,
      operatorUserId: session.operatorUserId,
      operatorRole: session.operatorRole,
      targetOrganizationId: session.targetOrganizationId,
      reason: session.reason,
      ticketId: session.ticketId,
      expiresAt: session.expiresAt,
    });

    return true;
  }
}
```

### Pattern 2: Health Score Composite Calculation

**What:** Calculate tenant health scores from multiple weighted factors with trend detection
**When to use:** Client Success Dashboard health monitoring
**Example:**
```typescript
// Source: Customer success best practices + Gainsight/ChurnZero patterns
interface HealthScoreComponents {
  loginScore: number;           // Active users / total users
  caseResolutionScore: number;  // On-time closures
  campaignCompletionScore: number; // Attestation rates
  featureAdoptionScore: number; // Features used / available
  supportTicketScore: number;   // Inverse of ticket volume
}

// Weight distribution (must sum to 1.0)
const HEALTH_WEIGHTS = {
  login: 0.20,
  caseResolution: 0.25,
  campaignCompletion: 0.25,
  featureAdoption: 0.15,
  supportTickets: 0.15,
} as const;

@Injectable()
export class HealthScoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usageMetricsService: UsageMetricsService,
  ) {}

  /**
   * Calculate health score for a tenant
   */
  async calculateHealthScore(organizationId: string): Promise<TenantHealthScore> {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);

    // Fetch component data in parallel
    const [loginData, caseData, campaignData, featureData, ticketData, previousScore] =
      await Promise.all([
        this.getLoginMetrics(organizationId, thirtyDaysAgo),
        this.getCaseResolutionMetrics(organizationId, thirtyDaysAgo),
        this.getCampaignMetrics(organizationId, thirtyDaysAgo),
        this.getFeatureAdoptionMetrics(organizationId),
        this.getSupportTicketMetrics(organizationId, thirtyDaysAgo),
        this.getPreviousScore(organizationId),
      ]);

    // Calculate component scores (0-100)
    const components: HealthScoreComponents = {
      loginScore: this.calculateLoginScore(loginData),
      caseResolutionScore: this.calculateCaseResolutionScore(caseData),
      campaignCompletionScore: this.calculateCampaignScore(campaignData),
      featureAdoptionScore: this.calculateFeatureScore(featureData),
      supportTicketScore: this.calculateTicketScore(ticketData),
    };

    // Calculate weighted overall score
    const overallScore = Math.round(
      components.loginScore * HEALTH_WEIGHTS.login +
      components.caseResolutionScore * HEALTH_WEIGHTS.caseResolution +
      components.campaignCompletionScore * HEALTH_WEIGHTS.campaignCompletion +
      components.featureAdoptionScore * HEALTH_WEIGHTS.featureAdoption +
      components.supportTicketScore * HEALTH_WEIGHTS.supportTickets
    );

    // Determine trend based on previous score
    const trend = this.determineTrend(overallScore, previousScore?.overallScore);
    const riskLevel = this.determineRiskLevel(overallScore, trend);

    // Save score
    return this.prisma.tenantHealthScore.create({
      data: {
        organizationId,
        calculatedAt: now,
        ...components,
        overallScore,
        trend,
        riskLevel,
      },
    });
  }

  private calculateLoginScore(data: LoginMetrics): number {
    if (data.totalUsers === 0) return 0;
    const activeRatio = data.activeUsers / data.totalUsers;
    // Target: 70% of users active in last 30 days = 100 score
    return Math.min(100, Math.round((activeRatio / 0.7) * 100));
  }

  private determineTrend(
    current: number,
    previous?: number,
  ): 'IMPROVING' | 'STABLE' | 'DECLINING' {
    if (!previous) return 'STABLE';
    const delta = current - previous;
    if (delta > 5) return 'IMPROVING';
    if (delta < -5) return 'DECLINING';
    return 'STABLE';
  }

  private determineRiskLevel(
    score: number,
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING',
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score < 40 || (score < 60 && trend === 'DECLINING')) return 'HIGH';
    if (score < 70 || trend === 'DECLINING') return 'MEDIUM';
    return 'LOW';
  }
}
```

### Pattern 3: Implementation Project with Checklist Templates

**What:** Standardized implementation tracking with phase-based checklists
**When to use:** Implementation Portal project management
**Example:**
```typescript
// Source: SaaS implementation best practices
enum ImplementationPhase {
  FOUNDATION = 1,
  USERS_ACCESS = 2,
  CASE_MANAGEMENT = 3,
  INTEGRATIONS = 4,
  DATA_MIGRATION = 5,
  TRAINING = 6,
  GO_LIVE_READINESS = 7,
  HANDOFF = 8,
}

interface ChecklistTemplate {
  type: ImplementationType;
  phases: {
    phase: ImplementationPhase;
    name: string;
    tasks: {
      name: string;
      description?: string;
      isRequired: boolean;
      estimatedHours?: number;
    }[];
  }[];
}

// Standard Implementation Template (4-8 weeks)
const STANDARD_TEMPLATE: ChecklistTemplate = {
  type: 'STANDARD',
  phases: [
    {
      phase: ImplementationPhase.FOUNDATION,
      name: 'Foundation',
      tasks: [
        { name: 'Create tenant account', isRequired: true },
        { name: 'Configure organization settings', isRequired: true },
        { name: 'Upload company logo and branding', isRequired: true },
        { name: 'Configure hotline number', isRequired: true },
        { name: 'Set up custom domain (if applicable)', isRequired: false },
      ],
    },
    {
      phase: ImplementationPhase.USERS_ACCESS,
      name: 'Users & Access',
      tasks: [
        { name: 'Configure SSO integration', isRequired: false },
        { name: 'Import initial user list', isRequired: true },
        { name: 'Assign user roles', isRequired: true },
        { name: 'Test user login flow', isRequired: true },
      ],
    },
    // ... more phases
  ],
};

@Injectable()
export class ChecklistService {
  /**
   * Create checklist from template for a project
   */
  async createFromTemplate(
    projectId: string,
    templateType: ImplementationType,
  ): Promise<ImplementationTask[]> {
    const template = this.getTemplate(templateType);

    let sortOrder = 0;
    const tasks: Prisma.ImplementationTaskCreateManyInput[] = [];

    for (const phase of template.phases) {
      for (const task of phase.tasks) {
        tasks.push({
          projectId,
          phase: phase.phase,
          name: task.name,
          description: task.description,
          status: 'PENDING',
          isRequired: task.isRequired,
          sortOrder: sortOrder++,
        });
      }
    }

    await this.prisma.implementationTask.createMany({ data: tasks });

    return this.prisma.implementationTask.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Calculate project health score based on task completion
   */
  async calculateProjectHealth(projectId: string): Promise<number> {
    const project = await this.prisma.implementationProject.findUnique({
      where: { id: projectId },
      include: { tasks: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    const requiredTasks = project.tasks.filter(t => t.isRequired);
    const completedRequired = requiredTasks.filter(t => t.status === 'COMPLETED');
    const blockedTasks = project.tasks.filter(t => t.status === 'BLOCKED');

    // Base score: completion percentage
    let score = (completedRequired.length / requiredTasks.length) * 100;

    // Penalty for blocked tasks
    score -= blockedTasks.length * 5;

    // Penalty for overdue tasks
    const overdue = project.tasks.filter(
      t => t.dueDate && t.dueDate < new Date() && t.status !== 'COMPLETED'
    );
    score -= overdue.length * 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
```

### Pattern 4: Cross-Tenant Search with RLS Bypass

**What:** Search across all tenants for support debugging while maintaining audit trail
**When to use:** Support Console cross-tenant search
**Example:**
```typescript
// Source: Existing codebase pattern (08-03) + security best practices
@Injectable()
export class SupportConsoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly impersonationService: ImpersonationService,
  ) {}

  /**
   * Search cases across all tenants (requires elevated permissions)
   */
  async searchCasesAllTenants(
    operatorUserId: string,
    query: CrossTenantSearchDto,
  ): Promise<PaginatedResult<CaseSummary>> {
    // Validate operator permissions
    await this.validateElevatedAccess(operatorUserId, 'CROSS_TENANT_SEARCH');

    // Log the search action
    await this.impersonationService.logImpersonationAction(
      this.impersonationService.getCurrentSessionId(),
      'CROSS_TENANT_SEARCH',
      'Case',
      null,
      { query: query.searchTerm, filters: query.filters },
    );

    // Use RLS bypass for cross-tenant query
    // This is a Prisma extension that sets app.bypass_rls = true
    const results = await this.prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            // Bypass RLS for this query only
            await this.prisma.$executeRaw`SET LOCAL app.bypass_rls = true`;
            const result = await query(args);
            await this.prisma.$executeRaw`SET LOCAL app.bypass_rls = false`;
            return result;
          },
        },
      },
    }).case.findMany({
      where: {
        OR: [
          { referenceNumber: { contains: query.searchTerm, mode: 'insensitive' } },
          { summary: { contains: query.searchTerm, mode: 'insensitive' } },
        ],
        ...(query.organizationId && { organizationId: query.organizationId }),
        ...(query.status && { status: query.status }),
      },
      include: {
        organization: { select: { id: true, name: true } },
      },
      take: query.limit,
      skip: (query.page - 1) * query.limit,
    });

    return {
      items: results.map(this.toCaseSummary),
      total: await this.countResults(query),
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * View error logs for a tenant
   */
  async getErrorLogs(
    operatorUserId: string,
    organizationId: string,
    filters: ErrorLogFiltersDto,
  ): Promise<ErrorLogEntry[]> {
    await this.validateElevatedAccess(operatorUserId, 'VIEW_ERROR_LOGS');

    // Impersonation context is already set by guard
    // Query error logs from application logging table
    return this.prisma.applicationLog.findMany({
      where: {
        organizationId,
        level: { in: ['error', 'warn'] },
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
```

### Anti-Patterns to Avoid

- **Direct database queries without RLS context:** Never query tenant data without either RLS enabled or explicit impersonation audit logging
- **Storing impersonation state in JWT:** Session timeout and revocation require server-side state; use session ID in header
- **Calculating health scores synchronously:** Health scores involve multiple queries; use BullMQ scheduled jobs
- **Mixing internal and tenant user tables:** Internal users should be separate from tenant users to avoid confusion
- **Hardcoding checklist templates:** Templates should be configurable per implementation type and tenant
- **UI without session timer:** Always show remaining session time for impersonation to prevent forgotten sessions

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async context propagation | Custom ThreadLocal | nestjs-cls | Already in use; handles async boundaries correctly |
| Migration wizard backend | New service | Existing MigrationService | Phase 11 built full migration infrastructure |
| Background job scheduling | setInterval | BullMQ with cron | Already set up; monitoring, retry, persistence |
| Data tables with filtering | Custom table component | MUI X Data Grid | Professional filtering, sorting, pagination built-in |
| Health score trends | Custom trend calculation | date-fns + existing chart infrastructure | Period comparison utilities already available |
| Directive CRUD | New service | Extend DirectivesService | Phase 8 built read-only version; add write methods |

**Key insight:** Phase 8 and Phase 11 built substantial infrastructure. This phase primarily extends existing services and adds new UI rather than building from scratch.

## Common Pitfalls

### Pitfall 1: Impersonation Session Leaking to Other Requests

**What goes wrong:** Impersonation context bleeds into concurrent requests from same operator
**Why it happens:** Improper async context management or shared state
**How to avoid:**
- Use nestjs-cls which handles async boundaries correctly
- Validate session ID on every request, don't cache
- Use middleware that sets context at start of request, clears at end
**Warning signs:** Data from wrong tenant appearing in responses

### Pitfall 2: Health Score Calculation Overloading Database

**What goes wrong:** Running health scores for all tenants simultaneously crashes database
**Why it happens:** Scheduled job calculates all scores in single batch
**How to avoid:**
- Use BullMQ with rate limiting (e.g., 10 tenants per minute)
- Stagger calculations across time windows
- Cache intermediate metrics
**Warning signs:** Database CPU spikes at calculation time, slow queries

### Pitfall 3: Audit Log Growing Unbounded

**What goes wrong:** ImpersonationAuditLog table grows massive, queries slow down
**Why it happens:** Every click logged without aggregation or cleanup
**How to avoid:**
- Log meaningful actions, not every read
- Aggregate similar actions (e.g., "viewed 15 cases" not 15 separate logs)
- Implement retention policy (e.g., 2 years)
**Warning signs:** Audit queries timing out, storage costs increasing

### Pitfall 4: Implementation Checklist Not Syncing with Project Status

**What goes wrong:** Project shows "In Progress" but all tasks are blocked
**Why it happens:** Project status updated manually, not derived from tasks
**How to avoid:**
- Derive project status from task states
- If >20% tasks blocked, project is AT_RISK
- If go-live date passed and not complete, project is OVERDUE
**Warning signs:** Dashboard shows healthy projects that are actually struggling

### Pitfall 5: QA Bulk Actions Causing Race Conditions

**What goes wrong:** Two supervisors approve same QA items, duplicate cases created
**Why it happens:** No optimistic locking on bulk selection
**How to avoid:**
- Use database transaction with FOR UPDATE
- Check item status immediately before action
- Show "already processed by X" message
**Warning signs:** Duplicate cases, supervisor complaints about "items disappearing"

### Pitfall 6: Migration Wizard Losing State on Browser Refresh

**What goes wrong:** User closes browser mid-migration, loses all mapping work
**Why it happens:** Field mappings stored only in React state
**How to avoid:**
- Persist field mappings to MigrationJob.fieldMappings after each change
- Resume from database state on page load
- Show "resume migration" prompt if incomplete job exists
**Warning signs:** Support tickets about lost migration progress

## Code Examples

Verified patterns from official sources and existing codebase:

### Impersonation Session Middleware

```typescript
// Source: nestjs-cls documentation + existing middleware patterns
import { Injectable, NestMiddleware } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ImpersonationMiddleware implements NestMiddleware {
  constructor(
    private readonly cls: ClsService,
    private readonly impersonationService: ImpersonationService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const sessionId = req.headers['x-impersonation-session'] as string;

    if (sessionId) {
      const session = await this.impersonationService.validateSession(sessionId);

      if (session) {
        // Set impersonation context
        this.cls.set('impersonation', {
          sessionId: session.id,
          operatorUserId: session.operatorUserId,
          operatorRole: session.operatorRole,
          targetOrganizationId: session.targetOrganizationId,
          reason: session.reason,
          ticketId: session.ticketId,
          expiresAt: session.expiresAt,
        });

        // Override tenant context for RLS
        await this.prisma.$executeRaw`
          SET LOCAL app.current_tenant = ${session.targetOrganizationId}
        `;

        // Add response header with remaining time
        const remaining = session.expiresAt.getTime() - Date.now();
        res.setHeader('X-Impersonation-Remaining', Math.floor(remaining / 1000));
      }
    }

    next();
  }
}
```

### Health Score Processor (BullMQ)

```typescript
// Source: NestJS BullMQ documentation + existing processor patterns
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';

export const HEALTH_SCORE_QUEUE = 'health-scores';

interface HealthScoreJobData {
  organizationId?: string;  // Optional: specific tenant or all
}

@Processor(HEALTH_SCORE_QUEUE)
export class HealthScoreProcessor extends WorkerHost {
  private readonly logger = new Logger(HealthScoreProcessor.name);

  constructor(
    private readonly healthScoreService: HealthScoreService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<HealthScoreJobData>): Promise<void> {
    this.logger.log(`Processing health score job ${job.id}`);

    if (job.data.organizationId) {
      // Single tenant calculation
      await this.healthScoreService.calculateHealthScore(job.data.organizationId);
    } else {
      // Calculate for all active tenants
      const tenants = await this.prisma.organization.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });

      for (let i = 0; i < tenants.length; i++) {
        await this.healthScoreService.calculateHealthScore(tenants[i].id);
        await job.updateProgress(Math.round((i / tenants.length) * 100));

        // Rate limiting: wait between calculations
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Health score job ${job.id} failed: ${error.message}`);
  }
}

// Schedule daily calculation (in module)
// @nestjs/bull-shared provides this pattern
// schedule: '0 2 * * *' (2 AM daily)
```

### Internal Layout with Session Timer

```typescript
// Source: React patterns + existing layout patterns
import { useEffect, useState, useCallback } from 'react';
import { useImpersonation } from '@/hooks/useImpersonation';

export function InternalLayout({ children }: { children: React.ReactNode }) {
  const { session, endSession, remainingTime } = useImpersonation();
  const [showWarning, setShowWarning] = useState(false);

  // Show warning when 15 minutes remaining
  useEffect(() => {
    if (remainingTime && remainingTime < 15 * 60) {
      setShowWarning(true);
    }
  }, [remainingTime]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="h-14 border-b bg-background flex items-center px-4">
        <span className="font-semibold">Ethico Operations</span>
        <div className="ml-auto flex items-center gap-4">
          <NavLink to="/internal/support">Support</NavLink>
          <NavLink to="/internal/implementation">Implementation</NavLink>
          <NavLink to="/internal/hotline">Hotline Ops</NavLink>
          <NavLink to="/internal/client-success">Client Success</NavLink>
        </div>
      </nav>

      {/* Tenant Context Bar */}
      {session && (
        <div className={cn(
          "h-12 border-b flex items-center justify-between px-4",
          showWarning ? "bg-yellow-100" : "bg-blue-50"
        )}>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="font-medium">
              Impersonating: {session.organizationName}
            </span>
            <Badge variant="outline">{session.reason}</Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className={cn(
              "text-sm",
              showWarning && "text-yellow-700 font-medium"
            )}>
              Session: {formatTime(remainingTime)}
            </span>
            <Button variant="outline" size="sm" onClick={endSession}>
              End Session
            </Button>
          </div>
        </div>
      )}

      {/* Session Warning Dialog */}
      {showWarning && (
        <AlertDialog open={showWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
              <AlertDialogDescription>
                Your impersonation session will expire in {formatTime(remainingTime)}.
                Please complete your work or extend the session.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowWarning(false)}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
```

### Directive Editor with Version Control

```typescript
// Source: Existing DirectivesService pattern + CRUD extension
@Injectable()
export class DirectiveAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Update a directive with version tracking
   */
  async updateDirective(
    organizationId: string,
    directiveId: string,
    userId: string,
    dto: UpdateDirectiveDto,
  ): Promise<Directive> {
    const current = await this.prisma.directive.findUnique({
      where: { id: directiveId, organizationId },
    });

    if (!current) {
      throw new NotFoundException('Directive not found');
    }

    // Archive current version
    await this.prisma.directiveVersion.create({
      data: {
        directiveId,
        version: current.version,
        stage: current.stage,
        content: current.content,
        archivedAt: new Date(),
        archivedById: userId,
      },
    });

    // Update to new version
    const updated = await this.prisma.directive.update({
      where: { id: directiveId },
      data: {
        ...dto,
        version: current.version + 1,
        updatedAt: new Date(),
        updatedById: userId,
      },
    });

    // Audit the change
    await this.auditService.log({
      organizationId,
      entityType: 'DIRECTIVE',
      entityId: directiveId,
      action: 'DIRECTIVE_UPDATED',
      actionCategory: 'UPDATE',
      actionDescription: `Directive "${current.name}" updated to version ${updated.version}`,
      actorUserId: userId,
      actorType: 'USER',
      changes: {
        content: { old: current.content, new: dto.content },
        stage: { old: current.stage, new: dto.stage },
      },
    });

    return updated;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Request-scoped providers for context | nestjs-cls AsyncLocalStorage | 2024 | Better performance, works with async boundaries |
| Manual health score triggers | Scheduled BullMQ jobs | 2024 | Reliable, monitored, rate-limited |
| Hardcoded implementation checklists | Template-based system | 2025 | Flexible per implementation type |
| Support access via shared admin account | Impersonation sessions with audit | 2025 | SOC 2 compliant, full traceability |
| Manual directive updates by developers | Self-service directive editor | 2026 | Faster updates, version control |

**Deprecated/outdated:**
- Using REQUEST scope providers for tenant context: Performance overhead; use nestjs-cls instead
- Storing impersonation in JWT: Cannot revoke; use server-side sessions
- Single health score number: Composite with component breakdown provides actionability

## Open Questions

Things that couldn't be fully resolved:

1. **Internal User Authentication**
   - What we know: Internal users need separate authentication from tenant users
   - What's unclear: Should internal users use same Azure AD tenant or separate IdP?
   - Recommendation: Use same Azure AD with internal-only groups; simpler to manage

2. **Billing Integration for CSM Dashboard**
   - What we know: CS-01 mentions customer health scoring
   - What's unclear: Should dashboard show MRR/ARR or is that external system?
   - Recommendation: Start without billing; add integration later if needed

3. **Client-Visible Implementation Portal**
   - What we know: CONTEXT.md mentions client-visible progress portal
   - What's unclear: How much detail should clients see vs internal-only?
   - Recommendation: Start internal-only; add client portal view as enhancement

4. **Training Administration Scope**
   - What we know: 12-09-PLAN mentions certification tracks and exam management
   - What's unclear: Whether this is internal training or client training
   - Recommendation: Focus on internal training admin first; client training is Phase 13+

## Sources

### Primary (HIGH confidence)
- [nestjs-cls GitHub](https://github.com/Papooch/nestjs-cls) - Continuation-local storage for NestJS
- [NestJS Async Local Storage Recipe](https://docs.nestjs.com/recipes/async-local-storage) - Official docs
- [NestJS BullMQ Documentation](https://docs.nestjs.com/techniques/queues) - Queue patterns
- [MUI X Data Grid](https://mui.com/x/react-data-grid/) - Data grid for React
- Existing codebase: `apps/backend/src/modules/analytics/migration/migration.service.ts`
- Existing codebase: `apps/backend/src/modules/audit/audit.service.ts`
- Existing codebase: `apps/backend/src/modules/portals/operator/`

### Secondary (MEDIUM confidence)
- [Gainsight Customer Success Metrics](https://www.gainsight.com/blog/customer-success-metrics-what-to-track-in-2026/) - Health score best practices
- [Custify Customer Health Score Guide](https://www.custify.com/blog/customer-health-score-guide/) - Calculation patterns
- [Storylane SaaS Implementation Checklist](https://www.storylane.io/blog/saas-implementation-checklist) - Implementation workflow
- [Logto Multi-Tenant Guide](https://blog.logto.io/build-multi-tenant-saas-application) - Cross-tenant patterns
- [WorkOS Multi-Tenant Architecture](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture) - Support access patterns

### Tertiary (LOW confidence - needs validation)
- Internal user SSO integration specifics: Depends on Ethico Azure AD configuration
- Billing system integration: External system, format unknown

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing libraries already in project
- Architecture (impersonation): HIGH - nestjs-cls well-documented, pattern extends existing
- Architecture (health scores): MEDIUM - Composite calculation is custom; algorithm may need tuning
- Architecture (implementation): MEDIUM - Template system is custom; may need iteration
- Pitfalls: HIGH - Based on multi-tenant best practices and existing codebase patterns

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - stable libraries, existing patterns)
