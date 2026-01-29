# Ethico Risk Intelligence Platform
## PRD-007: Analytics & Reporting

**Document ID:** PRD-007
**Version:** 2.0 (Complete Specification)
**Priority:** P1 - High (Core Module)
**Development Phase:** Phase 2
**Last Updated:** January 2026

**Cross-References:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md`
- Analytics Data Model: `01-SHARED-INFRASTRUCTURE/ANALYTICS-DATA-MODEL.md`
- Core Data Model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
- Case Management: `02-MODULES/05-CASE-MANAGEMENT/PRD.md`
- Disclosures: `02-MODULES/06-DISCLOSURES/PRD.md`
- Policy Management: `02-MODULES/09-POLICY-MANAGEMENT/PRD.md`

> **Tech Stack:** NestJS (backend) + Next.js (frontend) + shadcn/ui + Tailwind CSS.
> See `01-SHARED-INFRASTRUCTURE/` docs for implementation patterns and standards.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [AI-First Considerations](#ai-first-considerations)
3. [User Stories](#user-stories)
4. [Feature Specifications](#feature-specifications)
   - F1: Dashboard Builder
   - F2: Widget Library
   - F3: Report Builder
   - F4: Saved Views
   - F5: Board Reports
   - F6: Scheduled Reports
   - F7: Export Capabilities
   - F8: Pre-built Templates
5. [Data Model](#data-model)
6. [API Specifications](#api-specifications)
7. [UI/UX Specifications](#uiux-specifications)
8. [Non-Functional Requirements](#non-functional-requirements)

---

## Executive Summary

### Purpose

The Analytics & Reporting module provides HubSpot-style self-service analytics across all platform modules. Users can create custom dashboards, build ad-hoc reports, and generate board-ready presentations without technical expertise.

### Design Philosophy

> "Any question should be answerable in under 5 minutes."

Unlike competitors that require Power BI or external tools, Ethico provides:
- Drag-and-drop dashboard building
- Visual report builder with live preview
- AI-assisted insights and anomaly detection
- One-click board report generation
- Unified data across Cases, Disclosures, Policies, and Attestations

### Target Users

| Role | Primary Use Cases |
|------|-------------------|
| CCO / Compliance Officer | Executive dashboards, board reports, trend analysis |
| Investigator | Personal workload views, case metrics |
| Triage Lead | Queue monitoring, assignment analytics |
| Department Admin | Department-scoped reporting |
| System Admin | Platform health, user activity |

### Key Differentiators vs. Competitors

| Capability | NAVEX | EQS | **Ethico** |
|------------|-------|-----|------------|
| Self-service dashboards | Limited | Basic | Full drag-and-drop |
| Cross-module analytics | No | No | Unified data model |
| AI insights | No | No | Anomaly detection, summaries |
| Board reports | PowerPoint export | PDF only | AI-generated presentations |
| Real-time metrics | No | No | Live widgets |
| Custom calculations | No | Limited | Formula builder |
| Scheduled delivery | Email only | Email only | Email, Slack, SFTP, Webhook |

---

## AI-First Considerations

### Conversational Interface

Users can interact with analytics via natural language:

| User Intent | Example Phrases | AI Response |
|-------------|-----------------|-------------|
| Metric lookup | "How many cases are open?" | Direct answer with trend |
| Trend analysis | "Show me cases by month this year" | Chart with insight |
| Comparison | "Compare Q4 to Q3 case volume" | Side-by-side with % change |
| Anomaly alert | "Anything unusual in the data?" | Detected anomalies highlighted |
| Report request | "Create a report of overdue cases" | Draft report definition |

**Example Conversation:**
```
User: "What's our average time to close harassment cases?"
AI: "The average time to close harassment cases is 45 days, which is
    12% higher than your overall average of 40 days. This is up from
    38 days last quarter. Would you like to see a breakdown by region
    or investigator?"

