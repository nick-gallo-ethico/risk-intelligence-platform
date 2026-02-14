# Codebase Structure

**Analysis Date:** 2026-02-13

## Directory Layout

```
Risk Intelligence Platform/
├── .claude/                   # Claude Code configuration and commands
├── .git/                      # Git repository
├── .github/                   # GitHub Actions CI/CD workflows
├── .husky/                    # Git hooks (pre-commit linting, type checking)
├── .planning/                 # Development planning and phase documentation
│   ├── codebase/              # Codebase analysis documents (this file)
│   ├── debug/                 # Bug tracking and resolution notes
│   ├── phases/                # Phase-by-phase implementation plans
│   └── research/              # Technical research and spike documents
├── 00-PLATFORM/               # Core platform strategy and vision documents
├── 01-SHARED-INFRASTRUCTURE/  # Technical specifications (auth, AI, testing)
├── 02-MODULES/                # Feature PRDs by module
├── 03-DEVELOPMENT/            # Development resources (task logs, security guardrails)
├── apps/                      # Application source code
│   ├── backend/               # NestJS API server
│   ├── frontend/              # Next.js web application
│   └── ops-console/           # Internal operations console (planned)
├── docs/                      # Additional documentation
├── packages/                  # Shared TypeScript types (planned)
├── scripts/                   # Utility scripts (deployment, data migration)
├── CLAUDE.md                  # AI assistant instructions (this file)
├── docker-compose.yml         # Local development services (PostgreSQL, Redis, Elasticsearch)
├── package.json               # Root workspace configuration
└── README.md                  # Project overview
```

## Directory Purposes

