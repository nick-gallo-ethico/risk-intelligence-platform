# Research: Data Management Settings Overhaul

## Part 1: HubSpot Data Management Patterns

### 1. Property Management UI

#### Settings Navigation to Properties

HubSpot's property management is accessed via **Settings > Data Management > Properties**. The page provides a centralized interface for creating, editing, and organizing properties across all CRM object types.

#### Property Listing Page Layout

- **Object Type Selector**: Dropdown at top to filter properties by object (Contacts, Companies, Deals, Tickets, custom objects)
- **"Create property" Button**: Prominent CTA above the property table
- **Filter Bar**: Filter dropdowns for:
  - Property group
  - Field type
  - Brand (for multi-brand accounts)
  - Access level
  - Sensitivity status
  - Creator (which user created it)
- **Search Field**: Search properties by name
- **Sortable Table**: Column headers allow alphabetical sorting
- **Property Table**: Lists properties with name, group, field type, and actions

#### Property Creation Flow

HubSpot provides three creation methods:

1. **Basic Property Editor** (quick create):
   - Select object type from dropdown
   - Enter property label
   - Select field type
   - Confirm creation

2. **Full Property Editor** (advanced) with tabs:
   - **Details Tab**: Property label, internal name (auto-generated, immutable once created), description
   - **Field Type Tab**: Configure field type, additional options (dropdown values), default value
   - **Rules Tab**: Visibility settings, validation rules, conditional logic (show/hide based on other fields)
   - **Sensitive Data Tab**: Mark property as sensitive (Enterprise only)
   - **Manage Access Tab**: Control which users/teams can view/edit
   - **Preview Tab**: Functional preview before deployment

3. **AI-Assisted Creation** (Breeze):
   - Natural language description (e.g., "Create a dropdown with bronze/silver/gold options")
   - AI generates field type, validation rules, options, and defaults

#### Property Groups

Property groups serve as organizational categories for related properties. They:
- Group related properties into logical sections (e.g., "Contact Information", "Deal Information")
- Help identify data origins (especially useful for integration-created properties)
- Distinguish system properties from third-party-added properties
- Custom groups can be created by users
- Properties are displayed grouped by their group in record views

#### Field Types Available

HubSpot uses a **dual-layer type system**: `type` (data structure) + `fieldType` (UI presentation).

**Data Types (type)**:
| Type | Description |
|------|-------------|
| `string` | Text, max 65,536 characters |
| `number` | Decimal-supporting numeric values |
| `bool` | Binary yes/no |
| `enumeration` | Option-based strings (semicolon-separated) |
| `date` | Day/month/year in UTC |
| `datetime` | Full timestamp with time |
| `object_coordinates` | Internal references (read-only) |
| `json` | Formatted JSON (internal use) |

**Field Types (fieldType)**:
| Field Type | Category | Description |
|------------|----------|-------------|
| `text` | Input | Single-line text |
| `textarea` | Input | Multi-line text |
| `html` | Input | Rich text HTML |
| `number` | Input | Numeric input |
| `phonenumber` | Input | Formatted phone |
| `date` | Input | Calendar date picker |
| `file` | Input | File upload |
| `select` | Choice | Single dropdown |
| `radio` | Choice | Radio button group |
| `checkbox` | Choice | Multiple checkboxes |
| `booleancheckbox` | Choice | Binary toggle |
| `calculation_equation` | Computed | Formula-based field |

#### Property Settings

- **Required**: Mandate completion on forms
- **Unique Constraints**: `hasUniqueValue: true` (max 10 per object type)
- **Form Visibility**: Control display in forms
- **Conditional Logic**: Show/hide properties based on other field values
- **Validation Rules**: Enforce data quality standards
- **Default Values**: Settable for text, number, and enumeration types
- **Sensitive Data**: Security classification (Enterprise)
- **Access Control**: User and team permissions per property

#### Calculation Properties

