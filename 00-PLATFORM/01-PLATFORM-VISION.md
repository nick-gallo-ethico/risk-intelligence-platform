# Ethico Risk Intelligence Platform
## Platform Vision & Architecture

**Document ID:** PRD-001  
**Version:** 2.0 (Updated with Discovery Decisions)  
**Last Updated:** January 2026

---

## Executive Summary

The Ethico Risk Intelligence Platform is a next-generation compliance management system designed as "HubSpot for Compliance." It consolidates ethics hotline intake, case management, investigations, disclosures, policy management, and analytics into a unified, AI-native platform.

### Vision Statement

> Enable organizations to transform fragmented compliance activities into unified risk intelligence—providing real-time visibility, AI-assisted workflows, and actionable insights that demonstrate program effectiveness and protect organizational integrity.

### Why Now?

1. **Legacy Fragmentation:** Competitors like NAVEX have grown through acquisition, resulting in disconnected modules and inconsistent experiences
2. **AI Opportunity:** Modern AI capabilities enable summarization, translation, risk scoring, and intelligent assistance that weren't possible before
3. **User Expectations:** Today's users expect HubSpot/Salesforce-quality UX, not 2010-era enterprise software
4. **Compliance Complexity:** Growing regulatory requirements demand better tools for managing and demonstrating compliance

---

## Two Products, One Platform

The platform serves two distinct user bases with tailored experiences:

### Operator Console (Ethico Internal)

| Aspect | Description |
|--------|-------------|
| **Users** | Ethico hotline operators, QA team |
| **Purpose** | Intake calls, manage multi-client profiles, QA review workflow |
| **Key Features** | Client profile loading via phone number, directives system, QA queue, release to client |
| **Multi-tenant** | Operators work across multiple client profiles |

### Client Platform (Customer-Facing)

| Aspect | Description |
|--------|-------------|
| **Users** | CCOs, compliance managers, investigators, HR, Legal, Audit Committee |
| **Purpose** | Investigation management, case tracking, reporting, dashboards |
| **Key Features** | Saved views, investigation templates, remediation tracking, AI assistance |
| **Multi-tenant** | Each customer sees only their organization's data |

---

## Core Entity Model

### Hierarchy Overview

```
CASE (primary entity - the risk intelligence container)
│
├── Intake Information (embedded)
│   ├── Source channel, timestamp, operator
│   ├── Reporter info (anonymous handling)
│   ├── Location, category, severity
│   ├── Original narrative, summary, addendum
│   ├── Subjects (linked from HRIS or manual)
│   └── Custom fields & questions
│
├── Interactions (timeline)
│   ├── Initial Intake
│   ├── Follow-up #1 (new info flagged)
│   ├── Follow-up #2
│   └── ... (hotline or web portal)
│
├── Investigations (0 to N)
│   ├── Investigation A
│   │   ├── Assignee(s), status, category
│   │   ├── Notes, interviews, documents
│   │   ├── Template/checklist (if applicable)
│   │   ├── Findings & outcome
│   │   └── Remediation plan
│   └── Investigation B
│       └── (same structure)
│
├── Communications
│   └── Two-way messaging with reporter (anonymized relay)
│
└── Remediation Plan (if no investigations but substantiated)
```

### Key Entity Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Intake vs Case | Combined (Case contains intake) | 99% of intakes are 1:1 with cases; split capability for rare exceptions |
| Case Status | Derived from investigations | Auto-calculated but admin-overridable |
| Investigations per Case | 0 to N | Some cases need no investigation; some spawn multiple (HR + Legal) |
| Subjects | Linked at Case level | Searchable across all cases for pattern detection |
| Follow-ups | Stored as Interactions | Don't clutter case list; tracked for metrics |
| Remediation | At Investigation level | Falls back to Case level if no investigations exist |

### Request for Information (RFI)

RFIs are a separate entity type:
- Logged and tracked for metrics
- Skip QA workflow
- No investigation required
- Same intake form (not simplified)
- Appear in separate list from Cases

