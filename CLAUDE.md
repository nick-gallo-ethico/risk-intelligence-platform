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
- Workflow: Phone intake → **Create RIU** (hotline_report) → AI-assisted note cleanup → QA review → **Release RIU** → System creates Case
- **Key:** Operators create RIUs, NOT Cases. Cases are auto-created when RIU is released.

**Client Platform (Customer-Facing)**
- Users: CCOs, Compliance Officers, Investigators, HR, Legal
- Workflow: Case receipt (from released RIUs) → Routing → Investigation → Findings → Remediation
- **Key:** Clients see Cases with linked RIUs. Intake data lives on RIU, work tracking on Case.

## Core Entity Model: RIU→Case Architecture

**The HubSpot Parallel:** This platform uses a clear separation between **immutable inputs** and **mutable work containers**, mirroring HubSpot's Contact→Deal architecture.

| Concept | HubSpot Parallel | Description |
|---------|------------------|-------------|
| **RIU** (Risk Intelligence Unit) | Contact | Immutable input - something happened. A report filed, form submitted, disclosure made. |
| **Case** | Deal | Mutable work container. Has status, assignee, investigations, outcomes. |
| **riu_case_associations** | Association | Links RIUs to Cases (many-to-many). |

### Entity Hierarchy

```
RIU (Risk Intelligence Unit) - IMMUTABLE INPUT
├── type (hotline_report, web_form_submission, disclosure_response, etc.)
├── source_channel (phone, web_form, chatbot, email, proxy)
├── Reporter info (anonymous_access_code, contact details if identified)
├── Content (details, narrative - NEVER changes after creation)
├── Category/Severity (as captured at intake - corrections go on Case)
├── AI enrichment (ai_summary, ai_risk_score, ai_translation)
└── status (pending_qa, released, etc.)

            │
            │ riu_case_associations (many-to-many)
            │ association_type: 'primary' | 'related' | 'merged_from'
            ▼

CASE (mutable work container)
├── Classification (may differ from RIU - this is where corrections go)
├── Pipeline/Workflow (status, stage, SLA)
├── Assignment (user, team)
├── Investigations[] (0 to N per case)
│   ├── Assignees, status, notes, interviews, documents
│   ├── Template/checklist (category-specific)
│   ├── Findings & outcome
│   └── Remediation plan
├── Subjects[] (people involved - for cross-case pattern detection)
├── Interactions[] (follow-up contacts)
├── Communications (two-way with reporter via anonymized relay)
└── Outcomes & Findings

CAMPAIGN (outbound requests)
├── type (disclosure, attestation, survey)
├── target_audience, due_date, reminder_schedule
└── auto_case_rules (thresholds for when RIU creates Case)

    │
    │ Campaign Assignment (one per employee)
    │ status: pending | completed | overdue
    ▼

RIU (disclosure_response, attestation_response, survey_response)
    │
    │ If threshold met or flagged
    ▼
CASE (for review/investigation)

POLICY
├── Versions (parentPolicyId for version chains)
├── Approval workflows
├── Attestation campaigns → RIU (attestation_response)
└── Translations (AI-powered, preserves originals)
```

### RIU Types by Source

| Source Module | RIU Type | Auto-Creates Case? |
|---------------|----------|-------------------|
| Operator Console | `hotline_report` | Yes (after QA release) |
| Employee Portal | `web_form_submission` | Yes (immediate) |
| Manager Portal | `proxy_report` | Yes (immediate) |
| Disclosures | `disclosure_response` | If threshold met |
| Policy Attestation | `attestation_response` | If failure/refusal |
| Chatbot | `chatbot_transcript` | If escalation triggered |
| Web Forms | `incident_form` | Configurable |

### Key Design Decisions

- **RIUs are immutable** - intake content never changes; corrections go on the Case
- **Case status derived** from investigations but admin-overridable
- **Follow-ups** create Interactions (status checks) or new RIUs (substantive new info)
- **Multiple RIUs** can link to one Case (consolidating related reports)
- **Case merge** moves RIU associations to primary Case
- **Anonymous communication** via Ethico relay (Chinese Wall model)

## Backend Module Structure

Each feature is a NestJS module in `apps/backend/src/modules/`:
- `auth/` - JWT, SSO (Azure AD, Google), guards
- `rius/` - RIU CRUD, immutability enforcement, RIU→Case association
- `cases/` - Case CRUD, search, status tracking, merge operations
- `investigations/` - Workflow, templates, findings
- `campaigns/` - Disclosure/attestation campaigns, assignments
- `policies/` - CRUD, versioning, approval workflows
- `disclosures/` - Form management, conflict detection (creates RIUs)
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

## Development Resources (AI/Ralph Loop)

