# Flat File Export Technical Specification

**Version:** 1.0
**Last Updated:** February 2026
**Status:** Draft
**Phase:** 11 (Analytics & Reporting)

---

## 1. Overview

### 1.1 Problem Statement

Compliance teams need to export "everything" into a single flat file for:

- Board reporting in Excel
- External auditor submissions
- Business intelligence tools (Tableau, Power BI)
- Regulatory filings

The challenge: Our data model is hierarchical (Case → Investigations → Interviews → Responses), but exports need to be flat rows with predictable columns.

### 1.2 Solution: Hybrid Flat Export with Tagged Fields

A denormalized export format that:

1. **Core columns** - Always present (case metadata, dates, status)
2. **Investigation columns** - Up to N investigations per row (configurable, default 3)
3. **Tagged fields** - Admin-selected custom fields promoted to named columns
4. **Overflow JSON** - Everything else in a catch-all column for advanced users

---

## 2. Architecture

### 2.1 Export Levels

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FLAT EXPORT ROW                               │
├─────────────────────────────────────────────────────────────────────┤
│ CORE COLUMNS          │ Always present, same for all orgs           │
│ (case_number, status, │ ~40 columns                                  │
│  category, dates...)  │                                              │
├─────────────────────────────────────────────────────────────────────┤
│ INVESTIGATION COLUMNS │ Repeated for inv_1, inv_2, inv_3            │
│ (inv_N_type,          │ ~15 columns × 3 = 45 columns                 │
│  inv_N_outcome...)    │ NULL if fewer investigations                 │
├─────────────────────────────────────────────────────────────────────┤
│ TAGGED FIELDS         │ Admin-configured "special datum" fields     │
│ (tag_1_name,          │ Up to 20 tag slots                          │
│  tag_1_value...)      │ Pulled from custom fields or form responses │
├─────────────────────────────────────────────────────────────────────┤
│ OVERFLOW              │ JSON blob with everything else              │
│ (all_custom_fields,   │ For power users who need full data          │
│  all_responses)       │                                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Model

