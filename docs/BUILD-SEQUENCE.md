# Build Sequence - Risk Intelligence Platform

**Purpose:** Prioritized implementation roadmap with vertical slices for Ralph Loop execution.

**Last Updated:** January 2026

---

## Tier Overview

| Tier | Focus | Detail Level |
|------|-------|--------------|
| **Tier 1: Foundation** | Auth, Cases, Operator MVP, Migration | Full Ralph task breakdown |
| **Tier 2: Core** | Web Forms, Ethics Portal, Disclosures | Rough slice outline |
| **Tier 3: Extended** | Policy, Chatbot, Analytics | Module names only |

---

## Tier 1: Foundation

Full Ralph task breakdown. These slices must complete before any client can use the platform.

### Slice 1.1: Authentication & Multi-Tenancy
**Delivers:** Users can log in, tenant context flows through all requests, RLS enforces isolation.

**Stories (from Shared Infrastructure):**
- "User login with email/password"
- "JWT token contains organizationId"
- "RLS policies enforce tenant isolation"
- "Session management and refresh tokens"

**Ralph Tasks:**

| Task | Scope | Verify |
|------|-------|--------|
| Create Prisma schema for User, Organization, Role | `prisma/schema.prisma` | `npx prisma validate` |
| Implement User entity with AI-first fields | `src/modules/users/entities/` | `npm test -- --grep "User entity"` |
| Create AuthModule with JWT strategy | `src/modules/auth/` | `npm test -- --grep "AuthService"` |
| Implement TenantMiddleware setting RLS variable | `src/common/middleware/tenant.middleware.ts` | `npm test -- --grep "tenant isolation"` |
| Create login endpoint with validation | `src/modules/auth/auth.controller.ts` | `npm test -- --grep "POST /auth/login"` |
| Add RLS policies to PostgreSQL | `prisma/migrations/` | `npm run db:test:rls` |
| Implement refresh token rotation | `src/modules/auth/` | `npm test -- --grep "refresh token"` |
| Create CurrentUser and TenantId decorators | `src/common/decorators/` | `npm test -- --grep "decorators"` |

**Blocked by:** None (first slice)
**Unblocks:** All subsequent slices

---

### Slice 1.2: Core Entities & Activity Logging
**Delivers:** Base entity patterns, activity logging service, audit trail foundation.

**Stories:**
- "All entity changes logged with natural language description"
- "Activity timeline viewable on any entity"
- "Audit log queryable for compliance"

**Ralph Tasks:**

| Task | Scope | Verify |
|------|-------|--------|
| Create ActivityService with log method | `src/common/services/activity.service.ts` | `npm test -- --grep "ActivityService"` |
| Create AUDIT_LOG table migration | `prisma/migrations/` | `npx prisma migrate dev` |
| Implement dual-write to entity activity + AUDIT_LOG | `src/common/services/` | `npm test -- --grep "dual write"` |
| Create activity timeline endpoint | `src/common/controllers/activity.controller.ts` | `npm test -- --grep "GET /activity"` |
| Add natural language description generator | `src/common/services/activity.service.ts` | `npm test -- --grep "action description"` |

**Blocked by:** Slice 1.1
**Unblocks:** Slice 1.3, 1.4

---

### Slice 1.3: Case Management Core
**Delivers:** Cases can be created, viewed, listed, and updated via API.

**Stories (from PRD-005):**
- "Create case with intake information"
- "View case details with all related data"
- "List cases with filtering and pagination"
- "Update case status with rationale"

**Ralph Tasks:**

| Task | Scope | Verify |
|------|-------|--------|
| Create Case entity with all intake fields | `prisma/schema.prisma` | `npx prisma validate` |
| Implement CaseService with CRUD operations | `src/modules/cases/case.service.ts` | `npm test -- --grep "CaseService"` |
| Create CaseController with endpoints | `src/modules/cases/case.controller.ts` | `npm test -- --grep "CaseController"` |
| Implement case list with filters | `src/modules/cases/case.service.ts` | `npm test -- --grep "list cases"` |
| Add case status transitions | `src/modules/cases/case-status.service.ts` | `npm test -- --grep "status transition"` |
| Create CaseActivity logging integration | `src/modules/cases/` | `npm test -- --grep "case activity"` |
| Implement reference number generation | `src/modules/cases/case.service.ts` | `npm test -- --grep "reference number"` |

