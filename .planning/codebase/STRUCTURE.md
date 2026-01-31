# Codebase Structure

**Analysis Date:** 2026-01-30

## Directory Layout

```
Risk Intelligence Platform/
├── .claude/                    # Claude Code configuration
├── .github/                    # GitHub Actions workflows
├── .husky/                     # Git hooks (lint-staged, type check)
├── .planning/
│   └── codebase/              # GSD-generated documentation (ARCHITECTURE.md, etc.)
├── 00-PLATFORM/               # Product/platform specs (external to code)
├── 01-SHARED-INFRASTRUCTURE/  # Infrastructure/auth/AI specs (external to code)
├── 02-MODULES/                # Module PRDs (external to code)
├── 03-DEVELOPMENT/            # Development resources, task logs (external to code)
├── apps/
│   ├── backend/               # NestJS API server
│   │   ├── src/
│   │   │   ├── app.module.ts             # Root NestJS module
│   │   │   ├── main.ts                   # Server bootstrap
│   │   │   ├── config/
│   │   │   │   └── configuration.ts      # Environment config
│   │   │   ├── common/                   # Shared infrastructure
│   │   │   │   ├── middleware/
│   │   │   │   │   └── tenant.middleware.ts    # RLS session setup
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guard.ts       # JWT validation
│   │   │   │   │   ├── tenant.guard.ts         # Tenant verification
│   │   │   │   │   └── roles.guard.ts          # RBAC enforcement
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── current-user.decorator.ts
│   │   │   │   │   ├── tenant-id.decorator.ts
│   │   │   │   │   └── roles.decorator.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── activity-query.dto.ts
│   │   │   │   │   ├── activity-response.dto.ts
│   │   │   │   │   └── create-activity.dto.ts
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts    # Global error formatting
│   │   │   │   ├── services/
│   │   │   │   │   ├── activity.service.ts         # Core audit logging
│   │   │   │   │   ├── activity-description.service.ts
│   │   │   │   │   ├── storage.service.ts          # File upload abstraction
│   │   │   │   │   ├── local-storage.adapter.ts    # Local file storage
│   │   │   │   │   └── storage.interface.ts
│   │   │   │   ├── activity.module.ts              # Cross-cutting activity module
│   │   │   │   └── storage.module.ts               # Cross-cutting storage module
│   │   │   └── modules/                # Feature modules
│   │   │       ├── auth/
│   │   │       │   ├── auth.module.ts
│   │   │       │   ├── auth.controller.ts
│   │   │       │   ├── auth.service.ts
│   │   │       │   ├── dto/
│   │   │       │   │   ├── login.dto.ts
│   │   │       │   │   ├── auth-response.dto.ts
│   │   │       │   │   └── index.ts
│   │   │       │   ├── interfaces/
│   │   │       │   │   └── jwt-payload.interface.ts
│   │   │       │   └── strategies/
│   │   │       │       └── jwt.strategy.ts
│   │   │       ├── prisma/
│   │   │       │   ├── prisma.module.ts
│   │   │       │   └── prisma.service.ts
│   │   │       ├── health/
│   │   │       │   ├── health.module.ts
│   │   │       │   └── health.controller.ts
│   │   │       ├── users/
│   │   │       │   ├── users.module.ts
│   │   │       │   ├── users.controller.ts
│   │   │       │   ├── users.service.ts
│   │   │       │   └── dto/
│   │   │       ├── cases/
│   │   │       │   ├── cases.module.ts
│   │   │       │   ├── cases.controller.ts             # HTTP routes
│   │   │       │   ├── cases.service.ts                # Business logic + full-text search
│   │   │       │   └── dto/
│   │   │       │       ├── create-case.dto.ts
│   │   │       │       ├── update-case.dto.ts
│   │   │       │       ├── case-query.dto.ts
│   │   │       │       └── index.ts
│   │   │       ├── investigations/
│   │   │       │   ├── investigations.module.ts
│   │   │       │   ├── investigations.controller.ts
│   │   │       │   ├── investigations.service.ts       # Status transitions, assignment history
│   │   │       │   └── dto/
│   │   │       │       ├── create-investigation.dto.ts
│   │   │       │       ├── update-investigation.dto.ts
│   │   │       │       ├── assign-investigation.dto.ts
│   │   │       │       └── ...
│   │   │       ├── investigation-notes/
│   │   │       │   ├── investigation-notes.module.ts
│   │   │       │   ├── investigation-notes.controller.ts
│   │   │       │   ├── investigation-notes.service.ts
│   │   │       │   └── dto/
│   │   │       └── attachments/
│   │   │           ├── attachments.module.ts
│   │   │           ├── attachments.controller.ts
│   │   │           ├── attachments.service.ts
│   │   │           └── dto/
│   │   ├── prisma/
│   │   │   ├── schema.prisma                  # Database schema (ALL entities, RLS, enums)
│   │   │   └── migrations/
│   │   │       ├── 20260129213317_init/       # Initial schema + RLS policies
│   │   │       ├── 20260129221829_add_rls_policies/
│   │   │       ├── 20260130012225_add_case_entity/
│   │   │       └── 20260130024335_add_audit_log/
│   │   ├── examples/                          # Reference implementations (patterns to follow)
│   │   │   ├── entity-pattern.prisma
│   │   │   ├── service-pattern.ts
│   │   │   ├── controller-pattern.ts
│   │   │   ├── dto-pattern.ts
│   │   │   ├── test-pattern.spec.ts
│   │   │   └── e2e-test-pattern.spec.ts
│   │   ├── dist/                              # Compiled output (generated)
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/               # Next.js React application
│       ├── src/
│       │   ├── app/                          # Next.js 14 App Router
│       │   │   ├── layout.tsx                # Root layout + Providers
│       │   │   ├── page.tsx                  # Dashboard/home
│       │   │   ├── globals.css
│       │   │   ├── login/
│       │   │   │   └── page.tsx
│       │   │   ├── cases/
│       │   │   │   ├── page.tsx              # Cases list
│       │   │   │   ├── new/
│       │   │   │   │   └── page.tsx          # New case form
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx          # Case detail + investigations
│       │   │   ├── dashboard/
│       │   │   │   └── page.tsx
│       │   │   └── settings/
│       │   │       └── users/
│       │   │           └── page.tsx
│       │   ├── components/                   # Reusable React components
│       │   │   ├── ui/                       # shadcn/ui base components (Button, Dialog, etc.)
│       │   │   ├── cases/                    # Case-specific components
│       │   │   │   ├── form-sections/        # Form subsections (Reporter, Location, etc.)
│       │   │   │   └── __tests__/
│       │   │   ├── investigations/           # Investigation-specific components
│       │   │   ├── rich-text/                # ProseMirror editor component
│       │   │   ├── files/                    # File upload/display components
│       │   │   ├── users/                    # User management components
│       │   │   └── dashboard/                # Dashboard-specific components
│       │   ├── hooks/                        # Custom React hooks
│       │   │   ├── use-case-form-draft.ts    # Draft management for case form
│       │   │   ├── use-case-filters.ts       # Filter state management
│       │   │   └── use-draft.ts              # Generic draft hook
│       │   ├── contexts/                     # React Context providers
│       │   │   └── (empty for now; will contain auth context, theme, etc.)
│       │   ├── lib/                          # Utilities and helpers
│       │   │   ├── api.ts                    # Axios client with interceptors + token refresh
│       │   │   ├── auth-storage.ts           # localStorage for JWT tokens
│       │   │   ├── api-*.ts                  # Domain-specific API clients (cases-api, investigation-api, etc.)
│       │   │   ├── date-utils.ts
│       │   │   ├── utils.ts
│       │   │   └── validations/
│       │   │       └── case-schema.ts        # Zod validation schemas
│       │   ├── types/                        # TypeScript type definitions
│       │   │   ├── auth.ts
│       │   │   ├── case.ts
│       │   │   ├── investigation.ts
│       │   │   ├── activity.ts
│       │   │   ├── user.ts
│       │   │   └── attachment.ts
│       │   ├── test/
│       │   │   └── setup.ts                  # Test configuration
│       │   └── providers.tsx                 # Client-side providers (Auth, Query, Theme)
│       ├── e2e/                              # Playwright E2E tests
│       │   ├── tests/                        # Test files
│       │   ├── pages/                        # Page objects for UI automation
│       │   ├── fixtures/                     # Test fixtures (users, data)
│       │   └── playwright.config.ts
│       ├── .next/                            # Build output (generated)
│       ├── next.config.js
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       ├── package.json
│       └── vitest.config.ts
└── docker-compose.yml                    # Local dev services (PostgreSQL, Redis, Mailhog)
└── package.json                          # Root workspace config
```

