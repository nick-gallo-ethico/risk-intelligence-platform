# Codebase Structure

**Analysis Date:** 2026-02-02

## Directory Layout

```
Risk Intelligence Platform/
├── apps/
│   ├── backend/                              # NestJS API server
│   │   ├── src/
│   │   │   ├── main.ts                       # Application entry point
│   │   │   ├── app.module.ts                 # Root NestJS module
│   │   │   ├── config/
│   │   │   │   └── configuration.ts          # Configuration object from env vars
│   │   │   ├── common/                       # Shared infrastructure
│   │   │   │   ├── controllers/
│   │   │   │   │   └── activity.controller.ts # Audit log query endpoint
│   │   │   │   ├── decorators/               # Custom decorators
│   │   │   │   │   ├── current-user.decorator.ts
│   │   │   │   │   ├── roles.decorator.ts
│   │   │   │   │   ├── tenant-id.decorator.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── dto/                      # Common DTOs
│   │   │   │   │   ├── activity-query.dto.ts
│   │   │   │   │   ├── activity-response.dto.ts
│   │   │   │   │   ├── create-activity.dto.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts # Global error handler
│   │   │   │   ├── guards/                   # Route protection
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   ├── roles.guard.ts        # Role-based access control
│   │   │   │   │   ├── tenant.guard.ts       # Tenant context validation
│   │   │   │   │   └── index.ts
│   │   │   │   ├── middleware/
│   │   │   │   │   └── tenant.middleware.ts  # JWT → tenant context → RLS setup
│   │   │   │   ├── services/
│   │   │   │   │   ├── activity.service.ts   # Audit log management
│   │   │   │   │   ├── activity-description.service.ts # Natural language generation
│   │   │   │   │   ├── storage.service.ts    # File storage abstraction
│   │   │   │   │   ├── local-storage.adapter.ts
│   │   │   │   │   ├── storage.interface.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── activity.module.ts
│   │   │   │   ├── storage.module.ts
│   │   │   │   └── index.ts
│   │   │   └── modules/                      # Feature modules
│   │   │       ├── auth/
│   │   │       │   ├── auth.controller.ts    # POST /api/v1/auth/login, /refresh
│   │   │       │   ├── auth.service.ts
│   │   │       │   ├── auth.module.ts
│   │   │       │   ├── dto/
│   │   │       │   │   ├── login.dto.ts
│   │   │       │   │   ├── auth-response.dto.ts
│   │   │       │   │   └── index.ts
│   │   │       │   ├── interfaces/
│   │   │       │   │   └── jwt-payload.interface.ts # Token payload structure
│   │   │       │   └── strategies/
│   │   │       │       └── jwt.strategy.ts    # Passport JWT strategy
│   │   │       ├── users/
│   │   │       │   ├── users.controller.ts   # GET /api/v1/users, POST create
│   │   │       │   ├── users.service.ts
│   │   │       │   ├── users.module.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-user.dto.ts
│   │   │       │       ├── user-response.dto.ts
│   │   │       │       └── index.ts
│   │   │       ├── cases/
│   │   │       │   ├── cases.controller.ts   # GET/POST /api/v1/cases, /api/v1/cases/:id
│   │   │       │   ├── cases.service.ts      # Case CRUD, reference number generation
│   │   │       │   ├── cases.module.ts
│   │   │       │   ├── dto/
│   │   │       │   │   ├── create-case.dto.ts
│   │   │       │   │   ├── update-case.dto.ts
│   │   │       │   │   ├── case-query.dto.ts
│   │   │       │   │   ├── change-case-status.dto.ts
│   │   │       │   │   └── index.ts
│   │   │       │   └── index.ts
│   │   │       ├── investigations/
│   │   │       │   ├── investigations.controller.ts
│   │   │       │   ├── investigations.service.ts
│   │   │       │   ├── investigations.module.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-investigation.dto.ts
│   │   │       │       ├── investigation-response.dto.ts
│   │   │       │       └── index.ts
│   │   │       ├── investigation-notes/
│   │   │       │   ├── investigation-notes.controller.ts
│   │   │       │   ├── investigation-notes.service.ts
│   │   │       │   ├── investigation-notes.module.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-investigation-note.dto.ts
│   │   │       │       ├── investigation-note-query.dto.ts
│   │   │       │       └── index.ts
│   │   │       ├── attachments/
│   │   │       │   ├── attachments.controller.ts
│   │   │       │   ├── attachments.service.ts
│   │   │       │   ├── attachments.module.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-attachment.dto.ts
│   │   │       │       ├── attachment-response.dto.ts
│   │   │       │       └── index.ts
│   │   │       ├── prisma/
│   │   │       │   ├── prisma.service.ts     # Database connection + RLS control
│   │   │       │   └── prisma.module.ts
│   │   │       └── health/
│   │   │           ├── health.controller.ts  # GET /health
│   │   │           └── health.module.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma                 # Data models (entities + RLS policies)
│   │   │   ├── seed.ts                       # Test data seeding
│   │   │   └── migrations/                   # Database migration history
│   │   │       ├── 20260129213317_init/
│   │   │       ├── 20260129221829_add_rls_policies/
│   │   │       ├── 20260130012225_add_case_entity/
│   │   │       ├── 20260130024335_add_audit_log/
│   │   │       ├── 20260130041524_add_investigation/
│   │   │       ├── 20260130133120_add_investigation_note/
│   │   │       └── (more migrations...)
│   │   ├── examples/                         # CANONICAL PATTERNS - READ FIRST
│   │   │   ├── README.md                     # Pattern documentation
│   │   │   ├── entity-pattern.prisma         # Prisma model template
│   │   │   ├── service-pattern.ts            # NestJS service template
│   │   │   ├── controller-pattern.ts         # NestJS controller template
│   │   │   ├── dto-pattern.ts                # DTO template with validation
│   │   │   ├── test-pattern.spec.ts          # Unit test template
│   │   │   └── e2e-test-pattern.spec.ts      # E2E test with tenant isolation
│   │   ├── dist/                             # Compiled output (generated)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── jest.config.js
│   │   └── .eslintrc.json
│   │
│   └── frontend/                              # Next.js SPA
│       ├── src/
│       │   ├── app/                          # Next.js app router
│       │   │   ├── layout.tsx                # Root layout wrapper
│       │   │   ├── page.tsx                  # Dashboard home page
│       │   │   ├── providers.tsx             # Context providers setup
│       │   │   └── globals.css               # Global styles
│       │   ├── components/                   # React components
│       │   │   ├── cases/                    # Case-related components
│       │   │   │   ├── case-form.tsx
│       │   │   │   ├── case-list.tsx
│       │   │   │   ├── case-detail.tsx
│       │   │   │   └── (more components...)
│       │   │   ├── investigations/           # Investigation components
│       │   │   │   ├── investigation-form.tsx
│       │   │   │   ├── investigation-detail.tsx
│       │   │   │   └── (more components...)
│       │   │   ├── dashboard/                # Dashboard widgets
│       │   │   ├── files/                    # File upload/management
│       │   │   ├── rich-text/                # Rich text editor
│       │   │   └── ui/                       # shadcn/ui components
│       │   ├── contexts/
│       │   │   └── auth-context.tsx          # Auth state management (tokens, user)
│       │   ├── hooks/
│       │   │   ├── use-case-filters.ts       # Case filtering logic
│       │   │   ├── use-case-form-draft.ts    # Form draft persistence
│       │   │   └── use-draft.ts              # Generic draft hook
│       │   ├── lib/
│       │   │   ├── api.ts                    # Axios client with auth interceptor
│       │   │   ├── auth-storage.ts           # Token persistence (localStorage)
│       │   │   ├── cases-api.ts              # Case API calls
│       │   │   ├── investigation-api.ts      # Investigation API calls
│       │   │   ├── investigation-notes-api.ts
│       │   │   ├── attachments-api.ts
│       │   │   ├── users-api.ts
│       │   │   ├── activity-icons.tsx        # Audit log icon mappings
│       │   │   ├── date-utils.ts
│       │   │   └── utils.ts
│       │   ├── types/
│       │   │   ├── activity.ts
│       │   │   ├── attachment.ts
│       │   │   ├── auth.ts
│       │   │   ├── case.ts
│       │   │   ├── investigation.ts
│       │   │   ├── user.ts
│       │   │   └── (more types...)
│       │   └── test/
│       │       └── setup.ts                  # Vitest configuration
│       ├── e2e/
│       │   ├── tests/                        # Playwright E2E tests
│       │   ├── pages/                        # Page object models
│       │   └── fixtures/                     # Test fixtures
│       ├── .next/                            # Next.js build output (generated)
│       ├── node_modules/                     # Dependencies (not committed)
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.js
│       ├── tailwind.config.ts
│       └── .eslintrc.json
│
├── packages/
│   └── types/                                 # Shared type definitions
│       ├── package.json
│       └── (type files - planned)
│
├── .planning/                                 # GSD planning documents
│   ├── codebase/                             # Architecture analysis (this folder)
│   │   ├── ARCHITECTURE.md
│   │   └── STRUCTURE.md (this file)
│   ├── research/
│   └── (planning files)
│
├── 00-PLATFORM/                              # Product specifications
│   ├── 01-PLATFORM-VISION.md
│   ├── WORKING-DECISIONS.md
│   ├── MEGA-PROMPT-FEB-2026.md
│   └── (other vision docs)
│
├── 01-SHARED-INFRASTRUCTURE/                 # Cross-module tech specs
│   ├── TECH-SPEC-AUTH-MULTITENANCY.md
│   ├── TECH-SPEC-AI-INTEGRATION.md
│   ├── INFRASTRUCTURE-SPEC.md
│   └── (other specs)
│
├── 02-MODULES/                               # Feature PRDs
│   ├── 02-OPERATOR-CONSOLE/
│   ├── 03-ETHICS-PORTAL/
│   ├── 04-WEB-FORM-CONFIGURATION/
│   ├── 05-CASE-MANAGEMENT/
│   ├── 06-DISCLOSURES/
│   ├── 07-ANALYTICS-REPORTING/
│   ├── 08-EMPLOYEE-CHATBOT/
│   ├── 09-POLICY-MANAGEMENT/
│   └── (more modules...)
│
├── 03-DEVELOPMENT/                          # Development tracking
│   ├── SECURITY-GUARDRAILS.md
│   ├── RALPH-TASKS-SLICE-*.md
│   ├── TASK-LOG.md
│   └── BLOCKERS.md
│
├── docker-compose.yml                        # Local dev environment
├── .git/                                     # Git repository
├── .github/workflows/                        # CI/CD workflows
├── .husky/                                   # Git hooks
├── .claude/                                  # Claude Code configuration
├── CLAUDE.md                                 # Project instructions for Claude
├── PROJECT.md                                # Project overview document
└── package.json                              # Root workspace definition
```