User: "Yes, by region"
AI: [Generates bar chart showing regional breakdown]
```

### AI Assistance Points

| Feature | AI Capability |
|---------|---------------|
| Dashboard creation | Suggest widgets based on role and data patterns |
| Report building | Natural language to query translation |
| Anomaly detection | Automatic highlighting of outliers |
| Board reports | AI-generated executive summaries |
| Insight generation | "Key takeaways" for any visualization |
| Forecasting | Trend extrapolation for metrics |

### Data Requirements for AI Context

**Minimum Context:**
- Current date range and filters
- User's role and department
- Previous queries in session

**Enhanced Context:**
- Historical patterns for comparison
- Organization benchmarks
- Industry benchmarks (anonymized)

---

## User Stories

### Client Admin

**Create custom dashboard**
As a **Compliance Officer**, I want to create a custom dashboard with drag-and-drop widgets
so that I can monitor compliance program health at a glance.

Key behaviors:
- Create dashboard from blank canvas or duplicate existing
- Add, resize, and reposition widgets via drag-and-drop
- Save dashboard with custom name and description
- Configure auto-refresh interval (1min to 24hr)
- AI suggests widgets based on role and historical usage
- Activity logged: dashboard_created, widget_added, layout_changed

---

**Share dashboard with team**
As a **Compliance Officer**, I want to share my dashboard with team members
so that we have a consistent view of compliance metrics.

Key behaviors:
- Share with specific users or entire roles
- Set as organization-wide default dashboard
- Shared users see live data filtered by their permissions
- Revoke sharing at any time
- Activity logged: dashboard_shared, sharing_revoked, default_set

---

**Apply global dashboard filters**
As a **Triage Lead**, I want to apply global filters to my dashboard
so that all widgets reflect the same date range and business unit scope.

Key behaviors:
- Date range picker cascades to all widgets
- Business unit and location filters apply globally
- Save filter state with dashboard or use temporarily
- Filter state respects user's visibility permissions
- Activity logged: filters_applied

---

**Build ad-hoc report**
As a **Compliance Officer**, I want to build custom reports by selecting fields from multiple modules
so that I can answer specific business questions without technical help.

Key behaviors:
- Select fields from Cases, Investigations, Disclosures, Policies, Attestations
- Build filters visually with AND/OR logic
- Group by any dimension with subtotals
- Add calculated fields using formula builder
- Live preview shows first 10 rows as you configure
- Data scoped by organization_id and user visibility
- Activity logged: report_created, report_executed

---

**Export report data**
As a **Department Admin**, I want to export reports in multiple formats
so that I can share compliance data with stakeholders outside the system.

Key behaviors:
- Export to Excel (.xlsx), CSV, PDF, or PowerPoint
- Exports include current filter context and timestamp
- Large exports (>10K rows) run async with notification
- Downloads include organization branding where applicable
- PII redaction configurable per export
- Activity logged: report_exported with format, row count, recipient

---

**Schedule automated reports**
As a **Compliance Officer**, I want to schedule reports to run automatically
so that stakeholders receive regular updates without manual effort.

Key behaviors:
- Schedule daily, weekly, monthly, or quarterly
- Specify delivery time in organization timezone
- Send to email addresses, roles, or Slack channels
- Include PDF attachment and inline preview
- Pause/resume schedules; retry on delivery failure
- All schedules scoped to organization_id
- Activity logged: schedule_created, execution_completed, delivery_failed

---

**Generate board-ready presentation**
As a **CCO**, I want to generate a board-ready presentation summarizing compliance metrics
so that I can report to the board without hours of manual preparation.

Key behaviors:
- Select from Quarterly Review, Annual Report, or Hotline Statistics templates
- AI generates executive summary narrative with key insights
- AI highlights significant changes from previous period
- Export as branded PowerPoint with customizable sections
- Archive historical reports for period-over-period comparison
- Activity logged: board_report_generated, report_exported

---

**Create saved view**
As an **Investigator**, I want to save filtered views of my data
so that I can quickly access my common queries from tabs.

Key behaviors:
- Save current filter/column/sort state as named view
- Views appear as tabs across top of list pages
- Support up to 25 personal views per module
- Reorder view tabs via drag
- Works across Cases, Investigations, Disclosures, Attestations
- Activity logged: view_created, view_updated, view_deleted

---

**Set default landing view**
As a **Compliance Officer**, I want to set my default landing view
so that I see the most relevant data immediately on login.

Key behaviors:
- Set any personal view as default for a module
- Organization admins can set role-based default views
- Default view loads automatically on navigation to module
- User preference overrides role-based default
- Activity logged: default_view_set

---

**Ask natural language questions about data**
As a **CCO**, I want to ask questions about compliance data in plain English
so that I can get insights without building complex reports.

Key behaviors:
- Type questions like "How many cases are open?" or "Show harassment cases by region"
- AI interprets intent and generates appropriate visualization
- Follow-up questions refine the analysis
- AI proactively highlights anomalies and trends
- Save successful queries as dashboard widgets
- Activity logged: ai_query, query_saved_as_widget

---

### Ethico Staff

**Monitor platform-wide analytics**
As a **System Admin**, I want to view cross-organization analytics
so that I can monitor platform health and identify implementation issues.

Key behaviors:
- Access aggregate metrics across all organizations (no PII)
- View usage patterns, feature adoption, performance metrics
- Identify organizations with anomalous data patterns
- Strict separation from individual organization data
- Activity logged: platform_analytics_viewed

---

**Create organization onboarding dashboard**
As an **Implementation Specialist**, I want to create starter dashboards for new clients
so that they have useful visualizations from day one.

Key behaviors:
- Select from library of template dashboards
- Customize templates for client's industry and size
- Push dashboards to client organization as defaults
- Include guided tour explaining each widget
- Activity logged: onboarding_dashboard_created

---

## Feature Specifications

### F1: Dashboard Builder

**Description:**
Drag-and-drop canvas for creating custom dashboards with configurable widgets.

**Components:**
1. **Dashboard Canvas**
   - Grid-based layout (12 columns)
   - Widgets snap to grid
   - Responsive scaling for different screens
   - Undo/redo support

2. **Widget Palette**
   - Categorized widget types
   - Drag to add to canvas
   - Widget preview on hover

3. **Widget Configuration**
   - Data source selection
   - Metric/dimension configuration
   - Display options
   - Drill-down settings

4. **Dashboard Settings**
   - Name, description
   - Sharing permissions
   - Auto-refresh interval
   - Global filters

**User Flow:**
1. User clicks "Create Dashboard"
2. Empty canvas displays with widget palette
3. User drags widgets from palette to canvas
4. User configures each widget via side panel
5. User saves dashboard

**Business Rules:**
- Maximum 20 widgets per dashboard
- Widgets cannot overlap
- Minimum widget size: 2 columns x 1 row
- Dashboard names must be unique per user

---

### F2: Widget Library

**Description:**
Pre-built widget types for common metrics and visualizations.

**Widget Categories:**

#### Metric Widgets
| Widget | Description | Best For |
|--------|-------------|----------|
| Metric Card | Single number with trend | KPIs, counts |
| Metric Comparison | Two values side-by-side | Period comparison |
| Gauge | Progress toward target | Goal tracking |
| Sparkline | Compact trend line | Quick trends |

#### Chart Widgets
| Widget | Description | Best For |
|--------|-------------|----------|
| Bar Chart | Vertical bars | Category comparison |
| Horizontal Bar | Horizontal bars | Ranked lists |
| Line Chart | Time series | Trends over time |
| Area Chart | Filled line chart | Cumulative trends |
| Pie Chart | Proportions | Distribution (≤5 categories) |
| Donut Chart | Pie with center hole | Distribution with total |
| Stacked Bar | Multi-series bars | Part-to-whole comparison |
| Heatmap | Color-coded grid | Two-dimension patterns |

#### Table Widgets
| Widget | Description | Best For |
|--------|-------------|----------|
| Data Table | Sortable, paginated table | Detailed data |
| Pivot Table | Grouped aggregations | Cross-tabulation |
| Leaderboard | Ranked list with metrics | Top/bottom performers |

#### List Widgets
| Widget | Description | Best For |
|--------|-------------|----------|
| Recent Activity | Recent items with details | Activity monitoring |
| Top N List | Ranked items | Highlights |
| Alert List | Items needing attention | Action items |

#### Special Widgets
| Widget | Description | Best For |
|--------|-------------|----------|
| Map | Geographic visualization | Regional analysis |
| Funnel | Stage progression | Process flow |
| Text Block | Markdown content | Instructions, context |
| Embedded | External content | Integrations |

---

### F3: Report Builder

**Description:**
Visual interface for building custom reports across all data sources.

**Components:**

1. **Field Selector**
   - Grouped by module (Cases, Disclosures, etc.)
   - Searchable field list
   - Drag fields to columns
   - Shows field type icons

2. **Filter Builder**
   - Visual filter conditions
   - AND/OR logic groups
   - Date range picker
   - Relative dates (Last 30 days)
   - Dynamic filters (My Cases, My Department)

3. **Grouping Configuration**
   - Drag fields to group by
   - Multiple levels supported
   - Show subtotals option

4. **Calculated Fields**
   - Formula builder
   - Common functions (COUNT, SUM, AVG, etc.)
   - Field references
   - Preview calculation

5. **Live Preview**
   - First 10 rows displayed
   - Updates as configuration changes
   - Performance indicator

**Available Data Sources:**

| Source | Key Fields |
|--------|------------|
| Cases | Case number, created date, status, category, severity, location, assignee, days open |
| Investigations | Status, findings, outcome, days to close |
| Disclosures | Type, status, submitter, decision, value |
| Policies | Title, status, version, effective date, owner |
| Attestations | Policy, status, completion date, days overdue |
| Users | Name, role, department, last login |
| Employees | Name, department, location, manager |

---

### F4: Saved Views

**Description:**
HubSpot-style saved filter configurations that appear as tabs on list pages.

**Features:**
- Persist filter state (columns, filters, sort)
- Named tabs across top of list
- Personal and shared views
- Quick switching between views
- View count badges (optional)

**Default System Views:**
| Module | Default Views |
|--------|---------------|
| Cases | All Cases, My Cases, Unassigned, High Severity, Overdue |
| Investigations | My Investigations, In Progress, Pending Review |
| Disclosures | Pending Approval, My Disclosures, Recent |
| Attestations | Overdue, Pending, By Department |

---

### F5: Board Reports

**Description:**
AI-assisted generation of executive presentations for board meetings.

**Templates:**
1. **Quarterly Compliance Review**
   - Case volume and trends
   - Investigation outcomes
   - Key metrics vs. benchmarks
   - Notable incidents
   - Program improvements

2. **Annual Compliance Report**
   - Year-over-year comparisons
   - Category analysis
   - Resolution rates
   - Training compliance
   - Recommendations

3. **Hotline Statistics**
   - Call volume by month
   - Source channel breakdown
   - Anonymous vs. identified
   - Category distribution
   - Response time metrics

**Generation Flow:**
1. User selects template
2. User confirms date range and scope
3. System generates draft with AI narrative
4. User reviews and edits
5. Export to PowerPoint

**AI Capabilities:**
- Generate executive summary (2-3 paragraphs)
- Identify key trends and anomalies
- Compare to previous period
- Suggest areas of concern
- Plain-language insights

---

### F6: Scheduled Reports

**Description:**
Automated report execution and delivery.

**Schedule Options:**
| Frequency | Configuration |
|-----------|---------------|
| Daily | Time of day |
| Weekly | Day of week, time |
| Monthly | Day of month, time |
| Quarterly | Month, day, time |
| Custom | Cron expression |

**Delivery Options:**
| Channel | Format | Notes |
|---------|--------|-------|
| Email | PDF, Excel, CSV | Inline preview + attachment |
| Slack | Link + preview | Requires integration |
| SFTP | CSV, Excel | For external systems |
| Webhook | JSON | For automation |

**Features:**
- Timezone-aware scheduling
- Dynamic recipients (role-based)
- Execution history with status
- Retry on failure
- Pause/resume capability

---

### F7: Export Capabilities

**Description:**
Export data and reports in multiple formats.

**Formats:**

| Format | Use Case | Max Rows | Notes |
|--------|----------|----------|-------|
| Excel (.xlsx) | Analysis, sharing | 100,000 | Formatted, with formulas |
| CSV | Data transfer | Unlimited | Raw data |
| PDF | Formal reports | 10,000 | Paginated, styled |
| PowerPoint | Presentations | N/A | Charts as slides |
| JSON | API integration | Unlimited | Structured data |

**Export Features:**
- Column selection
- Filter preservation
- Branding (logo, colors)
- Page orientation
- Header/footer customization
- Password protection (PDF, Excel)

**Large Export Handling:**
- Exports >10,000 rows run async
- User notified when complete
- Download link valid 24 hours
- Background job queue

---

### F8: Pre-built Templates

**Description:**
Ready-to-use dashboards and reports for common use cases.

**Dashboard Templates:**

1. **Compliance Overview**
   - Open cases metric
   - Cases by category chart
   - Cases by status funnel
   - Monthly trend line
   - SLA compliance gauge
   - Recent cases list

2. **Investigation Dashboard**
   - My open investigations
   - Investigation pipeline
   - Avg days by category
   - Overdue investigations
   - Completion rate trend

3. **Disclosure Manager**
   - Pending approvals count
   - Disclosures by type pie
   - Decision distribution
   - Monthly submissions
   - Overdue approvals list

4. **Attestation Tracker**
   - Completion rate gauge
   - Completion by department
   - Overdue by policy
   - Reminder effectiveness
   - Daily completion trend

5. **Executive Summary**
   - Key metrics cards
   - Period comparison
   - Category breakdown
   - Regional heatmap
   - AI-generated insights

**Report Templates:**

1. **Case Detail Export**
2. **Investigation Summary**
3. **Disclosure Audit Trail**
4. **Attestation Compliance**
5. **User Activity Report**
6. **SLA Performance Report**
7. **Category Analysis**
8. **Regional Breakdown**

---

## Data Model

### Primary Entities

See `01-SHARED-INFRASTRUCTURE/ANALYTICS-DATA-MODEL.md` for complete schemas:

- **SavedDashboard** - Dashboard definitions
- **DashboardWidget** - Widget configurations
- **SavedReport** - Report definitions
- **ScheduledReport** - Delivery schedules
- **ReportExecution** - Execution history
- **CaseFact, DisclosureFact, FormFact, AttestationFact** - Pre-aggregated analytics

### Saved View Schema

```prisma
model SavedView {
  id                    String   @id @default(uuid())
  organization_id       String
  user_id               String

  // Identity
  name                  String
  module                ViewModule              // CASES, INVESTIGATIONS, etc.

  // Configuration
  columns               Json                    // Visible columns
  filters               Json                    // Filter conditions
  sort                  Json                    // Sort configuration

  // Display
  sort_order            Int      @default(0)   // Tab order
  is_pinned             Boolean  @default(false)

  // Sharing
  is_shared             Boolean  @default(false)
  shared_with_roles     UserRole[]

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  @@unique([organization_id, user_id, name])
  @@index([organization_id, user_id, module])
}

