# Core Data Model

**Purpose:** Defines foundational entities shared across all platform modules. These entities are the building blocks referenced by Case Management, Disclosures, Policy Management, Analytics, and all other modules.

**Last Updated:** January 2026

**Cross-References:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md`
- AI-First Checklist: `00-PLATFORM/AI-FIRST-CHECKLIST.md`

---

## Table of Contents

1. [Entity Overview](#entity-overview)
2. [Organization](#organization)
3. [User](#user)
4. [Employee](#employee)
5. [Business Unit](#business-unit)
6. [Location](#location)
7. [Category](#category)
8. [Unified Audit Log](#unified-audit-log)
9. [Entity Relationships](#entity-relationships)
10. [Index Strategies](#index-strategies)

---

## Entity Overview

### Entity Hierarchy

```
ORGANIZATION (tenant root)
├── User (platform login identities)
├── Employee (HRIS-synced individuals)
├── BusinessUnit (organizational subdivisions)
├── Location (physical/logical locations)
├── Category (unified taxonomy across modules)
└── AuditLog (unified activity tracking)
```

### Cross-Module Usage

| Entity | Case Mgmt | Disclosures | Policies | Analytics | Chatbot |
|--------|-----------|-------------|----------|-----------|---------|
| Organization | ✅ | ✅ | ✅ | ✅ | ✅ |
| User | Assignee | Approver | Owner | Viewer | - |
| Employee | Subject | Submitter | Attester | Demographic | User |
| BusinessUnit | Scoping | Scoping | Scoping | Slicing | - |
| Location | Metadata | Metadata | Scoping | Slicing | - |
| Category | Classification | Classification | Tagging | Grouping | Routing |
| AuditLog | Activity | Activity | Activity | Reports | Activity |

---

## Organization

The root tenant entity. All data is scoped to an organization.

### Schema

```prisma
model Organization {
  id                    String   @id @default(uuid())

  // Identity
  name                  String                    // Display name
  slug                  String   @unique         // URL-safe identifier
  domain                String?                  // Primary email domain for SSO
  additional_domains    String[]                 // Additional email domains

  // Subscription
  tier                  OrganizationTier         // FREE, PREMIUM, ENTERPRISE
  billing_status        BillingStatus            // ACTIVE, PAST_DUE, SUSPENDED
  subscription_expires  DateTime?

  // Branding
  logo_url              String?
  primary_color         String?                  // Hex color

  // Configuration
  settings              Json                     // Feature flags, limits
  timezone              String   @default("UTC")
  default_language      String   @default("en")

  // Contacts
  primary_contact_id    String?  @relation(User)
  billing_contact_email String?

  // Metadata
  industry              String?
  employee_count_range  String?                  // "1-50", "51-200", etc.

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Relations
  users                 User[]
  employees             Employee[]
  business_units        BusinessUnit[]
  locations             Location[]
  categories            Category[]
  audit_logs            AuditLog[]
}

enum OrganizationTier {
  FREE
  PREMIUM
  ENTERPRISE
}

