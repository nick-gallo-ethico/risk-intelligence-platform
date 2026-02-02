# Technical Specification: Custom Fields

**Version:** 1.0
**Last Updated:** February 2026
**Status:** Draft
**Author:** Architecture Team

**Applies To:** All entities requiring tenant-configurable fields

**Key Consumers:**
- Case Management: Case-level and Investigation-level custom fields
- Disclosures: Disclosure type-specific custom fields
- Policy Management: Policy metadata custom fields
- Employee Directory: HRIS-extension custom fields
- Analytics: Custom field-based reporting and filtering

**Related Documents:**
- `00-PLATFORM/WORKING-DECISIONS.md` - Section 16.M (Custom Fields decisions M.1-M.5)
- `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` - Core entity schemas
- `02-MODULES/05-CASE-MANAGEMENT/PRD.md` - Case custom field requirements

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Model](#3-data-model)
4. [Prisma Schema](#4-prisma-schema)
5. [Field Types](#5-field-types)
6. [API Specifications](#6-api-specifications)
7. [Query Patterns](#7-query-patterns)
8. [UI Components](#8-ui-components)
9. [Analytics Integration](#9-analytics-integration)
10. [Migration Support](#10-migration-support)
11. [Performance Considerations](#11-performance-considerations)
12. [Security Considerations](#12-security-considerations)
13. [Implementation Guide](#13-implementation-guide)

---

## 1. Overview

### 1.1 Purpose

This document specifies a HubSpot-style custom fields system that allows tenants to extend any entity with configurable fields. Custom fields enable organizations to capture industry-specific data, support migration from competitor systems, and adapt the platform to their unique compliance needs.

### 1.2 Scope

- Definition and management of custom field schemas per entity type
- Typed storage and retrieval of custom field values
- Conditional field display based on other field values
- Integration with search, filtering, and reporting
- Permission-based visibility and editability
- Soft delete with data preservation for audit trails

### 1.3 Key Design Principles

1. **Tenant Isolated**: All field definitions and values scoped by `organization_id`
2. **Type Safe**: Typed value columns for efficient queries and validation
3. **Auditable**: Soft delete preserves historical data for compliance
4. **Performant**: Indexed value columns, cached definitions
5. **Flexible**: Support for complex field types (select, multiselect, user references)
6. **Reportable**: Custom fields integrate with analytics and report builder

### 1.4 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Database | PostgreSQL 15+ | Field definitions, typed values |
| Cache | Redis 7 | Field definition cache per org |
| Search | Elasticsearch 8+ | Searchable custom field indexing |
| Queue | BullMQ | Async reindexing on schema changes |

### 1.5 Supported Entity Types

| Entity Type | Enum Value | Description |
|-------------|------------|-------------|
| Case | `case` | Investigation cases |
| Investigation | `investigation` | Case investigations |
| RIU | `riu` | Risk Intelligence Units |
| Policy | `policy` | Policy documents |
| Employee | `employee` | HRIS-synced employees |
| Disclosure | `disclosure` | Disclosure submissions |
| Campaign | `campaign` | Disclosure/attestation campaigns |
| Subject | `subject` | Case subjects |

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    Field     │  │    Field     │  │    Admin     │  │   Report     │    │
│  │   Renderer   │  │    Editor    │  │   Builder    │  │   Builder    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ REST API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Backend (NestJS)                                │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     Custom Fields Module                              │  │
│  │                                                                       │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │  │
│  │  │  Definition    │  │     Value      │  │   Validation   │          │  │
│  │  │    Service     │  │    Service     │  │    Service     │          │  │
│  │  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘          │  │
│  │          │                   │                   │                    │  │
│  │          └───────────────────┴───────────────────┘                    │  │
│  │                              │                                        │  │
│  │  ┌────────────────┐  ┌───────▼────────┐  ┌────────────────┐          │  │
│  │  │   Condition    │  │    Query       │  │     Index      │          │  │
│  │  │   Evaluator    │  │   Builder      │  │    Service     │          │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘          │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│  ┌───────────────┐  ┌────────────────┼────────────────┐  ┌──────────────┐  │
│  │ Definition    │  │          PostgreSQL              │  │ Elasticsearch│  │
│  │ Cache (Redis) │  │ CustomFieldDefinition            │  │ (Indexing)   │  │
│  └───────────────┘  │ CustomFieldValue (typed columns) │  └──────────────┘  │
│                     └──────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Request Flow: Reading Custom Fields

```
1. API request for entity (e.g., GET /api/v1/cases/:id)
           │
           ▼
2. Load entity from database
           │
           ▼
3. Load custom field definitions for entity type
           │
           ├── Check Redis cache: `org:{orgId}:custom_fields:{entityType}`
           ├── If miss, load from DB and cache (TTL: 5 minutes)
           │
           ▼
4. Load custom field values for this entity
           │
           ├── Query CustomFieldValue where entityType + entityId
           │
           ▼
5. Merge values with definitions
           │
           ├── Apply permission filtering (visibleToRoles)
           ├── Evaluate conditional visibility
           │
           ▼
6. Return entity with embedded customFields object
           │
           └── { ...entity, customFields: { field_name: value, ... } }
```

### 2.3 Request Flow: Writing Custom Fields

```
1. API request to update entity with custom fields
           │
           ▼
2. Load field definitions (from cache or DB)
           │
           ▼
3. Validate each custom field value
           │
           ├── Check field exists and is active
           ├── Check user has permission (editableByRoles)
           ├── Validate type and constraints
           └── If invalid → 400 Bad Request with field-level errors
           │
           ▼
4. Upsert CustomFieldValue records
           │
           ├── Populate appropriate typed column (text_value, number_value, etc.)
           ├── Store original JSON in json_value for complex types
           │
           ▼
5. If field is searchable, queue reindex job
           │
           └── BullMQ: custom_fields:reindex → Elasticsearch update
           │
           ▼
6. Log activity
           │
           └── "User updated custom field 'internal_case_number' from X to Y"
```

---

## 3. Data Model

### 3.1 CustomFieldDefinition

Stores the schema for each custom field. One definition per field per entity type per organization.

```typescript
// apps/backend/src/modules/custom-fields/interfaces/custom-field-definition.interface.ts

export interface CustomFieldDefinition {
  id: string;
  organizationId: string;
  entityType: CustomFieldEntityType;  // 'case', 'investigation', 'riu', etc.

  // Field metadata
  name: string;           // Internal name (snake_case): 'internal_case_number'
  label: string;          // Display label: 'Internal Case Number'
  description?: string;   // Help text for field
  placeholder?: string;   // Placeholder text for input

  // Type
  fieldType: CustomFieldType;

  // Configuration by type (stored as JSON)
  config: CustomFieldConfig;

  // Behavior
  isRequired: boolean;
  isReportable: boolean;    // Include in analytics/report builder
  isSearchable: boolean;    // Include in search index
  defaultValue?: any;       // Default value for new entities

  // Display
  showInList: boolean;      // Show in list/table views
  showInCard: boolean;      // Show in entity cards/summaries
  showInCreate: boolean;    // Show in create form
  showInEdit: boolean;      // Show in edit form (default true)
  sortOrder: number;        // Display order within group
  groupName?: string;       // Group related fields (e.g., 'Financial Details')

  // Conditional display
  conditions?: FieldCondition[];  // Show only if other fields match

  // Permissions
  visibleToRoles: string[];   // Empty = all roles can see
  editableByRoles: string[];  // Empty = all roles can edit

  // Lifecycle
  isActive: boolean;        // Soft delete flag
  createdAt: Date;
  createdById: string;
  updatedAt: Date;
  updatedById: string;
  deletedAt?: Date;         // Soft delete timestamp
  deletedById?: string;
}

export type CustomFieldEntityType =
  | 'case'
  | 'investigation'
  | 'riu'
  | 'policy'
  | 'employee'
  | 'disclosure'
  | 'campaign'
  | 'subject';

export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'rich_text'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'user'
  | 'user_multi'
  | 'employee'
  | 'employee_multi'
  | 'url'
  | 'email'
  | 'phone';
```

### 3.2 CustomFieldConfig

Type-specific configuration options.

```typescript
// apps/backend/src/modules/custom-fields/interfaces/custom-field-config.interface.ts

export type CustomFieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | CurrencyFieldConfig
  | DateFieldConfig
  | BooleanFieldConfig
  | SelectFieldConfig
  | UserFieldConfig
  | UrlFieldConfig;

export interface TextFieldConfig {
  type: 'text' | 'textarea' | 'rich_text';
  maxLength?: number;       // Character limit
  minLength?: number;       // Minimum required length
  pattern?: string;         // Regex validation pattern
  patternMessage?: string;  // Error message for pattern mismatch
}

export interface NumberFieldConfig {
  type: 'number';
  min?: number;
  max?: number;
  precision?: number;       // Decimal places (0 for integer)
  step?: number;            // Increment step for UI
}

export interface CurrencyFieldConfig {
  type: 'currency';
  currency: string;         // ISO 4217 code: 'USD', 'EUR'
  min?: number;
  max?: number;
}

export interface DateFieldConfig {
  type: 'date' | 'datetime';
  minDate?: string;         // 'today', 'entity.created_at', or ISO date
  maxDate?: string;
  allowPast?: boolean;      // Default true
  allowFuture?: boolean;    // Default true
}

export interface BooleanFieldConfig {
  type: 'boolean';
  trueLabel?: string;       // 'Yes', 'Active', etc.
  falseLabel?: string;      // 'No', 'Inactive', etc.
}

export interface SelectFieldConfig {
  type: 'select' | 'multiselect';
  options: SelectOption[];
  allowOther?: boolean;     // Allow free-text "Other" option
  maxSelections?: number;   // For multiselect
  minSelections?: number;   // For multiselect
}

export interface SelectOption {
  value: string;            // Stored value
  label: string;            // Display label
  color?: string;           // Hex color for UI
  description?: string;     // Tooltip/help text
  isDefault?: boolean;      // Pre-selected
  isActive?: boolean;       // Soft delete individual options
}

export interface UserFieldConfig {
  type: 'user' | 'user_multi';
  roleFilter?: string[];    // Only show users with these roles
  allowInactive?: boolean;  // Include inactive users
  maxSelections?: number;   // For user_multi
}

export interface EmployeeFieldConfig {
  type: 'employee' | 'employee_multi';
  statusFilter?: string[];  // ACTIVE, TERMINATED, etc.
  departmentFilter?: string[];
  maxSelections?: number;
}

export interface UrlFieldConfig {
  type: 'url' | 'email' | 'phone';
  // No additional config needed, validation is built-in
}
```

### 3.3 FieldCondition

Conditional display rules for fields.

```typescript
// apps/backend/src/modules/custom-fields/interfaces/field-condition.interface.ts

export interface FieldCondition {
  // The field this condition depends on
  dependsOn: string;        // Field name (can be custom field or standard field)

  // Comparison operator
  operator: ConditionOperator;

  // Value(s) to compare against
  value: any;

  // Combine multiple conditions
  logic?: 'AND' | 'OR';     // Default: AND
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equals'
  | 'less_than_or_equals'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'                    // value is in array
  | 'not_in';

// Example conditions:
// Show "HIPAA Breach Details" field only if category is "HIPAA Breach"
const condition: FieldCondition = {
  dependsOn: 'category_id',
  operator: 'equals',
  value: 'cat_hipaa_breach'
};

// Show "Financial Impact" field only if estimated_exposure > 10000
const condition2: FieldCondition = {
  dependsOn: 'estimated_exposure',
  operator: 'greater_than',
  value: 10000
};
```

### 3.4 CustomFieldValue

Stores the actual values for custom fields on entities.

```typescript
// apps/backend/src/modules/custom-fields/interfaces/custom-field-value.interface.ts

export interface CustomFieldValue {
  id: string;
  organizationId: string;

  // Links to definition
  fieldDefinitionId: string;

  // Links to entity (denormalized for query efficiency)
  entityType: CustomFieldEntityType;
  entityId: string;

  // Typed value columns (only one populated based on field type)
  textValue?: string;       // text, textarea, url, email, phone
  numberValue?: number;     // number, currency
  booleanValue?: boolean;   // boolean
  dateValue?: Date;         // date, datetime
  jsonValue?: any;          // select, multiselect, user, user_multi, rich_text

  // Audit
  updatedAt: Date;
  updatedById: string;
}
```

---

## 4. Prisma Schema

```prisma
// apps/backend/prisma/schema.prisma

// Custom Field Definition
model CustomFieldDefinition {
  id                String   @id @default(uuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])

  // Entity binding
  entityType        String                    // 'case', 'investigation', etc.

  // Metadata
  name              String                    // snake_case internal name
  label             String                    // Display label
  description       String?
  placeholder       String?

  // Type and configuration
  fieldType         String                    // 'text', 'number', 'select', etc.
  config            Json                      // Type-specific config

  // Behavior
  isRequired        Boolean  @default(false)
  isReportable      Boolean  @default(true)
  isSearchable      Boolean  @default(false)
  defaultValue      Json?

  // Display
  showInList        Boolean  @default(false)
  showInCard        Boolean  @default(false)
  showInCreate      Boolean  @default(true)
  showInEdit        Boolean  @default(true)
  sortOrder         Int      @default(0)
  groupName         String?

  // Conditional display
  conditions        Json?                     // FieldCondition[]

  // Permissions
  visibleToRoles    String[]                  // Empty = all
  editableByRoles   String[]                  // Empty = all

  // Lifecycle
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  createdById       String
  createdBy         User     @relation("FieldCreatedBy", fields: [createdById], references: [id])
  updatedAt         DateTime @updatedAt
  updatedById       String
  updatedBy         User     @relation("FieldUpdatedBy", fields: [updatedById], references: [id])
  deletedAt         DateTime?
  deletedById       String?
  deletedBy         User?    @relation("FieldDeletedBy", fields: [deletedById], references: [id])

  // Relations
  values            CustomFieldValue[]

  // Unique: one field name per entity type per org
  @@unique([organizationId, entityType, name])

  // Indexes
  @@index([organizationId, entityType, isActive])
  @@index([organizationId, entityType, sortOrder])
}

// Custom Field Value
model CustomFieldValue {
  id                  String   @id @default(uuid())
  organizationId      String
  organization        Organization @relation(fields: [organizationId], references: [id])

  // Links
  fieldDefinitionId   String
  fieldDefinition     CustomFieldDefinition @relation(fields: [fieldDefinitionId], references: [id])
  entityType          String                // Denormalized for query efficiency
  entityId            String                // UUID of the entity

  // Typed value columns (only one populated based on field type)
  textValue           String?               // text, textarea, url, email, phone
  numberValue         Float?                // number, currency
  booleanValue        Boolean?              // boolean
  dateValue           DateTime?             // date, datetime
  jsonValue           Json?                 // select, multiselect, user refs, rich_text

  // Audit
  updatedAt           DateTime @updatedAt
  updatedById         String
  updatedBy           User     @relation(fields: [updatedById], references: [id])

  // Unique: one value per field per entity
  @@unique([fieldDefinitionId, entityId])

  // Indexes for common query patterns
  @@index([organizationId, entityType, entityId])
  @@index([organizationId, entityType, fieldDefinitionId])

  // Typed column indexes for filtering/sorting
  @@index([organizationId, entityType, fieldDefinitionId, textValue])
  @@index([organizationId, entityType, fieldDefinitionId, numberValue])
  @@index([organizationId, entityType, fieldDefinitionId, dateValue])
  @@index([organizationId, entityType, fieldDefinitionId, booleanValue])
}
```

---

## 5. Field Types

### 5.1 Field Type Reference

| Type | Value Column | Validation | UI Component |
|------|--------------|------------|--------------|
| `text` | textValue | maxLength, pattern | TextInput |
| `textarea` | textValue | maxLength | TextArea |
| `rich_text` | jsonValue | maxLength | RichTextEditor |
| `number` | numberValue | min, max, precision | NumberInput |
| `currency` | numberValue | min, max, currency | CurrencyInput |
| `date` | dateValue | minDate, maxDate | DatePicker |
| `datetime` | dateValue | minDate, maxDate | DateTimePicker |
| `boolean` | booleanValue | - | Checkbox/Toggle |
| `select` | jsonValue | options, required | Select |
| `multiselect` | jsonValue | options, min/max selections | MultiSelect |
| `user` | jsonValue (userId) | roleFilter | UserPicker |
| `user_multi` | jsonValue (userId[]) | roleFilter, max | UserMultiPicker |
| `employee` | jsonValue (employeeId) | statusFilter | EmployeePicker |
| `employee_multi` | jsonValue (employeeId[]) | statusFilter, max | EmployeeMultiPicker |
| `url` | textValue | URL format | UrlInput |
| `email` | textValue | Email format | EmailInput |
| `phone` | textValue | Phone format | PhoneInput |

### 5.2 Value Storage Patterns

```typescript
// apps/backend/src/modules/custom-fields/services/value-mapper.service.ts

export class ValueMapperService {
  /**
   * Map incoming value to appropriate typed column
   */
  mapToStorage(
    fieldType: CustomFieldType,
    value: any
  ): Partial<CustomFieldValue> {
    switch (fieldType) {
      case 'text':
      case 'textarea':
      case 'url':
      case 'email':
      case 'phone':
        return { textValue: value as string };

      case 'number':
      case 'currency':
        return { numberValue: value as number };

      case 'boolean':
        return { booleanValue: value as boolean };

      case 'date':
      case 'datetime':
        return { dateValue: new Date(value) };

      case 'rich_text':
      case 'select':
      case 'multiselect':
      case 'user':
      case 'user_multi':
      case 'employee':
      case 'employee_multi':
        return { jsonValue: value };

      default:
        return { jsonValue: value };
    }
  }

  /**
   * Extract value from stored record
   */
  mapFromStorage(
    fieldType: CustomFieldType,
    record: CustomFieldValue
  ): any {
    switch (fieldType) {
      case 'text':
      case 'textarea':
      case 'url':
      case 'email':
      case 'phone':
        return record.textValue;

      case 'number':
      case 'currency':
        return record.numberValue;

      case 'boolean':
        return record.booleanValue;

      case 'date':
      case 'datetime':
        return record.dateValue;

      default:
        return record.jsonValue;
    }
  }
}
```

---

## 6. API Specifications

### 6.1 Field Definition Endpoints

```typescript
// Field Definition CRUD (Admin only)

// List field definitions for an entity type
GET /api/v1/custom-fields/definitions
Query: {
  entityType: string;       // Required: 'case', 'investigation', etc.
  includeInactive?: boolean; // Default: false
}
Response: {
  items: CustomFieldDefinition[];
  total: number;
}

// Get single field definition
GET /api/v1/custom-fields/definitions/:id
Response: CustomFieldDefinition

// Create field definition
POST /api/v1/custom-fields/definitions
Body: {
  entityType: string;       // Required
  name: string;             // Required, snake_case
  label: string;            // Required
  fieldType: string;        // Required
  description?: string;
  config?: CustomFieldConfig;
  isRequired?: boolean;
  isReportable?: boolean;
  isSearchable?: boolean;
  defaultValue?: any;
  showInList?: boolean;
  showInCard?: boolean;
  showInCreate?: boolean;
  showInEdit?: boolean;
  sortOrder?: number;
  groupName?: string;
  conditions?: FieldCondition[];
  visibleToRoles?: string[];
  editableByRoles?: string[];
}
Response: CustomFieldDefinition

// Update field definition
PATCH /api/v1/custom-fields/definitions/:id
Body: Partial<CreateFieldDefinitionDto>
Response: CustomFieldDefinition

// Delete field definition (soft delete)
DELETE /api/v1/custom-fields/definitions/:id
Response: { success: true }

// Reorder fields
POST /api/v1/custom-fields/definitions/reorder
Body: {
  entityType: string;
  fieldIds: string[];       // Ordered list of field IDs
}
Response: { success: true }

// Bulk update field options (for select/multiselect)
PATCH /api/v1/custom-fields/definitions/:id/options
Body: {
  options: SelectOption[];
}
Response: CustomFieldDefinition
```

### 6.2 Field Value Endpoints

```typescript
// Custom field values are typically embedded in entity responses
// But dedicated endpoints exist for bulk operations

// Get custom field values for an entity
GET /api/v1/custom-fields/values
Query: {
  entityType: string;       // Required
  entityId: string;         // Required
}
Response: {
  [fieldName: string]: any;
}

// Set custom field values for an entity
PUT /api/v1/custom-fields/values
Body: {
  entityType: string;       // Required
  entityId: string;         // Required
  values: {
    [fieldName: string]: any;
  };
}
Response: {
  [fieldName: string]: any;
}

// Bulk update custom field for multiple entities
POST /api/v1/custom-fields/values/bulk
Body: {
  entityType: string;       // Required
  entityIds: string[];      // Required
  fieldName: string;        // Required
  value: any;               // Required
}
Response: {
  updated: number;
  failed: number;
  errors?: { entityId: string; error: string }[];
}
```

### 6.3 Entity Integration Pattern

Custom fields are embedded in entity responses using a standard pattern:

```typescript
// Example: GET /api/v1/cases/:id
Response: {
  id: "case_123",
  caseNumber: "2024-001",
  status: "open",
  // ... standard case fields

  // Custom fields embedded
  customFields: {
    internal_case_number: "HR-2024-0042",
    estimated_exposure: 150000,
    regulatory_notification_required: true,
    business_impact: ["revenue", "reputation"],
    assigned_legal_counsel: "user_456"
  },

  // Field definitions included for form rendering
  customFieldDefinitions: [
    {
      name: "internal_case_number",
      label: "Internal Case Number",
      fieldType: "text",
      isRequired: true,
      // ... full definition
    }
    // ... other definitions
  ]
}
```

### 6.4 Filter Syntax

Custom fields support filtering via query parameters:

```typescript
// Filter cases by custom field value
GET /api/v1/cases?customFields.estimated_exposure[gt]=100000

// Supported operators
?customFields.{fieldName}[eq]=value      // Equals
?customFields.{fieldName}[ne]=value      // Not equals
?customFields.{fieldName}[gt]=value      // Greater than
?customFields.{fieldName}[gte]=value     // Greater than or equal
?customFields.{fieldName}[lt]=value      // Less than
?customFields.{fieldName}[lte]=value     // Less than or equal
?customFields.{fieldName}[contains]=value // Text contains
?customFields.{fieldName}[in]=v1,v2,v3   // Value in list
?customFields.{fieldName}[not_in]=v1,v2  // Value not in list
?customFields.{fieldName}[is_empty]=true // Field is empty/null
```

---

## 7. Query Patterns

### 7.1 Loading Custom Fields for Entity

```typescript
// apps/backend/src/modules/custom-fields/services/custom-field.service.ts

@Injectable()
export class CustomFieldService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private conditionEvaluator: ConditionEvaluatorService,
  ) {}

  /**
   * Load custom field values for an entity
   */
  async getValuesForEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
    userRole: string,
    entityData?: Record<string, any>,
  ): Promise<Record<string, any>> {
    // 1. Get field definitions (cached)
    const definitions = await this.getDefinitionsForEntityType(
      organizationId,
      entityType,
    );

    // 2. Get values
    const values = await this.prisma.customFieldValue.findMany({
      where: {
        organizationId,
        entityType,
        entityId,
      },
    });

    // 3. Build value map
    const valueMap = new Map(values.map(v => [v.fieldDefinitionId, v]));

    // 4. Build result with permission and condition filtering
    const result: Record<string, any> = {};

    for (const def of definitions) {
      // Skip inactive fields
      if (!def.isActive) continue;

      // Check role visibility
      if (def.visibleToRoles.length > 0 &&
          !def.visibleToRoles.includes(userRole)) {
        continue;
      }

      // Check conditional visibility
      if (def.conditions && entityData) {
        const visible = this.conditionEvaluator.evaluate(
          def.conditions,
          entityData,
        );
        if (!visible) continue;
      }

      // Get value
      const value = valueMap.get(def.id);
      if (value) {
        result[def.name] = this.valueMapper.mapFromStorage(
          def.fieldType as CustomFieldType,
          value,
        );
      } else if (def.defaultValue !== undefined) {
        result[def.name] = def.defaultValue;
      } else {
        result[def.name] = null;
      }
    }

    return result;
  }

  /**
   * Get field definitions from cache or database
   */
  async getDefinitionsForEntityType(
    organizationId: string,
    entityType: string,
  ): Promise<CustomFieldDefinition[]> {
    const cacheKey = `org:${organizationId}:custom_fields:${entityType}`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Load from database
    const definitions = await this.prisma.customFieldDefinition.findMany({
      where: {
        organizationId,
        entityType,
        isActive: true,
      },
      orderBy: [
        { groupName: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    // Cache for 5 minutes
    await this.redis.set(cacheKey, JSON.stringify(definitions), 'EX', 300);

    return definitions;
  }
}
```

### 7.2 Filtering Entities by Custom Fields

```typescript
// apps/backend/src/modules/custom-fields/services/custom-field-query.service.ts

@Injectable()
export class CustomFieldQueryService {
  /**
   * Build Prisma filter for custom field conditions
   */
  buildCustomFieldFilter(
    organizationId: string,
    entityType: string,
    filters: Record<string, any>,
  ): any {
    const conditions: any[] = [];

    for (const [key, operatorValue] of Object.entries(filters)) {
      // Parse: customFields.field_name[operator] = value
      const match = key.match(/^customFields\.(\w+)\[(\w+)\]$/);
      if (!match) continue;

      const [, fieldName, operator] = match;

      // Get field definition to determine typed column
      const definition = await this.getDefinitionByName(
        organizationId,
        entityType,
        fieldName,
      );
      if (!definition) continue;

      // Build subquery filter
      const valueFilter = this.buildValueFilter(
        definition.fieldType,
        operator,
        operatorValue,
      );

      conditions.push({
        customFieldValues: {
          some: {
            fieldDefinitionId: definition.id,
            ...valueFilter,
          },
        },
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  private buildValueFilter(
    fieldType: string,
    operator: string,
    value: any,
  ): any {
    const column = this.getTypedColumn(fieldType);

    switch (operator) {
      case 'eq':
        return { [column]: value };
      case 'ne':
        return { [column]: { not: value } };
      case 'gt':
        return { [column]: { gt: value } };
      case 'gte':
        return { [column]: { gte: value } };
      case 'lt':
        return { [column]: { lt: value } };
      case 'lte':
        return { [column]: { lte: value } };
      case 'contains':
        return { [column]: { contains: value, mode: 'insensitive' } };
      case 'in':
        return { [column]: { in: value.split(',') } };
      case 'is_empty':
        return { [column]: null };
      default:
        return {};
    }
  }

  private getTypedColumn(fieldType: string): string {
    switch (fieldType) {
      case 'text':
      case 'textarea':
      case 'url':
      case 'email':
      case 'phone':
        return 'textValue';
      case 'number':
      case 'currency':
        return 'numberValue';
      case 'boolean':
        return 'booleanValue';
      case 'date':
      case 'datetime':
        return 'dateValue';
      default:
        return 'jsonValue';
    }
  }
}
```

### 7.3 Sorting by Custom Fields

```typescript
/**
 * Apply custom field sorting to query
 */
async applySorting(
  query: any,
  organizationId: string,
  entityType: string,
  sortField: string,
  sortDirection: 'asc' | 'desc',
): Promise<any> {
  // Check if sorting by custom field
  if (sortField.startsWith('customFields.')) {
    const fieldName = sortField.replace('customFields.', '');
    const definition = await this.getDefinitionByName(
      organizationId,
      entityType,
      fieldName,
    );

    if (definition) {
      const column = this.getTypedColumn(definition.fieldType);

      // Use subquery for sorting
      return {
        ...query,
        orderBy: {
          customFieldValues: {
            _count: sortDirection, // Simplified; real impl uses raw SQL
          },
        },
      };
    }
  }

  // Standard field sorting
  return {
    ...query,
    orderBy: { [sortField]: sortDirection },
  };
}
```

---

## 8. UI Components

### 8.1 Field Renderer Component

```typescript
// apps/frontend/src/components/custom-fields/FieldRenderer.tsx

interface FieldRendererProps {
  definition: CustomFieldDefinition;
  value: any;
  mode: 'view' | 'edit';
  onChange?: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export function FieldRenderer({
  definition,
  value,
  mode,
  onChange,
  error,
  disabled,
}: FieldRendererProps) {
  // View mode - just display the value
  if (mode === 'view') {
    return <FieldValueDisplay definition={definition} value={value} />;
  }

  // Edit mode - render appropriate input
  switch (definition.fieldType) {
    case 'text':
    case 'email':
    case 'url':
    case 'phone':
      return (
        <TextInput
          label={definition.label}
          description={definition.description}
          placeholder={definition.placeholder}
          value={value ?? ''}
          onChange={onChange}
          error={error}
          disabled={disabled}
          required={definition.isRequired}
          maxLength={definition.config.maxLength}
          pattern={definition.config.pattern}
          type={definition.fieldType}
        />
      );

    case 'textarea':
      return (
        <Textarea
          label={definition.label}
          description={definition.description}
          placeholder={definition.placeholder}
          value={value ?? ''}
          onChange={onChange}
          error={error}
          disabled={disabled}
          required={definition.isRequired}
          maxLength={definition.config.maxLength}
        />
      );

    case 'rich_text':
      return (
        <RichTextEditor
          label={definition.label}
          description={definition.description}
          value={value ?? ''}
          onChange={onChange}
          error={error}
          disabled={disabled}
          required={definition.isRequired}
        />
      );

    case 'number':
      return (
        <NumberInput
          label={definition.label}
          description={definition.description}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          required={definition.isRequired}
          min={definition.config.min}
          max={definition.config.max}
          precision={definition.config.precision}
          step={definition.config.step}
        />
      );

    case 'currency':
      return (
        <CurrencyInput
          label={definition.label}
          description={definition.description}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          required={definition.isRequired}
          currency={definition.config.currency}
          min={definition.config.min}
          max={definition.config.max}
        />
      );

    case 'date':
    case 'datetime':
      return (
        <DatePicker
          label={definition.label}
          description={definition.description}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          required={definition.isRequired}
          includeTime={definition.fieldType === 'datetime'}
          minDate={definition.config.minDate}
          maxDate={definition.config.maxDate}
        />
      );

    case 'boolean':
      return (
        <Checkbox
          label={definition.label}
          description={definition.description}
          checked={value ?? false}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'select':
      return (
        <Select
          label={definition.label}
          description={definition.description}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          required={definition.isRequired}
          options={definition.config.options}
          allowOther={definition.config.allowOther}
        />
      );

    case 'multiselect':
      return (
        <MultiSelect
          label={definition.label}
          description={definition.description}
          value={value ?? []}
          onChange={onChange}
          error={error}
          disabled={disabled}
          required={definition.isRequired}
          options={definition.config.options}
          maxSelections={definition.config.maxSelections}
          minSelections={definition.config.minSelections}
        />
      );

    case 'user':
    case 'user_multi':
      return (
        <UserPicker
          label={definition.label}
          description={definition.description}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          required={definition.isRequired}
          multiple={definition.fieldType === 'user_multi'}
          roleFilter={definition.config.roleFilter}
          maxSelections={definition.config.maxSelections}
        />
      );

    case 'employee':
    case 'employee_multi':
      return (
        <EmployeePicker
          label={definition.label}
          description={definition.description}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          required={definition.isRequired}
          multiple={definition.fieldType === 'employee_multi'}
          statusFilter={definition.config.statusFilter}
          departmentFilter={definition.config.departmentFilter}
          maxSelections={definition.config.maxSelections}
        />
      );

    default:
      return <div>Unsupported field type: {definition.fieldType}</div>;
  }
}
```

### 8.2 Custom Fields Section Component

```typescript
// apps/frontend/src/components/custom-fields/CustomFieldsSection.tsx

interface CustomFieldsSectionProps {
  entityType: string;
  entityId?: string;
  values: Record<string, any>;
  definitions: CustomFieldDefinition[];
  mode: 'view' | 'edit' | 'create';
  onChange?: (values: Record<string, any>) => void;
  errors?: Record<string, string>;
}

export function CustomFieldsSection({
  entityType,
  entityId,
  values,
  definitions,
  mode,
  onChange,
  errors,
}: CustomFieldsSectionProps) {
  // Group fields by groupName
  const groupedFields = useMemo(() => {
    const groups = new Map<string, CustomFieldDefinition[]>();

    for (const def of definitions) {
      // Filter by mode visibility
      if (mode === 'create' && !def.showInCreate) continue;
      if (mode === 'edit' && !def.showInEdit) continue;

      const groupName = def.groupName ?? 'Custom Fields';
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(def);
    }

    return groups;
  }, [definitions, mode]);

  // Evaluate conditional visibility
  const visibleFields = useMemo(() => {
    return definitions.filter(def => {
      if (!def.conditions || def.conditions.length === 0) return true;
      return evaluateConditions(def.conditions, values);
    });
  }, [definitions, values]);

  const handleFieldChange = (fieldName: string, value: any) => {
    onChange?.({
      ...values,
      [fieldName]: value,
    });
  };

  return (
    <div className="space-y-6">
      {Array.from(groupedFields.entries()).map(([groupName, fields]) => (
        <Fieldset key={groupName} legend={groupName}>
          <div className="grid grid-cols-2 gap-4">
            {fields
              .filter(f => visibleFields.includes(f))
              .map(field => (
                <div
                  key={field.id}
                  className={field.fieldType === 'rich_text' ? 'col-span-2' : ''}
                >
                  <FieldRenderer
                    definition={field}
                    value={values[field.name]}
                    mode={mode === 'view' ? 'view' : 'edit'}
                    onChange={(v) => handleFieldChange(field.name, v)}
                    error={errors?.[field.name]}
                  />
                </div>
              ))}
          </div>
        </Fieldset>
      ))}
    </div>
  );
}
```

### 8.3 Field Definition Builder (Admin UI)

```typescript
// apps/frontend/src/components/admin/CustomFieldBuilder.tsx

interface CustomFieldBuilderProps {
  entityType: string;
  existingField?: CustomFieldDefinition;
  onSave: (field: CreateFieldDefinitionDto) => void;
  onCancel: () => void;
}

export function CustomFieldBuilder({
  entityType,
  existingField,
  onSave,
  onCancel,
}: CustomFieldBuilderProps) {
  const [field, setField] = useState<Partial<CreateFieldDefinitionDto>>(
    existingField ?? {
      entityType,
      isRequired: false,
      isReportable: true,
      isSearchable: false,
      showInList: false,
      showInCard: false,
      showInCreate: true,
      showInEdit: true,
      sortOrder: 0,
      visibleToRoles: [],
      editableByRoles: [],
    }
  );

  // Generate name from label
  const handleLabelChange = (label: string) => {
    const name = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    setField({
      ...field,
      label,
      name: existingField ? field.name : name,
    });
  };

  return (
    <Dialog open onClose={onCancel}>
      <DialogTitle>
        {existingField ? 'Edit Custom Field' : 'Create Custom Field'}
      </DialogTitle>

      <DialogContent className="space-y-4">
        {/* Basic Info */}
        <TextInput
          label="Label"
          description="How this field appears in the UI"
          value={field.label ?? ''}
          onChange={handleLabelChange}
          required
        />

        <TextInput
          label="Internal Name"
          description="API identifier (cannot change after creation)"
          value={field.name ?? ''}
          onChange={(name) => setField({ ...field, name })}
          disabled={!!existingField}
          required
        />

        <Textarea
          label="Description"
          description="Help text shown below the field"
          value={field.description ?? ''}
          onChange={(description) => setField({ ...field, description })}
        />

        {/* Field Type */}
        <Select
          label="Field Type"
          value={field.fieldType}
          onChange={(fieldType) => setField({ ...field, fieldType, config: {} })}
          options={FIELD_TYPE_OPTIONS}
          required
        />

        {/* Type-specific config */}
        {field.fieldType && (
          <FieldTypeConfig
            fieldType={field.fieldType}
            config={field.config ?? {}}
            onChange={(config) => setField({ ...field, config })}
          />
        )}

        {/* Behavior */}
        <Fieldset legend="Behavior">
          <div className="grid grid-cols-2 gap-4">
            <Checkbox
              label="Required"
              checked={field.isRequired}
              onChange={(isRequired) => setField({ ...field, isRequired })}
            />
            <Checkbox
              label="Include in Reports"
              checked={field.isReportable}
              onChange={(isReportable) => setField({ ...field, isReportable })}
            />
            <Checkbox
              label="Searchable"
              checked={field.isSearchable}
              onChange={(isSearchable) => setField({ ...field, isSearchable })}
            />
          </div>
        </Fieldset>

        {/* Display Options */}
        <Fieldset legend="Display">
          <div className="grid grid-cols-2 gap-4">
            <Checkbox
              label="Show in List View"
              checked={field.showInList}
              onChange={(showInList) => setField({ ...field, showInList })}
            />
            <Checkbox
              label="Show in Card View"
              checked={field.showInCard}
              onChange={(showInCard) => setField({ ...field, showInCard })}
            />
            <Checkbox
              label="Show in Create Form"
              checked={field.showInCreate}
              onChange={(showInCreate) => setField({ ...field, showInCreate })}
            />
            <TextInput
              label="Group Name"
              placeholder="e.g., Financial Details"
              value={field.groupName ?? ''}
              onChange={(groupName) => setField({ ...field, groupName })}
            />
          </div>
        </Fieldset>

        {/* Conditional Display */}
        <Fieldset legend="Conditional Display">
          <ConditionBuilder
            conditions={field.conditions ?? []}
            onChange={(conditions) => setField({ ...field, conditions })}
            entityType={entityType}
          />
        </Fieldset>

        {/* Permissions */}
        <Fieldset legend="Permissions">
          <RoleMultiSelect
            label="Visible to Roles"
            description="Leave empty for all roles"
            value={field.visibleToRoles ?? []}
            onChange={(visibleToRoles) => setField({ ...field, visibleToRoles })}
          />
          <RoleMultiSelect
            label="Editable by Roles"
            description="Leave empty for all roles"
            value={field.editableByRoles ?? []}
            onChange={(editableByRoles) => setField({ ...field, editableByRoles })}
          />
        </Fieldset>
      </DialogContent>

      <DialogActions>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(field as CreateFieldDefinitionDto)}>
          {existingField ? 'Save Changes' : 'Create Field'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

## 9. Analytics Integration

### 9.1 Reportable Fields in Analytics

Custom fields marked as `isReportable: true` are automatically available in the analytics and report builder.

```typescript
// apps/backend/src/modules/analytics/services/custom-field-analytics.service.ts

@Injectable()
export class CustomFieldAnalyticsService {
  /**
   * Get available custom field dimensions for report builder
   */
  async getAvailableDimensions(
    organizationId: string,
    entityType: string,
  ): Promise<AnalyticsDimension[]> {
    const definitions = await this.prisma.customFieldDefinition.findMany({
      where: {
        organizationId,
        entityType,
        isActive: true,
        isReportable: true,
      },
    });

    return definitions.map(def => ({
      id: `customFields.${def.name}`,
      name: def.label,
      type: this.mapFieldTypeToAnalyticsType(def.fieldType),
      entityType,
      isCustomField: true,
      groupName: def.groupName ?? 'Custom Fields',
      options: def.fieldType === 'select' || def.fieldType === 'multiselect'
        ? (def.config as SelectFieldConfig).options
        : undefined,
    }));
  }

  /**
   * Aggregate custom field values for dashboard widgets
   */
  async aggregateByCustomField(
    organizationId: string,
    entityType: string,
    fieldName: string,
    aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max',
    filters?: Record<string, any>,
  ): Promise<AggregationResult[]> {
    const definition = await this.getDefinitionByName(
      organizationId,
      entityType,
      fieldName,
    );

    if (!definition || !definition.isReportable) {
      throw new BadRequestException('Field not available for reporting');
    }

    const column = this.getTypedColumn(definition.fieldType);

    // Use raw SQL for complex aggregations
    const results = await this.prisma.$queryRaw`
      SELECT
        ${Prisma.raw(column)} as value,
        ${Prisma.raw(this.getAggregationSql(aggregation))} as aggregate
      FROM custom_field_values cfv
      JOIN ${Prisma.raw(entityType + 's')} e
        ON cfv.entity_id = e.id
      WHERE cfv.organization_id = ${organizationId}
        AND cfv.field_definition_id = ${definition.id}
        ${filters ? Prisma.raw(this.buildFilterSql(filters)) : Prisma.empty}
      GROUP BY ${Prisma.raw(column)}
      ORDER BY aggregate DESC
      LIMIT 100
    `;

    return results;
  }

  private mapFieldTypeToAnalyticsType(
    fieldType: string,
  ): 'string' | 'number' | 'boolean' | 'date' {
    switch (fieldType) {
      case 'number':
      case 'currency':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
      case 'datetime':
        return 'date';
      default:
        return 'string';
    }
  }
}
```

### 9.2 Dashboard Widget Support

```typescript
// Dashboard widget configuration for custom field chart
interface CustomFieldWidgetConfig {
  type: 'custom_field_chart';
  entityType: string;
  fieldName: string;                 // Custom field name
  chartType: 'bar' | 'pie' | 'line' | 'table';
  aggregation?: 'count' | 'sum' | 'avg';  // For numeric fields
  groupBy?: string;                  // Secondary dimension
  filters?: WidgetFilter[];
  title: string;
  description?: string;
}

// Example: Cases by Business Impact (multiselect custom field)
const exampleWidget: CustomFieldWidgetConfig = {
  type: 'custom_field_chart',
  entityType: 'case',
  fieldName: 'business_impact',
  chartType: 'bar',
  aggregation: 'count',
  title: 'Cases by Business Impact',
};

// Example: Total Estimated Exposure by Category
const exampleWidget2: CustomFieldWidgetConfig = {
  type: 'custom_field_chart',
  entityType: 'case',
  fieldName: 'estimated_exposure',
  chartType: 'bar',
  aggregation: 'sum',
  groupBy: 'category_id',
  title: 'Estimated Exposure by Category',
};
```

---

## 10. Migration Support

### 10.1 Importing Field Definitions

Support for importing custom field schemas from competitor systems.

```typescript
// apps/backend/src/modules/custom-fields/services/custom-field-migration.service.ts

@Injectable()
export class CustomFieldMigrationService {
  /**
   * Import field definitions from NAVEX format
   */
  async importFromNavex(
    organizationId: string,
    navexExport: NavexCustomFieldExport[],
    userId: string,
  ): Promise<ImportResult> {
    const results: ImportResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (const navexField of navexExport) {
      try {
        const mapped = this.mapNavexField(navexField);

        await this.prisma.customFieldDefinition.upsert({
          where: {
            organizationId_entityType_name: {
              organizationId,
              entityType: mapped.entityType,
              name: mapped.name,
            },
          },
          create: {
            ...mapped,
            organizationId,
            createdById: userId,
            updatedById: userId,
          },
          update: {
            ...mapped,
            updatedById: userId,
          },
        });

        results.created++;
      } catch (error) {
        results.errors.push({
          field: navexField.field_id,
          error: error.message,
        });
      }
    }

    // Invalidate cache
    await this.invalidateDefinitionCache(organizationId);

    return results;
  }

  /**
   * Map NAVEX field types to platform field types
   */
  private mapNavexField(navexField: NavexCustomFieldExport): Partial<CustomFieldDefinition> {
    const typeMapping: Record<string, string> = {
      'FREE_TEXT': 'text',
      'MULTI_LINE_TEXT': 'textarea',
      'NUMERIC': 'number',
      'DATE': 'date',
      'DROPDOWN': 'select',
      'MULTI_SELECT': 'multiselect',
      'YES_NO': 'boolean',
      'USER_REFERENCE': 'user',
    };

    return {
      entityType: this.mapNavexEntityType(navexField.applies_to),
      name: this.sanitizeName(navexField.field_id),
      label: navexField.label,
      description: navexField.help_text,
      fieldType: typeMapping[navexField.field_type] ?? 'text',
      config: this.mapNavexConfig(navexField),
      isRequired: navexField.is_required,
      isReportable: true,
      showInList: false,
      showInCard: false,
      showInCreate: true,
      showInEdit: true,
      sortOrder: navexField.display_order ?? 0,
    };
  }

  /**
   * Import field values during data migration
   */
  async importValues(
    organizationId: string,
    entityType: string,
    entityIdMapping: Map<string, string>,  // old ID -> new ID
    values: MigrationCustomFieldValue[],
    userId: string,
  ): Promise<ImportResult> {
    const results: ImportResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Get field definitions
    const definitions = await this.prisma.customFieldDefinition.findMany({
      where: { organizationId, entityType },
    });
    const defByName = new Map(definitions.map(d => [d.name, d]));

    for (const value of values) {
      try {
        const newEntityId = entityIdMapping.get(value.sourceEntityId);
        if (!newEntityId) {
          results.skipped++;
          continue;
        }

        const definition = defByName.get(value.fieldName);
        if (!definition) {
          results.errors.push({
            field: value.fieldName,
            entityId: value.sourceEntityId,
            error: 'Field definition not found',
          });
          continue;
        }

        const storage = this.valueMapper.mapToStorage(
          definition.fieldType as CustomFieldType,
          value.value,
        );

        await this.prisma.customFieldValue.upsert({
          where: {
            fieldDefinitionId_entityId: {
              fieldDefinitionId: definition.id,
              entityId: newEntityId,
            },
          },
          create: {
            organizationId,
            fieldDefinitionId: definition.id,
            entityType,
            entityId: newEntityId,
            ...storage,
            updatedById: userId,
          },
          update: {
            ...storage,
            updatedById: userId,
          },
        });

        results.created++;
      } catch (error) {
        results.errors.push({
          entityId: value.sourceEntityId,
          field: value.fieldName,
          error: error.message,
        });
      }
    }

    return results;
  }
}
```

### 10.2 Field Mapping Configuration

```typescript
// Migration field mapping configuration
interface FieldMappingConfig {
  sourceSystem: 'NAVEX' | 'EQS' | 'CASE_IQ' | 'CONVERCENT';

  // Map source field IDs to target field names
  fieldMappings: {
    [sourceFieldId: string]: {
      targetField: string;          // Our field name
      valueTransform?: string;      // Transform function name
      defaultValue?: any;           // If source is empty
    };
  };

  // Map source option values to target option values
  optionMappings: {
    [fieldName: string]: {
      [sourceValue: string]: string;  // target value
    };
  };
}

// Example: NAVEX to Platform mapping
const navexMapping: FieldMappingConfig = {
  sourceSystem: 'NAVEX',
  fieldMappings: {
    'CUSTOM_CASE_NUM': { targetField: 'internal_case_number' },
    'EST_FINANCIAL_IMPACT': {
      targetField: 'estimated_exposure',
      valueTransform: 'parseNumber',
    },
    'BUSINESS_AREA_AFFECTED': {
      targetField: 'business_impact',
      valueTransform: 'parseMultiselect',
    },
  },
  optionMappings: {
    'business_impact': {
      'REVENUE_IMPACT': 'revenue',
      'REPUTATIONAL_RISK': 'reputation',
      'REGULATORY_FINE': 'regulatory',
    },
  },
};
```

---

## 11. Performance Considerations

### 11.1 Caching Strategy

```typescript
// Cache configuration for custom fields
const CACHE_CONFIG = {
  // Field definitions cached per org/entity type
  definitions: {
    keyPattern: 'org:{orgId}:custom_fields:{entityType}',
    ttlSeconds: 300,  // 5 minutes
  },

  // Invalidation events
  invalidateOn: [
    'custom_field_definition:created',
    'custom_field_definition:updated',
    'custom_field_definition:deleted',
  ],
};

// Cache invalidation service
@Injectable()
export class CustomFieldCacheService {
  async invalidateDefinitions(
    organizationId: string,
    entityType?: string,
  ): Promise<void> {
    if (entityType) {
      await this.redis.del(`org:${organizationId}:custom_fields:${entityType}`);
    } else {
      // Invalidate all entity types for this org
      const pattern = `org:${organizationId}:custom_fields:*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
}
```

### 11.2 Index Strategies

```sql
-- Primary query indexes (already in Prisma schema)

-- Additional composite indexes for common query patterns
CREATE INDEX idx_cfv_org_entity_field_text
  ON custom_field_values (organization_id, entity_type, field_definition_id, text_value)
  WHERE text_value IS NOT NULL;

CREATE INDEX idx_cfv_org_entity_field_number
  ON custom_field_values (organization_id, entity_type, field_definition_id, number_value)
  WHERE number_value IS NOT NULL;

CREATE INDEX idx_cfv_org_entity_field_date
  ON custom_field_values (organization_id, entity_type, field_definition_id, date_value)
  WHERE date_value IS NOT NULL;

-- GIN index for JSON searching (select/multiselect values)
CREATE INDEX idx_cfv_json_value_gin
  ON custom_field_values
  USING GIN (json_value jsonb_path_ops)
  WHERE json_value IS NOT NULL;
```

### 11.3 Elasticsearch Integration

```typescript
// Index searchable custom fields in Elasticsearch
@Injectable()
export class CustomFieldIndexService {
  /**
   * Update entity document with custom field values
   */
  async indexEntityCustomFields(
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    // Get searchable field definitions
    const definitions = await this.prisma.customFieldDefinition.findMany({
      where: {
        organizationId,
        entityType,
        isActive: true,
        isSearchable: true,
      },
    });

    if (definitions.length === 0) return;

    // Get values
    const values = await this.customFieldService.getValuesForEntity(
      organizationId,
      entityType,
      entityId,
      'SYSTEM', // Use system role to get all fields
    );

    // Build document update
    const customFieldsDoc: Record<string, any> = {};
    for (const def of definitions) {
      const value = values[def.name];
      if (value !== null && value !== undefined) {
        customFieldsDoc[def.name] = value;
      }
    }

    // Update Elasticsearch document
    const indexName = `org_${organizationId}_${entityType}s`;
    await this.elasticsearch.update({
      index: indexName,
      id: entityId,
      body: {
        doc: {
          customFields: customFieldsDoc,
        },
      },
    });
  }

  /**
   * Queue reindex when field definition changes
   */
  async queueReindexForField(
    organizationId: string,
    entityType: string,
    fieldDefinitionId: string,
  ): Promise<void> {
    await this.bullQueue.add('custom_fields:reindex', {
      organizationId,
      entityType,
      fieldDefinitionId,
    });
  }
}
```

---

## 12. Security Considerations

### 12.1 Permission Enforcement

```typescript
// apps/backend/src/modules/custom-fields/guards/custom-field.guard.ts

@Injectable()
export class CustomFieldPermissionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const fieldDefinitionId = request.params.id || request.body.fieldDefinitionId;

    if (!fieldDefinitionId) return true;

    const definition = await this.prisma.customFieldDefinition.findUnique({
      where: { id: fieldDefinitionId },
    });

    if (!definition) {
      throw new NotFoundException('Field definition not found');
    }

    // Check organization match
    if (definition.organizationId !== user.organizationId) {
      throw new ForbiddenException('Access denied');
    }

    // For read operations, check visibleToRoles
    if (request.method === 'GET') {
      if (definition.visibleToRoles.length > 0 &&
          !definition.visibleToRoles.includes(user.role)) {
        throw new ForbiddenException('Field not visible to your role');
      }
    }

    // For write operations, check editableByRoles
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      if (definition.editableByRoles.length > 0 &&
          !definition.editableByRoles.includes(user.role)) {
        throw new ForbiddenException('Field not editable by your role');
      }
    }

    return true;
  }
}
```

### 12.2 Input Validation

```typescript
// apps/backend/src/modules/custom-fields/services/validation.service.ts

@Injectable()
export class CustomFieldValidationService {
  /**
   * Validate custom field value against definition
   */
  validate(
    definition: CustomFieldDefinition,
    value: any,
  ): ValidationResult {
    const errors: string[] = [];

    // Required check
    if (definition.isRequired && (value === null || value === undefined || value === '')) {
      errors.push(`${definition.label} is required`);
      return { valid: false, errors };
    }

    // Skip further validation if empty and not required
    if (value === null || value === undefined) {
      return { valid: true, errors: [] };
    }

    // Type-specific validation
    switch (definition.fieldType) {
      case 'text':
      case 'textarea':
        this.validateText(definition.config as TextFieldConfig, value, errors);
        break;

      case 'number':
      case 'currency':
        this.validateNumber(definition.config as NumberFieldConfig, value, errors);
        break;

      case 'email':
        if (!this.isValidEmail(value)) {
          errors.push('Invalid email format');
        }
        break;

      case 'url':
        if (!this.isValidUrl(value)) {
          errors.push('Invalid URL format');
        }
        break;

      case 'phone':
        if (!this.isValidPhone(value)) {
          errors.push('Invalid phone number format');
        }
        break;

      case 'select':
        this.validateSelect(definition.config as SelectFieldConfig, value, errors);
        break;

      case 'multiselect':
        this.validateMultiselect(definition.config as SelectFieldConfig, value, errors);
        break;

      case 'user':
      case 'user_multi':
        await this.validateUserReference(value, definition.config, errors);
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private validateText(config: TextFieldConfig, value: string, errors: string[]): void {
    if (config.maxLength && value.length > config.maxLength) {
      errors.push(`Maximum ${config.maxLength} characters allowed`);
    }
    if (config.minLength && value.length < config.minLength) {
      errors.push(`Minimum ${config.minLength} characters required`);
    }
    if (config.pattern) {
      const regex = new RegExp(config.pattern);
      if (!regex.test(value)) {
        errors.push(config.patternMessage ?? 'Invalid format');
      }
    }
  }

  private validateNumber(config: NumberFieldConfig, value: number, errors: string[]): void {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push('Must be a valid number');
      return;
    }
    if (config.min !== undefined && value < config.min) {
      errors.push(`Minimum value is ${config.min}`);
    }
    if (config.max !== undefined && value > config.max) {
      errors.push(`Maximum value is ${config.max}`);
    }
  }

  private validateSelect(config: SelectFieldConfig, value: string, errors: string[]): void {
    const validValues = config.options.map(o => o.value);
    if (!validValues.includes(value) && !config.allowOther) {
      errors.push('Invalid selection');
    }
  }

  private validateMultiselect(config: SelectFieldConfig, value: string[], errors: string[]): void {
    if (!Array.isArray(value)) {
      errors.push('Must be an array');
      return;
    }
    if (config.minSelections && value.length < config.minSelections) {
      errors.push(`Select at least ${config.minSelections} options`);
    }
    if (config.maxSelections && value.length > config.maxSelections) {
      errors.push(`Select at most ${config.maxSelections} options`);
    }
  }
}
```

### 12.3 Audit Logging

```typescript
// All custom field changes are logged to the unified audit log

// Create/Update field value
await this.activityService.log({
  entityType: 'CASE',  // The entity type, not 'CUSTOM_FIELD_VALUE'
  entityId: caseId,
  action: 'custom_field_updated',
  actionDescription: `User updated custom field '${definition.label}' from "${oldValue}" to "${newValue}"`,
  changes: {
    oldValue: { [definition.name]: oldValue },
    newValue: { [definition.name]: newValue },
  },
  actorUserId: userId,
  organizationId,
});

// Create/Update field definition (admin action)
await this.activityService.log({
  entityType: 'CUSTOM_FIELD_DEFINITION',
  entityId: definition.id,
  action: 'created',
  actionDescription: `Admin created custom field '${definition.label}' for ${definition.entityType}`,
  actorUserId: userId,
  organizationId,
});
```

---

## 13. Implementation Guide

### 13.1 Implementation Phases

#### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Create database schema (Prisma migration)
- [ ] Implement CustomFieldDefinitionService (CRUD)
- [ ] Implement CustomFieldValueService (get/set values)
- [ ] Add validation service
- [ ] Add caching layer for definitions
- [ ] Unit tests for core services

#### Phase 2: API Integration (Week 3)
- [ ] Add custom field endpoints to API
- [ ] Integrate with entity services (Case, Investigation, etc.)
- [ ] Implement filter/sort by custom fields
- [ ] Add permission guards
- [ ] API tests

#### Phase 3: Frontend Components (Week 4)
- [ ] Build FieldRenderer component
- [ ] Build CustomFieldsSection component
- [ ] Integrate into entity forms (Case create/edit)
- [ ] Frontend tests

#### Phase 4: Admin UI (Week 5)
- [ ] Build field definition builder
- [ ] Build field management list
- [ ] Implement drag-and-drop reordering
- [ ] Add field deletion with confirmation
- [ ] Admin UI tests

#### Phase 5: Advanced Features (Week 6)
- [ ] Conditional field visibility
- [ ] Elasticsearch indexing for searchable fields
- [ ] Analytics/report builder integration
- [ ] Migration import support

### 13.2 Service Patterns

```typescript
// Example: Adding custom fields to Case service

@Injectable()
export class CaseService {
  constructor(
    private prisma: PrismaService,
    private customFieldService: CustomFieldService,
    private activityService: ActivityService,
  ) {}

  async findOne(
    organizationId: string,
    caseId: string,
    userRole: string,
  ): Promise<CaseWithCustomFields> {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: { /* standard includes */ },
    });

    if (!caseRecord || caseRecord.organizationId !== organizationId) {
      throw new NotFoundException('Case not found');
    }

    // Load custom fields
    const [customFields, customFieldDefinitions] = await Promise.all([
      this.customFieldService.getValuesForEntity(
        organizationId,
        'case',
        caseId,
        userRole,
        caseRecord,
      ),
      this.customFieldService.getDefinitionsForEntityType(
        organizationId,
        'case',
      ),
    ]);

    return {
      ...caseRecord,
      customFields,
      customFieldDefinitions,
    };
  }

  async updateCustomFields(
    organizationId: string,
    caseId: string,
    customFields: Record<string, any>,
    userId: string,
    userRole: string,
  ): Promise<CaseWithCustomFields> {
    // Validate and save custom fields
    await this.customFieldService.setValuesForEntity(
      organizationId,
      'case',
      caseId,
      customFields,
      userId,
      userRole,
    );

    // Return updated case
    return this.findOne(organizationId, caseId, userRole);
  }
}
```

### 13.3 Testing Patterns

```typescript
// apps/backend/src/modules/custom-fields/custom-field.service.spec.ts

describe('CustomFieldService', () => {
  describe('getValuesForEntity', () => {
    it('should return values for visible fields only', async () => {
      // Create field visible to COMPLIANCE_OFFICER only
      const field = await createTestField({
        visibleToRoles: ['COMPLIANCE_OFFICER'],
      });

      await createTestValue(field.id, 'case_123', 'test value');

      // COMPLIANCE_OFFICER can see the field
      const values1 = await service.getValuesForEntity(
        orgId, 'case', 'case_123', 'COMPLIANCE_OFFICER',
      );
      expect(values1[field.name]).toBe('test value');

      // INVESTIGATOR cannot see the field
      const values2 = await service.getValuesForEntity(
        orgId, 'case', 'case_123', 'INVESTIGATOR',
      );
      expect(values2[field.name]).toBeUndefined();
    });

    it('should evaluate conditional visibility', async () => {
      // Create field visible only when category is 'fraud'
      const field = await createTestField({
        conditions: [{
          dependsOn: 'category_id',
          operator: 'equals',
          value: 'cat_fraud',
        }],
      });

      await createTestValue(field.id, 'case_123', 'test value');

      // Field visible when condition matches
      const values1 = await service.getValuesForEntity(
        orgId, 'case', 'case_123', 'COMPLIANCE_OFFICER',
        { category_id: 'cat_fraud' },
      );
      expect(values1[field.name]).toBe('test value');

      // Field hidden when condition doesn't match
      const values2 = await service.getValuesForEntity(
        orgId, 'case', 'case_123', 'COMPLIANCE_OFFICER',
        { category_id: 'cat_harassment' },
      );
      expect(values2[field.name]).toBeUndefined();
    });
  });

  describe('tenant isolation', () => {
    it('should not return fields from other organizations', async () => {
      const field1 = await createTestField({ organizationId: 'org_1' });
      const field2 = await createTestField({ organizationId: 'org_2' });

      const definitions = await service.getDefinitionsForEntityType('org_1', 'case');

      expect(definitions).toContainEqual(expect.objectContaining({ id: field1.id }));
      expect(definitions).not.toContainEqual(expect.objectContaining({ id: field2.id }));
    });
  });
});
```

---

## Appendix A: Field Type Quick Reference

| Field Type | Storage | Operators | Sortable | Searchable |
|------------|---------|-----------|----------|------------|
| text | textValue | eq, ne, contains, starts_with, ends_with | Yes | Yes |
| textarea | textValue | eq, ne, contains | No | Yes |
| rich_text | jsonValue | contains (text content) | No | Yes |
| number | numberValue | eq, ne, gt, gte, lt, lte | Yes | No |
| currency | numberValue | eq, ne, gt, gte, lt, lte | Yes | No |
| date | dateValue | eq, ne, gt, gte, lt, lte | Yes | No |
| datetime | dateValue | eq, ne, gt, gte, lt, lte | Yes | No |
| boolean | booleanValue | eq, ne | Yes | No |
| select | jsonValue | eq, ne, in, not_in | Yes | No |
| multiselect | jsonValue | contains, in, not_in | No | No |
| user | jsonValue | eq, ne | Yes | No |
| user_multi | jsonValue | contains | No | No |
| employee | jsonValue | eq, ne | Yes | No |
| employee_multi | jsonValue | contains | No | No |
| url | textValue | eq, ne, contains | No | No |
| email | textValue | eq, ne, contains | Yes | Yes |
| phone | textValue | eq, ne, contains | Yes | Yes |

---

## Appendix B: Migration Field Mapping

| Source System | Source Type | Platform Type | Notes |
|---------------|-------------|---------------|-------|
| NAVEX | FREE_TEXT | text | |
| NAVEX | MULTI_LINE_TEXT | textarea | |
| NAVEX | NUMERIC | number | |
| NAVEX | DATE | date | |
| NAVEX | DROPDOWN | select | |
| NAVEX | MULTI_SELECT | multiselect | |
| NAVEX | YES_NO | boolean | |
| NAVEX | USER_REFERENCE | user | |
| EQS | String | text | |
| EQS | LongText | textarea | |
| EQS | Integer | number | precision: 0 |
| EQS | Decimal | number | |
| EQS | Date | date | |
| EQS | DateTime | datetime | |
| EQS | Lookup | select | |
| EQS | MultiLookup | multiselect | |
| EQS | Boolean | boolean | |

---

*Document Version: 1.0*
*Last Updated: February 2026*
