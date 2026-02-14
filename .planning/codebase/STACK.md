# Technology Stack

**Analysis Date:** 2026-02-13

## Languages

**Primary:**

- TypeScript 5.3.3 - All application code (backend, frontend, shared types)
- JavaScript - Configuration files, build scripts

**Secondary:**

- SQL - Prisma migrations, PostgreSQL queries
- MJML - Email template markup

## Runtime

**Environment:**

- Node.js 20.0.0+ (detected: v25.4.0 installed)
- npm 11.7.0 (package manager)
- Lockfile: package-lock.json present

**Package Manager:**

- npm workspaces (monorepo structure)
- Workspaces: `apps/*`, `packages/*`

## Frameworks

**Core:**

- **Backend:** NestJS 10.3.0 - Enterprise Node.js framework with TypeScript, dependency injection, modular architecture
- **Frontend:** Next.js 14.1.0 - React framework with SSR, file-based routing, API routes
- **Ops Console:** Next.js 14.1.0 - Separate internal operations application
- **Shared Types:** `packages/types` - Shared TypeScript definitions across apps

**Testing:**

- Jest 29.7.0 - Backend unit/integration tests
- ts-jest 29.1.1 - TypeScript support for Jest
- Supertest 6.3.4 - Backend E2E/API tests
- Vitest 1.2.1 - Frontend unit tests
- @testing-library/react 14.1.2 - Frontend component testing
- Playwright 1.58.0 - Frontend E2E tests

**Build/Dev:**

- Vite 7.3.1 - Frontend build tool and dev server
- NestJS CLI 10.3.0 - Backend scaffolding and build
- TypeScript Compiler 5.3.3 - Type checking and compilation
- ts-node 10.9.2 - Backend development execution
- tsconfig-paths 4.2.0 - Path alias resolution

## Key Dependencies

**Critical:**

- **@prisma/client** 5.8.0 - Type-safe database ORM with code generation
- **@anthropic-ai/sdk** 0.72.1 - Anthropic Claude API integration for AI features
- **@elastic/elasticsearch** 9.2.1 - Full-text search and analytics
- **ioredis** 5.9.2 - Redis client for caching and job queues
- **socket.io** 4.8.3 - WebSocket server for real-time features
- **socket.io-client** 4.8.3 - WebSocket client (frontend)

**Infrastructure:**

- **bullmq** 5.67.2 + **@nestjs/bullmq** 11.0.4 - Job queue and background workers
- **cache-manager** 5.7.6 + **@nestjs/cache-manager** 2.3.0 - Caching abstraction layer
- **passport** 0.7.0 + **@nestjs/passport** 10.0.3 - Authentication middleware
- **passport-jwt** 4.0.1 - JWT authentication strategy
- **passport-google-oauth20** 2.0.0 - Google OAuth SSO
- **passport-azure-ad** 4.3.5 - Azure AD OAuth SSO
- **@node-saml/passport-saml** 5.1.0 - SAML SSO
- **@nestjs/jwt** 10.2.0 - JWT token generation/validation
- **bcrypt** 5.1.1 - Password hashing
- **otplib** 13.2.1 - TOTP for MFA

**Email & Notifications:**

- **@nestjs-modules/mailer** 2.0.2 - Email module for NestJS
- **nodemailer** 7.0.13 - SMTP email sending
- **mjml** 4.18.0 - Responsive email template markup language
- **handlebars** 4.7.8 - Email template engine

**Frontend UI:**

- **react** 18.2.0 + **react-dom** 18.2.0 - UI library
- **@radix-ui/react-\*** (multiple) - Headless UI primitives (dialogs, dropdowns, selects, etc.)
- **tailwindcss** 3.4.1 - Utility-first CSS framework
- **lucide-react** 0.312.0 - Icon library
- **@tanstack/react-query** 5.90.20 - Server state management and caching
- **@tanstack/react-table** 8.21.3 - Table/data grid component
- **react-hook-form** 7.71.1 + **@hookform/resolvers** 5.2.2 - Form handling
- **zod** 4.3.6 - Schema validation
- **axios** 1.13.4 - HTTP client
- **recharts** 3.7.0 - Charting library
- **@tiptap/react** 3.18.0 - Rich text editor (ProseMirror wrapper)
- **@dnd-kit/\*** - Drag and drop
- **sonner** 2.0.7 - Toast notifications
- **react-i18next** 16.5.4 + **i18next** 25.8.1 - Internationalization
- **@ducanh2912/next-pwa** 10.2.9 - Progressive Web App support
- **dexie** 3.2.7 + **dexie-encrypted** 2.0.0 - IndexedDB with encryption