**apps/backend/**

- Purpose: NestJS REST API server with GraphQL support
- Contains: Controllers, services, Prisma schema, tests, seeders
- Key files:
  - `src/main.ts`: Application entry point
  - `src/app.module.ts`: Root module with all feature module imports
  - `prisma/schema.prisma`: Database schema with RLS-enabled models
  - `prisma/seed.ts`: Demo data seeder

**apps/backend/src/modules/**

- Purpose: Feature modules organized by domain (40+ modules)
- Contains: Feature-specific controllers, services, DTOs, tests
- Key subdirectories:
  - `auth/`: Authentication (JWT, SSO, MFA)
  - `cases/`: Case management and pipeline
  - `rius/`: Risk Intelligence Unit (immutable intake records)
  - `investigations/`: Investigation workflow and checklist
  - `campaigns/`: Disclosure/attestation campaigns
  - `policies/`: Policy management with versioning
  - `ai/`: AI integration (Claude API, streaming, prompts)
  - `analytics/`: Dashboards, reports, My Work queue
  - `workflow/`: Workflow engine for state machines
  - `notifications/`: Email and in-app notifications
  - `search/`: Elasticsearch integration
  - `prisma/`: Database service module

**apps/backend/src/common/**

- Purpose: Shared utilities and cross-cutting infrastructure
- Contains: Guards, decorators, middleware, interceptors, filters, base services
- Key subdirectories:
  - `guards/`: JwtAuthGuard, TenantGuard, RolesGuard
  - `decorators/`: @CurrentUser(), @TenantId(), @Roles()
  - `middleware/`: TenantMiddleware (RLS context setter)
  - `services/`: ActivityService (audit logging)
  - `dto/`: Pagination, query base classes
  - `filters/`: HttpExceptionFilter
  - `interceptors/`: Logging, response transformation

**apps/frontend/**

- Purpose: Next.js 14+ web application with App Router
- Contains: Pages, components, API clients, hooks, styles
- Key files:
  - `src/app/layout.tsx`: Root layout with providers
  - `src/app/(authenticated)/layout.tsx`: Authenticated shell with nav
  - `src/lib/api.ts`: Axios client with JWT interceptors

**apps/frontend/src/app/**

- Purpose: Next.js App Router pages
- Contains: Route groups, page components, layouts
- Key subdirectories:
  - `(authenticated)/`: Protected routes (cases, analytics, settings)
  - `login/`: Authentication pages
  - `ethics/[tenant]/`: Public ethics hotline portal
  - `employee/`: Employee self-service portal
  - `operator/`: Hotline operator console
  - `internal/`: Internal operations portal

**apps/frontend/src/components/**

- Purpose: Reusable React components
- Contains: Domain components, shared components, UI primitives
- Key subdirectories:
  - `ui/`: shadcn/ui components (Button, Dialog, Table, etc.)
  - `cases/`: Case-specific components (CaseCard, CaseFilters)
  - `analytics/`: Dashboard widgets, chart components
  - `layout/`: AppShell, Sidebar, Header
  - `shared/`: Cross-feature components (DataTable, FileUpload)
  - `ai/`: AI-related components (AiAssistPanel, StreamingResponse)

**apps/frontend/src/lib/**

- Purpose: Frontend utility functions and API clients
- Contains: API client modules, utilities, validation schemas
- Key files:
  - `api.ts`: Base axios client with auth interceptors
  - `cases-api.ts`: Case API client functions
  - `analytics-api.ts`: Analytics/reporting API client
  - `forms-api.ts`: Form builder API client
  - `date-utils.ts`: Date formatting utilities

**.planning/phases/**

- Purpose: Phase-by-phase implementation documentation
- Contains: Phase plans, summaries, research, UAT checklists
- Key files:
  - `{NN}-{phase-name}/{NN}-{task}-PLAN.md`: Task implementation plans
  - `{NN}-{phase-name}/{NN}-{task}-SUMMARY.md`: Completion summaries
  - `{NN}-{phase-name}/{NN}-CONTEXT.md`: Phase overview
  - `{NN}-{phase-name}/{NN}-VERIFICATION.md`: Testing checklist

**00-PLATFORM/**

- Purpose: Platform-wide strategy and architectural decisions
- Contains: Vision document, working decisions, PRD template
- Key files:
  - `01-PLATFORM-VISION.md`: Architecture and competitive positioning
  - `WORKING-DECISIONS.md`: All product decisions from discovery
  - `PRD-TEMPLATE.md`: Standard template for new PRDs
  - `AI-FIRST-CHECKLIST.md`: Design validation checklist

**01-SHARED-INFRASTRUCTURE/**

- Purpose: Technical specifications for cross-platform features
- Contains: Auth, AI, testing, data model specifications
- Key files:
  - `TECH-SPEC-AUTH-MULTITENANCY.md`: SSO, JWT, RLS, RBAC
  - `TECH-SPEC-AI-INTEGRATION.md`: Claude API patterns
  - `CORE-DATA-MODEL.md`: Shared entities (User, Employee, Organization)
  - `TESTING-STRATEGY.md`: Test pyramid, coverage targets

**02-MODULES/**

- Purpose: Feature requirements and specifications
- Contains: Module-specific PRDs
- Key subdirectories:
  - `05-CASE-MANAGEMENT/`: Case and investigation specs
  - `09-POLICY-MANAGEMENT/`: Policy lifecycle specs
  - `07-ANALYTICS-REPORTING/`: Dashboard and reporting specs

**03-DEVELOPMENT/**

- Purpose: Development workflow resources
- Contains: Task logs, security guardrails, blockers
- Key files:
  - `SECURITY-GUARDRAILS.md`: Mandatory security requirements
  - `TASK-LOG.md`: Append-only log of completed tasks
  - `BLOCKERS.md`: Active blockers needing resolution

## Key File Locations

**Entry Points:**

- `apps/backend/src/main.ts`: Backend API server bootstrap
- `apps/frontend/src/app/layout.tsx`: Frontend root layout
- `apps/backend/prisma/seed.ts`: Database seeder

**Configuration:**

- `apps/backend/.env`: Backend environment variables
- `apps/frontend/.env.local`: Frontend environment variables
- `apps/backend/prisma/schema.prisma`: Database schema
- `apps/backend/src/config/configuration.ts`: Centralized config loader
- `docker-compose.yml`: Local development services

**Core Logic:**

- `apps/backend/src/modules/cases/cases.service.ts`: Case CRUD and business logic
- `apps/backend/src/modules/rius/rius.service.ts`: RIU immutability enforcement
- `apps/backend/src/modules/workflow/workflow-engine.service.ts`: State machine execution
- `apps/backend/src/modules/ai/ai.service.ts`: AI orchestration
- `apps/backend/src/common/middleware/tenant.middleware.ts`: Multi-tenancy enforcement

**Testing:**

- `apps/backend/src/**/*.spec.ts`: Unit tests (co-located with source)
- `apps/backend/test/**/*.e2e-spec.ts`: E2E tests
- `apps/frontend/src/**/*.test.tsx`: Component tests (co-located)
- `apps/frontend/e2e/**/*.spec.ts`: Playwright E2E tests

## Naming Conventions

**Files:**

- Controllers: `{entity}.controller.ts` (e.g., `cases.controller.ts`)
- Services: `{entity}.service.ts` (e.g., `cases.service.ts`)
- DTOs: `{action}-{entity}.dto.ts` (e.g., `create-case.dto.ts`)
- Tests: `{filename}.spec.ts` (backend), `{filename}.test.tsx` (frontend)
- Components: PascalCase `ComponentName.tsx`
- Pages: lowercase with hyphens `my-work/page.tsx` (Next.js convention)

**Directories:**

- Backend modules: lowercase with hyphens `investigation-notes/`
- Frontend components: lowercase `cases/`, `analytics/`
- Route groups: `(authenticated)/`, `(public)/` (Next.js App Router)

**Variables/Functions:**

- camelCase for functions and variables
- PascalCase for classes, interfaces, types, React components
- UPPER_SNAKE_CASE for constants and enum values

**Database:**

- snake_case for table names (`risk_intelligence_units`, `case_case_associations`)
- camelCase for Prisma model fields (`organizationId`, `createdAt`)

## Where to Add New Code

**New Backend Feature:**

- Primary code: `apps/backend/src/modules/{feature-name}/`
- Controller: `apps/backend/src/modules/{feature-name}/{feature-name}.controller.ts`
- Service: `apps/backend/src/modules/{feature-name}/{feature-name}.service.ts`
- DTOs: `apps/backend/src/modules/{feature-name}/dto/`
- Module: `apps/backend/src/modules/{feature-name}/{feature-name}.module.ts`
- Tests: `apps/backend/src/modules/{feature-name}/*.spec.ts`
- Register in: `apps/backend/src/app.module.ts` imports array

**New Frontend Page:**

- Route file: `apps/frontend/src/app/(authenticated)/{route}/page.tsx`
- Layout: `apps/frontend/src/app/(authenticated)/{route}/layout.tsx` (if needed)
- Add to navigation: `apps/frontend/src/lib/navigation.ts`

**New Component:**

- Feature-specific: `apps/frontend/src/components/{feature}/{ComponentName}.tsx`
- Shared: `apps/frontend/src/components/shared/{ComponentName}.tsx`
- UI primitive: `apps/frontend/src/components/ui/{component-name}.tsx`

**New API Client:**

- Implementation: `apps/frontend/src/lib/{feature}-api.ts`
- Import and use `apiClient` from `apps/frontend/src/lib/api.ts`

**Utilities:**

- Backend: `apps/backend/src/common/services/{utility}.service.ts`
- Frontend: `apps/frontend/src/lib/{utility}.ts`

**Database Schema Change:**

- Create migration: `npm run db:migrate` (generates migration file)
- Edit schema: `apps/backend/prisma/schema.prisma`
- Migration file: `apps/backend/prisma/migrations/{timestamp}_{description}/migration.sql`

**Shared Types:**

- Common types: `packages/types/src/{domain}.types.ts` (planned)
- Currently: Duplicated in `apps/backend/src/modules/{module}/dto/` and `apps/frontend/src/types/`

## Special Directories

**apps/backend/dist/**

- Purpose: Compiled JavaScript output
- Generated: Yes (via `npm run build`)
- Committed: No (.gitignored)

**apps/frontend/.next/**

- Purpose: Next.js build cache and output
- Generated: Yes (via `next build`)
- Committed: No (.gitignored)

**node_modules/**

- Purpose: NPM dependencies
- Generated: Yes (via `npm install`)
- Committed: No (.gitignored)

**apps/backend/prisma/migrations/**

- Purpose: Database migration SQL files
- Generated: Yes (via `prisma migrate dev`)
- Committed: Yes (version controlled)

**.planning/phases/**

- Purpose: Implementation phase documentation
- Generated: No (manually created by planning process)
- Committed: Yes (version controlled for project history)

**apps/frontend/public/**

- Purpose: Static assets (images, fonts, icons)
- Generated: No (manually added)
- Committed: Yes (version controlled)

**apps/backend/coverage/**

- Purpose: Jest test coverage reports
- Generated: Yes (via `npm run test:cov`)
- Committed: No (.gitignored)

**apps/frontend/e2e/test-results/**

- Purpose: Playwright test results and screenshots
- Generated: Yes (via `npm run e2e`)
- Committed: No (.gitignored)

---

_Structure analysis: 2026-02-13_