enum ViewModule {
  CASES
  INVESTIGATIONS
  DISCLOSURES
  POLICIES
  ATTESTATIONS
  USERS
}
```

---

## API Specifications

### Dashboard Endpoints

```
# Dashboard CRUD
GET    /api/v1/dashboards                    # List user's dashboards
POST   /api/v1/dashboards                    # Create dashboard
GET    /api/v1/dashboards/:id                # Get dashboard with widgets
PUT    /api/v1/dashboards/:id                # Update dashboard
DELETE /api/v1/dashboards/:id                # Delete dashboard
POST   /api/v1/dashboards/:id/duplicate      # Clone dashboard

# Widget Management
POST   /api/v1/dashboards/:id/widgets        # Add widget
PUT    /api/v1/dashboards/:id/widgets/:wid   # Update widget
DELETE /api/v1/dashboards/:id/widgets/:wid   # Remove widget

# Widget Data
POST   /api/v1/widgets/:id/data              # Fetch widget data
POST   /api/v1/widgets/preview               # Preview widget config
```

### Report Endpoints

```
# Report CRUD
GET    /api/v1/reports                       # List reports
POST   /api/v1/reports                       # Create report
GET    /api/v1/reports/:id                   # Get report definition
PUT    /api/v1/reports/:id                   # Update report
DELETE /api/v1/reports/:id                   # Delete report