```prisma
// Admin-configured field tags for flat export
model ReportFieldTag {
  id              String   @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])

  // What field is tagged
  sourceEntityType  ExportSourceType  // CASE, INVESTIGATION, DISCLOSURE, INTERVIEW_RESPONSE
  sourceFieldPath   String            // "customFields.totalDollarAmount" or "responses.q5"
  templateId        String?           // Optional: limit to specific form template

  // Export config
  tagSlot           Int               // 1-20, determines column position
  columnName        String            // "total_dollar_amount", "substantiation_result"
  displayLabel      String            // "Total Dollar Amount", "Substantiation Result"

  // Formatting
  dataType          ExportDataType    // TEXT, NUMBER, DATE, BOOLEAN, CURRENCY
  formatPattern     String?           // "$#,##0.00" for currency, "YYYY-MM-DD" for date

  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdById       String

  @@unique([organizationId, tagSlot])
  @@unique([organizationId, sourceEntityType, sourceFieldPath, templateId])
  @@index([organizationId])
}

enum ExportSourceType {
  CASE
  INVESTIGATION
  DISCLOSURE
  INTERVIEW_RESPONSE
  RIU
}

enum ExportDataType {
  TEXT
  NUMBER
  DATE
  BOOLEAN
  CURRENCY
  PERCENTAGE
}

// Export job tracking
model ExportJob {
  id              String   @id @default(uuid())
  organizationId  String

  // Job config
  exportType      ExportType        // FLAT_FILE, CASES_ONLY, DISCLOSURES_ONLY
  format          ExportFormat      // CSV, XLSX, JSON
  filters         Json              // Query filters applied
  columns         Json              // Column configuration snapshot

  // Status
  status          ExportJobStatus   // PENDING, PROCESSING, COMPLETED, FAILED
  progress        Int @default(0)   // 0-100 percentage
  totalRows       Int?
  processedRows   Int @default(0)

  // Output
  fileUrl         String?           // Azure Blob URL when complete
  fileSizeBytes   Int?
  expiresAt       DateTime?         // Auto-delete after 7 days

  // Error handling
  errorMessage    String?
  errorDetails    Json?

  // Audit
  createdAt       DateTime @default(now())
  completedAt     DateTime?
  createdById     String

  @@index([organizationId, status])
  @@index([organizationId, createdAt])
}

enum ExportType {
  FLAT_FILE           // Everything denormalized
  CASES_ONLY          // Just case columns
  INVESTIGATIONS_ONLY // Just investigation columns
  DISCLOSURES_ONLY    // Just disclosure columns
  CUSTOM              // User-selected columns
}

enum ExportFormat {
  CSV
  XLSX
  JSON
  PARQUET           // For BI tools
}

enum ExportJobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

---

## 3. Column Specifications

### 3.1 Core Columns (Always Present)

| Column Name             | Source                 | Type      | Description             |
| ----------------------- | ---------------------- | --------- | ----------------------- |
| `case_id`               | Case.id                | UUID      | Primary key             |
| `case_number`           | Case.caseNumber        | String    | Human-readable ID       |
| `case_status`           | Case.status            | Enum      | Current status          |
| `case_priority`         | Case.priority          | Enum      | Priority level          |
| `case_created_at`       | Case.createdAt         | DateTime  | Creation timestamp      |
| `case_closed_at`        | Case.closedAt          | DateTime? | Closure timestamp       |
| `case_days_open`        | Calculated             | Int       | Days since creation     |
| `case_sla_breached`     | Calculated             | Boolean   | SLA exceeded            |
| `category_name`         | Category.name          | String    | Primary category        |
| `category_code`         | Category.code          | String    | Category code           |
| `subcategory_name`      | Category.parent        | String?   | Subcategory if exists   |
| `source_channel`        | RIU.sourceChannel      | Enum      | HOTLINE, WEB_FORM, etc. |
| `is_anonymous`          | RIU.isAnonymous        | Boolean   | Anonymous report        |
| `reporter_relationship` | Person.relationship    | String?   | Employee, Vendor, etc.  |
| `assigned_to_name`      | User.name              | String?   | Current assignee        |
| `assigned_to_email`     | User.email             | String?   | Assignee email          |
| `business_unit_name`    | BusinessUnit.name      | String?   | Primary BU              |
| `business_unit_code`    | BusinessUnit.code      | String?   | BU code                 |
| `location_name`         | Location.name          | String?   | Primary location        |
| `location_country`      | Location.country       | String?   | Country                 |
| `location_region`       | Location.region        | String?   | Region                  |
| `outcome`               | Case.outcome           | Enum?     | Final outcome           |
| `outcome_reason`        | Case.outcomeReason     | String?   | Outcome detail          |
| `has_remediation`       | Calculated             | Boolean   | Remediation exists      |
| `remediation_status`    | RemediationPlan.status | Enum?     | Plan status             |
| `riu_count`             | Calculated             | Int       | Linked RIUs             |
| `investigation_count`   | Calculated             | Int       | Total investigations    |
| `subject_count`         | Calculated             | Int       | Named subjects          |
| `attachment_count`      | Calculated             | Int       | Total attachments       |

### 3.2 Investigation Columns (Repeated for inv_1, inv_2, inv_3)

| Column Pattern              | Source                       | Type      | Description          |
| --------------------------- | ---------------------------- | --------- | -------------------- |
| `inv_{N}_id`                | Investigation.id             | UUID      | Investigation ID     |
| `inv_{N}_type`              | Investigation.type           | Enum      | Investigation type   |
| `inv_{N}_status`            | Investigation.status         | Enum      | Current status       |
| `inv_{N}_outcome`           | Investigation.outcome        | Enum?     | Final outcome        |
| `inv_{N}_started_at`        | Investigation.startedAt      | DateTime? | Start date           |
| `inv_{N}_completed_at`      | Investigation.completedAt    | DateTime? | Completion date      |
| `inv_{N}_days_to_complete`  | Calculated                   | Int?      | Duration in days     |
| `inv_{N}_investigator_name` | User.name                    | String?   | Lead investigator    |
| `inv_{N}_interview_count`   | Calculated                   | Int       | Interview count      |
| `inv_{N}_finding_summary`   | Investigation.findingSummary | String?   | AI-generated summary |

### 3.3 Tagged Field Columns

Admins configure which custom fields or form responses appear as named columns.

| Column Pattern      | Source                      | Type   |
| ------------------- | --------------------------- | ------ | ------------------- |
| `tag_{N}_name`      | ReportFieldTag.displayLabel | String | Field label         |
| `tag_{N}_value`     | Dynamic lookup              | Mixed  | Field value         |
| `tag_{N}_formatted` | Formatted per dataType      | String | Display-ready value |

**Example configurations:**

```typescript
// Tag 1: Dollar amount from gift disclosure form
{
  tagSlot: 1,
  sourceEntityType: 'DISCLOSURE',
  sourceFieldPath: 'formData.giftValue',
  templateId: 'gift-disclosure-template-id',
  columnName: 'gift_value',
  displayLabel: 'Gift Value',
  dataType: 'CURRENCY',
  formatPattern: '$#,##0.00'
}

