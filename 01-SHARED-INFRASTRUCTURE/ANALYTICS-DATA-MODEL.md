# Analytics Data Model

**Purpose:** Defines the data structures for reporting, dashboards, and analytics across all platform modules. Includes fact tables for aggregation and schemas for saved dashboards and reports.

**Last Updated:** January 2026

**Cross-References:**
- Core Data Model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md`
- Analytics PRD: `02-MODULES/07-ANALYTICS-REPORTING/PRD.md`

---

## Table of Contents

1. [Analytics Architecture](#analytics-architecture)
2. [Fact Tables](#fact-tables)
   - Case Fact
   - Disclosure Fact
   - Form Fact
   - Attestation Fact
3. [Dashboard Schemas](#dashboard-schemas)
4. [Report Schemas](#report-schemas)
5. [Scheduled Reports](#scheduled-reports)
6. [Refresh Strategies](#refresh-strategies)

---

## Analytics Architecture

### Data Flow

```
Source Tables (OLTP)          Fact Tables (Analytics)         Presentation
─────────────────────         ──────────────────────          ────────────

Case, Investigation    ──►    CaseFact                  ──►   Dashboards
                              (pre-aggregated metrics)        Saved Reports
Disclosure, Workflow   ──►    DisclosureFact                  Ad-hoc Queries
                              (denormalized for speed)        Board Reports
Form, Submission       ──►    FormFact                        Exports

Policy, Attestation    ──►    AttestationFact
```

### Query Tiers

| Tier | Use Case | Data Source | Latency Target |
|------|----------|-------------|----------------|
| **Real-time** | Current workload, live queues | Source tables | <500ms |
| **Near-real-time** | Dashboards, metrics cards | Fact tables (5-min refresh) | <1s |
| **Analytical** | Complex reports, trends | Fact tables (hourly refresh) | <5s |
| **Batch** | Board reports, exports | Materialized views (daily) | <30s |

---

## Fact Tables

### CaseFact

Pre-aggregated case metrics for dashboard and reporting performance.

```prisma
model CaseFact {
  // Identity
  case_id               String   @id
  organization_id       String

  // Time Dimensions
  created_date          DateTime                  // Date only (for grouping)
  created_month         String                    // "2026-01" format
  created_quarter       String                    // "2026-Q1" format
  created_year          Int
  closed_date           DateTime?
  closed_month          String?
  closed_quarter        String?
  closed_year           Int?

  // Source Dimensions
  source_channel        SourceChannel             // HOTLINE, WEB_FORM, etc.
  intake_type           IntakeType                // REPORT, RFI, FOLLOW_UP

  // Classification Dimensions
  primary_category_id   String?
  primary_category_code String?
  primary_category_name String?
  secondary_category_id String?
  concept_key           String?                   // Cross-module correlation
  severity_level        SeverityLevel?

  // Status Dimensions
  current_status        CaseStatus
  outcome               CaseOutcome?
  outcome_category      String?                   // Substantiated detail

  // Location Dimensions
  location_id           String?
  location_name         String?
  location_country      String?
  location_region       String?                   // Derived from hierarchy

  // Business Unit Dimensions
  business_unit_id      String?
  business_unit_code    String?
  business_unit_name    String?

  // Reporter Dimensions
  is_anonymous          Boolean
  reporter_relationship String?                   // Employee, Vendor, etc.

  // Assignment Dimensions
  assigned_user_id      String?
  assigned_user_name    String?
  assigned_department   String?

  // Investigation Metrics
  investigation_count   Int      @default(0)
  investigation_ids     String[]                  // For drill-down

  // Time Metrics (in days)
  days_open             Int?                      // Current or final
  days_to_first_assignment Int?
  days_to_first_investigation Int?
  days_to_close         Int?

  // SLA Metrics
  sla_target_days       Int?
  sla_breached          Boolean @default(false)
  sla_days_remaining    Int?                      // Negative if breached

  // Flags
  has_follow_ups        Boolean @default(false)
  follow_up_count       Int     @default(0)
  has_escalation        Boolean @default(false)
  has_remediation       Boolean @default(false)

  // Refresh Metadata
  refreshed_at          DateTime @default(now())

  // Indexes
  @@index([organization_id, created_date])
  @@index([organization_id, current_status])
  @@index([organization_id, primary_category_id])
  @@index([organization_id, location_id])
  @@index([organization_id, business_unit_id])
  @@index([organization_id, assigned_user_id])
  @@index([organization_id, severity_level, current_status])
}

