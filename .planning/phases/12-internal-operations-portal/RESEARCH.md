# Phase 12: Internal Operations Portal - Research

## Existing Patterns to Leverage

### From Phase 8 (Portals)

**Multi-Portal Architecture:**
- PortalsModule aggregates sub-modules (EmployeePortalModule, OperatorPortalModule)
- Each portal has its own controller namespace (/employee, /operator)
- Shared services for cross-cutting concerns

**Applicable Pattern:** Create OperationsPortalModule with sub-modules:
- SupportConsoleModule
- ImplementationModule
- HotlineOpsModule
- ClientSuccessModule

**Client Profile Lookup (08-03):**
- Phone lookup with cross-tenant access
- prisma.withBypassRLS() for cross-tenant queries
- Normalization utilities for consistent data format

**Applicable Pattern:** Extend for tenant lookup by name, domain, ID

**QA Queue (08-07, 08-16):**
- Claim/release pattern for work items
- Status transitions with validation
- Bulk action support
- 30-second auto-refresh

**Applicable Pattern:** Extend for bulk QA operations, add supervisor overrides

### From Phase 11 (Analytics)

**Dashboard Infrastructure (11-01):**
- Dashboard and DashboardWidget models
- react-grid-layout for responsive layouts
- Widget data service pattern

**Applicable Pattern:** Reuse for health dashboards, implementation progress

**Migration Infrastructure (11-04):**
- MigrationJob, MigrationFieldTemplate models
- MigrationService with connector pattern
- Validation and rollback support

**Applicable Pattern:** This IS our migration wizard backend - just needs UI

### From Phase 1 (Foundation)

**Audit Logging (01-03):**
- AuditService with natural language descriptions
- Entity-specific audit retrieval
- Role-based audit access

**Applicable Pattern:** Extend for ImpersonationAuditLog with additional fields

**Job Queues (01-02):**
- BullMQ with Redis
- Retry logic with exponential backoff
- Priority queues

**Applicable Pattern:** Use for migration jobs, health score calculation

## Library Research

### Cross-Tenant Session Management

**Option 1: Custom Implementation**
- Session token with organizationId + operatorId + expiry
- Redis-backed session store
- Middleware intercepts and sets context

**Option 2: nestjs-cls (Continuation Local Storage)**
- Request-scoped context without prop drilling
- Already used for current tenant context
- Could extend for impersonation overlay

**Recommendation:** Option 2 - extend existing CLS pattern

```typescript
// Current pattern
const orgId = this.cls.get('organizationId');

// Extended for impersonation
const impersonation = this.cls.get<ImpersonationContext>('impersonation');
const effectiveOrgId = impersonation?.targetOrganizationId ?? this.cls.get('organizationId');
```

### Progress Tracking UI

**react-flow / xyflow:**
- Node-based diagrams
- Could visualize implementation phases
- Overkill for simple checklist

**@hello-pangea/dnd (Atlassian DnD fork):**
- Drag and drop for task reordering
- Works with our existing React setup

**Recommendation:** Simple checklist with progress bars, add DnD only if needed

### Health Score Visualization

**recharts (already in project):**
- Line charts for trends
- Radar chart for multi-factor scores
- Gauge for overall health

**Recommendation:** Use recharts, already familiar patterns

## Security Considerations

### Impersonation Risks

| Risk | Mitigation |
|------|------------|
| Unauthorized access | InternalRole enum, explicit permission checks |
| Forgotten sessions | 4-hour max, visible timer, auto-logout |
| Audit bypass | All operations logged regardless of role |
| PII exposure | Field-level redaction based on role |
| Privilege escalation | Cannot impersonate higher-role users |

### Rate Limiting for Internal Tools

- Lower limits than external APIs (internal users trusted)
- Per-operator tracking (not per-tenant)
- Migration operations exempt from rate limits (bulk by nature)

### Secret Management

- Tenant API keys never exposed in UI
- Database credentials never accessible
- SSO secrets read-only, redacted display

## Existing Backend Code to Extend

### For Support Console

```typescript
// Extend SearchService for cross-tenant
// apps/backend/src/modules/search/search.service.ts
async searchAllTenants(query: string, entityTypes: string[], operatorContext: ImpersonationContext) {
  // Requires SUPPORT_TIER_2+ role
  // Logs to impersonation audit
  // Returns results with tenant identifiers
}
```

### For Implementation Portal

```typescript
// MigrationService already exists
// apps/backend/src/modules/analytics/migration/
// Needs: UI controllers, wizard state management, project tracking
```

### For Hotline Ops

```typescript
// DirectivesService exists
// apps/backend/src/modules/portals/operator/directives.service.ts
// Needs: CRUD endpoints (currently read-only), versioning, bulk operations
```

### For Client Success

```typescript
// New module needed
// UsageMetric model tracks:
// - Daily active users
// - Cases created/closed
// - Campaigns completed
// - Reports generated
// - Feature usage (which features, how often)
```

## Database Schema Extensions

### New Tables