Formula-based properties support:
- Arithmetic: `+`, `-`, `*`, `/`
- Comparison: `<`, `>`, `<=`, `>=`, `=`, `!=`
- Logic: `and`, `or`, `not`
- Functions: `max()`, `min()`, `is_present()`, `contains()`, `concatenate()`
- Conditionals: `if/elseif/else/endif`

**Important limitation**: Calculation properties created via API cannot be edited in the HubSpot UI.

#### Property Constraints

- Custom property limits vary by subscription tier
- Default (system) properties cannot be edited
- Properties in active use cannot have their field type changed
- Changing field types may invalidate existing data
- Internal name is immutable once created

### 2. Object Management

#### Standard Objects

HubSpot provides these built-in objects:
- **Contacts**: People you interact with
- **Companies**: Organizations you do business with
- **Deals**: Revenue opportunities tracked through pipelines
- **Tickets**: Customer support requests
- **Leads**: Potential contacts (newer addition)
- **Line Items**: Individual products in deals
- **Products**: Goods and services catalog
- **Feedback Submissions**: Customer feedback responses

#### Custom Objects

Enterprise users can create custom objects that:
- Have their own properties, pipelines, and associations
- Appear in navigation alongside standard objects
- Support the same property system as standard objects
- Can be associated with any other object type

#### Object Settings Pages

Each object type has settings including:
- **Properties**: Object-specific property management
- **Pipelines**: Configurable workflow stages (for Deals, Tickets, etc.)
- **Associations**: Define relationships to other objects
- **Record Customization**: Customize record sidebar layout, card properties, and default views
- **Automations**: Object-specific workflow triggers

#### Associations Between Objects

HubSpot's V4 Associations pattern provides:
- **Labeled associations**: Each association has a label defining the relationship type
- **Directional relationships**: Support for asymmetric relationships (e.g., "parent of" / "child of")
- **Multiple associations**: Objects can have multiple associations of different types
- **Association limits**: Vary by subscription tier
- **Custom association labels**: Users can define custom relationship types

### 3. Account Defaults Settings

Based on HubSpot patterns, account defaults typically include:

#### General Account Settings
- **Company Information**: Name, address, industry
- **Timezone**: Default timezone for the account
- **Date Format**: How dates are displayed (MM/DD/YYYY, DD/MM/YYYY, etc.)
- **Language**: Default UI language
- **Currency**: Primary and additional currencies
- **Fiscal Year**: Start month for fiscal year reporting

#### Users & Teams
- User management with roles and permissions
- Team creation and management
- Default permissions per role

#### Security
- MFA requirements
- Session timeout
- Password policies
- SSO configuration

#### Notifications
- Email digest preferences
- Notification channels
- Quiet hours

### 4. Integration Settings

#### Connected Apps Page

HubSpot's Connected Apps interface provides a centralized management hub:

**Overview Tab**:
- App summary with connection count and status (disconnected, errors, updates available)
- Filterable activity log tracking installations, uninstallations, and reconnections
- Academy video recommendations
- Marketplace browsing section

**Apps Tab**:
- Table listing all installed applications
- Status indicators per app (connected, disconnected, errors)
- Individual app overview pages with detailed information
- Last activity date
- Permissions and scopes granted

**Notifications Tab**:
- Alerts for app installations, disconnections, or uninstallations
- Notification frequency settings
- Recipient group configuration

#### Per-App Information Shown
- App status and health indicators
- Installation details (when, by whom)
- Activity tracking (install/uninstall/reconnect/sync events)
- Permissions and scopes authorized
- Automation insights (workflow actions, usage metrics)
- Upgrade prompts for additional capabilities

#### Private Apps / API Keys
- Private apps provide scoped API tokens
- Each private app requests specific scopes (e.g., `crm.schemas.contacts.write`)
- Scopes are granular per object type and operation
- API keys can be rotated without disconnecting integrations

#### App Marketplace
- Categorized browsing of available integrations
- Category types include: CRM, Marketing, Sales, Service, Productivity, Finance
- Featured and recommended apps
- Install flow with scope approval

---

## Part 2: Existing Codebase Infrastructure

