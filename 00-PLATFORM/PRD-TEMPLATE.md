# PRD Template: [Module Name]

**Document ID:** PRD-XXX
**Version:** 1.0
**Priority:** P1/P2/P3
**Development Phase:** Phase X
**Last Updated:** [Month Year]

**Cross-References:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md`
- Core Data Model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
- Authentication & Multi-tenancy: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md`
- AI Integration Patterns: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-INTEGRATION.md`
- [Related Module PRDs...]

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [AI-First Considerations](#ai-first-considerations)
3. [User Stories](#user-stories)
4. [Feature Specifications](#feature-specifications)
5. [Data Model](#data-model)
6. [API Specifications](#api-specifications)
7. [UI/UX Specifications](#uiux-specifications)
8. [Migration Considerations](#migration-considerations)
9. [Integration Points](#integration-points)
10. [Non-Functional Requirements](#non-functional-requirements)
11. [Checklist Verification](#checklist-verification)

---

## Executive Summary

### Purpose
[2-3 sentences describing what this module does and why it matters]

### Target Users
| Role | Primary Use Cases |
|------|-------------------|
| [Role 1] | [What they do with this module] |
| [Role 2] | [What they do with this module] |

### Key Differentiators
[What makes this module better than competitor solutions]

---

## AI-First Considerations

### Conversational Interface

How users might interact with this module via natural language chat:

| User Intent | Example Phrases | AI Response |
|-------------|-----------------|-------------|
| [Intent 1] | "Show me...", "Find..." | [What AI does] |
| [Intent 2] | "Create a...", "Draft..." | [What AI does] |
| [Intent 3] | "Summarize...", "What is..." | [What AI does] |

**Example Conversations:**

```
User: "[Example natural language query]"
AI: "[Example AI response with specific module context]"