## Directory Purposes

**`.planning/codebase/`:**
- Purpose: Generated documentation for code navigation
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md
- Generated: Yes (by /gsd:map-codebase command)
- Committed: Yes

**`apps/backend/src/common/`:**
- Purpose: Cross-cutting infrastructure shared by all modules
- Contains: Middleware (tenant context), guards (auth, roles), decorators, DTOs, filters, services (activity, storage)
- Pattern: Modules import from `common` for reusable functionality

**`apps/backend/src/modules/`:**
- Purpose: Feature modules implementing domain logic
- Contains: One directory per feature (auth, cases, investigations, users, etc.)
- Pattern: Each module has controller, service, module file, and dto/ subdirectory

**`apps/backend/prisma/`:**
- Purpose: Database schema and migrations
- Contains: schema.prisma (source of truth for schema), migrations/ (immutable history of schema changes)
- Pattern: All changes via `npx prisma migrate dev` to generate new migration files

**`apps/frontend/src/app/`:**
- Purpose: Route definitions and page templates (Next.js App Router)
- Contains: layout.tsx (root layout), page.tsx files in route directories, globals.css
- Pattern: File-based routing; [id] syntax for dynamic routes

**`apps/frontend/src/components/`:**
- Purpose: Reusable React components
- Contains: Feature-specific subdirectories (cases, investigations, users, etc.), ui/ for shadcn/ui primitives
- Pattern: Each component is a single file or directory with index.ts export