### 1. Custom Property System (Phase 6, Plan 06-05)

Built in February 2026 as part of Phase 6 (Case Management).

#### CustomPropertyDefinition Prisma Model

**Location**: `apps/backend/prisma/schema.prisma` (line 3820)

```prisma
model CustomPropertyDefinition {
  id             String @id @default(uuid())
  organizationId String @map("organization_id")

  // Target entity
  entityType CustomPropertyEntityType @map("entity_type")

  // Property definition
  name        String
  key         String   // Unique key within entity type, used in customFields JSON
  description String?

  // Type and validation
  dataType     PropertyDataType @map("data_type")
  isRequired   Boolean          @default(false) @map("is_required")
  defaultValue Json?            @map("default_value")

  // Options for SELECT/MULTI_SELECT
  options Json?  // Array of { value: string, label: string, color?: string }

  // Validation rules
  validationRules Json? @map("validation_rules")
  // For TEXT: { minLength?, maxLength?, pattern? }
  // For NUMBER: { min?, max?, decimals? }
  // For DATE: { minDate?, maxDate?, allowFuture?, allowPast? }

  // Display configuration
  displayOrder Int     @default(0) @map("display_order")
  groupName    String? @map("group_name")   // For grouping related properties
  isVisible    Boolean @default(true) @map("is_visible")
  helpText     String? @map("help_text")

  // UI hints
  placeholder String?
  width       String?  // 'full', 'half', 'third'

  // Status
  isActive Boolean @default(true) @map("is_active")

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  createdById String   @map("created_by_id")

  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, entityType, key])
  @@index([organizationId, entityType])
  @@index([organizationId, entityType, isActive])
  @@map("custom_property_definitions")
}
```

#### Supported Entity Types (CustomPropertyEntityType enum)

```prisma
enum CustomPropertyEntityType {
  CASE
  INVESTIGATION
  PERSON
  RIU
}
```

#### Supported Data Types (PropertyDataType enum)

```prisma
enum PropertyDataType {
  TEXT
  NUMBER
  DATE
  DATETIME
  SELECT
  MULTI_SELECT
  BOOLEAN
  URL
  EMAIL
  PHONE
}
```

#### Property Value Storage

Property values are stored in the entity's `customFields` JSON column:
- `Case.customFields` (line 573 of schema)
- `RiskIntelligenceUnit.customFields` (line 1339 of schema)
- Other entities can reference the same pattern

#### CustomPropertiesService Methods

**Location**: `apps/backend/src/modules/custom-properties/custom-properties.service.ts`

| Method | Purpose |
|--------|---------|
| `create(orgId, userId, dto)` | Create new property definition with key validation and duplicate checking |
| `findById(orgId, id)` | Get single property definition |
| `findByEntityType(orgId, entityType)` | Get all active properties for an entity type, ordered by group > displayOrder > name |
| `findAll(orgId, includeInactive?)` | Get all properties grouped by entity type |
| `update(orgId, id, dto)` | Update property definition (name, description, rules, options, display) |
| `delete(orgId, id)` | Soft delete (sets isActive = false) |
| `reorder(orgId, entityType, orders[])` | Batch update display order |
| `validateValues(orgId, entityType, values)` | Comprehensive per-type validation returning errors + sanitized values |
| `getDefaultValues(orgId, entityType)` | Get default values for new entity creation |

**Validation by Type**:
- TEXT: minLength, maxLength, regex pattern
- NUMBER: min, max, decimal places (auto-rounds)
- DATE/DATETIME: minDate, maxDate, allowFuture, allowPast
- SELECT: single value must match defined options
- MULTI_SELECT: array of values, all must match options
- BOOLEAN: accepts boolean, 'true'/'false', '1'/'0'
- URL: validates URL format via `new URL()`
- EMAIL: regex validation, normalizes to lowercase
- PHONE: 7-15 digits with optional formatting characters

#### DTO Interfaces

**Location**: `apps/backend/src/modules/custom-properties/dto/custom-property.dto.ts`