User: "[Follow-up question]"
AI: "[Context-aware response]"
```

### AI Assistance Points

| User Action | AI Can Help By | Confidence Level |
|-------------|----------------|------------------|
| [Action 1] | [How AI assists] | High/Medium/Low |
| [Action 2] | [How AI assists] | High/Medium/Low |
| [Action 3] | [How AI assists] | High/Medium/Low |

### Data Requirements for AI Context

What information does AI need to be helpful in this module?

**Minimum Context:**
- [Required data point 1]
- [Required data point 2]

**Enhanced Context (Improves Quality):**
- [Optional data point 1]
- [Optional data point 2]

**Cross-Module Context:**
- [Data from related modules that enriches AI responses]

---

## User Personas

Stories use three macro-personas with specific roles:

### Ethico Staff (Operator Console)
Internal Ethico employees who manage the platform and handle intake:
- **Hotline Operator** - Intake calls, create cases, capture metadata
- **QA Reviewer** - Review case quality, compliance checks, release to client
- **Implementation Specialist** - Tenant setup, migrations, configuration

### Client Admin (Client Platform)
Customer employees who configure and manage compliance programs:
- **CCO / Compliance Officer** - Oversight, reporting, strategic configuration
- **Investigator** - Case work, interviews, findings, remediation
- **Triage Lead** - Assignment, prioritization, workload management
- **Policy Author** - Draft, review, publish policies
- **System Admin** - Technical configuration, integrations, user management
- **HR Manager** - Employee disclosures, attestation oversight

### End User (Ethics Portal, Self-Service)
Employees and external parties who interact with compliance processes:
- **Employee** - Attestations, disclosures, policy acknowledgment, chatbot
- **Anonymous Reporter** - Case submission without identification
- **Manager** - Team disclosures, departmental compliance

**Story Format:** `As a [specific role], I want to [action] so that [value]`

---

## User Stories

### Epic 1: [Epic Name]

#### Ethico Staff Stories

**US-XXX-001: [Story Title]**

As a [Operator/QA Reviewer/Implementation Specialist], I want to [action] so that [benefit].

**Acceptance Criteria:**
- [ ] [Criterion 1 - specific, testable]
- [ ] [Criterion 2 - specific, testable]
- [ ] [Criterion 3 - specific, testable]

**AI Enhancement:**
- AI can [how AI assists with this story]

**Ralph Task Readiness:**
- [ ] Clear entry point (file/endpoint to create/modify)
- [ ] Pattern reference (existing similar implementation)
- [ ] Test specification (what tests verify completion)

#### Client Admin Stories

**US-XXX-010: [Story Title]**

As a [CCO/Investigator/Triage Lead/Policy Author/System Admin/HR Manager], I want to [action] so that [benefit].

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]

**AI Enhancement:**
- AI can [how AI assists with this story]

#### End User Stories

**US-XXX-020: [Story Title]**

As an [Employee/Anonymous Reporter/Manager], I want to [action] so that [benefit].

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]

**AI Enhancement:**
- AI can [how AI assists with this story]

---

### Epic 2: [Epic Name]

[Continue with user stories organized by persona group...]

---

## Feature Specifications

### F1: [Feature Name]

**Description:**
[Detailed description of the feature]

**User Flow:**
1. User [action 1]
2. System [response 1]
3. User [action 2]
4. System [response 2]

**Business Rules:**
- [Rule 1]
- [Rule 2]

**AI Integration:**
- [How AI enhances this feature]

**Error Handling:**
| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| [Condition 1] | "[Message]" | [Action] |

---

## Data Model

### Entities

#### [EntityName]

**Purpose:** [What this entity represents]

```
EntityName {
  // Identity
  id: uuid @id @default(uuid())
  organization_id: uuid @relation(Organization)
  [business_unit_id: uuid @relation(BusinessUnit)]

  // Core Business Fields
  [field_name]: type                    // [Description]
  [field_name]: type                    // [Description]

  // Semantic/Descriptive Fields
  title: string                         // Human-readable title
  description: text                     // Detailed narrative description
  notes: text                           // Additional context/comments

  // Status with Rationale
  status: enum(STATUS_VALUES)           // Current status
  status_rationale: text                // Why this status was set
  status_changed_at: timestamp          // When status last changed
  status_changed_by_id: uuid            // Who changed the status

  // AI Enrichment Fields
  ai_summary: text?                     // AI-generated summary
  ai_summary_generated_at: timestamp?   // When summary was generated
  ai_model_version: string?             // Model that generated content
  ai_risk_score: decimal?               // AI-assessed risk (if applicable)
  ai_category_suggestions: json?        // AI-suggested categorizations

  // Migration/Source Tracking
  source_system: string?                // 'NAVEX', 'EQS', 'MANUAL', etc.
  source_record_id: string?             // Original ID in source system
  migrated_at: timestamp?               // When record was imported

  // Audit Fields
  created_at: timestamp @default(now())
  updated_at: timestamp @updatedAt
  created_by_id: uuid @relation(User)
  updated_by_id: uuid @relation(User)

  // Relations
  @@relation: activities -> EntityActivity[]
  @@relation: [other relations...]

  // Indexes
  @@index([organization_id])
  @@index([organization_id, status])
  @@index([organization_id, created_at])
}
```

**Status Values:**
| Status | Description | Transitions From | Transitions To |
|--------|-------------|------------------|----------------|
| [STATUS_1] | [Description] | [States] | [States] |
| [STATUS_2] | [Description] | [States] | [States] |

---

#### EntityActivity (Activity Log)

```
EntityActivity {
  id: uuid @id @default(uuid())
  entity_id: uuid @relation(Entity)
  organization_id: uuid @relation(Organization)

  // Action Details
  action: string                        // 'created', 'updated', 'status_changed', etc.
  action_description: text              // "John assigned this case to Sarah"

  // Actor Information
  actor_user_id: uuid? @relation(User)  // Null for system actions
  actor_type: enum('user', 'system', 'ai', 'integration')

  // Change Tracking
  changes: json                         // { old_value, new_value, fields_changed[] }
  context: json                         // Additional context for AI understanding

  // Metadata
  ip_address: string?
  user_agent: string?

  created_at: timestamp @default(now()) // Immutable - no updated_at

  @@index([organization_id, entity_id, created_at])
  @@index([organization_id, created_at])
}
```

**Activity Action Types:**
| Action | Description | Changes Captured |
|--------|-------------|------------------|
| `created` | Entity created | Initial field values |
| `updated` | Fields modified | Old/new values for changed fields |
| `status_changed` | Status transition | Old status, new status, rationale |
| `assigned` | Assignee changed | Old assignee, new assignee |
| `commented` | Comment added | Comment content |
| `ai_enriched` | AI generated content | What AI generated |

---

### Entity Relationships Diagram

```
[Organization] 1──────* [Entity]
                         │
                         │ 1
                         │
                         * [EntityActivity]

[User] 1──────* [Entity] (as owner/assignee)
       1──────* [EntityActivity] (as actor)
```

---

## API Specifications

### Endpoints

#### Create Entity
```
POST /api/v1/[entities]

Request:
{
  "title": "string (required)",
  "description": "string",
  "[field]": "[type]"
}

Response (201):
{
  "id": "uuid",
  "organization_id": "uuid",
  "title": "string",
  "description": "string",
  "status": "DRAFT",
  "created_at": "ISO8601",
  "created_by": {
    "id": "uuid",
    "name": "string"
  }
}