enum SourceChannel {
  HOTLINE
  WEB_FORM
  CHATBOT
  PROXY_REPORT
  DIRECT_ENTRY
  EMAIL
  INTEGRATION
}

enum IntakeType {
  REPORT
  RFI
  FOLLOW_UP
}

enum CaseStatus {
  NEW
  TRIAGING
  ASSIGNED
  IN_INVESTIGATION
  PENDING_REVIEW
  PENDING_REMEDIATION
  CLOSED
  ARCHIVED
}

enum CaseOutcome {
  SUBSTANTIATED
  UNSUBSTANTIATED
  INCONCLUSIVE
  WITHDRAWN
  DUPLICATE
  NO_ACTION_REQUIRED
}
```

### DisclosureFact

Pre-aggregated disclosure metrics.

```prisma
model DisclosureFact {
  // Identity
  disclosure_id         String   @id
  organization_id       String

  // Time Dimensions
  submitted_date        DateTime
  submitted_month       String
  submitted_quarter     String
  submitted_year        Int
  decided_date          DateTime?
  decided_month         String?

  // Type Dimensions
  form_type             DisclosureType            // COI, GIFT, OUTSIDE_ACTIVITY
  form_definition_id    String?
  form_definition_name  String?

  // Status Dimensions
  current_status        DisclosureStatus
  outcome               DisclosureOutcome?

  // Campaign Dimensions
  campaign_id           String?
  campaign_name         String?
  is_campaign_submission Boolean @default(false)

  // Submitter Dimensions
  submitter_employee_id String?
  submitter_department  String?
  submitter_location_id String?
  submitter_business_unit_id String?

  // Relationship Dimensions (for COI)
  relationship_type     String?
  related_party_type    String?

  // Gift Dimensions (for Gifts)
  gift_value            Decimal?
  gift_value_range      String?                   // "<$50", "$50-$100", etc.
  gift_type             String?

  // Workflow Metrics
  workflow_stages_total Int     @default(0)
  workflow_stages_completed Int @default(0)
  current_workflow_stage String?

  // Time Metrics (in days)
  days_pending          Int?
  days_to_decision      Int?
  days_in_current_stage Int?

  // Flags
  has_conditions        Boolean @default(false)
  requires_followup     Boolean @default(false)
  is_recurring          Boolean @default(false)

  // Refresh Metadata
  refreshed_at          DateTime @default(now())

  // Indexes
  @@index([organization_id, submitted_date])
  @@index([organization_id, form_type])
  @@index([organization_id, current_status])
  @@index([organization_id, campaign_id])
  @@index([organization_id, submitter_department])
}

enum DisclosureType {
  CONFLICT_OF_INTEREST
  GIFT_RECEIVED
  GIFT_GIVEN
  ENTERTAINMENT
  OUTSIDE_ACTIVITY
  POLITICAL_CONTRIBUTION
  CHARITABLE_DONATION
  RELATED_PARTY_TRANSACTION
  CUSTOM
}

enum DisclosureStatus {
  DRAFT
  SUBMITTED
  IN_REVIEW
  APPROVED
  APPROVED_WITH_CONDITIONS
  REJECTED
  WITHDRAWN
  EXPIRED
}

