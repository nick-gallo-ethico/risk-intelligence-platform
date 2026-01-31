# Technology Stack

**Analysis Date:** 2026-01-30

## Languages

**Primary:**
- TypeScript 5.3.3 - Both backend and frontend
  - Backend: `apps/backend/tsconfig.json` with ES2021 target
  - Frontend: `apps/frontend/tsconfig.json` with ES2017 target

**Secondary:**
- JavaScript (configuration files, tooling)
- SQL (PostgreSQL)

## Runtime

**Environment:**
- Node.js 20.x (required: `>=20.0.0`) per `package.json` engines
- npm workspaces (monorepo structure)

**Package Manager:**
- npm 10+ (implied by Node.js 20.x)
- Lockfile: `package-lock.json` (present in root)

## Frameworks

**Backend:**
- NestJS 10.3.0 (`@nestjs/common`, `@nestjs/core`)
  - Purpose: API framework, dependency injection, decorators
  - CLI: `@nestjs/cli` 10.3.0
  - Schematics: `@nestjs/schematics` 10.1.0

**Frontend:**
- Next.js 14.1.0 (`apps/frontend/package.json`)
  - Purpose: React framework, server-side rendering, file-based routing
  - Port: 5173 (dev server)
  - Build: `next build`, start: `next start`

**UI Framework:**
- React 18.2.0 (frontend)
- shadcn/ui + Radix UI primitives (Tailwind CSS components)
  - `@radix-ui/react-checkbox` 1.3.3
  - `@radix-ui/react-dialog` 1.1.15
  - `@radix-ui/react-popover` 1.1.15
  - `@radix-ui/react-select` 2.2.6
  - `@radix-ui/react-tabs` 1.1.13

**Rich Text Editing:**
- Tiptap 3.18.0 (ProseMirror wrapper)
  - `@tiptap/react`
  - `@tiptap/starter-kit` (core editing)
  - `@tiptap/extension-link`
  - `@tiptap/extension-underline`
  - `@tiptap/extension-placeholder`
  - `@tiptap/extension-character-count`

**Testing:**
- Backend:
  - Jest 29.7.0 (runner)
  - ts-jest 29.1.1 (TypeScript support)
  - Supertest 6.3.4 (HTTP assertions for E2E)
  - `@nestjs/testing` 10.3.0 (NestJS test utilities)
  - Config: `jest` in backend `package.json`, E2E config at `test/jest-e2e.json`

- Frontend:
  - Vitest 1.2.1 (runner)
  - React Testing Library 14.1.2 (component testing)
  - `@testing-library/user-event` 14.6.1
  - Playwright 1.58.0 (E2E tests)
  - Config: `apps/frontend/vitest.config.mts`

**Build/Dev:**
- Vite 7.3.1 (frontend build, via Next.js)
- ts-loader 9.5.1 (TypeScript compilation)
- Prettier 3.2.2 (formatting)
- ESLint 8.56.0 (linting)
  - `@typescript-eslint/eslint-plugin` 6.18.0
  - `@typescript-eslint/parser` 6.18.0
  - `eslint-config-prettier` 9.1.0
  - `eslint-plugin-prettier` 5.1.2
  - `next lint` (frontend Next.js linting)
- Husky 9.0.0 (git hooks)
- lint-staged 15.2.0 (staged file linting)

**Styling:**
- Tailwind CSS 3.4.1
  - Config: `apps/frontend/tailwind.config.ts`
  - PostCSS 8.4.33 with `autoprefixer` 10.4.17
  - `tailwind-merge` 2.2.0, `tailwindcss-animate` 1.0.7 (utilities)

## Key Dependencies

**Critical Backend:**
- `@prisma/client` 5.8.0 - ORM for PostgreSQL
- `prisma` 5.8.0 - Migrations and code generation
- `passport` 0.7.0, `passport-jwt` 4.0.1 - JWT authentication
- `@nestjs/jwt` 10.2.0, `@nestjs/passport` 10.0.3 - NestJS auth
- `bcrypt` 5.1.1 - Password hashing
- `class-validator` 0.14.1, `class-transformer` 0.5.1 - DTO validation
- `uuid` 13.0.0 - UUID generation
- `sanitize-html` 2.17.0 - HTML sanitization
- `pino` 8.17.2, `pino-http` 9.0.0, `pino-pretty` 10.3.1 - Logging

