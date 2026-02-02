# Ethico Risk Intelligence Platform

## What This Is

A unified, AI-native compliance management SaaS platform ("HubSpot for Compliance") that consolidates ethics hotline intake, case management, investigations, disclosures, policy management, and analytics into a single system. Built for healthcare compliance teams, competing against NAVEX, EQS/Conversant, and Case IQ through superior AI capabilities, unified experience, and modern configurability.

## Core Value

**Users can manage their entire compliance workflow—from anonymous report intake to investigation closure to board reporting—in one AI-assisted platform, with every task unified into a single "My Work" view.**

If everything else fails, this must work: the RIU→Case pipeline with AI-assisted investigations.

## Requirements

### Validated

Requirements that exist in the current codebase (~15% of platform):

- ✓ Multi-tenant isolation via PostgreSQL Row-Level Security (RLS) — Phase 0
- ✓ JWT authentication with access/refresh tokens — Phase 0
- ✓ Session tracking with multi-device support — Phase 0
- ✓ User CRUD with role-based access control — Phase 0
- ✓ Case CRUD with status tracking — Phase 0
- ✓ Investigation model with status tracking — Phase 0
- ✓ Investigation notes — Phase 0
- ✓ File attachments with storage abstraction — Phase 0
- ✓ Activity logging with natural language descriptions — Phase 0
- ✓ Full-text search for cases (PostgreSQL) — Phase 0
- ✓ Frontend case list and detail views — Phase 0
- ✓ Frontend investigation detail view — Phase 0
- ✓ NestJS modular backend architecture — Phase 0
- ✓ Next.js frontend with shadcn/ui — Phase 0
- ✓ Prisma ORM with migrations — Phase 0

### Active

Requirements for v1 (Q1 delivery). Strategic differentiation approach: MVP for commodity features, deep on differentiators (AI, unified assignment, dashboards).

**Core Entities (Foundation)**
- [ ] RiskIntelligenceUnit (RIU) entity with immutability enforcement
- [ ] Employee entity with HRIS sync support
- [ ] Category taxonomy system (configurable per tenant)
- [ ] BusinessUnit and Location entities
- [ ] Subject tracking for pattern detection
- [ ] Campaign and CampaignAssignment entities
- [ ] Policy entity with versioning

**Case Management (Complete)**
- [ ] RIU-Case many-to-many associations
- [ ] Case merge workflow
- [ ] Two-way anonymous communication relay
- [ ] Investigation templates by category
- [ ] Structured interviews
- [ ] Remediation plans with step tracking

**Operator Console (Ethico Internal)**
- [ ] Hotline intake form with client profile loading
- [ ] AI-assisted note cleanup (bullet → narrative)
- [ ] AI-assisted category suggestion
- [ ] QA review workflow
- [ ] Directives system
- [ ] Client profile management

**Ethics Portal (Anonymous Reporting)**
- [ ] Anonymous report submission (creates RIU)
- [ ] Access code generation and status checking
- [ ] White-label branding per tenant
- [ ] PWA for mobile installation

**Employee Portal (Authenticated Self-Service)**
- [ ] My reports view
- [ ] My disclosures view
- [ ] My attestations view
- [ ] Task completion interface

**Manager Portal**
- [ ] Proxy reporting (submit on behalf of employee)
- [ ] Team compliance dashboard

**Disclosures & Campaigns**
- [ ] Campaign builder (target audience, due dates, reminders)
- [ ] COI disclosure forms
- [ ] Gift & entertainment tracking
- [ ] Outside employment disclosure
- [ ] Threshold-based auto-case creation
- [ ] Conflict detection across disclosures

**Policy Management**
- [ ] Policy document CRUD with rich text editor
- [ ] Version control and history
- [ ] Approval workflows
- [ ] Attestation campaigns (creates RIUs)
- [ ] AI-powered translation

**AI Integration (Core Differentiator)**
- [ ] Claude API integration
- [ ] Note cleanup service
- [ ] Summary generation (case, investigation)
- [ ] Real-time category suggestions
- [ ] AI risk scoring
- [ ] Translation service
- [ ] Natural language queries for dashboards
- [ ] AI panel (slide-over drawer)
- [ ] Inline AI suggestions
- [ ] Scoped agents per view (Investigation, Case, Compliance Manager)