**Blocked by:** Slice 1.2
**Unblocks:** Slice 1.4, 1.5, 1.6

---

### Slice 1.4: Investigation Workflow
**Delivers:** Investigations can be created, assigned, and tracked through workflow.

**Stories (from PRD-005):**
- "Create investigation on case"
- "Assign investigators to investigation"
- "Add notes and interviews to investigation"
- "Record findings and close investigation"

**Ralph Tasks:**

| Task | Scope | Verify |
|------|-------|--------|
| Create Investigation entity | `prisma/schema.prisma` | `npx prisma validate` |
| Create InvestigationNote entity | `prisma/schema.prisma` | `npx prisma validate` |
| Create InvestigationInterview entity | `prisma/schema.prisma` | `npx prisma validate` |
| Implement InvestigationService | `src/modules/investigations/` | `npm test -- --grep "InvestigationService"` |
| Create investigation assignment logic | `src/modules/investigations/` | `npm test -- --grep "assign investigation"` |
| Implement status workflow (state machine) | `src/modules/investigations/` | `npm test -- --grep "investigation workflow"` |
| Add findings recording | `src/modules/investigations/` | `npm test -- --grep "record findings"` |
| Create investigation activity logging | `src/modules/investigations/` | `npm test -- --grep "investigation activity"` |

**Blocked by:** Slice 1.3
**Unblocks:** Slice 1.7 (AI features)

---

### Slice 1.5: Operator Console MVP - Tenant & User Management
**Delivers:** Ethico staff can manage client organizations and users.

**Stories (from PRD-002):**
- "Create and configure client organization"
- "Manage users within organization"
- "Configure organization settings"
- "View organization list with search"

**Ralph Tasks:**

| Task | Scope | Verify |
|------|-------|--------|
| Create ClientProfile entity | `prisma/schema.prisma` | `npx prisma validate` |
| Implement OrganizationService for Ethico staff | `src/modules/organizations/` | `npm test -- --grep "OrganizationService"` |
| Create operator-specific endpoints | `src/modules/operator/` | `npm test -- --grep "operator endpoints"` |
| Implement isOperator flag and cross-tenant access | `src/common/guards/` | `npm test -- --grep "operator access"` |
| Create user management for organizations | `src/modules/users/` | `npm test -- --grep "user management"` |
| Add organization settings configuration | `src/modules/organizations/` | `npm test -- --grep "org settings"` |

**Blocked by:** Slice 1.1, 1.2
**Unblocks:** Slice 1.6, Slice 2.x

---

### Slice 1.6: Migration Pipeline
**Delivers:** Data can be imported from competitor systems (NAVEX, EQS, etc.)

**Stories:**
- "Import cases from CSV with field mapping"
- "Validate imported data before commit"
- "Track source system and original IDs"
- "Generate migration report with errors"

**Ralph Tasks:**

| Task | Scope | Verify |
|------|-------|--------|
| Create MigrationJob entity | `prisma/schema.prisma` | `npx prisma validate` |
| Implement CSV parser with field mapping | `src/modules/migration/` | `npm test -- --grep "CSV parser"` |
| Create migration validation service | `src/modules/migration/` | `npm test -- --grep "migration validation"` |
| Implement batch import with transaction | `src/modules/migration/` | `npm test -- --grep "batch import"` |
| Add source_system tracking to entities | `src/modules/migration/` | `npm test -- --grep "source tracking"` |
| Create migration report generator | `src/modules/migration/` | `npm test -- --grep "migration report"` |
| Implement rollback capability | `src/modules/migration/` | `npm test -- --grep "migration rollback"` |
| Add NAVEX field mapping template | `src/modules/migration/templates/` | `npm test -- --grep "NAVEX mapping"` |

**Blocked by:** Slice 1.3, 1.4
**Unblocks:** Customer onboarding, revenue

---

### Slice 1.7: AI Service Foundation
**Delivers:** AI integration for note cleanup and summary generation.

