# Phase 12: Internal Operations Portal - Context & Decisions

## Overview

Phase 12 delivers the internal tooling that enables Ethico teams to support, implement, and manage client tenants effectively. This is CRITICAL infrastructure for launch readiness - without these tools, Support cannot diagnose issues, Implementation cannot onboard clients, and Client Success cannot monitor health.

## User Personas & Their Needs

### Support Team
**Pain Points:**
- Cannot access client accounts to reproduce issues
- No visibility into error logs or system health
- Manual tenant lookup for every support ticket
- No way to temporarily override configurations for debugging

**Tools Needed:**
- Tenant switcher with impersonation (full audit trail)
- Cross-tenant search for cases, users, errors
- Error log viewer with filtering and correlation
- Configuration inspector (read-only or override with approval)
- System health dashboard

### Implementation Specialists
**Pain Points:**
- Manual checklists in spreadsheets
- No standardized migration process
- Cannot track blockers or client responsiveness
- No visibility into go-live readiness

**Tools Needed:**
- Implementation project dashboard
- Standardized checklist templates (Quick Start, Standard, Complex, Enterprise)
- Data migration wizard with validation and rollback
- Blocker tracking with escalation
- Go-live readiness calculator
- Client-visible progress portal

### Hotline Team
**Pain Points:**
- Cannot edit directives without developer help
- QA queue lacks bulk actions
- Case reassignment requires database access
- No visibility into call directive effectiveness

**Tools Needed:**
- Directive editor (CRUD with versioning)
- Bulk QA queue management (approve/reject multiple)
- Case reassignment with audit trail
- Directive usage analytics
- Training scenario builder

### Client Success Managers
**Pain Points:**
- No visibility into client usage patterns
- Manual health checks before renewal
- Cannot identify at-risk accounts proactively
- No adoption metrics for new features

**Tools Needed:**
- Tenant health dashboard (composite score)
- Usage metrics (logins, cases, campaigns, reports)
- Feature adoption tracking
- Renewal risk indicators
- Engagement history timeline

## Architecture Decisions

### Cross-Tenant Access Model

**Decision: Explicit Impersonation with Audit**

```typescript
// Every cross-tenant operation requires:
interface ImpersonationContext {
  operatorUserId: string;       // The internal Ethico user
  operatorRole: InternalRole;   // SUPPORT, IMPLEMENTATION, etc.
  targetOrganizationId: string; // The client tenant
  reason: string;               // Required justification
  ticketId?: string;            // Support ticket reference
  expiresAt: Date;              // Session timeout (max 4 hours)
}

// All operations logged to ImpersonationAuditLog
interface ImpersonationAuditLog {
  id: string;
  context: ImpersonationContext;
  action: string;               // 'VIEW_CASE', 'UPDATE_CONFIG', etc.
  entityType: string;
  entityId: string;
  changes?: JsonValue;          // For mutations
  createdAt: Date;
}
```

**Rationale:**
- Explicit session prevents accidental cross-tenant data access
- Audit trail satisfies SOC 2 and enterprise security requirements
- Reason requirement discourages casual browsing
- Time limit prevents forgotten sessions

### Internal Roles (Separate from Client Roles)

```typescript
enum InternalRole {
  SUPPORT_TIER_1 = 'SUPPORT_TIER_1',         // Read-only access, escalation only
  SUPPORT_TIER_2 = 'SUPPORT_TIER_2',         // Read + limited config changes
  SUPPORT_ADMIN = 'SUPPORT_ADMIN',           // Full support capabilities
  IMPLEMENTATION_SPECIALIST = 'IMPL_SPEC',   // Migration, setup, training
  IMPLEMENTATION_MANAGER = 'IMPL_MGR',       // + project assignment, escalation
  CLIENT_SUCCESS = 'CSM',                    // Health monitoring, read-only
  HOTLINE_OPERATOR = 'HOTLINE_OP',           // Intake only
  HOTLINE_SUPERVISOR = 'HOTLINE_SUP',        // + directives, QA, reassignment
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',         // Full system access
}
```

### Implementation Project Model

