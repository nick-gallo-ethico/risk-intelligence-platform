# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ethico Risk Intelligence Platform - a multi-tenant SaaS compliance management system ("HubSpot for Compliance"). Unifies ethics hotline intake, case management, investigations, disclosures, policy management, and analytics.

**Current Status:** Discovery/specification phase. Architecture docs and PRDs exist; source code development pending.

## Tech Stack (Planned)

**Frontend:** Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui, ProseMirror (rich text), Y.js (real-time collaboration)
**Backend:** Node.js 20.x with NestJS, TypeScript, Prisma ORM
**Database:** PostgreSQL 15+ with pgvector (AI embeddings), Row-Level Security for multi-tenancy
**Search:** Elasticsearch 8+
**Cache:** Redis 7
**AI:** Anthropic Claude API (primary), pluggable for Azure OpenAI or self-hosted LLMs
**Infrastructure:** Azure (App Service, Blob Storage, Cognitive Search) with Terraform

## Project Structure

```
Risk Intelligence Platform/
├── 00-PLATFORM/                    # Core platform strategy
│   ├── 01-PLATFORM-VISION.md       # Architecture, entity model, AI features
│   └── WORKING-DECISIONS.md        # All product decisions from discovery
├── 01-SHARED-INFRASTRUCTURE/       # Cross-platform technical specifications
│   ├── INFRASTRUCTURE-SPEC.md      # DevOps, CI/CD, Azure config
│   ├── TECH-SPEC-AUTH-MULTITENANCY.md  # SSO, JWT, RLS, RBAC
│   ├── TECH-SPEC-AI-INTEGRATION.md     # Claude API patterns, rate limiting
│   ├── TECH-SPEC-REALTIME-COLLABORATION.md  # WebSocket, Y.js
│   └── TESTING-STRATEGY.md         # Test pyramid, coverage targets
├── 02-MODULES/                     # Feature PRDs by module
│   ├── 02-OPERATOR-CONSOLE/        # Hotline intake, QA workflow
│   ├── 03-ETHICS-PORTAL/           # Employee self-service
│   ├── 04-WEB-FORM-CONFIGURATION/  # Custom intake forms
│   ├── 05-CASE-MANAGEMENT/         # Case tracking, investigations
│   ├── 06-DISCLOSURES/             # COI, gifts & entertainment
│   ├── 07-ANALYTICS-REPORTING/     # BI dashboards
│   ├── 08-EMPLOYEE-CHATBOT/        # AI conversational interface
│   └── 09-POLICY-MANAGEMENT/       # Policy lifecycle, attestations
└── 03-DEVELOPMENT/                 # Development resources
```

**Planned Source Code Structure:**
```
apps/
├── frontend/          # Next.js SPA
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── services/   # API clients
└── backend/           # NestJS API
    ├── src/
    │   ├── modules/    # Feature modules (auth, cases, policies, etc.)
    │   └── common/     # Guards, decorators, interceptors
    └── prisma/
        └── schema.prisma
```

## Development Commands (Planned)

```bash
# Start local services (PostgreSQL, Redis, Elasticsearch, Mailhog)
docker-compose up -d

# Install dependencies
npm install

# Run both frontend and backend
npm run dev

# Run backend only
npm run dev:backend   # or: cd apps/backend && npm run start:dev

# Run frontend only
npm run dev:frontend  # or: cd apps/frontend && npm run dev

# Database operations
npm run db:migrate        # Run Prisma migrations
npm run db:seed           # Seed test data
npm run db:studio         # Open Prisma Studio GUI

# Testing
npm run test              # Run all tests
npm run test:backend      # Backend unit tests only
npm run test:frontend     # Frontend unit tests only
cd apps/backend && npm test -- --testPathPattern="policy.service.spec"  # Single test file

# Lint and type check
npm run lint
npm run typecheck
```

## Architecture: Multi-Tenancy (CRITICAL)

Uses **shared database with PostgreSQL Row-Level Security (RLS)** for tenant isolation.

### Every Table Has organization_id