enum DisclosureOutcome {
  APPROVED
  APPROVED_WITH_CONDITIONS
  DENIED
  WITHDRAWN
  EXPIRED
}
```

### FormFact

Form submission analytics across all form types.

```prisma
model FormFact {
  // Identity
  submission_id         String   @id
  organization_id       String

  // Time Dimensions
  started_at            DateTime?
  submitted_at          DateTime
  submitted_date        DateTime                  // Date only
  submitted_month       String
  submitted_year        Int

  // Form Dimensions
  form_definition_id    String
  form_definition_name  String
  form_type             FormType                  // INTAKE, DISCLOSURE, ATTESTATION, SURVEY
  form_version          Int

  // Source Dimensions
  source_channel        SourceChannel
  device_type           String?                   // desktop, mobile, tablet

  // Status Dimensions
  current_status        FormSubmissionStatus

  // Completion Metrics
  time_to_complete_seconds Int?
  time_to_complete_range String?                  // "<1min", "1-5min", etc.
  question_count        Int
  answered_count        Int
  completion_rate       Decimal                   // 0.0 to 1.0
  skipped_count         Int     @default(0)

  // Abandonment Metrics
  abandoned             Boolean @default(false)
  abandoned_at_question Int?
  resume_count          Int     @default(0)

  // Language
  submitted_language    String?

  // Refresh Metadata
  refreshed_at          DateTime @default(now())

  // Indexes
  @@index([organization_id, submitted_date])
  @@index([organization_id, form_type])
  @@index([organization_id, form_definition_id])
  @@index([organization_id, source_channel])
}

enum FormType {
  INTAKE               // Case intake
  DISCLOSURE           // COI, Gifts, etc.
  ATTESTATION          // Policy acknowledgment
  SURVEY               // Feedback, evaluation
  CUSTOM               // Custom forms
}

enum FormSubmissionStatus {
  IN_PROGRESS
  COMPLETED
  ABANDONED
  EXPIRED
}
```

### AttestationFact

Policy attestation tracking for compliance reporting.

```prisma
model AttestationFact {
  // Identity
  attestation_id        String   @id
  organization_id       String

  // Time Dimensions
  required_date         DateTime                  // When attestation was due
  required_month        String
  completed_date        DateTime?
  completed_month       String?

  // Policy Dimensions
  policy_id             String
  policy_title          String
  policy_type           String?
  policy_version        Int

  // Campaign Dimensions
  campaign_id           String?
  campaign_name         String?
  campaign_deadline     DateTime?

  // Employee Dimensions
  employee_id           String
  employee_department   String?
  employee_location_id  String?
  employee_business_unit_id String?
  employee_manager_id   String?

  // Status Dimensions
  current_status        AttestationStatus
  attestation_method    AttestationMethod?        // How they attested

  // Time Metrics
  days_to_complete      Int?
  days_overdue          Int?                      // Negative = early

  // Communication Metrics
  reminder_count        Int     @default(0)
  last_reminder_date    DateTime?
  viewed_at             DateTime?
  view_duration_seconds Int?

  // Flags
  is_overdue            Boolean @default(false)
  was_exempted          Boolean @default(false)
  exemption_reason      String?

  // Refresh Metadata
  refreshed_at          DateTime @default(now())

  // Indexes
  @@index([organization_id, required_date])
  @@index([organization_id, policy_id])
  @@index([organization_id, campaign_id])
  @@index([organization_id, current_status])
  @@index([organization_id, employee_department])
  @@index([organization_id, is_overdue])
}

enum AttestationStatus {
  PENDING
  VIEWED
  COMPLETED
  OVERDUE
  EXEMPT
  REVOKED
}

enum AttestationMethod {
  WEB_PORTAL
  EMAIL_LINK
  MOBILE_APP
  SSO_PROMPT
  CHATBOT
  LMS_INTEGRATION
}
```

---

## Dashboard Schemas

### SavedDashboard

User-created and system dashboards.

```prisma
model SavedDashboard {
  id                    String   @id @default(uuid())
  organization_id       String

  // Identity
  name                  String
  description           String?
  slug                  String                    // URL-safe identifier

  // Ownership
  owner_user_id         String
  owner_type            DashboardOwnerType        // USER, TEAM, SYSTEM

  // Sharing
  is_default            Boolean @default(false)   // Org default dashboard
  is_shared             Boolean @default(false)   // Visible to org
  shared_with_roles     UserRole[]                // Specific role access
  shared_with_user_ids  String[]                  // Specific user access

  // Layout
  layout_type           DashboardLayoutType       // GRID, FREEFORM
  layout                Json                      // Widget positions
  column_count          Int     @default(12)      // Grid columns
  row_height            Int     @default(50)      // Row height in pixels

  // Filters
  global_filters        Json?                     // Filters applied to all widgets
  date_range_type       DateRangeType?            // LAST_7_DAYS, etc.
  custom_date_start     DateTime?
  custom_date_end       DateTime?

  // Behavior
  auto_refresh          Boolean @default(true)
  refresh_interval_seconds Int? @default(300)     // 5 minutes

  // Metadata
  view_count            Int     @default(0)
  last_viewed_at        DateTime?

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Relations
  widgets               DashboardWidget[]

  // Indexes
  @@unique([organization_id, slug])
  @@index([organization_id])
  @@index([organization_id, owner_user_id])
  @@index([organization_id, is_shared])
}