| Document | Purpose |
|----------|---------|
| `03-DEVELOPMENT/SECURITY-GUARDRAILS.md` | **MANDATORY** security requirements for all code |
| `03-DEVELOPMENT/RALPH-TASKS-SLICE-1.2.md` | Ralph-ready task breakdown for current slice |
| `03-DEVELOPMENT/CURRENT-SPRINT.md` | Active sprint status and progress |
| `03-DEVELOPMENT/TASK-LOG.md` | Append-only log of completed tasks |
| `03-DEVELOPMENT/BLOCKERS.md` | Active blockers needing human input |
| `apps/backend/examples/README.md` | Index of reference implementations |
| `apps/backend/examples/entity-pattern.prisma` | **FOLLOW THIS** for Prisma models |
| `apps/backend/examples/service-pattern.ts` | **FOLLOW THIS** for NestJS services |
| `apps/backend/examples/controller-pattern.ts` | **FOLLOW THIS** for NestJS controllers |
| `apps/backend/examples/dto-pattern.ts` | **FOLLOW THIS** for DTOs with validation |
| `apps/backend/examples/test-pattern.spec.ts` | **FOLLOW THIS** for unit tests |
| `apps/backend/examples/e2e-test-pattern.spec.ts` | **FOLLOW THIS** for E2E tests |

## Verification Commands

Before marking any task complete, run these commands:

```bash
# All must pass
npm run lint                          # ESLint
npm run typecheck                     # TypeScript
npm run test                          # Unit tests
npm run test:e2e                      # E2E tests
npm run test:tenant-isolation         # Security: tenant isolation
npm audit --audit-level=high          # Security: dependencies
```

## Pre-Commit Hooks

Husky is configured with pre-commit hooks that automatically run:
- lint-staged (ESLint + Prettier on staged files)
- TypeScript type checking
- Security audit (critical only)

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
| `RIU` (Risk Intelligence Unit) | `RII`, `Report`, `Intake`, `Submission` |
| `riu_case_associations` | `case_reports`, `intake_links` |
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

### RIU Immutability Pattern
RIUs (Risk Intelligence Units) are **immutable after creation**:
```typescript
// RIU - intake content NEVER changes
model RiskIntelligenceUnit {
  id              String   @id @default(uuid())
  organizationId  String
  type            String   // 'hotline_report', 'web_form_submission', etc.

  // IMMUTABLE fields - set at creation, never updated
  details         String   // Reporter's narrative
  reporterType    String   // 'anonymous', 'confidential', 'identified'
  categoryId      String   // Category as captured at intake
  severity        String   // Severity as captured at intake

  // MUTABLE fields (system-only)
  status          String   // 'pending_qa', 'released'
  aiSummary       String?  // Can be regenerated

  createdAt       DateTime @default(now())
  // NO updatedAt - emphasizes immutability
}

// Corrections go on the CASE, not the RIU
model Case {
  categoryId      String   // May differ from RIU - this is corrected value
  severity        String   // May differ from RIU - this is corrected value
}
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

## Git Workflow Best Practices

### Commit Frequency

**Principle: Commit at logical completion points, not at arbitrary intervals.**

- Commit after each completed task (e.g., "TASK 1.7.1 COMPLETE")
- Commit after each slice is complete
- Commit when switching context or ending a session
- Never leave a day's work uncommitted

### Commit Message Format

```
<type>(<scope>): <description>

[optional body with details]

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `security`
**Scopes:** `backend`, `frontend`, `prisma`, `auth`, `cases`, `investigations`, etc.

**Examples:**
```
feat(backend): Task 1.7.1 - Add PostgreSQL full-text search for cases
fix(security): Task 1.6.8 - Fix SQL injection in PrismaService
test(backend): Add tenant isolation E2E tests
docs: Add Slice 1.8 task breakdown
```

### What to Commit Together

| Commit Type | Include | Exclude |
|-------------|---------|---------|
| Feature task | All files for that feature | Unrelated changes |
| Security fix | Fix + tests | Unrelated refactoring |
| Documentation | Related docs only | Code changes |
| Slice completion | Slice task file updates | Next slice planning |

### Pre-Commit Verification

Before every commit, run:
```bash
npm run lint
npm run typecheck
npm run test
npm audit --audit-level=high
```

### Push Frequency

- Push after completing each slice
- Push at end of each working session
- Push before any context switch
- **Never leave unpushed commits overnight**

### Branch Strategy

- `main` - production-ready code, always deployable
- Feature branches optional for large features (3+ tasks)
- All Ralph Loop tasks commit directly to main (continuous integration)

## Development Checklist

Before marking any task complete:
- [ ] All entities have `organizationId` field
- [ ] All mutations log to activity table with natural language description
- [ ] Cache keys prefixed with `org:{organizationId}:`
- [ ] Tests verify tenant isolation (cross-tenant access blocked)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Test coverage meets threshold (80% line, 75% branch)
