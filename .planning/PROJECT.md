# Ethico Risk Intelligence Platform

## What This Is

A multi-tenant SaaS compliance management platform - "HubSpot for Compliance" - that unifies ethics hotline intake, case management, investigations, disclosures, policy management, and analytics. Serves two distinct products: an Operator Console for Ethico's internal hotline staff and a Client Platform for customer compliance teams.

## Core Value

Investigators can track cases from intake through investigation, findings, and remediation in a unified, AI-native platform with real-time visibility and actionable insights.

## Requirements

### Validated

Requirements shipped and confirmed working (Tier 1 Foundation - Slices 1.1-1.8):

- ✓ JWT authentication with access/refresh token rotation — v1.0
- ✓ Multi-tenant RLS isolation with PostgreSQL Row-Level Security — v1.0
- ✓ Case CRUD with full-text search, pagination, multi-filters — v1.0
- ✓ Investigation CRUD with status workflow (NEW → ASSIGNED → INVESTIGATING → CLOSED) — v1.0
- ✓ Investigation notes with rich text, visibility controls, types — v1.0
- ✓ File attachments (polymorphic, multi-entity support) — v1.0
- ✓ Activity logging with natural language descriptions — v1.0
- ✓ User management with RBAC (7 roles) — v1.0
- ✓ Case detail 3-column layout with properties panel, timeline — v1.0
- ✓ Session management with token rotation, revocation — v1.0

### Active

Requirements for v1.0 completion (Tiers 1.5-5):

**Tier 1.5 - Foundation Completion:**
- [ ] Subject entity for tracking people named in cases
- [ ] Category entity for unified classification taxonomy
- [ ] Location entity for reusable location management
- [ ] BusinessUnit entity for organizational scoping
- [ ] Employee entity for HRIS-synced individuals
- [ ] SSO integration (Azure AD + Google OAuth)
- [ ] Interaction entity for follow-up call handling
- [ ] CaseMessage entity for two-way reporter communication
- [ ] Remediation entities for corrective action tracking
- [ ] Organization model enhancement (branding, settings, domain fields)
- [ ] Case soft delete endpoint

**Tier 2 - Operator Console & Ethics Portal:**
- [ ] Operator Console: Client profile management with phone lookup
- [ ] Operator Console: Hotline intake workflow with structured form
- [ ] Operator Console: Directives system (scripts, escalation procedures)
- [ ] Operator Console: QA review workflow with queue management
- [ ] Operator Console: Follow-up call handling
- [ ] Operator Console: AI-assisted note cleanup and summary generation
- [ ] Ethics Portal: Public landing page with branding
- [ ] Ethics Portal: Crisis escalation section
- [ ] Ethics Portal: Anonymous report submission with access code
- [ ] Ethics Portal: Status check with access code
- [ ] Employee Portal: SSO authentication
- [ ] Employee Portal: My Cases view with visibility controls
- [ ] Employee Portal: Two-way messaging with investigators
- [ ] Employee Portal: Follow-up submission

**Tier 3 - Disclosures Module:**
- [ ] Disclosure Form entity with standard library (7 types)
- [ ] Ad-hoc disclosure submission (authenticated and unauthenticated)
- [ ] Single-stage approval workflow
- [ ] Conditions with due dates and reminders
- [ ] Employee Portal: My Disclosures view
- [ ] Create Case from disclosure escalation
- [ ] Campaign engine (point-in-time and rolling)
- [ ] HRIS-driven campaign targeting
- [ ] Multi-stage approval workflows (up to 4 stages)
- [ ] External Party entity for cross-disclosure linking

**Tier 4 - AI Features:**
- [ ] AI note cleanup (bullets to formal narrative)
- [ ] AI summary generation
- [ ] AI translation (auto-detect, preserve original)
- [ ] AI category suggestions during intake
- [ ] AI keyword detection for escalation triggers
- [ ] Policy Q&A chatbot (MVP)

**Tier 5 - Analytics & Reporting:**
- [ ] Operational dashboards (case metrics, campaign progress)
- [ ] Saved views (HubSpot-style custom columns/filters)
- [ ] Export to CSV
- [ ] Email notifications (core events)
- [ ] Notification preferences

### Out of Scope

Deferred to v2.0 or later:

- Policy Management module (attestations, version control, distribution) — complexity, sufficient for v2.0
- Real-time AI assist during calls — requires WebSocket streaming infrastructure
- Document AI analysis — requires vector database setup
- SMS communication relay — operational complexity
- Slack/Teams notifications — integration overhead
- Mobile native apps — web-first, PWA later
- Advanced duplicate detection — ML infrastructure needed
- Workflow builder UI — clients use admin configuration

## Context

**Codebase State (January 2026):**
- NestJS backend with Prisma ORM, PostgreSQL
- Next.js frontend with shadcn/ui, Tailwind CSS
- ~218 automated tests (unit, E2E, Playwright)
- Entity coverage: 53% (10/19 PRD-specified entities)
- API endpoint coverage: ~70%
- All implemented modules properly wired

**Existing Documentation:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md`
- PRDs in `02-MODULES/` (Case Management, Operator Console, Ethics Portal, Disclosures)
- Tech Specs in `01-SHARED-INFRASTRUCTURE/` (Auth, AI, HRIS, Real-time)
- Core Data Model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
- Tier 1 Audit: `.planning/v1.0-TIER1-AUDIT.md`

**Tech Stack:**
- Frontend: Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui
- Backend: NestJS, TypeScript, Prisma ORM
- Database: PostgreSQL 15+ with RLS
- Cache: Redis 7
- AI: Anthropic Claude API
- Infrastructure: Azure (App Service, Blob Storage)

## Constraints

- **Multi-tenancy**: All tables must have `organizationId` with RLS enforcement
- **AI Integration**: Claude API primary, pluggable for Azure OpenAI fallback
- **SSO**: Azure AD and Google OAuth required for enterprise customers
- **UI Framework**: shadcn/ui + Tailwind CSS (not Material-UI)
- **Security**: OWASP Top 10 compliance, tenant isolation tests mandatory

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Shared DB with RLS for multi-tenancy | Simpler ops, sufficient isolation with RLS | — Pending |
| Case contains intake (not separate entity) | 99% of intakes are 1:1 with cases | ✓ Good |
| Investigations at Case level (0 to N) | Some cases need no investigation, some need multiple | ✓ Good |
| Subjects linked at Case level | Enables cross-case pattern detection | — Pending |
| User vs Employee separation | Users = platform logins, Employees = HRIS population | — Pending |
| shadcn/ui over Material-UI | Modern, composable, Radix primitives | ✓ Good |
| Unified AUDIT_LOG table | Cross-entity queries, AI context | ✓ Good |

---
*Last updated: 2026-01-31 after GSD initialization from existing PRDs*