**`apps/frontend/src/lib/`:**
- Purpose: Utility functions and adapters
- Contains: API client (axios), auth token storage, validation schemas, domain-specific API wrappers (cases-api.ts, investigation-api.ts)
- Pattern: Organized by concern (api.ts for HTTP, auth-storage.ts for tokens, validations/ for schemas)

**`apps/frontend/src/types/`:**
- Purpose: Shared TypeScript type definitions
- Contains: Domain types (Case, Investigation, User, etc.), mirroring backend entities
- Pattern: Types match API response shapes from backend DTOs

## Key File Locations

**Entry Points:**
- Backend server: `apps/backend/src/main.ts` - NestJS bootstrap
- Frontend app: `apps/frontend/src/app/layout.tsx` - Next.js root layout
- Database schema: `apps/backend/prisma/schema.prisma` - Single source of truth for entities

**Configuration:**
- Backend config: `apps/backend/src/config/configuration.ts` - Environment variable loading
- Frontend config: `apps/frontend/next.config.js`, `tailwind.config.js`
- TypeScript: `apps/backend/tsconfig.json`, `apps/frontend/tsconfig.json`
- Database: `apps/backend/prisma/schema.prisma`

**Core Logic:**
- Cases: `apps/backend/src/modules/cases/` (controller, service, DTO)
- Investigations: `apps/backend/src/modules/investigations/` (controller, service, DTO)
- Activity logging: `apps/backend/src/common/services/activity.service.ts`
- Tenant isolation: `apps/backend/src/common/middleware/tenant.middleware.ts`
- Auth: `apps/backend/src/modules/auth/` (JWT strategy, controller, service)

**Testing:**
- Backend unit tests: `apps/backend/src/modules/**/*.spec.ts`
- Backend E2E tests: `apps/backend/test/` (if exists)
- Frontend unit tests: `apps/frontend/src/components/**/__tests__/*.test.tsx`
- Frontend E2E tests: `apps/frontend/e2e/tests/*.spec.ts`

## Naming Conventions

**Files:**
- Services: `[feature].service.ts` (e.g., `cases.service.ts`)
- Controllers: `[feature].controller.ts` (e.g., `cases.controller.ts`)
- Modules: `[feature].module.ts` (e.g., `cases.module.ts`)
- DTOs: `[action]-[entity].dto.ts` (e.g., `create-case.dto.ts`, `update-case.dto.ts`)
- Query DTOs: `[entity]-query.dto.ts` (e.g., `case-query.dto.ts`)
- Tests: `[name].spec.ts` for unit, `[name].spec.ts` for E2E
- React components: PascalCase (e.g., `CaseForm.tsx`, `InvestigationDetails.tsx`)
- React hooks: `use[Feature].ts` (e.g., `useCaseFilters.ts`)
- API clients: `[feature]-api.ts` (e.g., `cases-api.ts`, `investigations-api.ts`)

**Directories:**
- Feature modules: kebab-case (e.g., `investigation-notes`, `auth`)
- Component groups: kebab-case (e.g., `form-sections`, `rich-text`)
- Test subdirectories: `__tests__`

## Where to Add New Code

**New Feature (e.g., Attestations):**
1. Create module directory: `apps/backend/src/modules/attestations/`
2. Add files:
   - `attestations.module.ts` - NestJS module importing PrismaModule
   - `attestations.controller.ts` - Routes with guards/decorators
   - `attestations.service.ts` - Business logic with organizationId filtering
   - `dto/` directory with CreateAttestationDto, UpdateAttestationDto, etc.
3. Register in `apps/backend/src/app.module.ts` imports
4. Frontend: Create page in `apps/frontend/src/app/attestations/page.tsx`
5. Frontend: Create API client `apps/frontend/src/lib/attestations-api.ts`
6. Frontend: Create components in `apps/frontend/src/components/attestations/`

**New Component/Module:**
- If standalone page: `apps/frontend/src/app/[feature]/page.tsx`
- If reusable component: `apps/frontend/src/components/[feature]/ComponentName.tsx`
- If hook: `apps/frontend/src/hooks/use[Feature].ts`

**Utilities:**
- Shared helpers: `apps/frontend/src/lib/` (for frontend) or `apps/backend/src/common/services/` (for backend)
- Validation schemas: `apps/frontend/src/lib/validations/[entity]-schema.ts`

## Special Directories

**`apps/backend/examples/`:**
- Purpose: Reference implementations for developers to follow
- Generated: No
- Committed: Yes
- Contains: entity-pattern.prisma, service-pattern.ts, controller-pattern.ts, etc. showing established patterns

**`apps/backend/dist/`:**
- Purpose: Compiled TypeScript output
- Generated: Yes (by `npm run build`)
- Committed: No

**`apps/frontend/.next/`:**
- Purpose: Next.js build cache and compiled pages
- Generated: Yes (by `npm run build`)
- Committed: No

**`apps/backend/prisma/migrations/`:**
- Purpose: Immutable history of schema changes
- Generated: Yes (by `npx prisma migrate dev`)
- Committed: Yes
- Pattern: Each migration is timestamped directory with `migration.sql` file containing SQL

---

*Structure analysis: 2026-01-30*