```typescript
interface ImplementationProject {
  id: string;
  organizationId: string;           // Client tenant
  type: ImplementationType;         // QUICK_START, STANDARD, COMPLEX, ENTERPRISE
  status: ImplementationStatus;     // NOT_STARTED, IN_PROGRESS, AT_RISK, BLOCKED, COMPLETED
  specialistId: string;             // Primary implementation owner
  managerId?: string;               // For complex/enterprise
  goLiveDate?: Date;                // Target go-live
  actualGoLiveDate?: Date;          // Actual completion
  healthScore: number;              // 0-100 calculated score

  // Denormalized counts for dashboard
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;

  createdAt: Date;
  updatedAt: Date;
}

enum ImplementationType {
  QUICK_START = 'QUICK_START',       // 2-4 weeks
  STANDARD = 'STANDARD',             // 4-8 weeks
  COMPLEX = 'COMPLEX',               // 8-16 weeks
  ENTERPRISE = 'ENTERPRISE',         // 3-6 months
}

enum ImplementationStatus {
  NOT_STARTED = 'NOT_STARTED',
  DISCOVERY = 'DISCOVERY',
  CONFIGURATION = 'CONFIGURATION',
  MIGRATION = 'MIGRATION',
  TRAINING = 'TRAINING',
  UAT = 'UAT',
  GO_LIVE_PREP = 'GO_LIVE_PREP',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
}
```

### Checklist Template System

**Standard Phases (per PROFESSIONAL-SERVICES-SPEC.md):**

1. **Foundation** - Account setup, branding, hotline configuration
2. **Users & Access** - SSO setup, user provisioning, roles
3. **Case Management Setup** - Categories, forms, routing rules, templates
4. **Integrations** - SSO finalization, HRIS sync, email relay
5. **Data Migration** - Historical data import (if applicable)
6. **Training** - Role-based certification completion
7. **Go-Live Readiness** - Final checklist, sign-offs
8. **Handoff** - CSM introduction, support documentation

### Migration Wizard Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 1. Upload    │ -> │ 2. Detect    │ -> │ 3. Map       │
│   Files      │    │   Format     │    │   Fields     │
└──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │
       v                   v                   v
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 4. Validate  │ <- │ 5. Preview   │ <- │ 6. Import    │
│   Data       │    │   Sample     │    │   Execute    │
└──────────────┘    └──────────────┘    └──────────────┘
       │                                       │
       v                                       v
┌──────────────┐                        ┌──────────────┐
│ 7. Verify    │ ---------------------- │ 8. Rollback  │
│   Results    │      (7-day window)    │   (if needed)│
└──────────────┘                        └──────────────┘
```

### Health Score Calculation

```typescript
interface TenantHealthScore {
  organizationId: string;
  calculatedAt: Date;

  // Component scores (0-100)
  loginScore: number;           // Active users / total users
  caseResolutionScore: number;  // On-time closures
  campaignCompletionScore: number; // Attestation rates
  featureAdoptionScore: number; // Features used / available
  supportTicketScore: number;   // Inverse of ticket volume