**Stories:**
- "Clean up bullet notes to formal narrative"
- "Generate case summary from details"
- "Log all AI interactions for audit"

**Ralph Tasks:**

| Task | Scope | Verify |
|------|-------|--------|
| Create AIService with Claude provider | `src/modules/ai/ai.service.ts` | `npm test -- --grep "AIService"` |
| Implement AIProvider interface | `src/modules/ai/providers/` | `npm test -- --grep "AIProvider"` |
| Create AI_CONVERSATION logging | `prisma/schema.prisma`, `src/modules/ai/` | `npm test -- --grep "AI conversation"` |
| Implement note cleanup endpoint | `src/modules/ai/ai.controller.ts` | `npm test -- --grep "cleanup notes"` |
| Implement summary generation endpoint | `src/modules/ai/ai.controller.ts` | `npm test -- --grep "generate summary"` |
| Add rate limiting per organization | `src/modules/ai/` | `npm test -- --grep "AI rate limit"` |
| Create AI attribution tracking | `src/modules/ai/` | `npm test -- --grep "AI attribution"` |

**Blocked by:** Slice 1.3
**Unblocks:** Slice 1.8

---

### Slice 1.8: Operator Console - Basic Intake
**Delivers:** Operators can take calls and create cases for clients.

**Stories (from PRD-002):**
- "Load client profile from phone number"
- "Capture intake information during call"
- "Use AI to clean up notes post-call"
- "Submit case to QA queue"

**Ralph Tasks:**

| Task | Scope | Verify |
|------|-------|--------|
| Implement phone number lookup | `src/modules/operator/` | `npm test -- --grep "phone lookup"` |
| Create intake form API endpoint | `src/modules/operator/` | `npm test -- --grep "intake form"` |
| Implement draft saving (auto-save) | `src/modules/operator/` | `npm test -- --grep "draft save"` |
| Create submit-to-QA workflow | `src/modules/operator/` | `npm test -- --grep "submit QA"` |
| Integrate AI note cleanup | `src/modules/operator/` | `npm test -- --grep "operator AI"` |
| Add operator session tracking | `src/modules/operator/` | `npm test -- --grep "operator session"` |

**Blocked by:** Slice 1.5, 1.7
**Unblocks:** Slice 1.9

---

### Slice 1.9: QA Review & Release
**Delivers:** QA team can review cases and release to clients.

**Stories (from PRD-002):**
- "View QA queue sorted by priority"
- "Claim case for review"
- "Edit case details before release"
- "Release case to client with notification"

**Ralph Tasks:**

| Task | Scope | Verify |
|------|-------|--------|
| Create QA queue endpoint | `src/modules/qa/` | `npm test -- --grep "QA queue"` |
| Implement case claim/unclaim | `src/modules/qa/` | `npm test -- --grep "claim case"` |
| Create QA edit functionality | `src/modules/qa/` | `npm test -- --grep "QA edit"` |
| Implement release workflow | `src/modules/qa/` | `npm test -- --grep "release case"` |
| Add QA notes (internal only) | `src/modules/qa/` | `npm test -- --grep "QA notes"` |
| Create release notification trigger | `src/modules/qa/` | `npm test -- --grep "release notification"` |

**Blocked by:** Slice 1.8
**Unblocks:** Tier 2

---

## Tier 1 Dependency Graph

```
Slice 1.1 (Auth)
     │
     ▼
Slice 1.2 (Activity) ────────────────────────┐
     │                                        │
     ├──────────────────┐                     │
     ▼                  ▼                     │
Slice 1.3 (Cases)   Slice 1.5 (Operator MVP) │
     │                  │                     │
     ├──────┬───────────┘                     │
     │      │                                 │
     ▼      ▼                                 │
Slice 1.4  Slice 1.6 (Migration)             │
(Investigation)                               │
     │                                        │
     ▼                                        │
Slice 1.7 (AI) ◄──────────────────────────────┘
     │
     ▼
Slice 1.8 (Operator Intake)
     │
     ▼
Slice 1.9 (QA Review)
```

---

## Tier 2: Core

Rough slice outline. Build after Tier 1 foundation is stable.