enum DashboardOwnerType {
  USER
  TEAM
  SYSTEM
}

enum DashboardLayoutType {
  GRID
  FREEFORM
}

enum DateRangeType {
  TODAY
  YESTERDAY
  LAST_7_DAYS
  LAST_30_DAYS
  LAST_90_DAYS
  LAST_365_DAYS
  THIS_MONTH
  LAST_MONTH
  THIS_QUARTER
  LAST_QUARTER
  THIS_YEAR
  LAST_YEAR
  CUSTOM
  ALL_TIME
}
```

### DashboardWidget

Individual widgets on a dashboard.

```prisma
model DashboardWidget {
  id                    String   @id @default(uuid())
  dashboard_id          String
  dashboard             SavedDashboard @relation(fields: [dashboard_id], references: [id], onDelete: Cascade)

  // Identity
  title                 String
  description           String?

  // Widget Type
  widget_type           WidgetType
  subtype               String?                   // Chart subtype, etc.

  // Data Source
  data_source           WidgetDataSource          // Which fact table
  query_config          Json                      // Filters, grouping, etc.

  // Display Configuration
  display_config        Json                      // Colors, labels, formatting

  // Position (grid-based)
  position_x            Int     @default(0)       // Grid column
  position_y            Int     @default(0)       // Grid row
  width                 Int     @default(4)       // Columns spanned
  height                Int     @default(2)       // Rows spanned

  // Behavior
  refresh_independently Boolean @default(false)
  refresh_interval_seconds Int?

  // Drill-down
  drill_down_enabled    Boolean @default(true)
  drill_down_target     String?                   // URL or widget ID

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
}

enum WidgetType {
  // Metrics
  METRIC_CARD           // Single number with trend
  METRIC_COMPARISON     // Compare two values

  // Charts
  BAR_CHART
  LINE_CHART
  PIE_CHART
  DONUT_CHART
  AREA_CHART
  STACKED_BAR
  HORIZONTAL_BAR
  FUNNEL_CHART
  GAUGE
  HEATMAP

  // Tables
  DATA_TABLE
  PIVOT_TABLE
  LEADERBOARD

  // Lists
  RECENT_LIST           // Recent activity
  TOP_N_LIST            // Top performers/issues

  // Other
  TEXT_BLOCK            // Markdown content
  IFRAME                // Embedded content
  MAP                   // Geographic visualization
}