---

## Core Identity Entities

These foundational entities are referenced throughout all modules. See `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` for complete schema definitions.

### User vs Employee: Key Distinction

| Entity | Source | Purpose | Who Has One |
|--------|--------|---------|-------------|
| **User** | Created on platform | Authentication, authorization | Platform users (CCO, investigators, admins) |
| **Employee** | Synced from HRIS | Represent all people in organization | Everyone in HRIS (~100% of workforce) |

**Critical Insight:** Most employees will never have a User record. An organization with 10,000 employees might have only 50 Users (compliance team, investigators, HR partners). Employees are the population for attestations, disclosures, and case subjects.

### User Entity

Users are platform login identities with authentication and role-based access.

```
USER
├── id: uuid
├── organization_id: uuid (FK)
├── email: string (unique within org)
├── first_name, last_name: string
├── password_hash: string? (nullable for SSO-only)
├── role: enum (see RBAC section)
├── sso_provider: string? ('AZURE_AD', 'GOOGLE', 'SAML')
├── sso_id: string? (external identity)
├── avatar_url: string?
├── department: string?
├── location_id: uuid? (FK)
├── business_unit_id: uuid? (FK)
├── is_active: boolean
├── last_login_at: timestamp?
├── employee_id: uuid? (FK to Employee, if HRIS-linked)
├── created_at, updated_at: timestamp
└── created_by_id, updated_by_id: uuid (FK)
```

**User References:**
- Case assignees → User
- Investigation assignees → User
- Policy owners → User
- Workflow approvers → User
- Audit log actors → User

### Employee Entity

Employees represent all individuals in an organization, synced from HRIS systems.

```
EMPLOYEE
├── id: uuid
├── organization_id: uuid (FK)
├── hris_employee_id: string (unique within org)
├── email: string?
├── first_name, last_name: string
├── job_title: string?
├── department: string?
├── location_id: uuid? (FK)
├── business_unit_id: uuid? (FK)
├── manager_id: uuid? (FK to Employee)
├── hire_date: date?
├── termination_date: date?
├── employment_status: enum ('ACTIVE', 'TERMINATED', 'LEAVE')
├── custom_fields: json (HRIS-specific metadata)
├── user_id: uuid? (FK to User, if platform user)
├── synced_at: timestamp (last HRIS sync)
├── source_system: string ('WORKDAY', 'BAMBOOHR', etc.)
├── created_at, updated_at: timestamp
└── Unique constraint: (organization_id, hris_employee_id)
```

**Employee References:**
- Case subjects → Employee
- Attestation recipients → Employee
- Disclosure submitters → Employee
- HRIS-driven routing rules → Employee attributes

### JWT Token Structure

Access tokens contain:

```json
{
  "sub": "user_id",
  "org": "organization_id",
  "role": "COMPLIANCE_OFFICER",
  "bus": ["bu_1", "bu_2"],
  "emp": "employee_id",
  "isOp": false,
  "iat": 1706400000,
  "exp": 1706400900
}
```

| Claim | Description |
|-------|-------------|
| `sub` | User ID |
| `org` | Organization ID (tenant) |
| `role` | User's role for RBAC |
| `bus` | Business unit IDs user can access |
| `emp` | Linked Employee ID (if any) |
| `isOp` | Is Ethico operator (cross-tenant access) |

### Organization Entity

Organizations are the top-level tenant containers.

```
ORGANIZATION
├── id: uuid
├── name: string
├── slug: string (unique, URL-safe)
├── domain: string? (for SSO domain matching)
├── tier: enum ('FREE', 'PREMIUM', 'ENTERPRISE')
├── settings: json (feature flags, limits, preferences)
├── billing_status: enum
├── logo_url: string?
├── primary_contact_id: uuid? (FK to User)
├── created_at, updated_at: timestamp
└── Unique constraint: slug
```

---

## Source Channels