```typescript
// Prisma model example
model Case {
  id             String @id @default(uuid())
  organizationId String  // REQUIRED on every table
  // ... other fields
}
```

### Tenant Context Flow

1. JWT token contains `organizationId`
2. TenantMiddleware extracts tenant from token
3. Middleware sets Postgres session variable: `SET LOCAL app.current_organization = $1`
4. RLS policies automatically filter all queries by tenant
5. **Database enforces isolation** - buggy app code cannot leak data

### Tenant Isolation Checklist

When writing any data access code:
- [ ] All queries filter by `organizationId`
- [ ] Cache keys prefixed: `org:{organizationId}:...`
- [ ] Elasticsearch indices: `org_{organizationId}_{type}`
- [ ] AI prompts never mix multi-tenant data
- [ ] WebSocket rooms scoped by tenant
- [ ] File storage containers per tenant

## Two-Product Architecture

**Operator Console (Ethico Internal)**
- Users: Hotline operators, QA team
- Workflow: Phone intake → Metadata capture → AI-assisted note cleanup → QA review → Release to client

**Client Platform (Customer-Facing)**
- Users: CCOs, Compliance Officers, Investigators, HR, Legal
- Workflow: Case receipt → Routing → Investigation → Findings → Remediation

## Core Entity Model

```
CASE (primary container)
├── Intake Information (embedded: source, reporter, location, category, severity)
├── Interactions (timeline of follow-ups)
├── Investigations (0 to N per case)
│   ├── Assignees, status, notes, interviews, documents
│   ├── Template/checklist (category-specific)
│   ├── Findings & outcome
│   └── Remediation plan
├── Communications (two-way with reporter via anonymized relay)
└── Subjects (linked at Case level for cross-case pattern detection)

POLICY
├── Versions (parentPolicyId for version chains)
├── Approval workflows
├── Attestation campaigns
└── Translations (AI-powered, preserves originals)

DISCLOSURE
├── Type (COI, Gifts & Entertainment, Outside Activities)
├── Configurable form fields per tenant
└── Approver workflows
```

**Key Design Decisions:**
- Case status derived from investigations but admin-overridable
- Follow-ups stored as Interactions (not cluttering case list)
- Anonymous communication via Ethico relay (Chinese Wall model)

## Backend Module Structure

Each feature is a NestJS module in `apps/backend/src/modules/`:
- `auth/` - JWT, SSO (Azure AD, Google), guards
- `cases/` - Case CRUD, search, status tracking
- `investigations/` - Workflow, templates, findings
- `policies/` - CRUD, versioning, approval workflows
- `attestations/` - Distribution campaigns, tracking
- `disclosures/` - Form management, conflict detection
- `ai/` - Policy generation, note cleanup, summarization

## AI Integration

**Design Principles:**
- Assist, don't replace human judgment
- Non-intrusive (optional panels, not blocking)
- Transparent (clear when AI-generated)
- Editable (all outputs modifiable)
- **CRITICAL:** Never mix data from multiple tenants in prompts

**Provider Pattern:**
```typescript
interface AIProvider {
  generateSummary(content: string, context: any): Promise<string>;
  translatePolicy(content: string, targetLanguage: string): Promise<string>;
}
// Primary: ClaudeProvider, Fallback: AzureOpenAIProvider
```

## Permissions Model (RBAC)

| Role | See Cases | Assign | Investigate | Close | Configure |
|------|-----------|--------|-------------|-------|-----------|
| System Admin | All | Yes | Yes | Yes | Yes |
| CCO/Compliance | All | Yes | Optional | Yes | Yes |
| Triage Lead | Scoped | Yes | Yes | Configurable | Limited |
| Investigator | Assigned only | No | Yes | Configurable | No |
| Employee | Own cases only | No | No | No | No |

**Visibility Scoping:** By Region, Business Unit, Category, Sensitivity Level

## Testing Strategy

- **Test Pyramid:** 60% unit, 30% integration, 10% E2E
- **Coverage Targets:** 85% line (80% min), 80% branch (75% min)
- **Always test tenant isolation** - verify queries don't leak across tenants
- Backend: Jest + Supertest (E2E)
- Frontend: Vitest + React Testing Library, MSW for API mocking