enum WidgetDataSource {
  CASE_FACT
  DISCLOSURE_FACT
  FORM_FACT
  ATTESTATION_FACT
  AUDIT_LOG
  CUSTOM_QUERY
}
```

### Query Config JSON Structure

```json
{
  "metrics": [
    { "field": "count", "aggregation": "COUNT", "alias": "Total Cases" },
    { "field": "days_open", "aggregation": "AVG", "alias": "Avg Days Open" }
  ],
  "dimensions": [
    { "field": "primary_category_name", "alias": "Category" },
    { "field": "created_month", "alias": "Month" }
  ],
  "filters": [
    { "field": "current_status", "operator": "IN", "values": ["OPEN", "IN_INVESTIGATION"] },
    { "field": "created_date", "operator": ">=", "value": "{{start_date}}" }
  ],
  "sort": [
    { "field": "count", "direction": "DESC" }
  ],
  "limit": 10
}
```

### Display Config JSON Structure

```json
{
  "chart": {
    "colors": ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b"],
    "show_legend": true,
    "legend_position": "bottom",
    "show_labels": true,
    "show_values": true
  },
  "metric": {
    "format": "number",
    "prefix": "",
    "suffix": "",
    "trend_comparison": "previous_period",
    "positive_is_good": false
  },
  "table": {
    "show_pagination": true,
    "page_size": 10,
    "sortable": true,
    "show_totals": true
  }
}
```

---

## Report Schemas

### SavedReport

User-created report definitions.

```prisma
model SavedReport {
  id                    String   @id @default(uuid())
  organization_id       String

  // Identity
  name                  String
  description           String?

  // Ownership
  owner_user_id         String
  is_shared             Boolean @default(false)
  shared_with_roles     UserRole[]

  // Data Configuration
  data_sources          ReportDataSource[]        // Which modules/facts
  columns               Json                      // Field selections
  filters               Json                      // Filter conditions
  grouping              Json?                     // Group by configuration
  sort                  Json?                     // Sort configuration

  // Calculations
  calculated_fields     Json?                     // Custom formulas
  subtotals             Boolean @default(false)
  grand_totals          Boolean @default(true)

  // Display
  column_widths         Json?                     // Per-column widths
  conditional_formatting Json?                    // Highlight rules

  // Export Defaults
  default_format        ReportFormat @default(EXCEL)
  include_headers       Boolean @default(true)

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Relations
  schedules             ScheduledReport[]
  executions            ReportExecution[]
}

enum ReportDataSource {
  CASES
  INVESTIGATIONS
  DISCLOSURES
  POLICIES
  ATTESTATIONS
  USERS
  EMPLOYEES
  AUDIT_LOG
  FORMS
}

enum ReportFormat {
  PDF
  EXCEL
  CSV
  POWERPOINT
}
```

### Columns JSON Structure

```json
{
  "columns": [
    {
      "source": "CASES",
      "field": "case_number",
      "label": "Case #",
      "width": 100,
      "visible": true
    },
    {
      "source": "CASES",
      "field": "created_at",
      "label": "Date Received",
      "format": "date",
      "width": 120
    },
    {
      "source": "CASES",
      "field": "primary_category_name",
      "label": "Category",
      "width": 150
    },
    {
      "source": "INVESTIGATIONS",
      "field": "assigned_user_name",
      "label": "Investigator",
      "width": 150,
      "join": "case_id"
    },
    {
      "type": "calculated",
      "formula": "days_open > sla_target_days",
      "label": "SLA Breached",
      "format": "boolean"
    }
  ]
}
```

### ScheduledReport

Automated report delivery.

```prisma
model ScheduledReport {
  id                    String   @id @default(uuid())
  report_id             String
  report                SavedReport @relation(fields: [report_id], references: [id], onDelete: Cascade)
  organization_id       String

  // Schedule
  schedule_type         ScheduleType
  cron_expression       String?                   // For CRON type
  day_of_week           Int?                      // 0-6 for weekly
  day_of_month          Int?                      // 1-31 for monthly
  time_of_day           String                    // "09:00" in org timezone

  // Delivery
  recipients            String[]                  // Email addresses
  recipient_roles       UserRole[]                // Dynamic role-based
  delivery_method       DeliveryMethod

  // Format
  format                ReportFormat
  include_summary       Boolean @default(true)

  // Filters (override report defaults)
  filter_overrides      Json?
  date_range_type       DateRangeType

  // Status
  is_active             Boolean @default(true)
  last_run_at           DateTime?
  next_run_at           DateTime?
  last_run_status       ScheduleRunStatus?
  last_run_error        String?

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
}

enum ScheduleType {
  DAILY
  WEEKLY
  MONTHLY
  QUARTERLY
  CRON
}

enum DeliveryMethod {
  EMAIL
  SLACK
  SFTP
  WEBHOOK
}