| Channel | Who Enters | Interface | QA Required |
|---------|------------|-----------|-------------|
| **Hotline** | Ethico Operator | Operator Console | Yes |
| **Web Form** | Employee/Reporter | Employee Portal | No |
| **Proxy Report** | Manager | Manager Portal | No |
| **Direct Entry** | Compliance Officer | Client Platform | No |
| **Chatbot** | Employee/Reporter | Employee Portal | No |
| **Follow-up (hotline)** | Ethico Operator | Operator Console | Yes |
| **Follow-up (web)** | Reporter | Employee Portal | No |

---

## Platform Modules

### Core Modules (MVP Priority)

1. **Operator Console** - Hotline intake, QA workflow, client profile management
2. **Case Management** - Case tracking, investigation workflow, findings
3. **Investigation Management** - Notes, interviews, documents, templates
4. **Remediation Tracking** - Corrective action checklists, assignment, completion
5. **Analytics Dashboard** - Metrics, trends, saved views
6. **Employee Portal** - Self-service reporting, status checks, follow-ups

### Extended Modules (Post-MVP)

7. **Disclosure Management** - COI, gifts, outside activities
8. **Policy Management** - Version control, attestations, distribution
9. **Employee Chatbot** - AI-powered conversational interface (see detailed scope below)
10. **Integration Hub** - HRIS sync, SSO, API access

### Employee Chatbot (Module 9) - Detailed Scope

The Employee Chatbot is a comprehensive AI assistant serving as the primary self-service channel:

| Capability | Description |
|------------|-------------|
| **Report Intake** | Guided speak-up reporting with one question at a time, anonymous capable |
| **Policy Q&A** | Tiered AI responses: direct answers with citations (Tier 1), situational guidance (Tier 2), async escalation (Tier 3) |
| **Case Status** | Check report status and two-way messaging via access code |
| **Disclosure Assistance** | Conversational completion of COI, gifts, and other disclosures |
| **Compliance Inquiries** | Submit questions to compliance team with async response |
| **Knowledge Base** | Search custom uploaded documents beyond published policies |

**Access Points:**
- Ethics Portal floating widget (anonymous)
- Employee Portal embedded (authenticated)
- Standalone page (deep-linkable)

**Key Design Principles:**
- Tiered AI with confidence transparency
- One-click escalation to human always available
- Async over live (matches compliance team staffing reality)
- Full audit trail with consent capture

---

## AI Architecture

### Confirmed AI Features

| Feature | When | Description |
|---------|------|-------------|
| **Note Cleanup** | Post-call | Convert bullet notes to formal narrative |
| **Summary Generation** | Post-call | Generate case summary from details |
| **Real-time Assist** | During call | Suggested questions, category hints, escalation flags |
| **Translation** | Auto | Translate reports; preserve original |
| **Portal Localization** | Auto | Forms/portals in employee's language |
| **Case Q&A** | On-demand | Ask questions about specific case |
| **Cross-Case Analytics** | On-demand | Query patterns across cases |
| **Subject Summary** | On-demand | All cases involving a subject |
| **Document Analysis** | On-demand | Find references in uploaded documents |
| **Board Reports** | On-demand | Generate presentations from data |

### AI Design Principles

1. **Assist, don't replace** - Human judgment always final
2. **Non-intrusive** - Optional panels, not blocking workflows
3. **Transparent** - Clear when content is AI-generated
4. **Editable** - All AI outputs can be modified
5. **Auditable** - Track AI usage and edits

### AI-First Data Architecture

The platform is designed **AI-first from the ground up**. This affects every schema and data structure:

#### Schema Patterns for AI

**1. Narrative Context Fields**
Every major entity includes prose fields that AI can understand:
```
CASE
├── summary: text              # AI-readable case summary
├── description: text          # Detailed narrative
├── intake_narrative: text     # Original reporter story
└── resolution_rationale: text # Why case was closed this way
```

**2. Structured + Rationale Pattern**
Store both the decision AND the reasoning:
```
status: 'CLOSED_SUBSTANTIATED'
status_rationale: 'Investigation confirmed policy violation based on witness interviews and document evidence'
```

