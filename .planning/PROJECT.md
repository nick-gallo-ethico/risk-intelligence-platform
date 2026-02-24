# Ethico Risk Intelligence Platform

## What This Is

A unified, AI-native compliance management SaaS platform ("HubSpot for Compliance") that consolidates ethics hotline intake, case management, investigations, disclosures, policy management, and analytics into a single system. Built for healthcare compliance teams, competing against NAVEX, EQS/Conversant, and Case IQ through superior AI capabilities, unified experience, and modern configurability.

## Core Value

**Users can manage their entire compliance workflow—from anonymous report intake to investigation closure to board reporting—in one AI-assisted platform, with every task unified into a single "My Work" view.**

If everything else fails, this must work: the RIU→Case pipeline with AI-assisted investigations.

## Current State

**Shipped:** v1.2 Production Hardening & Feature Completion (2026-02-20)
**Previous:** v1.1 Code Review Remediation (2026-02-15), v1.0 Feature Build (2026-02-13)

The platform has solid CRUD workflows and hardened code quality (B+ grade). 39 phases, 300+ plans executed across 3 milestones. Core case management, investigations, campaigns, disclosures, policies, analytics, and 5 portals are functional. However, a comprehensive PRD gap analysis revealed ~70 missing capabilities across the intelligence, automation, and communication layers that differentiate this from a basic CRUD system.

Key gaps: No rules/automation engine (auto-routing, SLA enforcement, escalation triggers), no anonymous communication relay (Chinese Wall model), no RAG-powered AI intelligence (pgvector, knowledge base, policy Q&A chatbot), incomplete disclosure automation (rolling campaigns, bulk operations, external parties), shallow portal experiences (employee/manager/operator), and missing infrastructure (PWA, fact tables, scheduled reports).

## Current Milestone: v2.0 PRD Feature Parity & Intelligence Layer

**Goal:** Close all gaps between PRD specifications and the built platform across 6 waves, transforming it from a solid CRUD system into the "AI-first HubSpot for Compliance" described in the PRDs.

**Wave 1 — Rules & Automation Engine:**

- Auto-routing rules (location, category, severity), SLA monitoring + warnings/breaches
- Escalation triggers, case status auto-derivation, round-robin assignment

**Wave 2 — Anonymous Communication Relay:**

- Chinese Wall anonymous messaging relay, access code email delivery
- Two-way ethics portal messaging, reporter visibility levels

**Wave 3 — AI Intelligence Layer:**

- pgvector + document embedding pipeline, RAG for policy Q&A with citations
- Knowledge base, confidence-tiered chatbot, floating widget on portals
- Note cleanup with preview, cross-case pattern detection alerts

**Wave 4 — Disclosure & Campaign Automation:**

- Rolling campaign triggers (HRIS events), auto-clear/reject rules, bulk operations
- External party entity, multi-stage approval, condition reminders, proxy delegation
- GT&E aggregation + currency conversion

**Wave 5 — Portal Completeness:**

- Manager team compliance dashboard, proxy reports, bulk reminders
- Employee "My Reports" with combined timeline, condition self-service
- Operator directive enforcement, quality metrics, AI question suggestions

**Wave 6 — Infrastructure & Polish:**

- PWA (service worker, offline, push notifications), scheduled report delivery
- Fact tables, dashboard widget builder, GDPR deletion, data retention
- Custom domains, branding depth, Terraform IaC

## Requirements

### Validated

Requirements that exist in the current codebase (v1.0 feature build):

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
- ✓ 25 phases of feature development (Phases 1-25.1) — v1.0 feature build
- ✓ 42 NestJS modules, 127 Prisma models, 447 database indexes — v1.0
- ✓ Helmet security headers, Swagger disabled in production — v1.0
- ✓ Rate limiting via ThrottlerModule with Redis backend — v1.0
- ✓ DataLoader N+1 prevention (9 instances) — v1.0
- ✓ BullMQ job queues for async processing — v1.0
- ✓ CI/CD pipeline with tenant isolation gate — v1.0
- ✓ Event-driven architecture with BaseEvent tenant context — v1.0

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

Explicitly excluded:

- Real-time collaborative editing (Y.js) — Complexity vs. value, defer to v3
- Video attachments — Storage costs, processing complexity
- Mobile native apps — PWA covers mobile in v2.0
- Client Success Dashboard — Internal tool, can use direct DB access
- Sales Demo self-service provisioning — Using seeded demo tenant
- Slack/Teams integration — Defer to v2.1
- SMS notifications — Defer to v2.1

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

| Decision                             | Rationale                                                                       | Outcome         |
| ------------------------------------ | ------------------------------------------------------------------------------- | --------------- |
| RIU→Case separation                  | Immutable inputs enable audit trail, merging, pattern detection                 | ✓ Good          |
| Strategic differentiation for v1     | Q1 deadline requires focus on differentiators vs. feature parity                | ✓ Good          |
| AI as core differentiator            | Market gap: competitors have limited/add-on AI                                  | ✓ Good          |
| Unified "My Work" queue              | Reduces context switching, improves completion rates                            | ✓ Good          |
| Scoped AI agents                     | Better context, specialized skills per domain                                   | ✓ Good          |
| All migration paths supported        | Customer flexibility > implementation simplicity                                | — Pending       |
| Code review before production        | Unified audit identified 36 findings; remediate before deploy                   | ✓ Good — v1.1   |
| All 5 remediation phases in scope    | Full hardening vs. incremental; chose comprehensive                             | ✓ Good — v1.1   |
| Thin coordinator pattern             | Main services delegate to domain-specific sub-services                          | ✓ Good — v1.1   |
| AI services exempt from 300 LOC      | Complex orchestration logic needs different decomposition                       | ✓ Good — v1.1   |
| ESLint max-lines guardrail           | Warn at 500 LOC prevents growth; decompose opportunistically                    | ✓ Good — v1.1   |
| Dual-track v1.2 (hardening+features) | Pre-Series A review found D+ grade; combine remediation with feature completion | ✓ Good — v1.2   |
| B+ target grade                      | Investor-credible codebase requires measurable quality bar                      | ✓ Good — v1.2   |
| Full PRD parity in v2.0              | Gap analysis found ~70 missing PRD capabilities; close all gaps                 | — Active — v2.0 |
| Chatbot in scope for v2.0            | RAG-powered policy Q&A is key differentiator vs NAVEX/Case IQ                   | — Active — v2.0 |
| 6-wave attack plan                   | Rules→Relay→AI→Disclosure→Portal→Infrastructure ordering                        | — Active — v2.0 |

---

_Last updated: 2026-02-24 after v2.0 milestone started_