## Performance Targets

- Page load: <2 seconds
- API response (p95): <500ms
- AI summary generation: <10 seconds
- Real-time sync: <100ms
- Uptime: >99.5%

## Task Granularity

**Default: 2-4 hour tasks** that result in one testable, mergeable unit.

A well-scoped task:
- Completes in one session without mid-task decisions
- Has clear verification (specific tests, working endpoint)
- Follows established patterns (reference existing code)
- Results in one focused PR

Split if: Task requires decisions not covered by WORKING-DECISIONS.md
Combine if: Tasks are just boilerplate steps of the same feature

## Key Specification Documents

| Document | Purpose |
|----------|---------|
| `00-PLATFORM/01-PLATFORM-VISION.md` | Architecture, entity model, competitive strategy |
| `00-PLATFORM/WORKING-DECISIONS.md` | All product decisions from discovery |
| `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md` | SSO, JWT, RLS, RBAC details |
| `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-INTEGRATION.md` | Claude API patterns, prompts, rate limiting |
| `02-MODULES/05-CASE-MANAGEMENT/PRD.md` | Case/Investigation entity specs, API design |
| `02-MODULES/09-POLICY-MANAGEMENT/PRD.md` | Policy lifecycle, attestations |
| `00-PLATFORM/AI-FIRST-CHECKLIST.md` | Design validation checklist for all documents |
| `00-PLATFORM/PRD-TEMPLATE.md` | Standard template for new PRDs |
| `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` | Core entities: User, Employee, Organization, etc. |
| `01-SHARED-INFRASTRUCTURE/ANALYTICS-DATA-MODEL.md` | Fact tables and dashboard schemas |
| `01-SHARED-INFRASTRUCTURE/TECH-SPEC-HRIS-INTEGRATION.md` | Employee sync, Merge.dev integration |
| `00-PLATFORM/UI-UX-DESIGN-SYSTEM.md` | Platform-wide UI/UX patterns, navigation, components |
| `00-PLATFORM/PROFESSIONAL-SERVICES-SPEC.md` | Implementation process, migration, training, go-live |

## AI-First Architecture (CRITICAL)

This platform is designed as **AI-first from the ground up**. This affects every schema, feature, and data structure.

### Core AI-First Principles

1. **Every entity stores narrative context** - Not just structured fields, but prose that AI can understand
2. **Activity logs use natural language** - "John assigned this case to Sarah" not just `{ action: 'assign', to: 'user_123' }`
3. **AI enrichment fields on key entities** - `ai_summary`, `ai_generated_at`, `ai_model_version`, `ai_confidence`
4. **Structured + Rationale pattern** - Store both the value AND why (e.g., `status` + `status_rationale`)
5. **Migration-ready schemas** - `source_system`, `source_record_id`, `migrated_at` on all imported data
6. **Chat interface considered** - Every feature should work via natural language query

### AI-First Schema Checklist

When designing any entity:
- [ ] Semantic field names (human-readable, not `field_1`)
- [ ] Narrative context field (description, notes, summary)
- [ ] Activity log with natural language `action_description`
- [ ] AI enrichment fields where applicable
- [ ] Source tracking for migrations
- [ ] Consider: "How would AI summarize this entity?"

### Conversation Storage

All AI interactions are logged:
```
AI_CONVERSATION
├── entity_type, entity_id (what this relates to)
├── user_prompt (what user asked)
├── ai_response (what AI returned)
├── model_version (claude-3-opus, etc.)
├── tokens_used (input, output)
├── was_helpful (user feedback)
└── created_at
```

## Documentation Cohesion (IMPORTANT)

### Before Creating Any PRD or Schema

1. **Read prerequisite documents:**
   - `00-PLATFORM/AI-FIRST-CHECKLIST.md` - validation checklist
   - `00-PLATFORM/PRD-TEMPLATE.md` - use as starting point
   - `00-PLATFORM/WORKING-DECISIONS.md` - architectural decisions

2. **Verify all checklist items are addressed** in your document

### Before Finalizing Any Document