**3. AI Enrichment Fields**
Key entities include AI-generated content with attribution:
```
├── ai_summary: text?           # AI-generated summary
├── ai_risk_score: number?      # AI-assessed risk level
├── ai_generated_at: timestamp? # When AI content was created
├── ai_model_version: string?   # Which model (claude-3-opus)
├── ai_confidence: number?      # AI confidence score (0-1)
```

**4. Activity Logs with Natural Language**
Not just structured data, but human-readable descriptions:
```
AUDIT_LOG
├── action: 'status_changed'
├── action_description: 'Sarah Chen changed case status from Open to Under Investigation after initial triage review'
├── context: json  # Full context AI would need
└── changes: json  # { old_value, new_value, fields_changed[] }
```

**5. Migration-Ready Schemas**
All entities support data import from competitor systems:
```
├── source_system: string?      # 'NAVEX', 'EQS', 'MANUAL'
├── source_record_id: string?   # Original ID in source
├── migrated_at: timestamp?     # When imported
```

#### Chat Interaction Examples

Every feature should be accessible via natural language. Examples:

| User Query | System Action |
|------------|---------------|
| "Show me all open cases assigned to my team" | Filter cases, return list |
| "Summarize the harassment cases from last quarter" | Query + AI summary |
| "What's the status of case 2024-001?" | Lookup + formatted response |
| "Assign this case to Jennifer" | Execute assignment action |
| "Create a board report for Q4 ethics metrics" | Generate presentation |
| "What policies cover retaliation?" | Policy search + excerpts |

#### Unified Audit Trail

The platform uses a single `AUDIT_LOG` table (not module-specific activity tables):

```
AUDIT_LOG (unified across all modules)
├── entity_type: 'CASE' | 'DISCLOSURE' | 'POLICY' | 'USER' | ...
├── entity_id: uuid
├── action: standardized enum
├── action_description: text (natural language)
├── actor_id: uuid (User who performed action)
├── actor_type: 'USER' | 'SYSTEM' | 'AI'
├── context: json (full context for AI understanding)
├── changes: json (field-level before/after)
├── ip_address, user_agent
└── created_at (immutable)
```

This enables cross-entity queries like "Show me all actions by this user" or "What happened to this case?"

#### Analytics Fact Tables

Pre-aggregated tables for fast dashboards (see `ANALYTICS-DATA-MODEL.md`):

| Fact Table | Purpose |
|------------|---------|
| `CASE_FACT` | Case metrics: days open, resolution time, category trends |
| `DISCLOSURE_FACT` | Disclosure metrics: approval time, campaign completion |
| `FORM_FACT` | Form submission metrics: completion rate, time to complete |
| `ATTESTATION_FACT` | Attestation metrics: compliance rate, overdue tracking |

Fact tables are refreshed incrementally (5 min) and fully (daily) to support both real-time dashboards and historical reporting.

---

## Permissions Model

### Role Hierarchy

| Role | See Cases | Assign | Investigate | Close | Configure |
|------|-----------|--------|-------------|-------|-----------|
| **Oversight** (Audit Committee) | Specific (view only) | No | No | No | No |
| **CCO** | All | Yes | Optional | Yes | Yes |
| **Triage Lead** | Scoped | Yes | Yes | Configurable | Limited |
| **Investigator** | Assigned only | Configurable | Yes | Configurable | No |
| **Manager** (proxy) | Own submissions | No | No | No | No |
| **Employee** | Own cases | No | No | No | No |

### Visibility Scoping

Beyond role permissions, visibility can be restricted by:
- Geographic region
- Business unit
- Case category
- Sensitivity level

### Configurable Permissions

These settings are adjustable per client:
- Can investigators assign cases? (default: No)
- Can investigators close cases? (default: No, requires supervisor)
- Is supervisor approval required before closure? (default: No)
- Can oversight roles add comments? (default: No, view only)

---

## Views & Navigation (HubSpot Model)

### Saved Views Concept