```typescript
interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

interface TextValidation { minLength?, maxLength?, pattern? }
interface NumberValidation { min?, max?, decimals? }
interface DateValidation { minDate?, maxDate?, allowFuture?, allowPast? }
type ValidationRules = TextValidation | NumberValidation | DateValidation;

// CreateCustomPropertyDto fields:
// entityType, name, key, description?, dataType, isRequired?, defaultValue?,
// options?, validationRules?, displayOrder?, groupName?, helpText?, placeholder?, width?

// UpdateCustomPropertyDto fields:
// name?, description?, isRequired?, defaultValue?, options?, validationRules?,
// displayOrder?, groupName?, isVisible?, helpText?, placeholder?, width?, isActive?
```

#### REST Controller Endpoints

**Location**: `apps/backend/src/modules/custom-properties/custom-properties.controller.ts`

| Endpoint | Method | Roles | Description |
|----------|--------|-------|-------------|
| `POST /custom-properties` | POST | SYSTEM_ADMIN, COMPLIANCE_OFFICER | Create property definition |
| `GET /custom-properties` | GET | SYSTEM_ADMIN, COMPLIANCE_OFFICER, INVESTIGATOR | List all (optionally include inactive) |
| `GET /custom-properties/by-entity/:entityType` | GET | Any authenticated | List by entity type |
| `GET /custom-properties/defaults/:entityType` | GET | Any authenticated | Get default values |
| `GET /custom-properties/:id` | GET | SYSTEM_ADMIN, COMPLIANCE_OFFICER, INVESTIGATOR | Get single definition |
| `PUT /custom-properties/:id` | PUT | SYSTEM_ADMIN, COMPLIANCE_OFFICER | Update definition |
| `DELETE /custom-properties/:id` | DELETE | SYSTEM_ADMIN, COMPLIANCE_OFFICER | Soft delete |
| `PUT /custom-properties/reorder/:entityType` | PUT | SYSTEM_ADMIN, COMPLIANCE_OFFICER | Reorder display |
| `POST /custom-properties/validate/:entityType` | POST | Any authenticated | Validate values |

### 2. Existing Object/Entity Types

These are the primary business entities that would appear in an "Objects" settings page:

#### Case

**Model**: `Case` (schema line 488)

Core compliance case entity with:
- `referenceNumber` (unique)
- `status` (NEW, OPEN, CLOSED)
- `pipelineId`, `pipelineStage`, `pipelineStageAt` - Pipeline support (configurable per tenant)
- `outcome` (CaseOutcome enum)
- `customFields` (Json) - Custom property values
- Merge support via tombstone pattern
- Classification tracking with correction notes
- Associations: PersonCaseAssociation, CaseCaseAssociation, RiuCaseAssociation, PolicyCaseAssociation

#### Investigation

**Model**: `Investigation` (schema line 914)

Linked to Cases, with:
- `investigationNumber` (sequential within case)
- `categoryId`, `investigationType` (FULL, LIMITED, INQUIRY)
- `status` (NEW, ASSIGNED, INVESTIGATING, PENDING_REVIEW, CLOSED, ON_HOLD)
- `assignedTo` (array of user IDs), `primaryInvestigatorId`
- `dueDate`, `slaStatus` (ON_TRACK, WARNING, OVERDUE)
- Findings: summary, detail, outcome, root cause, lessons learned

#### Person

**Model**: `Person` (schema line 2677)

Unified person entity representing reporters, subjects, witnesses, employees:
- `type` (PersonType enum)
- `source` (PersonSource enum)
- Identity: firstName, lastName, email, phone (optional for anonymous)
- Employee linkage via `employeeId`
- Denormalized employee fields: businessUnit, jobTitle, employmentStatus, location
- Manager hierarchy (self-referential)
- External contact details: company, title, relationship
- Anonymity tier: OPEN default
- Status: ACTIVE, MERGED, INACTIVE
- Associations: PersonCaseAssociation, PersonRiuAssociation, PersonPersonAssociation