Run this validation:
- [ ] Does every entity have semantic field names?
- [ ] Does every entity have narrative context fields (description, notes)?
- [ ] Does every entity have an activity log pattern?
- [ ] Does every entity support migration (source_system, source_record_id, migrated_at)?
- [ ] Does every entity support AI enrichment (ai_summary, ai_generated_at, ai_model_version)?
- [ ] Does the PRD include chat interaction examples?
- [ ] Is the document consistent with `WORKING-DECISIONS.md`?

### Cross-Reference Check

When modifying any PRD, verify consistency with:
- `00-PLATFORM/01-PLATFORM-VISION.md` (overall architecture)
- `00-PLATFORM/WORKING-DECISIONS.md` (architectural decisions)
- `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` (shared entities)
- Other module PRDs (shared entities like User, Employee, Category)

### Flagging Inconsistencies

If you find inconsistencies between documents:
1. Note the conflict explicitly
2. Propose resolution based on `WORKING-DECISIONS.md`
3. Update the older/incorrect document
4. Log the change in document header

### UI Framework Standard

**IMPORTANT:** The canonical UI framework is **shadcn/ui + Tailwind CSS** (with Radix primitives).

Do NOT reference:
- Material-UI (MUI)
- @mui/* packages
- Any other component library

When you encounter Material-UI references in existing documents, flag them for update.

### Terminology Standards

Use consistent terminology across all documents:

| Use This | Not This |
|----------|----------|
| `organization_id` | `tenant_id` (for tenant column name) |
| `Employee` | `HRISEmployee`, `Person` (for HRIS-synced individual) |
| `User` | `Account`, `Login` (for platform login identity) |
| `business_unit_id` | `department_id`, `division_id` |
| `shadcn/ui` | Material-UI, MUI |
| `activity` | `audit log` (for entity-level changes) |
| `AUDIT_LOG` | Activity (for unified cross-entity audit)

## Development Patterns

When implementing features, follow these established patterns:

### Entity Pattern
Every entity must include:
```typescript
// Required fields
id: string           // UUID
organizationId: string  // Tenant isolation (RLS enforced)
createdAt: DateTime
updatedAt: DateTime
createdById: string  // User who created
updatedById: string  // User who last modified

// AI-first fields (where applicable)
aiSummary?: string
aiSummaryGeneratedAt?: DateTime
aiModelVersion?: string

// Migration support
sourceSystem?: string      // 'NAVEX', 'EQS', 'MANUAL'
sourceRecordId?: string
migratedAt?: DateTime
```

### Service Pattern
```typescript
@Injectable()
export class EntityService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
  ) {}

  async create(dto: CreateDto, userId: string, orgId: string) {
    const entity = await this.prisma.entity.create({
      data: { ...dto, organizationId: orgId, createdById: userId }
    });

    await this.activityService.log({
      entityType: 'ENTITY',
      entityId: entity.id,
      action: 'created',
      actionDescription: `User created ${entity.name}`,
      actorUserId: userId,
      organizationId: orgId,
    });

    return entity;
  }
}
```

### Controller Pattern
```typescript
@Controller('api/v1/entities')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EntityController {
  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  async create(
    @Body() dto: CreateDto,
    @CurrentUser() user: User,
    @TenantId() orgId: string,
  ) {
    return this.service.create(dto, user.id, orgId);
  }
}
```

### Activity Log Pattern
Every mutation must log activity with natural language description:
```typescript
await this.activityService.log({
  entityType: 'CASE',
  entityId: case.id,
  action: 'status_changed',
  actionDescription: `${user.name} changed status from ${oldStatus} to ${newStatus}`,
  changes: { oldValue: { status: oldStatus }, newValue: { status: newStatus } },
  actorUserId: user.id,
  organizationId: orgId,
});
```

## Development Checklist

Before marking any task complete:
- [ ] All entities have `organizationId` field
- [ ] All mutations log to activity table with natural language description
- [ ] Cache keys prefixed with `org:{organizationId}:`
- [ ] Tests verify tenant isolation (cross-tenant access blocked)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Test coverage meets threshold (80% line, 75% branch)