Users can create personalized views (tabs) showing filtered data:
- Up to 25-50 saved views per user
- Each view = custom columns + filters + sort
- Can span entity types in "My Views"
- Examples:
  - "My Open Investigations"
  - "Unassigned Cases - EMEA"
  - "High Severity Last 30 Days"
  - "Pending Remediation Steps"

### Navigation Structure

```
LEFT NAV:
├── Dashboard (customizable)
├── My Views (cross-entity)
├── Cases
├── Investigations  
├── Disclosures
├── Policies
├── Remediation
├── Analytics
├── Employee Portal (admin)
└── Settings
```

---

## Routing & Escalation

### Assignment Models (Client Configurable)

| Model | Description |
|-------|-------------|
| **Manual Triage** | Unassigned queue → triage team assigns |
| **Auto by Location** | Route to location-specific HR/investigator |
| **Auto by Category** | Route to department (HR, Legal, Safety) |
| **Auto by Severity** | High severity → specific team |
| **Round Robin** | Distribute evenly across team |
| **Hybrid** | Combination rules |

### Escalation Triggers

- Specific categories (configurable list)
- Keywords in report content (configurable list)
- Severity level
- Combinations of above

### Escalation Actions

- Email notification to escalation contacts
- Phone call by operator (for immediate escalation)
- Route to specific individuals (CCO, Legal, Audit Committee)
- SLA timer activation

---

## Anonymous Communication

### The "Chinese Wall" Model

Ethico acts as a relay protecting reporter identity:

```
REPORTER                    ETHICO                     CLIENT
                              │
[email/phone] ──────────────► │ ◄─────────────── [messages]
   (stored,                   │                    (can send,
    hidden)                   │                    can't see
                              │                    contact info)
              ◄───────────────┤
              [forwarded      │
               messages]      │
```

### Anonymous Contact Methods

| Method | Status | Description |
|--------|--------|-------------|
| Access Code | Current | Reporter checks status via code |
| Email Relay | Current | Messages forwarded, address hidden |
| SMS Relay | Future | Text messages, number hidden |
| Web Portal | Future | Check status, leave messages online |

---

## Technical Architecture (Proposed)

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Python FastAPI |
| **Database** | PostgreSQL 15+ with pgvector |
| **Search** | Elasticsearch 8+ |
| **Cache** | Redis |
| **AI** | Anthropic Claude API |
| **Storage** | AWS S3 (documents, evidence) |
| **Infrastructure** | AWS / Kubernetes (EKS) |

### Multi-Tenancy

- Shared database with row-level security (RLS)
- `organization_id` on all tables
- Tenant context set at authentication via JWT
- Data isolation enforced at query level AND application layer (defense in depth)
- Business unit scoping within tenants (`business_unit_id`)

### Key Technical Decisions (Resolved)

See `00-PLATFORM/WORKING-DECISIONS.md` Section 13 for full details.

| Decision | Resolution |
|----------|------------|
| HRIS integration | Merge.dev unified API + SFTP fallback (see `TECH-SPEC-HRIS-INTEGRATION.md`) |
| Notification system | Unified event-driven service; Email at launch, SMS later |
| File storage | Azure Blob Storage, per-tenant containers, AES-256 encryption |
| Audit log architecture | Unified `AUDIT_LOG` table with natural language (see `CORE-DATA-MODEL.md`) |
| Search indexing | Hybrid: PostgreSQL FTS primary, Elasticsearch for complex, pgvector for semantic |
| User vs Employee | Separate entities; Users for auth, Employees for HRIS (see above) |
| Analytics architecture | Fact tables with incremental refresh (see `ANALYTICS-DATA-MODEL.md`) |
| UI Framework | shadcn/ui + Tailwind CSS (Radix primitives) |
| Background jobs | BullMQ with Redis |
| Real-time features | Socket.io + Y.js for collaborative editing |

### Supporting Technical Documents