## Directory Purposes

**`apps/backend/src/`:**
- Purpose: Core API server using NestJS framework
- Contains: Feature modules, infrastructure, configuration
- Key patterns: One module per feature, service + controller per entity, dependency injection

**`apps/backend/src/common/`:**
- Purpose: Shared cross-module infrastructure (not feature-specific)
- Contains: Guards, middleware, decorators, global filters, shared services (activity, storage)
- Usage: Imported by all modules, not module-specific

**`apps/backend/src/modules/`:**
- Purpose: Feature modules - each module is self-contained
- Contains: Service (business logic), Controller (HTTP handler), Module (NestJS wiring), DTO (validation)
- Pattern: One folder per entity/feature, no cross-module imports except to common

**`apps/backend/prisma/`:**
- Purpose: Database schema and migrations
- Contains: Prisma schema file (entities + RLS policies), migration files, seed script
- Updates: Schema changes tracked in migrations, never modify manually

**`apps/backend/examples/`:**
- Purpose: Canonical patterns for new code
- Contains: Templates for services, controllers, DTOs, tests, Prisma models
- Usage: MUST follow these patterns when creating new entities/features

**`apps/frontend/src/app/`:**
- Purpose: Next.js app router pages and layouts
- Contains: Page files (page.tsx), layout wrapper, provider setup
- Pattern: File-based routing, special file names (page.tsx, layout.tsx, error.tsx)