#### Risk Intelligence Unit (RIU)

**Model**: `RiskIntelligenceUnit` (schema line 1300)

Immutable intake record:
- `referenceNumber` (unique, e.g., RIU-2024-001)
- `type` (HOTLINE_REPORT, WEB_FORM_SUBMISSION, DISCLOSURE_RESPONSE, ATTESTATION_RESPONSE, CHATBOT_TRANSCRIPT, INCIDENT_FORM, PROXY_REPORT, SURVEY_RESPONSE)
- `sourceChannel` (phone, web_form, chatbot, etc.)
- Reporter info: type, name, email, phone, anonymous access code
- Classification: categoryId, severity
- Location fields: name, address, city, state, zip, country
- Campaign linkage: campaignId, campaignAssignmentId
- `customFields` (Json) - Custom property values
- `formResponses` (Json) - Structured form data
- Status: PENDING_QA, IN_QA, QA_REJECTED, RELEASED, LINKED, CLOSED
- Extension models: RiuHotlineExtension, RiuDisclosureExtension, RiuWebFormExtension

#### Campaign

**Model**: `Campaign` (schema line 2999)

Disclosure/attestation distribution campaigns:
- `type` (CampaignType enum)
- Versioning with language support
- Status: DRAFT (default), and other statuses
- Audience targeting: audienceMode, segmentId, manualIds
- Scheduling: launchAt, dueDate, expiresAt
- Associations: CampaignAssignment, CampaignWave

#### Policy

**Model**: `Policy` (schema line 5213)

Policy management entity:
- `title`, `slug` (URL-friendly, unique within org)
- `policyType` (PolicyType enum)
- `status` (DRAFT default), `currentVersion`
- Draft content management (draftContent, draftUpdatedAt)
- Ownership and dating (effectiveDate, reviewDate, retiredAt)
- Versioning: PolicyVersion, PolicyVersionTranslation
- Association: PolicyCaseAssociation

#### Disclosure Form Template

**Model**: `DisclosureFormTemplate` (schema line 4926)

Configurable disclosure forms:
- `disclosureType` (COI, GIFT, OUTSIDE_EMPLOYMENT, POLITICAL, CHARITABLE, TRAVEL)
- Versioning with translation support (parent-child model)
- Status: DRAFT (default)
- Schema: fields (JSON), sections (JSON), validationRules, calculatedFields, uiSchema

#### Employee

**Model**: `Employee` (schema line 2502)

HRIS-synced employee records:
- HRIS identity: hrisEmployeeId, name, email
- Position: jobTitle, jobLevel
- Organizational placement: divisionId, businessUnitId, departmentId, teamId, locationId
- Hierarchy: managerId, managerName
- Work arrangement: workMode (HYBRID default)
- Language: primaryLanguage
- Compliance role tracking

#### Supporting Organizational Entities

- **Organization** (line 21): Root tenant entity with settings JSON
- **Location** (line 2312): Physical locations
- **Division** (line 2359): Company divisions
- **BusinessUnit** (line 2395): Business units
- **Department** (line 2428): Departments
- **Team** (line 2464): Teams
- **Segment** (line 2961): Audience targeting segments with criteria JSON
- **Category** (line 1210): Classification categories for cases/RIUs
- **UserDataTable** (line 5079): Custom data tables with configurable columns, filters, and grouping

### 3. Association Infrastructure

#### Association Models (HubSpot V4 Pattern)

All associations are first-class entities following HubSpot's V4 Associations pattern:

**PersonCaseAssociation** (schema line 3355):
- Labels: REPORTER, SUBJECT, WITNESS (evidentiary), ASSIGNED_INVESTIGATOR, APPROVER, STAKEHOLDER, MANAGER_OF_SUBJECT, REVIEWER, LEGAL_COUNSEL (role-based)
- Evidentiary associations use `evidentiaryStatus` (ACTIVE, CLEARED, SUBSTANTIATED, WITHDRAWN)
- Role associations use validity periods (startedAt, endedAt)