enum BillingStatus {
  ACTIVE
  TRIAL
  PAST_DUE
  SUSPENDED
  CANCELLED
}
```

### Settings JSON Structure

```json
{
  "features": {
    "ai_enabled": true,
    "chatbot_enabled": true,
    "anonymous_reporting": true,
    "sso_required": false,
    "two_factor_required": false
  },
  "limits": {
    "max_users": 50,
    "max_storage_gb": 10,
    "max_cases_per_month": 100
  },
  "defaults": {
    "case_retention_days": 2555,
    "session_timeout_minutes": 30
  },
  "integrations": {
    "hris_provider": "workday",
    "sso_provider": "azure_ad"
  }
}
```

---

## User

Platform login identities with authentication and authorization.

### Schema

```prisma
model User {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Identity
  email                 String                    // Unique within org
  first_name            String
  last_name             String
  display_name          String?                   // Override for display

  // Authentication
  password_hash         String?                   // Null for SSO-only users
  sso_provider          SSOProvider?              // AZURE_AD, GOOGLE, SAML, OIDC
  sso_id                String?                   // External identity ID
  mfa_enabled           Boolean  @default(false)
  mfa_secret            String?                   // Encrypted TOTP secret

  // Profile
  avatar_url            String?
  phone                 String?
  job_title             String?

  // Organizational Placement
  department            String?
  location_id           String?
  location              Location? @relation(fields: [location_id], references: [id])
  business_unit_ids     String[]                  // Can belong to multiple BUs

  // RBAC
  role                  UserRole
  custom_permissions    Json?                     // Override permissions

  // Linkage
  employee_id           String?  @unique         // Link to HRIS Employee
  employee              Employee? @relation(fields: [employee_id], references: [id])

  // Status
  is_active             Boolean  @default(true)
  is_locked             Boolean  @default(false)
  lock_reason           String?
  last_login_at         DateTime?
  failed_login_attempts Int      @default(0)
  password_changed_at   DateTime?

  // Preferences
  preferences           Json?                     // UI preferences, notifications

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String?
  updated_by_id         String?

  // Unique constraints
  @@unique([organization_id, email])

  // Indexes
  @@index([organization_id])
  @@index([organization_id, role])
  @@index([organization_id, is_active])
  @@index([sso_provider, sso_id])
}

enum UserRole {
  SYSTEM_ADMIN          // Full platform access
  COMPLIANCE_OFFICER    // Full compliance module access
  TRIAGE_LEAD          // Case assignment, limited config
  INVESTIGATOR         // Assigned cases only
  POLICY_AUTHOR        // Create/edit policies
  POLICY_REVIEWER      // Approve policies
  DEPARTMENT_ADMIN     // Department-scoped access
  MANAGER              // Proxy reporting, team view
  OVERSIGHT            // View-only (Audit Committee)
  READ_ONLY            // View published content only
  EMPLOYEE             // Self-service only
}

enum SSOProvider {
  AZURE_AD
  GOOGLE
  SAML
  OIDC
}
```

### User Preferences JSON Structure

```json
{
  "ui": {
    "theme": "light",
    "sidebar_collapsed": false,
    "default_view": "/cases",
    "items_per_page": 25
  },
  "notifications": {
    "email_case_assigned": true,
    "email_approval_needed": true,
    "email_digest": "daily",
    "in_app_enabled": true
  },
  "locale": {
    "language": "en",
    "date_format": "MM/DD/YYYY",
    "time_format": "12h"
  }
}
```

---

## Employee

HRIS-synced individuals representing all people in the organization.

### Schema

```prisma
model Employee {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // External Identity
  hris_employee_id      String                    // ID from HRIS system
  source_system         HRISProvider              // Which HRIS

  // Personal Information
  email                 String?
  first_name            String
  last_name             String
  preferred_name        String?

  // Employment Details
  job_title             String?
  job_code              String?
  job_family            String?
  employment_type       EmploymentType?           // FULL_TIME, PART_TIME, etc.
  employment_status     EmploymentStatus          // ACTIVE, TERMINATED, LEAVE

  // Organizational Placement
  department            String?
  department_code       String?
  location_id           String?
  location              Location? @relation(fields: [location_id], references: [id])
  business_unit_id      String?
  business_unit         BusinessUnit? @relation(fields: [business_unit_id], references: [id])
  cost_center           String?

  // Manager Hierarchy
  manager_id            String?
  manager               Employee? @relation("ManagerReports", fields: [manager_id], references: [id])
  direct_reports        Employee[] @relation("ManagerReports")

  // Dates
  hire_date             DateTime?
  termination_date      DateTime?
  rehire_date           DateTime?

  // Contact (for notifications)
  work_phone            String?
  mobile_phone          String?

  // Custom Fields (HRIS-specific)
  custom_fields         Json?                     // Flexible HRIS metadata

  // Platform Linkage
  user_id               String?  @unique
  user                  User?    @relation(fields: [user_id], references: [id])

  // Sync Metadata
  synced_at             DateTime                  // Last HRIS sync
  sync_hash             String?                   // Detect changes

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Unique constraints
  @@unique([organization_id, hris_employee_id])

  // Indexes
  @@index([organization_id])
  @@index([organization_id, employment_status])
  @@index([organization_id, department])
  @@index([organization_id, business_unit_id])
  @@index([organization_id, manager_id])
  @@index([email])
}