// Tag 2: Substantiation result from investigation
{
  tagSlot: 2,
  sourceEntityType: 'INVESTIGATION',
  sourceFieldPath: 'outcome',
  templateId: null, // All investigation types
  columnName: 'substantiation',
  displayLabel: 'Substantiated?',
  dataType: 'TEXT'
}

// Tag 3: Specific interview question response
{
  tagSlot: 3,
  sourceEntityType: 'INTERVIEW_RESPONSE',
  sourceFieldPath: 'responses.did_witness_event',
  templateId: 'witness-interview-template-id',
  columnName: 'witness_confirmed',
  displayLabel: 'Witness Confirmed Event',
  dataType: 'BOOLEAN'
}
```

### 3.4 Overflow JSON Columns

For power users who need access to all data:

| Column Name               | Content                                 |
| ------------------------- | --------------------------------------- |
| `all_custom_fields`       | JSON object with all case custom fields |
| `all_investigations`      | JSON array with full investigation data |
| `all_interview_responses` | JSON array with all interview Q&A       |
| `all_disclosures`         | JSON array with linked disclosure data  |
| `all_subjects`            | JSON array with subject information     |

---

## 4. Export Service

### 4.1 Service Interface

```typescript
interface FlatExportService {
  // Admin configuration
  configureTaggedFields(
    orgId: string,
    tags: CreateTagDto[],
  ): Promise<ReportFieldTag[]>;
  getTaggedFields(orgId: string): Promise<ReportFieldTag[]>;
  previewTaggedFields(orgId: string, caseId: string): Promise<TagPreview[]>;

  // Export jobs
  createExportJob(orgId: string, config: ExportConfig): Promise<ExportJob>;
  getExportJob(orgId: string, jobId: string): Promise<ExportJob>;
  cancelExportJob(orgId: string, jobId: string): Promise<void>;
  downloadExport(orgId: string, jobId: string): Promise<SignedUrl>;

  // Streaming for large exports
  streamExport(orgId: string, config: ExportConfig): AsyncIterable<ExportRow>;
}

interface ExportConfig {
  exportType: ExportType;
  format: ExportFormat;

  // Filters
  dateRange?: { start: Date; end: Date };
  statuses?: CaseStatus[];
  categories?: string[];
  businessUnits?: string[];
  locations?: string[];

  // Column config
  includeInvestigations?: boolean;
  maxInvestigations?: number; // Default 3
  includeTaggedFields?: boolean;
  includeOverflow?: boolean;

  // Options
  includeHeaders?: boolean;
  dateFormat?: string;
  timezone?: string;
}
```

### 4.2 Export Flow

```
1. User requests export
   └── POST /api/v1/exports/flat-file
       └── { filters, format, columns }

2. Create ExportJob record (status: PENDING)
   └── Return job ID immediately

3. Queue background job (BullMQ)
   └── flat-export-processor