**PersonRiuAssociation** (schema line 3405):
- Labels: REPORTER, SUBJECT_MENTIONED, WITNESS_MENTIONED
- Tracks mentions in immutable RIU records
- Includes mentionContext (quote from RIU)

**CaseCaseAssociation** (schema line 3441):
- Labels: PARENT, CHILD, SPLIT_FROM, SPLIT_TO, RELATED, ESCALATED_TO, SUPERSEDES, FOLLOW_UP_TO, MERGED_INTO
- Supports hierarchy, splits, escalations, and merges

**PersonPersonAssociation** (schema line 3479):
- Labels: MANAGER_OF, REPORTS_TO, SPOUSE, DOMESTIC_PARTNER, FAMILY_MEMBER, FORMER_COLLEAGUE, BUSINESS_PARTNER, CLOSE_PERSONAL_FRIEND
- Sources: HRIS, DISCLOSURE, INVESTIGATION, MANUAL
- Directional flag with aToB/bToA labels
- Used for COI (Conflict of Interest) detection

**RiuCaseAssociation** (schema line 1663):
- Links RIUs to Cases
- Association type: PRIMARY (default)
- One association per RIU-Case pair

**PolicyCaseAssociation** (schema line 5358):
- Links Policies to Cases
- Link types: PolicyCaseLinkType enum
- Includes violation date and link reason

#### Association Service Architecture

**Module**: `apps/backend/src/modules/associations/associations.module.ts`

Services:
- `PersonCaseAssociationService`
- `PersonRiuAssociationService`
- `CaseCaseAssociationService`
- `PersonPersonAssociationService`

Also exists: `PolicyCaseAssociationService` (in policies module)

### 4. Integration Infrastructure

#### HRIS Integration (Merge.dev)

**Module**: `apps/backend/src/modules/hris/`

Files:
- `hris-sync.service.ts` - Employee sync from HRIS to Person records
- `merge-client.service.ts` - Merge.dev unified API client
- `hris.module.ts` - Module registration

**MergeClientService**:
- Connects to Merge.dev HRIS unified API (`https://api.merge.dev/api/hris/v1`)
- Uses `MERGE_API_KEY` environment variable
- Uses per-tenant `X-Account-Token` header for linked accounts
- Handles paginated employee fetching

**HrisSyncService** flow:
1. Fetch all employees from Merge.dev
2. Topologically sort by manager chain
3. Find or create Employee record in database
4. Find or create corresponding Person record
5. Emit sync completion event

Properties:
- Idempotent
- Respects manual edits (Person fields not overwritten if manually set)
- Manager ordering (topological sort ensures managers exist before reports)
- Error resilient (collects errors without stopping sync)

#### SSO Integration

**Models**: `TenantSsoConfig` (schema line 370), `TenantDomain` (schema line 347)

Supports:
- Azure AD (with tenant ID)
- Google OAuth
- SAML (with IDP entry point)
- JIT provisioning
- Domain verification

#### Other Integration Points

- **AI Service**: Claude API integration via `apps/backend/src/modules/ai/`
- **Storage**: Azure Blob Storage via `apps/backend/src/modules/storage/`
- **Notifications**: Email/digest system via `apps/backend/src/modules/notifications/`
- **Search**: Via `apps/backend/src/modules/search/`

### 5. Existing Organization Settings

#### Backend (OrganizationService)

**Location**: `apps/backend/src/modules/organization/organization.service.ts`

Settings aggregated from multiple tables:
- **Organization**: name, slug, settings JSON (timezone, dateFormat, brandingMode, etc.)
- **TenantBranding**: logoUrl, primaryColor, customDomain, mode (TEMPLATE, FULL_WHITE_LABEL)
- **OrgNotificationSettings**: digestTime, enforcedCategories, quietHours
- **TenantSsoConfig**: ssoEnabled, provider, Azure/Google/SAML config