enum HRISProvider {
  WORKDAY
  BAMBOOHR
  ADP
  UKG
  SAP_SUCCESSFACTORS
  ORACLE_HCM
  NAMELY
  RIPPLING
  GUSTO
  PAYLOCITY
  CERIDIAN
  CSV_IMPORT
  MANUAL
}

enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACTOR
  INTERN
  TEMP
}

enum EmploymentStatus {
  ACTIVE
  TERMINATED
  LEAVE
  SUSPENDED
  PENDING
}
```

### Custom Fields JSON Structure

```json
{
  "workday": {
    "worker_type": "Employee",
    "pay_group": "Semi-Monthly",
    "supervisory_organization": "Engineering"
  },
  "custom": {
    "badge_number": "EMP-12345",
    "security_clearance": "Level 2"
  }
}
```

---

## Business Unit

Organizational subdivisions for scoping and reporting.

### Schema

```prisma
model BusinessUnit {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Identity
  name                  String
  code                  String                    // Short code (e.g., "EMEA", "SALES")
  description           String?

  // Hierarchy
  parent_id             String?
  parent                BusinessUnit? @relation("BUHierarchy", fields: [parent_id], references: [id])
  children              BusinessUnit[] @relation("BUHierarchy")
  level                 Int      @default(0)      // 0 = top level
  path                  String                    // Materialized path: "/root/child/grandchild"

  // Configuration
  settings              Json?                     // BU-specific settings

  // Status
  is_active             Boolean  @default(true)

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Unique constraints
  @@unique([organization_id, code])

  // Indexes
  @@index([organization_id])
  @@index([organization_id, parent_id])
  @@index([organization_id, is_active])
}
```

---

## Location

Physical or logical locations for scoping and reporting.

### Schema

```prisma
model Location {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Identity
  name                  String
  code                  String                    // Short code
  description           String?

  // Hierarchy
  parent_id             String?
  parent                Location? @relation("LocationHierarchy", fields: [parent_id], references: [id])
  children              Location[] @relation("LocationHierarchy")
  level                 Int      @default(0)
  path                  String                    // Materialized path

  // Address
  address_line_1        String?
  address_line_2        String?
  city                  String?
  state_province        String?
  postal_code           String?
  country               String                    // ISO 3166-1 alpha-2

  // Metadata
  timezone              String?                   // IANA timezone
  currency              String?                   // ISO 4217
  locale                String?                   // BCP 47 language tag

  // Contact
  phone                 String?
  email                 String?

  // Configuration
  settings              Json?                     // Location-specific settings

  // Status
  is_active             Boolean  @default(true)

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Unique constraints
  @@unique([organization_id, code])

  // Indexes
  @@index([organization_id])
  @@index([organization_id, country])
  @@index([organization_id, is_active])
}
```

---

## Category

Unified taxonomy for classification across modules (Cases, Disclosures, Policies).

### Schema

```prisma
model Category {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Identity
  name                  String
  code                  String                    // Short code
  description           String?

  // Classification
  module                CategoryModule            // Which module(s) use this
  concept_key           String?                   // Cross-module correlation key

  // Hierarchy
  parent_id             String?
  parent                Category? @relation("CategoryHierarchy", fields: [parent_id], references: [id])
  children              Category[] @relation("CategoryHierarchy")
  level                 Int      @default(0)
  path                  String                    // Materialized path

  // Behavior
  severity_default      SeverityLevel?            // Default severity for this category
  requires_investigation Boolean @default(true)   // For cases
  escalation_required   Boolean @default(false)
  sla_days              Int?                      // Target resolution time

  // Routing
  default_assignee_id   String?                   // Default case assignee
  routing_rules         Json?                     // Complex routing configuration

  // Module-Specific Config
  module_config         Json?                     // Module-specific settings

  // Display
  icon                  String?                   // Icon identifier
  color                 String?                   // Hex color
  sort_order            Int      @default(0)

  // Status
  is_active             Boolean  @default(true)
  is_system             Boolean  @default(false)  // System-managed, not editable

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Unique constraints
  @@unique([organization_id, module, code])

  // Indexes
  @@index([organization_id])
  @@index([organization_id, module])
  @@index([organization_id, concept_key])
  @@index([organization_id, is_active])
}