# Report Execution
POST   /api/v1/reports/:id/execute           # Run report
GET    /api/v1/reports/:id/executions        # List past executions
GET    /api/v1/reports/:id/executions/:eid   # Get execution result
POST   /api/v1/reports/:id/export            # Export report

# Scheduled Reports
GET    /api/v1/reports/:id/schedules         # List schedules
POST   /api/v1/reports/:id/schedules         # Create schedule
PUT    /api/v1/schedules/:sid                # Update schedule
DELETE /api/v1/schedules/:sid                # Delete schedule
POST   /api/v1/schedules/:sid/run-now        # Trigger immediate run
```

### Analytics Endpoints

```
# Fact Table Queries
POST   /api/v1/analytics/cases               # Query case facts
POST   /api/v1/analytics/disclosures         # Query disclosure facts
POST   /api/v1/analytics/attestations        # Query attestation facts
POST   /api/v1/analytics/forms               # Query form facts

# Aggregations
POST   /api/v1/analytics/aggregate           # Generic aggregation query
GET    /api/v1/analytics/metrics/:metric     # Single metric value

# AI Insights
POST   /api/v1/analytics/insights            # Generate AI insights
POST   /api/v1/analytics/anomalies           # Detect anomalies
POST   /api/v1/analytics/summary             # Generate natural language summary
```

### Saved Views Endpoints

```
GET    /api/v1/views                         # List user's views
POST   /api/v1/views                         # Create view
PUT    /api/v1/views/:id                     # Update view
DELETE /api/v1/views/:id                     # Delete view
POST   /api/v1/views/:id/set-default         # Set as default
PUT    /api/v1/views/reorder                 # Reorder tabs
```

---

## UI/UX Specifications

### Dashboard Builder UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Dashboards    [Dashboard Name ▼]    [🔗 Share] [💾 Save]     │
├─────────────────────────────────────────────────────────────────────────┤
│ Global Filters: [Date Range ▼] [Business Unit ▼] [Location ▼] [Apply]  │
├─────────────┬───────────────────────────────────────────────────────────┤
│ Widget      │                                                           │
│ Palette     │   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│             │   │ Open Cases   │ │ Avg Days Open│ │ SLA Breach % │     │
│ ▼ Metrics   │   │    127       │ │    32 days   │ │    8.5%      │     │
│   • Card    │   │ ↑ 12% vs LM  │ │ ↓ 5% vs LM   │ │ → same       │     │
│   • Gauge   │   └──────────────┘ └──────────────┘ └──────────────┘     │
│   • Compare │                                                           │
│             │   ┌────────────────────────────────┐ ┌──────────────────┐ │
│ ▼ Charts    │   │  Cases by Category             │ │ Cases by Month   │ │
│   • Bar     │   │  ▓▓▓▓▓▓▓▓ Harassment    45    │ │      📈          │ │
│   • Line    │   │  ▓▓▓▓▓▓   Fraud         32    │ │                  │ │
│   • Pie     │   │  ▓▓▓▓     Safety        28    │ │  [Line chart]    │ │
│   • Area    │   │  ▓▓▓      Retaliation   21    │ │                  │ │
│             │   └────────────────────────────────┘ └──────────────────┘ │
│ ▼ Tables    │                                                           │
│   • Data    │   ┌────────────────────────────────────────────────────┐ │
│   • Pivot   │   │ Recent Cases                                        │ │
│             │   │ Case #    Category      Status      Days Open       │ │
│ ▼ Lists     │   │ C-1234    Harassment    Open        12              │ │
│   • Recent  │   │ C-1233    Fraud         Investigating 8             │ │
│   • Top N   │   │ C-1232    Safety        Closed      45              │ │
│             │   └────────────────────────────────────────────────────┘ │
└─────────────┴───────────────────────────────────────────────────────────┘
```