**Critical Frontend:**
- `axios` 1.6.5 - HTTP client (configured in `apps/frontend/src/lib/api.ts`)
- `react-hook-form` 7.71.1 - Form state management
- `zod` 4.3.6 - Schema validation
- `@hookform/resolvers` 5.2.2 - React Hook Form integrations
- `sonner` 2.0.7 - Toast notifications
- `lucide-react` 0.312.0 - Icon library
- `date-fns` 4.1.0 - Date manipulation
- `clsx` 2.1.0 - Conditional CSS classes

**Infrastructure:**
- `reflect-metadata` 0.2.1 - Required by NestJS decorators
- `rxjs` 7.8.1 - Reactive programming (NestJS patterns)
- `@nestjs/config` 3.1.1 - Environment configuration
- `@nestjs/platform-express` 10.3.0 - Express adapter for NestJS

## Configuration

**Environment:**
- Environment file: `.env.example` (template in root)
- Loaded by: NestJS `ConfigModule.forRoot()` in `apps/backend/src/app.module.ts`
- Frontend env: Next.js `env` in `apps/frontend/next.config.js` (NEXT_PUBLIC_API_URL)
- Config service: `apps/backend/src/config/configuration.ts`

**Key Environment Variables:**
- `NODE_ENV` - development/production
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis cache connection
- `ELASTICSEARCH_URL` - Search engine connection
- `JWT_SECRET` - Signing key for JWT tokens (required in production)
- `JWT_ACCESS_TOKEN_EXPIRY` - Default: 15m
- `JWT_REFRESH_TOKEN_EXPIRY` - Default: 7d
- `BACKEND_URL`, `FRONTEND_URL` - Application URLs
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` - Email configuration
- `STORAGE_TYPE` - local (dev) or azure (prod)
- `STORAGE_PATH` - Local filesystem path for uploads
- `MAX_FILE_SIZE` - Default: 10MB
- `ALLOWED_MIME_TYPES` - Comma-separated MIME types
- `AZURE_STORAGE_CONNECTION_STRING` - For Azure Blob Storage (production)
- `AZURE_STORAGE_CONTAINER` - Azure container name (default: uploads)

**Build:**
- Backend: NestJS `nest build` → `dist/`
- Frontend: Next.js `next build` → `.next/`
- Tsconfig: Both apps have strict TypeScript compilation enabled

## Platform Requirements

**Development:**
- Node.js 20.0.0 or higher
- npm 10+ (bundled with Node.js 20)
- Docker & Docker Compose (for local services)
- Git (for version control and Husky hooks)

**Local Services (Docker Compose):**
- PostgreSQL 15 (`postgres:15`)
  - Container: ethico-postgres
  - Port: 5432
  - Credentials: ethico/ethico_dev
  - DB: ethico_dev
- Redis 7 (`redis:7-alpine`)
  - Container: ethico-redis
  - Port: 6379
- Elasticsearch 8.11.0 (`elasticsearch:8.11.0`)
  - Container: ethico-elasticsearch
  - Ports: 9200 (HTTP), 9300 (cluster)
  - Configuration: single-node, xpack.security disabled
  - Memory: 512m Java heap
- Mailhog (email testing)
  - Container: ethico-mailhog
  - Ports: 1025 (SMTP), 8025 (Web UI)

**Production:**
- Deployment target: Azure App Service (per CLAUDE.md)
- Database: Azure Database for PostgreSQL 15+
- Storage: Azure Blob Storage
- Search: Azure Cognitive Search (Elasticsearch alternative)
- Cache: Azure Redis Cache
- CI/CD: Not yet configured

---

*Stack analysis: 2026-01-30*