4. Processor executes:
   a. Load organization's tagged field config
   b. Build query with filters
   c. Stream results in batches (1000 rows)
   d. For each batch:
      - Denormalize to flat rows
      - Apply tagged field lookups
      - Format values
      - Write to temp file
   e. Upload completed file to Azure Blob
   f. Update job status to COMPLETED
   g. Set expiration (7 days)

5. User polls or receives notification
   └── GET /api/v1/exports/{jobId}
       └── Returns { status, downloadUrl }

6. User downloads file
   └── GET /api/v1/exports/{jobId}/download
       └── Returns signed URL (1-hour expiry)
```

### 4.3 Performance Considerations

| Scale                 | Strategy                            |
| --------------------- | ----------------------------------- |
| < 1,000 rows          | Synchronous, return file directly   |
| 1,000 - 50,000 rows   | Background job, single worker       |
| 50,000 - 500,000 rows | Background job, cursor pagination   |
| > 500,000 rows        | Background job, partitioned by date |

**Memory management:**

- Stream rows, never load full dataset in memory
- Use ExcelJS streaming mode for XLSX
- Batch database queries (1000 rows per query)
- Write to temp file, then upload to blob storage

---

## 5. API Endpoints

### 5.1 Tag Configuration

```
POST   /api/v1/exports/tags           - Create/update tagged fields
GET    /api/v1/exports/tags           - List organization's tags
DELETE /api/v1/exports/tags/:slot     - Remove tag from slot
GET    /api/v1/exports/tags/preview   - Preview tags with sample case
```

### 5.2 Export Jobs

```
POST   /api/v1/exports/flat-file      - Create flat file export job
POST   /api/v1/exports/cases          - Create cases-only export
POST   /api/v1/exports/disclosures    - Create disclosures export
GET    /api/v1/exports                - List user's export jobs
GET    /api/v1/exports/:id            - Get export job status
GET    /api/v1/exports/:id/download   - Get download URL
DELETE /api/v1/exports/:id            - Cancel pending job
```

### 5.3 Request/Response Examples

**Create Export Job:**

```http
POST /api/v1/exports/flat-file
Content-Type: application/json

{
  "format": "XLSX",
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  },
  "statuses": ["CLOSED"],
  "includeInvestigations": true,
  "maxInvestigations": 3,
  "includeTaggedFields": true,
  "includeOverflow": false
}

Response 202:
{
  "jobId": "export-abc123",
  "status": "PENDING",
  "estimatedRows": 4500,
  "createdAt": "2026-02-04T10:00:00Z"
}
```

**Check Status:**

```http
GET /api/v1/exports/export-abc123

Response 200:
{
  "jobId": "export-abc123",
  "status": "COMPLETED",
  "progress": 100,
  "totalRows": 4532,
  "format": "XLSX",
  "fileSizeBytes": 2340567,
  "downloadUrl": "/api/v1/exports/export-abc123/download",
  "expiresAt": "2026-02-11T10:00:00Z"
}
```

---

## 6. UI Components

### 6.1 Tag Configuration UI (Admin Settings)

```
┌─────────────────────────────────────────────────────────────────┐
│ Export Field Tags                                    [+ Add Tag] │
├─────────────────────────────────────────────────────────────────┤
│ Slot │ Column Name         │ Source              │ Format       │
├──────┼────────────────────┼────────────────────┼──────────────┤
│ 1    │ Gift Value          │ Disclosure: Gift   │ Currency     │ ⚙ ✕
│ 2    │ Substantiated       │ Investigation      │ Text         │ ⚙ ✕
│ 3    │ Witness Confirmed   │ Interview: Q5      │ Yes/No       │ ⚙ ✕
│ 4    │ [Empty]             │ -                  │ -            │ +
│ ...  │                     │                    │              │
│ 20   │ [Empty]             │ -                  │ -            │ +
└─────────────────────────────────────────────────────────────────┘