enum CategoryModule {
  CASE                  // Case management categories
  DISCLOSURE            // Disclosure types (COI, Gift, etc.)
  POLICY                // Policy categories
  ALL                   // Applies to all modules
}

enum SeverityLevel {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}
```

### Concept Key Pattern

The `concept_key` enables cross-module analytics:

```
concept_key: "harassment"
├── Category: "Harassment" (module: CASE)
├── Category: "Anti-Harassment Policy" (module: POLICY)
└── Disclosure trigger: "harassment-related gift" (module: DISCLOSURE)

Dashboard query: "All harassment-related activity"
→ Cases with concept_key = 'harassment'
→ Policies with concept_key = 'harassment'
→ Disclosures tagged with concept_key = 'harassment'
```

### Module Config JSON Structure

```json
{
  "case": {
    "investigation_template_id": "uuid",
    "required_fields": ["location", "severity"],
    "auto_notify_roles": ["COMPLIANCE_OFFICER"]
  },
  "disclosure": {
    "form_template_id": "uuid",
    "approval_workflow_id": "uuid"
  },
  "policy": {
    "review_frequency_days": 365,
    "requires_attestation": true
  }
}
```

---

## Unified Audit Log

Cross-entity activity tracking for compliance and AI context.

### Schema

```prisma
model AuditLog {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Entity Reference (polymorphic)
  entity_type           AuditEntityType
  entity_id             String

  // Action
  action                String                    // 'created', 'updated', 'status_changed', etc.
  action_category       AuditActionCategory       // CREATE, UPDATE, DELETE, ACCESS, SYSTEM
  action_description    String                    // Natural language: "John assigned case to Sarah"

  // Actor
  actor_user_id         String?                   // Null for system actions
  actor_user            User?    @relation(fields: [actor_user_id], references: [id])
  actor_type            ActorType
  actor_name            String?                   // Denormalized for display

  // Change Details
  changes               Json?                     // { field: { old, new } }
  context               Json?                     // Additional context for AI

  // Request Metadata
  ip_address            String?
  user_agent            String?
  request_id            String?                   // Correlation ID

  // Timestamp (immutable)
  created_at            DateTime @default(now())

  // Indexes for query patterns
  @@index([organization_id, created_at])
  @@index([organization_id, entity_type, entity_id, created_at])
  @@index([organization_id, actor_user_id, created_at])
  @@index([organization_id, action_category, created_at])
}

enum AuditEntityType {
  CASE
  INVESTIGATION
  DISCLOSURE
  POLICY
  ATTESTATION
  WORKFLOW
  USER
  EMPLOYEE
  ORGANIZATION
  CATEGORY
  FORM
  CHATBOT_CONVERSATION
  REPORT
  DASHBOARD
  INTEGRATION
}

enum AuditActionCategory {
  CREATE
  UPDATE
  DELETE
  ACCESS               // View, download, export
  SYSTEM               // Automated actions
  SECURITY             // Auth events
  AI                   // AI-generated actions
}