**`apps/frontend/src/components/`:**
- Purpose: React components organized by feature
- Contains: Feature-specific component folders (cases, investigations, etc.), UI folder (shadcn/ui)
- Pattern: One folder per feature, components export ready for use

**`apps/frontend/src/lib/`:**
- Purpose: Utility functions and API clients
- Contains: API client configuration (axios), API call wrappers per entity, helpers
- Pattern: `*-api.ts` files wrap API calls, `*-utils.ts` for generic helpers

**`apps/frontend/src/contexts/`:**
- Purpose: React context for state management
- Contains: AuthContext (tokens, current user), other global state
- Pattern: Context + custom hooks for managing state

**`apps/frontend/src/types/`:**
- Purpose: TypeScript type definitions
- Contains: Entity types, API response types, component props interfaces
- Pattern: One file per entity type, matches backend Prisma models

## Key File Locations

**Entry Points:**
- `apps/backend/src/main.ts`: Backend application startup
- `apps/frontend/src/app/layout.tsx`: Frontend root layout
- `apps/frontend/src/app/page.tsx`: Frontend home page

**Configuration:**
- `apps/backend/src/config/configuration.ts`: Environment variables → config object
- `apps/frontend/.env.local`: Frontend environment (NEXT_PUBLIC_API_URL, etc.)
- `docker-compose.yml`: Local development services (PostgreSQL, Redis, Elasticsearch)