```prisma
model ImpersonationSession {
  id                    String   @id @default(uuid())
  operatorUserId        String
  operatorRole          InternalRole
  targetOrganizationId  String
  reason                String
  ticketId              String?
  startedAt             DateTime @default(now())
  expiresAt             DateTime
  endedAt               DateTime?
  endReason             String?   // MANUAL, TIMEOUT, FORCE_LOGOUT

  operator              InternalUser @relation(fields: [operatorUserId], references: [id])
  targetOrganization    Organization @relation(fields: [targetOrganizationId], references: [id])
  auditLogs             ImpersonationAuditLog[]
}

model ImpersonationAuditLog {
  id                String   @id @default(uuid())
  sessionId         String
  action            String
  entityType        String
  entityId          String?
  details           Json?
  createdAt         DateTime @default(now())

  session           ImpersonationSession @relation(fields: [sessionId], references: [id])
}

model InternalUser {
  id                String       @id @default(uuid())
  email             String       @unique
  name              String
  role              InternalRole
  isActive          Boolean      @default(true)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  impersonationSessions ImpersonationSession[]
}

model ImplementationProject {
  id                String   @id @default(uuid())
  organizationId    String
  type              ImplementationType
  status            ImplementationStatus
  specialistId      String
  managerId         String?
  goLiveDate        DateTime?
  actualGoLiveDate  DateTime?
  healthScore       Int       @default(0)

  totalTasks        Int       @default(0)
  completedTasks    Int       @default(0)
  blockedTasks      Int       @default(0)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  organization      Organization @relation(fields: [organizationId], references: [id])
  specialist        InternalUser @relation("ProjectSpecialist", fields: [specialistId], references: [id])
  manager           InternalUser? @relation("ProjectManager", fields: [managerId], references: [id])
  tasks             ImplementationTask[]
  blockers          ImplementationBlocker[]
}

model ImplementationTask {
  id                String   @id @default(uuid())
  projectId         String
  phase             Int
  name              String
  description       String?
  status            TaskStatus
  assigneeId        String?
  dueDate           DateTime?
  completedAt       DateTime?
  completedById     String?
  notes             String?
  sortOrder         Int

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  project           ImplementationProject @relation(fields: [projectId], references: [id])
}

model ImplementationBlocker {
  id                String   @id @default(uuid())
  projectId         String
  title             String
  description       String
  severity          BlockerSeverity
  status            BlockerStatus
  ownerId           String?
  resolvedAt        DateTime?
  resolvedById      String?
  resolution        String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  project           ImplementationProject @relation(fields: [projectId], references: [id])
}

model TenantHealthScore {
  id                String   @id @default(uuid())
  organizationId    String
  calculatedAt      DateTime @default(now())

  loginScore        Int
  caseResolutionScore Int
  campaignCompletionScore Int
  featureAdoptionScore Int
  supportTicketScore Int
  overallScore      Int
  trend             HealthTrend
  riskLevel         RiskLevel

  organization      Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId, calculatedAt(sort: Desc)])
}

model UsageMetric {
  id                String   @id @default(uuid())
  organizationId    String
  date              DateTime @db.Date
  metricType        UsageMetricType
  value             Int

  createdAt         DateTime @default(now())

  organization      Organization @relation(fields: [organizationId], references: [id])

  @@unique([organizationId, date, metricType])
}
```

### Enums

```prisma
enum InternalRole {
  SUPPORT_TIER_1
  SUPPORT_TIER_2
  SUPPORT_ADMIN
  IMPL_SPEC
  IMPL_MGR
  CSM
  HOTLINE_OP
  HOTLINE_SUP
  PLATFORM_ADMIN
}

enum ImplementationType {
  QUICK_START
  STANDARD
  COMPLEX
  ENTERPRISE
}

enum ImplementationStatus {
  NOT_STARTED
  DISCOVERY
  CONFIGURATION
  MIGRATION
  TRAINING
  UAT
  GO_LIVE_PREP
  COMPLETED
  ON_HOLD
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  SKIPPED
  BLOCKED
}

enum BlockerSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum BlockerStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  WONT_FIX
}

enum HealthTrend {
  IMPROVING
  STABLE
  DECLINING
}

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
}

enum UsageMetricType {
  DAILY_ACTIVE_USERS
  CASES_CREATED
  CASES_CLOSED
  CAMPAIGNS_LAUNCHED
  CAMPAIGNS_COMPLETED
  REPORTS_GENERATED
  AI_QUERIES
  LOGINS
}
```

## Wave Planning

### Wave 1: Infrastructure (Plans 12-01 to 12-03)
- Cross-tenant access foundation
- Implementation project models
- Health metrics models

### Wave 2: Core Services (Plans 12-04 to 12-07)
- Support Console service
- Implementation checklist service
- Migration wizard service
- Hotline operations service

### Wave 3: Advanced Services (Plans 12-08 to 12-10)
- Client success service
- Training administration
- Go-live readiness

### Wave 4: UI - Part 1 (Plans 12-11 to 12-14)
- Support Console UI
- Implementation Portal UI
- Migration Wizard UI
- Hotline Operations UI

### Wave 5: UI - Part 2 + Tech Debt (Plans 12-15 to 12-19)
- Client Success UI
- Training Portal UI
- Internal admin settings
- Backend tech debt
- Frontend tech debt

## Estimated Effort

| Wave | Plans | Estimated Duration |
|------|-------|-------------------|
| Wave 1 | 3 | 2-3 days |
| Wave 2 | 4 | 3-4 days |
| Wave 3 | 3 | 2-3 days |
| Wave 4 | 4 | 4-5 days |
| Wave 5 | 5 | 4-5 days |
| **Total** | **19** | **~3 weeks** |