enum ActorType {
  USER                 // Human user
  SYSTEM               // Automated process
  AI                   // AI-generated action
  INTEGRATION          // External system
  ANONYMOUS            // Anonymous reporter action
}
```

### Changes JSON Structure

```json
{
  "status": {
    "old": "OPEN",
    "new": "IN_PROGRESS"
  },
  "assigned_to_id": {
    "old": null,
    "new": "user-uuid-123"
  },
  "fields_changed": ["status", "assigned_to_id"]
}
```

### Context JSON Structure

```json
{
  "reason": "High severity case requires immediate attention",
  "triggered_by": "escalation_rule_123",
  "related_entities": [
    { "type": "CASE", "id": "case-uuid" },
    { "type": "USER", "id": "user-uuid" }
  ],
  "ai_context": {
    "summary_before": "Case was unassigned",
    "summary_after": "Case assigned to Sarah Chen for investigation"
  }
}
```

### Standard Action Types

| Action | Category | Description Template |
|--------|----------|---------------------|
| `created` | CREATE | "{Actor} created {entity_type}" |
| `updated` | UPDATE | "{Actor} updated {fields} on {entity_type}" |
| `deleted` | DELETE | "{Actor} deleted {entity_type}" |
| `archived` | UPDATE | "{Actor} archived {entity_type}" |
| `status_changed` | UPDATE | "{Actor} changed status from {old} to {new}" |
| `assigned` | UPDATE | "{Actor} assigned {entity_type} to {assignee}" |
| `unassigned` | UPDATE | "{Actor} unassigned {entity_type} from {assignee}" |
| `commented` | CREATE | "{Actor} added comment on {entity_type}" |
| `viewed` | ACCESS | "{Actor} viewed {entity_type}" |
| `exported` | ACCESS | "{Actor} exported {entity_type} to {format}" |
| `approved` | UPDATE | "{Actor} approved {entity_type}" |
| `rejected` | UPDATE | "{Actor} rejected {entity_type}: {reason}" |
| `ai_generated` | AI | "AI generated {content_type} for {entity_type}" |
| `ai_edited` | AI | "{Actor} edited AI-generated {content_type}" |
| `synced` | SYSTEM | "HRIS sync updated {count} records" |
| `login` | SECURITY | "{Actor} logged in from {location}" |
| `login_failed` | SECURITY | "Failed login attempt for {email}" |

---

## Entity Relationships

```
┌─────────────────┐
│  Organization   │
└────────┬────────┘
         │
    ┌────┴────┬─────────┬──────────┬───────────┐
    │         │         │          │           │
    ▼         ▼         ▼          ▼           ▼
┌───────┐ ┌───────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ User  │ │Employee│ │BusinessUnit│ │Location │ │Category│
└───┬───┘ └───┬───┘ └────────┘ └────────┘ └────────┘
    │         │
    └────┬────┘
         │
    employee_id (optional link)


User → Employee (optional 1:1 link)
Employee → Manager (self-referential)
BusinessUnit → Parent (self-referential hierarchy)
Location → Parent (self-referential hierarchy)
Category → Parent (self-referential hierarchy)
AuditLog → Entity (polymorphic via entity_type + entity_id)
```

---

## Index Strategies

### Primary Query Patterns

| Query Pattern | Index |
|---------------|-------|
| All entities for tenant | `(organization_id)` |
| Active users for tenant | `(organization_id, is_active)` |
| Users by role | `(organization_id, role)` |
| Employees by status | `(organization_id, employment_status)` |
| Employees by department | `(organization_id, department)` |
| Categories by module | `(organization_id, module)` |
| Audit log timeline | `(organization_id, created_at)` |
| Audit for entity | `(organization_id, entity_type, entity_id, created_at)` |

### Composite Indexes

```sql
-- User lookup for authentication
CREATE INDEX idx_user_auth ON "User" (organization_id, email) WHERE is_active = true;

-- Employee search
CREATE INDEX idx_employee_search ON "Employee" (organization_id, first_name, last_name) WHERE employment_status = 'ACTIVE';

-- Audit log recent activity
CREATE INDEX idx_audit_recent ON "AuditLog" (organization_id, created_at DESC) INCLUDE (entity_type, action, actor_name);
```

---

## Migration Notes

### From Legacy Systems

When migrating from competitor systems:

1. **Users**: Map to User entity, set `source_system` on related Employee
2. **Employees**: Import to Employee, link to User if platform access needed
3. **Categories**: Import with `source_system` tracking, AI can suggest `concept_key` mapping
4. **Audit History**: Import to AuditLog with `actor_type = 'SYSTEM'` and migration context

### Source System Tracking

All imported data should populate:
- `source_system`: The originating system (NAVEX, EQS, CSV_IMPORT, etc.)
- `source_record_id`: Original ID in source system
- Context in AuditLog for the import action

---

*End of Core Data Model Document*