**Unified Assignment System (Differentiator)**
- [ ] "My Work" unified task queue
- [ ] Cross-module task aggregation
- [ ] Priority-based ordering
- [ ] Due date tracking

**Analytics & Dashboards (Differentiator)**
- [ ] Pre-built dashboards (RIU, Case, Campaign)
- [ ] Custom dashboard builder
- [ ] Board report generation
- [ ] AI natural language queries

**Infrastructure**
- [ ] SSO (Azure AD, Google OAuth, SAML)
- [ ] Domain verification for SSO
- [ ] Email service with templates
- [ ] Notification preferences
- [ ] HRIS integration (Merge.dev)
- [ ] Data migration tools (NAVEX, EQS import)

### Out of Scope

Explicitly excluded from v1:

- Real-time collaborative editing (Y.js) — Complexity vs. value, defer to v2
- Employee chatbot — High effort, not blocking core compliance flow
- Video attachments — Storage costs, processing complexity
- Mobile native apps — PWA sufficient for v1
- Project management module — Nice-to-have, not core compliance
- Client Success Dashboard — Internal tool, can use direct DB access
- Sales Demo environment — Can use seeded tenant instead

## Context

**Company:** Ethico is a healthcare compliance software company based in Charlotte, NC, serving 1,500+ customers. The platform replaces fragmented legacy systems with a unified experience.

**Competitive Landscape:**
- NAVEX: Market leader, acquisition-heavy, fragmented UX
- EQS/Conversant: Strong in disclosures, weak on investigations
- Case IQ: Good case management, limited analytics

**Technical Foundation:**
- Existing codebase: ~15% complete (see `.planning/codebase/` for architecture)
- Backend: NestJS + Prisma + PostgreSQL with RLS
- Frontend: Next.js 14 + shadcn/ui + Tailwind
- AI: Anthropic Claude API (primary provider)
- Infrastructure: Azure (App Service, Blob Storage, PostgreSQL)

**User Portals:**
1. Client Platform — CCO, Investigators, HR, Legal
2. Employee Portal — Client employees (authenticated)
3. Ethics Portal — Anonymous reporting (public)
4. Operator Console — Ethico hotline operators
5. Implementation Portal — Ethico implementation team
6. Client Success Portal — Ethico CS (defer to v2)
7. Sales Demo — Seeded demo tenant (defer to v2)
8. Support Portal — Ethico support (defer to v2)

**Key Architecture Decisions:**
- RIU→Case pattern: Immutable inputs (RIUs) → mutable work containers (Cases)
- Many-to-many: Multiple RIUs can link to one Case
- Unified assignment: All tasks flow into one "My Work" view per user
- AI is non-intrusive: Inline → Contextual → Drawer tier model
- Scoped agents: Different AI agents for different views

## Constraints

- **Timeline:** Replace legacy system by end of Q1 2026 — customer migrations scheduled
- **Tech Stack:** NestJS/Next.js/PostgreSQL already committed — existing codebase
- **AI Provider:** Anthropic Claude API (ANTHROPIC_API_KEY configured) — contractual
- **Infrastructure:** Azure — existing enterprise agreement
- **Multi-tenancy:** Shared database with RLS — already implemented, non-negotiable
- **Migration Flexibility:** Support big bang, parallel, and module-by-module migration paths

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| RIU→Case separation | Immutable inputs enable audit trail, merging, pattern detection | — Pending |
| Strategic differentiation for v1 | Q1 deadline requires focus on differentiators vs. feature parity | — Pending |
| AI as core differentiator | Market gap: competitors have limited/add-on AI | — Pending |
| Unified "My Work" queue | Reduces context switching, improves completion rates | — Pending |
| Scoped AI agents | Better context, specialized skills per domain | — Pending |
| All migration paths supported | Customer flexibility > implementation simplicity | — Pending |

---
*Last updated: 2026-02-02 after project initialization*