**Core Logic:**
- `apps/backend/src/common/middleware/tenant.middleware.ts`: Organization context extraction
- `apps/backend/src/modules/cases/cases.service.ts`: Case business logic
- `apps/backend/src/common/services/activity.service.ts`: Audit logging
- `apps/frontend/src/lib/api.ts`: API client with token refresh

**Testing:**
- `apps/backend/src/**/*.spec.ts`: Unit tests (co-located with source)
- `apps/backend/src/**/*.e2e.spec.ts`: E2E tests
- `apps/frontend/src/test/setup.ts`: Vitest configuration
- `apps/frontend/e2e/`: Playwright E2E tests

**Database:**
- `apps/backend/prisma/schema.prisma`: All entity models and relationships
- `apps/backend/prisma/migrations/`: Timestamped migration files

## Naming Conventions

**Files:**
- Services: `{entity}.service.ts` (e.g., `cases.service.ts`)
- Controllers: `{entity}.controller.ts` (e.g., `cases.controller.ts`)
- Modules: `{entity}.module.ts` (e.g., `cases.module.ts`)
- DTOs: `{action}-{entity}.dto.ts` (e.g., `create-case.dto.ts`, `case-query.dto.ts`)
- Tests: `{entity}.spec.ts` for unit, `{entity}.e2e.spec.ts` for E2E
- API wrappers: `{entity}-api.ts` (e.g., `cases-api.ts`)
- Hooks: `use-{feature}.ts` (e.g., `use-case-filters.ts`)
- Utilities: `{feature}-utils.ts` or `{feature}.ts`