**Validation & Transformation:**

- **class-validator** 0.14.1 - Backend DTO validation
- **class-transformer** 0.5.1 - Backend object transformation
- **ajv** 8.12.0 + **ajv-errors** 3.0.0 + **ajv-formats** 2.1.1 - JSON schema validation

**Utilities:**

- **date-fns** 4.1.0 - Date manipulation
- **nanoid** 3.3.11 - Unique ID generation
- **uuid** 13.0.0 - UUID generation
- **sanitize-html** 2.17.0 - HTML sanitization
- **csv-parser** 3.2.0 + **csv-parse** 6.1.0 - CSV parsing
- **exceljs** 4.4.0 - Excel file generation
- **xlsx** 0.18.5 - Excel file reading
- **puppeteer** 24.36.1 - PDF generation and browser automation
- **pptxgenjs** 4.0.1 - PowerPoint generation
- **json-rules-engine** 7.3.1 - Business rules engine
- **dataloader** 2.2.3 - Batch data loading (N+1 prevention)

**Logging & Monitoring:**

- **pino** 8.17.2 + **pino-http** 9.0.0 + **pino-pretty** 10.3.1 - Structured logging
- **helmet** 8.1.0 - Security headers middleware
- **@nestjs/throttler** 6.5.0 + **@nest-lab/throttler-storage-redis** 1.1.0 - Rate limiting
- **@bull-board/\*** 6.16.4 - Job queue dashboard UI

**Development:**

- **husky** 9.0.0 - Git hooks
- **lint-staged** 15.2.0 - Pre-commit linting
- **prettier** 3.2.2 - Code formatting
- **eslint** 8.56.0 + **@typescript-eslint/\*** 6.18.0 - Linting
- **@faker-js/faker** 10.2.0 - Test data generation
- **@nestjs/testing** 10.3.0 - NestJS test utilities

## Configuration

**Environment:**

- Configuration via `.env` files (dotenv pattern)
- **@nestjs/config** 3.1.1 for environment variable management
- Separate configs: `apps/backend/.env`, `apps/frontend/.env.local`
- Key configs: `DATABASE_URL`, `REDIS_URL`, `ELASTICSEARCH_NODE`, `ANTHROPIC_API_KEY`, `JWT_SECRET`, `SMTP_*`

**Build:**

- Backend: `apps/backend/tsconfig.json` (CommonJS, ES2021 target, decorators enabled)
- Frontend: `apps/frontend/tsconfig.json` (ESNext module, bundler resolution, JSX preserve for Next.js)
- Path aliases: `@/*`, `@common/*`, `@modules/*`, `@config/*` (backend), `@/*`, `@/components/*`, `@/lib/*` (frontend)
- Next.js config: `apps/frontend/next.config.js` (PWA, API proxying, strict mode)
- Tailwind config: `apps/frontend/tailwind.config.ts`, `apps/ops-console/tailwind.config.ts`
- PostCSS: `apps/frontend/postcss.config.js`

**Linting/Formatting:**

- Backend ESLint: `apps/backend/.eslintrc.js` (TypeScript recommended + Prettier)
- Frontend ESLint: `apps/frontend/.eslintrc.json` (Next.js core-web-vitals)
- Prettier via `eslint-plugin-prettier` and `lint-staged`
- Pre-commit hooks configured in root `package.json`

**Testing:**

- Backend unit tests: Jest config in `apps/backend/package.json`
- Backend E2E tests: `apps/backend/test/jest-e2e.json` (single worker, 30s timeout, global setup/teardown)
- Frontend unit tests: `apps/frontend/vitest.config.mts` (jsdom, globals, coverage)
- Frontend E2E tests: `apps/frontend/e2e/playwright.config.ts`

## Platform Requirements

**Development:**

- Node.js 20.0.0+
- PostgreSQL 15+ with pgvector extension
- Redis 7+
- Elasticsearch 8.11.0+
- Mailhog (SMTP testing) or equivalent
- Docker + Docker Compose (for local services)

**Production:**

- Node.js 20.0.0+ runtime
- Azure App Service (planned deployment target per docs)
- Azure Database for PostgreSQL 15+
- Azure Redis Cache
- Azure Blob Storage
- Azure Cognitive Search (Elasticsearch alternative)
- SMTP provider (SendGrid, SES, or similar)

---

_Stack analysis: 2026-02-13_