Settings JSON fields in Organization.settings:
```typescript
interface OrganizationJsonSettings {
  timezone?: string;              // Default: "America/New_York"
  dateFormat?: string;            // Default: "MM/DD/YYYY"
  brandingMode?: BrandingMode;
  secondaryColor?: string;
  accentColor?: string;
  customCss?: string;
  digestEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  mfaRequired?: boolean;
  mfaRequiredRoles?: UserRole[];
  sessionTimeoutMinutes?: number; // Default: 60
  passwordPolicy?: PasswordPolicyDto;
}
```

Update methods:
- `updateOrganization()` - General settings (name, timezone, dateFormat, language)
- `updateBrandingSettings()` - Logo, colors, branding mode
- `updateNotificationSettings()` - Digest, quiet hours, enforced categories
- `updateSecuritySettings()` - MFA, session timeout, password policy

All methods invalidate a 5-minute cache (`org-settings:${organizationId}`).

#### Frontend (Settings Pages)

**Location**: `apps/frontend/src/app/(authenticated)/settings/`

Current settings page structure:
```
/settings                     -> Settings hub with card navigation
/settings/organization        -> Tabbed org settings (General, Branding, Notifications, Security)
/settings/users               -> User list
/settings/users/invite        -> Invite new user
/settings/users/[id]          -> User detail/edit
/settings/audit               -> Audit log
```

Settings hub sections:
1. **Organization**: Organization Settings, Users & Permissions, Notification Preferences
2. **Security & Access**: Security Settings, SSO Configuration
3. **System**: Audit Log, Branding

**Missing from current settings** (opportunities for Phase 20):
- No Properties management UI (backend exists, no frontend)
- No Objects management
- No Integrations management page
- No Data Management section
- No Custom Property UI for creating/editing properties
- No Pipeline/Stage configuration
- No Association type management
- No Category management within settings
- No Form Template management within settings

### 6. User Roles (RBAC)

```prisma
enum UserRole {
  SYSTEM_ADMIN
  COMPLIANCE_OFFICER
  TRIAGE_LEAD
  INVESTIGATOR
  POLICY_AUTHOR
  POLICY_REVIEWER
  DEPARTMENT_ADMIN
  MANAGER
  EMPLOYEE
  OPERATOR        // Ethico internal hotline operators
}
```

Custom property management restricted to: SYSTEM_ADMIN, COMPLIANCE_OFFICER

---

## Gap Analysis: HubSpot vs Current State

| Feature | HubSpot | Current Codebase | Gap |
|---------|---------|-----------------|-----|
| Property definitions | Full UI with filters, groups, types | Backend-only (service + API) | Need frontend settings UI |
| Property groups | First-class concept with UI | `groupName` string on definitions | Need group management UI |
| Object management | Settings page per object type | No object-level settings | Need object settings pages |
| Pipeline/stages | Configurable per object | `pipelineId`/`pipelineStage` on Case | Need pipeline configuration UI |
| Associations | Visual management of relationships | Backend services exist | Need association settings UI |
| Connected apps | Centralized management page | HRIS via Merge.dev only | Need integrations page |
| Account defaults | Comprehensive settings page | Organization settings (basic) | Extend with more defaults |
| Property access control | Per-property user/team access | No per-property access | Consider adding |
| Conditional logic | Show/hide based on other properties | Not implemented | Consider for future |
| Calculation properties | Formula-based fields | Not implemented | Consider for future |
| Data sensitivity | Enterprise sensitivity marking | Not implemented | Consider for compliance use |

---

## Key Architectural Notes

1. **Multi-tenant isolation** is enforced everywhere via `organizationId` and RLS
2. **Custom property values** are stored as JSONB (`customFields` column) on entity tables -- this is already in place for Case and RIU
3. **Association system** already follows HubSpot V4 pattern with labeled, directional associations
4. **The backend custom properties service is feature-complete** -- the primary gap is the frontend settings UI
5. **Organization settings service** already aggregates data from 4 tables with caching -- this pattern should be extended
6. **HRIS integration** uses Merge.dev as a unified adapter -- this could serve as the model for future integrations