[Preview with Sample Case ▼]
```

### 6.2 Export Builder Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ Export Data                                              [✕]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Export Type:  ○ Flat File (Everything)                          │
│               ○ Cases Only                                       │
│               ○ Disclosures Only                                 │
│                                                                  │
│ Format:       [XLSX ▼]  ○ CSV  ○ JSON                           │
│                                                                  │
│ Date Range:   [2025-01-01] to [2025-12-31]                      │
│                                                                  │
│ Filters:                                                         │
│   Status:     [All ▼]                                           │
│   Category:   [All ▼]                                           │
│   Location:   [All ▼]                                           │
│                                                                  │
│ ┌─ Columns ─────────────────────────────────────────────────┐   │
│ │ ☑ Core case columns (40 columns)                          │   │
│ │ ☑ Investigation columns (up to [3 ▼] investigations)      │   │
│ │ ☑ Tagged fields (3 configured)                            │   │
│ │ ☐ Overflow JSON (advanced)                                │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Estimated: ~4,500 rows                                          │
│                                                                  │
│                              [Cancel]  [Start Export]            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Build Phases

### 7.1 Phase 11 Plan Integration

Add as plan **11-21** (after existing 11-20):

```
11-21-PLAN.md (Wave 4) - Flat file export with tagged fields
  - ReportFieldTag model and service
  - ExportJob model and queue processor
  - Core column builder
  - Investigation denormalization (up to N)
  - Tagged field resolution
  - CSV/XLSX/JSON formatters
  - Export status polling endpoint
  - Azure Blob upload with signed URLs
```

### 7.2 Dependencies

- Requires: Phase 11 reporting infrastructure (QueryBuilder)
- Requires: Phase 1 file storage service
- Requires: Phase 1 job queue (BullMQ)

---

## 8. Security & Access Control

### 8.1 Permissions

| Action                   | Required Role                     |
| ------------------------ | --------------------------------- |
| Configure tags           | SYSTEM_ADMIN, COMPLIANCE_OFFICER  |
| Create export            | COMPLIANCE_OFFICER, REPORT_VIEWER |
| Download own exports     | Any authenticated user            |
| Download others' exports | SYSTEM_ADMIN only                 |
| View export history      | Own exports or SYSTEM_ADMIN       |

### 8.2 Data Security

- All exports filtered by organization (RLS enforced)
- Export files encrypted at rest in Azure Blob
- Signed URLs expire after 1 hour
- Export files auto-deleted after 7 days
- Audit log records all export requests and downloads
- PII masking option for external auditor exports

---

## 9. Appendix: Sample Output

### 9.1 CSV Header Row

```csv
case_id,case_number,case_status,case_priority,case_created_at,case_closed_at,case_days_open,case_sla_breached,category_name,category_code,subcategory_name,source_channel,is_anonymous,reporter_relationship,assigned_to_name,assigned_to_email,business_unit_name,business_unit_code,location_name,location_country,location_region,outcome,outcome_reason,has_remediation,remediation_status,riu_count,investigation_count,subject_count,attachment_count,inv_1_id,inv_1_type,inv_1_status,inv_1_outcome,inv_1_started_at,inv_1_completed_at,inv_1_days_to_complete,inv_1_investigator_name,inv_1_interview_count,inv_1_finding_summary,inv_2_id,inv_2_type,inv_2_status,inv_2_outcome,...,tag_1_value,tag_2_value,tag_3_value,...,all_custom_fields
```

### 9.2 Sample Data Row

```csv
abc-123,CASE-2025-0001,CLOSED,MEDIUM,2025-01-15T10:00:00Z,2025-02-01T15:30:00Z,17,false,Harassment,HAR,Sexual Harassment,HOTLINE,true,Employee,Jane Smith,jane@acme.com,Healthcare,HCR,Chicago Office,USA,North America,SUBSTANTIATED,Policy violation confirmed,true,COMPLETED,1,2,1,5,inv-001,INTERNAL,COMPLETED,SUBSTANTIATED,2025-01-16,2025-01-28,12,John Doe,3,Investigation found evidence of...,inv-002,REGULATORY,COMPLETED,NO_VIOLATION,...,$5000.00,Yes,true,...,"{""customField1"": ""value""}"
```

---

_Specification created: 2026-02-04_
_Phase: 11 (Analytics & Reporting)_
_Plan: 11-21_