| Document | Purpose |
|----------|---------|
| `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` | User, Employee, Organization, Category, AuditLog schemas |
| `01-SHARED-INFRASTRUCTURE/ANALYTICS-DATA-MODEL.md` | Fact tables, dashboard/report persistence |
| `01-SHARED-INFRASTRUCTURE/TECH-SPEC-HRIS-INTEGRATION.md` | Merge.dev integration, employee sync |
| `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md` | SSO, JWT, RLS, RBAC details |
| `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-INTEGRATION.md` | Claude API patterns, prompts |
| `00-PLATFORM/WORKING-DECISIONS.md` | All architectural decisions |
| `00-PLATFORM/AI-FIRST-CHECKLIST.md` | Design validation checklist |

---

## Competitive Differentiation

### AI-First Platform Advantage

Unlike competitors who bolt AI features onto legacy architectures, Ethico's platform is **AI-first from the data model up**:

| Aspect | Competitors | Ethico Platform |
|--------|-------------|-----------------|
| **Data Design** | Structured fields only | Narrative + structured + AI enrichment |
| **Audit Trails** | Action codes | Natural language descriptions |
| **Search** | Keyword matching | Semantic understanding (pgvector) |
| **Migration** | Manual data entry | AI-assisted import with context preservation |
| **Reporting** | Fixed dashboards | Natural language queries |
| **Summaries** | Manual writing | AI-generated with human edit |

**What This Enables:**
- "Show me cases similar to this one" (semantic search)
- "Summarize all harassment cases from EMEA this quarter" (natural language)
- "What patterns do you see across our retaliation cases?" (cross-case AI)
- Automatic board report generation from data
- AI that understands context because data was designed for AI

### vs. NAVEX / EQS / Case IQ

| Capability | Competitors | Ethico Platform |
|------------|-------------|-----------------|
| Platform Unity | Fragmented acquisitions | Native unified build |
| AI Features | Limited / add-on | Native throughout (AI-first architecture) |
| Analytics | Basic dashboards | HubSpot-style self-service + AI queries |
| Configurability | Rigid | Flexible views, fields, workflows |
| Custom Fields | Limited, not reportable | Unlimited, fully reportable |
| Investigation Templates | None/basic | Category-specific checklists |
| Remediation Tracking | Separate system | Integrated with library |
| User Experience | Legacy (2010s) | Modern (2025) |
| Time to Value | Weeks/months | Hours/days |
| Data Migration | Painful, lossy | AI-assisted, context-preserving |

### Magic Features (Switching Triggers)

1. Legacy data ingestion from competitor systems
2. Configurable views per user (HubSpot-style)
3. Intuitive board reporting without Power BI
4. AI translation (real-time, bidirectional)
5. AI case summaries and document analysis
6. Remediation plan library with reporting
7. Investigation templates by category
8. Gap detection ("these cases missing resolution dates")

---

## Success Metrics

### Platform Health

| Metric | Target |
|--------|--------|
| Page load time | < 2 seconds |
| API response (p95) | < 500ms |
| Uptime | > 99.5% |
| AI summary generation | < 10 seconds |

### Business Outcomes

| Metric | Target |
|--------|--------|
| Time to first assignment | < 4 hours |
| Average case resolution | < 30 days |
| Investigation completeness | > 95% |
| User adoption rate | > 90% |
| Free tier conversion | > 5% |

---

## Appendix: Glossary

| Term | Definition |
|------|------------|
| **Case** | Primary container for risk intelligence from an intake |
| **Investigation** | Workstream within a Case with own assignee, status, findings |
| **Interaction** | Any touch point on a Case (initial intake, follow-ups) |
| **RFI** | Request for Information - logged inquiry, not a full case |
| **Directive** | Client-specific guidance/script for operators |
| **Subject** | Person named in a Case (accused, witness, etc.) |
| **Remediation Plan** | Checklist of corrective actions post-investigation |
| **Proxy Report** | Case submitted by manager on behalf of employee |
| **Intake** | The initial capture of information (embedded in Case) |

---

*End of Platform Vision Document*
