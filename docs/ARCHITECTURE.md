# Ethico Risk Intelligence Platform - System Architecture

**Document Purpose:** High-level system architecture overview for development teams and technical stakeholders.

**Last Updated:** January 2026

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Application Architecture](#application-architecture)
4. [Data Architecture](#data-architecture)
5. [Security Architecture](#security-architecture)
6. [Integration Architecture](#integration-architecture)
7. [Infrastructure Architecture](#infrastructure-architecture)
8. [Key Technical Decisions](#key-technical-decisions)

---

## System Overview

### Platform Description

The Ethico Risk Intelligence Platform is a multi-tenant SaaS compliance management system designed with AI-first principles. It unifies ethics hotline intake, case management, investigations, disclosures, policy management, and analytics into a single platform.

### Two-Product Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ETHICO RISK INTELLIGENCE PLATFORM                        │
├─────────────────────────────────────┬───────────────────────────────────────┤
│         OPERATOR CONSOLE            │          CLIENT PLATFORM              │
│         (Ethico Internal)           │          (Customer-Facing)            │
├─────────────────────────────────────┼───────────────────────────────────────┤
│ Users:                              │ Users:                                │
│ • Hotline Operators                 │ • CCOs / Compliance Officers          │
│ • QA Reviewers                      │ • Investigators                       │
│ • Implementation Specialists        │ • HR / Legal                          │
│ • Support Team                      │ • Employees (Portal)                  │
├─────────────────────────────────────┼───────────────────────────────────────┤
│ Functions:                          │ Functions:                            │
│ • Phone intake                      │ • Case management                     │
│ • Multi-client management           │ • Investigation workflow              │
│ • AI-assisted note cleanup          │ • Disclosures & attestations          │
│ • QA review workflow                │ • Policy management                   │
│ • Client onboarding                 │ • Analytics & reporting               │
└─────────────────────────────────────┴───────────────────────────────────────┘
```

### Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS, TypeScript, Prisma ORM |
| Database | PostgreSQL 15+ with RLS, pgvector |
| Search | PostgreSQL FTS → Elasticsearch (future) |
| Cache | Redis 7 |
| Queue | BullMQ |
| AI | Anthropic Claude API (primary) |
| Real-time | Socket.io, Y.js (CRDT) |
| Infrastructure | Azure (App Service, Blob, Redis Cache) |

---

## Architecture Diagram

### High-Level System Architecture

```
                                    ┌─────────────────┐
                                    │   CDN / WAF     │
                                    │   (Cloudflare)  │
                                    └────────┬────────┘
                                             │
                        ┌────────────────────┼────────────────────┐
                        │                    │                    │
                        ▼                    ▼                    ▼
              ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
              │  Ethics Portal  │  │ Client Platform │  │Operator Console │
              │   (Next.js)     │  │   (Next.js)     │  │   (Next.js)     │
              └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
                       │                    │                    │
                       └────────────────────┼────────────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │     API Gateway         │
                              │   (Authentication)      │
                              └───────────┬─────────────┘
                                          │
                       ┌──────────────────┼──────────────────┐
                       │                  │                  │
                       ▼                  ▼                  ▼
             ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
             │  Core Services  │ │  AI Services    │ │ Integration Svc │
             │   (NestJS)      │ │  (Claude API)   │ │  (HRIS, SSO)    │
             └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
                      │                   │                   │
                      └───────────────────┼───────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
              ▼                           ▼                           ▼
    ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
    │   PostgreSQL    │        │     Redis       │        │  Azure Blob     │
    │   (Primary DB)  │        │ (Cache/Queue)   │        │  (Files)        │
    │   + pgvector    │        │                 │        │                 │
    └─────────────────┘        └─────────────────┘        └─────────────────┘
```

### Request Flow

```
User Request
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. CDN / WAF                                                            │
│    • DDoS protection, SSL termination, static asset caching             │
└─────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. Next.js Frontend (SSR/CSR)                                           │
│    • Server-side rendering for initial load                             │
│    • Client-side navigation after hydration                             │
│    • API routes proxy to backend                                        │
└─────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. API Gateway Layer                                                    │
│    • JWT validation                                                     │
│    • Rate limiting                                                      │
│    • Request logging                                                    │
└─────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. Tenant Middleware                                                    │
│    • Extract organization_id from JWT                                   │
│    • SET LOCAL app.current_organization = $1                            │
│    • Enable RLS policies                                                │
└─────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. Business Logic Layer (NestJS Modules)                                │
│    • Domain services                                                    │
│    • Workflow engine                                                    │
│    • AI service calls                                                   │
└─────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. Data Access Layer (Prisma)                                           │
│    • Repository pattern                                                 │
│    • RLS enforcement                                                    │
│    • Audit logging                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Application Architecture

### Frontend Architecture

```
apps/frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Authenticated routes
│   │   │   ├── cases/
│   │   │   ├── investigations/
│   │   │   ├── disclosures/
│   │   │   ├── policies/
│   │   │   └── analytics/
│   │   ├── (portal)/           # Ethics Portal routes
│   │   │   ├── report/
│   │   │   ├── status/
│   │   │   └── policies/
│   │   └── (operator)/         # Operator Console routes
│   │       ├── intake/
│   │       ├── qa/
│   │       └── clients/
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── common/             # Shared components
│   │   └── features/           # Feature-specific components
│   │
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # API client services
│   ├── stores/                 # Zustand state stores
│   ├── types/                  # TypeScript types
│   └── utils/                  # Utility functions
│
├── public/                     # Static assets
└── tailwind.config.ts
```

### Backend Architecture

```
apps/backend/
├── src/
│   ├── modules/
│   │   ├── auth/               # Authentication & authorization
│   │   ├── users/              # User management
│   │   ├── organizations/      # Tenant management
│   │   ├── cases/              # Case management
│   │   ├── investigations/     # Investigation workflow
│   │   ├── disclosures/        # COI, gifts, outside activities
│   │   ├── policies/           # Policy lifecycle
│   │   ├── attestations/       # Attestation tracking
│   │   ├── analytics/          # Reporting & dashboards
│   │   ├── ai/                 # AI service integration
│   │   ├── files/              # File storage
│   │   ├── notifications/      # Notification service
│   │   ├── search/             # Search service
│   │   └── integrations/       # HRIS, SSO integrations
│   │
│   ├── common/
│   │   ├── guards/             # Auth guards, RLS guards
│   │   ├── decorators/         # Custom decorators
│   │   ├── interceptors/       # Logging, transforms
│   │   ├── filters/            # Exception filters
│   │   ├── pipes/              # Validation pipes
│   │   └── middleware/         # Tenant middleware
│   │
│   ├── config/                 # Configuration
│   └── main.ts
│
├── prisma/
│   ├── schema.prisma           # Data model
│   ├── migrations/             # Migration files
│   └── seed.ts                 # Seed data
│
└── test/
    ├── unit/
    ├── integration/
    └── e2e/
```

### Module Communication

```
┌──────────────────────────────────────────────────────────────────┐
│                        EVENT BUS                                  │
│  (Domain events for cross-module communication)                   │
└───────────────────────────────┬──────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│    Cases      │      │  Disclosures  │      │   Policies    │
│    Module     │      │    Module     │      │    Module     │
├───────────────┤      ├───────────────┤      ├───────────────┤
│ case.created  │      │ disclosure.   │      │ policy.       │
│ case.assigned │      │   submitted   │      │   published   │
│ case.closed   │      │ disclosure.   │      │ attestation.  │
│               │      │   escalated   │      │   required    │
└───────┬───────┘      └───────┬───────┘      └───────┬───────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Notification Svc   │
                    │  (Event consumers)  │
                    └─────────────────────┘
```

---

## Data Architecture

### Multi-Tenancy Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MULTI-TENANCY                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Layer 1: PostgreSQL Row-Level Security (Database-enforced)              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  CREATE POLICY tenant_isolation ON cases                           │ │
│  │  USING (organization_id = current_setting('app.current_org')::uuid)│ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Layer 2: Application WHERE Clauses (Explicit, debuggable)               │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  prisma.case.findMany({ where: { organizationId } })               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Layer 3: Business Unit Filtering (Within-tenant subdivision)            │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  .andWhere('business_unit_id', IN, user.businessUnits)             │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Core Entity Relationships

```
                            ┌─────────────────┐
                            │  Organization   │
                            │  (Tenant Root)  │
                            └────────┬────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
           ▼                         ▼                         ▼
    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
    │    User     │          │  Employee   │          │  Category   │
    │ (Platform)  │          │   (HRIS)    │          │ (Taxonomy)  │
    └──────┬──────┘          └──────┬──────┘          └──────┬──────┘
           │                        │                        │
           │    ┌───────────────────┼─────────────────┐      │
           │    │                   │                 │      │
           ▼    ▼                   ▼                 ▼      ▼
    ┌─────────────────┐      ┌─────────────┐      ┌─────────────┐
    │      Case       │◄─────│   Subject   │      │   Policy    │
    │   (Container)   │      │  (Accused)  │      │ (Document)  │
    └────────┬────────┘      └─────────────┘      └──────┬──────┘
             │                                           │
    ┌────────┼────────┐                          ┌──────┴──────┐
    │        │        │                          │             │
    ▼        ▼        ▼                          ▼             ▼
┌───────┐┌───────┐┌───────────┐           ┌───────────┐ ┌───────────┐
│Invest-││Inter- ││Communica- │           │Attestation│ │ Campaign  │
│igation││action ││   tion    │           │           │ │           │
└───────┘└───────┘└───────────┘           └───────────┘ └───────────┘
```

### Audit Trail Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         UNIFIED AUDIT_LOG                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Single table for all entity changes (replaces fragmented activity logs) │
│                                                                          │
│  AUDIT_LOG                                                               │
│  ├── id: uuid                                                            │
│  ├── organization_id: uuid          ← Tenant isolation                   │
│  ├── entity_type: enum              ← CASE, DISCLOSURE, POLICY, etc.     │
│  ├── entity_id: uuid                ← Reference to changed entity        │
│  ├── action: string                 ← 'created', 'updated', etc.         │
│  ├── action_description: text       ← "John assigned case to Sarah"      │
│  ├── changes: jsonb                 ← { field: { old, new } }            │
│  ├── actor_user_id: uuid            ← Who made the change                │
│  ├── actor_type: enum               ← USER, SYSTEM, AI, INTEGRATION      │
│  ├── metadata: jsonb                ← Additional context                 │
│  └── created_at: timestamp          ← Immutable                          │
│                                                                          │
│  Benefits:                                                               │
│  • Single query for "all activity related to X"                          │
│  • Consistent schema for AI context extraction                           │
│  • Cross-entity timeline views                                           │
│  • Immutable (append-only)                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Analytics Data Flow

```
Source Tables                    Fact Tables                    Presentation
─────────────                    ───────────                    ────────────

┌─────────────┐                  ┌─────────────┐
│    Case     │──────┐           │  CaseFact   │──────┐
└─────────────┘      │           └─────────────┘      │
                     │                                │
┌─────────────┐      │           ┌─────────────┐      │         ┌─────────────┐
│Investigation│──────┼──Refresh──│DisclosureFact│─────┼─Query───│  Dashboard  │
└─────────────┘      │ (5 min)   └─────────────┘      │         │   Widgets   │
                     │                                │         └─────────────┘
┌─────────────┐      │           ┌─────────────┐      │
│ Disclosure  │──────┤           │AttestationFact│────┤         ┌─────────────┐
└─────────────┘      │           └─────────────┘      ├─Query───│   Reports   │
                     │                                │         └─────────────┘
┌─────────────┐      │           ┌─────────────┐      │
│ Attestation │──────┘           │  FormFact   │──────┘         ┌─────────────┐
└─────────────┘                  └─────────────┘      ──Query───│Board Reports│
                                                                └─────────────┘
```

---

## Security Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. SSO Login (Primary)                                                  │
│     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐    │
│     │   User   │────►│   IdP    │────►│  Verify  │────►│   JWT    │    │
│     │  Login   │     │(Azure AD)│     │  SAML    │     │  Issue   │    │
│     └──────────┘     └──────────┘     └──────────┘     └──────────┘    │
│                                                                          │
│  2. Email/Password (Fallback)                                            │
│     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐    │
│     │   User   │────►│  Verify  │────►│   MFA    │────►│   JWT    │    │
│     │  Login   │     │ Password │     │  Check   │     │  Issue   │    │
│     └──────────┘     └──────────┘     └──────────┘     └──────────┘    │
│                                                                          │
│  3. Anonymous Access (Ethics Portal)                                     │
│     ┌──────────┐     ┌──────────┐     ┌──────────┐                      │
│     │Anonymous │────►│  Access  │────►│ Limited  │                      │
│     │  Report  │     │   Code   │     │  Session │                      │
│     └──────────┘     └──────────┘     └──────────┘                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### JWT Token Structure

```
Access Token (15 min expiry)
├── sub: "user_uuid"
├── org: "organization_uuid"
├── role: "COMPLIANCE_OFFICER"
├── bus: ["business_unit_1", "business_unit_2"]
├── emp: "employee_uuid" (nullable)
├── isOp: false (true for operators)
├── iat: issued_at
└── exp: expires_at

Refresh Token (7 day expiry)
├── sub: "user_uuid"
├── fam: "token_family_uuid" (for rotation detection)
├── iat: issued_at
└── exp: expires_at
```

### Authorization Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RBAC + ABAC HYBRID                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Role-Based (RBAC):                                                      │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ SYSTEM_ADMIN    → Full platform access                             │ │
│  │ CCO             → All org data, configuration                      │ │
│  │ COMPLIANCE_OFF  → Cases, investigations, disclosures               │ │
│  │ INVESTIGATOR    → Assigned cases only                              │ │
│  │ EMPLOYEE        → Own submissions, policies                        │ │
│  │ OPERATOR        → Cross-tenant (Ethico staff only)                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Attribute-Based (ABAC) Filters:                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ • Business Unit: user.businessUnits ∩ case.businessUnit            │ │
│  │ • Region/Location: user.locations ∩ case.location                  │ │
│  │ • Category: user.categories ∩ case.category                        │ │
│  │ • Sensitivity: user.clearance >= case.sensitivity                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Architecture

### HRIS Integration

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HRIS INTEGRATION                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐                         ┌─────────────────┐        │
│  │   HRIS Systems  │                         │  Ethico Platform│        │
│  │                 │                         │                 │        │
│  │ • Workday       │                         │ ┌─────────────┐ │        │
│  │ • BambooHR      │◄────── Merge.dev ──────►│ │  Employee   │ │        │
│  │ • ADP           │      (Unified API)      │ │   Table     │ │        │
│  │ • UKG           │                         │ └─────────────┘ │        │
│  │ • SAP SF        │                         │                 │        │
│  └─────────────────┘                         └─────────────────┘        │
│                                                                          │
│  Sync Strategy:                                                          │
│  • Webhooks (preferred) - Real-time updates                              │
│  • Scheduled sync - Every 4-6 hours                                      │
│  • Full sync - Daily at 2 AM                                             │
│  • Manual import - Initial onboarding only                               │
│                                                                          │
│  Data Freshness Requirement: Current within 24 hours                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### SSO Integration

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SSO INTEGRATION                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Supported Providers:                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Protocol   │ Providers                        │ Use Case            ││
│  ├────────────┼──────────────────────────────────┼─────────────────────┤│
│  │ SAML 2.0   │ Azure AD, Okta, OneLogin, ADFS   │ Enterprise SSO      ││
│  │ OIDC       │ Azure AD, Okta, Google Workspace │ Enterprise SSO      ││
│  │ OAuth 2.0  │ Google, Microsoft 365            │ SMB / Self-service  ││
│  │ Magic Link │ Email-based                      │ Fallback            ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  JIT Provisioning:                                                       │
│  • Auto-create user on first SSO login                                   │
│  • Sync role/group mappings from IdP                                     │
│  • Link to Employee record via email match                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### AI Service Integration

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI SERVICE LAYER                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                      ┌─────────────────────────┐                        │
│                      │    AI Service Module    │                        │
│                      │   (Rate limiting, retry)│                        │
│                      └───────────┬─────────────┘                        │
│                                  │                                       │
│              ┌───────────────────┼───────────────────┐                  │
│              │                   │                   │                  │
│              ▼                   ▼                   ▼                  │
│     ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐        │
│     │ Claude Provider │ │ Azure OpenAI   │ │ Self-Hosted LLM │        │
│     │   (Primary)     │ │   (Fallback)   │ │   (Enterprise)  │        │
│     └─────────────────┘ └─────────────────┘ └─────────────────┘        │
│                                                                          │
│  Use Cases:                                                              │
│  ├── Note cleanup (operator → formal narrative)                          │
│  ├── Summary generation (case, investigation)                            │
│  ├── Category suggestion (real-time during intake)                       │
│  ├── Policy Q&A (chatbot)                                                │
│  ├── Translation (reports, policies)                                     │
│  └── Board report generation                                             │
│                                                                          │
│  Guardrails:                                                             │
│  ├── Never mix data from multiple tenants in prompts                     │
│  ├── All AI outputs logged to AI_CONVERSATION                            │
│  ├── Rate limiting per organization (100 calls/min)                      │
│  └── All outputs editable by users                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Infrastructure Architecture

### Azure Deployment

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AZURE INFRASTRUCTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Production Environment:                                                 │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  Azure Front Door (Global Load Balancer, WAF, CDN)                  ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                              │                                           │
│              ┌───────────────┼───────────────┐                          │
│              │               │               │                          │
│              ▼               ▼               ▼                          │
│  ┌─────────────────┐┌─────────────────┐┌─────────────────┐             │
│  │  App Service    ││  App Service    ││  App Service    │             │
│  │  (Frontend)     ││  (API)          ││  (Worker)       │             │
│  │  Next.js SSR    ││  NestJS         ││  BullMQ Jobs    │             │
│  │  Scale: 2-10    ││  Scale: 2-20    ││  Scale: 1-5     │             │
│  └─────────────────┘└─────────────────┘└─────────────────┘             │
│                              │                                           │
│              ┌───────────────┼───────────────┐                          │
│              │               │               │                          │
│              ▼               ▼               ▼                          │
│  ┌─────────────────┐┌─────────────────┐┌─────────────────┐             │
│  │ Azure Database  ││ Azure Cache     ││ Azure Blob      │             │
│  │ for PostgreSQL  ││ for Redis       ││ Storage         │             │
│  │ (Flexible)      ││                 ││ (Hot/Cool tiers)│             │
│  │ + pgvector      ││                 ││                 │             │
│  └─────────────────┘└─────────────────┘└─────────────────┘             │
│                                                                          │
│  Monitoring: Application Insights, Log Analytics                         │
│  Secrets: Azure Key Vault                                                │
│  CI/CD: GitHub Actions → Azure DevOps                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### File Storage

```
Azure Blob Storage
├── tenant-{organizationId}/
│   ├── cases/{caseId}/
│   │   ├── {fileId}.pdf
│   │   ├── {fileId}_thumb.jpg
│   │   └── metadata.json
│   ├── policies/{policyId}/
│   │   ├── {version}.docx
│   │   └── {version}.pdf
│   ├── disclosures/{disclosureId}/
│   └── imports/{importId}/
│
└── system/
    ├── templates/
    └── default-branding/

Access Control:
1. Container-level ACL (tenant isolation)
2. RLS on File metadata table
3. Entity-level permissions
4. Business unit filter
5. Time-limited SAS tokens for download (5 min expiry)
```

---

## Key Technical Decisions

| ID | Area | Decision | Rationale |
|----|------|----------|-----------|
| A.1 | Data | User/Employee separation | Most employees never log in |
| A.2 | Data | Unified AUDIT_LOG | Single source for activity timeline |
| A.3 | Data | Shared workflow engine | Avoid duplicating state machine logic |
| B.1 | Security | RLS + App layer isolation | Defense in depth |
| B.2 | Storage | Per-tenant containers | Physical isolation of files |
| B.3 | Analytics | Fact tables + materialized views | Balance freshness vs. performance |
| C.1 | API | REST + OpenAPI | Standard, tooling support |
| C.2 | Auth | Short access + long refresh | Security + UX balance |
| C.3 | HRIS | Merge.dev integration platform | Unified API for 40+ HRIS systems |
| D.1 | Queue | BullMQ | Mature, Redis-based, TypeScript native |
| D.2 | Cache | Minimal caching | Avoid stale data bugs |
| D.3 | Real-time | Socket.io + Y.js | Presence + collaborative editing |
| F.1 | Frontend | shadcn/ui + Tailwind | Modern, accessible, customizable |
| F.2 | i18n | English admin, multi-lang content | Focus translation budget on users |

---

## Reference Documents

| Document | Purpose |
|----------|---------|
| `00-PLATFORM/01-PLATFORM-VISION.md` | Strategic vision and competitive positioning |
| `00-PLATFORM/WORKING-DECISIONS.md` | All product decisions with rationale |
| `00-PLATFORM/AI-FIRST-CHECKLIST.md` | Design validation checklist |
| `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` | Core entity schemas |
| `01-SHARED-INFRASTRUCTURE/ANALYTICS-DATA-MODEL.md` | Fact tables and analytics schemas |
| `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md` | Auth and RLS details |
| `01-SHARED-INFRASTRUCTURE/TECH-SPEC-HRIS-INTEGRATION.md` | HRIS sync specification |
| `00-PLATFORM/UI-UX-DESIGN-SYSTEM.md` | UI/UX patterns and components |

---

*End of Architecture Document*