Errors:
- 400: Validation error (details in response)
- 401: Not authenticated
- 403: Insufficient permissions
```

#### List Entities
```
GET /api/v1/[entities]?page=1&limit=20&status=ACTIVE&search=keyword

Query Parameters:
- page: integer (default: 1)
- limit: integer (default: 20, max: 100)
- status: enum filter
- search: full-text search
- sort: field name
- order: asc|desc

Response (200):
{
  "data": [...entities...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### Get Entity
```
GET /api/v1/[entities]/:id

Response (200):
{
  "id": "uuid",
  ...full entity...,
  "activities": [...recent activities...],
  "related": {
    "[relation]": [...related entities...]
  }
}

Include Parameter:
?include=activities,related_entity
```

[Continue with Update, Delete, and action-specific endpoints...]

---

## UI/UX Specifications

### Navigation Placement
[Where this module appears in the navigation hierarchy]

### Key Screens

#### [Screen Name] List View
- **Purpose:** [What user accomplishes]
- **Components:**
  - Filter bar with [filter options]
  - Data table with columns: [column list]
  - Pagination controls
  - Bulk action toolbar (when items selected)
  - AI suggestion panel (collapsible)

#### [Screen Name] Detail View
- **Purpose:** [What user accomplishes]
- **Layout:**
  - Header with title, status badge, actions
  - Main content area with [content sections]
  - Sidebar with [metadata, relations]
  - Activity timeline (collapsible)
  - AI assistance panel (collapsible)

### AI Panel Design
- **Location:** Right sidebar, collapsible
- **Content:**
  - AI-generated summary
  - Suggested actions
  - Related items AI identified
  - Chat interface for questions
- **User Controls:**
  - Refresh/regenerate
  - Edit AI content
  - Dismiss suggestions

---

## Migration Considerations

### Data Mapping from Competitor Systems

| Source System | Source Field | Target Field | Transformation |
|---------------|--------------|--------------|----------------|
| NAVEX | [field] | [field] | [how to map] |
| EQS | [field] | [field] | [how to map] |
| CSV Import | [column] | [field] | [how to map] |

### Handling Sparse Data

| Field | If Missing | Default/Fallback |
|-------|------------|------------------|
| [field] | [what happens] | [default value] |

### Post-Migration AI Enrichment

After migration, AI can:
- [ ] Generate summaries for records lacking them
- [ ] Suggest categorization for uncategorized records
- [ ] Identify potential duplicates
- [ ] Flag data quality issues

---

## Integration Points

### Internal Module Integrations

| Module | Integration Type | Data Exchanged |
|--------|------------------|----------------|
| Case Management | Reference | [What data flows] |
| Disclosures | Reference | [What data flows] |
| Analytics | Feed | [What metrics tracked] |

### External System Integrations

| System | Integration Method | Sync Frequency |
|--------|-------------------|----------------|
| HRIS | API/Webhook | Real-time/Daily |
| LMS | API | [Frequency] |

---

## Non-Functional Requirements

### Performance
- Page load: < 2 seconds
- API response (p95): < 500ms
- Search response: < 1 second

### Security
- All data filtered by organization_id
- Role-based access enforced
- PII fields encrypted at rest
- Audit trail for all changes

### Scalability
- Support 10,000+ records per tenant
- Support 100+ concurrent users per tenant

---

## Checklist Verification

### AI-First Checklist Compliance

**Schema Design:**
- [ ] Semantic field naming used throughout
- [ ] Narrative fields (description, notes) included
- [ ] Activity log designed for all entities
- [ ] Source tracking fields included
- [ ] AI enrichment fields included
- [ ] Graceful degradation for sparse data

**Feature Design:**
- [ ] Chat interaction examples documented
- [ ] AI assistance opportunities identified
- [ ] Conversation storage planned
- [ ] AI action audit designed
- [ ] Migration impact assessed
- [ ] Structured + unstructured data captured

**API Design:**
- [ ] AI-friendly responses with context
- [ ] Bulk operations supported
- [ ] Natural language search available

**UI Design:**
- [ ] AI panel space allocated
- [ ] Context preservation designed
- [ ] Self-service configuration enabled

**Cross-Cutting:**
- [ ] organization_id on all tables
- [ ] business_unit_id where applicable
- [ ] Audit trail complete
- [ ] PII handling documented

---

## Appendix

### Glossary
| Term | Definition |
|------|------------|
| [Term] | [Definition] |

### Change Log
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | [Date] | Initial draft | [Name] |

---

*End of PRD Template*
