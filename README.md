# Ethico Risk Intelligence Platform

"HubSpot for Compliance" - A unified, AI-native Risk Intelligence Platform that consolidates ethics hotline intake, case management, investigations, disclosures, policy management, and analytics into a single modern platform.

## Development Setup

### Prerequisites

- Node.js 20.x LTS
- Docker and Docker Compose
- npm 10.x

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Start infrastructure (PostgreSQL, Redis, Elasticsearch, Mailhog)
docker-compose up -d

# 4. Run database migrations
npm run db:migrate

# 5. Seed development data
npm run db:seed

# 6. Start development servers
npm run dev
```

### Verify Installation

| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | http://localhost:3000/health | NestJS API |
| Frontend | http://localhost:5173 | Next.js App |
| Mailhog | http://localhost:8025 | Email testing UI |
| Elasticsearch | http://localhost:9200 | Search engine |

### Development Commands

```bash
# Development
npm run dev               # Start all services
npm run dev:backend       # Backend only (port 3000)
npm run dev:frontend      # Frontend only (port 5173)

# Database
npm run db:migrate        # Run migrations
npm run db:seed           # Seed test data
npm run db:studio         # Prisma Studio GUI
npm run db:generate       # Regenerate Prisma client

# Testing
npm run test              # All tests
npm run test:backend      # Backend tests
npm run test:frontend     # Frontend tests
npm run test:e2e          # E2E tests

# Code Quality
npm run lint              # Lint all packages
npm run typecheck         # Type check all packages
```

### Test Credentials (Development)

After running `npm run db:seed`:

| Email | Password | Role |
|-------|----------|------|
| admin@acme.local | Password123! | SYSTEM_ADMIN |
| compliance@acme.local | Password123! | COMPLIANCE_OFFICER |

---

## Documentation

### Platform Foundation
| Document | Purpose |
|----------|---------|
| [Platform Vision](00-PLATFORM/01-PLATFORM-VISION.md) | Architecture, entity model, platform strategy |
| [Working Decisions](00-PLATFORM/WORKING-DECISIONS.md) | All product decisions from discovery sessions |

### Shared Infrastructure
| Document | Purpose |
|----------|---------|
| [Auth & Multi-tenancy](01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md) | SSO, JWT, PostgreSQL RLS, RBAC |
| [AI Integration](01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-INTEGRATION.md) | Claude API patterns, prompts, rate limiting |
| [Real-time Collaboration](01-SHARED-INFRASTRUCTURE/TECH-SPEC-REALTIME-COLLABORATION.md) | WebSocket, Y.js CRDT |
| [Infrastructure](01-SHARED-INFRASTRUCTURE/INFRASTRUCTURE-SPEC.md) | DevOps, CI/CD, Azure/AWS configuration |
| [Testing Strategy](01-SHARED-INFRASTRUCTURE/TESTING-STRATEGY.md) | Test pyramid, coverage targets, performance benchmarks |

### Module PRDs (Development Priority Order)

| PRD | Module | Priority | Phase |
|-----|--------|----------|-------|
| PRD-005 | [Case Management](02-MODULES/05-CASE-MANAGEMENT/PRD.md) | P0 | Phase 1 |
| PRD-006 | [Disclosures](02-MODULES/06-DISCLOSURES/PRD.md) | P0 | Phase 1 |
| PRD-004 | [Web Form Configuration](02-MODULES/04-WEB-FORM-CONFIGURATION/PRD.md) | P0 | Phase 1 |
| PRD-003 | [Ethics Portal](02-MODULES/03-ETHICS-PORTAL/PRD.md) | P0 | Phase 1 |
| PRD-008 | [Employee Chatbot](02-MODULES/08-EMPLOYEE-CHATBOT/PRD.md) | P1 | Phase 2 |
| PRD-009 | [Policy Management](02-MODULES/09-POLICY-MANAGEMENT/PRD.md) | P1 | Phase 2 |
| PRD-007 | [Analytics & Reporting](02-MODULES/07-ANALYTICS-REPORTING/) | P1 | Phase 2 |
| PRD-002 | [Operator Console](02-MODULES/02-OPERATOR-CONSOLE/) | P1 | Phase 2 |

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    ETHICO RISK INTELLIGENCE PLATFORM            │
├─────────────────────────────────────────────────────────────────┤
│  OPERATOR CONSOLE          │         CLIENT PLATFORM            │
│  (Ethico Internal)         │         (Customer-Facing)          │
│  ├── Hotline Intake        │         ├── Case Management        │
│  ├── QA Workflow           │         ├── Investigations         │
│  └── Multi-Client Mgmt     │         ├── Disclosures            │
│                            │         ├── Policy Management      │
│                            │         ├── Analytics              │
│                            │         └── Employee Portal        │
├─────────────────────────────────────────────────────────────────┤
│                     SHARED INFRASTRUCTURE                       │
│  Auth/Multi-tenancy │ AI Services │ Real-time │ Search │ Storage│
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
Risk Intelligence Platform/
├── apps/
│   ├── backend/           # NestJS API
│   │   ├── src/
│   │   │   ├── modules/   # Feature modules
│   │   │   ├── common/    # Shared utilities
│   │   │   └── config/    # Configuration
│   │   └── prisma/        # Database schema
│   └── frontend/          # Next.js App
│       └── src/
│           ├── app/       # App Router pages
│           ├── components/# UI components
│           └── lib/       # Utilities
├── packages/
│   └── types/             # Shared TypeScript types
├── docker-compose.yml     # Local services
└── package.json           # Workspace root
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS 10, TypeScript, Prisma ORM |
| Database | PostgreSQL 15+ with pgvector, Row-Level Security |
| Search | Elasticsearch 8+ |
| Cache | Redis 7 |
| AI | Anthropic Claude API |
| Infrastructure | Azure (App Service, Blob Storage, Cognitive Search) |

## Multi-Tenancy

This platform uses PostgreSQL Row-Level Security (RLS) for tenant isolation:

- Every table includes `organization_id` column
- TenantMiddleware sets `app.current_organization` session variable
- RLS policies automatically filter queries by tenant
- Cache keys always prefixed with `org:{organizationId}:`

---

*Last Updated: January 2026*