### Slice 2.1: Web Form Builder
**Delivers:** Admins can create custom intake forms with conditional logic.

**Key Stories (from PRD-004):**
- "Create form with drag-and-drop builder"
- "Add conditional display logic"
- "Preview and publish forms"
- "Version forms with history"

**Key Components:**
- FormDefinition entity with versioning
- Form question types (text, select, date, file, etc.)
- Conditional logic engine
- Form preview renderer
- Publishing workflow

---

### Slice 2.2: Ethics Portal - Anonymous Reporting
**Delivers:** Anonymous reporters can submit cases via web portal.

**Key Stories (from PRD-003):**
- "Submit anonymous report"
- "Receive access code for status checks"
- "Check case status with access code"
- "Submit follow-up information"

**Key Components:**
- Public portal landing page (branded)
- Anonymous submission form
- Access code generation
- Status check page

---

### Slice 2.3: Ethics Portal - Authenticated
**Delivers:** Employees can log in and manage their cases/disclosures.

**Key Stories (from PRD-003):**
- "Log in via SSO"
- "View my submitted cases"
- "Submit identified report"
- "Exchange messages with investigators"

**Key Components:**
- SSO integration (SAML/OIDC)
- Employee dashboard
- Case messaging UI
- Notification inbox

---

### Slice 2.4: Two-Way Communication
**Delivers:** Investigators can message reporters, reporters can reply.

**Key Stories (from PRD-005):**
- "Send message to anonymous reporter"
- "Reporter receives notification"
- "Reporter replies via portal"
- "Messages appear on case timeline"

**Key Components:**
- CaseMessage entity
- Anonymous email relay
- Portal message UI
- Notification triggers

---

### Slice 2.5: Disclosures - COI Form
**Delivers:** Employees can submit conflict of interest disclosures.

**Key Stories (from PRD-006):**
- "Complete COI disclosure form"
- "Submit for review"
- "Reviewer approves/rejects/adds conditions"
- "Track disclosure history"

**Key Components:**
- Disclosure entity with lifecycle
- Approval workflow
- Conditions tracking
- Disclosure activity log

---

### Slice 2.6: Disclosure Campaigns
**Delivers:** Admins can launch annual COI certification campaigns.

**Key Stories (from PRD-006):**
- "Create campaign targeting employees"
- "Launch campaign with notifications"
- "Track completion progress"
- "Handle exceptions"

**Key Components:**
- Campaign entity
- HRIS targeting rules
- Reminder scheduling (BullMQ)
- Campaign dashboard

---

### Slice 2.7: Operator Console - Full Workflow
**Delivers:** Complete operator workflow including directives and follow-ups.

**Key Stories (from PRD-002):**
- "View client directives during call"
- "Handle follow-up calls"
- "AI suggests categories in real-time"
- "Operator dashboard with metrics"

**Key Components:**
- Directive entity and display
- Follow-up linking
- Real-time AI suggestions
- Operator metrics

---

## Tier 3: Extended

Module names only. Build after core platform is stable.

### Policy Management (PRD-009)
Full policy lifecycle: creation with ProseMirror editor, approval workflows, versioning, attestation campaigns, exception management.

### Employee Chatbot (PRD-008)
Conversational AI interface: policy Q&A with RAG, knowledge base from policies, citation extraction, human escalation.

### Analytics & Reporting (PRD-007)
Dashboards and reports: KPI widgets, custom report builder, board reporting, saved views (HubSpot-style), export to PDF/Excel.

---

## Critical Path

```
Auth → Activity → Cases → Migration → Operator Intake → QA Review
  1.1     1.2       1.3      1.6          1.8           1.9

Minimum viable: ~8 weeks with focused execution
```

## Parallel Execution Opportunities

| After Completing | Can Run in Parallel |
|------------------|---------------------|
| Slice 1.2 | Slice 1.3 + Slice 1.5 |
| Slice 1.3 | Slice 1.4 + Slice 1.6 + Slice 1.7 |
| Slice 1.5 + 1.7 | Slice 1.8 |
| Tier 1 complete | All Tier 2 slices |

---

*End of Build Sequence*