**Directories:**
- Feature modules: kebab-case (e.g., `investigation-notes`, `case-management`)
- Domain folders: kebab-case, plural when collection (e.g., `src/modules`, `src/components/cases`)
- Type folders: `types/`, `dto/`, `interfaces/`

**Functions/Variables:**
- Services: camelCase, action prefix (e.g., `createCase()`, `findById()`)
- Components: PascalCase (e.g., `CaseForm`, `InvestigationDetail`)
- Hooks: camelCase, `use` prefix (e.g., `useCaseFilters`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_PAGE_SIZE`)
- Prisma enums: PascalCase (e.g., `UserRole`, `CaseStatus`)

## Where to Add New Code

**New Feature/Module:**

1. Backend:
   - Create folder: `apps/backend/src/modules/{feature-name}/`
   - Add files:
     - `{feature-name}.service.ts` (copy from `examples/service-pattern.ts`)
     - `{feature-name}.controller.ts` (copy from `examples/controller-pattern.ts`)
     - `{feature-name}.module.ts` (import service, controller)
     - `dto/{action}-{feature-name}.dto.ts` (copy from `examples/dto-pattern.ts`)
     - `{feature-name}.service.spec.ts` (copy from `examples/test-pattern.spec.ts`)
   - Register module in `apps/backend/src/app.module.ts` imports array
   - Add Prisma model to `apps/backend/prisma/schema.prisma` (copy from `examples/entity-pattern.prisma`)

2. Frontend:
   - Create folder: `apps/frontend/src/components/{feature-name}/`
   - Add components (Form, Detail, List, etc.)
   - Add API wrapper: `apps/frontend/src/lib/{feature-name}-api.ts`
   - Add types: `apps/frontend/src/types/{feature-name}.ts`
   - Add hooks if needed: `apps/frontend/src/hooks/use-{feature-name}.ts`

**New Endpoint:**
- Add method to service: `apps/backend/src/modules/{entity}/{entity}.service.ts`
- Add handler to controller: `apps/backend/src/modules/{entity}/{entity}.controller.ts`
- Add DTO if needed: `apps/backend/src/modules/{entity}/dto/{action}-{entity}.dto.ts`
- Add tests: `apps/backend/src/modules/{entity}/{entity}.spec.ts`
- Frontend wraps call: `apps/frontend/src/lib/{entity}-api.ts`

**Utilities/Helpers:**
- Shared (backend): `apps/backend/src/common/services/`
- Shared (frontend): `apps/frontend/src/lib/`
- Entity-specific (backend): `apps/backend/src/modules/{entity}/`
- Feature-specific (frontend): `apps/frontend/src/components/{feature}/`

## Special Directories

**`apps/backend/examples/`:**
- Purpose: Canonical patterns - MANDATORY to follow
- Generated: No (source of truth)
- Committed: Yes (reference templates)
- Update: Rare - changes require PR review and update all code matching pattern

**`apps/backend/dist/`:**
- Purpose: Compiled TypeScript output
- Generated: Yes (npm run build)
- Committed: No (in .gitignore)
- Usage: npm run start points to dist/

**`apps/frontend/.next/`:**
- Purpose: Next.js build output
- Generated: Yes (next build)
- Committed: No (in .gitignore)
- Usage: next start serves from .next/

**`apps/backend/prisma/migrations/`:**
- Purpose: Database migration history
- Generated: Yes (prisma migrate dev)
- Committed: Yes (source of truth for schema history)
- Usage: Replayed on database setup

**`.planning/codebase/`:**
- Purpose: Architecture analysis documents (generated by GSD mapper)
- Generated: Yes (by /gsd:map-codebase)
- Committed: Yes
- Update: Running /gsd:map-codebase overwrites these documents

**`03-DEVELOPMENT/`:**
- Purpose: Development task tracking
- Generated: Yes (as tasks are created/completed)
- Committed: Yes
- Update: Updated by developers/Ralph Loop as work progresses