  // Composite
  overallScore: number;         // Weighted average
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Weight distribution
const HEALTH_WEIGHTS = {
  login: 0.20,
  caseResolution: 0.25,
  campaignCompletion: 0.25,
  featureAdoption: 0.15,
  supportTickets: 0.15,
};
```

## Tech Debt Items (Phase 12 Plans 18-19)

### Backend Tech Debt (12-18-PLAN.md)

| Item | Description | Priority | Effort |
|------|-------------|----------|--------|
| WebSocket E2E Testing | AI gateway and notifications need integration tests | HIGH | M |
| Auth Edge Cases | Token refresh during WebSocket, SSO timeout handling | HIGH | S |
| Query Optimization | N+1 queries in case list, investigation detail | MEDIUM | M |
| Index Tuning | PostgreSQL indexes for common query patterns | MEDIUM | S |
| Cache Refinement | Redis cache key audit, TTL optimization | MEDIUM | S |
| API Versioning | Add /v2/ endpoints for breaking changes | LOW | L |
| Error Standardization | Consistent error response format across all endpoints | MEDIUM | M |
| Batch Operation Limits | Add pagination/limits to bulk endpoints | HIGH | S |

### Frontend Tech Debt (12-19-PLAN.md)

| Item | Description | Priority | Effort |
|------|-------------|----------|--------|
| Bundle Splitting | Route-based code splitting for faster initial load | HIGH | M |
| Lazy Loading | Defer non-critical components (charts, editors) | HIGH | M |
| Accessibility Audit | WCAG 2.1 AA compliance check and fixes | HIGH | L |
| Form State Management | Consolidate useForm patterns, add dirty tracking | MEDIUM | M |
| Error Boundaries | Add error boundaries at route and component level | MEDIUM | S |
| Loading States | Consistent skeleton loaders across all pages | LOW | M |
| Mobile Responsive | Verify all pages work on tablet/mobile | MEDIUM | L |
| Test Coverage | Unit tests for hooks, integration for key flows | MEDIUM | L |

### Infrastructure Tech Debt

| Item | Description | Priority | Effort |
|------|-------------|----------|--------|
| BullMQ Dashboard | Add Bull Board for job queue monitoring | MEDIUM | S |
| Health Checks | Add /health endpoints for all services | HIGH | S |
| Metrics Export | Prometheus metrics for monitoring | MEDIUM | M |
| Log Aggregation | Structured logging with correlation IDs | MEDIUM | M |
| Rate Limit Monitoring | Track rate limit hits, adjust thresholds | LOW | S |

## UI/UX Patterns

### Internal Portal Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Ethico Logo]  Support | Impl | Hotline | CSM | Admin  [User]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ TENANT: Acme Corp [Switch] │ Session: 2h 15m remaining │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    [Context-Specific Content]               │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tenant Switcher UX

1. Search by org name, domain, or ID
2. Recent tenants dropdown (last 5)
3. Require reason input (dropdown + free text)
4. Link to support ticket (optional but tracked)
5. Session timer always visible
6. One-click end session

### Migration Wizard UX

- **Step indicator** always visible at top
- **Progress persistence** - resume where you left off
- **Validation errors** inline with fix suggestions
- **Preview mode** - non-destructive, shows what WOULD happen
- **Rollback button** visible for 7 days post-import
- **Audit trail** - every step logged

## Security Considerations

### Access Control Matrix

| Action | T1 Support | T2 Support | Impl Spec | CSM | Platform Admin |
|--------|------------|------------|-----------|-----|----------------|
| View tenant data | Read-only | Read-only | Read-only | Read-only | Full |
| Modify tenant config | No | Limited | Migration only | No | Full |
| Run migrations | No | No | Yes | No | Yes |
| Edit directives | No | No | No | No | Yes (via Hotline) |
| View all tenants | Search | Search | Assigned | Assigned | Full |
| System config | No | No | No | No | Full |

### Audit Requirements

Every cross-tenant action MUST log:
- Who (operator user ID)
- What (action type + entity affected)
- When (timestamp)
- Where (IP, user agent)
- Why (reason/ticket)
- Before/After (for mutations)

### Data Isolation

Even with impersonation:
- PII only visible to authorized roles
- Passwords/secrets NEVER accessible
- Rate limits apply per operator
- Cannot impersonate another internal user

## Integration Points

### Existing Modules to Extend

1. **AuditModule** - Add ImpersonationAuditLog entity
2. **AuthModule** - Add InternalAuthGuard for operator sessions
3. **PortalsModule** - Add OperationsPortalModule
4. **MigrationModule** - Extend with wizard UI
5. **DirectivesService** - Add CRUD endpoints

### New Modules

1. **ImpersonationModule** - Cross-tenant session management
2. **ImplementationModule** - Project, task, blocker tracking
3. **ClientHealthModule** - Score calculation, metrics
4. **TrainingModule** - Certification, progress tracking

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Support resolution time | -30% | Ticket close time |
| Implementation cycle time | -20% | Go-live date variance |
| Client health visibility | 100% | All clients scored |
| Migration success rate | 99%+ | Rollback frequency |
| Directive update time | <5 min | Time to deploy change |

## Open Questions

1. **Billing integration** - Should CSM dashboard show MRR/ARR?
2. **Client portal visibility** - What do clients see of their implementation progress?
3. **SSO for internal tools** - Use same Azure AD or separate Ethico IdP?
4. **Mobile access** - Do hotline supervisors need mobile app?

## References

- [PROFESSIONAL-SERVICES-SPEC.md](../../../00-PLATFORM/PROFESSIONAL-SERVICES-SPEC.md)
- [Phase 8 Portals](../08-portals/CONTEXT.md) - Existing portal patterns
- [Phase 11 Analytics](../11-analytics-reporting/CONTEXT.md) - Dashboard infrastructure