enum ScheduleRunStatus {
  SUCCESS
  FAILED
  PARTIAL
  CANCELLED
}
```

### ReportExecution

Execution history for auditing and caching.

```prisma
model ReportExecution {
  id                    String   @id @default(uuid())
  report_id             String
  report                SavedReport @relation(fields: [report_id], references: [id])
  organization_id       String

  // Trigger
  triggered_by          ReportTrigger
  triggered_by_user_id  String?
  schedule_id           String?

  // Execution
  started_at            DateTime @default(now())
  completed_at          DateTime?
  duration_ms           Int?

  // Results
  status                ReportExecutionStatus
  row_count             Int?
  error_message         String?
  error_details         Json?

  // Output
  output_format         ReportFormat?
  output_file_url       String?                   // For cached exports
  output_file_size_bytes Int?
  output_expires_at     DateTime?                 // Cache expiration

  // Filters Used
  filters_applied       Json?                     // Actual filters for this run
  date_range_start      DateTime?
  date_range_end        DateTime?

  // Index
  @@index([organization_id, report_id, started_at])
  @@index([organization_id, started_at])
}

enum ReportTrigger {
  MANUAL
  SCHEDULED
  API
  EXPORT
}

enum ReportExecutionStatus {
  RUNNING
  SUCCESS
  FAILED
  CANCELLED
  TIMEOUT
}
```

---

## Refresh Strategies

### Fact Table Refresh

| Fact Table | Refresh Frequency | Trigger | Strategy |
|------------|-------------------|---------|----------|
| CaseFact | 5 minutes | Scheduled job | Incremental (updated_at > last_refresh) |
| DisclosureFact | 5 minutes | Scheduled job | Incremental |
| FormFact | 15 minutes | Scheduled job | Incremental |
| AttestationFact | 15 minutes | Scheduled job | Incremental |
| All Facts | Daily at 2am | Scheduled job | Full rebuild (data integrity) |

### Incremental Refresh Query Pattern

```sql
-- Refresh CaseFact incrementally
INSERT INTO "CaseFact" (
  case_id, organization_id, created_date, ...
)
SELECT
  c.id as case_id,
  c.organization_id,
  DATE(c.created_at) as created_date,
  ...
FROM "Case" c
LEFT JOIN "Investigation" i ON c.id = i.case_id
WHERE c.updated_at > :last_refresh_at
   OR i.updated_at > :last_refresh_at
ON CONFLICT (case_id) DO UPDATE SET
  current_status = EXCLUDED.current_status,
  days_open = EXCLUDED.days_open,
  refreshed_at = NOW();
```

### Dashboard Caching

| Layer | TTL | Invalidation |
|-------|-----|--------------|
| Widget query results | 5 minutes | On fact refresh |
| Dashboard layout | 1 hour | On dashboard save |
| User preferences | 24 hours | On preference change |

### Report Caching

| Scenario | Cache Duration | Notes |
|----------|----------------|-------|
| Ad-hoc report | No cache | Generated on demand |
| Scheduled report | 24 hours | Cached for re-download |
| Export file | 1 hour | Stored in blob storage |
| Board report PDF | 7 days | Stored for board access |

---

## Pre-built Dashboard Templates

### Compliance Overview Dashboard

```json
{
  "name": "Compliance Overview",
  "description": "Executive summary of compliance program health",
  "widgets": [
    {
      "type": "METRIC_CARD",
      "title": "Open Cases",
      "data_source": "CASE_FACT",
      "query": { "metrics": [{"field": "count", "filter": {"current_status": ["OPEN", "IN_INVESTIGATION"]}}] }
    },
    {
      "type": "METRIC_CARD",
      "title": "Avg Days to Close",
      "data_source": "CASE_FACT",
      "query": { "metrics": [{"field": "days_to_close", "aggregation": "AVG"}] }
    },
    {
      "type": "LINE_CHART",
      "title": "Cases by Month",
      "data_source": "CASE_FACT",
      "query": { "dimensions": ["created_month"], "metrics": [{"field": "count"}] }
    },
    {
      "type": "PIE_CHART",
      "title": "Cases by Category",
      "data_source": "CASE_FACT",
      "query": { "dimensions": ["primary_category_name"], "metrics": [{"field": "count"}], "limit": 5 }
    },
    {
      "type": "GAUGE",
      "title": "Attestation Completion",
      "data_source": "ATTESTATION_FACT",
      "query": { "metrics": [{"formula": "COUNT(completed_date) / COUNT(*)"}] }
    }
  ]
}
```

---

*End of Analytics Data Model Document*
