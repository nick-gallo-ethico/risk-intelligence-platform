# Technology Stack

**Analysis Date:** 2026-02-02

## Languages

**Primary:**
- TypeScript 5.3.3 - All backend and frontend code
- JavaScript ES2017+ - Next.js configuration and utilities

**Secondary:**
- SQL - PostgreSQL 15+ database queries (via Prisma)

## Runtime

**Environment:**
- Node.js 20.x (required minimum)
- Next.js 14.1.0 (frontend SSR/SSG)
- NestJS 10.3.0 (backend framework)

**Package Manager:**
- npm (workspace-based monorepo)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 14.1.0 - React-based frontend framework with file-based routing
- NestJS 10.3.0 - TypeScript backend framework with dependency injection
- React 18.2.0 - UI component library

**Backend Utilities:**
- @nestjs/config 3.1.1 - Configuration management
- @nestjs/jwt 10.2.0 - JWT token generation and validation
- @nestjs/passport 10.0.3 - Authentication middleware
- @nestjs/swagger 7.4.2 - OpenAPI documentation generator
- @nestjs/platform-express 10.3.0 - HTTP request handlers

**Frontend UI Components:**
- shadcn/ui (Radix UI primitives + Tailwind CSS) - Component library
- @radix-ui/* 1.1-2.2 - Accessible UI primitives (dialog, select, tabs, checkbox, popover, collapsible)
- Tailwind CSS 3.4.1 - Utility-first CSS framework
- tailwind-merge 2.2.0 - Tailwind class conflict resolution

**Rich Text Editing:**
- @tiptap/react 3.18.0 - ProseMirror-based rich text editor
- @tiptap/starter-kit 3.18.0 - Common extensions bundle
- @tiptap/extension-* 3.18.0 - Character count, link, placeholder, underline

**Form Handling:**
- react-hook-form 7.71.1 - Performant form state management
- @hookform/resolvers 5.2.2 - Validation library bridges
- zod 4.3.6 - TypeScript-first schema validation
- class-validator 0.14.1 - Decorator-based validation (backend)
- class-transformer 0.5.1 - Object to class transformation (backend)

**Date/Time:**
- date-fns 4.1.0 - Lightweight date utilities
- react-day-picker 9.13.0 - Date picker component

**Utilities:**
- axios 1.6.5 - HTTP client (frontend and backend compatible)
- bcrypt 5.1.1 - Password hashing
- uuid 13.0.0 - UUID generation
- sanitize-html 2.17.0 - HTML sanitization (security)
- class-variance-authority 0.7.0 - Component variant system
- clsx 2.1.0 - CSS class name builder
- lucide-react 0.312.0 - Icon library
- sonner 2.0.7 - Toast notification system

**Testing:**
- Jest 29.7.0 - Unit testing framework (backend)
- ts-jest 29.1.1 - TypeScript support for Jest
- Vitest 1.2.1 - Lightning-fast unit testing (frontend)
- @testing-library/react 14.1.2 - React component testing utilities
- @testing-library/jest-dom 6.9.1 - DOM matchers
- Supertest 6.3.4 - HTTP assertion library (E2E tests)
- @playwright/test 1.58.0 - Browser-based E2E testing

**Build/Dev:**
- Vite 7.3.1 - Frontend build tool
- @vitejs/plugin-react 4.2.1 - React support for Vite
- ts-loader 9.5.1 - TypeScript loader for webpack
- ts-node 10.9.2 - TypeScript execution for Node.js
- source-map-support 0.5.21 - Stack trace mapping

## Key Dependencies

**Critical:**
- @prisma/client 5.8.0 - ORM for PostgreSQL (database abstraction)
- prisma 5.8.0 - Database toolkit and migrations

**Infrastructure:**
- reflect-metadata 0.2.1 - Decorator metadata for NestJS/class-validator
- rxjs 7.8.1 - Reactive programming library
- pino 8.17.2 - Structured JSON logging (production-grade)
- pino-http 9.0.0 - HTTP request logging middleware
- pino-pretty 10.3.1 - Pretty-printed logs (development)

**Authentication:**
- passport 0.7.0 - Authentication middleware framework
- passport-jwt 4.0.1 - JWT strategy for Passport
- @nestjs/mapped-types 2.1.0 - DTO transformation utilities

## Configuration

**Environment:**
- `.env` file (local development)
- `.env.example` template with sensible defaults
- Required vars documented in `configuration.ts`

**Build:**
- `tsconfig.json` (backend, NestJS ES2021 target)
- `tsconfig.json` (frontend, Next.js ES2017 target)
- `next.config.js` (Next.js configuration with API rewrites)
- `tailwind.config.ts` (Tailwind CSS theme and plugins)

## Platform Requirements

**Development:**
- Node.js 20.x or higher
- Docker + Docker Compose (for local services)
- PostgreSQL 15+ (via Docker or local installation)
- Redis 7+ (for caching, via Docker)
- Elasticsearch 8.11.0 (for search, via Docker)

**Local Services (docker-compose.yml):**
- `postgres:15` - Main application database
- `redis:7-alpine` - Cache layer
- `elasticsearch:8.11.0` - Search engine
- `mailhog/mailhog` - Local SMTP for email testing

**Production:**
- Azure App Service (planned deployment target per CLAUDE.md)
- Azure Database for PostgreSQL 15+
- Azure Blob Storage (file storage)
- Azure Cognitive Search (search backend)
- Redis 7+ (managed cache)

## Database

**Provider:** PostgreSQL 15+

**Connection:**
- Via Prisma ORM (`@prisma/client`)
- Connection string: `DATABASE_URL` environment variable
- Multi-tenancy: Row-Level Security (RLS) with `organization_id` isolation

**ORM:**
- Prisma with TypeScript client generation
- Schema: `apps/backend/prisma/schema.prisma`
- Migrations: Prisma migrate (`npx prisma migrate dev`)
- Seeding: `prisma/seed.ts` (TypeScript-based)

## Caching

**Provider:** Redis 7

**Client:** Node.js native Redis client (via Prisma extensions or direct connection)

**Configuration:**
- Connection: `REDIS_URL` environment variable
- Default: `redis://localhost:6379` (development)

## Search

**Provider:** Elasticsearch 8.11.0

**Configuration:**
- Endpoint: `ELASTICSEARCH_URL` environment variable
- Default: `http://localhost:9200` (development)
- Security: xpack.security disabled in development

## Logging

**Framework:** Pino 8.17.2

**Configuration:**
- Production: JSON structured logs (via `pino`)
- Development: Pretty-printed with colors (via `pino-pretty`)
- Log level: `LOG_LEVEL` environment variable (default: `debug`)

**HTTP Logging:** pino-http 9.0.0 middleware in NestJS

## Code Quality

**Linting:**
- ESLint 8.56.0 (TypeScript)
- eslint-plugin-prettier for Prettier integration
- Backend config: `apps/backend/.eslintrc.js`
- Frontend config: `apps/frontend/.eslintrc.json` (extends `next/core-web-vitals`)

**Formatting:**
- Prettier 3.2.2 (opinionated code formatter)
- Configuration: root `package.json` lint-staged config
- Applied to `.ts`, `.tsx`, `.json`, `.md` files

**Pre-commit Hooks:**
- Husky 9.0.0 - Git hooks framework
- lint-staged 15.2.0 - Run linters on staged files
- Hooks run: ESLint fix + Prettier on staged TypeScript and JSON files

**Type Checking:**
- TypeScript strict mode enabled
- Backend: ES2021 target, strict null checks, no implicit any
- Frontend: ES2017 target, strict mode, JSX preservation
- Path aliases configured in both tsconfig files

## Monorepo Structure

**Workspaces:**
- `apps/backend` - NestJS API
- `apps/frontend` - Next.js frontend SPA
- `packages/*` - Shared packages (types, utilities - not yet populated)

**Workspace Commands:**
- `npm run <command> -w apps/backend` - Run in backend workspace
- `npm run <command> -w apps/frontend` - Run in frontend workspace
- `npm run <command>` - Runs in all applicable workspaces

---

*Stack analysis: 2026-02-02*