### Report Builder UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Report Builder                                    [Preview] [Save] [Run]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─── Fields ────┐  ┌─── Columns ─────────────────────────────────────┐ │
│  │ 🔍 Search...  │  │                                                 │ │
│  │               │  │  [📋 Case #] [📅 Created] [📁 Category] [👤 Assignee] │
│  │ ▼ Cases       │  │                                                 │ │
│  │   • Case #    │  │  Drag fields here to add columns                │ │
│  │   • Created   │  │                                                 │ │
│  │   • Status    │  └─────────────────────────────────────────────────┘ │
│  │   • Category  │                                                      │
│  │   • Severity  │  ┌─── Filters ─────────────────────────────────────┐ │
│  │   • Location  │  │                                                 │ │
│  │   • Assignee  │  │  Status    [is any of ▼]  [Open, In Progress]   │ │
│  │               │  │  Created   [is after ▼]   [Last 90 days]        │ │
│  │ ▼ Investigations │  │  + Add filter                                   │ │
│  │   • Status    │  │                                                 │ │
│  │   • Outcome   │  └─────────────────────────────────────────────────┘ │
│  │   • Days Open │                                                      │
│  │               │  ┌─── Preview (10 rows) ───────────────────────────┐ │
│  │ ▼ Disclosures │  │ Case #  │ Created    │ Category    │ Assignee   │ │
│  │               │  │ C-1234  │ 2026-01-15 │ Harassment  │ Sarah Chen │ │
│  └───────────────┘  │ C-1233  │ 2026-01-14 │ Fraud       │ John Smith │ │
│                     │ C-1232  │ 2026-01-12 │ Safety      │ Unassigned │ │
│                     └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Saved Views (Tabs)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Cases                                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ [All Cases 127] [My Cases 12] [Unassigned 8] [High Severity 5] [+ Add]  │
├─────────────────────────────────────────────────────────────────────────┤
│ Filters: Status = Open, Assigned to = Me                 [Clear] [Save] │
├─────────────────────────────────────────────────────────────────────────┤
│ [columns, data table...]                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Dashboard load | < 2 seconds |
| Widget refresh | < 500ms |
| Report preview | < 1 second |
| Report export (10K rows) | < 30 seconds |
| Scheduled report generation | < 5 minutes |

### Scalability

- Support 100+ concurrent dashboard viewers
- Handle dashboards with 20 widgets
- Reports up to 100,000 rows
- 1,000+ scheduled reports per organization
- Fact tables with 10M+ records

### Security

- All data filtered by organization_id
- Business unit scoping enforced
- Role-based dashboard sharing
- Audit log for report exports
- PII redaction in exports (configurable)

### Reliability

- Dashboard data cached with 5-minute TTL
- Scheduled reports retry 3x on failure
- Export files stored 24 hours
- Historical report executions retained 90 days

---

## Checklist Verification

### AI-First Checklist Compliance

**Schema Design:**
- [x] Semantic field naming used throughout
- [x] Dashboard and report configurations stored as JSON
- [x] Execution history with audit context
- [x] Source tracking for fact table refresh

**Feature Design:**
- [x] Natural language query examples documented
- [x] AI assistance points identified (insights, summaries, anomalies)
- [x] AI-generated board report narratives

**API Design:**
- [x] Context-rich responses for widgets
- [x] Bulk query support via aggregation endpoints

**UI Design:**
- [x] AI insight panels on dashboards
- [x] Self-service configuration (drag-and-drop)

---

*End of Analytics & Reporting PRD*
